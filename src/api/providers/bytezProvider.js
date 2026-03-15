/**
 * Bytez Provider
 * Unified API provider (refactored from original bytezClient)
 */

import { getProviderKey, getModelMapping } from '../envValidator.js';

class BytezProvider {
  constructor() {
    this.name = 'Bytez';
    this.baseUrl = 'https://api.bytez.com/v1';
    
    // Model mappings (Bytez uses its own model IDs)
    this.modelMappings = {
      'gpt-5.4-pro': 'gpt-4o',
      'gemini-3.1-pro': 'gemini-1.5-pro',
      'grok-4.2': 'mixtral-8x7b-32768',
      'claude-opus-4.6': 'claude-3-opus'
    };
  }

  /**
   * Get API key
   */
  getApiKey() {
    return getProviderKey(this.name);
  }

  /**
   * Get actual model ID for Bytez
   */
  getModelId(internalModelId) {
    // Check for environment override first
    const envMapping = getModelMapping(internalModelId, 'Bytez');
    if (envMapping && envMapping !== internalModelId) {
      return envMapping;
    }
    
    // Fall back to default mapping
    return this.modelMappings[internalModelId] || internalModelId;
  }

  /**
   * Run inference
   * @param {string} modelId - Internal model ID
   * @param {Object} input - { systemPrompt, userPrompt, temperature }
   * @returns {Promise<Object>} Response with output field
   */
  async runInference(modelId, input) {
    const apiKey = this.getApiKey();
    
    if (!apiKey) {
      throw new Error(`${this.name} API key not configured`);
    }

    const actualModelId = this.getModelId(modelId);

    // Bytez API format (similar to OpenAI but with unified endpoint)
    const response = await fetch(`${this.baseUrl}/inference`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        modelId: actualModelId,
        input: {
          systemPrompt: input.systemPrompt,
          userPrompt: input.userPrompt,
          temperature: input.temperature ?? 0.7,
          maxTokens: input.maxTokens ?? 4000
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `${this.name} API error: ${response.status} ${response.statusText}`,
        { cause: errorData }
      );
    }

    const data = await response.json();

    return {
      output: data.output || '',
      model: actualModelId,
      provider: this.name,
      usage: data.usage
    };
  }

  /**
   * Check if provider is available
   */
  isAvailable() {
    return !!this.getApiKey();
  }

  /**
   * Get provider info
   */
  getInfo() {
    return {
      name: this.name,
      baseUrl: this.baseUrl,
      available: this.isAvailable(),
      supportedModels: Object.keys(this.modelMappings)
    };
  }
}

export default BytezProvider;
