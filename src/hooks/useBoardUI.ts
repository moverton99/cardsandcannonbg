import { useState, useEffect } from 'react';
import { GameState, PlayerID, PHASES } from '../Game/types';

interface UseBoardUIProps {
    G: GameState;
    ctx: any;
    playerID: string | null;
}

export const useBoardUI = ({ G, ctx, playerID }: UseBoardUIProps) => {
    const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
    const [viewingDiscardPile, setViewingDiscardPile] = useState<PlayerID | null>(null);

    const effectivePlayerID = playerID || ctx.currentPlayer;
    const isMyTurn = playerID ? (ctx.currentPlayer === playerID) : true;
    const currentPhase = ctx.phase;

    useEffect(() => {
        if (currentPhase === PHASES.SUPPLY && G.hasDrawnCard && G.lastDrawnCard && isMyTurn) {
            const lastIdx = G.players[effectivePlayerID as PlayerID].hand.findIndex(c => c.id === G.lastDrawnCard?.id);
            if (lastIdx !== -1) {
                setSelectedCardIndex(lastIdx);
            }
        }
    }, [G.hasDrawnCard, G.lastDrawnCard, isMyTurn, currentPhase, effectivePlayerID, G.players]); // Added G.players to dependency array for safety

    const me = G.players[effectivePlayerID as PlayerID];
    const handLimitExceeded = me.hand.length > 7;

    return {
        selectedCardIndex,
        setSelectedCardIndex,
        viewingDiscardPile,
        setViewingDiscardPile,
        effectivePlayerID,
        isMyTurn,
        currentPhase,
        me,
        handLimitExceeded
    };
};
