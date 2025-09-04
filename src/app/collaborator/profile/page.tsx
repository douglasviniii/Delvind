
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/auth-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form';
import { useToast } from '../../../hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import { db, storage, auth } from '../../../lib/firebase';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { Camera } from 'lucide-react';
import { Skeleton } from '../../../components/ui/skeleton';
import { ProtectedRoute } from '../../../context/auth-context';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';


const profileSchema = z.object({
  displayName: z.string().min(2, "O nome é obrigatório."),
  email: z.string().email(),
  cpf: z.string().min(11, "CPF inválido.").max(14, "CPF inválido."),
  rg: z.string().optional(),
  phone: z.string().min(10, "Telefone inválido.").optional(),
  address: z.string().optional(),
  workCard: z.string().min(5, "O número da carteira de trabalho é obrigatório."),
  bio: z.string().optional(),
});


function ProfileContent() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrlInput, setPhotoUrlInput] = useState('');


  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
        displayName: '', email: '', cpf: '', rg: '', phone: '', address: '', workCard: '', bio: ''
    },
  });

  useEffect(() => {
    if (user) {
        const fetchUserData = async () => {
            setIsLoading(true);
            const userDocRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                form.reset({
                    displayName: user.displayName || data.displayName || '',
                    email: user.email || '',
                    cpf: data.cpf || '',
                    rg: data.rg || '',
                    phone: data.phone || '',
                    address: data.address || '',
                    workCard: data.workCard || '',
                    bio: data.bio || '',
                });
                 setPhotoPreview(user.photoURL || data.photoURL || null);
            } else {
                 form.reset({
                    displayName: user.displayName || '',
                    email: user.email || '',
                 });
                 setPhotoPreview(user.photoURL || null);
            }
            setIsLoading(false);
        };
        fetchUserData();
    }
  }, [user, form]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
        const file = event.target.files[0];
        setSelectedFile(file);
        setPhotoUrlInput('');
        const reader = new FileReader();
        reader.onload = (e) => setPhotoPreview(e.target?.result as string);
        reader.readAsDataURL(file);
    }
  };

  const handlePhotoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setPhotoUrlInput(url);
    setSelectedFile(null);
    if (url.match(/\.(jpeg|jpg|gif|png)$/) != null) {
      setPhotoPreview(url);
    } else {
      setPhotoPreview(user?.photoURL || null);
    }
  };
  
  const handlePhotoSave = async () => {
    if (!user || !auth.currentUser) {
        toast({ title: 'Erro de autenticação', variant: 'destructive' });
        return;
    }
    if (!selectedFile && !photoUrlInput.trim()) {
      toast({
        title: "Nenhuma imagem selecionada",
        description: "Carregue um arquivo ou cole uma URL.",
        variant: "destructive",
      });
      return;
    }
  
    setIsUploading(true);
    let downloadURL = photoUrlInput.trim();
  
    try {
      if (selectedFile) {
        const storageRef = ref(storage, `profile_pictures/${user.uid}`);
        await uploadBytes(storageRef, selectedFile);
        downloadURL = await getDownloadURL(storageRef);
      }
  
      if (downloadURL) {
        await updateProfile(auth.currentUser, { photoURL: downloadURL });
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, { photoURL: downloadURL }, { merge: true });
  
        setPhotoPreview(downloadURL);
        toast({ title: 'Foto Atualizada!', description: 'Sua nova foto de perfil foi salva.' });
        setIsPhotoModalOpen(false);
      } else {
        throw new Error("URL da imagem inválida ou falha no upload.");
      }
  
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({ title: 'Erro no Upload', description: 'Não foi possível salvar sua foto.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
      setSelectedFile(null);
      setPhotoUrlInput('');
    }
  };


  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    if (!user || !auth.currentUser) return;
    setIsSubmitting(true);

    try {
        const userDocRef = doc(db, 'users', user.uid);
        
        const { displayName, ...dataToSave } = values;

        if (user.displayName !== displayName) {
          await updateProfile(auth.currentUser, { displayName: displayName });
        }
        
        await setDoc(userDocRef, { ...dataToSave, displayName }, { merge: true });
      
        toast({ title: "Perfil Atualizado!", description: "Suas informações foram salvas com sucesso." });

    } catch (error: any) {
        toast({ title: "Erro ao Atualizar", description: `Não foi possível salvar suas informações.`, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  }


  if (isLoading || authLoading) {
    return (
        <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-96 w-full" />
        </div>
    );
  }

  return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Perfil de Colaborador</CardTitle>
                        <CardDescription>Gerencie suas informações pessoais e de contato.</CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-6 pt-6'>
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            <Dialog open={isPhotoModalOpen} onOpenChange={setIsPhotoModalOpen}>
                                <DialogTrigger asChild>
                                    <div className="relative cursor-pointer group">
                                        <Avatar className="w-24 h-24">
                                            <AvatarImage src={photoPreview || undefined} alt="Foto do perfil" />
                                            <AvatarFallback>{form.getValues('displayName')?.[0]?.toUpperCase() || user?.email?.[0].toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Camera className="w-8 h-8 text-white" />
                                        </div>
                                    </div>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Alterar Foto de Perfil</DialogTitle>
                                    </DialogHeader>
                                    <div className="flex flex-col items-center gap-4 py-4">
                                        <Avatar className="w-40 h-40">
                                            <AvatarImage src={photoPreview || undefined} />
                                            <AvatarFallback>{form.getValues('displayName')?.[0]?.toUpperCase() || user?.email?.[0].toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <Tabs defaultValue="upload" className="w-full">
                                            <TabsList className="grid w-full grid-cols-2">
                                                <TabsTrigger value="upload">Carregar Imagem</TabsTrigger>
                                                <TabsTrigger value="url">Usar URL</TabsTrigger>
                                            </TabsList>
                                            <TabsContent value="upload" className="pt-4">
                                                <Input type="file" accept="image/*" onChange={handleFileSelect} />
                                            </TabsContent>
                                            <TabsContent value="url" className="pt-4">
                                                <Input placeholder="https://exemplo.com/imagem.png" value={photoUrlInput} onChange={handlePhotoUrlChange}/>
                                            </TabsContent>
                                        </Tabs>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="ghost" onClick={() => setIsPhotoModalOpen(false)}>Cancelar</Button>
                                        <Button onClick={handlePhotoSave} disabled={isUploading}>
                                            {isUploading ? 'Salvando...' : 'Salvar Foto'}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                            <div className="flex-1 space-y-4 w-full">
                                <FormField control={form.control} name="displayName" render={({ field }) => (
                                    <FormItem><FormLabel>Nome Completo *</FormLabel><FormControl><Input placeholder="Seu nome completo" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="email" render={({ field }) => (
                                    <FormItem><FormLabel>E-mail de Acesso *</FormLabel><FormControl><Input disabled {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="cpf" render={({ field }) => (
                                <FormItem><FormLabel>CPF *</FormLabel><FormControl><Input placeholder="000.000.000-00" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="rg" render={({ field }) => (
                                <FormItem><FormLabel>RG</FormLabel><FormControl><Input placeholder="Seu número de RG" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="workCard" render={({ field }) => (
                                <FormItem><FormLabel>Carteira de Trabalho *</FormLabel><FormControl><Input placeholder="Número da CTPS" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="phone" render={({ field }) => (
                                <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input placeholder="(XX) XXXXX-XXXX" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                        <FormField control={form.control} name="address" render={({ field }) => (
                            <FormItem><FormLabel>Endereço Completo</FormLabel><FormControl><Input placeholder="Rua, número, bairro, cidade - UF" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="bio" render={({ field }) => (
                            <FormItem><FormLabel>Sua Bio</FormLabel><FormControl><Textarea placeholder="Fale um pouco sobre você e suas especialidades..." {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </CardContent>
                </Card>
                
                <div className="flex justify-end">
                    <Button type="submit" disabled={isSubmitting || isLoading} size="lg">
                        {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                </div>
            </form>
        </Form>
  );
}

export default function ProfilePage() {
    return (
        <ProtectedRoute collaboratorOnly={true}>
            <ProfileContent />
        </ProtectedRoute>
    )
}
