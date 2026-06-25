/**
 * Gestao de atividades V2 pelo Portal GEAPA.
 *
 * Pacote 4A: cria atividade nova em DEV com status inicial seguro.
 * Nao implementa edicao, cancelamento, publicacao avancada ou anexos.
 */

function atividadesV2_portalCriarAtividade_(payload, contexto) {
  var request = payload || {};
  var dryRun = request.dryRun !== false;
  var ctx = atividades_normalizePortalContext_(contexto || {});
  if (!atividadesV2_canCreateActivityFromPortal_(ctx)) {
    return {
      ok: false,
      errorCode: 'PERMISSAO_INSUFICIENTE',
      message: 'Perfil sem permissao para criar atividades.'
    };
  }

  var activityPayload = request.atividade || request.activity || request;
  var validation = atividadesV2_normalizarPayloadCriacaoAtividade_(activityPayload);
  if (!validation.ok) {
    return {
      ok: false,
      errorCode: 'VALIDACAO_ATIVIDADE',
      message: 'Revise os campos obrigatorios.',
      fieldErrors: validation.fieldErrors
    };
  }

  if (dryRun) {
    var previewSs = atividadesV2_getDatabaseSpreadsheetDev_();
    var preview = atividadesV2_montarCriacaoAtividadePreview_(validation.data, ctx, previewSs);
    return atividadesV2_buildCriacaoAtividadeResponse_(true, preview, {
      dryRun: true,
      escrita: false,
      viewsAtualizadas: null
    });
  }

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return {
      ok: false,
      errorCode: 'LOCK_INDISPONIVEL',
      message: 'Nao foi possivel obter lock para criar atividade.'
    };
  }

  var creation;
  try {
    var ss = atividadesV2_getDatabaseSpreadsheetDev_();
    var atividadesSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES);
    atividadesV2_applyHeadersIfMissing_(atividadesSheet, ATIVIDADES_V2_SCHEMA.ATIVIDADES);
    creation = atividadesV2_montarCriacaoAtividadePreview_(validation.data, ctx, ss);
    atividadesV2_appendAtividadeV2Row_(atividadesSheet, creation.row);
    atividadesV2_logAtividadeCriadaPortal_(ss, creation, ctx);
    atividadesV2_appendPortalAcaoAtividadeCriada_(ss, creation, ctx);
  } catch (err) {
    return {
      ok: false,
      errorCode: err && (err.code || err.errorCode) || 'ERRO_CRIAR_ATIVIDADE',
      message: atividadesV2_errorMessage_(err)
    };
  } finally {
    lock.releaseLock();
  }

  var views = null;
  var avisos = [];
  try {
    views = atividadesV2_refreshViewsAfterActivityCreate_();
    atividadesV2_invalidateCachesAfterActivityCreate_(creation.idAtividade);
  } catch (postErr) {
    avisos.push('Atividade criada, mas houve falha ao atualizar views/cache: ' + atividadesV2_errorMessage_(postErr).slice(0, 300));
    Logger.log('GEAPA-ATIVIDADES-V2-PORTAL criar atividade: pos-processamento com erro: ' + atividadesV2_safeLogData_({
      idAtividade: creation.idAtividade,
      erro: atividadesV2_errorMessage_(postErr).slice(0, 300)
    }));
  }
  return atividadesV2_buildCriacaoAtividadeResponse_(false, creation, {
    dryRun: false,
    escrita: true,
    viewsAtualizadas: views,
    avisos: avisos
  });
}

function atividadesV2_runTesteCriarAtividadePortalDev_() {
  return atividadesV2_portalCriarAtividade_({
    dryRun: true,
    atividade: {
      tituloPublico: 'Atividade teste DEV',
      dataAtividade: '2026-06-25',
      horarioInicio: '18h45',
      horarioFim: '20h45',
      tipoAtividade: 'REUNIAO',
      subtipoAtividade: 'REUNIAO_ORDINARIA',
      formato: 'PRESENCIAL',
      local: 'Sala GEAPA',
      contaPresenca: 'SIM',
      contaFalta: 'SIM',
      geraCertificado: 'NAO',
      cargaHoraria: '2',
      exigeListaPresenca: 'SIM',
      permiteJustificativa: 'SIM'
    }
  }, {
    perfil: 'ADMIN_TECNICO',
    email: 'teste-dev@geapa.local'
  });
}

