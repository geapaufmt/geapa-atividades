/**
 * Piloto Firestore canonico: cadastro e agenda de Atividades no ambiente DEV.
 *
 * Fora deste contrato: presencas, justificativas, apresentacoes, convites,
 * arquivos e materiais. Sheets recebe somente exportacao derivada e nunca e
 * escrito junto com o Firestore pela mesma operacao canonica.
 */

var ATIVIDADES_V2_CANONICAL_COLLECTION = 'activities';
var ATIVIDADES_V2_CANONICAL_PRIVATE_COLLECTION = 'activityPrivate';
var ATIVIDADES_V2_CANONICAL_SCHEMA_VERSION = 'activity-canonical-v1';
var ATIVIDADES_V2_CANONICAL_PRIVATE_SCHEMA_VERSION = 'activity-private-v1';
var ATIVIDADES_V2_CANONICAL_MODE_PROPERTY = 'ATIVIDADES_V2_AGENDA_CANONICAL_MODE';
var ATIVIDADES_V2_CANONICAL_REMOTE_WRITE_PROPERTY = 'ATIVIDADES_V2_FIRESTORE_DEV_REMOTE_WRITES_AUTHORIZED';
var ATIVIDADES_V2_CANONICAL_ROLLBACK_PROPERTY = 'ATIVIDADES_V2_FIRESTORE_DEV_ROLLBACK_AUTHORIZED';
var ATIVIDADES_V2_CANONICAL_CRUD_WRITE_PROPERTY = 'ATIVIDADES_V2_FIRESTORE_DEV_CANONICAL_WRITES_AUTHORIZED';
var ATIVIDADES_V2_CANONICAL_EXPORT_WRITE_PROPERTY = 'ATIVIDADES_V2_FIRESTORE_DEV_EXPORT_AUTHORIZED';
var ATIVIDADES_V2_CANONICAL_REMOTE_CONFIRMATION = 'AUTORIZO_WRITE_FIRESTORE_DEV_ATIVIDADES_AGENDA';
var ATIVIDADES_V2_CANONICAL_ROLLBACK_CONFIRMATION = 'AUTORIZO_ROLLBACK_FIRESTORE_DEV_ATIVIDADES_AGENDA';
var ATIVIDADES_V2_CANONICAL_CRUD_CONFIRMATION = 'AUTORIZO_WRITE_FIRESTORE_DEV_ATIVIDADES_AGENDA_CRUD';
var ATIVIDADES_V2_CANONICAL_EXPORT_CONFIRMATION = 'AUTORIZO_EXPORT_FIRESTORE_DEV_PARA_SHEETS';
var ATIVIDADES_V2_CANONICAL_EXPORT_SHEET = 'EXPORT_ATIVIDADES_FIRESTORE';
var ATIVIDADES_V2_CANONICAL_EXPORT_METADATA_PROPERTY = 'ATIVIDADES_V2_FIRESTORE_DEV_LAST_EXPORT_METADATA';
var ATIVIDADES_V2_CANONICAL_MIGRATED_HEADERS = Object.freeze([
  'ID_ATIVIDADE', 'CICLO', 'ANO', 'SEMESTRE', 'NUMERO_SEQUENCIAL_NO_CICLO',
  'CLASSIFICACAO_REUNIAO', 'TIPO_ATIVIDADE', 'SUBTIPO_ATIVIDADE', 'CLASSIFICACAO_ACESSO',
  'TITULO', 'TITULO_PUBLICO', 'DESCRICAO', 'DESCRICAO_PUBLICA',
  'EIXO_TEMATICO_PRINCIPAL', 'EIXO_TEMATICO_SECUNDARIO',
  'ID_PESSOA_PRINCIPAL', 'NOME_PESSOA_PRINCIPAL_PUBLICO', 'RGA_PESSOA_PRINCIPAL',
  'EMAIL_PESSOA_PRINCIPAL', 'TIPO_PESSOA_PRINCIPAL', 'PAPEL_PESSOA_PRINCIPAL',
  'INSTITUICAO_PESSOA_PRINCIPAL', 'DATA_ATIVIDADE', 'HORARIO_INICIO', 'HORARIO_FIM',
  'LOCAL', 'FORMATO', 'RESPONSAVEL_INTERNO', 'RESPONSAVEL_EMAIL', 'PUBLICO_ALVO',
  'OBRIGATORIA', 'CARGA_HORARIA', 'STATUS_OPERACIONAL', 'STATUS_PUBLICACAO_PORTAL',
  'VISIBILIDADE_PORTAL', 'DATA_LIBERACAO_PORTAL', 'DATA_REALIZACAO', 'ORIGEM_FLUXO',
  'CRIADO_POR', 'CRIADO_EM', 'ATUALIZADO_POR', 'ATUALIZADO_EM', 'BLOQUEADO_PARA_EDICAO',
  'OBSERVACOES', 'ATIVO', 'ID_CONFIG_MODELO', 'NOME_MODELO_PORTAL_SNAPSHOT',
  'VERSAO_CONFIG_MODELO', 'TEM_EXCECAO_CONFIG', 'STATUS_EXCECAO_CONFIG',
  'JUSTIFICATIVA_EXCECAO_CONFIG'
]);
var ATIVIDADES_V2_CANONICAL_PUBLIC_HEADERS = Object.freeze([
  'ID_ATIVIDADE', 'CICLO', 'ANO', 'SEMESTRE', 'NUMERO_SEQUENCIAL_NO_CICLO',
  'CLASSIFICACAO_REUNIAO', 'TIPO_ATIVIDADE', 'SUBTIPO_ATIVIDADE', 'CLASSIFICACAO_ACESSO',
  'TITULO_PUBLICO', 'DESCRICAO_PUBLICA', 'EIXO_TEMATICO_PRINCIPAL', 'EIXO_TEMATICO_SECUNDARIO',
  'NOME_PESSOA_PRINCIPAL_PUBLICO', 'TIPO_PESSOA_PRINCIPAL', 'PAPEL_PESSOA_PRINCIPAL',
  'INSTITUICAO_PESSOA_PRINCIPAL', 'DATA_ATIVIDADE', 'HORARIO_INICIO', 'HORARIO_FIM',
  'LOCAL', 'FORMATO', 'PUBLICO_ALVO', 'OBRIGATORIA', 'CARGA_HORARIA', 'STATUS_OPERACIONAL',
  'STATUS_PUBLICACAO_PORTAL', 'VISIBILIDADE_PORTAL', 'DATA_LIBERACAO_PORTAL',
  'DATA_REALIZACAO', 'ORIGEM_FLUXO', 'ATIVO', 'ID_CONFIG_MODELO',
  'NOME_MODELO_PORTAL_SNAPSHOT', 'VERSAO_CONFIG_MODELO'
]);
var ATIVIDADES_V2_CANONICAL_PRIVATE_HEADERS = Object.freeze([
  'TITULO', 'DESCRICAO', 'ID_PESSOA_PRINCIPAL', 'RGA_PESSOA_PRINCIPAL',
  'EMAIL_PESSOA_PRINCIPAL', 'RESPONSAVEL_INTERNO', 'RESPONSAVEL_EMAIL',
  'CRIADO_POR', 'CRIADO_EM', 'ATUALIZADO_POR', 'ATUALIZADO_EM',
  'BLOQUEADO_PARA_EDICAO', 'OBSERVACOES', 'TEM_EXCECAO_CONFIG',
  'STATUS_EXCECAO_CONFIG', 'JUSTIFICATIVA_EXCECAO_CONFIG'
]);

function atividadesV2_canonicalAgendaMode_() {
  var mode = String(PropertiesService.getScriptProperties().getProperty(
    ATIVIDADES_V2_CANONICAL_MODE_PROPERTY
  ) || 'LEGACY_READ_ONLY').trim().toUpperCase();
  if (['LEGACY_READ_ONLY', 'FIRESTORE_CANONICAL'].indexOf(mode) < 0) {
    throw new Error('ATIVIDADES_V2_AGENDA_CANONICAL_MODE invalido.');
  }
  return mode;
}

function atividadesV2_canonicalAgendaIsActiveDev_() {
  return atividadesV2_resolveEnvironment_({}) === 'DEV' &&
    atividadesV2_canonicalAgendaMode_() === 'FIRESTORE_CANONICAL';
}

/** Impede dois destinos canonicos quando o corte DEV for ativado. */
function atividadesV2_canonicalAgendaAssertLegacySheetWriteAllowed_() {
  var environment = atividadesV2_resolveEnvironment_({});
  if (environment === 'DEV') {
    throw new Error('ESCRITA_LEGADA_BLOQUEADA: cadastro/agenda DEV nao pode gravar no Sheets.');
  }
  return true;
}

