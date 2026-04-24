function atividades_extractJustificativaIdNumber_(value) {
  var text = String(value || '').trim().toUpperCase();
  var match = text.match(/^JUS-(\d+)$/);
  return match ? Number(match[1]) : 0;
}

function atividades_buildJustificativaIdFromNumber_(numberValue) {
  return ATIVIDADES_CFG.JUSTIFICATIVA_ID_PREFIX +
    atividades_padLeftNumber_(numberValue, ATIVIDADES_CFG.JUSTIFICATIVA_ID_PAD_LENGTH);
}

function atividades_listExistingJustificativaIdNumbers_() {
  var records = GEAPA_CORE.coreReadSheetRecords(atividades_getJustificativasFaltasSheet_(), {
    headerRow: 1
  });
  return records.map(function(record) {
    return atividades_extractJustificativaIdNumber_(record.ID_JUSTIFICATIVA);
  }).filter(function(numberValue) {
    return numberValue > 0;
  });
}

function atividades_getNextJustificativaId_() {
  var numbers = atividades_listExistingJustificativaIdNumbers_();
  var nextNumber = numbers.length ? Math.max.apply(null, numbers) + 1 : 1;
  return atividades_buildJustificativaIdFromNumber_(nextNumber);
}

function atividades_buildJustificativaKey_(periodCode, codigoAtividade, rga) {
  return [
    atividades_normalizeTextUpper_(periodCode),
    atividades_normalizeTextUpper_(codigoAtividade),
    atividades_normalizeTextUpper_(rga)
  ].join('|');
}

function atividades_writeObjectRowByHeaders_(sheet, rowNumber, headers, payload) {
  var targetRow = Number(rowNumber || 0);
  if (targetRow < 2) throw new Error('rowNumber invalido para escrita tabular: ' + rowNumber);

  var values = headers.map(function(header) {
    return Object.prototype.hasOwnProperty.call(payload || {}, header) ? payload[header] : '';
  });

  sheet.getRange(targetRow, 1, 1, headers.length).setValues([values]);
}

function atividades_buildCurrentPeriodActivityLookup_() {
  var ctx = atividades_getCurrentPeriodContext_();
  var periodRows = atividades_getCurrentPeriodActivitiesMap_();
  var activityRecords = GEAPA_CORE.coreReadSheetRecords(atividades_getAtividadesSheet_(), {
    headerRow: 1
  });
  var activitiesById = {};
  var byCode = {};

  activityRecords.forEach(function(record) {
    var idAtividade = String(record.ID_ATIVIDADE || '').trim();
    if (idAtividade) activitiesById[idAtividade] = record;
  });

  periodRows.forEach(function(row) {
    var code = String(row.COD_ATIVIDADE_PERIODO || '').trim();
    var idAtividade = String(row.ID_ATIVIDADE || '').trim();
    var atividade = activitiesById[idAtividade] || null;
    if (!code) return;

    byCode[code] = {
      periodo: ctx.code,
      codigoAtividade: code,
      colunaPresenca: String(row.COLUNA_PRESENCA || '').trim(),
      idAtividade: idAtividade,
      dataAtividade: atividades_parseDateOrNull_(row.DATA_ATIVIDADE),
      titulo: String(row.TITULO || '').trim(),
      contaPresenca: atividades_isTruthySim_(row.CONTA_PRESENCA),
      contaFalta: atividades_isTruthySim_(row.CONTA_FALTA),
      cargaHoraria: row.CARGA_HORARIA || '',
      atividadeRecord: atividade
    };
  });

  return {
    ctx: ctx,
    periodRows: periodRows,
    byCode: byCode,
    activitiesById: activitiesById
  };
}

function atividades_buildDateTimeFromDateAndTime_(dateValue, timeValue, opts) {
  var dateObj = atividades_parseDateOrNull_(dateValue);
  if (!dateObj) return null;

  var base = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0, 0, 0, 0);
  var minutes = atividades_parseTimeValueToMinutes_(timeValue);
  if (minutes === null) {
    if (opts && opts.endOfDayWhenMissing) {
      base.setHours(23, 59, 59, 999);
    }
    return base;
  }

  base.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return base;
}

