/**
 * Contratos DEV de chamada/frequencia para o Portal GEAPA.
 *
 * Estas rotinas operam somente na base ATIVIDADES_V2_DB. Nao alteram V1,
 * producao, triggers, e-mails, certificados ou outros fluxos produtivos.
 */

var ATIVIDADES_V2_CHAMADA_STATUS = Object.freeze({
  PRESENTE_PRESENCIAL: 'P',
  PRESENTE_REMOTO: 'R',
  FALTA: 'F',
  NAO_SE_APLICA: 'N/A'
});

var ATIVIDADES_V2_CHAMADA_OPERACOES = Object.freeze({
  SALVAR: 'SALVAR',
  FINALIZAR: 'FINALIZAR',
  REABRIR: 'REABRIR'
});

function atividadesV2_portalGetChamada_(idAtividade, contexto) {
  var perf = portalPerfStart_('atividadesV2_portalGetChamada');
  try {
    var ctx = atividadesV2_normalizeChamadaContext_(contexto);
    var permission = atividadesV2_validateChamadaPermission_(ctx);
    if (!permission.ok) return permission;

    var wantedId = atividadesV2_validateChamadaActivityId_(idAtividade);
    var ss = atividadesV2_getDatabaseSpreadsheetDev_();
    portalPerfMark_(perf, 'abrir_planilha_v2_dev');

    var activity = atividadesV2_getChamadaActivity_(ss, wantedId, perf);
    if (!activity) return atividadesV2_chamadaError_('ATIVIDADE_NAO_ENCONTRADA', 'Atividade nao encontrada na base v2 DEV.');

    var activityValidation = atividadesV2_validateActivityAllowsChamada_(activity);
    if (!activityValidation.ok) return activityValidation;

    var statusChamada = atividadesV2_getChamadaStatus_(ss, wantedId, perf);
    var janela = atividadesV2_getChamadaWindowMeta_(activity, statusChamada, ctx);
    if (!janela.podeVisualizarChamada) {
      var perfJanela = portalPerfEnd_(perf);
      return portalPerfAttachDiagnostics_(atividadesV2_chamadaError_(
        'CHAMADA_FORA_DA_JANELA',
        atividadesV2_chamadaWindowPublicMessage_(janela.motivoChamadaIndisponivel),
        null,
        ''
      ), perfJanela);
    }

    var membersResult = atividadesV2_listarMembrosChamadaViaCore_(activity.DATA_ATIVIDADE, ctx, perf);
    if (!membersResult.ok) return membersResult;
    portalPerfMark_(perf, 'listar_membros_core', { total: membersResult.data.length });

    var draft = statusChamada.finalizada ? null : atividadesV2_getChamadaDraft_(ss, wantedId, perf);
    var usarRascunho = atividadesV2_shouldUseChamadaDraft_(statusChamada, draft);
    var presencas = usarRascunho
      ? atividadesV2_chamadaDraftRecordsToRows_(draft.snapshot && draft.snapshot.registros || [])
      : atividadesV2_readChamadaExistingRecords_(ss, wantedId, { useCache: true, perf: perf });
    var presencasByRef = atividadesV2_indexChamadaRecordsByReference_(presencas);
    portalPerfMark_(perf, usarRascunho ? 'usar_rascunho_chamada' : 'ler_presencas_existentes', { total: presencas.length });

    var convites = atividadesV2_readChamadaConvites_(ss, wantedId, { perf: perf });
    portalPerfMark_(perf, 'ler_convites', { total: convites.length });

    var participantes = atividadesV2_buildChamadaParticipantes_(
      membersResult.data,
      convites,
      presencasByRef,
      activity
    );
    var resumo = atividadesV2_buildChamadaResumo_(participantes);
    var perfResult = portalPerfEnd_(perf);

    return {
      ok: true,
      data: {
        atividade: atividadesV2_buildChamadaActivityPayload_(activity),
        participantes: participantes,
        resumo: resumo,
        statusChamada: statusChamada.statusChamada,
        statusChamadaRotulo: statusChamada.rotulo,
        chamadaFinalizada: statusChamada.finalizada,
        statusChamadaAtualizadoEm: statusChamada.atualizadoEm,
        statusChamadaAtualizadoPor: statusChamada.atualizadoPor,
        resumoSalvo: statusChamada.resumo || {},
        rascunhoRestaurado: usarRascunho,
        rascunhoSalvoEm: usarRascunho ? draft.salvoEm : '',
        rascunhoSalvoPor: usarRascunho ? draft.salvoPor : '',
        dataHoraInicio: janela.dataHoraInicio,
        dataHoraFim: janela.dataHoraFim,
        chamadaDisponivelEm: janela.chamadaDisponivelEm,
        chamadaEncerraEm: janela.chamadaEncerraEm,
        podeRegistrarChamadaAgora: janela.podeRegistrarChamadaAgora,
        podeVisualizarChamada: janela.podeVisualizarChamada,
        motivoChamadaIndisponivel: janela.motivoChamadaIndisponivel,
        podeSalvar: janela.podeRegistrarChamadaAgora,
        podeFinalizar: janela.podeRegistrarChamadaAgora,
        podeReabrir: statusChamada.finalizada,
        modo: 'DEV',
        ultimaAtualizacao: new Date().toISOString()
      },
      tempoTotalMs: perfResult.totalMs,
      performance: portalPerfBuildDiagnostics_(perfResult)
    };
  } catch (err) {
    var perfError = portalPerfEnd_(perf);
    return portalPerfAttachDiagnostics_(atividadesV2_chamadaError_(
      'ERRO_BUSCAR_CHAMADA',
      'Nao foi possivel buscar a chamada da atividade.',
      err,
      perfError ? perfError.totalMs : ''
    ), perfError);
  }
}