function atividadesV2_canonicalAgendaAssertLegacySheetFieldsWriteAllowed_(sheet, updates) {
  if (!sheet || String(sheet.getName && sheet.getName() || '') !== ATIVIDADES_V2_SHEETS.ATIVIDADES) return true;
  var changed = Object.keys(updates || {}).filter(function(header) {
    return ATIVIDADES_V2_CANONICAL_MIGRATED_HEADERS.indexOf(header) >= 0;
  });
  if (changed.length) atividadesV2_canonicalAgendaAssertLegacySheetWriteAllowed_();
  return true;
}

function atividadesV2_canonicalAgendaShouldIgnoreLegacyOnEdit_(event) {
  if (!atividadesV2_canonicalAgendaIsActiveDev_() || !event || !event.range) return false;
  var sheet = event.range.getSheet();
  if (String(sheet && sheet.getName && sheet.getName() || '') !== ATIVIDADES_V2_SHEETS.ATIVIDADES) return false;
  var firstColumn = Number(event.range.getColumn() || 0);
  var totalColumns = Number(event.range.getNumColumns && event.range.getNumColumns() || 1);
  var headers = sheet.getRange(1, firstColumn, 1, totalColumns).getValues()[0].map(function(header) {
    return String(header || '').trim();
  });
  return headers.some(function(header) {
    return ATIVIDADES_V2_CANONICAL_MIGRATED_HEADERS.indexOf(header) >= 0;
  });
}

function atividadesV2_canonicalAgendaRequireCoreMethod_(name) {
  if (typeof GEAPA_CORE === 'undefined' || !GEAPA_CORE || typeof GEAPA_CORE[name] !== 'function') {
    throw new Error('GEAPA_CORE sem ' + name + '. Atualize a biblioteca Core.');
  }
  return GEAPA_CORE[name];
}

function atividadesV2_canonicalAgendaContext_(options) {
  var opts = options || {};
  if (!opts.ambiente && !opts.environment) {
    throw new Error('AMBIENTE_FIRESTORE_OBRIGATORIO: informe DEV explicitamente.');
  }
  var environment = atividadesV2_resolveEnvironment_({
    ambiente: opts.ambiente || opts.environment
  });
  if (environment !== 'DEV') {
    throw new Error('PILOTO_FIRESTORE_SOMENTE_DEV: PROD nao e destino permitido.');
  }
  var getConfig = atividadesV2_canonicalAgendaRequireCoreMethod_('coreFirestoreGetEnvironmentConfig');
  var config = getConfig({ ambiente: environment });
  if (!config || config.environment !== environment || !config.projectId) {
    throw new Error('CONFIG_FIRESTORE_DEV_INVALIDA.');
  }
  return Object.freeze({
    environment: environment,
    projectIdConfigured: true,
    databaseId: String(config.databaseId || '(default)'),
    namespaced: false,
    canonicalCollection: ATIVIDADES_V2_CANONICAL_COLLECTION,
    privateCollection: ATIVIDADES_V2_CANONICAL_PRIVATE_COLLECTION
  });
}

/** Normaliza entrypoints DEV sem aceitar que um chamador informe PROD. */
function atividadesV2_canonicalAgendaDevOptions_(options) {
  var opts = Object.assign({}, options || {});
  ['ambiente', 'environment'].forEach(function(key) {
    if (!Object.prototype.hasOwnProperty.call(opts, key) || !String(opts[key] || '').trim()) return;
    if (String(opts[key]).trim().toUpperCase() !== 'DEV') {
      throw new Error('PILOTO_FIRESTORE_SOMENTE_DEV: PROD nao e destino permitido.');
    }
  });
  opts.ambiente = 'DEV';
  opts.environment = 'DEV';
  return opts;
}

function atividadesV2_canonicalAgendaAssertRemoteWriteAuthorized_(options, confirmation) {
  var opts = options || {};
  atividadesV2_canonicalAgendaContext_(opts);
  var authorized = atividades_normalizeTextUpper_(
    PropertiesService.getScriptProperties().getProperty(ATIVIDADES_V2_CANONICAL_REMOTE_WRITE_PROPERTY)
  ) === 'SIM';
  if (!authorized || String(opts.confirmacao || '') !== confirmation) {
    throw new Error('WRITE_FIRESTORE_DEV_NAO_AUTORIZADO: habilitacao e confirmacao explicitas sao obrigatorias.');
  }
}

function atividadesV2_canonicalAgendaAssertRollbackAuthorized_(options) {
  var opts = options || {};
  atividadesV2_canonicalAgendaContext_(opts);
  var authorized = atividades_normalizeTextUpper_(
    PropertiesService.getScriptProperties().getProperty(ATIVIDADES_V2_CANONICAL_ROLLBACK_PROPERTY)
  ) === 'SIM';
  if (!authorized || String(opts.confirmacao || '') !== ATIVIDADES_V2_CANONICAL_ROLLBACK_CONFIRMATION) {
    throw new Error('ROLLBACK_FIRESTORE_DEV_NAO_AUTORIZADO: habilitacao e confirmacao explicitas sao obrigatorias.');
  }
}

function atividadesV2_canonicalAgendaAssertExportAuthorized_(options) {
  var opts = atividadesV2_canonicalAgendaDevOptions_(options);
  atividadesV2_canonicalAgendaContext_(opts);
  var authorized = atividades_normalizeTextUpper_(
    PropertiesService.getScriptProperties().getProperty(ATIVIDADES_V2_CANONICAL_EXPORT_WRITE_PROPERTY)
  ) === 'SIM';
  if (!authorized || String(opts.confirmacao || '') !== ATIVIDADES_V2_CANONICAL_EXPORT_CONFIRMATION) {
    throw new Error('EXPORT_FIRESTORE_DEV_NAO_AUTORIZADO.');
  }
  return opts;
}

function atividadesV2_canonicalAgendaAssertCrudWriteAuthorized_(options) {
  var opts = atividadesV2_canonicalAgendaDevOptions_(options);
  atividadesV2_canonicalAgendaContext_(opts);
  if (atividadesV2_canonicalAgendaMode_() !== 'FIRESTORE_CANONICAL') {
    throw new Error('FIRESTORE_CANONICAL_NAO_ATIVADO.');
  }
  var authorized = atividades_normalizeTextUpper_(
    PropertiesService.getScriptProperties().getProperty(ATIVIDADES_V2_CANONICAL_CRUD_WRITE_PROPERTY)
  ) === 'SIM';
  if (!authorized || String(opts.confirmacao || '') !== ATIVIDADES_V2_CANONICAL_CRUD_CONFIRMATION) {
    throw new Error('CRUD_FIRESTORE_DEV_NAO_AUTORIZADO: habilitacao operacional e confirmacao interna sao obrigatorias.');
  }
  return opts;
}

function atividadesV2_canonicalAgendaAssertCrudMode_(options) {
  var opts = atividadesV2_canonicalAgendaDevOptions_(options);
  atividadesV2_canonicalAgendaContext_(opts);
  if (atividadesV2_canonicalAgendaMode_() !== 'FIRESTORE_CANONICAL') {
    throw new Error('FIRESTORE_CANONICAL_NAO_ATIVADO.');
  }
  return opts;
}

/** Confere o guard operacional sem registrar status ou escrever em Sheets. */
function atividadesV2_canonicalAgendaAssertRollbackOperationalAllowed_() {
  var assertAllowed = atividadesV2_canonicalAgendaRequireCoreMethod_('coreAssertModuleExecutionAllowed');
  var decision = assertAllowed(
    ATIVIDADES_CFG.MODULE_CODE,
    'ATUALIZACAO_PORTAL_V2',
    'SYNC',
    { executionType: 'MANUAL' }
  );
  var mode = String(decision && decision.config && decision.config.mode || '').trim().toUpperCase();
  if (mode === 'DRY_RUN') throw new Error('ROLLBACK_FIRESTORE_DEV_BLOQUEADO_POR_DRY_RUN.');
  return decision;
}

function atividadesV2_canonicalAgendaText_(value, maxLength) {
  var text = String(value == null ? '' : value).trim();
  return maxLength ? text.slice(0, maxLength) : text;
}

function atividadesV2_canonicalAgendaNumber_(value) {
  var number = Number(value);
  return isFinite(number) ? number : 0;
}

