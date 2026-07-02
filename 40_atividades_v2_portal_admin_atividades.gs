/**
 * Gestao administrativa de atividades V2 pelo Portal GEAPA.
 *
 * Leituras retornam somente dados operacionais necessarios. Escritas aceitam
 * uma whitelist pequena de campos e sempre revalidam permissao e estado dentro
 * de LockService. Nenhuma funcao deste arquivo escreve em bases legadas.
 */

var ATIVIDADES_V2_ADMIN_EDITABLE_FIELDS_ = Object.freeze({
  tituloPublico: 'TITULO_PUBLICO',
  descricaoPublica: 'DESCRICAO_PUBLICA',
  descricaoInterna: 'DESCRICAO',
  dataAtividade: 'DATA_ATIVIDADE',
  horarioInicio: 'HORARIO_INICIO',
  horarioFim: 'HORARIO_FIM',
  local: 'LOCAL',
  formato: 'FORMATO',
  responsavelInterno: 'RESPONSAVEL_INTERNO',
  publicoAlvo: 'PUBLICO_ALVO',
  observacoes: 'OBSERVACOES'
});

var ATIVIDADES_V2_ADMIN_SENSITIVE_FIELDS_ = Object.freeze([
  'ID_CONFIG_MODELO', 'TIPO_ATIVIDADE', 'SUBTIPO_ATIVIDADE',
  'CLASSIFICACAO_REUNIAO', 'CLASSIFICACAO_ACESSO', 'CONTA_PRESENCA',
  'CONTA_FALTA', 'GERA_CERTIFICADO', 'PERMITE_JUSTIFICATIVA',
  'EXIGE_LISTA_PRESENCA', 'EXIGE_MATERIAL', 'CARGA_HORARIA',
  'VISIBILIDADE_PORTAL', 'STATUS_PUBLICACAO_PORTAL', 'STATUS_OPERACIONAL'
]);

function atividadesV2_portalListarAtividadesAdmin_(filtros, contexto) {
  var ctx = atividades_normalizePortalContext_(contexto || {});
  if (!atividadesV2_adminCanManage_(ctx)) return atividadesV2_adminPermissionError_();

  try {
    var ss = atividadesV2_getDatabaseSpreadsheetDev_();
    var activities = atividadesV2_readSheetObjects_(
      atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES)
    );
    var presentations = atividadesV2_readSheetObjects_(
      atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.APRESENTACOES)
    );
    var pendingByActivity = atividadesV2_adminIndexPresentationPending_(presentations);
    var arquivosIndex = typeof atividadesV2_indexLatestArquivos_ === 'function'
      ? atividadesV2_indexLatestArquivos_(atividadesV2_readArquivosAtividadeOptional_(ss))
      : {};
    var configs = atividades_modelosCriacaoReadConfigRows_(ss);
    var normalizedFilters = atividadesV2_adminNormalizeFilters_(filtros || {});
    var records = activities.map(function(row) {
      return atividadesV2_adminBuildListItem_(row, pendingByActivity[String(row.ID_ATIVIDADE || '').trim()] || [], arquivosIndex, atividadesV2_findConfigForActivityFromRows_(configs, row));
    }).filter(function(item) {
      return item.idAtividade && atividadesV2_adminMatchesFilters_(item, normalizedFilters);
    }).sort(atividadesV2_adminSortActivities_);

    return {
      ok: true,
      data: {
        atividades: records,
        total: records.length,
        filtrosAplicados: normalizedFilters,
        opcoesFiltros: atividadesV2_adminBuildFilterOptions_(activities),
        ultimaAtualizacao: new Date().toISOString()
      },
      meta: {
        origem: 'ATIVIDADES_V2_DB/Atividades',
        somenteDev: true,
        dadosSensiveisExpostos: false
      }
    };
  } catch (err) {
    return atividadesV2_adminErrorResponse_(err, 'ERRO_LISTAR_ATIVIDADES_ADMIN', 'Nao foi possivel listar as atividades administrativas.');
  }
}

