/**
 * Ciclo operacional das Atividades V2.
 *
 * Rotinas DEV para diagnosticar e aplicar transicoes conservadoras de
 * STATUS_OPERACIONAL, sem alterar status de publicacao nem regras de
 * frequencia/justificativa.
 */

var ATIVIDADES_V2_STATUS_OPERACIONAL_PROTEGIDOS = Object.freeze([
  'CANCELADA',
  'CANCELADO',
  'ARQUIVADA',
  'ARQUIVADO',
  'INATIVA',
  'INATIVO',
  'EXCLUIDA',
  'EXCLUIDO',
  'SUSPENSA',
  'SUSPENSO'
]);

var ATIVIDADES_V2_STATUS_OPERACIONAL_AUTO_REALIZAR = Object.freeze([
  'PLANEJADA',
  'AGENDADA',
  'PUBLICADA',
  'EM_ANDAMENTO'
]);

function atividadesV2_diagnosticarCicloAtividadesDev_() {
  return atividadesV2_atualizarCicloAtividadesDev_({ dryRun: true });
}

function atividadesV2_atualizarCicloAtividadesDev_(options) {
  var opts = options || {};
  var dryRun = opts.dryRun !== false;
  if (dryRun) {
    return atividadesV2_avaliarCicloAtividadesDev_(opts, null);
  }

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return {
      ok: false,
      dryRun: false,
      modo: atividadesV2_resolveEnvironment_({}),
      errorCode: 'LOCK_INDISPONIVEL',
      message: 'Nao foi possivel obter lock para atualizar ciclo operacional das atividades.'
    };
  }

  var result;
  try {
    result = atividadesV2_avaliarCicloAtividadesDev_(opts, null);
    if (!result.ok) return result;
    atividadesV2_aplicarAlteracoesCicloAtividades_(result);
  } finally {
    lock.releaseLock();
  }

  atividadesV2_posAtualizacaoCicloAtividades_(result, opts);
  return result;
}

function atividadesV2_avaliarCicloAtividadesDev_(options, idAtividadeUnico) {
  var opts = options || {};
  var ss = atividadesV2_getDatabaseSpreadsheet_({ ambiente: 'DEV' });
  var atividadesSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES);
  atividadesV2_applyHeadersIfMissing_(atividadesSheet, ATIVIDADES_V2_SCHEMA.ATIVIDADES);
  var atividades = atividadesV2_readSheetObjects_(atividadesSheet);
  var presencas = atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.PRESENCAS_REGISTROS));
  var statusChamadaMap = atividadesV2_getChamadaStatusMap_(ss, atividades.map(function(record) {
    return record.ID_ATIVIDADE;
  }), null, { skipCache: true });
  var presencasPorAtividade = atividadesV2_indexPresencasOficiaisPorAtividade_(presencas);
  var now = atividades_parseDateOrNull_(opts.now) || new Date();
  var filtroId = String(idAtividadeUnico || opts.idAtividade || '').trim();
  var result = {
    ok: true,
    dryRun: opts.dryRun !== false,
    modo: atividadesV2_resolveEnvironment_({}),
    colunaStatus: 'STATUS_OPERACIONAL',
    statusProtegidos: ATIVIDADES_V2_STATUS_OPERACIONAL_PROTEGIDOS.slice(),
    criteriosRealizada: [
      'data/hora da atividade ja passou',
      'status operacional nao protegido',
      'chamada finalizada ou presenca oficial registrada',
      'atividade sem chamada apenas com allowAutoRealizarSemChamada=true'
    ],
    totalAnalisadas: 0,
    totalMudariam: 0,
    totalAplicadas: 0,
    alteracoes: [],
    alertas: [],
    erros: []
  };

  atividades.forEach(function(record) {
    var idAtividade = String(record.ID_ATIVIDADE || '').trim();
    if (filtroId && idAtividade !== filtroId) return;
    result.totalAnalisadas++;
    var decision = atividadesV2_avaliarCicloAtividade_(record, {
      now: now,
      statusChamada: statusChamadaMap[idAtividade] || null,
      presencas: presencasPorAtividade[idAtividade] || [],
      allowAutoRealizarSemChamada: opts.allowAutoRealizarSemChamada === true
    });
    if (decision.alteracao) {
      result.alteracoes.push(decision.alteracao);
    }
    if (decision.alerta) {
      result.alertas.push(decision.alerta);
    }
  });

  result.totalMudariam = result.alteracoes.length;
  return result;
}

