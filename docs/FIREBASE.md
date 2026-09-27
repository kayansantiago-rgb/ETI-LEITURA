# Firebase: proposta de migração da ETI LEITURA

Situação em 27/09/2026: o projeto Firebase ainda não foi criado. Nenhum deploy, cobrança ou transferência de dados foi realizado. A aplicação continua usando FastAPI, MongoDB e o armazenamento configurado atualmente.

## Arquitetura proposta

- Firebase Hosting: interface React compilada e domínio HTTPS.
- Cloud Run: API FastAPI, preservando as verificações de acesso por professor e turma.
- Firestore: banco de dados após adaptar as consultas e operações atômicas.
- Cloud Storage: PDFs, capas e materiais, com acesso controlado.
- Agendador gerenciado: disparos de notificações. O laço atual em segundo plano não é suficiente para uma API que pode ficar sem instâncias ou sem CPU fora das requisições.

Firebase Hosting pode encaminhar `/api/**` para Cloud Run. A configuração só deve ser ativada depois de haver serviço e região reais. Publicar apenas a interface não disponibiliza a plataforma completa.

## Custos

Cloud Run requer faturamento vinculado (Blaze). Cloud Storage para Firebase também exige Blaze atualmente. Há faixas gratuitas, mas não garantia de custo zero. Estimar alunos ativos, consultas, armazenamento e downloads antes da ativação. Alertas de orçamento avisam sobre gastos; não funcionam como bloqueio automático de cobrança.

## Adaptações necessárias antes da troca do banco

1. Inventariar e exportar as coleções, arquivos e relações por IDs. Gerar backup verificável.
2. Substituir consultas Motor/MongoDB por repositórios Firestore com consultas por turma e aluno; evitar varrer todas as coleções. Os endpoints atuais de notas e notificações precisam de consultas específicas para conter leituras cobradas.
3. Preservar unicidade de e-mail, entrega por aluno/atividade e leitura por aluno/livro com IDs determinísticos e transações.
4. Separar históricos crescentes em subcoleções; documentos Firestore possuem limite de 1 MiB.
5. Preservar concorrência de correções, permissões, recuperação de senha e revogação de sessão. Firebase Authentication pode ser adotado em etapa própria; trocar o banco não migra a autenticação automaticamente.
6. Manter credenciais de serviço somente no servidor, usando identidade do Cloud Run. Regras de acesso direto negadas por padrão se o navegador continuar acessando dados somente pela API.
7. Migrar arquivos e testar permissões, leitura de PDFs e URLs existentes.
8. Validar com emulador e projeto de homologação: notas zero, históricos, agendamento, notificações, backups e restauração.
9. Comparar contagens e relações, congelar escritas durante a transferência final, executar testes e só então mudar o ambiente público. Manter possibilidade de retorno ao banco anterior.

## Próxima ação do proprietário

Criar um projeto em https://console.firebase.google.com/ e informar somente seu ID. Não enviar senhas ou arquivos de chave privada no chat. A ativação de faturamento deve ocorrer com ciência do responsável. Escolher a região dos dados antes de criar o banco, considerando proximidade dos usuários e disponibilidade dos serviços.

## Referências oficiais

- https://firebase.google.com/docs/hosting/cloud-run
- https://firebase.google.com/docs/projects/billing/firebase-pricing-plans
- https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024
- https://firebase.google.com/docs/firestore/data-model
