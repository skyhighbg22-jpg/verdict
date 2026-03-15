/**
 * Speculative Research Branching
 * Start Phase 3 (Research) early when Planning reaches 60% consensus
 */

import { PHASES } from '../types';

/**
 * Speculative Research Configuration
 */
export const SPECULATIVE_CONFIG = {
  consensusThreshold: 0.60, // 60% consensus to start speculative research
  confidenceThreshold: 0.5, // Minimum confidence for speculative work
  parallelExecution: true,
  maxSpeculativeBranches: 3,
  speculativeTTL: 300000, // 5 minutes TTL for speculative results
  autoAbandonOnConflict: true,
  abandonThreshold: 0.3 // Abandon if consensus drops below 30%
};

/**
 * Speculative branch status
 */
export const SPECULATIVE_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  VALIDATED: 'validated',
  ABANDONED: 'abandoned',
  MERGED: 'merged'
};

/**
 * Create speculative branch
 */
export const createSpeculativeBranch = (parentPhase, taskId, hypothesis, context) => ({
  id: generateSpeculativeId(),
  parentPhase,
  taskId,
  hypothesis,
  context,
  status: SPECULATIVE_STATUS.PENDING,
  createdAt: new Date().toISOString(),
  validatedAt: null,
  confidence: 0,
  results: null,
  consensusAtCreation: context.consensusPercentage || 0
});

let speculativeCounter = 0;
const generateSpeculativeId = () => {
  speculativeCounter++;
  return `spec_${Date.now()}_${speculativeCounter}`;
};

/**
 * Check if speculative research should start
 */
export const shouldStartSpeculativeResearch = (planningResult, currentPhase) => {
  // Can only start from Planning phase
  if (currentPhase !== PHASES.PLANNING && currentPhase !== 'Planning') {
    return {
      shouldStart: false,
      reason: 'Can only start speculative research from Planning phase'
    };
  }

  const { consensusPercentage, branches, antitheticalActivated } = planningResult;

  // Check consensus threshold
  if (consensusPercentage < SPECULATIVE_CONFIG.consensusThreshold) {
    return {
      shouldStart: false,
      reason: `Consensus ${(consensusPercentage * 100).toFixed(0)}% below threshold ${(SPECULATIVE_CONFIG.consensusThreshold * 100).toFixed(0)}%`,
      consensusPercentage
    };
  }

  // Check confidence
  const avgConfidence = branches.reduce((sum, b) => sum + b.certaintyScore, 0) / branches.length;
  if (avgConfidence < SPECULATIVE_CONFIG.confidenceThreshold) {
    return {
      shouldStart: false,
      reason: `Average confidence ${avgConfidence.toFixed(1)} below threshold ${SPECULATIVE_CONFIG.confidenceThreshold}`,
      consensusPercentage
    };
  }

  // Check if antithetical branch found issues
  if (antitheticalActivated) {
    const antithetical = branches.find(b => b.branchId === 'Antithetical');
    if (antithetical && antithetical.decision === 'reject') {
      return {
        shouldStart: false,
        reason: 'Antithetical branch rejected the plan',
        consensusPercentage
      };
    }
  }

  return {
    shouldStart: true,
    reason: 'Planning consensus meets threshold',
    consensusPercentage,
    avgConfidence,
    recommendation: 'Start speculative research branches'
  };
};

/**
 * Manage speculative branches
 */
class SpeculativeResearchManager {
  constructor() {
    this.branches = new Map();
    this.results = new Map();
  }

  /**
   * Create speculative branches based on planning results
   */
  createBranches(planningResult, researchTasks) {
    const { shouldStart, consensusPercentage, avgConfidence } = 
      shouldStartSpeculativeResearch(planningResult, PHASES.PLANNING);

    if (!shouldStart) {
      return {
        created: false,
        branches: [],
        message: shouldStart.reason
      };
    }

    const branches = [];

    // Create speculative branches for key research tasks
    const keyTasks = researchTasks.slice(0, SPECULATIVE_CONFIG.maxSpeculativeBranches);

    for (const task of keyTasks) {
      const branch = createSpeculativeBranch(
        PHASES.PLANNING,
        task.id,
        `Research: ${task.title}`,
        {
          consensusPercentage,
          confidence: avgConfidence,
          planningOutput: planningResult
        }
      );

      branches.push(branch);
      this.branches.set(branch.id, branch);
    }

    return {
      created: true,
      branches,
      message: `Created ${branches.length} speculative research branches`,
      consensusAtCreation: consensusPercentage
    };
  }

  /**
   * Validate speculative branch results
   */
  validateBranch(branchId, results, consensusUpdate) {
    const branch = this.branches.get(branchId);
    if (!branch) {
      throw new Error(`Speculative branch ${branchId} not found`);
    }

    // Update results
    branch.results = results;
    branch.validatedAt = new Date().toISOString();

    // Check consensus
    if (consensusUpdate < SPECULATIVE_CONFIG.abandonThreshold) {
      branch.status = SPECULATIVE_STATUS.ABANDONED;
      return {
        validated: false,
        reason: 'Consensus dropped below threshold',
        branch
      };
    }

    // Validate results
    if (results.confidence >= SPECULATIVE_CONFIG.confidenceThreshold) {
      branch.status = SPECULATIVE_STATUS.VALIDATED;
      branch.confidence = results.confidence;
    } else {
      branch.status = SPECULATIVE_STATUS.ABANDONED;
    }

    return {
      validated: branch.status === SPECULATIVE_STATUS.VALIDATED,
      branch
    };
  }

  /**
   * Merge validated speculative results
   */
  mergeResults(validatedBranches) {
    const merged = {
      research: [],
      findings: [],
      confidence: 0,
      sourceCount: validatedBranches.length
    };

    for (const branch of validatedBranches) {
      if (branch.results) {
        merged.research.push(...(branch.results.research || []));
        merged.findings.push(...(branch.results.findings || []));
        merged.confidence += branch.results.confidence || 0;
      }
    }

    merged.confidence /= validatedBranches.length;

    return merged;
  }

  /**
   * Get active speculative branches
   */
  getActiveBranches() {
    return Array.from(this.branches.values())
      .filter(b => b.status === SPECULATIVE_STATUS.RUNNING || b.status === SPECULATIVE_STATUS.PENDING);
  }

  /**
   * Get validated branches
   */
  getValidatedBranches() {
    return Array.from(this.branches.values())
      .filter(b => b.status === SPECULATIVE_STATUS.VALIDATED);
  }

  /**
   * Clear abandoned branches
   */
  cleanup() {
    let cleaned = 0;
    for (const [id, branch] of this.branches) {
      if (branch.status === SPECULATIVE_STATUS.ABANDONED) {
        this.branches.delete(id);
        cleaned++;
      }
    }
    return cleaned;
  }
}

// Singleton instance
export const speculativeManager = new SpeculativeResearchManager();

export default {
  SPECULATIVE_CONFIG,
  SPECULATIVE_STATUS,
  shouldStartSpeculativeResearch,
  speculativeManager
};
