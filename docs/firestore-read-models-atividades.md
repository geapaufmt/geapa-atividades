# Firestore read model do calendario

## Fonte oficial

Google Sheets V2 continua sendo a fonte oficial. A colecao
`portalActivities/{ID_ATIVIDADE}` e apenas um cache de leitura materializado a
partir de `PORTAL_ATIVIDADES_CALENDARIO` em DEV.

O pacote nao cria triggers, nao apaga documentos, nao publica frequencia,
justificativas, presencas individuais ou pendencias da diretoria e nao aceita
escrita do front-end.

## Contrato

O documento usa `schemaVersion: portal-activity-calendar-v2` e inclui apenas:

- identificacao e titulo publico da atividade;
- tipo, subtipo, data, horario e local;
- ciclo, ano e semestre;
- status publicos/operacionais disponiveis na view;
- visibilidade e classificacao de acesso;
- formato, carga horaria, eixos e pessoa principal publica;
- indicadores e resumo publico agregado de apresentacao;
- `badges` e `flags` estritamente operacionais;
- metadados `source`, `sourceSystem`, `sourceUpdatedAt` e `cacheUpdatedAt`.

Nao entram CPF, telefone, e-mail, observacao interna, presenca individual,
justificativa, ID de planilha, log, corpo de e-mail, token ou dado
administrativo interno.

Atividades classificadas como diretoria, secretaria, administracao, gestao ou
restritas sao bloqueadas no materializador. O read model compartilhado nao
substitui as autorizacoes por perfil do backend.

## Diagnostico

```javascript
atividadesV2_firestoreDiagnosticarCalendarioDev({
  limit: 5
})
```

O diagnostico nao escreve no Firestore nem em Sheets. Ele retorna totais,
motivos de bloqueio, exemplo seguro, tamanho aproximado, campos incluidos,
campos removidos e warnings.

## Sincronizacao

Previa sem escrita:

```javascript
atividadesV2_runTesteFirestoreCalendarioDryRun()
```

Escrita manual controlada:

```javascript
atividadesV2_runSyncFirestoreCalendarioCompletoDev()
```

Omitir `limit` e `idAtividade` e obrigatorio para uma materializacao completa.
Sincronizacoes limitadas continuam disponiveis para teste, mas gravam
`datasetComplete: false`; o Portal recusa esse conjunto parcial e usa o Apps
Script como fallback.

Atividade especifica:

```javascript
atividadesV2_firestoreSyncCalendarioDev({
  idAtividade: 'ATV-2026-1-0001',
  dryRun: false
})
```

O sync real usa lock, lote REST do GEAPA-CORE e registra somente contadores e
codigo de resultado em `Atividades_Log`. Nao registra o documento completo.

## Pre-requisitos

- biblioteca `GEAPA_CORE` em development mode ou versao que exporte
  `coreFirestoreBatchSetDocuments`;
- Script Properties do Firestore configuradas no projeto Core;
- Rules de `portalActivities` publicadas pelo repositorio `geapa-portal`.

Documentos que deixarem de existir na view nao sao apagados neste pacote. Ate
um fluxo explicito de reconciliacao ser homologado, o Portal rejeita cache
vencido e usa Apps Script.
