
'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '../../../lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, collectionGroup, updateDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Eye, Download, FileText, Calendar } from 'lucide-react';
import { Skeleton } from '../../../components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';

type SharedDocument = {
  id: string;
  name: string;
  fileUrl?: string; // For regular files
  content?: string; // For reports
  isReport: boolean;
  folderId: string;
  createdAt: any;
  authorName?: string;
  viewedByClient?: boolean;
};

export default function CustomerDocumentsPage() {
  const [user, authLoading] = useAuthState(auth);
  const [documents, setDocuments] = useState<SharedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<SharedDocument | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (authLoading || !user) {
      if (!authLoading) setLoading(false);
      return;
    }
    
    // Query for shared files
    const filesQuery = query(
        collection(db, 'documents'), 
        where('sharedWith', 'array-contains', user.uid)
    );
    const unsubscribeFiles = onSnapshot(filesQuery, (snapshot) => {
        const fileDocs = snapshot.docs.map(d => ({...d.data(), id: d.id, isReport: false} as SharedDocument));
        setDocuments(prev => [...prev.filter(p => p.isReport), ...fileDocs]);
    });

    // Query for shared reports
    const reportsQuery = query(
        collection(db, 'reports'),
        where('recipientId', '==', user.uid),
        where('status', '==', 'Enviado')
    );
     const unsubscribeReports = onSnapshot(reportsQuery, (snapshot) => {
        const reportDocs = snapshot.docs.map(d => {
            const data = d.data();
            return {
                ...data,
                id: d.id,
                name: data.title,
                createdAt: data.sentAt,
                isReport: true,
            } as SharedDocument
        });
        setDocuments(prev => [...prev.filter(p => !p.isReport), ...reportDocs]);
    });

    setLoading(false);

    return () => {
        unsubscribeFiles();
        unsubscribeReports();
    };
  }, [user, authLoading]);
  
  const handleDownloadPdf = async (docToDownload: SharedDocument) => {
    if (!docToDownload.content) {
        toast({ title: 'Ação não disponível', description: 'O download de PDF está disponível apenas para relatórios.', variant: 'destructive'});
        return;
    }
    
    const { jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');

    const input = document.getElementById('report-content-for-pdf');
    if (!input) {
        toast({title: 'Erro', description: 'Não foi possível encontrar o conteúdo para gerar o PDF.', variant: 'destructive'});
        return;
    }

    try {
        const canvas = await html2canvas(input, { scale: 2, useCORS: true, backgroundColor: null });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfWidth * (canvas.height / canvas.width));
        pdf.save(`${docToDownload.name.replace(/ /g, '_')}.pdf`);
    } catch (err) {
        console.error("Error generating PDF", err);
        toast({ title: 'Erro ao gerar PDF', variant: 'destructive' });
    }
  };


  const handleViewDialog = async (docToView: SharedDocument) => {
    setViewingDocument(docToView);
    setIsViewDialogOpen(true);
    
    if (docToView.isReport) {
      if (!docToView.viewedByClient) {
        await updateDoc(doc(db, 'reports', docToView.id), { viewedByClient: true });
      }
    } else {
       // Logic to mark regular documents as viewed
       const docRef = doc(db, 'documents', docToView.id);
       const docSnap = await getDoc(docRef);
       if (docSnap.exists() && docSnap.data().viewedByClient === false) {
           await updateDoc(docRef, { viewedByClient: true });
       }
    }
  };
  
  const sortedDocuments = documents.sort((a,b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

  const formatDate = (timestamp: any) => timestamp?.toDate().toLocaleDateString('pt-BR') || '...';


  const renderDesktopTable = () => (
    <Table className="hidden md:table">
        <TableHeader>
            <TableRow>
            <TableHead>Título do Documento</TableHead>
            <TableHead>Enviado por</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="text-right">Ações</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {sortedDocuments.map((docItem) => (
            <TableRow key={docItem.id}>
                <TableCell className="font-medium flex items-center gap-2">
                    {docItem.name}
                    {!docItem.viewedByClient && (
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                    )}
                </TableCell>
                <TableCell>{docItem.authorName || 'Admin'}</TableCell>
                <TableCell>{formatDate(docItem.createdAt)}</TableCell>
                <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleViewDialog(docItem)}>
                        <Eye className="mr-2 h-4 w-4" /> Visualizar
                    </Button>
                    {!docItem.isReport && docItem.fileUrl && (
                        <Button asChild variant="secondary" size="sm">
                            <a href={docItem.fileUrl} target="_blank" rel="noopener noreferrer">
                                <Download className="mr-2 h-4 w-4" /> Baixar Original
                            </a>
                        </Button>
                    )}
                </TableCell>
            </TableRow>
            ))}
        </TableBody>
    </Table>
  );

  const renderMobileList = () => (
     <div className='md:hidden space-y-4'>
        {sortedDocuments.map(docItem => (
            <Card key={docItem.id}>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {docItem.name}
                         {!docItem.viewedByClient && (
                            <span className="relative flex h-2 w-2 ml-auto">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                        )}
                    </CardTitle>
                    <CardDescription className='flex flex-col gap-1 pt-1'>
                        <span>Enviado por: {docItem.authorName || 'Admin'}</span>
                         <span className='flex items-center gap-1.5'><Calendar className="h-3 w-3" /> {formatDate(docItem.createdAt)}</span>
                    </CardDescription>
                </CardHeader>
                <CardFooter className='flex-col items-stretch gap-2'>
                     <Button variant="outline" size="sm" onClick={() => handleViewDialog(docItem)} className='w-full'>
                        <Eye className="mr-2 h-4 w-4" /> Visualizar
                    </Button>
                    {!docItem.isReport && docItem.fileUrl && (
                        <Button asChild variant="secondary" size="sm" className='w-full'>
                            <a href={docItem.fileUrl} target="_blank" rel="noopener noreferrer">
                                <Download className="mr-2 h-4 w-4" /> Baixar Original
                            </a>
                        </Button>
                    )}
                </CardFooter>
            </Card>
        ))}
     </div>
  );

  return (
    <>
       <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>{viewingDocument?.name}</DialogTitle>
          </DialogHeader>
          <div className="h-full py-4 -mx-6 px-6">
            {viewingDocument?.isReport ? (
                <div id="report-content-for-pdf" className="prose dark:prose-invert max-h-full overflow-y-auto rounded-md border p-4 bg-white" dangerouslySetInnerHTML={{ __html: viewingDocument?.content || '' }} />
            ) : (
                 <iframe 
                    src={viewingDocument?.fileUrl?.endsWith('.pdf') ? viewingDocument?.fileUrl : `https://docs.google.com/gview?url=${encodeURIComponent(viewingDocument?.fileUrl || '')}&embedded=true`} 
                    className="w-full h-full border-0" 
                    title={viewingDocument?.name}>
                </iframe>
            )}
          </div>
          <DialogFooter>
             <Button variant="secondary" onClick={() => handleDownloadPdf(viewingDocument!)} disabled={!viewingDocument?.isReport}>
                <Download className="mr-2 h-4 w-4" /> Baixar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Documentos Compartilhados</CardTitle>
          <CardDescription>Aqui estão todos os documentos que a equipe da Delvind compartilhou com você.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
            </div>
          ) : sortedDocuments.length > 0 ? (
            <>
                {renderDesktopTable()}
                {renderMobileList()}
            </>
          ) : (
            <div className="text-center h-24 flex items-center justify-center">
                <p className="text-muted-foreground">Nenhum documento compartilhado com você.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
