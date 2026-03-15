import React, { useState, useEffect } from 'react';
import { Search, Database, Globe, Layers, Loader2, CheckCircle2, AlertTriangle, Shield, Zap, Play } from 'lucide-react';
import { usePipeline, PHASES } from '../../context/PipelineContext';
import { PIPELINE_STATUS } from '../../services/pipelineEngine';
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

      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3 text-cyan-600">
          <Search size={28} />
          <div>
            <h2 className="text-2xl font-bold">Research Phase</h2>
            <p className="text-gray-500 text-sm">Technical constraints and external data retrieval.</p>
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
          <p className="text-gray-600 font-medium">Running main research and adversarial analysis...</p>
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
              icon={<Layers classNameName="text-orange-500" />} 
              title="Adversarial Search"
              status={adversarialFindings ? "Complete" : "Pending"}
              isActive={activeTab === 'adversarial'}
              onClick={() => setActiveTab('adversarial')}
              isAdversarial
            />
            <ResearchCard 
              icon={<Search classNameName="text-purple-500" />} 
              title="Causal Validation"
              status={causalValidation?.isValid !== false ? "Passed" : "Issues Found"}
              statusType={causalValidation?.isValid !== false ? "success" : "warning"}
            />
          </div>

          {/* Research Stream */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-700">
                {activeTab === 'main' ? 'Main Research Findings' : 'Adversarial Findings'}
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('main')}
                  className={clsx(
                    "px-3 py-1 text-xs font-medium rounded-lg transition-colors",
                    activeTab === 'main' ? "bg-cyan-100 text-cyan-700" : "bg-gray-100 text-gray-600"
                  )}
                >
                  Main
                </button>
                <button
                  onClick={() => setActiveTab('adversarial')}
                  className={clsx(
                    "px-3 py-1 text-xs font-medium rounded-lg transition-colors",
                    activeTab === 'adversarial' ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"
                  )}
                >
                  Adversarial
                </button>
              </div>
            </div>
            
            <div className="p-0">
              <div className="divide-y divide-gray-100">
                {activeTab === 'main' ? (
                  mainResearch?.keyPoints?.map((point, i) => (
                    <div key={i} className="p-4 flex items-start gap-3">
                      <CheckCircle2 size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{point}</span>
                    </div>
                  )) || (
                    <ResearchLoading />
                  )
                ) : (
                  adversarialFindings?.keyPoints?.map((point, i) => (
                    <div key={i} className="p-4 flex items-start gap-3">
                      <AlertTriangle size={16} className="text-orange-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{point}</span>
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
              <div className="bg-white border border-gray-100 rounded-xl p-6">
                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Shield size={18} className="text-indigo-500" />
                  Research Comparison
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Agreement Level</span>
                    <span className={clsx(
                      "font-bold",
                      researchComparison.agreement > 0.7 ? "text-green-600" : 
                      researchComparison.agreement > 0.4 ? "text-yellow-600" : "text-red-600"
                    )}>
                      {(researchComparison.agreement * 100).toFixed(0)}%
                    </span>
                  </div>
                  
                  {researchComparison.disagreements?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Disagreements:</p>
                      {researchComparison.disagreements.map((d, i) => (
                        <div key={i} className="p-3 bg-orange-50 border border-orange-100 rounded-lg">
                          <p className="text-xs text-orange-800">{d.mainPoint}</p>
                          {d.adversarialPoint && (
                            <p className="text-xs text-gray-500 mt-1">vs: {d.adversarialPoint}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <p className="text-xs font-medium text-blue-800">Synthesis</p>
                    <p className="text-sm text-blue-700 mt-1">{researchComparison.synthesis}</p>
                  </div>
                </div>
              </div>

              {/* Confidence Adjustment */}
              <div className="bg-white border border-gray-100 rounded-xl p-6">
                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Zap size={18} className="text-yellow-500" />
                  Confidence Adjustment
                </h4>
                <div className="space-y-4">
                  <div className="text-center p-6 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-500 mb-2">Based on adversarial analysis</p>
                    <p className={clsx(
                      "text-4xl font-black",
                      researchComparison.confidenceAdjustment >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {researchComparison.confidenceAdjustment >= 0 ? '+' : ''}
                      {(researchComparison.confidenceAdjustment * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-400 mt-2">Confidence adjustment</p>
                  </div>
                  
                  {causalValidation && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Causal Chain</span>
                        <span className={clsx(
                          "px-2 py-0.5 text-xs font-bold rounded",
                          causalValidation.isValid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        )}>
                          {causalValidation.isValid ? 'VALID' : 'INVALID'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Strength</span>
                        <span className={clsx(
                          "px-2 py-0.5 text-xs font-bold rounded",
                          causalValidation.overallStrength === 'strong' ? "bg-green-100 text-green-700" :
                          causalValidation.overallStrength === 'moderate' ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-700"
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
      "bg-white p-4 rounded-xl border shadow-sm transition-all cursor-pointer",
      isActive ? (isAdversarial ? "border-orange-300 ring-2 ring-orange-100" : "border-cyan-300 ring-2 ring-cyan-100") : 
      "border-gray-100 hover:border-cyan-200"
    )}
  >
    <div className="mb-3">{icon}</div>
    <h5 className="font-bold text-gray-800 text-sm">{title}</h5>
    <div className="mt-2 flex items-center justify-between">
      <span className={clsx(
        "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
        statusType === 'success' ? "bg-green-100 text-green-600" :
        statusType === 'warning' ? "bg-orange-100 text-orange-600" :
        status === 'Complete' || status === 'Passed' ? "bg-green-100 text-green-600" :
        status === 'Deferred' ? "bg-gray-100 text-gray-400" : 
        "bg-blue-100 text-blue-600"
      )}>
        {status}
      </span>
    </div>
    {description && (
      <p className="text-xs text-gray-400 mt-2">{description}</p>
    )}
  </div>
);

const ResearchLoading = () => (
  <>
    {[1, 2, 3, 4].map(i => (
      <div key={i} className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-cyan-400" />
          <div className="h-4 bg-gray-100 rounded w-2/3 animate-pulse" />
        </div>
        <span className="text-xs text-gray-400 font-mono">0.{i}s</span>
      </div>
    ))}
  </>
);

export default ResearchView;