function atividadesV2_canonicalAgendaActivityId_(value) {
  var id = atividadesV2_canonicalAgendaText_(value, 80).toUpperCase();
  var valid = typeof atividadesV2_isCanonicalActivityId_ === 'function'
    ? atividadesV2_isCanonicalActivityId_(id)
    : /^ATV-\d{4}-[12]-\d{4}$/.test(id);
  if (!valid) throw new Error('ID_ATIVIDADE canonico invalido: ' + id);
  return id;
}

function atividadesV2_canonicalAgendaBuildDocuments_(row, now) {
  var source = row || {};
  var id = atividadesV2_canonicalAgendaActivityId_(source.ID_ATIVIDADE || source.idAtividade);
  var updatedAt = now || new Date();
  var publicDocument = {
    idAtividade: id,
    ciclo: atividadesV2_canonicalAgendaText_(source.CICLO, 80),
    ano: atividadesV2_canonicalAgendaNumber_(source.ANO),
    semestre: atividadesV2_canonicalAgendaNumber_(source.SEMESTRE),
    rotuloSemestre: atividadesV2_canonicalAgendaNumber_(source.ANO) + '/' + atividadesV2_canonicalAgendaNumber_(source.SEMESTRE),
    numeroSequencialNoCiclo: atividadesV2_canonicalAgendaNumber_(source.NUMERO_SEQUENCIAL_NO_CICLO),
    classificacaoReuniao: atividadesV2_canonicalAgendaText_(source.CLASSIFICACAO_REUNIAO, 80),
    tipoAtividade: atividadesV2_canonicalAgendaText_(source.TIPO_ATIVIDADE, 100),
    subtipoAtividade: atividadesV2_canonicalAgendaText_(source.SUBTIPO_ATIVIDADE, 100),
    classificacaoAcesso: atividadesV2_canonicalAgendaText_(source.CLASSIFICACAO_ACESSO, 80),
    titulo: atividadesV2_canonicalAgendaText_(source.TITULO_PUBLICO || source.TITULO, 240),
    tituloPublico: atividadesV2_canonicalAgendaText_(source.TITULO_PUBLICO || source.TITULO, 240),
    descricaoPublica: atividadesV2_canonicalAgendaText_(source.DESCRICAO_PUBLICA, 2000),
    eixoTematicoPrincipal: atividadesV2_canonicalAgendaText_(source.EIXO_TEMATICO_PRINCIPAL, 180),
    eixoTematicoSecundario: atividadesV2_canonicalAgendaText_(source.EIXO_TEMATICO_SECUNDARIO, 180),
    nomePessoaPrincipalPublico: atividadesV2_canonicalAgendaText_(source.NOME_PESSOA_PRINCIPAL_PUBLICO, 180),
    tipoPessoaPrincipal: atividadesV2_canonicalAgendaText_(source.TIPO_PESSOA_PRINCIPAL, 80),
    papelPessoaPrincipal: atividadesV2_canonicalAgendaText_(source.PAPEL_PESSOA_PRINCIPAL, 80),
    instituicaoPessoaPrincipal: atividadesV2_canonicalAgendaText_(source.INSTITUICAO_PESSOA_PRINCIPAL, 180),
    dataAtividade: atividadesV2_firestoreDate_(source.DATA_ATIVIDADE),
    horarioInicio: atividadesV2_firestoreTime_(source.HORARIO_INICIO),
    horarioFim: atividadesV2_firestoreTime_(source.HORARIO_FIM),
    local: atividadesV2_canonicalAgendaText_(source.LOCAL, 180),
    formato: atividadesV2_canonicalAgendaText_(source.FORMATO, 80),
    publicoAlvo: atividadesV2_canonicalAgendaText_(source.PUBLICO_ALVO, 180),
    obrigatoria: atividadesV2_firestoreBoolean_(source.OBRIGATORIA),
    cargaHoraria: atividadesV2_canonicalAgendaNumber_(source.CARGA_HORARIA),
    statusOperacional: atividadesV2_canonicalAgendaText_(source.STATUS_OPERACIONAL, 80),
    statusPublicacaoPortal: atividadesV2_canonicalAgendaText_(source.STATUS_PUBLICACAO_PORTAL, 80),
    visibilidadePortal: atividadesV2_canonicalAgendaText_(source.VISIBILIDADE_PORTAL, 80),
    dataLiberacaoPortal: atividadesV2_firestoreIso_(source.DATA_LIBERACAO_PORTAL, ''),
    dataRealizacao: atividadesV2_firestoreIso_(source.DATA_REALIZACAO, ''),
    ativo: !source.ATIVO || atividadesV2_firestoreBoolean_(source.ATIVO),
    origemFluxo: atividadesV2_canonicalAgendaText_(source.ORIGEM_FLUXO, 120),
    idConfigModelo: atividadesV2_canonicalAgendaText_(source.ID_CONFIG_MODELO, 100),
    nomeModeloPortalSnapshot: atividadesV2_canonicalAgendaText_(source.NOME_MODELO_PORTAL_SNAPSHOT, 240),
    versaoConfigModelo: atividadesV2_canonicalAgendaText_(source.VERSAO_CONFIG_MODELO, 80),
    canonicalSource: 'FIRESTORE',
    sourceSystem: 'geapa-atividades',
    sourceUpdatedAt: atividadesV2_firestoreIso_(source.ATUALIZADO_EM || source.CRIADO_EM, ''),
    canonicalUpdatedAt: updatedAt.toISOString(),
    schemaVersion: ATIVIDADES_V2_CANONICAL_SCHEMA_VERSION
  };
  var creationRequestId = atividadesV2_canonicalAgendaText_(source.CANONICAL_REQUEST_ID, 120);
  if (creationRequestId) publicDocument.creationRequestId = creationRequestId;
  publicDocument.sourceHash = atividadesV2_firestoreBuildSourceHash_(publicDocument, ['canonicalUpdatedAt', 'sourceHash']);

  var privateDocument = {
    idAtividade: id,
    tituloInterno: atividadesV2_canonicalAgendaText_(source.TITULO, 240),
    descricaoInterna: atividadesV2_canonicalAgendaText_(source.DESCRICAO, 4000),
    idPessoaPrincipal: atividadesV2_canonicalAgendaText_(source.ID_PESSOA_PRINCIPAL, 100),
    rgaPessoaPrincipal: atividadesV2_canonicalAgendaText_(source.RGA_PESSOA_PRINCIPAL, 80),
    emailPessoaPrincipal: atividadesV2_canonicalAgendaText_(source.EMAIL_PESSOA_PRINCIPAL, 254).toLowerCase(),
    responsavelInterno: atividadesV2_canonicalAgendaText_(source.RESPONSAVEL_INTERNO, 180),
    responsavelEmail: atividadesV2_canonicalAgendaText_(source.RESPONSAVEL_EMAIL, 254).toLowerCase(),
    criadoPor: atividadesV2_canonicalAgendaText_(source.CRIADO_POR, 180),
    criadoEm: atividadesV2_firestoreIso_(source.CRIADO_EM, ''),
    atualizadoPor: atividadesV2_canonicalAgendaText_(source.ATUALIZADO_POR, 180),
    atualizadoEm: atividadesV2_firestoreIso_(source.ATUALIZADO_EM, ''),
    bloqueadoParaEdicao: atividadesV2_firestoreBoolean_(source.BLOQUEADO_PARA_EDICAO),
    observacoesInternas: atividadesV2_canonicalAgendaText_(source.OBSERVACOES, 4000),
    temExcecaoConfig: atividadesV2_firestoreBoolean_(source.TEM_EXCECAO_CONFIG),
    statusExcecaoConfig: atividadesV2_canonicalAgendaText_(source.STATUS_EXCECAO_CONFIG, 80),
    justificativaExcecaoConfig: atividadesV2_canonicalAgendaText_(source.JUSTIFICATIVA_EXCECAO_CONFIG, 2000),
    canonicalSource: 'FIRESTORE',
    sourceSystem: 'geapa-atividades',
    canonicalUpdatedAt: updatedAt.toISOString(),
    schemaVersion: ATIVIDADES_V2_CANONICAL_PRIVATE_SCHEMA_VERSION
  };
  var technicalTestRunId = atividadesV2_canonicalAgendaText_(source.TEST_RUN_ID, 120);
  var technicalTestRunner = atividadesV2_canonicalAgendaText_(source.CREATED_BY_TEST_RUNNER, 120);
  var isTechnicalTest = source.IS_TECHNICAL_TEST === true ||
    atividades_normalizeTextUpper_(source.IS_TECHNICAL_TEST) === 'SIM';
  if (isTechnicalTest || technicalTestRunId || technicalTestRunner) {
    privateDocument.isTechnicalTest = isTechnicalTest;
    privateDocument.testRunId = technicalTestRunId;
    privateDocument.createdByTestRunner = technicalTestRunner;
  }
  privateDocument.sourceHash = atividadesV2_firestoreBuildSourceHash_(privateDocument, ['canonicalUpdatedAt', 'sourceHash']);

  return Object.freeze({
    idAtividade: id,
    publicDocument: Object.freeze(publicDocument),
    privateDocument: Object.freeze(privateDocument)
  });
}

