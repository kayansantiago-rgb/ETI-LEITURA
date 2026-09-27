# ETI LEITURA online com o menor custo inicial

## Caminho preparado

Uma instalação para piloto escolar, com **custo de infraestrutura potencialmente zero dentro das franquias**, sem comprar domínio no início:

| Parte | Serviço | Função e limite relevante |
|---|---|---|
| Site + API | Render Free | Um endereço HTTPS para professores e alunos. Adormece após 15 minutos sem tráfego e não preserva arquivos locais. |
| Banco | MongoDB Atlas Free | Guarda contas, atividades, respostas e notas. Franquia de 512 MB, incluindo índices. |
| PDFs e imagens | Cloudflare R2 Standard | Guarda os arquivos de forma persistente. Franquia de 10 GB-mês, 1 milhão de operações classe A e 10 milhões classe B por mês. Excedentes podem ser cobrados. |

Fontes oficiais consultadas em 17/09/2026: [Render Free](https://render.com/docs/free), [MongoDB Atlas Free](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/), [tipos de cluster Atlas](https://www.mongodb.com/docs/atlas/manage-clusters/), [preços R2](https://developers.cloudflare.com/r2/pricing/), [ativação do R2](https://developers.cloudflare.com/r2/get-started/).

Essa escolha reduz o custo inicial, mas não garante disponibilidade contínua nem capacidade para toda a escola ao mesmo tempo. O primeiro acesso após inatividade pode demorar enquanto o Render liga o servidor. Faça um piloto com uma turma antes de adotar em todas as aulas. As franquias e condições pertencem aos provedores e devem ser conferidas no momento da contratação.

## O que já está no projeto

- `Dockerfile`: compila a interface e executa a API no mesmo endereço.
- `render.yaml`: configuração de um serviço Free, sem segredos no código.
- `.dockerignore` e `.gitignore`: excluem banco local, credenciais e uploads do envio do código.
- `backend/storage.py`: arquivos locais continuam funcionando no computador; no modo online, uploads vão para um bucket privado compatível com S3/R2.
- Links de arquivo ficam estáveis na API. Na nuvem, ela gera um link de download temporário ao abrir o arquivo; os segredos de armazenamento não vão para o navegador.
- `scripts/cloud_start.py`: verifica armazenamento, cria coleções/índices e pode criar a primeira conta administrativa.
- `/api/health`: verifica o acesso ao banco.

## Passo a passo da publicação

### 1. Contas e código

Use contas controladas pela escola em GitHub, Render, MongoDB Atlas e Cloudflare. O código pode ficar em um repositório privado no GitHub, conectado ao Render. Não envie `.env`, `.local`, `.venv`, arquivos do banco ou `backend/uploads`.

**Nada foi publicado ou contratado nesta etapa.** Ainda são necessários o acesso às contas dos provedores e a configuração dos serviços. O Dockerfile foi preparado, mas não foi construído neste computador porque Docker não está instalado; a compilação da interface e os testes locais passaram.

### 2. Banco no Atlas

Crie um cluster **Free**, um usuário de banco específico para a aplicação e uma senha forte. Configure a permissão de leitura/escrita para o banco `eti_leitura`. A string de conexão ficará apenas na variável `MONGO_URL` do Render.

Cadastre na lista de acesso do Atlas os endereços/faixas de saída apresentados pelo serviço Render. Consulte [Outbound IP Addresses](https://render.com/docs/outbound-ip-addresses). Não é necessário expor o MongoDB do computador da escola à internet.

### 3. Arquivos no R2

Ative R2 e crie um bucket Standard, por exemplo `eti-leitura-arquivos`. Mantenha o bucket privado. Crie uma credencial S3 com leitura/escrita de objetos apenas nesse bucket. Guarde o endpoint S3, access key e secret key nas variáveis privadas do Render.

Confira as condições de cobrança na ativação, acompanhe o consumo e configure notificações de uso disponíveis na conta. Uma franquia gratuita não representa bloqueio automático de gastos ao exceder o limite. Não contrate plano adicional nem domínio apenas para testar o piloto.

### 4. Aplicação no Render

Conecte o repositório e crie o serviço usando o `render.yaml` (Blueprint), ou um Web Service com runtime Docker e plano Free. Consulte [Docker on Render](https://render.com/docs/docker).

Configure estas variáveis no painel do serviço, nunca no repositório:

| Variável | Valor |
|---|---|
| `MONGO_URL` | String privada fornecida pelo Atlas, com usuário e senha do banco. |
| `DB_NAME` | `eti_leitura` |
| `JWT_SECRET` | Segredo aleatório de pelo menos 32 caracteres; o Blueprint pode gerá-lo. |
| `CORS_ORIGINS` | Endereço HTTPS exato atribuído ao site, sem barra final. |
| `STORAGE_BACKEND` | `s3` |
| `S3_ENDPOINT_URL` | Endpoint S3 da conta R2. |
| `S3_BUCKET` | Nome do bucket. |
| `S3_ACCESS_KEY_ID` | Access key privada do R2. |
| `S3_SECRET_ACCESS_KEY` | Secret key privada do R2. |
| `S3_REGION` | `auto` |
| `INITIAL_ADMIN_EMAIL` | E-mail válido para a primeira conta de gestão. |
| `INITIAL_ADMIN_PASSWORD` | Senha inicial com pelo menos 12 caracteres. |

Após o primeiro login confirmado, remova `INITIAL_ADMIN_PASSWORD` e `INITIAL_ADMIN_EMAIL` das variáveis. Reinícios não redefinem a senha nem promovem contas existentes.

O serviço inicia na porta fornecida pelo Render. Interface, API e arquivos usam o mesmo endereço, então não é necessário configurar uma URL diferente no frontend. O certificado HTTPS é fornecido pelo serviço. Um domínio próprio pode ser adicionado depois.

### 5. Dados e validação antes de divulgar

A instância online é separada do banco local. Ela não recebe automaticamente os livros ou usuários deste computador. Antes de migrar, faça backup; migre as coleções e os arquivos mantendo os caminhos `books/pdfs`, `books/covers`, `avatars` e `mural`. Para um piloto vazio, cadastre o acervo diretamente online.

Valide no endereço público:

1. Login administrativo e contas individuais para os responsáveis pela gestão (sem compartilhar a senha).
2. Cadastro de um aluno de teste e acesso apenas às atividades da sua turma.
3. Upload real de um PDF e uma capa; abra os arquivos novamente após reiniciar/reimplantar o serviço.
4. Professor publica atividade, aluno responde e recebe a correção.
5. Prazo/encerramento impedem novos envios; respostas de colegas não são acessíveis aos alunos.
6. Acesso por celular, tema escuro e teste com a turma piloto.
7. Plano de backup do Atlas e do bucket. O Atlas Free não oferece os backups gerenciados dos planos pagos; consulte suas limitações e faça cópias manuais/exportações com restauração testada.

Antes de ampliar o uso, planeje gerenciamento de contas individuais dos professores, recuperação de senha, rotinas de backup e limites de cadastro/acesso da escola. O painel atual usa a permissão administrativa existente para a gestão; não há autocadastro de professor com privilégios.

## Quando evoluir

Se o tempo para despertar o serviço atrapalhar as aulas, o primeiro investimento deve ser uma instância de aplicação que permaneça ligada. O banco e o armazenamento podem continuar nas franquias gratuitas enquanto o uso couber nelas. Não há necessidade de comprar domínio ou migrar tudo ao mesmo tempo.


## Contas, recuperação e backups

Depois de publicar, configure `PUBLIC_APP_URL` com a URL pública. SMTP é opcional: sem ele, o administrador gera links de recuperação em Contas dos professores/Alunos e turmas. Com SMTP, configure as variáveis do exemplo de ambiente para ativar o envio pelo formulário Esqueci minha senha.

Crie contas individuais de professores e atribua as turmas antes do piloto. O script `scripts/backup.py` copia MongoDB e uploads locais/S3 para um ZIP verificável; execute de uma máquina segura com acesso ao banco e ao bucket. O plano gratuito não fornece um agendador de backup configurado por este projeto. Veja o [Guia da escola](GUIA-DA-ESCOLA.md) para rotina e restauração.
