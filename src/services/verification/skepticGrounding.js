/**
 * Skeptic Grounding Component
 * Dedicated live X/cross-reference component for explicit cross-referencing
 * Surfaces contradictions invisible to static models
 */

import { bytezClient } from '../../api/bytezClient';

export const SKEPTIC_GROUNDING_CONFIG = {
  enabled: true,
  grokModel: 'grok-4.2',
  secondaryCheck: 'gemini-3.1-pro',
  maxFindings: 5,
  minConfidence: 0.5,
  crossReferenceSources: ['x', 'web', 'news', 'academic']
};

export const GROUNDING_STATUS = {
  PENDING: 'pending',
  SEARCHING: 'searching',
  VERIFIED: 'verified',
  CONTRADICTED: 'contradicted',
  UNCERTAIN: 'uncertain'
};

class SkepticGroundingComponent {
  constructor() {
    this.groundingHistory = [];
    this.contradictionsFound = 0;
    this.verificationsConfirmed = 0;
  }

  async groundClaim(claim, context = {}) {
    const startTime = Date.now();
    
    const grounding = {
      id: `grounding_${Date.now()}`,
      claim,
      context,
      status: GROUNDING_STATUS.SEARCHING,
      timestamp: new Date().toISOString()
    };

    try {
      const findings = await this.searchLiveData(claim, context);
      grounding.findings = findings;

      if (findings.length === 0) {
        grounding.status = GROUNDING_STATUS.UNCERTAIN;
        grounding.confidence = 0.3;
        grounding.contradictions = [];
      } else {
        const analysis = await this.analyzeFindings(claim, findings);
        grounding.analysis = analysis;
        grounding.confidence = analysis.confidence;
        
        if (analysis.hasContradiction) {
          grounding.status = GROUNDING_STATUS.CONTRADICTED;
          grounding.contradictions = analysis.contradictions;
          this.contradictionsFound++;
        } else if (analysis.confirmed) {
          grounding.status = GROUNDING_STATUS.VERIFIED;
          this.verificationsConfirmed++;
        } else {
          grounding.status = GROUNDING_STATUS.UNCERTAIN;
        }
      }

      grounding.duration = Date.now() - startTime;
      this.groundingHistory.push(grounding);

      return grounding;
    } catch (error) {
      grounding.status = GROUNDING_STATUS.UNCERTAIN;
      grounding.error = error.message;
      grounding.confidence = 0.1;
      grounding.duration = Date.now() - startTime;
      
      this.groundingHistory.push(grounding);
      return grounding;
    }
  }

  async searchLiveData(claim, context) {
    const findings = [];
    
    try {
      const xResult = await this.searchX(claim);
      if (xResult) findings.push(xResult);
    } catch (e) {
      console.warn('[SkepticGrounding] X search failed:', e);
    }

    try {
      const webResult = await this.searchWeb(claim);
      if (webResult) findings.push(webResult);
    } catch (e) {
      console.warn('[SkepticGrounding] Web search failed:', e);
    }

    try {
      const newsResult = await this.searchNews(claim);
      if (newsResult) findings.push(newsResult);
    } catch (e) {
      console.warn('[SkepticGrounding] News search failed:', e);
    }

    return findings.slice(0, SKEPTIC_GROUNDING_CONFIG.maxFindings);
  }

  async searchX(claim) {
    const prompt = `
Search for recent posts on X (Twitter) that relate to or contradict this claim:

Claim: "${claim}"

Find posts that:
- Confirm the claim
- Contradict the claim  
- Provide additional context
- Are from reputable sources

Return JSON:
{
  "source": "x",
  "posts": [
    {"author": "username", "content": "...", "date": "YYYY-MM-DD", "sentiment": "positive|negative|neutral"}
  ],
  "related_topics": ["topic1", "topic2"],
  "overall_sentiment": "positive|negative|neutral"
}`;

    const result = await bytezClient.runInference(SKEPTIC_GROUNDING_CONFIG.grokModel, {
      systemPrompt: 'You are a social media research assistant with access to X data.',
      userPrompt: prompt,
      temperature: 0.3,
      maxTokens: 1000
    });

    try {
      const parsed = this.extractJSON(result.output);
      return parsed || { source: 'x', error: 'Parse failed' };
    } catch {
      return { source: 'x', error: 'Parse failed', raw: result.output };
    }
  }

