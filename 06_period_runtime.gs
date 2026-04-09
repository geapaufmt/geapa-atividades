function atividades_buildLogId_() {
  return 'ATL-' + Utilities.getUuid().slice(0, 8).toUpperCase();
}

function atividades_logEvento_(payload) {
  var sheet = atividades_getLogSheet_();
  var rowPayload = {
    ID_LOG: atividades_buildLogId_(),
    ID_ATIVIDADE: payload && payload.ID_ATIVIDADE ? payload.ID_ATIVIDADE : '',
    TIPO_EVENTO_LOG: payload && payload.TIPO_EVENTO_LOG ? payload.TIPO_EVENTO_LOG : '',
    STATUS: payload && payload.STATUS ? payload.STATUS : '',
    ACAO_EXECUTADA: payload && payload.ACAO_EXECUTADA ? payload.ACAO_EXECUTADA : '',
    RESULTADO: payload && payload.RESULTADO ? payload.RESULTADO : '',
    ID_SAIDA_CENTRAL: payload && payload.ID_SAIDA_CENTRAL ? payload.ID_SAIDA_CENTRAL : '',
    ID_THREAD_GMAIL: payload && payload.ID_THREAD_GMAIL ? payload.ID_THREAD_GMAIL : '',
    ID_MENSAGEM_GMAIL: payload && payload.ID_MENSAGEM_GMAIL ? payload.ID_MENSAGEM_GMAIL : '',
    OBSERVACOES: payload && payload.OBSERVACOES ? payload.OBSERVACOES : '',
    CRIADO_EM: new Date()
  };

  GEAPA_CORE.coreAppendObjectByHeaders(sheet, rowPayload, { headerRow: 1 });
  return rowPayload;
}

function atividades_createSheetWithHeaders_(targetSpreadsheet, newName, headers, logicalName) {
  var existing = atividades_findSheetByName_(targetSpreadsheet, newName);
  if (existing) return existing;

  var inserted = targetSpreadsheet.insertSheet(newName, targetSpreadsheet.getNumSheets());
  atividades_writeTabularPayload_(inserted, headers.slice(), []);
  atividades_applySheetUx_(inserted, logicalName || newName);
  return inserted;
}

function atividades_garantirEstruturasFixasV1_() {
  var operational = atividades_getOperationalHolder_().spreadsheet;
  var created = [];
  var cfg = ATIVIDADES_CFG.FIXED_SHEETS.JUSTIFICATIVAS;
  var targetName = cfg.sheetNames[0];

  if (!atividades_findSheetByName_(operational, targetName)) {
    atividades_createSheetWithHeaders_(
      operational,
      targetName,
      ATIVIDADES_SCHEMA.JUSTIFICATIVAS_FALTAS,
      'Justificativas_Faltas'
    );
    created.push(targetName);
    atividades_logEvento_({
      TIPO_EVENTO_LOG: 'CRIACAO_ABA_FIXA',
      STATUS: 'OK',
      ACAO_EXECUTADA: 'Criar aba fixa de justificativas de faltas',
      RESULTADO: targetName,
      OBSERVACOES: 'Criada automaticamente pela V1 do fluxo de faltas.'
    });
  }

  return {
    ok: true,
    created: created
  };
}

function atividades_buildUniqueSheetName_(spreadsheet, baseName, exceptSheetId) {
  var wanted = String(baseName || '').trim();
  if (!wanted) throw new Error('baseName obrigatorio para nome de aba.');

  var existing = atividades_findSheetByName_(spreadsheet, wanted);
  if (!existing || (exceptSheetId && existing.getSheetId() === exceptSheetId)) {
    return wanted;
  }

  var suffix = 2;
  while (true) {
    var candidate = wanted + '__' + suffix;
    var candidateSheet = atividades_findSheetByName_(spreadsheet, candidate);
    if (!candidateSheet || (exceptSheetId && candidateSheet.getSheetId() === exceptSheetId)) {
      return candidate;
    }
    suffix++;
  }
}

