/**
 * VisualBlockRenderer — renders a settlement node's declared block list.
 *
 * Unknown block types are skipped rather than throwing, so a project authored
 * against a newer block catalogue still renders on an older build.
 */

import { Fragment } from 'react';
import { getVisualBlock } from './registry';
import type { GameState, SettlementResult } from '@/engine/GameEngine';
import type { ProjectSettings } from '@/types/flow';

/** One declared block, as stored on the settlement node. */
export interface DeclaredBlock {
  type: string;
  props?: Record<string, unknown>;
}

export interface VisualBlockRendererProps {
  /** Ordered block declarations from the settlement node. */
  blocks: DeclaredBlock[];
  result: SettlementResult;
  settings?: ProjectSettings;
  state?: GameState;
}

export function VisualBlockRenderer({
  blocks,
  result,
  settings,
  state,
}: VisualBlockRendererProps) {
  return (
    <div className="flex w-full flex-col items-center gap-5">
      {blocks.map((block, index) => {
        const definition = getVisualBlock(block.type);
        if (!definition) return null;
        const Block = definition.Component;
        return (
          <Fragment key={`${block.type}-${index}`}>
            <div className="w-full">
              <Block
                result={result}
                config={block.props}
                settings={settings}
                state={state}
              />
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
