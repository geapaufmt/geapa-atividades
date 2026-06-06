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
          { label: 'ID da atividade', value: activityInfo.idAtividade || '-' },
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

function atividades_justificativaAindaNoPrazo_(activityInfo, refDate) {
  var deadline = atividades_calculateJustificativaDeadline_(activityInfo);
  if (!deadline) return false;
  var now = atividades_parseDateOrNull_(refDate) || new Date();
  return now.getTime() <= deadline.getTime();
}

function atividades_buildAvisosFaltaJaRegistradosSet_() {
  var set = Object.create(null);
  GEAPA_CORE.coreReadSheetRecords(atividades_getLogSheet_(), {
    headerRow: 1
  }).forEach(function(record) {
    if (String(record.TIPO_EVENTO_LOG || '').trim() !== ATIVIDADES_CFG.JUSTIFICATIVAS_LOG_TYPES.AVISO_FALTA) return;
    var key = String(record.RESULTADO || '').trim();
    if (!key) return;
    set[key] = true;
  });
  return set;
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

function atividades_buildFaltasPendentesFilterSet_(values) {
  if (!Array.isArray(values) || !values.length) return null;
  var set = Object.create(null);
  values.forEach(function(value) {
    var normalized = String(value || '').trim();
    if (normalized) set[normalized] = true;
  });
  return Object.keys(set).length ? set : null;
}

function atividades_notificarFaltasPendentes_(opts) {
  opts = opts || {};
  atividades_garantirEstruturasFixasV1_();

  var importResult = atividades_importarJustificativasFaltas_();
  var activityLookup = atividades_buildCurrentPeriodActivityLookup_();
  var presenceState = atividades_buildCurrentPresenceState_();
  var previaPromoteResult = atividades_promoverJustificativasPreviasParaPendentes_(activityLookup, presenceState);
  var justificativasState = atividades_readJustificativasState_();
  // A fila central e a fonte de verdade para deduplicacao de e-mails.
  // Atividades_Log e apenas auditoria e nao deve bloquear reprocessamentos.
  var avisosJaRegistrados = Object.create(null);
  var activityFilterSet = atividades_buildFaltasPendentesFilterSet_(opts.activityIds);
  var codigoFilterSet = atividades_buildFaltasPendentesFilterSet_(opts.codigoAtividades);
  var queued = [];
  var duplicates = 0;
  var deferred = 0;
  var errors = 0;
  var skipped = [];
  var warnings = [];

  Object.keys(activityLookup.byCode).sort().forEach(function(codigoAtividade) {
    var activityInfo = activityLookup.byCode[codigoAtividade];
    if (codigoFilterSet && !codigoFilterSet[codigoAtividade]) return;
    if (activityFilterSet && !activityFilterSet[String(activityInfo && activityInfo.idAtividade || '').trim()]) return;
    if (!activityInfo || !activityInfo.contaFalta || !activityInfo.colunaPresenca) return;
    if (!atividades_justificativaAindaNoPrazo_(activityInfo, new Date())) {
      skipped.push({ codigoAtividade: codigoAtividade, reason: 'fora_do_prazo_de_justificativa' });
      return;
    }

    Object.keys(presenceState.byRga).sort().forEach(function(rga) {
      var presenceItem = presenceState.byRga[rga];
      var presenceRecord = presenceItem.record || {};
      var currentValue = atividades_normalizeTextUpper_(presenceRecord[activityInfo.colunaPresenca]);

      if (currentValue !== 'F') return;
      if (!atividades_isMemberApplicableForActivityDate_(presenceRecord, activityInfo.dataAtividade)) return;

      var key = atividades_buildJustificativaKey_(activityLookup.ctx.code, codigoAtividade, rga);
      if (justificativasState.byKey[key]) {
        var justificativaExistente = justificativasState.byKey[key].record || {};
        var justificativaTemporalmenteValida = !atividades_justificativaRecordPreviaForaDaJanela_(justificativaExistente, activityInfo);
        if (!justificativaTemporalmenteValida) {
          warnings.push({
            rga: rga,
            codigoAtividade: codigoAtividade,
            idAtividade: activityInfo.idAtividade,
            reason: 'justificativa_previa_fora_da_janela_ignorada',
            idJustificativa: String(justificativaExistente.ID_JUSTIFICATIVA || '').trim(),
            statusAnalise: String(justificativaExistente.STATUS_ANALISE || '').trim(),
            dataEnvio: String(justificativaExistente.DATA_ENVIO || '').trim()
          });
        } else {
          skipped.push({
            rga: rga,
            codigoAtividade: codigoAtividade,
            idAtividade: activityInfo.idAtividade,
            reason: 'justificativa_ja_registrada',
            idJustificativa: String(justificativaExistente.ID_JUSTIFICATIVA || '').trim(),
            statusAnalise: String(justificativaExistente.STATUS_ANALISE || '').trim(),
            dataEnvio: String(justificativaExistente.DATA_ENVIO || '').trim()
          });
          return;
        }
      }

      var email = String(presenceRecord.EMAIL || '').trim();
      if (!GEAPA_CORE.coreIsValidEmail(email)) {
        skipped.push({ rga: rga, codigoAtividade: codigoAtividade, idAtividade: activityInfo.idAtividade, reason: 'email_invalido' });
        return;
      }

      var correlationKey = atividades_buildFaltaNotificationCorrelationKey_(activityLookup.ctx.code, codigoAtividade, rga);
      if (avisosJaRegistrados[correlationKey]) {
        skipped.push({ rga: rga, codigoAtividade: codigoAtividade, idAtividade: activityInfo.idAtividade, reason: 'aviso_ja_registrado' });
        return;
      }

      var queueResult;
      try {
        queueResult = atividades_tryQueueOutgoing_({
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
            idAtividade: String(activityInfo.idAtividade || '').trim(),
            colunaPresenca: String(activityInfo.colunaPresenca || '').trim(),
            rga: rga
          }
        });
      } catch (err) {
        errors++;
        skipped.push({
          rga: rga,
          codigoAtividade: codigoAtividade,
          idAtividade: activityInfo.idAtividade,
          reason: 'erro_fila_central',
          message: err && err.message ? err.message : String(err)
        });
        return;
      }

      if (queueResult && queueResult.duplicate) {
        duplicates++;
        avisosJaRegistrados[correlationKey] = true;
        return;
      }

      if (queueResult && queueResult.locked) {
        deferred++;
        skipped.push({ rga: rga, codigoAtividade: codigoAtividade, idAtividade: activityInfo.idAtividade, reason: 'fila_central_ocupada' });
        return;
      }

      if (queueResult && queueResult.queued) {
        queued.push({
          rga: rga,
          codigoAtividade: codigoAtividade,
          idAtividade: activityInfo.idAtividade,
          correlationKey: correlationKey,
          saidaId: queueResult.saidaId || ''
        });

        atividades_logEvento_({
          TIPO_EVENTO_LOG: ATIVIDADES_CFG.JUSTIFICATIVAS_LOG_TYPES.AVISO_FALTA,
          STATUS: 'OK',
          ACAO_EXECUTADA: 'Enfileirar aviso automatico de falta',
          RESULTADO: correlationKey,
          OBSERVACOES: 'RGA=' + rga +
            ' | CODIGO_ATIVIDADE=' + codigoAtividade +
            ' | ID_ATIVIDADE=' + (activityInfo.idAtividade || '') +
            ' | COLUNA_PRESENCA=' + (activityInfo.colunaPresenca || '') +
            ' | saidaId=' + (queueResult.saidaId || '')
        });
        avisosJaRegistrados[correlationKey] = true;
        return;
      }

      skipped.push({ rga: rga, codigoAtividade: codigoAtividade, idAtividade: activityInfo.idAtividade, reason: 'fila_nao_enfileirou' });
    });
  });

  if (deferred || errors || skipped.length || warnings.length) {
    atividades_logEvento_({
      TIPO_EVENTO_LOG: ATIVIDADES_CFG.JUSTIFICATIVAS_LOG_TYPES.AVISO_FALTA,
      STATUS: errors ? 'ERRO' : 'ATENCAO',
      ACAO_EXECUTADA: 'Auditar avisos automaticos de falta e justificativas ignoradas',
      RESULTADO: 'skipped=' + skipped.length + ' | warnings=' + warnings.length + ' | deferred=' + deferred + ' | errors=' + errors,
      OBSERVACOES: skipped.concat(warnings).slice(0, 30).map(function(item) {
        return (item.rga || 'SEM_RGA') +
          ':' + (item.codigoAtividade || 'SEM_CODIGO') +
          ':' + (item.idAtividade || 'SEM_ID') +
          ':' + item.reason +
          (item.idJustificativa ? ':JUS=' + item.idJustificativa : '') +
          (item.statusAnalise ? ':STATUS=' + item.statusAnalise : '');
      }).join(' | ')
    });
  }

  var outboxResult = opts.processOutbox === false ? {
    ok: true,
    skipped: true,
    reason: 'process_outbox_disabled'
  } : queued.length ? GEAPA_CORE.coreMailProcessOutbox() : {
    ok: true,
    processed: 0
  };

  return {
    ok: true,
    periodCode: activityLookup.ctx.code,
    imported: importResult,
    queued: queued.length,
    queuedCount: queued.length,
    duplicates: duplicates,
    duplicateCount: duplicates,
    deferred: deferred,
    deferredCount: deferred,
    errors: errors,
    errorCount: errors,
    skipped: skipped,
    warnings: warnings,
    previaPromoteResult: previaPromoteResult,
    outbox: outboxResult
  };
}

