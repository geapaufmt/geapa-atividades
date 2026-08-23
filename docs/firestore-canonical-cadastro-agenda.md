# Piloto Firestore: cadastro e agenda

## Decisao arquitetural

No piloto DEV, `activities/{idAtividade}` e `activityPrivate/{idAtividade}` formam a fonte canonica de cadastro e agenda. O projeto Firebase DEV deve ser diferente do projeto PROD; nenhum namespace `environments/dev` ou `environments/prod` faz parte do contrato.

O Core exige `ambiente: DEV` ou `ambiente: PROD` em toda API nova. Leituras e escritas usam o mesmo resolvedor. As propriedades sao:

- `GEAPA_CORE_FIRESTORE_DEV_PROJECT_ID`
- `GEAPA_CORE_FIRESTORE_DEV_DATABASE_ID` (opcional, default `(default)`)
- `GEAPA_CORE_FIRESTORE_PROD_PROJECT_ID`
- `GEAPA_CORE_FIRESTORE_PROD_DATABASE_ID` (opcional, default `(default)`)

As propriedades legadas `GEAPA_CORE_FIRESTORE_PROJECT_ID` e `GEAPA_CORE_FIRESTORE_DATABASE_ID` nao sao fallback das APIs novas. DEV e PROD com o mesmo project ID resultam em erro. Escritas PROD estao bloqueadas no codigo desta fase.

## Escopo

Incluido: identidade da atividade, classificacao, titulo/descricao, eixos, pessoa principal, data, horario, local, formato, publico-alvo, carga horaria, publicacao/visibilidade e auditoria do cadastro.

Excluido: presencas, justificativas, apresentacoes, convites, arquivos, materiais e seus prazos/links. Esses dominios permanecem no legado durante o piloto.

`activityPrivate` contem somente dados internos do cadastro e nunca pode ser lido pelo navegador. As Rules tambem bloqueiam toda escrita web nas duas collections.

## Corte e compatibilidade

`ATIVIDADES_V2_AGENDA_CANONICAL_MODE` aceita:

- `LEGACY_READ_ONLY`: permite apenas leitura do legado antes do corte;
- `FIRESTORE_CANONICAL`: bloqueia qualquer escrita de campos migrados na aba `Atividades`.

As duas modalidades bloqueiam escrita de campos migrados no Sheets DEV. A mudanca para `FIRESTORE_CANONICAL` declara que a importacao foi validada e libera o consumo da collection canonica pelos clientes preparados.

Campos dos dominios nao migrados podem continuar sendo atualizados no Sheets. Os caminhos `portalActivities/{id}` e `portalActivityCalendarSnapshots/current` permanecem somente como read models legados derivados.

## Importacao inicial

1. Executar `atividadesV2_firestorePlanejarImportacaoAgendaDev({dryRun:true})`.
2. Corrigir todas as linhas invalidas e conferir contagens/escopo excluido.
3. Executar e guardar o resultado dos testes do Emulator.
4. Obter autorizacao para configurar o projeto Firebase DEV e para o primeiro write remoto.
5. Configurar `ATIVIDADES_V2_FIRESTORE_DEV_REMOTE_WRITES_AUTHORIZED=SIM` somente na janela autorizada.
6. Executar `atividadesV2_runImportacaoRealAgendaFirestoreDev()` pelo editor do projeto GEAPA_ATIVIDADES. O runner fixa `DEV`, `dryRun:false` e a confirmacao `AUTORIZO_WRITE_FIRESTORE_DEV_ATIVIDADES_AGENDA`.
7. Remover imediatamente `ATIVIDADES_V2_FIRESTORE_DEV_REMOTE_WRITES_AUTHORIZED`.
8. Executar `atividadesV2_firestoreValidarImportacaoAgendaDev()` e exigir contagens completas, todos os hashes correspondentes e listas de diferencas vazias.
9. Somente depois da validacao e de autorizacao separada, ativar `FIRESTORE_CANONICAL`.

