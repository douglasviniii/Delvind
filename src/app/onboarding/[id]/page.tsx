
'use client';

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/layout/logo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

const formSchema = z.object({
  // Common fields
  phone: z.string().min(10, "Telefone inválido."),
  email: z.string().email("E-mail inválido."),
  address: z.string().min(5, "Endereço é obrigatório."),
  addressNumber: z.string().min(1, "Número é obrigatório."),
  neighborhood: z.string().min(2, "Bairro é obrigatório."),
  city: z.string().min(2, "Cidade é obrigatória."),
  uf: z.string().min(2, "UF é obrigatório.").max(2, "UF deve ter 2 letras."),
  
  // Physical Person fields
  name: z.string().optional(),
  cpf: z.string().optional(),
  rg: z.string().optional(),

  // Legal Person fields
  companyName: z.string().optional(),
  cnpj: z.string().optional(),
  razaoSocial: z.string().optional(),
  inscricaoEstadual: z.string().optional(),
  inscricaoMunicipal: z.string().optional(),
}).refine(data => {
    // If it's a physical person, require name and cpf
    if (!data.cnpj) {
        return !!data.name && !!data.cpf;
    }
    return true;
}, {
    message: "Nome e CPF são obrigatórios para pessoa física.",
    path: ['name'],
}).refine(data => {
    // If it's a legal person, require companyName, razaoSocial, and cnpj
    if (data.cnpj) {
        return !!data.companyName && !!data.razaoSocial;
    }
    return true;
}, {
    message: "Nome da Empresa, Razão Social e CNPJ são obrigatórios para pessoa jurídica.",
    path: ['companyName'],
});


type FormData = z.infer<typeof formSchema>;

type OnboardingData = {
  id: string;
  name: string;
  email: string;
  status: 'Pendente' | 'Preenchido';
};

const defaultValues: FormData = {
  email: '',
  name: '',
  cpf: '',
  rg: '',
  phone: '',
  address: '',
  addressNumber: '',
  neighborhood: '',
  city: '',
  uf: '',
  companyName: '',
  cnpj: '',
  razaoSocial: '',
  inscricaoEstadual: '',
  inscricaoMunicipal: '',
};

