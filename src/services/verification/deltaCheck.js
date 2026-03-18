/**
 * Delta Check Service
 * Compares live research findings against expected findings from Internal Wisdom Check
 * Generates high-value GEL correction data
 */

import { bytezClient } from '../../api/bytezClient';

export const DELTA_CHECK_CONFIG = {
  enabled: true,
  threshold: 0.3,
  maxDivergences: 10,
  generateCorrectionData: true
};

export const DELTA_TYPES = {
  NEW_EVIDENCE: 'new_evidence',
  CONTRADICTION: 'contradiction',
  REFINEMENT: 'refinement',
  CONFIRMATION: 'confirmation',
  UNEXPECTED: 'unexpected'
};

export const DELTA_SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

class DeltaCheckService {
  constructor() {
    this.history = [];
  }

  async runDeltaCheck(expectedFindings, liveFindings, context = {}) {
    const startTime = Date.now();
    
    const divergences = this.compareFindings(expectedFindings, liveFindings);
    
    const confirmedDivergences = await this.confirmDivergences(divergences, context);
    
    const result = {
      timestamp: new Date().toISOString(),
      expectedCount: expectedFindings?.length || 0,
      liveCount: liveFindings?.length || 0,
      divergences: confirmedDivergences,
      summary: this.generateSummary(confirmedDivergences),
      correctionData: this.generateCorrectionData(confirmedDivergences),
      processingTime: Date.now() - startTime
    };

    this.history.push(result);
    
    return result;
  }

  compareFindings(expected, live) {
    if (!expected || !live) {
      return [];
    }

    const divergences = [];
    const processedLive = new Set();

    expected.forEach((expectedItem, index) => {
      const matchedLive = this.findMatchingLiveItem(expectedItem, live, processedLive);
      
      if (!matchedLive) {
        divergences.push({
          id: `delta_${index}`,
          type: DELTA_TYPES.NEW_EVIDENCE,
          expected: expectedItem,
          live: null,
          description: `Expected finding not found in live data: ${expectedItem.claim || expectedItem}`,
          severity: DELTA_SEVERITY.MEDIUM,
          deltaScore: 1.0
        });
      } else {
        processedLive.add(matchedLive.id || matchedLive.claim);
        
        const delta = this.calculateDelta(expectedItem, matchedLive);
        
        if (delta.score > DELTA_CHECK_CONFIG.threshold) {
          divergences.push({
            id: `delta_${index}`,
            type: this.categorizeDelta(delta),
            expected: expectedItem,
            live: matchedLive,
            deltaScore: delta.score,
            description: delta.description,
            severity: this.categorizeSeverity(delta.score),
            details: delta.details
          });
        }
      }
    });

    live.forEach((liveItem, index) => {
      if (!processedLive.has(liveItem.id || liveItem.claim)) {
        divergences.push({
          id: `delta_new_${index}`,
          type: DELTA_TYPES.UNEXPECTED,
          expected: null,
          live: liveItem,
          description: `Unexpected live finding: ${liveItem.claim || liveItem}`,
          severity: DELTA_SEVERITY.LOW,
          deltaScore: 0.5
        });
      }
    });

    return divergences.slice(0, DELTA_CHECK_CONFIG.maxDivergences);
  }

