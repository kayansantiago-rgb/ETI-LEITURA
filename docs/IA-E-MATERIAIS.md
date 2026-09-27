# Assistente IA e materiais de estudo

O painel do professor tem dois novos acessos: **Assistente IA** e **Vídeos e materiais**.

## Assistente

O professor informa tema, disciplina, turma, objetivos e quantidade de perguntas abertas. O resultado abre como rascunho no formulário de atividades. Ele pode editar e só publica ao clicar em **Publicar atividade**.

Nas respostas de atividades, resumos e produções textuais, **Sugerir correção com IA** permite informar critérios ou gabarito. A sugestão contém nota, feedback e justificativa. **Usar nos campos de correção** apenas preenche o formulário; o professor precisa revisar e salvar para que o aluno receba a nota.

Para ativar, configure no ambiente do servidor ou em `backend/.env` e reinicie a API:

```dotenv
OPENAI_API_KEY=sua-chave-configurada-localmente
OPENAI_MODEL=gpt-4.1-mini
AI_DAILY_LIMIT=20
```

Não envie a chave pelo chat nem coloque no código do navegador. A integração usa a [Responses API com saída estruturada](https://developers.openai.com/api/docs/guides/structured-outputs). Sem chave, o assistente mostra ativação pendente e o restante da plataforma funciona normalmente. O modelo é configurável; precisa aceitar Responses e Structured Outputs. A API pode gerar cobrança: configure também os controles de uso no provedor.

O limite é por educador por dia UTC e conta tentativas, incluindo falhas. Não é um teto financeiro global. Cada chamada limita o tamanho da entrada e da saída; não há chamadas automáticas nem repetição automática em caso de falha. Testes usam respostas simuladas e não geram cobrança.

Na correção, enviamos somente o conteúdo necessário da entrega e os critérios, sem anexar os campos de nome, e-mail ou identificador do aluno. O próprio texto pode conter dados pessoais; o professor deve conferir antes de enviá-lo. Não são enviados PDFs automaticamente. O pedido usa `store:false`; isso não equivale a garantir ausência de retenção pelo provedor. A IA não determina uso de IA pelo aluno. O conteúdo completo de um livro não é fornecido na correção de resumos, portanto o professor deve validar fidelidade e contexto.

## Vídeos e materiais

Professores publicam título, disciplina, turma, orientações, link de vídeo do YouTube e até cinco PDFs ou imagens. É necessário ao menos um vídeo ou arquivo. Os vídeos são reproduzidos após clicar em **Assistir à aula**; se o autor impedir incorporação, há um link para abrir no YouTube. Vídeos privados não ficam disponíveis apenas por cadastrá-los aqui.

Alunos veem os materiais da sua turma e os gerais. Professores publicam nas turmas atribuídas e editam/excluem seus próprios materiais; administradores gerenciam todos e podem publicar para todas as turmas. A busca considera título, disciplina, turma e orientações, com filtro de disciplina.

Os arquivos usam o armazenamento já configurado da plataforma. Os links de uploads existentes são compartilháveis: a filtragem por turma da lista não transforma um arquivo em documento confidencial. Não há upload de arquivos de vídeo nesta versão, evitando armazenamento e tráfego de vídeos no servidor.

Execute `scripts/init_database.py` na instalação para criar os índices de `study_materials` e a coleção `ai_usage`. O backup existente inclui as novas coleções.
