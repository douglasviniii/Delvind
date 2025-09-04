
import React from 'react';
import { HeroSection } from '../components/layout/hero-section';
import { ServicesSection } from '../components/layout/services-section';
import { PortfolioCarousel } from '../components/layout/portfolio-carousel';
import { BlogCarousel } from '../components/layout/blog-carousel';
import { PartnersCarousel } from '../components/layout/partners-carousel';
import { Separator } from '../components/ui/separator';
import { Header } from '@/components/layout/header';
import { FooterSection } from '@/components/layout/footer-section';

export default function HomePage() {
    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1">
                <div className="relative isolate overflow-hidden">
                    <div className="fixed inset-0 -z-10 bg-gradient-to-br from-white via-pink-100 to-blue-200" />
                    <div className="space-y-12 py-12 container">
                        <HeroSection />
                        <ServicesSection />
                        <Separator />
                        <PortfolioCarousel />
                        <Separator />
                        <BlogCarousel />
                        <Separator />
                        <PartnersCarousel />
                        <FooterSection />
                    </div>
                </div>
            </main>
        
        </div>
    
    );
}
