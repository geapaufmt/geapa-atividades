function atividades_parseHorarioApresentacaoPosEvento_(value) {
  var raw = String(value || '').trim();
  if (!raw) return null;
  var match = raw.match(/^(\d{1,2})(?:\s*[hH:]\s*(\d{1,2}))?$/);
  if (!match) return null;
  return {
    hora: parseInt(match[1], 10),
    minuto: match[2] !== undefined ? parseInt(match[2], 10) : 0
  };
}

function atividades_getDataHoraApresentacaoPosEvento_(record, opts) {
  opts = opts || {};
  var data = atividades_parseDateOrNull_(record.DATA_ATIVIDADE);
  if (!data) return null;

  var preferEndTime = opts.preferEndTime === true;
  var horarioPreferido = preferEndTime ? record.HORARIO_FIM : record.HORARIO_INICIO;
  var horarioFallback = preferEndTime ? record.HORARIO_INICIO : record.HORARIO_FIM;
  var parsed = atividades_parseHorarioApresentacaoPosEvento_(horarioPreferido) ||
    atividades_parseHorarioApresentacaoPosEvento_(horarioFallback);
  var hora = parsed ? parsed.hora : 18;
  var minuto = parsed ? parsed.minuto : 30;

  return new Date(
    data.getFullYear(),
    data.getMonth(),
    data.getDate(),
    hora,
    minuto,
    0,
    0
  );
}

function atividades_getHorarioInicioApresentacaoPosEvento_(record) {
  return atividades_getDataHoraApresentacaoPosEvento_(record);
}

function atividades_getHorarioFimApresentacaoPosEvento_(record) {
  return atividades_getDataHoraApresentacaoPosEvento_(record, {
    preferEndTime: true
  });
}

function atividades_buildCurrentPeriodActivityIndexById_(periodRows) {
  var index = {};
  (periodRows || []).forEach(function(row) {
    var id = String(row.ID_ATIVIDADE || '').trim();
    if (!id) return;
    index[id] = row;
  });
  return index;
}

function atividades_temLancamentoRealNaColunaPresenca_(sheet, columnNumber) {
  if (!sheet || !columnNumber || sheet.getLastRow() < 2) return false;
  var values = sheet.getRange(2, columnNumber, sheet.getLastRow() - 1, 1).getDisplayValues();
  return values.some(function(row) {
    var value = atividades_normalizeTextUpper_(row[0]);
    return ['P', 'R', 'F', 'J', 'A'].indexOf(value) >= 0;
  });
}

function atividades_temEvidenciaExecucaoApresentacao_(record, opts) {
  opts = opts || {};
  var activityId = String(record.ID_ATIVIDADE || '').trim();
  if (!activityId) return false;

  var fim = atividades_getHorarioFimApresentacaoPosEvento_(record);
  if (!fim || new Date().getTime() < fim.getTime()) return false;

  var ctx;
  try {
    ctx = opts.ctx || atividades_getCurrentPeriodContext_();
  } catch (err) {
    return false;
  }

  var periodRows = opts.periodRows || atividades_getCurrentPeriodActivitiesMap_();
  var activityIndex = opts.activityIndex || atividades_buildCurrentPeriodActivityIndexById_(periodRows);
  var periodRow = activityIndex[activityId];
  if (!periodRow) return false;

  var presenceSheet = opts.presenceSheet || atividades_findSheetByName_(atividades_getOperationalHolder_().spreadsheet, ctx.presenceSheetName);
  if (!presenceSheet) return false;

  var presenceHeaderMap = opts.presenceHeaderMap || GEAPA_CORE.coreHeaderMap(presenceSheet, 1);
  var colunaPresenca = String(periodRow.COLUNA_PRESENCA || '').trim();
  var col = GEAPA_CORE.coreGetCol(presenceHeaderMap, colunaPresenca);
  if (!col) return false;

  return atividades_temLancamentoRealNaColunaPresenca_(presenceSheet, col);
}

function atividades_tryAutoMarkApresentacoesRealizadas_(opts) {
  opts = opts || {};
  var ctx;
  try {
    ctx = opts.ctx || atividades_getCurrentPeriodContext_();
  } catch (err) {
    return {
      ok: false,
      updatedCount: 0,
      updated: [],
      reason: 'period_context_unavailable'
    };
  }

  var operational = atividades_getOperationalHolder_().spreadsheet;
  var presenceSheet = atividades_findSheetByName_(operational, ctx.presenceSheetName);
  if (!presenceSheet) {
    return {
      ok: false,
      updatedCount: 0,
      updated: [],
      reason: 'presence_sheet_not_found'
    };
  }

  var periodRows = atividades_getCurrentPeriodActivitiesMap_();
  var activityIndex = atividades_buildCurrentPeriodActivityIndexById_(periodRows);
  var presenceHeaderMap = GEAPA_CORE.coreHeaderMap(presenceSheet, 1);
  var sheet = atividades_getApresentacoesSheet_();
  var headerMap = GEAPA_CORE.coreHeaderMap(sheet, 1);
  var updated = [];

  atividades_listApresentacaoRowsWithNumbers_().forEach(function(item) {
    var record = item.record;
    if (!atividades_isStatusApresentacao_(record.STATUS_APRESENTACAO, 'APROVADA')) return;
    if (!atividades_temEvidenciaExecucaoApresentacao_(record, {
      ctx: ctx,
      periodRows: periodRows,
      activityIndex: activityIndex,
      presenceSheet: presenceSheet,
      presenceHeaderMap: presenceHeaderMap
    })) return;

    GEAPA_CORE.coreWriteCellByHeader(sheet, item.rowNumber, headerMap, 'STATUS_APRESENTACAO', 'REALIZADA', { oneBased: true });
    if (GEAPA_CORE.coreGetCol(headerMap, 'ATUALIZADO_EM')) {
      GEAPA_CORE.coreWriteCellByHeader(sheet, item.rowNumber, headerMap, 'ATUALIZADO_EM', new Date(), { oneBased: true });
    }
    updated.push({
      rowNumber: item.rowNumber,
      idAtividade: String(record.ID_ATIVIDADE || '').trim()
    });
  });

  if (updated.length) {
    atividades_logEvento_({
      TIPO_EVENTO_LOG: ATIVIDADES_CFG.APRESENTACOES_LOG_TYPES.AUTO_REALIZADA_APRESENTACAO,
      STATUS: 'OK',
      ACAO_EXECUTADA: 'Marcar apresentações como realizadas por evidência de execução em presenças',
      RESULTADO: 'updated=' + updated.length,
      OBSERVACOES: updated.slice(0, 20).map(function(item) {
        return item.idAtividade;
      }).join(' | ')
    });
  }

  return {
    ok: true,
    updatedCount: updated.length,
    updated: updated
  };
}

function atividades_getPrimeiraCobrancaArquivo_(record) {
  var data = atividades_parseDateOrNull_(record.DATA_ATIVIDADE);
  if (!data) return null;

  return new Date(
    data.getFullYear(),
    data.getMonth(),
    data.getDate(),
    ATIVIDADES_CFG.APRESENTACOES_POS_EVENTO.PRIMEIRA_COBRANCA_HORA,
    ATIVIDADES_CFG.APRESENTACOES_POS_EVENTO.PRIMEIRA_COBRANCA_MINUTO,
    0,
    0
  );
}

function atividades_getFimJanelaCobrancaArquivo_(record) {
  var base = atividades_getDataHoraApresentacaoPosEvento_(record);
  if (!base) return null;
  return new Date(
    base.getTime() + (ATIVIDADES_CFG.APRESENTACOES_POS_EVENTO.JANELA_COBRANCA_HORAS * 60 * 60 * 1000)
  );
}

function atividades_arquivoJaRecebidoApresentacao_(record) {
  return !!(
    String(record.LINK_ARQUIVO_DRIVE || '').trim() ||
    atividades_parseDateOrNull_(record.DATA_RECEBIMENTO_ARQUIVO) ||
    atividades_isStatusApresentacaoArquivo_(record.STATUS_ENVIO_ARQUIVO, 'RECEBIDO')
  );
}

function atividades_isStatusApresentacaoArquivo_(value, expected) {
  return atividades_normalizeTextUpper_(value) === atividades_normalizeTextUpper_(expected);
}

function atividades_passouIntervaloMinimoDesdeCobrancaArquivo_(record) {
  var ultima = atividades_parseDateOrNull_(record.DATA_COBRANCA_ARQUIVO || record.DATA_SOLICITACAO_ARQUIVO);
  if (!ultima) return true;
  var intervaloHoras = Number(ATIVIDADES_CFG.APRESENTACOES_POS_EVENTO.COBRANCA_ARQUIVO_INTERVALO_HORAS || 24);
  return (new Date().getTime() - ultima.getTime()) >= (intervaloHoras * 60 * 60 * 1000);
}

function atividades_deveCobrarArquivoHoje_(record) {
  if (!atividades_isStatusApresentacao_(record.STATUS_APRESENTACAO, ATIVIDADES_CFG.APRESENTACOES_POS_EVENTO.STATUS_COBRAR_ARQUIVO)) return false;
  if (!GEAPA_CORE.coreIsValidEmail(String(record.EMAIL_MEMBRO || '').trim())) return false;
  if (!atividades_parseDateOrNull_(record.DATA_ATIVIDADE)) return false;
  if (atividades_arquivoJaRecebidoApresentacao_(record)) return false;

  var agora = new Date();
  var inicio = atividades_getPrimeiraCobrancaArquivo_(record);
  var fim = atividades_getFimJanelaCobrancaArquivo_(record);
  if (!inicio || !fim) return false;
  if (agora.getTime() < inicio.getTime()) return false;
  if (agora.getTime() > fim.getTime()) return false;
  if (!atividades_passouIntervaloMinimoDesdeCobrancaArquivo_(record)) return false;

  return true;
}

