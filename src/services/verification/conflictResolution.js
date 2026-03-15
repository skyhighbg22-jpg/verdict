/**
 * Certainty-Weighted Conflict Resolution
 * For GEL updates - resolves conflicts between new findings and existing entries
 * 
 * Rules:
 * - New Score 9-10 vs existing Score <=5: auto-update
 * - Scores within 3 points: full Anchor Reconciliation debate
 * - Only dual-provider-confirmed entries can supersede automatically
 */

import { runReconciliation } from './anchorReconciliation';
import { gel } from './gel';
import { EPISTEMIC_STATUS } from '../types';

export const CONFLICT_RESOLUTION_CONFIG = {
  autoUpdateThreshold: 5,
  highCertaintyThreshold: 9,
  closeScoreRange: 3,
  dualProviderRequired: true,
  reconciliationTimeout: 30000
};

/**
 * Conflict types
 */
export const CONFLICT_TYPES = {
  CONTRADICTION: 'contradiction',
  PARTIAL_OVERLAP: 'partial_overlap',
  ADDITION: 'addition',
  CLARIFICATION: 'clarification',
  OUTDATED: 'outdated'
};

/**
 * Resolution strategies
 */
export const RESOLUTION_STRATEGIES = {
  AUTO_UPDATE: 'auto_update',
  RECONCILIATION_DEBATE: 'reconciliation_debate',
  KEEP_EXISTING: 'keep_existing',
  MERGE: 'merge',
  PENDING_REVIEW: 'pending_review'
};

/**
 * Resolve conflict between new finding and existing GEL entry
 */
export const resolveConflict = async (existingEntry, newFinding, context = {}) => {
  const {
    newCertainty = newFinding.certainty || 0.5,
    newSource = newFinding.source || 'unknown',
    newVerification = newFinding.verification || {},
    existingCertainty = existingEntry.certainty || 0,
    existingProviderConfirmed = existingEntry.providerConfirmed || false
  } = context;

  const conflictAnalysis = analyzeConflict(existingEntry, newFinding);
  
  const result = {
    existingEntry,
    newFinding,
    conflictType: conflictAnalysis.type,
    resolution: null,
    action: null,
    certaintyChange: 0,
    reasons: [],
    timestamp: new Date().toISOString()
  };

  if (newCertainty >= CONFLICT_RESOLUTION_CONFIG.highCertaintyThreshold && 
      existingCertainty <= CONFLICT_RESOLUTION_CONFIG.autoUpdateThreshold) {
    result.resolution = RESOLUTION_STRATEGIES.AUTO_UPDATE;
    result.action = 'update';
    result.certaintyChange = newCertainty - existingCertainty;
    result.reasons.push('New finding high certainty, existing low certainty - auto-update');
    return result;
  }

  const scoreDifference = Math.abs(newCertainty * 10 - existingCertainty * 10);
  if (scoreDifference <= CONFLICT_RESOLUTION_CONFIG.closeScoreRange) {
    result.resolution = RESOLUTION_STRATEGIES.RECONCILIATION_DEBATE;
    result.action = 'debate';
    result.reasons.push('Scores within close range - full reconciliation debate required');
    return result;
  }

  if (existingProviderConfirmed && newCertainty < existingCertainty) {
    result.resolution = RESOLUTION_STRATEGIES.KEEP_EXISTING;
    result.action = 'reject';
    result.reasons.push('Existing entry provider-confirmed with higher certainty');
    return result;
  }

  if (newCertainty > existingCertainty) {
    const newProviderConfirmed = isDualProviderConfirmed(newVerification);
    if (newProviderConfirmed) {
      result.resolution = RESOLUTION_STRATEGIES.AUTO_UPDATE;
      result.action = 'update';
      result.certaintyChange = newCertainty - existingCertainty;
      result.reasons.push('New finding dual-provider confirmed with higher certainty');
      return result;
    }
  }

  if (conflictAnalysis.type === CONFLICT_TYPES.ADDITION) {
    result.resolution = RESOLUTION_STRATEGIES.MERGE;
    result.action = 'merge';
    result.reasons.push('New finding is additive - merge with existing');
    return result;
  }

  if (conflictAnalysis.type === CONFLICT_TYPES.CLARIFICATION) {
    result.resolution = RESOLUTION_STRATEGIES.MERGE;
    result.action = 'update_metadata';
    result.reasons.push('New finding clarifies existing - update metadata');
    return result;
  }

  result.resolution = RESOLUTION_STRATEGIES.PENDING_REVIEW;
  result.action = 'pending';
  result.reasons.push('Conflict requires manual review');
  return result;
};

