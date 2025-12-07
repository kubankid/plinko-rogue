import React, { useState } from 'react';

const Shop = ({ items, inventory, buyItem, chips, refreshCost, onRefresh, round }) => {
    return (
        <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '15px',
                borderBottom: '2px solid #333',
                paddingBottom: '10px'
            }}>
                <h2 style={{ color: '#ff00ff', margin: 0, fontSize: '1.5rem' }}>SHOP</h2>
                <button
                    onClick={onRefresh}
                    disabled={chips < refreshCost}
                    style={{
                        padding: '5px 10px',
                        background: 'transparent',
                        border: '2px solid #00ffff',
                        color: '#00ffff',
                        cursor: chips >= refreshCost ? 'pointer' : 'not-allowed',
                        fontSize: '0.6rem',
                        fontFamily: '"Press Start 2P", cursive',
                        opacity: chips >= refreshCost ? 1 : 0.5
                    }}
                >
                    REFRESH ${refreshCost}
                </button>
            </div>

            <div style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                paddingRight: '5px'
            }}>
                {items.filter(item => !inventory.some(i => i.id === item.id)).map((item) => {
                    const inflation = Math.pow(1.1, round - 1);
                    const cost = Math.floor(item.cost * inflation);

                    return (
                        <div
                            key={item.id}
                            style={{
                                border: '2px solid #444',
                                padding: '10px',
                                background: 'rgba(0, 0, 0, 0.3)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '5px'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
                                <span style={{ color: '#ff00ff', fontSize: '0.8rem' }}>{item.name}</span>
                            </div>
                            <p style={{ fontSize: '0.6rem', color: '#ccc', margin: 0, lineHeight: '1.2' }}>{item.description}</p>

                            <button
                                onClick={() => buyItem(item)}
                                disabled={chips < cost}
                                style={{
                                    marginTop: '5px',
                                    padding: '8px',
                                    background: chips >= cost ? '#ff00ff' : '#333',
                                    border: 'none',
                                    color: '#fff',
                                    cursor: chips >= cost ? 'pointer' : 'not-allowed',
                                    fontSize: '0.7rem',
                                    fontFamily: '"Press Start 2P", cursive',
                                    width: '100%'
                                }}
                            >
                                BUY ${cost}
                            </button>
                        </div>
                    );
                })}
                {items.filter(item => !inventory.some(i => i.id === item.id)).length === 0 && (
                    <div style={{ textAlign: 'center', color: '#555', marginTop: '20px', fontSize: '0.8rem' }}>
                        SOLD OUT
                    </div>
                )}
            </div>
        </div>
    );
};

export default Shop;
