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
    BOARD_SLOT_PADDING: 5,
};

const BoardCard: React.FC<{ card: any, isFaceUp: boolean }> = ({ card, isFaceUp }) => {
    const [isHovered, setIsHovered] = useState(false);
    const details = card.type === 'UNIT' ? (unitData as any)[card.unitId] : (eventData as any)[card.eventId];

    const style: React.CSSProperties = {
        width: isHovered ? `${CARD_STYLE.SELECTED_WIDTH}px` : `${CARD_STYLE.WIDTH}px`,
        height: isHovered ? `${CARD_STYLE.SELECTED_HEIGHT}px` : `${CARD_STYLE.HEIGHT}px`,
        background: isFaceUp ? (card.type === 'EVENT' ? '#552255' : '#444') : '#554444',
        border: isHovered ? '3px solid yellow' : '1px solid #777',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: isHovered ? 'flex-start' : 'center',
        transition: 'all 0.2s ease-in-out',
        cursor: 'pointer',
        position: isHovered ? 'absolute' : 'relative',
        zIndex: isHovered ? 100 : 1,
        textAlign: 'center',
        padding: isHovered ? '15px' : '10px',
        boxShadow: isHovered ? '0 10px 25px rgba(0,0,0,0.8)' : 'none',
        transform: isHovered ? `translateY(${CARD_STYLE.SELECTED_LIFT}px)` : 'none',
        overflow: 'hidden',
    };

    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={style}
        >
            {!isFaceUp ? (
                <div style={{ fontWeight: 'bold' }}>BACK</div>
            ) : (
                <>
                    <div style={{ fontSize: isHovered ? '0.9em' : '0.7em', fontWeight: 'bold', marginBottom: isHovered ? '5px' : '0' }}>
                        {details?.name || 'Unit'}
                    </div>
                    {isHovered ? (
                        <div style={{ width: '100%', textAlign: 'left' }}>
                            <div style={{ fontSize: '0.6em', opacity: 0.8, marginBottom: '10px' }}>
                                {card.type} ({details?.weight})
                            </div>
                            {card.type === 'UNIT' && details?.activate && (
                                <div style={{ fontSize: '0.65em', marginBottom: '4px' }}>
                                    <strong style={{ color: 'yellow' }}>Act:</strong> {details.activate.length > 20 ? details.activate.substring(0, 17) + '...' : details.activate}
                                </div>
                            )}
                            {card.type === 'UNIT' && details?.primary && (
                                <div style={{ fontSize: '0.65em', marginBottom: '4px' }}>
                                    <strong style={{ color: 'cyan' }}>Pri:</strong> {details.primary.length > 20 ? details.primary.substring(0, 17) + '...' : details.primary}
                                </div>
                            )}
                            <p style={{ fontSize: '0.7em', fontStyle: 'italic', margin: '5px 0 0 0', lineHeight: '1.2' }}>
                                {details?.description}
                            </p>
                        </div>
                    ) : (
                        <div style={{ fontSize: '0.5em', opacity: 0.7 }}>{card.type}</div>
                    )}
                </>
            )}
        </div>
    );
};