function atividades_deveCobrarArquivoForcado_(record) {
  if (!atividades_isStatusApresentacao_(record.STATUS_APRESENTACAO, ATIVIDADES_CFG.APRESENTACOES_POS_EVENTO.STATUS_COBRAR_ARQUIVO)) return false;
  if (!GEAPA_CORE.coreIsValidEmail(String(record.EMAIL_MEMBRO || '').trim())) return false;
  if (!atividades_parseDateOrNull_(record.DATA_ATIVIDADE)) return false;
  if (atividades_arquivoJaRecebidoApresentacao_(record)) return false;
  return true;
}

function atividades_buildArquivoApresentacaoCorrelationKey_(record, refDate) {
  var dateToken = Utilities.formatDate(
    atividades_parseDateOrNull_(refDate) || new Date(),
    Session.getScriptTimeZone(),
    'yyyyMMdd'
  );
  return [
    'AARQ',
    atividades_normalizeTextUpper_(String(record.ID_ATIVIDADE || '').trim() || 'SEM_ID').replace(/[^\w]+/g, '_'),
    atividades_normalizeTextUpper_(String(record.RGA || '').trim() || 'SEM_RGA').replace(/[^\w]+/g, '_'),
    dateToken
  ].join('-');
}

function atividades_buildCobrancaArquivoPayload_(record) {
  var resumo = atividades_buildInviteActivitySummary_(record);
  var primeiroNome = atividades_getPrimeiroNome_(record.NOME_MEMBRO);
  var saudacao = primeiroNome ? ('Olá, ' + primeiroNome + '.') : 'Olá.';
  var qtd = Number(record.QTD_COBRANCAS_ARQUIVO || 0) + 1;
  var fimJanela = atividades_getFimJanelaCobrancaArquivo_(record);
  var prazoTxt = fimJanela
    ? Utilities.formatDate(fimJanela, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm')
    : '72 horas após a apresentação';
  var primeira = qtd === 1;

  return {
    subtitle: 'Fluxo pós-apresentação do GEAPA',
    introText: primeira
      ? (saudacao + ' Recebemos o registro da sua apresentação e agora precisamos do arquivo em PDF.')
      : (saudacao + ' Este é um lembrete referente ao envio do arquivo em PDF da sua apresentação.'),
    blocks: [
      {
        title: 'Apresentação',
        items: [
          { label: 'Tema', value: resumo.titulo },
          { label: 'Data', value: resumo.dataTxt },
          { label: 'Horário', value: resumo.horarioTxt },
          { label: 'Local', value: resumo.local }
        ]
      },
      {
        title: 'Como enviar',
        text: 'Responda este e-mail anexando o arquivo da apresentação em formato PDF. Apenas arquivos em PDF serão aceitos pelo sistema.'
      },
      {
        title: 'Prazo',
        text: 'O prazo final para envio é ' + prazoTxt + '.'
      }
    ],
    footerNote: 'Mensagem automática enviada pelo fluxo institucional de apresentações do GEAPA.'
  };
}

function atividades_marcarCobrancaArquivoEnviada_(rowNumber) {
  var sheet = atividades_getApresentacoesSheet_();
  var headerMap = GEAPA_CORE.coreHeaderMap(sheet, 1);
  var agora = new Date();
  var records = GEAPA_CORE.coreReadSheetRecords(sheet, { headerRow: 1 });
  var current = records[rowNumber - 2] || {};
  var qtdAtual = Number(current.QTD_COBRANCAS_ARQUIVO || 0) || 0;

  GEAPA_CORE.coreWriteCellByHeader(sheet, rowNumber, headerMap, 'DATA_COBRANCA_ARQUIVO', agora, { oneBased: true });
  if (!atividades_parseDateOrNull_(current.DATA_SOLICITACAO_ARQUIVO)) {
    GEAPA_CORE.coreWriteCellByHeader(sheet, rowNumber, headerMap, 'DATA_SOLICITACAO_ARQUIVO', agora, { oneBased: true });
  }
  GEAPA_CORE.coreWriteCellByHeader(sheet, rowNumber, headerMap, 'QTD_COBRANCAS_ARQUIVO', qtdAtual + 1, { oneBased: true });
  GEAPA_CORE.coreWriteCellByHeader(sheet, rowNumber, headerMap, 'STATUS_ENVIO_ARQUIVO', 'SOLICITADO', { oneBased: true });
  if (GEAPA_CORE.coreGetCol(headerMap, 'ATUALIZADO_EM')) {
    GEAPA_CORE.coreWriteCellByHeader(sheet, rowNumber, headerMap, 'ATUALIZADO_EM', agora, { oneBased: true });
  }
}

function atividades_enviarCobrancasArquivoApresentacoes_(opts) {
  opts = opts || {};
  var force = opts.force === true;
  var queued = [];
  var duplicates = 0;
  var deferred = 0;

  atividades_listApresentacaoRowsWithNumbers_().forEach(function(item) {
    var record = item.record;
    if (force) {
      if (!atividades_deveCobrarArquivoForcado_(record)) return;
    } else {
      if (!atividades_deveCobrarArquivoHoje_(record)) return;
    }

    var correlationKey = atividades_buildArquivoApresentacaoCorrelationKey_(record, new Date());
    var queueResult = atividades_tryQueueOutgoing_({
      moduleName: ATIVIDADES_CFG.MODULE_CODE,
      templateKey: 'GEAPA_OPERACIONAL',
      correlationKey: correlationKey,
      entityType: 'MEMBRO',
      entityId: String(record.RGA || record.ID_ATIVIDADE || '').trim(),
      flowCode: 'APR',
      stage: 'ARQ_PDF',
      to: String(record.EMAIL_MEMBRO || '').trim(),
      recipientName: String(record.NOME_MEMBRO || '').trim(),
      subjectHuman: ATIVIDADES_CFG.APRESENTACOES_POS_EVENTO.ARQUIVO_INBOX_SUBJECT,
      payload: atividades_buildCobrancaArquivoPayload_(record),
      metadata: {
        source: 'geapa-atividades',
        idAtividade: String(record.ID_ATIVIDADE || '').trim(),
        rga: String(record.RGA || '').trim(),
        statusApresentacao: String(record.STATUS_APRESENTACAO || '').trim()
      }
    });

    if (queueResult && queueResult.duplicate) {
      duplicates++;
      return;
    }
    if (queueResult && queueResult.locked) {
      deferred++;
      return;
    }

    if (queueResult && queueResult.queued) {
      atividades_marcarCobrancaArquivoEnviada_(item.rowNumber);
      queued.push({
        rowNumber: item.rowNumber,
        correlationKey: correlationKey,
        saidaId: queueResult.saidaId || ''
      });
    }
  });

  if (queued.length || duplicates) {
    atividades_logEvento_({
      TIPO_EVENTO_LOG: ATIVIDADES_CFG.APRESENTACOES_LOG_TYPES.COBRANCA_ARQUIVO_APRESENTACAO,
      STATUS: 'OK',
      ACAO_EXECUTADA: force
        ? 'Enfileirar cobrança forçada do arquivo em PDF das apresentações realizadas'
        : 'Enfileirar cobrança do arquivo em PDF das apresentações realizadas',
      RESULTADO: 'queued=' + queued.length + ' | duplicates=' + duplicates,
      OBSERVACOES: queued.slice(0, 20).map(function(item) {
        return item.correlationKey;
      }).join(' | ')
    });
  }

  if (deferred) {
    atividades_logEvento_({
      TIPO_EVENTO_LOG: ATIVIDADES_CFG.APRESENTACOES_LOG_TYPES.COBRANCA_ARQUIVO_APRESENTACAO,
      STATUS: 'ATENCAO',
      ACAO_EXECUTADA: 'Adiar cobrança de arquivo por contenção da fila central',
      RESULTADO: 'deferred=' + deferred,
      OBSERVACOES: 'A fila central de e-mails estava ocupada. O job tentará novamente no próximo ciclo.'
    });
  }

  if (opts.processOutbox === false) {
    return {
      ok: true,
      queuedCount: queued.length,
      duplicateCount: duplicates,
      deferredCount: deferred,
      queued: queued
    };
  }

  return {
    ok: true,
    queuedCount: queued.length,
    duplicateCount: duplicates,
    deferredCount: deferred,
    queued: queued,
    outbox: queued.length ? GEAPA_CORE.coreMailProcessOutbox() : { ok: true, skipped: true, reason: 'no_queued_messages' }
  };
}

function atividades_getLabelArquivoProcessado_() {
  return GEAPA_CORE.coreGetOrCreateLabel(ATIVIDADES_CFG.APRESENTACOES_POS_EVENTO.THREAD_LABEL_PROCESSADA);
}

function atividades_threadJaProcessadaArquivo_(thread) {
  return GEAPA_CORE.coreThreadHasLabel(thread, ATIVIDADES_CFG.APRESENTACOES_POS_EVENTO.THREAD_LABEL_PROCESSADA);
}

function atividades_marcarThreadArquivoProcessada_(thread) {
  thread.addLabel(atividades_getLabelArquivoProcessado_());
}

function atividades_parseArquivoCorrelationKey_(correlationKey) {
  var normalized = String(correlationKey || '').trim().toUpperCase();
  if (!normalized) return null;

  var parts = normalized.split('-');
  if (parts.length < 4 || parts[0] !== 'AARQ') return null;

  return {
    prefix: parts[0],
    activityToken: parts[1] || '',
    rgaToken: parts[2] || '',
    dateToken: parts.slice(3).join('-') || ''
  };
}

function atividades_buildAttachmentContextFromCore_(attachmentRecord) {
  if (!attachmentRecord || !attachmentRecord.eventId) return null;

  var eventRecord = GEAPA_CORE.coreMailGetLatestEvent({
    messageId: attachmentRecord.messageId
  });
  if (!eventRecord) return null;

  return {
    attachment: attachmentRecord,
    event: eventRecord
  };
}

function atividades_listarEventosPendentesArquivoApresentacoes_() {
  var attachments = (GEAPA_CORE.coreMailListPendingAttachments({
    limit: 300
  }) || []).filter(function(record) {
    if (!record) return false;
    return !!atividades_parseArquivoCorrelationKey_(record.correlationKey || '');
  });

  var grouped = Object.create(null);
  attachments.forEach(function(record) {
    if (!record || !record.eventId) return;
    if (!grouped[record.eventId]) {
      grouped[record.eventId] = [];
    }
    grouped[record.eventId].push(record);
  });

  var events = Object.keys(grouped).map(function(eventId) {
    var firstAttachment = grouped[eventId][0];
    var ctx = atividades_buildAttachmentContextFromCore_(firstAttachment);
    if (!ctx || !ctx.event) return null;

    return {
      event: ctx.event,
      attachments: grouped[eventId]
    };
  }).filter(Boolean);

  events.sort(function(a, b) {
    var aDate = atividades_parseDateOrNull_(a.event.receivedAt || a.event.ingestedAt);
    var bDate = atividades_parseDateOrNull_(b.event.receivedAt || b.event.ingestedAt);
    return (bDate ? bDate.getTime() : 0) - (aDate ? aDate.getTime() : 0);
  });

  return events;
}

/**
 * Indica se um evento pendente da Central pode representar envio por link do Drive.
 * @param {Object} eventRecord Registro da aba MAIL_EVENTOS.
 * @return {boolean} Verdadeiro quando o evento e uma entrada AARQ sem anexo real, mas com link do Drive.
 */
function atividades_eventoPodeConterDriveLinkArquivo_(eventRecord) {
  if (!eventRecord) return false;
  if (!atividades_parseArquivoCorrelationKey_(eventRecord.correlationKey || '')) return false;
  if (atividades_normalizeTextUpper_(eventRecord.direction || '') !== 'ENTRADA') return false;
  if (Number(eventRecord.attachmentCount || 0) > 0) return false;

  var text = [
    eventRecord.subject,
    eventRecord.snippet,
    eventRecord.plainBody
  ].join(' ');

  return /drive\.google\.com/i.test(text);
}

/**
 * Lista eventos pendentes de envio de arquivo que chegaram como link do Drive em vez de anexo.
 * @return {Object[]} Registros da Central de Mensageria candidatos ao processamento.
 */
function atividades_listarEventosPendentesDriveLinkArquivoApresentacoes_() {
  var sheet = GEAPA_CORE.coreGetSheetByKey('MAIL_EVENTOS');
  if (!sheet || sheet.getLastRow() < 2) return [];

  var headerMap = GEAPA_CORE.coreHeaderMap(sheet, 1);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  var rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var events = [];

  function cell(row, headerName) {
    var col = GEAPA_CORE.coreGetCol(headerMap, headerName);
    return col ? row[col - 1] : '';
  }

  rows.forEach(function(row, index) {
    var moduleName = atividades_normalizeTextUpper_(cell(row, 'Modulo Dono'));
    var status = atividades_normalizeTextUpper_(cell(row, 'Status Processamento'));
    if (moduleName !== 'ATIVIDADES' || status !== 'PENDENTE') return;

    var record = {
      eventId: String(cell(row, 'Id Evento') || '').trim(),
      messageId: String(cell(row, 'Id Mensagem Gmail') || '').trim(),
      threadId: String(cell(row, 'Id Thread Gmail') || '').trim(),
      correlationKey: String(cell(row, 'Chave de Correlacao') || '').trim(),
      direction: String(cell(row, 'Direcao') || '').trim(),
      eventType: String(cell(row, 'Tipo Evento') || '').trim(),
      subject: String(cell(row, 'Assunto') || '').trim(),
      fromEmail: String(cell(row, 'Email Remetente') || '').trim(),
      fromName: String(cell(row, 'Nome Remetente') || '').trim(),
      snippet: String(cell(row, 'Trecho Corpo') || '').trim(),
      plainBody: String(cell(row, 'Corpo Texto') || '').trim(),
      receivedAt: cell(row, 'Data Hora Evento'),
      ingestedAt: cell(row, 'Criado Em'),
      hasAttachments: String(cell(row, 'Possui Anexos') || '').trim(),
      attachmentCount: Number(cell(row, 'Quantidade Anexos') || 0),
      rowNumber: index + 2
    };

    if (atividades_eventoPodeConterDriveLinkArquivo_(record)) {
      events.push(record);
    }
  });

  events.sort(function(a, b) {
    var aDate = atividades_parseDateOrNull_(a.receivedAt || a.ingestedAt);
    var bDate = atividades_parseDateOrNull_(b.receivedAt || b.ingestedAt);
    return (bDate ? bDate.getTime() : 0) - (aDate ? aDate.getTime() : 0);
  });

  return events.slice(0, 300);
}

function atividades_encontrarLinhaPendenteArquivoPorCoreEvent_(eventRecord, attachments) {
  attachments = Array.isArray(attachments) ? attachments : [];
  var correlation = atividades_parseArquivoCorrelationKey_(
    (eventRecord && eventRecord.correlationKey) ||
    (attachments[0] && attachments[0].correlationKey) ||
    ''
  );
  var senderEmail = atividades_extrairEmailSimplesApresentacoes_(
    (eventRecord && eventRecord.fromEmail) ||
    ''
  );
  var receivedAt = atividades_parseDateOrNull_(
    (eventRecord && eventRecord.receivedAt) ||
    (eventRecord && eventRecord.ingestedAt) ||
    ''
  ) || new Date();

  var candidatos = atividades_listApresentacaoRowsWithNumbers_().filter(function(item) {
    var record = item.record;
    if (atividades_arquivoJaRecebidoApresentacao_(record)) return false;
    if (!atividades_parseDateOrNull_(record.DATA_SOLICITACAO_ARQUIVO)) return false;
    if (!atividades_isStatusApresentacao_(record.STATUS_APRESENTACAO, ATIVIDADES_CFG.APRESENTACOES_POS_EVENTO.STATUS_COBRAR_ARQUIVO)) return false;

    var dtSolic = atividades_parseDateOrNull_(record.DATA_SOLICITACAO_ARQUIVO);
    if (!dtSolic || dtSolic.getTime() > receivedAt.getTime()) return false;

    if (correlation) {
      var activityToken = atividades_normalizeTextUpper_(String(record.ID_ATIVIDADE || '').trim()).replace(/[^\w]+/g, '_');
      var rgaToken = atividades_normalizeTextUpper_(String(record.RGA || '').trim()).replace(/[^\w]+/g, '_');
      if (correlation.activityToken && correlation.activityToken !== 'SEM_ID' && activityToken && correlation.activityToken !== activityToken) return false;
      if (correlation.rgaToken && correlation.rgaToken !== 'SEM_RGA' && rgaToken && correlation.rgaToken !== rgaToken) return false;
      return true;
    }

    if (senderEmail && atividades_extrairEmailSimplesApresentacoes_(record.EMAIL_MEMBRO) === senderEmail) {
      return true;
    }

    if (eventRecord && String(eventRecord.entityId || '').trim() && String(record.RGA || '').trim() === String(eventRecord.entityId || '').trim()) {
      return true;
    }

    return false;
  });

  if (!candidatos.length) return null;

  candidatos.sort(function(a, b) {
    return atividades_parseDateOrNull_(b.record.DATA_SOLICITACAO_ARQUIVO) -
      atividades_parseDateOrNull_(a.record.DATA_SOLICITACAO_ARQUIVO);
  });

  return candidatos[0];
}

function atividades_buscarThreadsArquivoApresentacoes_() {
  var primary = GEAPA_CORE.coreSearchThreads(
    'newer_than:30d -in:trash -in:spam subject:"' + ATIVIDADES_CFG.APRESENTACOES_POS_EVENTO.ARQUIVO_INBOX_SUBJECT + '"',
    0,
    50
  ) || [];

  if (primary.length) return primary;

  // Fallback mais tolerante para respostas em threads cujo assunto foi alterado.
  return GEAPA_CORE.coreSearchThreads(
    'newer_than:30d -in:trash -in:spam has:attachment',
    0,
    100
  ) || [];
}

function atividades_listApresentacoesPendentesArquivo_() {
  return atividades_listApresentacaoRowsWithNumbers_().filter(function(item) {
    var record = item.record || {};
    if (atividades_arquivoJaRecebidoApresentacao_(record)) return false;
    if (!atividades_parseDateOrNull_(record.DATA_SOLICITACAO_ARQUIVO)) return false;
    if (!atividades_isStatusApresentacao_(record.STATUS_APRESENTACAO, ATIVIDADES_CFG.APRESENTACOES_POS_EVENTO.STATUS_COBRAR_ARQUIVO)) return false;
    return true;
  });
}

function atividades_hasApresentacoesPendentesArquivo_() {
  return atividades_listApresentacoesPendentesArquivo_().length > 0;
}

function atividades_isMailHubInboxIngestLockError_(err) {
  var message = err && err.message ? err.message : String(err || '');
  return message.indexOf('CORE_MAIL_HUB_INGEST_INBOX') >= 0 &&
    (message.indexOf('Lock não obtido') >= 0 || message.indexOf('Lock nao obtido') >= 0);
}

function atividades_ingestirInboxArquivoApresentacoes_(opts) {
  opts = opts || {};
  if (!atividades_hasApresentacoesPendentesArquivo_()) {
    return {
      ok: true,
      skipped: true,
      reason: 'sem_apresentacoes_pendentes'
    };
  }

  var days = Number(ATIVIDADES_CFG.APRESENTACOES_POS_EVENTO.INBOX_INGEST_DAYS || 15);
  var query = [
    'newer_than:' + days + 'd',
    '-in:trash',
    '-in:spam',
    'subject:"' + ATIVIDADES_CFG.APRESENTACOES_POS_EVENTO.ARQUIVO_INBOX_SUBJECT + '"'
  ].join(' ');

  try {
    return GEAPA_CORE.coreMailIngestInbox({
      query: query,
      start: 0,
      maxThreads: Number(ATIVIDADES_CFG.APRESENTACOES_POS_EVENTO.INBOX_INGEST_MAX_THREADS || 12),
      maxMessagesPerThread: Number(ATIVIDADES_CFG.APRESENTACOES_POS_EVENTO.INBOX_INGEST_MAX_MESSAGES_PER_THREAD || 6)
    });
  } catch (err) {
    if (atividades_isMailHubInboxIngestLockError_(err)) {
      return {
        ok: false,
        skipped: true,
        reason: 'ingest_locked',
        message: err && err.message ? err.message : String(err)
      };
    }
    throw err;
  }
}

function atividades_encontrarLinhaPendenteArquivoPorEmail_(senderEmail) {
  var emailNorm = atividades_extrairEmailSimplesApresentacoes_(senderEmail);
  var agora = new Date();
  var candidatos = atividades_listApresentacaoRowsWithNumbers_().filter(function(item) {
    var record = item.record;
    if (atividades_extrairEmailSimplesApresentacoes_(record.EMAIL_MEMBRO) !== emailNorm) return false;
    if (atividades_arquivoJaRecebidoApresentacao_(record)) return false;
    if (!atividades_parseDateOrNull_(record.DATA_SOLICITACAO_ARQUIVO)) return false;
    if (!atividades_isStatusApresentacao_(record.STATUS_APRESENTACAO, ATIVIDADES_CFG.APRESENTACOES_POS_EVENTO.STATUS_COBRAR_ARQUIVO)) return false;

    var dtSolic = atividades_parseDateOrNull_(record.DATA_SOLICITACAO_ARQUIVO);
    return dtSolic && dtSolic.getTime() <= agora.getTime();
  });

  if (!candidatos.length) return null;

  candidatos.sort(function(a, b) {
    return atividades_parseDateOrNull_(b.record.DATA_SOLICITACAO_ARQUIVO) -
      atividades_parseDateOrNull_(a.record.DATA_SOLICITACAO_ARQUIVO);
  });

  return candidatos[0];
}

function atividades_getPastaRaizApresentacoes_() {
  var entry = atividades_findEntryByPreferredKeys_(ATIVIDADES_CFG.APRESENTACOES_POS_EVENTO.ROOT_FOLDER_KEYS);
  if (!entry) {
    throw new Error(
      'Nao foi possivel localizar a pasta raiz das apresentacoes no Registry. Keys esperadas: ' +
      ATIVIDADES_CFG.APRESENTACOES_POS_EVENTO.ROOT_FOLDER_KEYS.join(', ')
    );
  }
  return atividades_openFolderByIdCached_(entry.id);
}

function atividades_getPastaUploadFotosApresentacoes_() {
  var entry = atividades_findEntryByPreferredKeys_(ATIVIDADES_CFG.APRESENTACOES_POS_EVENTO.UPLOAD_FOTOS_FOLDER_KEYS);
  if (!entry) {
    throw new Error(
      'Nao foi possivel localizar a pasta de upload de fotos das apresentacoes no Registry. Keys esperadas: ' +
      ATIVIDADES_CFG.APRESENTACOES_POS_EVENTO.UPLOAD_FOTOS_FOLDER_KEYS.join(', ')
    );
  }
  return atividades_openFolderByIdCached_(entry.id);
}

function atividades_tryGetPastaUploadFotosApresentacoes_() {
  try {
    return atividades_getPastaUploadFotosApresentacoes_();
  } catch (err) {
    return null;
  }
}

function atividades_getOuCriarSubfolderByName_(parentFolder, folderName) {
  var iterator = parentFolder.getFoldersByName(folderName);
  if (iterator.hasNext()) return iterator.next();
  return parentFolder.createFolder(folderName);
}

function atividades_getSubfolderByName_(parentFolder, folderName) {
  var iterator = parentFolder.getFoldersByName(folderName);
  return iterator.hasNext() ? iterator.next() : null;
}

function atividades_resolverRotuloSemestreApresentacao_(record) {
  var rawSemester = record ? record.SEMESTRE_APRESENTACAO : '';
  var rawPeriodo = record ? record.PERIODO_REFERENCIA : '';
  var rawDataAtividade = record ? record.DATA_ATIVIDADE : '';

  var semesterText = String(rawSemester || '').trim();
  if (/^\d{4}\/[12]$/.test(semesterText)) {
    return semesterText;
  }

  var activityDate = atividades_parseDateOrNull_(rawDataAtividade);
  if (activityDate) {
    var activitySemester = atividades_resolverSemestrePorData_(activityDate) ||
      GEAPA_CORE.coreGetCurrentSemester(activityDate);
    if (activitySemester && activitySemester.id) {
      return String(activitySemester.id).trim();
    }
  }

  var semesterDate = atividades_parseDateOrNull_(rawSemester);
  if (semesterDate) {
    var semesterByDate = atividades_resolverSemestrePorData_(semesterDate) ||
      GEAPA_CORE.coreGetCurrentSemester(semesterDate);
    if (semesterByDate && semesterByDate.id) {
      return String(semesterByDate.id).trim();
    }
  }

  var periodoText = String(rawPeriodo || '').trim();
  if (/^\d{4}\/[12]$/.test(periodoText)) {
    return periodoText;
  }

  return periodoText || semesterText || 'SEMESTRE_NAO_INFORMADO';
}

function atividades_getOuCriarPastaSemestreApresentacao_(record) {
  var raiz = atividades_getPastaRaizApresentacoes_();
  var semestre = atividades_resolverRotuloSemestreApresentacao_(record);
  return atividades_getOuCriarSubfolderByName_(raiz, 'Apresentações GEAPA ' + semestre);
}

function atividades_getPastaSemestreApresentacaoExistente_(record) {
  var raiz = atividades_getPastaRaizApresentacoes_();
  var semestre = atividades_resolverRotuloSemestreApresentacao_(record);
  return atividades_getSubfolderByName_(raiz, 'Apresentações GEAPA ' + semestre);
}

function atividades_getOuCriarPastaFinalApresentacao_(record) {
  var data = atividades_parseDateOrNull_(record.DATA_ATIVIDADE);
  var prefixo = data
    ? Utilities.formatDate(data, Session.getScriptTimeZone(), 'yyyy-MM-dd')
    : 'sem-data';
  var nome = prefixo + ' - ' + (String(record.NOME_MEMBRO || '').trim() || 'Apresentacao');
  return atividades_getOuCriarSubfolderByName_(
    atividades_getOuCriarPastaSemestreApresentacao_(record),
    nome
  );
}

function atividades_getNomeEsperadoPastaFinalApresentacao_(record) {
  var data = atividades_parseDateOrNull_(record.DATA_ATIVIDADE);
  var prefixo = data
    ? Utilities.formatDate(data, Session.getScriptTimeZone(), 'yyyy-MM-dd')
    : 'sem-data';
  return prefixo + ' - ' + (String(record.NOME_MEMBRO || '').trim() || 'Apresentacao');
}

function atividades_findPastaFinalApresentacaoExistente_(itemOrRecord) {
  var record = itemOrRecord && itemOrRecord.record ? itemOrRecord.record : itemOrRecord;
  if (!record) return null;

  var semesterFolder;
  try {
    semesterFolder = atividades_getPastaSemestreApresentacaoExistente_(record);
  } catch (err) {
    return null;
  }
  if (!semesterFolder) return null;

  var preferredNames = [];
  var savedLinkValue = atividades_getLinkArquivoDriveApresentacao_(itemOrRecord);
  var savedDisplayText = String(savedLinkValue || '').trim();
  var expectedName = atividades_getNomeEsperadoPastaFinalApresentacao_(record);

  if (savedDisplayText && !atividades_extrairFolderIdDaUrlApresentacao_(savedDisplayText)) {
    preferredNames.push(savedDisplayText);
  }
  if (expectedName && preferredNames.indexOf(expectedName) === -1) {
    preferredNames.push(expectedName);
  }

  for (var i = 0; i < preferredNames.length; i++) {
    var folder = atividades_getSubfolderByName_(semesterFolder, preferredNames[i]);
    if (folder) return folder;
  }

  return null;
}

function atividades_extrairFolderIdDaUrlApresentacao_(url) {
  var txt = String(url || '').trim();
  if (!txt) return '';
  var match = txt.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return match[1];
  match = txt.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match && match[1] ? match[1] : '';
}

function atividades_getLinkArquivoDriveApresentacao_(itemOrRecord) {
  var record = itemOrRecord && itemOrRecord.record ? itemOrRecord.record : itemOrRecord;
  var rowNumber = itemOrRecord && itemOrRecord.rowNumber ? Number(itemOrRecord.rowNumber) : 0;
  var rawValue = String(record && record.LINK_ARQUIVO_DRIVE || '').trim();
  if (atividades_extrairFolderIdDaUrlApresentacao_(rawValue)) return rawValue;

  if (!rowNumber) return rawValue;

  var sheet = atividades_getApresentacoesSheet_();
  var headerMap = GEAPA_CORE.coreHeaderMap(sheet, 1);
  var col = GEAPA_CORE.coreGetCol(headerMap, 'LINK_ARQUIVO_DRIVE');
  if (!col) return rawValue;

  try {
    var richValue = sheet.getRange(rowNumber, col).getRichTextValue();
    if (richValue) {
      var linkUrl = richValue.getLinkUrl();
      if (atividades_extrairFolderIdDaUrlApresentacao_(linkUrl)) return linkUrl;
    }
  } catch (ignoreErr) {
    // segue com o valor bruto
  }

  return rawValue;
}

function atividades_getPastaFinalApresentacaoPorLink_(itemOrRecord) {
  var folderId = atividades_extrairFolderIdDaUrlApresentacao_(atividades_getLinkArquivoDriveApresentacao_(itemOrRecord));
  if (folderId) {
    return DriveApp.getFolderById(folderId);
  }
  return atividades_findPastaFinalApresentacaoExistente_(itemOrRecord);
}

function atividades_temPastaFinalRegistradaApresentacao_(itemOrRecord) {
  return !!atividades_getPastaFinalApresentacaoPorLink_(itemOrRecord);
}

function atividades_formatarDataPrefixoArquivoApresentacao_(value) {
  var parsed = atividades_parseDateOrNull_(value);
  if (!parsed) return '';
  return Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function atividades_buildPrefixosFotoApresentacao_(value) {
  var parsed = atividades_parseDateOrNull_(value);
  if (!parsed) return [];

  return [
    Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'dd-MM-yyyy'),
    Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'yyyy_MM_dd'),
    Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'dd_MM_yyyy'),
    Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'yyyy.MM.dd'),
    Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'dd.MM.yyyy'),
    Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'yyyyMMdd'),
    Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'ddMMyyyy')
  ].filter(function(prefixo, index, list) {
    return prefixo && list.indexOf(prefixo) === index;
  });
}

