// Generic linear undo/redo stack shared by the Gödel sandbox and the proof
// unroller. Stores immutable snapshots; pushing a new state after an undo
// discards the redo tail (standard editor semantics).
export function createHistory(initialState) {
  let stack = [initialState];
  let index = 0;

  return {
    push(state) {
      stack = stack.slice(0, index + 1);
      stack.push(state);
      index++;
    },
    undo() {
      if (index > 0) {
        index--;
        return stack[index];
      }
      return null;
    },
    redo() {
      if (index < stack.length - 1) {
        index++;
        return stack[index];
      }
      return null;
    },
    reset(state) {
      stack = [state];
      index = 0;
    },
    current() {
      return stack[index];
    },
    canUndo() {
      return index > 0;
    },
    canRedo() {
      return index < stack.length - 1;
    },
  };
}
