/**
 * Repopulacao historica de Atividades_Arquivos na base V2 do ambiente resolvido.
 *
 * A rotina apenas cataloga metadados. Nenhum arquivo e movido, renomeado ou
 * apagado no Drive, e nenhuma aba operacional legada e alterada.
 */

var ATIVIDADES_V2_HISTORICO_ACTOR_ = 'MIGRACAO_HISTORICA_ATIVIDADES_ARQUIVOS';
var ATIVIDADES_V2_HISTORICO_MAX_EXEMPLOS_ = 20;
var ATIVIDADES_V2_HISTORICO_MAX_AVISOS_ = 100;

function atividades_repopularAtividadesArquivosHistorico_(options) {
  options = options || {};
  var dryRun = options.dryRun !== false;
  var startedAt = new Date();
  var lock = null;
  var execution;

  if (!dryRun) {
    lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) {
      return atividadesV2_historicoErrorReport_('LOCK_INDISPONIVEL', 'Nao foi possivel obter lock para repopular Atividades_Arquivos.', startedAt, dryRun);
    }
  }

  try {
    execution = atividadesV2_historicoBuildAndApplyPlan_(dryRun, startedAt);
  } catch (err) {
    execution = atividadesV2_historicoErrorReport_(
      'ERRO_REPOPULAR_ATIVIDADES_ARQUIVOS',
      atividadesV2_errorMessage_(err),
      startedAt,
      dryRun
    );
  } finally {
    if (lock) lock.releaseLock();
  }

  if (!dryRun && execution && execution.planoGerado) {
    atividadesV2_historicoPostProcess_(execution);
  }

  execution.tempoTotalMs = new Date().getTime() - startedAt.getTime();
  execution.ok = (execution.erros || []).length === 0;
  Logger.log('GEAPA-ATIVIDADES-V2 arquivos historicos: ' + atividadesV2_safeLogData_({
    dryRun: execution.dryRun,
    ok: execution.ok,
    atividades: execution.totalAtividadesAvaliadas,
    apresentacoes: execution.totalApresentacoesAvaliadas,
    slides: execution.totalSlidesCriados || execution.totalSlidesQueSeriamCriados,
    fotos: execution.totalFotosCriadas || execution.totalFotosQueSeriamCriadas,
    dispensas: execution.totalDispensasCriadas || execution.totalDispensasHistoricasQueSeriamCriadas,
    duplicidades: execution.totalDuplicidadesIgnoradas,
    erros: (execution.erros || []).length
  }));
  return execution;
}

