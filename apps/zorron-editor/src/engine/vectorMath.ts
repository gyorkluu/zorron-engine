/**
 * Vector math utilities for the 3D personality space.
 *
 * Pure functions, no DOM or framework dependencies. Used by the GameEngine
 * and the 3D vector panel (MIG-012).
 */

import type { PersonalityVector, SectAnchor } from '@/types/flow';

/** The zero vector. */
export const ZERO_VECTOR: PersonalityVector = { x: 0, y: 0, z: 0 };

/** Add two vectors component-wise. */
export function add(a: PersonalityVector, b: PersonalityVector): PersonalityVector {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

/** Subtract vector `b` from `a`. */
export function sub(a: PersonalityVector, b: PersonalityVector): PersonalityVector {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

/** Scale a vector by a scalar. */
export function scale(v: PersonalityVector, k: number): PersonalityVector {
  return { x: v.x * k, y: v.y * k, z: v.z * k };
}

/** Euclidean magnitude: sqrt(x^2 + y^2 + z^2). */
export function magnitude(v: PersonalityVector): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

/** Euclidean distance between two vectors. */
export function distance(a: PersonalityVector, b: PersonalityVector): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Quadrant signature like "+-+" based on component signs. */
export function quadrant(v: PersonalityVector): string {
  const sign = (n: number) => (n >= 0 ? '+' : '-');
  return `${sign(v.x)}${sign(v.y)}${sign(v.z)}`;
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
  point: PersonalityVector,
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
export function sum(vectors: PersonalityVector[]): PersonalityVector {
  return vectors.reduce(add, { ...ZERO_VECTOR });
}

/** Clamp each component to the range [min, max]. */
export function clamp(v: PersonalityVector, min: number, max: number): PersonalityVector {
  const c = (n: number) => Math.max(min, Math.min(max, n));
  return { x: c(v.x), y: c(v.y), z: c(v.z) };
}
