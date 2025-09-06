
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../context/auth-context';
import { Toaster } from '../components/ui/toaster';
import { CartProvider } from '@/context/cart-context';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Delvind | Especialistas em Posicionamento Digital no Oeste do Paraná',
  description: 'Especialistas em SEO e desenvolvimento de sites e aplicativos em Medianeira e região. Fazemos sua empresa aparecer nas primeiras posições do Google.',
  icons: {
    icon: 'https://darkgreen-lark-741030.hostingersite.com/img/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head />
      <body className={inter.className}>
          <AuthProvider>
            <CartProvider>
              {children}
              <Toaster />
            </CartProvider>
          </AuthProvider>
      </body>
    </html>
  );
}
