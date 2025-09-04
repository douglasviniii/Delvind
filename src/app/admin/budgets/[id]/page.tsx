
'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Input } from '../../../../components/ui/input';
import { Textarea } from '../../../../components/ui/textarea';
import { Separator } from '../../../../components/ui/separator';
import { useToast } from '../../../../hooks/use-toast';
import { ArrowLeft, Printer, Trash2, Pencil, Check, X } from 'lucide-react';
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


export default function BudgetViewPage() {
  const [budget, setBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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
        const clientRef = doc(db, 'users', data.clientId);
        const clientSnap = await getDoc(clientRef);
        if (clientSnap.exists()) {
            const clientData = clientSnap.data();
             setBudget({ 
                id: budgetSnap.id,
                ...data,
                clientName: clientData.displayName,
                clientEmail: clientData.email,
                clientPhone: clientData.phone,
                clientCpf: clientData.cpf,
                clientCnpj: clientData.cnpj,
             } as Budget);
        } else {
             setBudget({ id: budgetSnap.id, ...data } as Budget);
        }

      } else {
        toast({ title: 'Erro', description: 'Orçamento não encontrado.', variant: 'destructive' });
        router.push('/admin/budgets');
      }
      setLoading(false);
    };

    fetchBudget();
  }, [id, router, toast]);

  const handleGeneratePdf = async () => {
    if (!budget) return;
    setIsPrinting(true);
    const budgetElement = document.getElementById('printable-area');
    if (!budgetElement) {
        setIsPrinting(false);
        return;
    };

    // Add a class for PDF-specific styling
    budgetElement.classList.add('pdf-generating');

    // Dynamic padding logic
    const tableBody = budgetElement.querySelector('.compact-table tbody') as HTMLElement;
    const tableRows = tableBody?.querySelectorAll('tr');
    if (tableBody && tableRows && tableRows.length > 0) {
        const itemCount = tableRows.length;
        // Min padding 2px, max padding 8px. Starts reducing after 5 items.
        const basePadding = 8;
        const minPadding = 2;
        const reductionStart = 5;
        const reductionFactor = (basePadding - minPadding) / (20 - reductionStart);
        
        let verticalPadding = basePadding;
        if (itemCount > reductionStart) {
            verticalPadding = Math.max(minPadding, basePadding - (itemCount - reductionStart) * reductionFactor);
        }

        tableRows.forEach(row => {
            const cells = row.querySelectorAll('td');
            cells.forEach(cell => {
                cell.style.paddingTop = `${verticalPadding}px`;
                cell.style.paddingBottom = `${verticalPadding}px`;
            });
        });
    }

    try {
        const canvas = await html2canvas(budgetElement, { 
          scale: 2, 
          useCORS: true,
          logging: false, 
          windowWidth: budgetElement.scrollWidth,
          windowHeight: budgetElement.scrollHeight,
        });
        
        // Remove the class after rendering
        budgetElement.classList.remove('pdf-generating');

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasHeight / canvasWidth;
        
        const imgHeight = pdfWidth * ratio;
        let heightLeft = imgHeight;
        let position = 0;
        
        // Add a small tolerance to avoid creating an extra blank page
        const tolerance = 5; 

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
        
        while (heightLeft > tolerance) {
          position -= pdfHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
          heightLeft -= pdfHeight;
        }

        pdf.save(`${budget.title.replace(/ /g, '_')}.pdf`);
    } catch (error) {
        console.error('Error generating PDF:', error);
        toast({ title: 'Erro', description: 'Não foi possível gerar o PDF.', variant: 'destructive'});
    } finally {
        setIsPrinting(false);
        // Ensure class is removed even if there's an error
        budgetElement.classList.remove('pdf-generating');
        // And reset styles
        if (tableRows) {
             tableRows.forEach(row => {
                const cells = row.querySelectorAll('td');
                cells.forEach(cell => {
                    cell.style.paddingTop = '';
                    cell.style.paddingBottom = '';
                });
            });
        }
    }
  };
  
  const handleDelete = async () => {
    if (!budget) return;
    setIsDeleting(true);
    const deletionToast = toast({ title: 'Excluindo orçamento...', description: 'Aguarde enquanto removemos todos os dados associados.' });

    try {
        const batch = writeBatch(db);

        // 1. Delete Financial Records
        const financeQuery = query(collection(db, 'finance'), where('originalBudgetId', '==', budget.id));
        const financeSnapshot = await getDocs(financeQuery);
        financeSnapshot.forEach(doc => batch.delete(doc.ref));
        
        // 2. Delete Contract Request
        const contractsQuery = query(collection(db, 'contracts'), where('budgetId', '==', budget.id));
        const contractsSnapshot = await getDocs(contractsQuery);
        contractsSnapshot.forEach(doc => batch.delete(doc.ref));

        // 3. Deactivate associated services for the client
        if (budget.status === 'Aprovado') {
            const userDocRef = doc(db, 'users', budget.clientId);
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
                const userData = userSnap.data();
                const userServices: Service[] = userData.services || [];
                const serviceNamesInBudget = new Set(budget.items.map(item => item.description));
                
                const updatedServices = userServices.map(service => {
                    if (serviceNamesInBudget.has(service.name)) {
                        return { ...service, active: false }; // Deactivate the service
                    }
                    return service;
                });
                
                batch.update(userDocRef, { services: updatedServices });
            }
        }
        
        // 4. Delete the budget itself
        const budgetRef = doc(db, 'budgets', budget.id);
        batch.delete(budgetRef);

        // Commit all operations
        await batch.commit();

        toast({ title: 'Orçamento Excluído!', description: 'O orçamento e todos os seus dados associados foram removidos com sucesso.', variant: 'default' });
        router.push('/admin/budgets');
    } catch (error) {
        console.error("Error during cascading delete: ", error);
        toast({ title: 'Erro ao Excluir', description: 'Não foi possível remover o orçamento e seus dados. Verifique o console para mais detalhes.', variant: 'destructive' });
    } finally {
        setIsDeleting(false);
        // You might want to dismiss the loading toast here if your toast library supports it.
    }
  };

  const handleEdit = () => {
      router.push(`/admin/budgets/create?id=${id}`);
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
        <main className="flex-1 p-4 md:p-6">
            <Skeleton className='h-16 w-1/2 mb-6' />
            <Skeleton className='h-[80vh] w-full' />
        </main>
    );
  }

  if (!budget) {
    return null; 
  }

  return (
    <>
      <style jsx global>{`
        .pdf-generating {
          font-size: 10px; /* Further reduced font size for compactness */
          color: black; /* Ensure text is black for PDF */
        }
        .pdf-generating header,
        .pdf-generating .info-grid,
        .pdf-generating .items-table-card,
        .pdf-generating .description-card {
          page-break-inside: avoid;
        }
        .pdf-generating .compact-table th,
        .pdf-generating .compact-table td {
            padding: 4px 6px;
        }
        .pdf-generating .compact-text p,
        .pdf-generating .compact-text h1,
        .pdf-generating .compact-text h2,
        .pdf-generating .compact-text h3 {
            margin-bottom: 0.1rem;
            padding-bottom: 0;
            line-height: 1.2;
        }
         .pdf-generating .header-logo {
            width: 28px !important; /* Smaller logo */
            height: 28px !important;
        }
        .pdf-generating .header-title {
            font-size: 0.9rem !important; /* Smaller header title */
        }
        .pdf-generating .header-subtitle {
            font-size: 0.55rem !important; /* Smaller subtitle */
        }
        .pdf-generating .client-info p {
            margin-bottom: 0px !important;
            font-size: 0.6rem !important; /* Smaller client info */
            line-height: 1.25;
        }
        .pdf-generating .card-title-pdf {
            font-size: 0.75rem !important; /* Smaller card titles */
        }
         .pdf-generating .items-table-card {
            margin-top: 1rem;
        }
      `}</style>
      <div className="flex flex-col h-full">
        <div className="flex-col md:flex-row flex md:items-center justify-between gap-4 mb-6 md:p-6 p-4 pb-0">
          <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
              <h1 className="text-2xl font-bold">Detalhes do Orçamento</h1>
              <p className="text-muted-foreground">Visualize, imprima ou edite o orçamento.</p>
              </div>
          </div>
          <div className='flex gap-2 flex-wrap'>
              <Button variant="outline" onClick={handleEdit}><Pencil className='mr-2 h-4 w-4' /> Editar</Button>
              <AlertDialog>
                  <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={isDeleting}>
                        {isDeleting ? <LogoSpinner className="mr-2" /> : <Trash2 className='mr-2 h-4 w-4' />}
                        {isDeleting ? 'Excluindo...' : 'Excluir'}
                      </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                      <AlertDialogHeader>
                      <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                      <AlertDialogDescription>
                          Esta ação não pode ser desfeita. Isso excluirá permanentemente o orçamento e todos os registros financeiros e de contrato associados a ele.
                      </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className='bg-red-600 hover:bg-red-700'>Sim, excluir tudo</AlertDialogAction>
                      </AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>
               <Button type="button" variant="outline" onClick={handleGeneratePdf} disabled={isPrinting}>
                  {isPrinting ? <span className='animate-pulse'>Imprimindo...</span> : <><Printer className='mr-2 h-4 w-4' />Imprimir / Salvar PDF</>}
              </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div id="printable-area" className="bg-background rounded-lg shadow-lg md:p-8 p-4 max-w-4xl mx-auto">
            {/* Header */}
              <header className="flex flex-col md:flex-row justify-between items-start mb-6 compact-text">
                  <div className='mb-4 md:mb-0'>
                    <Image src="https://darkgreen-lark-741030.hostingersite.com/img/logo.png" alt="Delvind Logo" width={56} height={56} className="h-14 w-14 header-logo" />
                    <h2 className="text-xl font-bold text-primary mt-2 header-title">{companyInfo?.razaoSocial}</h2>
                    <p className="text-xs text-muted-foreground header-subtitle">{companyInfo?.address}</p>
                    <p className="text-xs text-muted-foreground header-subtitle">
                      Contato: {companyInfo?.phone} | Email: {companyInfo?.email}
                    </p>
                    <p className="text-xs text-muted-foreground header-subtitle">CNPJ: {companyInfo?.cnpj}</p>
                  </div>
                  <div className="text-left md:text-right">
                    <h1 className="text-2xl font-bold uppercase header-title">Orçamento</h1>
                    <p className="text-sm text-muted-foreground header-subtitle">Data: {budget.createdAt?.toDate().toLocaleDateString('pt-BR')}</p>
                  </div>
              </header>

              <Separator />
              
              {/* Client and Budget Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6 info-grid">
                  <Card className='print:border-none print:shadow-none'>
                  <CardHeader className='p-4 pb-2'>
                      <CardTitle className='text-base card-title-pdf'>Cliente</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-1 text-xs client-info">
                      <p><strong>Nome:</strong> {budget.clientName}</p>
                      <p><strong>Email:</strong> {budget.clientEmail}</p>
                      {budget.clientPhone && <p><strong>Telefone:</strong> {budget.clientPhone}</p>}
                      {budget.clientCpf && <p><strong>CPF:</strong> {budget.clientCpf}</p>}
                      {budget.clientCnpj && <p><strong>CNPJ:</strong> {budget.clientCnpj}</p>}
                  </CardContent>
                  </Card>

                  <Card className='print:border-none print:shadow-none'>
                  <CardHeader className='p-4 pb-2'>
                      <CardTitle className='text-base card-title-pdf'>Informações do Orçamento</CardTitle>
                  </CardHeader>
                  <CardContent className='p-4 pt-0 text-xs space-y-1 client-info'>
                      <p><strong>Título:</strong> {budget.title}</p>
                      <p><strong>Status:</strong> {budget.status}</p>
                  </CardContent>
                  </Card>
              </div>
              
              {/* Items Table - Desktop */}
              <div className='items-table-card hidden md:block'>
                <CardTitle className='text-xl card-title-pdf'>Itens do Orçamento</CardTitle>
                <div className="flow-root mt-4">
                    <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                            <table className="min-w-full divide-y divide-gray-300 compact-table">
                                <thead>
                                    <tr>
                                        <th scope="col" className="py-3 pl-4 pr-3 text-left text-sm font-semibold sm:pl-0">Descrição</th>
                                        <th scope="col" className="px-3 py-3 text-right text-sm font-semibold">Preço</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {budget.items.map((item, index) => (
                                    <tr key={index}>
                                        <td className="py-2 pl-4 pr-3 text-sm sm:pl-0">{item.description}</td>
                                        <td className="px-3 py-2 text-sm text-right">{formatCurrency(item.price)}</td>
                                    </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <th scope="row" className="py-3 pl-4 pr-3 text-right text-sm font-normal sm:pl-0">Subtotal</th>
                                        <td className="px-3 py-3 text-right text-sm">{formatCurrency(subtotal)}</td>
                                    </tr>
                                    {budget.discount > 0 && (
                                        <tr>
                                            <th scope="row" className="py-3 pl-4 pr-3 text-right text-sm font-normal sm:pl-0">Desconto</th>
                                            <td className="px-3 py-3 text-right text-sm text-green-600">-{formatCurrency(budget.discount)}</td>
                                        </tr>
                                    )}
                                    <tr>
                                        <th scope="row" className="py-3 pl-4 pr-3 text-right text-base font-bold sm:pl-0">Total</th>
                                        <td className="px-3 py-3 text-right text-base font-bold">{formatCurrency(budget.total)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
              </div>
              
              {/* Items List - Mobile */}
              <div className='md:hidden space-y-4'>
                 <h3 className='text-lg font-semibold'>Itens do Orçamento</h3>
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
                  <Card className='print:border-none print:shadow-none mt-6 description-card'>
                      <CardHeader className='p-4 pb-2'>
                          <CardTitle className='text-base card-title-pdf'>Descrição Geral</CardTitle>
                      </CardHeader>
                      <CardContent className='p-4 pt-0'>
                          <p className='text-sm text-muted-foreground whitespace-pre-wrap'>{budget.generalDescription}</p>
                      </CardContent>
                  </Card>
              )}
          </div>
        </div>
      </div>
    </>
  );
}
