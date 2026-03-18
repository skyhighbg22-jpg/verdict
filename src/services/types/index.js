/**
 * VERDICT Core Engine Type Definitions
 * Comprehensive TypeScript-style type definitions for all VERDICT components
 */

// Re-export from centralized types to avoid duplication
export { PHASES, ANCHOR_VERSIONS, PIPELINE_STATUS } from '../../types/pipeline.js';

// ============================================================================
// TDS (Task Difficulty Score) Types
// ============================================================================

export const TDS_CATEGORIES = {
  technicalComplexity: 'technicalComplexity',
  infrastructureImpact: 'infrastructureImpact',
  securityRisk: 'securityRisk',
  timeConstraint: 'timeConstraint',
  resourceAvailability: 'resourceAvailability'
};

/**
 * @typedef {Object} TDSScores
 * @property {number} technicalComplexity - 1-10 score
 * @property {number} infrastructureImpact - 1-10 score
 * @property {number} securityRisk - 1-10 score
 * @property {number} timeConstraint - 1-10 score
 * @property {number} resourceAvailability - 1-10 score
 */

export const DEFAULT_TDS_SCORES = {
  technicalComplexity: 5,
  infrastructureImpact: 5,
  securityRisk: 5,
  timeConstraint: 5,
  resourceAvailability: 5
};

/**
 * @typedef {Object} TDSRouting
 * @property {string} complexityLevel - Simple|Moderate|Complex|Critical
 * @property {number} overall - Overall difficulty score (0-10)
 * @property {string} recommendedApproach
 * @property {number} estimatedCycles
 * @property {string[]} highRiskIndicators
 * @property {boolean} requiresHumanApproval
 */

// ============================================================================
// MIRA Calibration Types
// ============================================================================

/**
 * @typedef {Object} HiddenControlQuestion
 * @property {string} id - Unique identifier
 * @property {string} type - Question type (factual_recall, reasoning, etc.)
 * @property {string} question
 * @property {string} correctAnswer
 * @property {string[]} options
 * @property {string} difficulty - easy|medium|hard
 * @property {string} domain - Question domain
 */

/**
 * @typedef {Object} HCQResponse
 * @property {string} questionId
 * @property {string} selectedAnswer
 * @property {number} confidence - 0-1 confidence score
 * @property {number} responseTime - Response time in ms
 */

/**
 * @typedef {Object} CalibrationResult
 * @property {number} calibrationScore - 0-1 score
 * @property {number} accuracy - 0-1 accuracy on HCQs
 * @property {number} avgConfidence - Average confidence
 * @property {number} miscalibrationPenalty - Penalty score
 * @property {number[]} confidenceInterval - [lower, upper]
 * @property {Array} details - Detailed response analysis
 * @property {string} lastUpdated - ISO timestamp
 */

// ============================================================================
// GDE (Goal Decomposition) Types
// ============================================================================

export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  BLOCKED: 'blocked',
  FAILED: 'failed'
};

export const TASK_PRIORITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

/**
 * @typedef {Object} TaskNode
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} priority
 * @property {string} status
 * @property {string[]} dependencies - Task IDs this depends on
 * @property {string[]} dependents - Task IDs that depend on this
 * @property {string|null} assignedTo
 * @property {number|null} estimatedEffort
 * @property {number|null} actualEffort
 * @property {string} createdAt - ISO timestamp
 * @property {string|null} startedAt
 * @property {string|null} completedAt
 * @property {Object} metadata
 */

/**
 * @typedef {Object} TaskGraph
 * @property {Map<string, TaskNode>} tasks
 * @property {Map<string, string[]>} adjacencyList
 * @property {Map<string, string[]>} reverseList
 * @property {Map<string, number>} inDegree
 * @property {Function} getTopologicalOrder
 * @property {Function} getParallelGroups
 */

/**
 * @typedef {Object} EpistemicStatus
 * @property {string} status - known|unknown|uncertain|disputed
 * @property {number} certainty - 0-1 confidence
 * @property {string} source - Evidence source
 * @property {string} lastVerified - ISO timestamp
 */

/**
 * @typedef {Object} GDEResult
 * @property {TaskNode[]} tasks
 * @property {TaskGraph} dag
 * @property {string[][]} parallelGroups
 * @property {Object} metadata
 * @property {string[]} unknownUnknowns - Detected unknowns
 * @property {Map<string, EpistemicStatus>} epistemicStatuses
 */

// ============================================================================
// Causal Validator Types
// ============================================================================

