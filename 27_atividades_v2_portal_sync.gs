/**
 * Materializacao DEV das views publicas de atividades para o Portal GEAPA.
 *
 * Esta rotina le apenas a aba Atividades da base v2 DEV e escreve somente na
 * aba PORTAL_ATIVIDADES_CALENDARIO da mesma base. Nao altera producao, nao
 * envia e-mails, nao instala triggers e nao registra presenca.
 */

function atividadesV2_sincronizarPortalAtividadesCalendarioDev_() {
  var perf = portalPerfStart_('atividadesV2_sincronizarPortalAtividadesCalendarioDev');
  var responseBase = {
    origem: ATIVIDADES_V2_REGISTRY_KEYS.DB,
    destino: ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_CALENDARIO
  };

  try {
    var ss = atividadesV2_getDatabaseSpreadsheetDev_();
    portalPerfMark_(perf, 'abrir_planilha_v2_dev');
    var sourceSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES);
    var targetSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_CALENDARIO);
    var sourceRows = atividadesV2_readSheetObjects_(sourceSheet);
    portalPerfMark_(perf, 'ler_aba_atividades', { linhas: sourceRows.length });
    var syncDate = new Date();
    var avisos = [];
    var ignored = 0;
    var payload = [];

    atividadesV2_ensurePortalCalendarioHeaders_(targetSheet);

    sourceRows.forEach(function(record) {
      var decision = atividadesV2_shouldPublishPortalCalendarActivity_(record, syncDate);
      if (!decision.publish) {
        ignored++;
        if (decision.warning) avisos.push(decision.warning);
        return;
      }

      payload.push(atividadesV2_buildPortalCalendarRow_(record, syncDate));
    });

    atividadesV2_replacePortalCalendarioRows_(targetSheet, payload);
    portalPerfMark_(perf, 'escrever_view_calendario', { linhas: payload.length });
    portalCacheRemove_(portalCacheBuildKey_('calendario', ''));
    portalCacheRemove_(portalCacheBuildKey_('bundle', ''));

    var result = Object.assign({}, responseBase, {
      ok: true,
      totalLidas: sourceRows.length,
      totalPublicadas: payload.length,
      totalIgnoradas: ignored,
      avisos: avisos,
      erros: []
    });
    result.tempoTotalMs = portalPerfEnd_(perf).totalMs;

    atividadesV2_appendV2Log_(ss, {
      FLUXO: 'PORTAL_ATIVIDADES_CALENDARIO',
      ACAO: 'Materializar calendario publico de atividades',
      NIVEL: 'INFO',
      STATUS: 'OK',
      MENSAGEM: 'PORTAL_ATIVIDADES_CALENDARIO sincronizada em DEV.',
      DETALHES_JSON: atividadesV2_safeLogData_({
        totalLidas: result.totalLidas,
        totalPublicadas: result.totalPublicadas,
        totalIgnoradas: result.totalIgnoradas
      })
    });

    Logger.log('GEAPA-ATIVIDADES-V2-PORTAL calendario sincronizado: ' + atividadesV2_safeLogData_(result));
    return result;
  } catch (e) {
    var details = e && e.message ? e.message : String(e);
    var perfResult = portalPerfEnd_(perf);
    Logger.log('GEAPA-ATIVIDADES-V2-PORTAL erro ao sincronizar calendario: ' + details);
    return Object.assign({}, responseBase, {
      ok: false,
      errorCode: 'ERRO_SINCRONIZAR_PORTAL_ATIVIDADES',
      message: 'Não foi possível sincronizar o calendário do portal.',
      detalhes: details,
      tempoTotalMs: perfResult ? perfResult.totalMs : ''
    });
  }
}

function atividadesV2_runTestePortalAtividadesCalendarioDev_() {
  var sync = atividadesV2_sincronizarPortalAtividadesCalendarioDev_();
  if (!sync.ok) {
    return {
      ok: false,
      totalPublicadas: 0,
      primeiraAtividade: null,
      idsInvalidos: [],
      avisos: sync.avisos || [],
      erro: sync
    };
  }

  var ss = atividadesV2_getDatabaseSpreadsheetDev_();
  var sheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_CALENDARIO);
  var records = atividadesV2_readSheetObjects_(sheet);
  var idsInvalidos = records.filter(function(record) {
    return !atividadesV2_isCanonicalActivityId_(record.ID_ATIVIDADE);
  }).map(function(record) {
    return {
      rowNumber: record._rowNumber,
      idAtividade: String(record.ID_ATIVIDADE || '').trim()
    };
  });

  return {
    ok: idsInvalidos.length === 0,
    totalPublicadas: records.length,
    primeiraAtividade: records.length ? atividadesV2_sanitizePortalCalendarTestRecord_(records[0]) : null,
    idsInvalidos: idsInvalidos,
    avisos: sync.avisos || []
  };
}

