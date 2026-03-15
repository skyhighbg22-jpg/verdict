/**
 * Skeptic Agent - Enhanced Version
 * Adversarial disproof attempts with live data cross-referencing
 */

import { bytezClient } from '../../api/bytezClient';
import { FALLACY_TYPES, SEVERITY, TYPES } from '../types';
import { queryLiveFact, queryTechnicalStatus, queryNews } from '../advisory/advisoryLayer';

/**
 * Skeptic Agent Configuration
 */
export const SKEPTIC_CONFIG = {
  grokModel: 'grok-4.2',
  disproofAttempts: 3,
  liveDataCheckThreshold: 0.7,
  minChallengeStrength: 0.4,
  requireLiveValidation: true
};

/**
 * Skeptic system prompt
 */
const SKEPTIC_SYSTEM_PROMPT = `You are a Skeptic Agent (powered by Grok 4.2). Your role is to:
1. Critically analyze claims and logical chains
2. Attempt to disprove or weaken arguments through adversarial reasoning
3. Identify logical fallacies, unstated assumptions, and weaknesses
4. Search for disconfirming evidence
5. Challenge conventional wisdom and surface-level analysis
6. Provide constructive criticism to strengthen the final argument

Be rigorous, impartial, and focused on improving quality through adversarial testing.`;

/**
 * Challenge types for disproof attempts
 */
export const CHALLENGE_TYPES = {
  ASSUMPTION_CHALLENGE: 'assumption_challenge',
  EVIDENCE_CHALLENGE: 'evidence_challenge',
  LOGIC_CHALLENGE: 'logic_challenge',
  COUNTEREXAMPLE_CHALLENGE: 'counterexample_challenge',
  ALTERNATIVE_EXPLANATION: 'alternative_explanation',
  LIVE_DATA_CHALLENGE: 'live_data_challenge'
};

/**
 * Attempt to disprove a claim through adversarial reasoning
 */
const attemptDisproof = async (claim, challengeType, context = {}) => {
  const prompt = `
    Attempt to disprove or weaken this claim through ${challengeType}.
    
    Claim: ${claim}
    Context: ${JSON.stringify(context)}
    
    Provide your adversarial analysis as JSON:
    {
      "challengeType": "${challengeType}",
      "disproofAttempt": "Your attempt to disprove or weaken this claim",
      "strength": 0.0-1.0,
      "assumptionsChallenged": ["assumption 1", "assumption 2"],
      "weaknessesIdentified": ["weakness 1"],
      "alternativeExplanation": "An alternative explanation if available",
      "verdict": "strong_challenge|moderate_challenge|weak_challenge|no_challenge"
    }
  `;

  const response = await bytezClient.runInference(SKEPTIC_CONFIG.grokModel, {
    systemPrompt: SKEPTIC_SYSTEM_PROMPT,
    userPrompt: prompt,
    temperature: 0.6 // Higher temperature for creative challenges
  });

  let parsed = {};
  if (response?.output) {
    try {
      parsed = typeof response.output === 'string' 
        ? JSON.parse(response.output) 
        : response.output;
    } catch (e) {
      console.warn('Failed to parse disproof response');
    }
  }

  return {
    challengeType,
    ...parsed,
    timestamp: new Date().toISOString()
  };
};

/**
 * Cross-reference with live data
 */
const crossReferenceWithLiveData = async (claim) => {
  const liveChecks = [];

  // Check for factual claims that can be verified
  const factualPatterns = [
    /\d+/, // Numbers (dates, percentages, etc.)
    /(API|service|platform|technology)/i,
    /(status|available|down|outage)/i
  ];

  const hasFactualContent = factualPatterns.some(p => p.test(claim));

  if (hasFactualContent) {
    // Try technical status check
    try {
      const statusResult = await queryTechnicalStatus(claim);
      liveChecks.push({
        type: 'technical_status',
        result: statusResult,
        relevant: statusResult.confidence > 0.5
      });
    } catch (e) {
      console.warn('Live status check failed:', e);
    }

    // Try news check
    try {
      const newsResult = await queryNews(claim);
      liveChecks.push({
        type: 'news',
        result: newsResult,
        relevant: newsResult.confidence > 0.5
      });
    } catch (e) {
      console.warn('Live news check failed:', e);
    }
  }

  return liveChecks;
};

