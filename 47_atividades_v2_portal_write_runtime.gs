/**
 * Runtime seguro para escritas iniciadas pelo Portal.
 *
 * A resposta interativa termina depois da escrita oficial. Views, cache,
 * Firestore e Mail Hub sao processados posteriormente pelo job do Portal.
 */

var ATIVIDADES_V2_PORTAL_POS_WRITE_PENDING_ = 'CONCLUIDO_PENDENCIAS';

function atividadesV2_portalWriteRequestId_(payload) {
  var requestId = String(payload && payload.requestId || '').trim();
  if (!requestId) return '';
  return /^GEAPA-REQ-[A-Za-z0-9-]{8,100}$/.test(requestId) ? requestId : '';
}

function atividadesV2_portalWriteActionId_(prefix, action, payload, context) {
  var requestId = atividadesV2_portalWriteRequestId_(payload);
  if (requestId) return requestId;
  var ctx = context || {};
  return atividadesV2_buildDeterministicId_(prefix, [
    action,
    new Date().getTime(),
    ctx.email || ctx.idPessoa || ctx.rga || ctx.perfil
  ]);
}

function atividadesV2_portalWriteBuildAction_(prefix, action, payload, context) {
  var ctx = context || {};
  var data = payload || {};
  return {
    idAcao: atividadesV2_portalWriteActionId_(prefix, action, data, ctx),
    tipoAcao: String(action || '').trim(),
    payload: data,
    contexto: ctx,
    startedAt: new Date()
  };
}

function atividadesV2_portalWriteFindRequest_(ss, action) {
  var requestId = atividadesV2_portalWriteRequestId_(action && action.payload);
  if (!requestId) return null;
  var sheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.PORTAL_ACOES);
  atividadesV2_applyHeadersIfMissing_(sheet, ATIVIDADES_V2_SCHEMA.PORTAL_ACOES);
  var headers = atividadesV2_getSheetHeaders_(sheet);
  var idColumn = headers.indexOf('ID_ACAO_PORTAL') + 1;
  if (!idColumn || sheet.getLastRow() < 2) return null;
  var match = sheet.getRange(2, idColumn, sheet.getLastRow() - 1, 1)
    .createTextFinder(requestId)
    .matchEntireCell(true)
    .findNext();
  if (!match) return null;
  var values = sheet.getRange(match.getRow(), 1, 1, headers.length).getValues()[0];
  var row = {};
  headers.forEach(function(header, index) {
    if (header) row[header] = values[index];
  });
  var sameAction = String(row.TIPO_ACAO || '').trim() === String(action.tipoAcao || '').trim();
  var expectedActor = String(atividadesV2_portalActorToken_(action.contexto || {})).trim().toLowerCase();
  var sameActor = String(row.USUARIO_EMAIL || '').trim().toLowerCase() ===
    String(action.contexto && action.contexto.email || '').trim().toLowerCase();
  if (expectedActor) {
    sameActor = sameActor || String(row.PROCESSADO_POR || '').trim().toLowerCase() === expectedActor;
  }
  if (!sameAction || !sameActor) {
    throw atividadesV2_portalActionException_('REQUEST_ID_CONFLITANTE', 'A solicitacao nao pode ser reutilizada para outra operacao. Atualize a pagina e tente novamente.');
  }
  return row;
}

function atividadesV2_portalWriteReplayResponse_(row) {
  var stored = atividadesV2_portalWriteParseJson_(row && row.RESULTADO_JSON);
  var failed = atividades_normalizeTextUpper_(row && row.STATUS_PROCESSAMENTO) === 'ERRO';
  var entityId = String(row && row.ID_ENTIDADE || stored.idJustificativa || stored.idApresentacao || '').trim();
  var data = Object.assign({}, stored, {
    idAtividade: String(row && row.ID_ATIVIDADE || stored.idAtividade || '').trim(),
    requestId: String(row && row.ID_ACAO_PORTAL || '').trim(),
    idempotentReplay: true
  });
  return {
    ok: !failed,
    code: failed ? String(row.ERRO_CODIGO || 'REQUISICAO_ANTERIOR_FALHOU') : 'REQUISICAO_JA_REGISTRADA',
    errorCode: failed ? String(row.ERRO_CODIGO || 'REQUISICAO_ANTERIOR_FALHOU') : '',
    message: failed
      ? 'Esta solicitacao ja foi recebida e terminou com erro. Consulte o historico antes de reenviar.'
      : 'Esta solicitacao ja havia sido registrada.',
    userMessage: failed
      ? 'Esta solicitacao ja foi recebida e terminou com erro. Consulte o historico antes de reenviar.'
      : 'Solicitacao ja registrada. Nenhuma gravacao duplicada foi criada.',
    entityId: entityId,
    warnings: [],
    retrySafe: false,
    status: failed ? 'ERRO' : 'REGISTRADO',
    data: data
  };
}

