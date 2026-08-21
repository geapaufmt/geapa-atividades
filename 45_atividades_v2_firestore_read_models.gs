/**
 * Read models DEV do modulo Atividades no Firestore.
 * Sheets V2 continua sendo a fonte oficial; Firestore e apenas cache de leitura.
 */

var ATIVIDADES_V2_FIRESTORE_CALENDAR_COLLECTION = 'portalActivities';
var ATIVIDADES_V2_FIRESTORE_CALENDAR_SCHEMA_VERSION = 'portal-activity-calendar-v3';
var ATIVIDADES_V2_FIRESTORE_CALENDAR_SNAPSHOT_COLLECTION = 'portalActivityCalendarSnapshots';
var ATIVIDADES_V2_FIRESTORE_CALENDAR_SNAPSHOT_ID = 'current';
var ATIVIDADES_V2_FIRESTORE_CALENDAR_SNAPSHOT_SCHEMA_VERSION = 'portal-activity-calendar-snapshot-v1';
var ATIVIDADES_V2_FIRESTORE_CALENDAR_SNAPSHOT_MAX_BYTES = 900000;
var ATIVIDADES_V2_FIRESTORE_MAX_DOCUMENTS = 500;
var ATIVIDADES_V2_FIRESTORE_RESTRICTED_ACCESS = Object.freeze([
  'ADMIN', 'ADMINISTRACAO', 'DIRETORIA', 'GESTAO', 'RESTRITA', 'RESTRITO', 'SECRETARIA'
]);
var ATIVIDADES_V2_FIRESTORE_HASH_IGNORED_FIELDS = Object.freeze([
  'cacheUpdatedAt', 'sourceHash', 'sourceVersion', 'datasetComplete', 'syncScope',
  'ativoNoReadModel', 'stale', 'staleReason', 'staleDetectedAt'
]);
var ATIVIDADES_V2_FIRESTORE_SNAPSHOT_HASH_IGNORED_FIELDS = Object.freeze([
  'cacheUpdatedAt', 'sourceHash', 'sourceVersion'
]);
var ATIVIDADES_V2_FIRESTORE_DOCUMENT_REFRESH_MAX_AGE_MS = 4 * 60 * 60 * 1000;

function atividadesV2_firestoreOptions_(options) {
  options = options || {};
  var limit = Math.max(0, Math.floor(Number(options.limit || 0)));
  return {
    dryRun: options.dryRun !== false,
    limit: limit ? Math.min(limit, ATIVIDADES_V2_FIRESTORE_MAX_DOCUMENTS) : 0,
    idAtividade: String(options.idAtividade || '').trim().toUpperCase(),
    forceRefresh: options.forceRefresh === true,
    compareExisting: options.compareExisting !== false,
    markMissingStale: options.markMissingStale === true,
    mode: atividades_normalizeTextUpper_(options.mode || 'MARK_STALE'),
    reason: String(options.reason || '').trim().slice(0, 120)
  };
}

function atividadesV2_firestoreText_(value, maxLength) {
  var text = String(value == null ? '' : value).trim();
  return maxLength ? text.slice(0, maxLength) : text;
}

function atividadesV2_firestoreBoolean_(value) {
  if (typeof value === 'boolean') return value;
  return ['SIM', 'S', 'TRUE', '1'].indexOf(atividades_normalizeTextUpper_(value)) >= 0;
}

function atividadesV2_firestoreDate_(value) {
  if (typeof atividades_formatPortalDateIso_ === 'function') return atividades_formatPortalDateIso_(value);
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return atividadesV2_firestoreText_(value, 10);
}

function atividadesV2_firestoreTime_(value) {
  if (typeof atividades_formatPortalTime_ === 'function') return atividades_formatPortalTime_(value);
  return atividadesV2_firestoreText_(value, 8);
}

function atividadesV2_firestoreIso_(value, fallback) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) return value.toISOString();
  var parsed = value ? new Date(value) : null;
  return parsed && !isNaN(parsed.getTime()) ? parsed.toISOString() : String(fallback || '');
}

function atividadesV2_firestoreUniqueStrings_(values) {
  var seen = {};
  return (values || []).map(function(value) {
    return atividadesV2_firestoreText_(value, 80);
  }).filter(function(value) {
    if (!value || seen[value]) return false;
    seen[value] = true;
    return true;
  });
}

function atividadesV2_firestoreStableValue_(value, ignored) {
  if (Array.isArray(value)) {
    return value.map(function(item) { return atividadesV2_firestoreStableValue_(item, ignored); });
  }
  if (value && typeof value === 'object' && Object.prototype.toString.call(value) !== '[object Date]') {
    var result = {};
    Object.keys(value).sort().forEach(function(key) {
      if (ignored[key] || value[key] === undefined) return;
      result[key] = atividadesV2_firestoreStableValue_(value[key], ignored);
    });
    return result;
  }
  if (Object.prototype.toString.call(value) === '[object Date]') return value.toISOString();
  return value;
}

/** Calcula hash deterministico apenas com os campos autorizados do documento. */
function atividadesV2_firestoreBuildSourceHash_(document, ignoredFields) {
  var ignored = {};
  (ignoredFields || []).forEach(function(field) { ignored[String(field || '')] = true; });
  var canonical = JSON.stringify(atividadesV2_firestoreStableValue_(document || {}, ignored));
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, canonical, Utilities.Charset.UTF_8);
  return Utilities.base64EncodeWebSafe(digest).replace(/=+$/g, '');
}