function atividadesV2_portalGetDetalheAtividadeAdmin_(idAtividade, contexto) {
  var ctx = atividades_normalizePortalContext_(contexto || {});
  if (!atividadesV2_adminCanManage_(ctx)) return atividadesV2_adminPermissionError_();
  var id = atividadesV2_adminNormalizeActivityId_(idAtividade);
  if (!id) return atividadesV2_adminError_('ID_ATIVIDADE_OBRIGATORIO', 'Informe a atividade.');

  try {
    var ss = atividadesV2_getDatabaseSpreadsheetDev_();
    var activity = atividadesV2_adminFindByActivityId_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES, id);
    if (!activity) return atividadesV2_adminError_('ATIVIDADE_NAO_ENCONTRADA', 'Atividade nao encontrada na base V2 DEV.');

    var presentations = atividadesV2_readSheetObjects_(
      atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.APRESENTACOES)
    ).filter(function(row) { return String(row.ID_ATIVIDADE || '').trim() === id; });
    var involved = atividadesV2_readSheetObjects_(
      atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ENVOLVIDOS)
    ).filter(function(row) { return String(row.ID_ATIVIDADE || '').trim() === id; });
    var configRows = atividades_modelosCriacaoReadConfigRows_(ss);
    var model = atividades_modelosCriacaoFindConfig_(configRows, activity.ID_CONFIG_MODELO);
    var arquivosIndex = typeof atividadesV2_indexLatestArquivos_ === 'function'
      ? atividadesV2_indexLatestArquivos_(atividadesV2_readArquivosAtividadeOptional_(ss))
      : {};

    return {
      ok: true,
      data: {
        atividade: atividadesV2_adminBuildDetailActivity_(activity, model),
        modeloAplicado: model ? atividades_modelosCriacaoToSafeModel_(model) : null,
        apresentacoes: presentations.map(function(presentation) {
          var photo = atividadesV2_getLatestArquivoFromIndex_(arquivosIndex, id, presentation.ID_APRESENTACAO, ATIVIDADES_V2_TIPO_ARQUIVO_FOTO_);
          return atividadesV2_adminBuildPresentation_(presentation, photo);
        }),
        envolvidos: involved.map(atividadesV2_adminBuildInvolved_),
        pendencias: atividadesV2_adminBuildPending_(activity, presentations, arquivosIndex, model || {}),
        ultimasAcoes: atividadesV2_adminReadLastActions_(ss, id),
        camposEditaveis: atividadesV2_adminEditableFieldNames_(activity, model),
        camposBloqueados: ATIVIDADES_V2_ADMIN_SENSITIVE_FIELDS_.slice(),
        podePublicar: atividades_normalizeTextUpper_(activity.STATUS_OPERACIONAL) !== 'CANCELADA',
        podeReabrir: ['CANCELADA', 'ARQUIVADA'].indexOf(atividades_normalizeTextUpper_(activity.STATUS_OPERACIONAL)) >= 0,
        modo: 'DEV'
      }
    };
  } catch (err) {
    return atividadesV2_adminErrorResponse_(err, 'ERRO_DETALHE_ATIVIDADE_ADMIN', 'Nao foi possivel carregar o detalhe administrativo.');
  }
}

function atividadesV2_portalValidarEdicaoAtividadeAdmin_(payload, contexto) {
  var ctx = atividades_normalizePortalContext_(contexto || {});
  if (!atividadesV2_adminCanManage_(ctx)) return atividadesV2_adminPermissionError_();
  try {
    var ss = atividadesV2_getDatabaseSpreadsheetDev_();
    var validation = atividadesV2_adminValidateEdit_(ss, payload || {});
    if (!validation.ok) return validation;
    return {
      ok: true,
      message: 'Edicao validada sem escrita.',
      data: {
        idAtividade: validation.idAtividade,
        alteracoes: validation.publicChanges,
        dryRun: true,
        escrita: false
      }
    };
  } catch (err) {
    return atividadesV2_adminErrorResponse_(err, 'ERRO_VALIDAR_EDICAO_ATIVIDADE', 'Nao foi possivel validar a edicao.');
  }
}

function atividadesV2_portalSalvarEdicaoAtividadeAdmin_(payload, contexto) {
  var ctx = atividades_normalizePortalContext_(contexto || {});
  if (!atividadesV2_adminCanManage_(ctx)) return atividadesV2_adminPermissionError_();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return atividadesV2_adminError_('LOCK_INDISPONIVEL', 'Outra alteracao esta em andamento. Tente novamente.');

  var result;
  try {
    var ss = atividadesV2_getDatabaseSpreadsheetDev_();
    var validation = atividadesV2_adminValidateEdit_(ss, payload || {});
    if (!validation.ok) return validation;
    var beforeFull = Object.assign({}, validation.activity);
    var before = atividadesV2_adminSnapshot_(beforeFull);
    validation.updates.ATUALIZADO_POR = atividadesV2_portalActorToken_(ctx);
    atividadesV2_adminWriteRowBatch_(validation.sheet, validation.activity._rowNumber, validation.updates);
    var after = Object.assign({}, validation.activity, validation.updates);
    atividadesV2_adminLogMutation_(ss, 'ATIVIDADE_EDITADA', validation.idAtividade, before, atividadesV2_adminSnapshot_(after), ctx);
    result = atividadesV2_adminSuccessMutation_('Atividade atualizada com sucesso.', after);
    atividadesV2_adminInvalidateCaches_(validation.idAtividade, beforeFull, after);
  } catch (err) {
    result = atividadesV2_adminErrorResponse_(err, 'ERRO_SALVAR_EDICAO_ATIVIDADE', 'Nao foi possivel salvar a atividade.');
  } finally {
    lock.releaseLock();
  }
  if (result && result.ok) result.meta = atividadesV2_adminRefreshViewsSafe_(
    result.data && result.data.idAtividade,
    'ATIVIDADE_EDITADA',
    ctx
  );
  return result;
}

