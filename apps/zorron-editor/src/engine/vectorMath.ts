/**
 * Vector math utilities for the N-dimensional personality space.
 *
 * Pure functions, no DOM or framework dependencies. Used by the GameEngine,
 * the simulator, and the vector space panel. All functions operate on the
 * generalized {@link Vector} type (a `Record<AxisId, number>`), so they work
 * with any number of dimensions: 2D, the legacy 3D `{x,y,z}`, 4D, etc.
 *
 * Axis iteration order follows JS object key insertion order (stable for
 * string keys), so callers that need a canonical axis order should pass
 * vectors built with the same axis insertion sequence (e.g. via
 * {@link createZeroVector} with an explicit `axisIds` list).
 */

import type { AxisId, Vector, PersonalityVector, SectAnchor } from '@/types/flow';

/**
 * The empty vector. Adding `{}` to any vector is a no-op, so this serves as
 * the identity element for vector addition. Callers that need a vector with
 * explicit zeroed axes (e.g. for UI rendering) should use
 * {@link createZeroVector} instead.
 */
export const ZERO_VECTOR: PersonalityVector = {};

/** Create a zero vector with the given axis ids explicitly set to 0. */
export function createZeroVector(axisIds: AxisId[]): Vector {
  const v: Vector = {};
  for (const id of axisIds) v[id] = 0;
  return v;
}

/**
 * Ensure `v` contains every axis in `axisIds`, defaulting missing axes to 0.
 * Does not remove extra axes present in `v`. Returns a new vector.
 */
export function ensureAxes(v: Vector, axisIds: AxisId[]): Vector {
  const out: Vector = { ...v };
  for (const id of axisIds) {
    if (!(id in out)) out[id] = 0;
  }
  return out;
}

/** Add two vectors component-wise. Missing axes are treated as 0. */
export function add(a: Vector, b: Vector): Vector {
  const out: Vector = { ...a };
  for (const k of Object.keys(b)) {
    out[k] = (out[k] ?? 0) + b[k];
  }
  return out;
}

/** Subtract vector `b` from `a`. Missing axes are treated as 0. */
export function sub(a: Vector, b: Vector): Vector {
  const out: Vector = { ...a };
  for (const k of Object.keys(b)) {
    out[k] = (out[k] ?? 0) - b[k];
  }
  return out;
}

/** Scale a vector by a scalar. */
export function scale(v: Vector, k: number): Vector {
  const out: Vector = {};
  for (const key of Object.keys(v)) {
    out[key] = v[key] * k;
  }
  return out;
}

/** Euclidean magnitude: sqrt(sum of squares). */
export function magnitude(v: Vector): number {
  let sum = 0;
  for (const key of Object.keys(v)) {
    const n = v[key];
    sum += n * n;
  }
  return Math.sqrt(sum);
}

/** Euclidean distance between two vectors. Missing axes are treated as 0. */
export function distance(a: Vector, b: Vector): number {
  const keys = new Set<string>([...Object.keys(a), ...Object.keys(b)]);
  let sum = 0;
  for (const k of keys) {
    const d = (a[k] ?? 0) - (b[k] ?? 0);
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/**
 * Quadrant signature like "+-+" based on component signs.
 *
 * The signature is built by iterating `Object.keys(v)` in insertion order.
 * Callers that need a canonical signature across vectors with potentially
 * different axis sets should pass them through {@link ensureAxes} first.
 */
export function quadrant(v: Vector): string {
  const sign = (n: number) => (n >= 0 ? '+' : '-');
  let s = '';
  for (const key of Object.keys(v)) {
    s += sign(v[key]);
  }
  return s;
}

/**
 * Find the nearest sect anchor to a vector.
 *
 * Algorithm (ported from the legacy GameEngine):
 * 1. Lock to the player's quadrant first.
 * 2. If no sects share the quadrant, fall back to a global search.
 * 3. Return the sect with the minimum Euclidean distance.
 */
export function findNearestSect(
  point: Vector,
  sects: SectAnchor[],
): { sect: SectAnchor | null; distance: number } {
  if (sects.length === 0) return { sect: null, distance: Infinity };

  const playerQuadrant = quadrant(point);
  let candidates = sects.filter((s) => quadrant(s.vector) === playerQuadrant);
  if (candidates.length === 0) {
    candidates = sects;
  }

  let nearest: SectAnchor | null = null;
  let minDistance = Infinity;
  for (const sect of candidates) {
    const d = distance(point, sect.vector);
    if (d < minDistance) {
      minDistance = d;
      nearest = sect;
    }
  }
  return { sect: nearest, distance: minDistance };
}

/** Sum a list of vectors into a single resultant vector. */
export function sum(vectors: Vector[]): Vector {
  return vectors.reduce(add, { ...ZERO_VECTOR });
}

/** Clamp each component to the range [min, max]. */
export function clamp(v: Vector, min: number, max: number): Vector {
  const c = (n: number) => Math.max(min, Math.min(max, n));
  const out: Vector = {};
  for (const key of Object.keys(v)) {
    out[key] = c(v[key]);
  }
  return out;
}
