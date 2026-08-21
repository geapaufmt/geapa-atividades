/**
 * Entregaveis de apresentacoes na base Atividades V2 do ambiente resolvido.
 *
 * Atividades_Arquivos preserva uma linha por versao. O slide continua
 * espelhado em Atividades_Apresentacoes para compatibilidade; a foto da
 * reuniao usa exclusivamente esta base generica.
 */

var ATIVIDADES_V2_TIPO_ARQUIVO_SLIDE_ = 'SLIDE_APRESENTACAO';
var ATIVIDADES_V2_TIPO_ARQUIVO_FOTO_ = 'FOTO_REUNIAO';
var ATIVIDADES_V2_FOTO_MAX_BYTES_DEFAULT_ = 20 * 1024 * 1024;

function atividadesV2_portalRegistrarFotoReuniao_(payload, contexto) {
  var actionType = payload && payload.reenvio === true
    ? 'APRESENTACAO_FOTO_REUNIAO_REENVIADA'
    : 'APRESENTACAO_FOTO_REUNIAO_ENVIADA';
  return atividadesV2_portalRunPresentationAction_(actionType, payload || {}, contexto || {}, function(ss, action) {
    var bundle = atividadesV2_portalResolvePresentationActionBundle_(ss, action.payload);
    atividadesV2_assertPresentationNotBlocked_(bundle.apresentacao);
    var config = atividadesV2_portalGetActivityConfig_(ss, bundle.atividade);
    var rules = atividadesV2_resolveFotoReuniaoRules_(bundle.atividade, config);
    atividadesV2_assertPodeRegistrarFotoReuniao_(bundle, action.contexto, rules);
    return atividadesV2_registrarFotoReuniaoNoBundle_(ss, bundle, action.payload, action.contexto, rules, action.trace);
  });
}

