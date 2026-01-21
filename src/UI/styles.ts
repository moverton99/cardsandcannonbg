import React from 'react';

export const CARD_STYLE = {
    WIDTH: 160,
    HEIGHT: 200,
    SELECTED_WIDTH: 320,
    SELECTED_HEIGHT: 400,
    SELECTED_LIFT: -25,
    GAP: 10,
    BOARD_SLOT_PADDING: 10,
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
