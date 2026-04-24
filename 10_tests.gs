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

function test_atividades_congelar_snapshot_normativo_periodo_vigente() {
  var result = atividades_congelarSnapshotNormativoPeriodoVigente();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_forcar_recalculo_snapshot_normativo_periodo_vigente() {
  var result = atividades_forcarRecalculoSnapshotNormativoPeriodoVigente();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_gerar_ids_base_planejamento_inicial_periodo_vigente() {
  var result = atividades_gerarIdsBasePlanejamentoInicialPeriodoVigente();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_debug_planejamento_normativo_periodo_vigente() {
  var ctx = atividades_getCurrentPeriodContext_();
  var result = atividades_getSnapshotNormativoPeriodo_(ctx, { ensureHeaders: true });
  Logger.log(JSON.stringify({
    period: {
      id: ctx.id,
      code: ctx.code,
      displayName: ctx.displayName
    },
    snapshot: {
      frozen: result.frozen,
      source: result.source,
      totalPlanejado: result.totalPlanejado,
      limiteCongelado: result.limiteCongelado
    },
    derived: result.derived
  }, null, 2));
  return result;
}

function test_atividades_recalcular_motor_disciplinar_periodo_vigente() {
  var result = atividades_recalcularMotorDisciplinarPeriodoVigente();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_gerar_eventos_desligamento_por_faltas_periodo_vigente() {
  var result = atividades_gerarEventosDesligamentoPorFaltasPeriodoVigente();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_instalar_triggers() {
  var result = atividades_instalarTriggers();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_job_apresentacoes() {
  var result = atividades_jobApresentacoes();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_enviar_cobrancas_titulo_eixo_apresentacoes() {
  var result = atividades_enviarCobrancasTituloEixoApresentacoes();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_processar_inbox_titulo_eixo_apresentacoes() {
  var result = atividades_processarInboxTituloEixoApresentacoes();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_listar_eixos_tematicos() {
  var result = atividades_getMapaEixosApresentacoes_();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_aplicar_ux_base_eixos_tematicos() {
  var result = atividades_aplicarUxBaseEixosTematicos();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_aplicar_ux_base_externos() {
  var result = atividades_aplicarUxBaseExternos();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_notificar_secretarios_apresentacoes() {
  var result = atividades_notificarSecretariosApresentacoes();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_preencher_identificacao_apresentacao_linha_2() {
  var result = atividades_preencherIdentificacaoApresentacaoLinha(2);
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_vincular_professores_apresentacoes() {
  var result = atividades_vincularProfessoresApresentacoes();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_enviar_convites_professores_apresentacoes() {
  var result = atividades_enviarConvitesProfessoresApresentacoes();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_vincular_externos_apresentacoes() {
  var result = atividades_vincularExternosApresentacoes();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_enviar_convites_externos_apresentacoes() {
  var result = atividades_enviarConvitesExternosApresentacoes();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_enviar_lembretes_membros_apresentacoes() {
  var result = atividades_enviarLembretesMembrosApresentacoes();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_marcar_apresentacoes_realizadas_automaticamente() {
  var result = atividades_marcarApresentacoesRealizadasAutomaticamente();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_enviar_cobrancas_arquivo_apresentacoes() {
  var result = atividades_enviarCobrancasArquivoApresentacoes();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_enviar_cobrancas_arquivo_apresentacoes_forcado() {
  var result = atividades_enviarCobrancasArquivoApresentacoesForcado();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_processar_inbox_arquivo_apresentacoes() {
  var result = atividades_processarInboxArquivoApresentacoes();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_processar_fotos_pendentes_apresentacoes() {
  var result = atividades_processarFotosPendentesApresentacoes();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_autofill_identificacao_apresentacoes() {
  var result = atividades_autofillIdentificacaoApresentacoes();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_sincronizar_historico_publico_apresentacoes() {
  var result = atividades_sincronizarHistoricoPublicoApresentacoes();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_job_apresentacoes_base() {
  var result = atividades_jobApresentacoesBase();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_job_apresentacoes_convites() {
  var result = atividades_jobApresentacoesConvites();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_job_apresentacoes_pos_evento() {
  var result = atividades_jobApresentacoesPosEvento();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_sincronizar_resumo_apresentacoes_em_members_atuais() {
  var result = atividades_sincronizarResumoApresentacoesEmMembersAtuais();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_aplicar_ux_historico_publico_apresentacoes() {
  var result = atividades_aplicarUxHistoricoPublicoApresentacoes();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function test_atividades_remover_triggers() {
  var result = atividades_removerTriggers();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
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

function test_atividades_apply_planning_defaults_linha_2() {
  var result = atividades_applyPlanningDefaultsForRow_(2);
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
