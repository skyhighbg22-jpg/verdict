/**
 * VERDICT Core Engine - Service Exports
 * Centralized export of all VERDICT services
 */

// Types - explicit exports to avoid duplicates
export { TYPES, MODEL_TYPES, MODEL_ROLES, PIPELINE_STATUS, PHASES, TDS_CATEGORIES, TASK_STATUS, TASK_PRIORITY, FALLACY_TYPES, SEVERITY, CAUSAL_STRENGTH, PLANNING_BRANCHES, ADVISORY_QUERY_TYPES, GEL_PROVIDERS, EPISTEMIC_STATUS, STATE_LAYERS, ANCHOR_VERSIONS, ERROR_CODES } from './types/index.js';

// Core Services
export { default as pipelineEngine, PHASE_TRANSITIONS, executePipeline, requiresPhaseApproval, getNextPhase } 
  from './pipelineEngine.js';

export { default as miraEngine, HIDDEN_CONTROL_QUESTIONS, calculateMiscalibrationPenalty, calculateCalibrationScore, runMiraCalibration, adjustConfidence } 
  from './miraEngine.js';

export { default as tdsRouter, DEFAULT_TDS_SCORES, TDS_CATEGORIES, calculateOverallDifficulty, determineRouting, runTDSAnalysis, updateScoresForPhase } 
  from './tdsRouter.js';

export { default as gde, TASK_STATUS, TASK_PRIORITY, GDE_CONFIG, createTaskNode, buildDAG, runGoalDecomposition, updateTaskStatus, generateTaskId } 
  from './gde.js';

export { default as causalValidator, FALLACY_TYPES, SEVERITY, CAUSAL_STRENGTH, analyzeCausalChain, detectFallacies, runSkepticValidation, compareWithAdversarial } 
  from './causalValidator.js';

// Enhanced Services - Verification
export { default as gel, gel as globalEpistemicLedger, GEL_CONFIG, addFact, queryGEL, verifyFact, getVerifiedFacts, getGELStats } 
  from './verification/gel.js';

export { default as causalChainValidator, EVIDENCE_TYPES, CAUSAL_VALIDATION_CONFIG, createCausalLink, distinguishCorrelationFromCausation, generateCounterfactual, generateCounterfactuals, searchFalsifyingEvidence, validateCausalChain, assessCausalStrength, checkPlanningConsensus } 
  from './verification/causalChainValidator.js';

export { default as skepticAgent, SKEPTIC_CONFIG, CHALLENGE_TYPES, runSkepticValidationEnhanced, quickSkepticCheck, compareWithAdversarialEnhanced } 
  from './verification/skepticAgent.js';

export { default as gdeEnhanced, GDE_ENHANCED_CONFIG, EPISTEMIC_DESCRIPTIONS, runEnhancedGoalDecomposition, detectUnknownUnknowns, assignEpistemicStatus, updateEpistemicStatus, resolveUnknown } 
  from './verification/gdeEnhanced.js';

export { default as anchorReconciliation, ANCHOR_CONFIG, runAnchorAudit, runReconciliation, getAnchorHistory, createAnchor, createReconciliationDebate, resolveReconciliationDebate } 
  from './verification/anchorReconciliation.js';

export { default as approvalGate, APPROVAL_GATE_CONFIG, generateAuditPackage, renderAuditPackage } 
  from './verification/approvalGate.js';

export { default as divergenceHunter, DIVERGENCE_CONFIG, DIVERGENCE_CATEGORIES, analyzeBranchDivergence, quickDivergenceCheck, trackDivergenceTrend, findConsensusPoints, isCriticallyDivergent, shouldActivateAntithetical as shouldActivateAntitheticalFromHunter } 
  from './verification/divergenceHunter/index.js';

// Adversarial Self-Critique Personas
export { default as devilsEditor, DEVIL_EDITOR_CONFIG, DEVIL_EDITOR_CRITERIA, runDevilsEditorCritique, quickDevilsEditorCheck } 
  from './selfCritique/devilsEditor.js';

export { default as hostilePeerReviewer, HOSTILE_PEER_REVIEWER_CONFIG, HOSTILE_PEER_SYSTEM_PROMPT, REVIEW_DIMENSIONS, runHostilePeerReview, quickEvidenceCheck, challengeResearchClaim } 
  from './selfCritique/hostilePeerReviewer.js';

