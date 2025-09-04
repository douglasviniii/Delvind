
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

export default function PrivacyPolicyPage() {
  return (
    <PolicyPageLayout title="Política de Privacidade">
      <p><strong>Última atualização:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
      <p>
        A sua privacidade é importante para nós. É política da <strong>Delvind Tecnologia Da Informação LTDA</strong> respeitar a sua privacidade em relação a qualquer informação sua que possamos coletar no site Delvind e outros sites que possuímos e operamos. Esta política de privacidade está em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/18).
      </p>
      
      <h2>1. Coleta de Dados</h2>
      <p>
        Solicitamos informações pessoais apenas quando realmente precisamos delas para lhe fornecer um serviço. Fazemo-lo por meios justos e legais, com o seu conhecimento e consentimento. Também informamos por que estamos coletando e como será usado.
      </p>
      <p>Coletamos os seguintes tipos de dados:</p>
      <ul>
        <li><strong>Dados de Contato:</strong> Nome, e-mail e telefone, fornecidos através de formulários de contato e cadastro.</li>
        <li><strong>Dados de Perfil:</strong> Informações fornecidas ao criar uma conta, como CPF/CNPJ e endereço, necessárias para a emissão de notas fiscais e contratos.</li>
        <li><strong>Dados de Uso:</strong> Informações sobre como você usa nosso site, como páginas visitadas e interações, coletadas através de cookies e ferramentas de análise.</li>
        <li><strong>Comunicações:</strong> Registros de conversas através do nosso chat ou e-mail de suporte.</li>
      </ul>
      
      <h2>2. Uso dos Dados</h2>
      <p>Utilizamos seus dados para:</p>
      <ul>
        <li>Fornecer, operar e manter nossos serviços.</li>
        <li>Processar suas transações e gerenciar seus pedidos.</li>
        <li>Melhorar, personalizar e expandir nossos serviços.</li>
        <li>Comunicar com você, seja diretamente ou através de um dos nossos parceiros, incluindo para atendimento ao cliente, para lhe fornecer atualizações e outras informações relacionadas ao serviço, e para fins de marketing e promocionais (sempre com opção de opt-out).</li>
        <li>Prevenir fraudes e garantir a segurança.</li>
      </ul>
      
      <h2>3. Compartilhamento de Dados</h2>
      <p>
        Não compartilhamos suas informações de identificação pessoal publicamente ou com terceiros, exceto quando exigido por lei ou para viabilizar nossos serviços (ex: gateways de pagamento para processar transações).
      </p>
      
      <h2>4. Armazenamento e Segurança</h2>
      <p>
        Apenas retemos as informações coletadas pelo tempo necessário para fornecer o serviço solicitado. Quando armazenamos dados, protegemos dentro de meios comercialmente aceitáveis para evitar perdas e roubos, bem como acesso, divulgação, cópia, uso ou modificação não autorizados.
      </p>
      
      <h2>5. Seus Direitos (LGPD)</h2>
      <p>
        Como titular dos dados, você tem o direito de:
      </p>
      <ul>
        <li>Confirmar a existência de tratamento de seus dados.</li>
        <li>Acessar seus dados.</li>
        <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
        <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos.</li>
        <li>Portabilidade dos dados a outro fornecedor de serviço.</li>
        <li>Eliminação dos dados pessoais tratados com o seu consentimento.</li>
        <li>Obter informação sobre com quem compartilhamos seus dados.</li>
        <li>Revogar o consentimento.</li>
      </ul>
      <p>
        Para exercer seus direitos, entre em contato conosco.
      </p>

      <h2>6. Links para Sites de Terceiros</h2>
      <p>O nosso site pode ter links para sites externos que não são operados por nós. Esteja ciente de que não temos controle sobre o conteúdo e práticas desses sites e não podemos aceitar responsabilidade por suas respectivas políticas de privacidade.</p>
      
      <h2>7. Contato</h2>
      <p>
        Se você tiver alguma dúvida sobre como lidamos com dados do usuário e informações pessoais, ou desejar exercer seus direitos, entre em contato com nosso Encarregado de Proteção de Dados (DPO) através do e-mail: <strong>contato@delvind.com</strong>.
      </p>
    </PolicyPageLayout>
  );
}