function atividades_markArchivedSheet_(sheet) {
  var currentName = sheet.getName();
  if (currentName.indexOf(ATIVIDADES_CFG.ARCHIVE.HIDDEN_PREFIX) !== 0) {
    var targetName = atividades_buildUniqueSheetName_(
      sheet.getParent(),
      ATIVIDADES_CFG.ARCHIVE.HIDDEN_PREFIX + currentName,
      sheet.getSheetId()
    );
    sheet.setName(targetName);
  }

  try {
    sheet.hideSheet();
  } catch (err) {
    // ignora caso nao seja possivel ocultar
  }
}

function atividades_copySheetToArchiveSpreadsheet_(sheet, targetSpreadsheet, targetSheetName) {
  var effectiveName = String(targetSheetName || sheet.getName() || '').trim();
  var existing = atividades_findSheetByName_(targetSpreadsheet, effectiveName);
  if (existing) {
    return {
      copied: false,
      targetSheet: existing,
      reason: 'already_exists'
    };
  }

  var copied = sheet.copyTo(targetSpreadsheet);
  copied.setName(effectiveName);
  targetSpreadsheet.setActiveSheet(copied);
  targetSpreadsheet.moveActiveSheet(targetSpreadsheet.getNumSheets());

  return {
    copied: true,
    targetSheet: copied
  };
}

function atividades_extractPeriodCodeFromDynamicSheetName_(sheetName) {
  var name = String(sheetName || '').trim();
  if (!name) return '';

  if (name.indexOf(ATIVIDADES_CFG.DYNAMIC_SHEET_PREFIXES.PERIODO_ATIVIDADES) === 0) {
    return name.slice(ATIVIDADES_CFG.DYNAMIC_SHEET_PREFIXES.PERIODO_ATIVIDADES.length);
  }

  if (name.indexOf(ATIVIDADES_CFG.DYNAMIC_SHEET_PREFIXES.PERIODO_PRESENCAS) === 0) {
    return name.slice(ATIVIDADES_CFG.DYNAMIC_SHEET_PREFIXES.PERIODO_PRESENCAS.length);
  }

  return '';
}

function atividades_groupOutdatedDynamicSheetsByPeriod_(outdatedEntries) {
  var grouped = {};

  (outdatedEntries || []).forEach(function(entry) {
    var periodCode = atividades_extractPeriodCodeFromDynamicSheetName_(entry.name);
    if (!periodCode) return;

    if (!grouped[periodCode]) {
      grouped[periodCode] = {
        periodCode: periodCode,
        activityEntry: null,
        presenceEntry: null
      };
    }

    if (entry.name.indexOf(ATIVIDADES_CFG.DYNAMIC_SHEET_PREFIXES.PERIODO_ATIVIDADES) === 0) {
      grouped[periodCode].activityEntry = entry;
    }

    if (entry.name.indexOf(ATIVIDADES_CFG.DYNAMIC_SHEET_PREFIXES.PERIODO_PRESENCAS) === 0) {
      grouped[periodCode].presenceEntry = entry;
    }
  });

  return Object.keys(grouped).sort().map(function(periodCode) {
    return grouped[periodCode];
  });
}

function atividades_findHistorySpreadsheetInFolder_(folder, spreadsheetName) {
  var iterator = folder.getFilesByName(spreadsheetName);
  while (iterator.hasNext()) {
    var file = iterator.next();
    return SpreadsheetApp.openById(file.getId());
  }
  return null;
}

function atividades_buildHistorySpreadsheetName_(periodCode) {
  return ATIVIDADES_CFG.HISTORY_ARCHIVE.SPREADSHEET_NAME_PREFIX + String(periodCode || '').trim();
}

function atividades_ensureHistorySpreadsheetForPeriod_(periodCode) {
  var historyFolder = atividades_getHistoryFolder_();
  var spreadsheetName = atividades_buildHistorySpreadsheetName_(periodCode);
  var existing = atividades_findHistorySpreadsheetInFolder_(historyFolder.folder, spreadsheetName);

  if (existing) {
    return {
      created: false,
      spreadsheet: existing,
      folder: historyFolder.folder,
      entry: historyFolder.entry,
      spreadsheetName: spreadsheetName
    };
  }

  var spreadsheet = SpreadsheetApp.create(spreadsheetName);
  var file = DriveApp.getFileById(spreadsheet.getId());

  try {
    file.moveTo(historyFolder.folder);
  } catch (err) {
    try {
      historyFolder.folder.addFile(file);
      DriveApp.getRootFolder().removeFile(file);
    } catch (innerErr) {
      throw new Error(
        'Nao foi possivel mover a planilha historica "' + spreadsheetName +
        '" para a pasta de historico. ' +
        'moveTo: ' + (err && err.message ? err.message : String(err)) +
        ' | addFile/removeFile: ' + (innerErr && innerErr.message ? innerErr.message : String(innerErr))
      );
    }
  }

  return {
    created: true,
    spreadsheet: spreadsheet,
    folder: historyFolder.folder,
    entry: historyFolder.entry,
    spreadsheetName: spreadsheetName
  };
}

