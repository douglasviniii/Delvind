
'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Store } from 'lucide-react';

export default function DashboardPage() {
  return (
    <section>
        <div className="container mx-auto p-4 md:p-6">
            <div className="mb-8 text-center">
                <h1 className="text-3xl md:text-4xl font-bold">Bem-vindo à nossa Loja</h1>
                <p className="text-lg text-muted-foreground mt-2">Explore nossos produtos e encontre o que precisa.</p>
            </div>

            {/* Placeholder for products */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {/* This will be replaced by dynamic product listing */}
                <Card className='text-center flex flex-col items-center justify-center min-h-[300px]'>
                    <CardHeader>
                        <Store className='w-12 h-12 mx-auto text-muted-foreground'/>
                    </CardHeader>
                    <CardContent>
                        <CardTitle>Nossos Produtos</CardTitle>
                        <CardDescription>Em breve, nossos produtos estarão disponíveis aqui. Estamos trabalhando para trazer o melhor para você!</CardDescription>
                    </CardContent>
                    <CardFooter>
                         <Button asChild>
                            <Link href="/loja">Ver Loja Completa</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    </section>
  );
}
