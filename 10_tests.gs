function test_atividades_diagnostico() {
  return atividades_diagnostico();
}

function test_atividades_setup_v1() {
  return atividades_setupV1();
}

function test_atividades_garantir_periodo_vigente() {
  return atividades_garantirPeriodoVigente();
}

function test_atividades_sync_periodo_vigente() {
  return atividades_sincronizarPeriodoVigente();
}

function test_atividades_sync_presencas_periodo_vigente() {
  return atividades_sincronizarPresencasPeriodoVigente();
}

function test_atividades_aplicar_config_linha_2() {
  var result = atividades_aplicarConfigLinhaAtividade(2);
  var sheet = atividades_getAtividadesSheet_();
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var row = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
  var rowObj = GEAPA_CORE.coreRowToObject(headers, row);

  Logger.log(JSON.stringify({
    result: result,
    row2: {
      CLASSIFICACAO_REUNIAO: rowObj.CLASSIFICACAO_REUNIAO || '',
      TIPO_ATIVIDADE: rowObj.TIPO_ATIVIDADE || '',
      SUBTIPO_ATIVIDADE: rowObj.SUBTIPO_ATIVIDADE || '',
      CLASSIFICACAO_ACESSO: rowObj.CLASSIFICACAO_ACESSO || '',
      EXIGE_CONVOCACAO: rowObj.EXIGE_CONVOCACAO || '',
      EXIGE_LEMBRETE: rowObj.EXIGE_LEMBRETE || '',
      EXIGE_ATA: rowObj.EXIGE_ATA || '',
      EXIGE_MATERIAL: rowObj.EXIGE_MATERIAL || '',
      EXIGE_LISTA_PRESENCA: rowObj.EXIGE_LISTA_PRESENCA || '',
      CONTA_PRESENCA: rowObj.CONTA_PRESENCA || '',
      CONTA_FALTA: rowObj.CONTA_FALTA || '',
      GERA_CERTIFICADO: rowObj.GERA_CERTIFICADO || ''
    }
  }, null, 2));

  return result;
}

function test_atividades_ensure_id_linha_2() {
  var result = atividades_ensureActivityIdForRow(2);
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_fill_missing_activity_ids() {
  var result = atividades_fillMissingActivityIds();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_seed_config_padrao() {
  return atividades_seedConfigPadrao();
}

function test_atividades_arquivar_periodos_antigos() {
  return atividades_arquivarPeriodosAntigos();
}

function test_atividades_importar_justificativas_faltas() {
  var result = atividades_importarJustificativasFaltas();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_aplicar_decisoes_justificativas() {
  var result = atividades_aplicarDecisoesJustificativas();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_recalcular_abonos_periodo() {
  var result = atividades_recalcularAbonosPeriodoVigente();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_notificar_faltas_pendentes() {
  var result = atividades_notificarFaltasPendentes();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_aplicar_decisao_justificativa_linha_2() {
  var result = atividades_aplicarDecisaoJustificativaRow_(2);
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
