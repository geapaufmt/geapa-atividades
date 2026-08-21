/**
 * Acoes operacionais de apresentacoes pelo Portal GEAPA na Atividades V2 do ambiente resolvido.
 *
 * Este pacote nao implementa chamada/presenca automatica. As escritas ocorrem
 * apenas nas abas-base da V2 e as views PORTAL_* continuam materializadas.
 */

var ATIVIDADES_V2_APRESENTACOES_TITULO_STATUS = Object.freeze([
  'PENDENTE',
  'ENVIADO',
  'RECEBIDO',
  'EM_ANALISE',
  'AJUSTE_SOLICITADO',
  'APROVADO',
  'REPROVADO'
]);

var ATIVIDADES_V2_APRESENTACOES_MATERIAL_STATUS = Object.freeze([
  'PENDENTE',
  'RECEBIDO',
  'REENVIADO',
  'EM_ANALISE',
  'AJUSTE_SOLICITADO',
  'APROVADO',
  'HISTORICO',
  'DISPENSADO'
]);

function atividadesV2_portalListarEixosTematicos_(contexto) {
  atividades_normalizePortalContext_(contexto);
  var cacheKey = portalCacheBuildKey_('eixos_tematicos', 'ativos');
  var cached = portalCacheGetJson_(cacheKey);
  if (cached) return cached;

  var eixos = atividades_getMapaEixosApresentacoes_().map(function(item) {
    var raw = item.raw || {};
    return {
      codigoEixo: item.codigo || '',
      numeralRomano: item.romano || '',
      nomeOficial: item.nomeOficial || '',
      nomeCurto: item.nomeCurto || '',
      rotuloFormulario: item.canonico || '',
      descricaoResumida: String(raw.DESCRICAO_RESUMIDA || '').trim(),
      palavrasChave: String(raw.PALAVRAS_CHAVE || '').trim(),
      exemplosTemas: String(raw.EXEMPLOS_TEMAS || '').trim()
    };
  });
  var result = {
    ok: true,
    data: { eixos: eixos },
    origem: ATIVIDADES_CFG.STABLE_KEYS.THEMATIC_AXES
  };
  portalCachePutJson_(cacheKey, result, ATIVIDADES_V2_PORTAL_CONFIG_CACHE_TTL_SECONDS);
  return result;
}

function atividadesV2_portalEnviarTituloEixoApresentacao_(payload, contexto) {
  return atividadesV2_portalRunPresentationAction_(
    'APRESENTACAO_TITULO_EIXO_ENVIADO',
    payload,
    contexto,
    function(ss, action) {
      var bundle = atividadesV2_portalResolvePresentationActionBundle_(ss, action.payload);
      atividadesV2_assertPresentationWritePermission_(bundle, action.contexto, 'TITULO_EIXO');
      atividadesV2_assertPresentationNotBlocked_(bundle.apresentacao);

      var privileged = atividades_isPrivilegedPortalProfile_(action.contexto);
      var currentStatus = atividades_normalizeTextUpper_(bundle.apresentacao.STATUS_TITULO_EIXO || bundle.atividade.STATUS_EIXO_TEMATICO);
      if (!privileged && currentStatus === 'APROVADO') {
        throw atividadesV2_portalActionException_('TITULO_EIXO_APROVADO', 'Titulo/eixo ja aprovado. Solicite reabertura para editar.');
      }

      var config = atividadesV2_portalGetActivityConfig_(ss, bundle.atividade);
      var normalized = atividadesV2_validateTituloEixoPayload_(action.payload, config);
      if (currentStatus === 'REPROVADO') {
        atividadesV2_assertNewTitleAxisProposalChanged_(bundle.atividade, normalized);
      }
      var now = new Date();
      var user = atividadesV2_portalActorToken_(action.contexto);
      var status = 'ENVIADO';

      atividadesV2_updateRowByHeaders_(bundle.atividadesSheet, bundle.atividade._rowNumber, {
        TITULO: normalized.titulo,
        TITULO_PUBLICO: normalized.titulo,
        EIXO_TEMATICO_PRINCIPAL: normalized.eixoPrincipal,
        EIXO_TEMATICO_SECUNDARIO: normalized.eixoSecundario,
        STATUS_EIXO_TEMATICO: status,
        ATUALIZADO_POR: user,
        ATUALIZADO_EM: now
      });
      atividadesV2_updateRowByHeaders_(bundle.apresentacoesSheet, bundle.apresentacao._rowNumber, {
        STATUS_TITULO_EIXO: status,
        ATUALIZADO_POR: user,
        ATUALIZADO_EM: now,
        OBSERVACOES: atividadesV2_joinObservacoes_(bundle.apresentacao.OBSERVACOES, atividades_sanitizePortalText_(action.payload.observacoes, 300))
      });

      return {
        idAtividade: bundle.atividade.ID_ATIVIDADE,
        idApresentacao: bundle.apresentacao.ID_APRESENTACAO,
        statusTituloEixo: status,
        tituloPublico: normalized.titulo,
        eixoTematicoPrincipal: normalized.eixoPrincipal,
        eixoTematicoSecundario: normalized.eixoSecundario,
        idPessoa: bundle.apresentacao.ID_PESSOA || bundle.atividade.ID_PESSOA_PRINCIPAL || '',
        email: bundle.apresentacao.EMAIL_MEMBRO || bundle.atividade.EMAIL_PESSOA_PRINCIPAL || '',
        rga: bundle.apresentacao.RGA || bundle.atividade.RGA_PESSOA_PRINCIPAL || ''
      };
    }
  );
}

function atividadesV2_portalRevisarTituloEixoApresentacao_(payload, contexto) {
  return atividadesV2_portalRunPresentationAction_(
    atividadesV2_normalizeDecision_(payload && payload.decisao) === 'APROVAR'
      ? 'APRESENTACAO_TITULO_EIXO_APROVADO'
      : 'APRESENTACAO_TITULO_EIXO_AJUSTE_SOLICITADO',
    payload,
    contexto,
    function(ss, action) {
      if (!atividades_isPrivilegedPortalProfile_(action.contexto)) {
        throw atividadesV2_portalActionException_('PERMISSAO_NEGADA', 'Perfil sem permissao para revisar titulo/eixo.');
      }
      var decision = atividadesV2_normalizeDecision_(action.payload.decisao);
      if (['APROVAR', 'SOLICITAR_AJUSTE'].indexOf(decision) === -1) {
        throw atividadesV2_portalActionException_('DECISAO_INVALIDA', 'Decisao invalida para titulo/eixo.');
      }
      var bundle = atividadesV2_portalResolvePresentationActionBundle_(ss, action.payload);
      var now = new Date();
      var user = atividadesV2_portalActorToken_(action.contexto);
      var status = decision === 'APROVAR' ? 'APROVADO' : 'AJUSTE_SOLICITADO';

      atividadesV2_updateRowByHeaders_(bundle.atividadesSheet, bundle.atividade._rowNumber, {
        STATUS_EIXO_TEMATICO: status,
        ATUALIZADO_POR: user,
        ATUALIZADO_EM: now
      });
      atividadesV2_updateRowByHeaders_(bundle.apresentacoesSheet, bundle.apresentacao._rowNumber, {
        STATUS_TITULO_EIXO: status,
        DATA_CONFIRMACAO_TITULO_EIXO: decision === 'APROVAR' ? now : bundle.apresentacao.DATA_CONFIRMACAO_TITULO_EIXO || '',
        ATUALIZADO_POR: user,
        ATUALIZADO_EM: now,
        OBSERVACOES: atividadesV2_joinObservacoes_(
          bundle.apresentacao.OBSERVACOES,
          atividadesV2_buildReviewObservation_(action.payload)
        )
      });
      if (typeof atividadesV2_syncLatestArquivoStatus_ === 'function') {
        atividadesV2_syncLatestArquivoStatus_(
          ss,
          bundle.atividade.ID_ATIVIDADE,
          bundle.apresentacao.ID_APRESENTACAO,
          ATIVIDADES_V2_TIPO_ARQUIVO_SLIDE_,
          status,
          action.contexto,
          atividadesV2_buildReviewObservation_(action.payload)
        );
      }

      return {
        idAtividade: bundle.atividade.ID_ATIVIDADE,
        idApresentacao: bundle.apresentacao.ID_APRESENTACAO,
        statusTituloEixo: status,
        idPessoa: bundle.apresentacao.ID_PESSOA || bundle.atividade.ID_PESSOA_PRINCIPAL || '',
        email: bundle.apresentacao.EMAIL_MEMBRO || bundle.atividade.EMAIL_PESSOA_PRINCIPAL || '',
        rga: bundle.apresentacao.RGA || bundle.atividade.RGA_PESSOA_PRINCIPAL || ''
      };
    }
  );
}

