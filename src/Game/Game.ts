import { Game, Move } from 'boardgame.io';
import { INVALID_MOVE, TurnOrder } from 'boardgame.io/core';
import { GameState, PHASES, COLUMNS, PlayerID, Card, Slot, UnitId, EventId } from './types';

import deckData from '../data/deck.json';

const MAX_HAND_SIZE = deckData.deck.hand_limit;

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

    // Add Units
    Object.entries(deckData.deck.composition.units).forEach(([id, count]) => {
        for (let i = 0; i < count; i++) {
            deck.push({
                id: `unit_${id}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'UNIT',
                unitId: id as UnitId
            });
        }
    });

    // Add Events
    Object.entries(deckData.deck.composition.events).forEach(([id, count]) => {
        for (let i = 0; i < count; i++) {
            deck.push({
                id: `event_${id}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'EVENT',
                eventId: id as EventId
            });
        }
    });

    // Shuffle (Fisher-Yates)
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
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
    const player = G.players[playerID as PlayerID];
    while (player.hand.length > MAX_HAND_SIZE) {
        player.hand.pop();
    }
    events.endTurn();
};

const Pass: Move<GameState> = ({ events }) => {
    events.endTurn();
};




const PlayEvent: Move<GameState> = ({ G, playerID, events }, cardIndex: number) => {
    const player = G.players[playerID as PlayerID];
    const card = player.hand[cardIndex];

    if (!card || card.type !== 'EVENT') return INVALID_MOVE;

    console.log(`Player ${playerID} played event: ${card.eventId}`);

    // Remove from hand
    player.hand.splice(cardIndex, 1);

    // TODO: Implement actual event logic based on card.eventId
    // For now, it's just a free action that consumes the card.
    // Since it's free, we DO NOT call events.endPhase() or increment moves.
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

    if (card.type !== 'UNIT') return INVALID_MOVE;

    pCol.rear.status = 'OCCUPIED';
    pCol.rear.card = card;
    pCol.rear.isFaceUp = false;

    player.hand.splice(cardIndex, 1);

    events.endTurn(); // Commitment is single action then end turn
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

        const p0Deck = generateDeck();
        const p1Deck = generateDeck();
        const STARTING_HAND_SIZE = deckData.deck.starting_hand_size;

        const p0Hand = p0Deck.splice(-STARTING_HAND_SIZE);
        const p1Hand = p1Deck.splice(-STARTING_HAND_SIZE);

        return {
            columns,
            players: {
                '0': { hand: p0Hand, deck: p0Deck, breakthroughTokens: 0 },
                '1': { hand: p1Hand, deck: p1Deck, breakthroughTokens: 0 },
            },
        };
    },

    phases: {
        [PHASES.SUPPLY]: {
            start: true,
            turn: {
                order: TurnOrder.ONCE,
                onBegin: ({ G, ctx }) => {
                    const player = G.players[ctx.currentPlayer as PlayerID];
                    if (player.deck.length > 0) {
                        player.hand.push(player.deck.pop()!);
                    }
                },
                minMoves: 1,
                maxMoves: 1,
            },
            moves: { CheckHandLimit },
            next: PHASES.LOGISTICS,
        },
        [PHASES.LOGISTICS]: {
            turn: {
                order: TurnOrder.ONCE,
                minMoves: 1,
                maxMoves: 1,
            },
            moves: { Advance, Withdraw, Pass, PlayEvent },
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
            turn: {
                order: TurnOrder.ONCE,
                minMoves: 1,
                maxMoves: 1,
            },
            moves: { Ship, Pass },
            next: PHASES.SUPPLY, // Loop back
        },
    },

    // Checking Overrun Passive at end of every move? 
    // Or handled within moves. Game specs say "immediately".
    // For simplicity, we can check it in a simplified way or inside moves.
};
