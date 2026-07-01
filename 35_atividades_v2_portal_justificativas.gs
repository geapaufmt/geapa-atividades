/**
 * GEAPA Atividades V2 - Justificativas pelo Portal.
 *
 * Fluxo DEV sobre ATIVIDADES_V2_DB. Nao altera V1, nao cria triggers,
 * nao envia e-mails e nao escreve diretamente em views PORTAL_*.
 */

var ATIVIDADES_V2_JUSTIFICATIVAS_STATUS_ABERTOS = Object.freeze([
  'PREVIA',
  'ENVIADA',
  'PENDENTE',
  'EM_ANALISE',
  'AJUSTE_SOLICITADO'
]);

var ATIVIDADES_V2_JUSTIFICATIVAS_STATUS_FINAIS = Object.freeze([
  'DEFERIDA',
  'ABONADA',
  'INDEFERIDA',
  'CANCELADA'
]);

var ATIVIDADES_V2_JUSTIFICATIVAS_MOTIVOS = Object.freeze([
  'SAUDE',
  'COMPROMISSO_ACADEMICO',
  'COMPROMISSO_PROFISSIONAL',
  'MOTIVO_PESSOAL_RELEVANTE',
  'FORCA_MAIOR',
  'OUTRO'
]);

var ATIVIDADES_V2_JUSTIFICATIVAS_MOTIVOS_ROTULOS = Object.freeze({
  SAUDE: 'Saude',
  COMPROMISSO_ACADEMICO: 'Compromisso academico',
  COMPROMISSO_PROFISSIONAL: 'Compromisso profissional',
  MOTIVO_PESSOAL_RELEVANTE: 'Motivo pessoal relevante',
  FORCA_MAIOR: 'Forca maior',
  OUTRO: 'Outro'
});

var ATIVIDADES_V2_JUSTIFICATIVAS_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
var ATIVIDADES_V2_JUSTIFICATIVAS_ROOT_FOLDER_PROP = 'ATIVIDADES_V2_JUSTIFICATIVAS_ROOT_FOLDER_ID';

function atividadesV2_portalEnviarJustificativa_(payload, contexto) {
  return atividadesV2_portalRunJustificativaAction_(
    'JUSTIFICATIVA_ENVIADA_PORTAL',
    payload,
    contexto,
    function(ss, action) {
      var bundle = atividadesV2_resolveJustificativaSubmissionBundle_(ss, action.payload, action.contexto);
      var now = new Date();
      var user = atividadesV2_justificativaActorToken_(action.contexto);
      var existing = bundle.existingActive;
      var isAjuste = existing && atividades_normalizeTextUpper_(existing.STATUS_ANALISE) === 'AJUSTE_SOLICITADO';
      var idJustificativa = existing
        ? String(existing.ID_JUSTIFICATIVA || '').trim()
        : atividadesV2_buildNextJustificativaIdForRecord_(bundle.justificativas, bundle.presenca, bundle.atividade);
      var normalized = atividadesV2_validateJustificativaSubmissionPayload_(action.payload, bundle.prazo);
      var uploadResult = atividadesV2_processJustificativaDocumentoUpload_(ss, action.payload, bundle, idJustificativa);
      if (uploadResult && uploadResult.linkDocumentoComprobatorio) {
        normalized.possuiDocumentoComprobatorio = 'SIM';
        normalized.linkDocumentoComprobatorio = uploadResult.linkDocumentoComprobatorio;
      }
      atividadesV2_assertJustificativaDocumentoRequirement_(normalized);
      var observacaoForaPrazo = bundle.prazo.envioForaDoPrazo === 'SIM'
        ? 'Justificativa enviada fora do prazo em ' + now.toISOString() + '. Membro confirmou ciencia no portal.'
        : '';

      var row = atividadesV2_buildJustificativaPortalRow_({
        idJustificativa: idJustificativa,
        presenca: bundle.presenca,
        atividade: bundle.atividade,
        payload: normalized,
        prazo: bundle.prazo,
        existing: existing,
        now: now,
        user: user,
        observacaoForaPrazo: observacaoForaPrazo
      });

      if (existing) {
        atividadesV2_updateRowByHeaders_(bundle.justificativasSheet, existing._rowNumber, row);
      } else {
        atividadesV2_appendObjectByHeaders_(bundle.justificativasSheet, row);
      }

      if (!bundle.isPrevia) {
        atividadesV2_updateRowByHeaders_(bundle.presencasSheet, bundle.presenca._rowNumber, {
          ID_JUSTIFICATIVA: idJustificativa,
          STATUS_JUSTIFICATIVA: 'ENVIADA',
          ATUALIZADO_POR: user,
          ATUALIZADO_EM: now,
          OBSERVACOES: atividadesV2_joinObservacoes_(
            bundle.presenca.OBSERVACOES,
            bundle.prazo.envioForaDoPrazo === 'SIM' ? 'Justificativa enviada fora do prazo pelo Portal.' : 'Justificativa enviada pelo Portal.'
          )
        });
      }

      return {
        idJustificativa: idJustificativa,
        idRegistroPresenca: bundle.presenca.ID_REGISTRO_PRESENCA || '',
        idAtividade: bundle.presenca.ID_ATIVIDADE,
        statusAnalise: bundle.isPrevia ? 'PREVIA' : 'ENVIADA',
        reenvioAjuste: !!isAjuste,
        justificativaPrevia: bundle.isPrevia ? 'SIM' : 'NAO',
        envioForaDoPrazo: bundle.prazo.envioForaDoPrazo,
        statusPrazo: bundle.prazo.statusPrazo,
        documentoComprobatorio: uploadResult ? {
          enviado: 'SIM',
          nomeArquivo: uploadResult.nomeArquivo || '',
          link: uploadResult.linkDocumentoComprobatorio || ''
        } : { enviado: 'NAO' },
        idPessoa: bundle.presenca.ID_PESSOA || '',
        rga: bundle.presenca.RGA || '',
        email: bundle.presenca.EMAIL_PARTICIPANTE || ''
      };
    }
  );
}

function atividadesV2_portalGetJustificativasConfig_() {
  return {
    ok: true,
    data: {
      motivos: ATIVIDADES_V2_JUSTIFICATIVAS_MOTIVOS.map(function(value) {
        return {
          value: value,
          label: ATIVIDADES_V2_JUSTIFICATIVAS_MOTIVOS_ROTULOS[value] || value
        };
      }),
      uploadComprovante: {
        habilitado: true,
        maxBytes: ATIVIDADES_V2_JUSTIFICATIVAS_MAX_UPLOAD_BYTES,
        extensoesAceitas: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'],
        mimeTypesAceitos: [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
      }
    }
  };
}

function atividadesV2_promoverJustificativasPreviasDev_(options) {
  options = options || {};
  var dryRun = options.dryRun === true;
  var report = {
    ok: true,
    dryRun: dryRun,
    totalPrevias: 0,
    totalPromovidas: 0,
    promovidas: [],
    avisos: [],
    erros: []
  };

  var lock = null;
  if (!dryRun) {
    lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) throw new Error('LOCK_INDISPONIVEL: nao foi possivel promover justificativas previas agora.');
  }

  try {
    var ss = atividadesV2_getDatabaseSpreadsheetDev_();
    report = atividadesV2_promoverJustificativasPreviasNaPlanilha_(ss, report, options);
    if (!dryRun && report.totalPromovidas > 0) {
      atividadesV2_refreshJustificativasPortalViews_();
      atividadesV2_invalidateJustificativasPortalCaches_({}, {});
    }
    return report;
  } finally {
    if (lock) lock.releaseLock();
  }
}

