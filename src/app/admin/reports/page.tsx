
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { PlusCircle, Download, FileText, Eye, Send } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '../../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';
import { useToast } from '../../../hooks/use-toast';
import TiptapEditor from '../../../components/ui/tiptap-editor';
import { useAuth } from '../../../context/auth-context';
import { db, storage } from '../../../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, serverTimestamp, getDocs } from 'firebase/firestore';


const reportSchema = z.object({
  title: z.string().min(3, { message: 'O título é obrigatório.' }),
  content: z.string().min(10, { message: 'O conteúdo do relatório é muito curto.' }),
});

type Report = {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName?: string;
  createdAt: any;
  status: 'Rascunho' | 'Enviado';
  recipientId?: string;
  recipientName?: string;
  recipientType?: 'customer' | 'collaborator';
  sentAt?: any;
};

type User = {
    uid: string;
    displayName: string;
    role: 'customer' | 'collaborator';
};

export default function AdminReportsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('my-reports');
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [sentReports, setSentReports] = useState<Report[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [viewingReport, setViewingReport] = useState<Report | null>(null);
  const [sendingReport, setSendingReport] = useState<Report | null>(null);
  
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');
  const [isSending, setIsSending] = useState(false);

  const { toast } = useToast();

  const form = useForm<z.infer<typeof reportSchema>>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      title: '',
      content: '',
    },
  });

  useEffect(() => {
    if (!user) return;

    const myReportsQuery = query(collection(db, 'reports'), where('authorId', '==', user.uid));
    const unsubscribeMyReports = onSnapshot(myReportsQuery, (snapshot) => {
      const reportsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report));
      setMyReports(reportsData.filter(r => r.status === 'Rascunho'));
      setSentReports(reportsData.filter(r => r.status === 'Enviado'));
    });
    
    const fetchUsers = async () => {
        const usersQuery = query(collection(db, 'users'), where('role', 'in', ['customer', 'collaborator']));
        const usersSnapshot = await getDocs(usersQuery);
        setAllUsers(usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data()} as User)));
    };
    fetchUsers();


    return () => {
      unsubscribeMyReports();
    };
  }, [user]);

  const handleOpenSendDialog = (report: Report) => {
      setSendingReport(report);
      setSelectedRecipient('');
      setIsSendDialogOpen(true);
  }

  const handleOpenCreateDialog = (report: Report | null = null) => {
    setEditingReport(report);
    if (report) {
      form.reset({ title: report.title, content: report.content });
    } else {
      form.reset({ title: '', content: '' });
    }
    setIsCreateDialogOpen(true);
  }

  const handleOpenViewDialog = (report: Report) => {
    setViewingReport(report);
    setIsViewDialogOpen(true);
  }

  const handleDownloadPdf = async (report: Report) => {
    const { jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');

    const input = document.createElement('div');
    input.innerHTML = `<div class="prose dark:prose-invert p-8 bg-background">${report.content}</div>`;
    document.body.appendChild(input);

    try {
      const canvas = await html2canvas(input, { scale: 2, useCORS: true, backgroundColor: null });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 15;
      
      pdf.setFont(form.getValues('title'));
      pdf.text(report.title, pdfWidth/2, 10, { align: 'center'});
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`${report.title.replace(/ /g, '_')}.pdf`);

    } catch (err) {
      console.error("Error generating PDF", err);
      toast({ title: 'Erro ao gerar PDF', description: 'Não foi possível baixar o relatório.', variant: 'destructive' });
    } finally {
      document.body.removeChild(input);
    }
  };
  
 const handleSendReport = async () => {
    if (!sendingReport || !selectedRecipient || !user) {
        toast({ title: "Erro", description: "Selecione um destinatário.", variant: "destructive"});
        return;
    }
    const recipient = allUsers.find(u => u.uid === selectedRecipient);
    if (!recipient) {
         toast({ title: "Erro", description: "Destinatário inválido.", variant: "destructive"});
        return;
    }

    setIsSending(true);
    try {
        const reportRef = doc(db, 'reports', sendingReport.id);
        
        // Update the original report status and add recipient info
        await updateDoc(reportRef, {
            status: 'Enviado',
            sentAt: serverTimestamp(),
            recipientId: recipient.uid,
            recipientName: recipient.displayName,
            recipientType: recipient.role,
        });

        toast({ title: "Relatório Enviado!", description: `Enviado com sucesso para ${recipient.displayName}. O cliente o verá em "Meus Documentos".`});
        setIsSendDialogOpen(false);
        setSendingReport(null);
    } catch(e) {
        console.error(e);
        toast({ title: "Erro", description: "Não foi possível enviar o relatório.", variant: "destructive"});
    } finally {
        setIsSending(false);
    }
  };

  async function onSubmit(values: z.infer<typeof reportSchema>) {
    if (!user) return;

    try {
        if (editingReport) {
            const reportRef = doc(db, 'reports', editingReport.id);
            await updateDoc(reportRef, {
                ...values,
            });
            toast({ title: 'Relatório Atualizado!', description: 'Suas alterações foram salvas.' });
        } else {
            await addDoc(collection(db, 'reports'), {
                ...values,
                authorId: user.uid,
                authorName: user.displayName || user.email,
                status: 'Rascunho',
                createdAt: serverTimestamp(),
            });
            toast({ title: 'Relatório Criado!', description: 'Seu novo relatório foi salvo com sucesso.' });
        }
        setIsCreateDialogOpen(false);
        setEditingReport(null);
    } catch (error) {
        console.error("Error saving report: ", error);
        toast({ title: 'Erro', description: 'Não foi possível salvar o relatório.', variant: 'destructive' });
    }
  }

  return (
    <main className="flex-1 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">Crie e gerencie relatórios internos e de colaboradores.</p>
        </div>
        <Button onClick={() => handleOpenCreateDialog()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Criar Relatório
        </Button>
      </div>
      
      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(isOpen) => {
          if (!isOpen) setEditingReport(null);
          setIsCreateDialogOpen(isOpen);
      }}>
          <DialogContent className="sm:max-w-4xl">
              <DialogHeader>
                  <DialogTitle>{editingReport ? 'Editar Relatório' : 'Novo Relatório'}</DialogTitle>
                  <DialogDescription>
                      {editingReport ? 'Edite os campos abaixo.' : 'Preencha os campos abaixo para criar um novo relatório.'}
                  </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                      <div className="max-h-[70vh] overflow-y-auto space-y-4 pr-6">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Título do Relatório</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Relatório Mensal de Marketing" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="content"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Conteúdo</FormLabel>
                                    <FormControl>
                                        <TiptapEditor
                                            value={field.value}
                                            onChange={field.onChange}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                      </div>
                      <DialogFooter className="pt-4">
                          <Button type="button" variant="ghost" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
                          <Button type="submit">Salvar Relatório</Button>
                      </DialogFooter>
                  </form>
              </Form>
          </DialogContent>
      </Dialog>
      
      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{viewingReport?.title}</DialogTitle>
            <DialogDescription>
                {viewingReport?.status === 'Enviado' ? `Enviado para ${viewingReport.recipientName}` : `Criado por ${viewingReport?.authorName}`} em {viewingReport?.createdAt?.toDate().toLocaleDateString('pt-BR') || '...'}
            </DialogDescription>
          </DialogHeader>
          <div className="prose dark:prose-invert max-h-[70vh] overflow-y-auto rounded-md border p-4" dangerouslySetInnerHTML={{ __html: viewingReport?.content || '' }} />
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Fechar</Button>
            {viewingReport && <Button onClick={() => handleDownloadPdf(viewingReport)}>Baixar PDF</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Send Dialog */}
       <Dialog open={isSendDialogOpen} onOpenChange={(isOpen) => {
          if (!isOpen) setSendingReport(null);
          setIsSendDialogOpen(isOpen);
      }}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Enviar Relatório</DialogTitle>
                <DialogDescription>Selecione um destinatário para o relatório: "{sendingReport?.title}"</DialogDescription>
            </DialogHeader>
             <div className="py-4">
                <Select onValueChange={setSelectedRecipient} value={selectedRecipient}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente ou colaborador..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectLabel>Clientes</SelectLabel>
                            {allUsers.filter(u => u.role === 'customer').map(c => <SelectItem key={c.uid} value={c.uid}>{c.displayName}</SelectItem>)}
                        </SelectGroup>
                        <SelectGroup>
                            <SelectLabel>Colaboradores</SelectLabel>
                             {allUsers.filter(u => u.role === 'collaborator').map(c => <SelectItem key={c.uid} value={c.uid}>{c.displayName}</SelectItem>)}
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsSendDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSendReport} disabled={!selectedRecipient || isSending}>
                    {isSending ? 'Enviando...' : 'Enviar'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>


      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-reports">Meus Relatórios (Rascunhos)</TabsTrigger>
          <TabsTrigger value="sent-reports">Relatórios Enviados</TabsTrigger>
        </TabsList>
        
        <TabsContent value="my-reports">
          <Card>
            <CardHeader>
              <CardTitle>Seus Rascunhos</CardTitle>
              <CardDescription>Estes relatórios são visíveis apenas para você e podem ser editados ou enviados.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Data de Criação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myReports.length > 0 ? (
                    myReports.map(report => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground"/> {report.title}</TableCell>
                        <TableCell>{report.createdAt?.toDate().toLocaleDateString('pt-BR') || '...'}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleOpenCreateDialog(report)}>Editar</Button>
                          <Button size="sm" onClick={() => handleOpenSendDialog(report)}><Send className="mr-2 h-4 w-4"/>Enviar</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center h-24">
                        Nenhum rascunho.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sent-reports">
          <Card>
            <CardHeader>
              <CardTitle>Relatórios Enviados</CardTitle>
              <CardDescription>Visualize os relatórios que você já enviou.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                 <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Enviado para</TableHead>
                    <TableHead>Data de Envio</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sentReports.length > 0 ? (
                    sentReports.map(report => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground"/> {report.title}</TableCell>
                        <TableCell>{report.recipientName || 'N/A'}</TableCell>
                        <TableCell>{report.sentAt?.toDate().toLocaleDateString('pt-BR') || '...'}</TableCell>
                        <TableCell className="text-right space-x-2">
                           <Button variant="outline" size="sm" onClick={() => handleOpenViewDialog(report)}><Eye className="mr-2 h-4 w-4" />Visualizar</Button>
                           <Button variant="secondary" size="sm" onClick={() => handleDownloadPdf(report)}><Download className="mr-2 h-4 w-4"/>Baixar PDF</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">Nenhum relatório enviado.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