function atividadesV2_canonicalAgendaWriteItems_(documents) {
  return Object.freeze([
    Object.freeze({
      path: ATIVIDADES_V2_CANONICAL_COLLECTION + '/' + documents.idAtividade,
      data: documents.publicDocument
    }),
    Object.freeze({
      path: ATIVIDADES_V2_CANONICAL_PRIVATE_COLLECTION + '/' + documents.idAtividade,
      data: documents.privateDocument
    })
  ]);
}

function atividadesV2_canonicalAgendaPlanInitialImportDev_(options) {
  var opts = atividadesV2_canonicalAgendaDevOptions_(options);
  var context = atividadesV2_canonicalAgendaContext_(opts);
  var spreadsheet = atividadesV2_getDatabaseSpreadsheet_({ ambiente: context.environment });
  var sheet = atividadesV2_getTargetSheet_(spreadsheet, ATIVIDADES_V2_SHEETS.ATIVIDADES);
  var rows = atividadesV2_readSheetObjects_(sheet);
  var items = [];
  var errors = [];
  rows.forEach(function(row) {
    if (!String(row.ID_ATIVIDADE || '').trim()) return;
    try {
      items = items.concat(atividadesV2_canonicalAgendaWriteItems_(
        atividadesV2_canonicalAgendaBuildDocuments_(row, new Date())
      ));
    } catch (err) {
      errors.push({
        row: Number(row._rowNumber || 0),
        code: 'ATIVIDADE_INVALIDA',
        message: String(err && err.message || err || '').slice(0, 240)
      });
    }
  });
  return Object.freeze({
    ok: errors.length === 0,
    dryRun: true,
    environment: context.environment,
    canonicalSource: 'FIRESTORE',
    totalRowsRead: rows.length,
    totalActivities: Math.floor(items.length / 2),
    totalDocuments: items.length,
    collections: Object.freeze([
      ATIVIDADES_V2_CANONICAL_COLLECTION,
      ATIVIDADES_V2_CANONICAL_PRIVATE_COLLECTION
    ]),
    items: Object.freeze(items),
    errors: Object.freeze(errors),
    excludedDomains: Object.freeze(['presencas', 'justificativas', 'apresentacoes', 'convites', 'arquivos', 'materiais'])
  });
}

function atividadesV2_canonicalAgendaPlanSummary_(plan) {
  var source = plan || {};
  return Object.freeze({
    ok: source.ok === true,
    dryRun: true,
    environment: String(source.environment || ''),
    canonicalSource: 'FIRESTORE',
    totalRowsRead: Number(source.totalRowsRead || 0),
    totalActivities: Number(source.totalActivities || 0),
    totalDocuments: Number(source.totalDocuments || 0),
    collections: source.collections || Object.freeze([]),
    errors: source.errors || Object.freeze([]),
    excludedDomains: source.excludedDomains || Object.freeze([]),
    samplePaths: Object.freeze((source.items || []).slice(0, 10).map(function(item) {
      return String(item && item.path || '');
    }))
  });
}

function atividadesV2_canonicalAgendaDiffImportItems_(items, existingByPath) {
  var source = Array.isArray(items) ? items : [];
  var existing = existingByPath || {};
  var conflicts = [];
  var pending = [];
  var skippedIdentical = 0;
  source.forEach(function(item) {
    var path = String(item && item.path || '');
    var current = existing[path];
    if (!current) {
      pending.push(item);
      return;
    }
    if (String(current.sourceHash || '') === String(item.data && item.data.sourceHash || '')) {
      skippedIdentical++;
      return;
    }
    conflicts.push(path);
  });
  return Object.freeze({
    pending: Object.freeze(pending),
    conflicts: Object.freeze(conflicts),
    skippedIdentical: skippedIdentical
  });
}

function atividadesV2_canonicalAgendaImportInitialDev_(options) {
  var opts = atividadesV2_canonicalAgendaDevOptions_(options);
  if (opts.dryRun !== false) {
    return atividadesV2_canonicalAgendaPlanSummary_(atividadesV2_canonicalAgendaPlanInitialImportDev_(opts));
  }
  if (atividadesV2_canonicalAgendaMode_() !== 'LEGACY_READ_ONLY') {
    throw new Error('IMPORTACAO_INICIAL_BLOQUEADA_APOS_CORTE_CANONICO.');
  }
  atividadesV2_canonicalAgendaAssertRemoteWriteAuthorized_(opts, ATIVIDADES_V2_CANONICAL_REMOTE_CONFIRMATION);
  var plan = atividadesV2_canonicalAgendaPlanInitialImportDev_(opts);
  if (!plan.ok) return atividadesV2_canonicalAgendaPlanSummary_(plan);
  var batchSet = atividadesV2_canonicalAgendaRequireCoreMethod_('coreFirestoreEnvironmentBatchSetDocuments');
  var existingByPath = {};
  [ATIVIDADES_V2_CANONICAL_COLLECTION, ATIVIDADES_V2_CANONICAL_PRIVATE_COLLECTION].forEach(function(collection) {
    atividadesV2_canonicalAgendaListAll_(collection, 'DEV').forEach(function(item) {
      existingByPath[collection + '/' + String(item.id || '')] = item.data || {};
    });
  });
  var diff = atividadesV2_canonicalAgendaDiffImportItems_(plan.items, existingByPath);
  if (diff.conflicts.length) {
    throw new Error('IMPORTACAO_CONFLITO_FIRESTORE: ' + diff.conflicts.length + ' documento(s) existentes divergem do legado.');
  }
  var pendingItems = diff.pending;
  var written = 0;
  var batches = [];
  atividadesV2_firestoreChunk_(pendingItems, 500).forEach(function(chunk) {
    var result = batchSet(chunk, { ambiente: 'DEV', dryRun: false, merge: false });
    if (!result || result.ok !== true) {
      throw new Error('IMPORT_FIRESTORE_DEV_FALHOU: ' + String(result && result.code || 'SEM_CODIGO'));
    }
    written += Number(result.written || 0);
    batches.push({ requested: chunk.length, written: Number(result.written || 0), code: result.code });
  });
  return Object.freeze({
    ok: true,
    dryRun: false,
    environment: 'DEV',
    totalActivities: plan.totalActivities,
    totalDocuments: plan.totalDocuments,
    totalSkippedIdentical: diff.skippedIdentical,
    totalWritten: written,
    batches: Object.freeze(batches),
    sheetsWritten: false,
    canonicalSource: 'FIRESTORE'
  });
}

function atividadesV2_canonicalAgendaUpsertDev_(row, options) {
  var opts = atividadesV2_canonicalAgendaDevOptions_(options);
  atividadesV2_canonicalAgendaContext_(opts);
  if (atividadesV2_canonicalAgendaMode_() !== 'FIRESTORE_CANONICAL') {
    throw new Error('FIRESTORE_CANONICAL_NAO_ATIVADO.');
  }
  var documents = atividadesV2_canonicalAgendaBuildDocuments_(row || {}, new Date());
  var items = atividadesV2_canonicalAgendaWriteItems_(documents);
  if (opts.dryRun !== false) {
    return Object.freeze({ ok: true, dryRun: true, written: 0, idAtividade: documents.idAtividade, items: items });
  }
  atividadesV2_canonicalAgendaAssertRemoteWriteAuthorized_(opts, ATIVIDADES_V2_CANONICAL_REMOTE_CONFIRMATION);
  var batchSet = atividadesV2_canonicalAgendaRequireCoreMethod_('coreFirestoreEnvironmentBatchSetDocuments');
  var result = batchSet(items, { ambiente: 'DEV', dryRun: false, merge: false });
  if (!result || result.ok !== true) throw new Error('UPSERT_FIRESTORE_DEV_FALHOU: ' + String(result && result.code || 'SEM_CODIGO'));
  return Object.freeze({
    ok: true,
    dryRun: false,
    written: Number(result.written || 0),
    idAtividade: documents.idAtividade,
    sheetsWritten: false,
    canonicalSource: 'FIRESTORE'
  });
}

