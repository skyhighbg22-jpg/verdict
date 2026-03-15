import React from 'react';
import { motion } from 'framer-motion';
import { usePipeline } from '../../context/PipelineContext';
import { Activity, BarChart3, ShieldAlert, Timer, Server, Users } from 'lucide-react';

const MetricsPanel = () => {
  const { tdsScores, miraResults } = usePipeline();

  return (
    <div className="flex flex-col gap-6 bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-w-[300px]">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Activity className="text-blue-600" size={20} />
          TDS Scores
        </h3>
        <div className="space-y-4">
          <MetricRow 
            label="Technical Complexity" 
            value={tdsScores.technicalComplexity} 
            icon={<BarChart3 size={16} />}
            delay={0}
          />
          <MetricRow 
            label="Infrastructure Impact" 
            value={tdsScores.infrastructureImpact} 
            icon={<Server size={16} />}
            delay={0.1}
          />
          <MetricRow 
            label="Security Risk" 
            value={tdsScores.securityRisk} 
            icon={<ShieldAlert size={16} />}
            delay={0.2}
          />
          <MetricRow 
            label="Time Constraint" 
            value={tdsScores.timeConstraint} 
            icon={<Timer size={16} />}
            delay={0.3}
          />
          <MetricRow 
            label="Resource Availability" 
            value={tdsScores.resourceAvailability} 
            icon={<Users size={16} />}
            delay={0.4}
          />
        </div>
      </motion.div>

      <motion.div 
        className="pt-6 border-t border-gray-100"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Activity className="text-purple-600" size={20} />
          MIRA Calibration
        </h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Calibration Score</span>
              <motion.span 
                className="text-lg font-mono font-bold text-purple-600"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                {miraResults.calibrationScore.toFixed(2)}
              </motion.span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <motion.div 
                className="bg-purple-600 h-full" 
                initial={{ width: 0 }}
                animate={{ width: `${miraResults.calibrationScore * 100}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
          <div className="flex justify-between items-center text-[10px] text-gray-400 uppercase tracking-widest border-t border-gray-50 pt-2">
            <span className="flex items-center gap-1">
              <Timer size={10} />
              {(miraResults.confidenceInterval[0] * 100).toFixed(0)}%-{(miraResults.confidenceInterval[1] * 100).toFixed(0)}%
            </span>
            <span>{miraResults.lastUpdated ? new Date(miraResults.lastUpdated).toLocaleTimeString() : 'Never'}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const MetricRow = ({ label, value, icon, delay = 0 }) => (
  <motion.div 
    className="flex flex-col gap-1"
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.3 }}
  >
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-600 flex items-center gap-1">
        {icon}
        {label}
      </span>
      <motion.span 
        className="font-semibold text-gray-800"
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400, delay: delay + 0.2 }}
      >
        {value}/10
      </motion.span>
    </div>
    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
      <motion.div 
        className="bg-blue-500 h-full" 
        initial={{ width: 0 }}
        animate={{ width: `${value * 10}%` }}
        transition={{ duration: 0.6, delay: delay + 0.1, ease: "easeOut" }}
      />
    </div>
  </motion.div>
);

export default MetricsPanel;
