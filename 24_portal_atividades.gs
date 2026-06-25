/**
 * Contrato publico de leitura segura para o Portal GEAPA.
 *
 * Este arquivo nao escreve em planilhas. Ele le views PORTAL_* da base v2 DEV,
 * aplica filtros de visibilidade e devolve objetos sanitizados para consumo
 * pelo portal.
 */

function atividades_normalizePortalContext_(contexto) {
  var raw = contexto || {};
  var perfil = atividades_normalizeTextUpper_(
    raw.perfil ||
    raw.perfilPortalEfetivo ||
    raw.perfilPortal ||
    'MEMBRO'
  );
  var allowedProfiles = ['MEMBRO', 'SECRETARIO', 'DIRETORIA', 'ADMIN_TECNICO'];

  if (perfil === 'SECRETARIA') perfil = 'SECRETARIO';
  if (perfil === 'PRESIDENCIA' || perfil === 'PRESIDENTE') perfil = 'DIRETORIA';
  if (allowedProfiles.indexOf(perfil) === -1) perfil = 'MEMBRO';

  return {
    perfil: perfil,
    idPessoa: String(raw.idPessoa || raw.ID_PESSOA || '').trim(),
    rga: String(raw.rga || '').trim(),
    email: String(raw.email || '').trim(),
    perfisPortal: Array.isArray(raw.perfisPortal) ? raw.perfisPortal.slice() : [],
    permissoes: Array.isArray(raw.permissoes) ? raw.permissoes.slice() : [],
    somenteVisiveis: raw.somenteVisiveis === false ? false : true
  };
}

function atividades_isPrivilegedPortalProfile_(contexto) {
  var perfil = atividades_normalizeTextUpper_(contexto && contexto.perfil);
  return ['SECRETARIO', 'DIRETORIA', 'ADMIN_TECNICO'].indexOf(perfil) >= 0;
}

function atividadesV2_portalGetMinhaFrequencia_(contexto) {
  var perf = portalPerfStart_('atividadesV2_portalGetMinhaFrequencia');
  try {
    var ctx = atividades_normalizePortalContext_(contexto || {});
    if (!atividadesV2_contextHasOwnIdentity_(ctx)) {
      var noIdentityPerf = portalPerfEnd_(perf);
      return portalPerfAttachDiagnostics_({
        ok: false,
        errorCode: 'USUARIO_NAO_IDENTIFICADO',
        message: 'Nao foi possivel identificar o usuario logado para carregar a frequencia propria.',
        origem: 'atividades-v2:Atividades_Presencas_Registros',
        contrato: 'MINHA_FREQUENCIA_DETALHADA_V2',
        tempoTotalMs: noIdentityPerf ? noIdentityPerf.totalMs : ''
      }, noIdentityPerf);
    }
    var cacheKey = portalCacheBuildKey_('frequencia_detalhada_v2', portalCacheContextToken_(ctx));
    var cached = portalCacheGetJson_(cacheKey);
    if (cached && atividadesV2_isMinhaFrequenciaDetailedResponse_(cached)) {
      portalPerfMark_(perf, 'cache_hit_frequencia_detalhada_v2');
      return portalPerfAttachDiagnostics_(cached, portalPerfEnd_(perf));
    }
    if (cached) portalCacheRemove_(cacheKey);

    var ss = atividadesV2_getDatabaseSpreadsheetDev_();
    portalPerfMark_(perf, 'abrir_planilha_v2_dev');
    var data = atividadesV2_buildMinhaFrequenciaPortalData_(ss, ctx, perf);
    var perfResult = portalPerfEnd_(perf);
    var response = portalPerfAttachDiagnostics_({
      ok: true,
      data: data,
      origem: 'atividades-v2:Atividades_Presencas_Registros',
      contrato: 'MINHA_FREQUENCIA_DETALHADA_V2',
      tempoTotalMs: perfResult ? perfResult.totalMs : ''
    }, perfResult);
    portalCachePutJson_(cacheKey, response, ATIVIDADES_V2_PORTAL_PRIVATE_CACHE_TTL_SECONDS);
    return response;
  } catch (err) {
    var errorPerf = portalPerfEnd_(perf);
    return atividadesV2_portalReadonlyError_('atividadesV2_portalGetMinhaFrequencia', err, errorPerf);
  }
}

function atividadesV2_isMinhaFrequenciaDetailedResponse_(response) {
  var data = response && response.data || {};
  if (data.contrato && data.contrato !== 'MINHA_FREQUENCIA_DETALHADA_V2') return false;
  if (!Array.isArray(data.ciclos)) return false;
  if (!data.ciclos.length) return true;
  return Array.isArray(data.ciclos[0].registros);
}

function atividadesV2_buildMinhaFrequenciaPortalData_(ss, ctx, perf) {
  var atividadesSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES);
  var presencasSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.PRESENCAS_REGISTROS);
  var justificativasSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.JUSTIFICATIVAS);
  var atividades = atividadesV2_readSheetObjects_(atividadesSheet);
  var presencas = atividadesV2_readSheetObjects_(presencasSheet);
  var justificativas = atividadesV2_readSheetObjects_(justificativasSheet);
  if (perf) {
    portalPerfMark_(perf, 'ler_bases_frequencia', {
      atividades: atividades.length,
      presencas: presencas.length,
      justificativas: justificativas.length
    });
  }

  var atividadesById = atividadesV2_indexByField_(atividades, 'ID_ATIVIDADE');
  var justificativasByRegistro = atividadesV2_indexActiveJustificativasByRegistro_(justificativas);
  var justificativasByAtividade = atividadesV2_indexActiveJustificativasByActivityForOwnContext_(justificativas, ctx);
  var cycles = {};
  var latest = '';

  presencas.forEach(function(record) {
    if (!atividadesV2_presenceBelongsToOwnContext_(record, ctx)) return;
    if (atividades_normalizeTextUpper_(record.ATIVO || 'SIM') === 'NAO') return;
    var atividade = atividadesById[String(record.ID_ATIVIDADE || '').trim()] || {};
    var cicloKey = atividadesV2_frequencyCycleKey_(record, atividade);
    if (!cycles[cicloKey]) cycles[cicloKey] = atividadesV2_emptyFrequencyCycle_(record, atividade, cicloKey);
    var item = atividadesV2_mapRegistroFrequenciaPortal_(record, atividade, justificativasByRegistro, justificativasByAtividade);
    cycles[cicloKey].registros.push(item);
    atividadesV2_incrementFrequencyResumo_(cycles[cicloKey].resumo, item);
    var updated = String(record.ATUALIZADO_EM || record.REGISTRADO_EM || '').trim();
    if (updated && (!latest || updated > latest)) latest = updated;
  });

  var ciclos = Object.keys(cycles).map(function(key) {
    var ciclo = cycles[key];
    atividadesV2_finalizeFrequencyResumo_(ciclo.resumo);
    ciclo.registros.sort(atividadesV2_sortFrequencyRecords_);
    return ciclo;
  }).sort(atividadesV2_sortFrequencyCycles_);

  var resumoGeral = atividadesV2_mergeFrequencyResumo_(ciclos.map(function(ciclo) { return ciclo.resumo; }));
  atividadesV2_finalizeFrequencyResumo_(resumoGeral);
  if (perf) portalPerfMark_(perf, 'montar_frequencia_por_ciclo', { ciclos: ciclos.length });

  return {
    contrato: 'MINHA_FREQUENCIA_DETALHADA_V2',
    resumoGeral: resumoGeral,
    cicloAtual: ciclos.length ? ciclos[0].ciclo : '',
    ciclos: ciclos,
    ultimaAtualizacao: latest || new Date().toISOString()
  };
}

function atividadesV2_contextHasOwnIdentity_(ctx) {
  return !!String(ctx && (ctx.idPessoa || ctx.rga || ctx.email) || '').trim();
}

function atividadesV2_emptyFrequencyCycle_(record, atividade, key) {
  var ano = String(record.ANO || atividade.ANO || '').trim();
  var semestre = String(record.SEMESTRE || atividade.SEMESTRE || '').trim();
  return {
    ciclo: key,
    cicloOperacional: String(record.CICLO || atividade.CICLO || '').trim(),
    ano: ano,
    semestre: semestre,
    resumo: atividadesV2_emptyFrequencyResumo_(),
    registros: []
  };
}

function atividadesV2_emptyFrequencyResumo_() {
  return {
    totalRegistros: 0,
    totalPresencas: 0,
    totalFaltas: 0,
    totalJustificadas: 0,
    totalAbonadas: 0,
    totalNaoSeAplica: 0,
    faltasLiquidas: 0,
    limiteFaltasPeriodo: '',
    percentualFrequencia: '',
    percentualUsoLimite: '',
    situacaoDisciplinar: '',
    cargaHorariaTotal: 0,
    elegivelCertificado: ''
  };
}

function atividadesV2_mapRegistroFrequenciaPortal_(record, atividade, justificativasByRegistro, justificativasByAtividade) {
  var idRegistro = String(record.ID_REGISTRO_PRESENCA || '').trim();
  var idAtividade = String(record.ID_ATIVIDADE || '').trim();
  var justificativa = justificativasByRegistro[idRegistro] || justificativasByAtividade[idAtividade] || null;
  var status = atividadesV2_normalizePresenceStatusForPortal_(record);
  var action = atividadesV2_frequencyJustificativaAction_(record, atividade, justificativa);
  return {
    idRegistroPresenca: idRegistro,
    idAtividade: idAtividade,
    idPessoa: String(record.ID_PESSOA || '').trim(),
    rga: String(record.RGA || '').trim(),
    ciclo: atividadesV2_frequencyCycleKey_(record, atividade),
    cicloOperacional: String(record.CICLO || atividade.CICLO || '').trim(),
    ano: String(record.ANO || atividade.ANO || '').trim(),
    semestre: String(record.SEMESTRE || atividade.SEMESTRE || '').trim(),
    dataAtividade: atividades_formatPortalDateIso_(record.DATA_ATIVIDADE || atividade.DATA_ATIVIDADE),
    tituloAtividade: atividades_sanitizePortalText_(record.TITULO_ATIVIDADE || atividade.TITULO_PUBLICO || atividade.TITULO, 240),
    tipoAtividade: String(record.TIPO_ATIVIDADE || atividade.TIPO_ATIVIDADE || '').trim(),
    subtipoAtividade: String(record.SUBTIPO_ATIVIDADE || atividade.SUBTIPO_ATIVIDADE || '').trim(),
    statusPresenca: status.status,
    statusPresencaRotulo: status.rotulo,
    codigoPresenca: status.codigo,
    cargaHorariaConsiderada: record.CARGA_HORARIA_CONSIDERADA || record.CARGA_HORARIA_TOTAL_ATIVIDADE || atividade.CARGA_HORARIA || '',
    contaFalta: atividades_isTruthySim_(record.CONTA_FALTA) ? 'SIM' : 'NAO',
    contaPresenca: atividades_isTruthySim_(record.CONTA_PRESENCA) ? 'SIM' : 'NAO',
    idJustificativa: justificativa ? String(justificativa.ID_JUSTIFICATIVA || '').trim() : String(record.ID_JUSTIFICATIVA || '').trim(),
    statusJustificativa: justificativa ? String(justificativa.STATUS_ANALISE || '').trim() : String(record.STATUS_JUSTIFICATIVA || '').trim(),
    podeEnviarJustificativa: action.podeEnviarJustificativa,
    podeVerJustificativa: action.podeVerJustificativa,
    podeComplementarJustificativa: action.podeComplementarJustificativa,
    acaoJustificativa: action.acaoJustificativa,
    mensagemPortal: action.mensagemPortal
  };
}

