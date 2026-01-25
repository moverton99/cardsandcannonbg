import React from 'react';
import { BoardProps } from 'boardgame.io/react';
import { GameState, COLUMNS, PHASES, PlayerID } from '../Game/types';
import { LAYOUT } from '../UI/styles';
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
                onPlayEvent={(idx) => {
                    moves.PlayEvent(idx, colId);
                    setSelectedCardIndex(null);
                }}
                onPrimaryAction={(colId, choiceId) => moves.PrimaryAction(colId, choiceId)}
                shouldFlip={shouldFlip}
            />
        );
    };

    const renderSideload = (pid: PlayerID) => {
        const isP1 = pid === '1';
        const label = `P${pid} ASSETS`;
        const color = isP1 ? 'red' : 'blue';
        const player = G.players[pid];
        const canDraw = currentPhase === PHASES.SUPPLY && isMyTurn && effectivePlayerID === pid && !G.hasDrawnCard;
        const deckFirst = isP1; // P1 (Top) has deck on top naturally? Or just mimic previous logic

        // Responsive Sidebar Container
        return (
            <div key={pid} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: LAYOUT.GAP_MD,
                padding: '10px',
                border: '1px solid #444',
                borderRadius: '10px',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%'
            }}>
                <div style={{ fontSize: '0.7em', color, fontWeight: 'bold' }}>{label}</div>
                {deckFirst ? (
                    <>
                        <DeckPile deckCount={player.deck.length} canDraw={canDraw} onDraw={() => moves.DrawCard()} />
                        {canDraw && (
                            <button onClick={() => moves.DrawCard()} style={DRAW_BUTTON_STYLE}>DRAW</button>
                        )}
                        <DiscardPile pile={player.discardPile} pid={pid} onOpen={() => setViewingDiscardPile(pid)} />
                    </>
                ) : (
                    <>
                        <DiscardPile pile={player.discardPile} pid={pid} onOpen={() => setViewingDiscardPile(pid)} />
                        <DeckPile deckCount={player.deck.length} canDraw={canDraw} onDraw={() => moves.DrawCard()} />
                        {canDraw && (
                            <button onClick={() => moves.DrawCard()} style={DRAW_BUTTON_STYLE}>DRAW</button>
                        )}
                    </>
                )}
            </div>
        );
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            width: '100vw',
            overflow: 'hidden',
            background: '#1a1a1a'
        }}>
            {/* Main Board Area (Columns + Sidebars) */}
            <div style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: '1fr 120px repeat(3, 15vh) 120px 1fr', // Centered board with 150% card width columns
                gap: '8px', // Slightly better gap
                padding: '10px 2px',
                minHeight: 0, // Important for flex/grid nested shrinking
                overflow: 'hidden',
                justifyItems: 'center'
            }}>
                {/* Left Sidebar (P1 Assets if flipped, else P0? Original logic: P1 assets on left if flipped?)
                    Original: flipped ? [P0, P1] : [P1, P0]
                    Let's keep that order but assign them to grid cells.
                    Actually, let's just place them explicitly.
                */}

                {/* Current Player Indicator */}
                <div style={{
                    gridColumn: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '20px',
                    textAlign: 'center',
                    userSelect: 'none'
                }}>
                    <div style={{
                        fontSize: '0.9em',
                        color: '#666',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '3px',
                        marginBottom: '4px'
                    }}>
                        Current Turn
                    </div>
                    <div style={{
                        fontSize: '2.8em',
                        fontWeight: '900',
                        color: ctx.currentPlayer === '0' ? '#3b82f6' : '#ef4444',
                        textShadow: '0 0 20px rgba(0,0,0,0.4)',
                        lineHeight: '1'
                    }}>
                        PLAYER {ctx.currentPlayer}
                    </div>
                </div>

                {/* Left Sidebar */}
                <div style={{ gridColumn: 2, width: '100%' }}>
                    {shouldFlip ? renderSideload('0') : renderSideload('1')}
                </div>

                {/* Columns */}
                {displayedColumns.map((id, index) => (
                    <div key={id} style={{ gridColumn: 3 + index, height: '100%', width: '100%' }}>
                        {renderColumn(id)}
                    </div>
                ))}

                {/* Right Sidebar */}
                <div style={{ gridColumn: 6, width: '100%' }}>
                    {shouldFlip ? renderSideload('1') : renderSideload('0')}
                </div>

                {/* Phase Indicator */}
                <div style={{
                    gridColumn: 7,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '20px',
                    textAlign: 'center',
                    userSelect: 'none'
                }}>
                    <div style={{
                        fontSize: '0.9em',
                        color: '#666',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '3px',
                        marginBottom: '4px'
                    }}>
                        Phase
                    </div>
                    <div style={{
                        fontSize: '2.5em',
                        fontWeight: '900',
                        color: ctx.currentPlayer === '0' ? '#3b82f6' : '#ef4444',
                        textShadow: '0 0 20px rgba(0,0,0,0.4)',
                        lineHeight: '1'
                    }}>
                        {currentPhase.toUpperCase()}
                    </div>
                </div>
            </div>

            {/* Hand & Player Stats Area */}
            <div style={{
                flex: '0 0 auto', // Don't grow, size to content (but constrained by max-height of cards)
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                width: '100%',
                background: '#111',
                paddingBottom: '10px',
                borderTop: '1px solid #333',
                zIndex: 10
            }}>

                {/* Info & Controls Bar */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center', // Center the buttons
                    alignItems: 'center',
                    padding: '10px 20px',
                    fontSize: '0.8em',
                    color: '#aaa',
                    borderBottom: '1px solid #222',
                    position: 'relative' // For absolute positioning of debug if needed
                }}>
                    <div style={{
                        display: 'flex',
                        gap: '15px',
                        justifyContent: 'center',
                        flex: 1
                    }}>
                        {currentPhase === PHASES.LOGISTICS && (
                            <button
                                style={{
                                    padding: '8px 16px',
                                    cursor: 'pointer',
                                    background: '#1a1a1a',
                                    color: '#eab308',
                                    border: '2px solid #eab308',
                                    borderRadius: '4px',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    transition: 'all 0.2s'
                                }}
                                onClick={() => moves.Pass()}
                            >
                                Pass Logistics
                            </button>
                        )}
                        {currentPhase === PHASES.ENGAGEMENT && (
                            <button
                                style={{
                                    padding: '8px 16px',
                                    cursor: 'pointer',
                                    background: '#1a1a1a',
                                    color: '#eab308',
                                    border: '2px solid #eab308',
                                    borderRadius: '4px',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    transition: 'all 0.2s'
                                }}
                                onClick={() => moves.Pass()}
                            >
                                End Engagement
                            </button>
                        )}
                        {currentPhase === PHASES.COMMITMENT && (
                            <button
                                style={{
                                    padding: '8px 16px',
                                    cursor: 'pointer',
                                    background: '#1a1a1a',
                                    color: '#eab308',
                                    border: '2px solid #eab308',
                                    borderRadius: '4px',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    transition: 'all 0.2s'
                                }}
                                onClick={() => moves.Pass()}
                            >
                                Skip Deployment
                            </button>
                        )}
                    </div>

                    {/* Debug Input (Kept aside) */}
                    <div style={{ position: 'absolute', right: '20px' }}>
                        <input
                            type="text"
                            placeholder="Next..."
                            style={{ background: '#222', color: '#fff', border: '1px solid #444', padding: '4px', width: '60px', fontSize: '0.8em' }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    moves.SetNextCard((e.target as HTMLInputElement).value);
                                    (e.target as HTMLInputElement).value = '';
                                }
                            }}
                        />
                    </div>
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
