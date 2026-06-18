# Atividades v2 - Acoes de apresentacoes pelo Portal

Este pacote prepara as escritas de apresentacoes pelo Portal GEAPA na base `ATIVIDADES_V2_DB`, ainda em DEV.

Nao faz chamada de presenca, nao cria triggers, nao envia e-mails e nao escreve na V1.

## Fontes

`Atividades` e a fonte canonica de titulo, eixos e dados publicos da apresentacao:

- `TITULO`
- `TITULO_PUBLICO`
- `EIXO_TEMATICO_PRINCIPAL`
- `EIXO_TEMATICO_SECUNDARIO`
- `STATUS_EIXO_TEMATICO`
- dados de pessoa principal.

`Atividades_Apresentacoes` guarda o controle operacional:

- `STATUS_TITULO_EIXO`
- cobrancas de titulo/eixo;
- campos novos de material;
- auditoria de atualizacao.

Nao devem ser criados campos duplicados de titulo/eixo em `Atividades_Apresentacoes`.

## Eixos tematicos

O endpoint `atividadesV2_portalListarEixosTematicos(contexto)` le a base oficial `EIXOS_TEMATICOS_OFICIAIS` pelo Registry e retorna apenas eixos ativos, ordenados por `ORDEM`.

O Portal deve exibir `rotuloFormulario`. O backend valida novamente o eixo principal e o secundario antes de gravar.

## Endpoints publicos

```js
atividadesV2_portalListarEixosTematicos(contexto)
atividadesV2_portalEnviarTituloEixoApresentacao(payload, contexto)
atividadesV2_portalRevisarTituloEixoApresentacao(payload, contexto)
atividadesV2_portalRegistrarMaterialApresentacao(payload, contexto)
atividadesV2_portalRevisarMaterialApresentacao(payload, contexto)
atividadesV2_portalListarPendenciasApresentacoesDiretoria(contexto)
```

Diagnosticos:

```js
atividadesV2_diagnosticarFluxoApresentacoesPortalDev()
atividadesV2_runTestePortalApresentacoesAcoesDev()
```

## Auditoria

Toda acao grava `Portal_Acoes` e `Atividades_Log` com dados resumidos. Payloads de arquivo nao sao gravados no log.

## Views

Apos escrita operacional, as views sao atualizadas para refletir:

- `PORTAL_ATIVIDADES_CALENDARIO`
- `PORTAL_ATIVIDADES_DETALHES`
- `APRESENTACOES_PUBLICAS_JSON`
- `PORTAL_PENDENCIAS_DIRETORIA`
- `PORTAL_STATUS_ATIVIDADES`

O Portal continua lendo `PORTAL_ATIVIDADES_DETALHES` e `APRESENTACOES_PUBLICAS_JSON`; nao escreve em views.

## Material

O material da apresentacao usa:

- `ID_ARQUIVO_MATERIAL`
- `NOME_ARQUIVO_MATERIAL`
- `LINK_MATERIAL_APRESENTACAO`
- `MIME_TYPE_MATERIAL`
- `VERSAO_MATERIAL`

O envio aceita `fileId` ja existente no Drive ou `conteudoBase64` com nome/mime type. Tipos iniciais aceitos: PDF, PPT, PPTX e ODP.

## Pendencias

`PORTAL_PENDENCIAS_DIRETORIA` passa a incluir pendencias de apresentacoes:

- titulo/eixo pendente;
- titulo/eixo aguardando analise;
- titulo/eixo com ajuste solicitado;
- material pendente;
- material aguardando analise;
- material com ajuste solicitado.

## Teste manual recomendado

1. `atividadesV2_portalListarEixosTematicos({ perfil: 'MEMBRO' })`
2. `atividadesV2_diagnosticarFluxoApresentacoesPortalDev()`
3. `atividadesV2_runTestePortalApresentacoesAcoesDev()`
4. Testar envio de titulo/eixo com um membro dono da apresentacao.
5. Testar tentativa de editar apresentacao de outro membro.
6. Testar aprovacao/ajuste com perfil `DIRETORIA`.
7. Testar envio de material.
8. Rodar `atividadesV2_conferirPortal({ dryRun: true, includeSamples: true })`.

## Proxima etapa no Portal

O `geapa-portal` deve consumir os endpoints acima, renderizar dropdown de eixos oficiais e usar as flags retornadas em `Minhas apresentacoes` para habilitar botoes, mantendo a validacao real no backend.
