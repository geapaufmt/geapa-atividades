/**
 * Integracao nao bloqueante da Atividades V2 com o Mail Hub V1 do GEAPA_CORE.
 *
 * Esta camada apenas enfileira contratos em MAIL_SAIDA. O processamento da
 * outbox nunca ocorre dentro das acoes do Portal.
 */

var ATIVIDADES_V2_MAIL_ADMIN_CONFIG_KEYS_ = Object.freeze([
  'ATIVIDADES_DESTINATARIOS_ADMINISTRATIVOS',
  'APRESENTACOES_DESTINATARIOS_ADMINISTRATIVOS'
]);
var ATIVIDADES_V2_MAIL_RECIPIENT_CACHE_TTL_SECONDS_ = 300;
var ATIVIDADES_V2_MAIL_ADMIN_RESOLVER_CACHE_VERSION_ = 'v3';

var ATIVIDADES_V2_MAIL_EVENTS_ = Object.freeze({
  APRESENTACAO_TITULO_EIXO_ENVIADO: Object.freeze({
    moduleName: 'APRESENTACOES', moduleCode: 'APR', entityType: 'APRESENTACAO',
    flowCode: 'TITULO_EIXO', stage: 'TITULO_EIXO_ENVIADO', recipients: 'ADMIN',
    subjectHuman: 'Nova proposta de titulo e eixos para analise',
    introText: 'Uma proposta de titulo e eixos foi enviada pelo apresentador e aguarda analise da Secretaria.'
  }),
  APRESENTACAO_TITULO_EIXO_APROVADO: Object.freeze({
    moduleName: 'APRESENTACOES', moduleCode: 'APR', entityType: 'APRESENTACAO',
    flowCode: 'TITULO_EIXO', stage: 'TITULO_EIXO_APROVADO', recipients: 'MEMBRO',
    subjectHuman: 'Titulo e eixos da apresentacao aprovados',
    introText: 'A proposta de titulo e eixos da sua apresentacao foi aprovada pela gestao do GEAPA.'
  }),
  APRESENTACAO_TITULO_EIXO_AJUSTE_SOLICITADO: Object.freeze({
    moduleName: 'APRESENTACOES', moduleCode: 'APR', entityType: 'APRESENTACAO',
    flowCode: 'TITULO_EIXO', stage: 'TITULO_EIXO_AJUSTE', recipients: 'MEMBRO',
    subjectHuman: 'Ajuste solicitado no titulo ou eixos da apresentacao',
    introText: 'A gestao do GEAPA solicitou uma nova proposta de titulo ou eixos para sua apresentacao.'
  }),
  APRESENTACAO_TITULO_EIXO_REPROVADO: Object.freeze({
    moduleName: 'APRESENTACOES', moduleCode: 'APR', entityType: 'APRESENTACAO',
    flowCode: 'TITULO_EIXO', stage: 'TITULO_EIXO_REPROVADO', recipients: 'MEMBRO',
    subjectHuman: 'Nova proposta de tema necessaria para a apresentacao',
    introText: 'A proposta de titulo ou eixos nao foi aprovada. Envie uma nova proposta diferente da anterior pelo Portal GEAPA.'
  }),
  APRESENTACAO_MATERIAL_ENVIADO: Object.freeze({
    moduleName: 'APRESENTACOES', moduleCode: 'APR', entityType: 'APRESENTACAO',
    flowCode: 'MATERIAL', stage: 'MATERIAL_ENVIADO', recipients: 'ADMIN',
    subjectHuman: 'Slide ou material de apresentacao enviado',
    introText: 'Um slide ou material de apresentacao foi enviado e esta disponivel para acompanhamento da Secretaria.'
  }),
  APRESENTACAO_MATERIAL_REENVIADO: Object.freeze({
    moduleName: 'APRESENTACOES', moduleCode: 'APR', entityType: 'APRESENTACAO',
    flowCode: 'MATERIAL', stage: 'MATERIAL_REENVIADO', recipients: 'ADMIN',
    subjectHuman: 'Slide ou material de apresentacao reenviado',
    introText: 'Uma nova versao do slide ou material foi enviada pelo apresentador.'
  }),
  APRESENTACAO_MATERIAL_APROVADO: Object.freeze({
    moduleName: 'APRESENTACOES', moduleCode: 'APR', entityType: 'APRESENTACAO',
    flowCode: 'MATERIAL', stage: 'MATERIAL_APROVADO', recipients: 'MEMBRO',
    subjectHuman: 'Slide ou material da apresentacao aprovado',
    introText: 'O slide ou material da sua apresentacao foi aprovado pela gestao do GEAPA.'
  }),
  APRESENTACAO_MATERIAL_AJUSTE_SOLICITADO: Object.freeze({
    moduleName: 'APRESENTACOES', moduleCode: 'APR', entityType: 'APRESENTACAO',
    flowCode: 'MATERIAL', stage: 'MATERIAL_AJUSTE', recipients: 'MEMBRO',
    subjectHuman: 'Ajuste solicitado no slide ou material da apresentacao',
    introText: 'A gestao do GEAPA solicitou um ajuste no slide ou material da sua apresentacao.'
  }),
  APRESENTACAO_MATERIAL_DISPENSADO: Object.freeze({
    moduleName: 'APRESENTACOES', moduleCode: 'APR', entityType: 'APRESENTACAO',
    flowCode: 'MATERIAL', stage: 'MATERIAL_DISPENSADO', recipients: 'MEMBRO',
    subjectHuman: 'Entrega de slide ou material dispensada',
    introText: 'A gestao do GEAPA registrou a dispensa formal do slide ou material desta apresentacao.'
  }),
  APRESENTACAO_FOTO_REUNIAO_ENVIADA: Object.freeze({
    moduleName: 'APRESENTACOES', moduleCode: 'APR', entityType: 'APRESENTACAO',
    flowCode: 'FOTO', stage: 'FOTO_REUNIAO_ENVIADA', recipients: 'FOTO_DYNAMIC',
    subjectHuman: 'Foto da reuniao registrada',
    introText: 'A foto vinculada a reuniao da apresentacao foi registrada no fluxo operacional do GEAPA.'
  }),
  APRESENTACAO_FOTO_REUNIAO_REENVIADA: Object.freeze({
    moduleName: 'APRESENTACOES', moduleCode: 'APR', entityType: 'APRESENTACAO',
    flowCode: 'FOTO', stage: 'FOTO_REUNIAO_REENVIADA', recipients: 'FOTO_DYNAMIC',
    subjectHuman: 'Foto da reuniao reenviada',
    introText: 'Uma nova versao da foto vinculada a reuniao da apresentacao foi registrada.'
  }),
  APRESENTACAO_FOTO_REUNIAO_APROVADA: Object.freeze({
    moduleName: 'APRESENTACOES', moduleCode: 'APR', entityType: 'APRESENTACAO',
    flowCode: 'FOTO', stage: 'FOTO_REUNIAO_APROVADA', recipients: 'MEMBRO',
    subjectHuman: 'Foto da reuniao aprovada',
    introText: 'A foto da reuniao vinculada a sua apresentacao foi aprovada pela gestao do GEAPA.'
  }),
  APRESENTACAO_FOTO_REUNIAO_AJUSTE_SOLICITADO: Object.freeze({
    moduleName: 'APRESENTACOES', moduleCode: 'APR', entityType: 'APRESENTACAO',
    flowCode: 'FOTO', stage: 'FOTO_REUNIAO_AJUSTE', recipients: 'MEMBRO',
    subjectHuman: 'Ajuste solicitado na foto da reuniao',
    introText: 'A gestao do GEAPA solicitou uma nova foto ou um ajuste no arquivo enviado para a reuniao.'
  }),
  APRESENTACAO_FOTO_REUNIAO_DISPENSADA: Object.freeze({
    moduleName: 'APRESENTACOES', moduleCode: 'APR', entityType: 'APRESENTACAO',
    flowCode: 'FOTO', stage: 'FOTO_REUNIAO_DISPENSADA', recipients: 'MEMBRO',
    subjectHuman: 'Entrega da foto da reuniao dispensada',
    introText: 'A gestao do GEAPA registrou a dispensa formal da foto desta reuniao.'
  }),
  JUSTIFICATIVA_ENVIADA: Object.freeze({
    moduleName: 'ATIVIDADES', moduleCode: 'ATV', entityType: 'JUSTIFICATIVA',
    flowCode: 'JUSTIFICATIVA', stage: 'JUSTIFICATIVA_ENVIADA', recipients: 'ADMIN',
    subjectHuman: 'Nova justificativa de falta para analise',
    introText: 'Uma justificativa de falta foi enviada pelo Portal GEAPA e aguarda analise da Secretaria.'
  }),
  JUSTIFICATIVA_DEFERIDA: Object.freeze({
    moduleName: 'ATIVIDADES', moduleCode: 'ATV', entityType: 'JUSTIFICATIVA',
    flowCode: 'JUSTIFICATIVA', stage: 'JUSTIFICATIVA_DEFERIDA', recipients: 'MEMBRO',
    subjectHuman: 'Justificativa de falta deferida',
    introText: 'Sua justificativa de falta foi deferida pela gestao do GEAPA.'
  }),
  JUSTIFICATIVA_INDEFERIDA: Object.freeze({
    moduleName: 'ATIVIDADES', moduleCode: 'ATV', entityType: 'JUSTIFICATIVA',
    flowCode: 'JUSTIFICATIVA', stage: 'JUSTIFICATIVA_INDEFERIDA', recipients: 'MEMBRO',
    subjectHuman: 'Justificativa de falta indeferida',
    introText: 'Sua justificativa de falta foi analisada e indeferida pela gestao do GEAPA.'
  }),
  JUSTIFICATIVA_AJUSTE_SOLICITADO: Object.freeze({
    moduleName: 'ATIVIDADES', moduleCode: 'ATV', entityType: 'JUSTIFICATIVA',
    flowCode: 'JUSTIFICATIVA', stage: 'JUSTIFICATIVA_AJUSTE', recipients: 'MEMBRO',
    subjectHuman: 'Complementacao solicitada na justificativa de falta',
    introText: 'A gestao do GEAPA solicitou ajustes ou informacoes complementares na sua justificativa.'
  })
});

