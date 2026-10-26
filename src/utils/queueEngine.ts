import { BatchJob, BatchResult, Space, HFAccount } from '../types';
import { LocalRoomDatabase } from './storage';
import { buildGradioPayload, classifyGradioError } from './gradioAdapter';
import { preflightMedia } from './preflight';
import { decryptToken } from './crypto';

export type QueueEventCallback = (jobs: BatchJob[], activeJobId?: string) => void;

export class BatchQueueEngine {
  private static instance: BatchQueueEngine | null = null;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private currentActiveJobId: string | null = null;
  private listeners: Set<QueueEventCallback> = new Set();
  private abortController: AbortController | null = null;

  public static getInstance(): BatchQueueEngine {
    if (!BatchQueueEngine.instance) {
      BatchQueueEngine.instance = new BatchQueueEngine();
    }
    return BatchQueueEngine.instance;
  }

  public subscribe(callback: QueueEventCallback): () => void {
    this.listeners.add(callback);
    callback(LocalRoomDatabase.getJobs(), this.currentActiveJobId || undefined);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    const jobs = LocalRoomDatabase.getJobs();
    for (const listener of this.listeners) {
      listener(jobs, this.currentActiveJobId || undefined);
    }
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  public pauseQueue() {
    this.isPaused = true;
    if (this.abortController) {
      this.abortController.abort();
    }
    this.isRunning = false;
    this.updateJobState(this.currentActiveJobId, {
      status: 'PAUSED',
      stageMessage: 'Queue paused. Job state and progress preserved; ready to resume.',
    });
    this.notify();
  }

  public resumeQueue() {
    this.isPaused = false;
    this.startQueue();
  }

  public startQueue() {
    if (this.isRunning) return;
    this.isPaused = false;
    this.isRunning = true;
    this.runQueueLoop().catch(err => {
      console.error('Queue loop error:', err);
      this.isRunning = false;
      this.notify();
    });
  }

  public stopQueue() {
    this.isRunning = false;
    if (this.abortController) {
      this.abortController.abort();
    }
    this.currentActiveJobId = null;
    this.notify();
  }

  public addJobs(newJobs: BatchJob[]) {
    const existing = LocalRoomDatabase.getJobs();
    const updated = [...existing, ...newJobs];
    LocalRoomDatabase.saveJobs(updated);
    this.notify();
    if (!this.isPaused && !this.isRunning) {
      this.startQueue();
    }
  }

  public reorderJobs(jobId: string, direction: 'up' | 'down') {
    const jobs = [...LocalRoomDatabase.getJobs()];
    const index = jobs.findIndex(j => j.id === jobId);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      if (jobs[index - 1].status === 'GENERATING' || jobs[index - 1].status === 'PREPARING') return;
      const temp = jobs[index];
      jobs[index] = jobs[index - 1];
      jobs[index - 1] = temp;
    } else if (direction === 'down' && index < jobs.length - 1) {
      if (jobs[index].status === 'GENERATING' || jobs[index].status === 'PREPARING') return;
      const temp = jobs[index];
      jobs[index] = jobs[index + 1];
      jobs[index + 1] = temp;
    }

    LocalRoomDatabase.saveJobs(jobs);
    this.notify();
  }

  public cancelJob(jobId: string) {
    if (this.currentActiveJobId === jobId && this.abortController) {
      this.abortController.abort();
    }
    this.updateJobState(jobId, {
      status: 'CANCELLED',
      stage: 'idle',
      stageMessage: 'Job cancelled by user',
      progress: 0,
    });
  }

  public retryJob(jobId: string) {
    this.updateJobState(jobId, {
      status: 'QUEUED',
      stage: 'idle',
      stageMessage: 'Enqueued for retry',
      progress: 0,
      errorDetails: undefined,
      retryCount: 0,
    });
    if (!this.isPaused && !this.isRunning) {
      this.startQueue();
    }
  }

