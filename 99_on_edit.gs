function onEditAtividades(e) {
  atividades_onEditConfigInheritance_(e);
  atividades_onEditJustificativas_(e);
}

function atividades_onEditConfigInheritance_(e) {
  if (!e || !e.range) return;

  var sheet = e.range.getSheet();
  var atividadesSheet = atividades_getAtividadesSheet_();
  if (sheet.getSheetId() !== atividadesSheet.getSheetId()) return;
  if (e.range.getRow() <= 1) return;

  var headerMap = GEAPA_CORE.coreHeaderMap(atividadesSheet, 1);
  var monitoredCols = ['CLASSIFICACAO_REUNIAO', 'TIPO_ATIVIDADE', 'SUBTIPO_ATIVIDADE', 'DATA_ATIVIDADE', 'TITULO', 'HORARIO_INICIO', 'HORARIO_FIM'].map(function(header) {
    return GEAPA_CORE.coreGetCol(headerMap, header);
  }).filter(function(col) {
    return !!col;
  });

  if (monitoredCols.indexOf(e.range.getColumn()) === -1) return;
  atividades_ensureActivityIdForRow_(e.range.getRow());
  atividades_applyCargaHorariaForRow_(e.range.getRow());
  atividades_aplicarConfigLinhaAtividade_(e.range.getRow());
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