function atividadesV2_portalSalvarChamada_(payload, contexto) {
  var perf = portalPerfStart_('atividadesV2_portalSalvarChamada');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    return atividadesV2_chamadaError_('LOCK_INDISPONIVEL', 'Nao foi possivel obter lock para salvar a chamada.');
  }

  try {
    var ctx = atividadesV2_normalizeChamadaContext_(contexto);
    var permission = atividadesV2_validateChamadaPermission_(ctx);
    if (!permission.ok) return permission;

    var data = payload || {};
    var operacao = atividadesV2_normalizeChamadaOperacao_(data.operacao);
    var wantedId = atividadesV2_validateChamadaActivityId_(data.idAtividade);
    var ss = atividadesV2_getDatabaseSpreadsheetDev_();
    portalPerfMark_(perf, 'abrir_planilha_v2_dev');

    var activity = atividadesV2_getChamadaActivity_(ss, wantedId, perf);
    if (!activity) return atividadesV2_chamadaError_('ATIVIDADE_NAO_ENCONTRADA', 'Atividade nao encontrada na base v2 DEV.');

    var activityValidation = atividadesV2_validateActivityAllowsChamada_(activity);
    if (!activityValidation.ok) return activityValidation;

    var statusAtual = atividadesV2_getChamadaStatus_(ss, wantedId, perf);
    if (statusAtual.finalizada && operacao !== ATIVIDADES_V2_CHAMADA_OPERACOES.REABRIR) {
      return atividadesV2_chamadaError_('CHAMADA_FINALIZADA', 'Chamada finalizada. Reabra a chamada antes de alterar registros.');
    }

    var janela = atividadesV2_getChamadaWindowMeta_(activity, statusAtual, ctx);
    if (operacao !== ATIVIDADES_V2_CHAMADA_OPERACOES.REABRIR && !janela.podeRegistrarChamadaAgora) {
      var perfJanelaSalvar = portalPerfEnd_(perf);
      return portalPerfAttachDiagnostics_(atividadesV2_chamadaError_(
        'CHAMADA_FORA_DA_JANELA',
        atividadesV2_chamadaWindowPublicMessage_(janela.motivoChamadaIndisponivel)
      ), perfJanelaSalvar);
    }

    if (operacao === ATIVIDADES_V2_CHAMADA_OPERACOES.REABRIR) {
      var statusReaberto = atividadesV2_registrarStatusChamada_(ss, activity, ctx, 'REABERTA', {
        totalRegistros: 0,
        totalPresentes: 0,
        totalFaltas: 0,
        totalNaoSeAplica: 0
      });
      atividadesV2_appendV2Log_(ss, {
        FLUXO: 'PORTAL_CHAMADA_DEV',
        ACAO: 'Reabrir chamada pelo Portal em DEV',
        NIVEL: 'INFO',
        STATUS: 'OK',
        ID_ATIVIDADE: wantedId,
        USUARIO: ctx.email || ctx.rga || ctx.perfil,
        MENSAGEM: 'Chamada reaberta na base v2 DEV.',
        DETALHES_JSON: atividadesV2_safeLogData_(statusReaberto)
      });
      var perfReabrir = portalPerfEnd_(perf);
      return {
        ok: true,
        message: 'Chamada reaberta para ajustes.',
        data: {
          idAtividade: wantedId,
          statusChamada: statusReaberto.statusChamada,
          statusChamadaRotulo: statusReaberto.rotulo,
          chamadaFinalizada: false,
          modo: 'DEV'
        },
        tempoTotalMs: perfReabrir.totalMs,
        performance: portalPerfBuildDiagnostics_(perfReabrir)
      };
    }

    var membersResult = atividadesV2_listarMembrosChamadaViaCore_(activity.DATA_ATIVIDADE, ctx, perf);
    if (!membersResult.ok) return membersResult;
    var applicableMembers = atividadesV2_indexApplicableMembersByRga_(membersResult.data);
    portalPerfMark_(perf, 'revalidar_membros_core', { total: membersResult.data.length });

    var convitesOperacao = atividadesV2_readChamadaConvites_(ss, wantedId, { perf: perf });
    var registros = atividadesV2_normalizeChamadaSavePayload_(data, activity, applicableMembers, {
      operacao: operacao,
      members: membersResult.data,
      convites: convitesOperacao
    });
    portalPerfMark_(perf, 'validar_payload', { total: registros.length });

    if (operacao === ATIVIDADES_V2_CHAMADA_OPERACOES.SALVAR) {
      var resumoRascunho = atividadesV2_countChamadaRows_(registros);
      var draftStatus = atividadesV2_salvarRascunhoChamada_(ss, activity, ctx, registros, resumoRascunho);
      portalPerfMark_(perf, 'salvar_rascunho_portal_acoes', { total: registros.length });
      atividadesV2_appendV2Log_(ss, {
        FLUXO: 'PORTAL_CHAMADA_DEV',
        ACAO: 'Salvar rascunho de chamada pelo Portal em DEV',
        NIVEL: 'INFO',
        STATUS: 'OK',
        ID_ATIVIDADE: wantedId,
        USUARIO: ctx.email || ctx.rga || ctx.perfil,
        MENSAGEM: 'Rascunho de chamada salvo em Portal_Acoes sem gravar presencas oficiais.',
        DETALHES_JSON: atividadesV2_safeLogData_({
          idAtividade: wantedId,
          totalRegistrosRascunho: registros.length
        })
      });
      atividadesV2_invalidateChamadaDraftCaches_(wantedId);
      portalPerfMark_(perf, 'invalidar_cache_rascunho_chamada', { idAtividade: wantedId });
      var perfRascunho = portalPerfEnd_(perf);
      return {
        ok: true,
        message: 'Rascunho de chamada salvo com sucesso na base DEV.',
        data: {
          idAtividade: wantedId,
          totalRegistros: registros.length,
          totalPresentes: resumoRascunho.totalPresentes,
          totalFaltas: 0,
          totalNaoSeAplica: resumoRascunho.totalNaoSeAplica,
          statusChamada: draftStatus.statusChamada,
          statusChamadaRotulo: draftStatus.rotulo,
          chamadaFinalizada: false,
          rascunhoSalvo: true,
          rascunhoSalvoEm: draftStatus.atualizadoEm,
          modo: 'DEV'
        },
        escrita: {
          rascunhoPortalAcoes: true,
          presencasOficiais: 0,
          inserts: 0,
          updates: 0,
          duplicatesInactivated: 0
        },
        tempoTotalMs: perfRascunho.totalMs,
        performance: portalPerfBuildDiagnostics_(perfRascunho)
      };
    }

    if (operacao === ATIVIDADES_V2_CHAMADA_OPERACOES.FINALIZAR) {
      var payloadVazioFinalizacao = (!data.registros || !data.registros.length) && (!data.externos || !data.externos.length);
      var draftFinalizacao = payloadVazioFinalizacao ? atividadesV2_getChamadaDraft_(ss, wantedId, perf) : null;
      if (payloadVazioFinalizacao && atividadesV2_shouldUseChamadaDraft_(statusAtual, draftFinalizacao)) {
        data = atividadesV2_applyDraftToFinalizePayload_(data, draftFinalizacao);
        registros = atividadesV2_normalizeChamadaSavePayload_(data, activity, applicableMembers, {
          operacao: operacao,
          members: membersResult.data,
          convites: convitesOperacao
        });
        portalPerfMark_(perf, 'usar_rascunho_para_finalizar', { total: registros.length });
      } else if (payloadVazioFinalizacao && atividades_normalizeTextUpper_(statusAtual.statusChamada) === 'REABERTA') {
        var oficiaisReabertura = atividadesV2_readChamadaExistingRecords_(ss, wantedId, { useCache: true, perf: perf });
        data = atividadesV2_applyOfficialRowsToFinalizePayload_(data, oficiaisReabertura);
        registros = atividadesV2_normalizeChamadaSavePayload_(data, activity, applicableMembers, {
          operacao: operacao,
          members: membersResult.data,
          convites: convitesOperacao
        });
        portalPerfMark_(perf, 'usar_presencas_oficiais_para_finalizar', { total: registros.length });
      }
      atividadesV2_validateChamadaCompletaParaFinalizar_(membersResult.data, convitesOperacao, registros);
      portalPerfMark_(perf, 'finalizar_chamada_completa', { total: registros.length });
    }

    var sheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.PRESENCAS_REGISTROS);
    atividadesV2_applyHeadersIfMissing_(sheet, ATIVIDADES_V2_SCHEMA.PRESENCAS_REGISTROS);
    var writeResult = atividadesV2_upsertChamadaPresenceRows_(sheet, registros);
    portalPerfMark_(perf, 'escrever_presencas', {
      total: registros.length,
      inserts: writeResult.inserts,
      updates: writeResult.updates
    });

    atividadesV2_appendV2Log_(ss, {
      FLUXO: 'PORTAL_CHAMADA_DEV',
      ACAO: 'Salvar chamada pelo Portal em DEV',
      NIVEL: 'INFO',
      STATUS: 'OK',
      ID_ATIVIDADE: wantedId,
      USUARIO: ctx.email || ctx.rga || ctx.perfil,
      MENSAGEM: 'Chamada salva na base v2 DEV.',
      DETALHES_JSON: atividadesV2_safeLogData_({
        idAtividade: wantedId,
        totalRegistros: registros.length,
        inserts: writeResult.inserts,
        updates: writeResult.updates,
        duplicatesInactivated: writeResult.duplicatesInactivated
      })
    });

    var resumo = atividadesV2_countChamadaRows_(registros);
    var statusFinal = atividadesV2_registrarStatusChamada_(
      ss,
      activity,
      ctx,
      operacao === ATIVIDADES_V2_CHAMADA_OPERACOES.FINALIZAR ? 'FINALIZADA' : 'SALVA',
      resumo
    );
    var promocaoPrevias = operacao === ATIVIDADES_V2_CHAMADA_OPERACOES.FINALIZAR &&
      typeof atividadesV2_promoverJustificativasPreviasNaPlanilha_ === 'function'
      ? atividadesV2_promoverJustificativasPreviasNaPlanilha_(ss, {
        ok: true,
        dryRun: false,
        totalPrevias: 0,
        totalPromovidas: 0,
        promovidas: [],
        avisos: [],
        erros: []
      }, { idAtividade: wantedId })
      : null;
    if (promocaoPrevias && promocaoPrevias.totalPromovidas > 0 && typeof atividadesV2_invalidateJustificativasPortalCaches_ === 'function') {
      atividadesV2_invalidateJustificativasPortalCaches_(ctx, {
        idAtividade: wantedId,
        idPessoa: '',
        rga: '',
        email: ''
      });
    }
    if (promocaoPrevias) {
      portalPerfMark_(perf, 'promover_justificativas_previas', {
        totalPromovidas: promocaoPrevias.totalPromovidas || 0
      });
    }
    atividadesV2_invalidateChamadaPortalCaches_(ctx, {
      idAtividade: wantedId,
      registros: registros
    });
    portalPerfMark_(perf, 'invalidar_caches_chamada', { membrosAfetados: registros.length });
    var perfResult = portalPerfEnd_(perf);
    return {
      ok: true,
      message: operacao === ATIVIDADES_V2_CHAMADA_OPERACOES.FINALIZAR
        ? 'Chamada finalizada com sucesso na base DEV.'
        : 'Chamada salva com sucesso na base DEV.',
      data: {
        idAtividade: wantedId,
        totalRegistros: registros.length,
        totalPresentes: resumo.totalPresentes,
        totalFaltas: resumo.totalFaltas,
        totalNaoSeAplica: resumo.totalNaoSeAplica,
        statusChamada: statusFinal.statusChamada,
        statusChamadaRotulo: statusFinal.rotulo,
        chamadaFinalizada: statusFinal.finalizada,
        statusChamadaAtualizadoEm: statusFinal.atualizadoEm,
        statusChamadaAtualizadoPor: statusFinal.atualizadoPor,
        justificativasPreviasPromovidas: promocaoPrevias ? promocaoPrevias.totalPromovidas : 0,
        modo: 'DEV'
      },
      escrita: {
        inserts: writeResult.inserts,
        updates: writeResult.updates,
        duplicatesInactivated: writeResult.duplicatesInactivated
      },
      tempoTotalMs: perfResult.totalMs,
      performance: portalPerfBuildDiagnostics_(perfResult)
    };
  } catch (err) {
    var perfError = portalPerfEnd_(perf);
    var errorCode = err && err.errorCode ? err.errorCode : 'ERRO_SALVAR_CHAMADA';
    return portalPerfAttachDiagnostics_(atividadesV2_chamadaError_(
      errorCode,
      atividadesV2_chamadaPublicErrorMessage_(errorCode),
      err,
      perfError ? perfError.totalMs : ''
    ), perfError);
  } finally {
    lock.releaseLock();
  }
}

function atividadesV2_runTestePortalChamadaDev_() {
  var ss = atividadesV2_getDatabaseSpreadsheetDev_();
  var atividades = atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES));
  var target = null;

  for (var i = 0; i < atividades.length; i++) {
    if (!atividadesV2_isCanonicalActivityId_(atividades[i].ID_ATIVIDADE)) continue;
    if (atividadesV2_validateActivityAllowsChamada_(atividades[i]).ok) {
      target = atividades[i];
      break;
    }
  }

  if (!target) {
    return {
      ok: false,
      errorCode: 'ATIVIDADE_NAO_ENCONTRADA',
      message: 'Nenhuma atividade DEV apta para teste de chamada foi encontrada.'
    };
  }

  var chamada = atividadesV2_portalGetChamada_(target.ID_ATIVIDADE, { perfil: 'DIRETORIA' });
  if (!chamada.ok) return chamada;

  return {
    ok: true,
    idAtividade: String(target.ID_ATIVIDADE || '').trim(),
    totalParticipantes: chamada.data.participantes.length,
    podeSalvar: chamada.data.podeSalvar === true,
    camposSeguros: atividadesV2_chamadaHasOnlySafeFields_(chamada.data.participantes[0]),
    observacao: 'Teste nao salva dados reais.'
  };
}

