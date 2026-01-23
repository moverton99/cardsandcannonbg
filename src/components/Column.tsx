import React from 'react';
import { BoardCard } from './BoardCard';
import { LAYOUT } from '../UI/styles';
import { Slot, PHASES, PlayerID, Column as GameColumn, Card } from '../Game/types';

interface ColumnProps {
    colId: string;
    col: GameColumn;
    currentPhase: string;
    isMyTurn: boolean;
    effectivePlayerID: PlayerID;
    selectedCardIndex: number | null;
    hand: Card[];
    hasShipped: boolean;
    onAdvance: (colId: string) => void;
    onShip: (colId: string) => void;
    onPlayEvent: (idx: number) => void;
    shouldFlip?: boolean;
}

export const Column: React.FC<ColumnProps> = ({
    colId,
    col,
    currentPhase,
    isMyTurn,
    effectivePlayerID,
    selectedCardIndex,
    hand,
    hasShipped,
    onAdvance,
    onShip,
    onPlayEvent,
    shouldFlip = false
}) => {
    // P1 Pipeline
    const p1 = col.players['1'];
    // P0 Pipeline
    const p0 = col.players['0'];
    const myCol = col.players[effectivePlayerID as PlayerID];
    const isFull = myCol.rear.status === 'OCCUPIED' && myCol.reserve.status === 'OCCUPIED' && myCol.front.status === 'OCCUPIED';

    const selectedEventCard = selectedCardIndex !== null && hand[selectedCardIndex]?.type === 'EVENT' ? hand[selectedCardIndex] : null;

    const renderSlot = (slot: Slot, label: string) => {
        return (
            <div style={{
                // flex: 1 to fill vertical space in the column segment
                flex: 1,
                width: '100%',
                border: '2px dashed #444',
                borderRadius: LAYOUT.RADIUS,
                background: '#222',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px', // minimal padding
                minHeight: 0, // Allow shrinking if necessary
                overflow: 'hidden'
            }}>
                <small style={{
                    position: 'absolute',
                    top: '2px',
                    left: '2px',
                    fontSize: '0.6em',
                    color: '#888',
                    zIndex: 0,
                    pointerEvents: 'none'
                }}>{label}</small>

                {/* Container for the card to ensure it fits */}
                <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    zIndex: 1
                }}>
                    <div style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        aspectRatio: `${LAYOUT.CARD_ASPECT_RATIO}`,
                        width: 'auto',
                        height: 'auto'
                    }}>
                        {slot.status === 'OCCUPIED' && slot.card && (
                            <BoardCard card={slot.card} isFaceUp={slot.isFaceUp} />
                        )}
                    </div>
                </div>

                {slot.isOperational && <div style={{ position: 'absolute', bottom: '2px', right: '5px', color: 'yellow', fontSize: '0.6em', fontWeight: 'bold' }}>READY</div>}
            </div>
        );
    };

    const playerSectionStyle: React.CSSProperties = {
        flex: 3, // Each player takes roughly equal share
        display: 'flex',
        flexDirection: 'column',
        gap: LAYOUT.GAP_SM,
        padding: '5px',
        border: '1px dashed #333',
        width: '100%'
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            height: '100%',
            width: '100%',
            // If we are in a grid cell, we fill it.
        }}>

            {shouldFlip ? (
                <>
                    {/* Player 0 Area (Top) */}
                    <div style={{ ...playerSectionStyle, borderColor: 'blue' }}>
                        {renderSlot(p0.rear, 'P0 Rear')}
                        {renderSlot(p0.reserve, 'P0 Rsrv')}
                        {renderSlot(p0.front, 'P0 Front')}
                    </div>
                    {/* No Man's Land */}
                    <div style={{ flex: 0.2, minHeight: '10px', background: '#111', width: '100%', margin: '2px 0' }}></div>
                    {/* Player 1 Area (Bottom) */}
                    <div style={{ ...playerSectionStyle, borderColor: 'red' }}>
                        {renderSlot(p1.front, 'P1 Front')}
                        {renderSlot(p1.reserve, 'P1 Rsrv')}
                        {renderSlot(p1.rear, 'P1 Rear')}
                    </div>
                </>
            ) : (
                <>
                    {/* Player 1 Area (Top) */}
                    <div style={{ ...playerSectionStyle, borderColor: 'red' }}>
                        {renderSlot(p1.rear, 'P1 Rear')}
                        {renderSlot(p1.reserve, 'P1 Rsrv')}
                        {renderSlot(p1.front, 'P1 Front')}
                    </div>
                    {/* No Man's Land */}
                    <div style={{ flex: 0.2, minHeight: '10px', background: '#111', width: '100%', margin: '2px 0' }}></div>
                    {/* Player 0 Area (Bottom) */}
                    <div style={{ ...playerSectionStyle, borderColor: 'blue' }}>
                        {renderSlot(p0.front, 'P0 Front')}
                        {renderSlot(p0.reserve, 'P0 Rsrv')}
                        {renderSlot(p0.rear, 'P0 Rear')}
                    </div>
                </>
            )}

            {/* Controls Overlay? Or just at bottom? 
                If we put controls *inside* this column, they consume vertical space.
                Let's make them overlay or small footprint.
            */}
            {isMyTurn && (
                <div style={{
                    marginTop: '5px',
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    minHeight: '40px',
                    justifyContent: 'center'
                }}>
                    {currentPhase === PHASES.LOGISTICS && (
                        selectedEventCard ? (
                            <button
                                onClick={() => onPlayEvent(selectedCardIndex!)}
                                style={{ width: '100%', padding: '5px', background: '#800080', color: 'white', borderRadius: LAYOUT.RADIUS, border: 'none', cursor: 'pointer' }}
                            >
                                Event
                            </button>
                        ) : (
                            <button
                                onClick={() => onAdvance(colId)}
                                disabled={isFull}
                                style={{ width: '100%', padding: '5px', cursor: isFull ? 'default' : 'pointer' }}
                            >
                                Advance
                            </button>
                        )
                    )}

                    {currentPhase === PHASES.COMMITMENT && (
                        <button
                            onClick={() => onShip(colId)}
                            disabled={selectedCardIndex === null || myCol.rear.status === 'OCCUPIED' || hasShipped}
                            style={{ width: '100%', padding: '5px', cursor: 'pointer' }}
                        >
                            Ship
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
