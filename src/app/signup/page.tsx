
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '../../hooks/use-toast';
import { Button } from '../../components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../components/ui/form';
import { Input } from '../../components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '../../components/ui/card';
import { Logo } from '../../components/layout/logo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { useState } from 'react';
import { UnprotectedRoute } from '../../context/auth-context';

// Schemas separados para cada tipo de usuário
const physicalSchema = z.object({
  name: z.string().min(2, 'O nome é obrigatório.'),
  cpf: z.string().length(11, 'O CPF deve ter 11 dígitos.'),
  email: z.string().email('Por favor, insira um e-mail válido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "As senhas não correspondem.",
  path: ["confirmPassword"],
});

const legalSchema = z.object({
  companyName: z.string().min(2, 'O nome da empresa é obrigatório.'),
  cnpj: z.string().length(14, 'O CNPJ deve ter 14 dígitos.'),
  email: z.string().email('Por favor, insira um e-mail válido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "As senhas não correspondem.",
  path: ["confirmPassword"],
});

const formSchema = z.union([physicalSchema, legalSchema]);

function SignUpContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'physical' | 'legal'>('physical');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      cpf: '',
      companyName: '',
      cnpj: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      localStorage.removeItem('activeConversationId');

      const displayName = activeTab === 'physical' ? (values as any).name : (values as any).companyName;

      await updateProfile(user, {
        displayName: displayName,
      });

      const userData: any = {
        uid: user.uid,
        email: user.email,
        displayName: displayName,
        role: 'customer',
      };

      if (activeTab === 'physical') {
        userData.cpf = (values as any).cpf;
      } else {
        userData.cnpj = (values as any).cnpj;
      }

      await setDoc(doc(db, "users", user.uid), userData);

      toast({
        title: 'Conta criada com sucesso!',
        description: 'Você será redirecionado para o painel.',
      });

      router.push('/dashboard');
    } catch (error: any) {
      console.error("Erro ao criar conta:", error);
      let errorMessage = 'Ocorreu um erro ao criar a conta. Tente novamente.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este e-mail já está em uso por outra conta.';
      }
      toast({
        title: 'Erro no Cadastro',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 relative isolate">
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-white via-pink-100 to-blue-200" />
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Logo />
        </div>
        <Card className="bg-white/40 backdrop-blur-md">
          <CardHeader>
            <CardTitle>Criar Nova Conta</CardTitle>
            <CardDescription>Preencha os campos abaixo para se cadastrar.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'physical' | 'legal')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="physical">Pessoa Física</TabsTrigger>
                <TabsTrigger value="legal">Pessoa Jurídica</TabsTrigger>
              </TabsList>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                  <TabsContent value="physical" className="space-y-4 m-0">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Seu nome completo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="cpf" render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF</FormLabel>
                        <FormControl>
                          <Input placeholder="000.000.000-00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </TabsContent>
                  <TabsContent value="legal" className="space-y-4 m-0">
                    <FormField control={form.control} name="companyName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Empresa</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome da sua empresa" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="cnpj" render={({ field }) => (
                      <FormItem>
                        <FormLabel>CNPJ</FormLabel>
                        <FormControl>
                          <Input placeholder="00.000.000/0000-00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </TabsContent>

                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input placeholder="nome@exemplo.com" {...field} type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input placeholder="••••••••" {...field} type="password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Repetir Senha</FormLabel>
                      <FormControl>
                        <Input placeholder="••••••••" {...field} type="password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Criando conta...' : 'Criar Conta'}
                  </Button>
                </form>
              </Form>
            </Tabs>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 items-center text-sm pt-4">
            <Link href="/login" className="text-muted-foreground hover:text-primary">
              Já tem uma conta? Faça login
            </Link>
            <Link href="/" className="text-muted-foreground hover:text-primary text-xs mt-2">
              Voltar à página inicial
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <UnprotectedRoute>
      <SignUpContent />
    </UnprotectedRoute>
  );
}
