/**
 * Jobs V2 de cobrancas, lembretes e convites pelo Mail Hub do GEAPA_CORE.
 *
 * Diagnosticos apenas montam o plano. Processamentos enfileiram contratos em
 * MAIL_SAIDA e nunca enviam diretamente pelo modulo Atividades.
 */

var ATIVIDADES_V2_MAIL_JOB_EVENTS_ = Object.freeze({
  APRESENTACAO_COBRAR_TITULO_EIXO: Object.freeze({
    moduleName: 'APRESENTACOES', moduleCode: 'APR', entityType: 'APRESENTACAO',
    flowCode: 'TITULO_EIXO', stage: 'COBRAR_TITULO_EIXO',
    subjectHuman: 'Pendencia de titulo e eixos da apresentacao'
  }),
  APRESENTACAO_COBRAR_MATERIAL: Object.freeze({
    moduleName: 'APRESENTACOES', moduleCode: 'APR', entityType: 'APRESENTACAO',
    flowCode: 'MATERIAL', stage: 'COBRAR_MATERIAL',
    subjectHuman: 'Pendencia de slide ou material da apresentacao'
  }),
  APRESENTACAO_COBRAR_FOTO_REUNIAO: Object.freeze({
    moduleName: 'APRESENTACOES', moduleCode: 'APR', entityType: 'APRESENTACAO',
    flowCode: 'FOTO', stage: 'COBRAR_FOTO_REUNIAO',
    subjectHuman: 'Pendencia de foto da reuniao'
  }),
  APRESENTACAO_LEMBRETE_APRESENTADOR: Object.freeze({
    moduleName: 'APRESENTACOES', moduleCode: 'APR', entityType: 'APRESENTACAO',
    flowCode: 'LEMBRETE', stage: 'LEMBRETE_APRESENTADOR',
    subjectHuman: 'Lembrete da sua apresentacao no GEAPA'
  }),
  APRESENTACAO_PENDENCIAS_SECRETARIA: Object.freeze({
    moduleName: 'APRESENTACOES', moduleCode: 'APR', entityType: 'ATIVIDADE',
    flowCode: 'PENDENCIAS', stage: 'PENDENCIAS_SECRETARIA',
    subjectHuman: 'Pendencias criticas de apresentacao'
  }),
  ATIVIDADE_LEMBRETE_MEMBROS: Object.freeze({
    moduleName: 'ATIVIDADES', moduleCode: 'ATV', entityType: 'ATIVIDADE',
    flowCode: 'LEMBRETE', stage: 'LEMBRETE_MEMBROS',
    subjectHuman: 'Lembrete de atividade do GEAPA'
  }),
  ATIVIDADE_CONVITE_PROFESSOR: Object.freeze({
    moduleName: 'ATIVIDADES', moduleCode: 'ATV', entityType: 'ATIVIDADE',
    flowCode: 'CONVITE', stage: 'CONVITE_PROFESSOR',
    subjectHuman: 'Convite para atividade do GEAPA'
  }),
  ATIVIDADE_LEMBRETE_PROFESSOR: Object.freeze({
    moduleName: 'ATIVIDADES', moduleCode: 'ATV', entityType: 'ATIVIDADE',
    flowCode: 'LEMBRETE', stage: 'LEMBRETE_PROFESSOR',
    subjectHuman: 'Lembrete de atividade do GEAPA'
  }),
  ATIVIDADE_CONVITE_CONVIDADO: Object.freeze({
    moduleName: 'ATIVIDADES', moduleCode: 'ATV', entityType: 'ATIVIDADE',
    flowCode: 'CONVITE', stage: 'CONVITE_CONVIDADO',
    subjectHuman: 'Convite para atividade do GEAPA'
  }),
  ATIVIDADE_LEMBRETE_CONVIDADO: Object.freeze({
    moduleName: 'ATIVIDADES', moduleCode: 'ATV', entityType: 'ATIVIDADE',
    flowCode: 'LEMBRETE', stage: 'LEMBRETE_CONVIDADO',
    subjectHuman: 'Lembrete de atividade do GEAPA'
  })
});

var ATIVIDADES_V2_MAIL_JOBS_DEFAULTS_ = Object.freeze({
  MAIL_JOBS_ATIVOS: 'NAO',
  MAIL_COBRANCA_TITULO_EIXO_ATIVA: 'SIM',
  MAIL_COBRANCA_MATERIAL_ATIVA: 'SIM',
  MAIL_COBRANCA_FOTO_ATIVA: 'SIM',
  MAIL_LEMBRETE_APRESENTADOR_ATIVO: 'SIM',
  MAIL_LEMBRETE_MEMBROS_ATIVO: 'SIM',
  MAIL_CONVITE_PROFESSOR_ATIVO: 'SIM',
  MAIL_LEMBRETE_PROFESSOR_ATIVO: 'SIM',
  MAIL_DIAS_ANTES_COBRANCA_TITULO_EIXO: 14,
  MAIL_DIAS_ANTES_COBRANCA_MATERIAL: 7,
  MAIL_DIAS_ANTES_LEMBRETE_APRESENTADOR: 3,
  MAIL_DIAS_ANTES_LEMBRETE_MEMBROS: 1,
  MAIL_DIAS_ANTES_CONVITE_PROFESSOR: 14,
  MAIL_DIAS_ANTES_LEMBRETE_PROFESSOR: 2,
  MAIL_INTERVALO_HORAS_COBRANCA_TITULO_EIXO: 48,
  MAIL_INTERVALO_HORAS_COBRANCA_MATERIAL: 48,
  MAIL_INTERVALO_HORAS_COBRANCA_FOTO: 48,
  MAIL_MAX_COBRANCAS_TITULO_EIXO: 3,
  MAIL_MAX_COBRANCAS_MATERIAL: 3,
  MAIL_MAX_COBRANCAS_FOTO: 2,
  MAIL_DIAS_MAX_APOS_COBRANCA_FOTO: 30,
  MAIL_DIAS_ANTES_PENDENCIA_CRITICA: 3,
  MAIL_JOB_BATCH_LIMIT: 25,
  MAIL_JOB_MODO_TESTE: 'SIM',
  MAIL_JOB_EMAIL_TESTE: ''
});

var ATIVIDADES_V2_MAIL_JOB_SCOPES_ = Object.freeze({
  COBRANCAS: ['APRESENTACAO_COBRAR_TITULO_EIXO', 'APRESENTACAO_COBRAR_MATERIAL', 'APRESENTACAO_COBRAR_FOTO_REUNIAO'],
  LEMBRETES: ['APRESENTACAO_LEMBRETE_APRESENTADOR', 'ATIVIDADE_LEMBRETE_MEMBROS'],
  PENDENCIAS: ['APRESENTACAO_PENDENCIAS_SECRETARIA'],
  CONVITES: ['ATIVIDADE_CONVITE_PROFESSOR', 'ATIVIDADE_LEMBRETE_PROFESSOR', 'ATIVIDADE_CONVITE_CONVIDADO', 'ATIVIDADE_LEMBRETE_CONVIDADO']
});
var ATIVIDADES_V2_MAIL_JOB_CONFIG_CACHE_KEY_ = 'atividades:v2:mail-jobs:config:v1';
var ATIVIDADES_V2_MAIL_JOB_CONFIG_CACHE_TTL_ = 300;

