import { BatchJob, BatchResult, JobProfile, Space, BatchExportPackage } from '../types';

/**
 * Triggers a browser file download of JSON content.
 */
export function downloadJsonFile(data: unknown, filename: string): void {
  const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports an individual result metadata as a clean JSON file.
 */
export function exportIndividualResultJson(result: BatchResult): void {
  const meta = {
    formatVersion: '1.0',
    application: 'HF Batch Studio',
    exportedAt: Date.now(),
    type: 'single_result_metadata',
    result: {
      id: result.id,
      jobId: result.jobId,
      spaceId: result.spaceId,
      spaceName: result.spaceName,
      type: result.type,
      prompt: result.prompt,
      seed: result.seed,
      parameters: result.parameters,
      sizeBytes: result.sizeBytes,
      durationMs: result.durationMs,
      verified: result.verified,
      mimeType: result.mimeType,
      createdAt: result.createdAt,
    },
  };

  const filename = `hf_result_${result.seed}_${result.id.slice(-6)}.json`;
  downloadJsonFile(meta, filename);
}

/**
 * Exports bulk results metadata for analysis or archiving.
 */
export function exportBulkResultsJson(results: BatchResult[], customName?: string): void {
  const cleanResults = results.map(r => ({
    id: r.id,
    jobId: r.jobId,
    profileId: r.profileId,
    spaceId: r.spaceId,
    spaceName: r.spaceName,
    type: r.type,
    prompt: r.prompt,
    seed: r.seed,
    parameters: r.parameters,
    sizeBytes: r.sizeBytes,
    durationMs: r.durationMs,
    mimeType: r.mimeType,
    createdAt: r.createdAt,
  }));

  const pkg: BatchExportPackage = {
    formatVersion: '1.0',
    exportedAt: Date.now(),
    application: 'HF Batch Studio',
    scope: 'results',
    summary: {
      jobCount: 0,
      resultCount: cleanResults.length,
      profileCount: 0,
      spaceCount: 0,
    },
    results: cleanResults,
  };

  const filename = customName || `hf_batch_results_metadata_${Date.now()}.json`;
  downloadJsonFile(pkg, filename);
}

/**
 * Exports batch job configurations (queued, completed, failed) for sharing/re-running.
 */
export function exportJobsConfigurationJson(jobs: BatchJob[], customName?: string): void {
  const pkg: BatchExportPackage = {
    formatVersion: '1.0',
    exportedAt: Date.now(),
    application: 'HF Batch Studio',
    scope: 'jobs',
    summary: {
      jobCount: jobs.length,
      resultCount: 0,
      profileCount: 0,
      spaceCount: 0,
    },
    jobs,
  };

  const filename = customName || `hf_batch_jobs_config_${Date.now()}.json`;
  downloadJsonFile(pkg, filename);
}

/**
 * Exports a full studio backup (profiles, spaces, jobs, results metadata).
 */
export function exportStudioFullBackup(
  jobs: BatchJob[],
  results: BatchResult[],
  profiles: JobProfile[],
  spaces: Space[]
): void {
  const cleanResults = results.map(r => ({
    id: r.id,
    jobId: r.jobId,
    profileId: r.profileId,
    spaceId: r.spaceId,
    spaceName: r.spaceName,
    type: r.type,
    prompt: r.prompt,
    seed: r.seed,
    parameters: r.parameters,
    sizeBytes: r.sizeBytes,
    durationMs: r.durationMs,
    mimeType: r.mimeType,
    createdAt: r.createdAt,
  }));

  const pkg: BatchExportPackage = {
    formatVersion: '1.0',
    exportedAt: Date.now(),
    application: 'HF Batch Studio',
    scope: 'full',
    summary: {
      jobCount: jobs.length,
      resultCount: cleanResults.length,
      profileCount: profiles.length,
      spaceCount: spaces.length,
    },
    jobs,
    results: cleanResults,
    profiles,
    spaces,
  };

  downloadJsonFile(pkg, `hf_batch_studio_full_backup_${Date.now()}.json`);
}

/**
 * Validates and imports a JSON backup package.
 */
export function parseAndValidateImport(jsonContent: string): {
  valid: boolean;
  error?: string;
  data?: BatchExportPackage;
} {
  try {
    const parsed = JSON.parse(jsonContent);

    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'JSON payload is not an object' };
    }

    if (parsed.application !== 'HF Batch Studio' && !parsed.formatVersion) {
      // Loose compatibility check: does it have jobs, profiles, or results?
      if (!Array.isArray(parsed.jobs) && !Array.isArray(parsed.profiles) && !Array.isArray(parsed.results)) {
        return {
          valid: false,
          error: 'Unrecognized file format. Must be an exported JSON from HF Batch Studio.',
        };
      }
    }

    return {
      valid: true,
      data: parsed as BatchExportPackage,
    };
  } catch (err: any) {
    return {
      valid: false,
      error: `Invalid JSON syntax: ${err.message || 'Parse error'}`,
    };
  }
}

/**
 * Calculates estimated text tokens for prompt and negative prompt
 * using standard CLIP / T5 / Llama subword heuristic (~1.3 tokens per word + punctuation).
 */
export function estimatePromptTokens(prompt: string, negativePrompt?: string): number {
  const countTokens = (text: string) => {
    if (!text || !text.trim()) return 0;
    const words = text.trim().split(/\s+/).filter(Boolean);
    const punctuationMatches = text.match(/[,.;:!?()[\]{}"'\\/`~@#$%^&*+=<>|-]/g);
    const punctuationCount = punctuationMatches ? punctuationMatches.length : 0;
    return Math.max(1, Math.round(words.length * 1.3) + punctuationCount);
  };

  return countTokens(prompt) + (negativePrompt ? countTokens(negativePrompt) : 0);
}
