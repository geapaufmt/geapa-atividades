function atividades_parseDateOrNull_(value) {
  if (!value) return null;
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return value;
  }

  var parsed = new Date(value);
  return isNaN(parsed) ? null : parsed;
}

function atividades_pickRecordField_(record, aliases) {
  var names = Array.isArray(aliases) ? aliases : [aliases];
  var recordKeys = Object.keys(record || {});

  for (var i = 0; i < names.length; i++) {
    var wanted = atividades_normalizeTextLower_(names[i]);

    for (var j = 0; j < recordKeys.length; j++) {
      if (atividades_normalizeTextLower_(recordKeys[j]) === wanted) {
        return record[recordKeys[j]];
      }
    }
  }

  return '';
}

function atividades_isDateInsideRange_(targetDate, startDate, endDate) {
  var target = atividades_parseDateOrNull_(targetDate);
  var start = atividades_parseDateOrNull_(startDate);
  var end = atividades_parseDateOrNull_(endDate);

  if (!target || !start) return false;
  if (target < start) return false;
  if (end && target > end) return false;
  return true;
}

function atividades_tryReadCurrentPeriodFromRegistry_(refDate) {
  var periodKey = ATIVIDADES_CFG.STABLE_KEYS.PERIODS;
  if (!atividades_getRegistryEntryByKey_(periodKey)) return null;

  var now = refDate || new Date();
  var records = GEAPA_CORE.coreReadRecordsByKey(periodKey, {
    headerRow: ATIVIDADES_CFG.HEADER_ROW
  });
  var aliases = ATIVIDADES_CFG.PERIOD_HEADER_ALIASES;
  var nextPeriod = null;

  for (var i = 0; i < records.length; i++) {
    var record = records[i];
    var periodId = String(atividades_pickRecordField_(record, aliases.id) || '').trim();
    var start = atividades_parseDateOrNull_(atividades_pickRecordField_(record, aliases.start));
    var end = atividades_parseDateOrNull_(atividades_pickRecordField_(record, aliases.end));
    var displayName = String(atividades_pickRecordField_(record, aliases.displayName) || '').trim();
    var status = atividades_normalizeTextUpper_(atividades_pickRecordField_(record, aliases.status));

    if (!periodId || !start) continue;
    if (status && ['INATIVO', 'ENCERRADO', 'ARQUIVADO'].indexOf(status) >= 0) continue;

    var current = {
      source: 'VIGENCIA_PERIODOS',
      id: periodId,
      displayName: displayName || periodId,
      startDate: start,
      endDate: end,
      raw: record
    };

    if (atividades_isDateInsideRange_(now, start, end)) {
      return current;
    }

    if (start > now && (!nextPeriod || start < nextPeriod.startDate)) {
      nextPeriod = current;
    }
  }

  return nextPeriod;
}

function atividades_listSemesterRecords_() {
  var semesterKey = ATIVIDADES_CFG.STABLE_KEYS.SEMESTERS;
  if (!atividades_getRegistryEntryByKey_(semesterKey)) return [];
  return GEAPA_CORE.coreReadRecordsByKey(semesterKey, {
    headerRow: ATIVIDADES_CFG.HEADER_ROW
  });
}

function atividades_buildPeriodRangeFromSemesters_(periodId) {
  var targetPeriodId = String(periodId || '').trim();
  if (!targetPeriodId) return null;

  var aliases = ATIVIDADES_CFG.SEMESTER_HEADER_ALIASES;
  var semesters = atividades_listSemesterRecords_().filter(function(record) {
    var recordPeriodId = String(atividades_pickRecordField_(record, aliases.periodId) || '').trim();
    return recordPeriodId && atividades_normalizePeriodComparable_(recordPeriodId) === atividades_normalizePeriodComparable_(targetPeriodId);
  }).map(function(record) {
    return {
      id: String(atividades_pickRecordField_(record, aliases.id) || '').trim(),
      startDate: atividades_parseDateOrNull_(atividades_pickRecordField_(record, aliases.start)),
      endDate: atividades_parseDateOrNull_(atividades_pickRecordField_(record, aliases.end))
    };
  }).filter(function(item) {
    return !!item.startDate;
  });

  if (!semesters.length) return null;

  semesters.sort(function(a, b) {
    return a.startDate.getTime() - b.startDate.getTime();
  });

  var startDate = semesters[0].startDate;
  var endDate = semesters.reduce(function(maxDate, item) {
    if (!item.endDate) return maxDate;
    if (!maxDate || item.endDate.getTime() > maxDate.getTime()) return item.endDate;
    return maxDate;
  }, null);

  return {
    startDate: startDate,
    endDate: endDate,
    semesters: semesters
  };
}