function atividadesV2_historicoBuildAndApplyPlan_(dryRun, startedAt) {
  var ss = atividadesV2_getDatabaseSpreadsheet_({ ambiente: 'DEV' });
  var atividadesSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES);
  var apresentacoesSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.APRESENTACOES);
  var arquivosSheet = ss.getSheetByName(ATIVIDADES_V2_SHEETS.ARQUIVOS);
  if (!arquivosSheet && dryRun) {
    return atividadesV2_historicoErrorReport_(
      'ABA_ATIVIDADES_ARQUIVOS_AUSENTE',
      'Aba Atividades_Arquivos ausente. Execute atividadesV2_setupDatabaseDev() antes do dry-run.',
      startedAt,
      dryRun
    );
  }
  if (!arquivosSheet) arquivosSheet = atividadesV2_getArquivosSheetForWrite_(ss);
  if (!dryRun) atividadesV2_applyHeadersIfMissing_(arquivosSheet, ATIVIDADES_V2_SCHEMA.ARQUIVOS);

  var atividades = atividadesV2_readSheetObjects_(atividadesSheet);
  var apresentacoes = atividadesV2_readSheetObjects_(apresentacoesSheet);
  var arquivos = atividadesV2_readSheetObjects_(arquivosSheet);
  var atividadesById = atividadesV2_indexByHeader_(atividades, 'ID_ATIVIDADE');
  var duplicateIndex = atividadesV2_historicoBuildDuplicateIndex_(arquivos);
  var report = atividadesV2_historicoNewReport_(dryRun, startedAt);
  report._cacheTargets = [];
  report._cacheTargetIndex = {};
  var plan = [];
  var activitySeen = {};
  var folderCache = {};
  var folderMetricsSeen = {};

  apresentacoes = apresentacoes.filter(function(apresentacao) {
    return atividades_normalizeTextUpper_(apresentacao.ATIVO || 'SIM') !== 'NAO';
  }).sort(function(a, b) {
    var atividadeA = atividadesById[String(a.ID_ATIVIDADE || '').trim()] || {};
    var atividadeB = atividadesById[String(b.ID_ATIVIDADE || '').trim()] || {};
    var prioridadeA = atividades_normalizeTextUpper_(atividadeA.SUBTIPO_ATIVIDADE) === 'APRESENTACAO_MEMBRO' ? 0 : 1;
    var prioridadeB = atividades_normalizeTextUpper_(atividadeB.SUBTIPO_ATIVIDADE) === 'APRESENTACAO_MEMBRO' ? 0 : 1;
    return prioridadeA - prioridadeB || Number(a._rowNumber || 0) - Number(b._rowNumber || 0);
  });

  apresentacoes.forEach(function(apresentacao) {
    var idAtividade = String(apresentacao.ID_ATIVIDADE || '').trim();
    var idApresentacao = String(apresentacao.ID_APRESENTACAO || '').trim();
    var atividade = atividadesById[idAtividade];
    if (!idAtividade || !idApresentacao || !atividade) {
      atividadesV2_historicoAddError_(report, 'Apresentacao sem atividade valida: linha ' + String(apresentacao._rowNumber || '') + '.');
      return;
    }
    if (atividades_normalizeTextUpper_(atividade.ATIVO || 'SIM') === 'NAO') return;

    report.totalApresentacoesAvaliadas++;
    if (!activitySeen[idAtividade]) {
      activitySeen[idAtividade] = true;
      report.totalAtividadesAvaliadas++;
    }

    var blocked = atividadesV2_historicoIsBlocked_(atividade, apresentacao);
    var hasExplicitHistoricalMaterial = atividadesV2_historicoHasExplicitMaterial_(apresentacao);
    if (!blocked || hasExplicitHistoricalMaterial) {
      atividadesV2_historicoPlanSlide_(plan, report, duplicateIndex, atividade, apresentacao);
    }

    var isMemberPresentation = atividades_normalizeTextUpper_(atividade.SUBTIPO_ATIVIDADE) === 'APRESENTACAO_MEMBRO';
    if (blocked || !isMemberPresentation) return;

    var folderResult = atividadesV2_historicoGetFolderResult_(atividade, folderCache, report);
    if (!folderMetricsSeen[idAtividade]) {
      folderMetricsSeen[idAtividade] = true;
      if (folderResult.folderId) report.totalComPastaDrive++;
      else report.totalSemPastaDrive++;
      if (folderResult.inaccessible) report.totalPastasInacessiveis++;
      report.totalCasosAmbiguos += folderResult.ambiguous.length;
      if (folderResult.ambiguous.length) {
        atividadesV2_historicoAddWarning_(report, 'Imagens ambiguas exigem revisao manual na atividade ' + idAtividade + '.');
        folderResult.ambiguous.forEach(function(file) {
          atividadesV2_historicoAddExample_(report, 'REVISAR', atividade, apresentacao, ATIVIDADES_V2_TIPO_ARQUIVO_FOTO_, 'AMBIGUO', file.name);
        });
      }
    }

    folderResult.photos.forEach(function(photo) {
      atividadesV2_historicoPlanPhoto_(plan, report, duplicateIndex, atividade, apresentacao, photo);
    });

    var historical = atividadesV2_historicoIsRealized_(atividade, apresentacao);
    var photoPairKey = atividadesV2_historicoPairKey_(idAtividade, idApresentacao, ATIVIDADES_V2_TIPO_ARQUIVO_FOTO_);
    var hasResolvedPhoto = !!duplicateIndex.resolvedPhoto[photoPairKey];
    var canDispense = historical && !hasResolvedPhoto && !folderResult.inaccessible &&
      folderResult.photos.length === 0 && folderResult.ambiguous.length === 0;
    if (canDispense) {
      atividadesV2_historicoPlanDispense_(plan, report, duplicateIndex, atividade, apresentacao);
    }
  });

  report.totalSlidesQueSeriamCriados = report.totalSlidesPlanejados;
  report.totalFotosQueSeriamCriadas = report.totalFotosPlanejadas;
  report.totalDispensasHistoricasQueSeriamCriadas = report.totalDispensasPlanejadas;
  report.totalLinhasQueSeriamCriadas = plan.length;
  report.planoGerado = true;

  if (!dryRun && plan.length) {
    var headers = atividadesV2_getSheetHeaders_(arquivosSheet).filter(function(header) { return !!header; });
    atividadesV2_appendObjects_(arquivosSheet, headers, plan);
    report.totalSlidesCriados = report.totalSlidesPlanejados;
    report.totalFotosCriadas = report.totalFotosPlanejadas;
    report.totalDispensasCriadas = report.totalDispensasPlanejadas;
    report.totalLinhasCriadas = plan.length;
    report.escritaRealizada = true;
  }

  if (!dryRun) {
    try {
      atividadesV2_appendV2Log_(ss, {
        FLUXO: 'MIGRACAO_ARQUIVOS_HISTORICOS_V2',
        ACAO: 'REPOPULAR_ATIVIDADES_ARQUIVOS_HISTORICO',
        NIVEL: report.erros.length ? 'WARN' : 'INFO',
        STATUS: report.erros.length ? 'PARCIAL' : 'OK',
        MENSAGEM: 'Catalogacao historica de arquivos concluida na base V2 do ambiente resolvido.',
        DETALHES_JSON: atividadesV2_safeLogData_({
          atividades: report.totalAtividadesAvaliadas,
          apresentacoes: report.totalApresentacoesAvaliadas,
          slidesCriados: report.totalSlidesCriados,
          fotosCriadas: report.totalFotosCriadas,
          dispensasCriadas: report.totalDispensasCriadas,
          duplicidades: report.totalDuplicidadesIgnoradas,
          pastasInacessiveis: report.totalPastasInacessiveis,
          ambiguos: report.totalCasosAmbiguos,
          erros: report.erros.length
        })
      });
    } catch (errLog) {
      atividadesV2_historicoAddError_(report, 'Catalogacao concluida, mas o resumo nao foi gravado em Atividades_Log: ' + atividadesV2_errorMessage_(errLog));
    }
  }

  if (dryRun) {
    delete report._cacheTargets;
    delete report._cacheTargetIndex;
  }
  return report;
}

