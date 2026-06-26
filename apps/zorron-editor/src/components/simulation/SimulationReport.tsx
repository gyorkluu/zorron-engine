/**
 * SimulationReport - displays the results of a Monte Carlo simulation.
 *
 * Shows:
 * - Summary stats (total runs, dead ends, timeouts).
 * - A bar chart of settlement result distribution.
 * - A node hit-rate table (with low-hit nodes highlighted).
 * - Mean and std-dev of the final personality vectors.
 *
 * The bar chart is rendered with pure SVG (no chart library dependency) to
 * keep the bundle small and avoid lazy-loading complexity.
 */

import { memo, useMemo } from 'react';
import type { SimulationReport } from '@/engine/simulator';
import { useEditorStore } from '@/stores/editorStore';
import { NODE_TYPE_LABELS } from '@/types/flow';
import { downloadJson } from '@/utils/fileIO';
import { useT } from '@/i18n/useT';

/** Props for the SimulationReport. */
export interface SimulationReportProps {
  report: SimulationReport;
  /** Called when the user closes the report. */
  onClose?: () => void;
}

/** A single bar in the chart. */
interface Bar {
  label: string;
  count: number;
  rate: number;
  color: string;
}

/** Color palette for the bars. */
const BAR_COLORS = [
  '#22d3ee',
  '#a78bfa',
  '#f472b6',
  '#34d399',
  '#f59e0b',
  '#60a5fa',
  '#fb7185',
  '#94a3b8',
];

function SimulationReportImpl({ report, onClose }: SimulationReportProps) {
  const { t } = useT();
  const nodes = useEditorStore((s) => s.nodes);

  /** Build the settlement distribution bars. */
  const settlementBars: Bar[] = useMemo(() => {
    const entries = Object.entries(report.settlementResultHits);
    if (entries.length === 0) return [];
    const total = report.totalRuns || 1;
    return entries
      .sort((a, b) => b[1] - a[1])
      .map(([label, count], i) => ({
        label,
        count,
        rate: count / total,
        color: BAR_COLORS[i % BAR_COLORS.length],
      }));
  }, [report.settlementResultHits, report.totalRuns]);

  /** Build the node hit-rate rows. */
  const nodeRows = useMemo(() => {
    return nodes
      .map((n) => {
        const hits = report.nodeHits[n.id] ?? 0;
        const rate = report.nodeHitRates[n.id] ?? 0;
        return {
          id: n.id,
          label:
            (n.data as { label?: string }).label ??
            NODE_TYPE_LABELS[n.type as keyof typeof NODE_TYPE_LABELS] ??
            n.type,
          type: n.type,
          hits,
          rate,
        };
      })
      .sort((a, b) => b.hits - a.hits);
  }, [nodes, report.nodeHits, report.nodeHitRates]);

  /** Export the report as JSON. */
  const handleExport = () => {
    // Strip the large `runs` and `finalVectors` arrays for a compact report.
    const compact = {
      totalRuns: report.totalRuns,
      nodeHits: report.nodeHits,
      nodeHitRates: report.nodeHitRates,
      settlementHits: report.settlementHits,
      settlementResultHits: report.settlementResultHits,
      meanVector: report.meanVector,
      stdDevVector: report.stdDevVector,
      deadEnds: report.deadEnds,
      timedOuts: report.timedOuts,
    };
    downloadJson('simulation-report', compact);
  };

  const maxBarCount = Math.max(1, ...settlementBars.map((b) => b.count));

  return (
    <div
      className="flex h-full flex-col gap-4 overflow-y-auto p-4"
      data-testid="simulation-report"
    >
      {/* Summary */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard label={t('sim.stat.runs')} value={report.totalRuns} color="text-cyan-300" />
        <StatCard
          label={t('sim.stat.settlements')}
          value={Object.values(report.settlementHits).reduce((a, b) => a + b, 0)}
          color="text-emerald-300"
        />
        <StatCard label={t('sim.stat.deadEnds')} value={report.deadEnds} color="text-amber-300" />
        <StatCard label={t('sim.stat.timeouts')} value={report.timedOuts} color="text-rose-300" />
      </div>

      {/* Settlement distribution chart */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          {t('sim.distribution')}
        </h3>
        {settlementBars.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-500">
            {t('sim.noSettlements')}
          </p>
        ) : (
          <div className="space-y-2">
            {settlementBars.map((bar) => (
              <div key={bar.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate text-slate-200">{bar.label}</span>
                  <span className="font-mono text-slate-400">
                    {bar.count} ({(bar.rate * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(bar.count / maxBarCount) * 100}%`,
                      background: bar.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Vector statistics */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          {t('sim.vectorStats')}
        </h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <VectorStat
            label={t('sim.axis')}
            value={t('sim.meanStd')}
            header
          />
          <VectorStat label="X" value="" header />
          <VectorStat label="Y" value="" header />
          <VectorStat
            label={t('sim.mean')}
            value={report.meanVector.x.toFixed(2)}
          />
          <VectorStat
            label=""
            value={report.meanVector.y.toFixed(2)}
          />
          <VectorStat
            label=""
            value={report.meanVector.z.toFixed(2)}
          />
          <VectorStat
            label={t('sim.stddev')}
            value={report.stdDevVector.x.toFixed(2)}
          />
          <VectorStat
            label=""
            value={report.stdDevVector.y.toFixed(2)}
          />
          <VectorStat
            label=""
            value={report.stdDevVector.z.toFixed(2)}
          />
        </div>
      </div>

      {/* Node hit rates */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          {t('sim.reachability')}
        </h3>
        <div className="space-y-1">
          {nodeRows.map((row) => {
            const isLow = row.rate < 0.05;
            const isZero = row.hits === 0;
            return (
              <div
                key={row.id}
                className={`flex items-center justify-between rounded-md px-2 py-1 text-xs ${
                  isZero
                    ? 'bg-rose-500/10 text-rose-300'
                    : isLow
                      ? 'bg-amber-500/10 text-amber-300'
                      : 'text-slate-200'
                }`}
              >
                <span className="truncate">
                  <span className="font-mono text-[10px] text-slate-500">[{row.type}]</span>{' '}
                  {row.label}
                </span>
                <span className="font-mono">
                  {row.hits} ({(row.rate * 100).toFixed(1)}%)
                </span>
              </div>
            );
          })}
          {nodeRows.length === 0 && (
            <p className="py-2 text-center text-xs text-slate-500">
              {t('sim.noNodes')}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleExport}
          className="flex-1 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
        >
          {t('sim.export')}
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
          >
            {t('sim.close')}
          </button>
        )}
      </div>
    </div>
  );
}

/** A small stat card. */
function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2 text-center">
      <div className={`font-mono text-lg ${color}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
    </div>
  );
}

/** A vector stat cell. */
function VectorStat({
  label,
  value,
  header = false,
}: {
  label: string;
  value: string;
  header?: boolean;
}) {
  return (
    <div className="rounded-md bg-slate-900/60 p-1.5">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div
        className={`font-mono text-sm ${
          header ? 'text-slate-400' : 'text-cyan-300'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

export const SimulationReportView = memo(SimulationReportImpl);