function atividadesV2_avaliarCicloAtividade_(record, context) {
  var idAtividade = String(record.ID_ATIVIDADE || '').trim();
  var statusAtual = atividades_normalizeTextUpper_(record.STATUS_OPERACIONAL || record.STATUS || '');
  var titulo = atividades_sanitizePortalText_(record.TITULO_PUBLICO || record.TITULO || '', 180);
  var protectedStatus = ATIVIDADES_V2_STATUS_OPERACIONAL_PROTEGIDOS.indexOf(statusAtual) >= 0;
  if (!idAtividade) {
    return {
      alerta: atividadesV2_cicloAlerta_(record, null, 'Atividade sem ID_ATIVIDADE.')
    };
  }
  if (protectedStatus) return {};
  if (atividades_normalizeTextUpper_(record.ATIVO || 'SIM') === 'NAO') return {};
  if (statusAtual === 'REALIZADA' || statusAtual === 'ENCERRADA') return {};
  if (ATIVIDADES_V2_STATUS_OPERACIONAL_AUTO_REALIZAR.indexOf(statusAtual || 'PLANEJADA') === -1) {
    return {};
  }

  var temporal = atividadesV2_cicloAtividadeJaPassou_(record, context.now);
  if (!temporal.ok) {
    return {
      alerta: atividadesV2_cicloAlerta_(record, null, temporal.motivo)
    };
  }
  if (!temporal.passou) return {};

  var exigeChamada = atividadesV2_cicloAtividadeExigeChamada_(record);
  var chamadaFinalizada = atividadesV2_cicloStatusChamadaFinalizada_(context.statusChamada);
  var presencaOficial = (context.presencas || []).length > 0;
  var motivo = '';

  if (chamadaFinalizada) {
    motivo = 'Data passada e chamada finalizada.';
  } else if (presencaOficial) {
    motivo = 'Data passada e presenca oficial registrada.';
  } else if (!exigeChamada && context.allowAutoRealizarSemChamada === true) {
    motivo = 'Data passada e atividade sem exigencia de chamada.';
  } else {
    return {
      alerta: atividadesV2_cicloAlerta_(
        record,
        null,
        exigeChamada
          ? 'Data passada, mas chamada nao finalizada e atividade exige presenca.'
          : 'Data passada, mas atividade sem chamada requer confirmacao manual ou allowAutoRealizarSemChamada=true.'
      )
    };
  }

  return {
    alteracao: {
      idAtividade: idAtividade,
      rowNumber: record._rowNumber,
      titulo: titulo || 'Atividade do GEAPA',
      statusAtual: statusAtual || '',
      statusSugerido: 'REALIZADA',
      motivo: motivo,
      chamadaFinalizada: chamadaFinalizada,
      presencasOficiais: (context.presencas || []).length,
      dataAtividade: atividades_formatPortalDateIso_(record.DATA_ATIVIDADE)
    }
  };
}

function atividadesV2_cicloAlerta_(record, statusSugerido, mensagem) {
  return {
    idAtividade: String(record && record.ID_ATIVIDADE || '').trim(),
    titulo: atividades_sanitizePortalText_(record && (record.TITULO_PUBLICO || record.TITULO) || '', 180),
    statusAtual: atividades_normalizeTextUpper_(record && (record.STATUS_OPERACIONAL || record.STATUS) || ''),
    statusSugerido: statusSugerido,
    alerta: mensagem
  };
}

