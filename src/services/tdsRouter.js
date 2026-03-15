/**
 * TDS Router (Task Difficulty Score)
 * Uses GPT-5.4 Pro to calculate difficulty scores for tasks
 */

import { bytezClient } from '../api/bytezClient';

/**
 * Default TDS scores structure
 */
export const DEFAULT_TDS_SCORES = {
  technicalComplexity: 5,
  infrastructureImpact: 5,
  securityRisk: 5,
  timeConstraint: 5,
  resourceAvailability: 5
};

/**
 * TDS Score categories and their descriptions
 */
export const TDS_CATEGORIES = {
  technicalComplexity: {
    label: 'Technical Complexity',
    description: 'Code complexity, architecture depth, integration points',
    range: [1, 10]
  },
  infrastructureImpact: {
    label: 'Infrastructure Impact',
    description: 'Changes to infrastructure, deployment complexity',
    range: [1, 10]
  },
  securityRisk: {
    label: 'Security Risk',
    description: 'Potential security vulnerabilities, data exposure',
    range: [1, 10]
  },
  timeConstraint: {
    label: 'Time Constraint',
    description: 'Urgency and deadline pressure',
    range: [1, 10]
  },
  resourceAvailability: {
    label: 'Resource Availability',
    description: 'Available expertise, tooling, budget',
    range: [1, 10]
  }
};

/**
 * Calculate overall difficulty score
 * 
 * @param {Object} scores - Individual TDS scores
 * @returns {number} Overall difficulty (0-10)
 */
export const calculateOverallDifficulty = (scores) => {
  const weights = {
    technicalComplexity: 0.30,
    infrastructureImpact: 0.20,
    securityRisk: 0.25,
    timeConstraint: 0.15,
    resourceAvailability: 0.10
  };

  let weightedSum = 0;
  for (const [category, weight] of Object.entries(weights)) {
    weightedSum += (scores[category] || 5) * weight;
  }

  return weightedSum;
};

/**
 * Determine routing recommendation based on TDS
 * 
 * @param {Object} scores - TDS scores
 * @returns {Object} Routing recommendation
 */
export const determineRouting = (scores) => {
  const overall = calculateOverallDifficulty(scores);

  let complexityLevel, recommendedApproach, estimatedCycles;

  if (overall <= 3) {
    complexityLevel = 'Simple';
    recommendedApproach = 'Direct Implementation';
    estimatedCycles = 1;
  } else if (overall <= 5) {
    complexityLevel = 'Moderate';
    recommendedApproach = 'Standard Planning → Research → Implementation';
    estimatedCycles = 2;
  } else if (overall <= 7) {
    complexityLevel = 'Complex';
    recommendedApproach = 'Full GDE Decomposition with Adversarial Branching';
    estimatedCycles = 3;
  } else {
    complexityLevel = 'Critical';
    recommendedApproach = 'Full Pipeline with External Review and Multiple Approval Gates';
    estimatedCycles = 5;
  }

  // Check for high-risk indicators
  const highRiskIndicators = [];
  if (scores.securityRisk >= 8) highRiskIndicators.push('High Security Risk');
  if (scores.infrastructureImpact >= 8) highRiskIndicators.push('Critical Infrastructure Change');
  if (scores.timeConstraint >= 9) highRiskIndicators.push('Extreme Time Pressure');
  if (scores.resourceAvailability <= 2) highRiskIndicators.push('Resource Constrained');

  return {
    complexityLevel,
    overall,
    recommendedApproach,
    estimatedCycles,
    highRiskIndicators,
    requiresHumanApproval: highRiskIndicators.length > 0 || overall >= 7
  };
};

/**
 * Run TDS analysis using GPT-5.4 Pro
 * 
 * @param {string} userPrompt - The task/prompt to analyze
 * @param {string} context - Additional context (optional)
 * @returns {Promise<Object>} TDS analysis results
 */
export const runTDSAnalysis = async (userPrompt, context = '') => {
  const analysisPrompt = `
    Analyze the following task for difficulty and complexity.
    Provide scores (1-10) for each category.
    
    Task: ${userPrompt}
    ${context ? `Context: ${context}` : ''}
    
    Categories to score:
    1. technicalComplexity - Code complexity, architecture depth
    2. infrastructureImpact - Changes needed to infrastructure
    3. securityRisk - Potential security implications
    4. timeConstraint - Urgency and deadline pressure
    5. resourceAvailability - Available expertise and tools
    
    Provide your response as JSON:
    {
      "technicalComplexity": X,
      "infrastructureImpact": X,
      "securityRisk": X,
      "timeConstraint": X,
      "resourceAvailability": X,
      "reasoning": "Brief explanation of scores"
    }
  `;

  try {
    const response = await bytezClient.runInference('gpt-5.4-pro', {
      systemPrompt: 'You are a task difficulty analysis expert. Provide accurate, unbiased difficulty scores.',
      userPrompt: analysisPrompt,
      temperature: 0.2
    });

    let parsedScores;
    if (response && response.output) {
      try {
        parsedScores = typeof response.output === 'string'
          ? JSON.parse(response.output)
          : response.output;
      } catch (parseError) {
        console.warn('Failed to parse TDS response, using defaults');
        parsedScores = DEFAULT_TDS_SCORES;
      }
    }

    const routing = determineRouting(parsedScores);

    return {
      scores: parsedScores,
      routing,
      analyzedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('TDS analysis failed, using fallback:', error);
    // Fallback: return default scores with routing
    const routing = determineRouting(DEFAULT_TDS_SCORES);
    return {
      scores: DEFAULT_TDS_SCORES,
      routing,
      analyzedAt: new Date().toISOString(),
      fallback: true
    };
  }
};

/**
 * Update scores based on phase progress
 * 
 * @param {Object} currentScores - Current TDS scores
 * @param {string} phase - Current phase
 * @param {Object} phaseData - Data from current phase
 * @returns {Object} Updated scores
 */
export const updateScoresForPhase = (currentScores, phase, phaseData) => {
  const updatedScores = { ...currentScores };

  switch (phase) {
    case 'Refining':
      // After refining, technical complexity might be adjusted based on clarified requirements
      if (phaseData.clarifiedComplexity) {
        updatedScores.technicalComplexity = phaseData.clarifiedComplexity;
      }
      break;
    case 'Planning':
      // After planning, infrastructure impact becomes clearer
      if (phaseData.plannedImpact) {
        updatedScores.infrastructureImpact = phaseData.plannedImpact;
      }
      break;
    case 'Research':
      // After research, security and resource assessments are refined
      if (phaseData.securityFindings) {
        updatedScores.securityRisk = Math.min(10, updatedScores.securityRisk + phaseData.securityFindings);
      }
      if (phaseData.resourceGaps) {
        updatedScores.resourceAvailability = Math.max(1, updatedScores.resourceAvailability - phaseData.resourceGaps);
      }
      break;
    case 'Implementation':
      // During implementation, time constraints might change
      if (phaseData.remainingTime) {
        updatedScores.timeConstraint = phaseData.remainingTime;
      }
      break;
    default:
      break;
  }

  const routing = determineRouting(updatedScores);
  return { scores: updatedScores, routing };
};

export default {
  DEFAULT_TDS_SCORES,
  TDS_CATEGORIES,
  calculateOverallDifficulty,
  determineRouting,
  runTDSAnalysis,
  updateScoresForPhase
};
