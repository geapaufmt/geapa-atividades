# Diretrizes Permanentes do Sistema GEAPA

Este repositório faz parte do Sistema GEAPA. Ao atuar nele, priorize estabilidade, desempenho e segurança operacional antes de novas funcionalidades.

## Prioridades de Desenvolvimento

- Priorize performance antes de adicionar novas funcionalidades.
- Preserve fluxos em produção, salvo instrução explícita para alterá-los.
- Não altere bases, chaves, gatilhos ou integrações de produção sem autorização clara.
- Não remova views, abas ou contratos existentes sem migração documentada.
- Documente mudanças relevantes, especialmente alterações de schema, API, views, cache, permissões ou fluxo operacional.

## Arquitetura

- Trate GitHub Pages como front-end do Portal GEAPA.
- Trate Apps Script como backend/API.
- Trate Google Sheets como banco interno, não como interface principal de operação.
- Use views `PORTAL_*` para leitura rápida pelo portal.
- Materialize dados de leitura frequente em views ou resumos, em vez de cruzar bases grandes em tempo real.
- Evite dependências desnecessárias e preserve padrões já existentes no módulo.

## Performance

Metas de experiência:

- Página inicial: 1,5 a 3 s.
- Aba Atividades: 1 a 2,5 s.
- Detalhes de atividade: 0,5 a 1,5 s.
- Troca entre telas já carregadas: instantânea ou quase instantânea.

Práticas esperadas:

- Reduza chamadas ao backend; prefira payloads agregados quando fizer sentido.
- Use cache no front-end e/ou backend quando os dados permitirem.
- Evite cruzamentos pesados em tempo real.
- No Apps Script, leia e escreva dados em lote com `getValues()`/`setValues()` sempre que possível.
- Evite loops que chamam repetidamente `getRange()`, `setValue()` ou APIs externas linha a linha.
- Prefira views `PORTAL_*` para telas do portal e bases operacionais para rotinas internas.

## Segurança e Consistência

- Valide permissões no backend, mesmo quando o front-end ocultar ações.
- Use `LockService` em escritas sensíveis, concorrentes ou que alterem estado operacional.
- Não exponha dados sensíveis em views públicas do portal.
- Não envie e-mails, registre presenças reais, crie gatilhos ou altere produção em fases DEV sem instrução explícita.
- Preserve dados existentes; não apague, renomeie ou reordene abas sem plano de migração.

## Manutenção

- Mantenha funções pequenas, nomes consistentes e comentários úteis.
- Reaproveite `GEAPA_CORE` quando houver função adequada.
- Registre logs seguros, sem dados sensíveis.
- Ao criar novas rotinas, inclua diagnóstico ou retorno estruturado com `ok`, contadores, avisos e erros.
- Antes de integrar com o portal, confirme que a leitura usa views estáveis e que o backend continua sendo a fonte de validação.
