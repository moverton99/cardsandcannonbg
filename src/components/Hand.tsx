import React, { useState } from 'react';
import { BoardCard } from './BoardCard';
import { LAYOUT } from '../UI/styles';
import { PHASES, Card } from '../Game/types';

interface HandProps {
    hand: Card[];
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
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            opacity: isDisabled ? 0.5 : 1,
            pointerEvents: isDisabled ? 'none' : 'auto',
            width: '100%'
        }}>
            <div style={{
                display: 'flex',
                padding: '25px 10px 10px 10px',
                background: '#222',
                borderRadius: '10px',
                alignItems: 'flex-end',
                justifyContent: 'center',
                flexWrap: 'nowrap', // Keep single row
                width: '100%',
                gap: LAYOUT.GAP_SM,
                overflowX: 'auto', // Scroll if too narrow
                minHeight: 'auto', // Don't force height
                marginTop: '5px'
            }}>
                {hand.map((card, idx) => {
                    const isSelected = selectedCardIndex === idx;

                    return (
                        <div
                            key={card.id}
                            onMouseEnter={() => setHoveredIndex(idx)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            style={{
                                flex: '0 0 auto',
                                width: '12vh', // Responsive width based on viewport height (since hand is usually at bottom)
                                minWidth: '80px',
                                maxWidth: '140px',
                                aspectRatio: `${LAYOUT.CARD_ASPECT_RATIO}`,
                                transition: 'all 0.2s',
                                transform: isSelected ? 'translateY(-20px)' : (hoveredIndex === idx ? 'translateY(-10px)' : 'none'),
                                // Base z-index follows order (so right overlaps left), boosting selected or hovered card to top
                                zIndex: idx + (isSelected || hoveredIndex === idx ? 100 : 0),
                                position: 'relative' // Ensure z-index applies
                            }}
                        >
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
            {handLimitExceeded && isMyTurn && (currentPhase === PHASES.SUPPLY || currentPhase === PHASES.LOGISTICS) && (
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
