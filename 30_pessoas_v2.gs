/**
 * Resolucao central de pessoa para rotinas v2.
 *
 * ID_PESSOA e a chave tecnica preferencial. RGA/e-mail/nome continuam como
 * auxiliares legados e para conferencia humana, mas nao devem ser usados como
 * chave estrutural quando ID_PESSOA estiver disponivel.
 */

var ATIVIDADES_V2_PESSOA_RESOLVER_CACHE_ = null;
var ATIVIDADES_V2_PESSOA_RESOLVER_INDEX_ = null;
var ATIVIDADES_V2_PESSOA_RESOLVER_DISABLE_POINT_LOOKUP_ = false;

function atividadesV2_resolverPessoa_(input) {
  var raw = input || {};
  var directId = atividadesV2_firstNonEmpty_(
    raw.ID_PESSOA,
    raw.ID_PESSOA_APRESENTADOR,
    raw.idPessoa,
    raw.id_pessoa,
    raw.id,
    raw.pessoaId
  );

  if (directId) {
    return atividadesV2_buildPessoaResolution_('RESOLVIDO', {
      idPessoa: directId,
      rga: raw.RGA || raw.rga,
      email: raw.EMAIL || raw.email || raw.EMAIL_MEMBRO || raw.EMAIL_PARTICIPANTE || raw.EMAIL_APRESENTADOR,
      nome: raw.NOME || raw.nome || raw.NOME_MEMBRO || raw.NOME_MEMBRO_PUBLICO || raw.NOME_PARTICIPANTE || raw.NOME_APRESENTADOR_PUBLICO || raw.nomeExibicao
    }, 'payload');
  }

  var request = {
    idPessoa: '',
    idReferencia: String(raw.ID_REFERENCIA || raw.idReferencia || '').trim(),
    rga: String(raw.RGA || raw.rga || atividadesV2_legacyReferenceAsRga_(raw.ID_REFERENCIA || raw.idReferencia) || '').trim(),
    email: String(raw.EMAIL || raw.email || raw.EMAIL_MEMBRO || raw.EMAIL_PARTICIPANTE || raw.EMAIL_APRESENTADOR || '').trim(),
    nome: String(raw.NOME || raw.nome || raw.NOME_MEMBRO || raw.NOME_MEMBRO_PUBLICO || raw.NOME_PARTICIPANTE || raw.NOME_APRESENTADOR_PUBLICO || raw.nomeExibicao || '').trim()
  };

  var cache = atividadesV2_getPessoaResolverCache_();
  var cacheKey = atividadesV2_buildPessoaResolverCacheKey_(request);
  if (cacheKey && cache[cacheKey]) return cache[cacheKey];

  var indexed = atividadesV2_tryResolvePessoaFromIndex_(request);
  if (indexed.statusResolucao === 'RESOLVIDO' || indexed.statusResolucao === 'AMBIGUO') {
    if (cacheKey) cache[cacheKey] = indexed;
    return indexed;
  }

  var resolved = atividadesV2_tryResolvePessoaViaCore_(request);
  if (cacheKey) cache[cacheKey] = resolved;
  if (resolved.statusResolucao === 'RESOLVIDO') return resolved;

  return atividadesV2_buildPessoaResolution_(resolved.statusResolucao || 'NAO_ENCONTRADO', request, resolved.origem || 'legado');
}

function atividadesV2_getPessoaResolverCache_() {
  if (!ATIVIDADES_V2_PESSOA_RESOLVER_CACHE_) ATIVIDADES_V2_PESSOA_RESOLVER_CACHE_ = {};
  return ATIVIDADES_V2_PESSOA_RESOLVER_CACHE_;
}

function atividadesV2_resetPessoaResolverRuntimeCache_() {
  ATIVIDADES_V2_PESSOA_RESOLVER_CACHE_ = {};
  ATIVIDADES_V2_PESSOA_RESOLVER_INDEX_ = null;
}

function atividadesV2_buildPessoaResolverCacheKey_(request) {
  var parts = [
    atividadesV2_sanitizeIdToken_(request.idPessoa || ''),
    atividadesV2_sanitizeIdToken_(request.rga || ''),
    String(request.email || '').trim().toLowerCase(),
    atividadesV2_normalizePessoaNameKey_(request.nome || ''),
    atividadesV2_sanitizeIdToken_(request.idReferencia || '')
  ];
  return parts.join('|');
}

function atividadesV2_tryResolvePessoaFromIndex_(request) {
  var index = atividadesV2_getPessoaResolverIndex_();
  var idPessoa = String(request.idPessoa || '').trim();
  var rga = atividadesV2_sanitizeIdToken_(request.rga || '');
  var email = String(request.email || '').trim().toLowerCase();
  var nome = atividadesV2_normalizePessoaNameKey_(request.nome || '');

  if (idPessoa && index.byId[idPessoa]) {
    return atividadesV2_buildPessoaResolution_('RESOLVIDO', index.byId[idPessoa], 'indice_pessoas_v2_id');
  }
  if (rga && index.byRga[rga]) {
    return atividadesV2_buildPessoaResolution_('RESOLVIDO', index.byRga[rga], 'indice_pessoas_v2_rga');
  }
  if (email && index.byEmail[email]) {
    return atividadesV2_buildPessoaResolution_('RESOLVIDO', index.byEmail[email], 'indice_pessoas_v2_email');
  }
  if (nome && index.byName[nome]) {
    if (index.ambiguousNames[nome]) {
      return atividadesV2_buildPessoaResolution_('AMBIGUO', { nome: request.nome }, 'indice_pessoas_v2_nome');
    }
    return atividadesV2_buildPessoaResolution_('RESOLVIDO', index.byName[nome], 'indice_pessoas_v2_nome');
  }

  return atividadesV2_buildPessoaResolution_('NAO_ENCONTRADO', request, index.loaded ? 'indice_pessoas_v2_sem_match' : 'indice_pessoas_v2_indisponivel');
}

