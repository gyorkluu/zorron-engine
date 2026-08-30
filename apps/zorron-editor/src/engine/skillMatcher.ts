/**
 * Zorron Engine - Skill Matcher.
 *
 * Dynamically detects relevant node capabilities from user prompts and active canvas
 * context, and formats targeted System Prompt injections (similar to Agent Skill loading).
 */

import type { NodeType } from '@/types/flow';
import { NODE_SKILL_REGISTRY, type NodeSkill } from './nodeSkills';

export interface SkillMatchResult {
  /** Matched skills sorted by relevance score. */
  matchedSkills: NodeSkill[];
  /** Formatted markdown section ready for system prompt injection. */
  systemPromptSnippet: string;
}

/**
 * Matches relevant node skills based on user prompt text and optional current canvas context.
 *
 * @param prompt User natural language input.
 * @param activeNodeType Currently selected node type (if any).
 * @param existingNodeTypes Array of node types present in the current flow canvas.
 * @returns Array of matched skills and formatted prompt snippet.
 */
export function matchSkills(
  prompt: string,
  activeNodeType?: NodeType | null,
  existingNodeTypes: NodeType[] = [],
): SkillMatchResult {
  const lowerPrompt = prompt.toLowerCase();
  const scoredSkills: Array<{ skill: NodeSkill; score: number }> = [];

  for (const skill of Object.values(NODE_SKILL_REGISTRY)) {
    let score = 0;

    // 1. Explicit keyword matching
    for (const kw of skill.keywords) {
      if (lowerPrompt.includes(kw.toLowerCase())) {
        score += 10;
      }
    }

    // 2. Direct active node boost
    if (activeNodeType && skill.type === activeNodeType) {
      score += 25;
    }

    // 3. Existing node type context boost
    if (existingNodeTypes.includes(skill.type)) {
      score += 3;
    }

    // Always include core nodes (start, scene, settlement) with a base score if creating new flows
    if (
      lowerPrompt.includes('全新') ||
      lowerPrompt.includes('搭一个') ||
      lowerPrompt.includes('生成') ||
      lowerPrompt.includes('搭建')
    ) {
      if (['start', 'scene', 'settlement', 'logic'].includes(skill.type)) {
        score += 8;
      }
    }

    if (score > 0) {
      scoredSkills.push({ skill, score });
    }
  }

  // Sort by score descending and limit to top 4 most relevant skills to avoid context overflow
  scoredSkills.sort((a, b) => b.score - a.score);
  const matchedSkills = scoredSkills.slice(0, 4).map((s) => s.skill);

  // If no specific skills matched, fallback to default core skills (start, scene, settlement)
  if (matchedSkills.length === 0) {
    matchedSkills.push(
      NODE_SKILL_REGISTRY.start,
      NODE_SKILL_REGISTRY.scene,
      NODE_SKILL_REGISTRY.settlement,
    );
  }

  // Format markdown snippet
  const snippetLines: string[] = [
    '## 动态加载的节点功能与规范知识库 (Dynamically Injected Node Skills):',
    '你在生成或编辑以下类型的节点时，必须严格遵守对应的 Data Schema 和安全边界：\n',
  ];

  for (const s of matchedSkills) {
    snippetLines.push(`### 技能模块: [${s.name}] (type: "${s.type}")`);
    snippetLines.push(`- **功能简介**: ${s.summary}`);
    snippetLines.push(`- **生成指南**: ${s.promptInstruction}`);
    snippetLines.push(`- **数据 Schema 要求**:`);
    snippetLines.push('```json');
    snippetLines.push(s.schemaDoc);
    snippetLines.push('```');
    snippetLines.push(`- **安全与结构边界**:`);
    for (const b of s.boundaries) {
      snippetLines.push(`  * ${b}`);
    }
    snippetLines.push('');
  }

  return {
    matchedSkills,
    systemPromptSnippet: snippetLines.join('\n'),
  };
}
