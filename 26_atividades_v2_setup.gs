/**
 * Setup manual da base ATIVIDADES INTERNAS GEAPA v2 - DEV.
 *
 * A planilha deve ser cadastrada manualmente no Registry com a key
 * ATIVIDADES_V2_DB. Esta rotina nao cria planilhas, nao altera o Registry,
 * nao instala triggers, nao envia e-mails e nao registra presencas reais.
 */

var ATIVIDADES_V2_SETUP_RUN_ID = '';
var ATIVIDADES_V2_VIGENCIA_SEMESTRE_CACHE = {};

function atividadesV2_setupDatabaseDev() {
  var spreadsheet = atividadesV2_getDatabaseSpreadsheet_({ ambiente: 'DEV' });
  var result = {
    ok: true,
    spreadsheetId: spreadsheet.getId(),
    url: spreadsheet.getUrl(),
    abasCriadas: [],
    abasExistentes: [],
    cabecalhosAdicionados: {},
    validacoesAplicadas: {},
    avisos: [],
    erros: []
  };

  atividadesV2_logSetup_('INFO', 'Iniciando setup da base ATIVIDADES v2 do ambiente resolvido.', {
    spreadsheetId: result.spreadsheetId
  });

  ATIVIDADES_V2_SHEET_ORDER.forEach(function(sheetName) {
    try {
      var sheetResult = atividadesV2_createSheetIfMissing_(spreadsheet, sheetName);
      var sheet = sheetResult.sheet;
      if (sheetResult.created) {
        result.abasCriadas.push(sheetName);
      } else {
        result.abasExistentes.push(sheetName);
      }

      var headers = ATIVIDADES_V2_SCHEMA_BY_SHEET[sheetName] || [];
      var headerResult = atividadesV2_applyHeadersIfMissing_(sheet, headers);
      if (headerResult.added.length) {
        result.cabecalhosAdicionados[sheetName] = headerResult.added;
      }
      if (headerResult.warning) {
        result.avisos.push(sheetName + ': ' + headerResult.warning);
      }

      var uxWarnings = atividadesV2_applyBasicSheetUx_(sheet);
      uxWarnings.forEach(function(warning) {
        result.avisos.push(sheetName + ': ' + warning);
      });

      result.validacoesAplicadas[sheetName] = atividadesV2_applyValidations_(sheet, sheetName);
    } catch (e) {
      result.ok = false;
      result.erros.push(sheetName + ': ' + (e && e.message ? e.message : e));
      atividadesV2_logSetup_('ERROR', 'Falha ao preparar aba da base ATIVIDADES v2 do ambiente resolvido.', {
        sheetName: sheetName,
        error: e && e.message ? e.message : String(e)
      });
    }
  });

  atividadesV2_logSetup_(result.ok ? 'INFO' : 'WARN', 'Setup da base ATIVIDADES v2 do ambiente resolvido finalizado.', {
    spreadsheetId: result.spreadsheetId,
    abasCriadas: result.abasCriadas.length,
    abasExistentes: result.abasExistentes.length,
    erros: result.erros.length,
    avisos: result.avisos.length
  });

  return result;
}

function atividadesV2_removerColunaPeriodoReferenciaDev() {
  var spreadsheet = atividadesV2_getDatabaseSpreadsheet_({ ambiente: 'DEV' });
  var result = {
    ok: true,
    spreadsheetId: spreadsheet.getId(),
    abasVerificadas: [],
    colunasRemovidas: {},
    avisos: [],
    erros: []
  };

  ATIVIDADES_V2_SHEET_ORDER.forEach(function(sheetName) {
    try {
      var sheet = spreadsheet.getSheetByName(sheetName);
      if (!sheet) {
        result.avisos.push('Aba ausente: ' + sheetName);
        return;
      }

      result.abasVerificadas.push(sheetName);
      var lastColumn = sheet.getLastColumn();
      if (lastColumn < 1) return;

      var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
      var colsToDelete = [];
      headers.forEach(function(header, index) {
        if (String(header || '').trim().toUpperCase() === 'PERIODO_REFERENCIA') {
          colsToDelete.push(index + 1);
        }
      });

      colsToDelete.reverse().forEach(function(col) {
        sheet.deleteColumn(col);
      });
      if (colsToDelete.length) {
        result.colunasRemovidas[sheetName] = colsToDelete.length;
      }
    } catch (e) {
      result.ok = false;
      result.erros.push(sheetName + ': ' + (e && e.message ? e.message : String(e)));
    }
  });

  atividadesV2_logSetup_(result.ok ? 'INFO' : 'WARN', 'Remocao da coluna PERIODO_REFERENCIA na base v2 do ambiente resolvido finalizada.', {
    spreadsheetId: result.spreadsheetId,
    abasComRemocao: Object.keys(result.colunasRemovidas).length,
    erros: result.erros.length
  });

  return result;
}

/**
 * Valida a estrutura atual da base v2 do ambiente resolvido sem escrever em nenhuma aba.
 */
function atividadesV2_validarDatabaseDev() {
  var spreadsheet = atividadesV2_getDatabaseSpreadsheet_({ ambiente: 'DEV' });
  var result = {
    ok: true,
    readOnly: true,
    spreadsheetId: spreadsheet.getId(),
    url: spreadsheet.getUrl(),
    registryKey: ATIVIDADES_V2_REGISTRY_KEYS.DB,
    expectedSheets: ATIVIDADES_V2_SHEET_ORDER.slice(),
    missingSheets: [],
    extraSheets: [],
    sheets: {},
    avisos: [],
    erros: []
  };

  var expectedByName = {};
  ATIVIDADES_V2_SHEET_ORDER.forEach(function(sheetName) {
    expectedByName[sheetName] = true;
  });

  spreadsheet.getSheets().forEach(function(sheet) {
    var sheetName = sheet.getName();
    if (!expectedByName[sheetName]) {
      result.extraSheets.push(sheetName);
      result.avisos.push('Aba nao prevista na v2 do ambiente resolvido: ' + sheetName + '. Nenhuma acao automatica sera tomada.');
    }
  });

  ATIVIDADES_V2_SHEET_ORDER.forEach(function(sheetName) {
    var sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      result.ok = false;
      result.missingSheets.push(sheetName);
      result.erros.push('Aba obrigatoria ausente: ' + sheetName + '.');
      return;
    }

    var sheetResult = atividadesV2_validateSheetReadOnly_(sheet, ATIVIDADES_V2_SCHEMA_BY_SHEET[sheetName] || []);
    result.sheets[sheetName] = sheetResult;

    if (!sheetResult.ok) {
      result.ok = false;
      result.erros = result.erros.concat(sheetResult.erros.map(function(message) {
        return sheetName + ': ' + message;
      }));
    }

    result.avisos = result.avisos.concat(sheetResult.avisos.map(function(message) {
      return sheetName + ': ' + message;
    }));
  });

  atividadesV2_logSetup_(result.ok ? 'INFO' : 'WARN', 'Validacao read-only da base ATIVIDADES v2 do ambiente resolvido finalizada.', {
    spreadsheetId: result.spreadsheetId,
    missingSheets: result.missingSheets.length,
    extraSheets: result.extraSheets.length,
    erros: result.erros.length,
    avisos: result.avisos.length
  });

  return result;
}

/**
 * Planeja a migracao de teste V1 -> v2 sem escrever dados.
 */
function atividadesV2_planejarMigracaoTeste() {
  atividades_assertCoreLibrary_();

  var targetSpreadsheet = atividadesV2_getDatabaseSpreadsheet_({ ambiente: 'DEV' });
  var operationalHolder = atividades_getOperationalHolder_();
  var sourceSpreadsheet = operationalHolder.spreadsheet;
  var result = {
    ok: true,
    readOnly: true,
    source: {
      spreadsheetId: sourceSpreadsheet.getId(),
      url: sourceSpreadsheet.getUrl()
    },
    target: {
      spreadsheetId: targetSpreadsheet.getId(),
      url: targetSpreadsheet.getUrl()
    },
    fixedSources: {},
    dynamicPeriods: [],
    estimates: {
      atividades: 0,
      apresentacoes: 0,
      convites: 0,
      justificativas: 0,
      config: 0,
      presencasRegistrosAllCells: 0,
      presencasRegistrosWithValue: 0,
      presencasRegistrosBlankCells: 0
    },
    fieldCoverage: atividadesV2_buildMigrationFieldCoverage_(),
    duplicateKeys: {},
    avisos: [],
    erros: []
  };

  var fixedPlans = [
    { key: 'Atividades', dest: 'Atividades', getSheet: atividades_getAtividadesSheet_, idHeader: 'ID_ATIVIDADE', estimateKey: 'atividades' },
    { key: 'Atividades_Apresentacoes', dest: 'Atividades_Apresentacoes', getSheet: atividades_getApresentacoesSheet_, idHeader: 'ID_APRESENTACAO', estimateKey: 'apresentacoes' },
    { key: 'Atividade_Convidados', dest: 'Atividades_Convites', getSheet: atividades_getConvidadosSheet_, idHeader: 'ID_CONVITE_ATIVIDADE', estimateKey: 'convites' },
    { key: 'Justificativas_Faltas', dest: 'Justificativas_Faltas', getSheet: atividades_getJustificativasFaltasSheet_, idHeader: 'ID_JUSTIFICATIVA', estimateKey: 'justificativas' },
    { key: 'Atividades_Config', dest: 'Atividades_Config', getSheet: atividades_getConfigSheet_, idHeader: '', estimateKey: 'config' }
  ];

  fixedPlans.forEach(function(plan) {
    try {
      var sheet = plan.getSheet();
      var summary = atividadesV2_summarizeLegacySheetForMigration_(sheet, plan.idHeader);
      summary.destinationSheet = plan.dest;
      result.fixedSources[plan.key] = summary;
      result.estimates[plan.estimateKey] = summary.dataRows;
      if (summary.duplicateKeys.length) {
        result.duplicateKeys[plan.key] = summary.duplicateKeys;
        result.avisos.push(plan.key + ': chaves duplicadas encontradas em ' + plan.idHeader + '.');
      }
    } catch (e) {
      result.ok = false;
      result.erros.push(plan.key + ': ' + (e && e.message ? e.message : String(e)));
    }
  });

  result.dynamicPeriods = atividadesV2_planLegacyPresenceMigration_(sourceSpreadsheet);
  result.dynamicPeriods.forEach(function(period) {
    result.estimates.presencasRegistrosAllCells += period.estimatedRecordsAllCells;
    result.estimates.presencasRegistrosWithValue += period.estimatedRecordsWithValue;
    result.estimates.presencasRegistrosBlankCells += period.estimatedBlankCells;
    if (!period.activitySheetFound) {
      result.avisos.push(period.periodCode + ': aba Atividades_Periodo correspondente nao encontrada.');
    }
    if (!period.presenceSheetFound) {
      result.avisos.push(period.periodCode + ': aba Presencas correspondente nao encontrada.');
    }
    if (period.dynamicPresenceColumns === 0 && period.presenceSheetFound) {
      result.avisos.push(period.periodCode + ': nenhuma coluna dinamica de presenca detectada.');
    }
  });

  if (!result.dynamicPeriods.length) {
    result.avisos.push('Nenhuma dupla Atividades_Periodo_*/Presencas_* foi localizada na planilha operacional.');
  }

  atividadesV2_logSetup_(result.ok ? 'INFO' : 'WARN', 'Planejamento read-only da migracao V1 -> v2 finalizado.', {
    sourceSpreadsheetId: result.source.spreadsheetId,
    targetSpreadsheetId: result.target.spreadsheetId,
    atividades: result.estimates.atividades,
    apresentacoes: result.estimates.apresentacoes,
    convites: result.estimates.convites,
    justificativas: result.estimates.justificativas,
    presencasAllCells: result.estimates.presencasRegistrosAllCells,
    erros: result.erros.length,
    avisos: result.avisos.length
  });

  return result;
}

/**
 * Simula a migracao V1 -> v2 do ambiente resolvido sem escrever dados.
 */
function atividadesV2_migrarTesteDevDryRun() {
  return atividadesV2_migrarTesteDev_({ dryRun: true });
}

/**
 * Migra dados da V1 para a base v2 do ambiente resolvido sem alterar a base original.
 *
 * A rotina e idempotente por chave natural de cada aba v2 e nao limpa dados:
 * insere registros novos e atualiza apenas colunas presentes no payload de
 * migracao para registros ja existentes.
 */
function atividadesV2_migrarTesteDev() {
  return atividadesV2_migrarTesteDev_({ dryRun: false });
}

/**
 * Sincroniza para a v2 do ambiente resolvido apenas registros brutos que ainda faltam.
 *
 * Diferente da migracao de teste completa, esta rotina preserva registros ja
 * existentes por padrao. Isso evita sobrescrever campos curados na v2, como
 * status de publicacao, visibilidade, textos publicos ou ajustes operacionais.
 *
 * Opcoes:
 * - dryRun: true para simular sem escrita.
 * - atualizarExistentes: true para tambem atualizar registros existentes.
 * - includeBlankPresence: true para migrar celulas vazias de presenca.
 * - includeConfig: true para incluir Atividades_Config.
 */
function atividadesV2_sincronizarBrutasDev_(options) {
  var opts = options || {};
  var dryRun = opts.dryRun === true;
  var lock = null;

  if (!dryRun) {
    lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) {
      return {
        ok: false,
        dryRun: false,
        errorCode: 'LOCK_INDISPONIVEL',
        message: 'Nao foi possivel obter lock para sincronizar bases brutas v2 do ambiente resolvido.'
      };
    }
  }

  try {
    return atividadesV2_sincronizarBrutasDevSemLock_(opts);
  } finally {
    if (lock) lock.releaseLock();
  }
}

/**
 * Sincroniza bases brutas faltantes e, em seguida, atualiza as views PORTAL_*.
 */
function atividadesV2_sincronizarBrutasEViewsDev_(options) {
  var opts = Object.assign({}, options || {});
  var rawResult = atividadesV2_sincronizarBrutasDev_(opts);
  var viewsResult = null;

  if (rawResult.ok && opts.atualizarViews !== false) {
    viewsResult = atividadesV2_atualizarViewsPortal_({
      dryRun: opts.dryRun === true,
      stopOnError: opts.stopOnError !== false
    });
  }

  return {
    ok: rawResult.ok && (!viewsResult || viewsResult.ok),
    dryRun: opts.dryRun === true,
    brutas: rawResult,
    views: viewsResult,
    avisos: (rawResult.avisos || []).concat(viewsResult && viewsResult.avisos || []),
    erros: (rawResult.erros || []).concat(viewsResult && viewsResult.erros || [])
  };
}

/**
 * Simula a migracao da modelagem de apresentacoes para Atividades/Envolvidos.
 *
 * Use antes da execucao real para revisar conflitos e contadores sem escrever
 * em nenhuma aba da base v2 do ambiente resolvido.
 */
function atividadesV2_migrarApresentacoesParaAtividadesDevDryRun_() {
  return atividadesV2_migrarApresentacoesParaAtividadesDev_({ dryRun: true });
}

/**
 * Preenche campos centrais em Atividades e cria envolvidos a partir das linhas
 * legadas de Atividades_Apresentacoes, sem alterar bases antigas.
 */
function atividadesV2_migrarApresentacoesParaAtividadesDev_(options) {
  var opts = options || {};
  var dryRun = opts.dryRun !== false;
  var lock = null;

  if (!dryRun) {
    lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) {
      return {
        ok: false,
        dryRun: false,
        errorCode: 'LOCK_INDISPONIVEL',
        message: 'Nao foi possivel obter lock para migrar apresentacoes para Atividades v2 do ambiente resolvido.'
      };
    }
  }

  try {
    return atividadesV2_migrarApresentacoesParaAtividadesDevSemLock_(Object.assign({}, opts, {
      dryRun: dryRun
    }));
  } finally {
    if (lock) lock.releaseLock();
  }
}