function atividadesV2_historicoPlanSlide_(plan, report, duplicateIndex, atividade, apresentacao) {
  var legacyId = String(apresentacao.ID_ARQUIVO_MATERIAL || '').trim();
  var legacyLink = String(apresentacao.LINK_MATERIAL_APRESENTACAO || '').trim();
  var legacyName = String(apresentacao.NOME_ARQUIVO_MATERIAL || '').trim();
  if (!legacyId && !legacyLink && !legacyName) return;

  if (atividadesV2_classifyDriveUrl_(legacyLink) === 'FOLDER') {
    report.totalCasosAmbiguos++;
    atividadesV2_historicoAddWarning_(report, 'Material ignorado porque o link aponta para pasta: ' + String(apresentacao.ID_APRESENTACAO || '') + '.');
    atividadesV2_historicoAddExample_(report, 'AMBIGUO', atividade, apresentacao, 'SLIDE_APRESENTACAO', 'LINK_DE_PASTA');
    return;
  }

  var driveId = atividadesV2_historicoNormalizeDriveId_(legacyId) || atividadesV2_extractDriveIdFromUrl_(legacyLink);
  var fileMeta = atividadesV2_historicoReadDriveFileMeta_(driveId);
  if (fileMeta.error) {
    atividadesV2_historicoAddWarning_(report, 'Arquivo de material inacessivel no Drive: ' + String(apresentacao.ID_APRESENTACAO || '') + '. Metadados legados serao preservados.');
  }
  var name = fileMeta.name || legacyName || 'Material historico';
  var link = fileMeta.link || legacyLink || atividadesV2_historicoBuildDriveFileUrl_(driveId);
  if (atividadesV2_historicoIsDuplicate_(duplicateIndex, atividade.ID_ATIVIDADE, apresentacao.ID_APRESENTACAO, ATIVIDADES_V2_TIPO_ARQUIVO_SLIDE_, driveId, link, name)) {
    report.totalDuplicidadesIgnoradas++;
    return;
  }

  var now = new Date();
  var row = {
    ID_ARQUIVO_ATIVIDADE: atividadesV2_historicoBuildId_(atividade.ID_ATIVIDADE, apresentacao.ID_APRESENTACAO, ATIVIDADES_V2_TIPO_ARQUIVO_SLIDE_, driveId || link || name),
    ID_ATIVIDADE: atividade.ID_ATIVIDADE,
    ID_APRESENTACAO: apresentacao.ID_APRESENTACAO,
    TIPO_ARQUIVO_ATIVIDADE: ATIVIDADES_V2_TIPO_ARQUIVO_SLIDE_,
    ESCOPO_ARQUIVO: 'APRESENTACAO',
    STATUS_ARQUIVO: atividadesV2_historicoResolveSlideStatus_(atividade, apresentacao),
    ID_PESSOA_RESPONSAVEL: apresentacao.ID_PESSOA || atividade.ID_PESSOA_PRINCIPAL || '',
    NOME_RESPONSAVEL: apresentacao.NOME_MEMBRO || atividade.NOME_PESSOA_PRINCIPAL_PUBLICO || '',
    PERFIL_RESPONSAVEL: 'MEMBRO',
    ID_ARQUIVO_DRIVE: driveId,
    NOME_ARQUIVO: name,
    LINK_ARQUIVO: link,
    MIME_TYPE: fileMeta.mimeType || apresentacao.MIME_TYPE_MATERIAL || '',
    TAMANHO_BYTES: fileMeta.size || '',
    VERSAO: apresentacao.VERSAO_MATERIAL || 'v01',
    ENVIADO_POR: apresentacao.ENVIADO_POR || '',
    ENVIADO_EM: apresentacao.DATA_ENVIO_MATERIAL || apresentacao.DATA_RECEBIMENTO_MATERIAL || fileMeta.createdAt || '',
    RECEBIDO_POR: apresentacao.RECEBIDO_POR || '',
    RECEBIDO_EM: apresentacao.DATA_RECEBIMENTO_MATERIAL || apresentacao.DATA_RECEBIMENTO_ARQUIVO || fileMeta.createdAt || '',
    OBSERVACOES: 'Material historico migrado de Atividades_Apresentacoes.',
    PUBLICAR_NO_PORTAL: 'NAO',
    ATIVO: 'SIM',
    CRIADO_POR: ATIVIDADES_V2_HISTORICO_ACTOR_,
    CRIADO_EM: fileMeta.createdAt || now,
    ATUALIZADO_POR: ATIVIDADES_V2_HISTORICO_ACTOR_,
    ATUALIZADO_EM: fileMeta.updatedAt || now
  };
  plan.push(row);
  report.totalSlidesPlanejados++;
  atividadesV2_historicoAddCacheTarget_(report, atividade, apresentacao);
  atividadesV2_historicoRegisterDuplicate_(duplicateIndex, row);
  atividadesV2_historicoAddExample_(report, 'CRIAR', atividade, apresentacao, row.TIPO_ARQUIVO_ATIVIDADE, row.STATUS_ARQUIVO, name);
}