function atividades_getPastasFonteFotosApresentacoes_(record) {
  var folders = [];
  var seen = Object.create(null);

  function pushFolder(folder) {
    if (!folder) return;
    var id = String(folder.getId() || '').trim();
    if (!id || seen[id]) return;
    seen[id] = true;
    folders.push(folder);
  }

  pushFolder(atividades_tryGetPastaUploadFotosApresentacoes_());

  try {
    pushFolder(atividades_getPastaRaizApresentacoes_());
  } catch (ignoreErr) {
    // a raiz pode nao estar disponivel; seguimos com as demais fontes
  }

  try {
    pushFolder(atividades_getOuCriarPastaSemestreApresentacao_(record));
  } catch (ignoreErr2) {
    // o semestre pode nao estar resolvido; seguimos com as demais fontes
  }

  return folders;
}

function atividades_nomeArquivoCombinaComPrefixosFoto_(nomeArquivo, prefixos) {
  var nome = String(nomeArquivo || '').trim();
  if (!nome) return false;
  return (prefixos || []).some(function(prefixo) {
    return nome.indexOf(prefixo) === 0 || nome.indexOf(prefixo) >= 0;
  });
}

function atividades_listarFotosDaApresentacao_(record) {
  var prefixos = atividades_buildPrefixosFotoApresentacao_(record.DATA_ATIVIDADE);
  if (!prefixos.length) return [];

  var folders = atividades_getPastasFonteFotosApresentacoes_(record);
  if (!folders.length) {
    throw new Error(
      'Nao foi possivel localizar nenhuma pasta fonte para procurar fotos da apresentacao.'
    );
  }

  var fotos = [];
  var seen = Object.create(null);

  folders.forEach(function(folder) {
    var files = folder.getFiles();
    while (files.hasNext()) {
      var file = files.next();
      var fileId = String(file.getId() || '').trim();
      if (!fileId || seen[fileId]) continue;

      var nome = String(file.getName() || '');
      var mime = String(file.getMimeType() || '');
      var ehImagem = mime.indexOf('image/') === 0 || /\.(jpg|jpeg|png|webp)$/i.test(nome);
      if (!ehImagem) continue;

      if (!atividades_nomeArquivoCombinaComPrefixosFoto_(nome, prefixos)) continue;

      seen[fileId] = true;
      fotos.push(file);
    }
  });

  return fotos;
}

