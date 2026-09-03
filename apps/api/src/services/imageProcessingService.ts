import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config, requiredSecret } from '../config.js';

export interface WorkerResult {
  qrPayload: { v: 1; t: string; sid: string; iat: number; sig: string } | null;
  quality: Record<string, number>;
  answers: Array<{ question: number; fills: Array<{ choice: 'A' | 'B' | 'C' | 'D' | 'E'; fill: number }> }>;
}

function processLocally(filePath: string): Promise<WorkerResult> {
  return new Promise((resolve, reject) => {
    const script = path.resolve('workers/omr/omr_worker.py');
    const process = spawn(config.OMR_PYTHON_PATH, [script, '--input', filePath, '--template', 'A4_LANDSCAPE_2UP_HORIZONTAL_V1'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    let diagnostics = '';
    process.stdout.on('data', data => output += data);
    process.stderr.on('data', data => diagnostics += data);
    process.once('error', error => reject(new Error(`OMR_WORKER_UNAVAILABLE: ${error.message}`)));
    process.once('close', code => {
      if (code !== 0) return reject(new Error(`OMR_WORKER_FAILED: ${diagnostics.slice(-1000)}`));
      try { resolve(JSON.parse(output) as WorkerResult); }
      catch { reject(new Error('OMR_WORKER_INVALID_OUTPUT')); }
    });
  });
}

async function processOnVercel(filePath: string): Promise<WorkerResult> {
  const host = process.env.VERCEL_URL;
  if (!host) throw new Error('OMR_SERVICE_UNAVAILABLE');
  const extension = path.extname(filePath).toLowerCase().replace(/[^.a-z0-9]/g, '') || '.bin';
  const response = await fetch(`https://${host}/api/omr-worker?ext=${encodeURIComponent(extension)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream', 'X-OMR-Secret': requiredSecret('QR_HMAC_SECRET') },
    body: await fs.readFile(filePath),
    signal: AbortSignal.timeout(55_000),
  });
  const payload = await response.json().catch(() => null) as WorkerResult | { message?: string } | null;
  if (!response.ok) throw new Error(`OMR_WORKER_FAILED: ${payload && 'message' in payload ? payload.message : `HTTP ${response.status}`}`);
  return payload as WorkerResult;
}

export function processImage(filePath: string): Promise<WorkerResult> {
  return process.env.VERCEL ? processOnVercel(filePath) : processLocally(filePath);
}
