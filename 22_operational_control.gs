var ATIVIDADES_OPERATIONAL_CONTROL = Object.freeze({
  FLOWS: Object.freeze({
    GERAL: 'GERAL',
    SETUP_V1: 'SETUP_V1',
    PERIODO_VIGENTE: 'PERIODO_VIGENTE',
    JUSTIFICATIVAS_FALTAS: 'JUSTIFICATIVAS_FALTAS',
    MOTOR_DISCIPLINAR: 'MOTOR_DISCIPLINAR',
    ATIVIDADES_GERAIS: 'ATIVIDADES_GERAIS',
    APRESENTACOES_INTEGRADAS: 'APRESENTACOES_INTEGRADAS',
    ARQUIVAMENTO_PERIODOS: 'ARQUIVAMENTO_PERIODOS',
    MIGRACAO_V2_DEV: 'MIGRACAO_V2_DEV',
    ATUALIZACAO_PORTAL_V2: 'ATUALIZACAO_PORTAL_V2',
    FREQUENCIA_V2: 'FREQUENCIA_V2',
    CONFERENCIA_V2: 'CONFERENCIA_V2'
  }),

  CAPABILITIES: Object.freeze({
    GERAL: Object.freeze(['SYNC']),
    SETUP_V1: Object.freeze(['SYNC', 'DRIVE']),
    PERIODO_VIGENTE: Object.freeze(['SYNC']),
    JUSTIFICATIVAS_FALTAS: Object.freeze(['SYNC', 'EMAIL']),
    MOTOR_DISCIPLINAR: Object.freeze(['SYNC', 'EMAIL']),
    ATIVIDADES_GERAIS: Object.freeze(['SYNC', 'EMAIL']),
    APRESENTACOES_INTEGRADAS: Object.freeze(['EMAIL', 'INBOX', 'SYNC', 'DRIVE']),
    ARQUIVAMENTO_PERIODOS: Object.freeze(['SYNC', 'DRIVE']),
    MIGRACAO_V2_DEV: Object.freeze(['SYNC']),
    ATUALIZACAO_PORTAL_V2: Object.freeze(['SYNC']),
    FREQUENCIA_V2: Object.freeze(['SYNC']),
    CONFERENCIA_V2: Object.freeze(['SYNC'])
  })
});

function atividades_getOperationalCapabilitiesForFlow_(flowName) {
  var flow = String(flowName || ATIVIDADES_OPERATIONAL_CONTROL.FLOWS.GERAL).trim().toUpperCase();
  return (ATIVIDADES_OPERATIONAL_CONTROL.CAPABILITIES[flow] || ATIVIDADES_OPERATIONAL_CONTROL.CAPABILITIES.GERAL).slice();
}

function atividades_buildOperationalBlockedResult_(flowName, capabilities, message, opts) {
  opts = opts || {};
  return {
    ok: true,
    skipped: true,
    blocked: true,
    moduleName: ATIVIDADES_CFG.MODULE_CODE,
    flowName: String(flowName || ATIVIDADES_OPERATIONAL_CONTROL.FLOWS.GERAL).trim().toUpperCase(),
    capabilities: (capabilities || []).slice(),
    capability: String(opts.capability || '').trim().toUpperCase(),
    modeRead: String(opts.modeRead || '').trim().toUpperCase(),
    executionType: String(opts.executionType || 'MANUAL').trim().toUpperCase(),
    entrypoint: String(opts.entrypoint || '').trim(),
    reason: 'MODULOS_CONFIG_BLOCKED',
    message: String(message || '').trim()
  };
}

function atividades_logOperationalBlocked_(blocked) {
  var text = [
    'GEAPA-ATIVIDADES: execucao bloqueada por controle operacional.',
    'flow=' + blocked.flowName,
    'capabilities=' + blocked.capabilities.join(','),
    'executionType=' + blocked.executionType,
    'entrypoint=' + blocked.entrypoint,
    'message=' + blocked.message
  ].join(' | ');

  Logger.log(text);

  try {
    atividades_logEvento_({
      TIPO_EVENTO_LOG: 'CONTROLE_OPERACIONAL',
      STATUS: 'BLOQUEADO',
      ACAO_EXECUTADA: 'Bloquear execucao por MODULOS_CONFIG',
      RESULTADO: blocked.flowName,
      OBSERVACOES: text
    });
  } catch (e) {
    Logger.log('GEAPA-ATIVIDADES: nao foi possivel registrar bloqueio no log operacional: ' + e.message);
  }
}

function atividades_assertOperationalControlApi_() {
  atividades_assertCoreLibrary_();
}

