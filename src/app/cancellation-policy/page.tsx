
import { Header } from "@/components/layout/header";
import { FooterSection } from "@/components/layout/footer-section";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";


const PolicyPageLayout = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1">
            <div className="relative isolate">
                <div className="fixed inset-0 -z-10 bg-gradient-to-br from-white via-pink-100 to-blue-200" />
                <div className="container max-w-4xl py-12">
                    <article className="bg-card p-8 rounded-lg shadow-lg">
                        <div className="prose lg:prose-xl mx-auto">
                            <h1>{title}</h1>
                        </div>
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
        <PolicyPageLayout title="Política de Trocas, Devoluções e Cancelamento">
            <div className="prose lg:prose-xl mx-auto mt-6">
                <p className="text-sm text-muted-foreground"><strong>Última atualização:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
                <p>
                    A Delvind busca a total satisfação de seus clientes. Para isso, criamos uma política clara e flexível, baseada no Código de Defesa do Consumidor. Abaixo, você encontra as respostas para as principais dúvidas.
                </p>
            </div>
            
            <Accordion type="single" collapsible className="w-full mt-8">
                <AccordionItem value="item-1">
                    <AccordionTrigger className="text-lg font-semibold">Como faço para cancelar um serviço ou produto?</AccordionTrigger>
                    <AccordionContent className="prose lg:prose-xl max-w-none">
                        <p>Para iniciar um processo de cancelamento, o método mais rápido é entrar em contato conosco através dos nossos canais de atendimento:</p>
                        <ul>
                            <li><strong>Chat Online:</strong> Disponível no canto inferior do seu painel de cliente.</li>
                            <li><strong>E-mail:</strong> Envie sua solicitação para <strong>contato@delvind.com</strong>.</li>
                        </ul>
                        <p>Nossa equipe irá guiar você pelos próximos passos de acordo com o tipo de produto ou serviço adquirido.</p>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2">
                    <AccordionTrigger className="text-lg font-semibold">Qual é a política para produtos físicos (se aplicável)?</AccordionTrigger>
                    <AccordionContent className="prose lg:prose-xl max-w-none">
                        <h4>Direito de Arrependimento</h4>
                        <p>Você tem até <strong>7 (sete) dias corridos</strong>, a contar da data de recebimento do produto, para desistir da compra. O produto deverá ser devolvido na embalagem original, sem indícios de uso, acompanhado de todos os acessórios.</p>
                        <h4>Troca por Defeito</h4>
                        <p>Caso o produto apresente defeito de fabricação, você tem até 90 dias para solicitar a troca. Entre em contato com nosso suporte para análise.</p>
                    </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-3">
                    <AccordionTrigger className="text-lg font-semibold">E para produtos digitais (temas de site, plugins)?</AccordionTrigger>
                    <AccordionContent className="prose lg:prose-xl max-w-none">
                        <p>Produtos digitais, por sua natureza, não podem ser "devolvidos". No entanto, oferecemos as seguintes garantias:</p>
                        <ul>
                            <li><strong>Incompatibilidade ou Defeito:</strong> Se o produto digital apresentar defeito comprovado ou incompatibilidade não descrita na página do produto, oferecemos suporte para correção ou o reembolso integral do valor, no prazo de até 30 dias após a compra.</li>
                            <li><strong>Desistência:</strong> O direito de arrependimento de 7 dias também se aplica, desde que o download do produto ainda não tenha sido efetuado.</li>
                        </ul>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4">
                    <AccordionTrigger className="text-lg font-semibold">Como funciona o cancelamento de serviços recorrentes (SEO, Manutenção)?</AccordionTrigger>
                    <AccordionContent className="prose lg:prose-xl max-w-none">
                        <p>Nossos serviços de assinatura (SEO, manutenção, etc.) não possuem multa ou fidelidade. Você pode cancelar a qualquer momento.</p>
                        <p>Para evitar a cobrança do ciclo seguinte, a solicitação de cancelamento deve ser feita com uma antecedência mínima de <strong>15 (quinze) dias</strong> da data de renovação. Não há reembolso para o período já pago e em vigência.</p>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-5">
                    <AccordionTrigger className="text-lg fontsemibold">Como funciona o reembolso?</AccordionTrigger>
                    <AccordionContent className="prose lg:prose-xl max-w-none">
                        <p>Após a aprovação da solicitação de cancelamento ou devolução, o reembolso será processado da seguinte forma:</p>
                        <ul>
                            <li><strong>Cartão de Crédito:</strong> O estorno será solicitado à administradora do cartão e poderá aparecer em até 2 (duas) faturas subsequentes.</li>
                            <li><strong>Pix ou Boleto Bancário:</strong> O reembolso será feito via depósito em conta corrente, no prazo de até 10 (dez) dias úteis.</li>
                        </ul>
                        <p>O valor reembolsado corresponderá ao valor pago pelo produto, excluindo-se eventuais custos de frete (em caso de produtos físicos).</p>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </PolicyPageLayout>
    );
}