function atividades_tryReadCurrentPeriodFromSemesterBridge_(refDate) {
  var semester = GEAPA_CORE.coreGetCurrentSemester(refDate);
  if (!semester || !semester.periodId) return null;

  var periodKey = ATIVIDADES_CFG.STABLE_KEYS.PERIODS;
  if (!atividades_getRegistryEntryByKey_(periodKey)) return null;

  var records = GEAPA_CORE.coreReadRecordsByKey(periodKey, {
    headerRow: ATIVIDADES_CFG.HEADER_ROW
  });
  var aliases = ATIVIDADES_CFG.PERIOD_HEADER_ALIASES;
  var targetPeriodId = String(semester.periodId || '').trim();
  var range = atividades_buildPeriodRangeFromSemesters_(targetPeriodId);
  var matchedRecord = null;

  for (var i = 0; i < records.length; i++) {
    var candidateId = String(atividades_pickRecordField_(records[i], aliases.id) || '').trim();
    if (!candidateId) continue;
    if (atividades_normalizePeriodComparable_(candidateId) === atividades_normalizePeriodComparable_(targetPeriodId)) {
      matchedRecord = records[i];
      break;
    }
  }

  return {
    source: 'VIGENCIA_PERIODOS',
    id: targetPeriodId,
    displayName: matchedRecord
      ? String(atividades_pickRecordField_(matchedRecord, aliases.displayName) || '').trim() || targetPeriodId
      : targetPeriodId,
    startDate: range && range.startDate ? range.startDate : (semester.startDate || null),
    endDate: range && range.endDate ? range.endDate : (semester.endDate || null),
    semesterId: semester.id || '',
    raw: matchedRecord || semester
  };
}

function atividades_buildFallbackPeriodFromSemester_(refDate) {
  var semester = GEAPA_CORE.coreGetCurrentSemester(refDate);
  if (!semester || !semester.id) {
    throw new Error(
      'Nao foi possivel resolver o periodo vigente via VIGENCIA_PERIODOS ' +
      'nem via VIGENCIA_SEMESTRES.'
    );
  }

  var periodId = String(semester.periodId || '').trim();
  if (!periodId) {
    var match = String(semester.id || '').trim().match(/^(\d{4})\/([12])$/);
    if (match) {
      var year = Number(match[1]);
      periodId = 'PER_' + year + '_' + (year + 1);
    } else {
      periodId = 'PERIODO_VIGENTE';
    }
  }

  return {
    source: 'VIGENCIA_SEMESTRES',
    id: periodId,
    displayName: periodId,
    startDate: semester.startDate || null,
    endDate: semester.endDate || null,
    semesterId: semester.id || '',
    raw: semester
  };
}

