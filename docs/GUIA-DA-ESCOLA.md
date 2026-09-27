# ETI LEITURA — uso na escola

## Primeira configuração

1. Entre como administrador e abra **Painel do professor → Contas dos professores**.
2. Crie uma conta individual para cada professor e marque suas turmas. Entregue as credenciais diretamente ao titular.
3. Cada professor acompanha alunos, resumos, produções, atividades e relatórios somente das turmas autorizadas. Pode adicionar livros ao acervo compartilhado. O administrador mantém a gestão global de contas, exclusões, mural e calendário.
4. Alterar as turmas ou desativar uma conta encerra suas sessões; o professor precisará entrar novamente.

## Rotina do professor

- **Adicionar livro:** envie o PDF; o nome do arquivo preenche o título. Capa e detalhes são opcionais.
- **Atividades:** combine respostas escritas e múltipla escolha, escolha turma/prazo, associe um livro e anexe até cinco PDFs/imagens. As notas são atribuídas pelo professor, inclusive nas perguntas de múltipla escolha.
- O autor ou administrador pode editar uma atividade enquanto ela não tiver respostas. Após a primeira entrega, encerre a atividade para preservá-la. Outros professores da mesma turma podem acompanhar e corrigir seus alunos.
- **Pendências:** consulte os nomes de quem entregou e de quem falta entregar, além das correções pendentes.
- **Relatórios:** filtre a turma, acompanhe leituras declaradas como concluídas, entregas, participação e médias; exporte CSV para uma planilha. A participação considera as atividades disponíveis para a turma atual. A evolução mensal agrupa avaliações pela data de correção; não é uma comparação padronizada de aprendizagem.

## Rotina do aluno

- **Pendências** organiza as atividades por prazo.
- **Avisos** reúne atividades, prazos próximos e correções. São avisos dentro da plataforma; não são notificações push ou mensagens enviadas por e-mail. O contador se atualiza a cada minuto.
- Atividades, resumos e produções guardam rascunhos automaticamente **no navegador e na conta usados naquele aparelho**. Continuam guardando o texto com a página aberta e sem internet. Reabrir a plataforma depende de conexão; não é um aplicativo totalmente offline. Limpar os dados do navegador remove esses rascunhos.
- O rascunho não é uma entrega. Use **Enviar respostas**, **Salvar resumo** ou **Criar/Atualizar produção** para o professor receber o trabalho.
- **Ler livro** abre o PDF dentro da plataforma, com seleção de página e zoom. A página é guardada no aparelho e sincronizada com a conta quando há conexão. Links externos que bloqueiam leitura integrada podem ser abertos em outra aba; para garantir a integração, envie o PDF pela biblioteca.
- O botão de tema no cabeçalho alterna entre claro e escuro.

## Recuperação de senha

O administrador pode gerar um link em **Contas dos professores** ou **Alunos e turmas**. Copie-o e entregue ao titular. O link expira em 30 minutos, só pode ser usado uma vez e a troca encerra as sessões antigas.

O botão **Esqueci minha senha** já está na entrada. Para envio automático, configure `PUBLIC_APP_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, `SMTP_USER` e `SMTP_PASSWORD` no ambiente do servidor. A integração usa SMTP com STARTTLS. Sem SMTP, a recuperação por link gerado pelo administrador funciona normalmente. Nenhum e-mail real foi enviado durante os testes.

## Backup e restauração

O utilitário `scripts/backup.py` inclui coleções, índices e arquivos enviados; funciona com uploads locais e S3. Não inclui arquivos `.env` nem credenciais do servidor. Guarde também a configuração do ambiente em local privado, separado do backup.

Execute na pasta do projeto, preferencialmente com o uso da escola pausado para evitar alterações durante a cópia:

```powershell
.venv/Scripts/python.exe scripts/backup.py create --output .local/backups/eti-AAAA-MM-DD.zip
```

Cada arquivo recebe uma assinatura SHA-256. O nome de saída deve ser novo. Para conferir a restauração sem substituir o banco em uso:

```powershell
.venv/Scripts/python.exe scripts/backup.py restore .local/backups/eti-AAAA-MM-DD.zip --database eti_restore_AAAA_MM_DD --uploads .local/restauracao-AAAA-MM-DD
```

A restauração exige um banco novo com prefixo `eti_restore_` e uma pasta vazia; verifica assinaturas, contagens e arquivos restaurados. A troca do banco usado pela aplicação é uma operação posterior, deliberada. Em S3, os arquivos restaurados vão para a pasta indicada; para uma recuperação online será necessário enviá-los ao bucket preservando os caminhos.

Rotina sugerida: cópia diária, cópia em outro dispositivo/local privado e teste de restauração mensal. O utilitário está pronto; **não há agendamento automático de backup configurado no computador nem no serviço de hospedagem**. Não use o armazenamento temporário de uma hospedagem gratuita como único destino de backup.

## Piloto antes da abertura para toda a escola

1. Escolha dois professores e uma turma pequena; confira as permissões e os dados de cadastro.
2. Cadastre dois livros e publique uma atividade escrita e uma de múltipla escolha.
3. Peça aos alunos para ler, retomar a página, escrever um rascunho e enviar uma resposta usando celular e computador.
4. Corrija as entregas; confirme que os alunos receberam o feedback e que os relatórios correspondem às entregas.
5. Valide uma recuperação de senha, um backup e uma restauração em banco separado.
6. Registre dificuldades de acesso, nomes de botões confusos e problemas de conexão. Corrija-os antes de ampliar o uso.

O teste técnico simula contas de duas turmas e verifica isolamento, entregas, correção, rascunhos, PDF e relatórios. O piloto com professores/alunos reais ainda precisa ser realizado pela escola.

## Publicação

Veja [Colocar online](COLOCAR-ONLINE.md). A estrutura para hospedagem de baixo custo já existe no projeto. A plataforma ainda é local: contas dos serviços e variáveis de ambiente precisam ser configuradas antes da publicação. Configure `PUBLIC_APP_URL` com o endereço público antes de distribuir links de recuperação.


## Escrita direta dos alunos

Nas páginas autenticadas, as contas de aluno têm copiar, recortar e colar bloqueados, incluindo atalhos de teclado, eventos de área de transferência e inserção de texto por arrastar e soltar. O bloqueio também alcança formulários em painéis laterais. Digitação, seleção, revisão e rascunhos continuam disponíveis. Professores, administradores e a tela de login não recebem essa restrição.

Esta é uma restrição de interação no navegador, não uma detecção de IA nem uma garantia de autoria. Pode ser contornada por alterações no navegador ou solicitações diretas à API e não controla conteúdo aberto em outros sites/aplicativos. Não registra tentativas nem atribui penalidades aos alunos.