function atividadesV2_portalEditarEAprovarTituloEixoApresentacao_(payload, contexto) {
  return atividadesV2_portalRunPresentationAction_(
    'APRESENTACAO_TITULO_EIXO_EDITADO_APROVADO',
    payload,
    contexto,
    function(ss, action) {
      if (!atividades_isPrivilegedPortalProfile_(action.contexto)) {
        throw atividadesV2_portalActionException_('PERMISSAO_NEGADA', 'Perfil sem permissao para editar e aprovar titulo/eixo.');
      }
      var bundle = atividadesV2_portalResolvePresentationActionBundle_(ss, action.payload);
      var config = atividadesV2_portalGetActivityConfig_(ss, bundle.atividade);
      var normalized = atividadesV2_validateTituloEixoPayload_(action.payload, config);
      var now = new Date();
      var user = atividadesV2_portalActorToken_(action.contexto);

      atividadesV2_updateRowByHeaders_(bundle.atividadesSheet, bundle.atividade._rowNumber, {
        TITULO: normalized.titulo,
        TITULO_PUBLICO: normalized.titulo,
        EIXO_TEMATICO_PRINCIPAL: normalized.eixoPrincipal,
        EIXO_TEMATICO_SECUNDARIO: normalized.eixoSecundario,
        STATUS_EIXO_TEMATICO: 'APROVADO',
        ATUALIZADO_POR: user,
        ATUALIZADO_EM: now
      });
      atividadesV2_updateRowByHeaders_(bundle.apresentacoesSheet, bundle.apresentacao._rowNumber, {
        STATUS_TITULO_EIXO: 'APROVADO',
        DATA_CONFIRMACAO_TITULO_EIXO: now,
        ATUALIZADO_POR: user,
        ATUALIZADO_EM: now,
        OBSERVACOES: atividadesV2_joinObservacoes_(
          bundle.apresentacao.OBSERVACOES,
          atividadesV2_buildReviewObservation_(action.payload) || 'Titulo/eixo editado e aprovado pela gestao via Portal.'
        )
      });

      return {
        idAtividade: bundle.atividade.ID_ATIVIDADE,
        idApresentacao: bundle.apresentacao.ID_APRESENTACAO,
        statusTituloEixo: 'APROVADO',
        tituloPublico: normalized.titulo,
        eixoTematicoPrincipal: normalized.eixoPrincipal,
        eixoTematicoSecundario: normalized.eixoSecundario,
        idPessoa: bundle.apresentacao.ID_PESSOA || bundle.atividade.ID_PESSOA_PRINCIPAL || '',
        email: bundle.apresentacao.EMAIL_MEMBRO || bundle.atividade.EMAIL_PESSOA_PRINCIPAL || '',
        rga: bundle.apresentacao.RGA || bundle.atividade.RGA_PESSOA_PRINCIPAL || ''
      };
    }
  );
}

function atividadesV2_portalReprovarTituloEixoApresentacao_(payload, contexto) {
  return atividadesV2_portalRunPresentationAction_(
    'APRESENTACAO_TITULO_EIXO_REPROVADO',
    payload,
    contexto,
    function(ss, action) {
      if (!atividades_isPrivilegedPortalProfile_(action.contexto)) {
        throw atividadesV2_portalActionException_('PERMISSAO_NEGADA', 'Perfil sem permissao para reprovar titulo/eixo.');
      }
      var observacao = atividades_sanitizePortalText_(
        action.payload.observacaoObrigatoria || action.payload.observacoes || action.payload.observacaoPublica,
        500
      );
      if (!observacao) {
        throw atividadesV2_portalActionException_('OBSERVACAO_OBRIGATORIA', 'Informe a justificativa da reprovacao do titulo/eixo.');
      }

      var bundle = atividadesV2_portalResolvePresentationActionBundle_(ss, action.payload);
      var now = new Date();
      var user = atividadesV2_portalActorToken_(action.contexto);
      var valoresAnteriores = atividadesV2_getPreviousTitleAxisValues_(bundle.atividade, bundle.apresentacao);
      atividadesV2_updateRowByHeaders_(bundle.atividadesSheet, bundle.atividade._rowNumber, {
        STATUS_EIXO_TEMATICO: 'REPROVADO',
        ATUALIZADO_POR: user,
        ATUALIZADO_EM: now
      });
      atividadesV2_updateRowByHeaders_(bundle.apresentacoesSheet, bundle.apresentacao._rowNumber, {
        STATUS_TITULO_EIXO: 'REPROVADO',
        ATUALIZADO_POR: user,
        ATUALIZADO_EM: now,
        OBSERVACOES: atividadesV2_joinObservacoes_(
          bundle.apresentacao.OBSERVACOES,
          'Titulo/eixo reprovado via Portal: ' + observacao
        )
      });

      return {
        idAtividade: bundle.atividade.ID_ATIVIDADE,
        idApresentacao: bundle.apresentacao.ID_APRESENTACAO,
        statusApresentacao: bundle.apresentacao.STATUS_APRESENTACAO || '',
        statusTituloEixo: 'REPROVADO',
        valoresAnteriores: valoresAnteriores,
        idPessoa: bundle.apresentacao.ID_PESSOA || bundle.atividade.ID_PESSOA_PRINCIPAL || '',
        email: bundle.apresentacao.EMAIL_MEMBRO || bundle.atividade.EMAIL_PESSOA_PRINCIPAL || '',
        rga: bundle.apresentacao.RGA || bundle.atividade.RGA_PESSOA_PRINCIPAL || ''
      };
    }
  );
}

function atividadesV2_portalRevisarMaterialApresentacao_(payload, contexto) {
  return atividadesV2_portalRunPresentationAction_(
    atividadesV2_materialActionTypeFromDecision_(payload && payload.decisao),
    payload,
    contexto,
    function(ss, action) {
      if (!atividades_isPrivilegedPortalProfile_(action.contexto)) {
        throw atividadesV2_portalActionException_('PERMISSAO_NEGADA', 'Perfil sem permissao para revisar material.');
      }
      var decision = atividadesV2_normalizeDecision_(action.payload.decisao);
      var statusByDecision = {
        APROVAR: 'APROVADO',
        SOLICITAR_AJUSTE: 'AJUSTE_SOLICITADO',
        DISPENSAR: 'DISPENSADO'
      };
      var status = statusByDecision[decision];
      if (!status) throw atividadesV2_portalActionException_('DECISAO_INVALIDA', 'Decisao invalida para material.');

      var bundle = atividadesV2_portalResolvePresentationActionBundle_(ss, action.payload);
      var now = new Date();
      var user = atividadesV2_portalActorToken_(action.contexto);
      atividadesV2_updateRowByHeaders_(bundle.apresentacoesSheet, bundle.apresentacao._rowNumber, {
        STATUS_ENVIO_MATERIAL: status,
        RECEBIDO_POR: user,
        ATUALIZADO_POR: user,
        ATUALIZADO_EM: now,
        OBSERVACOES: atividadesV2_joinObservacoes_(
          bundle.apresentacao.OBSERVACOES,
          atividadesV2_buildReviewObservation_(action.payload)
        )
      });

      return {
        idAtividade: bundle.atividade.ID_ATIVIDADE,
        idApresentacao: bundle.apresentacao.ID_APRESENTACAO,
        statusMaterial: status,
        idPessoa: bundle.apresentacao.ID_PESSOA || bundle.atividade.ID_PESSOA_PRINCIPAL || '',
        email: bundle.apresentacao.EMAIL_MEMBRO || bundle.atividade.EMAIL_PESSOA_PRINCIPAL || '',
        rga: bundle.apresentacao.RGA || bundle.atividade.RGA_PESSOA_PRINCIPAL || ''
      };
    }
  );
}

function atividadesV2_portalRegistrarMaterialApresentacao_(payload, contexto) {
  var actionType = payload && payload.reenvio === true
    ? 'APRESENTACAO_MATERIAL_REENVIADO'
    : 'APRESENTACAO_MATERIAL_ENVIADO';
  var result = atividadesV2_portalActionStart_(actionType, payload, contexto);
  var trace = atividadesV2_portalWriteTraceStart_(actionType, payload);
  result.contexto._portalWriteTrace = trace;
  result.contexto._portalWriteAction = result;
  try {
    var materialResult = atividadesV2_registrarMaterialApresentacao_(payload || {}, result.contexto);
    if (materialResult && materialResult._idempotentReplayResponse) {
      return materialResult._idempotentReplayResponse;
    }
    trace.idAtividade = materialResult.idAtividade || trace.idAtividade;
    trace.idApresentacao = materialResult.idApresentacao || trace.idApresentacao;
    var auditWarnings = materialResult._auditWarnings || [];
    delete materialResult._auditWarnings;
    auditWarnings.forEach(function(warning) {
      atividadesV2_portalWriteWarning_(trace, warning.code, warning.message);
    });
    atividadesV2_portalWriteMarkSecondaryPending_(trace);
    atividadesV2_portalWriteAttachResult_(materialResult, trace, 'REGISTRADO');
    return atividadesV2_portalWriteSuccessResponse_(materialResult, {
      userMessage: 'Slide/material registrado com sucesso.',
      entityId: materialResult.idApresentacao || ''
    });
  } catch (err) {
    atividadesV2_portalWriteLogSafe_(atividadesV2_getDatabaseSpreadsheet_(), trace, 'ERRO', err && (err.code || err.errorCode) || 'ERRO_MATERIAL');
    try {
      atividadesV2_portalActionError_(atividadesV2_getDatabaseSpreadsheet_(), result, err);
    } catch (logErr) {}
    return atividadesV2_portalActionErrorResponse_(err);
  }
}

