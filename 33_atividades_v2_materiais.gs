/**
 * Rotinas DEV para pastas de atividades e materiais de apresentacoes na base V2.
 *
 * Estas funcoes operam apenas na base ATIVIDADES_V2_DB e nao alteram bases V1.
 */

var ATIVIDADES_V2_DRIVE_ROOT_FOLDER_PROP = 'ATIVIDADES_V2_DRIVE_ROOT_FOLDER_ID';
var ATIVIDADES_V2_MATERIAL_MAX_BYTES_DEFAULT = 50 * 1024 * 1024;

var ATIVIDADES_V2_MATERIAL_HEADERS = Object.freeze([
  'STATUS_ENVIO_MATERIAL',
  'DATA_SOLICITACAO_MATERIAL',
  'DATA_COBRANCA_MATERIAL',
  'QTD_COBRANCAS_MATERIAL',
  'DATA_RECEBIMENTO_MATERIAL',
  'ID_ARQUIVO_MATERIAL',
  'NOME_ARQUIVO_MATERIAL',
  'LINK_MATERIAL_APRESENTACAO',
  'MIME_TYPE_MATERIAL',
  'VERSAO_MATERIAL',
  'ENVIADO_POR',
  'RECEBIDO_POR'
]);

// Campos legados lidos apenas por diagnostico/migracao historica.
// Rotinas de portal/views nao devem usa-los como fonte de material.
var ATIVIDADES_V2_OLD_ARQUIVO_HEADERS = Object.freeze([
  'STATUS_ENVIO_ARQUIVO',
  'DATA_SOLICITACAO_ARQUIVO',
  'DATA_COBRANCA_ARQUIVO',
  'QTD_COBRANCAS_ARQUIVO',
  'DATA_RECEBIMENTO_ARQUIVO',
  'LINK_ARQUIVO_DRIVE',
  'LINK_PASTA_DRIVE'
]);

/**
 * Garante uma pasta Drive para a atividade V2 e grava ID/link na aba Atividades.
 * Requer configuracao ATIVIDADES_V2_DRIVE_ROOT_FOLDER_ID em Script Properties,
 * salvo quando options.rootFolderId for informado.
 */
function atividadesV2_garantirPastaAtividade_(idAtividade, options) {
  options = options || {};
  var dryRun = options.dryRun === true;
  var id = String(idAtividade || '').trim();
  if (!atividadesV2_isCanonicalActivityId_(id)) {
    throw new Error('ID_ATIVIDADE invalido para garantir pasta: ' + id);
  }

  var ss = options.spreadsheet || atividadesV2_getDatabaseSpreadsheet_();
  var sheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES);
  if (!dryRun) atividadesV2_applyHeadersIfMissing_(sheet, ATIVIDADES_V2_SCHEMA.ATIVIDADES);

  var headers = atividadesV2_getSheetHeaders_(sheet);
  var headerMap = atividadesV2_simpleHeaderMap_(headers);
  var record = atividadesV2_findAtividadeV2ById_(sheet, id);
  if (!record) throw new Error('Atividade nao encontrada na V2: ' + id);

  var existingFolderId = String(record.ID_PASTA_DRIVE || atividadesV2_extractDriveIdFromUrl_(record.LINK_PASTA_DRIVE) || '').trim();
  if (existingFolderId) {
    var existingUrl = atividadesV2_buildDriveFolderUrl_(existingFolderId);
    var shouldWriteId = !String(record.ID_PASTA_DRIVE || '').trim();
    var shouldWriteLink = !String(record.LINK_PASTA_DRIVE || '').trim();
    if (!dryRun) {
      if (shouldWriteId) atividadesV2_writeCellIfChanged_(sheet, record._rowNumber, headerMap.ID_PASTA_DRIVE, existingFolderId);
      if (shouldWriteLink) atividadesV2_writeCellIfChanged_(sheet, record._rowNumber, headerMap.LINK_PASTA_DRIVE, existingUrl);
    }
    return {
      ok: true,
      idAtividade: id,
      folderId: existingFolderId,
      url: existingUrl,
      reused: true,
      dryRun: dryRun,
      writes: {
        idPastaDrive: shouldWriteId,
        linkPastaDrive: shouldWriteLink
      }
    };
  }

  var rootFolderId = atividadesV2_getDriveRootFolderId_(options);
  if (!rootFolderId) {
    throw new Error('Configure ' + ATIVIDADES_V2_DRIVE_ROOT_FOLDER_PROP + ' em Script Properties ou informe options.rootFolderId.');
  }

  var folderName = atividadesV2_buildNomePastaAtividade_(record);
  if (dryRun) {
    return {
      ok: true,
      idAtividade: id,
      plannedFolderName: folderName,
      rootFolderId: rootFolderId,
      reused: false,
      dryRun: true,
      writes: {
        idPastaDrive: true,
        linkPastaDrive: true
      }
    };
  }

  var rootFolder = DriveApp.getFolderById(rootFolderId);
  var folder = rootFolder.createFolder(folderName);
  var folderId = folder.getId();
  var folderUrl = atividadesV2_buildDriveFolderUrl_(folderId);

  atividadesV2_writeCellIfChanged_(sheet, record._rowNumber, headerMap.ID_PASTA_DRIVE, folderId);
  atividadesV2_writeCellIfChanged_(sheet, record._rowNumber, headerMap.LINK_PASTA_DRIVE, folderUrl);

  atividadesV2_appendV2Log_(ss, {
    FLUXO: 'MATERIAIS_V2',
    ACAO: 'CRIAR_PASTA_ATIVIDADE',
    NIVEL: 'INFO',
    STATUS: 'OK',
    ID_ATIVIDADE: id,
    MENSAGEM: 'Pasta Drive da atividade criada na base V2 do ambiente resolvido.',
    DETALHES_JSON: JSON.stringify({ idAtividade: id, folderName: folderName })
  });

  return {
    ok: true,
    idAtividade: id,
    folderId: folderId,
    url: folderUrl,
    reused: false,
    dryRun: false
  };
}

