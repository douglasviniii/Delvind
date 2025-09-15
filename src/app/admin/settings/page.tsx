
'use client';

import { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { useToast } from '../../../hooks/use-toast';
import { PlusCircle, Trash2, AlertTriangle } from 'lucide-react';
import { Separator } from '../../../components/ui/separator';
import { db, storage } from '../../../lib/firebase';
import { 
    doc, 
    getDoc, 
    setDoc,
    deleteDoc, 
    collection, 
    getDocs, 
    writeBatch, 
    query 
} from 'firebase/firestore';
import { LogoSpinner } from '../../../components/ui/logo-spinner';
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle, 
    AlertDialogTrigger 
} from '../../../components/ui/alert-dialog';
import { deleteObject, ref } from 'firebase/storage';




type Sector = {
    id: string;
    name: string;
    password?: string;
    isLocked: boolean;
};

type Integrations = {
    googleAnalyticsId?: string;
}

const defaultSectors: Sector[] = [
    { id: 'geral', name: 'Geral', isLocked: false },
    { id: 'financeiro', name: 'Financeiro', password: '', isLocked: true },
    { id: 'suporte', name: 'Suporte Dev', password: '', isLocked: true },
    { id: 'reclamacoes', name: 'Elogios e Reclamações', password: '', isLocked: true },
];