function atividadesV2_canCreateActivityFromPortal_(contexto) {
  var perfil = atividades_normalizeTextUpper_(contexto && contexto.perfil);
  return ['DIRETORIA', 'SECRETARIO', 'ADMIN_TECNICO'].indexOf(perfil) >= 0;
}

function atividadesV2_normalizarPayloadCriacaoAtividade_(payload) {
  var p = payload || {};
  var fieldErrors = {};
  var tituloPublico = atividades_sanitizePortalText_(atividadesV2_pickPayloadValue_(p, ['tituloPublico', 'titulo', 'TITULO_PUBLICO', 'TITULO']), 240);
  var descricaoPublica = atividades_sanitizePortalText_(atividadesV2_pickPayloadValue_(p, ['descricaoPublica', 'descricao', 'DESCRICAO_PUBLICA', 'DESCRICAO']), 1000);
  var dataAtividade = atividades_parseDateOrNull_(atividadesV2_pickPayloadValue_(p, ['dataAtividade', 'DATA_ATIVIDADE', 'data']));
  var horarioInicioRaw = atividadesV2_pickPayloadValue_(p, ['horarioInicio', 'HORARIO_INICIO', 'inicio']);
  var horarioFimRaw = atividadesV2_pickPayloadValue_(p, ['horarioFim', 'HORARIO_FIM', 'fim']);
  var inicioMinutes = atividades_parseTimeValueToMinutes_(horarioInicioRaw);
  var fimMinutes = atividades_parseTimeValueToMinutes_(horarioFimRaw);
  var tipoAtividade = atividades_normalizeTextUpper_(atividadesV2_pickPayloadValue_(p, ['tipoAtividade', 'TIPO_ATIVIDADE']));
  var subtipoAtividade = atividades_normalizeTextUpper_(atividadesV2_pickPayloadValue_(p, ['subtipoAtividade', 'SUBTIPO_ATIVIDADE']));
  var formato = atividades_normalizeTextUpper_(atividadesV2_pickPayloadValue_(p, ['formato', 'FORMATO']));
  var local = atividades_sanitizePortalText_(atividadesV2_pickPayloadValue_(p, ['local', 'LOCAL']), 180);
  var cargaHoraria = atividadesV2_parsePositiveNumber_(atividadesV2_pickPayloadValue_(p, ['cargaHoraria', 'CARGA_HORARIA']));

  if (!tituloPublico) fieldErrors.tituloPublico = 'Informe o titulo da atividade.';
  if (!dataAtividade) fieldErrors.dataAtividade = 'Informe uma data valida.';
  if (inicioMinutes === null) fieldErrors.horarioInicio = 'Informe um horario de inicio valido.';
  if (fimMinutes === null) fieldErrors.horarioFim = 'Informe um horario de fim valido.';
  if (inicioMinutes !== null && fimMinutes !== null && fimMinutes <= inicioMinutes) {
    fieldErrors.horarioFim = 'O horario de fim deve ser posterior ao inicio.';
  }
  if (!tipoAtividade) fieldErrors.tipoAtividade = 'Informe o tipo de atividade.';
  if (!subtipoAtividade) fieldErrors.subtipoAtividade = 'Informe o subtipo de atividade.';
  if (!formato) fieldErrors.formato = 'Informe o formato.';
  if (!local) fieldErrors.local = 'Informe o local.';
  if (cargaHoraria === null) fieldErrors.cargaHoraria = 'Informe carga horaria numerica positiva.';

  var contaPresenca = atividadesV2_normalizarSimNaoObrigatorio_(p, ['contaPresenca', 'CONTA_PRESENCA'], 'contaPresenca', fieldErrors);
  var contaFalta = atividadesV2_normalizarSimNaoObrigatorio_(p, ['contaFalta', 'CONTA_FALTA'], 'contaFalta', fieldErrors);
  var geraCertificado = atividadesV2_normalizarSimNaoObrigatorio_(p, ['geraCertificado', 'GERA_CERTIFICADO'], 'geraCertificado', fieldErrors);
  var exigeListaPresenca = atividadesV2_normalizarSimNaoObrigatorio_(p, ['exigeListaPresenca', 'EXIGE_LISTA_PRESENCA'], 'exigeListaPresenca', fieldErrors);
  var permiteJustificativa = atividadesV2_normalizarSimNaoObrigatorio_(p, ['permiteJustificativa', 'PERMITE_JUSTIFICATIVA'], 'permiteJustificativa', fieldErrors);

  var classificacaoAcesso = atividadesV2_normalizarValorLista_(
    atividadesV2_pickPayloadValue_(p, ['classificacaoAcesso', 'CLASSIFICACAO_ACESSO']),
    ['INTERNA', 'PUBLICA', 'RESTRITA', 'RESTRITA_MEMBROS', 'ABERTA', 'MEMBROS', 'DIRETORIA'],
    'INTERNA'
  );
  if (!classificacaoAcesso) fieldErrors.classificacaoAcesso = 'Classificacao de acesso invalida.';

  if (Object.keys(fieldErrors).length) {
    return { ok: false, fieldErrors: fieldErrors };
  }

  return {
    ok: true,
    data: {
      tituloPublico: tituloPublico,
      descricaoPublica: descricaoPublica,
      dataAtividade: dataAtividade,
      horarioInicio: atividadesV2_minutesToPortalTime_(inicioMinutes),
      horarioFim: atividadesV2_minutesToPortalTime_(fimMinutes),
      tipoAtividade: tipoAtividade,
      subtipoAtividade: subtipoAtividade,
      formato: formato,
      local: local,
      contaPresenca: contaPresenca,
      contaFalta: contaFalta,
      geraCertificado: geraCertificado,
      cargaHoraria: cargaHoraria,
      exigeListaPresenca: exigeListaPresenca,
      permiteJustificativa: permiteJustificativa,
      descricao: atividades_sanitizePortalText_(atividadesV2_pickPayloadValue_(p, ['descricaoInterna', 'DESCRICAO']), 1000),
      eixoTematicoPrincipal: atividades_sanitizePortalText_(atividadesV2_pickPayloadValue_(p, ['eixoTematicoPrincipal', 'EIXO_TEMATICO_PRINCIPAL']), 180),
      eixoTematicoSecundario: atividades_sanitizePortalText_(atividadesV2_pickPayloadValue_(p, ['eixoTematicoSecundario', 'EIXO_TEMATICO_SECUNDARIO']), 180),
      idPessoaPrincipal: atividadesV2_sanitizeIdToken_(atividadesV2_pickPayloadValue_(p, ['idPessoaPrincipal', 'ID_PESSOA_PRINCIPAL'])),
      nomePessoaPrincipalPublico: atividades_sanitizePortalText_(atividadesV2_pickPayloadValue_(p, ['nomePessoaPrincipalPublico', 'pessoaPrincipal', 'NOME_PESSOA_PRINCIPAL_PUBLICO']), 180),
      rgaPessoaPrincipal: atividadesV2_sanitizeIdToken_(atividadesV2_pickPayloadValue_(p, ['rgaPessoaPrincipal', 'RGA_PESSOA_PRINCIPAL'])),
      emailPessoaPrincipal: atividades_normalizeTextLower_(atividadesV2_pickPayloadValue_(p, ['emailPessoaPrincipal', 'EMAIL_PESSOA_PRINCIPAL'])),
      tipoPessoaPrincipal: atividades_normalizeTextUpper_(atividadesV2_pickPayloadValue_(p, ['tipoPessoaPrincipal', 'TIPO_PESSOA_PRINCIPAL'])),
      papelPessoaPrincipal: atividades_normalizeTextUpper_(atividadesV2_pickPayloadValue_(p, ['papelPessoaPrincipal', 'PAPEL_PESSOA_PRINCIPAL'])),
      instituicaoPessoaPrincipal: atividades_sanitizePortalText_(atividadesV2_pickPayloadValue_(p, ['instituicaoPessoaPrincipal', 'INSTITUICAO_PESSOA_PRINCIPAL']), 180),
      responsavelInterno: atividades_sanitizePortalText_(atividadesV2_pickPayloadValue_(p, ['responsavelInterno', 'RESPONSAVEL_INTERNO']), 180),
      responsavelEmail: atividades_normalizeTextLower_(atividadesV2_pickPayloadValue_(p, ['responsavelEmail', 'RESPONSAVEL_EMAIL'])),
      publicoAlvo: atividades_sanitizePortalText_(atividadesV2_pickPayloadValue_(p, ['publicoAlvo', 'PUBLICO_ALVO']), 180),
      observacoes: atividades_sanitizePortalText_(atividadesV2_pickPayloadValue_(p, ['observacoes', 'observacoesInternas', 'OBSERVACOES']), 800),
      classificacaoAcesso: classificacaoAcesso,
      exigeConvocacao: atividadesV2_normalizarSimNaoOpcional_(p, ['exigeConvocacao', 'EXIGE_CONVOCACAO'], 'NAO'),
      exigeLembrete: atividadesV2_normalizarSimNaoOpcional_(p, ['exigeLembrete', 'EXIGE_LEMBRETE'], 'SIM'),
      exigeAta: atividadesV2_normalizarSimNaoOpcional_(p, ['exigeAta', 'EXIGE_ATA'], 'NAO'),
      exigeMaterial: atividadesV2_normalizarSimNaoOpcional_(p, ['exigeMaterial', 'EXIGE_MATERIAL'], 'NAO'),
      exigeConfirmacaoPresenca: atividadesV2_normalizarSimNaoOpcional_(p, ['exigeConfirmacaoPresenca', 'EXIGE_CONFIRMACAO_PRESENCA'], 'NAO')
    }
  };
}

