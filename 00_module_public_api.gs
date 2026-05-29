/**
 * GEAPA Atividades - API publica do modulo.
 */

function atividades_diagnostico() {
  return atividades_runWithOperationalGuard_('GERAL', null, function() {
    return atividades_diagnostico_();
  }, { entrypoint: 'atividades_diagnostico' });
}

function atividades_validarModulo() {
  return atividades_runWithOperationalGuard_('GERAL', null, function() {
    return atividades_validarModulo_();
  }, { entrypoint: 'atividades_validarModulo' });
}

function atividades_listarParaPortal(contexto) {
  return atividades_listarParaPortal_(contexto);
}

function atividades_buscarDetalheParaPortal(idAtividade, contexto) {
  return atividades_buscarDetalheParaPortal_(idAtividade, contexto);
}

function atividades_runTestePortalAtividades() {
  return atividades_runTestePortalAtividades_();
}

function atividadesV2_sincronizarPortalAtividadesCalendarioDev() {
  return atividadesV2_sincronizarPortalAtividadesCalendarioDev_();
}

function atividadesV2_runTestePortalAtividadesCalendarioDev() {
  return atividadesV2_runTestePortalAtividadesCalendarioDev_();
}

function atividadesV2_atualizarPortalAtividadesDetalhesDev() {
  return atividadesV2_atualizarPortalAtividadesDetalhesDev_();
}

function atividadesV2_portalGetDetalhesAtividade(idAtividade, contexto) {
  return atividadesV2_portalGetDetalhesAtividade_(idAtividade, contexto);
}

function atividadesV2_portalGetAtividadesBundle(contexto) {
  return atividadesV2_portalGetAtividadesBundle_(contexto);
}

function atividadesV2_limparCachePortalDev() {
  return atividadesV2_limparCachePortalDev_();
}

function atividadesV2_portalGetChamada(idAtividade, contexto) {
  return atividadesV2_portalGetChamada_(idAtividade, contexto);
}

function atividadesV2_portalSalvarChamada(payload, contexto) {
  return atividadesV2_portalSalvarChamada_(payload, contexto);
}

function atividadesV2_runTestePortalChamadaDev() {
  return atividadesV2_runTestePortalChamadaDev_();
}

function atividades_setupV1() {
  return atividades_runWithOperationalGuard_('SETUP_V1', null, function() {
    return atividades_setupV1_();
  }, { entrypoint: 'atividades_setupV1' });
}

function atividades_garantirPeriodoVigente() {
  return atividades_runWithOperationalGuard_('PERIODO_VIGENTE', null, function() {
    return atividades_garantirPeriodoVigente_();
  }, { entrypoint: 'atividades_garantirPeriodoVigente' });
}

function atividades_sincronizarPeriodoVigente() {
  return atividades_runWithOperationalGuard_('PERIODO_VIGENTE', null, function() {
    return atividades_sincronizarPeriodoVigente_();
  }, { entrypoint: 'atividades_sincronizarPeriodoVigente' });
}

function atividades_sincronizarPresencasPeriodoVigente() {
  return atividades_runWithOperationalGuard_('PERIODO_VIGENTE', null, function() {
    return atividades_sincronizarPresencasPeriodoVigente_();
  }, { entrypoint: 'atividades_sincronizarPresencasPeriodoVigente' });
}

function atividades_congelarSnapshotNormativoPeriodoVigente() {
  return atividades_runWithOperationalGuard_('MOTOR_DISCIPLINAR', null, function() {
    return atividades_congelarSnapshotNormativoPeriodoVigente_();
  }, { entrypoint: 'atividades_congelarSnapshotNormativoPeriodoVigente' });
}

function atividades_forcarRecalculoSnapshotNormativoPeriodoVigente() {
  return atividades_runWithOperationalGuard_('MOTOR_DISCIPLINAR', null, function() {
    return atividades_forcarRecalculoSnapshotNormativoPeriodoVigente_();
  }, { entrypoint: 'atividades_forcarRecalculoSnapshotNormativoPeriodoVigente' });
}

function atividades_gerarIdsBasePlanejamentoInicialPeriodoVigente() {
  return atividades_runWithOperationalGuard_('PERIODO_VIGENTE', null, function() {
    return atividades_fillMissingActivityIdsForPlanningBasePeriodoVigente_();
  }, { entrypoint: 'atividades_gerarIdsBasePlanejamentoInicialPeriodoVigente' });
}

function atividades_recalcularMotorDisciplinarPeriodoVigente() {
  return atividades_runWithOperationalGuard_('MOTOR_DISCIPLINAR', null, function() {
    return atividades_recalcularMotorDisciplinarPeriodoVigente_();
  }, { entrypoint: 'atividades_recalcularMotorDisciplinarPeriodoVigente' });
}

