
'use client';

import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, UserCircle, Calendar, Heart, Share2 } from "lucide-react";
import { Skeleton } from '../../components/ui/skeleton';
import { Header } from '@/components/layout/header';
import { FooterSection } from '@/components/layout/footer-section';

type BlogPost = {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  imageUrl: string;
  createdAt: any;
  likes?: string[];
};

export default function BlogPage() {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'blog'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost));
        setBlogPosts(posts);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching blog posts: ", error);
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
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="relative isolate">
            <div className="fixed inset-0 -z-10 bg-gradient-to-br from-white via-pink-100 to-blue-200" />
            <div className="container py-12">
              <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">Nosso Blog</h1>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                  Fique por dentro das últimas notícias, insights e tendências do mundo do marketing digital, SEO e desenvolvimento web.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i}><Skeleton className="w-full h-96" /></Card>
                  ))
                ) : (
                  blogPosts.map((post) => (
                    <Card key={post.id} className="flex flex-col overflow-hidden group">
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
