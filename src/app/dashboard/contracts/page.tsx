'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '../../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';
import Link from 'next/link';
import { FileSignature, Eye, Hourglass, CheckCircle, Calendar } from 'lucide-react';
import { Skeleton } from '../../../components/ui/skeleton';
import type { User } from 'firebase/auth';

type Contract = {
  id: string;
  title: string;
  createdAt: any;
  status: 'Pendente' | 'Em Elaboração' | 'Aguardando Assinatura' | 'Assinado';
};

export default function CustomerContractsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
        setUser(currentUser);
        setLoading(!currentUser);
        if (!currentUser) {
            setLoading(false);
        }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    };

    setLoading(true);
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
  }, [user]);

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

  const renderMobileList = () => (
    <div className="md:hidden space-y-4">
        {contracts.map((contract) => {
            const statusInfo = getStatusInfo(contract.status);
            return (
                <Card key={contract.id}>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <FileSignature className="h-4 w-4 text-muted-foreground" />
                            {contract.title}
                        </CardTitle>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                            <Calendar className="h-3 w-3" /><span>{formatDate(contract.createdAt)}</span>
                        </div>
                    </CardHeader>
                    <CardContent>
                       <Badge variant={'outline'} className={statusInfo.className}>
                            {statusInfo.icon}
                            {statusInfo.text}
                        </Badge>
                    </CardContent>
                    <CardFooter>
                         <Button asChild variant="outline" size="sm" className='w-full'>
                            <Link href={`/sign/${contract.id}`}>
                                <Eye className="mr-2 h-4 w-4" /> 
                                {contract.status === 'Aguardando Assinatura' ? 'Visualizar e Assinar' : 'Visualizar'}
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            )
        })}
    </div>
  );

  const renderDesktopTable = () => (
     <Table className="hidden md:table">
        <TableHeader>
            <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Data de Criação</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {contracts.map((contract) => {
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
            }
        </TableBody>
      </Table>
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Meus Contratos</h1>
          <p className="text-muted-foreground">Acompanhe o status e assine seus contratos.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Contratos</CardTitle>
          <CardDescription>Aqui estão todos os contratos vinculados à sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
            </div>
          ) : contracts.length > 0 ? (
            <>
              {renderMobileList()}
              {renderDesktopTable()}
            </>
          ) : (
             <div className="text-center h-24 flex items-center justify-center">
                <p className="text-muted-foreground">Nenhum contrato encontrado.</p>
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
