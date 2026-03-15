/**
 * Causal Chain Validator - Enhanced Version
 * Distinguishes correlational vs causal evidence,
 * generates counterfactuals, searches for falsifying evidence
 */

import { bytezClient } from '../../api/bytezClient';
import { CAUSAL_STRENGTH, SEVERITY, TYPES } from '../types';

/**
 * Evidence types
 */
export const EVIDENCE_TYPES = {
  EMPIRICAL: 'empirical',
  LOGICAL: 'logical',
  INFERRED: 'inferred',
  ASSUMED: 'assumed',
  CORRELATIONAL: 'correlational'
};

/**
 * Causal validation configuration
 */
export const CAUSAL_VALIDATION_CONFIG = {
  minEvidenceStrength: 0.5,
  correlationPenalty: 0.3,
  counterfactualWeight: 0.2,
  falsificationThreshold: 0.4,
  requireCounterfactuals: true
};

/**
 * Create a causal link
 */
export const createCausalLink = (cause, effect, evidence = '', evidenceType = EVIDENCE_TYPES.ASSUMED) => ({
  id: generateLinkId(),
  cause,
  effect,
  evidence,
  evidenceType,
  strength: 0,
  isCounterfactual: false,
  confidence: 0.5,
  createdAt: new Date().toISOString()
});

let linkCounter = 0;
const generateLinkId = () => {
  linkCounter++;
  return `link_${Date.now()}_${linkCounter}`;
};

/**
 * Distinguish correlation from causation
 */
export const distinguishCorrelationFromCausation = (link) => {
  const indicators = {
    correlation: [
      'correlated with', 'associated with', 'linked to', 
      'happens at the same time', 'co-occurs with',
      'follows', 'precedes', 'after'
    ],
    causation: [
      'causes', 'leads to', 'results in', 'produces',
      'determines', 'controls', 'influences directly'
    ]
  };

  const text = `${link.cause} ${link.effect} ${link.evidence}`.toLowerCase();
  
  const correlationScore = indicators.correlation.reduce(
    (score, phrase) => score + (text.includes(phrase) ? 1 : 0), 0
  );
  
  const causationScore = indicators.causation.reduce(
    (score, phrase) => score + (text.includes(phrase) ? 1 : 0), 0
  );

  return {
    isCausal: causationScore > correlationScore,
    isCorrelational: correlationScore > causationScore || 
      indicators.correlation.some(p => text.includes(p)),
    scores: { correlation: correlationScore, causation: causationScore }
  };
};

/**
 * Generate counterfactual for a causal link
 */
export const generateCounterfactual = (link) => {
  const counterfactual = {
    ...createCausalLink(
      `NOT ${link.cause}`,
      `NOT ${link.effect}`,
      `Counterfactual: If ${link.cause} did not occur, would ${link.effect} still occur?`,
      EVIDENCE_TYPES.LOGICAL
    ),
    isCounterfactual: true,
    originalLinkId: link.id,
    condition: `Absence of ${link.cause}`,
    predictedOutcome: `Expected: ${link.effect} would not occur`,
    confidence: link.confidence * 0.7 // Lower confidence for counterfactuals
  };

  return counterfactual;
};

/**
 * Generate counterfactuals for a causal chain
 */
export const generateCounterfactuals = (chain) => {
  return chain.map(link => generateCounterfactual(link));
};

/**
 * Search for falsifying evidence using Grok 4.2
 */
export const searchFalsifyingEvidence = async (chain, context = {}) => {
  const falsifyingEvidence = [];

  for (const link of chain) {
    const prompt = `
      Analyze this causal claim and search for falsifying evidence or counterexamples.
      
      Claim: ${link.cause} → ${link.effect}
      Evidence: ${link.evidence}
      
      Provide any evidence that would disprove or weaken this causal claim.
      Consider:
      1. Alternative explanations
      2. Confounding factors
      3. Cases where cause occurs but effect doesn't
      4. Cases where effect occurs without the cause
      
      Return as JSON:
      {
        "falsifyingEvidence": [
          {
            "description": "evidence description",
            "source": "source",
            "strength": 0.0-1.0,
            "type": "empirical|logical|hypothetical"
          }
        ],
        "weakeningFactors": ["factor 1", "factor 2"],
        "overallAssessment": "strong|moderate|weak
      }
    `;

    try {
      const response = await bytezClient.runInference('grok-4.2', {
        systemPrompt: 'You are a causal analysis expert. Focus on finding falsifying evidence and weaknesses in causal claims.',
        userPrompt: prompt,
        temperature: 0.5
      });

      if (response?.output) {
        try {
          const parsed = typeof response.output === 'string' 
            ? JSON.parse(response.output) 
            : response.output;
          
          if (parsed.falsifyingEvidence) {
            falsifyingEvidence.push({
              linkId: link.id,
              ...parsed
            });
          }
        } catch (e) {
          console.warn('Failed to parse falsifying evidence response');
        }
      }
    } catch (error) {
      console.error('Error searching for falsifying evidence:', error);
    }
  }

  return falsifyingEvidence;
};

