/**
 * Unit tests for the vector math utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  add,
  sub,
  scale,
  magnitude,
  distance,
  quadrant,
  findNearestSect,
  sum,
  clamp,
  ZERO_VECTOR,
} from './vectorMath';
import type { SectAnchor } from '@/types/flow';

const sects: SectAnchor[] = [
  { id: 'a', name: 'Alpha', vector: { x: 1, y: 1, z: 1 }, title: 'A' },
  { id: 'b', name: 'Beta', vector: { x: -1, y: -1, z: -1 }, title: 'B' },
  { id: 'c', name: 'Gamma', vector: { x: 2, y: 2, z: 2 }, title: 'C' },
];

describe('vectorMath', () => {
  it('adds two vectors component-wise', () => {
    expect(add({ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 })).toEqual({ x: 5, y: 7, z: 9 });
  });

  it('subtracts two vectors component-wise', () => {
    expect(sub({ x: 5, y: 7, z: 9 }, { x: 1, y: 2, z: 3 })).toEqual({ x: 4, y: 5, z: 6 });
  });

  it('scales a vector by a scalar', () => {
    expect(scale({ x: 1, y: 2, z: 3 }, 2)).toEqual({ x: 2, y: 4, z: 6 });
  });

  it('computes the magnitude', () => {
    expect(magnitude({ x: 3, y: 4, z: 0 })).toBeCloseTo(5, 5);
    expect(magnitude(ZERO_VECTOR)).toBe(0);
  });

  it('computes the distance between two vectors', () => {
    expect(distance({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 })).toBeCloseTo(5, 5);
  });

  it('produces a quadrant signature from signs', () => {
    expect(quadrant({ x: 1, y: -2, z: 3 })).toBe('+-+');
    expect(quadrant({ x: -1, y: -1, z: -1 })).toBe('---');
    expect(quadrant(ZERO_VECTOR)).toBe('+++');
  });

  it('sums a list of vectors', () => {
    expect(sum([{ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }])).toEqual({
      x: 1,
      y: 1,
      z: 1,
    });
  });

  it('clamps each component to the range', () => {
    expect(clamp({ x: -5, y: 3, z: 10 }, 0, 5)).toEqual({ x: 0, y: 3, z: 5 });
  });

  it('finds the nearest sect in the same quadrant', () => {
    const result = findNearestSect({ x: 1, y: 1, z: 1 }, sects);
    expect(result.sect?.id).toBe('a');
    expect(result.distance).toBe(0);
  });

  it('falls back to global search when no sect shares the quadrant', () => {
    const result = findNearestSect({ x: 1, y: 1, z: -1 }, sects);
    // No sect in the "++-" quadrant, so global nearest is Alpha (distance sqrt(2)).
    expect(result.sect?.id).toBe('a');
  });

  it('returns null sect when the list is empty', () => {
    const result = findNearestSect({ x: 1, y: 1, z: 1 }, []);
    expect(result.sect).toBeNull();
    expect(result.distance).toBe(Infinity);
  });
});
