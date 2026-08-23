const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const properties = new Map([
  ['ATIVIDADES_V2_AGENDA_CANONICAL_MODE', 'FIRESTORE_CANONICAL']
]);
const documents = new Map();
let executionEnvironment = 'DEV';
let batchCalls = 0;
let deleteCalls = 0;
let failDeletePath = '';
const deletedPaths = [];

const scriptProperties = {
  getProperty: (key) => properties.get(key) || null,
  setProperty: (key, value) => properties.set(key, String(value))
};

const context = {
  Object, Array, String, Number, Boolean, Date, JSON, Math, Error, isFinite,
  Logger: { log() {} },
  Utilities: {
    DigestAlgorithm: { SHA_256: 'SHA_256' },
    Charset: { UTF_8: 'UTF_8' },
    computeDigest: (_algorithm, value) => Array.from(crypto.createHash('sha256').update(value).digest()),
    base64EncodeWebSafe: (bytes) => Buffer.from(bytes).toString('base64url'),
    formatDate: (date) => date.toISOString().slice(0, 10)
  },
  Session: { getScriptTimeZone: () => 'America/Cuiaba' },
  PropertiesService: { getScriptProperties: () => scriptProperties },
  LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
  ATIVIDADES_CFG: { MODULE_CODE: 'ATIVIDADES' },
  ATIVIDADES_V2_SCHEMA: { ATIVIDADES: [] },
  atividades_normalizeTextUpper_: (value) => String(value || '').trim().toUpperCase(),
  atividadesV2_resolveEnvironment_: (options) => {
    const value = String(options && (options.ambiente || options.environment) || executionEnvironment || '').toUpperCase();
    if (!['DEV', 'PROD'].includes(value)) throw new Error('ambiente invalido');
    return value;
  },
  atividadesV2_adminBuildStatusUpdates_: (action) => {
    if (String(action).toUpperCase() === 'CANCELAR') {
      return { ok: true, data: { STATUS_OPERACIONAL: 'CANCELADA', STATUS_PUBLICACAO_PORTAL: 'OCULTA', VISIBILIDADE_PORTAL: 'OCULTA' } };
    }
    return { ok: false, errorCode: 'ACAO_INVALIDA' };
  },
  GEAPA_CORE: {
    coreFirestoreGetEnvironmentConfig: ({ ambiente }) => ({
      environment: ambiente,
      projectId: ambiente === 'DEV' ? 'demo-geapa-dev' : 'portal-geapa',
      databaseId: '(default)'
    }),
    coreFirestoreEnvironmentGetDocument: (documentPath, options) => {
      assert.equal(options.ambiente, 'DEV');
      return documents.has(documentPath)
        ? { ok: true, found: true, code: 'FIRESTORE_GET_OK', data: structuredClone(documents.get(documentPath)) }
        : { ok: true, found: false, code: 'FIRESTORE_DOCUMENTO_NAO_ENCONTRADO' };
    },
    coreFirestoreEnvironmentListDocuments: (collection, options) => {
      assert.equal(options.ambiente, 'DEV');
      const prefix = `${collection}/`;
      return {
        ok: true,
        code: 'FIRESTORE_LIST_OK',
        documents: Array.from(documents.entries())
          .filter(([key]) => key.startsWith(prefix) && !key.slice(prefix.length).includes('/'))
          .map(([key, data]) => ({ id: key.slice(prefix.length), path: key, data: structuredClone(data) })),
        nextPageToken: ''
      };
    },
    coreFirestoreEnvironmentBatchSetDocuments: (items, options) => {
      assert.equal(options.ambiente, 'DEV');
      assert.equal(options.merge, false);
      batchCalls += 1;
      items.forEach((item) => documents.set(item.path, structuredClone(item.data)));
      return { ok: true, written: items.length, code: 'FIRESTORE_BATCH_SET_OK' };
    },
    coreFirestoreEnvironmentDeleteDocument: (documentPath, options) => {
      assert.equal(options.ambiente, 'DEV');
      deleteCalls += 1;
      deletedPaths.push(documentPath);
      if (documentPath === failDeletePath) return { ok: false, deleted: false };
      documents.delete(documentPath);
      return { ok: true, deleted: true };
    }
  }
};