function atividades_ensureHistoryMetaSheet_(spreadsheet) {
  var existing = atividades_findSheetByName_(spreadsheet, ATIVIDADES_CFG.HISTORY_ARCHIVE.META_SHEET_NAME);
  if (existing) return existing;

  var sheets = spreadsheet.getSheets();
  if (sheets.length === 1 &&
      sheets[0].getLastRow() <= 1 &&
      sheets[0].getLastColumn() <= 1 &&
      !String(sheets[0].getRange(1, 1).getDisplayValue() || '').trim()) {
    sheets[0].setName(ATIVIDADES_CFG.HISTORY_ARCHIVE.META_SHEET_NAME);
    return sheets[0];
  }

  return spreadsheet.insertSheet(ATIVIDADES_CFG.HISTORY_ARCHIVE.META_SHEET_NAME);
}

function atividades_writeHistoryMeta_(spreadsheet, payload) {
  var metaSheet = atividades_ensureHistoryMetaSheet_(spreadsheet);
  var headers = ATIVIDADES_SCHEMA.HISTORY_META.slice();
  var row = headers.map(function(header) {
    return payload && Object.prototype.hasOwnProperty.call(payload, header) ? payload[header] : '';
  });

  atividades_writeTabularPayload_(metaSheet, headers, [row]);
  atividades_applySheetUx_(metaSheet, ATIVIDADES_CFG.HISTORY_ARCHIVE.META_SHEET_NAME);
}

function atividades_removeEmptyDefaultSheets_(spreadsheet) {
  var sheets = spreadsheet.getSheets();
  sheets.forEach(function(sheet) {
    var name = String(sheet.getName() || '').trim();
    var isDefaultName = ['Sheet1', 'Planilha1', 'PAGINA1', 'Página1', 'Pagina1'].indexOf(name) >= 0;
    var isMeta = name === ATIVIDADES_CFG.HISTORY_ARCHIVE.META_SHEET_NAME;
    var isEmpty = sheet.getLastRow() <= 1 &&
      sheet.getLastColumn() <= 1 &&
      !String(sheet.getRange(1, 1).getDisplayValue() || '').trim();

    if (isDefaultName && !isMeta && isEmpty && spreadsheet.getSheets().length > 1) {
      spreadsheet.deleteSheet(sheet);
    }
  });
}

