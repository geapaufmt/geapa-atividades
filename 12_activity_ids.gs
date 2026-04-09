function atividades_padLeftNumber_(value, length) {
  var text = String(Number(value || 0));
  while (text.length < length) text = '0' + text;
  return text;
}

function atividades_extractActivityIdNumber_(value) {
  var text = String(value || '').trim().toUpperCase();
  var match = text.match(/^ATV-(\d+)$/);
  return match ? Number(match[1]) : 0;
}

function atividades_buildActivityIdFromNumber_(numberValue) {
  return ATIVIDADES_CFG.ACTIVITY_ID_PREFIX +
    atividades_padLeftNumber_(numberValue, ATIVIDADES_CFG.ACTIVITY_ID_PAD_LENGTH);
}

function atividades_listExistingActivityIdNumbers_() {
  var records = GEAPA_CORE.coreReadSheetRecords(atividades_getAtividadesSheet_(), { headerRow: 1 });
  return records.map(function(record) {
    return atividades_extractActivityIdNumber_(record.ID_ATIVIDADE);
  }).filter(function(numberValue) {
    return numberValue > 0;
  });
}

function atividades_getNextActivityId_() {
  var numbers = atividades_listExistingActivityIdNumbers_();
  var nextNumber = numbers.length ? Math.max.apply(null, numbers) + 1 : 1;
  return atividades_buildActivityIdFromNumber_(nextNumber);
}

function atividades_isActivityRowEligibleForId_(rowObj) {
  return !!(
    String(rowObj.TIPO_ATIVIDADE || '').trim() &&
    (
      String(rowObj.DATA_ATIVIDADE || '').trim() ||
      String(rowObj.PERIODO_REFERENCIA || '').trim()
    )
  );
}

function atividades_readActivityRowObject_(rowNumber) {
  var sheet = atividades_getAtividadesSheet_();
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var row = sheet.getRange(rowNumber, 1, 1, lastCol).getValues()[0];
  return {
    sheet: sheet,
    headerMap: GEAPA_CORE.coreHeaderMap(sheet, 1),
    rowObj: GEAPA_CORE.coreRowToObject(headers, row)
  };
}

function atividades_ensureActivityIdForRow_(rowNumber) {
  var targetRow = Number(rowNumber || 0);
  if (targetRow < 2) {
    throw new Error('rowNumber invalido para garantir ID_ATIVIDADE: ' + rowNumber);
  }

  var lock = LockService.getDocumentLock() || LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var ctx = atividades_readActivityRowObject_(targetRow);
    var currentId = String(ctx.rowObj.ID_ATIVIDADE || '').trim();
    if (currentId) {
      return {
        ok: true,
        rowNumber: targetRow,
        created: false,
        idAtividade: currentId,
        reason: 'already_exists'
      };
    }

    if (!atividades_isActivityRowEligibleForId_(ctx.rowObj)) {
      return {
        ok: true,
        rowNumber: targetRow,
        created: false,
        idAtividade: '',
        reason: 'row_not_eligible'
      };
    }

    var headerMap = ctx.headerMap;
    if (!GEAPA_CORE.coreGetCol(headerMap, 'ID_ATIVIDADE')) {
      throw new Error('Cabecalho ID_ATIVIDADE nao encontrado na aba Atividades.');
    }

    var nextId = atividades_getNextActivityId_();
    GEAPA_CORE.coreWriteCellByHeader(ctx.sheet, targetRow, headerMap, 'ID_ATIVIDADE', nextId, {
      oneBased: true
    });

    if (GEAPA_CORE.coreGetCol(headerMap, 'ATUALIZADO_EM')) {
      GEAPA_CORE.coreWriteCellByHeader(ctx.sheet, targetRow, headerMap, 'ATUALIZADO_EM', new Date(), {
        oneBased: true
      });
    }

    return {
      ok: true,
      rowNumber: targetRow,
      created: true,
      idAtividade: nextId
    };
  } finally {
    lock.releaseLock();
  }
}

function atividades_fillMissingActivityIds_() {
  var sheet = atividades_getAtividadesSheet_();
  var lastRow = sheet.getLastRow();
  var results = [];

  for (var row = 2; row <= lastRow; row++) {
    var result = atividades_ensureActivityIdForRow_(row);
    if (result.created) results.push(result);
  }

  return {
    ok: true,
    createdCount: results.length,
    created: results
  };
}

function atividades_fillMissingActivityIdsForPlanningBasePeriodoVigente_(opts) {
  opts = opts || {};
  var ctx = opts.ctx || atividades_getCurrentPeriodContext_();
  var sheet = atividades_getAtividadesSheet_();
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var values = lastRow >= 2 ? sheet.getRange(2, 1, lastRow - 1, lastCol).getValues() : [];
  var created = [];
  var eligibleRows = [];

  values.forEach(function(row, index) {
    var rowNumber = index + 2;
    var record = GEAPA_CORE.coreRowToObject(headers, row);
    if (!atividades_isPlanningBaseCandidate_(record, ctx)) return;
    eligibleRows.push(rowNumber);
    if (String(record.ID_ATIVIDADE || '').trim()) return;
    var result = atividades_ensureActivityIdForRow_(rowNumber);
    if (result && result.created) created.push(result);
  });

  return {
    ok: true,
    period: ctx,
    eligibleRowCount: eligibleRows.length,
    createdCount: created.length,
    created: created
  };
}
