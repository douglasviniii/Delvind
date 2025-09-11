
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
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
  password: z.string().min(6, {
    message: 'A senha deve ter pelo menos 6 caracteres.',
  }),
});

function LoginPageContent() {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      
      // Clear guest chat session upon successful login
      localStorage.removeItem('activeConversationId');

      toast({
        title: 'Login bem-sucedido!',
        description: 'Redirecionando...',
      });

      const user = userCredential.user;
      
      // Admin check
      if (user.email === 'admin@delvind.com') {
        router.push('/admin');
        return;
      }
      
      // Check for collaborator role from Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists() && userDoc.data().role === 'collaborator') {
          router.push('/collaborator');
      } else {
         // Fallback for regular customer users
         router.push('/dashboard');
      }

    } catch (error: any) {
      console.error("Erro no login:", error);
      let errorMessage = 'Ocorreu um erro ao tentar fazer login. Tente novamente.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'E-mail ou senha incorretos.';
      } else if (error.code) {
        errorMessage = `Erro: ${error.code}. Por favor, contate o suporte.`;
      }
      toast({
        title: 'Erro no Login',
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
            <CardTitle>Login</CardTitle>
            <CardDescription>Insira suas credenciais para acessar seu painel.</CardDescription>
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
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Entrando...' : 'Login'}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 items-center text-sm">
            <div className="flex justify-between w-full">
                <Link href="/signup" className="hover:text-primary">
                Criar conta
                </Link>
                <Link href="/forgot-password" className="text-muted-foreground hover:text-primary">
                Esqueceu a senha?
                </Link>
            </div>
            <Link href="/" className="text-muted-foreground hover:text-primary text-xs mt-2">
              Voltar à página inicial
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}


export default function LoginPage() {
  return (
    <UnprotectedRoute>
      <LoginPageContent />
    </UnprotectedRoute>
  )
}
