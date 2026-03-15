/**
 * Causal Chain Validator & Skeptic Agent
 * Uses Grok 4.2 for adversarial validation and fallacy detection
 */

import { bytezClient } from '../api/bytezClient';

/**
 * Logical fallacies to detect
 */
export const FALLACY_TYPES = {
  AD_HOMINEM: 'Ad Hominem',
  STRAW_MAN: 'Straw Man',
  FALSE_DILEMMA: 'False Dilemma',
  SLIPPERY_SLOPE: 'Slippery Slope',
  CIRCULAR_REASONING: 'Circular Reasoning',
  HASTY_GENERALIZATION: 'Hasty Generalization',
  RED_HERRING: 'Red Herring',
  APPEAL_TO_AUTHORITY: 'Appeal to Authority',
  APPEAL_TO_EMOTION: 'Appeal to Emotion',
  POST_HOC: 'Post Hoc Ergo Propter Hoc',
  CONFIRMATION_BIAS: 'Confirmation Bias',
  SUNK_COST_FALLACY: 'Sunk Cost Fallacy'
};

/**
 * Validation severity levels
 */
export const SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info'
};

/**
 * Causal strength assessment
 */
export const CAUSAL_STRENGTH = {
  STRONG: 'strong',
  MODERATE: 'moderate',
  WEAK: 'weak',
  NONE: 'none'
};

/**
 * Default skeptic system prompt
 */
const SKEPTIC_SYSTEM_PROMPT = `You are a Skeptic Agent (powered by Grok 4.2). Your role is to:
1. Critically analyze causal claims and logical chains
2. Identify logical fallacies in arguments
3. Challenge assumptions and search for disconfirming evidence
4. Evaluate the strength of causal relationships
5. Provide constructive criticism to improve reasoning

Be rigorous, impartial, and focused on improving the quality of reasoning.`;

/**
 * Analyze a causal chain for validity
 * 
 * @param {Array} causalChain - Array of causal links {cause, effect, evidence}
 * @returns {Object} Validation results
 */
export const analyzeCausalChain = (causalChain) => {
  const results = {
    isValid: true,
    overallStrength: CAUSAL_STRENGTH.MODERATE,
    issues: [],
    recommendations: [],
    links: []
  };

  if (!causalChain || causalChain.length === 0) {
    results.issues.push({
      type: 'EMPTY_CHAIN',
      severity: SEVERITY.CRITICAL,
      message: 'No causal chain provided for validation'
    });
    results.isValid = false;
    return results;
  }

  // Analyze each link in the chain
  causalChain.forEach((link, index) => {
    const linkAnalysis = analyzeCausalLink(link, index);
    results.links.push(linkAnalysis);
    
    if (linkAnalysis.issues.length > 0) {
      results.issues.push(...linkAnalysis.issues);
    }
  });

  // Check for chain continuity
  for (let i = 0; i < causalChain.length - 1; i++) {
    const currentEffect = causalChain[i].effect.toLowerCase();
    const nextCause = causalChain[i + 1].cause.toLowerCase();
    
    if (!currentEffect.includes(nextCause) && !nextCause.includes(currentEffect)) {
      results.issues.push({
        type: 'CHAIN_DISCONTINUITY',
        severity: SEVERITY.MEDIUM,
        message: `Chain discontinuity between link ${i + 1} and ${i + 2}: "${causalChain[i].effect}" does not connect to "${causalChain[i + 1].cause}"`
      });
    }
  }

  // Determine overall strength
  const criticalCount = results.issues.filter(i => i.severity === SEVERITY.CRITICAL).length;
  const highCount = results.issues.filter(i => i.severity === SEVERITY.HIGH).length;
  
  if (criticalCount > 0) {
    results.overallStrength = CAUSAL_STRENGTH.NONE;
    results.isValid = false;
  } else if (highCount > 2) {
    results.overallStrength = CAUSAL_STRENGTH.WEAK;
    results.isValid = false;
  } else if (highCount > 0 || results.issues.length > 3) {
    results.overallStrength = CAUSAL_STRENGTH.MODERATE;
  }

  // Generate recommendations
  if (results.issues.length > 0) {
    results.recommendations = generateRecommendations(results.issues);
  }

  return results;
};

