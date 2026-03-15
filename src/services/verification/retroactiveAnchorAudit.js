/**
 * Retroactive Anchor Audit
 * Checks each phase output against all prior anchors using Grok 4.2
 * Triggers Anchor Reconciliation on conflict
 */

import { bytezClient } from '../../api/bytezClient';
import { runReconciliation, ANCHOR_CONFIG } from './anchorReconciliation';
import { statePersistence } from '../state/statePersistence';

export const RETROACTIVE_AUDIT_CONFIG = {
  grokModel: 'grok-4.2',
  conflictThreshold: 0.3,
  severityLevels: ['low', 'medium', 'high', 'critical'],
  autoReconcileThreshold: 0.5,
  enableAutoReconciliation: true
};

const ANCHOR_AUDIT_PROMPT = `You are the Retroactive Anchor Audit - a verification component in VERDICT.
Your role is to check new phase outputs against all prior anchors to detect conflicts.

You are stateless - each call is independent.

Responsibilities:
1. Compare new output against all prior anchors
2. Detect logical inconsistencies
3. Find contradictions in stated facts
4. Identify scope or direction changes
5. Flag assumption violations
6. Calculate conflict severity

Audit each prior anchor systematically and report all conflicts.`;

/**
 * Run retroactive anchor audit
 */
export const runRetroactiveAnchorAudit = async (sessionId, currentPhase, currentOutput) => {
  const priorAnchors = await statePersistence.getAnchors(sessionId);
  
  if (!priorAnchors || priorAnchors.length === 0) {
    return {
      auditPassed: true,
      conflicts: [],
      message: 'No prior anchors to audit against',
      currentPhase,
      priorAnchorCount: 0
    };
  }

  const auditResults = {
    sessionId,
    currentPhase,
    currentOutput,
    priorAnchorCount: priorAnchors.length,
    audits: [],
    conflicts: [],
    warnings: [],
    auditPassed: true,
    timestamp: new Date().toISOString()
  };

  for (const anchor of priorAnchors) {
    const audit = await auditAgainstAnchor(currentPhase, currentOutput, anchor);
    auditResults.audits.push(audit);

    if (audit.hasConflict) {
      auditResults.conflicts.push({
        anchorVersion: anchor.version,
        anchorPhase: anchor.phase,
        conflictDetails: audit.conflictDetails,
        severity: audit.severity,
        resolution: audit.suggestedResolution
      });

      if (audit.severity === 'high' || audit.severity === 'critical') {
        auditResults.auditPassed = false;
      }
    }

    if (audit.hasWarning) {
      auditResults.warnings.push({
        anchorVersion: anchor.version,
        warningDetails: audit.warningDetails
      });
    }
  }

  if (!auditResults.auditPassed && RETROACTIVE_AUDIT_CONFIG.enableAutoReconciliation) {
    auditResults.reconciliationTriggered = true;
    auditResults.reconciliationResults = await triggerReconciliation(sessionId, auditResults.conflicts);
  }

  auditResults.summary = generateAuditSummary(auditResults);

  return auditResults;
};

/**
 * Audit current output against a single prior anchor
 */
const auditAgainstAnchor = async (currentPhase, currentOutput, priorAnchor) => {
  const prompt = `
    Audit this phase output against a prior anchor for conflicts.
    
    Current Phase: ${currentPhase}
    Current Output: ${JSON.stringify(currentOutput, null, 2)}
    
    Prior Anchor (${priorAnchor.phase} - ${priorAnchor.version}):
    ${JSON.stringify(priorAnchor.output, null, 2)}
    
    Check for:
    1. Logical contradictions
    2. Factual inconsistencies
    3. Scope changes
    4. Assumption violations
    5. Direction changes
    
    Provide audit result as JSON:
    {
      "hasConflict": boolean,
      "hasWarning": boolean,
      "conflictDetails": [
        {
          "type": "logical|factual|scope|assumption|direction",
          "description": "description of conflict",
          "currentStatement": "what current output says",
          "anchorStatement": "what anchor says",
          "severity": "low|medium|high|critical"
        }
      ],
      "warningDetails": [
        {
          "type": "warning type",
          "description": "description"
        }
      ],
      "severity": "low|medium|high|critical",
      "consistencyScore": 0.0-1.0,
      "suggestedResolution": "how to resolve the conflict"
    }
  `;

  try {
    const response = await bytezClient.runInference(RETROACTIVE_AUDIT_CONFIG.grokModel, {
      systemPrompt: ANCHOR_AUDIT_PROMPT,
      userPrompt: prompt,
      temperature: 0.3
    });

    let parsed = {};
    if (response?.output) {
      try {
        parsed = typeof response.output === 'string'
          ? JSON.parse(response.output)
          : response.output;
      } catch (e) {
        console.warn('Failed to parse anchor audit response');
      }
    }

    return {
      anchorVersion: priorAnchor.version,
      anchorPhase: priorAnchor.phase,
      ...parsed,
      auditedAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      anchorVersion: priorAnchor.version,
      anchorPhase: priorAnchor.phase,
      hasConflict: false,
      hasWarning: true,
      warningDetails: [{ type: 'audit_error', description: error.message }],
      error: error.message,
      auditedAt: new Date().toISOString()
    };
  }
};

