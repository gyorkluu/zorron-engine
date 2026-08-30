/**
 * Media Metadata Extraction Service using ffprobe.
 *
 * Safely probes uploaded audio/video files to extract duration, dimensions, and bitrate.
 * Falls back gracefully to default metadata if ffprobe is not present in the runtime environment.
 */

import { spawn } from 'node:child_process';
import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export interface MediaProbeResult {
  durationSec?: number;
  width?: number;
  height?: number;
  fps?: number;
  codec?: string;
  bitrate?: number;
}

export async function probeMediaBuffer(
  buffer: Buffer,
  filename: string,
): Promise<MediaProbeResult> {
  const ext = filename.includes('.') ? filename.substring(filename.lastIndexOf('.')) : '.tmp';
  const tmpFile = join(tmpdir(), `probe-${randomUUID()}${ext}`);

  try {
    await writeFile(tmpFile, buffer);

    return await new Promise<MediaProbeResult>((resolve) => {
      const proc = spawn('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        tmpFile,
      ]);

      let stdout = '';
      proc.stdout.on('data', (chunk) => {
        stdout += chunk;
      });

      proc.on('error', () => {
        // ffprobe not installed or spawn error -> fallback
        resolve({});
      });

      proc.on('close', (code) => {
        if (code !== 0 || !stdout) {
          return resolve({});
        }

        try {
          const data = JSON.parse(stdout);
          const format = data.format || {};
          const videoStream = (data.streams || []).find((s: any) => s.codec_type === 'video');
          const audioStream = (data.streams || []).find((s: any) => s.codec_type === 'audio');

          const durationSec = format.duration ? parseFloat(format.duration) : undefined;
          const width = videoStream?.width;
          const height = videoStream?.height;

          let fps: number | undefined;
          if (videoStream?.r_frame_rate) {
            const parts = videoStream.r_frame_rate.split('/');
            if (parts.length === 2 && parseFloat(parts[1]) > 0) {
              fps = Math.round((parseFloat(parts[0]) / parseFloat(parts[1])) * 100) / 100;
            }
          }

          resolve({
            durationSec: durationSec ? Math.round(durationSec * 100) / 100 : undefined,
            width,
            height,
            fps,
            codec: videoStream?.codec_name || audioStream?.codec_name,
            bitrate: format.bit_rate ? parseInt(format.bit_rate, 10) : undefined,
          });
        } catch {
          resolve({});
        }
      });
    });
  } catch {
    return {};
  } finally {
    try {
      await unlink(tmpFile);
    } catch {
      // Ignore cleanup error
    }
  }
}