function atividadesV2_portalListarPendenciasApresentacoesDiretoria_(contexto) {
  var ctx = atividades_normalizePortalContext_(contexto);
  if (!atividades_isPrivilegedPortalProfile_(ctx)) {
    return atividadesV2_portalActionErrorResponse_(atividadesV2_portalActionException_('PERMISSAO_NEGADA', 'Perfil sem permissao para consultar pendencias de apresentacoes.'));
  }
  var cacheKey = portalCacheBuildKey_('pendencias_apresentacoes', 'gestao');
  var cached = portalCacheGetJson_(cacheKey);
  if (cached) return cached;

  var result = atividadesV2_portalGetPendenciasDiretoria_(ctx);
  if (!result.ok) return result;
  var pendencias = (result.data && result.data.pendencias || []).filter(function(item) {
    return atividadesV2_isPresentationPendingType_(item.tipo || item.tipoPendencia);
  });
  var cards = atividadesV2_groupPresentationPendenciesForPortal_(pendencias);
  var response = {
    ok: true,
    data: {
      resumo: { total: cards.length, totalPendenciasInternas: pendencias.length },
      pendencias: cards
    }
  };
  portalCachePutJson_(cacheKey, response, ATIVIDADES_V2_PORTAL_PENDENCIAS_CACHE_TTL_SECONDS);
  return response;
}

function atividadesV2_atualizarStatusRealizacaoApresentacoesDev_(options) {
  options = options || {};
  var dryRun = options.dryRun !== false;
  var atualizarViews = options.atualizarViews === true;
  var report = {
    ok: true,
    dryRun: dryRun,
    candidatos: [],
    idsAtualizados: [],
    totalCandidatos: 0,
    totalAtualizados: 0,
    avisos: [],
    erros: []
  };

  var lock = null;
  if (!dryRun) {
    lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) throw new Error('LOCK_INDISPONIVEL: nao foi possivel atualizar status de realizacao agora.');
  }

  try {
    var ss = atividadesV2_getDatabaseSpreadsheet_({ ambiente: 'DEV' });
    var atividadesSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES);
    var apresentacoesSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.APRESENTACOES);
    atividadesV2_applyHeadersIfMissing_(atividadesSheet, ATIVIDADES_V2_SCHEMA.ATIVIDADES);
    atividadesV2_applyHeadersIfMissing_(apresentacoesSheet, ATIVIDADES_V2_SCHEMA.APRESENTACOES);

    var atividades = atividadesV2_readSheetObjects_(atividadesSheet);
    var atividadesById = atividadesV2_indexByField_(atividades, 'ID_ATIVIDADE');
    var apresentacoes = atividadesV2_readSheetObjects_(apresentacoesSheet);
    var arquivosIndex = typeof atividadesV2_indexLatestArquivos_ === 'function'
      ? atividadesV2_indexLatestArquivos_(atividadesV2_readArquivosAtividadeOptional_(ss))
      : {};
    var configs = atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.CONFIG));
    var now = options.now ? atividades_parseDateOrNull_(options.now) || new Date() : new Date();
    var user = atividadesV2_safeUserToken_(options.atualizadoPor || 'SISTEMA_ATIVIDADES_V2');

    apresentacoes.forEach(function(apresentacao) {
      var activity = atividadesById[String(apresentacao.ID_ATIVIDADE || '').trim()] || {};
      var photo = typeof atividadesV2_getLatestArquivoFromIndex_ === 'function'
        ? atividadesV2_getLatestArquivoFromIndex_(arquivosIndex, activity.ID_ATIVIDADE, apresentacao.ID_APRESENTACAO, ATIVIDADES_V2_TIPO_ARQUIVO_FOTO_)
        : null;
      var config = typeof atividadesV2_findConfigForActivityFromRows_ === 'function'
        ? atividadesV2_findConfigForActivityFromRows_(configs, activity)
        : {};
      var evaluation = atividadesV2_evaluateRealizacaoPresentationCandidate_(atividadesById, apresentacao, options, now, photo, config);
      if (!evaluation.candidate) {
        if (evaluation.aviso) report.avisos.push(evaluation.aviso);
        return;
      }
      report.candidatos.push(evaluation.item);
      if (dryRun) return;

      try {
        atividadesV2_updateRowByHeaders_(atividadesSheet, evaluation.atividade._rowNumber, {
          STATUS_OPERACIONAL: 'REALIZADA',
          ATUALIZADO_POR: user,
          ATUALIZADO_EM: now
        });
        atividadesV2_updateRowByHeaders_(apresentacoesSheet, apresentacao._rowNumber, {
          STATUS_APRESENTACAO: 'REALIZADA',
          ATUALIZADO_POR: user,
          ATUALIZADO_EM: now
        });
        atividadesV2_appendV2Log_(ss, {
          FLUXO: 'APRESENTACOES_V2',
          ACAO: 'APRESENTACAO_MARCADA_REALIZADA',
          NIVEL: 'INFO',
          STATUS: 'OK',
          ID_ATIVIDADE: evaluation.item.idAtividade,
          ID_ENTIDADE: evaluation.item.idApresentacao,
          TIPO_ENTIDADE: 'APRESENTACAO',
          MENSAGEM: 'Apresentacao V2 marcada como REALIZADA por rotina controlada.',
          DETALHES_JSON: atividadesV2_safeLogData_(evaluation.item)
        });
        report.totalAtualizados++;
        report.idsAtualizados.push(evaluation.item.idAtividade);
      } catch (err) {
        report.erros.push({
          idAtividade: evaluation.item.idAtividade,
          idApresentacao: evaluation.item.idApresentacao,
          erro: atividadesV2_errorMessage_(err)
        });
      }
    });

    report.totalCandidatos = report.candidatos.length;
    if (!dryRun && atualizarViews) {
      report.atualizacaoViews = atividadesV2_atualizarViewsPortal_({ dryRun: false, stopOnError: false });
      atividadesV2_invalidatePresentationPortalCaches_({}, {});
      if (typeof atividadesV2_firestoreSyncCalendarioPorAtividadeSafe_ === 'function') {
        report.firestoreSync = atividadesV2_firestoreUniqueStrings_(report.idsAtualizados).map(function(idAtividade) {
          return atividadesV2_firestoreSyncCalendarioPorAtividadeSafe_(idAtividade, {
            reason: 'APRESENTACAO_STATUS_REALIZADA_AUTOMATICO'
          });
        });
      }
    }
    return report;
  } finally {
    if (lock) lock.releaseLock();
  }
}

function atividadesV2_evaluateRealizacaoPresentationCandidate_(atividadesById, apresentacao, options, now, fotoReuniao, config) {
  var idAtividade = String(apresentacao.ID_ATIVIDADE || '').trim();
  var idApresentacao = String(apresentacao.ID_APRESENTACAO || '').trim();
  if (options.idAtividade && String(options.idAtividade).trim() !== idAtividade) return { candidate: false };
  if (options.idApresentacao && String(options.idApresentacao).trim() !== idApresentacao) return { candidate: false };

  var atividade = atividadesById[idAtividade];
  if (!atividade) return { candidate: false, aviso: 'Apresentacao sem atividade vinculada: ' + (idApresentacao || apresentacao._rowNumber) };
  if (atividades_normalizeTextUpper_(atividade.ATIVO || 'SIM') === 'NAO') return { candidate: false };
  if (atividades_normalizeTextUpper_(apresentacao.ATIVO || 'SIM') === 'NAO') return { candidate: false };
  if (atividadesV2_isBlockedOrCancelledForRealization_(atividade, apresentacao)) return { candidate: false };

  var subtipo = atividades_normalizeTextUpper_(atividade.SUBTIPO_ATIVIDADE || atividade.TIPO_ATIVIDADE);
  if (subtipo !== 'APRESENTACAO_MEMBRO') return { candidate: false };

  var statusOperacional = atividades_normalizeTextUpper_(atividade.STATUS_OPERACIONAL || 'PLANEJADA');
  var statusApresentacao = atividades_normalizeTextUpper_(apresentacao.STATUS_APRESENTACAO || 'PLANEJADA');
  if (statusOperacional === 'REALIZADA' && statusApresentacao === 'REALIZADA') return { candidate: false };
  if (['PLANEJADA', 'PUBLICADA', 'AGENDADA', 'ENVIADA', 'RASCUNHO'].indexOf(statusOperacional || 'PLANEJADA') === -1) return { candidate: false };

  var endDateTime = atividadesV2_buildActivityEndDateTimeForRealization_(atividade);
  if (!endDateTime) return { candidate: false, aviso: 'Atividade sem data valida para realizacao: ' + idAtividade };
  if (endDateTime.getTime() > now.getTime()) return { candidate: false };

  var titleStatus = atividades_normalizeTextUpper_(apresentacao.STATUS_TITULO_EIXO || atividade.STATUS_EIXO_TEMATICO);
  if (['APROVADO', 'RECEBIDO', 'HISTORICO'].indexOf(titleStatus) === -1) return { candidate: false };

  var materialStatus = atividades_normalizeTextUpper_(apresentacao.STATUS_ENVIO_MATERIAL || '');
  if (['RECEBIDO', 'APROVADO', 'HISTORICO', 'DISPENSADO'].indexOf(materialStatus) === -1) return { candidate: false };

  var photoRules = typeof atividadesV2_resolveFotoReuniaoRules_ === 'function'
    ? atividadesV2_resolveFotoReuniaoRules_(atividade, config || {})
    : { exigeFoto: true };
  var photoStatus = atividades_normalizeTextUpper_(fotoReuniao && fotoReuniao.STATUS_ARQUIVO);
  if (photoRules.exigeFoto && ['RECEBIDO', 'APROVADO', 'HISTORICO', 'DISPENSADO'].indexOf(photoStatus) === -1) {
    return { candidate: false };
  }

  return {
    candidate: true,
    atividade: atividade,
    item: {
      idAtividade: idAtividade,
      idApresentacao: idApresentacao,
      statusOperacionalAntes: statusOperacional,
      statusApresentacaoAntes: statusApresentacao,
      statusOperacionalDepois: 'REALIZADA',
      statusApresentacaoDepois: 'REALIZADA',
      statusFotoReuniao: photoStatus || 'NAO_SE_APLICA',
      motivo: 'Data/horario ja passou e titulo/eixos, slide/material e foto da reuniao estao resolvidos.'
    }
  };
}

