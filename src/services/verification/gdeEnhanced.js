/**
 * Goal Decomposition Engine (GDE) - Enhanced Version
 * Dependency-ordered sub-goal graphs, Unknown Unknowns detection,
 * epistemic status tagging
 */

import { bytezClient } from '../../api/bytezClient';
import { EPISTEMIC_STATUS, TYPES } from '../types';
import { runGoalDecomposition } from '../gde';

/**
 * GDE Enhanced Configuration
 */
export const GDE_ENHANCED_CONFIG = {
  maxDepth: 5,
  maxTasksPerLevel: 10,
  allowParallelExecution: true,
  enableSelfCritique: true,
  minTaskSize: 'small',
  detectUnknownUnknowns: true,
  epistemicTagging: true,
  unknownDetectionThreshold: 0.3
};

/**
 * Epistemic status descriptions
 */
export const EPISTEMIC_DESCRIPTIONS = {
  [EPISTEMIC_STATUS.VERIFIED]: 'Confirmed through evidence and validation',
  [EPISTEMIC_STATUS.UNCERTAIN]: 'Partially understood, needs more information',
  [EPISTEMIC_STATUS.DISPUTED]: 'Conflicting evidence or viewpoints',
  [EPISTEMIC_STATUS.UNKNOWN]: 'Completely unknown, requires discovery',
  [EPISTEMIC_STATUS.PENDING]: 'Not yet evaluated for epistemic status'
};

/**
 * Unknown Unknowns detection patterns
 */
const UNKNOWN_PATTERNS = {
  explicit: [
    'unknown', 'unsure', 'unclear', 'uncertain',
    'might', 'may', 'could', 'possibly', 'probably',
    'not sure', 'not certain', 'don\'t know'
  ],
  implicit: [
    'need to research', 'to be determined', 'tbd',
    'requires investigation', 'pending analysis',
    'need more info', 'dependent on'
  ],
  riskIndicators: [
    'assuming', 'presumably', 'supposedly',
    'should work', 'likely to', 'expected to'
  ]
};

/**
 * Detect unknown unknowns in task descriptions
 */
const detectUnknownUnknowns = (tasks) => {
  const unknownUnknowns = [];
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  tasks.forEach(task => {
    const text = `${task.title} ${task.description}`.toLowerCase();
    
    // Check explicit unknowns
    const explicitMatches = UNKNOWN_PATTERNS.explicit.filter(
      pattern => text.includes(pattern.toLowerCase())
    );

    // Check implicit unknowns
    const implicitMatches = UNKNOWN_PATTERNS.implicit.filter(
      pattern => text.includes(pattern.toLowerCase())
    );

    // Check risk indicators
    const riskMatches = UNKNOWN_PATTERNS.riskIndicators.filter(
      pattern => text.includes(pattern.toLowerCase())
    );

    if (explicitMatches.length > 0 || implicitMatches.length > 0) {
      unknownUnknowns.push({
        taskId: task.id,
        taskTitle: task.title,
        type: explicitMatches.length > 0 ? 'explicit' : 'implicit',
        matchedPatterns: [...explicitMatches, ...implicitMatches],
        severity: explicitMatches.length > 0 ? 'high' : 'medium',
        description: `Potential unknown: ${explicitMatches.join(', ') || implicitMatches.join(', ')}`,
        recommendation: generateUnknownRecommendation(explicitMatches, implicitMatches)
      });
    }

    if (riskMatches.length > 0) {
      unknownUnknowns.push({
        taskId: task.id,
        taskTitle: task.title,
        type: 'assumption',
        matchedPatterns: riskMatches,
        severity: 'low',
        description: `Assumption detected: ${riskMatches.join(', ')}`,
        recommendation: 'Verify this assumption before proceeding'
      });
    }
  });

  return unknownUnknowns;
};

/**
 * Generate recommendation for unknown
 */
const generateUnknownRecommendation = (explicit, implicit) => {
  if (explicit.length > 0) {
    return 'Investigate this area to reduce uncertainty before proceeding';
  }
  return 'Gather more information to clarify this point';
};

/**
 * Assign epistemic status to tasks based on evidence
 */
