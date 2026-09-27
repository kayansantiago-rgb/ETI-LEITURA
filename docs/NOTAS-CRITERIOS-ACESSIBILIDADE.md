# Banco de notas, critérios e acessibilidade

## Banco de notas

Acesse **Banco de notas** no painel do professor ou no menu Todas as áreas. Os alunos têm o acesso **Minhas notas**, com somente seus registros. Professores consultam as turmas atribuídas; administradores consultam todas.

As notas de atividades, resumos e produções são consultadas diretamente das correções originais, sem cópias. Corrigir uma entrega atualiza sua nota nesta consulta. Lançamentos manuais incluem aluno, avaliação, disciplina, data, bimestre, nota de 0 a 10, peso e comentário. O autor ou administrador pode editá-los; o histórico preserva os valores anteriores. Não há exclusão de notas manuais nesta versão.

Filtros: turma, aluno, disciplina, bimestre e ano. A exportação CSV respeita os filtros. A média por aluno é `soma(nota × peso) / soma(pesos)` dos registros visíveis; uma nota zero conta, ausência de nota não conta. Notas vindas das correções usam peso 1. Esta média não é uma regra de aprovação nem substitui a definição do regimento escolar. Os relatórios anteriores continuam apresentando as médias das entregas; o banco de notas também inclui os lançamentos manuais.

Novas atividades podem informar disciplina e bimestre. Registros antigos sem esses dados aparecem como **Sem disciplina** e **Bimestre não informado**; resumos e produções também permanecem sem esses campos. A data das notas de entregas é a data da correção. O registro manual permite definir a data da avaliação. Não há cálculo de recuperação ou fechamento oficial de boletim.

## Critérios de correção

Crie modelos em **Critérios de correção**. Cada modelo tem de 1 a 10 critérios, com pontos positivos que totalizam 10. Professores gerenciam seus modelos e o administrador pode gerenciar todos.

Na correção de uma atividade, resumo ou produção, abra **Corrigir por critérios**, escolha o modelo e atribua os pontos. **Preencher nota e feedback** substitui os campos atuais e registra a discriminação dos pontos no comentário. O professor ainda precisa salvar a correção. Alterar ou excluir um modelo não modifica os comentários já salvos. Na assistência de IA, escolher um modelo preenche os critérios enviados à IA; a revisão humana continua obrigatória.

## Avisos

O sininho segue como único acesso aos avisos. Alunos recebem avisos de materiais da sua turma, atividades, prazos próximos e correções, incluindo lançamentos manuais de notas. Professores veem entregas pendentes. Há filtro de não lidos e **Marcar todos como lidos** (os até 100 avisos retornados na página). O contador atualiza a cada minuto com a plataforma aberta. Não há envio por e-mail ou notificações push em segundo plano.

## Acessibilidade

O botão **Opções de acessibilidade** no cabeçalho permite aumentar as letras e reduzir animações; as escolhas ficam salvas no aparelho. A navegação mostra foco de teclado; o menu mantém o foco dentro dele e o devolve ao botão ao fechar. O atalho **Pular para o conteúdo** continua disponível.

Materiais de vídeo aceitam transcrição ou resumo textual preenchido pelo professor, até 30 mil caracteres. Legendas dependem da disponibilidade do vídeo no YouTube; não são geradas automaticamente. Transcrição é texto do áudio; resumo é uma alternativa resumida e não substitui uma transcrição completa. PDFs continuam dependendo da acessibilidade do arquivo original. Estas melhorias não representam uma certificação de conformidade integral.

## Verificação

- `python -m pytest tests -q`: validações e isolamento de acesso.
- `scripts/check_school.py`: integração com contas temporárias, notas/histórico, critérios e novos avisos; remove somente seus registros de teste.
- `node scripts/check-assessment.cjs`: fluxo visual simulado, fonte ampliada, teclado, dispositivos estreitos, critérios e notas.

Na implantação, execute `scripts/init_database.py` para criar `rubrics` e `grade_entries` e seus índices. O backup existente abrange essas coleções.

## Identidade visual

A abertura exibe ETI LEITURA por aproximadamente 1,8 segundo, no primeiro acesso da aba e após cada login bem-sucedido ou saída da conta. Ela não se repete na navegação entre páginas ou em uma atualização comum da mesma aba. O botão **Entrar na plataforma** e a tecla Escape pulam a abertura. Com redução de movimento, a abertura fica estática e dura cerca de meio segundo. A logo usa oito quadros vetoriais de página virando em um ciclo de 10 segundos, com intervalo de repouso; a preferência de reduzir animações desativa o ciclo. O efeito não exige imagens remotas ou chamadas ao servidor.
