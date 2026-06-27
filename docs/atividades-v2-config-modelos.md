# Atividades_Config como catalogo de modelos

## Escopo

Esta etapa prepara a aba `Atividades_Config` da base Atividades v2 DEV para funcionar como catalogo oficial de modelos homologados. Ela nao cria a nova tela do Portal, nao altera o contrato atual de criacao de atividades, nao ativa Firestore e nao implementa upload de arquivos.

A planilha e aberta exclusivamente pela key DEV `ATIVIDADES_V2_DB`. Nenhuma rotina deste pacote remove, renomeia ou reordena colunas existentes.

## Funcoes publicas

- `atividades_validarSchemaAtividadesConfig()`: diagnostico somente leitura dos cabecalhos atuais, novos e duplicados.
- `atividades_migrarSchemaAtividadesConfigDryRun()`: mostra as colunas, notas, validacoes e valores iniciais que seriam considerados, sem alterar `Atividades_Config`.
- `atividades_migrarSchemaAtividadesConfig()`: adiciona somente cabecalhos ausentes ao final, aplica notas vazias e validacoes basicas.
- `atividades_normalizarModelosAtividadesConfig()`: preenche somente celulas vazias dos modelos com `ATIVO=SIM`.

As funcoes usam o fluxo operacional `ATIVIDADES / SETUP_V1`. As funcoes que escrevem usam `LockService`, registram resumo seguro em `Atividades_Log` e mantem o status operacional pelo GEAPA_CORE.

## Ordem manual segura

1. Execute `atividades_validarSchemaAtividadesConfig()`.
2. Execute `atividades_migrarSchemaAtividadesConfigDryRun()` e confira `colunasSeriamAdicionadas` e `normalizacaoSugerida`.
3. Execute `atividades_migrarSchemaAtividadesConfig()`.
4. Execute novamente `atividades_validarSchemaAtividadesConfig()`. O retorno deve ter `ok: true`.
5. Execute `atividades_normalizarModelosAtividadesConfig()` para preencher apenas valores vazios.
6. Confira manualmente os modelos ativos na aba `Atividades_Config`.

Rodar a migracao mais de uma vez e seguro: cabecalhos existentes sao reconhecidos pelo nome e nao sao duplicados. Cabecalhos fora da ordem esperada sao aceitos e nao sao movidos.

## Normalizacao

A normalizacao aplica os defaults gerais apenas a modelos ativos. Os defaults especificos sao reconhecidos por `SUBTIPO_ATIVIDADE` para:

- `APRESENTACAO_MEMBRO`;
- `PALESTRA`;
- `ABERTURA_PERIODO`;
- `FECHAMENTO_PERIODO`.

`EXIBE_NO_CALENDARIO` e `EXIBE_EM_PROXIMAS_ATIVIDADES` herdam `GERA_CARD_AGENDA` quando o valor e `SIM` ou `NAO`. `EXIBE_NO_HISTORICO_PUBLICO` herda `EXIBE_NO_PORTAL`. Quando a origem estiver vazia ou invalida, o default e `SIM`.

Por padrao, valores preenchidos manualmente nunca sao sobrescritos. Existe suporte tecnico a normalizacao forcada somente para manutencao explicita:

```javascript
atividades_normalizarModelosAtividadesConfig({
  force: true,
  confirmacao: 'SOBRESCREVER_MODELOS_ATIVIDADES_CONFIG'
});
```

Esse modo deve ser usado apenas depois de conferencia e backup, pois pode substituir valores homologados existentes. A operacao normal recomendada e sempre sem argumentos.

## Validacoes

- Campos booleanos recebem lista `SIM`/`NAO`.
- Ordem, prazos, limites e quantidades recebem validacao numerica nao negativa.
- `APROVACAO_EXCECAO_NIVEL` recebe a lista de niveis homologados.
- `PRIORIDADE_SYNC_FIRESTORE` recebe `BAIXA`, `NORMAL` ou `ALTA`.
- Perfis e tipos de arquivo permanecem como listas separadas por virgula.

As validacoes aceitam entrada fora da lista com aviso para preservar compatibilidade e permitir transicao controlada. Validacao institucional e permissao continuam obrigatorias no backend quando o proximo pacote passar a consumir os modelos.

## Fora de escopo

- tela de criacao por modelo no Portal;
- mudanca do endpoint atual de criacao de atividade;
- upload real de materiais ou fotos;
- integracao Firestore;
- triggers automaticos;
- alteracoes em producao.
