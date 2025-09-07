
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db, auth, storage } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, onSnapshot, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Header } from '@/components/layout/header';
import { FooterSection } from '@/components/layout/footer-section';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, ShoppingCart, Share2, Shield, Truck, Star, Upload } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Textarea } from '@/components/ui/textarea';
import dynamic from 'next/dynamic';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

const ReactStars = dynamic(() => import('react-rating-stars-component'), { ssr: false });


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

type Review = {
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    rating: number;
    comment: string;
    photos: string[];
    createdAt: any;
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

const ReviewForm = ({ productId }: { productId: string }) => {
    const [user] = useAuthState(auth);
    const { toast } = useToast();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [photos, setPhotos] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setPhotos(Array.from(e.target.files));
        }
    };

    const handleSubmit = async () => {
        if (!user) {
            toast({ title: 'Ação Requerida', description: 'Você precisa estar logado para avaliar.', variant: 'destructive' });
            return;
        }
        if (rating === 0) {
            toast({ title: 'Avaliação Incompleta', description: 'Por favor, selecione uma nota.', variant: 'destructive' });
            return;
        }
        if (!comment.trim()) {
            toast({ title: 'Avaliação Incompleta', description: 'Por favor, escreva um comentário.', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            const photoUrls: string[] = [];
            for (const photo of photos) {
                const storageRef = ref(storage, `reviews/${productId}/${Date.now()}_${photo.name}`);
                await uploadBytes(storageRef, photo);
                const url = await getDownloadURL(storageRef);
                photoUrls.push(url);
            }

            await addDoc(collection(db, 'store_products', productId, 'reviews'), {
                userId: user.uid,
                userName: user.displayName || 'Anônimo',
                userAvatar: user.photoURL,
                rating,
                comment,
                photos: photoUrls,
                createdAt: serverTimestamp(),
            });

            toast({ title: 'Avaliação Enviada!', description: 'Obrigado pelo seu feedback!' });
            setRating(0);
            setComment('');
            setPhotos([]);
        } catch (error) {
            console.error(error);
            toast({ title: 'Erro', description: 'Não foi possível enviar sua avaliação.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!user) {
        return <p className='text-sm text-center text-muted-foreground'>Você precisa estar <Link href="/login" className="underline text-primary">logado</Link> para deixar uma avaliação.</p>;
    }

    return (
        <Card className="mt-8 bg-muted/50">
            <CardHeader>
                <CardTitle>Deixe sua avaliação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className='flex items-center gap-4'>
                    <span className='font-medium'>Sua nota:</span>
                    <ReactStars
                        count={5}
                        onChange={(newRating: number) => setRating(newRating)}
                        size={28}
                        activeColor="#9333ea" // Cor primária
                    />
                </div>
                <Textarea
                    placeholder="Conte-nos o que você achou do produto..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                />
                 <div>
                    <label htmlFor="photo-upload" className="block text-sm font-medium text-gray-700 mb-2">Adicionar fotos (opcional)</label>
                    <Input id="photo-upload" type="file" multiple accept="image/*" onChange={handlePhotoChange} />
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? 'Enviando...' : 'Enviar Avaliação'}
                </Button>
            </CardFooter>
        </Card>
    );
};


export default function ProductDetailPage() {
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
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
      
      const reviewsQuery = query(collection(db, 'store_products', id, 'reviews'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(reviewsQuery, (snapshot) => {
        setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data()} as Review)));
      });
      return () => unsubscribe();
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

                <Separator className="my-12" />
                
                {/* Reviews Section */}
                <div className='max-w-4xl mx-auto'>
                    <h2 className='text-2xl font-bold mb-6'>Avaliações de Clientes</h2>
                    <div className='space-y-8'>
                        {reviews.length > 0 ? reviews.map(review => (
                            <div key={review.id} className='flex gap-4 border-b pb-8'>
                                <Avatar>
                                    <AvatarImage src={review.userAvatar} alt={review.userName} />
                                    <AvatarFallback>{review.userName?.[0]}</AvatarFallback>
                                </Avatar>
                                <div className='flex-1'>
                                    <div className='flex items-center gap-2'>
                                        <p className='font-semibold'>{review.userName}</p>
                                        <p className='text-xs text-muted-foreground'>- {review.createdAt?.toDate().toLocaleDateString('pt-BR')}</p>
                                    </div>
                                    <div className='flex items-center my-1'>
                                        {Array.from({length: 5}).map((_, i) => (
                                            <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                                        ))}
                                    </div>
                                    <p className='text-sm text-muted-foreground'>{review.comment}</p>
                                    {review.photos && review.photos.length > 0 && (
                                        <div className='flex gap-2 mt-4'>
                                            {review.photos.map((photo, i) => (
                                                <Image key={i} src={photo} alt="Foto da avaliação" width={80} height={80} className='rounded-md object-cover' />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )) : (
                            <p className='text-center text-muted-foreground'>Este produto ainda não tem avaliações. Seja o primeiro a avaliar!</p>
                        )}
                    </div>
                     <ReviewForm productId={id} />
                </div>
            </div>
         </div>
      </main>
      <FooterSection />
    </div>
  );
}
