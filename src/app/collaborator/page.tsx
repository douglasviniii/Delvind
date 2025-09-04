
'use client';

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { useAuth } from "../../context/auth-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, FileCheck, Hourglass, ListChecks, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";

type Task = {
  id: string;
  status: 'Pendente' | 'Em Andamento' | 'Revisão' | 'Finalizada';
};

type TaskStats = {
  pendente: number;
  emAndamento: number;
  revisao: number;
  finalizada: number;
};

const StatCard = ({ title, value, icon, isLoading }: { title: string, value: number, icon: React.ReactNode, isLoading: boolean }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-1/2" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
);


export default function CollaboratorDashboardPage() {
  const { user } = useAuth();
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  
  const [assignedTasksStats, setAssignedTasksStats] = useState<TaskStats>({ pendente: 0, emAndamento: 0, revisao: 0, finalizada: 0 });
  const [createdTasksStats, setCreatedTasksStats] = useState<TaskStats>({ pendente: 0, emAndamento: 0, revisao: 0, finalizada: 0 });


  useEffect(() => {
    if (user) {
        const checkProfile = async () => {
            const userDocRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (!data.workCard) {
                    setProfileIncomplete(true);
                }
            } else {
                setProfileIncomplete(true);
            }
        }
        checkProfile();
        
        setLoadingStats(true);

        // Listener for tasks assigned TO me
        const assignedQuery = query(collection(db, 'tasks'), where('assigneeId', '==', user.uid));
        const unsubAssigned = onSnapshot(assignedQuery, (snapshot) => {
            const stats: TaskStats = { pendente: 0, emAndamento: 0, revisao: 0, finalizada: 0 };
            snapshot.forEach(doc => {
                const task = doc.data() as Task;
                if(task.status === 'Pendente') stats.pendente++;
                if(task.status === 'Em Andamento') stats.emAndamento++;
                if(task.status === 'Revisão') stats.revisao++;
                if(task.status === 'Finalizada') stats.finalizada++;
            });
            setAssignedTasksStats(stats);
        });
        
        // Listener for tasks created BY me
        const createdQuery = query(collection(db, 'tasks'), where('authorId', '==', user.uid));
        const unsubCreated = onSnapshot(createdQuery, (snapshot) => {
             const stats: TaskStats = { pendente: 0, emAndamento: 0, revisao: 0, finalizada: 0 };
            snapshot.forEach(doc => {
                const task = doc.data() as Task;
                if(task.status === 'Pendente') stats.pendente++;
                if(task.status === 'Em Andamento') stats.emAndamento++;
                if(task.status === 'Revisão') stats.revisao++;
                if(task.status === 'Finalizada') stats.finalizada++;
            });
            setCreatedTasksStats(stats);
             setLoadingStats(false);
        });


        return () => {
            unsubAssigned();
            unsubCreated();
        };

    }
  }, [user]);

  return (
    <main className="flex-1 space-y-6">
       {profileIncomplete && (
        <Alert className="bg-card border-primary">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Pendências no seu perfil!</AlertTitle>
          <AlertDescription>
            Seu perfil de colaborador está incompleto. Por favor, <Link href="/collaborator/profile" className="font-bold hover:underline">clique aqui</Link> para preencher seus dados e ter acesso a todos os recursos.
          </AlertDescription>
        </Alert>
      )}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard do Colaborador</h1>
        <p className="text-muted-foreground">Bem-vindo, {user?.displayName || user?.email}!</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tarefas Atribuídas a Mim</CardTitle>
          <CardDescription>Visão geral das tarefas que você precisa executar.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Pendentes" value={assignedTasksStats.pendente} icon={<Hourglass className="h-4 w-4 text-muted-foreground" />} isLoading={loadingStats} />
            <StatCard title="Em Andamento" value={assignedTasksStats.emAndamento} icon={<Loader2 className="h-4 w-4 text-muted-foreground" />} isLoading={loadingStats} />
            <StatCard title="Em Revisão" value={assignedTasksStats.revisao} icon={<ListChecks className="h-4 w-4 text-muted-foreground" />} isLoading={loadingStats} />
            <StatCard title="Finalizadas" value={assignedTasksStats.finalizada} icon={<FileCheck className="h-4 w-4 text-muted-foreground" />} isLoading={loadingStats} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tarefas Criadas por Mim</CardTitle>
          <CardDescription>Acompanhe o status das tarefas que você criou e delegou.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
             <StatCard title="Pendentes" value={createdTasksStats.pendente} icon={<Hourglass className="h-4 w-4 text-muted-foreground" />} isLoading={loadingStats} />
            <StatCard title="Em Andamento" value={createdTasksStats.emAndamento} icon={<Loader2 className="h-4 w-4 text-muted-foreground" />} isLoading={loadingStats} />
            <StatCard title="Em Revisão" value={createdTasksStats.revisao} icon={<ListChecks className="h-4 w-4 text-muted-foreground" />} isLoading={loadingStats} />
            <StatCard title="Finalizadas" value={createdTasksStats.finalizada} icon={<FileCheck className="h-4 w-4 text-muted-foreground" />} isLoading={loadingStats} />
        </CardContent>
      </Card>
      
    </main>
  );
}