function atividadesV2_frequencyJustificativaAction_(record, atividade, justificativa) {
  var statusJust = atividades_normalizeTextUpper_(justificativa && justificativa.STATUS_ANALISE || record.STATUS_JUSTIFICATIVA || '');
  if (justificativa) {
    return {
      podeEnviarJustificativa: statusJust === 'AJUSTE_SOLICITADO',
      podeVerJustificativa: true,
      podeComplementarJustificativa: statusJust === 'AJUSTE_SOLICITADO',
      acaoJustificativa: statusJust === 'AJUSTE_SOLICITADO' ? 'COMPLEMENTAR_JUSTIFICATIVA' : 'VER_JUSTIFICATIVA',
      mensagemPortal: statusJust === 'AJUSTE_SOLICITADO' ? 'Ajuste solicitado pela Diretoria/Secretaria.' : ''
    };
  }
  if (!atividadesV2_isPresenceJustificavel_(record) || !atividadesV2_activityAllowsJustificativa_(atividade || {})) {
    return {
      podeEnviarJustificativa: false,
      podeVerJustificativa: false,
      podeComplementarJustificativa: false,
      acaoJustificativa: '',
      mensagemPortal: ''
    };
  }
  var prazo = atividadesV2_classificarPrazoJustificativaPresenca_(record, atividade || {}, new Date());
  return {
    podeEnviarJustificativa: true,
    podeVerJustificativa: false,
    podeComplementarJustificativa: false,
    acaoJustificativa: prazo.envioForaDoPrazo === 'SIM' ? 'ENVIAR_JUSTIFICATIVA_FORA_PRAZO' : 'ENVIAR_JUSTIFICATIVA',
    mensagemPortal: prazo.mensagemPortal
  };
}

function atividadesV2_normalizePresenceStatusForPortal_(record) {
  var raw = atividades_normalizeTextUpper_(record.STATUS_PRESENCA || record.CODIGO_PRESENCA || '');
  var map = {
    P: { status: 'PRESENTE_PRESENCIAL', codigo: 'P', rotulo: 'Presente' },
    R: { status: 'PRESENTE_REMOTO', codigo: 'R', rotulo: 'Presente remoto' },
    F: { status: 'FALTA', codigo: 'F', rotulo: 'Falta' },
    J: { status: 'JUSTIFICADA', codigo: 'J', rotulo: 'Falta justificada' },
    A: { status: 'ABONADA', codigo: 'A', rotulo: 'Falta abonada' },
    'N/A': { status: 'NAO_SE_APLICA', codigo: 'N/A', rotulo: 'Nao aplicavel' },
    PRESENTE_PRESENCIAL: { status: 'PRESENTE_PRESENCIAL', codigo: 'P', rotulo: 'Presente' },
    PRESENTE_REMOTO: { status: 'PRESENTE_REMOTO', codigo: 'R', rotulo: 'Presente remoto' },
    FALTA: { status: 'FALTA', codigo: 'F', rotulo: 'Falta' },
    JUSTIFICADA: { status: 'JUSTIFICADA', codigo: 'J', rotulo: 'Falta justificada' },
    ABONADA: { status: 'ABONADA', codigo: 'A', rotulo: 'Falta abonada' },
    NAO_SE_APLICA: { status: 'NAO_SE_APLICA', codigo: 'N/A', rotulo: 'Nao aplicavel' }
  };
  return map[raw] || { status: raw || 'PENDENTE', codigo: String(record.CODIGO_PRESENCA || '').trim(), rotulo: raw ? atividadesV2_titleCaseStatus_(raw) : 'Sem marcacao' };
}

function atividadesV2_incrementFrequencyResumo_(resumo, item) {
  resumo.totalRegistros++;
  var status = atividades_normalizeTextUpper_(item.statusPresenca);
  var carga = Number(String(item.cargaHorariaConsiderada || '').replace(',', '.'));
  if (isFinite(carga)) resumo.cargaHorariaTotal += carga;
  if (status === 'PRESENTE_PRESENCIAL' || status === 'PRESENTE_REMOTO') resumo.totalPresencas++;
  else if (status === 'FALTA') resumo.totalFaltas++;
  else if (status === 'JUSTIFICADA') resumo.totalJustificadas++;
  else if (status === 'ABONADA') resumo.totalAbonadas++;
  else if (status === 'NAO_SE_APLICA') resumo.totalNaoSeAplica++;
}

function atividadesV2_finalizeFrequencyResumo_(resumo) {
  resumo.faltasLiquidas = Math.max(0, Number(resumo.totalFaltas || 0));
  var totalComputavel = Number(resumo.totalPresencas || 0) + Number(resumo.totalFaltas || 0) + Number(resumo.totalJustificadas || 0) + Number(resumo.totalAbonadas || 0);
  var presencasEquivalentes = Number(resumo.totalPresencas || 0) + Number(resumo.totalJustificadas || 0) + Number(resumo.totalAbonadas || 0);
  resumo.percentualFrequencia = totalComputavel ? Math.round((presencasEquivalentes / totalComputavel) * 10000) / 100 : '';
  resumo.situacaoDisciplinar = atividadesV2_frequencySituation_(resumo);
  resumo.elegivelCertificado = resumo.faltasLiquidas > 0 ? 'A_CONFERIR' : 'SIM';
  return resumo;
}

function atividadesV2_mergeFrequencyResumo_(items) {
  var total = atividadesV2_emptyFrequencyResumo_();
  (items || []).forEach(function(item) {
    total.totalRegistros += Number(item.totalRegistros || 0);
    total.totalPresencas += Number(item.totalPresencas || 0);
    total.totalFaltas += Number(item.totalFaltas || 0);
    total.totalJustificadas += Number(item.totalJustificadas || 0);
    total.totalAbonadas += Number(item.totalAbonadas || 0);
    total.totalNaoSeAplica += Number(item.totalNaoSeAplica || 0);
    total.cargaHorariaTotal += Number(item.cargaHorariaTotal || 0);
  });
  return total;
}

function atividadesV2_frequencySituation_(resumo) {
  var faltas = Number(resumo && resumo.faltasLiquidas || 0);
  var limite = Number(resumo && resumo.limiteFaltasPeriodo || 0);
  if (!limite) return faltas ? 'A_CONFERIR' : 'NORMAL';
  var uso = faltas / limite;
  resumo.percentualUsoLimite = Math.round(uso * 10000) / 100;
  if (uso >= 1) return 'LIMITE_ATINGIDO';
  if (uso >= 0.8) return 'ALERTA_80';
  if (uso >= 0.6) return 'ALERTA_60';
  return 'NORMAL';
}

function atividadesV2_frequencyCycleKey_(record, atividade) {
  var ano = String(record && record.ANO || atividade && atividade.ANO || '').trim();
  var semestre = String(record && record.SEMESTRE || atividade && atividade.SEMESTRE || '').trim();
  if (ano && semestre) return ano + '/' + semestre;
  var ciclo = String(record && record.CICLO || atividade && atividade.CICLO || '').trim();
  var match = ciclo.match(/(\d{4}).*?([12])$/);
  return match ? match[1] + '/' + match[2] : (ciclo || 'SEM_CICLO');
}

function atividadesV2_sortFrequencyRecords_(a, b) {
  return String(b.dataAtividade || '').localeCompare(String(a.dataAtividade || '')) ||
    String(a.tituloAtividade || '').localeCompare(String(b.tituloAtividade || ''));
}

function atividadesV2_sortFrequencyCycles_(a, b) {
  return String(b.ciclo || '').localeCompare(String(a.ciclo || ''));
}

function atividadesV2_titleCaseStatus_(value) {
  return String(value || '').toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, function(ch) { return ch.toUpperCase(); });
}

function atividadesV2_portalGetMinhasApresentacoes_(contexto) {
  var perf = portalPerfStart_('atividadesV2_portalGetMinhasApresentacoes');

  try {
    var ctx = atividades_normalizePortalContext_(contexto);
    var cacheKey = atividadesV2_portalOwnPresentationsCacheKey_(ctx);
    var cached = cacheKey ? portalCacheGetJson_(cacheKey) : null;
    if (cached) {
      portalPerfMark_(perf, 'cache_hit_minhas_apresentacoes', { total: cached.apresentacoes ? cached.apresentacoes.length : 0 });
      var cachedPerf = portalPerfEnd_(perf);
      return {
        ok: true,
        data: cached,
        origem: 'cache',
        cacheHit: true,
        tempoTotalMs: cachedPerf ? cachedPerf.totalMs : ''
      };
    }

    var ss = atividadesV2_getDatabaseSpreadsheetDev_();
    portalPerfMark_(perf, 'abrir_planilha_v2_dev');
    var apresentacoes = atividadesV2_readOwnPresentationRecordsDev_(ss, ctx, perf);

    var perfResult = portalPerfEnd_(perf);
    var data = {
      resumo: { total: apresentacoes.length },
      ultimaAtualizacao: atividadesV2_latestPresentationUpdate_(apresentacoes),
      apresentacoes: apresentacoes
    };
    if (cacheKey) {
      portalCachePutJson_(cacheKey, data, ATIVIDADES_V2_PORTAL_PRIVATE_CACHE_TTL_SECONDS);
    }
    return {
      ok: true,
      data: data,
      origem: 'atividades-v2:base-operacional',
      cacheHit: false,
      tempoTotalMs: perfResult ? perfResult.totalMs : ''
    };
  } catch (err) {
    var errorPerf = portalPerfEnd_(perf);
    return atividadesV2_portalReadonlyError_('atividadesV2_portalGetMinhasApresentacoes', err, errorPerf);
  }
}