A importacao escreve somente Firestore. Antes do commit ela le as duas collections, ignora documentos com hash identico e aborta se encontrar qualquer documento divergente; por isso uma execucao parcial pode ser retomada com seguranca. Nao ha dual-write com Sheets.

O validador e estritamente read-only: reconstrói o plano DEV, lista `activities` e `activityPrivate` e compara paths e `sourceHash`. Ele nunca completa, corrige ou remove documentos e nao passa pelo guard que registra `MODULOS_STATUS`.

## Rollback controlado

`atividadesV2_firestoreRollbackImportacaoAgendaDev(options)` aceita somente DEV e usa apenas os paths recalculados pelo plano do piloto. A execucao real exige:

```text
ATIVIDADES_V2_FIRESTORE_DEV_ROLLBACK_AUTHORIZED=SIM
confirmacao=AUTORIZO_ROLLBACK_FIRESTORE_DEV_ATIVIDADES_AGENDA
```

O runner sem argumentos `atividadesV2_runRollbackImportacaoAgendaFirestoreDev()` fornece a confirmacao. Antes de excluir, a rotina relê as duas collections e aborta se qualquer documento esperado possuir `sourceHash` divergente. Documentos inesperados nao sao tocados; `portalUsers` e quaisquer outras collections ficam fora do conjunto permitido.

A propriedade de rollback deve existir somente durante uma janela explicitamente autorizada e ser removida imediatamente depois. O rollback exige `LEGACY_READ_ONLY`, respeita o controle operacional `ATIVIDADES / ATUALIZACAO_PORTAL_V2 / SYNC`, nao registra status em Sheets e nunca aceita PROD.

## Exportacao para Sheets

`atividadesV2_firestoreExportarAgendaParaSheetsDev` le as duas collections e regenera integralmente a aba derivada `EXPORT_ATIVIDADES_FIRESTORE`, ordenada por `ID_ATIVIDADE`. A operacao valida antes a existencia do par publico/privado para cada atividade, nao sobrescreve `Atividades` e deixa vazios os campos fora do piloto.

A escrita exige `ATIVIDADES_V2_FIRESTORE_DEV_EXPORT_AUTHORIZED=SIM` e a confirmacao `AUTORIZO_EXPORT_FIRESTORE_DEV_PARA_SHEETS`. A propriedade deve existir somente durante a janela de exportacao. O metadado `ATIVIDADES_V2_FIRESTORE_DEV_LAST_EXPORT_METADATA` registra horario, contagem, schema e estrategia `FULL_REGENERATION`; ele nao participa da decisao sobre dados oficiais.

`atividadesV2_firestoreDiagnosticarDivergenciaExportacaoAgendaDev()` e estritamente read-only. Ele compara os 51 campos migrados por ID e informa ausentes, extras, duplicados, campos divergentes, contagens e ultima exportacao. A resolucao declarada e sempre `FIRESTORE_WINS`; o diagnostico nunca escreve nem usa Sheets para corrigir Firestore.

## Contrato CRUD canonico

Todas as funcoes exigem DEV explicito; PROD e rejeitado pelo mesmo resolvedor usado nas leituras e escritas.

| Operacao | Contrato | Leituras/escritas esperadas |
| --- | --- | --- |
| criar | `atividadesV2_firestoreCriarAtividadeAgendaDev(row, options)` | verifica os dois paths e grava o par em um batch |
| consultar | `atividadesV2_firestoreConsultarAtividadeAgendaDev(id)` | 2 reads: `activities` e `activityPrivate` |
| listar | `atividadesV2_firestoreListarAtividadesAgendaDev()` | lista somente `activities`; nao le dados privados |
| atualizar | `atividadesV2_firestoreAtualizarAtividadeAgendaDev(id, updates, options)` | 2 reads e um batch atomico de 2 writes |
| estado/status | `atividadesV2_firestoreAlterarStatusAtividadeAgendaDev(action, payload, options)` | reutiliza as regras administrativas existentes e o update canonico |
| cancelar | `atividadesV2_firestoreCancelarAtividadeAgendaDev(payload, options)` | cancelamento logico; preserva historico |
| excluir | `atividadesV2_firestoreExcluirAtividadeAgendaDev(id, options)` | retorna `EXCLUSAO_FISICA_NAO_SUPORTADA`; zero writes |

