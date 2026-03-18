import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { PHASES, ANCHOR_VERSIONS, PIPELINE_STATUS } from '../types/pipeline.js';
import { executePipeline, PHASE_TRANSITIONS, getNextPhase } from '../services/pipelineEngine';
import { runMiraCalibration } from '../services/miraEngine';
import { runTDSAnalysis, DEFAULT_TDS_SCORES } from '../services/tdsRouter';
import { statePersistence } from '../services/state/statePersistence';
import { auditLogService, AUDIT_EVENTS } from '../services/auditLog';

const PipelineContext = createContext();

// Re-export from types/pipeline.js for backward compatibility
export { PHASES, ANCHOR_VERSIONS, PIPELINE_STATUS } from '../types/pipeline.js';

/**
 * Initial state for the pipeline
 */
const initialState = {
  // Core state
  activePhase: PHASES.REFINING,
  anchorVersion: 'v0',
  pipelineStatus: PIPELINE_STATUS.IDLE,
  
  // User input
  userPrompt: '',
  
  // TDS (Task Difficulty Score)
  tdsScores: DEFAULT_TDS_SCORES,
  tdsRouting: null,
  
  // MIRA Calibration
  miraResults: {
    calibrationScore: 0.85,
    confidenceInterval: [0.8, 0.9],
    miscalibrationPenalty: 0,
    accuracy: 0,
    avgConfidence: 0,
    lastUpdated: new Date().toISOString()
  },
  
  // GDE (Goal Decomposition)
  taskGraph: null,
  causalChain: [],
  
  // Skeptic/Causal Validation
  skepticValidation: null,
  adversarialFindings: null,
  causalValidation: null,
  
  // Research Phase
  mainResearch: null,
  researchComparison: null,
  
  // Implementation
  executionLog: [],
  completedTasks: [],
  verification: null,
  
  // Close-Out
  finalCalibration: null,
  summaryReport: null,
  
  // Approval state
  pendingApproval: null,
  approvalHistory: [],
  
  // Loading states
  isProcessing: false,
  processingPhase: null,
  error: null
};