function atividadesV2_migrarApresentacoesParaAtividadesDevSemLock_(opts) {
  var dryRun = opts.dryRun === true;
  var ss = atividadesV2_getDatabaseSpreadsheet_({ ambiente: 'DEV' });
  var atividadesSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES);
  var apresentacoesSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.APRESENTACOES);
  var envolvidosSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ENVOLVIDOS);

  atividadesV2_applyHeadersIfMissing_(atividadesSheet, ATIVIDADES_V2_SCHEMA.ATIVIDADES);
  atividadesV2_applyHeadersIfMissing_(envolvidosSheet, ATIVIDADES_V2_SCHEMA.ENVOLVIDOS);

  var atividades = atividadesV2_readSheetObjects_(atividadesSheet);
  var apresentacoes = atividadesV2_readSheetObjects_(apresentacoesSheet);
  var atividadesById = atividadesV2_indexByField_(atividades, 'ID_ATIVIDADE');
  var existentesEnvolvidos = atividadesV2_readSheetObjects_(envolvidosSheet);
  var existentesEnvolvidosById = atividadesV2_indexByField_(existentesEnvolvidos, 'ID_ENVOLVIDO');
  var existentesEnvolvidosByNaturalKey = atividadesV2_indexEnvolvidosMigrationNaturalKey_(existentesEnvolvidos);
  var atividadeHeaders = atividadesV2_getSheetHeaders_(atividadesSheet).filter(function(header) { return !!header; });
  var atividadeHeaderMap = atividadesV2_simpleHeaderMap_(atividadeHeaders);
  var atividadeValues = atividadesSheet.getLastRow() > 1
    ? atividadesSheet.getRange(2, 1, atividadesSheet.getLastRow() - 1, atividadeHeaders.length).getValues()
    : [];
  var atividadeChangedRows = {};
  var envolvidosPayload = [];
  var processedActivities = {};
  var report = {
    ok: true,
    dryRun: dryRun,
    modo: atividadesV2_resolveEnvironment_({}),
    totalApresentacoesLidas: apresentacoes.length,
    totalAtividadesEncontradas: 0,
    totalAtividadesAtualizadas: 0,
    totalLinhasCriadasEmEnvolvidos: 0,
    totalEnvolvidosJaExistentes: 0,
    apresentacoesSemIdAtividade: [],
    apresentacoesComIdAtividadeInvalido: [],
    apresentacoesComIdAtividadeNaoEncontrado: [],
    conflitos: [],
    avisos: [],
    erros: []
  };

  apresentacoes.forEach(function(apresentacao) {
    if (atividades_normalizeTextUpper_(apresentacao.ATIVO || 'SIM') === 'NAO') return;

    var idAtividade = String(apresentacao.ID_ATIVIDADE || '').trim();
    if (!idAtividade) {
      report.apresentacoesSemIdAtividade.push(atividadesV2_migrationPresentationRef_(apresentacao));
      return;
    }
    if (!atividadesV2_isCanonicalActivityId_(idAtividade)) {
      report.apresentacoesComIdAtividadeInvalido.push(atividadesV2_migrationPresentationRef_(apresentacao));
      return;
    }

    var atividade = atividadesById[idAtividade];
    if (!atividade) {
      report.apresentacoesComIdAtividadeNaoEncontrado.push(atividadesV2_migrationPresentationRef_(apresentacao));
      return;
    }

    if (!processedActivities[idAtividade]) {
      report.totalAtividadesEncontradas++;
      processedActivities[idAtividade] = true;
    }

    var rowIndex = atividade._rowNumber - 2;
    var changed = atividadesV2_applyApresentacaoToAtividadeRow_(atividadeValues[rowIndex], atividadeHeaders, atividadeHeaderMap, atividade, apresentacao, report);
    if (changed) atividadeChangedRows[rowIndex] = true;

    var envolvido = atividadesV2_buildEnvolvidoFromApresentacao_(atividade, apresentacao);
    var naturalKey = atividadesV2_buildEnvolvidoMigrationNaturalKey_(envolvido);
    if (existentesEnvolvidosById[envolvido.ID_ENVOLVIDO] || existentesEnvolvidosByNaturalKey[naturalKey]) {
      report.totalEnvolvidosJaExistentes++;
      return;
    }
    existentesEnvolvidosById[envolvido.ID_ENVOLVIDO] = envolvido;
    existentesEnvolvidosByNaturalKey[naturalKey] = envolvido;
    envolvidosPayload.push(envolvido);
  });

  report.totalAtividadesAtualizadas = Object.keys(atividadeChangedRows).length;
  report.totalLinhasCriadasEmEnvolvidos = envolvidosPayload.length;

  if (!dryRun) {
    if (report.totalAtividadesAtualizadas > 0 && atividadeValues.length) {
      atividadesSheet.getRange(2, 1, atividadeValues.length, atividadeHeaders.length).setValues(atividadeValues);
    }
    atividadesV2_upsertObjectsByKey_(envolvidosSheet, envolvidosPayload, 'ID_ENVOLVIDO', {
      dryRun: false,
      insertOnly: true
    });
    atividadesV2_appendV2Log_(ss, {
      FLUXO: 'MIGRACAO_MODELAGEM_V2_DEV',
      ACAO: 'Migrar dados de apresentacoes para Atividades e Envolvidos',
      NIVEL: report.conflitos.length ? 'WARN' : 'INFO',
      STATUS: report.erros.length ? 'ERRO' : 'OK',
      MENSAGEM: 'Modelagem v2 de apresentacoes migrada para fonte principal em Atividades.',
      DETALHES_JSON: atividadesV2_safeLogData_({
        atividadesAtualizadas: report.totalAtividadesAtualizadas,
        envolvidosCriados: report.totalLinhasCriadasEmEnvolvidos,
        conflitos: report.conflitos.length
      })
    });
    if (typeof atividadesV2_limparCachePortalDev_ === 'function') atividadesV2_limparCachePortalDev_();
  }

  report.ok = report.erros.length === 0;
  return report;
}

function atividadesV2_applyApresentacaoToAtividadeRow_(row, headers, headerMap, atividade, apresentacao, report) {
  var changed = false;
  var idAtividade = String(atividade.ID_ATIVIDADE || '').trim();
  var isApresentacao = atividadesV2_isFluxoApresentacao_(atividade);
  var tituloApresentacao = String(apresentacao.TITULO_APRESENTACAO || '').trim();

  if (isApresentacao && tituloApresentacao) {
    changed = atividadesV2_fillActivityFieldFromMigration_(row, headers, headerMap, atividade, 'TITULO', tituloApresentacao, report, idAtividade, true) || changed;
    changed = atividadesV2_fillActivityFieldFromMigration_(row, headers, headerMap, atividade, 'TITULO_PUBLICO', tituloApresentacao, report, idAtividade, true) || changed;
  }

  [
    ['EIXO_TEMATICO_PRINCIPAL', apresentacao.EIXO_TEMATICO_PRINCIPAL],
    ['EIXO_TEMATICO_SECUNDARIO', apresentacao.EIXO_TEMATICO_SECUNDARIO],
    ['ID_PESSOA_PRINCIPAL', apresentacao.ID_PESSOA],
    ['NOME_PESSOA_PRINCIPAL_PUBLICO', apresentacao.NOME_MEMBRO],
    ['RGA_PESSOA_PRINCIPAL', apresentacao.RGA],
    ['EMAIL_PESSOA_PRINCIPAL', apresentacao.EMAIL_MEMBRO],
    ['TIPO_PESSOA_PRINCIPAL', 'MEMBRO'],
    ['PAPEL_PESSOA_PRINCIPAL', 'APRESENTADOR']
  ].forEach(function(item) {
    changed = atividadesV2_fillActivityFieldFromMigration_(row, headers, headerMap, atividade, item[0], item[1], report, idAtividade, false) || changed;
  });

  return changed;
}

function atividadesV2_fillActivityFieldFromMigration_(row, headers, headerMap, atividade, field, value, report, idAtividade, allowGenericOverwrite) {
  var col = headerMap[field] || 0;
  if (!col) return false;

  var incoming = String(value || '').trim();
  if (!incoming) return false;

  var current = String(row[col - 1] || '').trim();
  if (!current || (allowGenericOverwrite && atividadesV2_isGenericActivityTitle_(current))) {
    row[col - 1] = value;
    atividade[field] = value;
    return true;
  }

  if (atividadesV2_normalizeComparable_(current) !== atividadesV2_normalizeComparable_(incoming)) {
    report.conflitos.push({
      idAtividade: idAtividade,
      campo: field,
      valorAtual: atividadesV2_truncateForReport_(current),
      valorOrigemApresentacao: atividadesV2_truncateForReport_(incoming)
    });
  }
  return false;
}

function atividadesV2_buildEnvolvidoFromApresentacao_(atividade, apresentacao) {
  var idAtividade = String(atividade.ID_ATIVIDADE || apresentacao.ID_ATIVIDADE || '').trim();
  var idPessoa = String(apresentacao.ID_PESSOA || atividade.ID_PESSOA_PRINCIPAL || '').trim();
  var rga = String(apresentacao.RGA || atividade.RGA_PESSOA_PRINCIPAL || '').trim();
  var email = String(apresentacao.EMAIL_MEMBRO || atividade.EMAIL_PESSOA_PRINCIPAL || '').trim();
  var nome = String(apresentacao.NOME_MEMBRO || atividade.NOME_PESSOA_PRINCIPAL_PUBLICO || '').trim();
  var idRef = idPessoa || rga || email || nome || apresentacao.ID_APRESENTACAO || apresentacao._rowNumber;
  return {
    ID_ENVOLVIDO: atividadesV2_buildDeterministicId_('ENV', [idAtividade, 'APRESENTADOR', idRef]),
    ID_ATIVIDADE: idAtividade,
    ORDEM_EXIBICAO: 1,
    PAPEL_NA_ATIVIDADE: 'APRESENTADOR',
    TIPO_PESSOA: 'MEMBRO',
    ID_PESSOA: idPessoa,
    NOME_PUBLICO: nome,
    RGA: rga,
    EMAIL: email,
    INSTITUICAO: String(atividade.INSTITUICAO_PESSOA_PRINCIPAL || '').trim(),
    CARGO_OU_FUNCAO: '',
    EXIBIR_NO_PORTAL: 'SIM',
    VISIBILIDADE_PORTAL: String(atividade.VISIBILIDADE_PORTAL || 'MEMBROS').trim(),
    OBSERVACOES: atividadesV2_appendMigrationObs_('', 'Origem: Atividades_Apresentacoes / ' + String(apresentacao.ID_APRESENTACAO || apresentacao._rowNumber || '').trim()),
    ATIVO: 'SIM'
  };
}

function atividadesV2_indexEnvolvidosMigrationNaturalKey_(envolvidos) {
  var index = {};
  (envolvidos || []).forEach(function(envolvido) {
    var key = atividadesV2_buildEnvolvidoMigrationNaturalKey_(envolvido);
    if (key && !index[key]) index[key] = envolvido;
  });
  return index;
}

function atividadesV2_buildEnvolvidoMigrationNaturalKey_(envolvido) {
  var idRef = String(envolvido.ID_PESSOA || envolvido.RGA || envolvido.EMAIL || envolvido.NOME_PUBLICO || '').trim();
  return [
    String(envolvido.ID_ATIVIDADE || '').trim(),
    atividadesV2_sanitizeIdToken_(envolvido.PAPEL_NA_ATIVIDADE || ''),
    atividadesV2_sanitizeIdToken_(idRef)
  ].join('|');
}

function atividadesV2_isGenericActivityTitle_(value) {
  var normalized = atividadesV2_normalizeComparable_(value);
  return !normalized ||
    normalized === 'ATIVIDADE DO GEAPA' ||
    normalized === 'APRESENTACAO DE MEMBRO' ||
    normalized === 'APRESENTACAO' ||
    normalized === 'REUNIAO GEAPA';
}

function atividadesV2_normalizeComparable_(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function atividadesV2_truncateForReport_(value) {
  var text = String(value || '').trim();
  return text.length > 180 ? text.slice(0, 180) + '...' : text;
}

function atividadesV2_migrationPresentationRef_(apresentacao) {
  return {
    rowNumber: apresentacao._rowNumber || '',
    idApresentacao: String(apresentacao.ID_APRESENTACAO || '').trim(),
    idAtividade: String(apresentacao.ID_ATIVIDADE || '').trim()
  };
}

/**
 * Diagnostica os IDs atuais da v2 do ambiente resolvido sem alterar dados.
 */
function atividadesV2_diagnosticarIdsDev() {
  var ss = atividadesV2_getDatabaseSpreadsheet_({ ambiente: 'DEV' });
  var atividadesSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES);
  var atividades = atividadesV2_readSheetObjects_(atividadesSheet);
  var activityMap = atividadesV2_buildActivityIdNormalizationMap_(atividades);
  var result = {
    ok: true,
    readOnly: true,
    spreadsheetId: ss.getId(),
    url: ss.getUrl(),
    idsAtuais: [],
    linhasSemAno: [],
    linhasSemSemestre: [],
    linhasSemNumeroSequencialNoCiclo: [],
    inconsistenciasEntreAbas: [],
    naoNormalizaveis: [],
    avisos: [],
    erros: []
  };

  activityMap.activities.forEach(function(item) {
    result.idsAtuais.push({
      rowNumber: item.rowNumber,
      idAtual: item.currentId,
      idNormalizado: item.newId,
      idLegado: item.legacyId,
      ano: item.ano,
      semestre: item.semestre,
      sequencial: item.sequencial
    });
    if (!item.rawAno) result.linhasSemAno.push(item.rowNumber);
    if (!item.rawSemestre) result.linhasSemSemestre.push(item.rowNumber);
    if (!item.rawSequencial) result.linhasSemNumeroSequencialNoCiclo.push(item.rowNumber);
    if (!item.canNormalize) {
      result.ok = false;
      result.naoNormalizaveis.push({
        rowNumber: item.rowNumber,
        idAtual: item.currentId,
        idLegado: item.legacyId,
        motivo: item.reason
      });
    }
  });

  atividadesV2_getActivityReferenceSheetNames_().forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;
    var refs = atividadesV2_findUnmappedActivityRefs_(sheet, activityMap.byAnyOldId);
    refs.forEach(function(ref) {
      result.inconsistenciasEntreAbas.push(ref);
    });
  });

  if (result.inconsistenciasEntreAbas.length) {
    result.ok = false;
  }

  atividadesV2_logSetup_(result.ok ? 'INFO' : 'WARN', 'Diagnostico read-only de IDs v2 do ambiente resolvido finalizado.', {
    atividades: result.idsAtuais.length,
    naoNormalizaveis: result.naoNormalizaveis.length,
    inconsistencias: result.inconsistenciasEntreAbas.length
  });

  return result;
}

/**
 * Normaliza IDs da v2 do ambiente resolvido para o padrao ATV-AAAA-S-NNNN e propaga referencias.
 */