vm.createContext(context);
for (const file of [
  '45_atividades_v2_firestore_read_models.gs',
  '46_atividades_v2_firestore_canonical_agenda.gs',
  '48_atividades_v2_firestore_canonical_stabilization.gs'
]) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context, { filename: file });
}

const row = {
  ID_ATIVIDADE: 'ATV-2026-2-0053',
  CICLO: 'GEAPA_2026', ANO: 2026, SEMESTRE: 2, NUMERO_SEQUENCIAL_NO_CICLO: 53,
  TITULO: 'Titulo interno', TITULO_PUBLICO: 'Titulo publico', DESCRICAO: 'Privado',
  DESCRICAO_PUBLICA: 'Publico', DATA_ATIVIDADE: '2026-08-30', HORARIO_INICIO: '18:00',
  HORARIO_FIM: '19:00', LOCAL: 'DEV', FORMATO: 'ONLINE', STATUS_OPERACIONAL: 'PLANEJADA',
  STATUS_PUBLICACAO_PORTAL: 'RASCUNHO', VISIBILIDADE_PORTAL: 'DIRETORIA', ATIVO: 'SIM',
  CANONICAL_REQUEST_ID: 'GEAPA-REQ-CRUD-TEST-0001',
  CRIADO_POR: 'TESTE', CRIADO_EM: '2026-08-22T00:00:00.000Z',
  ATUALIZADO_POR: 'TESTE', ATUALIZADO_EM: '2026-08-22T00:00:00.000Z'
};

let result = context.atividadesV2_canonicalAgendaCreateDev_(row, { ambiente: 'DEV', dryRun: true });
assert.equal(result.ok, true);
assert.equal(result.written, 0);
assert.equal(batchCalls, 0, 'dry-run nao escreve');

properties.set('ATIVIDADES_V2_FIRESTORE_DEV_CANONICAL_WRITES_AUTHORIZED', 'SIM');
const writeOptions = {
  ambiente: 'DEV', dryRun: false,
  confirmacao: 'AUTORIZO_WRITE_FIRESTORE_DEV_ATIVIDADES_AGENDA_CRUD'
};
result = context.atividadesV2_canonicalAgendaCreateDev_(row, writeOptions);
assert.equal(result.ok, true);
assert.equal(result.written, 2);
assert.deepEqual(Array.from(documents.keys()).sort(), [
  'activities/ATV-2026-2-0053',
  'activityPrivate/ATV-2026-2-0053'
]);
const replay = context.atividadesV2_canonicalAgendaCreateDev_(
  Object.assign({}, row, { ID_ATIVIDADE: 'ATV-2026-2-0054' }),
  writeOptions
);
assert.equal(replay.idempotentReplay, true);
assert.equal(replay.idAtividade, row.ID_ATIVIDADE);
assert.equal(replay.written, 0);
assert.equal(batchCalls, 1, 'retry com requestId nao duplica a atividade');

let pair = context.atividadesV2_canonicalAgendaGetPairDev_(row.ID_ATIVIDADE, { ambiente: 'DEV' });
assert.equal(pair.found, true);
assert.equal(pair.readsEstimated, 2);
assert.equal(pair.publicDocument.tituloPublico, 'Titulo publico');
assert.equal(pair.privateDocument.tituloInterno, 'Titulo interno');

result = context.atividadesV2_canonicalAgendaUpdateDev_(row.ID_ATIVIDADE, {
  TITULO_PUBLICO: 'Titulo atualizado',
  TITULO: 'Interno atualizado'
}, writeOptions);
assert.equal(result.ok, true);
assert.deepEqual(Array.from(result.changedHeaders), ['TITULO', 'TITULO_PUBLICO']);
pair = context.atividadesV2_canonicalAgendaGetPairDev_(row.ID_ATIVIDADE, { ambiente: 'DEV' });
assert.equal(pair.publicDocument.tituloPublico, 'Titulo atualizado');
assert.equal(pair.privateDocument.tituloInterno, 'Interno atualizado');

