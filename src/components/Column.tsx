import React from 'react';
import { BoardCard } from './BoardCard';
import { CARD_STYLE } from '../UI/styles';
import { Slot, PHASES, PlayerID } from '../Game/types';

interface ColumnProps {
    colId: string;
    col: any;
    currentPhase: string;
    isMyTurn: boolean;
    effectivePlayerID: PlayerID;
    selectedCardIndex: number | null;
    hand: any[];
    onAdvance: (colId: string) => void;
    onShip: (colId: string) => void;
    onPassLogistics: () => void;
    onPlayEvent: (idx: number) => void;
}

export const Column: React.FC<ColumnProps> = ({
    colId,
    col,
    currentPhase,
    isMyTurn,
    effectivePlayerID,
    selectedCardIndex,
    hand,
    onAdvance,
    onShip,
    onPassLogistics,
    onPlayEvent
}) => {
    // P1 Pipeline
    const p1 = col.players['1'];
    // P0 Pipeline
    const p0 = col.players['0'];
    const myCol = col.players[effectivePlayerID as PlayerID];
    const isFull = myCol.rear.status === 'OCCUPIED' && myCol.reserve.status === 'OCCUPIED' && myCol.front.status === 'OCCUPIED';

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

            {/* Player 1 Area */}
            <div style={{ border: '1px dashed red', padding: '5px' }}>
                {renderSlot(p1.rear, 'P1 Rear')}
                {renderSlot(p1.reserve, 'P1 Rsrv')}
                {renderSlot(p1.front, 'P1 Front')}
            </div>

            {/* No Man's Land / Engagement Line */}
            <div style={{ height: '20px', background: '#000', width: '100%' }}></div>

            {/* Player 0 Area */}
            <div style={{ border: '1px dashed blue', padding: '5px' }}>
                {renderSlot(p0.front, 'P0 Front')}
                {renderSlot(p0.reserve, 'P0 Rsrv')}
                {renderSlot(p0.rear, 'P0 Rear')}
            </div>

            {/* Controls */}
            {isMyTurn && (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                    {currentPhase === PHASES.LOGISTICS && (
                        <button onClick={() => onAdvance(colId)} disabled={isFull}>Adv</button>
                    )}

                    {currentPhase === PHASES.LOGISTICS && colId === 'center' && (
                        <button
                            onClick={onPassLogistics}
                            style={{
                                marginTop: '10px',
                                padding: '8px 25px',
                                background: '#444',
                                color: 'white',
                                border: '1px solid #666',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '0.8em',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            PASS LOGISTICS
                        </button>
                    )}

                    {currentPhase === PHASES.LOGISTICS && selectedCardIndex !== null && (
                        hand[selectedCardIndex]?.type === 'EVENT' ? (
                            <button onClick={() => onPlayEvent(selectedCardIndex)}>Play Event</button>
                        ) : null
                    )}
                    {currentPhase === PHASES.COMMITMENT && (
                        <button onClick={() => onShip(colId)} disabled={selectedCardIndex === null || isFull}>Ship</button>
                    )}
                </div>
            )}
        </div>
    );
};
