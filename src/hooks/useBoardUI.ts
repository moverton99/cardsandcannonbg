import { useState, useEffect } from 'react';
import { GameState, PlayerID } from '../Game/types';

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
    const currentPhase = ctx.activePlayers?.[ctx.currentPlayer] || ctx.phase;

    useEffect(() => {
        // Feature disabled or TODO: reimplement if needed without G.lastDrawnCard
    }, [currentPhase, effectivePlayerID]);

    const me = G.players[effectivePlayerID as PlayerID];
    const handLimitExceeded = me.hand.length > 7;

    const breakthroughs = me.breakthroughTokens;
    const frontControlCount = Object.keys(G.columns).filter(id => {
        const pCol = G.columns[id as keyof typeof G.columns].players[effectivePlayerID as PlayerID];
        const oppID = (effectivePlayerID === '0' ? '1' : '0') as PlayerID;
        const oCol = G.columns[id as keyof typeof G.columns].players[oppID];
        return pCol.front.status === 'OCCUPIED' && pCol.front.isOperational && oCol.front.status === 'EMPTY';
    }).length;

    return {
        selectedCardIndex,
        setSelectedCardIndex,
        viewingDiscardPile,
        setViewingDiscardPile,
        effectivePlayerID,
        isMyTurn,
        currentPhase,
        me,
        handLimitExceeded,
        breakthroughs,
        frontControlCount
    };
};
