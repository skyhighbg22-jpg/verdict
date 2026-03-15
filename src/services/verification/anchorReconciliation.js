/**
 * Anchor Reconciliation System
 * Cross-check outputs against all prior anchors,
 * trigger Reconciliation debates with certainty-weighted conflict resolution
 */

import { ANCHOR_VERSIONS, EPISTEMIC_STATUS, TYPES } from '../types';
import { statePersistence } from './statePersistence';

/**
 * Anchor Configuration
 */
export const ANCHOR_CONFIG = {
  autoReconcile: true,
  reconcileThreshold: 0.2, // 20% difference triggers reconciliation
  certaintyWeightDecay: 0.1, // Decay for each conflict
  maxReconciliationDebates: 5
};

/**
 * Create an anchor from phase output
 */
export const createAnchor = (sessionId, version, phase, output, metadata = {}) => ({
  id: generateAnchorId(),
  sessionId,
  version,
  phase,
  output: serializeOutput(output),
  metadata,
  createdAt: new Date().toISOString(),
  certainty: metadata.certainty || 0.8,
  validationStatus: 'pending'
});

let anchorCounter = 0;
const generateAnchorId = () => {
  anchorCounter++;
  return `anchor_${Date.now()}_${anchorCounter}`;
};

/**
 * Serialize output for storage
 */
const serializeOutput = (output) => {
  if (typeof output === 'object') {
    return JSON.parse(JSON.stringify(output)); // Deep clone
  }
  return output;
};

/**
 * Compare two anchors for discrepancies
 */
const compareAnchors = (anchor1, anchor2) => {
  const differences = [];
  const similarities = [];

  // Compare phase outputs
  const output1 = anchor1.output || {};
  const output2 = anchor2.output || {};

  // Deep comparison of keys
  const allKeys = new Set([
    ...Object.keys(output1),
    ...Object.keys(output2)
  ]);

  for (const key of allKeys) {
    const val1 = output1[key];
    const val2 = output2[key];

    if (JSON.stringify(val1) !== JSON.stringify(val2)) {
      differences.push({
        key,
        value1: val1,
        value2: val2,
        severity: calculateSeverityDifference(val1, val2)
      });
    } else {
      similarities.push(key);
    }
  }

  return {
    differences,
    similarityCount: similarities.length,
    totalKeys: allKeys.size,
    similarityRatio: allKeys.size > 0 ? similarities.length / allKeys.size : 1,
    hasSignificantConflict: differences.some(d => d.severity === 'high')
  };
};

/**
 * Calculate severity of difference
 */
const calculateSeverityDifference = (val1, val2) => {
  // Numeric differences
  if (typeof val1 === 'number' && typeof val2 === 'number') {
    const diff = Math.abs(val1 - val2);
    if (diff > 5) return 'high';
    if (diff > 2) return 'medium';
    return 'low';
  }

  // Boolean differences
  if (typeof val1 === 'boolean' || typeof val2 === 'boolean') {
    return 'high';
  }

  // String/Object differences
  if (typeof val1 !== typeof val2) {
    return 'high';
  }

  return 'medium';
};

/**
 * Main Anchor Audit function
 */
