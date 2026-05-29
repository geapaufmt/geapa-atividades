# Diagnostico de Performance do Portal GEAPA

## Contexto

Sprint focada apenas em performance, observabilidade e arquitetura de leitura. Nao inclui novas funcionalidades de negocio, escrita de presenca, justificativas, apresentacoes, triggers, e-mails ou mudancas em producao.

Metas de experiencia:

- Pagina inicial: 1,5 a 3 s.
- Aba Atividades: 1 a 2,5 s.
- Detalhes de atividade: 0,5 a 1,5 s.
- Troca entre telas ja carregadas: instantanea ou quase instantanea.

## Fluxo Atual da Tela Inicial

O front-end do Portal GEAPA esta no repositorio local `geapa-portal`.

Fluxo observado:

1. O usuario autentica via token temporario.
2. A tela principal chama a acao `minhaSituacao`.
3. O Apps Script do portal valida a sessao.
4. O backend consulta/cacheia dados da situacao do membro.
5. A tela renderiza cards, permissoes e acoes disponiveis.

Gargalos provaveis:

- Validacao de sessao e leitura de perfil podem ocorrer antes de cada chamada de tela.
- A tela inicial e a aba Atividades usam chamadas separadas.
- Nao ha endpoint unico de bootstrap para entregar situacao, proximas atividades e avisos em uma resposta.

Impacto estimado: medio. Um endpoint agregador pode reduzir latencia percebida na primeira navegacao apos login.

## Fluxo Atual da Aba Atividades

Fluxo observado no portal:

1. Clique em Atividades chama `apiGet('/atividades/listar')`.
2. O webapp roteia para `portalListarAtividades`.
3. `portalListarAtividades` valida sessao.
4. O portal tenta cache curto no Apps Script.
5. Em cache miss, chama `atividades_listarParaPortal(contexto)` no modulo `geapa-atividades`.
6. O modulo le `PORTAL_ATIVIDADES_CALENDARIO` da base v2 DEV.
7. O modulo filtra permissao/visibilidade e monta resposta.
8. O portal renderiza a lista e guarda resumos em memoria (`atividadesResumoCache`).

Chamadas ao backend por abertura da aba:

- 1 chamada HTTP para listar atividades.
- Internamente, pelo menos 1 validacao de sessao no Portal.
- Em cache miss, 1 chamada ao modulo `geapa-atividades`.
- No modulo, abertura da base v2 e leitura de `PORTAL_ATIVIDADES_CALENDARIO`.

Uso de views:

- Usa `PORTAL_ATIVIDADES_CALENDARIO`.

Gargalos:

- A aba e recarregada a cada abertura no front-end atual.
- O cache do Portal existe no Apps Script, mas nao ha cache persistente em `sessionStorage` para a lista.
- Nao ha bundle com calendario + detalhes.

Impacto estimado: alto para navegacao repetida.

## Fluxo Atual dos Detalhes de Atividades

Fluxo anterior no modulo:

1. Clique em "Ver detalhes" chama `apiGet('/atividades/detalhe')`.
2. O webapp roteia para `portalDetalheAtividade`.
3. O portal valida sessao.
4. O portal tenta cache curto no Apps Script.
5. Em cache miss, chama `atividades_buscarDetalheParaPortal(id, contexto)`.
6. O modulo lia diretamente a aba operacional `Atividades`.
7. O modulo percorria os registros ate encontrar o ID.

Fluxo apos esta sprint:

1. O detalhe tenta usar `PORTAL_ATIVIDADES_DETALHES`.
2. Se a view estiver vazia ou ausente, usa fallback antigo na aba `Atividades`.
3. O resultado e cacheado por ID + contexto.

Gargalos encontrados:

- Leitura operacional em tempo real para cada detalhe.
- Repeticao de abertura da base v2.
- Cruzamento futuro com apresentacoes seria caro se feito no clique.

Impacto estimado: alto. A view de detalhes evita cruzamento `Atividades + Atividades_Apresentacoes` durante clique.

## Leituras Diretas e Views

Leituras por views:

- `PORTAL_ATIVIDADES_CALENDARIO`: lista da aba Atividades.
- `PORTAL_ATIVIDADES_DETALHES`: detalhes materializados nesta sprint.

Leituras operacionais que permanecem:

- Geradores manuais de views leem `Atividades` e `Atividades_Apresentacoes`.
- Fallback de detalhes ainda pode ler `Atividades` se a view estiver vazia.

## Registry e Planilhas

Ponto observado:

- `ATIVIDADES_V2_DB` esta em ambiente DEV.
- O `GEAPA_CORE` tenta resolver pela configuracao atual, que pode estar em PROD.
- O modulo usa fallback de leitura direta do Registry para a key DEV.

Risco de performance:

- Leitura repetida de Registry e abertura repetida da planilha v2 em cache miss.

Mitigacao nesta sprint:

- Logs de tempo em `atividadesV2_getDatabaseSpreadsheetDev_`.
- Cache curto nas respostas do portal.
- Views materializadas para reduzir leituras operacionais.

## Oportunidades de Cache

Implementado no modulo:

- `portal:v2:atividades:calendario`
- `portal:v2:atividades:detalhes`
- `portal:v2:atividades:bundle`
- `portal:v2:atividades:atividade:detalhes:{ID}`

TTL padrao: 600 segundos.

Front-end:

- Ja existe cache em memoria para detalhes no arquivo `web/assets/js/atividades.js`.
- Recomendado adicionar `sessionStorage` para lista e detalhes com expiracao curta.

## Plano de Correcao

1. Criar `PORTAL_ATIVIDADES_DETALHES`.
2. Materializar detalhes a partir de `Atividades` e `Atividades_Apresentacoes`.
3. Ajustar detalhe para buscar primeiro na view.
4. Criar bundle `calendario + detalhesPorId`.
5. Instrumentar tempos do backend.
6. Documentar checklist obrigatorio para novas funcionalidades.
7. Em sprint do `geapa-portal`, trocar a aba Atividades para consumir bundle e `sessionStorage`.
