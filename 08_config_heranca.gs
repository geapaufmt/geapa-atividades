function atividades_normalizeMatchValue_(value) {
  return atividades_normalizeTextUpper_(value).replace(/\s+/g, '_');
}

function atividades_listConfigRules_() {
  return GEAPA_CORE.coreReadSheetRecords(atividades_getConfigSheet_(), { headerRow: 1 })
    .filter(function(rule) {
      return atividades_isTruthySim_(rule.ATIVO);
    });
}

function atividades_findBestConfigRule_(activityRow) {
  var rules = atividades_listConfigRules_();
  var rowClassification = atividades_normalizeMatchValue_(activityRow.CLASSIFICACAO_REUNIAO);
  var rowType = atividades_normalizeMatchValue_(activityRow.TIPO_ATIVIDADE);
  var rowSubtype = atividades_normalizeMatchValue_(activityRow.SUBTIPO_ATIVIDADE);
  var best = null;
  var bestScore = -1;

  rules.forEach(function(rule) {
    var ruleClassification = atividades_normalizeMatchValue_(rule.CLASSIFICACAO_REUNIAO);
    var ruleType = atividades_normalizeMatchValue_(rule.TIPO_ATIVIDADE);
    var ruleSubtype = atividades_normalizeMatchValue_(rule.SUBTIPO_ATIVIDADE);
    var score = 0;

    if (ruleType !== rowType) return;
    if (ruleClassification && ruleClassification !== rowClassification) return;
    if (ruleSubtype && ruleSubtype !== rowSubtype) return;

    if (ruleClassification && ruleClassification === rowClassification) score += 2;
    if (ruleSubtype && ruleSubtype === rowSubtype) score += 1;

    if (score > bestScore) {
      best = rule;
      bestScore = score;
    }
  });

  return best || null;
}

function atividades_aplicarConfigLinhaAtividade_(rowNumber) {
  var sheet = atividades_getAtividadesSheet_();
  var targetRow = Number(rowNumber || 0);
  if (targetRow < 2) {
    throw new Error('rowNumber invalido para heranca de config: ' + rowNumber);
  }

  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(header) {
    return String(header || '').trim();
  });
  var row = sheet.getRange(targetRow, 1, 1, lastCol).getValues()[0];
  var rowObj = GEAPA_CORE.coreRowToObject(headers, row);
  var rule = atividades_findBestConfigRule_(rowObj);

  if (!rule) {
    return {
      ok: false,
      reason: 'config_not_found',
      rowNumber: targetRow,
      classificacaoReuniao: rowObj.CLASSIFICACAO_REUNIAO || '',
      tipoAtividade: rowObj.TIPO_ATIVIDADE || '',
      subtipoAtividade: rowObj.SUBTIPO_ATIVIDADE || ''
    };
  }

  var headerMap = GEAPA_CORE.coreHeaderMap(sheet, 1);
  var changedHeaders = [];

  ATIVIDADES_CFG.CONFIG_INHERITED_HEADERS.forEach(function(header) {
    if (!Object.prototype.hasOwnProperty.call(rule, header)) return;
    if (!GEAPA_CORE.coreGetCol(headerMap, header)) return;

    GEAPA_CORE.coreWriteCellByHeader(sheet, targetRow, headerMap, header, rule[header], {
      oneBased: true
    });
    changedHeaders.push(header);
  });

  if (GEAPA_CORE.coreGetCol(headerMap, 'ATUALIZADO_EM')) {
    GEAPA_CORE.coreWriteCellByHeader(sheet, targetRow, headerMap, 'ATUALIZADO_EM', new Date(), {
      oneBased: true
    });
  }

  return {
    ok: true,
    rowNumber: targetRow,
    matchedRule: {
      classificacaoReuniao: rule.CLASSIFICACAO_REUNIAO || '',
      tipoAtividade: rule.TIPO_ATIVIDADE || '',
      subtipoAtividade: rule.SUBTIPO_ATIVIDADE || ''
    },
    changedHeaders: changedHeaders
  };
}