/**
 * Monta o nome canonico do arquivo de material de uma apresentacao.
 */
function atividadesV2_buildNomeMaterialApresentacao_(atividade, apresentacao, arquivoOriginal) {
  var idAtividade = String(atividade && atividade.ID_ATIVIDADE || apresentacao && apresentacao.ID_ATIVIDADE || 'ATV').trim();
  var idApresentacao = String(apresentacao && apresentacao.ID_APRESENTACAO || 'APR').trim();
  var titulo = atividades_sanitizePortalText_(
    apresentacao && apresentacao.TITULO_APRESENTACAO ||
    atividade && (atividade.TITULO_CONTEUDO_PUBLICO || atividade.TITULO_PUBLICO || atividade.TITULO) ||
    'material',
    90
  );
  var nomeOriginal = typeof arquivoOriginal === 'string'
    ? arquivoOriginal
    : String(arquivoOriginal && (arquivoOriginal.name || arquivoOriginal.nome || arquivoOriginal.nomeArquivo) || '');
  var ext = atividadesV2_getFileExtension_(nomeOriginal);
  var base = [idAtividade, idApresentacao, titulo || 'material'].join(' - ');
  return atividadesV2_sanitizeDriveFileName_(base).slice(0, 180) + ext;
}

/**
 * Registra material de apresentacao na V2, garantindo pasta e gravando campos novos.
 */
