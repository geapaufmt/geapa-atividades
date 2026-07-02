/**
 * Criacao de atividades por modelos homologados do Atividades_Config.
 *
 * O Portal envia apenas ID_CONFIG e dados concretos da ocorrencia. Regras
 * institucionais sao sempre relidas e aplicadas pelo backend na base v2 DEV.
 */

var ATIVIDADES_MODELO_ACTIVITY_SCHEMA_HEADERS_ = Object.freeze([
  'ID_CONFIG_MODELO',
  'NOME_MODELO_PORTAL_SNAPSHOT',
  'VERSAO_CONFIG_MODELO',
  'TEM_EXCECAO_CONFIG',
  'STATUS_EXCECAO_CONFIG',
  'JUSTIFICATIVA_EXCECAO_CONFIG',
  'PERMITE_JUSTIFICATIVA',
  'EXIGE_EIXO_TEMATICO',
  'PERMITE_EIXO_SECUNDARIO'
]);

var ATIVIDADES_MODELO_CACHE_TTL_SECONDS_ = 300;
var ATIVIDADES_MODELO_CONFIRMATION_TTL_SECONDS_ = 600;
var ATIVIDADES_MODELO_CICLOS_EXECUTION_CACHE_ = null;

function atividades_listarModelosCriacaoPortal_(contexto) {
  var ctx = atividades_normalizePortalContext_(contexto || {});
  var permission = atividades_modelosCriacaoValidateBasePermission_(ctx);
  if (!permission.ok) return permission;

  var cacheKey = atividades_modelosCriacaoListCacheKey_(ctx);
  var cached = portalCacheGetJson_(cacheKey);
  if (cached) return cached;

  try {
    var ss = atividadesV2_getDatabaseSpreadsheetDev_();
    var rows = atividades_modelosCriacaoReadConfigRows_(ss);
    var models = rows.filter(function(model) {
      return atividades_modelosCriacaoIsEnabled_(model) &&
        atividades_modelosCriacaoProfileAllowed_(model, ctx);
    }).map(atividades_modelosCriacaoToSafeModel_);

    models.sort(function(a, b) {
      var groupCompare = String(a.grupoModelo || '').localeCompare(String(b.grupoModelo || ''), 'pt-BR');
      if (groupCompare) return groupCompare;
      var orderCompare = atividades_modelosCriacaoOrder_(a.ordemExibicao) - atividades_modelosCriacaoOrder_(b.ordemExibicao);
      if (orderCompare) return orderCompare;
      return String(a.nomeModeloPortal || '').localeCompare(String(b.nomeModeloPortal || ''), 'pt-BR');
    });

    var response = {
      ok: true,
      data: {
        modelos: models,
        grupos: atividades_modelosCriacaoBuildGroups_(models),
        total: models.length,
        ambiente: 'DEV',
        ultimaAtualizacao: atividades_modelosCriacaoLatestUpdate_(rows)
      },
      avisos: models.length ? [] : ['Nenhum modelo homologado esta disponivel para este perfil.']
    };
    portalCachePutJson_(cacheKey, response, ATIVIDADES_MODELO_CACHE_TTL_SECONDS_);
    return response;
  } catch (err) {
    return atividades_modelosCriacaoError_('ERRO_LISTAR_MODELOS_ATIVIDADE', 'Nao foi possivel carregar os modelos de atividade.', err);
  }
}

function atividades_obterModeloCriacaoPortal_(idConfig, contexto) {
  var ctx = atividades_normalizePortalContext_(contexto || {});
  var permission = atividades_modelosCriacaoValidateBasePermission_(ctx);
  if (!permission.ok) return permission;
  var wanted = String(idConfig || '').trim();
  if (!wanted) return atividades_modelosCriacaoError_('ID_CONFIG_OBRIGATORIO', 'Informe o modelo da atividade.');

  try {
    var ss = atividadesV2_getDatabaseSpreadsheetDev_();
    var model = atividades_modelosCriacaoFindConfig_(atividades_modelosCriacaoReadConfigRows_(ss), wanted);
    var validation = atividades_modelosCriacaoValidateModelAccess_(model, ctx);
    if (!validation.ok) return validation;
    return {
      ok: true,
      data: {
        modelo: atividades_modelosCriacaoToSafeModel_(model),
        ambiente: 'DEV'
      },
      avisos: []
    };
  } catch (err) {
    return atividades_modelosCriacaoError_('ERRO_OBTER_MODELO_ATIVIDADE', 'Nao foi possivel carregar o modelo solicitado.', err);
  }
}

function atividades_listarMembrosApresentadoresElegiveis_(idConfig, referencia, contexto) {
  var ctx = atividades_normalizePortalContext_(contexto || {});
  var permission = atividades_modelosCriacaoValidateBasePermission_(ctx);
  if (!permission.ok) return permission;

  try {
    var ss = atividadesV2_getDatabaseSpreadsheetDev_();
    var model = atividades_modelosCriacaoFindConfig_(atividades_modelosCriacaoReadConfigRows_(ss), idConfig);
    var modelAccess = atividades_modelosCriacaoValidateModelAccess_(model, ctx);
    if (!modelAccess.ok) return modelAccess;
    if (!atividades_modelosCriacaoIsMemberPresentation_(model)) {
      return atividades_modelosCriacaoError_(
        'MODELO_NAO_E_APRESENTACAO_MEMBRO',
        'A listagem de membros apresentadores e exclusiva de APRESENTACAO_MEMBRO.'
      );
    }

    var cycle = atividades_modelosCriacaoResolverCicloReferencia_(referencia);
    var cacheKey = atividades_modelosCriacaoPresenterCacheKey_(cycle);
    var cached = portalCacheGetJson_(cacheKey);
    if (cached) return cached;

    var result = atividades_modelosCriacaoBuildPresenterMembers_(ss, cycle);
    var response = {
      ok: true,
      data: {
        idConfig: String(model.ID_CONFIG || '').trim(),
        idCiclo: cycle.idCiclo,
        ciclo: cycle.ciclo,
        nomeCiclo: cycle.nomeCiclo,
        rotuloCiclo: cycle.rotuloCiclo,
        ano: cycle.ano,
        semestre: cycle.semestre,
        rotuloSemestre: cycle.rotuloSemestre,
        membros: result.members,
        total: result.members.length,
        totalElegiveis: result.members.filter(function(member) { return member.elegivelApresentacao; }).length,
        ambiente: 'DEV'
      },
      avisos: result.warnings
    };
    portalCachePutJson_(cacheKey, response, ATIVIDADES_MODELO_CACHE_TTL_SECONDS_);
    return response;
  } catch (err) {
    return atividades_modelosCriacaoError_(
      'ERRO_LISTAR_MEMBROS_APRESENTADORES',
      'Nao foi possivel carregar os membros apresentadores.',
      err
    );
  }
}

function atividades_validarCriacaoAtividadePorModelo_(payload, contexto) {
  var result = atividades_modelosCriacaoValidate_(payload || {}, contexto || {}, { emitirConfirmacao: true });
  if (result && result.meta) delete result.meta;
  return result;
}

function atividades_criarAtividadePorModelo_(payload, contexto) {
  var request = payload || {};
  if (request.dryRun !== false) {
    return atividades_validarCriacaoAtividadePorModelo_(request, contexto || {});
  }

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return atividades_modelosCriacaoError_('LOCK_INDISPONIVEL', 'Nao foi possivel obter lock para criar a atividade.');
  }

  var validated;
  var creation;
  try {
    validated = atividades_modelosCriacaoValidate_(request, contexto || {}, { emitirConfirmacao: false });
    if (!validated.ok) return validated;

    var tokenCheck = atividades_modelosCriacaoValidateConfirmation_(request.confirmacaoToken, validated.meta.fingerprint);
    if (!tokenCheck.ok) return tokenCheck;

    var ss = atividadesV2_getDatabaseSpreadsheetDev_();
    var sheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES);
    atividadesV2_applyHeadersIfMissing_(sheet, ATIVIDADES_V2_SCHEMA.ATIVIDADES);
    atividadesV2_applyHeadersIfMissing_(
      atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.APRESENTACOES),
      ATIVIDADES_V2_SCHEMA.APRESENTACOES
    );
    atividadesV2_applyHeadersIfMissing_(
      atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ENVOLVIDOS),
      ATIVIDADES_V2_SCHEMA.ENVOLVIDOS
    );
    creation = validated.meta.creation;
    atividadesV2_appendAtividadeV2Row_(sheet, creation.row);
    creation.apresentacao = atividades_modelosCriacaoAppendPresentationExtension_(ss, creation, validated.meta.model, validated.meta.contexto);
    creation.envolvido = atividades_modelosCriacaoAppendPresenterInvolvement_(ss, creation, validated.meta.model);
    atividades_modelosCriacaoAppendLogs_(ss, creation, validated.meta.model, validated.meta.contexto);
    portalCacheRemove_(atividades_modelosCriacaoConfirmationCacheKey_(request.confirmacaoToken));
  } catch (err) {
    return atividades_modelosCriacaoError_('ERRO_CRIAR_ATIVIDADE_POR_MODELO', 'Nao foi possivel criar a atividade pelo modelo.', err);
  } finally {
    lock.releaseLock();
  }

  var warnings = [];
  var views = null;
  try {
    views = atividadesV2_refreshViewsAfterActivityCreate_({
      idAtividade: creation.idAtividade,
      reason: 'ATIVIDADE_CRIADA_POR_MODELO',
      contexto: validated.meta.contexto
    });
    atividadesV2_invalidateCachesAfterActivityCreate_(creation.idAtividade, creation.row);
  } catch (postErr) {
    warnings.push('Atividade criada, mas houve falha ao atualizar views/cache. Execute a atualizacao manual das views.');
    Logger.log('GEAPA-ATIVIDADES-V2-MODELOS pos-processamento: ' + atividadesV2_safeLogData_({
      idAtividade: creation.idAtividade,
      erro: atividadesV2_errorMessage_(postErr).slice(0, 300)
    }));
  }

  return {
    ok: true,
    message: 'Atividade criada pelo modelo homologado como rascunho.',
    data: atividades_modelosCriacaoBuildResponseData_(creation, validated.meta.safeModel),
    meta: {
      dryRun: false,
      escrita: true,
      ambiente: 'DEV',
      viewsAtualizadas: views,
      avisos: warnings
    }
  };
}

function atividades_migrarSchemaAtividadesParaModeloConfig_(options) {
  options = options || {};
  var dryRun = options.dryRun !== false;
  var lock = null;
  if (!dryRun) {
    lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) throw new Error('Nao foi possivel obter lock para migrar o schema de Atividades.');
  }

  try {
    var ss = atividadesV2_getDatabaseSpreadsheetDev_();
    var sheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES);
    var existing = atividades_modelosCriacaoHeaderSet_(sheet);
    var missing = ATIVIDADES_MODELO_ACTIVITY_SCHEMA_HEADERS_.filter(function(header) {
      return !existing[String(header).toUpperCase()];
    });
    var result = {
      ok: true,
      dryRun: dryRun,
      ambiente: 'DEV',
      aba: sheet.getName(),
      colunasAusentes: missing.slice(),
      colunasAdicionadas: [],
      colunasJaExistentes: ATIVIDADES_MODELO_ACTIVITY_SCHEMA_HEADERS_.filter(function(header) {
        return !!existing[String(header).toUpperCase()];
      }),
      avisos: [],
      erros: []
    };
    if (dryRun) return result;

    atividades_configModelosAppendHeaders_(sheet, missing);
    result.colunasAdicionadas = missing.slice();
    result.colunasAusentes = [];
    atividadesV2_appendV2Log_(ss, {
      FLUXO: 'SETUP_V1',
      ACAO: 'MIGRAR_SCHEMA_ATIVIDADES_MODELO_CONFIG',
      NIVEL: 'INFO',
      STATUS: 'CONCLUIDO',
      MENSAGEM: 'Schema de rastreabilidade de modelo adicionado/validado em Atividades DEV.',
      DETALHES_JSON: JSON.stringify({ colunasAdicionadas: missing.length })
    });
    if (!missing.length) result.avisos.push('O schema de Atividades ja estava preparado para modelos.');
    return result;
  } finally {
    if (lock) lock.releaseLock();
  }
}

