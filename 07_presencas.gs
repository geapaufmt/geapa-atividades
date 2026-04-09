function atividades_pickFirstFieldValue_(record, aliases) {
  return atividades_pickRecordField_(record, aliases);
}

function atividades_getLifecycleEventRecords_() {
  try {
    return GEAPA_CORE.coreReadRecordsByKey(ATIVIDADES_CFG.STABLE_KEYS.MEMBER_LIFECYCLE_EVENTS, {
      headerRow: 1
    });
  } catch (err) {
    return [];
  }
}

function atividades_normalizeLifecycleEventType_(value) {
  return atividades_normalizeTextUpper_(value);
}

function atividades_normalizeLifecycleEventStatus_(value) {
  return atividades_normalizeTextUpper_(value);
}

function atividades_extractLifecycleEvent_(record) {
  var rga = String(atividades_pickFirstFieldValue_(record, ['RGA']) || '').trim();
  var dateValue = atividades_parseDateOrNull_(atividades_pickFirstFieldValue_(record, [
    'DATA_EVENTO',
    'Data Evento',
    'DATA_HOMOLOGACAO',
    'Data/Hora do deferimento',
    'Data de homologacao'
  ]));
  var typeValue = String(atividades_pickFirstFieldValue_(record, ['TIPO_EVENTO', 'TIPO_EVENTO_VINCULO']) || '').trim();
  var statusValue = String(atividades_pickFirstFieldValue_(record, ['STATUS_EVENTO', 'STATUS']) || '').trim();

  return {
    id: String(atividades_pickFirstFieldValue_(record, ['ID_EVENTO_MEMBRO']) || '').trim(),
    rga: rga,
    tipo: atividades_normalizeLifecycleEventType_(typeValue),
    status: atividades_normalizeLifecycleEventStatus_(statusValue),
    dataEvento: dateValue,
    motivo: String(atividades_pickFirstFieldValue_(record, ['MOTIVO_EVENTO', 'Motivo', 'MOTIVO_DESLIGAMENTO']) || '').trim(),
    origemModulo: String(atividades_pickFirstFieldValue_(record, ['ORIGEM_MODULO']) || '').trim(),
    origemChave: String(atividades_pickFirstFieldValue_(record, ['ORIGEM_CHAVE']) || '').trim(),
    origemRow: String(atividades_pickFirstFieldValue_(record, ['ORIGEM_ROW']) || '').trim(),
    nome: String(atividades_pickFirstFieldValue_(record, ['NOME_MEMBRO', 'MEMBRO', 'Membro', 'Nome']) || '').trim(),
    email: String(atividades_pickFirstFieldValue_(record, ['EMAIL', 'E-mail', 'Email']) || '').trim(),
    observacoes: String(atividades_pickFirstFieldValue_(record, ['OBSERVACOES', 'Observacoes', 'Observação interna', 'Observacao interna']) || '').trim()
  };
}

function atividades_isLifecycleEventActiveForPeriod_(event) {
  if (!event || !event.rga || !event.dataEvento || !event.tipo) return false;
  if (!event.status) return true;

  var status = event.status;
  if (status === 'CANCELADO') return false;
  if (status === 'REGISTRADO') return false;
  return true;
}

function atividades_sortLifecycleEvents_(events) {
  return (events || []).slice().sort(function(a, b) {
    var aTime = a && a.dataEvento ? a.dataEvento.getTime() : 0;
    var bTime = b && b.dataEvento ? b.dataEvento.getTime() : 0;
    if (aTime !== bTime) return aTime - bTime;
    return String(a.id || '').localeCompare(String(b.id || ''), 'pt-BR');
  });
}

function atividades_buildLifecycleEventsByRga_() {
  var events = atividades_getLifecycleEventRecords_()
    .map(atividades_extractLifecycleEvent_)
    .filter(atividades_isLifecycleEventActiveForPeriod_);
  var byRga = {};

  events.forEach(function(event) {
    if (!byRga[event.rga]) byRga[event.rga] = [];
    byRga[event.rga].push(event);
  });

  Object.keys(byRga).forEach(function(rga) {
    byRga[rga] = atividades_sortLifecycleEvents_(byRga[rga]);
  });

  return byRga;
}

