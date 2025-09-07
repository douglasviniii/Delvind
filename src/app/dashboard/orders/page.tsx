
'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Truck, Package, HelpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

type OrderProduct = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
};

type Order = {
  id: string;
  createdAt: any;
  amountTotal: number;
  status: 'Pendente' | 'Processando' | 'Enviado' | 'Entregue' | 'Cancelado';
  products: OrderProduct[];
  shippingDetails?: {
      address: {
          line1: string;
          line2?: string;
          city: string;
          state: string;
          postal_code: string;
          country: string;
      }
  }
};

export default function MyOrdersPage() {
  const [user, authLoading] = useAuthState(auth);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [supportMessage, setSupportMessage] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (authLoading || !user) {
      if (!authLoading) setLoading(false);
      return;
    }

    const ordersQuery = query(collection(db, 'orders'), where('customerDetails.email', '==', user.email), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching orders: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading]);

  const handleSupportRequest = async () => {
    if (!selectedOrder || !supportMessage.trim() || !user) return;
    
    try {
        await addDoc(collection(db, 'supportRequests'), {
            orderId: selectedOrder.id,
            userId: user.uid,
            userName: user.displayName,
            userEmail: user.email,
            message: supportMessage,
            status: 'Pendente',
            createdAt: serverTimestamp(),
        });
        toast({ title: "Solicitação Enviada!", description: "Nossa equipe de suporte entrará em contato em breve." });
        setIsSupportModalOpen(false);
        setSupportMessage('');
    } catch(error) {
        toast({ title: 'Erro', description: 'Não foi possível enviar sua solicitação.', variant: 'destructive'});
    }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatDate = (timestamp: any) => timestamp?.toDate().toLocaleDateString('pt-BR') || 'N/A';

  const getStatusBadge = (status: Order['status']) => {
    const variants = {
      Pendente: 'bg-yellow-500',
      Processando: 'bg-blue-500',
      Enviado: 'bg-orange-500',
      Entregue: 'bg-green-600',
      Cancelado: 'bg-red-600',
    };
    return <Badge className={`text-white ${variants[status]}`}>{status}</Badge>;
  };

  return (
    <>
    <Dialog open={isSupportModalOpen} onOpenChange={setIsSupportModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Solicitar Suporte para o Pedido</DialogTitle>
                <DialogDescription>
                    Descreva o problema ou a dúvida sobre seu pedido #{selectedOrder?.id.slice(0, 6).toUpperCase()}.
                </DialogDescription>
            </DialogHeader>
            <div className='py-4 space-y-2'>
                <Label htmlFor='support-message'>Sua mensagem</Label>
                <Textarea 
                    id="support-message"
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    placeholder="Ex: Gostaria de saber mais sobre o prazo de entrega..."
                />
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsSupportModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleSupportRequest}>Enviar Solicitação</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <Card>
      <CardHeader>
        <CardTitle>Meus Pedidos</CardTitle>
        <CardDescription>Acompanhe o status e os detalhes dos seus pedidos.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : orders.length > 0 ? (
          <div className="space-y-6">
            {orders.map(order => (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="bg-muted/50 p-4 flex flex-col sm:flex-row justify-between">
                  <div>
                    <CardTitle className="text-base">Pedido #{order.id.slice(0, 6).toUpperCase()}</CardTitle>
                    <CardDescription>Realizado em: {formatDate(order.createdAt)}</CardDescription>
                  </div>
                  <div className='mt-2 sm:mt-0'>
                    {getStatusBadge(order.status)}
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {order.products.map(product => (
                      <div key={product.productId} className="flex justify-between items-center text-sm">
                        <p>{product.name} (x{product.quantity})</p>
                        <p>{formatCurrency(product.price * product.quantity)}</p>
                      </div>
                    ))}
                  </div>
                  <hr className="my-3"/>
                  <div className="flex justify-between font-semibold">
                    <p>Total do Pedido</p>
                    <p>{formatCurrency(order.amountTotal)}</p>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/50 p-4 flex justify-end gap-2">
                   <Button variant="outline" size="sm">
                     <Truck className='w-4 h-4 mr-2'/> Acompanhar Entrega
                   </Button>
                   <Button variant="secondary" size="sm" onClick={() => { setSelectedOrder(order); setIsSupportModalOpen(true); }}>
                     <HelpCircle className='w-4 h-4 mr-2'/> Solicitar Suporte
                   </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <h3 className="text-xl font-semibold">Nenhum pedido encontrado</h3>
            <p className="text-muted-foreground mt-2 mb-4">
              Parece que você ainda não fez nenhuma compra.
            </p>
            <Button asChild>
              <Link href="/loja">Ir para a Loja</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
}