/**
 * Monta e enfileira um contrato no Mail Hub. Nunca propaga erro ao chamador.
 */
function atividadesV2_mailQueueOutgoing_(evento, contexto) {
  var eventCode = atividades_normalizeTextUpper_(evento && evento.code || evento);
  var definition = ATIVIDADES_V2_MAIL_EVENTS_[eventCode];
  var ctx = contexto || {};
  if (!definition) {
    return atividadesV2_mailFailure_(eventCode, 'EVENTO_MAIL_NAO_SUPORTADO', 'Evento de mensageria nao suportado.', ctx);
  }

  try {
    if (typeof GEAPA_CORE === 'undefined' || !GEAPA_CORE || typeof GEAPA_CORE.coreMailQueueOutgoing !== 'function') {
      return atividadesV2_mailFailure_(eventCode, 'MAIL_HUB_INDISPONIVEL', 'GEAPA_CORE.coreMailQueueOutgoing nao esta disponivel.', ctx);
    }

    var result = ctx.resultado || {};
    var actionPayload = ctx.payload || {};
    var actionContext = atividades_normalizePortalContext_(ctx.contexto || {});
    var entityId = atividadesV2_mailResolveEntityId_(definition, result, actionPayload);
    if (!entityId) {
      return atividadesV2_mailFailure_(eventCode, 'ID_ENTIDADE_MAIL_AUSENTE', 'Nao foi possivel identificar a entidade para o e-mail.', ctx);
    }

    var reference = atividadesV2_mailResolveActivityReference_({
      eventCode: eventCode,
      definition: definition,
      result: result,
      payload: actionPayload,
      contexto: actionContext
    });
    var recipients = atividadesV2_mailResolveRecipients_({
      eventCode: eventCode,
      definition: definition,
      actionContext: actionContext,
      result: result,
      payload: actionPayload,
      reference: reference
    });
    if (!recipients.to.length) {
      return atividadesV2_mailFailure_(eventCode, 'DESTINATARIOS_MAIL_AUSENTES', 'Nenhum destinatario valido foi encontrado para o evento.', ctx);
    }

    var correlationKey = atividadesV2_mailBuildCorrelationKey_(definition, entityId);
    var contract = {
      moduleName: definition.moduleName,
      templateKey: 'GEAPA_OPERACIONAL',
      correlationKey: correlationKey,
      entityType: definition.entityType,
      entityId: entityId,
      flowCode: definition.flowCode,
      stage: definition.stage,
      to: recipients.to,
      cc: recipients.cc,
      bcc: recipients.bcc,
      recipientName: recipients.recipientName,
      subjectHuman: definition.subjectHuman,
      payload: atividadesV2_mailBuildPayload_(eventCode, definition, result, actionPayload),
      priority: definition.priority || 'NORMAL',
      forceQueueDuplicate: false,
      metadata: atividadesV2_mailBuildMetadata_(eventCode, definition, result, ctx, recipients, reference)
    };
    var queueResult = GEAPA_CORE.coreMailQueueOutgoing(contract) || {};
    if (queueResult.ok === false) {
      return atividadesV2_mailFailure_(eventCode, 'MAIL_HUB_REJEITOU_CONTRATO', queueResult.message || queueResult.errorMessage || 'Mail Hub nao aceitou o contrato.', ctx);
    }

    var safeResult = {
      ok: true,
      eventCode: eventCode,
      queued: queueResult.queued === true,
      duplicate: queueResult.duplicate === true,
      requeued: queueResult.requeued === true,
      saidaId: String(queueResult.saidaId || '').trim(),
      status: String(queueResult.status || '').trim(),
      correlationKey: String(queueResult.correlationKey || correlationKey).trim(),
      recipientSource: recipients.recipientSource || '',
      fallbackUsed: recipients.fallbackUsed === true
    };
    atividadesV2_mailLog_(safeResult.duplicate ? 'INFO' : 'INFO', eventCode, ctx, safeResult, 'Evento encaminhado ao Mail Hub do CORE.');
    return safeResult;
  } catch (err) {
    return atividadesV2_mailFailure_(eventCode, 'ERRO_ENFILEIRAR_MAIL_HUB', atividadesV2_errorMessage_(err), ctx);
  }
}

function atividadesV2_mailQueuePortalAction_(tipoAcao, payload, contexto, resultado) {
  var eventCode = atividadesV2_mailResolveEventFromPortalAction_(tipoAcao, resultado || {});
  if (!eventCode) return { ok: true, skipped: true, reason: 'EVENTO_SEM_EMAIL' };
  return atividadesV2_mailQueueOutgoing_(eventCode, {
    tipoAcao: tipoAcao,
    payload: payload || {},
    contexto: contexto || {},
    resultado: resultado || {}
  });
}

function atividadesV2_mailAttachQueueResult_(result, queueResult) {
  result = result || {};
  if (!queueResult || queueResult.skipped) return result;
  if (!queueResult.ok) {
    result.emailQueueWarning = String(queueResult.message || 'A acao foi concluida, mas o e-mail nao entrou na fila central.').slice(0, 300);
    result.emailQueue = {
      ok: false,
      eventCode: queueResult.eventCode || '',
      errorCode: queueResult.errorCode || ''
    };
    return result;
  }
  result.emailQueue = {
    ok: true,
    eventCode: queueResult.eventCode,
    queued: queueResult.queued,
    duplicate: queueResult.duplicate,
    requeued: queueResult.requeued,
    saidaId: queueResult.saidaId,
    status: queueResult.status,
    correlationKey: queueResult.correlationKey
  };
  return result;
}

