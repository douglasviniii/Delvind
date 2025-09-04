
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../context/auth-context';
import { Toaster } from '../components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Delvind',
  description: 'Delvind - Soluções Digitais',
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
            {children}
            <Toaster />
          </AuthProvider>
      </body>
    </html>
  );
}
