
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '../../../../lib/firebase';
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../../components/ui/form';
import { Input } from '../../../../components/ui/input';
import { Textarea } from '../../../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { useToast } from '../../../../hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

const manualEntrySchema = z.object({
  clientId: z.string().min(1, 'Você deve selecionar um cliente.'),
  title: z.string().min(3, 'O título/descrição é obrigatório.'),
  totalAmount: z.string().refine(val => !isNaN(parseFloat(val.replace(/\./g, '').replace(',', '.'))), {
    message: "O valor deve ser um número válido."
  }),
  status: z.enum(['A Cobrar', 'A Receber', 'Recebido', 'Atrasado']),
  description: z.string().optional(),
});

type Customer = {
  uid: string;
  displayName: string;
};

const parseCurrency = (value: string | number | undefined): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const numberValue = parseFloat(value.replace(/\./g, '').replace(',', '.'));
      return isNaN(numberValue) ? 0 : numberValue;
    }
    return 0;
};

export default function CreateManualEntryPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof manualEntrySchema>>({
    resolver: zodResolver(manualEntrySchema),
    defaultValues: {
      clientId: '',
      title: '',
      totalAmount: '0,00',
      status: 'A Cobrar',
      description: '',
    },
  });

  useEffect(() => {
    const fetchCustomers = async () => {
      const q = query(collection(db, 'users'), where('role', '==', 'customer'));
      const querySnapshot = await getDocs(q);
      const customerData: Customer[] = [];
      querySnapshot.forEach((doc) => {
        customerData.push({ uid: doc.id, ...doc.data() } as Customer);
      });
      setCustomers(customerData);
    };
    fetchCustomers();
  }, []);

  async function onSubmit(values: z.infer<typeof manualEntrySchema>) {
    setIsSubmitting(true);
    const selectedCustomer = customers.find(c => c.uid === values.clientId);

    if (!selectedCustomer) {
        toast({ title: 'Erro', description: 'Cliente selecionado não encontrado.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
    }

    try {
        await addDoc(collection(db, 'finance'), {
            clientId: values.clientId,
            clientName: selectedCustomer.displayName,
            title: values.title,
            description: values.description,
            totalAmount: parseCurrency(values.totalAmount),
            status: values.status,
            createdAt: serverTimestamp(),
            entryType: 'manual', // To differentiate from budget-generated entries
        });
        toast({
            title: 'Lançamento Criado!',
            description: 'O registro financeiro foi adicionado com sucesso.',
        });
        router.push('/admin/financeiro');
    } catch (error) {
        console.error("Error creating manual entry: ", error);
        toast({ title: 'Erro ao Salvar', description: 'Não foi possível criar o lançamento.', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <main className="flex-1 p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Novo Lançamento Manual</h1>
          <p className="text-muted-foreground">Preencha os detalhes para adicionar um registro financeiro.</p>
        </div>
      </div>
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
            <CardTitle>Detalhes do Lançamento</CardTitle>
        </CardHeader>
        <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <FormField
                        control={form.control}
                        name="clientId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Cliente</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um cliente" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {customers.map((c) => (
                                    <SelectItem key={c.uid} value={c.uid}>{c.displayName}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem><FormLabel>Título / Descrição Curta</FormLabel><FormControl><Input placeholder="Ex: Manutenção de Site - Jan/2024" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />

                    <div className="grid md:grid-cols-2 gap-8">
                        <FormField control={form.control} name="totalAmount" render={({ field: { onChange, ...restField } }) => (
                            <FormItem><FormLabel>Valor Total (R$)</FormLabel><FormControl><Input 
                                {...restField}
                                placeholder="0,00"
                                onChange={(e) => {
                                    const value = e.target.value;
                                    const onlyNumbers = value.replace(/[^0-9]/g, '');
                                    const intValue = parseInt(onlyNumbers, 10) || 0;
                                    const formattedValue = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(intValue / 100);
                                    onChange(formattedValue);
                                }}
                            /></FormControl><FormMessage /></FormItem>
                        )} />

                        <FormField control={form.control} name="status" render={({ field }) => (
                            <FormItem><FormLabel>Status Inicial</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Selecione um status" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="A Cobrar">A Cobrar</SelectItem>
                                    <SelectItem value="A Receber">A Receber</SelectItem>
                                    <SelectItem value="Recebido">Recebido</SelectItem>
                                    <SelectItem value="Atrasado">Atrasado</SelectItem>
                                </SelectContent>
                            </Select><FormMessage /></FormItem>
                        )} />
                    </div>

                    <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem><FormLabel>Observações (Opcional)</FormLabel><FormControl><Textarea placeholder="Adicione detalhes extras sobre este lançamento..." {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancelar</Button>
                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : 'Salvar Lançamento'}</Button>
                    </div>
                </form>
            </Form>
        </CardContent>
      </Card>
    </main>
  );
}
