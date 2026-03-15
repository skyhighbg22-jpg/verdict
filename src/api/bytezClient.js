/**
 * Bytez API Client
 * 
 * Refactored to use the new unified API router with multi-provider support.
 * 
 * Backward compatibility maintained - existing code continues to work without changes.
 * 
 * Supported Models:
 * - gpt-5.4-pro: Used for TDS analysis, GDE decomposition, and general inference
 * - grok-4.2: Used for Skeptic Agent validation and adversarial reasoning
 * - gemini-3.1-pro: Used for advisory queries and alternative analysis
 * - claude-opus-4.6: Used for specialized planning and nuance analysis
 * 
 * Provider Routing:
 * - Testing Mode (VITE_TESTING_MODE=true): All requests route to Groq
 * - Normal Mode: Requests route to optimal providers with fallback chain
 */

import { PIPELINE_STATUS } from '../services/pipelineEngine';
import { routeRequest, getEnvironmentStatus } from './apiRouter.js';

class BytezClient {
  constructor(apiKey = null) {
    this.apiKey = apiKey; // Kept for backward compatibility, now uses env vars
    this.baseUrl = 'https://api.bytez.com/v1'; // Kept for backward compatibility
    
    // Model version metadata (now informational only)
    this.modelVersions = {
      'gpt-5.4-pro': { status: 'available', supports: ['tds', 'gde', 'inference', 'calibration'] },
      'grok-4.2': { status: 'available', supports: ['skeptical', 'adversarial', 'causal'] },
      'gemini-3.1-pro': { status: 'available', supports: ['advisory', 'general'] },
      'claude-opus-4.6': { status: 'available', supports: ['planning', 'nuance'] }
    };
  }

  setApiKey(key) {
    // Kept for backward compatibility, but now API keys come from env vars
    this.apiKey = key;
    console.warn('[Bytez] setApiKey() called. Note: API keys should be set via environment variables.');
  }

  /**
   * Get environment status
   * @returns {Object} Environment validation and provider availability
   */
  getEnvironmentStatus() {
    return getEnvironmentStatus();
  }

  /**
   * Run inference with specified model (now routes to actual API providers)
   * @param {string} modelId - Model identifier (gpt-5.4-pro, grok-4.2, etc.)
   * @param {Object} input - { systemPrompt, userPrompt, temperature, maxTokens }
   * @returns {Promise<Object>} API response with output field
   */
  async runInference(modelId, input) {
    // Validate model availability (informational only)
    if (this.modelVersions[modelId]) {
      console.log(`[Bytez] Routing model: ${modelId} (${this.modelVersions[modelId].status})`);
    } else {
      console.warn(`[Bytez] Unknown model: ${modelId}, routing with default`);
    }

    // Route to actual API provider via apiRouter
    return routeRequest(modelId, input);
  }

  // Legacy request method kept for potential Airtable/Pinecone integrations
  async request(endpoint, options = {}) {
    if (!this.apiKey) {
      console.warn('[Bytez] Legacy request() called without API key. Consider using runInference() instead.');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      ...options.headers,
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        throw new Error(`Bytez API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[Bytez] Legacy API request failed:', error);
      throw error;
    }
  }

  /**
   * Run inference specifically for TDS analysis (GPT-5.4 Pro)
   */
  async runTDSInference(prompt, context = '') {
    return this.runInference('gpt-5.4-pro', {
      systemPrompt: 'You are a task difficulty analysis expert. Provide accurate, unbiased difficulty scores.',
      userPrompt: prompt,
      temperature: 0.2
    });
  }

  /**
   * Run inference for Skeptic Agent (Grok 4.2)
   */
  async runSkepticInference(validationType, data) {
    let systemPrompt, userPrompt;

    switch (validationType) {
      case 'causal_chain':
        systemPrompt = 'You are a Skeptic Agent (Grok 4.2). Analyze causal chains for logical validity.';
        userPrompt = `Analyze this causal chain: ${JSON.stringify(data)}`;
        break;
      case 'argument':
        systemPrompt = 'You are a Skeptic Agent (Grok 4.2). Detect logical fallacies in arguments.';
        userPrompt = `Detect fallacies in this argument: ${data.argument}`;
        break;
      case 'full_review':
        systemPrompt = 'You are a Skeptic Agent (Grok 4.2). Perform comprehensive skeptical review.';
        userPrompt = `Review this plan: ${JSON.stringify(data)}`;
        break;
      default:
        systemPrompt = 'You are Grok 4.2, a skeptical analysis assistant.';
        userPrompt = `Analyze: ${JSON.stringify(data)}`;
    }

    return this.runInference('grok-4.2', {
      systemPrompt,
      userPrompt,
      temperature: 0.5
    });
  }

  /**
   * Run inference for GDE (GPT-5.4 Pro)
   */
  async runGDEDecomposition(goal, config) {
    return this.runInference('gpt-5.4-pro', {
      systemPrompt: 'You are a task decomposition expert. Break down complex goals into structured, dependent tasks.',
      userPrompt: `Decompose this goal: ${goal}`,
      temperature: 0.4
    });
  }

  /**
   * Run inference for MIRA calibration (GPT-5.4 Pro)
   */
  async runMiraCalibration(hcqs) {
    return this.runInference('gpt-5.4-pro', {
      systemPrompt: 'You are a calibration assessment tool. Answer honestly and provide accurate confidence levels.',
      userPrompt: `Answer these calibration questions: ${JSON.stringify(hcqs)}`,
      temperature: 0.3
    });
  }

  async getStatus(jobId) {
    return this.request(`/jobs/${jobId}`, {
      method: 'GET',
    });
  }

  // Defer Airtable integration
  async syncToAirtable(data) {
    console.log('Airtable sync deferred:', data);
    return { status: PIPELINE_STATUS.IDLE, message: 'Airtable integration scheduled for tomorrow' };
  }

  // Defer Pinecone integration
  async queryVectorDb(query) {
    console.log('Pinecone query deferred:', query);
    return { status: PIPELINE_STATUS.IDLE, results: [], message: 'Pinecone integration scheduled for tomorrow' };
  }

  // Defer Dify integration
  async triggerDifyWorkflow(workflowId, inputs) {
    console.log('Dify workflow deferred:', workflowId, inputs);
    return { status: PIPELINE_STATUS.IDLE, jobId: null, message: 'Dify integration scheduled for tomorrow' };
  }

  // Check model availability
  isModelAvailable(modelId) {
    return this.modelVersions[modelId]?.status === 'available';
  }

  // Get supported capabilities for a model
  getModelCapabilities(modelId) {
    return this.modelVersions[modelId]?.supports || [];
  }
}

export const bytezClient = new BytezClient();