function atividadesV2_atualizarPortalAtividadesDetalhesDev_() {
  var perf = portalPerfStart_('atividadesV2_atualizarPortalAtividadesDetalhesDev');
  var result = {
    ok: true,
    origem: ATIVIDADES_V2_REGISTRY_KEYS.DB,
    destino: ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_DETALHES,
    totalAtividadesLidas: 0,
    totalApresentacoesLidas: 0,
    totalDetalhesGerados: 0,
    totalApresentacoesVinculadas: 0,
    atividadesSemApresentacaoVinculada: 0,
    tempoTotalMs: 0,
    avisos: [],
    erros: []
  };

  try {
    var ss = atividadesV2_getDatabaseSpreadsheetDev_();
    portalPerfMark_(perf, 'abrir_planilha_v2_dev');

    var atividadesSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES);
    var apresentacoesSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.APRESENTACOES);
    var detalhesSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_DETALHES);
    atividadesV2_ensurePortalDetalhesHeaders_(detalhesSheet);

    var atividades = atividadesV2_readSheetObjects_(atividadesSheet);
    result.totalAtividadesLidas = atividades.length;
    portalPerfMark_(perf, 'ler_aba_atividades', { linhas: atividades.length });

    var apresentacoes = atividadesV2_readSheetObjects_(apresentacoesSheet);
    result.totalApresentacoesLidas = apresentacoes.length;
    portalPerfMark_(perf, 'ler_aba_apresentacoes', { linhas: apresentacoes.length });

    var apresentacoesPorAtividade = atividadesV2_indexApresentacoesPorAtividade_(apresentacoes);
    portalPerfMark_(perf, 'montar_indice_apresentacoes');

    var syncDate = new Date();
    var payload = [];
    atividades.forEach(function(atividade) {
      if (atividades_normalizeTextUpper_(atividade.ATIVO) === 'NAO') return;

      var idAtividade = String(atividade.ID_ATIVIDADE || '').trim();
      if (!atividadesV2_isCanonicalActivityId_(idAtividade)) {
        result.avisos.push('Atividade ignorada na view de detalhes por ID invalido na linha ' + atividade._rowNumber + ': ' + idAtividade);
        return;
      }

      var vinculadas = apresentacoesPorAtividade[idAtividade] || [];
      if (!vinculadas.length) {
        if (atividades_normalizeTextUpper_(atividade.SUBTIPO_ATIVIDADE) === 'APRESENTACAO_MEMBRO') {
          result.atividadesSemApresentacaoVinculada++;
        }
        payload.push(atividadesV2_buildPortalDetalheRow_(atividade, null, syncDate));
        return;
      }

      vinculadas.forEach(function(apresentacao) {
        result.totalApresentacoesVinculadas++;
        payload.push(atividadesV2_buildPortalDetalheRow_(atividade, apresentacao, syncDate));
      });
    });

    atividadesV2_replacePortalDetalhesRows_(detalhesSheet, payload);
    result.totalDetalhesGerados = payload.length;
    portalPerfMark_(perf, 'escrever_view_detalhes', { linhas: payload.length });

    portalCacheRemove_(portalCacheBuildKey_('detalhes', ''));
    portalCacheRemove_(portalCacheBuildKey_('bundle', ''));

    result.tempoTotalMs = portalPerfEnd_(perf).totalMs;
    atividadesV2_appendV2Log_(ss, {
      FLUXO: 'PORTAL_ATIVIDADES_DETALHES',
      ACAO: 'Materializar detalhes publicos de atividades',
      NIVEL: result.avisos.length ? 'WARN' : 'INFO',
      STATUS: 'OK',
      MENSAGEM: 'PORTAL_ATIVIDADES_DETALHES atualizada em DEV.',
      DETALHES_JSON: atividadesV2_safeLogData_({
        totalAtividadesLidas: result.totalAtividadesLidas,
        totalApresentacoesLidas: result.totalApresentacoesLidas,
        totalDetalhesGerados: result.totalDetalhesGerados,
        avisos: result.avisos.length,
        tempoTotalMs: result.tempoTotalMs
      })
    });
    Logger.log('GEAPA-ATIVIDADES-V2-PORTAL detalhes sincronizados: ' + atividadesV2_safeLogData_(result));
    return result;
  } catch (e) {
    result.ok = false;
    result.erros.push(e && e.message ? e.message : String(e));
    result.tempoTotalMs = portalPerfEnd_(perf).totalMs;
    Logger.log('GEAPA-ATIVIDADES-V2-PORTAL erro ao sincronizar detalhes: ' + atividadesV2_safeLogData_(result));
    return result;
  }
}