function atividades_modelosCriacaoValidate_(payload, contexto, options) {
  options = options || {};
  var request = payload || {};
  var occurrencePayload = request.atividade || request.ocorrencia || request;
  var ctx = atividades_normalizePortalContext_(contexto || {});
  var permission = atividades_modelosCriacaoValidateBasePermission_(ctx);
  if (!permission.ok) return permission;

  var idConfig = String(
    request.idConfig || request.ID_CONFIG || occurrencePayload.idConfig || occurrencePayload.ID_CONFIG || ''
  ).trim();
  if (!idConfig) return atividades_modelosCriacaoError_('ID_CONFIG_OBRIGATORIO', 'Selecione um modelo homologado.');

  try {
    var ss = atividadesV2_getDatabaseSpreadsheetDev_();
    var model = atividades_modelosCriacaoFindConfig_(atividades_modelosCriacaoReadConfigRows_(ss), idConfig);
    var modelAccess = atividades_modelosCriacaoValidateModelAccess_(model, ctx);
    if (!modelAccess.ok) return modelAccess;

    var normalized = atividades_modelosCriacaoNormalizeOccurrence_(occurrencePayload, model);
    if (!normalized.ok) {
      return {
        ok: false,
        errorCode: 'VALIDACAO_ATIVIDADE_MODELO',
        message: 'Revise os dados da ocorrencia.',
        fieldErrors: normalized.fieldErrors,
        mensagens: normalized.mensagens,
        avisos: normalized.avisos,
        excecaoNecessaria: false,
        camposDivergentes: []
      };
    }

    var presenterPolicy = atividades_modelosCriacaoApplyPresenterPolicy_(ss, model, normalized.data);
    if (!presenterPolicy.ok) {
      if (presenterPolicy.excecaoNecessaria) {
        var presenterException = atividades_modelosCriacaoBuildExceptionMeta_(model, [presenterPolicy]);
        return {
          ok: false,
          errorCode: 'EXCECAO_NECESSARIA',
          message: 'O membro selecionado ja possui apresentacao marcada no ciclo. Esta alteracao exige fluxo de excecao.',
          mensagens: [],
          avisos: [],
          modeloAplicado: atividades_modelosCriacaoToSafeModel_(model),
          camposDaOcorrencia: normalized.data,
          excecoesDetectadas: [presenterPolicy],
          excecaoNecessaria: true,
          camposDivergentes: ['ID_PESSOA_PRINCIPAL'],
          aprovacaoExigida: presenterException.aprovacaoExigida,
          perfisAprovadores: presenterException.perfisAprovadores,
          qtdAprovadores: presenterException.qtdAprovadores
        };
      }
      return {
        ok: false,
        errorCode: presenterPolicy.errorCode || 'MEMBRO_APRESENTADOR_INVALIDO',
        message: presenterPolicy.message || 'Membro apresentador invalido.',
        fieldErrors: { idPessoaPrincipal: presenterPolicy.message || 'Selecione um membro elegivel.' },
        mensagens: [],
        avisos: [],
        excecaoNecessaria: false,
        camposDivergentes: []
      };
    }

    var inherited = atividades_modelosCriacaoBuildInheritedFields_(model, normalized.data);
    var divergences = atividades_modelosCriacaoDetectSensitiveDivergences_(occurrencePayload, inherited);
    var exceptionMeta = atividades_modelosCriacaoBuildExceptionMeta_(model, divergences);
    if (divergences.length) {
      return {
        ok: false,
        errorCode: 'EXCECAO_NECESSARIA',
        message: 'Esta alteracao exige fluxo de excecao e nao pode ser aplicada na criacao normal.',
        mensagens: [],
        avisos: [],
        modeloAplicado: atividades_modelosCriacaoToSafeModel_(model),
        camposHerdados: inherited,
        camposDaOcorrencia: normalized.data,
        excecoesDetectadas: divergences,
        excecaoNecessaria: true,
        camposDivergentes: divergences.map(function(item) { return item.campo; }),
        aprovacaoExigida: exceptionMeta.aprovacaoExigida,
        perfisAprovadores: exceptionMeta.perfisAprovadores,
        qtdAprovadores: exceptionMeta.qtdAprovadores
      };
    }

    var safeModel = atividades_modelosCriacaoToSafeModel_(model);
    var creation = atividades_modelosCriacaoBuildPreview_(normalized.data, inherited, model, ctx, ss);
    var fingerprint = atividades_modelosCriacaoFingerprint_(idConfig, safeModel.versaoConfigModelo, normalized.data, inherited, ctx);
    var confirmationToken = options.emitirConfirmacao
      ? atividades_modelosCriacaoIssueConfirmation_(fingerprint)
      : '';
    if (options.emitirConfirmacao && !confirmationToken) {
      return atividades_modelosCriacaoError_(
        'CACHE_CONFIRMACAO_INDISPONIVEL',
        'Nao foi possivel registrar a confirmacao temporaria. Tente validar novamente.'
      );
    }

    return {
      ok: true,
      message: 'Criacao por modelo validada. Confirme para gravar o rascunho.',
      mensagens: ['Modelo homologado aplicado pelo backend.'],
      avisos: normalized.avisos.concat(creation.avisos || []),
      modeloAplicado: safeModel,
      camposHerdados: inherited,
      camposDaOcorrencia: normalized.data,
      excecoesDetectadas: [],
      excecaoNecessaria: false,
      camposDivergentes: [],
      aprovacaoExigida: exceptionMeta.aprovacaoExigida,
      perfisAprovadores: exceptionMeta.perfisAprovadores,
      qtdAprovadores: exceptionMeta.qtdAprovadores,
      atividadePreview: atividades_modelosCriacaoBuildResponseData_(creation, safeModel),
      confirmacaoToken: confirmationToken,
      dryRun: true,
      meta: {
        fingerprint: fingerprint,
        creation: creation,
        model: model,
        safeModel: safeModel,
        contexto: ctx
      }
    };
  } catch (err) {
    return atividades_modelosCriacaoError_('ERRO_VALIDAR_ATIVIDADE_POR_MODELO', 'Nao foi possivel validar a atividade pelo modelo.', err);
  }
}

function atividades_modelosCriacaoNormalizeOccurrence_(payload, model) {
  var p = payload || {};
  var fieldErrors = {};
  var warnings = [];
  var isMemberPresentation = atividades_modelosCriacaoIsMemberPresentation_(model);
  var title = atividades_sanitizePortalText_(atividadesV2_pickPayloadValue_(p, ['tituloPublico', 'TITULO_PUBLICO', 'titulo']), 240);
  var descriptionPublic = atividades_sanitizePortalText_(atividadesV2_pickPayloadValue_(p, ['descricaoPublica', 'DESCRICAO_PUBLICA']), 1500);
  var date = atividades_parseDateOrNull_(atividadesV2_pickPayloadValue_(p, ['dataAtividade', 'DATA_ATIVIDADE', 'data']));
  var startRaw = atividadesV2_pickPayloadValue_(p, ['horarioInicio', 'HORARIO_INICIO', 'inicio']);
  var endRaw = atividadesV2_pickPayloadValue_(p, ['horarioFim', 'HORARIO_FIM', 'fim']);
  var startMinutes = atividades_parseTimeValueToMinutes_(startRaw);
  var endMinutes = atividades_parseTimeValueToMinutes_(endRaw);
  var format = atividades_normalizeTextUpper_(atividadesV2_pickPayloadValue_(p, ['formato', 'FORMATO']));
  var location = atividades_sanitizePortalText_(atividadesV2_pickPayloadValue_(p, ['local', 'LOCAL']), 180);
  var requiresTitle = !isMemberPresentation && atividades_modelosCriacaoIsYes_(model.EXIGE_TITULO_PUBLICO);

  if (requiresTitle && !title) fieldErrors.tituloPublico = 'Informe o titulo publico exigido pelo modelo.';
  if (!date) fieldErrors.dataAtividade = 'Informe uma data valida.';
  if (startMinutes === null) fieldErrors.horarioInicio = 'Informe um horario de inicio valido.';
  if (endMinutes === null) fieldErrors.horarioFim = 'Informe um horario de fim valido.';
  if (startMinutes !== null && endMinutes !== null && endMinutes <= startMinutes) {
    fieldErrors.horarioFim = 'O horario de fim deve ser posterior ao inicio.';
  }
  if (['PRESENCIAL', 'REMOTO', 'HIBRIDO', 'HIBRIDA'].indexOf(format) < 0) fieldErrors.formato = 'Informe um formato valido.';
  if (!location) fieldErrors.local = 'Informe o local ou ambiente da atividade.';

  var mainAxis = atividades_sanitizePortalText_(atividadesV2_pickPayloadValue_(p, ['eixoTematicoPrincipal', 'EIXO_TEMATICO_PRINCIPAL']), 180);
  var secondaryAxis = atividades_sanitizePortalText_(atividadesV2_pickPayloadValue_(p, ['eixoTematicoSecundario', 'EIXO_TEMATICO_SECUNDARIO']), 180);
  if (!isMemberPresentation) {
    mainAxis = atividades_modelosCriacaoResolveOfficialAxis_(mainAxis, 'eixoTematicoPrincipal', fieldErrors);
    secondaryAxis = atividades_modelosCriacaoResolveOfficialAxis_(secondaryAxis, 'eixoTematicoSecundario', fieldErrors);
  }
  if (!isMemberPresentation && atividades_modelosCriacaoIsYes_(model.EXIGE_EIXO_TEMATICO) && !mainAxis) {
    if (!fieldErrors.eixoTematicoPrincipal) fieldErrors.eixoTematicoPrincipal = 'O modelo exige eixo tematico principal.';
  }
  if (!isMemberPresentation && !atividades_modelosCriacaoIsYes_(model.PERMITE_EIXO_SECUNDARIO) && secondaryAxis) {
    fieldErrors.eixoTematicoSecundario = 'O modelo nao permite eixo tematico secundario.';
  }
  if (!isMemberPresentation && mainAxis && secondaryAxis &&
      atividades_normalizarComparacaoApresentacoes_(mainAxis) === atividades_normalizarComparacaoApresentacoes_(secondaryAxis)) {
    fieldErrors.eixoTematicoSecundario = 'O eixo secundario deve ser diferente do eixo principal.';
  }
  if (isMemberPresentation && (title || descriptionPublic || mainAxis || secondaryAxis)) {
    warnings.push('Titulo, descricao e eixos enviados no agendamento foram ignorados; o membro informara esses dados depois.');
    title = '';
    descriptionPublic = '';
    mainAxis = '';
    secondaryAxis = '';
  }

  var person = atividades_modelosCriacaoNormalizePrincipalPerson_(p, model, fieldErrors);
  var defaultHours = atividadesV2_parsePositiveNumber_(model.CARGA_HORARIA_PADRAO);
  var derivedHours = startMinutes !== null && endMinutes !== null && endMinutes > startMinutes
    ? (endMinutes - startMinutes) / 60
    : null;
  var hours = defaultHours !== null ? defaultHours : derivedHours;
  if (hours === null || hours <= 0) fieldErrors.cargaHoraria = 'Nao foi possivel definir a carga horaria pelo modelo ou pelos horarios.';
  if (defaultHours === null && derivedHours !== null) warnings.push('Carga horaria calculada pelos horarios da ocorrencia.');

  if (Object.keys(fieldErrors).length) {
    return { ok: false, fieldErrors: fieldErrors, mensagens: [], avisos: warnings };
  }

  return {
    ok: true,
    fieldErrors: {},
    mensagens: [],
    avisos: warnings,
    data: {
      idConfig: String(model.ID_CONFIG || '').trim(),
      tituloPublico: title || atividades_sanitizePortalText_(model.NOME_MODELO_PORTAL || model.SUBTIPO_ATIVIDADE || 'Atividade do GEAPA', 240),
      descricaoPublica: descriptionPublic,
      descricaoInterna: atividades_sanitizePortalText_(atividadesV2_pickPayloadValue_(p, ['descricaoInterna', 'DESCRICAO']), 1500),
      dataAtividade: date,
      horarioInicio: atividadesV2_minutesToPortalTime_(startMinutes),
      horarioFim: atividadesV2_minutesToPortalTime_(endMinutes),
      formato: format === 'HIBRIDA' ? 'HIBRIDO' : format,
      local: location,
      cargaHoraria: hours,
      eixoTematicoPrincipal: mainAxis,
      eixoTematicoSecundario: secondaryAxis,
      idPessoaPrincipal: person.idPessoa,
      nomePessoaPrincipalPublico: person.nome,
      rgaPessoaPrincipal: person.rga,
      emailPessoaPrincipal: person.email,
      tipoPessoaPrincipal: person.tipo,
      instituicaoPessoaPrincipal: person.instituicao,
      responsavelInterno: atividades_sanitizePortalText_(atividadesV2_pickPayloadValue_(p, ['responsavelInterno', 'RESPONSAVEL_INTERNO']), 180),
      responsavelEmail: atividades_normalizeTextLower_(atividadesV2_pickPayloadValue_(p, ['responsavelEmail', 'RESPONSAVEL_EMAIL'])),
      publicoAlvo: atividades_sanitizePortalText_(atividadesV2_pickPayloadValue_(p, ['publicoAlvo', 'PUBLICO_ALVO']), 240),
      observacoes: atividades_sanitizePortalText_(atividadesV2_pickPayloadValue_(p, ['observacoes', 'observacoesInternas', 'OBSERVACOES']), 1000)
    }
  };
}

