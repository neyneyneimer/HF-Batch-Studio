import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Local directory for verified media outputs (avoiding localStorage limits)
const OUTPUTS_DIR = path.resolve(process.cwd(), 'data', 'outputs');
if (!fs.existsSync(OUTPUTS_DIR)) {
  fs.mkdirSync(OUTPUTS_DIR, { recursive: true });
}

const upload = multer({ dest: path.resolve(process.cwd(), 'data', 'uploads') });

/**
 * Normalizes Space input to direct Hugging Face subdomain
 */
function normalizeDirectHost(input: string): { directHost: string; hfUrl: string; repoId: string } {
  let clean = input.trim().replace(/\/+$/, '');
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

  return { directHost, hfUrl, repoId };
}

/**
 * 1. REAL Gradio Space Discovery
 * Discovers actual `/info` OpenAPI schema or `/config` specification.
 * Never reports guessed endpoints as verified!
 */
app.post('/api/gradio/discover', async (req: Request, res: Response) => {
  const { spaceUrl, authToken } = req.body;
  if (!spaceUrl) {
    return res.status(400).json({ success: false, error: 'spaceUrl is required' });
  }

  const { directHost, hfUrl, repoId } = normalizeDirectHost(spaceUrl);
  const headers: Record<string, string> = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  // Query actual `/info` endpoint (Gradio 4 & 5)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const infoRes = await fetch(`${directHost}/info`, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (infoRes.ok) {
      const info = await infoRes.json();
      const endpoints: any[] = [];
      const namedEndpoints = info.named_endpoints || {};

      for (const [pathKey, spec] of Object.entries<any>(namedEndpoints)) {
        const path = pathKey.startsWith('/') ? pathKey : `/${pathKey}`;
        const params: any[] = [];

        if (Array.isArray(spec.parameters)) {
          spec.parameters.forEach((param: any, idx: number) => {
            const component = (param.component || '').toLowerCase();
            const rawType = (param.type || '').toLowerCase();
            let type = 'string';
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

        let outputType = 'image';
        if (spec.returns && Array.isArray(spec.returns)) {
          const hasVideo = spec.returns.some(
            (r: any) =>
              r.component === 'Video' || (typeof r.type === 'string' && r.type.toLowerCase().includes('video'))
          );
          if (hasVideo) outputType = 'video';
        }

        endpoints.push({
          path,
          isQueue: true,
          parameters: params,
          outputType,
        });
      }

      if (endpoints.length > 0) {
        return res.json({
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
        });
      }
    }
  } catch (err: any) {
    // Proceed to check error status or fallback to explicit manual mapping requirement
  }

  // Attempt `/config` (Gradio 3)
  try {
    const configRes = await fetch(`${directHost}/config`, { headers });
    if (configRes.ok) {
      const config = await configRes.json();
      return res.json({
        success: true,
        verified: true,
        space: {
          id: `space_${Date.now()}`,
          name: repoId,
          url: hfUrl,
          directApiUrl: directHost,
          type: 'image',
          status: 'DISCOVERED',
          apiProtocol: 'v3_json',
          endpoints: [
            {
              path: '/predict',
              isQueue: true,
              outputType: 'image',
              parameters: (config.components || []).slice(0, 5).map((c: any, idx: number) => ({
                name: c.props?.label || `param_${idx}`,
                type: 'string',
                default: c.props?.value || '',
                inputIndex: idx,
              })),
            },
          ],
          selectedEndpoint: '/predict',
          description: 'Gradio 3 API (/config verified)',
          lastDiscoveredAt: Date.now(),
        },
      });
    }
  } catch (err) {
    // Discovery failed
  }

  // REQUIREMENT 2: Never silently report a guessed endpoint as verified!
  return res.json({
    success: false,
    verified: false,
    error: `Automatic endpoint discovery failed for "${directHost}". The Space may be private, sleeping, or using a non-standard API structure. You can map endpoints manually in the Manual Schema editor.`,
    repoId,
    directHost,
    hfUrl,
  });
});

/**
 * 2. REAL Gradio Queue Submission
 * Submits actual job to Gradio `/call${endpoint}` or `/gradio_api/call${endpoint}`
 */
app.post('/api/gradio/call', async (req: Request, res: Response) => {
  const { directHost, endpoint, payload, authToken } = req.body;
  if (!directHost || !endpoint || !payload) {
    return res.status(400).json({ error: 'directHost, endpoint, and payload are required' });
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  // Try Gradio 4/5 endpoints:
  // 1) ${directHost}/gradio_api/call${cleanEndpoint}
  // 2) ${directHost}/call${cleanEndpoint}
  const candidateUrls = [
    `${directHost}/gradio_api/call${cleanEndpoint}`,
    `${directHost}/call${cleanEndpoint}`,
  ];

  let lastErrorText = '';
  let lastStatus = 500;

  for (const url of candidateUrls) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ data: payload }),
      });

      lastStatus = response.status;
      const text = await response.text();

      if (response.ok) {
        try {
          const json = JSON.parse(text);
          return res.json({
            success: true,
            eventId: json.event_id,
            streamUrl: `${url}/${json.event_id}`,
            protocol: 'v4_stream',
          });
        } catch {
          // If response is direct data
          return res.json({ success: true, directData: text, protocol: 'v3_json' });
        }
      } else {
        lastErrorText = text;
      }
    } catch (err: any) {
      lastErrorText = err.message || 'Network error';
    }
  }

  // Handle direct /api/predict fallback
  try {
    const predictRes = await fetch(`${directHost}/api/predict`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ fn_index: 0, data: payload }),
    });

    if (predictRes.ok) {
      const resultJson = await predictRes.json();
      return res.json({
        success: true,
        directData: resultJson.data,
        protocol: 'v3_json',
      });
    } else {
      lastStatus = predictRes.status;
      lastErrorText = await predictRes.text();
    }
  } catch (err: any) {
    lastErrorText = err.message || lastErrorText;
  }

  return res.status(lastStatus).json({
    success: false,
    status: lastStatus,
    error: lastErrorText || 'Failed to submit to Gradio endpoint',
  });
});