function atividades_normalizePeriodCode_(periodId) {
  var normalized = atividades_normalizeTextUpper_(periodId)
    .replace(/[^\w]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');

  return normalized || 'PERIODO_VIGENTE';
}

function atividades_buildCurrentPeriodContext_(sourcePeriod) {
  var periodId = String(sourcePeriod.id || '').trim();
  var code = atividades_normalizePeriodCode_(periodId);

  return Object.freeze({
    source: sourcePeriod.source || '',
    id: periodId,
    code: code,
    displayName: String(sourcePeriod.displayName || periodId || code).trim(),
    startDate: sourcePeriod.startDate || null,
    endDate: sourcePeriod.endDate || null,
    semesterId: String(sourcePeriod.semesterId || '').trim(),
    activitySheetName: ATIVIDADES_CFG.DYNAMIC_SHEET_PREFIXES.PERIODO_ATIVIDADES + code,
    presenceSheetName: ATIVIDADES_CFG.DYNAMIC_SHEET_PREFIXES.PERIODO_PRESENCAS + code
  });
}

function atividades_getCurrentPeriodContext_(refDate) {
  var fromSemesterBridge = atividades_tryReadCurrentPeriodFromSemesterBridge_(refDate);
  if (fromSemesterBridge) {
    return atividades_buildCurrentPeriodContext_(fromSemesterBridge);
  }

  var fromPeriods = atividades_tryReadCurrentPeriodFromRegistry_(refDate);
  if (fromPeriods) {
    return atividades_buildCurrentPeriodContext_(fromPeriods);
  }

  return atividades_buildCurrentPeriodContext_(
    atividades_buildFallbackPeriodFromSemester_(refDate)
  );
}

function atividades_getPeriodsSheet_() {
  return atividades_getSheetByKeyCached_(ATIVIDADES_CFG.STABLE_KEYS.PERIODS);
}

function atividades_normalizePeriodComparable_(value) {
  return atividades_normalizePeriodCode_(String(value || '').trim());
}

function atividades_buildPeriodIdentityTokens_(ctx) {
  var values = [
    ctx && ctx.id,
    ctx && ctx.code,
    ctx && ctx.displayName,
    ctx && ctx.semesterId
  ];
  var out = [];
  var seen = {};

  values.forEach(function(value) {
    var normalized = atividades_normalizePeriodComparable_(value);
    if (!normalized || seen[normalized]) return;
    out.push(normalized);
    seen[normalized] = true;
  });

  return out;
}

function atividades_periodTokenMatches_(value, tokens) {
  var normalized = atividades_normalizePeriodComparable_(value);
  return !!normalized && (tokens || []).indexOf(normalized) >= 0;
}

function atividades_ensureHeadersOnSheet_(sheet, headers) {
  if (!sheet || !headers || !headers.length) return;

  var lastColumn = Math.max(sheet.getLastColumn(), 1);
  var currentHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function(header) {
    return String(header || '').trim();
  });
  var lastUsedIndex = 0;
  currentHeaders.forEach(function(header, index) {
    if (header) lastUsedIndex = index + 1;
  });
  var missing = headers.filter(function(header) {
    return currentHeaders.indexOf(header) === -1;
  });

  if (!missing.length) return;

  var writePlan = [];
  currentHeaders.forEach(function(header, index) {
    if (!header && missing.length) {
      writePlan.push({ col: index + 1, value: missing.shift() });
    }
  });

  if (missing.length) {
    var startCol = lastUsedIndex + 1;
    if (sheet.getMaxColumns() < startCol + missing.length - 1) {
      sheet.insertColumnsAfter(sheet.getMaxColumns(), startCol + missing.length - 1 - sheet.getMaxColumns());
    }
    missing.forEach(function(header, offset) {
      writePlan.push({ col: startCol + offset, value: header });
    });
  }

  writePlan.forEach(function(item) {
    sheet.getRange(1, item.col).setValue(item.value);
  });
}

function atividades_cleanupAutoGeneratedPeriodHeaders_(sheet) {
  if (!sheet) return 0;

  var lastColumn = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  var cleaned = 0;

  headers.forEach(function(header, index) {
    if (/^Coluna\s+\d+$/i.test(String(header || '').trim())) {
      sheet.getRange(1, index + 1).clearContent();
      cleaned++;
    }
  });

  return cleaned;
}

