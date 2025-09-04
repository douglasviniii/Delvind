
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db, storage } from '../../../lib/firebase';
import { collection, addDoc, query, onSnapshot, orderBy, doc, deleteDoc, updateDoc, getDocs, where, writeBatch, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';
import { useToast } from '../../../hooks/use-toast';
import { Folder, FileText, PlusCircle, Upload, Trash2, Eye, Share2, FolderOpen, ChevronRight, Home, Loader2, FolderUp } from 'lucide-react';
import { Skeleton } from '../../../components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../../components/ui/alert-dialog';
import { LogoSpinner } from '@/components/ui/logo-spinner';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';

type FolderType = {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: any;
};

type DocumentType = {
  id: string;
  name: string;
  fileUrl: string;
  folderId: string | null;
  createdAt: any;
  storagePath: string;
  sharedWith?: string[];
};

type Customer = {
  uid: string;
  displayName: string;
};

// --- Componentes da Árvore de Pastas ---

const FolderNode = ({ folder, allFolders, selectedFolderId, onSelectFolder, level }: { folder: FolderType, allFolders: FolderType[], selectedFolderId: string | null, onSelectFolder: (folderId: string | null) => void, level: number }) => {
    const children = allFolders.filter(f => f.parentId === folder.id);
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div style={{ paddingLeft: `${level * 1}rem` }}>
            <div 
                className={cn(
                    'flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted',
                    selectedFolderId === folder.id && 'bg-muted font-semibold'
                )}
                onClick={() => onSelectFolder(folder.id)}
            >
                {children.length > 0 ? (
                    <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform', isOpen && 'rotate-90')} onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}/>
                ) : (
                    <div className="w-4 h-4" />
                )}
                <Folder className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate flex-1">{folder.name}</span>
            </div>
            {isOpen && children.length > 0 && (
                <div className="mt-1">
                    {children.map(child => <FolderNode key={child.id} folder={child} allFolders={allFolders} selectedFolderId={selectedFolderId} onSelectFolder={onSelectFolder} level={level + 1} />)}
                </div>
            )}
        </div>
    );
};

const FolderTree = ({ folders, selectedFolderId, onSelectFolder }: { folders: FolderType[], selectedFolderId: string | null, onSelectFolder: (folderId: string | null) => void }) => {
    const rootFolders = folders.filter(f => f.parentId === null);

    return (
        <nav className="space-y-1">
             <div 
                className={cn(
                    'flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted',
                    selectedFolderId === null && 'bg-muted font-semibold'
                )}
                onClick={() => onSelectFolder(null)}
            >
                <Home className="h-4 w-4 shrink-0" />
                <span className="truncate flex-1">Início</span>
            </div>
            {rootFolders.map(folder => (
                <FolderNode 
                    key={folder.id} 
                    folder={folder} 
                    allFolders={folders} 
                    selectedFolderId={selectedFolderId} 
                    onSelectFolder={onSelectFolder} 
                    level={0} 
                />
            ))}
        </nav>
    );
};

const folderSchema = z.object({
  name: z.string().min(2, 'O nome da pasta é obrigatório.'),
});