function atividadesV2_isBlockedOrCancelledForRealization_(atividade, apresentacao) {
  var statusOperacional = atividades_normalizeTextUpper_(atividade.STATUS_OPERACIONAL);
  var statusPublicacao = atividades_normalizeTextUpper_(atividade.STATUS_PUBLICACAO_PORTAL);
  var statusApresentacao = atividades_normalizeTextUpper_(apresentacao.STATUS_APRESENTACAO);
  if (['CANCELADA', 'CANCELADO', 'SUSPENSA', 'SUSPENSO', 'ARQUIVADA', 'ARQUIVADO'].indexOf(statusOperacional) >= 0) return true;
  if (['CANCELADA', 'CANCELADO', 'SUSPENSA', 'SUSPENSO'].indexOf(statusPublicacao) >= 0) return true;
  if (['CANCELADA', 'CANCELADO', 'SUSPENSA', 'SUSPENSO'].indexOf(statusApresentacao) >= 0) return true;
  return atividades_isTruthySim_(atividade.BLOQUEADO_PARA_EDICAO) ||
    atividades_isTruthySim_(apresentacao.BLOQUEADO_PARA_EDICAO);
}

function atividadesV2_buildActivityEndDateTimeForRealization_(atividade) {
  var date = atividades_parseDateOrNull_(atividade && atividade.DATA_ATIVIDADE);
  if (!date) return null;
  var minutes = atividades_parseTimeValueToMinutes_(atividade && atividade.HORARIO_FIM);
  if (minutes === null || minutes === undefined) minutes = 23 * 60 + 59;
  var out = new Date(date.getTime());
  out.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return out;
}

function atividadesV2_groupPresentationPendenciesForPortal_(pendencias) {
  var byPresentation = {};
  (pendencias || []).forEach(function(item) {
    var id = String(item.idApresentacao || item.ID_APRESENTACAO || '').trim() ||
      String(item.idAtividade || item.ID_ATIVIDADE || '').trim() ||
      String(item.idPendencia || item.ID_PENDENCIA || '').trim();
    if (!byPresentation[id]) byPresentation[id] = atividadesV2_createPresentationPendencyCard_(item);
    atividadesV2_mergePresentationPendencyIntoCard_(byPresentation[id], item);
  });

  return Object.keys(byPresentation).map(function(key) {
    var card = byPresentation[key];
    card.tipoPendencia = card.tiposPendencia.join('|');
    return atividadesV2_finalizePresentationPendencyCard_(card);
  }).sort(function(a, b) {
    var da = atividades_parseDateOrNull_(a.dataAtividade);
    var db = atividades_parseDateOrNull_(b.dataAtividade);
    var ta = da ? da.getTime() : Number.MAX_SAFE_INTEGER;
    var tb = db ? db.getTime() : Number.MAX_SAFE_INTEGER;
    if (ta !== tb) return ta - tb;
    return String(a.idApresentacao || '').localeCompare(String(b.idApresentacao || ''));
  });
}

function atividadesV2_createPresentationPendencyCard_(item) {
  return {
    idPendencia: String(item.idPendencia || '').trim(),
    tipo: 'APRESENTACAO_COM_PENDENCIAS',
    tipoPendencia: 'APRESENTACAO_COM_PENDENCIAS',
    tiposPendencia: [],
    gravidade: String(item.gravidade || item.severidade || 'MEDIA').trim() || 'MEDIA',
    idAtividade: String(item.idAtividade || '').trim(),
    idApresentacao: String(item.idApresentacao || '').trim(),
    dataAtividade: item.dataAtividade || '',
    rotuloSemestre: String(item.rotuloSemestre || '').trim(),
    titulo: item.tituloApresentacao || item.titulo || item.tituloAtividade || '',
    tituloAtividade: item.tituloAtividade || '',
    tituloApresentacao: item.tituloApresentacao || item.titulo || '',
    tituloExibicao: '',
    atividadeRotulo: '',
    nomeApresentador: item.nomeApresentador || item.responsavelSugerido || item.responsavel || '',
    eixoTematicoPrincipal: item.eixoTematicoPrincipal || '',
    eixoTematicoSecundario: item.eixoTematicoSecundario || '',
    eixosResumo: '',
    statusApresentacao: item.statusApresentacao || '',
    statusTituloEixo: item.statusTituloEixo || '',
    statusMaterial: item.statusMaterial || '',
    statusFotoReuniao: item.statusFotoReuniao || '',
    statusTituloEixoRotulo: '',
    statusMaterialRotulo: '',
    nomeArquivoMaterial: item.nomeArquivoMaterial || '',
    linkMaterialPublico: item.linkMaterialPublico || '',
    nomeArquivoFotoReuniao: item.nomeArquivoFotoReuniao || '',
    linkFotoReuniao: item.linkFotoReuniao || '',
    prazo: item.prazo || '',
    diasEmAberto: item.diasEmAberto || '',
    dataFormatada: '',
    dataRotulo: '',
    badges: [],
    badgesRotulos: [],
    pendenciasResumo: [],
    acoesDisponiveis: [],
    detalhesTecnicos: [],
    mostrarDetalhesTecnicos: false,
    pendenciasInternas: [],
    blocoTituloEixos: {
      status: item.statusTituloEixo || '',
      acoesGestao: atividadesV2_emptyTitleManagementActions_()
    },
    blocoMaterial: {
      status: item.statusMaterial || '',
      nomeArquivoMaterial: item.nomeArquivoMaterial || '',
      linkMaterialPublico: item.linkMaterialPublico || '',
      acoesGestao: atividadesV2_emptyMaterialManagementActions_()
    },
    blocoFotoReuniao: {
      status: item.statusFotoReuniao || '',
      nomeArquivo: item.nomeArquivoFotoReuniao || '',
      linkArquivo: item.linkFotoReuniao || '',
      acoesGestao: atividadesV2_emptyFotoManagementActions_()
    },
    acoesGestao: {
      podeAprovarTituloEixo: false,
      podeEditarEAprovarTituloEixo: false,
      podeSolicitarAjusteTituloEixo: false,
      podeReprovarTituloEixo: false,
      podeAprovarMaterial: false,
      podeSolicitarAjusteMaterial: false,
      podeDispensarMaterial: false,
      podeEnviarFotoReuniao: false,
      podeAprovarFotoReuniao: false,
      podeSolicitarAjusteFotoReuniao: false,
      podeDispensarFotoReuniao: false
    }
  };
}

function atividadesV2_mergePresentationPendencyIntoCard_(card, item) {
  var tipo = String(item.tipoPendencia || item.tipo || '').trim();
  if (tipo && card.tiposPendencia.indexOf(tipo) === -1) card.tiposPendencia.push(tipo);
  card.idPendencia = card.idPendencia || String(item.idPendencia || '').trim();
  card.gravidade = atividadesV2_highestPendencySeverity_(card.gravidade, item.gravidade || item.severidade);
  card.pendenciasInternas.push(item);

  var actions = item.acoesGestao || {};
  if (tipo.indexOf('TITULO_EIXO_') === 0 || tipo === 'APRESENTACAO_SEM_APRESENTADOR') {
    card.blocoTituloEixos.acoesGestao = atividadesV2_mergeActions_(card.blocoTituloEixos.acoesGestao, actions);
  }
  if (tipo.indexOf('MATERIAL_') === 0) {
    card.blocoMaterial.acoesGestao = atividadesV2_mergeActions_(card.blocoMaterial.acoesGestao, actions);
  }
  if (tipo.indexOf('FOTO_REUNIAO_') === 0) {
    card.statusFotoReuniao = item.statusFotoReuniao || card.statusFotoReuniao;
    card.nomeArquivoFotoReuniao = item.nomeArquivoFotoReuniao || card.nomeArquivoFotoReuniao;
    card.linkFotoReuniao = item.linkFotoReuniao || card.linkFotoReuniao;
    card.blocoFotoReuniao.acoesGestao = atividadesV2_mergeActions_(card.blocoFotoReuniao.acoesGestao, actions);
  }
  card.acoesGestao = atividadesV2_mergeActions_(card.acoesGestao, actions);
  card.acoesGestao.podeEditarEAprovarTituloEixo = card.blocoTituloEixos.acoesGestao.podeEditarEAprovarTituloEixo;
  card.acoesGestao.podeReprovarTituloEixo = card.blocoTituloEixos.acoesGestao.podeReprovarTituloEixo;
}