/**
 * Main Skeptic Agent validation
 */
export const runSkepticValidationEnhanced = async (claim, options = {}) => {
  const {
    includeDisproofAttempts = true,
    includeLiveDataCheck = true,
    context = {}
  } = options;

  const results = {
    claim,
    isValid: true,
    overallAssessment: 'conditional',
    disproofAttempts: [],
    liveDataChecks: [],
    fallacies: [],
    assumptions: [],
    challenges: [],
    strengths: [],
    weaknesses: [],
    recommendations: [],
    metadata: {
      analyzedAt: new Date().toISOString(),
      includeLiveDataCheck
    }
  };

  // Run disproof attempts
  if (includeDisproofAttempts) {
    const challengeTypes = Object.values(CHALLENGE_TYPES);
    
    for (const challengeType of challengeTypes.slice(0, SKEPTIC_CONFIG.disproofAttempts)) {
      try {
        const disproof = await attemptDisproof(claim, challengeType, context);
        results.disproofAttempts.push(disproof);
        
        if (disproof.strength > SKEPTIC_CONFIG.minChallengeStrength) {
          results.challenges.push({
            type: challengeType,
            strength: disproof.strength,
            description: disproof.disproofAttempt,
            assumptionsChallenged: disproof.assumptionsChallenged || [],
            weaknesses: disproof.weaknessesIdentified || []
          });
        }
      } catch (error) {
        console.warn(`Disproof attempt ${challengeType} failed:`, error);
      }
    }
  }

  // Cross-reference with live data
  if (includeLiveDataCheck && SKEPTIC_CONFIG.requireLiveValidation) {
    try {
      results.liveDataChecks = await crossReferenceWithLiveData(claim);
    } catch (error) {
      console.warn('Live data cross-reference failed:', error);
    }
  }

  // Analyze challenges
  const strongChallenges = results.challenges.filter(c => c.strength >= 0.7);
  const moderateChallenges = results.challenges.filter(c => c.strength >= 0.4 && c.strength < 0.7);

  // Identify assumptions
  results.assumptions = results.challenges.flatMap(c => c.assumptionsChallenged || []);
  results.assumptions = [...new Set(results.assumptions)];

  // Identify weaknesses
  results.weaknesses = results.challenges.flatMap(c => c.weaknesses || []);
  results.weaknesses = [...new Set(results.weaknesses)];

  // Determine overall assessment
  if (strongChallenges.length >= 2) {
    results.overallAssessment = 'negative';
    results.isValid = false;
  } else if (moderateChallenges.length >= 3) {
    results.overallAssessment = 'negative';
    results.isValid = false;
  } else if (moderateChallenges.length >= 1) {
    results.overallAssessment = 'conditional';
  } else {
    results.overallAssessment = 'positive';
  }

  // Check live data for contradictions
  const contradictions = results.liveDataChecks.filter(c => 
    c.relevant && c.result.confidence > SKEPTIC_CONFIG.liveDataCheckThreshold
  );

  if (contradictions.length > 0) {
    results.issues = results.issues || [];
    results.issues.push({
      type: 'LIVE_DATA_CONTRADICTION',
      severity: SEVERITY.HIGH,
      message: `Live data check found ${contradictions.length} potential contradiction(s)`
    });
    results.overallAssessment = 'negative';
    results.isValid = false;
  }

  // Generate recommendations based on challenges
  if (results.weaknesses.length > 0) {
    results.recommendations.push(
      `Address ${results.weaknesses.length} identified weaknesses`,
      'Strengthen weak points in the argument',
      'Consider alternative approaches'
    );
  }

  if (results.assumptions.length > 0) {
    results.recommendations.push(
      'Explicitly verify or test stated assumptions',
      'Document all assumptions made'
    );
  }

  if (strongChallenges.length > 0) {
    results.recommendations.push(
      'Critical: Address strong adversarial challenges before proceeding'
    );
  }

  if (results.recommendations.length === 0) {
    results.recommendations.push('Argument appears robust against adversarial testing');
  }

  return results;
};

