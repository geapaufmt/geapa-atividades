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

function atividadesV2_portalGetCalendario(contexto) {
  return atividadesV2_portalGetCalendario_(contexto);
}

function atividadesV2_portalGetAtividadesDetalhes(contexto) {
  return atividadesV2_portalGetAtividadesDetalhes_(contexto);
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

function atividadesV2_portalGetMinhaFrequencia(contexto) {
  return atividadesV2_portalGetMinhaFrequencia_(contexto);
}

function atividadesV2_portalGetMinhasApresentacoes(contexto) {
  return atividadesV2_portalGetMinhasApresentacoes_(contexto);
}

function atividadesV2_portalGetMinhasJustificativas(contexto) {
  return atividadesV2_portalGetMinhasJustificativas_(contexto);
}

function atividadesV2_portalGetJustificativasConfig(contexto) {
  return atividadesV2_portalGetJustificativasConfig_(contexto || {});
}

function atividadesV2_runTesteMinhaFrequenciaDetalhadaDev(contexto) {
  return atividades_runWithOperationalGuard_('CONFERENCIA_V2', null, function() {
    return atividadesV2_runTesteMinhaFrequenciaDetalhadaDev_(contexto || {});
  }, { entrypoint: 'atividadesV2_runTesteMinhaFrequenciaDetalhadaDev' });
}

function atividadesV2_portalGetPendenciasDiretoria(contexto) {
  return atividadesV2_portalGetPendenciasDiretoria_(contexto);
}

function atividadesV2_portalListarPendenciasApresentacoesDiretoria(contexto) {
  return atividadesV2_portalListarPendenciasApresentacoesDiretoria_(contexto);
}

function atividadesV2_portalGetStatusViews(contexto) {
  return atividadesV2_portalGetStatusViews_(contexto);
}

function atividadesV2_limparCachePortalDev() {
  return atividadesV2_limparCachePortalDev_();
}

function atividadesV2_runTestePortalPerformanceDev() {
  return atividadesV2_runTestePortalPerformanceDev_();
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

function atividadesV2_portalCriarAtividade(payload, contexto) {
  return atividades_runWithOperationalGuard_('ATUALIZACAO_PORTAL_V2', null, function() {
    return atividadesV2_portalCriarAtividade_(payload || {}, contexto || {});
  }, { entrypoint: 'atividadesV2_portalCriarAtividade' });
}

function atividadesV2_runTesteCriarAtividadePortalDev() {
  return atividades_runWithOperationalGuard_('CONFERENCIA_V2', null, function() {
    return atividadesV2_runTesteCriarAtividadePortalDev_();
  }, { entrypoint: 'atividadesV2_runTesteCriarAtividadePortalDev' });
}

function atividades_listarModelosCriacaoPortal(contexto) {
  return atividades_listarModelosCriacaoPortal_(contexto || {});
}

function atividades_obterModeloCriacaoPortal(idConfig, contexto) {
  return atividades_obterModeloCriacaoPortal_(idConfig, contexto || {});
}

function atividades_validarCriacaoAtividadePorModelo(payload, contexto) {
  return atividades_validarCriacaoAtividadePorModelo_(payload || {}, contexto || {});
}

function atividades_criarAtividadePorModelo(payload, contexto) {
  return atividades_runWithOperationalGuard_('ATUALIZACAO_PORTAL_V2', null, function() {
    return atividades_criarAtividadePorModelo_(payload || {}, contexto || {});
  }, { entrypoint: 'atividades_criarAtividadePorModelo' });
}

function atividades_migrarSchemaAtividadesParaModeloConfigDryRun() {
  return atividades_runWithOperationalGuard_('SETUP_V1', ['SYNC'], function() {
    return atividades_migrarSchemaAtividadesParaModeloConfig_({ dryRun: true });
  }, { entrypoint: 'atividades_migrarSchemaAtividadesParaModeloConfigDryRun' });
}

function atividades_migrarSchemaAtividadesParaModeloConfig() {
  return atividades_runWithOperationalGuard_('SETUP_V1', ['SYNC'], function() {
    return atividades_migrarSchemaAtividadesParaModeloConfig_({ dryRun: false });
  }, { entrypoint: 'atividades_migrarSchemaAtividadesParaModeloConfig' });
}

function atividades_runTesteCriacaoPorModeloDev() {
  return atividades_runWithOperationalGuard_('CONFERENCIA_V2', null, function() {
    return atividades_runTesteCriacaoPorModeloDev_();
  }, { entrypoint: 'atividades_runTesteCriacaoPorModeloDev' });
}

function atividades_ajustarModeloApresentacaoMembroConfigDryRun() {
  return atividades_runWithOperationalGuard_('CONFERENCIA_V2', null, function() {
    return atividades_ajustarModeloApresentacaoMembroConfig_({ dryRun: true });
  }, { entrypoint: 'atividades_ajustarModeloApresentacaoMembroConfigDryRun' });
}

function atividades_ajustarModeloApresentacaoMembroConfig() {
  return atividades_runWithOperationalGuard_('SETUP_V1', ['SYNC'], function() {
    return atividades_ajustarModeloApresentacaoMembroConfig_({ dryRun: false });
  }, { entrypoint: 'atividades_ajustarModeloApresentacaoMembroConfig' });
}

function atividades_listarMembrosApresentadoresElegiveis(idConfig, referencia, contexto) {
  return atividades_listarMembrosApresentadoresElegiveis_(idConfig, referencia, contexto || {});
}

function atividades_validarSchemaAtividadesConfig() {
  return atividades_runWithOperationalGuard_('SETUP_V1', ['SYNC'], function() {
    return atividades_validarSchemaAtividadesConfig_();
  }, { entrypoint: 'atividades_validarSchemaAtividadesConfig' });
}

function atividades_migrarSchemaAtividadesConfigDryRun() {
  return atividades_runWithOperationalGuard_('SETUP_V1', ['SYNC'], function() {
    return atividades_migrarSchemaAtividadesConfigDryRun_();
  }, { entrypoint: 'atividades_migrarSchemaAtividadesConfigDryRun' });
}

function atividades_migrarSchemaAtividadesConfig() {
  return atividades_runWithOperationalGuard_('SETUP_V1', ['SYNC'], function() {
    return atividades_migrarSchemaAtividadesConfig_();
  }, { entrypoint: 'atividades_migrarSchemaAtividadesConfig' });
}

function atividades_normalizarModelosAtividadesConfig(options) {
  return atividades_runWithOperationalGuard_('SETUP_V1', ['SYNC'], function() {
    return atividades_normalizarModelosAtividadesConfig_(options || {});
  }, { entrypoint: 'atividades_normalizarModelosAtividadesConfig' });
}

function atividadesV2_diagnosticarCicloAtividadesDev() {
  return atividades_runWithOperationalGuard_('CONFERENCIA_V2', null, function() {
    return atividadesV2_diagnosticarCicloAtividadesDev_();
  }, { entrypoint: 'atividadesV2_diagnosticarCicloAtividadesDev' });
}

function atividadesV2_atualizarCicloAtividadesDev(options) {
  return atividades_runWithOperationalGuard_('ATUALIZACAO_PORTAL_V2', null, function() {
    return atividadesV2_atualizarCicloAtividadesDev_(options || {});
  }, { entrypoint: 'atividadesV2_atualizarCicloAtividadesDev' });
}

function atividadesV2_runTesteCicloAtividadesDev() {
  return atividades_runWithOperationalGuard_('CONFERENCIA_V2', null, function() {
    return atividadesV2_runTesteCicloAtividadesDev_();
  }, { entrypoint: 'atividadesV2_runTesteCicloAtividadesDev' });
}

function atividadesV2_diagnosticarReconciliacaoChamadasDev() {
  return atividades_runWithOperationalGuard_('CONFERENCIA_V2', null, function() {
    return atividadesV2_diagnosticarReconciliacaoChamadasDev_();
  }, { entrypoint: 'atividadesV2_diagnosticarReconciliacaoChamadasDev' });
}

function atividadesV2_diagnosticarReconcilicaoChamadasDev() {
  return atividadesV2_diagnosticarReconciliacaoChamadasDev();
}

function atividadesV2_reconciliarChamadasDev(options) {
  return atividades_runWithOperationalGuard_('ATUALIZACAO_PORTAL_V2', null, function() {
    return atividadesV2_reconciliarChamadasDev_(options || {});
  }, { entrypoint: 'atividadesV2_reconciliarChamadasDev' });
}

function atividadesV2_aplicarReconciliacaoChamadasDev() {
  return atividades_runWithOperationalGuard_('ATUALIZACAO_PORTAL_V2', null, function() {
    return atividadesV2_reconciliarChamadasDev_({ dryRun: false });
  }, { entrypoint: 'atividadesV2_aplicarReconciliacaoChamadasDev' });
}

function atividadesV2_diagnostico() {
  return atividades_runWithOperationalGuard_('CONFERENCIA_V2', null, function() {
    return atividadesV2_diagnostico_();
  }, { entrypoint: 'atividadesV2_diagnostico' });
}

function atividadesV2_conferirConsistencia(options) {
  return atividades_runWithOperationalGuard_('CONFERENCIA_V2', null, function() {
    return atividadesV2_conferirConsistencia_(options || {});
  }, { entrypoint: 'atividadesV2_conferirConsistencia' });
}

function atividadesV2_conferirContratoPortalAtivo(options) {
  return atividades_runWithOperationalGuard_('CONFERENCIA_V2', null, function() {
    return atividadesV2_conferirContratoPortalAtivo_(options || {});
  }, { entrypoint: 'atividadesV2_conferirContratoPortalAtivo' });
}

function atividadesV2_diagnosticarCicloSemestrePortalDev() {
  return atividades_runWithOperationalGuard_('CONFERENCIA_V2', null, function() {
    return atividadesV2_diagnosticarCicloSemestrePortalDev_();
  }, { entrypoint: 'atividadesV2_diagnosticarCicloSemestrePortalDev' });
}

function atividadesV2_runTesteContratoPortalAtivo() {
  return atividades_runWithOperationalGuard_('CONFERENCIA_V2', null, function() {
    return atividadesV2_conferirContratoPortalAtivo_({ dryRun: true });
  }, { entrypoint: 'atividadesV2_runTesteContratoPortalAtivo' });
}

function atividadesV2_atualizarPortalCalendario(options) {
  return atividades_runWithOperationalGuard_('ATUALIZACAO_PORTAL_V2', null, function() {
    return atividadesV2_atualizarPortalCalendario_(options || {});
  }, { entrypoint: 'atividadesV2_atualizarPortalCalendario' });
}

function atividadesV2_atualizarPortalDetalhes(options) {
  return atividades_runWithOperationalGuard_('ATUALIZACAO_PORTAL_V2', null, function() {
    return atividadesV2_atualizarPortalDetalhes_(options || {});
  }, { entrypoint: 'atividadesV2_atualizarPortalDetalhes' });
}

function atividadesV2_recalcularFrequenciaMembros(options) {
  return atividades_runWithOperationalGuard_('FREQUENCIA_V2', null, function() {
    return atividadesV2_recalcularFrequenciaMembros_(options || {});
  }, { entrypoint: 'atividadesV2_recalcularFrequenciaMembros' });
}

function atividadesV2_atualizarPortalJustificativas(options) {
  return atividades_runWithOperationalGuard_('ATUALIZACAO_PORTAL_V2', null, function() {
    return atividadesV2_atualizarPortalJustificativas_(options || {});
  }, { entrypoint: 'atividadesV2_atualizarPortalJustificativas' });
}

function atividadesV2_atualizarPendenciasDiretoria(options) {
  return atividades_runWithOperationalGuard_('ATUALIZACAO_PORTAL_V2', null, function() {
    return atividadesV2_atualizarPendenciasDiretoria_(options || {});
  }, { entrypoint: 'atividadesV2_atualizarPendenciasDiretoria' });
}

function atividadesV2_atualizarPortalStatus(options) {
  return atividades_runWithOperationalGuard_('ATUALIZACAO_PORTAL_V2', null, function() {
    return atividadesV2_atualizarPortalStatus_(options || {});
  }, { entrypoint: 'atividadesV2_atualizarPortalStatus' });
}

function atividadesV2_atualizarViewsPortal(options) {
  return atividades_runWithOperationalGuard_('ATUALIZACAO_PORTAL_V2', null, function() {
    return atividadesV2_atualizarViewsPortal_(options || {});
  }, { entrypoint: 'atividadesV2_atualizarViewsPortal' });
}

function atividadesV2_diagnosticarDesalinhamentoViewsPortalDev() {
  return atividades_runWithOperationalGuard_('CONFERENCIA_V2', null, function() {
    return atividadesV2_diagnosticarDesalinhamentoViewsPortalDev_();
  }, { entrypoint: 'atividadesV2_diagnosticarDesalinhamentoViewsPortalDev' });
}

function atividadesV2_repararDesalinhamentoViewsPortalDevDryRun() {
  return atividades_runWithOperationalGuard_('CONFERENCIA_V2', null, function() {
    return atividadesV2_repararDesalinhamentoViewsPortalDevDryRun_();
  }, { entrypoint: 'atividadesV2_repararDesalinhamentoViewsPortalDevDryRun' });
}

function atividadesV2_repararDesalinhamentoViewsPortalDev() {
  return atividades_runWithOperationalGuard_('ATUALIZACAO_PORTAL_V2', null, function() {
    return atividadesV2_repararDesalinhamentoViewsPortalDev_({ dryRun: false });
  }, { entrypoint: 'atividadesV2_repararDesalinhamentoViewsPortalDev' });
}

function atividadesV2_runTesteAtualizacaoPortalDev() {
  return atividades_runWithOperationalGuard_('CONFERENCIA_V2', null, function() {
    return atividadesV2_runTesteAtualizacaoPortalDev_();
  }, { entrypoint: 'atividadesV2_runTesteAtualizacaoPortalDev' });
}

function atividadesV2_runTesteDiagnostico() {
  return atividades_runWithOperationalGuard_('CONFERENCIA_V2', null, function() {
    return atividadesV2_runTesteDiagnostico_();
  }, { entrypoint: 'atividadesV2_runTesteDiagnostico' });
}

function atividadesV2_runTesteAtualizacaoPortalDryRun() {
  return atividades_runWithOperationalGuard_('ATUALIZACAO_PORTAL_V2', null, function() {
    return atividadesV2_runTesteAtualizacaoPortalDryRun_();
  }, { entrypoint: 'atividadesV2_runTesteAtualizacaoPortalDryRun' });
}

function atividadesV2_runTesteFrequenciaDryRun() {
  return atividades_runWithOperationalGuard_('FREQUENCIA_V2', null, function() {
    return atividadesV2_runTesteFrequenciaDryRun_();
  }, { entrypoint: 'atividadesV2_runTesteFrequenciaDryRun' });
}

function atividadesV2_runTesteJobPortalDryRun() {
  return atividades_runWithOperationalGuard_('ATUALIZACAO_PORTAL_V2', null, function() {
    return atividadesV2_runTesteJobPortalDryRun_();
  }, { entrypoint: 'atividadesV2_runTesteJobPortalDryRun' });
}

function atividadesV2_jobPortal(options) {
  options = options || {};
  return atividades_runWithOperationalGuard_('ATUALIZACAO_PORTAL_V2', null, function(guard) {
    return atividadesV2_jobPortal_(atividadesV2_jobPortalOptions_(options, guard));
  }, {
    entrypoint: 'atividadesV2_jobPortal',
    executionType: String(options.executionType || 'MANUAL').trim().toUpperCase()
  });
}

function atividadesV2_conferirPortal(options) {
  return atividades_runWithOperationalGuard_('CONFERENCIA_V2', null, function() {
    return atividadesV2_conferirPortal_(options || {});
  }, { entrypoint: 'atividadesV2_conferirPortal' });
}

function atividadesV2_diagnosticarMateriaisApresentacoesDev() {
  return atividades_runWithOperationalGuard_('CONFERENCIA_V2', null, function() {
    return atividadesV2_diagnosticarMateriaisApresentacoesDev_();
  }, { entrypoint: 'atividadesV2_diagnosticarMateriaisApresentacoesDev' });
}

function atividadesV2_migrarArquivosApresentacoesParaMateriaisDevDryRun() {
  return atividades_runWithOperationalGuard_('CONFERENCIA_V2', null, function() {
    return atividadesV2_migrarArquivosApresentacoesParaMateriaisDevDryRun_();
  }, { entrypoint: 'atividadesV2_migrarArquivosApresentacoesParaMateriaisDevDryRun' });
}

function atividadesV2_migrarArquivosApresentacoesParaMateriaisDev() {
  return atividades_runWithOperationalGuard_('ATUALIZACAO_PORTAL_V2', null, function() {
    return atividadesV2_migrarArquivosApresentacoesParaMateriaisDev_({ dryRun: false });
  }, { entrypoint: 'atividadesV2_migrarArquivosApresentacoesParaMateriaisDev' });
}

function atividadesV2_garantirPastaAtividadeDev(idAtividade, options) {
  return atividades_runWithOperationalGuard_('ATUALIZACAO_PORTAL_V2', null, function() {
    options = options || {};
    options.dryRun = options.dryRun === true;
    var lock = null;
    if (!options.dryRun) {
      lock = LockService.getScriptLock();
      if (!lock.tryLock(30000)) throw new Error('LOCK_INDISPONIVEL: nao foi possivel garantir pasta da atividade agora.');
    }
    try {
      return atividadesV2_garantirPastaAtividade_(idAtividade, options);
    } finally {
      if (lock) lock.releaseLock();
    }
  }, { entrypoint: 'atividadesV2_garantirPastaAtividadeDev' });
}

function atividadesV2_portalRegistrarMaterialApresentacao(payload, contexto) {
  return atividades_runWithOperationalGuard_('ATUALIZACAO_PORTAL_V2', null, function() {
    return atividadesV2_portalRegistrarMaterialApresentacao_(payload || {}, contexto || {});
  }, { entrypoint: 'atividadesV2_portalRegistrarMaterialApresentacao' });
}

function atividadesV2_portalListarEixosTematicos(contexto) {
  return atividades_runWithOperationalGuard_('CONFERENCIA_V2', null, function() {
    return atividadesV2_portalListarEixosTematicos_(contexto || {});
  }, { entrypoint: 'atividadesV2_portalListarEixosTematicos' });
}

function atividadesV2_portalEnviarTituloEixoApresentacao(payload, contexto) {
  return atividades_runWithOperationalGuard_('ATUALIZACAO_PORTAL_V2', null, function() {
    return atividadesV2_portalEnviarTituloEixoApresentacao_(payload || {}, contexto || {});
  }, { entrypoint: 'atividadesV2_portalEnviarTituloEixoApresentacao' });
}

function atividadesV2_portalRevisarTituloEixoApresentacao(payload, contexto) {
  return atividades_runWithOperationalGuard_('ATUALIZACAO_PORTAL_V2', null, function() {
    return atividadesV2_portalRevisarTituloEixoApresentacao_(payload || {}, contexto || {});
  }, { entrypoint: 'atividadesV2_portalRevisarTituloEixoApresentacao' });
}

function atividadesV2_portalEditarEAprovarTituloEixoApresentacao(payload, contexto) {
  return atividades_runWithOperationalGuard_('ATUALIZACAO_PORTAL_V2', null, function() {
    return atividadesV2_portalEditarEAprovarTituloEixoApresentacao_(payload || {}, contexto || {});
  }, { entrypoint: 'atividadesV2_portalEditarEAprovarTituloEixoApresentacao' });
}

function atividadesV2_portalReprovarTituloEixoApresentacao(payload, contexto) {
  return atividades_runWithOperationalGuard_('ATUALIZACAO_PORTAL_V2', null, function() {
    return atividadesV2_portalReprovarTituloEixoApresentacao_(payload || {}, contexto || {});
  }, { entrypoint: 'atividadesV2_portalReprovarTituloEixoApresentacao' });
}

function atividadesV2_portalRevisarMaterialApresentacao(payload, contexto) {
  return atividades_runWithOperationalGuard_('ATUALIZACAO_PORTAL_V2', null, function() {
    return atividadesV2_portalRevisarMaterialApresentacao_(payload || {}, contexto || {});
  }, { entrypoint: 'atividadesV2_portalRevisarMaterialApresentacao' });
}

function atividadesV2_portalEnviarJustificativa(payload, contexto) {
  return atividades_runWithOperationalGuard_('ATUALIZACAO_PORTAL_V2', null, function() {
    return atividadesV2_portalEnviarJustificativa_(payload || {}, contexto || {});
  }, { entrypoint: 'atividadesV2_portalEnviarJustificativa' });
}

function atividadesV2_portalAnalisarJustificativa(payload, contexto) {
  return atividades_runWithOperationalGuard_('ATUALIZACAO_PORTAL_V2', null, function() {
    return atividadesV2_portalAnalisarJustificativa_(payload || {}, contexto || {});
  }, { entrypoint: 'atividadesV2_portalAnalisarJustificativa' });
}

function atividadesV2_portalListarJustificativasPendentesDiretoria(contexto) {
  return atividades_runWithOperationalGuard_('CONFERENCIA_V2', null, function() {
    return atividadesV2_portalListarJustificativasPendentesDiretoria_(contexto || {});
  }, { entrypoint: 'atividadesV2_portalListarJustificativasPendentesDiretoria' });
}

function atividadesV2_promoverJustificativasPreviasDev(options) {
  return atividades_runWithOperationalGuard_('ATUALIZACAO_PORTAL_V2', null, function() {
    return atividadesV2_promoverJustificativasPreviasDev_(options || {});
  }, { entrypoint: 'atividadesV2_promoverJustificativasPreviasDev' });
}

function atividadesV2_atualizarStatusRealizacaoApresentacoesDev(options) {
  return atividades_runWithOperationalGuard_('ATUALIZACAO_PORTAL_V2', null, function() {
    return atividadesV2_atualizarStatusRealizacaoApresentacoesDev_(options || {});
  }, { entrypoint: 'atividadesV2_atualizarStatusRealizacaoApresentacoesDev' });
}

function atividadesV2_diagnosticarFluxoJustificativasPortalDev() {
  return atividades_runWithOperationalGuard_('CONFERENCIA_V2', null, function() {
    return atividadesV2_diagnosticarFluxoJustificativasPortalDev_();
  }, { entrypoint: 'atividadesV2_diagnosticarFluxoJustificativasPortalDev' });
}

function atividadesV2_runTestePortalJustificativasDev() {
  return atividades_runWithOperationalGuard_('CONFERENCIA_V2', null, function() {
    return atividadesV2_runTestePortalJustificativasDev_();
  }, { entrypoint: 'atividadesV2_runTestePortalJustificativasDev' });
}

function atividadesV2_diagnosticarFluxoApresentacoesPortalDev() {
  return atividades_runWithOperationalGuard_('CONFERENCIA_V2', null, function() {
    return atividadesV2_diagnosticarFluxoApresentacoesPortalDev_();
  }, { entrypoint: 'atividadesV2_diagnosticarFluxoApresentacoesPortalDev' });
}

function atividadesV2_runTestePortalApresentacoesAcoesDev() {
  return atividades_runWithOperationalGuard_('CONFERENCIA_V2', null, function() {
    return atividadesV2_runTestePortalApresentacoesAcoesDev_();
  }, { entrypoint: 'atividadesV2_runTestePortalApresentacoesAcoesDev' });
}

function atividadesV2_instalarTriggerJobPortal(options) {
  return atividadesV2_instalarTriggerJobPortal_(options || {});
}

function atividadesV2_removerTriggerJobPortal() {
  return atividadesV2_removerTriggerJobPortal_();
}

function atividadesV2_listarTriggerJobPortal() {
  return atividadesV2_listarTriggerJobPortal_();
}

function atividadesV2_sincronizarBrutasDev(options) {
  return atividades_runWithOperationalGuard_('MIGRACAO_V2_DEV', null, function() {
    return atividadesV2_sincronizarBrutasDev_(options || {});
  }, { entrypoint: 'atividadesV2_sincronizarBrutasDev' });
}

function atividadesV2_sincronizarBrutasDevDryRun() {
  return atividades_runWithOperationalGuard_('MIGRACAO_V2_DEV', null, function() {
    return atividadesV2_sincronizarBrutasDev_({ dryRun: true });
  }, { entrypoint: 'atividadesV2_sincronizarBrutasDevDryRun' });
}

function atividadesV2_preverSincronizacaoBrutasDev() {
  return atividades_runWithOperationalGuard_('MIGRACAO_V2_DEV', null, function() {
    return atividadesV2_sincronizarBrutasDev_({ dryRun: true });
  }, { entrypoint: 'atividadesV2_preverSincronizacaoBrutasDev' });
}

function atividadesV2_sincronizarFaltantesBrutasDev() {
  return atividades_runWithOperationalGuard_('MIGRACAO_V2_DEV', null, function() {
    return atividadesV2_sincronizarBrutasDev_({ dryRun: false });
  }, { entrypoint: 'atividadesV2_sincronizarFaltantesBrutasDev' });
}

function atividadesV2_sincronizarBrutasEViewsDev(options) {
  return atividades_runWithOperationalGuard_('MIGRACAO_V2_DEV', null, function() {
    return atividadesV2_sincronizarBrutasEViewsDev_(options || {});
  }, { entrypoint: 'atividadesV2_sincronizarBrutasEViewsDev' });
}

function atividadesV2_sincronizarFaltantesBrutasEAtualizarViewsDev() {
  return atividades_runWithOperationalGuard_('MIGRACAO_V2_DEV', null, function() {
    return atividadesV2_sincronizarBrutasEViewsDev_({ dryRun: false });
  }, { entrypoint: 'atividadesV2_sincronizarFaltantesBrutasEAtualizarViewsDev' });
}

function atividadesV2_migrarApresentacoesParaAtividadesDevDryRun() {
  return atividades_runWithOperationalGuard_('MIGRACAO_V2_DEV', null, function() {
    return atividadesV2_migrarApresentacoesParaAtividadesDevDryRun_();
  }, { entrypoint: 'atividadesV2_migrarApresentacoesParaAtividadesDevDryRun' });
}

function atividadesV2_migrarApresentacoesParaAtividadesDev() {
  return atividades_runWithOperationalGuard_('MIGRACAO_V2_DEV', null, function() {
    return atividadesV2_migrarApresentacoesParaAtividadesDev_({ dryRun: false });
  }, { entrypoint: 'atividadesV2_migrarApresentacoesParaAtividadesDev' });
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

function atividades_vincularConvidadosAtividadesGerais() {
  return atividades_runWithOperationalGuard_('ATIVIDADES_GERAIS', null, function() {
    return atividades_upsertConvidadosAtividadeGeral_();
  }, { entrypoint: 'atividades_vincularConvidadosAtividadesGerais' });
}

function atividades_autofillProfessoresConvidadosAtividadesGerais() {
  return atividades_runWithOperationalGuard_('ATIVIDADES_GERAIS', null, function() {
    return atividades_autofillProfessoresConvidadosAtividadesGerais_();
  }, { entrypoint: 'atividades_autofillProfessoresConvidadosAtividadesGerais' });
}

function atividades_limparDuplicadosConvidadosAtividadesGerais() {
  return atividades_runWithOperationalGuard_('ATIVIDADES_GERAIS', null, function() {
    return atividades_limparDuplicadosConvidadosAtividadesGerais_();
  }, { entrypoint: 'atividades_limparDuplicadosConvidadosAtividadesGerais' });
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

function atividades_enviarSolicitacoesConfirmacaoConvidados() {
  return atividades_runWithOperationalGuard_('APRESENTACOES_INTEGRADAS', null, function() {
    return atividades_enviarSolicitacoesConfirmacaoConvidados_();
  }, { entrypoint: 'atividades_enviarSolicitacoesConfirmacaoConvidados' });
}

function atividades_processarInboxConfirmacoesConvidados() {
  return atividades_runWithOperationalGuard_('APRESENTACOES_INTEGRADAS', null, function() {
    return atividades_processarInboxConfirmacoesConvidados_();
  }, { entrypoint: 'atividades_processarInboxConfirmacoesConvidados' });
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

function atividades_diagnosticarFaltasPendentes() {
  return atividades_runWithOperationalGuard_('JUSTIFICATIVAS_FALTAS', null, function() {
    return atividades_diagnosticarFaltasPendentes_();
  }, { entrypoint: 'atividades_diagnosticarFaltasPendentes' });
}

function atividades_reenviarAvisosFaltasPendentes() {
  return atividades_runWithOperationalGuard_('JUSTIFICATIVAS_FALTAS', null, function() {
    return atividades_reenviarAvisosFaltasPendentes_();
  }, { entrypoint: 'atividades_reenviarAvisosFaltasPendentes' });
}