function atividadesV2_ensurePortalCalendarioHeaders_(sheet) {
  var headers = ATIVIDADES_V2_SCHEMA.PORTAL_ATIVIDADES_CALENDARIO.slice();
  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  atividadesV2_applyBasicSheetUx_(sheet);
}

function atividadesV2_ensurePortalDetalhesHeaders_(sheet) {
  var headers = ATIVIDADES_V2_SCHEMA.PORTAL_ATIVIDADES_DETALHES.slice();
  atividadesV2_applyHeadersIfMissing_(sheet, headers);
  atividadesV2_applyBasicSheetUx_(sheet);
}

function atividadesV2_replacePortalCalendarioRows_(sheet, records) {
  var headers = ATIVIDADES_V2_SCHEMA.PORTAL_ATIVIDADES_CALENDARIO.slice();
  atividadesV2_replacePortalRows_(sheet, headers, records);
}

function atividadesV2_replacePortalDetalhesRows_(sheet, records) {
  var headers = ATIVIDADES_V2_SCHEMA.PORTAL_ATIVIDADES_DETALHES.slice();
  atividadesV2_replacePortalRows_(sheet, headers, records);
}

function atividadesV2_replacePortalRows_(sheet, headers, records) {
  var maxRowsBelowHeader = Math.max(sheet.getMaxRows() - 1, 0);
  var clearCols = Math.max(sheet.getLastColumn(), headers.length);
  if (maxRowsBelowHeader > 0) {
    sheet.getRange(2, 1, maxRowsBelowHeader, clearCols).clearContent();
  }
  if (!records.length) return;

  var values = records.map(function(record) {
    return headers.map(function(header) {
      return Object.prototype.hasOwnProperty.call(record, header) ? record[header] : '';
    });
  });

  sheet.getRange(2, 1, values.length, headers.length).setValues(values);
}

function atividadesV2_indexApresentacoesPorAtividade_(apresentacoes) {
  var index = {};
  (apresentacoes || []).forEach(function(apresentacao) {
    if (atividades_normalizeTextUpper_(apresentacao.ATIVO) === 'NAO') return;
    var idAtividade = String(apresentacao.ID_ATIVIDADE || '').trim();
    if (!idAtividade) return;
    if (!index[idAtividade]) index[idAtividade] = [];
    index[idAtividade].push(apresentacao);
  });
  return index;
}

