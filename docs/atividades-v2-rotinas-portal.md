# Atividades v2 - Rotinas do Portal

Este documento descreve as rotinas manuais de atualizacao e conferencia das views `PORTAL_*` da base `ATIVIDADES INTERNAS GEAPA v2 - DEV`.

As rotinas atuam apenas em DEV, usando `ATIVIDADES_V2_DB` e as abas v2. Elas nao alteram producao, nao escrevem na V1, nao criam triggers e nao enviam e-mails.

## Sincronizacao incremental das bases brutas

Enquanto o fluxo operacional ainda estiver na V1, novos eventos podem aparecer na planilha antiga antes de existirem nas bases brutas da v2. Para isso, use:

```js
atividadesV2_preverSincronizacaoBrutasDev()
atividadesV2_sincronizarFaltantesBrutasDev()
atividadesV2_sincronizarFaltantesBrutasEAtualizarViewsDev()
```

`atividadesV2_sincronizarBrutasDev(options)` reutiliza os mapeamentos da migracao V1 -> v2, mas trabalha como sincronizacao incremental: por padrao, insere apenas chaves ausentes em `Atividades`, `Atividades_Apresentacoes`, `Atividades_Convites`, `Justificativas_Faltas` e `Atividades_Presencas_Registros`. Registros ja existentes sao preservados para nao sobrescrever curadoria manual da v2, como textos publicos, status de publicacao, visibilidade e ajustes operacionais.

Opcoes principais:

- `dryRun: true`: simula a sincronizacao sem escrever.
- `atualizarExistentes: true`: permite atualizar registros ja existentes; usar apenas quando houver decisao explicita, pois pode sobrescrever campos mapeados pela migracao.
- `includeBlankPresence: true`: inclui celulas vazias das matrizes antigas de presenca.
- `includeConfig: true`: tambem sincroniza `Atividades_Config`.

`atividadesV2_sincronizarBrutasEViewsDev(options)` executa a sincronizacao incremental e, se ela terminar com sucesso, roda `atividadesV2_atualizarViewsPortal(options)`. E o caminho recomendado para testar rapidamente se os novos dados brutos aparecem nas views do Portal.

## Migracao da modelagem de apresentacoes

Antes da homologacao, a v2 passa a tratar apresentacoes como subtipo de atividade. `Atividades` deve ser a fonte principal de agenda, titulo, eixo e pessoa principal; `Atividades_Apresentacoes` fica como extensao operacional; `Atividades_Envolvidos` guarda os vinculos individuais.

Use:

```js
atividadesV2_migrarApresentacoesParaAtividadesDevDryRun()
atividadesV2_migrarApresentacoesParaAtividadesDev()
```

O dry-run retorna total de apresentacoes lidas, atividades encontradas, atividades que seriam atualizadas, envolvidos que seriam criados, IDs invalidos/ausentes e conflitos. A execucao real escreve apenas na base v2 DEV, usando `LockService`, sem alterar V1 nem producao.

## Pastas e materiais de apresentacoes

A v2 separa material geral da atividade e material de apresentacao:

- `Atividades.ID_PASTA_DRIVE` e `Atividades.LINK_PASTA_DRIVE` identificam a pasta geral da atividade.
- `Atividades.LINK_MATERIAL` e `PORTAL_ATIVIDADES_DETALHES.LINK_MATERIAL_PUBLICO` representam material geral da atividade.
- `Atividades_Apresentacoes` usa campos de material, como `STATUS_ENVIO_MATERIAL`, `ID_ARQUIVO_MATERIAL`, `NOME_ARQUIVO_MATERIAL`, `LINK_MATERIAL_APRESENTACAO`, `MIME_TYPE_MATERIAL` e `VERSAO_MATERIAL`.
- `APRESENTACOES_PUBLICAS_JSON` expoe o material de cada apresentacao em `statusMaterial`, `idArquivoMaterial`, `nomeArquivoMaterial`, `linkMaterialPublico` e `versaoMaterial`.

Funcoes manuais:

```js
atividadesV2_diagnosticarMateriaisApresentacoesDev()
atividadesV2_migrarArquivosApresentacoesParaMateriaisDevDryRun()
atividadesV2_migrarArquivosApresentacoesParaMateriaisDev()
```

