import React from 'react';

export default function HUD({ chips, debt, round, drops, message }) {
    return (
        <div className="hud">
            <div className="stat">
                <span className="stat-label">CHIPS</span>
                <span className="stat-value gold">${chips}</span>
            </div>
            <div className="stat">
                <span className="stat-label">DEBT</span>
                <span className="stat-value red">${debt}</span>
            </div>
            <div className="stat">
                <span className="stat-label">ROUND</span>
                <span className="stat-value">{round}</span>
            </div>
            <div className="stat">
                <span className="stat-label">DROPS</span>
                <span className="stat-value">{drops}/10</span>
            </div>
            {message && (
                <div className="stat" style={{ width: '100%', marginTop: '10px' }}>
                    <span className="stat-value" style={{ fontSize: '0.8rem', color: '#00ffff' }}>{message}</span>
                </div>
            )}
        </div>
    );
}
