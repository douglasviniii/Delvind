
'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, ShoppingCart, Truck, CreditCard, ShoppingBasket, AlertCircle } from 'lucide-react';

type Order = {
    id: string;
    createdAt: Timestamp;
    amountTotal: number;
    status: 'Pendente' | 'Processando' | 'Enviado' | 'Entregue' | 'Cancelado';
};

const StatCard = ({ title, value, description, icon, isLoading }: { title: string, value: string | number, description?: string, icon: React.ReactNode, isLoading: boolean}) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-10 w-3/4" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </>
        )}
      </CardContent>
    </Card>
);

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};


export function StoreDashboard() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'orders'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching orders: ", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalRevenue = orders.reduce((sum, order) => sum + order.amountTotal, 0);
    const monthlyRevenue = orders
        .filter(order => order.createdAt.toDate() >= startOfMonth)
        .reduce((sum, order) => sum + order.amountTotal, 0);
    
    const pendingOrders = orders.filter(order => order.status === 'Pendente').length;
    const shippingOrders = orders.filter(order => order.status === 'Enviado').length;
    const shippingValue = orders
        .filter(order => order.status === 'Enviado')
        .reduce((sum, order) => sum + order.amountTotal, 0);

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
           <StatCard 
                title="Receita Total" 
                value={formatCurrency(totalRevenue)} 
                icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} 
                isLoading={loading}
           />
           <StatCard 
                title="Receita do Mês" 
                value={formatCurrency(monthlyRevenue)}
                description={`Desde ${startOfMonth.toLocaleDateString('pt-BR')}`}
                icon={<CreditCard className="h-4 w-4 text-muted-foreground" />} 
                isLoading={loading}
           />
            <StatCard 
                title="Pedidos Pendentes" 
                value={pendingOrders}
                description="Pedidos aguardando processamento"
                icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />} 
                isLoading={loading}
           />
           <StatCard 
                title="Pedidos em Trânsito" 
                value={shippingOrders}
                description={`${formatCurrency(shippingValue)} a caminho`}
                icon={<Truck className="h-4 w-4 text-muted-foreground" />} 
                isLoading={loading}
           />
        </div>
    );
}