function atividadesV2_getPessoaResolverIndex_() {
  if (ATIVIDADES_V2_PESSOA_RESOLVER_INDEX_) return ATIVIDADES_V2_PESSOA_RESOLVER_INDEX_;

  var index = {
    loaded: false,
    byId: {},
    byRga: {},
    byEmail: {},
    byName: {},
    ambiguousNames: {},
    totalPessoas: 0,
    source: '',
    erros: []
  };

  atividadesV2_listPessoasFromCore_().forEach(function(record) {
    atividadesV2_addPessoaToResolverIndex_(index, record);
  });
  if (index.totalPessoas > 0) index.source = 'core';
  if (index.totalPessoas === 0) {
    atividadesV2_listPessoasFromDomain_().forEach(function(record) {
      atividadesV2_addPessoaToResolverIndex_(index, record);
    });
    if (index.totalPessoas > 0) index.source = 'spreadsheet_dev_fallback';
  }
  index.loaded = index.totalPessoas > 0;
  ATIVIDADES_V2_PESSOA_RESOLVER_INDEX_ = index;
  return index;
}

function atividadesV2_listPessoasFromCore_() {
  var out = [];
  var seen = {};
  var api = typeof GEAPA_CORE !== 'undefined' && GEAPA_CORE ? GEAPA_CORE : null;
  var listCalls = [
    api && api.domainsV2 && api.domainsV2.pessoasListCurrentMembers,
    api && api.domainsV2 && api.domainsV2.pessoasListExMembers,
    api && api.domainsV2 && api.domainsV2.pessoasListWaitingMembers,
    api && api.domainsV2 && api.domainsV2.pessoasListAcademicCollaborators,
    api && api.domainsV2 && api.domainsV2.pessoasListExternalParticipants,
    typeof corePessoasListCurrentMembers === 'function' ? corePessoasListCurrentMembers : null,
    typeof corePessoasListExMembers === 'function' ? corePessoasListExMembers : null,
    typeof corePessoasListWaitingMembers === 'function' ? corePessoasListWaitingMembers : null,
    typeof corePessoasListAcademicCollaborators === 'function' ? corePessoasListAcademicCollaborators : null,
    typeof corePessoasListExternalParticipants === 'function' ? corePessoasListExternalParticipants : null
  ];

  listCalls.forEach(function(fn) {
    if (typeof fn !== 'function') return;
    try {
      (fn({ includeInactive: true }) || []).forEach(function(item) {
        var normalized = atividadesV2_normalizePessoaListItem_(item);
        if (!normalized.ID_PESSOA || seen[normalized.ID_PESSOA]) return;
        seen[normalized.ID_PESSOA] = true;
        out.push(normalized);
      });
    } catch (err) {
      // O fallback por API pontual continua disponivel quando o indice falhar.
    }
  });

  return out;
}

function atividadesV2_listPessoasFromDomain_() {
  atividades_assertCoreLibrary_();
  if (typeof GEAPA_CORE.coreGetDomainSpreadsheet !== 'function') {
    throw new Error('GEAPA_CORE_DESATUALIZADO: coreGetDomainSpreadsheet indisponivel.');
  }
  var environment = atividadesV2_resolveEnvironment_({});
  var ss = GEAPA_CORE.coreGetDomainSpreadsheet('PESSOAS', { ambiente: environment });
  var base = atividadesV2_readPessoaRecordsBySheetName_(ss, 'PESSOAS_BASE');
  var identificadores = atividadesV2_readPessoaRecordsBySheetName_(ss, 'PESSOAS_IDENTIFICADORES');
  var membros = atividadesV2_readPessoaRecordsBySheetName_(ss, 'MEMBROS_DETALHES');
  var resumo = atividadesV2_readPessoaRecordsBySheetName_(ss, 'PESSOAS_RESUMO_OPERACIONAL');
  var colaboradores = atividadesV2_readPessoaRecordsBySheetName_(ss, 'COLABORADORES_ACADEMICOS');
  var externos = atividadesV2_readPessoaRecordsBySheetName_(ss, 'PARTICIPANTES_EXTERNOS_DETALHES');

  var byId = {};
  base.forEach(function(record) {
    var id = String(record.ID_PESSOA || '').trim();
    if (!id) return;
    byId[id] = {
      ID_PESSOA: id,
      RGA: '',
      EMAIL: record.EMAIL_PRINCIPAL || '',
      NOME: record.NOME_EXIBICAO || record.NOME_COMPLETO || ''
    };
  });

  identificadores.forEach(function(record) {
    var id = String(record.ID_PESSOA || '').trim();
    if (!id) return;
    if (!byId[id]) byId[id] = { ID_PESSOA: id, RGA: '', EMAIL: '', NOME: '' };
    var tipo = atividades_normalizeTextUpper_(record.TIPO_IDENTIFICADOR || '');
    var valor = String(record.VALOR_IDENTIFICADOR || '').trim();
    if (tipo === 'RGA' && valor && !byId[id].RGA) byId[id].RGA = valor;
    if (tipo === 'EMAIL' && valor && !byId[id].EMAIL) byId[id].EMAIL = valor;
  });

  membros.forEach(function(record) {
    atividadesV2_mergePessoaDetailIntoFallback_(byId, record, {
      rga: 'RGA'
    });
  });
  colaboradores.forEach(function(record) {
    atividadesV2_mergePessoaDetailIntoFallback_(byId, record, {
      email: 'EMAIL_INSTITUCIONAL'
    });
  });
  externos.forEach(function(record) {
    atividadesV2_mergePessoaDetailIntoFallback_(byId, record, {
      email: 'EMAIL'
    });
  });
  resumo.forEach(function(record) {
    var id = String(record.ID_PESSOA || '').trim();
    if (!id) return;
    if (!byId[id]) byId[id] = { ID_PESSOA: id, RGA: '', EMAIL: '', NOME: '' };
    if (record.RGA && !byId[id].RGA) byId[id].RGA = record.RGA;
    if (record.EMAIL && !byId[id].EMAIL) byId[id].EMAIL = record.EMAIL;
    if (record.NOME_EXIBICAO && !byId[id].NOME) byId[id].NOME = record.NOME_EXIBICAO;
  });

  return Object.keys(byId).map(function(id) {
    return byId[id];
  });
}

