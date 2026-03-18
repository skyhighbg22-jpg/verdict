/**
 * Pipeline Types
 * Core constants and enums for the VERDICT pipeline
 * This file has no dependencies to avoid circular imports
 */

/**
 * Pipeline Phases
 */
export const PHASES = {
  REFINING: 'Refining',
  PLANNING: 'Planning',
  RESEARCH: 'Research',
  IMPLEMENTATION: 'Implementation',
  CLOSE_OUT: 'Close-Out',
};

/**
 * Anchor Versions
 */
export const ANCHOR_VERSIONS = ['v0', 'v1', 'v2', 'v3'];

/**
 * Pipeline Status Enum
 */
export const PIPELINE_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  PENDING_APPROVAL: 'pending_approval',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

/**
 * TDS Categories
 */
export const TDS_CATEGORIES = {
  TECHNICAL_COMPLEXITY: 'technicalComplexity',
  INFRASTRUCTURE_IMPACT: 'infrastructureImpact',
  SECURITY_RISK: 'securityRisk',
  TIME_CONSTRAINT: 'timeConstraint',
  RESOURCE_AVAILABILITY: 'resourceAvailability'
};

/**
 * Task Status
 */
export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  BLOCKED: 'blocked'
};

/**
 * Task Priority
 */
export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Approval Types
 */
export const APPROVAL_TYPES = {
  TDS_ROUTING: 'tds_routing',
  GDE_DECOMPOSITION: 'gde_decomposition',
  ADVERSARIAL_REVIEW: 'adversarial_review',
  CAUSAL_VALIDATION: 'causal_validation',
  IMPLEMENTATION: 'implementation',
  FINAL_APPROVAL: 'final_approval'
};

/**
 * Audit Event Types
 */
export const AUDIT_EVENTS = {
  PIPELINE_START: 'pipeline_start',
  PHASE_START: 'phase_start',
  PHASE_COMPLETE: 'phase_complete',
  PHASE_CHANGE: 'phase_change',
  TDS_ANALYSIS_COMPLETE: 'tds_analysis_complete',
  MIRA_CALIBRATION_COMPLETE: 'mira_calibration_complete',
  APPROVAL_REQUESTED: 'approval_requested',
  APPROVAL_GRANTED: 'approval_granted',
  APPROVAL_REJECTED: 'approval_rejected',
  ERROR_OCCURRED: 'error_occurred',
  ERROR_RETRY: 'error_retry',
  STATE_PERSISTED: 'state_persisted',
  STATE_RESTORED: 'state_restored',
  PIPELINE_RESET: 'pipeline_reset',
  ANCHOR_VERSION_CHANGE: 'anchor_version_change'
};
