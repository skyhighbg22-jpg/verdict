/**
 * Pipeline Self-Analysis
 * Meta-analysis and Self-Improvement Proposal generation
 */

import { PHASES } from '../types';
import { statePersistence } from '../state/statePersistence';

/**
 * Self-Analysis Configuration
 */
export const SELF_ANALYSIS_CONFIG = {
  analysisInterval: 3600000, // 1 hour
  minDataPointsForAnalysis: 3,
  improvementThreshold: 0.1, // 10% improvement potential
  trackPatterns: true,
  generateProposals: true
};

/**
 * Pipeline metrics to track
 */
export const METRIC_TYPES = {
  PHASE_DURATION: 'phase_duration',
  APPROVAL_RATE: 'approval_rate',
  CALIBRATION_ACCURACY: 'calibration_accuracy',
  CONSENSUS_TIME: 'consensus_time',
  ERROR_RATE: 'error_rate',
  RETRY_COUNT: 'retry_count',
  USER_SATISFACTION: 'user_satisfaction'
};

/**
 * Analyze pipeline performance
 */
export const analyzePipelinePerformance = async (sessionId) => {
  // Get state history for analysis
  const history = await statePersistence.getStateHistory(sessionId);
  
  const analysis = {
    sessionId,
    analyzedAt: new Date().toISOString(),
    totalPhases: history.length,
    metrics: {},
    patterns: [],
    recommendations: []
  };

  // Calculate phase durations
  const phaseDurations = calculatePhaseDurations(history);
  analysis.metrics.phaseDurations = phaseDurations;

  // Calculate averages
  analysis.metrics.averagePhaseDuration = 
    Object.values(phaseDurations).reduce((a, b) => a + b, 0) / Object.values(phaseDurations).length;

  // Detect patterns
  if (SELF_ANALYSIS_CONFIG.trackPatterns) {
    analysis.patterns = detectPatterns(history, phaseDurations);
  }

  // Generate improvement proposals
  if (SELF_ANALYSIS_CONFIG.generateProposals) {
    analysis.recommendations = generateImprovementProposals(analysis);
  }

  return analysis;
};

/**
 * Calculate phase durations from history
 */
const calculatePhaseDurations = (history) => {
  const durations = {};

  // Group by phase
  const phaseHistory = {};
  for (const entry of history) {
    if (!phaseHistory[entry.phase]) {
      phaseHistory[entry.phase] = [];
    }
    phaseHistory[entry.phase].push(entry);
  }

  // Calculate duration for each phase
  for (const [phase, entries] of Object.entries(phaseHistory)) {
    if (entries.length >= 2) {
      // Sort by timestamp
      entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      // Calculate duration between first and last
      const first = new Date(entries[0].timestamp);
      const last = new Date(entries[entries.length - 1].timestamp);
      durations[phase] = (last - first) / 1000; // seconds
    }
  }

  return durations;
};

/**
 * Detect patterns in pipeline execution
 */
const detectPatterns = (history, phaseDurations) => {
  const patterns = [];

  // Pattern 1: Long-running phases
  const avgDuration = Object.values(phaseDurations).reduce((a, b) => a + b, 0) / 
    Math.max(Object.values(phaseDurations).length, 1);
  
  for (const [phase, duration] of Object.entries(phaseDurations)) {
    if (duration > avgDuration * 1.5) {
      patterns.push({
        type: 'slow_phase',
        phase,
        severity: 'medium',
        description: `${phase} takes ${((duration / avgDuration - 1) * 100).toFixed(0)}% longer than average`,
        metric: duration,
        average: avgDuration
      });
    }
  }

  // Pattern 2: Repeated failures
  const failureCount = history.filter(h => h.state?.error).length;
  if (failureCount > history.length * 0.2) {
    patterns.push({
      type: 'high_failure_rate',
      severity: 'high',
      description: `Failure rate of ${((failureCount / history.length) * 100).toFixed(0)}% is elevated`,
      metric: failureCount / history.length
    });
  }

  // Pattern 3: Repeated approvals
  const approvalCount = history.filter(h => h.state?.approval === 'approved').length;
  if (approvalCount > history.length * 0.8) {
    patterns.push({
      type: 'high_approval_rate',
      severity: 'low',
      description: 'Approval rate is very high - may indicate insufficient scrutiny',
      metric: approvalCount / history.length
    });
  }

  return patterns;
};

/**
 * Generate improvement proposals
 */