function atividadesV2_normalizeChamadaContext_(contexto) {
  return atividades_normalizePortalContext_(contexto || {});
}

function atividadesV2_validateChamadaPermission_(ctx) {
  if (atividades_isPrivilegedPortalProfile_(ctx)) return { ok: true };
  return atividadesV2_chamadaError_('PERMISSAO_NEGADA', 'Usuario sem permissao para chamada operacional.');
}

function atividadesV2_validateChamadaActivityId_(idAtividade) {
  var wantedId = String(idAtividade || '').trim();
  if (!wantedId) {
    throw atividadesV2_chamadaException_('ID_ATIVIDADE_OBRIGATORIO', 'Informe a atividade para chamada.');
  }
  if (!atividadesV2_isCanonicalActivityId_(wantedId)) {
    throw atividadesV2_chamadaException_('ID_ATIVIDADE_OBRIGATORIO', 'ID_ATIVIDADE invalido para chamada.');
  }
  return wantedId;
}

function atividadesV2_getChamadaActivity_(ss, idAtividade, perf) {
  var cacheKey = portalCacheBuildKey_('chamada:atividade', idAtividade);
  var cached = portalCacheGetJson_(cacheKey);
  if (cached) {
    if (perf) portalPerfMark_(perf, 'cache_hit_atividade', { idAtividade: idAtividade });
    return cached;
  }

  var sheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES);
  var records = atividadesV2_readSheetObjects_(sheet);
  if (perf) portalPerfMark_(perf, 'ler_aba_atividades', { linhas: records.length });
  for (var i = 0; i < records.length; i++) {
    if (String(records[i].ID_ATIVIDADE || '').trim() === idAtividade) {
      portalCachePutJson_(cacheKey, records[i], ATIVIDADES_V2_PORTAL_CHAMADA_CACHE_TTL_SECONDS);
      return records[i];
    }
  }
  return null;
}

function atividadesV2_validateActivityAllowsChamada_(activity) {
  var operational = atividades_normalizeTextUpper_(activity.STATUS_OPERACIONAL);
  if (operational === 'CANCELADA' || operational === 'ARQUIVADA') {
    return atividadesV2_chamadaError_('ATIVIDADE_NAO_PERMITE_CHAMADA', 'Atividade cancelada ou arquivada nao permite chamada.');
  }

  var countsPresence = atividades_isTruthySim_(activity.CONTA_PRESENCA);
  var countsAbsence = atividades_isTruthySim_(activity.CONTA_FALTA);
  var requiresList = atividades_isTruthySim_(activity.EXIGE_LISTA_PRESENCA);
  if (!countsPresence && !countsAbsence && !requiresList) {
    return atividadesV2_chamadaError_('ATIVIDADE_NAO_PERMITE_CHAMADA', 'Atividade nao permite chamada.');
  }

  if (!atividades_parseDateOrNull_(activity.DATA_ATIVIDADE)) {
    return atividadesV2_chamadaError_('ATIVIDADE_NAO_PERMITE_CHAMADA', 'Atividade sem data valida para chamada.');
  }

  return { ok: true };
}

function atividadesV2_listarMembrosChamadaViaCore_(dataAtividade, contexto, perf) {
  var isoDate = atividades_formatPortalDateIso_(dataAtividade);
  if (!isoDate) {
    return atividadesV2_chamadaError_('ATIVIDADE_NAO_PERMITE_CHAMADA', 'Atividade sem data valida para chamada.');
  }

  var cacheKey = portalCacheBuildKey_('chamada:membros', isoDate);
  var cached = portalCacheGetJson_(cacheKey);
  if (cached && Array.isArray(cached.data)) {
    if (perf) portalPerfMark_(perf, 'cache_hit_membros_core', { dataAtividade: isoDate, total: cached.data.length });
    return {
      ok: true,
      data: cached.data,
      meta: cached.meta || {},
      cacheHit: true
    };
  }

  var result = null;
  if (typeof geapaCoreListarMembrosParaChamada === 'function') {
    result = geapaCoreListarMembrosParaChamada(isoDate, contexto || {});
  } else if (
    typeof GEAPA_CORE !== 'undefined' &&
    GEAPA_CORE &&
    typeof GEAPA_CORE.geapaCoreListarMembrosParaChamada === 'function'
  ) {
    result = GEAPA_CORE.geapaCoreListarMembrosParaChamada(isoDate, contexto || {});
  } else if (
    typeof GEAPA_CORE !== 'undefined' &&
    GEAPA_CORE &&
    typeof GEAPA_CORE.coreListarMembrosParaChamada === 'function'
  ) {
    result = GEAPA_CORE.coreListarMembrosParaChamada(isoDate, contexto || {});
  } else if (
    typeof GEAPA_CORE !== 'undefined' &&
    GEAPA_CORE &&
    typeof GEAPA_CORE.listarMembrosParaChamada === 'function'
  ) {
    result = GEAPA_CORE.listarMembrosParaChamada(isoDate, contexto || {});
  } else if (
    typeof GEAPA_CORE !== 'undefined' &&
    GEAPA_CORE &&
    GEAPA_CORE.portal &&
    typeof GEAPA_CORE.portal.listarMembrosParaChamada === 'function'
  ) {
    result = GEAPA_CORE.portal.listarMembrosParaChamada(isoDate, contexto || {});
  }

  if (!result) {
    return atividadesV2_chamadaError_('ERRO_BUSCAR_CHAMADA', 'GEAPA_CORE nao expos listagem de membros para chamada.');
  }
  if (result.ok !== true) {
    return atividadesV2_chamadaError_(result.errorCode || 'ERRO_BUSCAR_CHAMADA', result.message || 'Nao foi possivel listar membros para chamada.');
  }

  var response = {
    ok: true,
    data: result.data || [],
    meta: result.meta || {}
  };
  portalCachePutJson_(cacheKey, {
    data: response.data,
    meta: response.meta
  }, ATIVIDADES_V2_PORTAL_CHAMADA_CACHE_TTL_SECONDS);
  return response;
}

function atividadesV2_readChamadaExistingRecords_(ss, idAtividade, options) {
  options = options || {};
  var cacheKey = portalCacheBuildKey_('chamada:presencas', idAtividade);
  if (options.useCache) {
    var cached = portalCacheGetJson_(cacheKey);
    if (cached && Array.isArray(cached.records)) {
      if (options.perf) portalPerfMark_(options.perf, 'cache_hit_presencas', { total: cached.records.length });
      return cached.records;
    }
  }

  var sheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.PRESENCAS_REGISTROS);
  var records = atividadesV2_readSheetObjects_(sheet);
  if (options.perf) portalPerfMark_(options.perf, 'ler_aba_presencas', { linhas: records.length });
  var filtered = records.filter(function(record) {
    return String(record.ID_ATIVIDADE || '').trim() === idAtividade &&
      atividades_normalizeTextUpper_(record.ATIVO || 'SIM') !== 'NAO';
  });
  if (options.useCache) {
    portalCachePutJson_(cacheKey, { records: filtered }, ATIVIDADES_V2_PORTAL_PRIVATE_CACHE_TTL_SECONDS);
  }
  return filtered;
}

function atividadesV2_indexChamadaRecordsByReference_(records) {
  var index = {};
  (records || []).forEach(function(record) {
    atividadesV2_chamadaRecordKeys_(record).forEach(function(key) {
      if (key && !index[key]) index[key] = record;
    });
  });
  return index;
}

function atividadesV2_readChamadaConvites_(ss, idAtividade, options) {
  options = options || {};
  var sheet = ss.getSheetByName(ATIVIDADES_V2_SHEETS.CONVITES);
  if (!sheet) return [];
  var records = atividadesV2_readSheetObjects_(sheet);
  if (options.perf) portalPerfMark_(options.perf, 'ler_aba_convites', { linhas: records.length });
  return records.filter(function(record) {
    return String(record.ID_ATIVIDADE || '').trim() === idAtividade &&
      atividades_normalizeTextUpper_(record.ATIVO || 'SIM') !== 'NAO';
  });
}

function atividadesV2_getChamadaDraft_(ss, idAtividade, perf) {
  var cacheKey = portalCacheBuildKey_('chamada:rascunho', idAtividade);
  var cached = portalCacheGetJson_(cacheKey);
  if (cached) {
    if (perf) portalPerfMark_(perf, 'cache_hit_rascunho_chamada', { idAtividade: idAtividade });
    return cached;
  }

  var sheet = ss && ss.getSheetByName(ATIVIDADES_V2_SHEETS.PORTAL_ACOES);
  if (!sheet || sheet.getLastRow() < 2) return null;

  atividadesV2_applyHeadersIfMissing_(sheet, ATIVIDADES_V2_SCHEMA.PORTAL_ACOES);
  var records = atividadesV2_readSheetObjects_(sheet);
  if (perf) portalPerfMark_(perf, 'ler_portal_acoes_rascunho', { linhas: records.length });

  var latest = null;
  records.forEach(function(record) {
    var id = String(record.ID_ATIVIDADE || '').trim();
    if (id !== idAtividade) return;
    var tipo = atividades_normalizeTextUpper_(record.TIPO_ACAO);
    if (tipo !== 'CHAMADA_RASCUNHO_SALVO' && tipo !== 'CHAMADA_SALVA') return;
    if (atividades_normalizeTextUpper_(record.ATIVO || 'SIM') === 'NAO') return;

    var payload = atividadesV2_parseJsonOrEmpty_(record.PAYLOAD_JSON);
    if (!payload || !Array.isArray(payload.registros)) return;
    var dataHora = String(record.DATA_HORA || payload.salvoEm || record.CRIADO_EM || '').trim();
    if (latest && String(latest.dataHora || '') > dataHora) return;
    latest = {
      dataHora: dataHora,
      salvoEm: String(payload.salvoEm || dataHora || '').trim(),
      salvoPor: String(payload.salvoPor || record.USUARIO_EMAIL || record.USUARIO_NOME || '').trim(),
      snapshot: payload
    };
  });

  if (latest) {
    portalCachePutJson_(cacheKey, latest, ATIVIDADES_V2_PORTAL_PRIVATE_CACHE_TTL_SECONDS);
  }
  return latest;
}

