
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import Link from 'next/link';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../lib/firebase';
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
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Logo } from '../../components/layout/logo';
import { UnprotectedRoute } from '../../context/auth-context';

const formSchema = z.object({
  email: z.string().email({
    message: 'Por favor, insira um endereço de e-mail válido.',
  }),
});

function ForgotPasswordContent() {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await sendPasswordResetEmail(auth, values.email);
      toast({
        title: 'E-mail enviado!',
        description: 'Verifique sua caixa de entrada para o link de redefinição de senha.',
      });
      form.reset();
    } catch (error: any) {
      console.error("Erro ao redefinir senha:", error);
      let errorMessage = 'Ocorreu um erro. Tente novamente.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Nenhum usuário encontrado com este e-mail.';
      }
      toast({
        title: 'Erro',
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
                <CardTitle>Redefinir Senha</CardTitle>
                <CardDescription>Digite seu e-mail para receber um link de redefinição de senha.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                            <Input placeholder="nome@exemplo.com" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Enviando...' : 'Enviar Link de Redefinição'}
                    </Button>
                </form>
                </Form>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 items-center text-sm">
                <Link href="/login" className="text-muted-foreground hover:text-primary">
                Lembrou a senha? Voltar para o login
                </Link>
                <Link href="/" className="text-muted-foreground hover:text-primary text-xs">
                Ir para a página inicial
                </Link>
            </CardFooter>
            </Card>
        </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
    return (
        <UnprotectedRoute>
            <ForgotPasswordContent />
        </UnprotectedRoute>
    )
}
