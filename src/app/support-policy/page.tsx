
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

export default function SupportPolicyPage() {
  return (
    <PolicyPageLayout title="Política de Atendimento e Suporte">
      <p><strong>Última atualização:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
      
      <h2>1. Canais de Atendimento</h2>
      <p>
        A Delvind oferece os seguintes canais oficiais para atendimento e suporte técnico:
      </p>
      <ul>
        <li><strong>E-mail de Suporte:</strong> Para questões técnicas, dúvidas sobre serviços e problemas, envie um e-mail para <strong>contato@delvind.com</strong>.</li>
        <li><strong>Chat Online:</strong> Disponível em nosso site e painel do cliente durante o horário comercial para respostas rápidas e suporte em tempo real.</li>
        <li><strong>Painel do Cliente:</strong> Para solicitações formais como cancelamentos e reembolsos, utilize a seção "Pedidos e Revisão" no seu dashboard.</li>
      </ul>
      
      <h2>2. Horário de Atendimento</h2>
      <p>
        Nosso horário padrão de atendimento é de <strong>Segunda a Sexta-feira, das 08:00 às 19:00</strong> (horário de Brasília).
      </p>
      <p>
        Solicitações recebidas fora desse horário serão processadas no próximo dia útil.
      </p>
      
      <h2>3. Níveis de Suporte e Prazos de Resposta (SLA)</h2>
      <ul>
        <li>
          <strong>Dúvidas Gerais e Comerciais:</strong>
          <ul>
            <li><strong>Canal:</strong> Chat e E-mail (contato@delvind.com).</li>
            <li><strong>Prazo de Primeira Resposta:</strong> Até 24 horas úteis.</li>
          </ul>
        </li>
        <li>
          <strong>Suporte Técnico (Problemas e Bugs):</strong>
          <ul>
            <li><strong>Canal:</strong> E-mail (contato@delvind.com) e Chat.</li>
            <li><strong>Prazo de Primeira Resposta:</strong> Até 8 horas úteis.</li>
            <li><strong>Prazo de Resolução:</strong> Varia conforme a complexidade do problema, mas o cliente será mantido informado sobre o andamento.</li>
          </ul>
        </li>
        <li>
          <strong>Emergências (Site/Serviço Fora do Ar):</strong>
          <ul>
             <li><strong>Canal:</strong> E-mail (contato@delvind.com) com o assunto "EMERGÊNCIA".</li>
             <li><strong>Prazo de Primeira Resposta:</strong> Até 4 horas (dentro e fora do horário comercial).</li>
          </ul>
        </li>
      </ul>
      
      <h2>4. O que nosso suporte cobre?</h2>
      <p>Nosso suporte padrão inclui:</p>
      <ul>
        <li>Correção de bugs e falhas nos serviços e produtos desenvolvidos pela Delvind.</li>
        <li>Auxílio na utilização das funcionalidades do painel do cliente e de nossos sistemas.</li>
        <li>Esclarecimento de dúvidas sobre faturamento, contratos e serviços ativos.</li>
      </ul>

      <h2>5. O que NÃO está coberto pelo suporte padrão?</h2>
      <p>O suporte padrão não cobre (mas pode ser contratado como serviço adicional):</p>
      <ul>
        <li>Desenvolvimento de novas funcionalidades não previstas no escopo original.</li>
        <li>Alterações de layout ou design após a aprovação final do projeto.</li>
        <li>Treinamento extensivo de equipes do cliente para utilização de plataformas de terceiros.</li>
        <li>Problemas causados por mau uso, alterações indevidas no código por parte do cliente ou terceiros.</li>
        <li>Suporte para problemas em equipamentos ou rede de internet do cliente.</li>
      </ul>
    </PolicyPageLayout>
  );
}