function atividadesV2_firestoreBuildSourceVersion_(schemaVersion, sourceHash) {
  return atividadesV2_firestoreText_(schemaVersion, 120) + ':' + atividadesV2_firestoreText_(sourceHash, 120);
}

function atividadesV2_firestoreBuildCalendarDocument_(record, now, metadata) {
  metadata = metadata || {};
  var updatedAt = now || new Date();
  var hasPresentation = atividadesV2_firestoreBoolean_(record.POSSUI_APRESENTACOES) || Number(record.QTD_APRESENTACOES || 0) > 0;
  var statusPublicacao = atividadesV2_firestoreText_(record.STATUS_PUBLICACAO_PORTAL || record.STATUS_PUBLICO, 80);
  var document = {
    idAtividade: atividadesV2_firestoreText_(record.ID_ATIVIDADE, 80),
    titulo: atividadesV2_firestoreText_(record.TITULO_PUBLICO || record.TITULO_CONTEUDO_PUBLICO, 240),
    tituloConteudoPublico: atividadesV2_firestoreText_(record.TITULO_CONTEUDO_PUBLICO, 240),
    tipoPublico: atividadesV2_firestoreText_(record.TIPO_PUBLICO, 100),
    tipoAtividade: atividadesV2_firestoreText_(record.TIPO_ATIVIDADE, 100),
    subtipoAtividade: atividadesV2_firestoreText_(record.SUBTIPO_ATIVIDADE, 100),
    dataAtividade: atividadesV2_firestoreDate_(record.DATA_ATIVIDADE),
    horarioInicio: atividadesV2_firestoreTime_(record.HORARIO_INICIO),
    horarioFim: atividadesV2_firestoreTime_(record.HORARIO_FIM),
    local: atividadesV2_firestoreText_(record.LOCAL, 180),
    ciclo: atividadesV2_firestoreText_(record.CICLO, 80),
    ano: atividadesV2_firestoreText_(record.ANO, 8),
    semestre: atividadesV2_firestoreText_(record.SEMESTRE, 8),
    rotuloSemestre: atividadesV2_firestoreText_(record.ROTULO_SEMESTRE, 80),
    formato: atividadesV2_firestoreText_(record.FORMATO, 80),
    publicoAlvo: atividadesV2_firestoreText_(record.PUBLICO_ALVO, 180),
    cargaHoraria: atividadesV2_firestoreText_(record.CARGA_HORARIA, 20),
    statusOperacional: atividadesV2_firestoreText_(record.STATUS_OPERACIONAL, 80),
    statusPublico: atividadesV2_firestoreText_(record.STATUS_PUBLICO || statusPublicacao, 80),
    statusPublicacaoPortal: statusPublicacao,
    visibilidadePortal: atividadesV2_firestoreText_(record.VISIBILIDADE_PORTAL, 80),
    classificacaoAcesso: atividadesV2_firestoreText_(record.CLASSIFICACAO_ACESSO, 80),
    eixoTematicoPrincipal: atividadesV2_firestoreText_(record.EIXO_TEMATICO_PRINCIPAL, 180),
    eixoTematicoSecundario: atividadesV2_firestoreText_(record.EIXO_TEMATICO_SECUNDARIO, 180),
    nomePessoaPrincipalPublico: atividadesV2_firestoreText_(record.NOME_PESSOA_PRINCIPAL_PUBLICO, 180),
    papelPessoaPrincipal: atividadesV2_firestoreText_(record.PAPEL_PESSOA_PRINCIPAL, 80),
    tipoPessoaPrincipal: atividadesV2_firestoreText_(record.TIPO_PESSOA_PRINCIPAL, 80),
    temApresentacao: hasPresentation,
    qtdApresentacoes: Number(record.QTD_APRESENTACOES || 0),
    resumoApresentacoesPublico: atividadesV2_firestoreText_(record.RESUMO_APRESENTACOES_PUBLICO, 500),
    statusTituloEixo: atividadesV2_firestoreText_(record.STATUS_TITULO_EIXO, 80),
    statusMaterial: atividadesV2_firestoreText_(record.STATUS_MATERIAL, 80),
    statusFoto: atividadesV2_firestoreText_(record.STATUS_FOTO, 80),
    badges: atividadesV2_firestoreUniqueStrings_([record.TIPO_PUBLICO, record.FORMATO, hasPresentation ? 'APRESENTACAO' : '']),
    flags: {
      contaPresenca: atividadesV2_firestoreBoolean_(record.CONTA_PRESENCA),
      contaFalta: atividadesV2_firestoreBoolean_(record.CONTA_FALTA),
      geraCertificado: atividadesV2_firestoreBoolean_(record.GERA_CERTIFICADO),
      podeVerDetalhes: atividadesV2_firestoreBoolean_(record.PODE_VER_DETALHES)
    },
    datasetComplete: metadata.datasetComplete === true,
    syncScope: atividadesV2_firestoreText_(metadata.syncScope || 'DIAGNOSTIC', 20),
    ativoNoReadModel: true,
    stale: false,
    staleReason: '',
    source: 'PORTAL_ATIVIDADES_CALENDARIO',
    sourceSystem: 'geapa-atividades',
    sourceUpdatedAt: atividadesV2_firestoreIso_(record.ULTIMA_ATUALIZACAO, ''),
    cacheUpdatedAt: updatedAt.toISOString(),
    schemaVersion: ATIVIDADES_V2_FIRESTORE_CALENDAR_SCHEMA_VERSION
  };
  document.sourceHash = atividadesV2_firestoreBuildSourceHash_(document, ATIVIDADES_V2_FIRESTORE_HASH_IGNORED_FIELDS);
  document.sourceVersion = atividadesV2_firestoreBuildSourceVersion_(document.schemaVersion, document.sourceHash);
  return Object.freeze(document);
}

