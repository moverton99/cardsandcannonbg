import React from 'react';
import { BoardCard } from './BoardCard';
import { LAYOUT } from '../UI/styles';
import { Slot, PHASES, PlayerID, Column as GameColumn, Card } from '../Game/types';
import { getCardDetails } from '../UI/cardDetails';

interface ColumnProps {
    colId: string;
    col: GameColumn;
    currentPhase: string;
    isMyTurn: boolean;
    effectivePlayerID: PlayerID;
    selectedCardIndex: number | null;
    hand: Card[];
    hasShipped: boolean;
    hasMovedLogistics: boolean;
    onAdvance: (colId: string) => void;
    onShip: (colId: string) => void;
    onPlayEvent: (idx: number) => void;
    onPrimaryAction: (colId: string, choiceId?: string) => void;
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
    hasMovedLogistics,
    onAdvance,
    onShip,
    onPlayEvent,
    onPrimaryAction,
    shouldFlip = false
}) => {
    // P1 Pipeline
    const p1 = col.players['1'];
    // P0 Pipeline
    const p0 = col.players['0'];
    const myCol = col.players[effectivePlayerID as PlayerID];

    const selectedEventCard = selectedCardIndex !== null && hand[selectedCardIndex]?.type === 'EVENT' ? hand[selectedCardIndex] : null;

    // Helper to get my front unit details
    const myFrontCard = myCol.front.card;
    const myFrontDetails = myFrontCard ? getCardDetails(myFrontCard) : null;
    const oppID = effectivePlayerID === '0' ? '1' : '0';
    const oppCol = col.players[oppID];
    const canEngage = isMyTurn && currentPhase === PHASES.ENGAGEMENT && myCol.front.status === 'OCCUPIED' && myCol.front.isOperational && oppCol.front.status === 'OCCUPIED';

    const canAdvanceInColumn = (myCol.rear.status === 'OCCUPIED' && myCol.reserve.status === 'EMPTY') ||
        (myCol.reserve.status === 'OCCUPIED' && myCol.front.status === 'EMPTY');

    const advanceDisabled = hasMovedLogistics || !canAdvanceInColumn;

    const renderSlot = (slot: Slot, label: string, ownerPid: PlayerID) => {
        const canViewDetails = effectivePlayerID === ownerPid;
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
                        maxHeight: '90%',
                        aspectRatio: `${LAYOUT.CARD_ASPECT_RATIO}`,
                        width: 'auto',
                        height: '90%'
                    }}>
                        {slot.status === 'OCCUPIED' && slot.card && (
                            <BoardCard card={slot.card} isFaceUp={slot.isFaceUp} canViewDetails={canViewDetails} />
                        )}
                    </div>
                </div>

                {slot.status === 'OCCUPIED' && label.toLowerCase().includes('front') && (
                    <div
                        title={slot.isOperational ? 'Operational' : 'Exposed'}
                        style={{
                            position: 'absolute',
                            bottom: '5px',
                            right: '5px',
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: slot.isOperational ? '#22c55e' : '#eab308', // Green for ready, Yellow otherwise
                            border: '1px solid rgba(0,0,0,0.5)',
                            boxShadow: slot.isOperational ? '0 0 5px #22c55e' : 'none',
                            zIndex: 10
                        }}
                    />
                )}
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
                        {renderSlot(p0.rear, 'P0 Rear', '0')}
                        {renderSlot(p0.reserve, 'P0 Rsrv', '0')}
                        {renderSlot(p0.front, 'P0 Front', '0')}
                    </div>
                    {/* No Man's Land */}
                    <div style={{ flex: 0.2, minHeight: '10px', background: '#111', width: '100%', margin: '2px 0' }}></div>
                    {/* Player 1 Area (Bottom) */}
                    <div style={{ ...playerSectionStyle, borderColor: 'red' }}>
                        {renderSlot(p1.front, 'P1 Front', '1')}
                        {renderSlot(p1.reserve, 'P1 Rsrv', '1')}
                        {renderSlot(p1.rear, 'P1 Rear', '1')}
                    </div>
                </>
            ) : (
                <>
                    {/* Player 1 Area (Top) */}
                    <div style={{ ...playerSectionStyle, borderColor: 'red' }}>
                        {renderSlot(p1.rear, 'P1 Rear', '1')}
                        {renderSlot(p1.reserve, 'P1 Rsrv', '1')}
                        {renderSlot(p1.front, 'P1 Front', '1')}
                    </div>
                    {/* No Man's Land */}
                    <div style={{ flex: 0.2, minHeight: '10px', background: '#111', width: '100%', margin: '2px 0' }}></div>
                    {/* Player 0 Area (Bottom) */}
                    <div style={{ ...playerSectionStyle, borderColor: 'blue' }}>
                        {renderSlot(p0.front, 'P0 Front', '0')}
                        {renderSlot(p0.reserve, 'P0 Rsrv', '0')}
                        {renderSlot(p0.rear, 'P0 Rear', '0')}
                    </div>
                </>
            )}

            {/* Controls Overlay */}
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
                                disabled={advanceDisabled}
                                style={{ width: '100%', padding: '5px', cursor: advanceDisabled ? 'default' : 'pointer' }}
                            >
                                Advance
                            </button>
                        )
                    )}

                    {canEngage && myFrontDetails && 'primary_action' in myFrontDetails && myFrontDetails.primary_action && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {myFrontDetails.primary_action.choice ? (
                                myFrontDetails.primary_action.choice.options.map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => onPrimaryAction(colId, opt.id)}
                                        style={{ width: '100%', padding: '5px', background: '#882222', color: 'white', cursor: 'pointer' }}
                                    >
                                        {opt.id}
                                    </button>
                                ))
                            ) : (
                                <button
                                    onClick={() => onPrimaryAction(colId)}
                                    style={{ width: '100%', padding: '5px', background: '#882222', color: 'white', cursor: 'pointer' }}
                                >
                                    Engage
                                </button>
                            )}
                        </div>
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
