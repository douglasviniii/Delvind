
'use client';

import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Skeleton } from '../../components/ui/skeleton';
import { Header } from '@/components/layout/header';
import { FooterSection } from '@/components/layout/footer-section';

type PortfolioItem = {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    link: string;
};

export default function PortfolioPage() {
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'portfolio'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PortfolioItem));
        setPortfolioItems(items);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching portfolio items: ", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="relative isolate">
          <div className="fixed inset-0 -z-10 bg-gradient-to-br from-white via-pink-100 to-blue-200" />
          <div className="container py-12">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">Conheça Nossos Clientes</h1>
              <p className="text-lg text-muted-foreground max-w-4xl mx-auto">
                Conheça os projetos de sucesso que desenvolvemos para nossos parceiros e clientes. Cada projeto é uma história de colaboração e inovação.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}><Skeleton className="w-full h-80" /></Card>
                ))
              ) : (
                portfolioItems.map((project) => (
                  <Card key={project.id} className="flex flex-col overflow-hidden group">
                    <div className="relative overflow-hidden">
                      <Image
                        src={project.imageUrl}
                        alt={`Projeto ${project.title}`}
                        width={600}
                        height={400}
                        className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <CardHeader className="flex-1">
                      <CardTitle>{project.title}</CardTitle>
                      <CardDescription>{project.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button asChild variant="outline" className="w-full" disabled={!project.link}>
                        <Link href={project.link || '#'} target='_blank'>Confira o projeto <ArrowRight className="ml-2 w-4 h-4" /></Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