function atividadesV2_portalAlterarStatusAtividadeAdmin_(action, payload, contexto) {
  var ctx = atividades_normalizePortalContext_(contexto || {});
  if (!atividadesV2_adminCanManage_(ctx)) return atividadesV2_adminPermissionError_();
  var id = atividadesV2_adminNormalizeActivityId_(payload && (payload.idAtividade || payload.ID_ATIVIDADE));
  if (!id) return atividadesV2_adminError_('ID_ATIVIDADE_OBRIGATORIO', 'Informe a atividade.');

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return atividadesV2_adminError_('LOCK_INDISPONIVEL', 'Outra alteracao esta em andamento. Tente novamente.');
  var result;
  try {
    var ss = atividadesV2_getDatabaseSpreadsheetDev_();
    var sheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES);
    var activity = atividadesV2_adminFindInRows_(atividadesV2_readSheetObjects_(sheet), id);
    if (!activity) return atividadesV2_adminError_('ATIVIDADE_NAO_ENCONTRADA', 'Atividade nao encontrada na base V2 DEV.');
    var beforeFull = Object.assign({}, activity);
    var before = atividadesV2_adminSnapshot_(beforeFull);
    var updates = atividadesV2_adminBuildStatusUpdates_(action, payload || {}, activity);
    if (!updates.ok) return updates;
    updates.data.ATUALIZADO_POR = atividadesV2_portalActorToken_(ctx);
    updates.data.ATUALIZADO_EM = new Date();
    atividadesV2_adminWriteRowBatch_(sheet, activity._rowNumber, updates.data);
    var after = Object.assign({}, activity, updates.data);
    atividadesV2_adminLogMutation_(ss, 'ATIVIDADE_' + action, id, before, atividadesV2_adminSnapshot_(after), ctx);
    atividadesV2_adminInvalidateCaches_(id, beforeFull, after);
    result = atividadesV2_adminSuccessMutation_(updates.message, after);
  } catch (err) {
    result = atividadesV2_adminErrorResponse_(err, 'ERRO_' + action + '_ATIVIDADE', 'Nao foi possivel alterar o estado da atividade.');
  } finally {
    lock.releaseLock();
  }
  if (result && result.ok) result.meta = atividadesV2_adminRefreshViewsSafe_(
    result.data && result.data.idAtividade,
    'ATIVIDADE_' + atividades_normalizeTextUpper_(action),
    ctx
  );
  return result;
}

function atividadesV2_adminValidateEdit_(ss, payload) {
  var id = atividadesV2_adminNormalizeActivityId_(payload && (payload.idAtividade || payload.ID_ATIVIDADE));
  if (!id) return atividadesV2_adminError_('ID_ATIVIDADE_OBRIGATORIO', 'Informe a atividade.');
  var sheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES);
  var activity = atividadesV2_adminFindInRows_(atividadesV2_readSheetObjects_(sheet), id);
  if (!activity) return atividadesV2_adminError_('ATIVIDADE_NAO_ENCONTRADA', 'Atividade nao encontrada na base V2 DEV.');
  if (atividades_normalizeTextUpper_(activity.BLOQUEADO_PARA_EDICAO) === 'SIM') {
    return atividadesV2_adminError_('ATIVIDADE_BLOQUEADA', 'Esta atividade esta bloqueada para edicao.');
  }

  var supplied = payload.campos || payload.atividade || payload;
  var forbidden = atividadesV2_adminFindForbiddenFields_(supplied);
  if (forbidden.length) {
    return atividadesV2_adminError_('CAMPO_NAO_EDITAVEL', 'Campos sensiveis devem ser alterados por fluxo proprio.', { campos: forbidden });
  }
  var model = atividades_modelosCriacaoFindConfig_(atividades_modelosCriacaoReadConfigRows_(ss), activity.ID_CONFIG_MODELO);
  var allowedNames = atividadesV2_adminEditableFieldNames_(activity, model);
  var updates = {};
  var publicChanges = {};
  Object.keys(ATIVIDADES_V2_ADMIN_EDITABLE_FIELDS_).forEach(function(name) {
    if (!Object.prototype.hasOwnProperty.call(supplied, name) || allowedNames.indexOf(name) < 0) return;
    var header = ATIVIDADES_V2_ADMIN_EDITABLE_FIELDS_[name];
    var value = atividadesV2_adminNormalizeEditableValue_(name, supplied[name]);
    updates[header] = value;
    publicChanges[name] = value instanceof Date ? atividades_formatPortalDateIso_(value) : value;
  });

  var effective = Object.assign({}, activity, updates);
  var fieldErrors = atividadesV2_adminValidateEditableState_(effective);
  if (Object.keys(fieldErrors).length) {
    return { ok: false, errorCode: 'VALIDACAO_ATIVIDADE', message: 'Revise os campos informados.', fieldErrors: fieldErrors };
  }
  if (updates.DATA_ATIVIDADE) {
    var cycle = atividades_modelosCriacaoResolverCicloReferencia_(updates.DATA_ATIVIDADE);
    updates.CICLO = cycle.idCiclo || cycle.ciclo;
    updates.ANO = cycle.ano;
    updates.SEMESTRE = cycle.semestre;
  }
  updates.ATUALIZADO_POR = '';
  updates.ATUALIZADO_EM = new Date();
  return { ok: true, idAtividade: id, sheet: sheet, activity: activity, model: model, updates: updates, publicChanges: publicChanges };
}

