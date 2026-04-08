function atividades_parseTimeValueToMinutes_(value) {
  if (value === null || value === undefined || value === '') return null;

  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return value.getHours() * 60 + value.getMinutes();
  }

  if (typeof value === 'number' && isFinite(value)) {
    var normalized = value > 1 ? value % 1 : value;
    return Math.round(normalized * 24 * 60);
  }

  var text = String(value || '').trim();
  if (!text) return null;

  var match = text.match(/^(\d{1,2})[:hH](\d{2})$/);
  if (!match) return null;

  var hours = Number(match[1]);
  var minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
}

function atividades_calculateCargaHorariaFromTimes_(startValue, endValue) {
  var startMinutes = atividades_parseTimeValueToMinutes_(startValue);
  var endMinutes = atividades_parseTimeValueToMinutes_(endValue);
  if (startMinutes === null || endMinutes === null) return null;
  if (endMinutes <= startMinutes) return null;

  return Math.round(((endMinutes - startMinutes) / 60) * 100) / 100;
}

function atividades_applyCargaHorariaForRow_(rowNumber) {
  var targetRow = Number(rowNumber || 0);
  if (targetRow < 2) {
    throw new Error('rowNumber invalido para calcular CARGA_HORARIA: ' + rowNumber);
  }

  var ctx = atividades_readActivityRowObject_(targetRow);
  var headerMap = ctx.headerMap;
  var cargaCol = GEAPA_CORE.coreGetCol(headerMap, 'CARGA_HORARIA');
  if (!cargaCol) {
    throw new Error('Cabecalho CARGA_HORARIA nao encontrado na aba Atividades.');
  }

  var currentCarga = ctx.rowObj.CARGA_HORARIA;
  if (currentCarga !== null && currentCarga !== undefined && String(currentCarga).trim() !== '') {
    return {
      ok: true,
      rowNumber: targetRow,
      updated: false,
      reason: 'already_filled',
      cargaHoraria: currentCarga
    };
  }

  var cargaHoraria = atividades_calculateCargaHorariaFromTimes_(
    ctx.rowObj.HORARIO_INICIO,
    ctx.rowObj.HORARIO_FIM
  );

  if (cargaHoraria === null) {
    return {
      ok: true,
      rowNumber: targetRow,
      updated: false,
      reason: 'invalid_or_incomplete_time_range'
    };
  }

  GEAPA_CORE.coreWriteCellByHeader(ctx.sheet, targetRow, headerMap, 'CARGA_HORARIA', cargaHoraria, {
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
    updated: true,
    cargaHoraria: cargaHoraria
  };
}

function atividades_fillCargaHorariaFromTimes_() {
  var sheet = atividades_getAtividadesSheet_();
  var lastRow = sheet.getLastRow();
  var results = [];

  for (var row = 2; row <= lastRow; row++) {
    var result = atividades_applyCargaHorariaForRow_(row);
    if (result.updated) results.push(result);
  }

  return {
    ok: true,
    updatedCount: results.length,
    updated: results
  };
}
