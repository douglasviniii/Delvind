
'use client';

import { useState, useEffect, useRef } from 'react';
import { db, storage } from '../../../lib/firebase';
import { collection, query, where, onSnapshot, getDocs, orderBy, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { FileSignature, FileText, PlusCircle, Clock, CheckCircle, Hourglass, Upload, Download } from 'lucide-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '../../../components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '../../../components/ui/select';
import { useToast } from '../../../hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Badge } from '../../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { LogoSpinner } from '@/components/ui/logo-spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';

type Contract = {
  id: string;
  clientId: string;
  clientName: string;
  status: 'Pendente' | 'Em Elaboração' | 'Aguardando Assinatura' | 'Assinado';
  createdAt: any;
  title: string;
  contractContent: string;
};

type User = {
  uid: string;
  displayName: string;
  cpf?: string;
  cnpj?: string;
  role: 'customer' | 'collaborator';
};

const manualContractSchema = z.object({
  userId: z.string().min(1, 'Você deve selecionar um usuário.'),
});


export default function ContractsPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const { toast } = useToast();

  const [selectedPdfClient, setSelectedPdfClient] = useState('');
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRequestUploadModalOpen, setIsRequestUploadModalOpen] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<Contract | null>(null);


  const form = useForm<z.infer<typeof manualContractSchema>>({
    resolver: zodResolver(manualContractSchema),
    defaultValues: { userId: '' },
  });

    const handleDownloadPdf = async (contract: Contract) => {
        const content = contract.contractContent;
        if (!content) {
            toast({ title: 'Erro', description: 'Não há conteúdo para gerar o PDF.', variant: 'destructive' });
            return;
        }
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = `<div class="prose dark:prose-invert p-8">${content}</div>`;
        tempDiv.style.width = '210mm'; // A4 width
        document.body.appendChild(tempDiv);


        try {
            const canvas = await html2canvas(tempDiv, { scale: 2, useCORS: true, windowWidth: tempDiv.scrollWidth, windowHeight: tempDiv.scrollHeight });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasHeight / canvasWidth;
            let imgHeight = pdfWidth * ratio;
            let heightLeft = imgHeight;
            let position = 0;
            const tolerance = 5; 

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > tolerance) {
                position -= pdfHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }

            pdf.save(`${contract.title.replace(/ /g, '_')}_assinado.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            toast({ title: 'Erro', description: 'Não foi possível gerar o PDF.', variant: 'destructive' });
        } finally {
            document.body.removeChild(tempDiv);
        }
    };


  useEffect(() => {
    const q = query(collection(db, 'contracts'), orderBy('createdAt', 'desc'));
    const unsubscribeRequests = onSnapshot(q, (querySnapshot) => {
      const contractsData: Contract[] = [];
      querySnapshot.forEach((doc) => {
        contractsData.push({ id: doc.id, ...doc.data() } as Contract);
      });
      setContracts(contractsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching contract requests: ", error);
      setLoading(false);
    });

    const fetchUsers = async () => {
        try {
            const usersQuery = query(collection(db, 'users'), where('role', 'in', ['customer', 'collaborator']));
            const querySnapshot = await getDocs(usersQuery);
            const usersData: User[] = [];
            querySnapshot.forEach((doc) => {
                usersData.push({ uid: doc.id, ...doc.data() } as User);
            });
            setAllUsers(usersData);
        } catch (error) {
            console.error("Failed to fetch users:", error);
            toast({ title: "Erro ao buscar usuários", description: "Verifique as permissões do Firestore.", variant: "destructive"})
        }
    };
    fetchUsers();


    return () => unsubscribeRequests();
  }, [toast]);
  
  const formatDate = (timestamp: any) => {
    if (timestamp && timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString('pt-BR');
    }
    return 'Data inválida';
  }
  
  const handleManualSubmit = async (values: z.infer<typeof manualContractSchema>) => {
    router.push(`/admin/contracts/create?userId=${values.userId}`);
  }

  const handlePdfSubmit = async () => {
    if (!selectedPdfFile || !selectedPdfClient) {
      toast({ title: 'Campos incompletos', description: 'Por favor, selecione um arquivo PDF e um cliente.', variant: 'destructive' });
      return;
    }
    setIsUploading(true);
    try {
        const storageRef = ref(storage, `contracts_pdf/${Date.now()}_${selectedPdfFile.name}`);
        await uploadBytes(storageRef, selectedPdfFile);
        const downloadURL = await getDownloadURL(storageRef);

        const selectedUser = allUsers.find(u => u.uid === selectedPdfClient);
        
        await addDoc(collection(db, 'contracts'), {
            title: `Contrato PDF - ${selectedUser?.displayName || 'Cliente'}`,
            clientId: selectedUser?.uid,
            clientName: selectedUser?.displayName,
            status: 'Em Elaboração',
            createdAt: serverTimestamp(),
            contractContent: downloadURL, // Store URL in content
            isPdf: true, // Flag it as a PDF contract
        });

        toast({ title: "Contrato Criado!", description: "O PDF foi carregado e um rascunho de contrato foi criado."});
        setIsManualModalOpen(false);

    } catch (error) {
        console.error("PDF Upload error:", error);
        toast({ title: "Erro no Upload", description: "Não foi possível carregar o PDF. Verifique as permissões do Firebase Storage.", variant: "destructive"});
    } finally {
        setIsUploading(false);
    }
  };
  
  const handleRequestPdfUpload = async () => {
    if (!selectedPdfFile || !currentRequest) {
      toast({ title: 'Arquivo Faltando', description: 'Por favor, selecione um arquivo PDF.', variant: 'destructive' });
      return;
    }
    setIsUploading(true);
    try {
        const storageRef = ref(storage, `contracts_pdf/${Date.now()}_${selectedPdfFile.name}`);
        await uploadBytes(storageRef, selectedPdfFile);
        const downloadURL = await getDownloadURL(storageRef);
        
        router.push(`/admin/contracts/create?reqId=${currentRequest.id}&pdfMode=true&pdfUrl=${encodeURIComponent(downloadURL)}`);

    } catch (error) {
        console.error("PDF Upload error:", error);
        toast({ title: "Erro no Upload", description: "Não foi possível carregar o PDF. Verifique as permissões do Firebase Storage.", variant: "destructive"});
    } finally {
        setIsUploading(false);
    }
  };

  const getStatusInfo = (status: Contract['status']) => {
    switch (status) {
      case 'Pendente':
        return { text: 'Pendente', icon: <Clock className="mr-2 h-4 w-4" />, variant: 'secondary' as const, className: 'bg-yellow-500 text-white' };
      case 'Em Elaboração':
        return { text: 'Em Elaboração', icon: <FileSignature className="mr-2 h-4 w-4" />, variant: 'secondary' as const, className: 'bg-blue-500 text-white' };
       case 'Aguardando Assinatura':
        return { text: 'Aguardando Assinatura', icon: <Hourglass className="mr-2 h-4 w-4" />, variant: 'secondary' as const, className: 'bg-orange-500 text-white' };
      case 'Assinado':
        return { text: 'Assinado', icon: <CheckCircle className="mr-2 h-4 w-4" />, variant: 'default' as const, className: 'bg-green-600 text-white' };
      default:
        return { text: status, icon: <FileText className="mr-2 h-4 w-4" />, variant: 'outline' as const, className: '' };
    }
  };

  const pendingRequests = contracts.filter(r => r.status === 'Pendente');
  const inProgressContracts = contracts.filter(r => r.status === 'Em Elaboração' || r.status === 'Aguardando Assinatura');
  const signedContracts = contracts.filter(r => r.status === 'Assinado');
  
  const customers = allUsers.filter(u => u.role === 'customer');
  const collaborators = allUsers.filter(u => u.role === 'collaborator');

  const renderContractList = (data: Contract[], emptyMessage: string) => {
      return (
          <Table>
              <TableHeader>
                  <TableRow>
                      <TableHead>Título / Cliente</TableHead>
                      <TableHead>Data de Criação</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
              {loading ? (
                  <TableRow>
                      <TableCell colSpan={4}><Skeleton className="h-20 w-full" /></TableCell>
                  </TableRow>
              ) : data.length > 0 ? (
                  data.map((req) => {
                      const statusInfo = getStatusInfo(req.status);
                      return (
                      <TableRow key={req.id}>
                          <TableCell>
                            <div className='font-medium'>{req.title || 'Contrato Manual'}</div>
                            <div className='text-sm text-muted-foreground'>{req.clientName}</div>
                          </TableCell>
                          <TableCell>{formatDate(req.createdAt)}</TableCell>
                          <TableCell>
                              <Badge variant={statusInfo.variant} className={statusInfo.className}>
                                  {statusInfo.icon}
                                  {statusInfo.text}
                              </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                              <Button asChild variant="outline" size="sm">
                                  <Link href={`/admin/contracts/view/${req.id}`}>
                                      Visualizar
                                  </Link>
                              </Button>
                               {req.status === 'Assinado' && (
                                <Button variant="secondary" size="sm" onClick={() => handleDownloadPdf(req)}>
                                    <Download className='mr-2 h-4 w-4' /> Baixar PDF
                                </Button>
                               )}
                          </TableCell>
                      </TableRow>
                  )})
               ) : (
              <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                      {emptyMessage}
                  </TableCell>
              </TableRow>
            )}
              </TableBody>
          </Table>
      )
  }


  return (
    <>
    <main className="flex-1 p-6">
      <div className="flex items-center justify-end mb-6">
        <Dialog open={isManualModalOpen} onOpenChange={setIsManualModalOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className='mr-2 h-4 w-4' /> Criar Contrato Avulso
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Criar Contrato Avulso</DialogTitle>
                    <DialogDescription>
                        Crie um contrato a partir de um orçamento aprovado ou faça o upload de um PDF.
                    </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="template" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="template">Baseado em Produto</TabsTrigger>
                        <TabsTrigger value="pdf">Usar um PDF</TabsTrigger>
                    </TabsList>
                    <TabsContent value="template">
                        <Form {...form}>
                            <form id="manual-contract-form" onSubmit={form.handleSubmit(handleManualSubmit)} className="space-y-4 py-4">
                                <p className='text-sm text-muted-foreground'>Selecione um cliente ou colaborador para ver os produtos aprovados e gerar um contrato a partir de um modelo.</p>
                                <FormField
                                    control={form.control}
                                    name="userId"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Cliente ou Colaborador</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione um usuário" />
                                            </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectGroup>
                                                    <SelectLabel>Clientes</SelectLabel>
                                                    {customers.map((u) => (
                                                        <SelectItem key={u.uid} value={u.uid}>{u.displayName}</SelectItem>
                                                    ))}
                                                </SelectGroup>
                                                <SelectGroup>
                                                    <SelectLabel>Colaboradores</SelectLabel>
                                                    {collaborators.map((u) => (
                                                        <SelectItem key={u.uid} value={u.uid}>{u.displayName}</SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </form>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setIsManualModalOpen(false)}>Cancelar</Button>
                                <Button type="submit" form="manual-contract-form">Iniciar Criação</Button>
                            </DialogFooter>
                        </Form>
                    </TabsContent>
                    <TabsContent value="pdf">
                         <div className="space-y-4 py-4">
                            <p className='text-sm text-muted-foreground'>Faça o upload de um contrato em PDF para adicionar assinaturas digitais.</p>
                            <div className="space-y-2">
                                <Label htmlFor="pdf-upload">Arquivo PDF do Contrato</Label>
                                <Input 
                                    id="pdf-upload" 
                                    type="file" 
                                    accept=".pdf"
                                    onChange={(e) => setSelectedPdfFile(e.target.files ? e.target.files[0] : null)}
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label>Cliente ou Colaborador Associado</Label>
                                <Select onValueChange={setSelectedPdfClient}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o usuário deste contrato" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectLabel>Clientes</SelectLabel>
                                            {customers.map((u) => (
                                                <SelectItem key={u.uid} value={u.uid}>{u.displayName}</SelectItem>
                                            ))}
                                        </SelectGroup>
                                        <SelectGroup>
                                            <SelectLabel>Colaboradores</SelectLabel>
                                            {collaborators.map((u) => (
                                                <SelectItem key={u.uid} value={u.uid}>{u.displayName}</SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setIsManualModalOpen(false)}>Cancelar</Button>
                            <Button type="button" disabled={!selectedPdfFile || !selectedPdfClient || isUploading} onClick={handlePdfSubmit}> 
                                {isUploading ? <LogoSpinner className='mr-2' /> : <Upload className='mr-2 h-4 w-4'/>}
                                {isUploading ? 'Enviando...' : 'Continuar'}
                            </Button>
                        </DialogFooter>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
      </div>
      
       <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">Requisições Pendentes</TabsTrigger>
          <TabsTrigger value="in_progress">Contratos em Andamento</TabsTrigger>
          <TabsTrigger value="signed">Contratos Finalizados</TabsTrigger>
        </TabsList>
        <TabsContent value="pending">
            <Card>
                <CardHeader>
                    <CardTitle>Requisições Pendentes</CardTitle>
                    <CardDescription>Clientes que aprovaram um orçamento e aguardam a geração do contrato.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <Skeleton className="h-48 w-full" />
                            <Skeleton className="h-48 w-full" />
                        </div>
                    ) : pendingRequests.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {pendingRequests.map((req) => (
                                <Card key={req.id} className="flex flex-col">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <FileText className="h-5 w-5" />
                                            <span>{req.clientName}</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex-1">
                                        <p className="text-sm text-muted-foreground">
                                            Requisição criada em: {formatDate(req.createdAt)}
                                        </p>
                                        <p className="text-sm font-medium mt-1">Produto: {req.title}</p>
                                    </CardContent>
                                    <CardFooter>
                                         <Dialog>
                                            <DialogTrigger asChild>
                                                <Button className="w-full" onClick={() => setCurrentRequest(req)}>
                                                     <FileSignature className="mr-2 h-4 w-4" /> Gerar Contrato
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-md">
                                                <DialogHeader>
                                                <DialogTitle>Como deseja gerar o contrato?</DialogTitle>
                                                <DialogDescription>
                                                    Você pode usar nosso modelo padrão ou carregar um PDF existente para este cliente.
                                                </DialogDescription>
                                                </DialogHeader>
                                                <DialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2">
                                                     <Button asChild>
                                                        <Link href={`/admin/contracts/create?reqId=${req.id}`}>
                                                            Usar Modelo Padrão
                                                        </Link>
                                                    </Button>
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                             <Button variant="outline">
                                                                Carregar PDF
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent>
                                                            <DialogHeader>
                                                                <DialogTitle>Carregar Contrato em PDF</DialogTitle>
                                                                <DialogDescription>
                                                                    Selecione o arquivo PDF para: {currentRequest?.clientName}.
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <div className='py-4'>
                                                                 <Input 
                                                                    id="request-pdf-upload" 
                                                                    type="file" 
                                                                    accept=".pdf"
                                                                    onChange={(e) => setSelectedPdfFile(e.target.files ? e.target.files[0] : null)}
                                                                />
                                                            </div>
                                                            <DialogFooter>
                                                                <Button onClick={handleRequestPdfUpload} disabled={isUploading || !selectedPdfFile}>
                                                                    {isUploading ? <LogoSpinner className='mr-2' /> : <Upload className='mr-2 h-4 w-4'/>}
                                                                    {isUploading ? 'Enviando...' : 'Fazer Upload e Continuar'}
                                                                </Button>
                                                            </DialogFooter>
                                                        </DialogContent>
                                                    </Dialog>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-12">
                            <p>Nenhuma requisição de contrato pendente no momento.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="in_progress">
            <Card>
                 <CardHeader>
                    <CardTitle>Contratos em Andamento</CardTitle>
                    <CardDescription>Contratos que foram gerados e estão aguardando a assinatura de todas as partes.</CardDescription>
                </CardHeader>
                <CardContent>
                    {renderContractList(inProgressContracts, "Nenhum contrato em andamento.")}
                </CardContent>
            </Card>
        </TabsContent>
         <TabsContent value="signed">
            <Card>
                 <CardHeader>
                    <CardTitle>Contratos Finalizados</CardTitle>
                    <CardDescription>Contratos que foram assinados por todas as partes e estão arquivados.</CardDescription>
                </CardHeader>
                <CardContent>
                    {renderContractList(signedContracts, "Nenhum contrato finalizado encontrado.")}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </main>

    {/* Request Upload Modal - Not used anymore but kept for reference if needed */}
    <Dialog open={isRequestUploadModalOpen} onOpenChange={setIsRequestUploadModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Carregar Contrato em PDF</DialogTitle>
                <DialogDescription>
                    Selecione o arquivo PDF para: {currentRequest?.clientName}.
                </DialogDescription>
            </DialogHeader>
            <div className='py-4'>
                    <Input 
                    id="request-pdf-upload" 
                    type="file" 
                    accept=".pdf"
                    onChange={(e) => setSelectedPdfFile(e.target.files ? e.target.files[0] : null)}
                />
            </div>
            <DialogFooter>
                 <Button onClick={handleRequestPdfUpload} disabled={isUploading}>
                    {isUploading ? <LogoSpinner className='mr-2' /> : <Upload className='mr-2 h-4 w-4'/>}
                    {isUploading ? 'Enviando...' : 'Fazer Upload e Continuar'}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );

}