const generateImprovementProposals = (analysis) => {
  const proposals = [];

  // Proposal 1: Address slow phases
  const slowPhases = analysis.patterns.filter(p => p.type === 'slow_phase');
  if (slowPhases.length > 0) {
    proposals.push({
      id: generateProposalId(),
      area: 'pipeline',
      issue: `${slowPhases.length} phase(s) running slower than average`,
      proposedSolution: `Optimize ${slowPhases.map(p => p.phase).join(', ')} by:
- Caching intermediate results
- Parallelizing independent tasks
- Reducing redundant validation`,
      expectedImpact: 0.3, // 30% improvement expected
      priority: 'high',
      createdAt: new Date().toISOString()
    });
  }

  // Proposal 2: Address high failure rate
  const failurePattern = analysis.patterns.find(p => p.type === 'high_failure_rate');
  if (failurePattern) {
    proposals.push({
      id: generateProposalId(),
      area: 'validation',
      issue: 'Elevated failure rate detected',
      proposedSolution: `Improve validation:
- Add more comprehensive error handling
- Implement retry logic with exponential backoff
- Add pre-flight checks before critical operations`,
      expectedImpact: 0.5,
      priority: 'critical',
      createdAt: new Date().toISOString()
    });
  }

  // Proposal 3: Calibration improvement
  proposals.push({
    id: generateProposalId(),
    area: 'calibration',
    issue: 'MIRA calibration can be improved',
    proposedSolution: `Enhance calibration:
- Add more diverse HCQ types
- Implement calibration feedback loops
- Track calibration over time`,
    expectedImpact: 0.2,
    priority: 'medium',
    createdAt: new Date().toISOString()
  });

  // Proposal 4: Consensus optimization
  proposals.push({
    id: generateProposalId(),
    area: 'planning',
    issue: 'Consensus building can be faster',
    proposedSolution: `Speed up consensus:
- Pre-compute common agreement patterns
- Use weighted voting more aggressively
- Cache planning branch results for similar tasks`,
    expectedImpact: 0.25,
    priority: 'medium',
    createdAt: new Date().toISOString()
  });

  return proposals;
};

let proposalCounter = 0;
const generateProposalId = () => {
  proposalCounter++;
  return `proposal_${Date.now()}_${proposalCounter}`;
};

/**
 * Self-improvement proposal
 */
export const SelfImprovementProposal = {
  /**
   * Create a new proposal
   */
  create(area, issue, solution, expectedImpact, priority = 'medium') {
    return {
      id: generateProposalId(),
      area,
      issue,
      proposedSolution: solution,
      expectedImpact,
      priority,
      status: 'pending',
      createdAt: new Date().toISOString(),
      implementedAt: null,
      impactAchieved: null
    };
  },

  /**
   * Mark proposal as implemented
   */
  markImplemented(proposal, actualImpact) {
    return {
      ...proposal,
      status: 'implemented',
      implementedAt: new Date().toISOString(),
      impactAchieved: actualImpact
    };
  },

  /**
   * Reject proposal
   */
  reject(proposal, reason) {
    return {
      ...proposal,
      status: 'rejected',
      rejectionReason: reason,
      rejectedAt: new Date().toISOString()
    };
  }
};

/**
 * Cross-session meta-analysis
 */
export const performMetaAnalysis = async (allSessions) => {
  const metaAnalysis = {
    analyzedAt: new Date().toISOString(),
    totalSessions: allSessions.length,
    aggregateMetrics: {},
    commonPatterns: [],
    globalRecommendations: []
  };

  // Aggregate metrics across sessions
  const phaseDurationsAll = {};
  let totalApprovals = 0;
  let totalRejections = 0;
  let totalErrors = 0;

  for (const session of allSessions) {
    const history = session.history || [];
    
    for (const entry of history) {
      // Track phase durations
      if (entry.phase) {
        if (!phaseDurationsAll[entry.phase]) {
          phaseDurationsAll[entry.phase] = [];
        }
        // Estimate duration from timestamps
        if (entry.timestamp) {
          phaseDurationsAll[entry.phase].push(new Date(entry.timestamp).getTime());
        }
      }

      // Track approvals/rejections
      if (entry.state?.approval === 'approved') totalApprovals++;
      if (entry.state?.approval === 'rejected') totalRejections++;
      if (entry.state?.error) totalErrors++;
    }
  }

  // Calculate aggregate metrics
  metaAnalysis.aggregateMetrics = {
    totalEntries: allSessions.reduce((sum, s) => sum + (s.history?.length || 0), 0),
    approvalRate: totalApprovals / (totalApprovals + totalRejections + 1),
    errorRate: totalErrors / (totalApprovals + totalRejections + totalErrors + 1),
    avgPhaseDurations: Object.fromEntries(
      Object.entries(phaseDurationsAll).map(([k, v]) => [k, v.length > 0 ? 
        (Math.max(...v) - Math.min(...v)) / v.length / 1000 : 0])
    )
  };

  // Find common patterns
  metaAnalysis.commonPatterns = findCommonPatterns(allSessions);

  // Generate global recommendations
  metaAnalysis.globalRecommendations = generateGlobalRecommendations(metaAnalysis);

  return metaAnalysis;
};

/**
 * Find common patterns across sessions
 */
const findCommonPatterns = (sessions) => {
  const patterns = [];

  // Check for common slow phases
  const phaseDurations = {};
  for (const session of sessions) {
    // Aggregate phase data
  }

  return patterns;
};

/**
 * Generate global recommendations
 */
const generateGlobalRecommendations = (metaAnalysis) => {
  const recommendations = [];

  const { aggregateMetrics } = metaAnalysis;

  // High error rate
  if (aggregateMetrics.errorRate > 0.15) {
    recommendations.push({
      priority: 'critical',
      recommendation: 'Global error rate is elevated - investigate root causes',
      metric: aggregateMetrics.errorRate
    });
  }

  // Low approval rate
  if (aggregateMetrics.approvalRate < 0.5) {
    recommendations.push({
      priority: 'high',
      recommendation: 'Approval rate is low - review gating criteria',
      metric: aggregateMetrics.approvalRate
    });
  }

  return recommendations;
};

export default {
  SELF_ANALYSIS_CONFIG,
  METRIC_TYPES,
  analyzePipelinePerformance,
  performMetaAnalysis,
  SelfImprovementProposal
};
