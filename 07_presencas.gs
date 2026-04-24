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

function atividades_applyPresenceSummaryNumberFormats_(sheet, rowCount) {
  if (!rowCount) return;

  var headerMap = GEAPA_CORE.coreHeaderMap(sheet, 1);
  [
    'TOTAL_PRESENCAS',
    'TOTAL_FALTAS',
    'TOTAL_JUSTIFICADAS',
    'TOTAL_ATIVIDADES_QUE_CONTAM_FALTA',
    'LIMITE_FALTAS_PERIODO',
    'FALTAS_LIQUIDAS'
  ].forEach(function(header) {
    var col = GEAPA_CORE.coreGetCol(headerMap, header);
    if (!col) return;
    sheet.getRange(2, col, rowCount, 1).setNumberFormat('0');
  });

  ['PERCENTUAL_FREQUENCIA', 'PERCENTUAL_USO_LIMITE'].forEach(function(header) {
    var col = GEAPA_CORE.coreGetCol(headerMap, header);
    if (!col) return;
    sheet.getRange(2, col, rowCount, 1).setNumberFormat('0.00%');
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
    if (header === 'PREVISAO_APRESENTACAO_NO_PERIODO') {
      return String(state.existing.PREVISAO_APRESENTACAO_NO_PERIODO || '').trim();
    }
    if (header === 'CARGO_FUNCAO_ATUAL') return state.cargo;
    if (dynamicHeaders.indexOf(header) >= 0) return atividades_resolvePresenceCellValue_(state, header, activityDatesByHeader, ctx);
    if (ATIVIDADES_CFG.PRESENCAS.DISCIPLINARY_HEADERS.indexOf(header) >= 0) return state.existing[header] || '';
    if (header === 'OBSERVACOES') return String(state.existing.OBSERVACOES || '').trim();
    return '';
  });
}

function atividades_buildContaFaltaHeaders_(periodRows) {
  return (periodRows || []).filter(function(row) {
    return atividades_isTruthySim_(row.CONTA_FALTA);
  }).map(function(row) {
    return String(row.COLUNA_PRESENCA || '').trim();
  }).filter(function(header) {
    return !!header;
  });
}

function atividades_countPresenceValuesByHeaders_(record, headers, acceptedValues) {
  var accepted = {};
  (acceptedValues || []).forEach(function(value) {
    accepted[atividades_normalizeTextUpper_(value)] = true;
  });

  return (headers || []).reduce(function(total, header) {
    var current = atividades_normalizeTextUpper_(record && record[header]);
    return total + (accepted[current] ? 1 : 0);
  }, 0);
}

function atividades_calcularFaltasLiquidas_(record, contaFaltaHeaders) {
  return atividades_countPresenceValuesByHeaders_(record, contaFaltaHeaders, ['F', 'J']);
}

function atividades_calcularPercentualUsoLimite_(faltasLiquidas, limiteFaltas) {
  var faltas = Number(faltasLiquidas || 0);
  var limite = Number(limiteFaltas || 0);
  if (limite <= 0) {
    return faltas > 0 ? 1 : 0;
  }
  return faltas / limite;
}

function atividades_classificarSituacaoDisciplinar_(percentualUsoLimite) {
  var percentual = Number(percentualUsoLimite || 0);
  if (percentual >= ATIVIDADES_CFG.DISCIPLINA.LIMIT_ATINGIDO) return 'LIMITE_ATINGIDO';
  if (percentual >= ATIVIDADES_CFG.DISCIPLINA.ALERT_80) return 'ALERTA_80';
  if (percentual >= ATIVIDADES_CFG.DISCIPLINA.ALERT_60) return 'ALERTA_60';
  return 'NORMAL';
}

function atividades_buildDisciplinaryMetricsForPresenceRecord_(record, snapshot, contaFaltaHeaders) {
  var totalAtividades = Number(snapshot && snapshot.totalPlanejado || 0);
  var limiteFaltas = Number(snapshot && snapshot.limiteCongelado || 0);
  var faltasLiquidas = atividades_calcularFaltasLiquidas_(record, contaFaltaHeaders);
  var percentualUsoLimite = atividades_calcularPercentualUsoLimite_(faltasLiquidas, limiteFaltas);
  return {
    TOTAL_ATIVIDADES_QUE_CONTAM_FALTA: totalAtividades,
    LIMITE_FALTAS_PERIODO: limiteFaltas,
    FALTAS_LIQUIDAS: faltasLiquidas,
    PERCENTUAL_USO_LIMITE: percentualUsoLimite,
    SITUACAO_DISCIPLINAR: atividades_classificarSituacaoDisciplinar_(percentualUsoLimite)
  };
}

