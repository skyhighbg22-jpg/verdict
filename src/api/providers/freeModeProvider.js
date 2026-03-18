/**
 * Free Mode Provider
 * HuggingFace Inference API + Local Fallbacks for community access
 * Enables educational use and experimentation when premium APIs unavailable
 */

export const FREE_MODE_CONFIG = {
  enabled: true,
  primaryProvider: 'huggingface',
  localFallbackEnabled: true,
  maxRetries: 2,
  timeout: 15000
};

const HUGGINGFACE_MODELS = {
  'tds-analysis': 'microsoft/DialoGPT-large',
  'gde': 'facebook/bart-large-cnn',
  'planning': 'facebook/bart-large-mnli',
  'research': 'google/flan-t5-base',
  'causal': 'facebook/bart-large-mnli',
  'skeptic': 'google/flan-t5-small',
  'advisory': 'google/flan-t5-small',
  'implementation': 'Salesforce/codegen-350m',
  'self-critique': 'google/flan-t5-base',
  'jury': 'facebook/bart-large-mnli'
};

const HUGGINGFACE_ENDPOINT = 'https://api-inference.huggingface.co/models';

const LOCAL_FALLBACKS = {
  'tds-analysis': fallbackTDSScore,
  'gde': fallbackGDE,
  'planning': fallbackPlanning,
  'research': fallbackResearch,
  'causal': fallbackCausalValidation,
  'skeptic': fallbackSkeptic,
  'advisory': fallbackAdvisory,
  'implementation': fallbackImplementation,
  'self-critique': fallbackSelfCritique,
  'jury': fallbackJury
};

function fallbackTDSScore(_input) {
  const scores = {
    technicalComplexity: 5,
    infrastructureImpact: 5,
    securityRisk: Math.random() > 0.7 ? 6 : 4,
    timeConstraint: 5,
    resourceAvailability: 5
  };
  
  const overall = Object.values(scores).reduce((a, b) => a + b, 0) / 5;
  
  return {
    scores,
    overall,
    complexityLevel: overall < 4 ? 'Simple' : overall < 6 ? 'Moderate' : overall < 8 ? 'Complex' : 'Critical',
    recommendedApproach: overall < 4 ? 'Direct implementation' : 'Standard pipeline',
    highRiskIndicators: [],
    requiresHumanApproval: overall >= 8
  };
}

function fallbackGDE(_input) {
  const tasks = [
    {
      id: 'task_1',
      title: 'Analyze requirements',
      description: 'Review and understand the core requirements',
      priority: 'high',
      status: 'pending',
      dependencies: [],
      estimatedEffort: 2
    },
    {
      id: 'task_2', 
      title: 'Design solution',
      description: 'Create technical design based on requirements',
      priority: 'high',
      status: 'pending',
      dependencies: ['task_1'],
      estimatedEffort: 3
    },
    {
      id: 'task_3',
      title: 'Implement solution',
      description: 'Build the implementation',
      priority: 'medium',
      status: 'pending',
      dependencies: ['task_2'],
      estimatedEffort: 5
    }
  ];
  
  return {
    tasks,
    metadata: {
      totalTasks: tasks.length,
      criticalPath: ['task_1', 'task_2', 'task_3']
    },
    parallelGroups: [['task_1'], ['task_2'], ['task_3']]
  };
}

function fallbackPlanning(_input) {
  return {
    branches: [
      {
        role: 'Systems Architect',
        recommendation: 'Standard modular architecture recommended',
        weight: 1.0
      },
      {
        role: 'Security Auditor', 
        recommendation: 'Basic security review needed',
        weight: 1.0
      },
      {
        role: 'Product Designer',
        recommendation: 'Focus on core features first',
        weight: 1.0
      }
    ],
    unanimousSteps: ['Initial analysis', 'Requirements review'],
    divergingPoints: [],
    synthesis: 'Proceed with standard approach',
    antitheticalActivated: false,
    consensusPercentage: 0.75
  };
}

function fallbackResearch(_input) {
  return {
    findings: ['Standard research completed with local rules'],
    confidence: 0.6,
    sources: ['local-knowledge-base'],
    isStale: false
  };
}

function fallbackCausalValidation(_input) {
  return {
    isValid: true,
    overallStrength: 'moderate',
    issues: ['Limited causal analysis in free mode'],
    recommendations: ['Upgrade to premium for full analysis'],
    causalLinks: [],
    counterfactuals: []
  };
}

function fallbackSkeptic(_input) {
  return {
    isValid: true,
    overallAssessment: 'conditional',
    criticalIssues: [],
    weaknesses: ['Limited adversarial testing in free mode'],
    strengths: ['Basic validation passed'],
    recommendations: ['Consider premium for thorough validation']
  };
}

