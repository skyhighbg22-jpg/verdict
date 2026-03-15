/**
 * Full Model Client Integrations
 * Claude Opus 4.6, GPT-5.4 Pro, Gemini 3.1 Pro, Grok 4.2
 * with proper prompt engineering for each role
 */

import { MODEL_TYPES, MODEL_ROLES, TYPES } from '../types';

/**
 * Model configurations with role-specific prompts
 */
export const MODEL_CONFIGS = {
  [MODEL_TYPES.GPT_5_4_PRO]: {
    name: 'GPT-5.4 Pro',
    provider: 'OpenAI',
    supports: [
      MODEL_ROLES.TDS_ANALYSIS,
      MODEL_ROLES.GDE_DECOMPOSITION,
      MODEL_ROLES.MIRA_CALIBRATION,
      MODEL_ROLES.PLANNING_BRANCH,
      MODEL_ROLES.GENERAL_INFERENCE
    ],
    temperature: 0.3,
    maxTokens: 4000,
    contextWindow: 128000,
    rolePrompts: {
      [MODEL_ROLES.TDS_ANALYSIS]: {
        system: `You are a Task Difficulty Score (TDS) analysis expert. Your role is to:
- Analyze tasks for technical complexity, infrastructure impact, and security risk
- Provide accurate, unbiased difficulty scores (1-10) for each category
- Consider time constraints and resource availability
- Be objective and evidence-based in your assessments

Provide scores that reflect the true difficulty, not optimistic or pessimistic projections.`,
        user: `Analyze this task for difficulty and complexity. Provide scores (1-10) for each category.

Task: {task}
{context}

Categories to score:
1. technicalComplexity - Code complexity, architecture depth, integration points
2. infrastructureImpact - Changes needed to infrastructure, deployment complexity
3. securityRisk - Potential security vulnerabilities, data exposure risks
4. timeConstraint - Urgency and deadline pressure
5. resourceAvailability - Available expertise, tooling, budget

Provide your response as JSON with scores and brief reasoning.`
      },
      [MODEL_ROLES.GDE_DECOMPOSITION]: {
        system: `You are a Goal Decomposition Engine (GDE) expert. Your role is to:
- Break down complex goals into structured, dependent sub-tasks
- Create a DAG (Directed Acyclic Graph) of tasks with clear dependencies
- Identify critical path tasks
- Ensure tasks are atomic and achievable
- Consider parallel execution opportunities

Output structured task decompositions that can be executed systematically.`,
        user: `Decompose this goal into a structured plan of sub-tasks.

Goal: {goal}

Configuration:
- Max depth: {maxDepth}
- Min task size: {minTaskSize}

Provide your response as a JSON array of tasks with id, title, description, priority, and dependencies.`
      },
      [MODEL_ROLES.MIRA_CALIBRATION]: {
        system: `You are a MIRA Calibration assessment tool. Your role is to:
- Answer Hidden Control Questions (HCQs) honestly
- Provide accurate confidence levels (0.0 to 1.0) for each answer
- Use your actual knowledge, not search or external tools
- Be honest about uncertainty

Calibration is about matching confidence to actual accuracy.`,
        user: `Answer these Hidden Control Questions (HCQs) to assess calibration.

For each question, provide:
1. Your selected answer (one of the options)
2. Your confidence level (0.0 to 1.0)

Questions:
{questions}

Format your response as JSON array: [{"questionId": "hcq_X", "selectedAnswer": "...", "confidence": 0.XX}]`
      }
    }
  },

  [MODEL_TYPES.CLAUDE_OPUS_4_6]: {
    name: 'Claude Opus 4.6',
    provider: 'Anthropic',
    supports: [
      MODEL_ROLES.GENERAL_INFERENCE,
      MODEL_ROLES.PLANNING_BRANCH,
      MODEL_ROLES.GDE_DECOMPOSITION
    ],
    temperature: 0.4,
    maxTokens: 4000,
    contextWindow: 200000,
    rolePrompts: {
      [MODEL_ROLES.PLANNING_BRANCH]: {
        system: `You are Claude Opus 4.6, an AI assistant specializing in thoughtful analysis.
Your planning branch role involves:
- Providing deep, nuanced analysis of proposed plans
- Identifying strengths, weaknesses, and potential failure modes
- Considering long-term implications and trade-offs
- Suggesting improvements and alternatives

Provide thorough, well-reasoned analysis with specific, actionable recommendations.`,
        user: `As a planning branch analyst, analyze this task:

Task: {task}
Role: {role}
Context: {context}

Provide analysis covering:
- Your assessment and findings
- Key concerns or weaknesses
- Recommendations for improvement
- Your decision (approve/reject/hold) with reasoning

Format as JSON.`
      }
    }
  },

  [MODEL_TYPES.GEMINI_3_1_PRO]: {
    name: 'Gemini 3.1 Pro',
    provider: 'Google',
    supports: [
      MODEL_ROLES.GENERAL_INFERENCE,
      MODEL_ROLES.TDS_ANALYSIS,
      MODEL_ROLES.ADVISORY_QUERY
    ],
    temperature: 0.3,
    maxTokens: 4000,
    contextWindow: 1000000,
    rolePrompts: {
      [MODEL_ROLES.TDS_ANALYSIS]: {
        system: `You are Gemini 3.1 Pro, Google's advanced AI model.
As a TDS analyst, you provide:
- Comprehensive technical analysis
- Multi-faceted risk assessment
- Balanced scoring across all difficulty dimensions

Your analysis should be thorough and consider multiple perspectives.`,
        user: `Perform TDS analysis on this task:

Task: {task}
Context: {context}

Provide scores and reasoning in JSON format.`
      },
      [MODEL_ROLES.ADVISORY_QUERY]: {
        system: `You are Gemini 3.1 Pro with real-time capabilities.
As an advisory assistant, you provide:
- Current, accurate information
- Multiple source verification
- Clear, concise answers

Prioritize accuracy and freshness of information.`,
        user: `Answer this query with current information:

Query: {query}

Provide answer, confidence (0-1), and sources in JSON.`
      }
    }
  },

  [MODEL_TYPES.GROK_4_2]: {
    name: 'Grok 4.2',
    provider: 'xAI',
    supports: [
      MODEL_ROLES.SKEPTIC_VALIDATION,
      MODEL_ROLES.ADVISORY_QUERY,
      MODEL_ROLES.GENERAL_INFERENCE
    ],
    temperature: 0.5,
    maxTokens: 4000,
    contextWindow: 131072,
    rolePrompts: {
      [MODEL_ROLES.SKEPTIC_VALIDATION]: {
        system: `You are a Skeptic Agent (powered by Grok 4.2). Your role is to:
- Critically analyze claims and logical chains
- Attempt to disprove or weaken arguments through adversarial reasoning
- Identify logical fallacies, unstated assumptions, and weaknesses
- Search for disconfirming evidence
- Challenge conventional wisdom and surface-level analysis

Be rigorous, impartial, and focused on improving quality through adversarial testing.`,
        user: `Perform skeptical validation on this claim/plan:

Claim/Plan: {claim}
Context: {context}

Provide:
- Your overall assessment (positive/conditional/negative)
- Key concerns and weaknesses
- Disproof attempts if applicable
- Recommendations

Format as JSON.`
      },
      [MODEL_ROLES.ADVISORY_QUERY]: {
        system: `You are Grok 4.2 with real-time internet access capabilities.
As an advisory assistant, you provide:
- Live, up-to-date information when available
- Direct answers with sources
- Acknowledgment of uncertainty when appropriate

Prioritize accuracy over comprehensiveness.`,
        user: `Query live data for:

Query: {query}
Type: {queryType}

Provide answer with confidence and sources in JSON.`
      }
    }
  }
};

