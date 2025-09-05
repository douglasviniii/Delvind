
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, Search, Smartphone, TrendingUp, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const services = [
  {
    title: "Websites Profissionais",
    description: "Criamos sites profissionais e otimizados para converter visitantes em clientes.",
    icon: <Globe className="w-6 h-6 text-primary" />,
    link: "/contact"
  },
  {
    title: "Otimização para Buscas (SEO)",
    description: "Posicionamos sua marca no topo das buscas do Google para atrair tráfego qualificado.",
    icon: <Search className="w-6 h-6 text-primary" />,
    link: "/contact"
  },
  {
    title: "Aplicativos Personalizados",
    description: "Desenvolvemos aplicativos móveis intuitivos que fortalecem o relacionamento com seus clientes.",
    icon: <Smartphone className="w-6 h-6 text-primary" />,
    link: "/contact"
  },
  {
    title: "Posicionamento de Marca Digital",
    description: "Gerenciamos suas redes sociais e tráfego pago para construir uma presença online forte.",
    icon: <TrendingUp className="w-6 h-6 text-primary" />,
    link: "/contact"
  }
];

export default function ServicesPage() {
    return (
        <section>
            <div className="text-center mb-12">
                <h1 className="text-3xl md:text-4xl font-bold font-headline">Nossos Serviços</h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto mt-4">Soluções completas para garantir que sua empresa tenha uma presença digital poderosa e eficaz.</p>
            </div>
            <div className="space-y-6 max-w-4xl mx-auto">
                {services.map(service => (
                    <Card key={service.title} className="bg-card/60 backdrop-blur-md shadow-lg rounded-xl transition-all hover:border-primary/50">
                      <Link href={service.link} className="block h-full">
                        <div className="flex flex-col sm:flex-row items-center p-6 gap-6 h-full">
                            <div className="flex-shrink-0">
                                {service.icon}
                            </div>
                            <div className="flex-1 text-center sm:text-left">
                                <CardTitle className="text-xl mb-1">{service.title}</CardTitle>
                                <CardDescription>{service.description}</CardDescription>
                            </div>
                            <div className="ml-auto flex-shrink-0">
                                <Button variant="ghost" size="icon">
                                    <ArrowRight className="w-5 h-5 text-primary" />
                                </Button>
                            </div>
                        </div>
                      </Link>
                    </Card>
                ))}
            </div>
        </section>
    );
}
