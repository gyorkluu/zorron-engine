/**
 * Unit tests for the AssignmentsEditor component.
 *
 * Tests rendering (empty/populated states), add/remove behavior, variable name
 * editing, operator switching (set/add/sub), and value editing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AssignmentsEditor } from './AssignmentsEditor';
import type { SetterAssignment } from '@/types/flow';

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

function makeAssignment(
  overrides: Partial<SetterAssignment> = {},
): SetterAssignment {
  return {
    variable: 'var',
    value: 0,
    operator: 'set',
    ...overrides,
  };
}

describe('AssignmentsEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the empty hint when there are no assignments', () => {
    const onChange = vi.fn();
    render(<AssignmentsEditor assignments={[]} onChange={onChange} />);
    expect(screen.getByText('assign.empty')).toBeInTheDocument();
    // The title reflects the count via interpolation: `assign.title` with {n:0}.
    expect(screen.getByText('assign.title')).toBeInTheDocument();
  });

  it('renders the existing assignments with variable, operator and value', () => {
    const onChange = vi.fn();
    const assignments: SetterAssignment[] = [
      makeAssignment({ variable: 'health', value: 100, operator: 'set' }),
      makeAssignment({ variable: 'gold', value: 50, operator: 'add' }),
    ];
    render(<AssignmentsEditor assignments={assignments} onChange={onChange} />);
    expect(screen.getByDisplayValue('health')).toBeInTheDocument();
    expect(screen.getByDisplayValue('gold')).toBeInTheDocument();
    expect(screen.getByDisplayValue('100')).toBeInTheDocument();
    expect(screen.getByDisplayValue('50')).toBeInTheDocument();
    // Empty hint should NOT be shown.
    expect(screen.queryByText('assign.empty')).not.toBeInTheDocument();
  });

  it('calls onChange with a new default assignment when add is clicked', () => {
    const onChange = vi.fn();
    render(<AssignmentsEditor assignments={[]} onChange={onChange} />);
    fireEvent.click(screen.getByText('assign.add'));
    expect(onChange).toHaveBeenCalledTimes(1);
    const created = onChange.mock.calls[0][0] as SetterAssignment[];
    expect(created).toHaveLength(1);
    expect(created[0]).toEqual({ variable: 'var', value: 0, operator: 'set' });
  });

  it('calls onChange with the assignment removed when delete is clicked', () => {
    const onChange = vi.fn();
    const assignments: SetterAssignment[] = [
      makeAssignment({ variable: 'keep', value: 1, operator: 'set' }),
      makeAssignment({ variable: 'drop', value: 2, operator: 'add' }),
    ];
    render(<AssignmentsEditor assignments={assignments} onChange={onChange} />);
    const deleteButtons = screen.getAllByText('assign.del');
    expect(deleteButtons).toHaveLength(2);
    fireEvent.click(deleteButtons[1]);
    expect(onChange).toHaveBeenCalledTimes(1);
    const remaining = onChange.mock.calls[0][0] as SetterAssignment[];
    expect(remaining).toHaveLength(1);
    expect(remaining[0].variable).toBe('keep');
  });

  it('calls onChange with updated variable when the variable field is edited', () => {
    const onChange = vi.fn();
    const assignments: SetterAssignment[] = [
      makeAssignment({ variable: 'oldName', value: 0, operator: 'set' }),
    ];
    render(<AssignmentsEditor assignments={assignments} onChange={onChange} />);
    const input = screen.getByDisplayValue('oldName');
    fireEvent.change(input, { target: { value: 'newName' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const updated = onChange.mock.calls[0][0] as SetterAssignment[];
    expect(updated[0].variable).toBe('newName');
    // Other fields are preserved.
    expect(updated[0].value).toBe(0);
    expect(updated[0].operator).toBe('set');
  });

  it('calls onChange with updated operator when the operator select is changed', () => {
    const onChange = vi.fn();
    const assignments: SetterAssignment[] = [
      makeAssignment({ variable: 'v', value: 5, operator: 'set' }),
    ];
    render(<AssignmentsEditor assignments={assignments} onChange={onChange} />);
    // The operator select defaults to `set` and shows the `assign.op.set` label.
    const select = screen.getByDisplayValue('assign.op.set') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'add' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const updated = onChange.mock.calls[0][0] as SetterAssignment[];
    expect(updated[0].operator).toBe('add');
  });

  it('cycles through all operator options (set/add/sub)', () => {
    const onChange = vi.fn();
    const assignments: SetterAssignment[] = [
      makeAssignment({ variable: 'v', value: 1, operator: 'set' }),
    ];
    render(<AssignmentsEditor assignments={assignments} onChange={onChange} />);
    const select = screen.getByDisplayValue('assign.op.set') as HTMLSelectElement;
    // Confirm all three operator options are present.
    expect(
      Array.from(select.options).map((o) => o.value),
    ).toEqual(['set', 'add', 'sub']);

    fireEvent.change(select, { target: { value: 'sub' } });
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ operator: 'sub' }),
    ]);
  });

  it('calls onChange with updated value when the number field is changed', () => {
    const onChange = vi.fn();
    const assignments: SetterAssignment[] = [
      makeAssignment({ variable: 'v', value: 10, operator: 'set' }),
    ];
    render(<AssignmentsEditor assignments={assignments} onChange={onChange} />);
    const numberInput = screen.getByDisplayValue('10') as HTMLInputElement;
    fireEvent.change(numberInput, { target: { value: '42' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const updated = onChange.mock.calls[0][0] as SetterAssignment[];
    expect(updated[0].value).toBe(42);
  });

  it('falls back to 0 when the value is non-numeric', () => {
    const onChange = vi.fn();
    const assignments: SetterAssignment[] = [
      // The component coerces with `Number(assignment.value) || 0`.
      makeAssignment({ variable: 'v', value: 'not-a-number', operator: 'set' }),
    ];
    render(<AssignmentsEditor assignments={assignments} onChange={onChange} />);
    // The displayed value should be 0 (NaN coerced to 0).
    expect(screen.getByDisplayValue('0')).toBeInTheDocument();
  });
});
