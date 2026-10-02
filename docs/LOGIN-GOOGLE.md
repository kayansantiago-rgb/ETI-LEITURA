# Entrar com Google

O botão **Continuar com o Google** aparece na tela de login assim que a variável `GOOGLE_CLIENT_ID` é configurada no servidor. Sem ela, nada muda.

## 1. Criar o ID do cliente (uma vez)

1. Acesse https://console.cloud.google.com/ com a conta Google da escola e crie um projeto (ex.: "ETI LEITURA").
2. Em **APIs e serviços → Tela de permissão OAuth**: tipo **Externo** (ou **Interno**, se a escola usa Google Workspace), nome do app "ETI LEITURA", e-mail de suporte da escola, logo opcional. Escopos: apenas os básicos (`email`, `profile`, `openid`).
3. Em **Credenciais → Criar credenciais → ID do cliente OAuth**, tipo **Aplicativo da Web**.
4. Em **Origens JavaScript autorizadas**, adicione o endereço do site, por exemplo `https://eti-leitura-production.up.railway.app` (sem barra no final). Não é preciso URI de redirecionamento.
5. Copie o **ID do cliente** (termina em `.apps.googleusercontent.com`). Ele não é segredo, mas só funciona nas origens cadastradas.

## 2. Configurar no Railway/Render

| Variável | Valor |
|---|---|
| `GOOGLE_CLIENT_ID` | O ID copiado no passo 5. |
| `GOOGLE_ALLOWED_DOMAINS` | Opcional. Ex.: `estudante.ifto.edu.br`. Só e-mails desses domínios podem **criar** conta pelo Google. Contas já existentes entram normalmente. |

## Como funciona

- **Conta já existe com o mesmo e-mail** (aluno, professor ou coordenação): entra direto.
- **E-mail novo**: o aluno escolhe a turma, aceita os termos de uso e a conta de aluno é criada. Professores continuam sendo cadastrados pela coordenação.
- O servidor confere o token com o Google (assinatura, validade, e-mail verificado e se foi emitido para o nosso ID). A senha do Google nunca passa pela plataforma.
- Contas criadas pelo Google recebem uma senha aleatória; se precisar entrar sem Google, a coordenação gera o link de nova senha.
