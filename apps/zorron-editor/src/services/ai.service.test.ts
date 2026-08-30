import { describe, it, expect } from 'vitest';
import { sendAICopilotPrompt } from './ai.service';
import { fullDemoFlowData, fullDemoNodes } from '@/data/fullDemoProject';

describe('ai.service - AI Copilot & Scenario Generator', () => {
  it('generates full demo project when user asks for a complete demo or workshop flow', async () => {
    const res = await sendAICopilotPrompt('根据我们设计的节点，通过AI创作工坊自动生成一个demo工程', [], []);
    expect(res.reply).toContain('风起稻香');
    expect(res.actions).toHaveLength(1);
    expect(res.actions![0].type).toBe('LOAD_FLOW_DATA');

    if (res.actions![0].type === 'LOAD_FLOW_DATA') {
      expect(res.actions![0].nodes.length).toBeGreaterThanOrEqual(10);
      expect(res.actions![0].edges.length).toBeGreaterThanOrEqual(10);
      
      const nodeTypes = new Set(res.actions![0].nodes.map((n) => n.type));
      expect(nodeTypes.has('start')).toBe(true);
      expect(nodeTypes.has('stage')).toBe(true);
      expect(nodeTypes.has('minigame')).toBe(true);
      expect(nodeTypes.has('multi-select')).toBe(true);
      expect(nodeTypes.has('rank-order')).toBe(true);
      expect(nodeTypes.has('text-input')).toBe(true);
      expect(nodeTypes.has('logic')).toBe(true);
      expect(nodeTypes.has('settlement')).toBe(true);
      expect(nodeTypes.has('link')).toBe(true);
    }
  });

  it('validates fullDemoProject data structure and integrity', () => {
    expect(fullDemoNodes.length).toBe(14);
    expect(fullDemoFlowData.edges.length).toBe(15);
    
    // Check that stage nodes have carrier, interaction, fx, and flow
    const stageNodes = fullDemoNodes.filter((n) => n.type === 'stage');
    expect(stageNodes.length).toBeGreaterThan(0);
    stageNodes.forEach((s) => {
      expect(s.data).toHaveProperty('carrier');
      expect(s.data).toHaveProperty('interaction');
      expect(s.data).toHaveProperty('fx');
    });
  });
});