export default function DocumentsPage() {
  const [allFolders, setAllFolders] = useState<FolderType[]>([]);
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<DocumentType | null>(null);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharingDocument, setSharingDocument] = useState<DocumentType | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  
  const { toast } = useToast();

  const folderForm = useForm<z.infer<typeof folderSchema>>({
    resolver: zodResolver(folderSchema),
    defaultValues: { name: '' },
  });

  const uploadInputRef = React.useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    setLoading(true);
    const allFoldersQuery = query(collection(db, 'document_folders'), orderBy('name', 'asc'));
    const unsubscribeAllFolders = onSnapshot(allFoldersQuery, (snapshot) => {
        setAllFolders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FolderType)));
    }, (error) => {
        console.error(error);
        toast({title: "Erro ao buscar pastas", variant: "destructive"})
    });

    const docsQuery = query(collection(db, 'documents'), where('folderId', '==', currentFolderId), orderBy('createdAt', 'desc'));
    const unsubscribeDocs = onSnapshot(docsQuery, (snapshot) => {
        setDocuments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DocumentType)));
        setLoading(false);
    });

    if (customers.length === 0) {
        const fetchCustomers = async () => {
            const custQuery = query(collection(db, 'users'), where('role', '==', 'customer'));
            const querySnapshot = await getDocs(custQuery);
            setCustomers(querySnapshot.docs.map(doc => ({ uid: doc.id, displayName: doc.data().displayName })));
        };
        fetchCustomers();
    }

    return () => {
        unsubscribeAllFolders();
        unsubscribeDocs();
    };
  }, [currentFolderId, toast, customers.length]);

  const handleCreateFolder = async (values: z.infer<typeof folderSchema>) => {
    try {
      await addDoc(collection(db, 'document_folders'), {
        name: values.name,
        parentId: currentFolderId,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Pasta Criada!' });
      setIsFolderModalOpen(false);
      folderForm.reset();
    } catch (e) {
      toast({ title: 'Erro', description: 'Não foi possível criar a pasta.', variant: 'destructive' });
    }
  };

    const deleteFolderRecursive = useCallback(async (folderId: string) => {
        const docsQuery = query(collection(db, 'documents'), where('folderId', '==', folderId));
        const docsSnapshot = await getDocs(docsQuery);
        const docBatch = writeBatch(db);
        for (const docToDelete of docsSnapshot.docs) {
            const storagePath = docToDelete.data().storagePath;
            if (storagePath) {
                try {
                    await deleteObject(ref(storage, storagePath));
                } catch (storageError: any) {
                    if (storageError.code !== 'storage/object-not-found') throw storageError;
                }
            }
            docBatch.delete(docToDelete.ref);
        }
        await docBatch.commit();
    
        const subfoldersQuery = query(collection(db, 'document_folders'), where('parentId', '==', folderId));
        const subfoldersSnapshot = await getDocs(subfoldersQuery);
        for (const subfolderDoc of subfoldersSnapshot.docs) {
            await deleteFolderRecursive(subfolderDoc.id);
        }
    
        await deleteDoc(doc(db, 'document_folders', folderId));
    }, []);

    const handleDeleteFolder = useCallback(async (folderId: string, folderName: string) => {
        try {
            await deleteFolderRecursive(folderId);
            if (currentFolderId === folderId) {
                setCurrentFolderId(null);
            }
            toast({ title: `Pasta "${folderName}" e todo o seu conteúdo foram excluídos.` });
        } catch (e) {
            console.error("Error deleting folder:", e);
            toast({ title: 'Erro ao excluir', description: 'Não foi possível excluir a pasta e seu conteúdo.', variant: 'destructive'});
        }
    }, [deleteFolderRecursive, currentFolderId]);


  const handleDeleteDocument = async (docToDelete: DocumentType) => {
    try {
        const fileRef = ref(storage, docToDelete.storagePath);
        await deleteObject(fileRef);
        await deleteDoc(doc(db, "documents", docToDelete.id));
        toast({ title: 'Documento Excluído' });
    } catch (e) {
        toast({ title: 'Erro ao excluir', description: 'Não foi possível excluir o documento. Verifique as regras do Storage.', variant: 'destructive'});
    }
  };
  
    const handleFileUpload = useCallback(async (files: FileList) => {
        if (!files) return;
        setIsUploading(true);
        const uploadPromises = Array.from(files).map(async (file) => {
            const storagePath = `documents/${currentFolderId || 'root'}/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, storagePath);
            try {
                const snapshot = await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(snapshot.ref);
                
                await addDoc(collection(db, "documents"), {
                    name: file.name,
                    fileUrl: downloadURL,
                    storagePath: storagePath,
                    folderId: currentFolderId,
                    createdAt: serverTimestamp(),
                    sharedWith: [],
                });
            } catch (e) {
                console.error(`Upload error for ${file.name}:`, e);
                toast({ title: `Erro no Upload de ${file.name}`, variant: 'destructive' });
            }
        });

        await Promise.all(uploadPromises);
        setIsUploading(false);
        toast({ title: 'Upload Concluído', description: 'Seus arquivos foram salvos.'});
    }, [currentFolderId, toast]);
    
    const handleDirectoryUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            handleFileUpload(files);
        }
    };


  const handleOpenShareModal = (docToShare: DocumentType) => {
    setSharingDocument(docToShare);
    setSelectedCustomers(docToShare.sharedWith || []);
    setIsShareModalOpen(true);
  };
  
  const handleShareSubmit = async () => {
    if (!sharingDocument) return;
    setIsUploading(true);
    try {
      const docRef = doc(db, 'documents', sharingDocument.id);
      await updateDoc(docRef, { sharedWith: selectedCustomers });
      
      toast({ title: 'Compartilhamento Atualizado' });
      setIsShareModalOpen(false);
      setSharingDocument(null);
    } catch (error) {
      console.error("Share error:", error);
      toast({ title: 'Erro ao compartilhar', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const currentFolderName = allFolders.find(f => f.id === currentFolderId)?.name || 'Início';
  const subFolders = allFolders.filter(f => f.parentId === currentFolderId);

  return (
    <>
      <main className="flex flex-col h-full overflow-hidden">
          <div className="flex items-center justify-end mb-6">
              <div className='flex gap-2'>
                  <Button onClick={() => setIsFolderModalOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Nova Pasta</Button>
                  <input
                      type="file"
                      ref={uploadInputRef}
                      onChange={handleDirectoryUpload}
                      className="hidden"
                      multiple
                  />
                  <Button variant="outline" onClick={() => uploadInputRef.current?.click()} disabled={isUploading}>
                      {isUploading ? <LogoSpinner className='mr-2'/> : <FolderUp className="mr-2 h-4 w-4" />}
                      {isUploading ? 'Enviando...' : 'Upload'}
                  </Button>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 flex-1 overflow-hidden">
              <Card className="flex-col hidden md:flex">
                  <CardHeader>
                      <CardTitle>Navegador</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto">
                    <FolderTree folders={allFolders} selectedFolderId={currentFolderId} onSelectFolder={setCurrentFolderId} />
                  </CardContent>
              </Card>

              <Card className="flex flex-col">
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                          {currentFolderId ? <FolderOpen /> : <Home />}
                          {currentFolderName}
                      </CardTitle>
                      <CardDescription>
                          {isUploading ? 'Fazendo upload de arquivos, por favor aguarde...' : `Visualizando conteúdo de ${currentFolderName}`}
                      </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto space-y-4">
                      <h3 className="font-semibold">Pastas ({subFolders.length})</h3>
                      {loading ? <Skeleton className="h-20 w-full" /> : subFolders.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                              {subFolders.map(folder => (
                                  <div key={folder.id} className="group relative">
                                      <Button variant="secondary" className="w-full h-24 flex flex-col gap-2" onClick={() => setCurrentFolderId(folder.id)}>
                                          <Folder className="w-8 h-8 text-primary"/>
                                          <span className="truncate w-full">{folder.name}</span>
                                      </Button>
                                      <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                              <Button size="icon" variant="destructive" className='absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity'><Trash2 className="w-3 h-3"/></Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                              <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir a pasta "{folder.name}" e todo o seu conteúdo? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                                              <AlertDialogFooter>
                                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                  <AlertDialogAction onClick={() => handleDeleteFolder(folder.id, folder.name)} className='bg-red-600 hover:bg-red-700'>Sim, excluir tudo</AlertDialogAction>
                                              </AlertDialogFooter>
                                          </AlertDialogContent>
                                      </AlertDialog>
                                  </div>
                              ))}
                          </div>
                      ) : <p className="text-sm text-center text-muted-foreground py-4">Nenhuma subpasta aqui.</p>}
                      
                      <h3 className="font-semibold pt-4">Documentos ({documents.length})</h3>
                      {loading ? <Skeleton className="h-48 w-full" /> : documents.length > 0 ? (
                           <Table>
                               <TableHeader>
                                   <TableRow>
                                       <TableHead>Nome</TableHead>
                                       <TableHead>Data de Criação</TableHead>
                                       <TableHead className="text-right">Ações</TableHead>
                                   </TableRow>
                               </TableHeader>
                               <TableBody>
                                   {documents.map(docItem => (
                                       <TableRow key={docItem.id}>
                                           <TableCell className="font-medium">
                                               <div className="flex items-center gap-2">
                                                   <FileText className="h-4 w-4 text-muted-foreground" />
                                                   <span className="truncate">{docItem.name}</span>
                                               </div>
                                           </TableCell>
                                           <TableCell>{docItem.createdAt?.toDate().toLocaleDateString('pt-BR')}</TableCell>
                                           <TableCell className="text-right space-x-1">
                                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setViewingDocument(docItem); setIsViewModalOpen(true);}}>
                                                   <Eye className="w-4 h-4"/>
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleOpenShareModal(docItem)}>
                                                    <Share2 className="w-4 h-4"/>
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="w-4 h-4"/></Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir o documento "{docItem.name}"? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteDocument(docItem)} className='bg-red-600 hover:bg-red-700'>Sim, excluir</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                           </TableCell>
                                       </TableRow>
                                   ))}
                               </TableBody>
                           </Table>
                      ) : (
                          <div className="text-center py-8 text-muted-foreground">
                              <p>Nenhum documento nesta pasta.</p>
                          </div>
                      )}
                  </CardContent>
              </Card>
          </div>
      </main>

      <Dialog open={isFolderModalOpen} onOpenChange={setIsFolderModalOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>Criar Pasta em: {currentFolderName}</DialogTitle></DialogHeader>
                <Form {...folderForm}>
                    <form onSubmit={folderForm.handleSubmit(handleCreateFolder)} className="space-y-4">
                        <FormField control={folderForm.control} name="name" render={({ field }) => (
                            <FormItem><FormLabel>Nome da Pasta</FormLabel><FormControl><Input {...field} placeholder="Ex: Contratos de 2024" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <DialogFooter><Button type="submit">Criar</Button></DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
        
       <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
            <DialogContent className="max-w-4xl h-[90vh]">
                <DialogHeader>
                    <DialogTitle>{viewingDocument?.name}</DialogTitle>
                </DialogHeader>
                <div className="h-full py-4 -mx-6 px-6">
                    {viewingDocument?.fileUrl && (
                        <iframe 
                            src={viewingDocument.fileUrl.endsWith('.pdf') ? viewingDocument.fileUrl : `https://docs.google.com/gview?url=${encodeURIComponent(viewingDocument.fileUrl)}&embedded=true`} 
                            className="w-full h-full border-0" 
                            title={viewingDocument.name}>
                        </iframe>
                    )}
                </div>
            </DialogContent>
       </Dialog>

        <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Compartilhar: {sharingDocument?.name}</DialogTitle>
                    <DialogDescription>Selecione os clientes que podem visualizar este documento.</DialogDescription>
                </DialogHeader>
                <ScrollArea className='max-h-80 my-4'>
                    <div className='space-y-2 p-2'>
                        {customers.length > 0 ? customers.map(customer => (
                            <div key={customer.uid} className='flex items-center space-x-2'>
                                <Checkbox
                                    id={`customer-${customer.uid}`}
                                    checked={selectedCustomers.includes(customer.uid)}
                                    onCheckedChange={(checked) => {
                                        return checked
                                            ? setSelectedCustomers([...selectedCustomers, customer.uid])
                                            : setSelectedCustomers(selectedCustomers.filter(id => id !== customer.uid));
                                    }}
                                />
                                <label htmlFor={`customer-${customer.uid}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{customer.displayName}</label>
                            </div>
                        )) : <p className='text-sm text-muted-foreground text-center'>Nenhum cliente encontrado.</p>}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsShareModalOpen(false)}>Cancelar</Button>
                    <Button onClick={handleShareSubmit} disabled={isUploading}>
                        {isUploading ? 'Salvando...' : 'Salvar Compartilhamento'}
                    </Button>
                </DialogFooter>
            </DialogContent>
       </Dialog>
    </>
  );
}
