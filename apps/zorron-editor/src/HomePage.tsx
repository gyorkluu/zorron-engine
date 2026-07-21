/**
 * HomePage — 正式版默认入口。
 *
 * 直接 import 内置的 JX3 社交名片工程 FlowData（从原 seed 脚本抽出的
 * buildJx3CardFlowData），交给 PlayerShell 播放完整节点流程：
 *
 *   start → 推栏号输入 → 区服/心法/体型/性别（推栏号有效时 auto-skip）
 *   → 主要玩法 → 段位 → 5道游戏观题 → 兴趣 → MBTI → 星座
 *   → 重视程度排序 → 期望对方信息 → 常用心法 → 个性签名
 *   → settlement（visualBlocks: social-card-summary → 渲染 SocialCardSummary）
 *
 * 推栏号查询走独立后端 service-lover（http://localhost:4002），
 * 不依赖 zorron-server 数据库，脱机可运行。
 *
 * 路由：`/`（根路径，正式发布版）
 */

import { useCallback, useMemo } from 'react';
import { PlayerShell } from '@/components/player/PlayerShell';
import { buildJx3CardFlowData } from '@/data/jx3CardFlowData';

/** HomePage 组件：直接用内置 JX3 card 工程 FlowData 渲染 PlayerShell。 */
export default function HomePage() {
  // 每次挂载构建一份新的 FlowData 实例，避免跨实例状态污染。
  const flowData = useMemo(() => buildJx3CardFlowData(), []);

  // 退出播放器：直接刷新页面重新加载
  const handleExit = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }, []);

  // h-screen w-screen：撑满视口高度，避免 PlayerShell 的 h-full 因父级无高度而塌缩。
  // overflow-hidden：禁止根容器滚动，所有交互在 PlayerShell 内部处理。
  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950">
      <PlayerShell key="jx3-card-home" flowData={flowData} onExit={handleExit} />
    </div>
  );
}