function atividadesV2_mailResolveEventFromPortalAction_(tipoAcao, resultado) {
  var action = atividades_normalizeTextUpper_(tipoAcao);
  var direct = {
    APRESENTACAO_TITULO_EIXO_ENVIADO: 'APRESENTACAO_TITULO_EIXO_ENVIADO',
    APRESENTACAO_TITULO_EIXO_APROVADO: 'APRESENTACAO_TITULO_EIXO_APROVADO',
    APRESENTACAO_TITULO_EIXO_EDITADO_APROVADO: 'APRESENTACAO_TITULO_EIXO_APROVADO',
    APRESENTACAO_TITULO_EIXO_AJUSTE_SOLICITADO: 'APRESENTACAO_TITULO_EIXO_AJUSTE_SOLICITADO',
    APRESENTACAO_TITULO_EIXO_REPROVADO: 'APRESENTACAO_TITULO_EIXO_REPROVADO',
    APRESENTACAO_MATERIAL_ENVIADO: 'APRESENTACAO_MATERIAL_ENVIADO',
    APRESENTACAO_MATERIAL_REENVIADO: 'APRESENTACAO_MATERIAL_REENVIADO',
    APRESENTACAO_MATERIAL_APROVADO: 'APRESENTACAO_MATERIAL_APROVADO',
    APRESENTACAO_MATERIAL_AJUSTE_SOLICITADO: 'APRESENTACAO_MATERIAL_AJUSTE_SOLICITADO',
    APRESENTACAO_MATERIAL_DISPENSADO: 'APRESENTACAO_MATERIAL_DISPENSADO',
    APRESENTACAO_FOTO_REUNIAO_ENVIADA: 'APRESENTACAO_FOTO_REUNIAO_ENVIADA',
    APRESENTACAO_FOTO_REUNIAO_REENVIADA: 'APRESENTACAO_FOTO_REUNIAO_REENVIADA',
    APRESENTACAO_FOTO_REUNIAO_APROVADA: 'APRESENTACAO_FOTO_REUNIAO_APROVADA',
    APRESENTACAO_FOTO_REUNIAO_AJUSTE_SOLICITADO: 'APRESENTACAO_FOTO_REUNIAO_AJUSTE_SOLICITADO',
    APRESENTACAO_FOTO_REUNIAO_DISPENSADA: 'APRESENTACAO_FOTO_REUNIAO_DISPENSADA',
    JUSTIFICATIVA_ENVIADA_PORTAL: 'JUSTIFICATIVA_ENVIADA'
  };
  if (direct[action]) return direct[action];
  if (action !== 'JUSTIFICATIVA_ANALISADA_PORTAL') return '';
  var status = atividades_normalizeTextUpper_(resultado.statusAnalise || resultado.decisaoAplicada);
  if (status === 'DEFERIDA' || status === 'ABONADA' || status === 'FALTA_JUSTIFICADA' || status === 'FALTA_ABONADA') return 'JUSTIFICATIVA_DEFERIDA';
  if (status === 'INDEFERIDA' || status === 'MANTER_FALTA') return 'JUSTIFICATIVA_INDEFERIDA';
  if (status === 'AJUSTE_SOLICITADO') return 'JUSTIFICATIVA_AJUSTE_SOLICITADO';
  return '';
}

function atividadesV2_mailResolveEntityId_(definition, result, payload) {
  if (definition.entityType === 'JUSTIFICATIVA') {
    return String(result.idJustificativa || payload.idJustificativa || '').trim();
  }
  if (definition.entityType === 'ATIVIDADE') {
    return String(result.idAtividade || payload.idAtividade || '').trim();
  }
  return String(result.idApresentacao || payload.idApresentacao || '').trim();
}

function atividadesV2_mailResolveRecipients_(options) {
  var opts = options || {};
  var definition = opts.definition || {};
  var actionContext = opts.actionContext || {};
  var result = opts.result || {};
  var payload = opts.payload || {};
  var reference = opts.reference || {};
  var recipientMode = definition.recipients;
  if (recipientMode === 'FOTO_DYNAMIC') {
    recipientMode = atividades_isPrivilegedPortalProfile_(actionContext) ? 'MEMBRO' : 'ADMIN';
  }
  if (recipientMode === 'ADMIN') {
    return atividadesV2_mailResolveAdministrativeRecipients_({
      eventCode: opts.eventCode,
      definition: definition,
      result: result,
      payload: payload,
      contexto: actionContext,
      reference: reference
    });
  }

  var presentation = reference.apresentacao || {};
  var activity = reference.atividade || {};
  var justification = reference.justificativa || {};
  var idPessoa = String(
    result.idPessoa || payload.idPessoa || presentation.ID_PESSOA ||
    activity.ID_PESSOA_PRINCIPAL || justification.ID_PESSOA || ''
  ).trim();
  var memberEmail = String(
    result.email || payload.emailMembro || payload.email || presentation.EMAIL_MEMBRO ||
    activity.EMAIL_PESSOA_PRINCIPAL || justification.EMAIL_MEMBRO || ''
  ).trim();
  var source = memberEmail ? 'ATIVIDADES_V2_CONTEXTO_ACAO' : '';
  if (!memberEmail && idPessoa) {
    var personEmail = atividadesV2_mailResolvePersonEmailV2_(idPessoa, []);
    memberEmail = personEmail.email;
    if (memberEmail) source = personEmail.source;
  }
  return {
    to: atividadesV2_mailNormalizeEmails_([memberEmail]),
    cc: [],
    bcc: [],
    recipientName: atividades_sanitizePortalText_(
      result.nomeApresentador || result.nomeMembro || payload.nomeApresentador || payload.nomeMembro ||
      presentation.NOME_MEMBRO || activity.NOME_PESSOA_PRINCIPAL_PUBLICO || justification.NOME_MEMBRO || '',
      180
    ),
    recipientSource: source || 'NAO_RESOLVIDO',
    fallbackUsed: false,
    referenceDate: reference.referenceDate || '',
    ciclo: reference.ciclo || '',
    ano: reference.ano || '',
    semestre: reference.semestre || '',
    cargosResolvidos: [],
    idPessoaDestinatario: idPessoa,
    warnings: reference.warnings ? reference.warnings.slice() : []
  };
}

/**
 * Resolve ocupantes da Secretaria na data da atividade. MAIL_CONFIG e apenas fallback.
 */
function atividadesV2_mailResolveAdministrativeRecipients_(options) {
  var opts = options || {};
  var reference = opts.reference || atividadesV2_mailResolveActivityReference_(opts);
  var warnings = reference.warnings ? reference.warnings.slice() : [];
  var resolved;
  try {
    resolved = atividadesV2_mailResolveAdministrativeRecipientsV2_(reference, warnings);
  } catch (err) {
    warnings.push('Falha ao consultar Pessoas/Vigencias V2: ' + atividadesV2_errorMessage_(err));
    resolved = null;
  }
  if (resolved && resolved.to.length) return resolved;

  var fallback = atividadesV2_mailGetAdministrativeRecipientsFallback_();
  warnings = atividadesV2_mailUniqueText_(warnings.concat(resolved && resolved.warnings || []));
  if (fallback.length) warnings.push('MAIL_CONFIG usado como fallback por ausencia de ocupantes V2 com e-mail valido.');
  return {
    to: fallback,
    cc: [],
    bcc: [],
    recipientName: 'Secretaria do GEAPA',
    recipientSource: fallback.length ? 'MAIL_CONFIG_FALLBACK' : 'NAO_RESOLVIDO',
    fallbackUsed: fallback.length > 0,
    referenceDate: reference.referenceDate || '',
    ciclo: reference.ciclo || '',
    ano: reference.ano || '',
    semestre: reference.semestre || '',
    cargosResolvidos: resolved && resolved.cargosResolvidos || [],
    idPessoaDestinatario: '',
    warnings: atividadesV2_mailUniqueText_(warnings),
    adminResolverStats: resolved && resolved.adminResolverStats || {},
    adminResolverFallbackReason: resolved && resolved.adminResolverFallbackReason || 'ERRO_LEITURA_V2'
  };
}