function atividades_getLifecycleWindowForPeriod_(ctx, events, fallbackEntryDate) {
  var sorted = atividades_sortLifecycleEvents_(events);
  var entryDate = fallbackEntryDate || null;
  var exitDate = null;
  var statusNoPeriodo = '';
  var motivo = '';
  var obs = '';
  var hasEntryAfterStart = false;
  var latestRelevantEvent = null;

  sorted.forEach(function(event) {
    if (!event.dataEvento) return;
    if (ctx.startDate && event.dataEvento < ctx.startDate) {
      if (event.tipo === 'INGRESSO' || event.tipo === 'RETORNO') {
        entryDate = event.dataEvento;
        exitDate = null;
        statusNoPeriodo = 'ATIVO_DESDE_INICIO';
        motivo = event.tipo === 'RETORNO' ? 'RETORNO' : 'SEM_ALTERACAO';
      } else if (
        event.tipo === 'DESLIGAMENTO_VOLUNTARIO' ||
        event.tipo === 'DESLIGAMENTO_POR_FALTAS' ||
        event.tipo === 'DESLIGAMENTO_ADMINISTRATIVO' ||
        event.tipo === 'SUSPENSAO'
      ) {
        exitDate = event.dataEvento;
        statusNoPeriodo = event.tipo === 'SUSPENSAO' ? 'SUSPENSO_NO_PERIODO' : 'DESLIGADO_NO_PERIODO';
        motivo = event.tipo;
      }
      latestRelevantEvent = event;
      return;
    }

    if (ctx.endDate && event.dataEvento > ctx.endDate) return;

    latestRelevantEvent = event;
    if (event.tipo === 'INGRESSO' || event.tipo === 'RETORNO') {
      entryDate = event.dataEvento;
      exitDate = null;
      hasEntryAfterStart = !!(ctx.startDate && event.dataEvento > ctx.startDate);
      statusNoPeriodo = hasEntryAfterStart ? 'ENTRADA_POSTERIOR' : 'ATIVO_DESDE_INICIO';
      motivo = event.tipo === 'RETORNO' ? 'RETORNO' : 'INGRESSO_NO_PERIODO';
      obs = event.observacoes || obs;
      return;
    }

    if (event.tipo === 'SUSPENSAO') {
      exitDate = event.dataEvento;
      statusNoPeriodo = 'SUSPENSO_NO_PERIODO';
      motivo = 'SUSPENSAO';
      obs = event.observacoes || obs;
      return;
    }

    if (
      event.tipo === 'DESLIGAMENTO_VOLUNTARIO' ||
      event.tipo === 'DESLIGAMENTO_POR_FALTAS' ||
      event.tipo === 'DESLIGAMENTO_ADMINISTRATIVO'
    ) {
      exitDate = event.dataEvento;
      statusNoPeriodo = 'DESLIGADO_NO_PERIODO';
      motivo = event.tipo;
      obs = event.observacoes || obs;
    }
  });

  if (latestRelevantEvent && !obs) {
    obs = latestRelevantEvent.observacoes || '';
  }

  return {
    entryDate: entryDate,
    exitDate: exitDate,
    statusNoPeriodo: statusNoPeriodo,
    motivo: motivo,
    obsEventoPeriodo: obs,
    latestEvent: latestRelevantEvent
  };
}

function atividades_getMembersSnapshot_() {
  var records = GEAPA_CORE.coreReadRecordsByKey(ATIVIDADES_CFG.STABLE_KEYS.MEMBERS, {
    headerRow: 1
  });

  return records.map(function(record) {
    return {
      rga: String(atividades_pickFirstFieldValue_(record, ['RGA']) || '').trim(),
      nome: String(atividades_pickFirstFieldValue_(record, ['Membro', 'MEMBRO', 'NOME_MEMBRO', 'Nome']) || '').trim(),
      email: String(atividades_pickFirstFieldValue_(record, ['Email', 'E-mail', 'EMAIL']) || '').trim(),
      status: String(atividades_pickFirstFieldValue_(record, ['Status', 'STATUS_CADASTRAL']) || '').trim(),
      cargo: String(atividades_pickFirstFieldValue_(record, ['Cargo/FunÃ§Ã£o atual', 'Cargo/FunÃ§ao atual', 'Cargo/Funcao atual', 'Cargo/funcao atual', 'CARGO_FUNCAO_ATUAL']) || '').trim(),
      entryDate: atividades_parseDateOrNull_(atividades_pickFirstFieldValue_(record, [
        'DATA_INTEGRACAO',
        'Data integração',
        'Data integracao',
        'DATA_ENTRADA',
        'Data entrada',
        'DATA_INGRESSO',
        'Data ingresso'
      ]))
    };
  }).filter(function(member) {
    return member.rga && member.nome;
  }).sort(function(a, b) {
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });
}