A migracao de arquivos para materiais nao apaga campos legados e nao move arquivos. Ela preenche os campos novos a partir de `STATUS_ENVIO_ARQUIVO`, datas de cobranca/recebimento e `LINK_ARQUIVO_DRIVE` quando o link nao parece ser uma pasta. Links legados de pasta sao relatados para revisao manual.

Depois da homologacao, `Atividades_Apresentacoes.LINK_ARQUIVO_DRIVE` e `Atividades_Apresentacoes.LINK_PASTA_DRIVE` podem ser removidos manualmente da planilha, desde que o diagnostico de materiais nao aponte pendencias e as views ja estejam publicando os campos novos. O codigo nao remove essas colunas automaticamente.

Para criar ou reutilizar a pasta Drive de uma atividade, configure `ATIVIDADES_V2_DRIVE_ROOT_FOLDER_ID` em Script Properties ou informe `options.rootFolderId`:

```js
atividadesV2_garantirPastaAtividadeDev('ATV-2026-1-0005', { dryRun: true })
atividadesV2_garantirPastaAtividadeDev('ATV-2026-1-0005')
```

O registro operacional de material para uso pelo Portal e feito por `atividadesV2_portalRegistrarMaterialApresentacao(payload, contexto)`. A funcao valida permissao no backend, usa `LockService`, garante pasta da atividade, copia por padrao o arquivo para a pasta e grava somente os campos novos de material. Para mover o arquivo original, o payload precisa informar explicitamente `moverArquivo: true`.

As acoes de titulo/eixo, revisao e material pelo Portal estao detalhadas em [`atividades-v2-portal-apresentacoes-acoes.md`](atividades-v2-portal-apresentacoes-acoes.md).

## Criacao segura de atividades pelo Portal

O Pacote 4A permite criar uma nova atividade na aba operacional `Atividades` da base v2 DEV, sempre com status inicial seguro:

- `STATUS_OPERACIONAL = PLANEJADA`
- `STATUS_PUBLICACAO_PORTAL = RASCUNHO`
- `VISIBILIDADE_PORTAL = DIRETORIA`
- `ATIVO = SIM`

Funcao publica:

```js
atividadesV2_portalCriarAtividade(payload, contexto)
atividadesV2_runTesteCriarAtividadePortalDev()
```

Somente perfis `DIRETORIA`, `SECRETARIO` e `ADMIN_TECNICO` podem criar. O backend tambem aceita os aliases normalizados pelo contrato do portal, como `SECRETARIA -> SECRETARIO` e `PRESIDENCIA/PRESIDENTE -> DIRETORIA`.

O payload deve vir no formato:

```js
{
  dryRun: true,
  atividade: {
    tituloPublico: 'Titulo da atividade',
    dataAtividade: '2026-06-25',
    horarioInicio: '18h45',
    horarioFim: '20h45',
    tipoAtividade: 'REUNIAO',
    subtipoAtividade: 'REUNIAO_ORDINARIA',
    formato: 'PRESENCIAL',
    local: 'Sala GEAPA',
    contaPresenca: 'SIM',
    contaFalta: 'SIM',
    geraCertificado: 'NAO',
    cargaHoraria: '2',
    exigeListaPresenca: 'SIM',
    permiteJustificativa: 'SIM'
  }
}
```

Por seguranca, `dryRun` e o comportamento padrao. Para gravar oficialmente, o Portal deve enviar `dryRun: false` depois de mostrar a confirmacao ao usuario. No `dryRun`, a funcao valida campos, calcula `ID_ATIVIDADE` previsto, monta a linha e nao escreve em nenhuma aba.

Na criacao real, a funcao:

- usa `LockService`;
- gera `ID_ATIVIDADE` no backend no padrao `ATV-AAAA-S-NNNN`;
- preenche `CICLO = GEAPA_<ANO>`, `ANO`, `SEMESTRE` e `NUMERO_SEQUENCIAL_NO_CICLO`;
- escreve somente na aba operacional `Atividades`;
- registra `Atividades_Log` com `FLUXO = PORTAL_ATIVIDADES_GESTAO_DEV`;
- registra `Portal_Acoes` com `TIPO_ACAO = ATIVIDADE_CRIADA`;
- invalida cache do Portal;
- atualiza oficialmente `PORTAL_ATIVIDADES_CALENDARIO`, `PORTAL_ATIVIDADES_DETALHES` e `PORTAL_STATUS_ATIVIDADES`.

