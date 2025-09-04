'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '../../../lib/firebase';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Skeleton } from '../../../components/ui/skeleton';
import { Mail, Phone, User, Calendar, Briefcase, Eye, Download, MoreVertical, Check, Copy, UserPlus, BarChart2, Filter, Users as UsersIcon, FileText, Trash2, FileUp, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSubTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


type LeadStatus = 'Novo' | 'Em Contato' | 'Sem Proposta' | 'Com Proposta' | 'Agora é Cliente' | 'Finalizado sem Sucesso';
type CurriculumStatus = 'Recebido' | 'Lido' | 'Descartado' | 'Banco de Talentos' | 'Estagiário';

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  service: string;
  createdAt: any;
  status: LeadStatus;
  onboardingLinkId?: string;
};

type Curriculum = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  position: string;
  resumeUrl: string;
  createdAt: any;
  status: CurriculumStatus;
};

type OnboardingData = {
    id: string;
    leadId: string;
    name: string;
    email: string;
    status: 'Pendente' | 'Preenchido';
    createdAt: any;
    formData?: any;
}

const statusConfig: Record<LeadStatus, { label: string; color: string }> = {
    'Novo': { label: 'Novo', color: 'bg-blue-500' },
    'Em Contato': { label: 'Em Contato', color: 'bg-yellow-500' },
    'Com Proposta': { label: 'Com Proposta', color: 'bg-orange-500' },
    'Sem Proposta': { label: 'Sem Proposta', color: 'bg-gray-500' },
    'Agora é Cliente': { label: 'Cliente', color: 'bg-green-600' },
    'Finalizado sem Sucesso': { label: 'Sem Sucesso', color: 'bg-red-600' },
};

const curriculumStatusConfig: Record<CurriculumStatus, { label: string; color: string }> = {
    'Recebido': { label: 'Recebido', color: 'bg-blue-500' },
    'Lido': { label: 'Lido', color: 'bg-yellow-500' },
    'Banco de Talentos': { label: 'Banco de Talentos', color: 'bg-green-600' },
    'Estagiário': { label: 'Estagiário', color: 'bg-purple-500' },
    'Descartado': { label: 'Descartado', color: 'bg-red-600' },
};


