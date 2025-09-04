
'use client';

import { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { collection, query, where, onSnapshot, getDocs, orderBy, doc, updateDoc, addDoc, serverTimestamp, setDoc, writeBatch, documentId, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Skeleton } from '../../../components/ui/skeleton';
import { User, Building, Phone, Mail, FileText, AlertTriangle, Package, Users, Eye, Trash2, RefreshCcw, Notebook, Globe, Check, X, Link as LinkIcon, PlusCircle, CalendarIcon, Edit } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '../../../hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../../components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { addMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { defaultServices } from '@/lib/constants';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Responsible = {
    name: string;
    email: string;
    role: string;
    cpf: string;
    rg: string;
    phone: string;
};

type Service = {
    id: string;
    name: string;
    active: boolean;
    link?: string;
    linkedBudgetId?: string;
};

type Customer = {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  phone?: string;
  notes?: string;
  services?: Service[];
  // Pessoa Física
  cpf?: string;
  // Pessoa Jurídica
  cnpj?: string;
  razaoSocial?: string;
  inscricaoEstadual?: string;
  inscricaoMunicipal?: string;
  // Endereço
  address?: string;
  addressNumber?: string;
  neighborhood?: string;
  city?: string;
  uf?: string;
  // Outros
  companyDescription?: string;
  responsibles?: Responsible[];
};


type Budget = {
    id: string;
    title: string;
    total: number;
    status: 'Pendente' | 'Aprovado' | 'Recusado';
    createdAt: any;
    clientId: string;
};

type FinancialRecord = {
    id: string;
    title: string;
    totalAmount: number;
    status: 'A Cobrar' | 'A Receber' | 'Cobrança Enviada' | 'Pagamento Enviado' | 'Recebido' | 'Atrasado';
    entryType: 'budget' | 'manual' | 'installment';
    originalBudgetId?: string;
    installmentNumber?: number;
    dueDate?: any;
    createdAt: any;
    clientName: string;
    clientId: string;
    advancedInstallmentId?: string;
};

