import React, { useState } from 'react';
import { BoardProps } from 'boardgame.io/react';
import { GameState, Slot, COLUMNS, PHASES, PlayerID } from '../Game/types';
import unitData from '../data/units.json';
import eventData from '../data/events.json';

interface CardsAndCannonBoardProps extends BoardProps<GameState> { }

const CARD_STYLE = {
    WIDTH: 80,
    HEIGHT: 100,
    SELECTED_WIDTH: 143,
    SELECTED_HEIGHT: 182,
    SELECTED_LIFT: -25,
    GAP: 10,
};

export const Board: React.FC<CardsAndCannonBoardProps> = ({ ctx, G, moves, playerID, events }) => {
    const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);

    const effectivePlayerID = playerID || ctx.currentPlayer;
    const isMyTurn = playerID ? (ctx.currentPlayer === playerID) : true;
    const currentPhase = ctx.phase;

    const handleAdvance = (colId: string) => {
        moves.Advance(colId);
    };

    const handleShip = (colId: string) => {
        if (selectedCardIndex !== null) {
            moves.Ship(colId, selectedCardIndex);
            setSelectedCardIndex(null);
        }
    };

    const renderSlot = (slot: Slot, label: string) => {
        return (
            <div style={{
                border: '1px solid #777',
                width: `${CARD_STYLE.WIDTH}px`,
                height: `${CARD_STYLE.HEIGHT}px`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: slot.status === 'OCCUPIED' ? (slot.isFaceUp ? '#446644' : '#554444') : '#333',
                margin: '5px'
            }}>
                <small>{label}</small>
                {slot.status === 'OCCUPIED' && (
                    <div>{slot.isFaceUp ?
                        (slot.card?.type === 'UNIT' ? slot.card.unitId : 'Event?')
                        : 'Back'}</div>
                )}
                {slot.isOperational && <div style={{ color: 'yellow' }}>Ready</div>}
            </div>
        );
    };

    const renderColumn = (colId: string) => {
        const col = G.columns[colId as keyof typeof G.columns];
        // We want to render P1 at top (looking down?) or P0 at bottom?
        // Let's render P1's slots at top (Rear -> Front) and P0's at bottom (Front -> Rear)
        // to simulate the "meeting in the middle".

        // P1 Pipeline
        const p1 = col.players['1'];
        // P0 Pipeline
        const p0 = col.players['0'];

        return (
            <div key={colId} style={{ display: 'flex', flexDirection: 'column', margin: '0 10px', alignItems: 'center' }}>
                <h3>{colId.toUpperCase()}</h3>

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
                    <div style={{ marginTop: '10px' }}>
                        {currentPhase === PHASES.SUPPLY && (
                            <button onClick={() => moves.CheckHandLimit([])}>Confirm Supply</button>
                        )}
                        {currentPhase === PHASES.LOGISTICS && (
                            <>
                                <button onClick={() => handleAdvance(colId)}>Adv</button>
                                <button onClick={() => moves.Pass()}>Pass</button>
                            </>
                        )}
                        {currentPhase === PHASES.LOGISTICS && selectedCardIndex !== null && (
                            G.players[effectivePlayerID as PlayerID].hand[selectedCardIndex]?.type === 'EVENT' ? (
                                <button onClick={() => {
                                    moves.PlayEvent(selectedCardIndex);
                                    setSelectedCardIndex(null);
                                }}>Play Event</button>
                            ) : null
                        )}
                        {currentPhase === PHASES.COMMITMENT && (
                            <button onClick={() => handleShip(colId)} disabled={selectedCardIndex === null}>Ship</button>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderHand = () => {
        const hand = G.players[effectivePlayerID as keyof typeof G.players].hand;
        return (
            <div style={{ display: 'flex', marginTop: '20px', padding: '10px', background: '#222', borderRadius: '10px', minHeight: '140px', alignItems: 'flex-end' }}>
                {hand.map((card, idx) => {
                    const isSelected = selectedCardIndex === idx;
                    const details = card.type === 'UNIT' ? (unitData as any)[card.unitId] : (eventData as any)[card.eventId];

                    return (
                        <div
                            key={card.id}
                            onClick={() => setSelectedCardIndex(idx)}
                            style={{
                                border: isSelected ? '3px solid yellow' : '1px solid #777',
                                margin: `0 ${CARD_STYLE.GAP / 2}px`,
                                padding: isSelected ? '15px' : '10px',
                                cursor: 'pointer',
                                background: card.type === 'EVENT' ? '#552255' : '#444',
                                width: isSelected ? `${CARD_STYLE.SELECTED_WIDTH}px` : `${CARD_STYLE.WIDTH}px`,
                                height: isSelected ? `${CARD_STYLE.SELECTED_HEIGHT}px` : `${CARD_STYLE.HEIGHT}px`,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: isSelected ? 'flex-start' : 'center',
                                transition: 'all 0.2s ease-in-out',
                                transform: isSelected ? `translateY(${CARD_STYLE.SELECTED_LIFT}px)` : 'none',
                                boxShadow: isSelected ? '0 5px 15px rgba(255,255,0,0.3)' : 'none',
                                borderRadius: '8px',
                                position: 'relative',
                                zIndex: isSelected ? 10 : 1,
                                textAlign: 'center'
                            }}
                        >
                            <div style={{ fontSize: isSelected ? '0.9em' : '0.8em', fontWeight: 'bold', marginBottom: isSelected ? '5px' : '0' }}>
                                {details?.name || (card.type === 'UNIT' ? card.unitId : card.eventId)}
                            </div>
                            <div style={{ fontSize: '0.6em', opacity: 0.8, marginBottom: isSelected ? '10px' : '0' }}>
                                {card.type} {card.type === 'UNIT' && isSelected ? `(${details.weight})` : ''}
                            </div>

                            {isSelected && (
                                <div style={{ width: '100%', textAlign: 'left', overflow: 'hidden' }}>
                                    {card.type === 'UNIT' && details.activate && (
                                        <div style={{ fontSize: '0.65em', marginBottom: '4px' }}>
                                            <strong style={{ color: 'yellow' }}>Act:</strong> {details.activate.length > 20 ? details.activate.substring(0, 17) + '...' : details.activate}
                                        </div>
                                    )}
                                    {card.type === 'UNIT' && details.primary && (
                                        <div style={{ fontSize: '0.65em', marginBottom: '4px' }}>
                                            <strong style={{ color: 'cyan' }}>Pri:</strong> {details.primary.length > 20 ? details.primary.substring(0, 17) + '...' : details.primary}
                                        </div>
                                    )}
                                    <p style={{ fontSize: '0.7em', fontStyle: 'italic', margin: '5px 0 0 0', lineHeight: '1.2' }}>
                                        {details.description}
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };



    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
            <div style={{ marginBottom: '10px' }}>
                Phase: <strong>{currentPhase}</strong> | Player: <strong>{ctx.currentPlayer}</strong>
                {currentPhase === PHASES.SUPPLY && isMyTurn && <button onClick={() => moves.CheckHandLimit([])}>Confirm Hand</button>}
                {currentPhase === PHASES.ARRIVAL && isMyTurn && <button onClick={() => events && events.endPhase && events.endPhase()}>End Arrival</button>}
                {currentPhase === PHASES.ENGAGEMENT && isMyTurn && <button onClick={() => events && events.endPhase && events.endPhase()}>End Engagement</button>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'row' }}>
                    {COLUMNS.map(id => renderColumn(id))}
                </div>
                {renderHand()}
            </div>
        </div>
    );
};
