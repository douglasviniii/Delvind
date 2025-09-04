
'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '../../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';
import Link from 'next/link';
import { FileText, Eye, Calendar, DollarSign, ChevronsRight } from 'lucide-react';
import { Skeleton } from '../../../components/ui/skeleton';

type Budget = {
  id: string;
  title: string;
  createdAt: any;
  total: number;
  status: 'Pendente' | 'Aprovado' | 'Recusado';
};

export default function CustomerBudgetsPage() {
  const [user, authLoading] = useAuthState(auth);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) {
      if (!authLoading) setLoading(false);
      return;
    };

    const q = query(
        collection(db, 'budgets'), 
        where('clientId', '==', user.uid),
        orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const budgetsData: Budget[] = [];
      querySnapshot.forEach((doc) => {
        budgetsData.push({ id: doc.id, ...doc.data() } as Budget);
      });
      setBudgets(budgetsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching budgets: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading]);

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
  
  const renderMobileList = () => (
    <div className="md:hidden space-y-4">
        {budgets.map((budget) => (
            <Card key={budget.id}>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {budget.title}
                    </CardTitle>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                        <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /><span>{formatDate(budget.createdAt)}</span></div>
                        <div className="flex items-center gap-1.5"><DollarSign className="h-3 w-3" /><span>{formatCurrency(budget.total)}</span></div>
                    </div>
                </CardHeader>
                <CardFooter className="flex justify-between items-center">
                    <Badge variant={getStatusVariant(budget.status)} className={getStatusClass(budget.status)}>
                        {budget.status}
                    </Badge>
                     <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/budgets/${budget.id}`}><Eye className="mr-2 h-4 w-4" /> Visualizar</Link>
                      </Button>
                </CardFooter>
            </Card>
        ))}
    </div>
  );

  const renderDesktopTable = () => (
    <Table className="hidden md:table">
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {budgets.map((budget) => (
              <TableRow key={budget.id}>
                <TableCell className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  {budget.title}
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
                <TableCell className="text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/budgets/${budget.id}`}><Eye className="mr-2 h-4 w-4" /> Visualizar</Link>
                  </Button>
                </TableCell>
              </TableRow>
          ))}
        </TableBody>
      </Table>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Lista de Orçamentos</CardTitle>
          <CardDescription>Aqui estão todos os orçamentos que a Delvind preparou para você.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
            </div>
          ) : budgets.length > 0 ? (
            <>
                {renderMobileList()}
                {renderDesktopTable()}
            </>
          ) : (
            <div className="text-center h-24 flex items-center justify-center">
                <p className="text-muted-foreground">Nenhum orçamento encontrado.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
