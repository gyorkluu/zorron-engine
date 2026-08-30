import { useState } from 'react';
import {
  Clapperboard,
  Video,
  Image as ImageIcon,
  Gamepad2,
  Sparkles,
  Target,
  Timer,
  Volume2,
  GitBranch,
  Plus,
  Trash2,
} from 'lucide-react';
import type { FlowNode, StageNodeData, StageCarrier, StageChoice, StageHitbox } from '@/types/flow';
import { useEditorStore } from '@/stores/editorStore';

export interface StageFormProps {
  node?: FlowNode;
  update?: (data: Partial<StageNodeData>) => void;
  data?: StageNodeData;
  onChange?: (patch: Partial<StageNodeData>) => void;
}

export function StageForm({ node, update, data, onChange }: StageFormProps) {
  const [activeTab, setActiveTab] = useState<'carrier' | 'interaction' | 'fx' | 'flow'>('carrier');
  const nodes = useEditorStore((s) => s.nodes);

  const nodeData = (node?.data as StageNodeData | undefined) || data || ({} as StageNodeData);
  const handleUpdate = update || onChange || (() => {});

  const carrier = nodeData.carrier || { type: 'video', url: '', loop: false, playbackRate: 1.0 };
  const interaction = nodeData.interaction || {};
  const dialogue = interaction.dialogue || { text: '' };
  const choices = interaction.choices || [];
  const hitboxes = interaction.hitboxes || [];
  const fx = nodeData.fx || {};
  const flow = nodeData.flow || { preloadNext: [], mutations: [] };

  const updateCarrier = (patch: Partial<StageCarrier>) => {
    handleUpdate({
      carrier: { ...carrier, ...patch } as StageCarrier,
    });
  };

  const updateDialogue = (patch: Partial<typeof dialogue>) => {
    handleUpdate({
      interaction: {
        ...interaction,
        dialogue: { ...dialogue, ...patch },
      },
    });
  };

  const updateChoices = (newChoices: StageChoice[]) => {
    handleUpdate({
      interaction: {
        ...interaction,
        choices: newChoices,
      },
    });
  };

  const updateHitboxes = (newHitboxes: StageHitbox[]) => {
    handleUpdate({
      interaction: {
        ...interaction,
        hitboxes: newHitboxes,
      },
    });
  };

  const updateFX = (patch: Partial<typeof fx>) => {
    handleUpdate({
      fx: { ...fx, ...patch },
    });
  };

  const updateFlow = (patch: Partial<typeof flow>) => {
    handleUpdate({
      flow: { ...flow, ...patch },
    });
  };

  const candidateNodes = nodes.filter((n) => n.data?.label);

  return (
    <div className="space-y-4 text-xs">
      {/* Node Label */}
      <div>
        <label className="mb-1 block font-medium text-slate-300">节点名称</label>
        <input
          type="text"
          value={nodeData.label || ''}
          onChange={(e) => handleUpdate({ label: e.target.value })}
          placeholder="例如：开场影游视频"
          className="w-full rounded-md border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
        />
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-4 gap-1 rounded-lg bg-slate-900/80 p-1 border border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('carrier')}
          className={`flex items-center justify-center gap-1 rounded py-1 font-medium transition-all ${
            activeTab === 'carrier'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clapperboard size={12} />
          <span>载体</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('interaction')}
          className={`flex items-center justify-center gap-1 rounded py-1 font-medium transition-all ${
            activeTab === 'interaction'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Target size={12} />
          <span>交互</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('fx')}
          className={`flex items-center justify-center gap-1 rounded py-1 font-medium transition-all ${
            activeTab === 'fx'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles size={12} />
          <span>视听</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('flow')}
          className={`flex items-center justify-center gap-1 rounded py-1 font-medium transition-all ${
            activeTab === 'flow'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <GitBranch size={12} />
          <span>流转</span>
        </button>
      </div>

      {/* ── TAB 1: 舞台载体 (Carrier) ───────────────────────── */}
      {activeTab === 'carrier' && (
        <div className="space-y-3.5 animate-in fade-in-50 duration-200">
          <div>
            <label className="mb-1.5 block font-medium text-slate-300">载体类型</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => updateCarrier({ type: 'video', url: carrier.url || '' })}
                className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-all ${
                  carrier.type === 'video'
                    ? 'border-cyan-500 bg-cyan-500/15 text-cyan-300'
                    : 'border-slate-700/80 bg-slate-800/40 text-slate-400 hover:border-slate-600'
                }`}
              >
                <Video size={16} />
                <span className="text-[11px]">视频流</span>
              </button>
              <button
                type="button"
                onClick={() => updateCarrier({ type: 'image', url: carrier.url || '' })}
                className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-all ${
                  carrier.type === 'image'
                    ? 'border-cyan-500 bg-cyan-500/15 text-cyan-300'
                    : 'border-slate-700/80 bg-slate-800/40 text-slate-400 hover:border-slate-600'
                }`}
              >
                <ImageIcon size={16} />
                <span className="text-[11px]">图片/立绘</span>
              </button>
              <button
                type="button"
                onClick={() => updateCarrier({ type: 'html-embed', url: carrier.url || '' })}
                className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-all ${
                  carrier.type === 'html-embed'
                    ? 'border-cyan-500 bg-cyan-500/15 text-cyan-300'
                    : 'border-slate-700/80 bg-slate-800/40 text-slate-400 hover:border-slate-600'
                }`}
              >
                <Gamepad2 size={16} />
                <span className="text-[11px]">H5/小游戏</span>
              </button>
            </div>
          </div>

          {/* Carrier Resource URL */}
          <div>
            <label className="mb-1 block font-medium text-slate-300">素材 URL</label>
            <input
              type="text"
              value={carrier.url || ''}
              onChange={(e) => updateCarrier({ url: e.target.value })}
              placeholder="https://... 或从左侧资源库选择"
              className="w-full rounded-md border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Video Specific Controls */}
          {carrier.type === 'video' && (
            <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">循环播放 (Loop)</span>
                <input
                  type="checkbox"
                  checked={carrier.loop || false}
                  onChange={(e) => updateCarrier({ loop: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-800 text-cyan-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-slate-400">时间轴切片 (timeRange: 秒)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={carrier.timeRange?.[0] ?? 0}
                    onChange={(e) => {
                      const start = parseFloat(e.target.value) || 0;
                      const end = carrier.timeRange?.[1] ?? 10;
                      updateCarrier({ timeRange: [start, end] });
                    }}
                    placeholder="起点 (0s)"
                    className="w-1/2 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-100 text-center"
                  />
                  <span className="text-slate-500">~</span>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={carrier.timeRange?.[1] ?? 0}
                    onChange={(e) => {
                      const start = carrier.timeRange?.[0] ?? 0;
                      const end = parseFloat(e.target.value) || 0;
                      updateCarrier({ timeRange: [start, end] });
                    }}
                    placeholder="终点 (秒)"
                    className="w-1/2 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-100 text-center"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: 交互与热区 (Interaction) ──────────────────── */}
      {activeTab === 'interaction' && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          {/* Dialogue Section */}
          <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="font-semibold text-cyan-300">剧情对话 / 字幕</div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={dialogue.speaker || ''}
                onChange={(e) => updateDialogue({ speaker: e.target.value })}
                placeholder="说话人姓名"
                className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-100 placeholder-slate-500"
              />
              <input
                type="text"
                value={dialogue.voiceUrl || ''}
                onChange={(e) => updateDialogue({ voiceUrl: e.target.value })}
                placeholder="角色配音 Voice URL"
                className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-100 placeholder-slate-500"
              />
            </div>
            <textarea
              rows={2}
              value={dialogue.text || ''}
              onChange={(e) => updateDialogue({ text: e.target.value })}
              placeholder="台词内容，支持打字机动效..."
              className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Choices Section */}
          <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-cyan-300">分支选项 ({choices.length})</span>
              <button
                type="button"
                onClick={() => {
                  const newChoice: StageChoice = {
                    id: `c-${Date.now()}`,
                    text: `选项 ${choices.length + 1}`,
                    targetNodeId: '',
                  };
                  updateChoices([...choices, newChoice]);
                }}
                className="flex items-center gap-1 rounded bg-cyan-500/20 px-2 py-0.5 text-[11px] text-cyan-300 hover:bg-cyan-500/30"
              >
                <Plus size={12} />
                添加选项
              </button>
            </div>

            {choices.map((choice, i) => (
              <div key={choice.id || i} className="space-y-1.5 rounded border border-slate-700/60 bg-slate-800/80 p-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={choice.text}
                    onChange={(e) => {
                      const updated = [...choices];
                      updated[i].text = e.target.value;
                      updateChoices(updated);
                    }}
                    placeholder="选项文本"
                    className="flex-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => updateChoices(choices.filter((_, idx) => idx !== i))}
                    className="text-slate-400 hover:text-rose-400"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={choice.targetNodeId || ''}
                    onChange={(e) => {
                      const updated = [...choices];
                      updated[i].targetNodeId = e.target.value;
                      updateChoices(updated);
                    }}
                    className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100 text-[11px]"
                  >
                    <option value="">跳转至目标节点...</option>
                    {candidateNodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.data?.label || n.id}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={choice.guard || ''}
                    onChange={(e) => {
                      const updated = [...choices];
                      updated[i].guard = e.target.value;
                      updateChoices(updated);
                    }}
                    placeholder="Guard条件 (例如: variables.love>=80)"
                    className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100 text-[11px]"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Hitboxes Section */}
          <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-amber-300">画面热区 ({hitboxes.length})</span>
              <button
                type="button"
                onClick={() => {
                  const newHb: StageHitbox = {
                    id: `hb-${Date.now()}`,
                    rect: [20, 20, 30, 30],
                    action: 'jump',
                  };
                  updateHitboxes([...hitboxes, newHb]);
                }}
                className="flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[11px] text-amber-300 hover:bg-amber-500/30"
              >
                <Plus size={12} />
                添加热区
              </button>
            </div>

            {hitboxes.map((hb, i) => (
              <div key={hb.id || i} className="space-y-1.5 rounded border border-amber-500/30 bg-slate-800/80 p-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-amber-300 text-[11px]">{hb.id}</span>
                  <button
                    type="button"
                    onClick={() => updateHitboxes(hitboxes.filter((_, idx) => idx !== i))}
                    className="text-slate-400 hover:text-rose-400"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {['X%', 'Y%', 'W%', 'H%'].map((label, coordIdx) => {
                    const rectVals: [number, number, number, number] = hb.rect || [
                      hb.x ?? 20,
                      hb.y ?? 20,
                      hb.width ?? 30,
                      hb.height ?? 30,
                    ];
                    return (
                      <div key={label} className="text-center">
                        <span className="text-[10px] text-slate-400">{label}</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={rectVals[coordIdx]}
                          onChange={(e) => {
                            const updated = [...hitboxes];
                            const nextRect = [...rectVals] as [number, number, number, number];
                            nextRect[coordIdx] = parseFloat(e.target.value) || 0;
                            updated[i] = {
                              ...updated[i],
                              rect: nextRect,
                              x: nextRect[0],
                              y: nextRect[1],
                              width: nextRect[2],
                              height: nextRect[3],
                            };
                            updateHitboxes(updated);
                          }}
                          className="w-full rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-center text-slate-100 text-[11px]"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* QTE Timeout Section */}
          <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-rose-300">QTE 倒计时限制</span>
              <Timer size={14} className="text-rose-400" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-0.5 block text-[10px] text-slate-400">倒计时秒数</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={interaction.qteTimeoutSec || ''}
                  onChange={(e) =>
                    onChange({
                      interaction: {
                        ...interaction,
                        qteTimeoutSec: parseFloat(e.target.value) || undefined,
                      },
                    })
                  }
                  placeholder="留空即无倒计时"
                  className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-100"
                />
              </div>
              <div>
                <label className="mb-0.5 block text-[10px] text-slate-400">超时兜底目标</label>
                <select
                  value={interaction.defaultTimeoutTargetNodeId || ''}
                  onChange={(e) =>
                    onChange({
                      interaction: {
                        ...interaction,
                        defaultTimeoutTargetNodeId: e.target.value || undefined,
                      },
                    })
                  }
                  className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-100 text-[11px]"
                >
                  <option value="">超时默认分支...</option>
                  {candidateNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.data?.label || n.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: 视听与特效 (FX) ──────────────────────────── */}
      {activeTab === 'fx' && (
        <div className="space-y-3.5 animate-in fade-in-50 duration-200">
          <div>
            <label className="mb-1 block font-medium text-slate-300">滤镜特效 (Filter)</label>
            <select
              value={fx.filter || 'none'}
              onChange={(e) => updateFX({ filter: e.target.value as any })}
              className="w-full rounded-md border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-slate-100 focus:border-cyan-500 focus:outline-none"
            >
              <option value="none">无滤镜 (None)</option>
              <option value="glitch">故障风 (Glitch RGB 撕裂)</option>
              <option value="heartbeat">心跳危机 (Heartbeat Bloom 暗角)</option>
              <option value="bloom">柔光漫射 (Bloom)</option>
              <option value="vignette">边缘暗角 (Vignette)</option>
              <option value="black-white">复古回忆 (Black & White Sepia)</option>
            </select>
          </div>

          {/* Camera Shake */}
          <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="font-semibold text-purple-300">镜头震颤 (Camera Shake)</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400">震颤强度 (1~10)</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={fx.cameraShake?.intensity ?? 3}
                  onChange={(e) =>
                    updateFX({
                      cameraShake: {
                        intensity: parseInt(e.target.value, 10) || 3,
                        triggerAtSec: fx.cameraShake?.triggerAtSec ?? 0,
                        durationMs: fx.cameraShake?.durationMs ?? 500,
                      },
                    })
                  }
                  className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-100"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">触发秒数 (秒)</label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={fx.cameraShake?.triggerAtSec ?? 0}
                  onChange={(e) =>
                    updateFX({
                      cameraShake: {
                        intensity: fx.cameraShake?.intensity ?? 3,
                        triggerAtSec: parseFloat(e.target.value) || 0,
                        durationMs: fx.cameraShake?.durationMs ?? 500,
                      },
                    })
                  }
                  className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* BGM Config */}
          <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
              <Volume2 size={13} />
              <span>背景音乐 (BGM)</span>
            </div>
            <input
              type="text"
              value={fx.bgm?.url || ''}
              onChange={(e) => updateFX({ bgm: { url: e.target.value, fadeInMs: 1000, volume: 1.0 } })}
              placeholder="BGM 音频 URL"
              className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-100 placeholder-slate-500"
            />
          </div>
        </div>
      )}

      {/* ── TAB 4: 状态流转 (Flow) ─────────────────────────── */}
      {activeTab === 'flow' && (
        <div className="space-y-3.5 animate-in fade-in-50 duration-200">
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <label className="mb-1 block font-semibold text-blue-300">分支预加载 (Preload Tree)</label>
            <p className="mb-2 text-[11px] text-slate-400">
              指定下一个最可能的分支节点，播放器将在后台提前双缓冲预热视频/素材，确保零延迟切换。
            </p>
            <div className="space-y-1">
              {candidateNodes.map((n) => {
                const isPreloaded = (flow.preloadNext || []).includes(n.id);
                return (
                  <label
                    key={n.id}
                    className="flex items-center gap-2 rounded bg-slate-800/50 px-2 py-1 text-slate-300 hover:bg-slate-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isPreloaded}
                      onChange={(e) => {
                        const current = flow.preloadNext || [];
                        const updated = e.target.checked
                          ? [...current, n.id]
                          : current.filter((id) => id !== n.id);
                        updateFlow({ preloadNext: updated });
                      }}
                      className="rounded border-slate-700 bg-slate-900 text-cyan-500"
                    />
                    <span className="truncate">{n.data?.label || n.id}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
