/**
 * State Persistence Layer
 * localStorage-based persistence with Redis hot state simulation
 */

import { STATE_LAYERS, TYPES } from '../types';

const STATE_STORAGE_KEY = 'verdict_persist';
const SESSION_KEY = 'verdict_session_id';

/**
 * State Configuration
 */
export const STATE_CONFIG = {
  redisKeyPrefix: 'verdict:',
  postgresTable: 'verdict_state',
  checkpointRetention: 30, // days
  hotStateTTL: 3600, // 1 hour
  maxCheckpoints: 100
};

/**
 * Get or generate session ID
 */
export const getSessionId = () => {
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
};

/**
 * Generate a new session ID
 */
export const generateNewSessionId = () => {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem(SESSION_KEY, sessionId);
  return sessionId;
};

/**
 * Session Checkpoint
 */
export const createCheckpoint = (sessionId, phase, state, description = '') => ({
  sessionId,
  checkpointId: generateCheckpointId(),
  phase,
  state: serializeState(state),
  description,
  createdAt: new Date().toISOString(),
  size: JSON.stringify(state).length
});

let checkpointCounter = 0;
const generateCheckpointId = () => {
  checkpointCounter++;
  return `chk_${Date.now()}_${checkpointCounter}`;
};

/**
 * Serialize state for storage
 */
const serializeState = (state) => {
  // Remove non-serializable data
  const serialized = { ...state };
  
  // Convert Maps to objects
  if (serialized.taskGraph?.tasks instanceof Map) {
    serialized.taskGraph.tasks = Object.fromEntries(serialized.taskGraph.tasks);
  }
  
  // Remove functions
  for (const [key, value] of Object.entries(serialized)) {
    if (typeof value === 'function') {
      delete serialized[key];
    }
    if (value instanceof Map) {
      serialized[key] = Object.fromEntries(value);
    }
  }
  
  return serialized;
};

/**
 * LocalStorage Persistence Layer
 */
class LocalStoragePersistence {
  constructor() {
    this.storageKey = STATE_STORAGE_KEY;
  }

  /**
   * Load persisted state from localStorage
   */
  loadState() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return null;
      
      const parsed = JSON.parse(stored);
      return parsed.state || null;
    } catch (error) {
      console.error('Failed to load state from localStorage:', error);
      return null;
    }
  }

  /**
   * Save state to localStorage
   */
  saveState(state) {
    try {
      const dataToStore = {
        state: serializeState(state),
        savedAt: new Date().toISOString(),
        sessionId: getSessionId()
      };
      
      // Check localStorage size and warn if approaching limit
      const serialized = JSON.stringify(dataToStore);
      if (serialized.length > 4 * 1024 * 1024) {
        console.warn('State size approaching localStorage limit');
      }
      
      localStorage.setItem(this.storageKey, JSON.stringify(dataToStore));
      return { success: true, size: serialized.length };
    } catch (error) {
      console.error('Failed to save state to localStorage:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clear persisted state
   */
  clearState() {
    localStorage.removeItem(this.storageKey);
    return { success: true };
  }

  /**
   * Get storage usage info
   */
  getStorageInfo() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      const size = stored ? stored.length : 0;
      return {
        used: size,
        usedKB: (size / 1024).toFixed(2),
        usedMB: (size / (1024 * 1024)).toFixed(2),
        limit: 5 * 1024 * 1024, // ~5MB typical limit
        percentUsed: ((size / (5 * 1024 * 1024)) * 100).toFixed(2)
      };
    } catch (error) {
      return { error: error.message };
    }
  }
}

/**
 * In-memory state storage (simulates Redis hot state)
 */
class HotStateStore {
  constructor() {
    this.store = new Map();
  }

  /**
   * Set hot state
   */
  set(sessionId, key, value) {
    const fullKey = `${STATE_CONFIG.redisKeyPrefix}${sessionId}:${key}`;
    this.store.set(fullKey, {
      value,
      timestamp: Date.now(),
      ttl: STATE_CONFIG.hotStateTTL
    });
    return { success: true, key: fullKey };
  }

  /**
   * Get hot state
   */
  get(sessionId, key) {
    const fullKey = `${STATE_CONFIG.redisKeyPrefix}${sessionId}:${key}`;
    const entry = this.store.get(fullKey);
    
    if (!entry) return null;
    
    // Check TTL
    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl * 1000) {
      this.store.delete(fullKey);
      return null;
    }
    
