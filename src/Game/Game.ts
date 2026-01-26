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

console.log("DEBUG: PHASES object:", PHASES);

const MAX_HAND_SIZE = RULES.constraints.hand_limit;

// --- Helper Functions ---

const createSlot = (): Slot => ({
    status: 'EMPTY',
    card: null,
    isFaceUp: false,
    isOperational: false,
    tokens: 0,
});

function getControlledFronts(G: GameState, pid: PlayerID): ColumnId[] {
    return COLUMNS.filter(id => {
        const pCol = G.columns[id].players[pid];
        const oppID = pid === '0' ? '1' : '0';
        const oCol = G.columns[id].players[oppID];
        // Control: Operational Asset at Front AND opponent has no Asset at Front.
        return pCol.front.status === 'OCCUPIED' && pCol.front.isOperational && oCol.front.status === 'EMPTY';
    });
}

function awardBreakthrough(G: GameState, pid: PlayerID, count: number = 1) {
    G.players[pid].breakthroughTokens += count;
}

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




function handleLogisticsEnd(G: GameState, ctx: any, pid: PlayerID) {
    VERBS.reveal_assets_that_entered_front(G, ctx, {}, pid);
    VERBS.resolve_activate(G, ctx, { scope: 'each_asset_that_entered_front' }, pid);

    G.assetsEnteredFront = [];
    VERBS.ready_assets(G, ctx, {}, pid);
}

const shouldSkipLogistics = (G: GameState, pid: PlayerID): boolean => {
    const player = G.players[pid];
    const hasEvents = player.hand.some(c => c.type === 'EVENT');
    const canMove = !G.hasMovedLogistics && hasMovementOptions(G, pid);
    console.log(`[Logistics] Player ${pid}: hasEvents=${hasEvents}, canMove=${canMove}, hasMovedLog=${G.hasMovedLogistics}`);
    return !hasEvents && !canMove;
};

function hasEngagementOptions(G: GameState, pid: PlayerID): boolean {
    const hasOpt = COLUMNS.some(id => {
        const pCol = G.columns[id as ColumnId].players[pid];
        return pCol.front.status === 'OCCUPIED' && pCol.front.isOperational;
    });
    console.log(`[Engagement] Player ${pid}: hasOptions=${hasOpt}`);
    return hasOpt;
}

function hasCommitmentOptions(G: GameState, pid: PlayerID): boolean {
    if (G.hasShipped) {
        console.log(`[Commitment] Player ${pid}: Already Shipped`);
        return false;
    }
    const player = G.players[pid];
    const hasUnits = player.hand.some(c => c.type === 'UNIT');
    const hasRearSlot = COLUMNS.some(id => G.columns[id as ColumnId].players[pid].rear.status === 'EMPTY');
    console.log(`[Commitment] Player ${pid}: hasUnits=${hasUnits}, hasRearSlot=${hasRearSlot}, handSize=${player.hand.length}`);
    return hasUnits && hasRearSlot;
}