function atividadesV2_adminBuildStatusUpdates_(action, payload, activity) {
  var normalized = atividades_normalizeTextUpper_(action);
  var status = atividades_normalizeTextUpper_(activity.STATUS_OPERACIONAL);
  if (normalized === 'PUBLICAR') {
    var fieldErrors = atividadesV2_adminValidatePublication_(activity);
    if (Object.keys(fieldErrors).length) {
      return { ok: false, errorCode: 'DADOS_MINIMOS_PUBLICACAO', message: 'A atividade ainda nao pode ser publicada.', fieldErrors: fieldErrors };
    }
    if (['CANCELADA', 'ARQUIVADA'].indexOf(status) >= 0) return atividadesV2_adminError_('ATIVIDADE_INATIVA', 'Reabra a atividade antes de publicar.');
    var visibility = atividades_normalizeTextUpper_(payload.visibilidadePortal || activity.VISIBILIDADE_PORTAL || 'DIRETORIA');
    if (['DIRETORIA', 'MEMBROS', 'PUBLICA'].indexOf(visibility) < 0) visibility = 'DIRETORIA';
    return { ok: true, message: 'Atividade publicada com sucesso.', data: { STATUS_PUBLICACAO_PORTAL: 'PUBLICADA', VISIBILIDADE_PORTAL: visibility } };
  }
  if (normalized === 'OCULTAR') {
    return { ok: true, message: 'Atividade ocultada do Portal.', data: { STATUS_PUBLICACAO_PORTAL: 'OCULTA', VISIBILIDADE_PORTAL: 'OCULTA' } };
  }
  if (normalized === 'CANCELAR') {
    return { ok: true, message: 'Atividade cancelada sem exclusao de dados.', data: { STATUS_OPERACIONAL: 'CANCELADA', STATUS_PUBLICACAO_PORTAL: 'OCULTA', VISIBILIDADE_PORTAL: 'OCULTA' } };
  }
  if (normalized === 'REABRIR') {
    if (['CANCELADA', 'ARQUIVADA'].indexOf(status) < 0) return atividadesV2_adminError_('ATIVIDADE_NAO_REABRIVEL', 'Somente atividades canceladas ou arquivadas podem ser reabertas.');
    return { ok: true, message: 'Atividade reaberta como rascunho.', data: { STATUS_OPERACIONAL: 'PLANEJADA', STATUS_PUBLICACAO_PORTAL: 'RASCUNHO', VISIBILIDADE_PORTAL: 'DIRETORIA' } };
  }
  return atividadesV2_adminError_('ACAO_ADMIN_INVALIDA', 'Acao administrativa invalida.');
}

function atividadesV2_adminValidatePublication_(activity) {
  var errors = atividadesV2_adminValidateEditableState_(activity);
  if (!String(activity.TITULO_PUBLICO || activity.TITULO || '').trim()) errors.tituloPublico = 'Informe um titulo publico.';
  if (!String(activity.VISIBILIDADE_PORTAL || '').trim()) errors.visibilidadePortal = 'Defina a visibilidade da atividade.';
  return errors;
}

function atividadesV2_adminValidateEditableState_(activity) {
  var errors = {};
  var date = atividades_parseDateOrNull_(activity.DATA_ATIVIDADE);
  var start = atividades_parseTimeValueToMinutes_(activity.HORARIO_INICIO);
  var end = atividades_parseTimeValueToMinutes_(activity.HORARIO_FIM);
  if (!date) errors.dataAtividade = 'Informe uma data valida.';
  if (start === null) errors.horarioInicio = 'Informe um horario inicial valido.';
  if (end === null) errors.horarioFim = 'Informe um horario final valido.';
  if (start !== null && end !== null && end <= start) errors.horarioFim = 'O horario final deve ser posterior ao inicial.';
  if (!String(activity.LOCAL || '').trim()) errors.local = 'Informe o local.';
  if (!String(activity.FORMATO || '').trim()) errors.formato = 'Informe o formato.';
  return errors;
}

function atividadesV2_adminNormalizeEditableValue_(field, value) {
  if (field === 'dataAtividade') return atividades_parseDateOrNull_(value);
  if (field === 'horarioInicio' || field === 'horarioFim') {
    var minutes = atividades_parseTimeValueToMinutes_(value);
    return minutes === null ? '' : atividadesV2_minutesToPortalTime_(minutes);
  }
  if (field === 'formato') return atividades_normalizeTextUpper_(value);
  var limits = { tituloPublico: 240, descricaoPublica: 2000, descricaoInterna: 2000, local: 180, responsavelInterno: 180, publicoAlvo: 300, observacoes: 1200 };
  return atividades_sanitizePortalText_(value, limits[field] || 500);
}

function atividadesV2_adminEditableFieldNames_(activity, model) {
  var fields = Object.keys(ATIVIDADES_V2_ADMIN_EDITABLE_FIELDS_);
  var subtype = atividades_normalizeTextUpper_(activity && activity.SUBTIPO_ATIVIDADE);
  var safeModel = model ? atividades_modelosCriacaoToSafeModel_(model) : null;
  if (subtype === 'APRESENTACAO_MEMBRO') fields = fields.filter(function(field) { return field !== 'tituloPublico'; });
  if (safeModel && safeModel.responsavelInternoAutomatico) fields = fields.filter(function(field) { return field !== 'responsavelInterno'; });
  return fields;
}

