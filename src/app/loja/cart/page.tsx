
'use client';

import { Header } from '@/components/layout/header';
import { FooterSection } from '@/components/layout/footer-section';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Trash2, Loader2, Truck, CheckCircle, Plus, Minus } from 'lucide-react';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/context/cart-context';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { loadStripe } from '@stripe/stripe-js';

const ShippingCalculator = () => {
    const { setShippingInfo, cartRequiresShipping, subtotal } = useCart();
    const [cep, setCep] = useState('');
    const [loading, setLoading] = useState(false);
    const [calculated, setCalculated] = useState(false);

    // Check if all items requiring shipping have free shipping
    const allItemsHaveFreeShipping = useCart().cartItems
        .filter(item => item.requiresShipping)
        .every(item => item.freeShipping);

    const handleCalculateShipping = () => {
        if (!cep.trim() || cep.replace(/\D/g, '').length !== 8) {
            alert('Por favor, insira um CEP válido.');
            return;
        }
        setLoading(true);
        
        // Simulação de chamada de API de frete
        setTimeout(() => {
            const shippingCost = allItemsHaveFreeShipping ? 0 : subtotal * 0.05 + 5; // 5% do subtotal + 5 reais fixo, ou 0 se todos os itens tem frete grátis
            const deliveryTime = Math.floor(Math.random() * 5) + 3; // 3 a 7 dias

            setShippingInfo({
                cep,
                cost: shippingCost,
                deliveryTime: `${deliveryTime} dias úteis`,
            });
            setLoading(false);
            setCalculated(true);
        }, 1000);
    };

    if (!cartRequiresShipping) {
        return null;
    }
    
    if (allItemsHaveFreeShipping) {
        return (
            <div className='mt-4 p-4 bg-green-100 text-green-800 rounded-md flex items-center gap-2'>
                <Truck className='w-5 h-5'/>
                <p className='font-semibold'>Frete Grátis para todos os itens no seu carrinho!</p>
            </div>
        )
    }

    return (
        <div className='mt-4 space-y-2'>
            <label htmlFor="cep" className='font-medium'>Calcular Frete</label>
            <div className='flex gap-2'>
                <Input 
                    id="cep"
                    placeholder="Seu CEP" 
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                />
                <Button onClick={handleCalculateShipping} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : "Calcular"}
                </Button>
            </div>
            {calculated && (
                <p className='text-sm text-muted-foreground flex items-center gap-2'>
                    <CheckCircle className='w-4 h-4 text-green-600'/>
                    Frete calculado com sucesso. Você pode prosseguir para o checkout.
                </p>
            )}
        </div>
    );
};


export default function CartPage() {
  const { cartItems, removeFromCart, updateQuantity, subtotal, total, shippingInfo, cartRequiresShipping } = useCart();
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const { toast } = useToast();
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };
  
  const allItemsHaveFreeShipping = cartItems
        .filter(item => item.requiresShipping)
        .every(item => item.freeShipping);

  const handleCheckout = async () => {
    setLoadingCheckout(true);
    if (cartRequiresShipping && !shippingInfo && !allItemsHaveFreeShipping) {
        toast({ title: 'Aviso', description: 'Por favor, calcule o frete antes de finalizar a compra.', variant: 'default'});
        setLoadingCheckout(false);
        return;
    }
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cartItems, shippingCost: (cartRequiresShipping && !allItemsHaveFreeShipping) ? (shippingInfo?.cost || 0) : 0 }),
      });

      const { sessionId, sessionUrl, error } = await response.json();

      if (error) {
        throw new Error(error);
      }
      
      if (sessionUrl) {
          window.location.href = sessionUrl;
      } else {
        // Fallback for older Stripe versions or just in case
        const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
        if (stripe && sessionId) {
            await stripe.redirectToCheckout({ sessionId });
        } else {
            throw new Error("Falha ao obter sessão do Stripe.");
        }
      }
    } catch (error: any) {
      toast({
        title: 'Erro no Checkout',
        description: error.message || 'Não foi possível iniciar o processo de pagamento. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoadingCheckout(false);
    }
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
                                             <div className="flex items-center gap-1 border rounded-md">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus className="h-4 w-4" /></Button>
                                                <Input 
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                                                    className="w-12 h-8 text-center border-0 focus-visible:ring-0"
                                                />
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus className="h-4 w-4" /></Button>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)}>
                                                <Trash2 className="w-4 h-4 text-destructive"/>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                <ShippingCalculator />
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
                            <div className='flex justify-between text-muted-foreground'>
                                <span>Subtotal</span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
                             {shippingInfo && !allItemsHaveFreeShipping && (
                                <div className='flex justify-between text-muted-foreground'>
                                    <span>Frete</span>
                                    <div className='text-right'>
                                        <p>{formatCurrency(shippingInfo.cost)}</p>
                                        <p className='text-xs'>({shippingInfo.deliveryTime})</p>
                                    </div>
                                </div>
                            )}
                             {allItemsHaveFreeShipping && (
                                <div className='flex justify-between text-green-600 font-semibold'>
                                    <span>Frete</span>
                                    <div className='text-right'>
                                        <p>Grátis</p>
                                    </div>
                                </div>
                            )}
                            <div className='flex justify-between font-bold text-lg'>
                                <span>Total</span>
                                <span>{formatCurrency(total)}</span>
                            </div>
                            <Button size="lg" className="w-full" onClick={handleCheckout} disabled={loadingCheckout}>
                                {loadingCheckout ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {loadingCheckout ? 'Aguarde...' : 'Finalizar Compra'}
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