function atividades_addHours_(dateValue, totalHours) {
  var dateObj = atividades_parseDateOrNull_(dateValue);
  if (!dateObj) return null;
  return new Date(dateObj.getTime() + (Number(totalHours || 0) * 60 * 60 * 1000));
}

function atividades_calculateJustificativaDeadline_(activityLookupItem) {
  var activityRecord = activityLookupItem && activityLookupItem.atividadeRecord ? activityLookupItem.atividadeRecord : null;
  var baseDate = atividades_buildDateTimeFromDateAndTime_(
    activityRecord ? activityRecord.DATA_ATIVIDADE : (activityLookupItem ? activityLookupItem.dataAtividade : null),
    activityRecord ? activityRecord.HORARIO_FIM : null,
    { endOfDayWhenMissing: true }
  );

  return baseDate
    ? atividades_addHours_(baseDate, ATIVIDADES_CFG.JUSTIFICATIVAS.NOTIFICATION_WINDOW_HOURS)
    : null;
}

function atividades_pickJustificativaFormField_(record, aliases) {
  return atividades_pickRecordField_(record, aliases);
}

function atividades_normalizeYesNoValue_(value) {
  var normalized = atividades_normalizeTextUpper_(value);
  if (['SIM', 'S', 'TRUE', 'VERDADEIRO', 'YES'].indexOf(normalized) >= 0) return 'SIM';
  if (['NAO', 'NÃO', 'N', 'FALSE', 'FALSO', 'NO'].indexOf(normalized) >= 0) return 'NAO';
  return String(value || '').trim() ? String(value || '').trim() : 'NAO';
}

function atividades_mergeObservationText_(values) {
  var seen = {};
  var out = [];

  (values || []).forEach(function(value) {
    var text = String(value || '').trim();
    var key = atividades_normalizeTextUpper_(text);
    if (!text || seen[key]) return;
    seen[key] = true;
    out.push(text);
  });

  return out.join(' | ');
}

function atividades_extractJustificativaFormRecord_(record) {
  var cfg = ATIVIDADES_CFG.JUSTIFICATIVAS_FORM_FIELDS;
  return {
    dataEnvio: atividades_parseDateOrNull_(atividades_pickJustificativaFormField_(record, cfg.dataEnvio)),
    nomeCompleto: String(atividades_pickJustificativaFormField_(record, cfg.nomeCompleto) || '').trim(),
    rga: String(atividades_pickJustificativaFormField_(record, cfg.rga) || '').trim(),
    codigoAtividade: String(atividades_pickJustificativaFormField_(record, cfg.codigoAtividade) || '').trim(),
    motivoAusencia: atividades_normalizeTextUpper_(atividades_pickJustificativaFormField_(record, cfg.motivoAusencia)),
    descricaoJustificativa: String(atividades_pickJustificativaFormField_(record, cfg.descricaoJustificativa) || '').trim(),
    possuiDocumento: atividades_normalizeYesNoValue_(atividades_pickJustificativaFormField_(record, cfg.possuiDocumento)),
    linkDocumento: String(atividades_pickJustificativaFormField_(record, cfg.linkDocumento) || '').trim(),
    observacoes: String(atividades_pickJustificativaFormField_(record, cfg.observacoes) || '').trim()
  };
}

function atividades_readJustificativasState_() {
  var sheet = atividades_getJustificativasFaltasSheet_();
  var records = GEAPA_CORE.coreReadSheetRecords(sheet, { headerRow: 1 });
  var byKey = {};
  var rows = [];

  records.forEach(function(record, index) {
    var periodCode = String(record.PERIODO || '').trim();
    var codigoAtividade = String(record.CODIGO_ATIVIDADE || '').trim();
    var rga = String(record.RGA || '').trim();
    var key = atividades_buildJustificativaKey_(periodCode, codigoAtividade, rga);
    var rowInfo = {
      rowNumber: index + 2,
      record: record,
      key: key
    };

    rows.push(rowInfo);
    if (periodCode && codigoAtividade && rga) {
      byKey[key] = rowInfo;
    }
  });

  return {
    sheet: sheet,
    headers: ATIVIDADES_SCHEMA.JUSTIFICATIVAS_FALTAS.slice(),
    rows: rows,
    byKey: byKey
  };
}