function atividades_getOrCreateHeaderColumn_(sheet, headerName) {
  var wanted = String(headerName || '').trim();
  if (!wanted) throw new Error('headerName obrigatorio.');

  var lastColumn = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function(header) {
    return String(header || '').trim();
  });
  var firstReusableCol = 0;

  for (var i = 0; i < headers.length; i++) {
    if (headers[i] === wanted) return i + 1;
    if (!firstReusableCol && (!headers[i] || /^Coluna\s+\d+$/i.test(headers[i]))) {
      firstReusableCol = i + 1;
    }
  }

  var targetCol = firstReusableCol || (headers.length + 1);
  if (sheet.getMaxColumns() < targetCol) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), targetCol - sheet.getMaxColumns());
  }
  sheet.getRange(1, targetCol).setValue(wanted);
  return targetCol;
}

function atividades_prepareSnapshotColumns_(sheet) {
  atividades_cleanupAutoGeneratedPeriodHeaders_(sheet);
  return {
    totalPlanejado: atividades_getOrCreateHeaderColumn_(sheet, 'TOTAL_ATIVIDADES_QUE_CONTAM_FALTA_PLANEJADAS'),
    limiteCongelado: atividades_getOrCreateHeaderColumn_(sheet, 'LIMITE_FALTAS_PERIODO_CONGELADO'),
    dataFechamento: atividades_getOrCreateHeaderColumn_(sheet, 'DATA_FECHAMENTO_PLANEJAMENTO')
  };
}

function atividades_findCurrentPeriodRowByHeaderMap_(sheet, headerMap, ctx) {
  var idCol = GEAPA_CORE.coreGetCol(headerMap, 'ID_Periodo') ||
    GEAPA_CORE.coreGetCol(headerMap, 'ID Periodo') ||
    GEAPA_CORE.coreGetCol(headerMap, 'ID_PERIODO') ||
    GEAPA_CORE.coreGetCol(headerMap, 'Periodo') ||
    GEAPA_CORE.coreGetCol(headerMap, 'Periodo_ID');
  var nameCol = GEAPA_CORE.coreGetCol(headerMap, 'Nome') ||
    GEAPA_CORE.coreGetCol(headerMap, 'Nome_Periodo') ||
    GEAPA_CORE.coreGetCol(headerMap, 'Descricao') ||
    GEAPA_CORE.coreGetCol(headerMap, 'Descricao_Periodo');
  var lastRow = sheet.getLastRow();
  var tokens = atividades_buildPeriodIdentityTokens_(ctx);

  for (var rowNumber = 2; rowNumber <= lastRow; rowNumber++) {
    var idValue = idCol ? sheet.getRange(rowNumber, idCol).getDisplayValue() : '';
    var nameValue = nameCol ? sheet.getRange(rowNumber, nameCol).getDisplayValue() : '';
    if (
      atividades_periodTokenMatches_(idValue, tokens) ||
      atividades_periodTokenMatches_(nameValue, tokens)
    ) {
      return rowNumber;
    }
  }

  return 0;
}

function atividades_findCurrentPeriodRowInSheet_(sheet, ctx) {
  var values = sheet.getDataRange().getValues();
  if (!values.length) return null;

  var headers = values[0];
  var aliases = ATIVIDADES_CFG.PERIOD_HEADER_ALIASES;
  var tokens = atividades_buildPeriodIdentityTokens_(ctx);

  for (var rowNumber = 2; rowNumber <= values.length; rowNumber++) {
    var record = GEAPA_CORE.coreRowToObject(headers, values[rowNumber - 1]);
    var periodId = atividades_pickRecordField_(record, aliases.id);
    var displayName = atividades_pickRecordField_(record, aliases.displayName);
    if (
      atividades_periodTokenMatches_(periodId, tokens) ||
      atividades_periodTokenMatches_(displayName, tokens)
    ) {
      return {
        rowNumber: rowNumber,
        headers: headers,
        record: record
      };
    }
  }

  return null;
}

function atividades_recordBelongsToPeriodPlanning_(record, ctx) {
  var explicitPeriod = String(record.PERIODO_REFERENCIA || '').trim();
  var tokens = atividades_buildPeriodIdentityTokens_(ctx);
  if (explicitPeriod) {
    return atividades_periodTokenMatches_(explicitPeriod, tokens);
  }

  return atividades_isDateInsideRange_(record.DATA_ATIVIDADE, ctx.startDate, ctx.endDate);
}