/** Enfileira um unico evento de job sem processar a outbox. */
function atividadesV2_mailQueueJobEvent_(eventCode, context) {
  var code = atividades_normalizeTextUpper_(eventCode);
  var definition = ATIVIDADES_V2_MAIL_JOB_EVENTS_[code];
  var ctx = context || {};
  if (!definition) return { ok: false, errorCode: 'EVENTO_JOB_NAO_SUPORTADO', eventCode: code };
  try {
    if (typeof GEAPA_CORE === 'undefined' || !GEAPA_CORE || typeof GEAPA_CORE.coreMailQueueOutgoing !== 'function') {
      return { ok: false, errorCode: 'MAIL_HUB_INDISPONIVEL', eventCode: code };
    }
    var to = atividadesV2_mailNormalizeEmails_(ctx.to || []);
    if (!to.length) return { ok: false, errorCode: 'DESTINATARIOS_MAIL_AUSENTES', eventCode: code };
    var correlationKey = String(ctx.correlationKey || '').trim();
    if (!correlationKey) return { ok: false, errorCode: 'CORRELATION_KEY_OBRIGATORIA', eventCode: code };
    var queueResult = GEAPA_CORE.coreMailQueueOutgoing({
      moduleName: definition.moduleName,
      templateKey: 'GEAPA_OPERACIONAL',
      correlationKey: correlationKey,
      entityType: definition.entityType,
      entityId: String(ctx.entityId || '').trim(),
      flowCode: definition.flowCode,
      stage: definition.stage,
      to: to,
      cc: [],
      bcc: [],
      recipientName: atividades_sanitizePortalText_(ctx.recipientName || '', 180),
      subjectHuman: definition.subjectHuman,
      payload: ctx.payload || {},
      priority: ctx.priority || 'NORMAL',
      forceQueueDuplicate: ctx.forceQueueDuplicate === true,
      metadata: Object.assign({
        source: 'geapa-atividades-v2-mail-job',
        mode: 'DEV',
        eventCode: code,
        idAtividade: String(ctx.idAtividade || '').trim(),
        idApresentacao: String(ctx.idApresentacao || '').trim(),
        recipientSource: String(ctx.recipientSource || '').trim(),
        fallbackUsed: ctx.fallbackUsed === true,
        jobWindow: String(ctx.jobWindow || '').trim()
      }, ctx.metadata || {})
    }) || {};
    return {
      ok: queueResult.ok !== false,
      eventCode: code,
      queued: queueResult.queued === true,
      duplicate: queueResult.duplicate === true,
      requeued: queueResult.requeued === true,
      saidaId: String(queueResult.saidaId || '').trim(),
      status: String(queueResult.status || '').trim(),
      correlationKey: String(queueResult.correlationKey || correlationKey).trim()
    };
  } catch (err) {
    return {
      ok: false,
      eventCode: code,
      errorCode: 'ERRO_ENFILEIRAR_JOB_MAIL_HUB',
      message: atividadesV2_errorMessage_(err).slice(0, 300),
      correlationKey: String(ctx.correlationKey || '').trim()
    };
  }
}

function atividadesV2_mailJobsReadConfig_(options) {
  var opts = options || {};
  var overrides = opts.config || {};
  var result = atividadesV2_mailJobsReadBaseConfig_(opts.forceRefreshConfig === true);
  Object.keys(ATIVIDADES_V2_MAIL_JOBS_DEFAULTS_).forEach(function(key) {
    var value = Object.prototype.hasOwnProperty.call(overrides, key) ? overrides[key] : result[key];
    if (typeof ATIVIDADES_V2_MAIL_JOBS_DEFAULTS_[key] === 'number') {
      var numericValue = Number(value);
      value = isFinite(numericValue) ? numericValue : ATIVIDADES_V2_MAIL_JOBS_DEFAULTS_[key];
    }
    result[key] = value;
  });
  result.MAIL_JOB_BATCH_LIMIT = atividadesV2_mailJobsLimit_(opts.limit || result.MAIL_JOB_BATCH_LIMIT);
  result.MAIL_JOB_EMAIL_TESTE = String(opts.emailTeste || result.MAIL_JOB_EMAIL_TESTE || '').trim();
  return result;
}

function atividadesV2_mailJobsReadBaseConfig_(forceRefresh) {
  var cache = null;
  try {
    cache = CacheService.getScriptCache();
    if (!forceRefresh) {
      var cached = cache.get(ATIVIDADES_V2_MAIL_JOB_CONFIG_CACHE_KEY_);
      if (cached) return JSON.parse(cached);
    }
  } catch (cacheErr) {}

  var props = PropertiesService.getScriptProperties();
  var result = {};
  Object.keys(ATIVIDADES_V2_MAIL_JOBS_DEFAULTS_).forEach(function(key) {
    var value = '';
    try {
      if (typeof GEAPA_CORE !== 'undefined' && GEAPA_CORE && typeof GEAPA_CORE.coreGetGeapaConfigValue === 'function') {
        value = GEAPA_CORE.coreGetGeapaConfigValue(key, { defaultValue: '' });
      }
    } catch (coreErr) {}
    if (value === '' || value === null || value === undefined) value = props.getProperty(key);
    if (value === '' || value === null || value === undefined) value = ATIVIDADES_V2_MAIL_JOBS_DEFAULTS_[key];
    result[key] = value;
  });
  try {
    if (cache) cache.put(ATIVIDADES_V2_MAIL_JOB_CONFIG_CACHE_KEY_, JSON.stringify(result), ATIVIDADES_V2_MAIL_JOB_CONFIG_CACHE_TTL_);
  } catch (putErr) {}
  return result;
}

function atividadesV2_mailJobsLimit_(value) {
  var limit = Math.floor(Number(value || 25));
  if (!isFinite(limit) || limit < 1) limit = 25;
  return Math.min(limit, 100);
}

function atividadesV2_mailJobsEnabled_(config, key) {
  return atividades_normalizeTextUpper_(config && config[key]) === 'SIM';
}

function atividadesV2_mailJobsReadData_() {
  var ss = atividadesV2_getDatabaseSpreadsheetDev_();
  var atividadesSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES);
  var apresentacoesSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.APRESENTACOES);
  var envolvidosSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ENVOLVIDOS);
  var configSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.CONFIG);
  return {
    ss: ss,
    atividadesSheet: atividadesSheet,
    apresentacoesSheet: apresentacoesSheet,
    atividades: atividadesV2_readSheetObjects_(atividadesSheet),
    apresentacoes: atividadesV2_readSheetObjects_(apresentacoesSheet),
    arquivos: atividadesV2_readArquivosAtividadeOptional_(ss),
    envolvidos: atividadesV2_readSheetObjects_(envolvidosSheet),
    configs: atividadesV2_readSheetObjects_(configSheet)
  };
}

function atividadesV2_mailJobsBuildPlan_(scope, options) {
  var opts = options || {};
  var config = atividadesV2_mailJobsReadConfig_(opts);
  var data = atividadesV2_mailJobsReadData_();
  var now = atividades_parseDateOrNull_(opts.agora || opts.now) || new Date();
  var plan = {
    ok: true,
    modo: 'DEV',
    dryRun: true,
    scope: atividades_normalizeTextUpper_(scope || 'TODOS'),
    config: atividadesV2_mailJobsSafeConfig_(config),
    totalAnalisado: data.atividades.length + data.apresentacoes.length + data.envolvidos.length,
    totalElegivel: 0,
    totalBloqueado: 0,
    totalQueSeriaEnfileirado: 0,
    motivosBloqueio: {},
    items: [],
    exemplosElegiveis: [],
    exemplosBloqueados: [],
    avisos: [],
    erros: [],
    _data: data,
    _config: config,
    _now: now
  };
  var activityFilter = String(opts.idAtividade || '').trim();
  var presentationFilter = String(opts.idApresentacao || '').trim();
  if (opts.forceReenvio === true && !activityFilter) {
    plan.avisos.push('forceReenvio ignorado: informe idAtividade para um reenvio controlado.');
  }
  var activitiesById = atividadesV2_indexByField_(data.atividades, 'ID_ATIVIDADE');
  var configByActivity = {};
  data.atividades.forEach(function(activity) {
    configByActivity[String(activity.ID_ATIVIDADE || '').trim()] = atividadesV2_findConfigForActivityFromRows_(data.configs, activity) || {};
  });
  var filesByEntity = atividadesV2_mailJobsIndexFiles_(data.arquivos);
  var allowedEvents = atividadesV2_mailJobsEventsForScope_(plan.scope);

  data.apresentacoes.forEach(function(presentation) {
    var idApresentacao = String(presentation.ID_APRESENTACAO || '').trim();
    var idAtividade = String(presentation.ID_ATIVIDADE || '').trim();
    if (presentationFilter && idApresentacao !== presentationFilter) return;
    if (activityFilter && idAtividade !== activityFilter) return;
    var activity = activitiesById[idAtividade] || {};
    var activityConfig = configByActivity[idAtividade] || {};
    var context = {
      activity: activity,
      presentation: presentation,
      activityConfig: activityConfig,
      files: atividadesV2_mailJobsFilesForPresentation_(filesByEntity, idAtividade, idApresentacao),
      now: now,
      config: config,
      options: opts
    };
    if (allowedEvents.APRESENTACAO_COBRAR_TITULO_EIXO) atividadesV2_mailJobsPlanTitleCharge_(plan, context);
    if (allowedEvents.APRESENTACAO_COBRAR_MATERIAL) atividadesV2_mailJobsPlanMaterialCharge_(plan, context);
    if (allowedEvents.APRESENTACAO_COBRAR_FOTO_REUNIAO) atividadesV2_mailJobsPlanPhotoCharge_(plan, context);
    if (allowedEvents.APRESENTACAO_LEMBRETE_APRESENTADOR) atividadesV2_mailJobsPlanPresenterReminder_(plan, context);
  });

  if (allowedEvents.APRESENTACAO_PENDENCIAS_SECRETARIA) {
    atividadesV2_mailJobsPlanSecretaryPending_(plan, data, activitiesById, configByActivity, filesByEntity, now, opts);
  }
  if (allowedEvents.ATIVIDADE_LEMBRETE_MEMBROS) {
    atividadesV2_mailJobsPlanMemberReminders_(plan, data, configByActivity, now, opts);
  }
  if (allowedEvents.ATIVIDADE_CONVITE_PROFESSOR) {
    atividadesV2_mailJobsPlanInvites_(plan, data, activitiesById, now, opts);
  }

  plan.totalElegivel = plan.items.length;
  plan.totalQueSeriaEnfileirado = Math.min(plan.items.length, config.MAIL_JOB_BATCH_LIMIT);
  plan.totalDestinatariosPlanejados = plan.items.reduce(function(total, item) {
    return total + (item.to || []).length;
  }, 0);
  plan.items.slice(0, config.MAIL_JOB_BATCH_LIMIT).forEach(function(item) {
    plan.exemplosElegiveis.push(atividadesV2_mailJobsSafeItem_(item));
  });
  if (plan.items.length > config.MAIL_JOB_BATCH_LIMIT) {
    plan.avisos.push('Plano limitado a ' + config.MAIL_JOB_BATCH_LIMIT + ' eventos por execucao.');
  }
  return plan;
}

