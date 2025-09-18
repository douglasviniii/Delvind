'use client';

import { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, getDoc } from 'firebase/firestore';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';
import Link from 'next/link';
import { DollarSign, Copy, CheckCircle, Clock, CreditCard, Barcode, AlertTriangle, Send, Loader2 } from 'lucide-react';
import { Skeleton } from '../../../components/ui/skeleton';
import { useToast } from '../../../hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../../components/ui/alert-dialog"
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter } from '../../../components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/tabs';
import { User } from 'firebase/auth';
import { differenceInCalendarDays, isPast, startOfDay } from 'date-fns';
import { loadStripe } from '@stripe/stripe-js';


type FinancialRecord = {
  id: string;
  title: string;
  totalAmount: number;
  status: 'A Receber' | 'Cobrança Enviada' | 'Recebido' | 'Pagamento Enviado' | 'Atrasado';
  createdAt: any;
  dueDate?: any;
  gracePeriodEndDate?: any;
  paymentLink?: string;
  boletoCode?: string;
  originalBudgetId?: string;
  interestRate?: number;
};

type Budget = {
    total: number;
}


export default function CustomerPaymentsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [pendingRecords, setPendingRecords] = useState<FinancialRecord[]>([]);
  const [paidRecords, setPaidRecords] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBoletoModalOpen, setIsBoletoModalOpen] = useState(false);
  const [selectedBoletoCode, setSelectedBoletoCode] = useState('');
  const { toast } = useToast();
  const [isProcessingStripe, setIsProcessingStripe] = useState<string | null>(null);


  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
        setLoading(false);
        return;
    };
    
    const pendingQuery = query(
        collection(db, 'finance'), 
        where('clientId', '==', user.uid),
        where('status', 'in', ['Cobrança Enviada', 'Atrasado', 'Pagamento Enviado']),
        orderBy('dueDate', 'asc')
    );
    
    const paidQuery = query(
        collection(db, 'finance'),
        where('clientId', '==', user.uid),
        where('status', '==', 'Recebido'),
        orderBy('createdAt', 'desc')
    );
    
    const unsubscribePending = onSnapshot(pendingQuery, (snapshot) => {
        setPendingRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinancialRecord)));
        setLoading(false);
    }, (error) => { setLoading(false); console.error("Error fetching pending records:", error) });

    const unsubscribePaid = onSnapshot(paidQuery, (snapshot) => {
      setPaidRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinancialRecord)));
    }, (error) => { console.error("Error fetching paid records:", error)});

    return () => {
        unsubscribePending();
        unsubscribePaid();
    }
  }, [user, authLoading]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copiado!", description: "O código do boleto foi copiado para a área de transferência." });
  }

  const handleOpenBoletoModal = (code: string) => {
    setSelectedBoletoCode(code);
    setIsBoletoModalOpen(true);
  }

 const handleStripeCheckout = async (record: FinancialRecord) => {
    if (!user) return;
    setIsProcessingStripe(record.id);

    let finalAmount = record.totalAmount;

    try {
      const isOverdue = record.status === 'Atrasado' || (record.gracePeriodEndDate && isPast(startOfDay(record.gracePeriodEndDate.toDate())));
      if (isOverdue && record.originalBudgetId && record.interestRate) {
        const budgetRef = doc(db, 'budgets', record.originalBudgetId);
        const budgetSnap = await getDoc(budgetRef);
        if (budgetSnap.exists()) {
          const budgetData = budgetSnap.data() as Budget;
          const daysOverdue = differenceInCalendarDays(new Date(), record.gracePeriodEndDate.toDate());
          if (daysOverdue > 0) {
            const dailyRate = (record.interestRate / 100) / 30;
            const interestAmount = budgetData.total * dailyRate * daysOverdue;
            finalAmount += interestAmount;
            toast({
              title: "Juros por Atraso Aplicados",
              description: `Foram adicionados ${formatCurrency(interestAmount)} de juros ao valor final.`,
              duration: 6000,
            });
          }
        }
      }

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      const customerEmail = userDoc.exists() ? userDoc.data().email : user.email;

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          financeRecordId: record.id,
          amount: finalAmount,
          title: record.title,
          customerEmail: customerEmail,
        }),
      });

      const { sessionId, sessionUrl, error } = await response.json();
      if (error) throw new Error(error);
        
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

      if (stripe && sessionId) {
        const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });
        if (stripeError) {
          console.error("Stripe checkout error:", stripeError);
          if (sessionUrl) window.location.href = sessionUrl;
          else throw stripeError;
        }
      } else if (sessionUrl) {
         window.location.href = sessionUrl;
      } else {
        throw new Error("Não foi possível obter a sessão de checkout.");
      }
    } catch (error: any) {
      toast({ title: 'Erro ao Pagar', description: error.message, variant: 'destructive' });
    } finally {
      setIsProcessingStripe(null);
    }
  };


  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  const formatDate = (timestamp: any) => {
    if (timestamp && timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString('pt-BR');
    }
    return 'Data inválida';
  }
  
  const getStatusInfo = (record: FinancialRecord) => {
    const isOverdue = record.gracePeriodEndDate && isPast(startOfDay(record.gracePeriodEndDate.toDate()));
     if (record.status !== 'Recebido' && isOverdue) {
      return { text: 'Vencido', icon: <AlertTriangle className="mr-2 h-4 w-4 text-red-500" />, className: 'bg-red-100 text-red-800' };
    }
    switch (record.status) {
      case 'Cobrança Enviada':
        return { text: 'Aguardando Pagamento', icon: <Clock className="mr-2 h-4 w-4 text-orange-500" />, className: 'bg-orange-100 text-orange-800' };
      case 'Pagamento Enviado':
        return { text: 'Pagamento em análise', icon: <CheckCircle className="mr-2 h-4 w-4 text-purple-500" />, className: 'bg-purple-100 text-purple-800' };
      case 'Recebido':
        return { text: 'Pago', icon: <CheckCircle className="mr-2 h-4 w-4 text-green-500" />, className: 'bg-green-100 text-green-800' };
      default:
        return { text: record.status, icon: <Clock className="mr-2 h-4 w-4 text-blue-500" />, className: 'bg-blue-100 text-blue-800' };
    }
  }

  const handleInformPayment = async (record: FinancialRecord) => {
    const recordRef = doc(db, 'finance', record.id);
    try {
        await updateDoc(recordRef, {
            status: 'Pagamento Enviado'
        });
        toast({
            title: "Pagamento Informado!",
            description: "A equipe da Delvind irá analisar seu pagamento e confirmar o recebimento em breve."
        });
    } catch(e) {
        toast({title: "Erro", description: "Não foi possível informar o pagamento.", variant: "destructive"});
    }
  }

  const renderPaymentActions = (record: FinancialRecord) => {
    const isOverdue = record.status === 'Atrasado' || (record.gracePeriodEndDate && isPast(startOfDay(record.gracePeriodEndDate.toDate())));
  
    if (record.status === 'Cobrança Enviada' || isOverdue) {
      return (
        <div className="flex flex-col sm:flex-row items-stretch gap-2">
           <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="flex-1">
                        <Send className='mr-2 h-4 w-4'/>Informar Pagamento
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Informar Pagamento Realizado</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação notificará nossa equipe que você já efetuou o pagamento desta fatura. Usaremos isso para confirmar o recebimento. Deseja continuar?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleInformPayment(record)}>Sim, informar pagamento</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          {record.boletoCode && (
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => handleOpenBoletoModal(record.boletoCode!)}>
              <Barcode className='mr-2 h-4 w-4'/>Boleto
            </Button>
          )}
           <Button size="sm" className="flex-1" onClick={() => handleStripeCheckout(record)} disabled={isProcessingStripe === record.id}>
            {isProcessingStripe === record.id ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <CreditCard className='mr-2 h-4 w-4' />}
            {isProcessingStripe === record.id ? 'Processando...' : 'Pagar com Cartão'}
          </Button>
        </div>
      );
    }
  
    if (record.status === 'Pagamento Enviado') {
      return <Badge variant="secondary" className='bg-gray-200 text-gray-700 mt-2'>Pagamento em análise</Badge>;
    }
  
    return null;
  }
  
  const renderList = (data: FinancialRecord[], isHistory = false) => (
    <>
       {/* Mobile View */}
       <div className="md:hidden space-y-4">
            {data.map((record) => (
                <Card key={record.id}>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base">{record.title}</CardTitle>
                        <CardDescription>Vencimento: {formatDate(record.dueDate)}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center border-t pt-4">
                            <span className="text-muted-foreground text-sm">Valor:</span>
                            <span className="font-bold">{formatCurrency(record.totalAmount)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground text-sm">Status:</span>
                            <Badge className={getStatusInfo(record).className}>
                                {getStatusInfo(record).icon}
                                {getStatusInfo(record).text}
                            </Badge>
                        </div>
                    </CardContent>
                    {!isHistory && (
                        <CardFooter>
                             {renderPaymentActions(record)}
                        </CardFooter>
                    )}
                </Card>
            ))}
       </div>

       {/* Desktop View */}
       <Table className="hidden md:table">
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                {!isHistory && <TableHead className="text-right w-[400px]">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.title}</TableCell>
                    <TableCell>{formatDate(record.dueDate)}</TableCell>
                    <TableCell>{formatCurrency(record.totalAmount)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusInfo(record).className}>
                        {getStatusInfo(record).icon}
                        {getStatusInfo(record).text}
                      </Badge>
                    </TableCell>
                    {!isHistory && (
                        <TableCell className="text-right">
                           <div className="flex justify-end gap-2">
                             {renderPaymentActions(record)}
                           </div>
                        </TableCell>
                    )}
                  </TableRow>
                ))}
            </TableBody>
        </Table>
    </>
  );

  return (
    <>
      <Dialog open={isBoletoModalOpen} onOpenChange={setIsBoletoModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Código do Boleto</DialogTitle>
                <DialogDescription>Copie o código abaixo para pagar no seu aplicativo bancário.</DialogDescription>
            </DialogHeader>
            <div className='p-4 bg-muted rounded-md font-mono text-center break-words'>
                {selectedBoletoCode}
            </div>
            <DialogFooter>
                <Button onClick={() => handleCopyCode(selectedBoletoCode)}><Copy className="mr-2 h-4 w-4"/> Copiar Código</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className='p-0'>
            <Tabs defaultValue="pending" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="pending">Faturas Pendentes</TabsTrigger>
                    <TabsTrigger value="history">Histórico de Pagamentos</TabsTrigger>
                </TabsList>
                <TabsContent value="pending" className='p-4 md:p-6'>
                    <CardHeader className='p-0 pb-4'>
                        <CardTitle>Minhas Faturas</CardTitle>
                        <CardDescription>Aqui estão todas as suas cobranças em aberto. Pagamentos confirmados aparecerão no histórico.</CardDescription>
                    </CardHeader>
                    {loading ? (
                         <div className="space-y-4">
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                        </div>
                    ) : pendingRecords.length > 0 ? (
                        renderList(pendingRecords, false)
                    ) : (
                        <div className="text-center h-24 flex items-center justify-center">
                            <p className="text-muted-foreground">Você não possui nenhuma fatura pendente no momento.</p>
                        </div>
                    )}
                </TabsContent>
                <TabsContent value="history" className='p-4 md:p-6'>
                    <CardHeader className='p-0 pb-4'>
                        <CardTitle>Seu Histórico</CardTitle>
                        <CardDescription>Aqui estão todas as faturas que já foram confirmadas como pagas.</CardDescription>
                    </CardHeader>
                    {loading ? (
                         <div className="space-y-4">
                            <Skeleton className="h-24 w-full" />
                        </div>
                    ) : paidRecords.length > 0 ? (
                        renderList(paidRecords, true)
                    ) : (
                         <div className="text-center h-24 flex items-center justify-center">
                            <p className="text-muted-foreground">Nenhuma fatura paga encontrada.</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </CardContent>
      </Card>
    </>
  );
}