function atividadesV2_portalRevisarFotoReuniao_(payload, contexto) {
  var decision = atividadesV2_normalizeDecision_(payload && payload.decisao);
  var actionByDecision = {
    APROVAR: 'APRESENTACAO_FOTO_REUNIAO_APROVADA',
    SOLICITAR_AJUSTE: 'APRESENTACAO_FOTO_REUNIAO_AJUSTE_SOLICITADO',
    DISPENSAR: 'APRESENTACAO_FOTO_REUNIAO_DISPENSADA'
  };
  return atividadesV2_portalRunPresentationAction_(actionByDecision[decision] || 'APRESENTACAO_FOTO_REUNIAO_REVISADA', payload || {}, contexto || {}, function(ss, action) {
    if (!atividades_isPrivilegedPortalProfile_(action.contexto)) {
      throw atividadesV2_portalActionException_('PERMISSAO_NEGADA', 'Perfil sem permissao para revisar foto da reuniao.');
    }
    var normalizedDecision = atividadesV2_normalizeDecision_(action.payload.decisao);
    var statusByDecision = {
      APROVAR: 'APROVADO',
      SOLICITAR_AJUSTE: 'AJUSTE_SOLICITADO',
      DISPENSAR: 'DISPENSADO'
    };
    var status = statusByDecision[normalizedDecision];
    if (!status) throw atividadesV2_portalActionException_('DECISAO_INVALIDA', 'Decisao invalida para foto da reuniao.');

    var bundle = atividadesV2_portalResolvePresentationActionBundle_(ss, action.payload);
    var config = atividadesV2_portalGetActivityConfig_(ss, bundle.atividade);
    var rules = atividadesV2_resolveFotoReuniaoRules_(bundle.atividade, config);
    if (normalizedDecision === 'DISPENSAR' && !rules.permiteDispensar) {
      throw atividadesV2_portalActionException_('DISPENSA_FOTO_NAO_PERMITIDA', 'O modelo nao permite dispensar a foto da reuniao.');
    }
    var observation = atividades_sanitizePortalText_(
      action.payload.observacaoPublica || action.payload.observacaoInterna || action.payload.observacoes,
      500
    );
    if (['DISPENSAR', 'SOLICITAR_AJUSTE'].indexOf(normalizedDecision) >= 0 && !observation) {
      throw atividadesV2_portalActionException_('OBSERVACAO_OBRIGATORIA', 'Informe a justificativa ou orientacao para esta decisao.');
    }

    var filesSheet = atividadesV2_getArquivosSheetForWrite_(ss);
    var latest = atividadesV2_findLatestArquivoAtividade_(
      atividadesV2_readSheetObjects_(filesSheet),
      bundle.atividade.ID_ATIVIDADE,
      bundle.apresentacao.ID_APRESENTACAO,
      ATIVIDADES_V2_TIPO_ARQUIVO_FOTO_
    );
    var now = new Date();
    var actor = atividadesV2_portalActorToken_(action.contexto);
    if (!latest && normalizedDecision !== 'DISPENSAR') {
      throw atividadesV2_portalActionException_('FOTO_REUNIAO_NAO_ENCONTRADA', 'Envie a foto da reuniao antes de revisa-la.');
    }
    if (!latest) {
      latest = atividadesV2_appendArquivoAtividade_(filesSheet, {
        ID_ARQUIVO_ATIVIDADE: atividadesV2_buildArquivoAtividadeId_(bundle.atividade.ID_ATIVIDADE, bundle.apresentacao.ID_APRESENTACAO, ATIVIDADES_V2_TIPO_ARQUIVO_FOTO_),
        ID_ATIVIDADE: bundle.atividade.ID_ATIVIDADE,
        ID_APRESENTACAO: bundle.apresentacao.ID_APRESENTACAO,
        TIPO_ARQUIVO_ATIVIDADE: ATIVIDADES_V2_TIPO_ARQUIVO_FOTO_,
        ESCOPO_ARQUIVO: 'ATIVIDADE',
        STATUS_ARQUIVO: status,
        PERFIL_RESPONSAVEL: action.contexto.perfil || '',
        OBSERVACOES: observation,
        PUBLICAR_NO_PORTAL: 'NAO',
        ATIVO: 'SIM',
        CRIADO_POR: actor,
        CRIADO_EM: now,
        ATUALIZADO_POR: actor,
        ATUALIZADO_EM: now
      });
    } else {
      atividadesV2_updateRowByHeaders_(filesSheet, latest._rowNumber, {
        STATUS_ARQUIVO: status,
        APROVADO_POR: normalizedDecision === 'APROVAR' ? actor : latest.APROVADO_POR || '',
        APROVADO_EM: normalizedDecision === 'APROVAR' ? now : latest.APROVADO_EM || '',
        OBSERVACOES: atividadesV2_joinObservacoes_(latest.OBSERVACOES, observation),
        ATUALIZADO_POR: actor,
        ATUALIZADO_EM: now
      });
    }

    return atividadesV2_buildArquivoActionResult_(bundle, action.contexto, {
      statusArquivo: status,
      statusFotoReuniao: status,
      idArquivoAtividade: latest.ID_ARQUIVO_ATIVIDADE || '',
      linkArquivo: latest.LINK_ARQUIVO || ''
    });
  });
}

