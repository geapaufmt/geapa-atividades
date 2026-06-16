/**
 * Rotinas manuais de atualizacao e conferencia das views PORTAL_* da base
 * ATIVIDADES v2 DEV.
 *
 * Nenhuma funcao aqui altera producao, cria triggers ou escreve em bases V1.
 */

function atividadesV2_diagnostico_() {
  var ss = atividadesV2_getDatabaseSpreadsheetDev_();
  var result = {
    ok: true,
    modo: 'DEV',
    spreadsheetId: ss.getId(),
    url: ss.getUrl(),
    sheets: {},
    consistencia: null,
    avisos: [],
    erros: []
  };

  ATIVIDADES_V2_SHEET_ORDER.forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      result.ok = false;
      result.erros.push('Aba ausente: ' + sheetName);
      result.sheets[sheetName] = { exists: false };
      return;
    }

    var expected = ATIVIDADES_V2_SCHEMA_BY_SHEET[sheetName] || [];
    var headers = atividadesV2_getSheetHeaders_(sheet);
    var missing = expected.filter(function(header) {
      return headers.indexOf(header) === -1;
    });
    if (missing.length) {
      result.ok = false;
      result.erros.push(sheetName + ': cabecalhos ausentes: ' + missing.join(', '));
    }
    result.sheets[sheetName] = {
      exists: true,
      dataRows: Math.max(sheet.getLastRow() - 1, 0),
      lastColumn: sheet.getLastColumn(),
      missingHeaders: missing
    };
  });

  result.consistencia = atividadesV2_conferirConsistencia_({ includeSamples: true });
  if (!result.consistencia.ok) result.ok = false;
  return result;
}

