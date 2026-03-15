/**
 * AIDefence - Security Layer
 * Prompt injection protection, input validation, path traversal and command injection blocking
 * From RuFlo - always on security
 */

export const AIDEFENCE_CONFIG = {
  enabled: true,
  strictMode: true,
  logViolations: true,
  maxInputLength: 100000,
  maxPromptDepth: 10,
  blockPatterns: [
    'prompt_injection',
    'path_traversal',
    'command_injection',
    'xss',
    'sql_injection'
  ]
};

export const VIOLATION_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

export const VIOLATION_TYPES = {
  PROMPT_INJECTION: 'prompt_injection',
  PATH_TRAVERSAL: 'path_traversal',
  COMMAND_INJECTION: 'command_injection',
  XSS: 'xss',
  SQL_INJECTION: 'sql_injection',
  EXCESSIVE_LENGTH: 'excessive_length',
  NESTED_PROMPT: 'nested_prompt',
  ENCODED_PAYLOAD: 'encoded_payload',
  UNAUTHORIZED_ACCESS: 'unauthorized_access'
};

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions?/i,
  /forget\s+(all\s+)?(previous\s+)?(instructions?|context)/i,
  /disregard\s+(all\s+)?(previous\s+)?instructions?/i,
  /you\s+are\s+now\s+a?\s*/i,
  /pretend\s+(to\s+be|you('re|are))/i,
  /act\s+as\s+(if\s+you\s+are|a)/i,
  /simulate\s+(being|a)\s*/i,
  /roleplay\s+as/i,
  /<\|.*?\|>/,
  /\[SYSTEM\]/i,
  /\[INST\]/i,
  /\[\/INST\]/i,
  /\<\<.*?\>\>/,
  /your\s+new\s+instructions?/i,
  /override\s+(your\s+)?instructions?/i,
  /bypass\s+(your\s+)?instructions?/i,
  /jailbreak/i,
  /developer\s+mode/i,
  /debug\s+mode/i,
  /admin\s+mode/i,
  /verbose\s+mode/i,
  /reveal\s+(your\s+)?(instructions?|prompt|system)/i,
  /print\s+(your\s+)?(instructions?|prompt|system)/i,
  /show\s+(me\s+)?(your\s+)?(instructions?|prompt|system)/i,
  /what\s+(are\s+|is\s+)?your\s+instructions?/i,
  /output\s+(your\s+)?(instructions|prompt|system|all)/i
];

const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//,
  /\.\.\\/,
  /\.\.%2[fF]/,
  /\.\.%5[cC]/,
  /%2[eE]%2[eE]%2[fF]/,
  /%2[eE]%2[eE]%5[cC]/,
  /\/etc\/passwd/i,
  /\/etc\/shadow/i,
  /\/var\/log/i,
  /c:\\windows/i,
  /c:\\program files/i,
  /~\/.*?\.\./,
  /\.\.\/\.\.\/\.\.\/\.\./
];

