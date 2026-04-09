import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logoImage from "@/assets/logo-odontovision-pro.jpeg";
import { ArrowLeft, ChevronUp } from "lucide-react";

const clauses = [
  { id: "aceitacao", label: "1. Aceitação dos Termos" },
  { id: "descricao", label: "2. Descrição do Serviço" },
  { id: "aviso-saude", label: "3. Aviso sobre Saúde" },
  { id: "uso-aceitavel", label: "4. Uso Aceitável" },
  { id: "propriedade", label: "5. Propriedade Intelectual" },
  { id: "limitacao", label: "6. Limitação de Responsabilidade" },
  { id: "integracoes", label: "7. Integrações de Terceiros" },
  { id: "modificacoes", label: "8. Modificações dos Termos" },
  { id: "foro", label: "9. Foro" },
];

export default function TermsOfUse() {
  const navigate = useNavigate();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white text-[hsl(210,20%,15%)] font-sans">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <img
            src={logoImage}
            alt="OdontoVision PRO"
            className="h-10 object-contain cursor-pointer"
            onClick={() => navigate("/welcome")}
          />
          <Button
            variant="ghost"
            className="text-[hsl(var(--landing-navy))] gap-2"
            onClick={() => navigate("/welcome")}
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Início
          </Button>
        </div>
      </header>

      <div className="pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex gap-12">
          {/* Sidebar - desktop only */}
          <aside className="hidden lg:block w-56 shrink-0">
            <nav className="sticky top-24 space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--landing-teal))] mb-3">
                Cláusulas
              </p>
              {clauses.map((c) => (
                <button
                  key={c.id}
                  onClick={() => scrollTo(c.id)}
                  className="block w-full text-left text-sm py-1.5 px-3 rounded-lg text-gray-500 hover:text-[hsl(var(--landing-navy))] hover:bg-gray-50 transition-colors"
                >
                  {c.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <main className="flex-1 max-w-4xl">
            <h1 className="text-3xl sm:text-4xl font-bold text-[hsl(var(--landing-navy))] mb-2">
              Termos de Uso
            </h1>
            <p className="text-sm text-gray-400 mb-10">
              Última atualização: 9 de abril de 2026
            </p>

            <section id="aceitacao" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-[hsl(var(--landing-navy))] mb-4">Cláusula 1 — Aceitação dos Termos</h2>
              <p className="text-gray-600 leading-relaxed mb-3">
                1.1. Ao acessar o site odontovisionpro.com.br e utilizar a plataforma OdontoVision AI Pro ("Plataforma"), o usuário — seja cirurgião-dentista individual ou clínica odontológica — declara ter lido, compreendido e concordado integralmente com os presentes Termos de Uso.
              </p>
              <p className="text-gray-600 leading-relaxed">
                1.2. Caso o usuário não concorde com qualquer disposição destes Termos, deverá cessar imediatamente o uso da Plataforma. A continuidade do acesso após eventuais atualizações constitui aceitação tácita das modificações realizadas.
              </p>
            </section>

            <section id="descricao" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-[hsl(var(--landing-navy))] mb-4">Cláusula 2 — Descrição do Serviço</h2>
              <p className="text-gray-600 leading-relaxed mb-3">
                2.1. O OdontoVision AI Pro é uma plataforma SaaS (Software as a Service) que utiliza Inteligência Artificial para análise de exames radiológicos (periapicais, panorâmicas, interproximais), tomografias computadorizadas e fotografias clínicas intraorais.
              </p>
              <p className="text-gray-600 leading-relaxed mb-3">
                2.2. A Plataforma tem como objetivo auxiliar cirurgiões-dentistas na elaboração de diagnósticos inteligentes, gerando laudos automatizados que contribuem para a otimização do tempo clínico e a precisão diagnóstica.
              </p>
              <p className="text-gray-600 leading-relaxed">
                2.3. Os serviços são oferecidos mediante planos de assinatura, cujas condições, valores e funcionalidades estão detalhados na página de Planos da Plataforma.
              </p>
            </section>

            <section id="aviso-saude" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-[hsl(var(--landing-navy))] mb-4">Cláusula 3 — Aviso Importante sobre Saúde</h2>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-4">
                <p className="text-gray-700 leading-relaxed font-medium">
                  3.1. A inteligência artificial da Plataforma atua exclusivamente como <strong>ferramenta de suporte ao diagnóstico</strong>, fornecendo uma segunda opinião técnica baseada em algoritmos de visão computacional e aprendizado de máquina.
                </p>
              </div>
              <p className="text-gray-600 leading-relaxed mb-3">
                3.2. O diagnóstico final, a decisão terapêutica e a responsabilidade clínica sobre o tratamento do paciente são <strong>exclusivos do cirurgião-dentista responsável</strong>, devidamente habilitado e inscrito no Conselho Regional de Odontologia (CRO).
              </p>
              <p className="text-gray-600 leading-relaxed">
                3.3. A Plataforma não substitui o exame clínico presencial, a anamnese detalhada ou qualquer procedimento diagnóstico complementar que o profissional julgue necessário.
              </p>
            </section>

            <section id="uso-aceitavel" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-[hsl(var(--landing-navy))] mb-4">Cláusula 4 — Uso Aceitável</h2>
              <p className="text-gray-600 leading-relaxed mb-3">
                4.1. O usuário compromete-se a fornecer informações verdadeiras, completas e atualizadas durante o cadastro, incluindo nome, endereço de e-mail e número de telefone.
              </p>
              <p className="text-gray-600 leading-relaxed mb-3">
                4.2. É vedado ao usuário:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4 mb-3">
                <li>Utilizar a Plataforma para fins ilícitos ou contrários à ética profissional odontológica;</li>
                <li>Compartilhar credenciais de acesso com terceiros não autorizados;</li>
                <li>Tentar acessar áreas restritas da Plataforma por meio de engenharia reversa ou técnicas similares;</li>
                <li>Utilizar a Plataforma para autodiagnóstico por pessoas não qualificadas na área odontológica.</li>
              </ul>
              <p className="text-gray-600 leading-relaxed">
                4.3. O uso da Plataforma por pessoas não habilitadas como cirurgiões-dentistas para fins de autodiagnóstico ou diagnóstico de terceiros é expressamente proibido.
              </p>
            </section>

            <section id="propriedade" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-[hsl(var(--landing-navy))] mb-4">Cláusula 5 — Propriedade Intelectual</h2>
              <p className="text-gray-600 leading-relaxed mb-3">
                5.1. Todos os direitos de propriedade intelectual sobre o software, a marca OdontoVision AI Pro, os algoritmos de inteligência artificial, o design, os conteúdos e demais elementos da Plataforma pertencem exclusivamente aos seus criadores e proprietários.
              </p>
              <p className="text-gray-600 leading-relaxed">
                5.2. A licença de uso concedida ao assinante é pessoal, intransferível e não exclusiva, limitada ao prazo da assinatura vigente.
              </p>
            </section>

            <section id="limitacao" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-[hsl(var(--landing-navy))] mb-4">Cláusula 6 — Limitação de Responsabilidade</h2>
              <p className="text-gray-600 leading-relaxed mb-3">
                6.1. A Plataforma não se responsabiliza por interrupções de serviço causadas por fatores alheios ao seu controle, incluindo, mas não se limitando a: falhas de infraestrutura de terceiros, indisponibilidade de provedores de internet, ataques cibernéticos, caso fortuito ou força maior.
              </p>
              <p className="text-gray-600 leading-relaxed mb-3">
                6.2. A Plataforma não será responsável por danos diretos, indiretos, incidentais ou consequenciais decorrentes do mau uso dos laudos gerados pela inteligência artificial.
              </p>
              <p className="text-gray-600 leading-relaxed">
                6.3. A responsabilidade total da Plataforma em qualquer hipótese estará limitada ao valor pago pelo usuário no período de 12 (doze) meses imediatamente anteriores ao evento que deu origem à reclamação.
              </p>
            </section>

            <section id="integracoes" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-[hsl(var(--landing-navy))] mb-4">Cláusula 7 — Integrações de Terceiros</h2>
              <p className="text-gray-600 leading-relaxed mb-3">
                7.1. O serviço poderá utilizar APIs e integrações de terceiros para processamento de imagens, análise por inteligência artificial, processamento de pagamentos e outras funcionalidades essenciais.
              </p>
              <p className="text-gray-600 leading-relaxed">
                7.2. O uso dessas integrações está sujeito à disponibilidade e aos termos de serviço dos respectivos fornecedores. A Plataforma não garante a disponibilidade ininterrupta de serviços de terceiros.
              </p>
            </section>

            <section id="modificacoes" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-[hsl(var(--landing-navy))] mb-4">Cláusula 8 — Modificações dos Termos</h2>
              <p className="text-gray-600 leading-relaxed mb-3">
                8.1. O OdontoVision AI Pro reserva-se o direito de atualizar ou modificar os presentes Termos de Uso a qualquer momento, mediante notificação aos usuários ativos por meio do endereço de e-mail cadastrado.
              </p>
              <p className="text-gray-600 leading-relaxed">
                8.2. A continuidade do uso da Plataforma após a notificação de alterações constituirá aceitação dos novos termos.
              </p>
            </section>

            <section id="foro" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-[hsl(var(--landing-navy))] mb-4">Cláusula 9 — Foro</h2>
              <p className="text-gray-600 leading-relaxed mb-3">
                9.1. Fica eleito o foro da Comarca da sede da empresa proprietária da Plataforma, no Brasil, para dirimir quaisquer controvérsias decorrentes da interpretação ou execução destes Termos de Uso, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
              </p>
              <p className="text-gray-600 leading-relaxed">
                9.2. As partes comprometem-se a, previamente ao ajuizamento de qualquer ação judicial, buscar a resolução amigável do conflito por meio de negociação direta pelo prazo mínimo de 30 (trinta) dias.
              </p>
            </section>

            {/* Back to top - mobile */}
            <div className="lg:hidden flex justify-center mt-8">
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="flex items-center gap-2 text-sm text-[hsl(var(--landing-teal))] hover:underline"
              >
                <ChevronUp className="w-4 h-4" />
                Voltar ao topo
              </button>
            </div>
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[hsl(210,70%,12%)] text-white/70 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <img src={logoImage} alt="OdontoVision PRO" className="h-10 object-contain mb-4 brightness-200" />
              <p className="text-sm">Diagnósticos inteligentes. Tempo otimizado. Precisão que faz a diferença.</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">Produto</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => navigate("/welcome")} className="hover:text-white transition-colors">Página Inicial</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><span className="text-white/90">Termos de Uso</span></li>
                <li><button onClick={() => navigate("/privacy")} className="hover:text-white transition-colors">Política de Privacidade</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">Contato</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="mailto:privacidade@odontovisionpro.com.br" className="hover:text-white transition-colors">privacidade@odontovisionpro.com.br</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 text-center text-sm">
            © 2026 OdontoVision PRO. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