/**
 * Assess causal strength
 */
export const assessCausalStrength = (link, falsifyingEvidence = []) => {
  let strength = 0.5;

  // Adjust based on evidence type
  const evidenceWeights = {
    [EVIDENCE_TYPES.EMPIRICAL]: 1.0,
    [EVIDENCE_TYPES.LOGICAL]: 0.9,
    [EVIDENCE_TYPES.INFERRED]: 0.6,
    [EVIDENCE_TYPES.ASSUMED]: 0.3,
    [EVIDENCE_TYPES.CORRELATIONAL]: 0.2
  };

  strength *= evidenceWeights[link.evidenceType] || 0.5;

  // Check for correlation vs causation
  const correlationAnalysis = distinguishCorrelationFromCausation(link);
  if (correlationAnalysis.isCorrelational) {
    strength *= (1 - CAUSAL_VALIDATION_CONFIG.correlationPenalty);
  }

  // Penalize for falsifying evidence
  const totalFalsifyingStrength = falsifyingEvidence.reduce(
    (sum, fe) => sum + (fe.strength || 0), 0
  );
  if (falsifyingEvidence.length > 0) {
    strength *= Math.max(0.2, 1 - totalFalsifyingStrength * 0.5);
  }

  // Counterfactual bonus (if provided and supports causation)
  if (link.isCounterfactual && link.confidence > 0.5) {
    strength += CAUSAL_VALIDATION_CONFIG.counterfactualWeight;
  }

  return Math.max(0, Math.min(1, strength));
};

/**
 * Enhanced causal chain validation
 */
export const validateCausalChain = async (chain, options = {}) => {
  const {
    includeCounterfactuals = true,
    searchForFalsifyingEvidence = true,
    context = {}
  } = options;

  const results = {
    isValid: true,
    overallStrength: CAUSAL_STRENGTH.MODERATE,
    links: [],
    counterfactuals: [],
    falsifyingEvidence: [],
    issues: [],
    recommendations: [],
    metadata: {
      chainLength: chain.length,
      analyzedAt: new Date().toISOString()
    }
  };

  // Analyze each link
  for (let i = 0; i < chain.length; i++) {
    const link = chain[i];
    
    // Distinguish correlation from causation
    const correlationAnalysis = distinguishCorrelationFromCausation(link);
    
    // Calculate strength
    const strength = assessCausalStrength(link);
    
    const linkResult = {
      ...link,
      correlationAnalysis,
      strength,
      issues: []
    };

    // Add issues based on analysis
    if (correlationAnalysis.isCorrelational && link.evidenceType !== EVIDENCE_TYPES.CORRELATIONAL) {
      linkResult.issues.push({
        type: 'CORRELATION_VS_CAUSATION',
        severity: SEVERITY.HIGH,
        message: `Link ${i + 1}: Evidence suggests correlation rather than causation`
      });
      results.issues.push({
        type: 'CORRELATION_VS_CAUSATION',
        severity: SEVERITY.HIGH,
        message: `Link ${i + 1}: "${link.cause}" → "${link.effect}" appears correlational`
      });
    }

    if (link.evidenceType === EVIDENCE_TYPES.ASSUMED) {
      linkResult.issues.push({
        type: 'UNSUPPORTED_ASSUMPTION',
        severity: SEVERITY.MEDIUM,
        message: `Link ${i + 1}: Based on assumption without evidence`
      });
    }

    if (strength < CAUSAL_VALIDATION_CONFIG.minEvidenceStrength) {
      linkResult.issues.push({
        type: 'WEAK_LINK',
        severity: SEVERITY.HIGH,
        message: `Link ${i + 1}: Strength ${strength.toFixed(2)} below minimum ${CAUSAL_VALIDATION_CONFIG.minEvidenceStrength}`
      });
    }

    results.links.push(linkResult);
  }

  // Generate counterfactuals if requested
  if (includeCounterfactuals) {
    results.counterfactuals = generateCounterfactuals(chain);
  }

  // Search for falsifying evidence if requested
  if (searchForFalsifyingEvidence) {
    results.falsifyingEvidence = await searchFalsifyingEvidence(chain, context);
    
    // Add issues based on falsifying evidence
    for (const fe of results.falsifyingEvidence) {
      if (fe.strength > CAUSAL_VALIDATION_CONFIG.falsificationThreshold) {
        results.issues.push({
          type: 'FALSIFYING_EVIDENCE',
          severity: SEVERITY.HIGH,
          message: `Significant falsifying evidence found for link: ${fe.description}`
        });
      }
    }
  }

  // Check chain continuity
  for (let i = 0; i < chain.length - 1; i++) {
    const currentEffect = results.links[i].effect.toLowerCase();
    const nextCause = results.links[i + 1].cause.toLowerCase();
    
    // Check if there's logical continuity
    const hasContinuity = 
      currentEffect.includes(nextCause) ||
      nextCause.includes(currentEffect) ||
      results.links[i + 1].cause.toLowerCase().includes(currentEffect);
    
    if (!hasContinuity) {
      results.issues.push({
        type: 'CHAIN_DISCONTINUITY',
        severity: SEVERITY.MEDIUM,
        message: `Chain discontinuity between link ${i + 1} and ${i + 2}`
      });
    }
  }

  // Determine overall strength
  const avgStrength = results.links.reduce((sum, l) => sum + l.strength, 0) / results.links.length;
  const criticalIssues = results.issues.filter(i => i.severity === SEVERITY.CRITICAL).length;
  const highIssues = results.issues.filter(i => i.severity === SEVERITY.HIGH).length;

  if (criticalIssues > 0 || avgStrength < 0.3) {
    results.overallStrength = CAUSAL_STRENGTH.NONE;
    results.isValid = false;
  } else if (highIssues > 2 || avgStrength < 0.5) {
    results.overallStrength = CAUSAL_STRENGTH.WEAK;
    results.isValid = false;
  } else if (highIssues > 0 || avgStrength < 0.7) {
    results.overallStrength = CAUSAL_STRENGTH.MODERATE;
  } else {
    results.overallStrength = CAUSAL_STRENGTH.STRONG;
  }

  // Generate recommendations
  results.recommendations = generateCausalRecommendations(results);

  return results;
};

