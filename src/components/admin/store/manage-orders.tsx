
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ManageOrders() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Gerenciar Pedidos</CardTitle>
                <CardDescription>Acompanhe e processe os pedidos da sua loja.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                    <p>Funcionalidade de gerenciamento de pedidos em desenvolvimento.</p>
                    <p>As compras bem-sucedidas aparecerão aqui.</p>
                </div>
            </CardContent>
        </Card>
    );
}