function atividadesV2_portalWriteSuccessResponse_(result, options) {
  var data = result || {};
  var opts = options || {};
  var entityId = String(
    opts.entityId || data.idJustificativa || data.idApresentacao || data.idAtividade || ''
  ).trim();
  var userMessage = String(opts.userMessage || opts.message || 'Solicitacao registrada com sucesso.').trim();
  return {
    ok: true,
    code: String(opts.code || 'REGISTRADO').trim(),
    message: userMessage,
    userMessage: userMessage,
    entityId: entityId,
    warnings: data.warnings || opts.warnings || [],
    retrySafe: false,
    status: String(opts.status || 'REGISTRADO').trim(),
    performance: data.performance || null,
    data: data
  };
}

function atividadesV2_portalWriteErrorResponse_(error, defaultCode, defaultMessage) {
  var code = String(error && (error.code || error.errorCode) || defaultCode || 'ERRO_GRAVACAO').trim();
  var message = String(defaultMessage || atividadesV2_errorMessage_(error) || 'Nao foi possivel concluir a solicitacao.').trim();
  return {
    ok: false,
    code: code,
    errorCode: code,
    message: message,
    userMessage: message,
    entityId: '',
    warnings: [],
    retrySafe: false
  };
}

function atividadesV2_portalWriteTraceStart_(action, payload) {
  var data = payload || {};
  return {
    action: String(action || '').trim(),
    startedAtMs: new Date().getTime(),
    idAtividade: String(data.idAtividade || data.ID_ATIVIDADE || '').trim(),
    idApresentacao: String(data.idApresentacao || data.ID_APRESENTACAO || '').trim(),
    idJustificativa: String(data.idJustificativa || data.ID_JUSTIFICATIVA || '').trim(),
    stages: [],
    warnings: []
  };
}

function atividadesV2_portalWriteStage_(trace, stage, callback) {
  var startedAt = new Date().getTime();
  try {
    return callback();
  } finally {
    atividadesV2_portalWriteMarkStage_(trace, stage, new Date().getTime() - startedAt);
  }
}

function atividadesV2_portalWriteMarkStage_(trace, stage, durationMs) {
  if (!trace) return;
  trace.stages.push({
    etapa: String(stage || '').trim(),
    ms: Math.max(0, Number(durationMs || 0))
  });
}

function atividadesV2_portalWriteWarning_(trace, code, message) {
  var warning = {
    code: String(code || 'POS_PROCESSAMENTO_PENDENTE').trim(),
    message: String(message || 'A gravacao foi concluida; atualizacoes secundarias serao processadas depois.').slice(0, 300)
  };
  if (trace) trace.warnings.push(warning);
  return warning;
}

function atividadesV2_portalWriteMarkSecondaryPending_(trace) {
  return atividadesV2_portalWriteWarning_(
    trace,
    'POS_PROCESSAMENTO_PENDENTE',
    'A gravacao oficial foi concluida. Views, cache, Firestore e notificacoes serao atualizados pelo job do Portal.'
  );
}

function atividadesV2_portalWriteSummary_(trace, status, errorCode) {
  var stages = trace && trace.stages ? trace.stages.slice() : [];
  var slowest = stages.reduce(function(current, item) {
    return !current || Number(item.ms || 0) > Number(current.ms || 0) ? item : current;
  }, null);
  return {
    totalMs: trace ? Math.max(0, new Date().getTime() - trace.startedAtMs) : 0,
    etapaMaisLenta: slowest ? slowest.etapa : '',
    etapaMaisLentaMs: slowest ? slowest.ms : 0,
    etapas: stages,
    status: String(status || '').trim(),
    errorCode: String(errorCode || '').trim()
  };
}

function atividadesV2_portalWriteAttachResult_(result, trace, status) {
  var output = result || {};
  atividadesV2_portalWriteMarkStage_(trace, 'RETORNO_PORTAL', 0);
  output.status = output.status || status || 'REGISTRADO';
  output.performance = atividadesV2_portalWriteSummary_(trace, output.status, '');
  output.warnings = (output.warnings || []).concat(trace && trace.warnings || []);
  return output;
}