function atividadesV2_montarCriacaoAtividadePreview_(data, contexto, ss) {
  var identity = atividadesV2_buildNextActivityIdentityForCreate_(data.dataAtividade, ss);
  var now = new Date();
  var actor = atividadesV2_portalActorToken_(contexto);
  var hasEixo = !!String(data.eixoTematicoPrincipal || data.eixoTematicoSecundario || '').trim();
  var row = {
    ID_ATIVIDADE: identity.idAtividade,
    CICLO: 'GEAPA_' + identity.ano,
    ANO: identity.ano,
    SEMESTRE: identity.semestre,
    NUMERO_SEQUENCIAL_NO_CICLO: identity.sequencial,
    CLASSIFICACAO_REUNIAO: '',
    TIPO_ATIVIDADE: data.tipoAtividade,
    SUBTIPO_ATIVIDADE: data.subtipoAtividade,
    CLASSIFICACAO_ACESSO: data.classificacaoAcesso,
    TITULO: data.tituloPublico,
    TITULO_PUBLICO: data.tituloPublico,
    DESCRICAO: data.descricao || data.descricaoPublica,
    DESCRICAO_PUBLICA: data.descricaoPublica,
    EIXO_TEMATICO_PRINCIPAL: data.eixoTematicoPrincipal,
    EIXO_TEMATICO_SECUNDARIO: data.eixoTematicoSecundario,
    STATUS_EIXO_TEMATICO: hasEixo ? 'PENDENTE' : '',
    ID_PESSOA_PRINCIPAL: data.idPessoaPrincipal,
    NOME_PESSOA_PRINCIPAL_PUBLICO: data.nomePessoaPrincipalPublico,
    RGA_PESSOA_PRINCIPAL: data.rgaPessoaPrincipal,
    EMAIL_PESSOA_PRINCIPAL: data.emailPessoaPrincipal,
    TIPO_PESSOA_PRINCIPAL: data.tipoPessoaPrincipal,
    PAPEL_PESSOA_PRINCIPAL: data.papelPessoaPrincipal,
    INSTITUICAO_PESSOA_PRINCIPAL: data.instituicaoPessoaPrincipal,
    DATA_ATIVIDADE: data.dataAtividade,
    HORARIO_INICIO: data.horarioInicio,
    HORARIO_FIM: data.horarioFim,
    LOCAL: data.local,
    FORMATO: data.formato,
    RESPONSAVEL_INTERNO: data.responsavelInterno,
    RESPONSAVEL_EMAIL: data.responsavelEmail,
    PUBLICO_ALVO: data.publicoAlvo,
    OBRIGATORIA: data.contaFalta === 'SIM' ? 'SIM' : 'NAO',
    EXIGE_CONVOCACAO: data.exigeConvocacao,
    EXIGE_LEMBRETE: data.exigeLembrete,
    EXIGE_ATA: data.exigeAta,
    EXIGE_MATERIAL: data.exigeMaterial,
    EXIGE_LISTA_PRESENCA: data.exigeListaPresenca,
    EXIGE_CONFIRMACAO_PRESENCA: data.exigeConfirmacaoPresenca,
    CONTA_PRESENCA: data.contaPresenca,
    CONTA_FALTA: data.contaFalta,
    GERA_CERTIFICADO: data.geraCertificado,
    CARGA_HORARIA: data.cargaHoraria,
    STATUS_OPERACIONAL: 'PLANEJADA',
    STATUS_PUBLICACAO_PORTAL: 'RASCUNHO',
    VISIBILIDADE_PORTAL: 'DIRETORIA',
    ORIGEM_FLUXO: 'PORTAL_GESTAO_ATIVIDADES',
    CRIADO_POR: actor,
    CRIADO_EM: now,
    ATUALIZADO_POR: actor,
    ATUALIZADO_EM: now,
    BLOQUEADO_PARA_EDICAO: 'NAO',
    OBSERVACOES: atividadesV2_buildCreateActivityObservacoes_(data),
    ATIVO: 'SIM'
  };
  return {
    idAtividade: identity.idAtividade,
    row: row,
    rotuloSemestre: identity.ano + '/' + identity.semestre,
    payloadNormalizado: data
  };
}

