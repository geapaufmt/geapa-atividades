function atividades_buildAtividadeGeralCorrelationKey_(prefix, parts) {
  return [String(prefix || '').trim()].concat((parts || []).map(function(part) {
    return String(part || '').trim();
  }).filter(function(part) {
    return !!part;
  })).join('-');
}

function atividades_buildAtividadeGeralConvocacaoCorrelationKey_(idAtividade) {
  return atividades_buildAtividadeGeralCorrelationKey_('AGC', [idAtividade]);
}

function atividades_buildAtividadeGeralLembreteCorrelationKey_(idAtividade, dataAtividade) {
  var dateObj = atividades_parseDateOrNull_(dataAtividade);
  var dateKey = dateObj
    ? Utilities.formatDate(dateObj, Session.getScriptTimeZone(), 'yyyyMMdd')
    : 'semdata';
  return atividades_buildAtividadeGeralCorrelationKey_('AGL', [idAtividade, dateKey]);
}

function atividades_buildAtividadeGeralPendenciaAtaCorrelationKey_(idAtividade) {
  return atividades_buildAtividadeGeralCorrelationKey_('AGA', [idAtividade]);
}

function atividades_buildAtividadeGeralPendenciaMaterialCorrelationKey_(idAtividade) {
  return atividades_buildAtividadeGeralCorrelationKey_('AGM', [idAtividade]);
}

function atividades_isGeneralActivity_(record) {
  return atividades_normalizeTextUpper_(record && record.SUBTIPO_ATIVIDADE) !== 'APRESENTACAO_MEMBRO' &&
    !atividades_isRegistroInstitucionalForaDoEscopo_(record);
}

function atividades_isBlockedGeneralActivityStatus_(record) {
  var status = atividades_normalizeTextUpper_(record && record.STATUS);
  return status === 'CANCELADA' || status === 'ARQUIVADA';
}

function atividades_isDiretoriaAdministrativeActivity_(record) {
  return atividades_normalizeTextUpper_(record && record.CLASSIFICACAO_REUNIAO) === 'DIRETORIA' &&
    atividades_normalizeTextUpper_(record && record.CLASSIFICACAO_ACESSO) === 'RESTRITA_DIRETORIA';
}

function atividades_getEffectiveContaFaltaForActivity_(record) {
  if (atividades_isDiretoriaAdministrativeActivity_(record)) return 'NAO';
  return String(record && record.CONTA_FALTA || '').trim();
}

function atividades_getEffectiveContaPresencaForActivity_(record) {
  return String(record && record.CONTA_PRESENCA || '').trim();
}

function atividades_isDirectorOccupation_(value) {
  var normalized = atividades_normalizeTextUpper_(value);
  if (!normalized) return false;
  return (ATIVIDADES_CFG.ATIVIDADES_GERAIS_JOB.DIRECTOR_OCCUPATION_TOKENS || []).some(function(token) {
    return normalized.indexOf(atividades_normalizeTextUpper_(token)) >= 0;
  });
}

function atividades_isDirectorMemberLike_(memberLike) {
  return atividades_isDirectorOccupation_(
    (memberLike && (memberLike.ocupacao || memberLike.OCUPACAO || memberLike.CARGO_FUNCAO_ATUAL)) || ''
  );
}

function atividades_getGovernanceGroupEmails_(groupName) {
  if (!GEAPA_CORE || typeof GEAPA_CORE.coreGetCurrentEmailsByEmailGroup !== 'function') return [];
  return (GEAPA_CORE.coreGetCurrentEmailsByEmailGroup(groupName) || []).map(function(email) {
    return String(email || '').trim();
  }).filter(function(email) {
    return GEAPA_CORE.coreIsValidEmail(email);
  });
}

function atividades_isActiveMemberForGeneralCommunication_(member) {
  var status = atividades_normalizeTextUpper_(member && member.status);
  if (!member || !member.rga || !member.nome || !GEAPA_CORE.coreIsValidEmail(member.email)) return false;
  if (!status) return true;
  if (status.indexOf('DESLIG') >= 0) return false;
  if (status.indexOf('SUSPENS') >= 0) return false;
  if (status.indexOf('INATIV') >= 0) return false;
  return true;
}

function atividades_listActiveMembersForGeneralCommunication_() {
  return atividades_getMembersSnapshot_().filter(atividades_isActiveMemberForGeneralCommunication_);
}