function atividadesV2_historicoPlanPhoto_(plan, report, duplicateIndex, atividade, apresentacao, photo) {
  if (atividadesV2_historicoIsDuplicate_(duplicateIndex, atividade.ID_ATIVIDADE, apresentacao.ID_APRESENTACAO, ATIVIDADES_V2_TIPO_ARQUIVO_FOTO_, photo.id, photo.link, photo.name)) {
    report.totalDuplicidadesIgnoradas++;
    return;
  }
  var now = new Date();
  var row = {
    ID_ARQUIVO_ATIVIDADE: atividadesV2_historicoBuildId_(atividade.ID_ATIVIDADE, apresentacao.ID_APRESENTACAO, ATIVIDADES_V2_TIPO_ARQUIVO_FOTO_, photo.id || photo.link || photo.name),
    ID_ATIVIDADE: atividade.ID_ATIVIDADE,
    ID_APRESENTACAO: apresentacao.ID_APRESENTACAO,
    TIPO_ARQUIVO_ATIVIDADE: ATIVIDADES_V2_TIPO_ARQUIVO_FOTO_,
    ESCOPO_ARQUIVO: 'REUNIAO',
    STATUS_ARQUIVO: 'HISTORICO',
    ID_PESSOA_RESPONSAVEL: apresentacao.ID_PESSOA || atividade.ID_PESSOA_PRINCIPAL || '',
    NOME_RESPONSAVEL: apresentacao.NOME_MEMBRO || atividade.NOME_PESSOA_PRINCIPAL_PUBLICO || '',
    PERFIL_RESPONSAVEL: 'MEMBRO',
    ID_ARQUIVO_DRIVE: photo.id,
    NOME_ARQUIVO: photo.name,
    LINK_ARQUIVO: photo.link,
    MIME_TYPE: photo.mimeType,
    TAMANHO_BYTES: photo.size,
    VERSAO: 'v01',
    ENVIADO_POR: ATIVIDADES_V2_HISTORICO_ACTOR_,
    ENVIADO_EM: photo.createdAt || '',
    RECEBIDO_POR: ATIVIDADES_V2_HISTORICO_ACTOR_,
    RECEBIDO_EM: photo.createdAt || '',
    OBSERVACOES: 'Foto historica localizada na pasta da atividade.',
    PUBLICAR_NO_PORTAL: 'NAO',
    ATIVO: 'SIM',
    CRIADO_POR: ATIVIDADES_V2_HISTORICO_ACTOR_,
    CRIADO_EM: photo.createdAt || now,
    ATUALIZADO_POR: ATIVIDADES_V2_HISTORICO_ACTOR_,
    ATUALIZADO_EM: photo.updatedAt || now
  };
  plan.push(row);
  report.totalFotosPlanejadas++;
  atividadesV2_historicoAddCacheTarget_(report, atividade, apresentacao);
  atividadesV2_historicoRegisterDuplicate_(duplicateIndex, row);
  atividadesV2_historicoAddExample_(report, 'CRIAR', atividade, apresentacao, row.TIPO_ARQUIVO_ATIVIDADE, row.STATUS_ARQUIVO, photo.name);
}

