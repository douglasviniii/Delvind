
'use client';

import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import Image from 'next/image';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '../ui/carousel';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import Autoplay from "embla-carousel-autoplay"
import { Button } from '../ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

type Partner = {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
  link?: string;
};

export function PartnersCarousel() {
    const [partners, setPartners] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'partners'), orderBy('createdAt', 'desc'), limit(15));
        const unsubscribe = onSnapshot(q, snapshot => {
            setPartners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Partner)));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);
    

    return (
        <section>
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold font-headline">Nossos Parceiros</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto mt-4">Temos orgulho de colaborar com empresas inovadoras que confiam em nosso trabalho.</p>
            </div>
            {loading ? (
                <div className='flex justify-center'>
                     <Skeleton className="h-80 w-full" />
                </div>
            ) : (
            <Carousel
                opts={{ align: "start", loop: true, slidesToScroll: 1, }}
                plugins={[
                    Autoplay({
                      delay: 5000,
                      stopOnInteraction: true,
                    }),
                  ]}
                className="w-full"
            >
                <CarouselContent className="-ml-4">
                    {partners.map(partner => (
                        <CarouselItem key={partner.id} className="md:basis-1/2 lg:basis-1/3 pl-4">
                           <div className="p-1 h-full">
                               <Card className="flex flex-col h-full text-center items-center overflow-hidden group">
                                  <div className="relative overflow-hidden w-full">
                                    <Image
                                        src={partner.logoUrl}
                                        alt={partner.name}
                                        width={600}
                                        height={400}
                                        className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                  </div>
                                  <CardHeader className='items-center'>
                                      <CardTitle>{partner.name}</CardTitle>
                                  </CardHeader>
                                  <CardContent className="flex-1">
                                      <CardDescription>{partner.description}</CardDescription>
                                  </CardContent>
                                  <CardFooter>
                                      {partner.link && (
                                          <Button asChild variant="outline">
                                              <Link href={partner.link} target="_blank">
                                                  Saiba Mais <ArrowRight className="ml-2 h-4 w-4" />
                                              </Link>
                                          </Button>
                                      )}
                                  </CardFooter>
                               </Card>
                           </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious className="ml-16" />
                <CarouselNext className="mr-16" />
            </Carousel>
            )}
        </section>
    );
}