function atividades_mapBoardMemberRecord_(record) {
  return {
    rga: String(atividades_pickFirstFieldValue_(record, ['RGA', 'ID_MEMBRO']) || record.rga || '').trim(),
    nome: String(atividades_pickFirstFieldValue_(record, ['NOME', 'Nome', 'NOME_MEMBRO', 'MEMBRO']) || record.nome || '').trim(),
    email: String(atividades_pickFirstFieldValue_(record, ['EMAIL', 'Email', 'E-mail']) || record.email || '').trim(),
    ocupacao: String(
      atividades_pickFirstFieldValue_(record, [
        'OCUPACAO',
        'OCUPACAO_ATUAL',
        'Ocupacao',
        'Ocupacao atual',
        'Cargo/Funcao',
        'Cargo/Função',
        'CARGO_FUNCAO_ATUAL'
      ]) || record.ocupacao || record.cargo || record.funcao || ''
    ).trim()
  };
}

function atividades_listBoardMembersForGeneralCommunication_() {
  var out = [];
  var byEmail = Object.create(null);
  var activeMembers = atividades_listActiveMembersForGeneralCommunication_();
  var foundFromCore = false;

  if (GEAPA_CORE && typeof GEAPA_CORE.core_getCurrentBoardMembers_ === 'function') {
    try {
      (GEAPA_CORE.core_getCurrentBoardMembers_() || []).map(atividades_mapBoardMemberRecord_).forEach(function(item) {
        var email = String(item.email || '').trim().toLowerCase();
        if (!GEAPA_CORE.coreIsValidEmail(email) || byEmail[email]) return;
        foundFromCore = true;
        byEmail[email] = true;
        out.push({
          rga: item.rga,
          nome: item.nome,
          email: email,
          ocupacao: item.ocupacao
        });
      });
    } catch (err) {
      // segue para os fallbacks abaixo
    }
  }

  if (foundFromCore) return out;

  activeMembers.forEach(function(member) {
    var normalized = String(member.email || '').trim().toLowerCase();
    if (!normalized || byEmail[normalized]) return;
    if (!atividades_isDirectorMemberLike_(member)) return;
    byEmail[normalized] = true;
    out.push(member);
  });

  return out;
}

function atividades_listConvidadosByActivityId_(idAtividade) {
  var activityId = String(idAtividade || '').trim();
  if (!activityId) return [];

  return GEAPA_CORE.coreReadSheetRecords(atividades_getConvidadosSheet_(), {
    headerRow: 1
  }).filter(function(record) {
    return String(record.ID_ATIVIDADE || '').trim() === activityId;
  }).map(function(record) {
    return {
      nome: String(record.NOME || '').trim(),
      email: String(record.EMAIL || '').trim(),
      tipoVinculo: String(record.TIPO_VINCULO_PESSOA || '').trim(),
      papel: String(record.PAPEL_NA_ATIVIDADE || '').trim()
    };
  }).filter(function(item) {
    return GEAPA_CORE.coreIsValidEmail(item.email);
  });
}

function atividades_deduplicateRecipients_(items) {
  var seen = Object.create(null);
  var out = [];

  (items || []).forEach(function(item) {
    var email = String(item && item.email || '').trim().toLowerCase();
    if (!GEAPA_CORE.coreIsValidEmail(email) || seen[email]) return;
    seen[email] = true;
    out.push({
      nome: String(item && item.nome || '').trim(),
      email: email,
      origem: String(item && item.origem || '').trim()
    });
  });

  return out;
}

function atividades_resolverDestinatariosAtividadeGeral_(record) {
  var acesso = atividades_normalizeTextUpper_((record && record.CLASSIFICACAO_ACESSO) || '') || 'RESTRITA_MEMBROS';
  var activeMembers = atividades_listActiveMembersForGeneralCommunication_();
  var convidados = atividades_listConvidadosByActivityId_(record && record.ID_ATIVIDADE);
  var recipients = [];

  if (acesso === 'RESTRITA_DIRETORIA') {
    recipients = [];
  } else if (acesso === 'RESTRITA_CONVIDADOS') {
    recipients = convidados.map(function(item) {
      return { nome: item.nome, email: item.email, origem: 'CONVIDADO' };
    });
  } else if (acesso === 'ABERTA') {
    recipients = activeMembers.map(function(item) {
      return { nome: item.nome, email: item.email, origem: 'MEMBRO' };
    }).concat(convidados.map(function(item) {
      return { nome: item.nome, email: item.email, origem: 'CONVIDADO' };
    }));
  } else {
    recipients = activeMembers.map(function(item) {
      return { nome: item.nome, email: item.email, origem: 'MEMBRO' };
    });
  }

  recipients = atividades_deduplicateRecipients_(recipients);
  return {
    access: acesso,
    recipients: recipients,
    emails: recipients.map(function(item) { return item.email; }),
    count: recipients.length
  };
}

