import { describe, expect, it } from 'vitest';
import { createInitialUndoableState, redo, undo, undoable } from '../undoable';

type CounterAction = { type: 'INCREMENT' } | { type: 'DECREMENT' } | { type: 'SET_LABEL'; payload: string };

function counterReducer(state: { value: number; label: string }, action: CounterAction) {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, value: state.value + 1 };
    case 'DECREMENT':
      return { ...state, value: state.value - 1 };
    case 'SET_LABEL':
      return { ...state, label: action.payload };
    default:
      return state;
  }
}

describe('undoable', () => {
  it('applies actions normally and tracks them in `past`', () => {
    const reducer = undoable(counterReducer);
    let state = createInitialUndoableState({ value: 0, label: '' });
    state = reducer(state, { type: 'INCREMENT' });
    state = reducer(state, { type: 'INCREMENT' });
    expect(state.present.value).toBe(2);
    expect(state.past).toHaveLength(2);
  });

  it('undo reverts to the previous present and pushes the current one onto `future`', () => {
    const reducer = undoable(counterReducer);
    let state = createInitialUndoableState({ value: 0, label: '' });
    state = reducer(state, { type: 'INCREMENT' });
    state = reducer(state, { type: 'INCREMENT' });
    state = reducer(state, undo());
    expect(state.present.value).toBe(1);
    expect(state.future).toHaveLength(1);
  });

  it('redo re-applies a previously undone change', () => {
    const reducer = undoable(counterReducer);
    let state = createInitialUndoableState({ value: 0, label: '' });
    state = reducer(state, { type: 'INCREMENT' });
    state = reducer(state, undo());
    state = reducer(state, redo());
    expect(state.present.value).toBe(1);
    expect(state.future).toHaveLength(0);
  });

  it('is a no-op when undoing with an empty past, or redoing with an empty future', () => {
    const reducer = undoable(counterReducer);
    const initial = createInitialUndoableState({ value: 0, label: '' });
    expect(reducer(initial, undo())).toBe(initial);
    expect(reducer(initial, redo())).toBe(initial);
  });

  it('dispatching a new action after an undo clears the redo stack', () => {
    const reducer = undoable(counterReducer);
    let state = createInitialUndoableState({ value: 0, label: '' });
    state = reducer(state, { type: 'INCREMENT' });
    state = reducer(state, { type: 'INCREMENT' });
    state = reducer(state, undo());
    expect(state.future).toHaveLength(1);
    state = reducer(state, { type: 'DECREMENT' });
    expect(state.future).toHaveLength(0);
  });

  it('does not push a history entry for an exempt action type', () => {
    const reducer = undoable(counterReducer, { exemptActionTypes: ['SET_LABEL'] });
    let state = createInitialUndoableState({ value: 0, label: '' });
    state = reducer(state, { type: 'SET_LABEL', payload: 'hello' });
    expect(state.present.label).toBe('hello');
    expect(state.past).toHaveLength(0);
    // Undo should have nothing to revert, since the label change left no trace.
    expect(reducer(state, undo())).toBe(state);
  });

  it('caps history length at maxHistory, dropping the oldest entries', () => {
    const reducer = undoable(counterReducer, { maxHistory: 3 });
    let state = createInitialUndoableState({ value: 0, label: '' });
    for (let i = 0; i < 10; i += 1) {
      state = reducer(state, { type: 'INCREMENT' });
    }
    expect(state.past).toHaveLength(3);
    expect(state.present.value).toBe(10);
  });
});
