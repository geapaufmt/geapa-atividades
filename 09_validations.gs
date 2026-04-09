function atividades_validateCoreLibrary_() {
  try {
    atividades_assertCoreLibrary_();
    return { ok: true, issues: [] };
  } catch (err) {
    return { ok: false, issues: [err.message || String(err)] };
  }
}

function atividades_validateRegistryDiscovery_() {
  var issues = [];

  Object.keys(ATIVIDADES_CFG.FIXED_SHEETS).forEach(function(logicalName) {
    if (logicalName === 'EXTERNOS_BASE' || logicalName === 'EXTERNOS_FORM') return;

    try {
      atividades_getFixedSheetEntry_(logicalName);
    } catch (err) {
      issues.push(err.message || String(err));
    }
  });

  if (!atividades_getRegistryEntryByKey_(ATIVIDADES_CFG.STABLE_KEYS.MEMBERS)) {
    issues.push('KEY nao encontrada no Registry: ' + ATIVIDADES_CFG.STABLE_KEYS.MEMBERS);
  }

  if (!atividades_getRegistryEntryByKey_(ATIVIDADES_CFG.STABLE_KEYS.SEMESTERS)) {
    issues.push('KEY nao encontrada no Registry: ' + ATIVIDADES_CFG.STABLE_KEYS.SEMESTERS);
  }

  if (!atividades_getRegistryEntryByKey_(ATIVIDADES_CFG.STABLE_KEYS.PERIODS)) {
    issues.push('KEY recomendada nao encontrada no Registry: ' + ATIVIDADES_CFG.STABLE_KEYS.PERIODS);
  }

  if (!atividades_getRegistryEntryByKey_(ATIVIDADES_CFG.STABLE_KEYS.MEMBER_LIFECYCLE_EVENTS)) {
    issues.push('KEY recomendada nao encontrada no Registry: ' + ATIVIDADES_CFG.STABLE_KEYS.MEMBER_LIFECYCLE_EVENTS);
  }

  try {
    atividades_getHistoryFolder_();
  } catch (err) {
    issues.push(err.message || String(err));
  }

  return {
    ok: issues.length === 0,
    issues: issues
  };
}

function atividades_validateSheetHeaders_(sheet, requiredHeaders, label) {
  var headerMap = GEAPA_CORE.coreHeaderMap(sheet, 1);
  var missing = requiredHeaders.filter(function(header) {
    return !GEAPA_CORE.coreGetCol(headerMap, header);
  });

  return {
    ok: missing.length === 0,
    label: label,
    missing: missing
  };
}

function atividades_validateFixedSheets_() {
  var checks = [];

  checks.push(atividades_validateSheetHeaders_(
    atividades_getAtividadesSheet_(),
    ATIVIDADES_SCHEMA.ATIVIDADES,
    'Atividades'
  ));
  checks.push(atividades_validateSheetHeaders_(
    atividades_getApresentacoesSheet_(),
    ATIVIDADES_SCHEMA.APRESENTACOES,
    'Atividades_Apresentacoes'
  ));
  checks.push(atividades_validateSheetHeaders_(
    atividades_getConvidadosSheet_(),
    ATIVIDADES_SCHEMA.CONVIDADOS,
    'Atividade_Convidados'
  ));
  checks.push(atividades_validateSheetHeaders_(
    atividades_getConfigSheet_(),
    ATIVIDADES_SCHEMA.CONFIG,
    'Atividades_Config'
  ));
  checks.push(atividades_validateSheetHeaders_(
    atividades_getJustificativasFaltasSheet_(),
    ATIVIDADES_SCHEMA.JUSTIFICATIVAS_FALTAS,
    'Justificativas_Faltas'
  ));
  checks.push(atividades_validateSheetHeaders_(
    atividades_getLogSheet_(),
    ATIVIDADES_SCHEMA.LOG,
    'Atividades_Log'
  ));

  return {
    ok: checks.every(function(check) { return check.ok; }),
    checks: checks
  };
}

function atividades_validateCurrentPeriod_() {
  try {
    return {
      ok: true,
      context: atividades_getCurrentPeriodContext_()
    };
  } catch (err) {
    return {
      ok: false,
      issues: [err.message || String(err)]
    };
  }
}

function atividades_validarModulo_() {
  var core = atividades_validateCoreLibrary_();
  var registry = core.ok ? atividades_validateRegistryDiscovery_() : { ok: false, issues: ['Library GEAPA_CORE indisponivel.'] };
  var fixedSheets = core.ok && registry.ok ? atividades_validateFixedSheets_() : { ok: false, checks: [] };
  var currentPeriod = core.ok && registry.ok ? atividades_validateCurrentPeriod_() : { ok: false, issues: [] };

  return {
    ok: core.ok && registry.ok && fixedSheets.ok && currentPeriod.ok,
    checks: {
      core: core,
      registry: registry,
      fixedSheets: fixedSheets,
      currentPeriod: currentPeriod
    }
  };
}

function atividades_diagnostico_() {
  var validation = atividades_validarModulo_();
  return {
    ok: validation.ok,
    validation: validation,
    availableRegistryKeys: atividades_getRegistryEntries_().map(function(entry) {
      return entry.key;
    }).sort()
  };
}
