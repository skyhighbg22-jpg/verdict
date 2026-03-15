/**
 * Human Approval Gate - Complete Implementation
 * Full audit package with all phases, MIRA report, Jury decisions
 */

import { PHASES, TYPES } from '../types';
import { generateJurySummary } from '../planning/juryEvaluation';
import { statePersistence } from '../state/statePersistence';

/**
 * Approval Gate Configuration
 */
export const APPROVAL_GATE_CONFIG = {
  requireFullAudit: true,
  includeMIRAReport: true,
  includeJuryDecision: true,
  includeAnchorHistory: true,
  includeRecommendations: true,
  minConfidenceForAuto: 0.8
};

/**
 * Generate complete audit package
 */
export const generateAuditPackage = async (sessionId, context) => {
  const {
    currentPhase,
    tdsScores,
    tdsRouting,
    miraResults,
    taskGraph,
    skepticValidation,
    planningResult,
    juryResult,
    causalValidation,
    anchors,
    recommendations
  } = context;

  const auditPackage = {
    sessionId,
    generatedAt: new Date().toISOString(),
    currentPhase,
    
    // Executive Summary
    executiveSummary: generateExecutiveSummary(context),
    
    // TDS Analysis
    tdsAnalysis: tdsScores ? {
      scores: tdsScores,
      routing: tdsRouting,
      overallDifficulty: calculateOverallDifficulty(tdsScores),
      riskLevel: determineRiskLevel(tdsScores)
    } : null,

    // MIRA Calibration Report
    miraReport: includeMIRAReport(miraResults),
    
    // Task Decomposition
    taskDecomposition: taskGraph ? {
      totalTasks: taskGraph.metadata?.totalTasks || 0,
      criticalPath: taskGraph.metadata?.criticalPath || [],
      parallelGroups: taskGraph.parallelGroups || [],
      taskList: extractTaskList(taskGraph)
    } : null,

    // Planning Results
    planningResults: planningResult ? {
      branches: planningResult.branches?.map(b => ({
        role: b.role,
        decision: b.decision,
        certaintyScore: b.certaintyScore,
        weight: b.weight,
        recommendations: b.recommendations
      })) || [],
      consensusPercentage: planningResult.consensusPercentage,
      unanimousSteps: planningResult.unanimousSteps,
      divergingPoints: planningResult.divergingPoints,
      antitheticalActivated: planningResult.antitheticalActivated
    } : null,

    // Jury Decision
    juryDecision: includeJuryDecision(juryResult),

    // Causal Validation
    causalValidation: causalValidation ? {
      isValid: causalValidation.isValid,
      overallStrength: causalValidation.overallStrength,
      issues: causalValidation.issues,
      recommendations: causalValidation.recommendations,
      falsifyingEvidence: causalValidation.falsifyingEvidence?.length || 0
    } : null,

    // Skeptic Validation
    skepticValidation: skepticValidation ? {
      overallAssessment: skepticValidation.overallAssessment,
      isValid: skepticValidation.isValid,
      challenges: skepticValidation.challenges?.length || 0,
      recommendations: skepticValidation.recommendations
    } : null,

    // Anchor History
    anchorHistory: anchors || [],

    // Recommendations
    recommendations: recommendations || [],

    // Metadata
    metadata: {
      phasesCompleted: getCompletedPhases(currentPhase),
      totalDuration: estimateTotalDuration(context),
      confidenceLevel: calculateConfidenceLevel(context)
    }
  };

  return auditPackage;
};

/**
 * Generate executive summary
 */