export { default as maliciousQA, MALICIOUS_QA_CONFIG, MALICIOUS_QA_SYSTEM_PROMPT, ATTACK_SURFACES, runMaliciousQACritique, shouldActivateMaliciousQA, quickSecurityScan, testAttackVector } 
  from './selfCritique/malignantQA.js';

export { SELF_CRITIQUE_PERSONAS, PERSONA_PHASE_MAPPING } 
  from './selfCritique/index.js';

// Advisory Layer
export { default as advisoryLayer, advisoryLayer as realTimeAdvisoryLayer, ADVISORY_CONFIG, queryLiveFact, queryMarketData, queryTechnicalStatus, queryNews, queryAnalytics, getAdvisoryStats } 
  from './advisory/advisoryLayer.js';

// Planning Services
export { default as fourBranchPlanning, PLANNING_CONFIG, BRANCH_PROMPTS, runFourBranchPlanning, runBranchAnalysisSingle, shouldActivateAntithetical } 
  from './planning/fourBranchPlanning.js';

export { default as juryEvaluation, JURY_CONFIG, CERTAINTY_DESCRIPTIONS, createJuryVote, applyMiraWeight, runJuryEvaluation, createVotesFromBranches, resolveWithCertaintyWeighting, canProceedWithDecision, generateJurySummary, calculateSupermajority, hasSupermajority, isUnanimous, checkJuryEarlyExit, runJuryEvaluationWithEarlyExit } 
  from './planning/juryEvaluation.js';

export { default as speculativeResearch, SPECULATIVE_CONFIG, SPECULATIVE_STATUS, shouldStartSpeculativeResearch, speculativeManager } 
  from './planning/speculativeResearch.js';

export { default as pipelineSelfAnalysis, SELF_ANALYSIS_CONFIG, METRIC_TYPES, analyzePipelinePerformance, performMetaAnalysis, SelfImprovementProposal } 
  from './planning/pipelineSelfAnalysis.js';

// Consensus Finder (Stateless - identifies unanimous steps for ground truth locking)
export { default as consensusFinder, CONSENSUS_FINDER_CONFIG, findConsensus, quickConsensusCheck, identifyGroundTruthCandidates, calculateConsensusPercentage, shouldTriggerSpeculative, generateConsensusSummary } 
  from './verification/consensusFinder.js';

// Internal Wisdom Check (Expected Findings before Research)
export { default as wisdomCheck, WISDOM_CHECK_CONFIG, generateExpectedFindings, performDeltaAnalysis, quickWisdomCheck } 
  from './verification/wisdomCheck.js';

// Retroactive Anchor Audit (checks each phase against all prior anchors)
export { default as retroactiveAnchorAudit, RETROACTIVE_AUDIT_CONFIG, runRetroactiveAnchorAudit, quickAnchorConsistencyCheck, batchAuditPhases } 
  from './verification/retroactiveAnchorAudit.js';

// GEL Dual-Provider Consensus Lock (Anthropic + OpenAI confirmation)
export { default as dualProviderConsensus, DUAL_PROVIDER_CONFIG, requestDualProviderVerification, submitFactWithConsensus, verifyExistingEntry, batchVerifyFacts, getPendingConsensusQueue, resolvePendingItem, checkProviderAgreement } 
  from './verification/dualProviderConsensus.js';

// Certainty-Weighted Conflict Resolution (GEL updates)
export { default as conflictResolution, CONFLICT_RESOLUTION_CONFIG, CONFLICT_TYPES, RESOLUTION_STRATEGIES, resolveConflict, executeResolution, batchResolveConflicts } 
  from './verification/conflictResolution.js';

// AIDefence Security Module (prompt injection, input validation, path/command blocking)
export { default as aiDefence, AIDEFENCE_CONFIG, VIOLATION_SEVERITY, VIOLATION_TYPES, validateInput, sanitizeInput, validateGELSchema, blockRawInjections, createSecurityMiddleware, getDefenceStats } 
  from './security/aiDefence.js';

// Dependency Mapping (JSON Dependency Graph + non-LLM script validation)
export { default as dependencyMapping, DEPENDENCY_CONFIG, createDependencyNode, buildDependencyGraph, validateCrossReferences, generateDependencyJSON, analyzeDependencyGraph, runScriptValidation } 
  from './implementation/dependencyMapping.js';

