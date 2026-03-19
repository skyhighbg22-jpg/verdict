/**
 * Pre-Flight Check Service
 * Explicit validation checks before critical operations
 * Ensures system readiness and prevents downstream failures
 */

import { bytezClient } from '../../api/bytezClient';

export const PREFLIGHT_CONFIG = {
  enabled: true,
  strictMode: false,
  checks: {
    apiConnectivity: true,
    providerAvailability: true,
    stateIntegrity: true,
    memoryAvailability: true,
    modelReadiness: true
  },
  timeout: 10000
};

const PREFLIGHT_CHECKS = {
  API_CONNECTIVITY: 'api_connectivity',
  PROVIDER_AVAILABILITY: 'provider_availability',
  STATE_INTEGRITY: 'state_integrity',
  MEMORY_AVAILABILITY: 'memory_availability',
  MODEL_READINESS: 'model_readiness',
  ENVIRONMENT_VALIDATION: 'environment_validation',
  SESSION_VALIDITY: 'session_validity',
  DEPENDENCY_CHECK: 'dependency_check'
};

class PreFlightCheck {
  constructor() {
    this.lastCheck = null;
    this.checkHistory = [];
  }

  async runAllChecks(context = {}) {
    const results = {
      timestamp: new Date().toISOString(),
      overall: true,
      checks: {}
    };

    const checkFunctions = [
      this.checkApiConnectivity(context),
      this.checkProviderAvailability(context),
      this.checkStateIntegrity(context),
      this.checkMemoryAvailability(context),
      this.checkModelReadiness(context),
      this.checkEnvironmentValidation(context),
      this.checkSessionValidity(context),
      this.checkDependencies(context)
    ];

    const checkResults = await Promise.allSettled(checkFunctions);
    
    checkResults.forEach((result, index) => {
      const checkName = Object.keys(PREFLIGHT_CHECKS)[index];
      if (result.status === 'fulfilled') {
        results.checks[checkName] = result.value;
        if (!result.value.passed) {
          results.overall = false;
        }
      } else {
        results.checks[checkName] = {
          passed: false,
          error: result.reason?.message || 'Check failed',
          severity: 'high'
        };
        results.overall = false;
      }
    });

    this.lastCheck = results;
    this.checkHistory.push(results);
    
    if (this.checkHistory.length > 100) {
      this.checkHistory = this.checkHistory.slice(-100);
    }

    return results;
  }