function atividades_isPlanningBaseCandidate_(record, ctx, opts) {
  opts = opts || {};
  if (!atividades_recordBelongsToPeriodPlanning_(record, ctx)) return false;
  if (!atividades_isTruthySim_(record.BASE_PLANEJAMENTO_INICIAL)) return false;
  if (!atividades_isTruthySim_(record.CONTA_FALTA)) return false;
  if (opts.requireDate && !atividades_parseDateOrNull_(record.DATA_ATIVIDADE)) return false;
  return true;
}

function atividades_buildPlanningBaseRows_(ctx) {
  var records = GEAPA_CORE.coreReadSheetRecords(atividades_getAtividadesSheet_(), {
    headerRow: 1
  });

  return records.filter(function(record) {
    return atividades_isPlanningBaseCandidate_(record, ctx);
  });
}

function atividades_calculatePlanningClosingDeadline_(baseRows) {
  var dated = (baseRows || []).map(function(record) {
    return atividades_parseDateOrNull_(record.DATA_ATIVIDADE);
  }).filter(function(dateValue) {
    return !!dateValue;
  }).sort(function(a, b) {
    return a.getTime() - b.getTime();
  });

  if (!dated.length) return null;

  var firstActivity = dated[0];
  var deadline = new Date(firstActivity.getTime());
  deadline.setDate(deadline.getDate() - 1);
  deadline.setHours(23, 59, 0, 0);
  return deadline;
}

function atividades_derivarPlanejamentoNormativoPeriodo_(ctx) {
  var plannedRows = atividades_buildPlanningBaseRows_(ctx);

  return {
    totalAtividadesQueContamFaltaPlanejadas: plannedRows.length,
    source: 'ATIVIDADES_BASE_INICIAL',
    dataFechamentoPlanejamento: atividades_calculatePlanningClosingDeadline_(plannedRows),
    idsAtividade: plannedRows.map(function(record) {
      return String(record.ID_ATIVIDADE || '').trim();
    }).filter(function(value) {
      return !!value;
    })
  };
}

function atividades_calcularLimiteFaltasPeriodo_(totalPlanejado) {
  var total = Number(totalPlanejado || 0);
  if (!isFinite(total) || total <= 0) return 0;
  return Math.floor(ATIVIDADES_CFG.DISCIPLINA.LIMIT_PERCENTAGE * total);
}

