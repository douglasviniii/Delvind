
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { PlusCircle, Send, FileText, Eye, Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';
import { useToast } from '../../../hooks/use-toast';
import TiptapEditor from '../../../components/ui/tiptap-editor';
import { useAuth } from '../../../context/auth-context';
import { db } from '../../../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const reportSchema = z.object({
  title: z.string().min(3, { message: 'O título é obrigatório.' }),
  content: z.string().min(10, { message: 'O conteúdo do relatório é muito curto.' }),
});

type Report = {
  id: string;
  title: string;
  content: string;
  authorId?: string;
  authorName?: string;
  createdAt: any;
  sentAt?: any;
  status: 'Rascunho' | 'Enviado';
};

export default function CollaboratorReportsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('my-reports');
  const [reports, setReports] = useState<Report[]>([]);
  const [receivedReports, setReceivedReports] = useState<Report[]>([]);
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [viewingReport, setViewingReport] = useState<Report | null>(null);
  
  const { toast } = useToast();

  const form = useForm<z.infer<typeof reportSchema>>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      title: '',
      content: '',
    },
  });

  useEffect(() => {
    if (!user?.uid) return;

    const myReportsQuery = query(collection(db, 'reports'), where('authorId', '==', user.uid));
    const unsubscribeMy = onSnapshot(myReportsQuery, (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report)));
    });

    const receivedReportsQuery = query(collection(db, 'reports'), where('recipientId', '==', user.uid), where('status', '==', 'Enviado'));
    const unsubscribeReceived = onSnapshot(receivedReportsQuery, (snapshot) => {
        setReceivedReports(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as Report)));
    });

    return () => {
        unsubscribeMy();
        unsubscribeReceived();
    };
  }, [user?.uid]);

  const myReports = reports.filter(r => r.status === 'Rascunho');
  const sentReports = reports.filter(r => r.status === 'Enviado');

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
  };
  
  const handleDownloadPdf = async (report: Report) => {
    // Dynamically import client-side libraries ONLY when needed
    const { jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');

    const input = document.createElement('div');
    // Wrap content in a styled container to ensure consistent output
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

        // Add title to PDF
        pdf.setFontSize(16);
        pdf.text(report.title, pdfWidth / 2, 10, { align: 'center' });
        pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
        pdf.save(`${report.title.replace(/ /g, '_')}.pdf`);
    } catch (err) {
        console.error("Error generating PDF", err);
        toast({ title: 'Erro ao gerar PDF', description: 'Não foi possível baixar o relatório.', variant: 'destructive' });
    } finally {
        // Clean up the temporary element from the DOM
        document.body.removeChild(input);
    }
  };


  async function onSubmit(values: z.infer<typeof reportSchema>) {
    if (!user) return;

    try {
        if (editingReport) {
            const reportRef = doc(db, 'reports', editingReport.id);
            await updateDoc(reportRef, { ...values });
            toast({ title: 'Rascunho Atualizado!', description: 'Suas alterações foram salvas.' });
        } else {
            await addDoc(collection(db, 'reports'), {
                ...values,
                authorId: user.uid,
                authorName: user.displayName || user.email,
                status: 'Rascunho',
                createdAt: serverTimestamp(),
            });
            toast({ title: 'Rascunho Salvo!', description: 'Seu novo relatório foi salvo como rascunho.' });
        }
        setIsCreateDialogOpen(false);
        setEditingReport(null);
    } catch (error) {
        console.error("Error saving report: ", error);
        toast({ title: 'Erro', description: 'Não foi possível salvar o rascunho.', variant: 'destructive' });
    }
  }

  async function handleSendReport(reportId: string) {
    const reportRef = doc(db, 'reports', reportId);
    try {
        await updateDoc(reportRef, {
             status: 'Enviado',
             recipientId: 'admin', // Hardcoded for sending to admin
             recipientName: 'Administração',
             sentAt: serverTimestamp() 
        });
        toast({
            title: 'Relatório Enviado!',
            description: 'Seu relatório foi enviado para a administração.',
        });
    } catch (error) {
        console.error("Error sending report: ", error);
        toast({ title: 'Erro', description: 'Não foi possível enviar o relatório.', variant: 'destructive' });
    }
  }

  return (
    <main className="flex-1">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Seus Relatórios</h1>
          <p className="text-muted-foreground">Crie e envie relatórios para a administração.</p>
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
            <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                    <DialogTitle>{editingReport ? 'Editar Relatório' : 'Novo Relatório'}</DialogTitle>
                    <DialogDescription>
                        {editingReport ? 'Edite os campos abaixo.' : 'Preencha os campos para criar um novo relatório. Ele será salvo como rascunho.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Título do Relatório</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Relatório Semanal de Vendas" {...field} />
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
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit">Salvar Rascunho</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
        
        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="sm:max-w-[800px]">
              <DialogHeader>
                <DialogTitle>{viewingReport?.title}</DialogTitle>
                <DialogDescription>
                  {viewingReport?.status === 'Enviado' && viewingReport?.sentAt
                    ? `Enviado em: ${viewingReport.sentAt.toDate().toLocaleDateString('pt-BR')}`
                    : `Criado em: ${viewingReport?.createdAt ? viewingReport.createdAt.toDate().toLocaleDateString('pt-BR') : '...'}`
                  }
                </DialogDescription>
              </DialogHeader>
              <div className="prose dark:prose-invert max-h-[60vh] overflow-y-auto p-4 border rounded-md" dangerouslySetInnerHTML={{ __html: viewingReport?.content || '' }} />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Fechar</Button>
                {viewingReport && <Button onClick={() => handleDownloadPdf(viewingReport)}>Baixar PDF</Button>}
              </DialogFooter>
            </DialogContent>
        </Dialog>


      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="sm:hidden mb-4">
            <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger>
                    <SelectValue placeholder="Selecione uma aba" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="my-reports">Meus Rascunhos</SelectItem>
                    <SelectItem value="sent-reports">Relatórios Enviados</SelectItem>
                    <SelectItem value="received-reports">Relatórios Recebidos</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <TabsList className="hidden sm:grid w-full grid-cols-3">
          <TabsTrigger value="my-reports">Meus Rascunhos</TabsTrigger>
          <TabsTrigger value="sent-reports">Relatórios Enviados</TabsTrigger>
          <TabsTrigger value="received-reports">Relatórios Recebidos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="my-reports">
          <Card>
            <CardHeader>
              <CardTitle>Rascunhos</CardTitle>
              <CardDescription>Estes relatórios são visíveis apenas para você até serem enviados.</CardDescription>
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
                  {myReports.length > 0 ? (
                    myReports.map(report => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground"/> {report.title}</TableCell>
                        <TableCell>{report.createdAt ? report.createdAt.toDate().toLocaleDateString('pt-BR') : 'Salvando...'}</TableCell>
                        <TableCell><span className='bg-yellow-100 text-yellow-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded dark:bg-yellow-900 dark:text-yellow-300'>{report.status}</span></TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleOpenViewDialog(report)}>Visualizar</Button>
                          <Button variant="outline" size="sm" onClick={() => handleOpenCreateDialog(report)}>Editar</Button>
                           <Button variant="outline" size="sm" onClick={() => handleDownloadPdf(report)}>
                            <Download className="mr-2 h-4 w-4"/>Baixar PDF
                          </Button>
                          <Button size="sm" onClick={() => handleSendReport(report.id)}>
                            <Send className="mr-2 h-4 w-4"/>Enviar para Admin
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-24">
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
              <CardTitle>Histórico de Envios</CardTitle>
              <CardDescription>Estes são os relatórios que você já enviou para a administração.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                 <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Data de Envio</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sentReports.length > 0 ? (
                    sentReports.map(report => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground"/> {report.title}</TableCell>
                        <TableCell>{report.sentAt ? report.sentAt.toDate().toLocaleDateString('pt-BR') : 'Enviando...'}</TableCell>
                        <TableCell><span className="bg-green-100 text-green-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300">{report.status}</span></TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleOpenViewDialog(report)}>Visualizar</Button>
                          <Button variant="outline" size="sm" onClick={() => handleDownloadPdf(report)}>
                            <Download className="mr-2 h-4 w-4"/>Baixar PDF
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        Nenhum relatório enviado ainda.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="received-reports">
          <Card>
            <CardHeader>
              <CardTitle>Relatórios Recebidos</CardTitle>
              <CardDescription>Estes são os relatórios que a administração enviou para você.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                 <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Enviado por</TableHead>
                    <TableHead>Data de Envio</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivedReports.length > 0 ? (
                    receivedReports.map(report => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground"/> {report.title}</TableCell>
                        <TableCell>{report.authorName}</TableCell>
                        <TableCell>{report.sentAt ? report.sentAt.toDate().toLocaleDateString('pt-BR') : '...'}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleOpenViewDialog(report)}><Eye className="mr-2 h-4 w-4" />Visualizar</Button>
                           <Button variant="secondary" size="sm" onClick={() => handleDownloadPdf(report)}>
                            <Download className="mr-2 h-4 w-4"/>Baixar PDF
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        Nenhum relatório recebido.
                      </TableCell>
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
