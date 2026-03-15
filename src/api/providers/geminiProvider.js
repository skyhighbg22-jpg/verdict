/**
 * Gemini Provider
 * Google's Gemini API integration
 */

import { getProviderKey, getModelMapping } from '../envValidator.js';

class GeminiProvider {
  constructor() {
    this.name = 'Google (Gemini)';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    
    // Model mappings (actual Google models)
    this.modelMappings = {
      'gpt-5.4-pro': 'gemini-1.5-pro',
      'gemini-3.1-pro': 'gemini-1.5-pro',
      'claude-opus-4.6': 'gemini-1.5-pro',
      'grok-4.2': 'gemini-1.5-pro'
    };
  }

  /**
   * Get API key
   */
  getApiKey() {
    return getProviderKey(this.name);
  }

  /**
   * Get actual model ID for Gemini
   */
  getModelId(internalModelId) {
    // Check for environment override first
    const envMapping = getModelMapping(internalModelId, 'Google');
    if (envMapping && envMapping !== internalModelId) {
      return envMapping;
    }
    
    // Fall back to default mapping
    return this.modelMappings[internalModelId] || 'gemini-1.5-pro';
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

    // Gemini API uses a different format
    const response = await fetch(
      `${this.baseUrl}/models/${actualModelId}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: input.systemPrompt || '' },
                { text: input.userPrompt }
              ]
            }
          ],
          generationConfig: {
            temperature: input.temperature ?? 0.7,
            maxOutputTokens: input.maxTokens ?? 4000
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `${this.name} API error: ${response.status} ${response.statusText}`,
        { cause: errorData }
      );
    }

    const data = await response.json();

    // Extract content from Gemini response
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      output: content,
      model: actualModelId,
      provider: this.name,
      usage: data.usageMetadata
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

export default GeminiProvider;