function atividades_archivePeriodGroup_(periodGroup) {
  if (!periodGroup.activityEntry && !periodGroup.presenceEntry) {
    return {
      skipped: true,
      reason: 'no_period_sheets',
      periodCode: periodGroup.periodCode
    };
  }

  var historyTarget = atividades_ensureHistorySpreadsheetForPeriod_(periodGroup.periodCode);
  var copyResults = [];

  if (periodGroup.activityEntry) {
    copyResults.push({
      kind: 'ATIVIDADES',
      entry: periodGroup.activityEntry,
      result: atividades_copySheetToArchiveSpreadsheet_(
        periodGroup.activityEntry.sheet,
        historyTarget.spreadsheet,
        periodGroup.activityEntry.name
      )
    });
  }

  if (periodGroup.presenceEntry) {
    copyResults.push({
      kind: 'PRESENCAS',
      entry: periodGroup.presenceEntry,
      result: atividades_copySheetToArchiveSpreadsheet_(
        periodGroup.presenceEntry.sheet,
        historyTarget.spreadsheet,
        periodGroup.presenceEntry.name
      )
    });
  }

  atividades_writeHistoryMeta_(historyTarget.spreadsheet, {
    PERIODO_ID: periodGroup.periodCode,
    ARQUIVADO_EM: new Date(),
    ORIGEM_PLANILHA_ID: atividades_getOperationalHolder_().spreadsheet.getId(),
    ORIGEM_PLANILHA_NOME: atividades_getOperationalHolder_().spreadsheet.getName(),
    ABA_ATIVIDADES_PERIODO: periodGroup.activityEntry ? periodGroup.activityEntry.name : '',
    ABA_PRESENCAS_PERIODO: periodGroup.presenceEntry ? periodGroup.presenceEntry.name : '',
    VERSAO_MODULO: ATIVIDADES_CFG.MODULE_VERSION,
    OBSERVACOES: 'Arquivo historico criado automaticamente na pasta ' + ATIVIDADES_CFG.HISTORY_ARCHIVE.FOLDER_NAME + '.'
  });
  atividades_removeEmptyDefaultSheets_(historyTarget.spreadsheet);

  copyResults.forEach(function(item) {
    if (ATIVIDADES_CFG.ARCHIVE.STRATEGY === 'DELETE') {
      if (item.result.copied || item.result.reason === 'already_exists') {
        item.entry.sheet.getParent().deleteSheet(item.entry.sheet);
      }
    } else {
      atividades_markArchivedSheet_(item.entry.sheet);
    }
  });

  var hadOperationalChange = copyResults.some(function(item) {
    return !item.entry.alreadyArchived || item.result.copied;
  });

  return {
    skipped: !historyTarget.created && !hadOperationalChange && copyResults.every(function(item) {
      return item.result.reason === 'already_exists';
    }),
    periodCode: periodGroup.periodCode,
    historySpreadsheetName: historyTarget.spreadsheetName,
    historySpreadsheetId: historyTarget.spreadsheet.getId(),
    createdHistorySpreadsheet: historyTarget.created,
    copiedSheets: copyResults.map(function(item) {
      return {
        kind: item.kind,
        sourceSheet: item.entry.name,
        copied: item.result.copied,
        reason: item.result.reason || ''
      };
    })
  };
}

function atividades_listOutdatedDynamicSheets_(currentCtx) {
  var operational = atividades_getOperationalHolder_().spreadsheet;
  var sheets = operational.getSheets();
  var out = [];

  sheets.forEach(function(sheet) {
    var rawName = sheet.getName();
    var alreadyArchived = rawName.indexOf(ATIVIDADES_CFG.ARCHIVE.HIDDEN_PREFIX) === 0;
    if (alreadyArchived) return;

    var effectiveName = rawName.indexOf(ATIVIDADES_CFG.ARCHIVE.HIDDEN_PREFIX) === 0
      ? rawName.slice(ATIVIDADES_CFG.ARCHIVE.HIDDEN_PREFIX.length)
      : rawName;

    var isDynamic = (
      effectiveName.indexOf(ATIVIDADES_CFG.DYNAMIC_SHEET_PREFIXES.PERIODO_ATIVIDADES) === 0 ||
      effectiveName.indexOf(ATIVIDADES_CFG.DYNAMIC_SHEET_PREFIXES.PERIODO_PRESENCAS) === 0
    );

    if (!isDynamic) return;
    if (effectiveName === currentCtx.activitySheetName || effectiveName === currentCtx.presenceSheetName) return;

    out.push({
      sheet: sheet,
      name: effectiveName,
      alreadyArchived: alreadyArchived
    });
  });

  return out;
}

function atividades_arquivarPeriodosAntigos_() {
  var ctx = atividades_getCurrentPeriodContext_();
  var outdated = atividades_listOutdatedDynamicSheets_(ctx);
  var grouped = atividades_groupOutdatedDynamicSheetsByPeriod_(outdated);
  var archived = [];

  grouped.forEach(function(periodGroup) {
    var archiveResult = atividades_archivePeriodGroup_(periodGroup);
    if (archiveResult.skipped) return;

    archived.push(archiveResult);
    atividades_logEvento_({
      TIPO_EVENTO_LOG: 'ARQUIVAMENTO_PERIODO',
      STATUS: 'OK',
      ACAO_EXECUTADA: 'Arquivar periodo antigo em planilha propria',
      RESULTADO: archiveResult.periodCode,
      OBSERVACOES: 'Destino: ' + archiveResult.historySpreadsheetName + ' | estrategia=' + ATIVIDADES_CFG.ARCHIVE.STRATEGY
    });
  });

  return {
    ok: true,
    archived: archived,
    archivedCount: archived.length,
    currentPeriodCode: ctx.code
  };
}

