
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { useRouter } from 'next/navigation';
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
      if (user) {
        setUser(user);
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        const isAdminUser = user.email === 'admin@delvind.com';
        const isCollaboratorUser = userDoc.exists() && userDoc.data().role === 'collaborator';
        
        setIsAdmin(isAdminUser);
        setIsCollaborator(isCollaboratorUser);
      } else {
        setUser(null);
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
      {loading ? <FullScreenLoader /> : children}
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

    useEffect(() => {
        if (loading) return;
        if (!user) {
            router.replace('/login');
            return;
        }
        
        const isCorrectRole = (adminOnly && isAdmin) || (collaboratorOnly && isCollaborator) || (!adminOnly && !collaboratorOnly);

        if (adminOnly && !isAdmin) {
             router.replace(isCollaborator ? '/collaborator' : '/dashboard');
        } else if (collaboratorOnly && !isCollaborator) {
             router.replace(isAdmin ? '/admin' : '/dashboard');
        }

    }, [user, loading, isAdmin, isCollaborator, adminOnly, collaboratorOnly, router]);
    
    if (loading || !user) {
        return <FullScreenLoader />;
    }

    // Check role access
    if (adminOnly && !isAdmin) return <FullScreenLoader />;
    if (collaboratorOnly && !isCollaborator) return <FullScreenLoader />;


    return <>{children}</>;
};

// Componente para páginas que não devem ser acessadas se o usuário já estiver logado
export const UnprotectedRoute: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user, loading, isAdmin, isCollaborator } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;

        if (user) {
            if (isAdmin) router.replace('/admin');
            else if (isCollaborator) router.replace('/collaborator');
            else router.replace('/dashboard');
        }
    }, [user, loading, isAdmin, isCollaborator, router]);

    if (loading || user) {
        return <FullScreenLoader />;
    }

    return <>{children}</>;
};
