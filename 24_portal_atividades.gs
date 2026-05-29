/**
 * Contrato publico de leitura segura para o Portal GEAPA.
 *
 * Este arquivo nao escreve em planilhas. Ele le views PORTAL_* da base v2 DEV,
 * aplica filtros de visibilidade e devolve objetos sanitizados para consumo
 * pelo portal.
 */

function atividades_normalizePortalContext_(contexto) {
  var raw = contexto || {};
  var perfil = atividades_normalizeTextUpper_(raw.perfil || 'MEMBRO');
  var allowedProfiles = ['MEMBRO', 'SECRETARIO', 'DIRETORIA', 'ADMIN_TECNICO'];

  if (allowedProfiles.indexOf(perfil) === -1) perfil = 'MEMBRO';

  return {
    perfil: perfil,
    rga: String(raw.rga || '').trim(),
    email: String(raw.email || '').trim(),
    somenteVisiveis: raw.somenteVisiveis === false ? false : true
  };
}

function atividades_isPrivilegedPortalProfile_(contexto) {
  var perfil = atividades_normalizeTextUpper_(contexto && contexto.perfil);
  return ['SECRETARIO', 'DIRETORIA', 'ADMIN_TECNICO'].indexOf(perfil) >= 0;
}

function atividades_isPortalBlockedStatus_(status) {
  var normalized = atividades_normalizeTextUpper_(status);
  return normalized === 'CANCELADA' ||
    normalized === 'ARQUIVADA' ||
    normalized === 'OCULTA';
}

function atividades_canShowActivityInPortal_(record, contexto) {
  var ctx = atividades_normalizePortalContext_(contexto);
  var idAtividade = String(record && record.ID_ATIVIDADE || '').trim();
  var acesso = atividades_normalizeTextUpper_(record && record.CLASSIFICACAO_ACESSO);
  var visibilidade = atividades_normalizeTextUpper_(record && record.VISIBILIDADE_PORTAL);
  var statusPublicacao = atividades_normalizeTextUpper_(
    (record && record.STATUS_PUBLICO) ||
    (record && record.STATUS_PUBLICACAO_PORTAL) ||
    (record && record.STATUS_OPERACIONAL) ||
    (record && record.STATUS)
  );

  if (!idAtividade) return false;
  if (typeof atividades_isRegistroInstitucionalForaDoEscopo_ === 'function' &&
    atividades_isRegistroInstitucionalForaDoEscopo_(record)) return false;

  if (atividades_isPortalBlockedStatus_(statusPublicacao)) {
    if (ctx.perfil === 'MEMBRO' || ctx.somenteVisiveis) return false;
  }

  if (ctx.perfil === 'MEMBRO') {
    return (
      visibilidade === 'PUBLICA' ||
      visibilidade === 'MEMBROS' ||
      acesso === 'ABERTA' ||
      acesso === 'RESTRITA_MEMBROS'
    );
  }

  if (visibilidade === 'DIRETORIA') return atividades_isPrivilegedPortalProfile_(ctx);
  return atividades_isPrivilegedPortalProfile_(ctx);
}

function atividades_sanitizePortalText_(value, maxLength) {
  var text = String(value || '').replace(/\s+/g, ' ').trim();
  var limit = Number(maxLength || 0);
  if (limit > 0 && text.length > limit) return text.slice(0, limit).trim();
  return text;
}

