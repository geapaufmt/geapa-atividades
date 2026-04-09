function atividades_buildFaltaNotificationCorrelationKey_(periodCode, codigoAtividade, rga) {
  return [
    'AFL',
    atividades_normalizeTextUpper_(codigoAtividade).replace(/[^\w]+/g, '_'),
    atividades_normalizeTextUpper_(rga).replace(/[^\w]+/g, '_')
  ].join('-');
}

function atividades_buildResultadoJustificativaCorrelationKey_(periodCode, codigoAtividade, rga, statusAnalise) {
  var statusToken = atividades_normalizeTextUpper_(statusAnalise).slice(0, 3) || 'RES';
  return [
    'AJR',
    atividades_normalizeTextUpper_(codigoAtividade).replace(/[^\w]+/g, '_'),
    atividades_normalizeTextUpper_(rga).replace(/[^\w]+/g, '_'),
    statusToken
  ].join('-');
}

function atividades_formatDateTimeHuman_(dateValue) {
  var parsed = atividades_parseDateOrNull_(dateValue);
  if (!parsed) return '';
  return Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
}

function atividades_buildFaltaNotificationPayload_(activityInfo, presenceRecord) {
  var deadline = atividades_calculateJustificativaDeadline_(activityInfo);
  return {
    subtitle: 'Fluxo oficial de justificativa de faltas',
    introText: 'Foi registrada uma ausência sua em atividade do GEAPA que conta falta oficial. Caso deseje apresentar justificativa, utilize o formulário oficial dentro do prazo informado abaixo.',
    blocks: [
      {
        title: 'Atividade',
        items: [
          { label: 'Código da atividade', value: activityInfo.codigoAtividade },
          { label: 'Título', value: activityInfo.titulo || '-' },
          { label: 'Data', value: activityInfo.dataAtividade ? GEAPA_CORE.coreFormatDate(activityInfo.dataAtividade, Session.getScriptTimeZone(), ATIVIDADES_CFG.DATE_FORMAT) : '-' }
        ]
      },
      {
        title: 'Prazo e orientação',
        items: [
          { label: 'Prazo para justificativa', value: deadline ? atividades_formatDateTimeHuman_(deadline) : '48 horas após a atividade' },
          { label: 'RGA', value: String(presenceRecord.RGA || '').trim() },
          { label: 'Canal oficial', value: 'Formulário de justificativa do GEAPA' }
        ]
      },
      {
        title: 'Importante',
        text: 'A justificativa será analisada manualmente pela diretoria/secretaria. O formulário usa o CODIGO_ATIVIDADE como chave principal para localizar a atividade no período.'
      }
    ],
    cta: {
      label: 'Abrir formulário oficial',
      url: ATIVIDADES_CFG.JUSTIFICATIVA_FORM_URL,
      helper: 'Tenha em mãos o CODIGO_ATIVIDADE informado acima.'
    },
    footerNote: 'Este aviso não substitui a análise administrativa da justificativa.'
  };
}

function atividades_buildResultadoJustificativaPayload_(record) {
  var statusAnalise = atividades_normalizeTextUpper_(record.STATUS_ANALISE);
  var isDeferida = statusAnalise === 'DEFERIDA';
  var decisao = String(record.DECISAO_APLICADA_NA_PRESENCA || '').trim() || (isDeferida ? 'F_PARA_J' : 'F_MANTIDA');
  var resultadoHumano = isDeferida ? 'Deferida' : 'Indeferida';
  var reflexoHumano = decisao === 'J_PARA_A'
    ? 'A falta justificada foi convertida para abonada (A).'
    : decisao === 'F_PARA_J'
      ? 'A falta foi convertida para justificada (J).'
      : 'A falta foi mantida como F.';

  return {
    subtitle: 'Resultado da análise de justificativa',
    introText: isDeferida
      ? 'Sua justificativa de falta foi analisada e deferida pela diretoria/secretaria do GEAPA.'
      : 'Sua justificativa de falta foi analisada e indeferida pela diretoria/secretaria do GEAPA.',
    blocks: [
      {
        title: 'Atividade',
        items: [
          { label: 'Código da atividade', value: String(record.CODIGO_ATIVIDADE || '').trim() },
          { label: 'Título', value: String(record.TITULO_ATIVIDADE || '').trim() || '-' },
          { label: 'Data', value: record.DATA_ATIVIDADE ? GEAPA_CORE.coreFormatDate(atividades_parseDateOrNull_(record.DATA_ATIVIDADE), Session.getScriptTimeZone(), ATIVIDADES_CFG.DATE_FORMAT) : '-' }
        ]
      },
      {
        title: 'Resultado',
        items: [
          { label: 'Status da análise', value: resultadoHumano },
          { label: 'Reflexo na presença', value: reflexoHumano },
          { label: 'Analisado por', value: String(record.ANALISADO_POR || '').trim() || '-' }
        ]
      }
    ],
    footerNote: 'Em caso de dúvida, consulte a diretoria/secretaria do GEAPA pelos canais institucionais.'
  };
}