function atividadesV2_registrarFotoReuniaoNoBundle_(ss, bundle, payload, contexto, rules, trace) {
  var fileId = String(payload.fileId || payload.idArquivo || '').trim();
  var driveLink = String(payload.linkArquivo || payload.linkFoto || payload.linkDrive || '').trim();
  var base64 = String(payload.conteudoBase64 || payload.base64 || '').trim();
  if (!fileId && driveLink) fileId = atividadesV2_extractDriveIdFromUrl_(driveLink);
  if (!fileId && !base64) {
    throw atividadesV2_portalActionException_('FOTO_REUNIAO_OBRIGATORIA', 'Envie uma imagem ou informe um link de arquivo do Drive.');
  }
  if (driveLink && !fileId) {
    throw atividadesV2_portalActionException_('LINK_FOTO_INVALIDO', 'Informe um link de arquivo valido do Google Drive.');
  }
  if (base64 && !rules.permiteUpload) {
    throw atividadesV2_portalActionException_('UPLOAD_FOTO_NAO_PERMITIDO', 'O modelo nao permite upload de foto.');
  }
  if (fileId && !rules.permiteLink) {
    throw atividadesV2_portalActionException_('LINK_FOTO_NAO_PERMITIDO', 'O modelo nao permite envio por link de Drive.');
  }

  var upload = atividadesV2_portalWriteStage_(trace, 'UPLOAD_ANEXO', function() {
    var sourceFile = fileId ? DriveApp.getFileById(fileId) : null;
    var originalName = String(payload.nomeArquivoOriginal || payload.nomeArquivo || (sourceFile ? sourceFile.getName() : 'foto-reuniao.jpg')).trim();
    var mimeType = String(payload.mimeType || (sourceFile ? sourceFile.getMimeType() : '')).trim();
    atividadesV2_assertFotoReuniaoFileAllowed_(originalName, mimeType, rules);
    atividadesV2_assertArquivoSizeAllowed_(sourceFile, base64, rules.tamanhoMaxBytes, 'FOTO_REUNIAO_MUITO_GRANDE');

    var activityFolderInfo = atividadesV2_garantirPastaAtividade_(bundle.atividade.ID_ATIVIDADE, { spreadsheet: ss });
    var activityFolder = DriveApp.getFolderById(activityFolderInfo.folderId);
    var photosFolderIterator = activityFolder.getFoldersByName('Fotos');
    var photosFolder = photosFolderIterator.hasNext() ? photosFolderIterator.next() : activityFolder.createFolder('Fotos');
    var extension = atividadesV2_getFileExtension_(originalName) || atividadesV2_photoExtensionFromMime_(mimeType);
    var baseName = atividadesV2_sanitizeDriveFileName_([
      bundle.atividade.ID_ATIVIDADE,
      bundle.apresentacao.ID_APRESENTACAO,
      'Foto da reuniao'
    ].join(' - ')) + extension;
    var versioned = atividadesV2_resolveMaterialFileName_(photosFolder, baseName);
    var targetFile = sourceFile
      ? sourceFile.makeCopy(versioned.nomeArquivo, photosFolder)
      : atividadesV2_createMaterialFileFromBase64_(photosFolder, versioned.nomeArquivo, base64, mimeType || 'image/jpeg');
    return { mimeType: mimeType, targetFile: targetFile, versioned: versioned };
  });
  var mimeType = upload.mimeType;
  var targetFile = upload.targetFile;
  var versioned = upload.versioned;

  var filesSheet = atividadesV2_getArquivosSheetForWrite_(ss);
  var existing = atividadesV2_findLatestArquivoAtividade_(
    atividadesV2_readSheetObjects_(filesSheet),
    bundle.atividade.ID_ATIVIDADE,
    bundle.apresentacao.ID_APRESENTACAO,
    ATIVIDADES_V2_TIPO_ARQUIVO_FOTO_
  );
  var now = new Date();
  var actor = atividadesV2_portalActorToken_(contexto);
  var row = atividadesV2_portalWriteStage_(trace, 'ESCRITA_PLANILHA_OFICIAL', function() {
    if (existing && existing._rowNumber) {
      atividadesV2_updateRowByHeaders_(filesSheet, existing._rowNumber, {
        STATUS_ARQUIVO: 'HISTORICO',
        ATUALIZADO_POR: actor,
        ATUALIZADO_EM: now
      });
    }
    return atividadesV2_appendArquivoAtividade_(filesSheet, {
    ID_ARQUIVO_ATIVIDADE: atividadesV2_buildArquivoAtividadeId_(bundle.atividade.ID_ATIVIDADE, bundle.apresentacao.ID_APRESENTACAO, ATIVIDADES_V2_TIPO_ARQUIVO_FOTO_),
    ID_ATIVIDADE: bundle.atividade.ID_ATIVIDADE,
    ID_APRESENTACAO: bundle.apresentacao.ID_APRESENTACAO,
    TIPO_ARQUIVO_ATIVIDADE: ATIVIDADES_V2_TIPO_ARQUIVO_FOTO_,
    ESCOPO_ARQUIVO: 'ATIVIDADE',
    STATUS_ARQUIVO: existing ? 'REENVIADO' : 'RECEBIDO',
    ID_PESSOA_RESPONSAVEL: bundle.apresentacao.ID_PESSOA || bundle.atividade.ID_PESSOA_PRINCIPAL || '',
    NOME_RESPONSAVEL: bundle.atividade.NOME_PESSOA_PRINCIPAL_PUBLICO || '',
    PERFIL_RESPONSAVEL: contexto.perfil || '',
    ID_ARQUIVO_DRIVE: targetFile.getId(),
    NOME_ARQUIVO: targetFile.getName(),
    LINK_ARQUIVO: targetFile.getUrl(),
    MIME_TYPE: mimeType || targetFile.getMimeType(),
    TAMANHO_BYTES: targetFile.getSize(),
    VERSAO: versioned.versao,
    ENVIADO_POR: actor,
    ENVIADO_EM: now,
    RECEBIDO_POR: actor,
    RECEBIDO_EM: now,
    PUBLICAR_NO_PORTAL: 'NAO',
    ATIVO: 'SIM',
    CRIADO_POR: actor,
    CRIADO_EM: now,
    ATUALIZADO_POR: actor,
      ATUALIZADO_EM: now
    });
  });
  return atividadesV2_buildArquivoActionResult_(bundle, contexto, {
    statusArquivo: row.STATUS_ARQUIVO,
    statusFotoReuniao: row.STATUS_ARQUIVO,
    idArquivoAtividade: row.ID_ARQUIVO_ATIVIDADE,
    idArquivoDrive: row.ID_ARQUIVO_DRIVE,
    nomeArquivo: row.NOME_ARQUIVO,
    linkArquivo: row.LINK_ARQUIVO,
    versao: row.VERSAO
  });
}