function atividades_buildJustificativaOfficialPayload_(formEntry, activityLookup, existingRecord) {
  var activityInfo = activityLookup.byCode[formEntry.codigoAtividade] || null;
  var existing = existingRecord || {};
  var deadline = activityInfo ? atividades_calculateJustificativaDeadline_(activityInfo) : null;
  var isLate = !!(deadline && formEntry.dataEnvio && formEntry.dataEnvio.getTime() > deadline.getTime());
  var observations = atividades_mergeObservationText_([
    existing.OBSERVACOES || '',
    formEntry.observacoes || '',
    activityInfo ? '' : 'CODIGO_ATIVIDADE_NAO_LOCALIZADO_NO_PERIODO_VIGENTE',
    activityInfo && !activityInfo.contaFalta ? 'ATIVIDADE_MARCADA_COMO_NAO_CONTABILIZA_FALTA' : '',
    isLate ? 'ENVIO_FORA_DO_PRAZO_DE_48H' : ''
  ]);

  return {
    ID_JUSTIFICATIVA: String(existing.ID_JUSTIFICATIVA || '').trim() || atividades_getNextJustificativaId_(),
    PERIODO: String(existing.PERIODO || '').trim() || activityLookup.ctx.code,
    CODIGO_ATIVIDADE: formEntry.codigoAtividade,
    ID_ATIVIDADE: activityInfo ? activityInfo.idAtividade : String(existing.ID_ATIVIDADE || '').trim(),
    RGA: formEntry.rga,
    NOME_MEMBRO: formEntry.nomeCompleto || String(existing.NOME_MEMBRO || '').trim(),
    DATA_ATIVIDADE: activityInfo ? activityInfo.dataAtividade : (existing.DATA_ATIVIDADE || ''),
    TITULO_ATIVIDADE: activityInfo ? activityInfo.titulo : String(existing.TITULO_ATIVIDADE || '').trim(),
    DATA_LIMITE_JUSTIFICATIVA: deadline || existing.DATA_LIMITE_JUSTIFICATIVA || '',
    MOTIVO_DECLARADO: formEntry.motivoAusencia || String(existing.MOTIVO_DECLARADO || '').trim(),
    DESCRICAO_JUSTIFICATIVA: formEntry.descricaoJustificativa || String(existing.DESCRICAO_JUSTIFICATIVA || '').trim(),
    POSSUI_DOCUMENTO_COMPROBATORIO: formEntry.possuiDocumento || String(existing.POSSUI_DOCUMENTO_COMPROBATORIO || '').trim() || 'NAO',
    LINK_DOCUMENTO_COMPROBATORIO: formEntry.linkDocumento || String(existing.LINK_DOCUMENTO_COMPROBATORIO || '').trim(),
    STATUS_ANALISE: String(existing.STATUS_ANALISE || '').trim() || ATIVIDADES_CFG.JUSTIFICATIVAS.DEFAULT_ANALYSIS_STATUS,
    DATA_ENVIO: formEntry.dataEnvio || existing.DATA_ENVIO || '',
    DATA_ANALISE: existing.DATA_ANALISE || '',
    ANALISADO_POR: String(existing.ANALISADO_POR || '').trim(),
    DECISAO_APLICADA_NA_PRESENCA: String(existing.DECISAO_APLICADA_NA_PRESENCA || '').trim() || ATIVIDADES_CFG.JUSTIFICATIVAS.DEFAULT_DECISION_STATUS,
    VALOR_ANTES: String(existing.VALOR_ANTES || '').trim(),
    VALOR_DEPOIS: String(existing.VALOR_DEPOIS || '').trim(),
    OBSERVACOES: observations
  };
}

