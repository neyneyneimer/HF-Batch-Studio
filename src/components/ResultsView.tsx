import React, { useState } from 'react';
import { BatchResult } from '../types';
import { LocalRoomDatabase } from '../utils/storage';
import JSZip from 'jszip';
import {
  Image as ImageIcon,
  Video,
  Download,
  Trash2,
  Search,
  ExternalLink,
  Copy,
  Check,
  Package,
  FileJson,
} from 'lucide-react';
import { exportBulkResultsJson } from '../utils/exportManager';

interface ResultsViewProps {
  results: BatchResult[];
  onResultsChange: (results: BatchResult[]) => void;
  onSelectResult: (result: BatchResult) => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  results,
  onResultsChange,
  onSelectResult,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isZipping, setIsZipping] = useState(false);

  const filtered = results.filter(res => {
    if (filterType !== 'all' && res.type !== filterType) return false;
    if (searchQuery.trim() && !res.prompt.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleClearAll = () => {
    if (confirm('Clear all local generation results from gallery?')) {
      LocalRoomDatabase.saveResults([]);
      onResultsChange([]);
    }
  };

  const handleDownloadZip = async () => {
    if (filtered.length === 0) return;
    setIsZipping(true);

    try {
      const zip = new JSZip();
      const folder = zip.folder('hf_batch_studio_outputs');

      for (let i = 0; i < filtered.length; i++) {
        const item = filtered[i];
        const ext = item.type === 'video' ? 'mp4' : 'png';
        const filename = `batch_${item.seed}_${i + 1}.${ext}`;

        // If data URL:
        if (item.mediaUrl.startsWith('data:')) {
          const base64Data = item.mediaUrl.split(',')[1];
          if (folder) folder.file(filename, base64Data, { base64: true });
        } else {
          // Fetch blob
          const res = await fetch(item.mediaUrl);
          const blob = await res.blob();
          if (folder) folder.file(filename, blob);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(content);
      a.download = `hf_batch_export_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to create ZIP export:', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-100 tracking-tight">
            Results Gallery
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Locally stored, verified image and video outputs with generation parameters and seed metadata
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => exportBulkResultsJson(filtered)}
            disabled={filtered.length === 0}
            className="px-3.5 py-2 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40"
          >
            <FileJson className="w-4 h-4 text-amber-400" />
            <span>Export JSON ({filtered.length})</span>
          </button>

          <button
            onClick={handleDownloadZip}
            disabled={filtered.length === 0 || isZipping}
            className="px-4 py-2 text-xs font-semibold text-neutral-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Package className="w-4 h-4" />
            <span>{isZipping ? 'Archiving...' : `Export ZIP (${filtered.length})`}</span>
          </button>

          {results.length > 0 && (
            <button
              onClick={handleClearAll}
              className="p-2 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-colors"
              title="Clear Gallery"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-900 p-2 rounded-xl border border-neutral-800">
        <div className="flex items-center gap-1 p-1 bg-neutral-950 rounded-lg">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filterType === 'all'
                ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            All ({results.length})
          </button>
          <button
            onClick={() => setFilterType('image')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filterType === 'image'
                ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Images ({results.filter(r => r.type === 'image').length})
          </button>
          <button
            onClick={() => setFilterType('video')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filterType === 'video'
                ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Videos ({results.filter(r => r.type === 'video').length})
          </button>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search prompts or seeds..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Results Grid */}
      {filtered.length === 0 ? (
        <div className="p-12 border border-dashed border-neutral-800 rounded-2xl text-center bg-neutral-950 flex flex-col items-center justify-center">
          <ImageIcon className="w-10 h-10 text-neutral-600 mb-3" />
          <h3 className="text-sm font-semibold text-neutral-300">No generation results found</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm">
            {results.length === 0
              ? 'Results from completed batch runs will appear here with instant download and inspector.'
              : 'No results match your active search filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map(res => (
            <div
              key={res.id}
              onClick={() => onSelectResult(res)}
              className="group relative aspect-square rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-amber-400/60 cursor-pointer transition-all shadow-sm"
            >
              <img
                src={res.mediaUrl}
                alt={res.prompt}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />

              {/* Overlay with info */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                <p className="text-[11px] text-white font-medium line-clamp-2 leading-tight">
                  {res.prompt}
                </p>
                <div className="mt-1 flex items-center justify-between text-[10px] text-neutral-300 font-mono">
                  <span>Seed: {res.seed}</span>
                  <span>{(res.durationMs / 1000).toFixed(1)}s</span>
                </div>
              </div>

              {/* Video Badge */}
              {res.type === 'video' && (
                <div className="absolute top-2 right-2 bg-neutral-950/80 border border-neutral-800 rounded px-1.5 py-0.5 text-[10px] text-purple-300 font-mono flex items-center gap-1">
                  <Video className="w-3 h-3" />
                  VID
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
