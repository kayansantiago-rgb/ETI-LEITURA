# Modelos e novas tentativas

## Biblioteca do professor

Em **Atividades → Meus modelos**, o professor pode criar, buscar por título ou disciplina, editar e excluir seus modelos privados. Também pode abrir uma atividade existente e escolher **Salvar como modelo**.

**Usar modelo** abre uma nova atividade para revisão. O professor escolhe a turma e o prazo antes de publicar. Perguntas, alternativas, orientações, disciplina, bimestre, livro e anexos são reaproveitados. Respostas, notas e prazo anterior não são copiados. Cada publicação recebe identificadores novos. A exclusão ou edição de um modelo não altera atividades já publicadas. **Duplicar para outra turma** oferece o mesmo fluxo diretamente na atividade.

## Nova tentativa

Depois da primeira entrega, o aluno consulta suas respostas, mas não pode substituí-las livremente. Na resposta do aluno, o professor escolhe **Devolver para nova tentativa**, informa orientações e um prazo individual. A liberação aparece no sininho, nas atividades e nas pendências do aluno.

O prazo individual termina às 23h59 em Brasília e permite refazer mesmo quando o prazo original acabou ou a atividade foi encerrada. Não reabre a atividade para o restante da turma. Se esse prazo vencer, o professor pode liberar outro. Enquanto a tentativa está liberada, a correção da entrega devolvida fica suspensa.

Ao reenviar, a entrega anterior é arquivada com respostas, nota (inclusive zero), feedback, autor/data da correção e orientações para refazer. Professor e aluno consultam **Histórico de tentativas** na atividade. Não é possível editar essas versões pela interface ou pela API.

A nova tentativa fica sem nota até ser corrigida. O banco de notas considera somente a tentativa atual: notas antigas permanecem no histórico e não entram novamente na média. Ao liberar a tentativa, a nota anterior ainda aparece; ela sai do banco de notas quando ocorre o reenvio.

Dados anteriores a esta atualização são tratados como tentativa 1. Versões que já haviam sido sobrescritas antes desta funcionalidade não podem ser recuperadas.

## Verificação

- `python -m pytest tests -q`: validação e permissões.
- `python scripts/check_activity_workflow.py`: fluxo com MongoDB local em banco temporário exclusivo, removido ao finalizar; não altera os registros da escola.
- `node scripts/check-activity-ui.cjs`: navegador com dados simulados, publicação, devolução, histórico e telas de 320, 390 e 1440 pixels. Requer interface compilada servida na porta 3000.

Inicializar os índices com `scripts/init_database.py` e reiniciar a API ao instalar esta atualização. A coleção `activity_templates` guarda os modelos. O histórico fica no próprio documento da entrega e é incluído nos backups existentes.
