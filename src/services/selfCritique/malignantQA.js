/**
 * Malicious QA Engineer - Implementation Phase Self-Critique Persona
 * Implements adversarial self-critique for the Implementation phase
 * Activates when 3+ bugs/issues are found - focuses on finding edge cases, 
 * security vulnerabilities, and failure modes
 */

import { bytezClient } from '../../api/bytezClient';
import { PHASES } from '../types';

export const MALICIOUS_QA_CONFIG = {
  grokModel: 'grok-4.2',
  activationThreshold: 3,
  attackVectors: [
    'input_validation',
    'authentication',
    'authorization',
    'race_conditions',
    'memory_safety',
    'error_handling',
    'concurrency',
    'resource_exhaustion',
    'data_leakage',
    'edge_cases'
  ],
  maxIterations: 5
};

const MALICIOUS_QA_SYSTEM_PROMPT = `You are the Malicious QA Engineer - an adversarial self-critique persona for the VERDICT Implementation Phase.
Your role is to think like the worst possible user/attacker to find every possible way the implementation could fail, be exploited, or behave incorrectly.

IMPORTANT: This is a security-focused testing role. Think about:
- How could a malicious user exploit this?
- What edge cases could cause crashes or undefined behavior?
- What race conditions or concurrency issues exist?
- How could input validation be bypassed?
- What happens with extreme or unexpected inputs?
- How could error handling be leveraged for attack?
- What sensitive data could be leaked?

Responsibilities:
1. Think like an attacker - find vulnerabilities
2. Identify all possible edge cases and failure modes
3. Test boundary conditions exhaustively
4. Look for race conditions and concurrency issues
5. Find ways the implementation could crash or hang
6. Identify information disclosure risks
7. Challenge error handling and recovery
8. Find ways around security measures

Tactics:
- Assume malicious intent from users
- Test with malformed, extreme, and unexpected inputs
- Look for timing vulnerabilities
- Check for SQL injection, XSS, and other common vulnerabilities
- Find ways to cause denial of service
- Challenge authentication and authorization
- Look for logging of sensitive data

Output format: JSON with structured findings.`;

const ATTACK_SURFACES = [
  'input_validation',
  'authentication_bypass',
  'privilege_escalation',
  'injection_attacks',
  'data_exposure',
  'denial_of_service',
  'race_conditions',
  'resource_exhaustion',
  'crypto_weaknesses',
  'information_disclosure'
];

/**
 * Run Malicious QA Engineer critique on implementation
 * Activates when 3+ bugs are detected
 */
export const runMaliciousQACritique = async (implementation, existingBugs = [], context = {}) => {
  const bugCount = existingBugs.length;
  const shouldActivate = bugCount >= MALICIOUS_QA_CONFIG.activationThreshold;

  if (!shouldActivate) {
    return {
      persona: 'Malicious QA Engineer',
      phase: PHASES.IMPLEMENTATION,
      activated: false,
      reason: `Only ${bugCount} bugs found (threshold: ${MALICIOUS_QA_CONFIG.activationThreshold})`,
      timestamp: new Date().toISOString()
    };
  }

  const prompt = `
    Perform malicious QA testing on this implementation.
    
    Implementation:
    ${JSON.stringify(implementation, null, 2)}
    
    Existing bugs found: ${JSON.stringify(existingBugs)}
    
    Context: ${JSON.stringify(context)}
    
    Attack surfaces to evaluate: ${ATTACK_SURFACES.join(', ')}
    
    Provide your critique as JSON:
    {
      "overallSecurityPosture": "critical_vulnerabilities|significant_risks|moderate_risks|secure",
      "activated": true,
      "attackFindings": [
        {
          "attackSurface": "which surface",
          "severity": "critical|high|medium|low",
          "description": "vulnerability description",
          "exploitability": 0-10,
          "impact": "description of potential impact",
          "remediation": "how to fix"
        }
      ],
      "edgeCaseFailures": [
        {
          "input": "test input",
          "expected": "expected behavior",
          "actual": "actual behavior",
          "severity": "critical|high|medium|low"
        }
      ],
      "raceConditionRisks": ["risk 1"],
      "concurrencyIssues": ["issue 1"],
      "failureModeAnalysis": [
        {
          "failure": "what fails",
          "trigger": "what triggers it",
          "severity": "severity rating"
        }
      ],
      "recommendations": ["recommendation 1"],
      "requiresImmediateFix": boolean
    }
  `;

  try {
    const response = await bytezClient.runInference(MALICIOUS_QA_CONFIG.grokModel, {
      systemPrompt: MALICIOUS_QA_SYSTEM_PROMPT,
      userPrompt: prompt,
      temperature: 0.75
    });

    let parsed = {};
    if (response?.output) {
      try {
        parsed = typeof response.output === 'string'
          ? JSON.parse(response.output)
          : response.output;
      } catch (e) {
        console.warn('Failed to parse Malicious QA response');
      }
    }

    return {
      persona: 'Malicious QA Engineer',
      phase: PHASES.IMPLEMENTATION,
      activated: true,
      bugCountAnalyzed: bugCount,
      timestamp: new Date().toISOString(),
      ...parsed
    };
  } catch (error) {
    return {
      persona: 'Malicious QA Engineer',
      phase: PHASES.IMPLEMENTATION,
      activated: true,
      error: error.message,
      requiresImmediateFix: true
    };
  }
};