function atividades_formatGeneralActivityDate_(value) {
  var parsed = atividades_parseDateOrNull_(value);
  return parsed
    ? GEAPA_CORE.coreFormatDate(parsed, Session.getScriptTimeZone(), ATIVIDADES_CFG.DATE_FORMAT)
    : '-';
}

function atividades_formatGeneralActivityTimeWindow_(record) {
  var start = String(record && record.HORARIO_INICIO || '').trim();
  var end = String(record && record.HORARIO_FIM || '').trim();
  if (start && end) return start + ' - ' + end;
  return start || end || '-';
}

function atividades_getGeneralActivityAudienceLabel_(record) {
  var explicit = String(record && record.PUBLICO_ALVO || '').trim();
  if (explicit) return explicit;

  var acesso = atividades_normalizeTextUpper_(record && record.CLASSIFICACAO_ACESSO);
  if (acesso === 'RESTRITA_DIRETORIA') return 'Fora do escopo do modulo Atividades';
  if (acesso === 'RESTRITA_CONVIDADOS') return 'Convidados vinculados a atividade';
  if (acesso === 'ABERTA') return 'Membros ativos e convidados vinculados';
  return 'Membros ativos do GEAPA';
}

function atividades_buildGeneralActivityMailBlocks_(record) {
  return [
    {
      title: 'Atividade',
      items: [
        { label: 'Titulo', value: String(record.TITULO || '').trim() || '-' },
        { label: 'Tipo/Subtipo', value: [String(record.TIPO_ATIVIDADE || '').trim(), String(record.SUBTIPO_ATIVIDADE || '').trim()].filter(Boolean).join(' / ') || '-' },
        { label: 'Data', value: atividades_formatGeneralActivityDate_(record.DATA_ATIVIDADE) },
        { label: 'Horario', value: atividades_formatGeneralActivityTimeWindow_(record) },
        { label: 'Local', value: String(record.LOCAL || '').trim() || '-' },
        { label: 'Formato', value: String(record.FORMATO || '').trim() || '-' }
      ]
    },
    {
      title: 'Contexto operacional',
      items: [
        { label: 'Publico-alvo', value: atividades_getGeneralActivityAudienceLabel_(record) },
        { label: 'Responsavel interno', value: String(record.RESPONSAVEL_INTERNO || '').trim() || '-' },
        { label: 'Observacoes', value: String(record.OBSERVACOES || '').trim() || '-' }
      ]
    }
  ];
}

function atividades_buildConvocacaoAtividadeGeralPayload_(record) {
  return {
    subtitle: 'Fluxo geral de atividades do GEAPA',
    introText: 'Esta e a convocacao automatica para uma atividade registrada no modulo GEAPA Atividades.',
    blocks: atividades_buildGeneralActivityMailBlocks_(record),
    footerNote: 'Mensagem automatica do GEAPA. Em caso de duvida, responda pelos canais institucionais do grupo.'
  };
}

function atividades_buildLembreteAtividadeGeralPayload_(record) {
  return {
    subtitle: 'Fluxo geral de atividades do GEAPA',
    introText: 'Este e um lembrete automatico de atividade do GEAPA agendada para hoje ou amanha.',
    blocks: atividades_buildGeneralActivityMailBlocks_(record),
    footerNote: 'Mensagem automatica do GEAPA. Em caso de duvida, consulte a organizacao da atividade.'
  };
}

function atividades_buildPendenciaAtaAtividadeGeralPayload_(record) {
  return {
    subtitle: 'Pendencia administrativa de atividade do GEAPA',
    introText: 'A atividade abaixo ja deveria ter sua ata registrada no fluxo operacional do GEAPA, mas o campo LINK_ATA ainda esta vazio.',
    blocks: atividades_buildGeneralActivityMailBlocks_(record),
    footerNote: 'Mensagem automatica do GEAPA solicitando regularizacao administrativa.'
  };
}

function atividades_buildPendenciaMaterialAtividadeGeralPayload_(record) {
  return {
    subtitle: 'Pendencia administrativa de atividade do GEAPA',
    introText: 'A atividade abaixo ja deveria ter seu material vinculado no fluxo operacional do GEAPA, mas o campo LINK_MATERIAL ainda esta vazio.',
    blocks: atividades_buildGeneralActivityMailBlocks_(record),
    footerNote: 'Mensagem automatica do GEAPA solicitando regularizacao administrativa.'
  };
}

function atividades_buildGeneralActivitySubject_(kind, record) {
  if (kind === 'LEMBRETE') return 'Lembrete de atividade do GEAPA';
  if (kind === 'PENDENCIA_ATA') return 'Pendencia de ata de atividade do GEAPA';
  if (kind === 'PENDENCIA_MATERIAL') return 'Pendencia de material de atividade do GEAPA';
  return 'Convocacao para atividade do GEAPA';
}

