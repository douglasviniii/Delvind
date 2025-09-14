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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

type ImageField = { id: string; url: string };

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

  // ✅ Correção: Tipando name no useFieldArray
  const { fields, append, remove } = useFieldArray<
    ProductFormData,
    'imageUrls',
    'id'
  >({
    control: form.control,
    name: 'imageUrls',
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
        const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        append({ url: downloadURL }); // ✅ apenas o objeto com a URL
        toast({ title: 'Sucesso', description: 'Imagem adicionada.' });
      } catch {
        toast({ title: 'Erro de Upload', variant: 'destructive' });
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
        imageUrls: fullData.imageUrls.map((url: string) => ({ id: `${Date.now()}-${Math.random()}`, url })),
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
      imageUrls: values.imageUrls.map(img => img.url), // extrai URLs
    };
    delete (dataToSave as any).hasStock;

    if (editingProduct) {
      await updateDoc(doc(db, 'store_products', editingProduct.id), dataToSave);
      toast({ title: 'Produto Atualizado' });
    } else {
      await addDoc(collection(db, 'store_products'), { ...dataToSave, createdAt: serverTimestamp() });
      toast({ title: 'Produto Adicionado' });
    }

    form.reset({
      name: '',
      description: '',
      price: '0,00',
      categoryId: '',
      hasStock: false,
      requiresShipping: false,
      freeShipping: false,
      imageUrls: [],
    });
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
        <Dialog
          open={isDialogOpen}
          onOpenChange={isOpen => {
            if (!isOpen) {
              setEditingProduct(null);
              form.reset({
                name: '',
                description: '',
                price: '0,00',
                categoryId: '',
                hasStock: false,
                requiresShipping: false,
                freeShipping: false,
                imageUrls: [],
              });
            }
            setIsDialogOpen(isOpen);
          }}
        >
          <DialogTrigger asChild>
            <Button>
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto pr-6 -mr-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                  {/* Inputs, Checkbox, Select, Upload de imagens, TiptapEditor */}
                </form>
              </Form>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {/* Tabela de produtos */}
      </CardContent>
    </Card>
  );
}