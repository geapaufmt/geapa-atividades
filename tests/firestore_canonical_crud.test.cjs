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
    coreFirestoreEnvironmentDeleteDocument: () => {
      deleteCalls += 1;
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
console.log('firestore_canonical_crud.test.cjs: OK');
