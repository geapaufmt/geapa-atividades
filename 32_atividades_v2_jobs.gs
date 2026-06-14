/**
 * Jobs V2 do portal de Atividades.
 *
 * Nenhum trigger e instalado automaticamente. O job usa DEV, respeita
 * MODULOS_CONFIG pelos wrappers publicos e retorna apenas resumo seguro.
 */

var ATIVIDADES_V2_JOB_PORTAL = Object.freeze({
  flow: 'ATUALIZACAO_PORTAL_V2',
  conferFlow: 'CONFERENCIA_V2',
  handler: 'atividadesV2_jobPortalTrigger',
  hour: 5
});

function atividadesV2_jobPortalOptions_(options, guard) {
  options = options || {};
  var executionType = String(options.executionType || 'MANUAL').trim().toUpperCase();
  var modeRead = guard && guard.modeRead ? String(guard.modeRead || '').trim().toUpperCase() : '';
  var dryRun = executionType === 'TRIGGER'
    ? (options.dryRun === true || modeRead === 'DRY_RUN' || !modeRead)
    : (options.dryRun !== false || modeRead === 'DRY_RUN');

  return {
    dryRun: dryRun,
    executionType: executionType,
    nonDestructive: true,
    stopOnError: options.stopOnError !== false,
    limit: Math.max(1, Number(options.limit || 5))
  };
}

function atividadesV2_jobPortal_(options) {
  var opts = Object.assign({}, options || {}, {
    nonDestructive: true
  });
  var startedAt = new Date();
  var result = {
    ok: true,
    modulo: ATIVIDADES_CFG.MODULE_CODE,
    fluxo: ATIVIDADES_V2_JOB_PORTAL.flow,
    dryRun: opts.dryRun === true,
    executionType: String(opts.executionType || 'MANUAL').trim().toUpperCase(),
    startedAt: startedAt,
    finishedAt: '',
    durationMs: 0,
    steps: [],
    totals: {
      ok: 0,
      warnings: 0,
      errors: 0,
      skipped: 0
    }
  };

  atividadesV2_jobRunStep_(result, 'ATUALIZAR_VIEWS_PORTAL', function() {
    return atividadesV2_atualizarViewsPortal_(opts);
  });

  atividadesV2_jobRunStep_(result, 'CONFERIR_PORTAL', function() {
    return atividadesV2_conferirPortal_(Object.assign({}, opts, {
      dryRun: true,
      includeSamples: false
    }));
  });

  result.finishedAt = new Date();
  result.durationMs = result.finishedAt.getTime() - startedAt.getTime();
  atividadesV2_jobCountTotals_(result);
  result.ok = result.totals.errors === 0;
  result.summary = atividadesV2_jobBuildSummary_(result);
  return result;
}

function atividadesV2_conferirPortal_(options) {
  var raw = atividadesV2_conferirConsistencia_(Object.assign({}, options || {}, {
    includeSamples: false
  }));
  return {
    ok: raw.ok !== false,
    modulo: ATIVIDADES_CFG.MODULE_CODE,
    fluxo: ATIVIDADES_V2_JOB_PORTAL.conferFlow,
    totalVerificado: '',
    totalInconsistencias: Number(raw.totalIssues || 0),
    erros: Number(raw.erros || 0),
    avisos: Number(raw.avisos || 0)
  };
}

function atividadesV2_jobPortalTrigger() {
  return atividades_runWithOperationalGuard_(ATIVIDADES_V2_JOB_PORTAL.flow, null, function(guard) {
    return atividadesV2_jobPortal_(atividadesV2_jobPortalOptions_({ executionType: 'TRIGGER' }, guard));
  }, {
    entrypoint: 'atividadesV2_jobPortalTrigger',
    executionType: 'TRIGGER'
  });
}

function atividadesV2_runTesteDiagnostico_() {
  var result = atividadesV2_diagnostico_();
  return {
    ok: result.ok === true,
    modo: result.modo || 'DEV',
    spreadsheetId: result.spreadsheetId || '',
    totalAbas: Object.keys(result.sheets || {}).length,
    abasComErro: Object.keys(result.sheets || {}).filter(function(sheetName) {
      var item = result.sheets[sheetName] || {};
      return item.exists === false || (item.missingHeaders || []).length > 0;
    }),
    consistencia: result.consistencia ? {
      ok: result.consistencia.ok,
      totalIssues: result.consistencia.totalIssues,
      erros: result.consistencia.erros,
      avisos: result.consistencia.avisos
    } : null,
    avisos: (result.avisos || []).length,
    erros: (result.erros || []).length
  };
}

