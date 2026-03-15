import React from 'react';
import { motion } from 'framer-motion';
import PhaseStepper from '../navigation/PhaseStepper';
import MetricsPanel from '../metrics/MetricsPanel';
import GELPanel from '../metrics/GELPanel';
import AnchorToggle from '../versions/AnchorToggle';
import { usePipeline, PHASES } from '../../context/PipelineContext';
import { LayoutDashboard, Settings, HelpCircle, Bell, Download, FileText } from 'lucide-react';

const MainLayout = ({ children }) => {
  const { activePhase, anchorVersion, downloadAuditLog, userPrompt } = usePipeline();

  const handleExportAuditLog = () => {
    downloadAuditLog();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex text-gray-900 w-full">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">V</div>
            <h1 className="text-xl font-black tracking-tight text-blue-900">VERDICT</h1>
          </div>
          
          <nav className="space-y-1">
            <NavItem icon={<LayoutDashboard size={18} />} label="Pipeline Dashboard" active />
            <NavItem icon={<Settings size={18} />} label="System Settings" />
            <NavItem icon={<HelpCircle size={18} />} label="Documentation" />
          </nav>
        </div>
        
        <div className="mt-auto p-6 space-y-4">
          {/* Audit Log Export */}
          {userPrompt && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={handleExportAuditLog}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors border border-gray-200"
            >
              <FileText size={18} />
              Export Audit Log
            </motion.button>
          )}
          
          <div className="bg-blue-50 p-4 rounded-xl">
            <p className="text-xs font-semibold text-blue-700 uppercase mb-1">Current Version</p>
            <p className="text-sm font-bold text-blue-900">{anchorVersion.toUpperCase()} Stable</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-gray-800">{activePhase} Phase</h2>
            <div className="h-4 w-px bg-gray-300" />
            <AnchorToggle />
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Bell size={20} />
            </button>
            <div className="w-8 h-8 rounded-full bg-gray-200" />
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <PhaseStepper />
            </div>

            <div className="flex gap-8 items-start">
              <div className="flex-1 min-w-0">
                {children}
              </div>
              <aside className="hidden xl:block space-y-6">
                <MetricsPanel />
                <GELPanel />
              </aside>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, active = false }) => (
  <a 
    href="#" 
    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      active ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
    }`}
  >
    {icon}
    {label}
  </a>
);

export default MainLayout;
