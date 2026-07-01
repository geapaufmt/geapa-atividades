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

## Eventos cobertos

- envio, aprovacao, ajuste e reprovacao de titulo/eixos;
- envio, reenvio, aprovacao, ajuste e dispensa de slide/material;
- envio, reenvio, aprovacao, ajuste e dispensa de foto da reuniao;
- envio, deferimento, indeferimento e ajuste de justificativa.

Eventos de apresentacao usam o adapter `APR`. Eventos de justificativa usam o
adapter `ATV` e mantem `entityType=JUSTIFICATIVA`.

## Destinatarios administrativos

Nenhum e-mail pessoal e hardcoded. A resolucao ocorre nesta ordem:

1. a rotina identifica a atividade pelo proprio evento, pela apresentacao ou
   pela justificativa;
2. usa `DATA_ATIVIDADE`, `CICLO`, `ANO` e `SEMESTRE` como referencia;
3. cruza em lote `PESSOAS_V2_BASE`, `PESSOAS_V2_IDENTIFICADORES`,
   `PESSOAS_V2_VINCULOS_GEAPA`, `VIGENCIAS_V2_DIRETORIAS`,
   `VIGENCIAS_V2_CARGOS_CONFIG` e `VIGENCIAS_V2_FUNCOES`;
4. seleciona apenas ocupantes validos da Secretaria na data da atividade;
5. valida e deduplica os e-mails encontrados.

Cargos de Presidencia, Vice-Presidencia e demais Diretorias nao recebem estes
eventos. Mesmo quando o cargo de Secretario pertence ao grupo institucional
`DIRETORIA`, a selecao exige alias de Secretaria, como `SECRETARIO_GERAL`,
`SECRETARIO_EXECUTIVO` ou `EMAILS_GRUPO=SECRETARIA`.

As keys V2 desta fase estao no Registry como `AMBIENTE=DEV`. O resolver tenta
primeiro `GEAPA_CORE.coreReadRecordsByKey`. Quando o Core esta executando com
ambiente atual `PROD` e rejeita uma key DEV, o backend abre a mesma key pelo
Registry DEV e registra `REGISTRY_DEV_DIRECT` como fonte de leitura. Nenhum ID
das bases Pessoas/Vigencias fica hardcoded no resolver.

`VIGENCIAS_V2_RESUMO_ATUAL` continua util para consultas do estado presente,
mas nao e usado como fonte temporal deste resolver: eventos historicos ou
futuros precisam dos intervalos de `VIGENCIAS_V2_FUNCOES`.

Somente resultados positivos da V2 ficam em cache de backend por 5 minutos. A
chave inclui versao do resolver, data, ciclo, ano e semestre. Fallbacks e
falhas nao sao cacheados como sucesso V2.

`MAIL_CONFIG` e usado somente quando a V2 nao produz nenhum destinatario
valido. As chaves de fallback sao:

- `ATIVIDADES_DESTINATARIOS_ADMINISTRATIVOS`;
- `APRESENTACOES_DESTINATARIOS_ADMINISTRATIVOS`.

Os valores dessas chaves devem conter somente enderecos institucionais da
Secretaria; elas nao devem ser usadas para distribuir o evento a toda a
Diretoria.

Para configurar explicitamente no Mail Hub, cadastre manualmente em
`MAIL_CONFIG`:

| Chave | Valor | Ativo |
|---|---|---|
| `ATIVIDADES_DESTINATARIOS_ADMINISTRATIVOS` | lista separada por virgula, ponto e virgula ou linha | `SIM` |

O metadata do contrato registra `recipientSource`, `fallbackUsed`, data de
referencia, ciclo, ano, semestre, cargos, `recipientWarnings`,
`adminResolverStats` e `adminResolverFallbackReason`. Isso permite auditar se
o destino veio de `PESSOAS_V2_VIGENCIAS_V2` ou de `MAIL_CONFIG_FALLBACK`, sem
expor listas de e-mails nos logs operacionais.

## Acoes sem comunicacao

Somente acoes presentes em `ATIVIDADES_V2_MAIL_EVENTS_` geram contrato. Acoes
tecnicas, atualizacao de views, diagnosticos, reparos e migracoes permanecem
sem e-mail por decisao explicita. Uma acao operacional nova de apresentacao ou
justificativa deve ser cadastrada no mapa ou documentada aqui antes da
homologacao.

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
  disponibilidade do Mail Hub e do fallback, sem enfileirar ou enviar;
- `atividadesV2_diagnosticarMailHubEventosPortalDev(options)` simula entidade,
  destinatarios, origem, fallback e correlation key de cada evento, sem
  escrever ou enfileirar;
- `atividadesV2_diagnosticarDestinatariosAdministrativosV2Dev(options)` mostra
  totais, cada etapa de filtro, descartes e fontes de leitura, mascarando os
  e-mails;
- `atividadesV2_limparCacheDestinatariosMailHubDev(options)` remove o cache da
  data/ciclo informado para repetir uma conferencia;
- `atividadesV2_processarFilaEmailsCore()` chama explicitamente
  `GEAPA_CORE.coreMailProcessOutbox()`.

Somente `atividadesV2_processarFilaEmailsCore()` pode enviar e-mails reais e
deve ser executada manualmente ou por um gatilho controlado. Nenhum trigger e
criado por este pacote.

## Homologacao

1. Execute `atividadesV2_diagnosticarMailHubIntegracao()`.
2. Execute, por exemplo:

```javascript
atividadesV2_diagnosticarMailHubEventosPortalDev({
  eventCode: 'APRESENTACAO_TITULO_EIXO_ENVIADO',
  idAtividade: 'ATV-2026-1-0011',
  idApresentacao: 'APR-2026-1-0011'
});
```

3. Para investigar cada filtro, execute:

```javascript
atividadesV2_diagnosticarDestinatariosAdministrativosV2Dev({
  eventCode: 'APRESENTACAO_TITULO_EIXO_ENVIADO',
  idAtividade: 'ATV-2026-1-0011',
  idApresentacao: 'APR-2026-1-0011'
});
```

4. Confirme `recipientSource=PESSOAS_V2_VIGENCIAS_V2`. Se
   `fallbackUsed=true`, confira Pessoas/Vigencias V2 antes da homologacao.
5. Em DEV, execute uma acao de cada grupo pelo Portal.
6. Confira a linha em `MAIL_SAIDA`, incluindo modulo, entidade, chave, etapa,
   destinatarios, assunto e contrato em `Observacoes`.
7. Repita a mesma acao e confirme a deduplicacao quando a chave for igual.
8. Somente depois, execute `atividadesV2_processarFilaEmailsCore()` em ambiente
   de homologacao autorizado.
9. Confira `MAIL_EVENTOS` e `MAIL_INDICE` apos o processamento.

Nao e necessario alterar o front-end para enfileirar mensagens. O Portal pode
usar `emailQueueWarning` para mostrar um aviso secundario, sem substituir a
mensagem de sucesso da acao principal.