function atividadesV2_cicloAtividadeJaPassou_(record, refDate) {
  var baseDate = atividades_parseDateOrNull_(record && record.DATA_ATIVIDADE);
  if (!baseDate) return { ok: false, passou: false, motivo: 'Atividade sem data.' };
  var fim = atividadesV2_buildActivityEndDateTime_(baseDate, record && record.HORARIO_FIM, record && record.HORARIO_INICIO);
  return { ok: true, passou: fim.getTime() <= (refDate || new Date()).getTime(), fim: fim };
}

function atividadesV2_buildActivityEndDateTime_(dateValue, endTimeValue, startTimeValue) {
  var date = atividades_parseDateOrNull_(dateValue);
  var endMinutes = atividades_parseTimeValueToMinutes_(endTimeValue);
  if (endMinutes === null) endMinutes = atividades_parseTimeValueToMinutes_(startTimeValue);
  if (endMinutes === null) endMinutes = (23 * 60) + 59;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
}

function atividadesV2_cicloAtividadeExigeChamada_(record) {
  return atividades_isTruthySim_(record && record.CONTA_PRESENCA) ||
    atividades_isTruthySim_(record && record.CONTA_FALTA) ||
    atividades_isTruthySim_(record && record.EXIGE_LISTA_PRESENCA) ||
    atividades_isTruthySim_(record && record.EXIGE_CONFIRMACAO_PRESENCA);
}

function atividadesV2_cicloStatusChamadaFinalizada_(status) {
  return atividades_normalizeTextUpper_(status && status.statusChamada) === 'FINALIZADA' ||
    status && status.finalizada === true;
}

function atividadesV2_indexPresencasOficiaisPorAtividade_(presencas) {
  var out = {};
  (presencas || []).forEach(function(record) {
    if (atividades_normalizeTextUpper_(record.ATIVO || 'SIM') === 'NAO') return;
    var id = String(record.ID_ATIVIDADE || '').trim();
    if (!id) return;
    if (!out[id]) out[id] = [];
    out[id].push(record);
  });
  return out;
}

function atividadesV2_aplicarAlteracoesCicloAtividades_(result) {
  var ss = atividadesV2_getDatabaseSpreadsheet_({ ambiente: 'DEV' });
  var sheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES);
  var headers = atividadesV2_getSheetHeaders_(sheet);
  var headerMap = atividadesV2_simpleHeaderMap_(headers);
  var now = new Date();
  result.alteracoes.forEach(function(change) {
    if (!change.rowNumber) return;
    var changed = false;
    changed = atividadesV2_writeCellIfChanged_(sheet, change.rowNumber, headerMap.STATUS_OPERACIONAL, change.statusSugerido) || changed;
    if (headerMap.DATA_REALIZACAO) {
      changed = atividadesV2_writeCellIfChanged_(sheet, change.rowNumber, headerMap.DATA_REALIZACAO, now) || changed;
    }
    if (headerMap.ATUALIZADO_EM) {
      changed = atividadesV2_writeCellIfChanged_(sheet, change.rowNumber, headerMap.ATUALIZADO_EM, now) || changed;
    }
    if (headerMap.ATUALIZADO_POR) {
      changed = atividadesV2_writeCellIfChanged_(sheet, change.rowNumber, headerMap.ATUALIZADO_POR, 'ATIVIDADES_V2_CICLO_OPERACIONAL') || changed;
    }
    if (changed) {
      result.totalAplicadas++;
      atividadesV2_appendV2Log_(ss, {
        FLUXO: 'CICLO_OPERACIONAL_V2',
        ACAO: 'Atualizar STATUS_OPERACIONAL para REALIZADA',
        NIVEL: 'INFO',
        STATUS: 'OK',
        ID_ATIVIDADE: change.idAtividade,
        MENSAGEM: 'Status operacional atualizado automaticamente em DEV.',
        DETALHES_JSON: atividadesV2_safeLogData_({
          statusAnterior: change.statusAtual,
          statusNovo: change.statusSugerido,
          motivo: change.motivo
        })
      });
    }
  });
}

