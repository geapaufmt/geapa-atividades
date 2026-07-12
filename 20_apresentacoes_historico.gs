function atividades_getHistoricoPublicoHeaderAliases_() {
  return Object.freeze({
    TITULO: Object.freeze(['Título', 'Titulo']),
    EIXO_TEMATICO: Object.freeze([
      'Eixo Temático Principal',
      'Eixo Tematico Principal',
      'Eixo Temático',
      'Eixo Tematico'
    ]),
    EIXO_TEMATICO_SECUNDARIO: Object.freeze([
      'Eixo Temático Secundário',
      'Eixo Tematico Secundario',
      'Eixo Temático 2',
      'Eixo Tematico 2',
      'Eixo 2'
    ]),
    PALESTRANTE: Object.freeze(['Palestrante']),
    RGA: Object.freeze(['RGA']),
    DATA: Object.freeze(['Data']),
    SEMESTRE: Object.freeze(['Semestre']),
    PERIODO_APRESENTACAO: Object.freeze([
      'Período da apresentação',
      'Periodo da apresentação',
      'Periodo da apresentacao'
    ]),
    LINK: Object.freeze(['Arquivo', 'Link', 'Link do arquivo'])
  });
}

function atividades_findHistoricoPublicoHeaderName_(headerMap, aliases) {
  var keys = Object.keys(headerMap || {});
  var wanted = (Array.isArray(aliases) ? aliases : [aliases]).map(function(alias) {
    return GEAPA_CORE.coreNormalizeHeader(alias);
  });

  for (var i = 0; i < wanted.length; i++) {
    for (var j = 0; j < keys.length; j++) {
      if (GEAPA_CORE.coreNormalizeHeader(keys[j]) === wanted[i]) {
        return keys[j];
      }
    }
  }

  return '';
}

function atividades_ensureHistoricoPublicoHeader_(sheet, headerMap, aliases, canonicalName, opts) {
  opts = opts || {};
  if (opts.renameToCanonical) {
    var canonical = atividades_findHistoricoPublicoHeaderName_(headerMap, [canonicalName]);
    if (canonical) return canonical;
  }

  var existing = atividades_findHistoricoPublicoHeaderName_(headerMap, aliases);
  if (existing) {
    if (opts.renameToCanonical) {
      var existingCol = GEAPA_CORE.coreGetCol(headerMap, existing);
      if (existingCol) {
        sheet.getRange(1, existingCol).setValue(canonicalName);
        return canonicalName;
      }
    }
    return existing;
  }

  var nextCol = Math.max(1, sheet.getLastColumn() + 1);
  sheet.getRange(1, nextCol).setValue(canonicalName);
  return canonicalName;
}

function atividades_buildHistoricoPublicoLooseDateKey_(value) {
  var parsed = atividades_parseDateOrNull_(value);
  if (parsed) {
    return Utilities.formatDate(parsed, Session.getScriptTimeZone(), ATIVIDADES_CFG.DATE_FORMAT);
  }

  var raw = String(value || '').trim();
  if (!raw) return '';

  var matchBr = raw.match(/(\d{2}\/\d{2}\/\d{4})/);
  if (matchBr) return matchBr[1];

  var matchIso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (matchIso) {
    return [matchIso[3], matchIso[2], matchIso[1]].join('/');
  }

  return raw;
}

function atividades_buildHistoricoPublicoLooseKey_(hist) {
  var rga = atividades_normalizeRgaResumoApresentacoes_(hist.rga);
  var dateKey = atividades_buildHistoricoPublicoLooseDateKey_(hist.dataDisplay || hist.data);
  if (!rga || !dateKey) return '';
  return [rga, dateKey].join('||');
}

