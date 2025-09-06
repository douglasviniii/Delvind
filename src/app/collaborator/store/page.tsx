
'use client';

import React from 'react';
import { PublicStore } from '@/components/public-store';

export default function DashboardStorePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Loja</h1>
        <p className="text-muted-foreground">
          Explore nossos produtos e serviços.
        </p>
      </div>
       <PublicStore />
    </div>
  );
}
