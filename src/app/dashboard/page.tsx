
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from "../../context/auth-context";
import { db } from "../../lib/firebase";
import { doc, getDoc } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { AlertCircle, ArrowRight, Globe, Search, Smartphone, TrendingUp } from 'lucide-react';
import { PortfolioCarousel } from '../../components/layout/portfolio-carousel';
import { BlogCarousel } from '../../components/layout/blog-carousel';
import { PartnersCarousel } from '../../components/layout/partners-carousel';
import { Separator } from '../../components/ui/separator';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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


export default function DashboardPage() {
  const { user } = useAuth();
  const [profileIncomplete, setProfileIncomplete] = useState(false);

  useEffect(() => {
    if (user) {
        const checkProfile = async () => {
            const userDocRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (!data.phone) {
                    setProfileIncomplete(true);
                }
            } else {
                setProfileIncomplete(true);
            }
        }
        checkProfile();
    }
  }, [user]);

  return (
    <>
      {profileIncomplete && (
        <Alert className="mb-6 bg-card border-primary">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Pendências no seu perfil!</AlertTitle>
          <AlertDescription>
            Seu perfil está incompleto. Por favor, <Link href="/dashboard/profile" className="font-bold hover:underline">clique aqui</Link> para preencher seus dados e aproveitar todos os nossos recursos.
          </AlertDescription>
        </Alert>
      )}
      
      <div className='space-y-16'>
        {/* Seção de Serviços Refatorada */}
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

        <Separator />
        <PortfolioCarousel />
        <Separator />
        <BlogCarousel />
        <Separator />
        <PartnersCarousel />
      </div>
    </>
  );
}