function atividades_moverArquivoParaPastaApresentacao_(file, folder) {
  try {
    file.moveTo(folder);
    return;
  } catch (err) {
    folder.addFile(file);
    var parents = file.getParents();
    while (parents.hasNext()) {
      var parent = parents.next();
      try {
        parent.removeFile(file);
      } catch (ignoreErr) {
        // ignora pasta sem permissao/remoção
      }
    }
  }
}

function atividades_getMotivoNaoElegivelFotosPendentesApresentacao_(item) {
  var record = item && item.record ? item.record : item;
  if (!record) return 'registro_ausente';
  if (!atividades_parseDateOrNull_(record.DATA_ATIVIDADE)) return 'sem_data_atividade';
  if (!atividades_temPastaFinalRegistradaApresentacao_(item)) return 'sem_pasta_final_registrada';
  return '';
}

function atividades_deveProcessarFotosPendentesApresentacao_(item) {
  return !atividades_getMotivoNaoElegivelFotosPendentesApresentacao_(item);
}

function atividades_processarFotosPendentesApresentacoes_(opts) {
  opts = opts || {};
  var processOutbox = opts.processOutbox !== false;
  var activityFilterSet = atividades_buildActivityFilterSet_(opts.activityIds);
  var counters = {
    eligible: 0,
    processed: 0,
    skipped: 0,
    movedFiles: 0,
    errors: 0
  };
  var details = [];
  var sourceFolders = [];
  var debug = [];

  function pushDebug(message) {
    var safe = String(message || '').trim();
    if (!safe) return;
    debug.push(safe);
    Logger.log('[atividades_fotos_pendentes] ' + safe);
  }

  try {
    var uploadFolder = atividades_tryGetPastaUploadFotosApresentacoes_();
    if (uploadFolder) {
      sourceFolders.push(uploadFolder.getId());
      pushDebug('Pasta de upload encontrada: ' + uploadFolder.getName() + ' (' + uploadFolder.getId() + ')');
    } else {
      pushDebug('Pasta de upload nao disponivel nesta execucao.');
    }
  } catch (err) {
    pushDebug('Erro ao resolver pasta de upload: ' + (err && err.message ? err.message : String(err)));
  }

  try {
    var rootFolder = atividades_getPastaRaizApresentacoes_();
    if (rootFolder) {
      sourceFolders.push(rootFolder.getId());
      pushDebug('Pasta raiz encontrada: ' + rootFolder.getName() + ' (' + rootFolder.getId() + ')');
    }
  } catch (err) {
    pushDebug('Erro ao resolver pasta raiz: ' + (err && err.message ? err.message : String(err)));
  }

  sourceFolders = sourceFolders.filter(function(folderId, index, list) {
    return folderId && list.indexOf(folderId) === index;
  });

  if (!sourceFolders.length) {
    pushDebug('Nenhuma pasta fonte disponivel para procurar fotos.');
    return {
      ok: false,
      counters: counters,
      details: [],
      debug: debug.slice(0, 50),
      reason: 'source_folders_unavailable',
      message: 'Nao foi possivel localizar pasta de upload nem pasta raiz das apresentacoes.',
      outbox: processOutbox ? atividades_processOutboxIfNeeded_([]) : null
    };
  }

  atividades_listApresentacaoRowsWithNumbers_().forEach(function(item) {
    var record = item.record;
    var activityId = String(record.ID_ATIVIDADE || '').trim();
    if (!atividades_activityPassesFilter_(activityId, activityFilterSet)) return;

    pushDebug(
      'Analisando linha ' + item.rowNumber +
      ' / atividade ' + (activityId || 'SEM_ID') +
      ' / membro ' + (String(record.NOME_MEMBRO || '').trim() || 'SEM_NOME')
    );

    var motivoNaoElegivel = atividades_getMotivoNaoElegivelFotosPendentesApresentacao_(item);
    if (motivoNaoElegivel) {
      counters.skipped++;
      pushDebug(
        'Linha ' + item.rowNumber + ' ignorada: ' + motivoNaoElegivel +
        ' | data=' + String(record.DATA_ATIVIDADE || '') +
        ' | link=' + String(atividades_getLinkArquivoDriveApresentacao_(item) || '')
      );
      details.push({
        rowNumber: item.rowNumber,
        idAtividade: activityId,
        action: 'skip',
        reason: motivoNaoElegivel
      });
      return;
    }

    counters.eligible++;

    try {
      var pastaFinal = atividades_getPastaFinalApresentacaoPorLink_(item);
      if (!pastaFinal) {
        counters.skipped++;
        pushDebug('Linha ' + item.rowNumber + ' sem pasta final resolvida pelo link salvo.');
        details.push({
          rowNumber: item.rowNumber,
          idAtividade: activityId,
          action: 'skip',
          reason: 'pasta_final_nao_encontrada'
        });
        return;
      }

      var fotos = atividades_listarFotosDaApresentacao_(record);
      if (!fotos.length) {
        counters.skipped++;
        pushDebug(
          'Linha ' + item.rowNumber + ' sem fotos encontradas. Prefixos testados: ' +
          atividades_buildPrefixosFotoApresentacao_(record.DATA_ATIVIDADE).join(', ')
        );
        details.push({
          rowNumber: item.rowNumber,
          idAtividade: activityId,
          action: 'skip',
          reason: 'sem_fotos_pendentes',
          datePrefixes: atividades_buildPrefixosFotoApresentacao_(record.DATA_ATIVIDADE).join(', ')
        });
        return;
      }

      var movidas = [];
      fotos.forEach(function(file) {
        atividades_moverArquivoParaPastaApresentacao_(file, pastaFinal);
        movidas.push({
          id: file.getId(),
          name: file.getName(),
          url: file.getUrl()
        });
      });

      pushDebug(
        'Linha ' + item.rowNumber + ' processada com sucesso. Pasta destino: ' +
        pastaFinal.getName() + ' | arquivos movidos: ' +
        movidas.map(function(itemMovido) { return itemMovido.name; }).join(', ')
      );

      counters.processed++;
      counters.movedFiles += movidas.length;
      details.push({
        rowNumber: item.rowNumber,
        idAtividade: activityId,
        action: 'processed',
        movedCount: movidas.length,
        folderUrl: pastaFinal.getUrl()
      });
    } catch (err) {
      counters.errors++;
      pushDebug(
        'Erro ao processar linha ' + item.rowNumber + ': ' +
        (err && err.message ? err.message : String(err))
      );
      details.push({
        rowNumber: item.rowNumber,
        idAtividade: activityId,
        action: 'error',
        message: err && err.message ? err.message : String(err)
      });
    }
  });

  atividades_logEvento_({
    TIPO_EVENTO_LOG: ATIVIDADES_CFG.APRESENTACOES_LOG_TYPES.FOTOS_PENDENTES_APRESENTACAO,
    STATUS: counters.errors ? 'ATENCAO' : 'OK',
    ACAO_EXECUTADA: 'Processar fotos pendentes das apresentacoes',
    RESULTADO:
      'eligible=' + counters.eligible +
      ' | processed=' + counters.processed +
      ' | skipped=' + counters.skipped +
      ' | moved=' + counters.movedFiles +
      ' | errors=' + counters.errors,
    OBSERVACOES: details.slice(0, 20).map(function(item) {
      return (item.idAtividade || ('LINHA_' + item.rowNumber)) + ':' + item.action;
    }).join(' | ') + (debug.length ? ' || ' + debug.slice(0, 10).join(' || ') : '')
  });

  return {
    ok: counters.errors === 0,
    counters: counters,
    details: details.slice(0, 20),
    debug: debug.slice(0, 50),
    sourceFolderIds: sourceFolders,
    outbox: processOutbox ? atividades_processOutboxIfNeeded_([]) : null
  };
}

