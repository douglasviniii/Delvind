
'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Trash2, Upload, Loader2, GripVertical } from 'lucide-react';
import Image from 'next/image';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import TiptapEditor from '@/components/ui/tiptap-editor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

const productSchema = z.object({
  name: z.string().min(3, 'O nome é obrigatório.'),
  description: z.string().min(10, 'A descrição é muito curta.'),
  price: z.string().refine(val => !isNaN(parseCurrency(val)), { message: "O preço deve ser um número válido." }),
  promoPrice: z.string().optional(),
  promoPrice2: z.string().optional(),
  label: z.string().optional(),
  categoryId: z.string({ required_error: "A categoria é obrigatória." }),
  stock: z.coerce.number().optional(),
  hasStock: z.boolean().default(false),
  requiresShipping: z.boolean().default(false),
  freeShipping: z.boolean().default(false),
  imageUrls: z.array(z.string().url()).min(1, 'Adicione pelo menos uma imagem.'),
});

type Product = {
  id: string;
  name: string;
  price: number;
  promoPrice?: number;
  stock?: number;
  imageUrls: string[];
};

type Category = {
    id: string;
    name: string;
}

const parseCurrency = (value: string | undefined): number => {
    if (!value) return 0;
    return parseFloat(value.replace(/\./g, '').replace(',', '.'));
};

const formatCurrency = (value: number | undefined): string => {
    if (value === undefined || value === null) return '';
    return new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2 }).format(value);
};