function atividadesV2_shouldUseChamadaDraft_(statusChamada, draft) {
  if (!draft || !draft.snapshot) return false;
  var status = atividades_normalizeTextUpper_(statusChamada && statusChamada.statusChamada);
  if (status === 'FINALIZADA') return false;
  if (status === 'REABERTA') {
    return String(draft.dataHora || '') >= String(statusChamada.atualizadoEm || '');
  }
  return true;
}

function atividadesV2_chamadaDraftRecordsToRows_(records) {
  return (records || []).map(function(record) {
    return {
      TIPO_PARTICIPANTE: record.tipoParticipante || record.TIPO_PARTICIPANTE || 'MEMBRO',
      ID_PESSOA: record.idPessoa || record.ID_PESSOA || '',
      ID_REFERENCIA: record.idReferencia || record.ID_REFERENCIA || record.idPessoa || record.ID_PESSOA || record.rga || record.RGA || '',
      RGA: record.rga || record.RGA || '',
      NOME_PARTICIPANTE: record.nome || record.NOME_PARTICIPANTE || '',
      EMAIL_PARTICIPANTE: record.email || record.EMAIL_PARTICIPANTE || '',
      STATUS_PRESENCA: record.statusPresenca || record.STATUS_PRESENCA || '',
      CODIGO_PRESENCA: record.codigoPresenca || record.CODIGO_PRESENCA || '',
      OBSERVACOES: record.observacoes || record.OBSERVACOES || '',
      ATIVO: 'SIM'
    };
  });
}

function atividadesV2_applyDraftToFinalizePayload_(payload, draft) {
  var out = {};
  Object.keys(payload || {}).forEach(function(key) {
    out[key] = payload[key];
  });
  out.registros = [];
  out.externos = [];
  ((draft && draft.snapshot && draft.snapshot.registros) || []).forEach(function(record) {
    var tipo = atividades_normalizeTextUpper_(record.tipoParticipante || record.TIPO_PARTICIPANTE || 'MEMBRO');
    if (tipo === 'MEMBRO') out.registros.push(record);
    else out.externos.push(record);
  });
  return out;
}

function atividadesV2_applyOfficialRowsToFinalizePayload_(payload, rows) {
  var out = {};
  Object.keys(payload || {}).forEach(function(key) {
    out[key] = payload[key];
  });
  out.registros = [];
  out.externos = [];
  (rows || []).forEach(function(row) {
    var record = {
      tipoParticipante: row.TIPO_PARTICIPANTE || 'MEMBRO',
      idPessoa: row.ID_PESSOA || '',
      rga: row.RGA || '',
      nome: row.NOME_PARTICIPANTE || '',
      email: row.EMAIL_PARTICIPANTE || '',
      statusPresenca: row.STATUS_PRESENCA || '',
      codigoPresenca: row.CODIGO_PRESENCA || '',
      observacoes: row.OBSERVACOES || ''
    };
    if (atividades_normalizeTextUpper_(record.tipoParticipante) === 'MEMBRO') out.registros.push(record);
    else out.externos.push(record);
  });
  return out;
}

function atividadesV2_salvarRascunhoChamada_(ss, activity, contexto, registros, resumo) {
  var sheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.PORTAL_ACOES);
  atividadesV2_applyHeadersIfMissing_(sheet, ATIVIDADES_V2_SCHEMA.PORTAL_ACOES);

  var now = new Date().toISOString();
  var idAtividade = String(activity.ID_ATIVIDADE || '').trim();
  var status = atividadesV2_buildChamadaStatusPayload_(
    'SALVA',
    now,
    contexto.email || contexto.rga || contexto.perfil || '',
    resumo || {}
  );
  var snapshot = {
    idAtividade: idAtividade,
    statusChamada: status.statusChamada,
    registros: atividadesV2_buildChamadaDraftSnapshotRecords_(registros),
    resumo: resumo || {},
    salvoEm: now,
    salvoPor: contexto.email || contexto.rga || contexto.perfil || ''
  };
  var row = {
    ID_ACAO_PORTAL: atividadesV2_buildPortalChamadaActionId_(idAtividade, 'CHAMADA_RASCUNHO_SALVO'),
    DATA_HORA: now,
    USUARIO_EMAIL: contexto.email || '',
    USUARIO_NOME: '',
    PERFIL_USUARIO: contexto.perfil || '',
    TIPO_ACAO: 'CHAMADA_RASCUNHO_SALVO',
    ID_ATIVIDADE: idAtividade,
    ID_ENTIDADE: idAtividade,
    TIPO_ENTIDADE: 'CHAMADA_ATIVIDADE',
    PAYLOAD_JSON: atividadesV2_safeLogData_(snapshot),
    STATUS_PROCESSAMENTO: 'CONCLUIDO',
    RESULTADO_JSON: atividadesV2_safeLogData_({ ok: true, efeitoOficial: false }),
    ERRO_CODIGO: '',
    ERRO_MENSAGEM: '',
    PROCESSADO_EM: now,
    PROCESSADO_POR: contexto.email || contexto.rga || contexto.perfil || '',
    OBSERVACOES: 'Rascunho de chamada salvo sem efeito em frequencia.',
    ATIVO: 'SIM'
  };
  var headers = atividadesV2_getSheetHeaders_(sheet).filter(function(header) { return !!header; });
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, headers.length).setValues([
    headers.map(function(header) {
      return Object.prototype.hasOwnProperty.call(row, header) ? row[header] : '';
    })
  ]);

  return status;
}

function atividadesV2_buildChamadaDraftSnapshotRecords_(registros) {
  return (registros || []).map(function(record) {
    return {
      tipoParticipante: record.TIPO_PARTICIPANTE || '',
      idPessoa: record.ID_PESSOA || '',
      rga: record.RGA || '',
      nome: record.NOME_PARTICIPANTE || '',
      email: record.EMAIL_PARTICIPANTE || '',
      marcacao: atividadesV2_chamadaMarcacaoFromStatus_(record.STATUS_PRESENCA),
      statusPresenca: record.STATUS_PRESENCA || '',
      codigoPresenca: record.CODIGO_PRESENCA || '',
      observacoes: record.OBSERVACOES || ''
    };
  });
}

function atividadesV2_chamadaMarcacaoFromStatus_(status) {
  var normalized = atividades_normalizeTextUpper_(status);
  if (normalized === 'PRESENTE_PRESENCIAL') return 'PRESENCIAL';
  if (normalized === 'PRESENTE_REMOTO') return 'REMOTO';
  if (normalized === 'NAO_SE_APLICA') return 'NAO_SE_APLICA';
  return '';
}

function atividadesV2_buildChamadaParticipantes_(members, convites, existingByRef, activity) {
  var out = [];
  (members || []).forEach(function(member) {
    var pessoa = atividadesV2_resolverPessoa_(member);
    var existing = atividadesV2_findChamadaExistingByPessoa_(existingByRef, 'MEMBRO', pessoa, member) || {};
    out.push(atividadesV2_buildChamadaParticipantPayload_({
      tipoParticipante: 'MEMBRO',
      idPessoa: pessoa.idPessoa,
      rga: member.rga,
      nome: member.nomeExibicao,
      statusPresenca: existing.STATUS_PRESENCA || '',
      codigoPresenca: existing.CODIGO_PRESENCA || '',
      observacoes: existing.OBSERVACOES || '',
      aplicavelNaData: member.aplicavelNaData !== false,
      contaPresenca: member.contaPresenca !== false && atividades_isTruthySim_(activity.CONTA_PRESENCA),
      contaFalta: member.contaFalta !== false && atividades_isTruthySim_(activity.CONTA_FALTA),
      bloqueado: member.aplicavelNaData === false,
      motivoBloqueio: member.motivoNaoAplicavel || ''
    }));
  });

  (convites || []).forEach(function(convite) {
    var tipo = String(convite.TIPO_VINCULO_PESSOA || convite.TIPO_PARTICIPANTE || 'CONVIDADO').trim().toUpperCase();
    if (tipo === 'MEMBRO') return;
    var pessoaConvite = atividadesV2_resolverPessoa_(convite);
    var ref = pessoaConvite.idPessoa || convite.ID_REFERENCIA || convite.EMAIL || convite.NOME || convite._rowNumber;
    var existing = atividadesV2_findChamadaExistingByPessoa_(existingByRef, tipo, pessoaConvite, convite) || {};
    out.push(atividadesV2_buildChamadaParticipantPayload_({
      tipoParticipante: tipo,
      idPessoa: pessoaConvite.idPessoa,
      rga: '',
      nome: convite.NOME,
      instituicao: convite.INSTITUICAO,
      statusPresenca: existing.STATUS_PRESENCA || '',
      codigoPresenca: existing.CODIGO_PRESENCA || '',
      observacoes: existing.OBSERVACOES || '',
      aplicavelNaData: true,
      contaPresenca: atividades_isTruthySim_(activity.CONTA_PRESENCA),
      contaFalta: false,
      bloqueado: false,
      motivoBloqueio: ''
    }));
  });

  return out;
}

function atividadesV2_buildChamadaParticipantPayload_(data) {
  return {
    tipoParticipante: String(data.tipoParticipante || '').trim(),
    idPessoa: String(data.idPessoa || '').trim(),
    rga: String(data.rga || '').trim(),
    nome: atividades_sanitizePortalText_(data.nome, 180),
    instituicao: atividades_sanitizePortalText_(data.instituicao, 180),
    statusPresenca: String(data.statusPresenca || '').trim(),
    codigoPresenca: String(data.codigoPresenca || '').trim(),
    observacoes: atividades_sanitizePortalText_(data.observacoes, 300),
    aplicavelNaData: data.aplicavelNaData !== false,
    contaPresenca: data.contaPresenca === true,
    contaFalta: data.contaFalta === true,
    bloqueado: data.bloqueado === true,
    motivoBloqueio: String(data.motivoBloqueio || '').trim()
  };
}