function atividadesV2_historicoPlanDispense_(plan, report, duplicateIndex, atividade, apresentacao) {
  var pairKey = atividadesV2_historicoPairKey_(atividade.ID_ATIVIDADE, apresentacao.ID_APRESENTACAO, ATIVIDADES_V2_TIPO_ARQUIVO_FOTO_);
  if (duplicateIndex.resolvedPhoto[pairKey]) {
    report.totalDuplicidadesIgnoradas++;
    return;
  }
  var now = new Date();
  var row = {
    ID_ARQUIVO_ATIVIDADE: atividadesV2_historicoBuildId_(atividade.ID_ATIVIDADE, apresentacao.ID_APRESENTACAO, ATIVIDADES_V2_TIPO_ARQUIVO_FOTO_, 'DISPENSA_HISTORICA'),
    ID_ATIVIDADE: atividade.ID_ATIVIDADE,
    ID_APRESENTACAO: apresentacao.ID_APRESENTACAO,
    TIPO_ARQUIVO_ATIVIDADE: ATIVIDADES_V2_TIPO_ARQUIVO_FOTO_,
    ESCOPO_ARQUIVO: 'REUNIAO',
    STATUS_ARQUIVO: 'DISPENSADO',
    ID_PESSOA_RESPONSAVEL: apresentacao.ID_PESSOA || atividade.ID_PESSOA_PRINCIPAL || '',
    NOME_RESPONSAVEL: apresentacao.NOME_MEMBRO || atividade.NOME_PESSOA_PRINCIPAL_PUBLICO || '',
    PERFIL_RESPONSAVEL: 'SISTEMA',
    VERSAO: 'v01',
    OBSERVACOES: 'Dispensa historica: foto nao localizada na pasta durante migracao; controle de foto implantado posteriormente.',
    PUBLICAR_NO_PORTAL: 'NAO',
    ATIVO: 'SIM',
    CRIADO_POR: ATIVIDADES_V2_HISTORICO_ACTOR_,
    CRIADO_EM: now,
    ATUALIZADO_POR: ATIVIDADES_V2_HISTORICO_ACTOR_,
    ATUALIZADO_EM: now
  };
  plan.push(row);
  report.totalDispensasPlanejadas++;
  atividadesV2_historicoAddCacheTarget_(report, atividade, apresentacao);
  atividadesV2_historicoRegisterDuplicate_(duplicateIndex, row);
  atividadesV2_historicoAddExample_(report, 'CRIAR', atividade, apresentacao, row.TIPO_ARQUIVO_ATIVIDADE, row.STATUS_ARQUIVO);
}

function atividadesV2_historicoGetFolderResult_(atividade, cache, report) {
  var folderId = atividadesV2_historicoNormalizeDriveId_(atividade.ID_PASTA_DRIVE) || atividadesV2_extractDriveIdFromUrl_(atividade.LINK_PASTA_DRIVE);
  if (!folderId) return { folderId: '', inaccessible: false, photos: [], ambiguous: [] };
  if (cache[folderId]) return cache[folderId];

  var result = { folderId: folderId, inaccessible: false, photos: [], ambiguous: [] };
  var filesById = {};
  try {
    var folder = DriveApp.getFolderById(folderId);
    atividadesV2_historicoCollectFolderFiles_(folder, false, result, filesById);
    var subfolders = folder.getFolders();
    while (subfolders.hasNext()) {
      var subfolder = subfolders.next();
      if (atividadesV2_historicoIsPhotoFolderName_(subfolder.getName())) {
        atividadesV2_historicoCollectFolderFiles_(subfolder, true, result, filesById);
      }
    }
  } catch (err) {
    result.inaccessible = true;
    atividadesV2_historicoAddError_(report, 'Pasta Drive inacessivel para ' + String(atividade.ID_ATIVIDADE || '') + ': ' + atividadesV2_errorMessage_(err).slice(0, 180));
  }
  cache[folderId] = result;
  return result;
}

function atividadesV2_historicoCollectFolderFiles_(folder, isPhotoFolder, result, filesById) {
  var files = folder.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    var id = String(file.getId() || '').trim();
    if (!id || filesById[id]) continue;
    filesById[id] = true;
    var classification = atividadesV2_historicoClassifyPhotoFile_(file, isPhotoFolder);
    if (classification.kind === 'PHOTO') result.photos.push(classification.meta);
    if (classification.kind === 'AMBIGUOUS') result.ambiguous.push(classification.meta);
  }
}

