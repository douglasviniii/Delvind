
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { CheckCircle } from "lucide-react";
import Link from 'next/link';
import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";
import { Header } from "@/components/layout/header";
import { FooterSection } from "@/components/layout/footer-section";

const services = [
  {
    title: "Por que ter um Site?",
    image: "https://darkgreen-lark-741030.hostingersite.com/img/1..png",
    benefits: [
      "Aumenta a presença online de forma profissional.",
      "Possibilita o crescimento do seu negócio sem fronteiras.",
      "Melhora a experiência do cliente com navegação fácil.",
      "Permite fornecer informações detalhadas sobre seus produtos/serviços.",
      "Oferece mais controle sobre o conteúdo da sua marca.",
      "Facilita a integração com ferramentas de marketing digital."
    ],
    link: "/contact"
  },
  {
    title: "Por que investir em SEO?",
    image: "https://darkgreen-lark-741030.hostingersite.com/img/6..png",
    benefits: [
      "Atrai clientes qualificados que já buscam por seus serviços.",
      "Aumenta a visibilidade e autoridade da sua marca no mercado.",
      "Gera resultados consistentes e duradouros a médio e longo prazo.",
      "Reduz o custo de aquisição de clientes em comparação com anúncios.",
      "Coloca sua empresa à frente da concorrência no Google.",
      "Seu negócio vendendo 24 horas por dia, 7 dias por semana."
    ],
    link: "/contact"
  },
  {
    title: "Por que ter um Aplicativo?",
    image: "https://darkgreen-lark-741030.hostingersite.com/img/10..png",
    benefits: [
      "Acesso rápido e fácil aos serviços.",
      "Experiência personalizada para cada usuário.",
      "Notificações push aumentam o engajamento.",
      "Pode funcionar mesmo sem conexão com a internet.",
      "Fortalece a credibilidade e a imagem inovadora da marca.",
      "Garante a identidade visual e funcional da sua empresa."
    ],
    link: "/contact"
  },
  {
    title: "Por que ter um Posicionamento Digital?",
    image: "https://darkgreen-lark-741030.hostingersite.com/img/4..png",
    benefits: [
      "Constrói um relacionamento sólido e de confiança com seu público.",
      "Gerencia a reputação da sua marca no ambiente online.",
      "Aumenta o alcance e o engajamento nas redes sociais.",
      "Direciona tráfego qualificado para seu site ou aplicativo.",
      "Cria uma comunidade de fãs e defensores da sua marca.",
      "Unifica sua mensagem e presença em todos os canais digitais."
    ],
    link: "/contact"
  }
];

const ServiceCard = ({ service, index }: { service: typeof services[0], index: number }) => {
  const isReversed = index % 2 !== 0;

  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
     <motion.div 
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={cardVariants}
    >
      <div className="grid md:grid-cols-2 items-center gap-8 md:gap-12 bg-white/20 backdrop-blur-md border border-white/10 shadow-lg rounded-2xl p-8">
        <div className={cn("relative rounded-lg overflow-hidden", isReversed && "md:order-2")}>
          <Image
            src={service.image}
            alt={service.title}
            width={600}
            height={450}
            className="w-full h-auto object-cover"
          />
        </div>
        <div className="flex flex-col">
          <h2 className="text-3xl font-bold font-headline mb-4">{service.title}</h2>
          <ul className="space-y-3 mb-6 flex-1">
            {service.benefits.map((benefit, i) => (
              <li key={i} className="flex items-start">
                <CheckCircle className="w-5 h-5 text-primary mr-3 mt-1 shrink-0" />
                <span className="text-muted-foreground">{benefit}</span>
              </li>
            ))}
          </ul>
          <Button asChild className="w-full md:w-auto self-start">
            <Link href={service.link}>Saiba Mais</Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
};


export default function ServicesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="relative isolate">
          <div className="fixed inset-0 -z-10 bg-gradient-to-br from-white via-pink-100 to-blue-200" />
          <div className="container py-16 space-y-16">
            <section className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">Soluções Digitais Completas</h1>
              <p className="text-lg text-muted-foreground max-w-4xl mx-auto">
                Da otimização que coloca seu negócio no topo do Google à criação de sites e aplicativos personalizados. Descubra como podemos impulsionar sua presença online.
              </p>
            </section>
            <section className="space-y-16">
              {services.map((service, index) => (
                <ServiceCard key={service.title} service={service} index={index} />
              ))}
            </section>
          </div>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