function atividadesV2_registrarMaterialApresentacao_(payload, contexto) {
  payload = payload || {};
  contexto = contexto || {};
  var trace = contexto._portalWriteTrace || null;
  var idAtividade = String(payload.idAtividade || payload.ID_ATIVIDADE || '').trim();
  var idApresentacao = String(payload.idApresentacao || payload.ID_APRESENTACAO || '').trim();
  var fileId = String(payload.fileId || payload.idArquivo || payload.ID_ARQUIVO || '').trim();
  var hasBase64 = !!String(payload.conteudoBase64 || payload.base64 || '').trim();

  if (idAtividade && !atividadesV2_isCanonicalActivityId_(idAtividade)) throw new Error('ID_ATIVIDADE invalido.');
  if (!idApresentacao) throw new Error('ID_APRESENTACAO obrigatorio.');
  if (!fileId && !hasBase64) throw new Error('Arquivo enviado obrigatorio.');

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('LOCK_INDISPONIVEL: nao foi possivel registrar material agora.');

  try {
    var ss = atividadesV2_getDatabaseSpreadsheet_();
    var portalAction = contexto._portalWriteAction || null;
    var existingRequest = portalAction ? atividadesV2_portalWriteFindRequest_(ss, portalAction) : null;
    if (existingRequest) {
      return { _idempotentReplayResponse: atividadesV2_portalWriteReplayResponse_(existingRequest) };
    }
    var atividadesSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES);
    var apresentacoesSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.APRESENTACOES);
    atividadesV2_applyHeadersIfMissing_(atividadesSheet, ATIVIDADES_V2_SCHEMA.ATIVIDADES);
    atividadesV2_applyHeadersIfMissing_(apresentacoesSheet, ATIVIDADES_V2_SCHEMA.APRESENTACOES);

    var apresentacao = idAtividade
      ? atividadesV2_findApresentacaoV2_(apresentacoesSheet, idAtividade, idApresentacao)
      : atividadesV2_findApresentacaoV2ById_(apresentacoesSheet, idApresentacao);
    if (!apresentacao) throw new Error('APRESENTACAO_NAO_ENCONTRADA');
    idAtividade = idAtividade || String(apresentacao.ID_ATIVIDADE || '').trim();
    if (!atividadesV2_isCanonicalActivityId_(idAtividade)) throw new Error('ID_ATIVIDADE vinculado invalido ou ausente.');
    var atividade = atividadesV2_findAtividadeV2ById_(atividadesSheet, idAtividade);
    if (!atividade) throw new Error('ATIVIDADE_NAO_ENCONTRADA');
    atividadesV2_assertPodeRegistrarMaterial_(contexto, atividade, apresentacao);
    atividadesV2_assertMaterialStatusAllowsWrite_(contexto, apresentacao);
    var materialConfig = typeof atividadesV2_portalGetActivityConfig_ === 'function'
      ? atividadesV2_portalGetActivityConfig_(ss, atividade)
      : {};
    if (hasBase64 && atividades_normalizeTextUpper_(materialConfig.PERMITE_UPLOAD_MATERIAL || 'SIM') === 'NAO') {
      throw new Error('UPLOAD_MATERIAL_NAO_PERMITIDO: o modelo nao permite upload de slide/material.');
    }
    if (fileId && atividades_normalizeTextUpper_(materialConfig.PERMITE_LINK_MATERIAL || 'SIM') === 'NAO') {
      throw new Error('LINK_MATERIAL_NAO_PERMITIDO: o modelo nao permite arquivo informado por link/ID.');
    }

    var upload = atividadesV2_portalWriteStage_(trace, 'UPLOAD_ANEXO', function() {
      var folderInfo = atividadesV2_garantirPastaAtividade_(idAtividade, { spreadsheet: ss });
      var folder = DriveApp.getFolderById(folderInfo.folderId);
      var sourceFile = fileId ? DriveApp.getFileById(fileId) : null;
      var originalName = payload.nomeArquivoOriginal || payload.nomeArquivo || (sourceFile ? sourceFile.getName() : 'material.pdf');
      var mimeType = payload.mimeType || (sourceFile ? sourceFile.getMimeType() : '');
      atividadesV2_assertMaterialFileAllowed_(originalName, mimeType, materialConfig);
      atividadesV2_assertMaterialFileSizeAllowed_(sourceFile, payload, materialConfig);
      var nomeBase = atividadesV2_buildNomeMaterialApresentacao_(atividade, apresentacao, {
        name: originalName
      });
      var nameVersion = atividadesV2_resolveMaterialFileName_(folder, nomeBase);
      var targetFile = sourceFile
        ? (payload.moverArquivo === true
          ? atividadesV2_moveAndRenameDriveFile_(sourceFile, folder, nameVersion.nomeArquivo)
          : sourceFile.makeCopy(nameVersion.nomeArquivo, folder))
        : atividadesV2_createMaterialFileFromBase64_(folder, nameVersion.nomeArquivo, payload.conteudoBase64 || payload.base64, mimeType);
      return {
        mimeType: mimeType,
        nameVersion: nameVersion,
        targetFile: targetFile
      };
    });
    var mimeType = upload.mimeType;
    var nameVersion = upload.nameVersion;
    var targetFile = upload.targetFile;

    var now = new Date();
    var alreadyHadMaterial = !!String(apresentacao.ID_ARQUIVO_MATERIAL || apresentacao.LINK_MATERIAL_APRESENTACAO || '').trim();
    var actorIsPrivileged = ['SECRETARIO', 'DIRETORIA', 'ADMIN_TECNICO'].indexOf(
      atividades_normalizeTextUpper_(contexto && (contexto.perfil || contexto.perfilUsuario || contexto.role))
    ) >= 0;
    var statusMaterial = actorIsPrivileged && payload.statusMaterial
      ? String(payload.statusMaterial || '').trim().toUpperCase()
      : (alreadyHadMaterial ? 'REENVIADO' : 'RECEBIDO');
    if (['PENDENTE', 'RECEBIDO', 'REENVIADO', 'EM_ANALISE', 'AJUSTE_SOLICITADO', 'APROVADO', 'HISTORICO', 'DISPENSADO'].indexOf(statusMaterial) === -1) {
      throw new Error('STATUS_ENVIO_MATERIAL_INVALIDO: status de material invalido.');
    }
    var updates = {
      STATUS_ENVIO_MATERIAL: statusMaterial,
      DATA_RECEBIMENTO_MATERIAL: now,
      ID_ARQUIVO_MATERIAL: targetFile.getId(),
      NOME_ARQUIVO_MATERIAL: targetFile.getName(),
      LINK_MATERIAL_APRESENTACAO: targetFile.getUrl(),
      MIME_TYPE_MATERIAL: mimeType || targetFile.getMimeType(),
      VERSAO_MATERIAL: nameVersion.versao,
      ENVIADO_POR: atividadesV2_safeUserToken_(payload.enviadoPor || contexto.email || contexto.idPessoa || contexto.rga),
      RECEBIDO_POR: atividadesV2_safeUserToken_(contexto.email || contexto.idPessoa || contexto.rga),
      ATUALIZADO_POR: atividadesV2_safeUserToken_(contexto.email || contexto.idPessoa || contexto.rga),
      ATUALIZADO_EM: now
    };

    var arquivoRecord = atividadesV2_portalWriteStage_(trace, 'ESCRITA_PLANILHA_OFICIAL', function() {
      atividadesV2_updateRowByHeaders_(apresentacoesSheet, apresentacao._rowNumber, updates);
      return typeof atividadesV2_registrarSlideEmArquivos_ === 'function'
        ? atividadesV2_registrarSlideEmArquivos_(ss, atividade, apresentacao, targetFile, statusMaterial, contexto, nameVersion.versao)
        : null;
    });
    var response = {
      ok: true,
      modo: atividadesV2_resolveEnvironment_({}),
      idAtividade: idAtividade,
      idApresentacao: idApresentacao,
      idArquivoMaterial: targetFile.getId(),
      nomeArquivoMaterial: targetFile.getName(),
      linkMaterialApresentacao: targetFile.getUrl(),
      versaoMaterial: nameVersion.versao,
      tipoArquivoAtividade: 'SLIDE_APRESENTACAO',
      idArquivoAtividade: arquivoRecord && arquivoRecord.ID_ARQUIVO_ATIVIDADE || '',
      statusMaterial: statusMaterial,
      idPessoa: apresentacao.ID_PESSOA || atividade.ID_PESSOA_PRINCIPAL || '',
      email: apresentacao.EMAIL_MEMBRO || atividade.EMAIL_PESSOA_PRINCIPAL || '',
      rga: apresentacao.RGA || atividade.RGA_PESSOA_PRINCIPAL || ''
    };
    response.performance = atividadesV2_portalWriteSummary_(trace, 'REGISTRADO', '');
    response._auditWarnings = portalAction
      ? atividadesV2_portalWriteStage_(trace, 'ENFILEIRAMENTO_POS_PROCESSAMENTO', function() {
        return atividadesV2_portalActionSuccess_(ss, portalAction, response);
      })
      : [];
    return response;
  } catch (err) {
    try {
      atividadesV2_appendV2Log_(atividadesV2_getDatabaseSpreadsheet_(), {
        FLUXO: 'MATERIAIS_V2',
        ACAO: 'REGISTRAR_MATERIAL_APRESENTACAO',
        NIVEL: 'ERRO',
        STATUS: 'ERRO',
        ID_ATIVIDADE: idAtividade,
        MENSAGEM: 'Falha ao registrar material de apresentacao.',
        DETALHES_JSON: JSON.stringify({ erro: String(err && err.message || err).slice(0, 300) })
      });
    } catch (logErr) {}
    throw err;
  } finally {
    lock.releaseLock();
  }
}