function atividadesV2_portalOwnPresentationsCacheKey_(ctx) {
  var normalized = atividades_normalizePortalContext_(ctx || {});
  if (!normalized.idPessoa && !normalized.email && !normalized.rga) return '';
  return portalCacheBuildKey_('minhas_apresentacoes', portalCacheContextToken_(normalized));
}

function atividadesV2_readOwnPresentationRecordsDev_(ss, ctx, perf) {
  var atividadesSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES);
  var apresentacoesSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.APRESENTACOES);
  var atividades = atividadesV2_readSheetObjects_(atividadesSheet).filter(function(record) {
    return atividades_normalizeTextUpper_(record.ATIVO || 'SIM') !== 'NAO';
  });
  if (perf) portalPerfMark_(perf, 'ler_aba_atividades', { linhas: atividades.length });

  var atividadesById = atividadesV2_indexByField_(atividades, 'ID_ATIVIDADE');
  var apresentacoes = atividadesV2_readSheetObjects_(apresentacoesSheet).filter(function(record) {
    return String(record.ID_APRESENTACAO || '').trim() &&
      atividades_normalizeTextUpper_(record.ATIVO || 'SIM') !== 'NAO';
  });
  if (perf) portalPerfMark_(perf, 'ler_aba_apresentacoes', { linhas: apresentacoes.length });

  var own = [];
  apresentacoes.forEach(function(apresentacao) {
    var atividade = atividadesById[String(apresentacao.ID_ATIVIDADE || '').trim()];
    if (!atividade) return;
    if (!atividadesV2_portalBasePresentationBelongsToContext_(atividade, apresentacao, ctx)) return;
    own.push(atividadesV2_portalOnlyMemberPresentationActions_(
      atividadesV2_portalMapBaseApresentacaoPublica_(apresentacao, atividade, ctx)
    ));
  });

  own.sort(atividadesV2_sortPortalPresentations_);
  if (perf) portalPerfMark_(perf, 'montar_minhas_apresentacoes', { total: own.length });
  return own;
}

function atividadesV2_portalGetMinhasJustificativas_(contexto) {
  var perf = portalPerfStart_('atividadesV2_portalGetMinhasJustificativas');
  try {
    var ctx = atividades_normalizePortalContext_(contexto || {});
    var cacheKey = portalCacheBuildKey_('minhas_justificativas', portalCacheContextToken_(ctx));
    var cached = portalCacheGetJson_(cacheKey);
    if (cached) {
      portalPerfMark_(perf, 'cache_hit_minhas_justificativas');
      return portalPerfAttachDiagnostics_(cached, portalPerfEnd_(perf));
    }

    var data = atividadesV2_getMinhasJustificativasPortalData_(ctx);
    var perfResult = portalPerfEnd_(perf);
    var response = portalPerfAttachDiagnostics_({
      ok: true,
      data: data,
      origem: 'atividades-v2:justificativas-base',
      tempoTotalMs: perfResult ? perfResult.totalMs : ''
    }, perfResult);
    portalCachePutJson_(cacheKey, response, ATIVIDADES_V2_PORTAL_PRIVATE_CACHE_TTL_SECONDS);
    return response;
  } catch (err) {
    var errorPerf = portalPerfEnd_(perf);
    return atividadesV2_portalReadonlyError_('atividadesV2_portalGetMinhasJustificativas', err, errorPerf);
  }
}

function atividadesV2_runTesteMinhaFrequenciaDetalhadaDev_(contexto) {
  var ctx = atividades_normalizePortalContext_(contexto || {});
  var avisos = [];
  var contextoInformado = contexto && Object.keys(contexto).length > 0;
  if (!contextoInformado && !ctx.idPessoa && !ctx.rga && !ctx.email) {
    var sample = atividadesV2_findSamplePresenceContextForFrequencyTest_();
    ctx = atividades_normalizePortalContext_(sample);
    avisos.push('Contexto nao informado; usado primeiro registro de presenca com identificador disponivel na V2 DEV.');
  }

  var token = portalCacheContextToken_(ctx);
  portalCacheRemove_(portalCacheBuildKey_('frequencia', token));
  portalCacheRemove_(portalCacheBuildKey_('frequencia_detalhada_v2', token));

  var response = atividadesV2_portalGetMinhaFrequencia_(ctx);
  var data = response && response.data || {};
  var ciclos = Array.isArray(data.ciclos) ? data.ciclos : [];
  var cicloAtual = ciclos[0] || {};
  var registros = Array.isArray(cicloAtual.registros) ? cicloAtual.registros : [];
  var primeiro = registros[0] || {};
  var payloadAntigo = !Array.isArray(data.ciclos) && Array.isArray(data.registros);

  return {
    ok: !!(response && response.ok && Array.isArray(data.ciclos) && (!ciclos.length || Array.isArray(cicloAtual.registros))),
    contrato: response && response.contrato || data.contrato || '',
    origem: response && response.origem || '',
    errorCode: response && response.errorCode || '',
    message: response && response.message || '',
    payloadAntigoDetectado: payloadAntigo,
    totalCiclos: ciclos.length,
    cicloAtual: data.cicloAtual || '',
    totalRegistrosCicloAtual: registros.length,
    primeiroRegistro: primeiro ? {
      idRegistroPresenca: primeiro.idRegistroPresenca || '',
      idAtividade: primeiro.idAtividade || '',
      dataAtividade: primeiro.dataAtividade || '',
      tituloAtividade: primeiro.tituloAtividade || '',
      statusPresenca: primeiro.statusPresenca || '',
      statusPresencaRotulo: primeiro.statusPresencaRotulo || ''
    } : {},
    avisos: avisos
  };
}

function atividadesV2_findSamplePresenceContextForFrequencyTest_() {
  var ss = atividadesV2_getDatabaseSpreadsheetDev_();
  var sheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.PRESENCAS_REGISTROS);
  var records = atividadesV2_readSheetObjects_(sheet);
  for (var i = 0; i < records.length; i++) {
    var record = records[i];
    if (atividades_normalizeTextUpper_(record.ATIVO || 'SIM') === 'NAO') continue;
    if (String(record.ID_PESSOA || record.RGA || record.EMAIL_PARTICIPANTE || '').trim()) {
      return {
        perfil: 'MEMBRO',
        idPessoa: String(record.ID_PESSOA || '').trim(),
        rga: String(record.RGA || '').trim(),
        email: String(record.EMAIL_PARTICIPANTE || '').trim(),
        somenteVisiveis: true
      };
    }
  }
  return { perfil: 'MEMBRO', somenteVisiveis: true };
}

function atividadesV2_portalGetPendenciasDiretoria_(contexto) {
  return atividadesV2_portalReadPrivilegedView_({
    label: 'atividadesV2_portalGetPendenciasDiretoria',
    sheetName: ATIVIDADES_V2_SHEETS.PORTAL_PENDENCIAS_DIRETORIA,
    listField: 'pendencias',
    mapper: atividadesV2_portalMapPendenciaDiretoria_
  }, contexto);
}

function atividadesV2_portalGetStatusViews_(contexto) {
  return atividadesV2_portalReadPrivilegedView_({
    label: 'atividadesV2_portalGetStatusViews',
    sheetName: ATIVIDADES_V2_SHEETS.PORTAL_STATUS_ATIVIDADES,
    listField: 'views',
    mapper: atividadesV2_portalMapStatusView_
  }, contexto);
}

function atividadesV2_portalReadOwnView_(config, contexto) {
  var perf = portalPerfStart_(config.label);

  try {
    var ctx = atividades_normalizePortalContext_(contexto);
    var records = atividadesV2_portalReadViewRecords_(config.sheetName, perf)
      .filter(function(record) {
        return atividadesV2_portalRecordBelongsToContext_(record, ctx);
      });
    var mapped = records.map(config.mapper);
    var data = atividadesV2_portalBuildReadonlyPayload_(config, records, mapped);
    var perfResult = portalPerfEnd_(perf);

    return {
      ok: true,
      data: data,
      origem: 'atividades-v2:' + config.sheetName,
      tempoTotalMs: perfResult ? perfResult.totalMs : ''
    };
  } catch (err) {
    var errorPerf = portalPerfEnd_(perf);
    return atividadesV2_portalReadonlyError_(config.label, err, errorPerf);
  }
}

function atividadesV2_portalReadPrivilegedView_(config, contexto) {
  var perf = portalPerfStart_(config.label);

  try {
    var ctx = atividades_normalizePortalContext_(contexto);

    if (!atividades_isPrivilegedPortalProfile_(ctx)) {
      return {
        ok: false,
        errorCode: 'PERMISSAO_INSUFICIENTE',
        message: 'Perfil sem permissao para consultar esta view do portal.'
      };
    }

    var records = atividadesV2_portalReadViewRecords_(config.sheetName, perf);
    var mapped = records.map(config.mapper);
    var data = atividadesV2_portalBuildReadonlyPayload_(config, records, mapped);
    var perfResult = portalPerfEnd_(perf);

    return {
      ok: true,
      data: data,
      origem: 'atividades-v2:' + config.sheetName,
      tempoTotalMs: perfResult ? perfResult.totalMs : ''
    };
  } catch (err) {
    var errorPerf = portalPerfEnd_(perf);
    return atividadesV2_portalReadonlyError_(config.label, err, errorPerf);
  }
}

function atividadesV2_portalReadViewRecords_(sheetName, perf) {
  var ss = atividadesV2_getDatabaseSpreadsheetDev_();
  var sheet = atividadesV2_getTargetSheet_(ss, sheetName);
  var records = atividadesV2_readSheetObjects_(sheet)
    .filter(function(record) {
      return atividadesV2_portalRecordHasContent_(record);
    });

  if (perf) portalPerfMark_(perf, 'ler_' + sheetName, { linhas: records.length });
  return records;
}

function atividadesV2_portalRecordHasContent_(record) {
  var values = record && record._values;

  if (!Array.isArray(values)) return false;
  return values.some(function(value) {
    return String(value || '').trim();
  });
}