function atividadesV2_buildNextActivityIdentityForCreate_(dataAtividade, ss) {
  var date = atividades_parseDateOrNull_(dataAtividade);
  var ano = String(date.getFullYear());
  var semestre = date.getMonth() <= 5 ? '1' : '2';
  var maxSeq = 0;
  var existingIds = {};

  if (ss) {
    var sheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES);
    atividadesV2_readSheetObjects_(sheet).forEach(function(record) {
      var id = String(record.ID_ATIVIDADE || '').trim().toUpperCase();
      if (id) existingIds[id] = true;
      var idMatch = id.match(/^ATV-(\d{4})-([12])-(\d{4})$/);
      if (idMatch && idMatch[1] === ano && idMatch[2] === semestre) {
        maxSeq = Math.max(maxSeq, Number(idMatch[3]) || 0);
      }
      if (String(record.ANO || '').trim() === ano && String(record.SEMESTRE || '').trim() === semestre) {
        maxSeq = Math.max(maxSeq, Number(record.NUMERO_SEQUENCIAL_NO_CICLO) || 0);
      }
    });
  }

  var seq = maxSeq + 1;
  var idAtividade = atividadesV2_gerarIdAtividade_(ano, semestre, seq);
  while (existingIds[idAtividade]) {
    seq++;
    idAtividade = atividadesV2_gerarIdAtividade_(ano, semestre, seq);
  }
  return {
    ano: ano,
    semestre: semestre,
    sequencial: atividadesV2_padSequence_(seq),
    idAtividade: idAtividade
  };
}

