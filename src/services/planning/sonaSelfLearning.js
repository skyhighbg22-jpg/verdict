/**
 * SONA Self-Learning Service
 * Session-over-session routing improvement
 * Learns optimal model routing and pattern selection
 */

import { bytezClient } from '../../api/bytezClient';

export const SONA_CONFIG = {
  enabled: true,
  minSessionsForLearning: 3,
  confidenceThreshold: 0.7,
  maxPatterns: 100,
  decayFactor: 0.95,
  explorationRate: 0.1
};

export const PATTERN_TYPES = {
  ROUTING: 'routing',
  VERIFICATION: 'verification',
  DECOMPOSITION: 'decomposition',
  VALIDATION: 'validation'
};

export const OUTCOME_TYPES = {
  SUCCESS: 'success',
  PARTIAL: 'partial',
  FAILURE: 'failure'
};

const DEFAULT_MODEL_PREFERENCES = {
  'TDS': { preferred: ['gpt-5.4-pro'], fallback: ['gpt-4o', 'claude-opus-4.6'] },
  'GDE': { preferred: ['claude-opus-4.6'], fallback: ['gpt-5.4-pro', 'gemini-3.1-pro'] },
  'PLANNING': { 
    'Systems Architect': ['gemini-3.1-pro'],
    'Security Auditor': ['gpt-5.4-pro'],
    'Product Designer': ['claude-opus-4.6']
  },
  'RESEARCH': { preferred: ['claude-opus-4.6'], fallback: ['gpt-5.4-pro'] },
  'SKEPTIC': { preferred: ['grok-4.2'], fallback: ['gpt-5.4-pro'] },
  'ADVISORY': { preferred: ['grok-4.2'], fallback: ['gemini-3.1-pro'] },
  'IMPLEMENTATION': { preferred: ['claude-opus-4.6'], fallback: ['gpt-5.4-pro'] }
};

class SONAService {
  constructor() {
    this.patterns = new Map();
    this.sessionHistory = [];
    this.modelScores = new Map();
    this.routingCache = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    this.patterns = new Map([
      [PATTERN_TYPES.ROUTING, []],
      [PATTERN_TYPES.VERIFICATION, []],
      [PATTERN_TYPES.DECOMPOSITION, []],
      [PATTERN_TYPES.VALIDATION, []]
    ]);

    Object.keys(DEFAULT_MODEL_PREFERENCES).forEach(task => {
      this.modelScores.set(task, {
        scores: {},
        totalUses: 0,
        successfulUses: 0
      });
    });

    this.initialized = true;
    console.log('[SONA] Self-learning service initialized');
  }

  async recordSession(sessionData) {
    await this.initialize();
    
    const session = {
      id: sessionData.id || `session_${Date.now()}`,
      tasks: sessionData.tasks || [],
      outcomes: sessionData.outcomes || [],
      metrics: sessionData.metrics || {},
      timestamp: new Date().toISOString()
    };

    this.sessionHistory.push(session);
    
    await this.learnFromSession(session);
    
    if (this.sessionHistory.length > SONA_CONFIG.maxPatterns) {
      this.sessionHistory = this.sessionHistory.slice(-SONA_CONFIG.maxPatterns);
    }

    return this.generateRecommendations(session);
  }

  async learnFromSession(session) {
    const recentSessions = this.sessionHistory.slice(-10);
    
    if (recentSessions.length < SONA_CONFIG.minSessionsForLearning) {
      return;
    }

    for (const taskType of Object.keys(DEFAULT_MODEL_PREFERENCES)) {
      const taskSessions = recentSessions.filter(s => 
        s.tasks.some(t => t.type === taskType)
      );

      if (taskSessions.length === 0) continue;

      const modelStats = {};
      
      taskSessions.forEach(session => {
        session.tasks.filter(t => t.type === taskType).forEach(task => {
          task.modelUsed = task.modelUsed || task.model;
          
          if (!modelStats[task.modelUsed]) {
            modelStats[task.modelUsed] = { success: 0, total: 0 };
          }
          
          modelStats[task.modelUsed].total++;
          
          const outcome = session.outcomes?.[task.id] || OUTCOME_TYPES.SUCCESS;
          if (outcome === OUTCOME_TYPES.SUCCESS) {
            modelStats[task.modelUsed].success++;
          }
        });
      });

      const currentScores = this.modelScores.get(taskType);
      
      Object.entries(modelStats).forEach(([model, stats]) => {
        const successRate = stats.total > 0 ? stats.success / stats.total : 0;
        const previousScore = currentScores.scores[model] || 0.5;
        
        currentScores.scores[model] = 
          (previousScore * SONA_CONFIG.decayFactor) + 
          (successRate * (1 - SONA_CONFIG.decayFactor));
        
        currentScores.totalUses += stats.total;
        currentScores.successfulUses += stats.success;
      });

      this.modelScores.set(taskType, currentScores);
    }

    this.updateRoutingPatterns();
  }

