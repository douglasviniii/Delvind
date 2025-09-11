
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from "firebase/firestore";
import { useRouter, usePathname } from 'next/navigation';
import { Skeleton } from '../components/ui/skeleton';

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

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  isCollaborator: false,
  sectors: [],
  selectedSector: 'geral',
  setSelectedSector: () => {},
});

const AuthProviderSkeleton = () => (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="space-y-4 w-full max-w-md p-4">
        <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
            </div>
        </div>
        <Skeleton className="h-40 w-full" />
        <div className="flex justify-end">
            <Skeleton className="h-10 w-24" />
        </div>
      </div>
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        const isAdminUser = user.email === 'admin@delvind.com';
        const isCollaboratorUser = userDoc.exists() && userDoc.data().role === 'collaborator';

        setUser(user);
        setIsAdmin(isAdminUser);
        setIsCollaborator(isCollaboratorUser);
      } else {
        setUser(null);
        setIsAdmin(false);
        setIsCollaborator(false);
      }
      setLoading(false);
    });

    const fetchSectors = async () => {
        const settingsDocRef = doc(db, 'app_settings', 'chat_sectors');
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists() && docSnap.data().sectors) {
            setSectors(docSnap.data().sectors);
        } else {
            setSectors(defaultSectors);
        }
    };
    fetchSectors();

    return () => unsubscribe();
  }, []);

  const value = { user, loading, isAdmin, isCollaborator, sectors, selectedSector, setSelectedSector: handleSetSelectedSector };

  return (
    <AuthContext.Provider value={value}>
      {loading ? <AuthProviderSkeleton /> : children}
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

const withProtection = (Component: React.ComponentType<any>, options: { adminOnly?: boolean; collaboratorOnly?: boolean; unprotected?: boolean }) => {
  return function ProtectedComponent(props: any) {
    const { user, loading, isAdmin, isCollaborator } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (loading || !isClient) return;

        const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password';

        if (options.unprotected) {
            if (user) {
                if (isAdmin) router.replace('/admin');
                else if (isCollaborator) router.replace('/collaborator');
                else router.replace('/dashboard');
            }
            return;
        }

        if (!user) {
            if (!isAuthPage) router.replace('/login');
            return;
        }

        if (options.adminOnly && !isAdmin) {
             router.replace(isCollaborator ? '/collaborator' : '/dashboard');
        } else if (options.collaboratorOnly && !isCollaborator) {
             router.replace(isAdmin ? '/admin' : '/dashboard');
        } else if (!options.adminOnly && !options.collaboratorOnly && (isAdmin || isCollaborator)) {
            // This is for the customer dashboard
            router.replace(isAdmin ? '/admin' : '/collaborator');
        }

    }, [user, loading, isClient, isAdmin, isCollaborator, router, pathname]);

    if (loading) {
        return <AuthProviderSkeleton />;
    }

    if (options.unprotected && user) {
        return <AuthProviderSkeleton />;
    }

    if (!options.unprotected && !user) {
        return <AuthProviderSkeleton />;
    }

    // Render the component if authorization checks pass
    return <Component {...props} />;
  };
};

export const ProtectedRoute: React.FC<{ children: ReactNode; adminOnly?: boolean; collaboratorOnly?: boolean; }> = ({ children, adminOnly = false, collaboratorOnly = false }) => {
    const { user, loading, isAdmin, isCollaborator } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;

        if (!user) {
            router.replace('/login');
            return;
        }
        
        if (adminOnly && !isAdmin) {
            router.replace('/dashboard'); // Or a dedicated access-denied page
        } else if (collaboratorOnly && !isCollaborator) {
            router.replace('/dashboard');
        }

    }, [user, loading, isAdmin, isCollaborator, adminOnly, collaboratorOnly, router]);

    if (loading || !user || (adminOnly && !isAdmin) || (collaboratorOnly && !isCollaborator)) {
        return <AuthProviderSkeleton />;
    }

    return <>{children}</>;
};

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
        return <AuthProviderSkeleton />;
    }

    return <>{children}</>;
};
