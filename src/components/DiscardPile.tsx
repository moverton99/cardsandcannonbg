import React from 'react';
import { BoardCard } from './BoardCard';
import { LAYOUT, EMPTY_CARD_SLOT_STYLE, COUNT_BADGE_STYLE } from '../UI/styles';
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
                width: '100%',
                aspectRatio: `${LAYOUT.CARD_ASPECT_RATIO}`,
                cursor: pile.length > 0 ? 'pointer' : 'default',
                position: 'relative',
            }}
        >
            <small style={{ position: 'absolute', top: '-15px', fontSize: '0.8em', color: '#666', width: '100%', textAlign: 'center' }}>DISCARD</small>
            {topCard ? (
                <div style={{ width: '100%', height: '100%' }}>
                    <BoardCard card={topCard} isFaceUp={true} />
                </div>
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
