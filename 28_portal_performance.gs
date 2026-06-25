/**
 * Utilitarios de performance e cache curto para leituras do Portal GEAPA.
 *
 * Cache e observabilidade sao melhorias operacionais: se falharem, a leitura
 * continua pelo caminho normal das views PORTAL_*.
 */

var ATIVIDADES_V2_PORTAL_CACHE_TTL_SECONDS = 300;
var ATIVIDADES_V2_PORTAL_CALENDARIO_CACHE_TTL_SECONDS = 300;
var ATIVIDADES_V2_PORTAL_DETALHES_CACHE_TTL_SECONDS = 300;
var ATIVIDADES_V2_PORTAL_CONFIG_CACHE_TTL_SECONDS = 600;
var ATIVIDADES_V2_PORTAL_PRIVATE_CACHE_TTL_SECONDS = 90;
var ATIVIDADES_V2_PORTAL_PENDENCIAS_CACHE_TTL_SECONDS = 90;
var ATIVIDADES_V2_PORTAL_CHAMADA_CACHE_TTL_SECONDS = 300;
var ATIVIDADES_V2_PORTAL_CACHE_PREFIX = 'portal:v2:atividades:';
var ATIVIDADES_V2_PORTAL_CONFIG_DEFAULTS = Object.freeze({
  ATIVIDADES_CHAMADA_ANTECEDENCIA_MINUTOS: 60,
  ATIVIDADES_CHAMADA_TOLERANCIA_POS_MINUTOS: 60,
  ATIVIDADES_DESTACAR_PROXIMA: true,
  ATIVIDADES_PRELOAD_DETALHES: true,
  ATIVIDADES_PRELOAD_LIMITE: 20
});

function portalPerfStart_(label) {
  return {
    label: String(label || 'portal').trim(),
    startMs: new Date().getTime(),
    lastMs: new Date().getTime(),
    marks: []
  };
}

function portalPerfMark_(context, label, data) {
  if (!context) return context;
  var now = new Date().getTime();
  context.marks.push({
    label: String(label || '').trim(),
    totalMs: now - context.startMs,
    deltaMs: now - context.lastMs,
    data: data || {}
  });
  context.lastMs = now;
  return context;
}

function portalPerfEnd_(context) {
  if (!context) return null;
  var totalMs = new Date().getTime() - context.startMs;
  var payload = {
    label: context.label,
    totalMs: totalMs,
    marks: context.marks || []
  };
  Logger.log('GEAPA-PORTAL-PERF ' + portalPerfSafeJson_(payload));
  return payload;
}

function portalPerfBuildDiagnostics_(perfResult) {
  if (!perfResult) return null;
  return {
    totalMs: perfResult.totalMs || 0,
    etapas: (perfResult.marks || []).map(function(mark) {
      return {
        etapa: mark.label || '',
        ms: mark.deltaMs || 0,
        totalMs: mark.totalMs || 0
      };
    })
  };
}

function portalPerfAttachDiagnostics_(response, perfResult) {
  if (!response || typeof response !== 'object') return response;
  response.tempoTotalMs = perfResult ? perfResult.totalMs : response.tempoTotalMs || '';
  response.performance = portalPerfBuildDiagnostics_(perfResult);
  return response;
}

function portalPerfSafeJson_(payload) {
  try {
    var text = JSON.stringify(payload || {});
    return text.length > 2000 ? text.slice(0, 2000) + '...' : text;
  } catch (err) {
    return '{"erro":"payload_nao_serializavel"}';
  }
}

