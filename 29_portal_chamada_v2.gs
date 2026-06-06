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

    var activity = atividadesV2_getChamadaActivity_(ss, wantedId);
    if (!activity) return atividadesV2_chamadaError_('ATIVIDADE_NAO_ENCONTRADA', 'Atividade nao encontrada na base v2 DEV.');

    var activityValidation = atividadesV2_validateActivityAllowsChamada_(activity);
    if (!activityValidation.ok) return activityValidation;

    var statusChamada = atividadesV2_getChamadaStatus_(ss, wantedId);
    var janela = atividadesV2_getChamadaWindowMeta_(activity, statusChamada, ctx);
    if (!janela.podeVisualizarChamada) {
      return atividadesV2_chamadaError_(
        'CHAMADA_FORA_DA_JANELA',
        atividadesV2_chamadaWindowPublicMessage_(janela.motivoChamadaIndisponivel),
        null,
        ''
      );
    }

    var membersResult = atividadesV2_listarMembrosChamadaViaCore_(activity.DATA_ATIVIDADE, ctx);
    if (!membersResult.ok) return membersResult;
    portalPerfMark_(perf, 'listar_membros_core', { total: membersResult.data.length });

    var presencas = atividadesV2_readChamadaExistingRecords_(ss, wantedId);
    var presencasByRef = atividadesV2_indexChamadaRecordsByReference_(presencas);
    portalPerfMark_(perf, 'ler_presencas_existentes', { total: presencas.length });

    var convites = atividadesV2_readChamadaConvites_(ss, wantedId);
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
      tempoTotalMs: perfResult.totalMs
    };
  } catch (err) {
    var perfError = portalPerfEnd_(perf);
    return atividadesV2_chamadaError_(
      'ERRO_BUSCAR_CHAMADA',
      'Nao foi possivel buscar a chamada da atividade.',
      err,
      perfError ? perfError.totalMs : ''
    );
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

    var activity = atividadesV2_getChamadaActivity_(ss, wantedId);
    if (!activity) return atividadesV2_chamadaError_('ATIVIDADE_NAO_ENCONTRADA', 'Atividade nao encontrada na base v2 DEV.');

    var activityValidation = atividadesV2_validateActivityAllowsChamada_(activity);
    if (!activityValidation.ok) return activityValidation;

    var statusAtual = atividadesV2_getChamadaStatus_(ss, wantedId);
    if (statusAtual.finalizada && operacao !== ATIVIDADES_V2_CHAMADA_OPERACOES.REABRIR) {
      return atividadesV2_chamadaError_('CHAMADA_FINALIZADA', 'Chamada finalizada. Reabra a chamada antes de alterar registros.');
    }

    var janela = atividadesV2_getChamadaWindowMeta_(activity, statusAtual, ctx);
    if (operacao !== ATIVIDADES_V2_CHAMADA_OPERACOES.REABRIR && !janela.podeRegistrarChamadaAgora) {
      return atividadesV2_chamadaError_(
        'CHAMADA_FORA_DA_JANELA',
        atividadesV2_chamadaWindowPublicMessage_(janela.motivoChamadaIndisponivel)
      );
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
        tempoTotalMs: perfReabrir.totalMs
      };
    }

    var membersResult = atividadesV2_listarMembrosChamadaViaCore_(activity.DATA_ATIVIDADE, ctx);
    if (!membersResult.ok) return membersResult;
    var applicableMembers = atividadesV2_indexApplicableMembersByRga_(membersResult.data);
    portalPerfMark_(perf, 'revalidar_membros_core', { total: membersResult.data.length });

    var registros = atividadesV2_normalizeChamadaSavePayload_(data, activity, applicableMembers);
    portalPerfMark_(perf, 'validar_payload', { total: registros.length });

    if (operacao === ATIVIDADES_V2_CHAMADA_OPERACOES.FINALIZAR) {
      var convitesFinalizacao = atividadesV2_readChamadaConvites_(ss, wantedId);
      atividadesV2_validateChamadaCompletaParaFinalizar_(membersResult.data, convitesFinalizacao, registros);
      portalPerfMark_(perf, 'validar_chamada_completa', { total: registros.length });
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
        updates: writeResult.updates
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
        modo: 'DEV'
      },
      escrita: {
        inserts: writeResult.inserts,
        updates: writeResult.updates
      },
      tempoTotalMs: perfResult.totalMs
    };
  } catch (err) {
    var perfError = portalPerfEnd_(perf);
    var errorCode = err && err.errorCode ? err.errorCode : 'ERRO_SALVAR_CHAMADA';
    return atividadesV2_chamadaError_(
      errorCode,
      atividadesV2_chamadaPublicErrorMessage_(errorCode),
      err,
      perfError ? perfError.totalMs : ''
    );
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

function atividadesV2_getChamadaActivity_(ss, idAtividade) {
  var sheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES);
  var records = atividadesV2_readSheetObjects_(sheet);
  for (var i = 0; i < records.length; i++) {
    if (String(records[i].ID_ATIVIDADE || '').trim() === idAtividade) return records[i];
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

function atividadesV2_listarMembrosChamadaViaCore_(dataAtividade, contexto) {
  var isoDate = atividades_formatPortalDateIso_(dataAtividade);
  if (!isoDate) {
    return atividadesV2_chamadaError_('ATIVIDADE_NAO_PERMITE_CHAMADA', 'Atividade sem data valida para chamada.');
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

  return {
    ok: true,
    data: result.data || [],
    meta: result.meta || {}
  };
}

function atividadesV2_readChamadaExistingRecords_(ss, idAtividade) {
  var sheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.PRESENCAS_REGISTROS);
  return atividadesV2_readSheetObjects_(sheet).filter(function(record) {
    return String(record.ID_ATIVIDADE || '').trim() === idAtividade &&
      atividades_normalizeTextUpper_(record.ATIVO || 'SIM') !== 'NAO';
  });
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

function atividadesV2_readChamadaConvites_(ss, idAtividade) {
  var sheet = ss.getSheetByName(ATIVIDADES_V2_SHEETS.CONVITES);
  if (!sheet) return [];
  return atividadesV2_readSheetObjects_(sheet).filter(function(record) {
    return String(record.ID_ATIVIDADE || '').trim() === idAtividade &&
      atividades_normalizeTextUpper_(record.ATIVO || 'SIM') !== 'NAO';
  });
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

function atividadesV2_getChamadaStatus_(ss, idAtividade) {
  var map = atividadesV2_getChamadaStatusMap_(ss, [idAtividade]);
  return map[idAtividade] || atividadesV2_buildChamadaStatusPayload_('RASCUNHO', '', '', {});
}

function atividadesV2_getChamadaStatusMap_(ss, idsAtividades) {
  var ids = {};
  (idsAtividades || []).forEach(function guardarId(idAtividade) {
    var id = String(idAtividade || '').trim();
    if (id) ids[id] = true;
  });

  var sheet = ss && ss.getSheetByName(ATIVIDADES_V2_SHEETS.PORTAL_ACOES);
  if (!sheet || sheet.getLastRow() < 2) return {};

  atividadesV2_applyHeadersIfMissing_(sheet, ATIVIDADES_V2_SCHEMA.PORTAL_ACOES);
  var records = atividadesV2_readSheetObjects_(sheet);
  var latest = {};

  records.forEach(function avaliarAcao(record) {
    var idAtividade = String(record.ID_ATIVIDADE || '').trim();
    if (!idAtividade || (Object.keys(ids).length && !ids[idAtividade])) return;

    var tipo = atividades_normalizeTextUpper_(record.TIPO_ACAO);
    if (['CHAMADA_SALVA', 'CHAMADA_FINALIZADA', 'CHAMADA_REABERTA'].indexOf(tipo) === -1) return;
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
  var totalEsperado = 0;
  (members || []).forEach(function contarMembro(member) {
    if (member && member.aplicavelNaData !== false) totalEsperado++;
  });
  (convites || []).forEach(function contarConvite(convite) {
    var tipo = String(convite.TIPO_VINCULO_PESSOA || convite.TIPO_PARTICIPANTE || 'CONVIDADO').trim().toUpperCase();
    if (tipo !== 'MEMBRO') totalEsperado++;
  });

  if ((registros || []).length < totalEsperado) {
    throw atividadesV2_chamadaException_(
      'CHAMADA_INCOMPLETA',
      'Marque todos os participantes antes de finalizar a chamada.'
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

function atividadesV2_normalizeChamadaSavePayload_(payload, activity, applicableMembers) {
  var out = [];
  var identity = atividadesV2_resolveActivityIdentity_(activity);
  var registros = Array.isArray(payload.registros) ? payload.registros : [];
  var externos = Array.isArray(payload.externos) ? payload.externos : [];
  var now = new Date();
  var user = Session.getActiveUser && Session.getActiveUser() ? Session.getActiveUser().getEmail() : '';

  registros.forEach(function(item) {
    var pessoa = atividadesV2_resolverPessoa_(item);
    var pessoaKey = atividadesV2_sanitizeIdToken_(pessoa.idPessoa);
    var rgaKey = atividadesV2_sanitizeIdToken_(item.rga);
    var member = pessoaKey ? applicableMembers['PESSOA:' + pessoaKey] : null;
    if (!member && rgaKey) member = applicableMembers['RGA:' + rgaKey];
    if (!member || member.aplicavelNaData === false) {
      throw atividadesV2_chamadaException_('MEMBRO_NAO_APLICAVEL_NA_DATA', 'Membro nao aplicavel na data da atividade.');
    }
    var pessoaFinal = pessoa.idPessoa ? pessoa : atividadesV2_resolverPessoa_(member);
    out.push(atividadesV2_buildChamadaPresenceRow_(activity, identity, item, {
      tipoParticipante: 'MEMBRO',
      idPessoa: pessoaFinal.idPessoa,
      idReferencia: pessoaFinal.idPessoa || item.rga,
      nome: item.nome || member.nomeExibicao,
      rga: item.rga || member.rga,
      vinculo: member.vinculo || 'Membro',
      contaPresenca: member.contaPresenca !== false && atividades_isTruthySim_(activity.CONTA_PRESENCA),
      contaFalta: member.contaFalta !== false && atividades_isTruthySim_(activity.CONTA_FALTA),
      now: now,
      user: user
    }));
  });

  externos.forEach(function(item, index) {
    var pessoaExterna = atividadesV2_resolverPessoa_(item);
    out.push(atividadesV2_buildChamadaPresenceRow_(activity, identity, item, {
      tipoParticipante: item.tipoParticipante || 'EXTERNO',
      idPessoa: pessoaExterna.idPessoa,
      idReferencia: pessoaExterna.idPessoa || item.email || item.nome || ('EXT-' + (index + 1)),
      nome: item.nome,
      email: item.email,
      vinculo: item.instituicao || '',
      contaPresenca: atividades_isTruthySim_(activity.CONTA_PRESENCA),
      contaFalta: false,
      now: now,
      user: user
    }));
  });

  return out;
}

function atividadesV2_buildChamadaPresenceRow_(activity, identity, input, opts) {
  var normalizedStatus = atividadesV2_normalizeChamadaStatus_(input.statusPresenca);
  var code = atividadesV2_normalizeChamadaCode_(input.codigoPresenca, normalizedStatus);
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
    OBSERVACOES: atividades_sanitizePortalText_(input.observacoes, 300),
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
  existingValues.forEach(function(row, index) {
    var key = String(row[keyCol - 1] || '').trim();
    if (key && !byKey[key]) byKey[key] = index;
  });

  var inserts = 0;
  var updates = 0;
  objects.forEach(function(obj) {
    var key = String(obj[keyHeader] || '').trim();
    if (!key) return;
    var rowIndex = byKey[key];
    if (rowIndex === undefined) {
      existingValues.push(headers.map(function(header) {
        return Object.prototype.hasOwnProperty.call(obj, header) ? obj[header] : '';
      }));
      byKey[key] = existingValues.length - 1;
      inserts++;
      return;
    }

    headers.forEach(function(header, colIndex) {
      if (Object.prototype.hasOwnProperty.call(obj, header)) {
        existingValues[rowIndex][colIndex] = obj[header];
      }
    });
    updates++;
  });

  if (existingValues.length) {
    sheet.getRange(2, 1, existingValues.length, headers.length).setValues(existingValues);
  }

  return {
    ok: true,
    inserts: inserts,
    updates: updates,
    totalRows: objects.length
  };
}

function atividadesV2_normalizeChamadaStatus_(status) {
  var normalized = atividades_normalizeTextUpper_(status);
  if (!ATIVIDADES_V2_CHAMADA_STATUS[normalized]) {
    throw atividadesV2_chamadaException_('STATUS_PRESENCA_INVALIDO', 'Status de presenca invalido.');
  }
  return normalized;
}

function atividadesV2_normalizeChamadaCode_(code, status) {
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
