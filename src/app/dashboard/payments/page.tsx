'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '../../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';
import Link from 'next/link';
import { DollarSign, Copy, CheckCircle, Clock, CreditCard, Barcode, AlertTriangle, Send } from 'lucide-react';
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

type FinancialRecord = {
  id: string;
  title: string;
  totalAmount: number;
  status: 'A Receber' | 'Cobrança Enviada' | 'Recebido' | 'Pagamento Enviado' | 'Atrasado';
  createdAt: any;
  dueDate?: any;
  paymentLink?: string;
  boletoCode?: string;
};

export default function CustomerPaymentsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [pendingRecords, setPendingRecords] = useState<FinancialRecord[]>([]);
  const [paidRecords, setPaidRecords] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBoletoModalOpen, setIsBoletoModalOpen] = useState(false);
  const [selectedBoletoCode, setSelectedBoletoCode] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (authLoading || !user) {
      if (!authLoading) setLoading(false);
      return;
    };
    
    // Query for pending, sent, and overdue invoices
    const pendingQuery = query(
        collection(db, 'finance'), 
        where('clientId', '==', user.uid),
        where('status', 'in', ['Cobrança Enviada', 'Pagamento Enviado', 'Atrasado']),
        orderBy('dueDate', 'asc')
    );
    
    // Query for paid invoices
    const paidQuery = query(
        collection(db, 'finance'),
        where('clientId', '==', user.uid),
        where('status', '==', 'Recebido'),
        orderBy('createdAt', 'desc')
    );
    
    const unsubscribePending = onSnapshot(pendingQuery, (snapshot) => {
        setPendingRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinancialRecord)));
        if(loading) setLoading(false);
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

  const handleMarkAsPaid = async (recordId: string) => {
    try {
        const recordRef = doc(db, 'finance', recordId);
        await updateDoc(recordRef, { 
            status: 'Pagamento Enviado',
        });
        toast({ title: 'Aviso Enviado!', description: 'A administração foi notificada sobre seu pagamento e irá confirmar em breve.' });
    } catch (error) {
        toast({ title: 'Erro', description: 'Não foi possível notificar o pagamento.', variant: 'destructive' });
    }
  }

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
    if (record.status === 'Atrasado') {
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
        return { text: record.status, icon: null, className: '' };
    }
  }

  const renderPaymentActions = (record: FinancialRecord) => {
    if (record.status === 'Cobrança Enviada' || record.status === 'Atrasado') {
      return (
        <div className="flex flex-col sm:flex-row items-stretch gap-2 mt-4">
          {record.paymentLink && (
            <Button asChild size="sm" className="w-full">
              <Link href={record.paymentLink} target="_blank"><CreditCard className='mr-2 h-4 w-4'/>Pagar com Cartão/Pix</Link>
            </Button>
          )}
          {record.boletoCode && (
            <Button variant="secondary" size="sm" className="w-full" onClick={() => handleOpenBoletoModal(record.boletoCode!)}>
              <Barcode className='mr-2 h-4 w-4'/>Pagar com Boleto
            </Button>
          )}
           {(record.status === 'Cobrança Enviada' || record.status === 'Atrasado') && (
            <AlertDialog>
                <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full"><Send className='mr-2 h-4 w-4'/>Já Paguei</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Envio de Pagamento?</AlertDialogTitle>
                    <AlertDialogDescription>
                    Esta ação notificará a administração que você realizou o pagamento desta fatura. A confirmação final será feita pela equipe da Delvind.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleMarkAsPaid(record.id)}>Sim, já paguei</AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
           )}
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
                         {!isHistory && renderPaymentActions(record)}
                    </CardContent>
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
                {!isHistory && <TableHead className="text-right">Ações</TableHead>}
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
                            {renderPaymentActions(record)}
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Faturas e Pagamentos</h1>
          <p className="text-muted-foreground">Visualize e gerencie suas faturas pendentes e histórico de pagamentos.</p>
        </div>
      </div>

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
                        <CardTitle>Minhas Faturas Pendentes</CardTitle>
                        <CardDescription>Aqui estão todas as suas cobranças em aberto. Pagamentos recebidos desaparecerão desta lista.</CardDescription>
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
