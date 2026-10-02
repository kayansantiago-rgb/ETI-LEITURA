import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import Brand from '@/components/Brand';
import { TERMS_VERSION } from '@/lib/terms';
import { isAuthenticated } from '@/lib/auth';

const SECTIONS = [
  [
    '1. Quem somos',
    [
      'A ETI LEITURA é a plataforma de leitura da escola. Nela, alunos leem livros digitais, respondem atividades e quizzes, escrevem resumos e produções textuais e acompanham o próprio progresso. Professores e a coordenação usam a plataforma para propor atividades, corrigir e acompanhar as turmas.',
      'A escola é a responsável (controladora) pelos dados tratados na plataforma, nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018 – LGPD).'
    ]
  ],
  [
    '2. Quais dados usamos',
    [
      'Dados de cadastro: nome, e-mail, turma, foto de perfil (opcional) e senha (guardada de forma criptografada; ninguém consegue lê-la).',
      'Dados de estudo: livros abertos e página em que parou, dias e páginas lidas, respostas de atividades e quizzes, resumos, produções textuais, notas, comentários dos professores, medalhas e certificados.',
      'Dados técnicos mínimos: registro de acesso necessário para segurança e, se você ativar, o endereço do aparelho para enviar notificações.',
      'Ao entrar com o Google, recebemos apenas nome, e-mail e foto da conta Google. Não temos acesso à sua senha do Google nem a outros dados da conta.'
    ]
  ],
  [
    '3. Para que usamos',
    [
      'Somente para fins educacionais: permitir a leitura e as atividades, registrar o aprendizado, gerar relatórios e certificados, enviar avisos da turma e manter a plataforma segura.',
      'Não vendemos, não alugamos e não usamos seus dados para propaganda. Não há anúncios na plataforma.'
    ]
  ],
  [
    '4. Quem pode ver',
    [
      'Você vê seus próprios dados. Seus professores veem os dados dos alunos das turmas em que dão aula. A coordenação da escola vê os dados de todas as turmas.',
      'No ranking de leitores, colegas da mesma turma veem seu nome, sua moldura de avatar, seu título e sua pontuação de leitura — nunca suas notas.',
      'Os dados ficam em serviços de hospedagem contratados pela escola (servidor, banco de dados e armazenamento de arquivos), que atuam apenas como operadores e seguem as instruções da escola.'
    ]
  ],
  [
    '5. Crianças e adolescentes',
    [
      'Como a maioria dos usuários é menor de idade, tratamos os dados no melhor interesse do estudante (art. 14 da LGPD), coletando apenas o necessário para as atividades escolares. Pais e responsáveis podem procurar a coordenação para tirar dúvidas ou exercer os direitos do estudante.'
    ]
  ],
  [
    '6. Seus direitos',
    [
      'Confirmar quais dados temos e acessá-los: no Perfil, em "Privacidade e dados", você pode baixar uma cópia completa dos seus dados.',
      'Corrigir dados: o nome e a foto podem ser alterados no Perfil; para outros dados, fale com a coordenação.',
      'Pedir a exclusão: no Perfil, use "Pedir exclusão da conta". A coordenação confirma o pedido e apaga a conta e todo o histórico. Alguns registros podem ser mantidos quando a escola for obrigada por lei.',
      'Revogar o consentimento e tirar dúvidas: fale com a coordenação da escola.'
    ]
  ],
  [
    '7. Segurança e guarda',
    [
      'Usamos conexão segura (HTTPS), senhas criptografadas, acesso separado por perfil e turma e cópias de segurança. Os dados são guardados enquanto o estudante estiver vinculado à escola ou pelo prazo exigido pelas normas escolares.',
      'Livros abertos podem ficar guardados no seu aparelho para leitura sem internet; eles são apagados ao sair da conta.'
    ]
  ],
  [
    '8. Regras de uso',
    [
      'Use a plataforma para estudar e com respeito: não compartilhe sua senha, não publique conteúdo ofensivo e não copie textos de colegas ou da internet como se fossem seus.',
      'Os livros e materiais são disponibilizados apenas para uso educacional dentro da escola e não devem ser redistribuídos.',
      'Contas usadas em desacordo com estas regras podem ser suspensas pela coordenação.'
    ]
  ],
  [
    '9. Mudanças',
    ['Se estes termos mudarem, avisaremos na plataforma e pediremos um novo aceite antes de você continuar usando.']
  ]
];

export default function Privacy() {
  return (
    <main className="pv">
      <header className="pv-head">
        <Brand />
        <Link to={isAuthenticated() ? '/dashboard' : '/login'} className="pv-back">
          <ArrowLeft size={15} /> {isAuthenticated() ? 'Voltar para a plataforma' : 'Voltar para o login'}
        </Link>
      </header>
      <article className="pv-card">
        <span className="pv-icon">
          <ShieldCheck size={26} />
        </span>
        <p className="ws-eyebrow">Versão {TERMS_VERSION}</p>
        <h1>Termos de uso e política de privacidade</h1>
        <p className="pv-lead">Explicamos aqui, em linguagem simples, como a ETI LEITURA usa e protege os dados de alunos, professores e da coordenação.</p>
        {SECTIONS.map(([title, paragraphs]) => (
          <section key={title}>
            <h2>{title}</h2>
            {paragraphs.map(p => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
          </section>
        ))}
      </article>
    </main>
  );
}
