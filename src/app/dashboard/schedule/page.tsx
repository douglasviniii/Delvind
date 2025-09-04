
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { useToast } from '../../../hooks/use-toast';
import { db } from '../../../lib/firebase';
import { PlusCircle, CalendarIcon, MoreHorizontal, ChevronLeft, ChevronRight, Briefcase } from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { useAuth } from '../../../context/auth-context';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, addMonths, subMonths, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

const appointmentSchema = z.object({
  attendeeId: z.string().min(1, 'Você deve selecionar um profissional.'),
  subject: z.string().min(5, 'O assunto é obrigatório.'),
  meetingDate: z.date({
    required_error: "A data da reunião é obrigatória.",
  }),
  meetingTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido (HH:MM)."),
});

type Attendee = {
  uid: string;
  displayName: string;
};

type Appointment = {
    id: string;
    subject: string;
    attendeeName: string;
    meetingTime: any;
    status: 'Agendada' | 'Realizada' | 'Cancelada';
};

type Status = 'Agendada' | 'Realizada' | 'Cancelada' | 'Todas';

export default function SchedulePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<Status | 'Todas'>('Todas');

  const form = useForm<z.infer<typeof appointmentSchema>>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: { subject: '', attendeeId: '', meetingDate: new Date(), meetingTime: '09:00' },
  });

  useEffect(() => {
    const fetchAttendees = async () => {
        try {
            const q = query(collection(db, 'users'), where('role', 'in', ['admin', 'collaborator']));
            const querySnapshot = await getDocs(q);
            setAttendees(querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Attendee)));
        } catch(error) {
            toast({ title: 'Erro ao buscar profissionais', variant: 'destructive'});
        }
    };
    fetchAttendees();

    if(user) {
        const appointmentsQuery = query(collection(db, 'appointments'), where('clientId', '==', user.uid));
        const unsubscribe = onSnapshot(appointmentsQuery, (snapshot) => {
            setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));
        });
        return () => unsubscribe();
    }
  }, [user, toast]);

  const appointmentsByDay = useMemo(() => {
    return appointments.reduce((acc, app) => {
        if (!app.meetingTime?.toDate) return acc;
        const dateStr = format(app.meetingTime.toDate(), 'yyyy-MM-dd');
        if (!acc[dateStr]) { acc[dateStr] = []; }
        acc[dateStr].push(app);
        return acc;
    }, {} as Record<string, Appointment[]>);
  }, [appointments]);

  const selectedDateAppointments = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const dayAppointments = appointmentsByDay[dateStr] || [];
    if (activeTab === 'Todas') {
        return dayAppointments;
    }
    return dayAppointments.filter(app => app.status === activeTab);
  }, [selectedDate, appointmentsByDay, activeTab]);

  const onSubmit = async (values: z.infer<typeof appointmentSchema>) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
        const attendee = attendees.find(a => a.uid === values.attendeeId);
        if (!attendee) {
            toast({ title: 'Profissional não encontrado', variant: 'destructive'});
            setIsSubmitting(false);
            return;
        }

        const meetingDateTime = new Date(values.meetingDate);
        const [hours, minutes] = values.meetingTime.split(':').map(Number);
        meetingDateTime.setHours(hours, minutes);

        await addDoc(collection(db, 'appointments'), {
            clientId: user.uid,
            clientName: user.displayName,
            attendeeId: values.attendeeId,
            attendeeName: attendee.displayName,
            subject: values.subject,
            meetingTime: meetingDateTime,
            status: 'Agendada',
            createdAt: serverTimestamp(),
        });
        toast({ title: 'Reunião Agendada!', description: `Sua reunião com ${attendee.displayName} foi confirmada.` });
        form.reset();
        setIsModalOpen(false);
    } catch (error) {
        toast({ title: 'Erro ao agendar', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  }
  
  const renderAppointmentList = (apps: Appointment[]) => (
     <div className='space-y-3'>
        {apps.length > 0 ? apps.map(app => (
             <Card key={app.id}>
                <CardHeader className='p-4'>
                    <CardTitle className='text-base flex items-center justify-between gap-2'>
                        <div className='flex items-center gap-2'>
                            <Briefcase className='w-4 h-4 text-primary'/>
                            {app.subject}
                        </div>
                         <Button variant="ghost" size="icon" className='h-6 w-6'><MoreHorizontal className='w-4 h-4'/></Button>
                    </CardTitle>
                    <CardDescription>
                        Com {app.attendeeName} às {format(app.meetingTime.toDate(), 'HH:mm')}
                    </CardDescription>
                </CardHeader>
                <CardContent className='p-4 pt-0'>
                    <span className="text-sm font-medium text-muted-foreground">{app.status}</span>
                </CardContent>
            </Card>
        )) : <p className='text-sm text-center text-muted-foreground py-8'>Nenhuma reunião encontrada para este filtro.</p>}
    </div>
  )
  
  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setIsDayModalOpen(true);
  }

  return (
    <div className="flex flex-col h-full">
        <div className="flex items-center justify-end mb-6">
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                    <Button><PlusCircle className="mr-2 h-4 w-4" /> Nova Reunião</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Agendar Nova Reunião</DialogTitle>
                        <DialogDescription>Preencha os detalhes abaixo para marcar sua reunião.</DialogDescription>
                    </DialogHeader>
                     <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                            <FormField control={form.control} name="attendeeId" render={({ field }) => (
                                <FormItem><FormLabel>Com quem você gostaria de falar?</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione um profissional" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {attendees.map(a => <SelectItem key={a.uid} value={a.uid}>{a.displayName}</SelectItem>)}
                                    </SelectContent></Select><FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="subject" render={({ field }) => (
                                <FormItem><FormLabel>Assunto da Reunião</FormLabel><FormControl><Textarea placeholder="Descreva brevemente sobre o que você gostaria de conversar" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="meetingDate" render={({ field }) => (
                                    <FormItem className="flex flex-col"><FormLabel>Data</FormLabel><Popover><PopoverTrigger asChild><FormControl>
                                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl></PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                                    </Popover><FormMessage />
                                    </FormItem>
                                )}/>
                                 <FormField control={form.control} name="meetingTime" render={({ field }) => (
                                    <FormItem><FormLabel>Horário</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                            <DialogFooter className="pt-4">
                                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Agendando...' : 'Confirmar Agendamento'}</Button>
                            </DialogFooter>
                        </form>
                     </Form>
                </DialogContent>
            </Dialog>
        </div>
        
         <Dialog open={isDayModalOpen} onOpenChange={setIsDayModalOpen}>
            <DialogContent className="max-w-xl max-h-[80vh] flex flex-col">
                <DialogHeader className="flex-none">
                    <DialogTitle>Compromissos para {format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto pr-4 -mr-4">
                  {renderAppointmentList(selectedDateAppointments)}
                </div>
            </DialogContent>
        </Dialog>

        {/* Mobile View: Tabs */}
        <div className='lg:hidden'>
            <Tabs defaultValue="calendar">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="calendar">Calendário</TabsTrigger>
                    <TabsTrigger value="agenda">Agenda do Dia</TabsTrigger>
                </TabsList>
                <TabsContent value="calendar" className="mt-4">
                    <Card>
                        <CardHeader className='flex flex-row items-center justify-between'>
                            <CardTitle className='capitalize'>{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</CardTitle>
                            <div className='flex items-center gap-2'>
                                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className='w-4 h-4'/></Button>
                                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className='w-4 h-4'/></Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Calendar
                                mode="single"
                                onSelect={(day) => day && handleDayClick(day)}
                                month={currentMonth}
                                onMonthChange={setCurrentMonth}
                                locale={ptBR}
                                className="p-3 w-full"
                                classNames={{
                                    cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 cursor-pointer",
                                    day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
                                }}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="agenda" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Agenda do Dia</CardTitle>
                            <CardDescription>{format(new Date(), "PPP", { locale: ptBR })}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto">
                            {renderAppointmentList(appointmentsByDay[format(new Date(), 'yyyy-MM-dd')] || [])}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
        
        {/* Desktop View: Grid */}
        <div className="hidden lg:grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6 flex-1">
            <Card className="h-full flex flex-col">
                <CardHeader className='flex flex-row items-center justify-between'>
                    <CardTitle className='capitalize'>{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</CardTitle>
                    <div className='flex items-center gap-2'>
                         <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className='w-4 h-4'/></Button>
                         <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className='w-4 h-4'/></Button>
                    </div>
                </CardHeader>
                <CardContent className="flex-1">
                    <Calendar
                        mode="single"
                        onSelect={(day) => day && handleDayClick(day)}
                        month={currentMonth}
                        onMonthChange={setCurrentMonth}
                        locale={ptBR}
                        className="p-0 h-full w-full"
                         classNames={{
                           months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 h-full",
                           month: "space-y-4 h-full flex flex-col",
                           table: "w-full border-collapse space-y-1 flex-1",
                           head_row: "flex",
                           head_cell: "text-muted-foreground rounded-md w-full font-normal text-[0.8rem]",
                           row: "flex w-full mt-2",
                           cell: "h-full w-full text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 cursor-pointer",
                           day: "h-full w-full p-0 font-normal aria-selected:opacity-100",
                        }}
                    />
                </CardContent>
            </Card>
            <Card className='h-full flex flex-col'>
                <CardHeader>
                    <CardTitle>Agenda do Dia</CardTitle>
                    <CardDescription>{format(new Date(), "PPP", { locale: ptBR })}</CardDescription>
                </CardHeader>
                 <CardContent className="flex-1 overflow-y-auto">
                     <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as Status | 'Todas')}>
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="Todas">Todas</TabsTrigger>
                            <TabsTrigger value="Agendada">Agendadas</TabsTrigger>
                            <TabsTrigger value="Realizada">Realizadas</TabsTrigger>
                            <TabsTrigger value="Cancelada">Canceladas</TabsTrigger>
                        </TabsList>
                         <TabsContent value={activeTab} className="mt-4">
                           {renderAppointmentList(appointmentsByDay[format(new Date(), 'yyyy-MM-dd')] || [])}
                         </TabsContent>
                     </Tabs>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
