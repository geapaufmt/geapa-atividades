function atividades_getActivityHeaderMap_() {
  return GEAPA_CORE.coreHeaderMap(atividades_getAtividadesSheet_(), 1);
}

function atividades_getActivityRowObject_(rowNumber) {
  var sheet = atividades_getAtividadesSheet_();
  var targetRow = Number(rowNumber || 0);
  if (targetRow < 2 || !isFinite(targetRow)) {
    throw new Error('rowNumber invalido para leitura de atividade: ' + rowNumber);
  }

  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var row = sheet.getRange(targetRow, 1, 1, lastCol).getValues()[0];
  return GEAPA_CORE.coreRowToObject(headers, row);
}

function atividades_isStatusPlanejada_(value) {
  return atividades_normalizeTextUpper_(value) === 'PLANEJADA';
}

function atividades_applyPlanningDefaultsForRow_(rowNumber) {
  var sheet = atividades_getAtividadesSheet_();
  var targetRow = Number(rowNumber || 0);
  if (targetRow < 2 || !isFinite(targetRow)) {
    return { ok: false, skipped: true, reason: 'invalid_row' };
  }

  var initialRow = atividades_getActivityRowObject_(targetRow);
  if (!atividades_isStatusPlanejada_(initialRow.STATUS)) {
    var previewOutsidePlanejada = atividades_atualizarPreviewFechamentoPlanejamentoPeriodoVigente_();
    var autoFreezeOutsidePlanejada = atividades_tryAutoFreezeSnapshotNormativoPeriodoVigente_();
    return {
      ok: true,
      skipped: true,
      reason: 'status_not_planejada',
      rowNumber: targetRow,
      preview: previewOutsidePlanejada,
      autoFreeze: autoFreezeOutsidePlanejada
    };
  }

  atividades_applyCargaHorariaForRow_(targetRow);
  var configApplied = atividades_aplicarConfigLinhaAtividade_(targetRow, {
    fillOnlyEmpty: true
  });

  var rowObj = atividades_getActivityRowObject_(targetRow);
  var headerMap = atividades_getActivityHeaderMap_();
  var defaultedBase = false;

  if (
    GEAPA_CORE.coreGetCol(headerMap, 'BASE_PLANEJAMENTO_INICIAL') &&
    !String(rowObj.BASE_PLANEJAMENTO_INICIAL || '').trim() &&
    atividades_isTruthySim_(rowObj.CONTA_FALTA)
  ) {
    GEAPA_CORE.coreWriteCellByHeader(
      sheet,
      targetRow,
      headerMap,
      'BASE_PLANEJAMENTO_INICIAL',
      ATIVIDADES_CFG.PLANNING.BASE_DEFAULT,
      { oneBased: true }
    );
    defaultedBase = true;
  }

  if (GEAPA_CORE.coreGetCol(headerMap, 'ATUALIZADO_EM')) {
    GEAPA_CORE.coreWriteCellByHeader(
      sheet,
      targetRow,
      headerMap,
      'ATUALIZADO_EM',
      new Date(),
      { oneBased: true }
    );
  }

  var preview = atividades_atualizarPreviewFechamentoPlanejamentoPeriodoVigente_();
  var autoFreeze = atividades_tryAutoFreezeSnapshotNormativoPeriodoVigente_();

  return {
    ok: true,
    rowNumber: targetRow,
    configApplied: configApplied,
    defaultedBase: defaultedBase,
    preview: preview,
    autoFreeze: autoFreeze
  };
}
