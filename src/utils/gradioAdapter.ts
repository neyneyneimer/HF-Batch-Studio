import { Space, SpaceEndpoint, GradioParamSpec, MediaType, ApiProtocol } from '../types';

export interface SpaceDiscoveryResult {
  success: boolean;
  verified?: boolean;
  space?: Partial<Space>;
  error?: string;
  repoId?: string;
  directHost?: string;
  hfUrl?: string;
}

/**
 * Normalizes user Space input (repo_id or full URL) into Hugging Face and Direct Subdomain endpoints
 */
export function normalizeSpaceUrl(input: string): {
  repoId: string;
  directHost: string;
  hfUrl: string;
} {
  let clean = input.trim();
  clean = clean.replace(/\/+$/, '');

  let repoId = '';

  if (clean.includes('huggingface.co/spaces/')) {
    const parts = clean.split('huggingface.co/spaces/')[1];
    repoId = parts.split('/')[0] + '/' + parts.split('/')[1];
  } else if (clean.includes('.hf.space')) {
    const domain = clean.replace(/https?:\/\//, '').split('.hf.space')[0];
    repoId = domain;
  } else if (clean.includes('/')) {
    repoId = clean;
  } else {
    repoId = clean;
  }

  const subdomain = repoId
    .toLowerCase()
    .replace(/\//g, '-')
    .replace(/[^a-z0-9-]/g, '-');

  const directHost = `https://${subdomain}.hf.space`;
  const hfUrl = `https://huggingface.co/spaces/${repoId}`;

  return { repoId, directHost, hfUrl };
}

/**
 * Verified built-in public Gradio spaces with verified configurations
 */
export const BUILTIN_SPACES: Space[] = [
  {
    id: 'space_flux_schnell',
    name: 'FLUX.1 [schnell] (Black Forest Labs)',
    url: 'https://huggingface.co/spaces/black-forest-labs/FLUX.1-schnell',
    directApiUrl: 'https://black-forest-labs-flux-1-schnell.hf.space',
    type: 'image',
    status: 'DISCOVERED',
    apiProtocol: 'v4_stream',
    description: 'High-speed 12B parameter rectified flow transformer for 1-4 step state-of-the-art image generation.',
    lastDiscoveredAt: Date.now(),
    isBuiltin: true,
    selectedEndpoint: '/infer',
    endpoints: [
      {
        path: '/infer',
        isQueue: true,
        outputType: 'image',
        parameters: [
          { name: 'prompt', type: 'string', default: 'A majestic cybernetic owl perched on a neon lamppost, 8k resolution', inputIndex: 0, description: 'Prompt' },
          { name: 'seed', type: 'number', default: 0, min: 0, max: 2147483647, inputIndex: 1, description: 'Random Seed' },
          { name: 'randomize_seed', type: 'boolean', default: true, inputIndex: 2, description: 'Randomize Seed' },
          { name: 'width', type: 'number', default: 1024, min: 256, max: 2048, step: 64, inputIndex: 3, description: 'Width' },
          { name: 'height', type: 'number', default: 1024, min: 256, max: 2048, step: 64, inputIndex: 4, description: 'Height' },
          { name: 'num_inference_steps', type: 'number', default: 4, min: 1, max: 8, step: 1, inputIndex: 5, description: 'Inference Steps' },
        ],
      },
    ],
  },
  {
    id: 'space_sdxl_base',
    name: 'Stable Diffusion XL Base 1.0 (Stability AI)',
    url: 'https://huggingface.co/spaces/stabilityai/stable-diffusion-xl-base-1.0',
    directApiUrl: 'https://stabilityai-stable-diffusion-xl-base-1-0.hf.space',
    type: 'image',
    status: 'DISCOVERED',
    apiProtocol: 'v4_stream',
    description: 'Flagship open SDXL latent diffusion model with dual text encoders and high aesthetic quality.',
    lastDiscoveredAt: Date.now(),
    isBuiltin: true,
    selectedEndpoint: '/run',
    endpoints: [
      {
        path: '/run',
        isQueue: true,
        outputType: 'image',
        parameters: [
          { name: 'prompt', type: 'string', default: 'Cinematic portrait of a courageous space explorer, soft dramatic studio lighting', inputIndex: 0, description: 'Prompt' },
          { name: 'negative_prompt', type: 'string', default: 'blurry, distorted, low quality, artifacts, watermark', inputIndex: 1, description: 'Negative Prompt' },
          { name: 'prompt_2', type: 'string', default: '', inputIndex: 2, description: 'Secondary Prompt' },
          { name: 'negative_prompt_2', type: 'string', default: '', inputIndex: 3, description: 'Secondary Negative' },
          { name: 'use_negative_prompt', type: 'boolean', default: true, inputIndex: 4, description: 'Use Negative Prompt' },
          { name: 'seed', type: 'number', default: 42, min: 0, max: 2147483647, inputIndex: 5, description: 'Seed' },
          { name: 'width', type: 'number', default: 1024, min: 512, max: 1536, step: 64, inputIndex: 6, description: 'Width' },
          { name: 'height', type: 'number', default: 1024, min: 512, max: 1536, step: 64, inputIndex: 7, description: 'Height' },
          { name: 'guidance_scale', type: 'number', default: 7.5, min: 1, max: 20, step: 0.5, inputIndex: 8, description: 'Guidance Scale' },
          { name: 'num_inference_steps', type: 'number', default: 30, min: 10, max: 50, step: 1, inputIndex: 9, description: 'Steps' },
        ],
      },
    ],
  },
  {
    id: 'space_animatediff',
    name: 'AnimateDiff Lightning (ByteDance)',
    url: 'https://huggingface.co/spaces/ByteDance/AnimateDiff-Lightning',
    directApiUrl: 'https://bytedance-animatediff-lightning.hf.space',
    type: 'video',
    status: 'DISCOVERED',
    apiProtocol: 'v4_stream',
    description: 'Fast high-frame video generation synthesizing short cinematic motion clips from text prompts.',
    lastDiscoveredAt: Date.now(),
    isBuiltin: true,
    selectedEndpoint: '/generate',
    endpoints: [
      {
        path: '/generate',
        isQueue: true,
        outputType: 'video',
        parameters: [
          { name: 'prompt', type: 'string', default: 'A golden retriever running through autumn leaves in slow motion, cinematic 4k', inputIndex: 0, description: 'Prompt' },
          { name: 'negative_prompt', type: 'string', default: 'jitter, flicker, low quality, artifacts', inputIndex: 1, description: 'Negative Prompt' },
          { name: 'step', type: 'choice', default: '4-Step', choices: ['1-Step', '2-Step', '4-Step', '8-Step'], inputIndex: 2, description: 'Lightning Steps' },
          { name: 'seed', type: 'number', default: 100, min: 0, max: 2147483647, inputIndex: 3, description: 'Seed' },
        ],
      },
    ],
  },
  {
    id: 'space_i2vgen',
    name: 'I2VGen-XL (Ali-VILab)',
    url: 'https://huggingface.co/spaces/ali-vilab/i2vgen-xl',
    directApiUrl: 'https://ali-vilab-i2vgen-xl.hf.space',
    type: 'video',
    status: 'DISCOVERED',
    apiProtocol: 'v4_stream',
    description: 'High-definition Image-to-Video synthesis with smooth temporal coherence and motion physics.',
    lastDiscoveredAt: Date.now(),
    isBuiltin: true,
    selectedEndpoint: '/predict',
    endpoints: [
      {
        path: '/predict',
        isQueue: true,
        outputType: 'video',
        parameters: [
          { name: 'image', type: 'image', default: null, inputIndex: 0, description: 'Input Image' },
          { name: 'prompt', type: 'string', default: 'Camera zoom in, dynamic cinematic lighting, smooth realistic motion', inputIndex: 1, description: 'Motion Prompt' },
          { name: 'seed', type: 'number', default: 1234, min: 0, max: 2147483647, inputIndex: 2, description: 'Seed' },
        ],
      },
    ],
  },
];

/**
 * Discovers endpoints and parameter configuration from a Gradio Space URL.
 * Queries the server-side discovery proxy (`/api/gradio/discover`) to bypass CORS,
 * falling back to direct `/info` query.
 * REQUIREMENT 2: NEVER silently treats guessed endpoints as verified!
 */
export async function discoverSpace(
  urlInput: string,
  authToken?: string
): Promise<SpaceDiscoveryResult> {
  const { repoId, directHost, hfUrl } = normalizeSpaceUrl(urlInput);

  // Check if it's one of our built-in curated spaces first
  const existing = BUILTIN_SPACES.find(
    s => s.url.toLowerCase() === hfUrl.toLowerCase() || s.directApiUrl.toLowerCase() === directHost.toLowerCase()
  );
  if (existing) {
    return {
      success: true,
      verified: true,
      space: {
        ...existing,
        id: `space_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        lastDiscoveredAt: Date.now(),
        isBuiltin: false,
      },
    };
  }

  // Attempt 1: Server-side discovery proxy
  try {
    const proxyRes = await fetch('/api/gradio/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spaceUrl: urlInput, authToken }),
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.success && data.space) {
        return {
          success: true,
          verified: true,
          space: data.space,
        };
      } else {
        // Explicit discovery failure; do NOT guess
        return {
          success: false,
          verified: false,
          error: data.error || `Gradio schema discovery failed for ${directHost}`,
          repoId,
          directHost,
          hfUrl,
        };
      }
    }
  } catch {
    // If running in client-only mode without proxy, try direct fetch
  }

  // Attempt 2: Direct client fetch to `/info`
  try {
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    const infoRes = await fetch(`${directHost}/info`, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    clearTimeout(t);

    if (infoRes.ok) {
      const info = await infoRes.json();
      const endpoints: SpaceEndpoint[] = [];
      const namedEndpoints = info.named_endpoints || {};

      for (const [pathKey, spec] of Object.entries<any>(namedEndpoints)) {
        const path = pathKey.startsWith('/') ? pathKey : `/${pathKey}`;
        const params: GradioParamSpec[] = [];

        if (Array.isArray(spec.parameters)) {
          spec.parameters.forEach((param: any, idx: number) => {
            const component = (param.component || '').toLowerCase();
            const rawType = (param.type || '').toLowerCase();
            let type: GradioParamSpec['type'] = 'string';
            if (component === 'slider' || component === 'number' || rawType === 'number') type = 'number';
            else if (component === 'checkbox' || rawType === 'boolean') type = 'boolean';
            else if (component === 'dropdown' || component === 'radio') type = 'choice';
            else if (component === 'image' || rawType.includes('image')) type = 'image';
            else if (component === 'video' || rawType.includes('video')) type = 'video';

            params.push({
              name: param.parameter_name || param.label || `param_${idx}`,
              type,
              default: param.parameter_default !== undefined ? param.parameter_default : null,
              description: param.description || param.label || '',
              inputIndex: idx,
            });
          });
        }

        let outputType: MediaType = 'image';
        if (spec.returns && Array.isArray(spec.returns)) {
          const hasVideo = spec.returns.some(
            (r: any) =>
              r.component === 'Video' ||
              (typeof r.type === 'string' && r.type.toLowerCase().includes('video'))
          );
          if (hasVideo) outputType = 'video';
        }

        endpoints.push({ path, isQueue: true, parameters: params, outputType });
      }

      if (endpoints.length > 0) {
        return {
          success: true,
          verified: true,
          space: {
            id: `space_${Date.now()}`,
            name: repoId,
            url: hfUrl,
            directApiUrl: directHost,
            type: endpoints[0].outputType,
            status: 'DISCOVERED',
            apiProtocol: 'v4_stream',
            endpoints,
            selectedEndpoint: endpoints[0].path,
            description: `Verified Gradio 4/5 API (${endpoints.length} endpoint${endpoints.length > 1 ? 's' : ''})`,
            lastDiscoveredAt: Date.now(),
          },
        };
      }
    }
  } catch (err: any) {
    // Both failed
  }

  // REQUIREMENT 2: DO NOT GUESS. Return false with details so user can use Manual Mapping!
  return {
    success: false,
    verified: false,
    error: `Could not auto-discover endpoints for "${directHost}". The Space may be paused, private, or not exposing a standard /info schema. Please use Manual Endpoint Mapping to configure its parameters.`,
    repoId,
    directHost,
    hfUrl,
  };
}

/**
 * Builds the ordered positional parameter array expected by the Gradio endpoint.
 */
export function buildGradioPayload(
  paramsSpec: GradioParamSpec[],
  jobValues: {
    prompt: string;
    negativePrompt?: string;
    seed: number;
    width?: number;
    height?: number;
    numInferenceSteps?: number;
    guidanceScale?: number;
    numFrames?: number;
    fps?: number;
    motionBucket?: number;
    inputMediaData?: string;
    customParams?: Record<string, any>;
  }
): any[] {
  const sorted = [...paramsSpec].sort((a, b) => a.inputIndex - b.inputIndex);
  const payload: any[] = [];

  for (const param of sorted) {
    const key = param.name.toLowerCase();

    if (jobValues.customParams && jobValues.customParams[param.name] !== undefined) {
      payload.push(jobValues.customParams[param.name]);
    } else if (key.includes('negative') && jobValues.negativePrompt !== undefined) {
      payload.push(jobValues.negativePrompt);
    } else if (key.includes('prompt') && !key.includes('negative')) {
      payload.push(jobValues.prompt);
    } else if (key === 'seed') {
      payload.push(jobValues.seed);
    } else if (key === 'randomize_seed') {
      payload.push(false);
    } else if (key === 'width') {
      payload.push(jobValues.width ?? param.default ?? 1024);
    } else if (key === 'height') {
      payload.push(jobValues.height ?? param.default ?? 1024);
    } else if (key.includes('step') || key === 'num_inference_steps') {
      payload.push(jobValues.numInferenceSteps ?? param.default ?? 4);
    } else if (key.includes('guidance') || key === 'guidance_scale') {
      payload.push(jobValues.guidanceScale ?? param.default ?? 7.5);
    } else if (key.includes('frame') || key === 'num_frames') {
      payload.push(jobValues.numFrames ?? param.default ?? 16);
    } else if (key.includes('fps')) {
      payload.push(jobValues.fps ?? param.default ?? 8);
    } else if (key.includes('motion')) {
      payload.push(jobValues.motionBucket ?? param.default ?? 127);
    } else if (param.type === 'image' && jobValues.inputMediaData) {
      payload.push(jobValues.inputMediaData);
    } else {
      payload.push(param.default !== null ? param.default : '');
    }
  }

  return payload;
}

/**
 * Parses error messages from Gradio / HF responses into standard error categories.
 * Accurately differentiates quota exhaustion, auth failure, timeout, server errors.
 */
export function classifyGradioError(
  status: number,
  responseBody: string
): {
  type: 'QUOTA_EXHAUSTED' | 'RATE_LIMIT' | 'AUTH' | 'TIMEOUT' | 'SERVER_ERROR' | 'UNKNOWN';
  message: string;
} {
  const lower = (responseBody || '').toLowerCase();

  if (
    status === 429 ||
    lower.includes('quota') ||
    lower.includes('exceeded daily quota') ||
    lower.includes('zerogpu queue limit') ||
    lower.includes('gpu quota reached') ||
    lower.includes('too many requests')
  ) {
    return {
      type: 'QUOTA_EXHAUSTED',
      message: 'Hugging Face compute/GPU quota has been exhausted. Pending jobs are preserved and will not cycle accounts.',
    };
  }

  if (status === 401 || status === 403 || lower.includes('unauthorized') || lower.includes('invalid token')) {
    return {
      type: 'AUTH',
      message: 'Hugging Face authentication failed. Access token is invalid or unauthorized for this private/gated Space.',
    };
  }

  if (status === 504 || lower.includes('timeout') || lower.includes('timed out')) {
    return {
      type: 'TIMEOUT',
      message: 'Gradio worker processing timed out waiting for server computation.',
    };
  }

  if (status >= 500 || lower.includes('cuda out of memory') || lower.includes('runtimeerror')) {
    return {
      type: 'SERVER_ERROR',
      message: `Gradio Space server runtime error (HTTP ${status}): ${responseBody.slice(0, 150)}`,
    };
  }

  return {
    type: 'UNKNOWN',
    message: responseBody || `HTTP Error ${status}`,
  };
}
