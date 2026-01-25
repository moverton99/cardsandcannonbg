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

                {/* Phase Info & Controls Bar */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '5px 20px',
                    fontSize: '0.8em',
                    color: '#aaa',
                    borderBottom: '1px solid #222'
                }}>
                    <div>
                        Phase: <strong style={{ color: '#fff' }}>{currentPhase.toUpperCase()}</strong> |
                        Current: <strong style={{ color: '#fff' }}>{ctx.currentPlayer === '0' ? 'P0 (BLUE)' : 'P1 (RED)'}</strong>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        {currentPhase === PHASES.LOGISTICS && <button style={{ padding: '4px 8px', cursor: 'pointer' }} onClick={() => moves.Pass()}>Pass Logistics</button>}
                        {currentPhase === PHASES.ENGAGEMENT && <button style={{ padding: '4px 8px', cursor: 'pointer' }} onClick={() => moves.Pass()}>End Engagement</button>}
                        {currentPhase === PHASES.COMMITMENT && <button style={{ padding: '4px 8px', cursor: 'pointer', background: '#444', color: '#eee' }} onClick={() => moves.Pass()}>Skip Deployment</button>}
                    </div>

                    {/* Debug Input */}
                    <div>
                        <input
                            type="text"
                            placeholder="Next card..."
                            style={{ background: '#222', color: '#fff', border: '1px solid #444', padding: '2px', width: '80px' }}
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
