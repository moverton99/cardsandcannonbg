import React from 'react';
import { BoardCard } from './BoardCard';

interface DiscardOverlayProps {
    pid: string;
    pile: any[];
    onClose: () => void;
}

export const DiscardOverlay: React.FC<DiscardOverlayProps> = ({ pid, pile, onClose }) => {
    return (
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
                <h2 style={{ color: 'white' }}>Player {pid} Discard Pile</h2>
                <button
                    onClick={onClose}
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
                {pile.map((card, i) => (
                    <div key={i} style={{ flexShrink: 0 }}>
                        <BoardCard card={card} isFaceUp={true} />
                    </div>
                ))}
            </div>
        </div>
    );
};