export const runAnchorAudit = async (sessionId, currentOutput, currentPhase) => {
  // Get all prior anchors
  const priorAnchors = await statePersistence.getAnchors(sessionId);
  
  const auditResults = {
    currentAnchor: null,
    priorAnchors: priorAnchors.length,
    comparisons: [],
    discrepancies: [],
    reconciliationNeeded: false,
    recommendations: []
  };

  // Create current anchor
  const currentVersion = ANCHOR_VERSIONS[Math.min(priorAnchors.length, ANCHOR_VERSIONS.length - 1)];
  const currentAnchor = createAnchor(
    sessionId,
    currentVersion,
    currentPhase,
    currentOutput,
    { certainty: currentOutput.certainty || 0.8 }
  );

  auditResults.currentAnchor = currentAnchor;

  // Compare with all prior anchors
  for (const priorAnchor of priorAnchors) {
    const comparison = compareAnchors(currentAnchor, priorAnchor);
    
    auditResults.comparisons.push({
      priorVersion: priorAnchor.version,
      priorPhase: priorAnchor.phase,
      ...comparison
    });

    // Track discrepancies
    if (comparison.hasSignificantConflict) {
      auditResults.discrepancies.push({
        anchor1: priorAnchor.version,
        anchor2: currentAnchor.version,
        differences: comparison.differences,
        severity: 'high'
      });
    }
  }

  // Determine if reconciliation is needed
  const highSeverityConflicts = auditResults.discrepancies.filter(
    d => d.severity === 'high'
  );

  auditResults.reconciliationNeeded = 
    highSeverityConflicts.length > 0 ||
    auditResults.comparisons.some(c => c.similarityRatio < (1 - ANCHOR_CONFIG.reconcileThreshold));

  // Generate recommendations
  if (auditResults.reconciliationNeeded) {
    auditResults.recommendations.push({
      priority: 'high',
      action: 'Run Anchor Reconciliation',
      reason: `Found ${highSeverityConflicts.length} high-severity conflicts`
    });
  }

  // Check for retrogression (output quality degradation)
  if (priorAnchors.length > 0) {
    const avgPriorCertainty = priorAnchors.reduce((sum, a) => sum + (a.certainty || 0), 0) / priorAnchors.length;
    if (currentAnchor.certainty < avgPriorCertainty - 0.2) {
      auditResults.recommendations.push({
        priority: 'medium',
        action: 'Investigate certainty degradation',
        reason: `Certainty dropped from ${avgPriorCertainty.toFixed(2)} to ${currentAnchor.certainty}`
      });
    }
  }

  // Save current anchor
  await statePersistence.saveAnchor(
    sessionId,
    currentAnchor.version,
    currentAnchor.phase,
    currentAnchor.output,
    currentAnchor.metadata
  );

  return auditResults;
};

/**
 * Anchor Reconciliation Debate
 */
export const createReconciliationDebate = async (sessionId, conflict) => {
  const debate = {
    id: generateDebateId(),
    sessionId,
    conflictingAnchors: [conflict.anchor1, conflict.anchor2],
    issue: conflict.differences.map(d => d.key).join(', '),
    arguments: [],
    votes: [],
    status: 'active',
    createdAt: new Date().toISOString()
  };

  return debate;
};

let debateCounter = 0;
const generateDebateId = () => {
  debateCounter++;
  return `debate_${Date.now()}_${debateCounter}`;
};

/**
 * Add argument to debate
 */
export const addDebateArgument = (debate, agentId, agentRole, position, reasoning, certaintyScore) => {
  const argument = {
    id: generateArgumentId(),
    agentId,
    agentRole,
    position, // 'support_anchor1' | 'support_anchor2' | 'neutral'
    reasoning,
    certaintyScore: Math.max(1, Math.min(10, certaintyScore)),
    weight: calculateArgumentWeight(certaintyScore),
    timestamp: new Date().toISOString()
  };

  debate.arguments.push(argument);
  return argument;
};

let argumentCounter = 0;
const generateArgumentId = () => {
  argumentCounter++;
  return `arg_${Date.now()}_${argumentCounter}`;
};

/**
 * Calculate argument weight based on certainty
 */
const calculateArgumentWeight = (certaintyScore) => {
  // Certainty 1-10 maps to weight 0.5-2.0
  return 0.5 + (certaintyScore / 10) * 1.5;
};

/**
 * Resolve debate with certainty-weighted voting
 */
