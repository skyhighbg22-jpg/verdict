/**
 * Four-Branch Planning Engine
 * Includes Systems Architect, Security Auditor, Product Designer,
 * and Antithetical Branch (activated when TDS >= 8)
 */

import { bytezClient } from '../../api/bytezClient';
import { PLANNING_BRANCHES, TYPES } from '../types';
import { calculateOverallDifficulty, DEFAULT_TDS_SCORES } from '../tdsRouter';
import { calculateMiscalibrationPenalty } from '../miraEngine';

/**
 * Planning Branch Configuration
 */
export const PLANNING_CONFIG = {
  antitheticalThreshold: 8, // TDS threshold for antithetical branch
  minConsensusForUnanimous: 1.0, // 100% agreement
  supermajorityThreshold: 0.67, // 67% for supermajority
  defaultBranchWeight: 1.0,
  minCertaintyWeight: 0.5,
  maxBranchWeight: 2.0
};

/**
 * Branch system prompts
 */
const BRANCH_PROMPTS = {
  [PLANNING_BRANCHES.ARCHITECT]: {
    role: 'Systems Architect',
    perspective: 'You analyze systems from an architectural standpoint, focusing on scalability, maintainability, performance, and technical debt.',
    responsibilities: [
      'Evaluate technical feasibility and architecture',
      'Identify scalability bottlenecks',
      'Assess maintainability and code quality',
      'Consider infrastructure implications',
      'Evaluate integration patterns'
    ],
    evaluationCriteria: [
      'Technical soundness',
      'Scalability potential',
      'Performance implications',
      'Architecture fit',
      'Technical risk'
    ]
  },
  [PLANNING_BRANCHES.AUDITOR]: {
    role: 'Security Auditor',
    perspective: 'You analyze from a security and risk management perspective, identifying vulnerabilities, compliance issues, and potential threats.',
    responsibilities: [
      'Identify security vulnerabilities',
      'Assess compliance requirements',
      'Evaluate data protection measures',
      'Consider threat vectors',
      'Review access controls'
    ],
    evaluationCriteria: [
      'Security posture',
      'Compliance status',
      'Risk exposure',
      'Vulnerability assessment',
      'Threat model'
    ]
  },
  [PLANNING_BRANCHES.DESIGNER]: {
    role: 'Product Designer',
    perspective: 'You analyze from a user experience and product standpoint, focusing on usability, business value, and user outcomes.',
    responsibilities: [
      'Evaluate user experience impact',
      'Assess business value',
      'Consider customer needs',
      'Evaluate feature prioritization',
      'Assess time-to-value'
    ],
    evaluationCriteria: [
      'User experience',
      'Business alignment',
      'Feature necessity',
      'User outcome impact',
      'Value proposition'
    ]
  },
  [PLANNING_BRANCHES.ANTITHETICAL]: {
    role: 'Antithetical Reviewer',
    perspective: 'You actively challenge assumptions and seek to disprove the proposed plan. You represent the adversarial perspective to strengthen the final output.',
    responsibilities: [
      'Challenge all assumptions',
      'Search for falsifying evidence',
      'Identify logical flaws',
      'Propose counterarguments',
      'Stress-test the hypothesis'
    ],
    evaluationCriteria: [
      'Assumption validity',
      'Logical consistency',
      'Evidence strength',
      'Counterargument robustness',
      'Weakness identification'
    ]
  }
};

/**
 * Default branch analysis template
 */
const createBranchAnalysis = (branch, task, context) => ({
  branchId: branch,
  ...BRANCH_PROMPTS[branch],
  analysis: null,
  findings: [],
  concerns: [],
  recommendations: [],
  decision: null, // approve|reject|hold
  certaintyScore: 5, // 1-10
  weight: PLANNING_CONFIG.defaultBranchWeight,
  evaluatedAt: null
});

/**
 * Run a planning branch analysis using appropriate model
 */