function atividadesV2_diagnosticarMateriaisApresentacoesDev_() {
  var ss = atividadesV2_getDatabaseSpreadsheet_({ ambiente: 'DEV' });
  var atividadesSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES);
  var apresentacoesSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.APRESENTACOES);
  var atividades = atividadesV2_readSheetObjects_(atividadesSheet);
  var apresentacoes = atividadesV2_readSheetObjects_(apresentacoesSheet);
  var atividadesById = atividadesV2_indexByHeader_(atividades, 'ID_ATIVIDADE');
  var avisos = [];
  var inconsistencias = [];
  var stats = {
    atividadesLidas: atividades.length,
    apresentacoesLidas: apresentacoes.length,
    atividadesSemPasta: 0,
    apresentacoesComMaterialNovo: 0,
    apresentacoesComArquivoLegado: 0,
    apresentacoesMigraveis: 0,
    linksLegadosDePasta: 0
  };

  atividades.forEach(function(atividade) {
    if (atividades_normalizeTextUpper_(atividade.ATIVO || 'SIM') === 'NAO') return;
    if (!String(atividade.ID_PASTA_DRIVE || atividade.LINK_PASTA_DRIVE || '').trim()) stats.atividadesSemPasta++;
  });

  apresentacoes.forEach(function(apresentacao) {
    var idAtividade = String(apresentacao.ID_ATIVIDADE || '').trim();
    var hasNew = !!String(apresentacao.ID_ARQUIVO_MATERIAL || apresentacao.LINK_MATERIAL_APRESENTACAO || apresentacao.STATUS_ENVIO_MATERIAL || '').trim();
    var hasOld = !!String(apresentacao.LINK_ARQUIVO_DRIVE || apresentacao.STATUS_ENVIO_ARQUIVO || '').trim();
    var oldLinkType = atividadesV2_classifyDriveUrl_(apresentacao.LINK_ARQUIVO_DRIVE);
    if (hasNew) stats.apresentacoesComMaterialNovo++;
    if (hasOld) stats.apresentacoesComArquivoLegado++;
    if (!hasNew && hasOld && oldLinkType !== 'FOLDER') stats.apresentacoesMigraveis++;
    if (oldLinkType === 'FOLDER') stats.linksLegadosDePasta++;

    if (idAtividade && !atividadesById[idAtividade]) {
      inconsistencias.push({
        tipo: 'APRESENTACAO_SEM_ATIVIDADE',
        idAtividade: idAtividade,
        idApresentacao: String(apresentacao.ID_APRESENTACAO || '').trim(),
        linha: apresentacao._rowNumber
      });
    }
    if (oldLinkType === 'FOLDER') {
      inconsistencias.push({
        tipo: 'LINK_ARQUIVO_LEGADO_PARECE_PASTA',
        idAtividade: idAtividade,
        idApresentacao: String(apresentacao.ID_APRESENTACAO || '').trim(),
        linha: apresentacao._rowNumber
      });
    }
    if (hasNew && !String(apresentacao.ID_ARQUIVO_MATERIAL || '').trim() && atividadesV2_classifyDriveUrl_(apresentacao.LINK_MATERIAL_APRESENTACAO) === 'FILE') {
      avisos.push('Material sem ID_ARQUIVO_MATERIAL na linha ' + apresentacao._rowNumber + '.');
    }
  });

  return {
    ok: true,
    modo: atividadesV2_resolveEnvironment_({}),
    stats: stats,
    inconsistencias: inconsistencias,
    avisos: avisos
  };
}

