
'use client';

import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '../ui/carousel';
import { Button } from '../ui/button';
import { ArrowRight } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import Autoplay from "embla-carousel-autoplay"


type PortfolioItem = {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    link: string;
};

export function PortfolioCarousel() {
    const [items, setItems] = useState<PortfolioItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'portfolio'), orderBy('createdAt', 'desc'), limit(10));
        const unsubscribe = onSnapshot(q, snapshot => {
            setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PortfolioItem)));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    return (
        <section className="py-16">
            <div className="container">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold font-headline">Nossos Clientes</h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto mt-4">Confira alguns dos nossos projetos de sucesso em nosso Portifólio de Clientes.</p>
                </div>
                {loading ? (
                    <div className='flex justify-center'>
                         <Skeleton className="h-96 w-full max-w-4xl" />
                    </div>
                ) : (
                <Carousel
                    opts={{ align: "start", loop: true }}
                     plugins={[
                        Autoplay({
                          delay: 3000,
                          stopOnInteraction: true,
                        }),
                      ]}
                    className="w-full max-w-6xl mx-auto"
                >
                    <CarouselContent>
                        {items.map(item => (
                            <CarouselItem key={item.id} className="md:basis-1/2 lg:basis-1/3">
                                <div className="p-1 h-full">
                                    <Card className="flex flex-col h-full overflow-hidden group">
                                        <div className="relative overflow-hidden">
                                            <Image
                                                src={item.imageUrl}
                                                alt={item.title}
                                                width={600}
                                                height={400}
                                                className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                                            />
                                        </div>
                                        <CardHeader className="flex-1">
                                            <CardTitle>{item.title}</CardTitle>
                                            <CardDescription>{item.description}</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <Button asChild variant="outline" className="w-full" disabled={!item.link}>
                                                <Link href={item.link || '#'} target='_blank'>
                                                    Confira o projeto <ArrowRight className="ml-2 w-4 h-4" />
                                                </Link>
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious  className="ml-16" />
                    <CarouselNext className="mr-16" />
                </Carousel>
                )}
            </div>
        </section>
    );
}