function atividadesV2_posAtualizacaoCicloAtividades_(result, options) {
  if (!result || !result.totalAplicadas) return;
  if (typeof atividadesV2_limparCachePortalDev_ === 'function') atividadesV2_limparCachePortalDev_();
  if (options && options.atualizarViews === false) return;
  if (typeof atividadesV2_atualizarPortalCalendario_ === 'function') {
    result.viewsAtualizadas = {
      calendario: atividadesV2_atualizarPortalCalendario_({ dryRun: false }),
      detalhes: atividadesV2_atualizarPortalDetalhes_({ dryRun: false }),
      status: atividadesV2_atualizarPortalStatus_({ dryRun: false })
    };
  }
}

function atividadesV2_avaliarCicloAtividadeAposChamadaDev_(ss, idAtividade, options) {
  var opts = Object.assign({}, options || {}, {
    dryRun: false,
    idAtividade: idAtividade
  });
  var result = atividadesV2_avaliarCicloAtividadesDev_(opts, idAtividade);
  if (!result.ok || !result.totalMudariam) return result;
  atividadesV2_aplicarAlteracoesCicloAtividades_(result);
  atividadesV2_posAtualizacaoCicloAtividades_(result, opts);
  return result;
}

function atividadesV2_runTesteCicloAtividadesDev_() {
  return atividadesV2_atualizarCicloAtividadesDev_({ dryRun: true });
}

function atividadesV2_diagnosticarReconciliacaoChamadasDev_() {
  return atividadesV2_reconciliarChamadasDev_({ dryRun: true });
}

function atividadesV2_diagnosticarReconcilicaoChamadasDev_() {
  return atividadesV2_diagnosticarReconciliacaoChamadasDev_();
}

function atividadesV2_reconciliarChamadasDev_(options) {
  var opts = options || {};
  var dryRun = opts.dryRun !== false;
  if (dryRun) {
    var dryRunResult = atividadesV2_avaliarReconciliacaoChamadasDev_(opts);
    atividadesV2_logResumoReconciliacaoChamadas_(dryRunResult, 'dryRun');
    return dryRunResult;
  }

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    var lockResult = {
      ok: false,
      dryRun: false,
      modo: atividadesV2_resolveEnvironment_({}),
      errorCode: 'LOCK_INDISPONIVEL',
      message: 'Nao foi possivel obter lock para reconciliar chamadas.'
    };
    atividadesV2_logResumoReconciliacaoChamadas_(lockResult, 'erro');
    return lockResult;
  }

  var result;
  try {
    result = atividadesV2_avaliarReconciliacaoChamadasDev_(opts);
    if (!result.ok) {
      atividadesV2_logResumoReconciliacaoChamadas_(result, 'erro');
      return result;
    }
    atividadesV2_aplicarReconciliacaoChamadas_(result, opts);
  } finally {
    lock.releaseLock();
  }

  atividadesV2_posReconciliacaoChamadas_(result, opts);
  atividadesV2_logResumoReconciliacaoChamadas_(result, 'aplicacao');
  return result;
}