function atividadesV2_firestoreCalendarEligibility_(record) {
  var id = atividadesV2_firestoreText_(record.ID_ATIVIDADE).toUpperCase();
  if (!id) return { eligible: false, reason: 'ID_ATIVIDADE_AUSENTE' };
  if (!atividadesV2_isCanonicalActivityId_(id)) return { eligible: false, reason: 'ID_ATIVIDADE_INVALIDO' };
  var visibility = atividades_normalizeTextUpper_(record.VISIBILIDADE_PORTAL);
  if (visibility === 'OCULTA') return { eligible: false, reason: 'VISIBILIDADE_OCULTA' };
  var status = atividades_normalizeTextUpper_(record.STATUS_PUBLICACAO_PORTAL || record.STATUS_PUBLICO);
  if (['RASCUNHO', 'OCULTA', 'CANCELADA'].indexOf(status) >= 0) return { eligible: false, reason: 'STATUS_NAO_PUBLICAVEL' };
  var access = atividades_normalizeTextUpper_(record.CLASSIFICACAO_ACESSO);
  if (ATIVIDADES_V2_FIRESTORE_RESTRICTED_ACCESS.indexOf(access) >= 0) return { eligible: false, reason: 'CLASSIFICACAO_RESTRITA' };
  return { eligible: true, reason: '' };
}

function atividadesV2_firestorePrepareCalendar_(options) {
  var opts = atividadesV2_firestoreOptions_(options);
  var ss = atividadesV2_getDatabaseSpreadsheet_();
  var records = atividades_readPortalActivityRecordsV2Dev_(ss);
  var reasons = {};
  var selected = [];
  var ignored = 0;
  var now = new Date();
  records.forEach(function(record) {
    var id = atividadesV2_firestoreText_(record.ID_ATIVIDADE).toUpperCase();
    if (opts.idAtividade && id !== opts.idAtividade) return;
    var decision = atividadesV2_firestoreCalendarEligibility_(record);
    if (!decision.eligible) {
      ignored++;
      reasons[decision.reason] = Number(reasons[decision.reason] || 0) + 1;
      return;
    }
    selected.push({ id: id, record: record });
  });
  var totalEligible = selected.length;
  var eligibleIds = selected.map(function(item) { return item.id; });
  if (opts.limit) selected = selected.slice(0, opts.limit);
  if (selected.length > ATIVIDADES_V2_FIRESTORE_MAX_DOCUMENTS) selected = selected.slice(0, ATIVIDADES_V2_FIRESTORE_MAX_DOCUMENTS);
  var datasetComplete = !opts.idAtividade && !opts.limit && totalEligible <= ATIVIDADES_V2_FIRESTORE_MAX_DOCUMENTS;
  var syncScope = opts.idAtividade ? 'ID' : (opts.limit ? 'LIMIT' : (datasetComplete ? 'FULL' : 'TRUNCATED'));
  selected = selected.map(function(item) {
    return {
      id: item.id,
      record: item.record,
      document: atividadesV2_firestoreBuildCalendarDocument_(item.record, now, {
        datasetComplete: datasetComplete,
        syncScope: syncScope
      })
    };
  });
  var warnings = [];
  if (opts.limit) warnings.push('SINCRONIZACAO_PARCIAL_LIMIT_' + opts.limit);
  if (opts.idAtividade) warnings.push('SINCRONIZACAO_PARCIAL_ID_ATIVIDADE');
  if (opts.idAtividade && !selected.length) warnings.push('ID_NAO_ELEGIVEL_OU_AUSENTE_NA_VIEW');
  if (totalEligible > ATIVIDADES_V2_FIRESTORE_MAX_DOCUMENTS && !opts.limit) warnings.push('TOTAL_ELEGIVEL_LIMITADO_A_500_DOCUMENTOS');
  return {
    opts: opts,
    spreadsheet: ss,
    totalRead: records.length,
    totalEligible: totalEligible,
    totalSelected: selected.length,
    datasetComplete: datasetComplete,
    syncScope: syncScope,
    totalIgnored: ignored,
    reasons: reasons,
    eligibleIds: eligibleIds,
    selected: selected,
    warnings: warnings
  };
}

function atividadesV2_firestoreCalendarSpec_() {
  return Object.freeze({
    code: 'CALENDARIO',
    collection: ATIVIDADES_V2_FIRESTORE_CALENDAR_COLLECTION,
    schemaVersion: ATIVIDADES_V2_FIRESTORE_CALENDAR_SCHEMA_VERSION,
    source: ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_CALENDARIO,
    ignoredHashFields: ATIVIDADES_V2_FIRESTORE_HASH_IGNORED_FIELDS,
    prepare: atividadesV2_firestorePrepareCalendar_
  });
}