function atividadesV2_finalizePresentationPendencyCard_(card) {
  card.dataFormatada = atividadesV2_formatPortalDateBr_(card.dataAtividade);
  card.rotuloSemestre = atividadesV2_normalizePortalSemesterLabel_(card.rotuloSemestre, card.dataAtividade, card.idAtividade);
  card.dataRotulo = [card.dataFormatada, card.rotuloSemestre].filter(function(part) { return !!part; }).join(' - ');

  card.atividadeRotulo = atividadesV2_cleanPortalDisplayText_(card.tituloAtividade || 'Apresentacao de Membro', 240) || 'Apresentacao de Membro';
  card.tituloExibicao = atividadesV2_resolvePresentationTitleForCard_(card.tituloApresentacao || card.titulo);
  card.titulo = card.tituloExibicao;
  card.eixosResumo = atividadesV2_buildPresentationAxesSummary_(card.eixoTematicoPrincipal, card.eixoTematicoSecundario);
  card.statusTituloEixoRotulo = atividadesV2_prettyStatusLabel_(card.statusTituloEixo || 'PENDENTE');
  card.statusMaterialRotulo = atividadesV2_prettyStatusLabel_(card.statusMaterial || 'PENDENTE');
  card.statusFotoReuniaoRotulo = atividadesV2_prettyStatusLabel_(card.statusFotoReuniao || 'PENDENTE');
  card.badges = atividadesV2_buildPresentationPendencyBadges_(card);
  card.badgesRotulos = card.badges.map(function(badge) { return badge.label; });
  card.pendenciasResumo = atividadesV2_buildPresentationPendencySummary_(card);
  card.acoesDisponiveis = atividadesV2_buildPresentationAvailableActions_(card.acoesGestao);
  card.detalhesTecnicos = atividadesV2_buildPresentationTechnicalDetails_(card);
  card.descricaoPendencia = card.pendenciasResumo.join(' ');
  return card;
}

function atividadesV2_buildPresentationPendencyBadges_(card) {
  var badges = [];
  if (card.gravidade) {
    badges.push({
      id: 'gravidade',
      label: atividadesV2_prettyStatusLabel_(card.gravidade),
      nivel: atividades_normalizeTextUpper_(card.gravidade || 'MEDIA')
    });
  }
  card.tiposPendencia.forEach(function(tipo) {
    var badge = atividadesV2_pendencyTypeBadge_(tipo);
    if (badge) badges.push(badge);
  });
  return badges;
}

function atividadesV2_pendencyTypeBadge_(tipo) {
  var normalized = atividades_normalizeTextUpper_(tipo);
  var labels = {
    APRESENTACAO_SEM_APRESENTADOR: 'SEM APRESENTADOR',
    APRESENTACAO_SEM_ATIVIDADE: 'SEM ATIVIDADE',
    TITULO_EIXO_PENDENTE: 'TITULO/EIXOS PENDENTE',
    TITULO_EIXO_AGUARDANDO_ANALISE: 'TITULO/EIXOS AGUARDANDO ANALISE',
    TITULO_EIXO_AJUSTE_SOLICITADO: 'TITULO/EIXOS COM AJUSTE SOLICITADO',
    MATERIAL_PENDENTE: 'MATERIAL PENDENTE',
    MATERIAL_AGUARDANDO_ANALISE: 'MATERIAL AGUARDANDO ANALISE',
    MATERIAL_AJUSTE_SOLICITADO: 'MATERIAL COM AJUSTE SOLICITADO',
    FOTO_REUNIAO_PENDENTE: 'FOTO DA REUNIAO PENDENTE',
    FOTO_REUNIAO_AGUARDANDO_ANALISE: 'FOTO AGUARDANDO ANALISE',
    FOTO_REUNIAO_AJUSTE_SOLICITADO: 'FOTO COM AJUSTE SOLICITADO'
  };
  if (!labels[normalized]) return null;
  return { id: normalized, label: labels[normalized], nivel: atividadesV2_pendencyTypeLevel_(normalized) };
}

function atividadesV2_pendencyTypeLevel_(tipo) {
  if (tipo === 'APRESENTACAO_SEM_ATIVIDADE' || tipo === 'APRESENTACAO_SEM_APRESENTADOR') return 'ALTA';
  if (tipo.indexOf('AJUSTE_SOLICITADO') >= 0) return 'BAIXA';
  return 'MEDIA';
}

function atividadesV2_buildPresentationPendencySummary_(card) {
  var messagesByType = {
    APRESENTACAO_SEM_APRESENTADOR: 'Informar apresentador da apresentacao.',
    APRESENTACAO_SEM_ATIVIDADE: 'Vincular apresentacao a uma atividade v2.',
    TITULO_EIXO_PENDENTE: 'Aguardando envio do titulo/eixos pelo apresentador.',
    TITULO_EIXO_AGUARDANDO_ANALISE: 'Revisar titulo/eixos enviados.',
    TITULO_EIXO_AJUSTE_SOLICITADO: 'Aguardando ajuste do titulo/eixos pelo apresentador.',
    MATERIAL_PENDENTE: 'Slide/material ainda nao enviado.',
    MATERIAL_AGUARDANDO_ANALISE: 'Revisar slide/material enviado.',
    MATERIAL_AJUSTE_SOLICITADO: 'Aguardando reenvio do slide/material ajustado.',
    FOTO_REUNIAO_PENDENTE: 'Foto da reuniao ainda nao enviada.',
    FOTO_REUNIAO_AGUARDANDO_ANALISE: 'Revisar foto da reuniao enviada.',
    FOTO_REUNIAO_AJUSTE_SOLICITADO: 'Aguardando nova foto da reuniao.'
  };
  var out = [];
  card.tiposPendencia.forEach(function(tipo) {
    var message = messagesByType[atividades_normalizeTextUpper_(tipo)];
    if (message && out.indexOf(message) === -1) out.push(message);
  });
  return out;
}

function atividadesV2_buildPresentationAvailableActions_(actions) {
  var definitions = [
    ['podeAprovarTituloEixo', 'aprovarTituloEixo', 'Aprovar titulo/eixos'],
    ['podeEditarEAprovarTituloEixo', 'editarEAprovarTituloEixo', 'Editar e aprovar'],
    ['podeSolicitarAjusteTituloEixo', 'solicitarAjusteTituloEixo', 'Solicitar ajuste'],
    ['podeReprovarTituloEixo', 'reprovarTituloEixo', 'Rejeitar proposta de tema'],
    ['podeAprovarMaterial', 'aprovarMaterial', 'Aprovar material'],
    ['podeSolicitarAjusteMaterial', 'solicitarAjusteMaterial', 'Solicitar ajuste de material'],
    ['podeDispensarMaterial', 'dispensarMaterial', 'Dispensar material'],
    ['podeEnviarFotoReuniao', 'enviarFotoReuniao', 'Enviar foto da reuniao'],
    ['podeAprovarFotoReuniao', 'aprovarFotoReuniao', 'Aprovar foto da reuniao'],
    ['podeSolicitarAjusteFotoReuniao', 'solicitarAjusteFotoReuniao', 'Solicitar ajuste da foto'],
    ['podeDispensarFotoReuniao', 'dispensarFotoReuniao', 'Dispensar foto da reuniao']
  ];
  return definitions.filter(function(def) {
    return actions && actions[def[0]] === true;
  }).map(function(def) {
    return { id: def[1], label: def[2], flag: def[0] };
  });
}

function atividadesV2_buildPresentationTechnicalDetails_(card) {
  return card.pendenciasInternas.map(function(item) {
    return {
      idPendencia: String(item.idPendencia || '').trim(),
      tipoPendencia: String(item.tipoPendencia || item.tipo || '').trim(),
      descricaoPendencia: String(item.descricaoPendencia || item.descricaoPublica || '').trim(),
      acaoRecomendada: String(item.acaoRecomendada || '').trim(),
      statusTituloEixo: String(item.statusTituloEixo || card.statusTituloEixo || '').trim(),
      statusMaterial: String(item.statusMaterial || card.statusMaterial || '').trim(),
      statusFotoReuniao: String(item.statusFotoReuniao || card.statusFotoReuniao || '').trim()
    };
  });
}

function atividadesV2_resolvePresentationTitleForCard_(title) {
  var cleaned = atividadesV2_cleanPortalDisplayText_(title, 240);
  if (!cleaned || atividadesV2_isGenericPresentationTitle_(cleaned)) return 'Titulo ainda nao informado';
  return cleaned;
}

function atividadesV2_isGenericPresentationTitle_(title) {
  var normalized = atividades_normalizeTextUpper_(title);
  return [
    'APRESENTACAO DE MEMBRO',
    'APRESENTACAO',
    'TITULO AINDA NAO INFORMADO'
  ].indexOf(normalized) >= 0;
}

function atividadesV2_buildPresentationAxesSummary_(mainAxis, secondaryAxis) {
  var parts = [
    atividadesV2_cleanPortalDisplayText_(mainAxis, 240),
    atividadesV2_cleanPortalDisplayText_(secondaryAxis, 240)
  ].filter(function(part) { return !!part; });
  return parts.length ? parts.join(' / ') : 'Eixos ainda nao informados';
}

function atividadesV2_formatPortalDateBr_(value) {
  var date = atividades_parseDateOrNull_(value);
  if (!date) return '';
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd/MM/yyyy');
}

function atividadesV2_normalizePortalSemesterLabel_(label, dateValue, idAtividade) {
  var raw = String(label || '').trim();
  if (/^\d{4}\/[12]$/.test(raw)) return raw;
  var fromId = String(idAtividade || '').trim().match(/^ATV-(\d{4})-([12])-\d{4}$/);
  if (fromId) return fromId[1] + '/' + fromId[2];
  var date = atividades_parseDateOrNull_(dateValue);
  if (!date) return '';
  var month = date.getMonth() + 1;
  return date.getFullYear() + '/' + (month <= 6 ? '1' : '2');
}