function atividades_buildGeneralActivityQueuePayload_(record, opts) {
  opts = opts || {};
  return {
    moduleName: ATIVIDADES_CFG.MODULE_CODE,
    templateKey: 'GEAPA_OPERACIONAL',
    correlationKey: String(opts.correlationKey || '').trim(),
    entityType: 'ATIVIDADE',
    entityId: String(record.ID_ATIVIDADE || '').trim(),
    flowCode: ATIVIDADES_CFG.ATIVIDADES_GERAIS_JOB.FLOW_CODE,
    stage: String(opts.stage || '').trim(),
    to: (opts.emails || []).join(','),
    recipientName: String(opts.recipientName || 'Publico da atividade').trim(),
    subjectHuman: atividades_buildGeneralActivitySubject_(opts.kind, record),
    payload: opts.payload,
    metadata: {
      source: 'geapa-atividades',
      idAtividade: String(record.ID_ATIVIDADE || '').trim(),
      subtipoAtividade: String(record.SUBTIPO_ATIVIDADE || '').trim(),
      classificacaoAcesso: String(record.CLASSIFICACAO_ACESSO || '').trim()
    }
  };
}

function atividades_processOutboxForGeneralActivities_(queueLikeResults) {
  var shouldProcess = (queueLikeResults || []).some(function(result) {
    return !!(result && result.queuedCount);
  });
  return shouldProcess ? GEAPA_CORE.coreMailProcessOutbox() : {
    ok: true,
    skipped: true,
    reason: 'no_queued_messages'
  };
}

function atividades_getActivityRowHeaderMap_() {
  return GEAPA_CORE.coreHeaderMap(atividades_getAtividadesSheet_(), 1);
}

function atividades_stampGeneralActivitySendDate_(sheet, headerMap, rowNumber, dateHeader) {
  GEAPA_CORE.coreWriteCellByHeader(sheet, rowNumber, headerMap, dateHeader, new Date(), { oneBased: true });
  if (GEAPA_CORE.coreGetCol(headerMap, 'ATUALIZADO_EM')) {
    GEAPA_CORE.coreWriteCellByHeader(sheet, rowNumber, headerMap, 'ATUALIZADO_EM', new Date(), { oneBased: true });
  }
}

function atividades_startOfDay_(dateValue) {
  var dateObj = atividades_parseDateOrNull_(dateValue) || new Date();
  return new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0, 0, 0, 0);
}

function atividades_endOfDay_(dateValue) {
  var start = atividades_startOfDay_(dateValue);
  return new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59, 999);
}

function atividades_getActivityEndDateTime_(record) {
  var dateObj = atividades_parseDateOrNull_(record && record.DATA_ATIVIDADE);
  if (!dateObj) return null;

  var end = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59, 999);
  var endMinutes = atividades_parseTimeValueToMinutes_(record && record.HORARIO_FIM);
  var startMinutes = atividades_parseTimeValueToMinutes_(record && record.HORARIO_INICIO);
  var resolvedMinutes = endMinutes !== null ? endMinutes : startMinutes;

  if (resolvedMinutes !== null) {
    end.setHours(Math.floor(resolvedMinutes / 60), resolvedMinutes % 60, 0, 0);
  }

  return end;
}

function atividades_isActivityTodayOrTomorrow_(record) {
  var activityDate = atividades_parseDateOrNull_(record && record.DATA_ATIVIDADE);
  if (!activityDate) return false;
  var todayStart = atividades_startOfDay_(new Date());
  var tomorrowEnd = atividades_endOfDay_(new Date(todayStart.getFullYear(), todayStart.getMonth(), todayStart.getDate() + Number(ATIVIDADES_CFG.ATIVIDADES_GERAIS_JOB.LEMBRETE_DIAS_ANTES || 1)));
  return activityDate.getTime() >= todayStart.getTime() && activityDate.getTime() <= tomorrowEnd.getTime();
}

function atividades_isActivityReadyForAutoRealizada_(record) {
  if (!atividades_isGeneralActivity_(record)) return false;
  if (atividades_isBlockedGeneralActivityStatus_(record)) return false;
  if (atividades_normalizeTextUpper_(record.STATUS) !== 'CONFIRMADA') return false;

  var endDate = atividades_getActivityEndDateTime_(record);
  return !!(endDate && endDate.getTime() <= new Date().getTime());
}

