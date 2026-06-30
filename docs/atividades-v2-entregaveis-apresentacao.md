# Entregaveis de apresentacoes V2

## Objetivo

Apresentacoes de membro possuem tres entregaveis independentes:

1. titulo e eixos aprovados;
2. slide/material da apresentacao resolvido;
3. foto da reuniao resolvida.

O slide nao substitui a foto. A foto nao substitui o slide.

## Base de arquivos

`Atividades_Arquivos` guarda uma linha por versao de arquivo. Os tipos iniciais
sao `SLIDE_APRESENTACAO` e `FOTO_REUNIAO`. Versoes anteriores permanecem com
`STATUS_ARQUIVO=HISTORICO`; nenhum arquivo ou registro e apagado.

O slide continua espelhado nos campos `STATUS_ENVIO_MATERIAL`,
`ID_ARQUIVO_MATERIAL`, `NOME_ARQUIVO_MATERIAL`,
`LINK_MATERIAL_APRESENTACAO`, `MIME_TYPE_MATERIAL` e `VERSAO_MATERIAL` de
`Atividades_Apresentacoes`. Esse espelhamento preserva os contratos existentes.

## Foto da reuniao

O modelo `APRESENTACAO_MEMBRO` exige foto por padrao. O membro apresentador pode
enviar a foto quando autorizado pelo modelo. `SECRETARIO`, `DIRETORIA` e
`ADMIN_TECNICO` podem enviar ou revisar conforme permissao validada no backend.

Formatos padrao: JPG, JPEG, PNG e WEBP. O backend aceita upload base64 ou link de
arquivo do Google Drive e salva uma copia na subpasta `Fotos` da atividade.

Decisoes de revisao:

- `APROVAR` define `STATUS_ARQUIVO=APROVADO`;
- `SOLICITAR_AJUSTE` define `AJUSTE_SOLICITADO` e exige observacao;
- `DISPENSAR` define `DISPENSADO`, exige justificativa e depende da configuracao.

## Pendencias e conclusao

As views podem materializar `FOTO_REUNIAO_PENDENTE`,
`FOTO_REUNIAO_AGUARDANDO_ANALISE` e `FOTO_REUNIAO_AJUSTE_SOLICITADO`.
Atividades canceladas ou arquivadas nao geram pendencias ativas.

Uma apresentacao nova so pode ser marcada `REALIZADA` quando titulo/eixos,
slide/material e foto estiverem resolvidos. Apresentacoes historicas que ja
estavam realizadas continuam validas.

## Funcoes publicas

- `atividadesV2_portalRegistrarFotoReuniao(payload, contexto)`
- `atividadesV2_portalRevisarFotoReuniao(payload, contexto)`
- `atividadesV2_runTesteEntregaveisApresentacaoDev()`

O upload atual de slide continua em
`atividadesV2_portalRegistrarMaterialApresentacao(payload, contexto)`.

## Homologacao DEV

1. Execute `atividadesV2_setupDatabaseDev()`.
2. Execute `atividades_ajustarModeloApresentacaoMembroConfig()`.
3. Execute `atividadesV2_runTesteEntregaveisApresentacaoDev()`.
4. Atualize as views com `atividadesV2_atualizarViewsPortal({dryRun:false})`.
5. Confira `Atividades_Arquivos`, `PORTAL_PENDENCIAS_DIRETORIA`, Minhas
   apresentacoes e Gestao -> Atividades.

As rotinas operam somente na base V2 DEV, usam `LockService`, registram auditoria
em `Portal_Acoes`/`Atividades_Log` e invalidam caches apos escritas.