const list = context.atividadesV2_canonicalAgendaListRowsDev_({ ambiente: 'DEV' });
assert.equal(list.total, 1);
assert.equal(list.readsEstimated, 1);
assert.equal(list.rows[0].TITULO_PUBLICO, 'Titulo atualizado');
assert.equal(Object.prototype.hasOwnProperty.call(list.rows[0], 'EMAIL_PESSOA_PRINCIPAL'), false, 'lista publica nao le dados privados');

result = context.atividadesV2_canonicalAgendaCancelDev_({ idAtividade: row.ID_ATIVIDADE }, writeOptions);
assert.equal(result.ok, true);
pair = context.atividadesV2_canonicalAgendaGetPairDev_(row.ID_ATIVIDADE, { ambiente: 'DEV' });
assert.equal(pair.publicDocument.statusOperacional, 'CANCELADA');

result = context.atividadesV2_canonicalAgendaDeleteDev_(row.ID_ATIVIDADE, { ambiente: 'DEV' });
assert.equal(result.ok, false);
assert.equal(result.code, 'EXCLUSAO_FISICA_NAO_SUPORTADA');
assert.equal(deleteCalls, 0, 'CRUD operacional nunca exclui documentos');

assert.throws(
  () => context.atividadesV2_canonicalAgendaCreateDev_(row, { ambiente: 'PROD', dryRun: false }),
  /SOMENTE_DEV/
);

const canonicalRow = context.atividadesV2_canonicalAgendaExportRow_(pair.publicDocument, pair.privateDocument);
let divergence = context.atividadesV2_canonicalAgendaBuildExportDivergenceReport_([canonicalRow], [canonicalRow], null);
assert.equal(divergence.ok, true);
const manuallyEdited = Object.assign({}, canonicalRow, { TITULO_PUBLICO: 'ALTERADO MANUALMENTE' });
divergence = context.atividadesV2_canonicalAgendaBuildExportDivergenceReport_([canonicalRow], [manuallyEdited], null);
assert.equal(divergence.ok, false);
assert.equal(divergence.resolution, 'FIRESTORE_WINS');
assert.equal(divergence.divergentRecords[0].fields.some((item) => item.field === 'TITULO_PUBLICO'), true);
assert.equal(documents.get('activities/ATV-2026-2-0053').tituloPublico, 'Titulo atualizado', 'edicao do espelho nao altera Firestore');

divergence = context.atividadesV2_canonicalAgendaBuildExportDivergenceReport_([canonicalRow], [], null);
assert.deepEqual(Array.from(divergence.missingIds), [row.ID_ATIVIDADE]);
divergence = context.atividadesV2_canonicalAgendaBuildExportDivergenceReport_([], [canonicalRow], null);
assert.deepEqual(Array.from(divergence.extraIds), [row.ID_ATIVIDADE]);

properties.delete('ATIVIDADES_V2_FIRESTORE_DEV_CRUD_TEST_AUTHORIZED');
assert.throws(
  () => context.atividadesV2_runTesteCrudAgendaFirestoreDev(),
  /TESTE_CRUD_FIRESTORE_DEV_NAO_AUTORIZADO/
);

assert.throws(
  () => context.atividadesV2_canonicalAgendaAssertExportAuthorized_({
    ambiente: 'DEV', confirmacao: 'AUTORIZO_EXPORT_FIRESTORE_DEV_PARA_SHEETS'
  }),
  /EXPORT_FIRESTORE_DEV_NAO_AUTORIZADO/
);
properties.set('ATIVIDADES_V2_FIRESTORE_DEV_EXPORT_AUTHORIZED', 'SIM');
assert.equal(
  context.atividadesV2_canonicalAgendaAssertExportAuthorized_({
    ambiente: 'DEV', confirmacao: 'AUTORIZO_EXPORT_FIRESTORE_DEV_PARA_SHEETS'
  }).ambiente,
  'DEV'
);

assert.equal(batchCalls, 3, 'create, update e cancel usam um batch atomico cada');