function atividadesV2_migrarArquivosApresentacoesParaMateriaisDevDryRun_() {
  return atividadesV2_migrarArquivosApresentacoesParaMateriaisDev_({ dryRun: true });
}

/**
 * Preenche campos novos de material a partir dos campos legados de arquivo.
 * Nao apaga colunas antigas e nao move arquivos. Em dryRun apenas relata.
 */
function atividadesV2_migrarArquivosApresentacoesParaMateriaisDev_(options) {
  options = options || {};
  var dryRun = options.dryRun !== false;
  var lock = null;
  if (!dryRun) {
    lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) throw new Error('LOCK_INDISPONIVEL: nao foi possivel migrar materiais agora.');
  }

  try {
    var ss = atividadesV2_getDatabaseSpreadsheet_({ ambiente: 'DEV' });
    var sheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.APRESENTACOES);
    if (!dryRun) atividadesV2_applyHeadersIfMissing_(sheet, ATIVIDADES_V2_SCHEMA.APRESENTACOES);
    var headers = atividadesV2_getSheetHeaders_(sheet);
    var headerMap = atividadesV2_simpleHeaderMap_(headers);
    var lastRow = sheet.getLastRow();
    var lastColumn = Math.max(sheet.getLastColumn(), 1);
    var rows = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues() : [];
    var report = {
      ok: true,
      modo: atividadesV2_resolveEnvironment_({}),
      dryRun: dryRun,
      totalLidas: rows.length,
      totalMigraveis: 0,
      totalAtualizadas: 0,
      ignoradas: 0,
      exemplos: [],
      avisos: [],
      erros: []
    };

    ATIVIDADES_V2_MATERIAL_HEADERS.forEach(function(header) {
      if (!headerMap[header]) report.avisos.push('Cabecalho novo ausente: ' + header + (dryRun ? ' (dryRun nao altera cabecalhos).' : ''));
    });

    var changed = false;
    rows.forEach(function(row, rowIndex) {
      var record = atividadesV2_rowToObject_(headers, row, rowIndex + 2);
      var migration = atividadesV2_buildMaterialMigrationFromLegacy_(record);
      if (!migration.migravel) {
        report.ignoradas++;
        if (migration.aviso) report.avisos.push(migration.aviso);
        return;
      }

      report.totalMigraveis++;
      if (report.exemplos.length < 5) report.exemplos.push(migration.exemplo);
      if (dryRun) return;

      Object.keys(migration.values).forEach(function(header) {
        var col = headerMap[header];
        if (!col) return;
        var value = migration.values[header];
        if (String(row[col - 1] || '') !== String(value || '')) {
          row[col - 1] = value;
          changed = true;
        }
      });
      report.totalAtualizadas++;
    });

    if (!dryRun && changed && rows.length) {
      sheet.getRange(2, 1, rows.length, lastColumn).setValues(rows);
      atividadesV2_appendV2Log_(ss, {
        FLUXO: 'MATERIAIS_V2',
        ACAO: 'MIGRAR_ARQUIVOS_PARA_MATERIAIS',
        NIVEL: 'INFO',
        STATUS: 'OK',
        MENSAGEM: 'Campos de material preenchidos a partir de campos legados de arquivo.',
        DETALHES_JSON: JSON.stringify({ totalAtualizadas: report.totalAtualizadas })
      });
      if (typeof atividadesV2_limparCachePortalDev_ === 'function') atividadesV2_limparCachePortalDev_();
    }

    return report;
  } finally {
    if (lock) lock.releaseLock();
  }
}

