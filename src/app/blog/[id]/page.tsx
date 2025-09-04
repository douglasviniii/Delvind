'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '../../../lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot, collection, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { notFound, useParams } from 'next/navigation';
import Image from 'next/image';
import { Calendar, UserCircle, ArrowLeft, Heart, Share2, Send } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import Link from 'next/link';
import { Skeleton } from '../../../components/ui/skeleton';
import { Header } from '@/components/layout/header';
import { FooterSection } from '@/components/layout/footer-section';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuthState } from 'react-firebase-hooks/auth';


type Comment = {
    authorId: string;
    authorName: string;
    authorPhotoURL?: string;
    text: string;
    createdAt: any;
};

type BlogPost = {
  id: string;
  title: string;
  content: string;
  author: string;
  imageUrl: string;
  createdAt: any;
  likes?: string[];
};

function getAnonymousId(): string {
    if (typeof window === 'undefined') return '';
    let anonId = localStorage.getItem('anonymousUserId');
    if (!anonId) {
        anonId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        localStorage.setItem('anonymousUserId', anonId);
    }
    return anonId;
}

function getAnonymousLikes(): string[] {
    if (typeof window === 'undefined') return [];
    const likes = localStorage.getItem('anonymousLikes');
    return likes ? JSON.parse(likes) : [];
}

function addAnonymousLike(postId: string) {
    if (typeof window === 'undefined') return;
    const likes = getAnonymousLikes();
    if (!likes.includes(postId)) {
        const newLikes = [...likes, postId];
        localStorage.setItem('anonymousLikes', JSON.stringify(newLikes));
    }
}

function removeAnonymousLike(postId: string) {
    if (typeof window === 'undefined') return;
    const likes = getAnonymousLikes();
    const newLikes = likes.filter(id => id !== postId);
    localStorage.setItem('anonymousLikes', JSON.stringify(newLikes));
}


