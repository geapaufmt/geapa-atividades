# Views do Portal na Base Atividades v2

## Principio

O Portal GEAPA deve ler preferencialmente views `PORTAL_*`. Abas operacionais como `Atividades` e `Atividades_Apresentacoes` ficam como banco interno e fonte das rotinas de materializacao.

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
- permite fallback antigo se a view estiver vazia, mas esse fallback deve ser excecao.

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
```

Usa `PORTAL_ATIVIDADES_CALENDARIO`.

### Detalhe

```js
atividades_buscarDetalheParaPortal(idAtividade, contexto)
atividadesV2_portalGetDetalhesAtividade(idAtividade, contexto)
```

Usa primeiro `PORTAL_ATIVIDADES_DETALHES`. Se a view estiver vazia ou ausente, usa fallback na aba `Atividades`.

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

Objetivo: permitir que a aba Atividades carregue lista e detalhes em uma chamada, reduzindo cliques com nova ida ao backend.

## Regras para Novas Views

- Criar view `PORTAL_*` quando a tela exigir leitura frequente.
- Materializar cruzamentos fora do fluxo de clique do usuario.
- Evitar e-mails, observacoes internas e dados sensiveis em views consumidas pelo portal.
- Nao remover views sem migracao documentada.
- Documentar fonte, destino, gerador, filtros e cache.