function atividadesV2_normalizarIdsDev() {
  var ss = atividadesV2_getDatabaseSpreadsheet_({ ambiente: 'DEV' });
  var result = {
    ok: true,
    spreadsheetId: ss.getId(),
    url: ss.getUrl(),
    atividadesAtualizadas: 0,
    apresentacoesAtualizadas: 0,
    presencasAtualizadas: 0,
    convitesAtualizados: 0,
    justificativasAtualizadas: 0,
    portalAtualizados: {},
    erros: [],
    avisos: []
  };

  try {
    atividadesV2_ensureCanonicalHeadersForIdNormalization_(ss);
    var atividadesSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES);
    var atividades = atividadesV2_readSheetObjects_(atividadesSheet);
    var activityMap = atividadesV2_buildActivityIdNormalizationMap_(atividades);
    var blocked = activityMap.activities.filter(function(item) {
      return !item.canNormalize;
    });
    if (blocked.length) {
      result.avisos.push(
        blocked.length + ' atividade(s) nao puderam ser normalizadas automaticamente e foram preservadas sem alteracao.'
      );
    }

    var normalizationMap = atividadesV2_filterNormalizableActivityMap_(activityMap);
    if (!normalizationMap.activities.length) {
      result.ok = false;
      result.erros.push('Nenhuma atividade pode ser normalizada automaticamente. Verifique ANO, SEMESTRE, DATA_ATIVIDADE e NUMERO_SEQUENCIAL_NO_CICLO.');
      return result;
    }

    result.atividadesAtualizadas = atividadesV2_normalizeAtividadesSheet_(atividadesSheet, normalizationMap);
    result.apresentacoesAtualizadas = atividadesV2_normalizeRelatedActivitySheet_(ss, ATIVIDADES_V2_SHEETS.APRESENTACOES, normalizationMap, {
      entity: 'APRESENTACAO'
    });
    result.presencasAtualizadas = atividadesV2_normalizeRelatedActivitySheet_(ss, ATIVIDADES_V2_SHEETS.PRESENCAS_REGISTROS, normalizationMap, {
      entity: 'PRESENCA'
    });
    result.convitesAtualizados = atividadesV2_normalizeRelatedActivitySheet_(ss, ATIVIDADES_V2_SHEETS.CONVITES, normalizationMap, {
      entity: 'CONVITE'
    });
    result.justificativasAtualizadas = atividadesV2_normalizeRelatedActivitySheet_(ss, ATIVIDADES_V2_SHEETS.JUSTIFICATIVAS, normalizationMap, {
      entity: 'JUSTIFICATIVA'
    });
    result.portalAtualizados[ATIVIDADES_V2_SHEETS.PORTAL_ACOES] = atividadesV2_normalizeRelatedActivitySheet_(ss, ATIVIDADES_V2_SHEETS.PORTAL_ACOES, normalizationMap, {
      entity: 'PORTAL'
    });

    atividadesV2_getPortalActivityReferenceSheetNames_().forEach(function(sheetName) {
      result.portalAtualizados[sheetName] = atividadesV2_normalizeRelatedActivitySheet_(ss, sheetName, normalizationMap, {
        entity: 'PORTAL'
      });
    });

    atividadesV2_appendV2Log_(ss, {
      FLUXO: 'NORMALIZACAO_IDS_DEV',
      ACAO: 'Normalizar IDs estruturais da v2 do ambiente resolvido',
      NIVEL: result.ok ? 'INFO' : 'WARN',
      STATUS: result.ok ? 'OK' : 'ERRO',
      MENSAGEM: 'IDs normalizados para padrao ATV-AAAA-S-NNNN.',
      DETALHES_JSON: atividadesV2_safeLogData_(result)
    });
  } catch (e) {
    result.ok = false;
    result.erros.push(e && e.message ? e.message : String(e));
  }

  atividadesV2_logSetup_(result.ok ? 'INFO' : 'WARN', 'Normalizacao de IDs v2 do ambiente resolvido finalizada.', {
    atividadesAtualizadas: result.atividadesAtualizadas,
    apresentacoesAtualizadas: result.apresentacoesAtualizadas,
    presencasAtualizadas: result.presencasAtualizadas,
    convitesAtualizadas: result.convitesAtualizados,
    justificativasAtualizadas: result.justificativasAtualizadas,
    erros: result.erros.length,
    avisos: result.avisos.length
  });

  return result;
}

function atividadesV2_sincronizarBrutasDevSemLock_(opts) {
  opts = opts || {};
  atividades_assertCoreLibrary_();

  var dryRun = opts.dryRun === true;
  var insertOnly = opts.atualizarExistentes !== true;
  var targetSpreadsheet = atividadesV2_getDatabaseSpreadsheet_({ ambiente: 'DEV' });
  var sourceSpreadsheet = atividades_getOperationalHolder_().spreadsheet;
  var activityIdMap = {};
  var result = {
    ok: true,
    dryRun: dryRun,
    insertOnly: insertOnly,
    mode: insertOnly ? 'INSERIR_FALTANTES' : 'INSERIR_E_ATUALIZAR_EXISTENTES',
    sourceSpreadsheetId: sourceSpreadsheet.getId(),
    targetSpreadsheetId: targetSpreadsheet.getId(),
    syncedAt: new Date(),
    sheets: {},
    totals: {
      inputRows: 0,
      inserts: 0,
      updates: 0,
      skipped: 0,
      skippedExisting: 0
    },
    avisos: [],
    erros: []
  };

  try {
    var commonUpsertOpts = {
      dryRun: dryRun,
      insertOnly: insertOnly
    };

    var atividadesRows = atividadesV2_buildAtividadesMigrationRows_(activityIdMap);
    result.sheets.Atividades = atividadesV2_upsertObjectsByKey_(
      atividadesV2_getTargetSheet_(targetSpreadsheet, ATIVIDADES_V2_SHEETS.ATIVIDADES),
      atividadesRows,
      'ID_ATIVIDADE',
      commonUpsertOpts
    );

    var apresentacoesRows = atividadesV2_buildApresentacoesMigrationRows_(activityIdMap);
    result.sheets.Atividades_Apresentacoes = atividadesV2_upsertObjectsByKey_(
      atividadesV2_getTargetSheet_(targetSpreadsheet, ATIVIDADES_V2_SHEETS.APRESENTACOES),
      apresentacoesRows,
      'ID_APRESENTACAO',
      commonUpsertOpts
    );

    var convitesRows = atividadesV2_buildConvitesMigrationRows_(activityIdMap);
    result.sheets.Atividades_Convites = atividadesV2_upsertObjectsByKey_(
      atividadesV2_getTargetSheet_(targetSpreadsheet, ATIVIDADES_V2_SHEETS.CONVITES),
      convitesRows,
      'ID_CONVITE_ATIVIDADE',
      commonUpsertOpts
    );

    var justificativasRows = atividadesV2_buildJustificativasMigrationRows_(activityIdMap);
    result.sheets.Justificativas_Faltas = atividadesV2_upsertObjectsByKey_(
      atividadesV2_getTargetSheet_(targetSpreadsheet, ATIVIDADES_V2_SHEETS.JUSTIFICATIVAS),
      justificativasRows,
      'ID_JUSTIFICATIVA',
      commonUpsertOpts
    );

    if (opts.includeConfig === true) {
      var configRows = atividadesV2_buildConfigMigrationRows_();
      result.sheets.Atividades_Config = atividadesV2_upsertObjectsByKey_(
        atividadesV2_getTargetSheet_(targetSpreadsheet, ATIVIDADES_V2_SHEETS.CONFIG),
        configRows,
        'ID_CONFIG',
        commonUpsertOpts
      );
    }

    var presencasRows = atividadesV2_buildPresencasMigrationRows_(sourceSpreadsheet, activityIdMap, {
      includeBlankPresence: opts.includeBlankPresence === true
    });
    result.sheets.Atividades_Presencas_Registros = atividadesV2_upsertObjectsByKey_(
      atividadesV2_getTargetSheet_(targetSpreadsheet, ATIVIDADES_V2_SHEETS.PRESENCAS_REGISTROS),
      presencasRows,
      'ID_REGISTRO_PRESENCA',
      commonUpsertOpts
    );
  } catch (e) {
    result.ok = false;
    result.erros.push(e && e.message ? e.message : String(e));
  }

  atividadesV2_collectRawSyncTotals_(result);

  if (!dryRun && result.ok) {
    atividadesV2_appendV2Log_(targetSpreadsheet, {
      FLUXO: 'MIGRACAO_V2_DEV',
      ACAO: 'Sincronizar bases brutas faltantes da v2 do ambiente resolvido',
      NIVEL: result.avisos.length ? 'WARN' : 'INFO',
      STATUS: 'OK',
      MENSAGEM: 'Bases brutas v2 do ambiente resolvido sincronizadas a partir da V1 sem alterar a origem.',
      DETALHES_JSON: atividadesV2_safeLogData_({
        mode: result.mode,
        inserts: result.totals.inserts,
        updates: result.totals.updates,
        skippedExisting: result.totals.skippedExisting,
        sheets: Object.keys(result.sheets).length
      })
    });
    if (typeof atividadesV2_limparCachePortalDev_ === 'function' && result.totals.inserts + result.totals.updates > 0) {
      atividadesV2_limparCachePortalDev_();
    }
  }

  atividadesV2_logSetup_(result.ok ? 'INFO' : 'WARN', 'Sincronizacao incremental V1 -> bases brutas v2 do ambiente resolvido finalizada.', {
    dryRun: dryRun,
    mode: result.mode,
    inserts: result.totals.inserts,
    updates: result.totals.updates,
    skippedExisting: result.totals.skippedExisting,
    erros: result.erros.length,
    avisos: result.avisos.length
  });

  return result;
}

function atividadesV2_collectRawSyncTotals_(result) {
  Object.keys(result.sheets || {}).forEach(function(sheetName) {
    var summary = result.sheets[sheetName] || {};
    result.totals.inputRows += Number(summary.inputRows || 0);
    result.totals.inserts += Number(summary.inserts || 0);
    result.totals.updates += Number(summary.updates || 0);
    result.totals.skipped += Number(summary.skipped || 0);
    result.totals.skippedExisting += Number(summary.skippedExisting || 0);
    result.avisos = result.avisos.concat((summary.avisos || []).map(function(message) {
      return sheetName + ': ' + message;
    }));
  });
}

function atividadesV2_migrarTesteDev_(opts) {
  opts = opts || {};
  atividades_assertCoreLibrary_();

  var dryRun = opts.dryRun !== false;
  var targetSpreadsheet = atividadesV2_getDatabaseSpreadsheet_({ ambiente: 'DEV' });
  var sourceSpreadsheet = atividades_getOperationalHolder_().spreadsheet;
  var activityIdMap = {};
  var result = {
    ok: true,
    dryRun: dryRun,
    sourceSpreadsheetId: sourceSpreadsheet.getId(),
    targetSpreadsheetId: targetSpreadsheet.getId(),
    migratedAt: new Date(),
    sheets: {},
    estimates: {},
    avisos: [],
    erros: []
  };

  try {
    var atividadesRows = atividadesV2_buildAtividadesMigrationRows_(activityIdMap);
    result.sheets.Atividades = atividadesV2_upsertObjectsByKey_(
      atividadesV2_getTargetSheet_(targetSpreadsheet, ATIVIDADES_V2_SHEETS.ATIVIDADES),
      atividadesRows,
      'ID_ATIVIDADE',
      { dryRun: dryRun }
    );

    var apresentacoesRows = atividadesV2_buildApresentacoesMigrationRows_(activityIdMap);
    result.sheets.Atividades_Apresentacoes = atividadesV2_upsertObjectsByKey_(
      atividadesV2_getTargetSheet_(targetSpreadsheet, ATIVIDADES_V2_SHEETS.APRESENTACOES),
      apresentacoesRows,
      'ID_APRESENTACAO',
      { dryRun: dryRun }
    );

    var convitesRows = atividadesV2_buildConvitesMigrationRows_(activityIdMap);
    result.sheets.Atividades_Convites = atividadesV2_upsertObjectsByKey_(
      atividadesV2_getTargetSheet_(targetSpreadsheet, ATIVIDADES_V2_SHEETS.CONVITES),
      convitesRows,
      'ID_CONVITE_ATIVIDADE',
      { dryRun: dryRun }
    );

    var justificativasRows = atividadesV2_buildJustificativasMigrationRows_(activityIdMap);
    result.sheets.Justificativas_Faltas = atividadesV2_upsertObjectsByKey_(
      atividadesV2_getTargetSheet_(targetSpreadsheet, ATIVIDADES_V2_SHEETS.JUSTIFICATIVAS),
      justificativasRows,
      'ID_JUSTIFICATIVA',
      { dryRun: dryRun }
    );

    var configRows = atividadesV2_buildConfigMigrationRows_();
    result.sheets.Atividades_Config = atividadesV2_upsertObjectsByKey_(
      atividadesV2_getTargetSheet_(targetSpreadsheet, ATIVIDADES_V2_SHEETS.CONFIG),
      configRows,
      'ID_CONFIG',
      { dryRun: dryRun }
    );

    var presencasRows = atividadesV2_buildPresencasMigrationRows_(sourceSpreadsheet, activityIdMap, {
      includeBlankPresence: opts.includeBlankPresence === true
    });
    result.sheets.Atividades_Presencas_Registros = atividadesV2_upsertObjectsByKey_(
      atividadesV2_getTargetSheet_(targetSpreadsheet, ATIVIDADES_V2_SHEETS.PRESENCAS_REGISTROS),
      presencasRows,
      'ID_REGISTRO_PRESENCA',
      { dryRun: dryRun }
    );
  } catch (e) {
    result.ok = false;
    result.erros.push(e && e.message ? e.message : String(e));
  }

  Object.keys(result.sheets).forEach(function(sheetName) {
    var summary = result.sheets[sheetName];
    result.estimates[sheetName] = {
      inputRows: summary.inputRows,
      inserts: summary.inserts,
      updates: summary.updates,
      skipped: summary.skipped
    };
    result.avisos = result.avisos.concat((summary.avisos || []).map(function(message) {
      return sheetName + ': ' + message;
    }));
  });

  atividadesV2_logSetup_(result.ok ? 'INFO' : 'WARN', 'Migracao de teste V1 -> v2 do ambiente resolvido finalizada.', {
    dryRun: dryRun,
    sourceSpreadsheetId: result.sourceSpreadsheetId,
    targetSpreadsheetId: result.targetSpreadsheetId,
    sheets: Object.keys(result.sheets).length,
    erros: result.erros.length,
    avisos: result.avisos.length
  });

  return result;
}

var ATIVIDADES_V2_DATABASE_SPREADSHEET_CACHE_ = {};
var ATIVIDADES_V2_EXECUTION_ENVIRONMENT_ = '';

function atividadesV2_resolveEnvironment_(options) {
  options = options || {};
  atividades_assertCoreLibrary_();
  var raw = options.ambiente || options.environment || ATIVIDADES_V2_EXECUTION_ENVIRONMENT_ || '';
  if (!raw) throw new Error('AMBIENTE_ATIVIDADES_V2_OBRIGATORIO: informe DEV ou PROD explicitamente.');
  var environment = String(raw || '').trim().toUpperCase();
  if (environment !== 'DEV' && environment !== 'PROD') {
    throw new Error('AMBIENTE_ATIVIDADES_V2_INVALIDO: ' + environment + '. Use DEV ou PROD.');
  }
  return environment;
}

function atividadesV2_getDatabaseSpreadsheet_(options) {
  options = options || {};
  var perf = typeof portalPerfStart_ === 'function'
    ? portalPerfStart_('atividadesV2_getDatabaseSpreadsheet')
    : null;
  var environment = atividadesV2_resolveEnvironment_(options);
  if (options.ambiente || options.environment) ATIVIDADES_V2_EXECUTION_ENVIRONMENT_ = environment;
  if (ATIVIDADES_V2_DATABASE_SPREADSHEET_CACHE_[environment]) {
    if (perf) {
      portalPerfMark_(perf, 'cache_execucao_planilha_v2', { ambiente: environment });
      portalPerfEnd_(perf);
    }
    return ATIVIDADES_V2_DATABASE_SPREADSHEET_CACHE_[environment];
  }
  if (typeof GEAPA_CORE.coreGetDomainSpreadsheet !== 'function') {
    throw new Error('GEAPA_CORE_DESATUALIZADO: coreGetDomainSpreadsheet indisponivel.');
  }
  var spreadsheet = GEAPA_CORE.coreGetDomainSpreadsheet('ATIVIDADES', { ambiente: environment });
  ATIVIDADES_V2_DATABASE_SPREADSHEET_CACHE_[environment] = spreadsheet;
  if (perf) {
    portalPerfMark_(perf, 'resolver_dominio_atividades', { ambiente: environment, origem: 'ATIVIDADES_V2_DB' });
    portalPerfEnd_(perf);
  }
  return spreadsheet;
}