function atividadesV2_appendAtividadeV2Row_(sheet, row) {
  var headers = atividadesV2_getSheetHeaders_(sheet).filter(function(header) { return !!header; });
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, headers.length).setValues([
    atividadesV2_recordToHeaderRow_(row, headers)
  ]);
}

function atividadesV2_logAtividadeCriadaPortal_(ss, creation, contexto) {
  atividadesV2_appendV2Log_(ss, {
    FLUXO: 'PORTAL_ATIVIDADES_GESTAO_DEV',
    ACAO: 'Criar atividade pelo Portal',
    NIVEL: 'INFO',
    STATUS: 'OK',
    ID_ATIVIDADE: creation.idAtividade,
    MENSAGEM: 'Atividade criada pelo Portal em modo rascunho.',
    DETALHES_JSON: atividadesV2_safeLogData_({
      idAtividade: creation.idAtividade,
      tituloPublico: creation.row.TITULO_PUBLICO,
      statusOperacional: creation.row.STATUS_OPERACIONAL,
      statusPublicacaoPortal: creation.row.STATUS_PUBLICACAO_PORTAL,
      visibilidadePortal: creation.row.VISIBILIDADE_PORTAL,
      criadoPor: atividadesV2_portalActorToken_(contexto)
    })
  });
}

