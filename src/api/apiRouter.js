/**
 * Unified API Router
 * Routes model requests to appropriate providers with fallback support
 */

import { validateEnvironment } from './envValidator.js';
import {
  openaiProvider,
  geminiProvider,
  groqProvider,
  bytezProvider,
  openrouterProvider,
  nvidiaProvider
} from './providers/index.js';

// Validate environment on load
const envValidation = validateEnvironment();
const config = envValidation.config;

/**
 * Model routing configuration
 * Maps internal model IDs to primary providers and fallback chain
 */
const MODEL_ROUTING = {
  'gpt-5.4-pro': {
    primary: ['OpenAI', 'Google (Gemini)'], // Try OpenAI first, then Gemini
    fallbacks: ['Bytez', 'Groq', 'OpenRouter', 'NVIDIA']
  },
  'grok-4.2': {
    primary: ['Groq'], // Groq is best for adversarial validation
    fallbacks: ['OpenRouter', 'Bytez', 'OpenAI', 'NVIDIA']
  },
  'gemini-3.1-pro': {
    primary: ['Google (Gemini)'],
    fallbacks: ['OpenAI', 'Bytez', 'OpenRouter', 'NVIDIA']
  },
  'claude-opus-4.6': {
    primary: ['OpenRouter'], // OpenRouter has Claude
    fallbacks: ['Bytez', 'OpenAI', 'Groq', 'NVIDIA']
  },
  'step-flash': {
    primary: ['NVIDIA'], // NVIDIA has step flash
    fallbacks: ['OpenRouter', 'Groq']
  },
  'nemotron-3-super': {
    primary: ['NVIDIA'], // NVIDIA has nemotron 3 super
    fallbacks: ['OpenRouter', 'Groq']
  }
};

/**
 * Default routing for unknown models
 */
const DEFAULT_ROUTING = {
  primary: ['Groq', 'OpenAI'],
  fallbacks: ['Bytez', 'OpenRouter']
};

/**
 * Retry with exponential backoff
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Attempt inference with a specific provider
 * @param {Object} provider - Provider instance
 * @param {string} modelId - Internal model ID
 * @param {Object} input - Input parameters
 * @param {number} attempt - Current attempt number
 * @returns {Promise<Object>} Response
 */
async function attemptInference(provider, modelId, input, attempt = 1) {
  try {
    const response = await provider.runInference(modelId, input);
    
    if (config.logProviderUsage) {
      console.log(`[APIRouter] ✅ ${provider.name} handled ${modelId} (attempt ${attempt})`);
    }
    
    return response;
  } catch (error) {
    if (config.logLevel === 'debug') {
      console.debug(`[APIRouter] ${provider.name} failed (attempt ${attempt}):`, error.message);
    }
    
    // Check if error is recoverable (rate limit, timeout, server error)
    const isRecoverable = 
      error.message?.includes('429') || // Rate limit
      error.message?.includes('timeout') ||
      error.message?.includes('ECONNRESET') ||
      error.message?.includes('500') ||
      error.message?.includes('502') ||
      error.message?.includes('503');
    
    if (isRecoverable && attempt < config.maxRetries) {
      const backoffTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10s backoff
      if (config.logLevel === 'debug') {
        console.debug(`[APIRouter] Retrying ${provider.name} in ${backoffTime}ms...`);
      }
      await sleep(backoffTime);
      return attemptInference(provider, modelId, input, attempt + 1);
    }
    
    throw error;
  }
}

/**
 * Route request to appropriate provider
 * @param {string} modelId - Internal model ID (e.g., gpt-5.4-pro)
 * @param {Object} input - { systemPrompt, userPrompt, temperature, maxTokens }
 * @returns {Promise<Object>} API response
 */
export async function routeRequest(modelId, input) {
  const routing = MODEL_ROUTING[modelId] || DEFAULT_ROUTING;
  const allProviders = [...routing.primary, ...routing.fallbacks];
  let lastError = null;

  // If testing mode, only use Groq
  if (envValidation.testingMode) {
    if (config.logProviderUsage) {
      console.log(`[APIRouter] 🧪 Testing Mode: Routing ${modelId} to Groq`);
    }
    
    try {
      return await attemptInference(groqProvider, modelId, input);
    } catch (error) {
      throw new Error(`Testing mode error: ${error.message}. Please check VITE_GROQ_API_KEY.`);
    }
  }

  // Try each provider in order
  for (const providerName of allProviders) {
    const provider = { 
      OpenAI: openaiProvider,
      'Google (Gemini)': geminiProvider,
      Groq: groqProvider,
      Bytez: bytezProvider,
      OpenRouter: openrouterProvider,
      NVIDIA: nvidiaProvider
    }[providerName];

    if (!provider) {
      if (config.logLevel === 'debug') {
        console.debug(`[APIRouter] Provider ${providerName} not found`);
      }
      continue;
    }

    if (!provider.isAvailable()) {
      if (config.logLevel === 'debug') {
        console.debug(`[APIRouter] Provider ${providerName} not available (no API key)`);
      }
      continue;
    }

    try {
      return await attemptInference(provider, modelId, input);
    } catch (error) {
      lastError = error;
      if (config.logProviderUsage || config.logLevel === 'debug') {
        console.warn(`[APIRouter] ❌ ${providerName} failed: ${error.message}`);
      }
      
      // If fallback is disabled, stop after first failure
      if (!config.enableFallback) {
        break;
      }
      
      // Continue to next provider
      continue;
    }
  }

  // All providers failed
  throw new Error(
    `All providers failed for model ${modelId}. Last error: ${lastError?.message || 'Unknown error'}`,
    { cause: lastError }
  );
}

/**
 * Get routing info for a model
 * @param {string} modelId - Internal model ID
 * @returns {Object} Routing configuration
 */
export function getModelRouting(modelId) {
  return MODEL_ROUTING[modelId] || DEFAULT_ROUTING;
}

/**
 * Check environment validation status
 * @returns {Object} Environment validation result
 */
export function getEnvironmentStatus() {
  return envValidation;
}

/**
 * Force re-validation of environment
 * @returns {Object} Updated validation result
 */
export function revalidateEnvironment() {
  return validateEnvironment();
}

// Export configuration
export { config as routerConfig };

export default {
  routeRequest,
  getModelRouting,
  getEnvironmentStatus,
  revalidateEnvironment,
  routerConfig
};