/** @deprecated Somente para testes e migracoes explicitamente DEV. */
function atividadesV2_getDatabaseSpreadsheetDev_() {
  return atividadesV2_getDatabaseSpreadsheet_({ ambiente: 'DEV' });
}

function atividadesV2_requiredRegistryCol_(headerMap, header) {
  var col = headerMap[header] || 0;
  if (!col) {
    throw new Error('Registry invalido. Cabecalho obrigatorio ausente: ' + header + '.');
  }
  return col;
}

function atividadesV2_validateSheetReadOnly_(sheet, expectedHeaders) {
  var headers = atividadesV2_getSheetHeaders_(sheet);
  var nonEmptyHeaders = headers.filter(function(header) {
    return !!header;
  });
  var missingHeaders = expectedHeaders.filter(function(header) {
    return nonEmptyHeaders.indexOf(header) === -1;
  });
  var extraHeaders = nonEmptyHeaders.filter(function(header) {
    return expectedHeaders.indexOf(header) === -1;
  });
  var duplicatedHeaders = atividadesV2_findDuplicateValues_(nonEmptyHeaders);
  var validationHeaders = atividadesV2_getHeadersWithValidation_(sheet, nonEmptyHeaders);
  var result = {
    ok: true,
    sheetName: sheet.getName(),
    rowCount: sheet.getLastRow(),
    columnCount: sheet.getLastColumn(),
    expectedHeaderCount: expectedHeaders.length,
    actualHeaderCount: nonEmptyHeaders.length,
    dataRows: Math.max(sheet.getLastRow() - 1, 0),
    frozenRows: sheet.getFrozenRows(),
    hasFilter: !!sheet.getFilter(),
    validationHeaders: validationHeaders,
    missingHeaders: missingHeaders,
    extraHeaders: extraHeaders,
    duplicatedHeaders: duplicatedHeaders,
    avisos: [],
    erros: []
  };

  if (missingHeaders.length) {
    result.ok = false;
    result.erros.push('Cabecalhos obrigatorios ausentes: ' + missingHeaders.join(', ') + '.');
  }

  if (duplicatedHeaders.length) {
    result.ok = false;
    result.erros.push('Cabecalhos duplicados: ' + duplicatedHeaders.join(', ') + '.');
  }

  if (extraHeaders.length) {
    result.avisos.push('Cabecalhos extras encontrados e preservados: ' + extraHeaders.join(', ') + '.');
  }

  if (sheet.getFrozenRows() < 1) {
    result.avisos.push('Primeira linha nao esta congelada.');
  }

  if (!sheet.getFilter()) {
    result.avisos.push('Filtro nao encontrado na aba.');
  }

  if (result.dataRows === 0) {
    result.avisos.push('Aba sem linhas de dados; esperado nesta fase se ainda nao houve migracao.');
  }

  return result;
}

function atividadesV2_summarizeLegacySheetForMigration_(sheet, idHeader) {
  var headers = atividadesV2_getSheetHeaders_(sheet);
  var dataRows = Math.max(sheet.getLastRow() - 1, 0);
  var duplicateKeys = idHeader
    ? atividadesV2_findDuplicateKeysByHeader_(sheet, idHeader)
    : [];

  return {
    sheetName: sheet.getName(),
    spreadsheetId: sheet.getParent().getId(),
    dataRows: dataRows,
    headerCount: headers.filter(function(header) { return !!header; }).length,
    idHeader: idHeader || '',
    duplicateKeys: duplicateKeys,
    headers: headers.filter(function(header) { return !!header; })
  };
}

function atividadesV2_getTargetSheet_(spreadsheet, sheetName) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) throw new Error('Aba v2 nao encontrada: ' + sheetName + '. Rode atividadesV2_setupDatabaseDev() antes da migracao.');
  return sheet;
}

function atividadesV2_buildAtividadesMigrationRows_(activityIdMap) {
  return atividadesV2_readSheetObjects_(atividades_getAtividadesSheet_()).map(function(source) {
    var identity = atividadesV2_resolveActivityIdentity_(source, {
      fallbackRowNumber: source._rowNumber
    });
    activityIdMap[identity.legacyId] = identity;
    var statusOperacional = atividadesV2_mapStatusOperacional_(source.STATUS);

    return {
      ID_ATIVIDADE: identity.idAtividade,
      CICLO: atividadesV2_buildCicloFromIdentity_(identity, source),
      ANO: identity.ano,
      SEMESTRE: identity.semestre,
      NUMERO_SEQUENCIAL_NO_CICLO: identity.sequencial,
      CLASSIFICACAO_REUNIAO: source.CLASSIFICACAO_REUNIAO || '',
      TIPO_ATIVIDADE: source.TIPO_ATIVIDADE || '',
      SUBTIPO_ATIVIDADE: source.SUBTIPO_ATIVIDADE || '',
      CLASSIFICACAO_ACESSO: source.CLASSIFICACAO_ACESSO || '',
      TITULO: source.TITULO || '',
      TITULO_PUBLICO: source.TITULO || '',
      DESCRICAO: source.DESCRICAO || '',
      DESCRICAO_PUBLICA: source.DESCRICAO || '',
      DATA_ATIVIDADE: source.DATA_ATIVIDADE || '',
      HORARIO_INICIO: source.HORARIO_INICIO || '',
      HORARIO_FIM: source.HORARIO_FIM || '',
      LOCAL: source.LOCAL || '',
      FORMATO: source.FORMATO || '',
      RESPONSAVEL_INTERNO: source.RESPONSAVEL_INTERNO || '',
      RESPONSAVEL_EMAIL: source.RESPONSAVEL_EMAIL || '',
      PUBLICO_ALVO: source.PUBLICO_ALVO || '',
      OBRIGATORIA: source.OBRIGATORIA || '',
      EXIGE_CONVOCACAO: source.EXIGE_CONVOCACAO || '',
      EXIGE_LEMBRETE: source.EXIGE_LEMBRETE || '',
      EXIGE_ATA: source.EXIGE_ATA || '',
      EXIGE_MATERIAL: source.EXIGE_MATERIAL || '',
      EXIGE_LISTA_PRESENCA: source.EXIGE_LISTA_PRESENCA || '',
      EXIGE_CONFIRMACAO_PRESENCA: source.EXIGE_CONFIRMACAO_PRESENCA || '',
      CONTA_PRESENCA: source.CONTA_PRESENCA || '',
      CONTA_FALTA: source.CONTA_FALTA || '',
      GERA_CERTIFICADO: source.GERA_CERTIFICADO || '',
      CARGA_HORARIA: source.CARGA_HORARIA || '',
      STATUS_OPERACIONAL: statusOperacional,
      STATUS_PUBLICACAO_PORTAL: 'RASCUNHO',
      VISIBILIDADE_PORTAL: 'OCULTA',
      DATA_REALIZACAO: source.DATA_REALIZACAO || '',
      DATA_LIMITE_ATA: source.DATA_LIMITE_ATA || '',
      DATA_LIMITE_MATERIAL: source.DATA_LIMITE_MATERIAL || '',
      LINK_ATA: source.LINK_ATA || '',
      LINK_MATERIAL: source.LINK_MATERIAL || '',
      ORIGEM_FLUXO: source.ORIGEM_FLUXO || 'MIGRACAO_V1_TESTE',
      CRIADO_EM: source.CRIADO_EM || '',
      ATUALIZADO_EM: source.ATUALIZADO_EM || new Date(),
      OBSERVACOES: atividadesV2_appendMigrationObs_(source.OBSERVACOES, 'ID legado V1: ' + identity.legacyId),
      ATIVO: atividadesV2_isInactiveStatus_(statusOperacional) ? 'NAO' : 'SIM'
    };
  });
}

function atividadesV2_buildApresentacoesMigrationRows_(activityIdMap) {
  var sources = atividadesV2_readSheetObjects_(atividades_getApresentacoesSheet_());
  var totals = atividadesV2_countByLegacyActivity_(sources);
  var counters = {};
  return sources.map(function(source) {
    var localId = source.ID_ATIVIDADE || source.ID_ATIVIDADE_LOCAL || source.ID_ATIVIDADE_GLOBAL || '';
    var identity = atividadesV2_getActivityIdentityForRelated_(activityIdMap, localId, source);
    var counterKey = identity.legacyId || localId || identity.idAtividade;
    counters[counterKey] = (counters[counterKey] || 0) + 1;
    var presentationIndex = totals[counterKey] > 1 ? counters[counterKey] : null;
    var pessoa = atividadesV2_resolverPessoa_({
      ID_PESSOA: source.ID_PESSOA,
      RGA: source.RGA,
      EMAIL_MEMBRO: source.EMAIL_MEMBRO,
      NOME_MEMBRO: source.NOME_MEMBRO
    });
    return {
      ID_APRESENTACAO: atividadesV2_gerarIdApresentacao_(identity.ano, identity.semestre, identity.sequencial, presentationIndex),
      ID_ATIVIDADE: identity.idAtividade,
      ID_PESSOA: pessoa.idPessoa,
      CICLO: atividadesV2_buildCicloFromIdentity_(identity, source),
      ANO: identity.ano,
      SEMESTRE: source.SEMESTRE_APRESENTACAO || identity.semestre,
      NOME_MEMBRO: source.NOME_MEMBRO || '',
      RGA: source.RGA || '',
      EMAIL_MEMBRO: source.EMAIL_MEMBRO || '',
      DATA_ATIVIDADE: source.DATA_ATIVIDADE || '',
      HORARIO_INICIO: source.HORARIO_INICIO || '',
      HORARIO_FIM: source.HORARIO_FIM || '',
      LOCAL: source.LOCAL || '',
      FORMATO: source.FORMATO || '',
      TITULO_APRESENTACAO: source.TITULO_APRESENTACAO || '',
      EIXO_TEMATICO_PRINCIPAL: source.EIXO_TEMATICO_PRINCIPAL || '',
      EIXO_TEMATICO_SECUNDARIO: source.EIXO_TEMATICO_SECUNDARIO || '',
      STATUS_APRESENTACAO: source.STATUS_APRESENTACAO || '',
      QTD_COBRANCAS_TITULO_EIXO: source.QTD_COBRANCAS_TITULO_EIXO || '',
      DATA_COBRANCA_TITULO_EIXO: source.DATA_COBRANCA_TITULO_EIXO || '',
      DATA_CONFIRMACAO_TITULO_EIXO: source.DATA_CONFIRMACAO_TITULO_EIXO || '',
      NOTIFICACAO_AGENDAMENTO_ENVIADA: source.NOTIFICACAO_AGENDAMENTO_ENVIADA || '',
      DATA_NOTIFICACAO_AGENDAMENTO: source.DATA_NOTIFICACAO_AGENDAMENTO || '',
      NOTIFICACAO_SECRETARIOS_ENVIADA: source.NOTIFICACAO_SECRETARIOS_ENVIADA || '',
      DATA_NOTIFICACAO_SECRETARIOS: source.DATA_NOTIFICACAO_SECRETARIOS || '',
      LEMBRETE_MEMBROS_ENVIADO: source.LEMBRETE_MEMBROS_ENVIADO || '',
      DATA_ENVIO_LEMBRETE_MEMBROS: source.DATA_ENVIO_LEMBRETE_MEMBROS || '',
      CONVITE_PROFESSORES_ENVIADO: source.CONVITE_PROFESSORES_ENVIADO || '',
      DATA_ENVIO_CONVITE_PROFESSORES: source.DATA_ENVIO_CONVITE_PROFESSORES || '',
      CONVITE_EXTERNOS_ENVIADO: source.CONVITE_EXTERNOS_ENVIADO || '',
      DATA_ENVIO_CONVITE_EXTERNOS: source.DATA_ENVIO_CONVITE_EXTERNOS || '',
      STATUS_ENVIO_ARQUIVO: source.STATUS_ENVIO_ARQUIVO || '',
      DATA_SOLICITACAO_ARQUIVO: source.DATA_SOLICITACAO_ARQUIVO || '',
      DATA_COBRANCA_ARQUIVO: source.DATA_COBRANCA_ARQUIVO || '',
      QTD_COBRANCAS_ARQUIVO: source.QTD_COBRANCAS_ARQUIVO || '',
      DATA_RECEBIMENTO_ARQUIVO: source.DATA_RECEBIMENTO_ARQUIVO || '',
      LINK_ARQUIVO_DRIVE: source.LINK_ARQUIVO_DRIVE || '',
      SYNC_HISTORICO_PUBLICO: source.SYNC_HISTORICO_PUBLICO || '',
      PUBLICAR_NO_PORTAL: 'NAO',
      VISIBILIDADE_PORTAL: 'OCULTA',
      ELEGIVEL_CERTIFICADO: 'NAO',
      CRIADO_EM: source.CRIADO_EM || '',
      ATUALIZADO_EM: source.ATUALIZADO_EM || new Date(),
      OBSERVACOES: atividadesV2_appendMigrationObs_(source.OBSERVACOES, 'ID apresentacao/atividade legado: ' + atividadesV2_joinLegacyRefs_([source.ID_APRESENTACAO, localId])),
      ATIVO: atividadesV2_isInactiveStatus_(source.STATUS_APRESENTACAO) ? 'NAO' : 'SIM'
    };
  });
}

function atividadesV2_buildConvitesMigrationRows_(activityIdMap) {
  return atividadesV2_readSheetObjects_(atividades_getConvidadosSheet_()).map(function(source) {
    var localId = source.ID_ATIVIDADE || source.ID_ATIVIDADE_LOCAL || source.ID_ATIVIDADE_GLOBAL || '';
    var identity = atividadesV2_getActivityIdentityForRelated_(activityIdMap, localId, source);
    var pessoa = atividadesV2_resolverPessoa_({
      ID_PESSOA: source.ID_PESSOA,
      ID_REFERENCIA: source.ID_REFERENCIA,
      EMAIL: source.EMAIL,
      NOME: source.NOME
    });
    var idReferencia = pessoa.idPessoa || source.ID_REFERENCIA || source.EMAIL || source.NOME || source._rowNumber;
    return {
      ID_CONVITE_ATIVIDADE: atividadesV2_gerarIdConvite_(identity.ano, identity.semestre, identity.sequencial, idReferencia),
      ID_ATIVIDADE: identity.idAtividade,
      TIPO_VINCULO_PESSOA: source.TIPO_VINCULO_PESSOA || '',
      ID_PESSOA: pessoa.idPessoa,
      ID_REFERENCIA: source.ID_REFERENCIA || '',
      NOME: source.NOME || '',
      EMAIL: source.EMAIL || '',
      PAPEL_NA_ATIVIDADE: source.PAPEL_NA_ATIVIDADE || '',
      TIPO_CONVITE: source.PAPEL_NA_ATIVIDADE || source.TIPO_VINCULO_PESSOA || '',
      CONVITE_ENVIADO: source.CONVITE_ENVIADO || '',
      DATA_ENVIO_CONVITE: source.DATA_ENVIO_CONVITE || source.DATA_ENVIO_CONFIRMACAO || '',
      CONFIRMADO: source.CONFIRMADO || '',
      DATA_CONFIRMACAO: source.DATA_CONFIRMACAO || '',
      PRESENCA_ESPERADA: source.CONFIRMADO === 'SIM' ? 'SIM' : '',
      PRESENCA_REGISTRADA: source.PRESENCA_REGISTRADA || '',
      ORIGEM_REGISTRO: 'MIGRACAO_V1_TESTE',
      CRIADO_EM: source.CRIADO_EM || '',
      ATUALIZADO_EM: source.ATUALIZADO_EM || new Date(),
      OBSERVACOES: atividadesV2_appendMigrationObs_(source.OBSERVACOES, 'ID convite/atividade legado: ' + atividadesV2_joinLegacyRefs_([source.ID_CONVITE_ATIVIDADE, localId])),
      ATIVO: 'SIM'
    };
  });
}