function atividadesV2_mailResolveAdministrativeRecipientsV2_(reference, warnings) {
  var refDate = atividades_parseDateOrNull_(reference.referenceDate) || new Date();
  var cacheKey = atividadesV2_mailAdminRecipientsCacheKey_(reference, refDate);
  var cached = typeof portalCacheGetJson_ === 'function' ? portalCacheGetJson_(cacheKey) : null;
  if (cached && cached.to && cached.to.length) {
    cached.warnings = atividadesV2_mailUniqueText_((warnings || []).concat(cached.warnings || []));
    return cached;
  }

  var evaluation = atividadesV2_mailEvaluateAdministrativeRecipientsV2_(reference);
  var normalizedEmails = evaluation.to;
  var result = {
    to: normalizedEmails,
    cc: [],
    bcc: [],
    recipientName: 'Secretaria do GEAPA',
    recipientSource: normalizedEmails.length ? 'PESSOAS_V2_VIGENCIAS_V2' : 'NAO_RESOLVIDO',
    fallbackUsed: false,
    referenceDate: reference.referenceDate || atividadesV2_mailDateIso_(refDate),
    ciclo: reference.ciclo || '',
    ano: reference.ano || '',
    semestre: reference.semestre || '',
    cargosResolvidos: evaluation.cargosResolvidos,
    idPessoaDestinatario: evaluation.pessoasResolvidas.length === 1 ? evaluation.pessoasResolvidas[0].idPessoa : '',
    warnings: atividadesV2_mailUniqueText_((warnings || []).concat(evaluation.warnings || [])),
    adminResolverStats: evaluation.stats,
    adminResolverFallbackReason: evaluation.fallbackReason || ''
  };
  if (normalizedEmails.length && typeof portalCachePutJson_ === 'function') {
    portalCachePutJson_(cacheKey, result, ATIVIDADES_V2_MAIL_RECIPIENT_CACHE_TTL_SECONDS_);
  }
  return result;
}

function atividadesV2_mailEvaluateAdministrativeRecipientsV2_(reference) {
  var refDate = atividades_parseDateOrNull_(reference.referenceDate) || new Date();
  var readReport = { sources: {}, warnings: [], errors: [] };
  var data = {
    pessoas: atividadesV2_mailReadDomainRecordsSafe_('PESSOAS', 'BASE', readReport),
    identificadores: atividadesV2_mailReadDomainRecordsSafe_('PESSOAS', 'IDENTIFICADORES', readReport),
    vinculos: atividadesV2_mailReadDomainRecordsSafe_('PESSOAS', 'VINCULOS', readReport),
    diretorias: atividadesV2_mailReadDomainRecordsSafe_('VIGENCIAS', 'DIRETORIAS', readReport),
    cargos: atividadesV2_mailReadDomainRecordsSafe_('VIGENCIAS', 'CARGOS_CONFIG', readReport),
    funcoes: atividadesV2_mailReadDomainRecordsSafe_('VIGENCIAS', 'FUNCOES', readReport)
  };
  var stats = {
    totalPessoas: data.pessoas.length,
    totalIdentificadores: data.identificadores.length,
    totalVinculos: data.vinculos.length,
    totalDiretorias: data.diretorias.length,
    totalCargosConfig: data.cargos.length,
    totalFuncoes: data.funcoes.length,
    funcoesAtivasNaData: 0,
    funcoesComCargoAdministrativo: 0,
    funcoesComCargoRecebeEmail: 0,
    funcoesComDiretoriaValida: 0,
    funcoesComPessoaValida: 0,
    funcoesComVinculoValido: 0,
    funcoesComEmailValido: 0
  };
  var discardReasons = {};
  var pessoasById = atividadesV2_indexByField_(data.pessoas, 'ID_PESSOA');
  var cargosByKey = atividadesV2_indexByField_(data.cargos, 'CARGO_KEY');
  var diretoriasById = atividadesV2_indexByField_(data.diretorias, 'ID_DIRETORIA');
  var identifiersByPerson = atividadesV2_mailGroupByField_(data.identificadores, 'ID_PESSOA');
  var linksByPerson = atividadesV2_mailGroupByField_(data.vinculos, 'ID_PESSOA');
  var emails = [];
  var cargosResolvidos = [];
  var pessoasResolvidas = [];

  data.funcoes.forEach(function(funcao) {
    if (!atividadesV2_mailRecordActiveOnDate_(funcao, refDate, 'DATA_INICIO', ['DATA_FIM_REAL', 'DATA_FIM_PREVISTA'])) {
      atividadesV2_mailCountReason_(discardReasons, 'FUNCAO_FORA_DA_VIGENCIA');
      return;
    }
    stats.funcoesAtivasNaData++;

    var cargoKey = String(funcao.CARGO_KEY || '').trim();
    var cargo = cargosByKey[cargoKey] || {};
    if (!atividadesV2_mailIsAdministrativeRole_(funcao, cargo)) {
      atividadesV2_mailCountReason_(discardReasons, 'CARGO_NAO_ADMINISTRATIVO');
      return;
    }
    stats.funcoesComCargoAdministrativo++;

    if (!cargo.CARGO_KEY || String(cargo.ATIVO || 'SIM').trim().toUpperCase() === 'NAO' ||
        String(cargo.RECEBE_EMAILS || '').trim().toUpperCase() !== 'SIM') {
      atividadesV2_mailCountReason_(discardReasons, cargo.CARGO_KEY ? 'CARGO_NAO_RECEBE_EMAIL' : 'CARGO_CONFIG_NAO_LOCALIZADO');
      return;
    }
    stats.funcoesComCargoRecebeEmail++;

    var idDiretoria = String(funcao.ID_DIRETORIA || '').trim();
    var diretoria = idDiretoria ? diretoriasById[idDiretoria] : null;
    if (idDiretoria && (!diretoria || !atividadesV2_mailRecordActiveOnDate_(diretoria, refDate, 'DATA_INICIO', ['DATA_FIM_REAL', 'DATA_FIM_PREVISTA']))) {
      atividadesV2_mailCountReason_(discardReasons, 'DIRETORIA_INVALIDA');
      return;
    }
    stats.funcoesComDiretoriaValida++;

    var idPessoa = String(funcao.ID_PESSOA || '').trim();
    var pessoa = pessoasById[idPessoa];
    if (!idPessoa || !pessoa || !atividadesV2_mailIsBasePersonActive_(pessoa)) {
      atividadesV2_mailCountReason_(discardReasons, 'PESSOA_INVALIDA');
      return;
    }
    stats.funcoesComPessoaValida++;

    if (!atividadesV2_mailHasActiveLinkOnDate_(linksByPerson[idPessoa] || [], refDate)) {
      atividadesV2_mailCountReason_(discardReasons, 'VINCULO_INVALIDO');
      return;
    }
    stats.funcoesComVinculoValido++;

    var email = atividadesV2_mailResolveEmailFromPersonRecords_(pessoa, identifiersByPerson[idPessoa] || []);
    var emailSource = email ? 'PESSOA' : '';
    if (!email) {
      email = atividadesV2_mailNormalizeEmails_([cargo.EMAILS_GRUPO])[0] || '';
      if (email) emailSource = 'CARGO_CONFIG_EMAILS_GRUPO';
    }
    if (!email) {
      atividadesV2_mailCountReason_(discardReasons, 'PESSOA_SEM_EMAIL_VALIDO');
      return;
    }
    stats.funcoesComEmailValido++;
    emails.push(email);
    cargosResolvidos.push(cargoKey || funcao.CARGO_NOME_SNAPSHOT || '');
    pessoasResolvidas.push({
      idPessoa: idPessoa,
      nome: atividadesV2_mailMaskPersonName_(pessoa.NOME_EXIBICAO || pessoa.NOME_COMPLETO || ''),
      cargoKey: cargoKey,
      emailSource: emailSource
    });
  });

  var warnings = readReport.warnings.slice();
  if (readReport.errors.length) warnings.push('ERRO_LEITURA_V2');
  if (stats.funcoesAtivasNaData > 0 && stats.funcoesComCargoAdministrativo === 0) warnings.push('CARGOS_ADMINISTRATIVOS_NAO_LOCALIZADOS');
  if (discardReasons.DIRETORIA_INVALIDA) warnings.push('FUNCOES_ADMINISTRATIVAS_DESCARTADAS_POR_DIRETORIA');
  if (discardReasons.VINCULO_INVALIDO) warnings.push('FUNCOES_ADMINISTRATIVAS_DESCARTADAS_POR_VINCULO');
  if (discardReasons.PESSOA_SEM_EMAIL_VALIDO) warnings.push('PESSOAS_SEM_EMAIL_VALIDO');
  if (stats.funcoesComCargoAdministrativo > 0 && stats.funcoesComEmailValido === 0) warnings.push('FUNCOES_ADMINISTRATIVAS_ENCONTRADAS_SEM_EMAIL');
  var normalizedEmails = atividadesV2_mailNormalizeEmails_(emails);
  return {
    to: normalizedEmails,
    stats: stats,
    cargosResolvidos: atividadesV2_mailUniqueText_(cargosResolvidos),
    pessoasResolvidas: pessoasResolvidas,
    motivosDescarte: discardReasons,
    readSources: readReport.sources,
    readErrors: readReport.errors,
    warnings: atividadesV2_mailUniqueText_(warnings),
    fallbackReason: normalizedEmails.length ? '' : atividadesV2_mailResolveFallbackReason_(readReport, stats, discardReasons)
  };
}

