import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PipelineProvider, usePipeline, PHASES } from './context/PipelineContext';
import MainLayout from './components/layout/MainLayout';
import { Play } from 'lucide-react';

// Phase Views
import RefiningView from './components/phases/RefiningView';
import PlanningView from './components/phases/PlanningView';
import ResearchView from './components/phases/ResearchView';
import ImplementationView from './components/phases/ImplementationView';
import CloseOutView from './components/phases/CloseOutView';

const phaseVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
};

const PhaseView = () => {
  const { activePhase, anchorVersion, runPhase, isProcessing } = usePipeline();

  const renderContent = () => {
    switch (activePhase) {
      case PHASES.REFINING:
        return <RefiningView />;
      case PHASES.PLANNING:
        return <PlanningView />;
      case PHASES.RESEARCH:
        return <ResearchView />;
      case PHASES.IMPLEMENTATION:
        return <ImplementationView />;
      case PHASES.CLOSE_OUT:
        return <CloseOutView />;
      default:
        return <div className="p-20 text-center text-gray-500 dark:text-gray-400">Select a phase to begin.</div>;
    }
  };

  const handleRunPhase = () => {
    runPhase(activePhase);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tight"
          >
            {activePhase}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-gray-500 dark:text-gray-400 mt-1 font-medium"
          >
            Pipeline version <span className="text-blue-600 dark:text-blue-400 font-bold">{anchorVersion.toUpperCase()}</span> is currently active.
          </motion.p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleRunPhase}
          disabled={isProcessing}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play size={18} fill="currentColor" />
          Run {activePhase}
        </motion.button>
      </div>

      <motion.div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden min-h-[500px]"
        layout
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activePhase}
            variants={phaseVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

function App() {
  return (
    <PipelineProvider>
      <MainLayout>
        <PhaseView />
      </MainLayout>
    </PipelineProvider>
  );
}

export default App;
