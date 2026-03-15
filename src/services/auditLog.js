/**
 * Audit Log Service
 * Captures every significant application event with timestamps and metadata
 */

const AUDIT_LOG_KEY = 'verdict_audit_log';
const MAX_LOG_ENTRIES = 1000;

/**
 * Event types for audit logging
 */
export const AUDIT_EVENTS = {
  // Pipeline events
  PIPELINE_START: 'PIPELINE_START',
  PIPELINE_COMPLETE: 'PIPELINE_COMPLETE',
  PIPELINE_RESET: 'PIPELINE_RESET',
  PHASE_START: 'PHASE_START',
  PHASE_COMPLETE: 'PHASE_COMPLETE',
  PHASE_CHANGE: 'PHASE_CHANGE',
  
  // User input events
  USER_PROMPT_SUBMIT: 'USER_PROMPT_SUBMIT',
  
  // Analysis events
  TDS_ANALYSIS_COMPLETE: 'TDS_ANALYSIS_COMPLETE',
  MIRA_CALIBRATION_COMPLETE: 'MIRA_CALIBRATION_COMPLETE',
  GDE_COMPLETE: 'GDE_COMPLETE',
  SKEPTIC_VALIDATION_COMPLETE: 'SKEPTIC_VALIDATION_COMPLETE',
  CAUSAL_VALIDATION_COMPLETE: 'CAUSAL_VALIDATION_COMPLETE',
  
  // Approval events
  APPROVAL_REQUESTED: 'APPROVAL_REQUESTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  HELD: 'HELD',
  
  // State events
  STATE_PERSISTED: 'STATE_PERSISTED',
  STATE_RESTORED: 'STATE_RESTORED',
  STATE_CLEARED: 'STATE_CLEARED',
  
  // Error events
  ERROR_RECOVERABLE: 'ERROR_RECOVERABLE',
  ERROR_CRITICAL: 'ERROR_CRITICAL',
  ERROR_RETRY: 'ERROR_RETRY',
  
  // Version events
  ANCHOR_VERSION_CHANGE: 'ANCHOR_VERSION_CHANGE'
};

/**
 * Create an audit log entry
 */
const createEntry = (eventType, metadata = {}) => {
  return {
    id: generateEntryId(),
    timestamp: new Date().toISOString(),
    eventType,
    metadata,
    sessionId: getSessionId()
  };
};

let entryCounter = 0;
const generateEntryId = () => {
  entryCounter++;
  return `audit_${Date.now()}_${entryCounter}`;
};

/**
 * Get or generate session ID
 */
const getSessionId = () => {
  let sessionId = localStorage.getItem('verdict_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('verdict_session_id', sessionId);
  }
  return sessionId;
};

/**
 * Load audit log from localStorage
 */
const loadLog = () => {
  try {
    const stored = localStorage.getItem(AUDIT_LOG_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load audit log:', error);
    return [];
  }
};

/**
 * Save audit log to localStorage
 */
const saveLog = (log) => {
  try {
    // Trim log if it exceeds max entries
    const trimmedLog = log.length > MAX_LOG_ENTRIES 
      ? log.slice(-MAX_LOG_ENTRIES) 
      : log;
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(trimmedLog));
  } catch (error) {
    console.error('Failed to save audit log:', error);
  }
};

/**
 * AuditLogService class
 */
class AuditLogService {
  constructor() {
    this.log = loadLog();
  }

  /**
   * Log an event
   */
  logEvent(eventType, metadata = {}) {
    const entry = createEntry(eventType, metadata);
    this.log.push(entry);
    saveLog(this.log);
    return entry;
  }

  /**
   * Get all audit entries
   */
  getEntries() {
    return [...this.log];
  }

  /**
   * Get entries by event type
   */
  getEntriesByType(eventType) {
    return this.log.filter(entry => entry.eventType === eventType);
  }

  /**
   * Get entries within a time range
   */
  getEntriesByTimeRange(startTime, endTime) {
    return this.log.filter(entry => {
      const entryTime = new Date(entry.timestamp).getTime();
      return entryTime >= startTime && entryTime <= endTime;
    });
  }

  /**
   * Get recent entries
   */
  getRecentEntries(count = 50) {
    return this.log.slice(-count);
  }

  /**
   * Get entries for current session
   */
  getSessionEntries() {
    const sessionId = getSessionId();
    return this.log.filter(entry => entry.sessionId === sessionId);
  }

  /**
   * Clear all logs
   */
  clearLog() {
    this.log = [];
    localStorage.removeItem(AUDIT_LOG_KEY);
  }

  /**
   * Clear current session logs
   */
  clearSessionLog() {
    const sessionId = getSessionId();
    this.log = this.log.filter(entry => entry.sessionId !== sessionId);
    saveLog(this.log);
  }

  /**
   * Export audit log as JSON
   */
  exportAsJson() {
    const exportData = {
      exportedAt: new Date().toISOString(),
      sessionId: getSessionId(),
      totalEntries: this.log.length,
      entries: this.log
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `verdict-audit-log-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return exportData;
  }

  /**
   * Get statistics
   */
  getStats() {
    const eventCounts = {};
    this.log.forEach(entry => {
      eventCounts[entry.eventType] = (eventCounts[entry.eventType] || 0) + 1;
    });

    return {
      totalEntries: this.log.length,
      eventCounts,
      sessionId: getSessionId(),
      oldestEntry: this.log[0]?.timestamp,
      newestEntry: this.log[this.log.length - 1]?.timestamp
    };
  }

  /**
   * Log pipeline start
   */
  logPipelineStart(userPrompt) {
    return this.logEvent(AUDIT_EVENTS.PIPELINE_START, { 
      promptLength: userPrompt?.length || 0,
      promptPreview: userPrompt?.substring(0, 100)
    });
  }

  /**
   * Log phase change
   */
  logPhaseChange(fromPhase, toPhase) {
    return this.logEvent(AUDIT_EVENTS.PHASE_CHANGE, { fromPhase, toPhase });
  }

  /**
   * Log phase completion
   */
  logPhaseComplete(phase, result) {
    return this.logEvent(AUDIT_EVENTS.PHASE_COMPLETE, { 
      phase,
      resultSummary: result ? 'success' : 'failed'
    });
  }

  /**
   * Log approval action
   */
  logApproval(approval, phase, details = {}) {
    return this.logEvent(AUDIT_EVENTS[approval.toUpperCase()], { 
      phase,
      ...details
    });
  }

  /**
   * Log error
   */
  logError(error, context = {}, isRecoverable = true) {
    return this.logEvent(
      isRecoverable ? AUDIT_EVENTS.ERROR_RECOVERABLE : AUDIT_EVENTS.ERROR_CRITICAL,
      {
        errorMessage: error.message,
        errorStack: error.stack,
        context,
        recoverable: isRecoverable
      }
    );
  }
}

// Singleton instance
export const auditLogService = new AuditLogService();

export default auditLogService;