function atividades_modelosCriacaoResolveOfficialAxis_(value, fieldName, fieldErrors) {
  var raw = String(value || '').trim();
  if (!raw) return '';
  var entry = atividades_findEixoMapEntryApresentacoes_(raw);
  if (!entry) {
    fieldErrors[fieldName] = 'Selecione um eixo tematico oficial ativo.';
    return '';
  }
  return entry.canonico;
}

function atividades_modelosCriacaoNormalizePrincipalPerson_(payload, model, fieldErrors) {
  var required = atividades_modelosCriacaoIsYes_(model.EXIGE_PESSOA_PRINCIPAL);
  var isMemberPresentation = atividades_modelosCriacaoIsMemberPresentation_(model);
  var allowedTypes = isMemberPresentation ? ['MEMBRO'] : atividades_modelosCriacaoAllowedPrincipalTypes_(model);
  var type = atividades_normalizeTextUpper_(atividadesV2_pickPayloadValue_(payload, ['tipoPessoaPrincipal', 'TIPO_PESSOA_PRINCIPAL']));
  if (isMemberPresentation) type = 'MEMBRO';
  if (!type && allowedTypes.length === 1) type = allowedTypes[0];

  var idPessoa = atividadesV2_sanitizeIdToken_(atividadesV2_pickPayloadValue_(payload, ['idPessoaPrincipal', 'ID_PESSOA_PRINCIPAL']));
  var name = atividades_sanitizePortalText_(atividadesV2_pickPayloadValue_(payload, ['nomePessoaPrincipalPublico', 'pessoaPrincipal', 'NOME_PESSOA_PRINCIPAL_PUBLICO']), 180);
  var rga = atividadesV2_sanitizeIdToken_(atividadesV2_pickPayloadValue_(payload, ['rgaPessoaPrincipal', 'RGA_PESSOA_PRINCIPAL']));
  var email = atividades_normalizeTextLower_(atividadesV2_pickPayloadValue_(payload, ['emailPessoaPrincipal', 'EMAIL_PESSOA_PRINCIPAL']));
  var institution = atividades_sanitizePortalText_(atividadesV2_pickPayloadValue_(payload, ['instituicaoPessoaPrincipal', 'INSTITUICAO_PESSOA_PRINCIPAL']), 180);

  if (required && !idPessoa && !name) fieldErrors.pessoaPrincipal = 'O modelo exige uma pessoa principal.';
  if (required && allowedTypes.length > 1 && !type) fieldErrors.tipoPessoaPrincipal = 'Selecione o tipo da pessoa principal.';
  if (type && allowedTypes.length && allowedTypes.indexOf(type) < 0) fieldErrors.tipoPessoaPrincipal = 'Tipo de pessoa principal nao permitido pelo modelo.';
  if (type === 'MEMBRO' && required && !idPessoa) fieldErrors.idPessoaPrincipal = 'Selecione um membro identificado por ID_PESSOA.';
  if (atividades_modelosCriacaoIsYes_(model.EXIGE_EMAIL_PESSOA_PRINCIPAL) && !email) fieldErrors.emailPessoaPrincipal = 'O modelo exige e-mail da pessoa principal.';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.emailPessoaPrincipal = 'Informe um e-mail valido.';
  if (atividades_modelosCriacaoIsYes_(model.EXIGE_INSTITUICAO_PESSOA_PRINCIPAL) && !institution) {
    fieldErrors.instituicaoPessoaPrincipal = 'O modelo exige instituicao da pessoa principal.';
  }

  return { idPessoa: idPessoa, nome: name, rga: rga, email: email, tipo: type, instituicao: institution };
}

function atividades_modelosCriacaoBuildInheritedFields_(model, occurrence) {
  var isMemberPresentation = atividades_modelosCriacaoIsMemberPresentation_(model);
  return {
    ID_CONFIG_MODELO: String(model.ID_CONFIG || '').trim(),
    NOME_MODELO_PORTAL_SNAPSHOT: atividades_sanitizePortalText_(model.NOME_MODELO_PORTAL || model.SUBTIPO_ATIVIDADE || '', 240),
    VERSAO_CONFIG_MODELO: atividades_modelosCriacaoVersion_(model),
    CLASSIFICACAO_REUNIAO: atividades_normalizeTextUpper_(model.CLASSIFICACAO_REUNIAO),
    TIPO_ATIVIDADE: atividades_normalizeTextUpper_(model.TIPO_ATIVIDADE),
    SUBTIPO_ATIVIDADE: atividades_normalizeTextUpper_(model.SUBTIPO_ATIVIDADE),
    CLASSIFICACAO_ACESSO: atividades_normalizeTextUpper_(model.CLASSIFICACAO_ACESSO_PADRAO || 'INTERNA'),
    OBRIGATORIA: atividades_modelosCriacaoSimNao_(model.OBRIGATORIA_PADRAO, 'NAO'),
    EXIGE_CONVOCACAO: atividades_modelosCriacaoSimNao_(model.EXIGE_CONVOCACAO_PADRAO, 'NAO'),
    EXIGE_LEMBRETE: atividades_modelosCriacaoSimNao_(model.EXIGE_LEMBRETE_PADRAO, 'NAO'),
    EXIGE_ATA: atividades_modelosCriacaoSimNao_(model.EXIGE_ATA_PADRAO, 'NAO'),
    EXIGE_MATERIAL: atividades_modelosCriacaoSimNao_(model.EXIGE_MATERIAL_PADRAO, 'NAO'),
    EXIGE_LISTA_PRESENCA: atividades_modelosCriacaoSimNao_(model.EXIGE_LISTA_PRESENCA_PADRAO, 'NAO'),
    EXIGE_CONFIRMACAO_PRESENCA: atividades_modelosCriacaoSimNao_(model.EXIGE_CONFIRMACAO_PRESENCA_PADRAO, 'NAO'),
    CONTA_PRESENCA: atividades_modelosCriacaoSimNao_(model.CONTA_PRESENCA_PADRAO, 'NAO'),
    CONTA_FALTA: atividades_modelosCriacaoSimNao_(model.CONTA_FALTA_PADRAO, 'NAO'),
    PERMITE_JUSTIFICATIVA: atividades_modelosCriacaoSimNao_(model.PERMITE_JUSTIFICATIVA, 'NAO'),
    GERA_CERTIFICADO: atividades_modelosCriacaoSimNao_(model.GERA_CERTIFICADO_PADRAO, 'NAO'),
    CARGA_HORARIA: occurrence.cargaHoraria,
    STATUS_OPERACIONAL: 'PLANEJADA',
    STATUS_PUBLICACAO_PORTAL: atividades_modelosCriacaoInitialPublication_(model.STATUS_PUBLICACAO_PORTAL_PADRAO),
    VISIBILIDADE_PORTAL: atividades_modelosCriacaoInitialVisibility_(model.VISIBILIDADE_PORTAL_PADRAO),
    EXIGE_EIXO_TEMATICO: isMemberPresentation ? 'NAO' : atividades_modelosCriacaoSimNao_(model.EXIGE_EIXO_TEMATICO, 'NAO'),
    PERMITE_EIXO_SECUNDARIO: atividades_modelosCriacaoSimNao_(model.PERMITE_EIXO_SECUNDARIO, 'NAO'),
    PAPEL_PESSOA_PRINCIPAL: atividades_normalizeTextUpper_(model.PAPEL_PADRAO_PESSOA_PRINCIPAL),
    ORIGEM_FLUXO: 'PORTAL_MODELO_HOMOLOGADO',
    TEM_EXCECAO_CONFIG: 'NAO',
    STATUS_EXCECAO_CONFIG: 'NAO_APLICAVEL',
    JUSTIFICATIVA_EXCECAO_CONFIG: '',
    REGRAS_PENDENCIAS_MODELO: {
      geraPendenciaTituloEixo: atividades_modelosCriacaoIsYes_(model.GERA_PENDENCIA_TITULO_EIXO),
      geraPendenciaMaterial: atividades_modelosCriacaoIsYes_(model.GERA_PENDENCIA_MATERIAL),
      geraPendenciaAta: atividades_modelosCriacaoIsYes_(model.GERA_PENDENCIA_ATA),
      geraPendenciaFotos: atividades_modelosCriacaoIsYes_(model.GERA_PENDENCIA_FOTOS),
      geraPendenciaListaPresenca: atividades_modelosCriacaoIsYes_(model.GERA_PENDENCIA_LISTA_PRESENCA),
      geraPendenciaConfirmacaoConvidado: atividades_modelosCriacaoIsYes_(model.GERA_PENDENCIA_CONFIRMACAO_CONVIDADO)
    }
  };
}

function atividades_modelosCriacaoDetectSensitiveDivergences_(payload, inherited) {
  var specs = [
    ['TIPO_ATIVIDADE', ['tipoAtividade', 'TIPO_ATIVIDADE'], 'TEXT'],
    ['SUBTIPO_ATIVIDADE', ['subtipoAtividade', 'SUBTIPO_ATIVIDADE'], 'TEXT'],
    ['CLASSIFICACAO_REUNIAO', ['classificacaoReuniao', 'CLASSIFICACAO_REUNIAO'], 'TEXT'],
    ['CLASSIFICACAO_ACESSO', ['classificacaoAcesso', 'CLASSIFICACAO_ACESSO'], 'TEXT'],
    ['CONTA_PRESENCA', ['contaPresenca', 'CONTA_PRESENCA'], 'SIM_NAO'],
    ['CONTA_FALTA', ['contaFalta', 'CONTA_FALTA'], 'SIM_NAO'],
    ['GERA_CERTIFICADO', ['geraCertificado', 'GERA_CERTIFICADO'], 'SIM_NAO'],
    ['PERMITE_JUSTIFICATIVA', ['permiteJustificativa', 'PERMITE_JUSTIFICATIVA'], 'SIM_NAO'],
    ['EXIGE_ATA', ['exigeAta', 'EXIGE_ATA'], 'SIM_NAO'],
    ['EXIGE_MATERIAL', ['exigeMaterial', 'EXIGE_MATERIAL'], 'SIM_NAO'],
    ['EXIGE_LISTA_PRESENCA', ['exigeListaPresenca', 'EXIGE_LISTA_PRESENCA'], 'SIM_NAO'],
    ['EXIGE_CONVOCACAO', ['exigeConvocacao', 'EXIGE_CONVOCACAO'], 'SIM_NAO'],
    ['EXIGE_LEMBRETE', ['exigeLembrete', 'EXIGE_LEMBRETE'], 'SIM_NAO'],
    ['EXIGE_CONFIRMACAO_PRESENCA', ['exigeConfirmacaoPresenca', 'EXIGE_CONFIRMACAO_PRESENCA'], 'SIM_NAO'],
    ['CARGA_HORARIA', ['cargaHoraria', 'CARGA_HORARIA'], 'NUMBER'],
    ['STATUS_PUBLICACAO_PORTAL', ['statusPublicacaoPortal', 'STATUS_PUBLICACAO_PORTAL'], 'TEXT'],
    ['VISIBILIDADE_PORTAL', ['visibilidadePortal', 'VISIBILIDADE_PORTAL'], 'TEXT']
  ];
  var divergences = [];
  specs.forEach(function(spec) {
    var sent = atividades_modelosCriacaoFindSentValue_(payload, spec[1]);
    if (!sent.found) return;
    var expected = inherited[spec[0]];
    var received = sent.value;
    var equal = spec[2] === 'NUMBER'
      ? Math.abs(Number(received) - Number(expected)) < 0.0001
      : spec[2] === 'SIM_NAO'
        ? atividades_modelosCriacaoSimNao_(received, '') === expected
        : atividades_normalizeTextUpper_(received) === atividades_normalizeTextUpper_(expected);
    if (!equal) {
      divergences.push({ campo: spec[0], valorModelo: expected, valorSolicitado: received });
    }
  });
  return divergences;
}