function atividadesV2_buildJustificativasMigrationRows_(activityIdMap) {
  var sources = atividadesV2_readSheetObjects_(atividades_getJustificativasFaltasSheet_());
  var counters = {};
  return sources.map(function(source) {
    var localId = source.ID_ATIVIDADE || source.ID_ATIVIDADE_LOCAL || source.ID_ATIVIDADE_GLOBAL || '';
    var period = source.PERIODO || source.CICLO || '';
    var identity = atividadesV2_getActivityIdentityForRelated_(activityIdMap, localId, Object.assign({}, source, {
      CICLO: period
    }));
    var pessoa = atividadesV2_resolverPessoa_({
      ID_PESSOA: source.ID_PESSOA,
      RGA: source.RGA,
      EMAIL_MEMBRO: source.EMAIL_MEMBRO,
      NOME_MEMBRO: source.NOME_MEMBRO
    });
    var idReferencia = pessoa.idPessoa || source.RGA || source.EMAIL_MEMBRO || source.NOME_MEMBRO || source._rowNumber;
    var counterKey = [identity.idAtividade, idReferencia].join('|');
    counters[counterKey] = (counters[counterKey] || 0) + 1;
    return {
      ID_JUSTIFICATIVA: atividadesV2_gerarIdJustificativa_(identity.ano, identity.semestre, identity.sequencial, idReferencia, counters[counterKey]),
      ID_REGISTRO_PRESENCA: atividadesV2_gerarIdRegistroPresenca_(identity.ano, identity.semestre, identity.sequencial, idReferencia),
      ID_ATIVIDADE: identity.idAtividade,
      CICLO: atividadesV2_buildCicloFromIdentity_(identity, { CICLO: period }),
      ID_PESSOA: pessoa.idPessoa,
      RGA: source.RGA || '',
      NOME_MEMBRO: source.NOME_MEMBRO || '',
      DATA_ATIVIDADE: source.DATA_ATIVIDADE || '',
      TITULO_ATIVIDADE: source.TITULO_ATIVIDADE || '',
      DATA_LIMITE_JUSTIFICATIVA: source.DATA_LIMITE_JUSTIFICATIVA || '',
      DATA_ENVIO: source.DATA_ENVIO || '',
      MOTIVO_DECLARADO: source.MOTIVO_DECLARADO || '',
      DESCRICAO_JUSTIFICATIVA: source.DESCRICAO_JUSTIFICATIVA || '',
      POSSUI_DOCUMENTO_COMPROBATORIO: source.POSSUI_DOCUMENTO_COMPROBATORIO || '',
      LINK_DOCUMENTO_COMPROBATORIO: source.LINK_DOCUMENTO_COMPROBATORIO || '',
      STATUS_ANALISE: source.STATUS_ANALISE || '',
      DATA_ANALISE: source.DATA_ANALISE || '',
      ANALISADO_POR: source.ANALISADO_POR || '',
      DECISAO_APLICADA_NA_PRESENCA: source.DECISAO_APLICADA_NA_PRESENCA || '',
      VALOR_ANTES: source.VALOR_ANTES || '',
      VALOR_DEPOIS: source.VALOR_DEPOIS || '',
      OBSERVACOES_INTERNAS: atividadesV2_appendMigrationObs_(source.OBSERVACOES, 'ID justificativa/atividade legado: ' + atividadesV2_joinLegacyRefs_([source.ID_JUSTIFICATIVA, localId])),
      ORIGEM_ENVIO: 'MIGRACAO_V1_TESTE',
      CRIADO_EM: source.DATA_ENVIO || '',
      ATUALIZADO_EM: source.DATA_ANALISE || new Date(),
      ATIVO: 'SIM'
    };
  });
}

function atividadesV2_buildConfigMigrationRows_() {
  return atividadesV2_readSheetObjects_(atividades_getConfigSheet_()).map(function(source) {
    return {
      ID_CONFIG: atividadesV2_buildDeterministicId_('CFG2', [source.TIPO_ATIVIDADE, source.SUBTIPO_ATIVIDADE, source.CLASSIFICACAO_REUNIAO]),
      TIPO_ATIVIDADE: source.TIPO_ATIVIDADE || '',
      SUBTIPO_ATIVIDADE: source.SUBTIPO_ATIVIDADE || '',
      CLASSIFICACAO_REUNIAO: source.CLASSIFICACAO_REUNIAO || '',
      CLASSIFICACAO_ACESSO_PADRAO: source.CLASSIFICACAO_ACESSO || '',
      EXIGE_CONVOCACAO_PADRAO: source.EXIGE_CONVOCACAO || '',
      EXIGE_LEMBRETE_PADRAO: source.EXIGE_LEMBRETE || '',
      EXIGE_ATA_PADRAO: source.EXIGE_ATA || '',
      EXIGE_MATERIAL_PADRAO: source.EXIGE_MATERIAL || '',
      EXIGE_LISTA_PRESENCA_PADRAO: source.EXIGE_LISTA_PRESENCA || '',
      EXIGE_CONFIRMACAO_PRESENCA_PADRAO: source.EXIGE_CONFIRMACAO_PRESENCA || '',
      CONTA_PRESENCA_PADRAO: source.CONTA_PRESENCA || '',
      CONTA_FALTA_PADRAO: source.CONTA_FALTA || '',
      GERA_CERTIFICADO_PADRAO: source.GERA_CERTIFICADO || '',
      VISIBILIDADE_PORTAL_PADRAO: 'OCULTA',
      STATUS_PUBLICACAO_PORTAL_PADRAO: 'RASCUNHO',
      ATIVO: source.ATIVO || 'SIM',
      ATUALIZADO_EM: new Date(),
      OBSERVACOES: source.OBSERVACOES || ''
    };
  });
}

function atividadesV2_buildPresencasMigrationRows_(sourceSpreadsheet, activityIdMap, opts) {
  opts = opts || {};
  var rows = [];
  var activityPrefix = ATIVIDADES_CFG.DYNAMIC_SHEET_PREFIXES.PERIODO_ATIVIDADES;
  var presencePrefix = ATIVIDADES_CFG.DYNAMIC_SHEET_PREFIXES.PERIODO_PRESENCAS;

  sourceSpreadsheet.getSheets().forEach(function(presenceSheet) {
    var presenceName = presenceSheet.getName();
    if (presenceName.indexOf(presencePrefix) !== 0) return;

    var period = atividades_extractPeriodCodeFromDynamicSheetName_(presenceName);
    var activitySheet = sourceSpreadsheet.getSheetByName(activityPrefix + period);
    var activityByColumn = activitySheet
      ? atividadesV2_buildPeriodActivityMap_(activitySheet)
      : {};
    var headers = atividadesV2_getSheetHeaders_(presenceSheet);
    var firstDynamicCol = ATIVIDADES_SCHEMA.PRESENCAS_BASE.length + 1;
    var firstSummaryCol = atividadesV2_findFirstSummaryColumn_(headers);
    var lastDynamicCol = firstSummaryCol ? firstSummaryCol - 1 : headers.length;
    var members = atividadesV2_readSheetObjects_(presenceSheet);

    members.forEach(function(member) {
      var values = member._values;
      for (var col = firstDynamicCol; col <= lastDynamicCol; col++) {
        var dynamicHeader = String(headers[col - 1] || '').trim();
        if (!dynamicHeader) continue;

        var rawCode = String(values[col - 1] || '').trim().toUpperCase();
        if (!rawCode && !opts.includeBlankPresence) continue;

        var activity = activityByColumn[dynamicHeader] || {};
        var localId = activity.ID_ATIVIDADE || atividadesV2_extractLocalActivityIdFromPresenceHeader_(dynamicHeader);
        if (!localId) continue;
        var identity = atividadesV2_getActivityIdentityForRelated_(activityIdMap, localId, Object.assign({}, activity, {
          CICLO: period
        }));
        var pessoa = atividadesV2_resolverPessoa_({
          ID_PESSOA: member.ID_PESSOA,
          RGA: member.RGA,
          EMAIL: member.EMAIL,
          NOME_MEMBRO: member.NOME_MEMBRO
        });
        var idReferencia = pessoa.idPessoa || member.RGA || member.EMAIL || member._rowNumber;

        rows.push({
          ID_REGISTRO_PRESENCA: atividadesV2_gerarIdRegistroPresenca_(identity.ano, identity.semestre, identity.sequencial, idReferencia),
          ID_ATIVIDADE: identity.idAtividade,
          CICLO: atividadesV2_buildCicloFromIdentity_(identity, { CICLO: period }),
          ANO: identity.ano,
          SEMESTRE: identity.semestre,
          DATA_ATIVIDADE: activity.DATA_ATIVIDADE || '',
          TITULO_ATIVIDADE: activity.TITULO || '',
          TIPO_ATIVIDADE: activity.TIPO_ATIVIDADE || '',
          SUBTIPO_ATIVIDADE: activity.SUBTIPO_ATIVIDADE || '',
          TIPO_PARTICIPANTE: 'MEMBRO',
          ID_PESSOA: pessoa.idPessoa,
          ID_REFERENCIA: idReferencia,
          RGA: member.RGA || '',
          NOME_PARTICIPANTE: member.NOME_MEMBRO || '',
          EMAIL_PARTICIPANTE: member.EMAIL || '',
          VINCULO_PARTICIPANTE: member.STATUS_CADASTRAL || '',
          STATUS_PRESENCA: atividadesV2_mapPresenceStatus_(rawCode),
          CODIGO_PRESENCA: rawCode || '',
          MODALIDADE_PRESENCA: atividadesV2_mapPresenceMode_(rawCode),
          CONTA_PRESENCA: activity.CONTA_PRESENCA || '',
          CONTA_FALTA: activity.CONTA_FALTA || '',
          GERA_CERTIFICADO: activity.GERA_CERTIFICADO || '',
          CARGA_HORARIA_TOTAL_ATIVIDADE: activity.CARGA_HORARIA || '',
          CARGA_HORARIA_CONSIDERADA: atividadesV2_isPresenceCertificateRelevant_(rawCode) ? activity.CARGA_HORARIA || '' : '',
          PRESENCA_REGISTRADA: rawCode ? 'SIM' : 'NAO',
          ELEGIVEL_CERTIFICADO: atividadesV2_isPresenceCertificateRelevant_(rawCode) && activity.GERA_CERTIFICADO === 'SIM' ? 'SIM' : 'NAO',
          ORIGEM_REGISTRO: 'MIGRACAO_V1_TESTE',
          REGISTRADO_POR: 'MIGRACAO_V1_TESTE',
          REGISTRADO_EM: new Date(),
          ATUALIZADO_EM: new Date(),
          OBSERVACOES: 'Origem: ' + presenceName + ' / coluna ' + dynamicHeader + ' / ID atividade legado: ' + localId,
          ATIVO: 'SIM'
        });
      }
    });
  });

  return rows;
}

function atividadesV2_buildPeriodActivityMap_(sheet) {
  var records = atividadesV2_readSheetObjects_(sheet);
  var map = {};
  records.forEach(function(record) {
    var columnName = String(record.COLUNA_PRESENCA || '').trim();
    if (columnName) map[columnName] = record;
    if (record.ID_ATIVIDADE && !map[record.ID_ATIVIDADE]) map[record.ID_ATIVIDADE] = record;
  });
  return map;
}

function atividadesV2_upsertObjectsByKey_(sheet, objects, keyHeader, opts) {
  opts = opts || {};
  var dryRun = opts.dryRun !== false;
  var insertOnly = opts.insertOnly === true;
  var headers = atividadesV2_getSheetHeaders_(sheet).filter(function(header) { return !!header; });
  var headerMap = {};
  headers.forEach(function(header, index) {
    headerMap[header] = index + 1;
  });
  var keyCol = headerMap[keyHeader] || 0;
  if (!keyCol) throw new Error('Cabecalho-chave ausente em ' + sheet.getName() + ': ' + keyHeader);

  var existing = atividadesV2_buildExistingRowMapByKey_(sheet, keyCol);
  var inserts = [];
  var updates = [];
  var skipped = 0;
  var skippedExisting = 0;
  var avisos = [];
  var plannedKeys = {};
  var duplicatePayloadKeys = {};

  objects.forEach(function(obj) {
    var key = String(obj[keyHeader] || '').trim();
    if (!key) {
      skipped++;
      return;
    }

    if (plannedKeys[key]) {
      duplicatePayloadKeys[key] = true;
      skipped++;
      return;
    }
    plannedKeys[key] = true;

    if (existing.byKey[key]) {
      if (insertOnly) {
        skippedExisting++;
        return;
      }
      updates.push({
        rowNumber: existing.byKey[key],
        object: obj
      });
    } else {
      inserts.push(obj);
    }
  });

  if (existing.duplicates.length) {
    avisos.push('Chaves duplicadas ja existentes no destino: ' + existing.duplicates.join(', ') + '. A primeira linha sera considerada.');
  }
  var duplicatePayloadList = Object.keys(duplicatePayloadKeys).sort();
  if (duplicatePayloadList.length) {
    avisos.push('Chaves duplicadas no payload de migracao foram ignoradas apos a primeira ocorrencia: ' + duplicatePayloadList.join(', ') + '.');
  }

  if (!dryRun) {
    updates.forEach(function(update) {
      atividadesV2_updateExistingRowPreservingUnmapped_(sheet, update.rowNumber, headers, update.object);
    });
    atividadesV2_appendObjects_(sheet, headers, inserts);
  }

  return {
    ok: true,
    dryRun: dryRun,
    insertOnly: insertOnly,
    sheetName: sheet.getName(),
    keyHeader: keyHeader,
    inputRows: objects.length,
    inserts: inserts.length,
    updates: updates.length,
    skipped: skipped,
    skippedExisting: skippedExisting,
    existingRows: existing.total,
    duplicateTargetKeys: existing.duplicates,
    duplicatePayloadKeys: duplicatePayloadList,
    avisos: avisos
  };
}

function atividadesV2_buildExistingRowMapByKey_(sheet, keyCol) {
  var out = {
    byKey: {},
    duplicates: [],
    total: Math.max(sheet.getLastRow() - 1, 0)
  };
  if (sheet.getLastRow() < 2) return out;

  var values = sheet.getRange(2, keyCol, sheet.getLastRow() - 1, 1).getValues();
  values.forEach(function(row, index) {
    var key = String(row[0] || '').trim();
    if (!key) return;
    if (out.byKey[key]) {
      out.duplicates.push(key);
      return;
    }
    out.byKey[key] = index + 2;
  });
  var uniqueDuplicates = {};
  out.duplicates.forEach(function(key) {
    uniqueDuplicates[key] = true;
  });
  out.duplicates = Object.keys(uniqueDuplicates).sort();
  return out;
}

function atividadesV2_updateExistingRowPreservingUnmapped_(sheet, rowNumber, headers, obj) {
  var current = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  headers.forEach(function(header, index) {
    if (Object.prototype.hasOwnProperty.call(obj, header)) {
      current[index] = obj[header];
    }
  });
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([current]);
}

function atividadesV2_appendObjects_(sheet, headers, objects) {
  if (!objects.length) return;
  var rows = objects.map(function(obj) {
    return headers.map(function(header) {
      return Object.prototype.hasOwnProperty.call(obj, header) ? obj[header] : '';
    });
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
}

function atividadesV2_readSheetObjects_(sheet) {
  var lastRow = sheet.getLastRow();
  var lastColumn = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function(header) {
    return String(header || '').trim();
  });
  if (lastRow < 2) return [];

  return sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues().map(function(row, index) {
    var obj = {
      _rowNumber: index + 2,
      _sheetName: sheet.getName(),
      _values: row
    };
    headers.forEach(function(header, colIndex) {
      if (header && !Object.prototype.hasOwnProperty.call(obj, header)) {
        obj[header] = row[colIndex];
      }
    });
    return obj;
  });
}

function atividadesV2_ensureCanonicalHeadersForIdNormalization_(ss) {
  ATIVIDADES_V2_SHEET_ORDER.forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;
    atividadesV2_applyHeadersIfMissing_(sheet, ATIVIDADES_V2_SCHEMA_BY_SHEET[sheetName] || []);
  });
}

