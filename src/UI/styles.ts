import React from 'react';

// Responsive Layout Constants
export const LAYOUT = {
    CARD_ASPECT_RATIO: 4 / 5,
    GAP_SM: '8px',
    GAP_MD: '16px',
    RADIUS: '8px',
};

export const EMPTY_CARD_SLOT_STYLE: React.CSSProperties = {
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
};

export const COUNT_BADGE_STYLE: React.CSSProperties = {
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
};
