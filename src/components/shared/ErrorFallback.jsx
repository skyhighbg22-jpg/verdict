/**
 * Error Fallback Component
 * Handles global and local error states gracefully
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RefreshCw, XCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Error severity levels
 */
export const ERROR_SEVERITY = {
  RECOVERABLE: 'recoverable',
  CRITICAL: 'critical',
  WARNING: 'warning'
};

/**
 * Error Fallback Component
 */
const ErrorFallback = ({ 
  error, 
  title,
  message,
  severity = ERROR_SEVERITY.RECOVERABLE,
  onRetry,
  onReset,
  onDismiss,
  showDetails = false
}) => {
  const [showDetailsState, setShowDetailsState] = useState(showDetails);

  const getSeverityConfig = () => {
    switch (severity) {
      case ERROR_SEVERITY.CRITICAL:
        return {
          icon: XCircle,
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          borderColor: 'border-red-200',
          bgColor: 'bg-red-50',
          titleColor: 'text-red-900',
          textColor: 'text-red-700',
          buttonPrimary: 'bg-red-600 hover:bg-red-700',
          buttonSecondary: 'border-red-200 text-red-700 hover:bg-red-100'
        };
      case ERROR_SEVERITY.WARNING:
        return {
          icon: AlertTriangle,
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          borderColor: 'border-yellow-200',
          bgColor: 'bg-yellow-50',
          titleColor: 'text-yellow-900',
          textColor: 'text-yellow-700',
          buttonPrimary: 'bg-yellow-600 hover:bg-yellow-700',
          buttonSecondary: 'border-yellow-200 text-yellow-700 hover:bg-yellow-100'
        };
      default:
        return {
          icon: AlertTriangle,
          iconBg: 'bg-orange-100',
          iconColor: 'text-orange-600',
          borderColor: 'border-orange-200',
          bgColor: 'bg-orange-50',
          titleColor: 'text-orange-900',
          textColor: 'text-orange-700',
          buttonPrimary: 'bg-orange-600 hover:bg-orange-700',
          buttonSecondary: 'border-orange-200 text-orange-700 hover:bg-orange-100'
        };
    }
  };

  const config = getSeverityConfig();
  const IconComponent = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-xl border p-6 max-w-lg mx-auto",
        config.bgColor,
        config.borderColor
      )}
    >
      <div className="flex items-start gap-4">
        <div className={cn("p-2 rounded-lg flex-shrink-0", config.iconBg)}>
          <IconComponent className={cn("w-5 h-5", config.iconColor)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className={cn("font-bold text-lg", config.titleColor)}>
            {title || 'Something went wrong'}
          </h4>
          <p className={cn("mt-1 text-sm", config.textColor)}>
            {message || error?.message || 'An unexpected error occurred'}
          </p>
          
          {/* Error Details */}
          {(error?.stack || showDetailsState) && (
            <div className="mt-3">
              <button
                onClick={() => setShowDetailsState(!showDetailsState)}
                className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  config.textColor,
                  "hover:opacity-80"
                )}
              >
                <Info size={14} />
                {showDetailsState ? 'Hide' : 'Show'} details
                {showDetailsState ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              
              <AnimatePresence>
                {showDetailsState && error?.stack && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-2 overflow-hidden"
                  >
                    <pre className={cn(
                      "p-3 rounded-lg text-xs font-mono overflow-x-auto",
                      "bg-white/50 border border-black/5",
                      config.textColor
                    )}>
                      {error.stack}
                    </pre>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-3 mt-4">
            {onRetry && (
              <button
                onClick={onRetry}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors",
                  config.buttonPrimary
                )}
              >
                <RefreshCw size={16} />
                Try Again
              </button>
            )}
            
            {onReset && (
              <button
                onClick={onReset}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors",
                  config.buttonSecondary
                )}
              >
                <XCircle size={16} />
                Reset Pipeline
              </button>
            )}
            
            {onDismiss && (
              <button
                onClick={onDismiss}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-200/50 transition-colors"
                )}
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Inline Error Banner
 */
export const ErrorBanner = ({
  error,
  onRetry,
  onDismiss,
  className
}) => {
  if (!error) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg border bg-red-50 border-red-200",
        className
      )}
    >
      <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
      <p className="flex-1 text-sm text-red-700 font-medium">
        {error}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="p-1.5 rounded hover:bg-red-100 text-red-600 transition-colors"
        >
          <RefreshCw size={16} />
        </button>
      )}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1.5 rounded hover:bg-red-100 text-red-600 transition-colors"
        >
          <XCircle size={16} />
        </button>
      )}
    </motion.div>
  );
};

export default ErrorFallback;
