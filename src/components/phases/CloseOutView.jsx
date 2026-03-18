import React, { useState, useEffect } from 'react';
import { CheckCircle2, Archive, Loader2, Download, FileText, Award, AlertTriangle, Play } from 'lucide-react';
import { usePipeline, PHASES } from '../../context/PipelineContext';
import { clsx } from 'clsx';

const CloseOutView = () => {
  const {
    summaryReport,
    finalCalibration,
    verification,
    skepticValidation,
    tdsScores,
    miraResults,
    userPrompt,
    runPhase,
    isProcessing
  } = usePipeline();

  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);

  const handleRunCloseOut = async () => {
    try {
      await runPhase(PHASES.CLOSE_OUT);
    } catch (error) {
      console.error('Close-out failed:', error);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Simulate export
      await new Promise(resolve => setTimeout(resolve, 1500));
      setExportStatus('success');
    } catch (error) {
      setExportStatus('error');
    }
    setIsExporting(false);
  };

  const handleArchive = async () => {
    // Archive functionality (deferred)
    console.log('Archiving...');
  };

  const isPipelineSuccess = verification?.success &&
    (skepticValidation?.isValid !== false);

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-4">
        <div className="flex items-center gap-3 text-green-600 dark:text-green-400">
          <CheckCircle2 size={28} />
          <div>
            <h2 className="text-2xl font-bold">Close-Out Phase</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Finalizing results and archiving anchor versions.</p>
          </div>
        </div>
        <button
          onClick={handleRunCloseOut}
          disabled={isProcessing || !verification}
          className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Finalizing...
            </>
          ) : (
            <>
              <Play size={18} />
              Run Close-Out
            </>
          )}
        </button>
      </div>

      {isProcessing ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 size={40} className="text-green-600 animate-spin" />
          <p className="text-gray-600 dark:text-gray-400 font-medium">Generating final report...</p>
        </div>
      ) : (
        <>
          {/* Success Banner */}
          <div className={clsx(
            "rounded-2xl p-8 text-center space-y-6 border",
            isPipelineSuccess ? "bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800" : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-800"
          )}>
            <div className={clsx(
              "mx-auto w-20 h-20 rounded-full flex items-center justify-center shadow-sm border",
              isPipelineSuccess ? "bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 border-green-100 dark:border-green-800" : "bg-white dark:bg-gray-800 text-yellow-600 dark:text-yellow-400 border-yellow-100 dark:border-yellow-800"
            )}>
              {isPipelineSuccess ? (
                <CheckCircle2 size={40} />
              ) : (
                <AlertTriangle size={40} />
              )}
            </div>
            <div className="space-y-2">
              <h3 className={clsx(
                "text-xl font-bold",
                isPipelineSuccess ? "text-green-900 dark:text-green-300" : "text-yellow-900 dark:text-yellow-300"
              )}>
                {isPipelineSuccess ? 'Pipeline Completed Successfully' : 'Pipeline Completed with Warnings'}
              </h3>
              <p className={clsx(
                "max-w-md mx-auto text-sm",
                isPipelineSuccess ? "text-green-700 dark:text-green-400" : "text-yellow-700 dark:text-yellow-400"
              )}>
                {isPipelineSuccess
                  ? 'All verification steps passed. Results are ready to be synced with external platforms.'
                  : 'Some verification issues were found. Review the details below before proceeding.'
                }
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isExporting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Download size={18} />
                )}
                Export Results
              </button>
              <button
                onClick={handleArchive}
                className="flex items-center gap-2 px-6 py-2 bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-700 rounded-lg font-bold hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
              >
                <Archive size={18} />
                Archive Version
              </button>
            </div>

            {exportStatus && (
              <div className={clsx(
                "text-sm px-4 py-2 rounded-lg",
                exportStatus === 'success' ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
              )}>
                {exportStatus === 'success'
                  ? 'Results exported successfully!'
                  : 'Export failed. Please try again.'
                }
              </div>
            )}
          </div>

          {/* Final Calibration Report */}
          {finalCalibration && (
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-6">
              <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                <Award size={18} className="text-purple-500" />
                MIRA Calibration Final Report
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-center">
                  <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">Initial Score</p>
                  <p className="text-3xl font-black text-purple-700 dark:text-purple-300">
                    {(finalCalibration.initialScore * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Penalty</p>
                  <p className="text-3xl font-black text-gray-700 dark:text-gray-300">
                    {(finalCalibration.totalPenalty * 100).toFixed(1)}%
                  </p>
                </div>
                <div className={clsx(
                  "p-4 rounded-xl text-center",
                  finalCalibration.finalScore >= 0.7 ? "bg-green-50 dark:bg-green-900/20" : "bg-orange-50 dark:bg-orange-900/20"
                )}>
                  <p className={clsx(
                    "text-sm mb-1",
                    finalCalibration.finalScore >= 0.7 ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"
                  )}>
                    Final Score
                  </p>
                  <p className={clsx(
                    "text-3xl font-black",
                    finalCalibration.finalScore >= 0.7 ? "text-green-700 dark:text-green-300" : "text-orange-700 dark:text-orange-300"
                  )}>
                    {(finalCalibration.finalScore * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              {finalCalibration.breakdown && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Penalty Breakdown</p>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400">Miscalibration</span>
                        <span className="font-semibold">
                          {(finalCalibration.breakdown.miscalibration * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full">
                        <div
                          className="h-full bg-purple-500"
                          style={{ width: `${finalCalibration.breakdown.miscalibration * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400">Verification</span>
                        <span className="font-semibold">
                          {(finalCalibration.breakdown.verification * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full">
                        <div
                          className="h-full bg-orange-500"
                          style={{ width: `${finalCalibration.breakdown.verification * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Summary Report & Integrations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Integrations Status */}
            <div className="p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm">
              <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center justify-between">
                Integrations Status
                <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">Status</span>
              </h4>
              <div className="space-y-4">
                <IntegrationItem name="Airtable Sync" status="Deferred" />
                <IntegrationItem name="Dify Workflow" status="Deferred" />
                <IntegrationItem name="Pinecone Archive" status="Deferred" />
              </div>
            </div>

            {/* Summary Report */}
            <div className="p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm">
              <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center justify-between">
                Summary Report
                <FileText size={14} className="text-gray-400 dark:text-gray-500" />
              </h4>
              {summaryReport ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Tasks Completed</span>
                    <span className="font-semibold">
                      {summaryReport.taskSummary?.completed || 0} / {summaryReport.taskSummary?.total || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Verification</span>
                    <span className={clsx(
                      "font-semibold px-2 py-0.5 rounded text-xs",
                      summaryReport.verificationStatus === 'PASSED'
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                        : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                    )}>
                      {summaryReport.verificationStatus || 'UNKNOWN'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Skeptic Issues</span>
                    <span className="font-semibold">
                      {summaryReport.skepticSummary?.issues || 0}
                    </span>
                  </div>

                  {summaryReport.recommendations && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Recommendations</p>
                      {summaryReport.recommendations.map((rec, idx) => (
                        <p key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                          <span className="text-green-500">•</span>
                          {rec}
                        </p>
                      ))}
                    </div>
                  )}

                  <button className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                    <Download size={16} />
                    Download Report
                  </button>
                </div>
              ) : (
                <div className="h-24 flex items-center justify-center border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-lg">
                  <p className="text-xs text-gray-400 dark:text-gray-500 italic">Report generation pending...</p>
                </div>
              )}
            </div>
          </div>

          {/* User Prompt Recap */}
          {userPrompt && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Original Goal</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{userPrompt}"</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const IntegrationItem = ({ name, status }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-gray-600 dark:text-gray-400">{name}</span>
    <span className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded-full font-bold uppercase">
      {status}
    </span>
  </div>
);

export default CloseOutView;
