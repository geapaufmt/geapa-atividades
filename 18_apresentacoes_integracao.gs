function atividades_extractApresentacaoIdNumber_(value) {
  var text = String(value || '').trim().toUpperCase();
  var match = text.match(/^APR-(\d+)$/);
  return match ? Number(match[1]) : 0;
}

function atividades_getPrimeiroNome_(nomeCompleto) {
  return String(nomeCompleto || '').trim().split(/\s+/).filter(Boolean)[0] || '';
}

function atividades_buildInviteLinkForPresentation_(record) {
  var activityId = String(record.ID_ATIVIDADE || '').trim();
  if (!activityId) return '';
  return 'https://calendar.google.com/calendar/u/0/r/search?q=' + encodeURIComponent(activityId);
}

function atividades_preencherIdentificacaoApresentacaoLinha_(rowNumber) {
  var sheet = atividades_getApresentacoesSheet_();
  var result = GEAPA_CORE.coreAutofillIdentityRowInSheet(sheet, rowNumber, {
    nameHeaders: ['NOME_MEMBRO'],
    rgaHeaders: ['RGA'],
    emailHeaders: ['EMAIL_MEMBRO']
  });

  if (result && result.ok && result.updated && result.updated.length) {
    var headerMap = GEAPA_CORE.coreHeaderMap(sheet, 1);
    if (GEAPA_CORE.coreGetCol(headerMap, 'ATUALIZADO_EM')) {
      GEAPA_CORE.coreWriteCellByHeader(sheet, rowNumber, headerMap, 'ATUALIZADO_EM', new Date(), {
        oneBased: true
      });
    }
  }

  return result;
}

function atividades_autofillIdentificacaoApresentacoesEmLote_(opts) {
  opts = opts || {};
  var items = atividades_listApresentacaoRowsWithNumbers_();
  var rowFilter = Array.isArray(opts.rowNumbers) && opts.rowNumbers.length
    ? opts.rowNumbers.reduce(function(map, value) {
        var rowNumber = Number(value);
        if (rowNumber > 1) map[rowNumber] = true;
        return map;
      }, Object.create(null))
    : null;

  var summary = {
    ok: true,
    scanned: 0,
    updatedRows: 0,
    unchangedRows: 0,
    errors: 0,
    details: []
  };

  items.forEach(function(item) {
    if (rowFilter && !rowFilter[item.rowNumber]) return;
    summary.scanned += 1;

    try {
      var result = atividades_preencherIdentificacaoApresentacaoLinha_(item.rowNumber);
      var changed = !!(result && result.ok && result.updated && result.updated.length);
      if (changed) {
        summary.updatedRows += 1;
      } else {
        summary.unchangedRows += 1;
      }
      summary.details.push({
        rowNumber: item.rowNumber,
        changed: changed,
        updated: result && result.updated ? result.updated.slice() : []
      });
    } catch (err) {
      summary.ok = false;
      summary.errors += 1;
      summary.details.push({
        rowNumber: item.rowNumber,
        changed: false,
        error: err && err.message ? err.message : String(err)
      });
    }
  });

  return summary;
}

function atividades_buildApresentacaoIdFromNumber_(numberValue) {
  return ATIVIDADES_CFG.APRESENTACAO_ID_PREFIX +
    atividades_padLeftNumber_(numberValue, ATIVIDADES_CFG.APRESENTACAO_ID_PAD_LENGTH);
}

function atividades_getNextApresentacaoId_() {
  var records = GEAPA_CORE.coreReadSheetRecords(atividades_getApresentacoesSheet_(), {
    headerRow: 1
  });
  var numbers = records.map(function(record) {
    return atividades_extractApresentacaoIdNumber_(record.ID_APRESENTACAO);
  }).filter(function(numberValue) {
    return numberValue > 0;
  });
  var nextNumber = numbers.length ? Math.max.apply(null, numbers) + 1 : 1;
  return atividades_buildApresentacaoIdFromNumber_(nextNumber);
}

function atividades_listActivityRowsWithNumbers_() {
  var sheet = atividades_getAtividadesSheet_();
  var lastCol = sheet.getLastColumn();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  return values.map(function(row, index) {
    return {
      rowNumber: index + 2,
      record: GEAPA_CORE.coreRowToObject(headers, row)
    };
  });
}

function atividades_listApresentacaoRowsWithNumbers_() {
  var sheet = atividades_getApresentacoesSheet_();
  var lastCol = sheet.getLastColumn();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  return values.map(function(row, index) {
    return {
      rowNumber: index + 2,
      record: GEAPA_CORE.coreRowToObject(headers, row)
    };
  });
}

function atividades_isSubtipoApresentacaoMembro_(value) {
  return atividades_normalizeTextUpper_(value) === 'APRESENTACAO_MEMBRO';
}

function atividades_buildApresentacoesIndex_(rows) {
  var byActivityId = {};
  var duplicateIds = {};

  (rows || []).forEach(function(item) {
    var activityId = String(item.record.ID_ATIVIDADE || '').trim();
    if (!activityId) return;
    if (byActivityId[activityId]) {
      duplicateIds[activityId] = true;
      return;
    }
    byActivityId[activityId] = item;
  });

  return {
    byActivityId: byActivityId,
    duplicateIds: duplicateIds
  };
}

function atividades_buildActivityFilterSet_(activityIds) {
  if (!Array.isArray(activityIds) || !activityIds.length) return null;
  var set = Object.create(null);
  (activityIds || []).forEach(function(activityId) {
    var normalized = String(activityId || '').trim();
    if (normalized) set[normalized] = true;
  });
  return Object.keys(set).length ? set : null;
}

function atividades_activityPassesFilter_(activityId, activityFilterSet) {
  var normalized = String(activityId || '').trim();
  if (!activityFilterSet) return true;
  return !!activityFilterSet[normalized];
}

function atividades_getApresentacaoRowByNumber_(rowNumber) {
  var found = null;
  atividades_listApresentacaoRowsWithNumbers_().some(function(item) {
    if (item.rowNumber === rowNumber) {
      found = item;
      return true;
    }
    return false;
  });
  return found;
}

function atividades_getSemesterLabelForActivity_(activityRecord) {
  var dateValue = atividades_parseDateOrNull_(activityRecord.DATA_ATIVIDADE);
  if (dateValue) {
    var semester = atividades_resolverSemestrePorData_(dateValue) ||
      GEAPA_CORE.coreGetCurrentSemester(dateValue);
    if (semester && semester.id) return String(semester.id).trim();
  }
  return String(activityRecord.PERIODO_REFERENCIA || '').trim();
}

function atividades_buildApresentacaoMirrorPayload_(activityRecord) {
  return {
    ID_ATIVIDADE: String(activityRecord.ID_ATIVIDADE || '').trim(),
    PERIODO_REFERENCIA: String(activityRecord.PERIODO_REFERENCIA || '').trim(),
    DATA_ATIVIDADE: activityRecord.DATA_ATIVIDADE || '',
    HORARIO_INICIO: activityRecord.HORARIO_INICIO || '',
    HORARIO_FIM: activityRecord.HORARIO_FIM || '',
    LOCAL: activityRecord.LOCAL || '',
    FORMATO: activityRecord.FORMATO || '',
    SEMESTRE_APRESENTACAO: atividades_getSemesterLabelForActivity_(activityRecord)
  };
}

function atividades_upsertApresentacoesMembroFromAtividades_(opts) {
  opts = opts || {};
  atividades_garantirEstruturasFixasV1_();

  var idBatch = atividades_fillMissingActivityIds_();
  var appSheet = atividades_getApresentacoesSheet_();
  var appHeaderMap = GEAPA_CORE.coreHeaderMap(appSheet, 1);
  var appRows = atividades_listApresentacaoRowsWithNumbers_();
  var appIndex = atividades_buildApresentacoesIndex_(appRows);
  var created = [];
  var updated = [];
  var duplicates = Object.keys(appIndex.duplicateIds);

  atividades_listActivityRowsWithNumbers_().forEach(function(item) {
    var activityRecord = item.record;
    var activityId = String(activityRecord.ID_ATIVIDADE || '').trim();
    if (!activityId) return;
    if (!atividades_isSubtipoApresentacaoMembro_(activityRecord.SUBTIPO_ATIVIDADE)) return;
    if (appIndex.duplicateIds[activityId]) return;

    var mirror = atividades_buildApresentacaoMirrorPayload_(activityRecord);
    var existing = appIndex.byActivityId[activityId];

    if (!existing) {
      var payload = {
        ID_APRESENTACAO: atividades_getNextApresentacaoId_(),
        ID_ATIVIDADE: mirror.ID_ATIVIDADE,
        RGA: '',
        NOME_MEMBRO: '',
        EMAIL_MEMBRO: '',
        PERIODO_REFERENCIA: mirror.PERIODO_REFERENCIA,
        DATA_ATIVIDADE: mirror.DATA_ATIVIDADE,
        HORARIO_INICIO: mirror.HORARIO_INICIO,
        HORARIO_FIM: mirror.HORARIO_FIM,
        LOCAL: mirror.LOCAL,
        FORMATO: mirror.FORMATO,
        SEMESTRE_APRESENTACAO: mirror.SEMESTRE_APRESENTACAO,
        EIXO_TEMATICO_PRINCIPAL: '',
        EIXO_TEMATICO_SECUNDARIO: '',
        TITULO_APRESENTACAO: '',
        STATUS_APRESENTACAO: 'PLANEJADA',
        NOTIFICACAO_AGENDAMENTO_ENVIADA: 'NAO',
        DATA_NOTIFICACAO_AGENDAMENTO: '',
        ORDEM_RGA: '',
        DATA_COBRANCA_TITULO_EIXO: '',
        QTD_COBRANCAS_TITULO_EIXO: '',
        DATA_CONFIRMACAO_TITULO_EIXO: '',
        NOTIFICACAO_SECRETARIOS_ENVIADA: 'NAO',
        DATA_NOTIFICACAO_SECRETARIOS: '',
        CONVITE_PROFESSORES_ENVIADO: 'NAO',
        DATA_ENVIO_CONVITE_PROFESSORES: '',
        LEMBRETE_MEMBROS_ENVIADO: 'NAO',
        DATA_ENVIO_LEMBRETE_MEMBROS: '',
        DATA_SOLICITACAO_ARQUIVO: '',
        DATA_COBRANCA_ARQUIVO: '',
        QTD_COBRANCAS_ARQUIVO: '',
        STATUS_ENVIO_ARQUIVO: 'PENDENTE',
        DATA_RECEBIMENTO_ARQUIVO: '',
        LINK_ARQUIVO_DRIVE: '',
        SYNC_HISTORICO_PUBLICO: 'NAO',
        OBSERVACOES: '',
        CRIADO_EM: new Date(),
        ATUALIZADO_EM: new Date()
      };
      GEAPA_CORE.coreAppendObjectByHeaders(appSheet, payload, { headerRow: 1 });
      created.push(activityId);
      return;
    }

    var changedHeaders = [];
    Object.keys(mirror).forEach(function(header) {
      var nextValue = mirror[header];
      var currentValue = existing.record[header];
      var sameDate = atividades_parseDateOrNull_(currentValue) && atividades_parseDateOrNull_(nextValue) &&
        atividades_parseDateOrNull_(currentValue).getTime() === atividades_parseDateOrNull_(nextValue).getTime();
      if (sameDate) return;
      if (String(currentValue || '') === String(nextValue || '')) return;
      if (!GEAPA_CORE.coreGetCol(appHeaderMap, header)) return;
      GEAPA_CORE.coreWriteCellByHeader(appSheet, existing.rowNumber, appHeaderMap, header, nextValue, { oneBased: true });
      changedHeaders.push(header);
    });

    if (!String(existing.record.ID_APRESENTACAO || '').trim()) {
      GEAPA_CORE.coreWriteCellByHeader(appSheet, existing.rowNumber, appHeaderMap, 'ID_APRESENTACAO', atividades_getNextApresentacaoId_(), { oneBased: true });
      changedHeaders.push('ID_APRESENTACAO');
    }
    if (!String(existing.record.STATUS_APRESENTACAO || '').trim()) {
      GEAPA_CORE.coreWriteCellByHeader(appSheet, existing.rowNumber, appHeaderMap, 'STATUS_APRESENTACAO', 'PLANEJADA', { oneBased: true });
      changedHeaders.push('STATUS_APRESENTACAO');
    }
    if (!String(existing.record.NOTIFICACAO_AGENDAMENTO_ENVIADA || '').trim()) {
      GEAPA_CORE.coreWriteCellByHeader(appSheet, existing.rowNumber, appHeaderMap, 'NOTIFICACAO_AGENDAMENTO_ENVIADA', 'NAO', { oneBased: true });
      changedHeaders.push('NOTIFICACAO_AGENDAMENTO_ENVIADA');
    }
    if (!String(existing.record.NOTIFICACAO_SECRETARIOS_ENVIADA || '').trim()) {
      GEAPA_CORE.coreWriteCellByHeader(appSheet, existing.rowNumber, appHeaderMap, 'NOTIFICACAO_SECRETARIOS_ENVIADA', 'NAO', { oneBased: true });
      changedHeaders.push('NOTIFICACAO_SECRETARIOS_ENVIADA');
    }
    if (!String(existing.record.CONVITE_PROFESSORES_ENVIADO || '').trim()) {
      GEAPA_CORE.coreWriteCellByHeader(appSheet, existing.rowNumber, appHeaderMap, 'CONVITE_PROFESSORES_ENVIADO', 'NAO', { oneBased: true });
      changedHeaders.push('CONVITE_PROFESSORES_ENVIADO');
    }
    if (!String(existing.record.LEMBRETE_MEMBROS_ENVIADO || '').trim()) {
      GEAPA_CORE.coreWriteCellByHeader(appSheet, existing.rowNumber, appHeaderMap, 'LEMBRETE_MEMBROS_ENVIADO', 'NAO', { oneBased: true });
      changedHeaders.push('LEMBRETE_MEMBROS_ENVIADO');
    }
    if (!String(existing.record.STATUS_ENVIO_ARQUIVO || '').trim()) {
      GEAPA_CORE.coreWriteCellByHeader(appSheet, existing.rowNumber, appHeaderMap, 'STATUS_ENVIO_ARQUIVO', 'PENDENTE', { oneBased: true });
      changedHeaders.push('STATUS_ENVIO_ARQUIVO');
    }
    if (!String(existing.record.SYNC_HISTORICO_PUBLICO || '').trim()) {
      GEAPA_CORE.coreWriteCellByHeader(appSheet, existing.rowNumber, appHeaderMap, 'SYNC_HISTORICO_PUBLICO', 'NAO', { oneBased: true });
      changedHeaders.push('SYNC_HISTORICO_PUBLICO');
    }

    if (changedHeaders.length) {
      if (GEAPA_CORE.coreGetCol(appHeaderMap, 'ATUALIZADO_EM')) {
        GEAPA_CORE.coreWriteCellByHeader(appSheet, existing.rowNumber, appHeaderMap, 'ATUALIZADO_EM', new Date(), { oneBased: true });
      }
      updated.push({
        idAtividade: activityId,
        rowNumber: existing.rowNumber,
        changedHeaders: changedHeaders
      });
    }
  });

  if (created.length || updated.length || duplicates.length) {
    atividades_logEvento_({
      TIPO_EVENTO_LOG: ATIVIDADES_CFG.APRESENTACOES_LOG_TYPES.UPSERT_APRESENTACAO,
      STATUS: duplicates.length ? 'ATENCAO' : 'OK',
      ACAO_EXECUTADA: 'Sincronizar APRESENTACAO_MEMBRO de Atividades para Atividades_Apresentacoes',
      RESULTADO: 'created=' + created.length + ' | updated=' + updated.length,
      OBSERVACOES: duplicates.length ? ('duplicates=' + duplicates.join(',')) : ''
    });
  }

  return {
    ok: true,
    idBatch: idBatch,
    createdCount: created.length,
    updatedCount: updated.length,
    duplicates: duplicates,
    created: created,
    updated: updated
  };
}