function atividadesV2_promoverJustificativasPreviasNaPlanilha_(ss, report, options) {
  options = options || {};
  report = report || { ok: true, dryRun: options.dryRun === true, promovidas: [], avisos: [], erros: [] };
  var dryRun = report.dryRun === true;
  var data = atividadesV2_readJustificativasPortalData_(ss);
  var previas = data.justificativas.filter(function(record) {
    return atividades_normalizeTextUpper_(record.ATIVO || 'SIM') !== 'NAO' &&
      atividades_normalizeTextUpper_(record.STATUS_ANALISE) === 'PREVIA';
  });
  report.totalPrevias = previas.length;

  previas.forEach(function(justificativa) {
    var presenca = atividadesV2_findPresenceForPreviousJustificativa_(data.presencas, justificativa);
    if (!presenca) return;
    var item = {
      idJustificativa: justificativa.ID_JUSTIFICATIVA,
      idRegistroPresenca: presenca.ID_REGISTRO_PRESENCA,
      idAtividade: justificativa.ID_ATIVIDADE,
      idPessoa: justificativa.ID_PESSOA || '',
      rga: justificativa.RGA || ''
    };
    report.promovidas.push(item);
    if (dryRun) return;

    var now = new Date();
    atividadesV2_updateRowByHeaders_(data.justificativasSheet, justificativa._rowNumber, {
      ID_REGISTRO_PRESENCA: presenca.ID_REGISTRO_PRESENCA,
      STATUS_ANALISE: 'ENVIADA',
      DECISAO_APLICADA_NA_PRESENCA: '',
      ATUALIZADO_EM: now,
      OBSERVACOES_INTERNAS: atividadesV2_joinObservacoes_(
        justificativa.OBSERVACOES_INTERNAS,
        'Justificativa previa vinculada automaticamente apos registro de falta.'
      )
    });
    atividadesV2_updateRowByHeaders_(data.presencasSheet, presenca._rowNumber, {
      ID_JUSTIFICATIVA: justificativa.ID_JUSTIFICATIVA,
      STATUS_JUSTIFICATIVA: 'ENVIADA',
      ATUALIZADO_POR: 'SISTEMA_ATIVIDADES_V2',
      ATUALIZADO_EM: now,
      OBSERVACOES: atividadesV2_joinObservacoes_(
        presenca.OBSERVACOES,
        'Justificativa previa vinculada apos chamada.'
      )
    });
    atividadesV2_appendV2Log_(ss, {
      FLUXO: 'JUSTIFICATIVAS_PORTAL_V2',
      ACAO: 'JUSTIFICATIVA_PREVIA_PROMOVIDA',
      NIVEL: 'INFO',
      STATUS: 'OK',
      ID_ATIVIDADE: justificativa.ID_ATIVIDADE || '',
      MENSAGEM: 'Justificativa PREVIA vinculada ao registro de falta V2.',
      DETALHES_JSON: atividadesV2_safeLogData_(item)
    });
    report.totalPromovidas = (report.totalPromovidas || 0) + 1;
  });
  if (dryRun) report.totalPromovidas = report.promovidas.length;
  return report;
}

function atividadesV2_portalAnalisarJustificativa_(payload, contexto) {
  return atividadesV2_portalRunJustificativaAction_(
    'JUSTIFICATIVA_ANALISADA_PORTAL',
    payload,
    contexto,
    function(ss, action) {
      if (!atividades_isPrivilegedPortalProfile_(action.contexto)) {
        throw atividadesV2_portalActionException_('PERMISSAO_NEGADA', 'Perfil sem permissao para analisar justificativas.');
      }
      var decisao = atividadesV2_normalizeJustificativaDecision_(action.payload && action.payload.decisao);
      var publicObs = atividades_sanitizePortalText_(action.payload && action.payload.observacaoPublica, 500);
      var internalObs = atividades_sanitizePortalText_(action.payload && action.payload.observacoesInternas, 700);
      if ((decisao === 'INDEFERIR' || decisao === 'SOLICITAR_AJUSTE') && !publicObs && !internalObs) {
        throw atividadesV2_portalActionException_('OBSERVACAO_OBRIGATORIA', 'Informe observacao para indeferir ou solicitar ajuste.');
      }

      var bundle = atividadesV2_resolveJustificativaAnalysisBundle_(ss, action.payload);
      var statusAtual = atividades_normalizeTextUpper_(bundle.justificativa.STATUS_ANALISE);
      if (ATIVIDADES_V2_JUSTIFICATIVAS_STATUS_FINAIS.indexOf(statusAtual) >= 0 &&
          atividades_normalizeTextUpper_(action.contexto.perfil) !== 'ADMIN_TECNICO') {
        throw atividadesV2_portalActionException_('JUSTIFICATIVA_JA_FINALIZADA', 'Justificativa ja possui decisao final.');
      }

      var now = new Date();
      var user = atividadesV2_justificativaActorToken_(action.contexto);
      var effect = atividadesV2_decisionEffectForJustificativa_(decisao);
      var before = atividadesV2_presenceValueBeforeJustificativa_(bundle.presenca);
      var after = effect.valorDepois || before;
      var prazo = atividadesV2_classificarPrazoJustificativaRecord_(bundle.justificativa, now);
      var exceptional = prazo.envioForaDoPrazo === 'SIM' && (decisao === 'DEFERIR' || decisao === 'ABONAR');

      atividadesV2_updateRowByHeaders_(bundle.justificativasSheet, bundle.justificativa._rowNumber, {
        STATUS_ANALISE: effect.statusAnalise,
        DATA_ANALISE: now,
        ANALISADO_POR: user,
        DECISAO_APLICADA_NA_PRESENCA: effect.decisaoAplicada,
        VALOR_ANTES: before,
        VALOR_DEPOIS: after,
        OBSERVACAO_PUBLICA: publicObs || bundle.justificativa.OBSERVACAO_PUBLICA || '',
        OBSERVACOES_INTERNAS: atividadesV2_joinObservacoes_(
          bundle.justificativa.OBSERVACOES_INTERNAS,
          atividadesV2_joinObservacoes_(
            internalObs,
            exceptional ? 'Justificativa fora do prazo aceita excepcionalmente pela gestao.' : ''
          )
        ),
        ATUALIZADO_EM: now,
        ATIVO: 'SIM'
      });

      atividadesV2_updateRowByHeaders_(bundle.presencasSheet, bundle.presenca._rowNumber, {
        STATUS_JUSTIFICATIVA: effect.statusAnalise,
        DECISAO_JUSTIFICATIVA: effect.decisaoAplicada,
        VALOR_ANTES_JUSTIFICATIVA: before,
        VALOR_DEPOIS_JUSTIFICATIVA: after,
        STATUS_PRESENCA: effect.statusPresenca || bundle.presenca.STATUS_PRESENCA,
        ATUALIZADO_POR: user,
        ATUALIZADO_EM: now,
        MOTIVO_AJUSTE: decisao === 'SOLICITAR_AJUSTE' ? (publicObs || internalObs) : bundle.presenca.MOTIVO_AJUSTE,
        OBSERVACOES: atividadesV2_joinObservacoes_(
          bundle.presenca.OBSERVACOES,
          'Decisao de justificativa pelo Portal: ' + effect.decisaoAplicada
        )
      });

      return {
        idJustificativa: bundle.justificativa.ID_JUSTIFICATIVA,
        idRegistroPresenca: bundle.presenca.ID_REGISTRO_PRESENCA,
        idAtividade: bundle.justificativa.ID_ATIVIDADE || bundle.presenca.ID_ATIVIDADE,
        statusAnalise: effect.statusAnalise,
        decisaoAplicada: effect.decisaoAplicada,
        valorAntes: before,
        valorDepois: after,
        envioForaDoPrazo: prazo.envioForaDoPrazo,
        aceiteExcepcionalForaPrazo: exceptional ? 'SIM' : 'NAO',
        idPessoa: bundle.justificativa.ID_PESSOA || bundle.presenca.ID_PESSOA || '',
        rga: bundle.justificativa.RGA || bundle.presenca.RGA || '',
        email: bundle.justificativa.EMAIL_MEMBRO || bundle.presenca.EMAIL_PARTICIPANTE || ''
      };
    }
  );
}

function atividadesV2_portalListarJustificativasPendentesDiretoria_(contexto) {
  var ctx = atividades_normalizePortalContext_(contexto || {});
  if (!atividades_isPrivilegedPortalProfile_(ctx)) {
    return atividadesV2_portalActionErrorResponse_(atividadesV2_portalActionException_('PERMISSAO_NEGADA', 'Perfil sem permissao para consultar justificativas pendentes.'));
  }
  try {
    var ss = atividadesV2_getDatabaseSpreadsheetDev_();
    var justificativas = atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.JUSTIFICATIVAS));
    var pendentes = justificativas.filter(function(record) {
      if (atividades_normalizeTextUpper_(record.ATIVO || 'SIM') === 'NAO') return false;
      var status = atividades_normalizeTextUpper_(record.STATUS_ANALISE || 'ENVIADA');
      return status !== 'PREVIA' && ATIVIDADES_V2_JUSTIFICATIVAS_STATUS_ABERTOS.indexOf(status) >= 0;
    }).map(atividadesV2_mapJustificativaGestaoPortal_);
    return {
      ok: true,
      data: {
        resumo: { total: pendentes.length },
        justificativas: pendentes
      },
      origem: 'atividades-v2:' + ATIVIDADES_V2_SHEETS.JUSTIFICATIVAS
    };
  } catch (err) {
    return atividadesV2_portalActionErrorResponse_(err);
  }
}

function atividadesV2_diagnosticarFluxoJustificativasPortalDev_() {
  var ss = atividadesV2_getDatabaseSpreadsheetDev_();
  var data = atividadesV2_readJustificativasPortalData_(ss);
  var justificativasByRegistro = atividadesV2_indexActiveJustificativasByRegistro_(data.justificativas);
  var stats = {
    presencas: data.presencas.length,
    faltasJustificaveis: 0,
    justificativasAtivas: 0,
    justificativasPrevias: 0,
    justificativasPendentes: 0,
    justificativasForaPrazo: 0,
    registrosComDuplicidadeAtiva: 0
  };
  var seen = {};
  data.justificativas.forEach(function(record) {
    if (atividades_normalizeTextUpper_(record.ATIVO || 'SIM') === 'NAO') return;
    stats.justificativasAtivas++;
    if (atividades_normalizeTextUpper_(record.STATUS_ANALISE) === 'PREVIA') stats.justificativasPrevias++;
    if (ATIVIDADES_V2_JUSTIFICATIVAS_STATUS_ABERTOS.indexOf(atividades_normalizeTextUpper_(record.STATUS_ANALISE || 'ENVIADA')) >= 0) stats.justificativasPendentes++;
    if (atividadesV2_classificarPrazoJustificativaRecord_(record, new Date()).envioForaDoPrazo === 'SIM') stats.justificativasForaPrazo++;
    var idRegistro = String(record.ID_REGISTRO_PRESENCA || '').trim();
    if (idRegistro) {
      seen[idRegistro] = (seen[idRegistro] || 0) + 1;
      if (seen[idRegistro] === 2) stats.registrosComDuplicidadeAtiva++;
    }
  });
  data.presencas.forEach(function(record) {
    if (atividadesV2_isPresenceJustificavel_(record) && !justificativasByRegistro[String(record.ID_REGISTRO_PRESENCA || '').trim()]) {
      stats.faltasJustificaveis++;
    }
  });
  return { ok: true, modo: 'DEV', stats: stats };
}

