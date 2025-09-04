
'use client';

import Link from 'next/link';
import { Logo } from './logo';
import { NAV_LINKS } from '../../lib/constants';
import { Instagram } from 'lucide-react';
import { Separator } from '../ui/separator';

export function FooterSection() {

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

  return (
    <footer className="w-full border-t bg-white/10 backdrop-blur-lg text-card-foreground shadow-lg">
      <div className="w-full px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Logo + Redes */}
          <div className="flex flex-col space-y-4">
            <Logo />
            <p className="text-muted-foreground text-sm">
              Soluções Inovadoras para um Mundo Digital.
            </p>
            <div className="flex space-x-4">
              <Link href="https://www.instagram.com/delvind.ia" target="_blank" className="text-muted-foreground hover:text-primary">
                <Instagram className="h-5 w-5" />
              </Link>
              <Link href="https://x.com/delvindltda" target="_blank" className="text-muted-foreground hover:text-primary">
                <XIcon className="h-4 w-4" />
              </Link>
              <Link href="https://www.facebook.com/delvind.oficial" target="_blank" className="text-muted-foreground hover:text-primary">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                </svg>
              </Link>
              <Link href="https://wa.me/5545988000647" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                <WhatsAppIcon className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Links Rápidos */}
          <div>
            <h3 className="font-semibold mb-4">Links Rápidos</h3>
            <ul className="space-y-2">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-primary">
                    {link.name}
                  </Link>
                </li>
              ))}
               <li>
                  <Link href="/trabalhe-conosco" className="text-sm text-muted-foreground hover:text-primary">
                    Trabalhe Conosco
                  </Link>
                </li>
            </ul>
          </div>

          {/* Políticas */}
          <div>
            <h3 className="font-semibold mb-4">Políticas</h3>
            <ul className="space-y-2">
              <li><Link href="/privacy-policy" className="text-sm text-muted-foreground hover:text-primary">Política de Privacidade</Link></li>
              <li><Link href="/cancellation-policy" className="text-sm text-muted-foreground hover:text-primary">Política de Cancelamento e Reembolso</Link></li>
              <li><Link href="/terms-of-use" className="text-sm text-muted-foreground hover:text-primary">Termo de Uso</Link></li>
              <li><Link href="/cookie-policy" className="text-sm text-muted-foreground hover:text-primary">Política de Cookies</Link></li>
              <li><Link href="/support-policy" className="text-sm text-muted-foreground hover:text-primary">Política de Atendimento e Suporte</Link></li>
              <li><Link href="/copyright-policy" className="text-sm text-muted-foreground hover:text-primary">Política de Direitos Autorais</Link></li>
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h3 className="font-semibold mb-4">Contato</h3>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Email: contato@delvind.com</p>
              <p>Suporte: suporte@delvind.com</p>
              <p>Telefone: 45 8800-0647</p>
              <p className='font-semibold mt-2'>CNPJ</p>
              <p>57.278.676/0001-69</p>
              <a 
                href="https://solucoes.receita.fazenda.gov.br/servicos/cnpjreva/cnpjreva_solicitacao.asp" 
                target='_blank' 
                rel='noopener noreferrer'
                className="text-xs hover:underline"
              >
                Consultar na Receita Federal
              </a>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Delvind Tecnologia Da Informação LTDA.
        </div>
      </div>
    </footer>
  );
}
