
'use client';

import { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { CheckCircle, XCircle, MessageSquare, Archive, Search, Receipt, Eye, Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { collection, onSnapshot, query, getDocs, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Skeleton } from '../../../components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

type Request = {
  id: string;
  userId: string;
  userName: string;
  productId: string;
  productTitle: string;
  description: string;
  installment?: {
    id: string;
    title: string;
  };
  requestType: 'refund' | 'cancellation';
  status: 'Pendente' | 'Aprovado' | 'Recusado';
  createdAt: any;
};

type ReceiptData = {
  id: string;
  title: string;
  clientName: string;
  clientId: string;
  totalAmount: number;
  paidAt: any;
};


export default function RequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [filteredReceipts, setFilteredReceipts] = useState<ReceiptData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingReceipts, setLoadingReceipts] = useState(true);
  const [activeTab, setActiveTab] = useState('Pendente');
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'requests'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const requestsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Request));
        setRequests(requestsData);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching requests: ", error);
        setLoading(false);
    });

    setLoadingReceipts(true);
    const receiptsQuery = query(collection(db, 'receipts'), orderBy('paidAt', 'desc'));
    const unsubscribeReceipts = onSnapshot(receiptsQuery, async (snapshot) => {
      const receiptsData = await Promise.all(snapshot.docs.map(async (doc) => {
          const data = doc.data();
          return { id: doc.id, ...data } as ReceiptData;
      }));
      setReceipts(receiptsData);
      setFilteredReceipts(receiptsData);
      setLoadingReceipts(false);
    });

    return () => {
      unsubscribe();
      unsubscribeReceipts();
    };
  }, []);

  useEffect(() => {
    const results = receipts.filter(receipt =>
      receipt.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.clientName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredReceipts(results);
  }, [searchTerm, receipts]);


  const handleViewClick = (request: Request) => {
    setSelectedRequest(request);
    setIsViewModalOpen(true);
  };
  
  const handleAction = async (action: 'approve' | 'deny' | 'support') => {
      if (!selectedRequest) return;
      
      const requestRef = doc(db, 'requests', selectedRequest.id);

      try {
        if (action === 'approve') {
            await updateDoc(requestRef, { status: 'Aprovado' });
            toast({ title: 'Solicitação Aprovada', description: 'O status do pedido foi atualizado.' });
        } else if (action === 'deny') {
            await updateDoc(requestRef, { status: 'Recusado' });
            toast({ title: 'Solicitação Recusada', description: 'O status do pedido foi atualizado.' });
        } else if (action === 'support') {
            // Logic for opening support ticket could go here
            toast({ title: 'Suporte Acionado', description: 'Um ticket de suporte será aberto para este caso.' });
        }
      } catch (error) {
         toast({ title: 'Erro', description: 'Não foi possível atualizar o status do pedido.', variant: 'destructive' });
         console.error("Error updating request: ", error);
      } finally {
         setIsViewModalOpen(false);
      }
  }

  const filteredRequests = requests.filter(req => req.status === activeTab);
  
  const getStatusVariant = (status: Request['status']) => {
    switch (status) {
        case 'Aprovado': return 'default';
        case 'Recusado': return 'destructive';
        case 'Pendente':
        default: return 'secondary';
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  const formatDate = (timestamp: any) => {
    if (timestamp && timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString('pt-BR');
    }
    return 'Data inválida';
  }

  const handleSendReceiptEmail = async (receipt: ReceiptData) => {
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

    toast({ title: "E-mail na fila!", description: `O recibo será enviado em breve para ${clientEmail}.`});
  };


  return (
    <main className="flex-1 space-y-6">
      <Tabs defaultValue="pedidos" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
            <TabsTrigger value="recibos">Recibos</TabsTrigger>
        </TabsList>
        <TabsContent value="pedidos">
             <Card>
                <CardHeader>
                <CardTitle>Fila de Solicitações</CardTitle>
                <CardDescription>Analise e responda aos pedidos enviados pelos seus clientes.</CardDescription>
                </CardHeader>
                <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="mb-4">
                    <TabsTrigger value="Pendente">Pendentes</TabsTrigger>
                    <TabsTrigger value="Aprovado">Aprovados</TabsTrigger>
                    <TabsTrigger value="Recusado">Recusados</TabsTrigger>
                    </TabsList>
                    <TabsContent value={activeTab}>
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Tipo de Pedido</TableHead>
                            <TableHead>Produto/Serviço</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {loading ? (
                            Array.from({length: 3}).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                            </TableRow>
                            ))
                        ) : filteredRequests.length > 0 ? (
                            filteredRequests.map((req) => (
                            <TableRow key={req.id}>
                                <TableCell className="font-medium">{req.userName}</TableCell>
                                <TableCell>{req.requestType === 'refund' ? 'Reembolso' : 'Cancelamento'}</TableCell>
                                <TableCell>
                                    {req.productTitle}
                                    {req.installment && <span className="text-xs text-muted-foreground block">{req.installment.title}</span>}
                                </TableCell>
                                <TableCell>{req.createdAt?.toDate().toLocaleDateString('pt-BR')}</TableCell>
                                <TableCell><Badge variant={getStatusVariant(req.status)}>{req.status}</Badge></TableCell>
                                <TableCell className="text-right">
                                <Button variant="outline" size="sm" onClick={() => handleViewClick(req)}>
                                    Analisar Pedido
                                </Button>
                                </TableCell>
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                Nenhuma solicitação nesta categoria.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                    </TabsContent>
                </Tabs>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="recibos">
            <Card>
                <CardHeader>
                    <CardTitle>Consultar Recibos</CardTitle>
                    <CardDescription>Busque por recibos de pagamento já confirmados.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por ID do recibo ou nome do cliente..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID do Recibo</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {loadingReceipts ? (
                                Array.from({length: 3}).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                                </TableRow>
                                ))
                            ) : filteredReceipts.length > 0 ? (
                                filteredReceipts.map(receipt => (
                                    <TableRow key={receipt.id}>
                                        <TableCell className="font-mono text-xs">{receipt.id.slice(0, 8).toUpperCase()}</TableCell>
                                        <TableCell>{receipt.clientName}</TableCell>
                                        <TableCell>{receipt.title}</TableCell>
                                        <TableCell>{formatCurrency(receipt.totalAmount)}</TableCell>
                                        <TableCell>{formatDate(receipt.paidAt)}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="outline" size="sm" onClick={() => router.push(`/admin/receipts/${receipt.id}`)}>
                                                <Eye className="mr-2 h-4 w-4" /> Visualizar
                                            </Button>
                                             <Button variant="secondary" size="sm" onClick={() => handleSendReceiptEmail(receipt)}>
                                                <Mail className="mr-2 h-4 w-4" /> Enviar por E-mail
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        Nenhum recibo encontrado.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Analisar Pedido de {selectedRequest?.userName}</DialogTitle>
            <DialogDescription>
                <strong>Tipo:</strong> {selectedRequest?.requestType === 'refund' ? 'Reembolso' : 'Cancelamento'} <br/>
                <strong>Produto:</strong> {selectedRequest?.productTitle}
                {selectedRequest?.installment && <span className="block"><strong>Fatura:</strong> {selectedRequest.installment.title}</span>}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <h4 className="font-semibold">Motivo do Cliente:</h4>
            <div className="p-4 bg-muted rounded-md border text-sm max-h-48 overflow-y-auto">
                {selectedRequest?.description}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="destructive" onClick={() => handleAction('deny')}><XCircle className="mr-2" /> Recusar</Button>
            <Button variant="outline" onClick={() => handleAction('support')}><MessageSquare className="mr-2" /> Abrir Suporte</Button>
            <Button className='bg-green-600 hover:bg-green-700' onClick={() => handleAction('approve')}><CheckCircle className="mr-2" /> Aprovar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