function atividades_importarJustificativasFaltas_() {
  atividades_garantirEstruturasFixasV1_();

  var state = atividades_readJustificativasState_();
  var activityLookup = atividades_buildCurrentPeriodActivityLookup_();
  var rawRecords = GEAPA_CORE.coreReadSheetRecords(atividades_getJustificativasFormSheet_(), {
    headerRow: 1
  }).map(function(record, index) {
    return {
      index: index,
      formEntry: atividades_extractJustificativaFormRecord_(record)
    };
  }).sort(function(a, b) {
    var aTime = a.formEntry.dataEnvio ? a.formEntry.dataEnvio.getTime() : a.index;
    var bTime = b.formEntry.dataEnvio ? b.formEntry.dataEnvio.getTime() : b.index;
    if (aTime !== bTime) return aTime - bTime;
    return a.index - b.index;
  });

  var inserted = 0;
  var updated = 0;
  var skipped = [];

  rawRecords.forEach(function(item) {
    var formEntry = item.formEntry;
    if (!formEntry.rga || !formEntry.codigoAtividade) {
      skipped.push({
        index: item.index,
        reason: 'missing_rga_or_codigo_atividade'
      });
      return;
    }

    var key = atividades_buildJustificativaKey_(
      activityLookup.ctx.code,
      formEntry.codigoAtividade,
      formEntry.rga
    );
    var existing = state.byKey[key] || null;
    var existingRecord = existing ? existing.record : null;
    var payload = atividades_buildJustificativaOfficialPayload_(formEntry, activityLookup, existingRecord);

    if (existing) {
      atividades_writeObjectRowByHeaders_(state.sheet, existing.rowNumber, state.headers, payload);
      existing.record = payload;
      updated++;
    } else {
      GEAPA_CORE.coreAppendObjectByHeaders(state.sheet, payload, { headerRow: 1 });
      state.byKey[key] = {
        rowNumber: state.sheet.getLastRow(),
        record: payload,
        key: key
      };
      inserted++;
    }
  });

  atividades_logEvento_({
    TIPO_EVENTO_LOG: ATIVIDADES_CFG.JUSTIFICATIVAS_LOG_TYPES.IMPORT_JUSTIFICATIVA,
    STATUS: 'OK',
    ACAO_EXECUTADA: 'Importar justificativas da planilha bruta para a aba oficial',
    RESULTADO: activityLookup.ctx.code,
    OBSERVACOES: 'Inseridas=' + inserted + ' | Atualizadas=' + updated + ' | Ignoradas=' + skipped.length
  });

  return {
    ok: true,
    periodCode: activityLookup.ctx.code,
    inserted: inserted,
    updated: updated,
    skipped: skipped
  };
}

function atividades_buildCurrentPresenceState_() {
  var ctx = atividades_getCurrentPeriodContext_();
  var operational = atividades_getOperationalHolder_().spreadsheet;
  var sheet = atividades_findSheetByName_(operational, ctx.presenceSheetName);
  if (!sheet) {
    throw new Error('Aba dinamica de presencas nao encontrada: ' + ctx.presenceSheetName);
  }

  var headerMap = GEAPA_CORE.coreHeaderMap(sheet, 1);
  var records = GEAPA_CORE.coreReadSheetRecords(sheet, { headerRow: 1 });
  var byRga = {};

  records.forEach(function(record, index) {
    var rga = String(record.RGA || '').trim();
    if (!rga) return;
    byRga[rga] = {
      rowNumber: index + 2,
      record: record
    };
  });

  return {
    ctx: ctx,
    sheet: sheet,
    headerMap: headerMap,
    records: records,
    byRga: byRga
  };
}

function atividades_isMemberApplicableForActivityDate_(presenceRecord, activityDate) {
  var activityDateObj = atividades_parseDateOrNull_(activityDate);
  if (!activityDateObj) return false;

  var entryDate = atividades_parseDateOrNull_(presenceRecord.DATA_ENTRADA_NO_PERIODO);
  var exitDate = atividades_parseDateOrNull_(presenceRecord.DATA_SAIDA_NO_PERIODO);

  if (entryDate && activityDateObj < entryDate) return false;
  if (exitDate && activityDateObj > exitDate) return false;
  return true;
}

function atividades_locatePresenceTargetForJustificativa_(justificativaRecord, activityLookup, presenceState) {
  var activityInfo = activityLookup.byCode[String(justificativaRecord.CODIGO_ATIVIDADE || '').trim()] || null;
  if (!activityInfo) {
    return { ok: false, reason: 'activity_code_not_found' };
  }

  var presenceItem = presenceState.byRga[String(justificativaRecord.RGA || '').trim()] || null;
  if (!presenceItem) {
    return { ok: false, reason: 'member_not_found_in_presence' };
  }

  var colName = String(activityInfo.colunaPresenca || '').trim();
  var colNumber = GEAPA_CORE.coreGetCol(presenceState.headerMap, colName);
  if (!colName || !colNumber) {
    return { ok: false, reason: 'presence_column_not_found' };
  }

  return {
    ok: true,
    rowNumber: presenceItem.rowNumber,
    colNumber: colNumber,
    colName: colName,
    currentValue: String(presenceState.sheet.getRange(presenceItem.rowNumber, colNumber).getDisplayValue() || '').trim(),
    presenceRecord: presenceItem.record,
    activityInfo: activityInfo
  };
}