function atividadesV2_mailGetAdministrativeRecipientsFallback_() {
  var configured = [];
  if (typeof GEAPA_CORE !== 'undefined' && GEAPA_CORE && typeof GEAPA_CORE.coreMailGetConfigList === 'function') {
    ATIVIDADES_V2_MAIL_ADMIN_CONFIG_KEYS_.forEach(function(key) {
      try {
        configured = configured.concat(GEAPA_CORE.coreMailGetConfigList(key) || []);
      } catch (err) {}
    });
  }
  return atividadesV2_mailNormalizeEmails_(configured);
}

function atividadesV2_mailResolveActivityReference_(options) {
  var opts = options || {};
  var result = opts.result || {};
  var payload = opts.payload || {};
  var idAtividade = String(opts.idAtividade || result.idAtividade || payload.idAtividade || '').trim();
  var idApresentacao = String(opts.idApresentacao || result.idApresentacao || payload.idApresentacao || '').trim();
  var idJustificativa = String(opts.idJustificativa || result.idJustificativa || payload.idJustificativa || '').trim();
  var warnings = [];
  var atividade = {};
  var apresentacao = {};
  var justificativa = {};

  if (idAtividade || idApresentacao || idJustificativa) {
    try {
      var ss = atividadesV2_getDatabaseSpreadsheet_();
      var atividades = atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES));
      var apresentacoes = idApresentacao
        ? atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.APRESENTACOES))
        : [];
      var justificativas = idJustificativa
        ? atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.JUSTIFICATIVAS))
        : [];

      apresentacao = atividadesV2_mailFindByField_(apresentacoes, 'ID_APRESENTACAO', idApresentacao) || {};
      justificativa = atividadesV2_mailFindByField_(justificativas, 'ID_JUSTIFICATIVA', idJustificativa) || {};
      idAtividade = idAtividade || String(apresentacao.ID_ATIVIDADE || justificativa.ID_ATIVIDADE || '').trim();
      atividade = atividadesV2_mailFindByField_(atividades, 'ID_ATIVIDADE', idAtividade) || {};
      if (idAtividade && !atividade.ID_ATIVIDADE) warnings.push('Atividade de referencia nao encontrada na base V2 do ambiente resolvido.');
    } catch (err) {
      warnings.push('Nao foi possivel carregar o contexto da atividade V2: ' + atividadesV2_errorMessage_(err));
    }
  }

  var date = atividades_parseDateOrNull_(opts.referenceDate || atividade.DATA_ATIVIDADE || result.dataAtividade || payload.dataAtividade);
  if (!date) {
    date = new Date();
    warnings.push('DATA_ATIVIDADE ausente; data atual usada apenas para resolver destinatarios.');
  }
  var ano = String(atividade.ANO || date.getFullYear()).trim();
  var semestre = String(atividade.SEMESTRE || (date.getMonth() < 6 ? 1 : 2)).trim();
  return {
    idAtividade: idAtividade,
    idApresentacao: idApresentacao,
    idJustificativa: idJustificativa,
    atividade: atividade,
    apresentacao: apresentacao,
    justificativa: justificativa,
    referenceDate: atividadesV2_mailDateIso_(date),
    ciclo: String(atividade.CICLO || result.ciclo || payload.ciclo || '').trim(),
    ano: ano,
    semestre: semestre,
    warnings: warnings
  };
}

function atividadesV2_mailReadDomainRecords_(domain, logicalSheet, readReport) {
  atividades_assertCoreLibrary_();
  if (typeof GEAPA_CORE.coreGetDomainSheet !== 'function') {
    throw new Error('GEAPA_CORE_DESATUALIZADO: coreGetDomainSheet indisponivel.');
  }
  var environment = atividadesV2_resolveEnvironment_({});
  var sourceKey = domain + '/' + logicalSheet;
  var sheet = GEAPA_CORE.coreGetDomainSheet(domain, logicalSheet, { ambiente: environment });
  if (readReport) readReport.sources[sourceKey] = 'GEAPA_CORE_DOMAIN/' + environment;
  return atividadesV2_readSheetObjects_(sheet);
}

function atividadesV2_mailReadDomainRecordsSafe_(domain, logicalSheet, readReport) {
  var sourceKey = domain + '/' + logicalSheet;
  try {
    return atividadesV2_mailReadDomainRecords_(domain, logicalSheet, readReport);
  } catch (err) {
    readReport.sources[sourceKey] = 'ERRO';
    readReport.errors.push({ key: sourceKey, errorCode: 'ERRO_LEITURA_V2', message: atividadesV2_errorMessage_(err).slice(0, 300) });
    return [];
  }
}

function atividadesV2_mailResolvePersonEmailV2_(idPessoa, warnings) {
  try {
    var pessoas = atividadesV2_mailReadDomainRecords_('PESSOAS', 'BASE');
    var identificadores = atividadesV2_mailReadDomainRecords_('PESSOAS', 'IDENTIFICADORES');
    var pessoa = atividadesV2_mailFindByField_(pessoas, 'ID_PESSOA', idPessoa) || {};
    var identifiers = identificadores.filter(function(record) {
      return String(record.ID_PESSOA || '').trim() === String(idPessoa || '').trim();
    });
    return {
      email: atividadesV2_mailResolveEmailFromPersonRecords_(pessoa, identifiers),
      source: 'PESSOAS_V2'
    };
  } catch (err) {
    if (warnings) warnings.push('Nao foi possivel resolver e-mail da pessoa pela Pessoas V2.');
    return { email: '', source: 'NAO_RESOLVIDO' };
  }
}

function atividadesV2_mailResolveEmailFromPersonRecords_(pessoa, identifiers) {
  var candidates = [pessoa && pessoa.EMAIL_PRINCIPAL];
  (identifiers || []).filter(function(record) {
    var type = atividades_normalizeTextUpper_(record.TIPO_IDENTIFICADOR);
    return String(record.ATIVO || 'SIM').trim().toUpperCase() !== 'NAO' &&
      (type === 'EMAIL' || type === 'E-MAIL');
  }).sort(function(a, b) {
    var aPrincipal = String(a.PRINCIPAL || '').trim().toUpperCase() === 'SIM' ? 1 : 0;
    var bPrincipal = String(b.PRINCIPAL || '').trim().toUpperCase() === 'SIM' ? 1 : 0;
    return bPrincipal - aPrincipal;
  }).forEach(function(record) {
    candidates.push(record.VALOR_IDENTIFICADOR);
  });
  return atividadesV2_mailNormalizeEmails_(candidates)[0] || '';
}

function atividadesV2_mailIsBasePersonActive_(pessoa) {
  if (!pessoa || String(pessoa.ATIVO || 'SIM').trim().toUpperCase() === 'NAO') return false;
  var status = atividades_normalizeTextUpper_(pessoa.STATUS_CADASTRAL || 'ATIVO');
  return ['INATIVO', 'INATIVA', 'EXCLUIDO', 'EXCLUIDA', 'CANCELADO', 'CANCELADA'].indexOf(status) === -1;
}

function atividadesV2_mailHasActiveLinkOnDate_(links, referenceDate) {
  if (!links || !links.length) return false;
  return links.some(function(link) {
    var status = atividades_normalizeTextUpper_(link.STATUS_VINCULO || 'ATIVO');
    if (['CANCELADO', 'CANCELADA', 'EXCLUIDO', 'EXCLUIDA'].indexOf(status) >= 0) return false;
    return atividadesV2_mailRecordActiveOnDate_(link, referenceDate, 'DATA_INICIO', ['DATA_FIM']);
  });
}

