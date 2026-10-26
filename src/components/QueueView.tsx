import React from 'react';
import { BatchJob, Space } from '../types';
import { BatchQueueEngine } from '../utils/queueEngine';
import {
  Layers,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  XCircle,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Cpu,
  Video,
  Image as ImageIcon,
  FileJson,
  Download,
} from 'lucide-react';
import { exportJobsConfigurationJson } from '../utils/exportManager';

interface QueueViewProps {
  jobs: BatchJob[];
  spaces: Space[];
  queueRunning: boolean;
  queuePaused: boolean;
  onToggleQueue: () => void;
  onNewBatchClick: () => void;
}

export const QueueView: React.FC<QueueViewProps> = ({
  jobs,
  spaces,
  queueRunning,
  queuePaused,
  onToggleQueue,
  onNewBatchClick,
}) => {
  const engine = BatchQueueEngine.getInstance();

  const handleClearCompleted = () => {
    engine.clearCompleted();
  };

  const activeJob = jobs.find(
    j => j.status === 'PREPARING' || j.status === 'GENERATING' || j.status === 'DOWNLOADING'
  );

  const getStatusBadge = (status: BatchJob['status']) => {
    switch (status) {
      case 'QUEUED':
        return <span className="text-xs text-neutral-400 font-mono">QUEUED</span>;
      case 'PREPARING':
        return <span className="text-xs text-amber-400 font-mono font-semibold">PREPARING (WORKER 1)</span>;
      case 'GENERATING':
        return <span className="text-xs text-amber-400 font-mono font-semibold">GENERATING (WORKER 2)</span>;
      case 'DOWNLOADING':
        return <span className="text-xs text-sky-400 font-mono font-semibold">DOWNLOADING (WORKER 3)</span>;
      case 'COMPLETED':
        return <span className="text-xs text-emerald-400 font-mono font-semibold">COMPLETED</span>;
      case 'PAUSED':
        return <span className="text-xs text-neutral-400 font-mono">PAUSED</span>;
      case 'FAILED_QUOTA_EXHAUSTED':
        return <span className="text-xs text-red-400 font-mono font-semibold">QUOTA EXHAUSTED</span>;
      case 'FAILED_AUTH':
        return <span className="text-xs text-red-400 font-mono font-semibold">AUTH FAILED</span>;
      case 'FAILED_TIMEOUT':
        return <span className="text-xs text-red-400 font-mono">TIMED OUT</span>;
      case 'CANCELLED':
        return <span className="text-xs text-neutral-400 font-mono">CANCELLED</span>;
      default:
        return <span className="text-xs text-red-400 font-mono">FAILED</span>;
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header and Queue Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-100 tracking-tight">
            Batch Execution Queue
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Ordered Room-persisted job queue with decoupled Preparation, Generation, and Download workers
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => exportJobsConfigurationJson(jobs)}
            disabled={jobs.length === 0}
            className="px-3.5 py-2 text-xs font-medium text-neutral-300 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40"
          >
            <FileJson className="w-4 h-4 text-amber-400" />
            <span>Export Config JSON</span>
          </button>

          <button
            onClick={onToggleQueue}
            className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 ${
              queuePaused
                ? 'bg-amber-400 text-neutral-950 border-amber-400 hover:bg-amber-300'
                : 'bg-neutral-800 text-neutral-200 border-neutral-700 hover:bg-neutral-700'
            }`}
          >
            {queuePaused ? (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Resume Processing</span>
              </>
            ) : (
              <>
                <Pause className="w-4 h-4" />
                <span>Pause Queue</span>
              </>
            )}
          </button>

          <button
            onClick={handleClearCompleted}
            disabled={!jobs.some(j => j.status === 'COMPLETED' || j.status === 'CANCELLED')}
            className="px-3 py-2 text-xs font-medium text-neutral-400 hover:text-neutral-200 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Clear Completed
          </button>
        </div>
      </div>

      {/* Active Pipeline Status Banner */}
      {activeJob && (
        <div className="bg-neutral-900 border border-amber-400/30 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <strong className="text-neutral-100 font-semibold">
                Processing Job #{activeJob.id.slice(-6)}
              </strong>
              <span className="text-neutral-400">·</span>
              <span className="text-neutral-300">{activeJob.stageMessage}</span>
            </div>
            <div className="flex items-center gap-4 font-mono text-xs">
              {activeJob.queuePosition !== undefined && activeJob.queuePosition > 0 && (
                <span className="text-neutral-400">
                  Gradio Queue Pos: #{activeJob.queuePosition}
                </span>
              )}
              {activeJob.etaSeconds !== undefined && (
                <span className="text-neutral-400">ETA: ~{activeJob.etaSeconds}s</span>
              )}
              <span className="text-amber-400 font-bold">{activeJob.progress}%</span>
            </div>
          </div>

          <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
            <div
              className="h-full bg-amber-400 transition-all duration-300 rounded-full"
              style={{ width: `${activeJob.progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span className="truncate max-w-xl">&ldquo;{activeJob.prompt}&rdquo;</span>
            <span className="font-mono">Seed: {activeJob.seed}</span>
          </div>
        </div>
      )}

      {/* Queue Job Table */}
      {jobs.length === 0 ? (
        <div className="p-12 border border-dashed border-neutral-800 rounded-2xl text-center bg-neutral-950 flex flex-col items-center justify-center">
          <Layers className="w-10 h-10 text-neutral-600 mb-3" />
          <h3 className="text-sm font-semibold text-neutral-300">Queue is currently empty</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm">
            Launch a new batch generation from a Job Profile or custom Space to populate the queue.
          </p>
          <button
            onClick={onNewBatchClick}
            className="mt-4 px-4 py-2 text-xs font-semibold text-neutral-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors"
          >
            Create Batch Job
          </button>
        </div>
      ) : (
        <div className="border border-neutral-800 rounded-2xl overflow-hidden bg-neutral-900 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 font-mono">
                <tr>
                  <th className="py-3 px-4 font-medium w-16">Order</th>
                  <th className="py-3 px-4 font-medium">Prompt & Target Space</th>
                  <th className="py-3 px-4 font-medium w-28">Seed</th>
                  <th className="py-3 px-4 font-medium w-48">Status & Stage</th>
                  <th className="py-3 px-4 font-medium text-right w-36">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 text-neutral-300">
                {jobs.map((job, index) => {
                  const space = spaces.find(s => s.id === job.spaceId);
                  const isRunning =
                    job.status === 'PREPARING' ||
                    job.status === 'GENERATING' ||
                    job.status === 'DOWNLOADING';
                  const isFailed = job.status.startsWith('FAILED_');

                  return (
                    <tr
                      key={job.id}
                      className={`hover:bg-neutral-800/40 transition-colors ${
                        isRunning ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      {/* Order & Reorder Controls */}
                      <td className="py-3 px-4 font-mono text-neutral-500">
                        <div className="flex items-center gap-1">
                          <span>#{index + 1}</span>
                          {!isRunning && job.status === 'QUEUED' && (
                            <div className="flex flex-col ml-1">
                              <button
                                onClick={() => engine.reorderJobs(job.id, 'up')}
                                disabled={index === 0}
                                className="text-neutral-500 hover:text-neutral-200 disabled:opacity-20"
                                title="Move up"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => engine.reorderJobs(job.id, 'down')}
                                disabled={index === jobs.length - 1}
                                className="text-neutral-500 hover:text-neutral-200 disabled:opacity-20"
                                title="Move down"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Prompt & Details */}
                      <td className="py-3 px-4 max-w-md">
                        <div className="font-medium text-neutral-100 truncate">
                          {job.prompt}
                        </div>
                        <div className="text-[11px] text-neutral-500 mt-0.5 flex items-center gap-2">
                          <span>{space?.name || job.spaceId}</span>
                          {space?.type === 'video' ? (
                            <span className="flex items-center gap-0.5 text-purple-400">
                              <Video className="w-3 h-3" /> Video
                            </span>
                          ) : (
                            <span className="flex items-center gap-0.5 text-sky-400">
                              <ImageIcon className="w-3 h-3" /> Image
                            </span>
                          )}
                          {job.inputMediaName && (
                            <span>· Media: {job.inputMediaName}</span>
                          )}
                        </div>
                        {isFailed && job.errorDetails && (
                          <div className="mt-1 text-[11px] text-red-400 bg-red-950/30 p-1.5 rounded border border-red-900/40">
                            {job.errorDetails}
                          </div>
                        )}
                      </td>

                      {/* Seed */}
                      <td className="py-3 px-4 font-mono text-neutral-300">
                        {job.seed}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5">
                          {getStatusBadge(job.status)}
                          <span className="text-[11px] text-neutral-400 truncate max-w-[180px]">
                            {job.stageMessage}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isFailed && (
                            <button
                              onClick={() => engine.retryJob(job.id)}
                              title="Retry Job"
                              className="p-1.5 text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 rounded transition-colors"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isRunning && (
                            <button
                              onClick={() => engine.cancelJob(job.id)}
                              title="Cancel Job"
                              className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!isRunning && (
                            <button
                              onClick={() => engine.removeJob(job.id)}
                              title="Remove from Queue"
                              className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