function atividadesV2_buildMaterialMigrationFromLegacy_(record) {
  var hasNew = !!String(record.ID_ARQUIVO_MATERIAL || record.LINK_MATERIAL_APRESENTACAO || record.STATUS_ENVIO_MATERIAL || '').trim();
  var oldLink = String(record.LINK_ARQUIVO_DRIVE || '').trim();
  var oldStatus = String(record.STATUS_ENVIO_ARQUIVO || '').trim();
  var linkType = atividadesV2_classifyDriveUrl_(oldLink);
  if (hasNew) return { migravel: false };
  if (!oldLink && !oldStatus) return { migravel: false };
  if (linkType === 'FOLDER') {
    return {
      migravel: false,
      aviso: 'Linha ' + record._rowNumber + ': LINK_ARQUIVO_DRIVE parece pasta; nao sera migrado como material.'
    };
  }

  var values = {};
  if (oldStatus) values.STATUS_ENVIO_MATERIAL = oldStatus;
  if (record.DATA_SOLICITACAO_ARQUIVO) values.DATA_SOLICITACAO_MATERIAL = record.DATA_SOLICITACAO_ARQUIVO;
  if (record.DATA_COBRANCA_ARQUIVO) values.DATA_COBRANCA_MATERIAL = record.DATA_COBRANCA_ARQUIVO;
  if (record.QTD_COBRANCAS_ARQUIVO) values.QTD_COBRANCAS_MATERIAL = record.QTD_COBRANCAS_ARQUIVO;
  if (record.DATA_RECEBIMENTO_ARQUIVO) values.DATA_RECEBIMENTO_MATERIAL = record.DATA_RECEBIMENTO_ARQUIVO;
  if (oldLink && linkType !== 'FOLDER') values.LINK_MATERIAL_APRESENTACAO = oldLink;
  var driveId = atividadesV2_extractDriveIdFromUrl_(oldLink);
  if (driveId && linkType !== 'FOLDER') values.ID_ARQUIVO_MATERIAL = driveId;
  if (oldLink && linkType === 'UNKNOWN') {
    values.OBSERVACOES = atividadesV2_joinObservacoes_(
      record.OBSERVACOES,
      'Migracao V2: link legado de arquivo migrado sem confirmar tipo Drive.'
    );
  }

  return {
    migravel: Object.keys(values).length > 0,
    values: values,
    exemplo: {
      linha: record._rowNumber,
      idAtividade: String(record.ID_ATIVIDADE || '').trim(),
      idApresentacao: String(record.ID_APRESENTACAO || '').trim(),
      campos: Object.keys(values).filter(function(header) { return header !== 'OBSERVACOES'; })
    }
  };
}

function atividadesV2_getDriveRootFolderId_(options) {
  options = options || {};
  var fromOptions = String(options.rootFolderId || '').trim();
  if (fromOptions) return fromOptions;
  try {
    return String(PropertiesService.getScriptProperties().getProperty(ATIVIDADES_V2_DRIVE_ROOT_FOLDER_PROP) || '').trim();
  } catch (err) {
    return '';
  }
}

