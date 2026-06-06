function atividades_buildConfirmacaoConvidadoCorrelationKey_(idAtividade, idConvite) {
  return [
    'ACF',
    atividades_normalizeTextUpper_(idAtividade).replace(/[^\w]+/g, '_'),
    atividades_normalizeTextUpper_(idConvite).replace(/[^\w]+/g, '_')
  ].join('-');
}

function atividades_parseConfirmacaoConvidadoCorrelationKey_(correlationKey) {
  var normalized = String(correlationKey || '').trim().toUpperCase();
  var match = normalized.match(/^ACF-([A-Z0-9_]+)-([A-Z0-9_]+)$/);
  if (!match) return null;
  return {
    activityToken: match[1],
    inviteToken: match[2]
  };
}

function atividades_isTipoVinculoConvidadoConfirmavel_(tipoVinculo) {
  var tipo = atividades_normalizeTextUpper_(tipoVinculo);
  return tipo && tipo !== 'MEMBRO';
}

function atividades_buildActivityIndexForConfirmacoes_() {
  var index = {};
  GEAPA_CORE.coreReadSheetRecords(atividades_getAtividadesSheet_(), { headerRow: 1 }).forEach(function(record) {
    var idAtividade = String(record.ID_ATIVIDADE || '').trim();
    if (idAtividade) index[idAtividade] = record;
  });
  return index;
}

function atividades_activityRequiresGuestConfirmation_(activityRecord) {
  if (!activityRecord) return false;
  var status = atividades_normalizeTextUpper_(activityRecord.STATUS);
  return (atividades_isConfirmedLikeGeneralActivityStatus_(status) || status === 'REALIZADA') &&
    atividades_isTruthySim_(activityRecord.EXIGE_CONFIRMACAO_PRESENCA);
}

function atividades_activityCanSendGuestConfirmation_(activityRecord) {
  if (!activityRecord) return false;
  return atividades_normalizeTextUpper_(activityRecord.STATUS) === 'CONVITES_LIBERADOS' &&
    atividades_isTruthySim_(activityRecord.EXIGE_CONFIRMACAO_PRESENCA);
}

function atividades_buildConfirmacaoConvidadoPayload_(activityRecord, convidadoRecord) {
  var dataTxt = activityRecord.DATA_ATIVIDADE
    ? GEAPA_CORE.coreFormatDate(atividades_parseDateOrNull_(activityRecord.DATA_ATIVIDADE), Session.getScriptTimeZone(), ATIVIDADES_CFG.DATE_FORMAT)
    : '-';
  var horarioTxt = [activityRecord.HORARIO_INICIO, activityRecord.HORARIO_FIM].filter(Boolean).join(' as ') || '-';
  var primeiroNome = atividades_getPrimeiroNome_(convidadoRecord.NOME || '');
  var saudacao = primeiroNome ? ('Olá, ' + primeiroNome + '.') : 'Olá.';

  return {
    subtitle: 'Confirmação de presença em atividade do GEAPA',
    introText: saudacao + ' Por favor, confirme se você poderá participar da atividade abaixo.',
    blocks: [
      {
        title: 'Atividade',
        items: [
          { label: 'Título', value: String(activityRecord.TITULO || '').trim() || '-' },
          { label: 'Data', value: dataTxt },
          { label: 'Horário', value: horarioTxt },
          { label: 'Local', value: String(activityRecord.LOCAL || '').trim() || '-' },
          { label: 'Formato', value: String(activityRecord.FORMATO || '').trim() || '-' }
        ]
      },
      {
        title: 'Como responder',
        items: [
          { label: 'Se puder participar', value: 'Responda este e-mail apenas com SIM.' },
          { label: 'Se não puder participar', value: 'Responda este e-mail apenas com NÃO.' }
        ]
      }
    ],
    footerNote: 'Resposta processada automaticamente pelo GEAPA. Caso precise incluir observações, escreva após a primeira linha.'
  };
}