function atividadesV2_canonicalAgendaGetPairDev_(idAtividade, options) {
  var opts = atividadesV2_canonicalAgendaDevOptions_(options);
  atividadesV2_canonicalAgendaContext_(opts);
  var id = atividadesV2_canonicalAgendaActivityId_(idAtividade);
  var getDocument = atividadesV2_canonicalAgendaRequireCoreMethod_('coreFirestoreEnvironmentGetDocument');
  var publicResult = getDocument(ATIVIDADES_V2_CANONICAL_COLLECTION + '/' + id, { ambiente: 'DEV' });
  if (!publicResult || publicResult.ok !== true) {
    throw new Error('FIRESTORE_GET_ATIVIDADE_FALHOU: ' + String(publicResult && publicResult.code || 'SEM_CODIGO'));
  }
  if (publicResult.found !== true) {
    return Object.freeze({
      ok: true,
      found: false,
      environment: 'DEV',
      idAtividade: id,
      readsEstimated: 1,
      canonicalSource: 'FIRESTORE'
    });
  }
  var privateResult = getDocument(ATIVIDADES_V2_CANONICAL_PRIVATE_COLLECTION + '/' + id, { ambiente: 'DEV' });
  if (!privateResult || privateResult.ok !== true) {
    throw new Error('FIRESTORE_GET_ATIVIDADE_PRIVADA_FALHOU: ' + String(privateResult && privateResult.code || 'SEM_CODIGO'));
  }
  if (privateResult.found !== true && opts.requirePrivate !== false) {
    throw new Error('ACTIVITY_PRIVATE_AUSENTE: integridade do par canonico comprometida.');
  }
  return Object.freeze({
    ok: true,
    found: true,
    environment: 'DEV',
    idAtividade: id,
    publicDocument: publicResult.data || Object.freeze({}),
    privateDocument: privateResult.found === true ? privateResult.data || Object.freeze({}) : null,
    readsEstimated: 2,
    canonicalSource: 'FIRESTORE'
  });
}

function atividadesV2_canonicalAgendaMergeDocumentsIntoRow_(publicData, privateData, legacyRow) {
  var merged = Object.assign({}, legacyRow || {});
  var canonical = atividadesV2_canonicalAgendaExportRow_(publicData || {}, privateData || {});
  ATIVIDADES_V2_CANONICAL_PUBLIC_HEADERS.forEach(function(header) {
    merged[header] = canonical[header];
  });
  if (privateData) {
    ATIVIDADES_V2_CANONICAL_PRIVATE_HEADERS.forEach(function(header) {
      merged[header] = canonical[header];
    });
  }
  merged._canonicalSource = 'FIRESTORE';
  merged.CANONICAL_REQUEST_ID = String(publicData && publicData.creationRequestId || '');
  if (privateData && (privateData.isTechnicalTest === true || privateData.testRunId || privateData.createdByTestRunner)) {
    merged.IS_TECHNICAL_TEST = privateData.isTechnicalTest === true;
    merged.TEST_RUN_ID = String(privateData.testRunId || '');
    merged.CREATED_BY_TEST_RUNNER = String(privateData.createdByTestRunner || '');
  }
  merged._publicSourceHash = String(publicData && publicData.sourceHash || '');
  merged._privateSourceHash = String(privateData && privateData.sourceHash || '');
  return merged;
}

function atividadesV2_canonicalAgendaListRowsDev_(options) {
  var opts = atividadesV2_canonicalAgendaDevOptions_(options);
  atividadesV2_canonicalAgendaContext_(opts);
  var documents = atividadesV2_canonicalAgendaListAll_(ATIVIDADES_V2_CANONICAL_COLLECTION, 'DEV');
  return Object.freeze({
    ok: true,
    environment: 'DEV',
    canonicalSource: 'FIRESTORE',
    total: documents.length,
    readsEstimated: documents.length,
    rows: Object.freeze(documents.map(function(item) {
      return Object.freeze(atividadesV2_canonicalAgendaMergeDocumentsIntoRow_(item.data || {}, null, null));
    }))
  });
}

function atividadesV2_canonicalAgendaBatchWritePair_(documents, options) {
  var opts = atividadesV2_canonicalAgendaAssertCrudMode_(options);
  var items = atividadesV2_canonicalAgendaWriteItems_(documents);
  if (opts.dryRun !== false) {
    return Object.freeze({
      ok: true,
      dryRun: true,
      environment: 'DEV',
      written: 0,
      idAtividade: documents.idAtividade,
      items: items,
      sheetsWritten: false
    });
  }
  opts = atividadesV2_canonicalAgendaAssertCrudWriteAuthorized_(opts);
  var batchSet = atividadesV2_canonicalAgendaRequireCoreMethod_('coreFirestoreEnvironmentBatchSetDocuments');
  var result = batchSet(items, { ambiente: 'DEV', dryRun: false, merge: false });
  if (!result || result.ok !== true || Number(result.written || 0) !== 2) {
    throw new Error('CRUD_FIRESTORE_DEV_FALHOU: ' + String(result && result.code || 'SEM_CODIGO'));
  }
  return Object.freeze({
    ok: true,
    dryRun: false,
    environment: 'DEV',
    written: 2,
    idAtividade: documents.idAtividade,
    publicSourceHash: documents.publicDocument.sourceHash,
    privateSourceHash: documents.privateDocument.sourceHash,
    sheetsWritten: false,
    canonicalSource: 'FIRESTORE'
  });
}

function atividadesV2_canonicalAgendaCreateDev_(row, options) {
  var opts = atividadesV2_canonicalAgendaAssertCrudMode_(options);
  var documents = atividadesV2_canonicalAgendaBuildDocuments_(row || {}, new Date());
  var requestId = String(documents.publicDocument.creationRequestId || '').trim();
  if (requestId) {
    var replay = atividadesV2_canonicalAgendaListAll_(ATIVIDADES_V2_CANONICAL_COLLECTION, 'DEV').filter(function(item) {
      return String(item && item.data && item.data.creationRequestId || '') === requestId;
    })[0];
    if (replay) {
      var replayPair = atividadesV2_canonicalAgendaGetPairDev_(replay.id, { ambiente: 'DEV' });
      return Object.freeze({
        ok: true,
        dryRun: opts.dryRun !== false,
        environment: 'DEV',
        written: 0,
        idAtividade: replayPair.idAtividade,
        operation: 'CREATE',
        idempotentReplay: true,
        sheetsWritten: false,
        canonicalSource: 'FIRESTORE',
        row: Object.freeze(atividadesV2_canonicalAgendaMergeDocumentsIntoRow_(
          replayPair.publicDocument,
          replayPair.privateDocument,
          null
        ))
      });
    }
  }
  var existing = atividadesV2_canonicalAgendaGetPairDev_(documents.idAtividade, {
    ambiente: 'DEV',
    requirePrivate: false
  });
  if (existing.found) throw new Error('ATIVIDADE_CANONICA_JA_EXISTE.');
  var getDocument = atividadesV2_canonicalAgendaRequireCoreMethod_('coreFirestoreEnvironmentGetDocument');
  var orphanPrivate = getDocument(
    ATIVIDADES_V2_CANONICAL_PRIVATE_COLLECTION + '/' + documents.idAtividade,
    { ambiente: 'DEV' }
  );
  if (!orphanPrivate || orphanPrivate.ok !== true) {
    throw new Error('FIRESTORE_GET_ATIVIDADE_PRIVADA_FALHOU: ' + String(orphanPrivate && orphanPrivate.code || 'SEM_CODIGO'));
  }
  if (orphanPrivate.found === true) throw new Error('ACTIVITY_PRIVATE_ORFA_EXISTENTE.');
  var result = atividadesV2_canonicalAgendaBatchWritePair_(documents, opts);
  return Object.freeze(Object.assign({}, result, {
    operation: 'CREATE',
    row: Object.freeze(atividadesV2_canonicalAgendaMergeDocumentsIntoRow_(
      documents.publicDocument,
      documents.privateDocument,
      null
    ))
  }));
}

