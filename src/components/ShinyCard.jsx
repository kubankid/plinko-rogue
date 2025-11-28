import React, { useRef, useState, useEffect } from 'react';
import '../shiny-card.css';

const ShinyCard = ({
    children,
    width = '300px',
    height = '420px',
    className = '',
    style = {}
}) => {
    const cardRef = useRef(null);
    const [spring, setSpring] = useState({ x: 50, y: 50, o: 0 });
    const [isHovering, setIsHovering] = useState(false);

    const handleMouseMove = (e) => {
        if (!cardRef.current) return;

        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Calculate percentage
        const xPct = (x / rect.width) * 100;
        const yPct = (y / rect.height) * 100;

        setSpring({ x: xPct, y: yPct, o: 1 });
    };

    const handleMouseLeave = () => {
        setSpring({ x: 50, y: 50, o: 0 }); // Reset to center and 0 opacity
        setIsHovering(false);
    };

    const handleMouseEnter = () => {
        setIsHovering(true);
    };

    // Calculate rotation based on mouse position
    const rotateX = (spring.y - 50) / 2; // Max rotation deg
    const rotateY = (50 - spring.x) / 2;

    const cardStyle = {
        width,
        height,
        '--pointer-x': `${spring.x}%`,
        '--pointer-y': `${spring.y}%`,
        '--card-opacity': spring.o,
        '--background-x': `${spring.x}%`,
        '--background-y': `${spring.y}%`,
        transform: `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        ...style
    };

    return (
        <div
            ref={cardRef}
            className={`shiny-card ${className}`}
            style={cardStyle}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onMouseEnter={handleMouseEnter}
        >
            <div className="shiny-card__content">
                {children}
            </div>
            <div className="shiny-card__glare" />
            <div className="shiny-card__shine" />
        </div>
    );
};

export default ShinyCard;
