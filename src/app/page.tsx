
import React from 'react';
import { HeroSection } from '../components/layout/hero-section';
import { PortfolioCarousel } from '../components/layout/portfolio-carousel';
import { BlogCarousel } from '../components/layout/blog-carousel';
import { PartnersCarousel } from '../components/layout/partners-carousel';
import { Separator } from '../components/ui/separator';
import { Header } from '@/components/layout/header';
import { FooterSection } from '@/components/layout/footer-section';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Globe, Search, Smartphone, TrendingUp, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const services = [
  {
    title: "Websites",
    description: "Criamos sites profissionais e otimizados para converter visitantes em clientes.",
    icon: <Globe className="w-8 h-8 text-primary mb-4" />,
    link: "/services"
  },
  {
    title: "SEO",
    description: "Posicionamos sua marca no topo das buscas do Google para atrair tráfego qualificado.",
    icon: <Search className="w-8 h-8 text-primary mb-4" />,
    link: "/services"
  },
  {
    title: "Aplicativos",
    description: "Desenvolvemos aplicativos móveis intuitivos que fortalecem o relacionamento com seus clientes.",
    icon: <Smartphone className="w-8 h-8 text-primary mb-4" />,
    link: "/services"
  },
  {
    title: "Posicionamento Digital",
    description: "Gerenciamos suas redes sociais e tráfego pago para construir uma presença online forte.",
    icon: <TrendingUp className="w-8 h-8 text-primary mb-4" />,
    link: "/services"
  }
];

const ServicesSection = () => (
    <section>
        <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-headline">Nossos Serviços</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mt-4">Soluções completas para garantir que sua empresa tenha uma presença digital poderosa e eficaz.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map(service => (
                <Card key={service.title} className="flex flex-col text-center items-center bg-card/60 backdrop-blur-md shadow-lg rounded-xl">
                    <CardHeader>
                        {service.icon}
                        <CardTitle>{service.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <p className="text-muted-foreground">{service.description}</p>
                    </CardContent>
                    <CardFooter>
                        <Button asChild variant="outline">
                            <Link href={service.link}>Saiba Mais <ArrowRight className="ml-2 w-4 h-4"/></Link>
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    </section>
);


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
