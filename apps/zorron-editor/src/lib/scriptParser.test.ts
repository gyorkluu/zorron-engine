/**
 * Script parser tests.
 *
 * The round-trip is the contract that matters: script -> graph -> script should
 * preserve what the writer typed.
 */

import { describe, it, expect } from 'vitest';
import {
  parseScript,
  scriptToGraph,
  nodesToScript,
  slugify,
} from './scriptParser';

describe('parseScript', () => {
  it('reads a scene title', () => {
    const { scenes } = parseScript('# 第一章 · 长安\n\n莫雨: 江湖浩瀚。');
    expect(scenes).toHaveLength(1);
    expect(scenes[0].title).toBe('第一章 · 长安');
    expect(scenes[0].id).toBe(slugify('第一章 · 长安', 'scene-1'));
  });

  it('separates speaker from line', () => {
    const { scenes } = parseScript('莫雨: 你来了。');
    expect(scenes[0].lines[0]).toEqual({ speaker: '莫雨', text: '你来了。' });
  });

  it('treats a bare line as narration', () => {
    const { scenes } = parseScript('风雪漫过城楼。');
    expect(scenes[0].lines[0]).toEqual({ text: '风雪漫过城楼。' });
  });

  it('parses choices and their targets', () => {
    const { scenes } = parseScript('> 前往浩气盟 -> haoi\n> 前往恶人谷');
    expect(scenes[0].choices).toEqual([
      { text: '前往浩气盟', target: 'haoi' },
      { text: '前往恶人谷', target: undefined },
    ]);
  });

  it('handles full-width colons', () => {
    const { scenes } = parseScript('旁白：这是一个测试。');
    expect(scenes[0].lines[0]).toEqual({ speaker: '旁白', text: '这是一个测试。' });
  });

  it('never throws on empty or junk input', () => {
    expect(() => parseScript('')).not.toThrow();
    expect(parseScript('').scenes).toHaveLength(0);
    expect(parseScript('>>> ???').scenes.length).toBeGreaterThan(0);
  });
});

describe('scriptToGraph', () => {
  it('creates one stage node per scene', () => {
    const script = parseScript('# A\n甲: 一。\n\n# B\n乙: 二。');
    const { nodes } = scriptToGraph(script);
    expect(nodes).toHaveLength(2);
    expect(nodes.every((n) => n.type === 'stage')).toBe(true);
  });

  it('connects a scene without choices to the next one', () => {
    const script = parseScript('# A\n甲: 一。\n\n# B\n乙: 二。');
    const { edges } = scriptToGraph(script);
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toContain('stage-');
  });

  it('routes an explicit choice target to the named scene', () => {
    const script = parseScript(
      '# start\n甲: 去哪？\n> 东 -> east\n\n# east\n乙: 到了。',
    );
    const { edges } = scriptToGraph(script);
    expect(edges.some((e) => e.label === '东' && e.target.includes('east'))).toBe(true);
  });

  it('spaces scenes horizontally', () => {
    const script = parseScript('# A\n甲: 一。\n\n# B\n乙: 二。');
    const { nodes } = scriptToGraph(script, { gapX: 300 });
    expect(nodes[1].position.x - nodes[0].position.x).toBe(300);
  });
});

describe('nodesToScript', () => {
  it('round-trips a script through the graph', () => {
    const original = '# 开场\n莫雨: 江湖浩瀚。\n> 出发\n';
    const { nodes, edges } = scriptToGraph(parseScript(original));
    const output = nodesToScript(nodes, edges);
    expect(output).toContain('# 开场');
    expect(output).toContain('莫雨: 江湖浩瀚。');
    expect(output).toContain('> 出发');
  });

  it('ignores non-stage node types', () => {
    const output = nodesToScript([
      { id: 's1', type: 'start', data: { label: 'Start' } },
      { id: 'g1', type: 'stage', data: { label: '场景' } },
    ]);
    expect(output).toContain('# 场景');
    expect(output).not.toContain('# Start');
  });
});