Este pacote nao cria apresentacao automaticamente, nao cria anexos/Drive, nao publica para membros comuns, nao altera chamada, frequencia ou justificativas e nao escreve diretamente em views `PORTAL_*` fora das rotinas oficiais de materializacao.

Observacao de modelagem: `permiteJustificativa` e validado no contrato do formulario, mas a aba `Atividades` ainda nao possui coluna operacional propria para esse campo. No Pacote 4A, o valor fica registrado no resumo/observacoes da criacao; a regra disciplinar de justificativas continua sendo tratada pelos fluxos especificos de frequencia/justificativas.

## Funcoes publicas

Conferencia:

```js
atividadesV2_diagnostico()
atividadesV2_conferirConsistencia({ includeSamples: true })
atividadesV2_runTesteDiagnostico()
atividadesV2_runTesteAtualizacaoPortalDev()
atividadesV2_runTesteCriarAtividadePortalDev()
```

Sincronizacao V1 -> bases brutas v2 DEV:

```js
atividadesV2_preverSincronizacaoBrutasDev()
atividadesV2_sincronizarFaltantesBrutasDev()
atividadesV2_sincronizarFaltantesBrutasEAtualizarViewsDev()
```

Migracao da modelagem de apresentacoes:

```js
atividadesV2_migrarApresentacoesParaAtividadesDevDryRun()
atividadesV2_migrarApresentacoesParaAtividadesDev()
```

Materiais de apresentacoes:

```js
atividadesV2_diagnosticarMateriaisApresentacoesDev()
atividadesV2_migrarArquivosApresentacoesParaMateriaisDevDryRun()
atividadesV2_migrarArquivosApresentacoesParaMateriaisDev()
atividadesV2_garantirPastaAtividadeDev('ATV-2026-1-0005', { dryRun: true })
atividadesV2_portalRegistrarMaterialApresentacao(payload, contexto)
```

Ciclo operacional das atividades:

```js
atividadesV2_diagnosticarCicloAtividadesDev()
atividadesV2_atualizarCicloAtividadesDev({ dryRun: true })
atividadesV2_atualizarCicloAtividadesDev({ dryRun: false })
atividadesV2_runTesteCicloAtividadesDev()
atividadesV2_diagnosticarReconciliacaoChamadasDev()
atividadesV2_reconciliarChamadasDev({ dryRun: true })
atividadesV2_reconciliarChamadasDev({ dryRun: false })
atividadesV2_aplicarReconciliacaoChamadasDev()
```

Essas rotinas usam `Atividades.STATUS_OPERACIONAL` como status operacional, sem alterar `STATUS_PUBLICACAO_PORTAL`. Os status protegidos nunca sao sobrescritos automaticamente: `CANCELADA`, `ARQUIVADA`, `INATIVA`, `EXCLUIDA` e `SUSPENSA`, incluindo variacoes no masculino.

Uma atividade so e sugerida como `REALIZADA` quando a data/hora ja passou, o status atual e elegivel (`PLANEJADA`, `AGENDADA`, `PUBLICADA` ou `EM_ANDAMENTO`) e existe criterio operacional seguro: chamada finalizada ou presenca oficial registrada. Atividades sem chamada/presenca oficial nao viram `REALIZADA` por padrao; para esse caso e necessario executar explicitamente com `allowAutoRealizarSemChamada: true`.

Ao finalizar chamada pelo Portal, o backend avalia somente a atividade finalizada. Se a regra segura for atendida, atualiza `STATUS_OPERACIONAL` para `REALIZADA`, preenche `DATA_REALIZACAO`, registra log em `Atividades_Log` e invalida caches relacionados. A materializacao completa das views pode ser rodada depois por `atividadesV2_atualizarViewsPortal({ dryRun: false })` ou pela rotina manual de ciclo fora do lock da chamada.

