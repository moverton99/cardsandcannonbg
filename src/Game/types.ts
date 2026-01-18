export type PlayerID = '0' | '1';

export interface Card {
    id: string;
    unitId: string; // Key from units.json
}

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
            breakthroughTokens: number;
        };
    };
}

export const PHASES = {
    SUPPLY: 'supply',
    LOGISTICS: 'logistics',
    ARRIVAL: 'arrival',
    ENGAGEMENT: 'engagement',
    COMMITMENT: 'commitment',
} as const;

export const COLUMNS = ['left', 'center', 'right'] as const;
