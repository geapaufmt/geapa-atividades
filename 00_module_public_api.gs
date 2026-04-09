/**
 * GEAPA Atividades - API publica do modulo.
 */

function atividades_diagnostico() {
  return atividades_diagnostico_();
}

function atividades_validarModulo() {
  return atividades_validarModulo_();
}

function atividades_setupV1() {
  return atividades_setupV1_();
}

function atividades_garantirPeriodoVigente() {
  return atividades_garantirPeriodoVigente_();
}

function atividades_sincronizarPeriodoVigente() {
  return atividades_sincronizarPeriodoVigente_();
}

function atividades_sincronizarPresencasPeriodoVigente() {
  return atividades_sincronizarPresencasPeriodoVigente_();
}

function atividades_congelarSnapshotNormativoPeriodoVigente() {
  return atividades_congelarSnapshotNormativoPeriodoVigente_();
}

function atividades_forcarRecalculoSnapshotNormativoPeriodoVigente() {
  return atividades_forcarRecalculoSnapshotNormativoPeriodoVigente_();
}

function atividades_gerarIdsBasePlanejamentoInicialPeriodoVigente() {
  return atividades_fillMissingActivityIdsForPlanningBasePeriodoVigente_();
}

function atividades_recalcularMotorDisciplinarPeriodoVigente() {
  return atividades_recalcularMotorDisciplinarPeriodoVigente_();
}

function atividades_gerarEventosDesligamentoPorFaltasPeriodoVigente() {
  return atividades_gerarEventosDesligamentoPorFaltasPeriodoVigente_();
}

function atividades_instalarTriggers() {
  return atividades_instalarTriggers_();
}

function atividades_removerTriggers() {
  return atividades_removerTriggers_();
}

function atividades_aplicarUxPlanilhas() {
  return atividades_aplicarUxPlanilhas_();
}

function atividades_aplicarConfigLinhaAtividade(rowNumber) {
  return atividades_aplicarConfigLinhaAtividade_(rowNumber);
}

function atividades_fillMissingActivityIds() {
  return atividades_fillMissingActivityIds_();
}

function atividades_ensureActivityIdForRow(rowNumber) {
  return atividades_ensureActivityIdForRow_(rowNumber);
}

function atividades_fillCargaHorariaFromTimes() {
  return atividades_fillCargaHorariaFromTimes_();
}

function atividades_applyCargaHorariaForRow(rowNumber) {
  return atividades_applyCargaHorariaForRow_(rowNumber);
}

function atividades_seedConfigPadrao() {
  return atividades_seedConfigPadrao_();
}

function atividades_arquivarPeriodosAntigos() {
  return atividades_arquivarPeriodosAntigos_();
}

function atividades_importarJustificativasFaltas() {
  return atividades_importarJustificativasFaltas_();
}

function atividades_aplicarDecisoesJustificativas() {
  return atividades_aplicarDecisoesJustificativas_();
}

function atividades_recalcularAbonosPeriodoVigente() {
  return atividades_recalcularAbonosPeriodoVigente_();
}

function atividades_notificarFaltasPendentes() {
  return atividades_notificarFaltasPendentes_();
}
