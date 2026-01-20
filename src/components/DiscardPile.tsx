import React from 'react';
import { BoardCard } from './BoardCard';
import { CARD_STYLE, EMPTY_CARD_SLOT_STYLE, COUNT_BADGE_STYLE } from '../UI/styles';
import { Card } from '../Game/types';

interface DiscardPileProps {
    pile: Card[];
    pid: string;
    onOpen: (pid: string) => void;
}

export const DiscardPile: React.FC<DiscardPileProps> = ({ pile, pid, onOpen }) => {
    const topCard = pile.length > 0 ? pile[pile.length - 1] : null;

    return (
        <div
            onClick={() => pile.length > 0 && onOpen(pid)}
            style={{
                width: `${CARD_STYLE.WIDTH}px`,
                height: `${CARD_STYLE.HEIGHT}px`,
                cursor: pile.length > 0 ? 'pointer' : 'default',
                position: 'relative',
            }}
        >
            <small style={{ position: 'absolute', top: '-15px', fontSize: '0.8em', color: '#666', width: '100%', textAlign: 'center' }}>DISCARD</small>
            {topCard ? (
                <BoardCard card={topCard} isFaceUp={true} />
            ) : (
                <div style={EMPTY_CARD_SLOT_STYLE}>EMPTY</div>
            )}
            {pile.length > 0 && (
                <div style={COUNT_BADGE_STYLE}>
                    {pile.length}
                </div>
            )}
        </div>
    );
};