function atividades_anexoEhArquivoApresentacao_(att) {
  if (!att) return false;
  var nome = String(att.getName() || '');
  var mime = String(att.getContentType() || '');
  if (/\.ics$/i.test(nome)) return false;
  if (mime.indexOf('image/') === 0) return false;
  return /\.pdf$/i.test(nome) || mime === 'application/pdf' || mime.indexOf('pdf') !== -1;
}

/**
 * Extrai IDs de arquivos do Google Drive presentes em textos ou HTML de mensagens.
 * @param {*} text Texto de origem.
 * @return {string[]} IDs unicos de arquivos do Drive.
 */
function atividades_extrairDriveFileIdsDeTexto_(text) {
  var raw = String(text || '');
  var ids = [];
  var seen = Object.create(null);
  var patterns = [
    /https?:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/g,
    /https?:\/\/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/g,
    /https?:\/\/drive\.google\.com\/uc\?[^ \n\r\t<>)]*id=([a-zA-Z0-9_-]+)/g
  ];

  patterns.forEach(function(pattern) {
    var match;
    while ((match = pattern.exec(raw)) !== null) {
      var id = String(match[1] || '').trim();
      if (!id || seen[id]) continue;
      seen[id] = true;
      ids.push(id);
    }
  });

  return ids;
}