function atividades_getSnapshotNormativoPeriodo_(ctx, opts) {
  opts = opts || {};
  var derived = atividades_derivarPlanejamentoNormativoPeriodo_(ctx);
  var derivedLimit = atividades_calcularLimiteFaltasPeriodo_(
    derived.totalAtividadesQueContamFaltaPlanejadas
  );
  var periodsEntry = atividades_getRegistryEntryByKey_(ATIVIDADES_CFG.STABLE_KEYS.PERIODS);

  if (!periodsEntry) {
    return {
      ok: true,
      frozen: false,
      source: 'ATIVIDADES_PREVIEW',
      totalPlanejado: derived.totalAtividadesQueContamFaltaPlanejadas,
      limiteCongelado: derivedLimit,
      dataFechamentoPlanejamento: null,
      derived: derived,
      rowNumber: 0
    };
  }

  var sheet = atividades_getPeriodsSheet_();
  var snapshotCols = opts.ensureHeaders ? atividades_prepareSnapshotColumns_(sheet) : null;

  var rowState = atividades_findCurrentPeriodRowInSheet_(sheet, ctx);
  if (!rowState) {
    return {
      ok: true,
      frozen: false,
      source: 'ATIVIDADES_PREVIEW',
      totalPlanejado: derived.totalAtividadesQueContamFaltaPlanejadas,
      limiteCongelado: derivedLimit,
      dataFechamentoPlanejamento: null,
      derived: derived,
      rowNumber: 0
    };
  }

  if (!snapshotCols) snapshotCols = atividades_prepareSnapshotColumns_(sheet);
  var rawTotal = sheet.getRange(rowState.rowNumber, snapshotCols.totalPlanejado).getValue();
  var rawLimit = sheet.getRange(rowState.rowNumber, snapshotCols.limiteCongelado).getValue();
  var rawClosedAt = sheet.getRange(rowState.rowNumber, snapshotCols.dataFechamento).getValue();
  var totalPlanejado = Number(rawTotal || 0);
  var limiteCongelado = Number(rawLimit || 0);
  var dataFechamento = atividades_parseDateOrNull_(rawClosedAt);
  var frozen = !!(
    String(rawTotal || '').trim() !== '' ||
    String(rawLimit || '').trim() !== ''
  );

  if (!isFinite(totalPlanejado)) totalPlanejado = 0;
  if (!isFinite(limiteCongelado)) limiteCongelado = 0;

  if (frozen) {
    if (String(rawLimit || '').trim() === '') {
      limiteCongelado = atividades_calcularLimiteFaltasPeriodo_(totalPlanejado);
    }

    return {
      ok: true,
      frozen: true,
      source: 'VIGENCIA_PERIODOS',
      totalPlanejado: totalPlanejado,
      limiteCongelado: limiteCongelado,
      dataFechamentoPlanejamento: dataFechamento || derived.dataFechamentoPlanejamento || null,
      derived: derived,
      rowNumber: rowState.rowNumber,
      sheet: sheet
    };
  }

  return {
    ok: true,
    frozen: false,
    source: 'ATIVIDADES_PREVIEW',
    totalPlanejado: derived.totalAtividadesQueContamFaltaPlanejadas,
    limiteCongelado: derivedLimit,
    dataFechamentoPlanejamento: dataFechamento || derived.dataFechamentoPlanejamento || null,
    derived: derived,
    rowNumber: rowState.rowNumber,
    sheet: sheet
  };
}

function atividades_atualizarPreviewFechamentoPlanejamentoPeriodoVigente_(opts) {
  opts = opts || {};
  var ctx = opts.ctx || atividades_getCurrentPeriodContext_();
  var snapshot = atividades_getSnapshotNormativoPeriodo_(ctx, { ensureHeaders: true });
  if (!snapshot.rowNumber || !snapshot.sheet) {
    return { ok: true, updated: false, reason: 'period_row_not_found', period: ctx };
  }
  if (snapshot.frozen && !opts.force) {
    return { ok: true, updated: false, reason: 'snapshot_already_frozen', period: ctx };
  }

  var snapshotCols = atividades_prepareSnapshotColumns_(snapshot.sheet);
  var nextDeadline = snapshot.derived.dataFechamentoPlanejamento || null;
  snapshot.sheet.getRange(snapshot.rowNumber, snapshotCols.dataFechamento).setValue(nextDeadline || '');

  return {
    ok: true,
    updated: true,
    period: ctx,
    dataFechamentoPlanejamento: nextDeadline
  };
}

function atividades_tryAutoFreezeSnapshotNormativoPeriodoVigente_(opts) {
  opts = opts || {};
  var ctx = opts.ctx || atividades_getCurrentPeriodContext_();
  var preview = atividades_atualizarPreviewFechamentoPlanejamentoPeriodoVigente_({ ctx: ctx });
  var snapshot = atividades_getSnapshotNormativoPeriodo_(ctx, { ensureHeaders: true });
  if (snapshot.frozen) {
    return {
      ok: true,
      autoFrozen: false,
      skipped: true,
      reason: 'already_frozen',
      preview: preview,
      period: ctx
    };
  }

  if (!snapshot.dataFechamentoPlanejamento) {
    return {
      ok: true,
      autoFrozen: false,
      skipped: true,
      reason: 'planning_deadline_not_defined',
      preview: preview,
      period: ctx
    };
  }

  var now = opts.refDate || new Date();
  if (now.getTime() < snapshot.dataFechamentoPlanejamento.getTime()) {
    return {
      ok: true,
      autoFrozen: false,
      skipped: true,
      reason: 'before_planning_deadline',
      preview: preview,
      period: ctx,
      dataFechamentoPlanejamento: snapshot.dataFechamentoPlanejamento
    };
  }

  var frozen = atividades_congelarSnapshotNormativoPeriodoVigente_({
    force: !!opts.force
  });
  return {
    ok: true,
    autoFrozen: true,
    skipped: false,
    preview: preview,
    frozen: frozen,
    period: ctx
  };
}

