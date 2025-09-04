
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '../../../components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../../components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "../../../components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { useToast } from '../../../hooks/use-toast';
import { db } from '../../../lib/firebase';
import { PlusCircle, FileText, Notebook } from 'lucide-react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';


const formSchema = z.object({
  name: z.string().min(2, { message: 'O nome é obrigatório.' }),
  email: z.string().email({ message: 'Por favor, insira um e-mail válido.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
});

type Collaborator = {
  uid: string;
  displayName: string;
  email: string;
  role: string;
  cpf?: string;
  rg?: string;
  phone?: string;
  address?: string;
  workCard?: string;
  bio?: string;
  notes?: string;
};

export default function CollaboratorsPage() {
  const { toast } = useToast();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'collaborator'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const collabs: Collaborator[] = [];
      querySnapshot.forEach((doc) => {
        collabs.push({uid: doc.id, ...doc.data()} as Collaborator);
      });
      setCollaborators(collabs);
    });

    return () => unsubscribe();
  }, []);

  const handleManageClick = (collaborator: Collaborator) => {
    setSelectedCollaborator(collaborator);
    setNotes(collaborator.notes || '');
    setIsManageModalOpen(true);
  };
  
  const handleSaveNotes = async () => {
    if (!selectedCollaborator) return;
    setIsSavingNotes(true);
    try {
        const collaboratorRef = doc(db, 'users', selectedCollaborator.uid);
        await updateDoc(collaboratorRef, { notes: notes });
        // Optimistic update of local state
        setCollaborators(prev => prev.map(c => c.uid === selectedCollaborator.uid ? {...c, notes} : c));
        toast({ title: "Anotações Salvas" });
    } catch (error) {
        toast({ title: "Erro ao Salvar", variant: "destructive" });
    } finally {
        setIsSavingNotes(false);
    }
  };


  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/create-collaborator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ocorreu um erro desconhecido.');
      }

      toast({
        title: 'Colaborador Criado!',
        description: `A conta para ${result.name} foi criada com sucesso.`,
      });
      form.reset();
      setIsDialogOpen(false);

    } catch (error: any) {
        let errorMessage = error.message;
        if (error.message.includes('auth/email-already-exists')) {
            errorMessage = 'Este e-mail já está em uso por outra conta.';
        } else if (error.message.includes('app/invalid-credential')) {
            errorMessage = 'Erro de credencial no servidor. Contate o suporte.';
        } else {
            errorMessage = 'Ocorreu um erro desconhecido. Tente novamente.'
        }
        toast({
            title: 'Erro ao Criar Colaborador',
            description: errorMessage,
            variant: 'destructive',
        });
    } finally {
        setIsSubmitting(false);
    }
  }


  return (
    <>
      <main className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
              <div>
                  <h1 className="text-2xl font-bold">Gerenciar Colaboradores</h1>
                  <p className="text-muted-foreground">Adicione, edite ou remova colaboradores.</p>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                      <Button>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Criar Colaborador
                      </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                      <DialogTitle>Novo Colaborador</DialogTitle>
                      <DialogDescription>
                          Preencha os dados para criar uma nova conta de colaborador.
                      </DialogDescription>
                      </DialogHeader>
                      <Form {...form}>
                          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                              <FormField
                              control={form.control}
                              name="name"
                              render={({ field }) => (
                                  <FormItem>
                                  <FormLabel>Nome Completo</FormLabel>
                                  <FormControl>
                                      <Input placeholder="Nome do colaborador" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                  </FormItem>
                              )}
                              />
                              <FormField
                              control={form.control}
                              name="email"
                              render={({ field }) => (
                                  <FormItem>
                                  <FormLabel>E-mail</FormLabel>
                                  <FormControl>
                                      <Input placeholder="email@exemplo.com" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                  </FormItem>
                              )}
                              />
                              <FormField
                              control={form.control}
                              name="password"
                              render={({ field }) => (
                                  <FormItem>
                                  <FormLabel>Senha</FormLabel>
                                  <FormControl>
                                      <Input type="password" placeholder="••••••••" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                  </FormItem>
                              )}
                              />
                              <DialogFooter>
                                  <Button type="submit" disabled={isSubmitting}>
                                      {isSubmitting ? 'Criando...' : 'Criar Conta'}
                                  </Button>
                              </DialogFooter>
                          </form>
                      </Form>
                  </DialogContent>
              </Dialog>
          </div>

        <Card>
          <CardHeader>
              <CardTitle>Lista de Colaboradores</CardTitle>
              <CardDescription>Aqui estão todos os colaboradores cadastrados no sistema.</CardDescription>
          </CardHeader>
          <CardContent>
              <Table>
                  <TableHeader>
                      <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {collaborators.length > 0 ? (
                          collaborators.map((col) => (
                              <TableRow key={col.uid}>
                                  <TableCell className="font-medium">{col.displayName}</TableCell>
                                  <TableCell>{col.email}</TableCell>
                                  <TableCell>{col.role}</TableCell>
                                  <TableCell className="text-right">
                                      <Button variant="outline" size="sm" onClick={() => handleManageClick(col)}>Gerenciar</Button>
                                  </TableCell>
                              </TableRow>
                          ))
                      ) : (
                          <TableRow>
                              <TableCell colSpan={4} className="text-center h-24">
                                  Nenhum colaborador encontrado.
                              </TableCell>
                          </TableRow>
                      )}
                  </TableBody>
              </Table>
          </CardContent>
        </Card>
      </main>

       <Dialog open={isManageModalOpen} onOpenChange={setIsManageModalOpen}>
        <DialogContent className="sm:max-w-xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>Gerenciar Colaborador: {selectedCollaborator?.displayName}</DialogTitle>
            <DialogDescription>
              Visualize e gerencie todas as informações e atividades do colaborador.
            </DialogDescription>
          </DialogHeader>
          {selectedCollaborator && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className='grid w-full grid-cols-2'>
                <TabsTrigger value="details"><FileText className="mr-2"/>Dados</TabsTrigger>
                <TabsTrigger value="notes"><Notebook className="mr-2"/>Anotações</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="mt-4">
                  <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    <p><strong>Nome:</strong> {selectedCollaborator.displayName}</p>
                    <p><strong>Email:</strong> {selectedCollaborator.email}</p>
                    <p><strong>CPF:</strong> {selectedCollaborator.cpf || 'Não informado'}</p>
                    <p><strong>RG:</strong> {selectedCollaborator.rg || 'Não informado'}</p>
                    <p><strong>Telefone:</strong> {selectedCollaborator.phone || 'Não informado'}</p>
                    <p><strong>Endereço:</strong> {selectedCollaborator.address || 'Não informado'}</p>
                    <p><strong>CTPS:</strong> {selectedCollaborator.workCard || 'Não informado'}</p>
                    <div>
                      <strong>Bio:</strong>
                      <p className="text-sm text-muted-foreground">{selectedCollaborator.bio || 'Nenhuma bio informada.'}</p>
                    </div>
                  </div>
              </TabsContent>
               <TabsContent value="notes" className="mt-4">
                 <Card>
                    <CardHeader>
                        <CardTitle>Anotações Internas</CardTitle>
                        <CardDescription>Este espaço é privado para anotações sobre o colaborador.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Digite suas anotações aqui..." className="min-h-[300px]" />
                        <div className="flex justify-end"><Button onClick={handleSaveNotes} disabled={isSavingNotes}>{isSavingNotes ? 'Salvando...' : 'Salvar Anotações'}</Button></div>
                    </CardContent>
                 </Card>
               </TabsContent>
            </Tabs>
          )}
           <DialogFooter>
            <Button variant="outline" onClick={() => setIsManageModalOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
