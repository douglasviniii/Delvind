
'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ManageProducts } from '@/components/admin/store/manage-products';
import { ManageCategories } from '@/components/admin/store/manage-categories';
import { Box, Settings, ShoppingCart } from 'lucide-react';
import { ManageOrders } from '@/components/admin/store/manage-orders';

export default function AdminStorePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gerenciamento da Loja</h1>
        <p className="text-muted-foreground">
          Adicione, edite e gerencie seus produtos, categorias e pedidos.
        </p>
      </div>

      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="products">
            <Box className="mr-2 h-4 w-4" />
            Produtos
          </TabsTrigger>
          <TabsTrigger value="categories">
            <Settings className="mr-2 h-4 w-4" />
            Categorias
          </TabsTrigger>
          <TabsTrigger value="orders">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Pedidos
          </TabsTrigger>
        </TabsList>
        <TabsContent value="products">
          <ManageProducts />
        </TabsContent>
        <TabsContent value="categories">
          <ManageCategories />
        </TabsContent>
        <TabsContent value="orders">
          <ManageOrders />
        </TabsContent>
      </Tabs>
    </div>
  );
}