function atividadesV2_registrarSlideEmArquivos_(ss, atividade, apresentacao, file, status, contexto, versao) {
  var filesSheet = atividadesV2_getArquivosSheetForWrite_(ss);
  var existing = atividadesV2_findLatestArquivoAtividade_(
    atividadesV2_readSheetObjects_(filesSheet),
    atividade.ID_ATIVIDADE,
    apresentacao.ID_APRESENTACAO,
    ATIVIDADES_V2_TIPO_ARQUIVO_SLIDE_
  );
  var now = new Date();
  var actor = atividadesV2_portalActorToken_(contexto || {});
  if (existing && existing._rowNumber) {
    atividadesV2_updateRowByHeaders_(filesSheet, existing._rowNumber, {
      STATUS_ARQUIVO: 'HISTORICO',
      ATUALIZADO_POR: actor,
      ATUALIZADO_EM: now
    });
  }
  return atividadesV2_appendArquivoAtividade_(filesSheet, {
    ID_ARQUIVO_ATIVIDADE: atividadesV2_buildArquivoAtividadeId_(atividade.ID_ATIVIDADE, apresentacao.ID_APRESENTACAO, ATIVIDADES_V2_TIPO_ARQUIVO_SLIDE_),
    ID_ATIVIDADE: atividade.ID_ATIVIDADE,
    ID_APRESENTACAO: apresentacao.ID_APRESENTACAO,
    TIPO_ARQUIVO_ATIVIDADE: ATIVIDADES_V2_TIPO_ARQUIVO_SLIDE_,
    ESCOPO_ARQUIVO: 'APRESENTACAO',
    STATUS_ARQUIVO: status || 'RECEBIDO',
    ID_PESSOA_RESPONSAVEL: apresentacao.ID_PESSOA || atividade.ID_PESSOA_PRINCIPAL || '',
    NOME_RESPONSAVEL: atividade.NOME_PESSOA_PRINCIPAL_PUBLICO || '',
    PERFIL_RESPONSAVEL: contexto && contexto.perfil || '',
    ID_ARQUIVO_DRIVE: file.getId(),
    NOME_ARQUIVO: file.getName(),
    LINK_ARQUIVO: file.getUrl(),
    MIME_TYPE: file.getMimeType(),
    TAMANHO_BYTES: file.getSize(),
    VERSAO: versao || '',
    ENVIADO_POR: actor,
    ENVIADO_EM: now,
    RECEBIDO_POR: actor,
    RECEBIDO_EM: now,
    PUBLICAR_NO_PORTAL: 'NAO',
    ATIVO: 'SIM',
    CRIADO_POR: actor,
    CRIADO_EM: now,
    ATUALIZADO_POR: actor,
    ATUALIZADO_EM: now
  });
}

function atividadesV2_syncLatestArquivoStatus_(ss, idAtividade, idApresentacao, tipo, status, contexto, observation) {
  var sheet = atividadesV2_getArquivosSheetForWrite_(ss);
  var latest = atividadesV2_findLatestArquivoAtividade_(atividadesV2_readSheetObjects_(sheet), idAtividade, idApresentacao, tipo);
  if (!latest) return null;
  var now = new Date();
  var actor = atividadesV2_portalActorToken_(contexto || {});
  atividadesV2_updateRowByHeaders_(sheet, latest._rowNumber, {
    STATUS_ARQUIVO: status,
    APROVADO_POR: status === 'APROVADO' ? actor : latest.APROVADO_POR || '',
    APROVADO_EM: status === 'APROVADO' ? now : latest.APROVADO_EM || '',
    OBSERVACOES: atividadesV2_joinObservacoes_(latest.OBSERVACOES, observation),
    ATUALIZADO_POR: actor,
    ATUALIZADO_EM: now
  });
  return latest;
}

