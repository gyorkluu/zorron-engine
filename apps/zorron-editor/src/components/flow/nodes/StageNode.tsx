import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import {
  Clapperboard,
  Video,
  Image as ImageIcon,
  Gamepad2,
  Sparkles,
  Target,
  Timer,
  Volume2,
  ListOrdered,
} from 'lucide-react';
import type { StageNodeData } from '@/types/flow';
import { NodeShell } from './NodeShell';

function StageNodeImpl({ data, selected }: NodeProps) {
  const stageData = data as unknown as StageNodeData;
  const carrier = stageData.carrier || { type: 'image', url: '' };
  const interaction = stageData.interaction || {};
  const dialogue = interaction.dialogue;
  const choices = interaction.choices || [];
  const hitboxes = interaction.hitboxes || [];
  const fx = stageData.fx || {};
  const hasPreload = (stageData.flow?.preloadNext?.length ?? 0) > 0;

  // Carrier icon & summary
  let CarrierIcon = ImageIcon;
  let carrierText = '图片/立绘';
  if (carrier.type === 'video') {
    CarrierIcon = Video;
    carrierText = carrier.timeRange
      ? `视频 (${carrier.timeRange[0]}s~${carrier.timeRange[1]}s)`
      : '视频流';
  } else if (carrier.type === 'html-embed') {
    CarrierIcon = Gamepad2;
    carrierText = '嵌入玩法/H5';
  }

  return (
    <NodeShell
      selected={selected}
      title={stageData.label || '剧情舞台'}
      icon={<Clapperboard size={14} className="text-cyan-400" />}
      accent="#06b6d4"
      subtitle={carrierText}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !border-2 !border-slate-900 !bg-cyan-400"
      />

      <div className="space-y-2 text-xs">
        {/* Carrier info pill */}
        <div className="flex items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-cyan-300 font-mono text-[11px]">
          <CarrierIcon size={12} className="shrink-0" />
          <span className="truncate">{carrier.url || '未配置素材 URL'}</span>
        </div>

        {/* Dialogue preview */}
        {dialogue && dialogue.text && (
          <div className="rounded-md border border-slate-700/60 bg-slate-800/60 p-2 text-slate-200">
            {dialogue.speaker && (
              <div className="mb-0.5 font-semibold text-cyan-300 text-[11px]">
                {dialogue.speaker}
              </div>
            )}
            <div className="line-clamp-2 text-slate-300 italic">
              "{dialogue.text}"
            </div>
          </div>
        )}

        {/* Feature Badges Grid */}
        <div className="flex flex-wrap gap-1">
          {hitboxes.length > 0 && (
            <span className="flex items-center gap-1 rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] text-amber-300 font-medium">
              <Target size={10} />
              {hitboxes.length} 热区
            </span>
          )}

          {interaction.qteTimeoutSec && (
            <span className="flex items-center gap-1 rounded bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.5 text-[10px] text-rose-300 font-medium">
              <Timer size={10} />
              QTE {interaction.qteTimeoutSec}s
            </span>
          )}

          {fx.filter && fx.filter !== 'none' && (
            <span className="flex items-center gap-1 rounded bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.5 text-[10px] text-purple-300">
              <Sparkles size={10} />
              {fx.filter}
            </span>
          )}

          {fx.bgm?.url && (
            <span className="flex items-center gap-1 rounded bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] text-emerald-300">
              <Volume2 size={10} />
              BGM
            </span>
          )}

          {hasPreload && (
            <span className="flex items-center gap-1 rounded bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.5 text-[10px] text-blue-300">
              ⚡ 预加载
            </span>
          )}
        </div>

        {/* Choices Handles */}
        {choices.length > 0 ? (
          <div className="space-y-1 pt-1 border-t border-slate-700/50">
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <ListOrdered size={10} />
              <span>分支选项 ({choices.length})</span>
            </div>
            {choices.map((choice, index) => (
              <div
                key={choice.id || index}
                className="relative flex items-center justify-between rounded bg-slate-800/40 px-2 py-1 text-[11px] text-slate-300 border border-slate-700/30"
              >
                <span className="truncate pr-4">{choice.text || `选项 ${index + 1}`}</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={choice.id || `choice-${index}`}
                  className="!h-2 !w-2 !border-slate-900 !bg-cyan-400"
                  style={{ top: '50%' }}
                />
              </div>
            ))}
          </div>
        ) : (
          /* Default output handle when no choices are configured */
          <Handle
            type="source"
            position={Position.Bottom}
            className="!h-2.5 !w-2.5 !border-2 !border-slate-900 !bg-cyan-400"
          />
        )}
      </div>
    </NodeShell>
  );
}

export const StageNode = memo(StageNodeImpl);
