import React from 'react';
import { motion } from 'framer-motion';
import { usePipeline, PHASES } from '../../context/PipelineContext';
import { Check } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const phases = Object.values(PHASES);

const PhaseStepper = () => {
  const { activePhase, setActivePhase } = usePipeline();

  const activeIndex = phases.indexOf(activePhase);

  return (
    <div className="w-full py-4 px-4">
      <div className="flex items-center justify-between relative">
        {/* Background Line */}
        <div className="absolute top-5 left-0 w-full h-0.5 bg-gray-200 -z-0" />
        
        {/* Active Progress Line */}
        <motion.div 
          className="absolute top-5 left-0 h-0.5 bg-blue-600 -z-0" 
          initial={{ width: 0 }}
          animate={{ width: `${(activeIndex / (phases.length - 1)) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />

        {phases.map((phase, index) => {
          const isCompleted = index < activeIndex;
          const isActive = index === activeIndex;

          return (
            <div key={phase} className="flex flex-col items-center relative z-10">
              <motion.button 
                onClick={() => setActivePhase(phase)}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 outline-none",
                  isCompleted ? "bg-blue-600 border-blue-600 text-white" : 
                  isActive ? "bg-white border-blue-600 text-blue-600 shadow-md" : 
                  "bg-white border-gray-300 text-gray-400 hover:border-gray-400"
                )}
                whileHover={{ scale: isCompleted || isActive ? 1.1 : 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  >
                    <Check size={20} strokeWidth={3} />
                  </motion.div>
                ) : (
                  index + 1
                )}
              </motion.button>
              <motion.span 
                className={cn(
                  "mt-2 text-[10px] sm:text-xs font-bold transition-all duration-300 uppercase tracking-tight",
                  isActive ? "text-blue-600" : "text-gray-400"
                )}
                animate={isActive ? { y: 0, opacity: 1 } : { y: 0, opacity: 1 }}
              >
                {phase}
              </motion.span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PhaseStepper;
