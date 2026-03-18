/**
 * Pipeline Engine
 * Orchestrates the 5 phases of the VERDICT pipeline
 */

import { PHASES, PIPELINE_STATUS } from '../types/pipeline.js';
import { runMiraCalibration, calculateCalibrationScore } from './miraEngine';
import { runTDSAnalysis, determineRouting } from './tdsRouter';
import { runGoalDecomposition, updateTaskStatus, TASK_STATUS } from './gde';
import { runSkepticValidation, analyzeCausalChain, detectFallacies, compareWithAdversarial } from './causalValidator';

/**
 * Phase transition events
 */
export const PHASE_TRANSITIONS = {
  [PHASES.REFINING]: {
    next: PHASES.PLANNING,
    requiredApprovals: [],
    description: 'Clarify requirements and calibrate system'
  },
  [PHASES.PLANNING]: {
    next: PHASES.RESEARCH,
    requiredApprovals: ['tds', 'gde'],
    description: 'Create execution strategy and decompose goals'
  },
  [PHASES.RESEARCH]: {
    next: PHASES.IMPLEMENTATION,
    requiredApprovals: ['adversarial', 'causal'],
    description: 'Gather information and validate assumptions'
  },
  [PHASES.IMPLEMENTATION]: {
    next: PHASES.CLOSE_OUT,
    requiredApprovals: ['implementation'],
    description: 'Execute implementation and verify results'
  },
  [PHASES.CLOSE_OUT]: {
    next: null,
    requiredApprovals: ['final'],
    description: 'Finalize and archive results'
  }
};

/**
 * Phase-specific processing functions
 */

// Phase 1: Refining - TDS Analysis + MIRA Calibration
const processRefiningPhase = async (context) => {
  const { userPrompt } = context;
  
  // Run TDS Analysis using GPT-5.4 Pro
  const tdsResult = await runTDSAnalysis(userPrompt, context.additionalContext);
  
  // Run MIRA Calibration
  const miraResult = await runMiraCalibration(userPrompt);
  
  // Determine routing based on TDS
  const routing = determineRouting(tdsResult.scores);
  
  // Check if human approval is needed
  const requiresApproval = routing.requiresHumanApproval || 
    tdsResult.scores.securityRisk >= 8 ||
    tdsResult.scores.infrastructureImpact >= 8;

  return {
    tdsScores: tdsResult.scores,
    tdsRouting: routing,
    miraResults: miraResult,
    requiresApproval,
    processedAt: new Date().toISOString(),
    recommendations: [
      routing.recommendedApproach,
      ...routing.highRiskIndicators
    ]
  };
};

// Phase 2: Planning - GDE + Initial Skeptic Validation
const processPlanningPhase = async (context) => {
  const { userPrompt, tdsScores } = context;
  
  // Run Goal Decomposition
  const gdeResult = await runGoalDecomposition(userPrompt);
  
  // Build initial causal chain from task dependencies
  const initialCausalChain = buildCausalChainFromTasks(gdeResult.tasks);
  
  // Run Skeptic validation on the plan
  const skepticResult = await runSkepticValidation({
    causalChain: initialCausalChain,
    tasks: gdeResult.tasks,
    tdsScores
  }, 'causal_chain');
  
  return {
    taskGraph: gdeResult,
    causalChain: initialCausalChain,
    skepticValidation: skepticResult,
    parallelGroups: gdeResult.parallelGroups,
    criticalPath: gdeResult.metadata.criticalPath,
    requiresApproval: !skepticResult.isValid || skepticResult.overallStrength === 'weak',
    processedAt: new Date().toISOString()
  };
};