function atividadesV2_prettyStatusLabel_(value) {
  return String(value || '').trim().replace(/_/g, ' ');
}

function atividadesV2_cleanPortalDisplayText_(value, maxLength) {
  var text = String(value || '').trim();
  if (!text) return '';
  return text.slice(0, maxLength || 240);
}

function atividadesV2_invalidatePresentationPortalCaches_(contexto, result) {
  portalCacheRemove_(portalCacheBuildKey_('pendencias_apresentacoes', 'gestao'));
  portalCacheRemove_(portalCacheBuildKey_('eixos_tematicos', 'ativos'));
  ['calendario', 'detalhes', 'bundle'].forEach(function(scope) {
    portalCacheRemove_(portalCacheBuildKey_(scope, ''));
  });

  var contexts = [contexto || {}];
  if (result && (result.idPessoa || result.email || result.rga)) {
    contexts.push({
      perfil: 'MEMBRO',
      idPessoa: result.idPessoa || '',
      email: result.email || '',
      rga: result.rga || '',
      somenteVisiveis: true
    });
  }

  contexts.forEach(function(ctx) {
    var normalized = atividades_normalizePortalContext_(ctx || {});
    var token = portalCacheContextToken_(normalized);
    portalCacheRemove_(portalCacheBuildKey_('minhas_apresentacoes', token));
    portalCacheRemove_(portalCacheBuildKey_('calendario', token));
    portalCacheRemove_(portalCacheBuildKey_('detalhes', token));
    portalCacheRemove_(portalCacheBuildKey_('bundle', token));
    if (result && result.idAtividade) {
      portalCacheRemove_(portalCacheBuildKey_('atividade:detalhes', String(result.idAtividade || '').trim() + ':' + token));
    }
  });
}

function atividadesV2_emptyTitleManagementActions_() {
  return {
    podeAprovarTituloEixo: false,
    podeEditarEAprovarTituloEixo: false,
    podeSolicitarAjusteTituloEixo: false,
    podeReprovarTituloEixo: false
  };
}

function atividadesV2_emptyMaterialManagementActions_() {
  return {
    podeAprovarMaterial: false,
    podeSolicitarAjusteMaterial: false,
    podeDispensarMaterial: false
  };
}

function atividadesV2_emptyFotoManagementActions_() {
  return {
    podeEnviarFotoReuniao: false,
    podeAprovarFotoReuniao: false,
    podeSolicitarAjusteFotoReuniao: false,
    podeDispensarFotoReuniao: false
  };
}

function atividadesV2_mergeActions_(base, next) {
  var out = Object.assign({}, base || {});
  Object.keys(next || {}).forEach(function(key) {
    out[key] = out[key] === true || next[key] === true;
  });
  return out;
}

function atividadesV2_highestPendencySeverity_(current, next) {
  var order = { BAIXA: 1, MEDIA: 2, ALTA: 3, CRITICA: 4 };
  var a = atividades_normalizeTextUpper_(current || 'MEDIA');
  var b = atividades_normalizeTextUpper_(next || '');
  return (order[b] || 0) > (order[a] || 0) ? b : a;
}

function atividadesV2_isPresentationPendingType_(tipo) {
  return [
    'APRESENTACAO_SEM_APRESENTADOR',
    'APRESENTACAO_SEM_ATIVIDADE',
    'TITULO_EIXO_PENDENTE',
    'TITULO_EIXO_AGUARDANDO_ANALISE',
    'TITULO_EIXO_AJUSTE_SOLICITADO',
    'MATERIAL_PENDENTE',
    'MATERIAL_AGUARDANDO_ANALISE',
    'MATERIAL_AJUSTE_SOLICITADO',
    'FOTO_REUNIAO_PENDENTE',
    'FOTO_REUNIAO_AGUARDANDO_ANALISE',
    'FOTO_REUNIAO_AJUSTE_SOLICITADO'
  ].indexOf(atividades_normalizeTextUpper_(tipo)) >= 0;
}

function atividadesV2_diagnosticarFluxoApresentacoesPortalDev_() {
  var ss = atividadesV2_getDatabaseSpreadsheet_({ ambiente: 'DEV' });
  var data = atividadesV2_readPortalViewsSourceData_(ss);
  var atividadesById = atividadesV2_indexByField_(data.atividades, 'ID_ATIVIDADE');
  var stats = {
    atividades: data.atividades.length,
    apresentacoes: data.apresentacoes.length,
    apresentacoesAtivas: 0,
    semAtividade: 0,
    semApresentador: 0,
    tituloEixoPendentes: 0,
    materiaisPendentes: 0,
    historicasComMaterial: 0,
    historicasComAcaoMembroIndevida: 0
  };
  var avisos = [];
  data.apresentacoes.forEach(function(apresentacao) {
    if (atividades_normalizeTextUpper_(apresentacao.ATIVO || 'SIM') === 'NAO') return;
    stats.apresentacoesAtivas++;
    var atividade = atividadesById[String(apresentacao.ID_ATIVIDADE || '').trim()];
    if (!atividade) {
      stats.semAtividade++;
      avisos.push('Apresentacao sem atividade: ' + (apresentacao.ID_APRESENTACAO || apresentacao._rowNumber));
      return;
    }
    if (!atividadesV2_presentationHasPresenter_(atividade, apresentacao)) stats.semApresentador++;
    if (!String(atividade.TITULO_PUBLICO || atividade.TITULO || '').trim() || !String(atividade.EIXO_TEMATICO_PRINCIPAL || '').trim()) stats.tituloEixoPendentes++;
    if (!String(apresentacao.ID_ARQUIVO_MATERIAL || apresentacao.LINK_MATERIAL_APRESENTACAO || '').trim()) stats.materiaisPendentes++;
    var statusApresentacao = atividades_normalizeTextUpper_(apresentacao.STATUS_APRESENTACAO);
    var statusMaterial = atividades_normalizeTextUpper_(apresentacao.STATUS_ENVIO_MATERIAL);
    if (statusApresentacao === 'REALIZADA' && ['RECEBIDO', 'HISTORICO', 'APROVADO'].indexOf(statusMaterial) >= 0) {
      stats.historicasComMaterial++;
      var flags = atividadesV2_portalPresentationActionFlags_({
        statusApresentacao: statusApresentacao,
        statusTituloEixo: apresentacao.STATUS_TITULO_EIXO || atividade.STATUS_EIXO_TEMATICO,
        statusMaterial: statusMaterial,
        idArquivoMaterial: apresentacao.ID_ARQUIVO_MATERIAL,
        linkMaterialPublico: apresentacao.LINK_MATERIAL_APRESENTACAO
      }, { perfil: 'ADMIN_TECNICO' });
      if (flags.acoesMembro.podeEditarTituloEixo || flags.acoesMembro.podeEnviarMaterial || flags.acoesMembro.podeReenviarMaterial) {
        stats.historicasComAcaoMembroIndevida++;
      }
    }
  });
  return { ok: true, modo: atividadesV2_resolveEnvironment_({}), stats: stats, avisos: avisos };
}

function atividadesV2_runTestePortalApresentacoesAcoesDev_() {
  var diagnostico = atividadesV2_diagnosticarFluxoApresentacoesPortalDev_();
  var eixos = atividadesV2_portalListarEixosTematicos_({ perfil: 'MEMBRO' });
  var pendencias = atividadesV2_atualizarPendenciasDiretoria_({ dryRun: true });
  var entregaveis = typeof atividadesV2_runTesteEntregaveisApresentacaoDev_ === 'function'
    ? atividadesV2_runTesteEntregaveisApresentacaoDev_()
    : { ok: false, aviso: 'Teste de entregaveis indisponivel.' };
  return {
    ok: !!(diagnostico.ok && eixos.ok && pendencias.ok && entregaveis.ok),
    diagnostico: diagnostico,
    entregaveis: entregaveis,
    totalEixosAtivos: eixos.data.eixos.length,
    totalPendenciasDryRun: pendencias.totalPendencias || pendencias.totalLinhasGeradas || 0
  };
}

function atividadesV2_portalRunPresentationAction_(tipoAcao, payload, contexto, callback) {
  var action = atividadesV2_portalActionStart_(tipoAcao, payload, contexto);
  var trace = atividadesV2_portalWriteTraceStart_(tipoAcao, payload);
  action.trace = trace;
  var replayResponse = null;
  try {
    var result = atividadesV2_portalWithLock_(tipoAcao, function(ss) {
      var existing = atividadesV2_portalWriteFindRequest_(ss, action);
      if (existing) {
        replayResponse = atividadesV2_portalWriteReplayResponse_(existing);
        return null;
      }
      var data = atividadesV2_portalWriteStage_(trace, 'VALIDACAO_E_ESCRITA_OFICIAL', function() {
        return callback(ss, action);
      });
      data.performance = atividadesV2_portalWriteSummary_(trace, 'REGISTRADO', '');
      var auditWarnings = atividadesV2_portalWriteStage_(trace, 'ENFILEIRAMENTO_POS_PROCESSAMENTO', function() {
        return atividadesV2_portalActionSuccess_(ss, action, data) || [];
      });
      auditWarnings.forEach(function(warning) {
        atividadesV2_portalWriteWarning_(trace, warning.code, warning.message);
      });
      return data;
    });
    if (replayResponse) return replayResponse;
    trace.idAtividade = result.idAtividade || trace.idAtividade;
    trace.idApresentacao = result.idApresentacao || trace.idApresentacao;
    atividadesV2_portalWriteMarkSecondaryPending_(trace);
    atividadesV2_portalWriteAttachResult_(result, trace, 'REGISTRADO');
    return atividadesV2_portalWriteSuccessResponse_(result, {
      userMessage: 'Acao de apresentacao registrada com sucesso.',
      entityId: result.idApresentacao || ''
    });
  } catch (err) {
    atividadesV2_portalWriteLogSafe_(atividadesV2_getDatabaseSpreadsheet_(), trace, 'ERRO', err && (err.code || err.errorCode) || 'ERRO_APRESENTACAO');
    try {
      atividadesV2_portalActionError_(atividadesV2_getDatabaseSpreadsheet_(), action, err);
    } catch (logErr) {}
    return atividadesV2_portalWriteErrorResponse_(err, 'ERRO_APRESENTACAO', atividadesV2_errorMessage_(err));
  }
}