/**
 * Unified Model Client class
 */
class VERDICTModelClient {
  constructor() {
    this.defaultModel = MODEL_TYPES.GPT_5_4_PRO;
    this.fallbackChain = [
      MODEL_TYPES.GPT_5_4_PRO,
      MODEL_TYPES.CLAUDE_OPUS_4_6,
      MODEL_TYPES.GEMINI_3_1_PRO,
      MODEL_TYPES.GROK_4_2
    ];
  }

  /**
   * Get model config
   */
  getModelConfig(modelId) {
    return MODEL_CONFIGS[modelId] || MODEL_CONFIGS[this.defaultModel];
  }

  /**
   * Check if model supports a role
   */
  supportsRole(modelId, role) {
    const config = this.getModelConfig(modelId);
    return config.supports.includes(role);
  }

  /**
   * Get role-specific prompt
   */
  getRolePrompt(modelId, role, replacements = {}) {
    const config = this.getModelConfig(modelId);
    const prompts = config.rolePrompts[role];
    
    if (!prompts) {
      // Return generic prompts if role not found
      return {
        system: config.rolePrompts[MODEL_ROLES.GENERAL_INFERENCE]?.system || 
          `You are ${config.name}. Provide accurate, helpful responses.`,
        user: replacements.task || replacements.goal || replacements.query || 'Process this input.'
      };
    }

    // Replace template variables
    let system = prompts.system;
    let user = prompts.user;

    for (const [key, value] of Object.entries(replacements)) {
      const placeholder = `{${key}}`;
      system = system.replace(new RegExp(placeholder, 'g'), value);
      user = user.replace(new RegExp(placeholder, 'g'), value);
    }

    return { system, user };
  }