function atividades_writeDisciplinaryMetricsToRow_(sheet, headerMap, rowNumber, metrics) {
  ATIVIDADES_CFG.PRESENCAS.DISCIPLINARY_HEADERS.forEach(function(header) {
    var col = GEAPA_CORE.coreGetCol(headerMap, header);
    if (!col) return;
    sheet.getRange(rowNumber, col).setValue(metrics[header]);
  });
}

function atividades_getDisciplinaryLogType_(situacao) {
  if (situacao === 'ALERTA_60') return ATIVIDADES_CFG.DISCIPLINA_LOG_TYPES.ALERTA_60;
  if (situacao === 'ALERTA_80') return ATIVIDADES_CFG.DISCIPLINA_LOG_TYPES.ALERTA_80;
  if (situacao === 'LIMITE_ATINGIDO') return ATIVIDADES_CFG.DISCIPLINA_LOG_TYPES.LIMITE_ATINGIDO;
  return '';
}

function atividades_getDisciplinaryNotificationLogType_(situacao) {
  if (situacao === 'ALERTA_60') return ATIVIDADES_CFG.DISCIPLINA_NOTIFICACAO_LOG_TYPES.ALERTA_60;
  if (situacao === 'ALERTA_80') return ATIVIDADES_CFG.DISCIPLINA_NOTIFICACAO_LOG_TYPES.ALERTA_80;
  return '';
}

function atividades_getDisciplinaryNotificationStage_(situacao) {
  if (situacao === 'ALERTA_60') return ATIVIDADES_CFG.DISCIPLINA_NOTIFICACOES.STAGE_ALERTA_60;
  if (situacao === 'ALERTA_80') return ATIVIDADES_CFG.DISCIPLINA_NOTIFICACOES.STAGE_ALERTA_80;
  return '';
}

function atividades_getDisciplinaryNotificationSubject_(situacao) {
  if (situacao === 'ALERTA_60') return ATIVIDADES_CFG.DISCIPLINA_NOTIFICACOES.SUBJECT_ALERTA_60;
  if (situacao === 'ALERTA_80') return ATIVIDADES_CFG.DISCIPLINA_NOTIFICACOES.SUBJECT_ALERTA_80;
  return '';
}

function atividades_buildDisciplinaryAlertCorrelationKey_(periodCode, rga, situacao) {
  return [
    'ADC',
    atividades_normalizeTextUpper_(String(periodCode || '').trim() || 'SEM_PERIODO').replace(/[^\w]+/g, '_'),
    atividades_normalizeTextUpper_(String(rga || '').trim() || 'SEM_RGA').replace(/[^\w]+/g, '_'),
    atividades_normalizeTextUpper_(String(situacao || '').trim() || 'SEM_STATUS').replace(/[^\w]+/g, '_')
  ].join('-');
}

function atividades_buildDisciplinaryAlertNotificationsSentSet_() {
  var set = Object.create(null);
  GEAPA_CORE.coreReadSheetRecords(atividades_getLogSheet_(), {
    headerRow: 1
  }).forEach(function(record) {
    var tipo = String(record.TIPO_EVENTO_LOG || '').trim();
    if (
      tipo !== ATIVIDADES_CFG.DISCIPLINA_NOTIFICACAO_LOG_TYPES.ALERTA_60 &&
      tipo !== ATIVIDADES_CFG.DISCIPLINA_NOTIFICACAO_LOG_TYPES.ALERTA_80
    ) {
      return;
    }
    var key = String(record.RESULTADO || '').trim();
    if (!key) return;
    set[key] = true;
  });
  return set;
}

