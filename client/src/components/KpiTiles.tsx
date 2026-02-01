import React from 'react';
import type { KpiStats } from '@shared/schema';
import { Activity, AlertTriangle, CheckCircle, FileText } from 'lucide-react';

interface KpiTilesProps {
  stats: KpiStats;
}

export function KpiTiles({ stats }: KpiTilesProps) {
  return (
    <div className="flex flex-wrap gap-4 mb-8">
      {/* Total Scanned */}
      <div className="flex-1 min-w-[140px] p-3 rounded-lg border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow)] border-l-4 border-l-[var(--chart-teal)]">
        <h3 className="text-2xl font-bold text-center text-[var(--text)]">{stats.total}</h3>
        <p className="text-[var(--muted)] text-xs font-medium uppercase tracking-wider text-center mt-1">Total Files</p>
      </div>

      {/* Rejected */}
      <div className="flex-1 min-w-[140px] p-3 rounded-lg border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow)] border-l-4 border-l-[var(--danger)]">
        <h3 className="text-2xl font-bold text-center text-[var(--text)]">{stats.rejected}</h3>
        <p className="text-[var(--muted)] text-xs font-medium uppercase tracking-wider text-center mt-1">Rejected</p>
      </div>

      {/* Manual Review */}
      <div className="flex-1 min-w-[140px] p-3 rounded-lg border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow)] border-l-4 border-l-[var(--chart-orange)]">
        <h3 className="text-2xl font-bold text-center text-[var(--text)]">{stats.manual}</h3>
        <p className="text-[var(--muted)] text-xs font-medium uppercase tracking-wider text-center mt-1">Manual Review</p>
      </div>

      {/* Approved */}
      <div className="flex-1 min-w-[140px] p-3 rounded-lg border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow)] border-l-4 border-l-[var(--ok)]">
        <h3 className="text-2xl font-bold text-center text-[var(--text)]">{stats.approved}</h3>
        <p className="text-[var(--muted)] text-xs font-medium uppercase tracking-wider text-center mt-1">Approved</p>
      </div>
    </div>
  );
}