function atividades_enviarSolicitacoesConfirmacaoConvidados_(opts) {
  opts = opts || {};
  atividades_garantirEstruturasFixasV1_();

  var convidadosSheet = atividades_getConvidadosSheet_();
  var convidadosHeaderMap = GEAPA_CORE.coreHeaderMap(convidadosSheet, 1);
  var activityIndex = atividades_buildActivityIndexForConfirmacoes_();
  var activityFilterSet = atividades_buildActivityFilterSet_(opts.activityIds);
  var queued = [];
  var duplicates = 0;
  var deferred = 0;
  var skipped = [];
  var skippedReasons = {};
  var scanned = 0;
  var eligible = 0;

  function pushSkipped_(idAtividade, idConvite, reason) {
    var normalizedReason = String(reason || 'skip').trim();
    skippedReasons[normalizedReason] = (skippedReasons[normalizedReason] || 0) + 1;
    skipped.push({
      idAtividade: String(idAtividade || '').trim(),
      idConvite: String(idConvite || '').trim(),
      reason: normalizedReason
    });
  }

  GEAPA_CORE.coreReadSheetRecords(convidadosSheet, { headerRow: 1 }).forEach(function(record, index) {
    var rowNumber = index + 2;
    var idAtividade = String(record.ID_ATIVIDADE || '').trim();
    var idConvite = String(record.ID_CONVITE_ATIVIDADE || '').trim();
    var activityRecord = activityIndex[idAtividade] || null;

    if (!idAtividade || !idConvite) return;
    if (!atividades_activityPassesFilter_(idAtividade, activityFilterSet)) return;
    scanned++;
    if (!atividades_activityCanSendGuestConfirmation_(activityRecord)) {
      pushSkipped_(idAtividade, idConvite, 'atividade_nao_liberada_para_envio');
      return;
    }
    if (!atividades_isTipoVinculoConvidadoConfirmavel_(record.TIPO_VINCULO_PESSOA)) {
      pushSkipped_(idAtividade, idConvite, 'tipo_vinculo_nao_confirmavel');
      return;
    }
    if (atividades_normalizeTextUpper_(record.CONFIRMADO)) {
      pushSkipped_(idAtividade, idConvite, 'confirmacao_ja_respondida');
      return;
    }
    if (atividades_parseDateOrNull_(record.DATA_ENVIO_CONFIRMACAO)) {
      pushSkipped_(idAtividade, idConvite, 'solicitacao_ja_enviada');
      return;
    }
    eligible++;

    var email = String(record.EMAIL || '').trim();
    if (!GEAPA_CORE.coreIsValidEmail(email)) {
      pushSkipped_(idAtividade, idConvite, 'email_invalido');
      return;
    }

    var correlationKey = atividades_buildConfirmacaoConvidadoCorrelationKey_(idAtividade, idConvite);
    var queueResult = atividades_tryQueueOutgoing_({
      moduleName: ATIVIDADES_CFG.MODULE_CODE,
      templateKey: 'GEAPA_OPERACIONAL',
      correlationKey: correlationKey,
      entityType: String(record.TIPO_VINCULO_PESSOA || 'CONVIDADO').trim(),
      entityId: String(record.ID_REFERENCIA || idConvite).trim(),
      flowCode: 'CONF_PRES',
      stage: 'SOLICITACAO',
      to: email,
      recipientName: String(record.NOME || '').trim(),
      subjectHuman: ATIVIDADES_CFG.APRESENTACOES_JOB.CONFIRMACAO_PRESENCA_SUBJECT,
      payload: atividades_buildConfirmacaoConvidadoPayload_(activityRecord, record),
      metadata: {
        source: 'geapa-atividades',
        idAtividade: idAtividade,
        idConviteAtividade: idConvite,
        tipoVinculo: String(record.TIPO_VINCULO_PESSOA || '').trim()
      }
    });

    if (queueResult && queueResult.locked) {
      deferred++;
      pushSkipped_(idAtividade, idConvite, 'fila_central_ocupada');
      return;
    }

    if (queueResult && (queueResult.queued || queueResult.duplicate)) {
      if (GEAPA_CORE.coreGetCol(convidadosHeaderMap, 'CONVITE_ENVIADO')) {
        GEAPA_CORE.coreWriteCellByHeader(convidadosSheet, rowNumber, convidadosHeaderMap, 'CONVITE_ENVIADO', 'SIM', { oneBased: true });
      }
      GEAPA_CORE.coreWriteCellByHeader(convidadosSheet, rowNumber, convidadosHeaderMap, 'DATA_ENVIO_CONFIRMACAO', new Date(), { oneBased: true });
      if (GEAPA_CORE.coreGetCol(convidadosHeaderMap, 'ATUALIZADO_EM')) {
        GEAPA_CORE.coreWriteCellByHeader(convidadosSheet, rowNumber, convidadosHeaderMap, 'ATUALIZADO_EM', new Date(), { oneBased: true });
      }
      if (queueResult.duplicate) duplicates++;
      if (queueResult.queued) {
        queued.push({
          idAtividade: idAtividade,
          idConvite: idConvite,
          correlationKey: correlationKey,
          saidaId: queueResult.saidaId || ''
        });
      }
      return;
    }

    pushSkipped_(idAtividade, idConvite, 'fila_nao_enfileirou');
  });

  var skippedReasonSummary = Object.keys(skippedReasons).sort().map(function(reason) {
    return reason + ':' + skippedReasons[reason];
  }).join(', ');

  atividades_logEvento_({
    TIPO_EVENTO_LOG: ATIVIDADES_CFG.APRESENTACOES_LOG_TYPES.SOLICITACAO_CONFIRMACAO_CONVIDADO,
    STATUS: deferred ? 'ATENCAO' : 'OK',
    ACAO_EXECUTADA: 'Enfileirar solicitacoes de confirmacao de presenca para convidados',
    RESULTADO: 'scanned=' + scanned + ' | eligible=' + eligible + ' | queued=' + queued.length + ' | duplicates=' + duplicates + ' | deferred=' + deferred + ' | skipped=' + skipped.length,
    OBSERVACOES: queued.slice(0, 20).map(function(item) {
      return item.correlationKey;
    }).concat(skippedReasonSummary ? ['skipped_reasons=' + skippedReasonSummary] : []).join(' | ')
  });

  return {
    ok: true,
    scannedCount: scanned,
    eligibleCount: eligible,
    queuedCount: queued.length,
    duplicateCount: duplicates,
    deferredCount: deferred,
    skippedCount: skipped.length,
    skippedReasons: skippedReasons,
    queued: queued,
    skipped: skipped,
    outbox: opts.processOutbox === false
      ? { ok: true, skipped: true, reason: 'process_outbox_disabled' }
      : (queued.length ? GEAPA_CORE.coreMailProcessOutbox() : { ok: true, skipped: true, reason: 'no_queued_messages' })
  };
}

