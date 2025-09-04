
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

export default function CancellationPolicyPage() {
    return (
        <PolicyPageLayout title="Política de Cancelamento e Reembolso">
            <p><strong>Última atualização:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
            
            <h2>1. Cancelamento de Serviços Recorrentes</h2>
            <p>
                Serviços de assinatura mensal, como manutenção de site e SEO, podem ser cancelados a qualquer momento. Para solicitar o cancelamento, o cliente deve entrar em contato através do e-mail de suporte (contato@delvind.com) com antecedência mínima de 15 (quinze) dias do próximo ciclo de faturamento. Não haverá reembolso por períodos já pagos.
            </p>

            <h2>2. Projetos de Desenvolvimento (Sites, Aplicativos)</h2>
            <p>
                Para projetos com escopo fechado, como o desenvolvimento de um site ou aplicativo, o cancelamento é regido pelas seguintes regras:
            </p>
            <ul>
                <li><strong>Antes do Início do Desenvolvimento:</strong> O cliente pode cancelar o projeto em até 7 (sete) dias após a assinatura do contrato e receber o reembolso integral do valor pago como sinal.</li>
                <li><strong>Após o Início do Desenvolvimento:</strong> Caso o cancelamento seja solicitado após o início dos trabalhos, o valor pago como sinal não será reembolsado, a fim de cobrir os custos de planejamento, design e horas de desenvolvimento já alocadas.</li>
                <li><strong>Cancelamento pela Delvind:</strong> Reservamo-nos o direito de cancelar um projeto por violação dos termos de uso ou falta de cooperação do cliente (falta de feedback, materiais, etc.). Neste caso, será feita uma análise das horas trabalhadas para calcular um eventual reembolso parcial.</li>
            </ul>

            <h2>3. Política de Reembolso</h2>
            <p>
                Reembolsos serão processados sob as seguintes condições:
            </p>
            <ul>
                <li><strong>Falha na Entrega:</strong> Se a Delvind não entregar o serviço contratado conforme o escopo acordado e não apresentar uma solução viável dentro de um prazo razoável, o cliente terá direito ao reembolso proporcional ao trabalho não entregue.</li>
                <li><strong>Arrependimento (CDC):</strong> Conforme o Art. 49 do Código de Defesa do Consumidor, para serviços contratados online, o cliente tem até 7 (sete) dias, a contar da data de assinatura do contrato, para se arrepender e solicitar o cancelamento com reembolso total.</li>
            </ul>
            <p>
                Todos os reembolsos serão processados através do mesmo método de pagamento utilizado na contratação, em um prazo de até 30 (trinta) dias úteis após a formalização do pedido de cancelamento e/ou reembolso.
            </p>

            <h2>4. Contato</h2>
            <p>Para solicitações de cancelamento, reembolso ou dúvidas sobre esta política, entre em contato conosco através do e-mail: <strong>contato@delvind.com</strong>.</p>
        </PolicyPageLayout>
    );
}
