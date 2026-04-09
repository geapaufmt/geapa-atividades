function atividades_jobPlanejamentoNormativo_() {
  var preview = atividades_atualizarPreviewFechamentoPlanejamentoPeriodoVigente_();
  var autoFreeze = atividades_tryAutoFreezeSnapshotNormativoPeriodoVigente_();
  var disciplinar = atividades_recalcularMotorDisciplinarPeriodoVigente_();

  return {
    ok: true,
    preview: preview,
    autoFreeze: autoFreeze,
    disciplinar: disciplinar
  };
}

function atividades_removerTriggers_() {
  var deleted = [];
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    var handler = String(trigger.getHandlerFunction() || '').trim();
    if (
      handler === 'onEditAtividades' ||
      handler === 'atividades_jobPlanejamentoNormativo_'
    ) {
      ScriptApp.deleteTrigger(trigger);
      deleted.push(handler);
    }
  });

  return {
    ok: true,
    deleted: deleted
  };
}

function atividades_instalarTriggers_() {
  atividades_removerTriggers_();

  var spreadsheet = atividades_getOperationalHolder_().spreadsheet;
  var created = [];

  ScriptApp.newTrigger('onEditAtividades')
    .forSpreadsheet(spreadsheet)
    .onEdit()
    .create();
  created.push('onEditAtividades');

  ScriptApp.newTrigger('atividades_jobPlanejamentoNormativo_')
    .timeBased()
    .everyHours(1)
    .create();
  created.push('atividades_jobPlanejamentoNormativo_');

  return {
    ok: true,
    created: created,
    spreadsheetId: spreadsheet.getId()
  };
}
