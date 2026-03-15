# VERDICT Model Assignments Report

## Overview
This document details the model assignments in the VERDICT architecture, including standard modes and special operating modes (Free Mode and Testing Mode).

## Standard Model Assignments

### Claude Opus 4.6 (Anthropic)
**Roles:**
- Goal Decomposition (GDE)
- Planning Branch C (Product Designer)
- Primary Research
- Causal Chain Validation
- Implementation Self-Critique
- Dependency Mapping
- Implementation (Agentic Execution)
- Pipeline Self-Analysis
- Jury Member
- GEL Lock (Anthropic family)

### GPT-5.4 Pro (OpenAI)
**Roles:**
- TDS Routing
- Intent Refining (Phase 1)
- Planning Branch B (Security Auditor)
- Jury Member
- GEL Lock (OpenAI family)

### Gemini 3.1 Pro (Google DeepMind)
**Roles:**
- Planning Branch A (Systems Architect)
- Consensus Finder (stateless)
- Jury Member

### Grok 4.2 (xAI)
**Roles:**
- Divergence Hunter (stateless)
- Real-Time Advisory Layer
- Skeptic Agent
- Retroactive Anchor Audit (all phases)

## Special Operating Modes

### Testing Mode
**Purpose:** Simplified deployment and testing with minimal configuration
**Activation:** Set `VITE_TESTING_MODE=true` environment variable
**Model Usage:**
- **Primary Model:** Groq API (replacing all external model APIs)
- **Specific Assignments:**
  - TDS Analysis: Groq (llama3-8b-8192 or similar)
  - GDE: Groq (llama3-8b-8192)
  - MIRA Calibration: Groq (llama3-8b-8192)
  - Planning Branches: Groq (llama3-8b-8192)
  - Research: Groq (llama3-8b-8192)
  - Causal Validation: Groq (llama3-8b-8192)
  - Skeptic Agent: Groq (llama3-8b-8192)
  - Advisory Layer: Groq (llama3-8b-8192)
  - Implementation: Groq (llama3-8b-8192)
  - Self-Critique: Groq (llama3-8b-8192)
  - Pipeline Analysis: Groq (llama3-8b-8192)
  - Jury Evaluation: Groq (llama3-8b-8192)
  - Anchor Reconciliation: Groq (llama3-8b-8192)

**Benefits:**
- Single API key required (Groq)
- Reduced complexity for development/testing
- Faster iteration cycles
- Preserves all architectural patterns and workflows

### Free Mode
**Purpose:** Community access tier with rate-limited but functional service
**Activation:** Default mode when no enterprise credentials configured
**Model Usage:**
- **Primary Models:** Hugging Face Inference API + Local Fallbacks
- **Specific Assignments:**
  - TDS Analysis: Hugging Face (microsoft/DialoGPT-large) + local rules fallback
  - GDE: Hugging Face (facebook/bart-large-cnn) + template-based decomposition
  - MIRA Calibration: Local heuristics + simple accuracy tracking
  - Planning Branches: Rule-based templates + Hugging Face summarization
  - Research: DuckDuckGo instant answers + Wikipedia API
  - Causal Validation: Local logical reasoning + pattern matching
  - Skeptic Agent: Rule-based challenge generation + common fallacy detection
  - Advisory Layer: Cached data + time-based simulations
  - Implementation: Code templates + syntactic validation
  - Self-Critique: Template-based issue detection
  - Pipeline Analysis: Heuristic-based performance scoring
  - Jury Evaluation: Weighted voting with fixed confidence scores
  - Anchor Reconciliation: Simple similarity scoring

**Limitations vs Full Mode:**
- Reduced reasoning depth
- Simplified uncertainty quantification
- Basic verification mechanisms
- Limited real-time data access
- Lower fidelity causal analysis
- Approximate anchoring

## Model Client Configuration
Located in: `src/services/types/modelClient.js`

Key features:
- Centralized model configuration management
- Fallback chains for each model type
- Mode-specific routing (standard/testing/free)
- Prompt templating system
- Error handling and retry logic
- Usage tracking and cost monitoring

## Implementation Notes
1. The architecture maintains strict separation of concerns - no model both generates and judges its own output
2. All model assignments follow the verification principles outlined in the specification
3. Special modes preserve architectural integrity while reducing external dependencies
4. Testing mode is particularly valuable for CI/CD pipelines and local development
5. Free mode enables community access and educational use

## Recommendations
1. Consider adding explicit Free Mode documentation to the main specification
2. The Testing Mode implementation demonstrates excellent architectural flexibility
3. Model client abstraction allows for easy swapping/backporting of different model providers
4. The system gracefully degrades functionality rather than failing when external APIs unavailable