function atividades_notificarAlertasDisciplinaresPeriodoVigente() {
  return atividades_runWithOperationalGuard_('MOTOR_DISCIPLINAR', null, function() {
    return atividades_notificarAlertasDisciplinaresPeriodoVigente_();
  }, { entrypoint: 'atividades_notificarAlertasDisciplinaresPeriodoVigente' });
}

function atividades_gerarEventosDesligamentoPorFaltasPeriodoVigente() {
  return atividades_runWithOperationalGuard_('MOTOR_DISCIPLINAR', null, function() {
    return atividades_gerarEventosDesligamentoPorFaltasPeriodoVigente_();
  }, { entrypoint: 'atividades_gerarEventosDesligamentoPorFaltasPeriodoVigente' });
}

function atividades_instalarTriggers() {
  return atividades_runWithOperationalGuard_('GERAL', ['TRIGGER'], function() {
    return atividades_instalarTriggers_();
  }, { entrypoint: 'atividades_instalarTriggers' });
}

function atividades_removerTriggers() {
  return atividades_runWithOperationalGuard_('GERAL', ['TRIGGER'], function() {
    return atividades_removerTriggers_();
  }, { entrypoint: 'atividades_removerTriggers' });
}

function atividades_jobApresentacoes() {
  return atividades_runWithOperationalGuard_('APRESENTACOES_INTEGRADAS', null, function() {
    return atividades_jobApresentacoes_();
  }, { entrypoint: 'atividades_jobApresentacoes' });
}

function atividades_jobApresentacoesPreEvento() {
  return atividades_runWithOperationalGuard_('APRESENTACOES_INTEGRADAS', null, function() {
    return atividades_jobApresentacoesPreEvento_();
  }, { entrypoint: 'atividades_jobApresentacoesPreEvento' });
}

function atividades_jobApresentacoesBase() {
  return atividades_runWithOperationalGuard_('APRESENTACOES_INTEGRADAS', null, function() {
    return atividades_jobApresentacoes_({ phase: 'BASE' });
  }, { entrypoint: 'atividades_jobApresentacoesBase' });
}

function atividades_jobApresentacoesConvites() {
  return atividades_runWithOperationalGuard_('APRESENTACOES_INTEGRADAS', null, function() {
    return atividades_jobApresentacoes_({ phase: 'CONVITES' });
  }, { entrypoint: 'atividades_jobApresentacoesConvites' });
}

function atividades_jobApresentacoesPosEvento() {
  return atividades_runWithOperationalGuard_('APRESENTACOES_INTEGRADAS', null, function() {
    return atividades_jobApresentacoesPosEventoIntegrado_();
  }, { entrypoint: 'atividades_jobApresentacoesPosEvento' });
}

function atividades_jobAtividadesGerais() {
  return atividades_runWithOperationalGuard_('ATIVIDADES_GERAIS', null, function() {
    return atividades_jobAtividadesGerais_();
  }, { entrypoint: 'atividades_jobAtividadesGerais' });
}

function atividades_enviarConvocacoesAtividadesGerais() {
  return atividades_runWithOperationalGuard_('ATIVIDADES_GERAIS', null, function() {
    return atividades_enviarConvocacoesAtividadesGerais_();
  }, { entrypoint: 'atividades_enviarConvocacoesAtividadesGerais' });
}

function atividades_enviarLembretesAtividadesGerais() {
  return atividades_runWithOperationalGuard_('ATIVIDADES_GERAIS', null, function() {
    return atividades_enviarLembretesAtividadesGerais_();
  }, { entrypoint: 'atividades_enviarLembretesAtividadesGerais' });
}

function atividades_marcarAtividadesGeraisRealizadas() {
  return atividades_runWithOperationalGuard_('ATIVIDADES_GERAIS', null, function() {
    return atividades_marcarAtividadesGeraisRealizadas_();
  }, { entrypoint: 'atividades_marcarAtividadesGeraisRealizadas' });
}

function atividades_notificarPendenciasAtaMaterialAtividadesGerais() {
  return atividades_runWithOperationalGuard_('ATIVIDADES_GERAIS', null, function() {
    return atividades_notificarPendenciasAtaMaterialAtividadesGerais_();
  }, { entrypoint: 'atividades_notificarPendenciasAtaMaterialAtividadesGerais' });
}

function atividades_enviarCobrancasTituloEixoApresentacoes() {
  return atividades_runWithOperationalGuard_('APRESENTACOES_INTEGRADAS', null, function() {
    return atividades_enviarCobrancasTituloEixoApresentacoes_();
  }, { entrypoint: 'atividades_enviarCobrancasTituloEixoApresentacoes' });
}

function atividades_processarInboxTituloEixoApresentacoes() {
  return atividades_runWithOperationalGuard_('APRESENTACOES_INTEGRADAS', null, function() {
    return atividades_processarInboxTituloEixoApresentacoes_();
  }, { entrypoint: 'atividades_processarInboxTituloEixoApresentacoes' });
}