function atividades_sanitizePortalUrl_(value) {
  var text = String(value || '').trim();
  if (!/^https?:\/\//i.test(text)) return '';
  return text;
}

function atividades_formatPortalDateIso_(value) {
  var date = atividades_parseDateOrNull_(value);
  if (!date) return '';
  return GEAPA_CORE.coreFormatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function atividades_formatPortalWeekdayPtBr_(value) {
  var date = atividades_parseDateOrNull_(value);
  if (!date) return '';

  return [
    'domingo',
    'segunda-feira',
    'terca-feira',
    'quarta-feira',
    'quinta-feira',
    'sexta-feira',
    'sabado'
  ][date.getDay()] || '';
}

function atividades_formatPortalTime_(value) {
  var minutes = atividades_parseTimeValueToMinutes_(value);
  if (minutes === null) return String(value || '').trim();

  var hours = Math.floor(minutes / 60);
  var minutePart = minutes % 60;
  return atividades_pad2_(hours) + 'h' + atividades_pad2_(minutePart);
}

function atividades_formatPortalFullTime_(inicio, fim) {
  var startText = atividades_formatPortalTime_(inicio);
  var endText = atividades_formatPortalTime_(fim);

  if (startText && endText) return startText + ' as ' + endText;
  return startText || endText || '';
}

function atividades_parsePortalCargaHoraria_(value, record) {
  var raw = String(value === null || value === undefined ? '' : value).trim();
  if (raw) {
    var parsed = Number(raw.replace(',', '.'));
    if (isFinite(parsed)) return parsed;
  }

  var calculated = atividades_calculateCargaHorariaFromTimes_(
    record && record.HORARIO_INICIO,
    record && record.HORARIO_FIM
  );
  return calculated === null ? '' : calculated;
}

function atividades_getPortalTituloPublico_(record) {
  var titulo = atividades_sanitizePortalText_(
    (record && record.TITULO_PUBLICO) ||
    (record && record.TITULO),
    180
  );
  if (titulo) return titulo;

  if (atividades_normalizeTextUpper_(record && record.SUBTIPO_ATIVIDADE) === 'APRESENTACAO_MEMBRO') {
    return 'Apresentacao de Membro';
  }

  return 'Atividade do GEAPA';
}

function atividades_getPortalTipoPublico_(record) {
  var subtipo = atividades_normalizeTextUpper_(record && record.SUBTIPO_ATIVIDADE);
  var tipo = atividades_normalizeTextUpper_(record && record.TIPO_ATIVIDADE);
  var tipoPublico = atividades_sanitizePortalText_(record && record.TIPO_PUBLICO, 120);
  var labels = {
    APRESENTACAO_MEMBRO: 'Apresentacao',
    APRESENTACAO_REPOSICAO: 'Apresentacao',
    PALESTRA: 'Palestra',
    VISITA_TECNICA: 'Visita tecnica',
    DINAMICA: 'Dinamica',
    CURSO: 'Curso',
    DEBATE: 'Debate',
    ABERTURA_PERIODO: 'Abertura de periodo',
    FECHAMENTO_PERIODO: 'Fechamento de periodo',
    MARCO_INSTITUCIONAL: 'Marco institucional'
  };

  if (tipoPublico) return tipoPublico;
  if (labels[subtipo]) return labels[subtipo];
  if (tipo === 'ACADEMICA') return 'Atividade academica';
  if (tipo === 'ORGANIZACIONAL') return 'Atividade organizacional';
  if (tipo === 'INTERNA') return 'Atividade interna';
  return 'Atividade';
}

function atividades_getPortalVisibilidade_(record) {
  var visibilidade = atividades_normalizeTextUpper_(record && record.VISIBILIDADE_PORTAL);
  if (visibilidade) return visibilidade;

  var acesso = atividades_normalizeTextUpper_(record && record.CLASSIFICACAO_ACESSO);
  if (acesso === 'ABERTA') return 'PUBLICA';
  if (acesso === 'RESTRITA_MEMBROS') return 'MEMBROS';
  return 'RESTRITA';
}

function atividades_buildPortalPermissions_(record, contexto) {
  var canView = atividades_canShowActivityInPortal_(record, contexto);
  return {
    podeVerDetalhes: canView,
    podeJustificarFalta: false,
    podeRegistrarChamada: false,
    podeEditar: false
  };
}

function atividades_buildPortalListItem_(record, contexto) {
  var permissions = atividades_buildPortalPermissions_(record, contexto);
  return {
    idAtividade: String(record.ID_ATIVIDADE || '').trim(),
    dataAtividade: atividades_formatPortalDateIso_(record.DATA_ATIVIDADE),
    diaSemana: atividades_sanitizePortalText_(record.DIA_SEMANA, 40) ||
      atividades_formatPortalWeekdayPtBr_(record.DATA_ATIVIDADE),
    horarioInicio: atividades_formatPortalTime_(record.HORARIO_INICIO),
    horarioFim: atividades_formatPortalTime_(record.HORARIO_FIM),
    tituloPublico: atividades_getPortalTituloPublico_(record),
    tipoPublico: atividades_getPortalTipoPublico_(record),
    subtipoAtividade: String(record.SUBTIPO_ATIVIDADE || '').trim(),
    local: atividades_sanitizePortalText_(record.LOCAL, 180),
    formato: String(record.FORMATO || '').trim(),
    classificacaoAcesso: String(record.CLASSIFICACAO_ACESSO || '').trim(),
    publicoAlvo: atividades_sanitizePortalText_(record.PUBLICO_ALVO, 180),
    contaPresenca: atividades_isTruthySim_(record.CONTA_PRESENCA),
    contaFalta: atividades_isTruthySim_(atividades_getEffectiveContaFaltaForActivity_(record)),
    geraCertificado: atividades_isTruthySim_(record.GERA_CERTIFICADO),
    cargaHoraria: atividades_parsePortalCargaHoraria_(record.CARGA_HORARIA, record),
    statusPublico: String(record.STATUS_PUBLICO || record.STATUS_PUBLICACAO_PORTAL || record.STATUS_OPERACIONAL || record.STATUS || '').trim(),
    visibilidadePortal: atividades_getPortalVisibilidade_(record),
    podeVerDetalhes: permissions.podeVerDetalhes,
    podeJustificarFalta: permissions.podeJustificarFalta,
    podeRegistrarChamada: permissions.podeRegistrarChamada,
    podeEditar: permissions.podeEditar
  };
}

function atividades_buildPortalDetail_(record, contexto) {
  return {
    idAtividade: String(record.ID_ATIVIDADE || '').trim(),
    idApresentacao: String(record.ID_APRESENTACAO || '').trim(),
    ehApresentacao: atividades_isTruthySim_(record.EH_APRESENTACAO),
    tituloPublico: atividades_getPortalTituloPublico_(record),
    descricaoPublica: atividades_sanitizePortalText_(record.DESCRICAO_PUBLICA || record.DESCRICAO, 1000),
    dataAtividade: atividades_formatPortalDateIso_(record.DATA_ATIVIDADE),
    horarioCompleto: atividades_formatPortalFullTime_(record.HORARIO_INICIO, record.HORARIO_FIM),
    local: atividades_sanitizePortalText_(record.LOCAL, 180),
    formato: String(record.FORMATO || '').trim(),
    tipoAtividade: String(record.TIPO_ATIVIDADE || '').trim(),
    subtipoAtividade: String(record.SUBTIPO_ATIVIDADE || '').trim(),
    classificacaoReuniao: String(record.CLASSIFICACAO_REUNIAO || '').trim(),
    classificacaoAcesso: String(record.CLASSIFICACAO_ACESSO || '').trim(),
    responsavelPublico: atividades_sanitizePortalText_(record.RESPONSAVEL_PUBLICO || record.RESPONSAVEL_INTERNO, 180),
    contaPresenca: atividades_isTruthySim_(record.CONTA_PRESENCA),
    contaFalta: atividades_isTruthySim_(atividades_getEffectiveContaFaltaForActivity_(record)),
    geraCertificado: atividades_isTruthySim_(record.GERA_CERTIFICADO),
    cargaHoraria: atividades_parsePortalCargaHoraria_(record.CARGA_HORARIA, record),
    statusPublico: String(record.STATUS_PUBLICO || record.STATUS_PUBLICACAO_PORTAL || record.STATUS_OPERACIONAL || record.STATUS || '').trim(),
    nomeApresentadorPublico: atividades_sanitizePortalText_(record.NOME_APRESENTADOR_PUBLICO, 180),
    rgaApresentador: String(record.RGA_APRESENTADOR || '').trim(),
    tituloApresentacao: atividades_sanitizePortalText_(record.TITULO_APRESENTACAO, 240),
    eixoTematicoPrincipal: String(record.EIXO_TEMATICO_PRINCIPAL || '').trim(),
    eixoTematicoSecundario: String(record.EIXO_TEMATICO_SECUNDARIO || '').trim(),
    statusApresentacaoPublico: String(record.STATUS_APRESENTACAO_PUBLICO || '').trim(),
    linkMaterialPublico: atividades_sanitizePortalUrl_(record.LINK_MATERIAL_PUBLICO || record.LINK_MATERIAL),
    linkAtaPublica: atividades_sanitizePortalUrl_(record.LINK_ATA_PUBLICA || record.LINK_ATA),
    linkFotosPublico: atividades_sanitizePortalUrl_(record.LINK_FOTOS_PUBLICO || record.LINK_FOTOS),
    mensagemPortal: atividades_sanitizePortalText_(record.MENSAGEM_PORTAL, 500)
  };
}

function atividades_readPortalActivityRecords_() {
  return atividades_readPortalActivityRecordsV2Dev_();
}

function atividades_readPortalActivityRecordsV2Dev_() {
  var ss = atividadesV2_getDatabaseSpreadsheetDev_();
  var sheet = ss.getSheetByName(ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_CALENDARIO);

  if (!sheet) {
    throw new Error('Aba PORTAL_ATIVIDADES_CALENDARIO nao encontrada na base v2 DEV.');
  }

  return GEAPA_CORE.coreReadSheetRecords(sheet, { headerRow: 1 });
}

function atividades_readPortalActivityDetailRecordsV2Dev_() {
  var viewRecords = atividades_tryReadPortalActivityDetailViewV2Dev_();
  if (viewRecords) return viewRecords;

  atividadesV2_logSetup_('WARN', 'PORTAL_ATIVIDADES_DETALHES vazia ou ausente; usando fallback da aba Atividades.', {});
  var ss = atividadesV2_getDatabaseSpreadsheetDev_();
  var sheet = ss.getSheetByName(ATIVIDADES_V2_SHEETS.ATIVIDADES);

  if (!sheet) {
    throw new Error('Aba Atividades nao encontrada na base v2 DEV.');
  }

  return GEAPA_CORE.coreReadSheetRecords(sheet, { headerRow: 1 });
}

function atividades_tryReadPortalActivityDetailViewV2Dev_() {
  var ss = atividadesV2_getDatabaseSpreadsheetDev_();
  var sheet = ss.getSheetByName(ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_DETALHES);
  if (!sheet || sheet.getLastRow() < 2) return null;
  return GEAPA_CORE.coreReadSheetRecords(sheet, { headerRow: 1 });
}

function atividades_sortPortalActivities_(a, b) {
  var dateA = atividades_parseDateOrNull_(a.DATA_ATIVIDADE);
  var dateB = atividades_parseDateOrNull_(b.DATA_ATIVIDADE);
  var timeA = dateA ? dateA.getTime() : Number.MAX_SAFE_INTEGER;
  var timeB = dateB ? dateB.getTime() : Number.MAX_SAFE_INTEGER;
  if (timeA !== timeB) return timeA - timeB;

  return String(a.ID_ATIVIDADE || '').localeCompare(String(b.ID_ATIVIDADE || ''));
}

function atividades_listarParaPortal_(contexto) {
  var perf = portalPerfStart_('atividades_listarParaPortal');
  try {
    var ctx = atividades_normalizePortalContext_(contexto);
    var cacheKey = portalCacheBuildKey_('calendario', portalCacheContextToken_(ctx));
    var cached = portalCacheGetJson_(cacheKey);
    if (cached) {
      portalPerfMark_(perf, 'cache_hit_calendario');
      var cachedPerf = portalPerfEnd_(perf);
      return {
        ok: true,
        data: cached,
        cacheHit: true,
        tempoTotalMs: cachedPerf.totalMs
      };
    }

    portalPerfMark_(perf, 'contexto_normalizado');
    var records = atividades_readPortalActivityRecords_();
    portalPerfMark_(perf, 'ler_view_calendario', { linhas: records.length });
    var data = records
      .filter(function(record) {
        return atividades_canShowActivityInPortal_(record, ctx);
      })
      .sort(atividades_sortPortalActivities_)
      .map(function(record) {
        return atividades_buildPortalListItem_(record, ctx);
      });

    portalPerfMark_(perf, 'montar_resposta_calendario', { total: data.length });
    portalCachePutJson_(cacheKey, data, ATIVIDADES_V2_PORTAL_CACHE_TTL_SECONDS);
    var perfResult = portalPerfEnd_(perf);

    return {
      ok: true,
      data: data,
      cacheHit: false,
      tempoTotalMs: perfResult.totalMs
    };
  } catch (err) {
    var errorPerf = portalPerfEnd_(perf);
    return {
      ok: false,
      errorCode: 'ERRO_LEITURA_PORTAL',
      message: 'Nao foi possivel consultar as atividades para o portal.',
      details: err && err.message ? err.message : String(err),
      tempoTotalMs: errorPerf ? errorPerf.totalMs : ''
    };
  }
}

function atividades_buscarDetalheParaPortal_(idAtividade, contexto) {
  var perf = portalPerfStart_('atividades_buscarDetalheParaPortal');
  var wantedId = String(idAtividade || '').trim();
  if (!wantedId) {
    return {
      ok: false,
      errorCode: 'ID_ATIVIDADE_OBRIGATORIO',
      message: 'Informe a atividade para consulta.'
    };
  }

  try {
    var ctx = atividades_normalizePortalContext_(contexto);
    var cacheKey = portalCacheBuildKey_('atividade:detalhes', wantedId + ':' + portalCacheContextToken_(ctx));
    var cached = portalCacheGetJson_(cacheKey);
    if (cached) {
      portalPerfMark_(perf, 'cache_hit_detalhe', { idAtividade: wantedId });
      var cachedPerf = portalPerfEnd_(perf);
      return {
        ok: true,
        data: cached,
        cacheHit: true,
        tempoTotalMs: cachedPerf.totalMs
      };
    }

    portalPerfMark_(perf, 'contexto_normalizado');
    var target = null;
    var records = atividades_readPortalActivityDetailRecordsV2Dev_();
    portalPerfMark_(perf, 'ler_view_detalhes', { linhas: records.length });

    for (var i = 0; i < records.length; i++) {
      if (String(records[i].ID_ATIVIDADE || '').trim() === wantedId) {
        target = records[i];
        break;
      }
    }

    if (!target || !atividades_canShowActivityInPortal_(target, ctx)) {
      return {
        ok: false,
        errorCode: 'ATIVIDADE_NAO_ENCONTRADA',
        message: 'Atividade nao encontrada ou indisponivel para o portal.'
      };
    }

    var data = atividades_buildPortalDetail_(target, ctx);
    portalCachePutJson_(cacheKey, data, ATIVIDADES_V2_PORTAL_CACHE_TTL_SECONDS);
    var perfResult = portalPerfEnd_(perf);
    return {
      ok: true,
      data: data,
      cacheHit: false,
      tempoTotalMs: perfResult.totalMs
    };
  } catch (err) {
    var errorPerf = portalPerfEnd_(perf);
    return {
      ok: false,
      errorCode: 'ERRO_LEITURA_PORTAL',
      message: 'Nao foi possivel consultar a atividade para o portal.',
      details: err && err.message ? err.message : String(err),
      tempoTotalMs: errorPerf ? errorPerf.totalMs : ''
    };
  }
}

function atividadesV2_portalGetDetalhesAtividade_(idAtividade, contexto) {
  return atividades_buscarDetalheParaPortal_(idAtividade, contexto);
}

function atividadesV2_portalGetAtividadesBundle_(contexto) {
  var perf = portalPerfStart_('atividadesV2_portalGetAtividadesBundle');
  try {
    var ctx = atividades_normalizePortalContext_(contexto);
    var cacheKey = portalCacheBuildKey_('bundle', portalCacheContextToken_(ctx));
    var cached = portalCacheGetJson_(cacheKey);
    if (cached) {
      portalPerfMark_(perf, 'cache_hit_bundle');
      var cachedPerf = portalPerfEnd_(perf);
      return {
        ok: true,
        data: cached,
        cacheHit: true,
        tempoTotalMs: cachedPerf.totalMs
      };
    }

    var listResult = atividades_listarParaPortal_(ctx);
    if (!listResult.ok) return listResult;
    portalPerfMark_(perf, 'carregar_calendario', { total: listResult.data.length });

    var allowedIds = {};
    listResult.data.forEach(function(item) {
      allowedIds[String(item.idAtividade || '').trim()] = true;
    });

    var detalhesPorId = {};
    var ultimaAtualizacao = '';
    var detailRecords = atividades_readPortalActivityDetailRecordsV2Dev_();
    portalPerfMark_(perf, 'ler_view_detalhes', { linhas: detailRecords.length });

    detailRecords.forEach(function(record) {
      var id = String(record.ID_ATIVIDADE || '').trim();
      if (!allowedIds[id] || detalhesPorId[id]) return;
      if (!atividades_canShowActivityInPortal_(record, ctx)) return;
      detalhesPorId[id] = atividades_buildPortalDetail_(record, ctx);
      if (record.ULTIMA_ATUALIZACAO) ultimaAtualizacao = record.ULTIMA_ATUALIZACAO;
    });

    var data = {
      calendario: listResult.data,
      detalhesPorId: detalhesPorId,
      ultimaAtualizacao: ultimaAtualizacao
    };
    portalCachePutJson_(cacheKey, data, ATIVIDADES_V2_PORTAL_CACHE_TTL_SECONDS);
    var perfResult = portalPerfEnd_(perf);
    return {
      ok: true,
      data: data,
      cacheHit: false,
      tempoTotalMs: perfResult.totalMs
    };
  } catch (err) {
    var errorPerf = portalPerfEnd_(perf);
    return {
      ok: false,
      errorCode: 'ERRO_BUNDLE_PORTAL_ATIVIDADES',
      message: 'Nao foi possivel consultar o pacote de atividades para o portal.',
      details: err && err.message ? err.message : String(err),
      tempoTotalMs: errorPerf ? errorPerf.totalMs : ''
    };
  }
}

function atividades_runTestePortalAtividades_() {
  var listResult = atividades_listarParaPortal_({
    perfil: 'MEMBRO',
    somenteVisiveis: true
  });
  var first = listResult.ok && listResult.data.length ? listResult.data[0] : null;
  var detailResult = first
    ? atividades_buscarDetalheParaPortal_(first.idAtividade, { perfil: 'MEMBRO' })
    : { ok: false };

  return {
    ok: !!listResult.ok,
    totalListadas: listResult.ok ? listResult.data.length : 0,
    primeiraAtividade: first ? first.idAtividade : '',
    detalheOk: !!detailResult.ok,
    tempoListaMs: listResult.tempoTotalMs || '',
    tempoDetalheMs: detailResult.tempoTotalMs || ''
  };
}
