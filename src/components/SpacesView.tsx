import React, { useState } from 'react';
import { Space, SpaceEndpoint, GradioParamSpec } from '../types';
import { discoverSpace, BUILTIN_SPACES } from '../utils/gradioAdapter';
import { LocalRoomDatabase } from '../utils/storage';
import {
  Globe2,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Cpu,
  Video,
  Image as ImageIcon,
  Sliders,
  Sparkles,
  RefreshCw,
  X,
} from 'lucide-react';

interface SpacesViewProps {
  spaces: Space[];
  onSpacesChange: (spaces: Space[]) => void;
  onNewBatchWithSpace: (space: Space) => void;
}

export const SpacesView: React.FC<SpacesViewProps> = ({
  spaces,
  onSpacesChange,
  onNewBatchWithSpace,
}) => {
  const [selectedSpace, setSelectedSpace] = useState<Space>(spaces[0] || BUILTIN_SPACES[0]);
  const [isDiscoverModalOpen, setIsDiscoverModalOpen] = useState(false);
  const [spaceUrlInput, setSpaceUrlInput] = useState('');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  // Manual endpoint mapping dialog state
  const [isManualEditOpen, setIsManualEditOpen] = useState(false);
  const [manualEndpointPath, setManualEndpointPath] = useState('');
  const [manualParams, setManualParams] = useState<GradioParamSpec[]>([]);

  const handleDiscover = async () => {
    if (!spaceUrlInput.trim()) return;
    setIsDiscovering(true);
    setDiscoveryError(null);

    try {
      const res = await discoverSpace(spaceUrlInput);
      if (res.success && res.space) {
        const newSpace = res.space as Space;
        const updated = [newSpace, ...spaces.filter(s => s.id !== newSpace.id)];
        LocalRoomDatabase.saveSpaces(updated);
        onSpacesChange(updated);
        setSelectedSpace(newSpace);
        setIsDiscoverModalOpen(false);
        setSpaceUrlInput('');
      } else {
        setDiscoveryError(res.error || 'Failed to auto-discover Gradio configuration from URL.');
      }
    } catch (err: any) {
      setDiscoveryError(err.message || 'Discovery error');
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleDeleteSpace = (spaceId: string) => {
    const updated = spaces.filter(s => s.id !== spaceId);
    LocalRoomDatabase.saveSpaces(updated);
    onSpacesChange(updated);
    if (selectedSpace.id === spaceId) {
      setSelectedSpace(updated[0] || BUILTIN_SPACES[0]);
    }
  };

  const handleOpenManualEdit = () => {
    setManualEndpointPath(selectedSpace.selectedEndpoint);
    const activeEp = selectedSpace.endpoints.find(e => e.path === selectedSpace.selectedEndpoint);
    setManualParams(activeEp ? [...activeEp.parameters] : []);
    setIsManualEditOpen(true);
  };

  const handleSaveManualEdit = () => {
    const updatedEndpoints = selectedSpace.endpoints.map(ep => {
      if (ep.path === selectedSpace.selectedEndpoint) {
        return { ...ep, path: manualEndpointPath, parameters: manualParams };
      }
      return ep;
    });

    const updatedSpace = {
      ...selectedSpace,
      selectedEndpoint: manualEndpointPath,
      endpoints: updatedEndpoints,
      status: 'MANUAL' as const,
    };

    const updatedList = spaces.map(s => (s.id === selectedSpace.id ? updatedSpace : s));
    LocalRoomDatabase.saveSpaces(updatedList);
    onSpacesChange(updatedList);
    setSelectedSpace(updatedSpace);
    setIsManualEditOpen(false);
  };

  const activeEndpoint =
    selectedSpace.endpoints.find(e => e.path === selectedSpace.selectedEndpoint) ||
    selectedSpace.endpoints[0];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-100 tracking-tight">
            Gradio Space Library
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Discover public Hugging Face Gradio Spaces, introspect dynamic input endpoints, or configure manual schema mapping
          </p>
        </div>
        <button
          onClick={() => setIsDiscoverModalOpen(true)}
          className="px-4 py-2 text-xs font-semibold text-neutral-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Discover Space</span>
        </button>
      </div>

      {/* Grid: Space List (Left) + Detail & Schema Inspector (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Spaces List */}
        <div className="space-y-3">
          <span className="text-[11px] font-semibold text-neutral-300 tracking-wider block">
            AVAILABLE SPACES ({spaces.length})
          </span>
          <div className="space-y-2">
            {spaces.map(space => {
              const isSelected = selectedSpace.id === space.id;
              return (
                <div
                  key={space.id}
                  onClick={() => setSelectedSpace(space)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-neutral-900 border-amber-400/50 shadow-md'
                      : 'bg-neutral-950 border-neutral-800/80 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {space.type === 'video' ? (
                        <Video className="w-4 h-4 text-purple-400 shrink-0" />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-sky-400 shrink-0" />
                      )}
                      <h4 className="text-xs font-semibold text-neutral-100 truncate max-w-[180px]">
                        {space.name}
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-300 uppercase">
                      {space.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-neutral-400 line-clamp-2 mt-1.5">
                    {space.description}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-neutral-800/60 flex items-center justify-between text-[11px] text-neutral-300">
                    <span className="font-mono text-neutral-300">
                      {space.endpoints.length} endpoint(s)
                    </span>
                    <span className="text-neutral-300">
                      {space.isBuiltin ? 'Verified Built-in' : 'Custom'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Dynamic Parameters & Endpoint Inspector */}
        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-neutral-100">
                  {selectedSpace.name}
                </h3>
                <a
                  href={selectedSpace.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-neutral-400 hover:text-neutral-200 transition-colors"
                  title="Open on Hugging Face"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <div className="text-xs text-neutral-400 mt-1 flex items-center gap-2 font-mono">
                <span>Direct Host: {selectedSpace.directApiUrl}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenManualEdit}
                className="px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800 border border-neutral-700 hover:border-neutral-600 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Manual Schema</span>
              </button>
              {!selectedSpace.isBuiltin && (
                <button
                  onClick={() => handleDeleteSpace(selectedSpace.id)}
                  aria-label="Delete Space"
                  className="p-2 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Active Endpoint Selection */}
          <div className="flex items-center gap-4 text-xs">
            <span className="font-medium text-neutral-400">Target Endpoint:</span>
            <select
              value={selectedSpace.selectedEndpoint}
              onChange={e => {
                const updated = spaces.map(s =>
                  s.id === selectedSpace.id ? { ...s, selectedEndpoint: e.target.value } : s
                );
                LocalRoomDatabase.saveSpaces(updated);
                onSpacesChange(updated);
                setSelectedSpace({ ...selectedSpace, selectedEndpoint: e.target.value });
              }}
              className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-neutral-200 font-mono focus:outline-none focus:border-amber-400 text-xs"
            >
              {selectedSpace.endpoints.map(ep => (
                <option key={ep.path} value={ep.path}>
                  {ep.path} ({ep.outputType} output · {ep.parameters.length} params)
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Model Input Schema */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                DISCOVERED PARAMETER MAPPING ({activeEndpoint?.parameters.length || 0})
              </span>
              <span className="text-[11px] text-neutral-400">
                Positional index order required by Gradio API
              </span>
            </div>

            {activeEndpoint && activeEndpoint.parameters.length > 0 ? (
              <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-900 border-b border-neutral-800 text-neutral-400 font-mono">
                    <tr>
                      <th className="py-2.5 px-4 font-medium">Index</th>
                      <th className="py-2.5 px-4 font-medium">Parameter Name</th>
                      <th className="py-2.5 px-4 font-medium">Gradio Type</th>
                      <th className="py-2.5 px-4 font-medium">Default Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                    {activeEndpoint.parameters.map(param => (
                      <tr key={param.inputIndex} className="hover:bg-neutral-900/40">
                        <td className="py-2.5 px-4 font-mono text-neutral-400">
                          #{param.inputIndex}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-neutral-100 font-mono">
                          {param.name}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="text-[11px] font-mono text-amber-400">
                            {param.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-neutral-400 font-mono truncate max-w-[200px]">
                          {param.default !== null && param.default !== undefined
                            ? String(param.default)
                            : 'none'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 border border-dashed border-neutral-800 rounded-xl text-center text-xs text-neutral-400">
                No parameters mapped for this endpoint yet. Click &ldquo;Manual Schema&rdquo; to add inputs.
              </div>
            )}
          </div>

          {/* Quick Launch CTA */}
          <div className="pt-4 border-t border-neutral-800 flex items-center justify-between">
            <span className="text-xs text-neutral-400">
              Ready to generate using {selectedSpace.name}?
            </span>
            <button
              onClick={() => onNewBatchWithSpace(selectedSpace)}
              className="px-4 py-2 text-xs font-semibold text-neutral-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Batch With This Space</span>
            </button>
          </div>
        </div>
      </div>

      {/* Discover Space Modal */}
      {isDiscoverModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
                <Globe2 className="w-5 h-5 text-amber-400" />
                Discover Gradio Space
              </h3>
              <button
                onClick={() => setIsDiscoverModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              Enter any public Hugging Face Space URL (e.g. <code className="text-neutral-300">https://huggingface.co/spaces/black-forest-labs/FLUX.1-schnell</code>) or repo identifier (e.g. <code className="text-neutral-300">stabilityai/stable-diffusion-xl-base-1.0</code>).
            </p>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                Space URL or Identifier
              </label>
              <input
                type="text"
                value={spaceUrlInput}
                onChange={e => setSpaceUrlInput(e.target.value)}
                placeholder="e.g. black-forest-labs/FLUX.1-schnell"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 focus:outline-none focus:border-amber-400 text-xs font-mono"
              />
            </div>

            {discoveryError && (
              <div className="p-3 bg-red-950/30 border border-red-800/50 rounded-lg text-xs text-red-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{discoveryError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                onClick={() => setIsDiscoverModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-neutral-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDiscover}
                disabled={isDiscovering || !spaceUrlInput.trim()}
                className="px-5 py-2 text-xs font-semibold text-neutral-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDiscovering && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isDiscovering ? 'Discovering...' : 'Discover & Add'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Schema Edit Modal */}
      {isManualEditOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="text-base font-semibold text-neutral-100">
                Manual Endpoint & Parameter Mapping
              </h3>
              <button
                onClick={() => setIsManualEditOpen(false)}
                className="text-neutral-400 hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                  Endpoint Path
                </label>
                <input
                  type="text"
                  value={manualEndpointPath}
                  onChange={e => setManualEndpointPath(e.target.value)}
                  placeholder="/infer or /predict"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 font-mono text-xs"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-300">
                    Positional Parameter Specs
                  </span>
                  <button
                    onClick={() => {
                      setManualParams([
                        ...manualParams,
                        {
                          name: `param_${manualParams.length}`,
                          type: 'string',
                          default: '',
                          inputIndex: manualParams.length,
                        },
                      ]);
                    }}
                    className="text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Parameter</span>
                  </button>
                </div>

                {manualParams.map((param, i) => (
                  <div
                    key={i}
                    className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg grid grid-cols-4 gap-2 items-center"
                  >
                    <div>
                      <span className="text-[10px] text-neutral-400 block mb-0.5">
                        Index #{param.inputIndex} Name
                      </span>
                      <input
                        type="text"
                        value={param.name}
                        onChange={e => {
                          const updated = [...manualParams];
                          updated[i].name = e.target.value;
                          setManualParams(updated);
                        }}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-neutral-200 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 block mb-0.5">Type</span>
                      <select
                        value={param.type}
                        onChange={e => {
                          const updated = [...manualParams];
                          updated[i].type = e.target.value as any;
                          setManualParams(updated);
                        }}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-neutral-200 text-xs"
                      >
                        <option value="string">string</option>
                        <option value="number">number</option>
                        <option value="boolean">boolean</option>
                        <option value="choice">choice</option>
                        <option value="image">image</option>
                        <option value="video">video</option>
                      </select>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 block mb-0.5">Default</span>
                      <input
                        type="text"
                        value={param.default !== null ? String(param.default) : ''}
                        onChange={e => {
                          const updated = [...manualParams];
                          updated[i].default = e.target.value;
                          setManualParams(updated);
                        }}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-neutral-200 text-xs"
                      />
                    </div>
                    <div className="flex justify-end pt-3">
                      <button
                        onClick={() => {
                          const updated = manualParams
                            .filter((_, idx) => idx !== i)
                            .map((p, idx) => ({ ...p, inputIndex: idx }));
                          setManualParams(updated);
                        }}
                        className="text-neutral-500 hover:text-red-400 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-neutral-800 flex items-center justify-end gap-3 bg-neutral-950">
              <button
                onClick={() => setIsManualEditOpen(false)}
                className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-neutral-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveManualEdit}
                className="px-5 py-2 text-xs font-semibold text-neutral-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors"
              >
                Save Endpoint Mapping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
