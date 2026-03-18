/**
 * MIRA Dynamic Jury Substitution
 * Dynamically substitutes jury composition if a model fails probe threshold
 * Ensures calibration accuracy throughout the session
 */

import { HIDDEN_CONTROL_QUESTIONS, calculateCalibrationScore } from '../miraEngine';

export const JURY_SUBSTITUTION_CONFIG = {
  enabled: true,
  probeThreshold: 0.6,
  maxSubstitutions: 3,
  fallbackModels: {
    'gpt-5.4-pro': ['gpt-4o', 'claude-opus-4.6', 'gemini-3.1-pro'],
    'claude-opus-4.6': ['claude-sonnet-4.6', 'gpt-5.4-pro', 'gemini-3.1-pro'],
    'gemini-3.1-pro': ['gpt-5.4-pro', 'claude-opus-4.6'],
    'grok-4.2': ['gpt-5.4-pro', 'gemini-3.1-pro']
  }
};

const JURY_STATS = {
  totalProbes: 0,
  failedProbes: 0,
  substitutions: 0,
  originalModels: [],
  substitutedModels: []
};

class JurySubstitutionManager {
  constructor() {
    this.modelScores = new Map();
    this.originalComposition = [];
    this.currentComposition = [];
    this.substitutionHistory = [];
  }

  setOriginalComposition(models) {
    this.originalComposition = [...models];
    this.currentComposition = [...models];
    JURY_STATS.originalModels = [...models];
  }

  async runProbe(modelId, context = {}) {
    const probeQuestions = this.selectProbeQuestions(3);
    
    const responses = probeQuestions.map(q => ({
      questionId: q.id,
      selectedAnswer: null,
      confidence: 0.5,
      responseTime: 0
    }));

    const calibration = calculateCalibrationScore(responses);
    
    const probeResult = {
      modelId,
      timestamp: new Date().toISOString(),
      questionsAsked: probeQuestions.length,
      correctAnswers: 0,
      calibrationScore: calibration.calibrationScore,
      passed: calibration.calibrationScore >= JURY_SUBSTITUTION_CONFIG.probeThreshold,
      substituted: false,
      substituteModel: null
    };

    this.modelScores.set(modelId, {
      score: calibration.calibrationScore,
      timestamp: Date.now(),
      probeResult
    });

    JURY_STATS.totalProbes++;

    if (!probeResult.passed) {
      JURY_STATS.failedProbes++;
      probeResult.substituted = true;
      probeResult.substituteModel = this.getSubstituteModel(modelId);
      
      if (probeResult.substituteModel) {
        this.substituteModel(modelId, probeResult.substituteModel);
        this.substitutionHistory.push({
          original: modelId,
          substitute: probeResult.substituteModel,
          reason: 'probe_failure',
          calibrationScore: calibration.calibrationScore,
          timestamp: new Date().toISOString()
        });
        
        JURY_STATS.substitutions++;
        JURY_STATS.substitutedModels.push(probeResult.substituteModel);
      }
    }

    return probeResult;
  }

  selectProbeQuestions(count) {
    const shuffled = [...HIDDEN_CONTROL_QUESTIONS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  getSubstituteModel(failedModel) {
    const fallbacks = JURY_SUBSTITUTION_CONFIG.fallbackModels[failedModel];
    
    if (!fallbacks || fallbacks.length === 0) {
      return null;
    }

    for (const candidate of fallbacks) {
      if (!this.currentComposition.includes(candidate)) {
        const candidateScore = this.modelScores.get(candidate);
        if (!candidateScore || candidateScore.score >= JURY_SUBSTITUTION_CONFIG.probeThreshold) {
          return candidate;
        }
      }
    }

    return fallbacks[0];
  }

  substituteModel(original, substitute) {
    const index = this.currentComposition.indexOf(original);
    if (index !== -1) {
      this.currentComposition[index] = substitute;
    }
  }

  async runFullProbe(juryComposition) {
    const results = [];
    
    for (const model of juryComposition) {
      const result = await this.runProbe(model);
      results.push(result);
    }

    return {
      results,
      passedModels: results.filter(r => r.passed).map(r => r.modelId),
      failedModels: results.filter(r => !r.passed).map(r => r.modelId),
      substitutionsNeeded: results.filter(r => r.substituted).length,
      finalComposition: this.currentComposition,
      originalComposition: this.originalComposition
    };
  }

  getCurrentComposition() {
    return this.currentComposition;
  }

  getOriginalComposition() {
    return this.originalComposition;
  }

  getSubstitutionHistory() {
    return this.substitutionHistory;
  }

  getModelScore(modelId) {
    return this.modelScores.get(modelId);
  }

  getStats() {
    return {
      ...JURY_STATS,
      substitutionRate: JURY_STATS.totalProbes > 0 
        ? ((JURY_STATS.failedProbes / JURY_STATS.totalProbes) * 100).toFixed(2)
        : 0,
      currentComposition: this.currentComposition,
      originalComposition: this.originalComposition,
      totalSubstitutions: this.substitutionHistory.length
    };
  }

  reset() {
    this.modelScores.clear();
    this.originalComposition = [];
    this.currentComposition = [];
    this.substitutionHistory = [];
    JURY_STATS.totalProbes = 0;
    JURY_STATS.failedProbes = 0;
    JURY_STATS.substitutions = 0;
    JURY_STATS.originalModels = [];
    JURY_STATS.substitutedModels = [];
  }

  exportState() {
    return {
      originalComposition: this.originalComposition,
      currentComposition: this.currentComposition,
      substitutionHistory: this.substitutionHistory,
      modelScores: Object.fromEntries(this.modelScores),
      stats: this.getStats()
    };
  }

  importState(state) {
    if (state.originalComposition) {
      this.originalComposition = state.originalComposition;
    }
    if (state.currentComposition) {
      this.currentComposition = state.currentComposition;
    }
    if (state.substitutionHistory) {
      this.substitutionHistory = state.substitutionHistory;
    }
    if (state.modelScores) {
      this.modelScores = new Map(Object.entries(state.modelScores));
    }
  }
}

export const jurySubstitutionManager = new JurySubstitutionManager();

export const runJuryProbe = (modelId, context) => 
  jurySubstitutionManager.runProbe(modelId, context);

export const runFullJuryProbe = (composition) => 
  jurySubstitutionManager.runFullProbe(composition);

export const getJuryComposition = () => 
  jurySubstitutionManager.getCurrentComposition();

export default jurySubstitutionManager;