function atividadesV2_avaliarReconciliacaoChamadasDev_(options) {
  var opts = options || {};
  var ss = atividadesV2_getDatabaseSpreadsheet_({ ambiente: 'DEV' });
  var atividades = atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES));
  var presencas = atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.PRESENCAS_REGISTROS));
  var atividadesById = atividadesV2_indexByField_(atividades, 'ID_ATIVIDADE');
  var presencasPorAtividade = atividadesV2_indexPresencasOficiaisPorAtividade_(presencas);
  var statusAcoes = atividadesV2_readChamadaActionStatusContext_(ss);
  var now = atividades_parseDateOrNull_(opts.now) || new Date();
  var filtroId = String(opts.idAtividade || '').trim();
  var result = {
    ok: true,
    dryRun: opts.dryRun !== false,
    modo: atividadesV2_resolveEnvironment_({}),
    totalAtividadesAnalisadas: filtroId ? 1 : atividades.length,
    totalComPresencasOficiais: 0,
    totalInconsistentes: 0,
    totalSegurasParaFinalizar: 0,
    totalInseguras: 0,
    totalAplicadas: 0,
    itens: [],
    alertas: [],
    cachesInvalidar: [
      'chamada da atividade',
      'lista de atividades',
      'detalhe da atividade',
      'status da chamada',
      'frequencia dos membros afetados',
      'justificativas dos membros afetados',
      'pendencias da diretoria',
      'calendario/status das atividades'
    ],
    viewsAtualizar: [
      ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_CALENDARIO,
      ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_DETALHES,
      ATIVIDADES_V2_SHEETS.PORTAL_STATUS_ATIVIDADES,
      ATIVIDADES_V2_SHEETS.PORTAL_FREQUENCIA_MEMBROS,
      ATIVIDADES_V2_SHEETS.PORTAL_JUSTIFICATIVAS,
      ATIVIDADES_V2_SHEETS.PORTAL_PENDENCIAS_DIRETORIA
    ],
    erros: []
  };

  Object.keys(presencasPorAtividade).sort().forEach(function(idAtividade) {
    if (filtroId && idAtividade !== filtroId) return;
    var activity = atividadesById[idAtividade];
    var registros = presencasPorAtividade[idAtividade] || [];
    result.totalComPresencasOficiais++;
    var item = atividadesV2_avaliarReconciliacaoChamada_(ss, activity, registros, statusAcoes[idAtividade] || null, now);
    if (item.statusChamadaAtual !== 'FINALIZADA' && item.possuiPresencasOficiais) {
      result.totalInconsistentes++;
    }
    if (item.seguroParaFinalizar) {
      result.totalSegurasParaFinalizar++;
      result.itens.push(item);
    } else if (item.statusChamadaAtual === 'FINALIZADA') {
      result.itens.push(item);
    } else {
      result.totalInseguras++;
      result.alertas.push({
        idAtividade: item.idAtividade,
        titulo: item.titulo,
        motivo: item.motivo,
        codigo: item.codigoAlerta || 'CHAMADA_NAO_RECONCILIADA',
        statusChamadaAtual: item.statusChamadaAtual,
        totalRegistrosPresenca: item.totalRegistrosPresenca,
        totalMembrosAplicaveis: item.totalMembrosAplicaveis
      });
    }
  });

  return result;
}

