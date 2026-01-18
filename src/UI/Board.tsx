import React, { useState } from 'react';
import { BoardProps } from 'boardgame.io/react';
import { GameState, Slot, COLUMNS, PHASES } from '../Game/types';

interface CardsAndCannonBoardProps extends BoardProps<GameState> { }

export const Board: React.FC<CardsAndCannonBoardProps> = ({ ctx, G, moves, playerID }) => {
    const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);

    const isMyTurn = ctx.currentPlayer === playerID;
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
                width: '80px',
                height: '100px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: slot.status === 'OCCUPIED' ? (slot.isFaceUp ? '#446644' : '#554444') : '#333',
                margin: '5px'
            }}>
                <small>{label}</small>
                {slot.status === 'OCCUPIED' && (
                    <div>{slot.isFaceUp ? slot.card?.unitId : 'Back'}</div>
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
                        {currentPhase === PHASES.LOGISTICS && (
                            <>
                                <button onClick={() => handleAdvance(colId)}>Adv</button>
                                <button onClick={() => moves.Pass()}>Pass</button>
                            </>
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
        if (!playerID) return null;
        const hand = G.players[playerID as keyof typeof G.players].hand;
        return (
            <div style={{ display: 'flex', marginTop: '20px', padding: '10px', background: '#222' }}>
                {hand.map((card, idx) => (
                    <div
                        key={card.id}
                        onClick={() => setSelectedCardIndex(idx)}
                        style={{
                            border: selectedCardIndex === idx ? '2px solid yellow' : '1px solid #fff',
                            margin: '5px',
                            padding: '10px',
                            cursor: 'pointer',
                            background: '#444'
                        }}
                    >
                        {card.unitId}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
            <div style={{ marginBottom: '10px' }}>
                Phase: <strong>{currentPhase}</strong> | Player: <strong>{ctx.currentPlayer}</strong>
                {currentPhase === PHASES.SUPPLY && isMyTurn && <button onClick={() => moves.CheckHandLimit([])}>Confirm Hand</button>}
                {currentPhase === PHASES.ARRIVAL && isMyTurn && <button onClick={() => events?.endPhase()}>End Arrival</button>}
                {currentPhase === PHASES.ENGAGEMENT && isMyTurn && <button onClick={() => events?.endPhase()}>End Engagement</button>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'row' }}>
                {COLUMNS.map(id => renderColumn(id))}
            </div>

            {renderHand()}
        </div>
    );
};