function atividadesV2_mailJobsEventsForScope_(scope) {
  var result = {};
  var normalized = atividades_normalizeTextUpper_(scope || 'TODOS');
  var events = normalized === 'TODOS'
    ? Object.keys(ATIVIDADES_V2_MAIL_JOB_EVENTS_)
    : (ATIVIDADES_V2_MAIL_JOB_SCOPES_[normalized] || []);
  events.forEach(function(eventCode) { result[eventCode] = true; });
  return result;
}

function atividadesV2_mailJobsSafeConfig_(config) {
  var safe = {};
  Object.keys(config || {}).forEach(function(key) {
    safe[key] = key === 'MAIL_JOB_EMAIL_TESTE'
      ? (config[key] ? atividadesV2_mailMaskEmail_(config[key]) : '')
      : config[key];
  });
  return safe;
}

function atividadesV2_mailJobsIndexFiles_(files) {
  var index = {};
  (files || []).forEach(function(file) {
    if (atividades_normalizeTextUpper_(file.ATIVO || 'SIM') === 'NAO') return;
    var key = String(file.ID_ATIVIDADE || '').trim() + '|' + String(file.ID_APRESENTACAO || '').trim();
    if (!index[key]) index[key] = [];
    index[key].push(file);
  });
  return index;
}

