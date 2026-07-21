/**
 * Lightweight 3D projection utilities for the personality vector space.
 *
 * Uses an isometric-style perspective projection on a 2D canvas. This avoids
 * pulling in a heavy WebGL dependency (three.js / @react-three/fiber) while
 * still rendering a readable 3D coordinate system with axes, result anchors and
 * the user's current vector position.
 *
 * The projection maps a 3D point `(x, y, z)` to a 2D screen point using a
 * fixed camera angle. The camera can be rotated by adjusting `yaw` so users
 * can inspect the space from different sides.
 *
 * Vectors may carry any number of dimensions (2D, the legacy 3D `{x,y,z}`, 4D,
 * ...). Only the first three axes (in `Object.keys` order) are used for the 3D
 * projection; missing axes default to 0 so a 2D vector still renders on the XZ
 * floor with a zero height component.
 */

import type { AxisId, PersonalityVector, Vector } from '@/types/flow';

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

/**
 * Extract the first three axis values from an N-dimensional vector as the
 * 3D triple `[x, y, z]` consumed by the projection math. Axes beyond the
 * third are ignored, and missing axes (when the vector has fewer than three
 * dimensions) default to `0`.
 */
function extractXYZ(vector: Vector): [number, number, number] {
  const keys = Object.keys(vector).slice(0, 3);
  return [
    keys[0] !== undefined ? (vector[keys[0]] ?? 0) : 0,
    keys[1] !== undefined ? (vector[keys[1]] ?? 0) : 0,
    keys[2] !== undefined ? (vector[keys[2]] ?? 0) : 0,
  ];
}

/** Project a 3D point `(x, y, z)` to a 2D screen point using the camera. */
function projectXYZ(
  x: number,
  y: number,
  z: number,
  camera: Camera,
  origin: ScreenPoint,
  scale: number,
): ScreenPoint {
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

/** Project an N-dimensional vector to a 2D screen point using its first three axes. */
export function project(
  vector: PersonalityVector,
  camera: Camera,
  origin: ScreenPoint,
  scale: number,
): ScreenPoint {
  const [x, y, z] = extractXYZ(vector);
  return projectXYZ(x, y, z, camera, origin, scale);
}

/** The three coordinate axes as line segments from origin to the given length. */
export interface AxisLine {
  start: ScreenPoint;
  end: ScreenPoint;
  label: string;
  color: string;
}

/** Distinct colors for the (up to) three projected axes: red, green, blue. */
const AXIS_COLORS = ['#ef4444', '#22c55e', '#3b82f6'];

/** End-point triples for each of the three projected axes. */
const AXIS_ENDS: Array<[number, number, number]> = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

/**
 * Build coordinate axis lines from the first three axes of `labels`.
 *
 * Each axis runs from the origin to `length` along its own direction. If
 * `labels` carries fewer than three entries, only that many axes are drawn.
 */
export function buildAxes(
  camera: Camera,
  origin: ScreenPoint,
  scale: number,
  length: number,
  labels: Record<AxisId, string>,
): AxisLine[] {
  return Object.entries(labels)
    .slice(0, 3)
    .map(([, label], i) => {
      const [ex, ey, ez] = AXIS_ENDS[i];
      return {
        start: projectXYZ(0, 0, 0, camera, origin, scale),
        end: projectXYZ(ex * length, ey * length, ez * length, camera, origin, scale),
        label,
        color: AXIS_COLORS[i] ?? '#94a3b8',
      };
    });
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
  /** Axis labels keyed by axis id (only the first three are projected). */
  axisLabels: Record<AxisId, string>;
  /** Result anchors to render. */
  sects: Array<{ id: string; name: string; vector: PersonalityVector }>;
  /** The user's current vector position. */
  userVector: PersonalityVector;
  /** Optional highlighted anchor id (e.g. the matched settlement anchor). */
  highlightedAnchorId?: string | null;
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
    highlightedAnchorId = null,
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

  // Draw result anchors.
  for (const sect of sects) {
    const point = project(sect.vector, camera, origin, scale);
    const isHighlighted = sect.id === highlightedAnchorId;
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
  const [ux, uy, uz] = extractXYZ(userVector);
  const userPoint = projectXYZ(ux, uy, uz, camera, origin, scale);
  const floorPoint = projectXYZ(ux, 0, uz, camera, origin, scale);

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

  // Coordinate readout next to the user point (first three projected axes).
  ctx.fillStyle = '#67e8f9';
  ctx.font = '11px ui-monospace, monospace';
  const readout = `(${ux.toFixed(1)}, ${uy.toFixed(1)}, ${uz.toFixed(1)})`;
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
