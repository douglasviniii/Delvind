
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '../../../../lib/firebase';
import { collection, getDocs, query, where, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../../components/ui/form';
import { Input } from '../../../../components/ui/input';
import { Textarea } from '../../../../components/ui/textarea';
import { Separator } from '../../../../components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { useToast } from '../../../../hooks/use-toast';
import { ArrowLeft, PlusCircle, Trash2, Printer } from 'lucide-react';
import { LogoSpinner } from '../../../../components/ui/logo-spinner';

const budgetItemSchema = z.object({
  description: z.string().min(1, 'A descrição é obrigatória.'),
  price: z.string().refine(val => !isNaN(parseFloat(val.replace(/\./g, '').replace(',', '.'))), {
    message: "O preço deve ser um número válido."
  }),
});

const infoCardSchema = z.object({
    title: z.string().min(1, "O título é obrigatório."),
    description: z.string().min(1, "A descrição é obrigatória.")
});

const budgetSchema = z.object({
  title: z.string().min(3, 'O título é obrigatório.'),
  clientId: z.string().min(1, 'Você deve selecionar um cliente.'),
  items: z.array(budgetItemSchema).min(1, 'Adicione pelo menos um item ao orçamento.'),
  generalDescription: z.string().optional(),
  infoCards: z.array(infoCardSchema).length(4),
  discount: z.string().optional(),
});

type Customer = {
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  cpf?: string;
  cnpj?: string;
  razaoSocial?: string;
  address?: string;
};

const companyInfo = {
    razaoSocial: 'Delvind Tecnologia Da Informação LTDA',
    cnpj: '57.278.676/0001-69',
    email: 'contato@delvind.com',
    phone: '(45) 98800-0647',
    address: 'R. Jaime Canet, 2062 - Nazaré, Medianeira - PR, 85884-000',
};

const formatCurrencyForInput = (value: number | undefined): string => {
    if (value === undefined) return '0,00';
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(value);
};

const parseCurrency = (value: string | number | undefined): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const numberValue = parseFloat(value.replace(/\./g, '').replace(',', '.'));
      return isNaN(numberValue) ? 0 : numberValue;
    }
    return 0;
};

