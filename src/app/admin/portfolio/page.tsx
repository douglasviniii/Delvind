
'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db, storage } from '../../../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { useToast } from '../../../hooks/use-toast';
import { PlusCircle, Edit, Trash2, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../../components/ui/alert-dialog';

const portfolioSchema = z.object({
  title: z.string().min(3, 'O título é obrigatório.'),
  description: z.string().min(10, 'A descrição é muito curta.'),
  link: z.string().url({ message: 'Por favor, insira uma URL válida.' }).optional().or(z.literal('')),
  imageUrl: z.string().url('A URL da imagem é obrigatória.'),
});

type PortfolioItem = {
  id: string;
  title: string;
  description: string;
  link?: string;
  imageUrl: string;
  createdAt: any;
};

export default function PortfolioManagementPage() {
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof portfolioSchema>>({
    resolver: zodResolver(portfolioSchema),
    defaultValues: { title: '', description: '', link: '', imageUrl: '' },
  });

  useEffect(() => {
    const q = query(collection(db, 'portfolio'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PortfolioItem));
      setPortfolioItems(items);
    });
    return () => unsubscribe();
  }, []);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setIsUploading(true);
      try {
        const storageRef = ref(storage, `portfolio_images/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        form.setValue('imageUrl', downloadURL, { shouldValidate: true });
        toast({ title: 'Sucesso', description: 'Imagem carregada com sucesso.' });
      } catch (error) {
        console.error("Upload error:", error);
        toast({ title: 'Erro de Upload', description: 'Não foi possível carregar a imagem.', variant: 'destructive' });
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleEdit = (item: PortfolioItem) => {
    setEditingItem(item);
    form.reset({ ...item });
    setIsDialogOpen(true);
  };
  
  const handleDelete = async (id: string) => {
    try {
        await deleteDoc(doc(db, 'portfolio', id));
        toast({ title: 'Item Excluído', description: 'O item do portfólio foi removido.' });
    } catch(e) {
        console.error("Error deleting document: ", e);
        toast({ title: 'Erro', description: 'Não foi possível excluir o item.', variant: 'destructive' });
    }
  }

  const onSubmit = async (values: z.infer<typeof portfolioSchema>) => {
    try {
      if (editingItem) {
        const itemRef = doc(db, 'portfolio', editingItem.id);
        await updateDoc(itemRef, { ...values, updatedAt: serverTimestamp() });
        toast({ title: 'Sucesso', description: 'Item do portfólio atualizado.' });
      } else {
        await addDoc(collection(db, 'portfolio'), { ...values, createdAt: serverTimestamp() });
        toast({ title: 'Sucesso', description: 'Novo item adicionado ao portfólio.' });
      }
      form.reset();
      setEditingItem(null);
      setIsDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro', description: 'Não foi possível salvar o item.', variant: 'destructive' });
    }
  };
  
  const imageUrl = form.watch('imageUrl');

  return (
    <main className="flex-1 p-6">
      <div className="flex items-center justify-end mb-6">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingItem(null); form.reset(); setIsDialogOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Projeto
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Projeto' : 'Adicionar Novo Projeto'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Título do Projeto</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="link" render={({ field }) => (
                  <FormItem><FormLabel>Link do Projeto (Opcional)</FormLabel><FormControl><Input {...field} placeholder="https://exemplo.com" /></FormControl><FormMessage /></FormItem>
                )} />
                
                <FormField control={form.control} name="imageUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Imagem do Projeto</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-4">
                        <Input {...field} placeholder="Cole uma URL ou carregue um arquivo" />
                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                          {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                          Carregar
                        </Button>
                      </div>
                    </FormControl>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />
                    {imageUrl && <Image src={imageUrl} alt="Preview" width={100} height={75} className="mt-2 rounded-md object-cover" />}
                    <FormMessage />
                  </FormItem>
                )} />
                
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit">Salvar</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Projetos Existentes</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imagem</TableHead><TableHead>Título</TableHead><TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {portfolioItems.map(item => (
                <TableRow key={item.id}>
                  <TableCell><Image src={item.imageUrl} alt={item.title} width={80} height={60} className="rounded-md object-cover" /></TableCell>
                  <TableCell>{item.title}</TableCell>
                  <TableCell className="space-x-2">
                    <Button variant="outline" size="icon" onClick={() => handleEdit(item)}><Edit className="h-4 w-4" /></Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Isso excluirá permanentemente o item do portfólio.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(item.id)} className='bg-destructive hover:bg-destructive/80'>Sim, excluir</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