function atividadesV2_conferirConsistencia_(options) {
  var opts = options || {};
  var ss = atividadesV2_getDatabaseSpreadsheetDev_();
  var data = atividadesV2_readPortalViewsSourceData_(ss);
  var issues = [];
  var now = new Date();
  var includeSamples = opts.includeSamples !== false;
  var pendenciasAtuais = atividadesV2_indexByField_(data.portalPendencias, 'ID_PENDENCIA');
  var atividadesById = atividadesV2_indexByField_(data.atividades, 'ID_ATIVIDADE');
  var apresentacoesPorAtividade = atividadesV2_indexApresentacoesPorAtividade_(data.apresentacoes);
  var envolvidosDuplicateIndex = {};

  data.atividades.forEach(function(record) {
    var id = String(record.ID_ATIVIDADE || '').trim();
    var published = atividadesV2_isPublicadaPortal_(record);
    if (!id) atividadesV2_addConsistencyIssue_(issues, 'ERRO', 'ATIVIDADE_SEM_ID', 'Atividade sem ID_ATIVIDADE.', record);
    else if (!atividadesV2_isCanonicalActivityId_(id)) atividadesV2_addConsistencyIssue_(issues, 'ERRO', 'ID_ATIVIDADE_INVALIDO', 'ID_ATIVIDADE fora do padrao ATV-AAAA-S-NNNN.', record);
    if (!record.DATA_ATIVIDADE) atividadesV2_addConsistencyIssue_(issues, 'ERRO', 'ATIVIDADE_SEM_DATA', 'Atividade sem DATA_ATIVIDADE.', record);
    if (published && !String(record.TITULO_PUBLICO || record.TITULO || '').trim()) atividadesV2_addConsistencyIssue_(issues, 'AVISO', 'PUBLICADA_SEM_TITULO_PUBLICO', 'Atividade publicada sem titulo publico.', record);
    if (published && !String(record.VISIBILIDADE_PORTAL || '').trim()) atividadesV2_addConsistencyIssue_(issues, 'AVISO', 'PUBLICADA_SEM_VISIBILIDADE', 'Atividade publicada sem visibilidade.', record);
    if (atividades_isTruthySim_(record.GERA_CERTIFICADO) && !String(record.CARGA_HORARIA || '').trim()) atividadesV2_addConsistencyIssue_(issues, 'AVISO', 'CERTIFICADO_SEM_CARGA_HORARIA', 'Atividade gera certificado sem carga horaria.', record);
    if (atividades_isTruthySim_(record.CONTA_FALTA) && !atividades_isTruthySim_(record.CONTA_PRESENCA) && !atividades_isTruthySim_(record.EXIGE_LISTA_PRESENCA)) {
      atividadesV2_addConsistencyIssue_(issues, 'AVISO', 'FALTA_SEM_CONFIG_PRESENCA', 'Atividade conta falta sem configuracao clara de presenca.', record);
    }
    if (atividadesV2_isAtividadeAcademicaOuFormativa_(record) && !String(record.EIXO_TEMATICO_PRINCIPAL || '').trim()) {
      atividadesV2_addConsistencyIssue_(issues, 'AVISO', 'ATIVIDADE_ACADEMICA_SEM_EIXO', 'Atividade academica/formativa sem eixo tematico principal.', record);
    }
    if (String(record.ID_PESSOA_PRINCIPAL || record.NOME_PESSOA_PRINCIPAL_PUBLICO || record.RGA_PESSOA_PRINCIPAL || '').trim() && !String(record.PAPEL_PESSOA_PRINCIPAL || '').trim()) {
      atividadesV2_addConsistencyIssue_(issues, 'AVISO', 'PESSOA_PRINCIPAL_SEM_PAPEL', 'Atividade com pessoa principal sem papel definido.', record);
    }
    if (atividadesV2_isFluxoApresentacao_(record)) {
      if (!String(record.EIXO_TEMATICO_PRINCIPAL || '').trim()) atividadesV2_addConsistencyIssue_(issues, 'AVISO', 'APRESENTACAO_SEM_EIXO', 'Apresentacao de membro sem eixo tematico principal em Atividades.', record);
      if (!String(record.ID_PESSOA_PRINCIPAL || record.NOME_PESSOA_PRINCIPAL_PUBLICO || record.RGA_PESSOA_PRINCIPAL || '').trim()) atividadesV2_addConsistencyIssue_(issues, 'AVISO', 'APRESENTACAO_SEM_PESSOA_PRINCIPAL', 'Apresentacao de membro sem pessoa principal em Atividades.', record);
      if (!String(record.TITULO_PUBLICO || record.TITULO || '').trim()) atividadesV2_addConsistencyIssue_(issues, 'AVISO', 'APRESENTACAO_SEM_TITULO_PUBLICO', 'Apresentacao de membro sem titulo publico em Atividades.', record);
      if (!apresentacoesPorAtividade[id] || !apresentacoesPorAtividade[id].length) {
        atividadesV2_addConsistencyIssue_(issues, 'AVISO', 'FLUXO_APRESENTACAO_SEM_EXTENSAO', 'Atividade com fluxo de apresentacao sem linha correspondente em Atividades_Apresentacoes.', record);
      }
    }
  });

  var presencasById = atividadesV2_indexByField_(data.presencas, 'ID_REGISTRO_PRESENCA');

  data.presencas.forEach(function(record) {
    var idAtividade = String(record.ID_ATIVIDADE || '').trim();
    if (idAtividade && !atividadesById[idAtividade]) atividadesV2_addConsistencyIssue_(issues, 'ERRO', 'PRESENCA_ATIVIDADE_INEXISTENTE', 'Presenca vinculada a atividade inexistente.', record);
    if (atividades_normalizeTextUpper_(record.TIPO_PARTICIPANTE) === 'MEMBRO' && !String(record.ID_PESSOA || record.RGA || '').trim()) {
      atividadesV2_addConsistencyIssue_(issues, 'AVISO', 'PRESENCA_MEMBRO_SEM_IDENTIFICADOR', 'Presenca de membro sem ID_PESSOA/RGA para validar aplicabilidade.', record);
    }
    if (atividades_normalizeTextUpper_(record.TIPO_PARTICIPANTE || 'MEMBRO') === 'MEMBRO') {
      var activity = atividadesById[idAtividade] || {};
      var applicability = atividadesV2_checkPresenceMemberApplicability_(record, record.DATA_ATIVIDADE || activity.DATA_ATIVIDADE);
      if (applicability === false) {
        atividadesV2_addConsistencyIssue_(issues, 'AVISO', 'PRESENCA_MEMBRO_NAO_APLICAVEL_DATA', 'Presenca de membro nao aplicavel na data da atividade.', record);
      }
    }
  });

  data.apresentacoes.forEach(function(record) {
    var idAtividade = String(record.ID_ATIVIDADE || '').trim();
    var atividade = atividadesById[idAtividade] || {};
    if (!idAtividade || !atividadesV2_isCanonicalActivityId_(idAtividade)) atividadesV2_addConsistencyIssue_(issues, 'ERRO', 'APRESENTACAO_ID_ATIVIDADE_INVALIDO', 'Linha de apresentacao sem ID_ATIVIDADE valido.', record);
    else if (!atividade.ID_ATIVIDADE) atividadesV2_addConsistencyIssue_(issues, 'ERRO', 'APRESENTACAO_SEM_ATIVIDADE', 'Apresentacao sem atividade vinculada.', record);
    if (!String(atividade.ID_PESSOA_PRINCIPAL || atividade.RGA_PESSOA_PRINCIPAL || atividade.NOME_PESSOA_PRINCIPAL_PUBLICO || record.ID_PESSOA || record.RGA || record.NOME_MEMBRO || '').trim()) {
      atividadesV2_addConsistencyIssue_(issues, 'AVISO', 'APRESENTACAO_SEM_APRESENTADOR', 'Apresentacao sem apresentador em Atividades nem legado.', record);
    }
  });

  data.envolvidos.forEach(function(record) {
    var idAtividade = String(record.ID_ATIVIDADE || '').trim();
    if (idAtividade && !atividadesById[idAtividade]) atividadesV2_addConsistencyIssue_(issues, 'ERRO', 'ENVOLVIDO_ATIVIDADE_INEXISTENTE', 'Envolvido vinculado a atividade inexistente.', record);
    var key = [
      idAtividade,
      atividadesV2_sanitizeIdToken_(record.PAPEL_NA_ATIVIDADE || ''),
      atividadesV2_sanitizeIdToken_(record.ID_PESSOA || record.RGA || record.EMAIL || record.NOME_PUBLICO || '')
    ].join('|');
    if (!key.replace(/\|/g, '')) return;
    if (envolvidosDuplicateIndex[key]) {
      atividadesV2_addConsistencyIssue_(issues, 'AVISO', 'ENVOLVIDO_DUPLICADO', 'Atividade com envolvido duplicado por papel e identificador.', record);
    }
    envolvidosDuplicateIndex[key] = true;
  });

  data.justificativas.forEach(function(record) {
    var idAtividade = String(record.ID_ATIVIDADE || '').trim();
    var idPresenca = String(record.ID_REGISTRO_PRESENCA || '').trim();
    if (!idAtividade || !atividadesById[idAtividade]) atividadesV2_addConsistencyIssue_(issues, 'ERRO', 'JUSTIFICATIVA_SEM_ATIVIDADE', 'Justificativa sem atividade correspondente.', record);
    if (idPresenca && !presencasById[idPresenca]) atividadesV2_addConsistencyIssue_(issues, 'AVISO', 'JUSTIFICATIVA_SEM_PRESENCA', 'Justificativa sem presenca correspondente.', record);
  });

  atividadesV2_buildPendenciasDiretoriaRows_(data, now).forEach(function(pendencia) {
    if (!pendenciasAtuais[pendencia.ID_PENDENCIA]) {
      issues.push({
        severity: 'AVISO',
        code: 'PENDENCIA_NAO_REFLETIDA_NO_PORTAL',
        message: 'Pendencia vencida nao refletida em PORTAL_PENDENCIAS_DIRETORIA.',
        entityId: pendencia.ID_ATIVIDADE,
        entityType: 'PENDENCIA',
        sheetName: ATIVIDADES_V2_SHEETS.PORTAL_PENDENCIAS_DIRETORIA,
        details: includeSamples ? pendencia : {}
      });
    }
  });

  return {
    ok: issues.filter(function(issue) { return issue.severity === 'ERRO'; }).length === 0,
    modo: 'DEV',
    totalIssues: issues.length,
    erros: issues.filter(function(issue) { return issue.severity === 'ERRO'; }).length,
    avisos: issues.filter(function(issue) { return issue.severity !== 'ERRO'; }).length,
    issues: issues
  };
}