function atividadesV2_mailRecordActiveOnDate_(record, referenceDate, startField, endFields) {
  if (!record || String(record.ATIVO || 'SIM').trim().toUpperCase() === 'NAO') return false;
  var status = atividades_normalizeTextUpper_(record.STATUS_VIGENCIA || record.STATUS_DIRETORIA || record.STATUS || 'ATIVO');
  if (['CANCELADA', 'CANCELADO', 'ANULADA', 'ANULADO', 'REVOGADA', 'REVOGADO'].indexOf(status) >= 0) return false;
  var ref = atividades_parseDateOrNull_(referenceDate);
  var start = atividades_parseDateOrNull_(record[startField]);
  var end = null;
  (endFields || []).some(function(field) {
    end = atividades_parseDateOrNull_(record[field]);
    return !!end;
  });
  if (start && ref && atividadesV2_mailDayTime_(start) > atividadesV2_mailDayTime_(ref)) return false;
  if (end && ref && atividadesV2_mailDayTime_(end) < atividadesV2_mailDayTime_(ref)) return false;
  return true;
}

function atividadesV2_mailIsAdministrativeRole_(funcao, cargo) {
  var text = [
    funcao.CARGO_KEY,
    funcao.CARGO_NOME_SNAPSHOT,
    funcao.TIPO_FUNCAO,
    cargo.CARGO_KEY,
    cargo.CARGO_NOME,
    cargo.NOME_PUBLICO,
    cargo.TIPO_FUNCAO,
    cargo.GRUPO_FUNCAO,
    cargo.GRUPO_CARGO,
    cargo.EMAILS_GRUPO
  ].map(atividades_normalizeTextUpper_).join(' ');
  return /SECRETARI/.test(text);
}

function atividadesV2_mailCountReason_(reasons, code) {
  var key = String(code || 'NAO_INFORMADO').trim();
  reasons[key] = Number(reasons[key] || 0) + 1;
}

function atividadesV2_mailResolveFallbackReason_(readReport, stats, discardReasons) {
  if (readReport.errors.length) return 'ERRO_LEITURA_V2';
  if (!stats.totalFuncoes) return 'SEM_FUNCOES_V2';
  if (!stats.funcoesAtivasNaData) return 'SEM_FUNCOES_ATIVAS_NA_DATA';
  if (!stats.funcoesComCargoAdministrativo) return 'CARGOS_ADMINISTRATIVOS_NAO_LOCALIZADOS';
  if (!stats.funcoesComCargoRecebeEmail) return 'CARGOS_ADMINISTRATIVOS_SEM_RECEBIMENTO_EMAIL';
  if (!stats.funcoesComDiretoriaValida) return 'FUNCOES_ADMINISTRATIVAS_DESCARTADAS_POR_DIRETORIA';
  if (!stats.funcoesComPessoaValida) return 'PESSOAS_ADMINISTRATIVAS_INVALIDAS';
  if (!stats.funcoesComVinculoValido) return 'FUNCOES_ADMINISTRATIVAS_DESCARTADAS_POR_VINCULO';
  if (!stats.funcoesComEmailValido) return 'PESSOAS_SEM_EMAIL_VALIDO';
  var keys = Object.keys(discardReasons || {});
  return keys.length ? keys[0] : 'SEM_DESTINATARIOS_V2';
}

function atividadesV2_mailMaskPersonName_(name) {
  var parts = String(name || '').trim().split(/\s+/).filter(function(part) { return !!part; });
  if (!parts.length) return '';
  return parts[0] + (parts.length > 1 ? ' ' + parts[parts.length - 1].charAt(0) + '.' : '');
}

function atividadesV2_mailGroupByField_(records, field) {
  var out = {};
  (records || []).forEach(function(record) {
    var key = String(record && record[field] || '').trim();
    if (!key) return;
    if (!out[key]) out[key] = [];
    out[key].push(record);
  });
  return out;
}

function atividadesV2_mailFindByField_(records, field, value) {
  var wanted = String(value || '').trim();
  if (!wanted) return null;
  for (var i = 0; i < (records || []).length; i++) {
    if (String(records[i][field] || '').trim() === wanted) return records[i];
  }
  return null;
}

function atividadesV2_mailAdminRecipientsCacheKey_(reference, referenceDate) {
  var suffix = [
    ATIVIDADES_V2_MAIL_ADMIN_RESOLVER_CACHE_VERSION_,
    atividadesV2_mailDateIso_(referenceDate),
    reference.ciclo || '',
    reference.ano || '',
    reference.semestre || ''
  ].join(':');
  return typeof portalCacheBuildKey_ === 'function'
    ? portalCacheBuildKey_('mail-admin-v2', suffix)
    : 'portal:v2:mail-admin:' + suffix;
}

function atividadesV2_mailDateIso_(value) {
  var date = atividades_parseDateOrNull_(value);
  if (!date) return '';
  return Utilities.formatDate(date, Session.getScriptTimeZone() || 'America/Cuiaba', 'yyyy-MM-dd');
}

function atividadesV2_mailDayTime_(value) {
  var date = atividades_parseDateOrNull_(value);
  return date ? new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() : 0;
}

function atividadesV2_mailUniqueText_(values) {
  var seen = {};
  return (values || []).map(function(value) { return String(value || '').trim(); }).filter(function(value) {
    if (!value || seen[value]) return false;
    seen[value] = true;
    return true;
  });
}

function atividadesV2_mailNormalizeEmails_(values) {
  var unique = {};
  var out = [];
  (Array.isArray(values) ? values : [values]).forEach(function(value) {
    String(value || '').split(/[;,\n]+/).forEach(function(part) {
      var email = String(part || '').trim().toLowerCase();
      if (!email || unique[email] || !atividadesV2_mailIsValidEmail_(email)) return;
      unique[email] = true;
      out.push(email);
    });
  });
  return out;
}

