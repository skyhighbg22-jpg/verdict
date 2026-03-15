/**
 * Skeleton Loader Component
 * Professional-looking loading states
 */

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Skeleton variants
 */
const skeletonVariants = {
  default: {
    backgroundColor: 'rgba(229, 231, 235, 0.6)',
    animate: {
      backgroundColor: [
        'rgba(229, 231, 235, 0.6)',
        'rgba(229, 231, 235, 0.3)',
        'rgba(229, 231, 235, 0.6)'
      ]
    }
  },
  glow: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    animate: {
      backgroundColor: [
        'rgba(59, 130, 246, 0.1)',
        'rgba(59, 130, 246, 0.2)',
        'rgba(59, 130, 246, 0.1)'
      ]
    }
  }
};

/**
 * Base Skeleton Component
 */
const Skeleton = ({ 
  className, 
  variant = 'default',
  width, 
  height,
  circle = false,
  duration = 1.5
}) => {
  const style = {
    width: width || '100%',
    height: height || '1rem',
    ...(circle && { borderRadius: '50%' })
  };

  return (
    <motion.div
      className={cn("rounded-md", className)}
      style={style}
      variants={skeletonVariants[variant]}
      animate="animate"
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  );
};

/**
 * Text Skeleton
 */
export const TextSkeleton = ({ lines = 3, className }) => {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          width={i === lines - 1 ? '70%' : '100%'} 
          height="0.875rem"
        />
      ))}
    </div>
  );
};

/**
 * Card Skeleton
 */
export const CardSkeleton = ({ className }) => {
  return (
    <div className={cn("bg-white rounded-xl p-6 border border-gray-100", className)}>
      <div className="flex items-center gap-3 mb-4">
        <Skeleton width="2.5rem" height="2.5rem" circle />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height="1rem" />
          <Skeleton width="40%" height="0.75rem" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton width="100%" height="0.5rem" />
        <Skeleton width="100%" height="0.5rem" />
        <Skeleton width="80%" height="0.5rem" />
      </div>
    </div>
  );
};

/**
 * Metrics Panel Skeleton
 */
export const MetricsPanelSkeleton = ({ className }) => {
  return (
    <div className={cn("bg-white rounded-xl p-6 border border-gray-100", className)}>
      <div className="flex items-center gap-2 mb-4">
        <Skeleton width="1.25rem" height="1.25rem" />
        <Skeleton width="30%" height="1.25rem" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between">
              <Skeleton width="40%" height="0.875rem" />
              <Skeleton width="15%" height="0.875rem" />
            </div>
            <Skeleton width="100%" height="0.375rem" />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Phase Stepper Skeleton
 */
export const PhaseStepperSkeleton = ({ className }) => {
  const phases = ['Refining', 'Planning', 'Research', 'Implementation', 'Close-Out'];
  
  return (
    <div className={cn("py-4 px-4", className)}>
      <div className="flex items-center justify-between relative">
        <Skeleton 
          className="absolute top-5 left-0 h-0.5" 
          width="100%" 
          height="2px" 
        />
        {phases.map((_, i) => (
          <div key={i} className="flex flex-col items-center relative z-10">
            <Skeleton width="2.5rem" height="2.5rem" circle />
            <Skeleton width="3rem" height="0.625rem" className="mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Loading Spinner
 */
export const LoadingSpinner = ({ size = 'md', className }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  return (
    <motion.div
      className={cn(
        "rounded-full border-2 border-gray-200 border-t-blue-600",
        sizeClasses[size],
        className
      )}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
  );
};

/**
 * Processing State Component
 */
export const ProcessingState = ({ 
  phase, 
  message = 'Processing...',
  progress,
  className 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "flex flex-col items-center justify-center p-8 bg-white rounded-xl",
        "border border-gray-100 shadow-sm",
        className
      )}
    >
      <LoadingSpinner size="lg" />
      <h4 className="mt-4 text-lg font-semibold text-gray-800">
        {phase ? `${phase} Phase` : 'Processing'}
      </h4>
      <p className="mt-1 text-sm text-gray-500">{message}</p>
      
      {progress !== undefined && (
        <div className="mt-4 w-48">
          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-600"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-400 text-center">{progress}%</p>
        </div>
      )}
    </motion.div>
  );
};

export default Skeleton;
