import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { LAYOUT } from '../UI/styles';
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

    // Interactive if selection logic is handled elsewhere (prop provided) or just a visual card
    const isInteractive = onClick !== undefined;

    const containerStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        position: 'relative',
        cursor: isInteractive ? 'pointer' : 'default',
        perspective: '1000px', // For potential 3D flips if we want later
    };

    const cardStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        background: isFaceUp ? (card.type === 'EVENT' ? '#552255' : '#444') : '#554444',
        border: selected ? '3px solid yellow' : '1px solid #777',
        borderRadius: LAYOUT.RADIUS,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: selected ? '0 0 10px yellow' : '0 2px 5px rgba(0,0,0,0.3)',
        transition: 'all 0.1s ease-in-out',
        padding: '5px',
        overflow: 'hidden',
    };

    // Zoomed Overlay for details
    const renderOverlay = () => {
        // Use a portal to escape the parent stacking context (transforms, overflows)
        return createPortal(
            <div style={{
                position: 'fixed',
                top: '50%', // Center vertically
                left: '50%', // Center horizontally
                transform: 'translate(-50%, -50%)', // Center magic
                zIndex: 9999,
                width: '30vh', // Scale relative to viewport
                aspectRatio: LAYOUT.CARD_ASPECT_RATIO, // Enforce same shape

                background: isFaceUp ? (card.type === 'EVENT' ? '#552255' : '#444') : '#554444',
                border: '2px solid white',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 0 50px rgba(0,0,0,0.9)', // Deep shadow to separate from background
                pointerEvents: 'none', // pass through hover
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                overflow: 'hidden' // Ensure content stays inside shape
            }}>
                <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>
                    {card.type === 'UNIT' ? `Unit: ${details?.name}` : `Event: ${details?.name}`}
                </div>
                {card.type === 'UNIT' && (
                    <div style={{ fontSize: '0.9em', color: '#ccc' }}>
                        Weight: {(details as any)?.weight}
                    </div>
                )}
                <div style={{
                    fontSize: '0.9em',
                    fontStyle: 'italic',
                    color: '#eee',
                    lineHeight: '1.4',
                    flex: 1, // fill remaining space
                    overflowY: 'auto' // scroll internal text if needed
                }}>
                    {(details as any)?.["card text"] || 'No description available'}
                </div>
                {!isFaceUp && <div>(Face Down)</div>}
            </div>,
            document.body
        );
    };

    return (
        <div
            style={containerStyle}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onClick}
        >
            <div style={cardStyle}>
                {!isFaceUp ? (
                    <div style={{ fontWeight: 'bold', fontSize: '0.8em', color: '#aaa' }}>BACK</div>
                ) : (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8em', fontWeight: 'bold', marginBottom: '4px', lineHeight: '1.1' }}>
                            {details?.name || 'Unknown'}
                        </div>
                        <div style={{ fontSize: '0.6em', opacity: 0.7 }}>{card.type}</div>
                    </div>
                )}
            </div>

            {/* Render Overlay if Hovered and FaceUp (or even FaceDown if we want to show it's hidden) */}
            {isHovered && isFaceUp && renderOverlay()}
        </div>
    );
};