function atividadesV2_firestoreRequireCoreMethod_(name) {
  if (typeof GEAPA_CORE === 'undefined' || !GEAPA_CORE || typeof GEAPA_CORE[name] !== 'function') {
    throw new Error('GEAPA_CORE sem ' + name + '. Atualize a biblioteca Core em modo HEAD.');
  }
  return GEAPA_CORE[name];
}

function atividadesV2_firestoreListCollection_(collection) {
  var listDocuments = atividadesV2_firestoreRequireCoreMethod_('coreFirestoreListDocuments');
  var documents = [];
  var pageToken = '';
  do {
    var page = listDocuments(collection, { pageSize: 500, pageToken: pageToken });
    if (!page || page.ok !== true) throw new Error('Falha ao listar colecao Firestore: ' + String(page && page.code || 'SEM_CODIGO'));
    documents = documents.concat(page.documents || []);
    pageToken = String(page.nextPageToken || '');
    if (documents.length > 5000) throw new Error('Limite defensivo de documentos Firestore excedido.');
  } while (pageToken);
  return documents;
}

function atividadesV2_firestoreReadExistingIndex_(spec, prepared) {
  var index = {};
  if (prepared.opts.idAtividade) {
    var getDocument = atividadesV2_firestoreRequireCoreMethod_('coreFirestoreGetDocument');
    var response = getDocument(spec.collection + '/' + prepared.opts.idAtividade, {});
    if (response && response.ok === true && response.found === true) index[prepared.opts.idAtividade] = response.data || {};
    else if (response && response.ok === false) throw new Error('Falha ao ler documento Firestore: ' + String(response.code || 'SEM_CODIGO'));
    return index;
  }
  atividadesV2_firestoreListCollection_(spec.collection).forEach(function(item) {
    var id = String(item.id || '').trim().toUpperCase();
    if (id) index[id] = item.data || {};
  });
  return index;
}

function atividadesV2_firestoreDocumentIsIdentical_(desired, existing, options) {
  var opts = options || {};
  if (!existing || existing.sourceVersion !== desired.sourceVersion ||
      existing.ativoNoReadModel === false || existing.stale === true) return false;
  if (opts.forceRefresh === true) return false;
  var existingUpdatedAt = atividades_parseDateOrNull_(existing.cacheUpdatedAt || existing.sourceUpdatedAt);
  if (!existingUpdatedAt || new Date().getTime() - existingUpdatedAt.getTime() >= ATIVIDADES_V2_FIRESTORE_DOCUMENT_REFRESH_MAX_AGE_MS) {
    return false;
  }
  if (String(desired.syncScope || '') === 'ID') return true;
  return existing.datasetComplete === desired.datasetComplete &&
    String(existing.syncScope || '') === String(desired.syncScope || '');
}

function atividadesV2_firestoreSafeExample_(document) {
  if (!document) return null;
  return {
    idAtividade: document.idAtividade || '',
    sourceHash: document.sourceHash || '',
    sourceVersion: document.sourceVersion || '',
    schemaVersion: document.schemaVersion || '',
    syncScope: document.syncScope || '',
    datasetComplete: document.datasetComplete === true,
    ativoNoReadModel: document.ativoNoReadModel !== false,
    stale: document.stale === true
  };
}