/**
 * Trigger reconciliation for detected conflicts
 */
const triggerReconciliation = async (sessionId, conflicts) => {
  const highSeverityConflicts = conflicts.filter(
    c => c.severity === 'high' || c.severity === 'critical'
  );

  if (highSeverityConflicts.length === 0) {
    return {
      triggered: false,
      reason: 'No high-severity conflicts requiring reconciliation'
    };
  }

  const reconciliationResults = [];

  for (const conflict of highSeverityConflicts) {
    const result = await runReconciliation(sessionId, {
      discrepancies: [conflict]
    });
    reconciliationResults.push({
      conflict,
      result
    });
  }

  return {
    triggered: true,
    conflictsProcessed: reconciliationResults.length,
    results: reconciliationResults
  };
};

/**
 * Quick anchor consistency check
 */
export const quickAnchorConsistencyCheck = async (sessionId, newOutput) => {
  const anchors = await statePersistence.getAnchors(sessionId);
  
  if (!anchors || anchors.length === 0) {
    return { consistent: true, message: 'No prior anchors' };
  }

  const keyFields = ['decision', 'certainty', 'recommendations'];
  const inconsistencies = [];

  for (const anchor of anchors) {
    for (const field of keyFields) {
      if (newOutput[field] !== undefined && 
          anchor.output[field] !== undefined &&
          newOutput[field] !== anchor.output[field]) {
        inconsistencies.push({
          field,
          currentValue: newOutput[field],
          anchorValue: anchor.output[field],
          anchorVersion: anchor.version
        });
      }
    }
  }

  return {
    consistent: inconsistencies.length === 0,
    inconsistencies,
    anchorCount: anchors.length
  };
};

/**
 * Generate audit summary
 */
const generateAuditSummary = (auditResults) => {
  const summary = {
    totalAudits: auditResults.audits.length,
    totalConflicts: auditResults.conflicts.length,
    totalWarnings: auditResults.warnings.length,
    highSeverityConflicts: 0,
    criticalConflicts: 0,
    passed: auditResults.auditPassed
  };

  for (const conflict of auditResults.conflicts) {
    if (conflict.severity === 'high') summary.highSeverityConflicts++;
    if (conflict.severity === 'critical') summary.criticalConflicts++;
  }

  summary.recommendation = summary.criticalConflicts > 0
    ? 'CRITICAL: Anchor reconciliation required before proceeding'
    : summary.highSeverityConflicts > 0
      ? 'WARNING: Conflicts detected, review and reconcile'
      : 'PASSED: No critical anchor conflicts detected';

  return summary;
};

/**
 * Batch audit multiple phases
 */
export const batchAuditPhases = async (sessionId, phaseOutputs) => {
  const results = [];

  for (const { phase, output } of phaseOutputs) {
    const audit = await runRetroactiveAnchorAudit(sessionId, phase, output);
    results.push({
      phase,
      auditPassed: audit.auditPassed,
      conflictCount: audit.conflicts.length,
      summary: audit.summary
    });
  }

  return {
    sessionId,
    batchResults: results,
    allPassed: results.every(r => r.auditPassed),
    totalConflicts: results.reduce((sum, r) => sum + r.conflictCount, 0)
  };
};

export default {
  RETROACTIVE_AUDIT_CONFIG,
  runRetroactiveAnchorAudit,
  quickAnchorConsistencyCheck,
  batchAuditPhases
};