function atividadesV2_findAtividadeV2ById_(sheet, idAtividade) {
  var records = atividadesV2_readSheetObjects_(sheet);
  var id = String(idAtividade || '').trim();
  for (var i = 0; i < records.length; i++) {
    if (String(records[i].ID_ATIVIDADE || '').trim() === id) return records[i];
  }
  return null;
}

function atividadesV2_findApresentacaoV2_(sheet, idAtividade, idApresentacao) {
  var records = atividadesV2_readSheetObjects_(sheet);
  var wantedAtividade = String(idAtividade || '').trim();
  var wantedApresentacao = String(idApresentacao || '').trim();
  for (var i = 0; i < records.length; i++) {
    if (String(records[i].ID_ATIVIDADE || '').trim() === wantedAtividade &&
        String(records[i].ID_APRESENTACAO || '').trim() === wantedApresentacao) {
      return records[i];
    }
  }
  return null;
}

function atividadesV2_updateRowByHeaders_(sheet, rowNumber, updates) {
  atividadesV2_canonicalAgendaAssertLegacySheetFieldsWriteAllowed_(sheet, updates || {});
  var headers = atividadesV2_getSheetHeaders_(sheet);
  var headerMap = atividadesV2_simpleHeaderMap_(headers);
  Object.keys(updates || {}).forEach(function(header) {
    var col = headerMap[header];
    if (!col) return;
    atividadesV2_writeCellIfChanged_(sheet, rowNumber, col, updates[header]);
  });
}

function atividadesV2_rowToObject_(headers, row, rowNumber) {
  var obj = { _rowNumber: rowNumber };
  (headers || []).forEach(function(header, index) {
    var key = String(header || '').trim();
    if (key && !Object.prototype.hasOwnProperty.call(obj, key)) obj[key] = row[index];
  });
  return obj;
}

function atividadesV2_indexByHeader_(records, header) {
  var map = {};
  (records || []).forEach(function(record) {
    var key = String(record && record[header] || '').trim();
    if (key && !map[key]) map[key] = record;
  });
  return map;
}

function atividadesV2_assertPodeRegistrarMaterial_(contexto, atividade, apresentacao) {
  var perfil = atividades_normalizeTextUpper_(contexto && (contexto.perfil || contexto.perfilUsuario || contexto.role));
  var perfisOperacionais = ['SECRETARIO', 'DIRETORIA', 'ADMIN_TECNICO'];
  if (perfisOperacionais.indexOf(perfil) >= 0) return true;
  if (typeof atividadesV2_portalPresentationBelongsToContext_ === 'function' &&
      atividadesV2_portalPresentationBelongsToContext_(atividade || {}, apresentacao || {}, atividades_normalizePortalContext_(contexto || {}))) {
    return true;
  }
  throw new Error('PERMISSAO_NEGADA: perfil sem permissao para registrar material.');
}

function atividadesV2_assertMaterialStatusAllowsWrite_(contexto, apresentacao) {
  if (atividades_isTruthySim_(apresentacao && apresentacao.BLOQUEADO_PARA_EDICAO)) {
    throw new Error('APRESENTACAO_BLOQUEADA: apresentacao bloqueada para edicao.');
  }
  var perfil = atividades_normalizeTextUpper_(contexto && (contexto.perfil || contexto.perfilUsuario || contexto.role));
  if (['SECRETARIO', 'DIRETORIA', 'ADMIN_TECNICO'].indexOf(perfil) >= 0) return true;
  var status = atividades_normalizeTextUpper_(apresentacao && apresentacao.STATUS_ENVIO_MATERIAL);
  if (['PENDENTE', 'AJUSTE_SOLICITADO'].indexOf(status || 'PENDENTE') === -1) {
    throw new Error('MATERIAL_FECHADO: material so pode ser enviado pelo membro quando estiver pendente ou com ajuste solicitado.');
  }
}

function atividadesV2_assertMaterialFileAllowed_(fileName, mimeType, config) {
  var name = String(fileName || '').trim();
  var ext = atividadesV2_getFileExtension_(name);
  var configured = String(config && config.TIPOS_ARQUIVO_MATERIAL_PERMITIDOS || 'PDF,PPT,PPTX,ODP');
  var allowedExt = configured.split(',').map(function(value) {
    return '.' + String(value || '').trim().toLowerCase().replace(/^\./, '');
  }).filter(function(value) { return value !== '.'; });
  var allowedMime = [
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.presentation'
  ];
  if (allowedExt.indexOf(ext) === -1 && allowedMime.indexOf(String(mimeType || '').trim()) === -1) {
    throw new Error('TIPO_ARQUIVO_INVALIDO: envie PDF, PPT, PPTX ou ODP.');
  }
}