/**
 * Generate recommendations based on causal validation issues
 */
const generateCausalRecommendations = (results) => {
  const recommendations = [];
  const issueTypes = new Set(results.issues.map(i => i.type));

  if (issueTypes.has('CORRELATION_VS_CAUSATION')) {
    recommendations.push(
      'Distinguish between correlation and causation in all causal links',
      'Gather empirical evidence to support causal claims',
      'Consider randomized controlled trials if applicable'
    );
  }

  if (issueTypes.has('UNSUPPORTED_ASSUMPTION')) {
    recommendations.push(
      'Add supporting evidence for assumed causal links',
      'Explicitly document all assumptions',
      'Test assumptions with additional research'
    );
  }

  if (issueTypes.has('WEAK_LINK')) {
    recommendations.push(
      'Strengthen weak causal links with additional evidence',
      'Consider removing weak links from the chain',
      'Seek empirical validation for critical links'
    );
  }

  if (issueTypes.has('FALSIFYING_EVIDENCE')) {
    recommendations.push(
      'Address falsifying evidence before proceeding',
      'Re-evaluate the causal hypothesis',
      'Consider alternative explanations'
    );
  }

  if (issueTypes.has('CHAIN_DISCONTINUITY')) {
    recommendations.push(
      'Ensure logical continuity between causal links',
      'Restructure chain to maintain logical flow'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('Causal chain appears sound');
  }

  return recommendations;
};

/**
 * Check if chain is ready for planning (60% consensus)
 */
export const checkPlanningConsensus = (causalValidationResult) => {
  const { isValid, overallStrength, issues } = causalValidationResult;
  
  const criticalIssues = issues.filter(i => 
    i.severity === SEVERITY.CRITICAL || i.severity === SEVERITY.HIGH
  ).length;

  // Calculate readiness score
  let readinessScore = 0.5; // Base
  
  if (isValid) readinessScore += 0.3;
  
  const strengthScores = {
    [CAUSAL_STRENGTH.STRONG]: 0.2,
    [CAUSAL_STRENGTH.MODERATE]: 0.1,
    [CAUSAL_STRENGTH.WEAK]: -0.1,
    [CAUSAL_STRENGTH.NONE]: -0.3
  };
  readinessScore += strengthScores[overallStrength] || 0;
  
  readinessScore -= criticalIssues * 0.1;

  const canProceed = readinessScore >= 0.6; // 60% threshold

  return {
    canProceed,
    readinessScore: Math.max(0, Math.min(1, readinessScore)),
    issuesBlocking: criticalIssues,
    recommendation: canProceed ? 'Proceed to planning' : 'Address issues before proceeding'
  };
};

export default {
  EVIDENCE_TYPES,
  CAUSAL_VALIDATION_CONFIG,
  createCausalLink,
  distinguishCorrelationFromCausation,
  generateCounterfactual,
  generateCounterfactuals,
  searchFalsifyingEvidence,
  validateCausalChain,
  assessCausalStrength,
  checkPlanningConsensus
};