const generateDeck = (random: any, ownerID: PlayerID): Card[] => {
    const deck: Card[] = [];

    if (!random) {
        console.error("random API is not available! Deck generation will fail/be non-deterministic.");
    }

    // Add Units
    Object.entries(deckData.deck.composition.units).forEach(([id, count]) => {
        for (let i = 0; i < count; i++) {
            deck.push({
                id: `unit_${id}_${random!.Number().toString(36).substr(2, 9)}`,
                type: 'UNIT',
                defId: id,
                ownerID
            });
        }
    });

    // Add Events
    Object.entries(deckData.deck.composition.events).forEach(([id, count]) => {
        for (let i = 0; i < count; i++) {
            deck.push({
                id: `event_${id}_${random!.Number().toString(36).substr(2, 9)}`,
                type: 'EVENT',
                defId: id,
                ownerID
            });
        }
    });

    // Shuffle (using boardgame.io deterministic shuffle)
    return random!.Shuffle(deck);
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
    enforce_hand_limit: (_G, _ctx, _params, _playerID) => {
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

                // DECISIVE BREACH CHECK
                if (G.frontsControlledStartTurn.includes(colId as string)) {
                    console.log(`[Breakthrough] Decisive Breach by Player ${playerID} in ${colId}`);
                    awardBreakthrough(G, playerID);
                }

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
                // DECISIVE BREACH CHECK
                if (G.frontsControlledStartTurn.includes(colId as string)) {
                    console.log(`[Breakthrough] Decisive Breach (Withdraw) by Player ${playerID} in ${colId}`);
                    awardBreakthrough(G, playerID);
                }

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
    },
    destroy_or_withdraw: (G, _ctx, params, playerID) => {
        const colId = params.contextColumnId;
        if (!colId) return;

        const oppID = playerID === '0' ? '1' : '0';
        const oppFront = G.columns[colId as keyof typeof G.columns].players[oppID].front;

        if (oppFront.status === 'OCCUPIED' && oppFront.card) {
            const unitDef = UNITS[oppFront.card.defId];
            if (unitDef) {
                if (unitDef.weight === 'Heavy') {
                    // Withdraw
                    G.players[oppID].hand.push(oppFront.card);
                    G.columns[colId as keyof typeof G.columns].players[oppID].front = createSlot();
                    checkOverrun(G, colId);
                } else {
                    // Destroy (Light or Medium)
                    G.players[oppID].discardPile.push(oppFront.card);
                    G.columns[colId as keyof typeof G.columns].players[oppID].front = createSlot();
                    checkOverrun(G, colId);
                }
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
    // ESCALATION CHECK
    const player = G.players[playerID];
    if (!player.hasResolvedHeavyPrimary && contextColumnId) {
        const pCol = G.columns[contextColumnId as keyof typeof G.columns].players[playerID];
        if (pCol.front.status === 'OCCUPIED' && pCol.front.card) {
            const unitDef = UNITS[pCol.front.card.defId];
            if (unitDef && unitDef.weight === 'Heavy') {
                console.log(`[Breakthrough] Escalation by Player ${playerID}`);
                awardBreakthrough(G, playerID);
                player.hasResolvedHeavyPrimary = true;
            }
        }
    }

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



const DiscardCard: Move<GameState> = ({ G, ctx, events }, cardIndex: number) => {
    const player = G.players[ctx.currentPlayer as PlayerID];
    if (cardIndex >= 0 && cardIndex < player.hand.length) {
        const [card] = player.hand.splice(cardIndex, 1);
        player.discardPile.push(card);
    }
    if (G.players[ctx.currentPlayer as PlayerID].hand.length <= MAX_HAND_SIZE) {
        events.endPhase();
    }
};

const PlayEvent: Move<GameState> = ({ G, ctx, events: _events }, cardIndex: number, columnId: string) => {
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
};

const Advance: Move<GameState> = ({ G, ctx, events: _events }, columnId: string) => {
    if (G.hasMovedLogistics) return INVALID_MOVE;
    VERBS.advance_column(G, ctx, { choose_column: true, columnId }, ctx.currentPlayer as PlayerID);
    G.hasMovedLogistics = true;
};

const Withdraw: Move<GameState> = ({ G, ctx, events: _events }, columnId: string) => {
    if (G.hasMovedLogistics) return INVALID_MOVE;
    VERBS.withdraw_from_front(G, ctx, { columnId, eligible_front_states: ["Exposed", "Operational"] }, ctx.currentPlayer as PlayerID);
    G.hasMovedLogistics = true;
};

const Deploy: Move<GameState> = ({ G, ctx, events }, columnId: string, cardIndex: number) => {
    console.log(`[Move: Ship] col=${columnId}, cardIdx=${cardIndex}, hasShipped=${G.hasShipped}`);
    if (G.hasShipped) {
        console.warn("[Move: Ship] Already shipped this turn");
        return INVALID_MOVE;
    }
    VERBS.deploy_from_hand(G, ctx, { columnId, cardIndex }, ctx.currentPlayer as PlayerID);
    G.hasShipped = true;
    events.endTurn();
};

const SetNextCard: Move<GameState> = ({ G }, cardId: string) => {
    G.nextCardId = cardId;
};

const GenericPrimaryAction: Move<GameState> = ({ G, ctx, events: _events }, columnId: string, choiceId?: string) => {
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
};

// --- Game Object ---

export const CardsAndCannon: Game<GameState> = {
    setup: ({ random }): GameState => {
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

        const p0Deck = generateDeck(random, '0');
        const p1Deck = generateDeck(random, '1');
        const STARTING_HAND_SIZE = deckData.deck.starting_hand_size;

        const p0Hand = p0Deck.splice(-STARTING_HAND_SIZE);
        const p1Hand = p1Deck.splice(-STARTING_HAND_SIZE);

        return {
            columns,
            players: {
                '0': { hand: p0Hand, deck: p0Deck, discardPile: [], breakthroughTokens: 0, hasResolvedHeavyPrimary: false },
                '1': { hand: p1Hand, deck: p1Deck, discardPile: [], breakthroughTokens: 0, hasResolvedHeavyPrimary: false },
            },
            hasDrawnCard: false,
            hasMovedLogistics: false,
            hasShipped: false,
            assetsEnteredFront: [],
            frontsControlledStartTurn: [],
        } as GameState;
    },

    endIf: ({ G }) => {
        for (const pid of ['0', '1'] as PlayerID[]) {
            // Win Condition: Breakthroughs (at least 2)
            if (G.players[pid].breakthroughTokens >= 2) {
                return { winner: pid };
            }

            // Win Condition: Front Control (at least 2 fronts)
            // Rules say "end_of_turn", but controlling 2 fronts is a dominant state.
            // In boardgame.io endIf is checked after every move anyway.
            if (getControlledFronts(G, pid).length >= 2) {
                return { winner: pid };
            }
        }
    },

    turn: {
        order: TurnOrder.DEFAULT,
        activePlayers: {
            currentPlayer: PHASES.SUPPLY
        },
        onBegin: ({ G, ctx, events: _events }) => {
            G.hasDrawnCard = false;
            G.hasShipped = false;
            G.hasMovedLogistics = false;

            const pid = ctx.currentPlayer as PlayerID;
            const oppID = pid === '0' ? '1' : '0';

            // Start of turn front control recording (for Decisive Breach)
            G.frontsControlledStartTurn = getControlledFronts(G, oppID);

            // COLLAPSE CHECK
            const opp = G.players[oppID];
            const hasAssets = COLUMNS.some(id => {
                const col = G.columns[id as ColumnId].players[oppID];
                return col.front.status === 'OCCUPIED' || col.reserve.status === 'OCCUPIED' || col.rear.status === 'OCCUPIED';
            });
            if (!hasAssets && opp.hand.length === 0) {
                console.log(`[Breakthrough] Collapse of Player ${oppID}`);
                awardBreakthrough(G, pid, 2); // Award double to win usually?
            }
        },
        stages: {
            [PHASES.SUPPLY]: {
                moves: {
                    DrawCard: ({ G, ctx, events }, amount: number = 1) => {
                        VERBS.draw_cards(G, ctx, { amount }, ctx.currentPlayer as PlayerID);
                        if (G.players[ctx.currentPlayer as PlayerID].hand.length <= MAX_HAND_SIZE) {
                            console.log("Hand check passed, setting stage to Logistics");
                            events.setStage(PHASES.LOGISTICS);
                            G.hasMovedLogistics = false;
                            if (shouldSkipLogistics(G, ctx.currentPlayer as PlayerID)) {
                                console.log("Auto-skipping Logistics");
                                handleLogisticsEnd(G, ctx, ctx.currentPlayer as PlayerID);
                                events.setStage(PHASES.ENGAGEMENT);
                                if (!hasEngagementOptions(G, ctx.currentPlayer as PlayerID)) {
                                    console.log("Auto-skipping Engagement");
                                    events.setStage(PHASES.COMMITMENT);
                                    if (!hasCommitmentOptions(G, ctx.currentPlayer as PlayerID)) {
                                        console.log("Auto-skipping Commitment");
                                        events.endTurn();
                                    }
                                }
                            }
                        }
                    },
                    DiscardCard,
                    SetNextCard,
                    Pass: ({ G, ctx, events }) => {
                        events.setStage(PHASES.LOGISTICS);
                        G.hasMovedLogistics = false;
                        if (shouldSkipLogistics(G, ctx.currentPlayer as PlayerID)) {
                            console.log("Auto-skipping Logistics");
                            handleLogisticsEnd(G, ctx, ctx.currentPlayer as PlayerID);
                            events.setStage(PHASES.ENGAGEMENT);
                            if (!hasEngagementOptions(G, ctx.currentPlayer as PlayerID)) {
                                console.log("Auto-skipping Engagement");
                                events.setStage(PHASES.COMMITMENT);
                                if (!hasCommitmentOptions(G, ctx.currentPlayer as PlayerID)) {
                                    console.log("Auto-skipping Commitment");
                                    events.endTurn();
                                }
                            }
                        }
                    }
                }
            },
            [PHASES.LOGISTICS]: {
                moves: {
                    Advance,
                    Withdraw,
                    PlayEvent,
                    SetNextCard,
                    DiscardCard,
                    Pass: ({ G, ctx, events }) => {
                        handleLogisticsEnd(G, ctx, ctx.currentPlayer as PlayerID);
                        events.setStage(PHASES.ENGAGEMENT);
                        if (!hasEngagementOptions(G, ctx.currentPlayer as PlayerID)) {
                            console.log("Auto-skipping Engagement");
                            events.setStage(PHASES.COMMITMENT);
                            if (!hasCommitmentOptions(G, ctx.currentPlayer as PlayerID)) {
                                console.log("Auto-skipping Commitment");
                                events.endTurn();
                            }
                        }
                    }
                }
            },
            [PHASES.ENGAGEMENT]: {
                moves: {
                    PrimaryAction: GenericPrimaryAction,
                    Pass: ({ G, ctx, events }) => {
                        events.setStage(PHASES.COMMITMENT);
                        if (!hasCommitmentOptions(G, ctx.currentPlayer as PlayerID)) {
                            console.log("Auto-skipping Commitment");
                            events.endTurn();
                        }
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