function atividades_isPastDueForGeneralPending_(record, hoursAfter) {
  if (!atividades_isGeneralActivity_(record)) return false;
  if (atividades_isBlockedGeneralActivityStatus_(record)) return false;

  var status = atividades_normalizeTextUpper_(record.STATUS);
  if (status !== 'REALIZADA' && status !== 'CONFIRMADA') return false;

  var endDate = atividades_getActivityEndDateTime_(record);
  if (!endDate) return false;

  var threshold = new Date(endDate.getTime() + (Number(hoursAfter || 0) * 60 * 60 * 1000));
  return threshold.getTime() <= new Date().getTime();
}

function atividades_listGeneralActivityRowsWithNumbers_() {
  return atividades_listActivityRowsWithNumbers_().filter(function(item) {
    return String(item.record && item.record.ID_ATIVIDADE || '').trim() &&
      atividades_isGeneralActivity_(item.record) &&
      !atividades_isBlockedGeneralActivityStatus_(item.record);
  });
}

function atividades_getCurrentPeriodRowByActivityIdMap_() {
  var byId = Object.create(null);
  try {
    atividades_getCurrentPeriodActivitiesMap_().forEach(function(row) {
      var id = String(row.ID_ATIVIDADE || '').trim();
      if (id) byId[id] = row;
    });
  } catch (err) {
    return byId;
  }
  return byId;
}

function atividades_activityHasPresenceEvidence_(periodRow) {
  if (!periodRow) return false;
  var header = String(periodRow.COLUNA_PRESENCA || '').trim();
  if (!header) return false;

  var presenceState = atividades_buildCurrentPresenceState_();
  var col = GEAPA_CORE.coreGetCol(presenceState.headerMap, header);
  if (!col || presenceState.sheet.getLastRow() < 2) return false;

  var values = presenceState.sheet.getRange(2, col, presenceState.sheet.getLastRow() - 1, 1).getDisplayValues();
  var accepted = { P: true, R: true, F: true, J: true, A: true };
  for (var i = 0; i < values.length; i++) {
    var normalized = atividades_normalizeTextUpper_(values[i][0]);
    if (accepted[normalized]) return true;
  }

  return false;
}

function atividades_hasExistingLogForActivityGeneral_(activityId, logType) {
  var wantedId = String(activityId || '').trim();
  var wantedType = String(logType || '').trim();
  if (!wantedId || !wantedType) return false;

  return GEAPA_CORE.coreReadSheetRecords(atividades_getLogSheet_(), { headerRow: 1 }).some(function(record) {
    return String(record.ID_ATIVIDADE || '').trim() === wantedId &&
      String(record.TIPO_EVENTO_LOG || '').trim() === wantedType;
  });
}

function atividades_resolveFallbackEmailsForPendingGeneralActivity_() {
  var emails = atividades_getGovernanceGroupEmails_(ATIVIDADES_CFG.ATIVIDADES_GERAIS_JOB.EMAIL_GROUP_SECRETARIA);

  var unique = Object.create(null);
  return emails.filter(function(email) {
    var normalized = String(email || '').trim().toLowerCase();
    if (!GEAPA_CORE.coreIsValidEmail(normalized) || unique[normalized]) return false;
    unique[normalized] = true;
    return true;
  });
}