function atividades_getCurrentPeriodActivitiesMap_() {
  var ctx = atividades_getCurrentPeriodContext_();
  var operational = atividades_getOperationalHolder_().spreadsheet;
  var periodSheet = atividades_findSheetByName_(operational, ctx.activitySheetName);
  if (!periodSheet) {
    throw new Error('Aba dinamica de atividades nao encontrada: ' + ctx.activitySheetName);
  }

  return GEAPA_CORE.coreReadSheetRecords(periodSheet, { headerRow: 1 });
}

function atividades_sheetColumnToLetter_(column) {
  var current = Number(column || 0);
  var output = '';

  while (current > 0) {
    var temp = (current - 1) % 26;
    output = String.fromCharCode(temp + 65) + output;
    current = (current - temp - 1) / 26;
  }

  return output;
}

function atividades_getFormulaArgSeparator_(sheet) {
  var locale = String(sheet.getParent().getSpreadsheetLocale() || '').toLowerCase();
  return locale.indexOf('en') === 0 ? ',' : ';';
}

function atividades_buildPresenceSummaryFormula_(headerName, rowNumber, firstActivityCol, lastActivityCol, argSeparator) {
  if (!firstActivityCol || !lastActivityCol || lastActivityCol < firstActivityCol) return '';

  var startA1 = atividades_sheetColumnToLetter_(firstActivityCol) + rowNumber;
  var endA1 = atividades_sheetColumnToLetter_(lastActivityCol) + rowNumber;
  var rangeA1 = startA1 + ':' + endA1;
  var sep = argSeparator || ',';

  if (headerName === 'TOTAL_PRESENCAS') {
    return '=COUNTIF(' + rangeA1 + sep + '"P")+COUNTIF(' + rangeA1 + sep + '"R")';
  }
  if (headerName === 'TOTAL_FALTAS') return '=COUNTIF(' + rangeA1 + sep + '"F")';
  if (headerName === 'TOTAL_JUSTIFICADAS') {
    return '=COUNTIF(' + rangeA1 + sep + '"J")+COUNTIF(' + rangeA1 + sep + '"A")';
  }
  if (headerName === 'PERCENTUAL_FREQUENCIA') {
    return '=IFERROR((COUNTIF(' + rangeA1 + sep + '"P")+COUNTIF(' + rangeA1 + sep + '"R")+COUNTIF(' + rangeA1 + sep + '"A"))/(COUNTIF(' + rangeA1 + sep + '"P")+COUNTIF(' + rangeA1 + sep + '"R")+COUNTIF(' + rangeA1 + sep + '"F")+COUNTIF(' + rangeA1 + sep + '"J")+COUNTIF(' + rangeA1 + sep + '"A"))' + sep + '0)';
  }

  return '';
}

function atividades_applyPresenceSummaryFormulas_(sheet, headers, rowCount, firstActivityCol, lastActivityCol) {
  if (!rowCount || !firstActivityCol || !lastActivityCol || lastActivityCol < firstActivityCol) return;

  var headerMap = GEAPA_CORE.coreHeaderMap(sheet, 1);
  var argSeparator = atividades_getFormulaArgSeparator_(sheet);
  ['TOTAL_PRESENCAS', 'TOTAL_FALTAS', 'TOTAL_JUSTIFICADAS', 'PERCENTUAL_FREQUENCIA'].forEach(function(headerName) {
    var col = GEAPA_CORE.coreGetCol(headerMap, headerName);
    if (!col) return;

    var formulas = [];
    for (var row = 2; row <= rowCount + 1; row++) {
      formulas.push([atividades_buildPresenceSummaryFormula_(headerName, row, firstActivityCol, lastActivityCol, argSeparator)]);
    }

    sheet.getRange(2, col, rowCount, 1).setFormulas(formulas);
  });
}

