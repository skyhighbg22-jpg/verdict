/**
 * Human Approval Gate Component
 * Displays a modal/blocking UI when human approval is required
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle, XCircle, Clock, ChevronRight, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Approval Gate Types
 */
export const APPROVAL_TYPES = {
  TDS_ROUTING: 'tds_routing',
  GDE_DECOMPOSITION: 'gde_decomposition',
  ADVERSARIAL_REVIEW: 'adversarial_review',
  CAUSAL_VALIDATION: 'causal_validation',
  IMPLEMENTATION: 'implementation',
  FINAL_APPROVAL: 'final_approval'
};

/**
 * Approval Gate Reasons
 */
export const APPROVAL_REASONS = {
  [APPROVAL_TYPES.TDS_ROUTING]: {
    title: 'High-Risk TDS Routing',
    description: 'Task Difficulty Score indicates elevated risk factors',
    severity: 'high'
  },
  [APPROVAL_TYPES.GDE_DECOMPOSITION]: {
    title: 'Complex Goal Decomposition',
    description: 'The goal requires significant decomposition with potential issues',
    severity: 'medium'
  },
  [APPROVAL_TYPES.ADVERSARIAL_REVIEW]: {
    title: 'Adversarial Findings',
    description: 'Skeptic Agent found significant challenges to the hypothesis',
    severity: 'high'
  },
  [APPROVAL_TYPES.CAUSAL_VALIDATION]: {
    title: 'Causal Chain Concerns',
    description: 'The causal chain validation raised critical issues',
    severity: 'critical'
  },
  [APPROVAL_TYPES.IMPLEMENTATION]: {
    title: 'Implementation Approval',
    description: 'Ready to execute implementation with verified plan',
    severity: 'low'
  },
  [APPROVAL_TYPES.FINAL_APPROVAL]: {
    title: 'Final Pipeline Approval',
    description: 'Complete pipeline results require final confirmation',
    severity: 'medium'
  }
};

/**
 * Severity configurations
 */
const severityConfig = {
  critical: {
    icon: AlertTriangle,
    color: 'red',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconBg: 'bg-red-100',
    textColor: 'text-red-800',
    buttonColor: 'red'
  },
  high: {
    icon: AlertTriangle,
    color: 'orange',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    iconBg: 'bg-orange-100',
    textColor: 'text-orange-800',
    buttonColor: 'orange'
  },
  medium: {
    icon: Shield,
    color: 'yellow',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    iconBg: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    buttonColor: 'yellow'
  },
  low: {
    icon: CheckCircle,
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconBg: 'bg-green-100',
    textColor: 'text-green-800',
    buttonColor: 'green'
  }
};

/**
 * Main Approval Gate Component
 */
const ApprovalGate = ({ 
  isOpen, 
  onApprove, 
  onReject,
  onHold,
  approvalType,
  details = {},
  isLoading = false 
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);

  if (!isOpen) return null;

  const reason = APPROVAL_REASONS[approvalType] || {
    title: 'Approval Required',
    description: 'Human approval is required to proceed',
    severity: 'medium'
  };

  const config = severityConfig[reason.severity] || severityConfig.medium;
  const IconComponent = config.icon;

  const handleAction = (action) => {
    setSelectedAction(action);
    if (action === 'approve') {
      onApprove?.();
    } else if (action === 'reject') {
      onReject?.();
    } else if (action === 'hold') {
      onHold?.();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {}}
          />
          
          {/* Modal */}
          <motion.div 
            className={cn(
              "relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            )}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Header */}
            <motion.div 
              className={cn("p-6 border-b", config.bgColor, config.borderColor)}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-4">
                <motion.div 
                  className={cn("p-3 rounded-xl", config.iconBg)}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, delay: 0.2 }}
                >
                  <IconComponent className={cn("w-6 h-6", `text-${config.color}-600`)} />
                </motion.div>
                <div className="flex-1">
                  <h3 className={cn("text-xl font-bold", config.textColor)}>{reason.title}</h3>
                  <p className="text-sm opacity-80 mt-1">{reason.description}</p>
                </div>
              </div>
            </motion.div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Details Section */}
              {Object.keys(details).length > 0 && (
                <div>
                  <button 
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                  >
                    <Info size={16} />
                    {showDetails ? 'Hide' : 'View'} Details
                    <motion.span
                      animate={{ rotate: showDetails ? 90 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronRight size={16} />
                    </motion.span>
                  </button>
                  
                  <AnimatePresence>
                    {showDetails && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-3 overflow-hidden"
                      >
                        <div className="p-4 bg-gray-50 rounded-xl text-sm font-mono max-h-48 overflow-y-auto">
                          {Object.entries(details).map(([key, value]) => (
                            <div key={key} className="mb-2">
                              <span className="text-gray-500">{key}:</span>{' '}
                              <span className="text-gray-900">
                                {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Risk Indicators */}
              {details.highRiskIndicators && details.highRiskIndicators.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-700">Risk Indicators:</h4>
                  <div className="flex flex-wrap gap-2">
                    {details.highRiskIndicators.map((indicator, idx) => (
                      <motion.span 
                        key={idx}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        className="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full"
                      >
                        {indicator}
                      </motion.span>
                    ))}
                  </div>
                </div>
              )}

              {/* Loading State */}
              {isLoading && (
                <motion.div 
                  className="flex items-center justify-center py-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                  <span className="ml-3 text-gray-600">Processing...</span>
                </motion.div>
              )}
            </div>

            {/* Actions */}
            <motion.div 
              className="p-6 border-t border-gray-100 bg-gray-50"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex gap-3">
                <motion.button
                  onClick={() => handleAction('reject')}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <XCircle size={18} />
                  Reject
                </motion.button>
                
                <motion.button
                  onClick={() => handleAction('hold')}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Clock size={18} />
                  Hold
                </motion.button>
                
                <motion.button
                  onClick={() => handleAction('approve')}
                  disabled={isLoading}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl font-semibold transition-colors disabled:opacity-50",
                    `bg-${config.buttonColor}-600 hover:bg-${config.buttonColor}-700`
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <CheckCircle size={18} />
                  Approve
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/**
 * Inline Approval Banner (non-blocking)
 */
export const ApprovalBanner = ({ 
  approvalType, 
  onProceed, 
  onCancel,
  children 
}) => {
  const reason = APPROVAL_REASONS[approvalType] || {
    title: 'Approval Required',
    description: 'Human approval is required',
    severity: 'medium'
  };

  const config = severityConfig[reason.severity] || severityConfig.medium;
  const IconComponent = config.icon;

  return (
    <motion.div 
      className={cn("rounded-xl border p-4 mb-4", config.bgColor, config.borderColor)}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg", config.iconBg)}>
          <IconComponent className={cn("w-5 h-5", `text-${config.color}-600`)} />
        </div>
        <div className="flex-1">
          <h4 className={cn("font-semibold", config.textColor)}>{reason.title}</h4>
          <p className="text-sm opacity-80 mt-1">{reason.description}</p>
          {children && <div className="mt-3">{children}</div>}
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-white/50 rounded-lg"
            >
              Cancel
            </button>
          )}
          {onProceed && (
            <button
              onClick={onProceed}
              className={cn(
                "px-4 py-1.5 text-sm font-medium text-white rounded-lg",
                `bg-${config.buttonColor}-600 hover:bg-${config.buttonColor}-700`
              )}
            >
              Proceed
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ApprovalGate;