function atividades_buildHistoricoPublicoContext_() {
  var sheet = atividades_getPublicHistorySheet_();
  var aliases = atividades_getHistoricoPublicoHeaderAliases_();
  var headerMap = GEAPA_CORE.coreHeaderMap(sheet, 1);

  atividades_ensureHistoricoPublicoHeader_(
    sheet,
    headerMap,
    aliases.EIXO_TEMATICO,
    'Eixo Temático Principal',
    { renameToCanonical: true }
  );
  headerMap = GEAPA_CORE.coreHeaderMap(sheet, 1);
  atividades_ensureHistoricoPublicoHeader_(
    sheet,
    headerMap,
    aliases.EIXO_TEMATICO_SECUNDARIO,
    'Eixo Temático Secundário',
    { renameToCanonical: true }
  );
  headerMap = GEAPA_CORE.coreHeaderMap(sheet, 1);
  atividades_ensureHistoricoPublicoHeader_(
    sheet,
    headerMap,
    aliases.LINK,
    'Arquivo'
  );
  atividades_ensureHistoricoPublicoHeader_(
    sheet,
    headerMap,
    aliases.PERIODO_APRESENTACAO,
    'Período da apresentação'
  );
  headerMap = GEAPA_CORE.coreHeaderMap(sheet, 1);

  var resolvedHeaders = {
    TITULO: atividades_findHistoricoPublicoHeaderName_(headerMap, aliases.TITULO),
    EIXO_TEMATICO: atividades_findHistoricoPublicoHeaderName_(headerMap, aliases.EIXO_TEMATICO),
    EIXO_TEMATICO_SECUNDARIO: atividades_findHistoricoPublicoHeaderName_(headerMap, aliases.EIXO_TEMATICO_SECUNDARIO),
    PALESTRANTE: atividades_findHistoricoPublicoHeaderName_(headerMap, aliases.PALESTRANTE),
    RGA: atividades_findHistoricoPublicoHeaderName_(headerMap, aliases.RGA),
    DATA: atividades_findHistoricoPublicoHeaderName_(headerMap, aliases.DATA),
    SEMESTRE: atividades_findHistoricoPublicoHeaderName_(headerMap, aliases.SEMESTRE),
    PERIODO_APRESENTACAO: atividades_findHistoricoPublicoHeaderName_(headerMap, aliases.PERIODO_APRESENTACAO),
    LINK: atividades_findHistoricoPublicoHeaderName_(headerMap, aliases.LINK)
  };

  var missing = Object.keys(resolvedHeaders).filter(function(key) {
    return !resolvedHeaders[key];
  });
  if (missing.length) {
    throw new Error(
      'A aba de historico publico nao possui todos os cabecalhos esperados. Faltando: ' +
      missing.join(', ')
    );
  }

  var rows = GEAPA_CORE.coreReadSheetRecords(sheet, { headerRow: 1 });
  var existingMap = Object.create(null);
  var existingLooseMap = Object.create(null);
  var existingItems = [];
  var invalidItems = [];
  var lastRow = Math.max(sheet.getLastRow(), 1);
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var displayValues = lastRow > 1
    ? sheet.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues()
    : [];
  var dataColIndex = Math.max(0, GEAPA_CORE.coreGetCol(headerMap, resolvedHeaders.DATA) - 1);
  var rgaColIndex = Math.max(0, GEAPA_CORE.coreGetCol(headerMap, resolvedHeaders.RGA) - 1);

  rows.forEach(function(row, index) {
    var displayRow = displayValues[index] || [];
    var item = {
      rowNumber: index + 2,
      titulo: String(row[resolvedHeaders.TITULO] || '').trim(),
      eixoTematico: String(row[resolvedHeaders.EIXO_TEMATICO] || '').trim(),
      eixoTematicoSecundario: String(row[resolvedHeaders.EIXO_TEMATICO_SECUNDARIO] || '').trim(),
      palestrante: String(row[resolvedHeaders.PALESTRANTE] || '').trim(),
      rga: String(row[resolvedHeaders.RGA] || '').trim(),
      rgaDisplay: String(displayRow[rgaColIndex] || '').trim(),
      data: row[resolvedHeaders.DATA] || '',
      dataDisplay: String(displayRow[dataColIndex] || '').trim(),
      semestre: String(row[resolvedHeaders.SEMESTRE] || '').trim(),
      periodoApresentacao: String(row[resolvedHeaders.PERIODO_APRESENTACAO] || '').trim(),
      link: String(row[resolvedHeaders.LINK] || '').trim()
    };
    try {
      item.key = atividades_buildHistoricoPublicoKey_(item);
      item.looseKey = atividades_buildHistoricoPublicoLooseKey_(item);
    } catch (err) {
      invalidItems.push({
        rowNumber: item.rowNumber,
        message: err && err.message ? err.message : String(err)
      });
      return;
    }
    if (!item.key) return;
    existingItems.push(item);
    if (!existingMap[item.key]) {
      existingMap[item.key] = item;
    }
    if (item.looseKey && !existingLooseMap[item.looseKey]) {
      existingLooseMap[item.looseKey] = item;
    }
  });

  return {
    sheet: sheet,
    headerMap: headerMap,
    resolvedHeaders: resolvedHeaders,
    existingItems: existingItems,
    existingMap: existingMap,
    existingLooseMap: existingLooseMap,
    invalidItems: invalidItems
  };
}

function atividades_escapeFormulaString_(value) {
  return String(value || '').replace(/"/g, '""');
}

function atividades_resolverPeriodoHistoricoPublico_(hist) {
  var explicit = String(hist.periodoApresentacao || '').trim();
  if (explicit && explicit !== '0') return explicit;

  var parsedDate = atividades_parseDateOrNull_(hist.data);
  if (parsedDate) {
    var semester = GEAPA_CORE.coreGetCurrentSemester(parsedDate);
    if (semester && semester.periodId) {
      return String(semester.periodId).trim();
    }
  }

  return explicit === '0' ? '' : explicit;
}

function atividades_buildHistoricoPublicoLinkLabel_(hist) {
  var parsedDate = atividades_parseDateOrNull_(hist.data);
  var dataTxt = parsedDate
    ? GEAPA_CORE.coreFormatDate(parsedDate, Session.getScriptTimeZone(), ATIVIDADES_CFG.DATE_FORMAT)
    : String(hist.data || '').trim();
  var nome = String(hist.palestrante || '').trim() || 'Apresentação';
  return [dataTxt || 'Sem data', nome].join(' - ');
}

function atividades_setHistoricoPublicoLinkCell_(sheet, rowNumber, ctx, hist) {
  var url = String(hist.link || '').trim();
  var headerName = ctx.resolvedHeaders.LINK;
  var col = GEAPA_CORE.coreGetCol(ctx.headerMap, headerName);
  if (!col) return;

  var range = sheet.getRange(rowNumber, col);
  if (!url) {
    range.setValue('');
    return;
  }

  if (/^https?:\/\//i.test(url)) {
    var textStyle = SpreadsheetApp.newTextStyle()
      .setForegroundColor('#1155cc')
      .setBold(true)
      .setUnderline(true)
      .build();
    range.setRichTextValue(
      SpreadsheetApp.newRichTextValue()
        .setText(atividades_buildHistoricoPublicoLinkLabel_(hist))
        .setTextStyle(textStyle)
        .setLinkUrl(url)
        .build()
    );
    return;
  }

  range.setValue(url);
}

function atividades_applyHistoricoPublicoRowStyles_(sheet, rowNumber, ctx) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  sheet.getRange(rowNumber, 1, 1, lastCol)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  var titleCol = GEAPA_CORE.coreGetCol(ctx.headerMap, ctx.resolvedHeaders.TITULO);
  if (titleCol) {
    sheet.getRange(rowNumber, titleCol).setFontWeight('normal');
  }

  var eixoCol = GEAPA_CORE.coreGetCol(ctx.headerMap, ctx.resolvedHeaders.EIXO_TEMATICO);
  if (eixoCol) {
    sheet.getRange(rowNumber, eixoCol).setFontWeight('bold');
  }

  var eixoSecundarioCol = GEAPA_CORE.coreGetCol(ctx.headerMap, ctx.resolvedHeaders.EIXO_TEMATICO_SECUNDARIO);
  if (eixoSecundarioCol) {
    sheet.getRange(rowNumber, eixoSecundarioCol).setFontWeight('bold');
  }

  var linkCol = GEAPA_CORE.coreGetCol(ctx.headerMap, ctx.resolvedHeaders.LINK);
  if (linkCol) {
    sheet.getRange(rowNumber, linkCol)
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
  }
}

