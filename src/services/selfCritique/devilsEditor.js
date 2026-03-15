/**
 * Devil's Editor - Refining Phase Self-Critique Persona
 * Implements adversarial self-critique for the Refining phase
 * Focuses on finding flaws in requirements, logic, and assumptions
 */

import { bytezClient } from '../../api/bytezClient';
import { PHASES } from '../types';

export const DEVIL_EDITOR_CONFIG = {
  grokModel: 'grok-4.2',
  challengeIterations: 3,
  minFlawSeverity: 'medium',
  requireAlternativeSolutions: true
};

const DEVIL_EDITOR_SYSTEM_PROMPT = `You are the Devil's Editor - an adversarial self-critique persona for the VERDICT Refining Phase.
Your role is to find every possible flaw, weakness, and gap in the refined requirements.

Responsibilities:
1. Challenge every assumption and stated requirement
2. Find edge cases and failure modes
3. Identify logical inconsistencies and contradictions
4. Question the completeness of requirements
5. Look for unstated dependencies or prerequisites
6. Find ways the requirements could be misinterpreted
7. Identify potential ethical or safety concerns

Tactics:
- Play devil's advocate on every point
- Ask "what if" questions relentlessly
- Look for hidden assumptions
- Find the weakest link in the chain
- Consider malicious or unintended use cases
- Challenge scope boundaries

Output format: JSON with structured criticism and severity ratings.`;

const DEVIL_EDITOR_CRITERIA = [
  'completeness',
  'consistency',
  'feasibility',
  'clarity',
  'edge_cases',
  'security_implications',
  'ethical_concerns',
  'hidden_assumptions',
  'ambiguity',
  'scope_creep'
];

/**
 * Run Devil's Editor critique on refined requirements
 */
export const runDevilsEditorCritique = async (refinedRequirements, context = {}) => {
  const prompt = `
    Perform adversarial self-critique on these refined requirements.
    
    Requirements:
    ${JSON.stringify(refinedRequirements, null, 2)}
    
    Context: ${JSON.stringify(context)}
    
    Evaluate each of these criteria: ${DEVIL_EDITOR_CRITERIA.join(', ')}
    
    Provide your critique as JSON:
    {
      "overallAssessment": "severe_issues|moderate_issues|minor_issues|clean",
      "totalFlaws": number,
      "criticalFlaws": ["flaw 1", "flaw 2"],
      "flawDetails": [
        {
          "criterion": "which criterion failed",
          "description": "description of the flaw",
          "severity": "critical|high|medium|low",
          "location": "where in requirements",
          "suggestion": "how to fix"
        }
      ],
      "alternativeInterpretations": ["interpretation 1", "..."],
      "edgeCases": ["edge case 1", "..."],
      "unaddressedQuestions": ["question 1", "..."],
      "requiresRevision": boolean
    }
  `;

  try {
    const response = await bytezClient.runInference(DEVIL_EDITOR_CONFIG.grokModel, {
      systemPrompt: DEVIL_EDITOR_SYSTEM_PROMPT,
      userPrompt: prompt,
      temperature: 0.7
    });

    let parsed = {};
    if (response?.output) {
      try {
        parsed = typeof response.output === 'string'
          ? JSON.parse(response.output)
          : response.output;
    } catch {
      console.warn('Failed to parse Devil\'s Editor response');
    }
    }

    return {
      persona: 'Devil\'s Editor',
      phase: PHASES.REFINING,
      timestamp: new Date().toISOString(),
      ...parsed
    };
  } catch (error) {
    return {
      persona: 'Devil\'s Editor',
      phase: PHASES.REFINING,
      error: error.message,
      requiresRevision: true
    };
  }
};

/**
 * Quick Devil's Editor check (single pass)
 */
export const quickDevilsEditorCheck = async (requirements) => {
  const prompt = `
    Quickly identify the most critical flaws in these requirements.
    
    Requirements: ${requirements}
    
    Provide JSON response:
    {
      "topCriticalFlaws": ["flaw 1", "flaw 2", "flaw 3"],
      "quickAssessment": "needs_work|acceptable|excellent",
      "primaryConcern": "main issue"
    }
  `;

  try {
    const response = await bytezClient.runInference(DEVIL_EDITOR_CONFIG.grokModel, {
      systemPrompt: DEVIL_EDITOR_SYSTEM_PROMPT,
      userPrompt: prompt,
      temperature: 0.6
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
      persona: 'Devil\'s Editor (Quick)',
      phase: PHASES.REFINING,
      timestamp: new Date().toISOString(),
      ...parsed
    };
  } catch (error) {
    return {
      persona: 'Devil\'s Editor (Quick)',
      error: error.message
    };
  }
};

export default {
  DEVIL_EDITOR_CONFIG,
  DEVIL_EDITOR_CRITERIA,
  runDevilsEditorCritique,
  quickDevilsEditorCheck
};