function atividadesV2_appendArquivoAtividade_(sheet, values) {
  var headers = atividadesV2_getSheetHeaders_(sheet).filter(function(header) { return !!header; });
  var rowNumber = sheet.getLastRow() + 1;
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([headers.map(function(header) {
    return Object.prototype.hasOwnProperty.call(values || {}, header) ? values[header] : '';
  })]);
  return Object.assign({ _rowNumber: rowNumber }, values || {});
}

function atividadesV2_getArquivosSheetForWrite_(ss) {
  var result = atividadesV2_createSheetIfMissing_(ss, ATIVIDADES_V2_SHEETS.ARQUIVOS);
  atividadesV2_applyHeadersIfMissing_(result.sheet, ATIVIDADES_V2_SCHEMA.ARQUIVOS);
  if (result.created) {
    atividadesV2_applyBasicSheetUx_(result.sheet);
    atividadesV2_applyValidations_(result.sheet, ATIVIDADES_V2_SHEETS.ARQUIVOS);
  }
  return result.sheet;
}

function atividadesV2_findLatestArquivoAtividade_(records, idAtividade, idApresentacao, tipo) {
  var wantedActivity = String(idAtividade || '').trim();
  var wantedPresentation = String(idApresentacao || '').trim();
  var wantedType = atividades_normalizeTextUpper_(tipo);
  var candidates = (records || []).filter(function(record) {
    return String(record.ID_ATIVIDADE || '').trim() === wantedActivity &&
      String(record.ID_APRESENTACAO || '').trim() === wantedPresentation &&
      atividades_normalizeTextUpper_(record.TIPO_ARQUIVO_ATIVIDADE) === wantedType &&
      atividades_normalizeTextUpper_(record.ATIVO || 'SIM') !== 'NAO' &&
      atividades_normalizeTextUpper_(record.STATUS_ARQUIVO) !== 'HISTORICO';
  });
  candidates.sort(function(a, b) {
    var aTime = atividades_parseDateOrNull_(a.ATUALIZADO_EM || a.ENVIADO_EM || a.CRIADO_EM);
    var bTime = atividades_parseDateOrNull_(b.ATUALIZADO_EM || b.ENVIADO_EM || b.CRIADO_EM);
    return (bTime ? bTime.getTime() : 0) - (aTime ? aTime.getTime() : 0) || Number(b._rowNumber || 0) - Number(a._rowNumber || 0);
  });
  return candidates[0] || null;
}

function atividadesV2_indexLatestArquivos_(records) {
  var out = {};
  (records || []).forEach(function(record) {
    if (atividades_normalizeTextUpper_(record.ATIVO || 'SIM') === 'NAO') return;
    var key = [record.ID_ATIVIDADE, record.ID_APRESENTACAO, atividades_normalizeTextUpper_(record.TIPO_ARQUIVO_ATIVIDADE)].join('|');
    var current = out[key];
    var recordIsHistorical = atividades_normalizeTextUpper_(record.STATUS_ARQUIVO) === 'HISTORICO';
    var currentIsHistorical = current && atividades_normalizeTextUpper_(current.STATUS_ARQUIVO) === 'HISTORICO';
    if (!current || (currentIsHistorical && !recordIsHistorical) ||
        (currentIsHistorical === recordIsHistorical && Number(record._rowNumber || 0) > Number(current._rowNumber || 0))) {
      out[key] = record;
    }
  });
  return out;
}

function atividadesV2_getLatestArquivoFromIndex_(index, idAtividade, idApresentacao, tipo) {
  return (index || {})[[idAtividade, idApresentacao, atividades_normalizeTextUpper_(tipo)].join('|')] || null;
}

