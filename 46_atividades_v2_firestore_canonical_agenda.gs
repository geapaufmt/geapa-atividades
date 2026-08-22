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
var ATIVIDADES_V2_CANONICAL_REMOTE_CONFIRMATION = 'AUTORIZO_WRITE_FIRESTORE_DEV_ATIVIDADES_AGENDA';
var ATIVIDADES_V2_CANONICAL_EXPORT_CONFIRMATION = 'AUTORIZO_EXPORT_FIRESTORE_DEV_PARA_SHEETS';
var ATIVIDADES_V2_CANONICAL_EXPORT_SHEET = 'EXPORT_ATIVIDADES_FIRESTORE';
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

function atividadesV2_canonicalAgendaMode_() {
  var mode = String(PropertiesService.getScriptProperties().getProperty(
    ATIVIDADES_V2_CANONICAL_MODE_PROPERTY
  ) || 'LEGACY_READ_ONLY').trim().toUpperCase();
  if (['LEGACY_READ_ONLY', 'FIRESTORE_CANONICAL'].indexOf(mode) < 0) {
    throw new Error('ATIVIDADES_V2_AGENDA_CANONICAL_MODE invalido.');
  }
  return mode;
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
  var opts = Object.assign({}, options || {}, { ambiente: 'DEV' });
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
  var opts = Object.assign({}, options || {}, { ambiente: 'DEV' });
  var plan = atividadesV2_canonicalAgendaPlanInitialImportDev_(opts);
  if (!plan.ok || opts.dryRun !== false) return atividadesV2_canonicalAgendaPlanSummary_(plan);
  if (atividadesV2_canonicalAgendaMode_() !== 'LEGACY_READ_ONLY') {
    throw new Error('IMPORTACAO_INICIAL_BLOQUEADA_APOS_CORTE_CANONICO.');
  }
  atividadesV2_canonicalAgendaAssertRemoteWriteAuthorized_(opts, ATIVIDADES_V2_CANONICAL_REMOTE_CONFIRMATION);
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
  var opts = Object.assign({}, options || {}, { ambiente: 'DEV' });
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

function atividadesV2_canonicalAgendaExportToSheetsDev_(options) {
  var opts = Object.assign({}, options || {}, { ambiente: 'DEV' });
  var context = atividadesV2_canonicalAgendaContext_(opts);
  var publicDocs = atividadesV2_canonicalAgendaListAll_(ATIVIDADES_V2_CANONICAL_COLLECTION, context.environment);
  var privateDocs = atividadesV2_canonicalAgendaListAll_(ATIVIDADES_V2_CANONICAL_PRIVATE_COLLECTION, context.environment);
  var privateById = {};
  privateDocs.forEach(function(item) { privateById[String(item.id || '')] = item.data || {}; });
  var rows = publicDocs.map(function(item) {
    return atividadesV2_canonicalAgendaExportRow_(item.data || {}, privateById[String(item.id || '')] || {});
  }).sort(function(a, b) { return String(a.ID_ATIVIDADE).localeCompare(String(b.ID_ATIVIDADE)); });
  if (opts.dryRun !== false) {
    return Object.freeze({
      ok: true, dryRun: true, environment: 'DEV', totalActivities: rows.length,
      targetSheet: ATIVIDADES_V2_CANONICAL_EXPORT_SHEET, sheetsWritten: false
    });
  }
  atividadesV2_canonicalAgendaAssertRemoteWriteAuthorized_(opts, ATIVIDADES_V2_CANONICAL_EXPORT_CONFIRMATION);
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
    return Object.freeze({
      ok: true, dryRun: false, environment: 'DEV', totalActivities: rows.length,
      targetSheet: ATIVIDADES_V2_CANONICAL_EXPORT_SHEET, sheetsWritten: true,
      canonicalSource: 'FIRESTORE'
    });
  } finally {
    lock.releaseLock();
  }
}