const generateExecutiveSummary = (context) => {
  const { currentPhase, tdsScores, juryResult, skepticValidation, causalValidation } = context;

  let summary = `## VERDICT Pipeline Audit\n\n`;
  summary += `**Current Phase:** ${currentPhase}\n`;
  summary += `**Generated:** ${new Date().toISOString()}\n\n`;

  // Status assessment
  let status = 'Ready to proceed';
  let statusColor = 'green';

  if (skepticValidation?.overallAssessment === 'negative') {
    status = 'Skeptic raised significant concerns';
    statusColor = 'red';
  } else if (causalValidation?.overallStrength === 'weak') {
    status = 'Causal chain needs strengthening';
    statusColor = 'yellow';
  } else if (juryResult?.finalDecision === 'reject') {
    status = 'Jury rejected the proposal';
    statusColor = 'red';
  }

  summary += `**Status:** :${statusColor}[${status}]\n\n`;

  // Key metrics
  summary += `### Key Metrics\n\n`;
  if (tdsScores) {
    summary += `- **Overall Difficulty:** ${calculateOverallDifficulty(tdsScores).toFixed(1)}/10\n`;
  }
  if (context.miraResults) {
    summary += `- **Calibration Score:** ${(context.miraResults.calibrationScore * 100).toFixed(0)}%\n`;
  }
  if (juryResult) {
    summary += `- **Jury Approval:** ${(juryResult.approvalRate * 100).toFixed(0)}%\n`;
    summary += `- **Consensus:** ${juryResult.consensusLevel}\n`;
    summary += `- **Average Certainty:** ${juryResult.averageCertainty.toFixed(1)}/10\n`;
  }
  if (causalValidation) {
    summary += `- **Causal Validity:** ${causalValidation.isValid ? 'Valid' : 'Invalid'}\n`;
    summary += `- **Causal Strength:** ${causalValidation.overallStrength}\n`;
  }

  summary += `\n### Recommendation\n\n`;
  summary += getRecommendation(context);

  return summary;
};

/**
 * Calculate overall difficulty
 */
const calculateOverallDifficulty = (scores) => {
  const weights = {
    technicalComplexity: 0.30,
    infrastructureImpact: 0.20,
    securityRisk: 0.25,
    timeConstraint: 0.15,
    resourceAvailability: 0.10
  };

  let total = 0;
  for (const [key, weight] of Object.entries(weights)) {
    total += (scores[key] || 5) * weight;
  }
  return total;
};

/**
 * Determine risk level
 */
const determineRiskLevel = (scores) => {
  const overall = calculateOverallDifficulty(scores);
  
  if (overall >= 8) return 'critical';
  if (overall >= 6) return 'high';
  if (overall >= 4) return 'medium';
  return 'low';
};

/**
 * Include MIRA report
 */
const includeMIRAReport = (miraResults) => {
  if (!miraResults) return null;

  return {
    calibrationScore: miraResults.calibrationScore,
    accuracy: miraResults.accuracy,
    avgConfidence: miraResults.avgConfidence,
    miscalibrationPenalty: miraResults.miscalibrationPenalty,
    confidenceInterval: miraResults.confidenceInterval,
    details: miraResults.details,
    interpretation: interpretCalibration(miraResults.calibrationScore),
    recommendations: getCalibrationRecommendations(miraResults)
  };
};

/**
 * Interpret calibration score
 */
const interpretCalibration = (score) => {
  if (score >= 0.9) return 'Excellent calibration - confidence matches accuracy';
  if (score >= 0.8) return 'Good calibration - minor adjustments needed';
  if (score >= 0.7) return 'Adequate calibration - some bias present';
  if (score >= 0.5) return 'Poor calibration - significant adjustments recommended';
  return 'Very poor calibration - re-calibration required';
};

/**
 * Get calibration recommendations
 */
const getCalibrationRecommendations = (miraResults) => {
  const recommendations = [];
  
  if (miraResults.miscalibrationPenalty > 0.2) {
    recommendations.push('High miscalibration detected - reduce confidence in outputs');
  }
  
  if (miraResults.accuracy < 0.7) {
    recommendations.push('Low accuracy on HCQs - consider additional training');
  }

  if (miraResults.confidenceInterval[1] - miraResults.confidenceInterval[0] > 0.3) {
    recommendations.push('Wide confidence interval - outputs have high variance');
  }

  return recommendations;
};

/**
 * Include jury decision
 */
const includeJuryDecision = (juryResult) => {
  if (!juryResult) return null;

  return {
    finalDecision: juryResult.finalDecision,
    approvalRate: juryResult.approvalRate,
    consensusLevel: juryResult.consensusLevel,
    averageCertainty: juryResult.averageCertainty,
    hasQuorum: juryResult.hasQuorum,
    votes: juryResult.breakdown,
    summary: generateJurySummary(juryResult),
    canProceed: juryResult.finalDecision !== 'reject'
  };
};

/**
 * Extract task list from graph
 */
const extractTaskList = (taskGraph) => {
  if (!taskGraph.tasks) return [];
  
  const tasks = taskGraph.tasks instanceof Map 
    ? Array.from(taskGraph.tasks.values()) 
    : taskGraph.tasks;

  return tasks.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description,
    priority: t.priority,
    status: t.status,
    dependencies: t.dependencies
  }));
};

