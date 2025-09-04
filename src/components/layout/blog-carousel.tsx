
'use client';

import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '../ui/carousel';
import { Button } from '../ui/button';
import { ArrowRight, UserCircle, Calendar, Heart, Share2 } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import Autoplay from "embla-carousel-autoplay"


type BlogPost = {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  imageUrl: string;
  createdAt: any;
  likes?: string[];
};

export function BlogCarousel() {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'blog'), orderBy('createdAt', 'desc'), limit(10));
        const unsubscribe = onSnapshot(q, snapshot => {
            setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost)));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);
    
    const formatDate = (timestamp: any) => {
        if (timestamp && timestamp.toDate) {
            return timestamp.toDate().toLocaleDateString('pt-BR');
        }
        return 'Data inválida';
    }

    return (
        <section>
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold font-headline">Últimas do Nosso Blog</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto mt-4">Fique por dentro das novidades e insights do mundo digital.</p>
            </div>
            {loading ? (
                <div className='flex justify-center'>
                     <Skeleton className="h-96 w-full" />
                </div>
            ) : (
            <Carousel
                opts={{ align: "start", loop: true }}
                plugins={[
                    Autoplay({
                      delay: 4000,
                      stopOnInteraction: true,
                    }),
                  ]}
                className="w-full"
            >
                <CarouselContent className="-ml-4">
                    {posts.map(post => (
                        <CarouselItem key={post.id} className="md:basis-1/2 lg:basis-1/3 pl-4">
                            <div className="p-1 h-full">
                                <Card className="flex flex-col h-full overflow-hidden group">
                                     <Link href={`/blog/${post.id}`} className="block">
                                        <div className="relative overflow-hidden">
                                            <Image
                                            src={post.imageUrl}
                                            alt={post.title}
                                            width={600}
                                            height={400}
                                            className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                                            />
                                        </div>
                                    </Link>
                                    <CardHeader className="flex-1">
                                        <CardTitle>
                                            <Link href={`/blog/${post.id}`} className="hover:text-primary transition-colors">{post.title}</Link>
                                        </CardTitle>
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                                            <div className="flex items-center gap-1">
                                            <UserCircle className="w-4 h-4" />
                                            <span>{post.author}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            <span>{formatDate(post.createdAt)}</span>
                                            </div>
                                        </div>
                                        <p className="text-muted-foreground text-sm pt-2">{post.excerpt}</p>
                                    </CardHeader>
                                    <CardFooter className="flex justify-between items-center text-xs text-muted-foreground">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1.5">
                                                <Heart className="w-4 h-4" />
                                                <span>{post.likes?.length || 0}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Share2 className="w-4 h-4" />
                                                <span>Compartilhar</span>
                                            </div>
                                        </div>
                                        <Link href={`/blog/${post.id}`} className="text-primary hover:underline font-semibold">
                                            Ler mais <ArrowRight className="w-3 h-3 inline" />
                                        </Link>
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
