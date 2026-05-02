var ATIVIDADES_RUNTIME_CACHE = {
  registry: null,
  sheetsByKey: {},
  spreadsheetsById: {},
  foldersById: {},
  fixedSheetEntries: {},
  holders: {},
  thematicAxes: null
};

function atividades_assertCoreLibrary_() {
  if (typeof GEAPA_CORE === 'undefined' || !GEAPA_CORE) {
    throw new Error('A library GEAPA_CORE nao esta disponivel neste projeto.');
  }

  var requiredFns = [
    'coreGetRegistry',
    'coreGetRegistryRefByKey',
    'coreGetSheetByKey',
    'coreOpenSpreadsheetById',
    'coreHeaderMap',
    'coreGetCol',
    'coreNormalizeText',
    'coreAppendObjectByHeaders',
    'coreReadSheetRecords',
    'coreReadRecordsByKey',
    'coreRowToObject',
    'coreWriteCellByHeader',
    'coreFreezeHeaderRow',
    'coreEnsureFilter',
    'coreApplyHeaderNotes',
    'coreApplyHeaderColors',
    'coreApplyDropdownValidationByHeader',
    'coreGetCurrentSemester',
    'coreGetCurrentEmailsByEmailGroup',
    'coreFormatDate',
    'coreIsValidEmail',
    'coreSearchThreads',
    'coreMailQueueOutgoing',
    'coreMailProcessOutbox',
    'coreAssertModuleExecutionAllowed',
    'coreModuleStatusMarkExecution',
    'coreModuleStatusMarkSuccess',
    'coreModuleStatusMarkError',
    'coreModuleStatusMarkBlocked',
    'coreRunId',
    'coreLogInfo',
    'coreLogWarn',
    'coreLogError'
  ];

  var missing = requiredFns.filter(function(fnName) {
    return typeof GEAPA_CORE[fnName] !== 'function';
  });

  if (missing.length) {
    throw new Error(
      'A library GEAPA_CORE nao exporta todas as funcoes necessarias: ' +
      missing.join(', ')
    );
  }
}

function atividades_getRegistry_() {
  atividades_assertCoreLibrary_();

  if (!ATIVIDADES_RUNTIME_CACHE.registry) {
    var raw = GEAPA_CORE.coreGetRegistry();
    var entries = Object.keys(raw).map(function(key) {
      return Object.freeze({
        key: key,
        id: raw[key].id,
        sheet: raw[key].sheet
      });
    });

    ATIVIDADES_RUNTIME_CACHE.registry = Object.freeze({
      raw: raw,
      entries: entries
    });
  }

  return ATIVIDADES_RUNTIME_CACHE.registry;
}

function atividades_getRegistryEntries_() {
  return atividades_getRegistry_().entries.slice();
}

function atividades_normalizeTextUpper_(value) {
  return GEAPA_CORE.coreNormalizeText(value, {
    removeAccents: true,
    collapseWhitespace: true,
    caseMode: 'upper'
  });
}

function atividades_normalizeTextLower_(value) {
  return GEAPA_CORE.coreNormalizeText(value, {
    removeAccents: true,
    collapseWhitespace: true,
    caseMode: 'lower'
  });
}

function atividades_getRegistryEntryByKey_(key) {
  var wanted = String(key || '').trim().toUpperCase();
  if (!wanted) return null;

  var registry = atividades_getRegistry_().raw;
  if (!registry[wanted]) return null;

  return Object.freeze({
    key: wanted,
    id: registry[wanted].id,
    sheet: registry[wanted].sheet
  });
}

function atividades_findRegistryEntryBySheetNames_(sheetNames) {
  var names = Array.isArray(sheetNames) ? sheetNames : [sheetNames];
  var normalizedNames = names.map(atividades_normalizeTextLower_);
  var entries = atividades_getRegistryEntries_();

  for (var i = 0; i < entries.length; i++) {
    var normalizedSheet = atividades_normalizeTextLower_(entries[i].sheet);
    if (normalizedNames.indexOf(normalizedSheet) >= 0) {
      return entries[i];
    }
  }

  return null;
}