function atividades_mapStatusApresentacaoToAtividade_(statusApresentacao) {
  var normalized = atividades_normalizeTextUpper_(statusApresentacao);
  return ATIVIDADES_CFG.APRESENTACOES_STATUS_TO_ATIVIDADE[normalized] || '';
}

function atividades_refletirStatusApresentacoesEmAtividades_() {
  var atividadesSheet = atividades_getAtividadesSheet_();
  var atividadesHeaderMap = GEAPA_CORE.coreHeaderMap(atividadesSheet, 1);
  var activityRows = atividades_listActivityRowsWithNumbers_();
  var byActivityId = {};

  activityRows.forEach(function(item) {
    var activityId = String(item.record.ID_ATIVIDADE || '').trim();
    if (!activityId) return;
    byActivityId[activityId] = item;
  });

  var updated = [];
  atividades_listApresentacaoRowsWithNumbers_().forEach(function(item) {
    var record = item.record;
    var activityId = String(record.ID_ATIVIDADE || '').trim();
    if (!activityId) return;
    var mappedStatus = atividades_mapStatusApresentacaoToAtividade_(record.STATUS_APRESENTACAO);
    if (!mappedStatus) return;
    var activityItem = byActivityId[activityId];
    if (!activityItem) return;
    if (!atividades_isSubtipoApresentacaoMembro_(activityItem.record.SUBTIPO_ATIVIDADE)) return;
    if (atividades_normalizeTextUpper_(activityItem.record.STATUS) === atividades_normalizeTextUpper_(mappedStatus)) return;

    GEAPA_CORE.coreWriteCellByHeader(atividadesSheet, activityItem.rowNumber, atividadesHeaderMap, 'STATUS', mappedStatus, { oneBased: true });
    if (GEAPA_CORE.coreGetCol(atividadesHeaderMap, 'ATUALIZADO_EM')) {
      GEAPA_CORE.coreWriteCellByHeader(atividadesSheet, activityItem.rowNumber, atividadesHeaderMap, 'ATUALIZADO_EM', new Date(), { oneBased: true });
    }
    updated.push({
      idAtividade: activityId,
      rowNumber: activityItem.rowNumber,
      status: mappedStatus
    });
  });

  if (updated.length) {
    atividades_logEvento_({
      TIPO_EVENTO_LOG: ATIVIDADES_CFG.APRESENTACOES_LOG_TYPES.REFLEXO_STATUS_APRESENTACAO,
      STATUS: 'OK',
      ACAO_EXECUTADA: 'Refletir STATUS_APRESENTACAO em Atividades.STATUS',
      RESULTADO: 'updated=' + updated.length,
      OBSERVACOES: updated.map(function(item) {
        return item.idAtividade + '=' + item.status;
      }).join(' | ')
    });
  }

  return {
    ok: true,
    updatedCount: updated.length,
    updated: updated
  };
}

function atividades_ressincronizarPeriodoEPresencasAposReflexoStatusApresentacoes_(statusSync) {
  var updatedCount = Number(statusSync && statusSync.updatedCount || 0);
  if (updatedCount <= 0) {
    return {
      ok: true,
      skipped: true,
      reason: 'no_status_changes'
    };
  }

  var periodoSync = atividades_sincronizarPeriodoVigente_();
  var presencasSync = atividades_sincronizarPresencasPeriodoVigente_();

  atividades_logEvento_({
    TIPO_EVENTO_LOG: ATIVIDADES_CFG.APRESENTACOES_LOG_TYPES.REFLEXO_STATUS_APRESENTACAO,
    STATUS: 'OK',
    ACAO_EXECUTADA: 'Ressincronizar periodo e presencas apos reflexo de status das apresentacoes',
    RESULTADO: 'status_changes=' + updatedCount,
    OBSERVACOES: 'periodo=' + JSON.stringify(periodoSync) + ' | presencas=' + JSON.stringify(presencasSync)
  });

  return {
    ok: true,
    skipped: false,
    reason: '',
    updatedCount: updatedCount,
    periodoSync: periodoSync,
    presencasSync: presencasSync
  };
}

function atividades_buildAgendamentoApresentacaoCorrelationKey_(idAtividade, rga) {
  return [
    'AAG',
    atividades_normalizeTextUpper_(idAtividade).replace(/[^\w]+/g, '_'),
    atividades_normalizeTextUpper_(rga || 'SEM_RGA').replace(/[^\w]+/g, '_')
  ].join('-');
}

function atividades_buildAgendamentoApresentacaoPayload_(record) {
  var dataTxt = record.DATA_ATIVIDADE
    ? GEAPA_CORE.coreFormatDate(atividades_parseDateOrNull_(record.DATA_ATIVIDADE), Session.getScriptTimeZone(), ATIVIDADES_CFG.DATE_FORMAT)
    : '-';
  var primeiroNome = atividades_getPrimeiroNome_(record.NOME_MEMBRO);
  var saudacao = primeiroNome ? ('Olá, ' + primeiroNome + '.') : 'Olá.';
  var horarioTxt = [record.HORARIO_INICIO, record.HORARIO_FIM].filter(Boolean).join(' às ');
  return {
    subtitle: 'Fluxo de apresentacoes de membros do GEAPA',
    introText: saudacao + ' Sua apresentação no GEAPA foi agendada.',
    blocks: [
      {
        title: 'Apresentação',
        items: [
          { label: 'Data', value: dataTxt },
          { label: 'Horário', value: horarioTxt || '-' },
          { label: 'Local', value: String(record.LOCAL || '').trim() || '-' },
          { label: 'Formato', value: String(record.FORMATO || '').trim() || '-' }
        ]
      },
      {
        title: 'Orientações',
        text: 'Mais perto da data, você poderá receber novas orientações automáticas do sistema, quando aplicável.'
      }
    ],
    footerNote: 'Mensagem automática enviada pelo fluxo institucional de apresentações do GEAPA.'
  };
}