  async searchWeb(claim) {
    const prompt = `
Search for web information that relates to this claim:

Claim: "${claim}"

Provide:
- Conflicting viewpoints
- Supporting evidence
- Recent developments
- Expert opinions

Return JSON:
{
  "source": "web",
  "results": [
    {"title": "...", "url": "...", "snippet": "...", "relevance": 0.0-1.0}
  ],
  "summary": "brief summary"
}`;

    const result = await bytezClient.runInference(SKEPTIC_GROUNDING_CONFIG.grokModel, {
      systemPrompt: 'You are a web search research assistant.',
      userPrompt: prompt,
      temperature: 0.3,
      maxTokens: 800
    });

    try {
      const parsed = this.extractJSON(result.output);
      return parsed || { source: 'web', error: 'Parse failed' };
    } catch {
      return { source: 'web', error: 'Parse failed' };
    }
  }

  async searchNews(claim) {
    const prompt = `
Search for recent news related to this claim:

Claim: "${claim}"

Find recent news articles that:
- Confirm or contradict the claim
- Provide context
- Show recent developments

Return JSON:
{
  "source": "news",
  "articles": [
    {"headline": "...", "source": "...", "date": "YYYY-MM-DD", "summary": "..."}
  ],
  "time_relevance": "recent|stale|outdated"
}`;

    const result = await bytezClient.runInference(SKEPTIC_GROUNDING_CONFIG.grokModel, {
      systemPrompt: 'You are a news research assistant.',
      userPrompt: prompt,
      temperature: 0.3,
      maxTokens: 600
    });

    try {
      const parsed = this.extractJSON(result.output);
      return parsed || { source: 'news', error: 'Parse failed' };
    } catch {
      return { source: 'news', error: 'Parse failed' };
    }
  }

  async analyzeFindings(claim, findings) {
    const findingsText = findings.map(f => JSON.stringify(f)).join('\n\n');
    
    const prompt = `
Analyze these live data findings against the original claim:

Original Claim: "${claim}"

Findings:
${findingsText}

Determine:
1. Does the evidence support, contradict, or remain neutral to the claim?
2. Are there contradictions between different sources?
3. What's the overall confidence (0-1)?

Return JSON:
{
  "supported": boolean,
  "contradicted": boolean,
  "hasContradiction": boolean,
  "confidence": 0.0-1.0,
  "contradictions": [{"source1": "...", "source2": "...", "issue": "..."}],
  "reasoning": "explanation",
  "confirmed": boolean
}`;

    try {
      const result = await bytezClient.runInference(SKEPTIC_GROUNDING_CONFIG.secondaryCheck, {
        systemPrompt: 'You are a verification and contradiction detection expert.',
        userPrompt: prompt,
        temperature: 0.2,
        maxTokens: 800
      });

      const parsed = this.extractJSON(result.output);
      return parsed || {
        supported: false,
        contradicted: false,
        hasContradiction: false,
        confidence: 0.5,
        confirmed: false
      };
    } catch {
      return {
        supported: false,
        contradicted: false,
        hasContradiction: false,
        confidence: 0.5,
        confirmed: false,
        error: 'Analysis failed'
      };
    }
  }

  extractJSON(text) {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return null;
      }
    }
    return null;
  }

  async groundBatch(claims, context = {}) {
    const results = [];
    
    for (const claim of claims) {
      const result = await this.groundClaim(claim, context);
      results.push(result);
    }

    return results;
  }

  getGroundingStats() {
    const total = this.groundingHistory.length;
    const byStatus = {
      verified: 0,
      contradicted: 0,
      uncertain: 0
    };

    this.groundingHistory.forEach(g => {
      if (g.status === GROUNDING_STATUS.VERIFIED) byStatus.verified++;
      else if (g.status === GROUNDING_STATUS.CONTRADICTED) byStatus.contradicted++;
      else byStatus.uncertain++;
    });

    return {
      total,
      contradictionsFound: this.contradictionsFound,
      verificationsConfirmed: this.verificationsConfirmed,
      byStatus,
      contradictionRate: total > 0 ? ((this.contradictionsFound / total) * 100).toFixed(2) : 0
    };
  }

  getHistory(count = 10) {
    return this.groundingHistory.slice(-count);
  }

  clearHistory() {
    this.groundingHistory = [];
    this.contradictionsFound = 0;
    this.verificationsConfirmed = 0;
  }
}

export const skepticGrounding = new SkepticGroundingComponent();

export const groundClaim = (claim, context) => skepticGrounding.groundClaim(claim, context);
export const groundBatch = (claims, context) => skepticGrounding.groundBatch(claims, context);
export const getGroundingStats = () => skepticGrounding.getGroundingStats();

export default skepticGrounding;
