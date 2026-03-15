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
    primary: ['OpenRouter'], // Use free models from OpenRouter for most tasks
    fallbacks: ['NVIDIA', 'Groq', 'OpenAI', 'Google (Gemini)', 'Bytez']
  },
  'grok-4.2': {
    primary: ['OpenRouter'], // Use free models from OpenRouter for most tasks
    fallbacks: ['NVIDIA', 'Groq', 'OpenAI', 'Google (Gemini)', 'Bytez']
  },
  'gemini-3.1-pro': {
    primary: ['OpenRouter'], // Use free models from OpenRouter for most tasks
    fallbacks: ['NVIDIA', 'Groq', 'OpenAI', 'Google (Gemini)', 'Bytez']
  },
  'claude-opus-4.6': {
    primary: ['OpenRouter'], // Use free models from OpenRouter for most tasks
    fallbacks: ['NVIDIA', 'Groq', 'OpenAI', 'Google (Gemini)', 'Bytez']
  },
  'step-flash': {
    primary: ['OpenRouter'], // Prefer free models from OpenRouter
    fallbacks: ['NVIDIA', 'Groq'] // Only use NVIDIA for bigger tasks if OpenRouter fails
  },
  'nemotron-3-super': {
    primary: ['OpenRouter'], // Prefer free models from OpenRouter
    fallbacks: ['NVIDIA', 'Groq'] // Only use NVIDIA for bigger tasks if OpenRouter fails
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

// If testing mode, use OpenRouter with specific free models
   if (envValidation.testingMode) {
     if (config.logProviderUsage) {
       console.log(`[APIRouter] 🧪 Testing Mode: Routing ${modelId} to OpenRouter (free models)`);
     }
     
     // Define model mappings for testing mode
     const TESTING_MODE_MAPPINGS = {
       // Use minimax for most tasks
       'default': 'minimax/minimax-m2.5:free',
       // Use deepseek for tasks where it excels (reasoning, coding, etc.)
       'gpt-5.4-pro': 'deepseek-ai/deepseek-v3.2',
       'claude-opus-4.6': 'deepseek-ai/deepseek-v3.2',
       // Avoid step flash models as requested
       'step-flash': 'minimax/minimax-m2.5:free',
       'nemotron-3-super': 'minimax/minimax-m2.5:free'
     };
     
     // Get the model to use for this internal model ID
     const modelToUse = TESTING_MODE_MAPPINGS[modelId] || TESTING_MODE_MAPPINGS['default'];
     
     try {
       // Temporarily override the openrouter provider's model mapping
       const originalGetModelId = openrouterProvider.getModelId;
       openrouterProvider.getModelId = () => modelToUse;
       
       const result = await attemptInference(openrouterProvider, modelId, input);
       
       // Restore original function
       openrouterProvider.getModelId = originalGetModelId;
       
       return result;
     } catch (error) {
       throw new Error(`Testing mode error: ${error.message}. Please check VITE_OPENROUTER_API_KEY.`);
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
