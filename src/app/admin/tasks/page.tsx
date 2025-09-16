
'use client';

import { useState, useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '../../../components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../../components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { useToast } from '../../../hooks/use-toast';
import { db } from '../../../lib/firebase';
import { PlusCircle, MoreHorizontal, CalendarIcon, Trash2, Briefcase, ChevronLeft, ChevronRight, ListTodo, AlertTriangle } from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../../context/auth-context';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, addMonths, subMonths, isSameDay, startOfToday, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../../../components/ui/dropdown-menu';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

const taskSchema = z.object({
  title: z.string().min(3, { message: 'O título da tarefa é obrigatório.' }),
  description: z.string().optional(),
  assigneeId: z.string().min(1, "Você deve atribuir a tarefa a alguém."),
  dueDate: z.date({
    required_error: "A data de vencimento é obrigatória.",
  }),
});

const appointmentSchema = z.object({
  clientId: z.string().min(1, "Você deve selecionar um cliente."),
  attendeeId: z.string().min(1, "Você deve selecionar um participante."),
  subject: z.string().min(5, 'O assunto é obrigatório.'),
  meetingDate: z.date({
    required_error: "A data da reunião é obrigatória.",
  }),
  meetingTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido (HH:MM)."),
});

type User = {
  uid: string;
  displayName: string;
};

type Task = {
  id: string;
  title: string;
  description?: string;
  assigneeId?: string;
  assigneeName?: string;
  status: 'Pendente' | 'Em Andamento' | 'Revisão' | 'Finalizada';
  createdAt: any;
  dueDate: any;
  isAppointment?: boolean;
  clientName?: string;
  authorId?: string;
};

type Status = 'Pendente' | 'Em Andamento' | 'Revisão' | 'Finalizada';
const statusList: Status[] = ['Pendente', 'Em Andamento', 'Revisão', 'Finalizada'];

const getStatusColor = (status: Status) => {
    switch (status) {
        case 'Pendente': return 'bg-yellow-500';
        case 'Em Andamento': return 'bg-blue-500';
        case 'Revisão': return 'bg-purple-500';
        case 'Finalizada': return 'bg-green-500';
        default: return 'bg-gray-500';
    }
}

export default function TasksPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [collaborators, setCollaborators] = useState<User[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commitmentType, setCommitmentType] = useState<'task' | 'appointment'>('task');
  const [statusFilter, setStatusFilter] = useState<Status | 'Todas'>('Todas');
  
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  const taskForm = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      assigneeId: "",
      dueDate: new Date(),
    },
  });
  
  const appointmentForm = useForm<z.infer<typeof appointmentSchema>>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      clientId: "",
      attendeeId: "",
      subject: "",
      meetingDate: new Date(),
      meetingTime: "09:00",
    },
  });

  useEffect(() => {
    if (!user) return;
    const collabsQuery = query(collection(db, 'users'), where('role', '==', 'collaborator'));
    const clientsQuery = query(collection(db, 'users'), where('role', '==', 'customer'));
    
    const unsubCollabs = onSnapshot(collabsQuery, (snapshot) => {
        setCollaborators(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User)));
    });
    
    const unsubClients = onSnapshot(clientsQuery, (snapshot) => {
        setClients(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User)));
    });

    const tasksQuery = query(collection(db, 'tasks'), orderBy('dueDate', 'asc'));
    const unsubTasks = onSnapshot(tasksQuery, (taskSnapshot) => {
        const tasksData = taskSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
        
        const appointmentsQuery = query(collection(db, 'appointments'), orderBy('meetingTime', 'asc'));
        const unsubAppointments = onSnapshot(appointmentsQuery, (appSnapshot) => {
            const appointmentsData = appSnapshot.docs.map(docSnap => {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    title: `Reunião: ${data.subject}`,
                    description: `Reunião com ${data.clientName}`,
                    assigneeId: data.attendeeId,
                    assigneeName: data.attendeeName,
                    status: data.status === 'Agendada' ? 'Pendente' : 'Finalizada',
                    createdAt: data.createdAt,
                    dueDate: data.meetingTime,
                    isAppointment: true,
                    clientName: data.clientName,
                } as Task;
            });
            
            const allItems = [...tasksData, ...appointmentsData];
            setAllTasks(allItems.sort((a,b) => (a.dueDate?.toMillis() || 0) - (b.dueDate?.toMillis() || 0)));
        });
        
        return () => unsubAppointments();
    }, (error) => {
        console.error("Error fetching tasks:", error);
    });

    return () => {
        unsubCollabs();
        unsubClients();
        unsubTasks();
    };
  }, [user]);

  const filteredTasks = useMemo(() => {
    if (statusFilter === 'Todas') {
      return allTasks;
    }
    return allTasks.filter(task => task.status === statusFilter);
  }, [allTasks, statusFilter]);

  const tasksByDay = useMemo(() => {
    return filteredTasks.reduce((acc, task) => {
        if (!task.dueDate) return acc;
        
        let taskDate: Date;
        if (task.dueDate instanceof Date) {
            taskDate = task.dueDate;
        } else if (task.dueDate.toDate) {
            taskDate = task.dueDate.toDate();
        } else {
            return acc;
        }
        
        const dateStr = format(taskDate, 'yyyy-MM-dd');
        if (!acc[dateStr]) { acc[dateStr] = []; }
        acc[dateStr].push(task);
        return acc;
    }, {} as Record<string, Task[]>);
  }, [filteredTasks]);
  
  const groupedTasks = Object.entries(tasksByDay).sort((a,b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

  const handleStatusChange = async (taskId: string, newStatus: Status, isAppointment: boolean) => {
    if (isAppointment) {
        toast({ title: "Ação não permitida", description: "O status de reuniões não pode ser alterado por aqui."});
        return;
    }
    await updateDoc(doc(db, 'tasks', taskId), { status: newStatus });
    toast({ title: 'Status da Tarefa Atualizado' });
  };
  
  const handleDeleteTask = async (taskId: string, isAppointment: boolean) => {
    if (window.confirm('Tem certeza que deseja excluir este item?')) {
        await deleteDoc(doc(db, isAppointment ? 'appointments' : 'tasks', taskId));
        toast({ title: 'Item Excluído' });
    }
  };

  const onTaskSubmit = async (values: z.infer<typeof taskSchema>) => {
     if(!user) return;
    setIsSubmitting(true);
    try {
        const assignee = [...collaborators, {uid: user.uid, displayName: 'Admin'}].find(c => c.uid === values.assigneeId);
        await addDoc(collection(db, 'tasks'), {
            title: values.title,
            description: values.description,
            assigneeId: values.assigneeId,
            assigneeName: assignee ? assignee.displayName : 'Admin',
            status: 'Pendente',
            authorId: user.uid,
            createdAt: serverTimestamp(),
            dueDate: values.dueDate,
        });
        toast({ title: 'Tarefa Criada!' });
        taskForm.reset();
        setIsModalOpen(false);
    } catch(e) {
        console.error('Erro ao criar tarefa:', e);
        toast({ title: 'Erro ao Criar Tarefa', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  }
  
  const onAppointmentSubmit = async (values: z.infer<typeof appointmentSchema>) => {
      if(!user) return;
      setIsSubmitting(true);
      try {
        const attendee = [...collaborators, {uid: user.uid, displayName: 'Admin'}].find(a => a.uid === values.attendeeId);
        const client = clients.find(c => c.uid === values.clientId);
        if (!attendee || !client) {
                toast({ title: 'Erro', description: 'Participante ou cliente inválido.', variant: 'destructive'});
                setIsSubmitting(false);
                return;
        }
        const meetingDateTime = new Date(values.meetingDate);
        const [hours, minutes] = values.meetingTime.split(':').map(Number);
        meetingDateTime.setHours(hours, minutes);

            await addDoc(collection(db, 'appointments'), {
            clientId: client.uid,
            clientName: client.displayName,
            attendeeId: attendee.uid,
            attendeeName: attendee.displayName,
            subject: values.subject,
            meetingTime: meetingDateTime,
            status: 'Agendada',
            createdAt: serverTimestamp(),
            });
            toast({ title: 'Reunião agendada com sucesso!' });
            appointmentForm.reset();
            setIsModalOpen(false);
      } catch(e) {
         console.error('Erro ao criar compromisso:', e);
         toast({ title: 'Erro ao Criar Compromisso', variant: 'destructive' });
      } finally {
        setIsSubmitting(false);
      }
  }
  
  return (
    <main>
        <div className="flex items-center justify-end mb-6">
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                    <Button><PlusCircle className="mr-2 h-4 w-4" /> Criar Compromisso</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Novo Compromisso</DialogTitle>
                        <DialogDescription>Crie uma tarefa para a equipe ou agende uma reunião com um cliente.</DialogDescription>
                    </DialogHeader>
                    
                    <RadioGroup defaultValue="task" className='flex gap-4' onValueChange={(value) => setCommitmentType(value as any)}>
                        <div className='flex items-center space-x-2'><RadioGroupItem value="task" id="task"/><label htmlFor='task'>Tarefa Interna</label></div>
                        <div className='flex items-center space-x-2'><RadioGroupItem value="appointment" id="appointment"/><label htmlFor='appointment'>Reunião com Cliente</label></div>
                    </RadioGroup>

                    {commitmentType === 'task' ? (
                       <Form {...taskForm}>
                        <form onSubmit={taskForm.handleSubmit(onTaskSubmit)} className="space-y-4 py-4">
                            <FormField control={taskForm.control} name="title" render={({ field }) => (<FormItem><FormLabel>Título</FormLabel><FormControl><Input placeholder="Título da tarefa" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={taskForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea placeholder="Descreva os detalhes da tarefa..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <div className='grid grid-cols-2 gap-4'>
                                <FormField control={taskForm.control} name="dueDate" render={({ field }) => (<FormItem className='flex flex-col'><FormLabel>Data de Vencimento</FormLabel><Popover><PopoverTrigger asChild><FormControl>
                                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                        {field.value ? (format(field.value, "PPP", { locale: ptBR })) : (<span>Escolha uma data</span>)}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)}/>
                                <FormField control={taskForm.control} name="assigneeId" render={({ field }) => (<FormItem><FormLabel>Atribuir a</FormLabel><Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione um colaborador" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value={user?.uid ?? 'admin'}>Admin (Eu)</SelectItem>
                                        {collaborators.map((col) => (<SelectItem key={col.uid} value={col.uid}>{col.displayName}</SelectItem>))}
                                    </SelectContent></Select><FormMessage /></FormItem>)} />
                            </div>
                             <DialogFooter className="pt-4">
                                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : 'Salvar Compromisso'}</Button>
                            </DialogFooter>
                        </form>
                       </Form>
                    ) : (
                       <Form {...appointmentForm}>
                         <form onSubmit={appointmentForm.handleSubmit(onAppointmentSubmit)} className="space-y-4 py-4">
                            <FormField control ={appointmentForm.control} name="clientId" render={({ field }) => (<FormItem><FormLabel>Cliente</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger></FormControl><SelectContent>{clients.map(c => <SelectItem key={c.uid} value={c.uid}>{c.displayName}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                            <FormField control ={appointmentForm.control} name="attendeeId" render={({ field }) => (<FormItem><FormLabel>Participante</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione o profissional" /></SelectTrigger></FormControl><SelectContent><SelectItem value={user?.uid ?? 'admin'}>Admin (Eu)</SelectItem>{collaborators.map(c => <SelectItem key={c.uid} value={c.uid}>{c.displayName}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                            <FormField control ={appointmentForm.control} name="subject" render={({ field }) => (<FormItem><FormLabel>Assunto</FormLabel><FormControl><Input placeholder="Assunto da reunião" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <div className='grid grid-cols-2 gap-4'>
                                <FormField control={appointmentForm.control} name="meetingDate" render={({ field }) => (<FormItem className='flex flex-col'><FormLabel>Data</FormLabel><Popover><PopoverTrigger asChild><FormControl>
                                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                        {field.value ? (format(field.value, "PPP", { locale: ptBR })) : (<span>Escolha uma data</span>)}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)}/>
                                <FormField control={appointmentForm.control} name="meetingTime" render={({ field }) => ( <FormItem><FormLabel>Horário</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                            <DialogFooter className="pt-4">
                                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : 'Salvar Compromisso'}</Button>
                            </DialogFooter>
                        </form>
                       </Form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
        
        <Tabs defaultValue="agenda">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="agenda">Agenda</TabsTrigger>
                <TabsTrigger value="calendar">Calendário</TabsTrigger>
            </TabsList>
            <TabsContent value="agenda" className="mt-4">
                <Card>
                    <CardHeader>
                        <div className="pt-2">
                            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                                <TabsList>
                                    <TabsTrigger value="Todas">Todas</TabsTrigger>
                                    <TabsTrigger value="Pendente">Pendentes</TabsTrigger>
                                    <TabsTrigger value="Em Andamento">Em Andamento</TabsTrigger>
                                    <TabsTrigger value="Revisão">Revisão</TabsTrigger>
                                    <TabsTrigger value="Finalizada">Finalizadas</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </CardHeader>
                    <CardContent className='space-y-6'>
                        {groupedTasks.length > 0 ? groupedTasks.map(([date, tasks], index) => {
                             const isOverdue = isPast(new Date(date)) && !isSameDay(new Date(date), new Date());
                            return (
                            <div key={date}>
                                <h3 className={cn("text-lg font-semibold mb-2 capitalize flex items-center gap-2", isOverdue && 'text-destructive')}>
                                   {isOverdue && <AlertTriangle className="h-5 w-5"/>}
                                   {format(new Date(date.replace(/-/g, '/')), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                                </h3>
                                <div className='space-y-3'>
                                {tasks.map(task => (
                                     <Card key={task.id} className={cn("transition-all", task.isAppointment && 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800', isOverdue && 'border-destructive/50')}>
                                        <CardHeader className='p-4 pb-2'>
                                            <CardTitle className='text-base flex items-center justify-between gap-2'>
                                            <div className='flex items-center gap-2'>
                                                {task.isAppointment ? <Briefcase className='w-4 h-4 text-orange-600'/> : <div className={cn("w-3 h-3 rounded-full", getStatusColor(task.status))} />}
                                                {task.title}
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className='h-6 w-6'><MoreHorizontal className='w-4 h-4'/></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onClick={() => handleDeleteTask(task.id, !!task.isAppointment)} className="text-red-500 focus:bg-red-100 focus:text-red-600">
                                                        <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                            </CardTitle>
                                            <CardDescription>
                                            {task.isAppointment ? `com ${task.clientName}` : `Para: ${task.assigneeName}`}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className='p-4 pt-0 text-sm text-muted-foreground'>
                                            {task.description}
                                        </CardContent>
                                        {!task.isAppointment && (
                                        <CardFooter className='p-4 pt-0'>
                                            <Select value={task.status} onValueChange={(newStatus) => handleStatusChange(task.id, newStatus as Status, !!task.isAppointment)}>
                                                <SelectTrigger><SelectValue/></SelectTrigger>
                                                <SelectContent>
                                                    {statusList.map(status => (
                                                        <SelectItem key={status} value={status}>{status}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </CardFooter>
                                        )}
                                    </Card>
                                ))}
                                </div>
                                {index < groupedTasks.length - 1 && <Separator className="mt-6" />}
                            </div>
                        )}) : <p className='text-sm text-center text-muted-foreground py-8'>Nenhuma tarefa ou reunião encontrada para este filtro.</p>}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="calendar" className="mt-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="capitalize">
                            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                    <Calendar
                       mode="single"
                       month={currentMonth}
                       onMonthChange={setCurrentMonth}
                       locale={ptBR}
                       className="p-3 w-full"
                       classNames={{
                           day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-full",
                           day_today: "bg-accent text-accent-foreground rounded-full"
                       }}
                       
                    />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </main>
  );
}