function atividades_writeJustificativaDecisionFields_(sheet, rowNumber, fields) {
  var headerMap = GEAPA_CORE.coreHeaderMap(sheet, 1);
  Object.keys(fields || {}).forEach(function(headerName) {
    if (!GEAPA_CORE.coreGetCol(headerMap, headerName)) return;
    GEAPA_CORE.coreWriteCellByHeader(sheet, rowNumber, headerMap, headerName, fields[headerName], {
      oneBased: true
    });
  });
}

function atividades_registrarAnaliseJustificativaSemAplicacao_(state, rowEntry, opts) {
  opts = opts || {};
  var record = rowEntry && rowEntry.record ? rowEntry.record : {};
  var analysisDate = opts.analysisDate || record.DATA_ANALISE || new Date();
  var analyzedBy = String(opts.analyzedBy || record.ANALISADO_POR || '').trim() || Session.getActiveUser().getEmail();
  var note = 'ANALISE_SEM_APLICACAO_AUTOMATICA:' + String(opts.reason || 'motivo_nao_informado').trim();
  var currentValue = String(opts.currentValue || '').trim();

  if (currentValue) {
    note += ' | valor_atual=' + currentValue;
  }

  var fields = {
    DATA_ANALISE: analysisDate,
    ANALISADO_POR: analyzedBy,
    DECISAO_APLICADA_NA_PRESENCA: String(record.DECISAO_APLICADA_NA_PRESENCA || '').trim() || ATIVIDADES_CFG.JUSTIFICATIVAS.DEFAULT_DECISION_STATUS,
    OBSERVACOES: atividades_mergeObservationText_([
      record.OBSERVACOES || '',
      note
    ])
  };

  if (currentValue) {
    fields.VALOR_ANTES = String(record.VALOR_ANTES || '').trim() || currentValue;
    fields.VALOR_DEPOIS = String(record.VALOR_DEPOIS || '').trim() || currentValue;
  }

  atividades_writeJustificativaDecisionFields_(state.sheet, rowEntry.rowNumber, fields);
  Object.keys(fields).forEach(function(headerName) {
    record[headerName] = fields[headerName];
  });

  atividades_logEvento_({
    TIPO_EVENTO_LOG: ATIVIDADES_CFG.JUSTIFICATIVAS_LOG_TYPES.APLICACAO_JUSTIFICATIVA,
    STATUS: 'OK',
    ACAO_EXECUTADA: 'Registrar analise sem reflexo automatico na presenca',
    RESULTADO: String(record.ID_JUSTIFICATIVA || '').trim(),
    OBSERVACOES: 'RGA=' + record.RGA + ' | CODIGO_ATIVIDADE=' + record.CODIGO_ATIVIDADE + ' | motivo=' + String(opts.reason || 'motivo_nao_informado').trim() +
      (currentValue ? ' | valor_atual=' + currentValue : '')
  });

  return {
    ok: true,
    applied: false,
    analysisRecorded: true,
    rowNumber: rowEntry.rowNumber,
    reason: String(opts.reason || 'motivo_nao_informado').trim(),
    currentValue: currentValue || ''
  };
}

function atividades_sortJustificativasChronologically_(rows) {
  return (rows || []).slice().sort(function(a, b) {
    var aData = atividades_parseDateOrNull_(a.record.DATA_ATIVIDADE) || atividades_parseDateOrNull_(a.record.DATA_ENVIO);
    var bData = atividades_parseDateOrNull_(b.record.DATA_ATIVIDADE) || atividades_parseDateOrNull_(b.record.DATA_ENVIO);
    var aTime = aData ? aData.getTime() : 0;
    var bTime = bData ? bData.getTime() : 0;
    if (aTime !== bTime) return aTime - bTime;
    return String(a.record.ID_JUSTIFICATIVA || '').localeCompare(String(b.record.ID_JUSTIFICATIVA || ''), 'pt-BR');
  });
}