function atividadesV2_runTestePortalJustificativasDev_() {
  var diagnostico = atividadesV2_diagnosticarFluxoJustificativasPortalDev_();
  var viewsDryRun = atividadesV2_atualizarViewsPortal_({ dryRun: true, stopOnError: false });
  return {
    ok: diagnostico.ok && viewsDryRun.ok,
    diagnostico: diagnostico,
    viewsDryRun: {
      ok: viewsDryRun.ok,
      justificativas: viewsDryRun.steps && viewsDryRun.steps.justificativas || {},
      pendencias: viewsDryRun.steps && viewsDryRun.steps.pendencias || {}
    }
  };
}

function atividadesV2_getMinhasJustificativasPortalData_(contexto) {
  var ctx = atividades_normalizePortalContext_(contexto || {});
  var ss = atividadesV2_getDatabaseSpreadsheetDev_();
  var data = atividadesV2_readJustificativasPortalData_(ss);
  var justificativasByRegistro = atividadesV2_indexActiveJustificativasByRegistro_(data.justificativas);
  var justificativasByAtividade = atividadesV2_indexActiveJustificativasByActivityForOwnContext_(data.justificativas, ctx);
  var faltas = [];
  var justificativas = [];

  data.presencas.forEach(function(record) {
    if (!atividadesV2_presenceBelongsToOwnContext_(record, ctx)) return;
    if (!atividadesV2_isPresenceJustificavel_(record)) return;
    var idRegistro = String(record.ID_REGISTRO_PRESENCA || '').trim();
    if (justificativasByRegistro[idRegistro]) return;
    if (justificativasByAtividade[String(record.ID_ATIVIDADE || '').trim()]) return;
    faltas.push(atividadesV2_mapFaltaJustificavelPortal_(record, data.atividadesById[String(record.ID_ATIVIDADE || '').trim()]));
  });

  data.justificativas.forEach(function(record) {
    if (!atividadesV2_justificativaBelongsToOwnContext_(record, ctx)) return;
    if (atividades_normalizeTextUpper_(record.ATIVO || 'SIM') === 'NAO') return;
    justificativas.push(atividadesV2_mapJustificativaMembroPortal_(record));
  });

  faltas.sort(atividadesV2_sortJustificativasPortalByDate_);
  justificativas.sort(atividadesV2_sortJustificativasPortalByDate_);
  return {
    resumo: {
      totalFaltasJustificaveis: faltas.length,
      totalJustificativas: justificativas.length
    },
    faltasJustificaveis: faltas,
    justificativas: justificativas,
    ultimaAtualizacao: new Date().toISOString()
  };
}

function atividadesV2_getPreviousJustificationCalendarContext_(ss, contexto) {
  var ctx = atividades_normalizePortalContext_(contexto || {});
  if (!ctx.idPessoa && !ctx.rga && !ctx.email) {
    return { byActivity: {}, contexto: ctx };
  }
  var justificativasSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.JUSTIFICATIVAS);
  atividadesV2_applyHeadersIfMissing_(justificativasSheet, ATIVIDADES_V2_SCHEMA.JUSTIFICATIVAS);
  return {
    byActivity: atividadesV2_indexActiveJustificativasByActivityForContext_(
      atividadesV2_readSheetObjects_(justificativasSheet),
      ctx
    ),
    contexto: ctx,
    now: new Date()
  };
}

function atividadesV2_buildPreviousJustificationActionMeta_(atividade, contexto, cache) {
  var ctx = cache && cache.contexto ? cache.contexto : atividades_normalizePortalContext_(contexto || {});
  var idAtividade = String(atividade && atividade.ID_ATIVIDADE || '').trim();
  var existing = cache && cache.byActivity ? cache.byActivity[idAtividade] : null;
  if (existing) {
    return {
      podeJustificarAusenciaFutura: false,
      justificativaPreviaEnviada: true,
      idJustificativaPrevia: String(existing.ID_JUSTIFICATIVA || '').trim(),
      statusJustificativaPrevia: String(existing.STATUS_ANALISE || '').trim(),
      motivoJustificativaPreviaIndisponivel: 'JUSTIFICATIVA_ATIVA_EXISTENTE',
      mensagemJustificativaPrevia: 'Voce ja enviou uma justificativa para esta atividade. Acompanhe o status em Meu Vinculo - Minhas justificativas.'
    };
  }
  if (!atividadesV2_activityAllowsPreviousJustificativa_(atividade, ctx)) {
    return atividadesV2_previousJustificationUnavailable_('ATIVIDADE_NAO_JUSTIFICAVEL', '');
  }
  var temporal = atividadesV2_classificarPrazoJustificativaPrevia_(atividade, cache && cache.now || new Date());
  if (temporal.statusTemporalidade !== 'PREVIA') {
    return atividadesV2_previousJustificationUnavailable_('FORA_DA_JANELA_PREVIA', 'Justificativa previa disponivel apenas dentro da janela prevista.');
  }
  return {
    podeJustificarAusenciaFutura: true,
    justificativaPreviaEnviada: false,
    idJustificativaPrevia: '',
    statusJustificativaPrevia: '',
    motivoJustificativaPreviaIndisponivel: '',
    mensagemJustificativaPrevia: 'Voce esta enviando uma justificativa antes da atividade. Ela sera analisada caso a falta seja confirmada.'
  };
}

function atividadesV2_previousJustificationUnavailable_(reason, message) {
  return {
    podeJustificarAusenciaFutura: false,
    justificativaPreviaEnviada: false,
    idJustificativaPrevia: '',
    statusJustificativaPrevia: '',
    motivoJustificativaPreviaIndisponivel: reason,
    mensagemJustificativaPrevia: message || ''
  };
}

function atividadesV2_activityIsFutureForPreviousJustificativa_(atividade, refDate) {
  var date = atividades_parseDateOrNull_(atividade && atividade.DATA_ATIVIDADE);
  if (!date) return false;
  var now = atividades_parseDateOrNull_(refDate) || new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0).getTime() > now.getTime();
}

function atividadesV2_resolveJustificativaSubmissionBundle_(ss, payload, contexto) {
  var idRegistro = String(payload && (payload.idRegistroPresenca || payload.ID_REGISTRO_PRESENCA) || '').trim();
  var data = atividadesV2_readJustificativasPortalData_(ss);
  if (!idRegistro) return atividadesV2_resolvePreviousJustificativaSubmissionBundle_(data, payload, contexto);
  var presenca = data.presencasById[idRegistro];
  if (!presenca) throw atividadesV2_portalActionException_('REGISTRO_PRESENCA_NAO_ENCONTRADO', 'Registro de presenca nao encontrado.');
  if (!atividadesV2_presenceBelongsToOwnContext_(presenca, atividades_normalizePortalContext_(contexto || {}))) {
    throw atividadesV2_portalActionException_('PERMISSAO_NEGADA', 'Registro de presenca nao pertence ao usuario logado.');
  }
  if (!atividadesV2_isPresenceJustificavel_(presenca)) {
    throw atividadesV2_portalActionException_('REGISTRO_NAO_JUSTIFICAVEL', 'Registro de presenca nao permite justificativa.');
  }
  var atividade = data.atividadesById[String(presenca.ID_ATIVIDADE || '').trim()] || {};
  if (!atividadesV2_activityAllowsJustificativa_(atividade)) {
    throw atividadesV2_portalActionException_('ATIVIDADE_NAO_PERMITE_JUSTIFICATIVA', 'Atividade nao permite justificativa.');
  }
  var existingActive = atividadesV2_findActiveJustificativaForRegistro_(data.justificativas, idRegistro) ||
    atividadesV2_findActiveJustificativaForActivityAndPerson_(data.justificativas, presenca.ID_ATIVIDADE, contexto);
  if (existingActive) {
    var status = atividades_normalizeTextUpper_(existingActive.STATUS_ANALISE);
    if (status !== 'AJUSTE_SOLICITADO' && status !== 'PREVIA') {
      throw atividadesV2_portalActionException_('JUSTIFICATIVA_DUPLICADA', 'Ja existe justificativa ativa para este registro.');
    }
  }
  return {
    presencasSheet: data.presencasSheet,
    justificativasSheet: data.justificativasSheet,
    presenca: presenca,
    atividade: atividade,
    justificativas: data.justificativas,
    existingActive: existingActive,
    prazo: atividadesV2_classificarPrazoJustificativaPresenca_(presenca, atividade, new Date())
  };
}