function atividadesV2_portalRecordBelongsToContext_(record, ctx) {
  var idPessoa = String(record.ID_PESSOA || '').trim();
  var rga = String(record.RGA || '').trim().toLowerCase();
  var email = String(record.EMAIL || record.EMAIL_MEMBRO || '').trim().toLowerCase();
  var ctxIdPessoa = String(ctx.idPessoa || '').trim();
  var ctxRga = String(ctx.rga || '').trim().toLowerCase();
  var ctxEmail = String(ctx.email || '').trim().toLowerCase();

  if (idPessoa && ctxIdPessoa && idPessoa === ctxIdPessoa) return true;
  if (rga && ctxRga && rga === ctxRga) return true;
  if (email && ctxEmail && email === ctxEmail) return true;
  return false;
}

function atividadesV2_portalBuildReadonlyPayload_(config, records, mapped) {
  return {
    resumo: atividadesV2_portalBuildResumo_(mapped, config.summaryFields),
    ultimaAtualizacao: atividadesV2_portalLatestUpdate_(records),
    [config.listField]: mapped
  };
}

function atividadesV2_portalBuildResumo_(records, summaryFields) {
  var resumo = {
    total: records.length
  };

  (summaryFields || []).forEach(function(field) {
    var camel = atividadesV2_portalCamelCase_(field);
    var total = 0;
    var found = false;

    records.forEach(function(record) {
      var value = Number(String(record[camel] || '').replace(',', '.'));
      if (isFinite(value)) {
        total += value;
        found = true;
      }
    });

    if (found) resumo[camel] = total;
  });

  return resumo;
}

function atividadesV2_portalLatestUpdate_(records) {
  var latest = '';

  (records || []).forEach(function(record) {
    var value = String(record.ULTIMA_ATUALIZACAO || record.DATA_HORA_ATUALIZACAO || '').trim();
    if (value && (!latest || value > latest)) latest = value;
  });

  return latest;
}

function atividadesV2_portalReadonlyError_(label, err, perf) {
  return {
    ok: false,
    errorCode: 'ERRO_VIEW_PORTAL_V2',
    message: 'Nao foi possivel consultar a view V2 para o portal.',
    details: err && err.message ? err.message : String(err),
    origem: label,
    tempoTotalMs: perf ? perf.totalMs : ''
  };
}

function atividadesV2_portalMapFrequenciaMembro_(record) {
  return {
    idPessoa: String(record.ID_PESSOA || '').trim(),
    rga: String(record.RGA || '').trim(),
    email: String(record.EMAIL || '').trim(),
    ciclo: String(record.CICLO || '').trim(),
    totalPresencas: record.TOTAL_PRESENCAS || '',
    totalFaltas: record.TOTAL_FALTAS || '',
    totalJustificadas: record.TOTAL_JUSTIFICADAS || '',
    totalAbonadas: record.TOTAL_ABONADAS || '',
    faltasLiquidas: record.FALTAS_LIQUIDAS || '',
    limiteFaltasPeriodo: record.LIMITE_FALTAS_PERIODO || '',
    percentualFrequencia: record.PERCENTUAL_FREQUENCIA || '',
    percentualUsoLimite: record.PERCENTUAL_USO_LIMITE || '',
    situacaoDisciplinar: String(record.SITUACAO_DISCIPLINAR || '').trim(),
    cargaHorariaTotal: record.CARGA_HORARIA_TOTAL || '',
    elegivelCertificado: String(record.ELEGIVEL_CERTIFICADO || '').trim(),
    motivoInelegibilidade: atividades_sanitizePortalText_(record.MOTIVO_INELEGIBILIDADE, 240),
    mensagemPortal: atividades_sanitizePortalText_(record.MENSAGEM_PORTAL, 240),
    ultimaAtualizacao: String(record.ULTIMA_ATUALIZACAO || '').trim()
  };
}

function atividadesV2_portalMapApresentacaoPublica_(apresentacao, atividade, contexto) {
  var idArquivoMaterial = String(apresentacao.idArquivoMaterial || '').trim();
  var idPastaDrive = String(atividade.ID_PASTA_DRIVE || '').trim();
  var mapped = {
    idPessoa: String(apresentacao.idPessoa || '').trim(),
    rga: String(apresentacao.rga || '').trim(),
    idApresentacao: String(apresentacao.idApresentacao || '').trim(),
    idAtividade: String(apresentacao.idAtividade || atividade.ID_ATIVIDADE || '').trim(),
    dataAtividade: atividades_formatPortalDateIso_(atividade.DATA_ATIVIDADE),
    tituloPublico: atividades_sanitizePortalText_(apresentacao.titulo || atividade.TITULO_CONTEUDO_PUBLICO || atividade.TITULO_PUBLICO, 240),
    tema: atividades_sanitizePortalText_(apresentacao.titulo || atividade.TITULO_CONTEUDO_PUBLICO || atividade.TITULO_PUBLICO, 240),
    nomeApresentador: atividades_sanitizePortalText_(apresentacao.nomeApresentador, 180),
    eixoTematicoPrincipal: String(apresentacao.eixoTematicoPrincipal || '').trim(),
    eixoTematicoSecundario: String(apresentacao.eixoTematicoSecundario || '').trim(),
    statusPublico: String(apresentacao.statusApresentacao || atividade.STATUS_PUBLICO || '').trim(),
    statusApresentacao: String(apresentacao.statusApresentacao || '').trim(),
    statusTituloEixo: String(apresentacao.statusTituloEixo || '').trim(),
    statusMaterial: String(apresentacao.statusMaterial || '').trim(),
    bloqueadoParaEdicao: atividadesV2_isTruthyFlag_(apresentacao.bloqueadoParaEdicao),
    idPastaDrive: idPastaDrive,
    linkPastaDrive: atividades_sanitizePortalUrl_(atividade.LINK_PASTA_DRIVE) || atividadesV2_buildDriveFolderUrl_(idPastaDrive),
    idArquivoMaterial: idArquivoMaterial,
    nomeArquivoMaterial: atividades_sanitizePortalText_(apresentacao.nomeArquivoMaterial, 240),
    linkMaterialPublico: atividades_sanitizePortalUrl_(apresentacao.linkMaterialPublico) || atividadesV2_buildDriveFileUrl_(idArquivoMaterial),
    versaoMaterial: String(apresentacao.versaoMaterial || '').trim(),
    mensagemTituloEixo: atividades_normalizeTextUpper_(apresentacao.statusTituloEixo) === 'REPROVADO'
      ? 'Proposta de titulo/eixos reprovada. Informe uma nova proposta diferente da anterior.'
      : '',
    ultimaAtualizacao: String(atividade.ULTIMA_ATUALIZACAO || '').trim()
  };
  return Object.assign(mapped, atividadesV2_portalPresentationActionFlags_(mapped, contexto));
}

function atividadesV2_portalMapBaseApresentacaoPublica_(apresentacao, atividade, contexto) {
  return atividadesV2_portalMapApresentacaoPublica_({
    idPessoa: apresentacao.ID_PESSOA || atividade.ID_PESSOA_PRINCIPAL,
    rga: apresentacao.RGA || atividade.RGA_PESSOA_PRINCIPAL,
    email: apresentacao.EMAIL_MEMBRO || atividade.EMAIL_PESSOA_PRINCIPAL,
    idApresentacao: apresentacao.ID_APRESENTACAO,
    idAtividade: apresentacao.ID_ATIVIDADE || atividade.ID_ATIVIDADE,
    titulo: atividade.TITULO_PUBLICO || atividade.TITULO,
    nomeApresentador: atividade.NOME_PESSOA_PRINCIPAL_PUBLICO || apresentacao.NOME_MEMBRO,
    eixoTematicoPrincipal: atividade.EIXO_TEMATICO_PRINCIPAL || apresentacao.EIXO_TEMATICO_PRINCIPAL,
    eixoTematicoSecundario: atividade.EIXO_TEMATICO_SECUNDARIO || apresentacao.EIXO_TEMATICO_SECUNDARIO,
    statusApresentacao: apresentacao.STATUS_APRESENTACAO,
    statusTituloEixo: apresentacao.STATUS_TITULO_EIXO || atividade.STATUS_EIXO_TEMATICO,
    statusMaterial: apresentacao.STATUS_ENVIO_MATERIAL,
    bloqueadoParaEdicao: apresentacao.BLOQUEADO_PARA_EDICAO || atividade.BLOQUEADO_PARA_EDICAO,
    idArquivoMaterial: apresentacao.ID_ARQUIVO_MATERIAL,
    nomeArquivoMaterial: apresentacao.NOME_ARQUIVO_MATERIAL,
    linkMaterialPublico: apresentacao.LINK_MATERIAL_APRESENTACAO,
    versaoMaterial: apresentacao.VERSAO_MATERIAL
  }, atividade, contexto);
}

