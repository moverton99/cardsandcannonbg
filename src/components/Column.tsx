import React from 'react';
import { BoardCard } from './BoardCard';
import { CARD_STYLE } from '../UI/styles';
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
                border: '2px dashed #444',
                width: `${CARD_STYLE.WIDTH + CARD_STYLE.BOARD_SLOT_PADDING * 2}px`,
                height: `${CARD_STYLE.HEIGHT + CARD_STYLE.BOARD_SLOT_PADDING * 2}px`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#222',
                margin: '5px',
                position: 'relative',
                borderRadius: '10px'
            }}>
                <small style={{ position: 'absolute', top: '-15px', fontSize: '0.6em', color: '#888' }}>{label}</small>
                {slot.status === 'OCCUPIED' && slot.card && (
                    <BoardCard card={slot.card} isFaceUp={slot.isFaceUp} />
                )}
                {slot.isOperational && <div style={{ position: 'absolute', bottom: '-15px', color: 'yellow', fontSize: '0.6em' }}>READY</div>}
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', margin: '0 10px', alignItems: 'center' }}>

            {shouldFlip ? (
                <>
                    {/* Player 0 Area (Top when flipped) */}
                    <div style={{ border: '1px dashed blue', padding: '5px' }}>
                        {renderSlot(p0.rear, 'P0 Rear')}
                        {renderSlot(p0.reserve, 'P0 Rsrv')}
                        {renderSlot(p0.front, 'P0 Front')}
                    </div>
                    {/* No Man's Land */}
                    <div style={{ height: '20px', background: '#000', width: '100%' }}></div>
                    {/* Player 1 Area (Bottom when flipped) */}
                    <div style={{ border: '1px dashed red', padding: '5px' }}>
                        {renderSlot(p1.front, 'P1 Front')}
                        {renderSlot(p1.reserve, 'P1 Rsrv')}
                        {renderSlot(p1.rear, 'P1 Rear')}
                    </div>
                </>
            ) : (
                <>
                    {/* Player 1 Area (Top when not flipped) */}
                    <div style={{ border: '1px dashed red', padding: '5px' }}>
                        {renderSlot(p1.rear, 'P1 Rear')}
                        {renderSlot(p1.reserve, 'P1 Rsrv')}
                        {renderSlot(p1.front, 'P1 Front')}
                    </div>
                    {/* No Man's Land */}
                    <div style={{ height: '20px', background: '#000', width: '100%' }}></div>
                    {/* Player 0 Area (Bottom when not flipped) */}
                    <div style={{ border: '1px dashed blue', padding: '5px' }}>
                        {renderSlot(p0.front, 'P0 Front')}
                        {renderSlot(p0.reserve, 'P0 Rsrv')}
                        {renderSlot(p0.rear, 'P0 Rear')}
                    </div>
                </>
            )}

            {/* Controls */}
            {isMyTurn && (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                    {currentPhase === PHASES.LOGISTICS && (
                        selectedEventCard ? (
                            <button
                                onClick={() => onPlayEvent(selectedCardIndex!)}
                                style={{
                                    padding: '5px 10px',
                                    background: '#800080',
                                    color: 'white',
                                    border: '1px solid #a020a0',
                                    borderRadius: '5px',
                                    cursor: 'pointer'
                                }}
                            >
                                Play Event
                            </button>
                        ) : (
                            <button onClick={() => onAdvance(colId)} disabled={isFull}>Adv</button>
                        )
                    )}

                    {currentPhase === PHASES.COMMITMENT && (
                        <button onClick={() => onShip(colId)} disabled={selectedCardIndex === null || myCol.rear.status === 'OCCUPIED' || hasShipped}>Ship</button>
                    )}
                </div>
            )}
        </div>
    );
};
