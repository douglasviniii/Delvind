
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

export default function CopyrightPolicyPage() {
  return (
    <PolicyPageLayout title="Política de Direitos Autorais">
      <p><strong>Última atualização:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
      
      <h2>1. Propriedade Intelectual da Delvind</h2>
      <p>
        Todo o conteúdo presente neste site, incluindo, mas não se limitando a, textos, gráficos, logotipos, ícones, imagens, clipes de áudio, downloads digitais, compilações de dados e software, é propriedade exclusiva da <strong>Delvind Tecnologia Da Informação LTDA</strong> ou de seus fornecedores de conteúdo e protegido pelas leis brasileiras e internacionais de direitos autorais.
      </p>
      <p>
        A marca Delvind e seu logotipo são marcas registradas. A utilização não autorizada de nossa marca e identidade visual é estritamente proibida.
      </p>
      
      <h2>2. Uso do Conteúdo</h2>
      <p>
        É permitido o download e a impressão de conteúdo do site para uso pessoal e não comercial, desde que todos os avisos de direitos autorais e outras notificações de propriedade sejam mantidos intactos. Qualquer outro uso, incluindo a reprodução, modificação, distribuição, transmissão, republicação, exibição ou execução do conteúdo do site, é estritamente proibido sem a nossa permissão expressa por escrito.
      </p>
      
      <h2>3. Propriedade Intelectual dos Clientes</h2>
      <p>
        Respeitamos integralmente os direitos autorais dos nossos clientes. Todo o material fornecido por clientes para a execução de projetos (textos, imagens, logotipos, etc.) permanece como propriedade intelectual do cliente. A Delvind utiliza este material exclusivamente para os fins acordados no contrato de prestação de serviços.
      </p>
      <p>
        Ao final de um projeto de desenvolvimento, como um site ou aplicativo, os direitos sobre o código-fonte e o design final são transferidos ao cliente, conforme estipulado em contrato, após a quitação de todos os pagamentos.
      </p>

      <h2>4. Reivindicações de Violação de Direitos Autorais</h2>
      <p>
        Se você acredita que seu trabalho foi copiado de uma forma que constitui violação de direitos autorais, por favor, nos forneça as seguintes informações:
      </p>
      <ul>
        <li>Uma descrição do trabalho protegido por direitos autorais que você alega ter sido violado.</li>
        <li>Uma descrição de onde o material que você alega estar infringindo está localizado no site.</li>
        <li>Seu endereço, número de telefone e endereço de e-mail.</li>
        <li>Uma declaração sua, feita sob pena de perjúrio, de que as informações acima em sua notificação são precisas e que você é o proprietário dos direitos autorais ou está autorizado a agir em nome do proprietário dos direitos autorais.</li>
      </ul>
      <p>
        As reivindicações devem ser enviadas para o nosso agente de direitos autorais no e-mail: <strong>contato@delvind.com</strong>.
      </p>
    </PolicyPageLayout>
  );
}
