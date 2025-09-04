'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Code, BarChart, Goal, Briefcase } from 'lucide-react';
import { cn } from '../../lib/utils';


const icons = [
    { component: Search, color: 'text-blue-400' },
    { component: Code, color: 'text-green-400' },
    { component: BarChart, color: 'text-yellow-400' },
    { component: Goal, color: 'text-red-400' },
    { component: Briefcase, color: 'text-purple-400' },
];

type IconInstance = {
    id: number;
    component: React.ElementType;
    color: string;
    x: number;
    y: number;
    size: number;
    duration: number;
};

export const FallingIcons = () => {
    const [renderedIcons, setRenderedIcons] = useState<IconInstance[]>([]);

    useEffect(() => {
        const createIcon = () => {
            const id = Date.now() + Math.random();
            const { component, color } = icons[Math.floor(Math.random() * icons.length)];
            const newIcon: IconInstance = {
                id,
                component,
                color,
                x: Math.random() * 100,
                y: -10,
                size: Math.random() * 24 + 16,
                duration: Math.random() * 8 + 7,
            };

            setRenderedIcons(prev => {
                const newIcons = [...prev, newIcon];
                // Limit the number of icons to prevent performance issues
                if (newIcons.length > 20) {
                    return newIcons.slice(newIcons.length - 20);
                }
                return newIcons;
            });

            // Self-destruct after animation
            setTimeout(() => {
                setRenderedIcons(prev => prev.filter(icon => icon.id !== id));
            }, newIcon.duration * 1000 + 1000);
        };

        const interval = setInterval(createIcon, 1500);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="absolute inset-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
            {renderedIcons.map(({ id, component: Icon, color, x, y, size, duration }) => (
                <motion.div
                    key={id}
                    initial={{ x: `${x}vw`, y: `${y}vh`, opacity: 0 }}
                    animate={{ y: '110vh', opacity: [0, 0.7, 0.7, 0] }}
                    transition={{ duration, ease: 'linear' }}
                    className="absolute"
                >
                    <Icon className={cn('h-12 w-12', color)} style={{ width: size, height: size }} />
                </motion.div>
            ))}
        </div>
    );
};