function atividadesV2_atualizarPortalCalendario_(options) {
  return atividadesV2_updatePortalViewWithLock_('PORTAL_ATIVIDADES_CALENDARIO', options, function(ss, opts) {
    var atividades = atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES));
    var apresentacoes = atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.APRESENTACOES));
    var apresentacoesPorAtividade = atividadesV2_indexApresentacoesPorAtividade_(apresentacoes);
    var syncDate = new Date();
    var avisos = [];
    var ignored = 0;
    var rows = [];
    atividades.forEach(function(record) {
      var decision = atividadesV2_shouldPublishPortalCalendarActivity_(record, syncDate);
      if (!decision.publish) {
        ignored++;
        if (decision.warning) avisos.push(decision.warning);
        return;
      }
      rows.push(atividadesV2_buildPortalCalendarRow_(record, syncDate, atividadesV2_pickApresentacaoPrincipal_(apresentacoesPorAtividade[String(record.ID_ATIVIDADE || '').trim()])));
    });
    return atividadesV2_finishPortalViewUpdate_(ss, opts, ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_CALENDARIO, ATIVIDADES_V2_SCHEMA.PORTAL_ATIVIDADES_CALENDARIO, rows, {
      totalLidas: atividades.length,
      totalPublicadas: rows.length,
      totalIgnoradas: ignored,
      avisos: avisos
    });
  });
}

function atividadesV2_atualizarPortalDetalhes_(options) {
  return atividadesV2_updatePortalViewWithLock_('PORTAL_ATIVIDADES_DETALHES', options, function(ss, opts) {
    var atividades = atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES));
    var apresentacoes = atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.APRESENTACOES));
    var envolvidos = atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ENVOLVIDOS));
    var apresentacoesPorAtividade = atividadesV2_indexApresentacoesPorAtividade_(apresentacoes);
    var envolvidosPorAtividade = atividadesV2_indexEnvolvidosPorAtividade_(envolvidos);
    var rows = [];
    var syncDate = new Date();
    var vinculadas = 0;
    var semVinculo = 0;
    atividades.forEach(function(atividade) {
      if (atividades_normalizeTextUpper_(atividade.ATIVO) === 'NAO') return;
      var idAtividade = String(atividade.ID_ATIVIDADE || '').trim();
      if (!atividadesV2_isCanonicalActivityId_(idAtividade)) return;
      var list = apresentacoesPorAtividade[idAtividade] || [];
      if (!list.length) {
        if (atividadesV2_isFluxoApresentacao_(atividade)) semVinculo++;
        rows.push(atividadesV2_buildPortalDetalheRow_(atividade, null, syncDate, envolvidosPorAtividade[idAtividade] || []));
        return;
      }
      list.forEach(function(apresentacao) {
        vinculadas++;
        rows.push(atividadesV2_buildPortalDetalheRow_(atividade, apresentacao, syncDate, envolvidosPorAtividade[idAtividade] || []));
      });
    });
    return atividadesV2_finishPortalViewUpdate_(ss, opts, ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_DETALHES, ATIVIDADES_V2_SCHEMA.PORTAL_ATIVIDADES_DETALHES, rows, {
      totalAtividadesLidas: atividades.length,
      totalApresentacoesLidas: apresentacoes.length,
      totalDetalhesGerados: rows.length,
      totalApresentacoesVinculadas: vinculadas,
      atividadesSemApresentacaoVinculada: semVinculo
    });
  });
}

