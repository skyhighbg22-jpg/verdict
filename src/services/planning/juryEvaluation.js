/**
 * Jury Evaluation System
 * MIRA-weighted voting, Certainty Scores (1-10), Supermajority calculations
 */

import { PLANNING_BRANCHES } from '../types';

/**
 * Jury Configuration
 */
export const JURY_CONFIG = {
  supermajorityThreshold: 0.67, // 67% for supermajority
  unanimousThreshold: 1.0, // 100% for unanimous
  minCertaintyForDecision: 3,
  certaintyWeightMultiplier: 1.0,
  deadlockRetryAttempts: 3,
  minVotesForQuorum: 2
};

/**
 * Certainty score descriptions
 */
export const CERTAINTY_DESCRIPTIONS = {
  1: 'Very uncertain - essentially guessing',
  2: 'Highly uncertain - low confidence in decision',
  3: 'Uncertain - significant doubts',
  4: 'Somewhat uncertain - leaning but not confident',
  5: 'Neutral - equal chance either way',
  6: 'Somewhat certain - moderate confidence',
  7: 'Confident - good evidence for decision',
  8: 'Highly confident - strong evidence',
  9: 'Very confident - nearly certain',
  10: 'Certain - absolute confidence, no doubt'
};

/**
 * Create a jury vote
 */
export const createJuryVote = (agentId, agentRole, decision, certaintyScore, reasoning = '') => ({
  agentId,
  agentRole,
  decision,
  certaintyScore: Math.max(1, Math.min(10, certaintyScore)),
  reasoning,
  timestamp: new Date().toISOString(),
  weight: 1.0 // Will be adjusted by MIRA
});

/**
 * Apply MIRA weight to vote based on calibration
 */
export const applyMiraWeight = (vote, calibrationScore) => {
  let weightMultiplier = 1.0;
  
  // Adjust weight based on calibration
  if (calibrationScore >= 0.9) {
    weightMultiplier = 1.5; // Highly calibrated - increase influence
  } else if (calibrationScore >= 0.8) {
    weightMultiplier = 1.25;
  } else if (calibrationScore >= 0.7) {
    weightMultiplier = 1.0; // Normal
  } else if (calibrationScore >= 0.5) {
    weightMultiplier = 0.75; // Poor calibration - reduce influence
  } else {
    weightMultiplier = 0.5; // Very poor - significantly reduce
  }

  return {
    ...vote,
    weight: vote.weight * weightMultiplier,
    calibrationScore,
    weightAdjustment: weightMultiplier - 1.0
  };
};

/**
 * Calculate supermajority threshold
 */
export const calculateSupermajority = (totalVotes) => {
  return Math.ceil(totalVotes * JURY_CONFIG.supermajorityThreshold);
};

/**
 * Check if decision meets supermajority
 */
export const hasSupermajority = (votes, decision) => {
  const totalWeight = votes.reduce((sum, v) => sum + v.weight, 0);
  const decisionWeight = votes
    .filter(v => v.decision === decision)
    .reduce((sum, v) => sum + v.weight, 0);
  
  return (decisionWeight / totalWeight) >= JURY_CONFIG.supermajorityThreshold;
};

/**
 * Check if decision is unanimous
 */
export const isUnanimous = (votes, decision) => {
  const totalWeight = votes.reduce((sum, v) => sum + v.weight, 0);
  const decisionWeight = votes
    .filter(v => v.decision === decision)
    .reduce((sum, v) => sum + v.weight, 0);
  
  return (decisionWeight / totalWeight) >= JURY_CONFIG.unanimousThreshold;
};

/**
 * Main Jury evaluation function
 */
