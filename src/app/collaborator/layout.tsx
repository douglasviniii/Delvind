
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Button } from "../../components/ui/button";
import { useAuth, ProtectedRoute } from "../../context/auth-context";
import { auth, db } from "../../lib/firebase";
import { useToast } from "../../hooks/use-toast";
import { signOut } from "firebase/auth";
import { Bell, BarChart, Settings, GanttChartSquare, LogOut, Home, Menu, MessageSquare, Newspaper, User, FileSignature, Receipt, Inbox, Rss, Store } from "lucide-react";
import Link from 'next/link';
import { usePathname, useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "../../components/ui/sheet";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "../../components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Logo } from "../../components/layout/logo";
import { cn } from "../../lib/utils";
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const navItems = [
    { href: "/collaborator", icon: Home, label: "Dashboard", notificationKey: null },
    { href: "/collaborator/reports", icon: BarChart, label: "Relatórios", notificationKey: 'reports' },
    { href: "/collaborator/tasks", icon: GanttChartSquare, label: "Tarefas e Agenda", notificationKey: 'tasks' },
    { href: "/collaborator/blog", icon: Newspaper, label: "Blog", notificationKey: null },
    { href: "/collaborator/feed-blog", icon: Rss, label: "Feed Blog", notificationKey: null },
    { href: "/collaborator/contracts", icon: FileSignature, label: "Meus Contratos", notificationKey: 'contracts' },
    { href: "/collaborator/receipts", icon: Receipt, label: "Meus Recibos", notificationKey: 'receipts' },
    { href: "/collaborator/loja", icon: Store, label: "Loja", notificationKey: null },
    { href: "/collaborator/chat", icon: MessageSquare, label: "Chat", notificationKey: null },
];

function CollaboratorLayoutContent({ children }: { children: React.ReactNode }) {
    const { user, sectors, selectedSector, setSelectedSector } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { toast } = useToast();
    
    const [notifications, setNotifications] = useState({
        tasks: false,
        contracts: false,
        receipts: false,
        reports: false,
    });

    const pageTitle = useMemo(() => {
        const currentItem = navItems.find(item => {
            if (item.href === "/collaborator") {
                return pathname === "/collaborator";
            }
            return pathname.startsWith(item.href);
        });
        return currentItem?.label || 'Painel do Colaborador';
    }, [pathname]);

    useEffect(() => {
        if (!user) return;

        const listeners = [
            { key: 'tasks', collection: 'tasks', field: 'assigneeId', value: user.uid, extraQuery: where('status', '==', 'Pendente') },
            { key: 'contracts', collection: 'contracts', field: 'signatories', arrayContains: { name: user.displayName, cpf: 'N/A', signed: false }, extraQuery: where('status', '==', 'Aguardando Assinatura') },
            { key: 'receipts', collection: 'receipts', field: 'collaboratorId', value: user.uid, extraQuery: where('viewedByCollaborator', '==', false) },
            { key: 'reports', collection: 'reports', field: 'recipientId', value: user.uid, extraQuery: where('status', '==', 'Enviado') }
        ];

        const unsubscribers = listeners.map(({ key, collection: col, field, value, arrayContains, extraQuery }) => {
            let q;
            if (arrayContains) {
                // This is a simplified query; Firestore doesn't support this kind of array-contains-object query perfectly without more complex data structures.
                // A better approach would be to have a `signatoryIds` array field. For now, this will check for contracts awaiting signature assigned to the user if the data model is adjusted.
                // A more robust client-side filter would be needed if the data model is complex.
                q = query(collection(db, col), where('status', '==', 'Aguardando Assinatura'));
            } else {
                 q = query(collection(db, col), where(field, '==', value), extraQuery);
            }
            
            return onSnapshot(q, (snapshot) => {
                 if (key === 'contracts' && arrayContains) { // Special handling for contracts
                    const hasUnsigned = snapshot.docs.some(doc => {
                        const data = doc.data();
                        // Check if this user is a signatory and hasn't signed
                        return data.signatories?.some((s: any) => s.name === user.displayName && !s.signed);
                    });
                    setNotifications(prev => ({ ...prev, [key]: hasUnsigned }));
                } else {
                    setNotifications(prev => ({ ...prev, [key]: !snapshot.empty }));
                }
            });
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
    
    const userInitial = user?.displayName?.[0] || user?.email?.[0] || 'C';
    const isChatPage = pathname === '/admin/chat' || pathname === '/collaborator/chat';


    const SidebarNav = ({ isSheet = false }: { isSheet?: boolean }) => {
        const NavLink = ({ item, children }: { item: any; children?: React.ReactNode }) => {
            const linkContent = (
                <Link
                    href={item.href}
                    className={cn(
                        "flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                        pathname.startsWith(item.href) && item.href !== "/collaborator" && "bg-muted text-primary",
                        pathname === "/collaborator" && item.href === "/collaborator" && "bg-muted text-primary",
                        item.label === 'Chat' && pathname.startsWith('/admin/chat') && "bg-muted text-primary" // Special case for chat
                    )}
                >
                     {children || (
                        <>
                        <div className="flex items-center gap-3">
                            <item.icon className="h-4 w-4" />
                            {item.label}
                        </div>
                        {item.hasNotification && (
                            <div className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </div>
                        )}
                        </>
                     )}
                </Link>
            );
        
            if (isSheet) {
                return <SheetClose asChild>{linkContent}</SheetClose>;
            }
            return <>{linkContent}</>;
        };
  
      return (
        <div className="flex h-full flex-col gap-2">
          <div className="flex-1 overflow-auto py-2">
            <nav className={cn("grid items-start text-sm font-medium", isSheet ? "p-2" : "px-2 lg:px-4")}>
              {navItems.map((item) => {
                const hasNotification = item.notificationKey && notifications[item.notificationKey as keyof typeof notifications];
                return <NavLink item={{...item, hasNotification}} key={item.label} />;
              })}
            </nav>
          </div>
          <div className="mt-auto p-4 border-t space-y-2">
            <NavLink item={{href: "/collaborator/profile"}}>
              <div className={cn(
                "flex items-center gap-3 rounded-lg p-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-primary",
                pathname.startsWith("/collaborator/profile") && "bg-muted text-primary"
              )}>
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || ''} />
                  <AvatarFallback>{userInitial.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="truncate">
                  <p className="font-semibold truncate">{user?.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>
            </NavLink>
            <Button onClick={handleLogout} variant="ghost" className="w-full justify-start text-red-500 hover:text-red-500 hover:bg-red-500/10">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      );
    };

    return (
        <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
            <aside className="hidden border-r bg-muted/40 md:flex md:flex-col">
                <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                    <Logo />
                </div>
                <SidebarNav/>
            </aside>
            <div className="flex flex-col max-h-screen">
                 <div className="fixed inset-0 -z-10 bg-gradient-to-br from-white via-pink-100 to-blue-200" />
                <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 lg:h-[60px] lg:px-6 sticky top-0 z-40">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="shrink-0 md:hidden"
                            >
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Toggle navigation menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="flex flex-col p-0 w-72" aria-label="Menu Principal">
                           <SheetHeader className="sr-only">
                                <SheetTitle className="sr-only">Menu Principal</SheetTitle>
                           </SheetHeader>
                           <SidebarNav isSheet={true} />
                        </SheetContent>
                    </Sheet>
                    <div className="w-full flex-1">
                        {isChatPage ? (
                            <div className="w-full max-w-xs">
                                <Select value={selectedSector} onValueChange={setSelectedSector}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione um setor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sectors.map(sector => (
                                             <SelectItem key={sector.id} value={sector.id}>{sector.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                           <h1 className="text-lg font-semibold">{pageTitle}</h1>
                        )}
                    </div>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Settings className="h-4 w-4" />
                                <span className="sr-only">Configurações</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="outline" size="icon" className="h-8 w-8">
                        <Bell className="h-4 w-4" />
                        <span className="sr-only">Notificações</span>
                    </Button>
                </header>
                 <main className="flex-1 overflow-y-auto">
                    <div className="p-4 sm:p-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default function CollaboratorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ProtectedRoute collaboratorOnly={true}>
            <CollaboratorLayoutContent>{children}</CollaboratorLayoutContent>
        </ProtectedRoute>
    );
}
