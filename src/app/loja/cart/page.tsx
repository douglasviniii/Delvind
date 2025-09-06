
'use client';

import { Header } from '@/components/layout/header';
import { FooterSection } from '@/components/layout/footer-section';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

export default function CartPage() {
  // Por enquanto, o carrinho está vazio. A lógica será adicionada depois.
  const items: any[] = [];
  const total = 0;

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
                        {items.length > 0 ? (
                            <div>
                                {/* A lógica para listar os itens do carrinho virá aqui */}
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
                    {items.length > 0 && (
                        <CardFooter className='flex-col items-stretch space-y-4'>
                            <Separator />
                            <div className='flex justify-between font-bold text-lg'>
                                <span>Total</span>
                                <span>
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
                                </span>
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
