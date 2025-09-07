
'use client';

import Link from 'next/link';
import { Menu, Instagram, Twitter, ShoppingCart, User, LogOut } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from '../ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Logo } from './logo';
import { NAV_LINKS } from '../../lib/constants';
import { useCart } from '@/context/cart-context';
import { useAuth } from '@/context/auth-context';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export function Header() {
    const { cartCount } = useCart();
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const handleLogout = async () => {
      try {
        await signOut(auth);
        toast({ title: "Logout bem-sucedido!" });
        router.push('/');
      } catch (error) {
        toast({ title: "Erro ao sair", variant: "destructive" });
      }
    };

    const userInitial = user?.displayName?.[0] || user?.email?.[0] || 'U';

    const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
        <svg aria-hidden="true" fill="currentColor" viewBox="0 0 448 512" {...props}>
            <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.8 0-65.7-10.8-94-31.5l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5c0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
        </svg>
    );

    const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
        <svg aria-hidden="true" fill="currentColor" viewBox="0 0 300 271" {...props}>
          <path d="M236 0h46L181 113l119 158h-92l-72-96-60 96H0l103-150L-1 0h95l58 76 64-76zM215 241h24L61 28H36l179 213z"></path>
        </svg>
    );

    const SocialIcons = ({className}: {className?: string}) => (
        <div className={className}>
            <Button asChild variant="ghost" size="icon"><Link href="https://www.instagram.com/delvind.ia" target="_blank"><Instagram /></Link></Button>
            <Button asChild variant="ghost" size="icon"><Link href="https://x.com/delvindltda" target="_blank"><XIcon className="h-4 w-4"/></Link></Button>
            <Button asChild variant="ghost" size="icon"><Link href="https://www.facebook.com/delvind.oficial" target="_blank">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                </svg>
            </Link></Button>
             <Button asChild variant="ghost" size="icon">
                <Link href="https://wa.me/5545988000647" target="_blank" rel="noopener noreferrer">
                    <WhatsAppIcon className="w-5 h-5" />
                </Link>
            </Button>
        </div>
    );


  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 hidden md:flex">
          <Logo />
        </div>
        <div className="flex items-center space-x-2 md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Alternar Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="pr-0 bg-background/80 backdrop-blur-sm" aria-label="Menu Principal">
              <div className="flex flex-col h-full">
                <div className="p-4 border-b">
                  <Logo />
                </div>
                <nav className="flex-1 flex flex-col items-start space-y-2 p-4">
                  {NAV_LINKS.map((link) => (
                    <SheetClose asChild key={link.name}>
                      <Link href={link.href}>
                        <Button variant="link" className="text-lg text-foreground">{link.name}</Button>
                      </Link>
                    </SheetClose>
                  ))}
                </nav>
                 <div className="p-4 mt-auto border-t space-y-4">
                    <SocialIcons className="flex justify-center space-x-4" />
                    {user ? (
                        <div className="text-center">
                            <p className="font-semibold">{user.displayName}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            <Button asChild className="w-full mt-2"><Link href="/dashboard">Meu Painel</Link></Button>
                            <Button variant="ghost" className="w-full mt-2 text-red-500" onClick={handleLogout}>Sair da conta</Button>
                        </div>
                    ) : (
                        <SheetClose asChild>
                            <Link href="/login">
                                <Button className="w-full">Login</Button>
                            </Link>
                        </SheetClose>
                    )}
                 </div>
              </div>
            </SheetContent>
          </Sheet>
          <div className="md:hidden ml-2">
            <Logo />
          </div>
        </div>

        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end space-x-2">
            <SocialIcons className="hidden md:flex items-center space-x-2"/>
            <Button variant="ghost" size="icon" asChild>
              <Link href="/loja/cart" className="relative">
                <ShoppingCart className="h-7 w-7 text-primary" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                    {cartCount}
                  </span>
                )}
                <span className="sr-only">Carrinho</span>
              </Link>
            </Button>
            {user ? (
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                             <Avatar>
                                <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'Avatar'}/>
                                <AvatarFallback>{userInitial}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>
                            <p>{user.displayName}</p>
                            <p className='text-xs text-muted-foreground font-normal'>{user.email}</p>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild><Link href="/dashboard"><User className="mr-2 h-4 w-4"/>Meu Painel</Link></DropdownMenuItem>
                        <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500">
                           <LogOut className="mr-2 h-4 w-4"/> Sair
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                 </DropdownMenu>
            ) : (
                <Link href="/login">
                  <Button>Login</Button>
                </Link>
            )}
        </div>
      </div>
    </header>
  );
}
