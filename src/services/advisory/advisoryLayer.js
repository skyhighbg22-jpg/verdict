/**
 * Real-Time Advisory Layer
 * Grok 4.2 integration for X/live internet queries
 */

import { bytezClient } from '../../api/bytezClient';
import { ADVISORY_QUERY_TYPES, TYPES } from '../types';

/**
 * Advisory Layer Configuration
 */
export const ADVISORY_CONFIG = {
  grokModel: 'grok-4.2',
  cacheTTL: 300, // 5 minutes cache for live data
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 15000, // 15 seconds
  requireLiveDataThreshold: 0.8
};

/**
 * Advisory query cache
 */
class AdvisoryCache {
  constructor() {
    this.cache = new Map();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Generate cache key from query
   */
  getKey(query, type) {
    return `${type}:${JSON.stringify(query)}`;
  }

  /**
   * Get cached result if not expired
   */
  get(query, type) {
    const key = this.getKey(query, type);
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    const age = (Date.now() - entry.timestamp) / 1000;
    if (age > ADVISORY_CONFIG.cacheTTL) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.result;
  }

  /**
   * Set cached result
   */
  set(query, type, result) {
    const key = this.getKey(query, type);
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      size: this.cache.size
    };
  }
}

/**
 * Query type handlers
 */
const queryTypeHandlers = {
  /**
   * Live fact query - for real-time factual information
   */
  [ADVISORY_QUERY_TYPES.LIVE_FACT]: async (query, params) => {
    const prompt = `
      Answer this factual question using current information.
      If you don't know the answer, say so clearly.
      
      Question: ${query}
      
      Provide your answer as JSON:
      {
        "answer": "the answer",
        "confidence": 0.0-1.0,
        "sources": ["source1", "source2"],
        "isLiveData": true/false
      }
    `;

    return bytezClient.runInference(ADVISORY_CONFIG.grokModel, {
      systemPrompt: 'You are a real-time information assistant with access to live data. Provide accurate, up-to-date answers.',
      userPrompt: prompt,
      temperature: 0.2
    });
  },

  /**
   * Market data query - for financial/business data
   */
  [ADVISORY_QUERY_TYPES.MARKET_DATA]: async (query, params) => {
    const prompt = `
      Provide current market or business information.
      Include relevant financial metrics, trends, or market status.
      
      Query: ${query}
      ${params.symbol ? `Symbol: ${params.symbol}` : ''}
      ${params.timeframe ? `Timeframe: ${params.timeframe}` : ''}
      
      Provide as JSON:
      {
        "data": {},
        "confidence": 0.0-1.0,
        "sources": [],
        "timestamp": "ISO timestamp"
      }
    `;

    return bytezClient.runInference(ADVISORY_CONFIG.grokModel, {
      systemPrompt: 'You are a financial data analysis assistant. Provide accurate market information.',
      userPrompt: prompt,
      temperature: 0.3
    });
  },

  /**
   * Technical status query - for API status, service health
   */
  [ADVISORY_QUERY_TYPES.TECHNICAL_STATUS]: async (query, params) => {
    const prompt = `
      Check the current technical status or availability.
      
      Query: ${query}
      ${params.service ? `Service: ${params.service}` : ''}
      ${params.region ? `Region: ${params.region}` : ''}
      
      Provide as JSON:
      {
        "status": "operational|degraded|outage|unknown",
        "details": "description",
        "lastUpdated": "ISO timestamp",
        "confidence": 0.0-1.0
      }
    `;

    return bytezClient.runInference(ADVISORY_CONFIG.grokModel, {
      systemPrompt: 'You are a technical status checker. Report accurate service availability.',
      userPrompt: prompt,
      temperature: 0.1
    });
  },

  /**
   * News check query - for recent news/events
   */
  [ADVISORY_QUERY_TYPES.NEWS_CHECK]: async (query, params) => {
    const prompt = `
      Check for recent news or events related to this query.
      Focus on the most recent and relevant information.
      
      Query: ${query}
      ${params.when ? `Time period: ${params.when}` : 'Focus on recent news'}
      
      Provide as JSON:
      {
        "headlines": ["headline1", "headline2"],
        "summary": "brief summary",
        "sentiment": "positive|negative|neutral",
        "sources": [],
        "confidence": 0.0-1.0
      }
    `;

    return bytezClient.runInference(ADVISORY_CONFIG.grokModel, {
      systemPrompt: 'You are a news analysis assistant. Provide current, relevant news information.',
      userPrompt: prompt,
      temperature: 0.4
    });
  },

  /**
   * Real-time analytics query
   */
  [ADVISORY_QUERY_TYPES.REAL_TIME_ANALYTICS]: async (query, params) => {
    const prompt = `
      Provide real-time analytics or metrics for this query.
      
      Query: ${query}
      ${params.metric ? `Metric type: ${params.metric}` : ''}
      ${params.period ? `Period: ${params.period}` : ''}
      
      Provide as JSON:
      {
        "metrics": {},
        "trends": {},
        "insights": [],
        "confidence": 0.0-1.0,
        "dataFreshness": "real-time|cached|stale"
      }
    `;

    return bytezClient.runInference(ADVISORY_CONFIG.grokModel, {
      systemPrompt: 'You are an analytics assistant. Provide accurate, real-time metrics and insights.',
      userPrompt: prompt,
      temperature: 0.3
    });
  }
};