const assignEpistemicStatus = (tasks, researchData = {}) => {
  const statusMap = new Map();

  tasks.forEach(task => {
    // Check if task has been researched
    const taskResearch = researchData[task.id];
    
    let status = EPISTEMIC_STATUS.PENDING;
    let certainty = 0.5;
    let source = 'initial';

    if (taskResearch) {
      if (taskResearch.verified) {
        status = EPISTEMIC_STATUS.VERIFIED;
        certainty = taskResearch.certainty || 0.9;
        source = taskResearch.source || 'research';
      } else if (taskResearch.disputed) {
        status = EPISTEMIC_STATUS.DISPUTED;
        certainty = taskResearch.certainty || 0.4;
        source = taskResearch.source || 'research';
      }
    } else {
      // Default based on dependency depth
      const depth = calculateTaskDepth(task, tasks);
      if (depth === 0) {
        status = EPISTEMIC_STATUS.VERIFIED;
        certainty = 0.8;
        source = 'root_task';
      } else if (depth <= 2) {
        status = EPISTEMIC_STATUS.UNCERTAIN;
        certainty = 0.6;
        source = 'derived';
      } else {
        status = EPISTEMIC_STATUS.UNKNOWN;
        certainty = 0.3;
        source = 'unexplored';
      }
    }

    statusMap.set(task.id, {
      status,
      certainty,
      source,
      lastVerified: status === EPISTEMIC_STATUS.VERIFIED ? new Date().toISOString() : null
  });
  });

  return statusMap;
};

/**
 * Calculate depth of task in dependency tree
 */
const calculateTaskDepth = (task, allTasks) => {
  if (task.dependencies.length === 0) return 0;
  
  const taskMap = new Map(allTasks.map(t => [t.id, t]));
  let maxDepth = 0;
  
  const getDepth = (taskId, visited = new Set()) => {
    if (visited.has(taskId)) return 0;
    visited.add(taskId);
    
    const t = taskMap.get(taskId);
    if (!t || t.dependencies.length === 0) return 1;
    
    const depths = t.dependencies.map(depId => getDepth(depId, new Set(visited)));
    return 1 + Math.max(...depths);
  };
  
  return getDepth(task.id);
};

/**
 * Enhanced GDE with Unknown Unknowns and Epistemic Tagging
 */
export const runEnhancedGoalDecomposition = async (goal, config = {}, context = {}) => {
  const {
    researchData = {},
    enableUnknownDetection = true,
    enableEpistemicTagging = true
  } = context;

  // Run basic GDE first
  const gdeResult = await runGoalDecomposition(goal, config);

  // Detect unknown unknowns
  let unknownUnknowns = [];
  if (enableUnknownDetection && GDE_ENHANCED_CONFIG.detectUnknownUnknowns) {
    unknownUnknowns = detectUnknownUnknowns(gdeResult.tasks);
  }

  // Assign epistemic status
  let epistemicStatuses = new Map();
  if (enableEpistemicTagging) {
    epistemicStatuses = assignEpistemicStatus(gdeResult.tasks, researchData);
  }

  // Identify high-uncertainty paths
  const uncertaintyPaths = identifyUncertaintyPaths(
    gdeResult.tasks, 
    epistemicStatuses, 
    unknownUnknowns
  );

  // Calculate overall epistemic confidence
  const overallConfidence = calculateOverallConfidence(
    epistemicStatuses,
    unknownUnknowns
  );

  // Generate recommendations based on unknowns
  const recommendations = generateGDEDecommendations(
    unknownUnknowns,
    uncertaintyPaths,
    epistemicStatuses
  );

  return {
    ...gdeResult,
    unknownUnknowns,
    epistemicStatuses,
    uncertaintyPaths,
    overallConfidence,
    recommendations,
    metadata: {
      ...gdeResult.metadata,
      unknownCount: unknownUnknowns.length,
      epistemicCoverage: calculateEpistemicCoverage(epistemicStatuses),
      analyzedAt: new Date().toISOString()
    }
  };
};

/**
 * Identify paths with high uncertainty
 */
const identifyUncertaintyPaths = (tasks, epistemicStatuses, unknownUnknowns) => {
  const paths = [];
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  
  // Find paths with unknown/uncertain status
  tasks.forEach(task => {
    const status = epistemicStatuses.get(task.id);
    if (!status) return;

    if (status.status === EPISTEMIC_STATUS.UNKNOWN || 
        status.status === EPISTEMIC_STATUS.DISPUTED ||
        status.certainty < GDE_ENHANCED_CONFIG.unknownDetectionThreshold) {
      
      // Trace back the dependency path
      const path = traceDependencyPath(task, taskMap, epistemicStatuses);
      paths.push({
        startTask: path[0]?.title,
        endTask: task.title,
        path: path.map(p => p.id),
        uncertaintyType: status.status,
        certainty: status.certainty
      });
    }
  });

  return paths;
};

