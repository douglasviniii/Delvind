
'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, Search, Smartphone, TrendingUp, ArrowRight } from 'lucide-react';
import { motion } from "framer-motion";

const services = [
  {
    title: "Websites Profissionais",
    description: "Criamos sites profissionais e otimizados para converter visitantes em clientes.",
    icon: <Globe className="w-8 h-8 text-primary" />,
    link: "https://wa.me/5545988000647"
  },
  {
    title: "Otimização para Buscas (SEO)",
    description: "Posicionamos sua marca no topo das buscas do Google para atrair tráfego qualificado.",
    icon: <Search className="w-8 h-8 text-primary" />,
    link: "https://wa.me/5545988000647"
  },
  {
    title: "Aplicativos Personalizados",
    description: "Desenvolvemos aplicativos móveis intuitivos que fortalecem o relacionamento com seus clientes.",
    icon: <Smartphone className="w-8 h-8 text-primary" />,
    link: "https://wa.me/5545988000647"
  },
  {
    title: "Posicionamento de Marca Digital",
    description: "Gerenciamos suas redes sociais e tráfego pago para construir uma presença online forte.",
    icon: <TrendingUp className="w-8 h-8 text-primary" />,
    link: "https://wa.me/5545988000647"
  }
];

export default function DashboardPage() {
  return (
    <section>
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold font-headline">Explore Nossos Serviços</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mt-4">
          Descubra como nossas soluções podem impulsionar sua presença digital.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 xl:gap-8">
        {services.map((service, index) => (
          <motion.div
            key={service.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="flex flex-col h-full bg-card/60 backdrop-blur-sm hover:border-primary/50 transition-all duration-300 shadow-lg">
              <CardHeader className="flex-row items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  {service.icon}
                </div>
                <CardTitle className="text-xl">{service.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <CardDescription>{service.description}</CardDescription>
              </CardContent>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href={service.link} target="_blank" rel="noopener noreferrer">
                    Solicitar Orçamento <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