function atividades_modelosCriacaoBuildPreview_(occurrence, inherited, model, contexto, ss) {
  var identity = atividadesV2_buildNextActivityIdentityForCreate_(occurrence.dataAtividade, ss);
  var cycle = atividades_modelosCriacaoResolverCicloReferencia_(occurrence.dataAtividade);
  var now = new Date();
  var actor = atividadesV2_portalActorToken_(contexto);
  var hasAxis = !!String(occurrence.eixoTematicoPrincipal || occurrence.eixoTematicoSecundario || '').trim();
  var pendingTitleAxis = atividades_modelosCriacaoIsMemberPresentation_(model) &&
    atividades_modelosCriacaoIsYes_(model.GERA_PENDENCIA_TITULO_EIXO);
  var row = {
    ID_ATIVIDADE: identity.idAtividade,
    CICLO: cycle.idCiclo || cycle.ciclo || ('GEAPA_' + identity.ano),
    ANO: identity.ano,
    SEMESTRE: identity.semestre,
    NUMERO_SEQUENCIAL_NO_CICLO: identity.sequencial,
    CLASSIFICACAO_REUNIAO: inherited.CLASSIFICACAO_REUNIAO,
    TIPO_ATIVIDADE: inherited.TIPO_ATIVIDADE,
    SUBTIPO_ATIVIDADE: inherited.SUBTIPO_ATIVIDADE,
    CLASSIFICACAO_ACESSO: inherited.CLASSIFICACAO_ACESSO,
    TITULO: occurrence.tituloPublico,
    TITULO_PUBLICO: occurrence.tituloPublico,
    DESCRICAO: occurrence.descricaoInterna || occurrence.descricaoPublica,
    DESCRICAO_PUBLICA: occurrence.descricaoPublica,
    EIXO_TEMATICO_PRINCIPAL: occurrence.eixoTematicoPrincipal,
    EIXO_TEMATICO_SECUNDARIO: occurrence.eixoTematicoSecundario,
    STATUS_EIXO_TEMATICO: pendingTitleAxis || (hasAxis && inherited.EXIGE_EIXO_TEMATICO === 'SIM') ? 'PENDENTE' : '',
    ID_PESSOA_PRINCIPAL: occurrence.idPessoaPrincipal,
    NOME_PESSOA_PRINCIPAL_PUBLICO: occurrence.nomePessoaPrincipalPublico,
    RGA_PESSOA_PRINCIPAL: occurrence.rgaPessoaPrincipal,
    EMAIL_PESSOA_PRINCIPAL: occurrence.emailPessoaPrincipal,
    TIPO_PESSOA_PRINCIPAL: occurrence.tipoPessoaPrincipal,
    PAPEL_PESSOA_PRINCIPAL: inherited.PAPEL_PESSOA_PRINCIPAL,
    INSTITUICAO_PESSOA_PRINCIPAL: occurrence.instituicaoPessoaPrincipal,
    DATA_ATIVIDADE: occurrence.dataAtividade,
    HORARIO_INICIO: occurrence.horarioInicio,
    HORARIO_FIM: occurrence.horarioFim,
    LOCAL: occurrence.local,
    FORMATO: occurrence.formato,
    RESPONSAVEL_INTERNO: occurrence.responsavelInterno,
    RESPONSAVEL_EMAIL: occurrence.responsavelEmail,
    PUBLICO_ALVO: occurrence.publicoAlvo,
    OBRIGATORIA: inherited.OBRIGATORIA,
    EXIGE_CONVOCACAO: inherited.EXIGE_CONVOCACAO,
    EXIGE_LEMBRETE: inherited.EXIGE_LEMBRETE,
    EXIGE_ATA: inherited.EXIGE_ATA,
    EXIGE_MATERIAL: inherited.EXIGE_MATERIAL,
    EXIGE_LISTA_PRESENCA: inherited.EXIGE_LISTA_PRESENCA,
    EXIGE_CONFIRMACAO_PRESENCA: inherited.EXIGE_CONFIRMACAO_PRESENCA,
    CONTA_PRESENCA: inherited.CONTA_PRESENCA,
    CONTA_FALTA: inherited.CONTA_FALTA,
    GERA_CERTIFICADO: inherited.GERA_CERTIFICADO,
    CARGA_HORARIA: inherited.CARGA_HORARIA,
    STATUS_OPERACIONAL: inherited.STATUS_OPERACIONAL,
    STATUS_PUBLICACAO_PORTAL: inherited.STATUS_PUBLICACAO_PORTAL,
    VISIBILIDADE_PORTAL: inherited.VISIBILIDADE_PORTAL,
    DATA_LIMITE_JUSTIFICATIVA: atividades_modelosCriacaoDeadline_(occurrence, model.PRAZO_JUSTIFICATIVA_HORAS),
    DATA_LIMITE_ATA: atividades_modelosCriacaoDeadline_(occurrence, model.PRAZO_ATA_HORAS),
    DATA_LIMITE_MATERIAL: atividades_modelosCriacaoDeadline_(occurrence, model.PRAZO_MATERIAL_HORAS),
    ORIGEM_FLUXO: inherited.ORIGEM_FLUXO,
    CRIADO_POR: actor,
    CRIADO_EM: now,
    ATUALIZADO_POR: actor,
    ATUALIZADO_EM: now,
    BLOQUEADO_PARA_EDICAO: 'NAO',
    OBSERVACOES: atividades_modelosCriacaoObservations_(occurrence, model),
    ATIVO: 'SIM',
    ID_CONFIG_MODELO: inherited.ID_CONFIG_MODELO,
    NOME_MODELO_PORTAL_SNAPSHOT: inherited.NOME_MODELO_PORTAL_SNAPSHOT,
    VERSAO_CONFIG_MODELO: inherited.VERSAO_CONFIG_MODELO,
    TEM_EXCECAO_CONFIG: inherited.TEM_EXCECAO_CONFIG,
    STATUS_EXCECAO_CONFIG: inherited.STATUS_EXCECAO_CONFIG,
    JUSTIFICATIVA_EXCECAO_CONFIG: inherited.JUSTIFICATIVA_EXCECAO_CONFIG,
    PERMITE_JUSTIFICATIVA: inherited.PERMITE_JUSTIFICATIVA,
    EXIGE_EIXO_TEMATICO: inherited.EXIGE_EIXO_TEMATICO,
    PERMITE_EIXO_SECUNDARIO: inherited.PERMITE_EIXO_SECUNDARIO
  };
  return {
    idAtividade: identity.idAtividade,
    idCiclo: cycle.idCiclo || cycle.ciclo,
    row: row,
    rotuloSemestre: identity.ano + '/' + identity.semestre,
    avisos: (cycle.avisos || []).slice(),
    payloadNormalizado: occurrence
  };
}

function atividades_modelosCriacaoToSafeModel_(model) {
  var isMemberPresentation = atividades_modelosCriacaoIsMemberPresentation_(model);
  return {
    idConfig: String(model.ID_CONFIG || '').trim(),
    nomeModeloPortal: atividades_sanitizePortalText_(model.NOME_MODELO_PORTAL || model.SUBTIPO_ATIVIDADE || 'Atividade', 240),
    descricaoModeloPortal: atividades_sanitizePortalText_(model.DESCRICAO_MODELO_PORTAL, 800),
    grupoModelo: atividades_sanitizePortalText_(model.GRUPO_MODELO || 'Outros', 120),
    ordemExibicao: Number(model.ORDEM_EXIBICAO) || 0,
    tipoAtividade: atividades_normalizeTextUpper_(model.TIPO_ATIVIDADE),
    subtipoAtividade: atividades_normalizeTextUpper_(model.SUBTIPO_ATIVIDADE),
    classificacaoReuniao: atividades_normalizeTextUpper_(model.CLASSIFICACAO_REUNIAO),
    tipoPublico: atividadesV2_getTipoPublicoCalendario_(model),
    cargaHorariaPadrao: atividadesV2_parsePositiveNumber_(model.CARGA_HORARIA_PADRAO) || '',
    exigeTituloPublico: isMemberPresentation ? false : atividades_modelosCriacaoIsYes_(model.EXIGE_TITULO_PUBLICO),
    exigeEixoTematico: isMemberPresentation ? false : atividades_modelosCriacaoIsYes_(model.EXIGE_EIXO_TEMATICO),
    permiteEixoSecundario: isMemberPresentation ? false : atividades_modelosCriacaoIsYes_(model.PERMITE_EIXO_SECUNDARIO),
    exigePessoaPrincipal: atividades_modelosCriacaoIsYes_(model.EXIGE_PESSOA_PRINCIPAL),
    papelPadraoPessoaPrincipal: atividades_normalizeTextUpper_(model.PAPEL_PADRAO_PESSOA_PRINCIPAL),
    tipoPessoaPrincipalPadrao: isMemberPresentation ? ['MEMBRO'] : atividades_modelosCriacaoAllowedPrincipalTypes_(model),
    permitePessoaExternaPrincipal: atividades_modelosCriacaoIsYes_(model.PERMITE_PESSOA_EXTERNA_PRINCIPAL),
    permiteMembroComoPrincipal: atividades_modelosCriacaoIsYes_(model.PERMITE_MEMBRO_COMO_PRINCIPAL),
    permiteProfessorComoPrincipal: atividades_modelosCriacaoIsYes_(model.PERMITE_PROFESSOR_COMO_PRINCIPAL),
    exigeEmailPessoaPrincipal: atividades_modelosCriacaoIsYes_(model.EXIGE_EMAIL_PESSOA_PRINCIPAL),
    exigeInstituicaoPessoaPrincipal: atividades_modelosCriacaoIsYes_(model.EXIGE_INSTITUICAO_PESSOA_PRINCIPAL),
    contaPresencaPadrao: atividades_modelosCriacaoIsYes_(model.CONTA_PRESENCA_PADRAO),
    contaFaltaPadrao: atividades_modelosCriacaoIsYes_(model.CONTA_FALTA_PADRAO),
    geraCertificadoPadrao: atividades_modelosCriacaoIsYes_(model.GERA_CERTIFICADO_PADRAO),
    permiteJustificativa: atividades_modelosCriacaoIsYes_(model.PERMITE_JUSTIFICATIVA),
    exigeMaterialPadrao: isMemberPresentation ? false : atividades_modelosCriacaoIsYes_(model.EXIGE_MATERIAL_PADRAO),
    tiposArquivoMaterialPermitidos: atividades_modelosCriacaoCsv_(model.TIPOS_ARQUIVO_MATERIAL_PERMITIDOS),
    tamanhoMaxMaterialMb: Number(model.TAMANHO_MAX_MATERIAL_MB) || 0,
    instrucaoUploadMaterial: atividades_sanitizePortalText_(model.INSTRUCAO_UPLOAD_MATERIAL, 800),
    visibilidadePortalPadrao: atividades_modelosCriacaoInitialVisibility_(model.VISIBILIDADE_PORTAL_PADRAO),
    statusPublicacaoPortalPadrao: atividades_modelosCriacaoInitialPublication_(model.STATUS_PUBLICACAO_PORTAL_PADRAO),
    exibeNoCalendario: atividades_modelosCriacaoIsYes_(model.EXIBE_NO_CALENDARIO),
    exibeEmProximasAtividades: atividades_modelosCriacaoIsYes_(model.EXIBE_EM_PROXIMAS_ATIVIDADES),
    exigeRevisaoAntesPublicar: atividades_modelosCriacaoIsYes_(model.EXIGE_REVISAO_ANTES_PUBLICAR),
    tituloEixoPosterior: isMemberPresentation,
    materialPosterior: isMemberPresentation,
    responsavelInternoAutomatico: isMemberPresentation ? 'Secretaria GEAPA' : '',
    versaoConfigModelo: atividades_modelosCriacaoVersion_(model)
  };
}

function atividades_modelosCriacaoReadConfigRows_(ss) {
  var sheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.CONFIG);
  return atividadesV2_readSheetObjects_(sheet);
}

function atividades_modelosCriacaoFindConfig_(rows, idConfig) {
  var wanted = String(idConfig || '').trim().toUpperCase();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].ID_CONFIG || '').trim().toUpperCase() === wanted) return rows[i];
  }
  return null;
}

function atividades_modelosCriacaoValidateBasePermission_(ctx) {
  if (!atividadesV2_canCreateActivityFromPortal_(ctx)) {
    return atividades_modelosCriacaoError_('PERMISSAO_INSUFICIENTE', 'Perfil sem permissao para criar atividades.');
  }
  if (!String(ctx.idPessoa || ctx.email || '').trim()) {
    return atividades_modelosCriacaoError_('USUARIO_NAO_IDENTIFICADO', 'Nao foi possivel identificar o usuario da sessao.');
  }
  return { ok: true };
}

