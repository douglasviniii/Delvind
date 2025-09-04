
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Skeleton } from '../../../components/ui/skeleton';
import { useToast } from '../../../hooks/use-toast';
import { PlacedField } from '../../admin/contracts/create/page';
import { Logo } from '../../../components/layout/logo';
import { ShieldCheck, ArrowRight, FileText, CheckCircle, Download, Signature, Eraser } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Image from 'next/image';
import SignatureCanvas from 'react-signature-canvas';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../../components/ui/dialog';
import { cn } from '@/lib/utils';

type Signatory = {
  name: string;
  cpf: string;
  signed: boolean;
  signatureDataUrl?: string; // To store the drawn signature image
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

// Main Component
export default function SignContractPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { id } = params;

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifiedSignatory, setVerifiedSignatory] = useState<Signatory | null>(null);
  const [signatoryIndex, setSignatoryIndex] = useState<number>(-1);

  useEffect(() => {
    if (typeof id !== 'string') return;
    const fetchContract = async () => {
      setLoading(true);
      try {
        const contractRef = doc(db, 'contracts', id);
        const contractSnap = await getDoc(contractRef);
        if (contractSnap.exists()) {
          const contractData = { id: contractSnap.id, ...contractSnap.data() } as Contract;
            if (contractData.status === 'Assinado') {
                toast({ title: 'Contrato Finalizado', description: 'Este contrato já foi assinado por todas as partes.', duration: 5000 });
            }
          setContract(contractData);
        } else {
          toast({ title: 'Erro', description: 'Contrato não encontrado ou inválido.', variant: 'destructive' });
          router.push('/');
        }
      } catch (error) {
        toast({ title: 'Erro de Carregamento', description: 'Não foi possível carregar o contrato.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    fetchContract();
  }, [id, router, toast]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!contract) {
    return null; 
  }
  
  if (contract.status === 'Assinado') {
      return <SignedContractDisplay contract={contract} />;
  }
  
  return (
    <div className="min-h-screen bg-muted/40 flex flex-col items-center justify-center p-4">
       <div className="fixed inset-0 -z-10 bg-gradient-to-br from-white via-pink-100 to-blue-200" />
      {!verifiedSignatory ? (
        <VerificationStep contract={contract} setVerifiedSignatory={setVerifiedSignatory} setSignatoryIndex={setSignatoryIndex} />
      ) : (
        <SigningStep contract={contract} setContract={setContract} signatory={verifiedSignatory} signatoryIndex={signatoryIndex} />
      )}
    </div>
  );
}


// Step 1: Verification Component
const VerificationStep = ({ contract, setVerifiedSignatory, setSignatoryIndex }: { contract: Contract, setVerifiedSignatory: (signer: Signatory) => void, setSignatoryIndex: (index: number) => void }) => {
    const [name, setName] = useState('');
    const [cpf, setCpf] = useState('');
    const [error, setError] = useState('');
    const { toast } = useToast();

    const handleVerification = () => {
        setError('');
        const signerIndex = contract.signatories.findIndex(
            s => s.name.trim().toLowerCase() === name.trim().toLowerCase() && s.cpf.replace(/\D/g, '') === cpf.replace(/\D/g, '')
        );

        if (signerIndex !== -1) {
            const signer = contract.signatories[signerIndex];
            if (signer.signed) {
                toast({ title: 'Já Assinado', description: 'Você já assinou este documento.' });
            } else {
                toast({ title: 'Verificação bem-sucedida!', description: 'Você pode prosseguir para a assinatura.' });
                setVerifiedSignatory(signer);
                setSignatoryIndex(signerIndex);
            }
        } else {
            setError('Nome ou CPF não encontrado na lista de assinantes deste contrato. Verifique os dados e tente novamente.');
        }
    };

    return (
        <Card className="w-full max-w-lg shadow-2xl">
            <CardHeader className="text-center">
                <div className="mx-auto mb-4">
                    <Logo />
                </div>
                <CardTitle className="text-2xl flex items-center justify-center gap-2"><ShieldCheck className="w-6 h-6 text-primary"/> Identificação do Assinante</CardTitle>
                <CardDescription>Para sua segurança, por favor, confirme sua identidade para visualizar e assinar o documento.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div>
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input id="name" placeholder="Seu nome completo, conforme o contrato" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="cpf">CPF</Label>
                    <Input id="cpf" placeholder="Seu número de CPF" value={cpf} onChange={e => setCpf(e.target.value)} />
                </div>
                {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                 <Button className="w-full" onClick={handleVerification}>
                    Verificar e Acessar Contrato <ArrowRight className="ml-2 h-4 w-4"/>
                </Button>
            </CardContent>
        </Card>
    );
};

// Step 2: Signing Component
const SigningStep = ({ contract, signatory, signatoryIndex, setContract }: { contract: Contract, signatory: Signatory, signatoryIndex: number, setContract: (contract: Contract) => void }) => {
    const { toast } = useToast();
    const [isSigning, setIsSigning] = useState(false);
    const [signatures, setSignatures] = useState<{ [key: string]: string }>({});
    
    const [isPadOpen, setIsPadOpen] = useState(false);
    const [currentField, setCurrentField] = useState<PlacedField | null>(null);
    let sigPad = useRef<SignatureCanvas | null>(null);

    const mySignatureFields = contract.placedFields.filter(f => f.signatoryIndex === signatoryIndex);
    const allMyFieldsSigned = mySignatureFields.every(field => !!signatures[`${field.x}-${field.y}`]);

    const openSignaturePad = (field: PlacedField) => {
        setCurrentField(field);
        setIsPadOpen(true);
    };

    const clearSignature = () => sigPad.current?.clear();
    
    const saveSignature = () => {
        if (sigPad.current?.isEmpty()) {
            toast({ title: "Aviso", description: "Por favor, desenhe sua assinatura.", variant: "destructive"});
            return;
        }
        if (currentField) {
            const fieldId = `${currentField.x}-${currentField.y}`;
            setSignatures(prev => ({ ...prev, [fieldId]: sigPad.current!.toDataURL('image/png') }));
        }
        setIsPadOpen(false);
        setCurrentField(null);
    };

    const handleSignContract = async () => {
        if (!allMyFieldsSigned) {
            toast({ title: 'Campos Pendentes', description: 'Por favor, assine todos os seus campos.', variant: 'destructive'});
            return;
        }

        setIsSigning(true);
        try {
            const contractRef = doc(db, 'contracts', contract.id);
            
            const updatedSignatories = [...contract.signatories];
            updatedSignatories[signatoryIndex] = { 
                ...updatedSignatories[signatoryIndex], 
                signed: true,
                signatureDataUrl: signatures[Object.keys(signatures)[0]], // Store one signature image for now
                signedAt: serverTimestamp()
            };
            
            const allSigned = updatedSignatories.every(s => s.signed);
            const newStatus = allSigned ? 'Assinado' : contract.status;

            await updateDoc(contractRef, { 
                signatories: updatedSignatories,
                status: newStatus 
            });
            
            toast({
                title: "Assinatura Confirmada!",
                description: "Obrigado por assinar o documento. Sua assinatura foi registrada com sucesso.",
                duration: 5000,
            });

            setContract({ ...contract, signatories: updatedSignatories, status: newStatus });

        } catch (error) {
            console.error("Error signing document:", error);
            toast({ title: "Erro ao Assinar", description: "Não foi possível registrar sua assinatura. Tente novamente.", variant: "destructive" });
        } finally {
            setIsSigning(false);
        }
    };

    return (
        <>
        <Dialog open={isPadOpen} onOpenChange={setIsPadOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Desenhe sua Assinatura</DialogTitle>
                    <DialogDescription>Use o mouse ou o dedo para assinar no campo abaixo.</DialogDescription>
                </DialogHeader>
                <div className='bg-background p-2 rounded-md border'>
                     <SignatureCanvas 
                        ref={(ref) => { sigPad.current = ref }}
                        penColor='black'
                        canvasProps={{className: 'w-full h-48 rounded-md'}} 
                    />
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={clearSignature}><Eraser className='mr-2 h-4 w-4'/>Limpar</Button>
                    <Button onClick={saveSignature}><CheckCircle className='mr-2 h-4 w-4'/>Confirmar Assinatura</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Card className="w-full max-w-4xl shadow-2xl">
           <CardHeader>
               <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary"/> {contract.title}</CardTitle>
               <CardDescription>Contrato entre {contract.clientName} e as partes assinantes.</CardDescription>
           </CardHeader>
           <CardContent>
             <div className='bg-muted p-4 rounded-md mb-4 text-sm'>
                <p>Verificado como: <strong>{signatory.name}</strong> (CPF: {signatory.cpf})</p>
                <p className='text-muted-foreground'>Clique nos seus campos abaixo para assinar.</p>
             </div>
             <div className="border rounded-md h-[60vh] overflow-y-auto relative">
                 {contract.isPdf ? (
                    <iframe 
                        src={contract.contractContent}
                        className="w-full h-full border-0"
                        title="Visualizador de PDF do Contrato"
                    />
                 ) : (
                    <div 
                        id="contract-content-for-pdf"
                        className="prose dark:prose-invert max-w-none p-8"
                        dangerouslySetInnerHTML={{ __html: contract.contractContent }}
                    />
                 )}
                {contract.placedFields?.map((field, index) => {
                    const fieldId = `${field.x}-${field.y}`;
                    const isMyField = field.signatoryIndex === signatoryIndex;
                    const signatureDataUrl = signatures[fieldId];
                    const hasBeenSignedByMe = !!signatureDataUrl;
                    
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
                            {isMyField ? (
                                <Button
                                    variant={hasBeenSignedByMe ? "default" : "outline"}
                                    className='w-full h-full border-dashed border-2 border-primary hover:bg-primary/20'
                                    onClick={() => openSignaturePad(field)}
                                >
                                    {hasBeenSignedByMe ? (
                                        <Image src={signatureDataUrl} alt="Sua assinatura" layout="fill" objectFit="contain" />
                                    ) : (
                                        <span className='flex items-center gap-2 text-primary'>
                                            <Signature className='w-5 h-5' /> Assinar Aqui
                                        </span>
                                    )}
                                </Button>
                            ) : (
                                <div
                                    className='w-full h-full bg-gray-200/50 border-2 border-dashed border-gray-400 rounded-md p-1 text-xs text-gray-500 flex items-center justify-center'
                                >
                                    {contract.signatories[field.signatoryIndex]?.signed 
                                        ? <span className='text-green-600 font-bold'>Assinado</span>
                                        : <span>Aguardando...</span>
                                    }
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
           </CardContent>
           <CardFooter className="flex justify-between items-center">
             <p className='text-sm text-muted-foreground'>Ao clicar em "Assinar", você concorda com todos os termos deste documento.</p>
             <Button onClick={handleSignContract} disabled={isSigning || !allMyFieldsSigned} size="lg">
                {isSigning ? 'Processando...' : 'Confirmar e Assinar Contrato'}
            </Button>
           </CardFooter>
       </Card>
       </>
    );
};


const SignedContractDisplay = ({ contract }: { contract: Contract }) => {
    const router = useRouter();
    const { toast } = useToast();

    const handleDownloadPdf = async () => {
        const content = document.getElementById('signed-contract-content');
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

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
            pdf.save(`${contract.title.replace(/ /g, '_')}_assinado.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            toast({ title: 'Erro', description: 'Não foi possível gerar o PDF.', variant: 'destructive' });
        }
    };
    
    return (
        <Card className="w-full max-w-4xl">
            <CardHeader className="text-center">
                <div className="mx-auto bg-green-100 rounded-full p-3 w-fit">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <CardTitle className="text-2xl mt-4">Contrato Finalizado</CardTitle>
                <CardDescription>Este documento foi assinado por todas as partes e está arquivado.</CardDescription>
            </CardHeader>
            <CardContent>
                <div id="signed-contract-content" className="border rounded-md h-[60vh] overflow-y-auto relative bg-white">
                     {contract.isPdf ? (
                        <iframe 
                            src={contract.contractContent}
                            className="w-full h-full border-0"
                            title="Visualizador de PDF do Contrato"
                        />
                     ) : (
                         <div 
                            className="prose dark:prose-invert max-w-none p-8"
                            dangerouslySetInnerHTML={{ __html: contract.contractContent }}
                         />
                     )}
                     {contract.placedFields?.map((field, index) => {
                        const signatory = contract.signatories[field.signatoryIndex];
                        const signatureDataUrl = signatory?.signatureDataUrl;
                        return (
                            <div
                                key={index}
                                className='absolute flex flex-col items-center justify-center'
                                style={{
                                    left: `${field.x}%`, 
                                    top: `${field.y}%`, 
                                    transform: 'translate(-50%, -50%)',
                                    width: '180px',
                                    height: '60px'
                                }}
                            >
                               {signatureDataUrl ? (
                                    <Image src={signatureDataUrl} alt={`Assinatura de ${signatory.name}`} width={180} height={60} style={{ objectFit: 'contain' }} />
                               ) : (
                                   <div className='text-xs text-muted-foreground'>[Assinado Digitalmente]</div>
                               )}
                            </div>
                        )
                     })}
                </div>
            </CardContent>
            <CardFooter className="flex-col sm:flex-row justify-between gap-4">
                 <Button variant="outline" onClick={() => router.push('/')}>Voltar à Página Inicial</Button>
                 <Button className="w-full sm:w-auto" onClick={handleDownloadPdf}>
                    <Download className="mr-2 h-4 w-4"/> Baixar PDF Assinado
                 </Button>
            </CardFooter>
        </Card>
    )
}


const LoadingSkeleton = () => (
    <div className="w-full max-w-lg">
        <Card className="shadow-2xl">
            <CardHeader className="text-center">
                 <Skeleton className="h-8 w-32 mx-auto mb-4" />
                 <Skeleton className="h-6 w-48 mx-auto" />
                 <Skeleton className="h-4 w-full max-w-sm mx-auto mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
                <div className='space-y-2'>
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className='space-y-2'>
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-12 w-full mt-2" />
            </CardContent>
        </Card>
    </div>
);
