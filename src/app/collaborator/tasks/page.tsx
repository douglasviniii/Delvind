
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
import { PlusCircle, MoreHorizontal, CalendarIcon, Trash2, Briefcase, ChevronLeft, ChevronRight, ListTodo } from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, orderBy, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../../context/auth-context';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, addMonths, subMonths, isSameDay, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../../../components/ui/dropdown-menu';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

const personalTaskSchema = z.object({
  title: z.string().min(3, { message: 'O título da tarefa é obrigatório.' }),
  description: z.string().optional(),
  dueDate: z.date({
    required_error: "A data de vencimento é obrigatória.",
  }),
});

type Task = {
  id: string;
  title: string;
  description?: string;
  assigneeId?: string;
  assigneeName?: string;
  authorId?: string;
  status: 'Pendente' | 'Em Andamento' | 'Revisão' | 'Finalizada';
  createdAt: any;
  dueDate: any;
  isAppointment?: boolean;
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

export default function CollaboratorTasksPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Status | 'Todas'>('Todas');
  
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const form = useForm<z.infer<typeof personalTaskSchema>>({
    resolver: zodResolver(personalTaskSchema),
    defaultValues: { title: '', description: '', dueDate: new Date() },
  });

   useEffect(() => {
    if (!user) return;

    const assignedTasksQuery = query(collection(db, 'tasks'), where('assigneeId', '==', user.uid), orderBy('dueDate', 'asc'));
    const appointmentsQuery = query(collection(db, 'appointments'), where('attendeeId', '==', user.uid), orderBy('meetingTime', 'asc'));

    const unsubAssigned = onSnapshot(assignedTasksQuery, (assignedSnap) => {
        const assignedTasks = assignedSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
        
        const unsubAppointments = onSnapshot(appointmentsQuery, (appSnap) => {
            const appointments = appSnap.docs.map(docSnap => {
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
                    isAppointment: true
                } as Task;
            });
            
            const allItems = [...assignedTasks, ...appointments];
            setTasks(allItems.sort((a, b) => (a.dueDate?.toMillis() || 0) - (b.dueDate?.toMillis() || 0)));
        });
        return unsubAppointments;
    });

    return () => {
        unsubAssigned();
    };
  }, [user]);

   const filteredTasks = useMemo(() => {
    if (statusFilter === 'Todas') {
      return tasks;
    }
    return tasks.filter(task => task.status === statusFilter);
  }, [tasks, statusFilter]);

  const tasksByDay = useMemo(() => {
    const today = startOfToday();
    return filteredTasks.reduce((acc, task) => {
        if (!task.dueDate?.toDate) return acc;
        const taskDate = task.dueDate.toDate();
        if (taskDate < today && !isSameDay(taskDate, today)) return acc;
        const dateStr = format(taskDate, 'yyyy-MM-dd');
        if (!acc[dateStr]) { acc[dateStr] = []; }
        acc[dateStr].push(task);
        return acc;
    }, {} as Record<string, Task[]>);
  }, [filteredTasks]);

   const groupedTasks = Object.entries(tasksByDay).sort((a,b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

  const handleStatusChange = async (taskId: string, newStatus: Status, isAppointment: boolean) => {
    if(isAppointment) return;
    await updateDoc(doc(db, 'tasks', taskId), { status: newStatus });
    toast({ title: 'Status Atualizado' });
  };

  const handleDeleteTask = async (taskId: string, authorId: string | undefined, isAppointment: boolean) => {
    if (isAppointment) {
        toast({ title: 'Ação não permitida', description: 'Você não pode excluir reuniões agendadas.', variant: 'destructive' });
        return;
    }
    if (authorId !== user?.uid) {
        toast({ title: 'Ação não permitida', description: 'Você não pode excluir tarefas atribuídas por um administrador.', variant: 'destructive' });
        return;
    }
    if (window.confirm('Tem certeza que deseja excluir esta tarefa?')) {
        await deleteDoc(doc(db, 'tasks', taskId));
        toast({ title: 'Tarefa Excluída' });
    }
  };

  const onPersonalSubmit = async (values: z.infer<typeof personalTaskSchema>) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
        await addDoc(collection(db, 'tasks'), {
            ...values,
            authorId: user.uid,
            assigneeId: user.uid,
            assigneeName: user.displayName,
            status: 'Pendente',
            createdAt: serverTimestamp(),
        });
        toast({ title: 'Tarefa Pessoal Criada!' });
        form.reset();
        setIsTaskModalOpen(false);
    } catch (error) {
        toast({ title: 'Erro ao Criar Tarefa', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-end mb-6">
         <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
            <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2 h-4 w-4" /> Criar Tarefa Pessoal</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Nova Tarefa Pessoal</DialogTitle>
                    <DialogDescription>Esta tarefa é para sua organização pessoal.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onPersonalSubmit)} className="space-y-4 py-4">
                         <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Título</FormLabel><FormControl><Input placeholder="Título da tarefa" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea placeholder="Descreva os detalhes da tarefa..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="dueDate" render={({ field }) => (<FormItem className='flex flex-col'><FormLabel>Data de Vencimento</FormLabel><Popover><PopoverTrigger asChild><FormControl>
                                <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? (format(field.value, "PPP", { locale: ptBR })) : (<span>Escolha uma data</span>)}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)}/>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsTaskModalOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Criando...' : 'Criar Tarefa'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
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
                        <CardTitle>Próximos Compromissos</CardTitle>
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
                        {groupedTasks.length > 0 ? groupedTasks.map(([date, tasks], index) => (
                            <div key={date}>
                                <h3 className="text-lg font-semibold mb-2 capitalize">{format(new Date(date.replace(/-/g, '/')), "EEEE, dd 'de' MMMM", { locale: ptBR })}</h3>
                                <div className='space-y-3'>
                                {tasks.map(task => (
                                     <Card key={task.id} className={cn("transition-all", task.isAppointment && 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800')}>
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
                                                    <DropdownMenuItem onClick={() => handleDeleteTask(task.id, task.authorId, !!task.isAppointment)} className="text-red-500 focus:bg-red-100 focus:text-red-600" disabled={!!task.isAppointment || (task.authorId !== user?.uid)}>
                                                        <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                            </CardTitle>
                                            <CardDescription>
                                                {task.isAppointment ? `com cliente` : `Para: ${task.assigneeName}`}
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
                        )) : <p className='text-sm text-center text-muted-foreground py-8'>Nenhuma tarefa ou reunião futura encontrada para este filtro.</p>}
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
    </div>
  );
}