/**
 * Main Advisory Layer class
 */
class RealTimeAdvisoryLayer {
  constructor() {
    this.cache = new AdvisoryCache();
    this.queryHistory = [];
    this.activeQueries = new Map();
  }

  /**
   * Execute an advisory query with caching and retry logic
   * @param {string} query - The query string
   * @param {string} type - Query type from ADVISORY_QUERY_TYPES
   * @param {Object} params - Additional parameters
   * @returns {Promise<Object>} Advisory result
   */
  async query(query, type = ADVISORY_QUERY_TYPES.LIVE_FACT, params = {}) {
    // Check cache first
    const cached = this.cache.get(query, type);
    if (cached && !params.forceRefresh) {
      return {
        ...cached,
        fromCache: true,
        cachedAt: cached.retrievedAt
      };
    }

    // Check if query is already running
    const queryKey = `${type}:${query}`;
    if (this.activeQueries.has(queryKey)) {
      return this.activeQueries.get(queryKey);
    }

    // Create query promise
    const queryPromise = this.executeQuery(query, type, params);
    this.activeQueries.set(queryKey, queryPromise);

    try {
      const result = await queryPromise;
      
      // Parse and format result
      const formattedResult = this.formatResult(result, type);
      
      // Cache the result
      this.cache.set(query, type, formattedResult);

      // Record in history
      this.recordQuery(query, type, formattedResult);

      return {
        ...formattedResult,
        fromCache: false,
        retrievedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Advisory query failed:', error);
      
      // Try fallback to cached data even if expired
      const expiredCache = this.cache.get(query, type);
      if (expiredCache) {
        return {
          ...expiredCache,
          fromCache: true,
          stale: true,
          error: error.message,
          retrievedAt: expiredCache.retrievedAt
        };
      }

      throw error;
    } finally {
      this.activeQueries.delete(queryKey);
    }
  }

  /**
   * Execute the actual query with retry logic
   */
  async executeQuery(query, type, params) {
    const handler = queryTypeHandlers[type];
    if (!handler) {
      throw new Error(`Unknown query type: ${type}`);
    }

    let lastError;
    for (let attempt = 1; attempt <= ADVISORY_CONFIG.maxRetries; attempt++) {
      try {
        return await this.executeWithTimeout(handler(query, params));
      } catch (error) {
        lastError = error;
        console.warn(`Advisory query attempt ${attempt} failed:`, error.message);
        
        if (attempt < ADVISARY_CONFIG.maxRetries) {
          await this.delay(ADVISORY_CONFIG.retryDelay * attempt);
        }
      }
    }

    throw lastError;
  }

  /**
   * Execute with timeout
   */
  async executeWithTimeout(promise) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Advisory query timeout')), 
          ADVISORY_CONFIG.timeout)
      )
    ]);
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Format the raw API response
   */
  formatResult(response, type) {
    let parsed = {};
    
    if (response && response.output) {
      try {
        parsed = typeof response.output === 'string' 
          ? JSON.parse(response.output) 
          : response.output;
      } catch (e) {
        console.warn('Failed to parse advisory response:', e);
        parsed = { rawOutput: response.output };
      }
    }

    // Ensure required fields
    return {
      answer: parsed.answer || parsed.data || parsed.headlines?.[0] || 'No data available',
      confidence: parsed.confidence ?? 0.5,
      sources: parsed.sources || [],
      isLiveData: parsed.isLiveData ?? true,
      type,
      details: parsed
    };
  }

  /**
   * Record query in history
   */
  recordQuery(query, type, result) {
    this.queryHistory.push({
      query,
      type,
      result,
      timestamp: new Date().toISOString()
    });

    // Keep only last 1000 queries
    if (this.queryHistory.length > 1000) {
      this.queryHistory = this.queryHistory.slice(-1000);
    }
  }

  /**
   * Query for live facts
   */
  async queryLiveFact(question) {
    return this.query(question, ADVISORY_QUERY_TYPES.LIVE_FACT);
  }

  /**
   * Query for market data
   */
  async queryMarketData(query, params = {}) {
    return this.query(query, ADVISORY_QUERY_TYPES.MARKET_DATA, params);
  }

  /**
   * Query for technical status
   */
  async queryTechnicalStatus(query, params = {}) {
    return this.query(query, ADVISORY_QUERY_TYPES.TECHNICAL_STATUS, params);
  }

  /**
   * Query for news
   */
  async queryNews(query, params = {}) {
    return this.query(query, ADVISORY_QUERY_TYPES.NEWS_CHECK, params);
  }

  /**
   * Query for analytics
   */
  async queryAnalytics(query, params = {}) {
    return this.query(query, ADVISORY_QUERY_TYPES.REAL_TIME_ANALYTICS, params);
  }

  /**
   * Batch query multiple queries
   */
  async batchQuery(queries) {
    const results = await Promise.all(
      queries.map(({ query, type, params }) => 
        this.query(query, type, params).catch(e => ({ error: e.message }))
      )
    );
    return results;
  }

  /**
   * Get advisory layer statistics
   */
  getStats() {
    return {
      cache: this.cache.getStats(),
      historySize: this.queryHistory.length,
      activeQueries: this.activeQueries.size,
      recentQueries: this.queryHistory.slice(-10).map(q => ({
        query: q.query.substring(0, 50),
        type: q.type,
        timestamp: q.timestamp
      }))
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Export query history
   */
  exportHistory() {
    return {
      queries: this.queryHistory,
      exportedAt: new Date().toISOString()
    };
  }
}

// Singleton instance
export const advisoryLayer = new RealTimeAdvisoryLayer();

// Convenience functions
export const queryLiveFact = (question) => advisoryLayer.queryLiveFact(question);
export const queryMarketData = (query, params) => advisoryLayer.queryMarketData(query, params);
export const queryTechnicalStatus = (query, params) => advisoryLayer.queryTechnicalStatus(query, params);
export const queryNews = (query, params) => advisoryLayer.queryNews(query, params);
export const queryAnalytics = (query, params) => advisoryLayer.queryAnalytics(query, params);
export const getAdvisoryStats = () => advisoryLayer.getStats();

export default {
  advisoryLayer,
  ADVISORY_CONFIG,
  queryLiveFact,
  queryMarketData,
  queryTechnicalStatus,
  queryNews,
  queryAnalytics,
  getAdvisoryStats
};