function atividades_enviarConvocacoesAtividadesGerais_(opts) {
  opts = opts || {};
  var sheet = atividades_getAtividadesSheet_();
  var headerMap = atividades_getActivityRowHeaderMap_();
  var queued = [];
  var duplicates = 0;
  var deferred = 0;
  var skipped = [];

  atividades_listGeneralActivityRowsWithNumbers_().forEach(function(item) {
    var record = item.record || {};
    if (atividades_normalizeTextUpper_(record.STATUS) !== 'CONFIRMADA') return;
    if (!atividades_isTruthySim_(record.EXIGE_CONVOCACAO)) return;
    if (atividades_parseDateOrNull_(record.DATA_CONVOCACAO)) return;
    if (!atividades_parseDateOrNull_(record.DATA_ATIVIDADE)) return;

    var resolved = atividades_resolverDestinatariosAtividadeGeral_(record);
    if (!resolved.count) {
      skipped.push({ idAtividade: String(record.ID_ATIVIDADE || '').trim(), reason: 'sem_destinatarios' });
      return;
    }

    var queueResult = atividades_tryQueueOutgoing_(atividades_buildGeneralActivityQueuePayload_(record, {
      kind: 'CONVOCACAO',
      stage: 'CONV',
      emails: resolved.emails,
      correlationKey: atividades_buildAtividadeGeralConvocacaoCorrelationKey_(record.ID_ATIVIDADE),
      payload: atividades_buildConvocacaoAtividadeGeralPayload_(record)
    }));

    if (queueResult && (queueResult.queued || queueResult.duplicate)) {
      atividades_stampGeneralActivitySendDate_(sheet, headerMap, item.rowNumber, 'DATA_CONVOCACAO');
      queued.push({
        idAtividade: String(record.ID_ATIVIDADE || '').trim(),
        toCount: resolved.count
      });
      if (queueResult.duplicate) duplicates++;
    } else if (queueResult && queueResult.locked) {
      deferred++;
    }
  });

  atividades_logEvento_({
    TIPO_EVENTO_LOG: ATIVIDADES_CFG.ATIVIDADES_GERAIS_LOG_TYPES.CONVOCACAO,
    STATUS: deferred ? 'ATENCAO' : 'OK',
    ACAO_EXECUTADA: 'Enfileirar convocacoes de atividades gerais',
    RESULTADO: 'queued=' + queued.length + ' | duplicates=' + duplicates + ' | deferred=' + deferred + ' | skipped=' + skipped.length,
    OBSERVACOES: queued.slice(0, 20).map(function(item) {
      return item.idAtividade + ':destinatarios=' + item.toCount;
    }).join(' | ')
  });

  return {
    ok: true,
    queuedCount: queued.length,
    duplicateCount: duplicates,
    deferredCount: deferred,
    skippedCount: skipped.length,
    queued: queued,
    skipped: skipped,
    outbox: opts.processOutbox === false ? { ok: true, skipped: true, reason: 'process_outbox_disabled' } : atividades_processOutboxForGeneralActivities_([{
      queuedCount: queued.length
    }])
  };
}

function atividades_enviarLembretesAtividadesGerais_(opts) {
  opts = opts || {};
  var sheet = atividades_getAtividadesSheet_();
  var headerMap = atividades_getActivityRowHeaderMap_();
  var queued = [];
  var duplicates = 0;
  var deferred = 0;
  var skipped = [];

  atividades_listGeneralActivityRowsWithNumbers_().forEach(function(item) {
    var record = item.record || {};
    if (atividades_normalizeTextUpper_(record.STATUS) !== 'CONFIRMADA') return;
    if (!atividades_isTruthySim_(record.EXIGE_LEMBRETE)) return;
    if (atividades_parseDateOrNull_(record.DATA_LEMBRETE)) return;
    if (!atividades_parseDateOrNull_(record.DATA_ATIVIDADE)) return;
    if (!atividades_isActivityTodayOrTomorrow_(record)) return;

    var resolved = atividades_resolverDestinatariosAtividadeGeral_(record);
    if (!resolved.count) {
      skipped.push({ idAtividade: String(record.ID_ATIVIDADE || '').trim(), reason: 'sem_destinatarios' });
      return;
    }

    var queueResult = atividades_tryQueueOutgoing_(atividades_buildGeneralActivityQueuePayload_(record, {
      kind: 'LEMBRETE',
      stage: 'LEMB',
      emails: resolved.emails,
      correlationKey: atividades_buildAtividadeGeralLembreteCorrelationKey_(record.ID_ATIVIDADE, record.DATA_ATIVIDADE),
      payload: atividades_buildLembreteAtividadeGeralPayload_(record)
    }));

    if (queueResult && (queueResult.queued || queueResult.duplicate)) {
      atividades_stampGeneralActivitySendDate_(sheet, headerMap, item.rowNumber, 'DATA_LEMBRETE');
      queued.push({
        idAtividade: String(record.ID_ATIVIDADE || '').trim(),
        toCount: resolved.count
      });
      if (queueResult.duplicate) duplicates++;
    } else if (queueResult && queueResult.locked) {
      deferred++;
    }
  });

  atividades_logEvento_({
    TIPO_EVENTO_LOG: ATIVIDADES_CFG.ATIVIDADES_GERAIS_LOG_TYPES.LEMBRETE,
    STATUS: deferred ? 'ATENCAO' : 'OK',
    ACAO_EXECUTADA: 'Enfileirar lembretes de atividades gerais',
    RESULTADO: 'queued=' + queued.length + ' | duplicates=' + duplicates + ' | deferred=' + deferred + ' | skipped=' + skipped.length,
    OBSERVACOES: queued.slice(0, 20).map(function(item) {
      return item.idAtividade + ':destinatarios=' + item.toCount;
    }).join(' | ')
  });

  return {
    ok: true,
    queuedCount: queued.length,
    duplicateCount: duplicates,
    deferredCount: deferred,
    skippedCount: skipped.length,
    queued: queued,
    skipped: skipped,
    outbox: opts.processOutbox === false ? { ok: true, skipped: true, reason: 'process_outbox_disabled' } : atividades_processOutboxForGeneralActivities_([{
      queuedCount: queued.length
    }])
  };
}