function atividadesV2_assertMaterialFileSizeAllowed_(sourceFile, payload, config) {
  var configuredMb = Number(config && config.TAMANHO_MAX_MATERIAL_MB || 0);
  var maxBytes = configuredMb > 0 ? configuredMb * 1024 * 1024 : ATIVIDADES_V2_MATERIAL_MAX_BYTES_DEFAULT;
  var size = sourceFile
    ? sourceFile.getSize()
    : Math.floor(String(payload && (payload.conteudoBase64 || payload.base64) || '').replace(/^data:[^;]+;base64,/, '').length * 0.75);
  if (size > maxBytes) {
    throw new Error('ARQUIVO_MUITO_GRANDE: tamanho maximo permitido excedido.');
  }
}

function atividadesV2_createMaterialFileFromBase64_(folder, fileName, base64, mimeType) {
  var clean = String(base64 || '').replace(/^data:[^;]+;base64,/, '');
  var bytes = Utilities.base64Decode(clean);
  var blob = Utilities.newBlob(bytes, mimeType || MimeType.PDF, fileName);
  return folder.createFile(blob).setName(fileName);
}

function atividadesV2_moveAndRenameDriveFile_(file, folder, nomeArquivo) {
  file.setName(nomeArquivo);
  file.moveTo(folder);
  return file;
}

function atividadesV2_resolveMaterialFileName_(folder, nomeBase) {
  var name = atividadesV2_sanitizeDriveFileName_(nomeBase || 'material');
  var ext = atividadesV2_getFileExtension_(name);
  var stem = ext ? name.slice(0, -ext.length) : name;
  var candidate = name;
  var version = 1;
  while (folder.getFilesByName(candidate).hasNext()) {
    version++;
    candidate = stem + ' - v' + atividadesV2_padNumber_(version, 2) + ext;
  }
  return {
    nomeArquivo: candidate,
    versao: 'v' + atividadesV2_padNumber_(version, 2)
  };
}

function atividadesV2_buildNomePastaAtividade_(atividade) {
  var id = String(atividade && atividade.ID_ATIVIDADE || 'ATV').trim();
  var titulo = atividades_sanitizePortalText_(atividade && (atividade.TITULO_PUBLICO || atividade.TITULO) || 'Atividade GEAPA', 90);
  return atividadesV2_sanitizeDriveFileName_(id + ' - ' + titulo).slice(0, 180);
}

function atividadesV2_sanitizeDriveFileName_(value) {
  return String(value || '')
    .replace(/[\\/:*?"<>|#%{}~&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'material';
}

function atividadesV2_getFileExtension_(name) {
  var clean = String(name || '').trim();
  var match = clean.match(/(\.[A-Za-z0-9]{1,12})$/);
  return match ? match[1].toLowerCase() : '';
}

function atividadesV2_buildDriveFolderUrl_(folderId) {
  return folderId ? 'https://drive.google.com/drive/folders/' + encodeURIComponent(folderId) : '';
}

function atividadesV2_extractDriveIdFromUrl_(value) {
  var text = String(value || '').trim();
  if (!text) return '';
  var patterns = [
    /\/(?:file\/d|folders)\/([A-Za-z0-9_-]{10,})/,
    /[?&]id=([A-Za-z0-9_-]{10,})/,
    /^([A-Za-z0-9_-]{20,})$/
  ];
  for (var i = 0; i < patterns.length; i++) {
    var match = text.match(patterns[i]);
    if (match) return match[1];
  }
  return '';
}

function atividadesV2_classifyDriveUrl_(value) {
  var text = String(value || '').trim();
  if (!text) return 'EMPTY';
  if (/\/folders\//.test(text)) return 'FOLDER';
  if (/\/file\/d\//.test(text)) return 'FILE';
  if (/[?&]id=/.test(text) || /^https:\/\/drive\.google\.com\//.test(text)) return 'UNKNOWN';
  return 'UNKNOWN';
}

function atividadesV2_safeUserToken_(value) {
  return String(value || '').trim().slice(0, 120);
}

function atividadesV2_joinObservacoes_(current, addition) {
  var left = String(current || '').trim();
  var right = String(addition || '').trim();
  if (!left) return right;
  if (!right) return left;
  return left + ' | ' + right;
}