function atividadesV2_avaliarReconciliacaoChamada_(ss, activity, registros, actionStatus, now) {
  var idAtividade = String(activity && activity.ID_ATIVIDADE || (registros[0] && registros[0].ID_ATIVIDADE) || '').trim();
  var statusAtual = atividades_normalizeTextUpper_(activity && activity.STATUS_OPERACIONAL || '');
  var statusChamadaAtual = actionStatus ? actionStatus.statusChamada : 'RASCUNHO';
  var item = {
    idAtividade: idAtividade,
    titulo: atividades_sanitizePortalText_(activity && (activity.TITULO_PUBLICO || activity.TITULO) || '', 180),
    dataAtividade: atividades_formatPortalDateIso_(activity && activity.DATA_ATIVIDADE),
    statusOperacionalAtual: statusAtual,
    statusChamadaAtual: statusChamadaAtual,
    possuiPresencasOficiais: (registros || []).length > 0,
    totalRegistrosPresenca: (registros || []).length,
    totalMembrosAplicaveis: 0,
    chamadaCompleta: false,
    seguroParaFinalizar: false,
    statusChamadaSugerido: '',
    statusOperacionalSugerido: '',
    motivo: '',
    codigoAlerta: ''
  };

  if (!activity) return atividadesV2_reconciliacaoInsegura_(item, 'ATIVIDADE_NAO_ENCONTRADA', 'Presencas oficiais apontam para atividade inexistente.');
  if (ATIVIDADES_V2_STATUS_OPERACIONAL_PROTEGIDOS.indexOf(statusAtual) >= 0 || atividades_normalizeTextUpper_(activity.ATIVO || 'SIM') === 'NAO') {
    return atividadesV2_reconciliacaoInsegura_(item, 'STATUS_PROTEGIDO', 'Atividade cancelada, arquivada, inativa, excluida ou suspensa.');
  }
  if (!atividadesV2_cicloAtividadeExigeChamada_(activity)) {
    return atividadesV2_reconciliacaoInsegura_(item, 'ATIVIDADE_NAO_PERMITE_CHAMADA', 'Atividade nao exige/permite chamada.');
  }
  var temporal = atividadesV2_cicloAtividadeJaPassou_(activity, now);
  if (!temporal.ok) return atividadesV2_reconciliacaoInsegura_(item, 'ATIVIDADE_SEM_DATA', temporal.motivo);
  if (!temporal.passou) return atividadesV2_reconciliacaoInsegura_(item, 'ATIVIDADE_FUTURA', 'Atividade ainda nao passou.');
  if (statusChamadaAtual === 'FINALIZADA') {
    item.chamadaCompleta = true;
    item.motivo = 'Chamada ja consta como FINALIZADA em Portal_Acoes.';
    return item;
  }
  if (statusChamadaAtual === 'REABERTA') {
    return atividadesV2_reconciliacaoInsegura_(item, 'CHAMADA_REABERTA_POSTERIOR', 'Existe CHAMADA_REABERTA posterior; edicao ainda pode estar aberta.');
  }

  var validacao = atividadesV2_validarRegistrosOficiaisParaReconciliacao_(registros);
  if (!validacao.ok) {
    return atividadesV2_reconciliacaoInsegura_(item, validacao.codigo, validacao.motivo);
  }

  var membrosResult = atividadesV2_listarMembrosChamadaViaCore_(activity.DATA_ATIVIDADE, { perfil: 'ADMIN_TECNICO', somenteVisiveis: false }, null);
  if (!membrosResult.ok) {
    return atividadesV2_reconciliacaoInsegura_(item, 'MEMBROS_CORE_INDISPONIVEL', membrosResult.message || 'Nao foi possivel listar membros aplicaveis pelo Core.');
  }
  var completude = atividadesV2_validarCompletudeReconChamada_(membrosResult.data, registros);
  item.totalMembrosAplicaveis = completude.totalMembrosAplicaveis;
  item.chamadaCompleta = completude.ok;
  if (!completude.ok) {
    return atividadesV2_reconciliacaoInsegura_(item, completude.codigo, completude.motivo);
  }

  item.seguroParaFinalizar = true;
  item.statusChamadaSugerido = 'FINALIZADA';
  item.statusOperacionalSugerido = statusAtual === 'REALIZADA' ? '' : 'REALIZADA';
  item.motivo = 'Ha presenca oficial completa, mas nao ha CHAMADA_FINALIZADA vigente em Portal_Acoes.';
  item.resumo = atividadesV2_countChamadaRows_(registros);
  item.registros = registros;
  return item;
}

function atividadesV2_reconciliacaoInsegura_(item, codigo, motivo) {
  item.seguroParaFinalizar = false;
  item.codigoAlerta = codigo;
  item.motivo = motivo;
  return item;
}

function atividadesV2_validarRegistrosOficiaisParaReconciliacao_(registros) {
  var seen = {};
  var validCodes = { P: true, R: true, F: true, J: true, A: true, 'N/A': true };
  var validStatus = {
    PRESENTE_PRESENCIAL: true,
    PRESENTE_REMOTO: true,
    FALTA: true,
    JUSTIFICADA: true,
    ABONADA: true,
    NAO_SE_APLICA: true
  };
  for (var i = 0; i < (registros || []).length; i++) {
    var record = registros[i];
    var code = String(record.CODIGO_PRESENCA || '').trim().toUpperCase();
    var status = atividades_normalizeTextUpper_(record.STATUS_PRESENCA || '');
    if (code && !validCodes[code]) return { ok: false, codigo: 'CODIGO_PRESENCA_INVALIDO', motivo: 'Registro oficial possui codigo de presenca invalido.' };
    if (status && !validStatus[status]) return { ok: false, codigo: 'STATUS_PRESENCA_INVALIDO', motivo: 'Registro oficial possui status de presenca invalido para reconciliacao.' };
    if (!code && !status) return { ok: false, codigo: 'STATUS_PRESENCA_AUSENTE', motivo: 'Registro oficial sem status/codigo de presenca.' };
    var keys = atividadesV2_reconciliacaoPessoaKeys_(record);
    if (!keys.length) return { ok: false, codigo: 'IDENTIFICADOR_PARTICIPANTE_AUSENTE', motivo: 'Registro oficial sem ID_PESSOA, RGA ou email suficiente.' };
    for (var j = 0; j < keys.length; j++) {
      if (seen[keys[j]]) return { ok: false, codigo: 'DUPLICIDADE_PRESENCA_ATIVA', motivo: 'Duplicidade ativa para o mesmo participante na atividade.' };
    }
    keys.forEach(function(key) { seen[key] = true; });
  }
  return { ok: true };
}