const runBranchAnalysis = async (branch, task, context) => {
  const branchPrompt = BRANCH_PROMPTS[branch];
  
  const prompt = `
    As a ${branchPrompt.role}, analyze the following task from your ${branchPrompt.perspective}
    
    Task: ${task}
    Context: ${JSON.stringify(context, null, 2)}
    
    Your responsibilities:
    ${branchPrompt.responsibilities.map(r => `- ${r}`).join('\n')}
    
    Evaluate based on:
    ${branchPrompt.evaluationCriteria.map(c => `- ${c}`).join('\n')}
    
    Provide your analysis as JSON:
    {
      "analysis": "detailed analysis text",
      "findings": ["finding 1", "finding 2"],
      "concerns": ["concern 1", "concern 2"],
      "recommendations": ["recommendation 1"],
      "decision": "approve|reject|hold",
      "certaintyScore": 1-10,
      "strengths": ["strength 1"],
      "weaknesses": ["weakness 1"]
    }
  `;

  // Use GPT-5.4 Pro for planning branches
  const response = await bytezClient.runInference('gpt-5.4-pro', {
    systemPrompt: `You are a ${branchPrompt.role}. ${branchPrompt.perspective} Provide rigorous, detailed analysis.`,
    userPrompt: prompt,
    temperature: 0.4
  });

  let parsed = {};
  if (response && response.output) {
    try {
      parsed = typeof response.output === 'string' 
        ? JSON.parse(response.output) 
        : response.output;
    } catch (e) {
      console.warn(`Failed to parse ${branch} analysis:`, e);
    }
  }

  return {
    ...createBranchAnalysis(branch, task, context),
    analysis: parsed.analysis || 'Analysis completed',
    findings: parsed.findings || [],
    concerns: parsed.concerns || [],
    recommendations: parsed.recommendations || [],
    decision: parsed.decision || 'hold',
    certaintyScore: parsed.certaintyScore || 5,
    strengths: parsed.strengths || [],
    weaknesses: parsed.weaknesses || [],
    evaluatedAt: new Date().toISOString()
  };
};

/**
 * Apply MIRA-based weight adjustments to branch
 */
const applyMiraWeightAdjustment = (branchAnalysis, calibrationScore) => {
  const baseWeight = PLANNING_CONFIG.defaultBranchWeight;
  
  // If calibration is good (> 0.7), increase weight
  // If calibration is poor (< 0.5), decrease weight
  let weightAdjustment = 0;
  
  if (calibrationScore >= 0.8) {
    weightAdjustment = 0.2;
  } else if (calibrationScore >= 0.7) {
    weightAdjustment = 0.1;
  } else if (calibrationScore >= 0.5) {
    weightAdjustment = -0.1;
  } else {
    weightAdjustment = -0.2;
  }

  const newWeight = Math.max(
    PLANNING_CONFIG.minCertaintyWeight,
    Math.min(PLANNING_CONFIG.maxBranchWeight, baseWeight + weightAdjustment)
  );

  return {
    ...branchAnalysis,
    weight: newWeight,
    weightAdjustment,
    calibrationScore
  };
};

/**
 * Main Four-Branch Planning Engine
 */
export const runFourBranchPlanning = async (task, tdsScores, calibrationScore = 0.7, context = {}) => {
  // Determine which branches to run
  const overallDifficulty = calculateOverallDifficulty(tdsScores || DEFAULT_TDS_SCORES);
  const useAntithetical = overallDifficulty >= PLANNING_CONFIG.antitheticalThreshold;
  
  const branchesToRun = [
    PLANNING_BRANCHES.ARCHITECT,
    PLANNING_BRANCHES.AUDITOR,
    PLANNING_BRANCHES.DESIGNER
  ];

  if (useAntithetical) {
    branchesToRun.push(PLANNING_BRANCHES.ANTITHETICAL);
  }

  // Run all branches in parallel
  const branchPromises = branchesToRun.map(branch => 
    runBranchAnalysis(branch, task, context)
  );

  let branchResults = await Promise.all(branchPromises);

  // Apply MIRA weight adjustments
  branchResults = branchResults.map(branch => 
    applyMiraWeightAdjustment(branch, calibrationScore)
  );

  // Calculate consensus andunanimity
  const { unanimousSteps, divergingPoints, consensusPercentage } = 
    analyzeConsensus(branchResults);

  // Generate synthesis
  const synthesis = generateSynthesis(branchResults, unanimousSteps, divergingPoints);

  return {
    branches: branchResults,
    unanimousSteps,
    divergingPoints,
    synthesis,
    antitheticalActivated: useAntithetical,
    consensusPercentage,
    overallDifficulty,
    metadata: {
      branchesRun: branchesToRun.length,
      antitheticalThreshold: PLANNING_CONFIG.antitheticalThreshold,
      currentDifficulty: overallDifficulty,
      generatedAt: new Date().toISOString()
    }
  };
};

/**
 * Analyze consensus among branches
 */