function atividadesV2_runTesteAtualizacaoPortalDryRun_() {
  var result = atividadesV2_atualizarViewsPortal_({
    dryRun: true,
    stopOnError: false
  });
  return atividadesV2_buildSafeDryRunTestResult_('ATUALIZACAO_PORTAL_V2', result);
}

function atividadesV2_runTesteFrequenciaDryRun_() {
  var result = atividadesV2_recalcularFrequenciaMembros_({
    dryRun: true
  });
  return {
    ok: result.ok !== false,
    fluxo: 'FREQUENCIA_V2',
    dryRun: true,
    destino: result.destino || ATIVIDADES_V2_SHEETS.PORTAL_FREQUENCIA_MEMBROS,
    totalPresencasLidas: result.totalPresencasLidas || 0,
    totalMembrosCiclo: result.totalMembrosCiclo || 0,
    totalLinhasGeradas: result.totalLinhasGeradas || 0,
    totalLinhasEscritas: result.totalLinhasEscritas || 0,
    avisos: (result.avisos || []).length,
    erros: (result.erros || []).length
  };
}

function atividadesV2_runTesteJobPortalDryRun_() {
  var result = atividadesV2_jobPortal_({
    dryRun: true,
    executionType: 'MANUAL',
    stopOnError: false
  });
  return {
    ok: result.ok === true,
    fluxo: result.fluxo || ATIVIDADES_V2_JOB_PORTAL.flow,
    dryRun: true,
    executionType: result.executionType || 'MANUAL',
    durationMs: result.durationMs || 0,
    totals: result.totals || {},
    steps: (result.steps || []).map(function(step) {
      return {
        step: step.step,
        ok: step.ok,
        status: step.status,
        dryRun: step.dryRun,
        errors: step.errors,
        warnings: step.warnings,
        detail: step.detail || {}
      };
    }),
    summary: result.summary || ''
  };
}

function atividadesV2_buildSafeDryRunTestResult_(flow, result) {
  result = result || {};
  var steps = {};
  Object.keys(result.steps || {}).forEach(function(name) {
    var step = result.steps[name] || {};
    steps[name] = {
      ok: step.ok !== false,
      dryRun: step.dryRun === true,
      destino: step.destino || '',
      modoEscrita: step.modoEscrita || '',
      totalLinhasGeradas: step.totalLinhasGeradas || 0,
      totalLinhasEscritas: step.totalLinhasEscritas || 0,
      avisos: (step.avisos || []).length,
      erros: (step.erros || []).length
    };
  });

  return {
    ok: result.ok !== false,
    fluxo: flow,
    dryRun: result.dryRun === true,
    totalSteps: Object.keys(steps).length,
    steps: steps,
    avisos: (result.avisos || []).length,
    erros: (result.erros || []).length
  };
}

function atividadesV2_jobRunStep_(jobResult, stepName, fn) {
  var startedAt = new Date();
  try {
    var raw = fn();
    var step = atividadesV2_jobSummarizeStep_(stepName, raw);
    step.durationMs = new Date().getTime() - startedAt.getTime();
    jobResult.steps.push(step);
    return step;
  } catch (err) {
    var errorStep = atividadesV2_jobStepError_(stepName, err);
    errorStep.durationMs = new Date().getTime() - startedAt.getTime();
    jobResult.steps.push(errorStep);
    return errorStep;
  }
}

function atividadesV2_jobSummarizeStep_(stepName, raw) {
  raw = raw || {};
  var errors = atividadesV2_jobCountValue_(raw.erros, raw.totalErros);
  var warnings = atividadesV2_jobCountValue_(raw.avisos, raw.totalAvisos);
  if (raw.ok === false) errors = Math.max(errors, 1);

  var detail = {};
  if (raw.steps) {
    detail.steps = atividadesV2_jobSummarizePortalViewSteps_(raw.steps);
  }
  if (raw.totalInconsistencias != null) detail.totalInconsistencias = raw.totalInconsistencias;
  if (raw.dryRun != null) detail.dryRun = raw.dryRun;

  return {
    step: stepName,
    ok: raw.ok !== false,
    status: raw.ok === false ? 'ERROR' : 'OK',
    skipped: raw.skipped === true,
    dryRun: raw.dryRun === true,
    errors: errors,
    warnings: warnings,
    message: atividadesV2_jobSafeMessage_(raw.message || raw.errorCode || ''),
    detail: detail
  };
}