export const Board: React.FC<CardsAndCannonBoardProps> = ({ ctx, G, moves, playerID, events }) => {
    const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
    const [viewingDiscardPile, setViewingDiscardPile] = useState<PlayerID | null>(null);

    const effectivePlayerID = playerID || ctx.currentPlayer;
    const isMyTurn = playerID ? (ctx.currentPlayer === playerID) : true;
    const currentPhase = ctx.phase;

    React.useEffect(() => {
        if (currentPhase === PHASES.SUPPLY && G.hasDrawnCard && G.lastDrawnCard && isMyTurn) {
            const lastIdx = G.players[effectivePlayerID as PlayerID].hand.findIndex(c => c.id === G.lastDrawnCard?.id);
            if (lastIdx !== -1) {
                setSelectedCardIndex(lastIdx);
            }
        }
    }, [G.hasDrawnCard, G.lastDrawnCard, isMyTurn, currentPhase]);
    const me = G.players[effectivePlayerID as PlayerID];
    const handLimitExceeded = me.hand.length > 7;

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

    const renderDeck = (pid: PlayerID) => {
        const deck = G.players[pid].deck;
        const topCard = deck.length > 0 ? { type: 'UNIT', id: 'back' } : null; // Dummy for back
        const canDraw = currentPhase === PHASES.SUPPLY && isMyTurn && pid === effectivePlayerID && !G.hasDrawnCard;

        return (
            <div
                onClick={() => canDraw && moves.DrawCard()}
                style={{
                    position: 'relative',
                    width: `${CARD_STYLE.WIDTH}px`,
                    height: `${CARD_STYLE.HEIGHT}px`,
                    cursor: canDraw ? 'pointer' : 'default',
                    transform: canDraw ? 'scale(1.05)' : 'none',
                    transition: 'transform 0.2s'
                }}>

                {topCard ? (
                    <BoardCard card={topCard} isFaceUp={false} />
                ) : (
                    <div style={{
                        border: '2px solid #333',
                        width: '100%',
                        height: '100%',
                        background: '#111',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.6em',
                        color: '#444'
                    }}>EMPTY</div>
                )}
                {canDraw && (
                    <div style={{
                        position: 'absolute',
                        top: '0',
                        left: '0',
                        width: '100%',
                        height: '100%',
                        border: '2px solid yellow',
                        borderRadius: '8px',
                        pointerEvents: 'none',
                        boxShadow: '0 0 10px yellow',
                        animation: 'pulse 1.5s infinite'
                    }} />
                )}
                {deck.length > 0 && (
                    <div style={{
                        position: 'absolute',
                        bottom: '-12px',
                        right: '0',
                        background: '#333',
                        color: 'white',
                        fontSize: '0.6em',
                        padding: '2px 5px',
                        borderRadius: '4px',
                        border: '1px solid #555',
                        zIndex: 2
                    }}>
                        {deck.length}
                    </div>
                )}
            </div>
        );
    };

    const renderDiscardPile = (pid: PlayerID) => {
        const pile = G.players[pid].discardPile;
        const topCard = pile.length > 0 ? pile[pile.length - 1] : null;

        return (
            <div
                onClick={() => pile.length > 0 && setViewingDiscardPile(pid)}
                style={{
                    width: `${CARD_STYLE.WIDTH}px`,
                    height: `${CARD_STYLE.HEIGHT}px`,
                    cursor: pile.length > 0 ? 'pointer' : 'default',
                    position: 'relative',
                }}
            >
                <small style={{ position: 'absolute', top: '-15px', fontSize: '0.8em', color: '#666', width: '100%', textAlign: 'center' }}>DISCARD</small>
                {topCard ? (
                    <BoardCard card={topCard} isFaceUp={true} />
                ) : (
                    <div style={{
                        border: '2px solid #333',
                        width: '100%',
                        height: '100%',
                        background: '#111',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.6em',
                        color: '#444'
                    }}>EMPTY</div>
                )}
                {pile.length > 0 && (
                    <div style={{
                        position: 'absolute',
                        bottom: '-12px',
                        right: '0',
                        background: '#333',
                        color: 'white',
                        fontSize: '0.6em',
                        padding: '2px 5px',
                        borderRadius: '4px',
                        border: '1px solid #555',
                        zIndex: 2
                    }}>
                        {pile.length}
                    </div>
                )}
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
        const myCol = col.players[effectivePlayerID as PlayerID];
        const isFull = myCol.rear.status === 'OCCUPIED' && myCol.reserve.status === 'OCCUPIED' && myCol.front.status === 'OCCUPIED';

        return (
            <div key={colId} style={{ display: 'flex', flexDirection: 'column', margin: '0 10px', alignItems: 'center' }}>


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
                            <button onClick={() => handleAdvance(colId)} disabled={isFull}>Adv</button>
                        )}

                        {currentPhase === PHASES.LOGISTICS && colId === 'center' && (
                            <button
                                onClick={() => moves.Pass()}
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
                            G.players[effectivePlayerID as PlayerID].hand[selectedCardIndex]?.type === 'EVENT' ? (
                                <button onClick={() => {
                                    moves.PlayEvent(selectedCardIndex);
                                    setSelectedCardIndex(null);
                                }}>Play Event</button>
                            ) : null
                        )}
                        {currentPhase === PHASES.COMMITMENT && (
                            <button onClick={() => handleShip(colId)} disabled={selectedCardIndex === null || isFull}>Ship</button>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderHand = () => {
        const hand = G.players[effectivePlayerID as keyof typeof G.players].hand;
        const isDisabled = viewingDiscardPile !== null;

        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: isDisabled ? 0.5 : 1, pointerEvents: isDisabled ? 'none' : 'auto' }}>
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
                {handLimitExceeded && isMyTurn && currentPhase === PHASES.SUPPLY && (
                    <div style={{ marginTop: '10px' }}>
                        <button
                            disabled={selectedCardIndex === null}
                            onClick={() => {
                                if (selectedCardIndex !== null) {
                                    moves.DiscardCard(selectedCardIndex);
                                    setSelectedCardIndex(null);
                                }
                            }}
                            style={{ padding: '10px 20px', background: '#aa0000', color: 'white', borderRadius: '5px', cursor: selectedCardIndex === null ? 'not-allowed' : 'pointer' }}
                        >
                            Confirm Discard Selection
                        </button>
                    </div>
                )}
            </div>
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
                        {renderDeck('1')}
                        {renderDiscardPile('1')}
                    </div>

                    {/* Player 0 Sideload */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', padding: '10px', border: '1px solid #444', borderRadius: '10px' }}>
                        <div style={{ fontSize: '0.7em', color: 'blue', fontWeight: 'bold' }}>P0 ASSETS</div>
                        {renderDiscardPile('0')}
                        {renderDeck('0')}
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
                    opacity: viewingDiscardPile !== null || (currentPhase === PHASES.SUPPLY && G.lastDrawnCard && isMyTurn) ? 0.5 : 1,
                    pointerEvents: viewingDiscardPile !== null || (currentPhase === PHASES.SUPPLY && G.lastDrawnCard && isMyTurn) ? 'none' : 'auto'
                }}>
                    {currentPhase === PHASES.SUPPLY && isMyTurn && (
                        <>
                            {!G.hasDrawnCard ? (
                                <div style={{ color: 'yellow', fontSize: '0.9em', fontWeight: 'bold', animation: 'flash 1s infinite alternate' }}>
                                    DRAW A CARD
                                </div>
                            ) : (
                                <>
                                    {handLimitExceeded && (
                                        <div style={{ color: '#ff4444', fontSize: '0.8em', marginBottom: '5px' }}>
                                            Discard required: {me.hand.length - 7}
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                    {currentPhase === PHASES.ARRIVAL && isMyTurn && <button style={{ padding: '8px 12px', cursor: 'pointer' }} onClick={() => events && events.endPhase && events.endPhase()}>End Arrival</button>}
                    {currentPhase === PHASES.ENGAGEMENT && isMyTurn && <button style={{ padding: '8px 12px', cursor: 'pointer' }} onClick={() => events && events.endPhase && events.endPhase()}>End Engagement</button>}
                    {currentPhase === PHASES.COMMITMENT && isMyTurn && <button style={{ padding: '8px 12px', cursor: 'pointer', background: '#444', color: '#eee' }} onClick={() => moves.Pass()}>Skip Deployment</button>}
                </div>
                {renderHand()}
            </div>

            <div style={{ marginTop: '20px', textAlign: 'center', color: '#aaa', fontSize: '0.9em' }}>
                <div>Phase: <strong style={{ color: '#fff' }}>{currentPhase.toUpperCase()}</strong></div>
                <div style={{ marginTop: '5px' }}>Current Player: <strong style={{ color: '#fff' }}>{ctx.currentPlayer === '0' ? 'PLAYER 0 (BLUE)' : 'PLAYER 1 (RED)'}</strong></div>
            </div>

            {/* Discard Carousel Popup */}
            {viewingDiscardPile !== null && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0,0,0,0.9)',
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                        <h2 style={{ color: 'white' }}>Player {viewingDiscardPile} Discard Pile</h2>
                        <button
                            onClick={() => setViewingDiscardPile(null)}
                            style={{ padding: '10px 30px', background: '#444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            CLOSE
                        </button>
                    </div>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        gap: '15px',
                        overflowX: 'auto',
                        padding: '40px',
                        maxWidth: '90%',
                        background: '#222',
                        borderRadius: '15px',
                        border: '1px solid #444'
                    }}>
                        {G.players[viewingDiscardPile].discardPile.map((card, i) => (
                            <div key={i} style={{ flexShrink: 0 }}>
                                <BoardCard card={card} isFaceUp={true} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {/* Last Drawn Card Popup Removed - Now handled in Hand */}

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