Mutacoes reais exigem `ATIVIDADES_V2_FIRESTORE_DEV_CANONICAL_WRITES_AUTHORIZED=SIM`, modo `FIRESTORE_CANONICAL` e a confirmacao interna `AUTORIZO_WRITE_FIRESTORE_DEV_ATIVIDADES_AGENDA_CRUD`. O Portal nao recebe nem envia essa confirmacao: ela fica no backend da biblioteca. O batch substitui integralmente o par para evitar documento publico e privado em versoes diferentes.

Exclusao fisica nao pertence ao contrato operacional atual. A regra de dominio e cancelar/ocultar; delete permanece disponivel apenas no rollback inicial, protegido por outro gate e bloqueado depois do corte canonico.

## Auditoria de writers apos a consolidacao

| Classe | Fluxos | Tratamento |
| --- | --- | --- |
| A - Firestore canonico | `atividadesV2_portalCriarAtividade_`; `atividades_criarAtividadePorModelo_`; `atividadesV2_portalSalvarEdicaoAtividadeAdmin_`; `atividadesV2_portalAlterarStatusAtividadeAdmin_`; `atividadesV2_updateRowByHeaders_` para titulo/eixo; `atividadesV2_aplicarAlteracoesCicloAtividades_`; `atividades_refletirStatusApresentacoesEmAtividades_`; `atividades_marcarAtividadesGeraisRealizadas_`; APIs CRUD publicas | campos migrados vao diretamente ao batch `activities` + `activityPrivate` |
| B - Sheets bloqueado | `atividadesV2_appendAtividadeV2Row_`; `atividadesV2_adminWriteRowBatch_`; migracoes/setup que reescrevem `Atividades`; complementacao de `ID_PESSOA_PRINCIPAL`; heranca V1 de config; geracao V1 de ID; calculo V1 de carga horaria | no DEV, tentativa de escrever header migrado falha com `ESCRITA_LEGADA_BLOQUEADA` ou erro especifico de ID imutavel |
| C - dominio nao migrado | apresentacoes, envolvidos, presencas, justificativas, convites, arquivos/materiais, filas, logs e `PORTAL_ACOES`; campos como `STATUS_EIXO_TEMATICO`, flags de presenca e notificacoes | continuam em Sheets. Quando uma chamada mistura campos, o helper separa: campos canonicos vao ao Firestore e somente a extensao legada vai ao Sheets |
| D - transicao/obsoleto | importacao inicial, rollback inicial, normalizacao de IDs na aba oficial e geracao dos read models `portalActivities`/snapshots como fonte | importacao e rollback falham depois de `FIRESTORE_CANONICAL`; read models antigos permanecem apenas como fallback derivado temporario |

O `onEditAtividades` ignora edicoes manuais de headers migrados quando o modo canonico esta ativo. A alteracao manual pode continuar visivel na planilha antiga, mas nao dispara efeitos e nunca volta ao Firestore. Ela nao e dado oficial.

## Teste CRUD DEV controlado

`atividadesV2_runTesteCrudAgendaFirestoreDev()` esta preparado, mas desabilitado por padrao. Ele captura paths e hashes iniciais, cria um par marcado com `testRunId`, consulta, atualiza, cancela, regenera e valida o espelho. Depois remove fisicamente somente esse par tecnico, regenera novamente a exportacao e exige que paths, hashes e contagens retornem exatamente ao snapshot inicial.