function atividades_modelosCriacaoValidateModelAccess_(model, ctx) {
  if (!model) return atividades_modelosCriacaoError_('MODELO_NAO_ENCONTRADO', 'Modelo de atividade nao encontrado.');
  if (atividades_normalizeTextUpper_(model.ATIVO) !== 'SIM') {
    return atividades_modelosCriacaoError_('MODELO_INATIVO', 'O modelo de atividade esta inativo.');
  }
  if (atividades_normalizeTextUpper_(model.PERMITE_CRIACAO_PORTAL) !== 'SIM') {
    return atividades_modelosCriacaoError_('MODELO_NAO_PERMITE_CRIACAO_PORTAL', 'O modelo nao permite criacao pelo Portal.');
  }
  if (!atividades_modelosCriacaoProfileAllowed_(model, ctx)) {
    return atividades_modelosCriacaoError_('PERMISSAO_MODELO_NEGADA', 'Seu perfil nao pode criar atividades com este modelo.');
  }
  return { ok: true };
}

function atividades_modelosCriacaoIsEnabled_(model) {
  return atividades_normalizeTextUpper_(model.ATIVO) === 'SIM' &&
    atividades_normalizeTextUpper_(model.PERMITE_CRIACAO_PORTAL) === 'SIM';
}

function atividades_modelosCriacaoProfileAllowed_(model, ctx) {
  var allowed = atividades_modelosCriacaoCsv_(model.PERFIS_QUE_PODEM_CRIAR).map(atividades_modelosCriacaoNormalizeProfile_);
  if (!allowed.length) return false;
  var actual = [ctx.perfil].concat(ctx.perfisPortal || []).map(atividades_modelosCriacaoNormalizeProfile_);
  return actual.some(function(profile) { return allowed.indexOf(profile) >= 0; });
}

function atividades_modelosCriacaoNormalizeProfile_(profile) {
  var value = atividades_normalizeTextUpper_(profile);
  if (value === 'SECRETARIA') return 'SECRETARIO';
  if (value === 'PRESIDENCIA' || value === 'PRESIDENTE') return 'DIRETORIA';
  if (value === 'ADMIN') return 'ADMIN_TECNICO';
  return value;
}

function atividades_modelosCriacaoBuildExceptionMeta_(model, divergences) {
  return {
    excecaoNecessaria: !!(divergences || []).length,
    aprovacaoExigida: atividades_normalizeTextUpper_(model.APROVACAO_EXCECAO_NIVEL || 'DIRETORIA'),
    perfisAprovadores: atividades_modelosCriacaoCsv_(model.PERFIS_APROVADORES_EXCECAO),
    qtdAprovadores: Math.max(1, Number(model.QTD_APROVADORES_EXCECAO) || 1)
  };
}

function atividades_modelosCriacaoBuildResponseData_(creation, safeModel) {
  return {
    idAtividade: creation.idAtividade,
    idConfig: creation.row.ID_CONFIG_MODELO,
    nomeModeloPortal: creation.row.NOME_MODELO_PORTAL_SNAPSHOT,
    versaoConfigModelo: creation.row.VERSAO_CONFIG_MODELO,
    tituloPublico: creation.row.TITULO_PUBLICO,
    dataAtividade: atividades_formatPortalDateIso_(creation.row.DATA_ATIVIDADE),
    horarioInicio: creation.row.HORARIO_INICIO,
    horarioFim: creation.row.HORARIO_FIM,
    statusOperacional: creation.row.STATUS_OPERACIONAL,
    statusPublicacaoPortal: creation.row.STATUS_PUBLICACAO_PORTAL,
    visibilidadePortal: creation.row.VISIBILIDADE_PORTAL,
    idCiclo: creation.idCiclo || creation.row.CICLO,
    ciclo: creation.idCiclo || creation.row.CICLO,
    rotuloSemestre: creation.rotuloSemestre,
    modeloAplicado: safeModel,
    idApresentacao: creation.apresentacao ? creation.apresentacao.idApresentacao : '',
    idEnvolvido: creation.envolvido ? creation.envolvido.idEnvolvido : '',
    pendenciasPosteriores: creation.apresentacao ? ['TITULO_EIXO', 'MATERIAL'] : [],
    regrasAplicadas: {
      tipoAtividade: creation.row.TIPO_ATIVIDADE,
      subtipoAtividade: creation.row.SUBTIPO_ATIVIDADE,
      classificacaoAcesso: creation.row.CLASSIFICACAO_ACESSO,
      contaPresenca: creation.row.CONTA_PRESENCA,
      contaFalta: creation.row.CONTA_FALTA,
      geraCertificado: creation.row.GERA_CERTIFICADO,
      permiteJustificativa: creation.row.PERMITE_JUSTIFICATIVA,
      cargaHoraria: creation.row.CARGA_HORARIA
    }
  };
}

function atividades_modelosCriacaoApplyPresenterPolicy_(ss, model, occurrence) {
  if (!atividades_modelosCriacaoIsMemberPresentation_(model)) return { ok: true };
  var idPessoa = String(occurrence.idPessoaPrincipal || '').trim();
  if (!idPessoa) {
    return { ok: false, errorCode: 'MEMBRO_APRESENTADOR_OBRIGATORIO', message: 'Selecione o membro apresentador.' };
  }

  var cycle = atividades_modelosCriacaoResolverCicloReferencia_(occurrence.dataAtividade);
  var result = atividades_modelosCriacaoBuildPresenterMembers_(ss, cycle);
  var member = null;
  for (var i = 0; i < result.members.length; i++) {
    if (String(result.members[i].idPessoa || '').trim() === idPessoa) {
      member = result.members[i];
      break;
    }
  }
  if (!member) {
    return {
      ok: false,
      errorCode: 'MEMBRO_APRESENTADOR_NAO_ATIVO',
      message: 'A pessoa selecionada nao e membro efetivo ativo com acesso aplicavel ao Portal.'
    };
  }
  if (!member.elegivelApresentacao) {
    return {
      ok: false,
      excecaoNecessaria: true,
      campo: 'ID_PESSOA_PRINCIPAL',
      motivo: member.situacaoApresentacaoNoCiclo,
      valorSolicitado: idPessoa,
      ciclo: cycle.idCiclo || cycle.ciclo
    };
  }

  occurrence.idPessoaPrincipal = member.idPessoa;
  occurrence.nomePessoaPrincipalPublico = member.nomeExibicao;
  occurrence.rgaPessoaPrincipal = member.rga;
  occurrence.emailPessoaPrincipal = member.email;
  occurrence.tipoPessoaPrincipal = 'MEMBRO';
  occurrence.tituloPublico = 'Apresenta\u00e7\u00e3o de membro' +
    (member.nomeExibicao ? ' \u2014 ' + member.nomeExibicao : '');
  occurrence.descricaoPublica = '';
  occurrence.eixoTematicoPrincipal = '';
  occurrence.eixoTematicoSecundario = '';
  occurrence.responsavelInterno = 'Secretaria GEAPA';
  occurrence.responsavelEmail = '';
  return { ok: true, member: member, cycle: cycle };
}

function atividades_modelosCriacaoAppendPresentationExtension_(ss, creation, model, contexto) {
  if (!atividades_modelosCriacaoIsMemberPresentation_(model)) return null;
  var sheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.APRESENTACOES);
  atividadesV2_applyHeadersIfMissing_(sheet, ATIVIDADES_V2_SCHEMA.APRESENTACOES);
  var existing = atividadesV2_readSheetObjects_(sheet).filter(function(row) {
    return String(row.ID_ATIVIDADE || '').trim() === creation.idAtividade &&
      atividades_normalizeTextUpper_(row.ATIVO || 'SIM') !== 'NAO';
  })[0];
  if (existing) {
    return {
      idApresentacao: String(existing.ID_APRESENTACAO || ''),
      criada: false
    };
  }

  var match = String(creation.idAtividade || '').match(/^ATV-(\d{4})-([12])-(\d{4})$/);
  var idApresentacao = match
    ? atividadesV2_gerarIdApresentacao_(match[1], match[2], match[3])
    : atividadesV2_buildDeterministicId_('APR', [creation.idAtividade]);
  var now = new Date();
  var actor = atividadesV2_portalActorToken_(contexto);
  atividadesV2_appendAtividadeV2Row_(sheet, {
    ID_APRESENTACAO: idApresentacao,
    ID_ATIVIDADE: creation.idAtividade,
    STATUS_APRESENTACAO: 'PLANEJADA',
    STATUS_TITULO_EIXO: 'PENDENTE',
    STATUS_ENVIO_MATERIAL: 'PENDENTE',
    SYNC_HISTORICO_PUBLICO: 'NAO',
    PUBLICAR_NO_PORTAL: 'NAO',
    ELEGIVEL_CERTIFICADO: creation.row.GERA_CERTIFICADO,
    CRIADO_POR: actor,
    CRIADO_EM: now,
    ATUALIZADO_POR: actor,
    ATUALIZADO_EM: now,
    BLOQUEADO_PARA_EDICAO: 'NAO',
    OBSERVACOES: 'Criada automaticamente no agendamento por modelo APRESENTACAO_MEMBRO.',
    ATIVO: 'SIM'
  });
  return {
    idApresentacao: idApresentacao,
    criada: true,
    statusTituloEixo: 'PENDENTE',
    statusMaterial: 'PENDENTE'
  };
}

function atividades_modelosCriacaoAppendPresenterInvolvement_(ss, creation, model) {
  if (!atividades_modelosCriacaoIsMemberPresentation_(model)) return null;
  var idPessoa = String(creation.row.ID_PESSOA_PRINCIPAL || '').trim();
  if (!idPessoa) throw new Error('ID_PESSOA do apresentador ausente ao criar vinculo da atividade.');

  var sheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ENVOLVIDOS);
  var idEnvolvido = atividadesV2_buildDeterministicId_('ENV', [creation.idAtividade, 'APRESENTADOR', idPessoa]);
  var existing = atividadesV2_readSheetObjects_(sheet).filter(function(row) {
    return String(row.ID_ENVOLVIDO || '').trim() === idEnvolvido || (
      String(row.ID_ATIVIDADE || '').trim() === creation.idAtividade &&
      String(row.ID_PESSOA || '').trim() === idPessoa &&
      atividades_normalizeTextUpper_(row.PAPEL_NA_ATIVIDADE) === 'APRESENTADOR' &&
      atividades_normalizeTextUpper_(row.ATIVO || 'SIM') !== 'NAO'
    );
  })[0];
  if (existing) return { idEnvolvido: String(existing.ID_ENVOLVIDO || idEnvolvido), criado: false };

  atividadesV2_appendAtividadeV2Row_(sheet, {
    ID_ENVOLVIDO: idEnvolvido,
    ID_ATIVIDADE: creation.idAtividade,
    ORDEM_EXIBICAO: 1,
    PAPEL_NA_ATIVIDADE: 'APRESENTADOR',
    TIPO_PESSOA: 'MEMBRO',
    ID_PESSOA: idPessoa,
    NOME_PUBLICO: creation.row.NOME_PESSOA_PRINCIPAL_PUBLICO,
    RGA: creation.row.RGA_PESSOA_PRINCIPAL,
    EMAIL: creation.row.EMAIL_PESSOA_PRINCIPAL,
    INSTITUICAO: '',
    CARGO_OU_FUNCAO: '',
    EXIBIR_NO_PORTAL: 'SIM',
    VISIBILIDADE_PORTAL: creation.row.VISIBILIDADE_PORTAL,
    OBSERVACOES: 'Vinculo criado automaticamente pelo modelo APRESENTACAO_MEMBRO.',
    ATIVO: 'SIM'
  });
  return { idEnvolvido: idEnvolvido, criado: true };
}