export default function ClientsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  const [activeProducts, setActiveProducts] = useState<Budget[]>([]);
  const [overdueRecords, setOverdueRecords] = useState<FinancialRecord[]>([]);

  const [loadingFinancials, setLoadingFinancials] = useState(false);
  const [isInstallmentsModalOpen, setIsInstallmentsModalOpen] = useState(false);
  const [installments, setInstallments] = useState<FinancialRecord[]>([]);
  const [activeRecord, setActiveRecord] = useState<Budget | FinancialRecord | null>(null);
  const { toast } = useToast();
  
  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  
  const [services, setServices] = useState<Service[]>([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [isSavingServices, setIsSavingServices] = useState(false);
  
  const [isEditDatesModalOpen, setIsEditDatesModalOpen] = useState(false);
  const [newDueDate, setNewDueDate] = useState<Date | undefined>();

  const [isReparcelamentoModalOpen, setIsReparcelamentoModalOpen] = useState(false);
  const [newInstallmentCount, setNewInstallmentCount] = useState(1);
  const [newBillingDate, setNewBillingDate] = useState<Date | undefined>(new Date());
  const [newInstallmentDueDate, setNewInstallmentDueDate] = useState<Date | undefined>(new Date());
  const [newGracePeriodDate, setNewGracePeriodDate] = useState<Date | undefined>(new Date());
  const [newInterestRate, setNewInterestRate] = useState('0');
  const [isReparcelando, setIsReparcelando] = useState(false);


  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'customer'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const customerData: Customer[] = [];
      querySnapshot.forEach((doc) => {
        customerData.push({ uid: doc.id, ...doc.data() } as Customer);
      });
      setCustomers(customerData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching customers: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  const handleManageClick = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setNotes(customer.notes || '');

    // Initialize services
    const userServices = customer.services || [];
    const allServiceNames = new Set([...defaultServices.map(s => s.name), ...userServices.map(s => s.name)]);
    const combinedServices = Array.from(allServiceNames).map((name, index) => {
        const userService = userServices.find(s => s.name === name);
        return {
            id: userService?.id || `${customer.uid}-${Date.now()}-${index}`,
            name: name,
            active: userService?.active || false,
            link: userService?.link || '',
            linkedBudgetId: userService?.linkedBudgetId || ''
        };
    });
    setServices(combinedServices);


    setIsModalOpen(true);
    setLoadingFinancials(true);
    
    // Fetch approved budgets as "active products"
    const productsQuery = query(
        collection(db, 'budgets'), 
        where('clientId', '==', customer.uid),
        where('status', '==', 'Aprovado'),
        orderBy('createdAt', 'desc')
    );
    const productsSnapshot = await getDocs(productsQuery);
    const productsData: Budget[] = [];
    productsSnapshot.forEach(doc => {
        productsData.push({ id: doc.id, ...doc.data() } as Budget);
    });
    setActiveProducts(productsData);

    // Fetch overdue financial records
    const overdueQuery = query(
        collection(db, 'finance'), 
        where('clientId', '==', customer.uid), 
        where('status', '==', 'Atrasado'),
        orderBy('createdAt', 'desc')
    );
    const overdueSnapshot = await getDocs(overdueQuery);
    const overdueData: FinancialRecord[] = [];
    overdueSnapshot.forEach(doc => {
        overdueData.push({ id: doc.id, ...doc.data() } as FinancialRecord);
    });
    setOverdueRecords(overdueData);

    setLoadingFinancials(false);
  }
  
  const handleViewDetails = async (record: Budget | FinancialRecord) => {
    setActiveRecord(record);
    const budgetIdToQuery = 'total' in record ? record.id : record.originalBudgetId;
    if (!budgetIdToQuery) {
        toast({ title: "Aviso", description: "Este é um lançamento único. Nenhuma parcela para exibir.", variant: "default"});
        setInstallments([]);
        setIsInstallmentsModalOpen(true);
        return;
    }

    const installmentsQuery = query(collection(db, 'finance'), where('originalBudgetId', '==', budgetIdToQuery), orderBy('installmentNumber', 'asc'));
    const querySnapshot = await getDocs(installmentsQuery);
    const installmentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as FinancialRecord);
    
    if (installmentsData.length === 0) {
        toast({ title: "Aviso", description: "Nenhuma parcela encontrada para este produto.", variant: "default"});
    }

    setInstallments(installmentsData);
    setIsInstallmentsModalOpen(true);
  };
  
  const handleUpdateInstallmentDates = async () => {
    if (!newDueDate || installments.length === 0) {
        toast({ title: "Erro", description: "Selecione uma nova data de vencimento.", variant: "destructive" });
        return;
    }

    const firstOpenInstallmentIndex = installments.findIndex(inst => inst.status !== 'Recebido');

    if (firstOpenInstallmentIndex === -1) {
        toast({ title: "Aviso", description: "Todas as parcelas já foram pagas.", variant: "default" });
        setIsEditDatesModalOpen(false);
        return;
    }
    
    const batch = writeBatch(db);

    for (let i = firstOpenInstallmentIndex; i < installments.length; i++) {
        const installment = installments[i];
        const monthOffset = i - firstOpenInstallmentIndex;
        const newDateForInstallment = addMonths(newDueDate, monthOffset);

        const installmentRef = doc(db, 'finance', installment.id);
        batch.update(installmentRef, { dueDate: newDateForInstallment });
    }

    try {
        await batch.commit();
        toast({ title: "Sucesso!", description: "As datas de vencimento foram atualizadas." });
        // Re-fetch installments to show updated dates
        handleViewDetails(activeRecord!);
    } catch(e) {
        console.error(e);
        toast({ title: "Erro", description: "Não foi possível atualizar as datas.", variant: "destructive" });
    } finally {
        setIsEditDatesModalOpen(false);
        setNewDueDate(undefined);
    }
  };

  const handleReparcelamento = async () => {
    setIsReparcelando(true);
    if (!activeRecord || !selectedCustomer || !newBillingDate || !newInstallmentDueDate || !newGracePeriodDate) {
        toast({ title: "Erro", description: "Dados insuficientes para reparcelar.", variant: "destructive" });
        setIsReparcelando(false);
        return;
    }

    const budgetId = 'total' in activeRecord ? activeRecord.id : activeRecord.originalBudgetId;
    if (!budgetId) {
        toast({ title: "Erro", description: "ID do Orçamento original não encontrado.", variant: "destructive" });
        setIsReparcelando(false);
        return;
    }
    
    try {
        const budgetRef = doc(db, 'budgets', budgetId);
        const budgetSnap = await getDoc(budgetRef);
        if (!budgetSnap.exists()) throw new Error("Orçamento original não encontrado.");
        const budgetData = budgetSnap.data();

        const installmentsQuery = query(collection(db, 'finance'), where('originalBudgetId', '==', budgetId));
        const installmentsSnap = await getDocs(installmentsQuery);
        
        let totalPaid = 0;
        const unpaidInstallmentRefs: any[] = [];
        installmentsSnap.forEach(doc => {
            const installment = doc.data();
            if (installment.status === 'Recebido') {
                totalPaid += installment.totalAmount;
            } else {
                unpaidInstallmentRefs.push(doc.ref);
            }
        });

        const remainingDebt = budgetData.total - totalPaid;
        if (remainingDebt <= 0) {
            toast({ title: "Aviso", description: "Esta dívida já foi totalmente quitada.", variant: "default" });
            setIsReparcelando(false);
            return;
        }
        const newInstallmentAmount = remainingDebt / newInstallmentCount;

        const batch = writeBatch(db);

        unpaidInstallmentRefs.forEach(ref => batch.delete(ref));
        
        for (let i = 1; i <= newInstallmentCount; i++) {
            const newInstallmentRef = doc(collection(db, 'finance'));
            batch.set(newInstallmentRef, {
                clientId: selectedCustomer.uid,
                clientName: selectedCustomer.displayName,
                title: `${budgetData.title} - Reparc. ${i}/${newInstallmentCount}`,
                totalAmount: newInstallmentAmount,
                status: 'A Receber',
                createdAt: serverTimestamp(),
                billingDate: addMonths(newBillingDate, i - 1),
                dueDate: addMonths(newInstallmentDueDate, i - 1),
                gracePeriodEndDate: addMonths(newGracePeriodDate, i - 1),
                entryType: 'installment',
                originalBudgetId: budgetId,
                installmentNumber: i,
                interestRate: parseFloat(newInterestRate) || 0,
            });
        }
        
        await batch.commit();

        toast({ title: "Sucesso!", description: "A dívida foi reparcelada com sucesso." });
        setIsReparcelamentoModalOpen(false);
        setIsInstallmentsModalOpen(false);

    } catch (error) {
        console.error("Error during re-parceling:", error);
        toast({ title: "Erro", description: "Ocorreu um erro ao tentar reparcelar a dívida.", variant: "destructive"});
    } finally {
        setIsReparcelando(false);
    }
  }


  const handlePayInstallmentEarly = async (installment: FinancialRecord) => {
    if (!selectedCustomer) return;
    try {
        await addDoc(collection(db, 'finance'), {
            clientId: installment.clientId,
            clientName: installment.clientName,
            title: `Adiantamento - ${installment.title}`,
            totalAmount: installment.totalAmount,
            status: 'A Cobrar',
            dueDate: serverTimestamp(),
            entryType: 'manual', 
            originalBudgetId: installment.originalBudgetId,
            advancedInstallmentId: installment.id,
            createdAt: serverTimestamp(),
        });
        toast({ title: 'Adiantamento Gerado!', description: 'A cobrança da parcela foi movida para "A Cobrar" no painel financeiro.' });
        setIsInstallmentsModalOpen(false);
    } catch(e) {
        toast({ title: 'Erro', description: 'Não foi possível gerar a cobrança de adiantamento.', variant: 'destructive' });
    }
  }

  const handleSaveNotes = async () => {
    if (!selectedCustomer) return;
    setIsSavingNotes(true);
    try {
        const customerRef = doc(db, 'users', selectedCustomer.uid);
        await updateDoc(customerRef, { notes: notes });
        toast({ title: "Anotações Salvas" });
    } catch (error) {
        toast({ title: "Erro ao Salvar", variant: "destructive" });
    } finally {
        setIsSavingNotes(false);
    }
  };

  const handleServiceChange = (index: number, field: keyof Service, value: boolean | string) => {
      setServices(prev => {
          const newServices = [...prev];
          (newServices[index] as any)[field] = value;
          return newServices;
      });
  };

  const handleAddNewService = () => {
      if(newServiceName.trim()) {
          setServices(prev => [...prev, { id: `new-${Date.now()}`, name: newServiceName, active: true, link: '' }]);
          setNewServiceName('');
      }
  };
  
  const handleSaveServices = async () => {
    if (!selectedCustomer) return;
    setIsSavingServices(true);
    try {
        const customerRef = doc(db, 'users', selectedCustomer.uid);
        await setDoc(customerRef, { services: services }, { merge: true });
        toast({ title: "Serviços Atualizados", description: `Os serviços de ${selectedCustomer.displayName} foram salvos.`});
    } catch (e) {
        toast({ title: "Erro ao Salvar Serviços", variant: "destructive" });
    } finally {
        setIsSavingServices(false);
    }
  };

  const handleAction = (action: 'cancel' | 'refund', item: FinancialRecord | Budget) => {
      const itemName = 'title' in item ? item.title : 'este produto';
      alert(`Ação: ${action} para o item: ${itemName}`);
  }


  const renderCustomerDetails = () => {
    if (!selectedCustomer) return null;
    const isPJ = !!selectedCustomer.cnpj;
    const fullAddress = [selectedCustomer.address, selectedCustomer.addressNumber, selectedCustomer.neighborhood, selectedCustomer.city, selectedCustomer.uf].filter(Boolean).join(', ').trim();

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5"/> Dados Cadastrais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <p><strong>Nome/Fantasia:</strong> {selectedCustomer.displayName}</p>
              <p><strong>Email:</strong> {selectedCustomer.email}</p>
              {selectedCustomer.phone && <p><strong>Telefone:</strong> {selectedCustomer.phone}</p>}
              {isPJ ? (
                <>
                  <p><strong>CNPJ:</strong> {selectedCustomer.cnpj}</p>
                  {selectedCustomer.razaoSocial && <p><strong>Razão Social:</strong> {selectedCustomer.razaoSocial}</p>}
                  {selectedCustomer.inscricaoEstadual && <p><strong>Inscrição Estadual:</strong> {selectedCustomer.inscricaoEstadual}</p>}
                  {selectedCustomer.inscricaoMunicipal && <p><strong>Inscrição Municipal:</strong> {selectedCustomer.inscricaoMunicipal}</p>}
                </>
              ) : (
                <>
                  <p><strong>CPF:</strong> {selectedCustomer.cpf}</p>
                </>
              )}
              {fullAddress && <p className='md:col-span-2'><strong>Endereço:</strong> {fullAddress}</p>}
            </div>
          </CardContent>
        </Card>
        
        {isPJ && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5"/> Sobre a Empresa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{selectedCustomer.companyDescription || "Nenhuma descrição informada."}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5"/> Responsáveis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedCustomer.responsibles && selectedCustomer.responsibles.length > 0 ? (
                  selectedCustomer.responsibles.map((resp, index) => (
                    <div key={index} className="p-3 border rounded-md text-sm">
                      <p className="font-semibold">{resp.name} <span className="font-normal text-muted-foreground">- {resp.role}</span></p>
                      <p><strong>Email:</strong> {resp.email}</p>
                      <p><strong>Telefone:</strong> {resp.phone}</p>
                      <p><strong>CPF:</strong> {resp.cpf} | <strong>RG:</strong> {resp.rg}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum responsável cadastrado.</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    );
  }

  const renderActiveProducts = () => {
    if (loadingFinancials) return <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>;
    if (activeProducts.length === 0) return <p className="text-sm text-center text-muted-foreground py-8">Nenhum produto ativo encontrado.</p>;
    return (
        <div className="overflow-x-auto">
      <Table><TableHeader><TableRow><TableHead>Produto/Serviço</TableHead><TableHead>Valor Total</TableHead><TableHead>Data de Aprovação</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>
          {activeProducts.map((budget) => (<TableRow key={budget.id}><TableCell>{budget.title}</TableCell><TableCell>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(budget.total)}</TableCell><TableCell>{budget.createdAt?.toDate().toLocaleDateString('pt-BR')}</TableCell><TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => handleViewDetails(budget)}><Eye className="mr-2 h-4 w-4" />Ver Detalhes</Button></TableCell></TableRow>))}
      </TableBody></Table>
      </div>
    );
  }
  
  const renderOverdueRecords = () => {
    if (loadingFinancials) return <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>;
    if (overdueRecords.length === 0) return <p className="text-sm text-center text-muted-foreground py-8">Nenhuma cobrança em atraso.</p>;
    return (
      <div className="overflow-x-auto">
      <Table><TableHeader><TableRow><TableHead>Produto/Serviço</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>
          {overdueRecords.map((record) => (<TableRow key={record.id}><TableCell>{record.title}</TableCell><TableCell>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(record.totalAmount)}</TableCell><TableCell><Badge variant="destructive">{record.status}</Badge></TableCell><TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => handleViewDetails(record)}><Eye className="mr-2 h-4 w-4" />Ver Detalhes</Button></TableCell></TableRow>))}
      </TableBody></Table>
      </div>
    );
  }
  
  const renderNotesTab = () => (
      <Card><CardHeader><CardTitle>Anotações Internas</CardTitle><CardDescription>Este espaço é privado e serve para anotações importantes sobre o cliente, como senhas, preferências ou detalhes de contato.</CardDescription></CardHeader><CardContent className="space-y-4">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Digite suas anotações aqui..." className="min-h-[300px]" />
        <div className="flex justify-end"><Button onClick={handleSaveNotes} disabled={isSavingNotes}>{isSavingNotes ? 'Salvando...' : 'Salvar Anotações'}</Button></div>
      </CardContent></Card>
  );

  const renderServicesTab = () => (
    <Card><CardHeader><CardTitle>Serviços Contratados</CardTitle><CardDescription>Ative serviços, vincule a produtos aprovados e adicione links de acesso.</CardDescription></CardHeader><CardContent className="space-y-4">
       <div className='space-y-4'>
           {services.map((service, index) => (
                <div key={service.id} className="flex flex-col gap-4 p-4 border rounded-lg bg-muted/40">
                    <div className='flex items-center justify-between'>
                       <Label className='font-semibold text-base'>{service.name}</Label>
                       <Switch checked={service.active} onCheckedChange={(checked) => handleServiceChange(index, 'active', checked)} />
                    </div>
                    {service.active && (
                       <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                           <div className='space-y-2'>
                               <Label className="text-xs text-muted-foreground">Link de Acesso (Opcional)</Label>
                               <div className='flex items-center gap-2'><LinkIcon className='w-4 h-4 text-muted-foreground'/><Input value={service.link} onChange={(e) => handleServiceChange(index, 'link', e.target.value)} placeholder="https://link-do-servico.com"/></div>
                           </div>
                            <div className='space-y-2'>
                                <Label className="text-xs text-muted-foreground">Vincular Produto (para o cliente ver parcelas)</Label>
                                <Select
                                    value={service.linkedBudgetId || 'none'}
                                    onValueChange={(value) => handleServiceChange(index, 'linkedBudgetId', value === 'none' ? '' : value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione um produto aprovado..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Nenhum</SelectItem>
                                        {activeProducts.map(product => (
                                            <SelectItem key={product.id} value={product.id}>{product.title}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                           </div>
                       </div>
                    )}
                </div>
            ))}
       </div>
       <div className='mt-6 border-t pt-6'>
            <Label className='font-semibold'>Adicionar Novo Serviço Personalizado</Label>
            <div className="flex items-center gap-2 mt-2">
                <Input value={newServiceName} onChange={e => setNewServiceName(e.target.value)} placeholder="Nome do novo serviço"/>
                <Button onClick={handleAddNewService}><PlusCircle className='mr-2 h-4 w-4'/> Adicionar</Button>
            </div>
       </div>
       <div className="flex justify-end mt-6">
            <Button onClick={handleSaveServices} disabled={isSavingServices}>{isSavingServices ? 'Salvando...' : 'Salvar Serviços'}</Button>
       </div>
    </CardContent></Card>
  );


  return (
    <>
      <main className="flex-1 p-4 sm:p-6">
        <Card>
            <CardHeader>
                <CardTitle>Lista de Clientes</CardTitle>
                <CardDescription>Aqui estão todos os clientes cadastrados no sistema.</CardDescription>
            </CardHeader>
            <CardContent>
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            ) : customers.length > 0 ? (
                <>
                {/* Mobile View - Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:hidden">
                    {customers.map((customer) => (
                        <Card key={customer.uid} className='flex flex-col'>
                            <CardHeader className="flex flex-row items-center gap-4">
                                <Avatar className="w-12 h-12">
                                    <AvatarImage src={customer.photoURL} alt={customer.displayName} />
                                    <AvatarFallback>{customer.displayName?.[0].toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <CardTitle className="text-lg">{customer.displayName}</CardTitle>
                                    <CardDescription>{customer.email}</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className='flex-1'>
                                <Badge variant="outline">{customer.cnpj ? 'P. Jurídica' : 'P. Física'}</Badge>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full" variant="outline" size="sm" onClick={() => handleManageClick(customer)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Gerenciar Cliente
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>

                {/* Desktop View - Table */}
                <div className="hidden md:block">
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome / Razão Social</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {customers.map((customer) => (
                                <TableRow key={customer.uid}>
                                    <TableCell className="font-medium">
                                        <div className='flex items-center gap-3'>
                                            <Avatar className="w-9 h-9">
                                                <AvatarImage src={customer.photoURL} alt={customer.displayName} />
                                                <AvatarFallback>{customer.displayName?.[0].toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            {customer.displayName}
                                        </div>
                                    </TableCell>
                                    <TableCell>{customer.email}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{customer.cnpj ? 'P. Jurídica' : 'P. Física'}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" onClick={() => handleManageClick(customer)}>
                                            <Eye className="mr-2 h-4 w-4" />
                                            Gerenciar
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                </>
            ) : (
                <div className="text-center h-24 flex items-center justify-center">
                    <p className="text-muted-foreground">Nenhum cliente encontrado.</p>
                </div>
            )}
            </CardContent>
        </Card>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}><DialogContent className="max-w-4xl h-[90vh] flex flex-col"><DialogHeader className="flex-none"><DialogTitle>Gerenciar Cliente: {selectedCustomer?.displayName}</DialogTitle><DialogDescription>Visualize e gerencie todas as informações e atividades do cliente.</DialogDescription></DialogHeader>
          <div className="flex-1 overflow-y-auto pr-4 -mr-4"><Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-5"><TabsTrigger value="details"><FileText className="mr-2"/>Dados</TabsTrigger><TabsTrigger value="services"><Globe className="mr-2" />Serviços</TabsTrigger><TabsTrigger value="products"><Package className="mr-2"/>Produtos</TabsTrigger><TabsTrigger value="overdue"><AlertTriangle className="mr-2"/>Atrasos</TabsTrigger><TabsTrigger value="notes"><Notebook className="mr-2"/>Anotações</TabsTrigger></TabsList>
              <TabsContent value="details" className="mt-4">{renderCustomerDetails()}</TabsContent>
              <TabsContent value="services" className="mt-4">{renderServicesTab()}</TabsContent>
              <TabsContent value="products" className="mt-4">{renderActiveProducts()}</TabsContent>
              <TabsContent value="overdue" className="mt-4">{renderOverdueRecords()}</TabsContent>
              <TabsContent value="notes" className="mt-4">{renderNotesTab()}</TabsContent>
          </Tabs></div>
        </DialogContent></Dialog>
        
        {/* Dates Edit Modal */}
        <Dialog open={isEditDatesModalOpen} onOpenChange={setIsEditDatesModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Alterar Vencimentos</DialogTitle>
                    <DialogDescription>
                        Selecione a nova data de vencimento para a primeira parcela em aberto. As datas das parcelas seguintes serão ajustadas automaticamente.
                    </DialogDescription>
                </DialogHeader>
                <div className='py-4'>
                    <Label>Nova data de vencimento</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn("w-full justify-start text-left font-normal", !newDueDate && "text-muted-foreground")}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {newDueDate ? format(newDueDate, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={newDueDate} onSelect={setNewDueDate} initialFocus />
                        </PopoverContent>
                    </Popover>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsEditDatesModalOpen(false)}>Cancelar</Button>
                    <Button onClick={handleUpdateInstallmentDates}>Salvar Novas Datas</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Reparcelamento Modal */}
        <Dialog open={isReparcelamentoModalOpen} onOpenChange={setIsReparcelamentoModalOpen}>
            <DialogContent className='sm:max-w-2xl'>
                <DialogHeader>
                    <DialogTitle>Reparcelar Dívida</DialogTitle>
                    <DialogDescription>
                        Defina as novas condições. O sistema calculará o novo valor e recriará as cobranças.
                    </DialogDescription>
                </DialogHeader>
                <div className='py-4 space-y-4'>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor='new-installments'>Novo número de parcelas</Label>
                            <Input
                                id="new-installments"
                                type="number"
                                min="1"
                                value={newInstallmentCount}
                                onChange={(e) => setNewInstallmentCount(Number(e.target.value))}
                            />
                        </div>
                         <div>
                            <Label htmlFor='new-interest'>Juros por Atraso (% a.m.)</Label>
                            <Input
                                id="new-interest"
                                type="number"
                                min="0"
                                step="0.1"
                                value={newInterestRate}
                                onChange={(e) => setNewInterestRate(e.target.value)}
                            />
                        </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label>Data da Fatura</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !newBillingDate && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {newBillingDate ? format(newBillingDate, "PPP", { locale: ptBR }) : <span>Escolha a data</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={newBillingDate} onSelect={setNewBillingDate} initialFocus /></PopoverContent>
                            </Popover>
                        </div>
                         <div>
                            <Label>Data de Vencimento</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !newInstallmentDueDate && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {newInstallmentDueDate ? format(newInstallmentDueDate, "PPP", { locale: ptBR }) : <span>Escolha a data</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={newInstallmentDueDate} onSelect={setNewInstallmentDueDate} initialFocus /></PopoverContent>
                            </Popover>
                        </div>
                         <div>
                            <Label>Prazo Final (sem juros)</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !newGracePeriodDate && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {newGracePeriodDate ? format(newGracePeriodDate, "PPP", { locale: ptBR }) : <span>Escolha a data</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={newGracePeriodDate} onSelect={setNewGracePeriodDate} initialFocus /></PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsReparcelamentoModalOpen(false)}>Cancelar</Button>
                    <Button onClick={handleReparcelamento} disabled={isReparcelando}>{isReparcelando ? "Processando..." : "Confirmar Reparcelamento"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>


        <Dialog open={isInstallmentsModalOpen} onOpenChange={setIsInstallmentsModalOpen}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>Detalhes do Faturamento</DialogTitle><DialogDescription>Abaixo estão todas as cobranças para o produto: <span className="font-semibold">{activeRecord?.title}</span></DialogDescription></DialogHeader>
            <div className='max-h-[60vh] overflow-y-auto pr-4 -mr-4'>
                <Table><TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead>Vencimento</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>
                    {installments.length > 0 ? installments.map(item => (<TableRow key={item.id}><TableCell>{item.title}</TableCell><TableCell>{item.dueDate?.toDate().toLocaleDateString('pt-BR')}</TableCell><TableCell>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.totalAmount)}</TableCell><TableCell><Badge variant={item.status === 'Recebido' ? 'default' : 'secondary'} className={item.status === 'Recebido' ? 'bg-green-600' : ''}>{item.status}</Badge></TableCell><TableCell className="text-right space-x-2">
                    {(item.status === 'A Receber' || item.status === 'Atrasado') && (<Button size="sm" variant="outline" onClick={() => handlePayInstallmentEarly(item)}>Adiantar Parcela</Button>)}
                    {item.status !== 'Recebido' && (<AlertDialog><AlertDialogTrigger asChild><Button size="sm" variant="outline" className="text-red-500 border-red-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="mr-2 h-4 w-4" />Cancelar</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Cancelamento?</AlertDialogTitle><AlertDialogDescription>Esta ação irá cancelar esta parcela. Deseja continuar?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Voltar</AlertDialogCancel><AlertDialogAction onClick={() => handleAction('cancel', item)}>Sim, cancelar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>)}
                    {item.status === 'Recebido' && (<AlertDialog><AlertDialogTrigger asChild><Button size="sm" variant="outline"><RefreshCcw className="mr-2 h-4 w-4" />Reembolsar</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Reembolso?</AlertDialogTitle><AlertDialogDescription>Esta ação irá iniciar o processo de reembolso para esta parcela. O cliente será notificado. Deseja continuar?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Voltar</AlertDialogCancel><AlertDialogAction onClick={() => handleAction('refund', item)}>Sim, reembolsar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>)}
                    </TableCell></TableRow>)) : (<TableRow><TableCell colSpan={5} className="text-center h-24">Nenhuma cobrança detalhada encontrada.</TableCell></TableRow>)}
                </TableBody></Table>
            </div>
            <DialogFooter className="sm:justify-between mt-4 flex-wrap gap-2">
                <div className="flex gap-2 items-center">
                    <Button variant="secondary" onClick={() => setIsEditDatesModalOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Alterar Vencimentos
                    </Button>
                     <Button variant="secondary" onClick={() => setIsReparcelamentoModalOpen(true)}>
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Reparcelar
                    </Button>
                </div>
                <div className="flex gap-2">
                    {activeRecord && (<>
                        <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="destructive">Cancelar Produto</Button></AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Cancelar Produto Inteiro?</AlertDialogTitle><AlertDialogDescription>Esta ação irá cancelar TODAS as cobranças futuras deste produto. As parcelas já pagas não serão afetadas. Deseja continuar?</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleAction('cancel', activeRecord)}>Sim, cancelar produto</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="outline">Reembolsar Valor Total?</Button></AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Reembolsar Valor Total?</AlertDialogTitle><AlertDialogDescription>Esta ação irá iniciar o processo de reembolso para o valor total das parcelas JÁ PAGAS deste produto. Deseja continuar?</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleAction('refund', activeRecord)}>Sim, reembolsar produto</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </>)}
                </div>
                <Button variant="outline" onClick={() => setIsInstallmentsModalOpen(false)}>Fechar</Button>
            </DialogFooter></DialogContent></Dialog>
      </main>
    </>
  );
}