function atividades_enriquecerHistoricoPublicoExistente_(ctx) {
  var updatedCount = 0;
  (ctx.existingItems || []).forEach(function(item) {
    var rowNumber = item.rowNumber;
    var changed = false;

    var resolvedPeriod = atividades_resolverPeriodoHistoricoPublico_(item);
    if (resolvedPeriod && resolvedPeriod !== String(item.periodoApresentacao || '').trim()) {
      GEAPA_CORE.coreWriteCellByHeader(
        ctx.sheet,
        rowNumber,
        ctx.headerMap,
        ctx.resolvedHeaders.PERIODO_APRESENTACAO,
        resolvedPeriod,
        { oneBased: true }
      );
      item.periodoApresentacao = resolvedPeriod;
      changed = true;
    }

    var canonicalAxis = atividades_interpretarEixoApresentacoes_(item.eixoTematico);
    if (canonicalAxis && canonicalAxis !== String(item.eixoTematico || '').trim()) {
      GEAPA_CORE.coreWriteCellByHeader(
        ctx.sheet,
        rowNumber,
        ctx.headerMap,
        ctx.resolvedHeaders.EIXO_TEMATICO,
        canonicalAxis,
        { oneBased: true }
      );
      item.eixoTematico = canonicalAxis;
      changed = true;
    }

    var canonicalSecondaryAxis = atividades_interpretarEixoApresentacoes_(item.eixoTematicoSecundario);
    if (canonicalSecondaryAxis && canonicalSecondaryAxis !== String(item.eixoTematicoSecundario || '').trim()) {
      GEAPA_CORE.coreWriteCellByHeader(
        ctx.sheet,
        rowNumber,
        ctx.headerMap,
        ctx.resolvedHeaders.EIXO_TEMATICO_SECUNDARIO,
        canonicalSecondaryAxis,
        { oneBased: true }
      );
      item.eixoTematicoSecundario = canonicalSecondaryAxis;
      changed = true;
    }

    var linkCol = GEAPA_CORE.coreGetCol(ctx.headerMap, ctx.resolvedHeaders.LINK);
    if (linkCol) {
      var range = ctx.sheet.getRange(rowNumber, linkCol);
      var formula = String(range.getFormula() || '').trim();
      var rawValue = String(range.getValue() || '').trim();
      if (!formula && /^https?:\/\//i.test(rawValue)) {
        atividades_setHistoricoPublicoLinkCell_(ctx.sheet, rowNumber, ctx, {
          data: item.data,
          palestrante: item.palestrante,
          link: rawValue
        });
        item.link = rawValue;
        changed = true;
      }
    }

    if (changed) updatedCount++;
  });

  return updatedCount;
}

