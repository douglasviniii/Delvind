
'use client';

import { useEffect, useState } from 'react';
import { Button } from "../../components/ui/button";
import { useAuth, ProtectedRoute } from "../../context/auth-context";
import { auth, db } from "../../lib/firebase";
import { useToast } from "../../hooks/use-toast";
import { signOut } from "firebase/auth";
import { Bell, BarChart, Users, GanttChartSquare, MessageSquare, Settings, User, DollarSign, PenSquare, Newspaper, LogOut, Home, Menu, Search, Briefcase, Archive, Mail, LayoutTemplate, Handshake, FileSignature, Folder, AreaChart } from "lucide-react";
import Link from 'next/link';
import { usePathname, useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "../../components/ui/sheet";
import { Input } from "../../components/ui/input";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from "../../components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Logo } from "../../components/layout/logo";
import { cn } from "../../lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { collection, onSnapshot, query, where } from 'firebase/firestore';

const navItems = [
    { href: "/admin", icon: Home, label: "Dashboard", notificationKey: null },
    { href: "/admin/analytics", icon: AreaChart, label: "Analytics", notificationKey: null },
    { href: "/admin/reports", icon: BarChart, label: "Relatórios", notificationKey: null },
    { href: "/admin/collaborators", icon: Briefcase, label: "Colaboradores", notificationKey: null },
    { href: "/admin/tasks", icon: GanttChartSquare, label: "Tarefas e Agenda", notificationKey: 'tasks' },
    { href: "/admin/clients", icon: Users, label: "Clientes", notificationKey: null },
    { href: "/admin/leads", icon: Mail, label: "Leads", notificationKey: null },
    { href: "/admin/budgets", icon: PenSquare, label: "Orçamentos", notificationKey: null },
    { href: "/admin/contracts", icon: FileSignature, label: "Contratos", notificationKey: 'contracts' },
    { href: "/admin/documents", icon: Folder, label: "Documentos", notificationKey: null },
    { href: "/admin/portfolio", icon: LayoutTemplate, label: "Portfólio", notificationKey: null },
    { href: "/admin/blog", icon: Newspaper, label: "Blog", notificationKey: null },
    { href: "/admin/partners", icon: Handshake, label: "Parceiros", notificationKey: null },
    { href: "/admin/financeiro", icon: DollarSign, label: "Financeiro", notificationKey: 'finance' },
    { href: "/admin/requests", icon: Archive, label: "Pedidos e Revisão", notificationKey: 'requests' },
    { href: "/admin/chat", icon: MessageSquare, label: "Chat", notificationKey: 'chat' },
    { href: "/admin/settings", icon: Settings, label: "Configuração", notificationKey: null },
];

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
    const { user, sectors, selectedSector, setSelectedSector } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { toast } = useToast();
    
    const [notifications, setNotifications] = useState({
        chat: false,
        contracts: false,
        finance: false,
        requests: false,
        tasks: false,
    });

    useEffect(() => {
        const listeners = [
            { key: 'chat', collection: 'conversations', field: 'status', value: 'Pendente' },
            { key: 'contracts', collection: 'contracts', field: 'status', value: 'Pendente' },
            { key: 'finance', collection: 'finance', field: 'status', value: 'A Cobrar' },
            { key: 'requests', collection: 'requests', field: 'status', value: 'Pendente' },
            { key: 'tasks', collection: 'tasks', field: 'status', value: 'Revisão' },
        ];

        const unsubscribers = listeners.map(({ key, collection: col, field, value }) => {
            const q = query(collection(db, col), where(field, '==', value));
            return onSnapshot(q, (snapshot) => {
                setNotifications(prev => ({ ...prev, [key]: !snapshot.empty }));
            });
        });

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, []);

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
    
    const userInitial = user?.displayName?.[0] || user?.email?.[0] || 'A';

    const SidebarNav = ({ className }: { className?: string }) => (
       <div className="flex flex-col h-full">
         <div className="flex-1 overflow-y-auto py-2">
            <nav className={cn("grid items-start text-sm font-medium", className)}>
                {navItems.map((item) => {
                     const hasNotification = item.notificationKey && notifications[item.notificationKey as keyof typeof notifications];
                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={cn(
                                "flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                                pathname.startsWith(item.href) && item.href !== "/admin" && "bg-muted text-primary",
                                pathname === "/admin" && item.href === "/admin" && "bg-muted text-primary",
                                item.label === 'Chat' && pathname.startsWith('/collaborator/chat') && "bg-muted text-primary" // Special case for chat
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon className="h-4 w-4" />
                                {item.label}
                            </div>
                           {hasNotification && (
                               <div className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                </div>
                            )}
                        </Link>
                    )
                })}
            </nav>
        </div>
         <div className="mt-auto p-4 border-t space-y-2">
            <div className="flex items-center gap-3 rounded-lg p-2 text-sm font-medium text-muted-foreground">
                <Avatar className="h-9 w-9">
                    <AvatarFallback>{userInitial.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="truncate">
                    <p className="font-semibold truncate">{user?.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
            </div>
            <Button onClick={handleLogout} variant="ghost" className="w-full justify-start text-red-500 hover:text-red-500 hover:bg-red-500/10">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
            </Button>
        </div>
       </div>
    );
    
    const isChatPage = pathname === '/admin/chat' || pathname === '/collaborator/chat';

    return (
        <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
            <aside className="hidden border-r bg-muted/40 lg:flex lg:flex-col">
                <div className="flex h-14 shrink-0 items-center border-b px-4 lg:h-[60px] lg:px-6">
                    <Logo />
                </div>
                <SidebarNav className="px-2 lg:px-4"/>
            </aside>
            <div className="flex flex-col max-h-screen">
                 <div className="fixed inset-0 -z-10 bg-gradient-to-br from-white via-pink-100 to-blue-200" />
                <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:h-[60px] lg:px-6">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                className="shrink-0 lg:hidden"
                            >
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Toggle navigation menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="flex flex-col p-0">
                           <SheetHeader className="p-4">
                                <SheetTitle>Menu de Administração</SheetTitle>
                           </SheetHeader>
                           <div className="flex h-14 items-center border-y px-4">
                                <Logo />
                           </div>
                           <SidebarNav className="mt-5 p-2"/>
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
                            <h1 className="text-lg font-semibold md:block hidden">Painel de Administração</h1>
                        )}
                    </div>
                    <Button variant="outline" size="icon" className="h-8 w-8">
                        <Bell className="h-4 w-4" />
                        <span className="sr-only">Notificações</span>
                    </Button>
                </header>
                 <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ProtectedRoute adminOnly={true}>
            <AdminLayoutContent>{children}</AdminLayoutContent>
        </ProtectedRoute>
    );
}