function atividadesV2_resolveFotoReuniaoRules_(atividade, config) {
  var isMemberPresentation = atividades_normalizeTextUpper_(atividade && atividade.SUBTIPO_ATIVIDADE) === 'APRESENTACAO_MEMBRO';
  var cfg = config || {};
  var profiles = String(cfg.PERFIS_QUE_PODEM_ENVIAR_FOTO_REUNIAO || 'SECRETARIO,DIRETORIA,ADMIN_TECNICO')
    .split(',').map(function(value) { return atividades_normalizeTextUpper_(value); }).filter(function(value) { return !!value; });
  var maxMb = Number(cfg.TAMANHO_MAX_FOTO_REUNIAO_MB || 20);
  return {
    exigeFoto: isMemberPresentation && atividades_normalizeTextUpper_(cfg.EXIGE_FOTO_REUNIAO || 'SIM') !== 'NAO',
    geraPendencia: isMemberPresentation && atividades_normalizeTextUpper_(cfg.GERA_PENDENCIA_FOTO_REUNIAO || 'SIM') !== 'NAO',
    permiteUpload: atividades_normalizeTextUpper_(cfg.PERMITE_UPLOAD_FOTO_REUNIAO || 'SIM') !== 'NAO',
    permiteLink: atividades_normalizeTextUpper_(cfg.PERMITE_LINK_FOTO_REUNIAO || 'SIM') !== 'NAO',
    permiteMembro: atividades_normalizeTextUpper_(cfg.PERMITE_MEMBRO_APRESENTADOR_ENVIAR_FOTO_REUNIAO || 'SIM') !== 'NAO',
    permiteDispensar: atividades_normalizeTextUpper_(cfg.PERMITE_DISPENSAR_FOTO_REUNIAO || 'SIM') !== 'NAO',
    perfisGestao: profiles,
    extensoes: String(cfg.TIPOS_ARQUIVO_FOTO_REUNIAO_PERMITIDOS || 'JPG,JPEG,PNG,WEBP').split(',').map(function(value) { return '.' + String(value || '').trim().toLowerCase().replace(/^\./, ''); }),
    tamanhoMaxBytes: Math.max(1, maxMb) * 1024 * 1024,
    prazoHorasApos: Number(cfg.PRAZO_FOTO_REUNIAO_HORAS_APOS || 72)
  };
}

function atividadesV2_findConfigForActivityFromRows_(configs, atividade) {
  var idConfig = String(atividade && atividade.ID_CONFIG_MODELO || '').trim();
  var tipo = atividades_normalizeTextUpper_(atividade && atividade.TIPO_ATIVIDADE);
  var subtipo = atividades_normalizeTextUpper_(atividade && atividade.SUBTIPO_ATIVIDADE);
  var fallback = null;
  for (var i = 0; i < (configs || []).length; i++) {
    var config = configs[i];
    if (atividades_normalizeTextUpper_(config.ATIVO || 'SIM') === 'NAO') continue;
    if (idConfig && String(config.ID_CONFIG || '').trim() === idConfig) return config;
    if (!fallback && atividades_normalizeTextUpper_(config.TIPO_ATIVIDADE) === tipo &&
        atividades_normalizeTextUpper_(config.SUBTIPO_ATIVIDADE) === subtipo) fallback = config;
  }
  return fallback || {};
}

function atividadesV2_assertPodeRegistrarFotoReuniao_(bundle, contexto, rules) {
  if (!rules.exigeFoto && atividades_normalizeTextUpper_(bundle.atividade.SUBTIPO_ATIVIDADE) !== 'APRESENTACAO_MEMBRO') {
    throw atividadesV2_portalActionException_('FOTO_REUNIAO_NAO_APLICAVEL', 'Foto da reuniao nao se aplica a esta atividade.');
  }
  var profile = atividades_normalizeTextUpper_(contexto && contexto.perfil);
  if (rules.perfisGestao.indexOf(profile) >= 0 && atividades_isPrivilegedPortalProfile_(contexto)) return true;
  if (rules.permiteMembro && atividadesV2_portalPresentationBelongsToContext_(bundle.atividade, bundle.apresentacao, contexto)) return true;
  throw atividadesV2_portalActionException_('PERMISSAO_NEGADA', 'Usuario sem permissao para enviar foto desta reuniao.');
}

