'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db, storage } from '../../../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, doc, serverTimestamp, getDoc, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { useToast } from '../../../hooks/use-toast';
import { PlusCircle, Edit, Trash2, Upload, Loader2 } from 'lucide-react';
import Image from 'next/image';
import TiptapEditor from '../../../components/ui/tiptap-editor';
import { useAuth } from '../../../context/auth-context';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../../components/ui/alert-dialog';

const blogSchema = z.object({
  title: z.string().min(3, 'O título é obrigatório.'),
  excerpt: z.string().min(10, 'O resumo é muito curto.').max(200, 'O resumo deve ter no máximo 200 caracteres.'),
  content: z.string().min(50, 'O conteúdo do post é muito curto.'),
  imageUrl: z.string().url('A URL da imagem de capa é obrigatória.'),
});

type BlogPost = {
  id: string;
  title: string;
  authorId: string;
  createdAt: any;
  imageUrl: string;
};

export default function CollaboratorBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost & { excerpt: string, content: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<z.infer<typeof blogSchema>>({
    resolver: zodResolver(blogSchema),
    defaultValues: { title: '', excerpt: '', content: '', imageUrl: '' },
  });

  useEffect(() => {
    if (!user) return;
    const postsQuery = query(collection(db, 'blog'), where('authorId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
      const postData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost));
      setPosts(postData);
    });

    return () => unsubscribePosts();
  }, [user]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setIsUploading(true);
      try {
        const storageRef = ref(storage, `blog_covers/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        form.setValue('imageUrl', downloadURL, { shouldValidate: true });
        toast({ title: 'Sucesso', description: 'Imagem de capa carregada.' });
      } catch (error) {
        console.error("Upload error:", error);
        toast({ title: 'Erro de Upload', description: 'Não foi possível carregar a imagem.', variant: 'destructive' });
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleEdit = async (post: BlogPost) => {
    const postRef = doc(db, 'blog', post.id);
    const postSnap = await getDoc(postRef);
    if (postSnap.exists()) {
        const fullPostData = postSnap.data();
        const fullPost = { 
            id: post.id, 
            ...fullPostData
        } as BlogPost & { excerpt: string, content: string };
        setEditingPost(fullPost);
        form.reset(fullPost);
        setIsDialogOpen(true);
    } else {
        toast({ title: "Erro", description: "Não foi possível carregar os dados completos do post.", variant: "destructive"});
    }
  };
  
  const handleDelete = async (id: string) => {
      try {
          await deleteDoc(doc(db, 'blog', id));
          toast({ title: 'Post Excluído', description: 'O post foi removido com sucesso.' });
      } catch(e) {
          console.error("Error deleting document: ", e);
          toast({ title: 'Erro ao Excluir', description: 'Não foi possível remover o post.', variant: 'destructive' });
      }
  }

  const onSubmit = async (values: z.infer<typeof blogSchema>) => {
    if (!user) {
      toast({ title: 'Erro de autenticação', variant: 'destructive'});
      return;
    }
    
    const dataToSave = {
        title: values.title,
        excerpt: values.excerpt,
        content: values.content,
        imageUrl: values.imageUrl,
        author: user.displayName,
        authorId: user.uid,
    };

    try {
      if (editingPost) {
        await updateDoc(doc(db, 'blog', editingPost.id), { ...dataToSave, updatedAt: serverTimestamp() });
        toast({ title: 'Post Atualizado' });
      } else {
        await addDoc(collection(db, 'blog'), { 
            ...dataToSave,
            createdAt: serverTimestamp() 
        });
        toast({ title: 'Post Publicado' });
      }
      form.reset();
      setEditingPost(null);
      setIsDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao salvar post', description: 'Não foi possível salvar o post.', variant: 'destructive' });
    }
  };
  
  const imageUrl = form.watch('imageUrl');

  return (
    <main className="flex-1">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Estúdio de Blog</h1>
          <p className="text-muted-foreground">Crie e edite suas postagens para o blog.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingPost(null); form.reset(); setIsDialogOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Nova Postagem
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>{editingPost ? 'Editar Postagem' : 'Nova Postagem'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[80vh] overflow-y-auto pr-6">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Título</FormLabel><FormControl><Input {...field} placeholder="Título da Postagem" /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="excerpt" render={({ field }) => (
                  <FormItem><FormLabel>Resumo (aparece nos cards)</FormLabel><FormControl><Textarea {...field} placeholder="Um resumo curto e chamativo para a postagem." /></FormControl><FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="imageUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Imagem de Capa</FormLabel>
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
                    {imageUrl && <Image src={imageUrl} alt="Preview" width={200} height={100} className="mt-2 rounded-md object-cover" />}
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="content" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Conteúdo do Post</FormLabel>
                        <FormControl>
                            <TiptapEditor
                                key={editingPost?.id || 'new-post'}
                                value={field.value}
                                onChange={field.onChange}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                
                <DialogFooter className='pt-4'>
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit">Salvar</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Suas Postagens</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Capa</TableHead><TableHead>Título</TableHead><TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map(post => (
                <TableRow key={post.id}>
                  <TableCell><Image src={post.imageUrl} alt={post.title} width={100} height={60} className="rounded-md object-cover" /></TableCell>
                  <TableCell>{post.title}</TableCell>
                  <TableCell className="space-x-2">
                    <Button variant="outline" size="icon" onClick={() => handleEdit(post)}><Edit className="h-4 w-4" /></Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Isso excluirá permanentemente o post do blog.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(post.id)} className='bg-destructive hover:bg-destructive/80'>Sim, excluir</AlertDialogAction>
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
