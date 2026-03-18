/**
 * Cost Tracking Service
 * Real-time monitoring of API usage and cost optimization
 * Tracks spending across providers, models, and phases
 */

export const COST_CONFIG = {
  enabled: true,
  trackPerPhase: true,
  trackPerModel: true,
  trackPerProvider: true,
  budgetLimit: 100,
  alertThreshold: 0.8
};

const MODEL_COSTS = {
  'gpt-5.4-pro': { input: 0.01, output: 0.03, provider: 'OpenAI' },
  'gpt-4o': { input: 0.005, output: 0.015, provider: 'OpenAI' },
  'claude-opus-4.6': { input: 0.015, output: 0.075, provider: 'Anthropic' },
  'claude-sonnet-4.6': { input: 0.003, output: 0.015, provider: 'Anthropic' },
  'gemini-3.1-pro': { input: 0.00125, output: 0.005, provider: 'Google' },
  'grok-4.2': { input: 0.005, output: 0.015, provider: 'Groq' },
  'mixtral-8x7b-32768': { input: 0.00027, output: 0.00027, provider: 'Groq' },
  'llama-3.3-70b-versatile': { input: 0.00059, output: 0.00079, provider: 'Groq' },
  'step-flash': { input: 0.0, output: 0.0, provider: 'NVIDIA' },
  'nemotron-3-super': { input: 0.0, output: 0.0, provider: 'NVIDIA' },
  'openrouter/hunter-alpha': { input: 0.0, output: 0.0, provider: 'OpenRouter' },
  'minimax/minimax-m2.5:free': { input: 0.0, output: 0.0, provider: 'OpenRouter' },
  'deepseek-ai/deepseek-v3.2': { input: 0.0, output: 0.0, provider: 'OpenRouter' }
};

const PHASE_COSTS = {
  'Refining': 0.05,
  'Planning': 0.15,
  'Research': 0.25,
  'Implementation': 0.20,
  'Close-Out': 0.10
};

class CostTracker {
  constructor() {
    this.sessions = new Map();
    this.currentSession = null;
    this.globalStats = {
      totalSpent: 0,
      totalRequests: 0,
      totalTokens: { input: 0, output: 0 },
      byProvider: {},
      byModel: {},
      byPhase: {},
      savings: 0
    };
    this.alerts = [];
  }

  startSession(sessionId) {
    const session = {
      id: sessionId,
      startTime: Date.now(),
      requests: [],
      totalSpent: 0,
      totalTokens: { input: 0, output: 0 },
      byProvider: {},
      byModel: {},
      byPhase: {},
      status: 'running'
    };
    
    this.sessions.set(sessionId, session);
    this.currentSession = session;
    
    return session;
  }

  endSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.endTime = Date.now();
      session.duration = session.endTime - session.startTime;
      session.status = 'completed';
      this.currentSession = null;
    }
    return session;
  }

  trackRequest(modelId, usage, phase, metadata = {}) {
    const cost = this.calculateCost(modelId, usage);
    
    const request = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      modelId,
      provider: MODEL_COSTS[modelId]?.provider || 'Unknown',
      phase: phase || 'unknown',
      tokens: usage,
      cost,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    if (this.currentSession) {
      this.currentSession.requests.push(request);
      this.currentSession.totalSpent += cost;
      this.currentSession.totalTokens.input += usage.prompt_tokens || 0;
      this.currentSession.totalTokens.output += usage.completion_tokens || 0;
      
      const provider = request.provider;
      const model = request.modelId;
      const ph = request.phase;

      this.currentSession.byProvider[provider] = (this.currentSession.byProvider[provider] || 0) + cost;
      this.currentSession.byModel[model] = (this.currentSession.byModel[model] || 0) + cost;
      this.currentSession.byPhase[ph] = (this.currentSession.byPhase[ph] || 0) + cost;
    }

    this.globalStats.totalSpent += cost;
    this.globalStats.totalRequests++;
    this.globalStats.totalTokens.input += usage.prompt_tokens || 0;
    this.globalStats.totalTokens.output += usage.completion_tokens || 0;
    
    const gProvider = request.provider;
    const gModel = request.modelId;
    const gPhase = request.phase;

    this.globalStats.byProvider[gProvider] = (this.globalStats.byProvider[gProvider] || 0) + cost;
    this.globalStats.byModel[gModel] = (this.globalStats.byModel[gModel] || 0) + cost;
    this.globalStats.byPhase[gPhase] = (this.globalStats.byPhase[gPhase] || 0) + cost;

    if (COST_CONFIG.enabled) {
      this.checkBudget();
    }

    return { request, cost };
  }

  calculateCost(modelId, usage) {
    const modelCost = MODEL_COSTS[modelId];
    
    if (!modelCost) {
      return this.estimateCost(usage);
    }

    if (modelCost.input === 0 && modelCost.output === 0) {
      return 0;
    }

    const inputCost = ((usage.prompt_tokens || 0) / 1000000) * modelCost.input;
    const outputCost = ((usage.completion_tokens || 0) / 1000000) * modelCost.output;
    
    return inputCost + outputCost;
  }

  estimateCost(usage) {
    const totalTokens = (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);
    return (totalTokens / 1000) * 0.02;
  }

  trackSavings(amount, reason) {
    this.globalStats.savings += amount;
    
    if (this.currentSession) {
      this.currentSession.savings = (this.currentSession.savings || 0) + amount;
    }

    this.alerts.push({
      type: 'savings',
      amount,
      reason,
      timestamp: new Date().toISOString()
    });
  }

  checkBudget() {
    const spent = this.globalStats.totalSpent;
    const limit = COST_CONFIG.budgetLimit;
    const threshold = limit * COST_CONFIG.alertThreshold;

    if (spent >= threshold && spent < limit) {
      this.alerts.push({
        type: 'budget_warning',
        message: `Budget ${((spent/limit)*100).toFixed(0)}% used`,
        spent,
        limit,
        timestamp: new Date().toISOString()
      });
    }

    if (spent >= limit) {
      this.alerts.push({
        type: 'budget_exceeded',
        message: 'Budget limit reached',
        spent,
        limit,
        timestamp: new Date().toISOString()
      });
    }
  }

  getSessionStats(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      sessionId: session.id,
      status: session.status,
      duration: session.duration || Date.now() - session.startTime,
      totalSpent: session.totalSpent.toFixed(4),
      totalRequests: session.requests.length,
      totalTokens: session.totalTokens,
      byProvider: session.byProvider,
      byModel: session.byModel,
      byPhase: session.byPhase,
      savings: session.savings || 0
    };
  }

  getGlobalStats() {
    return {
      ...this.globalStats,
      totalSpent: this.globalStats.totalSpent.toFixed(4),
      budgetStatus: {
        spent: this.globalStats.totalSpent,
        limit: COST_CONFIG.budgetLimit,
        percentUsed: ((this.globalStats.totalSpent / COST_CONFIG.budgetLimit) * 100).toFixed(2),
        remaining: (COST_CONFIG.budgetLimit - this.globalStats.totalSpent).toFixed(2)
      },
      avgCostPerRequest: this.globalStats.totalRequests > 0 
        ? (this.globalStats.totalSpent / this.globalStats.totalRequests).toFixed(4)
        : 0
    };
  }

  getProviderBreakdown() {
    return Object.entries(this.globalStats.byProvider).map(([provider, cost]) => ({
      provider,
      cost: parseFloat(cost.toFixed(4)),
      percent: ((cost / this.globalStats.totalSpent) * 100).toFixed(1)
    }));
  }

  getModelBreakdown() {
    return Object.entries(this.globalStats.byModel).map(([model, cost]) => ({
      model,
      cost: parseFloat(cost.toFixed(4)),
      provider: MODEL_COSTS[model]?.provider || 'Unknown',
      percent: ((cost / this.globalStats.totalSpent) * 100).toFixed(1)
    }));
  }

  getPhaseBreakdown() {
    return Object.entries(this.globalStats.byPhase).map(([phase, cost]) => ({
      phase,
      cost: parseFloat(cost.toFixed(4)),
      percent: ((cost / this.globalStats.totalSpent) * 100).toFixed(1)
    }));
  }

  getAlerts() {
    return this.alerts.slice(-20);
  }

  clearAlerts() {
    this.alerts = [];
  }

  getSessionList() {
    return Array.from(this.sessions.values()).map(s => ({
      id: s.id,
      status: s.status,
      startTime: s.startTime,
      endTime: s.endTime,
      totalSpent: s.totalSpent.toFixed(4),
      requestCount: s.requests.length
    }));
  }

  exportReport(format = 'json') {
    const report = {
      generatedAt: new Date().toISOString(),
      globalStats: this.getGlobalStats(),
      providerBreakdown: this.getProviderBreakdown(),
      modelBreakdown: this.getModelBreakdown(),
      phaseBreakdown: this.getPhaseBreakdown(),
      sessions: this.getSessionList(),
      alerts: this.getAlerts()
    };

    if (format === 'csv') {
      return this.exportCSV(report);
    }

    return report;
  }

  exportCSV(report) {
    let csv = 'Category,Item,Cost,Percent\n';
    
    report.providerBreakdown.forEach(p => {
      csv += `Provider,${p.provider},${p.cost},${p.percent}\n`;
    });
    
    report.modelBreakdown.forEach(m => {
      csv += `Model,${m.model},${m.cost},${m.percent}\n`;
    });
    
    report.phaseBreakdown.forEach(p => {
      csv += `Phase,${p.phase},${p.cost},${p.percent}\n`;
    });

    return csv;
  }
}

export const costTracker = new CostTracker();

export const startSession = (sessionId) => costTracker.startSession(sessionId);
export const endSession = (sessionId) => costTracker.endSession(sessionId);
export const trackRequest = (modelId, usage, phase, metadata) => 
  costTracker.trackRequest(modelId, usage, phase, metadata);
export const trackSavings = (amount, reason) => costTracker.trackSavings(amount, reason);
export const getGlobalStats = () => costTracker.getGlobalStats();
export const getProviderBreakdown = () => costTracker.getProviderBreakdown();
export const getModelBreakdown = () => costTracker.getModelBreakdown();
export const getPhaseBreakdown = () => costTracker.getPhaseBreakdown();
export const exportCostReport = (format) => costTracker.exportReport(format);

export default costTracker;