function atividades_marcarAtividadesGeraisRealizadas_(opts) {
  opts = opts || {};
  var sheet = atividades_getAtividadesSheet_();
  var headerMap = atividades_getActivityRowHeaderMap_();
  var currentPeriodRowsById = atividades_getCurrentPeriodRowByActivityIdMap_();
  var updated = [];
  var skipped = [];

  atividades_listGeneralActivityRowsWithNumbers_().forEach(function(item) {
    var record = item.record || {};
    if (!atividades_isActivityReadyForAutoRealizada_(record)) return;

    var activityId = String(record.ID_ATIVIDADE || '').trim();
    var periodRow = currentPeriodRowsById[activityId] || null;
    if (!periodRow) {
      skipped.push({ idAtividade: activityId, reason: 'atividade_fora_do_periodo_vigente' });
      return;
    }
    if (!atividades_activityHasPresenceEvidence_(periodRow)) {
      skipped.push({ idAtividade: activityId, reason: 'sem_evidencia_em_presencas' });
      return;
    }

    GEAPA_CORE.coreWriteCellByHeader(sheet, item.rowNumber, headerMap, 'STATUS', 'REALIZADA', { oneBased: true });
    GEAPA_CORE.coreWriteCellByHeader(sheet, item.rowNumber, headerMap, 'DATA_REALIZACAO', new Date(), { oneBased: true });
    if (GEAPA_CORE.coreGetCol(headerMap, 'ATUALIZADO_EM')) {
      GEAPA_CORE.coreWriteCellByHeader(sheet, item.rowNumber, headerMap, 'ATUALIZADO_EM', new Date(), { oneBased: true });
    }

    updated.push({
      idAtividade: activityId,
      rowNumber: item.rowNumber
    });
  });

  if (updated.length || skipped.length) {
    atividades_logEvento_({
      TIPO_EVENTO_LOG: ATIVIDADES_CFG.ATIVIDADES_GERAIS_LOG_TYPES.AUTO_REALIZADA,
      STATUS: 'OK',
      ACAO_EXECUTADA: 'Marcar automaticamente atividades gerais como realizadas',
      RESULTADO: 'updated=' + updated.length + ' | skipped=' + skipped.length,
      OBSERVACOES: updated.slice(0, 20).map(function(item) {
        return item.idAtividade;
      }).join(' | ')
    });
  }

  return {
    ok: true,
    updatedCount: updated.length,
    skippedCount: skipped.length,
    updated: updated,
    skipped: skipped
  };
}