function atividadesV2_resolvePreviousJustificativaSubmissionBundle_(data, payload, contexto) {
  var idAtividade = String(payload && (payload.idAtividade || payload.ID_ATIVIDADE) || '').trim();
  if (!idAtividade) throw atividadesV2_portalActionException_('ID_ATIVIDADE_OBRIGATORIO', 'ID_ATIVIDADE obrigatorio para justificativa previa.');
  var atividade = data.atividadesById[idAtividade];
  if (!atividade) throw atividadesV2_portalActionException_('ATIVIDADE_NAO_ENCONTRADA', 'Atividade nao encontrada para justificativa previa.');
  if (!atividadesV2_activityAllowsPreviousJustificativa_(atividade, contexto)) {
    throw atividadesV2_portalActionException_('ATIVIDADE_NAO_PERMITE_JUSTIFICATIVA_PREVIA', 'Atividade nao permite justificativa previa pelo Portal.');
  }
  var prazo = atividadesV2_classificarPrazoJustificativaPrevia_(atividade, new Date());
  if (prazo.statusTemporalidade !== 'PREVIA') {
    throw atividadesV2_portalActionException_('FORA_DA_JANELA_PREVIA', 'Justificativa previa fora da janela permitida para esta atividade.');
  }
  var existingActive = atividadesV2_findActiveJustificativaForActivityAndPerson_(data.justificativas, idAtividade, contexto);
  if (existingActive) {
    var status = atividades_normalizeTextUpper_(existingActive.STATUS_ANALISE);
    if (status !== 'AJUSTE_SOLICITADO') {
      throw atividadesV2_portalActionException_('JUSTIFICATIVA_DUPLICADA', 'Voce ja enviou uma justificativa para esta atividade. Acompanhe o status em Meu Vinculo - Minhas justificativas.');
    }
  }
  return {
    presencasSheet: data.presencasSheet,
    justificativasSheet: data.justificativasSheet,
    presenca: atividadesV2_buildVirtualPreviousPresence_(atividade, contexto),
    atividade: atividade,
    justificativas: data.justificativas,
    existingActive: existingActive,
    prazo: prazo,
    isPrevia: true
  };
}

function atividadesV2_resolveJustificativaAnalysisBundle_(ss, payload) {
  var idJustificativa = String(payload && (payload.idJustificativa || payload.ID_JUSTIFICATIVA) || '').trim();
  if (!idJustificativa) throw atividadesV2_portalActionException_('ID_JUSTIFICATIVA_OBRIGATORIO', 'ID_JUSTIFICATIVA obrigatorio.');
  var data = atividadesV2_readJustificativasPortalData_(ss);
  var justificativa = atividadesV2_findJustificativaById_(data.justificativas, idJustificativa);
  if (!justificativa) throw atividadesV2_portalActionException_('JUSTIFICATIVA_NAO_ENCONTRADA', 'Justificativa nao encontrada.');
  if (atividades_normalizeTextUpper_(justificativa.ATIVO || 'SIM') === 'NAO') {
    throw atividadesV2_portalActionException_('JUSTIFICATIVA_INATIVA', 'Justificativa inativa.');
  }
  var presenca = data.presencasById[String(justificativa.ID_REGISTRO_PRESENCA || '').trim()];
  if (!presenca) throw atividadesV2_portalActionException_('REGISTRO_PRESENCA_NAO_ENCONTRADO', 'Registro de presenca vinculado nao encontrado.');
  return {
    justificativasSheet: data.justificativasSheet,
    presencasSheet: data.presencasSheet,
    justificativa: justificativa,
    presenca: presenca
  };
}

function atividadesV2_readJustificativasPortalData_(ss) {
  var atividadesSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES);
  var presencasSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.PRESENCAS_REGISTROS);
  var justificativasSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.JUSTIFICATIVAS);
  atividadesV2_applyHeadersIfMissing_(presencasSheet, ATIVIDADES_V2_SCHEMA.PRESENCAS_REGISTROS);
  atividadesV2_applyHeadersIfMissing_(justificativasSheet, ATIVIDADES_V2_SCHEMA.JUSTIFICATIVAS);
  var atividades = atividadesV2_readSheetObjects_(atividadesSheet);
  var presencas = atividadesV2_readSheetObjects_(presencasSheet);
  var justificativas = atividadesV2_readSheetObjects_(justificativasSheet);
  return {
    atividadesSheet: atividadesSheet,
    presencasSheet: presencasSheet,
    justificativasSheet: justificativasSheet,
    atividades: atividades,
    presencas: presencas,
    justificativas: justificativas,
    atividadesById: atividadesV2_indexByField_(atividades, 'ID_ATIVIDADE'),
    presencasById: atividadesV2_indexByField_(presencas, 'ID_REGISTRO_PRESENCA')
  };
}

function atividadesV2_validateJustificativaSubmissionPayload_(payload, prazo) {
  var motivo = atividadesV2_normalizeJustificativaMotivo_(payload && (payload.motivoDeclarado || payload.motivoCategoria || payload.motivo));
  var descricao = atividades_sanitizePortalText_(payload && payload.descricaoJustificativa, 1500);
  var possuiDocumento = atividades_normalizeYesNoValue_(payload && payload.possuiDocumentoComprobatorio);
  var linkDocumento = atividades_sanitizePortalUrl_(payload && payload.linkDocumentoComprobatorio);
  if (!motivo) throw atividadesV2_portalActionException_('MOTIVO_OBRIGATORIO', 'Informe o motivo da justificativa.');
  if (ATIVIDADES_V2_JUSTIFICATIVAS_MOTIVOS.indexOf(motivo) === -1) {
    throw atividadesV2_portalActionException_('MOTIVO_INVALIDO', 'Motivo de justificativa invalido.');
  }
  if (!descricao) throw atividadesV2_portalActionException_('DESCRICAO_OBRIGATORIA', 'Informe a descricao da justificativa.');
  if (motivo === 'OUTRO' && descricao.length < 20) {
    throw atividadesV2_portalActionException_('DESCRICAO_OUTRO_INSUFICIENTE', 'Detalhe melhor a justificativa quando o motivo for OUTRO.');
  }
  if (prazo && prazo.envioForaDoPrazo === 'SIM' && !atividadesV2_isTruthyFlag_(payload && (payload.confirmouCienciaForaPrazo || payload.cienciaForaPrazo))) {
    throw atividadesV2_portalActionException_('CIENCIA_FORA_PRAZO_OBRIGATORIA', 'Confirme ciencia de que a justificativa esta fora do prazo.');
  }
  return {
    motivoDeclarado: motivo,
    descricaoJustificativa: descricao,
    possuiDocumentoComprobatorio: possuiDocumento,
    linkDocumentoComprobatorio: linkDocumento,
    observacoes: atividades_sanitizePortalText_(payload && payload.observacoes, 500)
  };
}

function atividadesV2_normalizeJustificativaMotivo_(value) {
  return atividades_normalizeTextUpper_(value).replace(/\s+/g, '_');
}

function atividadesV2_assertJustificativaDocumentoRequirement_(normalized) {
  if (normalized && normalized.possuiDocumentoComprobatorio === 'SIM' && !normalized.linkDocumentoComprobatorio) {
    throw atividadesV2_portalActionException_('DOCUMENTO_OBRIGATORIO', 'Envie o comprovante ou informe o link do documento comprobatorio.');
  }
}

function atividadesV2_processJustificativaDocumentoUpload_(ss, payload, bundle, idJustificativa) {
  var file = atividadesV2_extractJustificativaUpload_(payload);
  if (!file) return null;
  atividadesV2_assertJustificativaUploadAllowed_(file);
  var rootFolderId = atividadesV2_getJustificativasRootFolderId_();
  if (!rootFolderId) {
    throw atividadesV2_portalActionException_(
      'PASTA_JUSTIFICATIVAS_NAO_CONFIGURADA',
      'Configure a pasta raiz de justificativas antes de receber comprovantes pelo Portal.'
    );
  }
  var root = DriveApp.getFolderById(rootFolderId);
  var activityIdentity = atividadesV2_resolveActivityIdentity_(Object.assign({}, bundle.atividade || {}, bundle.presenca || {}));
  var cycleFolderName = activityIdentity.ano + '-' + activityIdentity.semestre;
  var activityFolderName = String(bundle.presenca.ID_ATIVIDADE || bundle.atividade.ID_ATIVIDADE || 'ATV').trim();
  var folder = atividadesV2_getOrCreateSubfolder_(atividadesV2_getOrCreateSubfolder_(root, cycleFolderName), activityFolderName);
  var originalName = file.nomeArquivo || 'comprovante.pdf';
  var fileName = atividadesV2_buildNomeComprovanteJustificativa_(bundle, idJustificativa, originalName);
  var resolvedName = atividadesV2_resolveMaterialFileName_(folder, fileName);
  var created = atividadesV2_createMaterialFileFromBase64_(folder, resolvedName.nomeArquivo, file.conteudoBase64, file.mimeType);
  atividadesV2_appendV2Log_(ss, {
    FLUXO: 'JUSTIFICATIVAS_PORTAL_V2',
    ACAO: 'UPLOAD_COMPROVANTE_JUSTIFICATIVA',
    NIVEL: 'INFO',
    STATUS: 'OK',
    ID_ATIVIDADE: bundle.presenca.ID_ATIVIDADE || '',
    ID_ENTIDADE: idJustificativa,
    TIPO_ENTIDADE: 'JUSTIFICATIVA',
    MENSAGEM: 'Comprovante de justificativa salvo no Drive.',
    DETALHES_JSON: atividadesV2_safeLogData_({
      idJustificativa: idJustificativa,
      nomeArquivo: created.getName(),
      mimeType: created.getMimeType()
    })
  });
  return {
    fileId: created.getId(),
    nomeArquivo: created.getName(),
    mimeType: created.getMimeType(),
    linkDocumentoComprobatorio: created.getUrl()
  };
}

