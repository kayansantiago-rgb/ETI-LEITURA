# Validação da gestão escolar

Verificação local concluída em 17/09/2026 (Brasília).

- Compilação de produção concluída. O leitor PDF carrega separadamente para reduzir o carregamento inicial.
- 27 testes automatizados passaram: autenticação, autorização, atividades, uploads, leitura de arquivos S3, publicação da interface e proteções da restauração.
- Testes integrados com duas contas de professor e duas contas de aluno confirmaram restrição entre turmas, perguntas de múltipla escolha, anexos, livro associado, edição antes da entrega, bloqueio após entrega, notas, pendências, avisos e exportação CSV.
- Recuperação confirmada: link de uso único, expiração, senha anterior rejeitada e sessões antigas encerradas. A desativação do professor também encerra o acesso.
- Navegador: rascunhos de resposta escrita e alternativa preservados após escrita sem conexão e recarga posterior; resumo e produção preservados; rascunhos não enviados ao professor.
- PDF de duas páginas renderizado; página 2 restaurada após recarregar. Layout móvel sem rolagem horizontal da página.
- Relatório exportado, tema escuro, lista de entregas, contas de professores e formulário de recuperação conferidos.
- Fluxo anterior novamente validado: upload de PDF com título automático → publicação de atividade → resposta do aluno → correção → bloqueio após encerramento.
- Backup local criado em `.local/backups/eti-20260918_011936.zip`; 13 coleções e os arquivos enviados foram restaurados em destino separado. Os documentos restaurados foram comparados integralmente com a origem e os arquivos conferidos por SHA-256. O banco temporário de restauração foi removido; o backup original foi preservado.
- Os registros de professor/aluno/livro/atividade usados nos testes foram removidos. Não foram criadas contas demonstrativas permanentes.

Limites: nenhum serviço de hospedagem foi contratado ou publicado, nenhum e-mail real foi enviado, não há agendamento automático de backup e o piloto com usuários reais ainda não foi realizado. A integração S3 foi testada com simulação do serviço; precisa de uma verificação com o bucket real na publicação.
