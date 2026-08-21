'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const opened = [];
let currentEnvironmentCalls = 0;
const sandbox = {
  console,
  Object,
  Array,
  String,
  Number,
  Date,
  Math,
  JSON,
  Error,
  Logger: { log() {} },
  atividades_assertCoreLibrary_() {},
  GEAPA_CORE: {
    coreGetCurrentEnv() {
      currentEnvironmentCalls += 1;
      return 'PROD';
    },
    coreGetDomainSpreadsheet(_domain, options) {
      opened.push(options.ambiente);
      return { ambiente: options.ambiente };
    }
  }
};

vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(root, '26_atividades_v2_setup.gs'), 'utf8'),
  sandbox,
  { filename: '26_atividades_v2_setup.gs' }
);

sandbox.ATIVIDADES_V2_EXECUTION_ENVIRONMENT_ = '';
assert.throws(
  () => sandbox.atividadesV2_getDatabaseSpreadsheet_(),
  /AMBIENTE_ATIVIDADES_V2_OBRIGATORIO/,
  'acesso sem ambiente deve falhar antes de consultar o default do Core'
);
assert.equal(currentEnvironmentCalls, 0);
assert.deepEqual(opened, []);

assert.throws(
  () => sandbox.atividadesV2_getDatabaseSpreadsheet_({ ambiente: 'HOMOLOG' }),
  /AMBIENTE_ATIVIDADES_V2_INVALIDO/,
  'valor diferente de DEV ou PROD deve falhar'
);
assert.deepEqual(opened, []);

const dev = sandbox.atividadesV2_getDatabaseSpreadsheetDev_();
assert.equal(dev.ambiente, 'DEV');
assert.equal(sandbox.ATIVIDADES_V2_EXECUTION_ENVIRONMENT_, 'DEV');

sandbox.ATIVIDADES_V2_EXECUTION_ENVIRONMENT_ = '';
sandbox.ATIVIDADES_V2_DATABASE_SPREADSHEET_CACHE_ = {};
const prod = sandbox.atividadesV2_getDatabaseSpreadsheet_({ ambiente: 'PROD' });
assert.equal(prod.ambiente, 'PROD');
assert.equal(sandbox.ATIVIDADES_V2_EXECUTION_ENVIRONMENT_, 'PROD');
assert.deepEqual(opened, ['DEV', 'PROD']);

const source = fs.readFileSync(path.join(root, '26_atividades_v2_setup.gs'), 'utf8');
const resolver = source.slice(source.indexOf('function atividadesV2_resolveEnvironment_'), source.indexOf('function atividadesV2_getDatabaseSpreadsheet_'));
assert.equal(resolver.includes('coreGetCurrentEnv'), false);

sandbox.atividades_runWithOperationalGuard_ = function(_operation, _context, callback) {
  return callback();
};
sandbox.atividadesV2_diagnosticarMailHubIntegracao_ = function() {
  return { modo: sandbox.atividadesV2_resolveEnvironment_({}) };
};
sandbox.atividadesV2_diagnosticarMailHubEventosPortalDev_ = sandbox.atividadesV2_diagnosticarMailHubIntegracao_;
sandbox.atividadesV2_diagnosticarDestinatariosAdministrativosV2Dev_ = sandbox.atividadesV2_diagnosticarMailHubIntegracao_;
sandbox.atividadesV2_limparCacheDestinatariosMailHubDev_ = sandbox.atividadesV2_diagnosticarMailHubIntegracao_;
vm.runInContext(
  fs.readFileSync(path.join(root, '00_module_public_api.gs'), 'utf8'),
  sandbox,
  { filename: '00_module_public_api.gs' }
);

sandbox.ATIVIDADES_V2_EXECUTION_ENVIRONMENT_ = '';
assert.throws(
  () => sandbox.atividadesV2_diagnosticarMailHubIntegracao(),
  /AMBIENTE_ATIVIDADES_V2_OBRIGATORIO/,
  'diagnostico generico deve exigir ambiente explicito'
);
assert.equal(
  sandbox.atividadesV2_diagnosticarMailHubIntegracao({ ambiente: 'PROD' }).modo,
  'PROD',
  'diagnostico generico deve aceitar PROD somente quando explicito'
);

[
  'atividadesV2_diagnosticarMailHubEventosPortalDev',
  'atividadesV2_diagnosticarDestinatariosAdministrativosV2Dev',
  'atividadesV2_limparCacheDestinatariosMailHubDev'
].forEach((entrypoint) => {
  sandbox.ATIVIDADES_V2_EXECUTION_ENVIRONMENT_ = 'PROD';
  assert.equal(
    sandbox[entrypoint]({ ambiente: 'PROD' }).modo,
    'DEV',
    entrypoint + ' deve forcar DEV mesmo quando o chamador tentar informar PROD'
  );
});

console.log(JSON.stringify({
  ok: true,
  semFallbackCore: true,
  devExplicito: true,
  prodSomenteExplicito: true,
  entrypointsPublicos: true
}));
