
'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';

import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Separator } from '../../../../components/ui/separator';
import { useToast } from '../../../../hooks/use-toast';
import { ArrowLeft, Printer, CheckCircle } from 'lucide-react';
import { Skeleton } from '../../../../components/ui/skeleton';

type Client = {
    displayName: string;
    email: string;
    cpf?: string;
    cnpj?: string;
};

type Receipt = {
  id: string;
  title: string;
  clientId: string;
  clientName: string;
  clientDetails?: Client;
  originalAmount: number;
  interestAmount: number;
  totalAmount: number;
  paidAt: any;
};

const companyInfo = {
    razaoSocial: 'Delvind Tecnologia Da Informação LTDA',
    cnpj: '57.278.676/0001-69',
    email: 'contato@delvind.com',
    phone: '(45) 98800-0647',
    address: 'R. Jaime Canet, 2062 - Nazaré, Medianeira - PR, 85884-000',
};


export default function AdminReceiptViewPage() {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { id } = params;


  useEffect(() => {
    if (typeof id !== 'string') return;
    
    const fetchReceipt = async () => {
      setLoading(true);
      const receiptRef = doc(db, 'receipts', id);
      const receiptSnap = await getDoc(receiptRef);
      if (receiptSnap.exists()) {
        const receiptData = { id: receiptSnap.id, ...receiptSnap.data() } as Receipt;

        // Fetch client details
        const clientRef = doc(db, 'users', receiptData.clientId);
        const clientSnap = await getDoc(clientRef);
        if (clientSnap.exists()) {
            receiptData.clientDetails = clientSnap.data() as Client;
        }

        setReceipt(receiptData);
      } else {
        toast({ title: 'Erro', description: 'Comprovante não encontrado.', variant: 'destructive' });
        router.push('/admin/requests');
      }
      setLoading(false);
    };

    fetchReceipt();
  }, [id, router, toast]);

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
        <div className="space-y-6">
            <Skeleton className='h-10 w-1/3 mb-6' />
            <Skeleton className='h-[80vh] w-full' />
        </div>
    );
  }

  if (!receipt) {
    return null; 
  }

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 print:hidden">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
            <h1 className="text-2xl font-bold">Detalhes do Comprovante</h1>
            <p className="text-muted-foreground">Visualize e imprima o comprovante de pagamento do cliente.</p>
            </div>
        </div>
         <div className="flex justify-end gap-2 print:hidden">
            <Button type="button" variant="outline" onClick={handlePrint}><Printer className='mr-2 h-4 w-4' />Imprimir / Salvar PDF</Button>
        </div>
      </div>
      <div className="bg-background rounded-lg shadow-lg md:p-8 p-4 max-w-4xl mx-auto printable-area">
        {/* Header */}
          <header className="flex flex-col md:flex-row justify-between items-start mb-8">
              <div className='mb-4 md:mb-0'>
                 <Image src="https://darkgreen-lark-741030.hostingersite.com/img/logo.png" alt="Delvind Logo" width={64} height={64} className="h-16 w-16" />
                <h2 className="text-2xl font-bold text-primary mt-2">{companyInfo?.razaoSocial}</h2>
                <p className="text-sm text-muted-foreground">{companyInfo?.address}</p>
                <p className="text-sm text-muted-foreground">CNPJ: {companyInfo?.cnpj}</p>
                <p className="text-sm text-muted-foreground">Contato: {companyInfo?.phone} | Email: {companyInfo?.email}</p>
              </div>
              <div className="text-left md:text-right">
                <h1 className="text-3xl font-bold uppercase">Recibo de Pagamento</h1>
                <p className="text-muted-foreground">Data: {receipt.paidAt?.toDate().toLocaleDateString('pt-BR')}</p>
                <p className="text-muted-foreground">Recibo Nº: {receipt.id.slice(0, 8).toUpperCase()}</p>
              </div>
          </header>

          <Separator className="my-8"/>

          <div className="text-center my-12">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-semibold">Pagamento Confirmado</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 items-start my-8">
              <Card className='print:border-none print:shadow-none'>
                <CardHeader>
                    <CardTitle>Pagador</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <p><strong>{receipt.clientDetails?.displayName || receipt.clientName}</strong></p>
                    <p>{receipt.clientDetails?.email}</p>
                    {receipt.clientDetails?.cnpj && <p>CNPJ: {receipt.clientDetails.cnpj}</p>}
                    {receipt.clientDetails?.cpf && <p>CPF: {receipt.clientDetails.cpf}</p>}
                </CardContent>
              </Card>

              <Card className='print:border-none print:shadow-none bg-green-50 border-green-200'>
                <CardHeader>
                    <CardTitle className="text-green-800">Valor Pago</CardTitle>
                </CardHeader>
                <CardContent className='text-4xl font-bold text-green-700'>
                    {formatCurrency(receipt.totalAmount)}
                </CardContent>
              </Card>
          </div>
          
           {/* Items List */}
          <Card className='print:border-none print:shadow-none'>
              <CardHeader>
                  <CardTitle>Detalhes do Pagamento</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                 <div className='flex justify-between items-center border-b pb-2'>
                    <span className='font-semibold text-sm'>Descrição</span>
                    <span className='font-semibold text-sm'>Valor</span>
                 </div>
                 <div className='flex justify-between items-center text-sm'>
                    <span className='text-muted-foreground'>{receipt.title} (Valor Principal)</span>
                    <span className='text-muted-foreground'>{formatCurrency(receipt.originalAmount)}</span>
                 </div>
                  {(receipt.interestAmount > 0) && (
                    <div className='flex justify-between items-center text-sm'>
                        <span className='text-muted-foreground'>Juros por Atraso</span>
                        <span className='text-muted-foreground'>{formatCurrency(receipt.interestAmount)}</span>
                    </div>
                  )}
                  <Separator />
                 <div className='flex justify-between items-center text-lg font-bold'>
                    <span>Total Pago</span>
                    <span>{formatCurrency(receipt.totalAmount)}</span>
                 </div>
              </CardContent>
          </Card>
          <div className="mt-16 text-center text-xs text-muted-foreground">
            <p>Este é um recibo gerado automaticamente. Válido sem necessidade de assinatura.</p>
            <p>Delvind Tecnologia - {new Date().getFullYear()}</p>
          </div>
      </div>
      <style jsx global>{`
          @media print {
              body * {
                  visibility: hidden;
              }
              .printable-area, .printable-area * {
                  visibility: visible;
              }
              .printable-area {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  box-shadow: none;
                  padding: 0;
                  margin: 0;
              }
          }
      `}</style>
    </>
  );
}