function atividades_buildDisciplinaryAlertPayload_(ctx, record, situacao) {
  var percentual = Number(record.PERCENTUAL_USO_LIMITE || 0);
  var faltasLiquidas = Number(record.FALTAS_LIQUIDAS || 0);
  var limite = Number(record.LIMITE_FALTAS_PERIODO || 0);
  var tituloSituacao = situacao === 'ALERTA_80'
    ? 'Uso muito elevado do limite de faltas'
    : 'Uso elevado do limite de faltas';
  var introText = situacao === 'ALERTA_80'
    ? 'Voce atingiu 80% do limite de faltas do periodo vigente do GEAPA. Sua situacao exige atencao imediata para evitar o desligamento por faltas.'
    : 'Voce atingiu 60% do limite de faltas do periodo vigente do GEAPA. Este e um aviso preventivo para que voce acompanhe sua situacao disciplinar.';

  return {
    subtitle: 'Alerta disciplinar de faltas no GEAPA',
    introText: introText,
    blocks: [
      {
        title: 'Situacao atual',
        items: [
          { label: 'Periodo', value: String(ctx.code || '').trim() || '-' },
          { label: 'Faixa disciplinar', value: situacao },
          { label: 'Faltas liquidas', value: String(faltasLiquidas) },
          { label: 'Limite de faltas', value: String(limite) },
          { label: 'Uso do limite', value: Utilities.formatString('%.0f%%', Math.max(0, percentual) * 100) }
        ]
      },
      {
        title: tituloSituacao,
        text: situacao === 'ALERTA_80'
          ? 'Novas faltas podem levar ao atingimento do limite e ao fluxo institucional de desligamento por faltas.'
          : 'Continue acompanhando suas presencas e, quando aplicavel, utilize o fluxo oficial de justificativas dentro do prazo.'
      }
    ],
    footerNote: 'Este aviso e automatico e tambem foi compartilhado com a secretaria do GEAPA para acompanhamento operacional.'
  };
}

function atividades_buildDisciplinaryAlertRowsToNotify_(presenceState, opts) {
  opts = opts || {};
  var rowNumbersFilter = Object.create(null);
  var hasRowFilter = false;
  if (Array.isArray(opts.rowNumbers) && opts.rowNumbers.length) {
    opts.rowNumbers.forEach(function(rowNumber) {
      var row = Number(rowNumber || 0);
      if (row >= 2) {
        rowNumbersFilter[row] = true;
        hasRowFilter = true;
      }
    });
  }

  var targetSituacoes = {
    ALERTA_60: true,
    ALERTA_80: true
  };

  return (presenceState.records || []).map(function(record, index) {
    return {
      rowNumber: index + 2,
      record: record
    };
  }).filter(function(item) {
    if (hasRowFilter && !rowNumbersFilter[item.rowNumber]) return false;
    var situacao = String(item.record.SITUACAO_DISCIPLINAR || '').trim();
    return !!targetSituacoes[situacao];
  });
}