function atividadesV2_jobCountValue_(primary, fallback) {
  if (Array.isArray(primary)) return primary.length;
  if (primary !== null && primary !== undefined && primary !== '') {
    var parsed = Number(primary);
    return isNaN(parsed) ? 0 : parsed;
  }
  if (Array.isArray(fallback)) return fallback.length;
  var fallbackParsed = Number(fallback || 0);
  return isNaN(fallbackParsed) ? 0 : fallbackParsed;
}

function atividadesV2_jobSummarizePortalViewSteps_(steps) {
  var out = {};
  Object.keys(steps || {}).forEach(function(name) {
    var item = steps[name] || {};
    out[name] = {
      ok: item.ok !== false,
      dryRun: item.dryRun === true,
      destino: item.destino || '',
      totalLinhasGeradas: Number(item.totalLinhasGeradas || 0),
      totalLinhasEscritas: Number(item.totalLinhasEscritas || 0),
      modoEscrita: item.modoEscrita || '',
      avisos: (item.avisos || []).length,
      erros: (item.erros || []).length
    };
  });
  return out;
}

function atividadesV2_jobStepError_(stepName, err) {
  return {
    step: stepName,
    ok: false,
    status: 'ERROR',
    skipped: false,
    dryRun: false,
    errors: 1,
    warnings: 0,
    message: atividadesV2_jobSafeMessage_(err && err.message ? err.message : String(err || 'Erro desconhecido.')),
    detail: {}
  };
}

function atividadesV2_jobSafeMessage_(message) {
  return String(message || '')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email]')
    .replace(/[A-Za-z0-9_-]{30,}/g, '[id_interno]');
}

function atividadesV2_jobCountTotals_(result) {
  result.totals = {
    ok: 0,
    warnings: 0,
    errors: 0,
    skipped: 0
  };
  (result.steps || []).forEach(function(step) {
    if (step.skipped) result.totals.skipped++;
    else if (step.ok) result.totals.ok++;
    result.totals.warnings += Number(step.warnings || 0);
    result.totals.errors += Number(step.errors || 0);
  });
  return result.totals;
}

function atividadesV2_jobBuildSummary_(result) {
  return [
    'Atividades V2 Portal',
    result.ok ? 'OK' : 'COM_ERROS',
    'dryRun=' + (result.dryRun ? 'SIM' : 'NAO'),
    'errors=' + result.totals.errors,
    'warnings=' + result.totals.warnings
  ].join(' | ');
}

function atividadesV2_instalarTriggerJobPortal_(options) {
  options = options || {};
  var hour = Math.max(0, Math.min(23, Number(options.hour == null ? ATIVIDADES_V2_JOB_PORTAL.hour : options.hour)));
  var removed = atividadesV2_removerTriggerJobPortal_();
  ScriptApp.newTrigger(ATIVIDADES_V2_JOB_PORTAL.handler)
    .timeBased()
    .everyDays(1)
    .atHour(hour)
    .create();
  return {
    ok: true,
    installed: true,
    deletedBeforeInstall: removed.deleted,
    handler: ATIVIDADES_V2_JOB_PORTAL.handler,
    schedule: 'Todo dia as ' + hour + 'h',
    note: 'Instalador manual. O handler respeita MODULOS_CONFIG em ATIVIDADES / ATUALIZACAO_PORTAL_V2.'
  };
}

function atividadesV2_removerTriggerJobPortal_() {
  var triggers = ScriptApp.getProjectTriggers().filter(function(trigger) {
    return trigger.getHandlerFunction() === ATIVIDADES_V2_JOB_PORTAL.handler;
  });
  triggers.forEach(function(trigger) {
    ScriptApp.deleteTrigger(trigger);
  });
  return {
    ok: true,
    deleted: triggers.length,
    handler: ATIVIDADES_V2_JOB_PORTAL.handler
  };
}

function atividadesV2_listarTriggerJobPortal_() {
  var triggers = ScriptApp.getProjectTriggers().filter(function(trigger) {
    return trigger.getHandlerFunction() === ATIVIDADES_V2_JOB_PORTAL.handler;
  });
  return {
    ok: true,
    handler: ATIVIDADES_V2_JOB_PORTAL.handler,
    installedCount: triggers.length,
    triggerSource: triggers.length ? String(triggers[0].getTriggerSource()) : '',
    eventType: triggers.length ? String(triggers[0].getEventType()) : '',
    uniqueIds: triggers.map(function(trigger) { return trigger.getUniqueId(); }),
    note: 'A API do Apps Script nao expoe todos os detalhes da agenda configurada.'
  };
}