function atividadesV2_adminFindForbiddenFields_(payload) {
  var forbidden = [];
  var upperKeys = {};
  Object.keys(payload || {}).forEach(function(key) { upperKeys[String(key).toUpperCase()] = true; });
  ATIVIDADES_V2_ADMIN_SENSITIVE_FIELDS_.forEach(function(header) {
    var camel = header.toLowerCase().replace(/_([a-z])/g, function(_, char) { return char.toUpperCase(); });
    if (upperKeys[header] || Object.prototype.hasOwnProperty.call(payload || {}, camel)) forbidden.push(header);
  });
  return forbidden;
}

function atividadesV2_adminBuildListItem_(row, presentationPending, arquivosIndex, config) {
  var pending = atividadesV2_adminBuildPending_(row, Array.isArray(presentationPending) ? presentationPending : [], arquivosIndex || {}, config || {});
  return {
    idAtividade: String(row.ID_ATIVIDADE || '').trim(),
    ciclo: String(row.CICLO || '').trim(),
    dataAtividade: atividades_formatPortalDateIso_(row.DATA_ATIVIDADE),
    horarioInicio: row.HORARIO_INICIO || '',
    horarioFim: row.HORARIO_FIM || '',
    tituloPublico: String(row.TITULO_PUBLICO || row.TITULO || 'Atividade do GEAPA').trim(),
    nomeModeloPortal: String(row.NOME_MODELO_PORTAL_SNAPSHOT || '').trim(),
    tipoAtividade: String(row.TIPO_ATIVIDADE || '').trim(),
    subtipoAtividade: String(row.SUBTIPO_ATIVIDADE || '').trim(),
    nomePessoaPrincipalPublico: String(row.NOME_PESSOA_PRINCIPAL_PUBLICO || '').trim(),
    statusOperacional: String(row.STATUS_OPERACIONAL || '').trim(),
    statusPublicacaoPortal: String(row.STATUS_PUBLICACAO_PORTAL || '').trim(),
    visibilidadePortal: String(row.VISIBILIDADE_PORTAL || '').trim(),
    statusEixoTematico: String(row.STATUS_EIXO_TEMATICO || '').trim(),
    pendenciaMaterial: pending.some(function(item) { return item.tipo === 'MATERIAL'; }),
    pendenciaFotoReuniao: pending.some(function(item) { return item.tipo === 'FOTO_REUNIAO'; }),
    pendencias: pending.map(function(item) { return item.tipo; }),
    ativo: atividades_normalizeTextUpper_(row.ATIVO || 'SIM') !== 'NAO',
    idConfigModelo: String(row.ID_CONFIG_MODELO || '').trim(),
    atualizadoEm: row.ATUALIZADO_EM || ''
  };
}

function atividadesV2_adminBuildDetailActivity_(row, model) {
  var safe = atividadesV2_adminBuildListItem_(row, null);
  safe.descricaoPublica = String(row.DESCRICAO_PUBLICA || '').trim();
  safe.descricaoInterna = String(row.DESCRICAO || '').trim();
  safe.local = String(row.LOCAL || '').trim();
  safe.formato = String(row.FORMATO || '').trim();
  safe.responsavelInterno = String(row.RESPONSAVEL_INTERNO || '').trim();
  safe.publicoAlvo = String(row.PUBLICO_ALVO || '').trim();
  safe.observacoes = String(row.OBSERVACOES || '').trim();
  safe.classificacaoReuniao = String(row.CLASSIFICACAO_REUNIAO || '').trim();
  safe.classificacaoAcesso = String(row.CLASSIFICACAO_ACESSO || '').trim();
  safe.contaPresenca = String(row.CONTA_PRESENCA || '').trim();
  safe.contaFalta = String(row.CONTA_FALTA || '').trim();
  safe.geraCertificado = String(row.GERA_CERTIFICADO || '').trim();
  safe.permiteJustificativa = String(row.PERMITE_JUSTIFICATIVA || '').trim();
  safe.exigeListaPresenca = String(row.EXIGE_LISTA_PRESENCA || '').trim();
  safe.exigeMaterial = String(row.EXIGE_MATERIAL || '').trim();
  safe.cargaHoraria = row.CARGA_HORARIA || '';
  safe.modeloResponsavelAutomatico = !!(model && atividades_modelosCriacaoToSafeModel_(model).responsavelInternoAutomatico);
  return safe;
}

function atividadesV2_adminBuildPresentation_(row, fotoReuniao) {
  return {
    idApresentacao: String(row.ID_APRESENTACAO || '').trim(),
    statusApresentacao: String(row.STATUS_APRESENTACAO || '').trim(),
    statusTituloEixo: String(row.STATUS_TITULO_EIXO || '').trim(),
    statusMaterial: String(row.STATUS_ENVIO_MATERIAL || '').trim(),
    nomeArquivoMaterial: String(row.NOME_ARQUIVO_MATERIAL || '').trim(),
    linkMaterial: atividades_sanitizePortalUrl_(row.LINK_MATERIAL_APRESENTACAO),
    statusFotoReuniao: String(fotoReuniao && fotoReuniao.STATUS_ARQUIVO || '').trim(),
    nomeArquivoFotoReuniao: String(fotoReuniao && fotoReuniao.NOME_ARQUIVO || '').trim(),
    linkFotoReuniao: atividades_sanitizePortalUrl_(fotoReuniao && fotoReuniao.LINK_ARQUIVO),
    ativo: atividades_normalizeTextUpper_(row.ATIVO || 'SIM') !== 'NAO'
  };
}