function atividades_notificarAlertasDisciplinaresPeriodoVigente_(opts) {
  opts = opts || {};
  var presenceState = opts.presenceState || atividades_buildCurrentPresenceState_();
  var ctx = opts.ctx || presenceState.ctx || atividades_getCurrentPeriodContext_();
  var emailsSecretaria = (GEAPA_CORE.coreGetCurrentEmailsByEmailGroup('SECRETARIA') || []).map(function(email) {
    return String(email || '').trim();
  }).filter(function(email) {
    return GEAPA_CORE.coreIsValidEmail(email);
  });
  var notifiedSet = atividades_buildDisciplinaryAlertNotificationsSentSet_();
  var rows = atividades_buildDisciplinaryAlertRowsToNotify_(presenceState, opts);
  var queued = [];
  var duplicates = 0;
  var deferred = 0;
  var skipped = [];

  rows.forEach(function(item) {
    var record = item.record || {};
    var situacao = String(record.SITUACAO_DISCIPLINAR || '').trim();
    var rga = String(record.RGA || '').trim();
    var email = String(record.EMAIL || '').trim();
    var correlationKey = atividades_buildDisciplinaryAlertCorrelationKey_(ctx.code, rga, situacao);
    var logType = atividades_getDisciplinaryNotificationLogType_(situacao);
    var stage = atividades_getDisciplinaryNotificationStage_(situacao);
    var subjectHuman = atividades_getDisciplinaryNotificationSubject_(situacao);

    if (!rga) {
      skipped.push({ rowNumber: item.rowNumber, reason: 'sem_rga', situacao: situacao });
      return;
    }
    if (!GEAPA_CORE.coreIsValidEmail(email)) {
      skipped.push({ rowNumber: item.rowNumber, rga: rga, reason: 'email_invalido', situacao: situacao });
      return;
    }
    if (!stage || !subjectHuman || !logType) {
      skipped.push({ rowNumber: item.rowNumber, rga: rga, reason: 'situacao_nao_notificavel', situacao: situacao });
      return;
    }
    if (notifiedSet[correlationKey]) {
      skipped.push({ rowNumber: item.rowNumber, rga: rga, reason: 'alerta_ja_registrado', situacao: situacao });
      return;
    }

    var queueResult = atividades_tryQueueOutgoing_({
      moduleName: ATIVIDADES_CFG.MODULE_CODE,
      templateKey: 'GEAPA_OPERACIONAL',
      correlationKey: correlationKey,
      entityType: 'MEMBRO',
      entityId: rga,
      flowCode: ATIVIDADES_CFG.DISCIPLINA_NOTIFICACOES.FLOW_CODE,
      stage: stage,
      to: email,
      cc: emailsSecretaria.join(','),
      recipientName: String(record.NOME_MEMBRO || '').trim(),
      subjectHuman: subjectHuman,
      payload: atividades_buildDisciplinaryAlertPayload_(ctx, record, situacao),
      metadata: {
        source: 'geapa-atividades',
        periodCode: String(ctx.code || '').trim(),
        rga: rga,
        situacaoDisciplinar: situacao
      }
    });

    if (queueResult && queueResult.duplicate) {
      duplicates++;
      atividades_logEvento_({
        TIPO_EVENTO_LOG: logType,
        STATUS: 'OK',
        ACAO_EXECUTADA: 'Registrar aviso disciplinar ja existente na fila central',
        RESULTADO: correlationKey,
        OBSERVACOES: 'RGA=' + rga + ' | SITUACAO=' + situacao + ' | origem=mail_hub_duplicate'
      });
      notifiedSet[correlationKey] = true;
      return;
    }

    if (queueResult && queueResult.locked) {
      deferred++;
      return;
    }

    if (queueResult && queueResult.queued) {
      queued.push({
        rowNumber: item.rowNumber,
        rga: rga,
        situacao: situacao,
        correlationKey: correlationKey,
        saidaId: queueResult.saidaId || ''
      });
      atividades_logEvento_({
        TIPO_EVENTO_LOG: logType,
        STATUS: 'OK',
        ACAO_EXECUTADA: 'Enfileirar aviso disciplinar automatico',
        RESULTADO: correlationKey,
        OBSERVACOES: 'RGA=' + rga + ' | SITUACAO=' + situacao + ' | saidaId=' + (queueResult.saidaId || '')
      });
      notifiedSet[correlationKey] = true;
    }
  });

  if (deferred) {
    atividades_logEvento_({
      TIPO_EVENTO_LOG: ATIVIDADES_CFG.DISCIPLINA_NOTIFICACAO_LOG_TYPES.RESUMO,
      STATUS: 'ATENCAO',
      ACAO_EXECUTADA: 'Adiar avisos disciplinares por contencao da fila central',
      RESULTADO: 'deferred=' + deferred,
      OBSERVACOES: 'A fila central de e-mails estava ocupada. O job tentara novamente no proximo ciclo.'
    });
  }

  if (skipped.length) {
    atividades_logEvento_({
      TIPO_EVENTO_LOG: ATIVIDADES_CFG.DISCIPLINA_NOTIFICACAO_LOG_TYPES.RESUMO,
      STATUS: 'ATENCAO',
      ACAO_EXECUTADA: 'Registrar linhas ignoradas no envio de alertas disciplinares',
      RESULTADO: 'skipped=' + skipped.length,
      OBSERVACOES: skipped.slice(0, 20).map(function(item) {
        return (item.rga || 'SEM_RGA') + ':' + item.reason + ':' + (item.situacao || '');
      }).join(' | ')
    });
  }

  if (opts.processOutbox === false) {
    return {
      ok: true,
      period: ctx,
      queuedCount: queued.length,
      duplicateCount: duplicates,
      deferredCount: deferred,
      skippedCount: skipped.length,
      queued: queued,
      skipped: skipped
    };
  }

  return {
    ok: true,
    period: ctx,
    queuedCount: queued.length,
    duplicateCount: duplicates,
    deferredCount: deferred,
    skippedCount: skipped.length,
    queued: queued,
    skipped: skipped,
    outbox: queued.length ? GEAPA_CORE.coreMailProcessOutbox() : { ok: true, skipped: true, reason: 'no_queued_messages' }
  };
}

function atividades_shouldLogDisciplinaryTransition_(previousSituacao, nextSituacao) {
  var previous = String(previousSituacao || '').trim();
  var next = String(nextSituacao || '').trim();
  if (!next || next === 'NORMAL' || previous === next) return false;
  return !!atividades_getDisciplinaryLogType_(next);
}

