# Plano de Estabilizacao de Performance

## Objetivo

Reduzir a latencia percebida do Portal GEAPA antes de adicionar novas funcionalidades. O foco e leitura rapida, cache, observabilidade e views `PORTAL_*`.

## Metas

- Pagina inicial: 1,5 a 3 s.
- Aba Atividades: 1 a 2,5 s.
- Detalhes de atividade: 0,5 a 1,5 s.
- Troca entre telas ja carregadas: instantanea ou quase instantanea.

## Decisoes Arquiteturais

- GitHub Pages e front-end.
- Apps Script e backend/API.
- Google Sheets e banco interno.
- O portal deve ler views `PORTAL_*`, nao abas operacionais.
- Cruzamentos pesados devem ocorrer em rotinas de materializacao, nao no clique do usuario.
- Escritas sensiveis futuras devem usar `LockService`.
- Permissoes devem ser validadas no backend mesmo quando o front-end esconder botoes.

## Entregas Desta Sprint

- Adicionar `PORTAL_ATIVIDADES_DETALHES` ao schema v2.
- Fazer o setup criar/validar a nova view.
- Criar `atividadesV2_atualizarPortalAtividadesDetalhesDev()`.
- Ajustar detalhes para usar view materializada sem cruzamento pesado no clique.
- Criar `atividadesV2_portalGetAtividadesBundle()`.
- Adicionar cache curto e logs de tempo.
- Separar o caminho rapido em `atividadesV2_portalGetCalendario()` e `atividadesV2_portalGetAtividadesDetalhes()`.
- Documentar gargalos e regras futuras.

## Cache

TTL padrao no modulo `geapa-atividades`: 300 segundos.

Chaves logicas:

- `portal:v2:atividades:calendario`
- `portal:v2:atividades:detalhes`
- `portal:v2:atividades:bundle`
- `portal:v2:atividades:atividade:detalhes:{ID_ATIVIDADE}`

Regras:

- Cache nao substitui validacao de permissao.
- Cache nao deve conter dados alem do necessario para a tela.
- Em caso de falha do cache, a leitura deve continuar pela view.
- A primeira renderizacao da aba Atividades deve buscar somente calendario; detalhes devem ser carregados em preload separado.
- Rotinas de materializacao removem apenas caches agregados conhecidos; caches por contexto expiram pelo TTL.

## Observabilidade

As funcoes instrumentadas registram `GEAPA-PORTAL-PERF` com:

- abertura do Registry/key;
- abertura da planilha v2;
- leitura de views/abas;
- origem da resposta, cache ou planilha;
- tamanho aproximado do payload;
- montagem de indices;
- escrita de views;
- montagem da resposta;
- tempo total.

Logs devem ser seguros e curtos.

## Checklist Obrigatorio para Novas Funcionalidades

Antes de criar nova funcionalidade, responder:

1. Esta funcionalidade exige nova view `PORTAL_*`?
2. Ela aumenta numero de chamadas ao backend?
3. Ela le abas operacionais em tempo real?
4. Ela poderia usar dados ja pre-processados?
5. Ela precisa de cache?
6. Ela precisa de `LockService`?
7. Ela precisa de logs de tempo?
8. Ela afeta tela inicial ou aba Atividades?
9. Ela pode degradar performance?
10. Existe fallback se cache/view estiver vazia?

## Proximas Etapas

1. Rodar setup v2 para criar `PORTAL_ATIVIDADES_DETALHES`.
2. Rodar gerador da view de detalhes.
3. Publicar algumas atividades DEV e medir lista/detalhe.
4. No repo `geapa-portal`, usar `atividadesV2_portalGetCalendario()` no primeiro render e `atividadesV2_portalGetAtividadesDetalhes()` no preload.
5. Adicionar ou manter cache em `sessionStorage` no front-end para lista e detalhes.
6. Avaliar endpoint `portalGetBootstrap` no backend do portal.