function atividadesV2_historicoClassifyPhotoFile_(file, isPhotoFolder) {
  var name = String(file.getName() || '').trim();
  var normalized = atividadesV2_historicoNormalizeName_(name);
  var mimeType = String(file.getMimeType() || '').trim().toLowerCase();
  var extension = atividadesV2_getFileExtension_(name);
  var isImage = mimeType.indexOf('image/') === 0 || ['.jpg', '.jpeg', '.png', '.webp', '.heic'].indexOf(extension) >= 0;
  if (!isImage) return { kind: 'IGNORE' };

  var excludedTerms = ['logo', 'banner', 'arte', 'divulgacao', 'card', 'post', 'capa', 'institucional'];
  var looksExcluded = excludedTerms.some(function(term) { return normalized.indexOf(term) >= 0; });
  var meta = atividadesV2_historicoDriveFileMeta_(file);
  meta.origemPastaFotos = isPhotoFolder;
  if (looksExcluded) return { kind: 'AMBIGUOUS', meta: meta };
  return { kind: 'PHOTO', meta: meta };
}

function atividadesV2_historicoDriveFileMeta_(file) {
  var meta = {
    id: String(file.getId() || '').trim(),
    name: String(file.getName() || '').trim(),
    link: String(file.getUrl() || '').trim(),
    mimeType: String(file.getMimeType() || '').trim(),
    size: '',
    createdAt: '',
    updatedAt: ''
  };
  try { meta.size = file.getSize(); } catch (errSize) {}
  try { meta.createdAt = file.getDateCreated(); } catch (errCreated) {}
  try { meta.updatedAt = file.getLastUpdated(); } catch (errUpdated) {}
  return meta;
}

function atividadesV2_historicoReadDriveFileMeta_(driveId) {
  if (!driveId) return {};
  try {
    var meta = atividadesV2_historicoDriveFileMeta_(DriveApp.getFileById(driveId));
    return {
      name: meta.name,
      link: meta.link,
      mimeType: meta.mimeType,
      size: meta.size,
      createdAt: meta.createdAt,
      updatedAt: meta.updatedAt
    };
  } catch (err) {
    return { error: atividadesV2_errorMessage_(err) };
  }
}

function atividadesV2_historicoBuildDuplicateIndex_(records) {
  var index = { file: {}, link: {}, name: {}, resolvedPhoto: {} };
  (records || []).forEach(function(record) {
    if (atividades_normalizeTextUpper_(record.ATIVO || 'SIM') === 'NAO') return;
    atividadesV2_historicoRegisterDuplicate_(index, record);
  });
  return index;
}

function atividadesV2_historicoRegisterDuplicate_(index, record) {
  var pairKey = atividadesV2_historicoPairKey_(record.ID_ATIVIDADE, record.ID_APRESENTACAO, record.TIPO_ARQUIVO_ATIVIDADE);
  var driveId = atividadesV2_historicoNormalizeDriveId_(record.ID_ARQUIVO_DRIVE) || atividadesV2_extractDriveIdFromUrl_(record.LINK_ARQUIVO);
  var link = atividadesV2_historicoNormalizeLink_(record.LINK_ARQUIVO);
  var name = atividadesV2_historicoNormalizeName_(record.NOME_ARQUIVO);
  if (driveId) index.file[pairKey + '|ID|' + driveId] = true;
  if (link) index.link[pairKey + '|LINK|' + link] = true;
  if (!driveId && !link && name) index.name[pairKey + '|NAME|' + name] = true;
  var status = atividades_normalizeTextUpper_(record.STATUS_ARQUIVO);
  if (atividades_normalizeTextUpper_(record.TIPO_ARQUIVO_ATIVIDADE) === ATIVIDADES_V2_TIPO_ARQUIVO_FOTO_ &&
      ['HISTORICO', 'RECEBIDO', 'APROVADO', 'DISPENSADO'].indexOf(status) >= 0) {
    index.resolvedPhoto[pairKey] = true;
  }
}

function atividadesV2_historicoIsDuplicate_(index, idAtividade, idApresentacao, tipo, driveId, link, name) {
  var pairKey = atividadesV2_historicoPairKey_(idAtividade, idApresentacao, tipo);
  var normalizedId = atividadesV2_historicoNormalizeDriveId_(driveId) || atividadesV2_extractDriveIdFromUrl_(link);
  var normalizedLink = atividadesV2_historicoNormalizeLink_(link);
  var normalizedName = atividadesV2_historicoNormalizeName_(name);
  if (normalizedId && index.file[pairKey + '|ID|' + normalizedId]) return true;
  if (normalizedLink && index.link[pairKey + '|LINK|' + normalizedLink]) return true;
  return !normalizedId && !normalizedLink && normalizedName && !!index.name[pairKey + '|NAME|' + normalizedName];
}

