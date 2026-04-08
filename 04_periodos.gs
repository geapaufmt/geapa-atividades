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
  var fromPeriods = atividades_tryReadCurrentPeriodFromRegistry_(refDate);
  if (fromPeriods) {
    return atividades_buildCurrentPeriodContext_(fromPeriods);
  }

  return atividades_buildCurrentPeriodContext_(
    atividades_buildFallbackPeriodFromSemester_(refDate)
  );
}
