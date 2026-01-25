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

function hasMovementOptions(G: GameState, pid: PlayerID): boolean {
    const canAdvance = COLUMNS.some(id => {
        const pCol = G.columns[id as ColumnId].players[pid];
        return (pCol.rear.status === 'OCCUPIED' && pCol.reserve.status === 'EMPTY') ||
            (pCol.reserve.status === 'OCCUPIED' && pCol.front.status === 'EMPTY');
    });
    const canWithdraw = COLUMNS.some(id => {
        const pCol = G.columns[id as ColumnId].players[pid];
        return pCol.front.status === 'OCCUPIED' && (pCol.front.isFaceUp || pCol.front.isOperational);
    });
    return canAdvance || canWithdraw;
}

function hasEngagementOptions(G: GameState, pid: PlayerID): boolean {
    return COLUMNS.some(id => {
        const pCol = G.columns[id as ColumnId].players[pid];
        return pCol.front.status === 'OCCUPIED' && pCol.front.isOperational;
    });
}

function hasCommitmentOptions(G: GameState, pid: PlayerID): boolean {
    if (G.hasShipped) return false;
    const player = G.players[pid];
    const hasUnits = player.hand.some(c => c.type === 'UNIT');
    const hasRearSlot = COLUMNS.some(id => G.columns[id as ColumnId].players[pid].rear.status === 'EMPTY');
    return hasUnits && hasRearSlot;
}

function handleLogisticsEnd(G: GameState, ctx: any, pid: PlayerID) {
    VERBS.reveal_assets_that_entered_front(G, ctx, {}, pid);
    VERBS.resolve_activate(G, ctx, { scope: 'each_asset_that_entered_front' }, pid);

    G.assetsEnteredFront = [];
    VERBS.ready_assets(G, ctx, {}, pid);
}