function atividades_notificarResultadoJustificativa_(record, opts) {
  opts = opts || {};
  var statusAnalise = atividades_normalizeTextUpper_(record.STATUS_ANALISE);
  if (statusAnalise !== 'DEFERIDA' && statusAnalise !== 'INDEFERIDA') {
    return { ok: true, queued: false, reason: 'analysis_not_final' };
  }

  var email = String(record.EMAIL || '').trim();
  if (!GEAPA_CORE.coreIsValidEmail(email)) {
    return { ok: true, queued: false, reason: 'invalid_email' };
  }

  var correlationKey = atividades_buildResultadoJustificativaCorrelationKey_(
    record.PERIODO,
    record.CODIGO_ATIVIDADE,
    record.RGA,
    statusAnalise
  );

  var queueResult = GEAPA_CORE.coreMailQueueOutgoing({
    moduleName: ATIVIDADES_CFG.MODULE_CODE,
    templateKey: 'GEAPA_OPERACIONAL',
    correlationKey: correlationKey,
    entityType: 'MEMBRO',
    entityId: String(record.RGA || '').trim(),
    flowCode: 'JUST',
    stage: statusAnalise,
    to: email,
    recipientName: String(record.NOME_MEMBRO || '').trim(),
    subjectHuman: 'Resultado da justificativa de falta no GEAPA',
    payload: atividades_buildResultadoJustificativaPayload_(record),
    metadata: {
      source: 'geapa-atividades',
      periodCode: String(record.PERIODO || '').trim(),
      codigoAtividade: String(record.CODIGO_ATIVIDADE || '').trim(),
      rga: String(record.RGA || '').trim(),
      statusAnalise: statusAnalise
    }
  });

  if (queueResult && queueResult.queued) {
    atividades_logEvento_({
      TIPO_EVENTO_LOG: ATIVIDADES_CFG.JUSTIFICATIVAS_LOG_TYPES.RESULTADO_JUSTIFICATIVA,
      STATUS: 'OK',
      ACAO_EXECUTADA: 'Enfileirar e-mail com resultado da justificativa',
      RESULTADO: correlationKey,
      OBSERVACOES: 'RGA=' + record.RGA + ' | CODIGO_ATIVIDADE=' + record.CODIGO_ATIVIDADE + ' | STATUS=' + statusAnalise
    });
  }

  if (opts.processOutbox === false) {
    return Object.assign({ correlationKey: correlationKey }, queueResult || { ok: true, queued: false });
  }

  return {
    queue: Object.assign({ correlationKey: correlationKey }, queueResult || { ok: true, queued: false }),
    outbox: GEAPA_CORE.coreMailProcessOutbox()
  };
}

function atividades_notificarFaltasPendentes_() {
  atividades_garantirEstruturasFixasV1_();

  var importResult = atividades_importarJustificativasFaltas_();
  var activityLookup = atividades_buildCurrentPeriodActivityLookup_();
  var presenceState = atividades_buildCurrentPresenceState_();
  var justificativasState = atividades_readJustificativasState_();
  var queued = [];
  var duplicates = 0;
  var skipped = [];

  Object.keys(activityLookup.byCode).sort().forEach(function(codigoAtividade) {
    var activityInfo = activityLookup.byCode[codigoAtividade];
    if (!activityInfo || !activityInfo.contaFalta || !activityInfo.colunaPresenca) return;

    Object.keys(presenceState.byRga).sort().forEach(function(rga) {
      var presenceItem = presenceState.byRga[rga];
      var presenceRecord = presenceItem.record || {};
      var currentValue = atividades_normalizeTextUpper_(presenceRecord[activityInfo.colunaPresenca]);

      if (currentValue !== 'F') return;
      if (!atividades_isMemberApplicableForActivityDate_(presenceRecord, activityInfo.dataAtividade)) return;

      var key = atividades_buildJustificativaKey_(activityLookup.ctx.code, codigoAtividade, rga);
      if (justificativasState.byKey[key]) {
        skipped.push({ rga: rga, codigoAtividade: codigoAtividade, reason: 'justificativa_ja_registrada' });
        return;
      }

      var email = String(presenceRecord.EMAIL || '').trim();
      if (!GEAPA_CORE.coreIsValidEmail(email)) {
        skipped.push({ rga: rga, codigoAtividade: codigoAtividade, reason: 'email_invalido' });
        return;
      }

      var correlationKey = atividades_buildFaltaNotificationCorrelationKey_(activityLookup.ctx.code, codigoAtividade, rga);
      var queueResult = GEAPA_CORE.coreMailQueueOutgoing({
        moduleName: ATIVIDADES_CFG.MODULE_CODE,
        templateKey: 'GEAPA_OPERACIONAL',
        correlationKey: correlationKey,
        entityType: 'MEMBRO',
        entityId: rga,
        flowCode: 'FALTA',
        stage: 'AVISO',
        to: email,
        recipientName: String(presenceRecord.NOME_MEMBRO || '').trim(),
        subjectHuman: 'Falta registrada em atividade do GEAPA',
        payload: atividades_buildFaltaNotificationPayload_(activityInfo, presenceRecord),
        metadata: {
          source: 'geapa-atividades',
          periodCode: activityLookup.ctx.code,
          codigoAtividade: codigoAtividade,
          rga: rga
        }
      });

      if (queueResult && queueResult.duplicate) {
        duplicates++;
        return;
      }

      if (queueResult && queueResult.queued) {
        queued.push({
          rga: rga,
          codigoAtividade: codigoAtividade,
          correlationKey: correlationKey,
          saidaId: queueResult.saidaId || ''
        });

        atividades_logEvento_({
          TIPO_EVENTO_LOG: ATIVIDADES_CFG.JUSTIFICATIVAS_LOG_TYPES.AVISO_FALTA,
          STATUS: 'OK',
          ACAO_EXECUTADA: 'Enfileirar aviso automatico de falta',
          RESULTADO: correlationKey,
          OBSERVACOES: 'RGA=' + rga + ' | CODIGO_ATIVIDADE=' + codigoAtividade + ' | saidaId=' + (queueResult.saidaId || '')
        });
      }
    });
  });

  var outboxResult = queued.length ? GEAPA_CORE.coreMailProcessOutbox() : {
    ok: true,
    processed: 0
  };

  return {
    ok: true,
    periodCode: activityLookup.ctx.code,
    imported: importResult,
    queued: queued.length,
    duplicates: duplicates,
    skipped: skipped,
    outbox: outboxResult
  };
}