function atividadesV2_extractJustificativaUpload_(payload) {
  var source = payload && (payload.documentoComprobatorio || payload.arquivoComprovante || payload.comprovante) || {};
  var base64 = String(source.conteudoBase64 || source.base64 || payload && (payload.conteudoBase64Documento || payload.base64Documento) || '').trim();
  if (!base64) return null;
  return {
    conteudoBase64: base64,
    nomeArquivo: String(source.nomeArquivo || source.name || payload && payload.nomeArquivoDocumento || 'comprovante.pdf').trim(),
    mimeType: String(source.mimeType || source.type || payload && payload.mimeTypeDocumento || '').trim()
  };
}

function atividadesV2_assertJustificativaUploadAllowed_(file) {
  var name = String(file && file.nomeArquivo || '').trim();
  var mime = String(file && file.mimeType || '').trim();
  var ext = atividadesV2_getFileExtension_(name);
  var allowedExt = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
  var allowedMime = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  if (allowedExt.indexOf(ext) === -1 && allowedMime.indexOf(mime) === -1) {
    throw atividadesV2_portalActionException_('TIPO_COMPROVANTE_INVALIDO', 'Envie comprovante em PDF, JPG, PNG, DOC ou DOCX.');
  }
  var size = Math.floor(String(file.conteudoBase64 || '').replace(/^data:[^;]+;base64,/, '').length * 0.75);
  if (size > ATIVIDADES_V2_JUSTIFICATIVAS_MAX_UPLOAD_BYTES) {
    throw atividadesV2_portalActionException_('COMPROVANTE_MUITO_GRANDE', 'O comprovante excede o limite de 10 MB.');
  }
}

function atividadesV2_getJustificativasRootFolderId_() {
  try {
    var props = PropertiesService.getScriptProperties();
    var byProp = String(
      props.getProperty(ATIVIDADES_V2_JUSTIFICATIVAS_ROOT_FOLDER_PROP) ||
      props.getProperty('JUSTIFICATIVAS_PASTA_RAIZ_ID') ||
      ''
    ).trim();
    if (byProp) return byProp;
  } catch (err) {
    // Continua para tentativa via Registry.
  }
  try {
    var entry = atividades_getRegistryEntryByKey_('JUSTIFICATIVAS_PASTA_RAIZ') ||
      atividades_getRegistryEntryByKey_('ATIVIDADES_V2_JUSTIFICATIVAS_PASTA_RAIZ');
    return entry ? String(entry.id || '').trim() : '';
  } catch (registryErr) {
    return '';
  }
}

function atividadesV2_getOrCreateSubfolder_(parent, name) {
  var folderName = atividadesV2_sanitizeDriveFileName_(name || 'JUSTIFICATIVAS');
  var existing = parent.getFoldersByName(folderName);
  return existing.hasNext() ? existing.next() : parent.createFolder(folderName);
}

function atividadesV2_buildNomeComprovanteJustificativa_(bundle, idJustificativa, originalName) {
  var ext = atividadesV2_getFileExtension_(originalName) || '.pdf';
  var person = bundle.presenca.NOME_PARTICIPANTE || bundle.presenca.RGA || bundle.presenca.ID_PESSOA || 'membro';
  var base = [
    atividadesV2_sanitizeDriveFileName_(String(person || '').slice(0, 80)),
    atividadesV2_sanitizeDriveFileName_(String(bundle.presenca.RGA || bundle.presenca.ID_PESSOA || 'sem-id').slice(0, 60)),
    atividadesV2_sanitizeDriveFileName_(idJustificativa || 'JUS')
  ].join(' - ');
  return atividadesV2_sanitizeDriveFileName_(base).slice(0, 180) + ext;
}

function atividadesV2_buildJustificativaPortalRow_(opts) {
  var p = opts.presenca;
  var a = opts.atividade || {};
  var existing = opts.existing || {};
  var payload = opts.payload;
  var prazo = opts.prazo;
  return {
    ID_JUSTIFICATIVA: opts.idJustificativa,
    ID_REGISTRO_PRESENCA: p.ID_REGISTRO_PRESENCA || '',
    ID_ATIVIDADE: p.ID_ATIVIDADE,
    CICLO: p.CICLO || a.CICLO || '',
    ID_PESSOA: p.ID_PESSOA || existing.ID_PESSOA || '',
    RGA: p.RGA || existing.RGA || '',
    NOME_MEMBRO: p.NOME_PARTICIPANTE || existing.NOME_MEMBRO || '',
    EMAIL_MEMBRO: p.EMAIL_PARTICIPANTE || existing.EMAIL_MEMBRO || '',
    DATA_ATIVIDADE: p.DATA_ATIVIDADE || a.DATA_ATIVIDADE || '',
    TITULO_ATIVIDADE: p.TITULO_ATIVIDADE || a.TITULO_PUBLICO || a.TITULO || '',
    DATA_LIMITE_JUSTIFICATIVA: prazo.deadline || existing.DATA_LIMITE_JUSTIFICATIVA || '',
    DATA_ENVIO: opts.now,
    MOTIVO_DECLARADO: payload.motivoDeclarado,
    DESCRICAO_JUSTIFICATIVA: payload.descricaoJustificativa,
    POSSUI_DOCUMENTO_COMPROBATORIO: payload.possuiDocumentoComprobatorio,
    LINK_DOCUMENTO_COMPROBATORIO: payload.linkDocumentoComprobatorio,
    STATUS_ANALISE: opts.prazo && opts.prazo.statusAnaliseInicial || 'ENVIADA',
    DATA_ANALISE: '',
    ANALISADO_POR: '',
    DECISAO_APLICADA_NA_PRESENCA: opts.prazo && opts.prazo.statusAnaliseInicial === 'PREVIA' ? 'NAO_APLICADA' : '',
    VALOR_ANTES: existing.VALOR_ANTES || '',
    VALOR_DEPOIS: existing.VALOR_DEPOIS || '',
    OBSERVACAO_PUBLICA: existing.OBSERVACAO_PUBLICA || '',
    OBSERVACOES_INTERNAS: atividadesV2_joinObservacoes_(
      atividadesV2_joinObservacoes_(existing.OBSERVACOES_INTERNAS, payload.observacoes),
      opts.observacaoForaPrazo
    ),
    ORIGEM_ENVIO: 'PORTAL',
    CRIADO_EM: existing.CRIADO_EM || opts.now,
    ATUALIZADO_EM: opts.now,
    ATIVO: 'SIM'
  };
}

function atividadesV2_classificarPrazoJustificativaPresenca_(presenca, atividade, refDate) {
  var deadline = atividadesV2_calcularPrazoJustificativaV2_(presenca, atividade);
  var now = atividades_parseDateOrNull_(refDate) || new Date();
  var fora = deadline && now.getTime() > deadline.getTime();
  return {
    deadline: deadline,
    statusPrazo: deadline ? (fora ? 'FORA_DO_PRAZO' : 'DENTRO_DO_PRAZO') : 'SEM_PRAZO',
    envioForaDoPrazo: fora ? 'SIM' : 'NAO',
    mensagemPortal: fora
      ? 'Esta justificativa esta fora do prazo previsto e dependera de analise da Diretoria/Secretaria.'
      : ''
  };
}

function atividadesV2_classificarPrazoJustificativaPrevia_(atividade, refDate) {
  var sentAt = atividades_parseDateOrNull_(refDate) || new Date();
  var lookup = atividadesV2_buildActivityLookupForJustificativaV2_(atividade, null);
  var temporalidade = typeof atividades_classificarTemporalidadeJustificativa_ === 'function'
    ? atividades_classificarTemporalidadeJustificativa_(sentAt, lookup)
    : 'PREVIA';
  return {
    deadline: atividadesV2_calcularPrazoJustificativaV2_(null, atividade),
    statusPrazo: 'JUSTIFICATIVA_PREVIA',
    statusTemporalidade: temporalidade,
    statusAnaliseInicial: 'PREVIA',
    envioForaDoPrazo: 'NAO',
    mensagemPortal: 'Justificativa previa registrada. Ela sera analisada caso a falta seja confirmada na chamada.'
  };
}