function atividadesV2_validarCompletudeReconChamada_(members, registros) {
  var covered = {};
  (registros || []).forEach(function(record) {
    atividadesV2_reconciliacaoPessoaKeys_(record).forEach(function(key) {
      covered[key] = true;
    });
  });
  var total = 0;
  var missing = [];
  (members || []).forEach(function(member) {
    if (!member || member.aplicavelNaData === false) return;
    total++;
    var keys = atividadesV2_reconciliacaoPessoaKeys_({
      ID_PESSOA: atividadesV2_resolverPessoa_(member).idPessoa,
      RGA: member.rga,
      EMAIL_PARTICIPANTE: member.email
    });
    var found = keys.some(function(key) { return covered[key] === true; });
    if (!found) missing.push(member.rga || member.email || member.nomeExibicao || member.nome || 'MEMBRO_SEM_ID');
  });
  if (missing.length) {
    return {
      ok: false,
      codigo: 'MEMBROS_APLICAVEIS_SEM_REGISTRO',
      motivo: 'Possui presencas oficiais, mas ha membros aplicaveis sem registro.',
      totalMembrosAplicaveis: total,
      faltantes: missing
    };
  }
  return { ok: true, totalMembrosAplicaveis: total };
}

function atividadesV2_reconciliacaoPessoaKey_(record) {
  var keys = atividadesV2_reconciliacaoPessoaKeys_(record);
  return keys.length ? keys[0] : '';
}

function atividadesV2_reconciliacaoPessoaKeys_(record) {
  var out = [];
  var pessoa = atividadesV2_sanitizeIdToken_(record && (record.ID_PESSOA || record.idPessoa) || '');
  if (pessoa) out.push('PESSOA:' + pessoa);
  var rga = atividadesV2_sanitizeIdToken_(record && (record.RGA || record.rga || record.ID_REFERENCIA) || '');
  if (rga) out.push('RGA:' + rga);
  var email = atividades_normalizeTextLower_(record && (record.EMAIL_PARTICIPANTE || record.email || record.EMAIL) || '');
  if (email) out.push('EMAIL:' + email);
  return out.filter(function(key, index, arr) {
    return key && arr.indexOf(key) === index;
  });
}

function atividadesV2_readChamadaActionStatusContext_(ss) {
  var sheet = ss.getSheetByName(ATIVIDADES_V2_SHEETS.PORTAL_ACOES);
  if (!sheet || sheet.getLastRow() < 2) return {};
  var records = atividadesV2_readSheetObjects_(sheet);
  var latest = {};
  records.forEach(function(record) {
    if (atividades_normalizeTextUpper_(record.ATIVO || 'SIM') === 'NAO') return;
    var tipo = atividades_normalizeTextUpper_(record.TIPO_ACAO || '');
    if (['CHAMADA_RASCUNHO_SALVO', 'CHAMADA_SALVA', 'CHAMADA_FINALIZADA', 'CHAMADA_REABERTA'].indexOf(tipo) === -1) return;
    var idAtividade = String(record.ID_ATIVIDADE || '').trim();
    if (!idAtividade) return;
    var dataHora = record.DATA_HORA || record.CRIADO_EM || record.PROCESSADO_EM || '';
    if (latest[idAtividade] && String(latest[idAtividade].dataHora || '') > String(dataHora || '')) return;
    latest[idAtividade] = {
      tipoAcao: tipo,
      dataHora: dataHora,
      statusChamada: atividadesV2_statusFromPortalAction_(tipo),
      payload: atividadesV2_parseJsonOrEmpty_(record.PAYLOAD_JSON)
    };
  });
  return latest;
}