function atividades_logDisciplinaryTransition_(ctx, record, previousSituacao, metrics) {
  if (!atividades_shouldLogDisciplinaryTransition_(previousSituacao, metrics.SITUACAO_DISCIPLINAR)) {
    return null;
  }

  return atividades_logEvento_({
    TIPO_EVENTO_LOG: atividades_getDisciplinaryLogType_(metrics.SITUACAO_DISCIPLINAR),
    STATUS: 'OK',
    ACAO_EXECUTADA: 'Registrar transicao de faixa disciplinar por faltas',
    RESULTADO: String(record.RGA || '').trim(),
    OBSERVACOES: 'Periodo=' + ctx.code +
      ' | situacao_anterior=' + String(previousSituacao || '').trim() +
      ' | situacao_atual=' + metrics.SITUACAO_DISCIPLINAR +
      ' | faltas_liquidas=' + metrics.FALTAS_LIQUIDAS +
      ' | limite=' + metrics.LIMITE_FALTAS_PERIODO +
      ' | percentual=' + Utilities.formatString('%.4f', Number(metrics.PERCENTUAL_USO_LIMITE || 0))
  });
}

function atividades_recalcularMotorDisciplinarPeriodoVigente_(opts) {
  opts = opts || {};
  var presenceState = opts.presenceState || atividades_buildCurrentPresenceState_();
  var ctx = opts.ctx || presenceState.ctx || atividades_getCurrentPeriodContext_();
  atividades_tryAutoFreezeSnapshotNormativoPeriodoVigente_({ ctx: ctx });
  var periodRows = opts.periodRows || atividades_getCurrentPeriodActivitiesMap_();
  var snapshot = opts.snapshot || atividades_getSnapshotNormativoPeriodo_(ctx);
  var contaFaltaHeaders = atividades_buildContaFaltaHeaders_(periodRows);
  var rowNumbersFilter = {};
  var hasFilter = Array.isArray(opts.rowNumbers) && opts.rowNumbers.length > 0;

  if (hasFilter) {
    opts.rowNumbers.forEach(function(rowNumber) {
      var row = Number(rowNumber || 0);
      if (row >= 2) rowNumbersFilter[row] = true;
    });
  }

  var updatedRows = 0;
  var transitions = [];
  var headerMap = presenceState.headerMap;
  var percentualUsoCol = GEAPA_CORE.coreGetCol(headerMap, 'PERCENTUAL_USO_LIMITE');

  (presenceState.records || []).forEach(function(record, index) {
    var rowNumber = index + 2;
    if (hasFilter && !rowNumbersFilter[rowNumber]) return;

    var metrics = atividades_buildDisciplinaryMetricsForPresenceRecord_(record, snapshot, contaFaltaHeaders);
    atividades_writeDisciplinaryMetricsToRow_(presenceState.sheet, headerMap, rowNumber, metrics);
    updatedRows++;

    var previousSituacao = String(record.SITUACAO_DISCIPLINAR || '').trim();
    if (opts.logTransitions !== false && atividades_shouldLogDisciplinaryTransition_(previousSituacao, metrics.SITUACAO_DISCIPLINAR)) {
      atividades_logDisciplinaryTransition_(ctx, record, previousSituacao, metrics);
      transitions.push({
        rowNumber: rowNumber,
        rga: String(record.RGA || '').trim(),
        from: previousSituacao,
        to: metrics.SITUACAO_DISCIPLINAR
      });
    }
  });

  if (percentualUsoCol && updatedRows) {
    var targetRows = hasFilter ? Object.keys(rowNumbersFilter).map(function(value) { return Number(value); }).sort(function(a, b) { return a - b; }) : null;
    if (targetRows && targetRows.length) {
      targetRows.forEach(function(rowNumber) {
        presenceState.sheet.getRange(rowNumber, percentualUsoCol).setNumberFormat('0.00%');
      });
    } else {
      presenceState.sheet.getRange(2, percentualUsoCol, presenceState.records.length, 1).setNumberFormat('0.00%');
    }
  }

  return {
    ok: true,
    period: ctx,
    frozenSnapshot: !!snapshot.frozen,
    snapshotSource: snapshot.source,
    totalAtividadesQueContamFalta: snapshot.totalPlanejado,
    limiteFaltasPeriodo: snapshot.limiteCongelado,
    updatedRows: updatedRows,
    transitions: transitions
  };
}