function atividadesV2_mailJobsFilesForPresentation_(index, idAtividade, idApresentacao) {
  var activityId = String(idAtividade || '').trim();
  var presentationId = String(idApresentacao || '').trim();
  var exact = (index && index[activityId + '|' + presentationId]) || [];
  if (!presentationId) return exact.slice();
  var activityOnly = (index && index[activityId + '|']) || [];
  var seen = {};
  return exact.concat(activityOnly).filter(function(file) {
    var key = String(file.ID_ARQUIVO_ATIVIDADE || file.ID_ARQUIVO_DRIVE || file.LINK_ARQUIVO || file._rowNumber || '').trim();
    if (!key) return true;
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function atividadesV2_mailJobsBlock_(plan, reason, context) {
  var code = String(reason || 'NAO_ELEGIVEL').trim();
  plan.totalBloqueado++;
  plan.motivosBloqueio[code] = Number(plan.motivosBloqueio[code] || 0) + 1;
  if (plan.exemplosBloqueados.length < 10 && context) {
    plan.exemplosBloqueados.push({
      bloqueado: true,
      motivo: code,
      idAtividade: String(context.idAtividade || '').trim(),
      idApresentacao: String(context.idApresentacao || '').trim()
    });
  }
}

function atividadesV2_mailJobsPush_(plan, item) {
  var config = plan._config;
  var testEmail = String(config.MAIL_JOB_EMAIL_TESTE || '').trim();
  var originalTo = atividadesV2_mailNormalizeEmails_(item.to || []);
  item.to = testEmail ? atividadesV2_mailNormalizeEmails_([testEmail]) : originalTo;
  item.recipientSource = testEmail ? 'EMAIL_TESTE_DEV' : (item.recipientSource || 'ATIVIDADES_V2');
  item.destinatariosOriginais = originalTo.length;
  if (!item.to.length) {
    atividadesV2_mailJobsBlock_(plan, 'SEM_DESTINATARIO_VALIDO', item);
    return;
  }
  plan.items.push(item);
}

function atividadesV2_mailJobsSafeItem_(item) {
  return {
    eventCode: item.eventCode,
    idAtividade: item.idAtividade || '',
    idApresentacao: item.idApresentacao || '',
    correlationKey: item.correlationKey,
    destinatariosMascarados: (item.to || []).map(atividadesV2_mailMaskEmail_),
    recipientSource: item.recipientSource || '',
    fallbackUsed: item.fallbackUsed === true
  };
}

function atividadesV2_mailJobsPlanTitleCharge_(plan, context) {
  if (!atividadesV2_mailJobsEnabled_(context.config, 'MAIL_COBRANCA_TITULO_EIXO_ATIVA')) return;
  var reason = atividadesV2_mailJobsBasePresentationBlockReason_(context, true);
  if (reason) return atividadesV2_mailJobsBlock_(plan, reason, atividadesV2_mailJobsIds_(context));
  var status = atividades_normalizeTextUpper_(context.presentation.STATUS_TITULO_EIXO || context.activity.STATUS_EIXO_TEMATICO);
  if (status === 'APROVADO') {
    return atividadesV2_mailJobsBlock_(plan, 'TITULO_EIXO_JA_ATENDIDO', atividadesV2_mailJobsIds_(context));
  }
  var days = atividadesV2_mailJobsDaysBetween_(context.now, context.activity.DATA_ATIVIDADE);
  if (days === null || days < 1 || days > Number(context.config.MAIL_DIAS_ANTES_COBRANCA_TITULO_EIXO)) {
    return atividadesV2_mailJobsBlock_(plan, 'FORA_DA_JANELA_TITULO_EIXO', atividadesV2_mailJobsIds_(context));
  }
  var count = atividadesV2_mailJobsCounter_(context.presentation.QTD_COBRANCAS_TITULO_EIXO);
  if (count >= Number(context.config.MAIL_MAX_COBRANCAS_TITULO_EIXO)) {
    return atividadesV2_mailJobsBlock_(plan, 'MAX_COBRANCAS_TITULO_EIXO', atividadesV2_mailJobsIds_(context));
  }
  if (!atividadesV2_mailJobsIntervalElapsed_(context.presentation.DATA_COBRANCA_TITULO_EIXO, context.now, context.config.MAIL_INTERVALO_HORAS_COBRANCA_TITULO_EIXO)) {
    return atividadesV2_mailJobsBlock_(plan, 'INTERVALO_TITULO_EIXO_NAO_ATINGIDO', atividadesV2_mailJobsIds_(context));
  }
  var recipient = atividadesV2_mailJobsPresenterRecipient_(context);
  var number = count + 1;
  atividadesV2_mailJobsPush_(plan, atividadesV2_mailJobsPresentationItem_(context, {
    eventCode: 'APRESENTACAO_COBRAR_TITULO_EIXO',
    to: recipient.to,
    recipientName: recipient.name,
    recipientSource: recipient.source,
    correlationKey: atividadesV2_mailJobsCorrelation_(['APR', context.presentation.ID_APRESENTACAO, 'COBRAR', 'TITULO-EIXO', number]),
    payload: atividadesV2_mailJobsPayload_(context, 'Informe pelo Portal uma proposta valida de titulo e eixos para sua apresentacao.'),
    update: {
      rowNumber: context.presentation._rowNumber,
      values: {
        DATA_COBRANCA_TITULO_EIXO: context.now,
        QTD_COBRANCAS_TITULO_EIXO: number,
        ATUALIZADO_EM: context.now
      }
    }
  }));
}

function atividadesV2_mailJobsPlanMaterialCharge_(plan, context) {
  if (!atividadesV2_mailJobsEnabled_(context.config, 'MAIL_COBRANCA_MATERIAL_ATIVA')) return;
  var reason = atividadesV2_mailJobsBasePresentationBlockReason_(context, true);
  if (reason) return atividadesV2_mailJobsBlock_(plan, reason, atividadesV2_mailJobsIds_(context));
  var requiresMaterial = atividadesV2_mailJobsIsYes_(context.activity.EXIGE_MATERIAL) ||
    atividadesV2_mailJobsIsYes_(context.activityConfig.EXIGE_MATERIAL_PADRAO) ||
    atividadesV2_mailJobsIsYes_(context.activityConfig.GERA_PENDENCIA_MATERIAL);
  if (!requiresMaterial) return atividadesV2_mailJobsBlock_(plan, 'MATERIAL_NAO_OBRIGATORIO', atividadesV2_mailJobsIds_(context));
  if (atividadesV2_mailJobsHasResolvedFile_(context.files, 'SLIDE_APRESENTACAO')) {
    return atividadesV2_mailJobsBlock_(plan, 'MATERIAL_JA_ATENDIDO', atividadesV2_mailJobsIds_(context));
  }
  var days = atividadesV2_mailJobsDaysBetween_(context.now, context.activity.DATA_ATIVIDADE);
  if (days === null || days < 0 || days > Number(context.config.MAIL_DIAS_ANTES_COBRANCA_MATERIAL)) {
    return atividadesV2_mailJobsBlock_(plan, 'FORA_DA_JANELA_MATERIAL', atividadesV2_mailJobsIds_(context));
  }
  var count = atividadesV2_mailJobsCounter_(context.presentation.QTD_COBRANCAS_MATERIAL);
  if (count >= Number(context.config.MAIL_MAX_COBRANCAS_MATERIAL)) {
    return atividadesV2_mailJobsBlock_(plan, 'MAX_COBRANCAS_MATERIAL', atividadesV2_mailJobsIds_(context));
  }
  if (!atividadesV2_mailJobsIntervalElapsed_(context.presentation.DATA_COBRANCA_MATERIAL, context.now, context.config.MAIL_INTERVALO_HORAS_COBRANCA_MATERIAL)) {
    return atividadesV2_mailJobsBlock_(plan, 'INTERVALO_MATERIAL_NAO_ATINGIDO', atividadesV2_mailJobsIds_(context));
  }
  var recipient = atividadesV2_mailJobsPresenterRecipient_(context);
  var number = count + 1;
  atividadesV2_mailJobsPush_(plan, atividadesV2_mailJobsPresentationItem_(context, {
    eventCode: 'APRESENTACAO_COBRAR_MATERIAL',
    to: recipient.to,
    recipientName: recipient.name,
    recipientSource: recipient.source,
    correlationKey: atividadesV2_mailJobsCorrelation_(['APR', context.presentation.ID_APRESENTACAO, 'COBRAR', 'MATERIAL', number]),
    payload: atividadesV2_mailJobsPayload_(context, 'Envie pelo Portal o slide ou material solicitado para sua apresentacao.'),
    update: {
      rowNumber: context.presentation._rowNumber,
      values: {
        DATA_COBRANCA_MATERIAL: context.now,
        QTD_COBRANCAS_MATERIAL: number,
        ATUALIZADO_EM: context.now
      }
    }
  }));
}

function atividadesV2_mailJobsPlanPhotoCharge_(plan, context) {
  if (!atividadesV2_mailJobsEnabled_(context.config, 'MAIL_COBRANCA_FOTO_ATIVA')) return;
  var reason = atividadesV2_mailJobsBasePresentationBlockReason_(context, false);
  if (reason) return atividadesV2_mailJobsBlock_(plan, reason, atividadesV2_mailJobsIds_(context));
  var rules = atividadesV2_resolveFotoReuniaoRules_(context.activity, context.activityConfig);
  if (!rules.exigeFoto) return atividadesV2_mailJobsBlock_(plan, 'FOTO_NAO_OBRIGATORIA', atividadesV2_mailJobsIds_(context));
  if (atividadesV2_mailJobsHasResolvedFile_(context.files, 'FOTO_REUNIAO')) {
    return atividadesV2_mailJobsBlock_(plan, 'FOTO_JA_ATENDIDA', atividadesV2_mailJobsIds_(context));
  }
  var days = atividadesV2_mailJobsDaysBetween_(context.now, context.activity.DATA_ATIVIDADE);
  var maxAfter = Number(context.config.MAIL_DIAS_MAX_APOS_COBRANCA_FOTO);
  if (days === null || days > 0 || days < -maxAfter) {
    return atividadesV2_mailJobsBlock_(plan, 'FORA_DA_JANELA_FOTO', atividadesV2_mailJobsIds_(context));
  }
  var count = atividadesV2_mailJobsCounter_(context.presentation.QTD_COBRANCAS_FOTO_REUNIAO);
  if (count >= Number(context.config.MAIL_MAX_COBRANCAS_FOTO)) {
    return atividadesV2_mailJobsBlock_(plan, 'MAX_COBRANCAS_FOTO', atividadesV2_mailJobsIds_(context));
  }
  if (!atividadesV2_mailJobsIntervalElapsed_(context.presentation.DATA_COBRANCA_FOTO_REUNIAO, context.now, context.config.MAIL_INTERVALO_HORAS_COBRANCA_FOTO)) {
    return atividadesV2_mailJobsBlock_(plan, 'INTERVALO_FOTO_NAO_ATINGIDO', atividadesV2_mailJobsIds_(context));
  }
  var presenterIsResponsible = rules.permiteMembro === true;
  var recipient;
  if (presenterIsResponsible) {
    recipient = atividadesV2_mailJobsPresenterRecipient_(context);
  } else {
    recipient = atividadesV2_mailResolveAdministrativeRecipients_({
      eventCode: 'APRESENTACAO_COBRAR_FOTO_REUNIAO',
      result: { idAtividade: context.activity.ID_ATIVIDADE, idApresentacao: context.presentation.ID_APRESENTACAO },
      payload: {},
      contexto: { perfil: 'ADMIN_TECNICO' }
    });
  }
  var window = atividadesV2_mailJobsDateToken_(context.now);
  atividadesV2_mailJobsPush_(plan, atividadesV2_mailJobsPresentationItem_(context, {
    eventCode: 'APRESENTACAO_COBRAR_FOTO_REUNIAO',
    to: recipient.to,
    recipientName: recipient.recipientName || recipient.name,
    recipientSource: recipient.recipientSource || recipient.source,
    fallbackUsed: recipient.fallbackUsed === true,
    correlationKey: atividadesV2_mailJobsCorrelation_(['APR', context.presentation.ID_APRESENTACAO, 'COBRAR', 'FOTO', window]),
    jobWindow: window,
    payload: atividadesV2_mailJobsPayload_(context, 'Registre a foto da reuniao pelo fluxo de entregaveis do Portal GEAPA.'),
    update: {
      rowNumber: context.presentation._rowNumber,
      values: {
        DATA_COBRANCA_FOTO_REUNIAO: context.now,
        QTD_COBRANCAS_FOTO_REUNIAO: count + 1,
        ATUALIZADO_EM: context.now
      }
    }
  }));
}

function atividadesV2_mailJobsPlanPresenterReminder_(plan, context) {
  if (!atividadesV2_mailJobsEnabled_(context.config, 'MAIL_LEMBRETE_APRESENTADOR_ATIVO')) return;
  var reason = atividadesV2_mailJobsBasePresentationBlockReason_(context, true);
  if (reason) return atividadesV2_mailJobsBlock_(plan, reason, atividadesV2_mailJobsIds_(context));
  var days = atividadesV2_mailJobsDaysBetween_(context.now, context.activity.DATA_ATIVIDADE);
  var configuredDays = Number(context.config.MAIL_DIAS_ANTES_LEMBRETE_APRESENTADOR);
  if (days !== configuredDays && days !== 1) {
    return atividadesV2_mailJobsBlock_(plan, 'FORA_DA_JANELA_LEMBRETE_APRESENTADOR', atividadesV2_mailJobsIds_(context));
  }
  var recipient = atividadesV2_mailJobsPresenterRecipient_(context);
  atividadesV2_mailJobsPush_(plan, atividadesV2_mailJobsPresentationItem_(context, {
    eventCode: 'APRESENTACAO_LEMBRETE_APRESENTADOR',
    to: recipient.to,
    recipientName: recipient.name,
    recipientSource: recipient.source,
    correlationKey: atividadesV2_mailJobsCorrelation_(['APR', context.presentation.ID_APRESENTACAO, 'LEMBRETE', 'APRESENTADOR', 'D' + days]),
    jobWindow: 'D' + days,
    payload: atividadesV2_mailJobsPayload_(context, 'Confira data, horario, local e entregaveis antes da apresentacao.')
  }));
}

function atividadesV2_mailJobsPlanSecretaryPending_(plan, data, activitiesById, configByActivity, filesByEntity, now, options) {
  var grouped = {};
  data.apresentacoes.forEach(function(presentation) {
    var idAtividade = String(presentation.ID_ATIVIDADE || '').trim();
    var idApresentacao = String(presentation.ID_APRESENTACAO || '').trim();
    if (options.idAtividade && idAtividade !== String(options.idAtividade).trim()) return;
    if (options.idApresentacao && idApresentacao !== String(options.idApresentacao).trim()) return;
    var activity = activitiesById[idAtividade] || {};
    var context = {
      activity: activity,
      presentation: presentation,
      activityConfig: configByActivity[idAtividade] || {},
      files: atividadesV2_mailJobsFilesForPresentation_(filesByEntity, idAtividade, idApresentacao),
      now: now,
      config: plan._config,
      options: options
    };
    if (atividadesV2_mailJobsBasePresentationBlockReason_(context, true)) return;
    var days = atividadesV2_mailJobsDaysBetween_(now, activity.DATA_ATIVIDADE);
    if (days === null || days < 0 || days > Number(plan._config.MAIL_DIAS_ANTES_PENDENCIA_CRITICA)) return;
    var pending = atividadesV2_mailJobsPresentationPendingLabels_(context);
    if (!pending.length) return;
    if (!grouped[idAtividade]) grouped[idAtividade] = { activity: activity, presentations: [], pending: [] };
    grouped[idAtividade].presentations.push(presentation);
    pending.forEach(function(label) {
      if (grouped[idAtividade].pending.indexOf(label) === -1) grouped[idAtividade].pending.push(label);
    });
  });

  Object.keys(grouped).forEach(function(idAtividade) {
    var group = grouped[idAtividade];
    var presenters = group.presentations.map(function(presentation) {
      return String(presentation.NOME_MEMBRO || group.activity.NOME_PESSOA_PRINCIPAL_PUBLICO || '').trim();
    }).filter(function(name, index, all) { return !!name && all.indexOf(name) === index; });
    var recipients = atividadesV2_mailResolveAdministrativeRecipients_({
      eventCode: 'APRESENTACAO_PENDENCIAS_SECRETARIA',
      result: { idAtividade: idAtividade },
      payload: {},
      contexto: { perfil: 'ADMIN_TECNICO' }
    });
    var dateToken = atividadesV2_mailJobsDateToken_(now);
    atividadesV2_mailJobsPush_(plan, {
      eventCode: 'APRESENTACAO_PENDENCIAS_SECRETARIA',
      idAtividade: idAtividade,
      idApresentacao: '',
      entityId: idAtividade,
      to: recipients.to,
      recipientName: recipients.recipientName,
      recipientSource: recipients.recipientSource,
      fallbackUsed: recipients.fallbackUsed === true,
      correlationKey: atividadesV2_mailJobsCorrelation_(['APR', idAtividade, 'PENDENCIAS', 'SECRETARIA', dateToken]),
      jobWindow: dateToken,
      payload: atividadesV2_mailJobsActivityPayload_(group.activity, {
        introText: 'Ha pendencias criticas em ' + group.presentations.length + ' apresentacao(oes).',
        extraItems: [
          { label: 'Apresentador(es)', value: presenters.join(', ').slice(0, 500) || '-' },
          { label: 'Pendencias', value: group.pending.join(', ') },
          { label: 'Proxima acao', value: 'Revisar as pendencias no Portal GEAPA.' }
        ]
      }),
      metadata: {
        totalApresentacoes: group.presentations.length,
        tiposPendencia: group.pending.slice(0, 10),
        adminResolverFallbackReason: recipients.adminResolverFallbackReason || ''
      }
    });
  });
}

function atividadesV2_mailJobsPlanMemberReminders_(plan, data, configByActivity, now, options) {
  if (!atividadesV2_mailJobsEnabled_(plan._config, 'MAIL_LEMBRETE_MEMBROS_ATIVO')) return;
  data.atividades.forEach(function(activity) {
    var idAtividade = String(activity.ID_ATIVIDADE || '').trim();
    if (options.idAtividade && idAtividade !== String(options.idAtividade).trim()) return;
    if (!idAtividade || !atividadesV2_mailJobsActivityOperational_(activity)) return;
    var config = configByActivity[idAtividade] || {};
    if (!atividadesV2_mailJobsIsYes_(activity.EXIGE_LEMBRETE) && !atividadesV2_mailJobsIsYes_(config.EXIGE_LEMBRETE_PADRAO)) return;
    if (!atividadesV2_mailJobsActivityVisibleToMembers_(activity)) return;
    var days = atividadesV2_mailJobsDaysBetween_(now, activity.DATA_ATIVIDADE);
    if (days !== Number(plan._config.MAIL_DIAS_ANTES_LEMBRETE_MEMBROS)) return;
    var presentation = atividadesV2_mailJobsPresentationForActivity_(data.apresentacoes, idAtividade);
    if (presentation && atividadesV2_mailJobsIsYes_(presentation.LEMBRETE_MEMBROS_ENVIADO)) return;
    var membersResult = atividadesV2_listarMembrosChamadaViaCore_(activity.DATA_ATIVIDADE, { perfil: 'ADMIN_TECNICO', somenteVisiveis: false }, null);
    if (!membersResult || membersResult.ok !== true) {
      atividadesV2_mailJobsBlock_(plan, 'ERRO_LISTAR_MEMBROS_APLICAVEIS', { idAtividade: idAtividade });
      return;
    }
    var groupKey = 'MEMBROS|' + idAtividade + '|D' + days;
    (membersResult.data || []).forEach(function(member) {
      var email = String(member.email || '').trim();
      var ref = String(member.idPessoa || member.rga || email || '').trim();
      var recipientToken = atividadesV2_mailJobsRecipientToken_(ref);
      atividadesV2_mailJobsPush_(plan, {
        eventCode: 'ATIVIDADE_LEMBRETE_MEMBROS',
        idAtividade: idAtividade,
        idApresentacao: '',
        entityId: idAtividade,
        to: [email],
        recipientName: String(member.nomeExibicao || member.nome || '').trim(),
        recipientSource: 'GEAPA_CORE_MEMBROS_APLICAVEIS',
        correlationKey: atividadesV2_mailJobsCorrelation_(['ATV', idAtividade, 'LEMBRETE', 'MEMBRO', recipientToken, 'D' + days]),
        jobWindow: 'D' + days,
        payload: atividadesV2_mailJobsActivityPayload_(activity, { introText: 'Lembrete de atividade futura do GEAPA.' }),
        completionGroup: groupKey,
        completionUpdate: {
          rowNumber: atividadesV2_mailJobsPresentationRowForActivity_(data.apresentacoes, idAtividade),
          values: { LEMBRETE_MEMBROS_ENVIADO: 'SIM', DATA_ENVIO_LEMBRETE_MEMBROS: now, ATUALIZADO_EM: now }
        }
      });
    });
  });
}

function atividadesV2_mailJobsPlanInvites_(plan, data, activitiesById, now, options) {
  var involved = data.envolvidos.slice();
  data.atividades.forEach(function(activity) {
    if (!String(activity.EMAIL_PESSOA_PRINCIPAL || '').trim()) return;
    involved.push({
      ID_ATIVIDADE: activity.ID_ATIVIDADE,
      ID_PESSOA: activity.ID_PESSOA_PRINCIPAL,
      NOME_PUBLICO: activity.NOME_PESSOA_PRINCIPAL_PUBLICO,
      EMAIL: activity.EMAIL_PESSOA_PRINCIPAL,
      TIPO_PESSOA: activity.TIPO_PESSOA_PRINCIPAL,
      PAPEL_NA_ATIVIDADE: activity.PAPEL_PESSOA_PRINCIPAL,
      ATIVO: activity.ATIVO,
      _synthetic: true
    });
  });
  var seen = {};
  involved.forEach(function(person) {
    if (atividades_normalizeTextUpper_(person.ATIVO || 'SIM') === 'NAO') return;
    var idAtividade = String(person.ID_ATIVIDADE || '').trim();
    if (options.idAtividade && idAtividade !== String(options.idAtividade).trim()) return;
    var activity = activitiesById[idAtividade] || {};
    if (!atividadesV2_mailJobsActivityOperational_(activity)) return;
    var email = String(person.EMAIL || '').trim();
    var type = atividades_normalizeTextUpper_(person.TIPO_PESSOA);
    var role = atividades_normalizeTextUpper_(person.PAPEL_NA_ATIVIDADE);
    var isProfessor = type === 'PROFESSOR' || role.indexOf('PROFESSOR') >= 0 || role.indexOf('PALESTRANTE') >= 0;
    var isGuest = !isProfessor && (['EXTERNO', 'CONVIDADO', 'VISITANTE'].indexOf(type) >= 0 || role.indexOf('CONVIDADO') >= 0);
    if (!isProfessor && !isGuest) return;
    var dedupe = idAtividade + '|' + String(person.ID_PESSOA || email).trim() + '|' + (isProfessor ? 'PROF' : 'CONV');
    if (seen[dedupe]) return;
    seen[dedupe] = true;
    var days = atividadesV2_mailJobsDaysBetween_(now, activity.DATA_ATIVIDADE);
    if (days === null || days < 0) return;
    var inviteDays = Number(plan._config.MAIL_DIAS_ANTES_CONVITE_PROFESSOR);
    var reminderDays = Number(plan._config.MAIL_DIAS_ANTES_LEMBRETE_PROFESSOR);
    var ref = String(person.ID_PESSOA || email || '').trim();
    var label = isProfessor ? 'PROFESSOR' : 'CONVIDADO';
    var presentation = atividadesV2_mailJobsPresentationForActivity_(data.apresentacoes, idAtividade);
    var forceResend = options.forceReenvio === true && !!String(options.idAtividade || '').trim();
    var inviteAlreadySent = presentation && atividadesV2_mailJobsIsYes_(
      label === 'PROFESSOR' ? presentation.CONVITE_PROFESSORES_ENVIADO : presentation.CONVITE_EXTERNOS_ENVIADO
    );
    if ((!inviteAlreadySent || forceResend) && days <= inviteDays && atividadesV2_mailJobsEnabled_(plan._config, 'MAIL_CONVITE_PROFESSOR_ATIVO')) {
      var inviteItem = atividadesV2_mailJobsInviteItem_(activity, person, email, label, 'CONVITE', days, atividadesV2_mailJobsRecipientToken_(ref), data.apresentacoes, now);
      inviteItem.forceQueueDuplicate = forceResend;
      atividadesV2_mailJobsPush_(plan, inviteItem);
    } else if (inviteAlreadySent && days === reminderDays && atividadesV2_mailJobsEnabled_(plan._config, 'MAIL_LEMBRETE_PROFESSOR_ATIVO')) {
      atividadesV2_mailJobsPush_(plan, atividadesV2_mailJobsInviteItem_(activity, person, email, label, 'LEMBRETE', days, atividadesV2_mailJobsRecipientToken_(ref), data.apresentacoes, now));
    }
  });
}

function atividadesV2_mailJobsPresentationItem_(context, values) {
  return Object.assign({
    idAtividade: String(context.activity.ID_ATIVIDADE || '').trim(),
    idApresentacao: String(context.presentation.ID_APRESENTACAO || '').trim(),
    entityId: String(context.presentation.ID_APRESENTACAO || '').trim(),
    fallbackUsed: false,
    metadata: {
      dataAtividade: atividadesV2_mailDateIso_(context.activity.DATA_ATIVIDADE),
      ciclo: String(context.activity.CICLO || '').trim()
    }
  }, values || {});
}

function atividadesV2_mailJobsInviteItem_(activity, person, email, label, mode, days, ref, presentations, now) {
  var eventCode = 'ATIVIDADE_' + mode + '_' + label;
  var groupKey = 'CONVITE|' + String(activity.ID_ATIVIDADE || '').trim() + '|' + label + '|' + mode;
  var updateValues = mode === 'CONVITE'
    ? (label === 'PROFESSOR'
      ? { CONVITE_PROFESSORES_ENVIADO: 'SIM', DATA_ENVIO_CONVITE_PROFESSORES: now, ATUALIZADO_EM: now }
      : { CONVITE_EXTERNOS_ENVIADO: 'SIM', DATA_ENVIO_CONVITE_EXTERNOS: now, ATUALIZADO_EM: now })
    : null;
  return {
    eventCode: eventCode,
    idAtividade: String(activity.ID_ATIVIDADE || '').trim(),
    idApresentacao: '',
    entityId: String(activity.ID_ATIVIDADE || '').trim(),
    to: [email],
    recipientName: String(person.NOME_PUBLICO || '').trim(),
    recipientSource: person._synthetic ? 'ATIVIDADES_PESSOA_PRINCIPAL' : 'ATIVIDADES_ENVOLVIDOS',
    correlationKey: atividadesV2_mailJobsCorrelation_([
      'ATV', activity.ID_ATIVIDADE, mode, label, ref, mode === 'LEMBRETE' ? 'D' + days : ''
    ]),
    jobWindow: mode === 'LEMBRETE' ? 'D' + days : 'CONVITE_UNICO',
    payload: atividadesV2_mailJobsActivityPayload_(activity, {
      introText: mode === 'CONVITE' ? 'Voce esta convidado para uma atividade do GEAPA.' : 'Lembrete da atividade do GEAPA.'
    }),
    completionGroup: updateValues ? groupKey : '',
    completionUpdate: updateValues ? {
      rowNumber: atividadesV2_mailJobsPresentationRowForActivity_(presentations, activity.ID_ATIVIDADE),
      values: updateValues
    } : null
  };
}

function atividadesV2_mailJobsBasePresentationBlockReason_(context, futureRequired) {
  var presentation = context.presentation || {};
  var activity = context.activity || {};
  if (!String(presentation.ID_APRESENTACAO || '').trim()) return 'APRESENTACAO_SEM_ID';
  if (atividades_normalizeTextUpper_(presentation.ATIVO || 'SIM') === 'NAO') return 'APRESENTACAO_INATIVA';
  if (['CANCELADA', 'ARQUIVADA', 'SUSPENSA'].indexOf(atividades_normalizeTextUpper_(presentation.STATUS_APRESENTACAO)) >= 0) {
    return 'APRESENTACAO_CANCELADA_OU_ARQUIVADA';
  }
  if (!String(activity.ID_ATIVIDADE || '').trim()) return 'ATIVIDADE_NAO_ENCONTRADA';
  if (!atividadesV2_mailJobsActivityOperational_(activity)) return 'ATIVIDADE_INATIVA_OU_CANCELADA';
  if (futureRequired && atividadesV2_mailJobsDaysBetween_(context.now, activity.DATA_ATIVIDADE) < 0) return 'ATIVIDADE_JA_REALIZADA';
  var subtype = atividades_normalizeTextUpper_(activity.SUBTIPO_ATIVIDADE);
  if (subtype !== 'APRESENTACAO_MEMBRO' && !atividadesV2_mailJobsIsYes_(context.activityConfig.USA_FLUXO_APRESENTACAO)) {
    return 'NAO_E_APRESENTACAO_DE_MEMBRO';
  }
  return '';
}

function atividadesV2_mailJobsActivityOperational_(activity) {
  if (!activity || atividades_normalizeTextUpper_(activity.ATIVO || 'SIM') === 'NAO') return false;
  var status = atividades_normalizeTextUpper_(activity.STATUS_OPERACIONAL);
  if (['CANCELADA', 'ARQUIVADA', 'SUSPENSA'].indexOf(status) >= 0) return false;
  if (!atividades_parseDateOrNull_(activity.DATA_ATIVIDADE)) return false;
  return true;
}

function atividadesV2_mailJobsActivityVisibleToMembers_(activity) {
  var publication = atividades_normalizeTextUpper_(activity.STATUS_PUBLICACAO_PORTAL);
  var visibility = atividades_normalizeTextUpper_(activity.VISIBILIDADE_PORTAL);
  var access = atividades_normalizeTextUpper_(activity.CLASSIFICACAO_ACESSO);
  return publication === 'PUBLICADA' && ['MEMBROS', 'PUBLICA'].indexOf(visibility) >= 0 &&
    ['RESTRITA_DIRETORIA', 'OCULTA'].indexOf(access) === -1;
}

function atividadesV2_mailJobsPresentationPendingLabels_(context) {
  var pending = [];
  var titleStatus = atividades_normalizeTextUpper_(context.presentation.STATUS_TITULO_EIXO || context.activity.STATUS_EIXO_TEMATICO);
  if (titleStatus !== 'APROVADO') pending.push('TITULO_EIXO');
  var materialStatus = atividades_normalizeTextUpper_(context.presentation.STATUS_ENVIO_MATERIAL);
  if (['RECEBIDO', 'REENVIADO'].indexOf(materialStatus) >= 0) pending.push('MATERIAL_AGUARDANDO_ANALISE');
  var photo = atividadesV2_mailJobsLatestFileByType_(context.files, 'FOTO_REUNIAO');
  var photoStatus = atividades_normalizeTextUpper_(photo && photo.STATUS_ARQUIVO);
  if (['RECEBIDO', 'REENVIADO'].indexOf(photoStatus) >= 0) pending.push('FOTO_AGUARDANDO_ANALISE');
  if (!atividadesV2_mailJobsHasResolvedFile_(context.files, 'SLIDE_APRESENTACAO') &&
      (atividadesV2_mailJobsIsYes_(context.activity.EXIGE_MATERIAL) || atividadesV2_mailJobsIsYes_(context.activityConfig.GERA_PENDENCIA_MATERIAL))) {
    pending.push('MATERIAL_PENDENTE');
  }
  return pending;
}

function atividadesV2_mailJobsPresenterRecipient_(context) {
  var presentation = context.presentation || {};
  var activity = context.activity || {};
  var idPessoa = String(presentation.ID_PESSOA || activity.ID_PESSOA_PRINCIPAL || '').trim();
  var email = String(presentation.EMAIL_MEMBRO || activity.EMAIL_PESSOA_PRINCIPAL || '').trim();
  var source = email ? 'ATIVIDADES_V2_APRESENTACAO' : '';
  if (!email && idPessoa) {
    var person = atividadesV2_mailResolvePersonEmailV2_(idPessoa, []);
    email = person.email;
    source = person.source;
  }
  return {
    to: atividadesV2_mailNormalizeEmails_([email]),
    name: String(presentation.NOME_MEMBRO || activity.NOME_PESSOA_PRINCIPAL_PUBLICO || '').trim(),
    source: source || 'NAO_RESOLVIDO'
  };
}

function atividadesV2_mailJobsHasResolvedFile_(files, type) {
  var valid = ['RECEBIDO', 'REENVIADO', 'APROVADO', 'HISTORICO', 'DISPENSADO'];
  return (files || []).some(function(file) {
    return atividades_normalizeTextUpper_(file.TIPO_ARQUIVO_ATIVIDADE) === atividades_normalizeTextUpper_(type) &&
      atividades_normalizeTextUpper_(file.ATIVO || 'SIM') !== 'NAO' &&
      valid.indexOf(atividades_normalizeTextUpper_(file.STATUS_ARQUIVO)) >= 0;
  });
}

function atividadesV2_mailJobsLatestFileByType_(files, type) {
  var result = null;
  (files || []).forEach(function(file) {
    if (atividades_normalizeTextUpper_(file.TIPO_ARQUIVO_ATIVIDADE) !== atividades_normalizeTextUpper_(type)) return;
    if (!result || Number(file._rowNumber || 0) > Number(result._rowNumber || 0)) result = file;
  });
  return result;
}

function atividadesV2_mailJobsPayload_(context, instruction) {
  var photo = atividadesV2_mailJobsLatestFileByType_(context.files, 'FOTO_REUNIAO');
  return atividadesV2_mailJobsActivityPayload_(context.activity, {
    introText: instruction,
    extraItems: [
      { label: 'Apresentacao', value: String(context.presentation.ID_APRESENTACAO || '').trim() },
      { label: 'Status titulo/eixos', value: String(context.presentation.STATUS_TITULO_EIXO || context.activity.STATUS_EIXO_TEMATICO || '').trim() },
      { label: 'Status material', value: String(context.presentation.STATUS_ENVIO_MATERIAL || 'PENDENTE').trim() },
      { label: 'Status foto', value: String(photo && photo.STATUS_ARQUIVO || 'PENDENTE').trim() }
    ]
  });
}

function atividadesV2_mailJobsActivityPayload_(activity, options) {
  var opts = options || {};
  var date = atividades_parseDateOrNull_(activity && activity.DATA_ATIVIDADE);
  var items = [
    { label: 'Atividade', value: String(activity && activity.ID_ATIVIDADE || '').trim() },
    { label: 'Titulo', value: String(activity && (activity.TITULO_PUBLICO || activity.TITULO) || 'Atividade do GEAPA').trim() },
    { label: 'Data', value: date ? Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd/MM/yyyy') : '-' },
    { label: 'Horario', value: [activity && activity.HORARIO_INICIO, activity && activity.HORARIO_FIM].filter(Boolean).join(' as ') || '-' },
    { label: 'Local', value: String(activity && activity.LOCAL || '-').trim() }
  ].concat(opts.extraItems || []);
  return {
    title: String(activity && (activity.TITULO_PUBLICO || activity.TITULO) || 'Atividade do GEAPA').trim(),
    subtitle: 'Portal GEAPA - comunicacao programada',
    preheader: String(opts.introText || '').trim(),
    introText: String(opts.introText || '').trim(),
    blocks: [{ title: 'Dados da atividade', items: items }],
    footerNote: 'Mensagem automatica enfileirada pelo modulo Atividades V2.'
  };
}

function atividadesV2_mailJobsIds_(context) {
  return {
    idAtividade: String(context.activity && context.activity.ID_ATIVIDADE || '').trim(),
    idApresentacao: String(context.presentation && context.presentation.ID_APRESENTACAO || '').trim()
  };
}

function atividadesV2_mailJobsPresentationRowForActivity_(presentations, idAtividade) {
  var presentation = atividadesV2_mailJobsPresentationForActivity_(presentations, idAtividade);
  return presentation ? presentation._rowNumber || 0 : 0;
}

function atividadesV2_mailJobsPresentationForActivity_(presentations, idAtividade) {
  var wanted = String(idAtividade || '').trim();
  for (var i = 0; i < (presentations || []).length; i++) {
    if (String(presentations[i].ID_ATIVIDADE || '').trim() === wanted) return presentations[i];
  }
  return null;
}

function atividadesV2_mailJobsDaysBetween_(from, to) {
  var start = atividades_parseDateOrNull_(from);
  var end = atividades_parseDateOrNull_(to);
  if (!start || !end) return null;
  return Math.round((atividadesV2_mailJobsDayTime_(end) - atividadesV2_mailJobsDayTime_(start)) / 86400000);
}

function atividadesV2_mailJobsDayTime_(value) {
  var date = atividades_parseDateOrNull_(value);
  return date ? new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() : 0;
}

function atividadesV2_mailJobsIntervalElapsed_(lastValue, now, hours) {
  var last = atividades_parseDateOrNull_(lastValue);
  if (!last) return true;
  return (now.getTime() - last.getTime()) >= Number(hours || 0) * 3600000;
}

function atividadesV2_mailJobsDateToken_(value) {
  var date = atividades_parseDateOrNull_(value) || new Date();
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyyMMdd');
}

function atividadesV2_mailJobsCorrelation_(parts) {
  return (parts || []).map(function(part) {
    return atividadesV2_mailCorrelationToken_(part);
  }).filter(function(part) { return !!part; }).join('-');
}

function atividadesV2_mailJobsRecipientToken_(value) {
  var text = String(value || '').trim().toLowerCase();
  var hash = 2166136261;
  for (var i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return 'R' + (hash >>> 0).toString(36).toUpperCase();
}

function atividadesV2_mailJobsIsYes_(value) {
  return atividades_normalizeTextUpper_(value) === 'SIM';
}

function atividadesV2_mailJobsCounter_(value) {
  var number = Math.floor(Number(value || 0));
  return isFinite(number) && number > 0 ? number : 0;
}

function atividadesV2_mailJobsRun_(scope, options, forceDryRun) {
  var opts = options || {};
  var dryRun = forceDryRun === true || opts.dryRun === true;
  var plan = atividadesV2_mailJobsBuildPlan_(scope, opts);
  if (dryRun) return atividadesV2_mailJobsPublicPlan_(plan);

  var config = plan._config;
  if (!atividadesV2_mailJobsEnabled_(config, 'MAIL_JOBS_ATIVOS')) {
    return atividadesV2_mailJobsBlockedRun_(plan, 'MAIL_JOBS_DESATIVADOS');
  }
  var testMode = atividadesV2_mailJobsEnabled_(config, 'MAIL_JOB_MODO_TESTE');
  if (testMode && !String(config.MAIL_JOB_EMAIL_TESTE || '').trim()) {
    return atividadesV2_mailJobsBlockedRun_(plan, 'EMAIL_TESTE_OBRIGATORIO_NO_MODO_TESTE');
  }
  if (!testMode && !String(config.MAIL_JOB_EMAIL_TESTE || '').trim() && opts.confirmarEnvioReal !== true) {
    return atividadesV2_mailJobsBlockedRun_(plan, 'CONFIRMACAO_ENVIO_REAL_OBRIGATORIA');
  }

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return atividadesV2_mailJobsBlockedRun_(plan, 'LOCK_INDISPONIVEL');
  var result;
  try {
    result = atividadesV2_mailJobsExecutePlan_(plan);
  } finally {
    lock.releaseLock();
  }
  if (opts.processOutbox === true) {
    result.outbox = atividadesV2_processarFilaEmailsCore_();
  } else {
    result.outbox = { ok: true, skipped: true, reason: 'PROCESS_OUTBOX_FALSE' };
  }
  return result;
}

function atividadesV2_mailJobsExecutePlan_(plan) {
  atividadesV2_applyHeadersIfMissing_(plan._data.apresentacoesSheet, ATIVIDADES_V2_SCHEMA.APRESENTACOES);
  var selected = plan.items.slice(0, plan._config.MAIL_JOB_BATCH_LIMIT);
  var outcomes = [];
  var successGroups = {};
  var plannedGroups = {};
  var completionUpdates = {};
  var successfulUpdates = [];
  var queued = 0;
  var duplicates = 0;
  var requeued = 0;
  var errors = [];

  plan.items.forEach(function(item) {
    if (!item.completionGroup) return;
    plannedGroups[item.completionGroup] = Number(plannedGroups[item.completionGroup] || 0) + 1;
    if (item.completionUpdate) completionUpdates[item.completionGroup] = item.completionUpdate;
  });

  selected.forEach(function(item) {
    var queueResult = atividadesV2_mailQueueJobEvent_(item.eventCode, item);
    outcomes.push({
      eventCode: item.eventCode,
      idAtividade: item.idAtividade,
      idApresentacao: item.idApresentacao,
      correlationKey: item.correlationKey,
      queued: queueResult.queued === true,
      duplicate: queueResult.duplicate === true,
      requeued: queueResult.requeued === true,
      ok: queueResult.ok === true,
      errorCode: queueResult.errorCode || ''
    });
    if (queueResult.queued) queued++;
    if (queueResult.duplicate) duplicates++;
    if (queueResult.requeued) requeued++;
    if (!queueResult.ok) errors.push({ correlationKey: item.correlationKey, errorCode: queueResult.errorCode || 'ERRO_FILA' });
    if (queueResult.ok && (queueResult.queued || queueResult.duplicate || queueResult.requeued)) {
      if (item.update) successfulUpdates.push(item.update);
      if (item.completionGroup) successGroups[item.completionGroup] = Number(successGroups[item.completionGroup] || 0) + 1;
    }
  });

  Object.keys(completionUpdates).forEach(function(group) {
    if (plannedGroups[group] > 0 && successGroups[group] === plannedGroups[group]) {
      successfulUpdates.push(completionUpdates[group]);
    }
  });
  var updatedRows = atividadesV2_mailJobsApplyPresentationUpdatesBatch_(plan._data.apresentacoesSheet, successfulUpdates);

  var report = {
    ok: errors.length === 0,
    modo: 'DEV',
    dryRun: false,
    scope: plan.scope,
    totalAnalisado: plan.totalAnalisado,
    totalElegivel: plan.totalElegivel,
    totalBloqueado: plan.totalBloqueado,
    totalProcessado: selected.length,
    totalEnfileirado: queued,
    totalDuplicado: duplicates,
    totalReenfileirado: requeued,
    totalLinhasControleAtualizadas: updatedRows,
    totalDestinatariosProcessados: selected.reduce(function(total, item) { return total + (item.to || []).length; }, 0),
    origensDestinatarios: atividadesV2_mailJobsCountRecipientSources_(selected),
    totalErros: errors.length,
    motivosBloqueio: plan.motivosBloqueio,
    resultados: outcomes,
    erros: errors,
    avisos: plan.avisos
  };
  atividadesV2_mailJobsLog_(plan._data.ss, report);
  return report;
}

function atividadesV2_mailJobsCountRecipientSources_(items) {
  var result = {};
  (items || []).forEach(function(item) {
    var source = String(item.recipientSource || 'NAO_INFORMADA').trim();
    result[source] = Number(result[source] || 0) + (item.to || []).length;
  });
  return result;
}

function atividadesV2_mailJobsApplyPresentationUpdatesBatch_(sheet, updates) {
  var byRow = {};
  (updates || []).forEach(function(update) {
    var rowNumber = Number(update && update.rowNumber || 0);
    if (rowNumber < 2) return;
    if (!byRow[rowNumber]) byRow[rowNumber] = {};
    Object.keys(update.values || {}).forEach(function(header) {
      byRow[rowNumber][header] = update.values[header];
    });
  });
  var rows = Object.keys(byRow).map(Number).sort(function(a, b) { return a - b; });
  if (!rows.length) return 0;

  var headers = atividadesV2_getSheetHeaders_(sheet);
  var headerMap = atividadesV2_simpleHeaderMap_(headers);
  var headersToWrite = {};
  rows.forEach(function(rowNumber) {
    Object.keys(byRow[rowNumber]).forEach(function(header) {
      if (headerMap[header]) headersToWrite[header] = true;
    });
  });
  var minRow = rows[0];
  var maxRow = rows[rows.length - 1];
  Object.keys(headersToWrite).forEach(function(header) {
    var range = sheet.getRange(minRow, headerMap[header], maxRow - minRow + 1, 1);
    var values = range.getValues();
    rows.forEach(function(rowNumber) {
      if (Object.prototype.hasOwnProperty.call(byRow[rowNumber], header)) {
        values[rowNumber - minRow][0] = byRow[rowNumber][header];
      }
    });
    range.setValues(values);
  });
  return rows.length;
}

function atividadesV2_mailJobsPublicPlan_(plan) {
  return {
    ok: plan.erros.length === 0,
    modo: 'DEV',
    dryRun: true,
    scope: plan.scope,
    config: plan.config,
    totalAnalisado: plan.totalAnalisado,
    totalElegivel: plan.totalElegivel,
    totalBloqueado: plan.totalBloqueado,
    totalQueSeriaEnfileirado: plan.totalQueSeriaEnfileirado,
    totalDestinatariosPlanejados: plan.totalDestinatariosPlanejados || 0,
    origensDestinatarios: atividadesV2_mailJobsCountRecipientSources_(plan.items.slice(0, plan._config.MAIL_JOB_BATCH_LIMIT)),
    motivosBloqueio: plan.motivosBloqueio,
    exemplosElegiveis: plan.exemplosElegiveis.slice(0, 25),
    exemplosBloqueados: plan.exemplosBloqueados.slice(0, 10),
    avisos: plan.avisos,
    erros: plan.erros,
    escritaRealizada: false,
    enfileiramentoRealizado: false,
    processouOutbox: false
  };
}

function atividadesV2_mailJobsBlockedRun_(plan, reason) {
  return {
    ok: false,
    modo: 'DEV',
    dryRun: false,
    scope: plan.scope,
    errorCode: reason,
    message: 'Job bloqueado por protecao operacional: ' + reason + '.',
    totalElegivel: plan.totalElegivel,
    totalEnfileirado: 0,
    escritaRealizada: false,
    processouOutbox: false
  };
}

function atividadesV2_mailJobsLog_(ss, result) {
  try {
    atividadesV2_appendV2Log_(ss, {
      FLUXO: 'MAIL_HUB_JOBS_V2',
      ACAO: 'MAIL_JOB_' + String(result.scope || 'TODOS').slice(0, 80),
      NIVEL: result.ok ? 'INFO' : 'WARN',
      STATUS: result.ok ? 'OK' : 'COM_ERROS',
      MENSAGEM: 'Job V2 de comunicacao programada executado.',
      DETALHES_JSON: atividadesV2_safeLogData_({
        dryRun: false,
        totalAnalisado: result.totalAnalisado,
        totalElegivel: result.totalElegivel,
        totalBloqueado: result.totalBloqueado,
        totalProcessado: result.totalProcessado,
        totalEnfileirado: result.totalEnfileirado,
        totalDuplicado: result.totalDuplicado,
        totalReenfileirado: result.totalReenfileirado,
        totalLinhasControleAtualizadas: result.totalLinhasControleAtualizadas,
        totalDestinatariosProcessados: result.totalDestinatariosProcessados,
        origensDestinatarios: result.origensDestinatarios,
        totalErros: result.totalErros,
        correlationKeys: (result.resultados || []).slice(0, 20).map(function(item) { return item.correlationKey; })
      })
    });
  } catch (err) {
    Logger.log('GEAPA-ATIVIDADES-V2 MAIL JOB LOG WARN: ' + atividadesV2_errorMessage_(err));
  }
}

function atividadesV2_mailDiagnosticarCobrancasApresentacoesDev_(options) {
  return atividadesV2_mailJobsRun_('COBRANCAS', options || {}, true);
}

function atividadesV2_mailProcessarCobrancasApresentacoesDev_(options) {
  return atividadesV2_mailJobsRun_('COBRANCAS', options || {}, false);
}

function atividadesV2_mailDiagnosticarLembretesDev_(options) {
  return atividadesV2_mailJobsRun_('LEMBRETES', options || {}, true);
}

function atividadesV2_mailProcessarLembretesDev_(options) {
  return atividadesV2_mailJobsRun_('LEMBRETES', options || {}, false);
}

function atividadesV2_mailDiagnosticarPendenciasSecretariaDev_(options) {
  return atividadesV2_mailJobsRun_('PENDENCIAS', options || {}, true);
}

function atividadesV2_mailProcessarPendenciasSecretariaDev_(options) {
  return atividadesV2_mailJobsRun_('PENDENCIAS', options || {}, false);
}

function atividadesV2_mailDiagnosticarConvitesDev_(options) {
  return atividadesV2_mailJobsRun_('CONVITES', options || {}, true);
}

function atividadesV2_mailProcessarConvitesDev_(options) {
  return atividadesV2_mailJobsRun_('CONVITES', options || {}, false);
}

function atividadesV2_mailDiagnosticarJobsDev_(options) {
  return atividadesV2_mailJobsRun_('TODOS', options || {}, true);
}

function atividadesV2_mailProcessarJobsDev_(options) {
  return atividadesV2_mailJobsRun_('TODOS', options || {}, false);
}
