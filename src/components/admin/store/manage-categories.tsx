
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const categorySchema = z.object({
  name: z.string().min(2, 'O nome da categoria é obrigatório.'),
});

type Category = {
  id: string;
  name: string;
};

export function ManageCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    const q = query(collection(db, 'store_categories'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    });
    return () => unsubscribe();
  }, []);

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    form.reset({ name: category.name });
    setIsDialogOpen(true);
  };
  
  const handleDelete = async (id: string) => {
    // TODO: Check if category is in use by any product before deleting
    await deleteDoc(doc(db, 'store_categories', id));
    toast({ title: 'Categoria Excluída' });
  }

  const onSubmit = async (values: z.infer<typeof categorySchema>) => {
    if (editingCategory) {
      await updateDoc(doc(db, 'store_categories', editingCategory.id), values);
      toast({ title: 'Categoria Atualizada' });
    } else {
      await addDoc(collection(db, 'store_categories'), values);
      toast({ title: 'Categoria Criada' });
    }
    form.reset();
    setEditingCategory(null);
    setIsDialogOpen(false);
  };

  return (
    <Card>
      <CardHeader className='flex-row items-center justify-between'>
        <div>
            <CardTitle>Gerenciar Categorias</CardTitle>
            <CardDescription>Crie e organize as categorias da sua loja.</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingCategory(null); form.reset(); setIsDialogOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Nome da Categoria</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit">Salvar</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <ul className='space-y-2'>
            {categories.map(cat => (
                <li key={cat.id} className='flex items-center justify-between p-3 bg-muted rounded-md'>
                    <span className='font-medium'>{cat.name}</span>
                    <div className='space-x-2'>
                        <Button variant="outline" size="icon" className='h-8 w-8' onClick={() => handleEdit(cat)}><Edit className="h-4 w-4" /></Button>
                         <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="destructive" size="icon" className='h-8 w-8'><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(cat.id)} className='bg-destructive hover:bg-destructive/80'>Sim, excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                        </AlertDialog>
                    </div>
                </li>
            ))}
        </ul>
      </CardContent>
    </Card>
  );
}
