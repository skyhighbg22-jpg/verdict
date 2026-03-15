# Quick Reference: API Provider System

## Common Tasks

### Start Development Server

```bash
npm run dev
```

### Set Up Environment

```bash
# Copy template
cp .env.example .env.local

# Add API key (minimum for testing mode)
echo "VITE_TESTING_MODE=true" >> .env.local
echo "VITE_GROQ_API_KEY=your_key_here" >> .env.local
```

### Enable Testing Mode

```bash
# In .env.local
VITE_TESTING_MODE=true
VITE_GROQ_API_KEY=gsk_your_key_here
```

### Enable Production Mode

```bash
# In .env.local
VITE_TESTING_MODE=false
VITE_OPENAI_API_KEY=sk_your_key_here
VITE_GROQ_API_KEY=gsk_your_key_here
```

## Environment Variables (Quick Reference)

| Variable | Default | Purpose |
|-----------|----------|---------|
| `VITE_TESTING_MODE` | `false` | Route all to Groq if true |
| `VITE_OPENAI_API_KEY` | - | OpenAI GPT-4o access |
| `VITE_GEMINI_API_KEY` | - | Google Gemini access |
| `VITE_GROQ_API_KEY` | - | Groq fast inference (required for testing mode) |
| `VITE_BYTEZ_API_KEY` | - | Bytez unified provider |
| `VITE_OPENROUTER_API_KEY` | - | OpenRouter multi-model access |
| `VITE_ENABLE_FALLBACK` | `true` | Enable provider fallback on errors |
| `VITE_MAX_RETRIES` | `3` | Retry attempts per provider |
| `VITE_REQUEST_TIMEOUT` | `30000` | Request timeout in ms |
| `VITE_LOG_LEVEL` | `info` | Log verbosity (debug\|info\|warn\|error) |
| `VITE_LOG_PROVIDER_USAGE` | `true` | Log provider for each request |

## Model IDs

| Model ID | Used By | Primary Provider |
|-----------|----------|-----------------|
| `gpt-5.4-pro` | TDS, GDE, MIRA, Planning | OpenAI |
| `grok-4.2` | Skeptic Agent, Advisory | Groq |
| `gemini-3.1-pro` | Advisory, Alternative analysis | Gemini |
| `claude-opus-4.6` | Planning, Nuance analysis | OpenRouter |

## Common Issues

### "No API keys found"
**Solution:** Add at least one key to `.env.local`

### "All providers failed"
**Solution:** Check API keys are valid, enable testing mode

### API rate limits
**Solution:** Fallback chain handles automatically, or add more provider keys

## Getting API Keys

### Groq (Fast & Free)
1. https://console.groq.com/keys
2. Create account (free)
3. Generate key
4. Add to `.env.local`

### OpenAI (GPT-4o)
1. https://platform.openai.com/api-keys
2. Sign in
3. Create key
4. Add credits
5. Add to `.env.local`

### Google Gemini
1. https://aistudio.google.com/app/apikey
2. Create project
3. Generate key
4. Add to `.env.local`

## Code Examples

### Using bytezClient (Existing Code - No Changes Needed)

```javascript
import { bytezClient } from '../api/bytezClient';

// Works exactly as before
const response = await bytezClient.runInference('gpt-5.4-pro', {
  systemPrompt: 'You are an expert.',
  userPrompt: 'Analyze this task.',
  temperature: 0.3
});

console.log(response.output); // Response text
console.log(response.provider); // e.g., "OpenAI"
console.log(response.model); // e.g., "gpt-4o"
```

### Getting Environment Status

```javascript
import { bytezClient } from '../api/bytezClient';

const status = bytezClient.getEnvironmentStatus();
console.log('Available providers:', status.availableProviders);
console.log('Testing mode:', status.config.testingMode);
```

### Using API Router Directly

```javascript
import { routeRequest } from '../api/apiRouter';

const response = await routeRequest('gpt-5.4-pro', {
  systemPrompt: 'You are an expert.',
  userPrompt: 'Help me.',
  temperature: 0.7
});
```

## Deployment

### Deploy to Vercel

```bash
# Push to GitHub
git add .
git commit -m "Add API provider support"
git push

# Deploy in Vercel dashboard
# Import project from GitHub
# Add environment variables
# Deploy
```

### Required Environment Variables for Production

- `VITE_TESTING_MODE` (set to `false`)
- At least one provider API key
- Recommended: Multiple provider keys for fallback

## Testing

### Run Integration Test

```bash
node -e "import('./src/api/__test__/apiIntegration.test.js').then(m => m.testAll())"
```

### Check Environment in Browser

1. Run `npm run dev`
2. Open browser console (F12)
3. Look for environment validation output:
   ```
   === Environment Validation ===
   Valid: ✓
   Testing Mode: disabled
   Available Providers: Groq, OpenAI
   ==============================
   ```

## Debug Mode

Enable verbose logging:

```bash
# In .env.local
VITE_LOG_LEVEL=debug
VITE_LOG_PROVIDER_USAGE=true
```

Then check console for detailed routing information.

## Provider Routing (Normal Mode)

```
Request: gpt-5.4-pro
  ↓
Try: OpenAI (sk-...)
  ↓
If fails → Try: Gemini (AIza...)
  ↓
If fails → Try: Bytez (bz-...)
  ↓
If fails → Try: Groq (gsk-...)
  ↓
If fails → Try: OpenRouter (sk-or-...)
  ↓
Response or Error
```

## Provider Routing (Testing Mode)

```
Request: Any Model
  ↓
Route to: Groq (gsk-...)
  ↓
Response or Error
```

## Links

- **[Setup Guide](ENV_SETUP.md)** - Complete configuration instructions
- **[Architecture](API_PROVIDER_SUMMARY.md)** - Technical details
- **[Verification](IMPLEMENTATION_CHECKLIST.md)** - Implementation checklist

## Support

For issues:
1. Check environment validation in console
2. Enable debug logging
3. Verify API keys are valid
4. Read detailed documentation in ENV_SETUP.md