function atividadesV2_buildPortalDetalheRow_(atividade, apresentacao, syncDate) {
  var hasApresentacao = !!apresentacao ||
    atividades_normalizeTextUpper_(atividade.SUBTIPO_ATIVIDADE) === 'APRESENTACAO_MEMBRO';

  return {
    ID_ATIVIDADE: String(atividade.ID_ATIVIDADE || '').trim(),
    ID_APRESENTACAO: apresentacao ? String(apresentacao.ID_APRESENTACAO || '').trim() : '',
    EH_APRESENTACAO: hasApresentacao ? 'SIM' : 'NAO',
    DATA_ATIVIDADE: atividade.DATA_ATIVIDADE || '',
    DIA_SEMANA: atividadesV2_getDiaSemanaPtBr_(atividade.DATA_ATIVIDADE),
    HORARIO_INICIO: atividade.HORARIO_INICIO || '',
    HORARIO_FIM: atividade.HORARIO_FIM || '',
    TITULO_PUBLICO: atividades_sanitizePortalText_(atividade.TITULO_PUBLICO || atividade.TITULO, 180) || 'Atividade do GEAPA',
    DESCRICAO_PUBLICA: atividades_sanitizePortalText_(atividade.DESCRICAO_PUBLICA || atividade.DESCRICAO, 1000),
    TIPO_ATIVIDADE: String(atividade.TIPO_ATIVIDADE || '').trim(),
    SUBTIPO_ATIVIDADE: String(atividade.SUBTIPO_ATIVIDADE || '').trim(),
    TIPO_PUBLICO: atividadesV2_getTipoPublicoCalendario_(atividade),
    CLASSIFICACAO_REUNIAO: String(atividade.CLASSIFICACAO_REUNIAO || '').trim(),
    CLASSIFICACAO_ACESSO: String(atividade.CLASSIFICACAO_ACESSO || '').trim(),
    LOCAL: atividades_sanitizePortalText_(atividade.LOCAL, 180),
    FORMATO: String(atividade.FORMATO || '').trim(),
    PUBLICO_ALVO: atividades_sanitizePortalText_(atividade.PUBLICO_ALVO, 180),
    CONTA_PRESENCA: String(atividade.CONTA_PRESENCA || '').trim(),
    CONTA_FALTA: String(atividade.CONTA_FALTA || '').trim(),
    GERA_CERTIFICADO: String(atividade.GERA_CERTIFICADO || '').trim(),
    CARGA_HORARIA: atividadesV2_getCargaHorariaPortal_(atividade),
    STATUS_PUBLICO: String(atividade.STATUS_PUBLICACAO_PORTAL || atividade.STATUS_OPERACIONAL || '').trim(),
    VISIBILIDADE_PORTAL: String(atividade.VISIBILIDADE_PORTAL || '').trim(),
    STATUS_OPERACIONAL: String(atividade.STATUS_OPERACIONAL || '').trim(),
    STATUS_PUBLICACAO_PORTAL: String(atividade.STATUS_PUBLICACAO_PORTAL || '').trim(),
    NOME_APRESENTADOR_PUBLICO: apresentacao ? atividades_sanitizePortalText_(apresentacao.NOME_MEMBRO, 180) : '',
    RGA_APRESENTADOR: apresentacao ? String(apresentacao.RGA || '').trim() : '',
    EMAIL_APRESENTADOR: apresentacao ? String(apresentacao.EMAIL_MEMBRO || '').trim() : '',
    TITULO_APRESENTACAO: apresentacao ? atividades_sanitizePortalText_(apresentacao.TITULO_APRESENTACAO, 240) : '',
    EIXO_TEMATICO_PRINCIPAL: apresentacao ? String(apresentacao.EIXO_TEMATICO_PRINCIPAL || '').trim() : '',
    EIXO_TEMATICO_SECUNDARIO: apresentacao ? String(apresentacao.EIXO_TEMATICO_SECUNDARIO || '').trim() : '',
    STATUS_APRESENTACAO_PUBLICO: apresentacao ? String(apresentacao.STATUS_APRESENTACAO || '').trim() : '',
    STATUS_TITULO_EIXO: apresentacao ? String(apresentacao.STATUS_TITULO_EIXO || '').trim() : '',
    STATUS_ARQUIVO_PUBLICO: apresentacao ? String(apresentacao.STATUS_ENVIO_ARQUIVO || '').trim() : '',
    LINK_MATERIAL_PUBLICO: atividades_sanitizePortalUrl_(apresentacao && apresentacao.LINK_ARQUIVO_DRIVE || atividade.LINK_MATERIAL),
    LINK_ATA_PUBLICA: atividades_sanitizePortalUrl_(atividade.LINK_ATA),
    LINK_FOTOS_PUBLICO: atividades_sanitizePortalUrl_(atividade.LINK_FOTOS),
    LINK_PASTA_DRIVE: atividades_sanitizePortalUrl_(apresentacao && apresentacao.LINK_PASTA_DRIVE || atividade.LINK_PASTA_DRIVE),
    MENSAGEM_PORTAL: '',
    ULTIMA_ATUALIZACAO: apresentacao && apresentacao.ATUALIZADO_EM || atividade.ATUALIZADO_EM || syncDate
  };
}

function atividadesV2_shouldPublishPortalCalendarActivity_(record, now) {
  if (atividades_normalizeTextUpper_(record.ATIVO) === 'NAO') return { publish: false };

  var statusPublicacao = atividades_normalizeTextUpper_(record.STATUS_PUBLICACAO_PORTAL);
  if (['RASCUNHO', 'OCULTA', 'CANCELADA'].indexOf(statusPublicacao) >= 0) return { publish: false };

  if (statusPublicacao === 'AGENDADA') {
    var releaseDate = atividades_parseDateOrNull_(record.DATA_LIBERACAO_PORTAL);
    if (!releaseDate || releaseDate.getTime() > now.getTime()) return { publish: false };
  } else if (statusPublicacao !== 'PUBLICADA') {
    return { publish: false };
  }

  var visibility = atividades_normalizeTextUpper_(record.VISIBILIDADE_PORTAL);
  if (visibility === 'OCULTA') return { publish: false };

  var operational = atividades_normalizeTextUpper_(record.STATUS_OPERACIONAL);
  if (operational === 'CANCELADA' || operational === 'ARQUIVADA') return { publish: false };

  var id = String(record.ID_ATIVIDADE || '').trim();
  if (!id) return { publish: false };
  if (!atividadesV2_isCanonicalActivityId_(id)) {
    return {
      publish: false,
      warning: 'ID_ATIVIDADE invalido ignorado na linha ' + record._rowNumber + ': ' + id
    };
  }

  return { publish: true };
}

