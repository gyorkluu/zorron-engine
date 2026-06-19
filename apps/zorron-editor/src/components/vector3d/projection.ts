/**
 * Lightweight 3D projection utilities for the personality vector space.
 *
 * Uses an isometric-style perspective projection on a 2D canvas. This avoids
 * pulling in a heavy WebGL dependency (three.js / @react-three/fiber) while
 * still rendering a readable 3D coordinate system with axes, sect anchors and
 * the user's current vector position.
 *
 * The projection maps a 3D point `(x, y, z)` to a 2D screen point using a
 * fixed camera angle. The camera can be rotated by adjusting `yaw` so users
 * can inspect the space from different sides.
 */

import type { PersonalityVector } from '@/types/flow';

/** A 2D screen point. */
export interface ScreenPoint {
  x: number;
  y: number;
}

/** Camera parameters for the 3D projection. */
export interface Camera {
  /** Horizontal rotation in radians. */
  yaw: number;
  /** Vertical tilt in radians (0 = top-down, Math.PI/2 = side view). */
  pitch: number;
  /** Zoom factor. */
  zoom: number;
}

/** Default camera angle: a pleasant 3/4 view. */
export const DEFAULT_CAMERA: Camera = {
  yaw: Math.PI / 6,
  pitch: Math.PI / 3.5,
  zoom: 1,
};

/** Project a 3D vector to a 2D screen point using the camera. */
export function project(
  vector: PersonalityVector,
  camera: Camera,
  origin: ScreenPoint,
  scale: number,
): ScreenPoint {
  const { x, y, z } = vector;
  const { yaw, pitch, zoom } = camera;
  const s = scale * zoom;

  // Rotate around the Y axis (yaw), then tilt around the X axis (pitch).
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);

  // World rotation: yaw around vertical axis.
  const rx = x * cosY - z * sinY;
  const rz = x * sinY + z * cosY;
  const ry = y;

  // Apply pitch (tilt the camera down).
  const screenX = rx * s;
  const screenY = ry * cosP * s - rz * sinP * s;

  return {
    x: origin.x + screenX,
    y: origin.y - screenY,
  };
}

/** The three coordinate axes as line segments from origin to the given length. */
export interface AxisLine {
  start: ScreenPoint;
  end: ScreenPoint;
  label: string;
  color: string;
}

/** Build the three axis lines for rendering. */
export function buildAxes(
  camera: Camera,
  origin: ScreenPoint,
  scale: number,
  length: number,
  labels: { x: string; y: string; z: string },
): AxisLine[] {
  const zero: PersonalityVector = { x: 0, y: 0, z: 0 };
  return [
    {
      start: project(zero, camera, origin, scale),
      end: project({ x: length, y: 0, z: 0 }, camera, origin, scale),
      label: labels.x,
      color: '#ef4444', // red for X
    },
    {
      start: project(zero, camera, origin, scale),
      end: project({ x: 0, y: length, z: 0 }, camera, origin, scale),
      label: labels.y,
      color: '#22c55e', // green for Y
    },
    {
      start: project(zero, camera, origin, scale),
      end: project({ x: 0, y: 0, z: length }, camera, origin, scale),
      label: labels.z,
      color: '#3b82f6', // blue for Z
    },
  ];
}

/** Draw the vector space scene onto a 2D canvas rendering context. */
export interface VectorSpaceRenderOptions {
  /** Canvas 2D context. */
  ctx: CanvasRenderingContext2D;
  /** Canvas pixel width. */
  width: number;
  /** Canvas pixel height. */
  height: number;
  /** Camera parameters. */
  camera: Camera;
  /** Axis labels. */
  axisLabels: { x: string; y: string; z: string };
  /** Sect anchors to render. */
  sects: Array<{ id: string; name: string; vector: PersonalityVector }>;
  /** The user's current vector position. */
  userVector: PersonalityVector;
  /** Optional highlighted sect id (e.g. the matched settlement sect). */
  highlightedSectId?: string | null;
  /** Scale factor: world units to pixels per unit. */
  scale?: number;
  /** Axis length in world units. */
  axisLength?: number;
}

