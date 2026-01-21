import { Game, Move, Ctx } from 'boardgame.io';
import { INVALID_MOVE, TurnOrder } from 'boardgame.io/core';
import { GameState, PHASES, COLUMNS, PlayerID, Card, Slot, ActionDef, UnitDef, EventDef, ColumnId } from './types';
import { RULES } from '../data/rules';
import deckData from '../data/deck.json';
import unitsData from '../data/units.json';
import eventsData from '../data/events.json';

const UNITS: Record<string, UnitDef> = {};
if ((unitsData as any).assets) {
    (unitsData as any).assets.forEach((u: UnitDef) => UNITS[u.id] = u);
}

const EVENTS: Record<string, EventDef> = {};
if ((eventsData as any).events) {
    (eventsData as any).events.forEach((e: EventDef) => EVENTS[e.id] = e);
}

const MAX_HAND_SIZE = RULES.constraints.hand_limit;

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
                defId: id
            });
        }
    });

    // Add Events
    Object.entries(deckData.deck.composition.events).forEach(([id, count]) => {
        for (let i = 0; i < count; i++) {
            deck.push({
                id: `event_${id}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'EVENT',
                defId: id
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

// --- Verb Implementations ---

type VerbFn = (G: GameState, ctx: Ctx, params: any, playerID: PlayerID) => void;

const VERBS: Record<string, VerbFn> = {
    draw_cards: (G, _ctx, params, playerID) => {
        const player = G.players[playerID];
        const amount = params.amount || 1;
        for (let i = 0; i < amount; i++) {
            if (player.deck.length > 0) {
                const card = player.deck.pop()!;
                player.hand.push(card);
                G.hasDrawnCard = true;
            }
        }
    },
    enforce_hand_limit: (G, _ctx, params, playerID) => {
        const player = G.players[playerID];
        const max = params.max || MAX_HAND_SIZE;
        while (player.hand.length > max) {
            const card = player.hand.pop()!;
            player.discardPile.push(card);
        }
    },
    advance_column: (G, _ctx, params, playerID) => {
        const colId = (params.choose_column && params.contextColumnId) ? params.contextColumnId : params.columnId;
        if (!colId) return;

        const col = G.columns[colId as keyof typeof G.columns];
        const pCol = col.players[playerID];

        // Reserve -> Front
        if (pCol.reserve.status === 'OCCUPIED' && pCol.front.status === 'EMPTY') {
            pCol.front = { ...pCol.reserve };
            pCol.reserve = createSlot();
            // Flag arrival
            if (pCol.front.card) {
                G.assetsEnteredFront.push(pCol.front.card.id);
            }
        }

        // Rear -> Reserve
        if (pCol.rear.status === 'OCCUPIED' && pCol.reserve.status === 'EMPTY') {
            pCol.reserve = { ...pCol.rear };
            pCol.rear = createSlot();
        }
    },
    withdraw_from_front: (G, _ctx, params, playerID) => {
        const colId = params.columnId;
        if (!colId) return;
        const col = G.columns[colId as keyof typeof G.columns];
        const pCol = col.players[playerID];

        if (pCol.front.status === 'OCCUPIED') {
            // Check eligibility (Exposed or Operational)
            if (!params.eligible_front_states ||
                (pCol.front.isFaceUp && !pCol.front.isOperational && params.eligible_front_states.includes('Exposed')) ||
                (pCol.front.isOperational && params.eligible_front_states.includes('Operational'))) {

                const card = pCol.front.card!;
                G.players[playerID].hand.push(card);
                pCol.front = createSlot();
                checkOverrun(G, colId);
            }
        }
    },
    reveal_assets_that_entered_front: (G, _ctx, _params, playerID) => {
        // Iterate all columns, check if card id is in assetsEnteredFront
        COLUMNS.forEach(id => {
            const colId = id as ColumnId;
            const pCol = G.columns[colId].players[playerID];
            if (pCol.front.status === 'OCCUPIED' && pCol.front.card && G.assetsEnteredFront.includes(pCol.front.card.id)) {
                pCol.front.isFaceUp = true;
                // result_state: Exposed (default for faceup at front)
            }
        });
    },
    resolve_activate: (G, ctx, params, playerID) => {
        // Find assets that entered front (if scope is 'each_asset_that_entered_front')
        if (params.scope === 'each_asset_that_entered_front') {
            COLUMNS.forEach(id => {
                const colId = id as ColumnId;
                const pCol = G.columns[colId].players[playerID];
                if (pCol.front.status === 'OCCUPIED' && pCol.front.card && G.assetsEnteredFront.includes(pCol.front.card.id)) {
                    const unitDef = UNITS[pCol.front.card.defId];
                    if (unitDef && unitDef.activate) {
                        resolveEffects(G, ctx, unitDef.activate.effects, playerID, colId);
                    }
                }
            });
        }
    },
    ready_assets: (G, _ctx, _params, playerID) => {
        COLUMNS.forEach(id => {
            const colId = id as ColumnId;
            const pCol = G.columns[colId].players[playerID];
            if (pCol.front.status === 'OCCUPIED' && pCol.front.isFaceUp) {
                pCol.front.isOperational = true;
            }
        });
    },
    deploy_from_hand: (G, _ctx, params, playerID) => {
        // Params: cardIndex, columnId from Move
        const cardIndex = params.cardIndex;
        const colId = params.columnId;
        const player = G.players[playerID];
        const card = player.hand[cardIndex];

        if (!card || card.type !== 'UNIT') return;

        const col = G.columns[colId as keyof typeof G.columns];
        const pCol = col.players[playerID];

        if (pCol.rear.status === 'EMPTY') {
            pCol.rear.status = 'OCCUPIED';
            pCol.rear.card = card;
            pCol.rear.isFaceUp = false;
            pCol.rear.isOperational = false;
            player.hand.splice(cardIndex, 1);
        }
    },
    // Passive/Effect Verbs
    reveal_asset: (G, _ctx, params, playerID) => {
        // Target handling is complex. Simplified:
        const target = params.target;
        if (target === 'opponent_face_down_asset' && params.location?.line === 'Reserve') {
            const oppID = playerID === '0' ? '1' : '0';
            // Search columns
            for (const id of COLUMNS) {
                const cid = id as ColumnId;
                const slot = G.columns[cid].players[oppID].reserve;
                if (slot.status === 'OCCUPIED' && !slot.isFaceUp) {
                    slot.isFaceUp = true;
                    break; // Just one
                }
            }
        }
    },
    discard_asset: (_G, _ctx, params, _playerID) => {
        if (params.target === 'self') {
            // Context needed
        }
    },
    Destroy: (G, _ctx, params, playerID) => {
        const colId = params.contextColumnId; // passed from resolveEffects
        if (colId) {
            const oppID = playerID === '0' ? '1' : '0';
            const oppFront = G.columns[colId as keyof typeof G.columns].players[oppID].front;
            if (oppFront.status === 'OCCUPIED') {
                const unitDef = UNITS[oppFront.card!.defId];
                if (params.allowed_target_weights && !params.allowed_target_weights.includes(unitDef.weight)) return;
                if (params.disallowed_target_weights && params.disallowed_target_weights.includes(unitDef.weight)) return;

                // Execute Destroy
                G.players[oppID].discardPile.push(oppFront.card!);
                G.columns[colId as keyof typeof G.columns].players[oppID].front = createSlot();
                checkOverrun(G, colId as string);
            }
        }
    },
    Withdraw: (G, _ctx, params, playerID) => {
        const colId = params.contextColumnId;
        if (colId) {
            const oppID = playerID === '0' ? '1' : '0';
            const oppFront = G.columns[colId as keyof typeof G.columns].players[oppID].front;
            if (oppFront.status === 'OCCUPIED') {
                G.players[oppID].hand.push(oppFront.card!);
                G.columns[colId as keyof typeof G.columns].players[oppID].front = createSlot();
                checkOverrun(G, colId as string);
            }
        }
    },
    add_preparation: (G, _ctx, params, playerID) => {
        if (params.target === 'self' && params.contextColumnId) {
            const pCol = G.columns[params.contextColumnId as keyof typeof G.columns].players[playerID];
            if (pCol.front.status === 'OCCUPIED') {
                pCol.front.tokens += (params.amount || 1);
            }
        }
    },
    remove_preparation: (G, _ctx, params, playerID) => {
        if (params.target === 'self' && params.contextColumnId) {
            const pCol = G.columns[params.contextColumnId as keyof typeof G.columns].players[playerID];
            if (pCol.front.status === 'OCCUPIED') {
                if (params.amount === 'all') pCol.front.tokens = 0;
                else pCol.front.tokens = Math.max(0, pCol.front.tokens - (params.amount || 0));
            }
        }
    }
};

// Simple Overrun Check
function checkOverrun(G: GameState, colId: string) {
    // Passive rule: If front cleared, Reserve -> Front
    // Both players?
    ['0', '1'].forEach(pid => {
        const pCol = G.columns[colId as keyof typeof G.columns].players[pid as PlayerID];
        if (pCol.front.status === 'EMPTY' && pCol.reserve.status === 'OCCUPIED') {
            pCol.front = { ...pCol.reserve };
            pCol.reserve = createSlot();
            pCol.front.isFaceUp = true; // "result_state: Exposed"
        }
    });
}

const resolveEffects = (G: GameState, ctx: Ctx, effects: ActionDef[], playerID: PlayerID, contextColumnId?: string) => {
    effects.forEach(def => {
        const verb = def.action;
        const fn = VERBS[verb as string];
        if (fn) {
            // merge params with context
            const params = { ...def.params, contextColumnId };
            fn(G, ctx, params, playerID);
        } else {
            console.warn(`Verb not implemented: ${verb}`);
        }
    });
};


// --- Moves ---

const DrawCard: Move<GameState> = ({ G, ctx }, amount: number = 1) => {
    VERBS.draw_cards(G, ctx, { amount }, ctx.currentPlayer as PlayerID);
};

const DiscardCard: Move<GameState> = ({ G, ctx }, cardIndex: number) => {
    const player = G.players[ctx.currentPlayer as PlayerID];
    if (cardIndex >= 0 && cardIndex < player.hand.length) {
        const [card] = player.hand.splice(cardIndex, 1);
        player.discardPile.push(card);
    }
};

const PlayEvent: Move<GameState> = ({ G, ctx }, cardIndex: number, columnId: string) => {
    const playerID = ctx.currentPlayer as PlayerID;
    const player = G.players[playerID];
    const card = player.hand[cardIndex];
    if (!card || card.type !== 'EVENT') return INVALID_MOVE;

    const eventDef = EVENTS[card.defId];
    if (!eventDef) return INVALID_MOVE;

    // Resolve Effects
    resolveEffects(G, ctx, eventDef.effects, playerID, columnId);

    // Discard
    player.hand.splice(cardIndex, 1);
    player.discardPile.push(card);
};

const Advance: Move<GameState> = ({ G, ctx }, columnId: string) => {
    VERBS.advance_column(G, ctx, { choose_column: true, columnId }, ctx.currentPlayer as PlayerID);
    // Auto-end phase in Logistics if move taken? 
    // rules.yaml says "choose_one_or_none" options.
    // If we take Advance, we consume the option.
    // Ideally we track "hasMoved" state. For now, we cycle phase or let UI handle "End Phase".
};

const Withdraw: Move<GameState> = ({ G, ctx }, columnId: string) => {
    VERBS.withdraw_from_front(G, ctx, { columnId, eligible_front_states: ["Exposed", "Operational"] }, ctx.currentPlayer as PlayerID);
};

const Deploy: Move<GameState> = ({ G, ctx, events }, columnId: string, cardIndex: number) => {
    if (G.hasShipped) return INVALID_MOVE;
    VERBS.deploy_from_hand(G, ctx, { columnId, cardIndex }, ctx.currentPlayer as PlayerID);
    G.hasShipped = true;
    events.endTurn();
};

const GenericPrimaryAction: Move<GameState> = ({ G, ctx }, columnId: string) => {
    const playerID = ctx.currentPlayer as PlayerID;
    const pCol = G.columns[columnId as keyof typeof G.columns].players[playerID];
    if (pCol.front.status !== 'OCCUPIED' || !pCol.front.isOperational) return INVALID_MOVE;

    const unitDef = UNITS[pCol.front.card!.defId];
    if (!unitDef || !unitDef.primary_action) return INVALID_MOVE;

    // Resolve
    if (unitDef.primary_action.effects) {
        resolveEffects(G, ctx, unitDef.primary_action.effects, playerID, columnId);
    }
    // TODO: Handle Choice

    // Mark action used? Per asset limit 1.
    // Logic to mark asset as "acted".
    pCol.front.isOperational = false; // Simple "tapped" logic for now? RULES don't explicitly say they exhaust, but usually implied or "per_asset_limit: 1".
};

// --- Game Object ---

export const CardsAndCannon: Game<GameState> = {
    setup: (): GameState => {
        const columns: any = {};
        COLUMNS.forEach(colId => {
            const id = colId as ColumnId;
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
            hasShipped: false,
            assetsEnteredFront: [],
            frontsControlledStartTurn: [],
        };
    },

    endIf: ({ G }) => {
        if (G.players['0'].breakthroughTokens >= 3) {
            return { winner: '0' };
        }
        if (G.players['1'].breakthroughTokens >= 3) {
            return { winner: '1' };
        }
    },

    turn: {
        order: TurnOrder.DEFAULT,
        onBegin: ({ G, events }) => {
            G.hasDrawnCard = false; // Original SUPPLY onBegin
            G.hasShipped = false; // Original COMMITMENT onBegin
            events.setActivePlayers({ currentPlayer: PHASES.SUPPLY });
        },
        stages: {
            [PHASES.SUPPLY]: {
                moves: {
                    DrawCard,
                    DiscardCard,
                    Confirm: ({ events }) => {
                        events.setStage(PHASES.LOGISTICS);
                    }
                }
            },
            [PHASES.LOGISTICS]: {
                moves: {
                    Advance,
                    Withdraw,
                    PlayEvent,
                    Pass: ({ G, ctx, events }) => {
                        // Arrival Logic (prev onBegin)
                        G.assetsEnteredFront = [];
                        VERBS.reveal_assets_that_entered_front(G, ctx, {}, ctx.currentPlayer as PlayerID);
                        VERBS.resolve_activate(G, ctx, { scope: 'each_asset_that_entered_front' }, ctx.currentPlayer as PlayerID);
                        events.setStage(PHASES.ARRIVAL);
                    }
                }
            },
            [PHASES.ARRIVAL]: {
                moves: {
                    Pass: ({ G, ctx, events }) => {
                        // Engagement Logic (prev onBegin)
                        G.assetsEnteredFront = []; // Clean up after Arrival (prev onEnd)
                        VERBS.ready_assets(G, ctx, {}, ctx.currentPlayer as PlayerID);
                        events.setStage(PHASES.ENGAGEMENT);
                    }
                }
            },
            [PHASES.ENGAGEMENT]: {
                moves: {
                    PrimaryAction: GenericPrimaryAction,
                    Pass: ({ events }) => {
                        events.setStage(PHASES.COMMITMENT);
                    }
                }
            },
            [PHASES.COMMITMENT]: {
                moves: {
                    Ship: Deploy,
                    Pass: ({ events }) => {
                        events.endTurn();
                    }
                }
            }
        }
    }
};
