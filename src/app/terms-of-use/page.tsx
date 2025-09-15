
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

export default function TermsOfUsePage() {
  return (
    <PolicyPageLayout title="Termos de Uso">
      <p><strong>Última atualização:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
      
      <h2>1. Aceitação dos Termos</h2>
      <p>
        Ao acessar e usar o site e os serviços da <strong>Delvind Tecnologia Da Informação LTDA</strong> ("Delvind", "nós"), você concorda em cumprir e estar vinculado a estes Termos de Uso. Se você não concordar com estes termos, não deverá acessar ou usar nossos serviços.
      </p>
      
      <h2>2. Uso dos Serviços</h2>
      <p>
        Você concorda em usar nossos serviços apenas para fins lícitos e de acordo com estes Termos. Você se compromete a não usar os serviços:
      </p>
      <ul>
        <li>De qualquer forma que viole qualquer lei ou regulamento aplicável.</li>
        <li>Para explorar, prejudicar ou tentar explorar ou prejudicar menores de qualquer forma.</li>
        <li>Para transmitir ou obter o envio de qualquer material publicitário ou promocional não solicitado (spam).</li>
        <li>Para se passar ou tentar se passar pela Delvind, por um funcionário da Delvind, por outro usuário ou por qualquer outra pessoa ou entidade.</li>
      </ul>
      
      <h2>3. Contas de Usuário</h2>
      <p>
        Para acessar certas áreas, como o painel do cliente, você precisará criar uma conta. Você é responsável por manter a confidencialidade de sua senha e por todas as atividades que ocorrem em sua conta. Você concorda em nos notificar imediatamente sobre qualquer uso não autorizado de sua conta.
      </p>
      
      <h2>4. Propriedade Intelectual</h2>
      <p>
        Os serviços e seu conteúdo original, recursos e funcionalidades são e permanecerão como propriedade exclusiva da Delvind e de seus licenciadores. Nossos direitos autorais, marcas comerciais e identidade visual não podem ser usados em conexão com qualquer produto ou serviço sem o consentimento prévio por escrito da Delvind.
      </p>
      
      <h2>5. Obrigações Financeiras e Aprovação de Orçamentos</h2>
      <p>
        Ao aprovar uma Proposta Comercial ou Orçamento através do painel do cliente, você reconhece e concorda que esta ação constitui um aceite eletrônico dos termos e valores apresentados. Esta aprovação é um ato vinculativo que autoriza a Delvind a iniciar os serviços descritos e a gerar as faturas e cobranças correspondentes, que se tornarão obrigações financeiras de sua responsabilidade.
      </p>

      <h2>6. Limitação de Responsabilidade</h2>
      <p>
        Em nenhuma circunstância a Delvind, nem seus diretores, funcionários, parceiros, agentes, fornecedores ou afiliados, serão responsáveis por quaisquer danos indiretos, incidentais, especiais, consequenciais ou punitivos, incluindo, sem limitação, perda de lucros, dados, uso, boa vontade ou outras perdas intangíveis, resultantes de (i) seu acesso ou uso ou incapacidade de acessar ou usar o serviço; (ii) qualquer conduta ou conteúdo de terceiros no serviço.
      </p>
      
      <h2>7. Alterações nos Termos</h2>
      <p>
        Reservamo-nos o direito, a nosso exclusivo critério, de modificar ou substituir estes Termos a qualquer momento. Se uma revisão for material, tentaremos fornecer um aviso com pelo menos 30 dias de antecedência antes que quaisquer novos termos entrem em vigor. O que constitui uma alteração material será determinado a nosso exclusivo critério.
      </p>
      
      <h2>8. Lei Aplicável</h2>
      <p>
        Estes Termos serão regidos e interpretados de acordo com as leis do Brasil, sem levar em conta o conflito de disposições legais. Fica eleito o foro da comarca de Medianeira, Paraná, para dirimir quaisquer litígios.
      </p>

      <h2>9. Contato</h2>
      <p>Se você tiver alguma dúvida sobre estes Termos, entre em contato conosco em <strong>legal@delvind.com</strong>.</p>
    </PolicyPageLayout>
  );
}