function atividadesV2_historicoPairKey_(idAtividade, idApresentacao, tipo) {
  return [String(idAtividade || '').trim(), String(idApresentacao || '').trim(), atividades_normalizeTextUpper_(tipo)].join('|');
}

function atividadesV2_historicoResolveSlideStatus_(atividade, apresentacao) {
  var status = atividades_normalizeTextUpper_(apresentacao.STATUS_ENVIO_MATERIAL);
  if (['HISTORICO', 'RECEBIDO', 'APROVADO'].indexOf(status) >= 0) return status;
  if (status === 'PUBLICADO') return 'HISTORICO';
  if (status === 'DISPENSADO') return 'DISPENSADO';
  return atividadesV2_historicoIsRealized_(atividade, apresentacao) ? 'HISTORICO' : 'RECEBIDO';
}

function atividadesV2_historicoHasExplicitMaterial_(apresentacao) {
  var status = atividades_normalizeTextUpper_(apresentacao.STATUS_ENVIO_MATERIAL);
  var hasReference = !!String(apresentacao.ID_ARQUIVO_MATERIAL || apresentacao.LINK_MATERIAL_APRESENTACAO || apresentacao.NOME_ARQUIVO_MATERIAL || '').trim();
  return hasReference && ['HISTORICO', 'RECEBIDO', 'APROVADO', 'PUBLICADO'].indexOf(status) >= 0;
}

function atividadesV2_historicoIsBlocked_(atividade, apresentacao) {
  var statuses = [atividade.STATUS_OPERACIONAL, apresentacao.STATUS_APRESENTACAO].map(atividades_normalizeTextUpper_);
  return statuses.some(function(status) {
    return ['CANCELADA', 'CANCELADO', 'SUSPENSA', 'SUSPENSO', 'ARQUIVADA', 'ARQUIVADO'].indexOf(status) >= 0;
  });
}

function atividadesV2_historicoIsRealized_(atividade, apresentacao) {
  var statuses = [atividade.STATUS_OPERACIONAL, apresentacao.STATUS_APRESENTACAO].map(atividades_normalizeTextUpper_);
  return statuses.some(function(status) {
    return ['REALIZADA', 'REALIZADO', 'CONCLUIDA', 'CONCLUIDO', 'ENCERRADA', 'ENCERRADO', 'HISTORICO'].indexOf(status) >= 0;
  }) || atividadesV2_isTruthyFlag_(apresentacao.SYNC_HISTORICO_PUBLICO);
}

function atividadesV2_historicoIsPhotoFolderName_(name) {
  var normalized = atividadesV2_historicoNormalizeName_(name);
  return normalized.indexOf('foto') >= 0 || normalized.indexOf('imagem') >= 0;
}

function atividadesV2_historicoNormalizeName_(value) {
  return String(value || '').trim().toLowerCase()
    .replace(/[\u00e1\u00e0\u00e3\u00e2\u00e4]/g, 'a')
    .replace(/[\u00e9\u00e8\u00ea\u00eb]/g, 'e')
    .replace(/[\u00ed\u00ec\u00ee\u00ef]/g, 'i')
    .replace(/[\u00f3\u00f2\u00f5\u00f4\u00f6]/g, 'o')
    .replace(/[\u00fa\u00f9\u00fb\u00fc]/g, 'u')
    .replace(/\u00e7/g, 'c')
    .replace(/\s+/g, ' ');
}

function atividadesV2_historicoNormalizeDriveId_(value) {
  var raw = String(value || '').trim();
  if (!raw) return '';
  return raw.indexOf('/') >= 0 || raw.indexOf('http') === 0 ? atividadesV2_extractDriveIdFromUrl_(raw) : raw;
}

function atividadesV2_historicoNormalizeLink_(value) {
  return String(value || '').trim().replace(/\/$/, '');
}

function atividadesV2_historicoBuildDriveFileUrl_(driveId) {
  return driveId ? 'https://drive.google.com/open?id=' + encodeURIComponent(driveId) : '';
}

function atividadesV2_historicoBuildId_(idAtividade, idApresentacao, tipo, token) {
  return atividadesV2_buildDeterministicId_('ARQH', [idAtividade, idApresentacao, tipo, token]);
}

