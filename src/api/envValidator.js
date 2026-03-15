/**
 * Environment Validator
 * Validates required environment variables at startup
 */

const REQUIRED_VARS = {
  // At least one provider key is required
  PROVIDER_KEYS: ['VITE_OPENAI_API_KEY', 'VITE_GEMINI_API_KEY', 'VITE_GROQ_API_KEY', 'VITE_BYTEZ_API_KEY', 'VITE_OPENROUTER_API_KEY', 'VITE_NVIDIA_API_KEY'],
  
  // Configuration flags (optional, have defaults)
  OPTIONAL_VARS: [
    'VITE_TESTING_MODE',
    'VITE_ENABLE_FALLBACK',
    'VITE_MAX_RETRIES',
    'VITE_REQUEST_TIMEOUT',
    'VITE_LOG_LEVEL',
    'VITE_LOG_PROVIDER_USAGE'
  ]
};

/**
 * Validate environment variables
 * @returns {Object} Validation result with available providers and warnings
 */
export const validateEnvironment = () => {
  const result = {
    isValid: true,
    warnings: [],
    errors: [],
    availableProviders: [],
    testingMode: false,
    config: {}
  };

  // Check for testing mode
  const testingMode = import.meta.env.VITE_TESTING_MODE === 'true';
  result.testingMode = testingMode;

  // Validate provider keys
  const availableProviders = [];
    const providerMap = {
      VITE_OPENAI_API_KEY: 'OpenAI',
      VITE_GEMINI_API_KEY: 'Google (Gemini)',
      VITE_GROQ_API_KEY: 'Groq',
      VITE_BYTEZ_API_KEY: 'Bytez',
      VITE_OPENROUTER_API_KEY: 'OpenRouter',
      VITE_NVIDIA_API_KEY: 'NVIDIA'
    };

  for (const [envVar, providerName] of Object.entries(providerMap)) {
    const key = import.meta.env[envVar];
    if (key && key !== 'your_' + providerName.toLowerCase().replace(/\s/g, '_') + '_api_key_here' && key !== '') {
      availableProviders.push({
        name: providerName,
        envVar,
        hasKey: true
      });
    }
  }

  result.availableProviders = availableProviders;

  // If testing mode, only Groq is required
  if (testingMode) {
    const hasGroq = availableProviders.some(p => p.name === 'Groq');
    if (!hasGroq) {
      result.isValid = false;
      result.errors.push('Testing mode requires VITE_GROQ_API_KEY to be set');
    } else {
      result.warnings.push('Testing mode is enabled: All requests will route through Groq');
    }
  } else {
    // Normal mode: at least one provider required
    if (availableProviders.length === 0) {
      result.isValid = false;
      result.errors.push(
        'No API keys found. Please set at least one provider key:',
        ...Object.entries(providerMap).map(([key, name]) => `  - ${key} (for ${name})`)
      );
    } else {
      result.warnings.push(`Available providers: ${availableProviders.map(p => p.name).join(', ')}`);
    }
  }

  // Validate configuration flags
  const config = {
    testingMode,
    enableFallback: import.meta.env.VITE_ENABLE_FALLBACK !== 'false',
    maxRetries: parseInt(import.meta.env.VITE_MAX_RETRIES, 10) || 3,
    requestTimeout: parseInt(import.meta.env.VITE_REQUEST_TIMEOUT, 10) || 30000,
    logLevel: import.meta.env.VITE_LOG_LEVEL || 'info',
    logProviderUsage: import.meta.env.VITE_LOG_PROVIDER_USAGE !== 'false'
  };

  // Validate config values
  if (isNaN(config.maxRetries) || config.maxRetries < 0) {
    result.warnings.push('Invalid VITE_MAX_RETRIES, using default: 3');
    config.maxRetries = 3;
  }

  if (isNaN(config.requestTimeout) || config.requestTimeout < 1000) {
    result.warnings.push('Invalid VITE_REQUEST_TIMEOUT, using default: 30000ms');
    config.requestTimeout = 30000;
  }

  const validLogLevels = ['debug', 'info', 'warn', 'error'];
  if (!validLogLevels.includes(config.logLevel)) {
    result.warnings.push(`Invalid VITE_LOG_LEVEL, using default: info`);
    config.logLevel = 'info';
  }

  result.config = config;

  // Log validation results
  if (config.logLevel !== 'error') {
    console.log('=== Environment Validation ===');
    console.log(`Valid: ${result.isValid ? '✓' : '✗'}`);
    console.log(`Testing Mode: ${testingMode ? 'ENABLED' : 'disabled'}`);
    console.log(`Available Providers: ${availableProviders.map(p => p.name).join(', ') || 'None'}`);
    console.log(`Fallback Enabled: ${config.enableFallback ? 'Yes' : 'No'}`);
    console.log(`Max Retries: ${config.maxRetries}`);
    console.log(`Request Timeout: ${config.requestTimeout}ms`);
    console.log('==============================\n');

    if (result.warnings.length > 0) {
      console.warn('Warnings:');
      result.warnings.forEach(w => console.warn(`  ⚠ ${w}`));
    }

    if (result.errors.length > 0) {
      console.error('Errors:');
      result.errors.forEach(e => console.error(`  ✗ ${e}`));
    }
  }

  return result;
};

/**
 * Get provider API key
 * @param {string} providerName - Provider name (OpenAI, Groq, etc.)
 * @returns {string|null} API key or null if not found
 */
export const getProviderKey = (providerName) => {
  const providerMap = {
    'OpenAI': 'VITE_OPENAI_API_KEY',
    'Google (Gemini)': 'VITE_GEMINI_API_KEY',
    'Groq': 'VITE_GROQ_API_KEY',
    'Bytez': 'VITE_BYTEZ_API_KEY',
    'OpenRouter': 'VITE_OPENROUTER_API_KEY',
    'NVIDIA': 'VITE_NVIDIA_API_KEY'
  };

  const envVar = providerMap[providerName];
  if (!envVar) return null;

  const key = import.meta.env[envVar];
  if (!key || key.includes('your_') || key === '') return null;

  return key;
};

/**
 * Get model mapping for a specific provider
 * @param {string} internalModelId - Internal model ID (e.g., gpt-5.4-pro)
 * @param {string} provider - Provider name
 * @returns {string} Actual model ID for the provider
 */
export const getModelMapping = (internalModelId, provider) => {
  // Remove special characters from model ID for env var name
  const envVarName = internalModelId
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_');

  const envVar = `VITE_${envVarName}_${provider.toUpperCase()}`;
  return import.meta.env[envVar] || internalModelId;
};

export default {
  validateEnvironment,
  getProviderKey,
  getModelMapping
};