  /**
   * Run inference with role-specific prompts
   */
  async runInference(modelId, role, input, options = {}) {
    const config = this.getModelConfig(modelId);
    
    // Get role prompts
    const { system, user } = this.getRolePrompt(modelId, role, input);

    // Build request options
    const requestOptions = {
      modelId: modelId || this.defaultModel,
      input: {
        systemPrompt: system,
        userPrompt: user,
        temperature: options.temperature ?? config.temperature,
        maxTokens: options.maxTokens ?? config.maxTokens
      }
    };

    // Use bytezClient for actual API call
    const { bytezClient } = await import('../../api/bytezClient');
    
    try {
      return await bytezClient.runInference(modelId, requestOptions.input);
    } catch (error) {
      // Try fallback chain if primary fails
      if (options.useFallback !== false) {
        return this.runWithFallback(role, input, options);
      }
      throw error;
    }
  }

  /**
   * Run with fallback chain
   */
  async runWithFallback(role, input, options = {}) {
    const currentIndex = this.fallbackChain.indexOf(options.modelId || this.defaultModel);
    const fallbacks = this.fallbackChain.slice(currentIndex + 1);

    let lastError;
    for (const modelId of fallbacks) {
      if (this.supportsRole(modelId, role)) {
        try {
          return await this.runInference(modelId, role, input, { ...options, useFallback: false });
        } catch (error) {
          lastError = error;
          console.warn(`Fallback to ${modelId} failed:`, error.message);
        }
      }
    }

    throw lastError || new Error('All model fallbacks exhausted');
  }

  /**
   * Specialized methods for each role
   */

  async runTDSAnalysis(task, context = '') {
    return this.runInference(MODEL_TYPES.GPT_5_4_PRO, MODEL_ROLES.TDS_ANALYSIS, {
      task,
      context
    });
  }

  async runGDEDecomposition(goal, config = {}) {
    return this.runInference(MODEL_TYPES.GPT_5_4_PRO, MODEL_ROLES.GDE_DECOMPOSITION, {
      goal,
      maxDepth: config.maxDepth || 5,
      minTaskSize: config.minTaskSize || 'small'
    });
  }

  async runMiraCalibration(questions) {
    return this.runInference(MODEL_TYPES.GPT_5_4_PRO, MODEL_ROLES.MIRA_CALIBRATION, {
      questions
    });
  }

  async runSkepticalValidation(claim, context = {}) {
    return this.runInference(MODEL_TYPES.GROK_4_2, MODEL_ROLES.SKEPTIC_VALIDATION, {
      claim,
      context: JSON.stringify(context)
    });
  }

  async runAdvisoryQuery(query, queryType = 'live_fact') {
    return this.runInference(MODEL_TYPES.GROK_4_2, MODEL_ROLES.ADVISORY_QUERY, {
      query,
      queryType
    });
  }

  async runPlanningBranch(role, task, context = {}) {
    // Route to appropriate model based on role
    const modelMap = {
      'Systems Architect': MODEL_TYPES.GPT_5_4_PRO,
      'Security Auditor': MODEL_TYPES.CLAUDE_OPUS_4_6,
      'Product Designer': MODEL_TYPES.GEMINI_3_1_PRO,
      'Antithetical': MODEL_TYPES.GROK_4_2
    };

    const modelId = modelMap[role] || MODEL_TYPES.GPT_5_4_PRO;
    
    return this.runInference(modelId, MODEL_ROLES.PLANNING_BRANCH, {
      task,
      role,
      context: JSON.stringify(context)
    });
  }

  /**
   * Get available models for a role
   */
  getAvailableModelsForRole(role) {
    return Object.entries(MODEL_CONFIGS)
      .filter(([_, config]) => config.supports.includes(role))
      .map(([id, config]) => ({ id, name: config.name }));
  }

  /**
   * Get all supported models
   */
  getSupportedModels() {
    return Object.entries(MODEL_CONFIGS).map(([id, config]) => ({
      id,
      name: config.name,
      provider: config.provider,
      contextWindow: config.contextWindow,
      supports: config.supports
    }));
  }
}

// Singleton instance
export const modelClient = new VERDICTModelClient();

// Convenience exports
export const runTDSAnalysis = (task, context) => modelClient.runTDSAnalysis(task, context);
export const runGDEDecomposition = (goal, config) => modelClient.runGDEDecomposition(goal, config);
export const runMiraCalibration = (questions) => modelClient.runMiraCalibration(questions);
export const runSkepticalValidation = (claim, context) => modelClient.runSkepticalValidation(claim, context);
export const runAdvisoryQuery = (query, type) => modelClient.runAdvisoryQuery(query, type);
export const runPlanningBranch = (role, task, context) => modelClient.runPlanningBranch(role, task, context);

export default {
  modelClient,
  MODEL_CONFIGS,
  MODEL_TYPES,
  MODEL_ROLES,
  runTDSAnalysis,
  runGDEDecomposition,
  runMiraCalibration,
  runSkepticalValidation,
  runAdvisoryQuery,
  runPlanningBranch
};
