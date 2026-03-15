import React, { useState, useEffect, useRef } from 'react';
import { Code, Terminal, Cpu, Zap, Play, Pause, Square, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { usePipeline, PHASES } from '../../context/PipelineContext';
import { PIPELINE_STATUS } from '../../services/pipelineEngine';
import { clsx } from 'clsx';

const ImplementationView = () => {
  const {
    taskGraph,
    executionLog,
    completedTasks,
    verification,
    isProcessing,
    pipelineStatus,
    pendingApproval,
    runPhase
  } = usePipeline();

  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [engineState, setEngineState] = useState({
    cpu: 0,
    memory: 0,
    latency: 0
  });
  const terminalRef = useRef(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    // Update engine state periodically when running
    if (isRunning) {
      const interval = setInterval(() => {
        setEngineState({
          cpu: Math.floor(Math.random() * 40 + 30),
          memory: (Math.random() * 1 + 0.8).toFixed(1),
          latency: Math.floor(Math.random() * 50 + 100)
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isRunning]);

  const handleStartExecution = async () => {
    setIsRunning(true);
    setLogs([{ 
      type: 'system', 
      message: '# Initializing VERDICT engine...',
      timestamp: new Date().toISOString()
    }]);

    try {
      await runPhase(PHASES.IMPLEMENTATION);
    } catch (error) {
      setLogs(prev => [...prev, {
        type: 'error',
        message: `Error: ${error.message}`,
        timestamp: new Date().toISOString()
      }]);
    }
    
    setIsRunning(false);
  };

  const handlePause = () => {
    setIsRunning(false);
    setLogs(prev => [...prev, { 
      type: 'system', 
      message: '# Execution paused by user',
      timestamp: new Date().toISOString()
    }]);
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'error': return 'text-red-400';
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'system': return 'text-emerald-400';
      case 'info': return 'text-blue-400';
      default: return 'text-gray-300';
    }
  };

  const formatTimestamp = (ts) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3 text-emerald-600">
          <Code size={28} />
          <div>
            <h2 className="text-2xl font-bold">Implementation Phase</h2>
            <p className="text-gray-500 text-sm">Executing implementation logic and model inference.</p>
          </div>
        </div>
        <button
          onClick={handleStartExecution}
          disabled={isRunning || isProcessing || !taskGraph}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isRunning || isProcessing ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Executing...
            </>
          ) : (
            <>
              <Play size={18} />
              Run Implementation
            </>
          )}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Terminal Output */}
        <div className="flex-grow space-y-4">
          <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 shadow-2xl">
            <div className="bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-700">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {isRunning ? (
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  ) : (
                    <div className="w-2 h-2 bg-gray-500 rounded-full" />
                  )}
                  <span className="text-gray-400 text-xs font-mono">
                    {isRunning ? 'RUNNING' : 'IDLE'}
                  </span>
                </div>
                <div className="text-gray-400 text-xs font-mono">
                  <Terminal size={12} className="inline mr-1" />
                  verdict-engine --exec
                </div>
              </div>
            </div>
            
            {/* Terminal Content */}
            <div 
              ref={terminalRef}
              className="p-6 font-mono text-sm leading-relaxed max-h-[400px] overflow-y-auto"
              style={{ background: 'linear-gradient(to bottom, #0f0f0f, #1a1a1a)' }}
            >
              {/* Initial log entries */}
              <div className="text-emerald-400"># Initializing VERDICT engine...</div>
              <div className="text-gray-500"># Loading Anchor context... DONE</div>
              <div className="text-gray-500"># Fetching Bytez inference...</div>
              
              {taskGraph && (
                <>
                  <div className="mt-2">
                    <span className="text-blue-400">@model:</span>
                    <span className="text-white"> gpt-5.4-pro</span>
                  </div>
                  <div className="text-gray-400">
                    <span className="text-purple-400">@skeptic:</span>
                    <span className="text-white"> grok-4.2</span>
                  </div>
                </>
              )}

              {/* Live execution logs */}
              {logs.map((log, idx) => (
                <div key={idx} className={clsx("mt-1", getLogColor(log.type))}>
                  <span className="text-gray-600 text-xs">[{formatTimestamp(log.timestamp)}]</span>{' '}
                  {log.message}
                </div>
              ))}

              {/* Simulated progress when running */}
              {isRunning && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="text-blue-400 animate-spin" />
                    <span className="text-blue-400">Processing tasks...</span>
                  </div>
                  {taskGraph?.parallelGroups?.map((group, gIdx) => (
                    <div key={gIdx} className="ml-4 mt-1">
                      <span className="text-yellow-400">→</span>
                      <span className="text-gray-300"> Executing group {gIdx + 1}: {group.length} tasks</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Completed tasks */}
              {completedTasks.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="flex items-center gap-2 text-green-400 mb-2">
                    <CheckCircle2 size={14} />
                    <span>Completed Tasks ({completedTasks.length})</span>
                  </div>
                  {completedTasks.slice(-5).map((task, idx) => (
                    <div key={idx} className="ml-4 text-gray-400 text-xs">
                      ✓ {task.title}
                    </div>
                  ))}
                </div>
              )}

              {isRunning && <span className="text-gray-400 animate-pulse">_</span>}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-3">
            {!isRunning && executionLog.length === 0 ? (
              <button
                onClick={handleStartExecution}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
              >
                <Play size={18} />
                Start Execution
              </button>
            ) : (
              <>
                <button
                  onClick={isRunning ? handlePause : handleStartExecution}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
                >
                  {isRunning ? <Pause size={16} /> : <Play size={16} />}
                  {isRunning ? 'Pause' : 'Resume'}
                </button>
                <button
                  onClick={() => setIsRunning(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
                >
                  <Square size={16} />
                  Stop
                </button>
              </>
            )}
          </div>
        </div>

        {/* Engine State Sidebar */}
        <div className="lg:w-80 space-y-4">
          {/* Engine State */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-emerald-600 font-bold">
              <Cpu size={18} />
              <h4 className="text-sm uppercase tracking-wider">Engine State</h4>
            </div>
            <div className="space-y-3">
              <StateItem 
                label="CPU Load" 
                value={`${engineState.cpu}%`} 
                color={engineState.cpu > 70 ? 'red' : 'green'}
              />
              <StateItem 
                label="Memory" 
                value={`${engineState.memory}GB`} 
              />
              <StateItem 
                label="Latency" 
                value={`${engineState.latency}ms`} 
                color={engineState.latency > 150 ? 'yellow' : 'green'}
              />
            </div>
          </div>

          {/* Verification Status */}
          {verification && (
            <div className={clsx(
              "rounded-xl p-4 border",
              verification.success ? "bg-green-50 border-green-100" : "bg-orange-50 border-orange-100"
            )}>
              <div className="flex items-center gap-2 mb-3">
                {verification.success ? (
                  <CheckCircle2 size={18} className="text-green-600" />
                ) : (
                  <AlertCircle size={18} className="text-orange-600" />
                )}
                <h4 className="font-bold text-sm">Verification Status</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tasks Completed</span>
                  <span className="font-semibold">{verification.tasksCompleted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Requirements Met</span>
                  <span className="font-semibold">
                    {(verification.causalRequirementsMet * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3 text-emerald-800 font-bold">
              <Zap size={18} />
              <h4 className="text-sm">Quick Action</h4>
            </div>
            <button className="w-full py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors">
              Optimize Inference
            </button>
          </div>

          {/* Active Tasks */}
          {taskGraph && (
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <h4 className="font-bold text-gray-800 mb-3 text-sm">Task Progress</h4>
              <div className="space-y-2">
                <ProgressBar 
                  label="Completed" 
                  value={completedTasks.length} 
                  total={taskGraph.metadata?.totalTasks || 0} 
                  color="green"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StateItem = ({ label, value, color = 'gray' }) => {
  const colorClasses = {
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
    gray: 'text-gray-800'
  };

  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={clsx("text-xs font-mono font-bold", colorClasses[color])}>{value}</span>
    </div>
  );
};

const ProgressBar = ({ label, value, total, color }) => (
  <div>
    <div className="flex justify-between items-center text-xs mb-1">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold">{value}/{total}</span>
    </div>
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div 
        className={clsx(
          "h-full transition-all duration-500",
          color === 'green' ? "bg-green-500" : 
          color === 'blue' ? "bg-blue-500" : "bg-gray-500"
        )}
        style={{ width: `${total > 0 ? (value / total) * 100 : 0}%` }}
      />
    </div>
  </div>
);

export default ImplementationView;
