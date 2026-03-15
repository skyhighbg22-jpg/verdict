/**
 * NVIDIA Provider
 * Access to NVIDIA models including step flash and nemotron 3 super
 */

import { getProviderKey, getModelMapping } from '../envValidator.js';

class NVIDIAProvider {
  constructor() {
    this.name = 'NVIDIA';
    this.baseUrl = 'https://integrate.api.nvidia.com/v1';
    
    // Model mappings (NVIDIA models)
    this.modelMappings = {
      'gpt-5.4-pro': 'nemotron-3-super',
      'grok-4.2': 'step-flash',
      'gemini-3.1-pro': 'nemotron-3-super',
      'claude-opus-4.6': 'nemotron-3-super'
    };
  }

  /**
   * Get API key
   */
  getApiKey() {
    return getProviderKey(this.name);
  }

  /**
   * Get actual model ID for NVIDIA
   */
  getModelId(internalModelId) {
    // Check for environment override first
    const envMapping = getModelMapping(internalModelId, 'NVIDIA');
    if (envMapping && envMapping !== internalModelId) {
      return envMapping;
    }
    
    // Fall back to default mapping
    return this.modelMappings[internalModelId] || 'nemotron-3-super';
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
        max_tokens: input.maxTokens ?? 4000,
        stream: false
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

    // Extract content from NVIDIA response
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

export default NVIDIAProvider;