function atividades_recalcularAbonosForMemberPeriod_(rga, periodCode) {
  var normalizedRga = String(rga || '').trim();
  var normalizedPeriod = String(periodCode || '').trim();
  if (!normalizedRga || !normalizedPeriod) {
    return { ok: true, updated: 0, skipped: true, reason: 'missing_rga_or_period' };
  }

  var state = atividades_readJustificativasState_();
  var activityLookup = atividades_buildCurrentPeriodActivityLookup_();
  if (activityLookup.ctx.code !== normalizedPeriod) {
    return { ok: true, updated: 0, skipped: true, reason: 'outside_current_period' };
  }

  var presenceState = atividades_buildCurrentPresenceState_();
  var deferidas = atividades_sortJustificativasChronologically_(state.rows.filter(function(item) {
    var record = item.record || {};
    return String(record.PERIODO || '').trim() === normalizedPeriod &&
      String(record.RGA || '').trim() === normalizedRga &&
      atividades_normalizeTextUpper_(record.STATUS_ANALISE) === ATIVIDADES_CFG.JUSTIFICATIVAS_STATUS_FINAIS.DEFERIDA;
  }));

  var updated = [];

  deferidas.forEach(function(item, index) {
    var desiredValue = ((index + 1) % 2 === 0) ? 'A' : 'J';
    var target = atividades_locatePresenceTargetForJustificativa_(item.record, activityLookup, presenceState);
    if (!target.ok) return;
    if (!atividades_isMemberApplicableForActivityDate_(target.presenceRecord, item.record.DATA_ATIVIDADE)) return;

    var currentValue = String(presenceState.sheet.getRange(target.rowNumber, target.colNumber).getDisplayValue() || '').trim();
    if (currentValue !== desiredValue) {
      presenceState.sheet.getRange(target.rowNumber, target.colNumber).setValue(desiredValue);
      updated.push({
        rowNumber: item.rowNumber,
        rga: normalizedRga,
        codigoAtividade: item.record.CODIGO_ATIVIDADE,
        from: currentValue,
        to: desiredValue
      });
    }

    atividades_writeJustificativaDecisionFields_(state.sheet, item.rowNumber, {
      DECISAO_APLICADA_NA_PRESENCA: desiredValue === 'A' ? 'J_PARA_A' : 'F_PARA_J',
      VALOR_ANTES: String(item.record.VALOR_ANTES || '').trim() || currentValue,
      VALOR_DEPOIS: desiredValue
    });
  });

  if (updated.length) {
    atividades_logEvento_({
      TIPO_EVENTO_LOG: ATIVIDADES_CFG.JUSTIFICATIVAS_LOG_TYPES.ABONO_JUSTIFICATIVA,
      STATUS: 'OK',
      ACAO_EXECUTADA: 'Recalcular abonos de justificativas deferidas no periodo',
      RESULTADO: normalizedRga,
      OBSERVACOES: 'Periodo=' + normalizedPeriod + ' | ajustes=' + updated.length
    });
  }

  return {
    ok: true,
    updated: updated.length,
    changes: updated
  };
}

