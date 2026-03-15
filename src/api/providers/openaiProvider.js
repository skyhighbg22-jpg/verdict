/**
 * OpenAI Provider
 * Official OpenAI API integration
 */

import { getProviderKey, getModelMapping } from '../envValidator.js';

class OpenAIProvider {
  constructor() {
    this.name = 'OpenAI';
    this.baseUrl = 'https://api.openai.com/v1';
    
    // Model mappings (actual OpenAI models)
    this.modelMappings = {
      'gpt-5.4-pro': 'gpt-4o',
      'claude-opus-4.6': 'gpt-4o', // Fallback to GPT-4o
      'gemini-3.1-pro': 'gpt-4o', // Fallback to GPT-4o
      'grok-4.2': 'gpt-4o' // Fallback to GPT-4o
    };
  }

  /**
   * Get API key
   */
  getApiKey() {
    return getProviderKey(this.name);
  }

  /**
   * Get actual model ID for OpenAI
   */
  getModelId(internalModelId) {
    // Check for environment override first
    const envMapping = getModelMapping(internalModelId, 'OpenAI');
    if (envMapping && envMapping !== internalModelId) {
      return envMapping;
    }
    
    // Fall back to default mapping
    return this.modelMappings[internalModelId] || 'gpt-4o';
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

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: actualModelId,
        messages: [
          { role: 'system', content: input.systemPrompt || '' },
          { role: 'user', content: input.userPrompt }
        ],
        temperature: input.temperature ?? 0.7,
        max_tokens: input.maxTokens ?? 4000
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

    // Extract content from OpenAI response
    const content = data.choices?.[0]?.message?.content || '';

    return {
      output: content,
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

export default OpenAIProvider;
