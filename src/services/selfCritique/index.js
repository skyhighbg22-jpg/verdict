/**
 * Self-Critique Personas Index
 * Exports all adversarial self-critique personas
 */

export { DEVIL_EDITOR_CONFIG, DEVIL_EDITOR_CRITERIA, runDevilsEditorCritique, quickDevilsEditorCheck } 
  from './devilsEditor.js';

export { HOSTILE_PEER_REVIEWER_CONFIG, HOSTILE_PEER_SYSTEM_PROMPT, REVIEW_DIMENSIONS, runHostilePeerReview, quickEvidenceCheck, challengeResearchClaim } 
  from './hostilePeerReviewer.js';

export { MALICIOUS_QA_CONFIG, MALICIOUS_QA_SYSTEM_PROMPT, ATTACK_SURFACES, runMaliciousQACritique, shouldActivateMaliciousQA, quickSecurityScan, testAttackVector } 
  from './malignantQA.js';

export const SELF_CRITIQUE_PERSONAS = {
  DEVILS_EDITOR: 'Devil\'s Editor',
  HOSTILE_PEER_REVIEWER: 'Hostile Peer Reviewer',
  MALICIOUS_QA: 'Malicious QA Engineer'
};

export const PERSONA_PHASE_MAPPING = {
  'Devil\'s Editor': 'Refining',
  'Hostile Peer Reviewer': 'Research',
  'Malicious QA Engineer': 'Implementation'
};