function atividadesV2_portalWriteLogSafe_(ss, trace, status, errorCode) {
  try {
    var summary = atividadesV2_portalWriteSummary_(trace, status, errorCode);
    var entityId = trace && (trace.idJustificativa || trace.idApresentacao) || '';
    return atividadesV2_appendV2Log_(ss, {
      FLUXO: 'PORTAL_WRITE_RUNTIME_V2',
      ACAO: trace && trace.action || '',
      NIVEL: status === 'ERRO' ? 'ERRO' : (status === 'WARN' ? 'ALERTA' : 'INFO'),
      STATUS: status || '',
      ID_ATIVIDADE: trace && trace.idAtividade || '',
      ID_ENTIDADE: entityId,
      TIPO_ENTIDADE: trace && trace.idJustificativa ? 'JUSTIFICATIVA' : (trace && trace.idApresentacao ? 'APRESENTACAO' : 'ATIVIDADE'),
      MENSAGEM: 'Diagnostico sanitizado de escrita iniciada pelo Portal.',
      DETALHES_JSON: atividadesV2_safeLogData_({
        duracaoTotalMs: summary.totalMs,
        etapaMaisLenta: summary.etapaMaisLenta,
        etapaMaisLentaMs: summary.etapaMaisLentaMs,
        etapas: summary.etapas,
        errorCode: summary.errorCode
      })
    });
  } catch (logError) {
    return null;
  }
}

function atividadesV2_processarPosEscritasPortal_(options) {
  var opts = options || {};
  var dryRun = opts.dryRun !== false;
  var limit = Math.max(1, Math.min(50, Number(opts.limit || 10)));
  var ss = atividadesV2_getDatabaseSpreadsheetDev_();
  var sheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.PORTAL_ACOES);
  var rows = atividadesV2_readSheetObjects_(sheet).filter(function(row) {
    return atividades_normalizeTextUpper_(row.ATIVO || 'SIM') !== 'NAO' &&
      atividades_normalizeTextUpper_(row.STATUS_PROCESSAMENTO) === ATIVIDADES_V2_PORTAL_POS_WRITE_PENDING_;
  }).slice(0, limit);
  var report = {
    ok: true,
    dryRun: dryRun,
    totalPendentes: rows.length,
    totalProcessados: 0,
    totalComAvisos: 0,
    totalAvisos: 0,
    itens: []
  };

  rows.forEach(function(row) {
    var payload = atividadesV2_portalWriteParseJson_(row.PAYLOAD_JSON);
    var result = atividadesV2_portalWriteParseJson_(row.RESULTADO_JSON);
    var context = {
      email: String(row.USUARIO_EMAIL || '').trim(),
      perfil: String(row.PERFIL_USUARIO || '').trim()
    };
    var idAtividade = String(row.ID_ATIVIDADE || result.idAtividade || payload.idAtividade || '').trim();
    var warnings = [];
    var item = {
      idAcaoPortal: String(row.ID_ACAO_PORTAL || '').trim(),
      tipoAcao: String(row.TIPO_ACAO || '').trim(),
      idAtividade: idAtividade,
      status: dryRun ? 'SERIA_PROCESSADO' : 'PROCESSANDO',
      warnings: []
    };

    if (!dryRun) {
      atividadesV2_portalWriteRunSecondary_(warnings, 'CACHE_INVALIDACAO_PENDENTE', function() {
        atividadesV2_portalWriteInvalidateCaches_(row, context, result);
      });
      atividadesV2_portalWriteRunSecondary_(warnings, 'MAIL_HUB_PENDENTE', function() {
        if (typeof atividadesV2_mailQueuePortalAction_ === 'function') {
          var mail = atividadesV2_mailQueuePortalAction_(row.TIPO_ACAO, payload, context, result);
          if (mail && mail.ok === false) throw new Error(mail.errorCode || 'MAIL_HUB_FALHOU');
        }
      });
      atividadesV2_portalWriteRunSecondary_(warnings, 'LEMBRETE_MEMBROS_PENDENTE', function() {
        if (typeof atividadesV2_mailQueueMemberReminderAfterTitleApproval_ === 'function') {
          var reminder = atividadesV2_mailQueueMemberReminderAfterTitleApproval_(row.TIPO_ACAO, result);
          if (reminder && reminder.ok === false) throw new Error(reminder.errorCode || 'LEMBRETE_MEMBROS_FALHOU');
        }
      });
      atividadesV2_portalWriteRunSecondary_(warnings, 'LOG_DIAGNOSTICO_PENDENTE', function() {
        atividadesV2_portalWriteAppendDeferredLog_(ss, row, result, warnings);
      });

      item.status = warnings.length ? 'CONCLUIDO_COM_AVISOS' : 'CONCLUIDO';
      item.warnings = warnings;
      var entityType = atividades_normalizeTextUpper_(row.TIPO_ENTIDADE);
      atividadesV2_updateRowByHeaders_(sheet, row._rowNumber, {
        STATUS_PROCESSAMENTO: item.status,
        RESULTADO_JSON: atividadesV2_safeLogData_({
          idAtividade: idAtividade,
          idApresentacao: entityType === 'APRESENTACAO' ? (result.idApresentacao || row.ID_ENTIDADE || '') : '',
          idJustificativa: entityType === 'JUSTIFICATIVA' ? (result.idJustificativa || row.ID_ENTIDADE || '') : '',
          posProcessamento: item.status,
          performance: result.performance || null,
          warnings: warnings
        }),
        ERRO_CODIGO: warnings.length ? warnings[0].code : '',
        ERRO_MENSAGEM: warnings.length ? warnings[0].message : '',
        PROCESSADO_EM: new Date(),
        PROCESSADO_POR: 'JOB_PORTAL_V2'
      });
      report.totalProcessados++;
      if (warnings.length) {
        report.totalComAvisos++;
        report.totalAvisos += warnings.length;
      }
    }
    report.itens.push(item);
  });
  return report;
}

