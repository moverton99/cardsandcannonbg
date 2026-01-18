import { Client } from 'boardgame.io/react';
import { CardsAndCannon } from './Game/Game';
import { Board } from './UI/Board';

const App = Client({
  game: CardsAndCannon,
  board: Board,
  debug: true,
});

export default App;