export default function BlogPostPage() {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const params = useParams();
  const id = params.id as string;

  const [hasLiked, setHasLiked] = useState(false);

  useEffect(() => {
    if (!id) return;

    const postRef = doc(db, 'blog', id);
    const unsubscribePost = onSnapshot(postRef, (docSnap) => {
      if (docSnap.exists()) {
        const postData = { id: docSnap.id, ...docSnap.data() } as BlogPost;
        setPost(postData);

        // Update like status
        if (user) {
          setHasLiked(postData.likes?.includes(user.uid) ?? false);
        } else {
          setHasLiked(getAnonymousLikes().includes(id));
        }
      } else {
        notFound();
      }
      setLoading(false);
    });

    const commentsQuery = query(collection(db, 'blog', id, 'comments'), orderBy('createdAt', 'asc'));
    const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
        setComments(snapshot.docs.map(doc => doc.data() as Comment));
    });


    return () => {
        unsubscribePost();
        unsubscribeComments();
    };
  }, [id, user]);

  const handleLike = async () => {
    const postRef = doc(db, 'blog', id);
    let likeId: string;

    if (user) {
        likeId = user.uid;
    } else {
        likeId = getAnonymousId();
    }

    const currentlyLiked = post?.likes?.includes(likeId) ?? false;
    
    // Optimistic update
    setHasLiked(!currentlyLiked);
    setPost(prev => prev ? ({ ...prev, likes: currentlyLiked ? prev.likes?.filter(l => l !== likeId) : [...(prev.likes || []), likeId] }) : null);

    try {
        await updateDoc(postRef, {
            likes: currentlyLiked ? arrayRemove(likeId) : arrayUnion(likeId)
        });
        if (!user) {
            // Update anonymous likes in local storage
            if (currentlyLiked) {
                removeAnonymousLike(id);
            } else {
                addAnonymousLike(id);
            }
        }
    } catch (error) {
        // Revert optimistic update on error
        setHasLiked(currentlyLiked);
        setPost(prev => prev ? ({...prev, likes: currentlyLiked ? [...(prev.likes || []), likeId] : prev.likes?.filter(l => l !== likeId)}) : null);
        toast({ title: "Erro", description: "Não foi possível registrar sua curtida.", variant: "destructive"});
    }
  };

  const handleShare = () => {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: 'Link Copiado!', description: 'O link do post foi copiado para sua área de transferência.' });
  }

  const handleCommentSubmit = async () => {
    if (!user) {
        toast({ title: 'Ação Requer Login', description: 'Você precisa estar logado para comentar.', variant: 'destructive'});
        return;
    }
    if(newComment.trim() === '') return;

    const commentData: Comment = {
        authorId: user.uid,
        authorName: user.displayName || 'Anônimo',
        authorPhotoURL: user.photoURL || '',
        text: newComment,
        createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, 'blog', id, 'comments'), commentData);
    setNewComment('');
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header/>
        <main className="flex-1">
          <div className="relative isolate min-h-screen">
            <div className="fixed inset-0 -z-10 bg-gradient-to-br from-white via-pink-100 to-blue-200" />
            <div className="container max-w-4xl py-12">
              <Skeleton className="h-12 w-3/4 mb-4" />
              <Skeleton className="h-6 w-1/2 mb-8" />
              <Skeleton className="w-full h-96 mb-8" />
              <div className="space-y-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-5/6" />
              </div>
            </div>
          </div>
        </main>
        <FooterSection/>
      </div>
    );
  }

  if (!post) {
    return notFound();
  }
  
  const formatDate = (timestamp: any) => {
    if (timestamp && timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString('pt-BR');
    }
    return 'Data inválida';
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header/>
      <main className="flex-1">
        <div className="relative isolate">
          <div className="fixed inset-0 -z-10 bg-gradient-to-br from-white via-pink-100 to-blue-200" />
          <article className="container max-w-4xl py-12">
            <div className='mb-8'>
              <Button asChild variant="outline" className="bg-card">
                <Link href="/blog">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar para o Blog
                </Link>
              </Button>
            </div>
            <header className="mb-8 text-center bg-card p-6 rounded-lg">
              <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">{post.title}</h1>
              <div className="flex justify-center items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <UserCircle className="w-5 h-5" />
                  <span>{post.author}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span>{formatDate(post.createdAt)}</span>
                </div>
              </div>
            </header>
            <div className="relative w-full h-96 mb-8 rounded-lg overflow-hidden shadow-xl">
              <Image
                src={post.imageUrl}
                alt={post.title}
                fill
                objectFit="cover"
                priority
              />
            </div>
            <div
              className="prose dark:prose-invert lg:prose-xl mx-auto bg-card p-6 rounded-lg"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
            
            {/* Interactions */}
            <div className="bg-card p-4 rounded-lg mt-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={handleLike} className="flex items-center gap-2">
                        <Heart className={`w-5 h-5 ${hasLiked ? 'text-red-500 fill-current' : ''}`} />
                        <span>{post.likes?.length || 0}</span>
                    </Button>
                </div>
                <Button variant="outline" onClick={handleShare}>
                    <Share2 className="w-5 h-5 mr-2" />
                    Compartilhar
                </Button>
            </div>

            {/* Comments Section */}
            <div className='bg-card p-6 rounded-lg mt-8'>
                <h3 className='text-2xl font-bold mb-6'>Comentários ({comments.length})</h3>
                <div className='space-y-6'>
                    {comments.map((comment, index) => (
                         <div key={index} className="flex items-start gap-4">
                             <Avatar>
                                <AvatarImage src={comment.authorPhotoURL} alt={comment.authorName} />
                                <AvatarFallback>{comment.authorName?.[0]}</AvatarFallback>
                             </Avatar>
                             <div className='flex-1'>
                                 <div className='flex items-baseline gap-2'>
                                     <p className='font-semibold'>{comment.authorName}</p>
                                     <p className='text-xs text-muted-foreground'>
                                        {comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true, locale: ptBR }) : ''}
                                     </p>
                                 </div>
                                 <p className='text-sm text-muted-foreground'>{comment.text}</p>
                             </div>
                         </div>
                    ))}
                </div>
                
                <div className='mt-8 pt-6 border-t'>
                    {user ? (
                        <div className="flex items-start gap-4">
                             <Avatar>
                                <AvatarImage src={user.photoURL || undefined} alt={user.displayName || ''}/>
                                <AvatarFallback>{user.displayName?.[0]}</AvatarFallback>
                             </Avatar>
                             <div className='flex-1 space-y-2'>
                                <Textarea 
                                    placeholder='Escreva seu comentário...'
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                />
                                <div className='flex justify-end'>
                                    <Button onClick={handleCommentSubmit} disabled={!newComment.trim()}>
                                        <Send className="mr-2 h-4 w-4"/>Comentar
                                    </Button>
                                </div>
                             </div>
                        </div>
                    ) : (
                        <p className='text-center text-sm text-muted-foreground'>
                            <Link href="/login" className='text-primary underline'>Faça login</Link> para deixar um comentário.
                        </p>
                    )}
                </div>
            </div>
          </article>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