function atividades_hasConfirmacoesConvidadosPendentes_() {
  var activityIndex = atividades_buildActivityIndexForConfirmacoes_();
  return GEAPA_CORE.coreReadSheetRecords(atividades_getConvidadosSheet_(), { headerRow: 1 }).some(function(record) {
    var activityRecord = activityIndex[String(record.ID_ATIVIDADE || '').trim()] || null;
    return atividades_activityRequiresGuestConfirmation_(activityRecord) &&
      atividades_isTipoVinculoConvidadoConfirmavel_(record.TIPO_VINCULO_PESSOA) &&
      atividades_parseDateOrNull_(record.DATA_ENVIO_CONFIRMACAO) &&
      !atividades_normalizeTextUpper_(record.CONFIRMADO);
  });
}

function atividades_ingestirInboxConfirmacoesConvidados_(opts) {
  opts = opts || {};
  if (!atividades_hasConfirmacoesConvidadosPendentes_()) {
    return { ok: true, skipped: true, reason: 'sem_confirmacoes_pendentes' };
  }

  var days = Number(ATIVIDADES_CFG.APRESENTACOES_JOB.CONFIRMACAO_PRESENCA_INBOX_INGEST_DAYS || 15);
  var query = [
    'newer_than:' + days + 'd',
    '-in:trash',
    '-in:spam',
    'subject:"' + ATIVIDADES_CFG.APRESENTACOES_JOB.CONFIRMACAO_PRESENCA_SUBJECT + '"'
  ].join(' ');

  try {
    return GEAPA_CORE.coreMailIngestInbox({
      query: query,
      start: 0,
      maxThreads: Number(ATIVIDADES_CFG.APRESENTACOES_JOB.CONFIRMACAO_PRESENCA_INBOX_INGEST_MAX_THREADS || 12),
      maxMessagesPerThread: Number(ATIVIDADES_CFG.APRESENTACOES_JOB.CONFIRMACAO_PRESENCA_INBOX_INGEST_MAX_MESSAGES_PER_THREAD || 6),
      saveFullBody: true
    });
  } catch (err) {
    if (typeof atividades_isMailHubInboxIngestLockError_ === 'function' && atividades_isMailHubInboxIngestLockError_(err)) {
      return { ok: false, skipped: true, reason: 'ingest_locked', message: err && err.message ? err.message : String(err) };
    }
    if (typeof atividades_isGmailDailyQuotaError_ === 'function' && atividades_isGmailDailyQuotaError_(err)) {
      return { ok: false, skipped: true, reason: 'gmail_quota_exceeded', message: err && err.message ? err.message : String(err) };
    }
    throw err;
  }
}