    return entry.value;
  }

  /**
   * Delete hot state
   */
  delete(sessionId, key) {
    const fullKey = `${STATE_CONFIG.redisKeyPrefix}${sessionId}:${key}`;
    this.store.delete(fullKey);
    return { success: true };
  }

  /**
   * Clear session state
   */
  clearSession(sessionId) {
    const prefix = `${STATE_CONFIG.redisKeyPrefix}${sessionId}:`;
    let deleted = 0;
    
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        deleted++;
      }
    }
    
    return { deleted };
  }

  /**
   * Get all keys for session
   */
  getSessionKeys(sessionId) {
    const prefix = `${STATE_CONFIG.redisKeyPrefix}${sessionId}:`;
    const keys = [];
    
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        keys.push(key.replace(prefix, ''));
      }
    }
    
    return keys;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalKeys: this.store.size,
      entries: Array.from(this.store.entries()).map(([key, value]) => ({
        key,
        age: Date.now() - value.timestamp,
        ttl: value.ttl
      }))
    };
  }
}

/**
 * Structured state store (simulates PostgreSQL)
 */
class StructuredStateStore {
  constructor() {
    this.tables = new Map();
    this.initializeTables();
  }

  /**
   * Initialize database tables
   */
  initializeTables() {
    // Sessions table
    this.tables.set('sessions', []);
    
    // Checkpoints table
    this.tables.set('checkpoints', []);
    
    // Anchors table
    this.tables.set('anchors', []);
    
    // State history table
    this.tables.set('state_history', []);
  }

  /**
   * Save session
   */
  saveSession(session) {
    const sessions = this.tables.get('sessions');
    const index = sessions.findIndex(s => s.sessionId === session.sessionId);
    
    const sessionRecord = {
      ...session,
      updatedAt: new Date().toISOString()
    };
    
    if (index >= 0) {
      sessions[index] = sessionRecord;
    } else {
      sessions.push(sessionRecord);
    }
    
    return sessionRecord;
  }

  /**
   * Get session
   */
  getSession(sessionId) {
    const sessions = this.tables.get('sessions');
    return sessions.find(s => s.sessionId === sessionId) || null;
  }

  /**
   * Save checkpoint
   */
  saveCheckpoint(checkpoint) {
    const checkpoints = this.tables.get('checkpoints');
    
    // Check retention limit
    if (checkpoints.length >= STATE_CONFIG.maxCheckpoints) {
      // Remove oldest checkpoint
      checkpoints.shift();
    }
    
    checkpoints.push(checkpoint);
    return checkpoint;
  }