function atividadesV2_aplicarReconciliacaoChamadas_(result, options) {
  var ss = atividadesV2_getDatabaseSpreadsheet_({ ambiente: 'DEV' });
  (result.itens || []).forEach(function(item) {
    if (!item.seguroParaFinalizar) return;
    var activity = atividadesV2_getChamadaActivity_(ss, item.idAtividade, null);
    if (!activity) return;
    atividadesV2_registrarStatusChamada_(
      ss,
      activity,
      { perfil: 'ADMIN_TECNICO', email: 'ATIVIDADES_V2_RECONCILIACAO' },
      'FINALIZADA',
      item.resumo || {},
      {
        observacoes: 'Chamada reconciliada automaticamente a partir de presencas oficiais DEV.',
        extraPayload: {
          origemReconcilicao: 'Atividades_Presencas_Registros',
          origemReconciliacao: 'Atividades_Presencas_Registros',
          reconciliadoEm: new Date().toISOString()
        }
      }
    );
    atividadesV2_appendV2Log_(ss, {
      FLUXO: 'RECONCILIACAO_CHAMADAS_V2',
      ACAO: 'Registrar CHAMADA_FINALIZADA por reconciliacao',
      NIVEL: 'INFO',
      STATUS: 'OK',
      ID_ATIVIDADE: item.idAtividade,
      MENSAGEM: 'Chamada reconciliada como FINALIZADA a partir de registros oficiais existentes em Atividades_Presencas_Registros.',
      DETALHES_JSON: atividadesV2_safeLogData_({
        totalRegistrosPresenca: item.totalRegistrosPresenca,
        totalMembrosAplicaveis: item.totalMembrosAplicaveis
      })
    });
    var ciclo = atividadesV2_avaliarCicloAtividadeAposChamadaDev_(ss, item.idAtividade, {
      atualizarViews: false
    });
    item.cicloOperacional = {
      totalMudariam: ciclo.totalMudariam || 0,
      totalAplicadas: ciclo.totalAplicadas || 0,
      alteracoes: ciclo.alteracoes || [],
      alertas: ciclo.alertas || []
    };
    atividadesV2_invalidateChamadaPortalCaches_({ perfil: 'ADMIN_TECNICO' }, {
      idAtividade: item.idAtividade,
      registros: item.registros || []
    });
    result.totalAplicadas++;
  });
}

function atividadesV2_posReconciliacaoChamadas_(result, options) {
  if (!result || !result.totalAplicadas) return;
  if (typeof atividadesV2_limparCachePortalDev_ === 'function') atividadesV2_limparCachePortalDev_();
  if (options && options.atualizarViews === false) return;
  if (typeof atividadesV2_atualizarViewsPortal_ === 'function') {
    result.viewsAtualizadas = atividadesV2_atualizarViewsPortal_({ dryRun: false });
  }
}

function atividadesV2_logResumoReconciliacaoChamadas_(result, etapa) {
  var resumo = {
    etapa: etapa || '',
    ok: !!(result && result.ok),
    dryRun: !!(result && result.dryRun),
    totalComPresencasOficiais: result && result.totalComPresencasOficiais || 0,
    totalInconsistentes: result && result.totalInconsistentes || 0,
    totalSegurasParaFinalizar: result && result.totalSegurasParaFinalizar || 0,
    totalInseguras: result && result.totalInseguras || 0,
    totalAplicadas: result && result.totalAplicadas || 0,
    primeiroAlerta: result && result.alertas && result.alertas[0] ? {
      idAtividade: result.alertas[0].idAtividade || '',
      codigo: result.alertas[0].codigo || '',
      motivo: result.alertas[0].motivo || ''
    } : null,
    errorCode: result && result.errorCode || ''
  };
  Logger.log('GEAPA-ATIVIDADES-V2-RECONCILIACAO chamadas: ' + atividadesV2_safeLogData_(resumo));
}
