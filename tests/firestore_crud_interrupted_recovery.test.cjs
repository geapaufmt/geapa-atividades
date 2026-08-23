const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const RECOVERY_ID = 'ATV-2026-2-0026';
const TEST_RUN_ID = 'CRUD-FIRESTORE-DEV-4b389276-0bfc-409c-8019-ba63426c6ef5';
const PUBLIC_HASH = '9vrjZTSPyujrIThAwStzur-eor0MDlvFY7Qy50toNs8';
const PRIVATE_HASH = 'RXAS59BWUAoqhwh2xbC6SIKn1qoBd9WOoQe9nuKXqpE';
const CONFIRMATION = 'AUTORIZO_RECOVERY_FIRESTORE_DEV_ATIVIDADES_CRUD_TEST_ATV_2026_2_0026';
const properties = new Map([
  ['ATIVIDADES_V2_AGENDA_CANONICAL_MODE', 'FIRESTORE_CANONICAL'],
  ['ATIVIDADES_V2_FIRESTORE_DEV_TEST_CLEANUP_AUTHORIZED', 'SIM']
]);
const documents = new Map();
const deletedPaths = [];
let validationCalls = 0;
let boundEnvironment = '';

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function seedOriginalDocuments() {
  documents.clear();
  deletedPaths.length = 0;
  validationCalls = 0;
  for (let index = 1; index <= 52; index += 1) {
    const id = `BASE-${String(index).padStart(4, '0')}`;
    documents.set(`activities/${id}`, { idAtividade: id, sourceHash: `PUB-${index}` });
    documents.set(`activityPrivate/${id}`, { idAtividade: id, sourceHash: `PRI-${index}` });
  }
  documents.set(`activities/${RECOVERY_ID}`, {
    idAtividade: RECOVERY_ID,
    creationRequestId: TEST_RUN_ID,
    origemFluxo: 'TESTE_CRUD_FIRESTORE_DEV',
    sourceHash: PUBLIC_HASH
  });
  documents.set(`activityPrivate/${RECOVERY_ID}`, {
    idAtividade: RECOVERY_ID,
    isTechnicalTest: true,
    createdByTestRunner: 'ATIVIDADES_V2_CRUD_TEST_RUNNER_V2',
    testRunId: TEST_RUN_ID,
    sourceHash: PRIVATE_HASH
  });
}

function assertDev(options, operation) {
  const environment = String(options && (options.ambiente || options.environment) || '').toUpperCase();
  assert.equal(environment, 'DEV', `${operation} deve receber DEV explicitamente`);
}

const scriptProperties = {
  getProperty: (key) => properties.get(key) || null
};

const context = {
  Object, Array, String, Number, Boolean, Date, JSON, Math, Error, isFinite,
  Logger: { log() {} },
  PropertiesService: { getScriptProperties: () => scriptProperties },
  LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
  ATIVIDADES_V2_CANONICAL_COLLECTION: 'activities',
  ATIVIDADES_V2_CANONICAL_PRIVATE_COLLECTION: 'activityPrivate',
  atividades_normalizeTextUpper_: (value) => String(value || '').trim().toUpperCase(),
  atividadesV2_bindExecutionEnvironment_: (options) => {
    assertDev(options, 'bind');
    boundEnvironment = 'DEV';
    return boundEnvironment;
  },
  atividadesV2_canonicalAgendaContext_: (options) => {
    assertDev(options, 'context');
    return { environment: 'DEV' };
  },
  atividadesV2_canonicalAgendaMode_: () => properties.get('ATIVIDADES_V2_AGENDA_CANONICAL_MODE'),
  atividadesV2_canonicalAgendaDevOptions_: (options) => {
    assertDev(options, 'devOptions');
    return Object.assign({}, options, { ambiente: 'DEV', environment: 'DEV' });
  },
  atividadesV2_canonicalAgendaActivityId_: (value) => {
    const id = String(value || '').trim().toUpperCase();
    if (!/^ATV-\d{4}-[12]-\d{4}$/.test(id)) throw new Error('ID_INVALIDO');
    return id;
  },
  atividadesV2_canonicalAgendaValidateInitialImportDev_: (options) => {
    assertDev(options, 'validation');
    validationCalls += 1;
    const activitiesCount = Array.from(documents.keys()).filter((key) => key.startsWith('activities/')).length;
    const activityPrivateCount = Array.from(documents.keys()).filter((key) => key.startsWith('activityPrivate/')).length;
    const unexpectedPaths = [
      `activities/${RECOVERY_ID}`,
      `activityPrivate/${RECOVERY_ID}`
    ].filter((key) => documents.has(key));
    return {
      ok: activitiesCount === 52 && activityPrivateCount === 52 && unexpectedPaths.length === 0,
      environment: 'DEV', readOnly: true,
      expectedActivities: 52, expectedDocuments: 104,
      activitiesCount, activityPrivateCount, matchingHashes: 104,
      missingPaths: [], unexpectedPaths, divergentPaths: [], errors: []
    };
  },
  GEAPA_CORE: {
    coreFirestoreEnvironmentGetDocument: (documentPath, options) => {
      assertDev(options, 'get');
      return documents.has(documentPath)
        ? { ok: true, found: true, data: clone(documents.get(documentPath)) }
        : { ok: true, found: false };
    },
    coreFirestoreEnvironmentDeleteDocument: (documentPath, options) => {
      assertDev(options, 'delete');
      deletedPaths.push(documentPath);
      const deleted = documents.delete(documentPath);
      return { ok: deleted, deleted };
    },
    coreFirestoreEnvironmentBatchSetDocuments: (items, options) => {
      assertDev(options, 'restore');
      items.forEach((item) => documents.set(item.path, clone(item.data)));
      return { ok: true, written: items.length };
    }
  }
};
context.atividadesV2_canonicalAgendaRequireCoreMethod_ = (name) => context.GEAPA_CORE[name];