export const runJuryEvaluation = (votes, options = {}) => {
  const {
    calibrationScores = {},
    requireSupermajority = true,
    allowDeadlock = false
  } = options;

  // Apply MIRA weights to each vote
  const weightedVotes = votes.map(vote => {
    const calibrationScore = calibrationScores[vote.agentId] || 0.7;
    return applyMiraWeight(vote, calibrationScore);
  });

  // Calculate totals
  const totalWeight = weightedVotes.reduce((sum, v) => sum + v.weight, 0);
  const approvals = weightedVotes.filter(v => v.decision === 'approve');
  const rejections = weightedVotes.filter(v => v.decision === 'reject');
  const holds = weightedVotes.filter(v => v.decision === 'hold');

  const approvalWeight = approvals.reduce((sum, v) => sum + v.weight, 0);
  const rejectionWeight = rejections.reduce((sum, v) => sum + v.weight, 0);
  const holdWeight = holds.reduce((sum, v) => sum + v.weight, 0);

  const approvalRate = totalWeight > 0 ? approvalWeight / totalWeight : 0;
  const rejectionRate = totalWeight > 0 ? rejectionWeight / totalWeight : 0;
  const holdRate = totalWeight > 0 ? holdWeight / totalWeight : 0;

  // Determine consensus level
  let consensusLevel = 'majority';
  if (isUnanimous(weightedVotes, 'approve')) {
    consensusLevel = 'unanimous';
  } else if (hasSupermajority(weightedVotes, 'approve')) {
    consensusLevel = 'supermajority';
  } else if (hasSupermajority(weightedVotes, 'reject')) {
    consensusLevel = 'supermajority_reject';
  } else if (Math.abs(approvalWeight - rejectionWeight) < totalWeight * 0.1) {
    consensusLevel = 'deadlock';
  }

  // Calculate average certainty
  const averageCertainty = weightedVotes.reduce((sum, v) => sum + v.certaintyScore, 0) / weightedVotes.length;

  // Determine final decision
  let finalDecision = 'hold';
  if (consensusLevel === 'unanimous' || (consensusLevel === 'supermajority' && !requireSupermajority)) {
    finalDecision = 'approve';
  } else if (consensusLevel === 'supermajority_reject') {
    finalDecision = 'reject';
  } else if (consensusLevel === 'deadlock' && !allowDeadlock) {
    finalDecision = 'hold';
  } else if (holdRate > 0.5) {
    finalDecision = 'hold';
  } else if (approvalRate > rejectionRate) {
    finalDecision = 'approve';
  } else if (rejectionRate > approvalRate) {
    finalDecision = 'reject';
  }

  // Check if we have quorum
  const hasQuorum = weightedVotes.length >= JURY_CONFIG.minVotesForQuorum;

  // Generate weight adjustments report
  const weightAdjustments = {};
  weightedVotes.forEach(v => {
    weightAdjustments[v.agentId] = {
      originalWeight: 1.0,
      finalWeight: v.weight,
      adjustment: v.weightAdjustment,
      calibrationScore: v.calibrationScore
    };
  });

  // Build result
  const result = {
    finalDecision,
    approvalRate,
    consensusLevel,
    votes: weightedVotes,
    averageCertainty,
    supermajorityThreshold: JURY_CONFIG.supermajorityThreshold,
    weightAdjustments,
    hasQuorum,
    metadata: {
      totalVotes: weightedVotes.length,
      approvalWeight,
      rejectionWeight,
      holdWeight,
      totalWeight,
      evaluatedAt: new Date().toISOString()
    }
  };

  // Add breakdown
  result.breakdown = {
    approvals: approvals.map(v => ({
      agentId: v.agentId,
      agentRole: v.agentRole,
      certaintyScore: v.certaintyScore,
      weight: v.weight,
      reasoning: v.reasoning
    })),
    rejections: rejections.map(v => ({
      agentId: v.agentId,
      agentRole: v.agentRole,
      certaintyScore: v.certaintyScore,
      weight: v.weight,
      reasoning: v.reasoning
    })),
    holds: holds.map(v => ({
      agentId: v.agentId,
      agentRole: v.agentRole,
      certaintyScore: v.certaintyScore,
      weight: v.weight,
      reasoning: v.reasoning
    }))
  };

  return result;
};

/**
 * Create votes from planning branch results
 */
export const createVotesFromBranches = (branchResults, planningResult) => {
  return branchResults.map(branch => createJuryVote(
    branch.branchId,
    branch.role,
    branch.decision,
    branch.certaintyScore,
    branch.recommendations.join('; ')
  ));
};

/**
 * Evaluate with certainty-weighted conflict resolution
 */
export const resolveWithCertaintyWeighting = (conflictingVotes) => {
  if (conflictingVotes.length < 2) {
    return conflictingVotes;
  }

  // Sort by weighted certainty (certainty * weight)
  const weightedVotes = conflictingVotes.map(v => ({
    ...v,
    weightedCertainty: v.certaintyScore * v.weight
  }));

  weightedVotes.sort((a, b) => b.weightedCertainty - a.weightedCertainty);

  return weightedVotes;
};

