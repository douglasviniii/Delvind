'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../../lib/firebase';
import { Button } from '../../../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../../../components/ui/card';
import { ArrowLeft, Copy, Send, Hourglass, CheckCircle, FileSignature, Download } from 'lucide-react';
import { Skeleton } from '../../../../../components/ui/skeleton';
import { useToast } from '../../../../../hooks/use-toast';
import { PlacedField } from '../../create/page';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Image from 'next/image';

type Signatory = {
    name: string;
    cpf: string;
    signed: boolean;
    signatureDataUrl?: string; 
    signedAt?: any; 
};

type Contract = {
    id: string;
    title: string;
    clientName: string;
    status: 'Pendente' | 'Em Elaboração' | 'Aguardando Assinatura' | 'Assinado';
    contractContent: string;
    signatories: Signatory[];
    placedFields: PlacedField[];
    createdAt: any;
    isPdf?: boolean;
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
  
  const handleDownloadPdf = async () => {
    if (!contract) return;
    
    const content = document.getElementById('contract-content-for-pdf');
    if (!content) {
        toast({ title: 'Erro', description: 'Não foi possível encontrar o conteúdo para gerar o PDF.', variant: 'destructive' });
        return;
    }

    try {
        const canvas = await html2canvas(content, { scale: 2, useCORS: true, windowWidth: content.scrollWidth, windowHeight: content.scrollHeight });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasHeight / canvasWidth;
        const imgHeight = pdfWidth * ratio;
        let heightLeft = imgHeight;
        let position = 0;
        const tolerance = 5;

        const pdfHeight = imgHeight; // corrigido

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > tolerance) {
            position -= pdfHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;
        }

        pdf.save(`${contract.title.replace(/ /g, '_')}_assinado.pdf`);
    } catch (error) {
        console.error('Error generating PDF:', error);
        toast({ title: 'Erro', description: 'Não foi possível gerar o PDF.', variant: 'destructive' });
    }
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
        .audit-trail { page-break-before: always; padding: 2rem; font-family: sans-serif; color: #333; }
        .audit-trail h2 { font-size: 1.5rem; border-bottom: 2px solid #ccc; padding-bottom: 0.5rem; margin-bottom: 1.5rem; }
        .audit-trail .signer-info { border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
        .audit-trail p { margin: 0.25rem 0; font-size: 10pt; }
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
            {contract.status !== 'Assinado' && (
                <>
                 <Button onClick={copySignatureLink}><Copy className='mr-2 h-4 w-4' /> Copiar Link de Assinatura</Button>
                 <Button variant="outline"><Send className='mr-2 h-4 w-4'/> Enviar por E-mail</Button>
                </>
            )}
            {contract.status === 'Assinado' && (
                 <Button onClick={handleDownloadPdf}><Download className='mr-2 h-4 w-4' /> Baixar PDF Assinado</Button>
            )}
        </div>
      </div>
      
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 items-start flex-1 overflow-y-hidden'>
        <div className='lg:col-span-2 h-full'>
             <Card className='h-full flex flex-col'>
                <CardHeader>
                    <CardTitle>{contract.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 flex-1 overflow-hidden">
                   <div id="contract-content-for-pdf" className="border rounded-md h-full overflow-y-auto relative contract-preview-static bg-white">
                     
                     {contract.isPdf ? (
                        <iframe 
                            src={contract.contractContent}
                            className="w-full h-full border-0"
                            title="Visualizador de PDF"
                        />
                     ) : (
                         <div 
                            className="prose dark:prose-invert max-w-none p-8"
                            dangerouslySetInnerHTML={{ __html: contract.contractContent }}
                         />
                     )}

                     {(contract.placedFields || []).map((field, index) => {
                        const signatory = contract.signatories[field.signatoryIndex];
                        const signatureDataUrl = signatory?.signatureDataUrl;
                         return (
                            <div 
                                key={index}
                                className='absolute'
                                style={{ 
                                    left: `${field.x}%`, 
                                    top: `${field.y}%`, 
                                    transform: 'translate(-50%, -50%)', 
                                    width: '180px',
                                    height: '60px'
                                }}
                            >
                                {signatory?.signed && signatureDataUrl ? (
                                    <Image src={signatureDataUrl} alt={`Assinatura de ${signatory.name}`} width={180} height={60} style={{ objectFit: 'contain' }} />
                                ) : (
                                    <div className='w-full h-full bg-primary/10 border-2 border-dashed border-primary rounded-md p-1 text-[10px] text-primary-foreground flex items-center justify-center'>
                                        {signatory?.name.split(' ')[0]} - {field.type}
                                    </div>
                                )}
                            </div>
                         )
                     })}

                     {contract.status === 'Assinado' && (
                        <div className='audit-trail'>
                            <h2>Trilha de Auditoria do Documento</h2>
                            {contract.signatories.filter(s => s.signed).map((signer, index) => (
                                <div key={index} className='signer-info'>
                                    <p><strong>Assinante:</strong> {signer.name}</p>
                                    <p><strong>CPF:</strong> {signer.cpf}</p>
                                    <p><strong>Data/Hora da Assinatura:</strong> {signer.signedAt?.toDate().toLocaleString('pt-BR')}</p>
                                    <p><strong>ID da Assinatura:</strong> doc-{contract.id}-signer-{index}</p>
                                </div>
                            ))}
                        </div>
                     )}
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
                        <div key={index} className='p-3 border rounded-md bg-muted/50 text-sm flex justify-between items-center'>
                            <div>
                                <p className='font-semibold'>{signer.name}</p>
                                <p className='text-muted-foreground'>CPF: {signer.cpf}</p>
                            </div>
                            {signer.signed ? (
                                <span className='text-green-600 font-bold text-xs flex items-center gap-1'><CheckCircle className='w-4 h-4'/> Assinado</span>
                            ) : (
                                <span className='text-orange-500 font-bold text-xs flex items-center gap-1'><Hourglass className='w-4 h-4'/> Pendente</span>
                            )}
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
