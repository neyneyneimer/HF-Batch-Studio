import React, { useState } from 'react';
import { JobProfile, Space } from '../types';
import { LocalRoomDatabase } from '../utils/storage';
import { expandPromptMatrix } from '../utils/promptMatrix';
import {
  SlidersHorizontal,
  Plus,
  Trash2,
  Copy,
  Sparkles,
  Check,
  X,
  FileCode,
} from 'lucide-react';

interface ProfilesViewProps {
  profiles: JobProfile[];
  spaces: Space[];
  onProfilesChange: (profiles: JobProfile[]) => void;
  onLaunchBatchWithProfile: (profile: JobProfile) => void;
}

export const ProfilesView: React.FC<ProfilesViewProps> = ({
  profiles,
  spaces,
  onProfilesChange,
  onLaunchBatchWithProfile,
}) => {
  const [selectedProfile, setSelectedProfile] = useState<JobProfile>(profiles[0]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<JobProfile>(profiles[0]);
  const [copied, setCopied] = useState(false);

  const handleSelect = (prof: JobProfile) => {
    setSelectedProfile(prof);
    setFormData(prof);
    setIsEditing(false);
  };

  const handleSave = () => {
    const updated = profiles.map(p => (p.id === formData.id ? formData : p));
    LocalRoomDatabase.saveProfiles(updated);
    onProfilesChange(updated);
    setSelectedProfile(formData);
    setIsEditing(false);
  };

  const handleDuplicate = (prof: JobProfile) => {
    const duplicated: JobProfile = {
      ...prof,
      id: `prof_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${prof.name} (Copy)`,
    };
    const updated = [...profiles, duplicated];
    LocalRoomDatabase.saveProfiles(updated);
    onProfilesChange(updated);
    handleSelect(duplicated);
  };

  const handleDelete = (id: string) => {
    if (profiles.length <= 1) return;
    const updated = profiles.filter(p => p.id !== id);
    LocalRoomDatabase.saveProfiles(updated);
    onProfilesChange(updated);
    handleSelect(updated[0]);
  };

  const handleNewProfile = () => {
    const newProf: JobProfile = {
      id: `prof_${Date.now()}`,
      name: 'New Custom Profile',
      description: 'Custom batch generation configuration',
      spaceId: spaces[0]?.id || 'space_flux_schnell',
      endpoint: '/infer',
      promptTemplate: 'A photograph of a {subject} in {setting}',
      negativePrompt: '',
      width: 1024,
      height: 1024,
      numInferenceSteps: 4,
      guidanceScale: 7.5,
      seedStrategy: 'sequential',
      baseSeed: 1000,
      timeoutSeconds: 120,
      maxRetries: 2,
      preflightEnabled: true,
    };
    const updated = [...profiles, newProf];
    LocalRoomDatabase.saveProfiles(updated);
    onProfilesChange(updated);
    handleSelect(newProf);
    setIsEditing(true);
  };

  const previewExpansions = expandPromptMatrix(
    isEditing ? formData.promptTemplate : selectedProfile.promptTemplate
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-100 tracking-tight">
            Reusable Job Profiles
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Pre-configure generation parameters, prompt templates, seed variation rules, and target Spaces
          </p>
        </div>
        <button
          onClick={handleNewProfile}
          className="px-4 py-2 text-xs font-semibold text-neutral-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Profile</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left List */}
        <div className="space-y-3">
          <span className="text-[11px] font-semibold text-neutral-300 tracking-wider block">
            SAVED PROFILES ({profiles.length})
          </span>
          <div className="space-y-2">
            {profiles.map(p => {
              const active = selectedProfile.id === p.id;
              const sp = spaces.find(s => s.id === p.spaceId);
              return (
                <div
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    active
                      ? 'bg-neutral-900 border-amber-400/50 shadow-md'
                      : 'bg-neutral-950 border-neutral-800/80 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-neutral-100 truncate">
                      {p.name}
                    </h4>
                    <span className="text-[10px] font-mono text-neutral-400">
                      {p.width}x{p.height}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 line-clamp-2 mt-1">
                    {p.description}
                  </p>
                  <div className="mt-2.5 pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[11px] text-neutral-400">
                    <span className="truncate max-w-[140px]">{sp?.name || p.spaceId}</span>
                    <span className="capitalize font-mono">{p.seedStrategy}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Detail / Edit Editor */}
        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
            <div>
              <h3 className="text-base font-semibold text-neutral-100">
                {isEditing ? formData.name : selectedProfile.name}
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                {isEditing ? formData.description : selectedProfile.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={() => {
                      setFormData(selectedProfile);
                      setIsEditing(false);
                    }}
                    className="px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-1.5 text-xs font-semibold text-neutral-900 bg-amber-400 hover:bg-amber-300 rounded-lg"
                  >
                    Save Changes
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleDuplicate(selectedProfile)}
                    title="Duplicate Profile"
                    className="p-2 text-neutral-400 hover:text-neutral-200 bg-neutral-800 rounded-lg transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1.5 text-xs font-medium text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
                  >
                    Edit Profile
                  </button>
                  {profiles.length > 1 && (
                    <button
                      onClick={() => handleDelete(selectedProfile.id)}
                      title="Delete Profile"
                      className="p-2 text-neutral-400 hover:text-red-400 bg-neutral-800 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Form or Display View */}
          <div className="space-y-4 text-xs">
            {isEditing ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-neutral-400 mb-1">Profile Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1">Target Space</label>
                    <select
                      value={formData.spaceId}
                      onChange={e => setFormData({ ...formData, spaceId: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200"
                    >
                      {spaces.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.type})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1">
                    Prompt Template (use &#123;a|b&#125; for variations)
                  </label>
                  <textarea
                    rows={3}
                    value={formData.promptTemplate}
                    onChange={e => setFormData({ ...formData, promptTemplate: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-neutral-200 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1">Default Negative Prompt</label>
                  <input
                    type="text"
                    value={formData.negativePrompt}
                    onChange={e => setFormData({ ...formData, negativePrompt: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200"
                  />
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-neutral-400 mb-1">Width</label>
                    <input
                      type="number"
                      value={formData.width}
                      onChange={e => setFormData({ ...formData, width: parseInt(e.target.value, 10) || 512 })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-neutral-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1">Height</label>
                    <input
                      type="number"
                      value={formData.height}
                      onChange={e => setFormData({ ...formData, height: parseInt(e.target.value, 10) || 512 })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-neutral-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1">Steps</label>
                    <input
                      type="number"
                      value={formData.numInferenceSteps}
                      onChange={e => setFormData({ ...formData, numInferenceSteps: parseInt(e.target.value, 10) || 4 })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-neutral-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1">Guidance</label>
                    <input
                      type="number"
                      step="0.5"
                      value={formData.guidanceScale}
                      onChange={e => setFormData({ ...formData, guidanceScale: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-neutral-200 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-neutral-400 mb-1">Seed Strategy</label>
                    <select
                      value={formData.seedStrategy}
                      onChange={e => setFormData({ ...formData, seedStrategy: e.target.value as any })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-neutral-200"
                    >
                      <option value="sequential">Sequential</option>
                      <option value="random">Random</option>
                      <option value="fixed">Fixed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1">Base Seed</label>
                    <input
                      type="number"
                      value={formData.baseSeed}
                      onChange={e => setFormData({ ...formData, baseSeed: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-neutral-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1">Timeout (Sec)</label>
                    <input
                      type="number"
                      value={formData.timeoutSeconds}
                      onChange={e => setFormData({ ...formData, timeoutSeconds: parseInt(e.target.value, 10) || 120 })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-neutral-200 font-mono"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                  <span className="text-[11px] font-semibold text-neutral-400 block mb-1">
                    PROMPT TEMPLATE
                  </span>
                  <p className="text-neutral-200 font-mono text-xs leading-relaxed">
                    {selectedProfile.promptTemplate}
                  </p>
                  {selectedProfile.negativePrompt && (
                    <div className="mt-2 pt-2 border-t border-neutral-800/80">
                      <span className="text-[11px] text-neutral-400 block">Negative Prompt:</span>
                      <p className="text-neutral-300 text-xs">{selectedProfile.negativePrompt}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                    <span className="text-neutral-400 text-[11px] block">Dimensions</span>
                    <span className="font-mono text-neutral-100 font-medium">
                      {selectedProfile.width}x{selectedProfile.height}
                    </span>
                  </div>
                  <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                    <span className="text-neutral-400 text-[11px] block">Inference Steps</span>
                    <span className="font-mono text-neutral-100 font-medium">
                      {selectedProfile.numInferenceSteps}
                    </span>
                  </div>
                  <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                    <span className="text-neutral-400 text-[11px] block">Guidance Scale</span>
                    <span className="font-mono text-neutral-100 font-medium">
                      {selectedProfile.guidanceScale}
                    </span>
                  </div>
                  <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                    <span className="text-neutral-400 text-[11px] block">Seed Mode</span>
                    <span className="font-mono text-neutral-100 font-medium capitalize">
                      {selectedProfile.seedStrategy} ({selectedProfile.baseSeed})
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Matrix Template Preview */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  MATRIX EXPANSIONS ({previewExpansions.length} COMBINATIONS)
                </span>
              </div>
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 max-h-36 overflow-y-auto space-y-1.5">
                {previewExpansions.map((p, i) => (
                  <div key={i} className="text-xs text-neutral-300 truncate">
                    <span className="text-neutral-500 font-mono mr-2">{i + 1}.</span>
                    {p}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-800 flex justify-end">
            <button
              onClick={() => onLaunchBatchWithProfile(selectedProfile)}
              className="px-4 py-2 text-xs font-semibold text-neutral-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Batch With This Profile</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
