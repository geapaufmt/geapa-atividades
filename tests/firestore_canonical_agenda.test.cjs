const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const properties = new Map();
let executionEnvironment = 'DEV';
let batchWriteCalls = 0;
let deleteCalls = 0;
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
  PropertiesService: {
    getScriptProperties: () => ({ getProperty: (key) => properties.get(key) || null })
  },
  LockService: {
    getScriptLock: () => ({ tryLock: () => true, releaseLock() {} })
  },
  ATIVIDADES_CFG: { MODULE_CODE: 'ATIVIDADES' },
  atividades_normalizeTextUpper_: (value) => String(value || '').trim().toUpperCase(),
  atividadesV2_resolveEnvironment_: (options) => {
    const value = String(options && (options.ambiente || options.environment) || executionEnvironment || '').toUpperCase();
    if (!['DEV', 'PROD'].includes(value)) throw new Error('ambiente invalido');
    return value;
  },
  GEAPA_CORE: {
    coreFirestoreGetEnvironmentConfig: ({ ambiente }) => ({
      environment: ambiente,
      projectId: ambiente === 'DEV' ? 'demo-geapa-dev' : 'portal-geapa',
      databaseId: '(default)'
    }),
    coreAssertModuleExecutionAllowed: () => ({ allowed: true, config: { mode: 'ON' } }),
    coreFirestoreEnvironmentBatchSetDocuments: () => {
      batchWriteCalls += 1;
      throw new Error('write nao esperado no teste');
    },
    coreFirestoreEnvironmentDeleteDocument: () => {
      deleteCalls += 1;
      return { ok: true, deleted: true, code: 'FIRESTORE_DELETE_OK' };
    }
  }
};

vm.createContext(context);
for (const file of ['45_atividades_v2_firestore_read_models.gs', '46_atividades_v2_firestore_canonical_agenda.gs']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context, { filename: file });
}

assert.throws(() => context.atividadesV2_canonicalAgendaContext_({}), /AMBIENTE_FIRESTORE_OBRIGATORIO/);
assert.throws(() => context.atividadesV2_canonicalAgendaContext_({ ambiente: 'PROD' }), /SOMENTE_DEV/);

const row = {
  ID_ATIVIDADE: 'ATV-2026-1-0001',
  CICLO: 'GEAPA_2026_1', ANO: 2026, SEMESTRE: 1, NUMERO_SEQUENCIAL_NO_CICLO: 1,
  TITULO: 'Reuniao interna', TITULO_PUBLICO: 'Reuniao GEAPA', DESCRICAO: 'Nota interna',
  DESCRICAO_PUBLICA: 'Pauta publica', DATA_ATIVIDADE: '2026-08-21', HORARIO_INICIO: '18:30',
  HORARIO_FIM: '20:30', LOCAL: 'Sala 1', FORMATO: 'PRESENCIAL', ATIVO: 'SIM',
  ID_PESSOA_PRINCIPAL: 'P-001', EMAIL_PESSOA_PRINCIPAL: 'Pessoa@Example.Invalid',
  POSSUI_APRESENTACOES: 'SIM', QTD_APRESENTACOES: 2, CONTA_PRESENCA: 'SIM',
  DATA_LIMITE_JUSTIFICATIVA: '2026-08-23', LINK_MATERIAL: 'https://example.invalid/material',
  ID_PASTA_DRIVE: 'drive-id', LINK_PASTA_DRIVE: 'https://example.invalid/drive'
};
const built = context.atividadesV2_canonicalAgendaBuildDocuments_(row, new Date('2026-08-21T12:00:00.000Z'));
assert.equal(built.publicDocument.schemaVersion, 'activity-canonical-v1');
assert.equal(built.privateDocument.schemaVersion, 'activity-private-v1');
assert.equal(built.publicDocument.canonicalSource, 'FIRESTORE');
assert.equal(built.privateDocument.emailPessoaPrincipal, 'pessoa@example.invalid');

const serialized = JSON.stringify(built);
for (const forbidden of [
  'POSSUI_APRESENTACOES', 'QTD_APRESENTACOES', 'CONTA_PRESENCA',
  'DATA_LIMITE_JUSTIFICATIVA', 'LINK_MATERIAL', 'ID_PASTA_DRIVE', 'LINK_PASTA_DRIVE',
  'temApresentacao', 'contaPresenca', 'dataLimiteJustificativa',
  'https://example.invalid/material', 'drive-id', 'https://example.invalid/drive'
]) {
  assert.equal(serialized.includes(forbidden), false, `campo fora do piloto: ${forbidden}`);
}

const writeItems = context.atividadesV2_canonicalAgendaWriteItems_(built);
const identical = {};
identical[writeItems[0].path] = { sourceHash: writeItems[0].data.sourceHash };
let diff = context.atividadesV2_canonicalAgendaDiffImportItems_(writeItems, identical);
assert.equal(diff.skippedIdentical, 1);
assert.equal(diff.pending.length, 1);
assert.equal(diff.conflicts.length, 0);
identical[writeItems[1].path] = { sourceHash: 'divergente' };
diff = context.atividadesV2_canonicalAgendaDiffImportItems_(writeItems, identical);
assert.equal(diff.conflicts.length, 1);

assert.throws(
  () => context.atividadesV2_canonicalAgendaAssertLegacySheetWriteAllowed_(),
  /ESCRITA_LEGADA_BLOQUEADA/
);
properties.set('ATIVIDADES_V2_AGENDA_CANONICAL_MODE', 'LEGACY_READ_ONLY');
executionEnvironment = 'PROD';
assert.equal(context.atividadesV2_canonicalAgendaAssertLegacySheetWriteAllowed_(), true);

