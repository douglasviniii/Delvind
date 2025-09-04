
'use client';
import React from 'react';
import { Button } from '../ui/button';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TypingEffect } from './typing-effect';

export function HeroSection() {
    const textToType = "Nosso foco é o SEO — aplicamos estratégias inteligentes para fazer sua empresa aparecer nas primeiras posições do Google e atrair os clientes certos.";
    
    return (
        <section className="relative py-10 md:py-16 overflow-hidden">
            <div className="container mx-auto px-4 text-center z-10">
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="relative bg-white/20 backdrop-blur-md border border-white/10 rounded-2xl p-8 md:p-12 shadow-2xl"
                >
                    <h1 className="text-4xl md:text-6xl font-bold font-headline mb-4 tracking-tight">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-fuchsia-500">
                          Delvind
                        </span>
                        <span>, especialistas em posicionamento digital.</span>
                    </h1>
                     <div className="min-h-[100px] flex items-center justify-center">
                        <p className="font-mono text-lg md:text-xl text-foreground max-w-3xl mx-auto">
                            <TypingEffect text={textToType} />
                        </p>
                     </div>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="flex justify-center gap-4 mt-8"
                    >
                        <Button size="lg" asChild>
                            <Link href="/services">Nossos Serviços</Link>
                        </Button>
                        <Button size="lg" variant="outline" asChild>
                            <Link href="/contact">Entre em Contato</Link>
                        </Button>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
