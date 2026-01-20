import React from 'react';
import { BoardCard } from './BoardCard';
import { CARD_STYLE, EMPTY_CARD_SLOT_STYLE, COUNT_BADGE_STYLE } from '../UI/styles';

interface DeckPileProps {
    deckCount: number;
    canDraw: boolean;
    onDraw: () => void;
}

export const DeckPile: React.FC<DeckPileProps> = ({ deckCount, canDraw, onDraw }) => {
    const topCard = deckCount > 0 ? { type: 'UNIT', id: 'back' } : null;

    return (
        <div
            onClick={() => canDraw && onDraw()}
            style={{
                position: 'relative',
                width: `${CARD_STYLE.WIDTH}px`,
                height: `${CARD_STYLE.HEIGHT}px`,
                cursor: canDraw ? 'pointer' : 'default',
                transform: canDraw ? 'scale(1.05)' : 'none',
                transition: 'transform 0.2s'
            }}>

            {topCard ? (
                <BoardCard card={topCard} isFaceUp={false} />
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
                    borderRadius: '8px',
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