function atividades_keyDateHistoricoPublico_(value) {
  var parsed = atividades_parseDateOrNull_(value);
  if (parsed) {
    return Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  throw new Error('Invalid date for history sync: ' + String(value || ''));
}

function atividades_buildHistoricoPublicoKey_(hist) {
  var rga = atividades_normalizeRgaResumoApresentacoes_(hist.rga);
  var dateKey = atividades_keyDateHistoricoPublico_(hist.data);
  if (!rga || !dateKey) return '';
  return [rga, dateKey].join('||');
}

function atividades_normalizeRgaResumoApresentacoes_(value) {
  var raw = String(value || '').trim();
  if (!raw) return '';
  var digits = raw.replace(/\D/g, '');
  if (digits.length >= 6) return digits;
  return atividades_normalizeTextUpper_(raw);
}

function atividades_parseSemesterTokenResumoApresentacoes_(value) {
  var raw = String(value || '').trim();
  var match = raw.match(/^(\d{4})\s*\/\s*([12])$/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    part: Number(match[2])
  };
}

function atividades_parsePeriodTokenResumoApresentacoes_(value) {
  var raw = String(value || '').trim().toUpperCase();
  var match = raw.match(/^GEAPA_(\d{4})$/);
  if (!match) return null;
  return {
    year: Number(match[1])
  };
}

function atividades_isHistoricoNovoParaResumoMembros_(item) {
  var cfg = ATIVIDADES_CFG.APRESENTACOES_MEMBERS_SUMMARY || {};
  var cutoffPeriod = atividades_parsePeriodTokenResumoApresentacoes_(cfg.CUTOFF_PERIOD_ID);
  var cutoffSemester = atividades_parseSemesterTokenResumoApresentacoes_(cfg.CUTOFF_SEMESTER_ID);
  var itemPeriod = atividades_parsePeriodTokenResumoApresentacoes_(item.periodoApresentacao);
  var itemSemester = atividades_parseSemesterTokenResumoApresentacoes_(item.semestre);

  if (itemPeriod && cutoffPeriod) {
    return itemPeriod.year >= cutoffPeriod.year;
  }

  if (itemSemester && cutoffSemester) {
    if (itemSemester.year !== cutoffSemester.year) {
      return itemSemester.year > cutoffSemester.year;
    }
    return itemSemester.part >= cutoffSemester.part;
  }

  return false;
}

function atividades_toHistoricoPublicoObj_(record) {
  return {
    titulo: String(record.TITULO_APRESENTACAO || '').trim(),
    eixoTematico: atividades_interpretarEixoApresentacoes_(record.EIXO_TEMATICO_PRINCIPAL),
    eixoTematicoSecundario: atividades_interpretarEixoApresentacoes_(record.EIXO_TEMATICO_SECUNDARIO),
    palestrante: String(record.NOME_MEMBRO || '').trim(),
    rga: atividades_normalizeRgaResumoApresentacoes_(record.RGA || ''),
    data: record.DATA_ATIVIDADE || '',
    semestre: atividades_resolverRotuloSemestreApresentacao_(record),
    periodoApresentacao: String(record.PERIODO_REFERENCIA || '').trim(),
    link: String(record.LINK_ARQUIVO_DRIVE || '').trim()
  };
}

function atividades_getHistoricoPublicoEligibilityInfo_(record) {
  var reasons = [];
  if (!record) {
    return {
      ok: false,
      reasons: ['registro_ausente']
    };
  }

  if (!atividades_isStatusApresentacao_(record.STATUS_APRESENTACAO, 'REALIZADA')) {
    reasons.push('status_nao_realizada');
  }
  if (!String(record.TITULO_APRESENTACAO || '').trim()) {
    reasons.push('sem_titulo');
  }
  if (!String(record.EIXO_TEMATICO_PRINCIPAL || '').trim()) {
    reasons.push('sem_eixo_principal');
  }
  if (!String(record.NOME_MEMBRO || '').trim()) {
    reasons.push('sem_nome_membro');
  }
  if (!String(record.RGA || '').trim()) {
    reasons.push('sem_rga');
  }
  if (!atividades_parseDateOrNull_(record.DATA_ATIVIDADE)) {
    reasons.push('sem_data_atividade');
  }
  if (!atividades_resolverRotuloSemestreApresentacao_(record)) {
    reasons.push('sem_semestre_resolvido');
  }
  if (!String(record.LINK_ARQUIVO_DRIVE || '').trim()) {
    reasons.push('sem_link_arquivo_drive');
  }

  return {
    ok: reasons.length === 0,
    reasons: reasons
  };
}

function atividades_isApresentacaoAptaHistoricoPublico_(record) {
  return atividades_getHistoricoPublicoEligibilityInfo_(record).ok;
}

function atividades_writeHistoricoPublicoRow_(sheet, rowNumber, ctx, hist) {
  hist.periodoApresentacao = atividades_resolverPeriodoHistoricoPublico_(hist);
  GEAPA_CORE.coreWriteCellByHeader(sheet, rowNumber, ctx.headerMap, ctx.resolvedHeaders.TITULO, hist.titulo, { oneBased: true });
  GEAPA_CORE.coreWriteCellByHeader(sheet, rowNumber, ctx.headerMap, ctx.resolvedHeaders.EIXO_TEMATICO, hist.eixoTematico, { oneBased: true });
  GEAPA_CORE.coreWriteCellByHeader(sheet, rowNumber, ctx.headerMap, ctx.resolvedHeaders.EIXO_TEMATICO_SECUNDARIO, hist.eixoTematicoSecundario || '', { oneBased: true });
  GEAPA_CORE.coreWriteCellByHeader(sheet, rowNumber, ctx.headerMap, ctx.resolvedHeaders.PALESTRANTE, hist.palestrante, { oneBased: true });
  GEAPA_CORE.coreWriteCellByHeader(sheet, rowNumber, ctx.headerMap, ctx.resolvedHeaders.RGA, hist.rga, { oneBased: true });
  GEAPA_CORE.coreWriteCellByHeader(sheet, rowNumber, ctx.headerMap, ctx.resolvedHeaders.DATA, hist.data, { oneBased: true });
  GEAPA_CORE.coreWriteCellByHeader(sheet, rowNumber, ctx.headerMap, ctx.resolvedHeaders.SEMESTRE, hist.semestre, { oneBased: true });
  GEAPA_CORE.coreWriteCellByHeader(sheet, rowNumber, ctx.headerMap, ctx.resolvedHeaders.PERIODO_APRESENTACAO, hist.periodoApresentacao, { oneBased: true });
  atividades_setHistoricoPublicoLinkCell_(sheet, rowNumber, ctx, hist);
  atividades_applyHistoricoPublicoRowStyles_(sheet, rowNumber, ctx);
}

function atividades_appendHistoricoPublicoRow_(ctx, hist) {
  hist.periodoApresentacao = atividades_resolverPeriodoHistoricoPublico_(hist);
  var rowNumber = Math.max(2, ctx.sheet.getLastRow() + 1);
  atividades_writeHistoricoPublicoRow_(ctx.sheet, rowNumber, ctx, hist);
  var indexed = {
    rowNumber: rowNumber,
    titulo: hist.titulo,
    eixoTematico: hist.eixoTematico,
    eixoTematicoSecundario: hist.eixoTematicoSecundario || '',
    palestrante: hist.palestrante,
    rga: hist.rga,
    data: hist.data,
    semestre: hist.semestre,
    periodoApresentacao: hist.periodoApresentacao,
    link: hist.link,
    key: atividades_buildHistoricoPublicoKey_(hist),
    looseKey: atividades_buildHistoricoPublicoLooseKey_(hist)
  };
  ctx.existingMap[indexed.key] = indexed;
  if (indexed.looseKey) {
    ctx.existingLooseMap[indexed.looseKey] = indexed;
  }
  ctx.existingItems.push(indexed);
  return rowNumber;
}

function atividades_findHistoricoPublicoExistingItem_(ctx, hist) {
  var strictKey = atividades_buildHistoricoPublicoKey_(hist);
  if (strictKey && ctx.existingMap[strictKey]) {
    return {
      item: ctx.existingMap[strictKey],
      matchedBy: 'strict',
      key: strictKey
    };
  }

  var looseKey = atividades_buildHistoricoPublicoLooseKey_(hist);
  if (looseKey && ctx.existingLooseMap[looseKey]) {
    var looseItem = ctx.existingLooseMap[looseKey];
    if (strictKey) {
      ctx.existingMap[strictKey] = looseItem;
    }
    return {
      item: looseItem,
      matchedBy: 'loose',
      key: strictKey || looseKey
    };
  }

  return {
    item: null,
    matchedBy: '',
    key: strictKey || looseKey || ''
  };
}

function atividades_getMembersSheetApresentacoes_() {
  return GEAPA_CORE.coreGetSheetByKey(ATIVIDADES_CFG.STABLE_KEYS.MEMBERS);
}

function atividades_ensureMembersSummaryHeaders_() {
  var sheet = atividades_getMembersSheetApresentacoes_();
  var headerMap = GEAPA_CORE.coreHeaderMap(sheet, 1);

  function ensureHeader(headerName) {
    var col = GEAPA_CORE.coreGetCol(headerMap, headerName);
    if (col) return col;
    var nextCol = Math.max(1, sheet.getLastColumn() + 1);
    sheet.getRange(1, nextCol).setValue(headerName);
    headerMap = GEAPA_CORE.coreHeaderMap(sheet, 1);
    return GEAPA_CORE.coreGetCol(headerMap, headerName);
  }

  var rgaCol = GEAPA_CORE.coreGetCol(headerMap, 'RGA');
  if (!rgaCol) {
    throw new Error('A aba MEMBERS_ATUAIS precisa possuir a coluna RGA.');
  }

  var periodCol = GEAPA_CORE.coreGetCol(headerMap, 'CICLO_ULTIMA_APRESENTACAO') ||
    GEAPA_CORE.coreGetCol(headerMap, 'PERIODO_ULTIMA_APRESENTACAO') ||
    ensureHeader('CICLO_ULTIMA_APRESENTACAO');
  var countCol = ensureHeader('QTD_APRESENTACOES_REALIZADAS');
  var legacyPeriodCol = GEAPA_CORE.coreGetCol(headerMap, 'PERIODO_ULTIMA_APRESENTACAO_BASE_LEGADO');
  var legacyCountCol = GEAPA_CORE.coreGetCol(headerMap, 'QTD_APRESENTACOES_REALIZADAS_BASE_LEGADO');
  if (legacyPeriodCol) sheet.hideColumns(legacyPeriodCol);
  if (legacyCountCol) sheet.hideColumns(legacyCountCol);

  return {
    sheet: sheet,
    headerMap: headerMap,
    rgaCol: rgaCol,
    periodCol: periodCol,
    countCol: countCol
  };
}

function atividades_buildHistoricoPublicoResumoPorRga_(ctx) {
  var byRga = Object.create(null);
  var sheet = ctx.sheet;
  var headerMap = ctx.headerMap;
  var resolvedHeaders = ctx.resolvedHeaders;
  var lastRow = Math.max(sheet.getLastRow(), 1);
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  if (lastRow < 2 || lastCol < 1) return byRga;

  var rawValues = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var displayValues = sheet.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();
  var rgaColIndex = Math.max(0, GEAPA_CORE.coreGetCol(headerMap, resolvedHeaders.RGA) - 1);
  var dataColIndex = Math.max(0, GEAPA_CORE.coreGetCol(headerMap, resolvedHeaders.DATA) - 1);
  var periodoColIndex = Math.max(0, GEAPA_CORE.coreGetCol(headerMap, resolvedHeaders.PERIODO_APRESENTACAO) - 1);
  var semestreColIndex = Math.max(0, GEAPA_CORE.coreGetCol(headerMap, resolvedHeaders.SEMESTRE) - 1);
  var seenByPresentation = Object.create(null);

  for (var i = 0; i < rawValues.length; i++) {
    var rawRow = rawValues[i] || [];
    var displayRow = displayValues[i] || [];
    var item = {
      rga: displayRow[rgaColIndex] || rawRow[rgaColIndex] || '',
      data: rawRow[dataColIndex] || displayRow[dataColIndex] || '',
      dataDisplay: displayRow[dataColIndex] || '',
      periodoApresentacao: String(displayRow[periodoColIndex] || rawRow[periodoColIndex] || '').trim(),
      semestre: String(displayRow[semestreColIndex] || rawRow[semestreColIndex] || '').trim()
    };

    var rga = atividades_normalizeRgaResumoApresentacoes_(item.rga);
    if (!rga) continue;

    var looseKey = atividades_buildHistoricoPublicoLooseKey_(item);
    if (looseKey && seenByPresentation[looseKey]) continue;
    if (looseKey) seenByPresentation[looseKey] = true;

    var parsedDate = atividades_parseDateOrNull_(item.data) || atividades_parseDateOrNull_(item.dataDisplay);
    var resolvedPeriod = atividades_resolverPeriodoHistoricoPublico_(item);
    if (!byRga[rga]) {
      byRga[rga] = {
        count: 0,
        lastDate: null,
        lastPeriod: ''
      };
    }

    byRga[rga].count += 1;
    if (parsedDate && (!byRga[rga].lastDate || parsedDate.getTime() > byRga[rga].lastDate.getTime())) {
      byRga[rga].lastDate = parsedDate;
      byRga[rga].lastPeriod = resolvedPeriod || '';
    } else if (!byRga[rga].lastPeriod && resolvedPeriod) {
      byRga[rga].lastPeriod = resolvedPeriod;
    }
  }

  return byRga;
}

function atividades_sincronizarResumoApresentacoesEmMembersAtuais_(opts) {
  opts = opts || {};
  var preserveExisting = opts.preserveExisting !== false;
  var historyCtx;
  try {
    historyCtx = atividades_buildHistoricoPublicoContext_();
  } catch (err) {
    var message = err && err.message ? err.message : String(err);
    return {
      ok: false,
      updatedCount: 0,
      errors: [message],
      reason: 'history_public_context_unavailable'
    };
  }

  var membersCtx = atividades_ensureMembersSummaryHeaders_();
  var sheet = membersCtx.sheet;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return {
      ok: true,
      updatedCount: 0,
      errors: [],
      reason: 'no_member_rows'
    };
  }

  var resumoByRga = atividades_buildHistoricoPublicoResumoPorRga_(historyCtx);
  var rowCount = lastRow - 1;
  var rgaValues = sheet.getRange(2, membersCtx.rgaCol, rowCount, 1).getDisplayValues();
  var currentPeriodValues = sheet.getRange(2, membersCtx.periodCol, rowCount, 1).getDisplayValues();
  var currentCountValues = sheet.getRange(2, membersCtx.countCol, rowCount, 1).getDisplayValues();
  var periodValues = [];
  var countValues = [];
  var matchedCount = 0;
  var preservedCount = 0;

  for (var i = 0; i < rgaValues.length; i++) {
    var rga = atividades_normalizeRgaResumoApresentacoes_(rgaValues[i][0]);
    var resumo = rga ? resumoByRga[rga] : null;
    var currentPeriod = String(currentPeriodValues[i][0] || '').trim();
    var currentCountRaw = String(currentCountValues[i][0] || '').trim();
    var currentCount = currentCountRaw === '' ? 0 : Number(currentCountRaw);
    var historyCount = resumo ? Number(resumo.count || 0) : 0;
    var historyPeriod = resumo ? String(resumo.lastPeriod || '').trim() : '';

    if (resumo && historyCount > 0) {
      matchedCount++;
    }

    if (historyCount <= 0 && preserveExisting && (currentPeriod !== '' || currentCountRaw !== '')) {
      preservedCount++;
      periodValues.push([currentPeriod]);
      countValues.push([isNaN(currentCount) ? 0 : currentCount]);
      continue;
    }

    periodValues.push([historyPeriod || currentPeriod || '0']);
    countValues.push([Math.max(isNaN(currentCount) ? 0 : currentCount, historyCount)]);
  }

  sheet.getRange(2, membersCtx.periodCol, rowCount, 1).setValues(periodValues);
  sheet.getRange(2, membersCtx.countCol, rowCount, 1).setValues(countValues);
  sheet.getRange(2, membersCtx.periodCol, rowCount, 1).setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.getRange(2, membersCtx.countCol, rowCount, 1).setHorizontalAlignment('center').setVerticalAlignment('middle');

  atividades_logEvento_({
    TIPO_EVENTO_LOG: ATIVIDADES_CFG.APRESENTACOES_LOG_TYPES.RESUMO_MEMBERS_APRESENTACAO,
    STATUS: 'OK',
    ACAO_EXECUTADA: 'Sincronizar resumo de apresentacoes em MEMBERS_ATUAIS',
    RESULTADO:
      'updated=' + rowCount +
      ' | matched=' + matchedCount +
      ' | preserved=' + preservedCount +
      ' | invalid_history=' + Number((historyCtx.invalidItems || []).length || 0),
    OBSERVACOES: ''
  });

  return {
    ok: true,
    updatedCount: rowCount,
    matchedCount: matchedCount,
    preservedCount: preservedCount,
    preserveExisting: preserveExisting,
    invalidHistoryRows: (historyCtx.invalidItems || []).length,
    errors: []
  };
}

