
'use client';

import { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';
import Link from 'next/link';
import { PlusCircle, FileText, Eye, Send } from 'lucide-react';
import { Skeleton } from '../../../components/ui/skeleton';
import { useToast } from '../../../hooks/use-toast';
import { useAuth } from '../../../context/auth-context';

type Budget = {
  id: string;
  clientName: string;
  createdAt: any;
  total: number;
  status: 'Pendente' | 'Aprovado' | 'Recusado';
};

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchBudgets = async () => {
      setLoading(true);
      try {
        const budgetsQuery = query(collection(db, 'budgets'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(budgetsQuery);
        const budgetsData: Budget[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Budget));
        setBudgets(budgetsData);
      } catch (error) {
        console.error("Error fetching budgets: ", error);
        toast({ 
            title: "Erro de Permissão", 
            description: "Não foi possível carregar os orçamentos. Verifique as regras do Firestore.", 
            variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchBudgets();
  }, [toast]);
  
  const handleSendToClient = (budgetId: string, clientName: string) => {
    // This is now handled by the financial flow.
    // The button could be repurposed for sending reminders in the future.
    toast({
        title: 'Notificação',
        description: `O cliente será notificado sobre o orçamento. (Funcionalidade de e-mail a ser implementada).`,
    });
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
  
  const getStatusVariant = (status: Budget['status']) => {
    switch (status) {
        case 'Aprovado':
            return 'default';
        case 'Recusado':
            return 'destructive';
        case 'Pendente':
        default:
            return 'secondary';
    }
  }

  const getStatusClass = (status: Budget['status']) => {
    switch(status) {
        case 'Aprovado':
            return 'bg-green-600 text-white';
        case 'Recusado':
            return 'bg-red-600 text-white';
        case 'Pendente':
            return 'bg-yellow-500 text-white';
        default:
            return '';
    }
  }

  return (
    <main className="flex-1">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Gerenciar Orçamentos</h1>
          <p className="text-muted-foreground">Crie, visualize e gerencie os orçamentos dos clientes.</p>
        </div>
        <Button asChild>
          <Link href="/admin/budgets/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            Criar Orçamento
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Orçamentos</CardTitle>
          <CardDescription>Aqui estão todos os orçamentos gerados no sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : budgets.length > 0 ? (
                budgets.map((budget) => (
                  <TableRow key={budget.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {budget.clientName}
                    </TableCell>
                    <TableCell>{formatDate(budget.createdAt)}</TableCell>
                    <TableCell>{formatCurrency(budget.total)}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={getStatusVariant(budget.status)}
                        className={getStatusClass(budget.status)}
                      >
                        {budget.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                       {budget.status === 'Pendente' && (
                         <Button variant="outline" size="sm" onClick={() => handleSendToClient(budget.id, budget.clientName)}>
                            <Send className="mr-2 h-4 w-4" /> Enviar Lembrete
                         </Button>
                       )}
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/budgets/${budget.id}`}><Eye className="mr-2 h-4 w-4" /> Visualizar</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    Nenhum orçamento encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