function atividadesV2_buildActivityIdNormalizationMap_(atividades) {
  var out = {
    activities: [],
    byAnyOldId: {},
    byNewId: {}
  };

  (atividades || []).forEach(function(record) {
    var identity = atividadesV2_resolveActivityIdentity_(record);
    var rawAno = atividadesV2_firstNonEmpty_(record.ANO, atividadesV2_extractYearFromVigencia_(record.DATA_ATIVIDADE), atividadesV2_extractYear_(record.DATA_ATIVIDADE), atividadesV2_extractYear_(record.CICLO));
    var rawSemestre = atividadesV2_firstValidSemester_(record.SEMESTRE, atividadesV2_extractSemesterFromVigencia_(record.DATA_ATIVIDADE), atividadesV2_extractSemester_(record.CICLO));
    var rawSequencial = atividadesV2_firstNonEmpty_(
      record.NUMERO_SEQUENCIAL_NO_CICLO,
      atividadesV2_extractSequenceFromLegacyId_(record.ID_ATIVIDADE_LOCAL),
      atividadesV2_extractSequenceFromLegacyId_(record.ID_ATIVIDADE_GLOBAL),
      atividadesV2_extractSequenceFromLegacyId_(record.ID_ATIVIDADE)
    );
    var canNormalize = identity.ano !== '0000' && identity.semestre !== '0' && identity.sequencial !== '0000';
    var item = {
      rowNumber: record._rowNumber,
      record: record,
      currentId: String(record.ID_ATIVIDADE || '').trim(),
      legacyId: String(atividadesV2_firstNonEmpty_(record.ID_ATIVIDADE_LOCAL, record.ID_ATIVIDADE_GLOBAL, record.ID_ATIVIDADE) || '').trim(),
      ano: identity.ano,
      semestre: identity.semestre,
      sequencial: identity.sequencial,
      rawAno: rawAno,
      rawSemestre: rawSemestre,
      rawSequencial: rawSequencial,
      newId: identity.idAtividade,
      canNormalize: canNormalize,
      reason: canNormalize ? '' : 'ANO, SEMESTRE ou NUMERO_SEQUENCIAL_NO_CICLO insuficiente.'
    };
    out.activities.push(item);
    [record.ID_ATIVIDADE, record.ID_ATIVIDADE_LOCAL, record.ID_ATIVIDADE_GLOBAL, item.legacyId, item.newId].forEach(function(id) {
      var key = String(id || '').trim();
      if (key) out.byAnyOldId[key] = item;
    });
    out.byNewId[item.newId] = item;
  });

  return out;
}

function atividadesV2_filterNormalizableActivityMap_(activityMap) {
  var out = {
    activities: [],
    byAnyOldId: {},
    byNewId: {}
  };

  (activityMap.activities || []).forEach(function(item) {
    if (!item.canNormalize) return;
    out.activities.push(item);
    [
      item.record.ID_ATIVIDADE,
      item.record.ID_ATIVIDADE_LOCAL,
      item.record.ID_ATIVIDADE_GLOBAL,
      item.legacyId,
      item.newId
    ].forEach(function(id) {
      var key = String(id || '').trim();
      if (key) out.byAnyOldId[key] = item;
    });
    out.byNewId[item.newId] = item;
  });

  return out;
}

function atividadesV2_findUnmappedActivityRefs_(sheet, idMap) {
  var headers = atividadesV2_getSheetHeaders_(sheet);
  var headerMap = atividadesV2_simpleHeaderMap_(headers);
  var candidateCols = ['ID_ATIVIDADE', 'ID_ATIVIDADE_GLOBAL', 'ID_ATIVIDADE_LOCAL'].map(function(header) {
    return headerMap[header] || 0;
  }).filter(function(col) {
    return !!col;
  });
  if (!candidateCols.length || sheet.getLastRow() < 2) return [];

  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, Math.max(sheet.getLastColumn(), 1)).getValues();
  var out = [];
  values.forEach(function(row, index) {
    var ref = '';
    for (var i = 0; i < candidateCols.length; i++) {
      ref = String(row[candidateCols[i] - 1] || '').trim();
      if (ref) break;
    }
    if (ref && !idMap[ref]) {
      out.push({
        sheetName: sheet.getName(),
        rowNumber: index + 2,
        idReferencia: ref
      });
    }
  });
  return out;
}

function atividadesV2_normalizeAtividadesSheet_(sheet, activityMap) {
  var headers = atividadesV2_getSheetHeaders_(sheet);
  var headerMap = atividadesV2_simpleHeaderMap_(headers);
  var colId = headerMap.ID_ATIVIDADE || 0;
  var colAno = headerMap.ANO || 0;
  var colSemestre = headerMap.SEMESTRE || 0;
  var colSeq = headerMap.NUMERO_SEQUENCIAL_NO_CICLO || 0;
  if (!colId) throw new Error('Cabecalho ID_ATIVIDADE ausente em Atividades.');

  var changed = 0;
  activityMap.activities.forEach(function(item) {
    if (atividadesV2_writeCellIfChanged_(sheet, item.rowNumber, colId, item.newId)) changed++;
    if (colAno) atividadesV2_writeCellIfChanged_(sheet, item.rowNumber, colAno, item.ano);
    if (colSemestre) atividadesV2_writeCellIfChanged_(sheet, item.rowNumber, colSemestre, item.semestre);
    if (colSeq) atividadesV2_writeCellIfChanged_(sheet, item.rowNumber, colSeq, item.sequencial);
  });

  return changed;
}

function atividadesV2_normalizeRelatedActivitySheet_(ss, sheetName, activityMap, opts) {
  opts = opts || {};
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return 0;

  var headers = atividadesV2_getSheetHeaders_(sheet);
  var headerMap = atividadesV2_simpleHeaderMap_(headers);
  var colId = headerMap.ID_ATIVIDADE || 0;
  if (!colId) return 0;

  var colGlobal = headerMap.ID_ATIVIDADE_GLOBAL || 0;
  var colLocal = headerMap.ID_ATIVIDADE_LOCAL || 0;
  var colApresentacao = headerMap.ID_APRESENTACAO || 0;
  var colRegistroPresenca = headerMap.ID_REGISTRO_PRESENCA || 0;
  var colConvite = headerMap.ID_CONVITE_ATIVIDADE || 0;
  var colJustificativa = headerMap.ID_JUSTIFICATIVA || 0;
  var colIdReferencia = headerMap.ID_REFERENCIA || headerMap.RGA || headerMap.EMAIL || 0;
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, Math.max(sheet.getLastColumn(), 1)).getValues();
  var changed = 0;
  var counters = {};
  var presentationTotals = {};

  if (opts.entity === 'APRESENTACAO') {
    values.forEach(function(row) {
      var currentId = String(row[colId - 1] || '').trim();
      var oldGlobal = colGlobal ? String(row[colGlobal - 1] || '').trim() : '';
      var oldLocal = colLocal ? String(row[colLocal - 1] || '').trim() : '';
      var match = activityMap.byAnyOldId[currentId] || activityMap.byAnyOldId[oldLocal] || activityMap.byAnyOldId[oldGlobal] || activityMap.byNewId[currentId];
      if (!match) return;
      presentationTotals[match.newId] = (presentationTotals[match.newId] || 0) + 1;
    });
  }

  values.forEach(function(row, index) {
    var rowNumber = index + 2;
    var currentId = String(row[colId - 1] || '').trim();
    var oldGlobal = colGlobal ? String(row[colGlobal - 1] || '').trim() : '';
    var oldLocal = colLocal ? String(row[colLocal - 1] || '').trim() : '';
    var match = activityMap.byAnyOldId[currentId] || activityMap.byAnyOldId[oldLocal] || activityMap.byAnyOldId[oldGlobal] || activityMap.byNewId[currentId];
    if (!match) return;

    if (atividadesV2_writeCellIfChanged_(sheet, rowNumber, colId, match.newId)) changed++;

    var ref = colIdReferencia ? String(row[colIdReferencia - 1] || '').trim() : '';
    var counterKey = opts.entity === 'APRESENTACAO'
      ? [sheetName, match.newId].join('|')
      : [sheetName, match.newId, ref || rowNumber].join('|');
    counters[counterKey] = (counters[counterKey] || 0) + 1;

    if (colApresentacao && opts.entity === 'APRESENTACAO') {
      var presentationIndex = presentationTotals[match.newId] > 1 ? counters[counterKey] : null;
      atividadesV2_writeCellIfChanged_(sheet, rowNumber, colApresentacao, atividadesV2_gerarIdApresentacao_(match.ano, match.semestre, match.sequencial, presentationIndex));
    }
    if (colRegistroPresenca && opts.entity === 'PRESENCA') {
      atividadesV2_writeCellIfChanged_(sheet, rowNumber, colRegistroPresenca, atividadesV2_gerarIdRegistroPresenca_(match.ano, match.semestre, match.sequencial, ref || rowNumber));
    }
    if (colConvite && opts.entity === 'CONVITE') {
      atividadesV2_writeCellIfChanged_(sheet, rowNumber, colConvite, atividadesV2_gerarIdConvite_(match.ano, match.semestre, match.sequencial, ref || rowNumber));
    }
    if (colJustificativa && opts.entity === 'JUSTIFICATIVA') {
      atividadesV2_writeCellIfChanged_(sheet, rowNumber, colJustificativa, atividadesV2_gerarIdJustificativa_(match.ano, match.semestre, match.sequencial, ref || rowNumber, counters[counterKey]));
    }
  });

  return changed;
}

function atividadesV2_getActivityReferenceSheetNames_() {
  return [
    ATIVIDADES_V2_SHEETS.APRESENTACOES,
    ATIVIDADES_V2_SHEETS.ENVOLVIDOS,
    ATIVIDADES_V2_SHEETS.PRESENCAS_REGISTROS,
    ATIVIDADES_V2_SHEETS.CONVITES,
    ATIVIDADES_V2_SHEETS.JUSTIFICATIVAS,
    ATIVIDADES_V2_SHEETS.PORTAL_ACOES
  ].concat(atividadesV2_getPortalActivityReferenceSheetNames_());
}

function atividadesV2_getPortalActivityReferenceSheetNames_() {
  return [
    ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_CALENDARIO,
    ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_DETALHES,
    ATIVIDADES_V2_SHEETS.PORTAL_JUSTIFICATIVAS,
    ATIVIDADES_V2_SHEETS.PORTAL_PENDENCIAS_DIRETORIA
  ];
}

function atividadesV2_simpleHeaderMap_(headers) {
  var map = {};
  (headers || []).forEach(function(header, index) {
    var key = String(header || '').trim();
    if (key && !map[key]) map[key] = index + 1;
  });
  return map;
}

function atividadesV2_writeCellIfChanged_(sheet, rowNumber, colNumber, value) {
  if (!colNumber) return false;
  var range = sheet.getRange(rowNumber, colNumber);
  var current = range.getValue();
  if (String(current || '') === String(value || '')) return false;
  range.setValue(value);
  return true;
}

function atividadesV2_isCanonicalActivityId_(value) {
  return /^ATV-\d{4}-[12]-\d{4}$/.test(String(value || '').trim().toUpperCase());
}

function atividadesV2_appendV2Log_(ss, payload) {
  var sheet = ss.getSheetByName(ATIVIDADES_V2_SHEETS.LOG);
  if (!sheet) return null;
  var details = String(payload && payload.DETALHES_JSON || '').slice(0, 8000);
  var row = {
    ID_LOG: atividadesV2_buildDeterministicId_('LOGV2', [new Date().getTime(), payload && payload.ACAO]),
    DATA_HORA: new Date(),
    MODULO: 'ATIVIDADES_V2',
    FLUXO: payload && payload.FLUXO ? payload.FLUXO : '',
    ACAO: payload && payload.ACAO ? payload.ACAO : '',
    NIVEL: payload && payload.NIVEL ? payload.NIVEL : 'INFO',
    STATUS: payload && payload.STATUS ? payload.STATUS : '',
    ID_ATIVIDADE: payload && payload.ID_ATIVIDADE ? payload.ID_ATIVIDADE : '',
    ID_ENTIDADE: payload && payload.ID_ENTIDADE ? payload.ID_ENTIDADE : '',
    TIPO_ENTIDADE: payload && payload.TIPO_ENTIDADE ? payload.TIPO_ENTIDADE : '',
    USUARIO: payload && payload.USUARIO ? String(payload.USUARIO).slice(0, 120) : '',
    MENSAGEM: payload && payload.MENSAGEM ? String(payload.MENSAGEM).slice(0, 500) : '',
    DETALHES_JSON: details,
    ORIGEM: 'APPS_SCRIPT',
    CRIADO_EM: new Date()
  };
  return atividadesV2_upsertObjectsByKey_(sheet, [row], 'ID_LOG', { dryRun: false });
}

function atividadesV2_gerarIdAtividade_(ano, semestre, sequencial) {
  return 'ATV-' + atividadesV2_padYear_(ano) + '-' + atividadesV2_padSemester_(semestre) + '-' + atividadesV2_padSequence_(sequencial);
}

function atividadesV2_gerarIdApresentacao_(ano, semestre, sequencial, indiceOpcional) {
  var base = 'APR-' + atividadesV2_padYear_(ano) + '-' + atividadesV2_padSemester_(semestre) + '-' + atividadesV2_padSequence_(sequencial);
  return indiceOpcional ? base + '-' + atividadesV2_padNumber_(indiceOpcional, 2) : base;
}

function atividadesV2_gerarIdRegistroPresenca_(ano, semestre, sequencial, idReferencia) {
  return 'PRS-' + atividadesV2_padYear_(ano) + '-' + atividadesV2_padSemester_(semestre) + '-' + atividadesV2_padSequence_(sequencial) + '-' + atividadesV2_sanitizeIdToken_(idReferencia || 'SEM_REFERENCIA');
}

function atividadesV2_gerarIdConvite_(ano, semestre, sequencial, idReferencia) {
  return 'CONV-' + atividadesV2_padYear_(ano) + '-' + atividadesV2_padSemester_(semestre) + '-' + atividadesV2_padSequence_(sequencial) + '-' + atividadesV2_sanitizeIdToken_(idReferencia || 'SEM_REFERENCIA');
}

function atividadesV2_gerarIdJustificativa_(ano, semestre, sequencial, idReferencia, indice) {
  return 'JUS-' + atividadesV2_padYear_(ano) + '-' + atividadesV2_padSemester_(semestre) + '-' + atividadesV2_padSequence_(sequencial) + '-' + atividadesV2_sanitizeIdToken_(idReferencia || 'SEM_REFERENCIA') + '-' + atividadesV2_padNumber_(indice || 1, 2);
}

function atividadesV2_resolveActivityIdentity_(record, opts) {
  opts = opts || {};
  var legacyId = atividadesV2_firstNonEmpty_(
    record.ID_ATIVIDADE_LOCAL,
    record.ID_ATIVIDADE_GLOBAL,
    record.ID_ATIVIDADE,
    opts.legacyId,
    opts.fallbackLegacyId,
    opts.fallbackRowNumber ? 'LEGADO_LINHA_' + opts.fallbackRowNumber : ''
  );
  var ano = atividadesV2_firstNonEmpty_(
    record.ANO,
    opts.ano,
    atividadesV2_extractYearFromVigencia_(record.DATA_ATIVIDADE),
    atividadesV2_extractYear_(record.DATA_ATIVIDADE),
    atividadesV2_extractYear_(record.CICLO)
  );
  var semestre = atividadesV2_firstValidSemester_(
    record.SEMESTRE,
    opts.semestre,
    atividadesV2_extractSemesterFromVigencia_(record.DATA_ATIVIDADE),
    atividadesV2_extractSemester_(record.CICLO)
  );
  var sequencial = atividadesV2_firstNonEmpty_(
    record.NUMERO_SEQUENCIAL_NO_CICLO,
    opts.sequencial,
    atividadesV2_extractSequenceFromLegacyId_(record.ID_ATIVIDADE_LOCAL),
    atividadesV2_extractSequenceFromLegacyId_(record.ID_ATIVIDADE_GLOBAL),
    atividadesV2_extractSequenceFromLegacyId_(record.ID_ATIVIDADE),
    opts.fallbackRowNumber
  );

  return {
    legacyId: String(legacyId || '').trim(),
    ano: atividadesV2_padYear_(ano),
    semestre: atividadesV2_padSemester_(semestre),
    sequencial: atividadesV2_padSequence_(sequencial),
    idAtividade: atividadesV2_gerarIdAtividade_(ano, semestre, sequencial)
  };
}

