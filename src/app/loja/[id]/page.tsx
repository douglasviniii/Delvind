
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Header } from '@/components/layout/header';
import { FooterSection } from '@/components/layout/footer-section';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, ShoppingCart, Share2, Shield, Truck } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Card, CardContent } from '@/components/ui/card';
import { useCart } from '@/context/cart-context';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"


type Product = {
  id: string;
  name: string;
  price: number;
  promoPrice?: number;
  promoPrice2?: number;
  label?: string;
  stock?: number;
  imageUrls: string[];
  description: string;
  categoryId: string;
  requiresShipping?: boolean;
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// Component to track and display offers
const SmartOffer = ({ product }: { product: Product }) => {
    const [visitCount, setVisitCount] = useState(0);
    const [showOffer, setShowOffer] = useState(false);
    const { toast } = useToast();
    const { addToCart } = useCart();
    
    useEffect(() => {
        if (!product.id) return;
        const key = `product_visits_${product.id}`;
        const count = parseInt(localStorage.getItem(key) || '0') + 1;
        localStorage.setItem(key, count.toString());
        setVisitCount(count);

        if (count >= 3 && product.promoPrice) {
           setTimeout(() => setShowOffer(true), 2000);
        }
    }, [product.id, product.promoPrice]);

    const handleAcceptOffer = () => {
        addToCart({ ...product, price: product.promoPrice! });
        setShowOffer(false);
        toast({
            title: "Oferta Adicionada!",
            description: `${product.name} foi adicionado ao seu carrinho com o preço promocional.`,
        });
    }
    
    if (!showOffer) return null;

    return (
         <AlertDialog open={showOffer} onOpenChange={setShowOffer}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Uma Oferta Especial Para Você!</AlertDialogTitle>
                    <AlertDialogDescription>
                        Notamos que você tem interesse neste produto. Que tal um preço especial para te ajudar a decidir?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className='py-4 text-center'>
                    <p className='text-lg text-muted-foreground'>De <span className='line-through'>{formatCurrency(product.price)}</span> por apenas</p>
                    <p className='text-4xl font-bold text-primary'>{formatCurrency(product.promoPrice!)}</p>
                </div>
                <AlertDialogFooter>
                <AlertDialogCancel>Não, obrigado</AlertDialogCancel>
                <AlertDialogAction onClick={handleAcceptOffer}>Sim, eu quero!</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};


export default function ProductDetailPage() {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const params = useParams();
  const id = params.id as string;
  const { addToCart } = useCart();

  useEffect(() => {
    if (id) {
      const fetchProduct = async () => {
        setLoading(true);
        const docRef = doc(db, 'store_products', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProduct({ id: docSnap.id, ...docSnap.data() } as Product);
        } else {
          // Handle not found
        }
        setLoading(false);
      };
      fetchProduct();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="container py-12">
            <Skeleton className="h-96 w-full" />
        </main>
        <FooterSection />
      </div>
    );
  }

  if (!product) {
    return <div>Produto não encontrado.</div>;
  }
  
  const hasPromo = product.promoPrice && product.promoPrice < product.price;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
         <div className="relative isolate">
            <div className="fixed inset-0 -z-10 bg-gradient-to-br from-white via-pink-100 to-blue-200" />
            <div className="container py-12">
                <SmartOffer product={product} />
                <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                    {/* Image Gallery */}
                    <div>
                         <Carousel className="w-full">
                            <CarouselContent>
                                {product.imageUrls.map((url, index) => (
                                <CarouselItem key={index}>
                                    <Card>
                                        <CardContent className="flex aspect-square items-center justify-center p-0">
                                            <Image src={url} alt={`${product.name} - imagem ${index + 1}`} width={600} height={600} className="object-cover w-full h-full rounded-lg" />
                                        </CardContent>
                                    </Card>
                                </CarouselItem>
                                ))}
                            </CarouselContent>
                            <CarouselPrevious className='-left-4' />
                            <CarouselNext className='-right-4'/>
                        </Carousel>
                    </div>

                    {/* Product Info */}
                    <div className='space-y-6'>
                        <div>
                            <h1 className="text-3xl lg:text-4xl font-bold">{product.name}</h1>
                        </div>
                        
                        <div className='space-y-2'>
                           {hasPromo ? (
                                <div className='flex items-baseline gap-3'>
                                    <p className="text-4xl font-bold text-primary">{formatCurrency(product.promoPrice!)}</p>
                                    <p className="text-xl text-muted-foreground line-through">{formatCurrency(product.price)}</p>
                                </div>
                            ) : (
                                <p className="text-4xl font-bold text-primary">{formatCurrency(product.price)}</p>
                            )}
                            {product.stock !== null && product.stock !== undefined && (
                                <p className={`text-sm mt-1 font-semibold ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {product.stock > 0 ? `${product.stock} unidades em estoque` : 'Produto Esgotado'}
                                </p>
                            )}
                        </div>
                        
                        <div className='space-y-4'>
                             <Button size="lg" className="w-full" disabled={product.stock === 0} onClick={() => addToCart(product)}>
                                <ShoppingCart className="mr-2 h-5 w-5" />
                                Adicionar ao Carrinho
                            </Button>
                            <div className='grid grid-cols-2 gap-4 text-sm'>
                                <div className='flex items-center gap-2 p-3 border rounded-lg bg-background/50'>
                                    <Truck className='w-5 h-5 text-muted-foreground'/>
                                    <span>{product.requiresShipping ? 'Entrega em todo o Brasil' : 'Produto Digital'}</span>
                                </div>
                                <div className='flex items-center gap-2 p-3 border rounded-lg bg-background/50'>
                                    <Shield className='w-5 h-5 text-muted-foreground'/>
                                    <span>Compra Segura</span>
                                </div>
                            </div>
                        </div>

                         <div className='space-y-4 pt-4 border-t'>
                            <h3 className='font-semibold text-lg'>Descrição do Produto</h3>
                            <div
                                className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
                                dangerouslySetInnerHTML={{ __html: product.description }}
                            />
                        </div>
                    </div>
                </div>
            </div>
         </div>
      </main>
      <FooterSection />
    </div>
  );
}