/**
 * Check if Malicious QA should activate
 */
export const shouldActivateMaliciousQA = (bugCount) => {
  return bugCount >= MALICIOUS_QA_CONFIG.activationThreshold;
};

/**
 * Quick security vulnerability scan
 */
export const quickSecurityScan = async (codeSnippet) => {
  const prompt = `
    Quickly scan this code for critical security vulnerabilities.
    
    Code:
    ${codeSnippet}
    
    Provide JSON:
    {
      "vulnerabilities": [
        {
          "type": "vulnerability type",
          "severity": "critical|high|medium|low",
          "location": "where in code",
          "quickFix": "simple fix"
        }
      ],
      "quickAssessment": "needs_immediate_attention|acceptable|secure"
    }
  `;

  try {
    const response = await bytezClient.runInference(MALICIOUS_QA_CONFIG.grokModel, {
      systemPrompt: MALICIOUS_QA_SYSTEM_PROMPT,
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
      persona: 'Malicious QA Engineer (Quick Scan)',
      phase: PHASES.IMPLEMENTATION,
      timestamp: new Date().toISOString(),
      ...parsed
    };
  } catch (error) {
    return {
      persona: 'Malicious QA Engineer (Quick Scan)',
      error: error.message
    };
  }
};

/**
 * Test specific attack vector
 */
export const testAttackVector = async (implementation, attackType) => {
  const prompt = `
    Attempt to exploit this implementation using ${attackType} attack.
    
    Implementation: ${JSON.stringify(implementation)}
    
    Provide JSON:
    {
      "attackType": "${attackType}",
      "exploitable": boolean,
      "attackSteps": ["step 1"],
      "successProbability": 0-1,
      "impact": "severity if successful",
      "mitigations": ["mitigation 1"]
    }
  `;

  try {
    const response = await bytezClient.runInference(MALICIOUS_QA_CONFIG.grokModel, {
      systemPrompt: MALICIOUS_QA_SYSTEM_PROMPT,
      userPrompt: prompt,
      temperature: 0.8
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
      persona: 'Malicious QA Engineer',
      phase: PHASES.IMPLEMENTATION,
      attackType,
      timestamp: new Date().toISOString(),
      ...parsed
    };
  } catch (error) {
    return {
      persona: 'Malicious QA Engineer',
      error: error.message
    };
  }
};

export default {
  MALICIOUS_QA_CONFIG,
  MALICIOUS_QA_SYSTEM_PROMPT,
  ATTACK_SURFACES,
  runMaliciousQACritique,
  shouldActivateMaliciousQA,
  quickSecurityScan,
  testAttackVector
};