function atividades_aplicarUxHistoricoPublicoApresentacoes_() {
  var ctx = atividades_buildHistoricoPublicoContext_();
  var sheet = ctx.sheet;
  var headerMap = ctx.headerMap;
  var lastRow = Math.max(sheet.getLastRow(), 1);
  var lastCol = Math.max(sheet.getLastColumn(), 1);

  GEAPA_CORE.coreFreezeHeaderRow(sheet, 1);
  GEAPA_CORE.coreEnsureFilter(sheet, 1, {});
  sheet.getRange(1, 1, lastRow, lastCol)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  GEAPA_CORE.coreApplyHeaderNotes(sheet, {
    'Título': 'Título oficial da apresentação.',
    'Titulo': 'Título oficial da apresentação.',
    'Eixo Temático Principal': 'Eixo temático principal da apresentação.',
    'Eixo Tematico Principal': 'Eixo temático principal da apresentação.',
    'Eixo Temático': 'Eixo temático principal da apresentação. Ao aplicar a UX, este cabecalho legado sera renomeado para Eixo Temático Principal.',
    'Eixo Tematico': 'Eixo temático principal da apresentação. Ao aplicar a UX, este cabecalho legado sera renomeado para Eixo Tematico Principal.',
    'Eixo Temático Secundário': 'Eixo temático secundario da apresentação, quando houver.',
    'Eixo Tematico Secundario': 'Eixo temático secundario da apresentação, quando houver.',
    'Palestrante': 'Nome do membro apresentador.',
    'RGA': 'Identificador oficial do membro apresentador.',
    'Data': 'Data em que a apresentação foi realizada.',
    'Semestre': 'Semestre acadêmico/operacional da apresentação.',
    'Período da apresentação': 'Período institucional do GEAPA ao qual a apresentação pertence, como GEAPA_2025 ou GEAPA_2026.',
    'Arquivo': 'Link amigável para o arquivo ou pasta final da apresentação no Drive.',
    'Link': 'Link amigável para o arquivo ou pasta final da apresentação no Drive.'
  }, 1);

  GEAPA_CORE.coreApplyHeaderColors(sheet, [
    { color: '#fce5cd', headers: [
      'Título',
      'Titulo',
      'Eixo Temático Principal',
      'Eixo Tematico Principal',
      'Eixo Temático',
      'Eixo Tematico',
      'Eixo Temático Secundário',
      'Eixo Tematico Secundario'
    ] },
    { color: '#d9ead3', headers: ['Palestrante', 'RGA'] },
    { color: '#d0e0e3', headers: ['Data', 'Semestre', 'Período da apresentação'] },
    { color: '#fff2cc', headers: ['Arquivo', 'Link'] }
  ], 1, {});

  atividades_applyHistoricoPublicoThematicAxesValidation_(sheet);

  var dataHeader = ctx.resolvedHeaders.DATA;
  var dataCol = GEAPA_CORE.coreGetCol(headerMap, dataHeader);
  if (dataCol && lastRow > 1) {
    sheet.getRange(2, dataCol, lastRow - 1, 1).setNumberFormat(ATIVIDADES_CFG.DATE_FORMAT);
  }

  var titleCol = GEAPA_CORE.coreGetCol(headerMap, ctx.resolvedHeaders.TITULO);
  if (titleCol && lastRow > 1) {
    sheet.getRange(2, titleCol, lastRow - 1, 1).setFontWeight('normal');
  }

  var eixoCol = GEAPA_CORE.coreGetCol(headerMap, ctx.resolvedHeaders.EIXO_TEMATICO);
  if (eixoCol && lastRow > 1) {
    sheet.getRange(2, eixoCol, lastRow - 1, 1).setFontWeight('bold');
  }

  var eixoSecundarioCol = GEAPA_CORE.coreGetCol(headerMap, ctx.resolvedHeaders.EIXO_TEMATICO_SECUNDARIO);
  if (eixoSecundarioCol && lastRow > 1) {
    sheet.getRange(2, eixoSecundarioCol, lastRow - 1, 1).setFontWeight('bold');
  }

  var fileHeader = ctx.resolvedHeaders.LINK;
  var fileCol = GEAPA_CORE.coreGetCol(headerMap, fileHeader);
  if (fileCol) {
    sheet.setColumnWidth(fileCol, 240);
    if (lastRow > 1) {
      sheet.getRange(2, fileCol, lastRow - 1, 1)
        .setFontWeight('bold')
        .setHorizontalAlignment('center')
        .setVerticalAlignment('middle');
    }
  }

  return {
    ok: true,
    sheetName: sheet.getName(),
    lastRow: lastRow,
    lastCol: lastCol
  };
}

