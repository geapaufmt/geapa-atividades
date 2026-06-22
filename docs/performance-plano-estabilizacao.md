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

### Pacote 3.1 - Chamada Operacional

O fluxo de chamada V2 usa caches curtos e granulares para reduzir latencia no clique:

- `portal:v2:atividades:chamada:atividade:{ID_ATIVIDADE}`: atividade individual, TTL de 5 minutos;
- `portal:v2:atividades:chamada:membros:{DATA}`: membros aplicaveis para chamada por data, TTL de 5 minutos;
- `portal:v2:atividades:chamada:status:{ID_ATIVIDADE}`: ultimo status operacional da chamada, TTL privado curto;
- `portal:v2:atividades:chamada:presencas:{ID_ATIVIDADE}`: presencas oficiais existentes da atividade para carregamento da tela, TTL privado curto;
- `portal:v2:atividades:chamada:rascunho:{ID_ATIVIDADE}`: ultimo rascunho persistente salvo em `Portal_Acoes`, TTL privado curto.

Ao salvar rascunho, o backend invalida apenas:

- status da chamada da atividade;
- rascunho da chamada da atividade;
- presencas cacheadas da chamada da atividade.

Ao finalizar chamada, o backend invalida:

- status/rascunho/presencas da chamada da atividade;
- bundle/detalhes/calendario agregados;
- frequencia e justificativas dos membros afetados.

O cache da atividade e preservado quando a chamada muda, porque a escrita ocorre em `Portal_Acoes` no rascunho e em `Atividades_Presencas_Registros` na finalizacao, nao na linha de `Atividades`.

Salvar rascunho nao grava frequencia oficial, nao gera falta justificavel e nao promove justificativas previas. Finalizar chamada e o unico ponto que grava presencas oficiais e pode afetar frequencia/justificativas. Nenhuma das duas operacoes deve recalcular views `PORTAL_*` de forma sincrona; as views seguem sendo atualizadas pelas rotinas oficiais de materializacao ou por job posterior.

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

Em DEV, os endpoints prioritarios tambem retornam um bloco `performance` com `totalMs` e `etapas`, alem do campo legado `tempoTotalMs`. Esse bloco permite ao Portal exibir diagnostico tecnico sem expor dados sensiveis.

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