/** Motor generico de sincronizacao para read models definidos por spec. */
function atividadesV2_firestoreSyncReadModelBySpec_(spec, options) {
  var prepared = spec.prepare(options || {});
  var existingIndex = {};
  var existingReadFailed = false;
  var warnings = prepared.warnings.slice();
  if (prepared.opts.compareExisting) {
    try {
      existingIndex = atividadesV2_firestoreReadExistingIndex_(spec, prepared);
    } catch (readErr) {
      existingReadFailed = true;
      warnings.push('COMPARACAO_FIRESTORE_INDISPONIVEL:' + String(readErr && readErr.message || readErr).slice(0, 180));
    }
  }

  if (prepared.opts.idAtividade && !prepared.selected.length && prepared.opts.markMissingStale && existingReadFailed) {
    return {
      ok: false,
      dryRun: prepared.opts.dryRun,
      collection: spec.collection,
      errorCode: 'FIRESTORE_DOCUMENTO_EXISTENTE_NAO_VERIFICADO',
      message: 'Nao foi possivel verificar o documento que saiu da view.',
      totalEscrito: 0,
      warnings: warnings
    };
  }

  var skipped = 0;
  var writeItems = [];
  prepared.selected.forEach(function(item) {
    if (atividadesV2_firestoreDocumentIsIdentical_(item.document, existingIndex[item.id], prepared.opts)) {
      skipped++;
      return;
    }
    writeItems.push({ path: spec.collection + '/' + item.id, data: item.document });
  });

  var staleFromMissingId = 0;
  if (prepared.opts.idAtividade && !prepared.selected.length && prepared.opts.markMissingStale && existingIndex[prepared.opts.idAtividade]) {
    staleFromMissingId = 1;
    writeItems.push({
      path: spec.collection + '/' + prepared.opts.idAtividade,
      data: {
        ativoNoReadModel: false,
        stale: true,
        staleReason: 'NAO_ELEGIVEL_NA_VIEW',
        staleDetectedAt: new Date().toISOString(),
        cacheUpdatedAt: new Date().toISOString(),
        datasetComplete: false,
        syncScope: 'ID'
      }
    });
  }

  var write = {
    ok: true,
    written: 0,
    requested: writeItems.length,
    code: prepared.opts.dryRun ? 'DRY_RUN' : 'SEM_ALTERACOES'
  };
  var lock = null;
  try {
    if (!prepared.opts.dryRun && writeItems.length) {
      lock = LockService.getScriptLock();
      if (!lock.tryLock(30000)) throw new Error('Nao foi possivel obter lock para sincronizar o Firestore.');
      var batchSet = atividadesV2_firestoreRequireCoreMethod_('coreFirestoreBatchSetDocuments');
      write = batchSet(writeItems, { dryRun: false, merge: true });
      if (!write || write.ok !== true) throw new Error('Firestore rejeitou sincronizacao: ' + String(write && write.code || 'SEM_CODIGO'));
    }
    var result = {
      ok: true,
      dryRun: prepared.opts.dryRun,
      collection: spec.collection,
      idAtividade: prepared.opts.idAtividade || '',
      source: spec.source,
      schemaVersion: spec.schemaVersion,
      totalLido: prepared.totalRead,
      totalElegivel: prepared.totalEligible,
      totalSelecionado: prepared.totalSelected,
      totalIgnorado: prepared.totalIgnored,
      totalSolicitado: writeItems.length,
      totalEscrito: prepared.opts.dryRun ? 0 : Number(write.written || 0),
      totalQueSeriaEscrito: prepared.opts.dryRun ? writeItems.length : 0,
      totalPuladoIdentico: skipped,
      totalMarcadoObsoleto: staleFromMissingId,
      escopoCompleto: prepared.datasetComplete,
      escopoSincronizacao: prepared.syncScope,
      motivosBloqueio: prepared.reasons,
      sourceHash: prepared.selected[0] ? prepared.selected[0].document.sourceHash : '',
      exemplo: atividadesV2_firestoreSafeExample_(prepared.selected[0] && prepared.selected[0].document),
      warnings: warnings,
      firestore: { code: String(write.code || ''), ok: write.ok === true }
    };
    if (!prepared.opts.dryRun) {
      var logAction = staleFromMissingId
        ? 'FIRESTORE_' + spec.code + '_STALE_MARK'
        : 'FIRESTORE_' + spec.code + (prepared.syncScope === 'ID' ? '_INCREMENTAL_SYNC' : '_SYNC');
      atividadesV2_firestoreLogResult_(prepared.spreadsheet, logAction, result);
    }
    return result;
  } catch (err) {
    return {
      ok: false,
      dryRun: prepared.opts.dryRun,
      collection: spec.collection,
      errorCode: 'FIRESTORE_' + spec.code + '_SYNC_FALHOU',
      message: String(err && err.message || err || '').slice(0, 500),
      totalEscrito: 0,
      warnings: warnings
    };
  } finally {
    if (lock) lock.releaseLock();
  }
}

function atividadesV2_firestoreDiagnoseReadModelBySpec_(spec, options) {
  return atividadesV2_firestoreSyncReadModelBySpec_(spec, Object.assign({}, options || {}, { dryRun: true }));
}

function atividadesV2_firestoreStaleReason_(document) {
  var status = atividades_normalizeTextUpper_(document && (document.statusOperacional || document.statusPublicacaoPortal));
  var visibility = atividades_normalizeTextUpper_(document && document.visibilidadePortal);
  if (status === 'CANCELADA') return 'CANCELADO';
  if (visibility === 'OCULTA' || status === 'OCULTA') return 'OCULTO';
  return 'REMOVIDO_DA_VIEW';
}

