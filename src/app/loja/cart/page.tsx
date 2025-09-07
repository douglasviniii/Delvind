'use client';

import { Header } from '@/components/layout/header';
import { FooterSection } from '@/components/layout/footer-section';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Trash2, Loader2, Truck, CheckCircle } from 'lucide-react';
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

    const handleCalculateShipping = () => {
        if (!cep.trim() || cep.replace(/\D/g, '').length !== 8) {
            alert('Por favor, insira um CEP válido.');
            return;
        }
        setLoading(true);
        
        // Simulação de chamada de API de frete
        setTimeout(() => {
            const shippingCost = subtotal * 0.05 + 5; // 5% do subtotal + 5 reais fixo
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

  const handleCheckout = async () => {
    setLoadingCheckout(true);
    if (cartRequiresShipping && !shippingInfo) {
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
        body: JSON.stringify({ cartItems, shippingCost: shippingInfo?.cost || 0 }),
      });

      const { sessionId, error } = await response.json();

      if (error) {
        throw new Error(error);
      }

      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!);
      if (stripe) {
        const { error } = await stripe.redirectToCheckout({ sessionId });
        if (error) {
          throw new Error(error.message);
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
                             {shippingInfo && (
                                <div className='flex justify-between text-muted-foreground'>
                                    <span>Frete</span>
                                    <div className='text-right'>
                                        <p>{formatCurrency(shippingInfo.cost)}</p>
                                        <p className='text-xs'>({shippingInfo.deliveryTime})</p>
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
