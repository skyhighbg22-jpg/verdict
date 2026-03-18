# VERDICT UI

A sophisticated AI-powered task management and pipeline orchestration system with multi-provider LLM support and testing mode.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure API Providers

Copy the example environment file and add your API keys:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add at least one provider key:

```bash
# For testing mode (simplest setup)
VITE_TESTING_MODE=true
VITE_GROQ_API_KEY=your_groq_api_key_here

# For production mode
VITE_TESTING_MODE=false
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_GROQ_API_KEY=your_groq_api_key_here
```

### 3. Start Development Server

```bash
npm run dev
```

## Documentation

- **[Environment Setup Guide](ENV_SETUP.md)** - Complete configuration instructions
- **[API Provider Summary](API_PROVIDER_SUMMARY.md)** - Architecture and implementation details

## Features

### Multi-Provider LLM Support

- **OpenAI** - GPT-4o for general inference
- **Google Gemini** - Gemini 1.5 Pro for advisory queries
- **Groq** - Fast inference (Llama 3.3, Mixtral)
- **Bytez** - Unified provider interface
- **OpenRouter** - Multi-model access (Claude 3, Grok, etc.)
- **NVIDIA** - Step Flash and Nemotron 3 Super models

### Testing Mode & Free Mode

Set `VITE_TESTING_MODE=true` to route all requests through OpenRouter with specific free models:
- Single API key required (OpenRouter or Groq)
- Uses free models including:
  - openrouter/hunter-alpha (main model - more smarter)
  - minimax/minimax-m2.5:free (second main model)
  - deepseek-ai/deepseek-v3.2 (for reasoning/coding tasks)
- Faster development iteration
- Simplified debugging
- Reduced API costs

**Free Mode**: Automatically activates when no enterprise credentials are configured, using fallback free models through OpenRouter.

### Automatic Fallback

When providers fail, the system automatically retries with fallback providers:
- Configurable retry attempts
- Exponential backoff
- Graceful error handling
- Provider usage logging

## Architecture

```
Services (TDS, GDE, Skeptic, etc.)
         ↓
    bytezClient
         ↓
     apiRouter
         ↓
    Providers (OpenAI, Groq, Gemini, etc.)
```

All services use `bytezClient.runInference(modelId, input)`, which routes to the optimal provider based on configuration.

## Supported Models

| Model ID | Purpose | Primary Provider |
|----------|---------|-----------------|
| `GPT-5.4-Pro` | TDS analysis, GDE decomposition | OpenAI |
| `Grok-4.2` | Skeptic validation, adversarial reasoning | Groq |
| `Gemini-3.1-Pro` | Advisory queries | Gemini |
| `Claude-Opus-4.6` | Planning, nuance analysis | OpenRouter |
| `Step-Flash` | Fast inference | NVIDIA |
| `Nemotron-3-Super` | General purpose model | NVIDIA |

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Deployment

### Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

See [ENV_SETUP.md](ENV_SETUP.md) for detailed deployment instructions.

### Environment Variables Required

For production deployment, set these in your hosting platform:
- `VITE_OPENAI_API_KEY` (optional)
- `VITE_GEMINI_API_KEY` (optional)
- `VITE_GROQ_API_KEY` (required for testing mode)
- `VITE_BYTEZ_API_KEY` (optional)
- `VITE_OPENROUTER_API_KEY` (optional)
- `VITE_NVIDIA_API_KEY` (optional)
- `VITE_TESTING_MODE` (default: false)

## API Providers

### Groq (Recommended for Testing)
- Website: https://console.groq.com/keys
- Free tier available
- Fast inference speeds
- Used in testing mode

### OpenAI
- Website: https://platform.openai.com/api-keys
- GPT-4o model
- Pay-per-use

### Google Gemini
- Website: https://aistudio.google.com/app/apikey
- Gemini 1.5 Pro
- Competitive pricing

### OpenRouter
- Website: https://openrouter.ai/keys
- Access to multiple models
- Pass-through pricing