function atividades_toStartOfDayApresentacoes_(value) {
  var parsed = atividades_parseDateOrNull_(value);
  if (!parsed) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function atividades_diffDiasParaApresentacao_(dateValue) {
  var hoje = atividades_toStartOfDayApresentacoes_(new Date());
  var alvo = atividades_toStartOfDayApresentacoes_(dateValue);
  if (!hoje || !alvo) return null;
  return Math.round((alvo.getTime() - hoje.getTime()) / (24 * 60 * 60 * 1000));
}

function atividades_isStatusApresentacao_(value, expected) {
  return atividades_normalizeTextUpper_(value) === atividades_normalizeTextUpper_(expected);
}

function atividades_temTituloEixoConfirmadosApresentacao_(record) {
  return !!(
    String(record.TITULO_APRESENTACAO || '').trim() &&
    String(record.EIXO_TEMATICO_PRINCIPAL || '').trim() &&
    atividades_parseDateOrNull_(record.DATA_CONFIRMACAO_TITULO_EIXO)
  );
}

function atividades_jaCobrouTituloEixoHoje_(record) {
  var hoje = atividades_toStartOfDayApresentacoes_(new Date());
  var ultima = atividades_toStartOfDayApresentacoes_(record.DATA_COBRANCA_TITULO_EIXO);
  if (!hoje || !ultima) return false;
  return hoje.getTime() === ultima.getTime();
}

function atividades_deveEnviarCobrancaTituloEixo_(record) {
  if (!atividades_isStatusApresentacao_(record.STATUS_APRESENTACAO, ATIVIDADES_CFG.APRESENTACOES_JOB.STATUS_COBRAR_TITULO_EIXO)) return false;
  if (atividades_temTituloEixoConfirmadosApresentacao_(record)) return false;
  if (!GEAPA_CORE.coreIsValidEmail(String(record.EMAIL_MEMBRO || '').trim())) return false;
  var diff = atividades_diffDiasParaApresentacao_(record.DATA_ATIVIDADE);
  if (diff === null) return false;
  if (diff < ATIVIDADES_CFG.APRESENTACOES_JOB.TITULO_EIXO_DIAS_ANTES_MIN) return false;
  if (diff > ATIVIDADES_CFG.APRESENTACOES_JOB.TITULO_EIXO_DIAS_ANTES_MAX) return false;
  if (atividades_jaCobrouTituloEixoHoje_(record)) return false;
  return true;
}

function atividades_buildTituloEixoCorrelationKey_(record, refDate) {
  var dateToken = Utilities.formatDate(
    atividades_parseDateOrNull_(refDate) || new Date(),
    Session.getScriptTimeZone(),
    'yyyyMMdd'
  );
  return [
    'ATX',
    atividades_normalizeTextUpper_(String(record.ID_ATIVIDADE || '').trim() || 'SEM_ID').replace(/[^\w]+/g, '_'),
    atividades_normalizeTextUpper_(String(record.RGA || '').trim() || 'SEM_RGA').replace(/[^\w]+/g, '_'),
    dateToken
  ].join('-');
}

function atividades_buildTituloEixoPayload_(record) {
  var dataTxt = record.DATA_ATIVIDADE
    ? GEAPA_CORE.coreFormatDate(atividades_parseDateOrNull_(record.DATA_ATIVIDADE), Session.getScriptTimeZone(), ATIVIDADES_CFG.DATE_FORMAT)
    : '-';
  var primeiroNome = atividades_getPrimeiroNome_(record.NOME_MEMBRO);
  var saudacao = primeiroNome ? ('Olá, ' + primeiroNome + '.') : 'Olá.';
  var horarioTxt = [record.HORARIO_INICIO, record.HORARIO_FIM].filter(Boolean).join(' às ');
  var cobrancaNumero = Number(record.QTD_COBRANCAS_TITULO_EIXO || 0) + 1;
  var primeiraCobranca = cobrancaNumero === 1;
  var introText = primeiraCobranca
    ? (saudacao + ' Precisamos das informações de título e eixo temático da sua apresentação no GEAPA.')
    : (saudacao + ' Este é um lembrete referente ao envio do título e do eixo temático da sua apresentação no GEAPA.');
  var textoSolicitacao = primeiraCobranca
    ? 'Para prosseguirmos com a organização da sua apresentação, precisamos que você envie o título e o eixo temático principal.'
    : 'Até o momento, ainda não identificamos o envio do título e do eixo temático principal da sua apresentação. Por isso, reenviamos abaixo as orientações de resposta.';
  var eixosAceitos = [
    'I - Solos e nutrição de plantas',
    'II - Fitotecnia e manejo de culturas',
    'III - Defesa vegetal (fitossanidade)',
    'IV - Máquinas, tecnologias e agricultura de precisão',
    'V - Agroecologia e sistemas sustentáveis de produção',
    'VI - Melhoramento genético e biotecnologia',
    'VII - Economia, extensão, administração e sociologia rural',
    'VIII - Temas livres de relevância agronômica'
  ].join('\n');
  eixosAceitos = atividades_listRotulosEixosApresentacoes_().join('\n');

  return {
    subtitle: 'Fluxo de apresentações de membros do GEAPA',
    introText: introText,
    blocks: [
      {
        title: 'Apresentação',
        items: [
          { label: 'Data', value: dataTxt },
          { label: 'Horário', value: horarioTxt || '-' },
          { label: 'Local', value: String(record.LOCAL || '').trim() || '-' },
          { label: 'Formato', value: String(record.FORMATO || '').trim() || '-' }
        ]
      },
      {
        title: 'Informações necessárias',
        text: textoSolicitacao
      },
      {
        title: 'Como responder',
        text: 'Responda este e-mail escrevendo, no mínimo, os campos TÍTULO e EIXO. Se desejar, você também pode incluir um EIXO 2 opcional.'
      },
      {
        title: 'Modelo de resposta',
        items: [
          { label: 'TÍTULO', value: 'Seletividade de herbicidas em espécies cultivadas' },
          { label: 'EIXO', value: 'III - Defesa vegetal (fitossanidade)' },
          { label: 'EIXO 2', value: 'II - Fitotecnia e manejo de culturas (opcional)' }
        ]
      },
      {
        title: 'Forma aceita para informar o eixo',
        text: 'Você pode responder com o nome completo do eixo, com o número romano ou apenas com o número correspondente. Exemplos aceitos: "III", "3" ou "III - Defesa vegetal (fitossanidade)".'
      },
      {
        title: 'Eixos temáticos disponíveis',
        text: eixosAceitos
      }
    ],
    footerNote: 'Registro interno: esta é a cobrança nº ' + cobrancaNumero + ' enviada para esta apresentação.'
  };
}

function atividades_marcarCobrancaTituloEixoEnviada_(rowNumber) {
  var sheet = atividades_getApresentacoesSheet_();
  var headerMap = GEAPA_CORE.coreHeaderMap(sheet, 1);
  var qtdAtual = Number(GEAPA_CORE.coreReadSheetRecords(sheet, { headerRow: 1 })[rowNumber - 2].QTD_COBRANCAS_TITULO_EIXO || 0);
  GEAPA_CORE.coreWriteCellByHeader(sheet, rowNumber, headerMap, 'DATA_COBRANCA_TITULO_EIXO', new Date(), { oneBased: true });
  GEAPA_CORE.coreWriteCellByHeader(sheet, rowNumber, headerMap, 'QTD_COBRANCAS_TITULO_EIXO', qtdAtual + 1, { oneBased: true });
  if (GEAPA_CORE.coreGetCol(headerMap, 'ATUALIZADO_EM')) {
    GEAPA_CORE.coreWriteCellByHeader(sheet, rowNumber, headerMap, 'ATUALIZADO_EM', new Date(), { oneBased: true });
  }
}

function atividades_buildTituloEixoProcessedLabel_() {
  var name = 'GEAPA/Atividades/TituloEixoProcessado';
  var label = GmailApp.getUserLabelByName(name);
  return label || GmailApp.createLabel(name);
}

function atividades_threadJaProcessadaTituloEixo_(thread) {
  var wanted = 'GEAPA/Atividades/TituloEixoProcessado';
  return (thread.getLabels() || []).some(function(label) {
    return String(label.getName() || '').trim() === wanted;
  });
}

function atividades_marcarThreadTituloEixoProcessada_(thread) {
  thread.addLabel(atividades_buildTituloEixoProcessedLabel_());
}

function atividades_extrairEmailSimplesApresentacoes_(value) {
  var text = String(value || '').trim();
  var match = text.match(/<([^>]+)>/);
  return String(match ? match[1] : text).trim().toLowerCase();
}

function atividades_normalizarComparacaoApresentacoes_(value) {
  return GEAPA_CORE.coreNormalizeText(value, {
    removeAccents: true,
    collapseWhitespace: true,
    caseMode: 'lower'
  }).replace(/[–—-]/g, ' ');
}

function atividades_mensagemPareceRespostaTituloEixo_(message) {
  var body = atividades_normalizarComparacaoApresentacoes_(message.getPlainBody() || '');
  return body.indexOf('titulo:') !== -1 && (
    body.indexOf('eixo:') !== -1 ||
    body.indexOf('eixo 1:') !== -1 ||
    body.indexOf('eixo1:') !== -1
  );
}

function atividades_extrairCampoDoCorpoApresentacoes_(body, fieldName, singleLine) {
  if (!body || !fieldName) return '';
  var linhas = String(body).split(/\r?\n/);
  var alvo = atividades_normalizarComparacaoApresentacoes_(fieldName);
  var valor = [];
  var capturando = false;

  function ehCabecalhoLinha(line) {
    var l = atividades_normalizarComparacaoApresentacoes_(line);
    return (
      l.indexOf('titulo:') === 0 ||
      l.indexOf('titulo :') === 0 ||
      l.indexOf('eixo:') === 0 ||
      l.indexOf('eixo 1:') === 0 ||
      l.indexOf('eixo 1 :') === 0 ||
      l.indexOf('eixo1:') === 0 ||
      l.indexOf('eixo1 :') === 0 ||
      l.indexOf('eixo :') === 0 ||
      l.indexOf('eixo 2:') === 0 ||
      l.indexOf('eixo 2 :') === 0 ||
      l.indexOf('eixo2:') === 0 ||
      l.indexOf('eixo2 :') === 0
    );
  }

  function ehSeparadorDeCitacao(line) {
    var raw = String(line || '').trim();
    if (!raw) return false;
    if (raw.indexOf('>') === 0) return true;
    var normalized = atividades_normalizarComparacaoApresentacoes_(raw);
    return /^em .* escreveu:$/.test(normalized) ||
      /^on .* wrote:$/.test(normalized) ||
      normalized.indexOf('---------- mensagem encaminhada ----------') === 0 ||
      normalized.indexOf('-----original message-----') === 0;
  }

  for (var i = 0; i < linhas.length; i++) {
    var linhaOriginal = linhas[i];
    var linhaNorm = atividades_normalizarComparacaoApresentacoes_(linhaOriginal);

    if (!capturando) {
      if (linhaNorm.indexOf(alvo + ':') === 0 || linhaNorm.indexOf(alvo + ' :') === 0) {
        capturando = true;
        var idx = linhaOriginal.indexOf(':');
        var resto = idx >= 0 ? linhaOriginal.substring(idx + 1).trim() : '';
        if (resto) {
          valor.push(resto);
          if (singleLine) return resto;
        }
        if (singleLine) {
          for (var j = i + 1; j < linhas.length; j++) {
            var prox = linhas[j].trim();
            if (!prox) continue;
            if (ehCabecalhoLinha(prox)) return '';
            return prox;
          }
          return '';
        }
      }
      continue;
    }

    if (ehCabecalhoLinha(linhaOriginal) || ehSeparadorDeCitacao(linhaOriginal)) break;
    if (linhaOriginal.trim()) {
      valor.push(linhaOriginal.trim());
      if (singleLine) break;
    }
  }

  return valor.join(' ').trim();
}

function atividades_getMapaEixosApresentacoes_() {
  return [
    { romano: 'I', aliases: ['1', 'i', 'solos', 'solos e nutricao de plantas'], canonico: 'I - Solos e nutrição de plantas' },
    { romano: 'II', aliases: ['2', 'ii', 'fitotecnia', 'fitotecnia e manejo de culturas'], canonico: 'II - Fitotecnia e manejo de culturas' },
    { romano: 'III', aliases: ['3', 'iii', 'defesa vegetal', 'fitossanidade', 'defesa vegetal (fitossanidade)'], canonico: 'III - Defesa vegetal (fitossanidade)' },
    { romano: 'IV', aliases: ['4', 'iv', 'maquinas', 'tecnologias', 'agricultura de precisao', 'maquinas tecnologias e agricultura de precisao'], canonico: 'IV - Máquinas, tecnologias e agricultura de precisão' },
    { romano: 'V', aliases: ['5', 'v', 'agroecologia', 'agroecologia e sistemas sustentaveis de producao'], canonico: 'V - Agroecologia e sistemas sustentáveis de produção' },
    { romano: 'VI', aliases: ['6', 'vi'], canonico: 'VI - Melhoramento genético e biotecnologia' },
    { romano: 'VII', aliases: ['7', 'vii'], canonico: 'VII - Economia, extensão, administração e sociologia rural' },
    { romano: 'VIII', aliases: ['8', 'viii', 'temas livres', 'temas livres de relevancia agronomica'], canonico: 'VIII - Temas livres de relevância agronômica' }
  ];
}

function atividades_normalizarComparacaoApresentacoes_(value) {
  return GEAPA_CORE.coreNormalizeText(value, {
    removeAccents: true,
    collapseWhitespace: true,
    caseMode: 'lower'
  }).replace(/[\u2010-\u2015-]+/g, ' ');
}

function atividades_assertEixosTematicosConfigDisponivel_() {
  var key = ATIVIDADES_CFG.STABLE_KEYS.THEMATIC_AXES;
  if (!atividades_getRegistryEntryByKey_(key)) {
    throw new Error('KEY obrigatoria nao encontrada no Registry para eixos tematicos: ' + key);
  }
}

function atividades_getEixosTematicosConfigSheet_() {
  atividades_assertEixosTematicosConfigDisponivel_();
  return atividades_getEixosTematicosSheet_();
}

function atividades_buildRotuloCanonicoEixo_(record) {
  var rotulo = String(record.ROTULO_FORMULARIO || '').trim();
  if (rotulo) return rotulo;

  var numeral = String(record.NUMERAL_ROMANO || '').trim().toUpperCase();
  var nome = String(record.NOME_OFICIAL || '').trim();
  if (numeral && nome) return numeral + ' - ' + nome;
  return nome || numeral;
}

function atividades_buildAliasListEixo_(record, canonico) {
  var aliases = [];

  function addAlias(value) {
    var raw = String(value || '').trim();
    if (!raw) return;
    aliases.push(raw);
  }

  var ordem = String(record.ORDEM || '').trim();
  var numeral = String(record.NUMERAL_ROMANO || '').trim().toUpperCase();
  var nomeOficial = String(record.NOME_OFICIAL || '').trim();
  var nomeCurto = String(record.NOME_CURTO || '').trim();
  var codigo = String(record.CODIGO_EIXO || '').trim().toUpperCase();

  addAlias(canonico);
  addAlias(nomeOficial);
  addAlias(nomeCurto);
  addAlias(numeral);
  addAlias(ordem);
  addAlias(codigo);
  addAlias(codigo.replace(/_/g, ' '));
  addAlias(codigo.replace(/_/g, ''));
  addAlias(numeral && nomeOficial ? (numeral + ' - ' + nomeOficial) : '');
  addAlias(numeral && nomeCurto ? (numeral + ' - ' + nomeCurto) : '');
  addAlias(ordem && nomeOficial ? (ordem + ' - ' + nomeOficial) : '');
  addAlias(ordem && nomeCurto ? (ordem + ' - ' + nomeCurto) : '');

  return aliases.filter(function(alias, index, list) {
    var normalized = atividades_normalizarComparacaoApresentacoes_(alias);
    if (!normalized) return false;
    return list.findIndex(function(candidate) {
      return atividades_normalizarComparacaoApresentacoes_(candidate) === normalized;
    }) === index;
  });
}

function atividades_getMapaEixosApresentacoes_() {
  if (ATIVIDADES_RUNTIME_CACHE.thematicAxes) {
    return ATIVIDADES_RUNTIME_CACHE.thematicAxes.slice();
  }

  atividades_assertEixosTematicosConfigDisponivel_();

  var records = GEAPA_CORE.coreReadRecordsByKey(ATIVIDADES_CFG.STABLE_KEYS.THEMATIC_AXES, {
    headerRow: ATIVIDADES_CFG.HEADER_ROW
  });

  var mapa = records.filter(function(record) {
    return atividades_isTruthySim_(record.ATIVO);
  }).map(function(record) {
    var ordem = Number(record.ORDEM || 0);
    var canonico = atividades_buildRotuloCanonicoEixo_(record);
    return {
      ordem: ordem,
      codigo: String(record.CODIGO_EIXO || '').trim().toUpperCase(),
      romano: String(record.NUMERAL_ROMANO || '').trim().toUpperCase(),
      nomeOficial: String(record.NOME_OFICIAL || '').trim(),
      nomeCurto: String(record.NOME_CURTO || '').trim(),
      canonico: canonico,
      aliases: atividades_buildAliasListEixo_(record, canonico),
      raw: record
    };
  }).filter(function(item) {
    return !!(item.ordem && item.romano && item.nomeOficial && item.canonico);
  }).sort(function(a, b) {
    return a.ordem - b.ordem;
  });

  if (!mapa.length) {
    throw new Error(
      'Nenhum eixo tematico ativo foi encontrado na KEY ' +
      ATIVIDADES_CFG.STABLE_KEYS.THEMATIC_AXES +
      '.'
    );
  }

  ATIVIDADES_RUNTIME_CACHE.thematicAxes = mapa.slice();
  return mapa.slice();
}

function atividades_listRotulosEixosApresentacoes_() {
  return atividades_getMapaEixosApresentacoes_().map(function(item) {
    return item.canonico;
  });
}

function atividades_findEixoMapEntryApresentacoes_(raw) {
  var normalizedInput = atividades_normalizarComparacaoApresentacoes_(raw);
  if (!normalizedInput) return null;

  var canonico = atividades_interpretarEixoApresentacoes_(raw);
  var normalizedCanonico = atividades_normalizarComparacaoApresentacoes_(canonico);
  var mapa = atividades_getMapaEixosApresentacoes_();

  for (var i = 0; i < mapa.length; i++) {
    var item = mapa[i];
    if (normalizedCanonico && normalizedCanonico === atividades_normalizarComparacaoApresentacoes_(item.canonico)) {
      return item;
    }

    if (normalizedInput === atividades_normalizarComparacaoApresentacoes_(item.romano)) return item;
    if (normalizedInput === atividades_normalizarComparacaoApresentacoes_(item.codigo)) return item;

    for (var j = 0; j < item.aliases.length; j++) {
      if (normalizedInput === atividades_normalizarComparacaoApresentacoes_(item.aliases[j])) return item;
    }
  }

  return null;
}

function atividades_getCanonicalAxesFromApresentacao_(record) {
  var seen = {};
  return [
    record.EIXO_TEMATICO_PRINCIPAL,
    record.EIXO_TEMATICO_SECUNDARIO
  ].map(function(value) {
    var entry = atividades_findEixoMapEntryApresentacoes_(value);
    return entry ? entry.canonico : '';
  }).filter(function(value) {
    var normalized = atividades_normalizarComparacaoApresentacoes_(value);
    if (!normalized || seen[normalized]) return false;
    seen[normalized] = true;
    return true;
  });
}

function atividades_interpretarEixoApresentacoes_(raw) {
  var txt = atividades_normalizarComparacaoApresentacoes_(raw);
  if (!txt) return '';

  var mapa = atividades_getMapaEixosApresentacoes_();
  for (var i = 0; i < mapa.length; i++) {
    var item = mapa[i];
    if (txt === atividades_normalizarComparacaoApresentacoes_(item.romano)) return item.canonico;
    if (txt === atividades_normalizarComparacaoApresentacoes_(item.codigo)) return item.canonico;
    if (txt === atividades_normalizarComparacaoApresentacoes_(item.canonico)) return item.canonico;
    for (var j = 0; j < item.aliases.length; j++) {
      if (txt === atividades_normalizarComparacaoApresentacoes_(item.aliases[j])) return item.canonico;
    }
    if (txt.length >= 3 &&
        atividades_normalizarComparacaoApresentacoes_(item.canonico).indexOf(txt) !== -1) {
      return item.canonico;
    }
  }

  return String(raw || '').trim();
}

function atividades_extrairDadosTituloEixoDaMensagem_(message) {
  var body = message.getPlainBody() || '';
  var titulo =
    atividades_extrairCampoDoCorpoApresentacoes_(body, 'TÍTULO', true) ||
    atividades_extrairCampoDoCorpoApresentacoes_(body, 'TITULO', true);
  var eixoBruto =
    atividades_extrairCampoDoCorpoApresentacoes_(body, 'EIXO', true) ||
    atividades_extrairCampoDoCorpoApresentacoes_(body, 'EIXO 1', true) ||
    atividades_extrairCampoDoCorpoApresentacoes_(body, 'EIXO1', true);
  var eixo2Bruto =
    atividades_extrairCampoDoCorpoApresentacoes_(body, 'EIXO 2', true) ||
    atividades_extrairCampoDoCorpoApresentacoes_(body, 'EIXO2', true);
  return {
    titulo: String(titulo || '').trim(),
    eixo: atividades_interpretarEixoApresentacoes_(eixoBruto),
    eixo2: atividades_interpretarEixoApresentacoes_(eixo2Bruto)
  };
}

function atividades_dadosTituloEixoValidos_(dados) {
  return !!(String(dados.titulo || '').trim() && String(dados.eixo || '').trim());
}

function atividades_extrairDadosTituloEixoDaMensagem_(message) {
  var body = message.getPlainBody() || '';
  var titulo =
    atividades_extrairCampoDoCorpoApresentacoes_(body, 'TITULO', false) ||
    atividades_extrairCampoDoCorpoApresentacoes_(body, 'TÍTULO', false);
  var eixoBruto =
    atividades_extrairCampoDoCorpoApresentacoes_(body, 'EIXO', true) ||
    atividades_extrairCampoDoCorpoApresentacoes_(body, 'EIXO 1', true) ||
    atividades_extrairCampoDoCorpoApresentacoes_(body, 'EIXO1', true);
  var eixo2Bruto =
    atividades_extrairCampoDoCorpoApresentacoes_(body, 'EIXO 2', true) ||
    atividades_extrairCampoDoCorpoApresentacoes_(body, 'EIXO2', true);
  return {
    titulo: String(titulo || '').replace(/\s+/g, ' ').trim(),
    eixo: atividades_interpretarEixoApresentacoes_(eixoBruto),
    eixo2: atividades_interpretarEixoApresentacoes_(eixo2Bruto)
  };
}

function atividades_getMensagemValidaMaisRecenteDaThread_(thread, senderEmail) {
  var target = atividades_extrairEmailSimplesApresentacoes_(senderEmail);
  var validas = thread.getMessages().filter(function(message) {
    if (atividades_extrairEmailSimplesApresentacoes_(message.getFrom()) !== target) return false;
    if (!atividades_mensagemPareceRespostaTituloEixo_(message)) return false;
    return atividades_dadosTituloEixoValidos_(
      atividades_extrairDadosTituloEixoDaMensagem_(message)
    );
  });

  if (!validas.length) return null;
  validas.sort(function(a, b) {
    return b.getDate().getTime() - a.getDate().getTime();
  });
  return validas[0];
}

function atividades_gravarTituloEixoNaApresentacaoLinha_(rowNumber, dados, confirmedAt) {
  var sheet = atividades_getApresentacoesSheet_();
  var headerMap = GEAPA_CORE.coreHeaderMap(sheet, 1);
  var records = GEAPA_CORE.coreReadSheetRecords(sheet, { headerRow: 1 });
  var currentRecord = records[rowNumber - 2] || {};

  GEAPA_CORE.coreWriteCellByHeader(sheet, rowNumber, headerMap, 'TITULO_APRESENTACAO', dados.titulo || '', { oneBased: true });
  GEAPA_CORE.coreWriteCellByHeader(sheet, rowNumber, headerMap, 'EIXO_TEMATICO_PRINCIPAL', dados.eixo || '', { oneBased: true });
  GEAPA_CORE.coreWriteCellByHeader(sheet, rowNumber, headerMap, 'EIXO_TEMATICO_SECUNDARIO', dados.eixo2 || '', { oneBased: true });
  GEAPA_CORE.coreWriteCellByHeader(sheet, rowNumber, headerMap, 'DATA_CONFIRMACAO_TITULO_EIXO', confirmedAt || new Date(), { oneBased: true });
  GEAPA_CORE.coreWriteCellByHeader(sheet, rowNumber, headerMap, 'STATUS_APRESENTACAO', 'CONFIRMADA', { oneBased: true });
  if (!String(currentRecord.NOTIFICACAO_SECRETARIOS_ENVIADA || '').trim()) {
    GEAPA_CORE.coreWriteCellByHeader(sheet, rowNumber, headerMap, 'NOTIFICACAO_SECRETARIOS_ENVIADA', 'NAO', { oneBased: true });
  }
  if (GEAPA_CORE.coreGetCol(headerMap, 'ATUALIZADO_EM')) {
    GEAPA_CORE.coreWriteCellByHeader(sheet, rowNumber, headerMap, 'ATUALIZADO_EM', new Date(), { oneBased: true });
  }
}

function atividades_buscarThreadsTituloEixo_() {
  return GEAPA_CORE.coreSearchThreads(
    'in:anywhere newer_than:30d subject:"' + ATIVIDADES_CFG.APRESENTACOES_JOB.TITULO_EIXO_INBOX_SUBJECT + '"',
    0,
    50
  );
}

function atividades_processarThreadTituloEixo_(thread) {
  var messages = thread.getMessages();
  if (!messages.length) return { ok: false, action: 'skip', reason: 'thread_sem_mensagens' };

  var remetentes = {};
  messages.forEach(function(message) {
    var email = atividades_extrairEmailSimplesApresentacoes_(message.getFrom());
    if (email) remetentes[email] = true;
  });

  var candidatos = atividades_listApresentacaoRowsWithNumbers_().filter(function(item) {
    var record = item.record;
    var email = atividades_extrairEmailSimplesApresentacoes_(record.EMAIL_MEMBRO);
    if (!email || !remetentes[email]) return false;
    if (atividades_temTituloEixoConfirmadosApresentacao_(record)) return false;
    return atividades_isStatusApresentacao_(record.STATUS_APRESENTACAO, ATIVIDADES_CFG.APRESENTACOES_JOB.STATUS_COBRAR_TITULO_EIXO);
  });

  if (!candidatos.length) {
    return { ok: false, action: 'skip', reason: 'sem_linha_pendente_compativel' };
  }

  candidatos.sort(function(a, b) {
    var da = atividades_toStartOfDayApresentacoes_(a.record.DATA_ATIVIDADE);
    var db = atividades_toStartOfDayApresentacoes_(b.record.DATA_ATIVIDADE);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da.getTime() - db.getTime();
  });

  for (var i = 0; i < candidatos.length; i++) {
    var item = candidatos[i];
    var msg = atividades_getMensagemValidaMaisRecenteDaThread_(thread, item.record.EMAIL_MEMBRO);
    if (!msg) continue;
    var dados = atividades_extrairDadosTituloEixoDaMensagem_(msg);
    if (!atividades_dadosTituloEixoValidos_(dados)) continue;

    atividades_gravarTituloEixoNaApresentacaoLinha_(item.rowNumber, dados, msg.getDate());
    atividades_notificarSecretariosTituloEixoPendentes_({
      processOutbox: false,
      activityIds: [String(item.record.ID_ATIVIDADE || '').trim()]
    });
    atividades_marcarThreadTituloEixoProcessada_(thread);

    return {
      ok: true,
      action: 'processed',
      rowNumber: item.rowNumber,
      idAtividade: String(item.record.ID_ATIVIDADE || '').trim(),
      rga: String(item.record.RGA || '').trim(),
      titulo: dados.titulo,
      eixo: dados.eixo,
      eixo2: dados.eixo2 || ''
    };
  }

  return { ok: false, action: 'skip', reason: 'sem_mensagem_valida' };
}

function atividades_buildSecretariosTituloEixoCorrelationKey_(record) {
  return [
    'ATS',
    atividades_normalizeTextUpper_(String(record.ID_ATIVIDADE || '').trim() || 'SEM_ID').replace(/[^\w]+/g, '_'),
    atividades_normalizeTextUpper_(String(record.RGA || '').trim() || 'SEM_RGA').replace(/[^\w]+/g, '_')
  ].join('-');
}

function atividades_buildAvisoSecretariosTituloEixoPayload_(record) {
  var dataTxt = record.DATA_ATIVIDADE
    ? GEAPA_CORE.coreFormatDate(atividades_parseDateOrNull_(record.DATA_ATIVIDADE), Session.getScriptTimeZone(), ATIVIDADES_CFG.DATE_FORMAT)
    : '-';
  var horarioTxt = [record.HORARIO_INICIO, record.HORARIO_FIM].filter(Boolean).join(' às ');
  var confirmTxt = atividades_parseDateOrNull_(record.DATA_CONFIRMACAO_TITULO_EIXO)
    ? Utilities.formatDate(atividades_parseDateOrNull_(record.DATA_CONFIRMACAO_TITULO_EIXO), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm')
    : '-';

  return {
    subtitle: 'Revisão administrativa de apresentação do GEAPA',
    introText: 'Uma apresentação do GEAPA teve título e eixos temáticos informados pelo apresentador e agora precisa de análise da secretaria/diretoria.',
    blocks: [
      {
        title: 'Apresentação',
        items: [
          { label: 'Membro', value: String(record.NOME_MEMBRO || '').trim() || '-' },
          { label: 'E-mail', value: String(record.EMAIL_MEMBRO || '').trim() || '-' },
          { label: 'RGA', value: String(record.RGA || '').trim() || '-' },
          { label: 'Data', value: dataTxt },
          { label: 'Horário', value: horarioTxt || '-' },
          { label: 'Local', value: String(record.LOCAL || '').trim() || '-' },
          { label: 'Título', value: String(record.TITULO_APRESENTACAO || '').trim() || '-' },
          { label: 'Eixo principal', value: String(record.EIXO_TEMATICO_PRINCIPAL || '').trim() || '-' },
          { label: 'Eixo secundário', value: String(record.EIXO_TEMATICO_SECUNDARIO || '').trim() || '-' },
          { label: 'Confirmado em', value: confirmTxt }
        ]
      },
      {
        title: 'Próxima ação',
        text: 'Revisem as informações e, se estiver tudo correto, alterem o STATUS_APRESENTACAO para APROVADA na aba especializada.'
      }
    ],
    footerNote: 'Aviso automático do fluxo institucional de apresentações do GEAPA.'
  };
}

function atividades_getSecretaryEmailsApresentacoes_() {
  return (GEAPA_CORE.coreGetCurrentEmailsByEmailGroup('SECRETARIA') || []).map(function(email) {
    return String(email || '').trim();
  }).filter(function(email) {
    return GEAPA_CORE.coreIsValidEmail(email);
  });
}

function atividades_isMailHubLockError_(err) {
  var message = err && err.message ? err.message : String(err || '');
  return message.indexOf('Lock não obtido (CORE_MAIL_HUB_QUEUE_OUTGOING)') >= 0 ||
    message.indexOf('Lock nao obtido (CORE_MAIL_HUB_QUEUE_OUTGOING)') >= 0;
}

function atividades_tryQueueOutgoing_(payload) {
  try {
    return GEAPA_CORE.coreMailQueueOutgoing(payload);
  } catch (err) {
    if (atividades_isMailHubLockError_(err)) {
      return {
        ok: false,
        queued: false,
        duplicate: false,
        locked: true,
        errorMessage: err && err.message ? err.message : String(err)
      };
    }
    throw err;
  }
}

function atividades_enviarCobrancasTituloEixoApresentacoes_(opts) {
  opts = opts || {};
  var queued = [];
  var duplicates = 0;
  var deferred = 0;

  atividades_listApresentacaoRowsWithNumbers_().forEach(function(item) {
    var record = item.record;
    if (!atividades_deveEnviarCobrancaTituloEixo_(record)) return;

    var correlationKey = atividades_buildTituloEixoCorrelationKey_(record, new Date());
    var queueResult = atividades_tryQueueOutgoing_({
      moduleName: ATIVIDADES_CFG.MODULE_CODE,
      templateKey: 'GEAPA_OPERACIONAL',
      correlationKey: correlationKey,
      entityType: 'MEMBRO',
      entityId: String(record.RGA || record.ID_ATIVIDADE || '').trim(),
      flowCode: 'APR',
      stage: 'TIT_EIXO',
      to: String(record.EMAIL_MEMBRO || '').trim(),
      recipientName: String(record.NOME_MEMBRO || '').trim(),
      subjectHuman: ATIVIDADES_CFG.APRESENTACOES_JOB.TITULO_EIXO_INBOX_SUBJECT,
      payload: atividades_buildTituloEixoPayload_(record),
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
      atividades_marcarCobrancaTituloEixoEnviada_(item.rowNumber);
      queued.push({
        rowNumber: item.rowNumber,
        correlationKey: correlationKey,
        saidaId: queueResult.saidaId || ''
      });
    }
  });

  if (queued.length || duplicates) {
    atividades_logEvento_({
      TIPO_EVENTO_LOG: ATIVIDADES_CFG.APRESENTACOES_LOG_TYPES.COBRANCA_TITULO_EIXO_APRESENTACAO,
      STATUS: 'OK',
      ACAO_EXECUTADA: 'Enfileirar cobrança de título e eixo para apresentações agendadas',
      RESULTADO: 'queued=' + queued.length + ' | duplicates=' + duplicates,
      OBSERVACOES: queued.slice(0, 20).map(function(item) {
        return item.correlationKey;
      }).join(' | ')
    });
  }

  if (deferred) {
    atividades_logEvento_({
      TIPO_EVENTO_LOG: ATIVIDADES_CFG.APRESENTACOES_LOG_TYPES.COBRANCA_TITULO_EIXO_APRESENTACAO,
      STATUS: 'ATENCAO',
      ACAO_EXECUTADA: 'Adiar cobrança de título e eixo por contenção da fila central',
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

function atividades_processarInboxTituloEixoApresentacoes_(opts) {
  opts = opts || {};
  var threads = atividades_buscarThreadsTituloEixo_();
  var processed = [];
  var skipped = 0;
  var errors = [];

  threads.forEach(function(thread) {
    try {
      if (atividades_threadJaProcessadaTituloEixo_(thread)) {
        skipped++;
        return;
      }

      var result = atividades_processarThreadTituloEixo_(thread);
      if (result && result.action === 'processed') {
        processed.push(result);
      } else {
        skipped++;
      }
    } catch (err) {
      errors.push(err && err.message ? err.message : String(err));
    }
  });

  if (processed.length || errors.length) {
    atividades_logEvento_({
      TIPO_EVENTO_LOG: ATIVIDADES_CFG.APRESENTACOES_LOG_TYPES.INBOX_TITULO_EIXO_APRESENTACAO,
      STATUS: errors.length ? 'ATENCAO' : 'OK',
      ACAO_EXECUTADA: 'Processar respostas de título e eixo das apresentações',
      RESULTADO: 'processed=' + processed.length + ' | skipped=' + skipped + ' | errors=' + errors.length,
      OBSERVACOES: processed.slice(0, 10).map(function(item) {
        return item.idAtividade + ':' + item.titulo;
      }).join(' | ')
    });
  }

  return {
    ok: errors.length === 0,
    processedCount: processed.length,
    skippedCount: skipped,
    errorCount: errors.length,
    processed: processed,
    errors: errors
  };
}

function atividades_enfileirarAvisoSecretariaApresentacaoLinha_(rowNumber) {
  var item = atividades_getApresentacaoRowByNumber_(rowNumber);
  if (!item) {
    return { ok: false, reason: 'apresentacao_row_not_found', queuedCount: 0 };
  }
  return atividades_notificarSecretariosTituloEixoPendentes_({
    processOutbox: false,
    activityIds: [String(item.record.ID_ATIVIDADE || '').trim()]
  });
}

function atividades_enfileirarNotificacoesAprovacaoApresentacaoLinha_(rowNumber) {
  var item = atividades_getApresentacaoRowByNumber_(rowNumber);
  if (!item) {
    return { ok: false, reason: 'apresentacao_row_not_found', queuedCount: 0 };
  }

  var activityId = String(item.record.ID_ATIVIDADE || '').trim();
  if (!activityId) {
    return { ok: false, reason: 'apresentacao_without_activity_id', queuedCount: 0 };
  }

  var professores = atividades_upsertProfessoresApresentacao_({
    activityIds: [activityId]
  });
  var externos = atividades_upsertExternosApresentacao_({
    activityIds: [activityId]
  });
  var convitesProfessores = atividades_enviarConvitesProfessoresApresentacoes_({
    processOutbox: false,
    activityIds: [activityId]
  });
  var convitesExternos = atividades_enviarConvitesExternosApresentacoes_({
    processOutbox: false,
    activityIds: [activityId]
  });
  var lembretesMembros = atividades_enviarLembretesMembrosApresentacoes_({
    processOutbox: false,
    activityIds: [activityId]
  });

  return {
    ok: true,
    activityId: activityId,
    professores: professores,
    externos: externos,
    convitesProfessores: convitesProfessores,
    convitesExternos: convitesExternos,
    lembretesMembros: lembretesMembros
  };
}

function atividades_notificarSecretariosTituloEixoPendentes_(opts) {
  opts = opts || {};
  var sheet = atividades_getApresentacoesSheet_();
  var headerMap = GEAPA_CORE.coreHeaderMap(sheet, 1);
  var activityFilterSet = atividades_buildActivityFilterSet_(opts.activityIds);
  var emails = atividades_getSecretaryEmailsApresentacoes_();
  if (!emails.length) {
    return {
      ok: false,
      queuedCount: 0,
      duplicateCount: 0,
      reason: 'secretaria_sem_emails'
    };
  }

  var queued = [];
  var duplicates = 0;
  var deferred = 0;

  atividades_listApresentacaoRowsWithNumbers_().forEach(function(item) {
    var record = item.record;
    if (!atividades_activityPassesFilter_(record.ID_ATIVIDADE, activityFilterSet)) return;
    if (atividades_temTituloEixoConfirmadosApresentacao_(record) !== true) return;
    if (atividades_isTruthySim_(record.NOTIFICACAO_SECRETARIOS_ENVIADA)) return;
    if (atividades_isStatusApresentacao_(record.STATUS_APRESENTACAO, 'CANCELADA')) return;
    if (!atividades_isStatusApresentacao_(record.STATUS_APRESENTACAO, 'CONFIRMADA')) return;

    var correlationKey = atividades_buildSecretariosTituloEixoCorrelationKey_(record);
    var queueResult = atividades_tryQueueOutgoing_({
      moduleName: ATIVIDADES_CFG.MODULE_CODE,
      templateKey: 'GEAPA_OPERACIONAL',
      correlationKey: correlationKey,
      entityType: 'GOVERNANCA',
      entityId: String(record.ID_ATIVIDADE || '').trim(),
      flowCode: 'APR',
      stage: 'SECREV',
      to: emails.join(','),
      recipientName: 'Secretaria do GEAPA',
      subjectHuman: 'Apresentação com título e eixo para revisão da secretaria',
      payload: atividades_buildAvisoSecretariosTituloEixoPayload_(record),
      metadata: {
        source: 'geapa-atividades',
        idAtividade: String(record.ID_ATIVIDADE || '').trim(),
        rga: String(record.RGA || '').trim(),
        statusApresentacao: String(record.STATUS_APRESENTACAO || '').trim()
      }
    });

    if (queueResult && queueResult.duplicate) {
      duplicates++;
    }

    if (queueResult && queueResult.locked) {
      deferred++;
      return;
    }

    if (queueResult && (queueResult.queued || queueResult.duplicate)) {
      GEAPA_CORE.coreWriteCellByHeader(sheet, item.rowNumber, headerMap, 'NOTIFICACAO_SECRETARIOS_ENVIADA', 'SIM', { oneBased: true });
      GEAPA_CORE.coreWriteCellByHeader(sheet, item.rowNumber, headerMap, 'DATA_NOTIFICACAO_SECRETARIOS', new Date(), { oneBased: true });
      if (GEAPA_CORE.coreGetCol(headerMap, 'ATUALIZADO_EM')) {
        GEAPA_CORE.coreWriteCellByHeader(sheet, item.rowNumber, headerMap, 'ATUALIZADO_EM', new Date(), { oneBased: true });
      }
    }

    if (queueResult && queueResult.queued) {
      queued.push({
        rowNumber: item.rowNumber,
        correlationKey: correlationKey,
        saidaId: queueResult.saidaId || ''
      });
    }
  });

  if (queued.length || duplicates) {
    atividades_logEvento_({
      TIPO_EVENTO_LOG: ATIVIDADES_CFG.APRESENTACOES_LOG_TYPES.NOTIFICACAO_SECRETARIOS_APRESENTACAO,
      STATUS: 'OK',
      ACAO_EXECUTADA: 'Enfileirar aviso aos secretários sobre título e eixo informados',
      RESULTADO: 'queued=' + queued.length + ' | duplicates=' + duplicates,
      OBSERVACOES: queued.slice(0, 20).map(function(item) {
        return item.correlationKey;
      }).join(' | ')
    });
  }

  if (deferred) {
    atividades_logEvento_({
      TIPO_EVENTO_LOG: ATIVIDADES_CFG.APRESENTACOES_LOG_TYPES.NOTIFICACAO_SECRETARIOS_APRESENTACAO,
      STATUS: 'ATENCAO',
      ACAO_EXECUTADA: 'Adiar aviso à secretaria por contenção da fila central',
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

function atividades_listExternosBaseRecords_() {
  return GEAPA_CORE.coreReadSheetRecords(atividades_getExternosBaseSheet_(), {
    headerRow: 1
  });
}

function atividades_buildEixoInterestHeaders_(record) {
  var tokens = atividades_getCanonicalAxesFromApresentacao_(record).map(function(value) {
    var entry = atividades_findEixoMapEntryApresentacoes_(value);
    return entry ? entry.romano : '';
  }).filter(Boolean);
  var seen = {};
  return tokens.filter(function(token) {
    if (seen[token]) return false;
    seen[token] = true;
    return true;
  }).map(function(token) {
    return 'INTERESSE_EIXO_' + token;
  });
}

function atividades_isStatusElegivelConviteExternos_(statusApresentacao) {
  var normalized = atividades_normalizeTextUpper_(statusApresentacao);
  return ATIVIDADES_CFG.APRESENTACOES_JOB.STATUS_CONVIDAR_EXTERNOS.indexOf(normalized) >= 0;
}

function atividades_isStatusElegivelConviteProfessores_(statusApresentacao) {
  var normalized = atividades_normalizeTextUpper_(statusApresentacao);
  return ATIVIDADES_CFG.APRESENTACOES_JOB.STATUS_CONVIDAR_PROFESSORES.indexOf(normalized) >= 0;
}

function atividades_buildActivityIndexById_() {
  var index = {};
  atividades_listActivityRowsWithNumbers_().forEach(function(item) {
    var activityId = String(item.record.ID_ATIVIDADE || '').trim();
    if (!activityId) return;
    index[activityId] = item;
  });
  return index;
}

function atividades_isApresentacaoAbertaParaExternos_(apresentacaoRecord, activityRecord) {
  var acesso = atividades_normalizeTextUpper_(
    (activityRecord && activityRecord.CLASSIFICACAO_ACESSO) || apresentacaoRecord.CLASSIFICACAO_ACESSO || ''
  );
  return !acesso || acesso === 'ABERTA';
}

function atividades_listExternosElegiveisParaApresentacao_(apresentacaoRecord) {
  var interestHeaders = atividades_buildEixoInterestHeaders_(apresentacaoRecord);
  if (!interestHeaders.length) return [];

  var seen = {};
  return atividades_listExternosBaseRecords_().filter(function(record) {
    var email = String(record.EMAIL || '').trim();
    var externoId = String(record.ID_PARTICIPANTE_EXTERNO || '').trim();
    if (!externoId || !GEAPA_CORE.coreIsValidEmail(email)) return false;
    if (!atividades_isTruthySim_(record.ATIVO)) return false;
    if (!atividades_isTruthySim_(record.RECEBE_APRESENTACOES_ALUNOS)) return false;

    var matchesInterest = interestHeaders.some(function(header) {
      return atividades_isTruthySim_(record[header]);
    });
    if (!matchesInterest) return false;
    if (seen[email]) return false;
    seen[email] = true;
    return true;
  }).map(function(record) {
    return {
      id: String(record.ID_PARTICIPANTE_EXTERNO || '').trim(),
      nome: String(record.NOME || '').trim(),
      email: String(record.EMAIL || '').trim(),
      instituicao: String(record.INSTITUICAO || '').trim()
    };
  });
}

function atividades_buildConvidadosIndex_() {
  var index = {};
  GEAPA_CORE.coreReadSheetRecords(atividades_getConvidadosSheet_(), {
    headerRow: 1
  }).forEach(function(record) {
    var activityId = String(record.ID_ATIVIDADE || '').trim();
    var tipo = String(record.TIPO_VINCULO_PESSOA || '').trim();
    var ref = String(record.ID_REFERENCIA || '').trim();
    if (!activityId || !tipo || !ref) return;
    index[[activityId, tipo, ref].join('|')] = record;
  });
  return index;
}

function atividades_buildInviteActivitySummary_(apresentacaoRecord) {
  var dataTxt = apresentacaoRecord.DATA_ATIVIDADE
    ? GEAPA_CORE.coreFormatDate(atividades_parseDateOrNull_(apresentacaoRecord.DATA_ATIVIDADE), Session.getScriptTimeZone(), ATIVIDADES_CFG.DATE_FORMAT)
    : '-';
  var horarioTxt = [apresentacaoRecord.HORARIO_INICIO, apresentacaoRecord.HORARIO_FIM].filter(Boolean).join(' às ');
  var titulo = String(apresentacaoRecord.TITULO_APRESENTACAO || '').trim() || 'Apresentação de membro do GEAPA';
  var eixos = [
    String(apresentacaoRecord.EIXO_TEMATICO_PRINCIPAL || '').trim(),
    String(apresentacaoRecord.EIXO_TEMATICO_SECUNDARIO || '').trim()
  ].filter(Boolean);
  return {
    titulo: titulo,
    dataTxt: dataTxt,
    horarioTxt: horarioTxt || '-',
    local: String(apresentacaoRecord.LOCAL || '').trim() || '-',
    formato: String(apresentacaoRecord.FORMATO || '').trim() || '-',
    eixos: eixos.length ? eixos.join(' | ') : 'Não informado',
    apresentador: String(apresentacaoRecord.NOME_MEMBRO || '').trim() || 'membro do GEAPA'
  };
}

function atividades_pickFirstRecordValueApresentacoes_(record, candidateHeaders) {
  for (var i = 0; i < candidateHeaders.length; i++) {
    var value = String(record[candidateHeaders[i]] || '').trim();
    if (value) return value;
  }
  return '';
}

function atividades_listProfessoresBase_() {
  if (!atividades_getRegistryEntryByKey_(ATIVIDADES_CFG.STABLE_KEYS.PROFS)) {
    return [];
  }

  return GEAPA_CORE.coreReadRecordsByKey(ATIVIDADES_CFG.STABLE_KEYS.PROFS, {
    headerRow: ATIVIDADES_CFG.HEADER_ROW
  }).map(function(record) {
    return {
      id: atividades_pickFirstRecordValueApresentacoes_(record, ['ID_PROFESSOR', 'MATRICULA', 'EMAIL', 'E-mail', 'Email']),
      nome: atividades_pickFirstRecordValueApresentacoes_(record, ['Nome', 'NOME']),
      email: atividades_pickFirstRecordValueApresentacoes_(record, ['E-mail', 'EMAIL', 'Email']),
      eixo1: atividades_pickFirstRecordValueApresentacoes_(record, ['Eixo temático 1', 'Eixo tematico 1', 'EIXO_TEMATICO_1']),
      eixo2: atividades_pickFirstRecordValueApresentacoes_(record, ['Eixo temático 2', 'Eixo tematico 2', 'EIXO_TEMATICO_2'])
    };
  }).filter(function(record) {
    return !!(record.nome && GEAPA_CORE.coreIsValidEmail(record.email));
  });
}

function atividades_listProfessoresElegiveisParaApresentacao_(apresentacaoRecord) {
  var axisKeys = atividades_getCanonicalAxesFromApresentacao_(apresentacaoRecord).map(function(value) {
    return atividades_normalizarComparacaoApresentacoes_(value);
  }).filter(Boolean);
  if (!axisKeys.length) return [];

  var seen = {};
  return atividades_listProfessoresBase_().filter(function(record) {
    var eixo1 = atividades_findEixoMapEntryApresentacoes_(record.eixo1);
    var eixo2 = atividades_findEixoMapEntryApresentacoes_(record.eixo2);
    var professorAxes = [eixo1, eixo2].filter(Boolean).map(function(item) {
      return atividades_normalizarComparacaoApresentacoes_(item.canonico);
    });
    if (!professorAxes.length) return false;

    var matches = professorAxes.some(function(axis) {
      return axisKeys.indexOf(axis) >= 0;
    });
    if (!matches) return false;

    var dedupeKey = atividades_normalizeTextUpper_(record.email);
    if (seen[dedupeKey]) return false;
    seen[dedupeKey] = true;
    return true;
  });
}

function atividades_listMembrosAtivosApresentacoes_() {
  return GEAPA_CORE.coreReadRecordsByKey(ATIVIDADES_CFG.STABLE_KEYS.MEMBERS, {
    headerRow: ATIVIDADES_CFG.HEADER_ROW
  }).map(function(record) {
    return {
      rga: atividades_pickFirstRecordValueApresentacoes_(record, ['RGA']),
      nome: atividades_pickFirstRecordValueApresentacoes_(record, ['MEMBRO', 'Membro', 'NOME_MEMBRO', 'Nome']),
      email: atividades_pickFirstRecordValueApresentacoes_(record, ['EMAIL', 'E-mail', 'Email']),
      status: atividades_pickFirstRecordValueApresentacoes_(record, ['Status', 'STATUS', 'STATUS_CADASTRAL'])
    };
  }).filter(function(record) {
    return !!(
      record.nome &&
      GEAPA_CORE.coreIsValidEmail(record.email) &&
      atividades_normalizeTextUpper_(record.status) === 'ATIVO'
    );
  });
}

function atividades_isApresentacaoAbertaParaMembros_(apresentacaoRecord, activityRecord) {
  var acesso = atividades_normalizeTextUpper_(
    (activityRecord && activityRecord.CLASSIFICACAO_ACESSO) || apresentacaoRecord.CLASSIFICACAO_ACESSO || ''
  );
  return !acesso || acesso === 'ABERTA' || acesso === 'RESTRITA_MEMBROS';
}

function atividades_upsertExternosApresentacao_(opts) {
  opts = opts || {};
  var convidadosSheet = atividades_getConvidadosSheet_();
  var convidadosHeaderMap = GEAPA_CORE.coreHeaderMap(convidadosSheet, 1);
  var convidadosIndex = atividades_buildConvidadosIndex_();
  var activityIndex = atividades_buildActivityIndexById_();
  var activityFilterSet = atividades_buildActivityFilterSet_(opts.activityIds);
  var created = [];

  atividades_listApresentacaoRowsWithNumbers_().forEach(function(item) {
    var record = item.record;
    if (!atividades_activityPassesFilter_(record.ID_ATIVIDADE, activityFilterSet)) return;
    if (!atividades_isStatusElegivelConviteExternos_(record.STATUS_APRESENTACAO)) return;
    if (!String(record.ID_ATIVIDADE || '').trim()) return;
    if (!String(record.EIXO_TEMATICO_PRINCIPAL || '').trim()) return;

    var activityItem = activityIndex[String(record.ID_ATIVIDADE || '').trim()];
    if (activityItem && !atividades_isApresentacaoAbertaParaExternos_(record, activityItem.record)) return;

    atividades_listExternosElegiveisParaApresentacao_(record).forEach(function(externo) {
      var key = [record.ID_ATIVIDADE, 'PARTICIPANTE_EXTERNO', externo.id].join('|');
      if (convidadosIndex[key]) return;

      var payload = {
        ID_CONVITE_ATIVIDADE: 'ACV-' + Utilities.getUuid().slice(0, 8).toUpperCase(),
        ID_ATIVIDADE: String(record.ID_ATIVIDADE || '').trim(),
        TIPO_VINCULO_PESSOA: 'PARTICIPANTE_EXTERNO',
        ID_REFERENCIA: externo.id,
        NOME: externo.nome,
        EMAIL: externo.email,
        PAPEL_NA_ATIVIDADE: 'CONVIDADO',
        CONVITE_ENVIADO: 'NAO',
        CONFIRMADO: '',
        PRESENCA_REGISTRADA: '',
        OBSERVACOES: 'Gerado automaticamente por compatibilidade de eixos temáticos da apresentação.',
        CRIADO_EM: new Date(),
        ATUALIZADO_EM: new Date()
      };
      GEAPA_CORE.coreAppendObjectByHeaders(convidadosSheet, payload, { headerRow: 1 });
      convidadosIndex[key] = payload;
      created.push({
        idAtividade: payload.ID_ATIVIDADE,
        externoId: externo.id,
        email: externo.email
      });
    });
  });

  if (created.length) {
    atividades_logEvento_({
      TIPO_EVENTO_LOG: ATIVIDADES_CFG.APRESENTACOES_LOG_TYPES.UPSERT_EXTERNOS_APRESENTACAO,
      STATUS: 'OK',
      ACAO_EXECUTADA: 'Vincular participantes externos por eixo tematico em Atividade_Convidados',
      RESULTADO: 'created=' + created.length,
      OBSERVACOES: created.slice(0, 20).map(function(item) {
        return item.idAtividade + ':' + item.externoId;
      }).join(' | ')
    });
  }

  return {
    ok: true,
    createdCount: created.length,
    created: created
  };
}

function atividades_upsertProfessoresApresentacao_(opts) {
  opts = opts || {};
  var convidadosSheet = atividades_getConvidadosSheet_();
  var convidadosIndex = atividades_buildConvidadosIndex_();
  var activityFilterSet = atividades_buildActivityFilterSet_(opts.activityIds);
  var created = [];

  atividades_listApresentacaoRowsWithNumbers_().forEach(function(item) {
    var record = item.record;
    if (!atividades_activityPassesFilter_(record.ID_ATIVIDADE, activityFilterSet)) return;
    if (!atividades_isStatusElegivelConviteProfessores_(record.STATUS_APRESENTACAO)) return;
    if (!String(record.ID_ATIVIDADE || '').trim()) return;
    if (!String(record.EIXO_TEMATICO_PRINCIPAL || '').trim()) return;

    atividades_listProfessoresElegiveisParaApresentacao_(record).forEach(function(professor) {
      var refId = String(professor.id || professor.email).trim();
      var key = [record.ID_ATIVIDADE, 'PROFESSOR', refId].join('|');
      if (convidadosIndex[key]) return;

      var payload = {
        ID_CONVITE_ATIVIDADE: 'ACV-' + Utilities.getUuid().slice(0, 8).toUpperCase(),
        ID_ATIVIDADE: String(record.ID_ATIVIDADE || '').trim(),
        TIPO_VINCULO_PESSOA: 'PROFESSOR',
        ID_REFERENCIA: refId,
        NOME: professor.nome,
        EMAIL: professor.email,
        PAPEL_NA_ATIVIDADE: 'CONVIDADO',
        CONVITE_ENVIADO: 'NAO',
        CONFIRMADO: '',
        PRESENCA_REGISTRADA: '',
        OBSERVACOES: 'Gerado automaticamente por compatibilidade de eixos tematicos da apresentacao.',
        CRIADO_EM: new Date(),
        ATUALIZADO_EM: new Date()
      };
      GEAPA_CORE.coreAppendObjectByHeaders(convidadosSheet, payload, { headerRow: 1 });
      convidadosIndex[key] = payload;
      created.push({
        idAtividade: payload.ID_ATIVIDADE,
        professorRef: refId,
        email: professor.email
      });
    });
  });

  if (created.length) {
    atividades_logEvento_({
      TIPO_EVENTO_LOG: ATIVIDADES_CFG.APRESENTACOES_LOG_TYPES.UPSERT_PROFESSORES_APRESENTACAO,
      STATUS: 'OK',
      ACAO_EXECUTADA: 'Vincular professores por eixo tematico em Atividade_Convidados',
      RESULTADO: 'created=' + created.length,
      OBSERVACOES: created.slice(0, 20).map(function(item) {
        return item.idAtividade + ':' + item.professorRef;
      }).join(' | ')
    });
  }

  return {
    ok: true,
    createdCount: created.length,
    created: created
  };
}

function atividades_buildConviteExternoCorrelationKey_(idAtividade, externoId) {
  return [
    'AEX',
    atividades_normalizeTextUpper_(idAtividade).replace(/[^\w]+/g, '_'),
    atividades_normalizeTextUpper_(externoId).replace(/[^\w]+/g, '_')
  ].join('-');
}

function atividades_buildConviteExternoPayload_(apresentacaoRecord, externo) {
  var resumo = atividades_buildInviteActivitySummary_(apresentacaoRecord);
  var primeiroNome = atividades_getPrimeiroNome_(externo.NOME || externo.nome);
  var saudacao = primeiroNome ? ('Olá, ' + primeiroNome + '.') : 'Olá.';
  return {
    subtitle: 'Convite para apresentação do GEAPA',
    introText: saudacao + ' Gostaríamos de convidá-lo(a) para acompanhar uma apresentação do GEAPA relacionada aos eixos temáticos de seu interesse.',
    blocks: [
      {
        title: 'Apresentação',
        items: [
          { label: 'Tema', value: resumo.titulo },
          { label: 'Apresentador(a)', value: resumo.apresentador },
          { label: 'Data', value: resumo.dataTxt },
          { label: 'Horário', value: resumo.horarioTxt },
          { label: 'Local', value: resumo.local },
          { label: 'Formato', value: resumo.formato },
          { label: 'Eixos temáticos', value: resumo.eixos }
        ]
      }
    ],
    cta: {
      label: 'Abrir referência da atividade',
      url: atividades_buildInviteLinkForPresentation_(apresentacaoRecord),
      helper: 'Caso tenha interesse, responda pelos canais institucionais indicados pelo GEAPA.'
    },
    footerNote: 'Convite enviado automaticamente com base nos eixos temáticos cadastrados em seu perfil.'
  };
}

function atividades_buildConviteProfessorCorrelationKey_(idAtividade, professorRef) {
  return [
    'APR',
    'PROF',
    atividades_normalizeTextUpper_(idAtividade).replace(/[^\w]+/g, '_'),
    atividades_normalizeTextUpper_(professorRef).replace(/[^\w]+/g, '_')
  ].join('-');
}

function atividades_buildConviteProfessorPayload_(apresentacaoRecord, professor) {
  var resumo = atividades_buildInviteActivitySummary_(apresentacaoRecord);
  var primeiroNome = atividades_getPrimeiroNome_(professor.NOME || professor.nome);
  var saudacao = primeiroNome ? ('Olá, Professor(a) ' + primeiroNome + '.') : 'Olá, Professor(a).';
  return {
    subtitle: 'Convite para apresentação do GEAPA',
    introText: saudacao + ' Gostaríamos de convidá-lo(a) para acompanhar uma apresentação de membro do GEAPA relacionada aos eixos temáticos de sua área de atuação.',
    blocks: [
      {
        title: 'Apresentação',
        items: [
          { label: 'Tema', value: resumo.titulo },
          { label: 'Apresentador(a)', value: resumo.apresentador },
          { label: 'Data', value: resumo.dataTxt },
          { label: 'Horário', value: resumo.horarioTxt },
          { label: 'Local', value: resumo.local },
          { label: 'Formato', value: resumo.formato },
          { label: 'Eixos temáticos', value: resumo.eixos }
        ]
      }
    ],
    cta: {
      label: 'Abrir referência da atividade',
      url: atividades_buildInviteLinkForPresentation_(apresentacaoRecord),
      helper: 'Caso tenha disponibilidade para acompanhar a atividade, você pode responder por este mesmo canal institucional.'
    },
    footerNote: 'Convite enviado automaticamente com base na compatibilidade entre os eixos temáticos da apresentação e o cadastro institucional de professores.'
  };
}

function atividades_buildLembreteMembroCorrelationKey_(idAtividade, membroRef) {
  return [
    'ALM',
    atividades_normalizeTextUpper_(idAtividade).replace(/[^\w]+/g, '_'),
    atividades_normalizeTextUpper_(membroRef).replace(/[^\w]+/g, '_')
  ].join('-');
}

function atividades_buildLembreteMembroPayload_(apresentacaoRecord, membro) {
  var resumo = atividades_buildInviteActivitySummary_(apresentacaoRecord);
  var primeiroNome = atividades_getPrimeiroNome_(membro.nome || membro.NOME || '');
  var saudacao = primeiroNome ? ('Olá, ' + primeiroNome + '.') : 'Olá.';

  return {
    subtitle: 'Lembrete de apresentação do GEAPA',
    introText: saudacao + ' Passando para lembrar da próxima apresentação do GEAPA.',
    blocks: [
      {
        title: 'Apresentação',
        items: [
          { label: 'Apresentador(a)', value: resumo.apresentador },
          { label: 'Tema', value: resumo.titulo },
          { label: 'Data', value: resumo.dataTxt },
          { label: 'Horário', value: resumo.horarioTxt },
          { label: 'Local', value: resumo.local },
          { label: 'Formato', value: resumo.formato },
          { label: 'Eixos temáticos', value: resumo.eixos }
        ]
      }
    ],
    footerNote: 'Lembrete automático enviado pelo fluxo institucional de apresentações do GEAPA.'
  };
}

function atividades_enviarConvitesExternosApresentacoes_(opts) {
  opts = opts || {};
  var convidadosSheet = atividades_getConvidadosSheet_();
  var convidadosHeaderMap = GEAPA_CORE.coreHeaderMap(convidadosSheet, 1);
  var apresentacoesIndex = atividades_buildApresentacoesIndex_(atividades_listApresentacaoRowsWithNumbers_()).byActivityId;
  var activityFilterSet = atividades_buildActivityFilterSet_(opts.activityIds);
  var queued = [];
  var duplicates = 0;
  var deferred = 0;

  GEAPA_CORE.coreReadSheetRecords(convidadosSheet, { headerRow: 1 }).forEach(function(record, index) {
    var rowNumber = index + 2;
    if (atividades_normalizeTextUpper_(record.TIPO_VINCULO_PESSOA) !== 'PARTICIPANTE_EXTERNO') return;
    if (atividades_isTruthySim_(record.CONVITE_ENVIADO)) return;

    var activityId = String(record.ID_ATIVIDADE || '').trim();
    if (!atividades_activityPassesFilter_(activityId, activityFilterSet)) return;
    var apresentacaoItem = apresentacoesIndex[activityId];
    if (!apresentacaoItem) return;
    var apresentacaoRecord = apresentacaoItem.record;
    if (!atividades_isStatusElegivelConviteExternos_(apresentacaoRecord.STATUS_APRESENTACAO)) return;

    var email = String(record.EMAIL || '').trim();
    if (!GEAPA_CORE.coreIsValidEmail(email)) return;

    var correlationKey = atividades_buildConviteExternoCorrelationKey_(activityId, String(record.ID_REFERENCIA || '').trim() || email);
    var queueResult = atividades_tryQueueOutgoing_({
      moduleName: ATIVIDADES_CFG.MODULE_CODE,
      templateKey: 'GEAPA_OPERACIONAL',
      correlationKey: correlationKey,
      entityType: 'PARTICIPANTE_EXTERNO',
      entityId: String(record.ID_REFERENCIA || '').trim(),
      flowCode: 'APR',
      stage: 'CONVITE_EXT',
      to: email,
      recipientName: String(record.NOME || '').trim(),
      subjectHuman: 'Convite para apresentação do GEAPA',
      payload: atividades_buildConviteExternoPayload_(apresentacaoRecord, record),
      metadata: {
        source: 'geapa-atividades',
        idAtividade: activityId,
        participanteExternoId: String(record.ID_REFERENCIA || '').trim()
      }
    });

    if (queueResult && queueResult.duplicate) {
      duplicates++;
    }

    if (queueResult && queueResult.locked) {
      deferred++;
      return;
    }

    if (queueResult && (queueResult.queued || queueResult.duplicate)) {
      GEAPA_CORE.coreWriteCellByHeader(convidadosSheet, rowNumber, convidadosHeaderMap, 'CONVITE_ENVIADO', 'SIM', { oneBased: true });
      if (GEAPA_CORE.coreGetCol(convidadosHeaderMap, 'ATUALIZADO_EM')) {
        GEAPA_CORE.coreWriteCellByHeader(convidadosSheet, rowNumber, convidadosHeaderMap, 'ATUALIZADO_EM', new Date(), { oneBased: true });
      }
    }

    if (queueResult && queueResult.queued) {
      queued.push({
        rowNumber: rowNumber,
        correlationKey: correlationKey,
        saidaId: queueResult.saidaId || ''
      });
    }
  });

  if (queued.length || duplicates) {
    atividades_logEvento_({
      TIPO_EVENTO_LOG: ATIVIDADES_CFG.APRESENTACOES_LOG_TYPES.CONVITE_EXTERNOS_APRESENTACAO,
      STATUS: 'OK',
      ACAO_EXECUTADA: 'Enfileirar convites de apresentação para participantes externos por eixo temático',
      RESULTADO: 'queued=' + queued.length + ' | duplicates=' + duplicates,
      OBSERVACOES: queued.slice(0, 20).map(function(item) {
        return item.correlationKey;
      }).join(' | ')
    });
  }

  if (deferred) {
    atividades_logEvento_({
      TIPO_EVENTO_LOG: ATIVIDADES_CFG.APRESENTACOES_LOG_TYPES.CONVITE_EXTERNOS_APRESENTACAO,
      STATUS: 'ATENCAO',
      ACAO_EXECUTADA: 'Adiar convites de apresentação para participantes externos por contenção da fila central',
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

function atividades_enviarConvitesProfessoresApresentacoes_(opts) {
  opts = opts || {};
  var convidadosSheet = atividades_getConvidadosSheet_();
  var convidadosHeaderMap = GEAPA_CORE.coreHeaderMap(convidadosSheet, 1);
  var apresentacoesIndex = atividades_buildApresentacoesIndex_(atividades_listApresentacaoRowsWithNumbers_()).byActivityId;
  var activityFilterSet = atividades_buildActivityFilterSet_(opts.activityIds);
  var queued = [];
  var duplicates = 0;
  var deferred = 0;

  GEAPA_CORE.coreReadSheetRecords(convidadosSheet, { headerRow: 1 }).forEach(function(record, index) {
    var rowNumber = index + 2;
    if (atividades_normalizeTextUpper_(record.TIPO_VINCULO_PESSOA) !== 'PROFESSOR') return;
    if (atividades_isTruthySim_(record.CONVITE_ENVIADO)) return;

    var activityId = String(record.ID_ATIVIDADE || '').trim();
    if (!atividades_activityPassesFilter_(activityId, activityFilterSet)) return;
    var apresentacaoItem = apresentacoesIndex[activityId];
    if (!apresentacaoItem) return;
    var apresentacaoRecord = apresentacaoItem.record;
    if (!atividades_isStatusElegivelConviteProfessores_(apresentacaoRecord.STATUS_APRESENTACAO)) return;

    var email = String(record.EMAIL || '').trim();
    if (!GEAPA_CORE.coreIsValidEmail(email)) return;

    var correlationKey = atividades_buildConviteProfessorCorrelationKey_(
      activityId,
      String(record.ID_REFERENCIA || '').trim() || email
    );
    var queueResult = atividades_tryQueueOutgoing_({
      moduleName: ATIVIDADES_CFG.MODULE_CODE,
      templateKey: 'GEAPA_OPERACIONAL',
      correlationKey: correlationKey,
      entityType: 'PROFESSOR',
      entityId: String(record.ID_REFERENCIA || '').trim(),
      flowCode: 'APR',
      stage: 'CONVITE_PROF',
      to: email,
      recipientName: String(record.NOME || '').trim(),
      subjectHuman: 'Convite para apresentação do GEAPA',
      payload: atividades_buildConviteProfessorPayload_(apresentacaoRecord, record),
      metadata: {
        source: 'geapa-atividades',
        idAtividade: activityId,
        professorRef: String(record.ID_REFERENCIA || '').trim()
      }
    });

    if (queueResult && queueResult.duplicate) {
      duplicates++;
    }

    if (queueResult && queueResult.locked) {
      deferred++;
      return;
    }

    if (queueResult && (queueResult.queued || queueResult.duplicate)) {
      GEAPA_CORE.coreWriteCellByHeader(convidadosSheet, rowNumber, convidadosHeaderMap, 'CONVITE_ENVIADO', 'SIM', { oneBased: true });
      if (GEAPA_CORE.coreGetCol(convidadosHeaderMap, 'ATUALIZADO_EM')) {
        GEAPA_CORE.coreWriteCellByHeader(convidadosSheet, rowNumber, convidadosHeaderMap, 'ATUALIZADO_EM', new Date(), { oneBased: true });
      }
    }

    if (queueResult && queueResult.queued) {
      queued.push({
        rowNumber: rowNumber,
        correlationKey: correlationKey,
        saidaId: queueResult.saidaId || ''
      });
    }
  });

  if (queued.length || duplicates) {
    atividades_logEvento_({
      TIPO_EVENTO_LOG: ATIVIDADES_CFG.APRESENTACOES_LOG_TYPES.CONVITE_PROFESSORES_APRESENTACAO,
      STATUS: 'OK',
      ACAO_EXECUTADA: 'Enfileirar convites de apresentação para professores por eixo temático',
      RESULTADO: 'queued=' + queued.length + ' | duplicates=' + duplicates,
      OBSERVACOES: queued.slice(0, 20).map(function(item) {
        return item.correlationKey;
      }).join(' | ')
    });
  }

  if (deferred) {
    atividades_logEvento_({
      TIPO_EVENTO_LOG: ATIVIDADES_CFG.APRESENTACOES_LOG_TYPES.CONVITE_PROFESSORES_APRESENTACAO,
      STATUS: 'ATENCAO',
      ACAO_EXECUTADA: 'Adiar convites de apresentação para professores por contenção da fila central',
      RESULTADO: 'deferred=' + deferred,
      OBSERVACOES: 'A fila central de e-mails estava ocupada. O job tentará novamente no próximo ciclo.'
    });
  }

  return {
    ok: true,
    queuedCount: queued.length,
    duplicateCount: duplicates,
    deferredCount: deferred,
    queued: queued
  };
}

function atividades_enviarLembretesMembrosApresentacoes_(opts) {
  opts = opts || {};
  var sheet = atividades_getApresentacoesSheet_();
  var headerMap = GEAPA_CORE.coreHeaderMap(sheet, 1);
  var activityIndex = atividades_buildActivityIndexById_();
  var activityFilterSet = atividades_buildActivityFilterSet_(opts.activityIds);
  var membros = atividades_listMembrosAtivosApresentacoes_();
  var queued = [];
  var duplicates = 0;
  var deferred = 0;

  if (!membros.length) {
    return {
      ok: false,
      queuedCount: 0,
      duplicateCount: 0,
      deferredCount: 0,
      reason: 'sem_membros_ativos'
    };
  }

  atividades_listApresentacaoRowsWithNumbers_().forEach(function(item) {
    var record = item.record;
    if (!atividades_activityPassesFilter_(record.ID_ATIVIDADE, activityFilterSet)) return;
    if (!atividades_isStatusApresentacao_(record.STATUS_APRESENTACAO, 'APROVADA')) return;
    if (!atividades_temTituloEixoConfirmadosApresentacao_(record)) return;
    if (atividades_isTruthySim_(record.LEMBRETE_MEMBROS_ENVIADO)) return;

    var activityId = String(record.ID_ATIVIDADE || '').trim();
    if (!activityId) return;

    var activityItem = activityIndex[activityId];
    if (activityItem && !atividades_isApresentacaoAbertaParaMembros_(record, activityItem.record)) return;

    var queuedForItem = 0;
    var duplicateForItem = 0;
    var deferredForItem = 0;

    membros.forEach(function(membro) {
      var correlationKey = atividades_buildLembreteMembroCorrelationKey_(
        activityId,
        String(membro.rga || membro.email).trim()
      );
      var queueResult = atividades_tryQueueOutgoing_({
        moduleName: ATIVIDADES_CFG.MODULE_CODE,
        templateKey: 'GEAPA_OPERACIONAL',
        correlationKey: correlationKey,
        entityType: 'MEMBRO',
        entityId: String(membro.rga || activityId).trim(),
        flowCode: 'APR',
        stage: 'LEMBRETE_MEMBRO',
        to: membro.email,
        recipientName: String(membro.nome || '').trim(),
        subjectHuman: 'Lembrete de apresentação do GEAPA',
        payload: atividades_buildLembreteMembroPayload_(record, membro),
        metadata: {
          source: 'geapa-atividades',
          idAtividade: activityId,
          rgaMembro: String(membro.rga || '').trim(),
          statusApresentacao: String(record.STATUS_APRESENTACAO || '').trim()
        }
      });

      if (queueResult && queueResult.duplicate) {
        duplicateForItem++;
        duplicates++;
        return;
      }

      if (queueResult && queueResult.locked) {
        deferredForItem++;
        deferred++;
        return;
      }

      if (queueResult && queueResult.queued) {
        queuedForItem++;
        queued.push({
          rowNumber: item.rowNumber,
          correlationKey: correlationKey,
          saidaId: queueResult.saidaId || '',
          email: membro.email
        });
      }
    });

    if (queuedForItem > 0 || (duplicateForItem > 0 && deferredForItem === 0)) {
      GEAPA_CORE.coreWriteCellByHeader(sheet, item.rowNumber, headerMap, 'LEMBRETE_MEMBROS_ENVIADO', 'SIM', { oneBased: true });
      GEAPA_CORE.coreWriteCellByHeader(sheet, item.rowNumber, headerMap, 'DATA_ENVIO_LEMBRETE_MEMBROS', new Date(), { oneBased: true });
      if (GEAPA_CORE.coreGetCol(headerMap, 'ATUALIZADO_EM')) {
        GEAPA_CORE.coreWriteCellByHeader(sheet, item.rowNumber, headerMap, 'ATUALIZADO_EM', new Date(), { oneBased: true });
      }
    }
  });

  if (queued.length || duplicates) {
    atividades_logEvento_({
      TIPO_EVENTO_LOG: ATIVIDADES_CFG.APRESENTACOES_LOG_TYPES.LEMBRETE_MEMBROS_APRESENTACAO,
      STATUS: 'OK',
      ACAO_EXECUTADA: 'Enfileirar lembretes de apresentação para membros ativos',
      RESULTADO: 'queued=' + queued.length + ' | duplicates=' + duplicates,
      OBSERVACOES: queued.slice(0, 20).map(function(item) {
        return item.correlationKey;
      }).join(' | ')
    });
  }

  if (deferred) {
    atividades_logEvento_({
      TIPO_EVENTO_LOG: ATIVIDADES_CFG.APRESENTACOES_LOG_TYPES.LEMBRETE_MEMBROS_APRESENTACAO,
      STATUS: 'ATENCAO',
      ACAO_EXECUTADA: 'Adiar lembretes de apresentação para membros por contenção da fila central',
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

function atividades_notificarAgendamentoApresentacoesPendentes_(opts) {
  opts = opts || {};
  var sheet = atividades_getApresentacoesSheet_();
  var headerMap = GEAPA_CORE.coreHeaderMap(sheet, 1);
  var queued = [];
  var duplicates = 0;
  var deferred = 0;

  atividades_listApresentacaoRowsWithNumbers_().forEach(function(item) {
    var record = item.record;
    var status = atividades_normalizeTextUpper_(record.STATUS_APRESENTACAO);
    if (status !== ATIVIDADES_CFG.APRESENTACOES_JOB.STATUS_NOTIFICAR_AGENDAMENTO) return;
    if (atividades_isTruthySim_(record.NOTIFICACAO_AGENDAMENTO_ENVIADA)) return;

    var email = String(record.EMAIL_MEMBRO || '').trim();
    if (!GEAPA_CORE.coreIsValidEmail(email)) return;

    var correlationKey = atividades_buildAgendamentoApresentacaoCorrelationKey_(
      String(record.ID_ATIVIDADE || '').trim(),
      String(record.RGA || '').trim()
    );

    var queueResult = atividades_tryQueueOutgoing_({
      moduleName: ATIVIDADES_CFG.MODULE_CODE,
      templateKey: 'GEAPA_OPERACIONAL',
      correlationKey: correlationKey,
      entityType: 'MEMBRO',
      entityId: String(record.RGA || record.ID_ATIVIDADE || '').trim(),
      flowCode: 'APR',
      stage: 'AGENDADA',
      to: email,
      recipientName: String(record.NOME_MEMBRO || '').trim(),
      subjectHuman: 'Sua apresentação no GEAPA foi agendada',
      payload: atividades_buildAgendamentoApresentacaoPayload_(record),
      metadata: {
        source: 'geapa-atividades',
        idAtividade: String(record.ID_ATIVIDADE || '').trim(),
        rga: String(record.RGA || '').trim(),
        statusApresentacao: status
      }
    });

    if (queueResult && queueResult.duplicate) {
      duplicates++;
    }

    if (queueResult && queueResult.locked) {
      deferred++;
      return;
    }

    if (queueResult && (queueResult.queued || queueResult.duplicate)) {
      GEAPA_CORE.coreWriteCellByHeader(sheet, item.rowNumber, headerMap, 'NOTIFICACAO_AGENDAMENTO_ENVIADA', 'SIM', { oneBased: true });
      GEAPA_CORE.coreWriteCellByHeader(sheet, item.rowNumber, headerMap, 'DATA_NOTIFICACAO_AGENDAMENTO', new Date(), { oneBased: true });
      if (GEAPA_CORE.coreGetCol(headerMap, 'ATUALIZADO_EM')) {
        GEAPA_CORE.coreWriteCellByHeader(sheet, item.rowNumber, headerMap, 'ATUALIZADO_EM', new Date(), { oneBased: true });
      }
    }

    if (queueResult && queueResult.queued) {
      queued.push({
        rowNumber: item.rowNumber,
        correlationKey: correlationKey,
        saidaId: queueResult.saidaId || ''
      });
    }
  });

  if (queued.length || duplicates) {
    atividades_logEvento_({
      TIPO_EVENTO_LOG: ATIVIDADES_CFG.APRESENTACOES_LOG_TYPES.NOTIFICACAO_AGENDAMENTO_MEMBRO,
      STATUS: 'OK',
      ACAO_EXECUTADA: 'Enfileirar notificacao de agendamento para membro apresentador',
      RESULTADO: 'queued=' + queued.length + ' | duplicates=' + duplicates,
      OBSERVACOES: queued.map(function(item) {
        return item.correlationKey;
      }).join(' | ')
    });
  }

  if (deferred) {
    atividades_logEvento_({
      TIPO_EVENTO_LOG: ATIVIDADES_CFG.APRESENTACOES_LOG_TYPES.NOTIFICACAO_AGENDAMENTO_MEMBRO,
      STATUS: 'ATENCAO',
      ACAO_EXECUTADA: 'Adiar notificação de agendamento por contenção da fila central',
      RESULTADO: 'deferred=' + deferred,
      OBSERVACOES: 'A fila central de e-mails estava ocupada. O job tentará novamente no próximo ciclo.'
    });
  }

  return {
    ok: true,
    queuedCount: queued.length,
    duplicateCount: duplicates,
    deferredCount: deferred,
    queued: queued
  };
}

function atividades_getJobApresentacoesPhases_() {
  return ['BASE', 'CONVITES', 'POS_EVENTO'];
}

function atividades_getJobApresentacoesStateKey_() {
  return 'ATIVIDADES_JOB_APRESENTACOES_NEXT_PHASE';
}

function atividades_getNextJobApresentacoesPhase_(opts) {
  opts = opts || {};
  var phases = atividades_getJobApresentacoesPhases_();
  if (opts.phase && phases.indexOf(opts.phase) >= 0) return opts.phase;

  var props = PropertiesService.getScriptProperties();
  var current = String(props.getProperty(atividades_getJobApresentacoesStateKey_()) || '').trim();
  return phases.indexOf(current) >= 0 ? current : phases[0];
}

function atividades_advanceJobApresentacoesPhase_(currentPhase) {
  var phases = atividades_getJobApresentacoesPhases_();
  var currentIndex = phases.indexOf(currentPhase);
  var nextPhase = phases[(currentIndex + 1) % phases.length];
  PropertiesService.getScriptProperties().setProperty(
    atividades_getJobApresentacoesStateKey_(),
    nextPhase
  );
  return nextPhase;
}

function atividades_processOutboxIfNeeded_(queueLikeResults) {
  var shouldProcess = (queueLikeResults || []).some(function(result) {
    return !!(result && result.queuedCount);
  });
  return shouldProcess ? GEAPA_CORE.coreMailProcessOutbox() : {
    ok: true,
    skipped: true,
    reason: 'no_queued_messages'
  };
}

function atividades_jobApresentacoesPhaseBase_() {
  var upsert = atividades_upsertApresentacoesMembroFromAtividades_();
  var autoRealizadas = atividades_tryAutoMarkApresentacoesRealizadas_();
  var statusSync = atividades_refletirStatusApresentacoesEmAtividades_();
  var periodResync = atividades_ressincronizarPeriodoEPresencasAposReflexoStatusApresentacoes_(statusSync);
  var notifications = atividades_notificarAgendamentoApresentacoesPendentes_({
    processOutbox: false
  });
  var cobrancasTituloEixo = atividades_enviarCobrancasTituloEixoApresentacoes_({
    processOutbox: false
  });
  var inboxTituloEixo = atividades_processarInboxTituloEixoApresentacoes_({
    processOutbox: false
  });
  var notificacoesSecretaria = atividades_notificarSecretariosTituloEixoPendentes_({
    processOutbox: false
  });

  return {
    phase: 'BASE',
    upsert: upsert,
    autoRealizadas: autoRealizadas,
    statusSync: statusSync,
    periodResync: periodResync,
    notifications: notifications,
    cobrancasTituloEixo: cobrancasTituloEixo,
    inboxTituloEixo: inboxTituloEixo,
    notificacoesSecretaria: notificacoesSecretaria,
    outbox: atividades_processOutboxIfNeeded_([
      notifications,
      cobrancasTituloEixo,
      notificacoesSecretaria
    ])
  };
}

function atividades_jobApresentacoesPhaseConvites_() {
  var professores = atividades_upsertProfessoresApresentacao_();
  var convitesProfessores = atividades_enviarConvitesProfessoresApresentacoes_({
    processOutbox: false
  });
  var externos = atividades_upsertExternosApresentacao_();
  var convitesExternos = atividades_enviarConvitesExternosApresentacoes_({
    processOutbox: false
  });
  var lembretesMembros = atividades_enviarLembretesMembrosApresentacoes_({
    processOutbox: false
  });

  return {
    phase: 'CONVITES',
    professores: professores,
    convitesProfessores: convitesProfessores,
    externos: externos,
    convitesExternos: convitesExternos,
    lembretesMembros: lembretesMembros,
    outbox: atividades_processOutboxIfNeeded_([
      convitesProfessores,
      convitesExternos,
      lembretesMembros
    ])
  };
}

function atividades_jobApresentacoesPhasePosEvento_() {
  var cobrancasArquivo = atividades_enviarCobrancasArquivoApresentacoes_({
    processOutbox: false
  });
  var inboxArquivo = atividades_processarInboxArquivoApresentacoes_({
    processOutbox: false,
    allowGmailFallback: false
  });
  var fotosPendentes = atividades_processarFotosPendentesApresentacoes_({
    processOutbox: false
  });
  var historicoPublico = atividades_sincronizarHistoricoPublicoApresentacoes_();
  var resumoMembers = atividades_sincronizarResumoApresentacoesEmMembersAtuais_();

  return {
    phase: 'POS_EVENTO',
    cobrancasArquivo: cobrancasArquivo,
    inboxArquivo: inboxArquivo,
    fotosPendentes: fotosPendentes,
    historicoPublico: historicoPublico,
    resumoMembers: resumoMembers,
    outbox: atividades_processOutboxIfNeeded_([
      cobrancasArquivo
    ])
  };
}

function atividades_jobApresentacoes_(opts) {
  opts = opts || {};
  atividades_garantirEstruturasFixasV1_();

  var phase = atividades_getNextJobApresentacoesPhase_(opts);
  var result;

  if (phase === 'BASE') {
    result = atividades_jobApresentacoesPhaseBase_();
  } else if (phase === 'CONVITES') {
    result = atividades_jobApresentacoesPhaseConvites_();
  } else {
    result = atividades_jobApresentacoesPhasePosEvento_();
  }

  var nextPhase = atividades_advanceJobApresentacoesPhase_(phase);
  return {
    ok: true,
    phaseExecuted: phase,
    nextPhase: nextPhase,
    result: result
  };
}