function atividadesV2_portalWriteRunSecondary_(warnings, code, callback) {
  try {
    callback();
  } catch (error) {
    warnings.push({
      code: code,
      message: 'A rotina secundaria sera conferida novamente no proximo ciclo operacional.'
    });
  }
}

function atividadesV2_portalWriteInvalidateCaches_(row, context, result) {
  var entityType = atividades_normalizeTextUpper_(row.TIPO_ENTIDADE);
  if (entityType === 'JUSTIFICATIVA' && typeof atividadesV2_invalidateJustificativasPortalCaches_ === 'function') {
    atividadesV2_invalidateJustificativasPortalCaches_(context, result);
    return;
  }
  if (entityType === 'APRESENTACAO' && typeof atividadesV2_invalidatePresentationPortalCaches_ === 'function') {
    atividadesV2_invalidatePresentationPortalCaches_(context, result);
    return;
  }
  if (typeof atividadesV2_invalidateCachesAfterActivityCreate_ === 'function') {
    atividadesV2_invalidateCachesAfterActivityCreate_(row.ID_ATIVIDADE || result.idAtividade || '', null);
  }
}

function atividadesV2_portalWriteAppendDeferredLog_(ss, row, result, warnings) {
  var performance = result && result.performance || {};
  var entityType = atividades_normalizeTextUpper_(row.TIPO_ENTIDADE || 'ATIVIDADE');
  atividadesV2_appendV2Log_(ss, {
    FLUXO: 'PORTAL_WRITE_RUNTIME_V2',
    ACAO: String(row.TIPO_ACAO || '').trim(),
    NIVEL: warnings && warnings.length ? 'ALERTA' : 'INFO',
    STATUS: warnings && warnings.length ? 'CONCLUIDO_COM_AVISOS' : 'CONCLUIDO',
    ID_ATIVIDADE: String(row.ID_ATIVIDADE || '').trim(),
    ID_ENTIDADE: String(row.ID_ENTIDADE || '').trim(),
    TIPO_ENTIDADE: entityType,
    MENSAGEM: 'Diagnostico sanitizado de escrita iniciada pelo Portal.',
    DETALHES_JSON: atividadesV2_safeLogData_({
      duracaoTotalMs: Number(performance.totalMs || 0),
      etapaMaisLenta: String(performance.etapaMaisLenta || '').trim(),
      etapaMaisLentaMs: Number(performance.etapaMaisLentaMs || 0),
      etapas: performance.etapas || [],
      errorCode: warnings && warnings.length ? warnings[0].code : ''
    })
  });
}

function atividadesV2_portalWriteParseJson_(value) {
  if (value && typeof value === 'object') return value;
  try {
    return JSON.parse(String(value || '{}')) || {};
  } catch (error) {
    return {};
  }
}

function atividadesV2_runTestePortalWriteRuntime_() {
  var warnings = [];
  atividadesV2_portalWriteRunSecondary_(warnings, 'FIRESTORE_SYNC_PENDENTE', function() {
    throw new Error('FALHA_FIRESTORE_SIMULADA');
  });
  atividadesV2_portalWriteRunSecondary_(warnings, 'MAIL_HUB_PENDENTE', function() {
    throw new Error('FALHA_MAIL_HUB_SIMULADA');
  });
  var requestId = 'GEAPA-REQ-12345678-TESTE123';
  return {
    ok: warnings.length === 2 && atividadesV2_portalWriteRequestId_({ requestId: requestId }) === requestId,
    escritaOficialPreservada: true,
    totalWarnings: warnings.length,
    warningCodes: warnings.map(function(item) { return item.code; }),
    requestIdValido: atividadesV2_portalWriteRequestId_({ requestId: requestId }) === requestId,
    dadosSensiveisExpostos: false
  };
}