  updateRoutingPatterns() {
    const patterns = [];
    
    this.modelScores.forEach((data, taskType) => {
      const sortedModels = Object.entries(data.scores)
        .sort((a, b) => b[1] - a[1]);
      
      if (sortedModels.length > 0) {
        patterns.push({
          type: PATTERN_TYPES.ROUTING,
          taskType,
          preferred: sortedModels[0][0],
          fallback: sortedModels[1]?.[0] || sortedModels[0][0],
          confidence: sortedModels[0][1],
          timestamp: new Date().toISOString()
        });
      }
    });

    this.patterns.set(PATTERN_TYPES.ROUTING, patterns);
  }

  getOptimalModel(taskType, context = {}) {
    const scores = this.modelScores.get(taskType);
    
    if (!scores || scores.totalUses < SONA_CONFIG.minSessionsForLearning * 2) {
      return DEFAULT_MODEL_PREFERENCES[taskType] || { 
        preferred: 'gpt-5.4-pro', 
        fallback: 'claude-opus-4.6' 
      };
    }

    const exploration = Math.random() < SONA_CONFIG.explorationRate;
    
    if (exploration) {
      const allModels = Object.keys(scores.scores);
      const randomModel = allModels[Math.floor(Math.random() * allModels.length)];
      return { preferred: randomModel, fallback: DEFAULT_MODEL_PREFERENCES[taskType]?.fallback?.[0] };
    }

    const sortedModels = Object.entries(scores.scores)
      .filter(([_, score]) => score >= SONA_CONFIG.confidenceThreshold)
      .sort((a, b) => b[1] - a[1]);

    if (sortedModels.length === 0) {
      return DEFAULT_MODEL_PREFERENCES[taskType];
    }

    return {
      preferred: sortedModels[0][0],
      fallback: sortedModels[1]?.[0] || sortedModels[0][0]
    };
  }

  async evaluateOutcome(taskId, taskType, modelUsed, outcome, metrics = {}) {
    await this.initialize();
    
    const scores = this.modelScores.get(taskType);
    
    if (!scores) return;

    if (!scores.scores[modelUsed]) {
      scores.scores[modelUsed] = 0.5;
    }

    const weight = metrics.confidence || 1.0;
    const previousScore = scores.scores[modelUsed];
    const outcomeValue = outcome === OUTCOME_TYPES.SUCCESS ? 1 : 
                        outcome === OUTCOME_TYPES.PARTIAL ? 0.5 : 0;

    scores.scores[modelUsed] = 
      (previousScore * 0.7) + (outcomeValue * 0.3 * weight);

    scores.totalUses++;
    if (outcome === OUTCOME_TYPES.SUCCESS) {
      scores.successfulUses++;
    }

    this.modelScores.set(taskType, scores);
    this.updateRoutingPatterns();

    if (outcome === OUTCOME_TYPES.FAILURE && modelUsed !== scores.scores[Object.keys(scores.scores).reduce((a, b) => scores.scores[a] > scores.scores[b] ? a : b)]) {
      return {
        recommendation: 'switch_model',
        reason: 'Current model has high failure rate',
        suggestedModel: this.getOptimalModel(taskType).preferred
      };
    }

    return null;
  }

