import React, { useState } from 'react';

const Shop = ({ items, ownedItems, buyItem, chips, onClose, refreshCost, onRefresh }) => {
    const [hoveredItem, setHoveredItem] = useState(null);

    return (
        <div className="glass-panel" style={{
            padding: '20px',
            color: '#fff',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
            overflow: 'hidden'
        }}>
            <h2 style={{ color: '#ff00ff', textAlign: 'center', textShadow: '0 0 10px #ff00ff', margin: '0 0 10px 0', fontSize: '3em' }}>THE PIT SHOP</h2>
            <div style={{ textAlign: 'center', marginBottom: '15px', fontSize: '2.5em' }}>CHIPS: {chips}</div>

            <div style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                minHeight: 0,
                paddingRight: '5px'
            }}>
                {items.filter(item => !ownedItems.some(i => i.id === item.id)).map((item) => {
                    return (
                        <div
                            key={item.id}
                            style={{
                                border: '1px solid #fff',
                                padding: '15px',
                                borderRadius: '8px',
                                background: 'rgba(0, 0, 0, 0.5)',
                                position: 'relative',
                                cursor: 'pointer',
                            }}
                            onMouseEnter={() => setHoveredItem(item)}
                            onMouseLeave={() => setHoveredItem(null)}
                        >
                            <div style={{ fontSize: '3em', marginBottom: '10px' }}>{item.icon}</div>
                            <h3 style={{ margin: '0 0 5px 0', color: '#ff00ff', fontSize: '2.5em' }}>{item.name}</h3>
                            <p style={{ fontSize: '1.8em', color: '#ccc' }}>{item.description}</p>

                            <button
                                onClick={() => buyItem(item)}
                                disabled={chips < item.cost}
                                style={{
                                    marginTop: '10px',
                                    padding: '12px 16px',
                                    background: chips >= item.cost ? '#ff00ff' : '#555',
                                    border: 'none',
                                    color: '#fff',
                                    cursor: chips >= item.cost ? 'pointer' : 'not-allowed',
                                    borderRadius: '4px',
                                    fontWeight: 'bold',
                                    width: '100%',
                                    fontSize: '1.8em'
                                }}
                            >
                                BUY ${item.cost}
                            </button>
                        </div>
                    );
                })}
            </div>

            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                    onClick={onRefresh}
                    disabled={chips < refreshCost}
                    style={{
                        padding: '10px',
                        background: 'transparent',
                        border: '1px solid #00ffff',
                        color: '#00ffff',
                        cursor: chips >= refreshCost ? 'pointer' : 'not-allowed',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        opacity: chips >= refreshCost ? 1 : 0.5
                    }}
                >
                    REFRESH SHOP (${refreshCost})
                </button>

                <button
                    onClick={onClose}
                    style={{
                        padding: '12px',
                        background: '#ff0000',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        fontSize: '1.1em'
                    }}
                >
                    Back to Game
                </button>
            </div>
        </div>
    );
};

export default Shop;
