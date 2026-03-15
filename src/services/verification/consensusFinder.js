/**
 * Consensus Finder - Stateless Component
 * Identifies unanimous steps for ground truth locking
 * Low temperature for deterministic output
 * Powered by Gemini 3.1 Pro as per specification
 */

import { bytezClient } from '../../api/bytezClient';

export const CONSENSUS_FINDER_CONFIG = {
  model: 'gemini-3.1-pro',
  temperature: 0.1,
  maxRetries: 3,
  consensusThreshold: 0.60,
  unanimousThreshold: 1.0,
  minConsensusForLock: 0.75
};

const CONSENSUS_FINDER_PROMPT = `You are the Consensus Finder - a stateless component in the VERDICT Four-Branch Planning system.
Your role is to identify points of unanimous agreement across planning branches for ground truth locking.

You are completely stateless - you do not remember previous analyses. Each call is independent.
Use LOW TEMPERATURE for deterministic, precise output.

Responsibilities:
1. Find steps ALL branches agree on (unanimous)
2. Identify steps with supermajority agreement (>67%)
3. Find steps with majority agreement (>50%)
4. Flag steps with significant disagreement
5. Recommend which steps can be locked as ground truth
6. Identify steps requiring further discussion

Ground Truth Locking Criteria:
- Unanimous agreement (100%) = immediate lock eligible
- Supermajority (67%+) = lock eligible with documentation
- Majority (50%+) = requires additional validation
- Below majority = flag for resolution

Output format: JSON with structured consensus analysis.`;

/**
 * Find consensus across planning branches
 */
export const findConsensus = async (branchAnalyses, context = {}) => {
  const prompt = `
    Find consensus points across these planning branch analyses.
    
    Branch Analyses:
    ${JSON.stringify(branchAnalyses, null, 2)}
    
    Context: ${JSON.stringify(context)}
    
    Identify what ALL branches agree on, what most agree on, and where they diverge.
    
    Provide your analysis as JSON:
    {
      "unanimousSteps": [
        {
          "step": "description of unanimous step",
          "confidence": 1.0,
          "branches": ["all branch names"],
          "eligibleForLock": true,
          "lockPriority": "high|medium|low"
        }
      ],
      "supermajoritySteps": [
        {
          "step": "description",
          "agreementPercentage": 0.67,
          "agreeingBranches": ["branch names"],
          "disagreeingBranches": ["branch names"],
          "eligibleForLock": true,
          "lockPriority": "medium"
        }
      ],
      "majoritySteps": [
        {
          "step": "description",
          "agreementPercentage": 0.55,
          "agreeingBranches": [],
          "disagreeingBranches": [],
          "requiresValidation": true
        }
      ],
      "divergentSteps": [
        {
          "step": "description",
          "agreementPercentage": 0.45,
          "conflictDescription": "what the conflict is",
          "resolutionRequired": true
        }
      ],
      "consensusScore": 0.0-1.0,
      "groundTruthCandidates": ["step identifiers eligible for lock"],
      "recommendation": "overall recommendation"
    }
  `;

  try {
    const response = await bytezClient.runInference(CONSENSUS_FINDER_CONFIG.model, {
      systemPrompt: CONSENSUS_FINDER_PROMPT,
      userPrompt: prompt,
      temperature: CONSENSUS_FINDER_CONFIG.temperature
    });

    let parsed = {};
    if (response?.output) {
      try {
        parsed = typeof response.output === 'string'
          ? JSON.parse(response.output)
          : response.output;
      } catch (e) {
        console.warn('Failed to parse Consensus Finder response');
      }
    }

    return {
      component: 'Consensus Finder',
      timestamp: new Date().toISOString(),
      stateless: true,
      model: CONSENSUS_FINDER_CONFIG.model,
      ...parsed
    };
  } catch (error) {
    return {
      component: 'Consensus Finder',
      error: error.message,
      consensusScore: 0
    };
  }
};

/**
 * Quick consensus check - lightweight version
 */