/** Motor generico de reconciliacao por IDs atuais da fonte e IDs da colecao. */
function atividadesV2_firestoreReconcileReadModelBySpec_(spec, options) {
  var opts = atividadesV2_firestoreOptions_(Object.assign({}, options || {}, { idAtividade: '' }));
  if (['MARK_STALE', 'DELETE'].indexOf(opts.mode) < 0) opts.mode = 'MARK_STALE';
  var prepared = spec.prepare(Object.assign({}, options || {}, { idAtividade: '', limit: 0, dryRun: true }));
  var eligible = {};
  (prepared.eligibleIds || []).forEach(function(id) { eligible[id] = true; });
  var existing;
  try {
    existing = atividadesV2_firestoreListCollection_(spec.collection);
  } catch (err) {
    return {
      ok: false,
      dryRun: opts.dryRun,
      errorCode: 'FIRESTORE_' + spec.code + '_RECONCILIACAO_FALHOU',
      message: String(err && err.message || err || '').slice(0, 500)
    };
  }
  var staleCandidates = existing.filter(function(item) {
    if (!item.id || eligible[String(item.id).toUpperCase()]) return false;
    if (opts.mode === 'DELETE') return true;
    return !(item.data && item.data.stale === true && item.data.ativoNoReadModel === false);
  });
  if (opts.limit) staleCandidates = staleCandidates.slice(0, opts.limit);
  var nowIso = new Date().toISOString();
  var markItems = staleCandidates.map(function(item) {
    return {
      path: spec.collection + '/' + item.id,
      data: {
        ativoNoReadModel: false,
        stale: true,
        staleReason: atividadesV2_firestoreStaleReason_(item.data || {}),
        staleDetectedAt: nowIso,
        cacheUpdatedAt: nowIso,
        datasetComplete: false,
        syncScope: 'RECONCILIATION'
      }
    };
  });
  var totalWritten = 0;
  var errors = [];
  var lock = null;
  try {
    if (!opts.dryRun && staleCandidates.length) {
      lock = LockService.getScriptLock();
      if (!lock.tryLock(30000)) throw new Error('Nao foi possivel obter lock para reconciliar o Firestore.');
      if (opts.mode === 'DELETE') {
        var deleteDocument = atividadesV2_firestoreRequireCoreMethod_('coreFirestoreDeleteDocument');
        staleCandidates.forEach(function(item) {
          var deleted = deleteDocument(spec.collection + '/' + item.id, { dryRun: false });
          if (deleted && deleted.ok === true) totalWritten++;
          else errors.push(String(deleted && deleted.code || 'FIRESTORE_DELETE_FALHOU'));
        });
      } else {
        var batchSet = atividadesV2_firestoreRequireCoreMethod_('coreFirestoreBatchSetDocuments');
        atividadesV2_firestoreChunk_(markItems, 500).forEach(function(chunk) {
          var marked = batchSet(chunk, { dryRun: false, merge: true });
          if (!marked || marked.ok !== true) throw new Error('Firestore rejeitou marcacao stale: ' + String(marked && marked.code || 'SEM_CODIGO'));
          totalWritten += Number(marked.written || 0);
        });
      }
    }
    var result = {
      ok: errors.length === 0,
      dryRun: opts.dryRun,
      collection: spec.collection,
      schemaVersion: spec.schemaVersion,
      mode: opts.mode,
      escopoSincronizacao: 'RECONCILIATION',
      totalLidoView: prepared.totalRead,
      totalElegivel: prepared.totalEligible,
      totalFirestore: existing.length,
      totalObsoleto: staleCandidates.length,
      totalMarcadoObsoleto: opts.mode === 'MARK_STALE' ? totalWritten : 0,
      totalQueSeriaMarcadoObsoleto: opts.dryRun && opts.mode === 'MARK_STALE' ? staleCandidates.length : 0,
      totalDeletado: opts.mode === 'DELETE' ? totalWritten : 0,
      totalQueSeriaDeletado: opts.dryRun && opts.mode === 'DELETE' ? staleCandidates.length : 0,
      exemplos: staleCandidates.slice(0, 10).map(function(item) {
        return { idAtividade: item.id, staleReason: atividadesV2_firestoreStaleReason_(item.data || {}) };
      }),
      erros: errors,
      warnings: prepared.warnings
    };
    if (!opts.dryRun) atividadesV2_firestoreLogResult_(prepared.spreadsheet, 'FIRESTORE_' + spec.code + '_RECONCILIACAO', result);
    return result;
  } catch (err) {
    return {
      ok: false,
      dryRun: opts.dryRun,
      errorCode: 'FIRESTORE_' + spec.code + '_RECONCILIACAO_FALHOU',
      message: String(err && err.message || err || '').slice(0, 500),
      totalMarcadoObsoleto: 0,
      totalDeletado: 0
    };
  } finally {
    if (lock) lock.releaseLock();
  }
}

function atividadesV2_firestoreLogResult_(spreadsheet, action, result) {
  try {
    atividadesV2_appendV2Log_(spreadsheet, {
      FLUXO: 'FIRESTORE_READ_MODEL_V2',
      ACAO: action,
      NIVEL: result.ok ? 'INFO' : 'WARN',
      STATUS: result.ok ? 'OK' : 'COM_ERROS',
      ID_ATIVIDADE: result.idAtividade || '',
      MENSAGEM: 'Operacao controlada de read model Firestore concluida.',
      DETALHES_JSON: atividadesV2_safeLogData_({
        collection: result.collection,
        dryRun: result.dryRun,
        syncScope: result.escopoSincronizacao,
        totalSelected: result.totalSelecionado,
        totalWritten: result.totalEscrito,
        totalSkippedIdentical: result.totalPuladoIdentico,
        totalStale: result.totalMarcadoObsoleto,
        totalDeleted: result.totalDeletado,
        errorCode: result.errorCode || ''
      })
    });
  } catch (logErr) {
    Logger.log('GEAPA-ATIVIDADES-V2 FIRESTORE LOG WARN: ' + String(logErr && logErr.message || logErr).slice(0, 240));
  }
}

function atividadesV2_firestoreDiagnosticarCalendarioDev_(options) {
  var result = atividadesV2_firestoreDiagnoseReadModelBySpec_(atividadesV2_firestoreCalendarSpec_(), options || {});
  result.camposIncluidos = atividadesV2_firestoreCalendarAllowedFields_();
  result.camposRemovidos = atividadesV2_firestoreCalendarRemovedFields_();
  result.camposProibidos = ['CPF', 'TELEFONE', 'EMAIL', 'PRESENCA_INDIVIDUAL', 'JUSTIFICATIVA', 'SPREADSHEET_ID', 'LOG', 'TOKEN'];
  result.exemploDocumento = result.exemplo || null;
  return result;
}

function atividadesV2_firestoreSyncCalendarioDev_(options) {
  var opts = options || {};
  var result = atividadesV2_firestoreSyncReadModelBySpec_(atividadesV2_firestoreCalendarSpec_(), opts);
  if (result && result.ok === true && result.escopoCompleto === true && !opts.idAtividade && !opts.limit) {
    result.snapshot = atividadesV2_firestoreSyncCalendarioSnapshotDev_({
      dryRun: result.dryRun !== false,
      reason: opts.reason || 'CALENDARIO_COMPLETO'
    });
    result.ok = result.snapshot && result.snapshot.ok === true;
  }
  return result;
}

