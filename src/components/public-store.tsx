
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/context/cart-context';

type Product = {
  id: string;
  name: string;
  price: number;
  promoPrice?: number;
  label?: string;
  stock?: number;
  imageUrls: string[];
  description: string;
  categoryId: string;
  requiresShipping?: boolean;
};

type Category = {
    id: string;
    name: string;
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export function PublicStore() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    setLoading(true);
    const productsQuery = query(collection(db, 'store_products'), orderBy('name', 'asc'));
    const unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      setLoading(false);
    });

    const categoriesQuery = query(collection(db, 'store_categories'), orderBy('name', 'asc'));
    const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
        setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data()} as Category)));
    });

    return () => {
      unsubscribeProducts();
      unsubscribeCategories();
    };
  }, []);
  
  if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-96 w-full" />)}
        </div>
      )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {products.map(product => (
        <Card key={product.id} className="flex flex-col overflow-hidden group">
            <div className="relative overflow-hidden">
                <Link href={`/loja/${product.id}`}>
                    <Image
                    src={product.imageUrls[0]}
                    alt={product.name}
                    width={400}
                    height={300}
                    className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                </Link>
                {product.label && (
                    <Badge className="absolute top-2 right-2" variant="destructive">{product.label}</Badge>
                )}
            </div>
            <CardHeader className="flex-1">
                <CardTitle>
                     <Link href={`/loja/${product.id}`} className='hover:text-primary'>{product.name}</Link>
                </CardTitle>
                <div
                    className="text-sm text-muted-foreground line-clamp-3"
                    dangerouslySetInnerHTML={{ __html: product.description }}
                />
            </CardHeader>
            <CardContent>
                {product.promoPrice ? (
                    <div className='flex items-baseline gap-2'>
                        <p className="text-2xl font-bold">{formatCurrency(product.promoPrice)}</p>
                        <p className="text-sm text-muted-foreground line-through">{formatCurrency(product.price)}</p>
                    </div>
                ) : (
                    <p className="text-2xl font-bold">{formatCurrency(product.price)}</p>
                )}
                 {product.stock !== null && product.stock !== undefined && (
                    <p className={`text-sm mt-1 ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {product.stock > 0 ? `${product.stock} em estoque` : 'Esgotado'}
                    </p>
                )}
            </CardContent>
            <CardFooter>
            <Button className="w-full" disabled={product.stock === 0} onClick={() => addToCart(product)}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              Adicionar ao Carrinho
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
