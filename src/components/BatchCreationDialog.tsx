import React, { useState } from 'react';
import { JobProfile, Space, BatchJob } from '../types';
import { expandPromptMatrix, parseBulkPrompts, calculateSeed } from '../utils/promptMatrix';
import { preflightMedia, fileToDataUrl } from '../utils/preflight';
import { BatchQueueEngine } from '../utils/queueEngine';
import { X, Sparkles, Upload, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';

interface BatchCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: JobProfile[];
  spaces: Space[];
}

export const BatchCreationDialog: React.FC<BatchCreationDialogProps> = ({
  isOpen,
  onClose,
  profiles,
  spaces,
}) => {
  if (!isOpen) return null;

  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    profiles[0]?.id || ''
  );
  const currentProfile = profiles.find(p => p.id === selectedProfileId) || profiles[0];
  const targetSpace = spaces.find(s => s.id === currentProfile?.spaceId);

  const [inputMode, setInputMode] = useState<'matrix' | 'bulk'>('matrix');
  const [templatePrompt, setTemplatePrompt] = useState<string>(
    currentProfile?.promptTemplate || 'A cinematic photograph of a {cybernetic tiger|mystic wolf} in {a neon city|deep space}, 8k'
  );
  const [negativePrompt, setNegativePrompt] = useState<string>(
    currentProfile?.negativePrompt || ''
  );
  const [bulkText, setBulkText] = useState<string>('');
  const [seedStrategy, setSeedStrategy] = useState<'sequential' | 'random' | 'fixed'>(
    currentProfile?.seedStrategy || 'sequential'
  );
  const [baseSeed, setBaseSeed] = useState<number>(currentProfile?.baseSeed || 1000);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaDataUrl, setMediaDataUrl] = useState<string | null>(null);
  const [preflightStatus, setPreflightStatus] = useState<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    info?: any;
  } | null>(null);

  // Live matrix preview
  const matrixExpansions = inputMode === 'matrix' ? expandPromptMatrix(templatePrompt) : [];
  const bulkParsed = inputMode === 'bulk' ? parseBulkPrompts(bulkText) : [];
  const totalItemCount = inputMode === 'matrix' ? matrixExpansions.length : bulkParsed.length;

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaFile(file);
    try {
      const dataUrl = await fileToDataUrl(file);
      setMediaDataUrl(dataUrl);

      const check = await preflightMedia(file);
      setPreflightStatus({
        valid: check.valid,
        errors: check.errors,
        warnings: check.warnings,
        info: check.fileInfo,
      });
    } catch (err: any) {
      setPreflightStatus({
        valid: false,
        errors: [err.message || 'Failed to inspect media file'],
        warnings: [],
      });
    }
  };

  const handleEnqueue = () => {
    if (totalItemCount === 0) return;

    const newJobs: BatchJob[] = [];
    const promptsToEnqueue: Array<{ prompt: string; neg?: string; explicitSeed?: number }> =
      inputMode === 'matrix'
        ? matrixExpansions.map(p => ({ prompt: p, neg: negativePrompt }))
        : bulkParsed.map(b => ({ prompt: b.prompt, neg: b.negativePrompt || negativePrompt, explicitSeed: b.seed }));

    promptsToEnqueue.forEach((item, index) => {
      const assignedSeed =
        item.explicitSeed !== undefined
          ? item.explicitSeed
          : calculateSeed(seedStrategy, baseSeed, index);

      const job: BatchJob = {
        id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${index}`,
        profileId: currentProfile.id,
        spaceId: currentProfile.spaceId,
        prompt: item.prompt,
        negativePrompt: item.neg || '',
        seed: assignedSeed,
        params: {
          width: currentProfile.width,
          height: currentProfile.height,
          steps: currentProfile.numInferenceSteps,
          guidance: currentProfile.guidanceScale,
          numFrames: currentProfile.numFrames,
          fps: currentProfile.fps,
        },
        inputMediaData: mediaDataUrl || undefined,
        inputMediaName: mediaFile?.name,
        status: 'QUEUED',
        stage: 'idle',
        stageMessage: 'Waiting in ordered batch queue...',
        progress: 0,
        retryCount: 0,
        maxRetries: currentProfile.maxRetries || 2,
        createdAt: Date.now() + index,
      };

      newJobs.push(job);
    });

    BatchQueueEngine.getInstance().addJobs(newJobs);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-semibold text-neutral-100">
              Create Batch Generation
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm flex-1">
          {/* Profile Selector */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              Select Job Profile
            </label>
            <select
              value={selectedProfileId}
              onChange={e => {
                setSelectedProfileId(e.target.value);
                const prof = profiles.find(p => p.id === e.target.value);
                if (prof) {
                  setTemplatePrompt(prof.promptTemplate);
                  setNegativePrompt(prof.negativePrompt);
                  setSeedStrategy(prof.seedStrategy);
                  setBaseSeed(prof.baseSeed);
                }
              }}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 focus:outline-none focus:border-amber-400"
            >
              {profiles.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} · Space: {spaces.find(s => s.id === p.spaceId)?.name || p.spaceId}
                </option>
              ))}
            </select>
            {targetSpace && (
              <div className="mt-1 text-xs text-neutral-400">
                Type: {targetSpace.type} · Protocol: {targetSpace.apiProtocol} · Endpoint: {currentProfile.endpoint}
              </div>
            )}
          </div>

          {/* Input Mode Selector */}
          <div className="flex border-b border-neutral-800 gap-6">
            <button
              onClick={() => setInputMode('matrix')}
              className={`pb-2 text-xs font-medium transition-colors ${
                inputMode === 'matrix'
                  ? 'border-b-2 border-amber-400 text-amber-400 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Prompt Matrix Template
            </button>
            <button
              onClick={() => setInputMode('bulk')}
              className={`pb-2 text-xs font-medium transition-colors ${
                inputMode === 'bulk'
                  ? 'border-b-2 border-amber-400 text-amber-400 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Bulk Text / CSV Import
            </button>
          </div>

          {inputMode === 'matrix' ? (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-neutral-400">
                    Template Prompt (Use <code className="text-amber-400 font-mono">&#123;a|b&#125;</code> for combinatorial expansion)
                  </label>
                  <span className="text-xs text-amber-400 font-mono">
                    {matrixExpansions.length} permutations
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={templatePrompt}
                  onChange={e => setTemplatePrompt(e.target.value)}
                  placeholder="A cinematic {photograph|painting} of a {lion|tiger} in {snow|rain}"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-neutral-200 focus:outline-none focus:border-amber-400 font-mono text-xs"
                />
              </div>

              {/* Expansion Preview */}
              {matrixExpansions.length > 0 && (
                <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 max-h-32 overflow-y-auto space-y-1">
                  <div className="text-[11px] font-semibold text-neutral-400 mb-1">
                    EXPANSION PREVIEW (FIRST 4):
                  </div>
                  {matrixExpansions.slice(0, 4).map((p, i) => (
                    <div key={i} className="text-xs text-neutral-300 truncate">
                      {i + 1}. {p}
                    </div>
                  ))}
                  {matrixExpansions.length > 4 && (
                    <div className="text-xs text-neutral-400 italic">
                      + {matrixExpansions.length - 4} more combinations...
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-neutral-400">
                  Bulk Prompts (one per line, or CSV with "prompt,negative_prompt,seed" header)
                </label>
                <span className="text-xs text-amber-400 font-mono">
                  {bulkParsed.length} prompts parsed
                </span>
              </div>
              <textarea
                rows={5}
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                placeholder={`prompt,negative_prompt,seed\n"Golden retriever playing in snow","blurry, low quality",1001\n"Sleek sports car in Tokyo rain","distorted",1002`}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-neutral-200 focus:outline-none focus:border-amber-400 font-mono text-xs"
              />
            </div>
          )}

          {/* Negative Prompt */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              Default Negative Prompt (Optional)
            </label>
            <input
              type="text"
              value={negativePrompt}
              onChange={e => setNegativePrompt(e.target.value)}
              placeholder="blurry, distorted, artifacts, low quality, watermark"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 focus:outline-none focus:border-amber-400 text-xs"
            />
          </div>

          {/* Seed Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                Seed Strategy
              </label>
              <select
                value={seedStrategy}
                onChange={e => setSeedStrategy(e.target.value as any)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 focus:outline-none focus:border-amber-400 text-xs"
              >
                <option value="sequential">Sequential (+1 per item)</option>
                <option value="random">Randomize (Crypto PRNG)</option>
                <option value="fixed">Fixed (Constant Seed)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                Base Seed
              </label>
              <input
                type="number"
                value={baseSeed}
                onChange={e => setBaseSeed(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 focus:outline-none focus:border-amber-400 text-xs font-mono"
              />
            </div>
          </div>

          {/* Media Preflight Upload (for i2v or i2i spaces) */}
          <div className="border border-neutral-800 rounded-lg p-3 bg-neutral-950">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-neutral-400" />
                Local Media Input & Preflight (for Image-to-Video/Image Spaces)
              </span>
              <span className="text-[11px] text-neutral-400">Optional</span>
            </div>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleMediaUpload}
              className="text-xs text-neutral-400 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-neutral-800 file:text-neutral-200 hover:file:bg-neutral-700 cursor-pointer"
            />

            {preflightStatus && (
              <div className="mt-2.5 pt-2.5 border-t border-neutral-800 text-xs space-y-1">
                {preflightStatus.valid ? (
                  <div className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Preflight Passed · {preflightStatus.info?.mimeType} · {(preflightStatus.info?.sizeBytes / 1024).toFixed(0)} KB {preflightStatus.info?.width ? `· ${preflightStatus.info?.width}x${preflightStatus.info?.height}` : ''}</span>
                  </div>
                ) : (
                  <div className="text-red-400 space-y-0.5">
                    {preflightStatus.errors.map((err, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{err}</span>
                      </div>
                    ))}
                  </div>
                )}
                {preflightStatus.warnings.length > 0 && (
                  <div className="text-amber-400 text-[11px]">
                    Warning: {preflightStatus.warnings.join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 flex items-center justify-between bg-neutral-950/50">
          <div className="text-xs text-neutral-400">
            Enqueuing <strong className="text-neutral-200 font-mono">{totalItemCount}</strong> job(s) into persistent queue
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleEnqueue}
              disabled={totalItemCount === 0}
              className="px-5 py-2 text-xs font-semibold text-neutral-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Enqueue Batch ({totalItemCount})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