function atividades_findSheetByNameTokens_(spreadsheet, tokens) {
  var wanted = (Array.isArray(tokens) ? tokens : [tokens]).map(function(token) {
    return atividades_normalizeTextLower_(token);
  }).filter(function(token) {
    return !!token;
  });
  if (!wanted.length) return null;

  var sheets = spreadsheet.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var normalizedName = atividades_normalizeTextLower_(sheets[i].getName());
    var allMatch = wanted.every(function(token) {
      return normalizedName.indexOf(token) >= 0;
    });
    if (allMatch) return sheets[i];
  }

  return null;
}

function atividades_findRegistryEntryByKeyTokens_(tokens) {
  var list = Array.isArray(tokens) ? tokens : [tokens];
  var normalizedTokens = list.map(function(token) {
    return String(token || '').trim().toUpperCase();
  }).filter(function(token) {
    return !!token;
  });
  var entries = atividades_getRegistryEntries_();

  for (var i = 0; i < entries.length; i++) {
    var key = String(entries[i].key || '').trim().toUpperCase();
    var allMatch = normalizedTokens.every(function(token) {
      return key.indexOf(token) >= 0;
    });

    if (allMatch) return entries[i];
  }

  return null;
}

function atividades_findEntryByPreferredKeys_(preferredKeys) {
  var keys = Array.isArray(preferredKeys) ? preferredKeys : [preferredKeys];

  for (var i = 0; i < keys.length; i++) {
    var found = atividades_getRegistryEntryByKey_(keys[i]);
    if (found) return found;
  }

  return null;
}

function atividades_getFixedSheetEntry_(logicalName) {
  if (ATIVIDADES_RUNTIME_CACHE.fixedSheetEntries[logicalName]) {
    return ATIVIDADES_RUNTIME_CACHE.fixedSheetEntries[logicalName];
  }

  var cfg = ATIVIDADES_CFG.FIXED_SHEETS[logicalName];
  if (!cfg) throw new Error('Logical name de aba fixa nao suportado: ' + logicalName);

  var entry = atividades_findEntryByPreferredKeys_(cfg.preferredKeys);
  if (!entry) {
    entry = atividades_findRegistryEntryBySheetNames_(cfg.sheetNames);
  }
  if (!entry && cfg.keyTokens && cfg.keyTokens.length) {
    entry = atividades_findRegistryEntryByKeyTokens_(cfg.keyTokens);
  }

  if (!entry) {
    if (cfg.sameSpreadsheetAsOperational && logicalName !== 'ATIVIDADES') {
      var operationalCfg = ATIVIDADES_CFG.FIXED_SHEETS.ATIVIDADES;
      var operationalEntry = atividades_findEntryByPreferredKeys_(operationalCfg.preferredKeys);
      if (!operationalEntry) {
        operationalEntry = atividades_findRegistryEntryBySheetNames_(operationalCfg.sheetNames);
      }

      if (operationalEntry) {
        entry = Object.freeze({
          key: '',
          id: operationalEntry.id,
          sheet: cfg.sheetNames[0]
        });
      }
    }
  }

  if (!entry) {
    throw new Error(
      'Nao foi possivel localizar a aba fixa "' + logicalName + '" no Registry. ' +
      'Preferidas: ' + (cfg.preferredKeys || []).join(', ') + ' | Abas esperadas: ' + cfg.sheetNames.join(', ')
    );
  }

  ATIVIDADES_RUNTIME_CACHE.fixedSheetEntries[logicalName] = entry;
  return entry;
}