function atividades_notificarSecretariosApresentacoes() {
  return atividades_runWithOperationalGuard_('APRESENTACOES_INTEGRADAS', null, function() {
    return atividades_notificarSecretariosTituloEixoPendentes_();
  }, { entrypoint: 'atividades_notificarSecretariosApresentacoes' });
}

function atividades_preencherIdentificacaoApresentacaoLinha(rowNumber) {
  return atividades_runWithOperationalGuard_('APRESENTACOES_INTEGRADAS', null, function() {
    return atividades_preencherIdentificacaoApresentacaoLinha_(rowNumber);
  }, { entrypoint: 'atividades_preencherIdentificacaoApresentacaoLinha' });
}

function atividades_autofillIdentificacaoApresentacoes() {
  return atividades_runWithOperationalGuard_('APRESENTACOES_INTEGRADAS', null, function() {
    return atividades_autofillIdentificacaoApresentacoesEmLote_();
  }, { entrypoint: 'atividades_autofillIdentificacaoApresentacoes' });
}

function atividades_vincularProfessoresApresentacoes() {
  return atividades_runWithOperationalGuard_('APRESENTACOES_INTEGRADAS', null, function() {
    return atividades_upsertProfessoresApresentacao_();
  }, { entrypoint: 'atividades_vincularProfessoresApresentacoes' });
}

function atividades_enviarConvitesProfessoresApresentacoes() {
  return atividades_runWithOperationalGuard_('APRESENTACOES_INTEGRADAS', null, function() {
    return atividades_enviarConvitesProfessoresApresentacoes_();
  }, { entrypoint: 'atividades_enviarConvitesProfessoresApresentacoes' });
}

function atividades_vincularExternosApresentacoes() {
  return atividades_runWithOperationalGuard_('APRESENTACOES_INTEGRADAS', null, function() {
    return atividades_upsertExternosApresentacao_();
  }, { entrypoint: 'atividades_vincularExternosApresentacoes' });
}

function atividades_enviarConvitesExternosApresentacoes() {
  return atividades_runWithOperationalGuard_('APRESENTACOES_INTEGRADAS', null, function() {
    return atividades_enviarConvitesExternosApresentacoes_();
  }, { entrypoint: 'atividades_enviarConvitesExternosApresentacoes' });
}

function atividades_enviarLembretesMembrosApresentacoes() {
  return atividades_runWithOperationalGuard_('APRESENTACOES_INTEGRADAS', null, function() {
    return atividades_enviarLembretesMembrosApresentacoes_();
  }, { entrypoint: 'atividades_enviarLembretesMembrosApresentacoes' });
}

function atividades_marcarApresentacoesRealizadasAutomaticamente() {
  return atividades_runWithOperationalGuard_('APRESENTACOES_INTEGRADAS', null, function() {
    return atividades_tryAutoMarkApresentacoesRealizadas_();
  }, { entrypoint: 'atividades_marcarApresentacoesRealizadasAutomaticamente' });
}

function atividades_enviarCobrancasArquivoApresentacoes() {
  return atividades_runWithOperationalGuard_('APRESENTACOES_INTEGRADAS', null, function() {
    return atividades_enviarCobrancasArquivoApresentacoes_();
  }, { entrypoint: 'atividades_enviarCobrancasArquivoApresentacoes' });
}

function atividades_enviarCobrancasArquivoApresentacoesForcado() {
  return atividades_runWithOperationalGuard_('APRESENTACOES_INTEGRADAS', null, function() {
    return atividades_enviarCobrancasArquivoApresentacoes_({ force: true });
  }, { entrypoint: 'atividades_enviarCobrancasArquivoApresentacoesForcado' });
}

function atividades_processarInboxArquivoApresentacoes() {
  return atividades_runWithOperationalGuard_('APRESENTACOES_INTEGRADAS', null, function() {
    return atividades_processarInboxArquivoApresentacoes_({
      allowGmailFallback: true
    });
  }, { entrypoint: 'atividades_processarInboxArquivoApresentacoes' });
}

function atividades_processarFotosPendentesApresentacoes() {
  return atividades_runWithOperationalGuard_('APRESENTACOES_INTEGRADAS', null, function() {
    return atividades_processarFotosPendentesApresentacoes_();
  }, { entrypoint: 'atividades_processarFotosPendentesApresentacoes' });
}

function atividades_sincronizarHistoricoPublicoApresentacoes() {
  return atividades_runWithOperationalGuard_('APRESENTACOES_INTEGRADAS', null, function() {
    return atividades_sincronizarHistoricoPublicoApresentacoes_();
  }, { entrypoint: 'atividades_sincronizarHistoricoPublicoApresentacoes' });
}

