/**
 * Internal Wisdom Check
 * Generates Expected Findings from training knowledge before Research phase
 * Enables delta analysis between expected and actual findings
 */

import { bytezClient } from '../../api/bytezClient';
import { queryGEL } from './gel';

export const WISDOM_CHECK_CONFIG = {
  model: 'gpt-5.4-pro',
  temperature: 0.3,
  maxExpectedFindings: 10,
  minConfidenceThreshold: 0.6,
  enableGELCheck: true
};

const WISDOM_CHECK_PROMPT = `You are the Internal Wisdom Check - generates Expected Findings before Research phase.
Your role is to produce what the models would expect to find based purely on training knowledge.

Responsibilities:
1. Identify what information SHOULD be available based on training knowledge
2. List expected facts, relationships, and sources
3. Note common pitfalls and misconceptions in this domain
4. Flag areas where training knowledge may be outdated
5. Identify potential biases in training data

Output clear, structured Expected Findings that can be compared with actual research findings.`;

/**
 * Generate Expected Findings from training knowledge
 */
export const generateExpectedFindings = async (userPrompt, taskContext, options = {}) => {
  const gelResults = WISDOM_CHECK_CONFIG.enableGELCheck 
    ? await queryGELForExpectedKnowledge(userPrompt)
    : null;

  const prompt = `
    Generate Expected Findings for this research task based on training knowledge.
    
    Task: ${userPrompt}
    
    Context: ${JSON.stringify(taskContext)}
    
    ${gelResults ? `Prior verified knowledge from GEL:\n${JSON.stringify(gelResults.slice(0, 5), null, 2)}` : ''}
    
    Provide your Expected Findings as JSON:
    {
      "expectedFacts": [
        {
          "fact": "expected fact",
          "confidence": 0.0-1.0,
          "source": "training|GEL",
          "verifiable": true/false
        }
      ],
      "expectedRelationships": [
        {
          "relationship": "A relates to B",
          "type": "correlation|causation|influence",
          "confidence": 0.0-1.0
        }
      ],
      "expectedSources": [
        {
          "sourceType": "documentation|paper|API|...",
          "expectedContent": "what should be found",
          "reliability": "high|medium|low"
        }
      ],
      "commonPitfalls": [
        {
          "pitfall": "common misconception",
          "why": "explanation",
          "avoidance": "how to avoid"
        }
      ],
      "potentialBiases": [
        {
          "bias": "bias name",
          "affectedAreas": ["area 1"],
          "mitigation": "how to mitigate"
        }
      ],
      "knowledgeGaps": [
        {
          "gap": "area of uncertainty",
          "reason": "why unknown",
          "researchNeed": "what to research"
        }
      ],
      "staleAreas": [
        {
          "area": "topic",
          "stalenessRisk": "high|medium|low",
          "lastKnownUpdate": "approximate date"
        }
      ],
      "overallConfidence": 0.0-1.0
    }
  `;

  try {
    const response = await bytezClient.runInference(WISDOM_CHECK_CONFIG.model, {
      systemPrompt: WISDOM_CHECK_PROMPT,
      userPrompt: prompt,
      temperature: WISDOM_CHECK_CONFIG.temperature
    });

    let parsed = {};
    if (response?.output) {
      try {
        parsed = typeof response.output === 'string'
          ? JSON.parse(response.output)
          : response.output;
      } catch (e) {
        console.warn('Failed to parse Wisdom Check response');
      }
    }

    return {
      component: 'Internal Wisdom Check',
      timestamp: new Date().toISOString(),
      gelKnowledge: gelResults,
      ...parsed,
      metadata: {
        model: WISDOM_CHECK_CONFIG.model,
        temperature: WISDOM_CHECK_CONFIG.temperature,
        generatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      component: 'Internal Wisdom Check',
      error: error.message,
      expectedFacts: [],
      overallConfidence: 0
    };
  }
};

/**
 * Query GEL for prior verified knowledge
 */
const queryGELForExpectedKnowledge = async (prompt) => {
  try {
    const results = await queryGEL(prompt, {
      limit: 10,
      minCertainty: 0.7,
      status: 'verified'
    });
    return results;
  } catch (error) {
    console.warn('GEL query failed:', error);
    return [];
  }
};

/**
 * Perform delta analysis between expected and actual findings
 */
export const performDeltaAnalysis = (expectedFindings, actualFindings) => {
  const delta = {
    confirmed: [],
    contradicted: [],
    novel: [],
    missing: [],
    unexpected: [],
    summary: {
      confirmationRate: 0,
      noveltyRate: 0,
      contradictionRate: 0,
      overallDelta: 0
    }
  };

  const expectedFacts = expectedFindings?.expectedFacts || [];
  const actualPoints = actualFindings?.keyPoints || actualFindings?.findings || [];

  for (const expected of expectedFacts) {
    const matchFound = actualPoints.some(actual => 
      similarityScore(expected.fact, actual) > 0.7
    );

    if (matchFound) {
      delta.confirmed.push({
        expected: expected.fact,
        confidence: expected.confidence,
        matchType: 'confirmed'
      });
    } else {
      delta.missing.push({
        expected: expected.fact,
        confidence: expected.confidence,
        reason: 'not found in actual findings'
      });
    }
  }

  for (const actual of actualPoints) {
    const expectedFound = expectedFacts.some(expected => 
      similarityScore(expected.fact, actual) > 0.7
    );

    if (!expectedFound) {
      const contradicts = expectedFacts.some(expected => 
        isContradiction(expected.fact, actual)
      );

      if (contradicts) {
        delta.contradicted.push({
          expected: expectedFacts.find(e => isContradiction(e.fact, actual))?.fact,
          actual,
          type: 'contradiction'
        });
      } else {
        delta.novel.push({
          finding: actual,
          importance: 'new information'
        });
      }
    }
  }

  if (expectedFacts.length > 0) {
    delta.summary.confirmationRate = delta.confirmed.length / expectedFacts.length;
    delta.summary.contradictionRate = delta.contradicted.length / expectedFacts.length;
  }

  if (actualPoints.length > 0) {
    delta.summary.noveltyRate = delta.novel.length / actualPoints.length;
  }

  delta.summary.overallDelta = 
    (delta.summary.confirmationRate * 0.4) + 
    (delta.summary.noveltyRate * 0.4) - 
    (delta.summary.contradictionRate * 0.2);

  delta.summary.overallDelta = Math.max(0, Math.min(1, delta.summary.overallDelta));

  return delta;
};

/**
 * Calculate similarity score between two texts
 */
const similarityScore = (text1, text2) => {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
};

/**
 * Check if two statements contradict
 */
const isContradiction = (statement1, statement2) => {
  const contradictionMarkers = [
    'not', 'cannot', "doesn't", "won't", "isn't", 'never', 'impossible'
  ];
  
  const s1Lower = statement1.toLowerCase();
  const s2Lower = statement2.toLowerCase();
  
  const similarity = similarityScore(statement1, statement2);
  
  if (similarity < 0.3) return false;
  
  for (const marker of contradictionMarkers) {
    if ((s1Lower.includes(marker) && !s2Lower.includes(marker)) ||
        (!s1Lower.includes(marker) && s2Lower.includes(marker))) {
      if (similarity > 0.5) return true;
    }
  }
  
  return false;
};

/**
 * Quick wisdom check for validation
 */
export const quickWisdomCheck = async (question) => {
  const prompt = `
    What does training knowledge suggest about this question?
    
    Question: ${question}
    
    Provide JSON:
    {
      "expectedAnswer": "expected answer",
      "confidence": 0.0-1.0,
      "basis": "training|inference|guess",
      "caveats": ["potential issues"]
    }
  `;

  try {
    const response = await bytezClient.runInference(WISDOM_CHECK_CONFIG.model, {
      systemPrompt: 'You provide quick knowledge checks based on training data.',
      userPrompt: prompt,
      temperature: 0.2
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
      component: 'Internal Wisdom Check (Quick)',
      timestamp: new Date().toISOString(),
      ...parsed
    };
  } catch (error) {
    return {
      component: 'Internal Wisdom Check (Quick)',
      error: error.message,
      confidence: 0
    };
  }
};

export default {
  WISDOM_CHECK_CONFIG,
  generateExpectedFindings,
  performDeltaAnalysis,
  quickWisdomCheck
};