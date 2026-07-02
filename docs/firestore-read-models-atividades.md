# Firestore read models de Atividades

## Fonte oficial

Google Sheets V2 continua sendo a fonte oficial. O Firestore e somente cache de
leitura materializado pelo Apps Script via `GEAPA_CORE` e REST. O navegador nao
escreve, nao ha Cloud Functions, fila nova ou service account.

O primeiro read model e `portalActivities/{ID_ATIVIDADE}`, derivado de
`PORTAL_ATIVIDADES_CALENDARIO`. `portalActivityDetails`, frequencia,
justificativas e pendencias individuais permanecem fora deste pacote.

Para a leitura inicial rapida do Portal, o sync completo tambem materializa o
documento publico agregado `portalActivityCalendarSnapshots/current`, com
`schemaVersion=portal-activity-calendar-snapshot-v1`. O array `atividades`
reutiliza exclusivamente os documentos produzidos pelo builder publico do
calendario; nao ha um segundo mapeamento com campos privados.

## Motor reutilizavel

O arquivo `45_atividades_v2_firestore_read_models.gs` separa o contrato do
calendario de helpers genericos:

- `atividadesV2_firestoreBuildSourceHash_(document, ignoredFields)`;
- `atividadesV2_firestoreBuildSourceVersion_(schemaVersion, sourceHash)`;
- `atividadesV2_firestoreSyncReadModelBySpec_(spec, options)`;
- `atividadesV2_firestoreDiagnoseReadModelBySpec_(spec, options)`;
- `atividadesV2_firestoreReconcileReadModelBySpec_(spec, options)`.

Novos read models devem fornecer uma `spec` com colecao, schema, fonte e funcao
`prepare`. Regras de Firestore REST, comparacao, lock, dry-run, relatorio e log
nao devem ser copiadas para cada view.

## Contrato do calendario

O schema atual e `portal-activity-calendar-v3`. O documento possui somente
campos publicos da view, alem de:

- `sourceHash` e `sourceVersion`;
- `datasetComplete` e `syncScope`;
- `ativoNoReadModel`, `stale` e `staleReason`;
- `source`, `sourceSystem`, `sourceUpdatedAt` e `cacheUpdatedAt`.

O hash usa representacao deterministica dos campos publicos. Metadados volateis,
como `cacheUpdatedAt`, escopo e marcadores stale, nao participam. Ao adicionar ou
remover campo publico, atualize o builder e altere `schemaVersion` quando o
contrato consumido pelo Portal mudar.

CPF, telefone, e-mail, observacao interna, presenca individual, justificativa,
IDs de planilha, logs e tokens nunca entram no documento nem nos logs.

## Tipos de sincronizacao

### Completa

Executa toda a view elegivel:

```javascript
atividadesV2_runSyncFirestoreCalendarioCompletoDev()
```

Os documentos recebem `datasetComplete=true`, `syncScope=FULL`,
`ativoNoReadModel=true` e `stale=false`. Documentos com `sourceVersion` e
metadados identicos sao pulados. Quando o conjunto e completo e nao vazio, a
mesma execucao grava `portalActivityCalendarSnapshots/current`.

O snapshot tambem pode ser reconstruido manualmente:

```javascript
atividadesV2_runSyncFirestoreCalendarioSnapshotDev()
```

Para conferir sem escrita:

```javascript
atividadesV2_firestoreSyncCalendarioSnapshotDev({ dryRun: true })
```

O snapshot e recusado se houver `limit`, `idAtividade`, conjunto vazio,
dataset parcial ou tamanho aproximado acima de 900 KB. Sync por ID nunca
substitui o snapshot completo.

### Por ID

```javascript
atividadesV2_firestoreSyncCalendarioDev({
  idAtividade: 'ATV-2026-1-0001',
  dryRun: false
})
```

Atualiza somente o documento da atividade com `datasetComplete=false` e
`syncScope=ID`. Se o conteudo for identico a um documento completo vigente, a
escrita e pulada e o marcador `FULL` existente e preservado.

O helper `atividadesV2_firestoreSyncCalendarioPorAtividadeSafe_` e usado depois
da atualizacao das views em criacao, edicao, publicacao, ocultacao, cancelamento,
reabertura e acoes de titulo/eixo, material e foto. Falhas retornam
`FIRESTORE_INCREMENTAL_SYNC_FALHOU`, sao registradas como warning e nunca
revertem a escrita oficial em Sheets.

Quando uma acao remove a atividade da view, o sync por ID marca o documento
existente como stale em vez de deixa-lo publicavel.

### Reconciliacao

Diagnostico sem escrita:

```javascript
atividadesV2_firestoreDiagnosticarReconciliacaoCalendarioDev({
  mode: 'MARK_STALE'
})
```

Aplicacao segura padrao:

```javascript
atividadesV2_firestoreAplicarReconciliacaoCalendarioDev({
  mode: 'MARK_STALE'
})
```

A rotina compara IDs elegiveis da view com os documentos da colecao. O modo
padrao grava `ativoNoReadModel=false`, `stale=true`, `staleReason` e
`staleDetectedAt`. `mode=DELETE` existe apenas para execucao manual explicita e
nunca e o default.

## Diagnosticos

Por atividade:

```javascript
atividadesV2_firestoreDiagnosticarCalendarioDev({
  idAtividade: 'ATV-2026-1-0001'
})
```

Completo em dry-run:

```javascript
atividadesV2_runTesteFirestoreCalendarioDryRun()
```

Os retornos informam totais lidos, elegiveis, selecionados, escritos, pulados
por igualdade, marcados stale, `sourceHash`, `schemaVersion`, `syncScope` e
exemplos sem dados sensiveis. Logs em `Atividades_Log` registram somente
contadores e codigos.

## Portal e fallback

O Portal ignora documentos com `ativoNoReadModel=false` ou `stale=true`.
Documentos incrementais podem compor um conjunto previamente completo, mas o
cliente exige evidencia vigente de pelo menos um documento `FULL` para tratar a
colecao como snapshot. Se o conjunto estiver parcial, vencido, vazio ou com
schema desconhecido, usa o Apps Script como fallback.

## Contrato do snapshot publico

`portalActivityCalendarSnapshots/current` contem apenas:

- metadados `source`, `sourceSystem`, `sourceUpdatedAt`, `cacheUpdatedAt`,
  `sourceHash`, `sourceVersion`, `schemaVersion`, `datasetComplete` e `stale`;
- `total`;
- `atividades`, usando os mesmos campos publicos permitidos em
  `portalActivities/{ID_ATIVIDADE}`.

CPF, telefone, e-mail, presenca individual, justificativa, logs, tokens,
observacoes internas e IDs de planilhas nao entram no documento. Sheets V2 e
Apps Script continuam sendo a fonte oficial.

## Pre-requisitos

- `GEAPA_CORE` em modo HEAD ou versao com `coreFirestoreGetDocument`,
  `coreFirestoreListDocuments`, `coreFirestoreBatchSetDocuments` e
  `coreFirestoreDeleteDocument`;
- propriedades Firestore configuradas no Core;
- Rules do `portalActivities` publicadas pelo repositorio `geapa-portal`;
- sync completo executado antes de habilitar a leitura Firestore no Portal.
