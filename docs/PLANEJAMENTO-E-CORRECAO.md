# Planejamento, correção e respostas em etapas

## Publicação agendada

Em **Atividades → Criar atividade**, escolha **Agendar publicação** e informe a data e hora de Brasília. O prazo de entrega não pode ser anterior ao dia da publicação.

As atividades ficam na aba **Agendadas**. Antes da publicação, os alunos não conseguem abrir, responder ou encontrar a atividade nas listas, pendências, relatórios de participação e avisos. A liberação é verificada no servidor a cada consulta; não depende de uma tarefa agendada externa. Uma tela já aberta precisa ser atualizada para buscar novas atividades.

Para mudar o horário ou antecipar a publicação, abra a atividade e escolha **Editar atividade**. **Publicar agora** libera ao salvar. Uma atividade já publicada não pode ser ocultada novamente por agendamento. A edição de conteúdo continua bloqueada quando existem respostas.

Os avisos de nova atividade consideram a data efetiva da publicação. O envio ao celular ainda depende da configuração Web Push e de um servidor ativo, conforme NOTIFICACOES-CELULAR.md.

## Correção individual

Ao abrir uma atividade com entregas, o professor vê uma entrega por vez. No computador, respostas e ferramentas ficam lado a lado. No celular, as abas **Resposta** e **Correção** alternam os painéis.

- Selecione o aluno ou use **Anterior / Próximo aluno**.
- Filtre por entregas aguardando correção.
- Use os critérios existentes ou escreva a nota e o feedback.
- Salve frases em **Meus comentários reutilizáveis**. A biblioteca é privada da conta do professor e fica no banco de dados.
- **Adicionar ao feedback** apenas preenche o texto. **Enviar correção**, **Atualizar correção** ou **Salvar e próximo** enviam ao aluno.
- Os campos de nota e feedback em edição são guardados no navegador, separadamente por conta, entrega e versão da resposta. Os pontos ainda não aplicados de um modelo de critérios não fazem parte desse rascunho.

O controle de versão continua impedindo corrigir uma tentativa que mudou durante a revisão.

## Respostas em etapas

O aluno responde uma pergunta por vez, acompanha o progresso e pode voltar para ajustar o texto. A revisão reúne todas as respostas antes do envio explícito. Nenhuma resposta é enviada apenas ao avançar uma etapa.

O rascunho continua salvo neste navegador. Em caso de falha de conexão, a tela mantém as respostas para uma nova tentativa de envio. A entrega só é concluída após a confirmação do servidor.

## Verificações

- `python -m pytest tests -q`: regressões do servidor.
- `python scripts/check_activity_schedule.py`: banco temporário, permissões, horários, visibilidade, notificações e comentários privados.
- `python scripts/check_activity_workflow.py`: modelos, reenvios, histórico e correção.
- `node scripts/check-ui.cjs` (após `npm run build`): percorre as telas atuais com dados fictícios de `scripts/ui-fixtures`, no computador e no celular, incluindo correção e leitura até o certificado.
