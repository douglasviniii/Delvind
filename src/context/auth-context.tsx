
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
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
  rolesChecked: boolean;
  sectors: Sector[];
  selectedSector: string;
  setSelectedSector: (sector: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  isCollaborator: false,
  rolesChecked: false,
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


export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCollaborator, setIsCollaborator] = useState(false);
  const [rolesChecked, setRolesChecked] = useState(false);
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
  }, [])


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setRolesChecked(false);
      if (user) {
        setUser(user);
        const admin = user.email === 'admin@delvind.com';
        setIsAdmin(admin);

        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().role === 'collaborator') {
          setIsCollaborator(true);
        } else {
          setIsCollaborator(false);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        setIsCollaborator(false);
      }
      setRolesChecked(true);
      setLoading(false);
    });
    
    // Fetch chat sectors settings
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

  const value = { user, loading, isAdmin, isCollaborator, rolesChecked, sectors, selectedSector, setSelectedSector: handleSetSelectedSector };

  return (
    <AuthContext.Provider value={value}>
      {loading ? <AuthProviderSkeleton /> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export const ProtectedRoute = ({ children, adminOnly = false, collaboratorOnly = false }: { children: React.ReactNode, adminOnly?: boolean, collaboratorOnly?: boolean }) => {
    const { user, loading, isAdmin, isCollaborator, rolesChecked } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
      if (loading || !rolesChecked) return;
  
      if (!user) {
        router.push('/login');
        return;
      }
      
      let hasAccess = false;
      let redirectPath: string | null = null;
      
      // Special case: allow collaborators to access the admin chat page
      if (pathname.startsWith('/admin/chat') && (isAdmin || isCollaborator)) {
          hasAccess = true;
      } else if (adminOnly) {
          if (isAdmin) hasAccess = true;
          else redirectPath = isCollaborator ? '/collaborator' : '/dashboard';
      } else if (collaboratorOnly) {
          if (isCollaborator) hasAccess = true;
          else redirectPath = isAdmin ? '/admin' : '/dashboard';
      } else { // Just needs to be a logged-in customer
          if (!isAdmin && !isCollaborator) hasAccess = true;
          else redirectPath = isAdmin ? '/admin' : '/collaborator';
      }

      if (hasAccess) {
        setIsAuthorized(true);
      } else if (redirectPath) {
        router.push(redirectPath);
      }

    }, [user, loading, rolesChecked, adminOnly, collaboratorOnly, isAdmin, isCollaborator, pathname, router]);
  
    if (isAuthorized) {
        return <>{children}</>;
    }
    
    return <AuthProviderSkeleton />;
};

export const UnprotectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, loading, isAdmin, isCollaborator, rolesChecked } = useAuth();
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
      setIsClient(true);
    }, []);
  
    useEffect(() => {
        if (!isClient || loading || !rolesChecked) return;
  
        if (user) {
            if (isAdmin) {
                router.push('/admin');
            } else if (isCollaborator) {
                router.push('/collaborator');
            } else {
                router.push('/dashboard');
            }
        }
    }, [user, loading, rolesChecked, isAdmin, isCollaborator, isClient, router]);
  
    if (!isClient || user || loading) {
        return <AuthProviderSkeleton />;
    }
  
    return <>{children}</>;
}