// Phase 3: Research - Deep Search + Adversarial Branch
const processResearchPhase = async (context) => {
  const { userPrompt, taskGraph, causalChain } = context;
  
  // Run main research (simulated deep search)
  const mainResearch = await runMainResearch(userPrompt, taskGraph);
  
  // Run adversarial branch (seeking disconfirming evidence)
  const adversarialResearch = await runAdversarialResearch(userPrompt, taskGraph);
  
  // Compare findings
  const comparison = compareWithAdversarial(mainResearch, adversarialResearch);
  
  // Re-validate causal chain with new information
  const updatedCausalChain = updateCausalChainWithResearch(causalChain, mainResearch);
  const causalValidation = analyzeCausalChain(updatedCausalChain);
  
  // Final skeptic validation with all research
  const finalSkepticValidation = await runSkepticValidation({
    causalChain: updatedCausalChain,
    mainFindings: mainResearch,
    adversarialFindings: adversarialResearch,
    comparison
  }, 'full_review');
  
  return {
    mainResearch,
    adversarialResearch,
    comparison,
    causalValidation,
    skepticValidation: finalSkepticValidation,
    updatedCausalChain,
    requiresApproval: comparison.confidenceAdjustment < -0.2 || !finalSkepticValidation.isValid,
    processedAt: new Date().toISOString()
  };
};

// Phase 4: Implementation - Execute tasks with real-time feedback
const processImplementationPhase = async (context) => {
  const { taskGraph, updatedCausalChain, mainResearch } = context;
  
  const executionLog = [];
  const completedTasks = [];
  
  // Execute tasks in parallel groups
  for (const group of taskGraph.parallelGroups) {
    executionLog.push({
      type: 'PHASE_START',
      group: group,
      timestamp: new Date().toISOString()
    });
    
    // Simulate execution of tasks in this group
    for (const taskId of group) {
      const taskResult = await executeTask(taskId, taskGraph.tasks.get(taskId));
      completedTasks.push(taskResult);
      
      executionLog.push({
        type: 'TASK_COMPLETE',
        taskId,
        result: taskResult,
        timestamp: new Date().toISOString()
      });
    }
    
    executionLog.push({
      type: 'PHASE_COMPLETE',
      group: group,
      timestamp: new Date().toISOString()
    });
  }
  
  // Verify against causal chain
  const verification = verifyImplementationAgainstPlan(completedTasks, updatedCausalChain);
  
  return {
    executionLog,
    completedTasks,
    verification,
    requiresApproval: verification.success === false,
    processedAt: new Date().toISOString()
  };
};

// Phase 5: Close-Out - Final validation + Miscalibration report
const processCloseOutPhase = async (context) => {
  const { 
    tdsScores, 
    miraResults, 
    taskGraph, 
    verification, 
    skepticValidation,
    executionLog 
  } = context;
  
  // Calculate final metrics
  const finalCalibration = calculateFinalCalibration(miraResults, verification);
  
  // Generate summary report
  const summaryReport = generateSummaryReport({
    tdsScores,
    miraResults,
    taskGraph,
    verification,
    skepticValidation,
    executionLog,
    finalCalibration
  });
  
  return {
    finalCalibration,
    summaryReport,
    verificationStatus: verification.success ? 'PASSED' : 'FAILED',
    archivedAt: new Date().toISOString()
  };
};

/**
 * Helper functions
 */

const buildCausalChainFromTasks = (tasks) => {
  const chain = [];
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  
  tasks.forEach(task => {
    if (task.dependencies.length > 0) {
      task.dependencies.forEach(depId => {
        const depTask = taskMap.get(depId);
        if (depTask) {
          chain.push({
            cause: depTask.title,
            effect: task.title,
            evidence: `Dependency: ${depTask.description}`
          });
        }
      });
    }
  });
  
  return chain;
};

const runMainResearch = async (userPrompt, taskGraph) => {
  // Simulated main research using Bytez API
  try {
    const response = await fetch('/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: userPrompt, mode: 'deep_search' })
    }).catch(() => null);
    
    if (response?.ok) {
      return await response.json();
    }
  } catch (e) {
    console.log('Using simulated research');
  }
  
  // Fallback simulated research
  return {
    keyPoints: [
      'Research confirms viability of proposed approach',
      'Identified 3 relevant prior solutions',
      'Technical requirements validated'
    ],
    sources: ['arxiv.org', 'github.com', 'stackoverflow.com'],
    confidence: 0.8
  };
};