function atividades_getSheetByKeyCached_(key) {
  var normalizedKey = String(key || '').trim().toUpperCase();
  if (!normalizedKey) throw new Error('KEY obrigatoria para abrir aba via Registry.');

  if (!ATIVIDADES_RUNTIME_CACHE.sheetsByKey[normalizedKey]) {
    ATIVIDADES_RUNTIME_CACHE.sheetsByKey[normalizedKey] = GEAPA_CORE.coreGetSheetByKey(normalizedKey);
  }

  return ATIVIDADES_RUNTIME_CACHE.sheetsByKey[normalizedKey];
}

function atividades_openSpreadsheetByIdCached_(spreadsheetId) {
  var id = String(spreadsheetId || '').trim();
  if (!id) throw new Error('Spreadsheet ID obrigatorio.');

  if (!ATIVIDADES_RUNTIME_CACHE.spreadsheetsById[id]) {
    ATIVIDADES_RUNTIME_CACHE.spreadsheetsById[id] = GEAPA_CORE.coreOpenSpreadsheetById(id);
  }

  return ATIVIDADES_RUNTIME_CACHE.spreadsheetsById[id];
}

function atividades_openFolderByIdCached_(folderId) {
  var id = String(folderId || '').trim();
  if (!id) throw new Error('Folder ID obrigatorio.');

  if (!ATIVIDADES_RUNTIME_CACHE.foldersById[id]) {
    ATIVIDADES_RUNTIME_CACHE.foldersById[id] = DriveApp.getFolderById(id);
  }

  return ATIVIDADES_RUNTIME_CACHE.foldersById[id];
}

function atividades_findHolderEntry_(cacheKey, opts) {
  if (ATIVIDADES_RUNTIME_CACHE.holders[cacheKey]) {
    return ATIVIDADES_RUNTIME_CACHE.holders[cacheKey];
  }

  var entry = atividades_findEntryByPreferredKeys_(opts.preferredKeys || []);

  if (!entry && opts.sheetNames && opts.sheetNames.length) {
    entry = atividades_findRegistryEntryBySheetNames_(opts.sheetNames);
  }

  if (!entry && opts.keyTokens && opts.keyTokens.length) {
    entry = atividades_findRegistryEntryByKeyTokens_(opts.keyTokens);
  }

  if (!entry) {
    throw new Error(
      'Nao foi possivel localizar a planilha "' + cacheKey + '" no Registry.'
    );
  }

  ATIVIDADES_RUNTIME_CACHE.holders[cacheKey] = entry;
  return entry;
}

function atividades_getOperationalHolder_() {
  var anchor = atividades_getFixedSheetEntry_('ATIVIDADES');
  return Object.freeze({
    entry: anchor,
    spreadsheet: atividades_openSpreadsheetByIdCached_(anchor.id)
  });
}

function atividades_getHistoryFolder_() {
  var entry = atividades_findHolderEntry_('HISTORY', {
    preferredKeys: ATIVIDADES_CFG.HISTORY_DISCOVERY.preferredKeys,
    keyTokens: ATIVIDADES_CFG.HISTORY_DISCOVERY.keyTokens
  });

  return Object.freeze({
    entry: entry,
    folder: atividades_openFolderByIdCached_(entry.id)
  });
}

function atividades_getPublicHistoryHolder_() {
  var entry = atividades_findHolderEntry_('HISTORY_PUBLIC', {
    preferredKeys: ATIVIDADES_CFG.HISTORY_PUBLIC_DISCOVERY.preferredKeys,
    sheetNames: ATIVIDADES_CFG.HISTORY_PUBLIC_DISCOVERY.sheetNames,
    keyTokens: ATIVIDADES_CFG.HISTORY_PUBLIC_DISCOVERY.keyTokens
  });

  return Object.freeze({
    entry: entry,
    spreadsheet: atividades_openSpreadsheetByIdCached_(entry.id)
  });
}