/**
 * Quick skeptic check (lighter weight)
 */
export const quickSkepticCheck = async (claim) => {
  const prompt = `
    Provide a quick skeptical analysis of this claim.
    
    Claim: ${claim}
    
    Return JSON:
    {
      "isValid": true/false,
      "overallAssessment": "positive|conditional|negative",
      "keyConcerns": ["concern 1", "concern 2"],
      "quickVerdict": "pass|conditional|fail"
    }
  `;

  const response = await bytezClient.runInference(SKEPTIC_CONFIG.grokModel, {
    systemPrompt: SKEPTIC_SYSTEM_PROMPT,
    userPrompt: prompt,
    temperature: 0.4
  });

  let parsed = {};
  if (response?.output) {
    try {
      parsed = typeof response.output === 'string' 
        ? JSON.parse(response.output) 
        : response.output;
    } catch (e) {
      console.warn('Failed to parse quick skeptic response');
    }
  }

  return {
    claim,
    ...parsed,
    checkedAt: new Date().toISOString()
  };
};

/**
 * Compare main hypothesis with adversarial findings
 */
export const compareWithAdversarialEnhanced = (mainFindings, adversarialResults) => {
  const result = {
    agreement: 0,
    disagreements: [],
    gaps: [],
    synthesis: '',
    confidenceAdjustment: 0,
    reconcilable: true
  };

  if (!adversarialResults || adversarialResults.length === 0) {
    result.synthesis = 'No adversarial findings. Main findings stand.';
    return result;
  }

  const mainPoints = mainFindings.keyPoints || mainFindings.findings || [];
  const advPoints = adversarialResults.challenges || [];

  // Calculate agreement
  mainPoints.forEach((point, i) => {
    const matchingAdv = advPoints.find(ap => 
      point.toLowerCase().includes(ap.description?.toLowerCase()) ||
      ap.weaknesses?.some(w => point.toLowerCase().includes(w.toLowerCase()))
    );

    if (matchingAdv) {
      result.agreement++;
    } else {
      result.disagreements.push({
        mainPoint: point,
        adversarialPoint: advPoints[i]?.description || null,
        severity: SEVERITY.MEDIUM
      });
    }
  });

  // Check for gaps
  const advWeaknesses = advPoints.flatMap(ap => ap.weaknesses || []);
  const addressedWeaknesses = mainPoints.filter(mp => 
    advWeaknesses.some(aw => mp.toLowerCase().includes(aw.toLowerCase()))
  );

  result.gaps = advWeaknesses.filter(aw => 
    !addressedWeaknesses.some(aw2 => aw2.toLowerCase().includes(aw.toLowerCase()))
  );

  // Calculate confidence adjustment
  const strongChallenges = adversarialResults.challenges?.filter(c => c.strength >= 0.7).length || 0;
  const moderateChallenges = adversarialResults.challenges?.filter(c => c.strength >= 0.4).length || 0;
  
  result.confidenceAdjustment = -(
    strongChallenges * 0.15 + 
    moderateChallenges * 0.08 +
    result.gaps.length * 0.1
  );

  result.confidenceAdjustment = Math.max(-0.5, Math.min(0, result.confidenceAdjustment));

  // Determine if reconcilable
  result.reconcilable = result.confidenceAdjustment > -0.3;

  // Generate synthesis
  if (result.agreement === mainPoints.length) {
    result.synthesis = 'Strong confirmation from adversarial analysis.';
  } else if (!result.reconcilable) {
    result.synthesis = 'Significant gaps found. Address adversarial concerns before proceeding.';
  } else if (result.disagreements.length > mainPoints.length / 2) {
    result.synthesis = 'Major disagreements. Strongly recommend revising hypothesis.';
  } else {
    result.synthesis = 'Mixed results. Consider addressing identified gaps.';
  }

  return result;
};

export default {
  SKEPTIC_CONFIG,
  CHALLENGE_TYPES,
  runSkepticValidationEnhanced,
  quickSkepticCheck,
  compareWithAdversarialEnhanced
};