/**
 * Monta o texto usado para procurar links do Drive combinando dados da Central e da mensagem Gmail.
 * @param {Object} eventRecord Registro da Central de Mensageria.
 * @param {GmailMessage=} msg Mensagem Gmail original, quando disponivel.
 * @return {string} Texto agregado para varredura.
 */
function atividades_getTextoMensagemParaDriveLinks_(eventRecord, msg) {
  var parts = [
    eventRecord && eventRecord.subject,
    eventRecord && eventRecord.snippet,
    eventRecord && eventRecord.plainBody
  ];

  if (msg) {
    try {
      parts.push(msg.getPlainBody());
    } catch (ignorePlainErr) {
      // segue com os demais campos
    }
    try {
      parts.push(msg.getBody());
    } catch (ignoreHtmlErr) {
      // segue com os demais campos
    }
  }

  return parts.join('\n');
}

/**
 * Verifica se um arquivo do Drive e um PDF aceitavel como arquivo de apresentacao.
 * @param {File} file Arquivo retornado pelo DriveApp.
 * @return {boolean} Verdadeiro quando nome ou MIME indicam PDF.
 */
function atividades_driveFileEhPdfApresentacao_(file) {
  if (!file) return false;
  var nome = String(file.getName() || '');
  var mime = String(file.getMimeType() || '');
  return /\.pdf$/i.test(nome) || mime === MimeType.PDF || mime === 'application/pdf' || mime.indexOf('pdf') !== -1;
}

/**
 * Resolve links do Drive encontrados na mensagem, separando PDFs validos de links invalidos.
 * @param {Object} eventRecord Registro da Central de Mensageria.
 * @param {GmailMessage=} msg Mensagem Gmail original, quando disponivel.
 * @return {{ids:string[], arquivos:File[], invalidos:Object[]}} Resultado da resolucao dos links.
 */
function atividades_resolverDrivePdfLinksArquivoApresentacao_(eventRecord, msg) {
  var text = atividades_getTextoMensagemParaDriveLinks_(eventRecord, msg);
  var ids = atividades_extrairDriveFileIdsDeTexto_(text);
  var arquivos = [];
  var invalidos = [];

  ids.forEach(function(fileId) {
    try {
      var file = DriveApp.getFileById(fileId);
      if (atividades_driveFileEhPdfApresentacao_(file)) {
        arquivos.push(file);
      } else {
        invalidos.push({
          id: fileId,
          name: String(file.getName() || '').trim(),
          mimeType: String(file.getMimeType() || '').trim(),
          reason: 'nao_pdf'
        });
      }
    } catch (err) {
      invalidos.push({
        id: fileId,
        reason: err && err.message ? err.message : String(err)
      });
    }
  });

  return {
    ids: ids,
    arquivos: arquivos,
    invalidos: invalidos
  };
}

/**
 * Copia o arquivo PDF compartilhado para a pasta final arquivada da apresentacao.
 * @param {File} file Arquivo original apontado pelo link do Drive.
 * @param {Folder} folder Pasta definitiva da apresentacao.
 * @return {File} Copia criada dentro da pasta definitiva.
 */
function atividades_copiarDriveFileParaPastaApresentacao_(file, folder) {
  var name = String(file.getName() || '').trim() || 'apresentacao.pdf';
  return file.makeCopy(name, folder);
}

function atividades_mensagemTemSomenteAnexoInvalido_(msg) {
  var anexos = msg.getAttachments({ includeInlineImages: false, includeAttachments: true }) || [];
  if (!anexos.length) return false;
  return anexos.filter(atividades_anexoEhArquivoApresentacao_).length === 0;
}

function atividades_salvarAnexoNaPasta_(att, folder) {
  var blob = att.copyBlob();
  blob.setName(att.getName());
  return folder.createFile(blob);
}

function atividades_marcarArquivoRecebidoApresentacao_(rowNumber, linkValue) {
  var sheet = atividades_getApresentacoesSheet_();
  var headerMap = GEAPA_CORE.coreHeaderMap(sheet, 1);
  GEAPA_CORE.coreWriteCellByHeader(sheet, rowNumber, headerMap, 'STATUS_ENVIO_ARQUIVO', 'RECEBIDO', { oneBased: true });
  GEAPA_CORE.coreWriteCellByHeader(sheet, rowNumber, headerMap, 'LINK_ARQUIVO_DRIVE', linkValue || '', { oneBased: true });
  GEAPA_CORE.coreWriteCellByHeader(sheet, rowNumber, headerMap, 'DATA_RECEBIMENTO_ARQUIVO', new Date(), { oneBased: true });
  if (GEAPA_CORE.coreGetCol(headerMap, 'ATUALIZADO_EM')) {
    GEAPA_CORE.coreWriteCellByHeader(sheet, rowNumber, headerMap, 'ATUALIZADO_EM', new Date(), { oneBased: true });
  }
}

function atividades_buildHtmlRespostaArquivoInvalido_(record) {
  var primeiroNome = atividades_getPrimeiroNome_(record.NOME_MEMBRO);
  var saudacao = primeiroNome ? ('Olá, ' + primeiroNome + ',') : 'Olá,';
  return [
    '<p>', saudacao, '</p>',
    '<p>Recebemos sua resposta, mas o arquivo enviado <b>não está em formato PDF</b>.</p>',
    '<p>Por favor, responda novamente este e-mail anexando a apresentação em <b>PDF</b>.</p>',
    '<p>Enquanto o arquivo em PDF não for recebido, o sistema continuará considerando a entrega como pendente.</p>',
    '<p>Atenciosamente,<br>Diretoria do GEAPA</p>'
  ].join('');
}