function atividadesV2_buildChamadaActivityPayload_(activity) {
  return {
    idAtividade: String(activity.ID_ATIVIDADE || '').trim(),
    tituloPublico: atividades_getPortalTituloPublico_(activity),
    dataAtividade: atividades_formatPortalDateIso_(activity.DATA_ATIVIDADE),
    horarioCompleto: atividades_formatPortalFullTime_(activity.HORARIO_INICIO, activity.HORARIO_FIM),
    local: atividades_sanitizePortalText_(activity.LOCAL, 180),
    formato: String(activity.FORMATO || '').trim(),
    statusPublico: String(activity.STATUS_PUBLICACAO_PORTAL || activity.STATUS_OPERACIONAL || '').trim(),
    contaPresenca: atividades_isTruthySim_(activity.CONTA_PRESENCA),
    contaFalta: atividades_isTruthySim_(activity.CONTA_FALTA)
  };
}

function atividadesV2_getChamadaStatus_(ss, idAtividade, perf) {
  var cacheKey = portalCacheBuildKey_('chamada:status', idAtividade);
  var cached = portalCacheGetJson_(cacheKey);
  if (cached) {
    if (perf) portalPerfMark_(perf, 'cache_hit_status_chamada', { idAtividade: idAtividade });
    return cached;
  }

  var map = atividadesV2_getChamadaStatusMap_(ss, [idAtividade], perf);
  var status = map[idAtividade] || atividadesV2_buildChamadaStatusPayload_('RASCUNHO', '', '', {});
  portalCachePutJson_(cacheKey, status, ATIVIDADES_V2_PORTAL_PRIVATE_CACHE_TTL_SECONDS);
  return status;
}

function atividadesV2_getChamadaStatusMap_(ss, idsAtividades, perf) {
  if ((idsAtividades || []).length === 1) {
    var singleId = String(idsAtividades[0] || '').trim();
    var cached = singleId ? portalCacheGetJson_(portalCacheBuildKey_('chamada:status', singleId)) : null;
    if (cached) {
      var cachedMap = {};
      cachedMap[singleId] = cached;
      if (perf) portalPerfMark_(perf, 'cache_hit_status_chamada', { idAtividade: singleId });
      return cachedMap;
    }
  }

  var ids = {};
  (idsAtividades || []).forEach(function guardarId(idAtividade) {
    var id = String(idAtividade || '').trim();
    if (id) ids[id] = true;
  });

  var sheet = ss && ss.getSheetByName(ATIVIDADES_V2_SHEETS.PORTAL_ACOES);
  if (!sheet || sheet.getLastRow() < 2) return {};

  atividadesV2_applyHeadersIfMissing_(sheet, ATIVIDADES_V2_SCHEMA.PORTAL_ACOES);
  var records = atividadesV2_readSheetObjects_(sheet);
  if (perf) portalPerfMark_(perf, 'ler_portal_acoes_status', { linhas: records.length });
  var latest = {};

  records.forEach(function avaliarAcao(record) {
    var idAtividade = String(record.ID_ATIVIDADE || '').trim();
    if (!idAtividade || (Object.keys(ids).length && !ids[idAtividade])) return;

    var tipo = atividades_normalizeTextUpper_(record.TIPO_ACAO);
    if (['CHAMADA_RASCUNHO_SALVO', 'CHAMADA_SALVA', 'CHAMADA_FINALIZADA', 'CHAMADA_REABERTA'].indexOf(tipo) === -1) return;
    if (atividades_normalizeTextUpper_(record.ATIVO || 'SIM') === 'NAO') return;

    var payload = atividadesV2_parseJsonOrEmpty_(record.PAYLOAD_JSON);
    var dataHora = record.DATA_HORA || record.CRIADO_EM || '';
    var current = latest[idAtividade];
    if (current && String(current.dataHora || '') > String(dataHora || '')) return;

    latest[idAtividade] = {
      dataHora: dataHora,
      statusChamada: payload.statusChamada || atividadesV2_statusFromPortalAction_(tipo),
      atualizadoPor: record.USUARIO_EMAIL || record.USUARIO_NOME || '',
      resumo: payload.resumo || {}
    };
  });

  var out = {};
  Object.keys(latest).forEach(function montarStatus(idAtividade) {
    var item = latest[idAtividade];
    out[idAtividade] = atividadesV2_buildChamadaStatusPayload_(
      item.statusChamada,
      item.dataHora,
      item.atualizadoPor,
      item.resumo
    );
    portalCachePutJson_(
      portalCacheBuildKey_('chamada:status', idAtividade),
      out[idAtividade],
      ATIVIDADES_V2_PORTAL_PRIVATE_CACHE_TTL_SECONDS
    );
  });
  return out;
}

function atividadesV2_registrarStatusChamada_(ss, activity, contexto, statusChamada, resumo) {
  var sheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.PORTAL_ACOES);
  atividadesV2_applyHeadersIfMissing_(sheet, ATIVIDADES_V2_SCHEMA.PORTAL_ACOES);

  var status = atividadesV2_buildChamadaStatusPayload_(
    statusChamada,
    new Date().toISOString(),
    contexto.email || contexto.rga || contexto.perfil || '',
    resumo || {}
  );
  var tipoAcao = status.statusChamada === 'FINALIZADA'
    ? 'CHAMADA_FINALIZADA'
    : status.statusChamada === 'REABERTA'
      ? 'CHAMADA_REABERTA'
      : 'CHAMADA_SALVA';
  var payload = {
    statusChamada: status.statusChamada,
    rotulo: status.rotulo,
    finalizada: status.finalizada,
    resumo: resumo || {}
  };
  var row = {
    ID_ACAO_PORTAL: atividadesV2_buildPortalChamadaActionId_(activity.ID_ATIVIDADE, tipoAcao),
    DATA_HORA: status.atualizadoEm,
    USUARIO_EMAIL: contexto.email || '',
    USUARIO_NOME: '',
    PERFIL_USUARIO: contexto.perfil || '',
    TIPO_ACAO: tipoAcao,
    ID_ATIVIDADE: String(activity.ID_ATIVIDADE || '').trim(),
    ID_ENTIDADE: String(activity.ID_ATIVIDADE || '').trim(),
    TIPO_ENTIDADE: 'CHAMADA_ATIVIDADE',
    PAYLOAD_JSON: atividadesV2_safeLogData_(payload),
    STATUS_PROCESSAMENTO: 'CONCLUIDO',
    RESULTADO_JSON: atividadesV2_safeLogData_({ ok: true }),
    ERRO_CODIGO: '',
    ERRO_MENSAGEM: '',
    PROCESSADO_EM: status.atualizadoEm,
    PROCESSADO_POR: contexto.email || contexto.rga || contexto.perfil || '',
    OBSERVACOES: 'Status de chamada registrado pelo Portal GEAPA DEV.',
    ATIVO: 'SIM'
  };
  var headers = atividadesV2_getSheetHeaders_(sheet).filter(function(header) { return !!header; });
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, headers.length).setValues([
    headers.map(function(header) {
      return Object.prototype.hasOwnProperty.call(row, header) ? row[header] : '';
    })
  ]);

  atividadesV2_invalidateChamadaCacheByActivity_(String(activity.ID_ATIVIDADE || '').trim(), { keepActivity: true });
  return status;
}

function atividadesV2_buildChamadaStatusPayload_(statusChamada, atualizadoEm, atualizadoPor, resumo) {
  var status = atividades_normalizeTextUpper_(statusChamada || 'RASCUNHO');
  if (['RASCUNHO', 'SALVA', 'FINALIZADA', 'REABERTA'].indexOf(status) === -1) status = 'RASCUNHO';

  return {
    statusChamada: status,
    rotulo: atividadesV2_formatChamadaStatus_(status),
    finalizada: status === 'FINALIZADA',
    atualizadoEm: String(atualizadoEm || '').trim(),
    atualizadoPor: String(atualizadoPor || '').trim(),
    resumo: resumo || {}
  };
}

function atividadesV2_statusFromPortalAction_(tipoAcao) {
  if (tipoAcao === 'CHAMADA_FINALIZADA') return 'FINALIZADA';
  if (tipoAcao === 'CHAMADA_REABERTA') return 'REABERTA';
  if (tipoAcao === 'CHAMADA_RASCUNHO_SALVO') return 'SALVA';
  return 'SALVA';
}

function atividadesV2_formatChamadaStatus_(statusChamada) {
  var map = {
    RASCUNHO: 'Chamada pendente',
    SALVA: 'Chamada salva',
    FINALIZADA: 'Chamada finalizada',
    REABERTA: 'Chamada reaberta'
  };
  return map[statusChamada] || map.RASCUNHO;
}

function atividadesV2_parseJsonOrEmpty_(value) {
  try {
    return value ? JSON.parse(String(value)) : {};
  } catch (err) {
    return {};
  }
}

function atividadesV2_buildPortalChamadaActionId_(idAtividade, tipoAcao) {
  return [
    'PCH',
    atividadesV2_sanitizeIdToken_(tipoAcao),
    atividadesV2_sanitizeIdToken_(idAtividade),
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmssSSS')
  ].join('-');
}

function atividadesV2_normalizeChamadaOperacao_(operacao) {
  var normalizada = atividades_normalizeTextUpper_(operacao || 'SALVAR');
  return ATIVIDADES_V2_CHAMADA_OPERACOES[normalizada]
    ? normalizada
    : ATIVIDADES_V2_CHAMADA_OPERACOES.SALVAR;
}

