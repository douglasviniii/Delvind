
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
import { Mail, Phone, MapPin, Clock, Globe, Search, Smartphone, TrendingUp, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Logo } from '@/components/layout/logo';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import { motion } from "framer-motion";
import { TypingEffect } from '@/components/layout/typing-effect';

const formSchema = z.object({
  name: z.string().min(2, { message: 'O nome é obrigatório.' }),
  email: z.string().email({ message: 'Por favor, insira um e-mail válido.' }),
  phone: z.string().min(10, { message: 'Por favor, insira um telefone válido.' }),
  service: z.string({ required_error: "Por favor, selecione um serviço."}),
});

const services = [
  {
    title: "Websites",
    description: "Criamos sites profissionais e otimizados para converter visitantes em clientes.",
    icon: <Globe className="w-10 h-10 text-primary mb-4" />,
  },
  {
    title: "SEO",
    description: "Posicionamos sua marca no topo das buscas do Google para atrair tráfego qualificado.",
    icon: <Search className="w-10 h-10 text-primary mb-4" />,
  },
  {
    title: "Aplicativos",
    description: "Desenvolvemos aplicativos móveis intuitivos que fortalecem o relacionamento com seus clientes.",
    icon: <Smartphone className="w-10 h-10 text-primary mb-4" />,
  },
  {
    title: "Posicionamento Digital",
    description: "Gerenciamos suas redes sociais e tráfego pago para construir uma presença online forte.",
    icon: <TrendingUp className="w-10 h-10 text-primary mb-4" />,
  }
];

export default function CampaignLandingPage() {
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
            status: 'Novo',
        });
        toast({
            title: "Enviado com Sucesso!",
            description: "Muito obrigado! Alguém da nossa equipe vai entrar em contato com você. Espere ansiosamente, até logo no seu WhatsApp ou no seu e-mail",
            duration: 8000,
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

  const textToType = "Nosso foco é o SEO — aplicamos estratégias inteligentes para fazer sua empresa aparecer nas primeiras posições do Google e atrair os clientes certos.";

  return (
    <div className="min-h-screen">
       <div className="relative isolate overflow-hidden bg-gradient-to-br from-white via-pink-100 to-blue-200">
          <div className="container py-20 md:py-28">
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="relative text-center bg-white/20 backdrop-blur-md border border-white/10 rounded-2xl p-8 md:p-12 shadow-2xl"
            >
                <h1 className="text-4xl md:text-6xl font-bold font-headline mb-4 tracking-tight">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-fuchsia-500">
                      Delvind
                    </span>
                    <span>, especialistas em posicionamento digital.</span>
                </h1>
                  <div className="min-h-[100px] flex items-center justify-center">
                    <p className="font-mono text-lg md:text-xl text-foreground max-w-3xl mx-auto">
                        <TypingEffect text={textToType} />
                    </p>
                  </div>
            </motion.div>
          </div>
       
           <section className="py-12 md:py-20">
            <div className="container">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold">Nossos Serviços</h2>
                    <p className="text-lg text-muted-foreground mt-4 max-w-3xl mx-auto">Soluções completas para garantir que sua empresa tenha uma presença digital poderosa e eficaz.</p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {services.map(service => (
                        <Card key={service.title} className="flex flex-col text-center items-center bg-card/60 backdrop-blur-md border border-white/10 shadow-lg rounded-2xl">
                            <CardHeader>
                                {service.icon}
                                <CardTitle>{service.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <p className="text-muted-foreground">{service.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
           </section>

          <section id="contact-form" className="py-12 md:py-20">
            <div className="container">
              <Card className="max-w-2xl mx-auto p-8 bg-card/60 backdrop-blur-md shadow-2xl">
                  <CardHeader className='p-0 pb-6 text-center'>
                    <CardTitle className="text-3xl">Deixe que falamos com você</CardTitle>
                    <CardDescription>Preencha o formulário e nossa equipe de especialistas entrará em contato.</CardDescription>
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
                        {form.formState.isSubmitting ? 'Enviando...' : 'Enviar e Receber Contato'}
                      </Button>
                    </form>
                  </Form>
              </Card>
            </div>
          </section>
        </div>

      <footer className="bg-primary text-primary-foreground py-6">
        <div className="container text-center text-sm">
            © {new Date().getFullYear()} Delvind Tecnologia Da Informação LTDA. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