assert.throws(
  () => context.atividadesV2_canonicalAgendaCleanupCrudTestArtifactDev_(
    row.ID_ATIVIDADE, row.CANONICAL_REQUEST_ID,
    { publicSourceHash: pair.publicDocument.sourceHash, privateSourceHash: pair.privateDocument.sourceHash },
    { ambiente: 'DEV', dryRun: false, confirmacao: 'AUTORIZO_CLEANUP_FIRESTORE_DEV_ATIVIDADES_CRUD_TEST' }
  ),
  /NAO_AUTORIZADO/
);
properties.set('ATIVIDADES_V2_FIRESTORE_DEV_TEST_CLEANUP_AUTHORIZED', 'SIM');
const cleanupOptions = {
  ambiente: 'DEV', dryRun: false,
  confirmacao: 'AUTORIZO_CLEANUP_FIRESTORE_DEV_ATIVIDADES_CRUD_TEST'
};
const normalHashes = {
  publicSourceHash: pair.publicDocument.sourceHash,
  privateSourceHash: pair.privateDocument.sourceHash
};
assert.throws(
  () => context.atividadesV2_canonicalAgendaCleanupCrudTestArtifactDev_(
    row.ID_ATIVIDADE, row.CANONICAL_REQUEST_ID, normalHashes, cleanupOptions
  ),
  /ARTEFATO_NAO_RECONHECIDO/,
  'atividade normal jamais pode ser apagada pela limpeza tecnica'
);
assert.equal(deleteCalls, 0);

const technicalRunId = 'CRUD-FIRESTORE-DEV-TEST-0060';
const technicalRow = Object.assign({}, row, {
  ID_ATIVIDADE: 'ATV-2026-2-0060',
  NUMERO_SEQUENCIAL_NO_CICLO: 60,
  CANONICAL_REQUEST_ID: technicalRunId,
  IS_TECHNICAL_TEST: true,
  TEST_RUN_ID: technicalRunId,
  CREATED_BY_TEST_RUNNER: 'ATIVIDADES_V2_CRUD_TEST_RUNNER_V2',
  ORIGEM_FLUXO: 'TESTE_CRUD_FIRESTORE_DEV'
});
result = context.atividadesV2_canonicalAgendaCreateDev_(technicalRow, writeOptions);
assert.equal(result.ok, true);
result = context.atividadesV2_canonicalAgendaCancelDev_({ idAtividade: technicalRow.ID_ATIVIDADE }, writeOptions);
assert.equal(result.ok, true);
const technicalPair = context.atividadesV2_canonicalAgendaGetPairDev_(technicalRow.ID_ATIVIDADE, { ambiente: 'DEV' });
assert.equal(technicalPair.privateDocument.isTechnicalTest, true);
assert.equal(technicalPair.privateDocument.testRunId, technicalRunId, 'marca tecnica deve sobreviver ao cancelamento');
const technicalHashes = {
  publicSourceHash: technicalPair.publicDocument.sourceHash,
  privateSourceHash: technicalPair.privateDocument.sourceHash
};

