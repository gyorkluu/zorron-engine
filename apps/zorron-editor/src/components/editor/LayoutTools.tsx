/**
 * LayoutTools — one-click tidy-up for the canvas.
 *
 * Auto-layout re-flows the whole graph; alignment and distribution act on the
 * current selection and disable themselves until enough nodes are selected.
 */

import { memo, useState } from 'react';
import {
  LayoutGrid,
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  MoveHorizontal,
  MoveVertical,
  type LucideIcon,
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { useT } from '@/i18n/useT';
import type { AlignMode } from '@/lib/layoutTools';
import { cn } from '@/lib/utils';

export interface LayoutToolsProps {
  /** How many nodes are currently selected. */
  selectedCount: number;
}

const ALIGN_ACTIONS: Array<{ mode: AlignMode; icon: LucideIcon; key: string }> = [
  { mode: 'left', icon: AlignHorizontalJustifyStart, key: 'layout.align.left' },
  { mode: 'centerX', icon: AlignHorizontalJustifyCenter, key: 'layout.align.centerX' },
  { mode: 'right', icon: AlignHorizontalJustifyEnd, key: 'layout.align.right' },
  { mode: 'top', icon: AlignVerticalJustifyStart, key: 'layout.align.top' },
  { mode: 'centerY', icon: AlignVerticalJustifyCenter, key: 'layout.align.centerY' },
  { mode: 'bottom', icon: AlignVerticalJustifyEnd, key: 'layout.align.bottom' },
];

function LayoutToolsImpl({ selectedCount }: LayoutToolsProps) {
  const { t } = useT();
  const autoLayoutAll = useEditorStore((s) => s.autoLayoutAll);
  const alignSelected = useEditorStore((s) => s.alignSelected);
  const distributeSelected = useEditorStore((s) => s.distributeSelected);
  const [open, setOpen] = useState(false);

  const canAlign = selectedCount >= 2;
  const canDistribute = selectedCount >= 3;

  const run = (action: () => void) => {
    action();
    setOpen(false);
  };

  return (
    <div className="relative flex items-center gap-1">
      <button
        type="button"
        onClick={autoLayoutAll}
        data-testid="auto-layout"
        title={t('layout.auto')}
        className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-200 transition-all hover:border-slate-600 hover:bg-slate-700"
      >
        <LayoutGrid size={13} />
        <span className="hidden lg:inline">{t('layout.auto')}</span>
      </button>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={!canAlign}
        data-testid="align-menu-toggle"
        title={
          canAlign
            ? t('layout.align')
            : t('layout.align.needSelection', { n: 2 })
        }
        className={cn(
          'flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all',
          canAlign
            ? 'border-slate-700 bg-slate-800/80 text-slate-200 hover:border-slate-600 hover:bg-slate-700'
            : 'cursor-not-allowed border-slate-800 bg-slate-900/60 text-slate-600',
        )}
      >
        <AlignHorizontalJustifyCenter size={13} />
        <span className="hidden lg:inline">{t('layout.align')}</span>
      </button>

      {open && canAlign ? (
        <>
          {/* Click-away layer */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-slate-700 bg-slate-900/95 p-1 shadow-2xl backdrop-blur-md"
            data-testid="align-menu"
          >
            {ALIGN_ACTIONS.map(({ mode, icon: Icon, key }) => (
              <button
                key={mode}
                type="button"
                onClick={() => run(() => alignSelected(mode))}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
              >
                <Icon size={13} />
                {t(key as never)}
              </button>
            ))}

            <div className="my-1 h-px bg-slate-700/60" />

            <button
              type="button"
              disabled={!canDistribute}
              onClick={() => run(() => distributeSelected('horizontal'))}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors',
                canDistribute
                  ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  : 'cursor-not-allowed text-slate-600',
              )}
            >
              <MoveHorizontal size={13} />
              {t('layout.distribute.h')}
            </button>
            <button
              type="button"
              disabled={!canDistribute}
              onClick={() => run(() => distributeSelected('vertical'))}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors',
                canDistribute
                  ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  : 'cursor-not-allowed text-slate-600',
              )}
            >
              <MoveVertical size={13} />
              {t('layout.distribute.v')}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

export const LayoutTools = memo(LayoutToolsImpl);