const runAdversarialResearch = async (userPrompt, taskGraph) => {
  // Use Skeptic Agent for adversarial research
  const skepticResult = await runSkepticValidation({
    argument: userPrompt,
    conclusions: taskGraph.tasks ? Array.from(taskGraph.tasks.values()).map(t => t.title) : []
  }, 'argument');
  
  return {
    keyPoints: skepticResult.weaknesses || [],
    challenges: skepticResult.criticalIssues || [],
    confidence: 0.6
  };
};

const updateCausalChainWithResearch = (originalChain, research) => {
  const updated = [...originalChain];
  
  // Add research findings as new causal links
  if (research.keyPoints) {
    research.keyPoints.forEach((point, i) => {
      updated.push({
        cause: 'Research Phase',
        effect: point,
        evidence: `Source: ${(research.sources || []).join(', ')}`
      });
    });
  }
  
  return updated;
};

const executeTask = async (taskId, task) => {
  // Simulate task execution
  return {
    taskId,
    title: task?.title || 'Unknown Task',
    status: TASK_STATUS.COMPLETED,
    output: `Executed: ${task?.title}`,
    duration: Math.random() * 1000 + 500
  };
};

const verifyImplementationAgainstPlan = (completedTasks, causalChain) => {
  const allCompleted = completedTasks.every(t => t.status === TASK_STATUS.COMPLETED);
  
  // Check if all causal requirements are met
  const causalRequirements = causalChain.length;
  const metRequirements = Math.min(completedTasks.length, causalRequirements);
  
  return {
    success: allCompleted,
    tasksCompleted: completedTasks.length,
    causalRequirementsMet: metRequirements / Math.max(causalRequirements, 1)
  };
};

const calculateFinalCalibration = (initialMira, verification) => {
  const basePenalty = initialMira.miscalibrationPenalty || 0;
  const verificationPenalty = verification.success ? 0 : 0.2;
  
  return {
    initialScore: initialMira.calibrationScore,
    finalScore: Math.max(0, initialMira.calibrationScore - basePenalty - verificationPenalty),
    totalPenalty: basePenalty + verificationPenalty,
    breakdown: {
      miscalibration: basePenalty,
      verification: verificationPenalty
    }
  };
};

const generateSummaryReport = (data) => {
  return {
    generatedAt: new Date().toISOString(),
    tdsSummary: {
      overallDifficulty: data.tdsScores,
      routing: 'full_pipeline'
    },
    calibrationSummary: data.finalCalibration,
    taskSummary: {
      total: data.taskGraph?.metadata?.totalTasks || 0,
      completed: data.completedTasks?.length || 0,
      status: data.verificationStatus
    },
    skepticSummary: {
      isValid: data.skepticValidation?.isValid ?? true,
      issues: data.skepticValidation?.criticalIssues?.length || 0
    },
    recommendations: [
      data.verification.success ? 'Proceed with deployment' : 'Review failed verifications',
      'Archive version for future reference'
    ]
  };
};

/**
 * Main pipeline execution function
 */
export const executePipeline = async (phase, context) => {
  switch (phase) {
    case PHASES.REFINING:
      return await processRefiningPhase(context);
    case PHASES.PLANNING:
      return await processPlanningPhase(context);
    case PHASES.RESEARCH:
      return await processResearchPhase(context);
    case PHASES.IMPLEMENTATION:
      return await processImplementationPhase(context);
    case PHASES.CLOSE_OUT:
      return await processCloseOutPhase(context);
    default:
      throw new Error(`Unknown phase: ${phase}`);
  }
};

/**
 * Check if phase transition requires approval
 */
export const requiresPhaseApproval = (phase) => {
  const transition = PHASE_TRANSITIONS[phase];
  return transition?.requiredApprovals?.length > 0;
};

/**
 * Get next phase
 */
export const getNextPhase = (currentPhase) => {
  return PHASE_TRANSITIONS[currentPhase]?.next || null;
};

export default {
  PIPELINE_STATUS,
  PHASE_TRANSITIONS,
  executePipeline,
  requiresPhaseApproval,
  getNextPhase
};