vm.createContext(context);
for (const file of ['48_atividades_v2_firestore_canonical_stabilization.gs', '00_module_public_api.gs']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context, { filename: file });
}

function recoveryOptions(overrides) {
  return Object.assign({
    ambiente: 'DEV', dryRun: false, idAtividade: RECOVERY_ID, confirmacao: CONFIRMATION
  }, overrides || {});
}

seedOriginalDocuments();
documents.get(`activityPrivate/${RECOVERY_ID}`).isTechnicalTest = false;
assert.throws(
  () => context.atividadesV2_canonicalAgendaRecoverInterruptedCrudTestArtifactDev_(recoveryOptions()),
  /ARTEFATO_NAO_RECONHECIDO/
);
assert.deepEqual(deletedPaths, []);

seedOriginalDocuments();
assert.throws(
  () => context.atividadesV2_canonicalAgendaRecoverInterruptedCrudTestArtifactDev_(
    recoveryOptions({ idAtividade: 'ATV-2026-2-9999' })
  ),
  /ID_NAO_AUTORIZADO/
);
assert.deepEqual(deletedPaths, []);

seedOriginalDocuments();
documents.get(`activityPrivate/${RECOVERY_ID}`).testRunId = 'CRUD-FIRESTORE-DEV-DIVERGENTE';
assert.throws(
  () => context.atividadesV2_canonicalAgendaRecoverInterruptedCrudTestArtifactDev_(recoveryOptions()),
  /TEST_RUN_ID_DIVERGENTE/
);
assert.deepEqual(deletedPaths, []);

seedOriginalDocuments();
documents.get(`activities/${RECOVERY_ID}`).sourceHash = 'HASH-DIVERGENTE';
assert.throws(
  () => context.atividadesV2_canonicalAgendaRecoverInterruptedCrudTestArtifactDev_(recoveryOptions()),
  /HASH_DIVERGENTE/
);
assert.deepEqual(deletedPaths, []);

seedOriginalDocuments();
assert.throws(
  () => context.atividadesV2_canonicalAgendaRecoverInterruptedCrudTestArtifactDev_(
    recoveryOptions({ ambiente: 'PROD' })
  ),
  /SOMENTE_DEV/
);
assert.deepEqual(deletedPaths, []);

seedOriginalDocuments();
assert.throws(
  () => context.atividadesV2_canonicalAgendaRecoverInterruptedCrudTestArtifactDev_(
    recoveryOptions({ ambiente: 'DEV', environment: 'PROD' })
  ),
  /SOMENTE_DEV/
);
assert.deepEqual(deletedPaths, []);

seedOriginalDocuments();
properties.delete('ATIVIDADES_V2_FIRESTORE_DEV_TEST_CLEANUP_AUTHORIZED');
assert.throws(
  () => context.atividadesV2_runRecuperarArtefatoCrudInterrompidoFirestoreDev(),
  /NAO_AUTORIZADO/
);
properties.set('ATIVIDADES_V2_FIRESTORE_DEV_TEST_CLEANUP_AUTHORIZED', 'SIM');
assert.deepEqual(deletedPaths, []);

seedOriginalDocuments();
const result = context.atividadesV2_runRecuperarArtefatoCrudInterrompidoFirestoreDev();
assert.equal(boundEnvironment, 'DEV');
assert.equal(result.ok, true);
assert.equal(result.environment, 'DEV');
assert.equal(result.recoveredId, RECOVERY_ID);
assert.equal(result.activitiesCount, 52);
assert.equal(result.activityPrivateCount, 52);
assert.equal(result.matchingHashes, 104);
assert.deepEqual(Array.from(result.unexpectedPaths), []);
assert.equal(result.validationReadOnly, true);
assert.equal(result.sheetsWritten, false);
assert.equal(result.exportExecuted, false);
assert.equal(result.prodTouched, false);
assert.equal(validationCalls, 1);
assert.deepEqual(deletedPaths, [
  `activityPrivate/${RECOVERY_ID}`,
  `activities/${RECOVERY_ID}`
]);
assert.equal(documents.size, 104);
console.log('firestore_crud_interrupted_recovery.test.cjs: OK');