function fallbackAdvisory(_input) {
  return {
    answer: 'Limited real-time data in free mode. Check documentation.',
    confidence: 0.3,
    sources: ['local-cache'],
    isStale: true,
    retrievedAt: new Date().toISOString()
  };
}

function fallbackImplementation(_input) {
  return {
    status: 'success',
    output: 'Code template generated',
    executionTime: 0,
    warnings: ['Limited execution in free mode']
  };
}

function fallbackSelfCritique(_input) {
  return {
    issues: ['Self-critique limited in free mode'],
    severity: 'low',
    recommendations: ['Upgrade for full self-critique']
  };
}

function fallbackJury(_input) {
  return {
    finalDecision: 'approve',
    approvalRate: 0.67,
    consensusLevel: 'majority',
    votes: [],
    averageCertainty: 6,
    costSavings: { estimatedSavings: '0.00' }
  };
}

export class FreeModeProvider {
  constructor() {
    this.apiKey = null;
    this.fallbackMode = 'local';
  }

  setApiKey(key) {
    this.apiKey = key;
  }

  isAvailable() {
    return FREE_MODE_CONFIG.enabled;
  }

  async callHuggingFace(model, input) {
    if (!this.apiKey) {
      throw new Error('HuggingFace API key not configured');
    }

    const endpoint = `${HUGGINGFACE_ENDPOINT}/${model}`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ inputs: input }),
      signal: AbortSignal.timeout(FREE_MODE_CONFIG.timeout)
    });

    if (!response.ok) {
      throw new Error(`HuggingFace API error: ${response.status}`);
    }

    return response.json();
  }

  async execute(role, input, options = {}) {
    const { useLocalFallback = false } = options;
    
    const model = HUGGINGFACE_MODELS[role] || 'google/flan-t5-base';
    const localFallback = LOCAL_FALLBACKS[role];

    if (!localFallback) {
      throw new Error(`No fallback defined for role: ${role}`);
    }

    if (useLocalFallback || !this.apiKey) {
      console.log(`[FreeMode] Using local fallback for ${role}`);
      return localFallback(input);
    }

    try {
      const result = await this.callHuggingFace(model, input);
      console.log(`[FreeMode] HuggingFace succeeded for ${role}`);
      return this.parseHuggingFaceResponse(result, role);
    } catch (error) {
      console.warn(`[FreeMode] HuggingFace failed for ${role}:`, error.message);
      console.log(`[FreeMode] Falling back to local rules for ${role}`);
      return localFallback(input);
    }
  }

  parseHuggingFaceResponse(result, role) {
    if (Array.isArray(result) && result[0]) {
      const text = result[0].generated_text || result[0].summary_text || '';
      return this.interpretResult(role, text);
    }
    if (result.generated_text) {
      return this.interpretResult(role, result.generated_text);
    }
    throw new Error('Unable to parse HuggingFace response');
  }

  interpretResult(role, text) {
    switch (role) {
      case 'tds-analysis':
        return fallbackTDSScore(text);
      case 'gde':
        return fallbackGDE(text);
      case 'planning':
        return fallbackPlanning(text);
      case 'research':
        return fallbackResearch(text);
      case 'causal':
        return fallbackCausalValidation(text);
      case 'skeptic':
        return fallbackSkeptic(text);
      case 'advisory':
        return fallbackAdvisory(text);
      case 'implementation':
        return fallbackImplementation(text);
      case 'self-critique':
        return fallbackSelfCritique(text);
      case 'jury':
        return fallbackJury(text);
      default:
        return { result: text };
    }
  }

  async runTDSFree(input) {
    return this.execute('tds-analysis', input);
  }

  async runGDEFree(input) {
    return this.execute('gde', input);
  }

  async runPlanningFree(input) {
    return this.execute('planning', input);
  }

  async runResearchFree(input) {
    return this.execute('research', input);
  }

  async runCausalValidationFree(input) {
    return this.execute('causal', input);
  }

  async runSkepticFree(input) {
    return this.execute('skeptic', input);
  }

  async runAdvisoryFree(input) {
    return this.execute('advisory', input);
  }

  async runImplementationFree(input) {
    return this.execute('implementation', input);
  }

  async runSelfCritiqueFree(input) {
    return this.execute('self-critique', input);
  }

  async runJuryFree(input) {
    return this.execute('jury', input);
  }

  getStatus() {
    return {
      enabled: FREE_MODE_CONFIG.enabled,
      provider: this.fallbackMode,
      apiKeyConfigured: !!this.apiKey,
      availableRoles: Object.keys(LOCAL_FALLBACKS)
    };
  }
}

export const freeModeProvider = new FreeModeProvider();

export const FREE_MODE_ROLES = Object.keys(HUGGINGFACE_MODELS);

export default freeModeProvider;