function atividadesV2_portalActionStart_(tipoAcao, payload, contexto) {
  var ctx = atividades_normalizePortalContext_(contexto || {});
  var cleanPayload = payload || {};
  return {
    idAcao: atividadesV2_portalWriteActionId_('PACT', tipoAcao, cleanPayload, ctx),
    tipoAcao: String(tipoAcao || '').trim(),
    payload: cleanPayload,
    contexto: ctx,
    startedAt: new Date(),
    trace: null
  };
}

function atividadesV2_portalActionSuccess_(ss, acao, resultado) {
  var warnings = [];
  try {
    atividadesV2_portalAppendAcao_(ss, atividadesV2_buildPortalActionRow_(acao, ATIVIDADES_V2_PORTAL_POS_WRITE_PENDING_, resultado, null));
  } catch (error) {
    warnings.push({ code: 'POS_PROCESSAMENTO_NAO_ENFILEIRADO', message: 'A gravacao foi concluida, mas o pos-processamento nao entrou na fila operacional.' });
  }
  return warnings;
}

function atividadesV2_portalActionError_(ss, acao, erro) {
  atividadesV2_portalAppendAcao_(ss, atividadesV2_buildPortalActionRow_(acao, 'ERRO', null, erro));
  atividadesV2_portalAppendLog_(ss, {
    ACAO: acao.tipoAcao,
    NIVEL: 'ERRO',
    STATUS: 'ERRO',
    ID_ATIVIDADE: acao.payload.idAtividade || '',
    ID_ENTIDADE: acao.payload.idApresentacao || '',
    TIPO_ENTIDADE: 'APRESENTACAO',
    MENSAGEM: 'Falha em acao de apresentacao pelo Portal GEAPA DEV.',
    DETALHES_JSON: atividadesV2_safeLogData_({ erro: atividadesV2_errorMessage_(erro).slice(0, 300) })
  });
}

function atividadesV2_portalAppendAcao_(ss, data) {
  var sheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.PORTAL_ACOES);
  atividadesV2_applyHeadersIfMissing_(sheet, ATIVIDADES_V2_SCHEMA.PORTAL_ACOES);
  var headers = atividadesV2_getSheetHeaders_(sheet).filter(function(header) { return !!header; });
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, headers.length).setValues([
    headers.map(function(header) {
      return Object.prototype.hasOwnProperty.call(data, header) ? data[header] : '';
    })
  ]);
}

function atividadesV2_portalAppendLog_(ss, data) {
  return atividadesV2_appendV2Log_(ss, data || {});
}

function atividadesV2_portalWithLock_(label, callback) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    throw atividadesV2_portalActionException_('LOCK_INDISPONIVEL', 'Nao foi possivel obter lock para ' + label + '.');
  }
  try {
    return callback(atividadesV2_getDatabaseSpreadsheet_());
  } finally {
    lock.releaseLock();
  }
}

function atividadesV2_buildPortalActionRow_(acao, status, resultado, erro) {
  var payload = atividadesV2_sanitizePresentationActionPayload_(acao.payload);
  var now = new Date();
  return {
    ID_ACAO_PORTAL: acao.idAcao,
    DATA_HORA: acao.startedAt,
    USUARIO_EMAIL: acao.contexto.email || '',
    USUARIO_NOME: acao.contexto.nome || '',
    PERFIL_USUARIO: acao.contexto.perfil || '',
    TIPO_ACAO: acao.tipoAcao,
    ID_ATIVIDADE: resultado && resultado.idAtividade || acao.payload.idAtividade || '',
    ID_ENTIDADE: resultado && resultado.idApresentacao || acao.payload.idApresentacao || '',
    TIPO_ENTIDADE: 'APRESENTACAO',
    PAYLOAD_JSON: atividadesV2_safeLogData_(payload),
    STATUS_PROCESSAMENTO: status,
    RESULTADO_JSON: resultado ? atividadesV2_safeLogData_({
      ok: true,
      idAtividade: resultado.idAtividade || '',
      idApresentacao: resultado.idApresentacao || '',
      status: resultado.statusTituloEixo || resultado.statusMaterial || resultado.statusFotoReuniao || resultado.statusArquivo || '',
      performance: resultado.performance || null,
      valoresAnteriores: resultado.valoresAnteriores || undefined
    }) : '',
    ERRO_CODIGO: erro && erro.code || '',
    ERRO_MENSAGEM: erro ? atividadesV2_errorMessage_(erro).slice(0, 300) : '',
    PROCESSADO_EM: now,
    PROCESSADO_POR: atividadesV2_portalActorToken_(acao.contexto),
    OBSERVACOES: 'Acao de apresentacao processada pelo Portal GEAPA DEV.',
    ATIVO: 'SIM'
  };
}

function atividadesV2_portalResolvePresentationActionBundle_(ss, payload) {
  var idApresentacao = String(payload && payload.idApresentacao || payload && payload.ID_APRESENTACAO || '').trim();
  if (!idApresentacao) throw atividadesV2_portalActionException_('ID_APRESENTACAO_OBRIGATORIO', 'ID_APRESENTACAO obrigatorio.');
  var atividadesSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES);
  var apresentacoesSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.APRESENTACOES);
  var configSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.CONFIG);
  atividadesV2_applyHeadersIfMissing_(atividadesSheet, ATIVIDADES_V2_SCHEMA.ATIVIDADES);
  atividadesV2_applyHeadersIfMissing_(apresentacoesSheet, ATIVIDADES_V2_SCHEMA.APRESENTACOES);

  var apresentacao = atividadesV2_findApresentacaoV2ById_(apresentacoesSheet, idApresentacao);
  if (!apresentacao) throw atividadesV2_portalActionException_('APRESENTACAO_NAO_ENCONTRADA', 'Apresentacao nao encontrada na V2 do ambiente resolvido.');
  if (atividades_normalizeTextUpper_(apresentacao.ATIVO || 'SIM') === 'NAO') {
    throw atividadesV2_portalActionException_('APRESENTACAO_INATIVA', 'Apresentacao inativa.');
  }
  var idAtividade = String(payload.idAtividade || payload.ID_ATIVIDADE || apresentacao.ID_ATIVIDADE || '').trim();
  var atividade = atividadesV2_findAtividadeV2ById_(atividadesSheet, idAtividade);
  if (!atividade) throw atividadesV2_portalActionException_('ATIVIDADE_NAO_ENCONTRADA', 'Atividade vinculada nao encontrada na V2 do ambiente resolvido.');
  if (atividades_normalizeTextUpper_(atividade.ATIVO || 'SIM') === 'NAO') {
    throw atividadesV2_portalActionException_('ATIVIDADE_INATIVA', 'Atividade inativa.');
  }

  return {
    ss: ss,
    atividadesSheet: atividadesSheet,
    apresentacoesSheet: apresentacoesSheet,
    configSheet: configSheet,
    atividade: atividade,
    apresentacao: apresentacao
  };
}

function atividadesV2_findApresentacaoV2ById_(sheet, idApresentacao) {
  var wanted = String(idApresentacao || '').trim();
  var records = atividadesV2_readSheetObjects_(sheet);
  for (var i = 0; i < records.length; i++) {
    if (String(records[i].ID_APRESENTACAO || '').trim() === wanted) return records[i];
  }
  return null;
}

function atividadesV2_assertPresentationWritePermission_(bundle, contexto, area) {
  if (atividades_isPrivilegedPortalProfile_(contexto)) return true;
  if (atividadesV2_portalPresentationBelongsToContext_(bundle.atividade, bundle.apresentacao, contexto)) return true;
  throw atividadesV2_portalActionException_('PERMISSAO_NEGADA', 'Usuario sem permissao para alterar esta apresentacao.');
}

function atividadesV2_portalPresentationBelongsToContext_(atividade, apresentacao, contexto) {
  var ctxIdPessoa = String(contexto && contexto.idPessoa || '').trim();
  var ctxRga = String(contexto && contexto.rga || '').trim().toLowerCase();
  var ctxEmail = String(contexto && contexto.email || '').trim().toLowerCase();
  var candidates = [
    { idPessoa: atividade.ID_PESSOA_PRINCIPAL, rga: atividade.RGA_PESSOA_PRINCIPAL, email: atividade.EMAIL_PESSOA_PRINCIPAL },
    { idPessoa: apresentacao.ID_PESSOA, rga: apresentacao.RGA, email: apresentacao.EMAIL_MEMBRO }
  ];
  return candidates.some(function(item) {
    if (ctxIdPessoa && String(item.idPessoa || '').trim() === ctxIdPessoa) return true;
    if (ctxRga && String(item.rga || '').trim().toLowerCase() === ctxRga) return true;
    if (ctxEmail && String(item.email || '').trim().toLowerCase() === ctxEmail) return true;
    return false;
  });
}