const plan = {
  ok: true,
  dryRun: true,
  environment: 'DEV',
  totalActivities: 1,
  totalDocuments: 2,
  items: writeItems,
  errors: []
};
const publicCorrect = [{ id: built.idAtividade, data: { sourceHash: built.publicDocument.sourceHash } }];
const privateCorrect = [{ id: built.idAtividade, data: { sourceHash: built.privateDocument.sourceHash } }];

let validation = context.atividadesV2_canonicalAgendaBuildValidationReport_(plan, publicCorrect, privateCorrect);
assert.equal(validation.ok, true, 'validador deve aceitar estado correto');
assert.equal(validation.matchingHashes, 2);
assert.deepEqual(Array.from(validation.missingPaths), []);
assert.deepEqual(Array.from(validation.divergentPaths), []);
assert.deepEqual(Array.from(validation.unexpectedPaths), []);

validation = context.atividadesV2_canonicalAgendaBuildValidationReport_(plan, publicCorrect, []);
assert.equal(validation.ok, false, 'validador deve detectar documento faltante');
assert.deepEqual(Array.from(validation.missingPaths), [writeItems[1].path]);

validation = context.atividadesV2_canonicalAgendaBuildValidationReport_(
  plan,
  [{ id: built.idAtividade, data: { sourceHash: 'hash-divergente' } }],
  privateCorrect
);
assert.equal(validation.ok, false, 'validador deve detectar hash divergente');
assert.deepEqual(Array.from(validation.divergentPaths), [writeItems[0].path]);

validation = context.atividadesV2_canonicalAgendaBuildValidationReport_(
  plan,
  publicCorrect.concat([{ id: 'ATV-INESPERADA', data: { sourceHash: 'extra' } }]),
  privateCorrect
);
assert.equal(validation.ok, false, 'validador deve detectar documento inesperado');
assert.deepEqual(Array.from(validation.unexpectedPaths), ['activities/ATV-INESPERADA']);

context.atividadesV2_canonicalAgendaPlanInitialImportDev_ = () => plan;
context.atividadesV2_canonicalAgendaListAll_ = (collection) => (
  collection === 'activities' ? publicCorrect : privateCorrect
);
batchWriteCalls = 0;
deleteCalls = 0;
validation = context.atividadesV2_canonicalAgendaValidateInitialImportDev_({ ambiente: 'DEV' });
assert.equal(validation.ok, true);
assert.equal(batchWriteCalls, 0, 'validador nunca deve chamar batch de escrita');
assert.equal(deleteCalls, 0, 'validador nunca deve excluir documentos');

assert.throws(
  () => context.atividadesV2_canonicalAgendaImportInitialDev_({ ambiente: 'PROD', dryRun: false }),
  /SOMENTE_DEV/,
  'importacao nao pode aceitar PROD'
);

context.atividades_runWithOperationalGuard_ = function(_flow, _capabilities, callback) {
  return callback({ modeRead: 'ON' });
};
vm.runInContext(
  fs.readFileSync(path.join(__dirname, '..', '00_module_public_api.gs'), 'utf8'),
  context,
  { filename: '00_module_public_api.gs' }
);

properties.delete('ATIVIDADES_V2_FIRESTORE_DEV_REMOTE_WRITES_AUTHORIZED');
assert.throws(
  () => context.atividadesV2_runImportacaoRealAgendaFirestoreDev(),
  /WRITE_FIRESTORE_DEV_NAO_AUTORIZADO/,
  'runner real deve falhar sem Script Property temporaria'
);

properties.set('ATIVIDADES_V2_FIRESTORE_DEV_ROLLBACK_AUTHORIZED', 'SIM');
assert.throws(
  () => context.atividadesV2_canonicalAgendaRollbackInitialImportDev_({ ambiente: 'DEV', dryRun: false }),
  /ROLLBACK_FIRESTORE_DEV_NAO_AUTORIZADO/,
  'rollback real deve exigir confirmacao exata'
);
assert.throws(
  () => context.atividadesV2_canonicalAgendaRollbackInitialImportDev_({
    ambiente: 'PROD',
    dryRun: false,
    confirmacao: 'AUTORIZO_ROLLBACK_FIRESTORE_DEV_ATIVIDADES_AGENDA'
  }),
  /SOMENTE_DEV/,
  'rollback nunca pode aceitar PROD'
);

context.atividadesV2_canonicalAgendaListAll_ = (collection) => (
  collection === 'activities'
    ? [{ id: built.idAtividade, data: { sourceHash: 'hash-divergente' } }]
    : privateCorrect
);
deleteCalls = 0;
assert.throws(
  () => context.atividadesV2_canonicalAgendaRollbackInitialImportDev_({
    ambiente: 'DEV',
    dryRun: false,
    confirmacao: 'AUTORIZO_ROLLBACK_FIRESTORE_DEV_ATIVIDADES_AGENDA'
  }),
  /ROLLBACK_CONFLITO_FIRESTORE/,
  'rollback deve abortar antes de excluir quando houver hash divergente'
);
assert.equal(deleteCalls, 0, 'rollback divergente nao pode excluir documento algum');

assert.deepEqual(
  Array.from(context.atividadesV2_canonicalAgendaRollbackPaths_(plan)),
  [writeItems[0].path, writeItems[1].path],
  'rollback deve calcular somente os dois paths do piloto por atividade'
);
assert.throws(
  () => context.atividadesV2_canonicalAgendaRollbackPaths_({ items: [{ path: 'portalUsers/uid', data: {} }] }),
  /ROLLBACK_PATH_FORA_DO_PILOTO/,
  'rollback deve rejeitar qualquer collection fora do piloto'
);

console.log('firestore_canonical_agenda.test.cjs: OK');