function atividadesV2_classificarPrazoJustificativaRecord_(record, refDate) {
  var deadline = atividades_parseDateOrNull_(record && record.DATA_LIMITE_JUSTIFICATIVA);
  var sentAt = atividades_parseDateOrNull_(record && record.DATA_ENVIO) || atividades_parseDateOrNull_(refDate) || new Date();
  var explicit = atividadesV2_observacoesIndicamForaPrazo_(record);
  var fora = explicit || (deadline && sentAt.getTime() > deadline.getTime());
  return {
    deadline: deadline,
    statusPrazo: deadline ? (fora ? 'FORA_DO_PRAZO' : 'DENTRO_DO_PRAZO') : (fora ? 'FORA_DO_PRAZO' : 'SEM_PRAZO'),
    envioForaDoPrazo: fora ? 'SIM' : 'NAO',
    mensagemPortal: fora ? 'Justificativa enviada fora do prazo.' : ''
  };
}

function atividadesV2_calcularPrazoJustificativaV2_(presenca, atividade) {
  var activityLookupItem = atividadesV2_buildActivityLookupForJustificativaV2_(atividade, presenca);
  var deadline = typeof atividades_calculateJustificativaDeadline_ === 'function'
    ? atividades_calculateJustificativaDeadline_(activityLookupItem)
    : null;
  if (deadline) return deadline;
  var base = atividades_parseDateOrNull_(presenca && presenca.DATA_ATIVIDADE || atividade && atividade.DATA_ATIVIDADE);
  return base ? new Date(base.getTime() + (48 * 60 * 60 * 1000)) : null;
}

function atividadesV2_buildActivityLookupForJustificativaV2_(atividade, presenca) {
  return {
    dataAtividade: atividades_parseDateOrNull_(presenca && presenca.DATA_ATIVIDADE || atividade && atividade.DATA_ATIVIDADE),
    atividadeRecord: Object.assign({}, atividade || {}, {
      DATA_ATIVIDADE: atividade && atividade.DATA_ATIVIDADE || presenca && presenca.DATA_ATIVIDADE,
      HORARIO_FIM: atividade && atividade.HORARIO_FIM || ''
    })
  };
}

function atividadesV2_observacoesIndicamForaPrazo_(record) {
  var text = atividades_normalizeTextUpper_([
    record && record.OBSERVACOES_INTERNAS,
    record && record.OBSERVACAO_PUBLICA
  ].join(' '));
  return text.indexOf('FORA DO PRAZO') >= 0 || text.indexOf('FORA_DO_PRAZO') >= 0;
}

function atividadesV2_isPresenceJustificavel_(record) {
  if (!record || atividades_normalizeTextUpper_(record.ATIVO || 'SIM') === 'NAO') return false;
  if (!atividades_isTruthySim_(record.CONTA_FALTA)) return false;
  var status = atividades_normalizeTextUpper_(record.STATUS_PRESENCA || record.CODIGO_PRESENCA);
  if (['FALTA', 'F'].indexOf(status) === -1) return false;
  var statusJust = atividades_normalizeTextUpper_(record.STATUS_JUSTIFICATIVA || '');
  return ATIVIDADES_V2_JUSTIFICATIVAS_STATUS_FINAIS.indexOf(statusJust) === -1;
}

function atividadesV2_activityAllowsJustificativa_(atividade) {
  if (!atividade || !String(atividade.ID_ATIVIDADE || '').trim()) return true;
  return atividades_normalizeTextUpper_(atividade.PERMITE_JUSTIFICATIVA || atividade.EXIGE_JUSTIFICATIVA || 'SIM') !== 'NAO';
}

function atividadesV2_activityAllowsPreviousJustificativa_(atividade, contexto) {
  if (!atividade || atividades_normalizeTextUpper_(atividade.ATIVO || 'SIM') === 'NAO') return false;
  if (['CANCELADA', 'CANCELADO', 'ARQUIVADA', 'ARQUIVADO'].indexOf(atividades_normalizeTextUpper_(atividade.STATUS_OPERACIONAL)) >= 0) return false;
  if (!atividades_isTruthySim_(atividade.CONTA_PRESENCA) && !atividades_isTruthySim_(atividades_getEffectiveContaFaltaForActivity_(atividade))) return false;
  if (!atividadesV2_activityAllowsJustificativa_(atividade)) return false;
  var ctx = atividades_normalizePortalContext_(contexto || {});
  if (!ctx.idPessoa && !ctx.rga && !ctx.email) return false;
  return atividadesV2_activityIsFutureForPreviousJustificativa_(atividade, new Date());
}

function atividadesV2_presenceBelongsToContext_(record, ctx) {
  if (atividades_isPrivilegedPortalProfile_(ctx)) return true;
  return atividadesV2_presenceBelongsToOwnContext_(record, ctx);
}

function atividadesV2_presenceBelongsToOwnContext_(record, ctx) {
  var idPessoa = String(record && record.ID_PESSOA || '').trim();
  var rga = String(record && record.RGA || '').trim().toLowerCase();
  var email = String(record && record.EMAIL_PARTICIPANTE || '').trim().toLowerCase();
  var ctxIdPessoa = String(ctx && ctx.idPessoa || '').trim();
  var ctxRga = String(ctx && ctx.rga || '').trim().toLowerCase();
  var ctxEmail = String(ctx && ctx.email || '').trim().toLowerCase();
  if (!ctxIdPessoa && !ctxRga && !ctxEmail) return false;
  if (idPessoa && ctxIdPessoa && idPessoa === ctxIdPessoa) return true;
  if (rga && ctxRga && rga === ctxRga) return true;
  return !!email && !!ctxEmail && email === ctxEmail;
}

function atividadesV2_justificativaBelongsToContext_(record, ctx) {
  if (atividades_isPrivilegedPortalProfile_(ctx)) return true;
  return atividadesV2_justificativaBelongsToOwnContext_(record, ctx);
}

function atividadesV2_justificativaBelongsToOwnContext_(record, ctx) {
  var idPessoa = String(record && record.ID_PESSOA || '').trim();
  var rga = String(record && record.RGA || '').trim().toLowerCase();
  var email = String(record && record.EMAIL_MEMBRO || '').trim().toLowerCase();
  var ctxIdPessoa = String(ctx && ctx.idPessoa || '').trim();
  var ctxRga = String(ctx && ctx.rga || '').trim().toLowerCase();
  var ctxEmail = String(ctx && ctx.email || '').trim().toLowerCase();
  if (!ctxIdPessoa && !ctxRga && !ctxEmail) return false;
  if (idPessoa && ctxIdPessoa && idPessoa === ctxIdPessoa) return true;
  if (rga && ctxRga && rga === ctxRga) return true;
  return !!email && !!ctxEmail && email === ctxEmail;
}

function atividadesV2_indexActiveJustificativasByRegistro_(records) {
  var out = {};
  (records || []).forEach(function(record) {
    if (atividades_normalizeTextUpper_(record.ATIVO || 'SIM') === 'NAO') return;
    var id = String(record.ID_REGISTRO_PRESENCA || '').trim();
    if (id && !out[id]) out[id] = record;
  });
  return out;
}

function atividadesV2_indexActiveJustificativasByActivityForContext_(records, contexto) {
  var ctx = atividades_normalizePortalContext_(contexto || {});
  var out = {};
  (records || []).forEach(function(record) {
    if (!atividadesV2_isActiveJustificativaRecord_(record)) return;
    if (!atividadesV2_justificativaBelongsToContext_(record, ctx)) return;
    var idAtividade = String(record.ID_ATIVIDADE || '').trim();
    if (idAtividade && !out[idAtividade]) out[idAtividade] = record;
  });
  return out;
}

function atividadesV2_indexActiveJustificativasByActivityForOwnContext_(records, contexto) {
  var ctx = atividades_normalizePortalContext_(contexto || {});
  var out = {};
  (records || []).forEach(function(record) {
    if (!atividadesV2_isActiveJustificativaRecord_(record)) return;
    if (!atividadesV2_justificativaBelongsToOwnContext_(record, ctx)) return;
    var idAtividade = String(record.ID_ATIVIDADE || '').trim();
    if (idAtividade && !out[idAtividade]) out[idAtividade] = record;
  });
  return out;
}

function atividadesV2_isActiveJustificativaRecord_(record) {
  if (atividades_normalizeTextUpper_(record && record.ATIVO || 'SIM') === 'NAO') return false;
  return atividades_normalizeTextUpper_(record && record.STATUS_ANALISE) !== 'CANCELADA';
}

function atividadesV2_findActiveJustificativaForRegistro_(records, idRegistro) {
  var wanted = String(idRegistro || '').trim();
  for (var i = 0; i < (records || []).length; i++) {
    var record = records[i];
    if (String(record.ID_REGISTRO_PRESENCA || '').trim() === wanted &&
        atividadesV2_isActiveJustificativaRecord_(record)) {
      return record;
    }
  }
  return null;
}