  async checkApiConnectivity(context = {}) {
    try {
      const testResult = await Promise.race([
        bytezClient.runInference('gpt-5.4-pro', {
          systemPrompt: 'Respond with exactly: OK',
          userPrompt: 'Say OK',
          temperature: 0,
          maxTokens: 3
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ]);

      const passed = testResult?.output?.toUpperCase().includes('OK') || false;
      
      return {
        name: 'API Connectivity',
        passed,
        message: passed ? 'API responding correctly' : 'API response unexpected',
        latency: testResult?.latency || 0,
        severity: passed ? 'low' : 'critical'
      };
    } catch (error) {
      return {
        name: 'API Connectivity',
        passed: false,
        message: `API error: ${error.message}`,
        severity: 'critical'
      };
    }
  }

  async checkProviderAvailability(context = {}) {
    const providers = ['OpenAI', 'Groq', 'Gemini', 'OpenRouter', 'NVIDIA', 'Bytez'];
    const available = [];
    const unavailable = [];

    providers.forEach(provider => {
      if (this.isProviderAvailable(provider)) {
        available.push(provider);
      } else {
        unavailable.push(provider);
      }
    });

    const passed = available.length > 0;

    return {
      name: 'Provider Availability',
      passed,
      available: available.length,
      unavailable: unavailable.length,
      providers: available,
      message: passed 
        ? `${available.length} provider(s) available` 
        : `No providers available: ${unavailable.join(', ')}`,
      severity: passed ? 'low' : 'critical'
    };
  }

  isProviderAvailable(provider) {
    const envVars = {
      OpenAI: 'VITE_OPENAI_API_KEY',
      Groq: 'VITE_GROQ_API_KEY',
      Gemini: 'VITE_GEMINI_API_KEY',
      OpenRouter: 'VITE_OPENROUTER_API_KEY',
      NVIDIA: 'VITE_NVIDIA_API_KEY',
      Bytez: 'VITE_BYTEZ_API_KEY'
    };

    const apiKey = import.meta?.env?.[envVars[provider]] || localStorage?.getItem(envVars[provider]);
    return !!apiKey;
  }

  async checkStateIntegrity(context = {}) {
    try {
      const stateKey = 'verdict_state';
      let stateValid = true;
      let issues = [];

      try {
        const stored = localStorage.getItem(stateKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          
          if (!parsed.phase) {
            issues.push('Missing phase in state');
            stateValid = false;
          }
          
          if (!parsed.status) {
            issues.push('Missing status in state');
            stateValid = false;
          }
        } else {
          issues.push('No state found');
          stateValid = false;
        }
      } catch (e) {
        issues.push(`State parse error: ${e.message}`);
        stateValid = false;
      }

      return {
        name: 'State Integrity',
        passed: stateValid,
        message: stateValid 
          ? 'State integrity OK' 
          : `State issues: ${issues.join('; ')}`,
        issues,
        severity: stateValid ? 'low' : 'high'
      };
    } catch (error) {
      return {
        name: 'State Integrity',
        passed: false,
        message: `State check error: ${error.message}`,
        severity: 'high'
      };
    }
  }

  async checkMemoryAvailability(context = {}) {
    try {
      const perf = typeof performance !== 'undefined' ? performance : {};
      const memory = perf.memory || {};
      const memoryMB = (memory.usedJSHeapSize || 0) / 1048576;
      const totalMemoryMB = (memory.jsHeapSizeLimit || 0) / 1048576;
      const usagePercent = totalMemoryMB > 0 ? (memoryMB / totalMemoryMB) * 100 : 0;
      
      const threshold = 85;
      const passed = usagePercent < threshold;

      return {
        name: 'Memory Availability',
        passed,
        memoryUsedMB: memoryMB.toFixed(2),
        memoryTotalMB: totalMemoryMB.toFixed(2),
        usagePercent: usagePercent.toFixed(1),
        message: passed 
          ? `Memory OK (${usagePercent.toFixed(1)}% used)` 
          : `Memory high (${usagePercent.toFixed(1)}% used)`,
        severity: passed ? 'low' : 'high'
      };
    } catch (error) {
      return {
        name: 'Memory Availability',
        passed: true,
        message: 'Memory check not available in this environment',
        severity: 'low'
      };
    }
  }

  async checkModelReadiness(context = {}) {
    const requiredModels = ['gpt-5.4-pro', 'grok-4.2', 'gemini-3.1-pro'];
    const ready = [];
    const notReady = [];

    requiredModels.forEach(model => {
      if (this.isModelReady(model)) {
        ready.push(model);
      } else {
        notReady.push(model);
      }
    });

    const passed = ready.length > 0;

    return {
      name: 'Model Readiness',
      passed,
      readyModels: ready,
      notReadyModels: notReady,
      message: passed 
        ? `${ready.length}/${requiredModels.length} models ready` 
        : 'Critical: No models ready',
      severity: passed ? 'low' : 'critical'
    };
  }

  isModelReady(model) {
    const routing = {
      'gpt-5.4-pro': ['OpenRouter', 'OpenAI', 'NVIDIA'],
      'grok-4.2': ['Groq', 'OpenRouter'],
      'gemini-3.1-pro': ['Gemini', 'OpenRouter']
    };

    const providers = routing[model] || [];
    return providers.some(p => this.isProviderAvailable(p));
  }

  async checkEnvironmentValidation(context = {}) {
    const required = ['VITE_TESTING_MODE'];
    const optional = [
      'VITE_OPENAI_API_KEY',
      'VITE_GROQ_API_KEY',
      'VITE_GEMINI_API_KEY',
      'VITE_OPENROUTER_API_KEY',
      'VITE_NVIDIA_API_KEY'
    ];

    const env = import.meta?.env || {};
    let missing = [];
    let configured = [];

    optional.forEach(key => {
      if (env[key]) {
        configured.push(key.replace('VITE_', ''));
      }
    });

    const passed = configured.length > 0 || String(env.VITE_TESTING_MODE) === 'true';

    return {
      name: 'Environment Validation',
      passed,
      configured: configured,
      message: passed 
        ? `${configured.length} provider(s) configured` 
        : 'No providers configured',
      severity: passed ? 'low' : 'medium'
    };
  }

  async checkSessionValidity(context = {}) {
    const sessionKey = 'verdict_session';
    let valid = true;
    let message = 'Session valid';

    try {
      const session = localStorage.getItem(sessionKey);
      if (session) {
        const parsed = JSON.parse(session);
        
        const sessionAge = Date.now() - (parsed.createdAt || 0);
        const maxAge = 24 * 60 * 60 * 1000;
        
        if (sessionAge > maxAge) {
          valid = false;
          message = 'Session expired';
        }
      } else {
        valid = true;
        message = 'No session (new)';
      }
    } catch (error) {
      valid = false;
      message = `Session check error: ${error.message}`;
    }

    return {
      name: 'Session Validity',
      passed: valid,
      message,
      severity: valid ? 'low' : 'low'
    };
  }

  async checkDependencies(context = {}) {
    const criticalDeps = [
      { name: 'bytezClient', check: () => !!bytezClient },
      { name: 'localStorage', check: () => typeof localStorage !== 'undefined' },
      { name: 'fetch', check: () => typeof fetch !== 'undefined' }
    ];

    const results = criticalDeps.map(dep => ({
      name: dep.name,
      available: dep.check()
    }));

    const allAvailable = results.every(r => r.available);

    return {
      name: 'Dependency Check',
      passed: allAvailable,
      dependencies: results,
      message: allAvailable 
        ? 'All critical dependencies available' 
        : 'Some dependencies missing',
      severity: allAvailable ? 'low' : 'critical'
    };
  }

  async runCriticalChecks() {
    return this.runAllChecks({ critical: true });
  }

  async runQuickCheck() {
    const results = {
      timestamp: new Date().toISOString(),
      overall: true,
      checks: {}
    };

    const quickChecks = [
      this.checkMemoryAvailability(),
      this.checkStateIntegrity(),
      this.checkDependencies()
    ];

    const checkResults = await Promise.allSettled(quickChecks);
    
    checkResults.forEach((result, index) => {
      const checkName = ['MEMORY_AVAILABILITY', 'STATE_INTEGRITY', 'DEPENDENCY_CHECK'][index];
      if (result.status === 'fulfilled') {
        results.checks[checkName] = result.value;
        if (!result.value.passed) {
          results.overall = false;
        }
      }
    });

    return results;
  }

  getLastCheck() {
    return this.lastCheck;
  }

  getHistory() {
    return this.checkHistory;
  }

  clearHistory() {
    this.checkHistory = [];
  }
}

export const preFlightCheck = new PreFlightCheck();

export const {
  PREFLIGHT_CHECKS,
  PREFLIGHT_CONFIG,
  runAllChecks,
  runCriticalChecks,
  runQuickCheck,
  getLastCheck,
  getHistory,
  clearHistory
} = preFlightCheck;

export default preFlightCheck;