function atividadesV2_portalPresentationActionFlags_(apresentacao, contexto) {
  var privileged = atividades_isPrivilegedPortalProfile_(contexto);
  var statusTitulo = atividades_normalizeTextUpper_(apresentacao.statusTituloEixo);
  var statusMaterial = atividades_normalizeTextUpper_(apresentacao.statusMaterial);
  var statusApresentacao = atividades_normalizeTextUpper_(apresentacao.statusApresentacao);
  var hasMaterial = !!String(apresentacao.idArquivoMaterial || apresentacao.linkMaterialPublico || '').trim();
  var hasFolder = !!String(apresentacao.linkPastaDrive || apresentacao.idPastaDrive || '').trim();
  var bloqueado = atividadesV2_isTruthyFlag_(apresentacao.bloqueadoParaEdicao);
  var isRealizada = statusApresentacao === 'REALIZADA';
  var isClosed = isRealizada;
  var tituloEditavel = !bloqueado && ['PENDENTE', 'ENVIADO', 'AJUSTE_SOLICITADO', 'REPROVADO'].indexOf(statusTitulo || 'PENDENTE') >= 0 && !isClosed;
  if (!bloqueado && statusTitulo === 'AJUSTE_SOLICITADO') tituloEditavel = true;
  var acoesMembro = {
    podeEditarTituloEixo: tituloEditavel,
    podeEnviarMaterial: !bloqueado && !isClosed && !hasMaterial && ['PENDENTE', 'AJUSTE_SOLICITADO'].indexOf(statusMaterial || 'PENDENTE') >= 0,
    podeReenviarMaterial: !bloqueado && !isClosed && hasMaterial && statusMaterial === 'AJUSTE_SOLICITADO',
    podeAbrirMaterial: !!String(apresentacao.linkMaterialPublico || apresentacao.idArquivoMaterial || '').trim(),
    podeAbrirPastaAtividade: hasFolder
  };
  var canReviewTitle = privileged && ['ENVIADO', 'RECEBIDO', 'EM_ANALISE'].indexOf(statusTitulo) >= 0;
  var canReviewMaterial = privileged && ['RECEBIDO', 'REENVIADO', 'EM_ANALISE'].indexOf(statusMaterial) >= 0;
  var acoesGestao = {
    podeAprovarTituloEixo: canReviewTitle,
    podeEditarEAprovarTituloEixo: canReviewTitle,
    podeSolicitarAjusteTituloEixo: canReviewTitle,
    podeReprovarTituloEixo: privileged && ['ENVIADO', 'RECEBIDO', 'EM_ANALISE'].indexOf(statusTitulo) >= 0,
    podeAprovarMaterial: canReviewMaterial,
    podeSolicitarAjusteMaterial: canReviewMaterial,
    podeDispensarMaterial: privileged && ['PENDENTE', 'AJUSTE_SOLICITADO'].indexOf(statusMaterial || 'PENDENTE') >= 0
  };
  return {
    acoesMembro: acoesMembro,
    acoesGestao: acoesGestao,
    podeEditarTituloEixo: acoesMembro.podeEditarTituloEixo,
    podeEnviarMaterial: acoesMembro.podeEnviarMaterial,
    podeReenviarMaterial: acoesMembro.podeReenviarMaterial,
    podeAprovarTituloEixo: acoesGestao.podeAprovarTituloEixo,
    podeRevisarMaterial: acoesGestao.podeAprovarMaterial || acoesGestao.podeSolicitarAjusteMaterial || acoesGestao.podeDispensarMaterial
  };
}

function atividadesV2_isTruthyFlag_(value) {
  if (value === true) return true;
  var normalized = atividades_normalizeTextUpper_(value);
  return ['SIM', 'TRUE', '1', 'S', 'YES'].indexOf(normalized) >= 0;
}

function atividadesV2_portalOnlyMemberPresentationActions_(item) {
  var emptyGestao = {
    podeAprovarTituloEixo: false,
    podeSolicitarAjusteTituloEixo: false,
    podeAprovarMaterial: false,
    podeSolicitarAjusteMaterial: false,
    podeDispensarMaterial: false
  };
  item.acoesGestao = emptyGestao;
  item.podeAprovarTituloEixo = false;
  item.podeRevisarMaterial = false;
  return item;
}

function atividadesV2_portalBasePresentationBelongsToContext_(atividade, apresentacao, ctx) {
  var ctxIdPessoa = String(ctx && ctx.idPessoa || '').trim();
  var ctxRga = String(ctx && ctx.rga || '').trim().toLowerCase();
  var ctxEmail = String(ctx && ctx.email || '').trim().toLowerCase();

  var idsPessoa = [
    atividade && atividade.ID_PESSOA_PRINCIPAL,
    apresentacao && apresentacao.ID_PESSOA
  ].map(function(value) { return String(value || '').trim(); });
  if (ctxIdPessoa && idsPessoa.indexOf(ctxIdPessoa) >= 0) return true;

  var rgas = [
    atividade && atividade.RGA_PESSOA_PRINCIPAL,
    apresentacao && apresentacao.RGA
  ].map(function(value) { return String(value || '').trim().toLowerCase(); });
  if (ctxRga && rgas.indexOf(ctxRga) >= 0) return true;

  var emails = [
    atividade && atividade.EMAIL_PESSOA_PRINCIPAL,
    apresentacao && apresentacao.EMAIL_MEMBRO
  ].map(function(value) { return String(value || '').trim().toLowerCase(); });
  return !!ctxEmail && emails.indexOf(ctxEmail) >= 0;
}

function atividadesV2_portalApresentacaoBelongsToContext_(apresentacao, ctx) {
  var idPessoa = String(apresentacao && apresentacao.idPessoa || '').trim();
  var rga = String(apresentacao && apresentacao.rga || '').trim().toLowerCase();
  var email = String(apresentacao && apresentacao.email || '').trim().toLowerCase();
  var ctxIdPessoa = String(ctx && ctx.idPessoa || '').trim();
  var ctxRga = String(ctx && ctx.rga || '').trim().toLowerCase();
  var ctxEmail = String(ctx && ctx.email || '').trim().toLowerCase();

  if (idPessoa && ctxIdPessoa && idPessoa === ctxIdPessoa) return true;
  if (rga && ctxRga && rga === ctxRga) return true;
  if (email && ctxEmail && email === ctxEmail) return true;
  return false;
}

function atividadesV2_sortPortalPresentations_(a, b) {
  var dateA = atividades_parseDateOrNull_(a.dataAtividade);
  var dateB = atividades_parseDateOrNull_(b.dataAtividade);
  var timeA = dateA ? dateA.getTime() : Number.MAX_SAFE_INTEGER;
  var timeB = dateB ? dateB.getTime() : Number.MAX_SAFE_INTEGER;
  if (timeA !== timeB) return timeA - timeB;
  return String(a.idApresentacao || '').localeCompare(String(b.idApresentacao || ''));
}

function atividadesV2_latestPresentationUpdate_(items) {
  var latest = '';
  (items || []).forEach(function(item) {
    var value = String(item.ultimaAtualizacao || '').trim();
    if (value && (!latest || value > latest)) latest = value;
  });
  return latest;
}

function atividadesV2_buildDriveFileUrl_(fileId) {
  var id = String(fileId || '').trim();
  return id ? 'https://drive.google.com/file/d/' + encodeURIComponent(id) + '/view' : '';
}

