
import { Header } from "@/components/layout/header";
import { FooterSection } from "@/components/layout/footer-section";

const PolicyPageLayout = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1">
            <div className="relative isolate">
                <div className="fixed inset-0 -z-10 bg-gradient-to-br from-white via-pink-100 to-blue-200" />
                <div className="container max-w-4xl py-12">
                    <article className="prose lg:prose-xl mx-auto bg-card p-8 rounded-lg shadow-lg">
                        <h1>{title}</h1>
                        {children}
                    </article>
                </div>
            </div>
        </main>
        <FooterSection />
    </div>
);

export default function CookiePolicyPage() {
  return (
    <PolicyPageLayout title="Política de Cookies">
      <p><strong>Última atualização:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
      
      <h2>1. O que são cookies?</h2>
      <p>
        Cookies são pequenos arquivos de texto que um site, quando visitado, coloca no computador do usuário ou no seu dispositivo móvel, através do navegador de internet (browser). A colocação de cookies ajudará o site a reconhecer o seu dispositivo na próxima vez que o visitar.
      </p>
      
      <h2>2. Para que servem os cookies?</h2>
      <p>
        Utilizamos cookies para melhorar a sua experiência de navegação, tornando-a mais rápida e eficiente. Eles eliminam a necessidade de introduzir repetidamente as mesmas informações e ajudam a determinar a utilidade, interesse e o número de utilizações dos sites.
      </p>
      
      <h2>3. Que tipo de cookies utilizamos?</h2>
      <ul>
        <li>
          <strong>Cookies Essenciais:</strong> São fundamentais para acessar áreas específicas do nosso site. Permitem a navegação no site e a utilização das suas aplicações, tal como acessar áreas seguras através de login. Sem estes cookies, os serviços que o exijam não podem ser prestados.
        </li>
        <li>
          <strong>Cookies Analíticos:</strong> São utilizados para analisar a forma como os usuários usam o site e monitorar a performance deste. Isto permite-nos fornecer uma experiência de alta qualidade ao personalizar a nossa oferta e rapidamente identificar e corrigir quaisquer problemas que surjam. (Ex: Google Analytics).
        </li>
        <li>
          <strong>Cookies de Funcionalidade:</strong> Guardam as preferências do usuário relativamente à utilização do site, de forma que não seja necessário voltar a configurar o site cada vez que o visita.
        </li>
        <li>
          <strong>Cookies de Terceiros:</strong> Medem o sucesso de aplicações e a eficácia da publicidade de terceiros. Podem também ser utilizados no sentido de personalizar um widget com dados do usuário.
        </li>
      </ul>
      
      <h2>4. Como gerenciar os cookies?</h2>
      <p>
        Todos os browsers permitem ao usuário aceitar, recusar ou apagar cookies, nomeadamente através da seleção das definições apropriadas no respetivo navegador. Você pode configurar os cookies no menu "opções" ou "preferências" do seu browser.
      </p>
      <p>
        Note, no entanto, que, ao desativar cookies, pode impedir que alguns serviços da web funcionem corretamente, afetando, parcial ou totalmente, a navegação no website.
      </p>
      
      <h2>5. Alterações a esta Política de Cookies</h2>
      <p>
        Reservamo-nos o direito de, a qualquer momento, proceder a reajustamentos ou alterações à presente Política de Cookies. Se continuar a usar o nosso site, está a concordar com estas alterações.
      </p>

      <h2>6. Contato</h2>
      <p>Para dúvidas sobre esta política, entre em contato conosco através do e-mail: <strong>contato@delvind.com</strong>.</p>
    </PolicyPageLayout>
  );
}