function atividadesV2_readPessoaRecordsBySheetName_(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  return sheet ? atividadesV2_readSheetObjects_(sheet) : [];
}

function atividadesV2_mergePessoaDetailIntoFallback_(byId, record, fields) {
  var id = String(record.ID_PESSOA || '').trim();
  if (!id) return;
  if (!byId[id]) byId[id] = { ID_PESSOA: id, RGA: '', EMAIL: '', NOME: '' };
  if (fields.rga && record[fields.rga] && !byId[id].RGA) byId[id].RGA = record[fields.rga];
  if (fields.email && record[fields.email] && !byId[id].EMAIL) byId[id].EMAIL = record[fields.email];
}

function atividadesV2_normalizePessoaListItem_(item) {
  var raw = item || {};
  var pessoa = raw.pessoa || {};
  var detalhe = raw.detalhe || {};
  var resumo = raw.resumoOperacional || {};
  return {
    ID_PESSOA: atividadesV2_firstNonEmpty_(raw.ID_PESSOA, raw.idPessoa, pessoa.ID_PESSOA, detalhe.ID_PESSOA, resumo.ID_PESSOA),
    RGA: atividadesV2_firstNonEmpty_(raw.RGA, raw.rga, detalhe.RGA, resumo.RGA),
    EMAIL: atividadesV2_firstNonEmpty_(raw.EMAIL, raw.email, pessoa.EMAIL_PRINCIPAL, resumo.EMAIL),
    NOME: atividadesV2_firstNonEmpty_(raw.NOME, raw.nome, pessoa.NOME_EXIBICAO, pessoa.NOME_COMPLETO, resumo.NOME_EXIBICAO)
  };
}

function atividadesV2_addPessoaToResolverIndex_(index, record) {
  var idPessoa = String(record.ID_PESSOA || '').trim();
  if (!idPessoa) return;
  index.totalPessoas++;
  index.byId[idPessoa] = record;

  var rga = atividadesV2_sanitizeIdToken_(record.RGA || '');
  var email = String(record.EMAIL || '').trim().toLowerCase();
  var nome = atividadesV2_normalizePessoaNameKey_(record.NOME || '');
  if (rga && !index.byRga[rga]) index.byRga[rga] = record;
  if (email && !index.byEmail[email]) index.byEmail[email] = record;
  if (nome) {
    if (index.byName[nome] && String(index.byName[nome].ID_PESSOA || '') !== idPessoa) {
      index.ambiguousNames[nome] = true;
    } else {
      index.byName[nome] = record;
    }
  }
}