function atividadesV2_atualizarPortalApresentacoes_(options) {
  return atividadesV2_updatePortalViewWithLock_('PORTAL_APRESENTACOES', options, function(ss, opts) {
    var atividades = atividadesV2_indexByField_(atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES)), 'ID_ATIVIDADE');
    var apresentacoes = atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.APRESENTACOES));
    var now = new Date();
    var rows = apresentacoes.filter(function(record) {
      if (atividades_normalizeTextUpper_(record.ATIVO) === 'NAO') return false;
      var activity = atividades[String(record.ID_ATIVIDADE || '').trim()] || {};
      return atividades_normalizeTextUpper_(record.PUBLICAR_NO_PORTAL || 'SIM') !== 'NAO' &&
        atividades_normalizeTextUpper_(activity.ATIVO || 'SIM') !== 'NAO';
    }).map(function(record) {
      var activity = atividades[String(record.ID_ATIVIDADE || '').trim()] || {};
      return {
        ID_APRESENTACAO: record.ID_APRESENTACAO || '',
        ID_ATIVIDADE: record.ID_ATIVIDADE || '',
        DATA_ATIVIDADE: activity.DATA_ATIVIDADE || record.DATA_ATIVIDADE || '',
        HORARIO_INICIO: activity.HORARIO_INICIO || record.HORARIO_INICIO || '',
        HORARIO_FIM: activity.HORARIO_FIM || record.HORARIO_FIM || '',
        NOME_MEMBRO_PUBLICO: atividades_sanitizePortalText_(activity.NOME_PESSOA_PRINCIPAL_PUBLICO || record.NOME_MEMBRO, 180),
        ID_PESSOA: activity.ID_PESSOA_PRINCIPAL || record.ID_PESSOA || '',
        RGA: activity.RGA_PESSOA_PRINCIPAL || record.RGA || '',
        TITULO_APRESENTACAO: atividades_sanitizePortalText_(atividadesV2_getTituloConteudoPublico_(activity, record), 240),
        EIXO_TEMATICO_PRINCIPAL: activity.EIXO_TEMATICO_PRINCIPAL || record.EIXO_TEMATICO_PRINCIPAL || '',
        EIXO_TEMATICO_SECUNDARIO: activity.EIXO_TEMATICO_SECUNDARIO || record.EIXO_TEMATICO_SECUNDARIO || '',
        STATUS_PUBLICO: record.STATUS_APRESENTACAO || activity.STATUS_PUBLICACAO_PORTAL || '',
        STATUS_ARQUIVO_PUBLICO: record.STATUS_ENVIO_ARQUIVO || '',
        LINK_ARQUIVO_PUBLICO: atividades_sanitizePortalUrl_(record.LINK_ARQUIVO_DRIVE),
        LINK_PAGINA_APRESENTACAO: '',
        SYNC_HISTORICO_PUBLICO: record.SYNC_HISTORICO_PUBLICO || '',
        ULTIMA_ATUALIZACAO: record.ATUALIZADO_EM || now
      };
    });
    return atividadesV2_finishPortalViewUpdate_(ss, opts, ATIVIDADES_V2_SHEETS.PORTAL_APRESENTACOES, ATIVIDADES_V2_SCHEMA.PORTAL_APRESENTACOES, rows, {
      totalApresentacoesLidas: apresentacoes.length,
      totalApresentacoesPublicadas: rows.length
    });
  });
}

function atividadesV2_recalcularFrequenciaMembros_(options) {
  return atividadesV2_updatePortalViewWithLock_('PORTAL_FREQUENCIA_MEMBROS', options, function(ss, opts) {
    var presencas = atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.PRESENCAS_REGISTROS));
    var grouped = {};
    presencas.forEach(function(record) {
      if (atividades_normalizeTextUpper_(record.ATIVO) === 'NAO') return;
      if (atividades_normalizeTextUpper_(record.TIPO_PARTICIPANTE || 'MEMBRO') !== 'MEMBRO') return;
      var idPessoa = String(record.ID_PESSOA || '').trim();
      var rga = String(record.RGA || record.ID_REFERENCIA || '').trim();
      var ciclo = String(record.CICLO || '').trim();
      var key = [idPessoa || rga, ciclo].join('|');
      if (!grouped[key]) grouped[key] = atividadesV2_newFrequencyBucket_(record, ciclo);
      atividadesV2_accumulateFrequencyBucket_(grouped[key], record);
    });
    var now = new Date();
    var rows = Object.keys(grouped).map(function(key) {
      return atividadesV2_buildFrequencyPortalRow_(grouped[key], now);
    });
    return atividadesV2_finishPortalViewUpdate_(ss, opts, ATIVIDADES_V2_SHEETS.PORTAL_FREQUENCIA_MEMBROS, ATIVIDADES_V2_SCHEMA.PORTAL_FREQUENCIA_MEMBROS, rows, {
      totalPresencasLidas: presencas.length,
      totalMembrosCiclo: rows.length
    });
  });
}

