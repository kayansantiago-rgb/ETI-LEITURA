# Backup automático

Todo dia às **3h (Brasília)** o GitHub baixa uma cópia do banco de dados da ETI LEITURA. Aos **domingos** a cópia inclui também os PDFs, capas e imagens. Cada cópia é **criptografada** com uma senha da escola antes de ser guardada no GitHub:

| Cópia | Quando | Fica guardada |
|---|---|---|
| Só o banco (contas, notas, atividades, leituras…) | todo dia | 30 dias |
| Completa (banco + PDFs e imagens) | domingos | 14 dias |

Se uma cópia falhar, o GitHub envia um e-mail ao dono do repositório.

## Configurar (uma vez)

Os valores estão no arquivo `.local/backup-segredos.txt` deste computador (ele não vai para o GitHub).

1. **Railway** → serviço da ETI LEITURA → **Variables** → adicione `BACKUP_TOKEN` com o valor do arquivo. O Railway reinicia o serviço sozinho.
2. **GitHub** → repositório **ETI-LEITURA** → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Crie os três:
   - `APP_URL` — endereço do site (ex.: `https://eti-leitura-production.up.railway.app`)
   - `BACKUP_TOKEN` — o mesmo valor colocado no Railway
   - `BACKUP_PASSPHRASE` — a senha que abre os backups
3. Guarde a `BACKUP_PASSPHRASE` também **fora do computador** (gerenciador de senhas, papel no cofre da escola). Sem ela os backups não abrem.
4. Teste agora: GitHub → **Actions** → **Backup automático** → **Run workflow**. Em alguns minutos deve aparecer um ✅ e o arquivo em **Artifacts**.

Na plataforma, em **Painel do professor** (conta da coordenação), o cartão **Cópia de segurança** mostra se o automático está ativo e a data da última cópia. Lá também dá para baixar uma cópia na hora.

## Restaurar

1. Baixe o arquivo em GitHub → **Actions** → execução desejada → **Artifacts** (vem dentro de um `.zip`).
2. Abra a criptografia (precisa do [GnuPG](https://gnupg.org/download/); no Windows, Gpg4win):
   ```
   gpg --decrypt eti-leitura-AAAA-MM-DD-banco.zip.gpg > backup.zip
   ```
3. Restaure num banco **novo** (o banco em uso nunca é sobrescrito):
   ```
   .venv/Scripts/python.exe scripts/backup.py restore backup.zip --database eti_restore_AAAA_MM_DD --uploads .local/restauracao-AAAA-MM-DD
   ```
4. Confira os dados no banco restaurado e só então troque `DB_NAME` no Railway para ele, se for o caso.

Teste uma restauração por mês para ter certeza de que as cópias funcionam.

## Segurança

- O endereço de backup (`/api/admin/backup`) só responde para quem tem o `BACKUP_TOKEN` (mínimo de 32 caracteres) ou para a conta da coordenação.
- O backup **não** inclui senhas do servidor, chaves do JWT nem credenciais de armazenamento.
- Se o `BACKUP_TOKEN` vazar, troque o valor no Railway e no GitHub.
