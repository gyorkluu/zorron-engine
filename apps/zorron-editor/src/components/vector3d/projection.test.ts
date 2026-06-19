/**
 * Unit tests for the 3D projection utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  project,
  buildAxes,
  DEFAULT_CAMERA,
  type Camera,
} from './projection';

describe('projection', () => {
  describe('project', () => {
    it('projects the origin to the canvas origin', () => {
      const origin = { x: 100, y: 100 };
      const result = project({ x: 0, y: 0, z: 0 }, DEFAULT_CAMERA, origin, 40);
      expect(result.x).toBeCloseTo(100, 5);
      expect(result.y).toBeCloseTo(100, 5);
    });

    it('projects a non-zero vector away from the origin', () => {
      const origin = { x: 200, y: 200 };
      const result = project({ x: 5, y: 0, z: 0 }, DEFAULT_CAMERA, origin, 40);
      // The X axis should move the point horizontally (mostly).
      expect(result.x).not.toBe(200);
    });

    it('respects the zoom factor', () => {
      const origin = { x: 0, y: 0 };
      const camera1: Camera = { ...DEFAULT_CAMERA, zoom: 1 };
      const camera2: Camera = { ...DEFAULT_CAMERA, zoom: 2 };
      const r1 = project({ x: 3, y: 0, z: 0 }, camera1, origin, 10);
      const r2 = project({ x: 3, y: 0, z: 0 }, camera2, origin, 10);
      // Doubling zoom should roughly double the distance from origin.
      const d1 = Math.hypot(r1.x, r1.y);
      const d2 = Math.hypot(r2.x, r2.y);
      expect(d2).toBeCloseTo(d1 * 2, 1);
    });

    it('produces stable output for the same inputs (deterministic)', () => {
      const origin = { x: 150, y: 150 };
      const v = { x: 2, y: -1, z: 3 };
      const r1 = project(v, DEFAULT_CAMERA, origin, 30);
      const r2 = project(v, DEFAULT_CAMERA, origin, 30);
      expect(r1).toEqual(r2);
    });
  });

  describe('buildAxes', () => {
    it('returns three axes with distinct labels and colors', () => {
      const origin = { x: 100, y: 100 };
      const axes = buildAxes(DEFAULT_CAMERA, origin, 40, 5, {
        x: '处世',
        y: '立场',
        z: '性情',
      });
      expect(axes).toHaveLength(3);
      const labels = axes.map((a) => a.label);
      expect(labels).toEqual(['处世', '立场', '性情']);
      const colors = new Set(axes.map((a) => a.color));
      expect(colors.size).toBe(3);
    });

    it('starts every axis at the origin point', () => {
      const origin = { x: 50, y: 50 };
      const axes = buildAxes(DEFAULT_CAMERA, origin, 40, 5, {
        x: 'X',
        y: 'Y',
        z: 'Z',
      });
      for (const axis of axes) {
        expect(axis.start.x).toBeCloseTo(50, 5);
        expect(axis.start.y).toBeCloseTo(50, 5);
      }
    });
  });
});