function atividadesV2_validateChamadaCompletaParaFinalizar_(members, convites, registros) {
  var coveredMembers = {};
  (registros || []).forEach(function guardarRegistro(row) {
    if (atividades_normalizeTextUpper_(row.TIPO_PARTICIPANTE) !== 'MEMBRO') return;
    atividadesV2_chamadaRecordKeys_(row).forEach(function(key) {
      if (key) coveredMembers[key] = true;
    });
  });

  var missing = (members || []).filter(function(member) {
    if (!member) return false;
    var pessoa = atividadesV2_resolverPessoa_(member);
    var keys = atividadesV2_chamadaRecordKeys_({
      TIPO_PARTICIPANTE: 'MEMBRO',
      ID_PESSOA: pessoa.idPessoa,
      RGA: member.rga,
      ID_REFERENCIA: pessoa.idPessoa || member.rga,
      EMAIL_PARTICIPANTE: member.email,
      NOME_PARTICIPANTE: member.nomeExibicao || member.nome
    });
    return !keys.some(function(key) {
      return coveredMembers[key] === true;
    });
  });

  if (missing.length) {
    throw atividadesV2_chamadaException_(
      'CHAMADA_INCOMPLETA',
      'Nao foi possivel montar registros para todos os membros da chamada.'
    );
  }
}

function atividadesV2_buildChamadaResumo_(participantes) {
  var counts = atividadesV2_countChamadaRows_(participantes.map(function(item) {
    return {
      STATUS_PRESENCA: item.statusPresenca
    };
  }));
  counts.totalParticipantes = participantes.length;
  counts.totalSemMarcacao = participantes.filter(function(item) {
    return !String(item.statusPresenca || '').trim();
  }).length;
  return counts;
}

function atividadesV2_countChamadaRows_(rows) {
  var out = {
    totalParticipantes: rows.length,
    totalPresentes: 0,
    totalFaltas: 0,
    totalNaoSeAplica: 0,
    totalSemMarcacao: 0
  };
  (rows || []).forEach(function(row) {
    var status = atividades_normalizeTextUpper_(row.STATUS_PRESENCA || row.statusPresenca);
    if (status === 'PRESENTE_PRESENCIAL' || status === 'PRESENTE_REMOTO') out.totalPresentes++;
    else if (status === 'FALTA') out.totalFaltas++;
    else if (status === 'NAO_SE_APLICA') out.totalNaoSeAplica++;
    else out.totalSemMarcacao++;
  });
  return out;
}

function atividadesV2_indexApplicableMembersByRga_(members) {
  var index = {};
  (members || []).forEach(function(member) {
    var pessoa = atividadesV2_resolverPessoa_(member);
    var idPessoaKey = atividadesV2_sanitizeIdToken_(pessoa.idPessoa);
    var rgaKey = atividadesV2_sanitizeIdToken_(member.rga);
    if (idPessoaKey) index['PESSOA:' + idPessoaKey] = member;
    if (rgaKey) index['RGA:' + rgaKey] = member;
  });
  return index;
}

function atividadesV2_normalizeChamadaSavePayload_(payload, activity, applicableMembers, opts) {
  opts = opts || {};
  var operacao = opts.operacao || ATIVIDADES_V2_CHAMADA_OPERACOES.SALVAR;
  var out = [];
  var identity = atividadesV2_resolveActivityIdentity_(activity);
  var registros = Array.isArray(payload.registros) ? payload.registros : [];
  var externos = Array.isArray(payload.externos) ? payload.externos : [];
  var now = new Date();
  var user = Session.getActiveUser && Session.getActiveUser() ? Session.getActiveUser().getEmail() : '';
  var inputByRef = atividadesV2_indexChamadaInputByReference_(registros);

  if (operacao === ATIVIDADES_V2_CHAMADA_OPERACOES.FINALIZAR) {
    (opts.members || []).forEach(function(member) {
      var pessoa = atividadesV2_resolverPessoa_(member);
      var item = atividadesV2_findChamadaExistingByPessoa_(inputByRef, 'MEMBRO', pessoa, member) || {};
      var statusInput = member.aplicavelNaData === false
        ? 'NAO_SE_APLICA'
        : atividadesV2_defaultChamadaStatusForFinalizacao_(item);
      var pessoaFinal = pessoa.idPessoa ? pessoa : atividadesV2_resolverPessoa_(item);
      var rgaInput = atividadesV2_firstNonEmpty_(item.rga, item.RGA);
      var nomeInput = atividadesV2_firstNonEmpty_(item.nome, item.NOME, item.NOME_PARTICIPANTE);
      out.push(atividadesV2_buildChamadaPresenceRow_(activity, identity, item, {
        operacao: operacao,
        statusPresenca: statusInput,
        tipoParticipante: 'MEMBRO',
        idPessoa: pessoaFinal.idPessoa,
        idReferencia: pessoaFinal.idPessoa || rgaInput || member.rga,
        nome: nomeInput || member.nomeExibicao || member.nome,
        rga: rgaInput || member.rga,
        vinculo: member.vinculo || 'Membro',
        contaPresenca: member.contaPresenca !== false && atividades_isTruthySim_(activity.CONTA_PRESENCA),
        contaFalta: member.contaFalta !== false && atividades_isTruthySim_(activity.CONTA_FALTA),
        now: now,
        user: user
      }));
    });
  } else {
    registros.forEach(function(item) {
      var statusRascunho = atividades_normalizeTextUpper_(item.statusPresenca || item.STATUS_PRESENCA);
      if (!statusRascunho) statusRascunho = atividadesV2_statusFromChamadaCode_(item.codigoPresenca || item.CODIGO_PRESENCA);
      if (statusRascunho === 'FALTA') {
        throw atividadesV2_chamadaException_(
          'STATUS_PRESENCA_INVALIDO',
          'Falta so pode ser registrada ao finalizar a chamada.'
        );
      }
      var pessoa = atividadesV2_resolverPessoa_(item);
      var rgaInput = atividadesV2_firstNonEmpty_(item.rga, item.RGA);
      var nomeInput = atividadesV2_firstNonEmpty_(item.nome, item.NOME, item.NOME_PARTICIPANTE);
      var pessoaKey = atividadesV2_sanitizeIdToken_(pessoa.idPessoa);
      var rgaKey = atividadesV2_sanitizeIdToken_(rgaInput);
      var member = pessoaKey ? applicableMembers['PESSOA:' + pessoaKey] : null;
      if (!member && rgaKey) member = applicableMembers['RGA:' + rgaKey];
      if (!member) {
        throw atividadesV2_chamadaException_('MEMBRO_NAO_APLICAVEL_NA_DATA', 'Membro nao aplicavel na data da atividade.');
      }
      if (member.aplicavelNaData === false && statusRascunho && statusRascunho !== 'NAO_SE_APLICA') {
        throw atividadesV2_chamadaException_('MEMBRO_NAO_APLICAVEL_NA_DATA', 'Membro nao aplicavel na data da atividade.');
      }
      var pessoaFinal = pessoa.idPessoa ? pessoa : atividadesV2_resolverPessoa_(member);
      out.push(atividadesV2_buildChamadaPresenceRow_(activity, identity, item, {
        operacao: operacao,
        statusPresenca: statusRascunho,
        tipoParticipante: 'MEMBRO',
        idPessoa: pessoaFinal.idPessoa,
        idReferencia: pessoaFinal.idPessoa || rgaInput,
        nome: nomeInput || member.nomeExibicao,
        rga: rgaInput || member.rga,
        vinculo: member.vinculo || 'Membro',
        contaPresenca: member.contaPresenca !== false && atividades_isTruthySim_(activity.CONTA_PRESENCA),
        contaFalta: member.contaFalta !== false && atividades_isTruthySim_(activity.CONTA_FALTA),
        now: now,
        user: user
      }));
    });
  }

  externos.forEach(function(item, index) {
    var pessoaExterna = atividadesV2_resolverPessoa_(item);
    var emailExterno = atividadesV2_firstNonEmpty_(item.email, item.EMAIL, item.EMAIL_PARTICIPANTE);
    var nomeExterno = atividadesV2_firstNonEmpty_(item.nome, item.NOME, item.NOME_PARTICIPANTE);
    out.push(atividadesV2_buildChamadaPresenceRow_(activity, identity, item, {
      operacao: operacao,
      tipoParticipante: item.tipoParticipante || 'EXTERNO',
      idPessoa: pessoaExterna.idPessoa,
      idReferencia: pessoaExterna.idPessoa || emailExterno || nomeExterno || ('EXT-' + (index + 1)),
      nome: nomeExterno,
      email: emailExterno,
      vinculo: atividadesV2_firstNonEmpty_(item.instituicao, item.INSTITUICAO) || '',
      contaPresenca: atividades_isTruthySim_(activity.CONTA_PRESENCA),
      contaFalta: false,
      now: now,
      user: user
    }));
  });

  return out;
}

function atividadesV2_indexChamadaInputByReference_(items) {
  var index = {};
  (items || []).forEach(function(item) {
    var pessoa = atividadesV2_resolverPessoa_(item);
    var tipo = item.tipoParticipante || item.TIPO_PARTICIPANTE || 'MEMBRO';
    var raw = {
      TIPO_PARTICIPANTE: tipo,
      ID_PESSOA: pessoa.idPessoa,
      RGA: item.rga || item.RGA,
      ID_REFERENCIA: item.idReferencia || item.ID_REFERENCIA || pessoa.idPessoa,
      EMAIL_PARTICIPANTE: item.email || item.EMAIL || item.EMAIL_PARTICIPANTE,
      NOME_PARTICIPANTE: item.nome || item.NOME || item.NOME_PARTICIPANTE
    };
    atividadesV2_chamadaRecordKeys_(raw).forEach(function(key) {
      if (key && !index[key]) index[key] = item;
    });
  });
  return index;
}

function atividadesV2_defaultChamadaStatusForFinalizacao_(input) {
  var status = atividades_normalizeTextUpper_(input && (input.statusPresenca || input.STATUS_PRESENCA));
  if (!status) status = atividadesV2_statusFromChamadaCode_(input && (input.codigoPresenca || input.CODIGO_PRESENCA));
  return status || 'FALTA';
}

