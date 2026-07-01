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

var ATIVIDADES_V2_MAIL_EVENTS_ = Object.freeze({
  APRESENTACAO_TITULO_EIXO_ENVIADO: Object.freeze({
    moduleName: 'APRESENTACOES', moduleCode: 'APR', entityType: 'APRESENTACAO',
    flowCode: 'TITULO_EIXO', stage: 'TITULO_EIXO_ENVIADO', recipients: 'ADMIN',
    subjectHuman: 'Nova proposta de titulo e eixos para analise',
    introText: 'Uma proposta de titulo e eixos foi enviada pelo apresentador e aguarda analise da Secretaria/Diretoria.'
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
    introText: 'Um slide ou material de apresentacao foi enviado e esta disponivel para acompanhamento da Secretaria/Diretoria.'
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
  JUSTIFICATIVA_ENVIADA: Object.freeze({
    moduleName: 'ATIVIDADES', moduleCode: 'ATV', entityType: 'JUSTIFICATIVA',
    flowCode: 'JUSTIFICATIVA', stage: 'JUSTIFICATIVA_ENVIADA', recipients: 'ADMIN',
    subjectHuman: 'Nova justificativa de falta para analise',
    introText: 'Uma justificativa de falta foi enviada pelo Portal GEAPA e aguarda analise da Secretaria/Diretoria.'
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

    var recipients = atividadesV2_mailResolveRecipients_(definition, actionContext, result, actionPayload);
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
      metadata: atividadesV2_mailBuildMetadata_(eventCode, definition, result, ctx)
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
      correlationKey: String(queueResult.correlationKey || correlationKey).trim()
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
    APRESENTACAO_FOTO_REUNIAO_ENVIADA: 'APRESENTACAO_FOTO_REUNIAO_ENVIADA',
    APRESENTACAO_FOTO_REUNIAO_REENVIADA: 'APRESENTACAO_FOTO_REUNIAO_REENVIADA',
    APRESENTACAO_FOTO_REUNIAO_APROVADA: 'APRESENTACAO_FOTO_REUNIAO_APROVADA',
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

function atividadesV2_mailResolveRecipients_(definition, actionContext, result, payload) {
  var recipientMode = definition.recipients;
  if (recipientMode === 'FOTO_DYNAMIC') {
    recipientMode = atividades_isPrivilegedPortalProfile_(actionContext) ? 'MEMBRO' : 'ADMIN';
  }
  if (recipientMode === 'ADMIN') {
    return {
      to: atividadesV2_mailGetAdministrativeRecipients_(),
      cc: [],
      bcc: [],
      recipientName: 'Secretaria e Diretoria do GEAPA'
    };
  }

  var memberEmail = String(result.email || payload.emailMembro || payload.email || '').trim();
  return {
    to: atividadesV2_mailNormalizeEmails_([memberEmail]),
    cc: [],
    bcc: [],
    recipientName: atividades_sanitizePortalText_(result.nomeApresentador || result.nomeMembro || payload.nomeApresentador || payload.nomeMembro || '', 180)
  };
}

function atividadesV2_mailGetAdministrativeRecipients_() {
  var configured = [];
  if (typeof GEAPA_CORE !== 'undefined' && GEAPA_CORE && typeof GEAPA_CORE.coreMailGetConfigList === 'function') {
    ATIVIDADES_V2_MAIL_ADMIN_CONFIG_KEYS_.forEach(function(key) {
      try {
        configured = configured.concat(GEAPA_CORE.coreMailGetConfigList(key) || []);
      } catch (err) {}
    });
  }
  configured = atividadesV2_mailNormalizeEmails_(configured);
  if (configured.length) return configured;

  var groups = [];
  if (typeof GEAPA_CORE !== 'undefined' && GEAPA_CORE && typeof GEAPA_CORE.coreGetCurrentEmailsByEmailGroup === 'function') {
    ['SECRETARIA', 'DIRETORIA'].forEach(function(group) {
      try {
        groups = groups.concat(GEAPA_CORE.coreGetCurrentEmailsByEmailGroup(group) || []);
      } catch (err) {}
    });
  }
  return atividadesV2_mailNormalizeEmails_(groups);
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

function atividadesV2_mailBuildMetadata_(eventCode, definition, result, context) {
  return {
    source: 'geapa-atividades',
    mode: 'DEV',
    eventCode: eventCode,
    actionType: String(context.tipoAcao || '').trim(),
    moduleCode: definition.moduleCode,
    idAtividade: String(result.idAtividade || '').trim(),
    idApresentacao: String(result.idApresentacao || '').trim(),
    idJustificativa: String(result.idJustificativa || '').trim()
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
    atividadesV2_appendV2Log_(atividadesV2_getDatabaseSpreadsheetDev_(), {
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
    modo: 'DEV',
    mailHubDisponivel: !!queueAvailable,
    processadorDisponivel: !!processAvailable,
    correlationKeyCoreDisponivel: !!correlationAvailable,
    totalDestinatariosAdministrativos: atividadesV2_mailGetAdministrativeRecipients_().length,
    configKeysAdministrativas: ATIVIDADES_V2_MAIL_ADMIN_CONFIG_KEYS_.slice(),
    eventosSuportados: Object.keys(ATIVIDADES_V2_MAIL_EVENTS_),
    processaOutboxDurantePortal: false,
    escritaRealizada: false
  };
}
