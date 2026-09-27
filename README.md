# ETI LEITURA

Plataforma escolar de leitura e produção textual. Interface React, servidor FastAPI e banco MongoDB.

Guia de uso, recuperação, backup e piloto: [Guia da escola](docs/GUIA-DA-ESCOLA.md).

## Recursos

- Cadastro de estudantes por turma, login e perfil com foto.
- Biblioteca por nível de ensino, busca por título/autor e filtros de progresso.
- Acompanhamento de leitura, resumos e produções textuais.
- Correção com nota e feedback, gerenciamento de alunos e acervo.
- Uploads de PDFs, capas, avatares e imagens do mural.
- Mural escolar e calendário de eventos.
- Interface responsiva com identidade ETI LEITURA, temas claro e escuro.
- Contas individuais de professores com acesso restrito às turmas atribuídas.
- Atividades escritas e múltipla escolha, anexos, livro associado e correção.
- Rascunhos locais automáticos, painel de pendências e avisos dentro da plataforma.
- Leitor PDF integrado com página sincronizada e relatórios exportáveis em CSV.
- Recuperação de senha por link e utilitário de backup/restauração verificável.

## Executar no Windows

Requisitos: Python 3.11 ou superior, Node.js e MongoDB disponível localmente ou em um servidor.

### Servidor

Na pasta principal:

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r backend/requirements.txt
Copy-Item backend/.env.example backend/.env
.\.venv\Scripts\python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Edite `backend/.env`: configure `MONGO_URL`, `DB_NAME` e cole o segredo gerado em `JWT_SECRET`. Para usar dados existentes, mantenha o nome do banco atual. Renomear a plataforma não exige trocar o banco.

```powershell
.\.venv\Scripts\python -m uvicorn backend.server:app --host 127.0.0.1 --port 8000 --reload
```

O MongoDB precisa estar acessível. Os arquivos enviados ficam em `backend/uploads`; inclua essa pasta e o banco nos backups.

### Interface

Em outro terminal:

```powershell
cd frontend
npm ci --legacy-peer-deps
npm start
```

Abra http://localhost:3000. Durante o desenvolvimento, `/api` é encaminhado para http://127.0.0.1:8000, incluindo os arquivos enviados. Para usar outro servidor, copie `frontend/.env.example` para `.env` e configure `REACT_APP_BACKEND_URL`. Hospedar interface e API na mesma origem mantém os links de uploads relativos funcionando; em origens separadas, encaminhe também `/api/uploads` ao servidor.

### Administrador

```powershell
.\.venv\Scripts\python scripts/create_admin.py
```

O script solicita e-mail e senha. Não há senha administrativa fixa. Cadastros públicos sempre criam estudantes. Contas antigas não são alteradas: revise administradores já cadastrados caso o sistema anterior tenha sido exposto.

### Validação

```powershell
cd frontend
npm run build
```

Na pasta principal:

```powershell
.\.venv\Scripts\python -m pip install -r backend/requirements-dev.txt
.\.venv\Scripts\python -m pytest tests -q
```

`backend_test.py` contém testes de integração legados e usa localhost por padrão. Ele cria registros: execute apenas em um banco de testes.

## Organização

- `frontend/src/pages`: telas dos estudantes e da administração.
- `frontend/src/components`: navegação, identidade visual e componentes compartilhados.
- `backend/server.py`: API, autenticação e acesso ao MongoDB.
- `scripts`: criação de administrador e manutenção do acervo.
- `docs/REMODELAGEM.md`: alterações, limpeza e sugestões de evolução.

## Publicação

Gere a interface com `npm run build` e publique `frontend/build`. O servidor web deve encaminhar `/api` para o FastAPI e retornar `index.html` nas rotas da interface. Configure as origens permitidas em `CORS_ORIGINS` e mantenha `JWT_SECRET` fora do repositório. Os exemplos de ambiente não contêm credenciais reais.

### Conferência visual

Com Google Chrome instalado, após gerar a interface:

```powershell
cd frontend
npm run test:ui
```

O teste abre um navegador isolado sem janela, usa respostas simuladas da API e verifica telas, busca, filtros, bloqueio de páginas administrativas e navegação móvel. As imagens geradas em `docs` usam dados demonstrativos; não representam o conteúdo do banco real.

## Banco local configurado

O banco `eti_leitura` foi criado nesta máquina usando MongoDB Community 8.0.30, obtido da distribuição oficial: https://www.mongodb.com/try/download/community-edition/releases/archive.

Para iniciar novamente, abra **INICIAR ETI LEITURA.cmd** na pasta principal. O atalho inicia MongoDB, API e interface em segundo plano; processos já ativos são preservados. Acesse http://127.0.0.1:3000.

- Dados persistentes: `.local/data`.
- Executável local: `.local/mongodb/mongod.exe`.
- Logs: `.local/logs`.
- Configuração privada da API: `backend/.env`.
- Conta administrativa criada: `admin@etileitura.com`; senha entregue na conversa.
- As coleções foram criadas, com índices para identificadores, e-mail, turma e relações entre livros e alunos.
- Banco e API escutam somente em `127.0.0.1`. A instalação atual é local, não uma hospedagem pública.

Não apague `.local/data`: ela contém o banco real. Os livros e trabalhos começarão vazios, prontos para cadastro; nenhum conteúdo demonstrativo foi inserido. Preserve também `backend/uploads` ao fazer backups. Para reinicializar apenas as coleções e índices sem apagar os registros, execute `.venv\Scripts\python scripts/init_database.py` com o MongoDB ativo.

## Atividades e cadastro simplificado de livros

O professor encontra **Atividades** no painel de gestão. Pode publicar de 1 a 20 perguntas escritas ou de múltipla escolha, escolher a turma e definir um prazo opcional (até 23h59 de Brasília). O aluno responde em **Minhas atividades**; o professor consulta as entregas, atribui nota e feedback. As respostas podem ser atualizadas enquanto a atividade estiver aberta; reenviar uma resposta corrigida exige confirmação e remove a nota anterior para nova correção. Atividades sem entregas podem ser excluídas; com entregas, devem ser encerradas para preservar o histórico.

No cadastro de livros, arraste o PDF ou escolha pelo botão. O nome do arquivo preenche o título; autor, sinopse e capa são opcionais. Sem capa, é usada a ilustração padrão da ETI. Também é possível informar links já existentes. O formulário mostra o progresso do upload e impede publicação durante o envio.

O banco agora contém treze coleções, incluindo posições de leitura, avisos lidos e recuperação de acesso. Após atualizar o código, rode `scripts/init_database.py` com o banco ativo e reinicie a API para carregar as novas rotas.

Para publicação com baixo custo, veja [COLOCAR-ONLINE.md](docs/COLOCAR-ONLINE.md). A configuração de nuvem foi preparada; não há hospedagem pública criada nesta etapa.

Teste integrado local (cria e remove registros temporários, usando uma conta administrativa existente): configure `ETI_TEST_ADMIN_PASSWORD` apenas no ambiente do terminal e execute `node scripts/check-learning.cjs`. Não grave a senha no código. Em caso de interrupção do teste, `scripts/cleanup_learning_test.py` remove somente os registros identificados em `.local/qa-learning.json`.


Teste completo de gestão escolar (API e navegador): com a API local e a interface compilada, configure `ETI_TEST_ADMIN_PASSWORD` no ambiente e execute `.venv/Scripts/python.exe scripts/check_school.py --browser`. Usa contas temporárias de duas turmas e remove seus registros ao terminar. Confere isolamento, atividades, relatórios, rascunhos offline, PDF e recuperação.
