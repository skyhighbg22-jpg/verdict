/**
 * Divergence Hunter - Dedicated Stateless Component
 * Detects divergent thinking across planning branches and identifies 
 * fundamental disagreements that need resolution
 * Powered by Grok 4.2 as per specification
 */

import { bytezClient } from '../../api/bytezClient';

export const DIVERGENCE_CONFIG = {
  grokModel: 'grok-4.2',
  divergenceThreshold: 0.3,
  criticalDivergenceThreshold: 0.6,
  maxDivergencePoints: 10
};

const DIVERGENCE_HUNTER_SYSTEM_PROMPT = `You are the Divergence Hunter - a stateless component in the VERDICT Four-Branch Planning system.
Your role is to detect and analyze divergent thinking across different planning branches (Systems Architect, Security Auditor, Product Designer, Antithetical).

You are completely stateless - you do not remember previous analyses. Each call is independent.

Responsibilities:
1. Identify points where branches fundamentally disagree
2. Detect conflicting assumptions between branches
3. Find incompatible recommendations or approaches
4. Measure the degree of divergence (0-1 scale)
5. Categorize the type of disagreement
6. Identify which divergences are critical vs resolvable
7. Find common ground where possible

Divergence Types:
- TECHNICAL: Different technical approaches or architectures
- SECURITY: Conflicting security priorities
- UX: Disagreements about user experience
- SCOPE: Different views on what should be included
- PRIORITY: Conflicting priority orderings
- ASSUMPTION: Different foundational assumptions
- RISK: Different risk tolerance assessments
- RESOURCE: Conflicting resource requirements

Output format: JSON with structured divergence analysis.`;

const DIVERGENCE_CATEGORIES = [
  'TECHNICAL',
  'SECURITY',
  'UX',
  'SCOPE',
  'PRIORITY',
  'ASSUMPTION',
  'RISK',
  'RESOURCE'
];

/**
 * Analyze divergence between planning branches
 */
export const analyzeBranchDivergence = async (branchAnalyses, context = {}) => {
  const prompt = `
    Analyze divergence between these planning branch analyses.
    
    Branch Analyses:
    ${JSON.stringify(branchAnalyses, null, 2)}
    
    Context: ${JSON.stringify(context)}
    
    Provide divergence analysis as JSON:
    {
      "overallDivergenceScore": 0.0-1.0,
      "isCriticallyDivergent": boolean,
      "divergencePoints": [
        {
          "id": "div_1",
          "category": "${DIVERGENCE_CATEGORIES.join('|')}",
          "description": "description of disagreement",
          "branchA": "which branch",
          "branchB": "which branch",
          "positionA": "branch A's position",
          "positionB": "branch B's position",
          "severity": "critical|high|medium|low",
          "resolvability": "easily_resolvable|negotiable|fundamental",
          "suggestedResolution": "how to resolve"
        }
      ],
      "fundamentalDisagreements": ["disagreement 1"],
      "commonGround": ["area of agreement 1"],
      "requiresEscalation": boolean,
      "recommendation": "overall recommendation"
    }
  `;

  try {
    const response = await bytezClient.runInference(DIVERGENCE_CONFIG.grokModel, {
      systemPrompt: DIVERGENCE_HUNTER_SYSTEM_PROMPT,
      userPrompt: prompt,
      temperature: 0.5
    });

    let parsed = {};
    if (response?.output) {
      try {
        parsed = typeof response.output === 'string'
          ? JSON.parse(response.output)
          : response.output;
      } catch (e) {
        console.warn('Failed to parse Divergence Hunter response');
      }
    }

    return {
      component: 'Divergence Hunter',
      timestamp: new Date().toISOString(),
      stateless: true,
      model: DIVERGENCE_CONFIG.grokModel,
      ...parsed
    };
  } catch (error) {
    return {
      component: 'Divergence Hunter',
      error: error.message,
      requiresEscalation: true
    };
  }
};

/**
 * Quick divergence check - lightweight version
 */
