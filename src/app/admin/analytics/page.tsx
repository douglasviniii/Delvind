
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, BarChart, Users, Globe, Clock, Settings } from "lucide-react";
import Link from "next/link";

export default function AnalyticsPage() {
  return (
    <main className="flex-1">
      <Card className="text-center">
        <CardHeader>
          <CardTitle>Integre com o Google Analytics</CardTitle>
          <CardDescription>
            Para visualizar dados detalhados sobre seus visitantes, conecte sua conta do Google Analytics 4.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-muted-foreground">
            <div className="flex flex-col items-center gap-2 p-4 border rounded-lg bg-muted/50">
              <Users className="w-8 h-8" />
              <span className="font-semibold">Visitantes Únicos</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 border rounded-lg bg-muted/50">
              <LineChart className="w-8 h-8" />
              <span className="font-semibold">Visualizações de Página</span>
            </div>
             <div className="flex flex-col items-center gap-2 p-4 border rounded-lg bg-muted/50">
              <Clock className="w-8 h-8" />
              <span className="font-semibold">Tempo de Sessão</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 border rounded-lg bg-muted/50">
              <Globe className="w-8 h-8" />
              <span className="font-semibold">Origem do Tráfego</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground pt-4">
            Esta funcionalidade requer a configuração de um ID de acompanhamento do Google Analytics.
          </p>
          <Button asChild>
            <Link href="/admin/settings">
              <Settings className="mr-2 h-4 w-4" />
              Configurar Integração
            </Link>
          </Button>
        </CardContent>
      </Card>

    </main>
  );
}