/**
 * Get completed phases
 */
const getCompletedPhases = (currentPhase) => {
  const phaseOrder = Object.values(PHASES);
  const currentIndex = phaseOrder.indexOf(currentPhase);
  return currentIndex >= 0 ? phaseOrder.slice(0, currentIndex) : [];
};

/**
 * Estimate total duration
 */
const estimateTotalDuration = (context) => {
  // Simplified estimation
  const phaseEstimates = {
    [PHASES.REFINING]: 60,
    [PHASES.PLANNING]: 120,
    [PHASES.RESEARCH]: 300,
    [PHASES.IMPLEMENTATION]: 600,
    [PHASES.CLOSE_OUT]: 60
  };

  let total = 0;
  const completedPhases = getCompletedPhases(context.currentPhase);
  
  for (const phase of completedPhases) {
    total += phaseEstimates[phase] || 60;
  }

  return total;
};

/**
 * Calculate confidence level
 */
const calculateConfidenceLevel = (context) => {
  let confidence = 0.5;

  if (context.miraResults?.calibrationScore) {
    confidence += context.miraResults.calibrationScore * 0.2;
  }

  if (context.juryResult?.averageCertainty) {
    confidence += (context.juryResult.averageCertainty / 10) * 0.2;
  }

  if (context.causalValidation?.isValid) {
    confidence += 0.1;
  }

  if (context.skepticValidation?.isValid !== false) {
    confidence += 0.1;
  }

  return Math.min(1, confidence);
};

/**
 * Get recommendation
 */
const getRecommendation = (context) => {
  if (context.juryResult?.finalDecision === 'reject') {
    return '**Action Required:** Address jury concerns before proceeding. Review rejected points and make necessary adjustments.';
  }

  if (context.skepticValidation?.overallAssessment === 'negative') {
    return '**Caution:** Skeptic validation raised concerns. Address adversarial findings before proceeding.';
  }

  if (context.causalValidation?.overallStrength === 'weak') {
    return '**Attention:** Causal chain is weak. Strengthen causal links or add supporting evidence.';
  }

  if (context.juryResult?.consensusLevel === 'unanimous') {
    return '**Proceed:** All branches unanimously approve. High confidence in the plan.';
  }

  return '**Proceed with Monitoring:** Plan approved with conditions. Continue monitoring for issues.';
};

/**
 * Render audit package for display
 */
export const renderAuditPackage = (auditPackage) => {
  const sections = [];

  // Header
  sections.push(`# VERDICT Audit Package`);
  sections.push(`Generated: ${auditPackage.generatedAt}`);
  sections.push(`Session: ${auditPackage.sessionId}`);
  sections.push('');

  // Executive Summary
  sections.push('## Executive Summary');
  sections.push(auditPackage.executiveSummary);
  sections.push('');

  // TDS Analysis
  if (auditPackage.tdsdsAnalysis) {
    sections.push('## TDS Analysis');
    sections.push(JSON.stringify(auditPackage.tdsAnalysis, null, 2));
    sections.push('');
  }

  // MIRA Report
  if (auditPackage.miraReport) {
    sections.push('## MIRA Calibration Report');
    sections.push(`Calibration Score: ${(auditPackage.miraReport.calibrationScore * 100).toFixed(0)}%`);
    sections.push(`Interpretation: ${auditPackage.miraReport.interpretation}`);
    sections.push('');
  }

  // Jury Decision
  if (auditPackage.juryDecision) {
    sections.push('## Jury Decision');
    sections.push(`Final Decision: ${auditPackage.juryDecision.finalDecision.toUpperCase()}`);
    sections.push(`Approval Rate: ${(auditPackage.juryDecision.approvalRate * 100).toFixed(0)}%`);
    sections.push(`Consensus: ${auditPackage.juryDecision.consensusLevel}`);
    sections.push('');
  }

  // Recommendations
  if (auditPackage.recommendations?.length > 0) {
    sections.push('## Recommendations');
    auditPackage.recommendations.forEach(rec => {
      sections.push(`- [${rec.priority}] ${rec.message}`);
    });
  }

  return sections.join('\n');
};

export default {
  APPROVAL_GATE_CONFIG,
  generateAuditPackage,
  renderAuditPackage
};