function atividades_aplicarDecisaoJustificativaRow_(rowNumber, opts) {
  opts = opts || {};
  var targetRow = Number(rowNumber || 0);
  if (targetRow < 2) throw new Error('rowNumber invalido para aplicar justificativa: ' + rowNumber);

  atividades_garantirEstruturasFixasV1_();

  var state = atividades_readJustificativasState_();
  var rowEntry = state.rows.filter(function(item) {
    return item.rowNumber === targetRow;
  })[0];
  if (!rowEntry) {
    return { ok: true, applied: false, reason: 'row_not_found' };
  }

  var record = rowEntry.record;
  var statusAnalise = atividades_normalizeTextUpper_(record.STATUS_ANALISE);
  if (
    statusAnalise !== ATIVIDADES_CFG.JUSTIFICATIVAS_STATUS_FINAIS.DEFERIDA &&
    statusAnalise !== ATIVIDADES_CFG.JUSTIFICATIVAS_STATUS_FINAIS.INDEFERIDA
  ) {
    return { ok: true, applied: false, reason: 'analysis_not_final' };
  }

  var activityLookup = atividades_buildCurrentPeriodActivityLookup_();
  var analysisDate = record.DATA_ANALISE || new Date();
  var analyzedBy = String(record.ANALISADO_POR || '').trim() || Session.getActiveUser().getEmail();

  if (String(record.PERIODO || '').trim() !== activityLookup.ctx.code) {
    return atividades_registrarAnaliseJustificativaSemAplicacao_(state, rowEntry, {
      reason: 'outside_current_period',
      analysisDate: analysisDate,
      analyzedBy: analyzedBy
    });
  }

  var presenceState = atividades_buildCurrentPresenceState_();
  var target = atividades_locatePresenceTargetForJustificativa_(record, activityLookup, presenceState);
  if (!target.ok) {
    return atividades_registrarAnaliseJustificativaSemAplicacao_(state, rowEntry, {
      reason: target.reason,
      analysisDate: analysisDate,
      analyzedBy: analyzedBy
    });
  }

  if (!atividades_isMemberApplicableForActivityDate_(target.presenceRecord, record.DATA_ATIVIDADE)) {
    return atividades_registrarAnaliseJustificativaSemAplicacao_(state, rowEntry, {
      reason: 'member_not_applicable_to_activity_date',
      analysisDate: analysisDate,
      analyzedBy: analyzedBy,
      currentValue: target.currentValue
    });
  }

  var currentValue = target.currentValue;

  if (statusAnalise === ATIVIDADES_CFG.JUSTIFICATIVAS_STATUS_FINAIS.INDEFERIDA) {
    if (currentValue !== 'F') {
      return atividades_registrarAnaliseJustificativaSemAplicacao_(state, rowEntry, {
        reason: 'presence_value_not_f_for_indeferida',
        analysisDate: analysisDate,
        analyzedBy: analyzedBy,
        currentValue: currentValue
      });
    }

    atividades_writeJustificativaDecisionFields_(state.sheet, targetRow, {
      DATA_ANALISE: analysisDate,
      ANALISADO_POR: analyzedBy,
      DECISAO_APLICADA_NA_PRESENCA: 'F_MANTIDA',
      VALOR_ANTES: 'F',
      VALOR_DEPOIS: 'F'
    });

    atividades_logEvento_({
      TIPO_EVENTO_LOG: ATIVIDADES_CFG.JUSTIFICATIVAS_LOG_TYPES.APLICACAO_JUSTIFICATIVA,
      STATUS: 'OK',
      ACAO_EXECUTADA: 'Manter falta apos indeferimento de justificativa',
      RESULTADO: String(record.ID_JUSTIFICATIVA || '').trim(),
      OBSERVACOES: 'RGA=' + record.RGA + ' | CODIGO_ATIVIDADE=' + record.CODIGO_ATIVIDADE
    });

    return {
      ok: true,
      applied: true,
      rowNumber: targetRow,
      decision: 'F_MANTIDA',
      disciplinary: atividades_recalcularMotorDisciplinarPeriodoVigente_({
        rowNumbers: [target.rowNumber],
        logTransitions: true
      }),
      notification: atividades_notificarResultadoJustificativa_(Object.assign({}, record, {
        EMAIL: target.presenceRecord.EMAIL || record.EMAIL || '',
        NOME_MEMBRO: record.NOME_MEMBRO || target.presenceRecord.NOME_MEMBRO || ''
      }), {
        processOutbox: opts.processOutbox !== false
      })
    };
  }

  if (currentValue !== 'F' && currentValue !== 'J' && currentValue !== 'A') {
    return atividades_registrarAnaliseJustificativaSemAplicacao_(state, rowEntry, {
      reason: 'presence_value_not_eligible_for_deferida',
      analysisDate: analysisDate,
      analyzedBy: analyzedBy,
      currentValue: currentValue
    });
  }

  if (currentValue === 'F') {
    presenceState.sheet.getRange(target.rowNumber, target.colNumber).setValue('J');
  }

  atividades_writeJustificativaDecisionFields_(state.sheet, targetRow, {
    DATA_ANALISE: analysisDate,
    ANALISADO_POR: analyzedBy,
    DECISAO_APLICADA_NA_PRESENCA: 'F_PARA_J',
    VALOR_ANTES: currentValue,
    VALOR_DEPOIS: 'J'
  });

  var abono = atividades_recalcularAbonosForMemberPeriod_(record.RGA, record.PERIODO);

  atividades_logEvento_({
    TIPO_EVENTO_LOG: ATIVIDADES_CFG.JUSTIFICATIVAS_LOG_TYPES.APLICACAO_JUSTIFICATIVA,
    STATUS: 'OK',
    ACAO_EXECUTADA: 'Aplicar justificativa deferida na presenca oficial',
    RESULTADO: String(record.ID_JUSTIFICATIVA || '').trim(),
    OBSERVACOES: 'RGA=' + record.RGA + ' | CODIGO_ATIVIDADE=' + record.CODIGO_ATIVIDADE +
      ' | abonos_recalculados=' + (abono.updated || 0)
  });

  return {
    ok: true,
    applied: true,
    rowNumber: targetRow,
    decision: 'F_PARA_J',
    abono: abono,
    disciplinary: atividades_recalcularMotorDisciplinarPeriodoVigente_({
      rowNumbers: [target.rowNumber],
      logTransitions: true
    }),
    notification: atividades_notificarResultadoJustificativa_(Object.assign({}, record, {
      EMAIL: target.presenceRecord.EMAIL || record.EMAIL || '',
      NOME_MEMBRO: record.NOME_MEMBRO || target.presenceRecord.NOME_MEMBRO || '',
      DECISAO_APLICADA_NA_PRESENCA: abono && abono.changes && abono.changes.some(function(change) {
        return change.codigoAtividade === record.CODIGO_ATIVIDADE && change.to === 'A';
      }) ? 'J_PARA_A' : 'F_PARA_J'
    }), {
      processOutbox: opts.processOutbox !== false
    })
  };
}

