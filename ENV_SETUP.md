# VERDICT Environment Configuration Guide

This guide explains how to configure VERDICT for deployment with testing mode and multi-provider fallback support.

## Quick Start

### 1. Create Environment File

Copy the example environment file:

```bash
cp .env.example .env.local
```

### 2. Add Your API Keys

Edit `.env.local` and add at least one API provider key:

```bash
# For testing mode (simplest setup)
VITE_TESTING_MODE=true
VITE_GROQ_API_KEY=your_groq_api_key_here

# For production mode (multi-provider)
VITE_TESTING_MODE=false
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_GROQ_API_KEY=your_groq_api_key_here
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Start Development Server

```bash
npm run dev
```

## Configuration Options

### Testing Mode

**Testing Mode** (`VITE_TESTING_MODE=true`) routes ALL API requests through OpenRouter with free models, ignoring other providers.

**Benefits:**
- Only need one API key (OpenRouter)
- Uses free models including minimax/minimax-m2.5:free and deepseek-ai/deepseek-v3.2
- Faster development iteration
- Simplified debugging
- Reduced API costs

**Use Cases:**
- Development and testing
- Proof of concept
- When you don't have access to multiple providers

### Normal Mode

**Normal Mode** (`VITE_TESTING_MODE=false`) routes requests to optimal providers with automatic fallback:

| Model ID | Primary Provider | Fallback Chain |
|----------|----------------|----------------|
| `gpt-5.4-pro` | OpenRouter | NVIDIA → Groq → OpenAI → Google (Gemini) → Bytez |
| `grok-4.2` | OpenRouter | NVIDIA → Groq → OpenAI → Google (Gemini) → Bytez |
| `gemini-3.1-pro` | OpenRouter | NVIDIA → Groq → OpenAI → Google (Gemini) → Bytez |
| `claude-opus-4.6` | OpenRouter | NVIDIA → Groq → OpenAI → Google (Gemini) → Bytez |
| `step-flash` | OpenRouter | NVIDIA → Groq |
| `nemotron-3-super` | OpenRouter | NVIDIA → Groq |

**Benefits:**
- Optimal model selection for each task
- Automatic fallback on errors
- Rate limit handling
- Maximum reliability

## API Provider Keys

### OpenAI (Required for GPT models)
- **Website:** https://platform.openai.com/api-keys
- **Env Var:** `VITE_OPENAI_API_KEY`
- **Models Used:** GPT-4o, GPT-4 Turbo

### Google Gemini (Required for Gemini models)
- **Website:** https://aistudio.google.com/app/apikey
- **Env Var:** `VITE_GEMINI_API_KEY`
- **Models Used:** Gemini 1.5 Pro

### Groq (Fast inference, required for testing mode)
- **Website:** https://console.groq.com/keys
- **Env Var:** `VITE_GROQ_API_KEY`
- **Models Used:** Llama 3.3 70B, Mixtral 8x7B, Step Flash, Nemotron 3 Super
- **Note:** Free tier available with generous limits

### Bytez (Unified provider)
- **Website:** https://bytez.com
- **Env Var:** `VITE_BYTEZ_API_KEY`
- **Models Used:** GPT-4o, Gemini 1.5 Pro, Mixtral, Claude 3

### OpenRouter (Multi-provider fallback)
- **Website:** https://openrouter.ai/keys
- **Env Var:** `VITE_OPENROUTER_API_KEY`
- **Models Used:** Claude 3 Opus, GPT-4o, Grok Beta, Step Flash, Nemotron 3 Super
- **Note:** Good final fallback option

### NVIDIA (Step Flash and Nemotron 3 Super models)
- **Website:** https://api.nvidia.com/
- **Env Var:** `VITE_NVIDIA_API_KEY`
- **Models Used:** Step Flash, Nemotron 3 Super

## Advanced Configuration

### Fallback Behavior

Control provider fallback with:

```bash
# Enable/disable fallback (default: true)
VITE_ENABLE_FALLBACK=true

# Maximum retry attempts per provider (default: 3)
VITE_MAX_RETRIES=3

# Request timeout in milliseconds (default: 30000)
VITE_REQUEST_TIMEOUT=30000
```

### Logging

Configure logging output:

```bash
# Log level (default: info)
# Options: debug, info, warn, error
VITE_LOG_LEVEL=info

# Log provider usage (default: true)
VITE_LOG_PROVIDER_USAGE=true
```

### Model Mappings

Override default model mappings per provider:

```bash
# Map gpt-5.4-pro to specific provider models
VITE_GPT_5_4_PRO_OPENAI=gpt-4o
VITE_GPT_5_4_PRO_GROQ=llama-3.3-70b-versatile
VITE_GPT_5_4_PRO_NVIDIA=nemotron-3-super

