const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const properties = new Map([
  ['ATIVIDADES_V2_AGENDA_CANONICAL_MODE', 'FIRESTORE_CANONICAL'],
  ['ATIVIDADES_V2_FIRESTORE_DEV_CRUD_TEST_AUTHORIZED', 'SIM'],
  ['ATIVIDADES_V2_FIRESTORE_DEV_CANONICAL_WRITES_AUTHORIZED', 'SIM'],
  ['ATIVIDADES_V2_FIRESTORE_DEV_EXPORT_AUTHORIZED', 'SIM'],
  ['ATIVIDADES_V2_FIRESTORE_DEV_TEST_CLEANUP_AUTHORIZED', 'SIM']
]);
const documents = new Map();
for (let index = 1; index <= 52; index += 1) {
  const id = `ATV-2026-2-${String(index).padStart(4, '0')}`;
  documents.set(`activities/${id}`, { idAtividade: id, sourceHash: `PUB-${index}` });
  documents.set(`activityPrivate/${id}`, { idAtividade: id, sourceHash: `PRI-${index}` });
}
const initialHashes = new Map(Array.from(documents.entries()).map(([key, value]) => [key, value.sourceHash]));
let exportedHashes = new Map();
let exportCalls = 0;
const deletePaths = [];
let cancelObserved = false;

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function listCollection(collection) {
  const prefix = `${collection}/`;
  return Array.from(documents.entries())
    .filter(([key]) => key.startsWith(prefix) && !key.slice(prefix.length).includes('/'))
    .map(([key, data]) => ({ id: key.slice(prefix.length), path: key, data: clone(data) }));
}

const scriptProperties = {
  getProperty: (key) => properties.get(key) || null,
  setProperty: (key, value) => properties.set(key, String(value))
};

const context = {
  Object, Array, String, Number, Boolean, Date, JSON, Math, Error, isFinite,
  Logger: { log() {} },
  Utilities: {
    getUuid: () => '00000000-0000-4000-8000-000000000053',
    formatDate: (date) => date.toISOString().slice(0, 10)
  },
  Session: { getScriptTimeZone: () => 'America/Cuiaba' },
  PropertiesService: { getScriptProperties: () => scriptProperties },
  LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
  ATIVIDADES_V2_CANONICAL_COLLECTION: 'activities',
  ATIVIDADES_V2_CANONICAL_PRIVATE_COLLECTION: 'activityPrivate',
  ATIVIDADES_V2_CANONICAL_CRUD_CONFIRMATION: 'AUTORIZO_WRITE_FIRESTORE_DEV_ATIVIDADES_AGENDA_CRUD',
  ATIVIDADES_V2_CANONICAL_EXPORT_CONFIRMATION: 'AUTORIZO_EXPORT_FIRESTORE_DEV_PARA_SHEETS',
  atividades_normalizeTextUpper_: (value) => String(value || '').trim().toUpperCase(),
  atividadesV2_canonicalAgendaContext_: (options) => {
    const environment = String(options && options.ambiente || '').toUpperCase();
    if (environment !== 'DEV') throw new Error('SOMENTE_DEV');
    return { environment: 'DEV' };
  },
  atividadesV2_canonicalAgendaMode_: () => properties.get('ATIVIDADES_V2_AGENDA_CANONICAL_MODE'),
  atividadesV2_canonicalAgendaDevOptions_: (options) => {
    const environment = String(options && options.ambiente || 'DEV').toUpperCase();
    if (environment !== 'DEV') throw new Error('SOMENTE_DEV');
    return Object.assign({}, options, { ambiente: 'DEV', environment: 'DEV' });
  },
  atividadesV2_canonicalAgendaActivityId_: (value) => {
    const id = String(value || '').toUpperCase();
    if (!/^ATV-\d{4}-[12]-\d{4}$/.test(id)) throw new Error('ID_INVALIDO');
    return id;
  },
  atividadesV2_canonicalAgendaListAll_: (collection, environment) => {
    assert.equal(environment, 'DEV');
    return listCollection(collection);
  },
  atividadesV2_canonicalAgendaBuildExportRows_: (publicDocs, privateDocs) => {
    const privateIds = new Set(privateDocs.map((item) => item.id));
    const publicIds = new Set(publicDocs.map((item) => item.id));
    return {
      ok: publicDocs.every((item) => privateIds.has(item.id)) && privateDocs.every((item) => publicIds.has(item.id)),
      rows: publicDocs.map((item) => ({ ID_ATIVIDADE: item.id })),
      missingPrivatePaths: publicDocs.filter((item) => !privateIds.has(item.id)).map((item) => `activityPrivate/${item.id}`),
      unexpectedPrivatePaths: privateDocs.filter((item) => !publicIds.has(item.id)).map((item) => `activityPrivate/${item.id}`)
    };
  },
  atividadesV2_buildNextActivityIdentityForCreate_: () => ({
    idAtividade: 'ATV-2026-2-0053', ano: 2026, semestre: 2, sequencial: 53
  }),
  atividadesV2_canonicalAgendaCreateDev_: (row) => {
    documents.set(`activities/${row.ID_ATIVIDADE}`, {
      idAtividade: row.ID_ATIVIDADE,
      creationRequestId: row.CANONICAL_REQUEST_ID,
      origemFluxo: row.ORIGEM_FLUXO,
      tituloPublico: row.TITULO_PUBLICO,
      sourceHash: 'PUB-CREATE'
    });
    documents.set(`activityPrivate/${row.ID_ATIVIDADE}`, {
      idAtividade: row.ID_ATIVIDADE,
      isTechnicalTest: row.IS_TECHNICAL_TEST,
      testRunId: row.TEST_RUN_ID,
      createdByTestRunner: row.CREATED_BY_TEST_RUNNER,
      sourceHash: 'PRI-CREATE'
    });
    return { ok: true, written: 2, publicSourceHash: 'PUB-CREATE', privateSourceHash: 'PRI-CREATE' };
  },
  atividadesV2_canonicalAgendaGetPairDev_: (id) => ({
    found: documents.has(`activities/${id}`),
    publicDocument: clone(documents.get(`activities/${id}`)),
    privateDocument: clone(documents.get(`activityPrivate/${id}`))
  }),
  atividadesV2_canonicalAgendaUpdateDev_: (id, updates) => {
    const publicDocument = documents.get(`activities/${id}`);
    const privateDocument = documents.get(`activityPrivate/${id}`);
    publicDocument.tituloPublico = updates.TITULO_PUBLICO;
    publicDocument.sourceHash = 'PUB-UPDATE';
    privateDocument.sourceHash = 'PRI-UPDATE';
    return { ok: true, written: 2 };
  },
  atividadesV2_canonicalAgendaCancelDev_: ({ idAtividade }) => {
    const publicDocument = documents.get(`activities/${idAtividade}`);
    const privateDocument = documents.get(`activityPrivate/${idAtividade}`);
    publicDocument.statusOperacional = 'CANCELADA';
    publicDocument.statusPublicacaoPortal = 'OCULTA';
    publicDocument.visibilidadePortal = 'OCULTA';
    publicDocument.sourceHash = 'PUB-CANCEL';
    privateDocument.sourceHash = 'PRI-CANCEL';
    cancelObserved = true;
    return { ok: true, written: 2 };
  },
  atividadesV2_canonicalAgendaExportToSheetsDev_: () => {
    exportCalls += 1;
    exportedHashes = new Map(Array.from(documents.entries()).map(([key, value]) => [key, value.sourceHash]));
    return { ok: true, totalActivities: listCollection('activities').length };
  },
  atividadesV2_canonicalAgendaDiagnoseExportDev_: () => {
    const current = new Map(Array.from(documents.entries()).map(([key, value]) => [key, value.sourceHash]));
    const same = current.size === exportedHashes.size &&
      Array.from(current.entries()).every(([key, hash]) => exportedHashes.get(key) === hash);
    return {
      ok: same,
      missingIds: [], extraIds: [], duplicatePaths: [], divergentRecords: [],
      missingPrivatePaths: [], unexpectedPrivatePaths: []
    };
  },
  GEAPA_CORE: {
    coreFirestoreEnvironmentGetDocument: (documentPath, options) => {
      assert.equal(options.ambiente, 'DEV');
      return documents.has(documentPath)
        ? { ok: true, found: true, data: clone(documents.get(documentPath)) }
        : { ok: true, found: false };
    },
    coreFirestoreEnvironmentDeleteDocument: (documentPath, options) => {
      assert.equal(options.ambiente, 'DEV');
      deletePaths.push(documentPath);
      const deleted = documents.delete(documentPath);
      return { ok: deleted, deleted };
    },
    coreFirestoreEnvironmentBatchSetDocuments: (items, options) => {
      assert.equal(options.ambiente, 'DEV');
      items.forEach((item) => documents.set(item.path, clone(item.data)));
      return { ok: true, written: items.length };
    }
  }
};
context.atividadesV2_canonicalAgendaRequireCoreMethod_ = (name) => context.GEAPA_CORE[name];

vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, '..', '48_atividades_v2_firestore_canonical_stabilization.gs'), 'utf8'),
  context,
  { filename: '48_atividades_v2_firestore_canonical_stabilization.gs' }
);

const result = context.atividadesV2_runTesteCrudAgendaFirestoreDev();
assert.equal(result.ok, true);
assert.equal(result.environment, 'DEV');
assert.equal(result.testActivityId, 'ATV-2026-2-0053');
assert.equal(cancelObserved, true, 'status cancelado deve ser validado antes da limpeza');
for (const step of [
  'CREATE', 'READ_PAIR', 'UPDATE', 'CONFIRM_UPDATE', 'CANCEL',
  'EXPORT_AFTER_CANCEL', 'VALIDATE_AFTER_CANCEL', 'CLEANUP_TEST_ARTIFACT',
  'EXPORT_FINAL', 'VALIDATE_FINAL'
]) assert.equal(result.steps[step], true, `etapa ${step}`);
assert.equal(exportCalls, 3, 'exporta antes do cancelamento, depois do cancelamento e depois da limpeza');
assert.deepEqual(deletePaths, [
  'activityPrivate/ATV-2026-2-0053',
  'activities/ATV-2026-2-0053'
]);
assert.equal(result.finalState.activitiesCount, 52);
assert.equal(result.finalState.activityPrivateCount, 52);
assert.deepEqual(Array.from(result.finalState.missingPaths), []);
assert.deepEqual(Array.from(result.finalState.unexpectedPaths), []);
assert.deepEqual(Array.from(result.finalState.divergentPaths), []);
assert.equal(documents.size, 104);
assert.equal(
  Array.from(initialHashes.entries()).every(([key, hash]) => documents.get(key).sourceHash === hash),
  true,
  'todos os paths e hashes anteriores devem ser restaurados'
);
assert.equal(exportedHashes.size, 104, 'espelho final contem somente as 52 atividades canonicas');
assert.equal(exportedHashes.has('activities/ATV-2026-2-0053'), false, 'artefato 0053 nao permanece no espelho final');
console.log('firestore_crud_runner_reversible.test.cjs: OK');
