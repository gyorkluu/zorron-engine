/**
 * Zorron Engine - AI Copilot Service.
 *
 * Orchestrates natural language processing, dynamic Node Skill matching,
 * Action auditing against system boundaries, and server API interaction.
 */

import type { Node, Edge } from '@xyflow/react';
import type { NodeType } from '@/types/flow';
import { matchSkills } from '@/engine/skillMatcher';
import { auditCanvasActions, type CanvasAction, type AuditResult } from '@/engine/actionValidator';
import { fullDemoNodes, fullDemoEdges } from '@/data/fullDemoProject';

export interface AIServiceResponse {
  reply: string;
  actions?: CanvasAction[];
  audit?: AuditResult;
}

/**
 * Processes a user natural language prompt and active canvas state to generate
 * validated Canvas Actions and natural language replies.
 */
export async function sendAICopilotPrompt(
  prompt: string,
  currentNodes: Node[],
  currentEdges: Edge[],
  activeNodeId?: string | null,
): Promise<AIServiceResponse> {
  const activeNode = activeNodeId ? currentNodes.find((n) => n.id === activeNodeId) : null;
  const activeNodeType = (activeNode?.type as NodeType) || null;
  const existingNodeTypes = currentNodes.map((n) => n.type as NodeType);

  // 1. Dynamic Skill Matching (Agent Skill loading pattern)
  const skillMatch = matchSkills(prompt, activeNodeType, existingNodeTypes);

  // 2. Mock Agent Reasoning Engine (or backend SSE endpoint when configured)
  const rawActions: CanvasAction[] = [];
  let replyText = '';

  const lower = prompt.toLowerCase();

  // Pattern A: Full Scenario / Demo / Studio Generation
  if (
    lower.includes('demo') ||
    lower.includes('工坊') ||
    lower.includes('全节点') ||
    lower.includes('完整') ||
    lower.includes('影游') ||
    lower.includes('稻香') ||
    lower.includes('剑网3') ||
    lower.includes('分支') ||
    lower.includes('属性')
  ) {
    replyText = `✨ AI 创作工坊已为你自动编排了一套完整的《剑网3·风起稻香》互动影游全节点演示工程！\n\n` +
      `📦 包含 14 个完整节点与 15 条连线分支：\n` +
      `1. 🎬 【全能舞台 Stage 2.0】双缓冲视频流、莫雨剧情台词、音效压暗与 Vignette 晕影滤镜；\n` +
      `2. ⚡ 【QTE 倒计时 & 画面热区】古井机关交互热区、5秒心跳特效 QTE；\n` +
      `3. 🎮 【九宫天机锁】嵌入式小游戏互动；\n` +
      `4. 📝 【多选与战术排序】线索调查 (Multi-Select) 与 破敌优先级 (Rank-Order)；\n` +
      `5. 🔀 【变量与逻辑门】侠义/勇气 Setter 赋值与条件分支判定 (Logic Guard)；\n` +
      `6. 🏆 【多结局 Bloom 视效】浩气长存 / 逍遥隐逸 双结局与门派人格结算卡片；\n` +
      `7. 🔗 【外部社区链接】大唐江湖榜外链引导。\n\n` +
      `点击下方【应用建议】即可一键将整个工程载入画布！`;

    rawActions.push({
      type: 'LOAD_FLOW_DATA',
      nodes: fullDemoNodes,
      edges: fullDemoEdges,
    });
  } else if (lower.includes('搭') || lower.includes('生成') || lower.includes('创建工程') || lower.includes('问答')) {
    replyText = `已为你设计了一套标准的问答测评流程，包含【起点】、2 个【剧情/选择节点】以及 1 个【结算节点】。`;
    rawActions.push(
      {
        type: 'CREATE_NODE',
        nodeType: 'scene',
        position: { x: 350, y: 150 },
        data: {
          label: '第一题：江湖初相遇',
          dialogue: '你在稻香村的古井旁遇到一位受伤的侠客，你会？',
          choices: [
            { id: 'c1', text: '上前施以援手', vector: { a: 10 } },
            { id: 'c2', text: '警惕观察并保持距离', vector: { b: 10 } },
          ],
        },
      },
      {
        type: 'CREATE_NODE',
        nodeType: 'scene',
        position: { x: 350, y: 350 },
        data: {
          label: '第二题：宗门抉择',
          dialogue: '面对门派掌门人的考验，你最重视什么？',
          choices: [
            { id: 'c3', text: '浩然正气与天下担当', vector: { a: 15 } },
            { id: 'c4', text: '自由逍遥与独立思考', vector: { b: 15 } },
          ],
        },
      },
      {
        type: 'CREATE_NODE',
        nodeType: 'settlement',
        position: { x: 350, y: 550 },
        data: {
          label: '测试结算卡片',
          resultMapping: [
            { resultId: 'r1', title: '纯阳 / 万花 - 侠之大者', description: '胸怀天下，坚毅沉稳。' },
            { resultId: 'r2', title: '唐门 / 藏剑 - 自由侠客', description: '率性而为，独具一格。' },
          ],
        },
      },
    );
  } else if (lower.includes('画板') || lower.includes('签名') || lower.includes('语音') || lower.includes('新节点') || lower.includes('扫码') || lower.includes('自定义')) {
    // Pattern C: Dynamic Custom Node Creation & Skill Injection
    const customType = lower.includes('语音') ? 'audio-recorder' : lower.includes('扫码') ? 'qr-scanner' : 'sketch-pad';
    const labelName = lower.includes('语音') ? '语音录制节点' : lower.includes('扫码') ? '二维码扫描节点' : '手绘画板签名节点';
    
    replyText = `检测到内置节点未能完全覆盖你的需求，AI 已为你动态扩展注册了全新的自定义节点类型【${labelName}】(${customType})！并自动为你装载了该新节点的 Prompt 技能指导。`;
    rawActions.push(
      {
        type: 'REGISTER_CUSTOM_NODE_TYPE',
        customType,
        label: labelName,
        accent: '#ec4899',
        defaultData: { customType, label: labelName, description: '玩家可以在此环节进行手绘签名或绘制图画' },
      },
      {
        type: 'CREATE_NODE',
        nodeType: customType as NodeType,
        position: { x: 400, y: 300 },
        data: { label: labelName, customName: labelName, description: '玩家在该节点可完成画板签名互动。' },
      },
    );
  } else if (activeNode) {
    // Pattern B: Selective Micro Edit on Active Node
    replyText = `已针对选中的节点 (${activeNode.id}) 进行调整优化。`;
    rawActions.push({
      type: 'UPDATE_NODE_DATA',
      nodeId: activeNode.id,
      patch: {
        dialogue: `${(activeNode.data as Record<string, unknown>).dialogue || ''} [AI已优化细节与代入感]`,
      },
    });

    if (activeNodeType === 'scene') {
      rawActions.push({
        type: 'CREATE_NODE',
        nodeType: 'logic',
        position: { x: (activeNode.position.x || 200) + 300, y: activeNode.position.y || 200 },
        data: { label: '追加逻辑判断节点', condition: '检查好感度 >= 10' },
        connectFrom: { nodeId: activeNode.id },
      });
    }
  } else {
    // Fallback general guidance
    replyText = `我已经理解你的要求。我为你加载了相关节点技能：${skillMatch.matchedSkills.map((s) => s.name).join('、')}。请选择某个节点或说明你想新增的功能。`;
  }

  // 3. System Boundary Guardrail Audit
  const audit = auditCanvasActions(rawActions, currentNodes, currentEdges);

  return {
    reply: replyText,
    actions: audit.sanitizedActions,
    audit,
  };
}
