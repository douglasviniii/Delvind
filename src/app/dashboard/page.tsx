
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from "../../context/auth-context";
import { db } from "../../lib/firebase";
import { doc, getDoc } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { AlertCircle, ArrowRight, Globe, Search, Smartphone, TrendingUp } from 'lucide-react';
import { PortfolioCarousel } from '../../components/layout/portfolio-carousel';
import { BlogCarousel } from '../../components/layout/blog-carousel';
import { PartnersCarousel } from '../../components/layout/partners-carousel';
import { Separator } from '../../components/ui/separator';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { user } = useAuth();
  const [profileIncomplete, setProfileIncomplete] = useState(false);

  useEffect(() => {
    if (user) {
        const checkProfile = async () => {
            const userDocRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (!data.phone) {
                    setProfileIncomplete(true);
                }
            } else {
                setProfileIncomplete(true);
            }
        }
        checkProfile();
    }
  }, [user]);

  return (
    <>
      {profileIncomplete && (
        <Alert className="mb-6 bg-card border-primary">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Pendências no seu perfil!</AlertTitle>
          <AlertDescription>
            Seu perfil está incompleto. Por favor, <Link href="/dashboard/profile" className="font-bold hover:underline">clique aqui</Link> para preencher seus dados e aproveitar todos os nossos recursos.
          </AlertDescription>
        </Alert>
      )}
      
      <div className='space-y-16'>
        <PortfolioCarousel />
        <Separator />
        <BlogCarousel />
        <Separator />
        <PartnersCarousel />
      </div>
    </>
  );
}