function atividadesV2_firestoreLatestSourceUpdatedAt_(documents, fallback) {
  var latestText = '';
  var latestMs = 0;
  (documents || []).forEach(function(document) {
    var text = String(document && document.sourceUpdatedAt || '').trim();
    var parsed = text ? new Date(text) : null;
    if (!parsed || isNaN(parsed.getTime()) || parsed.getTime() <= latestMs) return;
    latestMs = parsed.getTime();
    latestText = parsed.toISOString();
  });
  return latestText || String(fallback || '');
}

function atividadesV2_firestoreBuildCalendarSnapshot_(prepared, now) {
  var updatedAt = now || new Date();
  var atividades = (prepared && prepared.selected || []).map(function(item) {
    return item.document;
  });
  var snapshot = {
    schemaVersion: ATIVIDADES_V2_FIRESTORE_CALENDAR_SNAPSHOT_SCHEMA_VERSION,
    source: 'PORTAL_ATIVIDADES_CALENDARIO',
    sourceSystem: 'geapa-atividades',
    datasetComplete: prepared && prepared.datasetComplete === true,
    stale: false,
    cacheUpdatedAt: updatedAt.toISOString(),
    sourceUpdatedAt: atividadesV2_firestoreLatestSourceUpdatedAt_(atividades, updatedAt.toISOString()),
    total: atividades.length,
    atividades: atividades
  };
  snapshot.sourceHash = atividadesV2_firestoreBuildSourceHash_(
    snapshot,
    ATIVIDADES_V2_FIRESTORE_SNAPSHOT_HASH_IGNORED_FIELDS
  );
  snapshot.sourceVersion = atividadesV2_firestoreBuildSourceVersion_(snapshot.schemaVersion, snapshot.sourceHash);
  return snapshot;
}

/** Materializa um unico documento publico com o calendario completo. */
function atividadesV2_firestoreSyncCalendarioSnapshotDev_(options) {
  var opts = options || {};
  var dryRun = opts.dryRun !== false;
  if (opts.idAtividade || opts.limit) {
    return {
      ok: false,
      dryRun: dryRun,
      errorCode: 'FIRESTORE_SNAPSHOT_EXIGE_ESCOPO_COMPLETO',
      totalEscrito: 0
    };
  }

  var prepared;
  try {
    prepared = atividadesV2_firestorePrepareCalendar_({ dryRun: dryRun });
  } catch (prepareErr) {
    return {
      ok: false,
      dryRun: dryRun,
      errorCode: 'FIRESTORE_SNAPSHOT_FONTE_INDISPONIVEL',
      message: String(prepareErr && prepareErr.message || prepareErr || '').slice(0, 500),
      totalEscrito: 0
    };
  }
  if (!prepared.datasetComplete || prepared.syncScope !== 'FULL') {
    return {
      ok: false,
      dryRun: dryRun,
      errorCode: 'FIRESTORE_SNAPSHOT_DATASET_PARCIAL',
      totalElegivel: prepared.totalEligible,
      totalEscrito: 0
    };
  }
  if (!prepared.selected.length) {
    return {
      ok: false,
      dryRun: dryRun,
      errorCode: 'FIRESTORE_SNAPSHOT_SEM_ATIVIDADES',
      totalElegivel: 0,
      totalEscrito: 0
    };
  }

  var snapshot = atividadesV2_firestoreBuildCalendarSnapshot_(prepared, new Date());
  var approxBytes = JSON.stringify(snapshot).length;
  if (approxBytes > ATIVIDADES_V2_FIRESTORE_CALENDAR_SNAPSHOT_MAX_BYTES) {
    return {
      ok: false,
      dryRun: dryRun,
      errorCode: 'FIRESTORE_SNAPSHOT_LIMITE_TAMANHO',
      tamanhoAproximadoBytes: approxBytes,
      limiteBytes: ATIVIDADES_V2_FIRESTORE_CALENDAR_SNAPSHOT_MAX_BYTES,
      totalEscrito: 0
    };
  }

  var path = ATIVIDADES_V2_FIRESTORE_CALENDAR_SNAPSHOT_COLLECTION + '/' +
    ATIVIDADES_V2_FIRESTORE_CALENDAR_SNAPSHOT_ID;
  var write = { ok: true, written: false, code: 'DRY_RUN' };
  var lock = null;
  try {
    if (!dryRun) {
      lock = LockService.getScriptLock();
      if (!lock.tryLock(30000)) throw new Error('Nao foi possivel obter lock para gravar o snapshot do calendario.');
      var setDocument = atividadesV2_firestoreRequireCoreMethod_('coreFirestoreSetDocument');
      write = setDocument(path, snapshot, { dryRun: false, merge: false });
      if (!write || write.ok !== true) {
        throw new Error('Firestore rejeitou snapshot: ' + String(write && write.code || 'SEM_CODIGO'));
      }
    }
    var result = {
      ok: true,
      dryRun: dryRun,
      path: path,
      schemaVersion: snapshot.schemaVersion,
      datasetComplete: snapshot.datasetComplete,
      total: snapshot.total,
      sourceHash: snapshot.sourceHash,
      sourceUpdatedAt: snapshot.sourceUpdatedAt,
      cacheUpdatedAt: snapshot.cacheUpdatedAt,
      tamanhoAproximadoBytes: approxBytes,
      totalEscrito: dryRun ? 0 : 1,
      totalQueSeriaEscrito: dryRun ? 1 : 0,
      camposProibidosIncluidos: [],
      firestore: { ok: write.ok === true, code: String(write.code || '') }
    };
    if (!dryRun) atividadesV2_firestoreLogResult_(prepared.spreadsheet, 'FIRESTORE_CALENDARIO_SNAPSHOT_SYNC', result);
    return result;
  } catch (err) {
    return {
      ok: false,
      dryRun: dryRun,
      path: path,
      errorCode: 'FIRESTORE_CALENDARIO_SNAPSHOT_SYNC_FALHOU',
      message: String(err && err.message || err || '').slice(0, 500),
      totalEscrito: 0
    };
  } finally {
    if (lock) lock.releaseLock();
  }
}

