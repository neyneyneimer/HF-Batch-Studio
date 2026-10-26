import { Space, JobProfile, BatchJob, BatchResult, HFAccount, AppSettings } from '../types';
import { BUILTIN_SPACES } from './gradioAdapter';

const STORAGE_KEYS = {
  SPACES: 'hf_batch_spaces_v1',
  PROFILES: 'hf_batch_profiles_v1',
  JOBS: 'hf_batch_jobs_v1',
  RESULTS: 'hf_batch_results_v1',
  ACCOUNTS: 'hf_batch_accounts_v1',
  SETTINGS: 'hf_batch_settings_v1',
};

export const DEFAULT_PROFILES: JobProfile[] = [
  {
    id: 'prof_flux_fast',
    name: 'FLUX.1 Schnell - Fast Batch (1024px)',
    description: 'High-speed 4-step generation for prompt discovery and rapid asset batches.',
    spaceId: 'space_flux_schnell',
    endpoint: '/infer',
    promptTemplate: 'A breathtaking high-detail photograph of a {majestic lion|cybernetic tiger|mystic wolf} in a {misty forest|neon cityscape}, 8k, award winning composition',
    negativePrompt: '',
    width: 1024,
    height: 1024,
    numInferenceSteps: 4,
    guidanceScale: 0.0,
    seedStrategy: 'sequential',
    baseSeed: 1000,
    timeoutSeconds: 120,
    maxRetries: 2,
    preflightEnabled: true,
  },
  {
    id: 'prof_sdxl_cinematic',
    name: 'SDXL Base - Cinematic Landscape',
    description: 'Ultra-wide 1280x768 cinematic landscape diffusion with 30 steps and negative prompts.',
    spaceId: 'space_sdxl_base',
    endpoint: '/run',
    promptTemplate: 'Epic cinematic panorama of a {futuristic colony|ancient temple} on Mars, sunset lighting, ray tracing, photorealistic',
    negativePrompt: 'blurry, low resolution, artifacts, distorted, grainy, text, watermark',
    width: 1280,
    height: 768,
    numInferenceSteps: 30,
    guidanceScale: 7.5,
    seedStrategy: 'random',
    baseSeed: 42,
    timeoutSeconds: 180,
    maxRetries: 2,
    preflightEnabled: true,
  },
  {
    id: 'prof_animatediff_motion',
    name: 'AnimateDiff - Dynamic Video Clips',
    description: '4-step Lightning video synthesis producing fluid 16-frame motion loops.',
    spaceId: 'space_animatediff',
    endpoint: '/generate',
    promptTemplate: 'A {sleek sports car drifting on wet asphalt|hummingbird hovering over exotic flower} in slow motion, cinematic 4k, smooth camera',
    negativePrompt: 'flicker, jitter, bad anatomy, artifacts, low framerate',
    width: 512,
    height: 512,
    numInferenceSteps: 4,
    guidanceScale: 1.0,
    numFrames: 16,
    fps: 8,
    seedStrategy: 'sequential',
    baseSeed: 500,
    timeoutSeconds: 240,
    maxRetries: 1,
    preflightEnabled: true,
  },
  {
    id: 'prof_i2vgen_xl',
    name: 'I2VGen-XL - Image to Video Synthesis',
    description: 'Brings still image inputs to life with camera motion and physical animation.',
    spaceId: 'space_i2vgen',
    endpoint: '/predict',
    promptTemplate: 'Camera slowly pans around the subject, dynamic lighting, subtle living motion',
    negativePrompt: 'distortion, freeze frame, tearing',
    width: 512,
    height: 512,
    numInferenceSteps: 30,
    guidanceScale: 8.0,
    numFrames: 16,
    seedStrategy: 'sequential',
    baseSeed: 1234,
    timeoutSeconds: 300,
    maxRetries: 1,
    preflightEnabled: true,
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  autoDownload: false,
  concurrentGenerations: 1,
  defaultTimeoutSeconds: 180,
  autoRetryFailures: false,
  theme: 'dark',
  simulateWorkerDelays: false,
};

export class LocalRoomDatabase {
  static getSpaces(): Space[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SPACES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SPACES, JSON.stringify(BUILTIN_SPACES));
      return BUILTIN_SPACES;
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : BUILTIN_SPACES;
    } catch {
      return BUILTIN_SPACES;
    }
  }

  static saveSpaces(spaces: Space[]) {
    localStorage.setItem(STORAGE_KEYS.SPACES, JSON.stringify(spaces));
  }

  static getProfiles(): JobProfile[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(DEFAULT_PROFILES));
      return DEFAULT_PROFILES;
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PROFILES;
    } catch {
      return DEFAULT_PROFILES;
    }
  }

  static saveProfiles(profiles: JobProfile[]) {
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
  }

  static getJobs(): BatchJob[] {
    const raw = localStorage.getItem(STORAGE_KEYS.JOBS);
    if (!raw) return [];
    try {
      return JSON.parse(raw) || [];
    } catch {
      return [];
    }
  }

  static saveJobs(jobs: BatchJob[]) {
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(jobs));
  }

  static getResults(): BatchResult[] {
    const raw = localStorage.getItem(STORAGE_KEYS.RESULTS);
    if (!raw) return [];
    try {
      return JSON.parse(raw) || [];
    } catch {
      return [];
    }
  }

  static saveResults(results: BatchResult[]) {
    localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(results));
  }

  static getAccounts(): HFAccount[] {
    const raw = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    if (!raw) return [];
    try {
      return JSON.parse(raw) || [];
    } catch {
      return [];
    }
  }

  static saveAccounts(accounts: HFAccount[]) {
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
  }

  static getSettings(): AppSettings {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  static saveSettings(settings: AppSettings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  static clearAllData() {
    localStorage.removeItem(STORAGE_KEYS.JOBS);
    localStorage.removeItem(STORAGE_KEYS.RESULTS);
  }
}
