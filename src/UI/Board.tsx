import React from 'react';
import { BoardProps } from 'boardgame.io/react';
import { GameState, COLUMNS, PHASES, PlayerID } from '../Game/types';
import { DeckPile } from '../components/DeckPile';
import { DiscardPile } from '../components/DiscardPile';
import { DiscardOverlay } from '../components/DiscardOverlay';
import { Column } from '../components/Column';
import { Hand } from '../components/Hand';
import { useBoardUI } from '../hooks/useBoardUI';

interface CardsAndCannonBoardProps extends BoardProps<GameState> { }





export const Board: React.FC<CardsAndCannonBoardProps> = ({ ctx, G, moves, playerID }) => {
    const {
        selectedCardIndex,
        setSelectedCardIndex,
        viewingDiscardPile,
        setViewingDiscardPile,
        effectivePlayerID,
        isMyTurn,
        currentPhase,
        me,
        handLimitExceeded
    } = useBoardUI({ G, ctx, playerID });

    const handleAdvance = (colId: string) => {
        moves.Advance(colId);
    };

    const handleShip = (colId: string) => {
        if (selectedCardIndex !== null) {
            moves.Ship(colId, selectedCardIndex);
            setSelectedCardIndex(null);
        }
    };







    const renderColumn = (colId: string) => {
        return (
            <Column
                key={colId}
                colId={colId}
                col={G.columns[colId as keyof typeof G.columns]}
                currentPhase={currentPhase}
                isMyTurn={isMyTurn}
                effectivePlayerID={effectivePlayerID as PlayerID}
                selectedCardIndex={selectedCardIndex}
                hand={G.players[effectivePlayerID as PlayerID].hand}
                hasShipped={G.hasShipped}
                onAdvance={handleAdvance}
                onShip={handleShip}
                onPassLogistics={() => moves.Pass()}
                onPlayEvent={(idx) => {
                    moves.PlayEvent(idx);
                    setSelectedCardIndex(null);
                }}
            />
        );
    };





    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>


            <div style={{ display: 'flex', flexDirection: 'row', gap: '40px', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'row' }}>
                    {COLUMNS.map(id => renderColumn(id))}
                </div>

                {/* SIDELOAD UI (Decks and Discards) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '50px' }}>
                    {/* Player 1 Sideload */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', padding: '10px', border: '1px solid #444', borderRadius: '10px' }}>
                        <div style={{ fontSize: '0.7em', color: 'red', fontWeight: 'bold' }}>P1 ASSETS</div>
                        <DeckPile
                            deckCount={G.players['1'].deck.length}
                            canDraw={currentPhase === PHASES.SUPPLY && isMyTurn && effectivePlayerID === '1' && !G.hasDrawnCard}
                            onDraw={() => moves.DrawCard()}
                        />
                        <DiscardPile
                            pile={G.players['1'].discardPile}
                            pid='1'
                            onOpen={() => setViewingDiscardPile('1')}
                        />
                    </div>

                    {/* Player 0 Sideload */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', padding: '10px', border: '1px solid #444', borderRadius: '10px' }}>
                        <div style={{ fontSize: '0.7em', color: 'blue', fontWeight: 'bold' }}>P0 ASSETS</div>
                        <DiscardPile
                            pile={G.players['0'].discardPile}
                            pid='0'
                            onOpen={() => setViewingDiscardPile('0')}
                        />
                        <DeckPile
                            deckCount={G.players['0'].deck.length}
                            canDraw={currentPhase === PHASES.SUPPLY && isMyTurn && effectivePlayerID === '0' && !G.hasDrawnCard}
                            onDraw={() => moves.DrawCard()}
                        />
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: '15px', marginTop: '20px' }}>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    padding: '10px',
                    background: '#333',
                    borderRadius: '8px',
                    marginBottom: '0px',
                    minWidth: '150px',
                    opacity: viewingDiscardPile !== null ? 0.5 : 1,
                    pointerEvents: viewingDiscardPile !== null ? 'none' : 'auto'
                }}>
                    {currentPhase === PHASES.SUPPLY && isMyTurn && (
                        <>
                            {!G.hasDrawnCard ? (
                                <button
                                    onClick={() => moves.DrawCard()}
                                    style={{
                                        color: 'yellow',
                                        fontSize: '0.9em',
                                        fontWeight: 'bold',
                                        animation: 'flash 1s infinite alternate',
                                        background: 'none',
                                        border: '1px solid yellow',
                                        padding: '5px 10px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    DRAW A CARD
                                </button>
                            ) : (
                                <>
                                    {handLimitExceeded ? (
                                        <div style={{ color: '#ff4444', fontSize: '0.8em', marginBottom: '5px' }}>
                                            Discard required: {me.hand.length - 7}
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => moves.Confirm()}
                                            style={{ padding: '8px 12px', cursor: 'pointer', background: '#4d4', color: '#000', fontWeight: 'bold' }}
                                        >
                                            Confirm Supply
                                        </button>
                                    )}
                                </>
                            )}
                        </>
                    )}
                    {currentPhase === PHASES.ARRIVAL && isMyTurn && <button style={{ padding: '8px 12px', cursor: 'pointer' }} onClick={() => moves.Pass()}>End Arrival</button>}
                    {currentPhase === PHASES.ENGAGEMENT && isMyTurn && <button style={{ padding: '8px 12px', cursor: 'pointer' }} onClick={() => moves.Pass()}>End Engagement</button>}
                    {currentPhase === PHASES.COMMITMENT && isMyTurn && <button style={{ padding: '8px 12px', cursor: 'pointer', background: '#444', color: '#eee' }} onClick={() => moves.Pass()}>Skip Deployment</button>}
                </div>
                <Hand
                    hand={me.hand}
                    selectedCardIndex={selectedCardIndex}
                    onSelectCard={setSelectedCardIndex}
                    handLimitExceeded={handLimitExceeded}
                    isMyTurn={isMyTurn}
                    currentPhase={currentPhase}
                    isDisabled={viewingDiscardPile !== null}
                    onConfirmDiscard={() => {
                        if (selectedCardIndex !== null) {
                            moves.DiscardCard(selectedCardIndex);
                            setSelectedCardIndex(null);
                        }
                    }}
                />
            </div>

            <div style={{ marginTop: '20px', textAlign: 'center', color: '#aaa', fontSize: '0.9em' }}>
                <div>Phase: <strong style={{ color: '#fff' }}>{currentPhase.toUpperCase()}</strong></div>
                <div style={{ marginTop: '5px' }}>Current Player: <strong style={{ color: '#fff' }}>{ctx.currentPlayer === '0' ? 'PLAYER 0 (BLUE)' : 'PLAYER 1 (RED)'}</strong></div>
            </div>

            {/* Discard Carousel Popup */}
            {viewingDiscardPile !== null && (
                <DiscardOverlay
                    pid={viewingDiscardPile}
                    pile={G.players[viewingDiscardPile].discardPile}
                    onClose={() => setViewingDiscardPile(null)}
                />
            )}

            <style>{`
                @keyframes pulse {
                    0% { opacity: 0.5; box-shadow: 0 0 5px yellow; }
                    50% { opacity: 1; box-shadow: 0 0 20px yellow; }
                    100% { opacity: 0.5; box-shadow: 0 0 5px yellow; }
                }
                @keyframes flash {
                    from { opacity: 0.5; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
};