function atividades_garantirPeriodoVigente_() {
  var ctx = atividades_getCurrentPeriodContext_();
  var operational = atividades_getOperationalHolder_().spreadsheet;
  var created = [];

  atividades_arquivarPeriodosAntigos_();

  if (!atividades_findSheetByName_(operational, ctx.activitySheetName)) {
    atividades_createSheetWithHeaders_(
      operational,
      ctx.activitySheetName,
      ATIVIDADES_SCHEMA.PERIODO_ATIVIDADES,
      ATIVIDADES_CFG.DYNAMIC_SHEET_PROFILES.PERIODO_ATIVIDADES
    );
    created.push(ctx.activitySheetName);
    atividades_logEvento_({
      TIPO_EVENTO_LOG: 'CRIACAO_ABA_PERIODO',
      STATUS: 'OK',
      ACAO_EXECUTADA: 'Criar aba de atividades do periodo',
      RESULTADO: ctx.activitySheetName,
      OBSERVACOES: 'Criada diretamente pelo schema do modulo.'
    });
  }

  if (!atividades_findSheetByName_(operational, ctx.presenceSheetName)) {
    atividades_createSheetWithHeaders_(
      operational,
      ctx.presenceSheetName,
      ATIVIDADES_SCHEMA.PRESENCAS_BASE.concat(ATIVIDADES_SCHEMA.PRESENCAS_SUMARIO),
      ATIVIDADES_CFG.DYNAMIC_SHEET_PROFILES.PERIODO_PRESENCAS
    );
    created.push(ctx.presenceSheetName);
    atividades_logEvento_({
      TIPO_EVENTO_LOG: 'CRIACAO_ABA_PERIODO',
      STATUS: 'OK',
      ACAO_EXECUTADA: 'Criar aba de presencas do periodo',
      RESULTADO: ctx.presenceSheetName,
      OBSERVACOES: 'Criada diretamente pelo schema do modulo.'
    });
  }

  return {
    ok: true,
    period: ctx,
    created: created
  };
}

function atividades_isTruthySim_(value) {
  var normalized = atividades_normalizeTextUpper_(value);
  return normalized === 'SIM' || normalized === 'S' || normalized === 'TRUE';
}

function atividades_pad2_(value) {
  return ('0' + String(value || 0)).slice(-2);
}

function atividades_buildPresenceColumnName_(activityId, dateValue) {
  var safeId = String(activityId || '').trim();
  var parsedDate = atividades_parseDateOrNull_(dateValue);
  var dateText = parsedDate
    ? GEAPA_CORE.coreFormatDate(parsedDate, Session.getScriptTimeZone(), ATIVIDADES_CFG.ACTIVITY_ID_DATE_TOKEN_FORMAT)
    : String(dateValue || '').trim();

  return safeId && dateText ? safeId + '_' + dateText : '';
}

function atividades_filterActivitiesForCurrentPeriod_(records, ctx) {
  return records.filter(function(record) {
    var idAtividade = String(record.ID_ATIVIDADE || '').trim();
    var data = atividades_parseDateOrNull_(record.DATA_ATIVIDADE);
    var contaPresenca = atividades_isTruthySim_(record.CONTA_PRESENCA);
    var contaFalta = atividades_isTruthySim_(record.CONTA_FALTA);
    var status = atividades_normalizeTextUpper_(record.STATUS);

    if (!idAtividade || !data) return false;
    if (status === 'CANCELADA' || status === 'ARQUIVADA') return false;
    if (!contaPresenca && !contaFalta) return false;
    return atividades_isDateInsideRange_(data, ctx.startDate, ctx.endDate);
  }).sort(function(a, b) {
    return atividades_parseDateOrNull_(a.DATA_ATIVIDADE) - atividades_parseDateOrNull_(b.DATA_ATIVIDADE);
  });
}