export function ManageProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<z.infer<typeof productSchema> & { id: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: '', description: '', price: '0,00', categoryId: '', hasStock: false, requiresShipping: false, freeShipping: false, imageUrls: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'imageUrls',
  });

  const hasStock = form.watch('hasStock');
  const requiresShipping = form.watch('requiresShipping');


  useEffect(() => {
    const productsQuery = query(collection(db, 'store_products'), orderBy('name', 'asc'));
    const unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });

    const categoriesQuery = query(collection(db, 'store_categories'), orderBy('name', 'asc'));
    const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
        setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data()} as Category)));
    });

    return () => {
      unsubscribeProducts();
      unsubscribeCategories();
    };
  }, []);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setIsUploading(true);
      try {
        const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        append(downloadURL);
        toast({ title: 'Sucesso', description: 'Imagem adicionada.' });
      } catch (error) {
        toast({ title: 'Erro de Upload', variant: 'destructive' });
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleEdit = async (product: Product) => {
    const docRef = doc(db, 'store_products', product.id);
    const docSnap = await getDoc(docRef);
    if(docSnap.exists()) {
        const fullData = docSnap.data() as any;
        const dataToEdit = {
            ...fullData,
            id: product.id,
            price: formatCurrency(fullData.price),
            promoPrice: formatCurrency(fullData.promoPrice),
            promoPrice2: formatCurrency(fullData.promoPrice2),
            hasStock: !!fullData.stock,
            requiresShipping: !!fullData.requiresShipping,
            freeShipping: !!fullData.freeShipping,
        };
        setEditingProduct(dataToEdit);
        form.reset(dataToEdit);
        setIsDialogOpen(true);
    }
  };
  
  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'store_products', id));
    toast({ title: 'Produto Excluído' });
  }

  const onSubmit = async (values: z.infer<typeof productSchema>) => {
    const dataToSave = {
        ...values,
        price: parseCurrency(values.price),
        promoPrice: parseCurrency(values.promoPrice),
        promoPrice2: parseCurrency(values.promoPrice2),
        stock: values.hasStock ? values.stock : null,
        freeShipping: values.requiresShipping ? values.freeShipping : false, // Only allow free shipping if shipping is required
    };
    delete (dataToSave as any).hasStock;

    if (editingProduct) {
      await updateDoc(doc(db, 'store_products', editingProduct.id), dataToSave);
      toast({ title: 'Produto Atualizado' });
    } else {
      await addDoc(collection(db, 'store_products'), { ...dataToSave, createdAt: serverTimestamp() });
      toast({ title: 'Produto Adicionado' });
    }
    form.reset({ name: '', description: '', price: '0,00', categoryId: '', hasStock: false, requiresShipping: false, freeShipping: false, imageUrls: [] });
    setEditingProduct(null);
    setIsDialogOpen(false);
  };

  return (
    <Card>
      <CardHeader className='flex-row items-center justify-between'>
        <div>
            <CardTitle>Gerenciar Produtos</CardTitle>
            <CardDescription>Adicione e edite os produtos da sua loja.</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
             if (!isOpen) {
                setEditingProduct(null);
                form.reset({ name: '', description: '', price: '0,00', categoryId: '', hasStock: false, requiresShipping: false, freeShipping: false, imageUrls: [] });
            }
            setIsDialogOpen(isOpen);
        }}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
            </DialogHeader>
             <div className='flex-1 overflow-y-auto pr-6 -mr-6'>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Nome do Produto</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <FormField control={form.control} name="categoryId" render={({ field }) => (
                      <FormItem><FormLabel>Categoria</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                            <SelectContent>{categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}</SelectContent>
                        </Select>
                      <FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="label" render={({ field }) => (
                      <FormItem><FormLabel>Etiqueta (Opcional)</FormLabel><FormControl><Input {...field} placeholder="Ex: Lançamento, Promoção..." /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>

                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                    <FormField control={form.control} name="price" render={({ field }) => (
                      <FormItem><FormLabel>Preço (R$)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField control={form.control} name="promoPrice" render={({ field }) => (
                      <FormItem><FormLabel>Oferta 1 (Preço Prom.)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="promoPrice2" render={({ field }) => (
                      <FormItem><FormLabel>Oferta 2 (Preço Prom.)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>

                <div className='flex flex-wrap gap-4'>
                    <FormField control={form.control} name="hasStock" render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>Controlar Estoque?</FormLabel>
                                <FormMessage />
                            </div>
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="requiresShipping" render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>Produto Físico?</FormLabel>
                                <FormMessage />
                            </div>
                        </FormItem>
                    )}/>
                     {requiresShipping && (
                        <FormField control={form.control} name="freeShipping" render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel>Frete Grátis?</FormLabel>
                                    <FormMessage />
                                </div>
                            </FormItem>
                        )}/>
                     )}
                </div>

                {hasStock && (
                    <FormField control={form.control} name="stock" render={({ field }) => (
                      <FormItem><FormLabel>Quantidade em Estoque</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                )}

                <FormField control={form.control} name="imageUrls" render={() => (
                  <FormItem>
                    <FormLabel>Imagens do Produto</FormLabel>
                    <div className='p-4 border rounded-md space-y-4'>
                        <div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4'>
                           {fields.map((field, index) => (
                               <div key={field.id} className='relative group aspect-square'>
                                   <Image src={field.value} alt={`Imagem ${index + 1}`} fill className='object-cover rounded-md'/>
                                   <Button type='button' variant="destructive" size="icon" className='absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity' onClick={() => remove(index)}>
                                        <Trash2 className='w-3 h-3'/>
                                   </Button>
                               </div>
                           ))}
                        </div>
                        <Button type="button" variant="outline" className='w-full' onClick={() => fileInputRef.current?.click()}>
                          {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                          Carregar Imagem
                        </Button>
                    </div>
                    <FormControl>
                      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                 <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Descrição Completa do Produto</FormLabel>
                        <FormControl>
                            <TiptapEditor
                                key={editingProduct?.id || 'new-product'}
                                value={field.value}
                                onChange={field.onChange}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                
                <DialogFooter className='pt-4'>
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit">Salvar Produto</Button>
                </DialogFooter>
              </form>
            </Form>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Imagem</TableHead><TableHead>Nome</TableHead><TableHead>Preço</TableHead><TableHead>Estoque</TableHead><TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map(product => (
              <TableRow key={product.id}>
                <TableCell>
                  {product.imageUrls && product.imageUrls.length > 0 ? (
                    <Image src={product.imageUrls[0]} alt={product.name} width={60} height={60} className="rounded-md object-cover" />
                  ) : (
                    <div className="w-[60px] h-[60px] bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">Sem Imagem</div>
                  )}
                </TableCell>
                <TableCell>{product.name}</TableCell>
                <TableCell>{product.promoPrice ? <><span className='line-through text-muted-foreground'>{formatCurrency(product.price)}</span> {formatCurrency(product.promoPrice)}</> : formatCurrency(product.price)}</TableCell>
                <TableCell>{product.stock ?? 'N/A'}</TableCell>
                <TableCell className="space-x-2">
                  <Button variant="outline" size="icon" onClick={() => handleEdit(product)}><Edit className="h-4 w-4" /></Button>
                  <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(product.id)} className='bg-destructive hover:bg-destructive/80'>Sim, excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