function portalCacheGetJson_(key) {
  try {
    var raw = CacheService.getScriptCache().get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

function portalCachePutJson_(key, value, ttlSeconds) {
  try {
    var ttl = Number(ttlSeconds || ATIVIDADES_V2_PORTAL_CACHE_TTL_SECONDS);
    if (!key || !ttl) return false;
    CacheService.getScriptCache().put(key, JSON.stringify(value), ttl);
    return true;
  } catch (err) {
    return false;
  }
}

function portalCacheRemove_(key) {
  try {
    if (key) CacheService.getScriptCache().remove(key);
  } catch (err) {
    // Cache e melhoria de desempenho, nao requisito funcional.
  }
}

function portalCacheBuildKey_(scope, suffix) {
  var base = ATIVIDADES_V2_PORTAL_CACHE_PREFIX + String(scope || 'geral').trim();
  var extra = String(suffix || '').trim();
  var key = extra ? base + ':' + extra : base;
  return key.length <= 240 ? key : key.slice(0, 200) + ':' + portalCacheHash_(key);
}

function portalApproxPayloadBytes_(value) {
  try {
    return JSON.stringify(value || {}).length;
  } catch (err) {
    return 0;
  }
}

function portalCacheContextToken_(contexto) {
  var ctx = atividades_normalizePortalContext_(contexto || {});
  return [
    atividadesV2_sanitizeIdToken_(ctx.perfil || 'MEMBRO'),
    ctx.somenteVisiveis ? 'VISIVEIS' : 'TODAS',
    portalCacheHash_([ctx.idPessoa || '', ctx.email || '', ctx.rga || ''].join('|'))
  ].join(':');
}

function atividadesV2_getPortalConfigCached_() {
  var cacheKey = portalCacheBuildKey_('portal_config', 'operacional');
  var cached = portalCacheGetJson_(cacheKey);
  if (cached) return cached;

  var config = atividadesV2_readPortalConfig_();
  portalCachePutJson_(cacheKey, config, ATIVIDADES_V2_PORTAL_CONFIG_CACHE_TTL_SECONDS);
  return config;
}

function atividadesV2_readPortalConfig_() {
  var config = {};
  Object.keys(ATIVIDADES_V2_PORTAL_CONFIG_DEFAULTS).forEach(function(key) {
    config[key] = ATIVIDADES_V2_PORTAL_CONFIG_DEFAULTS[key];
  });

  try {
    var sheet = atividadesV2_findPortalConfigSheet_();
    if (!sheet || sheet.getLastRow() < 1) return config;

    var values = sheet.getDataRange().getValues();
    var header = values[0] || [];
    var keyCol = atividadesV2_findHeaderIndex_(header, ['KEY', 'CHAVE', 'PARAMETRO', 'PARÂMETRO', 'NOME']);
    var valueCol = atividadesV2_findHeaderIndex_(header, ['VALUE', 'VALOR', 'CONFIG_VALUE', 'CONTEUDO']);
    var startRow = 1;

    if (keyCol < 0 || valueCol < 0) {
      keyCol = 0;
      valueCol = 1;
      startRow = 0;
    }

    for (var i = startRow; i < values.length; i++) {
      var key = String(values[i][keyCol] || '').trim().toUpperCase();
      if (!Object.prototype.hasOwnProperty.call(config, key)) continue;
      config[key] = atividadesV2_coercePortalConfigValue_(key, values[i][valueCol]);
    }
  } catch (err) {
    Logger.log('GEAPA-PORTAL-PERF portal_config_fallback_padrao ' + portalPerfSafeJson_({
      message: err && err.message ? err.message : String(err)
    }));
  }

  return config;
}

function atividadesV2_findPortalConfigSheet_() {
  var preferredKeys = [
    'PORTAL_CONFIG',
    'GEAPA_PORTAL_CONFIG',
    'PARAMETROS_OPERACIONAIS',
    'PARAMETROS_PORTAL',
    'GEAPA_PARAMETROS_OPERACIONAIS',
    'PORTAL_PARAMETROS'
  ];

  for (var i = 0; i < preferredKeys.length; i++) {
    var entry = atividades_getRegistryEntryByKey_(preferredKeys[i]);
    var sheet = atividadesV2_tryOpenPortalConfigSheetFromEntry_(entry);
    if (sheet) return sheet;
  }

  var entries = atividades_getRegistryEntries_();
  for (var j = 0; j < entries.length; j++) {
    var haystack = [
      entries[j].key || '',
      entries[j].sheet || ''
    ].join(' ').toUpperCase();
    if (
      haystack.indexOf('PORTAL_CONFIG') === -1 &&
      haystack.indexOf('PARAMET') === -1 &&
      haystack.indexOf('CONFIG') === -1
    ) {
      continue;
    }

    var fallback = atividadesV2_tryOpenPortalConfigSheetFromEntry_(entries[j]);
    if (fallback) return fallback;
  }

  return null;
}

function atividadesV2_tryOpenPortalConfigSheetFromEntry_(entry) {
  if (!entry || !entry.id) return null;
  try {
    var spreadsheet = atividades_openSpreadsheetByIdCached_(entry.id);
    return spreadsheet.getSheetByName('portal_config') ||
      spreadsheet.getSheetByName('PORTAL_CONFIG') ||
      spreadsheet.getSheetByName(entry.sheet || '');
  } catch (err) {
    return null;
  }
}

function atividadesV2_findHeaderIndex_(headers, aliases) {
  var wanted = (aliases || []).map(function(alias) {
    return atividades_normalizeTextUpper_(alias);
  });
  for (var i = 0; i < headers.length; i++) {
    if (wanted.indexOf(atividades_normalizeTextUpper_(headers[i])) >= 0) return i;
  }
  return -1;
}

function atividadesV2_coercePortalConfigValue_(key, value) {
  if (key === 'ATIVIDADES_DESTACAR_PROXIMA' || key === 'ATIVIDADES_PRELOAD_DETALHES') {
    return atividades_isTruthySim_(value);
  }

  var parsed = Number(String(value === null || value === undefined ? '' : value).replace(',', '.'));
  if (isFinite(parsed)) return parsed;
  return ATIVIDADES_V2_PORTAL_CONFIG_DEFAULTS[key];
}

function atividadesV2_getChamadaWindowMeta_(activity, statusChamada, contexto, now, config) {
  var ctx = atividades_normalizePortalContext_(contexto || {});
  var cfg = config || atividadesV2_getPortalConfigCached_();
  var status = statusChamada || {};
  var dataHoraInicio = atividadesV2_buildActivityDateTime_(activity && activity.DATA_ATIVIDADE, activity && activity.HORARIO_INICIO);
  var dataHoraFim = atividadesV2_buildActivityDateTime_(activity && activity.DATA_ATIVIDADE, activity && activity.HORARIO_FIM) || dataHoraInicio;
  if (dataHoraInicio && dataHoraFim && dataHoraFim.getTime() < dataHoraInicio.getTime()) {
    dataHoraFim = new Date(dataHoraFim.getTime() + 24 * 60 * 60000);
  }
  var current = now || new Date();
  var permiteChamada = atividadesV2_activityAllowsChamadaLight_(activity);
  var privileged = atividades_isPrivilegedPortalProfile_(ctx);

  var abre = dataHoraInicio
    ? new Date(dataHoraInicio.getTime() - Number(cfg.ATIVIDADES_CHAMADA_ANTECEDENCIA_MINUTOS || 0) * 60000)
    : null;
  var encerra = dataHoraFim
    ? new Date(dataHoraFim.getTime() + Number(cfg.ATIVIDADES_CHAMADA_TOLERANCIA_POS_MINUTOS || 0) * 60000)
    : null;
  var dentroJanela = !!(abre && encerra && current.getTime() >= abre.getTime() && current.getTime() <= encerra.getTime());
  var finalizada = status.finalizada === true;
  var statusCodigo = status.statusChamada || 'RASCUNHO';
  var temChamadaSalva = ['SALVA', 'FINALIZADA', 'REABERTA'].indexOf(atividades_normalizeTextUpper_(statusCodigo)) >= 0;
  var podeRegistrar = privileged && permiteChamada && dentroJanela && !finalizada;
  var podeVisualizar = privileged && permiteChamada && (podeRegistrar || temChamadaSalva);

  var motivo = '';
  if (!privileged) motivo = 'PERMISSAO_NEGADA';
  else if (!permiteChamada) motivo = 'ATIVIDADE_NAO_PERMITE_CHAMADA';
  else if (finalizada) motivo = 'CHAMADA_FINALIZADA';
  else if (!dentroJanela && abre && current.getTime() < abre.getTime()) motivo = 'CHAMADA_AINDA_NAO_ABERTA';
  else if (!dentroJanela && encerra && current.getTime() > encerra.getTime()) motivo = 'JANELA_ENCERRADA';
  else if (!dentroJanela) motivo = 'JANELA_INDISPONIVEL';

  return {
    dataHoraInicio: atividadesV2_toIsoOrEmpty_(dataHoraInicio),
    dataHoraFim: atividadesV2_toIsoOrEmpty_(dataHoraFim),
    chamadaDisponivelEm: atividadesV2_toIsoOrEmpty_(abre),
    chamadaEncerraEm: atividadesV2_toIsoOrEmpty_(encerra),
    podeRegistrarChamadaAgora: podeRegistrar,
    podeVisualizarChamada: podeVisualizar,
    motivoChamadaIndisponivel: podeRegistrar ? '' : motivo,
    chamadaFinalizada: finalizada,
    statusChamada: statusCodigo,
    statusChamadaRotulo: status.rotulo || atividadesV2_formatChamadaStatusSafe_(statusCodigo)
  };
}

function atividadesV2_activityAllowsChamadaLight_(activity) {
  if (!activity) return false;
  var operational = atividades_normalizeTextUpper_(activity.STATUS_OPERACIONAL);
  if (operational === 'CANCELADA' || operational === 'ARQUIVADA') return false;
  if (!atividades_parseDateOrNull_(activity.DATA_ATIVIDADE)) return false;
  return atividades_isTruthySim_(activity.CONTA_PRESENCA) ||
    atividades_isTruthySim_(activity.CONTA_FALTA) ||
    atividades_isTruthySim_(activity.EXIGE_LISTA_PRESENCA);
}

function atividadesV2_buildActivityDateTime_(dateValue, timeValue) {
  var date = atividades_parseDateOrNull_(dateValue);
  if (!date) return null;

  var timeMinutes = atividades_parseTimeValueToMinutes_(timeValue);
  var out = new Date(date.getTime());
  if (timeMinutes !== null) {
    out.setHours(Math.floor(timeMinutes / 60), timeMinutes % 60, 0, 0);
  }
  return out;
}

function atividadesV2_toIsoOrEmpty_(date) {
  return date && !isNaN(date) ? date.toISOString() : '';
}

function atividadesV2_formatChamadaStatusSafe_(statusChamada) {
  if (typeof atividadesV2_formatChamadaStatus_ === 'function') {
    return atividadesV2_formatChamadaStatus_(atividades_normalizeTextUpper_(statusChamada || 'RASCUNHO'));
  }
  var map = {
    RASCUNHO: 'Chamada pendente',
    SALVA: 'Chamada salva',
    FINALIZADA: 'Chamada finalizada',
    REABERTA: 'Chamada reaberta'
  };
  return map[atividades_normalizeTextUpper_(statusChamada || 'RASCUNHO')] || map.RASCUNHO;
}

function portalCacheHash_(value) {
  var text = String(value || '');
  try {
    var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text);
    return Utilities.base64EncodeWebSafe(digest).replace(/=+$/g, '').slice(0, 32);
  } catch (err) {
    return atividadesV2_sanitizeIdToken_(text).slice(0, 32) || 'SEM_CHAVE';
  }
}

function atividadesV2_limparCachePortalDev_() {
  [
    portalCacheBuildKey_('calendario', ''),
    portalCacheBuildKey_('detalhes', ''),
    portalCacheBuildKey_('bundle', ''),
    portalCacheBuildKey_('bundle:leve', ''),
    portalCacheBuildKey_('bundle:com_detalhes', ''),
    portalCacheBuildKey_('frequencia', ''),
    portalCacheBuildKey_('frequencia_detalhada_v2', ''),
    portalCacheBuildKey_('eixos_tematicos', 'ativos'),
    portalCacheBuildKey_('pendencias_apresentacoes', 'gestao'),
    portalCacheBuildKey_('pendencias_justificativas', 'gestao')
  ].forEach(function(key) {
    portalCacheRemove_(key);
  });

  return {
    ok: true,
    cachePrefix: ATIVIDADES_V2_PORTAL_CACHE_PREFIX,
    observacao: 'Caches agregados removidos. Caches por contexto/atividade expiram automaticamente.'
  };
}