function atividades_clearBodyRange_(sheet) {
  var maxRows = sheet.getMaxRows();
  var maxCols = sheet.getMaxColumns();
  if (maxRows <= 1 || maxCols < 1) return;
  sheet.getRange(2, 1, maxRows - 1, maxCols).clearContent();
}

function atividades_writeTabularPayload_(sheet, headers, rows) {
  var targetCols = headers.length;
  if (sheet.getMaxColumns() < targetCols) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), targetCols - sheet.getMaxColumns());
  }

  var targetRows = rows.length + 1;
  if (sheet.getMaxRows() < targetRows) {
    sheet.insertRowsAfter(sheet.getMaxRows(), targetRows - sheet.getMaxRows());
  }

  sheet.getRange(1, 1, 1, sheet.getMaxColumns()).clearContent();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  atividades_clearBodyRange_(sheet);

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function atividades_sincronizarPeriodoVigente_() {
  var ensure = atividades_garantirPeriodoVigente_();
  var ensuredIds = atividades_fillMissingActivityIds_();
  var ensuredCargaHoraria = atividades_fillCargaHorariaFromTimes_();
  var ctx = ensure.period;
  var operational = atividades_getOperationalHolder_().spreadsheet;
  var periodSheet = atividades_findSheetByName_(operational, ctx.activitySheetName);
  var records = GEAPA_CORE.coreReadSheetRecords(atividades_getAtividadesSheet_(), {
    headerRow: 1
  });
  var filtered = atividades_filterActivitiesForCurrentPeriod_(records, ctx);
  var rows = filtered.map(function(record, index) {
    var activityId = String(record.ID_ATIVIDADE || '').trim();
    return [
      ctx.code + '_ATV_' + atividades_pad2_(index + 1),
      atividades_buildPresenceColumnName_(activityId, atividades_parseDateOrNull_(record.DATA_ATIVIDADE)),
      activityId,
      record.DATA_ATIVIDADE || '',
      String(record.TITULO || '').trim(),
      String(record.CLASSIFICACAO_REUNIAO || '').trim(),
      String(record.TIPO_ATIVIDADE || '').trim(),
      String(record.SUBTIPO_ATIVIDADE || '').trim(),
      String(record.CONTA_PRESENCA || '').trim(),
      String(record.CONTA_FALTA || '').trim(),
      record.CARGA_HORARIA || atividades_calculateCargaHorariaFromTimes_(record.HORARIO_INICIO, record.HORARIO_FIM) || '',
      String(record.OBSERVACOES || '').trim()
    ];
  });

  atividades_writeTabularPayload_(periodSheet, ATIVIDADES_SCHEMA.PERIODO_ATIVIDADES.slice(), rows);
  atividades_applySheetUx_(periodSheet, ATIVIDADES_CFG.DYNAMIC_SHEET_PROFILES.PERIODO_ATIVIDADES);

  atividades_logEvento_({
    TIPO_EVENTO_LOG: 'SYNC_PERIODO_VIGENTE',
    STATUS: 'OK',
    ACAO_EXECUTADA: 'Sincronizar mapa de atividades do periodo',
    RESULTADO: ctx.activitySheetName,
    OBSERVACOES: 'Linhas sincronizadas: ' + rows.length
  });

  return {
    ok: true,
    period: ctx,
    ensuredIds: ensuredIds,
    ensuredCargaHoraria: ensuredCargaHoraria,
    rowCount: rows.length,
    sheetName: ctx.activitySheetName
  };
}

function atividades_setupV1_() {
  var fixed = atividades_garantirEstruturasFixasV1_();
  var ensure = atividades_garantirPeriodoVigente_();
  var seededConfig = atividades_garantirConfigPadrao_();
  var syncPeriodo = atividades_sincronizarPeriodoVigente_();
  var syncPresencas = atividades_sincronizarPresencasPeriodoVigente_();
  var ux = atividades_aplicarUxPlanilhas_();

  return {
    ok: true,
    fixed: fixed,
    period: ensure.period,
    createdSheets: fixed.created.concat(ensure.created),
    seededConfig: seededConfig,
    syncPeriodo: syncPeriodo,
    syncPresencas: syncPresencas,
    ux: ux
  };
}
