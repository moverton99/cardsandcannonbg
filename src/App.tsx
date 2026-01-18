import { Client } from 'boardgame.io/react';
import { TicTacToe } from './Game/TicTacToe';
import { TicTacToeBoard } from './UI/TicTacToeBoard';

const App = Client({
  game: TicTacToe,
  board: TicTacToeBoard,
  debug: true,
});

export default App;