export const FALLACY_TYPES = {
  AD_HOMINEM: 'Ad Hominem',
  STRAW_MAN: 'Straw Man',
  FALSE_DILEMMA: 'False Dilemma',
  SLIPPERY_SLOPE: 'Slippery Slope',
  CIRCULAR_REASONING: 'Circular Reasoning',
  HASTY_GENERALIZATION: 'Hasty Generalization',
  RED_HERRING: 'Red Herring',
  APPEAL_TO_AUTHORITY: 'Appeal to Authority',
  APPEAL_TO_EMOTION: 'Appeal to Emotion',
  POST_HOC: 'Post Hoc Ergo Propter Hoc',
  CONFIRMATION_BIAS: 'Confirmation Bias',
  SUNK_COST_FALLACY: 'Sunk Cost Fallacy'
};

export const SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info'
};

export const CAUSAL_STRENGTH = {
  STRONG: 'strong',
  MODERATE: 'moderate',
  WEAK: 'weak',
  NONE: 'none'
};

/**
 * @typedef {Object} CausalLink
 * @property {string} cause
 * @property {string} effect
 * @property {string} evidence
 * @property {string} evidenceType - empirical|logical|inferred|assumed
 * @property {number} strength - 0-1 strength score
 * @property {boolean} isCounterfactual
 */

/**
 * @typedef {Object} CausalValidationResult
 * @property {boolean} isValid
 * @property {string} overallStrength
 * @property {Array} issues
 * @property {string[]} recommendations
 * @property {Array} links
 * @property {CausalLink[]} causalLinks
 * @property {CausalLink[]} counterfactuals
 * @property {string[]} falsifyingEvidence
 */

// ============================================================================
// Skeptic Agent Types
// ============================================================================

/**
 * @typedef {Object} SkepticResult
 * @property {string} overallAssessment - positive|neutral|negative|conditional
 * @property {boolean} isValid
 * @property {string[]} criticalIssues
 * @property {string[]} weaknesses
 * @property {string[]} strengths
 * @property {string[]} recommendations
 * @property {string[]} adversarialPoints
 * @property {string} validatedAt - ISO timestamp
 */

// ============================================================================
// Jury Evaluation Types
// ============================================================================

/**
 * @typedef {Object} JuryVote
 * @property {string} agentId - Agent identifier
 * @property {string} agentRole - Role (architect, auditor, designer, antithetical)
 * @property {string} decision - approve|reject|hold
 * @property {number} certaintyScore - 1-10 certainty
 * @property {string} reasoning
 * @property {string} timestamp - ISO timestamp
 */

/**
 * @typedef {Object} JuryResult
 * @property {string} finalDecision
 * @property {number} approvalRate - 0-1
 * @property {string} consensusLevel - unanimous|supermajority|majority|deadlock
 * @property {JuryVote[]} votes
 * @property {number} averageCertainty
 * @property {number} supermajorityThreshold
 * @property {Object} weightAdjustments
 */

// ============================================================================
// Four-Branch Planning Types
// ============================================================================

export const PLANNING_BRANCHES = {
  ARCHITECT: 'Systems Architect',
  AUDITOR: 'Security Auditor',
  DESIGNER: 'Product Designer',
  ANTITHETICAL: 'Antithetical'
};

/**
 * @typedef {Object} PlanningBranch
 * @property {string} id
 * @property {string} role
 * @property {string} name
 * @property {string} perspective
 * @property {string[]} responsibilities
 * @property {Object} analysis
 * @property {string} recommendation
 * @property {number} weight - MIRA-weighted influence
 */

/**
 * @typedef {Object} PlanningResult
 * @property {PlanningBranch[]} branches
 * @property {string[]} unanimousSteps - Steps all branches agree on
 * @property {Object[]} divergingPoints - Points of disagreement
 * @property {Object} synthesis
 * @property {boolean} antitheticalActivated - Whether antithetical branch was used
 * @property {number} consensusPercentage
 */

// ============================================================================
// Advisory Layer Types
// ============================================================================

export const ADVISORY_QUERY_TYPES = {
  LIVE_FACT: 'live_fact',
  MARKET_DATA: 'market_data',
  TECHNICAL_STATUS: 'technical_status',
  NEWS_CHECK: 'news_check',
  REAL_TIME_ANALYTICS: 'real_time_analytics'
};

/**
 * @typedef {Object} AdvisoryQuery
 * @property {string} query
 * @property {string} type
 * @property {Object} parameters
 * @property {boolean} requireLiveData
 */

/**
 * @typedef {Object} AdvisoryResult
 * @property {string} answer
 * @property {number} confidence - 0-1
 * @property {string[]} sources
 * @property {boolean} isStale - Whether data is cached vs live
 * @property {string} retrievedAt - ISO timestamp
 */

// ============================================================================
// GEL (Global Epistemic Ledger) Types
// ============================================================================

export const GEL_PROVIDERS = {
  PINECONE: 'pinecone',
  WEAVIATE: 'weaviate'
};

export const EPISTEMIC_STATUS = {
  VERIFIED: 'verified',
  UNCERTAIN: 'uncertain',
  DISPUTED: 'disputed',
  UNKNOWN: 'unknown',
  PENDING: 'pending'
};

