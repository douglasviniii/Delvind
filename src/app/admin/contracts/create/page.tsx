
'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import Image from 'next/image';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../../components/ui/card';
import { ArrowLeft, FileText, Download, UserCircle, Building, Check, Trash2, PlusCircle, Signature, Hourglass } from 'lucide-react';
import { Skeleton } from '../../../../components/ui/skeleton';
import { useToast } from '../../../../hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '../../../../components/ui/radio-group';
import { Label } from '../../../../components/ui/label';
import { useForm, Controller, useFieldArray, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import TiptapEditor from '../../../../components/ui/tiptap-editor';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../../components/ui/form';
import { Separator } from '../../../../components/ui/separator';
import { Input } from '../../../../components/ui/input';
import { cn } from '../../../../lib/utils';
import { useAuth } from '../../../../context/auth-context';

// Define types for better type safety
type User = {
    uid: string;
    displayName: string;
    cnpj?: string;
    cpf?: string;
    rg?: string;
    razaoSocial?: string;
    inscricaoEstadual?: string;
    inscricaoMunicipal?: string;
    address?: string;
    addressNumber?: string;
    neighborhood?: string;
    city?: string;
    uf?: string;
    phone?: string;
    email?: string;
    responsibles?: Responsible[];
};

type Responsible = {
    name: string;
    cpf: string;
    rg: string;
    phone: string;
    email: string;
};

type ApprovedBudget = {
    id: string;
    title: string;
    total: number;
    items: {description: string, price: number}[];
};

const companyInfo = {
    razaoSocial: 'Delvind Tecnologia Da Informação LTDA',
    cnpj: '57.278.676/0001-69',
    email: 'contato@delvind.com',
    phone: '(45) 98800-0647',
    address: 'R. Jaime Canet, 2062 - Nazaré, Medianeira - PR, 85884-000',
};


const placedFieldSchema = z.object({
  signatoryIndex: z.number(),
  type: z.enum(['signature', 'cpf', 'rubric']),
  x: z.number(),
  y: z.number(),
});

const signatorySchema = z.object({
  name: z.string().min(3, "Nome é obrigatório"),
  cpf: z.string().min(11, "CPF é obrigatório"),
});

const contractFormSchema = z.object({
    selectedProduct: z.string().optional(),
    contractContent: z.string().min(50, "O conteúdo do contrato não pode estar vazio."),
    signatories: z.array(signatorySchema).min(1, "É necessário adicionar pelo menos um assinante."),
    placedFields: z.array(placedFieldSchema).optional(),
});

type ContractFormData = z.infer<typeof contractFormSchema>;
export type PlacedField = z.infer<typeof placedFieldSchema>;
export type Signatory = z.infer<typeof signatorySchema>;


const steps = [
  { id: '01', name: 'Elaborar Contrato' },
  { id: '02', name: 'Definir Assinantes' },
  { id: '03', name: 'Posicionar Assinaturas' },
];

function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <nav aria-label="Progress">
      <ol role="list" className="flex items-center">
        {steps.map((step, stepIdx) => (
          <li key={step.name} className={cn("relative", stepIdx !== steps.length - 1 ? "flex-1" : "")}>
            {stepIdx < currentStep ? (
              // Completed Step
              <>
              <div className="absolute inset-0 top-1/2 w-full -translate-y-1/2 bg-primary" aria-hidden="true" />
              <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">{step.name}</span>
              </div>
              </>
            ) : stepIdx === currentStep ? (
              // Current Step
              <>
              <div className="absolute inset-0 top-1/2 w-full -translate-y-1/2 bg-gray-200" aria-hidden="true" />
               <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-background">
                <span className="text-primary">{step.id}</span>
                 <span className="sr-only">{step.name}</span>
              </div>
              </>
            ) : (
              // Upcoming Step
              <>
              <div className="absolute inset-0 top-1/2 w-full -translate-y-1/2 bg-gray-200" aria-hidden="true" />
              <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-background">
                <span className="text-muted-foreground">{step.id}</span>
                <span className="sr-only">{step.name}</span>
              </div>
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

// STEP 1 COMPONENT
const StepOne = ({ form, approvedBudgets }: { form: UseFormReturn<ContractFormData>, approvedBudgets: ApprovedBudget[] }) => {
    return (
     <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 items-start h-full'>
        <div className='lg:col-span-2 space-y-6 h-full flex flex-col'>
            <Card className="flex-1 flex flex-col">
                 <CardHeader>
                    <CardTitle>Etapa 1: Elaborar Contrato</CardTitle>
                    <CardDescription>Redija o conteúdo do contrato no editor abaixo.</CardDescription>
                </CardHeader>
                <CardContent className="p-4 flex-1 overflow-y-auto max-h-[65vh]">
                    <FormField
                        control={form.control}
                        name="contractContent"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <div className="prose dark:prose-invert max-w-none">
                                        <TiptapEditor
                                            value={field.value}
                                            onChange={field.onChange}
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>
        </div>
        <div className='lg:col-span-1 space-y-6'>
            {approvedBudgets.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Vincular a Produto Ativo</CardTitle>
                        <CardDescription>Selecione um produto para usar um modelo.</CardDescription>
                    </CardHeader>
                    <CardContent>
                            <FormField
                                control={form.control}
                                name="selectedProduct"
                                render={({ field }) => (
                                    <RadioGroup value={field.value} onValueChange={field.onChange} className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="none" id="none" />
                                            <Label htmlFor="none">Não vincular (em branco)</Label>
                                        </div>
                                        {approvedBudgets.map(budget => (
                                            <div key={budget.id} className="flex items-center space-x-2">
                                                <RadioGroupItem value={budget.id} id={budget.id} />
                                                <Label htmlFor={budget.id}>{budget.title}</Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                )}
                            />
                    </CardContent>
                </Card>
            )}
        </div>
    </div>
  );
}

// STEP 2 COMPONENT
const StepTwo = ({ form }: { form: UseFormReturn<ContractFormData> }) => {
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "signatories"
    });
    const [newSignatoryName, setNewSignatoryName] = useState('');
    const [newSignatoryCpf, setNewSignatoryCpf] = useState('');
    const { toast } = useToast();

    const handleAddSignatory = () => {
        if(newSignatoryName.trim() && newSignatoryCpf.trim()) {
            append({ name: newSignatoryName, cpf: newSignatoryCpf });
            setNewSignatoryName('');
            setNewSignatoryCpf('');
        } else {
            toast({ title: "Erro", description: "Por favor, preencha o nome e o CPF do assinante.", variant: "destructive" });
        }
    }
      
    return (
        <div className="lg:col-span-3">
            <Card>
                <CardHeader>
                    <CardTitle>Etapa 2: Definir Assinantes</CardTitle>
                    <CardDescription>Adicione todas as partes que irão assinar este contrato.</CardDescription>
                </CardHeader>
                <CardContent className='space-y-6'>
                    <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                        {fields.map((field, index) => (
                            <div key={field.id} className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
                                <div className="flex-1 grid grid-cols-2 gap-4">
                                    <p><strong>Nome:</strong> {form.getValues(`signatories.${index}.name`)}</p>
                                    <p><strong>CPF:</strong> {form.getValues(`signatories.${index}.cpf`)}</p>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => remove(index)}
                                >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                         {fields.length === 0 && <p className='text-sm text-center text-muted-foreground py-4'>Nenhum assinante adicionado.</p>}
                    </div>
                    <Separator />
                    <div className="space-y-4 p-4 border rounded-lg border-dashed">
                        <h3 className="font-medium">Adicionar Novo Assinante</h3>
                        <div className="flex items-end gap-4">
                            <div className="flex-1">
                                <Label htmlFor="new-name">Nome Completo</Label>
                                <Input id="new-name" value={newSignatoryName} onChange={e => setNewSignatoryName(e.target.value)} placeholder="Nome do assinante"/>
                            </div>
                            <div className="flex-1">
                                <Label htmlFor="new-cpf">CPF</Label>
                                <Input id="new-cpf" value={newSignatoryCpf} onChange={e => setNewSignatoryCpf(e.target.value)} placeholder="CPF do assinante"/>
                            </div>
                            <Button type="button" onClick={handleAddSignatory}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar
                            </Button>
                        </div>
                    </div>
                    <FormField name="signatories" control={form.control} render={() => <FormMessage />} />
                </CardContent>
            </Card>
        </div>
    )
  };

// STEP 3 COMPONENT
const StepThree = ({ form, activeTool, setActiveTool, isPdfMode }: { form: UseFormReturn<ContractFormData>, activeTool: any, setActiveTool: (tool: any) => void, isPdfMode: boolean }) => {
    const contractContent = form.watch('contractContent');
    const signatories = form.watch('signatories');
    const { fields: placedFields, append: appendPlacedField, remove: removePlacedField } = useFieldArray({
        control: form.control,
        name: "placedFields"
    });
    const contractPreviewRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    const handleContractClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      if (!activeTool || !contractPreviewRef.current) return;
      
      const rect = contractPreviewRef.current.getBoundingClientRect();
      const scrollTop = contractPreviewRef.current.scrollTop;
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top + scrollTop) / contractPreviewRef.current.scrollHeight) * 100;

      appendPlacedField({ ...activeTool, x, y });
      toast({ title: "Campo Adicionado!", description: `Campo de ${activeTool.type} adicionado.`});
      setActiveTool(null);
    };

    return (
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 items-start h-full'>
            <div className='lg:col-span-2 space-y-6 h-full flex flex-col'>
                 <Card className='flex-1 flex flex-col'>
                    <CardHeader>
                      <CardTitle>Etapa 3: Posicionar Assinaturas</CardTitle>
                      <CardDescription>Selecione um campo e clique no contrato para posicioná-lo.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 flex-1 overflow-hidden">
                       <div ref={contractPreviewRef} className="border rounded-md h-full overflow-y-auto relative contract-preview max-h-[65vh]" onClick={handleContractClick}>
                         
                         {isPdfMode ? (
                            <iframe 
                                src={contractContent}
                                className="w-full h-full border-0"
                                title="Visualizador de PDF"
                            />
                         ) : (
                            <div 
                                className={cn("prose dark:prose-invert max-w-none p-8", { 'cursor-crosshair': activeTool })}
                                dangerouslySetInnerHTML={{ __html: contractContent }}
                            />
                         )}

                         {placedFields.map((field, index) => (
                             <div 
                                key={field.id}
                                className='absolute bg-primary/20 border-2 border-dashed border-primary rounded-md p-1 text-xs text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-red-500/50'
                                style={{ left: `${field.x}%`, top: `${field.y}%`, transform: 'translate(-50%, -50%)' }}
                                onClick={(e) => { e.stopPropagation(); removePlacedField(index); }}
                              >
                                {field.type}
                             </div>
                         ))}
                       </div>
                    </CardContent>
                 </Card>
            </div>
            <div className='lg:col-span-1 space-y-6'>
                <Card>
                    <CardHeader>
                        <CardTitle>Caixa de Ferramentas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                        {signatories.map((signer, index) => (
                            <div key={index} className="p-3 border rounded-lg">
                                <p className="font-semibold">{signer.name}</p>
                                <p className="text-sm text-muted-foreground">{signer.cpf}</p>
                                <div className='flex gap-2 mt-2'>
                                    <Button size="sm" variant={activeTool?.signatoryIndex === index && activeTool.type === 'signature' ? 'default' : 'outline'} onClick={() => setActiveTool({signatoryIndex: index, type: 'signature'})}><Signature className="mr-2 h-4 w-4" />Assinatura</Button>
                                    <Button size="sm" variant={activeTool?.signatoryIndex === index && activeTool.type === 'cpf' ? 'default' : 'outline'} onClick={() => setActiveTool({signatoryIndex: index, type: 'cpf'})}>CPF</Button>
                                    <Button size="sm" variant={activeTool?.signatoryIndex === index && activeTool.type === 'rubric' ? 'default' : 'outline'} onClick={() => setActiveTool({signatoryIndex: index, type: 'rubric'})}>Rubrica</Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Campos Adicionados ({placedFields.length})</CardTitle>
                        <CardDescription>Clique em um campo no contrato para remover.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        </div>
    )
  };


export default function CreateContractPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user: adminUser } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [approvedBudgets, setApprovedBudgets] = useState<ApprovedBudget[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeTool, setActiveTool] = useState<{signatoryIndex: number; type: 'signature' | 'cpf' | 'rubric'} | null>(null);
  
  const reqId = searchParams.get('reqId');
  const userId = searchParams.get('userId');
  const isPdfMode = searchParams.get('pdfMode') === 'true';
  const pdfUrl = searchParams.get('pdfUrl');

  useEffect(() => {
    if (isPdfMode) {
      setCurrentStep(1); // Skip to step 2 for PDF mode
    }
  }, [isPdfMode]);

  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      selectedProduct: "none",
      contractContent: pdfUrl ? decodeURIComponent(pdfUrl) : "<h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h1><p>Selecione um produto à direita para gerar o modelo de contrato.</p>",
      signatories: [],
      placedFields: [],
    }
  });


  const selectedProduct = form.watch('selectedProduct');

  const generateContractTemplate = (client: User, budget: ApprovedBudget): string => {
    const clientAddress = [client.address, client.addressNumber, client.neighborhood, client.city, client.uf].filter(Boolean).join(', ').trim();
    
    const itemsList = budget.items.map(item => `<li>${item.description} - ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}</li>`).join('');
    
    let clientIdentifier, clientDoc;
    if (client.cnpj) {
        clientIdentifier = `pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ${client.cnpj}, com Inscrição Estadual de nº ${client.inscricaoEstadual || 'isento'}, com sede em ${clientAddress}, neste ato representada na forma de seu contrato social, por seus representantes legais ao final assinados.`;
        clientDoc = `CNPJ: ${client.cnpj}`;
    } else {
        clientIdentifier = `pessoa física, inscrita no CPF sob o nº ${client.cpf || 'Não informado'} e RG nº ${client.rg || 'Não informado'}, residente e domiciliado em ${clientAddress}.`;
        clientDoc = `CPF: ${client.cpf || 'Não informado'}`;
    }

    const today = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

    return `
        <p style="text-align:center;"><strong>CONTRATO DE PRESTAÇÃO DE SERVIÇO – ${budget.title.toUpperCase()}</strong></p>
        <br/>
        <h3><strong>PARTES CONTRATANTES</strong></h3>
        <p><strong>CONTRATADA:</strong> ${companyInfo.razaoSocial}, pessoa jurídica de direito privado, com sede em ${companyInfo.address}, inscrita no CNPJ sob o nº ${companyInfo.cnpj}, neste ato representada na forma de seu contrato social.</p>
        <p><strong>CONTRATANTE:</strong> ${client.razaoSocial || client.displayName}, ${clientIdentifier}</p>
        <br/>
        <p>As partes acima identificadas têm, entre si, justo e acertado o presente Contrato de Prestação de Serviços, que se regerá pelas cláusulas seguintes e pelas condições descritas no presente.</p>
        <br/>
        <h3><strong>CLÁUSULA PRIMEIRA - DO OBJETO DO CONTRATO</strong></h3>
        <p>Constitui objeto do presente contrato a prestação de serviços de desenvolvimento e consultoria em tecnologia, especificamente relacionados a ${budget.title}, conforme detalhado abaixo:</p>
        <ul>${itemsList}</ul>
        <br/>
        <h3><strong>CLÁUSULA SEGUNDA - DAS OBRIGAÇÕES DA CONTRATADA</strong></h3>
        <p>A CONTRATADA se compromete a: </p>
        <ol>
          <li>Prestar os serviços descritos na Cláusula Primeira com zelo, qualidade técnica e dentro dos prazos acordados.</li>
          <li>Manter a CONTRATANTE informada sobre o andamento do projeto.</li>
          <li>Respeitar a confidencialidade das informações fornecidas pela CONTRATANTE.</li>
        </ol>
        <h3><strong>CLÁUSULA TERCEIRA - DAS OBRIGAÇÕES DA CONTRATANTE</strong></h3>
        <p>A CONTRATANTE se compromete a: </p>
        <ol>
          <li>Fornecer todas as informações, senhas e materiais necessários para a execução dos serviços.</li>
          <li>Realizar os pagamentos nas datas e valores acordados.</li>
          <li>Disponibilizar um responsável para validações e aprovações necessárias ao projeto.</li>
        </ol>
        <br/>
        <h3><strong>CLÁUSULA QUARTA - DO VALOR E DA FORMA DE PAGAMENTO</strong></h3>
        <p>O valor total dos serviços contratados é de <strong>${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(budget.total)}</strong>. A aprovação da Proposta Comercial correspondente a este serviço, realizada através do painel do cliente, constitui aceite eletrônico e autoriza a CONTRATADA a gerar as faturas e cobranças conforme os termos acordados.</p>
        <br/>
        <h3><strong>CLÁUSULA QUINTA - DO PRAZO E DA VIGÊNCIA</strong></h3>
        <p>O presente contrato tem vigência a partir da data de sua assinatura, com prazo para a execução dos serviços estipulado em [inserir prazo] dias, podendo ser prorrogado mediante acordo entre as partes.</p>
        <br/>
        <h3><strong>CLÁUSULA SEXTA - DA CONFIDENCIALIDADE</strong></h3>
        <p>As partes se comprometem a manter em sigilo todas as informações técnicas, comerciais e financeiras a que tiverem acesso em decorrência deste contrato, não podendo divulgá-las a terceiros sem prévia autorização por escrito.</p>
        <br/>
        <h3><strong>CLÁUSULA SÉTIMA - DA RESCISÃO</strong></h3>
        <p>O presente contrato poderá ser rescindido por qualquer uma das partes, mediante aviso prévio de 30 (trinta) dias. A rescisão observará o disposto na Política de Cancelamento e Reembolso disponível no site da CONTRATADA, que é parte integrante deste contrato.</p>
        <br/>
        <h3><strong>CLÁUSULA OITAVA - DO FORO</strong></h3>
        <p>Fica eleito o foro da comarca de Medianeira, Paraná, para dirimir quaisquer controvérsias oriundas do presente contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</p>
        <br/>
        <p style="text-align:center;">Medianeira, ${today}.</p>
        <br/><br/><br/>
        <div class="signatures">
            <div class="signature-block">
                <hr>
                <p>${companyInfo.razaoSocial}</p>
                <p>CNPJ: ${companyInfo.cnpj}</p>
                <p>CONTRATADA</p>
            </div>
            <div class="signature-block">
                <hr>
                <p>${client.razaoSocial || client.displayName}</p>
                <p>${clientDoc}</p>
                <p>CONTRATANTE</p>
            </div>
        </div>
    `;
  }
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let clientId: string | null = null;
        
        if (reqId) {
            const requestRef = doc(db, 'contracts', reqId);
            const requestSnap = await getDoc(requestRef);
            if (!requestSnap.exists()) throw new Error('Requisição de contrato não encontrada.');
            clientId = requestSnap.data().clientId;
        } else if (userId) {
            clientId = userId;
        }

        if (!clientId) throw new Error('ID do cliente não encontrado.');
        
        const clientRef = doc(db, 'users', clientId);
        const clientSnap = await getDoc(clientRef);
        if (!clientSnap.exists()) throw new Error('Dados do cliente não encontrados.');
        const clientData = { uid: clientSnap.id, ...clientSnap.data() } as User;
        setUser(clientData);

        const budgetsQuery = query(
            collection(db, 'budgets'), 
            where('clientId', '==', clientId), 
            where('status', '==', 'Aprovado')
        );
        const budgetsSnapshot = await getDocs(budgetsQuery);
        const budgetsData = budgetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ApprovedBudget));
        setApprovedBudgets(budgetsData);

      } catch (error: any) {
        toast({ title: 'Erro ao Carregar Dados', description: error.message, variant: 'destructive' });
        router.push('/admin/contracts');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [reqId, userId, router, toast]);

  useEffect(() => {
    if (!user || isPdfMode) return;
    let template = "<h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h1><p>Selecione um produto à direita para gerar um modelo de contrato ou comece a redigir um do zero.</p>";
    if (user && selectedProduct !== 'none') {
        const budget = approvedBudgets.find(b => b.id === selectedProduct);
        if (budget) {
            template = generateContractTemplate(user, budget);
        }
    }
    form.setValue('contractContent', template, { shouldValidate: true, shouldDirty: true });
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct, user, approvedBudgets, isPdfMode]);


  const handleNextStep = async () => {
    let isStepValid = false;
    if (currentStep === 0) {
        isStepValid = await form.trigger("contractContent");
    } else if (currentStep === 1) {
        isStepValid = await form.trigger("signatories");
    }

    if (isStepValid) {
        setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    }
  }

  const onSubmit = async (data: ContractFormData) => {
    if (!user || !adminUser) {
        toast({ title: "Erro de Autenticação", variant: "destructive"});
        return;
    }
    setIsSaving(true);
    try {
        const contractData = {
            ...data,
            clientId: user.uid,
            clientName: user.displayName,
            authorId: adminUser.uid,
            status: 'Aguardando Assinatura',
            title: approvedBudgets.find(b => b.id === data.selectedProduct)?.title || 'Contrato Avulso',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            isPdf: isPdfMode, // Flag indicating if it's a PDF contract
        };

        if (reqId) {
            // Update the existing request document
            const contractRef = doc(db, 'contracts', reqId);
            await updateDoc(contractRef, contractData);
            toast({ title: "Contrato Gerado!", description: "O contrato foi salvo e está pronto para ser enviado." });
        } else {
            // Create a new contract document for manual creation
            await addDoc(collection(db, 'contracts'), contractData);
            toast({ title: "Contrato Criado!", description: "O contrato foi criado e está pronto para ser enviado." });
        }
        router.push('/admin/contracts');
    } catch (error) {
        console.error("Error saving contract", error);
        toast({ title: "Erro ao Salvar", description: "Não foi possível salvar o contrato.", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex-1 p-6 flex flex-col h-full">
        <Skeleton className="h-10 w-1/4 mb-6" />
        <Skeleton className="h-16 w-full max-w-lg mb-6"/>
        <div className="grid lg:grid-cols-3 gap-6 flex-1">
            <div className='lg:col-span-2 space-y-6'>
                 <Skeleton className="h-full w-full" />
            </div>
            <div className='lg:col-span-1 space-y-6'>
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        </div>
      </main>
    );
  }
  

  const renderStepContent = () => {
    // This approach preserves component state across steps by hiding them instead of unmounting.
    return (
        <>
            <div style={{ display: currentStep === 0 ? 'block' : 'none' }} className="h-full">
                <StepOne form={form} approvedBudgets={approvedBudgets} />
            </div>
            <div style={{ display: currentStep === 1 ? 'block' : 'none' }} className="h-full">
                <StepTwo form={form} />
            </div>
            <div style={{ display: currentStep === 2 ? 'block' : 'none' }} className="h-full">
                <StepThree form={form} activeTool={activeTool} setActiveTool={setActiveTool} isPdfMode={isPdfMode} />
            </div>
        </>
    );
};


  return (
    <main className="flex-1 p-6 flex flex-col h-[calc(100vh_-_theme(spacing.16))]">
      <div className="flex items-center justify-between gap-4 mb-6">
         <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
            <h1 className="text-2xl font-bold">Gerar Contrato</h1>
            <p className="text-muted-foreground">Cliente: {user?.displayName}</p>
            </div>
        </div>
        <div className="w-full max-w-lg">
            <Stepper currentStep={currentStep} />
        </div>
        <div className='flex gap-2 mt-6'>
             {currentStep > (isPdfMode ? 1 : 0) && (
                <Button type="button" variant="outline" onClick={() => setCurrentStep(prev => Math.max(prev - 1, 0))}>Voltar</Button>
            )}
             {currentStep < steps.length - 1 ? (
                <Button type="button" onClick={handleNextStep}>Avançar</Button>
             ) : (
                <Button type="submit" form="contract-form" disabled={isSaving}>
                    {isSaving ? <> <Hourglass className="mr-2 h-4 w-4 animate-spin"/> Salvando...</> : 'Salvar e Gerar Link'}
                </Button>
             )}
        </div>
      </div>
      
      <Form {...form}>
        <form id="contract-form" onSubmit={form.handleSubmit(onSubmit)} className="flex-1 mt-6 overflow-y-hidden">
            {renderStepContent()}
        </form>
      </Form>
      
    </main>
  );
}