function atividadesV2_adminBuildInvolved_(row) {
  return {
    idEnvolvido: String(row.ID_ENVOLVIDO || '').trim(),
    papel: String(row.PAPEL_NA_ATIVIDADE || '').trim(),
    tipoPessoa: String(row.TIPO_PESSOA || '').trim(),
    nomePublico: String(row.NOME_PUBLICO || '').trim(),
    exibirNoPortal: String(row.EXIBIR_NO_PORTAL || '').trim(),
    ativo: atividades_normalizeTextUpper_(row.ATIVO || 'SIM') !== 'NAO'
  };
}

function atividadesV2_adminBuildPending_(activity, presentations, arquivosIndex, config) {
  var operationalStatus = atividades_normalizeTextUpper_(activity.STATUS_OPERACIONAL);
  if (['CANCELADA', 'CANCELADO', 'ARQUIVADA', 'ARQUIVADO'].indexOf(operationalStatus) >= 0) {
    return [];
  }

  var pending = [];
  var axisStatus = atividades_normalizeTextUpper_(activity.STATUS_EIXO_TEMATICO);
  if (['', 'PENDENTE', 'REPROVADO', 'ENVIADO'].indexOf(axisStatus) >= 0 && atividades_normalizeTextUpper_(activity.SUBTIPO_ATIVIDADE) === 'APRESENTACAO_MEMBRO') {
    pending.push({ tipo: 'TITULO_EIXO', status: axisStatus || 'PENDENTE' });
  }
  (presentations || []).forEach(function(row) {
    var material = atividades_normalizeTextUpper_(row.STATUS_ENVIO_MATERIAL);
    if (['RECEBIDO', 'APROVADO', 'PUBLICADO', 'NAO_SE_APLICA'].indexOf(material) < 0) pending.push({ tipo: 'MATERIAL', status: material || 'PENDENTE' });
    var rules = typeof atividadesV2_resolveFotoReuniaoRules_ === 'function'
      ? atividadesV2_resolveFotoReuniaoRules_(activity, config || {})
      : { exigeFoto: false };
    if (rules.exigeFoto) {
      var photo = typeof atividadesV2_getLatestArquivoFromIndex_ === 'function'
        ? atividadesV2_getLatestArquivoFromIndex_(arquivosIndex || {}, activity.ID_ATIVIDADE, row.ID_APRESENTACAO, ATIVIDADES_V2_TIPO_ARQUIVO_FOTO_)
        : null;
      var photoStatus = atividades_normalizeTextUpper_(photo && photo.STATUS_ARQUIVO || 'PENDENTE');
      if (['RECEBIDO', 'APROVADO', 'HISTORICO', 'DISPENSADO'].indexOf(photoStatus) < 0) pending.push({ tipo: 'FOTO_REUNIAO', status: photoStatus });
    }
  });
  var unique = {};
  return pending.filter(function(item) { var key = item.tipo + ':' + item.status; if (unique[key]) return false; unique[key] = true; return true; });
}

function atividadesV2_adminIndexPresentationPending_(rows) {
  var index = {};
  (rows || []).forEach(function(row) {
    var id = String(row.ID_ATIVIDADE || '').trim();
    if (!id) return;
    if (!index[id]) index[id] = [];
    index[id].push(row);
  });
  return index;
}

function atividadesV2_adminReadLastActions_(ss, idAtividade) {
  var sheet = ss.getSheetByName(ATIVIDADES_V2_SHEETS.PORTAL_ACOES);
  if (!sheet) return [];
  var headers = atividadesV2_getSheetHeaders_(sheet);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var startRow = Math.max(2, lastRow - 499);
  var rows = sheet.getRange(startRow, 1, lastRow - startRow + 1, headers.length).getValues().map(function(values, index) {
    return atividadesV2_rowToObject_(headers, values, startRow + index);
  });
  return rows.filter(function(row) {
    return String(row.ID_ATIVIDADE || '').trim() === idAtividade;
  }).sort(function(a, b) {
    return atividadesV2_adminTimestamp_(b.DATA_HORA) - atividadesV2_adminTimestamp_(a.DATA_HORA);
  }).slice(0, 8).map(function(row) {
    return { tipoAcao: String(row.TIPO_ACAO || '').trim(), status: String(row.STATUS_PROCESSAMENTO || '').trim(), dataHora: row.DATA_HORA || '' };
  });
}

function atividadesV2_adminBuildFilterOptions_(activities) {
  function values(header) {
    var seen = {};
    (activities || []).forEach(function(row) { var value = String(row[header] || '').trim(); if (value) seen[value] = true; });
    return Object.keys(seen).sort();
  }
  return {
    statusOperacionais: values('STATUS_OPERACIONAL'),
    statusPublicacao: values('STATUS_PUBLICACAO_PORTAL'),
    visibilidades: values('VISIBILIDADE_PORTAL'),
    ciclos: values('CICLO'),
    modelos: values('ID_CONFIG_MODELO'),
    tipos: values('TIPO_ATIVIDADE'),
    subtipos: values('SUBTIPO_ATIVIDADE')
  };
}