function atividades_buildHtmlRespostaArquivoRecebido_(record) {
  var primeiroNome = atividades_getPrimeiroNome_(record.NOME_MEMBRO);
  var saudacao = primeiroNome ? ('Olá, ' + primeiroNome + ',') : 'Olá,';
  var dataTxt = record.DATA_ATIVIDADE
    ? GEAPA_CORE.coreFormatDate(atividades_parseDateOrNull_(record.DATA_ATIVIDADE), Session.getScriptTimeZone(), ATIVIDADES_CFG.DATE_FORMAT)
    : '';
  return [
    '<p>', saudacao, '</p>',
    '<p>Recebemos com sucesso o arquivo em <b>PDF</b> da sua apresentação.</p>',
    '<p><b>Data da apresentação:</b> ', dataTxt || '—', '<br>',
    '<b>Título:</b> ', String(record.TITULO_APRESENTACAO || '').trim() || '—', '</p>',
    '<p>Sua apresentação já foi registrada corretamente no sistema.</p>',
    '<p>Obrigado pela colaboração.</p>',
    '<p>Atenciosamente,<br>Diretoria do GEAPA</p>'
  ].join('');
}

function atividades_responderArquivoInvalido_(thread, record, msg) {
  var subject = 'Re: ' + String((msg && msg.getSubject()) || ATIVIDADES_CFG.APRESENTACOES_POS_EVENTO.ARQUIVO_INBOX_SUBJECT);
  GEAPA_CORE.coreReplyThreadHtml(
    thread,
    subject,
    atividades_buildHtmlRespostaArquivoInvalido_(record),
    { body: 'Seu cliente de e-mail nao suporta HTML.' }
  );
}

function atividades_responderArquivoRecebidoComSucesso_(thread, record, msg) {
  var subject = 'Re: ' + String((msg && msg.getSubject()) || ATIVIDADES_CFG.APRESENTACOES_POS_EVENTO.ARQUIVO_INBOX_SUBJECT);
  GEAPA_CORE.coreReplyThreadHtml(
    thread,
    subject,
    atividades_buildHtmlRespostaArquivoRecebido_(record),
    { body: 'Seu cliente de e-mail nao suporta HTML.' }
  );
}

function atividades_marcarAnexosCoreIgnorados_(attachments, processorName, observations) {
  (attachments || []).forEach(function(item) {
    GEAPA_CORE.coreMailMarkAttachmentIgnored(
      item.attachmentId,
      processorName,
      observations
    );
  });
}

function atividades_marcarAnexosCoreSalvos_(attachments, processorName, folderUrl, arquivosSalvos) {
  (attachments || []).forEach(function(item, index) {
    var fileInfo = arquivosSalvos[index] || arquivosSalvos[0] || {};
    GEAPA_CORE.coreMailMarkAttachmentSavedToDrive(
      item.attachmentId,
      processorName,
      {
        driveFileId: String(fileInfo.id || '').trim(),
        driveFileUrl: String(fileInfo.url || '').trim(),
        driveFolder: String(folderUrl || '').trim(),
        observations: 'Arquivo de apresentacao salvo pelo modulo de atividades.'
      }
    );
  });
}

function atividades_getThreadByIdArquivoApresentacao_(threadId) {
  var normalized = String(threadId || '').trim();
  return normalized ? GmailApp.getThreadById(normalized) : null;
}

function atividades_getMessageFromThreadByIdArquivoApresentacao_(thread, messageId) {
  if (!thread) return null;
  var normalizedMessageId = String(messageId || '').trim();
  var messages = thread.getMessages() || [];

  for (var i = 0; i < messages.length; i++) {
    if (String(messages[i].getId() || '').trim() === normalizedMessageId) {
      return messages[i];
    }
  }

  return messages.length ? messages[messages.length - 1] : null;
}

/**
 * Processa um evento da Central cujo envio do arquivo veio por link do Drive.
 * @param {Object} eventRecord Registro pendente da Central de Mensageria.
 * @return {Object} Resultado do processamento para logs e consolidacao do job.
 */
function atividades_processarEventoDriveLinkArquivoApresentacoes_(eventRecord) {
  if (!eventRecord) {
    return { ok: false, action: 'skip', reason: 'evento_ausente' };
  }

  var item = atividades_encontrarLinhaPendenteArquivoPorCoreEvent_(eventRecord, []);
  if (!item) {
    return { ok: false, action: 'skip', reason: 'sem_linha_compativel' };
  }

  var thread = atividades_getThreadByIdArquivoApresentacao_(eventRecord.threadId);
  var message = atividades_getMessageFromThreadByIdArquivoApresentacao_(thread, eventRecord.messageId);
  var processorName = 'atividades_processarInboxArquivoApresentacoes_';
  var driveLinks = atividades_resolverDrivePdfLinksArquivoApresentacao_(eventRecord, message);

  if (driveLinks.arquivos.length) {
    var pastaFinal = atividades_getOuCriarPastaFinalApresentacao_(item.record);
    var arquivosSalvos = [];

    driveLinks.arquivos.forEach(function(file) {
      var saved = atividades_copiarDriveFileParaPastaApresentacao_(file, pastaFinal);
      arquivosSalvos.push({
        name: saved.getName(),
        id: saved.getId(),
        url: saved.getUrl(),
        sourceId: file.getId()
      });
    });

    atividades_marcarArquivoRecebidoApresentacao_(item.rowNumber, pastaFinal.getUrl());
    GEAPA_CORE.coreMailMarkEventProcessed(eventRecord.eventId, processorName);
    if (thread) {
      atividades_responderArquivoRecebidoComSucesso_(thread, item.record, message);
      atividades_marcarThreadArquivoProcessada_(thread);
    }

    return {
      ok: true,
      action: 'processed',
      mode: 'central_drive_link',
      rowNumber: item.rowNumber,
      idAtividade: String(item.record.ID_ATIVIDADE || '').trim(),
      folderUrl: pastaFinal.getUrl(),
      arquivosSalvos: arquivosSalvos
    };
  }

  if (driveLinks.ids.length) {
    GEAPA_CORE.coreMailMarkEventProcessed(eventRecord.eventId, processorName);
    if (thread) {
      atividades_responderArquivoInvalido_(thread, item.record, message);
      atividades_marcarThreadArquivoProcessada_(thread);
    }

    return {
      ok: false,
      action: 'skip',
      mode: 'central_drive_link',
      reason: 'drive_link_sem_pdf_valido',
      rowNumber: item.rowNumber,
      idAtividade: String(item.record.ID_ATIVIDADE || '').trim(),
      invalidos: driveLinks.invalidos
    };
  }

  return {
    ok: false,
    action: 'skip',
    mode: 'central_drive_link',
    reason: 'sem_drive_link'
  };
}

function atividades_processarEventoCentralArquivoApresentacoes_(eventBundle) {
  var eventRecord = eventBundle && eventBundle.event;
  var attachments = eventBundle && eventBundle.attachments;
  if (!eventRecord || !attachments || !attachments.length) {
    return { ok: false, action: 'skip', reason: 'evento_sem_anexos' };
  }

  var item = atividades_encontrarLinhaPendenteArquivoPorCoreEvent_(eventRecord, attachments);
  if (!item) {
    return { ok: false, action: 'skip', reason: 'sem_linha_compativel' };
  }

  var thread = atividades_getThreadByIdArquivoApresentacao_(eventRecord.threadId);
  var message = atividades_getMessageFromThreadByIdArquivoApresentacao_(thread, eventRecord.messageId);
  var processorName = 'atividades_processarInboxArquivoApresentacoes_';
  var resolved = [];

  attachments.forEach(function(itemAttachment) {
    resolved.push(GEAPA_CORE.coreMailGetAttachmentById(itemAttachment.attachmentId, { includeBlob: true }));
  });

  var anexosValidos = resolved.filter(function(itemResolved) {
    return atividades_anexoEhArquivoApresentacao_(itemResolved && itemResolved.attachment);
  });

  if (anexosValidos.length) {
    var pastaFinal = atividades_getOuCriarPastaFinalApresentacao_(item.record);
    var arquivosSalvos = [];

    anexosValidos.forEach(function(itemResolved) {
      var file = atividades_salvarAnexoNaPasta_(itemResolved.attachment, pastaFinal);
      arquivosSalvos.push({
        name: file.getName(),
        id: file.getId(),
        url: file.getUrl()
      });
    });

    atividades_marcarArquivoRecebidoApresentacao_(item.rowNumber, pastaFinal.getUrl());
    atividades_marcarAnexosCoreSalvos_(anexosValidos, processorName, pastaFinal.getUrl(), arquivosSalvos);

    var anexosInvalidos = resolved.filter(function(itemResolved) {
      return anexosValidos.indexOf(itemResolved) === -1;
    });
    if (anexosInvalidos.length) {
      atividades_marcarAnexosCoreIgnorados_(
        anexosInvalidos,
        processorName,
        'Anexo ignorado porque outro PDF valido da mesma mensagem ja foi tratado.'
      );
    }

    GEAPA_CORE.coreMailMarkEventProcessed(eventRecord.eventId, processorName);
    if (thread) {
      atividades_responderArquivoRecebidoComSucesso_(thread, item.record, message);
      atividades_marcarThreadArquivoProcessada_(thread);
    }

    return {
      ok: true,
      action: 'processed',
      mode: 'central',
      rowNumber: item.rowNumber,
      idAtividade: String(item.record.ID_ATIVIDADE || '').trim(),
      folderUrl: pastaFinal.getUrl(),
      arquivosSalvos: arquivosSalvos
    };
  }

  atividades_marcarAnexosCoreIgnorados_(
    resolved,
    processorName,
    'Mensagem recebida sem PDF valido para o fluxo de arquivo da apresentacao.'
  );
  GEAPA_CORE.coreMailMarkEventProcessed(eventRecord.eventId, processorName);
  if (thread) {
    atividades_responderArquivoInvalido_(thread, item.record, message);
    atividades_marcarThreadArquivoProcessada_(thread);
  }

  return {
    ok: false,
    action: 'skip',
    mode: 'central',
    reason: 'anexo_invalido_sem_pdf',
    rowNumber: item.rowNumber,
    idAtividade: String(item.record.ID_ATIVIDADE || '').trim()
  };
}

