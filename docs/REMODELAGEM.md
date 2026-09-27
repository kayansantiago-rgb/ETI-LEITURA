# Remodelagem ETI LEITURA

## Identidade e experiência

Nova marca, favicon e título do navegador. Tipografia sem serifa, azul profundo com verde suave, navegação lateral dividida entre estudante e gestão, cabeçalho de contexto e comportamento responsivo. Login redesenhado em duas áreas. Painel com saudação, indicadores reais, leituras, calendário e mural. Biblioteca com busca sem distinção de acentos e filtros de progresso. Cartões de livros acessíveis por teclado e imagem alternativa quando a capa falha. Oficina de escrita com contagem de palavras.

Todas as telas existentes recebem o novo tema e a navegação compartilhada. Foram preservados cadastro, perfil, livros, resumos, produções, correções, mural, calendário e arquivos enviados.

## Limpeza

Removidos 39 componentes/hooks sem referências no grafo de importações da aplicação. Retirados pacotes associados a esses componentes, bibliotecas de PDF sem uso, gráficos sem uso e integração de edição visual da ferramenta geradora. Removidos plugins antigos de diagnóstico, relatórios antigos, documentação desatualizada e identidade Git da ferramenta geradora. As instruções atuais ficam no README.

Dependências Python reduzidas às usadas pela API; ferramentas de teste separadas em requirements-dev.txt. Scripts de criação de administrador e manutenção dos dados foram mantidos. Não foram apagados livros, uploads ou registros do banco.

## Ajustes funcionais

- Cadastro público sempre cria estudantes.
- Rota antiga de criação de livros exige administrador.
- Tokens inválidos recebem erro de autenticação apropriado.
- Segredo JWT precisa ser configurado explicitamente.
- Rotas administrativas também são protegidas na interface.
- O login inválido mostra a mensagem sem recarregar a página.
- Progresso é enviado ao terminar o movimento do controle, evitando pedidos a cada passo.
- Administração mostra indicadores de toda a escola; estudantes veem seus próprios indicadores.
- Calendário ignora respostas antigas ao trocar de mês rapidamente.

## Sugestões de melhorias

### Próxima prioridade

1. **Salvar rascunhos automaticamente:** preservar resumos e produções em caso de queda de internet ou fechamento da página, com indicação clara do estado de salvamento.
2. **Perfil de professor:** atribuir turmas a professores e limitar acesso aos trabalhos dessas turmas.
3. **Recuperação de senha:** permitir redefinição por um fluxo verificado.
4. **Backup e recuperação:** automatizar cópias do banco e dos uploads e testar a restauração.

### Evolução pedagógica

5. **Atividades com prazo:** professor associa livro, proposta de escrita e data de entrega a uma turma.
6. **Rubrica de correção:** avaliar compreensão, estrutura, argumentação e escrita com critérios visíveis para o aluno.
7. **Notificações de feedback:** avisar o aluno quando uma produção for corrigida.
8. **Relatórios por turma:** leituras concluídas, entregas pendentes e evolução das notas, com exportação.
9. **Leitor integrado:** abrir PDFs dentro da plataforma e lembrar a última página, mantendo o progresso manual como opção.

### Manutenção técnica

Separar a API em módulos, adicionar paginação e índices do banco, ampliar os testes dos fluxos de escrita/correção e planejar a atualização da ferramenta de compilação herdada. Essas evoluções não fazem parte da remodelagem visual entregue.

## Validação realizada

- Compilação de produção da interface concluída.
- Seis testes de regressão de autenticação e autorização aprovados, sem banco real.
- Telas de aluno e administrador exercitadas no navegador com respostas simuladas da API.
- Busca com acentos, filtros, bloqueio de rotas administrativas e menu móvel verificados.
- Capturas em computador (1440 px) e celular (390 px); sem transbordamento horizontal na biblioteca móvel.
- A integração com MongoDB, uploads reais e persistência precisa ser validada após configurar o ambiente. Não foi publicado um site.

## Painel do professor e temas

A conta administrativa acessa `/admin/professor`, com indicadores da escola e atalhos para alunos/turmas, livros, resumos, produções, mural e calendário. O painel é protegido pelas permissões administrativas existentes; esta entrega não cria um novo tipo de conta nem libera privilégios por cadastro público. Ao entrar, a conta de gestão é encaminhada ao painel. Na biblioteca e demais telas pessoais, o menu mantém um acesso ao painel; dentro da gestão, exibe os atalhos de cada ferramenta.

O botão de sol/lua no cabeçalho e no login alterna os temas claro e escuro. A preferência é salva neste navegador em `eti-theme`, vale para todas as telas e permanece após recarregar ou sair da conta. Inclui formulários, calendários, cartões, menus e janelas de diálogo.

Validação: compilação de produção, seis testes de segurança, navegação real com a conta administrativa, persistência do tema e verificação móvel em 390 px.

## Entrega: livros, atividades e preparação para nuvem

Cadastro de livros simplificado com upload por arrastar/selecionar, título automático pelo nome do PDF, capa padrão e detalhes opcionais. Uploads têm verificação de conteúdo e extensão controlada.

Atividades incluem perguntas abertas, seleção de turma, prazo, envio/atualização de respostas, nota/feedback e encerramento. O banco ganhou `activities` e `activity_submissions`, com índice único por atividade/aluno. A exclusão de aluno também remove suas respostas de atividades, seguindo o comportamento de exclusão das outras produções.

Foram aprovados 24 testes automatizados de backend/armazenamento/rotas de produção, a compilação da interface e o fluxo integrado real de livro, atividade, resposta e correção. Os registros criados pelos testes foram removidos. O adaptador R2/S3 foi testado com simulação do serviço, sem conectar uma conta externa. Docker não está disponível neste computador: a imagem e a hospedagem ainda precisam ser validadas no provedor.

O plano de menor custo está em `docs/COLOCAR-ONLINE.md`; a publicação depende de contas dos provedores e configuração das credenciais. Nenhum serviço foi contratado ou publicado.