  public removeJob(jobId: string) {
    if (this.currentActiveJobId === jobId && this.abortController) {
      this.abortController.abort();
    }
    const jobs = LocalRoomDatabase.getJobs().filter(j => j.id !== jobId);
    LocalRoomDatabase.saveJobs(jobs);
    this.notify();
  }

  public clearCompleted() {
    const jobs = LocalRoomDatabase.getJobs().filter(
      j => j.status !== 'COMPLETED' && j.status !== 'CANCELLED'
    );
    LocalRoomDatabase.saveJobs(jobs);
    this.notify();
  }

  private updateJobState(jobId: string | null, patch: Partial<BatchJob>) {
    if (!jobId) return;
    const jobs = LocalRoomDatabase.getJobs();
    const idx = jobs.findIndex(j => j.id === jobId);
    if (idx !== -1) {
      jobs[idx] = { ...jobs[idx], ...patch };
      LocalRoomDatabase.saveJobs(jobs);
      this.notify();
    }
  }

  /**
   * Main Queue Loop:
   * Selects next QUEUED or PAUSED job in order and coordinates 3 separate workers.
   */
  private async runQueueLoop() {
    while (this.isRunning && !this.isPaused) {
      const jobs = LocalRoomDatabase.getJobs();
      const nextJob = jobs.find(j => j.status === 'QUEUED' || j.status === 'PAUSED');

      if (!nextJob) {
        this.isRunning = false;
        this.currentActiveJobId = null;
        this.notify();
        break;
      }

      this.currentActiveJobId = nextJob.id;
      this.abortController = new AbortController();

      try {
        await this.processSingleJob(nextJob, this.abortController.signal);
      } catch (err: any) {
        if (err.name === 'AbortError') {
          // Handled via pause or cancel
        } else {
          console.error(`Error processing job ${nextJob.id}:`, err);
        }
      } finally {
        this.currentActiveJobId = null;
      }

      // Small tick between batch items
      await new Promise(r => setTimeout(r, 250));
    }
  }