function OnboardingForm() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'physical' | 'legal'>('physical');
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { id } = params;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  useEffect(() => {
    if (typeof id !== 'string') return;
    const fetchOnboardingRequest = async () => {
      setLoading(true);
      const docRef = doc(db, 'onboarding', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as OnboardingData;
        if (data.status === 'Preenchido') {
          toast({ title: "Ficha já preenchida", description: "Obrigado! Já recebemos seus dados.", duration: 5000 });
          router.push('/');
          return;
        }
        setOnboardingData(data);
        // Set initial values based on onboarding data
        form.reset({ 
            ...defaultValues, 
            email: data.email || '', 
            name: data.name || '', 
            companyName: data.name || '' 
        });
      } else {
        toast({ title: "Inválido", description: "Link de cadastro inválido ou expirado.", variant: "destructive" });
        router.push('/');
      }
      setLoading(false);
    };
    fetchOnboardingRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router, toast]);

  const onSubmit: SubmitHandler<FormData> = async (values) => {
    if (!onboardingData) return;
    setIsSubmitting(true);
    try {
      const docRef = doc(db, 'onboarding', onboardingData.id);
      
      let finalData: Partial<FormData> = {};
       if (activeTab === 'physical') {
            finalData = {
                name: values.name,
                cpf: values.cpf,
                rg: values.rg,
                phone: values.phone,
                email: values.email,
                address: values.address,
                addressNumber: values.addressNumber,
                neighborhood: values.neighborhood,
                city: values.city,
                uf: values.uf,
            };
        } else {
            finalData = {
                companyName: values.companyName,
                cnpj: values.cnpj,
                razaoSocial: values.razaoSocial,
                inscricaoEstadual: values.inscricaoEstadual,
                inscricaoMunicipal: values.inscricaoMunicipal,
                phone: values.phone,
                email: values.email,
                address: values.address,
                addressNumber: values.addressNumber,
                neighborhood: values.neighborhood,
                city: values.city,
                uf: values.uf,
            };
        }
      
      await updateDoc(docRef, {
        formData: finalData,
        formType: activeTab,
        status: 'Preenchido',
        filledAt: serverTimestamp(),
      });

      toast({
        title: "Dados enviados com sucesso!",
        description: "Obrigado por completar seu cadastro. Nossa equipe entrará em contato em breve.",
      });

      setTimeout(() => router.push('/'), 5000);
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível enviar seus dados.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Skeleton className="h-96 w-full max-w-2xl" /></div>;
  if (isSubmitting) return (
    <div className="flex min-h-screen items-center justify-center p-4 text-center">
      <Card className="w-full max-w-md bg-background/80">
        <CardHeader>
          <CardTitle>Enviado com Sucesso!</CardTitle>
          <CardDescription>Obrigado! Seus dados foram recebidos. Você será redirecionado em instantes.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center p-4 relative isolate">
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-primary/10 via-background to-background" />
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <Logo />
        </div>
        <Card className="bg-background/80 backdrop-blur-md">
          <CardHeader>
            <CardTitle>Ficha Cadastral</CardTitle>
            <CardDescription>Olá, {onboardingData?.name}! Por favor, preencha os dados abaixo.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'physical' | 'legal')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="physical">Pessoa Física</TabsTrigger>
                <TabsTrigger value="legal">Pessoa Jurídica</TabsTrigger>
              </TabsList>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-6">
                  <TabsContent value="physical" className="space-y-4 m-0">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl><Input placeholder="Seu nome completo" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="cpf" render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPF</FormLabel>
                          <FormControl><Input placeholder="000.000.000-00" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}/>
                      <FormField control={form.control} name="rg" render={({ field }) => (
                        <FormItem>
                          <FormLabel>RG (Opcional)</FormLabel>
                          <FormControl><Input placeholder="Seu RG" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}/>
                    </div>
                  </TabsContent>
                  <TabsContent value="legal" className="space-y-4 m-0">
                    <FormField control={form.control} name="companyName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Fantasia</FormLabel>
                        <FormControl><Input placeholder="Nome da sua empresa" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="razaoSocial" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Razão Social</FormLabel>
                          <FormControl><Input placeholder="Razão social da empresa" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}/>
                      <FormField control={form.control} name="cnpj" render={({ field }) => (
                        <FormItem>
                          <FormLabel>CNPJ</FormLabel>
                          <FormControl><Input placeholder="00.000.000/0000-00" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}/>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="inscricaoEstadual" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Inscrição Estadual</FormLabel>
                          <FormControl><Input placeholder="Opcional" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}/>
                      <FormField control={form.control} name="inscricaoMunicipal" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Inscrição Municipal</FormLabel>
                          <FormControl><Input placeholder="Opcional" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}/>
                    </div>
                  </TabsContent>

                  {/* Campos comuns */}
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl><Input placeholder="seu@email.com" type="email" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}/>
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone / WhatsApp</FormLabel>
                      <FormControl><Input placeholder="(00) 00000-0000" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}/>

                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="address" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Endereço</FormLabel>
                        <FormControl><Input placeholder="Rua, Av..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <FormField control={form.control} name="addressNumber" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nº</FormLabel>
                        <FormControl><Input placeholder="Número" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="neighborhood" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bairro</FormLabel>
                        <FormControl><Input placeholder="Seu bairro" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <FormField control={form.control} name="city" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl><Input placeholder="Sua cidade" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <FormField control={form.control} name="uf" render={({ field }) => (
                      <FormItem>
                        <FormLabel>UF</FormLabel>
                        <FormControl><Input placeholder="XX" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Enviando...' : 'Enviar Dados'}
                  </Button>
                </form>
              </Form>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default OnboardingForm;