export const quickConsensusCheck = async (branches) => {
  const decisions = branches.map(b => b.decision);
  const approvals = decisions.filter(d => d === 'approve').length;
  const approvalRate = approvals / decisions.length;

  return {
    hasUnanimous: approvalRate >= CONSENSUS_FINDER_CONFIG.unanimousThreshold,
    hasSupermajority: approvalRate >= CONSENSUS_FINDER_CONFIG.consensusThreshold,
    approvalRate,
    approvalCount: approvals,
    totalBranches: decisions.length,
    eligibleForGroundTruth: approvalRate >= CONSENSUS_FINDER_CONFIG.minConsensusForLock
  };
};

/**
 * Identify ground truth lock candidates
 */
export const identifyGroundTruthCandidates = (consensusResults) => {
  const candidates = [];

  if (consensusResults.unanimousSteps) {
    for (const step of consensusResults.unanimousSteps) {
      if (step.eligibleForLock) {
        candidates.push({
          ...step,
          lockType: 'unanimous',
          certainty: 1.0
        });
      }
    }
  }

  if (consensusResults.supermajoritySteps) {
    for (const step of consensusResults.supermajoritySteps) {
      if (step.eligibleForLock && step.agreementPercentage >= CONSENSUS_FINDER_CONFIG.minConsensusForLock) {
        candidates.push({
          ...step,
          lockType: 'supermajority',
          certainty: step.agreementPercentage
        });
      }
    }
  }

  return candidates.sort((a, b) => b.certainty - a.certainty);
};

/**
 * Calculate overall consensus percentage
 */
export const calculateConsensusPercentage = (branchAnalyses) => {
  if (!branchAnalyses || branchAnalyses.length === 0) return 0;

  const approvals = branchAnalyses.filter(b => b.decision === 'approve').length;
  return approvals / branchAnalyses.length;
};

/**
 * Check if consensus meets threshold for speculative research trigger
 */
export const shouldTriggerSpeculative = (consensusPercentage, threshold = 0.60) => {
  return {
    shouldTrigger: consensusPercentage >= threshold,
    currentConsensus: consensusPercentage,
    threshold,
    message: consensusPercentage >= threshold 
      ? `Consensus ${(consensusPercentage * 100).toFixed(0)}% meets ${threshold * 100}% threshold - start speculative research`
      : `Consensus ${(consensusPercentage * 100).toFixed(0)}% below ${threshold * 100}% threshold`
  };
};

/**
 * Generate consensus summary
 */
export const generateConsensusSummary = (consensusResults) => {
  const {
    unanimousSteps = [],
    supermajoritySteps = [],
    majoritySteps = [],
    divergentSteps = [],
    consensusScore = 0
  } = consensusResults;

  let summary = `## Consensus Analysis\n\n`;
  summary += `**Overall Consensus Score:** ${(consensusScore * 100).toFixed(0)}%\n\n`;
  
  summary += `### Ground Truth Lock Candidates\n`;
  summary += `- **Unanimous Steps:** ${unanimousSteps.length}\n`;
  summary += `- **Supermajority Steps:** ${supermajoritySteps.length}\n\n`;
  
  summary += `### Agreement Levels\n`;
  summary += `- **Majority Steps:** ${majoritySteps.length}\n`;
  summary += `- **Divergent Steps:** ${divergentSteps.length}\n\n`;
  
  if (unanimousSteps.length > 0) {
    summary += `### Ready for Lock\n`;
    unanimousSteps.forEach((step, i) => {
      summary += `${i + 1}. ${step.step}\n`;
    });
  }

  if (divergentSteps.length > 0) {
    summary += `\n### Requires Resolution\n`;
    divergentSteps.slice(0, 5).forEach((step, i) => {
      summary += `${i + 1}. ${step.step}\n`;
    });
  }

  return summary;
};

export default {
  CONSENSUS_FINDER_CONFIG,
  findConsensus,
  quickConsensusCheck,
  identifyGroundTruthCandidates,
  calculateConsensusPercentage,
  shouldTriggerSpeculative,
  generateConsensusSummary
};