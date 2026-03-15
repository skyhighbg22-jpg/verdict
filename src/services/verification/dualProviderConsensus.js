/**
 * GEL Dual-Provider Consensus Lock
 * Enforces that no fact enters GEL without cross-provider confirmation
 * from both Claude Opus 4.6 (Anthropic) and GPT-5.4 Pro (OpenAI)
 */

import { bytezClient } from '../../api/bytezClient';
import { gel, GEL_PROVIDERS, EPISTEMIC_STATUS } from '../types';

export const DUAL_PROVIDER_CONFIG = {
  provider1: 'claude-opus-4.6',
  provider2: 'gpt-5.4-pro',
  consensusThreshold: 0.85,
  maxCertaintyForSingleProvider: 8,
  pendingQueueTTL: 86400,
  requireExplicitConfirmation: true
};

const DUAL_PROVIDER_PROMPT = `You are a facts verification agent.
Verify this fact claim independently.

Your verification must:
1. Check factual accuracy
2. Assess logical consistency
3. Identify any uncertainties
4. Provide a certainty score

Be rigorous - only confirm what you have high confidence in.`;

/**
 * Request verification from both providers
 */
export const requestDualProviderVerification = async (fact, source, context = {}) => {
  const verifications = {
    provider1: null,
    provider2: null,
    timestamp: new Date().toISOString()
  };

  const prompt1 = `
    Fact claim: ${fact}
    Source: ${source}
    Context: ${JSON.stringify(context)}
    
    ${DUAL_PROVIDER_PROMPT}
    
    Provide verification as JSON:
    {
      "verified": true/false,
      "certainty": 0.0-1.0,
      "confidence": 0.0-1.0,
      "issues": ["issue 1", "issue 2"],
      "supportingEvidence": ["evidence 1"],
      "verificationMethod": "training|inference|calculation",
      "caveats": ["caveat 1"]
    }
  `;

  try {
    const [response1, response2] = await Promise.all([
      bytezClient.runInference(DUAL_PROVIDER_CONFIG.provider1, {
        systemPrompt: 'You are a rigorous fact-verification agent.',
        userPrompt: prompt1,
        temperature: 0.2
      }),
      bytezClient.runInference(DUAL_PROVIDER_CONFIG.provider2, {
        systemPrompt: 'You are a rigorous fact-verification agent.',
        userPrompt: prompt1,
        temperature: 0.2
      })
    ]);

    verifications.provider1 = parseVerification(response1, DUAL_PROVIDER_CONFIG.provider1);
    verifications.provider2 = parseVerification(response2, DUAL_PROVIDER_CONFIG.provider2);

    return verifications;
  } catch (error) {
    return {
      provider1: { verified: false, error: error.message },
      provider2: { verified: false, error: error.message },
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Parse verification response
 */
const parseVerification = (response, provider) => {
  if (!response?.output) {
    return { verified: false, provider, error: 'No response' };
  }

  try {
    const parsed = typeof response.output === 'string'
      ? JSON.parse(response.output)
      : response.output;

    return {
      provider,
      verified: parsed.verified ?? false,
      certainty: parsed.certainty ?? 0.5,
      confidence: parsed.confidence ?? 0.5,
      issues: parsed.issues || [],
      supportingEvidence: parsed.supportingEvidence || [],
      verificationMethod: parsed.verificationMethod || 'inference',
      caveats: parsed.caveats || []
    };
  } catch (e) {
    return { verified: false, provider, error: 'Parse error' };
  }
};

/**
 * Check for consensus between providers
 */
const checkConsensus = (verification1, verification2) => {
  const certaintyDiff = Math.abs(
    verification1.certainty - verification2.certainty
  );

  const bothVerified = verification1.verified && verification2.verified;
  
  const certaintyAgreement = certaintyDiff < (1 - DUAL_PROVIDER_CONFIG.consensusThreshold);

  return {
    hasConsensus: bothVerified && certaintyAgreement,
    bothVerified,
    certaintyDiff,
    certaintyAgreement,
    consensusScore: Math.min(verification1.certainty, verification2.certainty),
    provider1Certainty: verification1.certainty,
    provider2Certainty: verification2.certainty
  };
};

/**
 * Submit fact to GEL with dual-provider consensus
 */
export const submitFactWithConsensus = async (fact, source, options = {}) => {
  const {
    ttl = DUAL_PROVIDER_CONFIG.pendingQueueTTL,
    metadata = {},
    context = {}
  } = options;

  const verifications = await requestDualProviderVerification(fact, source, context);

  const consensusResult = checkConsensus(
    verifications.provider1,
    verifications.provider2
  );

  if (consensusResult.hasConsensus) {
    const entry = await gel.addFact(fact, source, {
      ttl,
      metadata: {
        ...metadata,
        dualProviderConsensus: true,
        provider1Verification: verifications.provider1,
        provider2Verification: verifications.provider2,
        consensusScore: consensusResult.consensusScore
      }
    });

    return {
      status: 'verified',
      entry,
      consensus: consensusResult,
      verifications,
      message: 'Fact verified with dual-provider consensus'
    };
  }

  if ((verifications.provider1?.certainty >= 0.8 || verifications.provider2?.certainty >= 0.8)) {
    const pendingEntry = {
      fact,
      source,
      certainty: Math.max(
        verifications.provider1?.certainty || 0,
        verifications.provider2?.certainty || 0
      ),
      status: EPISTEMIC_STATUS.PENDING,
      verifications,
      consensus: consensusResult,
      submittedAt: new Date().toISOString(),
      ttl,
      metadata
    };

    return {
      status: 'pending_consensus',
      entry: pendingEntry,
      consensus: consensusResult,
      verifications,
      message: 'Fact added to Pending Consensus queue for human review'
    };
  }

  return {
    status: 'rejected',
    reason: consensusResult.bothVerified 
      ? 'Providers disagree on certainty' 
      : 'One or more providers rejected the fact',
    consensus: consensusResult,
    verifications
  };
};

/**
 * Verify existing GEL entry with dual providers
 */
export const verifyExistingEntry = async (entryId) => {
  const entries = await gel.query(`id:${entryId}`, { limit: 1 });
  if (!entries || entries.length === 0) {
    return { verified: false, error: 'Entry not found' };
  }

  const entry = entries[0];
  return submitFactWithConsensus(entry.fact, entry.source, {
    metadata: entry.metadata,
    context: { entryId: entry.id }
  });
};

/**
 * Batch verify multiple facts
 */
export const batchVerifyFacts = async (facts, sources) => {
  const results = [];

  for (let i = 0; i < facts.length; i++) {
    const fact = facts[i];
    const source = sources[i] || 'batch';

    const result = await submitFactWithConsensus(fact, source);
    results.push({
      fact,
      ...result
    });

    if (i < facts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return {
    total: facts.length,
    verified: results.filter(r => r.status === 'verified').length,
    pending: results.filter(r => r.status === 'pending_consensus').length,
    rejected: results.filter(r => r.status === 'rejected').length,
    results
  };
};

/**
 * Get Pending Consensus queue items
 */
export const getPendingConsensusQueue = async () => {
  const results = await gel.query('status:pending', {
    status: EPISTEMIC_STATUS.PENDING
  });

  return {
    queue: results,
    count: results.length,
    oldestItem: results.length > 0 ? results[results.length - 1] : null
  };
};

/**
 * Resolve pending item with human decision
 */
export const resolvePendingItem = async (entryId, humanDecision, humanNotes = '') => {
  const entries = await gel.query(`id:${entryId}`, { limit: 1 });
  if (!entries || entries.length === 0) {
    return { resolved: false, error: 'Entry not found' };
  }

  const entry = entries[0];

  if (humanDecision === 'approve') {
    const verified = await gel.addFact(entry.fact, entry.source, {
      certainty: entry.certainty,
      status: EPISTEMIC_STATUS.VERIFIED,
      metadata: {
        ...entry.metadata,
        humanApproved: true,
        humanNotes,
        approvedAt: new Date().toISOString()
      }
    });

    return {
      resolved: true,
      status: 'approved',
      entry: verified,
      message: 'Entry approved and moved to verified status'
    };
  }

  if (humanDecision === 'reject') {
    return {
      resolved: true,
      status: 'rejected',
      message: 'Entry rejected and removed from queue'
    };
  }

  return { resolved: false, error: 'Invalid decision' };
};

/**
 * Check provider agreement on scale 1-10
 */
export const checkProviderAgreement = (verification1, verification2) => {
  const certainty1 = (verification1?.certainty || 0) * 10;
  const certainty2 = (verification2?.certainty || 0) * 10;

  if (Math.abs(certainty1 - certainty2) <= 1) {
    return {
      agreement: 'strong',
      canAutoupdate: certainty1 >= 9 && certainty2 >= 9
    };
  }

  if (Math.abs(certainty1 - certainty2) <= 3) {
    return {
      agreement: 'moderate',
      canAutoupdate: false
    };
  }

  return {
    agreement: 'weak',
    canAutoupdate: false,
    requiresDebate: true
  };
};

export default {
  DUAL_PROVIDER_CONFIG,
  requestDualProviderVerification,
  submitFactWithConsensus,
  verifyExistingEntry,
  batchVerifyFacts,
  getPendingConsensusQueue,
  resolvePendingItem,
  checkProviderAgreement
};