function checkAutoAdvance(G: GameState, ctx: any, events: any) {
    const pid = ctx.currentPlayer as PlayerID;
    let currentStage = ctx.activePlayers?.[pid] || ctx.phase;

    // Use a loop to handle multiple skips in a single move/event call.
    // Note: events.setStage is not immediate in ctx, so we track 'currentStage' locally.
    while (true) {
        if (currentStage === PHASES.SUPPLY) {
            // Mandatory draw must happen before skip
            if (G.hasDrawnCard && G.players[pid].hand.length <= MAX_HAND_SIZE) {
                events.setStage(PHASES.LOGISTICS);
                G.hasMovedLogistics = false;
                currentStage = PHASES.LOGISTICS;
                continue;
            }
        } else if (currentStage === PHASES.LOGISTICS) {
            const player = G.players[pid];
            const hasEvents = player.hand.some(c => c.type === 'EVENT');
            const canMove = !G.hasMovedLogistics && hasMovementOptions(G, pid);
            if (!hasEvents && !canMove) {
                handleLogisticsEnd(G, ctx, pid);
                events.setStage(PHASES.ENGAGEMENT);
                currentStage = PHASES.ENGAGEMENT;
                continue;
            }
        } else if (currentStage === PHASES.ENGAGEMENT) {
            if (!hasEngagementOptions(G, pid)) {
                events.setStage(PHASES.COMMITMENT);
                currentStage = PHASES.COMMITMENT;
                continue;
            }
        } else if (currentStage === PHASES.COMMITMENT) {
            if (!hasCommitmentOptions(G, pid)) {
                events.endTurn();
            }
        }
        break;
    }
}

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
            if (G.nextCardId) {
                const idx = player.deck.findIndex(c => c.defId === G.nextCardId);
                if (idx !== -1) {
                    const card = player.deck.splice(idx, 1)[0];
                    player.hand.push(card);
                    G.nextCardId = undefined;
                    G.hasDrawnCard = true;
                    continue;
                }
                G.nextCardId = undefined;
            }

            if (player.deck.length > 0) {
                const card = player.deck.pop()!;
                player.hand.push(card);
                G.hasDrawnCard = true;
            }
        }
    },
    enforce_hand_limit: (G, _ctx, params, playerID) => {
        // const player = G.players[playerID];
        // const max = params.max || MAX_HAND_SIZE;
        // while (player.hand.length > max) {
        //     const card = player.hand.pop()!;
        //     player.discardPile.push(card);
        // }
        // TODO: Enforce via UI blocking or check
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
    move_asset: (G, _ctx, params, playerID) => {
        const colId = params.contextColumnId;
        if (!colId) return;
        const col = G.columns[colId as keyof typeof G.columns];
        const pCol = col.players[playerID];

        if (params.target === 'your_asset_in_reserve' && params.to_line === 'Front') {
            if (pCol.reserve.status === 'OCCUPIED' && pCol.front.status === 'EMPTY') {
                pCol.front = { ...pCol.reserve };
                pCol.reserve = createSlot();
                if (params.result_state === 'Exposed') pCol.front.isFaceUp = true;
                // Add to assetsEnteredFront if needed for activate resolve
                if (pCol.front.card) {
                    G.assetsEnteredFront.push(pCol.front.card.id);
                }
            }
        }
    },
    discard_asset: (G, _ctx, params, playerID) => {
        const colId = params.contextColumnId;
        const oppID = playerID === '0' ? '1' : '0';

        if (params.target === 'self' && colId) {
            // Usually used in unit activate effects
            // Logic to find which slot 'self' is in... simplified to front for now
            const pCol = G.columns[colId as keyof typeof G.columns].players[playerID];
            if (pCol.front.status === 'OCCUPIED') {
                G.players[playerID].discardPile.push(pCol.front.card!);
                pCol.front = createSlot();
                checkOverrun(G, colId);
            }
        } else if (params.target === 'opponent_face_down_asset' && colId) {
            const pCol = G.columns[colId as keyof typeof G.columns].players[oppID];
            const lines = params.location?.line_in || ['Rear', 'Reserve', 'Front'];
            for (const line of lines) {
                const slotKey = line.toLowerCase() as keyof typeof pCol;
                const slot = pCol[slotKey] as Slot;
                if (slot.status === 'OCCUPIED' && !slot.isFaceUp) {
                    G.players[oppID].discardPile.push(slot.card!);
                    pCol[slotKey] = createSlot() as any;
                    if (slotKey === 'front') checkOverrun(G, colId);
                    break; // Just one
                }
            }
        }
    },
    reveal_assets: (G, _ctx, params, playerID) => {
        const colId = params.contextColumnId;
        const oppID = playerID === '0' ? '1' : '0';
        if (!colId) return;

        const pCol = G.columns[colId as keyof typeof G.columns].players[oppID];
        const lines = params.location?.line_in || ['Rear', 'Reserve', 'Front'];
        lines.forEach((line: string) => {
            const slotKey = line.toLowerCase() as keyof typeof pCol;
            const slot = pCol[slotKey] as Slot;
            if (slot.status === 'OCCUPIED') {
                slot.isFaceUp = true;
            }
        });
    },
    resolve_activate: (G, ctx, params, playerID) => {
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
        } else if (params.scope === 'moved_asset_if_it_has_activate') {
            const colId = params.contextColumnId;
            if (colId) {
                const pCol = G.columns[colId as keyof typeof G.columns].players[playerID];
                if (pCol.front.status === 'OCCUPIED' && pCol.front.card) {
                    const unitDef = UNITS[pCol.front.card.defId];
                    if (unitDef && unitDef.activate) {
                        resolveEffects(G, ctx, unitDef.activate.effects, playerID, colId);
                    }
                }
            }
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
    reveal_asset: (G, _ctx, params, playerID) => {
        const target = params.target;
        if (target === 'opponent_face_down_asset' && params.location?.line === 'Reserve') {
            const oppID = playerID === '0' ? '1' : '0';
            for (const id of COLUMNS) {
                const cid = id as ColumnId;
                const slot = G.columns[cid].players[oppID].reserve;
                if (slot.status === 'OCCUPIED' && !slot.isFaceUp) {
                    slot.isFaceUp = true;
                    break;
                }
            }
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
        if (params.target === 'your_heavy_asset_at_front' && params.contextColumnId) {
            const pCol = G.columns[params.contextColumnId as keyof typeof G.columns].players[playerID];
            if (pCol.front.status === 'OCCUPIED' && UNITS[pCol.front.card!.defId].weight === 'Heavy') {
                pCol.front.tokens += (params.amount || 1);
            }
        } else if (params.target === 'self' && params.contextColumnId) {
            const pCol = G.columns[params.contextColumnId as keyof typeof G.columns].players[playerID];
            if (pCol.front.status === 'OCCUPIED') {
                pCol.front.tokens += (params.amount || 1);
            }
        }
    },
    remove_preparation: (G, _ctx, params, playerID) => {
        if (params.target === 'opponent_asset_at_same_front' && params.contextColumnId) {
            const oppID = playerID === '0' ? '1' : '0';
            const pCol = G.columns[params.contextColumnId as keyof typeof G.columns].players[oppID];
            if (pCol.front.status === 'OCCUPIED') {
                if (params.amount === 'all') pCol.front.tokens = 0;
                else pCol.front.tokens = Math.max(0, pCol.front.tokens - (params.amount || 0));
            }
        } else if (params.target === 'self' && params.contextColumnId) {
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

const DrawCard: Move<GameState> = ({ G, ctx, events }, amount: number = 1) => {
    VERBS.draw_cards(G, ctx, { amount }, ctx.currentPlayer as PlayerID);
    checkAutoAdvance(G, ctx, events);
};

const DiscardCard: Move<GameState> = ({ G, ctx, events }, cardIndex: number) => {
    const player = G.players[ctx.currentPlayer as PlayerID];
    if (cardIndex >= 0 && cardIndex < player.hand.length) {
        const [card] = player.hand.splice(cardIndex, 1);
        player.discardPile.push(card);
    }
    checkAutoAdvance(G, ctx, events);
};

const PlayEvent: Move<GameState> = ({ G, ctx, events }, cardIndex: number, columnId: string) => {
    const playerID = ctx.currentPlayer as PlayerID;
    const player = G.players[playerID];
    const card = player.hand[cardIndex];
    if (!card || card.type !== 'EVENT') return INVALID_MOVE;

    const eventDef = EVENTS[card.defId];
    if (!eventDef) return INVALID_MOVE;

    // Discard FIRST to avoid counting towards hand limit during effects
    player.hand.splice(cardIndex, 1);
    player.discardPile.push(card);

    // Resolve Effects
    resolveEffects(G, ctx, eventDef.effects, playerID, columnId);

    checkAutoAdvance(G, ctx, events);
};

const Advance: Move<GameState> = ({ G, ctx, events }, columnId: string) => {
    if (G.hasMovedLogistics) return INVALID_MOVE;
    VERBS.advance_column(G, ctx, { choose_column: true, columnId }, ctx.currentPlayer as PlayerID);
    G.hasMovedLogistics = true;
    checkAutoAdvance(G, ctx, events);
};

const Withdraw: Move<GameState> = ({ G, ctx, events }, columnId: string) => {
    if (G.hasMovedLogistics) return INVALID_MOVE;
    VERBS.withdraw_from_front(G, ctx, { columnId, eligible_front_states: ["Exposed", "Operational"] }, ctx.currentPlayer as PlayerID);
    G.hasMovedLogistics = true;
    checkAutoAdvance(G, ctx, events);
};

const Deploy: Move<GameState> = ({ G, ctx, events }, columnId: string, cardIndex: number) => {
    if (G.hasShipped) return INVALID_MOVE;
    VERBS.deploy_from_hand(G, ctx, { columnId, cardIndex }, ctx.currentPlayer as PlayerID);
    G.hasShipped = true;
    events.endTurn();
};

const SetNextCard: Move<GameState> = ({ G }, cardId: string) => {
    G.nextCardId = cardId;
};

const GenericPrimaryAction: Move<GameState> = ({ G, ctx, events }, columnId: string, choiceId?: string) => {
    const playerID = ctx.currentPlayer as PlayerID;
    const pCol = G.columns[columnId as keyof typeof G.columns].players[playerID];
    if (pCol.front.status !== 'OCCUPIED' || !pCol.front.isOperational) return INVALID_MOVE;

    const unitDef = UNITS[pCol.front.card!.defId];
    if (!unitDef || !unitDef.primary_action) return INVALID_MOVE;

    // Handle Choice
    if (unitDef.primary_action.choice) {
        if (!choiceId) return INVALID_MOVE; // Choice required
        const option = unitDef.primary_action.choice.options.find(o => o.id === choiceId);
        if (!option) return INVALID_MOVE;
        resolveEffects(G, ctx, option.effects, playerID, columnId);
    }
    // Handle Simple Effects
    else if (unitDef.primary_action.effects) {
        resolveEffects(G, ctx, unitDef.primary_action.effects, playerID, columnId);
    } else {
        return INVALID_MOVE;
    }

    pCol.front.isOperational = false;
    checkAutoAdvance(G, ctx, events);
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
            hasMovedLogistics: false,
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
        onBegin: ({ G, ctx, events }) => {
            G.hasDrawnCard = false;
            G.hasShipped = false;
            G.hasMovedLogistics = false;

            const pid = ctx.currentPlayer as PlayerID;
            let initialStage: string = PHASES.SUPPLY;

            events.setActivePlayers({ currentPlayer: initialStage });

            // If we landed in Commitment and have no options, end turn immediately
            if (initialStage === PHASES.COMMITMENT && !hasCommitmentOptions(G, pid)) {
                events.endTurn();
            }
        },
        stages: {
            [PHASES.SUPPLY]: {
                moves: {
                    DrawCard,
                    DiscardCard,
                    SetNextCard,
                    Pass: ({ G, ctx, events }) => {
                        events.setStage(PHASES.LOGISTICS);
                        G.hasMovedLogistics = false;
                        checkAutoAdvance(G, { ...ctx, activePlayers: { [ctx.currentPlayer]: PHASES.LOGISTICS } }, events);
                    }
                }
            },
            [PHASES.LOGISTICS]: {
                moves: {
                    Advance,
                    Withdraw,
                    PlayEvent,
                    SetNextCard,
                    DiscardCard, // Added to allow obeying hand limits during Supply Drop
                    Pass: ({ G, ctx, events }) => {
                        handleLogisticsEnd(G, ctx, ctx.currentPlayer as PlayerID);
                        events.setStage(PHASES.ENGAGEMENT);
                        checkAutoAdvance(G, { ...ctx, activePlayers: { [ctx.currentPlayer]: PHASES.ENGAGEMENT } }, events);
                    }
                }
            },
            [PHASES.ENGAGEMENT]: {
                moves: {
                    PrimaryAction: GenericPrimaryAction,
                    Pass: ({ G, ctx, events }) => {
                        events.setStage(PHASES.COMMITMENT);
                        checkAutoAdvance(G, { ...ctx, activePlayers: { [ctx.currentPlayer]: PHASES.COMMITMENT } }, events);
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
