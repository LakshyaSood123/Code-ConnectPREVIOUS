import React, { useState } from 'react';
import { NavBar } from '@/components/NavBar';
import { KpiTiles } from '@/components/KpiTiles';
import { MainCard } from '@/components/MainCard';
import { ResultRow } from '@/components/ResultRow';
import { useAnalysisSimulation } from '@/hooks/use-analysis-simulation';
import { ToolType } from '@shared/schema';
import { 
  FileText, 
  Search, 
  AlertOctagon, 
  Globe, 
  MapPin, 
  Download,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const TABS: { id: ToolType; label: string; icon: any }[] = [
  { id: 'document', label: 'Document', icon: FileText },
  { id: 'fact-check', label: 'Fact Check', icon: Search },
  { id: 'propaganda', label: 'Propaganda', icon: AlertOctagon },
  { id: 'metadata', label: 'Metadata', icon: Globe },
  { id: 'geo', label: 'Geolocation', icon: MapPin },
];

export default function Home() {
  const [activeTool, setActiveTool] = useState<ToolType>('document');
  const { 
    isAnalyzing, 
    results, 
    stats, 
    toastMessage, 
    runAnalysis, 
    updateDecision 
  } = useAnalysisSimulation();

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(results, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "verification_report.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-20 font-sans">
      <NavBar />
      
      <main className="container mx-auto px-4 pt-8">
        {/* Hero Section */}
        <div className="mb-10 text-center md:text-left">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-4"
          >
            <div>
              <h1 className="heading-1 mb-2">Advanced Verification</h1>
              <p className="text-xl text-[var(--muted)] max-w-2xl">
                Analyze digital assets using AI-driven forensics, semantic analysis, and metadata verification.
              </p>
            </div>
            
            <button 
              onClick={handleExport}
              disabled={results.length === 0}
              className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </motion.div>
        </div>

        {/* KPI Tiles */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.1 }}
        >
          <KpiTiles stats={stats} />
        </motion.div>

        {/* Tool Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-[var(--border)] pb-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTool === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTool(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 rounded-t-lg font-medium text-sm transition-all relative top-[1px]",
                  isActive 
                    ? "text-[var(--accent)] bg-[var(--panel)] border-x border-t border-[var(--border)]" 
                    : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/5"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-[var(--accent)]" : "text-[var(--muted)]")} />
                {tab.label}
                {isActive && (
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-[var(--accent)] rounded-t-lg" />
                )}
              </button>
            );
          })}
        </div>

        {/* Main Analysis Card */}
        <motion.div
           key={activeTool}
           initial={{ opacity: 0, x: -10 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ duration: 0.2 }}
        >
          <MainCard 
            activeTool={activeTool} 
            onAnalyze={(data) => runAnalysis({ ...data, toolType: activeTool })}
            isAnalyzing={isAnalyzing}
          />
        </motion.div>

        {/* Results Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="heading-2">Recent Analysis</h2>
            <span className="text-sm text-[var(--muted)]">
              Showing {results.length} results
            </span>
          </div>

          <div className="space-y-4">
            <AnimatePresence>
              {results.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20 border border-dashed border-[var(--border)] rounded-xl bg-[var(--panel2)]"
                >
                  <div className="w-16 h-16 rounded-full bg-[var(--border)] flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-[var(--muted)]" />
                  </div>
                  <h3 className="text-lg font-medium text-[var(--text)] mb-1">No analysis yet</h3>
                  <p className="text-[var(--muted)]">Upload a file or paste text to begin verification.</p>
                </motion.div>
              ) : (
                results.map((result) => (
                  <ResultRow 
                    key={result.id} 
                    result={result}
                    onApprove={(id) => updateDecision(id, 'APPROVE')}
                    onReject={(id) => updateDecision(id, 'REJECT')}
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Floating Processing Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-8 right-8 z-50 bg-[var(--panel)] border border-[var(--border)] shadow-2xl rounded-lg p-4 flex items-center gap-3 pr-6"
          >
            {isAnalyzing ? (
               <Loader2 className="w-5 h-5 text-[var(--accent)] animate-spin" />
            ) : (
               <div className="w-2 h-2 rounded-full bg-[var(--ok)]" />
            )}
            <span className="font-medium text-[var(--text)] text-sm">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
