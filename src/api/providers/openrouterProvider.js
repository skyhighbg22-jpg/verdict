/**
 * OpenRouter Provider
 * Multi-provider fallback with access to many models
 */

import { getProviderKey, getModelMapping } from '../envValidator.js';

class OpenRouterProvider {
  constructor() {
    this.name = 'OpenRouter';
    this.baseUrl = 'https://openrouter.ai/api/v1';
    
     // Model mappings (OpenRouter uses provider/model format)
     this.modelMappings = {
       'gpt-5.4-pro': 'openai/gpt-4o',
       'gemini-3.1-pro': 'google/gemini-pro-1.5',
       'grok-4.2': 'x-ai/grok-beta',
       'claude-opus-4.6': 'anthropic/claude-3-opus',
       'step-flash': 'step-ai/step-flash',
       'nemotron-3-super': 'nvidia/nemotron-3-super'
     };
  }

  /**
   * Get API key
   */
  getApiKey() {
    return getProviderKey(this.name);
  }

  /**
   * Get actual model ID for OpenRouter
   */
  getModelId(internalModelId) {
    // Check for environment override first
    const envMapping = getModelMapping(internalModelId, 'OpenRouter');
    if (envMapping && envMapping !== internalModelId) {
      return envMapping;
    }
    
    // Fall back to default mapping
    return this.modelMappings[internalModelId] || 'openai/gpt-4o';
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
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.href : 'http://localhost',
        'X-Title': 'VERDICT UI'
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

    // Extract content from OpenRouter response
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

export default OpenRouterProvider;