function atividadesV2_buildPortalCalendarRow_(record, syncDate) {
  var title = atividades_sanitizePortalText_(record.TITULO_PUBLICO || record.TITULO, 180) || 'Atividade do GEAPA';
  return {
    ID_ATIVIDADE: String(record.ID_ATIVIDADE || '').trim(),
    DATA_ATIVIDADE: record.DATA_ATIVIDADE || '',
    DIA_SEMANA: atividadesV2_getDiaSemanaPtBr_(record.DATA_ATIVIDADE),
    HORARIO_INICIO: record.HORARIO_INICIO || '',
    HORARIO_FIM: record.HORARIO_FIM || '',
    TITULO_PUBLICO: title,
    TIPO_PUBLICO: atividadesV2_getTipoPublicoCalendario_(record),
    SUBTIPO_ATIVIDADE: String(record.SUBTIPO_ATIVIDADE || '').trim(),
    LOCAL: atividades_sanitizePortalText_(record.LOCAL, 180),
    FORMATO: String(record.FORMATO || '').trim(),
    CLASSIFICACAO_ACESSO: String(record.CLASSIFICACAO_ACESSO || '').trim(),
    PUBLICO_ALVO: atividades_sanitizePortalText_(record.PUBLICO_ALVO, 180),
    CONTA_PRESENCA: String(record.CONTA_PRESENCA || '').trim(),
    CONTA_FALTA: String(record.CONTA_FALTA || '').trim(),
    GERA_CERTIFICADO: String(record.GERA_CERTIFICADO || '').trim(),
    CARGA_HORARIA: atividadesV2_getCargaHorariaPortal_(record),
    STATUS_PUBLICO: String(record.STATUS_PUBLICACAO_PORTAL || '').trim(),
    VISIBILIDADE_PORTAL: String(record.VISIBILIDADE_PORTAL || '').trim(),
    PODE_VER_DETALHES: 'SIM',
    LINK_DETALHES: '',
    ULTIMA_ATUALIZACAO: record.ATUALIZADO_EM || syncDate
  };
}

function atividadesV2_getDiaSemanaPtBr_(value) {
  var date = atividades_parseDateOrNull_(value);
  if (!date) return '';
  return [
    'domingo',
    'segunda-feira',
    'terça-feira',
    'quarta-feira',
    'quinta-feira',
    'sexta-feira',
    'sábado'
  ][date.getDay()] || '';
}

function atividadesV2_getTipoPublicoCalendario_(record) {
  var explicit = atividades_sanitizePortalText_(record.TIPO_PUBLICO, 120);
  if (explicit) return explicit;

  var subtipo = atividades_normalizeTextUpper_(record.SUBTIPO_ATIVIDADE);
  var classificacao = atividades_normalizeTextUpper_(record.CLASSIFICACAO_REUNIAO);
  var labels = {
    APRESENTACAO_MEMBRO: 'Apresentação',
    APRESENTACAO_REPOSICAO: 'Apresentação',
    PALESTRA: 'Palestra',
    VISITA_TECNICA: 'Visita técnica',
    CURSO: 'Curso',
    DEBATE: 'Debate',
    REUNIAO_ORDINARIA: 'Reunião',
    REUNIAO_EXTRAORDINARIA: 'Reunião'
  };

  if (labels[subtipo]) return labels[subtipo];
  if (classificacao === 'ORDINARIA' || classificacao === 'EXTRAORDINARIA') return 'Reunião';
  return 'Atividade';
}

function atividadesV2_getCargaHorariaPortal_(record) {
  var raw = String(record.CARGA_HORARIA === null || record.CARGA_HORARIA === undefined ? '' : record.CARGA_HORARIA).trim();
  if (raw) return record.CARGA_HORARIA;
  if (typeof atividades_calculateCargaHorariaFromTimes_ !== 'function') return '';

  var calculated = atividades_calculateCargaHorariaFromTimes_(record.HORARIO_INICIO, record.HORARIO_FIM);
  return calculated === null || calculated === undefined ? '' : calculated;
}

function atividadesV2_sanitizePortalCalendarTestRecord_(record) {
  return {
    idAtividade: String(record.ID_ATIVIDADE || '').trim(),
    dataAtividade: record.DATA_ATIVIDADE || '',
    tituloPublico: String(record.TITULO_PUBLICO || '').trim(),
    tipoPublico: String(record.TIPO_PUBLICO || '').trim(),
    visibilidadePortal: String(record.VISIBILIDADE_PORTAL || '').trim()
  };
}