function atividadesV2_buildChamadaPresenceRow_(activity, identity, input, opts) {
  var rawStatus = opts.statusPresenca !== undefined
    ? opts.statusPresenca
    : atividadesV2_firstNonEmpty_(
      input.statusPresenca,
      input.STATUS_PRESENCA,
      atividadesV2_statusFromChamadaCode_(input.codigoPresenca || input.CODIGO_PRESENCA)
    );
  var normalizedStatus = atividadesV2_normalizeChamadaStatusForOperacao_(
    rawStatus,
    opts.operacao || ATIVIDADES_V2_CHAMADA_OPERACOES.SALVAR
  );
  var code = atividadesV2_normalizeChamadaCode_(
    atividadesV2_firstNonEmpty_(input.codigoPresenca, input.CODIGO_PRESENCA),
    normalizedStatus
  );
  var tipo = String(opts.tipoParticipante || 'MEMBRO').trim().toUpperCase();
  var ref = String(opts.idReferencia || '').trim();
  var idRegistro = atividadesV2_gerarIdRegistroPresenca_(identity.ano, identity.semestre, identity.sequencial, ref || opts.nome);

  return {
    ID_REGISTRO_PRESENCA: idRegistro,
    ID_ATIVIDADE: String(activity.ID_ATIVIDADE || '').trim(),
    ID_APRESENTACAO: '',
    CICLO: activity.CICLO || '',
    ANO: identity.ano,
    SEMESTRE: identity.semestre,
    DATA_ATIVIDADE: activity.DATA_ATIVIDADE || '',
    TITULO_ATIVIDADE: activity.TITULO_PUBLICO || activity.TITULO || '',
    TIPO_ATIVIDADE: activity.TIPO_ATIVIDADE || '',
    SUBTIPO_ATIVIDADE: activity.SUBTIPO_ATIVIDADE || '',
    TIPO_PARTICIPANTE: tipo,
    ID_PESSOA: opts.idPessoa || '',
    ID_REFERENCIA: ref,
    RGA: opts.rga || '',
    NOME_PARTICIPANTE: opts.nome || '',
    EMAIL_PARTICIPANTE: opts.email || '',
    VINCULO_PARTICIPANTE: opts.vinculo || '',
    PAPEL_NA_ATIVIDADE: tipo === 'MEMBRO' ? 'MEMBRO' : 'CONVIDADO',
    STATUS_PRESENCA: normalizedStatus,
    CODIGO_PRESENCA: code,
    MODALIDADE_PRESENCA: atividadesV2_modalidadeFromStatus_(normalizedStatus),
    CONTA_PRESENCA: opts.contaPresenca ? 'SIM' : 'NAO',
    CONTA_FALTA: opts.contaFalta ? 'SIM' : 'NAO',
    GERA_CERTIFICADO: activity.GERA_CERTIFICADO || '',
    CARGA_HORARIA_TOTAL_ATIVIDADE: activity.CARGA_HORARIA || '',
    CARGA_HORARIA_CONSIDERADA: normalizedStatus === 'NAO_SE_APLICA' ? '' : (activity.CARGA_HORARIA || ''),
    PRESENCA_REGISTRADA: normalizedStatus ? 'SIM' : 'NAO',
    ELEGIVEL_CERTIFICADO: activity.GERA_CERTIFICADO || '',
    ORIGEM_REGISTRO: 'PORTAL_DEV',
    REGISTRADO_POR: opts.user || '',
    REGISTRADO_EM: opts.now,
    ATUALIZADO_POR: opts.user || '',
    ATUALIZADO_EM: opts.now,
    MOTIVO_AJUSTE: 'Registro de chamada via Portal GEAPA DEV',
    OBSERVACOES: atividades_sanitizePortalText_(atividadesV2_firstNonEmpty_(input.observacoes, input.OBSERVACOES), 300),
    ATIVO: 'SIM'
  };
}

function atividadesV2_upsertChamadaPresenceRows_(sheet, objects) {
  var headers = atividadesV2_getSheetHeaders_(sheet).filter(function(header) { return !!header; });
  var headerMap = atividadesV2_simpleHeaderMap_(headers);
  var keyHeader = 'ID_REGISTRO_PRESENCA';
  var keyCol = headerMap[keyHeader] || 0;
  if (!keyCol) throw new Error('Cabecalho-chave ausente em presencas: ' + keyHeader);

  var lastRow = sheet.getLastRow();
  var existingValues = lastRow > 1
    ? sheet.getRange(2, 1, lastRow - 1, headers.length).getValues()
    : [];
  var byKey = {};
  var byCanonicalKey = {};
  var duplicateRows = {};
  existingValues.forEach(function(row, index) {
    var key = String(row[keyCol - 1] || '').trim();
    if (key && !byKey[key]) byKey[key] = index;
    var rowObject = atividadesV2_chamadaRowToObject_(headers, row);
    if (atividades_normalizeTextUpper_(rowObject.ATIVO || 'SIM') === 'NAO') return;
    atividadesV2_chamadaPresenceCanonicalKeys_(rowObject).forEach(function(canonicalKey) {
      if (!canonicalKey) return;
      if (byCanonicalKey[canonicalKey] === undefined) {
        byCanonicalKey[canonicalKey] = index;
      } else {
        duplicateRows[index] = true;
      }
    });
  });

  var inserts = 0;
  var updates = 0;
  var duplicatesInactivated = 0;
  objects.forEach(function(obj) {
    var key = String(obj[keyHeader] || '').trim();
    if (!key) return;
    var rowIndex = byKey[key];
    if (rowIndex === undefined) {
      var canonicalKeys = atividadesV2_chamadaPresenceCanonicalKeys_(obj);
      for (var i = 0; i < canonicalKeys.length; i++) {
        if (byCanonicalKey[canonicalKeys[i]] !== undefined) {
          rowIndex = byCanonicalKey[canonicalKeys[i]];
          break;
        }
      }
    }
    if (rowIndex === undefined) {
      var insertedRow = headers.map(function(header) {
        return Object.prototype.hasOwnProperty.call(obj, header) ? obj[header] : '';
      });
      existingValues.push(insertedRow);
      byKey[key] = existingValues.length - 1;
      atividadesV2_chamadaPresenceCanonicalKeys_(obj).forEach(function(canonicalKey) {
        if (canonicalKey && byCanonicalKey[canonicalKey] === undefined) {
          byCanonicalKey[canonicalKey] = existingValues.length - 1;
        }
      });
      inserts++;
      return;
    }

    var existingKey = String(existingValues[rowIndex][keyCol - 1] || '').trim();
    if (existingKey) obj[keyHeader] = existingKey;
    delete duplicateRows[rowIndex];
    headers.forEach(function(header, colIndex) {
      if (Object.prototype.hasOwnProperty.call(obj, header)) {
        existingValues[rowIndex][colIndex] = obj[header];
      }
    });
    atividadesV2_chamadaPresenceCanonicalKeys_(obj).forEach(function(canonicalKey) {
      if (canonicalKey) byCanonicalKey[canonicalKey] = rowIndex;
    });
    updates++;
  });

  Object.keys(duplicateRows).forEach(function(rowIndexText) {
    var rowIndex = Number(rowIndexText);
    if (rowIndex < 0 || rowIndex >= existingValues.length) return;
    if (headerMap.ATIVO) existingValues[rowIndex][headerMap.ATIVO - 1] = 'NAO';
    if (headerMap.MOTIVO_AJUSTE) existingValues[rowIndex][headerMap.MOTIVO_AJUSTE - 1] = 'Duplicata inativada por upsert canonico da chamada V2.';
    if (headerMap.ATUALIZADO_EM) existingValues[rowIndex][headerMap.ATUALIZADO_EM - 1] = new Date();
    duplicatesInactivated++;
  });

  if (existingValues.length) {
    sheet.getRange(2, 1, existingValues.length, headers.length).setValues(existingValues);
  }

  return {
    ok: true,
    inserts: inserts,
    updates: updates,
    duplicatesInactivated: duplicatesInactivated,
    totalRows: objects.length
  };
}

function atividadesV2_chamadaRowToObject_(headers, row) {
  var out = {};
  headers.forEach(function(header, index) {
    if (header) out[header] = row[index];
  });
  return out;
}

function atividadesV2_chamadaPresenceCanonicalKeys_(record) {
  var idAtividade = atividadesV2_sanitizeIdToken_(record.ID_ATIVIDADE || record.idAtividade);
  var tipo = atividadesV2_sanitizeIdToken_(record.TIPO_PARTICIPANTE || record.tipoParticipante || 'PARTICIPANTE');
  if (!idAtividade || !tipo) return [];

  var keys = [];
  var idPessoa = atividadesV2_sanitizeIdToken_(record.ID_PESSOA || record.idPessoa);
  var rga = atividadesV2_sanitizeIdToken_(record.RGA || record.rga);
  var idReferencia = atividadesV2_sanitizeIdToken_(record.ID_REFERENCIA || record.idReferencia);
  var email = atividadesV2_sanitizeIdToken_(record.EMAIL_PARTICIPANTE || record.email);
  var nome = atividadesV2_sanitizeIdToken_(record.NOME_PARTICIPANTE || record.nome);

  if (idPessoa) keys.push([idAtividade, tipo, 'PESSOA', idPessoa].join('|'));
  if (rga) keys.push([idAtividade, tipo, 'RGA', rga].join('|'));
  if (idReferencia) keys.push([idAtividade, tipo, 'REF', idReferencia].join('|'));
  if (email) keys.push([idAtividade, tipo, 'EMAIL', email].join('|'));
  if (!keys.length && nome) keys.push([idAtividade, tipo, 'NOME', nome].join('|'));

  return keys.filter(function(key, index, arr) {
    return key && arr.indexOf(key) === index;
  });
}