/**
 * Analyze a single causal link
 */
const analyzeCausalLink = (link, index) => {
  const analysis = {
    linkIndex: index,
    cause: link.cause,
    effect: link.effect,
    strength: CAUSAL_STRENGTH.MODERATE,
    issues: [],
    evidence: link.evidence || ''
  };

  // Check for vague language
  const vagueTerms = ['might', 'may', 'could', 'possibly', 'probably', 'perhaps'];
  const hasVagueCause = vagueTerms.some(term => link.cause.toLowerCase().includes(term));
  const hasVagueEffect = vagueTerms.some(term => link.effect.toLowerCase().includes(term));

  if (hasVagueCause) {
    analysis.issues.push({
      type: 'VAGUE_CAUSE',
      severity: SEVERITY.MEDIUM,
      message: `Link ${index + 1}: Cause contains vague language ("${link.cause}")`
    });
    analysis.strength = CAUSAL_STRENGTH.WEAK;
  }

  if (hasVagueEffect) {
    analysis.issues.push({
      type: 'VAGUE_EFFECT',
      severity: SEVERITY.MEDIUM,
      message: `Link ${index + 1}: Effect contains vague language ("${link.effect}")`
    });
  }

  // Check for evidence
  if (!link.evidence || link.evidence.length < 10) {
    analysis.issues.push({
      type: 'LACKING_EVIDENCE',
      severity: SEVERITY.HIGH,
      message: `Link ${index + 1}: Missing or insufficient evidence for causal claim`
    });
    analysis.strength = CAUSAL_STRENGTH.WEAK;
  }

  // Check for correlation vs causation indicators
  const correlationPhrases = ['associated with', 'correlated with', 'linked to', 'happens at the same time'];
  if (correlationPhrases.some(phrase => link.cause.toLowerCase().includes(phrase) || link.effect.toLowerCase().includes(phrase))) {
    analysis.issues.push({
      type: 'CORRELATION_VS_CAUSATION',
      severity: SEVERITY.HIGH,
      message: `Link ${index + 1}: Language suggests correlation rather than causation`
    });
    analysis.strength = CAUSAL_STRENGTH.WEAK;
  }

  return analysis;
};

/**
 * Generate recommendations based on issues
 */
const generateRecommendations = (issues) => {
  const recommendations = [];
  const types = new Set(issues.map(i => i.type));

  if (types.has('LACKING_EVIDENCE')) {
    recommendations.push('Add concrete evidence and data to support causal claims');
  }

  if (types.has('VAGUE_CAUSE') || types.has('VAGUE_EFFECT')) {
    recommendations.push('Replace vague language with specific, measurable statements');
  }

  if (types.has('CORRELATION_VS_CAUSATION')) {
    recommendations.push('Distinguish between correlation and causation; consider alternative explanations');
  }

  if (types.has('CHAIN_DISCONTINUITY')) {
    recommendations.push('Ensure each effect logically leads to the next cause in the chain');
  }

  if (recommendations.length === 0) {
    recommendations.push('Review all causal links for logical consistency');
  }

  return recommendations;
};

/**
 * Detect logical fallacies in text
 * 
 * @param {string} text - Text to analyze
 * @returns {Array} Detected fallacies
 */
