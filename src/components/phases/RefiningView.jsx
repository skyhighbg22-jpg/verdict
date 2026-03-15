import React, { useState, useEffect } from 'react';
import { FileText, Sliders, Target, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { usePipeline, PHASES } from '../../context/PipelineContext';
import { runTDSAnalysis, DEFAULT_TDS_SCORES } from '../../services/tdsRouter';
import { runMiraCalibration } from '../../services/miraEngine';
import { PIPELINE_STATUS } from '../../services/pipelineEngine';
import ApprovalGate, { APPROVAL_TYPES } from '../shared/ApprovalGate';
import { clsx } from 'clsx';

const RefiningView = () => {
  const { 
    userPrompt, 
    setUserPrompt, 
    tdsScores, 
    tdsRouting, 
    miraResults, 
    isProcessing,
    pipelineStatus,
    pendingApproval,
    approve,
    reject,
    hold,
    runPhase,
    activePhase
  } = usePipeline();

  const [localPrompt, setLocalPrompt] = useState(userPrompt);
  const [calibrationProgress, setCalibrationProgress] = useState(0);

  useEffect(() => {
    if (isProcessing && pipelineStatus === PIPELINE_STATUS.RUNNING) {
      // Simulate calibration progress
      const interval = setInterval(() => {
        setCalibrationProgress(prev => Math.min(prev + 10, 100));
      }, 200);
      return () => clearInterval(interval);
    } else {
      setCalibrationProgress(0);
    }
  }, [isProcessing, pipelineStatus]);

  const handleRunRefining = async () => {
    if (!localPrompt.trim()) return;
    await setUserPrompt(localPrompt);
    await runPhase(PHASES.REFINING);
  };

  const handleApprove = () => {
    approve();
  };

  // Check if this phase needs approval gate
  const showApprovalGate = pendingApproval && 
    [APPROVAL_TYPES.TDS_ROUTING, APPROVAL_TYPES.GDE_DECOMPOSITION].includes(pendingApproval.type);

  return (
    <div className="p-8 space-y-8">
      <ApprovalGate
        isOpen={showApprovalGate}
        approvalType={pendingApproval?.type}
        details={pendingApproval?.details || {}}
        onApprove={handleApprove}
        onReject={reject}
        onHold={hold}
        isLoading={isProcessing}
      />

      <div className="flex items-center gap-3 text-blue-600 border-b border-gray-100 pb-4">
        <FileText size={28} />
        <div>
          <h2 className="text-2xl font-bold">Refining Phase</h2>
          <p className="text-gray-500 text-sm">Clarifying requirements and establishing anchor version state.</p>
        </div>
      </div>

      {/* Input Section */}
      <div className="space-y-4">
        <label className="block text-sm font-semibold text-gray-700">
          Enter your goal or task prompt for VERDICT analysis
        </label>
        <textarea
          value={localPrompt}
          onChange={(e) => setLocalPrompt(e.target.value)}
          placeholder="Describe your task, goal, or problem to be solved..."
          className="w-full p-4 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all resize-none"
          rows={4}
        />
        <button
          onClick={handleRunRefining}
          disabled={!localPrompt.trim() || isProcessing}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sliders size={18} />
              Run Analysis
            </>
          )}
        </button>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* TDS Analysis Card */}
        <div className="p-6 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-700 font-bold">
              <Sliders size={18} className="text-blue-500" />
              <h4>TDS Analysis (GPT-5.4 Pro)</h4>
            </div>
            {tdsRouting && (
              <span className={clsx(
                "px-2 py-1 text-xs font-bold rounded-full",
                tdsRouting.requiresHumanApproval ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"
              )}>
                {tdsRouting.complexityLevel}
              </span>
            )}
          </div>
          
          {tdsRouting ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between p-2 bg-white rounded">
                  <span className="text-gray-500">Technical Complexity</span>
                  <span className="font-semibold">{tdsScores.technicalComplexity}/10</span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded">
                  <span className="text-gray-500">Security Risk</span>
                  <span className="font-semibold">{tdsScores.securityRisk}/10</span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded">
                  <span className="text-gray-500">Infra Impact</span>
                  <span className="font-semibold">{tdsScores.infrastructureImpact}/10</span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded">
                  <span className="text-gray-500">Time Constraint</span>
                  <span className="font-semibold">{tdsScores.timeConstraint}/10</span>
                </div>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs font-medium text-blue-800">
                  Recommendation: {tdsRouting.recommendedApproach}
                </p>
                {tdsRouting.highRiskIndicators?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tdsRouting.highRiskIndicators.map((indicator, i) => (
                      <span key={i} className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                        {indicator}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded-full w-full animate-pulse" />
              <div className="h-3 bg-gray-200 rounded-full w-5/6 animate-pulse" />
              <div className="h-3 bg-gray-200 rounded-full w-4/6 animate-pulse" />
            </div>
          )}
        </div>

        {/* MIRA Calibration Card */}
        <div className="p-6 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-700 font-bold">
              <Target size={18} className="text-purple-500" />
              <h4>MIRA Calibration (HCQ)</h4>
            </div>
            {miraResults && (
              <div className="flex items-center gap-1">
                {miraResults.calibrationScore >= 0.7 ? (
                  <CheckCircle2 size={16} className="text-green-500" />
                ) : (
                  <AlertCircle size={16} className="text-orange-500" />
                )}
                <span className={clsx(
                  "text-sm font-bold",
                  miraResults.calibrationScore >= 0.7 ? "text-green-600" : "text-orange-600"
                )}>
                  {(miraResults.calibrationScore * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>
          
          {miraResults && miraResults.calibrationScore > 0 ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Calibration Score</span>
                  <span className="font-mono font-bold text-purple-600">
                    {miraResults.calibrationScore.toFixed(3)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-purple-500 h-full transition-all duration-500" 
                    style={{ width: `${miraResults.calibrationScore * 100}%` }}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-white rounded">
                  <span className="text-gray-400">Accuracy</span>
                  <p className="font-semibold">{(miraResults.accuracy * 100).toFixed(0)}%</p>
                </div>
                <div className="p-2 bg-white rounded">
                  <span className="text-gray-400">Avg Confidence</span>
                  <p className="font-semibold">{(miraResults.avgConfidence * 100).toFixed(0)}%</p>
                </div>
              </div>

              <div className="p-2 bg-purple-50 rounded-lg border border-purple-100">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-purple-600">Miscalibration Penalty</span>
                  <span className="font-bold text-purple-700">
                    {miraResults.miscalibrationPenalty?.toFixed(3) || '0.000'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {calibrationProgress > 0 && (
                <div className="w-full bg-purple-100 h-2 rounded-full overflow-hidden mb-2">
                  <div 
                    className="bg-purple-500 h-full transition-all duration-300" 
                    style={{ width: `${calibrationProgress}%` }}
                  />
                </div>
              )}
              <div className="h-3 bg-gray-200 rounded-full w-full animate-pulse" />
              <div className="h-3 bg-gray-200 rounded-full w-5/6 animate-pulse" />
              <div className="h-3 bg-gray-200 rounded-full w-4/6 animate-pulse" />
            </div>
          )}
        </div>
      </div>

      {/* Model Configuration */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
        <h4 className="font-bold text-blue-800 mb-2">Model Configuration</h4>
        <p className="text-sm text-blue-600 mb-4">Active models for VERDICT pipeline</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-100">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <div>
              <p className="text-sm font-semibold text-gray-800">GPT-5.4 Pro</p>
              <p className="text-xs text-gray-500">TDS, GDE, MIRA</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-100">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <div>
              <p className="text-sm font-semibold text-gray-800">Grok 4.2</p>
              <p className="text-xs text-gray-500">Skeptic, Causal</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefiningView;
