export type PlayerID = '0' | '1';

// Derived from data files
export type UnitId = 'scout' | 'skirmishers' | 'line_infantry' | 'trench_raiders' | 'artillery_battery' | 'heavy_cannon';
export type EventId = 'forced_march' | 'supply_drop' | 'industrial_sabotage' | 'rapid_deployment' | 'battlefield_recon' | 'munitions_reserve';

export interface BaseCard {
    id: string; // Unique instance ID
}

export interface UnitCard extends BaseCard {
    type: 'UNIT';
    unitId: UnitId;
}

export interface EventCard extends BaseCard {
    type: 'EVENT';
    eventId: EventId;
}

export type Card = UnitCard | EventCard;

export type SlotStatus = 'EMPTY' | 'OCCUPIED';

export interface Slot {
    status: SlotStatus;
    card: Card | null;
    isFaceUp: boolean;
    isOperational: boolean; // Ready to act
    tokens: number; // Aim tokens, etc.
}

export interface PlayerColumn {
    rear: Slot;
    reserve: Slot;
    front: Slot;
}

export interface Column {
    id: string; // 'left', 'center', 'right'
    players: {
        [key in PlayerID]: PlayerColumn;
    };
}

export interface GameState {
    columns: {
        left: Column;
        center: Column;
        right: Column;
    };
    players: {
        [key in PlayerID]: {
            hand: Card[];
            deck: Card[];
            discardPile: Card[];
            breakthroughTokens: number;
        };
    };
    hasDrawnCard: boolean;
    lastDrawnCard: Card | null;
}

export const PHASES = {
    SUPPLY: 'supply',
    LOGISTICS: 'logistics',
    ARRIVAL: 'arrival',
    ENGAGEMENT: 'engagement',
    COMMITMENT: 'commitment',
} as const;

export const COLUMNS = ['left', 'center', 'right'] as const;