function atividadesV2_adminNormalizeFilters_(filters) {
  var f = filters || {};
  return {
    statusOperacional: atividades_normalizeTextUpper_(f.statusOperacional),
    statusPublicacao: atividades_normalizeTextUpper_(f.statusPublicacao || f.statusPublicacaoPortal),
    visibilidade: atividades_normalizeTextUpper_(f.visibilidade || f.visibilidadePortal),
    ciclo: String(f.ciclo || '').trim(),
    modelo: String(f.modelo || f.idConfigModelo || '').trim(),
    tipo: atividades_normalizeTextUpper_(f.tipo || f.tipoAtividade),
    subtipo: atividades_normalizeTextUpper_(f.subtipo || f.subtipoAtividade),
    pendencia: atividades_normalizeTextUpper_(f.pendencia),
    texto: String(f.texto || f.busca || '').trim().toLowerCase()
  };
}

function atividadesV2_adminMatchesFilters_(item, filters) {
  if (filters.statusOperacional && atividades_normalizeTextUpper_(item.statusOperacional) !== filters.statusOperacional) return false;
  if (filters.statusPublicacao && atividades_normalizeTextUpper_(item.statusPublicacaoPortal) !== filters.statusPublicacao) return false;
  if (filters.visibilidade && atividades_normalizeTextUpper_(item.visibilidadePortal) !== filters.visibilidade) return false;
  if (filters.ciclo && item.ciclo !== filters.ciclo) return false;
  if (filters.modelo && item.idConfigModelo !== filters.modelo) return false;
  if (filters.tipo && atividades_normalizeTextUpper_(item.tipoAtividade) !== filters.tipo) return false;
  if (filters.subtipo && atividades_normalizeTextUpper_(item.subtipoAtividade) !== filters.subtipo) return false;
  if (filters.pendencia && item.pendencias.indexOf(filters.pendencia) < 0) return false;
  if (filters.texto) {
    var haystack = [item.idAtividade, item.tituloPublico, item.nomeModeloPortal, item.nomePessoaPrincipalPublico, item.tipoAtividade, item.subtipoAtividade].join(' ').toLowerCase();
    if (haystack.indexOf(filters.texto) < 0) return false;
  }
  return true;
}

function atividadesV2_adminSortActivities_(a, b) {
  var aTime = atividadesV2_adminTimestamp_(a.dataAtividade);
  var bTime = atividadesV2_adminTimestamp_(b.dataAtividade);
  if (aTime !== bTime) return bTime - aTime;
  return String(b.idAtividade || '').localeCompare(String(a.idAtividade || ''));
}

function atividadesV2_adminWriteRowBatch_(sheet, rowNumber, updates) {
  var headers = atividadesV2_getSheetHeaders_(sheet);
  var range = sheet.getRange(rowNumber, 1, 1, headers.length);
  var values = range.getValues()[0];
  headers.forEach(function(header, index) {
    if (Object.prototype.hasOwnProperty.call(updates || {}, header)) values[index] = updates[header];
  });
  range.setValues([values]);
}

function atividadesV2_adminLogMutation_(ss, action, idAtividade, before, after, contexto) {
  var now = new Date();
  var details = { idAtividade: idAtividade, antes: before, depois: after };
  atividadesV2_appendV2Log_(ss, {
    FLUXO: 'PORTAL_ATIVIDADES_GESTAO_DEV', ACAO: action, NIVEL: 'INFO', STATUS: 'OK',
    ID_ATIVIDADE: idAtividade, ID_ENTIDADE: idAtividade, TIPO_ENTIDADE: 'ATIVIDADE',
    MENSAGEM: 'Acao administrativa concluida na atividade V2 DEV.', DETALHES_JSON: atividadesV2_safeLogData_(details)
  });
  atividadesV2_portalAppendAcao_(ss, {
    ID_ACAO_PORTAL: atividadesV2_buildDeterministicId_('AACT', [action, idAtividade, now.getTime()]),
    DATA_HORA: now, USUARIO_EMAIL: contexto.email || '', USUARIO_NOME: '', PERFIL_USUARIO: contexto.perfil || '',
    TIPO_ACAO: action, ID_ATIVIDADE: idAtividade, ID_ENTIDADE: idAtividade, TIPO_ENTIDADE: 'ATIVIDADE',
    PAYLOAD_JSON: atividadesV2_safeLogData_(details), STATUS_PROCESSAMENTO: 'CONCLUIDO',
    RESULTADO_JSON: atividadesV2_safeLogData_({ ok: true, idAtividade: idAtividade }),
    PROCESSADO_EM: now, PROCESSADO_POR: atividadesV2_portalActorToken_(contexto), ATIVO: 'SIM'
  });
}

function atividadesV2_adminSnapshot_(row) {
  return {
    idAtividade: String(row.ID_ATIVIDADE || '').trim(),
    ciclo: String(row.CICLO || '').trim(),
    dataAtividade: atividades_formatPortalDateIso_(row.DATA_ATIVIDADE),
    tituloPublico: String(row.TITULO_PUBLICO || '').trim(),
    statusOperacional: String(row.STATUS_OPERACIONAL || '').trim(),
    statusPublicacaoPortal: String(row.STATUS_PUBLICACAO_PORTAL || '').trim(),
    visibilidadePortal: String(row.VISIBILIDADE_PORTAL || '').trim(),
    subtipoAtividade: String(row.SUBTIPO_ATIVIDADE || '').trim()
  };
}

