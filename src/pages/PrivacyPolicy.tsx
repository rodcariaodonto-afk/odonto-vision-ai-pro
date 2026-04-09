import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logoImage from "@/assets/logo-odontovision-pro.jpeg";
import { ArrowLeft, ChevronUp } from "lucide-react";

const sections = [
  { id: "introducao", label: "1. Introdução" },
  { id: "dados-coletados", label: "2. Dados Coletados" },
  { id: "finalidade", label: "3. Finalidade" },
  { id: "compartilhamento", label: "4. Compartilhamento" },
  { id: "retencao", label: "5. Retenção" },
  { id: "cookies", label: "6. Cookies" },
  { id: "lgpd", label: "7. Conformidade LGPD" },
  { id: "contato", label: "8. Contato" },
];

export default function PrivacyPolicy() {
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
                Índice
              </p>
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className="block w-full text-left text-sm py-1.5 px-3 rounded-lg text-gray-500 hover:text-[hsl(var(--landing-navy))] hover:bg-gray-50 transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <main className="flex-1 max-w-4xl">
            <h1 className="text-3xl sm:text-4xl font-bold text-[hsl(var(--landing-navy))] mb-2">
              Política de Privacidade
            </h1>
            <p className="text-sm text-gray-400 mb-10">
              Última atualização: 9 de abril de 2026
            </p>

            <section id="introducao" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-[hsl(var(--landing-navy))] mb-4">1. Introdução</h2>
              <p className="text-gray-600 leading-relaxed mb-3">
                O OdontoVision AI Pro ("Plataforma") valoriza a privacidade e a segurança dos dados de seus usuários e dos profissionais de odontologia que utilizam nossos serviços. Esta Política de Privacidade descreve de forma clara e transparente como coletamos, utilizamos, armazenamos e protegemos as informações pessoais fornecidas por meio da Plataforma.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Ao acessar ou utilizar o OdontoVision AI Pro, você declara que leu, compreendeu e concorda com os termos desta Política de Privacidade. Caso não concorde com qualquer disposição aqui prevista, solicitamos que se abstenha de utilizar a Plataforma.
              </p>
            </section>

            <section id="dados-coletados" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-[hsl(var(--landing-navy))] mb-4">2. Dados Coletados</h2>
              <p className="text-gray-600 leading-relaxed mb-3">
                No processo de cadastro e utilização da Plataforma, coletamos os seguintes dados pessoais:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                <li><strong>Nome completo</strong> — para identificação do usuário e personalização da experiência;</li>
                <li><strong>Endereço de e-mail</strong> — para comunicação, autenticação e envio de notificações relevantes;</li>
                <li><strong>Número de telefone</strong> — para contato direto, suporte e comunicações comerciais autorizadas.</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mt-3">
                A Plataforma não coleta dados sensíveis de pacientes. As imagens radiográficas e tomográficas enviadas para análise são processadas de forma automatizada pela inteligência artificial e não são vinculadas a dados identificáveis de pacientes.
              </p>
            </section>

            <section id="finalidade" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-[hsl(var(--landing-navy))] mb-4">3. Finalidade da Coleta</h2>
              <p className="text-gray-600 leading-relaxed mb-3">
                Os dados pessoais coletados são utilizados exclusivamente para as seguintes finalidades:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                <li>Criação e gerenciamento de conta de usuário na Plataforma;</li>
                <li>Comunicação direta com o usuário, incluindo suporte técnico e atendimento;</li>
                <li>Envio de informações sobre atualizações, novos recursos e ofertas comerciais relacionadas à Plataforma;</li>
                <li>Processamento de assinaturas e transações financeiras;</li>
                <li>Melhoria contínua dos serviços oferecidos pela Plataforma.</li>
              </ul>
            </section>

            <section id="compartilhamento" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-[hsl(var(--landing-navy))] mb-4">4. Compartilhamento de Dados</h2>
              <p className="text-gray-600 leading-relaxed mb-3">
                O OdontoVision AI Pro poderá compartilhar dados pessoais com terceiros estritamente necessários para a operação e manutenção da Plataforma, incluindo:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                <li>Provedores de infraestrutura em nuvem para hospedagem e armazenamento seguro de dados;</li>
                <li>Processadores de pagamento para gerenciamento de assinaturas e cobranças;</li>
                <li>APIs e integrações de sistemas parceiros que suportam funcionalidades essenciais da Plataforma, como análise por inteligência artificial;</li>
                <li>Ferramentas de análise e monitoramento de desempenho.</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mt-3">
                Todos os terceiros com os quais compartilhamos dados estão sujeitos a acordos de confidencialidade e proteção de dados compatíveis com esta Política e com a legislação vigente.
              </p>
            </section>

            <section id="retencao" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-[hsl(var(--landing-navy))] mb-4">5. Retenção de Dados</h2>
              <p className="text-gray-600 leading-relaxed mb-3">
                Os dados pessoais coletados serão armazenados pelo período de <strong>1 (um) ano</strong> a partir da data de coleta ou da última interação do usuário com a Plataforma, o que ocorrer por último.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Após o período de retenção, os dados serão anonimizados ou excluídos de forma segura, salvo quando houver obrigação legal de manutenção por prazo superior. O usuário poderá solicitar a exclusão antecipada de seus dados a qualquer momento, conforme previsto na seção de Conformidade com a LGPD.
              </p>
            </section>

            <section id="cookies" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-[hsl(var(--landing-navy))] mb-4">6. Cookies e Rastreamento</h2>
              <p className="text-gray-600 leading-relaxed mb-3">
                A Plataforma utiliza cookies e tecnologias de rastreamento similares para as seguintes finalidades:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                <li><strong>Cookies essenciais:</strong> necessários para o funcionamento adequado da Plataforma, incluindo autenticação e segurança;</li>
                <li><strong>Cookies analíticos:</strong> utilizamos o Google Analytics e outras ferramentas para compreender padrões de uso, analisar o tráfego e otimizar a experiência do usuário;</li>
                <li><strong>Cookies de marketing:</strong> empregados para otimizar campanhas publicitárias e apresentar conteúdo relevante ao perfil do usuário.</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mt-3">
                O usuário poderá gerenciar as preferências de cookies por meio das configurações de seu navegador. A desativação de cookies essenciais poderá comprometer o funcionamento da Plataforma.
              </p>
            </section>

            <section id="lgpd" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-[hsl(var(--landing-navy))] mb-4">7. Conformidade com a LGPD</h2>
              <p className="text-gray-600 leading-relaxed mb-3">
                O tratamento de dados pessoais realizado pelo OdontoVision AI Pro observa integralmente os princípios e disposições da Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD). Em conformidade com a legislação, garantimos aos titulares de dados os seguintes direitos:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                <li>Confirmação da existência de tratamento de dados pessoais;</li>
                <li>Acesso aos dados pessoais mantidos pela Plataforma;</li>
                <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
                <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos;</li>
                <li>Portabilidade dos dados a outro fornecedor de serviço;</li>
                <li>Eliminação dos dados pessoais tratados com o consentimento do titular;</li>
                <li>Revogação do consentimento a qualquer momento.</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mt-3">
                Para exercer qualquer destes direitos, o titular deverá encaminhar solicitação por meio do canal de contato indicado na seção 8 desta Política.
              </p>
            </section>

            <section id="contato" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-[hsl(var(--landing-navy))] mb-4">8. Contato</h2>
              <p className="text-gray-600 leading-relaxed mb-3">
                Para esclarecer dúvidas sobre esta Política de Privacidade, exercer seus direitos como titular de dados ou reportar incidentes de segurança, entre em contato conosco pelo seguinte canal:
              </p>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 mt-4">
                <p className="text-sm text-gray-600">
                  <strong className="text-[hsl(var(--landing-navy))]">E-mail:</strong>{" "}
                  <a
                    href="mailto:privacidade@odontovisionpro.com.br"
                    className="text-[hsl(var(--landing-teal))] hover:underline"
                  >
                    privacidade@odontovisionpro.com.br
                  </a>
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Responderemos sua solicitação no prazo máximo de 15 (quinze) dias úteis, conforme previsto na LGPD.
                </p>
              </div>
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
                <li><button onClick={() => navigate("/terms")} className="hover:text-white transition-colors">Termos de Uso</button></li>
                <li><span className="text-white/90">Política de Privacidade</span></li>
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