function atividades_checkOperationalAllowed_(flowName, capabilities, opts) {
  opts = opts || {};
  var flow = String(flowName || ATIVIDADES_OPERATIONAL_CONTROL.FLOWS.GERAL).trim().toUpperCase();
  var caps = Array.isArray(capabilities) && capabilities.length
    ? capabilities.slice()
    : atividades_getOperationalCapabilitiesForFlow_(flow);
  var executionType = String(opts.executionType || 'MANUAL').trim().toUpperCase();
  var checkedCaps = caps.slice();

  if (executionType === 'TRIGGER' && checkedCaps.indexOf('TRIGGER') === -1) {
    checkedCaps.unshift('TRIGGER');
  }

  try {
    atividades_assertOperationalControlApi_();
    var decisions = [];

    for (var i = 0; i < checkedCaps.length; i++) {
      var capability = checkedCaps[i];
      decisions.push(GEAPA_CORE.coreAssertModuleExecutionAllowed(ATIVIDADES_CFG.MODULE_CODE, flow, capability, {
        executionType: executionType
      }));
    }

    return {
      allowed: true,
      flowName: flow,
      capabilities: checkedCaps,
      capability: atividades_pickOperationalStatusCapability_(checkedCaps),
      modeRead: atividades_pickOperationalModeRead_(decisions),
      decisions: decisions
    };
  } catch (e) {
    var blocked = atividades_buildOperationalBlockedResult_(flow, checkedCaps, e && e.message ? e.message : e, Object.assign({}, opts, {
      capability: typeof capability !== 'undefined' ? capability : atividades_pickOperationalStatusCapability_(checkedCaps),
      modeRead: atividades_pickOperationalModeRead_(decisions || [])
    }));
    atividades_logOperationalBlocked_(blocked);
    atividades_markOperationalBlocked_(blocked);
    return {
      allowed: false,
      blockedResult: blocked
    };
  }
}

function atividades_pickOperationalStatusCapability_(capabilities) {
  var caps = (capabilities || []).map(function(capability) {
    return String(capability || '').trim().toUpperCase();
  }).filter(function(capability) {
    return !!capability;
  });

  for (var i = 0; i < caps.length; i++) {
    if (caps[i] !== 'TRIGGER') return caps[i];
  }

  return caps[0] || '';
}

function atividades_pickOperationalModeRead_(decisions) {
  for (var i = 0; i < (decisions || []).length; i++) {
    var config = decisions[i] && decisions[i].config ? decisions[i].config : null;
    var mode = config ? String(config.mode || '').trim().toUpperCase() : '';
    if (mode) return mode;
  }

  return '';
}

function atividades_buildOperationalStatusOpts_(guard, opts) {
  opts = opts || {};
  return {
    modeRead: guard && guard.modeRead ? guard.modeRead : '',
    obs: String(opts.entrypoint || '').trim()
  };
}

function atividades_tryMarkOperationalStatus_(operationName, fn) {
  try {
    return fn();
  } catch (e) {
    Logger.log('GEAPA-ATIVIDADES: falha ao registrar MODULOS_STATUS (' + operationName + '): ' + e.message);
    return {
      ok: false,
      skipped: true,
      reason: 'modules_status_error',
      message: e.message
    };
  }
}

function atividades_markOperationalExecution_(guard, opts) {
  return atividades_tryMarkOperationalStatus_('execution', function() {
    return GEAPA_CORE.coreModuleStatusMarkExecution(
      ATIVIDADES_CFG.MODULE_CODE,
      guard.flowName,
      guard.capability,
      atividades_buildOperationalStatusOpts_(guard, opts)
    );
  });
}

function atividades_markOperationalSuccess_(guard, opts) {
  return atividades_tryMarkOperationalStatus_('success', function() {
    return GEAPA_CORE.coreModuleStatusMarkSuccess(
      ATIVIDADES_CFG.MODULE_CODE,
      guard.flowName,
      guard.capability,
      atividades_buildOperationalStatusOpts_(guard, opts)
    );
  });
}

function atividades_markOperationalError_(guard, error, opts) {
  return atividades_tryMarkOperationalStatus_('error', function() {
    return GEAPA_CORE.coreModuleStatusMarkError(
      ATIVIDADES_CFG.MODULE_CODE,
      guard.flowName,
      error,
      guard.capability,
      atividades_buildOperationalStatusOpts_(guard, opts)
    );
  });
}

function atividades_markOperationalBlocked_(blocked) {
  return atividades_tryMarkOperationalStatus_('blocked', function() {
    return GEAPA_CORE.coreModuleStatusMarkBlocked(
      ATIVIDADES_CFG.MODULE_CODE,
      blocked.flowName,
      blocked.reason,
      blocked.message,
      blocked.capability,
      blocked.modeRead,
      { obs: blocked.entrypoint }
    );
  });
}

function atividades_runWithOperationalGuard_(flowName, capabilities, fn, opts) {
  opts = opts || {};
  var guard = atividades_checkOperationalAllowed_(flowName, capabilities, opts);
  if (!guard.allowed) return guard.blockedResult;

  atividades_markOperationalExecution_(guard, opts);

  try {
    var result = fn(guard);
    atividades_markOperationalSuccess_(guard, opts);
    return result;
  } catch (e) {
    atividades_markOperationalError_(guard, e, opts);
    throw e;
  }
}
