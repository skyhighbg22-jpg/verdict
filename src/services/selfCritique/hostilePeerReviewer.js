/**
 * Hostile Peer Reviewer - Research Phase Self-Critique Persona
 * Implements adversarial self-critique for the Research phase
 * Focuses on challenging research methodology, evidence quality, and conclusions
 */

import { bytezClient } from '../../api/bytezClient';
import { PHASES } from '../types';

export const HOSTILE_PEER_REVIEWER_CONFIG = {
  grokModel: 'grok-4.2',
  challengeTypes: [
    'methodology',
    'evidence_quality',
    'sample_size',
    'bias',
    'causation_vs_correlation',
    'confounding_variables',
    'reproducibility'
  ],
  minEvidenceThreshold: 0.7
};

const HOSTILE_PEER_SYSTEM_PROMPT = `You are the Hostile Peer Reviewer - an adversarial self-critique persona for the VERDICT Research Phase.
Your role is to critically evaluate all research findings, methodology, and evidence with a hostile, skeptical eye.

Responsibilities:
1. Challenge research methodology and experimental design
2. Question sample sizes and statistical significance
3. Identify potential biases in research
4. Find flaws in causal reasoning
5. Challenge the interpretation of results
6. Look for alternative explanations
7. Question the reproducibility of findings
8. Find gaps in the evidence base

Tactics:
- Be hostile but constructive - focus on improving quality
- Demand rigorous evidence for every claim
- Look for p-hacking, cherry-picking, or selective reporting
- Challenge assumptions about causation
- Consider publication bias
- Question generalizability
- Look for failed replications or contradictory studies

Output format: JSON with structured criticism.`;

const REVIEW_DIMENSIONS = [
  'methodology_rigor',
  'evidence_strength',
  'statistical_validity',
  'bias_identification',
  'causal_claims',
  'generalizability',
  'reproducibility',
  'literature_coverage',
  'data_quality',
  'conclusion_warrant'
];

/**
 * Run Hostile Peer Reviewer critique on research findings
 */
export const runHostilePeerReview = async (researchFindings, context = {}) => {
  const prompt = `
    Perform hostile peer review on these research findings.
    
    Research:
    ${JSON.stringify(researchFindings, null, 2)}
    
    Context: ${JSON.stringify(context)}
    
    Evaluate each dimension: ${REVIEW_DIMENSIONS.join(', ')}
    
    Provide your critique as JSON:
    {
      "overallAssessment": "major_concerns|moderate_concerns|minor_concerns|sound",
      "reviewScore": 0-10,
      "majorConcerns": ["concern 1", "..."],
      "dimensionReviews": [
        {
          "dimension": "which dimension",
          "score": 0-10,
          "issues": ["issue 1"],
          "strengths": ["strength 1"],
          "recommendation": "improve|acceptable|excellent"
        }
      ],
      "methodologyCritique": {
        "weaknesses": ["..."],
        "suggestedImprovements": ["..."]
      },
      "evidenceCritique": {
        "gaps": ["..."],
        "qualityIssues": ["..."],
        "missingEvidence": ["..."]
      },
      "alternativeInterpretations": ["..."],
      "questionsForAuthors": ["question 1"],
      "publicationRecommendation": "accept|minor_revision|major_revision|reject",
      "requiresRevision": boolean
    }
  `;

  try {
    const response = await bytezClient.runInference(HOSTILE_PEER_REVIEWER_CONFIG.grokModel, {
      systemPrompt: HOSTILE_PEER_SYSTEM_PROMPT,
      userPrompt: prompt,
      temperature: 0.65
    });

    let parsed = {};
    if (response?.output) {
      try {
        parsed = typeof response.output === 'string'
          ? JSON.parse(response.output)
          : response.output;
      } catch (e) {
        console.warn('Failed to parse Hostile Peer Reviewer response');
      }
    }

    return {
      persona: 'Hostile Peer Reviewer',
      phase: PHASES.RESEARCH,
      timestamp: new Date().toISOString(),
      ...parsed
    };
  } catch (error) {
    return {
      persona: 'Hostile Peer Reviewer',
      phase: PHASES.RESEARCH,
      error: error.message,
      requiresRevision: true
    };
  }
};

/**
 * Quick evidence quality check
 */
export const quickEvidenceCheck = async (evidenceClaims) => {
  const prompt = `
    Quickly evaluate the quality of these evidence claims.
    
    Claims: ${evidenceClaims}
    
    Provide JSON:
    {
      "evidenceStrength": "strong|moderate|weak|insufficient",
      "mainWeakness": "primary issue",
      "needsDeeperReview": boolean
    }
  `;

  try {
    const response = await bytezClient.runInference(HOSTILE_PEER_REVIEWER_CONFIG.grokModel, {
      systemPrompt: HOSTILE_PEER_SYSTEM_PROMPT,
      userPrompt: prompt,
      temperature: 0.5
    });

    let parsed = {};
    if (response?.output) {
      try {
        parsed = typeof response.output === 'string'
          ? JSON.parse(response.output)
          : response.output;
      } catch (e) {}
    }

    return {
      persona: 'Hostile Peer Reviewer (Quick)',
      phase: PHASES.RESEARCH,
      timestamp: new Date().toISOString(),
      ...parsed
    };
  } catch (error) {
    return {
      persona: 'Hostile Peer Reviewer (Quick)',
      error: error.message
    };
  }
};

/**
 * Challenge specific research claim
 */
export const challengeResearchClaim = async (claim, challengeType = 'methodology') => {
  const prompt = `
    Challenge this research claim using ${challengeType} critique.
    
    Claim: ${claim}
    
    Provide JSON:
    {
      "challengeType": "${challengeType}",
      "challenge": "specific challenge",
      "evidenceNeeded": "what evidence would strengthen/weaken this",
      "alternativeExplanation": "alternative explanation if available",
      "strength": 0.0-1.0
    }
  `;

  try {
    const response = await bytezClient.runInference(HOSTILE_PEER_REVIEWER_CONFIG.grokModel, {
      systemPrompt: HOSTILE_PEER_SYSTEM_PROMPT,
      userPrompt: prompt,
      temperature: 0.7
    });

    let parsed = {};
    if (response?.output) {
      try {
        parsed = typeof response.output === 'string'
          ? JSON.parse(response.output)
          : response.output;
      } catch (e) {}
    }

    return {
      persona: 'Hostile Peer Reviewer',
      phase: PHASES.RESEARCH,
      timestamp: new Date().toISOString(),
      challengeType,
      ...parsed
    };
  } catch (error) {
    return {
      persona: 'Hostile Peer Reviewer',
      error: error.message
    };
  }
};

export default {
  HOSTILE_PEER_REVIEWER_CONFIG,
  HOSTILE_PEER_SYSTEM_PROMPT,
  REVIEW_DIMENSIONS,
  runHostilePeerReview,
  quickEvidenceCheck,
  challengeResearchClaim
};