function atividadesV2_findActiveJustificativaForActivityAndPerson_(records, idAtividade, contexto) {
  var wanted = String(idAtividade || '').trim();
  var ctx = atividades_normalizePortalContext_(contexto || {});
  for (var i = 0; i < (records || []).length; i++) {
    var record = records[i];
    if (String(record.ID_ATIVIDADE || '').trim() === wanted &&
        atividadesV2_isActiveJustificativaRecord_(record) &&
        atividadesV2_justificativaBelongsToOwnContext_(record, ctx)) {
      return record;
    }
  }
  return null;
}

function atividadesV2_buildVirtualPreviousPresence_(atividade, contexto) {
  var ctx = atividades_normalizePortalContext_(contexto || {});
  return {
    ID_REGISTRO_PRESENCA: '',
    ID_ATIVIDADE: atividade.ID_ATIVIDADE || '',
    CICLO: atividade.CICLO || '',
    ID_PESSOA: ctx.idPessoa || '',
    RGA: ctx.rga || '',
    NOME_PARTICIPANTE: ctx.nome || ctx.nomeUsuario || '',
    EMAIL_PARTICIPANTE: ctx.email || '',
    DATA_ATIVIDADE: atividade.DATA_ATIVIDADE || '',
    TITULO_ATIVIDADE: atividade.TITULO_PUBLICO || atividade.TITULO || '',
    STATUS_PRESENCA: '',
    CONTA_FALTA: atividade.CONTA_FALTA || 'SIM'
  };
}

function atividadesV2_findPresenceForPreviousJustificativa_(presencas, justificativa) {
  for (var i = 0; i < (presencas || []).length; i++) {
    var presenca = presencas[i];
    if (!atividadesV2_isPresenceJustificavel_(presenca)) continue;
    if (String(presenca.ID_ATIVIDADE || '').trim() !== String(justificativa.ID_ATIVIDADE || '').trim()) continue;
    if (atividadesV2_presenceMatchesJustificativaPerson_(presenca, justificativa)) return presenca;
  }
  return null;
}

function atividadesV2_presenceMatchesJustificativaPerson_(presenca, justificativa) {
  var idPessoa = String(justificativa.ID_PESSOA || '').trim();
  var rga = String(justificativa.RGA || '').trim().toLowerCase();
  var email = String(justificativa.EMAIL_MEMBRO || '').trim().toLowerCase();
  if (idPessoa && String(presenca.ID_PESSOA || '').trim() === idPessoa) return true;
  if (rga && String(presenca.RGA || '').trim().toLowerCase() === rga) return true;
  return !!email && String(presenca.EMAIL_PARTICIPANTE || '').trim().toLowerCase() === email;
}

function atividadesV2_findJustificativaById_(records, idJustificativa) {
  var wanted = String(idJustificativa || '').trim();
  for (var i = 0; i < (records || []).length; i++) {
    if (String(records[i].ID_JUSTIFICATIVA || '').trim() === wanted) return records[i];
  }
  return null;
}

function atividadesV2_buildNextJustificativaIdForRecord_(records, presenca, atividade) {
  var identity = atividadesV2_resolveActivityIdentity_(Object.assign({}, atividade || {}, presenca || {}));
  var idReferencia = presenca.ID_PESSOA || presenca.RGA || presenca.ID_REFERENCIA || presenca.ID_REGISTRO_PRESENCA;
  var base = 'JUS-' + identity.ano + '-' + identity.semestre + '-' + identity.sequencial + '-' + atividadesV2_sanitizeIdToken_(idReferencia || 'SEM_REFERENCIA') + '-';
  var max = 0;
  (records || []).forEach(function(record) {
    var id = String(record.ID_JUSTIFICATIVA || '').trim();
    if (id.indexOf(base) !== 0) return;
    var n = Number(id.slice(base.length));
    if (isFinite(n) && n > max) max = n;
  });
  return base + atividadesV2_padNumber_(max + 1, 2);
}

function atividadesV2_normalizeJustificativaDecision_(value) {
  var decision = atividades_normalizeTextUpper_(value);
  var allowed = ['DEFERIR', 'ABONAR', 'INDEFERIR', 'SOLICITAR_AJUSTE'];
  if (allowed.indexOf(decision) === -1) {
    throw atividadesV2_portalActionException_('DECISAO_INVALIDA', 'Decisao de justificativa invalida.');
  }
  return decision;
}

function atividadesV2_decisionEffectForJustificativa_(decision) {
  var map = {
    DEFERIR: {
      statusAnalise: 'DEFERIDA',
      decisaoAplicada: 'FALTA_JUSTIFICADA',
      valorDepois: 'FALTA_JUSTIFICADA',
      statusPresenca: 'JUSTIFICADA'
    },
    ABONAR: {
      statusAnalise: 'ABONADA',
      decisaoAplicada: 'FALTA_ABONADA',
      valorDepois: 'FALTA_ABONADA',
      statusPresenca: 'ABONADA'
    },
    INDEFERIR: {
      statusAnalise: 'INDEFERIDA',
      decisaoAplicada: 'MANTER_FALTA',
      valorDepois: 'FALTA',
      statusPresenca: 'FALTA'
    },
    SOLICITAR_AJUSTE: {
      statusAnalise: 'AJUSTE_SOLICITADO',
      decisaoAplicada: '',
      valorDepois: '',
      statusPresenca: ''
    }
  };
  return map[decision];
}

function atividadesV2_presenceValueBeforeJustificativa_(presenca) {
  var status = atividades_normalizeTextUpper_(presenca && presenca.STATUS_PRESENCA);
  if (status === 'JUSTIFICADA') return 'FALTA_JUSTIFICADA';
  if (status === 'ABONADA') return 'FALTA_ABONADA';
  if (status === 'PRESENTE_PRESENCIAL' || status === 'PRESENTE_REMOTO') return 'PRESENCA';
  if (status === 'NAO_SE_APLICA') return 'NAO_APLICAVEL';
  return 'FALTA';
}

function atividadesV2_mapFaltaJustificavelPortal_(record, atividade) {
  var prazo = atividadesV2_classificarPrazoJustificativaPresenca_(record, atividade || {}, new Date());
  return {
    idRegistroPresenca: String(record.ID_REGISTRO_PRESENCA || '').trim(),
    idAtividade: String(record.ID_ATIVIDADE || '').trim(),
    idPessoa: String(record.ID_PESSOA || '').trim(),
    rga: String(record.RGA || '').trim(),
    dataAtividade: atividades_formatPortalDateIso_(record.DATA_ATIVIDADE),
    tituloPublico: atividades_sanitizePortalText_(record.TITULO_ATIVIDADE || atividade && (atividade.TITULO_PUBLICO || atividade.TITULO), 240),
    statusPresenca: String(record.STATUS_PRESENCA || '').trim(),
    dataLimiteJustificativa: atividades_formatPortalDateIso_(prazo.deadline),
    statusPrazo: prazo.statusPrazo,
    envioForaDoPrazo: prazo.envioForaDoPrazo,
    podeEnviarJustificativa: true,
    exigeCienciaForaPrazo: prazo.envioForaDoPrazo === 'SIM',
    mensagemPortal: prazo.mensagemPortal
  };
}

function atividadesV2_mapJustificativaMembroPortal_(record) {
  var prazo = atividadesV2_classificarPrazoJustificativaRecord_(record, new Date());
  return {
    idJustificativa: String(record.ID_JUSTIFICATIVA || '').trim(),
    idRegistroPresenca: String(record.ID_REGISTRO_PRESENCA || '').trim(),
    idAtividade: String(record.ID_ATIVIDADE || '').trim(),
    idPessoa: String(record.ID_PESSOA || '').trim(),
    rga: String(record.RGA || '').trim(),
    dataAtividade: atividades_formatPortalDateIso_(record.DATA_ATIVIDADE),
    tituloPublico: atividades_sanitizePortalText_(record.TITULO_ATIVIDADE, 240),
    motivoCategoria: atividades_sanitizePortalText_(record.MOTIVO_DECLARADO, 180),
    statusJustificativa: String(record.STATUS_ANALISE || '').trim(),
    statusPublico: String(record.STATUS_ANALISE || '').trim(),
    decisaoAplicada: String(record.DECISAO_APLICADA_NA_PRESENCA || '').trim(),
    enviadaEm: atividades_formatPortalDateIso_(record.DATA_ENVIO),
    dataLimiteJustificativa: atividades_formatPortalDateIso_(record.DATA_LIMITE_JUSTIFICATIVA),
    statusPrazo: prazo.statusPrazo,
    envioForaDoPrazo: prazo.envioForaDoPrazo,
    podeReenviarAjuste: atividades_normalizeTextUpper_(record.STATUS_ANALISE) === 'AJUSTE_SOLICITADO',
    observacaoPublica: atividades_sanitizePortalText_(record.OBSERVACAO_PUBLICA, 500),
    mensagemPortal: prazo.mensagemPortal,
    ultimaAtualizacao: String(record.ATUALIZADO_EM || '').trim()
  };
}