function atividades_listarEventosPendentesConfirmacoesConvidados_() {
  var seen = {};
  var out = [];
  [ATIVIDADES_CFG.MODULE_CODE || 'ATIVIDADES', 'ATIVIDADES'].forEach(function(moduleName) {
    if (!moduleName) return;
    var moduleKey = atividades_normalizeTextUpper_(moduleName);
    if (seen['module:' + moduleKey]) return;
    seen['module:' + moduleKey] = true;

    (GEAPA_CORE.coreMailListPendingByModule(moduleName) || []).forEach(function(eventRecord) {
      if (!eventRecord || !eventRecord.eventId || seen[eventRecord.eventId]) return;
      if (atividades_normalizeTextUpper_(eventRecord.direction) !== 'ENTRADA') return;
      if (!atividades_parseConfirmacaoConvidadoCorrelationKey_(eventRecord.correlationKey)) return;
      seen[eventRecord.eventId] = true;
      out.push(eventRecord);
    });
  });
  return out;
}

function atividades_textoEventoConfirmacaoConvidado_(eventRecord) {
  return String(
    (eventRecord && eventRecord.plainBody) ||
    (eventRecord && eventRecord.snippet) ||
    ''
  ).trim();
}

function atividades_interpretarRespostaConfirmacaoConvidado_(body) {
  var firstLine = String(body || '').split(/\r?\n/).map(function(line) {
    return String(line || '').trim();
  }).filter(Boolean)[0] || '';
  var normalized = atividades_normalizeTextUpper_(firstLine);
  if (!normalized) return '';
  if (/^(SIM|S|CONFIRMO|CONFIRMADO|PRESENTE|ESTAREI|VOU\b)/.test(normalized)) return 'SIM';
  if (/^(NAO|NÃO|N|NO|AUSENTE|NAO PODEREI|NÃO PODEREI|NAO VOU|NÃO VOU)/.test(normalized)) return 'NAO';
  return '';
}

function atividades_findConvidadoRowByConfirmacaoEvent_(eventRecord) {
  var correlation = atividades_parseConfirmacaoConvidadoCorrelationKey_(eventRecord && eventRecord.correlationKey);
  if (!correlation) return null;

  var convidadosSheet = atividades_getConvidadosSheet_();
  var records = GEAPA_CORE.coreReadSheetRecords(convidadosSheet, { headerRow: 1 });
  for (var i = 0; i < records.length; i++) {
    var record = records[i] || {};
    var activityToken = atividades_normalizeTextUpper_(record.ID_ATIVIDADE).replace(/[^\w]+/g, '_');
    var inviteToken = atividades_normalizeTextUpper_(record.ID_CONVITE_ATIVIDADE).replace(/[^\w]+/g, '_');
    if (activityToken === correlation.activityToken && inviteToken === correlation.inviteToken) {
      return {
        sheet: convidadosSheet,
        rowNumber: i + 2,
        record: record
      };
    }
  }
  return null;
}