function atividadesV2_canonicalAgendaUpdateDev_(idAtividade, updates, options) {
  var opts = atividadesV2_canonicalAgendaAssertCrudMode_(options);
  var current = atividadesV2_canonicalAgendaGetPairDev_(idAtividade, { ambiente: 'DEV' });
  if (!current.found) throw new Error('ATIVIDADE_CANONICA_NAO_ENCONTRADA.');
  var row = atividadesV2_canonicalAgendaMergeDocumentsIntoRow_(
    current.publicDocument,
    current.privateDocument,
    null
  );
  var changedHeaders = [];
  Object.keys(updates || {}).forEach(function(header) {
    var normalized = String(header || '').trim().toUpperCase();
    if (ATIVIDADES_V2_CANONICAL_MIGRATED_HEADERS.indexOf(normalized) < 0) return;
    if (normalized === 'ID_ATIVIDADE' && String(updates[header] || '').trim().toUpperCase() !== current.idAtividade) {
      throw new Error('ID_ATIVIDADE_IMUTAVEL.');
    }
    row[normalized] = updates[header];
    changedHeaders.push(normalized);
  });
  if (!changedHeaders.length) throw new Error('NENHUM_CAMPO_CANONICO_PARA_ATUALIZAR.');
  row.ID_ATIVIDADE = current.idAtividade;
  var documents = atividadesV2_canonicalAgendaBuildDocuments_(row, new Date());
  var result = atividadesV2_canonicalAgendaBatchWritePair_(documents, opts);
  return Object.freeze(Object.assign({}, result, {
    operation: 'UPDATE',
    changedHeaders: Object.freeze(changedHeaders.sort()),
    row: Object.freeze(atividadesV2_canonicalAgendaMergeDocumentsIntoRow_(
      documents.publicDocument,
      documents.privateDocument,
      null
    ))
  }));
}

function atividadesV2_canonicalAgendaChangeStatusDev_(action, payload, options) {
  if (typeof atividadesV2_adminBuildStatusUpdates_ !== 'function') {
    throw new Error('CONTRATO_REGRAS_STATUS_INDISPONIVEL.');
  }
  var id = atividadesV2_canonicalAgendaActivityId_(payload && (payload.idAtividade || payload.ID_ATIVIDADE));
  var current = atividadesV2_canonicalAgendaGetPairDev_(id, { ambiente: 'DEV' });
  if (!current.found) throw new Error('ATIVIDADE_CANONICA_NAO_ENCONTRADA.');
  var row = atividadesV2_canonicalAgendaMergeDocumentsIntoRow_(current.publicDocument, current.privateDocument, null);
  var statusUpdate = atividadesV2_adminBuildStatusUpdates_(action, payload || {}, row);
  if (!statusUpdate || statusUpdate.ok !== true) return statusUpdate;
  return atividadesV2_canonicalAgendaUpdateDev_(id, statusUpdate.data, options);
}

function atividadesV2_canonicalAgendaCancelDev_(payload, options) {
  return atividadesV2_canonicalAgendaChangeStatusDev_('CANCELAR', payload || {}, options);
}

/** A regra atual preserva historico: exclusao fisica nao faz parte do CRUD operacional. */
function atividadesV2_canonicalAgendaDeleteDev_(idAtividade, options) {
  atividadesV2_canonicalAgendaDevOptions_(options);
  atividadesV2_canonicalAgendaContext_({ ambiente: 'DEV' });
  return Object.freeze({
    ok: false,
    environment: 'DEV',
    idAtividade: atividadesV2_canonicalAgendaActivityId_(idAtividade),
    code: 'EXCLUSAO_FISICA_NAO_SUPORTADA',
    message: 'Use cancelamento. Exclusao fisica fica restrita ao rollback controlado do piloto.',
    supportedAction: 'CANCELAR',
    written: 0,
    sheetsWritten: false
  });
}

function atividadesV2_canonicalAgendaListAll_(collection, environment) {
  var list = atividadesV2_canonicalAgendaRequireCoreMethod_('coreFirestoreEnvironmentListDocuments');
  var documents = [];
  var pageToken = '';
  do {
    var page = list(collection, {
      ambiente: environment,
      pageSize: 500,
      pageToken: pageToken
    });
    if (!page || page.ok !== true) throw new Error('FIRESTORE_LIST_FALHOU: ' + String(page && page.code || 'SEM_CODIGO'));
    documents = documents.concat(page.documents || []);
    pageToken = String(page.nextPageToken || '');
    if (documents.length > 10000) throw new Error('LIMITE_DEFENSIVO_FIRESTORE_EXCEDIDO.');
  } while (pageToken);
  return documents;
}

function atividadesV2_canonicalAgendaDocumentMap_(collection, documents) {
  var result = {};
  (documents || []).forEach(function(item) {
    var id = String(item && item.id || '').trim();
    if (!id) return;
    result[collection + '/' + id] = item && item.data || {};
  });
  return result;
}

/** Compara o plano esperado com snapshots ja lidos, sem qualquer mutacao. */
function atividadesV2_canonicalAgendaBuildValidationReport_(plan, publicDocuments, privateDocuments) {
  var source = plan || {};
  var expectedByPath = {};
  (source.items || []).forEach(function(item) {
    var path = String(item && item.path || '').trim();
    if (path) expectedByPath[path] = item && item.data || {};
  });
  var actualByPath = Object.assign(
    {},
    atividadesV2_canonicalAgendaDocumentMap_(ATIVIDADES_V2_CANONICAL_COLLECTION, publicDocuments),
    atividadesV2_canonicalAgendaDocumentMap_(ATIVIDADES_V2_CANONICAL_PRIVATE_COLLECTION, privateDocuments)
  );
  var missingPaths = [];
  var unexpectedPaths = [];
  var divergentPaths = [];
  var matchingPaths = [];

  Object.keys(expectedByPath).sort().forEach(function(path) {
    if (!Object.prototype.hasOwnProperty.call(actualByPath, path)) {
      missingPaths.push(path);
      return;
    }
    if (String(actualByPath[path].sourceHash || '') !== String(expectedByPath[path].sourceHash || '')) {
      divergentPaths.push(path);
      return;
    }
    matchingPaths.push(path);
  });
  Object.keys(actualByPath).sort().forEach(function(path) {
    if (!Object.prototype.hasOwnProperty.call(expectedByPath, path)) unexpectedPaths.push(path);
  });

  return Object.freeze({
    ok: source.ok === true && !missingPaths.length && !unexpectedPaths.length && !divergentPaths.length,
    environment: 'DEV',
    readOnly: true,
    expectedActivities: Number(source.totalActivities || 0),
    expectedDocuments: Number(source.totalDocuments || 0),
    activitiesCount: (publicDocuments || []).length,
    activityPrivateCount: (privateDocuments || []).length,
    matchingHashes: matchingPaths.length,
    matchingPaths: Object.freeze(matchingPaths),
    missingPaths: Object.freeze(missingPaths),
    unexpectedPaths: Object.freeze(unexpectedPaths),
    divergentPaths: Object.freeze(divergentPaths),
    errors: source.errors || Object.freeze([])
  });
}

function atividadesV2_canonicalAgendaValidateInitialImportDev_(options) {
  var opts = atividadesV2_canonicalAgendaDevOptions_(options);
  atividadesV2_canonicalAgendaContext_(opts);
  var plan = atividadesV2_canonicalAgendaPlanInitialImportDev_(opts);
  var publicDocuments = atividadesV2_canonicalAgendaListAll_(ATIVIDADES_V2_CANONICAL_COLLECTION, 'DEV');
  var privateDocuments = atividadesV2_canonicalAgendaListAll_(ATIVIDADES_V2_CANONICAL_PRIVATE_COLLECTION, 'DEV');
  return atividadesV2_canonicalAgendaBuildValidationReport_(plan, publicDocuments, privateDocuments);
}

function atividadesV2_canonicalAgendaAssertPilotRollbackPath_(path) {
  var normalized = String(path || '').trim();
  var publicPrefix = ATIVIDADES_V2_CANONICAL_COLLECTION + '/';
  var privatePrefix = ATIVIDADES_V2_CANONICAL_PRIVATE_COLLECTION + '/';
  var prefix = normalized.indexOf(publicPrefix) === 0
    ? publicPrefix
    : (normalized.indexOf(privatePrefix) === 0 ? privatePrefix : '');
  var id = prefix ? normalized.slice(prefix.length) : '';
  if (!prefix || !id || id.indexOf('/') >= 0) {
    throw new Error('ROLLBACK_PATH_FORA_DO_PILOTO.');
  }
  return normalized;
}

function atividadesV2_canonicalAgendaRollbackPaths_(plan) {
  return Object.freeze((plan && plan.items || []).map(function(item) {
    return atividadesV2_canonicalAgendaAssertPilotRollbackPath_(item && item.path);
  }));
}