const analyzeConsensus = (branchResults) => {
  const unanimousSteps = [];
  const divergingPoints = [];
  
  // Group decisions
  const decisions = branchResults.map(b => b.decision);
  const approvals = decisions.filter(d => d === 'approve').length;
  const rejections = decisions.filter(d => d === 'reject').length;
  const holds = decisions.filter(d => d === 'hold').length;
  
  // Calculate weighted certainty
  const totalWeight = branchResults.reduce((sum, b) => sum + b.weight, 0);
  const weightedCertainty = branchResults.reduce(
    (sum, b) => sum + (b.certaintyScore * b.weight), 0
  ) / totalWeight;
  
  // Determine consensus level
  let consensusLevel = 'majority';
  if (approvals === branchResults.length) {
    consensusLevel = 'unanimous';
  } else if (approvals / branchResults.length >= PLANNING_CONFIG.supermajorityThreshold) {
    consensusLevel = 'supermajority';
  } else if (rejections > approvals) {
    consensusLevel = 'deadlock';
  }

  // Find unanimous points
  if (consensusLevel === 'unanimous' || approvals === branchResults.length) {
    unanimousSteps.push(...branchResults[0].recommendations.filter(rec => 
      branchResults.every(b => b.recommendations.includes(rec))
    ));
  }

  // Find diverging points
  if (branchResults.length > 1) {
    // Find concerns that are unique to some branches
    const allConcerns = branchResults.flatMap(b => b.concerns);
    const concernCounts = {};
    allConcerns.forEach(c => {
      concernCounts[c] = (concernCounts[c] || 0) + 1;
    });
    
    for (const [concern, count] of Object.entries(concernCounts)) {
      if (count < branchResults.length && count > 0) {
        divergingPoints.push({
          point: concern,
          agreement: count / branchResults.length,
          branches: branchResults.filter(b => b.concerns.includes(concern)).map(b => b.branchId)
        });
      }
    }
  }

  // Calculate consensus percentage
  const consensusPercentage = approvals / branchResults.length;

  return {
    unanimousSteps,
    divergingPoints,
    consensusPercentage,
    consensusLevel,
    approvals,
    rejections,
    holds,
    weightedCertainty
  };
};

/**
 * Generate synthesis from branch analyses
 */
const generateSynthesis = (branchResults, unanimousSteps, divergingPoints) => {
  const approved = branchResults.filter(b => b.decision === 'approve');
  const rejected = branchResults.filter(b => b.decision === 'reject');
  
  // Collect all recommendations
  const allRecommendations = branchResults.flatMap(b => b.recommendations);
  const uniqueRecommendations = [...new Set(allRecommendations)];
  
  // Collect strengths and weaknesses
  const strengths = [...new Set(branchResults.flatMap(b => b.strengths || []))];
  const weaknesses = [...new Set(branchResults.flatMap(b => b.weaknesses || []))];

  // Generate final recommendation
  let recommendation = 'proceed';
  if (rejected.length > approved.length) {
    recommendation = 'reject';
  } else if (rejected.length > 0) {
    recommendation = 'conditional_proceed';
  }

  return {
    recommendation,
    summary: generateSummary(branchResults),
    uniqueRecommendations,
    strengths,
    weaknesses,
    unanimousSteps,
    divergingPoints,
    resolution: divergingPoints.length > 0 
      ? resolveDivergences(divergingPoints, branchResults)
      : null
  };
};

/**
 * Generate human-readable summary
 */
const generateSummary = (branchResults) => {
  const approvals = branchResults.filter(b => b.decision === 'approve').length;
  const total = branchResults.length;
  const avgCertainty = branchResults.reduce((sum, b) => sum + b.certaintyScore, 0) / total;
  
  let summary = `${approvals}/${total} branches approved. `;
  summary += `Average certainty: ${avgCertainty.toFixed(1)}/10. `;
  
  if (branchResults.some(b => b.branchId === PLANNING_BRANCHES.ANTITHETICAL)) {
    summary += 'Antithetical review completed. ';
  }
  
  return summary;
};

/**
 * Resolve diverging points with weighted decisions
 */
const resolveDivergences = (divergingPoints, branchResults) => {
  return divergingPoints.map(div => {
    // Calculate weighted vote
    const votingBranches = branchResults.filter(b => div.branches.includes(b.branchId));
    const weightedVote = votingBranches.reduce(
      (sum, b) => sum + (b.decision === 'approve' ? b.weight : -b.weight), 
      0
    );
    
    return {
      ...div,
      resolution: weightedVote >= 0 ? 'include' : 'exclude',
      weightedVote
    };
  });
};

/**
 * Run individual branch analysis
 */
export const runBranchAnalysisSingle = async (branch, task, context, calibrationScore = 0.7) => {
  const result = await runBranchAnalysis(branch, task, context);
  return applyMiraWeightAdjustment(result, calibrationScore);
};

/**
 * Check if antithetical branch should be activated
 */
export const shouldActivateAntithetical = (tdsScores) => {
  const overall = calculateOverallDifficulty(tdsScores || DEFAULT_TDS_SCORES);
  return overall >= PLANNING_CONFIG.antitheticalThreshold;
};

export default {
  runFourBranchPlanning,
  runBranchAnalysisSingle,
  shouldActivateAntithetical,
  PLANNING_CONFIG,
  BRANCH_PROMPTS
};