function atividadesV2_atualizarPortalJustificativas_(options) {
  return atividadesV2_updatePortalViewWithLock_('PORTAL_JUSTIFICATIVAS', options, function(ss, opts) {
    var justificativas = atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.JUSTIFICATIVAS));
    var now = new Date();
    var rows = justificativas.filter(function(record) {
      return atividades_normalizeTextUpper_(record.ATIVO || 'SIM') !== 'NAO';
    }).map(function(record) {
      return {
        ID_JUSTIFICATIVA: record.ID_JUSTIFICATIVA || '',
        ID_PESSOA: record.ID_PESSOA || '',
        RGA: record.RGA || '',
        NOME_MEMBRO: atividades_sanitizePortalText_(record.NOME_MEMBRO, 180),
        ID_ATIVIDADE: record.ID_ATIVIDADE || '',
        DATA_ATIVIDADE: record.DATA_ATIVIDADE || '',
        TITULO_ATIVIDADE: atividades_sanitizePortalText_(record.TITULO_ATIVIDADE, 240),
        MOTIVO_DECLARADO: atividades_sanitizePortalText_(record.MOTIVO_DECLARADO, 180),
        DATA_ENVIO: record.DATA_ENVIO || '',
        STATUS_ANALISE: record.STATUS_ANALISE || '',
        DECISAO_APLICADA: record.DECISAO_APLICADA_NA_PRESENCA || '',
        OBSERVACAO_PUBLICA: atividades_sanitizePortalText_(record.OBSERVACAO_PUBLICA, 500),
        ULTIMA_ATUALIZACAO: record.ATUALIZADO_EM || now
      };
    });
    return atividadesV2_finishPortalViewUpdate_(ss, opts, ATIVIDADES_V2_SHEETS.PORTAL_JUSTIFICATIVAS, ATIVIDADES_V2_SCHEMA.PORTAL_JUSTIFICATIVAS, rows, {
      totalJustificativasLidas: justificativas.length,
      totalJustificativasPublicadas: rows.length
    });
  });
}

function atividadesV2_atualizarPendenciasDiretoria_(options) {
  return atividadesV2_updatePortalViewWithLock_('PORTAL_PENDENCIAS_DIRETORIA', options, function(ss, opts) {
    var data = atividadesV2_readPortalViewsSourceData_(ss);
    var rows = atividadesV2_buildPendenciasDiretoriaRows_(data, new Date());
    return atividadesV2_finishPortalViewUpdate_(ss, opts, ATIVIDADES_V2_SHEETS.PORTAL_PENDENCIAS_DIRETORIA, ATIVIDADES_V2_SCHEMA.PORTAL_PENDENCIAS_DIRETORIA, rows, {
      totalPendencias: rows.length
    });
  });
}

function atividadesV2_atualizarPortalStatus_(options) {
  return atividadesV2_updatePortalViewWithLock_('PORTAL_STATUS_ATIVIDADES', options, function(ss, opts) {
    var data = atividadesV2_readPortalViewsSourceData_(ss);
    var pendencias = atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.PORTAL_PENDENCIAS_DIRETORIA));
    var now = new Date();
    var rows = [{
      ID_STATUS: 'STATUS-GERAL',
      DATA_HORA_ATUALIZACAO: now,
      TOTAL_ATIVIDADES: data.atividades.length,
      TOTAL_ATIVIDADES_PUBLICADAS: data.atividades.filter(atividadesV2_isPublicadaPortal_).length,
      TOTAL_ATIVIDADES_PLANEJADAS: data.atividades.filter(function(r) { return atividades_normalizeTextUpper_(r.STATUS_OPERACIONAL) === 'PLANEJADA'; }).length,
      TOTAL_ATIVIDADES_REALIZADAS: data.atividades.filter(function(r) { return atividades_normalizeTextUpper_(r.STATUS_OPERACIONAL) === 'REALIZADA'; }).length,
      TOTAL_APRESENTACOES: data.apresentacoes.length,
      TOTAL_PRESENCAS_REGISTRADAS: data.presencas.length,
      TOTAL_JUSTIFICATIVAS_PENDENTES: data.justificativas.filter(function(r) { return ['PENDENTE', 'EM_ANALISE'].indexOf(atividades_normalizeTextUpper_(r.STATUS_ANALISE)) >= 0; }).length,
      TOTAL_PENDENCIAS_DIRETORIA: pendencias.length,
      ULTIMO_PROCESSAMENTO: now,
      ULTIMO_ERRO: '',
      STATUS_GERAL: 'OK',
      OBSERVACOES: 'Atualizado por rotina manual v2 DEV.'
    }];
    return atividadesV2_finishPortalViewUpdate_(ss, opts, ATIVIDADES_V2_SHEETS.PORTAL_STATUS_ATIVIDADES, ATIVIDADES_V2_SCHEMA.PORTAL_STATUS_ATIVIDADES, rows, {
      totalStatus: rows.length
    });
  });
}

function atividadesV2_atualizarViewsPortal_(options) {
  var opts = options || {};
  var result = {
    ok: true,
    dryRun: opts.dryRun === true,
    steps: {},
    erros: [],
    avisos: []
  };
  [
    ['calendario', atividadesV2_atualizarPortalCalendario_],
    ['detalhes', atividadesV2_atualizarPortalDetalhes_],
    ['apresentacoes', atividadesV2_atualizarPortalApresentacoes_],
    ['frequencia', atividadesV2_recalcularFrequenciaMembros_],
    ['justificativas', atividadesV2_atualizarPortalJustificativas_],
    ['pendencias', atividadesV2_atualizarPendenciasDiretoria_],
    ['status', atividadesV2_atualizarPortalStatus_]
  ].forEach(function(step) {
    if (!result.ok && opts.stopOnError !== false) return;
    var item = step[1](opts);
    result.steps[step[0]] = item;
    if (!item.ok) {
      result.ok = false;
      result.erros.push(step[0] + ': ' + (item.message || item.errorCode || 'erro'));
    }
    result.avisos = result.avisos.concat(item.avisos || []);
  });
  return result;
}

