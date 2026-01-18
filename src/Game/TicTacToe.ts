import { Game } from 'boardgame.io';
import { INVALID_MOVE } from 'boardgame.io/core';

export interface TicTacToeState {
  cells: (string | null)[];
}

export const TicTacToe: Game<TicTacToeState> = {
  setup: (): TicTacToeState => ({ cells: Array(9).fill(null) }),

  turn: {
    minMoves: 1,
    maxMoves: 1,
  },

  moves: {
    clickCell: ({ G, playerID }, id: number) => {
      if (G.cells[id] !== null) {
        return INVALID_MOVE;
      }
      G.cells[id] = playerID;
    },
  },

  endIf: ({ G, ctx }) => {
    if (IsVictory(G.cells)) {
      return { winner: ctx.currentPlayer };
    }
    if (IsDraw(G.cells)) {
      return { draw: true };
    }
  },
};

function IsVictory(cells: (string | null)[]) {
  const positions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  for (const pos of positions) {
    const symbol = cells[pos[0]];
    let winner = symbol;
    for (const i of pos) {
      if (cells[i] !== symbol) {
        winner = null;
        break;
      }
    }
    if (winner !== null) return true;
  }
  return false;
}

function IsDraw(cells: (string | null)[]) {
  return cells.filter(c => c === null).length === 0;
}