function atividadesV2_buildCicloFromIdentity_(identity, source) {
  var raw = String(source && source.CICLO || '').trim();
  if (/^GEAPA_\d{4}$/i.test(raw)) return raw.toUpperCase();

  var ano = String(identity && identity.ano || source && source.ANO || '').trim();
  if (/^\d{4}$/.test(ano)) return 'GEAPA_' + ano;

  var extracted = atividadesV2_extractYear_(raw || source && source.DATA_ATIVIDADE);
  return extracted ? 'GEAPA_' + extracted : raw;
}

function atividadesV2_getActivityIdentityForRelated_(activityIdMap, legacyId, record) {
  var key = String(legacyId || '').trim();
  if (key && activityIdMap[key]) return activityIdMap[key];
  return atividadesV2_resolveActivityIdentity_(record || {}, {
    fallbackLegacyId: key,
    fallbackRowNumber: record && record._rowNumber ? record._rowNumber : ''
  });
}

function atividadesV2_extractSequenceFromLegacyId_(value) {
  var text = String(value || '').trim();
  if (!text) return '';
  var matches = text.match(/\d+/g);
  if (!matches || !matches.length) return '';
  return matches[matches.length - 1];
}

function atividadesV2_padYear_(ano) {
  var extracted = atividadesV2_extractYear_(ano) || String(ano || '').replace(/\D/g, '').slice(0, 4);
  return /^\d{4}$/.test(extracted) ? extracted : '0000';
}

function atividadesV2_padSemester_(semestre) {
  return atividadesV2_extractSemester_(semestre) || '0';
}

function atividadesV2_padSequence_(sequencial) {
  return atividadesV2_padNumber_(sequencial || 0, 4);
}

function atividadesV2_padNumber_(value, length) {
  var digits = String(value || '').replace(/\D/g, '');
  if (!digits) digits = '0';
  while (digits.length < length) digits = '0' + digits;
  return digits.slice(-length);
}

function atividadesV2_countByLegacyActivity_(records) {
  var counts = {};
  (records || []).forEach(function(record) {
    var key = String(record.ID_ATIVIDADE || record.ID_ATIVIDADE_LOCAL || record.ID_ATIVIDADE_GLOBAL || '').trim();
    if (!key) key = 'LINHA_' + record._rowNumber;
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

function atividadesV2_joinLegacyRefs_(refs) {
  return (refs || []).map(function(ref) {
    return String(ref || '').trim();
  }).filter(function(ref) {
    return !!ref;
  }).join(' / ');
}

function atividadesV2_appendMigrationObs_(current, note) {
  var base = String(current || '').trim();
  var extra = String(note || '').trim();
  if (!extra) return base;
  return base ? base + ' | ' + extra : extra;
}

function atividadesV2_buildDeterministicId_(prefix, parts) {
  var token = (parts || []).map(function(part) {
    return atividadesV2_sanitizeIdToken_(part);
  }).filter(function(part) {
    return !!part;
  }).join('_');
  if (!token) token = 'SEM_CHAVE';
  return String(prefix || 'ID') + '-' + token.slice(0, 120);
}

function atividadesV2_sanitizeIdToken_(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function atividadesV2_firstNonEmpty_() {
  for (var i = 0; i < arguments.length; i++) {
    var value = arguments[i];
    if (String(value || '').trim()) return value;
  }
  return '';
}

function atividadesV2_firstValidSemester_() {
  for (var i = 0; i < arguments.length; i++) {
    var semester = atividadesV2_padSemester_(arguments[i]);
    if (semester === '1' || semester === '2') return semester;
  }
  return '';
}

function atividadesV2_extractYear_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return value.getFullYear();
  }
  var match = String(value || '').match(/20\d{2}/);
  return match ? match[0] : '';
}

function atividadesV2_extractSemester_(value) {
  var text = String(value || '').toUpperCase();
  var match = text.match(/(?:^|[^0-9])([12])(?:[^0-9]|$)/);
  return match ? match[1] : '';
}

function atividadesV2_extractYearFromVigencia_(value) {
  var semester = atividadesV2_resolveVigenciaSemestreByDate_(value);
  if (!semester) return '';
  return atividadesV2_extractYear_(semester.id) || atividadesV2_extractYear_(semester.periodId);
}

function atividadesV2_extractSemesterFromVigencia_(value) {
  var semester = atividadesV2_resolveVigenciaSemestreByDate_(value);
  return semester ? atividadesV2_extractSemester_(semester.id) : '';
}

function atividadesV2_resolveVigenciaSemestreByDate_(value) {
  var date = atividades_parseDateOrNull_(value);
  if (!date) return null;

  var cacheKey = [
    date.getFullYear(),
    atividadesV2_padNumber_(date.getMonth() + 1, 2),
    atividadesV2_padNumber_(date.getDate(), 2)
  ].join('-');
  if (Object.prototype.hasOwnProperty.call(ATIVIDADES_V2_VIGENCIA_SEMESTRE_CACHE, cacheKey)) {
    return ATIVIDADES_V2_VIGENCIA_SEMESTRE_CACHE[cacheKey];
  }

  try {
    var semester = atividades_resolverSemestrePorData_(date);
    ATIVIDADES_V2_VIGENCIA_SEMESTRE_CACHE[cacheKey] = semester ? {
      id: String(semester.id || '').trim(),
      periodId: String(semester.periodId || '').trim()
    } : null;
    return ATIVIDADES_V2_VIGENCIA_SEMESTRE_CACHE[cacheKey];
  } catch (err) {
    ATIVIDADES_V2_VIGENCIA_SEMESTRE_CACHE[cacheKey] = null;
    return null;
  }
}

function atividadesV2_mapStatusOperacional_(status) {
  var normalized = atividadesV2_sanitizeIdToken_(status);
  var map = {
    CONFIRMADA: 'AGENDADA',
    CONVITES_LIBERADOS: 'PUBLICADA'
  };
  return map[normalized] || normalized || 'RASCUNHO';
}

function atividadesV2_isInactiveStatus_(status) {
  var normalized = atividadesV2_sanitizeIdToken_(status);
  return ['CANCELADA', 'ARQUIVADA'].indexOf(normalized) >= 0;
}

function atividadesV2_mapPresenceStatus_(code) {
  var normalized = String(code || '').trim().toUpperCase();
  var map = {
    P: 'PRESENTE_PRESENCIAL',
    R: 'PRESENTE_REMOTO',
    F: 'FALTA',
    J: 'JUSTIFICADA',
    A: 'ABONADA',
    'N/A': 'NAO_SE_APLICA'
  };
  return map[normalized] || 'PENDENTE';
}

function atividadesV2_mapPresenceMode_(code) {
  var normalized = String(code || '').trim().toUpperCase();
  if (normalized === 'P') return 'PRESENCIAL';
  if (normalized === 'R') return 'REMOTA';
  return 'NAO_APLICAVEL';
}

function atividadesV2_isPresenceCertificateRelevant_(code) {
  var normalized = String(code || '').trim().toUpperCase();
  return ['P', 'R', 'A'].indexOf(normalized) >= 0;
}

function atividadesV2_extractLocalActivityIdFromPresenceHeader_(header) {
  var text = String(header || '').trim();
  var match = text.match(/^(ATV-[0-9]+)/i);
  return match ? match[1].toUpperCase() : text;
}

function atividadesV2_findDuplicateKeysByHeader_(sheet, idHeader) {
  var headerMap = atividadesV2_headerMap_(sheet);
  var col = atividadesV2_getCol_(headerMap, idHeader);
  if (!col || sheet.getLastRow() < 2) return [];

  var values = sheet.getRange(2, col, sheet.getLastRow() - 1, 1).getValues().map(function(row) {
    return String(row[0] || '').trim();
  }).filter(function(value) {
    return !!value;
  });

  return atividadesV2_findDuplicateValues_(values);
}

function atividadesV2_planLegacyPresenceMigration_(spreadsheet) {
  var groups = {};
  var activityPrefix = ATIVIDADES_CFG.DYNAMIC_SHEET_PREFIXES.PERIODO_ATIVIDADES;
  var presencePrefix = ATIVIDADES_CFG.DYNAMIC_SHEET_PREFIXES.PERIODO_PRESENCAS;

  spreadsheet.getSheets().forEach(function(sheet) {
    var name = sheet.getName();
    if (name.indexOf(activityPrefix) === 0 || name.indexOf(presencePrefix) === 0) {
      var periodCode = atividades_extractPeriodCodeFromDynamicSheetName_(name);
      if (!periodCode) return;
      if (!groups[periodCode]) {
        groups[periodCode] = {
          periodCode: periodCode,
          activitySheet: null,
          presenceSheet: null
        };
      }
      if (name.indexOf(activityPrefix) === 0) groups[periodCode].activitySheet = sheet;
      if (name.indexOf(presencePrefix) === 0) groups[periodCode].presenceSheet = sheet;
    }
  });

  return Object.keys(groups).sort().map(function(periodCode) {
    return atividadesV2_summarizeLegacyPeriodGroup_(groups[periodCode]);
  });
}

function atividadesV2_summarizeLegacyPeriodGroup_(group) {
  var activityRows = group.activitySheet ? Math.max(group.activitySheet.getLastRow() - 1, 0) : 0;
  var presenceSummary = group.presenceSheet
    ? atividadesV2_summarizeLegacyPresenceSheet_(group.presenceSheet)
    : {
      members: 0,
      dynamicPresenceColumns: 0,
      estimatedRecordsAllCells: 0,
      estimatedRecordsWithValue: 0,
      estimatedBlankCells: 0,
      dynamicHeaders: []
    };

  return {
    periodCode: group.periodCode,
    activitySheetName: group.activitySheet ? group.activitySheet.getName() : '',
    presenceSheetName: group.presenceSheet ? group.presenceSheet.getName() : '',
    activitySheetFound: !!group.activitySheet,
    presenceSheetFound: !!group.presenceSheet,
    activityRows: activityRows,
    members: presenceSummary.members,
    dynamicPresenceColumns: presenceSummary.dynamicPresenceColumns,
    estimatedRecordsAllCells: presenceSummary.estimatedRecordsAllCells,
    estimatedRecordsWithValue: presenceSummary.estimatedRecordsWithValue,
    estimatedBlankCells: presenceSummary.estimatedBlankCells,
    dynamicHeaders: presenceSummary.dynamicHeaders
  };
}

function atividadesV2_summarizeLegacyPresenceSheet_(sheet) {
  var headers = atividadesV2_getSheetHeaders_(sheet);
  var firstDynamicCol = ATIVIDADES_SCHEMA.PRESENCAS_BASE.length + 1;
  var firstSummaryCol = atividadesV2_findFirstSummaryColumn_(headers);
  var lastDynamicCol = firstSummaryCol
    ? firstSummaryCol - 1
    : headers.length;
  var dynamicHeaders = [];

  for (var col = firstDynamicCol; col <= lastDynamicCol; col++) {
    var header = String(headers[col - 1] || '').trim();
    if (header) dynamicHeaders.push(header);
  }

  var members = Math.max(sheet.getLastRow() - 1, 0);
  var dynamicCols = dynamicHeaders.length;
  var withValue = 0;
  var blank = 0;

  if (members > 0 && dynamicCols > 0) {
    var values = sheet.getRange(2, firstDynamicCol, members, dynamicCols).getValues();
    values.forEach(function(row) {
      row.forEach(function(value) {
        if (String(value || '').trim()) {
          withValue++;
        } else {
          blank++;
        }
      });
    });
  }

  return {
    members: members,
    dynamicPresenceColumns: dynamicCols,
    estimatedRecordsAllCells: members * dynamicCols,
    estimatedRecordsWithValue: withValue,
    estimatedBlankCells: blank,
    dynamicHeaders: dynamicHeaders
  };
}

function atividadesV2_findFirstSummaryColumn_(headers) {
  var summaryHeaders = ATIVIDADES_SCHEMA.PRESENCAS_SUMARIO || [];
  for (var i = 0; i < headers.length; i++) {
    if (summaryHeaders.indexOf(String(headers[i] || '').trim()) >= 0) {
      return i + 1;
    }
  }
  return 0;
}

function atividadesV2_buildMigrationFieldCoverage_() {
  return {
    sourceFieldsWithoutDestination: {
      Atividades_Log: ['Todos os campos: nao migrar automaticamente nesta fase.'],
      Atividades: ['DATA_CONVOCACAO', 'DATA_LEMBRETE', 'BASE_PLANEJAMENTO_INICIAL'],
      Atividades_Apresentacoes: ['ORDEM_RGA'],
      Atividade_Convidados: ['DATA_ENVIO_CONFIRMACAO'],
      Presencas: ['Campos de sumario disciplinar ficam para views PORTAL_* e nao viram presenca individual.']
    },
    destinationFieldsWithoutSource: {
      Atividades: ['ID_ATIVIDADE', 'CICLO', 'ANO', 'SEMESTRE', 'NUMERO_SEQUENCIAL_NO_CICLO', 'TITULO_PUBLICO', 'DESCRICAO_PUBLICA', 'STATUS_PUBLICACAO_PORTAL', 'VISIBILIDADE_PORTAL', 'DATA_LIBERACAO_PORTAL', 'DATA_LIMITE_JUSTIFICATIVA', 'LINK_FOTOS', 'LINK_PASTA_DRIVE', 'CRIADO_POR', 'ATUALIZADO_POR', 'BLOQUEADO_PARA_EDICAO', 'ATIVO'],
      Atividades_Apresentacoes: ['ID_ATIVIDADE', 'ID_PESSOA', 'CICLO', 'ANO', 'SEMESTRE', 'STATUS_TITULO_EIXO', 'LINK_PASTA_DRIVE', 'PUBLICAR_NO_PORTAL', 'VISIBILIDADE_PORTAL', 'ELEGIVEL_CERTIFICADO', 'CRIADO_POR', 'ATUALIZADO_POR', 'BLOQUEADO_PARA_EDICAO', 'ATIVO'],
      Atividades_Presencas_Registros: ['ID_REGISTRO_PRESENCA', 'ID_ATIVIDADE', 'ID_APRESENTACAO', 'ID_PESSOA', 'TIPO_PARTICIPANTE', 'ID_REFERENCIA', 'CPF_PARTICIPANTE', 'VINCULO_PARTICIPANTE', 'PAPEL_NA_ATIVIDADE', 'STATUS_PRESENCA', 'CODIGO_PRESENCA', 'MODALIDADE_PRESENCA', 'CARGA_HORARIA_CONSIDERADA', 'PRESENCA_REGISTRADA', 'ELEGIVEL_CERTIFICADO', 'MOTIVO_NAO_CERTIFICAVEL', 'ID_JUSTIFICATIVA', 'STATUS_JUSTIFICATIVA', 'DECISAO_JUSTIFICATIVA', 'VALOR_ANTES_JUSTIFICATIVA', 'VALOR_DEPOIS_JUSTIFICATIVA', 'ORIGEM_REGISTRO', 'REGISTRADO_POR', 'REGISTRADO_EM', 'ATUALIZADO_POR', 'ATUALIZADO_EM', 'MOTIVO_AJUSTE', 'ATIVO'],
      Atividades_Convites: ['ID_ATIVIDADE', 'ID_APRESENTACAO', 'CICLO', 'ID_PESSOA', 'INSTITUICAO', 'TIPO_CONVITE', 'DATA_ENVIO_CONVITE', 'PRESENCA_ESPERADA', 'ID_REGISTRO_PRESENCA', 'ORIGEM_REGISTRO', 'CRIADO_POR', 'ATUALIZADO_POR', 'ATIVO'],
      Justificativas_Faltas: ['ID_REGISTRO_PRESENCA', 'ID_ATIVIDADE', 'CICLO', 'ID_PESSOA', 'EMAIL_MEMBRO', 'OBSERVACAO_PUBLICA', 'OBSERVACOES_INTERNAS', 'ORIGEM_ENVIO', 'CRIADO_EM', 'ATUALIZADO_EM', 'ATIVO'],
      Atividades_Config: ['ID_CONFIG', 'OBRIGATORIA_PADRAO', 'CARGA_HORARIA_PADRAO', 'VISIBILIDADE_PORTAL_PADRAO', 'STATUS_PUBLICACAO_PORTAL_PADRAO', 'PERMITE_APRESENTACAO', 'PERMITE_CONVIDADOS', 'PERMITE_EXTERNOS', 'PERMITE_JUSTIFICATIVA', 'PRAZO_JUSTIFICATIVA_HORAS', 'CRIADO_EM', 'ATUALIZADO_EM']
    }
  };
}

function atividadesV2_getSheetHeaders_(sheet) {
  var lastColumn = Math.max(sheet.getLastColumn(), 1);
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function(header) {
    return String(header || '').trim();
  });
}

function atividadesV2_findDuplicateValues_(values) {
  var seen = {};
  var duplicates = {};
  values.forEach(function(value) {
    var normalized = String(value || '').trim();
    if (!normalized) return;
    if (seen[normalized]) duplicates[normalized] = true;
    seen[normalized] = true;
  });
  return Object.keys(duplicates).sort();
}

function atividadesV2_getHeadersWithValidation_(sheet, headers) {
  if (sheet.getMaxRows() < 2 || !headers.length) return [];

  var validations = sheet.getRange(2, 1, 1, headers.length).getDataValidations()[0];
  var out = [];
  validations.forEach(function(rule, index) {
    if (rule && headers[index]) out.push(headers[index]);
  });
  return out;
}

function atividadesV2_createSheetIfMissing_(ss, sheetName) {
  var name = String(sheetName || '').trim();
  if (!ss) throw new Error('Spreadsheet obrigatorio para criar/validar abas v2.');
  if (!name) throw new Error('Nome de aba obrigatorio para criar/validar abas v2.');

  var sheet = ss.getSheetByName(name);
  if (sheet) {
    return {
      sheet: sheet,
      created: false
    };
  }

  sheet = ss.insertSheet(name, ss.getNumSheets());
  atividadesV2_logSetup_('INFO', 'Aba v2 criada.', { sheetName: name });

  return {
    sheet: sheet,
    created: true
  };
}

function atividadesV2_applyHeadersIfMissing_(sheet, headers) {
  var wanted = (headers || []).slice();
  if (!sheet || !wanted.length) {
    return {
      added: [],
      warning: ''
    };
  }

  var lastColumn = Math.max(sheet.getLastColumn(), 1);
  var currentHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function(header) {
    return String(header || '').trim();
  });
  var lastUsedIndex = 0;

  currentHeaders.forEach(function(header, index) {
    if (header) lastUsedIndex = index + 1;
  });

  var missing = wanted.filter(function(header) {
    return currentHeaders.indexOf(header) === -1;
  });

  if (!missing.length) {
    return {
      added: [],
      warning: ''
    };
  }

  var startCol = lastUsedIndex + 1;
  var targetLastCol = startCol + missing.length - 1;
  if (sheet.getMaxColumns() < targetLastCol) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), targetLastCol - sheet.getMaxColumns());
  }

  sheet.getRange(1, startCol, 1, missing.length).setValues([missing]);

  return {
    added: missing,
    warning: lastUsedIndex > wanted.length
      ? 'Cabecalhos ausentes foram adicionados ao final sem reordenar cabecalhos existentes.'
      : ''
  };
}