function atividadesV2_runTesteAtualizacaoPortalDev_() {
  var dryRun = atividadesV2_atualizarViewsPortal_({ dryRun: true });
  var consistencia = atividadesV2_conferirConsistencia_({ includeSamples: false });
  return {
    ok: dryRun.ok && consistencia.ok,
    dryRun: dryRun,
    consistencia: consistencia
  };
}

function atividadesV2_updatePortalViewWithLock_(flow, options, fn) {
  var opts = options || {};
  if (opts.dryRun === true) {
    return fn(atividadesV2_getDatabaseSpreadsheetDev_(), opts);
  }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return { ok: false, dryRun: false, flow: flow, errorCode: 'LOCK_INDISPONIVEL', message: 'Nao foi possivel obter lock para atualizar view v2.' };
  }
  try {
    return fn(atividadesV2_getDatabaseSpreadsheetDev_(), opts);
  } finally {
    lock.releaseLock();
  }
}

function atividadesV2_finishPortalViewUpdate_(ss, opts, sheetName, headers, rows, extra) {
  var dryRun = opts.dryRun === true;
  var sheet = atividadesV2_getTargetSheet_(ss, sheetName);
  atividadesV2_applyHeadersIfMissing_(sheet, headers);
  atividadesV2_applyBasicSheetUx_(sheet);
  var writeResult = null;
  if (!dryRun) {
    writeResult = opts.nonDestructive === true
      ? atividadesV2_upsertPortalRows_(sheet, headers, rows)
      : { mode: 'REPLACE', written: atividadesV2_replacePortalRows_(sheet, headers, rows) };
  }
  var result = Object.assign({
    ok: true,
    dryRun: dryRun,
    modo: 'DEV',
    destino: sheetName,
    totalLinhasGeradas: rows.length,
    totalLinhasEscritas: dryRun ? 0 : rows.length,
    modoEscrita: dryRun ? 'DRY_RUN' : (writeResult && writeResult.mode || 'REPLACE'),
    escrita: writeResult,
    preview: rows.slice(0, 5),
    avisos: [],
    erros: []
  }, extra || {});
  if (!dryRun) {
    atividadesV2_appendV2Log_(ss, {
      FLUXO: 'ATUALIZACAO_PORTAL_V2',
      ACAO: 'Atualizar view ' + sheetName,
      NIVEL: 'INFO',
      STATUS: 'OK',
      MENSAGEM: 'View v2 atualizada em DEV.',
      DETALHES_JSON: atividadesV2_safeLogData_({ sheetName: sheetName, rows: rows.length })
    });
  }
  return result;
}

function atividadesV2_upsertPortalRows_(sheet, headers, records) {
  var existing = atividadesV2_readSheetObjects_(sheet);
  var existingByKey = {};
  existing.forEach(function(record) {
    var key = atividadesV2_buildPortalViewUpsertKey_(record, headers);
    if (key && !existingByKey[key]) existingByKey[key] = record;
  });

  var updated = 0;
  var appended = 0;
  (records || []).forEach(function(record) {
    var key = atividadesV2_buildPortalViewUpsertKey_(record, headers);
    var current = key ? existingByKey[key] : null;
    if (current && current._rowNumber) {
      var merged = Object.assign({}, current, record);
      sheet.getRange(current._rowNumber, 1, 1, headers.length).setValues([headers.map(function(header) {
        return Object.prototype.hasOwnProperty.call(merged, header) ? merged[header] : '';
      })]);
      updated++;
      return;
    }
    sheet.appendRow(headers.map(function(header) {
      return Object.prototype.hasOwnProperty.call(record, header) ? record[header] : '';
    }));
    appended++;
  });

  return {
    mode: 'UPSERT',
    updated: updated,
    appended: appended,
    written: updated + appended,
    preservedExistingRows: Math.max(existing.length - updated, 0)
  };
}

function atividadesV2_buildPortalViewUpsertKey_(record, headers) {
  var preferred = [
    ['ID_PENDENCIA'],
    ['ID_JUSTIFICATIVA'],
    ['ID_APRESENTACAO'],
    ['ID_STATUS'],
    ['ID_ATIVIDADE', 'ID_APRESENTACAO'],
    ['ID_PESSOA', 'CICLO'],
    ['RGA', 'CICLO'],
    ['ID_ATIVIDADE']
  ];

  for (var i = 0; i < preferred.length; i++) {
    var parts = preferred[i];
    var hasHeaders = parts.every(function(header) { return headers.indexOf(header) >= 0; });
    if (!hasHeaders) continue;
    var values = parts.map(function(header) { return String(record[header] || '').trim(); });
    if (values.some(function(value) { return !!value; })) return parts.join('+') + ':' + values.join('|');
  }

  return '';
}

function atividadesV2_readPortalViewsSourceData_(ss) {
  return {
    atividades: atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES)),
    apresentacoes: atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.APRESENTACOES)),
    envolvidos: atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ENVOLVIDOS)),
    presencas: atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.PRESENCAS_REGISTROS)),
    justificativas: atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.JUSTIFICATIVAS)),
    portalPendencias: ss.getSheetByName(ATIVIDADES_V2_SHEETS.PORTAL_PENDENCIAS_DIRETORIA)
      ? atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.PORTAL_PENDENCIAS_DIRETORIA))
      : []
  };
}

