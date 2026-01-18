import { Game, Move } from 'boardgame.io';
import { INVALID_MOVE } from 'boardgame.io/core';
import { GameState, PHASES, COLUMNS, PlayerID, Card, Slot } from './types';
import unitData from '../data/units.json';

const MAX_HAND_SIZE = 7;

// --- Helper Functions ---

const createSlot = (): Slot => ({
    status: 'EMPTY',
    card: null,
    isFaceUp: false,
    isOperational: false,
    tokens: 0,
});

const generateDeck = (): Card[] => {
    const deck: Card[] = [];
    const units = Object.keys(unitData);
    // Create a deck of 20 random cards for now
    for (let i = 0; i < 20; i++) {
        const unitId = units[Math.floor(Math.random() * units.length)];
        deck.push({ id: `card_${i}_${Math.random().toString(36).substr(2, 9)}`, unitId });
    }
    return deck;
};

// --- Moves ---

const DrawCard: Move<GameState> = ({ G, playerID, events }) => {
    const player = G.players[playerID as PlayerID];
    if (player.deck.length > 0) {
        const card = player.deck.pop()!;
        player.hand.push(card);
    }
};

const CheckHandLimit: Move<GameState> = ({ G, playerID, events }, discards: number[]) => {
    // This is a simplified "Discard Down" move
    const player = G.players[playerID as PlayerID];

    // logic to remove cards would go here. For scaffold, auto-discard last drawn
    while (player.hand.length > MAX_HAND_SIZE) {
        player.hand.pop();
    }

    events.endPhase();
};

const Pass: Move<GameState> = ({ events }) => {
    events.endPhase();
};



const Advance: Move<GameState> = ({ G, playerID }, columnId: string) => {
    const col = G.columns[columnId as keyof typeof G.columns];
    const pCol = col.players[playerID as PlayerID];

    // Logic: Reserve -> Front, Rear -> Reserve
    // Only if target is empty

    let moved = false;

    // 1. Reserve -> Front
    if (pCol.reserve.status === 'OCCUPIED' && pCol.front.status === 'EMPTY') {
        pCol.front = { ...pCol.reserve };
        pCol.reserve = createSlot();
        moved = true;
    }

    // 2. Rear -> Reserve
    if (pCol.rear.status === 'OCCUPIED' && pCol.reserve.status === 'EMPTY') {
        pCol.reserve = { ...pCol.rear };
        pCol.rear = createSlot();
        moved = true;
    }

    if (!moved) return INVALID_MOVE;
};

const Withdraw: Move<GameState> = ({ G, playerID }, columnId: string) => {
    const col = G.columns[columnId as keyof typeof G.columns];
    const pCol = col.players[playerID as PlayerID];

    if (pCol.front.status !== 'OCCUPIED') return INVALID_MOVE;

    const card = pCol.front.card!;
    G.players[playerID as PlayerID].hand.push(card);
    pCol.front = createSlot();
};

const Ship: Move<GameState> = ({ G, playerID, events }, columnId: string, cardIndex: number) => {
    const col = G.columns[columnId as keyof typeof G.columns];
    const pCol = col.players[playerID as PlayerID];

    if (pCol.rear.status === 'OCCUPIED') return INVALID_MOVE;

    const player = G.players[playerID as PlayerID];
    const card = player.hand[cardIndex];

    if (!card) return INVALID_MOVE;

    pCol.rear.status = 'OCCUPIED';
    pCol.rear.card = card;
    pCol.rear.isFaceUp = false;

    player.hand.splice(cardIndex, 1);

    events.endPhase(); // Commitment is single action then end phase
};

const PrimaryAction: Move<GameState> = ({ G, playerID }, columnId: string) => {
    // Placeholder for actual unit logic
    const col = G.columns[columnId as keyof typeof G.columns];
    const pCol = col.players[playerID as PlayerID];

    if (pCol.front.status !== 'OCCUPIED' || !pCol.front.isOperational) return INVALID_MOVE;

    // Logic would depend on unit type (destroy, aim, etc.)
    // For now, generic action: Mark as used? Or just allow it.
    console.log(`Player ${playerID} used Primary Action in ${columnId}`);
};


// --- Game Object ---

export const CardsAndCannon: Game<GameState> = {
    setup: (): GameState => {
        const columns: any = {};
        COLUMNS.forEach(id => {
            columns[id] = {
                id,
                players: {
                    '0': { rear: createSlot(), reserve: createSlot(), front: createSlot() },
                    '1': { rear: createSlot(), reserve: createSlot(), front: createSlot() },
                }
            };
        });

        return {
            columns,
            players: {
                '0': { hand: [], deck: generateDeck(), breakthroughTokens: 0 },
                '1': { hand: [], deck: generateDeck(), breakthroughTokens: 0 },
            },
        };
    },

    phases: {
        [PHASES.SUPPLY]: {
            start: true,
            onBegin: ({ G, ctx }) => {
                const player = G.players[ctx.currentPlayer as PlayerID];
                if (player.deck.length > 0) {
                    player.hand.push(player.deck.pop()!);
                }
            },
            moves: { CheckHandLimit }, // Or just end phase automatically if < limit
            next: PHASES.LOGISTICS,
        },
        [PHASES.LOGISTICS]: {
            moves: { Advance, Withdraw, Pass },
            turn: {
                minMoves: 1,
                maxMoves: 1,
            },
            next: PHASES.ARRIVAL,
        },
        [PHASES.ARRIVAL]: {
            onBegin: ({ G }) => {
                // Logic: Scan front slots. If newly arrived (facedown), Reveal (Exposed) and Activate.
                COLUMNS.forEach(colId => {
                    const col = G.columns[colId as keyof typeof G.columns];
                    ['0', '1'].forEach(pid => {
                        const pCol = col.players[pid as PlayerID];
                        if (pCol.front.status === 'OCCUPIED' && !pCol.front.isFaceUp) {
                            pCol.front.isFaceUp = true;
                            // Trigger Activate ability here
                        }
                    })
                })
            },
            // No player moves in Arrival usually, it's automatic.
            // Assuming auto-transition for now or a "Done" move
            next: PHASES.ENGAGEMENT,
        },
        [PHASES.ENGAGEMENT]: {
            onBegin: ({ G }) => {
                // Readying: Exposed -> Operational
                COLUMNS.forEach(colId => {
                    const col = G.columns[colId as keyof typeof G.columns];
                    ['0', '1'].forEach(pid => {
                        const pCol = col.players[pid as PlayerID];
                        if (pCol.front.status === 'OCCUPIED' && pCol.front.isFaceUp) {
                            pCol.front.isOperational = true;
                        }
                    })
                })
            },
            moves: { PrimaryAction },
            next: PHASES.COMMITMENT,
        },
        [PHASES.COMMITMENT]: {
            moves: { Ship },
            next: PHASES.SUPPLY, // Loop back
        },
    },

    // Checking Overrun Passive at end of every move? 
    // Or handled within moves. Game specs say "immediately".
    // For simplicity, we can check it in a simplified way or inside moves.
};
