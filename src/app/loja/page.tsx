
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, where, doc, getDoc } from 'firebase/firestore';
import { Header } from '@/components/layout/header';
import { FooterSection } from '@/components/layout/footer-section';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  promoPrice?: number;
  imageUrl: string;
  label?: string;
  categoryId: string;
};

type Category = {
    id: string;
    name: string;
}

const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return '';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function StorePage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const categoriesQuery = query(collection(db, 'store_categories'), orderBy('name'));
        const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
            setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
        });

        let productsQuery;
        if (selectedCategory === 'all') {
            productsQuery = query(collection(db, 'store_products'), orderBy('name'));
        } else {
            productsQuery = query(collection(db, 'store_products'), where('categoryId', '==', selectedCategory), orderBy('name'));
        }
        
        const unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
            setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
            setLoading(false);
        });

        return () => {
            unsubscribeCategories();
            unsubscribeProducts();
        };
    }, [selectedCategory]);
    
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="relative isolate">
            <div className="fixed inset-0 -z-10 bg-gradient-to-br from-white via-pink-100 to-blue-200" />
             <div className="container py-12">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">Nossa Loja</h1>
                    <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                    Encontre produtos e soluções de alta qualidade para impulsionar seu negócio.
                    </p>
                </div>
                
                <div className="flex justify-end mb-6">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-[280px]">
                            <SelectValue placeholder="Filtrar por categoria" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Categorias</SelectItem>
                            {categories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {loading ? (
                        Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className='h-96 w-full' />)
                    ) : products.length > 0 ? (
                        products.map(product => (
                             <Card key={product.id} className="flex flex-col overflow-hidden group">
                                <Link href={`/loja/${product.id}`} className="block">
                                    <div className="relative overflow-hidden">
                                    <Image
                                        src={product.imageUrl}
                                        alt={product.name}
                                        width={400}
                                        height={400}
                                        className="w-full h-56 object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                    {product.label && <Badge className="absolute top-2 right-2">{product.label}</Badge>}
                                    </div>
                                </Link>
                                <CardHeader className="flex-1">
                                    <CardTitle className="text-lg">{product.name}</CardTitle>
                                    <p className="text-sm text-muted-foreground h-16 overflow-hidden">{product.description}</p>
                                </CardHeader>
                                <CardContent>
                                     <div className="flex items-baseline justify-center gap-2">
                                        {product.promoPrice ? (
                                            <>
                                            <p className="text-2xl font-bold">{formatCurrency(product.promoPrice)}</p>
                                            <p className="text-sm text-muted-foreground line-through">{formatCurrency(product.price)}</p>
                                            </>
                                        ) : (
                                            <p className="text-2xl font-bold">{formatCurrency(product.price)}</p>
                                        )}
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button className='w-full' asChild>
                                        <Link href={`/loja/${product.id}`}>Ver Detalhes</Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))
                    ) : (
                        <p className="col-span-full text-center text-muted-foreground py-10">Nenhum produto encontrado nesta categoria.</p>
                    )}
                </div>
            </div>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
