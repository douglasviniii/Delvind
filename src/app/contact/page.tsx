
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { db } from '../../lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Header } from '@/components/layout/header';
import { FooterSection } from '@/components/layout/footer-section';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  name: z.string().min(2, { message: 'O nome é obrigatório.' }),
  email: z.string().email({ message: 'Por favor, insira um e-mail válido.' }),
  phone: z.string().min(10, { message: 'Por favor, insira um telefone válido.' }),
  service: z.string({ required_error: "Por favor, selecione um serviço."}),
});


export default function ContactPage() {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
        await addDoc(collection(db, 'leads'), {
            ...values,
            createdAt: serverTimestamp(),
            status: 'Novo', // Default status for new leads
        });
        toast({
            title: "Contato Enviado!",
            description: "Obrigado por entrar em contato. Retornaremos em breve.",
        });
        form.reset();
    } catch(error) {
        toast({
            title: "Erro",
            description: "Não foi possível enviar seu contato. Tente novamente.",
            variant: "destructive",
        });
    }
  }
  
  const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 448 512" {...props}>
        <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.8 0-65.7-10.8-94-31.5l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5c0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
    </svg>
  );

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="relative isolate">
          <div className="fixed inset-0 -z-10 bg-gradient-to-br from-white via-pink-100 to-blue-200" />
          <div className="container py-12">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">Entre em Contato</h1>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Tem alguma dúvida ou quer discutir um projeto? Preencha o formulário abaixo ou utilize um de nossos canais de atendimento.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-16">
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Informações de Contato</CardTitle>
                    <CardDescription>Estamos sempre disponíveis para ajudar.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-start gap-4">
                      <MapPin className="w-6 h-6 text-primary mt-1" />
                      <div>
                        <h3 className="font-semibold">Endereço</h3>
                        <p className="text-muted-foreground">R. Jaime Canet, 2062 - Nazaré, Medianeira - PR, 85884-000</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <Phone className="w-6 h-6 text-primary mt-1" />
                      <div>
                        <h3 className="font-semibold">Telefone</h3>
                        <a href="tel:+5545988000647" className="text-muted-foreground hover:text-primary">(45) 98800-0647</a>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <a href="https://wa.me/5545988000647" target="_blank" rel="noopener noreferrer" className="flex items-start gap-4 w-full">
                        <WhatsAppIcon className="w-6 h-6 text-primary mt-1" />
                        <div>
                          <h3 className="font-semibold">WhatsApp</h3>
                          <p className="text-muted-foreground hover:text-primary">(45) 98800-0647</p>
                        </div>
                      </a>
                    </div>
                    <div className="flex items-start gap-4">
                      <Mail className="w-6 h-6 text-primary mt-1" />
                      <div>
                        <h3 className="font-semibold">E-mail</h3>
                        <a href="mailto:contato@delvind.com" className="text-muted-foreground hover:text-primary">contato@delvind.com</a>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <Clock className="w-6 h-6 text-primary mt-1" />
                      <div>
                        <h3 className="font-semibold">Horário de Funcionamento</h3>
                        <p className="text-muted-foreground">Seg - Sex: 08:00 às 19:00</p>
                        <p className="text-muted-foreground">Sáb: 14:00 às 22:00</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div>
                <Card className="p-8 bg-card/40 backdrop-blur-md">
                   <CardHeader className='p-0 pb-6'>
                      <CardTitle>Deixe que falamos com você</CardTitle>
                   </CardHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Seu nome</FormLabel><FormControl><Input placeholder="Digite seu nome completo" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>Seu e-mail*</FormLabel><FormControl><Input placeholder="Digite seu e-mail aqui" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem><FormLabel>Telefone*</FormLabel><FormControl><Input placeholder="Seu whatsapp" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                       <FormField
                          control={form.control}
                          name="service"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>Serviço de Interesse</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                  <SelectTrigger>
                                      <SelectValue placeholder="Selecione um serviço" />
                                  </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                      <SelectItem value="Desenvolvimento de Site">Desenvolvimento de Site</SelectItem>
                                      <SelectItem value="Aplicativos">Aplicativos</SelectItem>
                                      <SelectItem value="SEO">SEO</SelectItem>
                                      <SelectItem value="Posicionamento Estratégico">Posicionamento Estratégico</SelectItem>
                                  </SelectContent>
                              </Select>
                              <FormMessage />
                              </FormItem>
                          )}
                          />
                      <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? 'Enviando...' : 'Enviar Contato'}
                      </Button>
                    </form>
                  </Form>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