export default function LeadsPage() {
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
  const [onboardingFichas, setOnboardingFichas] = useState<OnboardingData[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [filteredCurriculums, setFilteredCurriculums] = useState<Curriculum[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFields, setExportFields] = useState({ name: true, email: true, phone: true, service: true });
  const [date, setDate] = useState<DateRange | undefined>();
  const [dashboardStatusFilter, setDashboardStatusFilter] = useState<LeadStatus | 'Todos'>('Todos');
  const [curriculumStatusFilter, setCurriculumStatusFilter] = useState<CurriculumStatus | 'Todos'>('Todos');
  const [isClientDataModalOpen, setIsClientDataModalOpen] = useState(false);
  const [selectedClientData, setSelectedClientData] = useState<OnboardingData | null>(null);
  
  const { toast } = useToast();
  const router = useRouter();


  useEffect(() => {
    setLoading(true);
    const qLeads = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
    const unsubscribeLeads = onSnapshot(qLeads, (querySnapshot) => {
        const leadsData: Lead[] = [];
        querySnapshot.forEach((doc) => {
            const lead = { id: doc.id, ...doc.data() } as Lead;
            if (!lead.status) lead.status = 'Novo'; // Fallback for older leads
            leadsData.push(lead);
        });
        setAllLeads(leadsData);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching leads: ", error);
        toast({ title: "Erro ao buscar leads", description: "Não foi possível carregar os leads.", variant: "destructive" });
        setLoading(false);
    });
    
    const qCurriculums = query(collection(db, 'curriculums'), orderBy('createdAt', 'desc'));
    const unsubscribeCurriculums = onSnapshot(qCurriculums, (querySnapshot) => {
        setCurriculums(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Curriculum)));
    });

    const qOnboarding = query(collection(db, 'onboarding'), orderBy('createdAt', 'desc'));
    const unsubscribeOnboarding = onSnapshot(qOnboarding, (querySnapshot) => {
        setOnboardingFichas(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OnboardingData)));
    }, (error) => {
        console.error("Error fetching onboarding data: ", error);
    });

    return () => {
        unsubscribeLeads();
        unsubscribeOnboarding();
        unsubscribeCurriculums();
    };
  }, [toast]);

  useEffect(() => {
    let filtered;
    if (!date || (!date.from && !date.to)) {
      filtered = allLeads;
    } else {
      filtered = allLeads.filter(lead => {
          if (!lead.createdAt?.toDate) return false;
          const leadDate = lead.createdAt.toDate();
          const startDate = date.from ? new Date(date.from.setHours(0, 0, 0, 0)) : null;
          const endDate = date.to ? new Date(date.to.setHours(23, 59, 59, 999)) : startDate;
          
          if (startDate && endDate) return leadDate >= startDate && leadDate <= endDate;
          if (startDate) return leadDate >= startDate && leadDate <= new Date(startDate.setHours(23, 59, 59, 999));
          return true;
      });
    }
    setFilteredLeads(filtered);
  }, [date, allLeads]);

  useEffect(() => {
    if (curriculumStatusFilter === 'Todos') {
        setFilteredCurriculums(curriculums);
    } else {
        setFilteredCurriculums(curriculums.filter(c => c.status === curriculumStatusFilter));
    }
  }, [curriculums, curriculumStatusFilter]);


  const stats = useMemo(() => {
    return allLeads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {} as Record<LeadStatus, number>);
  }, [allLeads]);
  

  const handleCopyLink = (path: string) => {
    const link = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Link Copiado!', description: 'O link foi copiado para a sua área de transferência.' });
  }

  const handleCreateOnboarding = async (lead: Lead) => {
    try {
        const onboardingCollection = collection(db, 'onboarding');
        const newOnboardingDocRef = doc(onboardingCollection); // Create a reference with a new ID
        
        await setDoc(newOnboardingDocRef, {
            leadId: lead.id,
            name: lead.name,
            email: lead.email,
            status: 'Pendente',
            createdAt: serverTimestamp(),
        });
        
        const leadRef = doc(db, 'leads', lead.id);
        await updateDoc(leadRef, { onboardingLinkId: newOnboardingDocRef.id });

        handleCopyLink(`/onboarding/${newOnboardingDocRef.id}`);
    } catch (error) {
        console.error("Error creating onboarding:", error);
        toast({ title: 'Erro', description: 'Não foi possível criar a ficha cadastral.', variant: 'destructive'});
    }
  }


  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    try {
        const leadRef = doc(db, 'leads', leadId);
        await updateDoc(leadRef, { status: newStatus });
        toast({ title: "Status Atualizado!", description: `O lead foi marcado como "${statusConfig[newStatus].label}".` });
    } catch (error) {
        console.error("Error updating status: ", error);
        toast({ title: 'Erro', description: 'Não foi possível atualizar o status.', variant: 'destructive'});
    }
  };

  const handleCurriculumStatusChange = async (curriculumId: string, newStatus: CurriculumStatus) => {
    await updateDoc(doc(db, 'curriculums', curriculumId), { status: newStatus });
    toast({ title: "Status do Currículo Atualizado" });
  };
  
  const handleDeleteLead = async (leadId: string) => {
    try {
      await deleteDoc(doc(db, 'leads', leadId));
      toast({ title: "Lead Excluído", description: "O lead foi removido com sucesso." });
    } catch (error) {
      toast({ title: "Erro ao Excluir", description: "Não foi possível remover o lead.", variant: "destructive" });
    }
  };

  const handleCurriculumDelete = async (curriculumId: string) => {
    await deleteDoc(doc(db, 'curriculums', curriculumId));
    toast({ title: "Currículo Excluído" });
  };

  const handleExport = (exportType: 'remarketing' | 'full') => {
    let dataToExport;
    let headers: string[] = [];
    
    if (exportType === 'remarketing') {
        const statusToFilter = dashboardStatusFilter === 'Todos' ? null : dashboardStatusFilter;
        dataToExport = (statusToFilter ? allLeads.filter(l => l.status === statusToFilter) : allLeads).map(l => ({ email: l.email, phone: l.phone }));
        headers = ['email', 'phone'];
    } else {
        dataToExport = filteredLeads.map(lead => {
            const selectedData: any = {};
            if (exportFields.name) selectedData.name = lead.name;
            if (exportFields.email) selectedData.email = lead.email;
            if (exportFields.phone) selectedData.phone = lead.phone;
            if (exportFields.service) selectedData.service = lead.service;
            return selectedData;
        });
        headers = Object.keys(exportFields).filter(key => exportFields[key as keyof typeof exportFields]);
    }
    
    let content = headers.join(',') + '\n';
    dataToExport.forEach(item => {
        content += headers.map(header => `"${item[header as keyof typeof item]}"`).join(',') + '\n';
    });

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exportType}_leads.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsExportModalOpen(false);
  };
  
  const formatDate = (timestamp: any) => timestamp?.toDate().toLocaleString('pt-BR');
  
  const getOnboardingButtonState = (lead: Lead) => {
    const ficha = onboardingFichas.find(f => f.id === lead.onboardingLinkId);
    if (ficha?.status === 'Preenchido') {
      return { text: 'Ficha Recebida', disabled: true, action: () => {} };
    }
    if (lead.onboardingLinkId) {
      return { text: 'Copiar Link', disabled: false, action: () => handleCopyLink(`/onboarding/${lead.onboardingLinkId}`) };
    }
    return { text: 'Criar Ficha', disabled: false, action: () => handleCreateOnboarding(lead) };
  };

  const StatCard = ({ title, value, color }: { title: string; value: number, color: string }) => (
    <Card className={`border-l-4 ${color}`}>
        <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
  );

  return (
    <>
      <main className="flex-1 space-y-6">
        <Tabs defaultValue="dashboard">
            <TabsList>
                <TabsTrigger value="dashboard"><BarChart2 className="mr-2 h-4 w-4"/>Dashboard CRM</TabsTrigger>
                <TabsTrigger value="leads"><UsersIcon className="mr-2 h-4 w-4"/>Leads</TabsTrigger>
                <TabsTrigger value="onboarding"><FileText className="mr-2 h-4 w-4"/>Fichas Cadastrais</TabsTrigger>
                <TabsTrigger value="curriculums"><FileUp className="mr-2 h-4 w-4" />Currículos</TabsTrigger>
            </TabsList>
            
            <TabsContent value="dashboard" className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {Object.entries(statusConfig).map(([key, { label, color }]) => (
                        <StatCard key={key} title={label} value={stats[key as LeadStatus] || 0} color={color.replace('bg-', 'border-')}/>
                    ))}
                </div>
                 <Card>
                    <CardHeader>
                        <CardTitle>Remarketing</CardTitle>
                        <CardDescription>Filtre e exporte contatos para suas campanhas de remarketing.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center gap-4">
                        <div className="flex-1">
                            <Select value={dashboardStatusFilter} onValueChange={(v) => setDashboardStatusFilter(v as LeadStatus | 'Todos')}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Filtrar por status..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Todos">Todos os Leads</SelectItem>
                                    {Object.entries(statusConfig).map(([key, {label}]) => (
                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={() => handleExport('remarketing')}><Download className="mr-2 h-4 w-4" /> Exportar Contatos</Button>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="leads" className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Todos os Leads</CardTitle>
                        <div className="flex items-center justify-between">
                            <CardDescription>Gerencie todos os leads recebidos.</CardDescription>
                             <div className="flex items-center gap-2">
                                <Button onClick={() => handleCopyLink('/landing/campaign')}><Copy className="mr-2 h-4 w-4" /> Copiar Link para Campanhas</Button>
                                <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Exportar Leads</Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Exportar Leads</DialogTitle>
                                        <DialogDescription>
                                        Selecione os campos que deseja incluir no arquivo CSV. Apenas os leads do período selecionado serão incluídos.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="export-name" checked={exportFields.name} onCheckedChange={(checked) => setExportFields(prev => ({...prev, name: !!checked}))} />
                                            <Label htmlFor="export-name">Nome</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="export-email" checked={exportFields.email} onCheckedChange={(checked) => setExportFields(prev => ({...prev, email: !!checked}))} />
                                            <Label htmlFor="export-email">Email</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="export-phone" checked={exportFields.phone} onCheckedChange={(checked) => setExportFields(prev => ({...prev, phone: !!checked}))} />
                                            <Label htmlFor="export-phone">Telefone</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="export-service" checked={exportFields.service} onCheckedChange={(checked) => setExportFields(prev => ({...prev, service: !!checked}))} />
                                            <Label htmlFor="export-service">Serviço de Interesse</Label>
                                        </div>
                                    </div>
                                    <Button onClick={() => handleExport('full')} className='w-full'>Baixar Arquivo .CSV</Button>
                                    </DialogContent>
                                </Dialog>
                                 <Popover>
                                    <PopoverTrigger asChild>
                                        <Button id="date" variant="outline" className={cn("w-[300px] justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                            <Calendar className="mr-2 h-4 w-4" />
                                            {date?.from ? (date.to ? `${format(date.from, "LLL dd, y")} - ${format(date.to, "LLL dd, y")}`: format(date.from, "LLL dd, y")) : <span>Escolha um intervalo</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="end"><CalendarPicker initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2}/></PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-56 w-full" />)}
                        </div>
                    ) : filteredLeads.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredLeads.map((lead) => {
                            const buttonState = getOnboardingButtonState(lead);
                            return (
                                <Card key={lead.id} className='flex flex-col'>
                                    <CardHeader className='pb-2'>
                                        <CardTitle className="flex items-start justify-between gap-2">
                                        <span className='flex items-center gap-2'><User className="h-5 w-5 text-primary" /> {lead.name}</span>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuSub>
                                                        <DropdownMenuSubTrigger>Alterar Status</DropdownMenuSubTrigger>
                                                        <DropdownMenuSubContent>
                                                            {Object.entries(statusConfig).map(([key, {label}]) => (
                                                                <DropdownMenuItem key={key} onSelect={() => handleStatusChange(lead.id, key as LeadStatus)}>
                                                                    {lead.status === key && <Check className="mr-2 h-4 w-4" />} {label}
                                                                </DropdownMenuItem>
                                                            ))}
                                                        </DropdownMenuSubContent>
                                                    </DropdownMenuSub>
                                                    <DropdownMenuItem onClick={() => { setSelectedLead(lead); setIsModalOpen(true);}}>
                                                        <Eye className="mr-2 h-4 w-4" /> Visualizar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-red-500 hover:bg-red-50 focus:bg-red-100 focus:text-red-600">
                                                        <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                                        </DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                        <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                                                        <AlertDialogDescription>Esta ação excluirá o lead permanentemente. Deseja continuar?</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteLead(lead.id)} className="bg-destructive hover:bg-destructive/90">
                                                            Sim, excluir
                                                        </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                    </AlertDialog>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </CardTitle>
                                        <CardDescription>{formatDate(lead.createdAt)}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-sm flex-1">
                                        <p className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4" />{lead.email}</p>
                                        <p className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" />{lead.phone}</p>
                                        <p className="flex items-center gap-2 font-medium"><Briefcase className="h-4 w-4" />{lead.service}</p>
                                    </CardContent>
                                    <CardFooter className='justify-between'>
                                        <div className='flex items-center gap-2 text-xs font-semibold'><span className={`h-2 w-2 rounded-full ${statusConfig[lead.status]?.color || 'bg-gray-400'}`}></span>{statusConfig[lead.status]?.label || 'Desconhecido'}</div>
                                        <Button size="sm" onClick={() => buttonState.action(lead)} disabled={buttonState.disabled} variant={buttonState.disabled ? "secondary" : "default"}>
                                        <UserPlus className="mr-2 h-4 w-4"/>
                                        {buttonState.text}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            );
                            })}
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-12"><p>Nenhum lead encontrado para o período selecionado.</p></div>
                    )}
                    </CardContent>
                </Card>
            </TabsContent>
            
            <TabsContent value="onboarding">
                 <Card>
                    <CardHeader>
                        <CardTitle>Fichas Cadastrais de Clientes</CardTitle>
                        <CardDescription>Visualize as informações enviadas pelos clientes através dos links de onboarding.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {onboardingFichas.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {onboardingFichas.map(ficha => (
                                <Card key={ficha.id}>
                                    <CardHeader>
                                        <CardTitle>{ficha.name}</CardTitle>
                                        <CardDescription>{ficha.email}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Badge variant={ficha.status === 'Preenchido' ? 'default' : 'secondary'} className={ficha.status === 'Preenchido' ? 'bg-green-600' : ''}>{ficha.status}</Badge>
                                    </CardContent>
                                    <CardFooter>
                                        <Button className="w-full" onClick={() => { setSelectedClientData(ficha); setIsClientDataModalOpen(true); }} disabled={ficha.status === 'Pendente'}>
                                            <Eye className="mr-2 h-4 w-4"/>Visualizar Dados
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                        ) : (
                            <div className="text-center text-muted-foreground py-12"><p>Nenhuma ficha cadastral encontrada.</p></div>
                        )}
                    </CardContent>
                 </Card>
            </TabsContent>

            <TabsContent value="curriculums">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Banco de Currículos</CardTitle>
                            <CardDescription>Gerencie os currículos recebidos através da página "Trabalhe Conosco".</CardDescription>
                        </div>
                        <div className='w-64'>
                            <Select value={curriculumStatusFilter} onValueChange={v => setCurriculumStatusFilter(v as CurriculumStatus | 'Todos')}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Filtrar por status..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Todos">Todos</SelectItem>
                                    {Object.entries(curriculumStatusConfig).map(([key, {label}]) => (
                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent>
                    {loading ? <Skeleton className="h-48 w-full" /> : filteredCurriculums.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredCurriculums.map(cv => (
                                <Card key={cv.id} className="flex flex-col">
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between">
                                            {cv.name}
                                             <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuSub>
                                                        <DropdownMenuSubTrigger>Alterar Status</DropdownMenuSubTrigger>
                                                        <DropdownMenuSubContent>
                                                            {Object.entries(curriculumStatusConfig).map(([key, {label}]) => (
                                                                <DropdownMenuItem key={key} onSelect={() => handleCurriculumStatusChange(cv.id, key as CurriculumStatus)}>
                                                                    {cv.status === key && <Check className="mr-2 h-4 w-4" />} {label}
                                                                </DropdownMenuItem>
                                                            ))}
                                                        </DropdownMenuSubContent>
                                                    </DropdownMenuSub>
                                                    <DropdownMenuSeparator />
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
                                                                <Trash2 className="mr-2 h-4 w-4"/> Excluir
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                                                                <AlertDialogDescription>Esta ação excluirá permanentemente o currículo. Deseja continuar?</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleCurriculumDelete(cv.id)}>Sim, excluir</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </CardTitle>
                                        <CardDescription>{cv.position}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-1 space-y-2 text-sm">
                                        <p className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4" /> {cv.email}</p>
                                        <p className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" /> {cv.phone}</p>
                                        <p className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" /> {cv.address}</p>
                                    </CardContent>
                                    <CardFooter className="justify-between">
                                        <Badge variant="outline" className={cn(curriculumStatusConfig[cv.status]?.color, 'text-white')}>{cv.status}</Badge>
                                        <Button asChild variant="secondary" size="sm">
                                            <Link href={cv.resumeUrl} target="_blank" rel="noopener noreferrer"><Download className="mr-2 h-4 w-4" /> Ver Currículo</Link>
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-12"><p>Nenhum currículo encontrado com este status.</p></div>
                    )}
                    </CardContent>
                </Card>
            </TabsContent>

        </Tabs>
      </main>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{selectedLead?.name}</DialogTitle>
                <DialogDescription>Detalhes completos do lead.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
                <p><strong>Email:</strong> {selectedLead?.email}</p>
                <p><strong>Telefone:</strong> {selectedLead?.phone}</p>
                <p><strong>Serviço de Interesse:</strong> {selectedLead?.service}</p>
                <p><strong>Status:</strong> {selectedLead?.status}</p>
                <p><strong>Data de Criação:</strong> {selectedLead?.createdAt ? formatDate(selectedLead.createdAt) : ''}</p>
            </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isClientDataModalOpen} onOpenChange={setIsClientDataModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Dados Cadastrais de {selectedClientData?.name}</DialogTitle>
          </DialogHeader>
          {selectedClientData?.formData && (
            <div className="py-4 max-h-[70vh] overflow-y-auto space-y-4 pr-2">
                {Object.entries(selectedClientData.formData).map(([key, value]) => (
                    <div key={key}>
                        <p className="text-sm font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}:</p>
                        <p className="text-muted-foreground">{String(value) || 'Não informado'}</p>
                    </div>
                ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );

    
}
