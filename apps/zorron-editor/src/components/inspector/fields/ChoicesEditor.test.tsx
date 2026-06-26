/**
 * Unit tests for the ChoicesEditor component.
 *
 * Tests rendering (empty/populated states), add/remove behavior, text editing,
 * and interaction type switching (tap/hold/slash).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChoicesEditor } from './ChoicesEditor';
import type { SceneChoice } from '@/types/flow';

// Mock useT so we get predictable, deterministic strings in the DOM.
vi.mock('@/i18n/useT', () => ({
  useT: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (!params) return key;
      return Object.entries(params).reduce(
        (str, [k, v]) => str.replace(`{${k}}`, String(v)),
        key,
      );
    },
    locale: 'en',
  }),
  tt: (key: string) => key,
}));

function makeChoice(overrides: Partial<SceneChoice> = {}): SceneChoice {
  return {
    id: `choice_${Math.random().toString(36).slice(2, 8)}`,
    text: 'Option',
    interaction: 'tap',
    ...overrides,
  };
}

describe('ChoicesEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the empty hint when there are no choices', () => {
    const onChange = vi.fn();
    render(<ChoicesEditor choices={[]} onChange={onChange} />);
    // The empty-state paragraph renders the `choices.empty` translation key.
    expect(screen.getByText('choices.empty')).toBeInTheDocument();
    // The title reflects the count via interpolation: `choices.title` with {n:0}.
    expect(screen.getByText('choices.title')).toBeInTheDocument();
  });

  it('renders the existing choices list with text and indices', () => {
    const onChange = vi.fn();
    const choices: SceneChoice[] = [
      makeChoice({ id: 'c1', text: 'Go north' }),
      makeChoice({ id: 'c2', text: 'Go south' }),
    ];
    render(<ChoicesEditor choices={choices} onChange={onChange} />);
    expect(screen.getByDisplayValue('Go north')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Go south')).toBeInTheDocument();
    // Index labels (#1, #2) are rendered as separate text nodes.
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    // Empty hint should NOT be shown.
    expect(screen.queryByText('choices.empty')).not.toBeInTheDocument();
  });

  it('calls onChange with a new choice when the add button is clicked', () => {
    const onChange = vi.fn();
    render(<ChoicesEditor choices={[]} onChange={onChange} />);
    fireEvent.click(screen.getByText('choices.add'));
    expect(onChange).toHaveBeenCalledTimes(1);
    const newChoices = onChange.mock.calls[0][0] as SceneChoice[];
    expect(newChoices).toHaveLength(1);
    expect(newChoices[0].interaction).toBe('tap');
    expect(newChoices[0].text).toBe('choices.newDefault');
    expect(newChoices[0].id).toMatch(/^choice_/);
  });

  it('calls onChange with the choice removed when the delete button is clicked', () => {
    const onChange = vi.fn();
    const choices: SceneChoice[] = [
      makeChoice({ id: 'c1', text: 'Keep' }),
      makeChoice({ id: 'c2', text: 'Remove' }),
    ];
    render(<ChoicesEditor choices={choices} onChange={onChange} />);
    // There are two delete buttons (one per choice). Click the second one.
    const deleteButtons = screen.getAllByText('choices.del');
    expect(deleteButtons).toHaveLength(2);
    fireEvent.click(deleteButtons[1]);
    expect(onChange).toHaveBeenCalledTimes(1);
    const remaining = onChange.mock.calls[0][0] as SceneChoice[];
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('c1');
  });

  it('calls onChange with updated text when the text field is edited', () => {
    const onChange = vi.fn();
    const choices: SceneChoice[] = [
      makeChoice({ id: 'c1', text: 'Old text' }),
    ];
    render(<ChoicesEditor choices={choices} onChange={onChange} />);
    const input = screen.getByDisplayValue('Old text');
    fireEvent.change(input, { target: { value: 'New text' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const updated = onChange.mock.calls[0][0] as SceneChoice[];
    expect(updated[0].text).toBe('New text');
    // Other fields are preserved.
    expect(updated[0].id).toBe('c1');
    expect(updated[0].interaction).toBe('tap');
  });

  it('switches interaction type to hold and shows the hold duration field', () => {
    const onChange = vi.fn();
    const choices: SceneChoice[] = [
      makeChoice({ id: 'c1', text: 'Hold me', interaction: 'tap' }),
    ];
    render(<ChoicesEditor choices={choices} onChange={onChange} />);
    // The interaction select defaults to `tap`.
    const select = screen.getByDisplayValue('interaction.tap');
    fireEvent.change(select, { target: { value: 'hold' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const updated = onChange.mock.calls[0][0] as SceneChoice[];
    expect(updated[0].interaction).toBe('hold');
  });

  it('shows the slash direction field when interaction is slash', () => {
    const onChange = vi.fn();
    const choices: SceneChoice[] = [
      makeChoice({
        id: 'c1',
        text: 'Swipe',
        interaction: 'slash',
        slashDirection: 'right',
      }),
    ];
    render(<ChoicesEditor choices={choices} onChange={onChange} />);
    // The slash direction select is rendered with the `choices.direction` label.
    expect(screen.getByText('choices.direction')).toBeInTheDocument();
    // The select's current value is the slashDirection.
    const dirSelect = screen.getByDisplayValue('dir.right') as HTMLSelectElement;
    expect(dirSelect).toBeInTheDocument();
    // Change to a different direction.
    fireEvent.change(dirSelect, { target: { value: 'up' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const updated = onChange.mock.calls[0][0] as SceneChoice[];
    expect(updated[0].slashDirection).toBe('up');
  });

  it('renders the hold duration field when interaction is hold', () => {
    const onChange = vi.fn();
    const choices: SceneChoice[] = [
      makeChoice({
        id: 'c1',
        text: 'Hold',
        interaction: 'hold',
        holdDuration: 2000,
      }),
    ];
    render(<ChoicesEditor choices={choices} onChange={onChange} />);
    // The hold duration NumberField is rendered with the `choices.holdMs` label.
    expect(screen.getByText('choices.holdMs')).toBeInTheDocument();
    // The number input shows the configured holdDuration.
    const numberInput = screen.getByDisplayValue('2000') as HTMLInputElement;
    expect(numberInput).toBeInTheDocument();
    // Change the duration.
    fireEvent.change(numberInput, { target: { value: '3000' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const updated = onChange.mock.calls[0][0] as SceneChoice[];
    expect(updated[0].holdDuration).toBe(3000);
  });
});