function atividades_modelosCriacaoAppendLogs_(ss, creation, model, contexto) {
  var safeDetails = {
    idAtividade: creation.idAtividade,
    idApresentacao: creation.apresentacao ? creation.apresentacao.idApresentacao : '',
    idEnvolvido: creation.envolvido ? creation.envolvido.idEnvolvido : '',
    idConfig: String(model.ID_CONFIG || '').trim(),
    versaoConfigModelo: creation.row.VERSAO_CONFIG_MODELO,
    statusOperacional: creation.row.STATUS_OPERACIONAL,
    statusPublicacaoPortal: creation.row.STATUS_PUBLICACAO_PORTAL,
    visibilidadePortal: creation.row.VISIBILIDADE_PORTAL
  };
  atividadesV2_appendV2Log_(ss, {
    FLUXO: 'PORTAL_ATIVIDADES_GESTAO_DEV',
    ACAO: 'CRIAR_ATIVIDADE_POR_MODELO',
    NIVEL: 'INFO',
    STATUS: 'OK',
    ID_ATIVIDADE: creation.idAtividade,
    MENSAGEM: 'Atividade criada por modelo homologado em modo rascunho.',
    DETALHES_JSON: atividadesV2_safeLogData_(safeDetails)
  });
  atividadesV2_portalAppendAcao_(ss, {
    ID_ACAO_PORTAL: atividadesV2_buildDeterministicId_('AACT', ['ATIVIDADE_MODELO_CRIADA', creation.idAtividade, new Date().getTime()]),
    DATA_HORA: new Date(),
    USUARIO_EMAIL: contexto.email || '',
    PERFIL_USUARIO: contexto.perfil || '',
    TIPO_ACAO: 'ATIVIDADE_MODELO_CRIADA',
    ID_ATIVIDADE: creation.idAtividade,
    ID_ENTIDADE: creation.idAtividade,
    TIPO_ENTIDADE: 'ATIVIDADE',
    PAYLOAD_JSON: atividadesV2_safeLogData_(safeDetails),
    STATUS_PROCESSAMENTO: 'CONCLUIDO',
    RESULTADO_JSON: atividadesV2_safeLogData_({ ok: true, idAtividade: creation.idAtividade }),
    PROCESSADO_EM: new Date(),
    PROCESSADO_POR: atividadesV2_portalActorToken_(contexto),
    OBSERVACOES: 'Criacao DEV por modelo homologado.',
    ATIVO: 'SIM'
  });
}

function atividades_modelosCriacaoIssueConfirmation_(fingerprint) {
  var token = Utilities.getUuid().replace(/-/g, '');
  var stored = portalCachePutJson_(atividades_modelosCriacaoConfirmationCacheKey_(token), {
    fingerprint: fingerprint,
    expiresAt: new Date().getTime() + ATIVIDADES_MODELO_CONFIRMATION_TTL_SECONDS_ * 1000
  }, ATIVIDADES_MODELO_CONFIRMATION_TTL_SECONDS_);
  return stored ? token : '';
}

function atividades_modelosCriacaoValidateConfirmation_(token, fingerprint) {
  var normalized = String(token || '').trim();
  if (!normalized) return atividades_modelosCriacaoError_('CONFIRMACAO_DRY_RUN_OBRIGATORIA', 'Valide a atividade antes de confirmar a criacao.');
  var cached = portalCacheGetJson_(atividades_modelosCriacaoConfirmationCacheKey_(normalized));
  if (!cached || cached.fingerprint !== fingerprint || Number(cached.expiresAt || 0) < new Date().getTime()) {
    return atividades_modelosCriacaoError_('CONFIRMACAO_DRY_RUN_INVALIDA', 'A validacao expirou ou os dados mudaram. Valide novamente.');
  }
  return { ok: true };
}

function atividades_modelosCriacaoFingerprint_(idConfig, version, occurrence, inherited, contexto) {
  return portalCacheHash_(JSON.stringify({
    idConfig: idConfig,
    version: version,
    occurrence: occurrence,
    inherited: inherited,
    actor: atividadesV2_portalActorToken_(contexto)
  }));
}

function atividades_modelosCriacaoConfirmationCacheKey_(token) {
  return portalCacheBuildKey_('modelo_criacao_confirmacao', String(token || '').trim());
}

function atividades_modelosCriacaoListCacheKey_(ctx) {
  return portalCacheBuildKey_('modelos_criacao', atividades_modelosCriacaoNormalizeProfile_(ctx.perfil || 'MEMBRO'));
}

function atividades_modelosCriacaoInvalidateCaches_() {
  ['MEMBRO', 'SECRETARIO', 'DIRETORIA', 'ADMIN_TECNICO'].forEach(function(profile) {
    portalCacheRemove_(portalCacheBuildKey_('modelos_criacao', profile));
  });
}

function atividades_modelosCriacaoBuildGroups_(models) {
  var groups = {};
  (models || []).forEach(function(model) {
    var group = model.grupoModelo || 'Outros';
    if (!groups[group]) groups[group] = [];
    groups[group].push(model.idConfig);
  });
  return Object.keys(groups).sort().map(function(group) {
    return { grupo: group, idsModelos: groups[group] };
  });
}

function atividades_modelosCriacaoLatestUpdate_(rows) {
  var latest = 0;
  (rows || []).forEach(function(row) {
    var value = row.ATUALIZADO_EM || row.CRIADO_EM;
    var date = value instanceof Date ? value : new Date(value || 0);
    if (!isNaN(date.getTime())) latest = Math.max(latest, date.getTime());
  });
  return latest ? new Date(latest).toISOString() : '';
}

function atividades_modelosCriacaoVersion_(model) {
  var snapshot = {};
  ATIVIDADES_CONFIG_MODELOS_LEGACY_HEADERS_.concat(ATIVIDADES_CONFIG_MODELOS_NEW_HEADERS_).forEach(function(header) {
    if (['CRIADO_EM', 'ATUALIZADO_EM', 'OBSERVACOES'].indexOf(header) < 0) {
      snapshot[header] = model[header] === null || typeof model[header] === 'undefined' ? '' : model[header];
    }
  });
  return 'MODELO-V1-' + portalCacheHash_(JSON.stringify(snapshot)).slice(0, 16);
}

function atividades_modelosCriacaoInitialPublication_(value) {
  var normalized = atividades_normalizeTextUpper_(value);
  return normalized === 'OCULTA' || normalized === 'CANCELADA' ? 'OCULTA' : 'RASCUNHO';
}

function atividades_modelosCriacaoInitialVisibility_(value) {
  return atividades_normalizeTextUpper_(value) === 'OCULTA' ? 'OCULTA' : 'DIRETORIA';
}

function atividades_modelosCriacaoDeadline_(occurrence, hoursValue) {
  var rawHours = String(hoursValue === null || hoursValue === undefined ? '' : hoursValue).trim();
  if (!rawHours) return '';
  var hours = Number(rawHours.replace(',', '.'));
  if (!isFinite(hours) || hours < 0) return '';
  var date = atividades_parseDateOrNull_(occurrence.dataAtividade);
  var endMinutes = atividades_parseTimeValueToMinutes_(occurrence.horarioFim);
  if (!date || endMinutes === null) return '';
  date.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
  date.setTime(date.getTime() + hours * 60 * 60 * 1000);
  return date;
}

function atividades_modelosCriacaoObservations_(occurrence, model) {
  var parts = [];
  if (occurrence.observacoes) parts.push(occurrence.observacoes);
  parts.push('Criada pelo Portal GEAPA a partir do modelo homologado ' + String(model.ID_CONFIG || '') + '.');
  return atividades_sanitizePortalText_(parts.join(' '), 1000);
}

function atividades_modelosCriacaoCsv_(value) {
  return String(value || '').split(',').map(function(item) {
    return atividades_normalizeTextUpper_(item);
  }).filter(function(item) { return !!item; });
}

function atividades_modelosCriacaoAllowedPrincipalTypes_(model) {
  var types = atividades_modelosCriacaoCsv_(model.TIPO_PESSOA_PRINCIPAL_PADRAO);
  if (atividades_modelosCriacaoIsYes_(model.PERMITE_MEMBRO_COMO_PRINCIPAL)) types.push('MEMBRO');
  if (atividades_modelosCriacaoIsYes_(model.PERMITE_PROFESSOR_COMO_PRINCIPAL)) types.push('PROFESSOR');
  if (atividades_modelosCriacaoIsYes_(model.PERMITE_PESSOA_EXTERNA_PRINCIPAL)) types.push('EXTERNO');
  return types.filter(function(type, index) { return types.indexOf(type) === index; });
}

function atividades_modelosCriacaoIsMemberPresentation_(model) {
  return atividades_normalizeTextUpper_(model && model.SUBTIPO_ATIVIDADE) === 'APRESENTACAO_MEMBRO';
}

function atividades_modelosCriacaoResolverCicloReferencia_(reference) {
  var raw = reference && typeof reference === 'object' && !(reference instanceof Date) ? reference : {};
  var value = reference instanceof Date
    ? reference
    : (typeof reference === 'object'
      ? raw.dataAtividade || raw.DATA_ATIVIDADE || raw.idCiclo || raw.ID_CICLO || raw.ciclo || raw.CICLO || raw.rotuloSemestre || ''
      : reference);
  var text = String(value || '').trim();
  var explicitId = String(raw.idCiclo || raw.ID_CICLO || raw.ciclo || raw.CICLO || '').trim();
  if (!explicitId && /^GEAPA[_-]/i.test(text)) explicitId = text;

  var catalog = atividades_modelosCriacaoLerCiclosVigentes_();
  var warnings = (catalog.warnings || []).slice();
  if (explicitId) {
    var normalizedExplicit = atividades_modelosCriacaoNormalizeCiclo_(explicitId);
    var found = catalog.cycles.filter(function(cycle) {
      return atividades_modelosCriacaoNormalizeCiclo_(cycle.idCiclo) === normalizedExplicit ||
        atividades_modelosCriacaoNormalizeCiclo_(cycle.nomeCiclo) === normalizedExplicit;
    })[0];
    if (found) return atividades_modelosCriacaoDecorateCycle_(found, null, raw, warnings);
    atividades_modelosCriacaoAddWarning_(warnings, 'Ciclo informado nao foi encontrado em Vigencias v2; mantido ID_CICLO explicito como fallback.');
    return atividades_modelosCriacaoDecorateCycle_({
      idCiclo: explicitId,
      nomeCiclo: explicitId,
      tipoCiclo: '',
      dataInicioTs: null,
      dataFimTs: null
    }, null, raw, warnings);
  }

  var date = atividades_modelosCriacaoExtractReferenceDate_(value);
  if (!date && !text) date = new Date();
  if (date) {
    var byDate = atividades_modelosCriacaoResolverCicloPorData_(date, catalog);
    (byDate.warnings || []).forEach(function(warning) {
      atividades_modelosCriacaoAddWarning_(warnings, warning);
    });
    if (byDate.cycle) return atividades_modelosCriacaoDecorateCycle_(byDate.cycle, date, raw, warnings);
  }

  var legacy = atividades_modelosCriacaoLegacyCycleParts_(value, raw, date);
  atividades_modelosCriacaoAddWarning_(warnings, 'Ciclo nao resolvido por ID_CICLO ou data; aplicado fallback legado de ano/semestre.');
  return atividades_modelosCriacaoDecorateCycle_({
    idCiclo: 'GEAPA_' + legacy.year,
    nomeCiclo: 'GEAPA_' + legacy.year,
    tipoCiclo: '',
    dataInicioTs: null,
    dataFimTs: null
  }, date, { ano: legacy.year, semestre: legacy.semester }, warnings);
}

// Alias temporario para chamadas internas anteriores a adocao oficial de CICLOS.
function atividades_modelosCriacaoResolveCycle_(reference) {
  return atividades_modelosCriacaoResolverCicloReferencia_(reference);
}

