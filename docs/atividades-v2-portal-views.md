# Views do Portal na Base Atividades v2

## Principio

O Portal GEAPA deve ler preferencialmente views `PORTAL_*`. Abas operacionais como `Atividades` e `Atividades_Apresentacoes` ficam como banco interno e fonte das rotinas de materializacao.

As rotinas manuais atuais estao documentadas em [`atividades-v2-rotinas-portal.md`](atividades-v2-rotinas-portal.md). Para atualizar todas as views em DEV, use:

```js
atividadesV2_atualizarViewsPortal({ dryRun: true })
atividadesV2_atualizarViewsPortal({ dryRun: false })
```

## Views Atuais

### PORTAL_ATIVIDADES_CALENDARIO

Fonte: `Atividades`.

Uso:

- lista/calendario de atividades;
- cards da aba Atividades;
- proximas atividades em futuras telas.

Caracteristicas:

- contem apenas campos seguros para listagem;
- filtra atividades publicaveis;
- nao expoe observacoes internas, logs ou presenca nominal.

Gerador:

```js
atividadesV2_sincronizarPortalAtividadesCalendarioDev()
```

### PORTAL_ATIVIDADES_DETALHES

Fonte: `Atividades` + `Atividades_Apresentacoes`.

Uso:

- modal/tela de detalhes;
- bundle de atividades;
- leitura rapida sem cruzamento em tempo real.

Caracteristicas:

- consolida campos publicos/operacionais necessarios ao detalhe;
- gera linha comum para atividade sem apresentacao vinculada;
- gera linha com dados de apresentacao quando houver vinculo por `ID_ATIVIDADE`;
- deve ser usada no clique/preload do portal sem cruzar abas operacionais em tempo real.

Gerador:

```js
atividadesV2_atualizarPortalAtividadesDetalhesDev()
```

### PORTAL_APRESENTACOES

Reservada para lista/resumo publico de apresentacoes e arquivos.

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

## Regras para Novas Views

- Criar view `PORTAL_*` quando a tela exigir leitura frequente.
- Materializar cruzamentos fora do fluxo de clique do usuario.
- Evitar e-mails, observacoes internas e dados sensiveis em views consumidas pelo portal.
- Nao remover views sem migracao documentada.
- Documentar fonte, destino, gerador, filtros e cache.
