
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { useRouter, usePathname } from 'next/navigation';
import { LogoSpinner } from '../components/ui/logo-spinner';

type Sector = {
    id: string;
    name: string;
    password?: string;
    isLocked: boolean;
};

const defaultSectors: Sector[] = [
    { id: 'geral', name: 'Geral', isLocked: false },
    { id: 'financeiro', name: 'Financeiro', password: '', isLocked: true },
    { id: 'suporte', name: 'Suporte Dev', password: '', isLocked: true },
    { id: 'reclamacoes', name: 'Elogios e Reclamações', password: '', isLocked: true },
];

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isCollaborator: boolean;
  sectors: Sector[];
  selectedSector: string;
  setSelectedSector: (sector: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const FullScreenLoader = () => (
    <div className="flex items-center justify-center min-h-screen bg-background">
       <div className="fixed inset-0 -z-10 bg-gradient-to-br from-white via-pink-100 to-blue-200" />
        <LogoSpinner className="h-12 w-12 text-primary" />
    </div>
);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCollaborator, setIsCollaborator] = useState(false);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [selectedSector, setSelectedSector] = useState<string>('geral');

  const handleSetSelectedSector = (sector: string) => {
    setSelectedSector(sector);
    if (typeof window !== 'undefined') {
        localStorage.setItem('selectedAdminSector', sector);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const savedSector = localStorage.getItem('selectedAdminSector');
        if (savedSector) {
            setSelectedSector(savedSector);
        }
    }
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        const isAdminUser = user.email === 'admin@delvind.com';
        const isCollaboratorUser = userDoc.exists() && userDoc.data().role === 'collaborator';
        
        setIsAdmin(isAdminUser);
        setIsCollaborator(isCollaboratorUser);
      } else {
        setIsAdmin(false);
        setIsCollaborator(false);
      }
      setLoading(false);
    });

    const settingsDocRef = doc(db, 'app_settings', 'chat_sectors');
    const unsubscribeSectors = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().sectors) {
        setSectors(docSnap.data().sectors);
      } else {
        setSectors(defaultSectors);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSectors();
    };
  }, []);

  const value = { user, loading, isAdmin, isCollaborator, sectors, selectedSector, setSelectedSector: handleSetSelectedSector };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Componente para proteger rotas que exigem autenticação
export const ProtectedRoute: React.FC<{ children: ReactNode; adminOnly?: boolean; collaboratorOnly?: boolean; }> = ({ children, adminOnly = false, collaboratorOnly = false }) => {
    const { user, loading, isAdmin, isCollaborator } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        if (loading) {
            return; // Aguarda a verificação de autenticação terminar
        }

        // Se não há usuário, redireciona para o login
        if (!user) {
            router.replace('/login');
            return;
        }

        // Se a rota é apenas para admin, e o usuário não é admin, redireciona
        if (adminOnly && !isAdmin) {
            router.replace('/dashboard');
            return;
        }

        // Se a rota é apenas para colaborador, e o usuário não é colaborador, redireciona
        if (collaboratorOnly && !isCollaborator) {
            router.replace('/dashboard');
            return;
        }
        
        // Regra geral de acesso aos painéis
        const isTryingAdmin = pathname.startsWith('/admin');
        const isTryingCollaborator = pathname.startsWith('/collaborator');
        
        if (isTryingAdmin && !isAdmin) {
             router.replace('/dashboard');
             return;
        }

        if(isTryingCollaborator && !isCollaborator && !isAdmin) {
            router.replace('/dashboard');
            return;
        }

        // Se passou em todas as verificações, o usuário está autorizado
        setIsAuthorized(true);

    }, [user, loading, isAdmin, isCollaborator, router, pathname, adminOnly, collaboratorOnly]);


    if (!isAuthorized) {
        return <FullScreenLoader />;
    }

    return <>{children}</>;
};

// Componente para páginas que não devem ser acessadas se o usuário já estiver logado
export const UnprotectedRoute: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user, loading, isAdmin, isCollaborator } = useAuth();
    const router = useRouter();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        if (loading) {
            return; // Não faz nada enquanto carrega
        }
        if (user) {
            if (isAdmin) {
                router.replace('/admin');
            } else if (isCollaborator) {
                router.replace('/collaborator');
            } else {
                router.replace('/dashboard');
            }
        } else {
            // Se não há usuário, a verificação terminou e pode mostrar o conteúdo
            setIsChecking(false);
        }
    }, [user, loading, isAdmin, isCollaborator, router]);


    if (isChecking) {
        return <FullScreenLoader />;
    }

    return <>{children}</>;
};
