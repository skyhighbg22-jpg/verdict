/**
 * Global Epistemic Ledger (GEL)
 * Pinecone/Weaviate integration with dual-provider consensus locking,
 * TTL metadata, and strategy memories
 */

import { bytezClient } from '../../api/bytezClient';
import { 
  GEL_PROVIDERS, 
  EPISTEMIC_STATUS,
  TYPES
} from '../types';

/**
 * GEL Configuration
 */
export const GEL_CONFIG = {
  primaryProvider: GEL_PROVIDERS.PINECONE,
  secondaryProvider: GEL_PROVIDERS.WEAVIATE,
  consensusLockTimeout: 30000, // 30 seconds
  defaultTTL: 86400, // 24 hours
  minCertaintyThreshold: 0.7,
  consensusThreshold: 0.85
};

/**
 * Default GEL entry structure
 */
const createGELEntry = (fact, source, metadata = {}) => ({
  id: generateGELId(),
  fact,
  certainty: 0,
  status: EPISTEMIC_STATUS.PENDING,
  source,
  supportingEvidence: [],
  contradictingEvidence: [],
  createdAt: new Date().toISOString(),
  lastVerified: null,
  ttl: GEL_CONFIG.defaultTTL,
  metadata,
  strategyMemory: null,
  providerStates: {
    [GEL_PROVIDERS.PINECONE]: { indexed: false, status: 'pending' },
    [GEL_PROVIDERS.WEAVIATE]: { indexed: false, status: 'pending' }
  }
});

/**
 * Generate unique GEL entry ID
 */
let gelCounter = 0;
const generateGELId = () => {
  gelCounter++;
  return `gel_${Date.now()}_${gelCounter}`;
};

/**
 * Primary in-memory GEL storage (simulates vector DB)
 */
class GlobalEpistemicLedger {
  constructor() {
    this.entries = new Map();
    this.strategyMemories = new Map();
    this.consensusLocks = new Map();
  }

  /**
   * Add a new fact to the GEL
   * @param {string} fact - The factual claim
   * @param {string} source - Source identifier
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Created GEL entry
   */
  async addFact(fact, source, options = {}) {
    const entry = createGELEntry(fact, source, options.metadata);
    
    if (options.strategyMemory) {
      entry.strategyMemory = options.strategyMemory;
      this.strategyMemories.set(options.strategyMemory, 
        (this.strategyMemories.get(options.strategyMemory) || []).concat(entry.id)
      );
    }

    if (options.ttl) {
      entry.ttl = options.ttl;
    }

    // Index in both providers (simulated)
    await this.indexInProviders(entry);

    this.entries.set(entry.id, entry);
    return entry;
  }