function atividadesV2_appendPortalAcaoAtividadeCriada_(ss, creation, contexto) {
  var now = new Date();
  atividadesV2_portalAppendAcao_(ss, {
    ID_ACAO_PORTAL: atividadesV2_buildDeterministicId_('AACT', ['ATIVIDADE_CRIADA', creation.idAtividade, now.getTime()]),
    DATA_HORA: now,
    USUARIO_EMAIL: contexto.email || '',
    USUARIO_NOME: contexto.nome || '',
    PERFIL_USUARIO: contexto.perfil || '',
    TIPO_ACAO: 'ATIVIDADE_CRIADA',
    ID_ATIVIDADE: creation.idAtividade,
    ID_ENTIDADE: creation.idAtividade,
    TIPO_ENTIDADE: 'ATIVIDADE',
    PAYLOAD_JSON: atividadesV2_safeLogData_({
      idAtividade: creation.idAtividade,
      tituloPublico: creation.row.TITULO_PUBLICO,
      statusOperacional: creation.row.STATUS_OPERACIONAL,
      statusPublicacaoPortal: creation.row.STATUS_PUBLICACAO_PORTAL,
      visibilidadePortal: creation.row.VISIBILIDADE_PORTAL,
      origem: 'PORTAL_GESTAO_ATIVIDADES'
    }),
    STATUS_PROCESSAMENTO: 'CONCLUIDO',
    RESULTADO_JSON: atividadesV2_safeLogData_({ ok: true, idAtividade: creation.idAtividade }),
    ERRO_CODIGO: '',
    ERRO_MENSAGEM: '',
    PROCESSADO_EM: now,
    PROCESSADO_POR: atividadesV2_portalActorToken_(contexto),
    OBSERVACOES: 'Atividade criada como rascunho pelo Portal GEAPA DEV.',
    ATIVO: 'SIM'
  });
}

function atividadesV2_refreshViewsAfterActivityCreate_() {
  var result = {
    calendario: atividadesV2_atualizarPortalCalendario_({ dryRun: false }),
    detalhes: atividadesV2_atualizarPortalDetalhes_({ dryRun: false }),
    status: atividadesV2_atualizarPortalStatus_({ dryRun: false })
  };
  Logger.log('GEAPA-ATIVIDADES-V2-PORTAL atividade criada: views atualizadas: ' + atividadesV2_safeLogData_({
    calendarioOk: result.calendario && result.calendario.ok,
    detalhesOk: result.detalhes && result.detalhes.ok,
    statusOk: result.status && result.status.ok
  }));
  return result;
}

