export type PlayerID = '0' | '1';

// --- Data Driven Types ---

export type Weight = 'Light' | 'Medium' | 'Heavy';
export type Line = 'Rear' | 'Reserve' | 'Front';
export type ColumnId = 'West' | 'Central' | 'East'; // Per rules.yaml
export type SlotStatus = 'EMPTY' | 'OCCUPIED';

export type Verb =
    | 'draw_cards'
    | 'enforce_hand_limit'
    | 'play_event'
    | 'advance_column'
    | 'withdraw_from_front'
    | 'reveal_assets_that_entered_front'
    | 'resolve_activate'
    | 'ready_assets'
    | 'resolve_primary_action'
    | 'deploy_from_hand'
    | 'move_asset'
    | 'reveal_asset'
    | 'reveal_assets'
    | 'discard_asset'
    | 'Destroy'
    | 'Withdraw'
    | 'add_preparation'
    | 'remove_preparation'
    | 'has_preparation'
    | 'choose_effect'
    | 'triggered_effect'
    | 'choose_one_or_none';

export interface ActionDef {
    action: Verb | string; // Start with strict verbs, allow string for flexibility during dev
    params?: any;
    target?: string;
    location?: any;
    amount?: number | 'all';
    notes?: string;
    optional?: boolean;
    options?: any[];
    [key: string]: any; // Allow other props from JSON
}

export interface ActivateDef {
    timing: string;
    effects: ActionDef[];
}

export interface PrimaryActionDef {
    timing: string;
    require_state: string;
    effects?: ActionDef[];
    choice?: {
        chooser: string;
        options: { id: string; effects: ActionDef[] }[];
    };
}

export interface UnitDef {
    id: string;
    name: string;
    weight: Weight;
    "card text"?: string; // Matches JSON key
    activate: ActivateDef | null;
    primary_action: PrimaryActionDef | null;
    fire?: any; // For artillery special case
}

export interface EventDef {
    id: string;
    name: string;
    "card text"?: string; // Matches JSON key
    play_timing: { phase: string };
    effects: ActionDef[];
}

// --- Game State ---

export interface Card {
    id: string; // Instance ID
    type: 'UNIT' | 'EVENT';
    defId: string; // Link to JSON definition (unitId or eventId)
}

export interface Slot {
    status: SlotStatus;
    card: Card | null;
    isFaceUp: boolean;
    isOperational: boolean;
    tokens: number; // Preparation tokens
}

export interface PlayerColumn {
    rear: Slot;
    reserve: Slot;
    front: Slot;
}

export interface Column {
    id: ColumnId;
    players: {
        [key in PlayerID]: PlayerColumn;
    };
}

export interface GameState {
    columns: {
        West: Column;
        Central: Column;
        East: Column;
    };
    players: {
        [key in PlayerID]: {
            hand: Card[];
            deck: Card[];
            discardPile: Card[];
            breakthroughTokens: number;
        };
    };
    // Tracking for turn logic
    hasDrawnCard: boolean;
    hasMovedLogistics: boolean;
    hasShipped: boolean;
    assetsEnteredFront: string[]; // Track IDs of assets that entered front this turn for Arrival phase
    frontsControlledStartTurn: string[]; // For breakthrough condition
    nextCardId?: string; // DEBUG: Force next card drawn
}

export const PHASES = {
    SUPPLY: 'supply',
    LOGISTICS: 'logistics',
    ARRIVAL: 'arrival',
    ENGAGEMENT: 'engagement',
    COMMITMENT: 'commitment',
} as const;

export const COLUMNS: ColumnId[] = ['West', 'Central', 'East'];
