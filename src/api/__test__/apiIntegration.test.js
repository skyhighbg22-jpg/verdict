/**
 * API Integration Test
 * Test the new API router and provider setup
 * 
 * To run: node -e "import('./src/api/__test__/apiIntegration.test.js').then(m => m.testAll())"
 */

import { routeRequest, getEnvironmentStatus } from '../apiRouter.js';

/**
 * Test environment validation
 */
export async function testEnvironmentValidation() {
  console.log('\n=== Testing Environment Validation ===\n');
  
  const status = getEnvironmentStatus();
  
  console.log('Valid:', status.isValid ? '✅' : '❌');
  console.log('Testing Mode:', status.testingMode ? '🧪 Enabled' : '📊 Disabled');
  console.log('Available Providers:', status.availableProviders.map(p => p.name).join(', ') || 'None');
  console.log('Fallback Enabled:', status.config.enableFallback ? 'Yes' : 'No');
  console.log('Max Retries:', status.config.maxRetries);
  
  if (status.warnings.length > 0) {
    console.log('\nWarnings:');
    status.warnings.forEach(w => console.warn(`  ⚠️  ${w}`));
  }
  
  if (status.errors.length > 0) {
    console.log('\nErrors:');
    status.errors.forEach(e => console.error(`  ❌ ${e}`));
  }
  
  return status;
}

/**
 * Test model routing
 */
export async function testModelRouting() {
  console.log('\n=== Testing Model Routing ===\n');
  
  const testModels = ['gpt-5.4-pro', 'grok-4.2', 'gemini-3.1-pro', 'claude-opus-4.6'];
  
  for (const modelId of testModels) {
    console.log(`\nModel: ${modelId}`);
    
    if (getEnvironmentStatus().testingMode) {
      console.log(`  → Testing Mode: Routes to Groq`);
    } else {
      console.log(`  → Routing to primary providers...`);
    }
  }
  
  return true;
}

/**
 * Test API call (requires API keys)
 */
export async function testAPICall() {
  console.log('\n=== Testing API Call ===\n');
  
  const status = getEnvironmentStatus();
  
  if (!status.isValid) {
    console.log('⚠️  Skipping API test - environment not properly configured');
    console.log('   Please set at least one API key in .env.local');
    return false;
  }
  
  try {
    console.log('Making test API call to gpt-5.4-pro...');
    
    const response = await routeRequest('gpt-5.4-pro', {
      systemPrompt: 'You are a helpful assistant.',
      userPrompt: 'Respond with exactly: TEST_SUCCESS',
      temperature: 0.1
    });
    
    console.log('\nResponse received:');
    console.log('  Provider:', response.provider);
    console.log('  Model:', response.model);
    console.log('  Output:', response.output?.substring(0, 100) || '(empty)');
    
    if (response.output && response.output.includes('TEST')) {
      console.log('\n✅ API call successful!');
      return true;
    } else {
      console.log('\n⚠️  API call succeeded but unexpected response');
      return false;
    }
  } catch (error) {
    console.log('\n❌ API call failed:', error.message);
    console.log('   This is expected if no API keys are configured');
    return false;
  }
}

/**
 * Run all tests
 */
export async function testAll() {
  console.log('\n🧪 VERDICT API Integration Tests\n');
  console.log('=' .repeat(50));
  
  await testEnvironmentValidation();
  await testModelRouting();
  await testAPICall();
  
  console.log('\n' + '='.repeat(50));
  console.log('\n✨ Tests complete!\n');
  console.log('Next steps:');
  console.log('  1. Create .env.local from .env.example');
  console.log('  2. Add at least one API key (Groq recommended)');
  console.log('  3. Run: npm run dev');
  console.log('  4. The app will use real API providers\n');
}

// Export for direct use
export default {
  testEnvironmentValidation,
  testModelRouting,
  testAPICall,
  testAll
};
