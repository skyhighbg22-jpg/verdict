import React, { useState, useEffect } from 'react';
import { Search, Database, Globe, Layers, Loader2, CheckCircle2, AlertTriangle, Shield, Zap, Play } from 'lucide-react';
import { usePipeline, PHASES } from '../../context/PipelineContext';
import { PIPELINE_STATUS } from '../../types/pipeline.js';
import ApprovalGate, { APPROVAL_TYPES } from '../shared/ApprovalGate';
import { clsx } from 'clsx';

const ResearchView = () => {
  const {
    userPrompt,
    taskGraph,
    mainResearch,
    adversarialFindings,
    researchComparison,
    causalValidation,
    skepticValidation,
    isProcessing,
    pipelineStatus,
    pendingApproval,
    approve,
    reject,
    hold,
    runPhase
  } = usePipeline();

  const [activeTab, setActiveTab] = useState('main');

  const handleRunResearch = async () => {
    try {
      await runPhase(PHASES.RESEARCH);
    } catch (error) {
      console.error('Research failed:', error);
    }
  };

  const handleApprove = () => {
    approve();
  };

  const showApprovalGate = pendingApproval &&
    pendingApproval.type === APPROVAL_TYPES.ADVERSARIAL_REVIEW;

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

      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-4">
        <div className="flex items-center gap-3 text-cyan-600 dark:text-cyan-400">
          <Search size={28} />
          <div>
            <h2 className="text-2xl font-bold">Research Phase</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Technical constraints and external data retrieval.</p>
          </div>
        </div>
        <button
          onClick={handleRunResearch}
          disabled={isProcessing || !taskGraph}
          className="flex items-center gap-2 px-6 py-2.5 bg-cyan-600 text-white rounded-xl font-semibold hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Researching...
            </>
          ) : (
            <>
              <Play size={18} />
              Run Research
            </>
          )}
        </button>
      </div>

      {isProcessing ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 size={40} className="text-cyan-600 animate-spin" />
          <p className="text-gray-600 dark:text-gray-400 font-medium">Running main research and adversarial analysis...</p>
        </div>
      ) : (
        <>
          {/* Research Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ResearchCard
              icon={<Database className="text-cyan-500" />}
              title="Pinecone Query"
              status="Deferred"
              description="Vector database scheduled for tomorrow"
            />
            <ResearchCard
              icon={<Globe className="text-cyan-500" />}
              title="Main Research"
              status={mainResearch ? "Complete" : "Pending"}
              isActive={activeTab === 'main'}
              onClick={() => setActiveTab('main')}
            />
            <ResearchCard
              icon={<Layers className="text-orange-500" />}
              title="Adversarial Search"
              status={adversarialFindings ? "Complete" : "Pending"}
              isActive={activeTab === 'adversarial'}
              onClick={() => setActiveTab('adversarial')}
              isAdversarial
            />
            <ResearchCard
              icon={<Search className="text-purple-500" />}
              title="Causal Validation"
              status={causalValidation?.isValid !== false ? "Passed" : "Issues Found"}
              statusType={causalValidation?.isValid !== false ? "success" : "warning"}
            />
          </div>

          {/* Research Stream */}
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">
                {activeTab === 'main' ? 'Main Research Findings' : 'Adversarial Findings'}
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('main')}
                  className={clsx(
                    "px-3 py-1 text-xs font-medium rounded-lg transition-colors",
                    activeTab === 'main' ? "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                  )}
                >
                  Main
                </button>
                <button
                  onClick={() => setActiveTab('adversarial')}
                  className={clsx(
                    "px-3 py-1 text-xs font-medium rounded-lg transition-colors",
                    activeTab === 'adversarial' ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                  )}
                >
                  Adversarial
                </button>
              </div>
            </div>

            <div className="p-0">
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {activeTab === 'main' ? (
                  mainResearch?.keyPoints?.map((point, i) => (
                    <div key={i} className="p-4 flex items-start gap-3">
                      <CheckCircle2 size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{point}</span>
                    </div>
                  )) || (
                    <ResearchLoading />
                  )
                ) : (
                  adversarialFindings?.keyPoints?.map((point, i) => (
                    <div key={i} className="p-4 flex items-start gap-3">
                      <AlertTriangle size={16} className="text-orange-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{point}</span>
                    </div>
                  )) || (
                    <ResearchLoading />
                  )
                )}
              </div>
            </div>
          </div>

          {/* Comparison & Validation */}
          {researchComparison && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Comparison */}
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-6">
                <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                  <Shield size={18} className="text-indigo-500" />
                  Research Comparison
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Agreement Level</span>
                    <span className={clsx(
                      "font-bold",
                      researchComparison.agreement > 0.7 ? "text-green-600 dark:text-green-400" :
                      researchComparison.agreement > 0.4 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {(researchComparison.agreement * 100).toFixed(0)}%
                    </span>
                  </div>

                  {researchComparison.disagreements?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Disagreements:</p>
                      {researchComparison.disagreements.map((d, i) => (
                        <div key={i} className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-lg">
                          <p className="text-xs text-orange-800 dark:text-orange-300">{d.mainPoint}</p>
                          {d.adversarialPoint && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">vs: {d.adversarialPoint}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                    <p className="text-xs font-medium text-blue-800 dark:text-blue-300">Synthesis</p>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">{researchComparison.synthesis}</p>
                  </div>
                </div>
              </div>

              {/* Confidence Adjustment */}
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-6">
                <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                  <Zap size={18} className="text-yellow-500" />
                  Confidence Adjustment
                </h4>
                <div className="space-y-4">
                  <div className="text-center p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Based on adversarial analysis</p>
                    <p className={clsx(
                      "text-4xl font-black",
                      researchComparison.confidenceAdjustment >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {researchComparison.confidenceAdjustment >= 0 ? '+' : ''}
                      {(researchComparison.confidenceAdjustment * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Confidence adjustment</p>
                  </div>

                  {causalValidation && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Causal Chain</span>
                        <span className={clsx(
                          "px-2 py-0.5 text-xs font-bold rounded",
                          causalValidation.isValid ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                        )}>
                          {causalValidation.isValid ? 'VALID' : 'INVALID'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Strength</span>
                        <span className={clsx(
                          "px-2 py-0.5 text-xs font-bold rounded",
                          causalValidation.overallStrength === 'strong' ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" :
                          causalValidation.overallStrength === 'moderate' ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300" :
                          "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                        )}>
                          {causalValidation.overallStrength?.toUpperCase() || 'UNKNOWN'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const ResearchCard = ({
  icon,
  title,
  status,
  description,
  isActive,
  onClick,
  isAdversarial,
  statusType
}) => (
  <div
    onClick={onClick}
    className={clsx(
      "bg-white dark:bg-gray-800 p-4 rounded-xl border shadow-sm transition-all cursor-pointer",
      isActive ? (isAdversarial ? "border-orange-300 dark:border-orange-600 ring-2 ring-orange-100 dark:ring-orange-900/30" : "border-cyan-300 dark:border-cyan-600 ring-2 ring-cyan-100 dark:ring-cyan-900/30") :
      "border-gray-100 dark:border-gray-700 hover:border-cyan-200 dark:hover:border-cyan-700"
    )}
  >
    <div className="mb-3">{icon}</div>
    <h5 className="font-bold text-gray-800 dark:text-gray-200 text-sm">{title}</h5>
    <div className="mt-2 flex items-center justify-between">
      <span className={clsx(
        "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
        statusType === 'success' ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" :
        statusType === 'warning' ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" :
        status === 'Complete' || status === 'Passed' ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" :
        status === 'Deferred' ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500" :
        "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
      )}>
        {status}
      </span>
    </div>
    {description && (
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{description}</p>
    )}
  </div>
);

const ResearchLoading = () => (
  <>
    {[1, 2, 3, 4].map(i => (
      <div key={i} className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-cyan-400" />
          <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-2/3 animate-pulse" />
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">0.{i}s</span>
      </div>
    ))}
  </>
);

export default ResearchView;
