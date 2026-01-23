import React from 'react';
import { BoardCard } from './BoardCard';
import { LAYOUT, EMPTY_CARD_SLOT_STYLE, COUNT_BADGE_STYLE } from '../UI/styles';

interface DeckPileProps {
    deckCount: number;
    canDraw: boolean;
    onDraw: () => void;
}

export const DeckPile: React.FC<DeckPileProps> = ({ deckCount, canDraw, onDraw }) => {
    const topCard: any = deckCount > 0 ? { type: 'UNIT', id: 'back', defId: 'back' } : null;

    return (
        <div
            onClick={() => canDraw && onDraw()}
            style={{
                position: 'relative',
                width: '100%',
                // height: 'auto', // Let aspect ratio drive height
                aspectRatio: `${LAYOUT.CARD_ASPECT_RATIO}`,
                cursor: canDraw ? 'pointer' : 'default',
                transform: canDraw ? 'scale(1.02)' : 'none', // reduced scale to avoid layout shift issues if tight
                transition: 'transform 0.2s'
            }}>

            {topCard ? (
                <div style={{ width: '100%', height: '100%' }}>
                    <BoardCard card={topCard} isFaceUp={false} />
                </div>
            ) : (
                <div style={EMPTY_CARD_SLOT_STYLE}>EMPTY</div>
            )}
            {canDraw && (
                <div style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    width: '100%',
                    height: '100%',
                    border: '2px solid yellow',
                    borderRadius: LAYOUT.RADIUS,
                    pointerEvents: 'none',
                    boxShadow: '0 0 10px yellow',
                    animation: 'pulse 1.5s infinite'
                }} />
            )}
            {deckCount > 0 && (
                <div style={COUNT_BADGE_STYLE}>
                    {deckCount}
                </div>
            )}
        </div>
    );
};