  generateRecommendations(session) {
    const recommendations = [];
    
    const lowPerformance = [];
    
    this.modelScores.forEach((scores, taskType) => {
      const sorted = Object.entries(scores.scores).sort((a, b) => a[1] - b[1]);
      
      if (sorted.length > 0 && sorted[0][1] < SONA_CONFIG.confidenceThreshold) {
        lowPerformance.push({
          taskType,
          currentModel: sorted[0][0],
          confidence: sorted[0][1],
          suggestedModel: sorted[sorted.length - 1]?.[0]
        });
      }
    });

    if (lowPerformance.length > 0) {
      recommendations.push({
        type: 'model_switch',
        priority: 'high',
        items: lowPerformance,
        rationale: 'Low confidence in current model selections'
      });
    }

    const routingPatterns = this.patterns.get(PATTERN_TYPES.ROUTING) || [];
    if (routingPatterns.length > 0) {
      recommendations.push({
        type: 'routing_optimization',
        priority: 'medium',
        patterns: routingPatterns
      });
    }

    return {
      recommendations,
      timestamp: new Date().toISOString(),
      sessionId: session.id
    };
  }

  async analyzeWithLLM(context) {
    try {
      const prompt = `
Analyze these routing patterns and provide optimization recommendations:

Patterns: ${JSON.stringify(Array.from(this.patterns.values()))}
Recent Sessions: ${JSON.stringify(this.sessionHistory.slice(-5))}
Model Scores: ${JSON.stringify(Object.fromEntries(this.modelScores))}

Context: ${JSON.stringify(context)}

Provide recommendations in JSON format:
{
  "recommendations": [
    {
      "type": "string",
      "priority": "high|medium|low",
      "description": "string",
      "action": "string"
    }
  ]
}`;

      const result = await bytezClient.runInference('claude-opus-4.6', {
        systemPrompt: 'You are a routing optimization expert. Analyze patterns and recommend improvements.',
        userPrompt: prompt,
        temperature: 0.3,
        maxTokens: 1500
      });

      const jsonMatch = result.output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn('[SONA] LLM analysis failed:', error);
    }
    
    return { recommendations: [] };
  }

  getModelScores(taskType) {
    return this.modelScores.get(taskType) || { scores: {}, totalUses: 0, successfulUses: 0 };
  }

  getAllModelScores() {
    const scores = {};
    this.modelScores.forEach((data, task) => {
      scores[task] = {
        ...data,
        successRate: data.totalUses > 0 ? (data.successfulUses / data.totalUses).toFixed(3) : 0
      };
    });
    return scores;
  }

  getRoutingPatterns() {
    return Object.fromEntries(this.patterns);
  }

  getSessionHistory(count = 10) {
    return this.sessionHistory.slice(-count);
  }

  reset() {
    this.patterns.clear();
    this.sessionHistory = [];
    this.modelScores.clear();
    this.routingCache.clear();
    this.initialized = false;
  }

  exportKnowledge() {
    return {
      modelScores: Object.fromEntries(this.modelScores),
      patterns: Object.fromEntries(this.patterns),
      sessionCount: this.sessionHistory.length,
      exportedAt: new Date().toISOString()
    };
  }

  importKnowledge(data) {
    if (data.modelScores) {
      this.modelScores = new Map(Object.entries(data.modelScores));
    }
    if (data.patterns) {
      this.patterns = new Map(Object.entries(data.patterns));
    }
    this.initialized = true;
  }
}

export const sonaService = new SONAService();

export const recordSession = (sessionData) => sonaService.recordSession(sessionData);
export const evaluateOutcome = (taskId, taskType, modelUsed, outcome, metrics) => 
  sonaService.evaluateOutcome(taskId, taskType, modelUsed, outcome, metrics);
export const getOptimalModel = (taskType, context) => 
  sonaService.getOptimalModel(taskType, context);
export const getModelScores = (taskType) => sonaService.getModelScores(taskType);
export const getAllModelScores = () => sonaService.getAllModelScores();
export const exportSONAKnowledge = () => sonaService.exportKnowledge();
export const importSONAKnowledge = (data) => sonaService.importKnowledge(data);

export default sonaService;