function atividades_getPublicHistorySheet_() {
  var holder = atividades_getPublicHistoryHolder_();
  var entry = holder.entry;
  var byRealName = atividades_findSheetByName_(holder.spreadsheet, entry.sheet);
  if (byRealName) return byRealName;

  var byPreferredName = atividades_findSheetByNameTokens_(
    holder.spreadsheet,
    ATIVIDADES_CFG.HISTORY_PUBLIC_DISCOVERY.sheetNames
  );
  if (byPreferredName) return byPreferredName;

  throw new Error(
    'Nao foi possivel localizar a aba de historico publico das apresentacoes na planilha informada pelo Registry.'
  );
}

function atividades_findSheetByName_(spreadsheet, sheetName) {
  var name = String(sheetName || '').trim();
  if (!name) throw new Error('sheetName obrigatorio.');
  return spreadsheet.getSheetByName(name);
}

function atividades_getOperationalSheetByLogicalName_(logicalName) {
  var entry = atividades_getFixedSheetEntry_(logicalName);
  var operational = atividades_getOperationalHolder_().spreadsheet;
  var byRealName = atividades_findSheetByName_(operational, entry.sheet);
  if (byRealName) return byRealName;

  var cfg = ATIVIDADES_CFG.FIXED_SHEETS[logicalName];
  for (var i = 0; i < cfg.sheetNames.length; i++) {
    var fallback = atividades_findSheetByName_(operational, cfg.sheetNames[i]);
    if (fallback) return fallback;
  }

  throw new Error(
    'Aba operacional nao encontrada para "' + logicalName + '". ' +
    'Registry apontou para "' + entry.sheet + '".'
  );
}

function atividades_getFixedSheetByLogicalName_(logicalName) {
  var entry = atividades_getFixedSheetEntry_(logicalName);
  var cfg = ATIVIDADES_CFG.FIXED_SHEETS[logicalName];
  var spreadsheet = cfg && cfg.sameSpreadsheetAsOperational
    ? atividades_getOperationalHolder_().spreadsheet
    : atividades_openSpreadsheetByIdCached_(entry.id);
  var byRealName = atividades_findSheetByName_(spreadsheet, entry.sheet);
  if (byRealName) return byRealName;

  for (var i = 0; i < cfg.sheetNames.length; i++) {
    var fallback = atividades_findSheetByName_(spreadsheet, cfg.sheetNames[i]);
    if (fallback) return fallback;
  }

  if (cfg.keyTokens && cfg.keyTokens.length) {
    var tokenMatch = atividades_findSheetByNameTokens_(spreadsheet, cfg.keyTokens);
    if (tokenMatch) return tokenMatch;
  }

  throw new Error(
    'Aba fixa nao encontrada para "' + logicalName + '". ' +
    'Registry apontou para "' + entry.sheet + '".'
  );
}

function atividades_getAtividadesSheet_() {
  return atividades_getOperationalSheetByLogicalName_('ATIVIDADES');
}

function atividades_getApresentacoesSheet_() {
  return atividades_getOperationalSheetByLogicalName_('APRESENTACOES');
}

function atividades_getConvidadosSheet_() {
  return atividades_getOperationalSheetByLogicalName_('CONVIDADOS');
}

function atividades_getConfigSheet_() {
  return atividades_getOperationalSheetByLogicalName_('CONFIG');
}

function atividades_getLogSheet_() {
  return atividades_getOperationalSheetByLogicalName_('LOG');
}

function atividades_getJustificativasFaltasSheet_() {
  return atividades_getFixedSheetByLogicalName_('JUSTIFICATIVAS');
}

function atividades_getJustificativasFormSheet_() {
  return atividades_getFixedSheetByLogicalName_('JUSTIFICATIVAS_FORM');
}

function atividades_getEixosTematicosSheet_() {
  return atividades_getSheetByKeyCached_(ATIVIDADES_CFG.STABLE_KEYS.THEMATIC_AXES);
}

function atividades_getExternosBaseSheet_() {
  return atividades_getFixedSheetByLogicalName_('EXTERNOS_BASE');
}
