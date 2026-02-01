import { useState, useCallback } from 'react';
import type { ToolType, AnalysisResult, KpiStats } from '@shared/schema';

// Mock types for our simulation
type AnalysisRequest = {
  filename?: string;
  content?: string;
  toolType: ToolType;
};

// Initial KPI stats
const INITIAL_STATS: KpiStats = {
  total: 124,
  rejected: 12,
  manual: 5,
  approved: 107
};

// Helper to generate mock results based on deterministic rules
function generateMockResult(req: AnalysisRequest): AnalysisResult {
  const isFake = (req.filename || req.content || "").toLowerCase().includes("_fake");
  const isReal = (req.filename || req.content || "").toLowerCase().includes("_real");
  
  // Default to uncertain/manual review unless specified
  let riskScore = Math.floor(Math.random() * 20) + 40; // 40-60
  let priority = "MEDIUM";
  let decision = "MANUAL_REVIEW";
  let evidence: string[] = ["Inconclusive metadata patterns", "Standard encoding detected"];

  if (isFake) {
    riskScore = Math.floor(Math.random() * 10) + 88; // 88-98
    priority = "CRITICAL";
    decision = "REJECT";
    evidence = [
      "High probability of digital manipulation",
      "Inconsistent error level analysis (ELA)",
      "Metadata anomalies detected in header"
    ];
    if (req.toolType === 'fact-check') {
      evidence = [
        "Contradicts verified sources (Reuters, AP)",
        "Language matches known disinformation patterns",
        "Source domain has low trust score"
      ];
    }
  } else if (isReal) {
    riskScore = Math.floor(Math.random() * 10) + 2; // 2-12
    priority = "LOW";
    decision = "APPROVE";
    evidence = [
      "Verified digital signature present",
      "Consistent sensor pattern noise",
      "No manipulation traces found"
    ];
    if (req.toolType === 'fact-check') {
      evidence = [
        "Corroborated by multiple credible sources",
        "Text consistent with established timeline",
        "No known bias detected"
      ];
    }
  }

  return {
    id: Math.floor(Math.random() * 100000),
    filename: req.filename || `text_analysis_${Date.now()}.txt`,
    toolType: req.toolType,
    riskScore,
    priority,
    decision,
    evidence,
    actionRequired: decision === "MANUAL_REVIEW" ? "Analyst verification needed" : null,
    timestamp: new Date(),
  };
}

export function useAnalysisSimulation() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [stats, setStats] = useState<KpiStats>(INITIAL_STATS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const runAnalysis = useCallback(async (req: AnalysisRequest) => {
    setIsAnalyzing(true);
    setToastMessage("Uploading and processing...");
    
    // Simulate network latency (1.5s)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const newResult = generateMockResult(req);
    
    setResults(prev => [newResult, ...prev]);
    setIsAnalyzing(false);
    setToastMessage("Analysis complete");
    
    // Auto-update stats based on the result
    setStats(prev => ({
      ...prev,
      total: prev.total + 1,
      approved: newResult.decision === "APPROVE" ? prev.approved + 1 : prev.approved,
      rejected: newResult.decision === "REJECT" ? prev.rejected + 1 : prev.rejected,
      manual: newResult.decision === "MANUAL_REVIEW" ? prev.manual + 1 : prev.manual,
    }));

    // Clear toast after 3s
    setTimeout(() => setToastMessage(null), 3000);
    
    return newResult;
  }, []);

  const updateDecision = useCallback((id: number, decision: "APPROVE" | "REJECT") => {
    setResults(prev => prev.map(r => {
      if (r.id === id && r.decision !== decision) {
        // Adjust stats if changing decision
        setStats(curr => {
          const newStats = { ...curr };
          // Decrement old category
          if (r.decision === "APPROVE") newStats.approved--;
          else if (r.decision === "REJECT") newStats.rejected--;
          else if (r.decision === "MANUAL_REVIEW") newStats.manual--;
          
          // Increment new category
          if (decision === "APPROVE") newStats.approved++;
          else if (decision === "REJECT") newStats.rejected++;
          
          return newStats;
        });
        
        return { ...r, decision, actionRequired: null };
      }
      return r;
    }));
  }, []);

  return {
    isAnalyzing,
    results,
    stats,
    toastMessage,
    runAnalysis,
    updateDecision
  };
}
