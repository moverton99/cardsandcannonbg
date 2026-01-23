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







    const shouldFlip = ctx.currentPlayer === '1';
    const displayedColumns = shouldFlip ? [...COLUMNS].reverse() : COLUMNS;

    const DRAW_BUTTON_STYLE: React.CSSProperties = {
        color: 'yellow',
        fontSize: '0.9em',
        fontWeight: 'bold',
        animation: 'flash 1s infinite alternate',
        background: 'none',
        border: '1px solid yellow',
        padding: '5px 10px',
        cursor: 'pointer',
        marginTop: '-15px',
        zIndex: 10
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
                    moves.PlayEvent(idx, colId);
                    setSelectedCardIndex(null);
                }}
                shouldFlip={shouldFlip}
            />
        );
    };

    const renderSideload = (pid: PlayerID) => {
        const isP1 = pid === '1';
        const color = isP1 ? 'red' : 'blue';
        const label = `P${pid} ASSETS`;
        const player = G.players[pid];
        const canDraw = currentPhase === PHASES.SUPPLY && isMyTurn && effectivePlayerID === pid && !G.hasDrawnCard;

        // In the normal view (P0 at bottom), P1 assets are Deck then Discard (top to bottom)
        // P0 assets are Discard then Deck (top to bottom)
        // This keeps the Deck near the "rear" of each player's play area.
        const deckFirst = isP1;

        return (
            <div key={pid} style={{ display: 'flex', flexDirection: 'column', gap: '25px', padding: '10px', border: '1px solid #444', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.7em', color, fontWeight: 'bold' }}>{label}</div>
                {deckFirst ? (
                    <>
                        <DeckPile deckCount={player.deck.length} canDraw={canDraw} onDraw={() => moves.DrawCard()} />
                        {canDraw && (
                            <button onClick={() => moves.DrawCard()} style={DRAW_BUTTON_STYLE}>DRAW A CARD</button>
                        )}
                        <DiscardPile pile={player.discardPile} pid={pid} onOpen={() => setViewingDiscardPile(pid)} />
                    </>
                ) : (
                    <>
                        <DiscardPile pile={player.discardPile} pid={pid} onOpen={() => setViewingDiscardPile(pid)} />
                        <DeckPile deckCount={player.deck.length} canDraw={canDraw} onDraw={() => moves.DrawCard()} />
                        {canDraw && (
                            <button onClick={() => moves.DrawCard()} style={DRAW_BUTTON_STYLE}>DRAW A CARD</button>
                        )}
                    </>
                )}
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'row', gap: '40px', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'row' }}>
                    {displayedColumns.map(id => renderColumn(id))}
                </div>

                {/* SIDELOAD UI (Decks and Discards) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '50px' }}>
                    {shouldFlip ? [renderSideload('0'), renderSideload('1')] : [renderSideload('1'), renderSideload('0')]}
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
                    {currentPhase === PHASES.SUPPLY && isMyTurn && G.hasDrawnCard && (
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

                {/* DEBUG UI */}
                <div style={{ marginTop: '20px', padding: '10px', border: '1px dashed #666', borderRadius: '5px' }}>
                    <label style={{ fontSize: '0.8em', marginRight: '10px' }}>Debug Next Card ID:</label>
                    <input
                        type="text"
                        placeholder="e.g. supply_drop"
                        style={{ background: '#222', color: '#fff', border: '1px solid #444', padding: '4px' }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                moves.SetNextCard((e.target as HTMLInputElement).value);
                                (e.target as HTMLInputElement).value = '';
                                alert('Next card set!');
                            }
                        }}
                    />
                </div>
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
