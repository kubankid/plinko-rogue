import React from 'react';
import ShinyCard from './ShinyCard';

export default function Card({ card, shiny = false }) {
    const [imageError, setImageError] = React.useState(false);
    const imagePath = getCardImage(card);
    const isRed = ['Hearts', 'Diamonds'].includes(card.suit);

    const cardContent = imageError ? (
        <div className={`card ${isRed ? 'red' : 'black'}`} style={{ width: '100%', height: '100%' }}>
            <div className="card-rank-top">{card.rank}</div>
            <div className="card-suit">{getSuitSymbol(card.suit)}</div>
            <div className="card-rank-bottom">{card.rank}</div>
        </div>
    ) : (
        <img
            src={imagePath}
            alt={`${card.rank} of ${card.suit}`}
            className="pixel-card"
            style={{ width: '100%', height: '100%', imageRendering: 'pixelated', display: 'block' }}
            onError={() => setImageError(true)}
        />
    );

    if (shiny) {
        return (
            <div className="card-wrapper card-animate">
                <ShinyCard width="100%" height="100%" style={{ borderRadius: '6px' }}>
                    {cardContent}
                </ShinyCard>
            </div>
        );
    }

    return (
        <div className="card-wrapper card-animate">
            {cardContent}
        </div>
    );
}

function getSuitSymbol(suit) {
    switch (suit) {
        case 'Hearts': return '♥';
        case 'Diamonds': return '♦';
        case 'Clubs': return '♣';
        case 'Spades': return '♠';
        default: return '';
    }
}

function getCardImage(card) {
    // User specified order: Hearts, Clubs, Diamonds, Spades
    // User specified rank order: 2, 3, ..., K, A (Ace is last)
    // Tiles start at 001 (000 is back)

    const suits = ['Hearts', 'Clubs', 'Diamonds', 'Spades'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

    const suitIndex = suits.indexOf(card.suit);
    const rankIndex = ranks.indexOf(card.rank);

    if (suitIndex === -1 || rankIndex === -1) return '';

    // Calculate tile index: suit * 13 + rank + 1
    const tileIndex = (suitIndex * 13) + rankIndex + 1;

    // Format index to 3 digits (e.g., 005, 012)
    const formattedIndex = tileIndex.toString().padStart(3, '0');

    return `./cards/tile${formattedIndex}.png`;
}