function atividadesV2_applyBasicSheetUx_(sheet) {
  var warnings = [];
  if (!sheet) return warnings;

  try {
    if (typeof GEAPA_CORE !== 'undefined' && GEAPA_CORE && typeof GEAPA_CORE.coreFreezeHeaderRow === 'function') {
      GEAPA_CORE.coreFreezeHeaderRow(sheet, 1);
    } else {
      sheet.setFrozenRows(1);
    }
  } catch (e) {
    warnings.push('Nao foi possivel congelar a primeira linha: ' + e.message);
  }

  try {
    if (typeof GEAPA_CORE !== 'undefined' && GEAPA_CORE && typeof GEAPA_CORE.coreEnsureFilter === 'function') {
      GEAPA_CORE.coreEnsureFilter(sheet, 1, { recreate: true });
    } else if (!sheet.getFilter()) {
      sheet.getRange(1, 1, Math.max(sheet.getMaxRows(), 2), Math.max(sheet.getLastColumn(), 1)).createFilter();
    }
  } catch (e2) {
    warnings.push('Nao foi possivel aplicar filtro: ' + e2.message);
  }

  try {
    var lastColumn = Math.max(sheet.getLastColumn(), 1);
    sheet.getRange(1, 1, 1, lastColumn)
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle')
      .setBackground('#f3f3f3');
    sheet.getRange(1, 1, Math.max(sheet.getMaxRows(), 1), lastColumn)
      .setVerticalAlignment('middle');
    sheet.autoResizeColumns(1, lastColumn);
  } catch (e3) {
    warnings.push('Nao foi possivel aplicar UX basica: ' + e3.message);
  }

  return warnings;
}

function atividadesV2_applyValidations_(sheet, sheetName) {
  if (!sheet) return [];

  var applied = [];
  var rules = atividadesV2_buildValidationRules_(sheetName);
  var headerMap = atividadesV2_headerMap_(sheet);
  var maxRows = Math.max(sheet.getMaxRows() - 1, 1);

  Object.keys(rules).forEach(function(header) {
    var col = atividadesV2_getCol_(headerMap, header);
    if (!col) return;

    var rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(rules[header].values, true)
      .setAllowInvalid(true)
      .setHelpText(rules[header].helpText || 'Selecione um valor da lista sugerida.')
      .build();

    sheet.getRange(2, col, maxRows, 1).setDataValidation(rule);
    applied.push(header);
  });

  return applied;
}

function atividadesV2_buildValidationRules_(sheetName) {
  var enums = ATIVIDADES_V2_VALIDATION_ENUMS;
  var rules = {};

  atividadesV2_addRule_(rules, 'ATIVO', enums.ATIVO, 'Use SIM para registros ativos e NAO para registros preservados, mas inativos.');
  [
    'OBRIGATORIA',
    'EXIGE_CONVOCACAO',
    'EXIGE_LEMBRETE',
    'EXIGE_ATA',
    'EXIGE_MATERIAL',
    'EXIGE_LISTA_PRESENCA',
    'EXIGE_CONFIRMACAO_PRESENCA',
    'CONTA_PRESENCA',
    'CONTA_FALTA',
    'GERA_CERTIFICADO',
    'BLOQUEADO_PARA_EDICAO',
    'NOTIFICACAO_AGENDAMENTO_ENVIADA',
    'NOTIFICACAO_SECRETARIOS_ENVIADA',
    'LEMBRETE_MEMBROS_ENVIADO',
    'CONVITE_PROFESSORES_ENVIADO',
    'CONVITE_EXTERNOS_ENVIADO',
    'SYNC_HISTORICO_PUBLICO',
    'PUBLICAR_NO_PORTAL',
    'ELEGIVEL_CERTIFICADO',
    'CONVITE_ENVIADO',
    'CONFIRMADO',
    'PRESENCA_ESPERADA',
    'PRESENCA_REGISTRADA',
    'POSSUI_DOCUMENTO_COMPROBATORIO',
    'DECISAO_APLICADA_NA_PRESENCA',
    'OBRIGATORIA_PADRAO',
    'EXIGE_CONVOCACAO_PADRAO',
    'EXIGE_LEMBRETE_PADRAO',
    'EXIGE_ATA_PADRAO',
    'EXIGE_MATERIAL_PADRAO',
    'EXIGE_LISTA_PRESENCA_PADRAO',
    'EXIGE_CONFIRMACAO_PRESENCA_PADRAO',
    'CONTA_PRESENCA_PADRAO',
    'CONTA_FALTA_PADRAO',
    'GERA_CERTIFICADO_PADRAO',
    'PERMITE_APRESENTACAO',
    'PERMITE_CONVIDADOS',
    'PERMITE_EXTERNOS',
    'PERMITE_JUSTIFICATIVA',
    'EXIGE_EIXO_TEMATICO',
    'PERMITE_EIXO_SECUNDARIO',
    'EXIGE_PESSOA_PRINCIPAL',
    'EXIGE_TITULO_PUBLICO',
    'USA_FLUXO_APRESENTACAO',
    'EXIBE_NO_PORTAL',
    'GERA_CARD_AGENDA',
    'EXIBIR_NO_PORTAL',
    'EXIGE_FOTO_REUNIAO',
    'GERA_PENDENCIA_FOTO_REUNIAO',
    'PERMITE_UPLOAD_FOTO_REUNIAO',
    'PERMITE_LINK_FOTO_REUNIAO',
    'PERMITE_MEMBRO_APRESENTADOR_ENVIAR_FOTO_REUNIAO',
    'PERMITE_DISPENSAR_FOTO_REUNIAO',
    'PODE_VER_DETALHES'
  ].forEach(function(header) {
    atividadesV2_addRule_(rules, header, enums.SIM_NAO, 'Valores sugeridos: SIM ou NAO.');
  });

  atividadesV2_addRule_(rules, 'TIPO_PARTICIPANTE', enums.TIPO_PARTICIPANTE, 'Tipo principal de participante na atividade.');
  atividadesV2_addRule_(rules, 'TIPO_PESSOA', enums.TIPO_PESSOA, 'Tipo da pessoa envolvida na atividade.');
  atividadesV2_addRule_(rules, 'TIPO_PESSOA_PRINCIPAL', enums.TIPO_PESSOA, 'Tipo da pessoa principal da atividade.');
  atividadesV2_addRule_(rules, 'PAPEL_NA_ATIVIDADE', enums.PAPEL_NA_ATIVIDADE, 'Papel da pessoa envolvida na atividade.');
  atividadesV2_addRule_(rules, 'PAPEL_PESSOA_PRINCIPAL', enums.PAPEL_NA_ATIVIDADE, 'Papel publico/operacional da pessoa principal.');
  atividadesV2_addRule_(rules, 'PAPEL_PADRAO_PESSOA_PRINCIPAL', enums.PAPEL_NA_ATIVIDADE, 'Papel padrao da pessoa principal para este subtipo.');
  atividadesV2_addRule_(rules, 'STATUS_PRESENCA', enums.STATUS_PRESENCA, 'Estado da presenca no registro permanente.');
  atividadesV2_addRule_(rules, 'CODIGO_PRESENCA', enums.CODIGO_PRESENCA, 'Codigo curto de presenca: P, R, F, J, A ou N/A.');
  atividadesV2_addRule_(rules, 'MODALIDADE_PRESENCA', enums.MODALIDADE_PRESENCA, 'Modalidade considerada para o registro.');
  atividadesV2_addRule_(rules, 'STATUS_OPERACIONAL', enums.STATUS_OPERACIONAL, 'Status operacional interno da atividade.');
  atividadesV2_addRule_(rules, 'STATUS_PUBLICACAO_PORTAL', enums.STATUS_PUBLICACAO_PORTAL, 'Status de publicacao no Portal GEAPA.');
  atividadesV2_addRule_(rules, 'STATUS_PUBLICACAO_PORTAL_PADRAO', enums.STATUS_PUBLICACAO_PORTAL, 'Status padrao de publicacao no Portal GEAPA.');
  atividadesV2_addRule_(rules, 'VISIBILIDADE_PORTAL', enums.VISIBILIDADE_PORTAL, 'Nivel de visibilidade no Portal GEAPA.');
  atividadesV2_addRule_(rules, 'VISIBILIDADE_PORTAL_PADRAO', enums.VISIBILIDADE_PORTAL, 'Visibilidade padrao no Portal GEAPA.');
  atividadesV2_addRule_(rules, 'STATUS_ANALISE', enums.STATUS_ANALISE, 'Status da analise administrativa da justificativa.');
  atividadesV2_addRule_(rules, 'MOTIVO_DECLARADO', enums.MOTIVO_JUSTIFICATIVA, 'Motivo padronizado da justificativa pelo Portal.');
  atividadesV2_addRule_(rules, 'TIPO_ARQUIVO_ATIVIDADE', enums.TIPO_ARQUIVO_ATIVIDADE, 'Tipo canonico do arquivo vinculado.');
  atividadesV2_addRule_(rules, 'ESCOPO_ARQUIVO', enums.ESCOPO_ARQUIVO, 'Escopo do arquivo: atividade, apresentacao ou reuniao.');
  atividadesV2_addRule_(rules, 'STATUS_ARQUIVO', enums.STATUS_ARQUIVO, 'Estado operacional do arquivo vinculado.');

  return rules;
}

function atividadesV2_addRule_(rules, header, values, helpText) {
  rules[header] = {
    values: values,
    helpText: helpText
  };
}

function atividadesV2_headerMap_(sheet) {
  if (typeof GEAPA_CORE !== 'undefined' && GEAPA_CORE && typeof GEAPA_CORE.coreHeaderMap === 'function') {
    return GEAPA_CORE.coreHeaderMap(sheet, 1);
  }

  var lastColumn = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  var map = {};
  headers.forEach(function(header, index) {
    var name = String(header || '').trim();
    if (name && !map[name]) map[name] = index + 1;
  });
  return map;
}

function atividadesV2_getCol_(headerMap, header) {
  if (typeof GEAPA_CORE !== 'undefined' && GEAPA_CORE && typeof GEAPA_CORE.coreGetCol === 'function') {
    return GEAPA_CORE.coreGetCol(headerMap, header);
  }
  return headerMap[String(header || '').trim()] || 0;
}

function atividadesV2_logSetup_(level, message, data) {
  var normalizedLevel = String(level || 'INFO').trim().toUpperCase();
  var payload = atividadesV2_safeLogData_(data || {});
  var text = 'GEAPA-ATIVIDADES-V2-SETUP [' + normalizedLevel + '] ' + message + ' | ' + payload;
  Logger.log(text);

  try {
    if (typeof GEAPA_CORE === 'undefined' || !GEAPA_CORE) return;
    if (!ATIVIDADES_V2_SETUP_RUN_ID) {
      ATIVIDADES_V2_SETUP_RUN_ID = typeof GEAPA_CORE.coreRunId === 'function'
        ? GEAPA_CORE.coreRunId()
        : Utilities.getUuid();
    }

    var fnName = normalizedLevel === 'ERROR'
      ? 'coreLogError'
      : normalizedLevel === 'WARN'
        ? 'coreLogWarn'
        : 'coreLogInfo';

    if (typeof GEAPA_CORE[fnName] === 'function') {
      GEAPA_CORE[fnName](ATIVIDADES_V2_SETUP_RUN_ID, message, data || {});
    }
  } catch (e) {
    Logger.log('GEAPA-ATIVIDADES-V2-SETUP [WARN] Falha ao registrar log no GEAPA_CORE: ' + e.message);
  }
}

function atividadesV2_safeLogData_(data) {
  try {
    var text = JSON.stringify(data || {});
    if (text.length > 2000) {
      return text.slice(0, 2000) + '...';
    }
    return text;
  } catch (e) {
    return '{"log":"payload_nao_serializavel"}';
  }
}