function atividadesV2_normalizePessoaNameKey_(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function atividadesV2_tryResolvePessoaViaCore_(request) {
  if (ATIVIDADES_V2_PESSOA_RESOLVER_DISABLE_POINT_LOOKUP_) {
    return atividadesV2_buildPessoaResolution_('NAO_ENCONTRADO', request, 'indice_pessoas_v2_sem_match');
  }

  var direct = atividadesV2_tryResolvePessoaViaCorePublicApis_(request);
  if (direct.statusResolucao === 'RESOLVIDO' || direct.statusResolucao === 'AMBIGUO') return direct;

  var candidates = [];
  if (typeof geapaCoreResolverPessoa === 'function') candidates.push(geapaCoreResolverPessoa);
  if (typeof GEAPA_CORE !== 'undefined' && GEAPA_CORE) {
    [
      'pessoasResolverPessoa',
      'coreResolverPessoa',
      'coreResolverPessoaV2',
      'corePessoasResolverPessoa',
      'resolverPessoa',
      'buscarPessoa',
      'coreBuscarPessoa'
    ].forEach(function(name) {
      if (typeof GEAPA_CORE[name] === 'function') candidates.push(GEAPA_CORE[name]);
    });
    if (GEAPA_CORE.pessoas && typeof GEAPA_CORE.pessoas.resolverPessoa === 'function') {
      candidates.push(GEAPA_CORE.pessoas.resolverPessoa);
    }
    if (GEAPA_CORE.portal && typeof GEAPA_CORE.portal.resolverPessoa === 'function') {
      candidates.push(GEAPA_CORE.portal.resolverPessoa);
    }
  }

  for (var i = 0; i < candidates.length; i++) {
    try {
      var result = candidates[i](request);
      var normalized = atividadesV2_normalizePessoaCoreResult_(result);
      if (normalized.statusResolucao === 'RESOLVIDO') return normalized;
      if (normalized.statusResolucao === 'AMBIGUO') return normalized;
    } catch (err) {
      // Resolver indisponivel nao pode bloquear compatibilidade legada.
    }
  }

  return atividadesV2_buildPessoaResolution_('NAO_ENCONTRADO', request, direct.origem || 'core_indisponivel');
}

function atividadesV2_tryResolvePessoaViaCorePublicApis_(request) {
  var calls = atividadesV2_getCorePessoaPublicApiCalls_(request);
  var sawApi = false;
  var sawError = false;

  for (var i = 0; i < calls.length; i++) {
    var call = calls[i];
    if (!call.available || !call.shouldRun) continue;
    sawApi = true;
    try {
      var result = call.fn.apply(null, call.args);
      var normalized = atividadesV2_normalizePessoaCoreResult_(result);
      normalized.origem = call.origem;
      if (normalized.statusResolucao === 'RESOLVIDO') return normalized;
      if (normalized.statusResolucao === 'AMBIGUO') return normalized;
    } catch (err) {
      sawError = true;
    }
  }

  return atividadesV2_buildPessoaResolution_(
    'NAO_ENCONTRADO',
    request,
    sawError ? 'core_apis_com_erro' : (sawApi ? 'core_apis_sem_match' : 'core_sem_api_publica_pessoas')
  );
}

function atividadesV2_getCorePessoaPublicApiCalls_(request) {
  var api = typeof GEAPA_CORE !== 'undefined' && GEAPA_CORE ? GEAPA_CORE : null;
  var rga = String(request.rga || '').trim();
  var email = String(request.email || '').trim();
  var idPessoa = String(request.idPessoa || '').trim();
  var idReferencia = String(request.idReferencia || '').trim();
  var portalInput = {
    idPessoa: idPessoa,
    rga: rga,
    email: email,
    identificador: email || rga || idPessoa || idReferencia
  };

  return [
    {
      origem: 'corePessoasGetById',
      available: typeof corePessoasGetById === 'function',
      shouldRun: !!idPessoa,
      fn: typeof corePessoasGetById === 'function' ? corePessoasGetById : null,
      args: [idPessoa]
    },
    {
      origem: 'GEAPA_CORE.corePessoasGetById',
      available: !!(api && typeof api.corePessoasGetById === 'function'),
      shouldRun: !!idPessoa,
      fn: api && api.corePessoasGetById,
      args: [idPessoa]
    },
    {
      origem: 'GEAPA_CORE.domainsV2.pessoasGetById',
      available: !!(api && api.domainsV2 && typeof api.domainsV2.pessoasGetById === 'function'),
      shouldRun: !!idPessoa,
      fn: api && api.domainsV2 && api.domainsV2.pessoasGetById,
      args: [idPessoa]
    },
    {
      origem: 'corePessoasFindByRga',
      available: typeof corePessoasFindByRga === 'function',
      shouldRun: !!rga,
      fn: typeof corePessoasFindByRga === 'function' ? corePessoasFindByRga : null,
      args: [rga]
    },
    {
      origem: 'GEAPA_CORE.corePessoasFindByRga',
      available: !!(api && typeof api.corePessoasFindByRga === 'function'),
      shouldRun: !!rga,
      fn: api && api.corePessoasFindByRga,
      args: [rga]
    },
    {
      origem: 'GEAPA_CORE.domainsV2.pessoasFindByRga',
      available: !!(api && api.domainsV2 && typeof api.domainsV2.pessoasFindByRga === 'function'),
      shouldRun: !!rga,
      fn: api && api.domainsV2 && api.domainsV2.pessoasFindByRga,
      args: [rga]
    },
    {
      origem: 'corePessoasFindByEmail',
      available: typeof corePessoasFindByEmail === 'function',
      shouldRun: !!email,
      fn: typeof corePessoasFindByEmail === 'function' ? corePessoasFindByEmail : null,
      args: [email]
    },
    {
      origem: 'GEAPA_CORE.corePessoasFindByEmail',
      available: !!(api && typeof api.corePessoasFindByEmail === 'function'),
      shouldRun: !!email,
      fn: api && api.corePessoasFindByEmail,
      args: [email]
    },
    {
      origem: 'GEAPA_CORE.domainsV2.pessoasFindByEmail',
      available: !!(api && api.domainsV2 && typeof api.domainsV2.pessoasFindByEmail === 'function'),
      shouldRun: !!email,
      fn: api && api.domainsV2 && api.domainsV2.pessoasFindByEmail,
      args: [email]
    },
    {
      origem: 'corePortalResolverUsuarioAtual',
      available: typeof corePortalResolverUsuarioAtual === 'function',
      shouldRun: !!(email || rga || idPessoa || idReferencia),
      fn: typeof corePortalResolverUsuarioAtual === 'function' ? corePortalResolverUsuarioAtual : null,
      args: [portalInput, { modo: atividadesV2_resolveEnvironment_({}) }]
    },
    {
      origem: 'GEAPA_CORE.corePortalResolverUsuarioAtual',
      available: !!(api && typeof api.corePortalResolverUsuarioAtual === 'function'),
      shouldRun: !!(email || rga || idPessoa || idReferencia),
      fn: api && api.corePortalResolverUsuarioAtual,
      args: [portalInput, { modo: atividadesV2_resolveEnvironment_({}) }]
    },
    {
      origem: 'GEAPA_CORE.portal.access.resolverUsuarioAtual',
      available: !!(api && api.portal && api.portal.access && typeof api.portal.access.resolverUsuarioAtual === 'function'),
      shouldRun: !!(email || rga || idPessoa || idReferencia),
      fn: api && api.portal && api.portal.access && api.portal.access.resolverUsuarioAtual,
      args: [portalInput, { modo: atividadesV2_resolveEnvironment_({}) }]
    }
  ];
}

function atividadesV2_normalizePessoaCoreResult_(result) {
  if (!result) return atividadesV2_buildPessoaResolution_('NAO_ENCONTRADO', {}, 'core');
  if (result.ok === false) {
    return atividadesV2_buildPessoaResolution_(
      result.errorCode === 'PESSOA_AMBIGUA' ? 'AMBIGUO' : 'NAO_ENCONTRADO',
      result.data || result,
      'core'
    );
  }

  var data = result.data || result.pessoa || result;
  var idPessoa = atividadesV2_firstNonEmpty_(data.ID_PESSOA, data.ID_PESSOA_APRESENTADOR, data.idPessoa, data.id_pessoa, data.id);
  if (idPessoa) return atividadesV2_buildPessoaResolution_('RESOLVIDO', data, 'core');

  if (result.pessoa && result.pessoa.ID_PESSOA) {
    return atividadesV2_buildPessoaResolution_('RESOLVIDO', result.pessoa, 'core');
  }

  var status = atividades_normalizeTextUpper_(result.statusResolucao || result.status || '');
  if (status === 'AMBIGUO') return atividadesV2_buildPessoaResolution_('AMBIGUO', data, 'core');
  return atividadesV2_buildPessoaResolution_('NAO_ENCONTRADO', data, 'core');
}

function atividadesV2_buildPessoaResolution_(status, data, origem) {
  var raw = data || {};
  return {
    statusResolucao: atividades_normalizeTextUpper_(status || 'NAO_ENCONTRADO'),
    idPessoa: String(atividadesV2_firstNonEmpty_(raw.ID_PESSOA, raw.ID_PESSOA_APRESENTADOR, raw.idPessoa, raw.id_pessoa, raw.id) || '').trim(),
    idReferencia: String(atividadesV2_firstNonEmpty_(raw.ID_REFERENCIA, raw.idReferencia) || '').trim(),
    rga: String(atividadesV2_firstNonEmpty_(raw.RGA, raw.rga, atividadesV2_legacyReferenceAsRga_(raw.ID_REFERENCIA || raw.idReferencia)) || '').trim(),
    email: String(atividadesV2_firstNonEmpty_(raw.EMAIL, raw.email, raw.EMAIL_MEMBRO, raw.EMAIL_PARTICIPANTE, raw.EMAIL_APRESENTADOR) || '').trim(),
    nome: String(atividadesV2_firstNonEmpty_(raw.NOME, raw.nome, raw.NOME_MEMBRO, raw.NOME_MEMBRO_PUBLICO, raw.NOME_PARTICIPANTE, raw.NOME_APRESENTADOR_PUBLICO, raw.nomeExibicao) || '').trim(),
    origem: String(origem || '').trim()
  };
}

function atividadesV2_legacyReferenceAsRga_(value) {
  var ref = String(value || '').trim();
  return /^\d{6,20}$/.test(ref) ? ref : '';
}

/**
 * Diagnostica lacunas de ID_PESSOA nas abas v2 do ambiente resolvido sem alterar dados.
 *
 * Use antes de complementar a base para revisar quantas linhas ja possuem
 * ID_PESSOA, quantas podem ser resolvidas pelo CORE e quais precisam de
 * conferencia manual.
 */
function atividadesV2_diagnosticarIdPessoaDev() {
  return atividadesV2_processarIdPessoaDev_({
    dryRun: true
  });
}

/**
 * Verifica quais APIs de Pessoas v2 estao disponiveis para este modulo e testa
 * uma amostra real das abas de atividades, sem alterar dados.
 */
function atividadesV2_diagnosticarResolverPessoaDev() {
  var ss = atividadesV2_getDatabaseSpreadsheet_({ ambiente: 'DEV' });
  var sample = atividadesV2_getPessoaResolverSample_(ss);
  var request = atividadesV2_buildPessoaResolution_('NAO_ENCONTRADO', sample.input || {}, 'amostra');
  var calls = atividadesV2_getCorePessoaPublicApiCalls_(request).map(function(call) {
    return {
      origem: call.origem,
      available: call.available === true,
      shouldRun: call.shouldRun === true
    };
  });
  var resolved = sample.input ? atividadesV2_resolverPessoa_(sample.input) : null;

  return {
    ok: true,
    modo: atividadesV2_resolveEnvironment_({}),
    spreadsheetId: ss.getId(),
    apis: calls,
    amostra: sample,
    resolucaoAmostra: resolved,
    aviso: resolved && resolved.statusResolucao === 'NAO_ENCONTRADO'
      ? 'Amostra nao resolvida. Confira se GEAPA_CORE publicado neste projeto expoe corePessoasFindByRga/corePessoasFindByEmail/corePortalResolverUsuarioAtual e se a pessoa existe em Pessoas v2.'
      : ''
  };
}

/**
 * Complementa ID_PESSOA nas abas v2 do ambiente resolvido usando informacoes ja existentes
 * nas linhas, como RGA, e-mail e nome.
 *
 * A rotina nao sobrescreve ID_PESSOA ja preenchido por padrao e nao altera
 * producao. Linhas ambiguas ou nao encontradas ficam sem mudanca e aparecem
 * no relatorio para conferencia.
 */
function atividadesV2_complementarIdPessoaDev(options) {
  return atividadesV2_processarIdPessoaDev_(options || {});
}

/**
 * Complementa ID_PESSOA em todas as abas v2 do ambiente resolvido que possuem vinculos
 * individuais. Esta e a funcao manual recomendada para uso rotineiro.
 *
 * Pode ser rodada novamente: IDs ja preenchidos sao preservados.
 */
function atividadesV2_complementarIdPessoaTodasAbasDev() {
  return atividadesV2_processarIdPessoaDev_({
    sheetNames: atividadesV2_getPessoaCompletionSheetNames_(),
    maxMs: 300000
  });
}

function atividadesV2_processarIdPessoaDev_(options) {
  var opts = options || {};
  var dryRun = opts.dryRun === true;
  var force = opts.force === true;
  var maxMs = Number(opts.maxMs || 300000);
  var maxRows = Number(opts.maxRows || 0);
  var sheetNameFilter = String(opts.sheetName || opts.aba || '').trim();
  var sheetNamesFilter = atividadesV2_normalizeSheetNamesFilter_(opts.sheetNames || opts.abas);
  var previousDisablePointLookup = ATIVIDADES_V2_PESSOA_RESOLVER_DISABLE_POINT_LOOKUP_;
  ATIVIDADES_V2_PESSOA_RESOLVER_DISABLE_POINT_LOOKUP_ = opts.allowSlowLookup === true ? false : true;
  atividadesV2_resetPessoaResolverRuntimeCache_();
  var ss = atividadesV2_getDatabaseSpreadsheet_({ ambiente: 'DEV' });
  var startedAt = new Date();
  var deadline = startedAt.getTime() + Math.max(60000, Math.min(maxMs, 330000));
  var result = {
    ok: true,
    modo: atividadesV2_resolveEnvironment_({}),
    dryRun: dryRun,
    force: force,
    spreadsheetId: ss.getId(),
    url: ss.getUrl(),
    totalAbas: 0,
    totalLinhas: 0,
    totalJaPreenchidos: 0,
    totalResolvidos: 0,
    totalAmbiguos: 0,
    totalNaoEncontrados: 0,
    totalSemDadosMinimos: 0,
    totalAtualizados: 0,
    interrompidoPorLimite: false,
    pessoaIndex: {},
    abas: {},
    avisos: [],
    erros: []
  };

  var pessoaIndex = atividadesV2_getPessoaResolverIndex_();
  result.pessoaIndex = {
    loaded: pessoaIndex.loaded,
    totalPessoas: pessoaIndex.totalPessoas,
    source: pessoaIndex.source || ''
  };

  try {
    atividadesV2_getPessoaCompletionTargets_().forEach(function(target) {
      if (result.interrompidoPorLimite) return;
      if (sheetNameFilter && target.sheetName !== sheetNameFilter) return;
      if (sheetNamesFilter && !sheetNamesFilter[target.sheetName]) return;
      result.totalAbas++;
      try {
        var sheet = ss.getSheetByName(target.sheetName);
        if (!sheet) {
          result.avisos.push('Aba nao encontrada: ' + target.sheetName);
          result.abas[target.sheetName] = atividadesV2_emptyPessoaSheetReport_(target, 'ABA_NAO_ENCONTRADA');
          return;
        }

        var report = atividadesV2_processarIdPessoaSheet_(sheet, target, {
          dryRun: dryRun,
          force: force,
          deadline: deadline,
          maxRows: maxRows,
          result: result
        });
        result.abas[target.sheetName] = report;
        result.totalLinhas += report.totalLinhas;
        result.totalJaPreenchidos += report.jaPreenchidos;
        result.totalResolvidos += report.resolvidos;
        result.totalAmbiguos += report.ambiguos;
        result.totalNaoEncontrados += report.naoEncontrados;
        result.totalSemDadosMinimos += report.semDadosMinimos;
        result.totalAtualizados += report.atualizados;
        report.avisos.forEach(function(aviso) {
          result.avisos.push(target.sheetName + ': ' + aviso);
        });
      } catch (err) {
        result.ok = false;
        result.erros.push({
          sheetName: target.sheetName,
          message: err && err.message ? err.message : String(err)
        });
      }
    });
  } finally {
    ATIVIDADES_V2_PESSOA_RESOLVER_DISABLE_POINT_LOOKUP_ = previousDisablePointLookup;
  }

  result.tempoTotalMs = new Date().getTime() - startedAt.getTime();
  atividadesV2_logSetup_(result.ok ? 'INFO' : 'WARN', 'Diagnostico/complementacao de ID_PESSOA v2 do ambiente resolvido finalizado.', {
    dryRun: dryRun,
    pessoaIndex: result.pessoaIndex,
    resolvidos: result.totalResolvidos,
    atualizados: result.totalAtualizados,
    ambiguos: result.totalAmbiguos,
    naoEncontrados: result.totalNaoEncontrados,
    erros: result.erros.length
  });

  return result;
}

function atividadesV2_getPessoaCompletionSheetNames_() {
  return [
    ATIVIDADES_V2_SHEETS.ATIVIDADES,
    ATIVIDADES_V2_SHEETS.APRESENTACOES,
    ATIVIDADES_V2_SHEETS.ENVOLVIDOS,
    ATIVIDADES_V2_SHEETS.PRESENCAS_REGISTROS,
    ATIVIDADES_V2_SHEETS.JUSTIFICATIVAS,
    ATIVIDADES_V2_SHEETS.PORTAL_FREQUENCIA_MEMBROS,
    ATIVIDADES_V2_SHEETS.PORTAL_JUSTIFICATIVAS
  ];
}

function atividadesV2_normalizeSheetNamesFilter_(value) {
  if (!value) return null;
  var list = Array.isArray(value) ? value : String(value || '').split(',');
  var out = {};
  list.forEach(function(name) {
    var sheetName = String(name || '').trim();
    if (sheetName) out[sheetName] = true;
  });
  return Object.keys(out).length ? out : null;
}

function atividadesV2_getPessoaCompletionTargets_() {
  return [
    {
      sheetName: ATIVIDADES_V2_SHEETS.ATIVIDADES,
      schema: ATIVIDADES_V2_SCHEMA.ATIVIDADES,
      idHeader: 'ID_PESSOA_PRINCIPAL',
      sourceHeaders: ['RGA_PESSOA_PRINCIPAL', 'EMAIL_PESSOA_PRINCIPAL', 'NOME_PESSOA_PRINCIPAL_PUBLICO']
    },
    {
      sheetName: ATIVIDADES_V2_SHEETS.APRESENTACOES,
      schema: ATIVIDADES_V2_SCHEMA.APRESENTACOES,
      idHeader: 'ID_PESSOA',
      sourceHeaders: ['RGA', 'EMAIL_MEMBRO', 'NOME_MEMBRO'],
      optionalHeader: true
    },
    {
      sheetName: ATIVIDADES_V2_SHEETS.ENVOLVIDOS,
      schema: ATIVIDADES_V2_SCHEMA.ENVOLVIDOS,
      idHeader: 'ID_PESSOA',
      sourceHeaders: ['RGA', 'EMAIL', 'NOME_PUBLICO']
    },
    {
      sheetName: ATIVIDADES_V2_SHEETS.PRESENCAS_REGISTROS,
      schema: ATIVIDADES_V2_SCHEMA.PRESENCAS_REGISTROS,
      idHeader: 'ID_PESSOA',
      sourceHeaders: ['RGA', 'EMAIL_PARTICIPANTE', 'NOME_PARTICIPANTE', 'ID_REFERENCIA']
    },
    {
      sheetName: ATIVIDADES_V2_SHEETS.CONVITES,
      schema: ATIVIDADES_V2_SCHEMA.CONVITES,
      idHeader: 'ID_PESSOA',
      sourceHeaders: ['ID_REFERENCIA', 'EMAIL', 'NOME']
    },
    {
      sheetName: ATIVIDADES_V2_SHEETS.JUSTIFICATIVAS,
      schema: ATIVIDADES_V2_SCHEMA.JUSTIFICATIVAS,
      idHeader: 'ID_PESSOA',
      sourceHeaders: ['RGA', 'EMAIL_MEMBRO', 'NOME_MEMBRO']
    },
    {
      sheetName: ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_DETALHES,
      schema: ATIVIDADES_V2_SCHEMA.PORTAL_ATIVIDADES_DETALHES,
      idHeader: 'ID_PESSOA_APRESENTADOR',
      sourceHeaders: ['RGA_APRESENTADOR', 'EMAIL_APRESENTADOR', 'NOME_APRESENTADOR_PUBLICO']
    },
    {
      sheetName: ATIVIDADES_V2_SHEETS.PORTAL_FREQUENCIA_MEMBROS,
      schema: ATIVIDADES_V2_SCHEMA.PORTAL_FREQUENCIA_MEMBROS,
      idHeader: 'ID_PESSOA',
      sourceHeaders: ['RGA', 'EMAIL', 'NOME_MEMBRO']
    },
    {
      sheetName: ATIVIDADES_V2_SHEETS.PORTAL_JUSTIFICATIVAS,
      schema: ATIVIDADES_V2_SCHEMA.PORTAL_JUSTIFICATIVAS,
      idHeader: 'ID_PESSOA',
      sourceHeaders: ['RGA', 'NOME_MEMBRO']
    }
  ];
}

function atividadesV2_processarIdPessoaSheet_(sheet, target, options) {
  var opts = options || {};
  var report = atividadesV2_emptyPessoaSheetReport_(target, 'OK');
  atividadesV2_applyHeadersIfMissing_(sheet, target.schema);

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return report;

  var headers = atividadesV2_getSheetHeaders_(sheet);
  var headerMap = atividadesV2_simpleHeaderMap_(headers);
  var idCol = headerMap[target.idHeader] || 0;
  if (!idCol) {
    report.status = 'CABECALHO_ID_AUSENTE';
    if (!target.optionalHeader) {
      report.avisos.push('Cabecalho ausente: ' + target.idHeader);
    }
    return report;
  }

  var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  var idValues = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();
  var exemplos = [];
  var processedCandidates = 0;

  values.forEach(function(row, index) {
    if (opts.result && opts.result.interrompidoPorLimite) return;
    if (opts.deadline && new Date().getTime() > opts.deadline) {
      report.avisos.push('Processamento interrompido por limite de tempo. Rode novamente para continuar.');
      if (opts.result) opts.result.interrompidoPorLimite = true;
      return;
    }
    report.totalLinhas++;
    var currentId = String(row[idCol - 1] || '').trim();
    if (currentId && !opts.force) {
      report.jaPreenchidos++;
      return;
    }

    if (opts.maxRows && processedCandidates >= opts.maxRows) {
      report.avisos.push('Processamento interrompido por limite de linhas desta execucao. Rode novamente para continuar.');
      if (opts.result) opts.result.interrompidoPorLimite = true;
      return;
    }
    processedCandidates++;

    var input = atividadesV2_buildPessoaInputFromRow_(row, headerMap, target);
    if (!atividadesV2_hasPessoaMinimumData_(input)) {
      report.semDadosMinimos++;
      atividadesV2_addPessoaExample_(exemplos, index + 2, 'SEM_DADOS_MINIMOS', input);
      return;
    }

    var resolved = atividadesV2_resolverPessoa_(input);
    if (resolved.statusResolucao === 'RESOLVIDO' && resolved.idPessoa) {
      report.resolvidos++;
      atividadesV2_countPessoaResolutionOrigin_(report, resolved.origem);
      if (!opts.dryRun) {
        idValues[index][0] = resolved.idPessoa;
        report.atualizados++;
      }
      atividadesV2_addPessoaExample_(exemplos, index + 2, 'RESOLVIDO', input, resolved);
      return;
    }

    if (resolved.statusResolucao === 'AMBIGUO') {
      report.ambiguos++;
      atividadesV2_countPessoaResolutionOrigin_(report, resolved.origem);
      atividadesV2_addPessoaExample_(exemplos, index + 2, 'AMBIGUO', input, resolved);
      return;
    }

    report.naoEncontrados++;
    atividadesV2_countPessoaResolutionOrigin_(report, resolved.origem);
    atividadesV2_addPessoaExample_(exemplos, index + 2, 'NAO_ENCONTRADO', input, resolved);
  });

  if (!opts.dryRun && report.atualizados > 0) {
    sheet.getRange(2, idCol, idValues.length, 1).setValues(idValues);
  }

  report.exemplos = exemplos;
  return report;
}

function atividadesV2_buildPessoaInputFromRow_(row, headerMap, target) {
  var input = {};
  (target.sourceHeaders || []).forEach(function(header) {
    var col = headerMap[header] || 0;
    if (!col) return;
    var value = row[col - 1];
    if (value === null || value === undefined || value === '') return;
    input[header] = value;
  });
  return input;
}

function atividadesV2_getPessoaResolverSample_(ss) {
  var targets = atividadesV2_getPessoaCompletionTargets_();
  for (var i = 0; i < targets.length; i++) {
    var target = targets[i];
    var sheet = ss.getSheetByName(target.sheetName);
    if (!sheet || sheet.getLastRow() < 2) continue;

    atividadesV2_applyHeadersIfMissing_(sheet, target.schema);
    var headers = atividadesV2_getSheetHeaders_(sheet);
    var headerMap = atividadesV2_simpleHeaderMap_(headers);
    var idCol = headerMap[target.idHeader] || 0;
    var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();

    for (var rowIndex = 0; rowIndex < values.length; rowIndex++) {
      if (idCol && String(values[rowIndex][idCol - 1] || '').trim()) continue;
      var input = atividadesV2_buildPessoaInputFromRow_(values[rowIndex], headerMap, target);
      if (!atividadesV2_hasPessoaMinimumData_(input)) continue;
      return {
        sheetName: target.sheetName,
        rowNumber: rowIndex + 2,
        idHeader: target.idHeader,
        input: input
      };
    }
  }

  return {
    sheetName: '',
    rowNumber: '',
    idHeader: '',
    input: null,
    aviso: 'Nenhuma linha sem ID_PESSOA e com dados minimos foi encontrada.'
  };
}

function atividadesV2_countPessoaResolutionOrigin_(report, origem) {
  var key = String(origem || 'indefinida').trim() || 'indefinida';
  report.origens[key] = (report.origens[key] || 0) + 1;
}

function atividadesV2_hasPessoaMinimumData_(input) {
  return !!String(atividadesV2_firstNonEmpty_(
    input.ID_PESSOA,
    input.ID_PESSOA_APRESENTADOR,
    input.RGA,
    input.rga,
    input.EMAIL,
    input.email,
    input.EMAIL_MEMBRO,
    input.EMAIL_PARTICIPANTE,
    input.EMAIL_APRESENTADOR,
    input.ID_REFERENCIA,
    input.NOME,
    input.nome,
    input.NOME_MEMBRO,
    input.NOME_PARTICIPANTE,
    input.NOME_MEMBRO_PUBLICO,
    input.NOME_APRESENTADOR_PUBLICO
  ) || '').trim();
}

function atividadesV2_emptyPessoaSheetReport_(target, status) {
  return {
    sheetName: target.sheetName,
    idHeader: target.idHeader,
    status: status,
    totalLinhas: 0,
    jaPreenchidos: 0,
    resolvidos: 0,
    ambiguos: 0,
    naoEncontrados: 0,
    semDadosMinimos: 0,
    atualizados: 0,
    origens: {},
    avisos: [],
    exemplos: []
  };
}

function atividadesV2_addPessoaExample_(out, rowNumber, status, input, resolved) {
  if (out.length >= 10) return;
  out.push({
    rowNumber: rowNumber,
    status: status,
    idPessoa: resolved && resolved.idPessoa ? resolved.idPessoa : '',
    rga: String(atividadesV2_firstNonEmpty_(input.RGA, input.rga, resolved && resolved.rga) || '').trim(),
    emailPresente: !!String(atividadesV2_firstNonEmpty_(
      input.EMAIL,
      input.email,
      input.EMAIL_MEMBRO,
      input.EMAIL_PARTICIPANTE,
      input.EMAIL_APRESENTADOR,
      resolved && resolved.email
    ) || '').trim(),
    nome: String(atividadesV2_firstNonEmpty_(
      input.NOME,
      input.nome,
      input.NOME_MEMBRO,
      input.NOME_PARTICIPANTE,
      input.NOME_MEMBRO_PUBLICO,
      input.NOME_APRESENTADOR_PUBLICO,
      resolved && resolved.nome
    ) || '').trim()
  });
}