function atividadesV2_firestoreDiagnosticarReconciliacaoCalendarioDev_(options) {
  return atividadesV2_firestoreReconcileReadModelBySpec_(
    atividadesV2_firestoreCalendarSpec_(),
    Object.assign({}, options || {}, { dryRun: true })
  );
}

function atividadesV2_firestoreAplicarReconciliacaoCalendarioDev_(options) {
  var opts = Object.assign({}, options || {});
  opts.dryRun = opts.dryRun === true;
  return atividadesV2_firestoreReconcileReadModelBySpec_(
    atividadesV2_firestoreCalendarSpec_(),
    opts
  );
}

/** Sincronizacao incremental nao bloqueante para pos-processamento de acoes oficiais. */
function atividadesV2_firestoreSyncCalendarioPorAtividadeSafe_(idAtividade, options) {
  var opts = options || {};
  var id = String(idAtividade || '').trim().toUpperCase();
  if (opts.enabled === false) return { ok: true, synced: false, skipped: true, reason: 'DISABLED', idAtividade: id };
  if (!id) return { ok: false, synced: false, nonBlocking: true, errorCode: 'ID_ATIVIDADE_AUSENTE' };
  try {
    var result = atividadesV2_firestoreSyncCalendarioDev_({
      idAtividade: id,
      dryRun: false,
      compareExisting: true,
      markMissingStale: true,
      forceRefresh: true,
      reason: opts.reason || ''
    });
    if (!result || result.ok !== true) throw new Error(result && result.message || result && result.errorCode || 'Falha sem detalhe.');
    return {
      ok: true,
      synced: Number(result.totalEscrito || 0) > 0 || Number(result.totalMarcadoObsoleto || 0) > 0,
      skippedIdentical: Number(result.totalPuladoIdentico || 0) > 0,
      idAtividade: id,
      collection: ATIVIDADES_V2_FIRESTORE_CALENDAR_COLLECTION,
      reason: String(opts.reason || '').trim(),
      syncScope: 'ID',
      totalEscrito: Number(result.totalEscrito || 0),
      totalMarcadoObsoleto: Number(result.totalMarcadoObsoleto || 0)
    };
  } catch (err) {
    var message = String(err && err.message || err || '').slice(0, 400);
    Logger.log('GEAPA-ATIVIDADES-V2 FIRESTORE INCREMENTAL WARN [' + id + ']: ' + message);
    return {
      ok: false,
      synced: false,
      nonBlocking: true,
      idAtividade: id,
      collection: ATIVIDADES_V2_FIRESTORE_CALENDAR_COLLECTION,
      reason: String(opts.reason || '').trim(),
      errorCode: 'FIRESTORE_INCREMENTAL_SYNC_FALHOU',
      message: message
    };
  }
}

function atividadesV2_firestoreCalendarAllowedFields_() {
  return Object.keys(atividadesV2_firestoreBuildCalendarDocument_({}, new Date(0), {}));
}

function atividadesV2_firestoreCalendarRemovedFields_() {
  var used = [
    'ID_ATIVIDADE', 'TITULO_PUBLICO', 'TITULO_CONTEUDO_PUBLICO', 'TIPO_ATIVIDADE',
    'TIPO_PUBLICO', 'SUBTIPO_ATIVIDADE', 'DATA_ATIVIDADE', 'HORARIO_INICIO',
    'HORARIO_FIM', 'LOCAL', 'CICLO', 'ANO', 'SEMESTRE', 'STATUS_OPERACIONAL',
    'STATUS_PUBLICACAO_PORTAL', 'STATUS_PUBLICO', 'VISIBILIDADE_PORTAL',
    'CLASSIFICACAO_ACESSO', 'POSSUI_APRESENTACOES', 'QTD_APRESENTACOES',
    'STATUS_TITULO_EIXO', 'STATUS_MATERIAL', 'STATUS_FOTO', 'FORMATO',
    'CONTA_PRESENCA', 'CONTA_FALTA', 'GERA_CERTIFICADO', 'PODE_VER_DETALHES',
    'ULTIMA_ATUALIZACAO'
  ];
  return (ATIVIDADES_V2_SCHEMA.PORTAL_ATIVIDADES_CALENDARIO || []).filter(function(field) {
    return used.indexOf(field) < 0;
  });
}

function atividadesV2_firestoreChunk_(values, size) {
  var source = values || [];
  var chunkSize = Math.max(1, Math.floor(Number(size || 500)));
  var result = [];
  for (var i = 0; i < source.length; i += chunkSize) result.push(source.slice(i, i + chunkSize));
  return result;
}
