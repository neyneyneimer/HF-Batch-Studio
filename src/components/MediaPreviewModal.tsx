import React, { useState } from 'react';
import { BatchResult } from '../types';
import { X, Download, Copy, Check, ExternalLink, Calendar, Hash, Clock, Cpu, FileJson } from 'lucide-react';
import { exportIndividualResultJson } from '../utils/exportManager';

interface MediaPreviewModalProps {
  result: BatchResult | null;
  onClose: () => void;
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({
  result,
  onClose,
}) => {
  if (!result) return null;

  const [copied, setCopied] = useState(false);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(result.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = result.mediaUrl;
    a.download = `hf_studio_${result.spaceId}_${result.seed}.${result.type === 'video' ? 'mp4' : 'png'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 font-mono">
              {result.type} RESULT
            </span>
            <span className="text-neutral-500">·</span>
            <span className="text-sm font-medium text-neutral-300">
              {result.spaceName}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close preview"
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Media & Details Container */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-0">
          {/* Media Viewport */}
          <div className="md:col-span-2 bg-neutral-950 flex items-center justify-center p-6 border-b md:border-b-0 md:border-r border-neutral-800 min-h-[380px]">
            {result.type === 'video' ? (
              <video
                src={result.mediaUrl}
                controls
                autoPlay
                loop
                className="max-h-[60vh] max-w-full rounded-lg shadow-lg border border-neutral-800"
              />
            ) : (
              <img
                src={result.mediaUrl}
                alt={result.prompt}
                referrerPolicy="no-referrer"
                className="max-h-[60vh] max-w-full rounded-lg shadow-lg object-contain border border-neutral-800"
              />
            )}
          </div>

          {/* Metadata Inspector Drawer */}
          <div className="p-6 flex flex-col justify-between space-y-6 bg-neutral-900">
            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-semibold text-neutral-300 tracking-wider block mb-1">
                  PROMPT
                </span>
                <p className="text-xs text-neutral-200 leading-relaxed bg-neutral-950 p-3 rounded-lg border border-neutral-800 select-text">
                  {result.prompt}
                </p>
                <button
                  onClick={handleCopyPrompt}
                  className="mt-2 text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied Prompt' : 'Copy Prompt'}</span>
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <span className="text-[11px] font-semibold text-neutral-300 tracking-wider block">
                  TECHNICAL ATTRIBUTES
                </span>
                <div className="flex items-center justify-between text-neutral-400 py-1 border-b border-neutral-800/60">
                  <span className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> Seed:</span>
                  <span className="font-mono text-neutral-200 font-semibold">{result.seed}</span>
                </div>
                <div className="flex items-center justify-between text-neutral-400 py-1 border-b border-neutral-800/60">
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Latency:</span>
                  <span className="font-mono text-neutral-200">{(result.durationMs / 1000).toFixed(1)}s</span>
                </div>
                <div className="flex items-center justify-between text-neutral-400 py-1 border-b border-neutral-800/60">
                  <span className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5" /> Resolution:</span>
                  <span className="font-mono text-neutral-200">
                    {result.parameters.width || 1024}x{result.parameters.height || 1024}
                  </span>
                </div>
                <div className="flex items-center justify-between text-neutral-400 py-1 border-b border-neutral-800/60">
                  <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Created:</span>
                  <span className="font-mono text-neutral-200">
                    {new Date(result.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-4 border-t border-neutral-800">
              <button
                onClick={handleDownload}
                className="w-full py-2.5 px-4 text-xs font-semibold text-neutral-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Media File</span>
              </button>

              <button
                onClick={() => exportIndividualResultJson(result)}
                className="w-full py-2 px-4 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <FileJson className="w-4 h-4 text-amber-400" />
                <span>Export Metadata JSON</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