function atividadesV2_canonicalAgendaRollbackInitialImportDev_(options) {
  var opts = atividadesV2_canonicalAgendaDevOptions_(options);
  atividadesV2_canonicalAgendaContext_(opts);
  var realWrite = opts.dryRun === false;
  if (realWrite) {
    if (atividadesV2_canonicalAgendaMode_() !== 'LEGACY_READ_ONLY') {
      throw new Error('ROLLBACK_BLOQUEADO_APOS_CORTE_CANONICO.');
    }
    atividadesV2_canonicalAgendaAssertRollbackAuthorized_(opts);
    atividadesV2_canonicalAgendaAssertRollbackOperationalAllowed_();
  }

  var run = function() {
    var plan = atividadesV2_canonicalAgendaPlanInitialImportDev_(opts);
    if (!plan.ok) throw new Error('ROLLBACK_PLANO_IMPORTACAO_INVALIDO.');
    var expectedPaths = atividadesV2_canonicalAgendaRollbackPaths_(plan);
    var validation = atividadesV2_canonicalAgendaBuildValidationReport_(
      plan,
      atividadesV2_canonicalAgendaListAll_(ATIVIDADES_V2_CANONICAL_COLLECTION, 'DEV'),
      atividadesV2_canonicalAgendaListAll_(ATIVIDADES_V2_CANONICAL_PRIVATE_COLLECTION, 'DEV')
    );
    if (realWrite && validation.divergentPaths.length) {
      throw new Error('ROLLBACK_CONFLITO_FIRESTORE: ' + validation.divergentPaths.length + ' documento(s) divergentes.');
    }
    var matching = {};
    validation.matchingPaths.forEach(function(path) { matching[path] = true; });
    var pathsToDelete = expectedPaths.filter(function(path) { return matching[path] === true; });
    if (!realWrite) {
      return Object.freeze({
        ok: validation.divergentPaths.length === 0,
        dryRun: true,
        environment: 'DEV',
        expectedDocuments: expectedPaths.length,
        wouldDelete: pathsToDelete.length,
        pathsToDelete: Object.freeze(pathsToDelete),
        missingPaths: validation.missingPaths,
        unexpectedPaths: validation.unexpectedPaths,
        divergentPaths: validation.divergentPaths,
        sheetsWritten: false
      });
    }

    var deleteDocument = atividadesV2_canonicalAgendaRequireCoreMethod_('coreFirestoreEnvironmentDeleteDocument');
    var deleted = 0;
    pathsToDelete.forEach(function(path) {
      atividadesV2_canonicalAgendaAssertPilotRollbackPath_(path);
      var result = deleteDocument(path, { ambiente: 'DEV', environment: 'DEV', dryRun: false });
      if (!result || result.ok !== true || result.deleted !== true) {
        throw new Error('ROLLBACK_FIRESTORE_DEV_FALHOU: ' + String(result && result.code || 'SEM_CODIGO'));
      }
      deleted++;
    });
    return Object.freeze({
      ok: true,
      dryRun: false,
      environment: 'DEV',
      expectedDocuments: expectedPaths.length,
      totalDeleted: deleted,
      missingBeforeRollback: validation.missingPaths,
      unexpectedPathsUntouched: validation.unexpectedPaths,
      sheetsWritten: false
    });
  };

  if (!realWrite) return run();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('LOCK_INDISPONIVEL_ROLLBACK_FIRESTORE.');
  try {
    return run();
  } finally {
    lock.releaseLock();
  }
}

function atividadesV2_canonicalAgendaExportRow_(publicData, privateData) {
  var source = publicData || {};
  var internal = privateData || {};
  var row = {};
  (ATIVIDADES_V2_SCHEMA.ATIVIDADES || []).forEach(function(header) { row[header] = ''; });
  Object.assign(row, {
    ID_ATIVIDADE: source.idAtividade || '', CICLO: source.ciclo || '', ANO: source.ano || '',
    SEMESTRE: source.semestre || '', NUMERO_SEQUENCIAL_NO_CICLO: source.numeroSequencialNoCiclo || '',
    CLASSIFICACAO_REUNIAO: source.classificacaoReuniao || '', TIPO_ATIVIDADE: source.tipoAtividade || '',
    SUBTIPO_ATIVIDADE: source.subtipoAtividade || '', CLASSIFICACAO_ACESSO: source.classificacaoAcesso || '',
    TITULO: internal.tituloInterno || source.titulo || '', TITULO_PUBLICO: source.tituloPublico || '', DESCRICAO: internal.descricaoInterna || '',
    DESCRICAO_PUBLICA: source.descricaoPublica || '', EIXO_TEMATICO_PRINCIPAL: source.eixoTematicoPrincipal || '',
    EIXO_TEMATICO_SECUNDARIO: source.eixoTematicoSecundario || '',
    ID_PESSOA_PRINCIPAL: internal.idPessoaPrincipal || '', NOME_PESSOA_PRINCIPAL_PUBLICO: source.nomePessoaPrincipalPublico || '',
    RGA_PESSOA_PRINCIPAL: internal.rgaPessoaPrincipal || '', EMAIL_PESSOA_PRINCIPAL: internal.emailPessoaPrincipal || '',
    TIPO_PESSOA_PRINCIPAL: source.tipoPessoaPrincipal || '', PAPEL_PESSOA_PRINCIPAL: source.papelPessoaPrincipal || '',
    INSTITUICAO_PESSOA_PRINCIPAL: source.instituicaoPessoaPrincipal || '', DATA_ATIVIDADE: source.dataAtividade || '',
    HORARIO_INICIO: source.horarioInicio || '', HORARIO_FIM: source.horarioFim || '', LOCAL: source.local || '',
    FORMATO: source.formato || '', RESPONSAVEL_INTERNO: internal.responsavelInterno || '',
    RESPONSAVEL_EMAIL: internal.responsavelEmail || '', PUBLICO_ALVO: source.publicoAlvo || '',
    OBRIGATORIA: source.obrigatoria ? 'SIM' : 'NAO', CARGA_HORARIA: source.cargaHoraria || '',
    STATUS_OPERACIONAL: source.statusOperacional || '', STATUS_PUBLICACAO_PORTAL: source.statusPublicacaoPortal || '',
    VISIBILIDADE_PORTAL: source.visibilidadePortal || '', DATA_LIBERACAO_PORTAL: source.dataLiberacaoPortal || '',
    DATA_REALIZACAO: source.dataRealizacao || '', ORIGEM_FLUXO: source.origemFluxo || '',
    CRIADO_POR: internal.criadoPor || '', CRIADO_EM: internal.criadoEm || '', ATUALIZADO_POR: internal.atualizadoPor || '',
    ATUALIZADO_EM: internal.atualizadoEm || source.canonicalUpdatedAt || '',
    BLOQUEADO_PARA_EDICAO: internal.bloqueadoParaEdicao ? 'SIM' : 'NAO', OBSERVACOES: internal.observacoesInternas || '',
    ATIVO: source.ativo === false ? 'NAO' : 'SIM', ID_CONFIG_MODELO: source.idConfigModelo || '',
    NOME_MODELO_PORTAL_SNAPSHOT: source.nomeModeloPortalSnapshot || '', VERSAO_CONFIG_MODELO: source.versaoConfigModelo || '',
    TEM_EXCECAO_CONFIG: internal.temExcecaoConfig ? 'SIM' : 'NAO', STATUS_EXCECAO_CONFIG: internal.statusExcecaoConfig || '',
    JUSTIFICATIVA_EXCECAO_CONFIG: internal.justificativaExcecaoConfig || ''
  });
  return row;
}

function atividadesV2_canonicalAgendaBuildExportRows_(publicDocs, privateDocs) {
  var privateById = {};
  var publicById = {};
  (privateDocs || []).forEach(function(item) { privateById[String(item.id || '')] = item.data || {}; });
  (publicDocs || []).forEach(function(item) { publicById[String(item.id || '')] = true; });
  var missingPrivate = [];
  var unexpectedPrivate = Object.keys(privateById).filter(function(id) { return !publicById[id]; }).sort();
  var rows = (publicDocs || []).map(function(item) {
    var id = String(item.id || '');
    if (!privateById[id]) missingPrivate.push(ATIVIDADES_V2_CANONICAL_PRIVATE_COLLECTION + '/' + id);
    return atividadesV2_canonicalAgendaExportRow_(item.data || {}, privateById[id] || {});
  }).sort(function(a, b) { return String(a.ID_ATIVIDADE).localeCompare(String(b.ID_ATIVIDADE)); });
  return Object.freeze({
    ok: !missingPrivate.length && !unexpectedPrivate.length,
    rows: Object.freeze(rows),
    missingPrivatePaths: Object.freeze(missingPrivate.sort()),
    unexpectedPrivatePaths: Object.freeze(unexpectedPrivate.map(function(id) {
      return ATIVIDADES_V2_CANONICAL_PRIVATE_COLLECTION + '/' + id;
    }))
  });
}

