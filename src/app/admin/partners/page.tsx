
'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db, storage } from '../../../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../../components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { useToast } from '../../../hooks/use-toast';
import { PlusCircle, Edit, Trash2, Upload, Loader2, Link as LinkIcon } from 'lucide-react';
import Image from 'next/image';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../../components/ui/alert-dialog';


const partnerSchema = z.object({
  name: z.string().min(2, 'O nome do parceiro é obrigatório.'),
  logoUrl: z.string().url('A URL do logo é obrigatória.'),
  description: z.string().min(10, 'A descrição é obrigatória.').max(150, 'A descrição deve ter no máximo 150 caracteres.'),
  link: z.string().url('O link deve ser uma URL válida.').optional().or(z.literal('')),
});

type Partner = {
  id: string;
  name: string;
  logoUrl: string;
  description: string;
  link?: string;
  createdAt: any;
};

export default function PartnersManagementPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof partnerSchema>>({
    resolver: zodResolver(partnerSchema),
    defaultValues: { name: '', logoUrl: '', description: '', link: '' },
  });

  useEffect(() => {
    const q = query(collection(db, 'partners'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Partner));
      setPartners(items);
    });
    return () => unsubscribe();
  }, []);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setIsUploading(true);
      try {
        const storageRef = ref(storage, `partner_logos/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        form.setValue('logoUrl', downloadURL, { shouldValidate: true });
        toast({ title: 'Sucesso', description: 'Logo carregado com sucesso.' });
      } catch (error) {
        console.error("Upload error:", error);
        toast({ title: 'Erro de Upload', description: 'Não foi possível carregar o logo.', variant: 'destructive' });
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleEdit = (partner: Partner) => {
    setEditingPartner(partner);
    form.reset({ ...partner });
    setIsDialogOpen(true);
  };
  
  const handleDelete = async (id: string) => {
    try {
        await deleteDoc(doc(db, 'partners', id));
        toast({ title: 'Parceiro Excluído', description: 'O parceiro foi removido.' });
    } catch(e) {
        console.error("Error deleting document: ", e);
        toast({ title: 'Erro', description: 'Não foi possível excluir o parceiro.', variant: 'destructive' });
    }
  }

  const onSubmit = async (values: z.infer<typeof partnerSchema>) => {
    try {
      const dataToSave = {
        name: values.name,
        logoUrl: values.logoUrl,
        description: values.description,
        link: values.link || '',
      };

      if (editingPartner) {
        const partnerRef = doc(db, 'partners', editingPartner.id);
        await updateDoc(partnerRef, { ...dataToSave, updatedAt: serverTimestamp() });
        toast({ title: 'Sucesso', description: 'Parceiro atualizado.' });
      } else {
        await addDoc(collection(db, 'partners'), { ...dataToSave, createdAt: serverTimestamp() });
        toast({ title: 'Sucesso', description: 'Novo parceiro adicionado.' });
      }
      form.reset();
      setEditingPartner(null);
      setIsDialogOpen(false);
    } catch (error) {
      console.log(error);
      toast({ title: 'Erro', description: 'Não foi possível salvar o parceiro.', variant: 'destructive' });
    }
  };
  
  const logoUrl = form.watch('logoUrl');

  return (
    <main className="flex-1 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Gerenciar Parceiros</h1>
          <p className="text-muted-foreground">Adicione e gerencie os parceiros e suas logos.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
          if (!isOpen) {
            setEditingPartner(null);
            form.reset();
          }
          setIsDialogOpen(isOpen);
        }}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Parceiro
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingPartner ? 'Editar Parceiro' : 'Adicionar Novo Parceiro'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Nome do Parceiro</FormLabel><FormControl><Input {...field} placeholder="Nome da empresa parceira" /></FormControl><FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Descrição Curta</FormLabel><FormControl><Textarea {...field} placeholder="Uma breve descrição sobre a parceria." /></FormControl><FormMessage /></FormItem>
                )} />

                 <FormField control={form.control} name="link" render={({ field }) => (
                  <FormItem><FormLabel>Link (Opcional)</FormLabel><FormControl><Input {...field} placeholder="https://parceiro.com" /></FormControl><FormMessage /></FormItem>
                )} />
                
                <FormField control={form.control} name="logoUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo do Parceiro</FormLabel>
                     {logoUrl && <div className='my-2'><Image src={logoUrl} alt="Preview" width={100} height={100} className="rounded-md object-contain h-24 w-auto bg-muted p-2" /></div>}
                    <FormControl>
                      <div className="flex items-center gap-4">
                        <Input {...field} placeholder="Cole a URL do logo ou carregue"/>
                        <Button type="button" variant="outline" className='shrink-0' onClick={() => fileInputRef.current?.click()}>
                          {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                          Carregar
                        </Button>
                      </div>
                    </FormControl>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />
                    <FormMessage />
                  </FormItem>
                )} />
                
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={isUploading}>{isUploading ? 'Aguarde...' : 'Salvar'}</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Parceiros Cadastrados</CardTitle></CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {partners.map(partner => (
                <Card key={partner.id} className="relative group overflow-hidden">
                    <CardHeader className="items-center text-center">
                        <div className="relative h-20 w-full mb-2">
                          <Image src={partner.logoUrl} alt={partner.name} layout='fill' objectFit='contain' />
                        </div>
                        <CardTitle className='text-lg'>{partner.name}</CardTitle>
                    </CardHeader>
                    <CardContent className='text-center text-sm text-muted-foreground'>
                        <p>{partner.description}</p>
                    </CardContent>
                    <CardFooter className='justify-center'>
                         <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity space-x-1">
                            <Button variant="outline" size="icon" className='h-7 w-7' onClick={() => handleEdit(partner)}><Edit className="h-4 w-4" /></Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="icon" className='h-7 w-7'><Trash2 className="h-4 w-4" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta ação não pode ser desfeita. Isso excluirá permanentemente o parceiro.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(partner.id)} className='bg-destructive hover:bg-destructive/80'>Sim, excluir</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                        {partner.link && (
                            <a href={partner.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm font-semibold flex items-center">
                                Visitar <LinkIcon className="ml-1 h-3 w-3"/>
                            </a>
                        )}
                    </CardFooter>
                </Card>
              ))}
            </div>
             {partners.length === 0 && (
                <div className='text-center text-muted-foreground py-10'>Nenhum parceiro cadastrado.</div>
            )}
        </CardContent>
      </Card>
    </main>
  );
}
