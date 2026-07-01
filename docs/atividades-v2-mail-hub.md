# Atividades V2 e Mail Hub do CORE

## Objetivo

As acoes operacionais do Portal enfileiram comunicacoes no Mail Hub V1 do
`GEAPA_CORE`. O modulo nao possui outbox propria e nao chama Gmail ou
`coreMailProcessOutbox()` durante a requisicao do Portal.

O arquivo de integracao e `43_atividades_v2_mail_hub_integracao.gs`. O numero
`41` ja pertence ao controle de entregaveis de apresentacoes.

## Contrato

`atividadesV2_mailQueueOutgoing_(evento, contexto)` monta contratos com:

- `moduleName` igual a `APRESENTACOES` ou `ATIVIDADES`;
- template `GEAPA_OPERACIONAL`;
- `correlationKey` produzida por `coreMailBuildCorrelationKey` com os adapters
  `APR` ou `ATV`;
- entidade, fluxo, etapa, destinatarios, assunto, payload e metadata;
- `forceQueueDuplicate=false`.

O envio ao Gmail nao ocorre nessa etapa. `coreMailQueueOutgoing` apenas cria ou
reutiliza uma linha em `MAIL_SAIDA`. A deduplicacao fica sob responsabilidade da
chave de correlacao e do Mail Hub.

## Eventos iniciais

- envio, aprovacao, ajuste e reprovacao de titulo/eixos;
- envio, reenvio, aprovacao e ajuste de slide/material;
- envio, reenvio e aprovacao de foto da reuniao;
- envio, deferimento, indeferimento e ajuste de justificativa.

Eventos de apresentacao usam o adapter `APR`. Eventos de justificativa usam o
adapter `ATV` e mantem `entityType=JUSTIFICATIVA`.

## Destinatarios administrativos

Nenhum e-mail e hardcoded. A resolucao ocorre nesta ordem:

1. valores ativos de `ATIVIDADES_DESTINATARIOS_ADMINISTRATIVOS` e
   `APRESENTACOES_DESTINATARIOS_ADMINISTRATIVOS` em `MAIL_CONFIG`;
2. grupos vigentes `SECRETARIA` e `DIRETORIA` fornecidos por
   `coreGetCurrentEmailsByEmailGroup`.

Para configurar explicitamente no Mail Hub, cadastre manualmente em
`MAIL_CONFIG`:

| Chave | Valor | Ativo |
|---|---|---|
| `ATIVIDADES_DESTINATARIOS_ADMINISTRATIVOS` | lista separada por virgula, ponto e virgula ou linha | `SIM` |

O modulo normaliza, valida e remove e-mails duplicados antes de montar o
contrato.

## Falhas nao bloqueantes

Uma falha no Mail Hub nao desfaz nem transforma a acao do Portal em erro. A
resposta principal permanece `ok=true` e pode incluir:

```javascript
{
  emailQueueWarning: "A acao foi concluida, mas o e-mail nao entrou na fila central.",
  emailQueue: {
    ok: false,
    eventCode: "...",
    errorCode: "..."
  }
}
```

Sucessos, duplicidades e falhas sao registrados de forma resumida em
`Atividades_Log`, sem listas de destinatarios ou payloads pessoais.

## Funcoes administrativas

- `atividadesV2_diagnosticarMailHubIntegracao()` verifica wrappers, adapters e
  quantidade de destinatarios, sem enfileirar ou enviar mensagens;
- `atividadesV2_processarFilaEmailsCore()` chama explicitamente
  `GEAPA_CORE.coreMailProcessOutbox()`.

A segunda funcao pode enviar e-mails reais e deve ser executada manualmente ou
por um gatilho controlado. Nenhum trigger e criado por este pacote.

## Homologacao

1. Execute `atividadesV2_diagnosticarMailHubIntegracao()`.
2. Confirme `mailHubDisponivel=true` e destinatarios administrativos maiores
   que zero.
3. Em DEV, execute uma acao de cada grupo pelo Portal.
4. Confira a linha em `MAIL_SAIDA`, incluindo modulo, entidade, chave, etapa,
   destinatarios, assunto e contrato em `Observacoes`.
5. Repita a mesma acao e confirme a deduplicacao quando a chave for igual.
6. Somente depois, execute `atividadesV2_processarFilaEmailsCore()` em ambiente
   de homologacao autorizado.
7. Confira `MAIL_EVENTOS` e `MAIL_INDICE` apos o processamento.

Nao e necessario alterar o front-end para enfileirar mensagens. O Portal pode
usar `emailQueueWarning` para mostrar um aviso secundario, sem substituir a
mensagem de sucesso da acao principal.