function atividadesV2_canonicalAgendaComparableExportValue_(header, value) {
  if (value === null || value === undefined) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    if (['DATA_ATIVIDADE', 'DATA_LIBERACAO_PORTAL', 'DATA_REALIZACAO'].indexOf(header) >= 0) {
      return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    }
    return value.toISOString();
  }
  if (typeof value === 'boolean') return value ? 'SIM' : 'NAO';
  if (typeof value === 'number') return isFinite(value) ? String(value) : '';
  var text = String(value || '').trim();
  if (['DATA_ATIVIDADE', 'DATA_LIBERACAO_PORTAL', 'DATA_REALIZACAO'].indexOf(header) >= 0 && text) {
    return text.slice(0, 10);
  }
  return text;
}

function atividadesV2_canonicalAgendaBuildExportDivergenceReport_(canonicalRows, sheetRows, metadata) {
  var expectedById = {};
  var actualById = {};
  var duplicatePaths = [];
  (canonicalRows || []).forEach(function(row) {
    var id = String(row && row.ID_ATIVIDADE || '').trim();
    if (id) expectedById[id] = row;
  });
  (sheetRows || []).forEach(function(row) {
    var id = String(row && row.ID_ATIVIDADE || '').trim();
    if (!id) return;
    if (actualById[id]) duplicatePaths.push(ATIVIDADES_V2_CANONICAL_EXPORT_SHEET + '/' + id);
    else actualById[id] = row;
  });
  var missingIds = Object.keys(expectedById).filter(function(id) { return !actualById[id]; }).sort();
  var extraIds = Object.keys(actualById).filter(function(id) { return !expectedById[id]; }).sort();
  var divergentRecords = [];
  Object.keys(expectedById).sort().forEach(function(id) {
    if (!actualById[id]) return;
    var fields = [];
    ATIVIDADES_V2_CANONICAL_MIGRATED_HEADERS.forEach(function(header) {
      var expected = atividadesV2_canonicalAgendaComparableExportValue_(header, expectedById[id][header]);
      var actual = atividadesV2_canonicalAgendaComparableExportValue_(header, actualById[id][header]);
      if (expected !== actual) fields.push(Object.freeze({ field: header, expected: expected, actual: actual }));
    });
    if (fields.length) divergentRecords.push(Object.freeze({ idAtividade: id, fields: Object.freeze(fields) }));
  });
  var lastExport = metadata || null;
  return Object.freeze({
    ok: !missingIds.length && !extraIds.length && !duplicatePaths.length && !divergentRecords.length,
    environment: 'DEV',
    readOnly: true,
    canonicalSource: 'FIRESTORE',
    comparisonTarget: ATIVIDADES_V2_CANONICAL_EXPORT_SHEET,
    canonicalCount: Object.keys(expectedById).length,
    exportCount: Object.keys(actualById).length,
    missingIds: Object.freeze(missingIds),
    extraIds: Object.freeze(extraIds),
    duplicatePaths: Object.freeze(duplicatePaths.sort()),
    divergentRecords: Object.freeze(divergentRecords),
    lastExport: lastExport,
    resolution: 'FIRESTORE_WINS'
  });
}

function atividadesV2_canonicalAgendaReadExportMetadata_() {
  var raw = PropertiesService.getScriptProperties().getProperty(ATIVIDADES_V2_CANONICAL_EXPORT_METADATA_PROPERTY);
  if (!raw) return null;
  try {
    var parsed = JSON.parse(raw);
    return Object.freeze({
      exportedAt: String(parsed.exportedAt || ''),
      totalActivities: Number(parsed.totalActivities || 0),
      schemaVersion: String(parsed.schemaVersion || ''),
      strategy: String(parsed.strategy || '')
    });
  } catch (err) {
    return Object.freeze({ invalid: true });
  }
}

function atividadesV2_canonicalAgendaDiagnoseExportDev_(options) {
  var opts = atividadesV2_canonicalAgendaDevOptions_(options);
  var context = atividadesV2_canonicalAgendaContext_(opts);
  var publicDocs = atividadesV2_canonicalAgendaListAll_(ATIVIDADES_V2_CANONICAL_COLLECTION, context.environment);
  var privateDocs = atividadesV2_canonicalAgendaListAll_(ATIVIDADES_V2_CANONICAL_PRIVATE_COLLECTION, context.environment);
  var exportData = atividadesV2_canonicalAgendaBuildExportRows_(publicDocs, privateDocs);
  var spreadsheet = atividadesV2_getDatabaseSpreadsheet_({ ambiente: context.environment });
  var sheet = spreadsheet.getSheetByName(ATIVIDADES_V2_CANONICAL_EXPORT_SHEET);
  var sheetRows = sheet ? atividadesV2_readSheetObjects_(sheet) : [];
  var report = atividadesV2_canonicalAgendaBuildExportDivergenceReport_(
    exportData.rows,
    sheetRows,
    atividadesV2_canonicalAgendaReadExportMetadata_()
  );
  return Object.freeze(Object.assign({}, report, {
    ok: report.ok && exportData.ok,
    firestoreReadsEstimated: publicDocs.length + privateDocs.length,
    missingPrivatePaths: exportData.missingPrivatePaths,
    unexpectedPrivatePaths: exportData.unexpectedPrivatePaths,
    exportSheetExists: !!sheet
  }));
}

function atividadesV2_canonicalAgendaExportToSheetsDev_(options) {
  var opts = atividadesV2_canonicalAgendaDevOptions_(options);
  var context = atividadesV2_canonicalAgendaContext_(opts);
  var publicDocs = atividadesV2_canonicalAgendaListAll_(ATIVIDADES_V2_CANONICAL_COLLECTION, context.environment);
  var privateDocs = atividadesV2_canonicalAgendaListAll_(ATIVIDADES_V2_CANONICAL_PRIVATE_COLLECTION, context.environment);
  var exportData = atividadesV2_canonicalAgendaBuildExportRows_(publicDocs, privateDocs);
  var rows = exportData.rows;
  if (!exportData.ok) {
    throw new Error('EXPORT_FIRESTORE_PAR_CANONICO_INVALIDO: corrija documents ausentes antes de exportar.');
  }
  if (opts.dryRun !== false) {
    return Object.freeze({
      ok: true, dryRun: true, environment: 'DEV', totalActivities: rows.length,
      targetSheet: ATIVIDADES_V2_CANONICAL_EXPORT_SHEET, sheetsWritten: false,
      strategy: 'FULL_REGENERATION', firestoreReadsEstimated: publicDocs.length + privateDocs.length
    });
  }
  atividadesV2_canonicalAgendaAssertExportAuthorized_(opts);
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('LOCK_INDISPONIVEL_EXPORT_FIRESTORE.');
  try {
    var spreadsheet = atividadesV2_getDatabaseSpreadsheet_({ ambiente: context.environment });
    var sheet = spreadsheet.getSheetByName(ATIVIDADES_V2_CANONICAL_EXPORT_SHEET) ||
      spreadsheet.insertSheet(ATIVIDADES_V2_CANONICAL_EXPORT_SHEET);
    var headers = ATIVIDADES_V2_SCHEMA.ATIVIDADES.slice();
    var values = [headers].concat(rows.map(function(row) {
      return headers.map(function(header) { return row[header]; });
    }));
    sheet.clearContents();
    sheet.getRange(1, 1, values.length, headers.length).setValues(values);
    var metadata = Object.freeze({
      exportedAt: new Date().toISOString(),
      totalActivities: rows.length,
      schemaVersion: ATIVIDADES_V2_CANONICAL_SCHEMA_VERSION,
      strategy: 'FULL_REGENERATION'
    });
    PropertiesService.getScriptProperties().setProperty(
      ATIVIDADES_V2_CANONICAL_EXPORT_METADATA_PROPERTY,
      JSON.stringify(metadata)
    );
    return Object.freeze({
      ok: true, dryRun: false, environment: 'DEV', totalActivities: rows.length,
      targetSheet: ATIVIDADES_V2_CANONICAL_EXPORT_SHEET, sheetsWritten: true,
      canonicalSource: 'FIRESTORE', strategy: 'FULL_REGENERATION', metadata: metadata
    });
  } finally {
    lock.releaseLock();
  }
}