function atividadesV2_assertPresentationNotBlocked_(apresentacao) {
  if (atividades_isTruthySim_(apresentacao.BLOQUEADO_PARA_EDICAO)) {
    throw atividadesV2_portalActionException_('APRESENTACAO_BLOQUEADA', 'Apresentacao bloqueada para edicao.');
  }
}

function atividadesV2_validateTituloEixoPayload_(payload, config) {
  var titulo = atividades_sanitizePortalText_(payload && (payload.tituloApresentacao || payload.titulo || payload.TITULO), 240);
  var requireTitle = atividades_isTruthySim_(config.EXIGE_TITULO_PUBLICO || 'SIM');
  if (requireTitle && !titulo) throw atividadesV2_portalActionException_('TITULO_OBRIGATORIO', 'Titulo da apresentacao obrigatorio.');

  var requireAxis = atividades_isTruthySim_(config.EXIGE_EIXO_TEMATICO || 'SIM');
  var allowSecondary = atividades_isTruthySim_(config.PERMITE_EIXO_SECUNDARIO || 'SIM');
  var eixoPrincipal = atividadesV2_resolveEixoPortal_(payload && payload.eixoTematicoPrincipal, requireAxis, 'EIXO_PRINCIPAL_INVALIDO');
  var eixoSecundario = atividadesV2_resolveEixoPortal_(payload && payload.eixoTematicoSecundario, false, 'EIXO_SECUNDARIO_INVALIDO');
  if (eixoSecundario && !allowSecondary) {
    throw atividadesV2_portalActionException_('EIXO_SECUNDARIO_NAO_PERMITIDO', 'Eixo secundario nao permitido para esta atividade.');
  }
  if (eixoPrincipal && eixoSecundario &&
      atividades_normalizarComparacaoApresentacoes_(eixoPrincipal) === atividades_normalizarComparacaoApresentacoes_(eixoSecundario)) {
    throw atividadesV2_portalActionException_('EIXOS_DUPLICADOS', 'Eixo secundario nao pode ser igual ao principal.');
  }

  return {
    titulo: titulo,
    eixoPrincipal: eixoPrincipal,
    eixoSecundario: eixoSecundario
  };
}

function atividadesV2_assertNewTitleAxisProposalChanged_(atividade, normalized) {
  var previous = [
    atividades_normalizarComparacaoApresentacoes_(atividade.TITULO_PUBLICO || atividade.TITULO || ''),
    atividades_normalizarComparacaoApresentacoes_(atividade.EIXO_TEMATICO_PRINCIPAL || ''),
    atividades_normalizarComparacaoApresentacoes_(atividade.EIXO_TEMATICO_SECUNDARIO || '')
  ].join('|');
  var next = [
    atividades_normalizarComparacaoApresentacoes_(normalized.titulo || ''),
    atividades_normalizarComparacaoApresentacoes_(normalized.eixoPrincipal || ''),
    atividades_normalizarComparacaoApresentacoes_(normalized.eixoSecundario || '')
  ].join('|');
  if (previous === next) {
    throw atividadesV2_portalActionException_('PROPOSTA_TEMA_IGUAL_REPROVADA', 'A nova proposta de titulo/eixos deve ser diferente da proposta reprovada.');
  }
}

function atividadesV2_getPreviousTitleAxisValues_(atividade, apresentacao) {
  return {
    titulo: String(atividade.TITULO || '').trim(),
    tituloPublico: String(atividade.TITULO_PUBLICO || '').trim(),
    eixoTematicoPrincipal: String(atividade.EIXO_TEMATICO_PRINCIPAL || '').trim(),
    eixoTematicoSecundario: String(atividade.EIXO_TEMATICO_SECUNDARIO || '').trim(),
    statusEixoTematico: String(atividade.STATUS_EIXO_TEMATICO || '').trim(),
    statusTituloEixo: String(apresentacao.STATUS_TITULO_EIXO || '').trim()
  };
}

function atividadesV2_resolveEixoPortal_(value, required, errorCode) {
  var raw = String(value || '').trim();
  if (!raw) {
    if (required) throw atividadesV2_portalActionException_(errorCode, 'Eixo tematico obrigatorio.');
    return '';
  }
  var entry = atividades_findEixoMapEntryApresentacoes_(raw);
  if (!entry) throw atividadesV2_portalActionException_(errorCode, 'Eixo tematico invalido ou inativo.');
  return entry.canonico;
}

function atividadesV2_portalGetActivityConfig_(ss, atividade) {
  var sheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.CONFIG);
  var configs = atividadesV2_readSheetObjects_(sheet);
  var tipo = atividades_normalizeTextUpper_(atividade.TIPO_ATIVIDADE);
  var subtipo = atividades_normalizeTextUpper_(atividade.SUBTIPO_ATIVIDADE);
  for (var i = 0; i < configs.length; i++) {
    var cfg = configs[i];
    if (atividades_normalizeTextUpper_(cfg.ATIVO || 'SIM') === 'NAO') continue;
    if (atividades_normalizeTextUpper_(cfg.TIPO_ATIVIDADE) === tipo &&
        atividades_normalizeTextUpper_(cfg.SUBTIPO_ATIVIDADE) === subtipo) {
      return cfg;
    }
  }
  return {};
}

function atividadesV2_refreshPresentationPortalViews_() {
  var statusResult = atividadesV2_atualizarStatusRealizacaoApresentacoesDev_({
    dryRun: false,
    atualizarViews: false,
    atualizadoPor: 'SISTEMA_ATIVIDADES_V2'
  });
  if (statusResult.erros && statusResult.erros.length) {
    Logger.log('GEAPA-ATIVIDADES-V2-PORTAL apresentacoes: atualizacao de status com erros: ' + atividadesV2_safeLogData_(statusResult));
  }
  var result = atividadesV2_atualizarViewsPortal_({ dryRun: false, stopOnError: false });
  if (!result.ok) {
    Logger.log('GEAPA-ATIVIDADES-V2-PORTAL apresentacoes: views atualizadas com avisos/erros: ' + atividadesV2_safeLogData_(result));
  }
  return result;
}

function atividadesV2_materialActionTypeFromDecision_(decision) {
  var normalized = atividadesV2_normalizeDecision_(decision);
  if (normalized === 'APROVAR') return 'APRESENTACAO_MATERIAL_APROVADO';
  if (normalized === 'DISPENSAR') return 'APRESENTACAO_MATERIAL_DISPENSADO';
  return 'APRESENTACAO_MATERIAL_AJUSTE_SOLICITADO';
}

function atividadesV2_normalizeDecision_(value) {
  return atividades_normalizeTextUpper_(value || '');
}

function atividadesV2_buildReviewObservation_(payload) {
  var publicObs = atividades_sanitizePortalText_(payload && payload.observacaoPublica, 300);
  var internalObs = atividades_sanitizePortalText_(payload && payload.observacaoInterna, 300);
  var parts = [];
  if (publicObs) parts.push('Portal publico: ' + publicObs);
  if (internalObs) parts.push('Portal interno: ' + internalObs);
  return parts.join(' | ');
}

function atividadesV2_sanitizePresentationActionPayload_(payload) {
  var src = payload || {};
  return {
    idAtividade: src.idAtividade || src.ID_ATIVIDADE || '',
    idApresentacao: src.idApresentacao || src.ID_APRESENTACAO || '',
    requestId: src.requestId || '',
    clientSubmittedAt: src.clientSubmittedAt || '',
    decisao: src.decisao || '',
    tituloInformado: atividades_sanitizePortalText_(src.tituloApresentacao || src.titulo, 120),
    temArquivo: !!(src.fileId || src.conteudoBase64 || src.linkArquivo || src.linkFoto || src.linkDrive),
    observacoes: atividades_sanitizePortalText_(src.observacoes || src.observacaoPublica, 160)
  };
}

function atividadesV2_portalActorToken_(contexto) {
  return String(contexto && (contexto.email || contexto.idPessoa || contexto.rga || contexto.perfil) || '').trim();
}

function atividadesV2_portalActionErrorResponse_(err) {
  return atividadesV2_portalWriteErrorResponse_(err, 'ERRO_ACAO_APRESENTACAO', atividadesV2_errorMessage_(err));
}

function atividadesV2_portalActionException_(code, message) {
  var err = new Error(message || code);
  err.code = code;
  return err;
}

function atividadesV2_errorMessage_(err) {
  return err && err.message ? err.message : String(err || 'Erro desconhecido.');
}

function atividadesV2_presentationHasPresenter_(atividade, apresentacao) {
  return !!String(
    atividade.ID_PESSOA_PRINCIPAL ||
    atividade.RGA_PESSOA_PRINCIPAL ||
    atividade.NOME_PESSOA_PRINCIPAL_PUBLICO ||
    apresentacao.ID_PESSOA ||
    apresentacao.RGA ||
    apresentacao.NOME_MEMBRO ||
    ''
  ).trim();
}