function atividadesV2_invalidateCachesAfterActivityCreate_(idAtividade) {
  if (typeof atividadesV2_limparCachePortalDev_ === 'function') atividadesV2_limparCachePortalDev_();
  if (idAtividade && typeof atividadesV2_invalidateChamadaCacheByActivity_ === 'function') {
    atividadesV2_invalidateChamadaCacheByActivity_(idAtividade, { keepActivity: false });
  }
}

function atividadesV2_buildCriacaoAtividadeResponse_(dryRun, creation, meta) {
  return {
    ok: true,
    message: dryRun ? 'Previa de atividade validada.' : 'Atividade criada como rascunho.',
    data: {
      idAtividade: creation.idAtividade,
      tituloPublico: creation.row.TITULO_PUBLICO,
      dataAtividade: atividades_formatPortalDateIso_(creation.row.DATA_ATIVIDADE),
      horarioInicio: creation.row.HORARIO_INICIO,
      horarioFim: creation.row.HORARIO_FIM,
      statusOperacional: creation.row.STATUS_OPERACIONAL,
      statusPublicacaoPortal: creation.row.STATUS_PUBLICACAO_PORTAL,
      visibilidadePortal: creation.row.VISIBILIDADE_PORTAL,
      rotuloSemestre: creation.rotuloSemestre,
      linhaPreview: creation.row,
      dryRun: dryRun
    },
    meta: meta || {}
  };
}

function atividadesV2_pickPayloadValue_(payload, aliases) {
  for (var i = 0; i < aliases.length; i++) {
    if (Object.prototype.hasOwnProperty.call(payload || {}, aliases[i])) return payload[aliases[i]];
  }
  return '';
}

function atividadesV2_normalizarSimNaoObrigatorio_(payload, aliases, fieldName, fieldErrors) {
  var raw = atividadesV2_pickPayloadValue_(payload, aliases);
  var value = atividadesV2_normalizarSimNaoValor_(raw);
  if (!value) fieldErrors[fieldName] = 'Informe SIM ou NAO.';
  return value;
}

function atividadesV2_normalizarSimNaoOpcional_(payload, aliases, fallback) {
  return atividadesV2_normalizarSimNaoValor_(atividadesV2_pickPayloadValue_(payload, aliases)) || fallback;
}

function atividadesV2_normalizarSimNaoValor_(value) {
  var text = atividades_normalizeTextUpper_(value);
  if (['SIM', 'S', 'TRUE', '1', 'YES'].indexOf(text) >= 0) return 'SIM';
  if (['NAO', 'N', 'FALSE', '0', 'NO'].indexOf(text) >= 0) return 'NAO';
  if (value === true) return 'SIM';
  if (value === false) return 'NAO';
  return '';
}

function atividadesV2_normalizarValorLista_(value, allowed, fallback) {
  var raw = String(value || '').trim();
  if (!raw && fallback) return fallback;
  var text = atividades_normalizeTextUpper_(raw);
  return allowed.indexOf(text) >= 0 ? text : '';
}

function atividadesV2_parsePositiveNumber_(value) {
  var text = String(value === null || value === undefined ? '' : value).trim().replace(',', '.');
  var parsed = Number(text);
  return isFinite(parsed) && parsed > 0 ? parsed : null;
}

function atividadesV2_minutesToPortalTime_(minutes) {
  return atividades_pad2_(Math.floor(minutes / 60)) + 'h' + atividades_pad2_(minutes % 60);
}

function atividadesV2_buildCreateActivityObservacoes_(data) {
  var parts = [];
  if (data.observacoes) parts.push(data.observacoes);
  parts.push('Criada pelo Portal GEAPA em modo rascunho.');
  parts.push('Permite justificativa: ' + data.permiteJustificativa + '.');
  return atividades_sanitizePortalText_(parts.join(' '), 1000);
}
