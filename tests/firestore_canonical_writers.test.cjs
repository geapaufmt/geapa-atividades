const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

const create = read('37_atividades_v2_portal_gestao.gs');
assert.match(create, /atividadesV2_canonicalAgendaCreateDev_\(creation\.row/);
assert.match(create, /atividadesV2_canonicalAgendaListAll_\(ATIVIDADES_V2_CANONICAL_COLLECTION, 'DEV'\)/);

const modelCreate = read('39_atividades_v2_criacao_modelos.gs');
assert.match(modelCreate, /atividadesV2_canonicalAgendaCreateDev_\(creation\.row/);
assert.match(modelCreate, /ESCRITA_FIRESTORE_CANONICA_E_EXTENSOES_LEGADAS/);

const admin = read('40_atividades_v2_portal_admin_atividades.gs');
assert.match(admin, /atividadesV2_adminReadActivitiesForList_/);
assert.match(admin, /atividadesV2_adminFindActivityCanonicalFirst_/);
assert.equal((admin.match(/atividadesV2_canonicalAgendaUpdateDev_/g) || []).length >= 2, true);

const shared = read('33_atividades_v2_materiais.gs');
assert.match(shared, /canonicalUpdates/);
assert.match(shared, /legacyUpdates/);
assert.match(shared, /atividadesV2_canonicalAgendaUpdateDev_/);

for (const [file, pattern] of [
  ['18_apresentacoes_integracao.gs', /STATUS_OPERACIONAL:\s*mappedStatus/],
  ['21_atividades_gerais.gs', /ATIVIDADES_GERAIS_AUTO_REALIZADA/],
  ['36_atividades_v2_ciclo_operacional.gs', /ATIVIDADES_V2_CICLO_OPERACIONAL/],
  ['17_triggers.gs', /EDICAO_LEGADA_CAMPO_CANONICO_IGNORADA/],
  ['26_atividades_v2_setup.gs', /atividadesV2_canonicalAgendaAssertLegacySheetWriteAllowed_\(\)/],
  ['30_pessoas_v2.gs', /atividadesV2_canonicalAgendaAssertLegacySheetFieldsWriteAllowed_\(sheet, pessoaUpdate\)/],
  ['08_config_heranca.gs', /atividadesV2_canonicalAgendaAssertLegacySheetFieldsWriteAllowed_\(sheet, rule/],
  ['12_activity_ids.gs', /ID_ATIVIDADE:\s*nextId/],
  ['13_carga_horaria.gs', /CARGA_HORARIA:\s*cargaHoraria/]
]) {
  assert.match(read(file), pattern, `${file} precisa preservar o gate canonico`);
}

console.log('firestore_canonical_writers.test.cjs: OK');
