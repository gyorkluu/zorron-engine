/**
 * Script parser — a plain-text screenplay format that round-trips to nodes.
 *
 * Writers think in script, not in graph. This lets a story be pasted in as
 * text and turned into a node graph, and lets an existing graph be exported
 * back to readable script for review.
 *
 * Format:
 *   # Chapter or scene title
 *   Speaker: line of dialogue
 *   A line without a speaker is narration
 *   > Choice text
 *   > Choice text -> target-scene-id
 */

/** One spoken (or narration) line. */
export interface ScriptLine {
  /** Omitted for narration. */
  speaker?: string;
  text: string;
}

/** A branch option offered at the end of a scene. */
export interface ScriptChoice {
  text: string;
  /** Scene id this choice leads to. Defaults to the following scene. */
  target?: string;
}

/** A scene: a run of lines plus the choices that end it. */
export interface ScriptScene {
  id: string;
  title?: string;
  lines: ScriptLine[];
  choices: ScriptChoice[];
}

export interface ParsedScript {
  scenes: ScriptScene[];
}

/** Anything that looks like "Speaker: line". */
const LINE_RE = /^([^:：]{1,24})[:：]\s*(.+)$/;
/** "> text" or "> text -> target". */
const CHOICE_RE = /^>\s*(.+?)(?:\s*->\s*(\S+))?\s*$/;
/** "# title". */
const TITLE_RE = /^#+\s*(.+)$/;

/** Slugify a title into a stable scene id. */
export function slugify(text: string, fallback: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return slug || fallback;
}

/**
 * Parse screenplay text into scenes.
 *
 * Unparseable input never throws — the worst case is a single narration scene,
 * so a half-finished draft still imports.
 */
export function parseScript(text: string): ParsedScript {
  const scenes: ScriptScene[] = [];
  let current: ScriptScene | null = null;
  let autoIndex = 0;

  const ensureScene = (): ScriptScene => {
    if (current) return current;
    autoIndex += 1;
    current = { id: `scene-${autoIndex}`, lines: [], choices: [] };
    scenes.push(current);
    return current;
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    const title = line.match(TITLE_RE);
    if (title) {
      autoIndex += 1;
      current = {
        id: slugify(title[1], `scene-${autoIndex}`),
        title: title[1].trim(),
        lines: [],
        choices: [],
      };
      scenes.push(current);
      continue;
    }

    const choice = line.match(CHOICE_RE);
    if (choice) {
      ensureScene().choices.push({
        text: choice[1].trim(),
        target: choice[2],
      });
      continue;
    }

    const spoken = line.match(LINE_RE);
    if (spoken) {
      ensureScene().lines.push({ speaker: spoken[1].trim(), text: spoken[2].trim() });
    } else {
      ensureScene().lines.push({ text: line });
    }
  }

  return { scenes };
}

export interface ScriptToGraphOptions {
  /** Where the first scene goes. */
  origin?: { x: number; y: number };
  /** Horizontal spacing between scenes. */
  gapX?: number;
}

export interface ScriptGraph {
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
  }>;
  edges: Array<{ id: string; source: string; target: string; label?: string }>;
}

/**
 * Turn parsed scenes into a node graph.
 *
 * Each scene becomes one `stage` node carrying its dialogue and choices.
 * Choices link to their named target, or fall through to the next scene —
 * the same default a hand-built graph would have.
 */