function atividadesV2_historicoNewReport_(dryRun, startedAt) {
  return {
    ok: true,
    modo: atividadesV2_resolveEnvironment_({}),
    dryRun: dryRun,
    origem: 'ATIVIDADES_V2_DB',
    destino: ATIVIDADES_V2_SHEETS.ARQUIVOS,
    iniciadoEm: startedAt,
    planoGerado: false,
    execucaoReal: !dryRun,
    escritaRealizada: false,
    arquivosMovidosOuExcluidos: 0,
    totalAtividadesAvaliadas: 0,
    totalApresentacoesAvaliadas: 0,
    totalComPastaDrive: 0,
    totalSemPastaDrive: 0,
    totalSlidesPlanejados: 0,
    totalFotosPlanejadas: 0,
    totalDispensasPlanejadas: 0,
    totalSlidesQueSeriamCriados: 0,
    totalFotosQueSeriamCriadas: 0,
    totalDispensasHistoricasQueSeriamCriadas: 0,
    totalLinhasQueSeriamCriadas: 0,
    totalSlidesCriados: 0,
    totalFotosCriadas: 0,
    totalDispensasCriadas: 0,
    totalLinhasCriadas: 0,
    totalDuplicidadesIgnoradas: 0,
    totalPastasInacessiveis: 0,
    totalCasosAmbiguos: 0,
    exemplos: [],
    avisos: [],
    erros: [],
    views: {},
    cache: null
  };
}

function atividadesV2_historicoErrorReport_(code, message, startedAt, dryRun) {
  var report = atividadesV2_historicoNewReport_(dryRun !== false, startedAt || new Date());
  report.ok = false;
  report.errorCode = code;
  report.message = message;
  report.erros.push(message);
  return report;
}

function atividadesV2_historicoAddExample_(report, action, atividade, apresentacao, type, status, fileName) {
  if (report.exemplos.length >= ATIVIDADES_V2_HISTORICO_MAX_EXEMPLOS_) return;
  report.exemplos.push({
    acao: action,
    idAtividade: String(atividade.ID_ATIVIDADE || '').trim(),
    idApresentacao: String(apresentacao.ID_APRESENTACAO || '').trim(),
    tipoArquivo: type,
    statusArquivo: status,
    nomeArquivo: atividades_sanitizePortalText_(fileName || '', 120)
  });
}

function atividadesV2_historicoAddWarning_(report, message) {
  if (report.avisos.length < ATIVIDADES_V2_HISTORICO_MAX_AVISOS_) report.avisos.push(String(message || '').slice(0, 300));
}

function atividadesV2_historicoAddError_(report, message) {
  if (report.erros.length < ATIVIDADES_V2_HISTORICO_MAX_AVISOS_) report.erros.push(String(message || '').slice(0, 300));
}

function atividadesV2_historicoAddCacheTarget_(report, atividade, apresentacao) {
  var target = {
    perfil: 'MEMBRO',
    idAtividade: String(atividade.ID_ATIVIDADE || '').trim(),
    idPessoa: String(apresentacao.ID_PESSOA || atividade.ID_PESSOA_PRINCIPAL || '').trim(),
    email: String(apresentacao.EMAIL_MEMBRO || atividade.EMAIL_PESSOA_PRINCIPAL || '').trim(),
    rga: String(apresentacao.RGA || atividade.RGA_PESSOA_PRINCIPAL || '').trim(),
    somenteVisiveis: true
  };
  var key = [target.idAtividade, target.idPessoa, target.email, target.rga].join('|');
  if (report._cacheTargetIndex[key]) return;
  report._cacheTargetIndex[key] = true;
  report._cacheTargets.push(target);
}

function atividadesV2_historicoPostProcess_(report) {
  var viewSteps = [
    ['detalhes', atividadesV2_atualizarPortalDetalhes_],
    ['pendenciasDiretoria', atividadesV2_atualizarPendenciasDiretoria_],
    ['statusAtividades', atividadesV2_atualizarPortalStatus_]
  ];
  viewSteps.forEach(function(step) {
    try {
      report.views[step[0]] = step[1]({ dryRun: false });
      if (!report.views[step[0]].ok) {
        atividadesV2_historicoAddError_(report, 'Falha ao atualizar view ' + step[0] + ': ' + String(report.views[step[0]].message || report.views[step[0]].errorCode || 'erro'));
      }
    } catch (err) {
      report.views[step[0]] = { ok: false, message: atividadesV2_errorMessage_(err) };
      atividadesV2_historicoAddError_(report, 'Falha ao atualizar view ' + step[0] + ': ' + atividadesV2_errorMessage_(err));
    }
  });
  try {
    report.cache = atividadesV2_limparCachePortalDev_();
    (report._cacheTargets || []).forEach(function(target) {
      atividadesV2_invalidatePresentationPortalCaches_(target, target);
    });
    report.cache.contextosAfetados = (report._cacheTargets || []).length;
  } catch (errCache) {
    report.cache = { ok: false, message: atividadesV2_errorMessage_(errCache) };
    atividadesV2_historicoAddError_(report, 'Falha ao limpar cache do Portal: ' + atividadesV2_errorMessage_(errCache));
  }
  delete report._cacheTargets;
  delete report._cacheTargetIndex;
}