export default function SettingsPage() {
    const { toast } = useToast();
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [integrations, setIntegrations] = useState<Integrations>({ googleAnalyticsId: '' });
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isResetting, setIsResetting] = useState<string | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            
            const chatSettingsRef = doc(db, 'app_settings', 'chat_sectors');
            const chatSnap = await getDoc(chatSettingsRef);
            if (chatSnap.exists() && chatSnap.data().sectors) {
                setSectors(chatSnap.data().sectors);
            } else {
                setSectors(defaultSectors);
            }

            const integrationsRef = doc(db, 'app_settings', 'integrations');
            const integrationsSnap = await getDoc(integrationsRef);
            if (integrationsSnap.exists()) {
                setIntegrations(integrationsSnap.data() as Integrations);
            }

            setLoading(false);
        };
        fetchSettings();
    }, []);


    const handleUpdateSector = (index: number, field: keyof Sector, value: string | boolean) => {
        const newSectors = [...sectors];
        // @ts-ignore
        newSectors[index][field] = value;
        setSectors(newSectors);
    };
    
    const handleUpdateIntegration = (field: keyof Integrations, value: string) => {
        setIntegrations(prev => ({ ...prev, [field]: value }));
    };

    const handleAddSector = () => {
        setSectors([
            ...sectors,
            { id: `new-${Date.now()}`, name: 'Novo Setor', password: '', isLocked: true }
        ]);
    };

    const handleRemoveSector = (index: number) => {
        if (sectors[index].id === 'geral') {
            toast({ title: 'Ação Inválida', description: 'O setor "Geral" não pode ser removido.', variant: 'destructive' });
            return;
        }
        const newSectors = sectors.filter((_, i) => i !== index);
        setSectors(newSectors);
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        try {
            const chatSettingsRef = doc(db, 'app_settings', 'chat_sectors');
            await setDoc(chatSettingsRef, { sectors });
            
            const integrationsRef = doc(db, 'app_settings', 'integrations');
            await setDoc(integrationsRef, integrations, { merge: true });

            toast({
                title: 'Configurações Salvas!',
                description: 'As configurações do sistema foram atualizadas com sucesso.',
            });
        } catch (error) {
            console.error("Error saving settings: ", error);
            toast({
                title: 'Erro ao Salvar',
                description: 'Não foi possível salvar as configurações.',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleResetCollection = async (collectionName: string) => {
        setIsResetting(collectionName);
        toast({ title: 'Iniciando a limpeza...', description: `Aguarde enquanto removemos os dados de "${collectionName}".` });
        try {
            if (collectionName === 'document_folders') {
                // Special handling for nested collections and storage files
                const foldersQuery = query(collection(db, 'document_folders'));
                const foldersSnapshot = await getDocs(foldersQuery);
                for (const folderDoc of foldersSnapshot.docs) {
                    const documentsQuery = query(collection(db, `document_folders/${folderDoc.id}/documents`));
                    const documentsSnapshot = await getDocs(documentsQuery);
                    const batch = writeBatch(db);
                    for(const docToDelete of documentsSnapshot.docs) {
                        // Delete file from Storage
                        const storagePath = docToDelete.data().storagePath;
                        if (storagePath) {
                            const fileRef = ref(storage, storagePath);
                            try {
                                await deleteObject(fileRef);
                            } catch (storageError: any) {
                                // Ignore not-found errors, as the file might have been deleted manually
                                if (storageError.code !== 'storage/object-not-found') {
                                    throw storageError;
                                }
                            }
                        }
                        // Delete Firestore document
                        batch.delete(docToDelete.ref);
                    }
                    await batch.commit();
                    // Finally delete the folder itself
                    await deleteDoc(doc(db, 'document_folders', folderDoc.id));
                }

            } else {
                // Standard collection deletion
                const collectionRef = collection(db, collectionName);
                const snapshot = await getDocs(collectionRef);
                const batch = writeBatch(db);
                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
            }
            toast({ title: 'Sucesso!', description: `Todos os dados de "${collectionName}" foram removidos.`, duration: 5000 });
        } catch (error) {
            console.error(`Error resetting ${collectionName}: `, error);
            toast({ title: 'Erro na Limpeza', description: `Não foi possível remover os dados de "${collectionName}". Verifique o console.`, variant: 'destructive' });
        } finally {
            setIsResetting(null);
        }
    };

    const ResetButton = ({ collectionName, label }: { collectionName: string; label: string; }) => (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={!!isResetting}>
                    {isResetting === collectionName && <LogoSpinner className='mr-2' />}
                    Limpar {label}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação é <span className='font-bold'>irreversível</span> e excluirá permanentemente <span className='font-bold'>TODOS</span> os dados da coleção de <span className='font-bold'>{label}</span>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleResetCollection(collectionName)} className="bg-destructive hover:bg-destructive/80">
                        Sim, entendo e quero excluir
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );


    return (
        <main className="flex-1 p-6">
            <div className="flex items-center justify-end mb-6">
                <Button onClick={handleSaveChanges} disabled={isSaving || loading}>
                    {isSaving ? <LogoSpinner className="mr-2" /> : null}
                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
            </div>
            
            <div className='space-y-6'>
                <Card>
                    <CardHeader>
                        <CardTitle>Integrações</CardTitle>
                        <CardDescription>
                            Conecte o painel a serviços de terceiros, como o Google Analytics.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         {loading ? <div className='h-20 flex items-center justify-center bg-muted rounded-lg'><LogoSpinner className="h-8 w-8" /></div> : (
                            <div className='space-y-1'>
                                <label className="text-sm font-medium">ID de Acompanhamento do Google Analytics 4</label>
                                <Input 
                                    value={integrations.googleAnalyticsId || ''} 
                                    onChange={(e) => handleUpdateIntegration('googleAnalyticsId', e.target.value)} 
                                    placeholder="G-XXXXXXXXXX"
                                />
                            </div>
                         )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Setores do Chat</CardTitle>
                        <CardDescription>
                            Crie e gerencie os departamentos de atendimento do chat e suas senhas de acesso.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {loading ? (
                            <div className="space-y-4">
                                <div className="h-20 flex items-center justify-center bg-muted rounded-lg"><LogoSpinner className="h-8 w-8" /></div>
                                <div className="h-20 flex items-center justify-center bg-muted rounded-lg"><LogoSpinner className="h-8 w-8" /></div>
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                {sectors.map((sector, index) => (
                                    <div key={sector.id} className="flex items-end gap-4 p-4 border rounded-lg">
                                        <div className="flex-1 grid grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor={`name-${index}`} className="text-sm font-medium">Nome do Setor</label>
                                                <Input
                                                    id={`name-${index}`}
                                                    value={sector.name}
                                                    onChange={(e) => handleUpdateSector(index, 'name', e.target.value)}
                                                    disabled={sector.id === 'geral'}
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor={`password-${index}`} className="text-sm font-medium">Senha de Acesso</label>
                                                <Input
                                                    id={`password-${index}`}
                                                    type="password"
                                                    value={sector.password || ''}
                                                    onChange={(e) => handleUpdateSector(index, 'password', e.target.value)}
                                                    disabled={!sector.isLocked}
                                                    placeholder={sector.isLocked ? 'Digite a senha' : 'Não requer senha'}
                                                />
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveSector(index)}
                                            disabled={sector.id === 'geral'}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <Separator />
                        <div className="flex justify-end">
                            <Button variant="outline" onClick={handleAddSector}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Adicionar Setor
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-destructive">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle />
                            Ações Perigosas
                        </CardTitle>
                        <CardDescription className='text-destructive'>
                            As ações nesta seção são irreversíveis e apagarão permanentemente os dados. Tenha certeza absoluta antes de prosseguir.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4'>
                         <ResetButton collectionName="budgets" label="Orçamentos" />
                         <ResetButton collectionName="finance" label="Financeiro" />
                         <ResetButton collectionName="receipts" label="Recibos" />
                         <ResetButton collectionName="contracts" label="Contratos" />
                         <ResetButton collectionName="leads" label="Leads" />
                         <ResetButton collectionName="tasks" label="Tarefas" />
                         <ResetButton collectionName="appointments" label="Reuniões" />
                         <ResetButton collectionName="blog" label="Blog" />
                         <ResetButton collectionName="portfolio" label="Portfólio" />
                         <ResetButton collectionName="partners" label="Parceiros" />
                         <ResetButton collectionName="document_folders" label="Documentos" />
                    </CardContent>
                </Card>

            </div>
        </main>
    );
}
