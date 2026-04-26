function atividades_jobPlanejamentoNormativo_() {
  var preview = atividades_atualizarPreviewFechamentoPlanejamentoPeriodoVigente_();
  var autoFreeze = atividades_tryAutoFreezeSnapshotNormativoPeriodoVigente_();
  var disciplinar = atividades_recalcularMotorDisciplinarPeriodoVigente_();
  var alertasDisciplinares = atividades_notificarAlertasDisciplinaresPeriodoVigente_({
    rowNumbers: (disciplinar.transitions || []).filter(function(item) {
      var next = String(item && item.to || '').trim();
      return next === 'ALERTA_60' || next === 'ALERTA_80';
    }).map(function(item) {
      return Number(item.rowNumber || 0);
    })
  });

  return {
    ok: true,
    preview: preview,
    autoFreeze: autoFreeze,
    disciplinar: disciplinar,
    alertasDisciplinares: alertasDisciplinares
  };
}

function onEditAtividades(e) {
  atividades_onEditConfigInheritance_(e);
  atividades_onEditPeriodoSync_(e);
  atividades_onEditApresentacoes_(e);
  atividades_onEditJustificativas_(e);
  atividades_onEditPresencas_(e);
}

function atividades_jobApresentacoesWrapper_() {
  var job = atividades_jobApresentacoes_();
  if (job && job.phaseExecuted === 'POS_EVENTO') {
    return job;
  }

  var historicoPublico = atividades_sincronizarHistoricoPublicoApresentacoes_();
  var resumoMembers = atividades_sincronizarResumoApresentacoesEmMembersAtuais_();

  job = job || { ok: true };
  job.postRunSync = {
    historicoPublico: historicoPublico,
    resumoMembers: resumoMembers
  };
  return job;
}

function atividades_removerTriggers_() {
  var deleted = [];
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    var handler = String(trigger.getHandlerFunction() || '').trim();
    if (
      handler === 'onEditAtividades' ||
      handler === 'atividades_jobPlanejamentoNormativo_' ||
      handler === 'atividades_jobApresentacoesWrapper_'
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

  ScriptApp.newTrigger('atividades_jobApresentacoesWrapper_')
    .timeBased()
    .everyHours(1)
    .create();
  created.push('atividades_jobApresentacoesWrapper_');

  return {
    ok: true,
    created: created,
    spreadsheetId: spreadsheet.getId()
  };
}