/**
 * Check if decision can proceed based on certainty
 */
export const canProceedWithDecision = (juryResult) => {
  const { finalDecision, averageCertainty, hasQuorum } = juryResult;
  
  if (!hasQuorum) {
    return { canProceed: false, reason: 'Insufficient quorum' };
  }

  if (finalDecision === 'hold') {
    return { canProceed: false, reason: 'Jury deadlocked' };
  }

  if (averageCertainty < JURY_CONFIG.minCertaintyForDecision) {
    return { 
      canProceed: false, 
      reason: `Average certainty ${averageCertainty} below minimum ${JURY_CONFIG.minCertaintyForDecision}` 
    };
  }

  if (juryResult.consensusLevel === 'deadlock') {
    return { canProceed: false, reason: 'Jury unable to reach decision' };
  }

  return { canProceed: true, reason: 'Decision meets all criteria' };
};

/**
 * Generate human-readable jury summary
 */
export const generateJurySummary = (juryResult) => {
  const { finalDecision, consensusLevel, averageCertainty, breakdown } = juryResult;
  
  const approvalCount = breakdown.approvals.length;
  const rejectionCount = breakdown.rejections.length;
  const holdCount = breakdown.holds.length;
  const total = approvalCount + rejectionCount + holdCount;
  
  let summary = `Jury Decision: ${finalDecision.toUpperCase()}\n`;
  summary += `Consensus: ${consensusLevel} (${(juryResult.approvalRate * 100).toFixed(0)}% approval)\n`;
  summary += `Votes: ${approvalCount} approve, ${rejectionCount} reject, ${holdCount} hold\n`;
  summary += `Average Certainty: ${averageCertainty.toFixed(1)}/10\n`;
  summary += `Certainty: ${CERTAINTY_DESCRIPTIONS[Math.round(averageCertainty)] || ''}\n`;
  
  if (breakdown.approvals.length > 0) {
    summary += `\nApprovals:\n`;
    breakdown.approvals.forEach(a => {
      summary += `  - ${a.agentRole}: Certainty ${a.certaintyScore}/10\n`;
    });
  }
  
  if (breakdown.rejections.length > 0) {
    summary += `\nRejections:\n`;
    breakdown.rejections.forEach(r => {
      summary += `  - ${r.agentRole}: Certainty ${r.certaintyScore}/10\n`;
    });
  }

  return summary;
};

/**
 * Check if Early Exit is possible (all unanimous score 10)
 * If GPT-5.4 Pro, Claude Opus 4.6, and Gemini 3.1 Pro all score 10 unanimously,
 * skip remaining Jury calls for cost optimization
 */
export const checkJuryEarlyExit = (votes, processedCount, totalExpected) => {
  const PRIMARY_MODELS = ['gpt-5.4-pro', 'claude-opus-4.6', 'gemini-3.1-pro'];
  
  if (processedCount < PRIMARY_MODELS.length) {
    return {
      canEarlyExit: false,
      reason: 'Not enough primary model votes yet'
    };
  }

  const primaryVotes = votes.filter(v => 
    PRIMARY_MODELS.some(model => v.agentId?.toLowerCase().includes(model.replace(/-/g, '')))
  );

  if (primaryVotes.length < PRIMARY_MODELS.length) {
    return {
      canEarlyExit: false,
      reason: 'Not all primary models have voted'
    };
  }

  const allUnamimouslyTen = primaryVotes.every(v => 
    v.decision === 'approve' && v.certaintyScore === 10
  );

  if (allUnamimouslyTen) {
    return {
      canEarlyExit: true,
      reason: 'All primary models unanimously approve with certainty 10',
      savedVotes: totalExpected - processedCount,
      earlyExitVotes: primaryVotes,
      confidence: 1.0,
      costSavings: calculateCostSavings(totalExpected - processedCount)
    };
  }

  const allUnanimousReject = primaryVotes.every(v => 
    v.decision === 'reject' && v.certaintyScore >= 9
  );

  if (allUnanimousReject) {
    return {
      canEarlyExit: true,
      reason: 'All primary models unanimously reject with high certainty',
      savedVotes: totalExpected - processedCount,
      earlyExitVotes: primaryVotes,
      confidence: 1.0,
      costSavings: calculateCostSavings(totalExpected - processedCount)
    };
  }

  const approvalRate = primaryVotes.filter(v => v.decision === 'approve').length / primaryVotes.length;
  const avgCertainty = primaryVotes.reduce((sum, v) => sum + v.certaintyScore, 0) / primaryVotes.length;

  if (approvalRate === 1 && avgCertainty >= 9) {
    return {
      canEarlyExit: true,
      reason: 'Unanimous approval with high certainty from primary models',
      savedVotes: totalExpected - processedCount,
      earlyExitVotes: primaryVotes,
      confidence: avgCertainty / 10,
      costSavings: calculateCostSavings(totalExpected - processedCount)
    };
  }

  return {
    canEarlyExit: false,
    reason: 'Primary models not in unanimous high-certainty agreement',
    approvalRate,
    avgCertainty
  };
};

