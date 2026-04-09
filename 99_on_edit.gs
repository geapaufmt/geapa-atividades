function onEditAtividades(e) {
  atividades_onEditConfigInheritance_(e);
  atividades_onEditJustificativas_(e);
  atividades_onEditPresencas_(e);
}

function atividades_onEditConfigInheritance_(e) {
  if (!e || !e.range) return;

  var sheet = e.range.getSheet();
  var atividadesSheet = atividades_getAtividadesSheet_();
  if (sheet.getSheetId() !== atividadesSheet.getSheetId()) return;
  if (e.range.getRow() <= 1) return;

  var headerMap = GEAPA_CORE.coreHeaderMap(atividadesSheet, 1);
  var monitoredCols = [
    'CLASSIFICACAO_REUNIAO',
    'TIPO_ATIVIDADE',
    'SUBTIPO_ATIVIDADE',
    'DATA_ATIVIDADE',
    'PERIODO_REFERENCIA',
    'TITULO',
    'HORARIO_INICIO',
    'HORARIO_FIM',
    'STATUS',
    'CONTA_FALTA',
    'BASE_PLANEJAMENTO_INICIAL'
  ].map(function(header) {
    return GEAPA_CORE.coreGetCol(headerMap, header);
  }).filter(function(col) {
    return !!col;
  });

  if (monitoredCols.indexOf(e.range.getColumn()) === -1) return;
  atividades_applyCargaHorariaForRow_(e.range.getRow());
  atividades_aplicarConfigLinhaAtividade_(e.range.getRow(), {
    fillOnlyEmpty: true
  });
  atividades_applyPlanningDefaultsForRow_(e.range.getRow());
}

function atividades_onEditJustificativas_(e) {
  if (!e || !e.range) return;

  var sheet = e.range.getSheet();
  var justificativasSheet;
  try {
    justificativasSheet = atividades_getJustificativasFaltasSheet_();
  } catch (err) {
    return;
  }

  if (sheet.getSheetId() !== justificativasSheet.getSheetId()) return;
  if (e.range.getRow() <= 1) return;

  var headerMap = GEAPA_CORE.coreHeaderMap(justificativasSheet, 1);
  var statusCol = GEAPA_CORE.coreGetCol(headerMap, 'STATUS_ANALISE');
  if (!statusCol || e.range.getColumn() !== statusCol) return;

  atividades_aplicarDecisaoJustificativaRow_(e.range.getRow());
}

function atividades_onEditPresencas_(e) {
  if (!e || !e.range) return;
  if (e.range.getRow() <= 1) return;

  var ctx;
  try {
    ctx = atividades_getCurrentPeriodContext_();
  } catch (err) {
    return;
  }

  var sheet = e.range.getSheet();
  if (sheet.getName() !== ctx.presenceSheetName) return;

  var headerMap = GEAPA_CORE.coreHeaderMap(sheet, 1);
  var firstDynamicCol = ATIVIDADES_CFG.PRESENCAS.BASE_HEADERS.length + 1;
  var firstSummaryCol = 0;

  ATIVIDADES_CFG.PRESENCAS.SUMMARY_HEADERS.forEach(function(header) {
    var col = GEAPA_CORE.coreGetCol(headerMap, header);
    if (col && (!firstSummaryCol || col < firstSummaryCol)) {
      firstSummaryCol = col;
    }
  });

  var monitoredMetadataCols = [
    'STATUS_NO_PERIODO',
    'DATA_ENTRADA_NO_PERIODO',
    'DATA_SAIDA_NO_PERIODO',
    'MOTIVO_ALTERACAO_NO_PERIODO'
  ].map(function(header) {
    return GEAPA_CORE.coreGetCol(headerMap, header);
  }).filter(function(col) {
    return !!col;
  });

  var editedCol = e.range.getColumn();
  var isDynamicCol = firstSummaryCol && editedCol >= firstDynamicCol && editedCol < firstSummaryCol;
  if (!isDynamicCol && monitoredMetadataCols.indexOf(editedCol) === -1) return;

  atividades_recalcularMotorDisciplinarPeriodoVigente_({
    rowNumbers: [e.range.getRow()],
    logTransitions: true
  });
}