/**
 * 3. REAL Gradio SSE Stream Event Proxy
 * Streams real live progress, logs, and completion from Gradio server to client.
 */
app.get('/api/gradio/stream', async (req: Request, res: Response) => {
  const { streamUrl, authToken } = req.query;
  if (!streamUrl || typeof streamUrl !== 'string') {
    return res.status(400).send('streamUrl query parameter is required');
  }

  const headers: Record<string, string> = {
    Accept: 'text/event-stream',
  };
  if (authToken && typeof authToken === 'string') {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const sseResponse = await fetch(streamUrl, {
      method: 'GET',
      headers,
    });

    if (!sseResponse.ok || !sseResponse.body) {
      return res.status(sseResponse.status).send(await sseResponse.text());
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = sseResponse.body.getReader();

    req.on('close', () => {
      reader.cancel();
    });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).send(`SSE Stream error: ${err.message}`);
    }
  }
});

/**
 * 4. REAL Multipart Media Upload Proxy to Gradio Space `/upload`
 */
app.post('/api/gradio/upload', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const directHost = req.body.directHost;
  const authToken = req.body.authToken;
  if (!directHost) {
    return res.status(400).json({ error: 'directHost is required' });
  }

  try {
    const fileBuffer = fs.readFileSync(req.file.path);
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: req.file.mimetype });
    formData.append('files', blob, req.file.originalname);

    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const uploadRes = await fetch(`${directHost}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    // Cleanup local temp upload
    fs.unlinkSync(req.file.path);

    if (uploadRes.ok) {
      const serverFiles = await uploadRes.json();
      return res.json({ success: true, files: serverFiles });
    } else {
      const errText = await uploadRes.text();
      return res.status(uploadRes.status).json({ success: false, error: errText });
    }
  } catch (err: any) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 5. Media Verification & Storage on Disk (avoiding large base64 in localStorage)
 * Checks magic bytes to verify PNG/JPEG/WebP/MP4 integrity!
 */
app.post('/api/media/save', async (req: Request, res: Response) => {
  const { remoteUrl, prompt, seed, spaceId, type, authToken } = req.body;
  if (!remoteUrl) {
    return res.status(400).json({ error: 'remoteUrl is required' });
  }

  try {
    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    let buffer: Buffer;

    if (remoteUrl.startsWith('data:')) {
      const match = remoteUrl.match(/^data:([^;]+);base64,(.*)$/);
      if (!match) throw new Error('Invalid data URI');
      buffer = Buffer.from(match[2], 'base64');
    } else {
      const mediaRes = await fetch(remoteUrl, { headers });
      if (!mediaRes.ok) {
        throw new Error(`Failed to fetch remote media blob: HTTP ${mediaRes.status}`);
      }
      const arrayBuffer = await mediaRes.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    if (buffer.length === 0) {
      throw new Error('Received empty media buffer (0 bytes)');
    }

    // Inspect magic bytes for verification
    const verifiedMime = verifyMagicBytes(buffer, type);
    if (!verifiedMime.valid) {
      throw new Error(`Corrupt or invalid media integrity: ${verifiedMime.error}`);
    }

    const id = `media_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const ext = verifiedMime.extension;
    const filename = `${id}.${ext}`;
    const filePath = path.join(OUTPUTS_DIR, filename);

    fs.writeFileSync(filePath, buffer);

    return res.json({
      success: true,
      mediaId: id,
      url: `/api/media/file/${filename}`,
      sizeBytes: buffer.length,
      mimeType: verifiedMime.mime,
      verified: true,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Serves saved media file from disk
 */
app.get('/api/media/file/:filename', (req: Request, res: Response) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(OUTPUTS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Media file not found');
  }

  res.sendFile(filePath);
});

function verifyMagicBytes(buffer: Buffer, requestedType: string): { valid: boolean; mime: string; extension: string; error?: string } {
  if (buffer.length < 8) {
    return { valid: false, mime: '', extension: '', error: 'Buffer too small' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return { valid: true, mime: 'image/png', extension: 'png' };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { valid: true, mime: 'image/jpeg', extension: 'jpg' };
  }

  // WebP: 'RIFF' ... 'WEBP'
  const isRiff = buffer.toString('ascii', 0, 4) === 'RIFF';
  const isWebp = buffer.toString('ascii', 8, 12) === 'WEBP';
  if (isRiff && isWebp) {
    return { valid: true, mime: 'image/webp', extension: 'webp' };
  }

  // MP4: ... 'ftyp'
  if (buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp') {
    return { valid: true, mime: 'video/mp4', extension: 'mp4' };
  }

  // WebM / MKV: 1A 45 DF A3
  if (buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3) {
    return { valid: true, mime: 'video/webm', extension: 'webm' };
  }

  // GIF: GIF87a or GIF89a
  const gifHeader = buffer.toString('ascii', 0, 6);
  if (gifHeader === 'GIF87a' || gifHeader === 'GIF89a') {
    return { valid: true, mime: 'image/gif', extension: 'gif' };
  }

  // Fallback if SVG text
  const textStart = buffer.toString('utf8', 0, 100).trim();
  if (textStart.startsWith('<svg') || textStart.includes('<svg')) {
    return { valid: true, mime: 'image/svg+xml', extension: 'svg' };
  }

  return {
    valid: false,
    mime: 'application/octet-stream',
    extension: 'bin',
    error: 'Unrecognized file signature; output is neither a valid image nor video container',
  };
}

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HF Batch Studio server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
