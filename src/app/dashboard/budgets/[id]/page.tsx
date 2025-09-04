
'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';

import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Separator } from '../../../../components/ui/separator';
import { useToast } from '../../../../hooks/use-toast';
import { ArrowLeft, Printer, Check, X } from 'lucide-react';
import { Skeleton } from '../../../../components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../../../components/ui/alert-dialog';
import { LogoSpinner } from '../../../../components/ui/logo-spinner';

type BudgetItem = {
  description: string;
  price: number;
};

type InfoCard = {
    title: string;
    description: string;
}

type Budget = {
  id: string;
  title: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientCpf?: string;
  clientCnpj?: string;
  items: BudgetItem[];
  generalDescription?: string;
  infoCards: InfoCard[];
  total: number;
  discount: number;
  status: 'Pendente' | 'Aprovado' | 'Recusado';
  createdAt: any;
};

type Service = {
    id: string;
    name: string;
    active: boolean;
    link?: string;
};

const companyInfo = {
    razaoSocial: 'Delvind Tecnologia Da Informação LTDA',
    cnpj: '57.278.676/0001-69',
    email: 'contato@delvind.com',
    phone: '(45) 98800-0647',
    address: 'R. Jaime Canet, 2062 - Nazaré, Medianeira - PR, 85884-000',
};

