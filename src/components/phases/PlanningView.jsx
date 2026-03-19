import React, { useState, useEffect } from 'react';
import { Layout, ListTodo, Map, Loader2, CheckCircle2, AlertTriangle, ArrowRight, Play } from 'lucide-react';
import { usePipeline, PHASES } from '../../context/PipelineContext';
import { PIPELINE_STATUS } from '../../types/pipeline.js';
import ApprovalGate, { APPROVAL_TYPES } from '../shared/ApprovalGate';
import { clsx } from 'clsx';

const PlanningView = () => {
  const {
    userPrompt,
    taskGraph,
    causalChain,
    skepticValidation,
    isProcessing,
    pipelineStatus,
    pendingApproval,
    approve,
    reject,
    hold,
    runPhase,
    tdsScores
  } = usePipeline();

  const [showTasks, setShowTasks] = useState(true);
  const [showCausalChain, setShowCausalChain] = useState(false);
  const [isDecomposing, setIsDecomposing] = useState(false);

  const handleRunPlanning = async () => {
    setIsDecomposing(true);
    try {
      await runPhase(PHASES.PLANNING);
    } catch (error) {
      console.error('Decomposition failed:', error);
    }
    setIsDecomposing(false);
  };

  const handleApprove = () => {
    approve();
  };

  const showApprovalGate = pendingApproval &&
    pendingApproval.type === APPROVAL_TYPES.GDE_DECOMPOSITION;

  // Determine if causal chain is valid
  const isChainValid = skepticValidation?.isValid !== false;
  const chainStrength = skepticValidation?.overallStrength || 'unknown';

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
        <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
          <Layout size={28} />
          <div>
            <h2 className="text-2xl font-bold">Planning Phase</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Developing execution strategy and resource allocation.</p>
          </div>
        </div>
        <button
          onClick={handleRunPlanning}
          disabled={isDecomposing || isProcessing || !userPrompt}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isDecomposing || isProcessing ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Decomposing...
            </>
          ) : (
            <>
              <Play size={18} />
              Run Planning
            </>
          )}
        </button>
      </div>

      {isDecomposing || isProcessing ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 size={40} className="text-indigo-600 animate-spin" />
          <p className="text-gray-600 dark:text-gray-400 font-medium">Decomposing goal into tasks...</p>
        </div>
      ) : taskGraph ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Task Graph Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <ListTodo size={18} className="text-indigo-500" />
                Execution Roadmap
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowTasks(!showTasks)}
                  className="px-3 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
                >
                  {showTasks ? 'Hide' : 'Show'} Tasks
                </button>
                <button
                  onClick={() => setShowCausalChain(!showCausalChain)}
                  className="px-3 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
                >
                  {showCausalChain ? 'Hide' : 'Show'} Causal Chain
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
              {showTasks && (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {taskGraph.tasks && Array.from(taskGraph.tasks.values()).map((task, index) => (
                    <div key={task.id} className="p-4 flex items-start gap-3">
                      <div className={clsx(
                        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                        task.status === 'completed' ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" :
                        task.dependencies?.length === 0 ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" :
                        "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                      )}>
                        {index + 1}
                      </div>
                      <div className="flex-grow">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-800 dark:text-gray-200">{task.title}</h4>
                          {task.priority === 'critical' && (
                            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded">
                              CRITICAL
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{task.description}</p>
                        {task.dependencies?.length > 0 && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                            Depends on: {task.dependencies.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showCausalChain && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700">
                  <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">Causal Chain Validation</h4>
                  <div className="space-y-2">
                    {causalChain.length > 0 ? causalChain.map((link, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <ArrowRight size={14} className="text-indigo-400" />
                        <span className="text-gray-600 dark:text-gray-400">{link.cause}</span>
                        <span className="text-gray-400 dark:text-gray-500">→</span>
                        <span className="text-gray-800 dark:text-gray-200 font-medium">{link.effect}</span>
                      </div>
                    )) : (
                      <p className="text-gray-400 dark:text-gray-500 text-sm">No causal chain defined yet</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Strategy Metrics Sidebar */}
          <div className="space-y-6">
            {/* Skeptic Validation Status */}
            <div className={clsx(
              "rounded-xl p-6 border",
              isChainValid ? "bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800" : "bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800"
            )}>
              <div className="flex items-center gap-2 mb-4">
                {isChainValid ? (
                  <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" />
                ) : (
                  <AlertTriangle size={20} className="text-orange-600 dark:text-orange-400" />
                )}
                <h4 className="font-bold text-gray-800 dark:text-gray-200">Skeptic Validation (Grok 4.2)</h4>
              </div>

              {skepticValidation && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Chain Strength</span>
                    <span className={clsx(
                      "font-bold text-sm px-2 py-0.5 rounded",
                      chainStrength === 'strong' ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" :
                      chainStrength === 'moderate' ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300" :
                      "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                    )}>
                      {chainStrength.toUpperCase()}
                    </span>
                  </div>

                  {skepticValidation.issues?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Issues Found:</p>
                      {skepticValidation.issues.slice(0, 3).map((issue, idx) => (
                        <p key={idx} className="text-xs text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded">
                          {issue.message}
                        </p>
                      ))}
                    </div>
                  )}

                  {skepticValidation.recommendations?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Recommendations:</p>
                      {skepticValidation.recommendations.map((rec, idx) => (
                        <p key={idx} className="text-xs text-gray-600 dark:text-gray-400">• {rec}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Parallel Execution Groups */}
            {taskGraph.parallelGroups && (
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Map size={20} className="text-indigo-500" />
                  <h4 className="font-bold text-gray-800 dark:text-gray-200">Parallel Execution Groups</h4>
                </div>
                <div className="space-y-2">
                  {taskGraph.parallelGroups.map((group, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {group.length} task{group.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Critical Path */}
            {taskGraph.metadata?.criticalPath && (
              <div className="bg-indigo-600 rounded-xl p-6 text-white shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30">
                <h4 className="font-bold mb-4">Critical Path</h4>
                <div className="space-y-2">
                  {taskGraph.metadata.criticalPath.slice(0, 4).map((taskId, idx) => {
                    const task = taskGraph.tasks.get(taskId);
                    return (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center text-xs">
                          {idx + 1}
                        </span>
                        <span>{task?.title || taskId}</span>
                      </div>
                    );
                  })}
                  {taskGraph.metadata.criticalPath.length > 4 && (
                    <p className="text-xs text-indigo-300 ml-7">
                      +{taskGraph.metadata.criticalPath.length - 4} more
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* TDS Summary */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <h5 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">TDS Summary</h5>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center p-2 bg-white dark:bg-gray-700 rounded">
                  <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                    {taskGraph.metadata?.totalTasks || 0}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Tasks</p>
                </div>
                <div className="text-center p-2 bg-white dark:bg-gray-700 rounded">
                  <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                    {taskGraph.parallelGroups?.length || 0}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Parallel Groups</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Layout size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No decomposition available</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1 mb-4">
            Enter a goal prompt in the Refining phase, then click Run Planning
          </p>
          <button
            onClick={handleRunPlanning}
            disabled={!userPrompt}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Play size={18} />
            Run Planning
          </button>
        </div>
      )}
    </div>
  );
};

export default PlanningView;