/**
 * Trace dependency path from root to task
 */
const traceDependencyPath = (task, taskMap, epistemicStatuses, visited = new Set()) => {
  if (visited.has(task.id)) return [task];
  visited.add(task.id);

  const path = [task];

  // Find parent tasks that lead to this one
  for (const [id, t] of taskMap) {
    if (t.dependencies.includes(task.id)) {
      const parentPath = traceDependencyPath(t, taskMap, epistemicStatuses, new Set(visited));
      path.unshift(...parentPath);
    }
  }

  return path;
};

/**
 * Calculate overall confidence score
 */
const calculateOverallConfidence = (epistemicStatuses, unknownUnknowns) => {
  if (epistemicStatuses.size === 0) return 0.5;

  let totalCertainty = 0;
  let count = 0;

  for (const [_, status] of epistemicStatuses) {
    totalCertainty += status.certainty;
    count++;
  }

  const avgCertainty = count > 0 ? totalCertainty / count : 0;

  // Penalize for unknowns
  const unknownPenalty = unknownUnknowns.length * 0.05;

  return Math.max(0, Math.min(1, avgCertainty - unknownPenalty));
};

/**
 * Calculate epistemic coverage percentage
 */
const calculateEpistemicCoverage = (epistemicStatuses) => {
  if (epistemicStatuses.size === 0) return 0;

  const verified = [...epistemicStatuses.values()].filter(
    s => s.status === EPISTEMIC_STATUS.VERIFIED
  ).length;

  return verified / epistemicStatuses.size;
};

/**
 * Generate recommendations based on analysis
 */
const generateGDEDecommendations = (unknownUnknowns, uncertaintyPaths, epistemicStatuses) => {
  const recommendations = [];

  // Unknown Unknowns recommendations
  if (unknownUnknowns.length > 0) {
    recommendations.push({
      priority: 'high',
      category: 'unknown_unknowns',
      message: `Detected ${unknownUnknowns.length} unknown unknowns in the task graph`,
      action: 'Investigate and resolve uncertainties before proceeding'
    });

    const highSeverity = unknownUnknowns.filter(u => u.severity === 'high');
    if (highSeverity.length > 0) {
      recommendations.push({
        priority: 'critical',
        category: 'unknown_unknowns',
        message: `${highSeverity.length} high-severity unknowns require immediate attention`,
        tasks: highSeverity.map(u => u.taskId)
      });
    }
  }

  // Uncertainty path recommendations
  if (uncertaintyPaths.length > 0) {
    recommendations.push({
      priority: 'medium',
      category: 'uncertainty_paths',
      message: `Identified ${uncertaintyPaths.length} paths with high uncertainty`,
      action: 'Focus research efforts on these paths'
    });
  }

  // Epistemic status recommendations
  const unknownTasks = [...epistemicStatuses.values()].filter(
    s => s.status === EPISTEMIC_STATUS.UNKNOWN
  );
  
  if (unknownTasks.length > epistemicStatuses.size * 0.3) {
    recommendations.push({
      priority: 'high',
      category: 'epistemic',
      message: 'Significant portion of task graph has unknown status',
      action: 'Conduct research phase to reduce unknowns'
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'low',
      category: 'general',
      message: 'Task graph appears well-defined with minimal uncertainty',
      action: 'Proceed with planning'
    });
  }

  return recommendations;
};

/**
 * Update epistemic status after research
 */
export const updateEpistemicStatus = (taskId, newStatus, source, certainty = 0.8) => {
  return {
    taskId,
    status: newStatus,
    certainty,
    source,
    lastVerified: new Date().toISOString()
  };
};

/**
 * Resolve unknown through investigation
 */
export const resolveUnknown = (unknownId, resolution, epistemicStatuses) => {
  // Mark as resolved with new status
  const updated = new Map(epistemicStatuses);
  
  updated.set(unknownId, {
    status: resolution.status,
    certainty: resolution.certainty || 0.8,
    source: resolution.source,
    lastVerified: new Date().toISOString(),
    resolution: resolution.description
  });

  return updated;
};

export default {
  GDE_ENHANCED_CONFIG,
  EPISTEMIC_DESCRIPTIONS,
  runEnhancedGoalDecomposition,
  detectUnknownUnknowns,
  assignEpistemicStatus,
  updateEpistemicStatus,
  resolveUnknown
};