A exclusao usada nessa limpeza e privada ao runner: exige a marca em `activityPrivate`, o mesmo `testRunId` no par, identificador fixo do runner e os dois `sourceHash` esperados. Qualquer ausencia ou divergencia aborta antes do delete. Falha parcial de exclusao e compensada restaurando o documento removido. O contrato operacional `atividadesV2_firestoreExcluirAtividadeAgendaDev` continua retornando `EXCLUSAO_FISICA_NAO_SUPORTADA` para atividades reais.

Antes de uma execucao remota, sao necessarias autorizacao humana explicita e as quatro propriedades temporarias:

- `ATIVIDADES_V2_FIRESTORE_DEV_CRUD_TEST_AUTHORIZED=SIM`;
- `ATIVIDADES_V2_FIRESTORE_DEV_CANONICAL_WRITES_AUTHORIZED=SIM`;
- `ATIVIDADES_V2_FIRESTORE_DEV_EXPORT_AUTHORIZED=SIM`;
- `ATIVIDADES_V2_FIRESTORE_DEV_TEST_CLEANUP_AUTHORIZED=SIM`.

As propriedades devem ser removidas ao fim. O runner nunca aceita PROD e embute as confirmacoes especificas de CRUD, exportacao e limpeza; a rotina de limpeza nao e API publica. O resultado aprovado inclui `finalState` com as contagens iniciais e arrays vazios para paths ausentes, inesperados e divergentes. Nao existe codigo de reverse sync.

## Cotas de leitura do Portal

- calendario/lista autenticada inicial: uma query em `activities where ativo == true`; com 52 documentos ativos, cerca de 52 document reads;
- reabertura da aba na mesma sessao/cache valido: 0 reads adicionais;
- detalhe publico: 0 reads Firestore adicionais depois da lista; detalhes operacionais ainda vem do backend e recebe por cima o resumo canonico ja carregado;
- lista administrativa: cerca de 52 reads em `activities`, sem `activityPrivate`;
- detalhe ou edicao administrativa: 2 reads, um por documento do par;
- exportacao/diagnostico completo: 104 reads no estado atual.

Nao existe N+1 de `activityPrivate` no navegador, listener em tempo real ou listener duplicado. A collection publica completa e necessaria para montar a agenda atual; por isso ela nao foi trocada por dezenas de leituras pontuais. O enriquecimento legado agora possui whitelist e nao substitui titulo, data, status ou qualquer outro campo canonico.

## Proximo dominio recomendado

Recomendacao: **apresentacoes**, sem incluir arquivos/materiais no primeiro corte. E o dominio que hoje mais altera titulo/eixo e estado da atividade, portanto sua migracao elimina a principal fronteira de escrita cruzada ja observada.

- presencas: maior volume, dados individuais e forte dependencia do motor disciplinar;
- justificativas: dependem do modelo de presencas e contem decisoes sensiveis;
- apresentacoes: cardinalidade controlada, IDs existentes e acoplamento direto ja mapeado com cadastro/agenda;
- convites: dependem de destinatarios, filas e idempotencia de comunicacao;
- arquivos/materiais: dependem de Drive, historico e politica de links/permissoes.

Antes de migrar apresentacoes, separar claramente metadados da apresentacao dos artefatos de Drive e manter estes ultimos fora do primeiro incremento.

## Autorizacoes ainda necessarias

- criar/confirmar o projeto Firebase DEV e seus acessos IAM;
- informar o project ID DEV nas Script Properties do Core;
- publicar versoes DEV do Core/Atividades e atualizar somente o deployment Apps Script DEV;
- publicar Rules e indexes no projeto DEV;
- habilitar o primeiro write remoto no Apps Script;
- publicar a versao consolidada somente na cadeia DEV;
- habilitar explicitamente o gate CRUD canonico no backend DEV;
- autorizar separadamente qualquer execucao do runner CRUD remoto;
- habilitar a configuracao web DEV/HOMOLOG com `FIREBASE_DEV_WEB_CONFIG_JSON`.

Nenhuma dessas operacoes remotas e executada pela alteracao de codigo.
