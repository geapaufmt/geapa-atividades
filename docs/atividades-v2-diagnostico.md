# Diagnostico inicial - Atividades v2

## Estrutura atual encontrada

O repositorio `geapa-atividades` usa arquivos `.gs` numerados na raiz, sem pasta `src`.

- `00_module_public_api.gs`: concentra as funcoes publicas da V1.
- `01_config.gs`: guarda `ATIVIDADES_CFG`, nomes de abas fixas, keys estaveis e enums.
- `02_registry.gs`: centraliza acesso ao `GEAPA_CORE`, cache de Registry e abertura de planilhas/abas.
- `03_schema.gs`: guarda os schemas canonicos da V1.
- `04_periodos.gs`: contem utilitarios de periodo e a funcao de adicionar cabecalhos ausentes sem recriar abas.
- `05_sheet_setup.gs`: aplica UX de planilha, notas, cores, filtros, congelamento e validacoes.
- `06_period_runtime.gs`: orquestra setup V1, criacao de abas de periodo, logs funcionais e sincronizacoes.
- `17_triggers.gs` e fluxos posteriores: instalam/operam jobs reais da V1.
- `24_portal_atividades.gs`: ja expoe leitura de atividades da V1 para portal, mas ainda sobre a base atual.

O projeto ja possui muitas mudancas locais nao relacionadas no workspace. A v2 foi adicionada em arquivos novos para evitar mistura com alteracoes em andamento.

## Padroes observados

As funcoes publicas usam prefixo `atividades_` na V1. Funcoes internas usam sufixo `_`. Para a v2, foi adotado `atividadesV2_` para deixar claro que a infraestrutura e paralela e nao substitui a V1.

O acesso a planilhas e feito via `Registry` do `GEAPA_CORE`. A V1 usa `GEAPA_CORE.coreGetRegistry()`, `coreGetSheetByKey()` e `coreOpenSpreadsheetById()`, alem de helpers locais em `02_registry.gs`.

O logging atual combina `Logger.log`, registros funcionais em `Atividades_Log` e logs do `GEAPA_CORE` (`coreLogInfo`, `coreLogWarn`, `coreLogError`) quando disponiveis.

A UX de planilhas usa congelamento da linha 1, filtros, alinhamento, cores, notas e validacoes por cabecalho. A v2 reaproveita `GEAPA_CORE.coreFreezeHeaderRow`, `coreEnsureFilter`, `coreHeaderMap` e `coreGetCol` quando disponiveis.

## Como a v2 entra sem quebrar producao

A v2 e uma base DEV paralela. Ela nao altera a planilha atual `ATIVIDADES INTERNAS GEAPA`, nao altera chaves da V1, nao muda chamadas existentes e nao instala triggers.

A planilha v2 deve ser cadastrada manualmente no Registry com a key principal:

- `ATIVIDADES_V2_DB`

Essa key deve apontar para a planilha `ATIVIDADES INTERNAS GEAPA v2 - DEV`, com `ATIVO=SIM` e `AMBIENTE=DEV`.

O setup abre a planilha pela key `ATIVIDADES_V2_DB` e cria/valida as abas dentro dela. Ele nao cria nova planilha, nao cadastra linha no Registry e nao depende de Script Properties.

Como os exports normais do `GEAPA_CORE` filtram o Registry pelo ambiente atual do script, o setup v2 possui fallback somente-leitura para localizar explicitamente a linha `AMBIENTE=DEV` da key `ATIVIDADES_V2_DB`. Esse fallback nao altera o Registry.

## Arquivos criados

- `25_atividades_v2_schema.gs`: schemas, nomes de abas e enums de validacao da v2.
- `26_atividades_v2_setup.gs`: setup manual da base DEV via Registry.
- `docs/atividades-v2-diagnostico.md`: este diagnostico.
- `docs/atividades-v2-schema.md`: explicacao do modelo de dados.
- `docs/atividades-v2-roadmap.md`: fases previstas da implantacao.

## Funcoes publicas/manuais

- `atividadesV2_setupDatabaseDev()`: prepara a base DEV cadastrada no Registry.

## Funcoes internas principais

- `atividadesV2_getDatabaseSpreadsheetDev_()`
- `atividadesV2_createSheetIfMissing_(ss, sheetName)`
- `atividadesV2_applyHeadersIfMissing_(sheet, headers)`
- `atividadesV2_applyBasicSheetUx_(sheet)`
- `atividadesV2_applyValidations_(sheet, sheetName)`
- `atividadesV2_logSetup_(level, message, data)`

## Partes deixadas para fases futuras

- Migracao de dados reais da V1 para v2.
- Endpoints do Portal GEAPA.
- Escrita do portal em DEV.
- Registro real de presencas.
- Envio de e-mails.
- Triggers automaticos.
- Geracao de resumos `PORTAL_*`.
- Geracao de certificados.
- Homologacao e troca para producao.