function atividades_notificarPendenciasAtaMaterialAtividadesGerais_(opts) {
  opts = opts || {};
  var queued = [];
  var duplicates = 0;
  var deferred = 0;
  var skipped = [];

  atividades_listGeneralActivityRowsWithNumbers_().forEach(function(item) {
    var record = item.record || {};
    var activityId = String(record.ID_ATIVIDADE || '').trim();
    if (!activityId) return;

    var pendingTargets = [];
    if (
      atividades_isPastDueForGeneralPending_(record, ATIVIDADES_CFG.ATIVIDADES_GERAIS_JOB.PENDENCIA_ATA_HORAS_APOS) &&
      atividades_isTruthySim_(record.EXIGE_ATA) &&
      !String(record.LINK_ATA || '').trim() &&
      !atividades_hasExistingLogForActivityGeneral_(activityId, ATIVIDADES_CFG.ATIVIDADES_GERAIS_LOG_TYPES.PENDENCIA_ATA)
    ) {
      pendingTargets.push({
        kind: 'PENDENCIA_ATA',
        logType: ATIVIDADES_CFG.ATIVIDADES_GERAIS_LOG_TYPES.PENDENCIA_ATA,
        stage: 'PATA',
        correlationKey: atividades_buildAtividadeGeralPendenciaAtaCorrelationKey_(activityId),
        payload: atividades_buildPendenciaAtaAtividadeGeralPayload_(record)
      });
    }

    if (
      atividades_isPastDueForGeneralPending_(record, ATIVIDADES_CFG.ATIVIDADES_GERAIS_JOB.PENDENCIA_MATERIAL_HORAS_APOS) &&
      atividades_isTruthySim_(record.EXIGE_MATERIAL) &&
      !String(record.LINK_MATERIAL || '').trim() &&
      !atividades_hasExistingLogForActivityGeneral_(activityId, ATIVIDADES_CFG.ATIVIDADES_GERAIS_LOG_TYPES.PENDENCIA_MATERIAL)
    ) {
      pendingTargets.push({
        kind: 'PENDENCIA_MATERIAL',
        logType: ATIVIDADES_CFG.ATIVIDADES_GERAIS_LOG_TYPES.PENDENCIA_MATERIAL,
        stage: 'PMAT',
        correlationKey: atividades_buildAtividadeGeralPendenciaMaterialCorrelationKey_(activityId),
        payload: atividades_buildPendenciaMaterialAtividadeGeralPayload_(record)
      });
    }

    pendingTargets.forEach(function(target) {
      var emails = [];
      var responsavel = String(record.RESPONSAVEL_EMAIL || '').trim();
      if (GEAPA_CORE.coreIsValidEmail(responsavel)) {
        emails = [responsavel];
      } else {
        emails = atividades_resolveFallbackEmailsForPendingGeneralActivity_();
      }

      if (!emails.length) {
        skipped.push({ idAtividade: activityId, kind: target.kind, reason: 'sem_destinatario_seguro' });
        return;
      }

      var queueResult = atividades_tryQueueOutgoing_(atividades_buildGeneralActivityQueuePayload_(record, {
        kind: target.kind,
        stage: target.stage,
        emails: emails,
        correlationKey: target.correlationKey,
        payload: target.payload,
        recipientName: GEAPA_CORE.coreIsValidEmail(responsavel) ? String(record.RESPONSAVEL_INTERNO || 'Responsavel da atividade').trim() : 'Governanca do GEAPA'
      }));

      if (queueResult && (queueResult.queued || queueResult.duplicate)) {
        queued.push({ idAtividade: activityId, kind: target.kind, toCount: emails.length });
        if (queueResult.duplicate) duplicates++;
        atividades_logEvento_({
          ID_ATIVIDADE: activityId,
          TIPO_EVENTO_LOG: target.logType,
          STATUS: 'OK',
          ACAO_EXECUTADA: target.kind === 'PENDENCIA_ATA'
            ? 'Enfileirar aviso de pendencia de ata'
            : 'Enfileirar aviso de pendencia de material',
          RESULTADO: queueResult.duplicate ? 'duplicate=1' : 'queued=1',
          OBSERVACOES: 'correlationKey=' + target.correlationKey + ' | destinatarios=' + emails.length
        });
      } else if (queueResult && queueResult.locked) {
        deferred++;
      }
    });
  });

  return {
    ok: true,
    queuedCount: queued.length,
    duplicateCount: duplicates,
    deferredCount: deferred,
    skippedCount: skipped.length,
    queued: queued,
    skipped: skipped,
    outbox: opts.processOutbox === false ? { ok: true, skipped: true, reason: 'process_outbox_disabled' } : atividades_processOutboxForGeneralActivities_([{
      queuedCount: queued.length
    }])
  };
}

function atividades_jobAtividadesGerais_() {
  atividades_garantirEstruturasFixasV1_();
  var ensuredIds = atividades_fillMissingActivityIds_();
  var ensuredCargaHoraria = typeof atividades_fillCargaHorariaFromTimes_ === 'function'
    ? atividades_fillCargaHorariaFromTimes_()
    : { ok: true, skipped: true, reason: 'helper_absent' };
  var syncPeriodoBefore = atividades_sincronizarPeriodoVigente_();
  var syncPresencasBefore = atividades_sincronizarPresencasPeriodoVigente_();
  var convocacoes = atividades_enviarConvocacoesAtividadesGerais_({ processOutbox: false });
  var lembretes = atividades_enviarLembretesAtividadesGerais_({ processOutbox: false });
  var autoRealizadas = atividades_marcarAtividadesGeraisRealizadas_();
  var pendencias = atividades_notificarPendenciasAtaMaterialAtividadesGerais_({ processOutbox: false });
  var syncPeriodoAfter = null;
  var syncPresencasAfter = null;

  if (autoRealizadas.updatedCount > 0) {
    syncPeriodoAfter = atividades_sincronizarPeriodoVigente_();
    syncPresencasAfter = atividades_sincronizarPresencasPeriodoVigente_();
  }

  return {
    ok: true,
    ensuredIds: ensuredIds,
    ensuredCargaHoraria: ensuredCargaHoraria,
    syncPeriodoBefore: syncPeriodoBefore,
    syncPresencasBefore: syncPresencasBefore,
    convocacoes: convocacoes,
    lembretes: lembretes,
    autoRealizadas: autoRealizadas,
    pendencias: pendencias,
    syncPeriodoAfter: syncPeriodoAfter,
    syncPresencasAfter: syncPresencasAfter,
    outbox: atividades_processOutboxForGeneralActivities_([
      convocacoes,
      lembretes,
      pendencias
    ])
  };
}