function atividades_readExistingPresenceSnapshot_(sheet) {
  var records = GEAPA_CORE.coreReadSheetRecords(sheet, { headerRow: 1 });
  var byRga = {};
  var orderedRgas = [];

  records.forEach(function(record) {
    var rga = String(record.RGA || '').trim();
    if (!rga) return;
    byRga[rga] = record;
    orderedRgas.push(rga);
  });

  return {
    byRga: byRga,
    orderedRgas: orderedRgas
  };
}

function atividades_buildPeriodActivitiesDateMap_(periodRows) {
  var out = {};
  (periodRows || []).forEach(function(row) {
    var header = String(row.COLUNA_PRESENCA || '').trim();
    if (!header) return;
    out[header] = atividades_parseDateOrNull_(row.DATA_ATIVIDADE);
  });
  return out;
}

function atividades_buildMembersMapByRga_(members) {
  var out = {};
  (members || []).forEach(function(member) {
    out[member.rga] = member;
  });
  return out;
}

function atividades_isPresenceNotApplicable_(value) {
  return atividades_normalizeTextUpper_(value) === 'N/A';
}

function atividades_buildPresenceRosterOrder_(members, existingSnapshot) {
  var ordered = [];
  var seen = {};
  var currentMap = atividades_buildMembersMapByRga_(members);

  (existingSnapshot.orderedRgas || []).forEach(function(rga) {
    if (!rga || seen[rga]) return;
    ordered.push(rga);
    seen[rga] = true;
  });

  (members || []).forEach(function(member) {
    if (!member.rga || seen[member.rga]) return;
    ordered.push(member.rga);
    seen[member.rga] = true;
  });

  return ordered.map(function(rga) {
    return {
      rga: rga,
      currentMember: currentMap[rga] || null,
      existing: existingSnapshot.byRga[rga] || {}
    };
  });
}

function atividades_pickPeriodEntryDate_(ctx, currentMember, existing) {
  var existingDate = atividades_parseDateOrNull_(existing.DATA_ENTRADA_NO_PERIODO);
  if (existingDate) return existingDate;

  if (currentMember && currentMember.entryDate && ctx.startDate && currentMember.entryDate > ctx.startDate) {
    return currentMember.entryDate;
  }

  return null;
}

function atividades_pickPeriodExitDate_(existing) {
  return atividades_parseDateOrNull_(existing.DATA_SAIDA_NO_PERIODO);
}

