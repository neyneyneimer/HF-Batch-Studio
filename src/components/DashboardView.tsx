import React from 'react';
import { BatchJob, BatchResult, Space, JobProfile, HFAccount } from '../types';
import {
  Layers,
  Sparkles,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Play,
  ArrowRight,
  Cpu,
  Video,
  Image as ImageIcon,
  Download,
  FileJson,
} from 'lucide-react';
import { DashboardAnalyticsCard } from './DashboardAnalyticsCard';
import { exportJobsConfigurationJson, exportBulkResultsJson } from '../utils/exportManager';

interface DashboardViewProps {
  jobs: BatchJob[];
  results: BatchResult[];
  spaces: Space[];
  profiles: JobProfile[];
  accounts: HFAccount[];
  onNewBatchClick: () => void;
  onNavigate: (screen: any) => void;
  onSelectResult: (result: BatchResult) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  jobs,
  results,
  spaces,
  profiles,
  accounts,
  onNewBatchClick,
  onNavigate,
  onSelectResult,
}) => {
  const queuedJobs = jobs.filter(j => j.status === 'QUEUED');
  const activeJob = jobs.find(
    j => j.status === 'PREPARING' || j.status === 'GENERATING' || j.status === 'DOWNLOADING'
  );
  const completedJobs = jobs.filter(j => j.status === 'COMPLETED');
  const failedJobs = jobs.filter(j => j.status.startsWith('FAILED_'));

  const quotaExhausted = accounts.some(a => a.quotaStatus === 'EXHAUSTED');

  return (
    <div className="space-y-8 p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Welcome & Quota Notification if applicable */}
      {quotaExhausted && (
        <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <strong className="text-amber-300 font-semibold block text-sm">
              Compute Quota Preserved
            </strong>
            <p className="text-neutral-300 mt-1">
              Your Hugging Face free tier compute quota has been reached on one or more accounts. Pending batch jobs have been safely preserved in queue. Per app policy, accounts are not cycled to evade limits. You can switch to another authorized account or wait for the quota reset.
            </p>
          </div>
        </div>
      )}

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <span className="text-xs text-neutral-300 font-medium">Completed Jobs</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-neutral-100 tabular-nums">
              {completedJobs.length}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-[11px] text-neutral-300 mt-1 block">
            {results.length} outputs saved in gallery
          </span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <span className="text-xs text-neutral-300 font-medium">In Queue</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-neutral-100 tabular-nums">
              {queuedJobs.length}
            </span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-[11px] text-neutral-300 mt-1 block">
            Ordered Room persistence
          </span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <span className="text-xs text-neutral-300 font-medium">Configured Spaces</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-neutral-100 tabular-nums">
              {spaces.length}
            </span>
            <Cpu className="w-4 h-4 text-sky-400" />
          </div>
          <span className="text-[11px] text-neutral-300 mt-1 block">
            {spaces.filter(s => s.type === 'image').length} image · {spaces.filter(s => s.type === 'video').length} video
          </span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <span className="text-xs text-neutral-300 font-medium">Keystore Status</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-neutral-100 tabular-nums">
              {accounts.length}
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-[11px] text-neutral-300 mt-1 block">
            AES-256-GCM hardware encrypted
          </span>
        </div>
      </div>

      {/* Recharts Analytics Summary Card */}
      <DashboardAnalyticsCard jobs={jobs} results={results} />

      {/* Quick JSON Export Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-900/60 border border-neutral-800 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-neutral-300">
          <FileJson className="w-4 h-4 text-amber-400" />
          <span>Portable Studio JSON Backup:</span>
          <span className="text-neutral-500 text-[11px]">Export configuration or results for sharing across app installations</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportJobsConfigurationJson(jobs)}
            disabled={jobs.length === 0}
            className="px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Jobs Config ({jobs.length})</span>
          </button>
          <button
            onClick={() => exportBulkResultsJson(results)}
            disabled={results.length === 0}
            className="px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Results Metadata ({results.length})</span>
          </button>
        </div>
      </div>

      {/* 3-Worker Pipeline Visualizer */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-neutral-100">
              WorkManager 3-Stage Worker Engine
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Decoupled background execution with Gradio queue event recovery and quota preservation
            </p>
          </div>
          {activeJob ? (
            <span className="text-xs font-mono text-amber-400">
              ACTIVE JOB #{activeJob.id.slice(-6)} · {activeJob.progress}%
            </span>
          ) : (
            <span className="text-xs text-neutral-400 font-mono">ENGINE IDLE</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Worker 1 */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              activeJob?.status === 'PREPARING'
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-200 shadow-md'
                : 'bg-neutral-950 border-neutral-800/80 text-neutral-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider uppercase font-mono">
                STAGE 1
              </span>
              <span className="text-xs font-medium">PreparationWorker</span>
            </div>
            <p className="text-xs mt-2 text-neutral-300">
              Validates input dimensions, size limits, and builds indexed Gradio parameters.
            </p>
            <div className="mt-3 text-[11px] font-mono text-neutral-400">
              {activeJob?.status === 'PREPARING' ? activeJob.stageMessage : 'Idle / Ready'}
            </div>
          </div>

          {/* Worker 2 */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              activeJob?.status === 'GENERATING'
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-200 shadow-md'
                : 'bg-neutral-950 border-neutral-800/80 text-neutral-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider uppercase font-mono">
                STAGE 2
              </span>
              <span className="text-xs font-medium">GenerationWorker</span>
            </div>
            <p className="text-xs mt-2 text-neutral-300">
              Submits to Gradio SSE queue, monitors progress, and prevents duplicate submissions.
            </p>
            <div className="mt-3 text-[11px] font-mono text-neutral-400">
              {activeJob?.status === 'GENERATING' ? activeJob.stageMessage : 'Idle / Ready'}
            </div>
          </div>

          {/* Worker 3 */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              activeJob?.status === 'DOWNLOADING'
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-200 shadow-md'
                : 'bg-neutral-950 border-neutral-800/80 text-neutral-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider uppercase font-mono">
                STAGE 3
              </span>
              <span className="text-xs font-medium">DownloadWorker</span>
            </div>
            <p className="text-xs mt-2 text-neutral-300">
              Fetches resulting media blob, verifies MIME integrity, and saves to Room storage.
            </p>
            <div className="mt-3 text-[11px] font-mono text-neutral-400">
              {activeJob?.status === 'DOWNLOADING' ? activeJob.stageMessage : 'Idle / Ready'}
            </div>
          </div>
        </div>

        {/* Active Progress Bar */}
        {activeJob && (
          <div className="mt-4 pt-4 border-t border-neutral-800">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-neutral-300 truncate max-w-md">
                Current Prompt: &ldquo;{activeJob.prompt}&rdquo;
              </span>
              <span className="font-mono text-amber-400 font-semibold">
                {activeJob.progress}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all duration-300 rounded-full"
                style={{ width: `${activeJob.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Two Column Section: Quick Launch & Recent Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Batch Launcher */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-neutral-100">
              Launch Batch Generation
            </h3>
            <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
              Generate multiple images or videos sequentially with matrix prompt expansion, seed variation, and automatic download.
            </p>

            <div className="mt-5 space-y-2">
              <span className="text-[11px] font-semibold text-neutral-300 tracking-wider block">
                POPULAR PROFILES
              </span>
              {profiles.slice(0, 3).map(p => (
                <div
                  key={p.id}
                  onClick={onNewBatchClick}
                  className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800/80 hover:border-amber-400/40 text-xs text-neutral-300 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <span className="truncate">{p.name}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-400 shrink-0 ml-2" />
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onNewBatchClick}
            className="w-full mt-6 py-2.5 px-4 text-xs font-semibold text-neutral-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>New Batch Job</span>
          </button>
        </div>

        {/* Recent Results Preview */}
        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-neutral-100">
                Recent Batch Outputs
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Verified locally stored image and video results
              </p>
            </div>
            <button
              onClick={() => onNavigate('results')}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
            >
              <span>View All ({results.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {results.length === 0 ? (
            <div className="h-48 border border-dashed border-neutral-800 rounded-xl flex flex-col items-center justify-center text-center p-6">
              <ImageIcon className="w-8 h-8 text-neutral-600 mb-2" />
              <p className="text-xs text-neutral-400">No generation outputs yet</p>
              <button
                onClick={onNewBatchClick}
                className="mt-3 text-xs text-amber-400 hover:underline"
              >
                Start your first batch
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {results.slice(0, 4).map(res => (
                <div
                  key={res.id}
                  onClick={() => onSelectResult(res)}
                  className="group relative aspect-square rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 hover:border-amber-400/50 cursor-pointer transition-all"
                >
                  <img
                    src={res.mediaUrl}
                    alt={res.prompt}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-end">
                    <span className="text-[10px] text-white font-medium line-clamp-2">
                      {res.prompt}
                    </span>
                    <span className="text-[9px] text-amber-300 font-mono mt-0.5">
                      Seed: {res.seed}
                    </span>
                  </div>
                  {res.type === 'video' && (
                    <div className="absolute top-2 right-2 bg-black/60 rounded px-1.5 py-0.5 text-[9px] text-white font-mono flex items-center gap-1">
                      <Video className="w-2.5 h-2.5" />
                      VID
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
