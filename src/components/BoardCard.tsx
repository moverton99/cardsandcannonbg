import React, { useState } from 'react';
import { CARD_STYLE } from '../UI/styles';
import { getCardDetails } from '../UI/cardDetails';
import { Card } from '../Game/types';

export interface BoardCardProps {
    card: Card;
    isFaceUp: boolean;
    selected?: boolean;
    onClick?: () => void;
}

export const BoardCard: React.FC<BoardCardProps> = ({ card, isFaceUp, selected, onClick }) => {
    const [isHovered, setIsHovered] = useState(false);
    const details = getCardDetails(card);

    // If selected is controlled (boolean), disable internal hover
    const isInteractive = selected === undefined;
    const isExpanded = (selected === true) || isHovered;


    const style: React.CSSProperties = {
        width: isExpanded ? `${CARD_STYLE.SELECTED_WIDTH}px` : `${CARD_STYLE.WIDTH}px`,
        height: isExpanded ? `${CARD_STYLE.SELECTED_HEIGHT}px` : `${CARD_STYLE.HEIGHT}px`,
        background: isFaceUp ? (card.type === 'EVENT' ? '#552255' : '#444') : '#554444',
        border: isExpanded ? '3px solid yellow' : '1px solid #777',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: isExpanded ? 'flex-start' : 'center',
        transition: 'all 0.2s ease-in-out',
        cursor: 'pointer',
        // Hovering lifts absolute (popup), Selection lifts relative
        position: isHovered ? 'absolute' : 'relative',
        zIndex: isExpanded ? 100 : 1,
        textAlign: 'center',
        padding: isExpanded ? '15px' : '10px',
        boxShadow: isExpanded ? '0 10px 25px rgba(0,0,0,0.8)' : 'none',
        transform: isExpanded ? `translateY(${CARD_STYLE.SELECTED_LIFT}px)` : 'none',
        overflow: 'hidden',
    };

    return (
        <div
            onMouseEnter={() => isInteractive && setIsHovered(true)}
            onMouseLeave={() => isInteractive && setIsHovered(false)}
            onClick={onClick}
            style={style}
        >
            {!isFaceUp ? (
                <div style={{ fontWeight: 'bold' }}>BACK</div>
            ) : (
                <>
                    <div style={{ fontSize: isExpanded ? '0.85em' : '0.65em', fontWeight: 'bold', marginBottom: isExpanded ? '5px' : '0' }}>
                        {card.type === 'UNIT' ? `Unit: ${details?.name}` : `Event: ${details?.name}`}
                    </div>
                    {isExpanded ? (
                        <div style={{ width: '100%', textAlign: 'left' }}>
                            {card.type === 'UNIT' && (
                                <div style={{ fontSize: '0.65em', color: '#ccc', marginBottom: '8px' }}>
                                    Weight: {(details as any)?.weight}
                                </div>
                            )}
                            <div style={{
                                fontSize: '0.7em',
                                fontStyle: 'italic',
                                color: '#eee',
                                lineHeight: '1.4',
                                borderTop: '1px solid #666',
                                paddingTop: '8px',
                                marginTop: '4px'
                            }}>
                                {(details as any)?.["card text"] || 'No description available'}
                            </div>
                        </div>
                    ) : (
                        <div style={{ fontSize: '0.5em', opacity: 0.7 }}>{card.type}</div>
                    )}
                </>
            )}
        </div>
    );
};