function atividadesV2_adminInvalidateCaches_(idAtividade, before, after) {
  atividadesV2_invalidateCachesAfterActivityCreate_(idAtividade, after);
  if (typeof atividades_modelosCriacaoInvalidatePresenterCachesForChange_ === 'function') {
    atividades_modelosCriacaoInvalidatePresenterCachesForChange_(before, after);
  }
}

function atividadesV2_adminRefreshViewsSafe_(idAtividade, reason, contexto) {
  try {
    return {
      viewsAtualizadas: atividadesV2_refreshViewsAfterActivityCreate_({
        idAtividade: idAtividade,
        reason: reason,
        contexto: contexto || {}
      }),
      aviso: ''
    };
  } catch (err) {
    return { viewsAtualizadas: null, aviso: 'Alteracao salva; atualizacao das views deve ser repetida manualmente.' };
  }
}

function atividadesV2_adminSuccessMutation_(message, activity) {
  return {
    ok: true,
    message: message,
    data: {
      atividade: atividadesV2_adminBuildListItem_(activity, null),
      idAtividade: String(activity.ID_ATIVIDADE || '').trim(),
      modo: 'DEV'
    }
  };
}

function atividadesV2_adminFindByActivityId_(ss, sheetName, idAtividade) {
  return atividadesV2_adminFindInRows_(atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, sheetName)), idAtividade);
}

function atividadesV2_adminFindInRows_(rows, idAtividade) {
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].ID_ATIVIDADE || '').trim() === idAtividade) return rows[i];
  }
  return null;
}

function atividadesV2_adminNormalizeActivityId_(value) {
  var id = String(value || '').trim().toUpperCase();
  return /^ATV-\d{4}-[12]-\d{4}$/.test(id) ? id : '';
}

function atividadesV2_adminTimestamp_(value) {
  var date = atividades_parseDateOrNull_(value);
  return date ? date.getTime() : 0;
}

function atividadesV2_adminCanManage_(contexto) {
  var ctx = contexto || {};
  var profile = atividades_modelosCriacaoNormalizeProfile_(ctx.perfil);
  var profiles = [profile].concat(ctx.perfisPortal || []).map(atividades_modelosCriacaoNormalizeProfile_);
  var permissions = (ctx.permissoes || []).map(function(item) { return String(item || '').trim().toLowerCase(); });
  return profiles.some(function(item) { return ['SECRETARIO', 'DIRETORIA', 'ADMIN_TECNICO'].indexOf(item) >= 0; }) ||
    permissions.indexOf('atividades:gerir') >= 0 || permissions.indexOf('sistema:admin') >= 0;
}

function atividadesV2_adminPermissionError_() {
  return atividadesV2_adminError_('PERMISSAO_NEGADA', 'Seu perfil nao possui permissao para gerenciar atividades.');
}

function atividadesV2_adminError_(code, message, extra) {
  return Object.assign({ ok: false, errorCode: code, message: message }, extra || {});
}

function atividadesV2_adminErrorResponse_(err, code, message) {
  Logger.log('GEAPA-ATIVIDADES-V2-ADMIN erro: ' + atividadesV2_safeLogData_({ codigo: code, erro: atividadesV2_errorMessage_(err).slice(0, 300) }));
  return atividadesV2_adminError_(err && (err.code || err.errorCode) || code, message, { detalhes: atividadesV2_errorMessage_(err).slice(0, 300) });
}

function atividadesV2_runTesteGestaoAtividadesAdminDev_() {
  var ctx = { perfil: 'ADMIN_TECNICO', email: 'teste-dev@geapa.local', permissoes: ['atividades:gerir'] };
  var list = atividadesV2_portalListarAtividadesAdmin_({}, ctx);
  if (!list.ok || !list.data.atividades.length) return list;
  var id = list.data.atividades[0].idAtividade;
  var drafts = list.data.atividades.filter(function(item) {
    return atividades_normalizeTextUpper_(item.statusPublicacaoPortal) === 'RASCUNHO';
  });
  var draftBlockedFromPublicAgenda = drafts.every(function(item) {
    return !atividades_canShowActivityInPortal_({
      ID_ATIVIDADE: item.idAtividade,
      STATUS_PUBLICO: 'RASCUNHO',
      VISIBILIDADE_PORTAL: item.visibilidadePortal || 'DIRETORIA'
    }, ctx);
  });
  return {
    ok: draftBlockedFromPublicAgenda,
    listagem: { total: list.data.total, primeiroId: id },
    separacaoAgendaGestao: {
      rascunhosNaGestao: drafts.length,
      rascunhosBloqueadosNaAgenda: draftBlockedFromPublicAgenda
    },
    detalhe: atividadesV2_portalGetDetalheAtividadeAdmin_(id, ctx),
    validacaoSemEscrita: atividadesV2_portalValidarEdicaoAtividadeAdmin_({ idAtividade: id, campos: {} }, ctx),
    escritaRealizada: false,
    modo: 'DEV'
  };
}
