import React from 'react';
import { BoardCard } from './BoardCard';
import { CARD_STYLE } from '../UI/styles';
import { PHASES } from '../Game/types';

interface HandProps {
    hand: any[];
    selectedCardIndex: number | null;
    onSelectCard: (idx: number) => void;
    handLimitExceeded: boolean;
    isMyTurn: boolean;
    currentPhase: string;
    isDisabled: boolean;
    onConfirmDiscard: () => void;
}

export const Hand: React.FC<HandProps> = ({
    hand,
    selectedCardIndex,
    onSelectCard,
    handLimitExceeded,
    isMyTurn,
    currentPhase,
    isDisabled,
    onConfirmDiscard
}) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: isDisabled ? 0.5 : 1, pointerEvents: isDisabled ? 'none' : 'auto' }}>
            <div style={{ display: 'flex', marginTop: '20px', padding: '10px', background: '#222', borderRadius: '10px', minHeight: '140px', alignItems: 'flex-end' }}>
                {hand.map((card, idx) => {
                    const isSelected = selectedCardIndex === idx;

                    return (
                        <div key={card.id} style={{ margin: `0 ${CARD_STYLE.GAP / 2}px` }}>
                            <BoardCard
                                card={card}
                                isFaceUp={true}
                                selected={isSelected}
                                onClick={() => onSelectCard(idx)}
                            />
                        </div>
                    );
                })}
            </div>
            {handLimitExceeded && isMyTurn && currentPhase === PHASES.SUPPLY && (
                <div style={{ marginTop: '10px' }}>
                    <button
                        disabled={selectedCardIndex === null}
                        onClick={onConfirmDiscard}
                        style={{ padding: '10px 20px', background: '#aa0000', color: 'white', borderRadius: '5px', cursor: selectedCardIndex === null ? 'not-allowed' : 'pointer' }}
                    >
                        Confirm Discard Selection
                    </button>
                </div>
            )}
        </div>
    );
};