  /**
   * Orchestrates the 3 decoupled workers for a single batch item:
   * 1. PreparationWorker
   * 2. GenerationWorker
   * 3. DownloadWorker
   */
  private async processSingleJob(job: BatchJob, signal: AbortSignal) {
    const spaces = LocalRoomDatabase.getSpaces();
    const profiles = LocalRoomDatabase.getProfiles();
    const settings = LocalRoomDatabase.getSettings();
    const accounts = LocalRoomDatabase.getAccounts();

    const space = spaces.find(s => s.id === job.spaceId);
    const profile = profiles.find(p => p.id === job.profileId);

    if (!space) {
      this.updateJobState(job.id, {
        status: 'FAILED_PREPARATION',
        stage: 'prep',
        stageMessage: 'Target Space configuration not found in library',
        errorDetails: `Space ID "${job.spaceId}" does not exist in local database.`,
      });
      return;
    }

    // Determine authorization token if account specified
    let authToken: string | undefined;
    const accountId = profile?.accountId || accounts.find(a => a.isDefault)?.id;
    const account = accounts.find(a => a.id === accountId);
    if (account) {
      try {
        authToken = await decryptToken({
          ciphertextHex: account.encryptedTokenHex,
          ivHex: account.ivHex,
          saltHex: account.saltHex,
        });
      } catch (err) {
        console.warn('Failed to decrypt HF token:', err);
      }
    }

    // ==========================================
    // STAGE 1: PreparationWorker
    // ==========================================
    this.updateJobState(job.id, {
      status: 'PREPARING',
      stage: 'prep',
      stageMessage: 'Worker 1: Validating parameters, checking inputs, and preparing payload...',
      progress: 5,
      startedAt: job.startedAt || Date.now(),
    });

    if (signal.aborted) return;

    let processedInputMedia = job.inputMediaData;

    // Local media preflight
    if (job.inputMediaData && profile?.preflightEnabled !== false) {
      const preflight = await preflightMedia(job.inputMediaData);
      if (!preflight.valid) {
        this.updateJobState(job.id, {
          status: 'FAILED_PREPARATION',
          stage: 'prep',
          stageMessage: 'Preflight check failed',
          errorDetails: preflight.errors.join('; '),
        });
        return;
      }

      // If input media is base64 data URL, upload to Gradio Space /upload endpoint
      if (job.inputMediaData.startsWith('data:')) {
        this.updateJobState(job.id, {
          stageMessage: 'Worker 1: Uploading input media to Gradio Space...',
          progress: 10,
        });

        try {
          const uploadRes = await this.uploadInputMedia(space.directApiUrl, job.inputMediaData, authToken, signal);
          if (uploadRes && uploadRes.length > 0) {
            processedInputMedia = uploadRes[0];
          }
        } catch (uploadErr: any) {
          this.updateJobState(job.id, {
            status: 'FAILED_PREPARATION',
            stage: 'prep',
            stageMessage: 'Failed to upload input media to Gradio server',
            errorDetails: uploadErr.message,
          });
          return;
        }
      }
    }

    const endpointSpec = space.endpoints.find(e => e.path === space.selectedEndpoint) || space.endpoints[0];
    const payload = buildGradioPayload(endpointSpec ? endpointSpec.parameters : [], {
      prompt: job.prompt,
      negativePrompt: job.negativePrompt,
      seed: job.seed,
      width: profile?.width || 1024,
      height: profile?.height || 1024,
      numInferenceSteps: profile?.numInferenceSteps || 4,
      guidanceScale: profile?.guidanceScale || 7.5,
      numFrames: profile?.numFrames,
      fps: profile?.fps,
      motionBucket: profile?.motionBucket,
      inputMediaData: processedInputMedia,
      customParams: job.params,
    });

    if (signal.aborted) return;

    // ==========================================
    // STAGE 2: GenerationWorker (Real Gradio API)
    // ==========================================
    const sessionHash = job.sessionHash || Math.random().toString(36).substring(2, 13);
    this.updateJobState(job.id, {
      status: 'GENERATING',
      stage: 'gen',
      stageMessage: 'Worker 2: Connecting to Gradio queue...',
      progress: 15,
      sessionHash,
    });

    let rawMediaResult: { url: string; mimeType: string } | null = null;
    const startTime = Date.now();

    try {
      rawMediaResult = await this.executeRealGradioGeneration(
        job,
        space,
        payload,
        authToken,
        (progress, message, eta, queuePos) => {
          this.updateJobState(job.id, {
            progress,
            stageMessage: message,
            etaSeconds: eta,
            queuePosition: queuePos,
          });
        },
        signal
      );
    } catch (err: any) {
      if (signal.aborted) return;

      const classification = classifyGradioError(err.statusCode || 500, err.message || '');

      if (classification.type === 'QUOTA_EXHAUSTED') {
        // Mark account as quota exhausted if applicable
        if (account) {
          const updatedAccounts = accounts.map(a =>
            a.id === account.id ? { ...a, quotaStatus: 'EXHAUSTED' as const, quotaResetAt: Date.now() + 3600000 } : a
          );
          LocalRoomDatabase.saveAccounts(updatedAccounts);
        }

        // Strictly preserve pending jobs, stop queue, never cycle accounts to evade quota
        this.updateJobState(job.id, {
          status: 'FAILED_QUOTA_EXHAUSTED',
          stage: 'gen',
          stageMessage: 'Free GPU compute quota exhausted on Hugging Face.',
          errorDetails:
            'Per-account free tier GPU quota reached. Pending jobs have been safely preserved in queue. To resume, wait for quota reset or select another authorized account with valid quota.',
        });
        this.isPaused = true;
        this.isRunning = false;
        this.notify();
        return;
      } else if (classification.type === 'AUTH') {
        this.updateJobState(job.id, {
          status: 'FAILED_AUTH',
          stage: 'gen',
          stageMessage: 'Hugging Face authentication failed.',
          errorDetails: classification.message,
        });
        return;
      } else if (classification.type === 'TIMEOUT') {
        this.updateJobState(job.id, {
          status: 'FAILED_TIMEOUT',
          stage: 'gen',
          stageMessage: 'Generation timed out.',
          errorDetails: classification.message,
        });
        return;
      } else {
        // Safe retry semantics with exponential backoff
        if (settings.autoRetryFailures && job.retryCount < job.maxRetries) {
          const nextRetry = job.retryCount + 1;
          const backoffDelay = Math.min(1000 * Math.pow(2, nextRetry), 15000);
          this.updateJobState(job.id, {
            status: 'QUEUED',
            stage: 'idle',
            retryCount: nextRetry,
            stageMessage: `Retrying (attempt ${nextRetry}/${job.maxRetries}) after ${backoffDelay / 1000}s backoff...`,
          });
          await new Promise(r => setTimeout(r, backoffDelay));
          return;
        }

        this.updateJobState(job.id, {
          status: 'FAILED_SERVER_ERROR',
          stage: 'gen',
          stageMessage: 'Server computation error',
          errorDetails: classification.message,
        });
        return;
      }
    }

    if (signal.aborted || !rawMediaResult) return;

    // ==========================================
    // STAGE 3: DownloadWorker (Real Verified Storage)
    // ==========================================
    this.updateJobState(job.id, {
      status: 'DOWNLOADING',
      stage: 'dl',
      stageMessage: 'Worker 3: Verifying media signatures and saving to disk storage...',
      progress: 90,
    });

    const durationMs = Date.now() - startTime;
    let savedMedia: { url: string; sizeBytes: number; mimeType: string };

    try {
      const saveRes = await fetch('/api/media/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remoteUrl: rawMediaResult.url,
          prompt: job.prompt,
          seed: job.seed,
          spaceId: space.id,
          type: space.type,
          authToken,
        }),
        signal,
      });

      if (!saveRes.ok) {
        const errText = await saveRes.text();
        throw new Error(`Media save failed: ${errText}`);
      }

      const saveJson = await saveRes.json();
      if (!saveJson.success || !saveJson.verified) {
        throw new Error(saveJson.error || 'Media integrity check failed');
      }

      savedMedia = {
        url: saveJson.url,
        sizeBytes: saveJson.sizeBytes,
        mimeType: saveJson.mimeType,
      };
    } catch (saveErr: any) {
      this.updateJobState(job.id, {
        status: 'FAILED_SERVER_ERROR',
        stage: 'dl',
        stageMessage: 'Media verification failed',
        errorDetails: `Server output verification failed: ${saveErr.message}. Result not accepted.`,
      });
      return;
    }

    const resultId = `res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newResult: BatchResult = {
      id: resultId,
      jobId: job.id,
      profileId: job.profileId,
      spaceId: space.id,
      spaceName: space.name,
      type: space.type,
      mediaUrl: savedMedia.url,
      thumbnailUrl: savedMedia.url,
      prompt: job.prompt,
      seed: job.seed,
      parameters: {
        width: profile?.width || 1024,
        height: profile?.height || 1024,
        steps: profile?.numInferenceSteps || 4,
        guidance: profile?.guidanceScale || 7.5,
        ...job.params,
      },
      sizeBytes: savedMedia.sizeBytes,
      durationMs,
      verified: true,
      mimeType: savedMedia.mimeType,
      createdAt: Date.now(),
    };

    const existingResults = LocalRoomDatabase.getResults();
    LocalRoomDatabase.saveResults([newResult, ...existingResults]);

    if (settings.autoDownload) {
      this.triggerDirectDownload(
        savedMedia.url,
        `hf_batch_${job.seed}_${Date.now()}.${space.type === 'video' ? 'mp4' : 'png'}`
      );
    }

    this.updateJobState(job.id, {
      status: 'COMPLETED',
      stage: 'idle',
      stageMessage: `Completed in ${(durationMs / 1000).toFixed(1)}s`,
      progress: 100,
      completedAt: Date.now(),
      resultId,
    });
  }

  /**
   * Uploads input media to Gradio Space /upload proxy
   */
  private async uploadInputMedia(
    directHost: string,
    dataUrl: string,
    authToken?: string,
    signal?: AbortSignal
  ): Promise<any[]> {
    const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
    if (!match) throw new Error('Invalid data URI for upload');

    const mime = match[1];
    const byteChars = atob(match[2]);
    const byteNums = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNums[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNums);
    const blob = new Blob([byteArray], { type: mime });

    const formData = new FormData();
    formData.append('file', blob, `input_${Date.now()}.${mime.includes('video') ? 'mp4' : 'png'}`);
    formData.append('directHost', directHost);
    if (authToken) formData.append('authToken', authToken);

    const res = await fetch('/api/gradio/upload', {
      method: 'POST',
      body: formData,
      signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Upload failed (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.files || [];
  }

  /**
   * REAL Gradio API Execution:
   * Submits job to Gradio endpoint via /api/gradio/call,
   * streams real progress/events via /api/gradio/stream,
   * and parses real output media URLs.
   * NEVER generates mock results or procedural drawings.
   */
  private async executeRealGradioGeneration(
    job: BatchJob,
    space: Space,
    payload: any[],
    authToken: string | undefined,
    onProgress: (progress: number, message: string, eta?: number, queuePos?: number) => void,
    signal: AbortSignal
  ): Promise<{ url: string; mimeType: string }> {
    onProgress(15, 'Submitting job to Gradio endpoint...');

    // 1. Submit job via call proxy (Duplicate prevention: verify if eventId exists)
    let eventId = job.eventId;
    let streamUrl: string | undefined;
    let directData: any = null;

    if (!eventId) {
      const callRes = await fetch('/api/gradio/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directHost: space.directApiUrl,
          endpoint: space.selectedEndpoint || (space.endpoints[0]?.path ?? '/predict'),
          payload,
          authToken,
        }),
        signal,
      });

      if (!callRes.ok) {
        const errorText = await callRes.text();
        const err: any = new Error(errorText || `HTTP ${callRes.status}`);
        err.statusCode = callRes.status;
        throw err;
      }

      const callData = await callRes.json();
      if (!callData.success) {
        const err: any = new Error(callData.error || 'Call submission rejected');
        err.statusCode = callData.status || 500;
        throw err;
      }

      eventId = callData.eventId;
      streamUrl = callData.streamUrl;
      directData = callData.directData;

      // Immediately persist eventId to avoid duplicate submission on restart
      if (eventId) {
        this.updateJobState(job.id, { eventId });
      }
    } else {
      // Re-attaching to existing eventId
      const cleanEndpoint = (space.selectedEndpoint || space.endpoints[0]?.path || '/predict').replace(/^\//, '');
      streamUrl = `${space.directApiUrl}/gradio_api/call/${cleanEndpoint}/${eventId}`;
    }

    // 2. If direct data was returned (v3 json)
    if (directData) {
      onProgress(85, 'Direct response received. Processing output...');
      return this.extractMediaFromGradioOutput(directData, space);
    }

    // 3. If streamUrl returned (v4 SSE stream), listen for events
    if (streamUrl) {
      return await this.listenToGradioSSE(streamUrl, authToken, space, onProgress, signal);
    }

    throw new Error('Gradio Space did not return a valid event identifier or output stream.');
  }

  /**
   * Connects to Gradio SSE stream through /api/gradio/stream proxy,
   * parsing progress, log, and complete events.
   */
  private async listenToGradioSSE(
    streamUrl: string,
    authToken: string | undefined,
    space: Space,
    onProgress: (progress: number, message: string, eta?: number, queuePos?: number) => void,
    signal: AbortSignal
  ): Promise<{ url: string; mimeType: string }> {
    const proxyUrl = `/api/gradio/stream?streamUrl=${encodeURIComponent(streamUrl)}${
      authToken ? '&authToken=' + encodeURIComponent(authToken) : ''
    }`;

    const response = await fetch(proxyUrl, { signal });
    if (!response.ok) {
      const errText = await response.text();
      const err: any = new Error(`SSE stream error: ${errText}`);
      err.statusCode = response.status;
      throw err;
    }

    if (!response.body) {
      throw new Error('No SSE stream body received');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let completedData: any = null;

    while (true) {
      if (signal.aborted) {
        reader.cancel();
        throw new DOMException('Aborted', 'AbortError');
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      let currentEvent = '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('event:')) {
          currentEvent = trimmed.replace('event:', '').trim();
        } else if (trimmed.startsWith('data:')) {
          const dataStr = trimmed.replace('data:', '').trim();
          if (!dataStr) continue;

          try {
            const dataJson = JSON.parse(dataStr);

            if (currentEvent === 'progress') {
              // Gradio progress event: [ { progress, desc, eta, unit } ] or { progress, desc, eta }
              const pItem = Array.isArray(dataJson) ? dataJson[0] : dataJson;
              const pVal = typeof pItem.progress === 'number' ? Math.round(pItem.progress * 100) : 40;
              const desc = pItem.desc || 'Processing model inference...';
              const eta = typeof pItem.eta === 'number' ? Math.round(pItem.eta) : undefined;
              onProgress(Math.min(90, Math.max(20, pVal)), desc, eta);
            } else if (currentEvent === 'log') {
              onProgress(50, typeof dataJson === 'string' ? dataJson : 'Computing...');
            } else if (currentEvent === 'error') {
              const err: any = new Error(typeof dataJson === 'string' ? dataJson : 'Gradio pipeline error');
              err.statusCode = 500;
              throw err;
            } else if (currentEvent === 'complete') {
              completedData = dataJson;
            }
          } catch (e: any) {
            if (currentEvent === 'error') throw e;
          }
        }
      }

      if (completedData) break;
    }

    if (!completedData) {
      throw new Error('Gradio SSE stream ended without emitting a completion payload.');
    }

    return this.extractMediaFromGradioOutput(completedData, space);
  }

  /**
   * Inspects Gradio completion data structures to extract the generated media file URL
   */
  private extractMediaFromGradioOutput(
    outputData: any,
    space: Space
  ): { url: string; mimeType: string } {
    let items: any[] = [];
    if (Array.isArray(outputData)) {
      items = outputData;
    } else if (outputData && typeof outputData === 'object') {
      if (Array.isArray(outputData.data)) items = outputData.data;
      else items = [outputData];
    } else {
      items = [outputData];
    }

    let foundUrl: string | null = null;
    let mimeType = space.type === 'video' ? 'video/mp4' : 'image/png';

    for (const item of items) {
      if (!item) continue;

      if (typeof item === 'string') {
        if (item.startsWith('http://') || item.startsWith('https://') || item.startsWith('data:')) {
          foundUrl = item;
          break;
        } else if (item.startsWith('/file=') || item.startsWith('file=')) {
          const cleanPath = item.startsWith('/') ? item : `/${item}`;
          foundUrl = `${space.directApiUrl}${cleanPath}`;
          break;
        }
      } else if (typeof item === 'object') {
        if (item.url && typeof item.url === 'string') {
          foundUrl = item.url;
          if (item.mime_type) mimeType = item.mime_type;
          break;
        }
        if (item.path && typeof item.path === 'string') {
          foundUrl = `${space.directApiUrl}/file=${item.path}`;
          if (item.mime_type) mimeType = item.mime_type;
          break;
        }
        if (item.name && typeof item.name === 'string') {
          foundUrl = `${space.directApiUrl}/file=${item.name}`;
          break;
        }
      }
    }

    if (!foundUrl) {
      throw new Error('No media output URL or file path detected in Gradio server response.');
    }

    return {
      url: foundUrl,
      mimeType,
    };
  }

  private triggerDirectDownload(url: string, filename: string) {
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.warn('Direct download blocked by browser policy:', e);
    }
  }
}
