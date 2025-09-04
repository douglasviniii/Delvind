
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/auth-context';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Camera, Trash2, PlusCircle } from 'lucide-react';
import { Skeleton } from '../../../components/ui/skeleton';
import { ProtectedRoute } from '../../../context/auth-context';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';


const responsibleSchema = z.object({
    name: z.string().min(2, "O nome do responsável é obrigatório."),
    email: z.string().email("E-mail inválido."),
    role: z.string().min(2, "O cargo é obrigatório."),
    cpf: z.string().min(11, "CPF inválido."),
    rg: z.string().min(5, "RG inválido."),
    phone: z.string().min(10, "Telefone inválido."),
});

const profileSchema = z.object({
  displayName: z.string().min(2, "O nome é obrigatório."),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  // Pessoa Física
  cpf: z.string().optional(),
  rg: z.string().optional(),
  // Pessoa Jurídica
  cnpj: z.string().optional(),
  razaoSocial: z.string().optional(),
  inscricaoEstadual: z.string().optional(),
  inscricaoMunicipal: z.string().optional(),
  // Endereço
  address: z.string().optional(),
  addressNumber: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  uf: z.string().optional(),
  // Responsibles (PJ)
  responsibles: z.array(responsibleSchema).optional(),
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
        displayName: '', phone: '', address: '', cpf: '', rg: '', cnpj: '',
        razaoSocial: '', inscricaoEstadual: '', inscricaoMunicipal: '',
        addressNumber: '', neighborhood: '', city: '', uf: '',
        responsibles: []
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "responsibles"
  });

  const isPJ = !!form.watch('cnpj');

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
                    phone: data.phone || '',
                    address: data.address || '',
                    cpf: data.cpf || '',
                    rg: data.rg || '',
                    cnpj: data.cnpj || '',
                    razaoSocial: data.razaoSocial || '',
                    inscricaoEstadual: data.inscricaoEstadual || '',
                    inscricaoMunicipal: data.inscricaoMunicipal || '',
                    addressNumber: data.addressNumber || '',
                    neighborhood: data.neighborhood || '',
                    city: data.city || '',
                    uf: data.uf || '',
                    responsibles: data.responsibles || []
                });

                if(data.photoURL) {
                  setPhotoPreview(data.photoURL);
                } else if (user.photoURL) {
                  setPhotoPreview(user.photoURL);
                }
            } else {
                 form.reset({
                    displayName: user.displayName || '',
                    email: user.email || '',
                 });
                  if (user.photoURL) {
                    setPhotoPreview(user.photoURL);
                  }
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
        setPhotoUrlInput(''); // Clear URL input if file is selected
        const reader = new FileReader();
        reader.onload = (e) => setPhotoPreview(e.target?.result as string);
        reader.readAsDataURL(file);
    }
  };

  const handlePhotoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setPhotoUrlInput(url);
    setSelectedFile(null); // Clear file input if URL is pasted
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
        await updateDoc(userDocRef, { photoURL: downloadURL });
  
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
        
        await setDoc(userDocRef, { displayName, ...dataToSave }, { merge: true });
      
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
                        <CardTitle>Dados da Conta</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-6 pt-6'>
                        <div className="flex items-center gap-6">
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
                            <div className="flex-1 grid gap-4">
                                <FormField control={form.control} name="displayName" render={({ field }) => (
                                    <FormItem><FormLabel>Nome Completo ou Nome Fantasia</FormLabel><FormControl><Input placeholder="Seu nome ou nome da empresa" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormItem>
                                    <FormLabel>E-mail de Acesso</FormLabel>
                                    <FormControl><Input disabled value={user?.email || ''} /></FormControl>
                                </FormItem>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Ficha Cadastral</CardTitle>
                        <CardDescription>
                            {isPJ ? "Preencha os dados da sua empresa. Eles serão utilizados para gerar orçamentos e contratos." : "Preencha seus dados pessoais e de endereço."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        {isPJ ? (
                            <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="cnpj" render={({ field }) => (
                                    <FormItem><FormLabel>CNPJ</FormLabel><FormControl><Input placeholder="00.000.000/0000-00" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="razaoSocial" render={({ field }) => (
                                    <FormItem><FormLabel>Razão Social</FormLabel><FormControl><Input placeholder="Nome legal da empresa" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="inscricaoEstadual" render={({ field }) => (
                                    <FormItem><FormLabel>Inscrição Estadual (Opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="inscricaoMunicipal" render={({ field }) => (
                                    <FormItem><FormLabel>Inscrição Municipal (Opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                            </>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="cpf" render={({ field }) => (
                                    <FormItem><FormLabel>CPF</FormLabel><FormControl><Input placeholder="000.000.000-00" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="rg" render={({ field }) => (
                                    <FormItem><FormLabel>RG (Opcional)</FormLabel><FormControl><Input placeholder="Seu RG" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField control={form.control} name="address" render={({ field }) => (
                                <FormItem className="md:col-span-2"><FormLabel>Endereço</FormLabel><FormControl><Input placeholder="Sua rua ou avenida" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="addressNumber" render={({ field }) => (
                                <FormItem><FormLabel>Nº</FormLabel><FormControl><Input placeholder="Número" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField control={form.control} name="neighborhood" render={({ field }) => (
                                <FormItem><FormLabel>Bairro</FormLabel><FormControl><Input placeholder="Seu bairro" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="city" render={({ field }) => (
                                <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input placeholder="Sua cidade" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="uf" render={({ field }) => (
                                <FormItem><FormLabel>UF</FormLabel><FormControl><Input placeholder="Estado" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                        <FormField control={form.control} name="phone" render={({ field }) => (
                            <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input placeholder="(XX) XXXXX-XXXX" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </CardContent>
                </Card>
                
                {isPJ && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Responsáveis pela Empresa</CardTitle>
                            <CardDescription>Adicione os contatos principais que podem tomar decisões pela empresa.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            {fields.map((field, index) => (
                                <div key={field.id} className="p-4 border rounded-md space-y-4 relative bg-muted/30">
                                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:bg-destructive/10" onClick={() => remove(index)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField control={form.control} name={`responsibles.${index}.name`} render={({ field }) => (
                                            <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input placeholder="Nome do responsável" {...field} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name={`responsibles.${index}.role`} render={({ field }) => (
                                            <FormItem><FormLabel>Cargo</FormLabel><FormControl><Input placeholder="Ex: Diretor Financeiro" {...field} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                    </div>
                                    <FormField control={form.control} name={`responsibles.${index}.email`} render={({ field }) => (
                                        <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input placeholder="E-mail do responsável" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <FormField control={form.control} name={`responsibles.${index}.cpf`} render={({ field }) => (
                                            <FormItem><FormLabel>CPF</FormLabel><FormControl><Input placeholder="CPF do responsável" {...field} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name={`responsibles.${index}.rg`} render={({ field }) => (
                                            <FormItem><FormLabel>RG</FormLabel><FormControl><Input placeholder="RG do responsável" {...field} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name={`responsibles.${index}.phone`} render={({ field }) => (
                                            <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input placeholder="Telefone do responsável" {...field} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                    </div>
                                </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', email: '', role: '', cpf: '', rg: '', phone: '' })}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Responsável
                            </Button>
                        </CardContent>
                    </Card>
                )}
                
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
        <ProtectedRoute>
            <ProfileContent />
        </ProtectedRoute>
    )
}
