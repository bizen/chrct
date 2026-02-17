
import React, { useRef, useEffect } from 'react';

import heroTreeImg from '../assets/hero-bg-tree.png';

interface Particle {
    x: number;
    y: number;
    size: number;
    speedX: number;
    speedY: number;
    color: string;
    opacity: number;
    angle: number;
    swing: number;
}

export const HeroBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Particle Animation Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initParticles();
        };

        const initParticles = () => {
            particles = [];
            const particleCount = 100; // Number of petals/fireflies

            for (let i = 0; i < particleCount; i++) {
                particles.push(createParticle());
            }
        };

        const createParticle = (): Particle => {
            const isPetal = Math.random() > 0.3; // 70% petals, 30% fireflies
            return {
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: isPetal ? Math.random() * 3 + 2 : Math.random() * 2,
                speedX: (Math.random() - 0.5) * 0.5,
                speedY: isPetal ? Math.random() * 0.5 + 0.2 : (Math.random() - 0.5) * 0.2, // Petals fall down
                color: isPetal ? `rgba(255, 192, 203, ${Math.random() * 0.5 + 0.2})` : `rgba(255, 255, 200, ${Math.random() * 0.8 + 0.2})`,
                opacity: Math.random(),
                angle: Math.random() * Math.PI * 2,
                swing: Math.random() * 0.02
            };
        };

        const drawParticles = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach((p, index) => {
                ctx.fillStyle = p.color;
                ctx.beginPath();

                // Simple circle for firefly, oval for petal
                if (p.color.includes('255, 192, 203')) { // Pink check for petal
                    ctx.ellipse(p.x, p.y, p.size, p.size * 0.6, p.angle, 0, Math.PI * 2);
                } else {
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                }

                ctx.fill();

                // Update position
                p.x += p.speedX + Math.sin(p.angle) * 0.5; // Add sway
                p.y += p.speedY;
                p.angle += p.swing;

                // Reset individual particles if they go off screen
                if (p.y > canvas.height || p.x < -10 || p.x > canvas.width + 10) {
                    particles[index] = {
                        ...createParticle(),
                        y: -10 // Reset to top
                    };
                }
            });

            animationFrameId = requestAnimationFrame(drawParticles);
        };

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        drawParticles();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div style={{ position: 'absolute', inset: 0, zIndex: -1, overflow: 'hidden' }}>
            {/* Animated Background Image - Slow Pan/Zoom */}
            {/* Background Image - Static with subtle scale to cover edges */}
            <div
                style={{
                    position: 'absolute', inset: '-20px', // Extend for coverage
                    backgroundImage: `url(${heroTreeImg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'blur(4px) brightness(0.5) saturate(1.1)',
                    transform: 'scale(1.05)'
                }}
            />

            {/* Canvas Overlay for Particles */}
            <canvas
                ref={canvasRef}
                style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    opacity: 0.8
                }}
            />

            {/* Gradient Overlay for Text Readability */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to bottom, rgba(15, 17, 23, 0.1), rgba(15, 17, 23, 0.7) 70%, #0F1117)'
            }} />
        </div>
    );
};