function atividadesV2_assertFotoReuniaoFileAllowed_(fileName, mimeType, rules) {
  var extension = atividadesV2_getFileExtension_(fileName);
  var allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
  if (rules.extensoes.indexOf(extension) < 0 && allowedMime.indexOf(String(mimeType || '').toLowerCase()) < 0) {
    throw atividadesV2_portalActionException_('TIPO_FOTO_INVALIDO', 'Envie uma foto JPG, JPEG, PNG ou WEBP.');
  }
}

function atividadesV2_assertArquivoSizeAllowed_(sourceFile, base64, maxBytes, code) {
  var size = sourceFile ? sourceFile.getSize() : Math.floor(String(base64 || '').replace(/^data:[^;]+;base64,/, '').length * 0.75);
  if (size > Number(maxBytes || ATIVIDADES_V2_FOTO_MAX_BYTES_DEFAULT_)) {
    throw atividadesV2_portalActionException_(code || 'ARQUIVO_MUITO_GRANDE', 'O arquivo excede o limite configurado.');
  }
}

function atividadesV2_photoExtensionFromMime_(mimeType) {
  var normalized = String(mimeType || '').toLowerCase();
  if (normalized === 'image/png') return '.png';
  if (normalized === 'image/webp') return '.webp';
  return '.jpg';
}

function atividadesV2_buildArquivoAtividadeId_(idAtividade, idApresentacao, tipo) {
  return atividadesV2_buildDeterministicId_('ARQ', [idAtividade, idApresentacao, tipo, new Date().getTime(), Math.floor(Math.random() * 100000)]);
}

function atividadesV2_buildArquivoActionResult_(bundle, contexto, data) {
  return Object.assign({
    idAtividade: bundle.atividade.ID_ATIVIDADE,
    idApresentacao: bundle.apresentacao.ID_APRESENTACAO,
    idPessoa: bundle.apresentacao.ID_PESSOA || bundle.atividade.ID_PESSOA_PRINCIPAL || '',
    email: bundle.apresentacao.EMAIL_MEMBRO || bundle.atividade.EMAIL_PESSOA_PRINCIPAL || '',
    rga: bundle.apresentacao.RGA || bundle.atividade.RGA_PESSOA_PRINCIPAL || '',
    perfilResponsavel: contexto && contexto.perfil || '',
    modo: atividadesV2_resolveEnvironment_({})
  }, data || {});
}

function atividadesV2_isArquivoResolvido_(record) {
  var status = atividades_normalizeTextUpper_(record && record.STATUS_ARQUIVO);
  return ['RECEBIDO', 'APROVADO', 'HISTORICO', 'DISPENSADO'].indexOf(status) >= 0;
}

function atividadesV2_readArquivosAtividadeOptional_(ss) {
  var sheet = ss.getSheetByName(ATIVIDADES_V2_SHEETS.ARQUIVOS);
  return sheet ? atividadesV2_readSheetObjects_(sheet) : [];
}

function atividadesV2_runTesteEntregaveisApresentacaoDev_() {
  var ss = atividadesV2_getDatabaseSpreadsheet_();
  var sheet = ss.getSheetByName(ATIVIDADES_V2_SHEETS.ARQUIVOS);
  var records = sheet ? atividadesV2_readSheetObjects_(sheet) : [];
  var stats = { total: records.length, slides: 0, fotos: 0, resolvidos: 0, ajustes: 0 };
  records.forEach(function(record) {
    var type = atividades_normalizeTextUpper_(record.TIPO_ARQUIVO_ATIVIDADE);
    if (type === ATIVIDADES_V2_TIPO_ARQUIVO_SLIDE_) stats.slides++;
    if (type === ATIVIDADES_V2_TIPO_ARQUIVO_FOTO_) stats.fotos++;
    if (atividadesV2_isArquivoResolvido_(record)) stats.resolvidos++;
    if (atividades_normalizeTextUpper_(record.STATUS_ARQUIVO) === 'AJUSTE_SOLICITADO') stats.ajustes++;
  });
  return {
    ok: !!sheet,
    modo: atividadesV2_resolveEnvironment_({}),
    escritaRealizada: false,
    abaExiste: !!sheet,
    cabecalhosAusentes: sheet ? ATIVIDADES_V2_SCHEMA.ARQUIVOS.filter(function(header) {
      return atividadesV2_getSheetHeaders_(sheet).indexOf(header) < 0;
    }) : ATIVIDADES_V2_SCHEMA.ARQUIVOS.slice(),
    stats: stats
  };
}
