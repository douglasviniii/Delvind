
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import Link from 'next/link';
import { Globe, Search, Smartphone, TrendingUp } from 'lucide-react';

const services = [
  {
    title: "Websites",
    description: "Criamos sites profissionais e otimizados para converter visitantes em clientes.",
    icon: <Globe className="w-10 h-10 text-primary mb-4" />,
    link: "/services"
  },
  {
    title: "SEO",
    description: "Posicionamos sua marca no topo das buscas do Google para atrair tráfego qualificado.",
    icon: <Search className="w-10 h-10 text-primary mb-4" />,
    link: "/services"
  },
  {
    title: "Aplicativos",
    description: "Desenvolvemos aplicativos móveis intuitivos que fortalecem o relacionamento com seus clientes.",
    icon: <Smartphone className="w-10 h-10 text-primary mb-4" />,
    link: "/services"
  },
  {
    title: "Posicionamento Digital",
    description: "Gerenciamos suas redes sociais e tráfego pago para construir uma presença online forte.",
    icon: <TrendingUp className="w-10 h-10 text-primary mb-4" />,
    link: "/services"
  }
];

export const ServicesSection = () => (
    <section>
        <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-headline">Nossos Serviços</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mt-4">Soluções completas para garantir que sua empresa tenha uma presença digital poderosa e eficaz.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map(service => (
                <Card key={service.title} className="flex flex-col text-center items-center bg-white/20 backdrop-blur-md border border-white/10 shadow-lg rounded-2xl">
                    <CardHeader>
                        {service.icon}
                        <CardTitle>{service.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <p className="text-muted-foreground">{service.description}</p>
                    </CardContent>
                    <CardFooter>
                        <Button asChild variant="outline">
                            <Link href={service.link}>Saiba Mais</Link>
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    </section>
);