export const resolveReconciliationDebate = (debate) => {
  // Group arguments by position
  const anchor1Supporters = debate.arguments.filter(a => a.position === 'support_anchor1');
  const anchor2Supporters = debate.arguments.filter(a => a.position === 'support_anchor2');
  const neutrals = debate.arguments.filter(a => a.position === 'neutral');

  // Calculate weighted votes
  const anchor1Weight = anchor1Supporters.reduce((sum, a) => sum + a.weight, 0);
  const anchor2Weight = anchor2Supporters.reduce((sum, a) => sum + a.weight, 0);
  const neutralWeight = neutrals.reduce((sum, a) => sum + a.weight, 0);

  const totalWeight = anchor1Weight + anchor2Weight + neutralWeight;

  // Determine winner
  let winner;
  if (anchor1Weight > anchor2Weight && anchor1Weight > neutralWeight) {
    winner = debate.conflictingAnchors[0];
  } else if (anchor2Weight > anchor1Weight && anchor2Weight > neutralWeight) {
    winner = debate.conflictingAnchors[1];
  } else {
    winner = 'merge'; // Need to merge conflicting values
  }

  // Calculate confidence in decision
  const maxWeight = Math.max(anchor1Weight, anchor2Weight);
  const confidence = totalWeight > 0 ? maxWeight / totalWeight : 0.5;

  const resolution = {
    debateId: debate.id,
    winner,
    confidence,
    weightedVote: {
      anchor1: anchor1Weight,
      anchor2: anchor2Weight,
      neutral: neutralWeight
    },
    argumentCount: debate.arguments.length,
    resolvedAt: new Date().toISOString()
  };

  debate.status = 'resolved';
  debate.resolution = resolution;

  return resolution;
};

/**
 * Run full reconciliation process
 */
export const runReconciliation = async (sessionId, auditResults, planningBranches = []) => {
  if (!auditResults.reconciliationNeeded) {
    return {
      success: true,
      reconciliationPerformed: false,
      message: 'No reconciliation needed'
    };
  }

  const debates = [];

  // Create debates for each high-severity conflict
  for (const conflict of auditResults.discrepancies) {
    const debate = await createReconciliationDebate(sessionId, conflict);

    // Add arguments from planning branches
    for (const branch of planningBranches) {
      // Determine position based on branch analysis
      const position = determineBranchPosition(branch, conflict);
      addDebateArgument(
        debate,
        branch.branchId,
        branch.role,
        position,
        branch.reasoning || branch.recommendations?.join('; ') || '',
        branch.certaintyScore || 5
      );
    }

    // Resolve debate
    const resolution = resolveReconciliationDebate(debate);
    debates.push({ debate, resolution });
  }

  // Generate final recommendation
  const winners = debates.map(d => d.resolution.winner);
  const mergeRequired = winners.includes('merge');

  return {
    success: true,
    reconciliationPerformed: true,
    debates: debates.length,
    mergeRequired,
    recommendations: generateReconciliationRecommendations(debates, mergeRequired),
    resolvedAt: new Date().toISOString()
  };
};

/**
 * Determine branch position in debate
 */
const determineBranchPosition = (branch, conflict) => {
  // Check branch recommendations for relevant keys
  const conflictKeys = conflict.differences.map(d => d.key);
  
  const relevantRecs = branch.recommendations?.filter(r => 
    conflictKeys.some(k => r.toLowerCase().includes(k.toLowerCase()))
  ) || [];

  if (relevantRecs.length > 0) {
    return branch.decision === 'reject' ? 'support_anchor1' : 'support_anchor2';
  }

  return 'neutral';
};

/**
 * Generate reconciliation recommendations
 */
const generateReconciliationRecommendations = (debates, mergeRequired) => {
  const recommendations = [];

  if (mergeRequired) {
    recommendations.push({
      priority: 'high',
      action: 'Manual merge required',
      reason: 'Conflicting values require manual resolution'
    });
  }

  const resolvedCount = debates.filter(d => d.debate.status === 'resolved').length;
  recommendations.push({
    priority: 'medium',
    action: `${resolvedCount} debates resolved`,
    reason: `${resolvedCount} of ${debates.length} conflicts resolved through voting`
  });

  return recommendations;
};

/**
 * Get anchor history for display
 */
export const getAnchorHistory = async (sessionId) => {
  const anchors = await statePersistence.getAnchors(sessionId);
  
  return anchors.map(anchor => ({
    version: anchor.version,
    phase: anchor.phase,
    certainty: anchor.certainty,
    createdAt: anchor.createdAt,
    validationStatus: anchor.validationStatus
  }));
};

export default {
  ANCHOR_CONFIG,
  runAnchorAudit,
  runReconciliation,
  getAnchorHistory,
  createAnchor,
  createReconciliationDebate,
  resolveReconciliationDebate
};
