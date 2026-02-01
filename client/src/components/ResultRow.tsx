import React from 'react';
import { AnalysisResult } from '@shared/schema';
import { 
  AlertCircle, 
  Check, 
  X, 
  File, 
  Globe, 
  MapPin, 
  Search,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ResultRowProps {
  result: AnalysisResult;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}

export function ResultRow({ result, onApprove, onReject }: ResultRowProps) {
  const [expanded, setExpanded] = React.useState(false);

  const getIcon = () => {
    switch (result.toolType) {
      case 'document': return <File className="w-5 h-5 text-blue-400" />;
      case 'fact-check': return <Search className="w-5 h-5 text-purple-400" />;
      case 'propaganda': return <ShieldAlert className="w-5 h-5 text-red-400" />;
      case 'geo': return <MapPin className="w-5 h-5 text-green-400" />;
      case 'metadata': return <Globe className="w-5 h-5 text-orange-400" />;
      default: return <File className="w-5 h-5" />;
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 80) return "text-red-500 bg-red-500/10 border-red-500/20";
    if (score >= 50) return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
    return "text-green-500 bg-green-500/10 border-green-500/20";
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-muted mb-3 overflow-hidden"
    >
      {/* Header Row */}
      <div 
        className="p-4 flex flex-col md:flex-row items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4 flex-1 w-full">
          <div className="p-2 bg-white/5 rounded-lg border border-white/10">
            {getIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-white truncate">{result.filename}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                {result.toolType}
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">
                {new Date(result.timestamp || Date.now()).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
          <div className={cn(
            "px-3 py-1 rounded-full text-xs font-bold border",
            getRiskColor(result.riskScore)
          )}>
            RISK SCORE: {result.riskScore}%
          </div>

          <div className="flex items-center gap-3">
             <div className={cn(
               "px-3 py-1 rounded-md text-xs font-bold uppercase",
               result.decision === "APPROVE" && "text-green-400",
               result.decision === "REJECT" && "text-red-400",
               result.decision === "MANUAL_REVIEW" && "text-yellow-400",
             )}>
               {result.decision.replace('_', ' ')}
             </div>
             <ChevronRight className={cn(
               "w-5 h-5 text-muted-foreground transition-transform duration-200",
               expanded && "rotate-90"
             )} />
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/5 bg-black/20"
          >
            <div className="p-4 md:p-6 grid md:grid-cols-2 gap-6">
              <div>
                <h5 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-brand-primary" />
                  Key Evidence
                </h5>
                <ul className="space-y-2">
                  {result.evidence.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-white/30 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col justify-between">
                <div>
                   <h5 className="text-sm font-semibold text-white mb-3">Analysis Priority</h5>
                   <span className={cn(
                     "inline-block px-3 py-1 rounded text-xs font-bold mb-4",
                     result.priority === "CRITICAL" ? "bg-red-500/20 text-red-400" :
                     result.priority === "MEDIUM" ? "bg-yellow-500/20 text-yellow-400" :
                     "bg-green-500/20 text-green-400"
                   )}>
                     {result.priority} PRIORITY
                   </span>
                </div>

                <div className="flex gap-3 mt-4">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onApprove(result.id); }}
                    className="flex-1 btn btn-secondary border-green-900/30 hover:bg-green-900/20 hover:text-green-400 hover:border-green-800"
                  >
                    <Check className="w-4 h-4" />
                    Approve
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onReject(result.id); }}
                    className="flex-1 btn btn-secondary border-red-900/30 hover:bg-red-900/20 hover:text-red-400 hover:border-red-800"
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
