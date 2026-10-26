export type MediaType = 'image' | 'video';

export type SpaceStatus = 'DISCOVERED' | 'MANUAL' | 'VERIFYING' | 'ERROR';

export type ApiProtocol = 'v4_stream' | 'v3_json' | 'manual';

export interface GradioParamSpec {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'choice' | 'image' | 'video';
  default: string | number | boolean | null;
  min?: number;
  max?: number;
  step?: number;
  choices?: string[];
  description?: string;
  inputIndex: number;
}

export interface SpaceEndpoint {
  path: string;
  isQueue: boolean;
  parameters: GradioParamSpec[];
  outputType: MediaType;
}

export interface Space {
  id: string;
  name: string;
  url: string;
  directApiUrl: string;
  type: MediaType;
  status: SpaceStatus;
  apiProtocol: ApiProtocol;
  endpoints: SpaceEndpoint[];
  selectedEndpoint: string;
  lastDiscoveredAt: number;
  description: string;
  isBuiltin?: boolean;
}

export type SeedStrategy = 'fixed' | 'sequential' | 'random';

export interface JobProfile {
  id: string;
  name: string;
  description: string;
  spaceId: string;
  endpoint: string;
  promptTemplate: string;
  negativePrompt: string;
  width: number;
  height: number;
  numInferenceSteps: number;
  guidanceScale: number;
  numFrames?: number;
  fps?: number;
  motionBucket?: number;
  seedStrategy: SeedStrategy;
  baseSeed: number;
  timeoutSeconds: number;
  maxRetries: number;
  preflightEnabled: boolean;
  accountId?: string;
}

export type JobStatus =
  | 'QUEUED'
  | 'PREPARING'
  | 'GENERATING'
  | 'DOWNLOADING'
  | 'COMPLETED'
  | 'FAILED_PREPARATION'
  | 'FAILED_RATE_LIMIT'
  | 'FAILED_AUTH'
  | 'FAILED_QUOTA_EXHAUSTED'
  | 'FAILED_TIMEOUT'
  | 'FAILED_SERVER_ERROR'
  | 'CANCELLED'
  | 'PAUSED';

export type JobStage = 'idle' | 'prep' | 'gen' | 'dl';

export interface BatchJob {
  id: string;
  profileId: string;
  spaceId: string;
  prompt: string;
  negativePrompt: string;
  seed: number;
  params: Record<string, any>;
  inputMediaData?: string; // base64 / data URL for i2i or i2v
  inputMediaName?: string;
  status: JobStatus;
  stage: JobStage;
  stageMessage: string;
  progress: number; // 0 to 100
  etaSeconds?: number;
  queuePosition?: number;
  eventId?: string;
  sessionHash?: string;
  retryCount: number;
  maxRetries: number;
  errorDetails?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  resultId?: string;
}

export interface BatchResult {
  id: string;
  jobId: string;
  profileId: string;
  spaceId: string;
  spaceName: string;
  type: MediaType;
  mediaUrl: string; // Blob URL or base64
  thumbnailUrl?: string;
  prompt: string;
  seed: number;
  parameters: Record<string, any>;
  sizeBytes: number;
  durationMs: number;
  verified: boolean;
  mimeType: string;
  createdAt: number;
}

export interface HFAccount {
  id: string;
  name: string;
  tokenMasked: string;
  encryptedTokenHex: string;
  ivHex: string;
  saltHex: string;
  isDefault: boolean;
  quotaStatus: 'OK' | 'EXHAUSTED' | 'RATE_LIMITED' | 'UNKNOWN';
  quotaResetAt?: number;
  lastUsedAt?: number;
  createdAt: number;
}

export interface PreflightResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  fileInfo?: {
    name: string;
    sizeBytes: number;
    mimeType: string;
    width?: number;
    height?: number;
  };
}

export interface AppSettings {
  autoDownload: boolean;
  concurrentGenerations: number;
  defaultTimeoutSeconds: number;
  autoRetryFailures: boolean;
  theme: 'system' | 'light' | 'dark';
  simulateWorkerDelays: boolean; // For testing in sandboxes
}

export interface BatchExportPackage {
  formatVersion: '1.0';
  exportedAt: number;
  application: 'HF Batch Studio';
  scope: 'full' | 'jobs' | 'results' | 'profile';
  summary: {
    jobCount: number;
    resultCount: number;
    profileCount: number;
    spaceCount: number;
  };
  jobs?: BatchJob[];
  results?: Array<{
    id: string;
    jobId: string;
    profileId: string;
    spaceId: string;
    spaceName: string;
    type: MediaType;
    prompt: string;
    seed: number;
    parameters: Record<string, any>;
    sizeBytes: number;
    durationMs: number;
    mimeType: string;
    createdAt: number;
  }>;
  profiles?: JobProfile[];
  spaces?: Space[];
}

