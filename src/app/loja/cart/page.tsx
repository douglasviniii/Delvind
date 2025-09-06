
'use client';

import { Header } from '@/components/layout/header';
import { FooterSection } from '@/components/layout/footer-section';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/context/cart-context';
import Image from 'next/image';
import { Input } from '@/components/ui/input';

export default function CartPage() {
  const { cartItems, removeFromCart, updateQuantity, total } = useCart();
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="relative isolate">
            <div className="fixed inset-0 -z-10 bg-gradient-to-br from-white via-pink-100 to-blue-200" />
             <div className="container py-12 md:py-20">
                <Card className="max-w-4xl mx-auto">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-2xl">
                            <ShoppingCart className="w-6 h-6" />
                            Seu Carrinho de Compras
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {cartItems.length > 0 ? (
                            <div className='space-y-4'>
                                {cartItems.map(item => (
                                    <div key={item.id} className="flex items-center gap-4 border-b pb-4">
                                        <Image src={item.imageUrl} alt={item.name} width={80} height={80} className="rounded-md object-cover"/>
                                        <div className='flex-1'>
                                            <h4 className='font-semibold'>{item.name}</h4>
                                            <p className='text-sm text-primary'>{formatCurrency(item.promoPrice || item.price)}</p>
                                        </div>
                                        <div className='flex items-center gap-2'>
                                            <Input 
                                                type="number" 
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
                                                className="w-16 text-center"
                                            />
                                            <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)}>
                                                <Trash2 className="w-4 h-4 text-destructive"/>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 border-2 border-dashed rounded-lg">
                                <h3 className="text-xl font-semibold">Seu carrinho está vazio</h3>
                                <p className="text-muted-foreground mt-2 mb-4">
                                    Adicione produtos da nossa loja para vê-los aqui.
                                </p>
                                <Button asChild>
                                    <Link href="/loja">Voltar para a Loja</Link>
                                </Button>
                            </div>
                        )}
                    </CardContent>
                    {cartItems.length > 0 && (
                        <CardFooter className='flex-col items-stretch space-y-4'>
                            <Separator />
                            <div className='flex justify-between font-bold text-lg'>
                                <span>Total</span>
                                <span>{formatCurrency(total)}</span>
                            </div>
                            <Button size="lg" className="w-full">
                                Finalizar Compra
                            </Button>
                        </CardFooter>
                    )}
                </Card>
             </div>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