function atividades_gerarEventosDesligamentoPorFaltasPeriodoVigente_() {
  var presenceState = atividades_buildCurrentPresenceState_();
  var ctx = presenceState.ctx;
  var lifecycleEvents = atividades_getLifecycleEventRecords_().map(atividades_extractLifecycleEvent_);
  var existingKeys = {};

  lifecycleEvents.forEach(function(event) {
    if (event.tipo !== 'DESLIGAMENTO_POR_FALTAS') return;
    var key = String(event.rga || '').trim() + '|' + String(event.origemChave || '').trim();
    existingKeys[key] = true;
  });

  var created = [];
  (presenceState.records || []).forEach(function(record) {
    var rga = String(record.RGA || '').trim();
    if (!rga) return;
    if (String(record.SITUACAO_DISCIPLINAR || '').trim() !== 'LIMITE_ATINGIDO') return;

    var dedupeKey = rga + '|' + ctx.code;
    if (existingKeys[dedupeKey]) return;

    var eventRow = {
      ID_EVENTO_MEMBRO: 'EVM-' + Utilities.getUuid().slice(0, 8).toUpperCase(),
      RGA: rga,
      TIPO_EVENTO: 'DESLIGAMENTO_POR_FALTAS',
      DATA_EVENTO: new Date(),
      STATUS_EVENTO: 'REGISTRADO',
      MOTIVO_EVENTO: 'DESLIGAMENTO_POR_FALTAS',
      ORIGEM_MODULO: 'GEAPA_ATIVIDADES',
      ORIGEM_CHAVE: ctx.code,
      ORIGEM_ROW: '',
      NOME_MEMBRO: String(record.NOME_MEMBRO || '').trim(),
      EMAIL: String(record.EMAIL || '').trim(),
      OBSERVACOES: 'Gerado pelo motor disciplinar de faltas. faltas_liquidas=' +
        String(record.FALTAS_LIQUIDAS || '').trim() +
        ' | limite=' + String(record.LIMITE_FALTAS_PERIODO || '').trim(),
      CRIADO_EM: new Date(),
      ATUALIZADO_EM: new Date()
    };

    GEAPA_CORE.coreAppendObjectByHeaders(
      atividades_getSheetByKeyCached_(ATIVIDADES_CFG.STABLE_KEYS.MEMBER_LIFECYCLE_EVENTS),
      eventRow,
      { headerRow: 1 }
    );
    created.push(eventRow);
    existingKeys[dedupeKey] = true;
  });

  if (created.length) {
    atividades_logEvento_({
      TIPO_EVENTO_LOG: 'DISCIPLINA_EVENTO_DESLIGAMENTO_POR_FALTAS',
      STATUS: 'OK',
      ACAO_EXECUTADA: 'Gerar eventos institucionais de desligamento por faltas',
      RESULTADO: ctx.code,
      OBSERVACOES: 'eventos_gerados=' + created.length
    });
  }

  return {
    ok: true,
    period: ctx,
    generated: created.length,
    events: created.map(function(item) {
      return {
        ID_EVENTO_MEMBRO: item.ID_EVENTO_MEMBRO,
        RGA: item.RGA,
        STATUS_EVENTO: item.STATUS_EVENTO
      };
    })
  };
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
  atividades_applyPresenceSummaryNumberFormats_(sheet, rows.length);

  var headerMap = GEAPA_CORE.coreHeaderMap(sheet, 1);
  var percentualCol = GEAPA_CORE.coreGetCol(headerMap, 'PERCENTUAL_FREQUENCIA');
  if (percentualCol && rows.length) {
    sheet.getRange(2, percentualCol, rows.length, 1).setNumberFormat('0.00%');
  }
  var disciplinar = atividades_recalcularMotorDisciplinarPeriodoVigente_({
    presenceState: {
      ctx: ctx,
      sheet: sheet,
      headerMap: headerMap,
      records: GEAPA_CORE.coreReadSheetRecords(sheet, { headerRow: 1 })
    },
    ctx: ctx,
    periodRows: periodRows,
    logTransitions: true
  });

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
      ' | colunas dinamicas=' + dynamicHeaders.length +
      ' | snapshot_disciplina=' + disciplinar.snapshotSource +
      ' | transicoes_disciplina=' + disciplinar.transitions.length
  });

  return {
    ok: true,
    period: ctx,
    memberCount: rows.length,
    entrantsCount: entrantsCount,
    inactiveCount: inactiveCount,
    dynamicColumns: dynamicHeaders.length,
    disciplinary: disciplinar,
    sheetName: ctx.presenceSheetName
  };
}
