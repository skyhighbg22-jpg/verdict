import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, HelpCircle, ShieldCheck } from 'lucide-react';
import { clsx } from 'clsx';

const GELPanel = () => {
  const verifiedFacts = [
    {
      id: 1,
      text: "Task decomposition follows causal dependencies",
      certainty: 0.92,
      source: "Skeptic Validator",
      status: 'verified'
    },
    {
      id: 2,
      text: "API rate limits allow 1000 req/min for this tier",
      certainty: 0.85,
      source: "Research (Bytez)",
      status: 'verified'
    },
    {
      id: 3,
      text: "Pipeline execution time estimated at 4.2 minutes",
      certainty: 0.78,
      source: "TDS Analysis",
      status: 'uncertain'
    }
  ];

  const avgCertainty = (verifiedFacts.reduce((acc, f) => acc + f.certainty, 0) / verifiedFacts.length * 100).toFixed(0);

  return (
    <motion.div
      className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 min-w-[300px]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="text-emerald-600" size={20} />
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">GEL Panel</h3>
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">Verified Facts</span>
      </div>

      <div className="space-y-4">
        {verifiedFacts.map((fact, index) => (
          <FactItem key={fact.id} fact={fact} index={index} />
        ))}
      </div>

      <motion.div
        className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
          <span>Total Facts</span>
          <span className="font-semibold text-gray-700 dark:text-gray-300">{verifiedFacts.length}</span>
        </div>
        <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mt-2">
          <span>Avg Certainty</span>
          <motion.span
            className="font-semibold text-emerald-600 dark:text-emerald-400"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, delay: 0.6 }}
          >
            {avgCertainty}%
          </motion.span>
        </div>
      </motion.div>
    </motion.div>
  );
};

const FactItem = ({ fact, index }) => {
  const getStatusIcon = () => {
    switch (fact.status) {
      case 'verified':
        return <CheckCircle2 size={14} className="text-emerald-500" />;
      case 'uncertain':
        return <HelpCircle size={14} className="text-yellow-500" />;
      case 'disputed':
        return <AlertCircle size={14} className="text-red-500" />;
      default:
        return <HelpCircle size={14} className="text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (fact.status) {
      case 'verified':
        return 'bg-emerald-500';
      case 'uncertain':
        return 'bg-yellow-500';
      case 'disputed':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <motion.div
      className="space-y-2"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex-shrink-0">{getStatusIcon()}</div>
        <div className="flex-1">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{fact.text}</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{fact.source}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-6">
        <div className="flex-1 bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
          <motion.div
            className={clsx("h-full", getStatusColor())}
            initial={{ width: 0 }}
            animate={{ width: `${fact.certainty * 100}%` }}
            transition={{ duration: 0.5, delay: index * 0.1 + 0.2, ease: "easeOut" }}
          />
        </div>
        <motion.span
          className={clsx(
            "text-[10px] font-semibold min-w-[32px] text-right",
            fact.certainty >= 0.9 ? "text-emerald-600 dark:text-emerald-400" :
            fact.certainty >= 0.7 ? "text-yellow-600 dark:text-yellow-400" : "text-orange-600 dark:text-orange-400"
          )}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, delay: index * 0.1 + 0.3 }}
        >
          {(fact.certainty * 100).toFixed(0)}%
        </motion.span>
      </div>
    </motion.div>
  );
};

export default GELPanel;
