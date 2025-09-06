
'use client';

import React from 'react';
import { Header } from '@/components/layout/header';
import { FooterSection } from '@/components/layout/footer-section';
import { PublicStore } from '@/components/public-store';

export default function LojaPage() {
  return (
     <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="relative isolate">
            <div className="fixed inset-0 -z-10 bg-gradient-to-br from-white via-pink-100 to-blue-200" />
            <div className="container py-12">
                <div className="space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold">Loja</h1>
                        <p className="text-muted-foreground">
                          Explore nossos produtos e serviços.
                        </p>
                    </div>
                    <PublicStore />
                </div>
            </div>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