function atividadesV2_mailIsValidEmail_(email) {
  if (typeof GEAPA_CORE !== 'undefined' && GEAPA_CORE && typeof GEAPA_CORE.coreIsValidEmail === 'function') {
    try { return GEAPA_CORE.coreIsValidEmail(email); } catch (err) {}
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function atividadesV2_mailBuildCorrelationKey_(definition, entityId) {
  var context = {
    businessId: entityId,
    entityId: entityId,
    flowCode: definition.flowCode,
    stage: definition.stage
  };
  if (typeof GEAPA_CORE !== 'undefined' && GEAPA_CORE && typeof GEAPA_CORE.coreMailBuildCorrelationKey === 'function') {
    try {
      return GEAPA_CORE.coreMailBuildCorrelationKey(definition.moduleCode, context);
    } catch (err) {}
  }
  return [definition.moduleCode, entityId, definition.flowCode, definition.stage].map(atividadesV2_mailCorrelationToken_).filter(function(value) {
    return !!value;
  }).join('-');
}

function atividadesV2_mailCorrelationToken_(value) {
  return atividades_normalizeTextUpper_(value).replace(/[^A-Z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function atividadesV2_mailBuildPayload_(eventCode, definition, result, payload) {
  var title = atividades_sanitizePortalText_(result.tituloPublico || result.tituloApresentacao || payload.tituloApresentacao || payload.tituloPublico || payload.titulo || '', 240);
  var primaryAxis = atividades_sanitizePortalText_(result.eixoTematicoPrincipal || payload.eixoTematicoPrincipal || '', 180);
  var secondaryAxis = atividades_sanitizePortalText_(result.eixoTematicoSecundario || payload.eixoTematicoSecundario || '', 180);
  var publicObservation = atividades_sanitizePortalText_(payload.observacaoPublica || payload.observacaoObrigatoria || payload.observacoes || '', 500);
  var status = atividades_sanitizePortalText_(result.statusTituloEixo || result.statusMaterial || result.statusFotoReuniao || result.statusArquivo || result.statusAnalise || result.decisaoAplicada || '', 120);
  var items = [
    atividadesV2_mailPayloadItem_('Atividade', result.idAtividade || payload.idAtividade),
    atividadesV2_mailPayloadItem_('Apresentacao', result.idApresentacao || payload.idApresentacao),
    atividadesV2_mailPayloadItem_('Justificativa', result.idJustificativa || payload.idJustificativa),
    atividadesV2_mailPayloadItem_('Titulo', title),
    atividadesV2_mailPayloadItem_('Eixo principal', primaryAxis),
    atividadesV2_mailPayloadItem_('Eixo secundario', secondaryAxis),
    atividadesV2_mailPayloadItem_('Status', status),
    atividadesV2_mailPayloadItem_('Observacao', publicObservation),
    atividadesV2_mailPayloadItem_('Arquivo', result.nomeArquivoMaterial || result.nomeArquivo || ''),
    atividadesV2_mailPayloadItem_('Link do material', result.linkMaterialApresentacao || result.linkArquivo || '')
  ].filter(function(item) { return !!item; });

  return {
    title: definition.subjectHuman,
    subtitle: 'Portal GEAPA - fluxo operacional',
    preheader: definition.introText,
    introText: definition.introText,
    blocks: [{ title: 'Dados do fluxo', items: items }],
    footerNote: 'Mensagem automatica registrada pela central de mensageria do GEAPA.',
    idAtividade: String(result.idAtividade || payload.idAtividade || '').trim(),
    idApresentacao: String(result.idApresentacao || payload.idApresentacao || '').trim(),
    idJustificativa: String(result.idJustificativa || payload.idJustificativa || '').trim(),
    tituloApresentacao: title,
    eixoTematicoPrincipal: primaryAxis,
    eixoTematicoSecundario: secondaryAxis,
    statusNovo: status,
    observacaoPublica: publicObservation,
    linkMaterial: String(result.linkMaterialApresentacao || result.linkArquivo || '').trim(),
    nomeArquivoMaterial: String(result.nomeArquivoMaterial || result.nomeArquivo || '').trim(),
    evento: eventCode
  };
}

function atividadesV2_mailPayloadItem_(label, value) {
  var text = String(value || '').trim();
  return text ? { label: label, value: text } : null;
}

function atividadesV2_mailBuildMetadata_(eventCode, definition, result, context, recipients, reference) {
  var rawContext = context && context.contexto || {};
  var ctx = atividades_normalizePortalContext_(rawContext);
  var recipientInfo = recipients || {};
  var ref = reference || {};
  return {
    source: 'geapa-atividades-v2-portal',
    mode: 'DEV',
    eventCode: eventCode,
    actionType: String(context.tipoAcao || '').trim(),
    moduleCode: definition.moduleCode,
    idAtividade: String(result.idAtividade || ref.idAtividade || '').trim(),
    idApresentacao: String(result.idApresentacao || ref.idApresentacao || '').trim(),
    idJustificativa: String(result.idJustificativa || ref.idJustificativa || '').trim(),
    recipientSource: recipientInfo.recipientSource || 'NAO_RESOLVIDO',
    fallbackUsed: recipientInfo.fallbackUsed === true,
    referenceDate: recipientInfo.referenceDate || ref.referenceDate || '',
    ciclo: recipientInfo.ciclo || ref.ciclo || '',
    ano: recipientInfo.ano || ref.ano || '',
    semestre: recipientInfo.semestre || ref.semestre || '',
    cargosResolvidos: (recipientInfo.cargosResolvidos || []).slice(),
    idPessoaDestinatario: String(recipientInfo.idPessoaDestinatario || '').trim(),
    recipientWarnings: atividadesV2_mailUniqueText_(recipientInfo.warnings || []).slice(0, 20),
    adminResolverStats: recipientInfo.adminResolverStats || {},
    adminResolverFallbackReason: String(recipientInfo.adminResolverFallbackReason || '').trim(),
    atorNome: atividades_sanitizePortalText_(rawContext.nome || rawContext.nomeExibicao || rawContext.usuarioNome || '', 160),
    atorEmail: String(ctx.email || '').trim().toLowerCase(),
    atorPerfil: String(ctx.perfil || '').trim().toUpperCase()
  };
}

function atividadesV2_mailFailure_(eventCode, errorCode, message, context) {
  var failure = {
    ok: false,
    queued: false,
    duplicate: false,
    eventCode: eventCode || '',
    errorCode: errorCode,
    message: String(message || 'Falha ao enfileirar e-mail.').slice(0, 300)
  };
  atividadesV2_mailLog_('WARN', eventCode, context || {}, failure, 'Falha nao bloqueante ao encaminhar evento ao Mail Hub.');
  return failure;
}

function atividadesV2_mailLog_(level, eventCode, context, result, message) {
  var safe = {
    evento: eventCode || '',
    queued: result && result.queued === true,
    duplicate: result && result.duplicate === true,
    errorCode: result && result.errorCode || '',
    correlationKey: result && result.correlationKey || '',
    saidaId: result && result.saidaId || ''
  };
  try {
    atividadesV2_appendV2Log_(atividadesV2_getDatabaseSpreadsheet_(), {
      FLUXO: 'MAIL_HUB_PORTAL_V2',
      ACAO: 'MAIL_HUB_' + String(eventCode || 'EVENTO').slice(0, 120),
      NIVEL: level || 'INFO',
      STATUS: result && result.ok ? (result.duplicate ? 'DUPLICADO' : 'OK') : 'WARN',
      ID_ATIVIDADE: context && context.resultado && context.resultado.idAtividade || '',
      MENSAGEM: message,
      DETALHES_JSON: atividadesV2_safeLogData_(safe)
    });
  } catch (err) {
    Logger.log('GEAPA-ATIVIDADES-V2 MAIL HUB [' + String(level || 'WARN') + '] ' + atividadesV2_safeLogData_(safe));
  }
}

function atividadesV2_processarFilaEmailsCore_() {
  try {
    if (typeof GEAPA_CORE === 'undefined' || !GEAPA_CORE || typeof GEAPA_CORE.coreMailProcessOutbox !== 'function') {
      return { ok: false, errorCode: 'MAIL_HUB_INDISPONIVEL', message: 'GEAPA_CORE.coreMailProcessOutbox nao esta disponivel.' };
    }
    return GEAPA_CORE.coreMailProcessOutbox();
  } catch (err) {
    atividadesV2_mailLog_('ERRO', 'PROCESSAR_OUTBOX', {}, { ok: false, errorCode: 'ERRO_PROCESSAR_OUTBOX' }, atividadesV2_errorMessage_(err));
    return { ok: false, errorCode: 'ERRO_PROCESSAR_OUTBOX', message: atividadesV2_errorMessage_(err) };
  }
}

function atividadesV2_diagnosticarMailHubIntegracao_() {
  var queueAvailable = typeof GEAPA_CORE !== 'undefined' && GEAPA_CORE && typeof GEAPA_CORE.coreMailQueueOutgoing === 'function';
  var processAvailable = typeof GEAPA_CORE !== 'undefined' && GEAPA_CORE && typeof GEAPA_CORE.coreMailProcessOutbox === 'function';
  var correlationAvailable = typeof GEAPA_CORE !== 'undefined' && GEAPA_CORE && typeof GEAPA_CORE.coreMailBuildCorrelationKey === 'function';
  return {
    ok: !!queueAvailable,
    modo: atividadesV2_resolveEnvironment_({}),
    mailHubDisponivel: !!queueAvailable,
    processadorDisponivel: !!processAvailable,
    correlationKeyCoreDisponivel: !!correlationAvailable,
    totalDestinatariosFallbackConfigurados: atividadesV2_mailGetAdministrativeRecipientsFallback_().length,
    configKeysAdministrativas: ATIVIDADES_V2_MAIL_ADMIN_CONFIG_KEYS_.slice(),
    fonteAdministrativaPrincipal: 'PESSOAS_V2_VIGENCIAS_V2',
    fonteAdministrativaFallback: 'MAIL_CONFIG',
    eventosSuportados: Object.keys(ATIVIDADES_V2_MAIL_EVENTS_),
    processaOutboxDurantePortal: false,
    escritaRealizada: false
  };
}

/**
 * Simula contratos por evento sem enfileirar, escrever ou processar a outbox.
 */
function atividadesV2_diagnosticarMailHubEventosPortalDev_(options) {
  var opts = options || {};
  var requestedEvent = atividades_normalizeTextUpper_(opts.eventCode || '');
  var eventCodes = requestedEvent ? [requestedEvent] : Object.keys(ATIVIDADES_V2_MAIL_EVENTS_);
  var report = {
    ok: true,
    modo: atividadesV2_resolveEnvironment_({}),
    dryRun: true,
    eventosAvaliados: 0,
    eventosOk: 0,
    eventosComAviso: 0,
    eventosComErro: 0,
    eventosSuportados: Object.keys(ATIVIDADES_V2_MAIL_EVENTS_),
    detalhes: [],
    escritaRealizada: false,
    enfileiramentoRealizado: false,
    processouOutbox: false
  };
  var result = {
    idAtividade: String(opts.idAtividade || '').trim(),
    idApresentacao: String(opts.idApresentacao || '').trim(),
    idJustificativa: String(opts.idJustificativa || '').trim(),
    email: String(opts.emailTeste || '').trim()
  };
  var payload = {
    idAtividade: result.idAtividade,
    idApresentacao: result.idApresentacao,
    idJustificativa: result.idJustificativa,
    emailMembro: result.email
  };
  var actionContext = atividades_normalizePortalContext_({
    perfil: opts.perfilTeste || 'ADMIN_TECNICO',
    email: opts.emailTeste || ''
  });
  var sharedReference = atividadesV2_mailResolveActivityReference_({
    result: result,
    payload: payload,
    contexto: actionContext
  });

  eventCodes.forEach(function(eventCode) {
    var definition = ATIVIDADES_V2_MAIL_EVENTS_[eventCode];
    report.eventosAvaliados++;
    if (!definition) {
      report.eventosComErro++;
      report.detalhes.push({ eventCode: eventCode, ok: false, errorCode: 'EVENTO_MAIL_NAO_SUPORTADO' });
      return;
    }

    var reference = sharedReference;
    var entityId = atividadesV2_mailResolveEntityId_(definition, result, payload);
    var recipients = atividadesV2_mailResolveRecipients_({
      eventCode: eventCode,
      definition: definition,
      actionContext: actionContext,
      result: result,
      payload: payload,
      reference: reference
    });
    var warnings = (reference.warnings || []).concat(recipients.warnings || []);
    var errors = [];
    if (!entityId) errors.push('ID_ENTIDADE_MAIL_AUSENTE');
    if (!recipients.to.length) errors.push('DESTINATARIOS_MAIL_AUSENTES');
    var detail = {
      eventCode: eventCode,
      ok: errors.length === 0,
      entityType: definition.entityType,
      entityId: entityId,
      recipientMode: definition.recipients,
      recipientSource: recipients.recipientSource || 'NAO_RESOLVIDO',
      fallbackUsed: recipients.fallbackUsed === true,
      totalDestinatarios: recipients.to.length,
      destinatariosMascarados: recipients.to.slice(0, 3).map(atividadesV2_mailMaskEmail_),
      referenceDate: recipients.referenceDate || reference.referenceDate || '',
      ciclo: recipients.ciclo || reference.ciclo || '',
      ano: recipients.ano || reference.ano || '',
      semestre: recipients.semestre || reference.semestre || '',
      cargosResolvidos: (recipients.cargosResolvidos || []).slice(),
      adminResolverStats: recipients.adminResolverStats || {},
      adminResolverFallbackReason: recipients.adminResolverFallbackReason || '',
      correlationKey: entityId ? atividadesV2_mailBuildCorrelationKey_(definition, entityId) : '',
      warnings: atividadesV2_mailUniqueText_(warnings),
      errors: errors
    };
    if (detail.ok && detail.warnings.length) report.eventosComAviso++;
    else if (detail.ok) report.eventosOk++;
    else report.eventosComErro++;
    report.detalhes.push(detail);
  });

  report.ok = report.eventosComErro === 0;
  return report;
}

/**
 * Explica cada filtro do resolver administrativo sem enfileirar mensagens.
 */
function atividadesV2_diagnosticarDestinatariosAdministrativosV2Dev_(options) {
  var opts = options || {};
  var reference = atividadesV2_mailResolveActivityReference_({
    idAtividade: opts.idAtividade,
    idApresentacao: opts.idApresentacao,
    idJustificativa: opts.idJustificativa,
    referenceDate: opts.referenceDate,
    result: {},
    payload: {}
  });
  var evaluation = atividadesV2_mailEvaluateAdministrativeRecipientsV2_(reference);
  var fallbackConfigured = atividadesV2_mailGetAdministrativeRecipientsFallback_();
  var stats = evaluation.stats;
  return {
    ok: evaluation.readErrors.length === 0 && evaluation.to.length > 0,
    modo: atividadesV2_resolveEnvironment_({}),
    dryRun: true,
    eventCode: atividades_normalizeTextUpper_(opts.eventCode || ''),
    referenceDate: reference.referenceDate,
    idAtividade: reference.idAtividade,
    idApresentacao: reference.idApresentacao,
    idJustificativa: reference.idJustificativa,
    ciclo: reference.ciclo,
    ano: reference.ano,
    semestre: reference.semestre,
    totalPessoas: stats.totalPessoas,
    totalIdentificadores: stats.totalIdentificadores,
    totalVinculos: stats.totalVinculos,
    totalDiretorias: stats.totalDiretorias,
    totalCargosConfig: stats.totalCargosConfig,
    totalFuncoes: stats.totalFuncoes,
    etapasFiltro: {
      funcoesAtivasNaData: stats.funcoesAtivasNaData,
      funcoesComCargoAdministrativo: stats.funcoesComCargoAdministrativo,
      funcoesComCargoRecebeEmail: stats.funcoesComCargoRecebeEmail,
      funcoesComDiretoriaValida: stats.funcoesComDiretoriaValida,
      funcoesComPessoaValida: stats.funcoesComPessoaValida,
      funcoesComVinculoValido: stats.funcoesComVinculoValido,
      funcoesComEmailValido: stats.funcoesComEmailValido
    },
    recipientSource: evaluation.to.length ? 'PESSOAS_V2_VIGENCIAS_V2' : 'NAO_RESOLVIDO',
    fallbackUsed: false,
    usariaFallback: evaluation.to.length === 0 && fallbackConfigured.length > 0,
    adminResolverFallbackReason: evaluation.fallbackReason,
    destinatariosResolvidosMascarados: evaluation.to.map(atividadesV2_mailMaskEmail_),
    cargosResolvidos: evaluation.cargosResolvidos,
    pessoasResolvidas: evaluation.pessoasResolvidas,
    motivosDescarte: evaluation.motivosDescarte,
    fontesLeitura: evaluation.readSources,
    errosLeitura: evaluation.readErrors,
    warnings: atividadesV2_mailUniqueText_((reference.warnings || []).concat(evaluation.warnings || [])),
    fallbackKeys: ATIVIDADES_V2_MAIL_ADMIN_CONFIG_KEYS_.slice(),
    totalDestinatariosFallbackConfigurados: fallbackConfigured.length,
    escritaRealizada: false,
    enfileiramentoRealizado: false,
    processouOutbox: false
  };
}

function atividadesV2_limparCacheDestinatariosMailHubDev_(options) {
  var opts = options || {};
  var reference = atividadesV2_mailResolveActivityReference_({
    idAtividade: opts.idAtividade,
    idApresentacao: opts.idApresentacao,
    idJustificativa: opts.idJustificativa,
    referenceDate: opts.referenceDate,
    result: {},
    payload: {}
  });
  var cacheKey = atividadesV2_mailAdminRecipientsCacheKey_(reference, reference.referenceDate);
  if (typeof portalCacheRemove_ === 'function') portalCacheRemove_(cacheKey);
  else CacheService.getScriptCache().remove(cacheKey);
  return {
    ok: true,
    modo: atividadesV2_resolveEnvironment_({}),
    cacheScope: 'MAIL_ADMIN_RECIPIENTS_V2',
    referenceDate: reference.referenceDate,
    ciclo: reference.ciclo,
    removido: true
  };
}

function atividadesV2_mailMaskEmail_(email) {
  var parts = String(email || '').trim().split('@');
  if (parts.length !== 2) return '';
  var local = parts[0];
  return (local ? local.charAt(0) : '*') + '***@' + parts[1];
}
