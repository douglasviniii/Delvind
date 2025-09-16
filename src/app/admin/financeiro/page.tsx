'use client';

import { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../../../lib/firebase';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, serverTimestamp, addDoc, writeBatch, getDocs, where, getDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';
import { Skeleton } from '../../../components/ui/skeleton';
import { PlusCircle, DollarSign, FileCheck, CalendarIcon, Link2, CheckCircle, HandCoins, Send, Eye, ArrowDownUp, FileWarning, XCircle, Receipt, Mail, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { useToast } from '../../../hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import { Calendar } from '../../../components/ui/calendar';
import { format, startOfDay, addMonths, differenceInCalendarDays, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../../../lib/utils';
import { RadioGroup, RadioGroupItem } from '../../../components/ui/radio-group';
import { Label } from '../../../components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../../components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../components/ui/select';
import { loadStripe } from '@stripe/stripe-js';


type FinancialRecord = {
  id: string;
  clientName: string;
  clientId: string;
  title: string;
  totalAmount: number;
  status: 'A Cobrar' | 'Cobrança Enviada' | 'Pagamento Enviado' | 'Recebido' | 'Atrasado';
  createdAt: any;
  billingDate?: any;
  dueDate?: any;
  gracePeriodEndDate?: any; 
  entryType: 'budget' | 'manual' | 'installment';
  paymentLink?: string;
  boletoCode?: string;
  originalBudgetId?: string;
  installmentNumber?: number;
  newInvoiceRequested?: boolean;
  interestRate?: number;
};

type Budget = {
    total: number;
}

type Collaborator = {
    uid: string;
    displayName: string;
};

type ApprovedRefund = {
    id: string; // request id
    productTitle: string;
    clientName: string;
    clientId: string;
    totalAmount: number;
}

const configChargeSchema = z.object({
    paymentType: z.enum(['full', 'installments', 'recurring'], {
        required_error: "Você deve selecionar um tipo de pagamento."
    }),
    downPayment: z.string().optional(),
    downPaymentDueDate: z.date().optional(),
    installments: z.coerce.number().min(1, "Deve ser pelo menos 1 parcela.").optional(),
    billingDate: z.date({
        required_error: "A data da fatura é obrigatória.",
    }),
    dueDate: z.date({
        required_error: "A data de vencimento é obrigatória.",
    }),
     gracePeriodEndDate: z.date({
        required_error: "A data de prazo final é obrigatória.",
    }),
    recurringDay: z.coerce.number().min(1, "O dia deve ser entre 1 e 31").max(31, "O dia deve ser entre 1 e 31").optional(),
    interestRate: z.string().optional(),
});

const generateChargeSchema = z.object({
  chargeType: z.enum(['link', 'boleto']),
  paymentLink: z.string().url({ message: "Por favor, insira uma URL válida."}).optional(),
  boletoCode: z.string().optional(),
}).refine(data => {
    if (data.chargeType === 'link') return !!data.paymentLink;
    if (data.chargeType === 'boleto') return !!data.boletoCode;
    return true;
}, {
    message: "O campo correspondente ao tipo de cobrança deve ser preenchido.",
    path: ['paymentLink']
});

const expenseBaseSchema = {
    amount: z.string().min(1, "O valor é obrigatório.").refine(val => !isNaN(parseCurrency(val)), "Valor inválido."),
    description: z.string().min(3, "A descrição é obrigatória"),
    expenseDate: z.date(),
};

const pagamentoSchema = z.object({
    ...expenseBaseSchema,
    collaboratorId: z.string().min(1, "Selecione um colaborador"),
});

const fornecedorSchema = z.object({
    ...expenseBaseSchema,
    payeeName: z.string().min(2, "O nome do fornecedor é obrigatório."),
});

const despesaSchema = z.object({
    ...expenseBaseSchema,
    payeeName: z.string().min(2, "O nome do beneficiário é obrigatório."),
});

const reembolsoSchema = z.object({
    approvedRequestId: z.string().min(1, "Selecione um reembolso aprovado"),
    description: z.string().optional(),
    expenseDate: z.date(),
});


type Status = 'A Cobrar' | 'Cobrança Enviada' | 'Pagamento Enviado' | 'Recebido' | 'Atrasado';

const parseCurrency = (value: string | number | undefined): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const numberValue = parseFloat(value.replace(/\./g, '').replace(',', '.'));
      return isNaN(numberValue) ? 0 : numberValue;
    }
    return 0;
};


export default function FinanceiroPage() {
  const [allRecords, setAllRecords] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isGenerateChargeModalOpen, setIsGenerateChargeModalOpen] = useState(false);
  const [isSaidaModalOpen, setIsSaidaModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  const [selectedRecord, setSelectedRecord] = useState<FinancialRecord | null>(null);
  const [interestDetails, setInterestDetails] = useState<{productTotal: number, daysOverdue: number, interestAmount: number} | null>(null);
  const { toast } = useToast();

  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [approvedRefunds, setApprovedRefunds] = useState<ApprovedRefund[]>([]);


  const configForm = useForm<z.infer<typeof configChargeSchema>>({
    resolver: zodResolver(configChargeSchema),
    defaultValues: {
      paymentType: 'full',
      billingDate: new Date(),
      dueDate: new Date(),
      gracePeriodEndDate: new Date(),
      downPayment: '',
      installments: 1,
      recurringDay: 1,
      downPaymentDueDate: new Date(),
      interestRate: '0',
    }
  });
  
  const generateChargeForm = useForm<z.infer<typeof generateChargeSchema>>({
    resolver: zodResolver(generateChargeSchema),
    defaultValues: {
      chargeType: 'link',
      paymentLink: '',
      boletoCode: '',
    }
  });

  const saidaPagamentoForm = useForm<z.infer<typeof pagamentoSchema>>({
    resolver: zodResolver(pagamentoSchema), defaultValues: { expenseDate: new Date(), amount: '', description: '', collaboratorId: '' }
  });
  const saidaFornecedorForm = useForm<z.infer<typeof fornecedorSchema>>({
    resolver: zodResolver(fornecedorSchema), defaultValues: { expenseDate: new Date(), amount: '', description: '', payeeName: '' }
  });
   const saidaDespesaForm = useForm<z.infer<typeof despesaSchema>>({
    resolver: zodResolver(despesaSchema), defaultValues: { expenseDate: new Date(), amount: '', description: '', payeeName: '' }
  });
  const saidaReembolsoForm = useForm<z.infer<typeof reembolsoSchema>>({
    resolver: zodResolver(reembolsoSchema), defaultValues: { expenseDate: new Date(), approvedRequestId: '', description: '' }
  });


  const paymentType = configForm.watch('paymentType');


  useEffect(() => {
    const fetchSaidaData = async () => {
        const collabsQuery = query(collection(db, 'users'), where('role', '==', 'collaborator'));
        const collabsSnap = await getDocs(collabsQuery);
        setCollaborators(collabsSnap.docs.map(d => ({ uid: d.id, ...d.data() } as Collaborator)));

        const refundsQuery = query(collection(db, 'requests'), where('status', '==', 'Aprovado'), where('requestType', '==', 'refund'));
        const refundsSnap = await getDocs(refundsQuery);
        const refundsData = await Promise.all(refundsSnap.docs.map(async (d) => {
            const request = d.data();
            const budgetRef = doc(db, 'budgets', request.productId);
            const budgetSnap = await getDoc(budgetRef);
            return {
                id: d.id,
                ...request,
                totalAmount: budgetSnap.exists() ? budgetSnap.data().total : 0,
            } as ApprovedRefund;
        }));
        setApprovedRefunds(refundsData);
    }
    fetchSaidaData();


    const q = query(collection(db, 'finance'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const recordsData: FinancialRecord[] = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as FinancialRecord));
      setAllRecords(recordsData); 
      setLoading(false);
    }, (error) => {
      console.error("Error fetching financial records: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  const handleOpenConfigModal = (record: FinancialRecord) => {
    setSelectedRecord(record);
    configForm.reset({ 
      paymentType: 'full',
      billingDate: new Date(),
      dueDate: new Date(),
      gracePeriodEndDate: new Date(),
      downPayment: '',
      installments: 1,
      recurringDay: 1,
      downPaymentDueDate: new Date(),
      interestRate: '0',
    });
    setIsConfigModalOpen(true);
  }

  const handleOpenGenerateChargeModal = (record: FinancialRecord) => {
    setSelectedRecord(record);
    generateChargeForm.reset({
      chargeType: 'link',
      paymentLink: record.paymentLink || '',
      boletoCode: record.boletoCode || '',
    })
    setIsGenerateChargeModalOpen(true);
  }
  
  const handleOpenDetailModal = async (record: FinancialRecord) => {
    setSelectedRecord(record);
    const isOverdue = record.gracePeriodEndDate && isPast(startOfDay(record.gracePeriodEndDate.toDate())) && record.status !== 'Recebido';

    if(isOverdue && record.originalBudgetId && record.interestRate) {
        const budgetRef = doc(db, 'budgets', record.originalBudgetId);
        const budgetSnap = await getDoc(budgetRef);
        if (budgetSnap.exists()) {
            const budgetData = budgetSnap.data() as Budget;
            const daysOverdue = differenceInCalendarDays(new Date(), record.gracePeriodEndDate.toDate());
             if (daysOverdue > 0) {
                const dailyRate = (record.interestRate / 100) / 30; // Monthly rate to daily
                const interestAmount = budgetData.total * dailyRate * daysOverdue;
                setInterestDetails({
                    productTotal: budgetData.total,
                    daysOverdue: daysOverdue,
                    interestAmount: interestAmount,
                });
            } else {
                 setInterestDetails(null);
            }
        }
    } else {
        setInterestDetails(null);
    }
    setIsDetailModalOpen(true);
  }

  const sendReceiptEmail = async (receipt: any) => {
    const clientRef = doc(db, 'users', receipt.clientId);
    const clientSnap = await getDoc(clientRef);
    if (!clientSnap.exists() || !clientSnap.data().email) {
        toast({ title: "Cliente sem e-mail", description: "Não foi possível enviar o recibo pois o cliente não possui e-mail cadastrado.", variant: "destructive" });
        return;
    }
    const clientEmail = clientSnap.data().email;

    const emailContent = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h1 style="color: #6d28d9;">Recibo de Pagamento - Delvind</h1>
            <p>Olá, ${receipt.clientName},</p>
            <p>Confirmamos o recebimento do seu pagamento referente a <strong>${receipt.title}</strong>.</p>
            <hr>
            <h3>Detalhes do Pagamento</h3>
            <p><strong>Valor Total Pago:</strong> ${formatCurrency(receipt.totalAmount)}</p>
            <p><strong>Data do Pagamento:</strong> ${formatDate(receipt.paidAt)}</p>
            <p><strong>ID do Recibo:</strong> ${receipt.id.slice(0, 8).toUpperCase()}</p>
            <hr>
            <p>Agradecemos pela sua confiança!</p>
            <p>Atenciosamente,<br>Equipe Delvind</p>
        </div>
    `;

    await addDoc(collection(db, 'mail'), {
        to: clientEmail,
        message: {
            subject: `Seu Recibo de Pagamento - ${receipt.title}`,
            html: emailContent,
        },
    });

    toast({ title: "Recibo enviado!", description: `O recibo foi enviado para o e-mail ${clientEmail}.`});
  };

  const handlePaymentAction = async (record: FinancialRecord, action: 'confirm' | 'reject') => {
    if (!record) return;
    try {
        const recordRef = doc(db, 'finance', record.id);
        if (action === 'confirm') {
            let interestAmount = 0;
            
            const isOverdue = record.gracePeriodEndDate && isPast(startOfDay(record.gracePeriodEndDate.toDate())) && record.status !== 'Recebido';
            if (isOverdue && record.originalBudgetId && record.interestRate) {
                const budgetRef = doc(db, 'budgets', record.originalBudgetId);
                const budgetSnap = await getDoc(budgetRef);
                if (budgetSnap.exists()) {
                    const budgetData = budgetSnap.data() as Budget;
                    const daysOverdue = differenceInCalendarDays(new Date(), record.gracePeriodEndDate.toDate());
                    if (daysOverdue > 0) {
                        const dailyRate = record.interestRate / 100 / 30; // Monthly rate to daily
                        interestAmount = budgetData.total * dailyRate * daysOverdue;
                    }
                }
            }

            await updateDoc(recordRef, { status: 'Recebido' });
            
            const newReceiptRef = doc(collection(db, 'receipts'));
            const newReceipt = {
                id: newReceiptRef.id,
                clientId: record.clientId,
                clientName: record.clientName,
                financeRecordId: record.id,
                title: record.title,
                originalAmount: record.totalAmount,
                interestAmount: interestAmount,
                totalAmount: record.totalAmount + interestAmount,
                paidAt: serverTimestamp(),
                originalBudgetId: record.originalBudgetId || null,
                viewedByClient: false,
            };

            await setDoc(newReceiptRef, newReceipt);
            await sendReceiptEmail(newReceipt); // Send email automatically

            toast({ title: 'Pagamento Confirmado!', description: 'O registro foi movido para "Recebido" e o comprovante foi gerado e enviado.' });
        } else {
            await updateDoc(recordRef, { status: 'Cobrança Enviada' });
            toast({ title: 'Pagamento Rejeitado', description: 'O registro voltou para "Cobrança Enviada" e o cliente será notificado.' });
        }
        setSelectedRecord(null);
        if(isGenerateChargeModalOpen) setIsGenerateChargeModalOpen(false);
    } catch (error) {
         toast({ title: 'Erro', description: `Não foi possível ${action === 'confirm' ? 'confirmar' : 'rejeitar'} o pagamento.`, variant: 'destructive'});
    }
  }


    const handleConfigSubmit = async (values: z.infer<typeof configChargeSchema>) => {
        if (!selectedRecord) return;
        
        const batch = writeBatch(db);
        const originalRecordRef = doc(db, 'finance', selectedRecord.id);

        try {
            if (values.paymentType === 'installments' && values.installments && values.installments > 0) {
                let remainingAmount = selectedRecord.totalAmount;
                const installmentCount = values.installments;
                
                if (values.downPayment && parseCurrency(values.downPayment) > 0) {
                    const downPaymentAmount = parseCurrency(values.downPayment);
                    remainingAmount -= downPaymentAmount;

                    const downPaymentRef = doc(collection(db, 'finance'));
                    batch.set(downPaymentRef, {
                        ...selectedRecord, id: downPaymentRef.id, title: `${selectedRecord.title} - Entrada`, totalAmount: downPaymentAmount,
                        status: 'Cobrança Enviada', createdAt: serverTimestamp(), billingDate: new Date(), dueDate: values.downPaymentDueDate || new Date(),
                        gracePeriodEndDate: values.downPaymentDueDate || new Date(), entryType: 'installment', originalBudgetId: selectedRecord.originalBudgetId || selectedRecord.id,
                        installmentNumber: 0, interestRate: parseCurrency(values.interestRate),
                    });
                }

                const installmentAmount = remainingAmount / installmentCount;
                for (let i = 1; i <= installmentCount; i++) {
                    const installmentRef = doc(collection(db, 'finance'));
                    batch.set(installmentRef, {
                        ...selectedRecord, id: installmentRef.id, title: `${selectedRecord.title} - Parcela ${i}/${installmentCount}`, totalAmount: installmentAmount,
                        status: 'Cobrança Enviada', createdAt: serverTimestamp(), billingDate: addMonths(values.billingDate, i-1),
                        dueDate: addMonths(values.dueDate, i-1), gracePeriodEndDate: addMonths(values.gracePeriodEndDate, i-1),
                        entryType: 'installment', originalBudgetId: selectedRecord.originalBudgetId || selectedRecord.id,
                        installmentNumber: i, interestRate: parseCurrency(values.interestRate),
                    });
                }

                batch.delete(originalRecordRef);
                toast({ title: "Parcelamento Gerado!", description: "As parcelas foram criadas e movidas para 'Cobrança Enviada'."});

            } else {
                const updateData: any = {
                    status: 'Cobrança Enviada', billingDate: values.billingDate, dueDate: values.dueDate,
                    gracePeriodEndDate: values.gracePeriodEndDate, interestRate: parseCurrency(values.interestRate),
                };
                if (values.paymentType === 'recurring' && values.recurringDay) {
                    updateData.recurringDay = values.recurringDay;
                }
                batch.update(originalRecordRef, updateData);
                toast({ title: "Cobrança Configurada!", description: "O registro foi movido para 'Cobrança Enviada'."});
            }
            
            await batch.commit();

        } catch (error) {
            console.error("Error generating invoice: ", error);
            toast({ title: 'Erro', description: 'Não foi possível configurar a cobrança.', variant: 'destructive'});
        } finally {
            setIsConfigModalOpen(false);
            setSelectedRecord(null);
        }
  };

  const handleGenerateChargeSubmit = async (values: z.infer<typeof generateChargeSchema>) => {
    if (!selectedRecord) return;
    try {
        const recordRef = doc(db, 'finance', selectedRecord.id);
        const updatedData: any = {
            paymentLink: values.paymentLink || null,
            boletoCode: values.boletoCode || null,
            status: 'Cobrança Enviada',
            newInvoiceRequested: false, 
        };
        await updateDoc(recordRef, updatedData);
        toast({ title: 'Cobrança Enviada!', description: 'O link ou boleto foi anexado e o status foi atualizado.' });
    } catch(error) {
        console.error("Error attaching charge info:", error);
        toast({ title: 'Erro', description: 'Não foi possível anexar as informações de cobrança.', variant: 'destructive'});
    } finally {
        setIsGenerateChargeModalOpen(false);
        setSelectedRecord(null);
    }
};

 const handleSaidaSubmit = async (values: any, type: 'collaborator' | 'supplier' | 'general' | 'refund') => {
    try {
        const dataToSave: any = {
            type,
            description: values.description,
            createdAt: serverTimestamp(),
            expenseDate: values.expenseDate,
        };

        if (type === 'refund') {
            const refundRequest = approvedRefunds.find(r => r.id === values.approvedRequestId);
            if (!refundRequest) throw new Error("Reembolso não encontrado");
            dataToSave.amount = refundRequest.totalAmount;
            dataToSave.payeeName = refundRequest.clientName;
            dataToSave.payeeId = refundRequest.clientId;
            dataToSave.originalRequestId = refundRequest.id;
        } else {
            dataToSave.amount = parseCurrency(values.amount);
             if (type === 'collaborator') {
                const collaborator = collaborators.find(c => c.uid === values.collaboratorId);
                dataToSave.payeeName = collaborator?.displayName;
                dataToSave.payeeId = collaborator?.uid;
            } else {
                 dataToSave.payeeName = values.payeeName;
            }
        }
        
        await addDoc(collection(db, 'expenses'), dataToSave);
        toast({ title: "Lançamento de Saída Registrado", description: "A despesa foi registrada com sucesso." });
        setIsSaidaModalOpen(false);
        saidaPagamentoForm.reset();
        saidaFornecedorForm.reset();
        saidaDespesaForm.reset();
        saidaReembolsoForm.reset();

    } catch (error) {
         toast({ title: "Erro ao registrar saída", variant: "destructive"});
         console.error(error);
    }
  }

  const handleDeleteRecord = async (recordId: string) => {
    try {
        await deleteDoc(doc(db, "finance", recordId));
        toast({ title: "Registro Excluído", description: "A cobrança foi removida com sucesso."});
    } catch (error) {
        toast({ title: "Erro ao Excluir", description: "Não foi possível remover a cobrança.", variant: "destructive"});
    }
  }


  const formatCurrency = (value: number) => {
    if (typeof value !== 'number') return 'R$ 0,00';
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
  
  const getStatusInfo = (record: FinancialRecord) => {
      const isOverdue = record.status !== 'Recebido' && record.gracePeriodEndDate && isPast(startOfDay(record.gracePeriodEndDate.toDate()));
      if (isOverdue) return { text: 'Vencido', variant: 'destructive' as const, className: 'bg-red-600 text-white' };
      if (record.status === 'Recebido') return { text: 'Recebido', variant: 'default' as const, className: 'bg-green-600 text-white' };
      if (record.status === 'Pagamento Enviado') return { text: 'Em Análise', variant: 'default' as const, className: 'bg-purple-600 text-white' };
      if (record.status === 'Cobrança Enviada') return { text: 'Aguardando Pag.', variant: 'secondary' as const, className: 'bg-orange-500 text-white' };
      if (record.status === 'A Cobrar') return { text: 'Aguardando Config.', variant: 'secondary' as const, className: 'bg-yellow-500 text-white' };
      return { text: record.status, variant: 'secondary' as const, className: 'bg-blue-500 text-white' };
  }
  
  const filteredRecords = useMemo(() => {
    return {
      awaitingConfig: allRecords.filter(r => r.status === 'A Cobrar'),
      sent: allRecords.filter(r => ['Cobrança Enviada', 'Atrasado'].includes(r.status) || (r.status !== 'Recebido' && r.gracePeriodEndDate && isPast(startOfDay(r.gracePeriodEndDate.toDate())))),
      analyzing: allRecords.filter(r => r.status === 'Pagamento Enviado'),
      paid: allRecords.filter(r => r.status === 'Recebido'),
    }
  }, [allRecords]);
  

  const renderTable = (recordsToRender: FinancialRecord[], emptyMessage: string, tabName: string) => {
    return (
        <Card>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Valor Total</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                        <TableRow>
                            <TableCell colSpan={6}><Skeleton className="h-20 w-full" /></TableCell>
                        </TableRow>
                        ) : recordsToRender.length > 0 ? (
                            recordsToRender.map((record: FinancialRecord) => (
                            <TableRow key={record.id} className="cursor-pointer">
                                <TableCell className="font-medium" onClick={() => handleOpenDetailModal(record)}>
                                    <div className="flex items-center gap-2">
                                    {record.newInvoiceRequested && <FileWarning className="h-4 w-4 text-orange-500" aria-label="Nova fatura solicitada" />}
                                        {record.clientName}
                                    </div>
                                </TableCell>
                                <TableCell onClick={() => handleOpenDetailModal(record)}>
                                <div className='flex flex-col'>
                                    <span>{record.title}</span>
                                    {record.entryType === 'budget' && (
                                        <Badge variant="outline" className="mt-1 w-fit bg-green-100 border-green-300 text-green-800">
                                            <FileCheck className="mr-1 h-3 w-3" />
                                            Orçamento Aprovado
                                        </Badge>
                                    )}
                                </div>
                                </TableCell>
                                <TableCell onClick={() => handleOpenDetailModal(record)}>{formatCurrency(record.totalAmount)}</TableCell>
                                <TableCell onClick={() => handleOpenDetailModal(record)}>{formatDate(record.dueDate)}</TableCell>
                                <TableCell onClick={() => handleOpenDetailModal(record)}>
                                    <Badge 
                                        variant={getStatusInfo(record).variant}
                                        className={getStatusInfo(record).className}
                                    >
                                        {getStatusInfo(record).text}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right space-x-1">
                                    {tabName === 'awaitingConfig' && (
                                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenConfigModal(record);}}>
                                            <DollarSign className="mr-2 h-4 w-4" /> Configurar
                                        </Button>
                                    )}
                                    
                                    {tabName !== 'awaitingConfig' && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
                                                    <HandCoins className="mr-2 h-4 w-4" /> Analisar
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                <AlertDialogTitle>Analisar Pagamento</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    O cliente {record.clientName} informou que pagou {formatCurrency(record.totalAmount)} referente a "{record.title}". Você confirma o recebimento?
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <Button variant="destructive" onClick={() => handlePaymentAction(record, 'reject')}><XCircle className="mr-2"/> Rejeitar</Button>
                                                    <Button variant="default" onClick={() => handlePaymentAction(record, 'confirm')} className='bg-green-600 hover:bg-green-700'><CheckCircle className="mr-2"/> Confirmar Recebimento</Button>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                     <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleOpenDetailModal(record);}}>
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                     {['awaitingConfig', 'sent'].includes(tabName) && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => e.stopPropagation()}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                <AlertDialogTitle>Excluir Registro?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Tem certeza que deseja excluir a cobrança "{record.title}"? Esta ação não pode ser desfeita.
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction className="bg-destructive hover:bg-destructive/80" onClick={() => handleDeleteRecord(record.id)}>Sim, Excluir</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))
                        ) : (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24">
                            {emptyMessage}
                            </TableCell>
                        </TableRow>
                        )}
                    </TableBody>
                </Table>
                </div>
            </CardContent>
        </Card>
    );
  }

  return (
    <>
    <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
        <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
                <DialogTitle>Configurar Cobrança</DialogTitle>
                <DialogDescription>
                    Defina as condições de pagamento para: <span className="font-semibold">{selectedRecord?.title}</span>
                </DialogDescription>
            </DialogHeader>
            <Form {...configForm}>
                <form id="config-charge-form" onSubmit={configForm.handleSubmit(handleConfigSubmit)} className="space-y-4 py-4">
                    <FormField control={configForm.control} name="paymentType" render={({ field }) => (
                        <FormItem className="space-y-3"><FormLabel>Tipo de Pagamento</FormLabel>
                            <FormControl>
                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="full" /></FormControl><FormLabel className="font-normal">Integral</FormLabel></FormItem>
                                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="installments" /></FormControl><FormLabel className="font-normal">Parcelado</FormLabel></FormItem>
                                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="recurring" /></FormControl><FormLabel className="font-normal">Recorrente</FormLabel></FormItem>
                                </RadioGroup>
                            </FormControl><FormMessage />
                        </FormItem>
                    )} />
                    
                    {paymentType === 'installments' && (
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField control={configForm.control} name="installments" render={({ field }) => (
                                <FormItem><FormLabel>Nº de Parcelas</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={configForm.control} name="downPayment" render={({ field }) => (
                                <FormItem><FormLabel>Valor de Entrada (R$)</FormLabel><FormControl><Input placeholder="0,00" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={configForm.control} name="downPaymentDueDate" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Venc. da Entrada</FormLabel><Popover>
                                    <PopoverTrigger asChild><FormControl>
                                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                        {field.value ? (format(field.value, "PPP", { locale: ptBR })) : (<span>Escolha a data</span>)}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button></FormControl></PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                                </Popover><FormMessage /></FormItem>
                            )}/>
                        </div>
                    )}
                    
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField control={configForm.control} name="billingDate" render={({ field }) => (
                            <FormItem className="flex flex-col"><FormLabel>Data da Fatura</FormLabel><Popover>
                                <PopoverTrigger asChild><FormControl>
                                <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? (format(field.value, "PPP", { locale: ptBR })) : (<span>Escolha uma data</span>)}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button></FormControl></PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                            </Popover><FormMessage /></FormItem>
                        )}/>
                        <FormField control={configForm.control} name="dueDate" render={({ field }) => (
                            <FormItem className="flex flex-col"><FormLabel>Data de Vencimento</FormLabel><Popover>
                                <PopoverTrigger asChild><FormControl>
                                <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? (format(field.value, "PPP", { locale: ptBR })) : (<span>Escolha uma data</span>)}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button></FormControl></PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                            </Popover><FormMessage /></FormItem>
                        )}/>
                         <FormField control={configForm.control} name="gracePeriodEndDate" render={({ field }) => (
                            <FormItem className="flex flex-col"><FormLabel>Prazo Final (sem juros)</FormLabel><Popover>
                                <PopoverTrigger asChild><FormControl>
                                <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? (format(field.value, "PPP", { locale: ptBR })) : (<span>Escolha uma data</span>)}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button></FormControl></PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                            </Popover><FormMessage /></FormItem>
                        )}/>
                    </div>

                     <FormField control={configForm.control} name="interestRate" render={({ field }) => (
                        <FormItem><FormLabel>Taxa de Juros por mês de atraso (%)</FormLabel><FormControl><Input type="number" min="0" step="0.1" placeholder='Ex: 2' {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    
                </form>
            </Form>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsConfigModalOpen(false)}>Cancelar</Button>
                <Button type="submit" form="config-charge-form">
                  Salvar Configuração
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{selectedRecord?.title}</DialogTitle>
                <DialogDescription>
                    Detalhes da cobrança para {selectedRecord?.clientName}
                </DialogDescription>
            </DialogHeader>
            {selectedRecord && (
                <div className='py-4 space-y-4'>
                     <p><strong>Valor Original:</strong> {formatCurrency(selectedRecord.totalAmount)}</p>
                     {interestDetails && selectedRecord.interestRate && (
                        <Card className='bg-destructive/10 border-destructive/50'>
                            <CardHeader className='pb-2'><CardTitle className='text-destructive text-base'>Cálculo de Juros ({selectedRecord.interestRate}% a.m. sobre o total do produto)</CardTitle></CardHeader>
                            <CardContent className='text-sm space-y-1'>
                                <p><strong>Total do Produto:</strong> {formatCurrency(interestDetails.productTotal)}</p>
                                <p><strong>Dias em Atraso:</strong> {interestDetails.daysOverdue}</p>
                                <p><strong>Juros Acumulados:</strong> {formatCurrency(interestDetails.interestAmount)}</p>
                                <p className='font-bold text-base pt-2'><strong>Novo Valor Sugerido:</strong> {formatCurrency(selectedRecord.totalAmount + interestDetails.interestAmount)}</p>
                            </CardContent>
                        </Card>
                     )}
                </div>
            )}
            <DialogFooter>
                <Button onClick={() => setIsDetailModalOpen(false)}>Fechar</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    
    <Dialog open={isSaidaModalOpen} onOpenChange={setIsSaidaModalOpen}>
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>Lançar Saída Financeira</DialogTitle>
                <DialogDescription>Registre pagamentos, despesas, fornecedores ou reembolsos.</DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="pagamento">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="pagamento">Colaborador</TabsTrigger>
                    <TabsTrigger value="fornecedor">Fornecedor</TabsTrigger>
                    <TabsTrigger value="despesa">Despesa Geral</TabsTrigger>
                    <TabsTrigger value="reembolso">Reembolso</TabsTrigger>
                </TabsList>
                <TabsContent value="pagamento">
                    <Form {...saidaPagamentoForm}>
                        <form onSubmit={saidaPagamentoForm.handleSubmit(d => handleSaidaSubmit(d, 'collaborator'))} className="space-y-4 pt-4">
                             <FormField control={saidaPagamentoForm.control} name="collaboratorId" render={({ field }) => (
                                <FormItem><FormLabel>Colaborador</FormLabel><Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Selecione o colaborador" /></SelectTrigger></FormControl>
                                <SelectContent>{collaborators.map(c => <SelectItem key={c.uid} value={c.uid}>{c.displayName}</SelectItem>)}</SelectContent>
                                </Select><FormMessage /></FormItem>
                            )}/>
                            <FormField control={saidaPagamentoForm.control} name="amount" render={({ field }) => ( <FormItem><FormLabel>Valor (R$)</FormLabel><FormControl><Input placeholder="0,00" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={saidaPagamentoForm.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea placeholder="Ex: Adiantamento salarial" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={saidaPagamentoForm.control} name="expenseDate" render={({ field }) => ( <FormItem className='flex flex-col'><FormLabel>Data da Saída</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className="pl-3 text-left font-normal">{format(field.value, "PPP", { locale: ptBR })}</Button></FormControl></PopoverTrigger><PopoverContent><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem> )} />
                            <DialogFooter className="pt-4"><Button type="submit">Registrar Pagamento</Button></DialogFooter>
                        </form>
                    </Form>
                </TabsContent>
                <TabsContent value="fornecedor">
                     <Form {...saidaFornecedorForm}>
                        <form onSubmit={saidaFornecedorForm.handleSubmit(d => handleSaidaSubmit(d, 'supplier'))} className="space-y-4 pt-4">
                            <FormField control={saidaFornecedorForm.control} name="payeeName" render={({ field }) => ( <FormItem><FormLabel>Nome do Fornecedor/Serviço</FormLabel><FormControl><Input placeholder="Ex: AWS, Google Workspace" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={saidaFornecedorForm.control} name="amount" render={({ field }) => ( <FormItem><FormLabel>Valor (R$)</FormLabel><FormControl><Input placeholder="0,00" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={saidaFornecedorForm.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea placeholder="Ex: Fatura de hospedagem do servidor" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={saidaFornecedorForm.control} name="expenseDate" render={({ field }) => ( <FormItem className='flex flex-col'><FormLabel>Data da Saída</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className="pl-3 text-left font-normal">{format(field.value, "PPP", { locale: ptBR })}</Button></FormControl></PopoverTrigger><PopoverContent><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem> )} />
                            <DialogFooter className="pt-4"><Button type="submit">Registrar Despesa</Button></DialogFooter>
                        </form>
                    </Form>
                </TabsContent>
                 <TabsContent value="despesa">
                    <Form {...saidaDespesaForm}>
                        <form onSubmit={saidaDespesaForm.handleSubmit(d => handleSaidaSubmit(d, 'general'))} className="space-y-4 pt-4">
                             <FormField control={saidaDespesaForm.control} name="payeeName" render={({ field }) => ( <FormItem><FormLabel>Beneficiário</FormLabel><FormControl><Input placeholder="Ex: Compra de material" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={saidaDespesaForm.control} name="amount" render={({ field }) => ( <FormItem><FormLabel>Valor (R$)</FormLabel><FormControl><Input placeholder="0,00" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={saidaDespesaForm.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea placeholder="Ex: Compra de material de escritório" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={saidaDespesaForm.control} name="expenseDate" render={({ field }) => ( <FormItem className='flex flex-col'><FormLabel>Data da Saída</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className="pl-3 text-left font-normal">{format(field.value, "PPP", { locale: ptBR })}</Button></FormControl></PopoverTrigger><PopoverContent><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem> )} />
                            <DialogFooter className="pt-4"><Button type="submit">Registrar Despesa</Button></DialogFooter>
                        </form>
                    </Form>
                </TabsContent>
                <TabsContent value="reembolso">
                    <Form {...saidaReembolsoForm}>
                        <form onSubmit={saidaReembolsoForm.handleSubmit(d => handleSaidaSubmit(d, 'refund'))} className="space-y-4 pt-4">
                            <FormField control={saidaReembolsoForm.control} name="approvedRequestId" render={({ field }) => (
                                <FormItem><FormLabel>Pedido de Reembolso Aprovado</FormLabel><Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Selecione o reembolso aprovado" /></SelectTrigger></FormControl>
                                <SelectContent>{approvedRefunds.map(r => <SelectItem key={r.id} value={r.id}>{r.clientName} - {r.productTitle} ({formatCurrency(r.totalAmount)})</SelectItem>)}</SelectContent>
                                </Select><FormMessage /></FormItem>
                            )}/>
                            <FormField control={saidaReembolsoForm.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Observação (Opcional)</FormLabel><FormControl><Textarea placeholder="Detalhes adicionais do reembolso..." {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={saidaReembolsoForm.control} name="expenseDate" render={({ field }) => ( <FormItem className='flex flex-col'><FormLabel>Data da Saída</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className="pl-3 text-left font-normal">{format(field.value, "PPP", { locale: ptBR })}</Button></FormControl></PopoverTrigger><PopoverContent><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem> )} />
                            <DialogFooter className="pt-4"><Button type="submit">Registrar Reembolso</Button></DialogFooter>
                        </form>
                    </Form>
                </TabsContent>
            </Tabs>
        </DialogContent>
    </Dialog>


    <main className="flex-1 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Painel Financeiro</h1>
         <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsSaidaModalOpen(true)}>
                <ArrowDownUp className="mr-2 h-4 w-4" />
                Lançar Saídas
            </Button>
            <Button asChild>
                <Link href="/admin/financeiro/create">
                    <PlusCircle className="mr-2 h-4 w-4" /> 
                    Lançamento Manual
                </Link>
            </Button>
        </div>
      </div>
      
      <Tabs defaultValue="awaitingConfig" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="awaitingConfig">Aguardando Config.</TabsTrigger>
          <TabsTrigger value="sent">Cobranças Enviadas</TabsTrigger>
          <TabsTrigger value="analyzing">Pagamentos em Análise</TabsTrigger>
          <TabsTrigger value="paid">Histórico de Recebidos</TabsTrigger>
        </TabsList>
        <TabsContent value="awaitingConfig" className="mt-4">
          {renderTable(filteredRecords.awaitingConfig, "Nenhum item aguardando configuração.", 'awaitingConfig')}
        </TabsContent>
        <TabsContent value="sent" className="mt-4">
           {renderTable(filteredRecords.sent, "Nenhuma cobrança enviada encontrada.", 'sent')}
        </TabsContent>
         <TabsContent value="analyzing" className="mt-4">
           {renderTable(filteredRecords.analyzing, "Nenhum pagamento em análise.", 'analyzing')}
        </TabsContent>
        <TabsContent value="paid" className="mt-4">
           {renderTable(filteredRecords.paid, "Nenhum pagamento recebido ainda.", 'paid')}
        </TabsContent>
      </Tabs>

    </main>
    </>
  );
}
