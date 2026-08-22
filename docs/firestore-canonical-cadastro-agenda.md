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
6. Executar `atividadesV2_firestoreImportarAgendaDev` com `dryRun:false` e confirmacao `AUTORIZO_WRITE_FIRESTORE_DEV_ATIVIDADES_AGENDA`.
7. Validar contagem e hashes; somente depois ativar `FIRESTORE_CANONICAL`.

A importacao escreve somente Firestore. Antes do commit ela le as duas collections, ignora documentos com hash identico e aborta se encontrar qualquer documento divergente; por isso uma execucao parcial pode ser retomada com seguranca. Nao ha dual-write com Sheets.

## Exportacao para Sheets

`atividadesV2_firestoreExportarAgendaParaSheetsDev` le as duas collections e produz a aba derivada `EXPORT_ATIVIDADES_FIRESTORE`. Ela nao sobrescreve `Atividades` e deixa vazios os campos fora do piloto. A escrita exige a mesma habilitacao remota e a confirmacao `AUTORIZO_EXPORT_FIRESTORE_DEV_PARA_SHEETS`.

## Autorizacoes ainda necessarias

- criar/confirmar o projeto Firebase DEV e seus acessos IAM;
- informar o project ID DEV nas Script Properties do Core;
- publicar versoes DEV do Core/Atividades e atualizar somente o deployment Apps Script DEV;
- publicar Rules e indexes no projeto DEV;
- habilitar o primeiro write remoto no Apps Script;
- executar a importacao inicial;
- ativar o modo `FIRESTORE_CANONICAL`;
- habilitar a configuracao web DEV/HOMOLOG com `FIREBASE_DEV_WEB_CONFIG_JSON`.

Nenhuma dessas operacoes remotas e executada pela alteracao de codigo.
