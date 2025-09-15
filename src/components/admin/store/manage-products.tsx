
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Trash2, Upload, Loader2 } from 'lucide-react';
import Image from 'next/image';
import TiptapEditor from '@/components/ui/tiptap-editor';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


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
  imageUrls: z.array(z.object({ url: z.string().url() })).min(1, 'Adicione pelo menos uma imagem.'),
});

type ProductFormData = z.infer<typeof productSchema>;

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
};

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
  const [editingProduct, setEditingProduct] = useState<ProductFormData & { id: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      price: '0,00',
      categoryId: '',
      hasStock: false,
      requiresShipping: false,
      freeShipping: false,
      imageUrls: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "imageUrls",
  });

  const hasStock = form.watch('hasStock');
  const requiresShipping = form.watch('requiresShipping');

  useEffect(() => {
    const productsQuery = query(collection(db, 'store_products'), orderBy('name', 'asc'));
    const unsubscribeProducts = onSnapshot(productsQuery, snapshot => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });

    const categoriesQuery = query(collection(db, 'store_categories'), orderBy('name', 'asc'));
    const unsubscribeCategories = onSnapshot(categoriesQuery, snapshot => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
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
        const storagePath = `products/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        
        // Fazer upload do arquivo
        await uploadBytes(storageRef, file);
        
        // Obter a URL pública de download
        const downloadURL = await getDownloadURL(storageRef);
        
        append({ url: downloadURL });
        toast({ title: 'Sucesso', description: 'Imagem adicionada.' });
      } catch(error: any) {
        console.error("Upload Error:", error);
        toast({ title: 'Erro de Upload', description: `Não foi possível carregar a imagem. Verifique as permissões do Firebase Storage. Erro: ${error.code}`, variant: 'destructive' });
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleEdit = async (product: Product) => {
    const docRef = doc(db, 'store_products', product.id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const fullData = docSnap.data() as any;
      const dataToEdit: ProductFormData & { id: string } = {
        ...fullData,
        id: product.id,
        price: formatCurrency(fullData.price),
        promoPrice: formatCurrency(fullData.promoPrice),
        promoPrice2: formatCurrency(fullData.promoPrice2),
        hasStock: !!fullData.stock,
        requiresShipping: !!fullData.requiresShipping,
        freeShipping: !!fullData.freeShipping,
        imageUrls: Array.isArray(fullData.imageUrls) ? fullData.imageUrls.map((url: string) => ({ url })) : [],
      };
      setEditingProduct(dataToEdit);
      form.reset(dataToEdit);
      setIsDialogOpen(true);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'store_products', id));
    toast({ title: 'Produto Excluído' });
  };

  const onSubmit = async (values: ProductFormData) => {
    const dataToSave = {
      ...values,
      price: parseCurrency(values.price),
      promoPrice: parseCurrency(values.promoPrice),
      promoPrice2: parseCurrency(values.promoPrice2),
      stock: values.hasStock ? values.stock : null,
      freeShipping: values.requiresShipping ? values.freeShipping : false,
      imageUrls: values.imageUrls.map(img => img.url),
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
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Gerenciar Produtos</CardTitle>
          <CardDescription>Adicione e edite os produtos da sua loja.</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={isOpen => {
            if (!isOpen) {
              setEditingProduct(null);
              form.reset({ name: '', description: '', price: '0,00', categoryId: '', hasStock: false, requiresShipping: false, freeShipping: false, imageUrls: [] });
            }
            setIsDialogOpen(isOpen);
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Novo Produto</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto pr-6 -mr-6">
              <Form {...form}>
                <form id="product-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                   <FormField control={form.control} name="label" render={({ field }) => (
                    <FormItem><FormLabel>Selo (Ex: "Oferta", "Novo")</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="price" render={({ field }) => (
                      <FormItem><FormLabel>Preço (R$)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="promoPrice" render={({ field }) => (
                      <FormItem><FormLabel>Preço Promocional (Opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                      <FormField control={form.control} name="promoPrice2" render={({ field }) => (
                      <FormItem><FormLabel>Preço Promocional 2 (Opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="categoryId" render={({ field }) => (
                    <FormItem><FormLabel>Categoria</FormLabel><Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger></FormControl>
                      <SelectContent>{categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>
                  )} />
                   <div className="space-y-4 rounded-md border p-4">
                     <FormField control={form.control} name="hasStock" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                            <FormLabel>Controlar Estoque?</FormLabel>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                     )} />
                     {hasStock && (
                        <FormField control={form.control} name="stock" render={({ field }) => (
                            <FormItem><FormLabel>Quantidade em Estoque</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                     )}
                   </div>
                   <div className="space-y-4 rounded-md border p-4">
                     <FormField control={form.control} name="requiresShipping" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                            <FormLabel>Requer Entrega (Produto Físico)?</FormLabel>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                     )} />
                     {requiresShipping && (
                        <FormField control={form.control} name="freeShipping" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between mt-4">
                                <FormLabel>Oferecer Frete Grátis?</FormLabel>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )} />
                     )}
                   </div>
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Descrição Completa</FormLabel><FormControl><TiptapEditor value={field.value || ''} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="space-y-2">
                    <FormLabel>Imagens do Produto</FormLabel>
                    <div className="grid grid-cols-3 gap-4">
                      {fields.map((field, index) => (
                        <div key={field.id} className="relative group">
                           <Image src={field.url} alt="Preview" width={150} height={150} className="rounded-md object-cover" />
                           <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => remove(index)}>
                             <Trash2 className="h-4 w-4" />
                           </Button>
                        </div>
                      ))}
                      <Card className="flex items-center justify-center border-2 border-dashed h-full min-h-[100px]">
                        <Button type="button" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                          {isUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6 text-muted-foreground" />}
                        </Button>
                      </Card>
                    </div>
                     <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />
                     <FormMessage>{form.formState.errors.imageUrls?.message}</FormMessage>
                  </div>
                </form>
              </Form>
            </div>
             <DialogFooter className="border-t pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" form="product-form">Salvar Produto</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
         <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imagem</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map(product => (
                <TableRow key={product.id}>
                  <TableCell>
                    {product.imageUrls && product.imageUrls.length > 0 ? (
                        <Image src={product.imageUrls[0]} alt={product.name} width={64} height={64} className="rounded-md object-cover" />
                    ) : (
                        <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center">
                            <ImageIcon className='w-8 h-8 text-muted-foreground'/>
                        </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.promoPrice ? <div className='flex flex-col'><span className='line-through text-muted-foreground text-xs'>{formatCurrency(product.price)}</span><span>{formatCurrency(product.promoPrice)}</span></div> : formatCurrency(product.price)}</TableCell>
                  <TableCell>{product.stock ?? 'N/A'}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="icon" onClick={() => handleEdit(product)}><Edit className="h-4 w-4" /></Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Tem certeza?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita. Isso excluirá o produto permanentemente.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(product.id)} className="bg-destructive hover:bg-destructive/90">Sim, excluir</AlertDialogAction>
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
  );
}

    