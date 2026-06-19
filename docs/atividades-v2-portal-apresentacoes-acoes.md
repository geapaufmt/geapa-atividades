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
atividadesV2_portalEditarEAprovarTituloEixoApresentacao(payload, contexto)
atividadesV2_portalReprovarTituloEixoApresentacao(payload, contexto)
atividadesV2_portalRegistrarMaterialApresentacao(payload, contexto)
atividadesV2_portalRevisarMaterialApresentacao(payload, contexto)
atividadesV2_portalListarPendenciasApresentacoesDiretoria(contexto)
atividadesV2_atualizarStatusRealizacaoApresentacoesDev(options)
```

Diagnosticos:

```js
atividadesV2_diagnosticarFluxoApresentacoesPortalDev()
atividadesV2_runTestePortalApresentacoesAcoesDev()
```

## Flags de acoes

As apresentacoes retornadas ao Portal separam as permissoes em dois blocos:

```js
acoesMembro: {
  podeEditarTituloEixo,
  podeEnviarMaterial,
  podeReenviarMaterial,
  podeAbrirMaterial,
  podeAbrirPastaAtividade
}

acoesGestao: {
  podeAprovarTituloEixo,
  podeEditarEAprovarTituloEixo,
  podeSolicitarAjusteTituloEixo,
  podeReprovarTituloEixo,
  podeAprovarMaterial,
  podeSolicitarAjusteMaterial,
  podeDispensarMaterial
}
```

`Minhas apresentacoes` usa apenas `acoesMembro`, mesmo quando o usuario tambem tiver perfil de diretoria ou administrador; o backend zera `acoesGestao` nesse endpoint. `Pendencias de apresentacoes` deve usar apenas `acoesGestao`.

As flags de membro respeitam `BLOQUEADO_PARA_EDICAO`, `STATUS_APRESENTACAO`, `STATUS_TITULO_EIXO`, `STATUS_ENVIO_MATERIAL` e a existencia de material/pasta. A validacao real continua no backend.

`Editar e aprovar` e uma acao de gestao: atualiza titulo/eixos em `Atividades`, define `STATUS_EIXO_TEMATICO = APROVADO`, define `STATUS_TITULO_EIXO = APROVADO`, registra auditoria e atualiza views. `Reprovar titulo/eixos` rejeita apenas a proposta de tema: exige observacao obrigatoria, mantem `STATUS_APRESENTACAO` ativo, grava `STATUS_TITULO_EIXO = REPROVADO` e `STATUS_EIXO_TEMATICO = REPROVADO`, registra os valores anteriores em `Portal_Acoes` e `Atividades_Log`, e permite que o membro envie nova proposta diferente da anterior.

Quando `STATUS_TITULO_EIXO = PENDENTE`, a gestao nao recebe acoes de revisao: nao aprova, nao edita/aprova, nao solicita ajuste e nao rejeita proposta inexistente. O Portal deve mostrar apenas estado informativo, como "Aguardando envio pelo apresentador". As acoes de revisao de titulo/eixo aparecem apenas quando ha proposta enviada para analise (`ENVIADO`, `RECEBIDO` em fluxo atual ou `EM_ANALISE`).

Quando `STATUS_ENVIO_MATERIAL = PENDENTE`, a gestao nao recebe acoes de revisao de material. Pode haver apenas estado informativo, solicitacao futura ou `podeDispensarMaterial`. Aprovacao/ajuste de material aparecem apenas para `RECEBIDO`, `REENVIADO` ou `EM_ANALISE`.

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

Para `Minhas apresentacoes`, o backend le as abas-base `Atividades` e `Atividades_Apresentacoes` em modo somente leitura. Essa tela privada nao depende exclusivamente de `APRESENTACOES_PUBLICAS_JSON`, porque apresentacoes proprias podem ter `PUBLICAR_NO_PORTAL = NAO` e ainda assim precisam aparecer para o apresentador.

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

- `APRESENTACAO_SEM_APRESENTADOR`;
- `TITULO_EIXO_PENDENTE`;
- `TITULO_EIXO_AGUARDANDO_ANALISE`;
- `TITULO_EIXO_AJUSTE_SOLICITADO`;
- `MATERIAL_PENDENTE`;
- `MATERIAL_AGUARDANDO_ANALISE`;
- `MATERIAL_AJUSTE_SOLICITADO`.

Nao entram como pendencia operacional as apresentacoes historicas ja realizadas com material corretamente registrado e status de material `RECEBIDO`, `HISTORICO` ou `APROVADO`.

`STATUS_ENVIO_MATERIAL = HISTORICO` nunca gera pendencia de material. `STATUS_ENVIO_MATERIAL = RECEBIDO` so gera pendencia de analise quando houver uma regra explicita de aprovacao de material no fluxo atual; no historico migrado, e tratado como resolvido quando houver material registrado ou `SYNC_HISTORICO_PUBLICO = SIM`.

A view inclui os campos de contexto necessarios para o Portal montar cards de gestao sem reler abas operacionais: atividade, apresentacao, semestre, apresentador, eixos, status e dados seguros do material.

O endpoint `atividadesV2_portalListarPendenciasApresentacoesDiretoria` agrupa a resposta em um card por `ID_APRESENTACAO`, evitando cards duplicados para a mesma apresentacao. A visualizacao normal do Portal deve usar o payload limpo:

```js
{
  idApresentacao,
  idAtividade,
  gravidade,
  dataFormatada,
  dataRotulo,
  atividadeRotulo,
  tituloExibicao,
  nomeApresentador,
  eixosResumo,
  badges,
  pendenciasResumo,
  acoesDisponiveis
}
```

`badges` ja vem separado em objetos `{ id, label, nivel }`. `pendenciasResumo` contem frases curtas e humanas, sem repetir status tecnico. `acoesDisponiveis` contem apenas acoes reais permitidas no backend; por exemplo, titulo/eixos `PENDENTE` nao recebe aprovar, editar/aprovar, solicitar ajuste ou rejeitar proposta, pois ainda nao ha proposta enviada.

Os campos `pendenciasInternas`, `blocoTituloEixos`, `blocoMaterial` e `detalhesTecnicos` seguem disponiveis para compatibilidade e depuracao, mas nao devem aparecer por padrao. Se necessario, o Portal pode mostrar `detalhesTecnicos` apenas em area recolhida para admin tecnico.

Datas devem ser exibidas a partir de `dataFormatada` ou `dataRotulo`; nenhum card deve renderizar diretamente objetos `Date` ou strings com timezone. Quando o titulo real ainda nao foi informado, `tituloExibicao` retorna `Titulo ainda nao informado`; `Apresentacao de Membro` fica como `atividadeRotulo`, nao como titulo do trabalho.

## Cache

O backend usa `CacheService` de forma curta e segura:

- eixos tematicos: cache de configuracao;
- `Minhas apresentacoes`: cache privado por contexto de usuario, com TTL curto;
- pendencias de apresentacoes: cache global curto para gestao;
- calendario/detalhes/bundle continuam usando os caches ja existentes.

Toda escrita de apresentacao invalida caches relacionados: minhas apresentacoes do ator e do membro afetado, pendencias de apresentacoes, calendario, detalhes e bundle. A leitura do portal nao recalcula views pesadas; atualizacoes de views continuam ocorrendo apos escrita ou por rotina controlada.

No futuro, as views materializadas do portal poderao ser exportadas para Firestore. Nesta fase, o Apps Script segue como backend/API e fonte de escrita.

## Status REALIZADA

A rotina `atividadesV2_atualizarStatusRealizacaoApresentacoesDev(options)` marca apresentacoes de membro como realizadas de forma controlada. Por padrao, roda em `dryRun`.

```js
atividadesV2_atualizarStatusRealizacaoApresentacoesDev({ dryRun: true })
atividadesV2_atualizarStatusRealizacaoApresentacoesDev({ dryRun: false, atualizarViews: true })
```

Uma apresentacao e candidata quando a atividade esta ativa, nao cancelada/suspensa/bloqueada, a data e horario final ja passaram, o subtipo e `APRESENTACAO_MEMBRO`, titulo/eixos estao `APROVADO`, `RECEBIDO` ou `HISTORICO`, e material esta `RECEBIDO`, `APROVADO`, `HISTORICO` ou `DISPENSADO`.

Quando aplicada, a rotina grava `Atividades.STATUS_OPERACIONAL = REALIZADA` e `Atividades_Apresentacoes.STATUS_APRESENTACAO = REALIZADA`, registra `Atividades_Log` e, se `atualizarViews = true`, regenera as views do portal.

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
