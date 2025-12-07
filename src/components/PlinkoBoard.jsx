import React, { useRef, useEffect } from 'react';

export default function PlinkoBoard({ engine }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationId;

        const render = () => {
            if (!engine) return;

            // Clear
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Pegs
            ctx.fillStyle = '#fff';
            for (const peg of engine.pegs) {
                ctx.beginPath();
                ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw Slots
            for (const slot of engine.slots) {
                ctx.fillStyle = slot.color;
                ctx.fillRect(slot.x - slot.width / 2, slot.y, slot.width, slot.height);

                ctx.fillStyle = '#000';
                ctx.font = '10px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(slot.multiplier + 'x', slot.x, slot.y + 14);
            }

            // Draw Balls
            ctx.fillStyle = '#ff00ff';
            for (const ball of engine.balls) {
                ctx.beginPath();
                ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
                ctx.fill();

                // Shine
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(ball.x - 2, ball.y - 2, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fill();
                ctx.fillStyle = '#ff00ff';
            }

            // Sniper Sight
            if (engine.hasSniperSight) {
                const path = engine.simulateTrajectory(engine.width / 2);
                // console.log('Sniper Sight Path:', path.length); 
                ctx.beginPath();
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 3;
                if (path.length > 0) {
                    ctx.moveTo(path[0].x, path[0].y);
                    for (let i = 1; i < path.length; i++) {
                        ctx.lineTo(path[i].x, path[i].y);
                    }
                }
                ctx.stroke();
            }

            animationId = requestAnimationFrame(render);
        };

        render();

        return () => cancelAnimationFrame(animationId);
    }, [engine]);

    return (
        <canvas
            ref={canvasRef}
            width={engine ? engine.width : 500}
            height={engine ? engine.height : 600}
            style={{
                border: '2px solid #333',
                maxWidth: '100%',
                maxHeight: '100%',
                width: '100%',
                height: '100%',
                objectFit: 'contain'
            }}
        />
    );
}