export default function CustomerBudgetViewPage() {
  const [budget, setBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { id } = params;

  useEffect(() => {
    if (typeof id !== 'string') return;
    
    const fetchBudget = async () => {
      setLoading(true);
      const budgetRef = doc(db, 'budgets', id);
      const budgetSnap = await getDoc(budgetRef);
      if (budgetSnap.exists()) {
        const data = budgetSnap.data();
        setBudget({ id: budgetSnap.id, ...data } as Budget);
      } else {
        toast({ title: 'Erro', description: 'Orçamento não encontrado.', variant: 'destructive' });
        router.push('/dashboard/budgets');
      }
      setLoading(false);
    };
    
    fetchBudget();
  }, [id, router, toast]);

  const handlePrint = () => {
    window.print();
  };
  
  const handleUpdateStatus = async (newStatus: 'Aprovado' | 'Recusado') => {
    if (!budget) return;
    setActionLoading(true);
    try {
        const budgetRef = doc(db, 'budgets', budget.id);
        await updateDoc(budgetRef, { status: newStatus });
        
        if (newStatus === 'Aprovado') {
             // Create financial record
             await addDoc(collection(db, 'finance'), {
                originalBudgetId: budget.id,
                clientId: budget.clientId,
                clientName: budget.clientName,
                title: budget.title,
                totalAmount: budget.total,
                status: 'A Cobrar',
                createdAt: serverTimestamp(),
                entryType: 'budget',
            });
            // Create contract request
            await addDoc(collection(db, 'contracts'), {
                budgetId: budget.id,
                clientId: budget.clientId,
                clientName: budget.clientName,
                clientCpf: budget.clientCpf || null,
                clientCnpj: budget.clientCnpj || null,
                status: 'Pendente',
                createdAt: serverTimestamp(),
                title: budget.title,
            });

            // Activate services
            const userDocRef = doc(db, 'users', budget.clientId);
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
                const userData = userSnap.data();
                const userServices: Service[] = userData.services || [];
                const serviceNamesInBudget = new Set(budget.items.map(item => item.description));
                
                const updatedServices = userServices.map(service => {
                    if (serviceNamesInBudget.has(service.name)) {
                        return { ...service, active: true };
                    }
                    return service;
                });
                
                await setDoc(userDocRef, { services: updatedServices }, { merge: true });
            }
        }

        setBudget(prev => prev ? { ...prev, status: newStatus } : null);
        toast({
            title: `Orçamento ${newStatus}!`,
            description: `O status do orçamento foi atualizado com sucesso.`
        });
    } catch (error) {
        console.error("Error updating status or creating records: ", error);
        toast({ title: 'Erro', description: 'Não foi possível atualizar o status do orçamento.', variant: 'destructive' });
    } finally {
        setActionLoading(false);
    }
  };

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
  };

  const subtotal = budget?.items.reduce((sum, item) => sum + item.price, 0) || 0;


  if (loading) {
    return (
        <div className="space-y-6">
            <Skeleton className='h-10 w-1/3 mb-6' />
            <Skeleton className='h-[80vh] w-full' />
        </div>
    );
  }

  if (!budget) {
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
            <h1 className="text-2xl font-bold">Detalhes do Orçamento</h1>
            <p className="text-muted-foreground">Visualize os detalhes da proposta e tome uma ação.</p>
            </div>
        </div>
         <div className="flex justify-end gap-2 print:hidden flex-wrap">
            <Button type="button" variant="outline" onClick={handlePrint}><Printer className='mr-2 h-4 w-4' />Imprimir / Salvar PDF</Button>
            {budget.status === 'Pendente' && (
                <>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button className='bg-red-600 hover:bg-red-700' disabled={actionLoading}>
                                {actionLoading ? <LogoSpinner className='mr-2'/> : <X className='mr-2 h-4 w-4'/>}
                                Recusar
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Confirmar Recusa</AlertDialogTitle><AlertDialogDescription>Tem certeza de que deseja recusar este orçamento? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleUpdateStatus('Recusado')} className='bg-red-600 hover:bg-red-700'>Confirmar Recusa</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button className='bg-green-600 hover:bg-green-700' disabled={actionLoading}>
                                {actionLoading ? <LogoSpinner className='mr-2'/> : <Check className='mr-2 h-4 w-4'/>}
                                Aprovar
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Confirmar Aprovação</AlertDialogTitle><AlertDialogDescription>Ao aprovar, você concorda com os termos e valores apresentados. A equipe da Delvind entrará em contato para os próximos passos.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleUpdateStatus('Aprovado')} className='bg-green-600 hover:bg-green-700'>Confirmar Aprovação</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </>
            )}
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
                <h1 className="text-3xl font-bold uppercase">Proposta Comercial</h1>
                <p className="text-muted-foreground">Data: {budget.createdAt?.toDate().toLocaleDateString('pt-BR')}</p>
                <p className="text-muted-foreground">Válido por: 15 dias</p>
              </div>
          </header>

          <Separator />
          
          {/* Client and Budget Info */}
          <div className="grid md:grid-cols-2 gap-8 items-start my-8">
              <Card className='print:border-none print:shadow-none'>
              <CardHeader>
                  <CardTitle>Proposta para</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                  <p><strong>{budget.clientName}</strong></p>
                  <p>{budget.clientEmail}</p>
                  {budget.clientCnpj && <p>CNPJ: {budget.clientCnpj}</p>}
              </CardContent>
              </Card>

              <Card className='print:border-none print:shadow-none'>
              <CardHeader>
                  <CardTitle>{budget.title}</CardTitle>
              </CardHeader>
              <CardContent className='text-sm space-y-2'>
                   <p><strong>Status:</strong> {budget.status}</p>
              </CardContent>
              </Card>
          </div>
          
           {/* Items Table - Desktop */}
            <div className='hidden md:block'>
                <Card className='print:border-none print:shadow-none'>
                    <CardHeader>
                        <CardTitle>Itens da Proposta</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flow-root">
                            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                                    <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                                        <thead>
                                            <tr>
                                                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-foreground sm:pl-0">Descrição</th>
                                                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-foreground">Preço</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                            {budget.items.map((item, index) => (
                                            <tr key={index}>
                                                <td className="py-4 pl-4 pr-3 text-sm sm:pl-0">{item.description}</td>
                                                <td className="px-3 py-4 text-sm text-right">{formatCurrency(item.price)}</td>
                                            </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <th scope="row" className="py-4 pl-4 pr-3 text-right text-sm font-normal sm:pl-0">Subtotal</th>
                                                <td className="px-3 py-4 text-sm text-right">{formatCurrency(subtotal)}</td>
                                            </tr>
                                            {budget.discount > 0 && (
                                                <tr>
                                                    <th scope="row" className="py-4 pl-4 pr-3 text-right text-sm font-normal sm:pl-0">Desconto</th>
                                                    <td className="px-3 py-4 text-sm text-right text-green-600">-{formatCurrency(budget.discount)}</td>
                                                </tr>
                                            )}
                                            <tr>
                                                <th scope="row" className="py-4 pl-4 pr-3 text-right text-base font-bold sm:pl-0">Total</th>
                                                <td className="px-3 py-4 text-right text-base font-bold">{formatCurrency(budget.total)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
             {/* Items List - Mobile */}
              <div className='md:hidden space-y-4'>
                 <h3 className='text-lg font-semibold'>Itens da Proposta</h3>
                 <div className='space-y-3'>
                    {budget.items.map((item, index) => (
                        <Card key={index} className='bg-muted/50'>
                            <CardContent className='p-3 flex justify-between items-center'>
                                <p className='text-sm'>{item.description}</p>
                                <p className='text-sm font-semibold'>{formatCurrency(item.price)}</p>
                            </CardContent>
                        </Card>
                    ))}
                 </div>
                 <div className='space-y-2 border-t pt-4'>
                    <div className='flex justify-between items-center text-sm'>
                        <p>Subtotal:</p>
                        <p>{formatCurrency(subtotal)}</p>
                    </div>
                    {budget.discount > 0 && (
                     <div className='flex justify-between items-center text-sm text-green-600'>
                        <p>Desconto:</p>
                        <p>-{formatCurrency(budget.discount)}</p>
                    </div>
                    )}
                    <div className='flex justify-between items-center text-lg font-bold text-primary'>
                        <p>Total:</p>
                        <p>{formatCurrency(budget.total)}</p>
                    </div>
                 </div>
              </div>


           {/* General Description */}
           {budget.generalDescription && (
              <Card className='print:border-none print:shadow-none mt-8'>
                  <CardHeader>
                      <CardTitle>Observações Gerais</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <p className='text-sm text-muted-foreground whitespace-pre-wrap'>{budget.generalDescription}</p>
                  </CardContent>
              </Card>
          )}
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