# Map grok-4.2 to specific provider models
VITE_GROK_4_2_GROQ=mixtral-8x7b-32768
VITE_GROK_4_2_OPENROUTER=x-ai/grok-beta
VITE_GROK_4_2_NVIDIA=step-flash

# Map gemini-3.1-pro to specific provider models
VITE_GEMINI_3_1_PRO_GOOGLE=gemini-1.5-pro
VITE_GEMINI_3_1_PRO_GROQ=llama-3.3-70b-versatile
VITE_GEMINI_3_1_PRO_NVIDIA=nemotron-3-super

# Map claude-opus-4.6 to specific provider models
VITE_CLAUDE_OPUS_4_6_OPENROUTER=anthropic/claude-3-opus
VITE_CLAUDE_OPUS_4_6_GROQ=llama-3.3-70b-versatile
VITE_CLAUDE_OPUS_4_6_NVIDIA=nemotron-3-super

# Map step-flash to specific provider models
VITE_STEP_FLASH_NVIDIA=step-flash
VITE_STEP_FLASH_OPENROUTER=step-ai/step-flash

# Map nemotron-3-super to specific provider models
VITE_NEMOTRON_3_SUPER_NVIDIA=nemotron-3-super
VITE_NEMOTRON_3_SUPER_OPENROUTER=nvidia/nemotron-3-super
```

## Deployment

### Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

**Important:** Add all `VITE_` prefixed environment variables to Vercel's environment settings.

### Other Platforms

Ensure your hosting platform:
- Supports build-time environment variable injection
- Exposes `VITE_` prefixed variables to the client
- Allows setting environment variables before build

## Model Architecture

### Internal Model IDs

The application uses fictional model IDs for abstraction:

- `gpt-5.4-pro` - General inference, TDS analysis, GDE decomposition
- `grok-4.2` - Skeptic validation, adversarial reasoning
- `gemini-3.1-pro` - Advisory queries, alternative analysis
- `claude-opus-4.6` - Planning, nuanced analysis

### Provider Mapping

These internal IDs map to actual provider models:

| Internal ID | OpenAI | Groq | Gemini | OpenRouter |
|-------------|--------|------|---------|------------|
| `gpt-5.4-pro` | gpt-4o | llama-3.3-70b-versatile | gemini-1.5-pro | openai/gpt-4o |
| `grok-4.2` | gpt-4o | mixtral-8x7b-32768 | gemini-1.5-pro | x-ai/grok-beta |
| `gemini-3.1-pro` | gpt-4o | llama-3.3-70b-versatile | gemini-1.5-pro | google/gemini-pro-1.5 |
| `claude-opus-4.6` | gpt-4o | llama-3.3-70b-versatile | gemini-1.5-pro | anthropic/claude-3-opus |

## Troubleshooting

### "All providers failed" error

**Cause:** No API keys configured or all providers are down.

**Solution:**
1. Check that at least one API key is set in `.env.local`
2. Verify API keys are valid
3. Check provider status pages for outages
4. Enable testing mode to use Groq only

### API rate limits

**Cause:** Too many requests to a provider.

**Solution:**
1. Fallback chain automatically retries with other providers
2. Increase `VITE_MAX_RETRIES` for more retries
3. Add more provider keys for better load distribution

### Environment variables not loading

**Cause:** Environment file not named correctly or not in project root.

**Solution:**
1. Ensure file is named `.env.local` (not `.env`)
2. File should be in project root directory
3. Restart dev server after adding/changes env vars

### Testing mode not working

**Cause:** Groq API key missing or invalid.

**Solution:**
1. Set `VITE_GROQ_API_KEY` in `.env.local`
2. Get a free key from https://console.groq.com/keys
3. Restart dev server

## API Provider Pricing

### Free Tiers

- **Groq:** Free tier with generous limits (recommended for testing)
- **Google Gemini:** Free tier available
- **OpenAI:** No free tier, requires credits

### Paid Tiers

- **OpenAI:** Pay-per-use, starting at $0.005/1K tokens (GPT-4o)
- **Google Gemini:** Pay-per-use, competitive pricing
- **Bytez:** Unified pricing, contact for details
- **OpenRouter:** Pay-per-use, passes through provider costs

## Security

**Important:**
- Never commit `.env.local` or any file containing API keys
- Use `.env.example` as a template
- Rotate API keys regularly
- Use environment-specific keys (dev vs production)
- Monitor API usage for suspicious activity

## Support

For issues or questions:
1. Check this documentation first
2. Review console logs for detailed error messages
3. Set `VITE_LOG_LEVEL=debug` for more details
4. Check provider status pages for service outages

## Migration from Mock Mode

If you were using the previous mock mode:

1. Create `.env.local` from `.env.example`
2. Add at least one API key (Groq recommended)
3. Set `VITE_TESTING_MODE=true` for minimal changes
4. The app will automatically route requests to real APIs

No code changes required - backward compatibility maintained!