function atividades_aplicarDecisoesJustificativas_() {
  atividades_garantirEstruturasFixasV1_();
  var state = atividades_readJustificativasState_();
  var activityLookup = atividades_buildCurrentPeriodActivityLookup_();
  var pendingRows = state.rows.filter(function(item) {
    var status = atividades_normalizeTextUpper_(item.record.STATUS_ANALISE);
    var applied = atividades_normalizeTextUpper_(item.record.DECISAO_APLICADA_NA_PRESENCA);
    return String(item.record.PERIODO || '').trim() === activityLookup.ctx.code &&
      (status === ATIVIDADES_CFG.JUSTIFICATIVAS_STATUS_FINAIS.DEFERIDA ||
       status === ATIVIDADES_CFG.JUSTIFICATIVAS_STATUS_FINAIS.INDEFERIDA) &&
      (!applied || applied === 'NAO_APLICADA');
  });

  var results = pendingRows.map(function(item) {
    return atividades_aplicarDecisaoJustificativaRow_(item.rowNumber, {
      processOutbox: false
    });
  });

  var shouldProcessOutbox = results.some(function(result) {
    return result && result.notification && result.notification.queue && result.notification.queue.queued;
  });
  var outbox = shouldProcessOutbox ? GEAPA_CORE.coreMailProcessOutbox() : {
    ok: true,
    processed: 0
  };

  return {
    ok: true,
    periodCode: activityLookup.ctx.code,
    processed: results.length,
    applied: results.filter(function(result) { return result.applied; }).length,
    results: results,
    outbox: outbox
  };
}

function atividades_recalcularAbonosPeriodoVigente_() {
  atividades_garantirEstruturasFixasV1_();
  var state = atividades_readJustificativasState_();
  var ctx = atividades_getCurrentPeriodContext_();
  var rgas = {};

  state.rows.forEach(function(item) {
    var period = String(item.record.PERIODO || '').trim();
    var rga = String(item.record.RGA || '').trim();
    var status = atividades_normalizeTextUpper_(item.record.STATUS_ANALISE);
    if (!rga || period !== ctx.code) return;
    if (status !== ATIVIDADES_CFG.JUSTIFICATIVAS_STATUS_FINAIS.DEFERIDA) return;
    rgas[rga] = true;
  });

  var results = Object.keys(rgas).sort().map(function(rga) {
    return atividades_recalcularAbonosForMemberPeriod_(rga, ctx.code);
  });

  return {
    ok: true,
    periodCode: ctx.code,
    affectedMembers: results.length,
    totalChanges: results.reduce(function(sum, item) {
      return sum + Number(item.updated || 0);
    }, 0),
    results: results
  };
}