function atividades_resolvePeriodMemberState_(ctx, currentMember, existing, lifecycleEvents) {
  var existingStatus = String(existing.STATUS_NO_PERIODO || '').trim();
  var existingMotivo = String(existing.MOTIVO_ALTERACAO_NO_PERIODO || '').trim();
  var existingObs = String(existing.OBS_EVENTO_PERIODO || '').trim();
  var fallbackEntryDate = atividades_pickPeriodEntryDate_(ctx, currentMember, existing);
  var lifecycleWindow = atividades_getLifecycleWindowForPeriod_(ctx, lifecycleEvents || [], fallbackEntryDate);
  var entryDate = lifecycleWindow.entryDate || fallbackEntryDate;
  var exitDate = lifecycleWindow.exitDate || atividades_pickPeriodExitDate_(existing);
  var currentStatusCadastral = currentMember ? String(currentMember.status || '').trim() : '';
  var normalizedCurrentStatus = atividades_normalizeTextUpper_(currentStatusCadastral);

  if (currentMember) {
    var statusNoPeriodo = lifecycleWindow.statusNoPeriodo || existingStatus;
    if (!statusNoPeriodo) {
      if (normalizedCurrentStatus.indexOf('SUSPENS') >= 0) {
        statusNoPeriodo = 'SUSPENSO_NO_PERIODO';
      } else if (entryDate && ctx.startDate && entryDate > ctx.startDate) {
        statusNoPeriodo = 'ENTRADA_POSTERIOR';
      } else {
        statusNoPeriodo = 'ATIVO_DESDE_INICIO';
      }
    }

    return {
      rga: currentMember.rga,
      nome: currentMember.nome,
      email: currentMember.email,
      cargo: currentMember.cargo || String(existing.CARGO_FUNCAO_ATUAL || '').trim(),
      statusCadastral: currentStatusCadastral,
      statusNoPeriodo: statusNoPeriodo,
      entryDate: entryDate,
      exitDate: exitDate,
      motivo: lifecycleWindow.motivo || existingMotivo || (
        statusNoPeriodo === 'ENTRADA_POSTERIOR' ? 'INGRESSO_NO_PERIODO' :
        statusNoPeriodo === 'SUSPENSO_NO_PERIODO' ? 'SUSPENSAO' :
        'SEM_ALTERACAO'
      ),
      obsEventoPeriodo: lifecycleWindow.obsEventoPeriodo || existingObs,
      existing: existing
    };
  }

  var fallbackStatusCadastral = currentStatusCadastral || String(existing.STATUS_CADASTRAL || '').trim();
  var normalizedFallback = atividades_normalizeTextUpper_(fallbackStatusCadastral);
  if (!fallbackStatusCadastral || normalizedFallback === 'ATIVO') {
    fallbackStatusCadastral = 'DESLIGADO';
    normalizedFallback = 'DESLIGADO';
  }

  return {
    rga: String(existing.RGA || '').trim(),
    nome: String(existing.NOME_MEMBRO || '').trim(),
    email: String(existing.EMAIL || '').trim(),
    cargo: String(existing.CARGO_FUNCAO_ATUAL || '').trim(),
    statusCadastral: fallbackStatusCadastral,
    statusNoPeriodo: lifecycleWindow.statusNoPeriodo || (
      normalizedFallback.indexOf('SUSPENS') >= 0 ? 'SUSPENSO_NO_PERIODO' : 'DESLIGADO_NO_PERIODO'
    ),
    entryDate: entryDate,
    exitDate: exitDate,
    motivo: lifecycleWindow.motivo || existingMotivo || '',
    obsEventoPeriodo: lifecycleWindow.obsEventoPeriodo || existingObs,
    existing: existing
  };
}

function atividades_formatDateForPresenceCell_(dateValue) {
  return dateValue
    ? GEAPA_CORE.coreFormatDate(dateValue, Session.getScriptTimeZone(), ATIVIDADES_CFG.DATE_FORMAT)
    : '';
}

function atividades_resolvePresenceCellValue_(state, header, activityDatesByHeader, ctx) {
  var existingValue = String(state.existing[header] || '').trim();
  var activityDate = activityDatesByHeader[header];
  if (!activityDate) return existingValue;

  var effectiveStart = state.entryDate || ctx.startDate || null;
  if (effectiveStart && activityDate < effectiveStart) return 'N/A';

  if (state.exitDate && activityDate > state.exitDate) return 'N/A';

  if (atividades_isPresenceNotApplicable_(existingValue)) return '';
  return existingValue;
}

function atividades_buildPresenceRow_(state, headers, dynamicHeaders, activityDatesByHeader, ctx) {
  return headers.map(function(header) {
    if (header === 'RGA') return state.rga;
    if (header === 'NOME_MEMBRO') return state.nome;
    if (header === 'EMAIL') return state.email;
    if (header === 'STATUS_CADASTRAL') return state.statusCadastral;
    if (header === 'STATUS_NO_PERIODO') return state.statusNoPeriodo;
    if (header === 'DATA_ENTRADA_NO_PERIODO') return atividades_formatDateForPresenceCell_(state.entryDate);
    if (header === 'DATA_SAIDA_NO_PERIODO') return atividades_formatDateForPresenceCell_(state.exitDate);
    if (header === 'MOTIVO_ALTERACAO_NO_PERIODO') return state.motivo;
    if (header === 'OBS_EVENTO_PERIODO') return state.obsEventoPeriodo;
    if (header === 'CARGO_FUNCAO_ATUAL') return state.cargo;
    if (dynamicHeaders.indexOf(header) >= 0) return atividades_resolvePresenceCellValue_(state, header, activityDatesByHeader, ctx);
    if (header === 'OBSERVACOES') return String(state.existing.OBSERVACOES || '').trim();
    return '';
  });
}

