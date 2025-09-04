
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { Linkedin, Twitter, Instagram } from 'lucide-react';
import { Separator } from "../../components/ui/separator";
import { Header } from "@/components/layout/header";
import { FooterSection } from "@/components/layout/footer-section";

const teamMembers = [
  {
    name: "Edvandro Douglas",
    role: "CEO & Desenvolvedor",
    avatar: "https://darkgreen-lark-741030.hostingersite.com/img/5..png",
    bio: "Edvandro Douglas é o fundador da Delvind, uma empresa focada em inovação e soluções digitais. Com 22 anos e natural do estado do Pará, Brasil, Edvandro atualmente reside no Paraná, onde construiu sua carreira como empreendedor. Ele é desenvolvedor front-end e possui sólidos conhecimentos em desenvolvimento web. Sua experiência abrange a criação de soluções digitais inovadoras, sempre com foco na usabilidade e na experiência do usuário. Edvandro se destaca no cenário empresarial por sua visão estratégica, postura proativa e capacidade de aplicar suas habilidades técnicas para transformar ideias em realidade.",
    social: {
      twitter: "https://x.com/douglasvinidev",
      linkedin: "https://www.linkedin.com/in/edvandro-douglas-260774205/",
      instagram: "https://www.instagram.com/douglasvini.dev"
    }
  },
  {
    name: "Jhonatas Antunes",
    role: "CEO & Contador",
    avatar: "https://darkgreen-lark-741030.hostingersite.com/img/3..png",
    bio: "Jhonatas E. M. Antunes é um profissional altamente qualificado na área contábil, atuando no setor desde 2009. Bacharel em Ciências Contábeis, ele se especializou com pós-graduações em Finanças Empresariais, Contabilidade Societária e Planejamento e Consultoria Tributária, consolidando sua expertise em diferentes áreas da contabilidade e gestão financeira. Atualmente, desempenha papéis de liderança no setor empresarial e contábil, sendo Vice-Presidente da Associação dos Contabilistas do Oeste do Paraná e Secretário da Associação Comercial e Empresarial de Medianeira (ACIME). Com uma visão estratégica e compromisso com a inovação no setor contábil, Jhonatas se destaca por sua atuação na otimização de processos financeiros e tributários, ajudando empresas a crescer de forma sustentável.",
    social: {
        twitter: "https://x.com/jhony_maldaner",
        linkedin: "https://www.linkedin.com/in/jhonatas-erico-maldaner-antunes-06573257/",
        instagram: "https://www.instagram.com/jhocontador"
    }
  },
  {
    name: "Idilei Garrido",
    role: "CEO & Administrador",
    avatar: "https://darkgreen-lark-741030.hostingersite.com/img/2..png",
    bio: "Idilei Garrido, aos 51 anos, é um especialista em administração e gestão empresarial, com uma trajetória sólida e de sucesso no mundo corporativo. Com mais de duas décadas de experiência, ele acumulou um vasto conhecimento no comando de empresas de diversos segmentos, incluindo a administração de uma empresa no Brasil. Sua carreira é marcada pela habilidade de transformar desafios em oportunidades, sempre focado em estratégias de crescimento e inovação. Ele é amplamente reconhecido por sua visão estratégica, habilidade em gestão de equipes, e competência em análise financeira e otimização de processos empresariais. Essa expertise tem sido crucial para o crescimento da Delvind, onde atua como a força estratégica por trás de suas operações e decisões importantes.",
    social: {
      instagram: "https://www.instagram.com/idileigarridovalin"
    }
  }
];

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 300 271" {...props}>
      <path d="M236 0h46L181 113l119 158h-92l-72-96-60 96H0l103-150L-1 0h95l58 76 64-76zM215 241h24L61 28H36l179 213z"></path>
    </svg>
);

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="relative isolate overflow-hidden">
          <div className="fixed inset-0 -z-10 bg-gradient-to-br from-white via-pink-100 to-blue-200" />
          <div className="container py-12 space-y-20">
            <section className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-bold font-headline">Sobre a Delvind</h1>
                <p className="text-lg text-muted-foreground">
                  Na Delvind, somos especialistas em posicionamento digital. Nosso foco é o SEO — aplicamos estratégias inteligentes para fazer sua empresa aparecer nas primeiras posições do Google e atrair os clientes certos.
                </p>
                <p className="text-muted-foreground">
                  Para fortalecer esse posicionamento, também desenvolvemos sites otimizados, landing pages de alta conversão, aplicativos personalizados e oferecemos manutenção contínua de sites e SEO. Tudo o que fazemos é pensado para destacar sua marca e gerar resultados reais na busca orgânica.
                </p>
                <div className="flex space-x-4 pt-2">
                  <Button asChild variant="ghost" size="icon"><Link href="https://www.instagram.com/delvind.ia" target="_blank"><Instagram /></Link></Button>
                  <Button asChild variant="ghost" size="icon"><Link href="https://x.com/delvindltda" target="_blank"><XIcon className="h-4 w-4"/></Link></Button>
                  <Button asChild variant="ghost" size="icon"><Link href="https://www.facebook.com/delvind.oficial" target="_blank">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                      </svg>
                  </Link></Button>
                </div>
              </div>
              <div>
                <Image 
                  src="https://darkgreen-lark-741030.hostingersite.com/img/del11.png"
                  alt="Equipe Delvind"
                  data-ai-hint="team meeting"
                  width={600}
                  height={400}
                  className="rounded-lg shadow-xl w-full h-auto"
                />
              </div>
            </section>
            
            <Separator />

            <section className="text-center">
              <h2 className="text-3xl font-bold text-center mb-10 font-headline">Nosso Propósito</h2>
              <p className="text-lg text-muted-foreground max-w-4xl mx-auto mb-12">
                Posicionar marcas na internet com estratégias de SEO otimizada e personalizada para direcionar seus produtos e serviços quando o cliente buscar.
              </p>
              <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                <Card className="text-center">
                  <CardHeader>
                    <CardTitle className="text-primary">Missão</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">"Ajudar clientes a desenvolver uma presença online estratégica, utilizando mecanismos de busca e SEO."</p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardHeader>
                    <CardTitle className="text-primary">Visão</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">"Ser reconhecida como referência em posicionamento de marcas na internet, na região oeste do paraná."</p>
                  </CardContent>
                </Card>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-3xl font-bold text-center mb-12 font-headline">Conheça os CEOs do Grupo Delvind</h2>
              <div className="space-y-16">
                {teamMembers.map((member, index) => (
                  <div key={member.name} className="grid md:grid-cols-3 gap-8 items-center">
                    <div className={`flex flex-col items-center text-center ${index % 2 === 0 ? 'md:order-1' : 'md:order-3'}`}>
                      <Avatar className="w-40 h-40 mb-4 shadow-lg">
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <h3 className="font-bold text-xl">{member.name}</h3>
                      <p className="text-primary font-semibold">{member.role}</p>
                      <div className="flex space-x-3 mt-3">
                        {member.social.twitter && <Button asChild variant="ghost" size="icon"><Link href={member.social.twitter} target="_blank"><XIcon className="h-4 w-4"/></Link></Button>}
                        {member.social.linkedin && <Button asChild variant="ghost" size="icon"><Link href={member.social.linkedin} target="_blank"><Linkedin/></Link></Button>}
                        {member.social.instagram && <Button asChild variant="ghost" size="icon"><Link href={member.social.instagram} target="_blank"><Instagram/></Link></Button>}
                      </div>
                    </div>
                    <div className="md:col-span-2 md:order-2">
                      <Card>
                        <CardContent className="p-6">
                          <p className="text-muted-foreground whitespace-pre-line">{member.bio}</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