function atividades_processarEventoCentralConfirmacaoConvidado_(eventRecord) {
  var processorName = 'atividades_processarInboxConfirmacoesConvidados';
  if (!eventRecord || !eventRecord.eventId) return { ok: false, action: 'skip', reason: 'evento_invalido' };

  var resposta = atividades_interpretarRespostaConfirmacaoConvidado_(atividades_textoEventoConfirmacaoConvidado_(eventRecord));
  var rowEntry = atividades_findConvidadoRowByConfirmacaoEvent_(eventRecord);
  if (!rowEntry) {
    GEAPA_CORE.coreMailMarkEventProcessed(eventRecord.eventId, processorName);
    return { ok: false, action: 'skip', reason: 'convite_nao_localizado', eventId: eventRecord.eventId };
  }
  if (!resposta) {
    GEAPA_CORE.coreMailMarkEventProcessed(eventRecord.eventId, processorName);
    return {
      ok: false,
      action: 'skip',
      reason: 'resposta_nao_interpretada',
      eventId: eventRecord.eventId,
      idConvite: String(rowEntry.record.ID_CONVITE_ATIVIDADE || '').trim()
    };
  }

  var headerMap = GEAPA_CORE.coreHeaderMap(rowEntry.sheet, 1);
  GEAPA_CORE.coreWriteCellByHeader(rowEntry.sheet, rowEntry.rowNumber, headerMap, 'CONFIRMADO', resposta, { oneBased: true });
  GEAPA_CORE.coreWriteCellByHeader(rowEntry.sheet, rowEntry.rowNumber, headerMap, 'DATA_CONFIRMACAO', atividades_parseDateOrNull_(eventRecord.receivedAt || eventRecord.ingestedAt) || new Date(), { oneBased: true });
  if (GEAPA_CORE.coreGetCol(headerMap, 'ATUALIZADO_EM')) {
    GEAPA_CORE.coreWriteCellByHeader(rowEntry.sheet, rowEntry.rowNumber, headerMap, 'ATUALIZADO_EM', new Date(), { oneBased: true });
  }
  GEAPA_CORE.coreMailMarkEventProcessed(eventRecord.eventId, processorName);

  return {
    ok: true,
    action: 'processed',
    eventId: eventRecord.eventId,
    idAtividade: String(rowEntry.record.ID_ATIVIDADE || '').trim(),
    idConvite: String(rowEntry.record.ID_CONVITE_ATIVIDADE || '').trim(),
    confirmado: resposta
  };
}

function atividades_processarInboxConfirmacoesConvidados_(opts) {
  opts = opts || {};
  var ingestResult = opts.skipIngest ? { ok: true, skipped: true, reason: 'skip_ingest' } : atividades_ingestirInboxConfirmacoesConvidados_(opts);
  var events = atividades_listarEventosPendentesConfirmacoesConvidados_();
  var processed = [];
  var skipped = [];

  events.forEach(function(eventRecord) {
    var result = atividades_processarEventoCentralConfirmacaoConvidado_(eventRecord);
    if (result && result.ok && result.action === 'processed') processed.push(result);
    else skipped.push(result);
  });

  atividades_logEvento_({
    TIPO_EVENTO_LOG: ATIVIDADES_CFG.APRESENTACOES_LOG_TYPES.INBOX_CONFIRMACAO_CONVIDADO,
    STATUS: 'OK',
    ACAO_EXECUTADA: 'Processar respostas de confirmacao de presenca de convidados',
    RESULTADO: 'processed=' + processed.length + ' | skipped=' + skipped.length,
    OBSERVACOES: processed.slice(0, 20).map(function(item) {
      return item.idAtividade + ':' + item.idConvite + ':' + item.confirmado;
    }).join(' | ')
  });

  return {
    ok: true,
    ingest: ingestResult,
    processedCount: processed.length,
    skippedCount: skipped.length,
    processed: processed,
    skipped: skipped
  };
}
