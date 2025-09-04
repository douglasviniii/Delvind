
'use client';

import { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { useToast } from '../../../hooks/use-toast';
import { db } from '../../../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { LogoSpinner } from '../../../components/ui/logo-spinner';
import { Textarea } from '@/components/ui/textarea';

type CompanyInfo = {
    razaoSocial: string;
    cnpj: string;
    email: string;
    phone: string;
    address: string;
}

export default function CompanyInfoPage() {
    const { toast } = useToast();
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
        razaoSocial: '',
        cnpj: '',
        email: '',
        phone: '',
        address: ''
    });

    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            const companyInfoRef = doc(db, 'app_settings', 'company_info');
            const companySnap = await getDoc(companyInfoRef);
            if (companySnap.exists()) {
                setCompanyInfo(companySnap.data() as CompanyInfo);
            }
            setLoading(false);
        };
        fetchSettings();
    }, []);

    const handleUpdateCompanyInfo = (field: keyof CompanyInfo, value: string) => {
        setCompanyInfo(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        try {
            const companyInfoRef = doc(db, 'app_settings', 'company_info');
            await setDoc(companyInfoRef, companyInfo, { merge: true });

            toast({
                title: 'Informações Salvas!',
                description: 'Os dados da sua empresa foram atualizados com sucesso.',
            });
        } catch (error) {
            console.error("Error saving settings: ", error);
            toast({
                title: 'Erro ao Salvar',
                description: 'Não foi possível salvar as informações da empresa.',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <main className="flex-1 p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Informações da Empresa</h1>
                    <p className="text-muted-foreground">Gerencie os dados que aparecerão em orçamentos e contratos.</p>
                </div>
                <Button onClick={handleSaveChanges} disabled={isSaving || loading}>
                    {isSaving ? <LogoSpinner className="mr-2" /> : null}
                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Dados Cadastrais</CardTitle>
                    <CardDescription>
                        Preencha cuidadosamente. Estes dados serão utilizados em todos os documentos oficiais gerados pelo sistema.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {loading ? <div className='flex justify-center py-10'><LogoSpinner className="mx-auto" /></div> : (
                        <>
                            <div className='space-y-1'>
                                <label className="text-sm font-medium">Razão Social</label>
                                <Input value={companyInfo.razaoSocial} onChange={(e) => handleUpdateCompanyInfo('razaoSocial', e.target.value)} placeholder="Sua Razão Social LTDA"/>
                            </div>
                            <div className='space-y-1'>
                                <label className="text-sm font-medium">CNPJ</label>
                                <Input value={companyInfo.cnpj} onChange={(e) => handleUpdateCompanyInfo('cnpj', e.target.value)} placeholder="00.000.000/0001-00"/>
                            </div>
                            <div className='space-y-1'>
                                <label className="text-sm font-medium">E-mail de Contato</label>
                                <Input type="email" value={companyInfo.email} onChange={(e) => handleUpdateCompanyInfo('email', e.target.value)} placeholder="contato@suaempresa.com"/>
                            </div>
                            <div className='space-y-1'>
                                <label className="text-sm font-medium">Telefone</label>
                                <Input value={companyInfo.phone} onChange={(e) => handleUpdateCompanyInfo('phone', e.target.value)} placeholder="(00) 00000-0000" />
                            </div>
                            <div className='space-y-1'>
                                <label className="text-sm font-medium">Endereço Completo</label>
                                <Textarea value={companyInfo.address} onChange={(e) => handleUpdateCompanyInfo('address', e.target.value)} placeholder="Rua, Número, Bairro, Cidade - UF, CEP" />
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}
