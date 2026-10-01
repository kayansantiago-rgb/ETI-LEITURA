# Notificações no celular

## Como o aluno ativa

1. Acessar o endereço HTTPS publicado da escola e entrar na sua conta.
2. Abrir o **sininho → Avisos no seu celular → Ativar neste aparelho**.
3. Permitir as notificações quando o navegador solicitar.
4. Usar **Testar notificação** e verificar se o aviso aparece no aparelho, inclusive com a plataforma fechada.

No iPhone/iPad com iOS 16.4 ou mais recente, adicionar o site à Tela de Início pelo menu Compartilhar do Safari e abrir pelo ícone antes de ativar. No Android, usar um navegador compatível; adicionar à tela inicial é opcional. Não é necessário publicar aplicativo em loja.

As preferências são individuais por aparelho. O aluno pode escolher novas atividades, lembretes, ambos ou nenhum. Ao sair da conta, o aparelho é desvinculado; é preciso ativar novamente após entrar. A troca de conta também invalida o vínculo anterior. A permissão pode ser revogada no próprio navegador.

## Regras de envio

- **Todo aviso novo do sininho também vai para a barra de notificações** do celular ou computador: atividades corrigidas ou devolvidas, resumos e produções corrigidos, novos quizzes, novos recados do mural e materiais. Para professores, novas entregas para corrigir (sem o nome do aluno na tela de bloqueio).
- Depois do login aparece um convite para ativar as notificações. Se a permissão já tinha sido dada antes, o aparelho é reativado sozinho. "Agora não" adia o convite por 7 dias; dá para ativar a qualquer momento em **Avisos**.

- Novas atividades publicadas **depois da ativação**, somente da turma do aluno ou de todas as turmas. Publicações antigas não são enviadas em lote. Publicações com mais de sete dias não são recuperadas após uma parada longa.
- Um lembrete na véspera e um no dia do prazo, entre **8h e 20h em Brasília**. Não são lembretes de exatamente 24 horas antes: o prazo das atividades é uma data, terminando às 23h59.
- Quem já entregou não recebe lembrete. Na devolução para refazer, vale o prazo individual da nova tentativa, mesmo com a atividade original encerrada.
- Na coincidência entre publicação e lembrete, o lembrete tem prioridade naquele ciclo.
- O serviço examina as pendências aproximadamente a cada minuto enquanto a API está rodando. O tempo de entrega depende também do serviço de push, conexão, permissões e restrições de bateria do aparelho.
- Tocar no aviso abre a atividade. Notas e respostas não são incluídas no aviso; título da atividade pode aparecer na tela bloqueada.

## Situação local e publicação

A implementação está pronta para publicação. As chaves VAPID locais foram geradas no `backend/.env`, sem exibir a chave privada. Enquanto `PUBLIC_APP_URL` apontar para HTTP local e não houver um contato VAPID válido, a interface informa que o envio ainda está sendo preparado e mantém o botão desativado. Nenhuma notificação real de aluno foi enviada nos testes automatizados.

Para ativar no servidor publicado:

1. Publicar em HTTPS com API e interface na mesma origem, conforme o Dockerfile existente.
2. Configurar `PUBLIC_APP_URL` com o endereço público HTTPS real.
3. Transferir as chaves `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` para os segredos do servidor, sem copiá-las para o frontend. Alternativamente, gerar um par uma única vez com `python scripts/setup_push.py`. Não regenerar a cada implantação: aparelhos inscritos dependem desse par.
4. Opcionalmente configurar `VAPID_SUBJECT` com `mailto:` seguido do contato real da escola. Sem isso, usa-se o endereço HTTPS público.
5. Instalar as dependências, inicializar o banco e reiniciar a API. A API inicia o verificador em segundo plano automaticamente; não depende de um aluno estar com uma aba aberta.
6. Validar o teste de notificação em um Android e em um iPhone instalado, com a plataforma fechada. Publicar uma atividade para uma turma de teste e confirmar os lembretes de uma entrega pendente.

`PUSH_ENABLED=false` suspende todos os envios e novas ativações sem apagar as chaves. Os avisos internos do sininho continuam funcionando.

**Hospedagem:** a configuração Render permanece no plano gratuito escolhido anteriormente. Esse plano suspende serviços sem tráfego; o verificador interno também para durante a suspensão. Não há garantia de aviso pontual nesse cenário. Para operação confiável, usar um servidor que permaneça ativo. Nenhum plano pago, agendamento externo ou serviço adicional foi contratado/configurado nesta alteração.

## Persistência e operação

`push_subscriptions` guarda os vínculos de aparelhos, preferências e chaves públicas de criptografia. `push_deliveries` registra eventos por aparelho, com trava temporária para múltiplos processos e reenvio com espera crescente, até cinco tentativas. Registros de envio expiram em 30 dias; nenhum evento permanece elegível durante todo esse período. Respostas 404/410 removem inscrições expiradas. Mudança de versão de acesso e desativação de usuário invalidam inscrições.

O envio externo e a gravação de sucesso no banco não formam uma transação única: uma falha abrupta entre eles pode gerar repetição. O aviso usa uma identificação estável para substituir o anterior no aparelho quando suportado. Não se promete entrega exatamente uma vez.

Os destinos aceitos são serviços HTTPS conhecidos de push (Google, Mozilla, Apple e Windows), sem redirecionamentos. Os registros operacionais não imprimem tokens de dispositivos, segredos ou conteúdo de mensagens. A chave privada VAPID deve acompanhar os segredos da implantação e ser protegida separadamente do backup do banco. O service worker não armazena páginas privadas, respostas ou notas em cache.

## Verificação realizada

- Testes de validação, calendário de Brasília, preferências e bloqueio de destinos impróprios.
- Integração com MongoDB temporário: permissões, turmas, envio único entre verificações/processos, entregas e novas tentativas, falhas temporárias e inscrições expiradas.
- Criptografia e assinatura reais, interceptando o transporte antes da rede. Nenhum envio para alunos.
- Navegador: ativação por clique, preferências, teste, desativação, estado indisponível e telas de celular.

Referências: [PushManager — MDN](https://developer.mozilla.org/en-US/docs/Web/API/PushManager), [Web Push no iOS — WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), [pywebpush](https://github.com/web-push-libs/pywebpush), [limitações do Render gratuito](https://render.com/docs/free).