function atividades_sincronizarPresencasPeriodoVigente_() {
  var ensure = atividades_garantirPeriodoVigente_();
  var ctx = ensure.period;
  var operational = atividades_getOperationalHolder_().spreadsheet;
  var sheet = atividades_findSheetByName_(operational, ctx.presenceSheetName);
  if (!sheet) throw new Error('Aba dinamica de presencas nao encontrada: ' + ctx.presenceSheetName);

  var members = atividades_getMembersSnapshot_();
  var periodRows = atividades_getCurrentPeriodActivitiesMap_();
  var existingSnapshot = atividades_readExistingPresenceSnapshot_(sheet);
  var activityDatesByHeader = atividades_buildPeriodActivitiesDateMap_(periodRows);
  var lifecycleEventsByRga = atividades_buildLifecycleEventsByRga_();
  var roster = atividades_buildPresenceRosterOrder_(members, existingSnapshot);
  var currentMembersMap = atividades_buildMembersMapByRga_(members);
  var dynamicHeaders = periodRows.map(function(row) {
    return String(row.COLUNA_PRESENCA || '').trim();
  }).filter(function(value) {
    return !!value;
  });

  var headers = []
    .concat(ATIVIDADES_SCHEMA.PRESENCAS_BASE)
    .concat(dynamicHeaders)
    .concat(ATIVIDADES_SCHEMA.PRESENCAS_SUMARIO);

  var firstActivityCol = ATIVIDADES_SCHEMA.PRESENCAS_BASE.length + 1;
  var lastActivityCol = firstActivityCol + dynamicHeaders.length - 1;

  var rows = roster.map(function(item) {
    var state = atividades_resolvePeriodMemberState_(
      ctx,
      currentMembersMap[item.rga] || null,
      item.existing || {},
      lifecycleEventsByRga[item.rga] || []
    );
    return atividades_buildPresenceRow_(state, headers, dynamicHeaders, activityDatesByHeader, ctx);
  });

  atividades_writeTabularPayload_(sheet, headers, rows);
  atividades_applyPresenceSummaryFormulas_(sheet, headers, rows.length, firstActivityCol, lastActivityCol);
  atividades_applySheetUx_(sheet, ATIVIDADES_CFG.DYNAMIC_SHEET_PROFILES.PERIODO_PRESENCAS);

  var headerMap = GEAPA_CORE.coreHeaderMap(sheet, 1);
  var percentualCol = GEAPA_CORE.coreGetCol(headerMap, 'PERCENTUAL_FREQUENCIA');
  if (percentualCol && rows.length) {
    sheet.getRange(2, percentualCol, rows.length, 1).setNumberFormat('0.00%');
  }

  var entrantsCount = rows.filter(function(row) {
    return row[GEAPA_CORE.coreGetCol(headerMap, 'STATUS_NO_PERIODO') - 1] === 'ENTRADA_POSTERIOR';
  }).length;
  var inactiveCount = rows.filter(function(row) {
    var status = row[GEAPA_CORE.coreGetCol(headerMap, 'STATUS_NO_PERIODO') - 1];
    return status === 'DESLIGADO_NO_PERIODO' || status === 'SUSPENSO_NO_PERIODO';
  }).length;

  atividades_logEvento_({
    TIPO_EVENTO_LOG: 'SYNC_PRESENCAS_PERIODO',
    STATUS: 'OK',
    ACAO_EXECUTADA: 'Sincronizar presencas do periodo vigente',
    RESULTADO: ctx.presenceSheetName,
    OBSERVACOES: 'Linhas sincronizadas: ' + rows.length +
      ' | entrantes=' + entrantsCount +
      ' | desligados/suspensos=' + inactiveCount +
      ' | membros_com_eventos=' + Object.keys(lifecycleEventsByRga).length +
      ' | colunas dinamicas=' + dynamicHeaders.length
  });

  return {
    ok: true,
    period: ctx,
    memberCount: rows.length,
    entrantsCount: entrantsCount,
    inactiveCount: inactiveCount,
    dynamicColumns: dynamicHeaders.length,
    sheetName: ctx.presenceSheetName
  };
}
