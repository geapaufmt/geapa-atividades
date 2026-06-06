function atividades_jobPlanejamentoNormativo_() {
  return atividades_runWithOperationalGuard_('MOTOR_DISCIPLINAR', null, function() {
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
  }, { entrypoint: 'atividades_jobPlanejamentoNormativo_', executionType: 'TRIGGER' });
}

function onEditAtividades(e) {
  return atividades_runWithOperationalGuard_('GERAL', null, function() {
    atividades_onEditConfigInheritance_(e);
    atividades_onEditPeriodoSync_(e);
    atividades_onEditConfirmacaoConvidados_(e);
    atividades_onEditConvidados_(e);
    atividades_onEditApresentacoes_(e);
    atividades_onEditJustificativas_(e);
    atividades_onEditPresencas_(e);
  }, { entrypoint: 'onEditAtividades', executionType: 'TRIGGER' });
}

function atividades_jobApresentacoesWrapper_() {
  return atividades_jobApresentacoesPreEventoWrapper_();
}

function atividades_jobApresentacoesPreEventoWrapper_() {
  return atividades_runWithOperationalGuard_('APRESENTACOES_INTEGRADAS', null, function() {
    return atividades_jobApresentacoesPreEvento_();
  }, { entrypoint: 'atividades_jobApresentacoesPreEventoWrapper_', executionType: 'TRIGGER' });
}

function atividades_jobApresentacoesPosEventoWrapper_() {
  return atividades_runWithOperationalGuard_('APRESENTACOES_INTEGRADAS', null, function() {
    return atividades_jobApresentacoesPosEventoIntegrado_();
  }, { entrypoint: 'atividades_jobApresentacoesPosEventoWrapper_', executionType: 'TRIGGER' });
}

function atividades_jobAtividadesGeraisWrapper_() {
  return atividades_runWithOperationalGuard_('ATIVIDADES_GERAIS', null, function() {
    return atividades_jobAtividadesGerais_();
  }, { entrypoint: 'atividades_jobAtividadesGeraisWrapper_', executionType: 'TRIGGER' });
}

function atividades_removerTriggers_() {
  var deleted = [];
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    var handler = String(trigger.getHandlerFunction() || '').trim();
    if (
      handler === 'onEditAtividades' ||
      handler === 'atividades_jobPlanejamentoNormativo_' ||
      handler === 'atividades_jobApresentacoesWrapper_' ||
      handler === 'atividades_jobApresentacoesPreEventoWrapper_' ||
      handler === 'atividades_jobApresentacoesPosEventoWrapper_' ||
      handler === 'atividades_jobAtividadesGeraisWrapper_'
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

  ScriptApp.newTrigger('atividades_jobApresentacoesPreEventoWrapper_')
    .timeBased()
    .everyHours(1)
    .nearMinute(5)
    .create();
  created.push('atividades_jobApresentacoesPreEventoWrapper_');

  ScriptApp.newTrigger('atividades_jobApresentacoesPosEventoWrapper_')
    .timeBased()
    .everyHours(1)
    .nearMinute(35)
    .create();
  created.push('atividades_jobApresentacoesPosEventoWrapper_');

  ScriptApp.newTrigger('atividades_jobAtividadesGeraisWrapper_')
    .timeBased()
    .everyHours(1)
    .create();
  created.push('atividades_jobAtividadesGeraisWrapper_');

  return {
    ok: true,
    created: created,
    spreadsheetId: spreadsheet.getId()
  };
}