function atividades_sincronizarResumoApresentacoesEmMembersAtuais() {
  return atividades_runWithOperationalGuard_('APRESENTACOES_INTEGRADAS', null, function() {
    return atividades_sincronizarResumoApresentacoesEmMembersAtuais_();
  }, { entrypoint: 'atividades_sincronizarResumoApresentacoesEmMembersAtuais' });
}

function atividades_aplicarUxHistoricoPublicoApresentacoes() {
  return atividades_runWithOperationalGuard_('APRESENTACOES_INTEGRADAS', null, function() {
    return atividades_aplicarUxHistoricoPublicoApresentacoes_();
  }, { entrypoint: 'atividades_aplicarUxHistoricoPublicoApresentacoes' });
}

function atividades_aplicarUxPlanilhas() {
  return atividades_runWithOperationalGuard_('SETUP_V1', null, function() {
    return atividades_aplicarUxPlanilhas_();
  }, { entrypoint: 'atividades_aplicarUxPlanilhas' });
}

function atividades_aplicarUxBaseEixosTematicos() {
  return atividades_runWithOperationalGuard_('SETUP_V1', null, function() {
    return atividades_aplicarUxBaseEixosTematicos_();
  }, { entrypoint: 'atividades_aplicarUxBaseEixosTematicos' });
}

function atividades_aplicarUxBaseExternos() {
  return atividades_runWithOperationalGuard_('SETUP_V1', null, function() {
    return atividades_aplicarUxBaseExternos_();
  }, { entrypoint: 'atividades_aplicarUxBaseExternos' });
}

function atividades_aplicarConfigLinhaAtividade(rowNumber) {
  return atividades_runWithOperationalGuard_('ATIVIDADES_GERAIS', null, function() {
    return atividades_aplicarConfigLinhaAtividade_(rowNumber);
  }, { entrypoint: 'atividades_aplicarConfigLinhaAtividade' });
}

function atividades_fillMissingActivityIds() {
  return atividades_runWithOperationalGuard_('PERIODO_VIGENTE', null, function() {
    return atividades_fillMissingActivityIds_();
  }, { entrypoint: 'atividades_fillMissingActivityIds' });
}

function atividades_ensureActivityIdForRow(rowNumber) {
  return atividades_runWithOperationalGuard_('PERIODO_VIGENTE', null, function() {
    return atividades_ensureActivityIdForRow_(rowNumber);
  }, { entrypoint: 'atividades_ensureActivityIdForRow' });
}

function atividades_fillCargaHorariaFromTimes() {
  return atividades_runWithOperationalGuard_('ATIVIDADES_GERAIS', null, function() {
    return atividades_fillCargaHorariaFromTimes_();
  }, { entrypoint: 'atividades_fillCargaHorariaFromTimes' });
}

function atividades_applyCargaHorariaForRow(rowNumber) {
  return atividades_runWithOperationalGuard_('ATIVIDADES_GERAIS', null, function() {
    return atividades_applyCargaHorariaForRow_(rowNumber);
  }, { entrypoint: 'atividades_applyCargaHorariaForRow' });
}

function atividades_seedConfigPadrao() {
  return atividades_runWithOperationalGuard_('SETUP_V1', null, function() {
    return atividades_seedConfigPadrao_();
  }, { entrypoint: 'atividades_seedConfigPadrao' });
}

function atividades_arquivarPeriodosAntigos() {
  return atividades_runWithOperationalGuard_('ARQUIVAMENTO_PERIODOS', null, function() {
    return atividades_arquivarPeriodosAntigos_();
  }, { entrypoint: 'atividades_arquivarPeriodosAntigos' });
}

function atividades_importarJustificativasFaltas() {
  return atividades_runWithOperationalGuard_('JUSTIFICATIVAS_FALTAS', null, function() {
    return atividades_importarJustificativasFaltas_();
  }, { entrypoint: 'atividades_importarJustificativasFaltas' });
}

function atividades_aplicarDecisoesJustificativas() {
  return atividades_runWithOperationalGuard_('JUSTIFICATIVAS_FALTAS', null, function() {
    return atividades_aplicarDecisoesJustificativas_();
  }, { entrypoint: 'atividades_aplicarDecisoesJustificativas' });
}

function atividades_recalcularAbonosPeriodoVigente() {
  return atividades_runWithOperationalGuard_('JUSTIFICATIVAS_FALTAS', null, function() {
    return atividades_recalcularAbonosPeriodoVigente_();
  }, { entrypoint: 'atividades_recalcularAbonosPeriodoVigente' });
}

function atividades_notificarFaltasPendentes() {
  return atividades_runWithOperationalGuard_('JUSTIFICATIVAS_FALTAS', null, function() {
    return atividades_notificarFaltasPendentes_();
  }, { entrypoint: 'atividades_notificarFaltasPendentes' });
}
