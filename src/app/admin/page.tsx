
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Activity, Users, DollarSign, PenSquare, FileCheck, FileX, Hourglass, Send, Loader2, HandCoins, AlertTriangle, ListChecks, MessageSquare, UserPlus, UserCheck, UserX, Briefcase, MinusCircle, RefreshCw, FileText } from 'lucide-react';
import { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot, query, where, Timestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, getMonth, getYear, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Budget = {
  id: string;
  status: 'Pendente' | 'Aprovado' | 'Recusado';
  total: number;
  createdAt: any;
};

type FinancialRecord = {
  id: string;
  status: 'A Cobrar' | 'A Receber' | 'Cobrança Enviada' | 'Pagamento Enviado' | 'Recebido' | 'Atrasado';
  totalAmount: number;
  createdAt: any;
};

type Expense = {
    id: string;
    type: 'collaborator' | 'supplier' | 'general' | 'refund';
    amount: number;
    expenseDate: any;
};

type Customer = {
  uid: string;
};

type Task = {
  id: string;
  status: 'Pendente' | 'Em Andamento' | 'Revisão' | 'Finalizada';
  createdAt: any;
};

type Lead = {
    id: string;
    status: 'Novo' | 'Em Contato' | 'Sem Proposta' | 'Com Proposta' | 'Agora é Cliente' | 'Finalizado sem Sucesso';
    createdAt: any;
};

type Stats = {
  budgets: {
    generated: number;
    approved: number;
    approvedValue: number;
    rejected: number;
    rejectedValue: number;
  };
  finance: {
    toBill: number;
    toBillValue: number;
    toReceive: number;
    toReceiveValue: number;
    chargeSent: number;
    chargeSentValue: number;
    paymentSent: number;
    paymentSentValue: number;
    received: number;
    receivedValue: number;
    monthlyRevenue: number;
    overdue: number;
    overdueValue: number;
  };
  expenses: {
      collaborator: number;
      supplier: number;
      general: number;
      refund: number;
  },
  customers: {
    total: number;
    activeProducts: number;
  };
  tasks: {
      pendente: number;
      emAndamento: number;
      revisao: number;
      finalizada: number;
  };
  leads: {
      novo: number;
      emContato: number;
      semProposta: number;
      comProposta: number;
      agoraCliente: number;
      semSucesso: number;
  }
};

const initialStats: Stats = {
    budgets: { generated: 0, approved: 0, approvedValue: 0, rejected: 0, rejectedValue: 0 },
    finance: { toBill: 0, toBillValue: 0, toReceive: 0, toReceiveValue: 0, chargeSent: 0, chargeSentValue: 0, paymentSent: 0, paymentSentValue: 0, received: 0, receivedValue: 0, monthlyRevenue: 0, overdue: 0, overdueValue: 0 },
    expenses: { collaborator: 0, supplier: 0, general: 0, refund: 0 },
    customers: { total: 0, activeProducts: 0 },
    tasks: { pendente: 0, emAndamento: 0, revisao: 0, finalizada: 0 },
    leads: { novo: 0, emContato: 0, semProposta: 0, comProposta: 0, agoraCliente: 0, semSucesso: 0 },
};

function AdminDashboardContent() {
  const [stats, setStats] = useState<Stats>(initialStats);
  const [loading, setLoading] = useState(true);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  useEffect(() => {
    // This effect runs once to populate the month filter
    const allRecordsQuery = query(collection(db, "finance"));
    const unsubscribe = onSnapshot(allRecordsQuery, (snapshot) => {
        const months = new Set<string>();
        snapshot.forEach(doc => {
            const record = doc.data() as FinancialRecord;
            if (record.createdAt && record.createdAt.toDate) {
                const date = record.createdAt.toDate();
                const monthKey = format(date, 'yyyy-MM');
                months.add(monthKey);
            }
        });
        const sortedMonths = Array.from(months).sort((a, b) => b.localeCompare(a));
        setAvailableMonths(sortedMonths);
    });
     return () => unsubscribe();
  }, []);

  useEffect(() => {
    setLoading(true);

    let startDate: Date | null = null;
    let endDate: Date | null = null;
    
    if (selectedMonth !== 'all') {
        const [year, month] = selectedMonth.split('-').map(Number);
        startDate = startOfMonth(new Date(year, month - 1));
        endDate = endOfMonth(new Date(year, month - 1));
    }
    
    const filterByDate = (dateField: any) => {
        if (!startDate || !endDate) return true;
        const date = dateField?.toDate();
        if (!date) return false;
        return date >= startDate && date <= endDate;
    };

    const budgetQuery = query(collection(db, "budgets"));
    const financeQuery = query(collection(db, "finance"));
    const expensesQuery = query(collection(db, "expenses"));
    const customerQuery = query(collection(db, "users"), where("role", "==", "customer"));
    const tasksQuery = query(collection(db, "tasks"));
    const leadsQuery = query(collection(db, "leads"));

    const unsubBudget = onSnapshot(budgetQuery, (snapshot) => {
        let generated = 0, approved = 0, approvedValue = 0, rejected = 0, rejectedValue = 0;
        snapshot.forEach((doc) => {
            const budget = doc.data() as Budget;
            if (!filterByDate(budget.createdAt)) return;

            generated++;
            if (budget.status === 'Aprovado') { approved++; approvedValue += budget.total; }
            if (budget.status === 'Recusado') { rejected++; rejectedValue += budget.total; }
        });
        setStats(prev => ({
            ...prev,
            budgets: { generated, approved, approvedValue, rejected, rejectedValue },
            customers: { ...prev.customers, activeProducts: approved }
        }));
    });

    const unsubFinance = onSnapshot(financeQuery, (snapshot) => {
        let toBill = 0, toBillValue = 0, toReceive = 0, toReceiveValue = 0, chargeSent = 0, chargeSentValue = 0;
        let paymentSent = 0, paymentSentValue = 0, received = 0, receivedValue = 0, monthlyRevenue = 0;
        let overdue = 0, overdueValue = 0;
        
        snapshot.forEach((doc) => {
            const record = doc.data() as FinancialRecord;
            if (!filterByDate(record.createdAt)) return;

            switch(record.status) {
                case 'A Cobrar': toBill++; toBillValue += record.totalAmount; break;
                case 'A Receber': toReceive++; toReceiveValue += record.totalAmount; break;
                case 'Cobrança Enviada': chargeSent++; chargeSentValue += record.totalAmount; break;
                case 'Pagamento Enviado': paymentSent++; paymentSentValue += record.totalAmount; break;
                case 'Atrasado': overdue++; overdueValue += record.totalAmount; break;
                case 'Recebido': 
                    received++; 
                    receivedValue += record.totalAmount;
                    if(filterByDate(record.createdAt)) { // Count towards monthly revenue if it falls in the selected period
                       monthlyRevenue += record.totalAmount;
                    }
                    break;
            }
        });
        setStats(prev => ({ ...prev, finance: { toBill, toBillValue, toReceive, toReceiveValue, chargeSent, chargeSentValue, paymentSent, paymentSentValue, received, receivedValue, monthlyRevenue, overdue, overdueValue }}));
    });

    const unsubExpenses = onSnapshot(expensesQuery, (snapshot) => {
        let collaborator = 0, supplier = 0, general = 0, refund = 0;
        snapshot.forEach(doc => {
            const expense = doc.data() as Expense;
            if (!filterByDate(expense.expenseDate)) return;

            switch (expense.type) {
                case 'collaborator': collaborator += expense.amount; break;
                case 'supplier': supplier += expense.amount; break;
                case 'general': general += expense.amount; break;
                case 'refund': refund += expense.amount; break;
            }
        });
        setStats(prev => ({ ...prev, expenses: { collaborator, supplier, general, refund } }));
    });

    const unsubCustomers = onSnapshot(customerQuery, (snapshot) => {
        setStats(prev => ({ ...prev, customers: { ...prev.customers, total: snapshot.size }}));
    });
    
    const unsubTasks = onSnapshot(tasksQuery, (snapshot) => {
        let pendente = 0, emAndamento = 0, revisao = 0, finalizada = 0;
        snapshot.forEach(doc => {
            const task = doc.data() as Task;
            if (!filterByDate(task.createdAt)) return;
            switch(task.status) {
                case 'Pendente': pendente++; break;
                case 'Em Andamento': emAndamento++; break;
                case 'Revisão': revisao++; break;
                case 'Finalizada': finalizada++; break;
            }
        });
        setStats(prev => ({ ...prev, tasks: { pendente, emAndamento, revisao, finalizada }}));
    });

    const unsubLeads = onSnapshot(leadsQuery, (snapshot) => {
        let novo = 0, emContato = 0, semProposta = 0, comProposta = 0, agoraCliente = 0, semSucesso = 0;
        snapshot.forEach(doc => {
            const lead = doc.data() as Lead;
            if (!filterByDate(lead.createdAt)) return;
             switch(lead.status) {
                case 'Novo': novo++; break;
                case 'Em Contato': emContato++; break;
                case 'Sem Proposta': semProposta++; break;
                case 'Com Proposta': comProposta++; break;
                case 'Agora é Cliente': agoraCliente++; break;
                case 'Finalizado sem Sucesso': semSucesso++; break;
            }
        });
        setStats(prev => ({ ...prev, leads: { novo, emContato, semProposta, comProposta, agoraCliente, semSucesso }}));
        setLoading(false);
    });


    return () => {
        unsubBudget();
        unsubFinance();
        unsubCustomers();
        unsubTasks();
        unsubLeads();
        unsubExpenses();
    }
  }, [selectedMonth]);

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || isNaN(value)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  const StatCard = ({ title, value, description, icon, isLoading }: { title: string, value: string | number, description?: string, icon: React.ReactNode, isLoading: boolean}) => (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-10 w-3/4" />
          ) : (
            <>
              <div className="text-2xl font-bold">{value}</div>
              {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </>
          )}
        </CardContent>
      </Card>
  );
  
  const formattedSelectedMonth = useMemo(() => {
    if (selectedMonth === 'all') return 'Geral';
    const [year, month] = selectedMonth.split('-');
    return format(new Date(Number(year), Number(month) - 1), "MMMM 'de' yyyy", { locale: ptBR });
  }, [selectedMonth]);

  return (
    <main className="flex-1 space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Visão geral do seu negócio em tempo real.</p>
        </div>
        <div className="w-56">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                    <SelectValue placeholder="Filtrar por mês" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Visão Geral</SelectItem>
                    {availableMonths.map(month => (
                        <SelectItem key={month} value={month}>
                            {format(new Date(month + '-02'), "MMMM 'de' yyyy", { locale: ptBR })}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </div>
      
       <h2 className="text-lg font-semibold capitalize">Exibindo dados de: {formattedSelectedMonth}</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Receita do Mês" value={formatCurrency(stats?.finance.monthlyRevenue)} description="Faturamento recebido este mês" icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} isLoading={loading} />
          <StatCard title="Clientes Ativos" value={stats?.customers.total || 0} description={`${stats?.customers.activeProducts || 0} produtos ativos`} icon={<Users className="h-4 w-4 text-muted-foreground" />} isLoading={loading} />
          <StatCard title="Orçamentos Aprovados" value={formatCurrency(stats?.budgets.approvedValue)} description={`${stats?.budgets.approved || 0} orçamentos`} icon={<FileCheck className="h-4 w-4 text-muted-foreground" />} isLoading={loading} />
          <StatCard title="Orçamentos Recusados" value={formatCurrency(stats?.budgets.rejectedValue)} description={`${stats?.budgets.rejected || 0} orçamentos`} icon={<FileX className="h-4 w-4 text-muted-foreground" />} isLoading={loading} />
      </div>

       <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Funil de Leads</CardTitle>
                    <CardDescription>Acompanhe a jornada dos seus potenciais clientes.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                    <StatCard title="Novos" value={stats?.leads.novo || 0} icon={<UserPlus className="h-4 w-4 text-muted-foreground" />} isLoading={loading} />
                    <StatCard title="Em Contato" value={stats?.leads.emContato || 0} icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />} isLoading={loading} />
                    <StatCard title="Com Proposta" value={stats?.leads.comProposta || 0} icon={<Send className="h-4 w-4 text-muted-foreground" />} isLoading={loading} />
                    <StatCard title="Clientes" value={stats?.leads.agoraCliente || 0} icon={<UserCheck className="h-4 w-4 text-muted-foreground" />} isLoading={loading} />
                    <StatCard title="Sem Proposta" value={stats?.leads.semProposta || 0} icon={<UserX className="h-4 w-4 text-muted-foreground" />} isLoading={loading} />
                    <StatCard title="Sem Sucesso" value={stats?.leads.semSucesso || 0} icon={<FileX className="h-4 w-4 text-muted-foreground" />} isLoading={loading} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Funil de Tarefas</CardTitle>
                    <CardDescription>Acompanhe a produtividade da equipe.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard title="Tarefas Pendentes" value={stats?.tasks.pendente || 0} icon={<Hourglass className="h-4 w-4 text-muted-foreground" />} isLoading={loading} />
                    <StatCard title="Em Andamento" value={stats?.tasks.emAndamento || 0} icon={<Loader2 className="h-4 w-4 text-muted-foreground" />} isLoading={loading} />
                    <StatCard title="Em Revisão" value={stats?.tasks.revisao || 0} icon={<ListChecks className="h-4 w-4 text-muted-foreground" />} isLoading={loading} />
                    <StatCard title="Finalizadas" value={stats?.tasks.finalizada || 0} icon={<FileCheck className="h-4 w-4 text-muted-foreground" />} isLoading={loading} />
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Funil Financeiro de Entradas</CardTitle>
                    <CardDescription>Acompanhe o fluxo de cobranças da sua empresa.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <StatCard title="A Cobrar" value={formatCurrency(stats?.finance.toBillValue)} description={`${stats?.finance.toBill || 0} registros`} icon={<Hourglass className="h-4 w-4 text-muted-foreground" />} isLoading={loading} />
                    <StatCard title="A Receber" value={formatCurrency(stats?.finance.toReceiveValue)} description={`${stats?.finance.toReceive || 0} registros`} icon={<Loader2 className="h-4 w-4 text-muted-foreground" />} isLoading={loading} />
                    <StatCard title="Aguardando Pag." value={formatCurrency(stats?.finance.chargeSentValue)} description={`${stats?.finance.chargeSent || 0} cobranças`} icon={<Send className="h-4 w-4 text-muted-foreground" />} isLoading={loading} />
                    <StatCard title="Pag. em Análise" value={formatCurrency(stats?.finance.paymentSentValue)} description={`${stats?.finance.paymentSent || 0} registros`} icon={<HandCoins className="h-4 w-4 text-muted-foreground" />} isLoading={loading} />
                    <StatCard title="Atrasados" value={formatCurrency(stats?.finance.overdueValue)} description={`${stats?.finance.overdue || 0} registros`} icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />} isLoading={loading} />
                    <StatCard title="Total Recebido" value={formatCurrency(stats?.finance.receivedValue)} description={`${stats?.finance.received || 0} pagamentos`} icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} isLoading={loading} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Resumo de Saídas do Mês</CardTitle>
                    <CardDescription>Acompanhe os gastos e despesas da sua empresa.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard title="Pag. Colaboradores" value={formatCurrency(stats?.expenses.collaborator)} icon={<Briefcase className="h-4 w-4 text-muted-foreground" />} isLoading={loading} />
                    <StatCard title="Fornecedores/Serviços" value={formatCurrency(stats?.expenses.supplier)} icon={<FileText className="h-4 w-4 text-muted-foreground" />} isLoading={loading} />
                    <StatCard title="Despesas Gerais" value={formatCurrency(stats?.expenses.general)} icon={<MinusCircle className="h-4 w-4 text-muted-foreground" />} isLoading={loading} />
                    <StatCard title="Reembolsos" value={formatCurrency(stats?.expenses.refund)} icon={<RefreshCw className="h-4 w-4 text-muted-foreground" />} isLoading={loading} />
                </CardContent>
            </Card>
        </div>
    </main>
  );
}

export default function AdminPage() {
    return <AdminDashboardContent />;
}
