'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUp, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db, storage } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Header } from '@/components/layout/header';
import { FooterSection } from '@/components/layout/footer-section';
import { Textarea } from '@/components/ui/textarea';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useState, useRef } from 'react';

const formSchema = z.object({
  name: z.string().min(2, { message: 'O nome é obrigatório.' }),
  email: z.string().email({ message: 'Por favor, insira um e-mail válido.' }),
  phone: z.string().min(10, { message: 'Por favor, insira um telefone válido.' }),
  address: z.string().min(5, { message: 'O endereço é obrigatório.' }),
  position: z.string().min(3, { message: 'A vaga de interesse é obrigatória.'}),
  resume: z.instanceof(File)
    .refine(file => file.size < 15000000, 'O arquivo deve ter no máximo 15MB.')
    .refine(file => file.type === 'application/pdf', 'Apenas arquivos PDF são aceitos.'),
});

export default function WorkWithUsPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        name: '',
        email: '',
        phone: '',
        address: '',
        position: '',
        resume: undefined,
    }
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
        const resumeRef = ref(storage, `resumes/${Date.now()}_${values.resume.name}`);
        const snapshot = await uploadBytes(resumeRef, values.resume);
        const resumeUrl = await getDownloadURL(snapshot.ref);

        await addDoc(collection(db, 'curriculums'), {
            name: values.name,
            email: values.email,
            phone: values.phone,
            address: values.address,
            position: values.position,
            resumeUrl: resumeUrl,
            status: 'Recebido',
            createdAt: serverTimestamp(),
        });
        
        toast({
            title: "Currículo Enviado!",
            description: "Obrigado pelo seu interesse! Entraremos em contato caso seu perfil seja compatível.",
        });
        form.reset();
        if(fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    } catch(error) {
        console.error("Error submitting application: ", error);
        toast({
            title: "Erro",
            description: "Não foi possível enviar sua candidatura. Tente novamente.",
            variant: "destructive",
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="relative isolate">
          <div className="fixed inset-0 -z-10 bg-gradient-to-br from-white via-pink-100 to-blue-200" />
          <div className="container py-12">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">Trabalhe Conosco</h1>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Buscamos talentos apaixonados por tecnologia e inovação para se juntar à nossa equipe. Se você quer fazer a diferença, seu lugar é aqui!
              </p>
            </div>

            <Card className="max-w-3xl mx-auto p-8 bg-card/40 backdrop-blur-md">
                <CardHeader className='p-0 pb-6'>
                    <CardTitle>Envie sua Candidatura</CardTitle>
                    <CardDescription>Preencha o formulário abaixo e anexe seu currículo. Boa sorte!</CardDescription>
                </CardHeader>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input placeholder="Seu nome" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="phone" render={({ field }) => (
                            <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input placeholder="Seu WhatsApp" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                    <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input placeholder="Seu melhor e-mail" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="address" render={({ field }) => (
                        <FormItem><FormLabel>Endereço</FormLabel><FormControl><Input placeholder="Cidade e Estado" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="position" render={({ field }) => (
                        <FormItem><FormLabel>Vaga de Interesse</FormLabel><FormControl><Textarea placeholder="Descreva a vaga ou área que você tem interesse em atuar" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField
                        control={form.control}
                        name="resume"
                        render={({ field: { onChange } }) => (
                            <FormItem>
                                <FormLabel>Currículo (PDF, máx 15MB)</FormLabel>
                                <FormControl>
                                    <Input
                                        type="file"
                                        accept=".pdf"
                                        ref={fileInputRef}
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files.length > 0) {
                                                onChange(e.target.files[0]);
                                            }
                                        }}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                        {isSubmitting ? 'Enviando...' : 'Enviar Currículo'}
                    </Button>
                </form>
                </Form>
            </Card>
          </div>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