function atividades_congelarSnapshotNormativoPeriodoVigente_(opts) {
  opts = opts || {};
  var periodsEntry = atividades_getRegistryEntryByKey_(ATIVIDADES_CFG.STABLE_KEYS.PERIODS);
  if (!periodsEntry) {
    throw new Error('KEY obrigatoria nao encontrada no Registry para congelar snapshot: ' + ATIVIDADES_CFG.STABLE_KEYS.PERIODS);
  }

  var ctx = atividades_getCurrentPeriodContext_();
  var idsBaseInicial = atividades_fillMissingActivityIdsForPlanningBasePeriodoVigente_({
    ctx: ctx
  });
  var snapshot = atividades_getSnapshotNormativoPeriodo_(ctx, { ensureHeaders: true });
  if (!snapshot.rowNumber || !snapshot.sheet) {
    throw new Error('Nao foi possivel localizar a linha do periodo vigente em VIGENCIA_PERIODOS: ' + ctx.id);
  }

  if (snapshot.frozen && !opts.force) {
    return {
      ok: true,
      period: ctx,
      frozen: true,
      skipped: true,
      reason: 'already_frozen',
      totalPlanejado: snapshot.totalPlanejado,
      limiteCongelado: snapshot.limiteCongelado,
      dataFechamentoPlanejamento: snapshot.dataFechamentoPlanejamento
    };
  }

  var totalPlanejado = snapshot.derived.totalAtividadesQueContamFaltaPlanejadas;
  var limiteCongelado = atividades_calcularLimiteFaltasPeriodo_(totalPlanejado);
  var fechadoEm = snapshot.derived.dataFechamentoPlanejamento || snapshot.dataFechamentoPlanejamento || new Date();
  var snapshotCols = atividades_prepareSnapshotColumns_(snapshot.sheet);
  var headerMap = GEAPA_CORE.coreHeaderMap(snapshot.sheet, 1);
  var targetRowNumber = atividades_findCurrentPeriodRowByHeaderMap_(snapshot.sheet, headerMap, ctx) || snapshot.rowNumber;

  snapshot.sheet.getRange(targetRowNumber, snapshotCols.totalPlanejado).setValue(totalPlanejado);
  snapshot.sheet.getRange(targetRowNumber, snapshotCols.limiteCongelado).setValue(limiteCongelado);
  snapshot.sheet.getRange(targetRowNumber, snapshotCols.dataFechamento).setValue(fechadoEm);

  atividades_logEvento_({
    TIPO_EVENTO_LOG: 'CONGELAMENTO_SNAPSHOT_DISCIPLINAR',
    STATUS: 'OK',
    ACAO_EXECUTADA: 'Congelar snapshot normativo do periodo vigente',
    RESULTADO: ctx.code,
    OBSERVACOES: 'total_planejado=' + totalPlanejado + ' | limite_congelado=' + limiteCongelado + ' | fonte=' + snapshot.derived.source
  });

  return {
    ok: true,
    period: ctx,
    frozen: true,
    skipped: false,
    idsBaseInicial: idsBaseInicial,
    totalPlanejado: totalPlanejado,
    limiteCongelado: limiteCongelado,
    dataFechamentoPlanejamento: fechadoEm
  };
}

function atividades_forcarRecalculoSnapshotNormativoPeriodoVigente_() {
  var preview = atividades_atualizarPreviewFechamentoPlanejamentoPeriodoVigente_({
    force: true
  });
  var frozen = atividades_congelarSnapshotNormativoPeriodoVigente_({
    force: true
  });
  return {
    ok: true,
    period: frozen.period,
    preview: preview,
    frozen: frozen
  };
}