assert.throws(
  () => context.atividadesV2_canonicalAgendaCleanupCrudTestArtifactDev_(
    technicalRow.ID_ATIVIDADE, '', technicalHashes, cleanupOptions
  ),
  /TEST_RUN_ID_AUSENTE/
);
const missingRunId = 'CRUD-FIRESTORE-DEV-MISSING-MARKER';
documents.set('activities/ATV-2026-2-0061', {
  idAtividade: 'ATV-2026-2-0061', creationRequestId: missingRunId,
  origemFluxo: 'TESTE_CRUD_FIRESTORE_DEV', sourceHash: 'PUBLIC-0061'
});
documents.set('activityPrivate/ATV-2026-2-0061', {
  idAtividade: 'ATV-2026-2-0061', isTechnicalTest: true,
  createdByTestRunner: 'ATIVIDADES_V2_CRUD_TEST_RUNNER_V2', sourceHash: 'PRIVATE-0061'
});
assert.throws(
  () => context.atividadesV2_canonicalAgendaCleanupCrudTestArtifactDev_(
    'ATV-2026-2-0061', missingRunId,
    { publicSourceHash: 'PUBLIC-0061', privateSourceHash: 'PRIVATE-0061' }, cleanupOptions
  ),
  /TEST_RUN_ID_DIVERGENTE/,
  'artefato sem testRunId persistido nao pode ser apagado'
);
documents.delete('activities/ATV-2026-2-0061');
documents.delete('activityPrivate/ATV-2026-2-0061');
assert.throws(
  () => context.atividadesV2_canonicalAgendaCleanupCrudTestArtifactDev_(
    technicalRow.ID_ATIVIDADE, 'RUN-DIVERGENTE', technicalHashes, cleanupOptions
  ),
  /TEST_RUN_ID_DIVERGENTE/
);
assert.throws(
  () => context.atividadesV2_canonicalAgendaCleanupCrudTestArtifactDev_(
    technicalRow.ID_ATIVIDADE, technicalRunId,
    { publicSourceHash: 'HASH-ALTERADO', privateSourceHash: technicalHashes.privateSourceHash },
    cleanupOptions
  ),
  /HASH_DIVERGENTE/
);
assert.throws(
  () => context.atividadesV2_canonicalAgendaCleanupCrudTestArtifactDev_(
    technicalRow.ID_ATIVIDADE, technicalRunId, technicalHashes,
    Object.assign({}, cleanupOptions, { ambiente: 'PROD' })
  ),
  /SOMENTE_DEV/
);
assert.equal(deleteCalls, 0, 'guards negativos nao podem chamar delete');

const partialRunId = 'CRUD-FIRESTORE-DEV-PARTIAL-0062';
documents.set('activities/ATV-2026-2-0062', {
  idAtividade: 'ATV-2026-2-0062', creationRequestId: partialRunId,
  origemFluxo: 'TESTE_CRUD_FIRESTORE_DEV', sourceHash: 'PUBLIC-0062'
});
documents.set('activityPrivate/ATV-2026-2-0062', {
  idAtividade: 'ATV-2026-2-0062', isTechnicalTest: true, testRunId: partialRunId,
  createdByTestRunner: 'ATIVIDADES_V2_CRUD_TEST_RUNNER_V2', sourceHash: 'PRIVATE-0062'
});
failDeletePath = 'activities/ATV-2026-2-0062';
assert.throws(
  () => context.atividadesV2_canonicalAgendaCleanupCrudTestArtifactDev_(
    'ATV-2026-2-0062', partialRunId,
    { publicSourceHash: 'PUBLIC-0062', privateSourceHash: 'PRIVATE-0062' }, cleanupOptions
  ),
  /DELETE_PUBLICO_FALHOU_REVERTIDO/
);
assert.equal(documents.get('activities/ATV-2026-2-0062').sourceHash, 'PUBLIC-0062');
assert.equal(documents.get('activityPrivate/ATV-2026-2-0062').sourceHash, 'PRIVATE-0062', 'delete parcial deve ser compensado');
documents.delete('activities/ATV-2026-2-0062');
documents.delete('activityPrivate/ATV-2026-2-0062');
failDeletePath = '';
deletedPaths.length = 0;

const cleanupResult = context.atividadesV2_canonicalAgendaCleanupCrudTestArtifactDev_(
  technicalRow.ID_ATIVIDADE, technicalRunId, technicalHashes, cleanupOptions
);
assert.equal(cleanupResult.ok, true);
assert.equal(cleanupResult.deleted, 2);
assert.deepEqual(deletedPaths, [
  'activityPrivate/ATV-2026-2-0060',
  'activities/ATV-2026-2-0060'
]);
assert.equal(documents.has('activities/ATV-2026-2-0060'), false);
assert.equal(documents.has('activityPrivate/ATV-2026-2-0060'), false);
assert.equal(documents.has('activities/ATV-2026-2-0053'), true, 'cleanup nao toca outra atividade');
assert.equal(documents.has('activityPrivate/ATV-2026-2-0053'), true, 'cleanup nao toca outro documento privado');
console.log('firestore_canonical_crud.test.cjs: OK');