/**
 * Analyze the type of conflict between entries
 */
const analyzeConflict = (existingEntry, newFinding) => {
  const existingFact = existingEntry.fact?.toLowerCase() || '';
  const newFact = newFinding.fact?.toLowerCase() || '';

  if (areDirectContradiction(existingFact, newFact)) {
    return {
      type: CONFLICT_TYPES.CONTRADICTION,
      severity: 'high',
      description: 'Direct contradiction between facts'
    };
  }

  if (arePartialOverlap(existingFact, newFact)) {
    return {
      type: CONFLICT_TYPES.PARTIAL_OVERLAP,
      severity: 'medium',
      description: 'Facts partially overlap'
    };
  }

  if (isAddition(existingFact, newFact)) {
    return {
      type: CONFLICT_TYPES.ADDITION,
      severity: 'low',
      description: 'New finding adds to existing'
    };
  }

  if (isClarification(existingFact, newFact)) {
    return {
      type: CONFLICT_TYPES.CLARIFICATION,
      severity: 'low',
      description: 'New finding clarifies existing'
    };
  }

  if (isOutdated(existingEntry, newFinding)) {
    return {
      type: CONFLICT_TYPES.OUTDATED,
      severity: 'medium',
      description: 'Existing entry may be outdated'
    };
  }

  return {
    type: CONFLICT_TYPES.PARTIAL_OVERLAP,
    severity: 'medium',
    description: 'Unknown conflict type - defaulting to partial overlap'
  };
};

/**
 * Check if facts are direct contradictions
 */
const areDirectContradiction = (fact1, fact2) => {
  const negationWords = ['not', 'never', 'cannot', "doesn't", "won't", 'impossible'];
  
  const hasNegation = (fact) => negationWords.some(neg => fact.includes(neg));
  
  if (hasNegation(fact1) !== hasNegation(fact2)) {
    const similarity = calculateSimilarity(fact1.replace(/not|never|cannot|doesn't|won't|impossible/gi, ''),
                                            fact2.replace(/not|never|cannot|doesn't|won't|impossible/gi, ''));
    return similarity > 0.7;
  }
  
  return false;
};

/**
 * Check if facts have partial overlap
 */
const arePartialOverlap = (fact1, fact2) => {
  const words1 = new Set(fact1.split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(fact2.split(/\s+/).filter(w => w.length > 3));
  
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size > 0.3 && intersection.size / union.size < 0.8;
};

/**
 * Check if new finding is an addition
 */
const isAddition = (existingFact, newFact) => {
  const existingWords = existingFact.split(/\s+/);
  const newWords = newFact.split(/\s+/);
  
  return existingWords.some(w => newFact.includes(w)) && 
         newWords.some(w => existingFact.includes(w)) &&
         newWords.length > existingWords.length;
};

/**
 * Check if new finding is a clarification
 */
const isClarification = (existingFact, newFact) => {
  const existingWords = new Set(existingFact.split(/\s+/));
  const newWords = new Set(newFact.split(/\s+/));
  
  const newContainsExisting = [...existingWords].every(w => newWords.has(w) || w.length < 4);
  
  return newContainsExisting && newFact.includes(existingFact);
};

/**
 * Check if existing entry is outdated
 */
const isOutdated = (existingEntry, newFinding) => {
  if (existingEntry.ttl && Date.now() - new Date(existingEntry.lastVerified).getTime() > existingEntry.ttl * 1000) {
    return true;
  }
  
  if (newFinding.updatedAt && existingEntry.lastVerified && 
      new Date(newFinding.updatedAt) > new Date(existingEntry.lastVerified)) {
    return true;
  }
  
  return false;
};

/**
 * Calculate similarity between two strings
 */
const calculateSimilarity = (str1, str2) => {
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));
  
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
};

/**
 * Check if verification is dual-provider confirmed
 */
const isDualProviderConfirmed = (verification) => {
  return verification?.dualProviderConsensus === true ||
         (verification?.provider1?.verified && verification?.provider2?.verified);
};

/**
 * Execute conflict resolution
 */