function atividades_diagnosticarFaltasPendentes_(opts) {
  opts = opts || {};
  atividades_garantirEstruturasFixasV1_();

  var activityLookup = atividades_buildCurrentPeriodActivityLookup_();
  var presenceState = atividades_buildCurrentPresenceState_();
  var justificativasState = atividades_readJustificativasState_();
  var avisosJaRegistrados = atividades_buildAvisosFaltaJaRegistradosSet_();
  var activityFilterSet = atividades_buildFaltasPendentesFilterSet_(opts.activityIds);
  var codigoFilterSet = atividades_buildFaltasPendentesFilterSet_(opts.codigoAtividades);
  var rows = [];
  var counters = {
    activities: 0,
    faltas: 0,
    elegiveis: 0,
    blocked: 0
  };

  Object.keys(activityLookup.byCode).sort().forEach(function(codigoAtividade) {
    var activityInfo = activityLookup.byCode[codigoAtividade];
    if (codigoFilterSet && !codigoFilterSet[codigoAtividade]) return;
    if (activityFilterSet && !activityFilterSet[String(activityInfo && activityInfo.idAtividade || '').trim()]) return;
    if (!activityInfo || !activityInfo.contaFalta || !activityInfo.colunaPresenca) return;
    counters.activities++;

    Object.keys(presenceState.byRga).sort().forEach(function(rga) {
      var presenceItem = presenceState.byRga[rga];
      var presenceRecord = presenceItem.record || {};
      var currentValue = atividades_normalizeTextUpper_(presenceRecord[activityInfo.colunaPresenca]);
      if (currentValue !== 'F') return;

      counters.faltas++;
      var key = atividades_buildJustificativaKey_(activityLookup.ctx.code, codigoAtividade, rga);
      var correlationKey = atividades_buildFaltaNotificationCorrelationKey_(activityLookup.ctx.code, codigoAtividade, rga);
      var email = String(presenceRecord.EMAIL || '').trim();
      var reasons = [];

      if (!atividades_justificativaAindaNoPrazo_(activityInfo, new Date())) reasons.push('fora_do_prazo_de_justificativa');
      if (!atividades_isMemberApplicableForActivityDate_(presenceRecord, activityInfo.dataAtividade)) reasons.push('membro_nao_aplicavel_na_data');
      var justificativaExistente = justificativasState.byKey[key] ? justificativasState.byKey[key].record || {} : null;
      var justificativaTemporalmenteValida = justificativaExistente
        ? !atividades_justificativaRecordPreviaForaDaJanela_(justificativaExistente, activityInfo)
        : false;
      if (justificativaExistente && justificativaTemporalmenteValida) reasons.push('justificativa_ja_registrada');
      if (!GEAPA_CORE.coreIsValidEmail(email)) reasons.push('email_invalido');
      var avisoRegistradoEmLog = !!avisosJaRegistrados[correlationKey];

      if (reasons.length) {
        counters.blocked++;
      } else {
        counters.elegiveis++;
      }

      rows.push({
        codigoAtividade: codigoAtividade,
        idAtividade: activityInfo.idAtividade,
        colunaPresenca: activityInfo.colunaPresenca,
        rga: rga,
        nome: String(presenceRecord.NOME_MEMBRO || '').trim(),
        email: email,
        valorPresenca: currentValue,
        correlationKey: correlationKey,
        elegivel: reasons.length ? 'NAO' : 'SIM',
        reasons: reasons,
        warnings: []
          .concat(justificativaExistente && !justificativaTemporalmenteValida ? ['justificativa_previa_fora_da_janela_ignorada'] : [])
          .concat(avisoRegistradoEmLog ? ['aviso_registrado_apenas_em_log'] : []),
        justificativa: justificativaExistente ? {
          idJustificativa: String(justificativaExistente.ID_JUSTIFICATIVA || '').trim(),
          statusAnalise: String(justificativaExistente.STATUS_ANALISE || '').trim(),
          dataEnvio: String(justificativaExistente.DATA_ENVIO || '').trim(),
          decisaoAplicada: String(justificativaExistente.DECISAO_APLICADA_NA_PRESENCA || '').trim()
        } : null
      });
    });
  });

  return {
    ok: true,
    periodCode: activityLookup.ctx.code,
    counters: counters,
    rows: rows
  };
}

function atividades_reenviarAvisosFaltasPendentes_() {
  return atividades_notificarFaltasPendentes_({
    ignoreRegisteredLogs: true
  });
}