/**
 * Calculate estimated cost savings from early exit
 */
const calculateCostSavings = (savedVotes) => {
  const COST_PER_VOTE = {
    'gpt-5.4-pro': 0.03,
    'claude-opus-4.6': 0.015,
    'gemini-3.1-pro': 0.01,
    'grok-4.2': 0.02,
    'default': 0.02
  };

  let estimatedSavings = savedVotes * COST_PER_VOTE['default'];
  
  return {
    estimatedSavings: estimatedSavings.toFixed(4),
    currency: 'USD',
    savedVotes,
    percentage: savedVotes > 0 ? ((savedVotes / (savedVotes + PRIMARY_MODELS_COUNT)) * 100).toFixed(1) : 0
  };
};

const PRIMARY_MODELS_COUNT = 3;

/**
 * Run Jury with early exit optimization
 */
export const runJuryEvaluationWithEarlyExit = async (voteGenerators, options = {}) => {
  const {
    calibrationScores = {},
    requireSupermajority = true,
    allowDeadlock = false,
    totalExpectedVotes = voteGenerators.length,
    primaryModels = ['gpt-5.4-pro', 'claude-opus-4.6', 'gemini-3.1-pro']
  } = options;

  const votes = [];
  let earlyExitResult = null;

  const primaryModelGenerators = voteGenerators.filter((gen, i) => {
    const model = gen.modelId || gen.agentId || `model_${i}`;
    return primaryModels.some(pm => model.toLowerCase().includes(pm.replace(/-/g, '')));
  });

  const primaryCount = Math.min(primaryModelGenerators.length, primaryModels.length);
  
  for (let i = 0; i < voteGenerators.length; i++) {
    const generator = voteGenerators[i];
    
    let vote;
    if (typeof generator === 'function') {
      vote = await generator();
    } else {
      vote = generator;
    }
    
    const calibrationScore = calibrationScores[vote.agentId] || 0.7;
    const weightedVote = applyMiraWeight(vote, calibrationScore);
    votes.push(weightedVote);

    if (i >= primaryCount - 1) {
      earlyExitResult = checkJuryEarlyExit(votes, votes.length, totalExpectedVotes);
      
      if (earlyExitResult.canEarlyExit) {
        return {
          earlyExit: true,
          earlyExitResult,
          votes: weightedVote,
          finalDecision: votes.every(v => v.decision === 'approve') ? 'approve' : 'reject',
          approvalRate: votes.filter(v => v.decision === 'approve').length / votes.length,
          consensusLevel: 'unanimous',
          averageCertainty: votes.reduce((sum, v) => sum + v.certaintyScore, 0) / votes.length,
          weightAdjustments: {},
          hasQuorum: votes.length >= JURY_CONFIG.minVotesForQuorum,
          savedVotes: totalExpectedVotes - votes.length,
          metadata: {
            completedAt: new Date().toISOString(),
            earlyExit: true,
            earlyExitReason: earlyExitResult.reason,
            costSavings: earlyExitResult.costSavings
          }
        };
      }
    }
  }

  return runJuryEvaluation(votes, {
    calibrationScores,
    requireSupermajority,
    allowDeadlock
  });
};

export default {
  JURY_CONFIG,
  CERTAINTY_DESCRIPTIONS,
  createJuryVote,
  applyMiraWeight,
  runJuryEvaluation,
  createVotesFromBranches,
  resolveWithCertaintyWeighting,
  canProceedWithDecision,
  generateJurySummary,
  calculateSupermajority,
  hasSupermajority,
  isUnanimous
};
