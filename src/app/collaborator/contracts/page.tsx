'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '../../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';
import Link from 'next/link';
import { FileSignature, Eye, Hourglass, CheckCircle } from 'lucide-react';
import { Skeleton } from '../../../components/ui/skeleton';
import { User } from 'firebase/auth';

type Contract = {
  id: string;
  title: string;
  createdAt: any;
  status: 'Pendente' | 'Em Elaboração' | 'Aguardando Assinatura' | 'Assinado';
};

export default function CollaboratorContractsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (authLoading || !user) {
      if (!authLoading) setLoading(false);
      return;
    };

    const q = query(
        collection(db, 'contracts'), 
        where('clientId', '==', user.uid),
        orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const contractsData: Contract[] = [];
      querySnapshot.forEach((doc) => {
        contractsData.push({ id: doc.id, ...doc.data() } as Contract);
      });
      setContracts(contractsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching contracts: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading]);

  const formatDate = (timestamp: any) => {
    if (timestamp && timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString('pt-BR');
    }
    return 'Data inválida';
  }
  
  const getStatusInfo = (status: Contract['status']) => {
    switch (status) {
      case 'Aguardando Assinatura':
        return { text: 'Aguardando Assinatura', icon: <Hourglass className="mr-2 h-4 w-4" />, className: 'bg-orange-500 text-white' };
      case 'Assinado':
        return { text: 'Assinado', icon: <CheckCircle className="mr-2 h-4 w-4" />, className: 'bg-green-600 text-white' };
      default:
        return { text: status, icon: <Hourglass className="mr-2 h-4 w-4" />, className: 'bg-gray-500 text-white' };
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Meus Contratos</h1>
          <p className="text-muted-foreground">Acompanhe o status e assine seus contratos de prestação de serviço.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Contratos</CardTitle>
          <CardDescription>Aqui estão todos os contratos de serviço vinculados a você.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Data de Criação</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : contracts.length > 0 ? (
                contracts.map((contract) => {
                    const statusInfo = getStatusInfo(contract.status);
                    return (
                  <TableRow key={contract.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <FileSignature className="h-4 w-4 text-muted-foreground" />
                      {contract.title}
                    </TableCell>
                    <TableCell>{formatDate(contract.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant={'outline'} className={statusInfo.className}>
                        {statusInfo.icon}
                        {statusInfo.text}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/sign/${contract.id}`}>
                           <Eye className="mr-2 h-4 w-4" /> 
                           {contract.status === 'Aguardando Assinatura' ? 'Visualizar e Assinar' : 'Visualizar'}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )})
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    Nenhum contrato encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
