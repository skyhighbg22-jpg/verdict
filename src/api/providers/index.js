/**
 * Provider Exports
 * Central export for all API providers
 */

import OpenAIProvider from './openaiProvider.js';
import GeminiProvider from './geminiProvider.js';
import GroqProvider from './groqProvider.js';
import BytezProvider from './bytezProvider.js';
import OpenRouterProvider from './openrouterProvider.js';
import NVIDIAProvider from './nvidiaProvider.js';
import { FreeModeProvider, freeModeProvider } from './freeModeProvider.js';

export {
  OpenAIProvider,
  GeminiProvider,
  GroqProvider,
  BytezProvider,
  OpenRouterProvider,
  FreeModeProvider
};

// Provider instances (singletons)
export const openaiProvider = new OpenAIProvider();
export const geminiProvider = new GeminiProvider();
export const groqProvider = new GroqProvider();
export const bytezProvider = new BytezProvider();
export const openrouterProvider = new OpenRouterProvider();
export const nvidiaProvider = new NVIDIAProvider();
export { freeModeProvider };

// Provider registry
export const providers = {
  openai: openaiProvider,
  gemini: geminiProvider,
  groq: groqProvider,
  bytez: bytezProvider,
  openrouter: openrouterProvider,
  freemode: freeModeProvider
};

// Get provider by name
export const getProvider = (name) => {
  const providerMap = {
    'OpenAI': openaiProvider,
    'Google (Gemini)': geminiProvider,
    'Groq': groqProvider,
    'Bytez': bytezProvider,
    'OpenRouter': openrouterProvider,
    'NVIDIA': nvidiaProvider,
    'FreeMode': freeModeProvider
  };

  return providerMap[name] || null;
};

export default {
  OpenAIProvider,
  GeminiProvider,
  GroqProvider,
  BytezProvider,
  OpenRouterProvider,
  openaiProvider,
  geminiProvider,
  groqProvider,
  bytezProvider,
  openrouterProvider,
  providers,
  getProvider
};
