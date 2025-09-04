
'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '../../../lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, addDoc, serverTimestamp, getDocs, orderBy } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Skeleton } from '../../../components/ui/skeleton';
import { ExternalLink, CheckCircle, XCircle, MoreVertical, MessageCircle, AlertTriangle, Eye } from 'lucide-react';
import Link from 'next/link';
import { defaultServices } from '@/lib/constants';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Service = {
    id: string;
    name: string;
    active: boolean;
    link?: string;
    linkedBudgetId?: string;
};

type FinancialRecord = {
  id: string;
  title: string;
  totalAmount: number;
  status: 'A Cobrar' | 'A Receber' | 'Cobrança Enviada' | 'Pagamento Enviado' | 'Recebido' | 'Atrasado';
  dueDate?: any;
};

export default function CustomerProductsPage() {
  const [user, authLoading] = useAuthState(auth);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isInstallmentsModalOpen, setIsInstallmentsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [installments, setInstallments] = useState<FinancialRecord[]>([]);

  const [requestType, setRequestType] = useState<'cancellation' | 'refund'>('cancellation');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (authLoading || !user) {
      if (!authLoading) setLoading(false);
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        const userData = docSnap.data();
        const userServices: Service[] = userData?.services || [];

        const allServiceNames = new Set([...defaultServices.map(s => s.name), ...userServices.map(s => s.name)]);

        const combinedServices = Array.from(allServiceNames).map((name, index) => {
            const userService = userServices.find(s => s.name === name);
            return {
                id: userService?.id || `default-${index}`,
                name: name,
                active: userService?.active || false,
                link: userService?.link,
                linkedBudgetId: userService?.linkedBudgetId,
            };
        });

        setServices(combinedServices.filter(s => s.active)); // Only show active services to customers
        setLoading(false);
    }, (error) => {
        console.error("Error fetching user services: ", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading]);

  const handleOpenRequestModal = (service: Service) => {
    setSelectedService(service);
    setIsRequestModalOpen(true);
  };
  
  const handleRequestSubmit = async () => {
    if (!selectedService || !user || !description) {
        toast({ title: 'Erro', description: 'A descrição é obrigatória.', variant: 'destructive'});
        return;
    }
    setIsSubmitting(true);
    try {
        await addDoc(collection(db, 'requests'), {
            userId: user.uid,
            userName: user.displayName,
            productId: selectedService.id,
            productTitle: selectedService.name,
            requestType: requestType,
            description: description,
            status: 'Pendente',
            createdAt: serverTimestamp()
        });
        toast({
            title: 'Solicitação Enviada!',
            description: 'Sua solicitação foi enviada para a equipe da Delvind e será analisada em breve.'
        });
        setIsRequestModalOpen(false);
        setDescription('');
    } catch(e) {
        toast({ title: 'Erro', description: 'Não foi possível enviar sua solicitação.', variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleViewInstallments = async (service: Service) => {
    if (!service.linkedBudgetId) {
        toast({ title: "Informação não disponível", description: "Não há detalhes de faturamento vinculados a este serviço."});
        return;
    }
    setSelectedService(service);
    const installmentsQuery = query(
        collection(db, 'finance'), 
        where('originalBudgetId', '==', service.linkedBudgetId),
        orderBy('installmentNumber', 'asc')
    );
    const querySnapshot = await getDocs(installmentsQuery);
    const installmentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinancialRecord));
    
    if (installmentsData.length === 0) {
        toast({ title: "Nenhuma parcela encontrada" });
    }
    
    setInstallments(installmentsData);
    setIsInstallmentsModalOpen(true);
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatDate = (timestamp: any) => timestamp?.toDate().toLocaleDateString('pt-BR') || 'N/A';

  return (
    <>
      <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitação para: {selectedService?.name}</DialogTitle>
            <DialogDescription>
              Explique o motivo da sua solicitação. Nossa equipe analisará e entrará em contato.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
             <RadioGroup defaultValue="cancellation" value={requestType} onValueChange={(value) => setRequestType(value as 'cancellation' | 'refund')}>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cancellation" id="cancellation" />
                    <Label htmlFor="cancellation">Solicitar Cancelamento</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="refund" id="refund" />
                    <Label htmlFor="refund">Solicitar Reembolso</Label>
                </div>
            </RadioGroup>
            <Textarea 
                placeholder="Descreva em detalhes o motivo da sua solicitação..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsRequestModalOpen(false)}>Voltar</Button>
            <Button onClick={handleRequestSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Enviando...' : 'Enviar Solicitação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
       <Dialog open={isInstallmentsModalOpen} onOpenChange={setIsInstallmentsModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes de Faturamento: {selectedService?.name}</DialogTitle>
            <DialogDescription>Acompanhe o status das suas parcelas.</DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {installments.length > 0 ? (
                  installments.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{item.title}</TableCell>
                      <TableCell>{formatDate(item.dueDate)}</TableCell>
                      <TableCell>{formatCurrency(item.totalAmount)}</TableCell>
                      <TableCell><Badge variant={item.status === 'Recebido' ? 'default' : 'secondary'} className={item.status === 'Recebido' ? 'bg-green-600' : ''}>{item.status}</Badge></TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">Nenhuma parcela encontrada.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)
        ) : services.length > 0 ? (
          services.map((service) => (
            <Card key={service.id} className="flex flex-col transition-all border-primary">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {service.name}
                  <Badge variant="default" className="bg-green-600 text-white">
                     <CheckCircle className="mr-2 h-4 w-4"/>
                     Ativo
                  </Badge>
                </CardTitle>
                <CardDescription>Este serviço está ativo para sua conta.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                {/* Content can be added later if needed */}
              </CardContent>
              <CardFooter className="flex justify-between items-center">
                 {service.link ? (
                  <Button asChild>
                    <Link href={service.link} target="_blank" rel="noopener noreferrer">
                      Acessar Serviço <ExternalLink className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button disabled>
                    Sem link disponível
                  </Button>
                )}
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4"/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {service.linkedBudgetId && (
                            <DropdownMenuItem onSelect={() => handleViewInstallments(service)}>
                                <Eye className="mr-2 h-4 w-4"/> Ver Parcelas
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onSelect={() => handleOpenRequestModal(service)}>
                            <MessageCircle className="mr-2 h-4 w-4"/> Abrir um chamado
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onSelect={() => handleOpenRequestModal(service)}>
                            <AlertTriangle className="mr-2 h-4 w-4"/> Cancelamento/Reembolso
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                 </DropdownMenu>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">Você ainda não possui serviços ativos.</p>
             <Button asChild className="mt-4">
                <Link href="/contact">Solicitar Orçamento</Link>
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
