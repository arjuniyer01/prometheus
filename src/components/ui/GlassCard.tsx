import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface GlassCardProps {
    children: ReactNode;
    className?: string;
    hoverEffect?: boolean;
}

export const GlassCard = ({ children, className, hoverEffect = true }: GlassCardProps) => {
    return (
        <motion.div
            whileHover={hoverEffect ? { scale: 1.01, translateY: -2 } : {}}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
                "glass-morphism rounded-3xl p-6 overflow-hidden relative group",
                className
            )}
        >
            {/* Subtle top highlight */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* Dynamic glow on hover */}
            {hoverEffect && (
                <div className="absolute -inset-px bg-gradient-to-br from-indigo-500/10 via-transparent to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[inherit]" />
            )}

            <div className="relative z-10">
                {children}
            </div>
        </motion.div>
    );
};