### NVIDIA
- Website: https://api.nvidia.com/
- Step Flash and Nemotron 3 Super models
- Competitive inference pricing

### Bytez
- Website: https://bytez.com
- Unified provider interface
- Multi-model access

## Project Structure

```
src/
├── api/
│   ├── apiRouter.js          # Unified routing logic
│   ├── bytezClient.js       # Backward-compatible client
│   ├── envValidator.js       # Environment validation
│   ├── providers/           # API provider implementations
│   │   ├── openaiProvider.js
│   │   ├── geminiProvider.js
│   │   ├── groqProvider.js
│   │   ├── bytezProvider.js
│   │   ├── openrouterProvider.js
│   │   ├── nvidiaProvider.js
│   │   └── freeModeProvider.js
│   └── __test__/            # Integration tests
├── services/
│   ├── tdsRouter.js         # Task Difficulty Score
│   ├── gde.js               # Goal Decomposition Engine
│   ├── causalValidator.js   # Causal Chain Validation
│   ├── pipelineEngine.js    # Pipeline orchestration
│   ├── miraEngine.js        # MIRA processing engine
│   ├── auditLog.js          # Request logging
│   ├── planning/            # Four-Branch Planning
│   ├── verification/        # Skeptic Agent
│   ├── advisory/            # Advisory Layer
│   ├── preflight/           # Preflight checks
│   ├── security/            # Security validation
│   ├── selfCritique/        # Self-critique agent
│   └── state/               # State management
├── components/
│   ├── layout/              # Layout components
│   ├── metrics/             # Metrics display
│   ├── navigation/          # Navigation components
│   ├── phases/              # Pipeline phase components
│   ├── shared/              # Shared UI components
│   └── versions/           # Version management
└── context/
    └── PipelineContext.jsx  # Pipeline Orchestrator
```

## Backward Compatibility

The refactored API maintains full backward compatibility:
- All existing service calls work unchanged
- Same bytezClient interface
- No code changes required
- Zero migration effort

## Getting API Keys

### Groq (Free)
1. Visit https://console.groq.com/keys
2. Create account
3. Generate API key
4. Add to `.env.local`

### OpenAI
1. Visit https://platform.openai.com/api-keys
2. Sign in or create account
3. Create API key
4. Add credits
5. Add to `.env.local`

### Google Gemini
1. Visit https://aistudio.google.com/app/apikey
2. Create project
3. Generate API key
4. Add to `.env.local`

### OpenRouter
1. Visit https://openrouter.ai/keys
2. Sign in or create account
3. Add credits
4. Generate API key
5. Add to `.env.local`

### NVIDIA
1. Visit https://api.nvidia.com/
2. Create account or sign in
3. Generate API key
4. Add to `.env.local`

### Bytez
1. Visit https://bytez.com
2. Create account
3. Generate API key
4. Add to `.env.local`

## Troubleshooting

### "All providers failed"
- Ensure at least one API key is set in `.env.local`
- Verify keys are valid
- Check for typos in API keys
- Enable testing mode to simplify setup

### Environment variables not loading
- Restart dev server after changes to `.env.local`
- Ensure file is named `.env.local` (not `.env`)
- File should be in project root

### Provider rate limits
- Fallback chain handles automatically
- Increase `VITE_MAX_RETRIES` for more attempts
- Add multiple provider keys for load distribution

## Development

### Run integration tests
```bash
node -e "import('./src/api/__test__/apiIntegration.test.js').then(m => m.testAll())"
```

### Check environment status
Check browser console when running `npm run dev` to see:
- Available providers
- Testing mode status
- Fallback configuration
- Model routing info

## License

Private project - All rights reserved.

## Support

For detailed setup and configuration:
- Read [ENV_SETUP.md](ENV_SETUP.md)
- Read [API_PROVIDER_SUMMARY.md](API_PROVIDER_SUMMARY.md)
- Check console logs for detailed error messages
- Set `VITE_LOG_LEVEL=debug` for verbose output