function atividadesV2_parsePublicJsonArray_(value) {
  var text = String(value || '').trim();
  if (!text) return [];
  try {
    var parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function atividadesV2_portalMapJustificativa_(record) {
  var prazo = typeof atividadesV2_classificarPrazoJustificativaRecord_ === 'function'
    ? atividadesV2_classificarPrazoJustificativaRecord_(record, new Date())
    : { statusPrazo: String(record.STATUS_PRAZO || '').trim(), envioForaDoPrazo: String(record.ENVIO_FORA_DO_PRAZO || '').trim() };
  return {
    idPessoa: String(record.ID_PESSOA || '').trim(),
    rga: String(record.RGA || '').trim(),
    idJustificativa: String(record.ID_JUSTIFICATIVA || '').trim(),
    idRegistroPresenca: String(record.ID_REGISTRO_PRESENCA || '').trim(),
    idAtividade: String(record.ID_ATIVIDADE || '').trim(),
    dataAtividade: atividades_formatPortalDateIso_(record.DATA_ATIVIDADE),
    tituloPublico: atividades_sanitizePortalText_(record.TITULO_ATIVIDADE, 240),
    motivoCategoria: String(record.MOTIVO_DECLARADO || '').trim(),
    statusJustificativa: String(record.STATUS_ANALISE || '').trim(),
    statusPublico: String(record.STATUS_ANALISE || '').trim(),
    decisaoAplicada: String(record.DECISAO_APLICADA || '').trim(),
    enviadaEm: atividades_formatPortalDateIso_(record.DATA_ENVIO),
    dataLimiteJustificativa: atividades_formatPortalDateIso_(record.DATA_LIMITE_JUSTIFICATIVA),
    statusPrazo: String(record.STATUS_PRAZO || prazo.statusPrazo || '').trim(),
    envioForaDoPrazo: String(record.ENVIO_FORA_DO_PRAZO || prazo.envioForaDoPrazo || '').trim(),
    podeReenviarAjuste: atividadesV2_isTruthyFlag_(record.PODE_REENVIAR_AJUSTE) ||
      atividades_normalizeTextUpper_(record.STATUS_ANALISE) === 'AJUSTE_SOLICITADO',
    observacaoPublica: atividades_sanitizePortalText_(record.OBSERVACAO_PUBLICA, 500),
    mensagemPortal: atividades_sanitizePortalText_(record.MENSAGEM_PORTAL || prazo.mensagemPortal, 500),
    ultimaAtualizacao: String(record.ULTIMA_ATUALIZACAO || '').trim()
  };
}

function atividadesV2_portalMapPendenciaDiretoria_(record) {
  return {
    idPendencia: String(record.ID_PENDENCIA || '').trim(),
    tipo: String(record.TIPO_PENDENCIA || '').trim(),
    idAtividade: String(record.ID_ATIVIDADE || '').trim(),
    idApresentacao: String(record.ID_APRESENTACAO || '').trim(),
    idJustificativa: String(record.ID_JUSTIFICATIVA || '').trim(),
    idRegistroPresenca: String(record.ID_REGISTRO_PRESENCA || '').trim(),
    tipoPendencia: String(record.TIPO_PENDENCIA || '').trim(),
    gravidade: String(record.GRAVIDADE || '').trim(),
    dataAtividade: atividades_formatPortalDateIso_(record.DATA_ATIVIDADE),
    rotuloSemestre: String(record.ROTULO_SEMESTRE || '').trim(),
    titulo: atividades_sanitizePortalText_(record.TITULO_APRESENTACAO || record.TITULO_ATIVIDADE || 'Titulo ainda nao informado', 240),
    tituloAtividade: atividades_sanitizePortalText_(record.TITULO_ATIVIDADE || 'Titulo ainda nao informado', 240),
    tituloApresentacao: atividades_sanitizePortalText_(record.TITULO_APRESENTACAO || record.TITULO_ATIVIDADE || 'Titulo ainda nao informado', 240),
    nomeMembro: atividades_sanitizePortalText_(record.NOME_MEMBRO, 180),
    nomeApresentador: atividades_sanitizePortalText_(record.NOME_APRESENTADOR || record.RESPONSAVEL_SUGERIDO || 'Apresentador ainda nao definido', 180),
    eixoTematicoPrincipal: String(record.EIXO_TEMATICO_PRINCIPAL || '').trim(),
    eixoTematicoSecundario: String(record.EIXO_TEMATICO_SECUNDARIO || '').trim(),
    statusApresentacao: String(record.STATUS_APRESENTACAO || '').trim(),
    statusTituloEixo: String(record.STATUS_TITULO_EIXO || '').trim(),
    statusMaterial: String(record.STATUS_ENVIO_MATERIAL || '').trim(),
    statusAnaliseJustificativa: String(record.STATUS_ANALISE_JUSTIFICATIVA || '').trim(),
    statusPrazoJustificativa: String(record.STATUS_PRAZO_JUSTIFICATIVA || '').trim(),
    nomeArquivoMaterial: atividades_sanitizePortalText_(record.NOME_ARQUIVO_MATERIAL, 240),
    linkMaterialPublico: atividades_sanitizePortalUrl_(record.LINK_MATERIAL_APRESENTACAO),
    descricaoPendencia: atividades_sanitizePortalText_(record.DESCRICAO_PENDENCIA, 500),
    descricaoPublica: atividades_sanitizePortalText_(record.DESCRICAO_PENDENCIA, 500),
    acaoRecomendada: atividades_sanitizePortalText_(record.ACAO_RECOMENDADA, 300),
    status: String(record.STATUS_PENDENCIA || '').trim(),
    severidade: String(record.GRAVIDADE || '').trim(),
    responsavelGrupo: String(record.RESPONSAVEL_SUGERIDO || '').trim(),
    responsavelSugerido: atividades_sanitizePortalText_(record.RESPONSAVEL_SUGERIDO, 180),
    responsavel: atividades_sanitizePortalText_(record.RESPONSAVEL_SUGERIDO, 180),
    prazo: atividades_formatPortalDateIso_(record.PRAZO),
    diasEmAberto: record.DIAS_EM_ABERTO || '',
    atualizadaEm: String(record.ULTIMA_ATUALIZACAO || '').trim(),
    acoesGestao: atividadesV2_buildPendenciaGestaoActions_(record)
  };
}

function atividadesV2_buildPendenciaGestaoActions_(record) {
  var tipo = atividades_normalizeTextUpper_(record.TIPO_PENDENCIA);
  var statusTitulo = atividades_normalizeTextUpper_(record.STATUS_TITULO_EIXO);
  var statusMaterial = atividades_normalizeTextUpper_(record.STATUS_ENVIO_MATERIAL);
  var canReviewTitle = ['TITULO_EIXO_AGUARDANDO_ANALISE'].indexOf(tipo) >= 0 &&
    ['ENVIADO', 'RECEBIDO', 'EM_ANALISE'].indexOf(statusTitulo) >= 0;
  var canReviewMaterial = ['MATERIAL_AGUARDANDO_ANALISE'].indexOf(tipo) >= 0 &&
    ['RECEBIDO', 'REENVIADO', 'EM_ANALISE'].indexOf(statusMaterial) >= 0;
  return {
    podeAprovarTituloEixo: canReviewTitle,
    podeEditarEAprovarTituloEixo: canReviewTitle,
    podeSolicitarAjusteTituloEixo: canReviewTitle,
    podeReprovarTituloEixo: canReviewTitle,
    podeAprovarMaterial: canReviewMaterial,
    podeSolicitarAjusteMaterial: canReviewMaterial,
    podeDispensarMaterial: ['MATERIAL_PENDENTE', 'MATERIAL_AJUSTE_SOLICITADO'].indexOf(tipo) >= 0 &&
      ['PENDENTE', 'AJUSTE_SOLICITADO'].indexOf(statusMaterial || 'PENDENTE') >= 0
  };
}

function atividadesV2_portalMapStatusView_(record) {
  return {
    view: String(record.ID_STATUS || '').trim(),
    nome: String(record.ID_STATUS || '').trim(),
    status: String(record.STATUS_GERAL || '').trim(),
    ok: String(record.STATUS_GERAL || '').trim().toUpperCase() === 'OK',
    linhas: record.TOTAL_ATIVIDADES || '',
    atualizadaEm: String(record.DATA_HORA_ATUALIZACAO || '').trim(),
    origem: 'ATIVIDADES_V2',
    mensagem: atividades_sanitizePortalText_(record.OBSERVACOES || record.ULTIMO_ERRO, 500)
  };
}

function atividadesV2_portalCamelCase_(value) {
  return String(value || '').toLowerCase().replace(/_([a-z0-9])/g, function(_, letter) {
    return letter.toUpperCase();
  });
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

function atividades_buildPortalListItem_(record, contexto, statusChamada, portalConfig, justificativaContext) {
  var permissions = atividades_buildPortalPermissions_(record, contexto);
  var status = statusChamada || {};
  var chamadaMeta = atividadesV2_getChamadaWindowMeta_(record, status, contexto, null, portalConfig);
  var justificativaPreviaMeta = typeof atividadesV2_buildPreviousJustificationActionMeta_ === 'function'
    ? atividadesV2_buildPreviousJustificationActionMeta_(record, contexto, justificativaContext)
    : { podeJustificarAusenciaFutura: false };
  return {
    idAtividade: String(record.ID_ATIVIDADE || '').trim(),
    ciclo: String(record.CICLO || '').trim(),
    ano: String(record.ANO || '').trim(),
    semestre: String(record.SEMESTRE || '').trim(),
    rotuloSemestre: String(record.ROTULO_SEMESTRE || '').trim(),
    dataAtividade: atividades_formatPortalDateIso_(record.DATA_ATIVIDADE),
    diaSemana: atividades_sanitizePortalText_(record.DIA_SEMANA, 40) ||
      atividades_formatPortalWeekdayPtBr_(record.DATA_ATIVIDADE),
    horarioInicio: atividades_formatPortalTime_(record.HORARIO_INICIO),
    horarioFim: atividades_formatPortalTime_(record.HORARIO_FIM),
    tituloPublico: atividades_getPortalTituloPublico_(record),
    tituloConteudoPublico: atividades_sanitizePortalText_(record.TITULO_CONTEUDO_PUBLICO, 240),
    tipoPublico: atividades_getPortalTipoPublico_(record),
    tipoAtividade: String(record.TIPO_ATIVIDADE || '').trim(),
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
    eixoTematicoPrincipal: String(record.EIXO_TEMATICO_PRINCIPAL || '').trim(),
    eixoTematicoSecundario: String(record.EIXO_TEMATICO_SECUNDARIO || '').trim(),
    idPessoaPrincipal: String(record.ID_PESSOA_PRINCIPAL || '').trim(),
    nomePessoaPrincipalPublico: atividades_sanitizePortalText_(record.NOME_PESSOA_PRINCIPAL_PUBLICO, 180),
    papelPessoaPrincipal: String(record.PAPEL_PESSOA_PRINCIPAL || '').trim(),
    tipoPessoaPrincipal: String(record.TIPO_PESSOA_PRINCIPAL || '').trim(),
    qtdApresentacoes: Number(record.QTD_APRESENTACOES || 0),
    resumoApresentacoesPublico: atividades_sanitizePortalText_(record.RESUMO_APRESENTACOES_PUBLICO, 500),
    possuiApresentacoes: atividades_isTruthySim_(record.POSSUI_APRESENTACOES),
    dataHoraInicio: chamadaMeta.dataHoraInicio,
    dataHoraFim: chamadaMeta.dataHoraFim,
    chamadaDisponivelEm: chamadaMeta.chamadaDisponivelEm,
    chamadaEncerraEm: chamadaMeta.chamadaEncerraEm,
    podeRegistrarChamadaAgora: chamadaMeta.podeRegistrarChamadaAgora,
    podeVisualizarChamada: chamadaMeta.podeVisualizarChamada,
    motivoChamadaIndisponivel: chamadaMeta.motivoChamadaIndisponivel,
    chamadaFinalizada: chamadaMeta.chamadaFinalizada,
    statusChamada: chamadaMeta.statusChamada,
    statusChamadaRotulo: chamadaMeta.statusChamadaRotulo,
    statusChamadaAtualizadoEm: status.atualizadoEm || '',
    podeJustificarAusenciaFutura: justificativaPreviaMeta.podeJustificarAusenciaFutura === true,
    justificativaPreviaEnviada: justificativaPreviaMeta.justificativaPreviaEnviada === true,
    idJustificativaPrevia: justificativaPreviaMeta.idJustificativaPrevia || '',
    statusJustificativaPrevia: justificativaPreviaMeta.statusJustificativaPrevia || '',
    motivoJustificativaPreviaIndisponivel: justificativaPreviaMeta.motivoJustificativaPreviaIndisponivel || '',
    mensagemJustificativaPrevia: justificativaPreviaMeta.mensagemJustificativaPrevia || '',
    visibilidadePortal: atividades_getPortalVisibilidade_(record),
    podeVerDetalhes: permissions.podeVerDetalhes,
    podeJustificarFalta: permissions.podeJustificarFalta,
    podeRegistrarChamada: chamadaMeta.podeRegistrarChamadaAgora,
    podeEditar: permissions.podeEditar
  };
}

function atividades_buildPortalDetail_(record, contexto) {
  var apresentacoesPublicas = atividadesV2_parsePublicJsonArray_(record.APRESENTACOES_PUBLICAS_JSON);
  var envolvidosPublicos = atividadesV2_parsePublicJsonArray_(record.ENVOLVIDOS_PUBLICOS_JSON);
  return {
    idAtividade: String(record.ID_ATIVIDADE || '').trim(),
    ciclo: String(record.CICLO || '').trim(),
    ano: String(record.ANO || '').trim(),
    semestre: String(record.SEMESTRE || '').trim(),
    rotuloSemestre: String(record.ROTULO_SEMESTRE || '').trim(),
    tituloPublico: atividades_getPortalTituloPublico_(record),
    tituloConteudoPublico: atividades_sanitizePortalText_(record.TITULO_CONTEUDO_PUBLICO, 240),
    descricaoPublica: atividades_sanitizePortalText_(record.DESCRICAO_PUBLICA || record.DESCRICAO, 1000),
    dataAtividade: atividades_formatPortalDateIso_(record.DATA_ATIVIDADE),
    horarioCompleto: atividades_formatPortalFullTime_(record.HORARIO_INICIO, record.HORARIO_FIM),
    local: atividades_sanitizePortalText_(record.LOCAL, 180),
    formato: String(record.FORMATO || '').trim(),
    tipoAtividade: String(record.TIPO_ATIVIDADE || '').trim(),
    tipoPublico: atividades_getPortalTipoPublico_(record),
    subtipoAtividade: String(record.SUBTIPO_ATIVIDADE || '').trim(),
    classificacaoReuniao: String(record.CLASSIFICACAO_REUNIAO || '').trim(),
    classificacaoAcesso: String(record.CLASSIFICACAO_ACESSO || '').trim(),
    publicoAlvo: atividades_sanitizePortalText_(record.PUBLICO_ALVO, 180),
    responsavelPublico: atividades_sanitizePortalText_(record.RESPONSAVEL_PUBLICO || record.RESPONSAVEL_INTERNO, 180),
    contaPresenca: atividades_isTruthySim_(record.CONTA_PRESENCA),
    contaFalta: atividades_isTruthySim_(atividades_getEffectiveContaFaltaForActivity_(record)),
    geraCertificado: atividades_isTruthySim_(record.GERA_CERTIFICADO),
    cargaHoraria: atividades_parsePortalCargaHoraria_(record.CARGA_HORARIA, record),
    statusPublico: String(record.STATUS_PUBLICO || record.STATUS_PUBLICACAO_PORTAL || record.STATUS_OPERACIONAL || record.STATUS || '').trim(),
    visibilidadePortal: atividades_getPortalVisibilidade_(record),
    statusOperacional: String(record.STATUS_OPERACIONAL || '').trim(),
    statusPublicacaoPortal: String(record.STATUS_PUBLICACAO_PORTAL || '').trim(),
    eixoTematicoPrincipal: String(record.EIXO_TEMATICO_PRINCIPAL || '').trim(),
    eixoTematicoSecundario: String(record.EIXO_TEMATICO_SECUNDARIO || '').trim(),
    statusEixoTematico: String(record.STATUS_EIXO_TEMATICO || '').trim(),
    idPessoaPrincipal: String(record.ID_PESSOA_PRINCIPAL || '').trim(),
    nomePessoaPrincipalPublico: atividades_sanitizePortalText_(record.NOME_PESSOA_PRINCIPAL_PUBLICO, 180),
    papelPessoaPrincipal: String(record.PAPEL_PESSOA_PRINCIPAL || '').trim(),
    tipoPessoaPrincipal: String(record.TIPO_PESSOA_PRINCIPAL || '').trim(),
    instituicaoPessoaPrincipal: atividades_sanitizePortalText_(record.INSTITUICAO_PESSOA_PRINCIPAL, 180),
    qtdApresentacoes: Number(record.QTD_APRESENTACOES || apresentacoesPublicas.length || 0),
    resumoApresentacoesPublico: atividades_sanitizePortalText_(record.RESUMO_APRESENTACOES_PUBLICO, 500),
    apresentacoesPublicas: apresentacoesPublicas,
    envolvidosPublicos: envolvidosPublicos,
    linkMaterialPublico: atividades_sanitizePortalUrl_(record.LINK_MATERIAL_PUBLICO || record.LINK_MATERIAL),
    linkAtaPublica: atividades_sanitizePortalUrl_(record.LINK_ATA_PUBLICA || record.LINK_ATA),
    linkFotosPublico: atividades_sanitizePortalUrl_(record.LINK_FOTOS_PUBLICO || record.LINK_FOTOS),
    idPastaDrive: String(record.ID_PASTA_DRIVE || '').trim(),
    linkPastaDrive: atividades_sanitizePortalUrl_(record.LINK_PASTA_DRIVE),
    mensagemPortal: atividades_sanitizePortalText_(record.MENSAGEM_PORTAL, 500)
  };
}

function atividades_readPortalActivityRecords_() {
  return atividades_readPortalActivityRecordsV2Dev_();
}

function atividades_readPortalActivityRecordsV2Dev_(spreadsheet, perf) {
  var ss = spreadsheet || atividadesV2_getDatabaseSpreadsheetDev_();
  var sheet = ss.getSheetByName(ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_CALENDARIO);

  if (!sheet) {
    throw new Error('Aba PORTAL_ATIVIDADES_CALENDARIO nao encontrada na base v2 DEV.');
  }

  var records = atividades_readPortalSheetRecordsFast_(
    sheet,
    ATIVIDADES_V2_SCHEMA.PORTAL_ATIVIDADES_CALENDARIO
  );
  if (perf) portalPerfMark_(perf, 'ler_view_calendario', { linhas: records.length });
  return records;
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

function atividades_readPortalActivityDetailViewRecordsV2Dev_(spreadsheet, perf) {
  var records = atividades_tryReadPortalActivityDetailViewV2Dev_(spreadsheet, perf);
  return records || [];
}

function atividades_tryReadPortalActivityDetailViewV2Dev_(spreadsheet, perf) {
  var ss = spreadsheet || atividadesV2_getDatabaseSpreadsheetDev_();
  var sheet = ss.getSheetByName(ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_DETALHES);
  if (!sheet || sheet.getLastRow() < 2) return null;
  var records = atividades_readPortalSheetRecordsFast_(
    sheet,
    ATIVIDADES_V2_SCHEMA.PORTAL_ATIVIDADES_DETALHES
  );
  if (perf) portalPerfMark_(perf, 'ler_view_detalhes', { linhas: records.length });
  return records;
}

function atividades_readPortalSheetRecordsFast_(sheet, expectedHeaders) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var lastColumn = Math.max(sheet.getLastColumn(), 1);
  var currentHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function(header) {
    return String(header || '').trim();
  });
  var headerIndex = {};
  currentHeaders.forEach(function(header, index) {
    if (header && !Object.prototype.hasOwnProperty.call(headerIndex, header)) {
      headerIndex[header] = index;
    }
  });

  var headers = (expectedHeaders || currentHeaders).filter(function(header) {
    return String(header || '').trim();
  });
  var maxIndex = 0;
  headers.forEach(function(header) {
    if (Object.prototype.hasOwnProperty.call(headerIndex, header)) {
      maxIndex = Math.max(maxIndex, headerIndex[header]);
    }
  });

  var readColumns = Math.max(maxIndex + 1, 1);
  var values = sheet.getRange(2, 1, lastRow - 1, readColumns).getValues();
  return values.map(function(row, rowIndex) {
    var record = { _rowNumber: rowIndex + 2 };
    headers.forEach(function(header) {
      var index = headerIndex[header];
      record[header] = index === undefined ? '' : row[index];
    });
    return record;
  }).filter(function(record) {
    return String(record.ID_ATIVIDADE || '').trim();
  });
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
  return atividadesV2_portalGetCalendario_(contexto);
}

function atividadesV2_portalGetCalendario_(contexto) {
  var perf = portalPerfStart_('atividadesV2_portalGetCalendario');
  try {
    var ctx = atividades_normalizePortalContext_(contexto);
    portalPerfMark_(perf, 'contexto_normalizado', { perfil: ctx.perfil });
    var portalConfig = atividadesV2_getPortalConfigCached_();
    portalPerfMark_(perf, 'ler_portal_config_cache');
    var cacheKey = portalCacheBuildKey_('calendario', portalCacheContextToken_(ctx));
    var cached = portalCacheGetJson_(cacheKey);
    if (cached) {
      portalPerfMark_(perf, 'cache_hit_calendario', {
        total: cached.length || 0,
        payloadBytes: portalApproxPayloadBytes_(cached)
      });
      var cachedPerf = portalPerfEnd_(perf);
      return portalPerfAttachDiagnostics_({
        ok: true,
        data: cached,
        meta: atividadesV2_buildPortalCalendarioMeta_(portalConfig),
        cacheHit: true,
        origem: 'geapa-atividades-cache',
        tempoTotalMs: cachedPerf.totalMs
      }, cachedPerf);
    }

    var ss = atividadesV2_getDatabaseSpreadsheetDev_();
    portalPerfMark_(perf, 'abrir_planilha_v2_dev');
    var records = atividades_readPortalActivityRecordsV2Dev_(ss, perf);
    var visiveis = records
      .filter(function(record) {
        return atividades_canShowActivityInPortal_(record, ctx);
      })
      .sort(atividades_sortPortalActivities_);
    portalPerfMark_(perf, 'filtrar_ordenar_calendario', {
      lidas: records.length,
      visiveis: visiveis.length
    });
    var statusMap = atividades_isPrivilegedPortalProfile_(ctx)
      ? atividadesV2_getChamadaStatusMap_(ss, visiveis.map(function(record) {
        return record.ID_ATIVIDADE;
      }), perf)
      : {};
    portalPerfMark_(perf, 'ler_status_chamada', {
      total: Object.keys(statusMap || {}).length
    });
    var shouldLoadPreviousJustifications = ctx.perfil === 'MEMBRO' &&
      !!String(ctx.idPessoa || ctx.rga || ctx.email || '').trim();
    var justificativaContext = shouldLoadPreviousJustifications && typeof atividadesV2_getPreviousJustificationCalendarContext_ === 'function'
      ? atividadesV2_getPreviousJustificationCalendarContext_(ss, ctx)
      : null;
    portalPerfMark_(perf, 'ler_justificativas_previas', {
      aplicada: shouldLoadPreviousJustifications,
      total: justificativaContext && justificativaContext.byActivity ? Object.keys(justificativaContext.byActivity).length : 0
    });
    var data = visiveis.map(function(record) {
        var idAtividade = String(record.ID_ATIVIDADE || '').trim();
        return atividades_buildPortalListItem_(record, ctx, statusMap[idAtividade], portalConfig, justificativaContext);
      });

    var payloadBytes = portalApproxPayloadBytes_(data);
    portalPerfMark_(perf, 'montar_resposta_calendario', {
      total: data.length,
      payloadBytes: payloadBytes
    });
    var cacheOk = portalCachePutJson_(cacheKey, data, ATIVIDADES_V2_PORTAL_CALENDARIO_CACHE_TTL_SECONDS);
    portalPerfMark_(perf, 'gravar_cache_calendario', { ok: cacheOk, ttl: ATIVIDADES_V2_PORTAL_CALENDARIO_CACHE_TTL_SECONDS });
    var perfResult = portalPerfEnd_(perf);

    return portalPerfAttachDiagnostics_({
      ok: true,
      data: data,
      meta: atividadesV2_buildPortalCalendarioMeta_(portalConfig),
      cacheHit: false,
      origem: 'geapa-atividades',
      tempoTotalMs: perfResult.totalMs
    }, perfResult);
  } catch (err) {
    var errorPerf = portalPerfEnd_(perf);
    return portalPerfAttachDiagnostics_({
      ok: false,
      errorCode: 'ERRO_LEITURA_PORTAL',
      message: 'Nao foi possivel consultar as atividades para o portal.',
      details: err && err.message ? err.message : String(err),
      tempoTotalMs: errorPerf ? errorPerf.totalMs : ''
    }, errorPerf);
  }
}

function atividadesV2_buildPortalCalendarioMeta_(portalConfig) {
  var cfg = portalConfig || atividadesV2_getPortalConfigCached_();
  return {
    destacarProxima: cfg.ATIVIDADES_DESTACAR_PROXIMA === true,
    preloadDetalhes: cfg.ATIVIDADES_PRELOAD_DETALHES === true,
    preloadLimite: Number(cfg.ATIVIDADES_PRELOAD_LIMITE || 0),
    chamadaAntecedenciaMinutos: Number(cfg.ATIVIDADES_CHAMADA_ANTECEDENCIA_MINUTOS || 0),
    chamadaToleranciaPosMinutos: Number(cfg.ATIVIDADES_CHAMADA_TOLERANCIA_POS_MINUTOS || 0)
  };
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
      return portalPerfAttachDiagnostics_({
        ok: true,
        data: cached,
        cacheHit: true,
        tempoTotalMs: cachedPerf.totalMs
      }, cachedPerf);
    }

    var bundleCacheKey = portalCacheBuildKey_('detalhes', portalCacheContextToken_(ctx));
    var cachedDetails = portalCacheGetJson_(bundleCacheKey);
    if (cachedDetails && cachedDetails.detalhesPorId && cachedDetails.detalhesPorId[wantedId]) {
      portalPerfMark_(perf, 'cache_hit_detalhes_agregado', { idAtividade: wantedId });
      var aggregatePerf = portalPerfEnd_(perf);
      return {
        ok: true,
        data: cachedDetails.detalhesPorId[wantedId],
        cacheHit: true,
        origem: 'cache_agregado',
        tempoTotalMs: aggregatePerf.totalMs
      };
    }

    portalPerfMark_(perf, 'contexto_normalizado');
    var target = null;
    var ss = atividadesV2_getDatabaseSpreadsheetDev_();
    portalPerfMark_(perf, 'abrir_planilha_v2_dev');
    var records = atividades_readPortalActivityDetailViewRecordsV2Dev_(ss, perf);

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
    return portalPerfAttachDiagnostics_({
      ok: true,
      data: data,
      cacheHit: false,
      tempoTotalMs: perfResult.totalMs
    }, perfResult);
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

function atividadesV2_portalGetAtividadesDetalhes_(contexto) {
  var perf = portalPerfStart_('atividadesV2_portalGetAtividadesDetalhes');
  try {
    var ctx = atividades_normalizePortalContext_(contexto);
    var cacheKey = portalCacheBuildKey_('detalhes', portalCacheContextToken_(ctx));
    var cached = portalCacheGetJson_(cacheKey);
    if (cached) {
      portalPerfMark_(perf, 'cache_hit_detalhes', {
        total: cached && cached.detalhesPorId ? Object.keys(cached.detalhesPorId).length : 0,
        payloadBytes: portalApproxPayloadBytes_(cached)
      });
      var cachedPerf = portalPerfEnd_(perf);
      return {
        ok: true,
        data: cached,
        cacheHit: true,
        origem: 'cache',
        tempoTotalMs: cachedPerf.totalMs
      };
    }

    portalPerfMark_(perf, 'contexto_normalizado');
    var ss = atividadesV2_getDatabaseSpreadsheetDev_();
    portalPerfMark_(perf, 'abrir_planilha_v2_dev');
    var records = atividades_readPortalActivityDetailViewRecordsV2Dev_(ss, perf);

    var detalhesPorId = {};
    var ultimaAtualizacao = '';
    records.forEach(function(record) {
      var id = String(record.ID_ATIVIDADE || '').trim();
      if (!id || detalhesPorId[id]) return;
      if (!atividades_canShowActivityInPortal_(record, ctx)) return;
      detalhesPorId[id] = atividades_buildPortalDetail_(record, ctx);
      if (record.ULTIMA_ATUALIZACAO) ultimaAtualizacao = String(record.ULTIMA_ATUALIZACAO || '');
    });

    var data = {
      detalhesPorId: detalhesPorId,
      ultimaAtualizacao: ultimaAtualizacao
    };
    var payloadBytes = portalApproxPayloadBytes_(data);
    portalPerfMark_(perf, 'montar_resposta_detalhes', {
      total: Object.keys(detalhesPorId).length,
      payloadBytes: payloadBytes
    });
    var cacheOk = portalCachePutJson_(cacheKey, data, ATIVIDADES_V2_PORTAL_DETALHES_CACHE_TTL_SECONDS);
    portalPerfMark_(perf, 'gravar_cache_detalhes', { ok: cacheOk, ttl: ATIVIDADES_V2_PORTAL_DETALHES_CACHE_TTL_SECONDS });
    var perfResult = portalPerfEnd_(perf);
    return {
      ok: true,
      data: data,
      cacheHit: false,
      origem: 'planilha',
      tempoTotalMs: perfResult.totalMs
    };
  } catch (err) {
    var errorPerf = portalPerfEnd_(perf);
    return {
      ok: false,
      errorCode: 'ERRO_DETALHES_PORTAL_ATIVIDADES',
      message: 'Nao foi possivel carregar os detalhes de atividades para preload.',
      details: err && err.message ? err.message : String(err),
      tempoTotalMs: errorPerf ? errorPerf.totalMs : ''
    };
  }
}

function atividadesV2_portalGetAtividadesBundle_(contexto) {
  var perf = portalPerfStart_('atividadesV2_portalGetAtividadesBundle');
  try {
    var rawContext = contexto || {};
    var ctx = atividades_normalizePortalContext_(rawContext);
    var incluirDetalhes = rawContext.incluirDetalhes === true || rawContext.includeDetails === true;
    var cacheScope = incluirDetalhes ? 'bundle:com_detalhes' : 'bundle:leve';
    var cacheKey = portalCacheBuildKey_(cacheScope, portalCacheContextToken_(ctx));
    var cached = portalCacheGetJson_(cacheKey);
    if (cached) {
      portalPerfMark_(perf, 'cache_hit_bundle', {
        modo: incluirDetalhes ? 'com_detalhes' : 'leve',
        total: cached.calendario ? cached.calendario.length : 0,
        payloadBytes: portalApproxPayloadBytes_(cached)
      });
      var cachedPerf = portalPerfEnd_(perf);
      return portalPerfAttachDiagnostics_({
        ok: true,
        data: cached,
        cacheHit: true,
        origem: 'geapa-atividades-cache',
        tempoTotalMs: cachedPerf.totalMs
      }, cachedPerf);
    }

    var listResult = atividadesV2_portalGetCalendario_(ctx);
    if (!listResult.ok) return listResult;
    portalPerfMark_(perf, 'carregar_calendario', {
      total: listResult.data.length,
      cacheHit: !!listResult.cacheHit,
      tempoMs: listResult.tempoTotalMs || ''
    });

    var detalhesPorId = {};
    var ultimaAtualizacao = '';
    if (incluirDetalhes) {
      var detailResult = atividadesV2_portalGetAtividadesDetalhes_(ctx);
      if (!detailResult.ok) return detailResult;
      detalhesPorId = detailResult.data.detalhesPorId || {};
      ultimaAtualizacao = detailResult.data.ultimaAtualizacao || '';
      portalPerfMark_(perf, 'carregar_detalhes', {
        total: Object.keys(detalhesPorId).length,
        cacheHit: !!detailResult.cacheHit,
        tempoMs: detailResult.tempoTotalMs || ''
      });
    } else {
      portalPerfMark_(perf, 'ignorar_detalhes_bundle_leve');
    }

    var data = {
      calendario: listResult.data,
      detalhesPorId: detalhesPorId,
      ultimaAtualizacao: ultimaAtualizacao,
      meta: listResult.meta || {},
      modo: incluirDetalhes ? 'COM_DETALHES' : 'LEVE'
    };
    var payloadBytes = portalApproxPayloadBytes_(data);
    portalPerfMark_(perf, 'serializar_payload_bundle', {
      totalCalendario: data.calendario.length,
      totalDetalhes: Object.keys(data.detalhesPorId || {}).length,
      payloadBytes: payloadBytes
    });
    portalCachePutJson_(cacheKey, data, ATIVIDADES_V2_PORTAL_CACHE_TTL_SECONDS);
    var perfResult = portalPerfEnd_(perf);
    return portalPerfAttachDiagnostics_({
      ok: true,
      data: data,
      cacheHit: false,
      origem: 'geapa-atividades',
      tempoTotalMs: perfResult.totalMs
    }, perfResult);
  } catch (err) {
    var errorPerf = portalPerfEnd_(perf);
    return portalPerfAttachDiagnostics_({
      ok: false,
      errorCode: 'ERRO_BUNDLE_PORTAL_ATIVIDADES',
      message: 'Nao foi possivel consultar o pacote de atividades para o portal.',
      details: err && err.message ? err.message : String(err),
      tempoTotalMs: errorPerf ? errorPerf.totalMs : ''
    }, errorPerf);
  }
}

function atividadesV2_runTestePortalPerformanceDev_() {
  var ctx = {
    perfil: 'MEMBRO',
    somenteVisiveis: true
  };
  var token = portalCacheContextToken_(ctx);
  portalCacheRemove_(portalCacheBuildKey_('calendario', token));
  portalCacheRemove_(portalCacheBuildKey_('detalhes', token));
  portalCacheRemove_(portalCacheBuildKey_('bundle', token));

  var primeira = atividadesV2_portalGetCalendario_(ctx);
  var segunda = atividadesV2_portalGetCalendario_(ctx);
  var detalhes = atividadesV2_portalGetAtividadesDetalhes_(ctx);

  return {
    ok: !!(primeira.ok && segunda.ok && detalhes.ok),
    calendarioPrimeiraChamadaMs: primeira.tempoTotalMs || '',
    calendarioCacheMs: segunda.tempoTotalMs || '',
    detalhesMs: detalhes.tempoTotalMs || '',
    totalAtividades: primeira.ok ? primeira.data.length : 0,
    totalDetalhes: detalhes.ok ? Object.keys(detalhes.data.detalhesPorId || {}).length : 0,
    cacheFuncionando: !!segunda.cacheHit,
    calendarioOrigemPrimeira: primeira.origem || '',
    calendarioOrigemSegunda: segunda.origem || '',
    detalhesOrigem: detalhes.origem || '',
    erros: [primeira, segunda, detalhes].filter(function(result) {
      return !result.ok;
    }).map(function(result) {
      return result.errorCode || result.message || 'ERRO';
    })
  };
}

function atividades_runTestePortalAtividades_() {
  var listResult = atividadesV2_portalGetCalendario_({
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