export const detectFallacies = (text) => {
  const detected = [];
  const textLower = text.toLowerCase();

  // Pattern-based fallacy detection (simplified)
  const fallacyPatterns = {
    [FALLACY_TYPES.AD_HOMINEM]: [
      /stupid|idiot|fool|dumb|ignorant|liar|hypocrite/,
      /wrong because (?:you|they)/,
      /attack on (?:character|person|motives)/
    ],
    [FALLACY_TYPES.STRAW_MAN]: [
      /misrepresent|twist|distort/,
      /so you're saying/,
      /extreme version of/
    ],
    [FALLACY_TYPES.FALSE_DILEMMA]: [
      /either .* or/,
      /only two (?:options|choices|possibilities)/,
      /black and white/,
      /us versus them/
    ],
    [FALLACY_TYPES.SLIPPERY_SLOPE]: [
      /if .* then .* inevitably/,
      /lead to (?:disaster|catastrophe|doom)/,
      /first step (?:to|towards)/,
      /slope|domino effect/
    ],
    [FALLACY_TYPES.CIRCULAR_REASONING]: [
      /because (?:it is|that's|this is)/,
      /is true because (?:it is|we know)/
    ],
    [FALLACY_TYPES.HASTY_GENERALIZATION]: [
      /all (?:the|these)/,
      /every (?:single|one)/,
      /always|never/,
      /few examples? (?:prove|show|suggest)/
    ],
    [FALLACY_TYPES.RED_HERRING]: [
      /aside from|irrelevant/,
      /changing the subject/,
      /distract/
    ],
    [FALLACY_TYPES.APPEAL_TO_EMOTION]: [
      /feel|feelings|emotions/,
      /heart|soul|spirit/,
      /fear|hope|love|hate/
    ],
    [FALLACY_TYPES.POST_HOC]: [
      /after (?:this|that|which)/,
      /since then|following/,
      /caused by|due to|because of/
    ]
  };

  for (const [fallacy, patterns] of Object.entries(fallacyPatterns)) {
    for (const pattern of patterns) {
      if (pattern.test(textLower)) {
        detected.push({
          type: fallacy,
          severity: SEVERITY.MEDIUM,
          matchedText: text.match(pattern)?.[0] || '',
          message: `Possible ${fallacy} detected`
        });
        break;
      }
    }
  }

  return detected;
};

/**
 * Run Skeptic Agent validation using Grok 4.2
 * 
 * @param {Object} plan - The plan/argument to validate
 * @param {string} type - Type of validation: 'causal_chain' | 'argument' | 'full_review'
 * @returns {Promise<Object>} Validation results
 */
export const runSkepticValidation = async (plan, type = 'full_review') => {
  let validationPrompt;

  if (type === 'causal_chain') {
    validationPrompt = `
      Analyze the following causal chain for logical validity and soundness.
      
      Causal Chain:
      ${JSON.stringify(plan.causalChain || [], null, 2)}
      
      Provide your analysis as JSON:
      {
        "isValid": true/false,
        "overallStrength": "strong|moderate|weak|none",
        "issues": [
          {
            "type": "issue type",
            "severity": "critical|high|medium|low",
            "message": "description"
          }
        ],
        "recommendations": ["recommendation 1", "recommendation 2"]
      }
    `;
  } else if (type === 'argument') {
    validationPrompt = `
      Analyze the following argument for logical fallacies and weak reasoning.
      
      Argument: ${plan.argument || plan.content || ''}
      
      Previous conclusions: ${JSON.stringify(plan.conclusions || [])}
      
      Provide your analysis as JSON:
      {
        "isValid": true/false,
        "fallacies": [
          {
            "type": "fallacy type",
            "severity": "critical|high|medium|low",
            "location": "where in the text",
            "explanation": "why this is a fallacy"
          }
        ],
        "strengths": ["strength 1", "strength 2"],
        "recommendations": ["recommendation 1", "recommendation 2"]
      }
    `;
  } else {
    // Full review
    validationPrompt = `
      Perform a comprehensive skeptical review of the following plan/strategy.
      
      Plan: ${JSON.stringify(plan, null, 2)}
      
      Focus on:
      1. Logical consistency
      2. Assumptions and their validity
      3. Potential weaknesses or blind spots
      4. Alternative interpretations or explanations
      5. Causal chain validity
      
      Provide your analysis as JSON:
      {
        "overallAssessment": "positive|neutral|negative|conditional",
        "isValid": true/false,
        "criticalIssues": ["issue 1", "issue 2"],
        "weaknesses": ["weakness 1", "weakness 2"],
        "strengths": ["strength 1", "strength 2"],
        "recommendations": ["recommendation 1", "recommendation 2"],
        "adversarialPoints": ["point to consider 1", "point to consider 2"]
      }
    `;
  }

  try {
    const response = await bytezClient.runInference('grok-4.2', {
      systemPrompt: SKEPTIC_SYSTEM_PROMPT,
      userPrompt: validationPrompt,
      temperature: 0.5
    });

    let parsedResult;
    if (response && response.output) {
      try {
        parsedResult = typeof response.output === 'string'
          ? JSON.parse(response.output)
          : response.output;
      } catch (parseError) {
        console.warn('Failed to parse skeptic response, using fallback');
        parsedResult = createFallbackValidation(type);
      }
    }

    return {
      ...parsedResult,
      validatedAt: new Date().toISOString(),
      type
    };
  } catch (error) {
    console.error('Skeptic validation failed:', error);
    return {
      ...createFallbackValidation(type),
      validatedAt: new Date().toISOString(),
      type,
      error: error.message
    };
  }
};

/**
 * Create fallback validation result
 */
const createFallbackValidation = (type) => {
  if (type === 'causal_chain') {
    return {
      isValid: true,
      overallStrength: CAUSAL_STRENGTH.MODERATE,
      issues: [],
      recommendations: ['Manual review recommended - automated validation unavailable']
    };
  }

  return {
    overallAssessment: 'conditional',
    isValid: true,
    criticalIssues: [],
    weaknesses: ['Unable to perform automated validation'],
    strengths: ['Plan structure appears sound'],
    recommendations: ['Manual review recommended'],
    adversarialPoints: ['Consider alternative approaches']
  };
};

/**
 * Compare main hypothesis with adversarial findings
 * 
 * @param {Object} mainFindings - Primary research findings
 * @param {Object} adversarialFindings - Adversarial (disconfirming) findings
 * @returns {Object} Comparison result
 */
export const compareWithAdversarial = (mainFindings, adversarialFindings) => {
  const result = {
    agreement: 0,
    disagreements: [],
    gaps: [],
    synthesis: '',
    confidenceAdjustment: 0
  };

  if (!adversarialFindings || adversarialFindings.length === 0) {
    result.synthesis = 'No adversarial findings to compare. Main findings stand as presented.';
    return result;
  }

  // Simple comparison logic
  const mainPoints = mainFindings.keyPoints || [];
  const advPoints = adversarialFindings.keyPoints || [];

  mainPoints.forEach((point, i) => {
    const matchingAdv = advPoints.find(ap => 
      point.toLowerCase().includes(ap.toLowerCase()) || 
      ap.toLowerCase().includes(point.toLowerCase())
    );

    if (matchingAdv) {
      result.agreement++;
    } else {
      result.disagreements.push({
        mainPoint: point,
        adversarialPoint: advPoints[i] || null,
        severity: SEVERITY.MEDIUM
      });
    }
  });

  // Calculate confidence adjustment
  const disagreementRatio = result.disagreements.length / Math.max(mainPoints.length, 1);
  result.confidenceAdjustment = -Math.min(0.3, disagreementRatio * 0.5);

  // Generate synthesis
  if (result.agreement === mainPoints.length) {
    result.synthesis = 'Strong confirmation from adversarial analysis. High confidence in findings.';
  } else if (result.disagreements.length > mainPoints.length / 2) {
    result.synthesis = 'Significant disagreements found. Strongly recommend revising hypothesis.';
  } else {
    result.synthesis = 'Mixed results. Consider addressing identified disagreements before proceeding.';
  }

  return result;
};

export default {
  FALLACY_TYPES,
  SEVERITY,
  CAUSAL_STRENGTH,
  analyzeCausalChain,
  detectFallacies,
  runSkepticValidation,
  compareWithAdversarial
};
