
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Button } from "../../components/ui/button";
import { Home, User, Settings, LifeBuoy, LogOut, Menu, PenSquare, DollarSign, Bell, Package, MessageSquare, FileSignature, Receipt, Sun, Moon, Calendar, FileText, Rss, Briefcase, Store, ShoppingCart } from "lucide-react";
import Link from 'next/link';
import { usePathname, useRouter } from "next/navigation";
import { useAuth, ProtectedRoute } from "../../context/auth-context";
import { auth, db } from "../../lib/firebase";
import { signOut } from "firebase/auth";
import { useToast } from "../../hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger, SheetClose } from '../../components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Logo } from '../../components/layout/logo';
import { cn } from '../../lib/utils';
import { ChatWidget } from '../../components/layout/chat-widget';
import { collection, onSnapshot, query, where, collectionGroup } from 'firebase/firestore';
import { useCart } from '@/context/cart-context';


function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { cartCount } = useCart();
  
  const [notifications, setNotifications] = useState({
      budgets: false,
      payments: false,
      receipts: false,
      contracts: false,
      documents: false,
  });

  const navItems = [
    { href: "/dashboard", label: "Loja", icon: Store, notificationKey: null },
    { href: "/dashboard/schedule", label: "Agendamentos", icon: Calendar, notificationKey: null },
    { href: "/dashboard/budgets", label: "Meus Orçamentos", icon: PenSquare, notificationKey: 'budgets' },
    { href: "/dashboard/contracts", label: "Meus Contratos", icon: FileSignature, notificationKey: 'contracts' },
    { href: "/dashboard/documents", label: "Meus Documentos", icon: FileText, notificationKey: 'documents' },
    { href: "/dashboard/products", label: "Meus Produtos", icon: Package, notificationKey: null },
    { href: "/dashboard/feed-blog", label: "Feed do Blog", icon: Rss, notificationKey: null },
    { href: "/dashboard/payments", label: "Faturas e Pagamentos", icon: DollarSign, notificationKey: 'payments' },
    { href: "/dashboard/receipts", label: "Meus Comprovantes", icon: Receipt, notificationKey: 'receipts' },
  ];

  const pageTitle = useMemo(() => {
    const currentItem = navItems.find(item => {
        if (item.href === "/dashboard") {
            return pathname === "/dashboard";
        }
        return pathname.startsWith(item.href);
    });
    return currentItem?.label || 'Painel do Cliente';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    // Ensure user and user.uid exist before proceeding
    if (!user || !user.uid) return;

    const listeners = [
        { key: 'budgets', collection: 'budgets', field: 'clientId', value: user.uid, extraQuery: where('status', '==', 'Pendente') },
        { key: 'payments', collection: 'finance', field: 'clientId', value: user.uid, extraQuery: where('status', '==', 'Cobrança Enviada') },
        { key: 'receipts', collection: 'receipts', field: 'clientId', value: user.uid, extraQuery: where('viewedByClient', '==', false) },
        { key: 'contracts', collection: 'contracts', field: 'clientId', value: user.uid, extraQuery: where('status', '==', 'Aguardando Assinatura') },
        { key: 'documents', collectionGroup: 'documents', field: 'sharedWith', arrayContains: user.uid }
    ];

    const unsubscribers = listeners.map(({ key, collection: col, collectionGroup: colGroup, field, value, extraQuery, arrayContains }) => {
        if (!value) return () => {}; // Extra safety check for value
        
        let q;
        if (colGroup) {
            q = query(collectionGroup(db, colGroup), where(field!, 'array-contains', value));
        } else {
            q = query(collection(db, col!), where(field!, '==', value), extraQuery);
        }
        
        return onSnapshot(q, (snapshot) => {
            if (key === 'documents') {
                const hasUnread = snapshot.docs.some(doc => doc.data().viewedByClient === false);
                setNotifications(prev => ({ ...prev, [key]: hasUnread }));
            } else {
                 setNotifications(prev => ({ ...prev, [key]: !snapshot.empty }));
            }
        }, (err) => { console.error(`Error on snapshot for ${key}:`, err); });
    });

    return () => {
        unsubscribers.forEach(unsub => unsub());
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Logout bem-sucedido!",
        description: "Você foi desconectado.",
      });
      router.push('/login');
    } catch (error) {
        toast({
            title: "Erro",
            description: "Não foi possível fazer logout. Tente novamente.",
            variant: "destructive",
          });
      console.error('Erro ao fazer logout:', error);
    }
  };

  const userInitial = user?.displayName?.[0] || user?.email?.[0] || '';

  const NavLinks = ({ isSheet = false }: { isSheet?: boolean }) => (
    <>
      {navItems.map((item) => {
        const hasNotification = item.notificationKey && notifications[item.notificationKey as keyof typeof notifications];
        const linkContent = (
            <Button
                asChild
                variant={pathname.startsWith(item.href) && item.href !== '/dashboard' ? 'secondary' : (pathname === '/dashboard' && item.href === '/dashboard' ? 'secondary' : 'ghost')}
                className="w-full justify-start relative"
            >
                <Link href={item.href}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
                {hasNotification && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                )}
                </Link>
            </Button>
        );

        if (isSheet) {
          return <SheetClose asChild key={item.href}>{linkContent}</SheetClose>;
        }
        return <React.Fragment key={item.href}>{linkContent}</React.Fragment>;
      })}
    </>
  );

  const SidebarContent = ({ isSheet = false }: { isSheet?: boolean }) => (
    <div className="flex h-full flex-col gap-2">
        <div className="p-4 border-b h-16 flex items-center px-6">
            <Logo />
        </div>
        <div className="flex-1 py-4 overflow-y-auto">
            <nav className="flex-1 px-4 space-y-2">
                <NavLinks isSheet={isSheet} />
            </nav>
        </div>
        <div className="mt-auto p-4 border-t space-y-2">
            <Button asChild variant="ghost" className='w-full justify-start p-2 h-auto'>
                <Link href="/dashboard/profile" className={cn(
                    "flex items-center gap-3 rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:text-primary",
                    pathname.startsWith('/dashboard/profile') && "text-primary"
                )}>
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || ''} />
                        <AvatarFallback>{userInitial.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="truncate">
                        <p className="font-semibold truncate">{user?.displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                </Link>
            </Button>
            <Button onClick={handleLogout} variant="ghost" className="w-full justify-start text-red-500 hover:text-red-500 hover:bg-red-500/10">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
            </Button>
        </div>
    </div>
  );

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
      <aside className="hidden lg:block border-r bg-background">
          <SidebarContent />
      </aside>
      <div className="flex flex-col max-h-screen relative">
         <div className="fixed inset-0 -z-10 bg-gradient-to-br from-white via-pink-100 to-blue-200" />
        <header className="flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6 shrink-0 sticky top-0 z-40">
          <Sheet>
              <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden">
                      <Menu className="h-5 w-5" />
                      <span className="sr-only">Abrir menu</span>
                  </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col p-0 w-72" aria-label="Menu Principal">
                  <SheetHeader className="sr-only">
                      <SheetTitle className="sr-only">Menu</SheetTitle>
                  </SheetHeader>
                  <SidebarContent isSheet={true} />
              </SheetContent>
          </Sheet>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
            </Button>
             <Button variant="ghost" size="icon" asChild>
              <Link href="/loja/cart" className="relative">
                <ShoppingCart className="h-7 w-7 text-primary" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                    {cartCount}
                  </span>
                )}
                <span className="sr-only">Carrinho</span>
              </Link>
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            {children}
        </main>
        <ChatWidget />
      </div>
    </div>
  );
}


export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ProtectedRoute>
            <DashboardLayoutContent>{children}</DashboardLayoutContent>
        </ProtectedRoute>
    )
}