const COMMAND_INJECTION_PATTERNS = [
  /;\s*(rm|del|format|shutdown|reboot|init|exec)/i,
  /\|\s*(rm|del|format|shutdown|reboot)/i,
  /\$\([^)]+\)/,
  /`[^`]+`/,
  /\|\|.*?\|\|/,
  /&&.*?&&/,
  />\s*\/dev\/null/,
  /<\s*\/dev\/null/,
  /;\s*cat\s+/i,
  /;\s*ls\s+/i,
  /;\s*pwd\s*;/i,
  /;\s*echo\s+/i,
  /;\s*eval\s+/i,
  /;\s*exec\s+/i
];

const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/i,
  /javascript\s*:/i,
  /on\w+\s*=/i,
  /<img[^>]+onerror/i,
  /<svg[^>]+onload/i,
  /<body[^>]+onload/i,
  /<iframe/i,
  /<embed/i,
  /<object/i,
  /expression\s*\(/i,
  /vbscript\s*:/i,
  /data\s*:[^,]*base64/i
];

const SQL_INJECTION_PATTERNS = [
  /'\s*(or|and)\s+['"]?\d+['"]?\s*=\s*['"]?\d+/i,
  /'\s*(or|and)\s+['"]?[a-z]+['"]?\s*=\s*['"]?[a-z]+/i,
  /union\s+(all\s+)?select/i,
  /;\s*drop\s+/i,
  /;\s*delete\s+from/i,
  /;\s*insert\s+into/i,
  /;\s*update\s+\w+\s+set/i,
  /--\s*$/,
  /\/\*.*?\*\//s,
  /'\s*;\s*--/,
  /1\s*=\s*1/,
  /'\s*=\s*'/
];

const ENCODED_PAYLOAD_PATTERNS = [
  /%[0-9a-fA-F]{2}%[0-9a-fA-F]{2}%[0-9a-fA-F]{2}/,
  /\\x[0-9a-fA-F]{2}\\x[0-9a-fA-F]{2}/,
  /\\u[0-9a-fA-F]{4}/,
  /base64[a-zA-Z0-9+\/=]+/i,
  /[a-zA-Z0-9+\/=]{20,}={0,2}$/
];

/**
 * Main AIDefence validation function
 */
export const validateInput = (input, context = {}) => {
  if (!AIDEFENCE_CONFIG.enabled) {
    return { valid: true, violations: [] };
  }

  const violations = [];

  if (typeof input !== 'string') {
    input = JSON.stringify(input);
  }

  if (input.length > AIDEFENCE_CONFIG.maxInputLength) {
    violations.push({
      type: VIOLATION_TYPES.EXCESSIVE_LENGTH,
      severity: VIOLATION_SEVERITY.MEDIUM,
      message: `Input exceeds maximum length of ${AIDEFENCE_CONFIG.maxInputLength}`,
      length: input.length
    });
  }

  violations.push(...checkPatterns(PROMPT_INJECTION_PATTERNS, input, VIOLATION_TYPES.PROMPT_INJECTION));
  violations.push(...checkPatterns(PATH_TRAVERSAL_PATTERNS, input, VIOLATION_TYPES.PATH_TRAVERSAL));
  violations.push(...checkPatterns(COMMAND_INJECTION_PATTERNS, input, VIOLATION_TYPES.COMMAND_INJECTION));
  violations.push(...checkPatterns(XSS_PATTERNS, input, VIOLATION_TYPES.XSS));
  violations.push(...checkPatterns(SQL_INJECTION_PATTERNS, input, VIOLATION_TYPES.SQL_INJECTION));
  violations.push(...checkPatterns(ENCODED_PAYLOAD_PATTERNS, input, VIOLATION_TYPES.ENCODED_PAYLOAD));

  violations.push(...checkNestedPrompts(input));
  violations.push(...checkSuspiciousKeywords(input));

  const severityScores = {
    [VIOLATION_SEVERITY.LOW]: 1,
    [VIOLATION_SEVERITY.MEDIUM]: 3,
    [VIOLATION_SEVERITY.HIGH]: 5,
    [VIOLATION_SEVERITY.CRITICAL]: 10
  };

  const totalSeverity = violations.reduce((sum, v) => sum + (severityScores[v.severity] || 1), 0);

  const isValid = AIDEFENCE_CONFIG.strictMode 
    ? violations.length === 0
    : totalSeverity < 15;

  if (AIDEFENCE_CONFIG.logViolations && violations.length > 0) {
    logViolations(violations, context);
  }

  return {
    valid: isValid,
    violations,
    severity: violations.length > 0 
      ? violations.reduce((max, v) => severityScores[v.severity] > severityScores[max] ? v.severity : max, VIOLATION_SEVERITY.LOW)
      : null
  };
};

/**
 * Check patterns in input
 */
const checkPatterns = (patterns, input, type) => {
  const violations = [];

  for (const pattern of patterns) {
    if (pattern.test(input)) {
      violations.push({
        type,
        severity: getSeverityForType(type),
        message: `Detected ${type} pattern: ${pattern.source.substring(0, 50)}...`,
        pattern: pattern.source
      });
    }
  }

  return violations;
};

/**
 * Get severity for violation type
 */
const getSeverityForType = (type) => {
  const severityMap = {
    [VIOLATION_TYPES.PROMPT_INJECTION]: VIOLATION_SEVERITY.CRITICAL,
    [VIOLATION_TYPES.PATH_TRAVERSAL]: VIOLATION_SEVERITY.HIGH,
    [VIOLATION_TYPES.COMMAND_INJECTION]: VIOLATION_SEVERITY.CRITICAL,
    [VIOLATION_TYPES.XSS]: VIOLATION_SEVERITY.HIGH,
    [VIOLATION_TYPES.SQL_INJECTION]: VIOLATION_SEVERITY.HIGH,
    [VIOLATION_TYPES.EXCESSIVE_LENGTH]: VIOLATION_SEVERITY.MEDIUM,
    [VIOLATION_TYPES.NESTED_PROMPT]: VIOLATION_SEVERITY.HIGH,
    [VIOLATION_TYPES.ENCODED_PAYLOAD]: VIOLATION_SEVERITY.MEDIUM,
    [VIOLATION_TYPES.UNAUTHORIZED_ACCESS]: VIOLATION_SEVERITY.CRITICAL
  };

  return severityMap[type] || VIOLATION_SEVERITY.MEDIUM;
};

/**
 * Check for nested prompts
 */
const checkNestedPrompts = (input) => {
  const violations = [];
  const nestedPromptCount = (input.match(/(?:prompt|instruction|system|context)\s*:/gi) || []).length;

  if (nestedPromptCount > AIDEFENCE_CONFIG.maxPromptDepth) {
    violations.push({
      type: VIOLATION_TYPES.NESTED_PROMPT,
      severity: VIOLATION_SEVERITY.HIGH,
      message: `Excessive nested prompt markers: ${nestedPromptCount} found (max: ${AIDEFENCE_CONFIG.maxPromptDepth})`,
      count: nestedPromptCount
    });
  }

  return violations;
};

/**
 * Check for suspicious keywords
 */
const checkSuspiciousKeywords = (input) => {
  const violations = [];
  const suspiciousKeywords = [
    'system_prompt', 'hidden_instruction', 'secret_key', 'api_key',
    'password', 'token', 'credential', 'private_key', 'auth_token'
  ];

  const lowerInput = input.toLowerCase();
  for (const keyword of suspiciousKeywords) {
    if (lowerInput.includes(keyword)) {
      violations.push({
        type: VIOLATION_TYPES.UNAUTHORIZED_ACCESS,
        severity: VIOLATION_SEVERITY.MEDIUM,
        message: `Suspicious keyword detected: ${keyword}`,
        keyword
      });
    }
  }

  return violations;
};

/**
 * Log violations
 */
const logViolations = (violations, context) => {
  console.warn('[AIDefence] Security violations detected:', {
    count: violations.length,
    types: violations.map(v => v.type),
    severities: violations.map(v => v.severity),
    context: context.sessionId || 'unknown',
    timestamp: new Date().toISOString()
  });
};

/**
 * Sanitize input by removing/escaping dangerous content
 */
export const sanitizeInput = (input, options = {}) => {
  const {
    removeScripts = true,
    removeHtml = false,
    escapeQuotes = true,
    maxLength = AIDEFENCE_CONFIG.maxInputLength
  } = options;

  let sanitized = typeof input === 'string' ? input : JSON.stringify(input);

  if (removeScripts) {
    sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gis, '');
    sanitized = sanitized.replace(/javascript\s*:/gi, 'blocked:');
    sanitized = sanitized.replace(/on\w+\s*=/gi, 'data-blocked=');
  }

  if (removeHtml) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }

  if (escapeQuotes) {
    sanitized = sanitized.replace(/'/g, "\\'");
    sanitized = sanitized.replace(/"/g, '\\"');
  }

  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
};

/**
 * Validate GEL schema
 */
export const validateGELSchema = (entry) => {
  const violations = [];

  if (!entry.fact || typeof entry.fact !== 'string') {
    violations.push({
      type: 'schema_violation',
      severity: VIOLATION_SEVERITY.HIGH,
      message: 'GEL entry must have a valid fact string'
    });
  }

  if (entry.fact && entry.fact.length > 10000) {
    violations.push({
      type: 'schema_violation',
      severity: VIOLATION_SEVERITY.MEDIUM,
      message: 'GEL fact exceeds maximum length'
    });
  }

  if (entry.certainty !== undefined && (entry.certainty < 0 || entry.certainty > 1)) {
    violations.push({
      type: 'schema_violation',
      severity: VIOLATION_SEVERITY.MEDIUM,
      message: 'GEL certainty must be between 0 and 1'
    });
  }

  const inputValidation = validateInput(entry.fact);
  violations.push(...inputValidation.violations);

  return {
    valid: violations.length === 0,
    violations
  };
};

/**
 * Block raw text injections
 */
export const blockRawInjections = (text) => {
  const validation = validateInput(text);
  
  if (!validation.valid) {
    return {
      blocked: true,
      reason: 'Blocked due to security violations',
      violations: validation.violations
    };
  }

  return {
    blocked: false,
    sanitized: sanitizeInput(text)
  };
};

/**
 * Create security middleware for requests
 */
export const createSecurityMiddleware = () => {
  return (req, res, next) => {
    const input = req.body?.prompt || req.body?.input || req.body?.query || '';
    const validation = validateInput(input);

    if (!validation.valid) {
      return res.status(400).json({
        error: 'Security violation detected',
        violations: validation.violations.map(v => v.type)
      });
    }

    req.sanitizedInput = sanitizeInput(input);
    next();
  };
};

/**
 * Get defense statistics
 */
export const getDefenceStats = () => {
  return {
    enabled: AIDEFENCE_CONFIG.enabled,
    strictMode: AIDEFENCE_CONFIG.strictMode,
    maxInputLength: AIDEFENCE_CONFIG.maxInputLength,
    patternsLoaded: {
      promptInjection: PROMPT_INJECTION_PATTERNS.length,
      pathTraversal: PATH_TRAVERSAL_PATTERNS.length,
      commandInjection: COMMAND_INJECTION_PATTERNS.length,
      xss: XSS_PATTERNS.length,
      sqlInjection: SQL_INJECTION_PATTERNS.length,
      encodedPayload: ENCODED_PAYLOAD_PATTERNS.length
    }
  };
};

export default {
  AIDEFENCE_CONFIG,
  VIOLATION_SEVERITY,
  VIOLATION_TYPES,
  validateInput,
  sanitizeInput,
  validateGELSchema,
  blockRawInjections,
  createSecurityMiddleware,
  getDefenceStats
};