export const quickDivergenceCheck = async (positions) => {
  const prompt = `
    Quickly check for divergence between these positions.
    
    Positions: ${JSON.stringify(positions)}
    
    Provide JSON:
    {
      "hasDivergence": boolean,
      "divergenceScore": 0.0-1.0,
      "mainConflict": "primary disagreement",
      "severity": "critical|high|medium|low|none"
    }
  `;

  try {
    const response = await bytezClient.runInference(DIVERGENCE_CONFIG.grokModel, {
      systemPrompt: DIVERGENCE_HUNTER_SYSTEM_PROMPT,
      userPrompt: prompt,
      temperature: 0.4
    });

    let parsed = {};
    if (response?.output) {
      try {
        parsed = typeof response.output === 'string'
          ? JSON.parse(response.output)
          : response.output;
      } catch (e) {}
    }

    return {
      component: 'Divergence Hunter (Quick)',
      timestamp: new Date().toISOString(),
      stateless: true,
      ...parsed
    };
  } catch (error) {
    return {
      component: 'Divergence Hunter (Quick)',
      error: error.message
    };
  }
};

/**
 * Track divergence over time
 */
export const trackDivergenceTrend = async (historicalDivergence) => {
  const prompt = `
    Analyze divergence trends over time.
    
    Historical Data:
    ${JSON.stringify(historicalDivergence, null, 2)}
    
    Provide JSON:
    {
      "trend": "increasing|decreasing|stable",
      "averageDivergence": 0.0-1.0,
      "isConverging": boolean,
      "significantShifts": ["shift 1"],
      "prediction": "divergence prediction"
    }
  `;

  try {
    const response = await bytezClient.runInference(DIVERGENCE_CONFIG.grokModel, {
      systemPrompt: DIVERGENCE_HUNTER_SYSTEM_PROMPT,
      userPrompt: prompt,
      temperature: 0.5
    });

    let parsed = {};
    if (response?.output) {
      try {
        parsed = typeof response.output === 'string'
          ? JSON.parse(response.output)
          : response.output;
      } catch (e) {}
    }

    return {
      component: 'Divergence Hunter',
      analysisType: 'trend',
      timestamp: new Date().toISOString(),
      ...parsed
    };
  } catch (error) {
    return {
      component: 'Divergence Hunter',
      error: error.message
    };
  }
};

/**
 * Find consensus points among diverging views
 */
export const findConsensusPoints = async (divergentViews) => {
  const prompt = `
    Find consensus points among these divergent views.
    
    Views: ${JSON.stringify(divergentViews)}
    
    Provide JSON:
    {
      "consensusPoints": [
        {
          "topic": "topic of agreement",
          "agreement": "description of agreement",
          "branchesInAgreement": ["branch 1"],
          "strength": 0.0-1.0
        }
      ],
      "remainingDivergences": ["divergence 1"],
      "canProceed": boolean
    }
  `;

  try {
    const response = await bytezClient.runInference(DIVERGENCE_CONFIG.grokModel, {
      systemPrompt: DIVERGENCE_HUNTER_SYSTEM_PROMPT,
      userPrompt: prompt,
      temperature: 0.4
    });

    let parsed = {};
    if (response?.output) {
      try {
        parsed = typeof response.output === 'string'
          ? JSON.parse(response.output)
          : response.output;
      } catch (e) {}
    }

    return {
      component: 'Divergence Hunter',
      analysisType: 'consensus',
      timestamp: new Date().toISOString(),
      ...parsed
    };
  } catch (error) {
    return {
      component: 'Divergence Hunter',
      error: error.message
    };
  }
};

/**
 * Check if divergence exceeds critical threshold
 */
export const isCriticallyDivergent = (divergenceScore) => {
  return divergenceScore >= DIVERGENCE_CONFIG.criticalDivergenceThreshold;
};

/**
 * Should activate antithetical branch based on divergence
 */
export const shouldActivateAntithetical = (divergenceScore, convergencePercentage) => {
  return (
    divergenceScore >= DIVERGENCE_CONFIG.divergenceThreshold ||
    convergencePercentage < 90
  );
};

export default {
  DIVERGENCE_CONFIG,
  DIVERGENCE_CATEGORIES,
  analyzeBranchDivergence,
  quickDivergenceCheck,
  trackDivergenceTrend,
  findConsensusPoints,
  isCriticallyDivergent,
  shouldActivateAntithetical
};