export const PipelineProvider = ({ children }) => {
  const [state, setState] = useState(() => {
    // Try to restore from localStorage on initial load
    const persistedState = statePersistence.loadPersistedState();
    if (persistedState) {
      // Log state restoration
      auditLogService.logEvent(AUDIT_EVENTS.STATE_RESTORED, {
        savedAt: persistedState._savedAt,
        activePhase: persistedState.activePhase
      });
      return { ...initialState, ...persistedState, _persisted: true };
    }
    return initialState;
  });

  // Persist state changes to localStorage
  useEffect(() => {
    if (!state._persisted || state.pipelineStatus === PIPELINE_STATUS.IDLE) return;
    
    const persistTimeout = setTimeout(() => {
      statePersistence.persistState(state);
      auditLogService.logEvent(AUDIT_EVENTS.STATE_PERSISTED, {
        activePhase: state.activePhase,
        pipelineStatus: state.pipelineStatus
      });
    }, 500); // Debounce persistence

    return () => clearTimeout(persistTimeout);
  }, [state]);

  /**
   * Update state with a partial update
   */
  const updateState = useCallback((updates) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Set user prompt and initialize analysis
   */
  const setUserPrompt = useCallback(async (prompt) => {
    updateState({ userPrompt: prompt, isProcessing: true, processingPhase: 'initializing', error: null });
    
    // Log pipeline start
    auditLogService.logPipelineStart(prompt);

    try {
      // Run TDS Analysis and MIRA Calibration in parallel
      const [tdsResult, miraResult] = await Promise.all([
        runTDSAnalysis(prompt),
        runMiraCalibration(prompt)
      ]);

      updateState({
        tdsScores: tdsResult.scores,
        tdsRouting: tdsResult.routing,
        miraResults: miraResult,
        pipelineStatus: PIPELINE_STATUS.RUNNING,
        isProcessing: false,
        processingPhase: null
      });

      // Log successful analysis
      auditLogService.logEvent(AUDIT_EVENTS.TDS_ANALYSIS_COMPLETE, {
        scores: tdsResult.scores,
        routing: tdsResult.routing
      });
      auditLogService.logEvent(AUDIT_EVENTS.MIRA_CALIBRATION_COMPLETE, {
        calibrationScore: miraResult.calibrationScore
      });
    } catch (error) {
      const errorEntry = auditLogService.logError(error, { phase: 'initialization' }, true);
      updateState({
        error: {
          message: error.message,
          recoverable: true,
          context: 'initialization',
          auditId: errorEntry.id
        },
        isProcessing: false,
        processingPhase: null,
        pipelineStatus: PIPELINE_STATUS.FAILED
      });
    }
  }, [updateState]);

  /**
   * Execute a specific phase
   */
  const runPhase = useCallback(async (phase) => {
    const context = {
      userPrompt: state.userPrompt,
      additionalContext: state.tdsRouting,
      tdsScores: state.tdsScores,
      taskGraph: state.taskGraph,
      causalChain: state.causalChain,
      updatedCausalChain: state.causalChain,
      mainResearch: state.mainResearch,
      verification: state.verification,
      completedTasks: state.completedTasks,
      executionLog: state.executionLog,
      skepticValidation: state.skepticValidation,
      miraResults: state.miraResults
    };

    updateState({ isProcessing: true, processingPhase: phase, error: null });
    
    // Log phase start
    auditLogService.logEvent(AUDIT_EVENTS.PHASE_START, { phase });

    try {
      const result = await executePipeline(phase, context);

      // Handle phase-specific results
      switch (phase) {
        case PHASES.REFINING:
          updateState({
            tdsScores: result.tdsScores,
            tdsRouting: result.tdsRouting,
            miraResults: result.miraResults,
            pipelineStatus: result.requiresApproval ? PIPELINE_STATUS.PENDING_APPROVAL : PIPELINE_STATUS.RUNNING,
            pendingApproval: result.requiresApproval ? {
              type: 'tds_routing',
              reason: 'High-risk task configuration detected',
              details: result
            } : null
          });
          break;

        case PHASES.PLANNING:
          updateState({
            taskGraph: result.taskGraph,
            causalChain: result.causalChain,
            skepticValidation: result.skepticValidation,
            pipelineStatus: result.requiresApproval ? PIPELINE_STATUS.PENDING_APPROVAL : PIPELINE_STATUS.RUNNING,
            pendingApproval: result.requiresApproval ? {
              type: 'gde_decomposition',
              reason: 'Complex goal decomposition requires review',
              details: result
            } : null
          });
          break;

        case PHASES.RESEARCH:
          updateState({
            mainResearch: result.mainResearch,
            adversarialFindings: result.adversarialResearch,
            researchComparison: result.comparison,
            causalValidation: result.causalValidation,
            skepticValidation: result.skepticValidation,
            causalChain: result.updatedCausalChain,
            pipelineStatus: result.requiresApproval ? PIPELINE_STATUS.PENDING_APPROVAL : PIPELINE_STATUS.RUNNING,
            pendingApproval: result.requiresApproval ? {
              type: 'adversarial_review',
              reason: 'Adversarial findings require human review',
              details: result
            } : null
          });
          break;

        case PHASES.IMPLEMENTATION:
          updateState({
            executionLog: result.executionLog,
            completedTasks: result.completedTasks,
            verification: result.verification,
            pipelineStatus: result.requiresApproval ? PIPELINE_STATUS.PENDING_APPROVAL : PIPELINE_STATUS.RUNNING,
            pendingApproval: result.requiresApproval ? {
              type: 'implementation',
              reason: 'Implementation verification issues found',
              details: result
            } : null
          });
          break;

        case PHASES.CLOSE_OUT:
          updateState({
            finalCalibration: result.finalCalibration,
            summaryReport: result.summaryReport,
            pipelineStatus: PIPELINE_STATUS.COMPLETED,
            pendingApproval: null
          });
          break;

        default:
          break;
      }

      // Log phase completion
      auditLogService.logPhaseComplete(phase, true);
      
      // Log approval request if needed
      if (result.requiresApproval) {
        auditLogService.logEvent(AUDIT_EVENTS.APPROVAL_REQUESTED, {
          phase,
          type: result.requiresApproval
        });
      }

      updateState({
        isProcessing: false,
        processingPhase: null
      });

      return result;
    } catch (error) {
      const errorEntry = auditLogService.logError(error, { phase }, false);
      updateState({
        error: {
          message: error.message,
          recoverable: false,
          context: phase,
          auditId: errorEntry.id,
          timestamp: new Date().toISOString()
        },
        pipelineStatus: PIPELINE_STATUS.FAILED,
        isProcessing: false,
        processingPhase: null
      });
      throw error;
    }
  }, [state, updateState]);

  /**
   * Move to next phase
   */
  const advancePhase = useCallback(() => {
    const nextPhase = getNextPhase(state.activePhase);
    if (nextPhase) {
      auditLogService.logPhaseChange(state.activePhase, nextPhase);
      setState(prev => ({ ...prev, activePhase: nextPhase }));
    }
  }, [state.activePhase]);

  /**
   * Set active phase directly
   */
  const setActivePhase = useCallback((phase) => {
    if (phase !== state.activePhase) {
      auditLogService.logPhaseChange(state.activePhase, phase);
    }
    setState(prev => ({ ...prev, activePhase: phase }));
  }, [state.activePhase]);

  /**
   * Handle approval action
   */
  const handleApproval = useCallback((approval, details = {}) => {
    const historyEntry = {
      timestamp: new Date().toISOString(),
      phase: state.activePhase,
      approval,
      details
    };

    // Log approval action
    auditLogService.logApproval(approval, state.activePhase, details);

    updateState({
      pipelineStatus: approval === 'approved' ? PIPELINE_STATUS.RUNNING : PIPELINE_STATUS.PAUSED,
      pendingApproval: null,
      approvalHistory: [...state.approvalHistory, historyEntry]
    });

    // Auto-advance if approved
    if (approval === 'approved') {
      advancePhase();
    }
  }, [state.activePhase, state.approvalHistory, updateState, advancePhase]);

  /**
   * Approve current pending approval
   */
  const approve = useCallback(() => handleApproval('approved'), [handleApproval]);

  /**
   * Reject current pending approval
   */
  const reject = useCallback(() => handleApproval('rejected'), [handleApproval]);

  /**
   * Put current approval on hold
   */
  const hold = useCallback(() => handleApproval('held'), [handleApproval]);

  /**
   * Reset pipeline to initial state
   */
  const resetPipeline = useCallback(() => {
    // Log pipeline reset
    auditLogService.logEvent(AUDIT_EVENTS.PIPELINE_RESET);
    
    // Clear persisted state
    statePersistence.clearPersistedState();
    
    setState(initialState);
  }, []);

  /**
   * Set anchor version
   */
  const setAnchorVersion = useCallback((version) => {
    auditLogService.logEvent(AUDIT_EVENTS.ANCHOR_VERSION_CHANGE, { 
      from: state.anchorVersion, 
      to: version 
    });
    setState(prev => ({ ...prev, anchorVersion: version }));
  }, [state.anchorVersion]);

  /**
   * Download audit log
   */
  const downloadAuditLog = useCallback(() => {
    return auditLogService.exportAsJson();
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  /**
   * Retry last failed operation
   */
  const retryLastOperation = useCallback(async () => {
    const error = state.error;
    if (!error?.recoverable) return;

    // Log retry attempt
    auditLogService.logEvent(AUDIT_EVENTS.ERROR_RETRY, {
      context: error.context,
      originalError: error.message
    });

    updateState({ error: null });

    // Retry based on context
    if (error.context === 'initialization' && state.userPrompt) {
      await setUserPrompt(state.userPrompt);
    } else if (error.context && Object.values(PHASES).includes(error.context)) {
      await runPhase(error.context);
    }
  }, [state.error, state.userPrompt, updateState, setUserPrompt, runPhase]);

  const value = {
    // State
    ...state,
    
    // Actions
    setUserPrompt,
    runPhase,
    advancePhase,
    setActivePhase,
    handleApproval,
    approve,
    reject,
    hold,
    resetPipeline,
    setAnchorVersion,
    updateState,
    downloadAuditLog,
    clearError,
    retryLastOperation
  };

  return (
    <PipelineContext.Provider value={value}>
      {children}
    </PipelineContext.Provider>
  );
};

export const usePipeline = () => {
  const context = useContext(PipelineContext);
  if (!context) {
    throw new Error('usePipeline must be used within a PipelineProvider');
  }
  return context;
};

export default PipelineContext;