function atividadesV2_mapJustificativaGestaoPortal_(record) {
  var item = atividadesV2_mapJustificativaMembroPortal_(record);
  item.nomeMembro = atividades_sanitizePortalText_(record.NOME_MEMBRO, 180);
  item.descricaoJustificativa = atividades_sanitizePortalText_(record.DESCRICAO_JUSTIFICATIVA, 1200);
  item.possuiDocumentoComprobatorio = String(record.POSSUI_DOCUMENTO_COMPROBATORIO || '').trim();
  item.linkDocumentoComprobatorio = atividades_sanitizePortalUrl_(record.LINK_DOCUMENTO_COMPROBATORIO);
  item.acoesGestao = {
    podeDeferir: true,
    podeAbonar: true,
    podeIndeferir: true,
    podeSolicitarAjuste: true
  };
  return item;
}

function atividadesV2_sortJustificativasPortalByDate_(a, b) {
  var da = atividades_parseDateOrNull_(a.dataAtividade || a.enviadaEm);
  var db = atividades_parseDateOrNull_(b.dataAtividade || b.enviadaEm);
  var ta = da ? da.getTime() : Number.MAX_SAFE_INTEGER;
  var tb = db ? db.getTime() : Number.MAX_SAFE_INTEGER;
  if (ta !== tb) return tb - ta;
  return String(a.idJustificativa || a.idRegistroPresenca || '').localeCompare(String(b.idJustificativa || b.idRegistroPresenca || ''));
}

function atividadesV2_portalRunJustificativaAction_(tipoAcao, payload, contexto, callback) {
  var action = atividadesV2_portalJustificativaActionStart_(tipoAcao, payload, contexto);
  try {
    var result = atividadesV2_portalWithLock_('JUSTIFICATIVAS_PORTAL_V2', function(ss) {
      var data = callback(ss, action);
      atividadesV2_portalJustificativaActionSuccess_(ss, action, data);
      return data;
    });
    atividadesV2_refreshJustificativasPortalViews_();
    atividadesV2_invalidateJustificativasPortalCaches_(action.contexto, result);
    atividadesV2_mailAttachQueueResult_(
      result,
      atividadesV2_mailQueuePortalAction_(tipoAcao, action.payload, action.contexto, result)
    );
    return {
      ok: true,
      message: 'Justificativa processada com sucesso na base DEV.',
      data: result
    };
  } catch (err) {
    try {
      atividadesV2_portalJustificativaActionError_(atividadesV2_getDatabaseSpreadsheetDev_(), action, err);
    } catch (logErr) {}
    return atividadesV2_portalActionErrorResponse_(err);
  }
}

function atividadesV2_portalJustificativaActionStart_(tipoAcao, payload, contexto) {
  var ctx = atividades_normalizePortalContext_(contexto || {});
  return {
    idAcao: atividadesV2_buildDeterministicId_('JACT', [tipoAcao, new Date().getTime(), ctx.email || ctx.idPessoa || ctx.rga || ctx.perfil]),
    tipoAcao: tipoAcao,
    payload: payload || {},
    contexto: ctx,
    startedAt: new Date()
  };
}

function atividadesV2_portalJustificativaActionSuccess_(ss, acao, resultado) {
  atividadesV2_portalAppendAcao_(ss, atividadesV2_buildPortalJustificativaActionRow_(acao, 'CONCLUIDO', resultado, null));
  atividadesV2_appendV2Log_(ss, {
    FLUXO: 'JUSTIFICATIVAS_PORTAL_V2',
    ACAO: acao.tipoAcao,
    NIVEL: 'INFO',
    STATUS: 'OK',
    ID_ATIVIDADE: resultado && resultado.idAtividade || acao.payload.idAtividade || '',
    MENSAGEM: 'Acao de justificativa processada pelo Portal GEAPA DEV.',
    DETALHES_JSON: atividadesV2_safeLogData_({
      idJustificativa: resultado && resultado.idJustificativa || '',
      idRegistroPresenca: resultado && resultado.idRegistroPresenca || '',
      status: resultado && (resultado.statusAnalise || resultado.decisaoAplicada) || '',
      envioForaDoPrazo: resultado && resultado.envioForaDoPrazo || ''
    })
  });
}

function atividadesV2_portalJustificativaActionError_(ss, acao, erro) {
  atividadesV2_portalAppendAcao_(ss, atividadesV2_buildPortalJustificativaActionRow_(acao, 'ERRO', null, erro));
  atividadesV2_appendV2Log_(ss, {
    FLUXO: 'JUSTIFICATIVAS_PORTAL_V2',
    ACAO: acao.tipoAcao,
    NIVEL: 'ERRO',
    STATUS: 'ERRO',
    ID_ATIVIDADE: acao.payload.idAtividade || '',
    MENSAGEM: 'Falha em acao de justificativa pelo Portal GEAPA DEV.',
    DETALHES_JSON: atividadesV2_safeLogData_({ erro: atividadesV2_errorMessage_(erro).slice(0, 300) })
  });
}

function atividadesV2_buildPortalJustificativaActionRow_(acao, status, resultado, erro) {
  var payload = atividadesV2_sanitizeJustificativaActionPayload_(acao.payload);
  return {
    ID_ACAO_PORTAL: acao.idAcao,
    DATA_HORA: acao.startedAt,
    USUARIO_EMAIL: acao.contexto.email || '',
    USUARIO_NOME: acao.contexto.nome || '',
    PERFIL_USUARIO: acao.contexto.perfil || '',
    TIPO_ACAO: acao.tipoAcao,
    ID_ATIVIDADE: resultado && resultado.idAtividade || acao.payload.idAtividade || '',
    ID_ENTIDADE: resultado && resultado.idJustificativa || acao.payload.idJustificativa || acao.payload.idRegistroPresenca || '',
    TIPO_ENTIDADE: 'JUSTIFICATIVA',
    PAYLOAD_JSON: atividadesV2_safeLogData_(payload),
    STATUS_PROCESSAMENTO: status,
    RESULTADO_JSON: resultado ? atividadesV2_safeLogData_({
      ok: true,
      status: resultado.statusAnalise || resultado.decisaoAplicada || '',
      envioForaDoPrazo: resultado.envioForaDoPrazo || ''
    }) : '',
    ERRO_CODIGO: erro && (erro.code || erro.errorCode) || '',
    ERRO_MENSAGEM: erro ? atividadesV2_errorMessage_(erro).slice(0, 300) : '',
    PROCESSADO_EM: new Date(),
    PROCESSADO_POR: atividadesV2_justificativaActorToken_(acao.contexto),
    OBSERVACOES: 'Acao de justificativa processada pelo Portal GEAPA DEV.',
    ATIVO: 'SIM'
  };
}

function atividadesV2_sanitizeJustificativaActionPayload_(payload) {
  return {
    idJustificativa: payload && payload.idJustificativa || '',
    idRegistroPresenca: payload && payload.idRegistroPresenca || '',
    idAtividade: payload && payload.idAtividade || '',
    motivoDeclarado: atividades_sanitizePortalText_(payload && payload.motivoDeclarado, 120),
    decisao: payload && payload.decisao || '',
    possuiDocumentoComprobatorio: payload && payload.possuiDocumentoComprobatorio || '',
    linkDocumentoComprobatorio: atividades_sanitizePortalUrl_(payload && payload.linkDocumentoComprobatorio),
    confirmouCienciaForaPrazo: atividadesV2_isTruthyFlag_(payload && (payload.confirmouCienciaForaPrazo || payload.cienciaForaPrazo)) ? 'SIM' : 'NAO'
  };
}

function atividadesV2_refreshJustificativasPortalViews_() {
  var result = atividadesV2_atualizarViewsPortal_({ dryRun: false, stopOnError: false });
  if (!result.ok) {
    Logger.log('GEAPA-ATIVIDADES-V2-PORTAL justificativas: views atualizadas com avisos/erros: ' + atividadesV2_safeLogData_(result));
  }
}

function atividadesV2_invalidateJustificativasPortalCaches_(contexto, result) {
  portalCacheRemove_(portalCacheBuildKey_('pendencias_justificativas', 'gestao'));
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
    var token = portalCacheContextToken_(atividades_normalizePortalContext_(ctx || {}));
    portalCacheRemove_(portalCacheBuildKey_('minhas_justificativas', token));
    portalCacheRemove_(portalCacheBuildKey_('frequencia', token));
    portalCacheRemove_(portalCacheBuildKey_('frequencia_detalhada_v2', token));
    portalCacheRemove_(portalCacheBuildKey_('calendario', token));
    portalCacheRemove_(portalCacheBuildKey_('detalhes', token));
    portalCacheRemove_(portalCacheBuildKey_('bundle', token));
  });
}

function atividadesV2_appendObjectByHeaders_(sheet, payload) {
  var headers = atividadesV2_getSheetHeaders_(sheet).filter(function(header) { return !!header; });
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, headers.length).setValues([
    headers.map(function(header) {
      return Object.prototype.hasOwnProperty.call(payload || {}, header) ? payload[header] : '';
    })
  ]);
}

function atividadesV2_justificativaActorToken_(contexto) {
  return atividadesV2_safeUserToken_(contexto && (contexto.email || contexto.idPessoa || contexto.rga || contexto.perfil) || 'PORTAL_GEAPA');
}
