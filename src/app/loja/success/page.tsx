'use client';

import { useEffect } from 'react';
import { useCart } from '@/context/cart-context';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function SuccessPageClient({ sessionId }: { sessionId: string }) {
  const { clearCart } = useCart();

  useEffect(() => {
    if (sessionId) clearCart();
  }, [sessionId, clearCart]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)] bg-gray-50">
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-white via-pink-100 to-blue-200" />
      <Card className="w-full max-w-lg text-center shadow-lg">
        <CardHeader className="items-center">
          <div className="p-3 bg-green-100 rounded-full w-fit">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <CardTitle className="text-2xl mt-4">Pagamento Realizado com Sucesso!</CardTitle>
          <CardDescription>
            Obrigado pela sua compra. Seu pedido foi recebido e está sendo processado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            ID da Transação: <span className="font-mono">{sessionId}</span>
          </p>
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <Button asChild className="w-full">
            <Link href="/dashboard/orders">Acompanhar Meus Pedidos</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/loja">Continuar Comprando</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
