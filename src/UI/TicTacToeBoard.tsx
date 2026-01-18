import React from 'react';
import { BoardProps } from 'boardgame.io/react';
import { TicTacToeState } from '../Game/TicTacToe';

interface TicTacToeBoardProps extends BoardProps<TicTacToeState> { }

export const TicTacToeBoard: React.FC<TicTacToeBoardProps> = ({ ctx, G, moves }) => {
    const onClick = (id: number) => {
        moves.clickCell(id);
    };

    let winner = '';
    if (ctx.gameover) {
        if (ctx.gameover.winner !== undefined) {
            winner = `Winner: ${ctx.gameover.winner}`;
        } else if (ctx.gameover.draw) {
            winner = 'Draw!';
        }
    }

    const cellStyle = {
        border: '1px solid #555',
        width: '50px',
        height: '50px',
        lineHeight: '50px',
        textAlign: 'center' as const,
        cursor: 'pointer',
    };

    const tbody = [];
    for (let i = 0; i < 3; i++) {
        const cells = [];
        for (let j = 0; j < 3; j++) {
            const id = 3 * i + j;
            cells.push(
                <td
                    key={id}
                    style={cellStyle}
                    onClick={() => onClick(id)}
                >
                    {G.cells[id]}
                </td>
            );
        }
        tbody.push(<tr key={i}>{cells}</tr>);
    }

    return (
        <div style={{ textAlign: 'center' }}>
            <table id="board">
                <tbody>{tbody}</tbody>
            </table>
            {winner && <div>{winner}</div>}
        </div>
    );
};