`atividadesV2_diagnosticarReconciliacaoChamadasDev()` procura atividades que ja possuem registros oficiais ativos em `Atividades_Presencas_Registros`, mas nao possuem `CHAMADA_FINALIZADA` vigente em `Portal_Acoes`. A rotina so marca um caso como seguro quando a atividade existe, nao tem status protegido, permite chamada, ja passou, nao esta reaberta, nao tem duplicidade ativa, os codigos/status de presenca sao validos (`P`, `R`, `F`, `J`, `A`, `N/A`) e todos os membros aplicaveis na data aparecem nos registros oficiais.

`atividadesV2_aplicarReconciliacaoChamadasDev()` e o atalho manual sem parametros para aplicar a reconciliacao real. Internamente equivale a `atividadesV2_reconciliarChamadasDev({ dryRun: false })`: aplica apenas os casos seguros, registra `CHAMADA_FINALIZADA` em `Portal_Acoes`, grava log em `Atividades_Log`, avalia o ciclo operacional para `REALIZADA`, invalida caches e atualiza views oficiais pela agregadora. Casos com presenca parcial, duplicidade, chamada reaberta, atividade futura ou Core indisponivel permanecem apenas como alertas.

Atualizacao de views:

```js
atividadesV2_atualizarPortalCalendario({ dryRun: true })
atividadesV2_atualizarPortalDetalhes({ dryRun: true })
atividadesV2_recalcularFrequenciaMembros({ dryRun: true })
atividadesV2_atualizarPortalJustificativas({ dryRun: true })
atividadesV2_atualizarPendenciasDiretoria({ dryRun: true })
atividadesV2_atualizarPortalStatus({ dryRun: true })
atividadesV2_conferirContratoPortalAtivo({ dryRun: true })
atividadesV2_runTesteContratoPortalAtivo()
```

Agregadora:

```js
atividadesV2_atualizarViewsPortal({ dryRun: true })
atividadesV2_atualizarViewsPortal({ dryRun: false })
```

Reparo de alinhamento por cabecalho:

```js
atividadesV2_diagnosticarDesalinhamentoViewsPortalDev()
atividadesV2_repararDesalinhamentoViewsPortalDevDryRun()
atividadesV2_repararDesalinhamentoViewsPortalDev()
```

Job operacional:

```js
atividadesV2_runTesteJobPortalDryRun()
atividadesV2_jobPortal({ dryRun: true })
atividadesV2_jobPortal({ dryRun: false })
atividadesV2_conferirPortal()
```

Testes manuais de homologacao:

```js
atividadesV2_runTesteDiagnostico()
atividadesV2_runTesteAtualizacaoPortalDryRun()
atividadesV2_runTesteFrequenciaDryRun()
atividadesV2_runTesteJobPortalDryRun()
atividadesV2_runTesteContratoPortalAtivo()
```

Trigger manual:

```js
atividadesV2_instalarTriggerJobPortal({ hour: 5 })
atividadesV2_listarTriggerJobPortal()
atividadesV2_removerTriggerJobPortal()
```

## Ordem da agregadora

`atividadesV2_atualizarViewsPortal(options)` executa:

1. calendario;
2. detalhes;
3. frequencia;
4. justificativas;
5. pendencias;
6. status geral.

O contrato ativo do Portal para atividades e apresentacoes e formado por `PORTAL_ATIVIDADES_CALENDARIO` e `PORTAL_ATIVIDADES_DETALHES`. A antiga view `PORTAL_APRESENTACOES` foi removida do contrato ativo: o modulo nao deve cria-la, atualizar, reparar, expor endpoint publico ou usa-la como fonte de migracao. Se a aba ainda existir no Google Sheets, ela e apenas historica e deve ser ignorada pelas rotinas normais.

As rotinas de escrita das views usam nomes de cabecalho reais da aba, nao a posicao fisica da coluna. Isso evita deslocamento quando uma view ja possui cabecalhos antigos ou colunas adicionadas ao final. Se uma execucao anterior tiver escrito dados na ordem do schema sob cabecalhos em outra ordem, rode primeiro `atividadesV2_diagnosticarDesalinhamentoViewsPortalDev()`, depois `atividadesV2_repararDesalinhamentoViewsPortalDevDryRun()` e, se o relatorio marcar `needsRepair: true` nas abas esperadas, rode `atividadesV2_repararDesalinhamentoViewsPortalDev()`.

## Dry run