function atividades_modelosCriacaoLerCiclosVigentes_() {
  if (ATIVIDADES_MODELO_CICLOS_EXECUTION_CACHE_) return ATIVIDADES_MODELO_CICLOS_EXECUTION_CACHE_;
  var cacheKey = portalCacheBuildKey_('vigencias_ciclos', 'VIGENCIAS_V2_CICLOS');
  var cached = portalCacheGetJson_(cacheKey);
  if (cached && Array.isArray(cached.cycles)) {
    ATIVIDADES_MODELO_CICLOS_EXECUTION_CACHE_ = cached;
    return cached;
  }

  var warnings = [];
  var registry = atividades_modelosCriacaoGetRegistryCycleEntry_('VIGENCIAS_V2_CICLOS');
  var legacyKey = false;
  if (!registry) {
    registry = atividades_modelosCriacaoGetRegistryCycleEntry_('VIGENCIAS_V2_PERIODOS');
    legacyKey = !!registry;
  }
  if (!registry || !String(registry.id || '').trim()) {
    throw new Error('Key VIGENCIAS_V2_CICLOS nao encontrada no Registry para leitura dos ciclos.');
  }
  if (registry.ativo === false || atividades_normalizeTextUpper_(registry.ativo) === 'NAO') {
    throw new Error('A key VIGENCIAS_V2_CICLOS esta inativa no Registry.');
  }
  if (legacyKey) atividades_modelosCriacaoAddWarning_(warnings, 'Usado alias legado do Registry para localizar a base de ciclos.');

  var spreadsheet = SpreadsheetApp.openById(String(registry.id).trim());
  var configuredSheetName = String(registry.sheet || '').trim();
  var sheet = spreadsheet.getSheetByName('CICLOS');
  var legacySheet = false;
  if (!sheet && configuredSheetName) {
    sheet = spreadsheet.getSheetByName(configuredSheetName);
    legacySheet = !!sheet && atividades_normalizeTextUpper_(sheet.getName()) !== 'CICLOS';
  }
  if (!sheet) {
    sheet = spreadsheet.getSheetByName('PERIODOS');
    legacySheet = !!sheet;
  }
  if (!sheet) throw new Error('Aba CICLOS nao encontrada na base de Vigencias v2.');

  if (configuredSheetName && atividades_normalizeTextUpper_(configuredSheetName) !== 'CICLOS') {
    atividades_modelosCriacaoAddWarning_(warnings, 'Registry ainda aponta para uma aba legada; a leitura priorizou CICLOS quando disponivel.');
  }
  if (legacySheet) {
    atividades_modelosCriacaoAddWarning_(warnings, 'Foi usada leitura compativel da aba legada de ciclos.');
    Logger.log('GEAPA-ATIVIDADES-V2-MODELOS [WARN] fallback legado de ciclos: ' + sheet.getName());
  }

  var invalidDates = 0;
  var cycles = atividadesV2_readSheetObjects_(sheet).map(function(row) {
    var cycle = atividades_modelosCriacaoNormalizeCycleRecord_(row);
    if (!cycle.idCiclo) return null;
    if (cycle.dataInicioTs === null || cycle.dataFimTs === null) invalidDates++;
    return cycle;
  }).filter(function(cycle) { return !!cycle; });
  if (invalidDates) {
    atividades_modelosCriacaoAddWarning_(warnings, invalidDates + ' ciclo(s) sem intervalo completo nao podem ser resolvidos automaticamente por data.');
  }

  var result = { cycles: cycles, warnings: warnings };
  portalCachePutJson_(cacheKey, result, ATIVIDADES_MODELO_CACHE_TTL_SECONDS_);
  ATIVIDADES_MODELO_CICLOS_EXECUTION_CACHE_ = result;
  return result;
}

function atividades_modelosCriacaoGetRegistryCycleEntry_(key) {
  var api = typeof GEAPA_CORE !== 'undefined' && GEAPA_CORE ? GEAPA_CORE : null;
  if (api && typeof api.coreGetRegistryMetaByKey === 'function') {
    try {
      return api.coreGetRegistryMetaByKey(key);
    } catch (coreError) {
      // O modulo DEV pode precisar da entrada DEV quando o ambiente atual do Core e outro.
    }
  }
  if (typeof atividadesV2_readRegistryEntryDevDirect_ === 'function') {
    try {
      return atividadesV2_readRegistryEntryDevDirect_(String(key || '').trim().toUpperCase());
    } catch (registryError) {
      return null;
    }
  }
  return null;
}

function atividades_modelosCriacaoNormalizeCycleRecord_(row) {
  row = row || {};
  return {
    idCiclo: String(atividadesV2_firstNonEmpty_(row.ID_CICLO, row.ID_PERIODO) || '').trim(),
    nomeCiclo: String(atividadesV2_firstNonEmpty_(row.NOME_CICLO, row.NOME_PERIODO, row.ID_CICLO, row.ID_PERIODO) || '').trim(),
    tipoCiclo: String(atividadesV2_firstNonEmpty_(row.TIPO_CICLO, row.TIPO_PERIODO) || '').trim(),
    dataInicioTs: atividades_modelosCriacaoDateOnlyTimestamp_(row.DATA_INICIO),
    dataFimTs: atividades_modelosCriacaoDateOnlyTimestamp_(row.DATA_FIM),
    status: String(row.STATUS || '').trim()
  };
}

function atividades_modelosCriacaoResolverCicloPorData_(dataAtividade, catalog) {
  var timestamp = atividades_modelosCriacaoDateOnlyTimestamp_(dataAtividade);
  if (timestamp === null) return { cycle: null, warnings: ['Data invalida para resolver ID_CICLO.'] };
  var source = catalog || atividades_modelosCriacaoLerCiclosVigentes_();
  var matches = (source.cycles || []).filter(function(cycle) {
    return cycle.dataInicioTs !== null && cycle.dataFimTs !== null &&
      cycle.dataInicioTs <= timestamp && timestamp <= cycle.dataFimTs;
  });
  if (matches.length > 1) {
    throw new Error('CONFIGURACAO_CICLOS_AMBIGUA: a data pertence a mais de um ID_CICLO: ' + matches.map(function(cycle) {
      return cycle.idCiclo;
    }).join(', ') + '.');
  }
  if (!matches.length) {
    return {
      cycle: null,
      warnings: ['Nenhum ID_CICLO de Vigencias v2 contempla a data informada.']
    };
  }
  return { cycle: matches[0], warnings: [] };
}

function atividades_modelosCriacaoActivityMatchesCiclo_(row, cycle) {
  var targetId = atividades_modelosCriacaoNormalizeCiclo_(cycle && (cycle.idCiclo || cycle.ciclo));
  var rowId = atividades_modelosCriacaoNormalizeCiclo_(row && (row.ID_CICLO || row.CICLO));
  if (rowId) return rowId === targetId;

  var date = atividades_modelosCriacaoExtractReferenceDate_(row && row.DATA_ATIVIDADE);
  if (date) {
    var byDate = atividades_modelosCriacaoResolverCicloPorData_(date);
    if (byDate.cycle) {
      return atividades_modelosCriacaoNormalizeCiclo_(byDate.cycle.idCiclo) === targetId;
    }
    (byDate.warnings || []).forEach(function(warning) {
      atividades_modelosCriacaoAddWarning_(cycle.avisos, warning);
    });
  }

  atividades_modelosCriacaoAddWarning_(cycle.avisos, 'Atividade sem CICLO resolvivel; comparacao usou fallback legado de ano/semestre.');
  return String(row && row.ANO || '').trim() === String(cycle && cycle.ano || '').trim() &&
    String(row && row.SEMESTRE || '').trim() === String(cycle && cycle.semestre || '').trim();
}

function atividades_modelosCriacaoNormalizeCiclo_(value) {
  return String(value || '').trim().toUpperCase();
}

function atividades_modelosCriacaoDecorateCycle_(cycle, referenceDate, raw, warnings) {
  var date = referenceDate || null;
  var legacy = atividades_modelosCriacaoLegacyCycleParts_('', raw || {}, date);
  var idCiclo = String(cycle.idCiclo || '').trim();
  return {
    idCiclo: idCiclo,
    ciclo: idCiclo,
    nomeCiclo: String(cycle.nomeCiclo || idCiclo).trim(),
    tipoCiclo: String(cycle.tipoCiclo || '').trim(),
    rotuloCiclo: idCiclo || String(cycle.nomeCiclo || '').trim(),
    dataInicioTs: cycle.dataInicioTs,
    dataFimTs: cycle.dataFimTs,
    ano: String(legacy.year),
    semestre: String(legacy.semester),
    rotuloSemestre: legacy.year + '/' + legacy.semester,
    avisos: warnings || []
  };
}

function atividades_modelosCriacaoLegacyCycleParts_(value, raw, date) {
  raw = raw || {};
  var text = String(value || '').trim();
  var year = Number(raw.ano || raw.ANO || 0);
  var semester = Number(raw.semestre || raw.SEMESTRE || 0);
  var semesterMatch = text.match(/(20\d{2})\s*[\/-]\s*([12])/);
  if (semesterMatch) {
    year = Number(semesterMatch[1]);
    semester = Number(semesterMatch[2]);
  }
  if (date) {
    year = date.getFullYear();
    semester = date.getMonth() <= 5 ? 1 : 2;
  }
  if (!year) year = new Date().getFullYear();
  if (semester !== 1 && semester !== 2) semester = new Date().getMonth() <= 5 ? 1 : 2;
  return { year: year, semester: semester };
}

function atividades_modelosCriacaoExtractReferenceDate_(value) {
  if (value instanceof Date) return isNaN(value.getTime()) ? null : new Date(value.getTime());
  var text = String(value || '').trim();
  if (!text || (!/^\d{4}-\d{1,2}-\d{1,2}/.test(text) && !/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}/.test(text))) return null;
  return atividades_parseDateOrNull_(value);
}

function atividades_modelosCriacaoDateOnlyTimestamp_(value) {
  var date = atividades_parseDateOrNull_(value);
  if (!date) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function atividades_modelosCriacaoAddWarning_(warnings, warning) {
  if (!warnings || !warning || warnings.indexOf(warning) >= 0) return;
  warnings.push(warning);
}

function atividades_modelosCriacaoBuildPresenterMembers_(ss, cycle) {
  var source = atividades_modelosCriacaoReadCurrentMembers_();
  var scheduledByPerson = atividades_modelosCriacaoIndexScheduledPresentations_(ss, cycle);
  var seen = {};
  var members = [];
  source.records.forEach(function(raw) {
    var member = atividades_modelosCriacaoNormalizeCurrentMember_(raw);
    if (!member || !member.idPessoa || seen[member.idPessoa]) return;
    seen[member.idPessoa] = true;
    var scheduled = scheduledByPerson[member.idPessoa] || [];
    members.push({
      idPessoa: member.idPessoa,
      nomeExibicao: member.nomeExibicao,
      rga: member.rga,
      email: member.email,
      idCiclo: cycle.idCiclo || cycle.ciclo,
      situacaoApresentacaoNoCiclo: scheduled.length ? 'JA_POSSUI_APRESENTACAO_MARCADA' : 'SEM_APRESENTACAO_MARCADA',
      situacaoApresentacaoNoCicloRotulo: scheduled.length
        ? 'Ja agendado no ciclo ' + (cycle.idCiclo || cycle.ciclo)
        : 'Elegivel no ciclo ' + (cycle.idCiclo || cycle.ciclo),
      elegivelApresentacao: scheduled.length === 0
    });
  });
  members.sort(function(a, b) {
    if (a.elegivelApresentacao !== b.elegivelApresentacao) return a.elegivelApresentacao ? -1 : 1;
    var aRga = String(a.rga || '').trim();
    var bRga = String(b.rga || '').trim();
    if (!!aRga !== !!bRga) return aRga ? -1 : 1;
    if (aRga && bRga) {
      var rgaCompare = aRga.localeCompare(bRga, 'pt-BR');
      if (rgaCompare) return rgaCompare;
    }
    return String(a.nomeExibicao || '').localeCompare(String(b.nomeExibicao || ''), 'pt-BR');
  });
  var warnings = [];
  if (source.warning) atividades_modelosCriacaoAddWarning_(warnings, source.warning);
  (cycle.avisos || []).forEach(function(warning) {
    atividades_modelosCriacaoAddWarning_(warnings, warning);
  });
  return {
    members: members,
    warnings: warnings
  };
}

function atividades_modelosCriacaoReadCurrentMembers_() {
  var api = typeof GEAPA_CORE !== 'undefined' && GEAPA_CORE ? GEAPA_CORE : null;
  var calls = [
    api && api.domainsV2 && api.domainsV2.pessoasListCurrentMembers,
    api && api.corePessoasListCurrentMembers,
    typeof corePessoasListCurrentMembers === 'function' ? corePessoasListCurrentMembers : null
  ];
  for (var i = 0; i < calls.length; i++) {
    if (typeof calls[i] !== 'function') continue;
    try {
      var records = calls[i]({ includeInactive: false });
      if (Array.isArray(records)) return { records: records, source: 'GEAPA_CORE', warning: '' };
    } catch (err) {
      // Tenta a proxima API publica e, por ultimo, o fallback DEV ja existente.
    }
  }

  try {
    var pessoasSs = SpreadsheetApp.openById(ATIVIDADES_V2_PESSOAS_DEV_SPREADSHEET_ID_FALLBACK_);
    return {
      records: atividadesV2_readPessoaRecordsBySheetName_(pessoasSs, 'PESSOAS_RESUMO_OPERACIONAL'),
      source: 'PESSOAS_RESUMO_OPERACIONAL_DEV',
      warning: 'GEAPA_CORE sem listagem disponivel; usado fallback DEV de PESSOAS_RESUMO_OPERACIONAL.'
    };
  } catch (fallbackErr) {
    throw new Error('Pessoas v2 indisponivel para listar membros apresentadores.');
  }
}

function atividades_modelosCriacaoNormalizeCurrentMember_(raw) {
  raw = raw || {};
  var summary = raw.resumoOperacional || raw.resumo || {};
  var link = raw.vinculo || {};
  var idPessoa = String(atividadesV2_firstNonEmpty_(raw.idPessoa, raw.ID_PESSOA, summary.ID_PESSOA) || '').trim();
  var linkType = atividades_normalizeTextUpper_(atividadesV2_firstNonEmpty_(raw.tipoVinculo, link.TIPO_VINCULO, summary.TIPO_VINCULO_ATUAL));
  var linkStatus = atividades_normalizeTextUpper_(atividadesV2_firstNonEmpty_(raw.statusVinculo, link.STATUS_VINCULO, summary.STATUS_VINCULO_ATUAL));
  var hasPortalStatus = Object.prototype.hasOwnProperty.call(raw, 'portalAtivo') ||
    Object.prototype.hasOwnProperty.call(raw, 'PORTAL_ATIVO') ||
    Object.prototype.hasOwnProperty.call(summary, 'PORTAL_ATIVO');
  var portalStatus = atividadesV2_firstNonEmpty_(raw.portalAtivo, raw.PORTAL_ATIVO, summary.PORTAL_ATIVO);

  if (!idPessoa) return null;
  if (linkType && linkType !== 'MEMBRO_EFETIVO') return null;
  if (linkStatus && ['ATIVO', 'ATIVA'].indexOf(linkStatus) < 0) return null;
  if (hasPortalStatus && !atividades_modelosCriacaoIsYes_(portalStatus)) return null;
  return {
    idPessoa: idPessoa,
    nomeExibicao: atividades_sanitizePortalText_(atividadesV2_firstNonEmpty_(raw.nome, raw.NOME_EXIBICAO, summary.NOME_EXIBICAO), 180),
    rga: String(atividadesV2_firstNonEmpty_(raw.rga, raw.RGA, summary.RGA) || '').trim(),
    email: String(atividadesV2_firstNonEmpty_(raw.email, raw.EMAIL, summary.EMAIL) || '').trim().toLowerCase()
  };
}

function atividades_modelosCriacaoIndexScheduledPresentations_(ss, cycle) {
  var presentationsSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.APRESENTACOES);
  var presentationActivityIds = {};
  atividadesV2_readSheetObjects_(presentationsSheet).forEach(function(row) {
    if (atividades_normalizeTextUpper_(row.ATIVO || 'SIM') === 'NAO') return;
    var idAtividade = String(row.ID_ATIVIDADE || '').trim();
    if (idAtividade) presentationActivityIds[idAtividade] = true;
  });

  var atividadesSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES);
  var byPerson = {};
  atividadesV2_readSheetObjects_(atividadesSheet).forEach(function(row) {
    if (atividades_normalizeTextUpper_(row.ATIVO || 'SIM') === 'NAO') return;
    var status = atividades_normalizeTextUpper_(row.STATUS_OPERACIONAL);
    if (['CANCELADA', 'CANCELADO', 'ARQUIVADA', 'ARQUIVADO'].indexOf(status) >= 0) return;
    var subtype = atividades_normalizeTextUpper_(row.SUBTIPO_ATIVIDADE);
    var idAtividade = String(row.ID_ATIVIDADE || '').trim();
    if (subtype !== 'APRESENTACAO_MEMBRO' && !presentationActivityIds[idAtividade]) return;
    if (!atividades_modelosCriacaoActivityMatchesCiclo_(row, cycle)) return;
    var idPessoa = String(row.ID_PESSOA_PRINCIPAL || '').trim();
    if (!idPessoa) return;
    if (!byPerson[idPessoa]) byPerson[idPessoa] = [];
    byPerson[idPessoa].push({ idAtividade: idAtividade, status: status || 'PLANEJADA' });
  });
  return byPerson;
}

