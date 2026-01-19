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

const DrawCard: Move<GameState> = ({ G, playerID }) => {
    const player = G.players[playerID as PlayerID];
    if (player.deck.length > 0 && !G.hasDrawnCard) {
        const card = player.deck.pop()!;
        player.hand.push(card);
        G.hasDrawnCard = true;
        G.lastDrawnCard = card;
    }
};

const DiscardCard: Move<GameState> = ({ G, playerID }, cardIndex: number) => {
    const player = G.players[playerID as PlayerID];
    if (cardIndex < 0 || cardIndex >= player.hand.length) return INVALID_MOVE;

    const [card] = player.hand.splice(cardIndex, 1);
    player.discardPile.push(card);
};

const Pass: Move<GameState> = ({ events }) => {
    events.endPhase();
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

const Advance: Move<GameState> = ({ G, playerID, events }, columnId: string) => {
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
    events.endPhase();
};

const Withdraw: Move<GameState> = ({ G, playerID, events }, columnId: string) => {
    const col = G.columns[columnId as keyof typeof G.columns];
    const pCol = col.players[playerID as PlayerID];

    if (pCol.front.status !== 'OCCUPIED') return INVALID_MOVE;

    const card = pCol.front.card!;
    G.players[playerID as PlayerID].hand.push(card);
    pCol.front = createSlot();
    events.endPhase();
};

const Ship: Move<GameState> = ({ G, playerID, events }, columnId: string, cardIndex: number) => {
    const col = G.columns[columnId as keyof typeof G.columns];
    const pCol = col.players[playerID as PlayerID];

    // Check if column is full
    const isFull = pCol.front.status === 'OCCUPIED' &&
        pCol.reserve.status === 'OCCUPIED' &&
        pCol.rear.status === 'OCCUPIED';

    if (isFull) return INVALID_MOVE;

    const player = G.players[playerID as PlayerID];
    const card = player.hand[cardIndex];

    if (!card || card.type !== 'UNIT') return INVALID_MOVE;

    // Push Logic: If Rear is occupied, push Rear to Reserve. 
    // If Reserve was also occupied, push Reserve to Front.
    if (pCol.rear.status === 'OCCUPIED') {
        if (pCol.reserve.status === 'OCCUPIED') {
            // Since it's not full, Front must be empty
            pCol.front = { ...pCol.reserve };
        }
        pCol.reserve = { ...pCol.rear };
    }

    pCol.rear.status = 'OCCUPIED';
    pCol.rear.card = card;
    pCol.rear.isFaceUp = false;
    pCol.rear.isOperational = false;

    player.hand.splice(cardIndex, 1);

    events.endTurn();
    events.endPhase();
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
                '0': { hand: p0Hand, deck: p0Deck, discardPile: [], breakthroughTokens: 0 },
                '1': { hand: p1Hand, deck: p1Deck, discardPile: [], breakthroughTokens: 0 },
            },
            hasDrawnCard: false,
            lastDrawnCard: null,
        };
    },

    phases: {
        [PHASES.SUPPLY]: {
            start: true,
            onBegin: ({ G }) => {
                G.hasDrawnCard = false;
                G.lastDrawnCard = null;
            },
            turn: {
                order: TurnOrder.CONTINUE,
            },
            moves: { DrawCard, DiscardCard },
            endIf: ({ G, ctx }) => {
                const player = G.players[ctx.currentPlayer as PlayerID];
                return G.hasDrawnCard && player.hand.length <= MAX_HAND_SIZE;
            },
            next: PHASES.LOGISTICS,
        },
        [PHASES.LOGISTICS]: {
            turn: {
                order: TurnOrder.CONTINUE,
            },
            moves: { Advance, Withdraw, Pass, PlayEvent },
            next: PHASES.ARRIVAL,
        },
        [PHASES.ARRIVAL]: {
            onBegin: ({ G, ctx }) => {
                // Logic: Scan current player's front slots. If newly arrived (facedown), Reveal (Exposed).
                COLUMNS.forEach(colId => {
                    const col = G.columns[colId as keyof typeof G.columns];
                    const pCol = col.players[ctx.currentPlayer as PlayerID];
                    if (pCol.front.status === 'OCCUPIED' && !pCol.front.isFaceUp) {
                        pCol.front.isFaceUp = true;
                        // Trigger Activate ability here
                    }
                })
            },
            endIf: () => true,
            next: PHASES.ENGAGEMENT,
        },
        [PHASES.ENGAGEMENT]: {
            onBegin: ({ G, ctx }) => {
                // Readying: Exposed -> Operational for current player
                COLUMNS.forEach(colId => {
                    const col = G.columns[colId as keyof typeof G.columns];
                    const pCol = col.players[ctx.currentPlayer as PlayerID];
                    if (pCol.front.status === 'OCCUPIED' && pCol.front.isFaceUp) {
                        pCol.front.isOperational = true;
                    }
                })
            },
            turn: {
                order: TurnOrder.CONTINUE,
            },
            moves: { PrimaryAction, Pass },
            next: PHASES.COMMITMENT,
        },
        [PHASES.COMMITMENT]: {
            turn: {
                order: TurnOrder.CONTINUE,
            },
            moves: {
                Ship,
                Pass: ({ events }) => {
                    events.endTurn();
                    events.endPhase();
                }
            },
            next: PHASES.SUPPLY, // Loop back
        },
    },

    // Checking Overrun Passive at end of every move? 
    // Or handled within moves. Game specs say "immediately".
    // For simplicity, we can check it in a simplified way or inside moves.
};