// State & Tooling
export { default as statePersistence, statePersistence as StatePersistence, STATE_CONFIG, createCheckpoint } 
  from './state/statePersistence.js';

export { default as toolOrchestration, toolOrchestrator, TOOL_TYPES, TOOL_STATUS, TOOL_CONFIG, executeCode, browseWeb, searchWeb, callAPI, queryDB, parseDocument } 
  from './state/toolOrchestration.js';

// Model Client
export { default as modelClient, modelClient as verdictModelClient, MODEL_CONFIGS, MODEL_TYPES, MODEL_ROLES, runGDEDecomposition, runMiraCalibration, runSkepticalValidation, runAdvisoryQuery, runPlanningBranch } 
  from './types/modelClient.js';

// Pipeline Context
export { default as PipelineContext, PipelineProvider, usePipeline, PHASES, ANCHOR_VERSIONS } 
  from '../context/PipelineContext.jsx';

// Bytez Client (re-export for convenience)
export { default as bytezClient } 
  from '../api/bytezClient.js';

// Pre-Flight Check Service
export { default as preFlightCheck, PREFLIGHT_CONFIG, PREFLIGHT_CHECKS, runAllChecks, runCriticalChecks, runQuickCheck } 
  from './preflight/preflightCheck.js';

// Free Mode Provider (for community access)
export { FREE_MODE_CONFIG, freeModeProvider, FREE_MODE_ROLES }
  from '../api/providers/freeModeProvider.js';

// Delta Check Service (Research phase - live findings vs expected)
export { deltaCheckService, runDeltaCheck, quickDeltaCheck, DELTA_CHECK_CONFIG, DELTA_TYPES, DELTA_SEVERITY }
  from './verification/deltaCheck.js';

// Async Batch Processing (Research + Implementation parallel execution)
export { asyncBatchProcessor, processPhaseBatch, getBatchStatus, getCostStats, ASYNC_BATCH_CONFIG, BATCH_STATUS, PHASE_BATCHES }
  from './state/asyncBatchProcessing.js';

// GEL Schema Validation (entry ingestion validation)
export { gelSchemaValidator, validateGELEntry, validateGELBatch, getValidationStats, GEL_SCHEMA_CONFIG, GEL_SCHEMA_TYPES, VALIDATION_SEVERITY }
  from './verification/gelSchemaValidation.js';

// Cost Tracking (real-time cost monitoring)
export { costTracker, startSession, endSession, trackRequest, trackSavings, getGlobalStats, getProviderBreakdown, getModelBreakdown, getPhaseBreakdown, exportCostReport, COST_CONFIG }
  from './state/costTracking.js';

// SONA Self-Learning (session-over-session routing improvement)
export { sonaService, recordSession, evaluateOutcome, getOptimalModel, getModelScores, getAllModelScores, exportSONAKnowledge, importSONAKnowledge, SONA_CONFIG, PATTERN_TYPES, OUTCOME_TYPES }
  from './planning/sonaSelfLearning.js';

// TDS GEL Cache (zero-cost exact match returns)
export { tdsGELCache, TDS_CACHE_CONFIG }
  from './state/tdsCache.js';

// Prompt Caching (90% input token savings)
export { promptCache, getCachedPrompt, buildPrompt, getCacheStats, PROMPT_CACHE_CONFIG, SYSTEM_PROMPTS, GEL_SCHEMA_TEMPLATE }
  from './state/promptCache.js';

// Structured Output Formatter (5-15% token savings)
export { structuredOutputFormatter, formatResponse, getOutputSuffix, OUTPUT_FORMATS }
  from './state/structuredOutput.js';

// MIRA Dynamic Jury Substitution (model swapping on probe failure)
export { jurySubstitutionManager, runJuryProbe, runFullJuryProbe, getJuryComposition, JURY_SUBSTITUTION_CONFIG }
  from './miraDynamicJury.js';

// Skeptic Grounding (dedicated live X cross-reference)
export { skepticGrounding, groundClaim, groundBatch, getGroundingStats, SKEPTIC_GROUNDING_CONFIG, GROUNDING_STATUS }
  from './verification/skepticGrounding.js';
