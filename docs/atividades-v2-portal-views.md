# Views do Portal na Base Atividades v2

## Principio

O Portal GEAPA deve ler preferencialmente views `PORTAL_*`. Abas operacionais como `Atividades` e `Atividades_Apresentacoes` ficam como banco interno e fonte das rotinas de materializacao.

As rotinas manuais atuais estao documentadas em [`atividades-v2-rotinas-portal.md`](atividades-v2-rotinas-portal.md). Para atualizar todas as views em DEV, use:

```js
atividadesV2_atualizarViewsPortal({ dryRun: true })
atividadesV2_atualizarViewsPortal({ dryRun: false })
```

## Views Ativas

### PORTAL_ATIVIDADES_CALENDARIO

Fonte principal: `Atividades`.

Fonte auxiliar: `Atividades_Apresentacoes` apenas para `ID_APRESENTACAO` e metadados operacionais quando a atividade usar fluxo de apresentacao.

Uso:

- lista/calendario de atividades;
- cards da aba Atividades;
- proximas atividades;
- historico de atividades;
- apresentacoes dentro da agenda/historico unificado.

Caracteristicas:

- contem apenas campos seguros para listagem;
- filtra atividades publicaveis;
- nao expoe observacoes internas, logs ou presenca nominal.
- usa titulo, eixo, pessoa principal, data, horario, local e formato de `Atividades`.
- possui uma linha por `ID_ATIVIDADE`;
- resume apresentacoes com `POSSUI_APRESENTACOES`, `QTD_APRESENTACOES` e `RESUMO_APRESENTACOES_PUBLICO`.

Gerador:

```js
atividadesV2_sincronizarPortalAtividadesCalendarioDev()
```

### PORTAL_ATIVIDADES_DETALHES

Fonte principal: `Atividades`.

Fontes auxiliares: `Atividades_Envolvidos` e `Atividades_Apresentacoes`.

Uso:

- modal/tela de detalhes;
- bundle de atividades;
- leitura rapida sem cruzamento em tempo real.

Caracteristicas:

- consolida campos publicos/operacionais necessarios ao detalhe;
- inclui envolvidos publicos em `ENVOLVIDOS_PUBLICOS_JSON`;
- possui uma linha por `ID_ATIVIDADE`;
- gera linha comum para atividade sem apresentacao vinculada;
- serializa apresentacoes publicas em `APRESENTACOES_PUBLICAS_JSON`;
- resume apresentacoes com `QTD_APRESENTACOES` e `RESUMO_APRESENTACOES_PUBLICO`;
- deve ser usada no clique/preload do portal sem cruzar abas operacionais em tempo real.

Gerador:

```js
atividadesV2_atualizarPortalAtividadesDetalhesDev()
```

### PORTAL_FREQUENCIA_MEMBROS

Reservada para resumo de frequencia por membro e periodo.

### PORTAL_JUSTIFICATIVAS

Reservada para consulta de justificativas e decisoes publicas.

### PORTAL_PENDENCIAS_DIRETORIA

Reservada para pendencias administrativas de diretoria.

### PORTAL_STATUS_ATIVIDADES

Reservada para indicadores gerais de processamento.

## Endpoints e Contratos

### Lista

```js
atividades_listarParaPortal(contexto)
atividadesV2_portalGetCalendario(contexto)
```

Usam `PORTAL_ATIVIDADES_CALENDARIO`. O caminho v2 aplica cache curto por contexto seguro e retorna somente dados de lista.

### Detalhe

```js
atividades_buscarDetalheParaPortal(idAtividade, contexto)
atividadesV2_portalGetDetalhesAtividade(idAtividade, contexto)
```

Usam `PORTAL_ATIVIDADES_DETALHES`. O detalhe nao deve cruzar `Atividades` + `Atividades_Apresentacoes` durante o clique do usuario.

### Preload de Detalhes

```js
atividadesV2_portalGetAtividadesDetalhes(contexto)
```

Retorna apenas:

```json
{
  "ok": true,
  "data": {
    "detalhesPorId": {},
    "ultimaAtualizacao": ""
  }
}
```

Esse endpoint e separado do calendario para permitir primeiro render mais leve e preload posterior.

### Bundle

```js
atividadesV2_portalGetAtividadesBundle(contexto)
```

Retorna:

```json
{
  "ok": true,
  "data": {
    "calendario": [],
    "detalhesPorId": {},
    "ultimaAtualizacao": ""
  }
}
```

Objetivo: manter compatibilidade com consumidores antigos. Para primeira renderizacao, prefira calendario separado e preload separado.

### Views read-only do Portal

```js
atividadesV2_portalGetMinhaFrequencia(contexto)
atividadesV2_portalGetMinhasApresentacoes(contexto)
atividadesV2_portalGetMinhasJustificativas(contexto)
atividadesV2_portalGetPendenciasDiretoria(contexto)
atividadesV2_portalGetStatusViews(contexto)
```

Esses contratos leem diretamente as views `PORTAL_FREQUENCIA_MEMBROS`,
`PORTAL_JUSTIFICATIVAS`,
`PORTAL_PENDENCIAS_DIRETORIA` e `PORTAL_STATUS_ATIVIDADES` na base v2 DEV.
Eles nao escrevem em planilhas, nao executam triggers e nao criam acoes
operacionais.

`atividadesV2_portalGetMinhasApresentacoes(contexto)` le `PORTAL_ATIVIDADES_DETALHES`, interpreta `APRESENTACOES_PUBLICAS_JSON` e filtra por `ID_PESSOA`/RGA do contexto seguro.

As consultas individuais filtram por `ID_PESSOA`, RGA ou e-mail recebidos no contexto seguro do backend do Portal. As consultas de diretoria exigem perfil operacional privilegiado (`SECRETARIO`, `DIRETORIA` ou `ADMIN_TECNICO`) tambem no modulo Atividades.

## Regras para Novas Views

- Criar view `PORTAL_*` quando a tela exigir leitura frequente.
- Materializar cruzamentos fora do fluxo de clique do usuario.
- Evitar e-mails, observacoes internas e dados sensiveis em views consumidas pelo portal.
- Nao remover views sem migracao documentada.
- Documentar fonte, destino, gerador, filtros e cache.

## Modelagem para apresentacoes futuras

- Apresentacoes de membros sao atividades com `SUBTIPO_ATIVIDADE` como `APRESENTACAO_MEMBRO` ou `APRESENTACAO_REPOSICAO`.
- O card futuro aparece em `PORTAL_ATIVIDADES_CALENDARIO`.
- O detalhe vem de `PORTAL_ATIVIDADES_DETALHES`.

## View Historica Removida do Contrato

`PORTAL_APRESENTACOES` existiu como view de transicao, mas nao e mais contrato ativo. O modulo Atividades nao deve cria-la, atualizar, reparar, expor endpoint publico nem usa-la como fonte. Agenda, historico, proximas atividades e "Minhas apresentacoes" devem ser derivados somente de `PORTAL_ATIVIDADES_CALENDARIO` e `PORTAL_ATIVIDADES_DETALHES`.
