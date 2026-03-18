/**
 * TDS GEL Cache Integration
 * Returns cached verified output immediately on exact-match tasks
 * Implements zero-cost optimization from spec
 */

import { gel } from '../verification/gel';

export const TDS_CACHE_CONFIG = {
  enabled: true,
  exactMatchOnly: true,
  minCertaintyThreshold: 8,
  cacheTTL: 86400
};

export class TDSGELCache {
  constructor() {
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  async checkCache(userPrompt, context = {}) {
    if (!TDS_CACHE_CONFIG.enabled) {
      return { hit: false, reason: 'disabled' };
    }

    try {
      const normalizedPrompt = this.normalizePrompt(userPrompt);
      
      const results = await gel.queryGEL(normalizedPrompt, {
        limit: 5,
        minCertainty: TDS_CACHE_CONFIG.minCertaintyThreshold
      });

      if (results && results.length > 0) {
        const exactMatch = results.find(r => 
          this.isExactMatch(normalizedPrompt, r.fact)
        );

        if (exactMatch) {
          this.cacheHits++;
          return {
            hit: true,
            cachedResult: exactMatch,
            confidence: exactMatch.certainty,
            source: 'gel_cache',
            savings: '100% - zero API cost'
          };
        }
      }

      this.cacheMisses++;
      return { hit: false, reason: 'no_exact_match' };
    } catch (error) {
      console.warn('[TDS Cache] Query failed:', error);
      return { hit: false, reason: 'query_error' };
    }
  }

  normalizePrompt(prompt) {
    return prompt
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 500);
  }

  isExactMatch(prompt, fact) {
    const normalizedFact = this.normalizePrompt(fact);
    
    if (prompt === normalizedFact) {
      return true;
    }

    const similarity = this.calculateSimilarity(prompt, normalizedFact);
    return similarity > 0.95;
  }

  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1;
    
    const editDistance = this.levenshtein(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  levenshtein(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  getCacheStats() {
    const total = this.cacheHits + this.cacheMisses;
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: total > 0 ? ((this.cacheHits / total) * 100).toFixed(2) : 0,
      savings: this.cacheHits * 0.02
    };
  }

  reset() {
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}

export const tdsGELCache = new TDSGELCache();
export default tdsGELCache;
