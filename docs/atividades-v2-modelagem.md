# Atividades v2 - Modelagem atividade, apresentacao e envolvidos

## Decisao

Na v2, `Atividades` e a fonte oficial do evento. Ela concentra agenda, titulo, descricao, data, horario, local, formato, tipo/subtipo, eixos tematicos, pessoa principal, publicacao no portal, visibilidade, links gerais, presenca, falta, certificado e carga horaria.

`Atividades_Apresentacoes` deixa de ser uma agenda paralela. Ela passa a ser uma extensao operacional do fluxo de apresentacao de membro, com status, cobrancas, notificacoes, envio de arquivo, sync historico, elegibilidade e auditoria.
Na nomenclatura nova, o envio passa a ser tratado como material de apresentacao. Campos antigos com `ARQUIVO` podem ficar fisicamente como legado, mas os campos ativos usam `MATERIAL` e a pasta geral da atividade fica em `Atividades.ID_PASTA_DRIVE` / `Atividades.LINK_PASTA_DRIVE`.

`Atividades_Envolvidos` guarda uma ou mais pessoas vinculadas a uma atividade. A pessoa principal em `Atividades` existe para listagens e cards rapidos; a composicao completa fica em `Atividades_Envolvidos`.

## Regras de fonte

- Data, horario, local, formato, titulo, eixo e pessoa principal devem vir de `Atividades`.
- `Atividades_Apresentacoes` pode manter colunas legadas temporariamente, mas novas rotinas nao devem depender delas como fonte de verdade.
- `Atividades_Envolvidos` usa `ID_PESSOA` quando disponivel e mantem RGA/e-mail/nome como auxiliares de migracao e conferencia.
- Eixo tematico e conceito de pessoa principal valem para atividades academicas em geral, nao apenas para apresentacoes.

## Portal

- `PORTAL_ATIVIDADES_CALENDARIO` e a view leve de lista/cards para proximas atividades e historico.
- Apresentacoes aparecem dentro da agenda/historico geral como subtipo de atividade.
- `PORTAL_ATIVIDADES_DETALHES` consolida `Atividades`, `Atividades_Envolvidos` e a extensao operacional de apresentacao em uma linha por `ID_ATIVIDADE`.
- Multiplas apresentacoes da mesma atividade ficam serializadas em `APRESENTACOES_PUBLICAS_JSON`.
- `CICLO`, `ANO`, `SEMESTRE` e `ROTULO_SEMESTRE` saem de `Atividades` e alimentam filtros de historico no Portal.
- A antiga view `PORTAL_APRESENTACOES` foi removida do contrato ativo. Agenda, historico, detalhes e "Minhas apresentacoes" usam somente calendario e detalhes.

## Migracao DEV

Use primeiro:

```js
atividadesV2_migrarApresentacoesParaAtividadesDevDryRun()
```

Depois de revisar conflitos e contadores, use:

```js
atividadesV2_migrarApresentacoesParaAtividadesDev()
```

A migracao preenche lacunas em `Atividades` e cria linhas em `Atividades_Envolvidos` a partir de dados legados de `Atividades_Apresentacoes`. Ela nao altera V1, nao altera producao, nao cria triggers e nao envia e-mails.

## Homologacao

Depois da migracao, atualize as views:

```js
atividadesV2_atualizarViewsPortal({ dryRun: false })
```

Antes de ligar o portal, conferir:

- cards de apresentacao em `PORTAL_ATIVIDADES_CALENDARIO`;
- detalhes completos em `PORTAL_ATIVIDADES_DETALHES`, com uma linha por atividade;
- `APRESENTACOES_PUBLICAS_JSON`, `QTD_APRESENTACOES` e `RESUMO_APRESENTACOES_PUBLICO`;
- avisos de consistencia em `atividadesV2_conferirConsistencia({ includeSamples: true })`.
