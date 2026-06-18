/**
 * Acoes operacionais de apresentacoes pelo Portal GEAPA na Atividades V2 DEV.
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
  'APROVADO'
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
  return {
    ok: true,
    data: { eixos: eixos },
    origem: ATIVIDADES_CFG.STABLE_KEYS.THEMATIC_AXES
  };
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
        eixoTematicoSecundario: normalized.eixoSecundario
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

      return {
        idAtividade: bundle.atividade.ID_ATIVIDADE,
        idApresentacao: bundle.apresentacao.ID_APRESENTACAO,
        statusTituloEixo: status
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
        statusMaterial: status
      };
    }
  );
}

function atividadesV2_portalRegistrarMaterialApresentacao_(payload, contexto) {
  var actionType = payload && payload.reenvio === true
    ? 'APRESENTACAO_MATERIAL_REENVIADO'
    : 'APRESENTACAO_MATERIAL_ENVIADO';
  var result = atividadesV2_portalActionStart_(actionType, payload, contexto);
  try {
    var materialResult = atividadesV2_registrarMaterialApresentacao_(payload || {}, result.contexto);
    atividadesV2_portalWithLock_('APRESENTACAO_MATERIAL_AUDITORIA', function(ss) {
      atividadesV2_portalActionSuccess_(ss, result, materialResult);
      return true;
    });
    atividadesV2_refreshPresentationPortalViews_();
    return {
      ok: true,
      message: 'Material registrado com sucesso na base DEV.',
      data: materialResult
    };
  } catch (err) {
    try {
      atividadesV2_portalActionError_(atividadesV2_getDatabaseSpreadsheetDev_(), result, err);
    } catch (logErr) {}
    return atividadesV2_portalActionErrorResponse_(err);
  }
}

function atividadesV2_portalListarPendenciasApresentacoesDiretoria_(contexto) {
  var ctx = atividades_normalizePortalContext_(contexto);
  if (!atividades_isPrivilegedPortalProfile_(ctx)) {
    return atividadesV2_portalActionErrorResponse_(atividadesV2_portalActionException_('PERMISSAO_NEGADA', 'Perfil sem permissao para consultar pendencias de apresentacoes.'));
  }
  var result = atividadesV2_portalGetPendenciasDiretoria_(ctx);
  if (!result.ok) return result;
  var pendencias = (result.data && result.data.pendencias || []).filter(function(item) {
    return String(item.tipo || '').indexOf('APRESENTACAO_') === 0;
  });
  return {
    ok: true,
    data: {
      resumo: { total: pendencias.length },
      pendencias: pendencias
    }
  };
}

function atividadesV2_diagnosticarFluxoApresentacoesPortalDev_() {
  var ss = atividadesV2_getDatabaseSpreadsheetDev_();
  var data = atividadesV2_readPortalViewsSourceData_(ss);
  var atividadesById = atividadesV2_indexByField_(data.atividades, 'ID_ATIVIDADE');
  var stats = {
    atividades: data.atividades.length,
    apresentacoes: data.apresentacoes.length,
    apresentacoesAtivas: 0,
    semAtividade: 0,
    semApresentador: 0,
    tituloEixoPendentes: 0,
    materiaisPendentes: 0
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
  });
  return { ok: true, modo: 'DEV', stats: stats, avisos: avisos };
}

function atividadesV2_runTestePortalApresentacoesAcoesDev_() {
  var diagnostico = atividadesV2_diagnosticarFluxoApresentacoesPortalDev_();
  var eixos = atividadesV2_portalListarEixosTematicos_({ perfil: 'MEMBRO' });
  var pendencias = atividadesV2_atualizarPendenciasDiretoria_({ dryRun: true });
  return {
    ok: !!(diagnostico.ok && eixos.ok && pendencias.ok),
    diagnostico: diagnostico,
    totalEixosAtivos: eixos.data.eixos.length,
    totalPendenciasDryRun: pendencias.totalPendencias || pendencias.totalLinhasGeradas || 0
  };
}

function atividadesV2_portalRunPresentationAction_(tipoAcao, payload, contexto, callback) {
  var action = atividadesV2_portalActionStart_(tipoAcao, payload, contexto);
  try {
    var result = atividadesV2_portalWithLock_(tipoAcao, function(ss) {
      var data = callback(ss, action);
      atividadesV2_portalActionSuccess_(ss, action, data);
      return data;
    });
    atividadesV2_refreshPresentationPortalViews_();
    return {
      ok: true,
      message: 'Acao de apresentacao registrada com sucesso na base DEV.',
      data: result
    };
  } catch (err) {
    try {
      atividadesV2_portalActionError_(atividadesV2_getDatabaseSpreadsheetDev_(), action, err);
    } catch (logErr) {}
    return atividadesV2_portalActionErrorResponse_(err);
  }
}

function atividadesV2_portalActionStart_(tipoAcao, payload, contexto) {
  var ctx = atividades_normalizePortalContext_(contexto || {});
  var cleanPayload = payload || {};
  return {
    idAcao: atividadesV2_buildDeterministicId_('PACT', [tipoAcao, new Date().getTime(), ctx.email || ctx.idPessoa || ctx.rga || ctx.perfil]),
    tipoAcao: String(tipoAcao || '').trim(),
    payload: cleanPayload,
    contexto: ctx,
    startedAt: new Date()
  };
}

function atividadesV2_portalActionSuccess_(ss, acao, resultado) {
  atividadesV2_portalAppendAcao_(ss, atividadesV2_buildPortalActionRow_(acao, 'CONCLUIDO', resultado, null));
  atividadesV2_portalAppendLog_(ss, {
    ACAO: acao.tipoAcao,
    NIVEL: 'INFO',
    STATUS: 'OK',
    ID_ATIVIDADE: resultado && resultado.idAtividade || acao.payload.idAtividade || '',
    ID_ENTIDADE: resultado && resultado.idApresentacao || acao.payload.idApresentacao || '',
    TIPO_ENTIDADE: 'APRESENTACAO',
    MENSAGEM: 'Acao de apresentacao processada pelo Portal GEAPA DEV.',
    DETALHES_JSON: atividadesV2_safeLogData_({ tipoAcao: acao.tipoAcao })
  });
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
    return callback(atividadesV2_getDatabaseSpreadsheetDev_());
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
    RESULTADO_JSON: resultado ? atividadesV2_safeLogData_({ ok: true, status: resultado.statusTituloEixo || resultado.statusMaterial || '' }) : '',
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
  if (!apresentacao) throw atividadesV2_portalActionException_('APRESENTACAO_NAO_ENCONTRADA', 'Apresentacao nao encontrada na V2 DEV.');
  if (atividades_normalizeTextUpper_(apresentacao.ATIVO || 'SIM') === 'NAO') {
    throw atividadesV2_portalActionException_('APRESENTACAO_INATIVA', 'Apresentacao inativa.');
  }
  var idAtividade = String(payload.idAtividade || payload.ID_ATIVIDADE || apresentacao.ID_ATIVIDADE || '').trim();
  var atividade = atividadesV2_findAtividadeV2ById_(atividadesSheet, idAtividade);
  if (!atividade) throw atividadesV2_portalActionException_('ATIVIDADE_NAO_ENCONTRADA', 'Atividade vinculada nao encontrada na V2 DEV.');
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
    decisao: src.decisao || '',
    tituloInformado: atividades_sanitizePortalText_(src.tituloApresentacao || src.titulo, 120),
    temArquivo: !!(src.fileId || src.conteudoBase64),
    observacoes: atividades_sanitizePortalText_(src.observacoes || src.observacaoPublica, 160)
  };
}

function atividadesV2_portalActorToken_(contexto) {
  return String(contexto && (contexto.email || contexto.idPessoa || contexto.rga || contexto.perfil) || '').trim();
}

function atividadesV2_portalActionErrorResponse_(err) {
  return {
    ok: false,
    errorCode: err && err.code || 'ERRO_ACAO_APRESENTACAO',
    message: atividadesV2_errorMessage_(err)
  };
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
