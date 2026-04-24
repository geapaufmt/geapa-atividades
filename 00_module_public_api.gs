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

function atividades_notificarAlertasDisciplinaresPeriodoVigente() {
  return atividades_notificarAlertasDisciplinaresPeriodoVigente_();
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

function atividades_jobApresentacoes() {
  return atividades_jobApresentacoes_();
}

function atividades_jobApresentacoesBase() {
  return atividades_jobApresentacoes_({ phase: 'BASE' });
}

function atividades_jobApresentacoesConvites() {
  return atividades_jobApresentacoes_({ phase: 'CONVITES' });
}

function atividades_jobApresentacoesPosEvento() {
  return atividades_jobApresentacoes_({ phase: 'POS_EVENTO' });
}

function atividades_enviarCobrancasTituloEixoApresentacoes() {
  return atividades_enviarCobrancasTituloEixoApresentacoes_();
}

function atividades_processarInboxTituloEixoApresentacoes() {
  return atividades_processarInboxTituloEixoApresentacoes_();
}

function atividades_notificarSecretariosApresentacoes() {
  return atividades_notificarSecretariosTituloEixoPendentes_();
}

function atividades_preencherIdentificacaoApresentacaoLinha(rowNumber) {
  return atividades_preencherIdentificacaoApresentacaoLinha_(rowNumber);
}

function atividades_autofillIdentificacaoApresentacoes() {
  return atividades_autofillIdentificacaoApresentacoesEmLote_();
}

function atividades_vincularProfessoresApresentacoes() {
  return atividades_upsertProfessoresApresentacao_();
}

function atividades_enviarConvitesProfessoresApresentacoes() {
  return atividades_enviarConvitesProfessoresApresentacoes_();
}

function atividades_vincularExternosApresentacoes() {
  return atividades_upsertExternosApresentacao_();
}

function atividades_enviarConvitesExternosApresentacoes() {
  return atividades_enviarConvitesExternosApresentacoes_();
}

function atividades_enviarLembretesMembrosApresentacoes() {
  return atividades_enviarLembretesMembrosApresentacoes_();
}

function atividades_marcarApresentacoesRealizadasAutomaticamente() {
  return atividades_tryAutoMarkApresentacoesRealizadas_();
}

function atividades_enviarCobrancasArquivoApresentacoes() {
  return atividades_enviarCobrancasArquivoApresentacoes_();
}

function atividades_enviarCobrancasArquivoApresentacoesForcado() {
  return atividades_enviarCobrancasArquivoApresentacoes_({ force: true });
}

function atividades_processarInboxArquivoApresentacoes() {
  return atividades_processarInboxArquivoApresentacoes_({
    allowGmailFallback: true
  });
}

function atividades_processarFotosPendentesApresentacoes() {
  return atividades_processarFotosPendentesApresentacoes_();
}

function atividades_sincronizarHistoricoPublicoApresentacoes() {
  return atividades_sincronizarHistoricoPublicoApresentacoes_();
}

function atividades_sincronizarResumoApresentacoesEmMembersAtuais() {
  return atividades_sincronizarResumoApresentacoesEmMembersAtuais_();
}

function atividades_aplicarUxHistoricoPublicoApresentacoes() {
  return atividades_aplicarUxHistoricoPublicoApresentacoes_();
}

function atividades_aplicarUxPlanilhas() {
  return atividades_aplicarUxPlanilhas_();
}

function atividades_aplicarUxBaseEixosTematicos() {
  return atividades_aplicarUxBaseEixosTematicos_();
}

function atividades_aplicarUxBaseExternos() {
  return atividades_aplicarUxBaseExternos_();
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
