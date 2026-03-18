/**
 * GEL Schema Validation Service
 * Validates entries before ingestion into Global Epistemic Ledger
 * Prevents poison injections and ensures data quality
 */

export const GEL_SCHEMA_CONFIG = {
  enabled: true,
  strictMode: true,
  rejectOnFailure: false,
  maxEntryLength: 10000,
  requireFields: ['fact', 'certainty', 'source']
};

export const GEL_SCHEMA_TYPES = {
  FACTUAL: 'factual',
  CAUSAL: 'causal',
  PROCEDURAL: 'procedural',
  STRATEGIC: 'strategic'
};

export const VALIDATION_SEVERITY = {
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

const GEL_SCHEMA = {
  fact: {
    type: 'string',
    required: true,
    minLength: 3,
    maxLength: GEL_SCHEMA_CONFIG.maxEntryLength,
    pattern: /^[^<>"'{}`]+$/,
    sanitization: 'stripHtml'
  },
  certainty: {
    type: 'number',
    required: true,
    min: 0,
    max: 10
  },
  source: {
    type: 'string',
    required: true,
    minLength: 2,
    maxLength: 200
  },
  evidence: {
    type: 'array',
    required: false,
    items: {
      type: 'string',
      maxLength: 2000
    }
  },
  contradictingEvidence: {
    type: 'array',
    required: false,
    items: {
      type: 'string',
      maxLength: 2000
    }
  },
  epistemicStatus: {
    type: 'string',
    required: false,
    enum: ['verified', 'uncertain', 'disputed', 'unknown', 'pending']
  },
  strategyMemory: {
    type: 'string',
    required: false,
    maxLength: 5000
  },
  ttl: {
    type: 'number',
    required: false,
    min: 0,
    max: 31536000
  },
  metadata: {
    type: 'object',
    required: false,
    properties: {
      sessionId: { type: 'string' },
      phase: { type: 'string' },
      model: { type: 'string' },
      timestamp: { type: 'string' }
    }
  }
};

const INJECTION_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /\$\{.*?\}/g,
  /\{\{.*?\}\}/g,
  /<[^>]+>/g,
  /\$\(.*?\)/g,
  /`.*?`/g
];

const FORBIDDEN_PHRASES = [
  'ignore previous',
  'ignore all',
  'disregard instructions',
  'new instructions',
  'override',
  'bypass',
  'system prompt',
  'you are now',
  'forget everything',
  'pretend to be',
  'roleplay as',
  'dAN',
  'developer mode',
  'jailbreak',
  'prompt injection'
];

class GELSchemaValidator {
  constructor() {
    this.validationHistory = [];
    this.rejectedCount = 0;
    this.acceptedCount = 0;
  }

  validateEntry(entry) {
    const validations = [];
    let isValid = true;
    let sanitizedEntry = { ...entry };

    Object.keys(GEL_SCHEMA).forEach(field => {
      const schema = GEL_SCHEMA[field];
      const value = entry[field];

      if (schema.required && (value === undefined || value === null || value === '')) {
        validations.push({
          field,
          severity: VALIDATION_SEVERITY.ERROR,
          message: `Required field missing: ${field}`
        });
        isValid = false;
        return;
      }

      if (value !== undefined && value !== null) {
        const fieldValidation = this.validateField(field, value, schema);
        validations.push(...fieldValidation.errors);
        
        if (fieldValidation.errors.some(e => e.severity === VALIDATION_SEVERITY.ERROR)) {
          isValid = false;
        } else if (fieldValidation.sanitized !== undefined) {
          sanitizedEntry[field] = fieldValidation.sanitized;
        }
      }
    });

    if (entry.fact) {
      const injectionCheck = this.checkInjection(entry.fact);
      validations.push(...injectionCheck.errors);
      if (injectionCheck.errors.length > 0) {
        isValid = false;
        sanitizedEntry = null;
      }
    }

    const result = {
      isValid,
      sanitizedEntry,
      validations,
      timestamp: new Date().toISOString()
    };

    this.validationHistory.push(result);
    
    if (isValid) {
      this.acceptedCount++;
    } else {
      this.rejectedCount++;
      
      if (GEL_SCHEMA_CONFIG.strictMode && GEL_SCHEMA_CONFIG.rejectOnFailure) {
        throw new Error(`Validation failed: ${validations.map(v => v.message).join(', ')}`);
      }
    }

    if (this.validationHistory.length > 1000) {
      this.validationHistory = this.validationHistory.slice(-500);
    }

    return result;
  }

  validateField(field, value, schema) {
    const errors = [];
    let sanitized = value;

    switch (schema.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push({
            field,
            severity: VALIDATION_SEVERITY.ERROR,
            message: `Field ${field} must be a string`
          });
          break;
        }

        if (schema.minLength && value.length < schema.minLength) {
          errors.push({
            field,
            severity: VALIDATION_SEVERITY.ERROR,
            message: `Field ${field} must be at least ${schema.minLength} characters`
          });
        }

        if (schema.maxLength && value.length > schema.maxLength) {
          errors.push({
            field,
            severity: VALIDATION_SEVERITY.WARNING,
            message: `Field ${field} exceeds recommended length of ${schema.maxLength}`
          });
        }

        if (schema.pattern && !schema.pattern.test(value)) {
          errors.push({
            field,
            severity: VALIDATION_SEVERITY.ERROR,
            message: `Field ${field} contains invalid characters`
          });
        }

        if (schema.sanitization === 'stripHtml') {
          sanitized = this.sanitizeHtml(value);
        }
        break;

      case 'number':
        if (typeof value !== 'number') {
          errors.push({
            field,
            severity: VALIDATION_SEVERITY.ERROR,
            message: `Field ${field} must be a number`
          });
          break;
        }

        if (schema.min !== undefined && value < schema.min) {
          errors.push({
            field,
            severity: VALIDATION_SEVERITY.ERROR,
            message: `Field ${field} must be at least ${schema.min}`
          });
        }

        if (schema.max !== undefined && value > schema.max) {
          errors.push({
            field,
            severity: VALIDATION_SEVERITY.ERROR,
            message: `Field ${field} must be at most ${schema.max}`
          });
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          errors.push({
            field,
            severity: VALIDATION_SEVERITY.ERROR,
            message: `Field ${field} must be an array`
          });
          break;
        }

        if (schema.items) {
          value.forEach((item, index) => {
            const itemValidation = this.validateField(`${field}[${index}]`, item, schema.items);
            errors.push(...itemValidation.errors);
          });
        }
        break;

      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          errors.push({
            field,
            severity: VALIDATION_SEVERITY.ERROR,
            message: `Field ${field} must be an object`
          });
          break;
        }

        if (schema.properties) {
          Object.keys(schema.properties).forEach(prop => {
            const propSchema = schema.properties[prop];
            if (value[prop] !== undefined) {
              const propValidation = this.validateField(`${field}.${prop}`, value[prop], propSchema);
              errors.push(...propValidation.errors);
            }
          });
        }
        break;
    }

    if (schema.enum && !schema.enum.includes(value)) {
      errors.push({
        field,
        severity: VALIDATION_SEVERITY.ERROR,
        message: `Field ${field} must be one of: ${schema.enum.join(', ')}`
      });
    }

    return { errors, sanitized };
  }

  checkInjection(text) {
    const errors = [];

    INJECTION_PATTERNS.forEach(pattern => {
      if (pattern.test(text)) {
        errors.push({
          field: 'fact',
          severity: VALIDATION_SEVERITY.ERROR,
          message: `Potential injection pattern detected: ${pattern.source}`
        });
      }
    });

    const lowerText = text.toLowerCase();
    FORBIDDEN_PHRASES.forEach(phrase => {
      if (lowerText.includes(phrase)) {
        errors.push({
          field: 'fact',
          severity: VALIDATION_SEVERITY.ERROR,
          message: `Forbidden phrase detected: "${phrase}"`
        });
      }
    });

    return { errors };
  }

  sanitizeHtml(text) {
    let sanitized = text;
    
    INJECTION_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    return sanitized.trim();
  }

  validateBatch(entries) {
    const results = entries.map((entry, index) => ({
      index,
      result: this.validateEntry(entry)
    }));

    const summary = {
      total: entries.length,
      valid: results.filter(r => r.result.isValid).length,
      invalid: results.filter(r => !r.result.isValid).length,
      results
    };

    return summary;
  }

  getValidationStats() {
    return {
      total: this.acceptedCount + this.rejectedCount,
      accepted: this.acceptedCount,
      rejected: this.rejectedCount,
      rejectionRate: ((this.rejectedCount / (this.acceptedCount + this.rejectedCount)) * 100).toFixed(2)
    };
  }

  getRecentValidations(count = 10) {
    return this.validationHistory.slice(-count);
  }

  clearHistory() {
    this.validationHistory = [];
  }
}

export const gelSchemaValidator = new GELSchemaValidator();

export const validateGELEntry = (entry) => gelSchemaValidator.validateEntry(entry);
export const validateGELBatch = (entries) => gelSchemaValidator.validateBatch(entries);
export const getValidationStats = () => gelSchemaValidator.getValidationStats();

export default gelSchemaValidator;
