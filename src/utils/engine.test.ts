import test from 'node:test';
import assert from 'node:assert/strict';
import { expandPromptMatrix, calculateSeed, parseBulkPrompts } from './promptMatrix';
import { classifyGradioError, buildGradioPayload, normalizeSpaceUrl } from './gradioAdapter';
import { GradioParamSpec } from '../types';
import { estimatePromptTokens, parseAndValidateImport } from './exportManager';

test('expandPromptMatrix expands combinatorial matrix brackets', () => {
  const single = 'A photo of a cat';
  assert.deepEqual(expandPromptMatrix(single), ['A photo of a cat']);

  const template = 'A {red|blue} car';
  const expanded = expandPromptMatrix(template);
  assert.deepEqual(expanded, ['A red car', 'A blue car']);

  const multi = '{cyberpunk|steampunk} portrait of a {cat|fox}';
  const multiExpanded = expandPromptMatrix(multi);
  assert.equal(multiExpanded.length, 4);
  assert.deepEqual(multiExpanded, [
    'cyberpunk portrait of a cat',
    'cyberpunk portrait of a fox',
    'steampunk portrait of a cat',
    'steampunk portrait of a fox',
  ]);
});

test('calculateSeed produces predictable sequences', () => {
  // Fixed
  assert.equal(calculateSeed('fixed', 42, 0), 42);
  assert.equal(calculateSeed('fixed', 42, 5), 42);

  // Sequential
  assert.equal(calculateSeed('sequential', 100, 0), 100);
  assert.equal(calculateSeed('sequential', 100, 1), 101);
  assert.equal(calculateSeed('sequential', 100, 9), 109);

  // Random produces numbers in valid 32-bit uint range
  const randomSeed = calculateSeed('random', 0, 0);
  assert.ok(randomSeed >= 0 && randomSeed <= 2147483647);
});

test('parseBulkPrompts handles plain lines and CSV headers', () => {
  const plainText = `
    Neon samurai in the rain
    Cybernetic falcon perched on skyscraper
    # Comment line to ignore
    Astronaut drinking coffee on Mars
  `;
  const plainParsed = parseBulkPrompts(plainText);
  assert.equal(plainParsed.length, 3);
  assert.equal(plainParsed[0].prompt, 'Neon samurai in the rain');

  const csvText = `
    prompt,negative_prompt,seed
    "A cozy wooden cabin", "ugly, blurry", 1234
    "Sleek supercar", "low quality", 5678
  `;
  const csvParsed = parseBulkPrompts(csvText);
  assert.equal(csvParsed.length, 2);
  assert.equal(csvParsed[0].prompt, 'A cozy wooden cabin');
  assert.equal(csvParsed[0].negativePrompt, 'ugly, blurry');
  assert.equal(csvParsed[0].seed, 1234);
});

test('classifyGradioError categorizes quota, auth, and timeout states correctly', () => {
  // Quota Exhausted
  const quotaErr = classifyGradioError(429, 'Rate limit exceeded: GPU quota reached for this 24-hour cycle');
  assert.equal(quotaErr.type, 'QUOTA_EXHAUSTED');
  assert.ok(quotaErr.message.includes('quota'));

  const zeroGpuErr = classifyGradioError(200, 'ZeroGPU queue limit exceeded. Please wait 12 minutes');
  assert.equal(zeroGpuErr.type, 'QUOTA_EXHAUSTED');

  // Auth failure
  const authErr = classifyGradioError(401, 'Unauthorized: Invalid token');
  assert.equal(authErr.type, 'AUTH');

  // Timeout
  const timeoutErr = classifyGradioError(504, 'Gateway Timeout');
  assert.equal(timeoutErr.type, 'TIMEOUT');

  // Server error
  const serverErr = classifyGradioError(500, 'RuntimeError: CUDA out of memory');
  assert.equal(serverErr.type, 'SERVER_ERROR');
});

test('normalizeSpaceUrl parses repo IDs and direct subdomains', () => {
  const hfUrl = normalizeSpaceUrl('https://huggingface.co/spaces/black-forest-labs/FLUX.1-schnell');
  assert.equal(hfUrl.repoId, 'black-forest-labs/FLUX.1-schnell');
  assert.equal(hfUrl.directHost, 'https://black-forest-labs-flux-1-schnell.hf.space');

  const repoOnly = normalizeSpaceUrl('stabilityai/stable-diffusion-xl-base-1.0');
  assert.equal(repoOnly.repoId, 'stabilityai/stable-diffusion-xl-base-1.0');
  assert.ok(repoOnly.directHost.includes('stabilityai-stable-diffusion-xl-base-1-0.hf.space'));
});

test('buildGradioPayload preserves correct parameter indexing', () => {
  const specs: GradioParamSpec[] = [
    { name: 'prompt', type: 'string', default: '', inputIndex: 0 },
    { name: 'seed', type: 'number', default: 0, inputIndex: 1 },
    { name: 'width', type: 'number', default: 1024, inputIndex: 2 },
    { name: 'height', type: 'number', default: 1024, inputIndex: 3 },
  ];

  const payload = buildGradioPayload(specs, {
    prompt: 'A golden lion',
    seed: 777,
    width: 512,
    height: 768,
  });

  assert.deepEqual(payload, ['A golden lion', 777, 512, 768]);
});

test('estimatePromptTokens calculates text token metrics correctly', () => {
  const shortPrompt = 'A cute cat';
  const tokens = estimatePromptTokens(shortPrompt);
  assert.ok(tokens >= 3 && tokens <= 6);

  const withNegative = estimatePromptTokens('A cute cat, cinematic lighting', 'blurry, distorted');
  assert.ok(withNegative > tokens);
});

test('parseAndValidateImport handles valid and invalid JSON packages', () => {
  const invalidJson = '{ not valid json }';
  const invalidRes = parseAndValidateImport(invalidJson);
  assert.equal(invalidRes.valid, false);
  assert.ok(invalidRes.error?.includes('Invalid JSON'));

  const validPackage = JSON.stringify({
    formatVersion: '1.0',
    application: 'HF Batch Studio',
    scope: 'jobs',
    jobs: [
      {
        id: 'job_test_1',
        prompt: 'Testing prompt',
        seed: 42,
        status: 'QUEUED',
      },
    ],
  });

  const validRes = parseAndValidateImport(validPackage);
  assert.equal(validRes.valid, true);
  assert.equal(validRes.data?.scope, 'jobs');
  assert.equal(validRes.data?.jobs?.length, 1);
});