/**
 * @typedef {Object} GELEntry
 * @property {string} id
 * @property {string} fact - The factual claim
 * @property {number} certainty - 0-1 confidence
 * @property {string} status
 * @property {string} source - Origin of the fact
 * @property {string[]} supportingEvidence
 * @property {string[]} contradictingEvidence
 * @property {string} createdAt - ISO timestamp
 * @property {string} lastVerified - ISO timestamp
 * @property {number} ttl - Time to live in seconds
 * @property {Object} metadata - Additional metadata
 * @property {string} strategyMemory - Associated strategy
 */

/**
 * @typedef {Object} GELConsensus
 * @property {string} factId
 * @property {boolean} hasConsensus
 * @property {string} provider1Status
 * @property {string} provider2Status
 * @property {string} lockedValue
 * @property {number} lockTimestamp
 */

// ============================================================================
// State Persistence Types
// ============================================================================

export const STATE_LAYERS = {
  REDIS: 'redis_hot',
  POSTGRES: 'postgres_structured'
};

/**
 * @typedef {Object} SessionCheckpoint
 * @property {string} sessionId
 * @property {number} checkpointId
 * @property {string} phase
 * @property {Object} state
 * @property {string} createdAt
 * @property {string} description
 */

// ============================================================================
// Anchor & Reconciliation Types
// ============================================================================

// ANCHOR_VERSIONS is re-exported from pipeline.js above

/**
 * @typedef {Object} Anchor
 * @property {string} version
 * @property {string} phase
 * @property {Object} output - Phase output data
 * @property {string} createdAt
 * @property {Object} metadata
 */

/**
 * @typedef {Object} ReconciliationDebate
 * @property {string} id
 * @property {string} conflictingAnchor1
 * @property {string} conflictingAnchor2
 * @property {string} issue
 * @property {JuryVote[]} arguments
 * @property {number} weightedDecision - Certainty-weighted resolution
 * @property {string} resolution
 * @property {string} resolvedAt
 */

// ============================================================================
// Model Client Types
// ============================================================================

export const MODEL_TYPES = {
  GPT_5_4_PRO: 'gpt-5.4-pro',
  CLAUDE_OPUS_4_6: 'claude-opus-4.6',
  GEMINI_3_1_PRO: 'gemini-3.1-pro',
  GROK_4_2: 'grok-4.2'
};

export const MODEL_ROLES = {
  TDS_ANALYSIS: 'tds_analysis',
  GDE_DECOMPOSITION: 'gde_decomposition',
  MIRA_CALIBRATION: 'mira_calibration',
  SKEPTIC_VALIDATION: 'skeptic_validation',
  PLANNING_BRANCH: 'planning_branch',
  ADVISORY_QUERY: 'advisory_query',
  GENERAL_INFERENCE: 'general_inference'
};

/**
 * @typedef {Object} ModelConfig
 * @property {string} modelId
 * @property {string} role
 * @property {string} systemPrompt
 * @property {number} temperature
 * @property {number} maxTokens
 * @property {Object} additionalParams
 */

// ============================================================================
// Self-Analysis & Improvement Types
// ============================================================================

/**
 * @typedef {Object} PipelineMetrics
 * @property {number} totalPhases
 * @property {number} completedPhases
 * @property {number} averagePhaseTime
 * @property {number} approvalRate
 * @property {number} calibrationAccuracy
 * @property {Object} phaseBreakdown
 */

/**
 * @typedef {Object} SelfImprovementProposal
 * @property {string} id
 * @property {string} area - pipeline|calibration|validation|planning
 * @property {string} issue
 * @property {string} proposedSolution
 * @property {number} expectedImpact
 * @property {string} priority
 */

// ============================================================================
// Error Types
// ============================================================================

export const ERROR_CODES = {
  API_ERROR: 'API_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  CONSENSUS_ERROR: 'CONSENSUS_ERROR',
  STATE_ERROR: 'STATE_ERROR'
};

/**
 * @typedef {Object} VERDICTError
 * @property {string} code
 * @property {string} message
 * @property {Object} details
 * @property {string} timestamp
 * @property {string} recoverable
 */

// Export all enums and types as a single object for convenience
export const TYPES = {
  PIPELINE_STATUS,
  PHASES,
  TDS_CATEGORIES,
  TASK_STATUS,
  TASK_PRIORITY,
  FALLACY_TYPES,
  SEVERITY,
  CAUSAL_STRENGTH,
  PLANNING_BRANCHES,
  ADVISORY_QUERY_TYPES,
  GEL_PROVIDERS,
  EPISTEMIC_STATUS,
  STATE_LAYERS,
  ANCHOR_VERSIONS,
  MODEL_TYPES,
  MODEL_ROLES,
  ERROR_CODES
};

export default TYPES;