  findMatchingLiveItem(expectedItem, liveItems, processedSet) {
    const expectedClaim = (expectedItem.claim || expectedItem).toLowerCase();
    
    for (const liveItem of liveItems) {
      const liveClaim = (liveItem.claim || liveItem).toLowerCase();
      
      if (processedSet.has(liveItem.id || liveClaim)) {
        continue;
      }

      if (liveClaim.includes(expectedClaim) || expectedClaim.includes(liveClaim)) {
        return liveItem;
      }

      if (this.calculateSimilarity(expectedClaim, liveClaim) > 0.7) {
        return liveItem;
      }
    }
    
    return null;
  }

  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) {
      return 1.0;
    }
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
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

  calculateDelta(expected, live) {
    let score = 0;
    const details = [];

    const expCertainty = expected.certainty || expected.confidence || 5;
    const liveCertainty = live.certainty || live.confidence || 5;
    const certaintyDelta = Math.abs(expCertainty - liveCertainty) / 10;
    
    score += certaintyDelta * 0.4;
    details.push(`Certainty: ${expCertainty} → ${liveCertainty}`);

    if (expected.evidence && live.evidence) {
      const evidenceOverlap = this.calculateSimilarity(
        JSON.stringify(expected.evidence),
        JSON.stringify(live.evidence)
      );
      const evidenceDelta = 1 - evidenceOverlap;
      score += evidenceDelta * 0.4;
      details.push(`Evidence overlap: ${(evidenceOverlap * 100).toFixed(1)}%`);
    }

    if (expected.conclusion !== live.conclusion) {
      score += 0.2;
      details.push(`Conclusion changed`);
    }

    const description = details.join('; ');
    
    return {
      score: Math.min(score, 1.0),
      description
    };
  }

  categorizeDelta(delta) {
    if (delta.score > 0.7) {
      return DELTA_TYPES.CONTRADICTION;
    }
    if (delta.score > 0.3) {
      return DELTA_TYPES.REFINEMENT;
    }
    return DELTA_TYPES.CONFIRMATION;
  }

  categorizeSeverity(score) {
    if (score > 0.8) return DELTA_SEVERITY.CRITICAL;
    if (score > 0.6) return DELTA_SEVERITY.HIGH;
    if (score > 0.4) return DELTA_SEVERITY.MEDIUM;
    return DELTA_SEVERITY.LOW;
  }

  async confirmDivergences(divergences, context) {
    if (!context.requiresConfirmation || divergences.length === 0) {
      return divergences;
    }

    try {
      const prompt = `
Analyze these divergences between expected research findings and live data:

${divergences.map(d => `- ${d.type}: ${d.description}`).join('\n')}

For each divergence, confirm if it's real or could be a measurement error.
Return JSON array with id and confirmed boolean.`;

      const result = await bytezClient.runInference('gpt-5.4-pro', {
        systemPrompt: 'You are a research validation expert. Confirm or reject divergences.',
        userPrompt: prompt,
        temperature: 0.2,
        maxTokens: 500
      });

      const confirmation = this.parseConfirmation(result.output);
      
      return divergences.map(d => {
        const conf = confirmation.find(c => c.id === d.id);
        if (conf && !conf.confirmed) {
          return { ...d, confirmed: false, reason: conf.reason };
        }
        return { ...d, confirmed: true };
      });
    } catch (error) {
      console.warn('Confirmation failed, accepting original divergences:', error);
      return divergences.map(d => ({ ...d, confirmed: true }));
    }
  }

  parseConfirmation(output) {
    try {
      const match = output.match(/\[[\s\S]*\]/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch (e) {
      console.warn('Failed to parse confirmation:', e);
    }
    return [];
  }

  generateSummary(divergences) {
    const counts = {
      [DELTA_TYPES.NEW_EVIDENCE]: 0,
      [DELTA_TYPES.CONTRADICTION]: 0,
      [DELTA_TYPES.REFINEMENT]: 0,
      [DELTA_TYPES.CONFIRMATION]: 0,
      [DELTA_TYPES.UNEXPECTED]: 0
    };

    divergences.forEach(d => {
      counts[d.type] = (counts[d.type] || 0) + 1;
    });

    const criticalCount = divergences.filter(d => d.severity === DELTA_SEVERITY.CRITICAL).length;

    return {
      totalDivergences: divergences.length,
      byType: counts,
      criticalCount,
      hasMajorDivergence: criticalCount > 0 || counts[DELTA_TYPES.CONTRADICTION] > 0,
      recommendation: criticalCount > 0 
        ? 'Review required - critical contradictions found'
        : counts[DELTA_TYPES.CONTRADICTION] > 0
        ? 'Verify contradictions before proceeding'
        : 'Minor divergences - proceed with caution'
    };
  }

  generateCorrectionData(divergences) {
    if (!DELTA_CHECK_CONFIG.generateCorrectionData) {
      return [];
    }

    const corrections = divergences
      .filter(d => d.type === DELTA_TYPES.CONTRADICTION || d.type === DELTA_TYPES.REFINEMENT)
      .map(d => ({
        id: `correction_${d.id}`,
        originalExpected: d.expected,
        correctedLive: d.live,
        correctionType: d.type,
        severity: d.severity,
        timestamp: new Date().toISOString(),
        usedForLearning: false
      }));

    return corrections;
  }

  async quickDeltaCheck(expected, live) {
    const divergences = this.compareFindings(expected, live);
    
    return {
      hasDivergences: divergences.length > 0,
      divergenceCount: divergences.length,
      criticalCount: divergences.filter(d => d.severity === DELTA_SEVERITY.CRITICAL).length,
      divergences: divergences.slice(0, 3)
    };
  }

  getHistory() {
    return this.history;
  }

  clearHistory() {
    this.history = [];
  }
}

export const deltaCheckService = new DeltaCheckService();

export const runDeltaCheck = (expectedFindings, liveFindings, context) => 
  deltaCheckService.runDeltaCheck(expectedFindings, liveFindings, context);

export const quickDeltaCheck = (expected, live) => 
  deltaCheckService.quickDeltaCheck(expected, live);

export default deltaCheckService;
