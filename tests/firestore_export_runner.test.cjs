const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const properties = new Map();
let exportCalls = 0;
let receivedOptions = null;
let canonicalMode = 'FIRESTORE_CANONICAL';
const expectedResult = Object.freeze({
  ok: true,
  dryRun: false,
  environment: 'DEV',
  totalActivities: 52,
  targetSheet: 'EXPORT_ATIVIDADES_FIRESTORE',
  sheetsWritten: true
});

const context = {
  Object, Array, String, Number, Boolean, Date, JSON, Math, Error, isFinite,
  ATIVIDADES_V2_EXECUTION_ENVIRONMENT_: '',
  ATIVIDADES_V2_CANONICAL_EXPORT_WRITE_PROPERTY: 'ATIVIDADES_V2_FIRESTORE_DEV_EXPORT_AUTHORIZED',
  PropertiesService: {
    getScriptProperties: () => ({ getProperty: (key) => properties.get(key) || null })
  },
  atividades_normalizeTextUpper_: (value) => String(value || '').trim().toUpperCase(),
  atividadesV2_bindExecutionEnvironment_: (options) => {
    const environment = String(options && options.ambiente || '').toUpperCase();
    if (environment !== 'DEV') throw new Error('SOMENTE_DEV');
    context.ATIVIDADES_V2_EXECUTION_ENVIRONMENT_ = environment;
    return environment;
  },
  atividadesV2_canonicalAgendaContext_: (options) => {
    if (String(options && options.ambiente || '').toUpperCase() !== 'DEV') throw new Error('SOMENTE_DEV');
    return { environment: 'DEV' };
  },
  atividadesV2_canonicalAgendaMode_: () => canonicalMode,
  atividadesV2_firestoreExportarAgendaParaSheetsDev: (options) => {
    exportCalls += 1;
    receivedOptions = structuredClone(options);
    return expectedResult;
  }
};

vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, '..', '48_atividades_v2_firestore_canonical_stabilization.gs'), 'utf8'),
  context,
  { filename: '48_atividades_v2_firestore_canonical_stabilization.gs' }
);

const publicApi = fs.readFileSync(path.join(__dirname, '..', '00_module_public_api.gs'), 'utf8');
const publicStart = publicApi.indexOf('function atividadesV2_runExportacaoAgendaFirestoreParaSheetsDev()');
const publicEnd = publicApi.indexOf('/** Compara Firestore', publicStart);
assert.ok(publicStart >= 0 && publicEnd > publicStart, 'runner publico deve existir');
vm.runInContext(publicApi.slice(publicStart, publicEnd), context, { filename: '00_module_public_api.gs' });

assert.throws(
  () => context.atividadesV2_runExportacaoAgendaFirestoreParaSheetsDev(),
  /EXPORT_FIRESTORE_DEV_NAO_AUTORIZADO/
);
assert.equal(exportCalls, 0, 'sem gate nao chama a exportacao');

properties.set('ATIVIDADES_V2_FIRESTORE_DEV_EXPORT_AUTHORIZED', 'SIM');
context.ATIVIDADES_V2_EXECUTION_ENVIRONMENT_ = 'PROD';
assert.throws(
  () => context.atividadesV2_runExportacaoAgendaFirestoreParaSheetsDev(),
  /nao pode operar em PROD/
);
assert.equal(exportCalls, 0, 'PROD nao chama a exportacao');

context.ATIVIDADES_V2_EXECUTION_ENVIRONMENT_ = '';
canonicalMode = 'LEGACY_READ_ONLY';
assert.throws(
  () => context.atividadesV2_runExportacaoAgendaFirestoreParaSheetsDev(),
  /FIRESTORE_CANONICAL_NAO_ATIVADO/
);
assert.equal(exportCalls, 0, 'fonte nao canonica nao chama a exportacao');

canonicalMode = 'FIRESTORE_CANONICAL';
context.ATIVIDADES_V2_EXECUTION_ENVIRONMENT_ = '';
const result = context.atividadesV2_runExportacaoAgendaFirestoreParaSheetsDev();
assert.equal(result, expectedResult, 'runner retorna integralmente o resultado existente');
assert.equal(exportCalls, 1, 'somente uma chamada a exportacao existente');
assert.deepEqual(receivedOptions, {
  ambiente: 'DEV',
  dryRun: false,
  confirmacao: 'AUTORIZO_EXPORT_FIRESTORE_DEV_PARA_SHEETS'
});

console.log('firestore_export_runner.test.cjs: OK');
