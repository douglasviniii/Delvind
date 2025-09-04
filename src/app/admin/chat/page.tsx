
'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Lock, MessageSquare, Search, Send, MoreVertical, Paperclip, Unlock, UserCircle, Bot, CheckCircle, Trash2, UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import { useAuth } from '../../../context/auth-context';
import { db } from '../../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, arrayUnion, serverTimestamp, deleteDoc, getDocs } from 'firebase/firestore';
import { useToast } from '../../../hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from '../../../components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../../components/ui/alert-dialog';
import { LogoSpinner } from '../../../components/ui/logo-spinner';


type ConversationMessage = {
    sender: 'user' | 'ai' | 'admin';
    text: string;
    timestamp?: any;
};

type Conversation = {
    id: string;
    clientName: string;
    clientEmail: string;
    subject: string;
    sectorId: string;
    status: 'Pendente' | 'Em Atendimento' | 'Finalizado';
    createdAt: any;
    lastMessageAt: any;
    messages: ConversationMessage[];
    assigneeId?: string;
    assigneeName?: string;
};

type Collaborator = {
    uid: string;
    displayName: string;
}

export default function ChatPage() {
    const { toast } = useToast();
    const { user, selectedSector, sectors } = useAuth();

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<ConversationMessage[]>([]);

    const [unlockedSectors, setUnlockedSectors] = useState<string[]>(['geral']); // 'geral' is always unlocked
    const [passwordInput, setPasswordInput] = useState('');
    const [adminMessage, setAdminMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    const scrollAreaRef = useRef<HTMLDivElement>(null);
    
    const currentSectorInfo = sectors.find(s => s.id === selectedSector);
    const isLocked = currentSectorInfo?.isLocked && !unlockedSectors.includes(currentSectorInfo.id);

    useEffect(() => {
        if (scrollAreaRef.current) {
            const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
            if (viewport) {
                viewport.scrollTop = viewport.scrollHeight;
            }
        }
    }, [messages]);

    useEffect(() => {
        // Fetch collaborators for assignment
        const collaboratorsQuery = query(collection(db, 'users'), where('role', '==', 'collaborator'));
        const unsubscribeCollabs = onSnapshot(collaboratorsQuery, (snapshot) => {
            const collabs = snapshot.docs.map(doc => doc.data() as Collaborator);
            setCollaborators(collabs);
        });
        
        return () => unsubscribeCollabs();
    }, []);

    useEffect(() => {
        if (!selectedSector || isLocked) {
            setConversations([]);
            setSelectedConversation(null);
            return;
        };

        setLoadingConversations(true);
        const q = query(
            collection(db, 'conversations'), 
            where('sectorId', '==', selectedSector),
            where('status', '!=', 'Finalizado'),
            orderBy('status', 'asc'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const convos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
            setConversations(convos);
            setLoadingConversations(false);
        }, (error) => {
            console.error("Error fetching conversations:", error);
            toast({ title: "Erro ao buscar conversas", variant: "destructive" });
            setLoadingConversations(false);
        });

        return () => unsubscribe();
    }, [selectedSector, isLocked, toast]);
    
    // Subscribe to messages of the selected conversation
    useEffect(() => {
        if (!selectedConversation) {
            setMessages([]);
            return;
        }

        const unsub = onSnapshot(doc(db, "conversations", selectedConversation.id), (doc) => {
            if (doc.exists()) {
                const data = doc.data() as Conversation;
                setMessages(data.messages || []);
                setSelectedConversation(prev => prev ? { ...prev, ...data } : null);
            }
        });

        return () => unsub();
    }, [selectedConversation?.id]);


    const handleUnlockSector = () => {
        if (!currentSectorInfo) return;
        if (passwordInput === currentSectorInfo.password) {
            setUnlockedSectors(prev => [...prev, currentSectorInfo.id]);
            setPasswordInput('');
            toast({ title: "Acesso Liberado!", description: `Bem-vindo ao setor ${currentSectorInfo.name}.`});
        } else {
            toast({ title: "Senha Incorreta", description: "A senha informada está incorreta. Tente novamente.", variant: "destructive" });
        }
    };
    
    const handleAdminSend = async () => {
        if (!adminMessage.trim() || !selectedConversation || !user) return;
        
        setIsSending(true);
        const conversationRef = doc(db, 'conversations', selectedConversation.id);

        const newMessage: ConversationMessage = {
            sender: 'admin',
            text: adminMessage,
            timestamp: new Date()
        };

        try {
            await updateDoc(conversationRef, {
                messages: arrayUnion(newMessage),
                lastMessageAt: serverTimestamp(),
                status: 'Em Atendimento'
            });
            setAdminMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
            toast({ title: "Erro ao Enviar", description: "Não foi possível enviar a mensagem.", variant: "destructive" });
        } finally {
            setIsSending(false);
        }
    };

    const handleFinalizeConversation = async () => {
        if (!selectedConversation) return;
        try {
            const conversationRef = doc(db, 'conversations', selectedConversation.id);
            await updateDoc(conversationRef, { status: 'Finalizado' });
            toast({ title: "Chamado Finalizado", description: "A conversa foi marcada como finalizada." });
            setSelectedConversation(null); // Clear selection
        } catch (error) {
            toast({ title: "Erro", description: "Não foi possível finalizar o chamado.", variant: "destructive" });
        }
    };

    const handleDeleteConversation = async () => {
        if (!selectedConversation) return;
        try {
            await deleteDoc(doc(db, 'conversations', selectedConversation.id));
            toast({ title: "Chamado Excluído", description: "A conversa foi removida permanentemente." });
            setSelectedConversation(null); // Clear selection
        } catch (error) {
            toast({ title: "Erro", description: "Não foi possível excluir o chamado.", variant: "destructive" });
        }
    };
    
     const handleAssignConversation = async (collaborator: Collaborator) => {
        if (!selectedConversation) return;
        try {
            const conversationRef = doc(db, 'conversations', selectedConversation.id);
            const assignmentMessage: ConversationMessage = {
                sender: 'ai', // 'ai' or 'admin' for system-like messages
                text: `${collaborator.displayName} assumiu este atendimento.`,
                timestamp: new Date()
            };
            await updateDoc(conversationRef, { 
                assigneeId: collaborator.uid,
                assigneeName: collaborator.displayName,
                messages: arrayUnion(assignmentMessage)
            });
            toast({ title: "Chamado Atribuído", description: `A conversa foi atribuída a ${collaborator.displayName}.` });
        } catch (error) {
            toast({ title: "Erro", description: "Não foi possível atribuir o chamado.", variant: "destructive" });
        }
    };

    useEffect(() => {
        setPasswordInput('');
        setSelectedConversation(null);
    }, [selectedSector]);

    const renderContent = () => {
        if (isLocked) {
             return (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground bg-secondary/50">
                    <Card className="w-full max-w-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5" /> Acesso Restrito</CardTitle>
                            <CardDescription>
                                O setor <span className='font-bold'>{currentSectorInfo?.name}</span> é protegido por senha.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="space-y-2">
                                <label htmlFor="sector-password">Senha de Acesso</label>
                                <Input 
                                    id="sector-password" 
                                    type="password"
                                    placeholder="Digite a senha do setor"
                                    value={passwordInput}
                                    onChange={(e) => setPasswordInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleUnlockSector()}
                                />
                             </div>
                             <Button className="w-full" onClick={handleUnlockSector}>
                                <Unlock className="w-4 h-4 mr-2" />
                                Desbloquear
                             </Button>
                        </CardContent>
                    </Card>
                </div>
            );
        }
        
        if (selectedConversation) {
            const isOnline = selectedConversation.status === 'Em Atendimento';
            return (
                <>
                {/* Conversation Header */}
                <div className="flex items-center p-3 border-b bg-background">
                    <Avatar className="mr-4">
                        <AvatarFallback>{selectedConversation.clientName?.[0].toUpperCase()}</AvatarFallback>
                         <span className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-background ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                    </Avatar>
                    <div className="flex-1">
                        <h2 className="font-semibold">{selectedConversation.clientName}</h2>
                        <p className="text-xs text-muted-foreground">
                            {selectedConversation.assigneeName ? `Atendido por: ${selectedConversation.assigneeName}` : 'Aguardando atendimento'}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                 <Button variant="ghost" size="icon"><MoreVertical className="w-5 h-5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        <span>Atribuir a</span>
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                        {collaborators.map(collab => (
                                            <DropdownMenuItem key={collab.uid} onSelect={() => handleAssignConversation(collab)}>
                                                {collab.displayName}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuSubContent>
                                </DropdownMenuSub>
                                <DropdownMenuSeparator />
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                            <CheckCircle className="mr-2 h-4 w-4" /> Finalizar Chamado
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Finalizar este chamado?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Esta ação marcará o chamado como resolvido. O cliente não poderá mais responder.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleFinalizeConversation}>Sim, finalizar</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                <DropdownMenuSeparator />
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem className="text-red-500" onSelect={(e) => e.preventDefault()}>
                                            <Trash2 className="mr-2 h-4 w-4" /> Excluir Chamado
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Esta ação não pode ser desfeita. Isso excluirá permanentemente a conversa.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDeleteConversation}>
                                                Sim, excluir
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                
                {/* Messages */}
                <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
                    <div className="space-y-4">
                        {messages.map((message, index) => (
                            <div key={index} className={`flex items-end gap-2 ${message.sender === 'admin' || (message.sender === 'ai' && message.text.includes('assumiu')) ? 'justify-end' : 'justify-start'}`}>
                                {message.sender !== 'admin' && !(message.sender === 'ai' && message.text.includes('assumiu')) && (
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback>
                                            {message.sender === 'ai' ? <Bot className='w-5 h-5'/> : <UserCircle className="h-5 w-5" />}
                                        </AvatarFallback>
                                    </Avatar>
                                )}
                                <div className={`rounded-lg px-3 py-2 max-w-[80%] text-sm break-words ${message.sender === 'admin' ? 'bg-primary text-primary-foreground' : (message.sender === 'ai' && message.text.includes('assumiu')) ? 'bg-blue-100 text-blue-800' : 'bg-muted'}`}>
                                    {message.text}
                                </div>
                                {(message.sender === 'admin' || (message.sender === 'ai' && message.text.includes('assumiu'))) && user && (
                                     <Avatar className="h-8 w-8">
                                        <AvatarFallback>{user.displayName?.[0] || 'A'}</AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                        ))}
                    </div>
                </ScrollArea>


                {/* Message Input */}
                <div className="p-4 border-t bg-background">
                    <div className="relative flex items-center gap-2">
                         <Button variant="ghost" size="icon">
                            <Paperclip className="w-5 h-5" />
                        </Button>
                        <Input 
                            placeholder="Digite uma mensagem..." 
                            className="pr-12" 
                            value={adminMessage}
                            onChange={(e) => setAdminMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdminSend()}
                            disabled={isSending}
                        />
                        <Button 
                            size="icon" 
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                            onClick={handleAdminSend}
                            disabled={isSending}
                        >
                            {isSending ? <LogoSpinner className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                        </Button>
                    </div>
                </div>
                </>
            );
        }

        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
                <MessageSquare className="w-16 h-16" />
                <h2 className="mt-4 text-xl font-semibold">Selecione uma conversa</h2>
                <p className="mt-2">Escolha um chamado na lista à esquerda para começar a atender.</p>
                <p className="mt-1 text-sm">Você está no setor: <span className='font-bold'>{currentSectorInfo?.name}</span></p>
            </div>
        );
    }


    return (
        <main className="flex h-[calc(100vh_-_theme(spacing.14))] bg-muted/40">
            {/* Sidebar with conversation list */}
            <div className={`hidden md:flex flex-col w-1/3 max-w-sm border-r bg-background ${isLocked ? 'pointer-events-none opacity-50' : ''}`}>
                <div className="p-4 border-b">
                     <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Buscar ou iniciar conversa..." className="pl-8" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loadingConversations ? (
                        <div className="p-4 flex justify-center items-center h-full">
                           <LogoSpinner className="w-8 h-8 text-muted-foreground" />
                        </div>
                    ) : conversations.length > 0 ? (
                        <div className="divide-y">
                            {conversations.map(convo => (
                                <button key={convo.id} onClick={() => setSelectedConversation(convo)} className={`w-full text-left p-4 hover:bg-muted/50 ${selectedConversation?.id === convo.id ? 'bg-muted' : ''}`}>
                                    <div className='flex justify-between items-center'>
                                        <h3 className="font-semibold">{convo.clientName}</h3>
                                        <p className="text-xs text-muted-foreground">
                                           {convo.createdAt && formatDistanceToNow(convo.createdAt.toDate(), { addSuffix: true, locale: ptBR })}
                                        </p>
                                    </div>
                                    <p className="text-sm text-muted-foreground truncate">{convo.subject}</p>
                                     {convo.assigneeName && <p className="text-xs text-blue-600 font-medium mt-1">Atribuído a: {convo.assigneeName}</p>}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground h-full flex items-center justify-center">
                            Nenhum chamado pendente neste setor.
                        </div>
                    )}
                </div>
            </div>

            {/* Conversation Area */}
            <div className="flex-1 flex flex-col">
               {renderContent()}
            </div>
        </main>
    );
}

    
