/**
 * Utilitarios de performance e cache curto para leituras do Portal GEAPA.
 *
 * Cache e observabilidade sao melhorias operacionais: se falharem, a leitura
 * continua pelo caminho normal das views PORTAL_*.
 */

var ATIVIDADES_V2_PORTAL_CACHE_TTL_SECONDS = 600;
var ATIVIDADES_V2_PORTAL_CACHE_PREFIX = 'portal:v2:atividades:';

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

function portalCacheContextToken_(contexto) {
  var ctx = atividades_normalizePortalContext_(contexto || {});
  return [
    atividadesV2_sanitizeIdToken_(ctx.perfil || 'MEMBRO'),
    ctx.somenteVisiveis ? 'VISIVEIS' : 'TODAS',
    portalCacheHash_([ctx.email || '', ctx.rga || ''].join('|'))
  ].join(':');
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
    portalCacheBuildKey_('bundle', '')
  ].forEach(function(key) {
    portalCacheRemove_(key);
  });

  return {
    ok: true,
    cachePrefix: ATIVIDADES_V2_PORTAL_CACHE_PREFIX,
    observacao: 'Caches agregados removidos. Caches por contexto/atividade expiram automaticamente.'
  };
}