// Alias temporario para compatibilidade com testes e chamadas internas antigas.
function atividades_modelosCriacaoActivityMatchesCycle_(row, cycle) {
  return atividades_modelosCriacaoActivityMatchesCiclo_(row, cycle);
}

function atividades_modelosCriacaoPresenterCacheKey_(cycle) {
  var idCiclo = atividades_modelosCriacaoNormalizeCiclo_(cycle && (cycle.idCiclo || cycle.ciclo));
  if (!idCiclo) throw new Error('ID_CICLO obrigatorio para cache de membros apresentadores.');
  return portalCacheBuildKey_('membros_apresentadores', idCiclo);
}

function atividades_modelosCriacaoInvalidatePresenterCache_(reference) {
  var cycle = atividades_modelosCriacaoResolverCicloReferencia_(reference);
  portalCacheRemove_(atividades_modelosCriacaoPresenterCacheKey_(cycle));
}

/**
 * Invalida os ciclos afetados por criacao, cancelamento, reativacao ou edicao.
 * Rotinas futuras de alteracao devem informar os snapshots anterior e atual.
 */
function atividades_modelosCriacaoInvalidatePresenterCachesForChange_(before, after) {
  var snapshots = [before || null, after || null].filter(function(row) { return !!row; });
  var touchesPresentation = snapshots.some(function(row) {
    return atividades_normalizeTextUpper_(row.SUBTIPO_ATIVIDADE) === 'APRESENTACAO_MEMBRO';
  });
  if (!touchesPresentation) return 0;

  var removed = {};
  snapshots.forEach(function(row) {
    var reference = row.CICLO || row.ID_CICLO || row.DATA_ATIVIDADE || '';
    if (!reference) return;
    var cycle = atividades_modelosCriacaoResolverCicloReferencia_(reference);
    var cacheKey = atividades_modelosCriacaoPresenterCacheKey_(cycle);
    if (removed[cacheKey]) return;
    portalCacheRemove_(cacheKey);
    removed[cacheKey] = true;
  });
  return Object.keys(removed).length;
}

function atividades_modelosCriacaoIsYes_(value) {
  return atividades_modelosCriacaoSimNao_(value, 'NAO') === 'SIM';
}

function atividades_modelosCriacaoSimNao_(value, fallback) {
  return atividadesV2_normalizarSimNaoValor_(value) || fallback;
}

function atividades_modelosCriacaoOrder_(value) {
  var number = Number(value);
  return isFinite(number) && number > 0 ? number : 999999;
}

function atividades_modelosCriacaoFindSentValue_(payload, aliases) {
  for (var i = 0; i < aliases.length; i++) {
    if (Object.prototype.hasOwnProperty.call(payload || {}, aliases[i])) {
      return { found: true, value: payload[aliases[i]] };
    }
  }
  return { found: false, value: '' };
}

function atividades_modelosCriacaoHeaderSet_(sheet) {
  var headers = atividadesV2_getSheetHeaders_(sheet);
  var set = {};
  headers.forEach(function(header) {
    var key = String(header || '').trim().toUpperCase();
    if (key) set[key] = true;
  });
  return set;
}

function atividades_modelosCriacaoError_(code, message, err) {
  var result = {
    ok: false,
    errorCode: code,
    message: message,
    mensagens: [],
    avisos: [],
    erros: []
  };
  if (err) result.detalhes = atividadesV2_errorMessage_(err).slice(0, 300);
  return result;
}

function atividades_runTesteCriacaoPorModeloDev_() {
  var ss = atividadesV2_getDatabaseSpreadsheetDev_();
  var rows = atividades_modelosCriacaoReadConfigRows_(ss);
  var wanted = ['APRESENTACAO_MEMBRO', 'PALESTRA', 'ABERTURA_PERIODO', 'FECHAMENTO_PERIODO'];
  var contexto = { perfil: 'ADMIN_TECNICO', email: 'teste-dev@geapa.local' };
  var testDate = '2026-08-20';
  var officialAxis = atividades_listRotulosEixosApresentacoes_()[0] || '';
  var tests = wanted.map(function(subtype) {
    var model = rows.filter(function(row) {
      return atividades_normalizeTextUpper_(row.SUBTIPO_ATIVIDADE) === subtype;
    })[0];
    if (!model) return { subtipoAtividade: subtype, ok: false, errorCode: 'MODELO_NAO_ENCONTRADO' };

    var allowedTypes = atividades_modelosCriacaoAllowedPrincipalTypes_(model);
    var presenter = null;
    if (subtype === 'APRESENTACAO_MEMBRO') {
      presenter = atividades_modelosCriacaoBuildPresenterMembers_(
        ss,
        atividades_modelosCriacaoResolverCicloReferencia_(testDate)
      ).members.filter(function(member) {
        return member.elegivelApresentacao === true;
      })[0] || null;
      if (!presenter) {
        return {
          subtipoAtividade: subtype,
          idConfig: String(model.ID_CONFIG || ''),
          ok: false,
          errorCode: 'SEM_MEMBRO_APRESENTADOR_ELEGIVEL'
        };
      }
    }
    var payload = {
      idConfig: model.ID_CONFIG,
      atividade: {
        tituloPublico: subtype === 'APRESENTACAO_MEMBRO' ? '' : 'Teste DEV - ' + subtype,
        dataAtividade: testDate,
        horarioInicio: '18h30',
        horarioFim: '20h30',
        formato: 'PRESENCIAL',
        local: 'Ambiente de teste DEV',
        eixoTematicoPrincipal: atividades_modelosCriacaoIsYes_(model.EXIGE_EIXO_TEMATICO) ? officialAxis : '',
        idPessoaPrincipal: presenter ? presenter.idPessoa : '',
        nomePessoaPrincipalPublico: presenter
          ? presenter.nomeExibicao
          : (atividades_modelosCriacaoIsYes_(model.EXIGE_PESSOA_PRINCIPAL) ? 'Pessoa de teste' : ''),
        rgaPessoaPrincipal: presenter ? presenter.rga : '',
        tipoPessoaPrincipal: allowedTypes[0] || '',
        emailPessoaPrincipal: presenter
          ? presenter.email
          : (atividades_modelosCriacaoIsYes_(model.EXIGE_EMAIL_PESSOA_PRINCIPAL) ? 'teste-dev@geapa.local' : ''),
        instituicaoPessoaPrincipal: atividades_modelosCriacaoIsYes_(model.EXIGE_INSTITUICAO_PESSOA_PRINCIPAL) ? 'Instituicao de teste' : ''
      }
    };
    var result = atividades_modelosCriacaoValidate_(payload, contexto, { emitirConfirmacao: false });
    return {
      subtipoAtividade: subtype,
      idConfig: String(model.ID_CONFIG || ''),
      ok: result.ok === true,
      errorCode: result.errorCode || '',
      excecaoNecessaria: result.excecaoNecessaria === true
    };
  });

  var testCycle = atividades_modelosCriacaoResolverCicloReferencia_(testDate);
  var invalidAxisErrors = {};
  var invalidAxisResolved = atividades_modelosCriacaoResolveOfficialAxis_(
    'EIXO_LIVRE_NAO_OFICIAL_TESTE',
    'eixoTematicoPrincipal',
    invalidAxisErrors
  );
  var axisTest = {
    ok: !invalidAxisResolved && !!invalidAxisErrors.eixoTematicoPrincipal,
    eixoOficialUsado: officialAxis,
    textoLivreRejeitado: !invalidAxisResolved && !!invalidAxisErrors.eixoTematicoPrincipal
  };
  var semestersMatchCycle = atividades_modelosCriacaoActivityMatchesCiclo_({ CICLO: testCycle.idCiclo, ANO: 2026, SEMESTRE: 1 }, testCycle) &&
    atividades_modelosCriacaoActivityMatchesCiclo_({ CICLO: testCycle.idCiclo, ANO: 2026, SEMESTRE: 2 }, testCycle);
  var cycleTest = {
    ok: semestersMatchCycle,
    idCiclo: testCycle.idCiclo,
    semestresMesmoCicloReconhecidos: semestersMatchCycle,
    cachePorIdCiclo: atividades_modelosCriacaoPresenterCacheKey_(testCycle).indexOf(testCycle.idCiclo) >= 0
  };
  cycleTest.ok = cycleTest.ok && cycleTest.cachePorIdCiclo;

  return {
    ok: tests.every(function(test) { return test.ok; }) && cycleTest.ok && axisTest.ok,
    dryRun: true,
    escrita: false,
    ambiente: 'DEV',
    testes: tests,
    testeCiclo: cycleTest,
    testeEixosOficiais: axisTest,
    total: tests.length,
    aprovados: tests.filter(function(test) { return test.ok; }).length
  };
}
