
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Input } from '../ui/input';
import { MessageSquare, X, Send, Bot, User, ArrowLeft } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import { useAuth } from '../../context/auth-context';
import { db } from '../../lib/firebase';
import { addDoc, collection, serverTimestamp, doc, onSnapshot, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { useToast } from '../../hooks/use-toast';
import { LogoSpinner } from '../ui/logo-spinner';


type Message = {
    sender: 'user' | 'ai' | 'admin';
    text: string;
};

type ConversationStep = 'GREETING' | 'AWAITING_NAME' | 'AWAITING_EMAIL' | 'AWAITING_SUBJECT' | 'AWAITING_SECTOR' | 'IN_PROGRESS' | 'DONE';

type ConversationStatus = 'Pendente' | 'Em Atendimento' | 'Finalizado';


export function ChatWidget() {
  const { user, sectors } = useAuth(); 
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationStep, setConversationStep] = useState<ConversationStep>('GREETING');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationStatus, setConversationStatus] = useState<ConversationStatus>('Pendente');
  const [assigneeName, setAssigneeName] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const userInfo = useRef<{ name?: string; email?: string; subject?: string; sectorId?: string; sectorName?: string; }>({});
  
  const startNewConversation = (isUserLoggedIn: boolean) => {
    setConversationId(null);
    localStorage.removeItem('activeConversationId');
    userInfo.current = {};
    setInput('');
    setIsLoading(false);
    setAssigneeName(null);
    setConversationStatus('Pendente');

    if (isUserLoggedIn && user) {
        setMessages([
            { sender: 'ai', text: `Olá, ${user.displayName}! Sou a Delvi. Como posso te ajudar hoje? Por favor, me diga o assunto do seu contato.` }
        ]);
        setConversationStep('AWAITING_SUBJECT');
    } else {
        setMessages([
            { sender: 'ai', text: 'Olá! Sou a Delvi, assistente virtual da Delvind. Para começarmos, qual é o seu nome?' }
        ]);
        setConversationStep('GREETING');
    }
  };
  
  // This effect handles resuming a conversation for GUESTS on page load.
  useEffect(() => {
    if (user) {
        // If a user is logged in, we clear any previous guest conversation.
        const guestConversationId = localStorage.getItem('activeConversationId');
        if (guestConversationId) {
            localStorage.removeItem('activeConversationId');
            if (conversationId === guestConversationId) {
                setConversationId(null);
                // No need to call startNewConversation here, the isOpen effect will handle it
            }
        }
        setIsInitialized(true);
        return;
    }

    // For guest users, try to resume a conversation.
    const activeConversationId = localStorage.getItem('activeConversationId');
    if (activeConversationId) {
        setIsLoading(true);
        const conversationRef = doc(db, 'conversations', activeConversationId);
        getDoc(conversationRef).then(docSnap => {
            if (docSnap.exists() && docSnap.data().status !== 'Finalizado') {
                setConversationId(activeConversationId);
                setConversationStep('IN_PROGRESS');
            } else {
                localStorage.removeItem('activeConversationId');
            }
        }).finally(() => {
            setIsLoading(false);
            setIsInitialized(true);
        });
    } else {
        setIsInitialized(true);
    }
  }, [user]);

  // This effect listens for real-time messages once a conversation is established
  useEffect(() => {
    if (!conversationId) return;

    const conversationRef = doc(db, 'conversations', conversationId);
    const unsubscribe = onSnapshot(conversationRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            setMessages(data.messages || []);
            setConversationStatus(data.status);
            setAssigneeName(data.assigneeName || null);
            if (data.status === 'Finalizado') {
                localStorage.removeItem('activeConversationId');
                setConversationId(null);
                addMessage('ai', 'Este chamado foi finalizado. Se precisar de mais ajuda, inicie uma nova conversa.');
                setConversationStep('DONE');
            }
        }
    });

    return () => unsubscribe();
  }, [conversationId]);


  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

  const addMessage = (sender: 'user' | 'ai' | 'admin', text: string) => {
    setMessages(prev => [...prev, { sender, text }]);
  };
  
  const createConversationInFirestore = async () => {
    try {
        const initialMessages = messages.slice(1);
        if (initialMessages.length === 0 && userInfo.current.subject) {
            initialMessages.push({ sender: 'user', text: userInfo.current.subject });
        }
        
        const docRef = await addDoc(collection(db, 'conversations'), {
            clientName: userInfo.current.name,
            clientEmail: userInfo.current.email,
            subject: userInfo.current.subject,
            sectorId: userInfo.current.sectorId,
            sectorName: userInfo.current.sectorName,
            status: 'Pendente',
            createdAt: serverTimestamp(),
            lastMessageAt: serverTimestamp(),
            messages: initialMessages,
            // Include user ID if logged in
            ...(user && { clientId: user.uid })
        });
        setConversationId(docRef.id);
        if (!user) { // Only set for guest users
            localStorage.setItem('activeConversationId', docRef.id);
        }
    } catch (error) {
        console.error("Error creating conversation: ", error);
        toast({
            title: "Erro de Comunicação",
            description: "Não foi possível criar o chamado. Por favor, tente novamente mais tarde.",
            variant: "destructive"
        })
    }
  }

  const processSimulatedConversation = async (userMessage: string) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1200));
    let nextStep: ConversationStep = conversationStep;

    switch(conversationStep) {
        case 'GREETING':
            userInfo.current.name = userMessage;
            addMessage('ai', `Obrigada, ${userMessage}! Qual é o seu melhor e-mail?`);
            nextStep = 'AWAITING_EMAIL';
            break;
        case 'AWAITING_EMAIL':
            userInfo.current.email = userMessage;
            addMessage('ai', 'Anotado! Agora, por favor, me diga qual é o assunto principal do seu contato.');
            nextStep = 'AWAITING_SUBJECT';
            break;
        case 'AWAITING_SUBJECT':
            const sectorList = sectors.map(s => s.name).join(', ');
            if (user) {
                userInfo.current.name = user.displayName || 'Usuário Logado';
                userInfo.current.email = user.email || 'Email não disponível';
            }
            userInfo.current.subject = userMessage;
            addMessage('ai', `Compreendi. Para agilizar seu atendimento, para qual dos nossos setores devo direcionar sua solicitação?\n\nSetores disponíveis: ${sectorList}.`);
            nextStep = 'AWAITING_SECTOR';
            break;
        case 'AWAITING_SECTOR':
            const selectedSector = sectors.find(s => userMessage.toLowerCase().includes(s.name.toLowerCase()));
            if (selectedSector) {
                userInfo.current.sectorId = selectedSector.id;
                userInfo.current.sectorName = selectedSector.name;
                addMessage('ai', `Perfeito, obrigada! Seu chamado sobre "${userInfo.current.subject}" foi criado e transferido para o setor **${selectedSector.name}**. Por favor, aguarde que um de nossos atendentes responderá em breve.`);
                await createConversationInFirestore();
                nextStep = 'IN_PROGRESS';
            } else {
                 addMessage('ai', `Desculpe, não consegui identificar o setor. Por favor, digite um dos seguintes setores: ${sectors.map(s => s.name).join(', ')}.`);
                 nextStep = 'AWAITING_SECTOR';
            }
            break;
        default:
            nextStep = 'IN_PROGRESS';
            break;
    }
    setConversationStep(nextStep);
    setIsLoading(false);
  };


  const handleSend = async () => {
    if (input.trim() === '' || isLoading) return;
    
    const userMessageText = input;
    addMessage('user', userMessageText);
    setInput('');

    if(conversationStep === 'DONE') {
        startNewConversation(!!user);
        return;
    }
    
    if (conversationId) {
        const conversationRef = doc(db, 'conversations', conversationId);
        const newMessage: Message = { sender: 'user', text: userMessageText };
        await updateDoc(conversationRef, {
            messages: arrayUnion(newMessage),
            lastMessageAt: serverTimestamp(),
        });
    } else {
        await processSimulatedConversation(userMessageText);
    }
  };
  
  const handleOpen = () => {
    if (!isOpen) {
      if (isInitialized && !conversationId) {
          startNewConversation(!!user);
      }
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const isOnline = conversationStatus === 'Em Atendimento';

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          className="h-16 w-16 rounded-full shadow-lg"
          onClick={handleOpen}
        >
          <MessageSquare className="h-8 w-8" />
          <span className="sr-only">Abrir chat</span>
        </Button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col"
          >
            <div className="flex-1 flex items-center justify-center p-2 sm:p-4">
            <Card className="w-full h-full max-w-2xl shadow-2xl flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between bg-primary text-primary-foreground p-4 rounded-t-lg">
                <div className="flex items-center gap-3">
                   <div className="relative">
                      <Avatar>
                        <AvatarFallback>
                           {assigneeName ? assigneeName[0].toUpperCase() : <Bot className="h-6 w-6" />}
                        </AvatarFallback>
                      </Avatar>
                      <span className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-primary ${isOnline ? 'bg-green-400' : 'bg-gray-500'}`} />
                   </div>
                    <div>
                        <CardTitle className="text-lg">{assigneeName || 'Delvi'}</CardTitle>
                        <CardDescription className="text-primary-foreground/80 text-xs">
                           {isOnline ? 'Online' : 'Nossa equipe responderá em breve.'}
                        </CardDescription>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="text-primary-foreground h-8 w-8" onClick={() => setIsOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </CardHeader>
              <CardContent className="p-4 flex-1 overflow-hidden">
                <ScrollArea className="h-full" ref={scrollAreaRef}>
                    <div className="space-y-4 pr-4">
                    {messages.map((message, index) => (
                        <div key={index} className={`flex items-end gap-2 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                           {message.sender !== 'user' && (
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback>
                                        {message.sender === 'admin' && assigneeName ? assigneeName[0].toUpperCase() : <Bot className="h-5 w-5" />}
                                    </AvatarFallback>
                                </Avatar>
                           )}
                           <div className={`rounded-lg px-3 py-2 max-w-[80%] text-sm break-words ${message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                {message.text.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                           </div>
                            {message.sender === 'user' && (
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback><User className="h-5 w-5"/></AvatarFallback>
                                </Avatar>
                           )}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-end gap-2 justify-start">
                             <Avatar className="h-8 w-8">
                                <AvatarFallback><Bot className="h-5 w-5" /></AvatarFallback>
                            </Avatar>
                            <div className="rounded-lg px-3 py-2 bg-muted flex items-center gap-1">
                                <LogoSpinner className='w-4 h-4 text-foreground/50' />
                            </div>
                        </div>
                    )}
                    </div>
                </ScrollArea>
              </CardContent>
              <CardFooter className="p-2 border-t">
                 <div className="flex items-center w-full gap-2">
                    <Input 
                        placeholder="Digite sua mensagem..." 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        disabled={isLoading || (conversationStep === 'DONE' && !conversationId)}
                    />
                    <Button onClick={handleSend} size="icon" className='shrink-0' disabled={isLoading}>
                        {isLoading ? <LogoSpinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                    </Button>
                 </div>
              </CardFooter>
            </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
