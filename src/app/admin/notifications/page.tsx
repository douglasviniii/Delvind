
'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { useToast } from '../../../hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Send, History, User, Users, Briefcase, Globe } from 'lucide-react';
import { Skeleton } from '../../../components/ui/skeleton';

const notificationSchema = z.object({
  targetType: z.enum(['all_customers', 'customer', 'all_collaborators', 'collaborator', 'public_banner']),
  targetId: z.string().optional(),
  title: z.string().min(3, 'O título é obrigatório.'),
  message: z.string().min(5, 'A mensagem é obrigatória.'),
  imageUrl: z.string().url('URL da imagem inválida').optional().or(z.literal('')),
});

type UserData = {
  uid: string;
  displayName: string;
};

export default function NotificationsPage() {
  const [customers, setCustomers] = useState<UserData[]>([]);
  const [collaborators, setCollaborators] = useState<UserData[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof notificationSchema>>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      targetType: 'all_customers',
      title: '',
      message: '',
      imageUrl: '',
    },
  });

  const targetType = form.watch('targetType');

  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const customersQuery = query(collection(db, 'users'), where('role', '==', 'customer'));
        const customersSnapshot = await getDocs(customersQuery);
        setCustomers(customersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserData)));

        const collaboratorsQuery = query(collection(db, 'users'), where('role', '==', 'collaborator'));
        const collaboratorsSnapshot = await getDocs(collaboratorsQuery);
        setCollaborators(collaboratorsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserData)));
      } catch (error) {
        console.error("Failed to fetch users:", error);
        toast({ title: "Erro ao buscar usuários", variant: "destructive" });
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, [toast]);

  const onSubmit = async (values: z.infer<typeof notificationSchema>) => {
    setIsSubmitting(true);
    try {
        // Here you would implement the logic to send notifications.
        // This could involve creating a 'notifications' collection in Firestore,
        // and using Firebase Cloud Functions to trigger push notifications or emails.

        console.log("Sending notification:", values);

        toast({
            title: 'Notificação Enviada!',
            description: `A notificação "${values.title}" foi enviada com sucesso.`,
        });
        form.reset();
    } catch (error) {
        console.error("Error sending notification:", error);
        toast({ title: 'Erro ao Enviar', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const getTargetIcon = (target: string) => {
    switch(target) {
        case 'all_customers': return <Users className='mr-2 h-4 w-4'/>;
        case 'customer': return <User className='mr-2 h-4 w-4'/>;
        case 'all_collaborators': return <Briefcase className='mr-2 h-4 w-4'/>;
        case 'collaborator': return <User className='mr-2 h-4 w-4'/>;
        case 'public_banner': return <Globe className='mr-2 h-4 w-4'/>;
        default: return null;
    }
  }

  return (
    <main className="flex-1 p-6">
      <Tabs defaultValue="send" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-lg mx-auto">
          <TabsTrigger value="send"><Send className='mr-2 h-4 w-4'/> Enviar Notificação</TabsTrigger>
          <TabsTrigger value="history"><History className='mr-2 h-4 w-4'/> Histórico</TabsTrigger>
        </TabsList>
        <TabsContent value="send">
          <Card className="max-w-4xl mx-auto mt-6">
            <CardHeader>
              <CardTitle>Criar Nova Notificação</CardTitle>
              <CardDescription>Selecione o público-alvo e componha sua mensagem.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="targetType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Público-Alvo</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o destino da notificação..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="public_banner">{getTargetIcon('public_banner')} Banner Público no Site</SelectItem>
                            <SelectItem value="all_customers">{getTargetIcon('all_customers')}Todos os Clientes</SelectItem>
                            <SelectItem value="customer">{getTargetIcon('customer')}Cliente Específico</SelectItem>
                            <SelectItem value="all_collaborators">{getTargetIcon('all_collaborators')}Todos os Colaboradores</SelectItem>
                            <SelectItem value="collaborator">{getTargetIcon('collaborator')}Colaborador Específico</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {(targetType === 'customer' || targetType === 'collaborator') && (
                    <FormField
                      control={form.control}
                      name="targetId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Selecione o {targetType === 'customer' ? 'Cliente' : 'Colaborador'}</FormLabel>
                           {loadingUsers ? <Skeleton className='h-10 w-full'/> : (
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={`Selecione um ${targetType === 'customer' ? 'cliente' : 'colaborador'}`} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {(targetType === 'customer' ? customers : collaborators).map((user) => (
                                    <SelectItem key={user.uid} value={user.uid}>{user.displayName}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                           )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Título</FormLabel><FormControl><Input placeholder="Ex: Manutenção Programada" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  
                  <FormField control={form.control} name="message" render={({ field }) => (
                    <FormItem><FormLabel>Mensagem</FormLabel><FormControl><Textarea placeholder="Descreva a notificação aqui..." {...field} /></FormControl><FormMessage /></FormItem>
                  )} />

                   <FormField control={form.control} name="imageUrl" render={({ field }) => (
                    <FormItem><FormLabel>URL da Imagem (Opcional)</FormLabel><FormControl><Input placeholder="https://exemplo.com/imagem.png" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Enviando...' : <><Send className="mr-2 h-4 w-4" /> Enviar Notificação</>}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history">
           <Card className="max-w-4xl mx-auto mt-6">
                <CardHeader>
                    <CardTitle>Histórico de Envios</CardTitle>
                    <CardDescription>Visualize todas as notificações já enviadas.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center text-muted-foreground py-10">
                        O histórico de notificações aparecerá aqui.
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