Todas as rotinas de atualizacao aceitam `options.dryRun`.

Com `dryRun: true`, a funcao le as bases v2 e monta a previa de linhas, mas nao limpa nem escreve nas views. O retorno inclui contadores, abas lidas, abas que seriam escritas e `preview` resumido sem dados pessoais sensiveis.

Com `dryRun: false` ou sem `dryRun`, a funcao usa `LockService`, aplica o schema ativo da view, limpa cabecalhos removidos do contrato e reescreve apenas os dados abaixo do cabecalho da view correspondente. Abas operacionais manuais, como `Atividades`, `Atividades_Apresentacoes`, `Atividades_Envolvidos`, `Atividades_Config`, `Atividades_Presencas_Registros` e `Justificativas_Faltas`, sao somente fontes de leitura nas atualizacoes normais de views.

O job `atividadesV2_jobPortal(options)` sempre chama a agregadora com `nonDestructive: true`. Nesse modo, as views sao atualizadas por upsert de chave, sem limpar linhas antigas. Linhas obsoletas ficam preservadas para revisao posterior.

## Conferencias

`atividadesV2_conferirConsistencia()` verifica, no minimo:

- atividade sem `ID_ATIVIDADE`;
- `ID_ATIVIDADE` fora do padrao `ATV-AAAA-S-NNNN`;
- atividade sem data;
- atividade publicada sem titulo publico;
- atividade publicada sem visibilidade;
- atividade que gera certificado sem carga horaria;
- atividade que conta falta sem configuracao clara de presenca;
- atividade academica/formativa sem eixo tematico;
- apresentacao sem eixo, titulo publico ou pessoa principal em `Atividades`;
- atividade com fluxo de apresentacao sem linha correspondente em `Atividades_Apresentacoes`;
- linha de `Atividades_Apresentacoes` sem `ID_ATIVIDADE` valido;
- atividade com envolvidos duplicados;
- `PORTAL_ATIVIDADES_DETALHES` com `ID_ATIVIDADE` duplicado;
- views de calendario/detalhes sem `CICLO`, `ANO`, `SEMESTRE` ou `ROTULO_SEMESTRE` quando esses campos existem em `Atividades`;
- cabecalhos removidos ainda presentes nas views ativas;
- `APRESENTACOES_PUBLICAS_JSON` invalido;
- `QTD_APRESENTACOES` divergente da quantidade no JSON;
- atividade marcada com apresentacoes mas sem JSON;
- presenca vinculada a atividade inexistente;
- presenca de membro sem identificador suficiente para validacao;
- apresentacao sem atividade vinculada;
- apresentacao sem apresentador;
- justificativa sem atividade ou presenca correspondente;
- pendencia vencida nao refletida em `PORTAL_PENDENCIAS_DIRETORIA`.

## Escopo atual

Incluido nesta fase:

- materializacao manual das views `PORTAL_*`;
- migracao manual da modelagem de apresentacoes para `Atividades` e `Atividades_Envolvidos`;
- detalhes unificados com uma linha por atividade e multiplas apresentacoes em `APRESENTACOES_PUBLICAS_JSON`;
- conferencia estrutural;
- suporte a `dryRun`;
- locks em escrita;
- observabilidade via `MODULOS_CONFIG`/`MODULOS_STATUS` pelos entrypoints publicos.
- job portal V2 com retorno resumido e sem previews de dados pessoais;
- instalador manual de trigger `atividadesV2_instalarTriggerJobPortal(options)`.

Fora de escopo:

- trigger automatico sem chamada explicita do instalador;
- alteracao do front-end do Portal;
- envio de e-mails;
- geracao de certificados;
- escrita em bases V1 ou producao;
- regra disciplinar completa com limites oficiais por ciclo, que deve ser refinada com Pessoas/Vigencias v2.

## MODULOS_CONFIG

O job portal usa o fluxo:

- `ATIVIDADES / ATUALIZACAO_PORTAL_V2`

A conferencia isolada usa:

- `ATIVIDADES / CONFERENCIA_V2`

Comportamento esperado:

- `ON`: permite execucao manual e por trigger;
- `MANUAL`: permite execucao manual e bloqueia trigger;
- `DRY_RUN`: executa sem escrita real;
- `OFF`: bloqueia execucao.