function atividades_processarThreadArquivoApresentacoes_(thread) {
  var messages = thread.getMessages();
  if (!messages.length) return { ok: false, action: 'skip', reason: 'thread_sem_mensagens' };

  for (var i = messages.length - 1; i >= 0; i--) {
    var msg = messages[i];
    var item = atividades_encontrarLinhaPendenteArquivoPorEmail_(msg.getFrom());
    if (!item) continue;

    var record = item.record;
    var dtSolic = atividades_parseDateOrNull_(record.DATA_SOLICITACAO_ARQUIVO);
    if (dtSolic && msg.getDate().getTime() < dtSolic.getTime()) continue;

    var anexos = msg.getAttachments({ includeInlineImages: false, includeAttachments: true }) || [];
    var anexosValidos = anexos.filter(atividades_anexoEhArquivoApresentacao_);

    if (anexosValidos.length > 0) {
      var pastaFinal = atividades_getOuCriarPastaFinalApresentacao_(record);
      var arquivosSalvos = [];
      anexosValidos.forEach(function(att) {
        var file = atividades_salvarAnexoNaPasta_(att, pastaFinal);
        arquivosSalvos.push({
          name: file.getName(),
          id: file.getId(),
          url: file.getUrl()
        });
      });

      atividades_marcarArquivoRecebidoApresentacao_(item.rowNumber, pastaFinal.getUrl());
      atividades_responderArquivoRecebidoComSucesso_(thread, record, msg);
      atividades_marcarThreadArquivoProcessada_(thread);

      return {
        ok: true,
        action: 'processed',
        rowNumber: item.rowNumber,
        idAtividade: String(record.ID_ATIVIDADE || '').trim(),
        folderUrl: pastaFinal.getUrl(),
        arquivosSalvos: arquivosSalvos
      };
    }

    var driveLinks = atividades_resolverDrivePdfLinksArquivoApresentacao_({
      subject: msg.getSubject(),
      snippet: '',
      plainBody: '',
      threadId: thread.getId(),
      messageId: msg.getId(),
      receivedAt: msg.getDate(),
      fromEmail: msg.getFrom()
    }, msg);

    if (driveLinks.arquivos.length > 0) {
      var pastaFinalDrive = atividades_getOuCriarPastaFinalApresentacao_(record);
      var arquivosDriveSalvos = [];
      driveLinks.arquivos.forEach(function(file) {
        var saved = atividades_copiarDriveFileParaPastaApresentacao_(file, pastaFinalDrive);
        arquivosDriveSalvos.push({
          name: saved.getName(),
          id: saved.getId(),
          url: saved.getUrl(),
          sourceId: file.getId()
        });
      });

      atividades_marcarArquivoRecebidoApresentacao_(item.rowNumber, pastaFinalDrive.getUrl());
      atividades_responderArquivoRecebidoComSucesso_(thread, record, msg);
      atividades_marcarThreadArquivoProcessada_(thread);

      return {
        ok: true,
        action: 'processed',
        mode: 'gmail_drive_link',
        rowNumber: item.rowNumber,
        idAtividade: String(record.ID_ATIVIDADE || '').trim(),
        folderUrl: pastaFinalDrive.getUrl(),
        arquivosSalvos: arquivosDriveSalvos
      };
    }

    if (driveLinks.ids.length) {
      atividades_responderArquivoInvalido_(thread, record, msg);
      atividades_marcarThreadArquivoProcessada_(thread);
      return {
        ok: false,
        action: 'skip',
        reason: 'drive_link_sem_pdf_valido',
        rowNumber: item.rowNumber,
        idAtividade: String(record.ID_ATIVIDADE || '').trim()
      };
    }

    if (atividades_mensagemTemSomenteAnexoInvalido_(msg)) {
      atividades_responderArquivoInvalido_(thread, record, msg);
      return {
        ok: false,
        action: 'skip',
        reason: 'anexo_invalido_sem_pdf',
        rowNumber: item.rowNumber,
        idAtividade: String(record.ID_ATIVIDADE || '').trim()
      };
    }
  }

  return {
    ok: false,
    action: 'skip',
    reason: 'sem_pdf_valido_ou_sem_linha_compativel'
  };
}

function atividades_processarInboxArquivoApresentacoes_(opts) {
  opts = opts || {};
  var allowGmailFallback = opts.allowGmailFallback === true;
  var ingestBeforeRead = opts.ingestBeforeRead !== false;
  var processed = [];
  var skipped = 0;
  var errors = [];
  var modeUsed = 'central';
  var ingestResult = null;

  if (ingestBeforeRead) {
    try {
      ingestResult = atividades_ingestirInboxArquivoApresentacoes_(opts);
    } catch (err) {
      errors.push('central_ingest_failed: ' + (err && err.message ? err.message : String(err)));
      ingestResult = null;
    }
  }

  var eventosPendentes = [];
  try {
    eventosPendentes = atividades_listarEventosPendentesArquivoApresentacoes_();
  } catch (err) {
    errors.push('central_list_failed: ' + (err && err.message ? err.message : String(err)));
    eventosPendentes = [];
  }

  eventosPendentes.forEach(function(eventBundle) {
    try {
      var result = atividades_processarEventoCentralArquivoApresentacoes_(eventBundle);
      if (result && result.action === 'processed') {
        processed.push(result);
      } else {
        skipped++;
      }
    } catch (err) {
      var eventId = eventBundle && eventBundle.event ? String(eventBundle.event.eventId || '').trim() : '';
      errors.push((eventId ? (eventId + ': ') : '') + (err && err.message ? err.message : String(err)));
    }
  });

  var eventosDriveLinkPendentes = [];
  try {
    eventosDriveLinkPendentes = atividades_listarEventosPendentesDriveLinkArquivoApresentacoes_();
  } catch (err) {
    errors.push('central_drive_link_list_failed: ' + (err && err.message ? err.message : String(err)));
    eventosDriveLinkPendentes = [];
  }

  eventosDriveLinkPendentes.forEach(function(eventRecord) {
    try {
      var result = atividades_processarEventoDriveLinkArquivoApresentacoes_(eventRecord);
      if (result && result.action === 'processed') {
        processed.push(result);
      } else {
        skipped++;
      }
    } catch (err) {
      var eventId = eventRecord ? String(eventRecord.eventId || '').trim() : '';
      errors.push((eventId ? (eventId + ': ') : '') + (err && err.message ? err.message : String(err)));
    }
  });

  var semCandidatosCentrais = !eventosPendentes.length && !eventosDriveLinkPendentes.length;

  if (!processed.length && semCandidatosCentrais && allowGmailFallback) {
    modeUsed = 'gmail_fallback';
    var threads = atividades_buscarThreadsArquivoApresentacoes_();

    threads.forEach(function(thread) {
      try {
        if (atividades_threadJaProcessadaArquivo_(thread)) {
          skipped++;
          return;
        }

        var result = atividades_processarThreadArquivoApresentacoes_(thread);
        if (result && result.action === 'processed') {
          processed.push(result);
        } else {
          skipped++;
        }
      } catch (err) {
        errors.push(err && err.message ? err.message : String(err));
      }
    });
  }

  if (!processed.length && semCandidatosCentrais && !allowGmailFallback) {
    modeUsed = 'central_only';
  }

  if (processed.length || errors.length) {
    atividades_logEvento_({
      TIPO_EVENTO_LOG: ATIVIDADES_CFG.APRESENTACOES_LOG_TYPES.INBOX_ARQUIVO_APRESENTACAO,
      STATUS: errors.length ? 'ATENCAO' : 'OK',
      ACAO_EXECUTADA: 'Processar respostas com arquivo em PDF das apresentações',
      RESULTADO: 'mode=' + modeUsed + ' | processed=' + processed.length + ' | skipped=' + skipped + ' | errors=' + errors.length,
      OBSERVACOES: processed.slice(0, 10).map(function(item) {
        return item.idAtividade + ':' + item.folderUrl;
      }).join(' | ')
    });
  }

  if (!processed.length && !errors.length) {
    atividades_logEvento_({
      TIPO_EVENTO_LOG: ATIVIDADES_CFG.APRESENTACOES_LOG_TYPES.INBOX_ARQUIVO_APRESENTACAO,
      STATUS: 'OK',
      ACAO_EXECUTADA: 'Verificar respostas com arquivo em PDF das apresentações',
      RESULTADO: 'mode=' + modeUsed + ' | processed=0 | skipped=' + skipped + ' | errors=0',
      OBSERVACOES: modeUsed === 'central'
        ? 'Nenhum evento pendente com anexo compatível foi processado nesta execução.'
        : modeUsed === 'central_only'
          ? 'Nenhum evento pendente com anexo compatível foi encontrado. O fallback direto no Gmail foi desabilitado nesta execução para preservar a cota diária.'
        : 'Nenhuma thread compatível foi processada nesta execução.'
    });
  }

  return {
    ok: errors.length === 0,
    ingestResult: ingestResult,
    modeUsed: modeUsed,
    processedCount: processed.length,
    skippedCount: skipped,
    errorCount: errors.length,
    processed: processed,
    errors: errors
  };
}