  /**
   * Get checkpoints for session
   */
  getCheckpoints(sessionId) {
    const checkpoints = this.tables.get('checkpoints');
    return checkpoints
      .filter(c => c.sessionId === sessionId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Get latest checkpoint
   */
  getLatestCheckpoint(sessionId) {
    const checkpoints = this.getCheckpoints(sessionId);
    return checkpoints[0] || null;
  }

  /**
   * Save anchor
   */
  saveAnchor(anchor) {
    const anchors = this.tables.get('anchors');
    const index = anchors.findIndex(a => 
      a.sessionId === anchor.sessionId && a.version === anchor.version
    );
    
    if (index >= 0) {
      anchors[index] = anchor;
    } else {
      anchors.push(anchor);
    }
    
    return anchor;
  }

  /**
   * Get anchors for session
   */
  getAnchors(sessionId) {
    const anchors = this.tables.get('anchors');
    return anchors
      .filter(a => a.sessionId === sessionId)
      .sort((a, b) => a.version.localeCompare(b.version));
  }

  /**
   * Save state history
   */
  saveStateHistory(sessionId, phase, state) {
    const history = this.tables.get('state_history');
    
    history.push({
      sessionId,
      phase,
      state: serializeState(state),
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 1000 entries
    if (history.length > 1000) {
      this.tables.set('state_history', history.slice(-1000));
    }
  }

  /**
   * Get state history
   */
  getStateHistory(sessionId, limit = 100) {
    const history = this.tables.get('state_history');
    return history
      .filter(h => h.sessionId === sessionId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  /**
   * Query state by phase
   */
  queryByPhase(sessionId, phase) {
    const history = this.tables.get('state_history');
    return history
      .filter(h => h.sessionId === sessionId && h.phase === phase)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
}

/**
 * Main State Persistence Manager
 */
class StatePersistence {
  constructor() {
    this.localStorage = new LocalStoragePersistence();
    this.hotState = new HotStateStore();
    this.structuredState = new StructuredStateStore();
    this.currentSession = getSessionId();
  }

  /**
   * Load state from localStorage (for app initialization)
   */
  loadPersistedState() {
    return this.localStorage.loadState();
  }

  /**
   * Persist state to localStorage
   */
  persistState(state) {
    return this.localStorage.saveState(state);
  }

  /**
   * Clear persisted state
   */
  clearPersistedState() {
    return this.localStorage.clearState();
  }

  /**
   * Get storage info
   */
  getStorageInfo() {
    return this.localStorage.getStorageInfo();
  }

  /**
   * Initialize session
   */
  async initSession(sessionId, initialState = {}) {
    this.currentSession = sessionId;
    
    // Save session to structured store
    this.structuredState.saveSession({
      sessionId,
      status: 'active',
      createdAt: new Date().toISOString(),
      initialState: serializeState(initialState)
    });
    
    // Set initial hot state
    this.hotState.set(sessionId, 'currentPhase', initialState.currentPhase || 'Refining');
    this.hotState.set(sessionId, 'status', 'initialized');
    
    // Persist to localStorage
    this.persistState(initialState);
    
    return { sessionId, initialized: true };
  }

  /**
   * Set current phase
   */
  async setPhase(sessionId, phase) {
    this.hotState.set(sessionId, 'currentPhase', phase);
    
    // Save to history
    this.structuredState.saveStateHistory(sessionId, phase, { phase });
    
    return { success: true, phase };
  }

  /**
   * Save state checkpoint
   */
  async saveCheckpoint(sessionId, phase, state, description = '') {
    const checkpoint = createCheckpoint(sessionId, phase, state, description);
    
    // Save to structured storage
    this.structuredState.saveCheckpoint(checkpoint);
    
    // Also save to hot state for quick access
    this.hotState.set(sessionId, `checkpoint_${checkpoint.checkpointId}`, checkpoint);
    
    return checkpoint;
  }

  /**
   * Restore from checkpoint
   */
  async restoreFromCheckpoint(sessionId, checkpointId) {
    const checkpoints = this.structuredState.getCheckpoints(sessionId);
    const checkpoint = checkpoints.find(c => c.checkpointId === checkpointId);
    
    if (!checkpoint) {
      throw new Error(`Checkpoint ${checkpointId} not found`);
    }
    
    return checkpoint.state;
  }

  /**
   * Get checkpoint history
   */
  async getCheckpointHistory(sessionId) {
    return this.structuredState.getCheckpoints(sessionId);
  }

  /**
   * Save anchor
   */
  async saveAnchor(sessionId, version, phase, output, metadata = {}) {
    const anchor = {
      sessionId,
      version,
      phase,
      output: serializeState(output),
      metadata,
      createdAt: new Date().toISOString()
    };
    
    this.structuredState.saveAnchor(anchor);
    
    // Update hot state
    this.hotState.set(sessionId, `anchor_${version}`, anchor);
    
    return anchor;
  }

  /**
   * Get anchors
   */
  async getAnchors(sessionId) {
    return this.structuredState.getAnchors(sessionId);
  }

  /**
   * Get hot state value
   */
  async getHotState(sessionId, key) {
    return this.hotState.get(sessionId, key);
  }

  /**
   * Set hot state value
   */
  async setHotState(sessionId, key, value) {
    return this.hotState.set(sessionId, key, value);
  }

  /**
   * Get current phase
   */
  async getCurrentPhase(sessionId) {
    return this.hotState.get(sessionId, 'currentPhase') || 'Refining';
  }

  /**
   * Get session status
   */
  async getSessionStatus(sessionId) {
    const session = this.structuredState.getSession(sessionId);
    const currentPhase = await this.getCurrentPhase(sessionId);
    const hotStatus = this.hotState.get(sessionId, 'status');
    
    return {
      sessionId,
      status: hotStatus || session?.status || 'unknown',
      currentPhase,
      createdAt: session?.createdAt,
      updatedAt: session?.updatedAt
    };
  }

  /**
   * End session
   */
  async endSession(sessionId) {
    // Save final checkpoint
    await this.saveCheckpoint(sessionId, 'completed', {}, 'Session completed');
    
    // Update session status
    const session = this.structuredState.getSession(sessionId);
    if (session) {
      session.status = 'completed';
      session.completedAt = new Date().toISOString();
      this.structuredState.saveSession(session);
    }
    
    // Clear hot state (optional, based on retention policy)
    // this.hotState.clearSession(sessionId);
    
    return { sessionId, ended: true };
  }

  /**
   * Get all state (for debugging/export)
   */
  async exportFullState(sessionId) {
    const session = this.structuredState.getSession(sessionId);
    const checkpoints = this.structuredState.getCheckpoints(sessionId);
    const anchors = this.structuredState.getAnchors(sessionId);
    const history = this.structuredState.getStateHistory(sessionId);
    const hotKeys = this.hotState.getSessionKeys(sessionId);
    
    const hotState = {};
    for (const key of hotKeys) {
      hotState[key] = this.hotState.get(sessionId, key);
    }
    
    return {
      session,
      checkpoints,
      anchors,
      history,
      hotState,
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      hotState: this.hotState.getStats(),
      sessions: this.structuredState.tables.get('sessions').length,
      checkpoints: this.structuredState.tables.get('checkpoints').length,
      anchors: this.structuredState.tables.get('anchors').length
    };
  }
}

// Singleton instance
export const statePersistence = new StatePersistence();

export default {
  statePersistence,
  STATE_CONFIG,
  createCheckpoint,
  getSessionId,
  generateNewSessionId
};