export default function CreateBudgetPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof budgetSchema>>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      title: '',
      clientId: '',
      items: [{ description: '', price: '0,00' }],
      generalDescription: '',
      infoCards: [
        { title: 'Produto', description: 'Detalhes do produto aqui.' },
        { title: 'Desenvolvimento', description: 'Detalhes do desenvolvimento.' },
        { title: 'Serviços', description: 'Serviços inclusos.' },
        { title: 'Planos/Total', description: 'Condições de pagamento.' },
      ],
      discount: '0,00',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const { fields: infoCardFields } = useFieldArray({
    control: form.control,
    name: 'infoCards'
  });

  const watchItems = form.watch('items');
  const watchDiscount = form.watch('discount');
  const subtotal = watchItems.reduce((sum, item) => sum + parseCurrency(item.price), 0);
  const discountValue = parseCurrency(watchDiscount);
  const total = subtotal - discountValue;

  const formattedSubtotal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal);
  const formattedDiscount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(discountValue);
  const formattedTotal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total);
  
  useEffect(() => {
    const budgetId = searchParams.get('id');
    if (budgetId) {
        setEditingBudgetId(budgetId);
        const fetchBudget = async () => {
            const budgetRef = doc(db, 'budgets', budgetId);
            const budgetSnap = await getDoc(budgetRef);
            if (budgetSnap.exists()) {
                const data = budgetSnap.data();
                form.reset({
                    title: data.title,
                    clientId: data.clientId,
                    items: data.items.map((item: any) => ({
                        ...item,
                        price: formatCurrencyForInput(item.price)
                    })),
                    generalDescription: data.generalDescription,
                    infoCards: data.infoCards,
                    discount: formatCurrencyForInput(data.discount || 0),
                });
            } else {
                toast({ title: 'Erro', description: 'Orçamento a ser editado não encontrado.', variant: 'destructive' });
                router.push('/admin/budgets');
            }
        };
        fetchBudget();
    }
  }, [searchParams, form, router, toast]);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'customer'));
        const querySnapshot = await getDocs(q);
        const customerData: Customer[] = [];
        querySnapshot.forEach((doc) => {
            customerData.push({ uid: doc.id, ...doc.data() } as Customer);
        });
        setCustomers(customerData);
      } catch (error) {
        console.error("Failed to fetch customers:", error);
        toast({ title: "Erro ao buscar clientes", variant: "destructive"})
      }
    };
    fetchCustomers();
  }, [toast]);

  const handleClientChange = (clientId: string) => {
    const customer = customers.find((c) => c.uid === clientId) || null;
    setSelectedCustomer(customer);
    form.setValue('clientId', clientId);
  };

  useEffect(() => {
    const clientId = form.getValues('clientId');
    if (clientId && customers.length > 0) {
      handleClientChange(clientId);
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.getValues('clientId'), customers]);
  
  const handleGeneratePdf = async () => {
    setIsPrinting(true);
    const budgetElement = document.getElementById('printable-area');
    if (!budgetElement) {
        setIsPrinting(false);
        return;
    };

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
          windowHeight: budgetElement.scrollHeight
        });
        
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
        const tolerance = 5;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
        
        while (heightLeft > tolerance) {
          position -= pdfHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
          heightLeft -= pdfHeight;
        }

        const title = form.getValues('title') || 'orcamento';
        pdf.save(`${title.replace(/ /g, '_')}.pdf`);
    } catch (error) {
        console.error('Error generating PDF:', error);
        toast({ title: 'Erro', description: 'Não foi possível gerar o PDF.', variant: 'destructive'});
    } finally {
        setIsPrinting(false);
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

  async function onSubmit(values: z.infer<typeof budgetSchema>) {
    if (!selectedCustomer) {
        toast({ title: 'Erro', description: 'Selecione um cliente válido.', variant: 'destructive' });
        return;
    }
    setIsSubmitting(true);

    const processedValues = {
        ...values,
        clientName: selectedCustomer.displayName,
        total,
        discount: discountValue,
        status: 'Pendente',
        items: values.items.map(item => ({
            ...item,
            price: parseCurrency(item.price)
        }))
    };

    try {
        if (editingBudgetId) {
            const budgetRef = doc(db, 'budgets', editingBudgetId);
            await updateDoc(budgetRef, {
                ...processedValues,
                updatedAt: serverTimestamp()
            });
             toast({
                title: 'Orçamento Atualizado!',
                description: 'O orçamento foi atualizado com sucesso.',
            });
        } else {
            await addDoc(collection(db, 'budgets'), {
                ...processedValues,
                createdAt: serverTimestamp(),
            });
            toast({
                title: 'Orçamento Salvo!',
                description: 'O orçamento foi salvo com sucesso no sistema.',
            });
        }
        router.push('/admin/budgets');
    } catch (error) {
        console.error("Error saving document: ", error);
        toast({
            title: 'Erro ao Salvar',
            description: 'Não foi possível salvar o orçamento no banco de dados.',
            variant: 'destructive',
        });
    } finally {
        setIsSubmitting(false);
    }
  }
  
  const handleCurrencyInput = (e: React.ChangeEvent<HTMLInputElement>, field: any) => {
    const value = e.target.value;
    const onlyNumbers = value.replace(/[^0-9]/g, '');
    const intValue = parseInt(onlyNumbers, 10) || 0;
    const formattedValue = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(intValue / 100);
    field.onChange(formattedValue);
  };


  return (
    <>
    <style jsx global>{`
        .pdf-generating {
          font-size: 10px;
          color: black;
        }
        .pdf-generating header,
        .pdf-generating .info-grid,
        .pdf-generating .items-table-card,
        .pdf-generating .description-card {
          page-break-inside: avoid;
        }
        .pdf-generating .compact-table th,
        .pdf-generating .compact-table td {
            padding-left: 6px;
            padding-right: 6px;
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
            width: 28px !important;
            height: 28px !important;
        }
        .pdf-generating .header-title {
            font-size: 0.9rem !important;
        }
        .pdf-generating .header-subtitle {
            font-size: 0.55rem !important;
        }
        .pdf-generating .client-info p {
            margin-bottom: 0px !important;
            font-size: 0.6rem !important;
            line-height: 1.25;
        }
        .pdf-generating .card-title-pdf {
            font-size: 0.75rem !important;
        }
        .pdf-generating .items-table-card {
            margin-top: 1rem;
        }
      `}</style>
    
    <main className="flex flex-col h-full">
        {/* Cabeçalho fixo */}
        <div className="flex items-center justify-between gap-4 mb-6 sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4 z-10">
              <div className="flex items-center gap-4">
                  <Button variant="outline" size="icon" onClick={() => router.back()}>
                  <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                  <h1 className="text-2xl font-bold">{editingBudgetId ? 'Editar Orçamento' : 'Criar Novo Orçamento'}</h1>
                  <p className="text-muted-foreground">Preencha os detalhes para gerar um novo orçamento.</p>
                  </div>
              </div>
              <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleGeneratePdf} disabled={isPrinting}>
                      {isPrinting ? <span className='animate-pulse'>Imprimindo...</span> : <><Printer className='mr-2 h-4 w-4' />Imprimir / Salvar PDF</>}
                  </Button>
                  <Button type="submit" form="budget-form" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : 'Salvar Orçamento'}</Button>
              </div>
        </div>
      
      {/* Conteúdo rolável */}
      <div className='flex-1 overflow-y-auto pr-2'>
        <Form {...form}>
            <form id="budget-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div id="printable-area" className="bg-background rounded-lg shadow-lg p-8 max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <header className="flex justify-between items-start compact-text">
                    <div>
                        <Image src="https://darkgreen-lark-741030.hostingersite.com/img/logo.png" alt="Delvind Logo" width={56} height={56} className="h-14 w-14 header-logo" />
                        <h2 className="text-xl font-bold text-primary mt-2 header-title">{companyInfo?.razaoSocial}</h2>
                        <p className="text-xs text-muted-foreground header-subtitle">{companyInfo?.address}</p>
                        <p className="text-xs text-muted-foreground header-subtitle">
                        Contato: {companyInfo?.phone} | Email: {companyInfo?.email}
                        </p>
                        <p className="text-xs text-muted-foreground header-subtitle">CNPJ: {companyInfo?.cnpj}</p>
                    </div>
                    <div className="text-right">
                        <h1 className="text-2xl font-bold uppercase header-title">Orçamento</h1>
                        <p className="text-sm text-muted-foreground header-subtitle">Data: {new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                    </header>

                <Separator />

                {/* Client and Budget Info */}
                <div className="grid grid-cols-2 gap-4 items-start info-grid">
                    <Card className='print:border-none print:shadow-none'>
                        <CardHeader className='p-4 pb-2'>
                            <CardTitle className='text-base card-title-pdf'>Cliente</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-4">
                            <FormField
                                control={form.control}
                                name="clientId"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Selecione um Cliente</FormLabel>
                                    <Select onValueChange={handleClientChange} value={field.value}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione um cliente existente..." />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                        {customers.map((c) => (
                                            <SelectItem key={c.uid} value={c.uid}>{c.displayName}</SelectItem>
                                        ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {selectedCustomer ? (
                                <div className="space-y-1 text-xs border p-3 rounded-md bg-muted/50 client-info">
                                    <p><strong>Nome/Razão Social:</strong> {selectedCustomer.razaoSocial || selectedCustomer.displayName}</p>
                                    <p><strong>Email:</strong> {selectedCustomer.email}</p>
                                    {selectedCustomer.phone && <p><strong>Telefone:</strong> {selectedCustomer.phone}</p>}
                                    {selectedCustomer.cnpj ? (
                                        <p><strong>CNPJ:</strong> {selectedCustomer.cnpj}</p>
                                    ) : (
                                        selectedCustomer.cpf && <p><strong>CPF:</strong> {selectedCustomer.cpf}</p>
                                    )}
                                    {selectedCustomer.address && <p><strong>Endereço:</strong> {selectedCustomer.address}</p>}
                                </div>
                            ) : (
                                <div className="text-xs text-muted-foreground italic h-[100px] flex items-center justify-center border rounded-md">Selecione um cliente para ver os detalhes.</div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className='print:border-none print:shadow-none'>
                        <CardHeader className='p-4 pb-2'>
                            <CardTitle className='text-base card-title-pdf'>Informações do Orçamento</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Título do Orçamento</FormLabel>
                                    <div className="print-only client-info pt-2 space-y-1">
                                        <p><strong>Título:</strong> {field.value}</p>
                                        <p><strong>Status:</strong> Pendente</p>
                                    </div>
                                    <FormControl>
                                        <Input placeholder="Ex: Criação de E-commerce Completo" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Items Table */}
                <Card className='print:border-none print:shadow-none items-table-card'>
                    <CardHeader>
                        <CardTitle className="card-title-pdf">Itens do Orçamento</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flow-root">
                            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                                    <table className="min-w-full divide-y divide-gray-300 compact-table">
                                        <thead>
                                            <tr>
                                                <th scope="col" className="py-3 pl-4 pr-3 text-left text-sm font-semibold sm:pl-0">Produto/Serviço</th>
                                                <th scope="col" className="px-3 py-3 text-left text-sm font-semibold">Preço (R$)</th>
                                                <th scope="col" className="relative py-3 pl-3 pr-4 sm:pr-0">
                                                    <span className="sr-only">Remover</span>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {fields.map((field, index) => (
                                            <tr key={field.id}>
                                                <td className="py-2 pl-4 pr-3 text-sm sm:pl-0">
                                                    <FormField
                                                        control={form.control}
                                                        name={`items.${index}.description`}
                                                        render={({ field }) => (
                                                           <Input
                                                                placeholder="Descreva o serviço ou produto"
                                                                {...field}
                                                                className="border-0 focus-visible:ring-0 p-0 h-auto"
                                                            />
                                                        )}
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-sm">
                                                    <Controller
                                                        name={`items.${index}.price`}
                                                        control={form.control}
                                                        render={({ field }) => (
                                                            <Input
                                                            {...field}
                                                            placeholder="0,00"
                                                            type="text"
                                                            className="w-32 border-0 focus-visible:ring-0 p-0 h-auto"
                                                            onChange={(e) => handleCurrencyInput(e, field)}
                                                            />
                                                        )}
                                                    />
                                                </td>
                                                <td className="relative py-2 pl-3 pr-4 text-right text-sm font-medium">
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </td>
                                            </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-4"
                            onClick={() => append({ description: '', price: '0,00' })}
                        >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Adicionar Item
                        </Button>
                    </CardContent>
                </Card>
                
                <div className='grid md:grid-cols-2 gap-8'>
                    {/* General Description */}
                    <div className='md:col-span-1 description-card'>
                        <Card className='print:border-none print:shadow-none h-full'>
                            <CardHeader>
                                <CardTitle className="card-title-pdf">Descrição Geral</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <FormField
                                    control={form.control}
                                    name="generalDescription"
                                    render={({ field }) => (
                                        <Textarea placeholder="Adicione observações, termos ou detalhes adicionais sobre o orçamento aqui." {...field} className="min-h-[150px]" />
                                    )}
                                />
                            </CardContent>
                        </Card>
                    </div>
                    {/* Totals */}
                    <div className='md:col-span-1 flex flex-col justify-between'>
                        <Card className='print:border-none print:shadow-none'>
                            <CardHeader>
                                <CardTitle className="card-title-pdf">Resumo</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center text-lg">
                                    <span>Subtotal</span>
                                    <span>{formattedSubtotal}</span>
                                </div>
                                <div className="flex justify-between items-center text-lg">
                                    <FormLabel>Desconto (R$)</FormLabel>
                                    <Controller
                                        name="discount"
                                        control={form.control}
                                        render={({ field }) => (
                                            <Input
                                                {...field}
                                                placeholder="0,00"
                                                type="text"
                                                className="w-32 text-right"
                                                onChange={(e) => handleCurrencyInput(e, field)}
                                            />
                                        )}
                                    />
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center text-2xl font-bold text-primary">
                                    <span>Total</span>
                                    <span>{formattedTotal}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
                </div>
            </form>
            </Form>
      </div>
    </main>
    </>
  );
}