function atividades_marcarSyncHistoricoPublicoLinha_(rowNumber) {
  var sheet = atividades_getApresentacoesSheet_();
  var headerMap = GEAPA_CORE.coreHeaderMap(sheet, 1);
  GEAPA_CORE.coreWriteCellByHeader(sheet, rowNumber, headerMap, 'SYNC_HISTORICO_PUBLICO', 'SIM', { oneBased: true });
  if (GEAPA_CORE.coreGetCol(headerMap, 'ATUALIZADO_EM')) {
    GEAPA_CORE.coreWriteCellByHeader(sheet, rowNumber, headerMap, 'ATUALIZADO_EM', new Date(), { oneBased: true });
  }
}

function atividades_sincronizarHistoricoPublicoApresentacoes_(opts) {
  opts = opts || {};
  var ctx;
  try {
    ctx = atividades_buildHistoricoPublicoContext_();
  } catch (err) {
    var message = err && err.message ? err.message : String(err);
    atividades_logEvento_({
      TIPO_EVENTO_LOG: ATIVIDADES_CFG.APRESENTACOES_LOG_TYPES.SYNC_HISTORICO_PUBLICO_APRESENTACAO,
      STATUS: 'ATENCAO',
      ACAO_EXECUTADA: 'Preparar sincronizacao do historico publico das apresentacoes',
      RESULTADO: 'skipped=1 | errors=1',
      OBSERVACOES: message
    });
    return {
      ok: false,
      skippedCount: 0,
      insertedCount: 0,
      updatedCount: 0,
      errorCount: 1,
      inserted: [],
      updated: [],
      errors: [{ rowNumber: 0, idAtividade: '', message: message }],
      reason: 'history_public_context_unavailable'
    };
  }

  var enrichedExisting = atividades_enriquecerHistoricoPublicoExistente_(ctx);
  atividades_applyHistoricoPublicoThematicAxesValidation_(ctx.sheet);

  var inserted = [];
  var updated = [];
  var skipped = 0;
  var errors = [];
  var aptCount = 0;
  var matchedByLooseCount = 0;
  var skippedReasons = Object.create(null);
  var processedKeys = Object.create(null);

  atividades_listApresentacaoRowsWithNumbers_().forEach(function(item) {
    try {
      var eligibility = atividades_getHistoricoPublicoEligibilityInfo_(item.record);
      if (!eligibility.ok) {
        skipped++;
        eligibility.reasons.forEach(function(reason) {
          skippedReasons[reason] = (skippedReasons[reason] || 0) + 1;
        });
        return;
      }
      aptCount++;

      var hist = atividades_toHistoricoPublicoObj_(item.record);
      var existingMatch = atividades_findHistoricoPublicoExistingItem_(ctx, hist);
      var key = existingMatch.key;
      if (!key) {
        skipped++;
        skippedReasons.chave_historico_invalida = (skippedReasons.chave_historico_invalida || 0) + 1;
        return;
      }

      if (processedKeys[key]) {
        skipped++;
        skippedReasons.duplicate_in_batch = (skippedReasons.duplicate_in_batch || 0) + 1;
        return;
      }
      processedKeys[key] = true;

      var existing = existingMatch.item;
      if (existing) {
        atividades_writeHistoricoPublicoRow_(ctx.sheet, existing.rowNumber, ctx, hist);
        if (existingMatch.matchedBy === 'loose') {
          matchedByLooseCount++;
        }
        updated.push({
          rowNumber: existing.rowNumber,
          idAtividade: String(item.record.ID_ATIVIDADE || '').trim(),
          key: key
        });
      } else {
        if (atividades_isTruthySim_(item.record.SYNC_HISTORICO_PUBLICO)) {
          skipped++;
          skippedReasons.sync_ja_marcado_sem_match = (skippedReasons.sync_ja_marcado_sem_match || 0) + 1;
          return;
        }
        var rowNumber = atividades_appendHistoricoPublicoRow_(ctx, hist);
        inserted.push({
          rowNumber: rowNumber,
          idAtividade: String(item.record.ID_ATIVIDADE || '').trim(),
          key: key
        });
      }

      atividades_marcarSyncHistoricoPublicoLinha_(item.rowNumber);
    } catch (err) {
      errors.push({
        rowNumber: item.rowNumber,
        idAtividade: String(item.record.ID_ATIVIDADE || '').trim(),
        message: err && err.message ? err.message : String(err)
      });
    }
  });

  atividades_logEvento_({
    TIPO_EVENTO_LOG: ATIVIDADES_CFG.APRESENTACOES_LOG_TYPES.SYNC_HISTORICO_PUBLICO_APRESENTACAO,
    STATUS: errors.length ? 'ATENCAO' : 'OK',
    ACAO_EXECUTADA: 'Sincronizar apresentacoes no historico publico',
    RESULTADO:
      'aptas=' + aptCount +
      ' | inserted=' + inserted.length +
      ' | updated=' + updated.length +
      ' | matched_loose=' + matchedByLooseCount +
      ' | enriched=' + enrichedExisting +
      ' | skipped=' + skipped +
      ' | errors=' + errors.length,
    OBSERVACOES: [
      inserted.concat(updated).slice(0, 20).map(function(item) {
        return item.idAtividade + ':' + item.rowNumber;
      }).join(' | '),
      Object.keys(skippedReasons).length
        ? 'skipped_reasons=' + Object.keys(skippedReasons).map(function(reason) {
          return reason + ':' + skippedReasons[reason];
        }).join(', ')
        : ''
    ].filter(function(part) {
      return !!part;
    }).join(' || ')
  });

  return {
    ok: errors.length === 0,
    aptCount: aptCount,
    insertedCount: inserted.length,
    updatedCount: updated.length,
    matchedByLooseCount: matchedByLooseCount,
    enrichedExistingCount: enrichedExisting,
    skippedCount: skipped,
    skippedReasons: skippedReasons,
    errorCount: errors.length,
    inserted: inserted,
    updated: updated,
    errors: errors
  };
}