export function scriptToGraph(
  script: ParsedScript,
  options: ScriptToGraphOptions = {},
): ScriptGraph {
  const { origin = { x: 0, y: 0 }, gapX = 320 } = options;
  const nodes: ScriptGraph['nodes'] = [];
  const edges: ScriptGraph['edges'] = [];

  script.scenes.forEach((scene, index) => {
    const primary = scene.lines[0];
    const dialogue = scene.lines
      .map((l) => (l.speaker ? `${l.speaker}: ${l.text}` : l.text))
      .join('\n');

    const nodeId = scene.title ? `stage-${scene.id}` : `stage-${index + 1}`;
    nodes.push({
      id: nodeId,
      type: 'stage',
      position: { x: origin.x + index * gapX, y: origin.y },
      data: {
        label: scene.title ?? primary?.text?.slice(0, 16) ?? `场景 ${index + 1}`,
        carrier: { type: 'image', url: '', loop: false, playbackRate: 1 },
        interaction: {
          dialogue: {
            speaker: primary?.speaker,
            text: dialogue,
            typewriterSpeedMs: 30,
          },
          choices: scene.choices.map((choice, ci) => ({
            id: `${nodeId}-c${ci + 1}`,
            text: choice.text,
            targetNodeId: choice.target ? idForTarget(choice.target, script) : '',
          })),
          hitboxes: [],
        },
        fx: {},
        flow: { preloadNext: [], mutations: [] },
      },
    });
  });

  // Wire fall-through and explicit targets.
  script.scenes.forEach((scene, index) => {
    const sourceId = scene.title ? `stage-${scene.id}` : `stage-${index + 1}`;
    const nextScene = script.scenes[index + 1];
    const nextId = nextScene
      ? nextScene.title
        ? `stage-${nextScene.id}`
        : `stage-${index + 2}`
      : null;

    if (scene.choices.length === 0) {
      if (nextId) {
        edges.push({ id: `${sourceId}->${nextId}`, source: sourceId, target: nextId });
      }
      return;
    }

    scene.choices.forEach((choice, ci) => {
      const target = choice.target
        ? idForTarget(choice.target, script)
        : nextId;
      if (!target) return;
      edges.push({
        id: `${sourceId}-c${ci + 1}->${target}`,
        source: sourceId,
        target,
        label: choice.text,
      });
    });
  });

  return { nodes, edges };
}

/** Resolve a `-> target` reference to a node id, matching slug or index. */
function idForTarget(target: string, script: ParsedScript): string {
  const bySlug = script.scenes.findIndex((s) => s.id === target);
  if (bySlug >= 0) return `stage-${script.scenes[bySlug].id}`;

  const asIndex = Number(target);
  if (Number.isInteger(asIndex) && asIndex >= 1 && asIndex <= script.scenes.length) {
    const scene = script.scenes[asIndex - 1];
    return scene.title ? `stage-${scene.id}` : `stage-${asIndex}`;
  }
  return `stage-${target}`;
}

/** Render a graph back to screenplay text. */
export function nodesToScript(
  nodes: Array<{ id: string; type: string; data?: Record<string, unknown> }>,
  edges: Array<{ source: string; target: string; label?: string }> = [],
): string {
  const ordered = nodes.filter((n) => n.type === 'stage' || n.type === 'scene');
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const lines: string[] = [];

  for (const node of ordered) {
    const data = node.data ?? {};
    const label = typeof data.label === 'string' ? data.label : node.id;
    lines.push(`# ${label}`, '');

    const dialogue =
      (data.interaction as { dialogue?: { speaker?: string; text?: string } } | undefined)
        ?.dialogue ?? (data as { dialogue?: { speaker?: string; text?: string } }).dialogue;
    if (dialogue?.text) {
      for (const line of dialogue.text.split('\n')) {
        if (!line.trim()) continue;
        const spoken = line.match(LINE_RE);
        lines.push(spoken ? line.trim() : line.trim());
      }
      lines.push('');
    }

    const choices =
      (data.interaction as { choices?: Array<{ text?: string; targetNodeId?: string }> } | undefined)
        ?.choices ?? (data as { choices?: Array<{ text?: string; targetNodeId?: string }> }).choices;
    if (choices?.length) {
      for (const choice of choices) {
        const target = choice.targetNodeId
          ? byId.get(choice.targetNodeId)
          : undefined;
        const targetLabel =
          target && typeof target.data?.label === 'string' ? target.data.label : '';
        lines.push(
          `> ${choice.text ?? ''}${targetLabel ? ` -> ${targetLabel}` : ''}`,
        );
      }
      lines.push('');
    }

    // Unconditional fall-through
    if (!choices?.length) {
      const next = edges.find((e) => e.source === node.id && !e.label);
      const target = next ? byId.get(next.target) : undefined;
      if (target && typeof target.data?.label === 'string') {
        lines.push(`-> ${target.data.label}`, '');
      }
    }
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
