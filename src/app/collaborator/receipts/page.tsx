'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '../../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Receipt, Eye } from 'lucide-react';
import { Skeleton } from '../../../components/ui/skeleton';
import jsPDF from 'jspdf';
import Image from 'next/image';
import { User } from 'firebase/auth';

type ReceiptData = {
  id: string;
  title: string;
  paidAt: any;
  totalAmount: number;
  viewedByCollaborator: boolean;
};

const companyInfo = {
    razaoSocial: 'Delvind Tecnologia Da Informação LTDA',
    cnpj: '57.278.676/0001-69',
    email: 'contato@delvind.com',
    phone: '(45) 98800-0647',
    address: 'R. Jaime Canet, 2062 - Nazaré, Medianeira - PR, 85884-000',
};

export default function CollaboratorReceiptsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [loading, setLoading] = useState(true);

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

    const q = query(
        collection(db, 'receipts'), 
        where('collaboratorId', '==', user.uid),
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
  }, [user, authLoading]);
  
  const handleViewReceipt = async (receipt: ReceiptData) => {
      // Mark as viewed if it hasn't been
      if (!receipt.viewedByCollaborator) {
          const receiptRef = doc(db, 'receipts', receipt.id);
          await updateDoc(receiptRef, { viewedByCollaborator: true });
      }

    const pdf = new jsPDF();
    
    // Header
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Recibo de Pagamento', 105, 20, { align: 'center' });

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(companyInfo.razaoSocial, 20, 40);
    pdf.text(`CNPJ: ${companyInfo.cnpj}`, 20, 45);
    pdf.text(`Endereço: ${companyInfo.address}`, 20, 50);

    // Body
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Recebemos de:', 20, 70);
    pdf.setFont('helvetica', 'normal');
    pdf.text(companyInfo.razaoSocial, 20, 75);

    pdf.setFont('helvetica', 'bold');
    pdf.text('A importância de:', 20, 85);
    pdf.setFont('helvetica', 'normal');
    pdf.text(formatCurrency(receipt.totalAmount), 20, 90);
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('Referente a:', 20, 100);
    pdf.setFont('helvetica', 'normal');
    const splitTitle = pdf.splitTextToSize(receipt.title, 170);
    pdf.text(splitTitle, 20, 105);
    
    // Date
    const paymentDate = receipt.paidAt?.toDate().toLocaleDateString('pt-BR');
    pdf.text(`Medianeira, ${paymentDate}`, 105, 130, { align: 'center'});

    // Signature Line
    pdf.line(65, 160, 145, 160);
    pdf.text('Delvind Tecnologia Da Informação LTDA', 105, 165, { align: 'center'});

    pdf.save(`recibo_${receipt.id.slice(0, 6)}.pdf`);
  };

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
  
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Meus Recibos</h1>
          <p className="text-muted-foreground">Visualize o histórico de todos os seus pagamentos recebidos.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Pagamentos</CardTitle>
          <CardDescription>Aqui estão todos os comprovantes de pagamentos feitos a você.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Data do Pagamento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : receipts.length > 0 ? (
                receipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                      {receipt.title}
                       {!receipt.viewedByCollaborator && (
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                          </span>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(receipt.paidAt)}</TableCell>
                    <TableCell>{formatCurrency(receipt.totalAmount)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleViewReceipt(receipt)}>
                        <Eye className="mr-2 h-4 w-4" /> Ver/Baixar Recibo
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    Nenhum recibo encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
