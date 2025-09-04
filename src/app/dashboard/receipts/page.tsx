'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '../../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import Link from 'next/link';
import { Receipt, Eye, DollarSign, Calendar } from 'lucide-react';
import { Skeleton } from '../../../components/ui/skeleton';
import { useToast } from '../../../hooks/use-toast';
import type { User } from 'firebase/auth';

type ReceiptData = {
  id: string;
  title: string;
  paidAt: any;
  totalAmount: number;
  viewedByClient: boolean;
};

export default function CustomerReceiptsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(!currentUser);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
        if (!loading) setLoading(false);
        return;
    };

    const q = query(
        collection(db, 'receipts'), 
        where('clientId', '==', user.uid),
        orderBy('paidAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const receiptsData: ReceiptData[] = [];
      querySnapshot.forEach((doc) => {
        receiptsData.push({ id: doc.id, ...doc.data() } as ReceiptData);
      });
      setReceipts(receiptsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching receipts: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, loading]);

  const handleMarkAsViewed = async (receiptId: string) => {
      try {
          const receiptRef = doc(db, 'receipts', receiptId);
          await updateDoc(receiptRef, { viewedByClient: true });
      } catch (error) {
          toast({title: "Erro", description: "Não foi possível marcar o recibo como visto.", variant: "destructive"})
      }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  const formatDate = (timestamp: any) => {
    if (timestamp && timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString('pt-BR');
    }
    return 'Data inválida';
  }
  
  const renderMobileList = () => (
     <div className="md:hidden space-y-4">
        {receipts.map((receipt) => (
             <Card key={receipt.id}>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                      {receipt.title}
                       {!receipt.viewedByClient && (
                          <span className="relative flex h-2 w-2 ml-auto">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                          </span>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                        <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /><span>{formatDate(receipt.paidAt)}</span></div>
                        <div className="flex items-center gap-1.5"><DollarSign className="h-3 w-3" /><span>{formatCurrency(receipt.totalAmount)}</span></div>
                    </div>
                </CardHeader>
                <CardFooter>
                     <Button asChild variant="outline" size="sm" className="w-full" onClick={() => handleMarkAsViewed(receipt.id)}>
                        <Link href={`/dashboard/receipts/${receipt.id}`}><Eye className="mr-2 h-4 w-4" /> Ver/Baixar</Link>
                      </Button>
                </CardFooter>
            </Card>
        ))}
     </div>
  );
  
  const renderDesktopTable = () => (
     <Table className="hidden md:table">
        <TableHeader>
            <TableRow>
            <TableHead>Descrição</TableHead>
            <TableHead>Data do Pagamento</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead className="text-right">Ações</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {receipts.map((receipt) => (
                <TableRow key={receipt.id}>
                <TableCell className="font-medium flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                    {receipt.title}
                    {!receipt.viewedByClient && (
                        <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                    )}
                </TableCell>
                <TableCell>{formatDate(receipt.paidAt)}</TableCell>
                <TableCell>{formatCurrency(receipt.totalAmount)}</TableCell>
                <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm" onClick={() => handleMarkAsViewed(receipt.id)}>
                    <Link href={`/dashboard/receipts/${receipt.id}`}><Eye className="mr-2 h-4 w-4" /> Ver/Baixar</Link>
                    </Button>
                </TableCell>
                </TableRow>
            ))}
        </TableBody>
    </Table>
  );


  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Meus Comprovantes</h1>
          <p className="text-muted-foreground">Visualize o histórico de todos os seus pagamentos confirmados.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Pagamentos</CardTitle>
          <CardDescription>Aqui estão todos os comprovantes de pagamentos recebidos pela Delvind.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
            </div>
          ) : receipts.length > 0 ? (
            <>
                {renderMobileList()}
                {renderDesktopTable()}
            </>
          ) : (
            <div className="text-center h-24 flex items-center justify-center">
                 <p className="text-muted-foreground">Nenhum comprovante encontrado.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