function atividadesV2_isPublicadaPortal_(record) {
  return atividades_normalizeTextUpper_(record.STATUS_PUBLICACAO_PORTAL) === 'PUBLICADA' &&
    atividades_normalizeTextUpper_(record.VISIBILIDADE_PORTAL) !== 'OCULTA' &&
    atividades_normalizeTextUpper_(record.ATIVO || 'SIM') !== 'NAO';
}

function atividadesV2_isAtividadeAcademicaOuFormativa_(record) {
  var subtipo = atividades_normalizeTextUpper_(record && record.SUBTIPO_ATIVIDADE);
  var tipo = atividades_normalizeTextUpper_(record && record.TIPO_ATIVIDADE);
  return [
    'APRESENTACAO_MEMBRO',
    'APRESENTACAO_REPOSICAO',
    'PALESTRA',
    'CURSO',
    'DEBATE',
    'VISITA_TECNICA',
    'OFICINA',
    'SEMINARIO'
  ].indexOf(subtipo) >= 0 || ['ACADEMICA', 'FORMATIVA', 'TECNICA'].indexOf(tipo) >= 0;
}

function atividadesV2_indexByField_(records, field) {
  var out = {};
  (records || []).forEach(function(record) {
    var key = String(record[field] || '').trim();
    if (key && !out[key]) out[key] = record;
  });
  return out;
}

function atividadesV2_addConsistencyIssue_(issues, severity, code, message, record) {
  issues.push({
    severity: severity,
    code: code,
    message: message,
    sheetName: record && record._sheetName || '',
    rowNumber: record && record._rowNumber || '',
    entityId: record && (record.ID_ATIVIDADE || record.ID_APRESENTACAO || record.ID_REGISTRO_PRESENCA || record.ID_JUSTIFICATIVA) || '',
    details: {
      ID_ATIVIDADE: record && record.ID_ATIVIDADE || '',
      ID_PESSOA: record && record.ID_PESSOA || '',
      RGA: record && record.RGA || ''
    }
  });
}

function atividadesV2_newFrequencyBucket_(record, ciclo) {
  return {
    ID_PESSOA: record.ID_PESSOA || '',
    RGA: record.RGA || '',
    NOME_MEMBRO: record.NOME_PARTICIPANTE || '',
    EMAIL: record.EMAIL_PARTICIPANTE || '',
    CICLO: ciclo || record.CICLO || '',
    presencas: 0,
    faltas: 0,
    justificadas: 0,
    abonadas: 0,
    carga: 0
  };
}

function atividadesV2_accumulateFrequencyBucket_(bucket, record) {
  var status = atividades_normalizeTextUpper_(record.STATUS_PRESENCA);
  if (status === 'PRESENTE_PRESENCIAL' || status === 'PRESENTE_REMOTO') bucket.presencas++;
  if (status === 'FALTA') bucket.faltas++;
  if (status === 'JUSTIFICADA') bucket.justificadas++;
  if (status === 'ABONADA') bucket.abonadas++;
  var carga = Number(String(record.CARGA_HORARIA_CONSIDERADA || '').replace(',', '.'));
  if (!isNaN(carga)) bucket.carga += carga;
}

function atividadesV2_buildFrequencyPortalRow_(bucket, now) {
  var total = bucket.presencas + bucket.faltas + bucket.justificadas + bucket.abonadas;
  var faltasLiquidas = Math.max(bucket.faltas - bucket.justificadas - bucket.abonadas, 0);
  var percentual = total ? Math.round((bucket.presencas / total) * 10000) / 100 : '';
  return {
    ID_PESSOA: bucket.ID_PESSOA,
    RGA: bucket.RGA,
    NOME_MEMBRO: atividades_sanitizePortalText_(bucket.NOME_MEMBRO, 180),
    EMAIL: bucket.EMAIL,
    CICLO: bucket.CICLO,
    TOTAL_PRESENCAS: bucket.presencas,
    TOTAL_FALTAS: bucket.faltas,
    TOTAL_JUSTIFICADAS: bucket.justificadas,
    TOTAL_ABONADAS: bucket.abonadas,
    FALTAS_LIQUIDAS: faltasLiquidas,
    LIMITE_FALTAS_PERIODO: '',
    PERCENTUAL_FREQUENCIA: percentual,
    PERCENTUAL_USO_LIMITE: '',
    SITUACAO_DISCIPLINAR: faltasLiquidas > 0 ? 'COM_FALTAS' : 'REGULAR',
    CARGA_HORARIA_TOTAL: bucket.carga,
    ELEGIVEL_CERTIFICADO: faltasLiquidas === 0 ? 'SIM' : 'NAO',
    MOTIVO_INELEGIBILIDADE: faltasLiquidas === 0 ? '' : 'Faltas liquidas registradas.',
    MENSAGEM_PORTAL: '',
    ULTIMA_ATUALIZACAO: now
  };
}

