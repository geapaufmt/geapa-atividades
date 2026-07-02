/**
 * Read model DEV do calendario de atividades no Firestore.
 * Sheets V2 continua sendo a fonte oficial; esta rotina apenas materializa cache.
 */

var ATIVIDADES_V2_FIRESTORE_CALENDAR_COLLECTION = 'portalActivities';
var ATIVIDADES_V2_FIRESTORE_CALENDAR_SCHEMA_VERSION = 'portal-activity-calendar-v2';
var ATIVIDADES_V2_FIRESTORE_MAX_DOCUMENTS = 500;
var ATIVIDADES_V2_FIRESTORE_RESTRICTED_ACCESS = Object.freeze([
  'ADMIN',
  'ADMINISTRACAO',
  'DIRETORIA',
  'GESTAO',
  'RESTRITA',
  'RESTRITO',
  'SECRETARIA'
]);

function atividadesV2_firestoreOptions_(options) {
  options = options || {};
  var limit = Math.max(0, Number(options.limit || 0));
  return {
    dryRun: options.dryRun !== false,
    limit: limit ? Math.min(limit, ATIVIDADES_V2_FIRESTORE_MAX_DOCUMENTS) : 0,
    idAtividade: String(options.idAtividade || '').trim().toUpperCase(),
    forceRefresh: options.forceRefresh === true
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
  if (typeof atividades_formatPortalDateIso_ === 'function') {
    return atividades_formatPortalDateIso_(value);
  }
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

function atividadesV2_firestoreBuildCalendarDocument_(record, now, metadata) {
  metadata = metadata || {};
  var updatedAt = now || new Date();
  var hasPresentation = atividadesV2_firestoreBoolean_(record.POSSUI_APRESENTACOES) || Number(record.QTD_APRESENTACOES || 0) > 0;
  var statusPublicacao = atividadesV2_firestoreText_(record.STATUS_PUBLICACAO_PORTAL || record.STATUS_PUBLICO, 80);
  var sourceUpdatedAt = atividadesV2_firestoreIso_(record.ULTIMA_ATUALIZACAO, updatedAt.toISOString());
  return Object.freeze({
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
    badges: atividadesV2_firestoreUniqueStrings_([
      record.TIPO_PUBLICO,
      record.FORMATO,
      hasPresentation ? 'APRESENTACAO' : ''
    ]),
    flags: Object.freeze({
      contaPresenca: atividadesV2_firestoreBoolean_(record.CONTA_PRESENCA),
      contaFalta: atividadesV2_firestoreBoolean_(record.CONTA_FALTA),
      geraCertificado: atividadesV2_firestoreBoolean_(record.GERA_CERTIFICADO),
      podeVerDetalhes: atividadesV2_firestoreBoolean_(record.PODE_VER_DETALHES)
    }),
    datasetComplete: metadata.datasetComplete === true,
    syncScope: atividadesV2_firestoreText_(metadata.syncScope || 'DIAGNOSTIC', 20),
    source: 'PORTAL_ATIVIDADES_CALENDARIO',
    sourceSystem: 'geapa-atividades',
    sourceUpdatedAt: sourceUpdatedAt,
    cacheUpdatedAt: updatedAt.toISOString(),
    schemaVersion: ATIVIDADES_V2_FIRESTORE_CALENDAR_SCHEMA_VERSION
  });
}

function atividadesV2_firestoreCalendarEligibility_(record) {
  var id = atividadesV2_firestoreText_(record.ID_ATIVIDADE).toUpperCase();
  if (!id) return { eligible: false, reason: 'ID_ATIVIDADE_AUSENTE' };
  if (!atividadesV2_isCanonicalActivityId_(id)) return { eligible: false, reason: 'ID_ATIVIDADE_INVALIDO' };

  var visibility = atividades_normalizeTextUpper_(record.VISIBILIDADE_PORTAL);
  if (visibility === 'OCULTA') return { eligible: false, reason: 'VISIBILIDADE_OCULTA' };

  var status = atividades_normalizeTextUpper_(record.STATUS_PUBLICACAO_PORTAL || record.STATUS_PUBLICO);
  if (['RASCUNHO', 'OCULTA', 'CANCELADA'].indexOf(status) >= 0) {
    return { eligible: false, reason: 'STATUS_NAO_PUBLICAVEL' };
  }

  var access = atividades_normalizeTextUpper_(record.CLASSIFICACAO_ACESSO);
  if (ATIVIDADES_V2_FIRESTORE_RESTRICTED_ACCESS.indexOf(access) >= 0) {
    return { eligible: false, reason: 'CLASSIFICACAO_RESTRITA' };
  }
  return { eligible: true, reason: '' };
}

function atividadesV2_firestorePrepareCalendar_(options) {
  var opts = atividadesV2_firestoreOptions_(options);
  var ss = atividadesV2_getDatabaseSpreadsheetDev_();
  var records = atividades_readPortalActivityRecordsV2Dev_(ss);
  var reasons = {};
  var ignored = 0;
  var selected = [];
  var now = new Date();

  records.forEach(function(record) {
    var id = atividadesV2_firestoreText_(record.ID_ATIVIDADE).toUpperCase();
    if (opts.idAtividade && id !== opts.idAtividade) return;
    var decision = atividadesV2_firestoreCalendarEligibility_(record);
    if (!decision.eligible) {
      ignored++;
      reasons[decision.reason] = (reasons[decision.reason] || 0) + 1;
      return;
    }
    selected.push({ record: record });
  });

  var totalEligible = selected.length;
  if (opts.limit) selected = selected.slice(0, opts.limit);
  if (selected.length > ATIVIDADES_V2_FIRESTORE_MAX_DOCUMENTS) {
    selected = selected.slice(0, ATIVIDADES_V2_FIRESTORE_MAX_DOCUMENTS);
  }

  var datasetComplete = !opts.idAtividade && !opts.limit && totalEligible <= ATIVIDADES_V2_FIRESTORE_MAX_DOCUMENTS;
  var syncScope = opts.idAtividade ? 'ID' : (opts.limit ? 'LIMIT' : (datasetComplete ? 'FULL' : 'TRUNCATED'));
  selected = selected.map(function(item) {
    return {
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
  if (totalEligible > ATIVIDADES_V2_FIRESTORE_MAX_DOCUMENTS && !opts.limit) {
    warnings.push('TOTAL_ELEGIVEL_LIMITADO_A_500_DOCUMENTOS');
  }

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
    selected: selected,
    warnings: warnings
  };
}

function atividadesV2_firestoreCalendarAllowedFields_() {
  return Object.keys(atividadesV2_firestoreBuildCalendarDocument_({}, new Date(0)));
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

function atividadesV2_firestoreDiagnosticarCalendarioDev_(options) {
  try {
    var prepared = atividadesV2_firestorePrepareCalendar_(Object.assign({}, options || {}, { dryRun: true }));
    var docs = prepared.selected.map(function(item) { return item.document; });
    var sizes = docs.map(function(doc) { return JSON.stringify(doc).length; });
    var warnings = prepared.warnings.slice();
    if (ATIVIDADES_V2_SCHEMA.PORTAL_ATIVIDADES_CALENDARIO.indexOf('STATUS_OPERACIONAL') < 0) {
      warnings.push('STATUS_OPERACIONAL_NAO_DISPONIVEL_NA_VIEW');
    }
    warnings.push('DOCUMENTOS_REMOVIDOS_DA_VIEW_NAO_SAO_APAGADOS_NESTE_PACOTE');
    return {
      ok: true,
      dryRun: true,
      readOnly: true,
      source: ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_CALENDARIO,
      collection: ATIVIDADES_V2_FIRESTORE_CALENDAR_COLLECTION,
      totalLido: prepared.totalRead,
      totalElegivel: prepared.totalEligible,
      totalSelecionado: prepared.totalSelected,
      totalIgnorado: prepared.totalIgnored,
      escopoCompleto: prepared.datasetComplete,
      escopoSincronizacao: prepared.syncScope,
      motivosBloqueio: prepared.reasons,
      exemploDocumento: docs[0] || null,
      tamanhoAproximadoBytes: {
        total: sizes.reduce(function(total, size) { return total + size; }, 0),
        maiorDocumento: sizes.length ? Math.max.apply(Math, sizes) : 0
      },
      camposIncluidos: atividadesV2_firestoreCalendarAllowedFields_(),
      camposRemovidos: atividadesV2_firestoreCalendarRemovedFields_(),
      camposProibidos: ['CPF', 'TELEFONE', 'EMAIL', 'PRESENCA_INDIVIDUAL', 'JUSTIFICATIVA', 'SPREADSHEET_ID', 'LOG', 'TOKEN'],
      warnings: warnings
    };
  } catch (err) {
    return {
      ok: false,
      dryRun: true,
      readOnly: true,
      errorCode: 'FIRESTORE_CALENDARIO_DIAGNOSTICO_FALHOU',
      message: String(err && err.message || err || '').slice(0, 500)
    };
  }
}

function atividadesV2_firestoreSyncCalendarioDev_(options) {
  var prepared;
  var lock = null;
  try {
    prepared = atividadesV2_firestorePrepareCalendar_(options || {});
    if (typeof GEAPA_CORE === 'undefined' || !GEAPA_CORE || typeof GEAPA_CORE.coreFirestoreBatchSetDocuments !== 'function') {
      throw new Error('GEAPA_CORE sem coreFirestoreBatchSetDocuments. Publique uma nova versao do Core.');
    }

    if (!prepared.opts.dryRun) {
      lock = LockService.getScriptLock();
      if (!lock.tryLock(30000)) throw new Error('Nao foi possivel obter lock para sincronizar o Firestore.');
    }

    var items = prepared.selected.map(function(item) {
      return {
        path: ATIVIDADES_V2_FIRESTORE_CALENDAR_COLLECTION + '/' + item.document.idAtividade,
        data: item.document
      };
    });
    var write = GEAPA_CORE.coreFirestoreBatchSetDocuments(items, {
      dryRun: prepared.opts.dryRun,
      merge: true
    });
    var result = {
      ok: write.ok === true,
      dryRun: prepared.opts.dryRun,
      collection: ATIVIDADES_V2_FIRESTORE_CALENDAR_COLLECTION,
      totalLido: prepared.totalRead,
      totalElegivel: prepared.totalEligible,
      totalSelecionado: prepared.totalSelected,
      totalIgnorado: prepared.totalIgnored,
      totalSolicitado: items.length,
      totalEscrito: Number(write.written || 0),
      escopoCompleto: prepared.datasetComplete,
      escopoSincronizacao: prepared.syncScope,
      motivosBloqueio: prepared.reasons,
      warnings: prepared.warnings,
      firestore: {
        ok: write.ok === true,
        code: write.code || '',
        httpStatus: write.httpStatus || 0
      }
    };

    if (!prepared.opts.dryRun) {
      atividadesV2_appendV2Log_(prepared.spreadsheet, {
        FLUXO: 'FIRESTORE_CALENDARIO_V2',
        ACAO: 'Materializar calendario no Firestore',
        NIVEL: result.ok ? 'INFO' : 'ERRO',
        STATUS: result.ok ? 'OK' : 'ERRO',
        ID_ATIVIDADE: prepared.opts.idAtividade || '',
        MENSAGEM: result.ok ? 'Read model Firestore atualizado.' : 'Falha controlada ao atualizar read model Firestore.',
        DETALHES_JSON: atividadesV2_safeLogData_({
          totalSolicitado: result.totalSolicitado,
          totalEscrito: result.totalEscrito,
          totalIgnorado: result.totalIgnorado,
          code: result.firestore.code
        })
      });
    }
    return result;
  } catch (err) {
    return {
      ok: false,
      dryRun: prepared ? prepared.opts.dryRun : true,
      errorCode: 'FIRESTORE_CALENDARIO_SYNC_FALHOU',
      message: String(err && err.message || err || '').slice(0, 500),
      totalEscrito: 0
    };
  } finally {
    if (lock) lock.releaseLock();
  }
}