function atividadesV2_invalidateChamadaPortalCaches_(contexto, result) {
  result = result || {};
  var idAtividade = String(result.idAtividade || '').trim();
  atividadesV2_invalidateChamadaCacheByActivity_(idAtividade, { keepActivity: true });
  var ctx = atividadesV2_normalizeChamadaContext_(contexto || {});
  var tokens = {};
  var baseToken = portalCacheContextToken_(ctx);
  if (baseToken) tokens[baseToken] = true;

  (result.registros || []).forEach(function(record) {
    var token = portalCacheContextToken_({
      perfil: 'MEMBRO',
      idPessoa: record.ID_PESSOA || '',
      rga: record.RGA || '',
      email: record.EMAIL_PARTICIPANTE || ''
    });
    if (token) tokens[token] = true;
  });

  Object.keys(tokens).forEach(function(token) {
    portalCacheRemove_(portalCacheBuildKey_('frequencia', token));
    portalCacheRemove_(portalCacheBuildKey_('frequencia_detalhada_v2', token));
    portalCacheRemove_(portalCacheBuildKey_('minhas_justificativas', token));
    portalCacheRemove_(portalCacheBuildKey_('bundle', token));
    if (idAtividade) {
      portalCacheRemove_(portalCacheBuildKey_('atividade:detalhes', idAtividade + ':' + token));
    }
  });
}

function atividadesV2_invalidateChamadaDraftCaches_(idAtividade) {
  var id = String(idAtividade || '').trim();
  if (!id) return;
  portalCacheRemove_(portalCacheBuildKey_('chamada:rascunho', id));
  portalCacheRemove_(portalCacheBuildKey_('chamada:status', id));
  portalCacheRemove_(portalCacheBuildKey_('chamada:presencas', id));
}

function atividadesV2_invalidateChamadaCacheByActivity_(idAtividade, options) {
  var id = String(idAtividade || '').trim();
  if (!id) return;
  options = options || {};
  if (!options.keepActivity) {
    portalCacheRemove_(portalCacheBuildKey_('chamada:atividade', id));
  }
  portalCacheRemove_(portalCacheBuildKey_('chamada:status', id));
  portalCacheRemove_(portalCacheBuildKey_('chamada:presencas', id));
  portalCacheRemove_(portalCacheBuildKey_('chamada:rascunho', id));
  portalCacheRemove_(portalCacheBuildKey_('bundle', ''));
  portalCacheRemove_(portalCacheBuildKey_('detalhes', ''));
  portalCacheRemove_(portalCacheBuildKey_('calendario', ''));
}

function atividadesV2_normalizeChamadaStatus_(status) {
  var normalized = atividades_normalizeTextUpper_(status);
  if (!ATIVIDADES_V2_CHAMADA_STATUS[normalized]) {
    throw atividadesV2_chamadaException_('STATUS_PRESENCA_INVALIDO', 'Status de presenca invalido.');
  }
  return normalized;
}

function atividadesV2_normalizeChamadaStatusForOperacao_(status, operacao) {
  var normalized = atividades_normalizeTextUpper_(status);
  if (!normalized && operacao === ATIVIDADES_V2_CHAMADA_OPERACOES.SALVAR) return '';
  if (!normalized && operacao === ATIVIDADES_V2_CHAMADA_OPERACOES.FINALIZAR) return 'FALTA';
  if (operacao === ATIVIDADES_V2_CHAMADA_OPERACOES.SALVAR && normalized === 'FALTA') {
    throw atividadesV2_chamadaException_(
      'STATUS_PRESENCA_INVALIDO',
      'Falta so pode ser registrada ao finalizar a chamada.'
    );
  }
  return atividadesV2_normalizeChamadaStatus_(normalized);
}

function atividadesV2_statusFromChamadaCode_(code) {
  var normalized = String(code || '').trim().toUpperCase();
  if (normalized === 'P') return 'PRESENTE_PRESENCIAL';
  if (normalized === 'R') return 'PRESENTE_REMOTO';
  if (normalized === 'F') return 'FALTA';
  if (normalized === 'N/A') return 'NAO_SE_APLICA';
  return '';
}

function atividadesV2_normalizeChamadaCode_(code, status) {
  if (!status) return '';
  var expected = ATIVIDADES_V2_CHAMADA_STATUS[status];
  var normalized = String(code || expected || '').trim().toUpperCase();
  if (normalized !== expected) return expected;
  return normalized;
}

function atividadesV2_modalidadeFromStatus_(status) {
  if (status === 'PRESENTE_PRESENCIAL') return 'PRESENCIAL';
  if (status === 'PRESENTE_REMOTO') return 'REMOTA';
  return 'NAO_APLICAVEL';
}

function atividadesV2_chamadaReferenceKey_(tipo, ref) {
  var value = atividadesV2_sanitizeIdToken_(ref || '');
  return value ? atividadesV2_sanitizeIdToken_(tipo || 'PARTICIPANTE') + ':' + value : '';
}

function atividadesV2_chamadaPessoaKey_(tipo, idPessoa) {
  var id = atividadesV2_sanitizeIdToken_(idPessoa || '');
  return id ? atividadesV2_sanitizeIdToken_(tipo || 'PARTICIPANTE') + ':PESSOA:' + id : '';
}

function atividadesV2_chamadaRecordKeys_(record) {
  var tipo = record.TIPO_PARTICIPANTE || record.tipoParticipante || 'PARTICIPANTE';
  return [
    atividadesV2_chamadaPessoaKey_(tipo, record.ID_PESSOA || record.idPessoa),
    atividadesV2_chamadaReferenceKey_(tipo, record.RGA || record.rga),
    atividadesV2_chamadaReferenceKey_(tipo, record.ID_REFERENCIA || record.idReferencia),
    atividadesV2_chamadaReferenceKey_(tipo, record.EMAIL_PARTICIPANTE || record.email),
    atividadesV2_chamadaReferenceKey_(tipo, record.NOME_PARTICIPANTE || record.nome)
  ].filter(function(key, index, arr) {
    return key && arr.indexOf(key) === index;
  });
}

function atividadesV2_findChamadaExistingByPessoa_(existingByRef, tipo, pessoa, raw) {
  var candidates = [
    atividadesV2_chamadaPessoaKey_(tipo, pessoa && pessoa.idPessoa),
    atividadesV2_chamadaReferenceKey_(tipo, raw && (raw.rga || raw.RGA)),
    atividadesV2_chamadaReferenceKey_(tipo, raw && (raw.ID_REFERENCIA || raw.idReferencia)),
    atividadesV2_chamadaReferenceKey_(tipo, raw && (raw.email || raw.EMAIL)),
    atividadesV2_chamadaReferenceKey_(tipo, raw && (raw.nome || raw.NOME || raw.nomeExibicao || raw.NOME_MEMBRO))
  ];
  for (var i = 0; i < candidates.length; i++) {
    if (candidates[i] && existingByRef[candidates[i]]) return existingByRef[candidates[i]];
  }
  return null;
}

function atividadesV2_chamadaException_(errorCode, message) {
  var err = new Error(message || errorCode);
  err.errorCode = errorCode;
  return err;
}

function atividadesV2_chamadaError_(errorCode, message, err, tempoTotalMs) {
  return {
    ok: false,
    errorCode: String(errorCode || 'ERRO_CHAMADA').trim(),
    message: String(message || 'Nao foi possivel processar a chamada.').trim(),
    details: err && err.message ? err.message : '',
    tempoTotalMs: tempoTotalMs || ''
  };
}

function atividadesV2_chamadaPublicErrorMessage_(errorCode) {
  var map = {
    ID_ATIVIDADE_OBRIGATORIO: 'Informe a atividade para chamada.',
    ATIVIDADE_NAO_ENCONTRADA: 'Atividade nao encontrada na base v2 DEV.',
    PERMISSAO_NEGADA: 'Usuario sem permissao para chamada operacional.',
    ATIVIDADE_NAO_PERMITE_CHAMADA: 'Atividade nao permite chamada.',
    CHAMADA_FORA_DA_JANELA: 'Chamada fora da janela operacional configurada.',
    STATUS_PRESENCA_INVALIDO: 'Status de presenca invalido.',
    MEMBRO_NAO_APLICAVEL_NA_DATA: 'Membro nao aplicavel na data da atividade.',
    CHAMADA_INCOMPLETA: 'Marque todos os participantes antes de finalizar a chamada.',
    CHAMADA_FINALIZADA: 'Chamada finalizada. Reabra a chamada antes de alterar registros.',
    LOCK_INDISPONIVEL: 'Nao foi possivel obter lock para salvar a chamada.',
    ERRO_SALVAR_CHAMADA: 'Nao foi possivel salvar a chamada.'
  };
  return map[errorCode] || map.ERRO_SALVAR_CHAMADA;
}

function atividadesV2_chamadaWindowPublicMessage_(motivo) {
  var map = {
    PERMISSAO_NEGADA: 'Usuario sem permissao para chamada operacional.',
    ATIVIDADE_NAO_PERMITE_CHAMADA: 'Atividade nao permite chamada.',
    CHAMADA_FINALIZADA: 'Chamada finalizada. Reabra a chamada antes de alterar registros.',
    CHAMADA_AINDA_NAO_ABERTA: 'A chamada ainda nao esta dentro da janela operacional configurada.',
    JANELA_ENCERRADA: 'A janela operacional da chamada foi encerrada.',
    JANELA_INDISPONIVEL: 'Janela operacional da chamada indisponivel.'
  };
  return map[motivo] || 'Chamada fora da janela operacional configurada.';
}

function atividadesV2_chamadaHasOnlySafeFields_(participant) {
  if (!participant) return true;
  var allowed = [
    'tipoParticipante',
    'idPessoa',
    'rga',
    'nome',
    'instituicao',
    'statusPresenca',
    'codigoPresenca',
    'observacoes',
    'aplicavelNaData',
    'contaPresenca',
    'contaFalta',
    'bloqueado',
    'motivoBloqueio'
  ].sort();
  return Object.keys(participant || {}).sort().join(',') === allowed.join(',');
}