export const executeResolution = async (resolution, sessionId) => {
  const { existingEntry, newFinding, action, reason } = resolution;

  switch (action) {
    case 'update':
      return updateGELentry(existingEntry, newFinding);
    
    case 'debate':
      return initiateReconciliationDebate(existingEntry, newFinding, sessionId);
    
    case 'reject':
      return { success: true, message: 'New finding rejected', kept: 'existing' };
    
    case 'merge':
      return mergeGELentries(existingEntry, newFinding);
    
    case 'update_metadata':
      return updateMetadata(existingEntry, newFinding);
    
    case 'pending':
      return addToPendingQueue(existingEntry, newFinding);
    
    default:
      return { success: false, message: 'Unknown resolution action' };
  }
};

/**
 * Update GEL entry
 */
const updateGELentry = async (existingEntry, newFinding) => {
  const updated = {
    ...existingEntry,
    fact: newFinding.fact || existingEntry.fact,
    certainty: newFinding.certainty || existingEntry.certainty,
    lastVerified: new Date().toISOString(),
    source: newFinding.source || existingEntry.source,
    supportingEvidence: [
      ...(existingEntry.supportingEvidence || []),
      ...(newFinding.evidence || [])
    ],
    verificationHistory: [
      ...(existingEntry.verificationHistory || []),
      {
        action: 'updated',
        previousCertainty: existingEntry.certainty,
        newCertainty: newFinding.certainty,
        timestamp: new Date().toISOString()
      }
    ]
  };

  await gel.addFact(updated.fact, updated.source, {
    certainty: updated.certainty,
    ttl: existingEntry.ttl,
    metadata: updated
  });

  return {
    success: true,
    action: 'updated',
    entry: updated
  };
};

/**
 * Initiate reconciliation debate
 */
const initiateReconciliationDebate = async (existingEntry, newFinding, sessionId) => {
  const debateResult = await runReconciliation(sessionId, {
    discrepancies: [{
      anchor1: existingEntry.id,
      anchor2: newFinding.id || 'new',
      differences: [
        { key: 'certainty', value1: existingEntry.certainty, value2: newFinding.certainty },
        { key: 'fact', value1: existingEntry.fact, value2: newFinding.fact }
      ],
      severity: 'high'
    }]
  });

  return {
    success: debateResult.success || false,
    action: 'debate',
    resolution: debateResult,
    requiresHumanReview: !debateResult.success
  };
};

/**
 * Merge GEL entries
 */
const mergeGELentries = async (existingEntry, newFinding) => {
  const merged = {
    ...existingEntry,
    supportingEvidence: [
      ...(existingEntry.supportingEvidence || []),
      { source: newFinding.source, addedAt: new Date().toISOString() }
    ],
    certainty: Math.max(existingEntry.certainty, newFinding.certainty || 0),
    mergedFrom: [
      ...(existingEntry.mergedFrom || []),
      newFinding.id || 'new'
    ],
    lastMerged: new Date().toISOString()
  };

  return {
    success: true,
    action: 'merged',
    entry: merged
  };
};

/**
 * Update metadata only
 */
const updateMetadata = async (existingEntry, newFinding) => {
  const updated = {
    ...existingEntry,
    metadata: {
      ...existingEntry.metadata,
      clarifications: [
        ...(existingEntry.metadata?.clarifications || []),
        {
          clarification: newFinding.fact,
          source: newFinding.source,
          timestamp: new Date().toISOString()
        }
      ]
    }
  };

  return {
    success: true,
    action: 'metadata_updated',
    entry: updated
  };
};

/**
 * Add to pending queue
 */
const addToPendingQueue = async (existingEntry, newFinding) => {
  return {
    success: true,
    action: 'pending_review',
    status: EPISTEMIC_STATUS.PENDING,
    entry: existingEntry,
    proposed: newFinding
  };
};

/**
 * Batch resolve conflicts
 */
export const batchResolveConflicts = async (conflicts, sessionId) => {
  const results = [];

  for (const conflict of conflicts) {
    const resolution = await resolveConflict(conflict.existing, conflict.new, conflict.context);
    const execution = await executeResolution(resolution, sessionId);
    results.push({
      conflict,
      resolution,
      execution
    });
  }

  return {
    total: conflicts.length,
    results,
    summary: {
      updated: results.filter(r => r.execution.action === 'updated').length,
      debates: results.filter(r => r.execution.action === 'debate').length,
      merged: results.filter(r => r.execution.action === 'merged').length,
      pending: results.filter(r => r.execution.action === 'pending_review').length,
      rejected: results.filter(r => r.execution.action === 'reject').length
    }
  };
};

export default {
  CONFLICT_RESOLUTION_CONFIG,
  CONFLICT_TYPES,
  RESOLUTION_STRATEGIES,
  resolveConflict,
  executeResolution,
  batchResolveConflicts
};