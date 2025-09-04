
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../../components/ui/card';
import { ArrowLeft, Copy, Send, Hourglass, CheckCircle, FileSignature } from 'lucide-react';
import { Skeleton } from '../../../../components/ui/skeleton';
import { useToast } from '../../../../hooks/use-toast';
import { PlacedField, Signatory } from '../create/page';


type Contract = {
    id: string;
    title: string;
    clientName: string;
    status: 'Pendente' | 'Em Elaboração' | 'Aguardando Assinatura' | 'Assinado';
    contractContent: string;
    signatories: Signatory[];
    placedFields: PlacedField[];
    createdAt: any;
};

export default function ViewContractPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { id } = params;

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof id !== 'string') return;
    const fetchContract = async () => {
      setLoading(true);
      const contractRef = doc(db, 'contracts', id);
      const contractSnap = await getDoc(contractRef);
      if (contractSnap.exists()) {
        setContract({ id: contractSnap.id, ...contractSnap.data() } as Contract);
      } else {
        toast({ title: 'Erro', description: 'Contrato não encontrado.', variant: 'destructive' });
        router.push('/admin/contracts');
      }
      setLoading(false);
    };
    fetchContract();
  }, [id, router, toast]);

  const copySignatureLink = () => {
    const link = `${window.location.origin}/sign/${id}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Link Copiado!', description: 'O link de assinatura foi copiado para a sua área de transferência.' });
  };
  
  const getStatusInfo = (status?: Contract['status']) => {
    switch (status) {
      case 'Em Elaboração':
        return { text: 'Em Elaboração', icon: <FileSignature className="h-4 w-4" />, className: 'bg-blue-500 text-white' };
       case 'Aguardando Assinatura':
        return { text: 'Aguardando Assinatura', icon: <Hourglass className="h-4 w-4" />, className: 'bg-orange-500 text-white' };
      case 'Assinado':
        return { text: 'Assinado', icon: <CheckCircle className="h-4 w-4" />, className: 'bg-green-600 text-white' };
      default:
        return { text: status, icon: <Hourglass className="h-4 w-4" />, className: 'bg-gray-500 text-white' };
    }
  };


  if (loading) {
    return (
      <main className="flex-1 p-6 flex flex-col">
        <Skeleton className="h-10 w-1/4 mb-6" />
        <div className="grid lg:grid-cols-3 gap-6 flex-1">
            <div className='lg:col-span-2'><Skeleton className="h-full w-full" /></div>
            <div className='lg:col-span-1'><Skeleton className="h-64 w-full" /></div>
        </div>
      </main>
    );
  }

  if (!contract) return null;

  const statusInfo = getStatusInfo(contract.status);

  return (
    <>
    <style jsx global>{`
        .contract-preview-static .prose h3 { font-size: 15px; }
        .contract-preview-static .prose p, .contract-preview-static .prose li { font-size: 10pt; line-height: 1.5; text-align: justify; }
        .contract-preview-static .prose .signatures { display: flex; flex-direction: column; gap: 2.5rem; margin-top: 2rem; page-break-inside: avoid; }
        .contract-preview-static .prose .signature-block { text-align: center; }
        .contract-preview-static .prose .signature-block hr { border: 0; border-top: 1px solid #000; margin-bottom: 0.5rem; max-width: 300px; margin-left: auto; margin-right: auto; }
        .contract-preview-static .prose .signature-block p { margin: 0; line-height: 1.2; text-align: center; }
      `}</style>
    <main className="flex-1 p-6 flex flex-col h-[calc(100vh_-_theme(spacing.16))]">
      <div className="flex items-center justify-between gap-4 mb-6">
         <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
            <h1 className="text-2xl font-bold">Visualizar Contrato</h1>
            <p className="text-muted-foreground">Contrato para: {contract.clientName}</p>
            </div>
        </div>
        <div className='flex gap-2'>
            <Button onClick={copySignatureLink}><Copy className='mr-2 h-4 w-4' /> Copiar Link de Assinatura</Button>
            <Button variant="outline"><Send className='mr-2 h-4 w-4'/> Enviar por E-mail</Button>
        </div>
      </div>
      
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 items-start flex-1 overflow-y-hidden'>
        <div className='lg:col-span-2 h-full'>
             <Card className='h-full flex flex-col'>
                <CardHeader>
                    <CardTitle>{contract.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 flex-1 overflow-hidden">
                   <div className="border rounded-md h-full overflow-y-auto relative contract-preview-static">
                     <div 
                        className="prose dark:prose-invert max-w-none p-8"
                        dangerouslySetInnerHTML={{ __html: contract.contractContent }}
                     />
                     {(contract.placedFields || []).map((field, index) => (
                         <div 
                            key={index}
                            className='absolute bg-primary/20 border border-dashed border-primary rounded-md p-1 text-[10px] text-primary-foreground flex items-center justify-center'
                            style={{ left: `${field.x}%`, top: `${field.y}%`, transform: 'translate(-50%, -50%)', width: '120px', height: '40px' }}
                          >
                            {field.type} - {contract.signatories[field.signatoryIndex]?.name.split(' ')[0]}
                         </div>
                     ))}
                   </div>
                </CardContent>
             </Card>
        </div>
        <div className='lg:col-span-1 space-y-6'>
            <Card>
                <CardHeader>
                    <CardTitle>Informações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className='flex items-center gap-2 text-sm'>
                        <span className='font-semibold'>Status:</span>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${statusInfo.className}`}>
                            {statusInfo.icon}
                            {statusInfo.text}
                        </div>
                    </div>
                     <p className='text-sm'><span className='font-semibold'>Criado em:</span> {contract.createdAt?.toDate().toLocaleDateString('pt-BR')}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Assinantes</CardTitle>
                    <CardDescription>Partes envolvidas neste contrato.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {contract.signatories.map((signer, index) => (
                        <div key={index} className='p-3 border rounded-md bg-muted/50 text-sm'>
                            <p className='font-semibold'>{signer.name}</p>
                            <p className='text-muted-foreground'>CPF: {signer.cpf}</p>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    </div>
      
    </main>
    </>
  );
}