/** Render the full vector space scene to the canvas. */
export function renderVectorSpace(options: VectorSpaceRenderOptions): void {
  const {
    ctx,
    width,
    height,
    camera,
    axisLabels,
    sects,
    userVector,
    highlightedSectId = null,
    scale = 40,
    axisLength = 5,
  } = options;

  // Clear with a dark background.
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, width, height);

  const origin: ScreenPoint = { x: width / 2, y: height / 2 };

  // Draw grid lines on the XZ plane (the "floor").
  drawFloorGrid(ctx, camera, origin, scale, axisLength);

  // Draw the three axes.
  const axes = buildAxes(camera, origin, scale, axisLength, axisLabels);
  for (const axis of axes) {
    ctx.beginPath();
    ctx.moveTo(axis.start.x, axis.start.y);
    ctx.lineTo(axis.end.x, axis.end.y);
    ctx.strokeStyle = axis.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Axis label.
    ctx.fillStyle = axis.color;
    ctx.font = '12px ui-monospace, monospace';
    ctx.fillText(axis.label, axis.end.x + 6, axis.end.y + 4);
  }

  // Draw sect anchors.
  for (const sect of sects) {
    const point = project(sect.vector, camera, origin, scale);
    const isHighlighted = sect.id === highlightedSectId;
    ctx.beginPath();
    ctx.arc(point.x, point.y, isHighlighted ? 7 : 5, 0, Math.PI * 2);
    ctx.fillStyle = isHighlighted ? '#f472b6' : '#a78bfa';
    ctx.fill();
    ctx.strokeStyle = isHighlighted ? '#fce7f3' : '#c4b5fd';
    ctx.lineWidth = isHighlighted ? 2 : 1;
    ctx.stroke();

    // Sect name label.
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '10px ui-sans-serif, system-ui';
    ctx.fillText(sect.name, point.x + 8, point.y - 6);
  }

  // Draw the user's current vector as a glowing dot with a stem to the floor.
  const userPoint = project(userVector, camera, origin, scale);
  const floorPoint = project(
    { x: userVector.x, y: 0, z: userVector.z },
    camera,
    origin,
    scale,
  );

  // Stem from the floor to the user point.
  ctx.beginPath();
  ctx.moveTo(floorPoint.x, floorPoint.y);
  ctx.lineTo(userPoint.x, userPoint.y);
  ctx.strokeStyle = '#22d3ee88';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Floor projection dot.
  ctx.beginPath();
  ctx.arc(floorPoint.x, floorPoint.y, 3, 0, Math.PI * 2);
  ctx.fillStyle = '#22d3ee44';
  ctx.fill();

  // User point with glow.
  ctx.beginPath();
  ctx.arc(userPoint.x, userPoint.y, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#22d3ee';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(userPoint.x, userPoint.y, 10, 0, Math.PI * 2);
  ctx.strokeStyle = '#22d3ee44';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Coordinate readout next to the user point.
  ctx.fillStyle = '#67e8f9';
  ctx.font = '11px ui-monospace, monospace';
  const readout = `(${userVector.x.toFixed(1)}, ${userVector.y.toFixed(1)}, ${userVector.z.toFixed(1)})`;
  ctx.fillText(readout, userPoint.x + 12, userPoint.y + 4);
}

/** Draw a grid on the XZ plane (the "floor" of the vector space). */
function drawFloorGrid(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  origin: ScreenPoint,
  scale: number,
  length: number,
): void {
  const steps = length;
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;

  for (let i = -steps; i <= steps; i++) {
    // Lines parallel to the X axis (varying Z).
    const start = project({ x: -steps, y: 0, z: i }, camera, origin, scale);
    const end = project({ x: steps, y: 0, z: i }, camera, origin, scale);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    // Lines parallel to the Z axis (varying X).
    const start2 = project({ x: i, y: 0, z: -steps }, camera, origin, scale);
    const end2 = project({ x: i, y: 0, z: steps }, camera, origin, scale);
    ctx.beginPath();
    ctx.moveTo(start2.x, start2.y);
    ctx.lineTo(end2.x, end2.y);
    ctx.stroke();
  }
}
