import React from 'react';

const BuffDisplay = ({ inventory, onSell }) => {
    const [selectedBuff, setSelectedBuff] = React.useState(null);

    if (inventory.length === 0) return null;

    const getIcon = (id) => {
        switch (id) {
            case 'loaded_dice': return '🎲';
            case 'safety_net': return '🛡️';
            case 'high_roller': return '💎';
            case 'second_chance': return '🤞';
            case 'charity': return '🕊️';
            case 'ace_in_hole': return '🅰️';
            default: return '🔮';
        }
    };

    const handleSell = () => {
        if (selectedBuff && onSell) {
            onSell(selectedBuff);
            setSelectedBuff(null);
        }
    };

    return (
        <>
            <div className="buff-display">
                {inventory.map((item, index) => (
                    <div
                        key={index}
                        className="buff-icon"
                        title={item.name}
                        onClick={() => setSelectedBuff(item)}
                        style={{ cursor: 'pointer' }}
                    >
                        {getIcon(item.id)}
                    </div>
                ))}
            </div>

            {selectedBuff && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: '#111',
                        border: '2px solid #00ffff',
                        padding: '20px',
                        borderRadius: '10px',
                        maxWidth: '300px',
                        textAlign: 'center',
                        color: '#fff',
                        boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '10px' }}>
                            {getIcon(selectedBuff.id)}
                        </div>
                        <h3 style={{ color: '#ff00ff', marginBottom: '10px' }}>{selectedBuff.name}</h3>
                        <p style={{ color: '#ccc', marginBottom: '20px', fontSize: '1.2rem' }}>
                            {selectedBuff.description}
                        </p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button
                                onClick={handleSell}
                                style={{
                                    background: '#ff0000',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                SELL ${Math.floor(selectedBuff.cost / 2)}
                            </button>
                            <button
                                onClick={() => setSelectedBuff(null)}
                                style={{
                                    background: '#333',
                                    color: '#fff',
                                    border: '1px solid #666',
                                    padding: '8px 16px',
                                    borderRadius: '5px',
                                    cursor: 'pointer'
                                }}
                            >
                                CANCEL
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default BuffDisplay;