function atividadesV2_buildPendenciasDiretoriaRows_(data, now) {
  var rows = [];
  var atividadesById = atividadesV2_indexByField_(data.atividades, 'ID_ATIVIDADE');
  data.atividades.forEach(function(record) {
    if (atividades_normalizeTextUpper_(record.ATIVO || 'SIM') === 'NAO') return;
    atividadesV2_addDeadlinePendencia_(rows, record, 'ATA', record.DATA_LIMITE_ATA, record.LINK_ATA, now);
    atividadesV2_addDeadlinePendencia_(rows, record, 'MATERIAL', record.DATA_LIMITE_MATERIAL, record.LINK_MATERIAL, now);
    atividadesV2_addDeadlinePendencia_(rows, record, 'JUSTIFICATIVA', record.DATA_LIMITE_JUSTIFICATIVA, '', now);
  });
  data.apresentacoes.forEach(function(record) {
    var atividade = atividadesById[String(record.ID_ATIVIDADE || '').trim()] || {};
    if (!String(record.ID_ATIVIDADE || '').trim()) {
      rows.push(atividadesV2_buildPendenciaRow_('APRESENTACAO_SEM_ATIVIDADE', 'ALTA', record, '', 'Vincular apresentacao a uma atividade v2.', now));
    }
    if (!String(atividade.ID_PESSOA_PRINCIPAL || atividade.RGA_PESSOA_PRINCIPAL || atividade.NOME_PESSOA_PRINCIPAL_PUBLICO || record.ID_PESSOA || record.RGA || record.NOME_MEMBRO || '').trim()) {
      rows.push(atividadesV2_buildPendenciaRow_('APRESENTACAO_SEM_APRESENTADOR', 'ALTA', record, '', 'Informar apresentador da apresentacao.', now));
    }
  });
  return rows.filter(function(row) { return !!row.ID_PENDENCIA; });
}

function atividadesV2_addDeadlinePendencia_(rows, record, tipo, prazo, doneValue, now) {
  var date = atividades_parseDateOrNull_(prazo);
  if (!date || doneValue) return;
  if (date.getTime() >= now.getTime()) return;
  rows.push(atividadesV2_buildPendenciaRow_('PENDENCIA_' + tipo, 'MEDIA', record, prazo, 'Regularizar pendencia de ' + tipo.toLowerCase() + '.', now));
}

function atividadesV2_buildPendenciaRow_(tipo, gravidade, record, prazo, acao, now) {
  var idAtividade = String(record.ID_ATIVIDADE || '').trim();
  var prazoDate = atividades_parseDateOrNull_(prazo);
  var dias = prazoDate ? Math.max(Math.floor((now.getTime() - prazoDate.getTime()) / 86400000), 0) : '';
  return {
    ID_PENDENCIA: atividadesV2_buildDeterministicId_('PEND', [tipo, idAtividade || record.ID_APRESENTACAO || record._rowNumber]),
    TIPO_PENDENCIA: tipo,
    GRAVIDADE: gravidade,
    ID_ATIVIDADE: idAtividade,
    TITULO_ATIVIDADE: atividades_sanitizePortalText_(record.TITULO || record.TITULO_ATIVIDADE || record.TITULO_APRESENTACAO, 240),
    DATA_ATIVIDADE: record.DATA_ATIVIDADE || '',
    PRAZO: prazo || '',
    DIAS_EM_ABERTO: dias,
    RESPONSAVEL_SUGERIDO: record.RESPONSAVEL_INTERNO || '',
    DESCRICAO_PENDENCIA: acao,
    ACAO_RECOMENDADA: acao,
    LINK_ORIGEM: '',
    STATUS_PENDENCIA: 'ABERTA',
    ULTIMA_ATUALIZACAO: now
  };
}

var ATIVIDADES_V2_CHAMADA_MEMBROS_CACHE_ = {};

function atividadesV2_checkPresenceMemberApplicability_(record, dataAtividade) {
  var dateKey = atividadesV2_formatDateKey_(dataAtividade);
  if (!dateKey) return null;
  var members = atividadesV2_getMembrosAplicaveisParaData_(dateKey);
  if (!members) return null;

  var idPessoa = String(record.ID_PESSOA || '').trim();
  var rga = atividadesV2_sanitizeIdToken_(record.RGA || record.ID_REFERENCIA || '');
  for (var i = 0; i < members.length; i++) {
    var item = members[i] || {};
    if (idPessoa && String(item.idPessoa || item.ID_PESSOA || '').trim() === idPessoa) return true;
    if (rga && atividadesV2_sanitizeIdToken_(item.rga || item.RGA || '') === rga) return true;
  }
  return false;
}

function atividadesV2_getMembrosAplicaveisParaData_(dateKey) {
  if (Object.prototype.hasOwnProperty.call(ATIVIDADES_V2_CHAMADA_MEMBROS_CACHE_, dateKey)) {
    return ATIVIDADES_V2_CHAMADA_MEMBROS_CACHE_[dateKey];
  }

  try {
    var result = null;
    if (typeof geapaCoreListarMembrosParaChamada === 'function') {
      result = geapaCoreListarMembrosParaChamada(dateKey, { perfil: 'ADMIN_TECNICO' });
    } else if (typeof GEAPA_CORE !== 'undefined' && GEAPA_CORE && GEAPA_CORE.portal && typeof GEAPA_CORE.portal.listarMembrosParaChamada === 'function') {
      result = GEAPA_CORE.portal.listarMembrosParaChamada(dateKey, { perfil: 'ADMIN_TECNICO' });
    }
    var list = Array.isArray(result) ? result : (result && result.data) || [];
    ATIVIDADES_V2_CHAMADA_MEMBROS_CACHE_[dateKey] = list;
    return list;
  } catch (err) {
    ATIVIDADES_V2_CHAMADA_MEMBROS_CACHE_[dateKey] = null;
    return null;
  }
}

function atividadesV2_formatDateKey_(value) {
  var date = atividades_parseDateOrNull_(value);
  if (!date) return '';
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}