  /**
   * Index entry in both Pinecone and Weaviate (simulated)
   */
  async indexInProviders(entry) {
    // Simulate Pinecone indexing
    try {
      await this.indexInPinecone(entry);
      entry.providerStates[GEL_PROVIDERS.PINECONE] = {
        indexed: true,
        status: 'active',
        indexedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Pinecone indexing failed:', error);
      entry.providerStates[GEL_PROVIDERS.PINECONE] = {
        indexed: false,
        status: 'error',
        error: error.message
      };
    }

    // Simulate Weaviate indexing
    try {
      await this.indexInWeaviate(entry);
      entry.providerStates[GEL_PROVIDERS.WEAVIATE] = {
        indexed: true,
        status: 'active',
        indexedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Weaviate indexing failed:', error);
      entry.providerStates[GEL_PROVIDERS.WEAVIATE] = {
        indexed: false,
        status: 'error',
        error: error.message
      };
    }

    return entry;
  }

  /**
   * Index in Pinecone (simulated)
   */
  async indexInPinecone(entry) {
    // In production, this would use Pinecone SDK
    console.log(`[GEL:Pinecone] Indexing entry ${entry.id}: ${entry.fact.substring(0, 50)}...`);
    
    // Simulate vector embedding generation
    const embedding = await this.generateEmbedding(entry.fact);
    
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => resolve({ id: entry.id, vectors: embedding }), 100);
    });
  }

  /**
   * Index in Weaviate (simulated)
   */
  async indexInWeaviate(entry) {
    // In production, this would use Weaviate SDK
    console.log(`[GEL:Weaviate] Indexing entry ${entry.id}: ${entry.fact.substring(0, 50)}...`);
    
    // Simulate vector embedding generation
    const embedding = await this.generateEmbedding(entry.fact);
    
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => resolve({ id: entry.id, vectors: embedding }), 100);
    });
  }

  /**
   * Generate vector embedding for a fact (simulated)
   */
  async generateEmbedding(text) {
    // In production, use actual embedding model
    // This generates a pseudo-random vector based on text
    const hash = this.hashString(text);
    const embedding = new Array(1536);
    for (let i = 0; i < 1536; i++) {
      embedding[i] = Math.sin(hash * i) * 0.5 + 0.5;
    }
    return embedding;
  }

  /**
   * Simple string hash function
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Query the GEL for similar facts
   * @param {string} query - Query string
   * @param {Object} options - Query options
   * @returns {Promise<Object[]>} Matching entries
   */
  async query(query, options = {}) {
    const {
      limit = 10,
      minCertainty = 0,
      status = null,
      provider = null
    } = options;

    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);

    // Calculate similarity scores
    const results = [];
    for (const [id, entry] of this.entries) {
      // Check filters
      if (status && entry.status !== status) continue;
      if (entry.certainty < minCertainty) continue;
      
      // If specific provider requested, check availability
      if (provider && !entry.providerStates[provider]?.indexed) continue;

      // Check TTL
      if (this.isExpired(entry)) continue;

      // Calculate similarity (simplified)
      const similarity = this.calculateSimilarity(queryEmbedding, entry);
      
      results.push({ entry, similarity });
    }

    // Sort by similarity and return top results
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, limit).map(r => ({
      ...r.entry,
      similarity: r.similarity
    }));
  }

  /**
   * Calculate cosine similarity between embeddings (simplified)
   */
  calculateSimilarity(queryEmbedding, entry) {
    // In production, use actual vector similarity
    // Here we use a simple string-based similarity
    return this.jaccardSimilarity(queryEmbedding.join('').substring(0, 100), 
      entry.fact.substring(0, 100));
  }

  /**
   * Jaccard similarity for strings
   */
  jaccardSimilarity(str1, str2) {
    const set1 = new Set(str1.split(''));
    const set2 = new Set(str2.split(''));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  }

  /**
   * Check if entry has expired based on TTL
   */
  isExpired(entry) {
    if (!entry.lastVerified && !entry.createdAt) return false;
    const lastUpdate = entry.lastVerified || entry.createdAt;
    const age = (Date.now() - new Date(lastUpdate).getTime()) / 1000;
    return age > entry.ttl;
  }

  /**
   * Verify a fact using dual-provider consensus
   * @param {string} factId - Entry ID to verify
   * @param {Object} verificationData - New evidence
   * @returns {Promise<Object>} Verification result with consensus
   */
  async verifyFact(factId, verificationData) {
    const entry = this.entries.get(factId);
    if (!entry) {
      throw new Error(`GEL entry ${factId} not found`);
    }

    // Acquire consensus lock
    const lockKey = `consensus_${factId}`;
    if (this.consensusLocks.has(lockKey)) {
      // Another verification in progress
      return { status: 'lock_waiting', entry };
    }

    this.consensusLocks.set(lockKey, Date.now());

    try {
      // Query both providers for consensus
      const provider1Result = await this.queryProvider(GEL_PROVIDERS.PINECONE, entry.fact);
      const provider2Result = await this.queryProvider(GEL_PROVIDERS.WEAVIATE, entry.fact);

      // Determine consensus
      const hasConsensus = this.checkConsensus(provider1Result, provider2Result);

      // Update entry based on verification
      if (verificationData.isSupporting) {
        entry.supportingEvidence.push({
          ...verificationData,
          timestamp: new Date().toISOString()
        });
      } else {
        entry.contradictingEvidence.push({
          ...verificationData,
          timestamp: new Date().toISOString()
        });
      }

      // Recalculate certainty
      entry.certainty = this.calculateCertainty(entry);
      
      // Update status based on certainty
      if (entry.certainty >= GEL_CONFIG.consensusThreshold && hasConsensus) {
        entry.status = EPISTEMIC_STATUS.VERIFIED;
      } else if (entry.contradictingEvidence.length > entry.supportingEvidence.length) {
        entry.status = EPISTEMIC_STATUS.DISPUTED;
      } else if (entry.certainty < GEL_CONFIG.minCertaintyThreshold) {
        entry.status = EPISTEMIC_STATUS.UNCERTAIN;
      }

      entry.lastVerified = new Date().toISOString();
      this.entries.set(factId, entry);

      return {
        hasConsensus,
        consensusValue: hasConsensus ? this.determineConsensusValue(provider1Result, provider2Result) : null,
        provider1Status: provider1Result?.status,
        provider2Status: provider2Result?.status,
        entry
      };
    } finally {
      this.consensusLocks.delete(lockKey);
    }
  }

  /**
   * Query a specific provider
   */
  async queryProvider(provider, fact) {
    // In production, make actual API calls
    console.log(`[GEL:${provider}] Querying for: ${fact.substring(0, 30)}...`);
    
    // Simulate provider response
    return {
      provider,
      status: 'found',
      certainty: Math.random() * 0.3 + 0.6, // Random certainty 0.6-0.9
      retrievedAt: new Date().toISOString()
    };
  }

  /**
   * Check consensus between providers
   */
  checkConsensus(result1, result2) {
    if (!result1 || !result2) return false;
    const certaintyDiff = Math.abs(result1.certainty - result2.certainty);
    return certaintyDiff < 0.2; // Within 20% is considered consensus
  }

  /**
   * Determine consensus value
   */
  determineConsensusValue(result1, result2) {
    return (result1.certainty + result2.certainty) / 2;
  }

  /**
   * Calculate certainty score based on evidence
   */
  calculateCertainty(entry) {
    const supporting = entry.supportingEvidence.length;
    const contradicting = entry.contradictingEvidence.length;
    const total = supporting + contradicting;
    
    if (total === 0) return 0.5;
    
    // Certainty = supporting / total, with penalty for contradicting evidence
    const baseCertainty = supporting / total;
    const contradictionPenalty = (contradicting / total) * 0.3;
    
    return Math.max(0, Math.min(1, baseCertainty - contradictionPenalty));
  }

  /**
   * Get or create strategy memory
   */
  getStrategyMemory(strategyId) {
    return this.strategyMemories.get(strategyId) || [];
  }

  /**
   * Add strategy memory association
   */
  addStrategyMemory(factId, strategyId) {
    const entry = this.entries.get(factId);
    if (entry) {
      entry.strategyMemory = strategyId;
      this.strategyMemories.set(strategyId, 
        (this.strategyMemories.get(strategyId) || []).concat(factId)
      );
    }
  }

  /**
   * Get all facts for a strategy
   */
  getFactsForStrategy(strategyId) {
    const factIds = this.strategyMemories.get(strategyId) || [];
    return factIds.map(id => this.entries.get(id)).filter(Boolean);
  }

  /**
   * Get all verified facts above threshold
   */
  getVerifiedFacts(minCertainty = GEL_CONFIG.minCertaintyThreshold) {
    const verified = [];
    for (const [id, entry] of this.entries) {
      if (entry.status === EPISTEMIC_STATUS.VERIFIED && entry.certainty >= minCertainty) {
        if (!this.isExpired(entry)) {
          verified.push(entry);
        }
      }
    }
    return verified;
  }

  /**
   * Get GEL statistics
   */
  getStats() {
    const stats = {
      totalEntries: this.entries.size,
      byStatus: {},
      byProvider: {},
      averageCertainty: 0,
      expiredCount: 0
    };

    let totalCertainty = 0;
    let validCount = 0;

    for (const [id, entry] of this.entries) {
      // Count by status
      stats.byStatus[entry.status] = (stats.byStatus[entry.status] || 0) + 1;
      
      // Count by provider
      for (const [provider, state] of Object.entries(entry.providerStates)) {
        if (state.indexed) {
          stats.byProvider[provider] = (stats.byProvider[provider] || 0) + 1;
        }
      }

      // Track certainty and expiration
      if (!this.isExpired(entry)) {
        totalCertainty += entry.certainty;
        validCount++;
      } else {
        stats.expiredCount++;
      }
    }

    stats.averageCertainty = validCount > 0 ? totalCertainty / validCount : 0;

    return stats;
  }

  /**
   * Update TTL for an entry
   */
  updateTTL(factId, newTTL) {
    const entry = this.entries.get(factId);
    if (entry) {
      entry.ttl = newTTL;
      this.entries.set(factId, entry);
    }
  }

  /**
   * Delete expired entries
   */
  cleanupExpired() {
    let deleted = 0;
    for (const [id, entry] of this.entries) {
      if (this.isExpired(entry)) {
        this.entries.delete(id);
        deleted++;
      }
    }
    return deleted;
  }

  /**
   * Export GEL state for debugging
   */
  export() {
    return {
      entries: Array.from(this.entries.values()),
      stats: this.getStats(),
      exportedAt: new Date().toISOString()
    };
  }
}

// Singleton instance
export const gel = new GlobalEpistemicLedger();

// Convenience functions
export const addFact = (fact, source, options) => gel.addFact(fact, source, options);
export const queryGEL = (query, options) => gel.query(query, options);
export const verifyFact = (factId, data) => gel.verifyFact(factId, data);
export const getVerifiedFacts = (minCertainty) => gel.getVerifiedFacts(minCertainty);
export const getGELStats = () => gel.getStats();

export default {
  gel,
  GEL_CONFIG,
  addFact,
  queryGEL,
  verifyFact,
  getVerifiedFacts,
  getGELStats
};
