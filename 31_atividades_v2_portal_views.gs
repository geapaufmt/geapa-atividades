/**
 * Rotinas manuais de atualizacao e conferencia das views PORTAL_* da base
 * ATIVIDADES v2 DEV.
 *
 * Nenhuma funcao aqui altera producao, cria triggers ou escreve em bases V1.
 */

function atividadesV2_diagnostico_() {
  var ss = atividadesV2_getDatabaseSpreadsheetDev_();
  var result = {
    ok: true,
    modo: 'DEV',
    spreadsheetId: ss.getId(),
    url: ss.getUrl(),
    sheets: {},
    consistencia: null,
    avisos: [],
    erros: []
  };

  ATIVIDADES_V2_SHEET_ORDER.forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      result.ok = false;
      result.erros.push('Aba ausente: ' + sheetName);
      result.sheets[sheetName] = { exists: false };
      return;
    }

    var expected = ATIVIDADES_V2_SCHEMA_BY_SHEET[sheetName] || [];
    var headers = atividadesV2_getSheetHeaders_(sheet);
    var missing = expected.filter(function(header) {
      return headers.indexOf(header) === -1;
    });
    if (missing.length) {
      result.ok = false;
      result.erros.push(sheetName + ': cabecalhos ausentes: ' + missing.join(', '));
    }
    result.sheets[sheetName] = {
      exists: true,
      dataRows: Math.max(sheet.getLastRow() - 1, 0),
      lastColumn: sheet.getLastColumn(),
      missingHeaders: missing
    };
  });

  result.consistencia = atividadesV2_conferirConsistencia_({ includeSamples: true });
  if (!result.consistencia.ok) result.ok = false;
  return result;
}

function atividadesV2_conferirConsistencia_(options) {
  var opts = options || {};
  var ss = atividadesV2_getDatabaseSpreadsheetDev_();
  var data = atividadesV2_readPortalViewsSourceData_(ss);
  var issues = [];
  var now = new Date();
  var includeSamples = opts.includeSamples !== false;
  var pendenciasAtuais = atividadesV2_indexByField_(data.portalPendencias, 'ID_PENDENCIA');
  var atividadesById = atividadesV2_indexByField_(data.atividades, 'ID_ATIVIDADE');
  var apresentacoesPorAtividade = atividadesV2_indexApresentacoesPorAtividade_(data.apresentacoes);
  var envolvidosDuplicateIndex = {};
  var detalhesByActivity = {};

  data.atividades.forEach(function(record) {
    var id = String(record.ID_ATIVIDADE || '').trim();
    var published = atividadesV2_isPublicadaPortal_(record);
    if (!id) atividadesV2_addConsistencyIssue_(issues, 'ERRO', 'ATIVIDADE_SEM_ID', 'Atividade sem ID_ATIVIDADE.', record);
    else if (!atividadesV2_isCanonicalActivityId_(id)) atividadesV2_addConsistencyIssue_(issues, 'ERRO', 'ID_ATIVIDADE_INVALIDO', 'ID_ATIVIDADE fora do padrao ATV-AAAA-S-NNNN.', record);
    if (!record.DATA_ATIVIDADE) atividadesV2_addConsistencyIssue_(issues, 'ERRO', 'ATIVIDADE_SEM_DATA', 'Atividade sem DATA_ATIVIDADE.', record);
    if (published && !String(record.TITULO_PUBLICO || record.TITULO || '').trim()) atividadesV2_addConsistencyIssue_(issues, 'AVISO', 'PUBLICADA_SEM_TITULO_PUBLICO', 'Atividade publicada sem titulo publico.', record);
    if (published && !String(record.VISIBILIDADE_PORTAL || '').trim()) atividadesV2_addConsistencyIssue_(issues, 'AVISO', 'PUBLICADA_SEM_VISIBILIDADE', 'Atividade publicada sem visibilidade.', record);
    if (atividades_isTruthySim_(record.GERA_CERTIFICADO) && !String(record.CARGA_HORARIA || '').trim()) atividadesV2_addConsistencyIssue_(issues, 'AVISO', 'CERTIFICADO_SEM_CARGA_HORARIA', 'Atividade gera certificado sem carga horaria.', record);
    if (atividades_isTruthySim_(record.CONTA_FALTA) && !atividades_isTruthySim_(record.CONTA_PRESENCA) && !atividades_isTruthySim_(record.EXIGE_LISTA_PRESENCA)) {
      atividadesV2_addConsistencyIssue_(issues, 'AVISO', 'FALTA_SEM_CONFIG_PRESENCA', 'Atividade conta falta sem configuracao clara de presenca.', record);
    }
    if (atividadesV2_isAtividadeAcademicaOuFormativa_(record) && !String(record.EIXO_TEMATICO_PRINCIPAL || '').trim()) {
      atividadesV2_addConsistencyIssue_(issues, 'AVISO', 'ATIVIDADE_ACADEMICA_SEM_EIXO', 'Atividade academica/formativa sem eixo tematico principal.', record);
    }
    if (String(record.ID_PESSOA_PRINCIPAL || record.NOME_PESSOA_PRINCIPAL_PUBLICO || record.RGA_PESSOA_PRINCIPAL || '').trim() && !String(record.PAPEL_PESSOA_PRINCIPAL || '').trim()) {
      atividadesV2_addConsistencyIssue_(issues, 'AVISO', 'PESSOA_PRINCIPAL_SEM_PAPEL', 'Atividade com pessoa principal sem papel definido.', record);
    }
    if (atividadesV2_isFluxoApresentacao_(record)) {
      if (!String(record.EIXO_TEMATICO_PRINCIPAL || '').trim()) atividadesV2_addConsistencyIssue_(issues, 'AVISO', 'APRESENTACAO_SEM_EIXO', 'Apresentacao de membro sem eixo tematico principal em Atividades.', record);
      if (!String(record.ID_PESSOA_PRINCIPAL || record.NOME_PESSOA_PRINCIPAL_PUBLICO || record.RGA_PESSOA_PRINCIPAL || '').trim()) atividadesV2_addConsistencyIssue_(issues, 'AVISO', 'APRESENTACAO_SEM_PESSOA_PRINCIPAL', 'Apresentacao de membro sem pessoa principal em Atividades.', record);
      if (!String(record.TITULO_PUBLICO || record.TITULO || '').trim()) atividadesV2_addConsistencyIssue_(issues, 'AVISO', 'APRESENTACAO_SEM_TITULO_PUBLICO', 'Apresentacao de membro sem titulo publico em Atividades.', record);
      if (!apresentacoesPorAtividade[id] || !apresentacoesPorAtividade[id].length) {
        atividadesV2_addConsistencyIssue_(issues, 'AVISO', 'FLUXO_APRESENTACAO_SEM_EXTENSAO', 'Atividade com fluxo de apresentacao sem linha correspondente em Atividades_Apresentacoes.', record);
      }
    }
  });

  var presencasById = atividadesV2_indexByField_(data.presencas, 'ID_REGISTRO_PRESENCA');

  data.presencas.forEach(function(record) {
    var idAtividade = String(record.ID_ATIVIDADE || '').trim();
    if (idAtividade && !atividadesById[idAtividade]) atividadesV2_addConsistencyIssue_(issues, 'ERRO', 'PRESENCA_ATIVIDADE_INEXISTENTE', 'Presenca vinculada a atividade inexistente.', record);
    if (atividades_normalizeTextUpper_(record.TIPO_PARTICIPANTE) === 'MEMBRO' && !String(record.ID_PESSOA || record.RGA || '').trim()) {
      atividadesV2_addConsistencyIssue_(issues, 'AVISO', 'PRESENCA_MEMBRO_SEM_IDENTIFICADOR', 'Presenca de membro sem ID_PESSOA/RGA para validar aplicabilidade.', record);
    }
    if (atividades_normalizeTextUpper_(record.TIPO_PARTICIPANTE || 'MEMBRO') === 'MEMBRO') {
      var activity = atividadesById[idAtividade] || {};
      var applicability = atividadesV2_checkPresenceMemberApplicability_(record, record.DATA_ATIVIDADE || activity.DATA_ATIVIDADE);
      if (applicability === false) {
        atividadesV2_addConsistencyIssue_(issues, 'AVISO', 'PRESENCA_MEMBRO_NAO_APLICAVEL_DATA', 'Presenca de membro nao aplicavel na data da atividade.', record);
      }
    }
  });

  data.apresentacoes.forEach(function(record) {
    var idAtividade = String(record.ID_ATIVIDADE || '').trim();
    var atividade = atividadesById[idAtividade] || {};
    if (!idAtividade || !atividadesV2_isCanonicalActivityId_(idAtividade)) atividadesV2_addConsistencyIssue_(issues, 'ERRO', 'APRESENTACAO_ID_ATIVIDADE_INVALIDO', 'Linha de apresentacao sem ID_ATIVIDADE valido.', record);
    else if (!atividade.ID_ATIVIDADE) atividadesV2_addConsistencyIssue_(issues, 'ERRO', 'APRESENTACAO_SEM_ATIVIDADE', 'Apresentacao sem atividade vinculada.', record);
    if (!String(atividade.ID_PESSOA_PRINCIPAL || atividade.RGA_PESSOA_PRINCIPAL || atividade.NOME_PESSOA_PRINCIPAL_PUBLICO || record.ID_PESSOA || record.RGA || record.NOME_MEMBRO || '').trim()) {
      atividadesV2_addConsistencyIssue_(issues, 'AVISO', 'APRESENTACAO_SEM_APRESENTADOR', 'Apresentacao sem apresentador em Atividades nem legado.', record);
    }
    if (atividades_normalizeTextUpper_(record.PUBLICAR_NO_PORTAL || 'SIM') !== 'NAO') {
      if (!String(atividade.TITULO_PUBLICO || atividade.TITULO || record.TITULO_APRESENTACAO || '').trim()) atividadesV2_addConsistencyIssue_(issues, 'AVISO', 'APRESENTACAO_PUBLICAVEL_SEM_TITULO', 'Apresentacao publicavel sem titulo.', record);
      if (!String(atividade.EIXO_TEMATICO_PRINCIPAL || record.EIXO_TEMATICO_PRINCIPAL || '').trim()) atividadesV2_addConsistencyIssue_(issues, 'AVISO', 'APRESENTACAO_PUBLICAVEL_SEM_EIXO', 'Apresentacao publicavel sem eixo tematico principal.', record);
    }
  });

  var apresentacoesById = atividadesV2_indexByField_(data.apresentacoes, 'ID_APRESENTACAO');
  (data.arquivos || []).forEach(function(record) {
    var idAtividade = String(record.ID_ATIVIDADE || '').trim();
    var idApresentacao = String(record.ID_APRESENTACAO || '').trim();
    var tipoArquivo = atividades_normalizeTextUpper_(record.TIPO_ARQUIVO_ATIVIDADE);
    if (!idAtividade || !atividadesById[idAtividade]) {
      atividadesV2_addConsistencyIssue_(issues, 'ERRO', 'ARQUIVO_SEM_ATIVIDADE', 'Arquivo vinculado a atividade inexistente.', record);
    }
    if (idApresentacao && !apresentacoesById[idApresentacao]) {
      atividadesV2_addConsistencyIssue_(issues, 'ERRO', 'ARQUIVO_SEM_APRESENTACAO', 'Arquivo vinculado a apresentacao inexistente.', record);
    }
    if (['SLIDE_APRESENTACAO', 'FOTO_REUNIAO'].indexOf(tipoArquivo) < 0) {
      atividadesV2_addConsistencyIssue_(issues, 'AVISO', 'TIPO_ARQUIVO_INVALIDO', 'Tipo de arquivo de atividade nao reconhecido.', record);
    }
  });

  data.envolvidos.forEach(function(record) {
    var idAtividade = String(record.ID_ATIVIDADE || '').trim();
    if (idAtividade && !atividadesById[idAtividade]) atividadesV2_addConsistencyIssue_(issues, 'ERRO', 'ENVOLVIDO_ATIVIDADE_INEXISTENTE', 'Envolvido vinculado a atividade inexistente.', record);
    var key = [
      idAtividade,
      atividadesV2_sanitizeIdToken_(record.PAPEL_NA_ATIVIDADE || ''),
      atividadesV2_sanitizeIdToken_(record.ID_PESSOA || record.RGA || record.EMAIL || record.NOME_PUBLICO || '')
    ].join('|');
    if (!key.replace(/\|/g, '')) return;
    if (envolvidosDuplicateIndex[key]) {
      atividadesV2_addConsistencyIssue_(issues, 'AVISO', 'ENVOLVIDO_DUPLICADO', 'Atividade com envolvido duplicado por papel e identificador.', record);
    }
    envolvidosDuplicateIndex[key] = true;
  });

  data.justificativas.forEach(function(record) {
    var idAtividade = String(record.ID_ATIVIDADE || '').trim();
    var idPresenca = String(record.ID_REGISTRO_PRESENCA || '').trim();
    if (!idAtividade || !atividadesById[idAtividade]) atividadesV2_addConsistencyIssue_(issues, 'ERRO', 'JUSTIFICATIVA_SEM_ATIVIDADE', 'Justificativa sem atividade correspondente.', record);
    if (idPresenca && !presencasById[idPresenca]) atividadesV2_addConsistencyIssue_(issues, 'AVISO', 'JUSTIFICATIVA_SEM_PRESENCA', 'Justificativa sem presenca correspondente.', record);
  });

  data.portalDetalhes.forEach(function(record) {
    var idDetalhe = String(record.ID_ATIVIDADE || '').trim();
    if (!idDetalhe) return;
    if (detalhesByActivity[idDetalhe]) {
      atividadesV2_addConsistencyIssue_(issues, 'ERRO', 'PORTAL_DETALHES_ID_ATIVIDADE_DUPLICADO', 'PORTAL_ATIVIDADES_DETALHES possui mais de uma linha para a mesma atividade.', record);
    }
    detalhesByActivity[idDetalhe] = true;

    var parsed = atividadesV2_parsePublicJsonArray_(record.APRESENTACOES_PUBLICAS_JSON);
    var rawJson = String(record.APRESENTACOES_PUBLICAS_JSON || '').trim();
    if (rawJson && !atividadesV2_isJsonArrayString_(rawJson)) atividadesV2_addConsistencyIssue_(issues, 'ERRO', 'APRESENTACOES_PUBLICAS_JSON_INVALIDO', 'APRESENTACOES_PUBLICAS_JSON invalido.', record);

    var qtd = Number(record.QTD_APRESENTACOES || 0);
    if (qtd !== parsed.length) atividadesV2_addConsistencyIssue_(issues, 'AVISO', 'QTD_APRESENTACOES_DIVERGENTE_JSON', 'QTD_APRESENTACOES diferente da quantidade no JSON.', record);
    if (atividades_isTruthySim_(record.POSSUI_APRESENTACOES || (qtd > 0 ? 'SIM' : 'NAO')) && !parsed.length) {
      atividadesV2_addConsistencyIssue_(issues, 'AVISO', 'POSSUI_APRESENTACOES_SEM_JSON', 'Atividade indica apresentacoes, mas JSON esta vazio.', record);
    }
  });

  atividadesV2_buildPendenciasDiretoriaRows_(data, now).forEach(function(pendencia) {
    if (!pendenciasAtuais[pendencia.ID_PENDENCIA]) {
      issues.push({
        severity: 'AVISO',
        code: 'PENDENCIA_NAO_REFLETIDA_NO_PORTAL',
        message: 'Pendencia vencida nao refletida em PORTAL_PENDENCIAS_DIRETORIA.',
        entityId: pendencia.ID_ATIVIDADE,
        entityType: 'PENDENCIA',
        sheetName: ATIVIDADES_V2_SHEETS.PORTAL_PENDENCIAS_DIRETORIA,
        details: includeSamples ? pendencia : {}
      });
    }
  });

  return {
    ok: issues.filter(function(issue) { return issue.severity === 'ERRO'; }).length === 0,
    modo: 'DEV',
    totalIssues: issues.length,
    erros: issues.filter(function(issue) { return issue.severity === 'ERRO'; }).length,
    avisos: issues.filter(function(issue) { return issue.severity !== 'ERRO'; }).length,
    issues: issues
  };
}

function atividadesV2_conferirContratoPortalAtivo_(options) {
  var opts = options || {};
  var ss = atividadesV2_getDatabaseSpreadsheetDev_();
  var detalhesSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_DETALHES);
  var calendarioSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_CALENDARIO);
  var atividadesSheet = atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES);
  var detalhes = atividadesV2_readSheetObjects_(detalhesSheet);
  var calendario = atividadesV2_readSheetObjects_(calendarioSheet);
  var atividades = atividadesV2_readSheetObjects_(atividadesSheet);
  var atividadesById = atividadesV2_indexByField_(atividades, 'ID_ATIVIDADE');
  var calendarioHeaders = atividadesV2_getSheetHeaders_(calendarioSheet);
  var detalhesHeaders = atividadesV2_getSheetHeaders_(detalhesSheet);
  var checks = [];
  var inconsistenciasSemestre = atividadesV2_findPortalSemesterIssues_(calendario, detalhes, atividadesById);
  var camposRemovidosPresentes = atividadesV2_findRemovedPortalViewHeaders_(calendarioHeaders, detalhesHeaders);
  var exemplos = {
    atividadeSemApresentacao: null,
    atividadeComUmaApresentacao: null,
    atividadeComMultiplasApresentacoes: null,
    detalheJsonVazio: null,
    detalheJsonValido: null
  };

  detalhes.forEach(function(record) {
    var parsed = atividadesV2_parsePublicJsonArray_(record.APRESENTACOES_PUBLICAS_JSON);
    var sample = atividadesV2_sanitizePortalViewPreviewRecord_(record);
    if (!parsed.length && !exemplos.atividadeSemApresentacao) exemplos.atividadeSemApresentacao = sample;
    if (parsed.length === 1 && !exemplos.atividadeComUmaApresentacao) exemplos.atividadeComUmaApresentacao = sample;
    if (parsed.length > 1 && !exemplos.atividadeComMultiplasApresentacoes) exemplos.atividadeComMultiplasApresentacoes = sample;
    if (!String(record.APRESENTACOES_PUBLICAS_JSON || '').trim() && !exemplos.detalheJsonVazio) exemplos.detalheJsonVazio = sample;
    if (String(record.APRESENTACOES_PUBLICAS_JSON || '').trim() && parsed.length && !exemplos.detalheJsonValido) exemplos.detalheJsonValido = sample;
  });

  atividadesV2_addContractCheck_(checks, 'CALENDARIO_EXISTE', !!calendarioSheet, 'View de lista/cards/historico disponivel.');
  atividadesV2_addContractCheck_(checks, 'DETALHES_EXISTE', !!detalhesSheet, 'View de detalhe completo disponivel.');
  atividadesV2_addContractCheck_(checks, 'DETALHES_JSON_VALIDO', detalhes.every(function(record) {
    var raw = String(record.APRESENTACOES_PUBLICAS_JSON || '').trim();
    return !raw || atividadesV2_isJsonArrayString_(raw);
  }), 'Detalhes nao possuem JSON invalido de apresentacoes.');
  atividadesV2_addContractCheck_(checks, 'ENVOLVIDOS_JSON_VALIDO', detalhes.every(function(record) {
    var raw = String(record.ENVOLVIDOS_PUBLICOS_JSON || '').trim();
    return !raw || atividadesV2_isJsonArrayString_(raw);
  }), 'Detalhes aceitam envolvidos publicos serializados.');
  atividadesV2_addContractCheck_(checks, 'SEMESTRE_CONSISTENTE', inconsistenciasSemestre.length === 0, 'Calendario e detalhes possuem CICLO/ANO/SEMESTRE/ROTULO_SEMESTRE quando Atividades possui esses campos.');
  atividadesV2_addContractCheck_(checks, 'COLUNAS_REMOVIDAS_AUSENTES', camposRemovidosPresentes.length === 0, 'Views ativas nao possuem cabecalhos removidos do contrato.');
  atividadesV2_addContractCheck_(checks, 'DRY_RUN_SEM_ESCRITA', opts.dryRun !== false, 'Conferencia e somente leitura.');

  var failed = checks.filter(function(check) { return !check.ok; });
  return {
    ok: failed.length === 0,
    dryRun: true,
    modo: 'DEV',
    contratoAtivoPortal: [
      ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_CALENDARIO,
      ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_DETALHES
    ],
    abasLidas: [
      ATIVIDADES_V2_SHEETS.ATIVIDADES,
      ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_CALENDARIO,
      ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_DETALHES
    ],
    abasEscritas: [],
    abasOperacionaisProtegidas: atividadesV2_getProtectedOperationalSheetNames_(),
    totalCalendario: calendario.length,
    totalDetalhes: detalhes.length,
    inconsistenciasSemestre: inconsistenciasSemestre.slice(0, 50),
    camposRemovidosPresentes: camposRemovidosPresentes,
    checks: checks,
    exemplos: exemplos,
    riscoSobrescreverDadosManuais: false,
    mensagemRisco: 'Conferencia somente leitura; atualizacoes normais escrevem apenas em views materializadas.',
    avisos: failed.map(function(check) { return check.code + ': ' + check.message; }),
    erros: []
  };
}

function atividadesV2_diagnosticarCicloSemestrePortalDev_() {
  var ss = atividadesV2_getDatabaseSpreadsheetDev_();
  var targets = [
    ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_CALENDARIO,
    ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_DETALHES
  ];
  var result = {
    ok: true,
    modo: 'DEV',
    totalAnalisadas: 0,
    totalInvalidas: 0,
    invalidas: [],
    avisos: [],
    erros: []
  };

  targets.forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      result.avisos.push('Aba nao encontrada: ' + sheetName);
      return;
    }
    atividadesV2_readSheetObjects_(sheet).forEach(function(record) {
      result.totalAnalisadas++;
      var atual = String(record.ROTULO_SEMESTRE || '').trim();
      var corrigido = atividadesV2_normalizarRotuloSemestre_(record);
      var atualValido = !atual || atividadesV2_isRotuloSemestreValido_(atual);
      var precisaCorrigir = !!corrigido && atual !== corrigido;
      if (atualValido && !precisaCorrigir) return;
      result.invalidas.push({
        aba: sheetName,
        linha: record._rowNumber || '',
        idAtividade: String(record.ID_ATIVIDADE || '').trim(),
        titulo: atividades_sanitizePortalText_(record.TITULO_PUBLICO || record.TITULO_ATIVIDADE || record.TITULO || '', 180),
        rotuloSemestreAtual: atual,
        ano: String(record.ANO || '').trim(),
        semestre: String(record.SEMESTRE || '').trim(),
        ciclo: String(record.CICLO || '').trim(),
        dataAtividade: atividades_formatPortalDateIso_(record.DATA_ATIVIDADE),
        rotuloSemestreCorrigido: corrigido
      });
    });
  });

  result.totalInvalidas = result.invalidas.length;
  Logger.log('GEAPA-ATIVIDADES-V2-PORTAL ciclo/semestre diagnostico: ' + atividadesV2_safeLogData_({
    totalAnalisadas: result.totalAnalisadas,
    totalInvalidas: result.totalInvalidas,
    primeiraInvalida: result.invalidas[0] || null
  }));
  return result;
}

function atividadesV2_findPortalSemesterIssues_(calendario, detalhes, atividadesById) {
  var issues = [];
  [{ sheetName: ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_CALENDARIO, rows: calendario || [] },
   { sheetName: ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_DETALHES, rows: detalhes || [] }]
    .forEach(function(group) {
      group.rows.forEach(function(row) {
        var id = String(row.ID_ATIVIDADE || '').trim();
        var origem = atividadesById[id] || {};
        var expected = atividadesV2_getSemestrePortalFields_(origem.ID_ATIVIDADE ? origem : row);
        var currentRotulo = String(row.ROTULO_SEMESTRE || '').trim();
        if (currentRotulo && !atividadesV2_isRotuloSemestreValido_(currentRotulo)) {
          issues.push({
            sheetName: group.sheetName,
            idAtividade: id,
            field: 'ROTULO_SEMESTRE',
            esperado: expected.ROTULO_SEMESTRE || '',
            encontrado: currentRotulo,
            motivo: 'ROTULO_SEMESTRE fora do padrao AAAA/S.'
          });
        }
        ['CICLO', 'ANO', 'SEMESTRE', 'ROTULO_SEMESTRE'].forEach(function(field) {
          if (!String(expected[field] || '').trim()) return;
          if (String(row[field] || '').trim() !== String(expected[field] || '').trim()) {
            issues.push({
              sheetName: group.sheetName,
              idAtividade: id,
              field: field,
              esperado: expected[field],
              encontrado: String(row[field] || '').trim()
            });
          }
        });
      });
    });
  return issues;
}

function atividadesV2_findRemovedPortalViewHeaders_(calendarioHeaders, detalhesHeaders) {
  var removed = [];
  var calendarRemoved = ['ID_APRESENTACAO', 'EH_APRESENTACAO', 'LINK_DETALHES'];
  var detailRemoved = [
    'ID_APRESENTACAO',
    'EH_APRESENTACAO',
    'RGA_PESSOA_PRINCIPAL',
    'EMAIL_PESSOA_PRINCIPAL',
    'NOME_APRESENTADOR_PUBLICO',
    'ID_PESSOA_APRESENTADOR',
    'RGA_APRESENTADOR',
    'EMAIL_APRESENTADOR',
    'TITULO_APRESENTACAO',
    'STATUS_APRESENTACAO_PUBLICO',
    'STATUS_TITULO_EIXO',
    'STATUS_ARQUIVO_PUBLICO',
    'LINK_ARQUIVO_PUBLICO'
  ];

  calendarRemoved.forEach(function(header) {
    if ((calendarioHeaders || []).indexOf(header) >= 0) {
      removed.push({ sheetName: ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_CALENDARIO, header: header });
    }
  });
  detailRemoved.forEach(function(header) {
    if ((detalhesHeaders || []).indexOf(header) >= 0) {
      removed.push({ sheetName: ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_DETALHES, header: header });
    }
  });
  return removed;
}

function atividadesV2_addContractCheck_(checks, code, ok, message) {
  checks.push({
    code: code,
    ok: ok === true,
    message: message
  });
}

function atividadesV2_isJsonArrayString_(value) {
  try {
    return Array.isArray(JSON.parse(String(value || '')));
  } catch (e) {
    return false;
  }
}

function atividadesV2_getProtectedOperationalSheetNames_() {
  return [
    ATIVIDADES_V2_SHEETS.ATIVIDADES,
    ATIVIDADES_V2_SHEETS.APRESENTACOES,
    ATIVIDADES_V2_SHEETS.ARQUIVOS,
    ATIVIDADES_V2_SHEETS.ENVOLVIDOS,
    ATIVIDADES_V2_SHEETS.CONFIG,
    ATIVIDADES_V2_SHEETS.PRESENCAS_REGISTROS,
    ATIVIDADES_V2_SHEETS.JUSTIFICATIVAS
  ];
}

function atividadesV2_getPortalViewSourceSheetNames_() {
  return [
    ATIVIDADES_V2_SHEETS.ATIVIDADES,
    ATIVIDADES_V2_SHEETS.APRESENTACOES,
    ATIVIDADES_V2_SHEETS.ARQUIVOS,
    ATIVIDADES_V2_SHEETS.ENVOLVIDOS,
    ATIVIDADES_V2_SHEETS.PRESENCAS_REGISTROS,
    ATIVIDADES_V2_SHEETS.JUSTIFICATIVAS
  ];
}

function atividadesV2_atualizarPortalCalendario_(options) {
  return atividadesV2_updatePortalViewWithLock_('PORTAL_ATIVIDADES_CALENDARIO', options, function(ss, opts) {
    var atividades = atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES));
    var apresentacoes = atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.APRESENTACOES));
    var apresentacoesPorAtividade = atividadesV2_indexApresentacoesPorAtividade_(apresentacoes);
    var syncDate = new Date();
    var avisos = [];
    var ignored = 0;
    var rows = [];
    atividades.forEach(function(record) {
      var decision = atividadesV2_shouldPublishPortalCalendarActivity_(record, syncDate);
      if (!decision.publish) {
        ignored++;
        if (decision.warning) avisos.push(decision.warning);
        return;
      }
      rows.push(atividadesV2_buildPortalCalendarRow_(record, syncDate, apresentacoesPorAtividade[String(record.ID_ATIVIDADE || '').trim()] || []));
    });
    return atividadesV2_finishPortalViewUpdate_(ss, opts, ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_CALENDARIO, ATIVIDADES_V2_SCHEMA.PORTAL_ATIVIDADES_CALENDARIO, rows, {
      abasLidas: [ATIVIDADES_V2_SHEETS.ATIVIDADES, ATIVIDADES_V2_SHEETS.APRESENTACOES],
      totalLidas: atividades.length,
      totalPublicadas: rows.length,
      totalIgnoradas: ignored,
      avisos: avisos
    });
  });
}

function atividadesV2_atualizarPortalDetalhes_(options) {
  return atividadesV2_updatePortalViewWithLock_('PORTAL_ATIVIDADES_DETALHES', options, function(ss, opts) {
    var atividades = atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES));
    var apresentacoes = atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.APRESENTACOES));
    var envolvidos = atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ENVOLVIDOS));
    var apresentacoesPorAtividade = atividadesV2_indexApresentacoesPorAtividade_(apresentacoes);
    var envolvidosPorAtividade = atividadesV2_indexEnvolvidosPorAtividade_(envolvidos);
    var rows = [];
    var syncDate = new Date();
    var vinculadas = 0;
    var semVinculo = 0;
    atividades.forEach(function(atividade) {
      if (atividades_normalizeTextUpper_(atividade.ATIVO) === 'NAO') return;
      var idAtividade = String(atividade.ID_ATIVIDADE || '').trim();
      if (!atividadesV2_isCanonicalActivityId_(idAtividade)) return;
      var list = apresentacoesPorAtividade[idAtividade] || [];
      vinculadas += list.length;
      if (!list.length && atividadesV2_isFluxoApresentacao_(atividade)) semVinculo++;
      rows.push(atividadesV2_buildPortalDetalheRow_(atividade, list, syncDate, envolvidosPorAtividade[idAtividade] || []));
    });
    return atividadesV2_finishPortalViewUpdate_(ss, opts, ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_DETALHES, ATIVIDADES_V2_SCHEMA.PORTAL_ATIVIDADES_DETALHES, rows, {
      abasLidas: [ATIVIDADES_V2_SHEETS.ATIVIDADES, ATIVIDADES_V2_SHEETS.APRESENTACOES, ATIVIDADES_V2_SHEETS.ENVOLVIDOS],
      totalAtividadesLidas: atividades.length,
      totalApresentacoesLidas: apresentacoes.length,
      totalDetalhesGerados: rows.length,
      totalApresentacoesVinculadas: vinculadas,
      atividadesSemApresentacaoVinculada: semVinculo
    });
  });
}

function atividadesV2_recalcularFrequenciaMembros_(options) {
  return atividadesV2_updatePortalViewWithLock_('PORTAL_FREQUENCIA_MEMBROS', options, function(ss, opts) {
    var presencas = atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.PRESENCAS_REGISTROS));
    var grouped = {};
    presencas.forEach(function(record) {
      if (atividades_normalizeTextUpper_(record.ATIVO) === 'NAO') return;
      if (atividades_normalizeTextUpper_(record.TIPO_PARTICIPANTE || 'MEMBRO') !== 'MEMBRO') return;
      var idPessoa = String(record.ID_PESSOA || '').trim();
      var rga = String(record.RGA || record.ID_REFERENCIA || '').trim();
      var ciclo = String(record.CICLO || '').trim();
      var key = [idPessoa || rga, ciclo].join('|');
      if (!grouped[key]) grouped[key] = atividadesV2_newFrequencyBucket_(record, ciclo);
      atividadesV2_accumulateFrequencyBucket_(grouped[key], record);
    });
    var now = new Date();
    var rows = Object.keys(grouped).map(function(key) {
      return atividadesV2_buildFrequencyPortalRow_(grouped[key], now);
    });
    return atividadesV2_finishPortalViewUpdate_(ss, opts, ATIVIDADES_V2_SHEETS.PORTAL_FREQUENCIA_MEMBROS, ATIVIDADES_V2_SCHEMA.PORTAL_FREQUENCIA_MEMBROS, rows, {
      abasLidas: [ATIVIDADES_V2_SHEETS.PRESENCAS_REGISTROS],
      totalPresencasLidas: presencas.length,
      totalMembrosCiclo: rows.length
    });
  });
}

function atividadesV2_atualizarPortalJustificativas_(options) {
  return atividadesV2_updatePortalViewWithLock_('PORTAL_JUSTIFICATIVAS', options, function(ss, opts) {
    var justificativas = atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.JUSTIFICATIVAS));
    var now = new Date();
    var rows = justificativas.filter(function(record) {
      return atividades_normalizeTextUpper_(record.ATIVO || 'SIM') !== 'NAO';
    }).map(function(record) {
      var prazo = typeof atividadesV2_classificarPrazoJustificativaRecord_ === 'function'
        ? atividadesV2_classificarPrazoJustificativaRecord_(record, new Date())
        : { statusPrazo: '', envioForaDoPrazo: 'NAO', mensagemPortal: '' };
      return {
        ID_JUSTIFICATIVA: record.ID_JUSTIFICATIVA || '',
        ID_REGISTRO_PRESENCA: record.ID_REGISTRO_PRESENCA || '',
        ID_PESSOA: record.ID_PESSOA || '',
        RGA: record.RGA || '',
        NOME_MEMBRO: atividades_sanitizePortalText_(record.NOME_MEMBRO, 180),
        ID_ATIVIDADE: record.ID_ATIVIDADE || '',
        DATA_ATIVIDADE: record.DATA_ATIVIDADE || '',
        TITULO_ATIVIDADE: atividades_sanitizePortalText_(record.TITULO_ATIVIDADE, 240),
        DATA_LIMITE_JUSTIFICATIVA: record.DATA_LIMITE_JUSTIFICATIVA || '',
        MOTIVO_DECLARADO: atividades_sanitizePortalText_(record.MOTIVO_DECLARADO, 180),
        DATA_ENVIO: record.DATA_ENVIO || '',
        STATUS_PRAZO: prazo.statusPrazo || '',
        ENVIO_FORA_DO_PRAZO: prazo.envioForaDoPrazo || 'NAO',
        STATUS_ANALISE: record.STATUS_ANALISE || '',
        DECISAO_APLICADA: record.DECISAO_APLICADA_NA_PRESENCA || '',
        OBSERVACAO_PUBLICA: atividades_sanitizePortalText_(record.OBSERVACAO_PUBLICA, 500),
        PODE_REENVIAR_AJUSTE: atividades_normalizeTextUpper_(record.STATUS_ANALISE) === 'AJUSTE_SOLICITADO' ? 'SIM' : 'NAO',
        MENSAGEM_PORTAL: prazo.mensagemPortal || '',
        ULTIMA_ATUALIZACAO: record.ATUALIZADO_EM || now
      };
    });
    return atividadesV2_finishPortalViewUpdate_(ss, opts, ATIVIDADES_V2_SHEETS.PORTAL_JUSTIFICATIVAS, ATIVIDADES_V2_SCHEMA.PORTAL_JUSTIFICATIVAS, rows, {
      abasLidas: [ATIVIDADES_V2_SHEETS.JUSTIFICATIVAS],
      totalJustificativasLidas: justificativas.length,
      totalJustificativasPublicadas: rows.length
    });
  });
}

function atividadesV2_atualizarPendenciasDiretoria_(options) {
  return atividadesV2_updatePortalViewWithLock_('PORTAL_PENDENCIAS_DIRETORIA', options, function(ss, opts) {
    var data = atividadesV2_readPortalViewsSourceData_(ss);
    var rows = atividadesV2_buildPendenciasDiretoriaRows_(data, new Date());
    return atividadesV2_finishPortalViewUpdate_(ss, opts, ATIVIDADES_V2_SHEETS.PORTAL_PENDENCIAS_DIRETORIA, ATIVIDADES_V2_SCHEMA.PORTAL_PENDENCIAS_DIRETORIA, rows, {
      abasLidas: atividadesV2_getPortalViewSourceSheetNames_(),
      totalPendencias: rows.length
    });
  });
}

function atividadesV2_atualizarPortalStatus_(options) {
  return atividadesV2_updatePortalViewWithLock_('PORTAL_STATUS_ATIVIDADES', options, function(ss, opts) {
    var data = atividadesV2_readPortalViewsSourceData_(ss);
    var pendencias = atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.PORTAL_PENDENCIAS_DIRETORIA));
    var now = new Date();
    var rows = [{
      ID_STATUS: 'STATUS-GERAL',
      DATA_HORA_ATUALIZACAO: now,
      TOTAL_ATIVIDADES: data.atividades.length,
      TOTAL_ATIVIDADES_PUBLICADAS: data.atividades.filter(atividadesV2_isPublicadaPortal_).length,
      TOTAL_ATIVIDADES_PLANEJADAS: data.atividades.filter(function(r) { return atividades_normalizeTextUpper_(r.STATUS_OPERACIONAL) === 'PLANEJADA'; }).length,
      TOTAL_ATIVIDADES_REALIZADAS: data.atividades.filter(function(r) { return atividades_normalizeTextUpper_(r.STATUS_OPERACIONAL) === 'REALIZADA'; }).length,
      TOTAL_APRESENTACOES: data.apresentacoes.length,
      TOTAL_PRESENCAS_REGISTRADAS: data.presencas.length,
      TOTAL_JUSTIFICATIVAS_PENDENTES: data.justificativas.filter(function(r) {
        return ['PENDENTE', 'ENVIADA', 'EM_ANALISE', 'AJUSTE_SOLICITADO'].indexOf(atividades_normalizeTextUpper_(r.STATUS_ANALISE)) >= 0;
      }).length,
      TOTAL_PENDENCIAS_DIRETORIA: pendencias.length,
      ULTIMO_PROCESSAMENTO: now,
      ULTIMO_ERRO: '',
      STATUS_GERAL: 'OK',
      OBSERVACOES: 'Atualizado por rotina manual v2 DEV.'
    }];
    return atividadesV2_finishPortalViewUpdate_(ss, opts, ATIVIDADES_V2_SHEETS.PORTAL_STATUS_ATIVIDADES, ATIVIDADES_V2_SCHEMA.PORTAL_STATUS_ATIVIDADES, rows, {
      abasLidas: atividadesV2_getPortalViewSourceSheetNames_().concat([ATIVIDADES_V2_SHEETS.PORTAL_PENDENCIAS_DIRETORIA]),
      totalStatus: rows.length
    });
  });
}

function atividadesV2_atualizarViewsPortal_(options) {
  var opts = options || {};
  var result = {
    ok: true,
    dryRun: opts.dryRun === true,
    steps: {},
    erros: [],
    avisos: []
  };
  [
    ['calendario', atividadesV2_atualizarPortalCalendario_],
    ['detalhes', atividadesV2_atualizarPortalDetalhes_],
    ['frequencia', atividadesV2_recalcularFrequenciaMembros_],
    ['justificativas', atividadesV2_atualizarPortalJustificativas_],
    ['pendencias', atividadesV2_atualizarPendenciasDiretoria_],
    ['status', atividadesV2_atualizarPortalStatus_]
  ].forEach(function(step) {
    if (!result.ok && opts.stopOnError !== false) return;
    var item = step[1](opts);
    result.steps[step[0]] = item;
    if (!item.ok) {
      result.ok = false;
      result.erros.push(step[0] + ': ' + (item.message || item.errorCode || 'erro'));
    }
    result.avisos = result.avisos.concat(item.avisos || []);
  });
  return result;
}

function atividadesV2_runTesteAtualizacaoPortalDev_() {
  var dryRun = atividadesV2_atualizarViewsPortal_({ dryRun: true });
  var consistencia = atividadesV2_conferirConsistencia_({ includeSamples: false });
  return {
    ok: dryRun.ok && consistencia.ok,
    dryRun: dryRun,
    consistencia: consistencia
  };
}

function atividadesV2_updatePortalViewWithLock_(flow, options, fn) {
  var opts = options || {};
  if (opts.dryRun === true) {
    return fn(atividadesV2_getDatabaseSpreadsheetDev_(), opts);
  }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return { ok: false, dryRun: false, flow: flow, errorCode: 'LOCK_INDISPONIVEL', message: 'Nao foi possivel obter lock para atualizar view v2.' };
  }
  try {
    return fn(atividadesV2_getDatabaseSpreadsheetDev_(), opts);
  } finally {
    lock.releaseLock();
  }
}

function atividadesV2_finishPortalViewUpdate_(ss, opts, sheetName, headers, rows, extra) {
  var dryRun = opts.dryRun === true;
  var sheet = atividadesV2_getTargetSheet_(ss, sheetName);
  var writeResult = null;
  if (!dryRun) {
    atividadesV2_resetPortalViewHeaders_(sheet, headers);
    atividadesV2_applyBasicSheetUx_(sheet);
    writeResult = opts.nonDestructive === true
      ? atividadesV2_upsertPortalRows_(sheet, headers, rows)
      : { mode: 'REPLACE', written: atividadesV2_replacePortalRows_(sheet, headers, rows) };
    atividadesV2_applyPortalViewColumnFormats_(sheet);
  }
  var result = Object.assign({
    ok: true,
    dryRun: dryRun,
    modo: 'DEV',
    destino: sheetName,
    abasLidas: extra && extra.abasLidas || [],
    abasEscritas: dryRun ? [] : [sheetName],
    abasQueSeriamEscritas: dryRun ? [sheetName] : [],
    totalLinhasGeradas: rows.length,
    totalLinhasEscritas: dryRun ? 0 : rows.length,
    modoEscrita: dryRun ? 'DRY_RUN' : (writeResult && writeResult.mode || 'REPLACE'),
    escrita: writeResult,
    preview: atividadesV2_sanitizePortalViewPreview_(rows),
    riscoSobrescreverDadosManuais: false,
    mensagemRisco: 'Rotina restrita a view materializada; abas operacionais manuais nao sao limpas nem sobrescritas.',
    avisos: [],
    erros: []
  }, extra || {});
  if (!dryRun) {
    atividadesV2_appendV2Log_(ss, {
      FLUXO: 'ATUALIZACAO_PORTAL_V2',
      ACAO: 'Atualizar view ' + sheetName,
      NIVEL: 'INFO',
      STATUS: 'OK',
      MENSAGEM: 'View v2 atualizada em DEV.',
      DETALHES_JSON: atividadesV2_safeLogData_({ sheetName: sheetName, rows: rows.length })
    });
  }
  return result;
}

function atividadesV2_sanitizePortalViewPreview_(rows) {
  return (rows || []).slice(0, 5).map(atividadesV2_sanitizePortalViewPreviewRecord_);
}

function atividadesV2_sanitizePortalViewPreviewRecord_(record) {
  var semestreFields = atividadesV2_getSemestrePortalFields_(record);
  return {
    ID_ATIVIDADE: record.ID_ATIVIDADE || '',
    CICLO: semestreFields.CICLO || record.CICLO || '',
    ROTULO_SEMESTRE: semestreFields.ROTULO_SEMESTRE,
    DATA_ATIVIDADE: record.DATA_ATIVIDADE || '',
    TITULO_PUBLICO: atividades_sanitizePortalText_(record.TITULO_PUBLICO || record.TITULO_ATIVIDADE || '', 120),
    TIPO_PUBLICO: record.TIPO_PUBLICO || '',
    STATUS_PUBLICO: record.STATUS_PUBLICO || '',
    VISIBILIDADE_PORTAL: record.VISIBILIDADE_PORTAL || '',
    QTD_APRESENTACOES: record.QTD_APRESENTACOES || '',
    POSSUI_APRESENTACOES: record.POSSUI_APRESENTACOES || '',
    TOTAL_PRESENCAS: record.TOTAL_PRESENCAS || '',
    TOTAL_FALTAS: record.TOTAL_FALTAS || ''
  };
}

function atividadesV2_upsertPortalRows_(sheet, headers, records) {
  var writableHeaders = atividadesV2_getPortalWritableHeaders_(sheet, headers);
  var existing = atividadesV2_readSheetObjects_(sheet);
  var existingByKey = {};
  existing.forEach(function(record) {
    var key = atividadesV2_buildPortalViewUpsertKey_(record, writableHeaders);
    if (key && !existingByKey[key]) existingByKey[key] = record;
  });

  var updated = 0;
  var appended = 0;
  var appendValues = [];
  (records || []).forEach(function(record) {
    var key = atividadesV2_buildPortalViewUpsertKey_(record, writableHeaders);
    var current = key ? existingByKey[key] : null;
    if (current && current._rowNumber) {
      var merged = Object.assign({}, current, record);
      sheet.getRange(current._rowNumber, 1, 1, writableHeaders.length).setValues([
        atividadesV2_recordToHeaderRow_(merged, writableHeaders)
      ]);
      updated++;
      return;
    }
    appendValues.push(atividadesV2_recordToHeaderRow_(record, writableHeaders));
    appended++;
  });

  if (appendValues.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, appendValues.length, writableHeaders.length).setValues(appendValues);
  }
  atividadesV2_applyPortalViewColumnFormats_(sheet);

  return {
    mode: 'UPSERT',
    updated: updated,
    appended: appended,
    written: updated + appended,
    preservedExistingRows: Math.max(existing.length - updated, 0)
  };
}

function atividadesV2_diagnosticarDesalinhamentoViewsPortalDev_() {
  return atividadesV2_repararDesalinhamentoViewsPortalDev_({ dryRun: true, diagnosticoOnly: true });
}

function atividadesV2_repararDesalinhamentoViewsPortalDevDryRun_() {
  return atividadesV2_repararDesalinhamentoViewsPortalDev_({ dryRun: true });
}

function atividadesV2_repararDesalinhamentoViewsPortalDev_(options) {
  var opts = options || {};
  var dryRun = opts.dryRun !== false;
  var lock = null;

  if (!dryRun) {
    lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) {
      return {
        ok: false,
        dryRun: false,
        modo: 'DEV',
        errorCode: 'LOCK_INDISPONIVEL',
        message: 'Nao foi possivel obter lock para reparar views PORTAL_* v2 DEV.'
      };
    }
  }

  try {
    return atividadesV2_repararDesalinhamentoViewsPortalDevSemLock_(opts, dryRun);
  } finally {
    if (lock) lock.releaseLock();
  }
}

function atividadesV2_repararDesalinhamentoViewsPortalDevSemLock_(opts, dryRun) {
  var ss = atividadesV2_getDatabaseSpreadsheetDev_();
  var result = {
    ok: true,
    dryRun: dryRun,
    modo: 'DEV',
    diagnosticoOnly: opts.diagnosticoOnly === true,
    sheets: {},
    totalSheetsAnalisadas: 0,
    totalSheetsComDesalinhamento: 0,
    totalLinhasReparaveis: 0,
    totalLinhasReparadas: 0,
    avisos: [],
    erros: []
  };

  atividadesV2_getRepairablePortalViewNames_().forEach(function(sheetName) {
    var schema = ATIVIDADES_V2_SCHEMA_BY_SHEET[sheetName] || [];
    var sheet = ss.getSheetByName(sheetName);
    result.totalSheetsAnalisadas++;

    if (!sheet) {
      result.sheets[sheetName] = { exists: false, needsRepair: false };
      result.avisos.push('Aba ausente ignorada no reparo: ' + sheetName);
      return;
    }

    atividadesV2_applyHeadersIfMissing_(sheet, schema);
    var headers = atividadesV2_getSheetHeaders_(sheet).filter(function(header) { return !!header; });
    var lastRow = sheet.getLastRow();
    var values = lastRow > 1
      ? sheet.getRange(2, 1, lastRow - 1, headers.length).getValues()
      : [];
    var analysis = atividadesV2_analisarDesalinhamentoPortalView_(sheetName, schema, headers, values);
    result.sheets[sheetName] = analysis;

    if (!analysis.needsRepair) return;
    result.totalSheetsComDesalinhamento++;
    result.totalLinhasReparaveis += analysis.linhasReparaveis;

    if (dryRun || opts.diagnosticoOnly === true) return;

    var repairedValues = values.map(function(row) {
      return atividadesV2_repairPortalRowByCanonicalOrder_(row, schema, headers);
    });
    if (repairedValues.length) {
      sheet.getRange(2, 1, repairedValues.length, headers.length).setValues(repairedValues);
      result.totalLinhasReparadas += repairedValues.length;
      analysis.linhasReparadas = repairedValues.length;
    }
  });

  result.ok = result.erros.length === 0;

  if (!dryRun && !opts.diagnosticoOnly) {
    atividadesV2_appendV2Log_(ss, {
      FLUXO: 'ATUALIZACAO_PORTAL_V2',
      ACAO: 'Reparar desalinhamento de views PORTAL_* por cabecalho',
      NIVEL: result.totalSheetsComDesalinhamento ? 'WARN' : 'INFO',
      STATUS: result.ok ? 'OK' : 'ERRO',
      MENSAGEM: 'Reparo de views v2 DEV concluido.',
      DETALHES_JSON: atividadesV2_safeLogData_({
        sheetsComDesalinhamento: result.totalSheetsComDesalinhamento,
        linhasReparadas: result.totalLinhasReparadas,
        erros: result.erros.length
      })
    });
    if (typeof atividadesV2_limparCachePortalDev_ === 'function') atividadesV2_limparCachePortalDev_();
  }

  return result;
}

function atividadesV2_getRepairablePortalViewNames_() {
  return [
    ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_CALENDARIO,
    ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_DETALHES,
    ATIVIDADES_V2_SHEETS.PORTAL_FREQUENCIA_MEMBROS,
    ATIVIDADES_V2_SHEETS.PORTAL_JUSTIFICATIVAS,
    ATIVIDADES_V2_SHEETS.PORTAL_PENDENCIAS_DIRETORIA,
    ATIVIDADES_V2_SHEETS.PORTAL_STATUS_ATIVIDADES
  ];
}

function atividadesV2_analisarDesalinhamentoPortalView_(sheetName, schema, headers, values) {
  var orderMismatch = atividadesV2_headersNeedCanonicalRepair_(schema, headers);
  var sampleRows = (values || []).filter(function(row) {
    return row.some(function(value) { return String(value || '').trim() !== ''; });
  }).slice(0, 10);
  var actualScore = 0;
  var canonicalScore = 0;

  sampleRows.forEach(function(row) {
    actualScore += atividadesV2_scorePortalRowCoherence_(atividadesV2_rowToObjectByHeaders_(row, headers));
    canonicalScore += atividadesV2_scorePortalRowCoherence_(atividadesV2_rowToObjectByCanonical_(row, schema));
  });

  var needsRepair = orderMismatch && sampleRows.length > 0 && canonicalScore >= actualScore + 3;
  return {
    exists: true,
    sheetName: sheetName,
    totalRows: values.length,
    orderMismatch: orderMismatch,
    actualScore: actualScore,
    canonicalScore: canonicalScore,
    needsRepair: needsRepair,
    linhasReparaveis: needsRepair ? values.length : 0,
    linhasReparadas: 0,
    preview: sampleRows.length ? atividadesV2_buildRepairPreview_(sampleRows[0], schema, headers) : null
  };
}

function atividadesV2_headersNeedCanonicalRepair_(schema, headers) {
  if (!schema.length || !headers.length) return false;
  for (var i = 0; i < Math.min(schema.length, headers.length); i++) {
    if (schema[i] !== headers[i]) return true;
  }
  return false;
}

function atividadesV2_rowToObjectByHeaders_(row, headers) {
  var obj = {};
  (headers || []).forEach(function(header, index) {
    if (header && !Object.prototype.hasOwnProperty.call(obj, header)) obj[header] = row[index];
  });
  return obj;
}

function atividadesV2_rowToObjectByCanonical_(row, schema) {
  var obj = {};
  (schema || []).forEach(function(header, index) {
    if (header && index < row.length && !Object.prototype.hasOwnProperty.call(obj, header)) obj[header] = row[index];
  });
  return obj;
}

function atividadesV2_repairPortalRowByCanonicalOrder_(row, schema, headers) {
  var canonical = atividadesV2_rowToObjectByCanonical_(row, schema);
  return (headers || []).map(function(header) {
    if (schema.indexOf(header) >= 0) {
      return Object.prototype.hasOwnProperty.call(canonical, header) ? canonical[header] : '';
    }
    return '';
  });
}

function atividadesV2_scorePortalRowCoherence_(record) {
  var score = 0;
  score += atividadesV2_scorePatternField_(record.ID_ATIVIDADE, /^ATV-\d{4}-[12]-\d{4}$/i, 5);
  score += atividadesV2_scorePessoaField_(record.ID_PESSOA);
  score += atividadesV2_scorePessoaField_(record.ID_PESSOA_PRINCIPAL);
  score += atividadesV2_scoreRgaField_(record.RGA);
  score += atividadesV2_scoreEnumField_(record.STATUS_PUBLICO, ['PUBLICADA', 'AGENDADA', 'OCULTA', 'CANCELADA', 'RASCUNHO', 'REALIZADA', 'PLANEJADA'], 2);
  score += atividadesV2_scoreEnumField_(record.STATUS_PUBLICACAO_PORTAL, ['PUBLICADA', 'AGENDADA', 'OCULTA', 'CANCELADA', 'RASCUNHO'], 2);
  score += atividadesV2_scoreEnumField_(record.VISIBILIDADE_PORTAL, ['PUBLICA', 'MEMBROS', 'DIRETORIA', 'OCULTA'], 2);
  score += atividadesV2_scoreEnumField_(record.CONTA_PRESENCA, ['SIM', 'NAO'], 1);
  score += atividadesV2_scoreEnumField_(record.CONTA_FALTA, ['SIM', 'NAO'], 1);
  score += atividadesV2_scoreEnumField_(record.GERA_CERTIFICADO, ['SIM', 'NAO'], 1);
  score += atividadesV2_scoreNumericField_(record.QTD_APRESENTACOES, 2);
  score += atividadesV2_scoreJsonArrayField_(record.APRESENTACOES_PUBLICAS_JSON, 2);
  return score;
}

function atividadesV2_scorePatternField_(value, pattern, points) {
  var text = String(value || '').trim();
  if (!text) return 0;
  return pattern.test(text) ? points : -points;
}

function atividadesV2_scorePessoaField_(value) {
  var text = String(value || '').trim();
  if (!text) return 0;
  if (/^PES-\d{6}$/i.test(text)) return 3;
  if (/^\d{8,15}$/.test(text)) return -2;
  return 0;
}

function atividadesV2_scoreRgaField_(value) {
  var text = String(value || '').trim();
  if (!text) return 0;
  if (/^PES-\d{6}$/i.test(text)) return -3;
  if (/^\d{8,15}$/.test(text)) return 2;
  return 0;
}

function atividadesV2_scoreEnumField_(value, allowed, points) {
  var text = atividades_normalizeTextUpper_(value);
  if (!text) return 0;
  return allowed.indexOf(text) >= 0 ? points : -points;
}

function atividadesV2_scoreNumericField_(value, points) {
  var text = String(value || '').trim();
  if (!text) return 0;
  return isNaN(Number(text)) ? -points : points;
}

function atividadesV2_scoreJsonArrayField_(value, points) {
  var text = String(value || '').trim();
  if (!text) return 0;
  if (text.charAt(0) !== '[') return -points;
  try {
    var parsed = JSON.parse(text);
    return Array.isArray(parsed) ? points : -points;
  } catch (e) {
    return -points;
  }
}

function atividadesV2_buildRepairPreview_(row, schema, headers) {
  var actual = atividadesV2_rowToObjectByHeaders_(row, headers);
  var canonical = atividadesV2_rowToObjectByCanonical_(row, schema);
  return {
    atual: atividadesV2_publicRepairPreviewRecord_(actual),
    reparado: atividadesV2_publicRepairPreviewRecord_(canonical)
  };
}

function atividadesV2_publicRepairPreviewRecord_(record) {
  var semestreFields = atividadesV2_getSemestrePortalFields_(record);
  return {
    ID_ATIVIDADE: record.ID_ATIVIDADE || '',
    STATUS_PUBLICO: record.STATUS_PUBLICO || '',
    VISIBILIDADE_PORTAL: record.VISIBILIDADE_PORTAL || '',
    ID_PESSOA: record.ID_PESSOA || record.ID_PESSOA_PRINCIPAL || '',
    ROTULO_SEMESTRE: semestreFields.ROTULO_SEMESTRE,
    QTD_APRESENTACOES: record.QTD_APRESENTACOES || ''
  };
}

function atividadesV2_buildPortalViewUpsertKey_(record, headers) {
  var preferred = [
    ['ID_PENDENCIA'],
    ['ID_JUSTIFICATIVA'],
    ['ID_STATUS'],
    ['ID_PESSOA', 'CICLO'],
    ['RGA', 'CICLO'],
    ['ID_ATIVIDADE']
  ];

  for (var i = 0; i < preferred.length; i++) {
    var parts = preferred[i];
    var hasHeaders = parts.every(function(header) { return headers.indexOf(header) >= 0; });
    if (!hasHeaders) continue;
    var values = parts.map(function(header) { return String(record[header] || '').trim(); });
    if (values.some(function(value) { return !!value; })) return parts.join('+') + ':' + values.join('|');
  }

  return '';
}

function atividadesV2_readPortalViewsSourceData_(ss) {
  return {
    atividades: atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ATIVIDADES)),
    apresentacoes: atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.APRESENTACOES)),
    arquivos: typeof atividadesV2_readArquivosAtividadeOptional_ === 'function' ? atividadesV2_readArquivosAtividadeOptional_(ss) : [],
    configs: atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.CONFIG)),
    envolvidos: atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.ENVOLVIDOS)),
    presencas: atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.PRESENCAS_REGISTROS)),
    justificativas: atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.JUSTIFICATIVAS)),
    portalDetalhes: ss.getSheetByName(ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_DETALHES)
      ? atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.PORTAL_ATIVIDADES_DETALHES))
      : [],
    portalPendencias: ss.getSheetByName(ATIVIDADES_V2_SHEETS.PORTAL_PENDENCIAS_DIRETORIA)
      ? atividadesV2_readSheetObjects_(atividadesV2_getTargetSheet_(ss, ATIVIDADES_V2_SHEETS.PORTAL_PENDENCIAS_DIRETORIA))
      : []
  };
}

function atividadesV2_isPublicadaPortal_(record) {
  return atividades_normalizeTextUpper_(record.STATUS_PUBLICACAO_PORTAL) === 'PUBLICADA' &&
    atividades_normalizeTextUpper_(record.VISIBILIDADE_PORTAL) !== 'OCULTA' &&
    atividades_normalizeTextUpper_(record.ATIVO || 'SIM') !== 'NAO';
}

function atividadesV2_isAtividadeAcademicaOuFormativa_(record) {
  var subtipo = atividades_normalizeTextUpper_(record && record.SUBTIPO_ATIVIDADE);
  var tipo = atividades_normalizeTextUpper_(record && record.TIPO_ATIVIDADE);
  return [
    'APRESENTACAO_MEMBRO',
    'APRESENTACAO_REPOSICAO',
    'PALESTRA',
    'CURSO',
    'DEBATE',
    'VISITA_TECNICA',
    'OFICINA',
    'SEMINARIO'
  ].indexOf(subtipo) >= 0 || ['ACADEMICA', 'FORMATIVA', 'TECNICA'].indexOf(tipo) >= 0;
}

function atividadesV2_indexByField_(records, field) {
  var out = {};
  (records || []).forEach(function(record) {
    var key = String(record[field] || '').trim();
    if (key && !out[key]) out[key] = record;
  });
  return out;
}

function atividadesV2_addConsistencyIssue_(issues, severity, code, message, record) {
  issues.push({
    severity: severity,
    code: code,
    message: message,
    sheetName: record && record._sheetName || '',
    rowNumber: record && record._rowNumber || '',
    entityId: record && (record.ID_ATIVIDADE || record.ID_APRESENTACAO || record.ID_REGISTRO_PRESENCA || record.ID_JUSTIFICATIVA) || '',
    details: {
      ID_ATIVIDADE: record && record.ID_ATIVIDADE || '',
      ID_PESSOA: record && record.ID_PESSOA || '',
      RGA: record && record.RGA || ''
    }
  });
}

function atividadesV2_newFrequencyBucket_(record, ciclo) {
  return {
    ID_PESSOA: record.ID_PESSOA || '',
    RGA: record.RGA || '',
    NOME_MEMBRO: record.NOME_PARTICIPANTE || '',
    EMAIL: record.EMAIL_PARTICIPANTE || '',
    CICLO: ciclo || record.CICLO || '',
    presencas: 0,
    faltas: 0,
    justificadas: 0,
    abonadas: 0,
    carga: 0
  };
}

function atividadesV2_accumulateFrequencyBucket_(bucket, record) {
  var status = atividades_normalizeTextUpper_(record.STATUS_PRESENCA);
  if (status === 'PRESENTE_PRESENCIAL' || status === 'PRESENTE_REMOTO') bucket.presencas++;
  if (status === 'FALTA') bucket.faltas++;
  if (status === 'JUSTIFICADA') bucket.justificadas++;
  if (status === 'ABONADA') bucket.abonadas++;
  var carga = Number(String(record.CARGA_HORARIA_CONSIDERADA || '').replace(',', '.'));
  if (!isNaN(carga)) bucket.carga += carga;
}

function atividadesV2_buildFrequencyPortalRow_(bucket, now) {
  var total = bucket.presencas + bucket.faltas + bucket.justificadas + bucket.abonadas;
  var faltasLiquidas = Math.max(bucket.faltas - bucket.justificadas - bucket.abonadas, 0);
  var percentual = total ? Math.round((bucket.presencas / total) * 10000) / 100 : '';
  return {
    ID_PESSOA: bucket.ID_PESSOA,
    RGA: bucket.RGA,
    NOME_MEMBRO: atividades_sanitizePortalText_(bucket.NOME_MEMBRO, 180),
    EMAIL: bucket.EMAIL,
    CICLO: bucket.CICLO,
    TOTAL_PRESENCAS: bucket.presencas,
    TOTAL_FALTAS: bucket.faltas,
    TOTAL_JUSTIFICADAS: bucket.justificadas,
    TOTAL_ABONADAS: bucket.abonadas,
    FALTAS_LIQUIDAS: faltasLiquidas,
    LIMITE_FALTAS_PERIODO: '',
    PERCENTUAL_FREQUENCIA: percentual,
    PERCENTUAL_USO_LIMITE: '',
    SITUACAO_DISCIPLINAR: faltasLiquidas > 0 ? 'COM_FALTAS' : 'REGULAR',
    CARGA_HORARIA_TOTAL: bucket.carga,
    ELEGIVEL_CERTIFICADO: faltasLiquidas === 0 ? 'SIM' : 'NAO',
    MOTIVO_INELEGIBILIDADE: faltasLiquidas === 0 ? '' : 'Faltas liquidas registradas.',
    MENSAGEM_PORTAL: '',
    ULTIMA_ATUALIZACAO: now
  };
}

function atividadesV2_buildPendenciasDiretoriaRows_(data, now) {
  var rows = [];
  var atividadesById = atividadesV2_indexByField_(data.atividades, 'ID_ATIVIDADE');
  var arquivosIndex = typeof atividadesV2_indexLatestArquivos_ === 'function'
    ? atividadesV2_indexLatestArquivos_(data.arquivos || [])
    : {};
  data.atividades.forEach(function(record) {
    if (atividades_normalizeTextUpper_(record.ATIVO || 'SIM') === 'NAO') return;
    atividadesV2_addDeadlinePendencia_(rows, record, 'ATA', record.DATA_LIMITE_ATA, record.LINK_ATA, now);
    atividadesV2_addDeadlinePendencia_(rows, record, 'MATERIAL', record.DATA_LIMITE_MATERIAL, record.LINK_MATERIAL, now);
    atividadesV2_addDeadlinePendencia_(rows, record, 'JUSTIFICATIVA', record.DATA_LIMITE_JUSTIFICATIVA, '', now);
  });
  data.apresentacoes.forEach(function(record) {
    var atividade = atividadesById[String(record.ID_ATIVIDADE || '').trim()] || {};
    if (!String(record.ID_ATIVIDADE || '').trim()) {
      rows.push(atividadesV2_buildPendenciaRow_('APRESENTACAO_SEM_ATIVIDADE', 'ALTA', record, '', 'Vincular apresentacao a uma atividade v2.', now));
      return;
    }
    if (!String(atividade.ID_PESSOA_PRINCIPAL || atividade.RGA_PESSOA_PRINCIPAL || atividade.NOME_PESSOA_PRINCIPAL_PUBLICO || record.ID_PESSOA || record.RGA || record.NOME_MEMBRO || '').trim()) {
      rows.push(atividadesV2_buildPendenciaRow_('APRESENTACAO_SEM_APRESENTADOR', 'ALTA', Object.assign({}, atividade, record, {
        TITULO_ATIVIDADE: atividade.TITULO_PUBLICO || atividade.TITULO || 'Titulo ainda nao informado',
        ROTULO_SEMESTRE: atividadesV2_getSemestrePortalFields_(atividade).ROTULO_SEMESTRE
      }), '', 'Informar apresentador da apresentacao.', now));
      return;
    }
    var photo = typeof atividadesV2_getLatestArquivoFromIndex_ === 'function'
      ? atividadesV2_getLatestArquivoFromIndex_(arquivosIndex, atividade.ID_ATIVIDADE, record.ID_APRESENTACAO, ATIVIDADES_V2_TIPO_ARQUIVO_FOTO_)
      : null;
    var config = typeof atividadesV2_findConfigForActivityFromRows_ === 'function'
      ? atividadesV2_findConfigForActivityFromRows_(data.configs || [], atividade)
      : {};
    atividadesV2_addPresentationWorkflowPendencias_(rows, atividade, record, now, photo, config);
  });
  atividadesV2_addJustificativasWorkflowPendencias_(rows, data.justificativas, now);
  return rows.filter(function(row) { return !!row.ID_PENDENCIA; });
}

function atividadesV2_addJustificativasWorkflowPendencias_(rows, justificativas, now) {
  (justificativas || []).forEach(function(record) {
    if (atividades_normalizeTextUpper_(record.ATIVO || 'SIM') === 'NAO') return;
    var status = atividades_normalizeTextUpper_(record.STATUS_ANALISE || 'ENVIADA');
    if (status === 'PREVIA') return;
    if (['ENVIADA', 'PENDENTE', 'EM_ANALISE', 'AJUSTE_SOLICITADO'].indexOf(status) === -1) return;
    var prazo = typeof atividadesV2_classificarPrazoJustificativaRecord_ === 'function'
      ? atividadesV2_classificarPrazoJustificativaRecord_(record, now)
      : { envioForaDoPrazo: 'NAO', statusPrazo: '' };
    if (status === 'AJUSTE_SOLICITADO') {
      rows.push(atividadesV2_buildPendenciaJustificativaRow_('JUSTIFICATIVA_AJUSTE_SOLICITADO', 'BAIXA', record, prazo, 'Acompanhar ajuste solicitado ao membro.', now));
      return;
    }
    rows.push(atividadesV2_buildPendenciaJustificativaRow_('JUSTIFICATIVA_AGUARDANDO_ANALISE', prazo.envioForaDoPrazo === 'SIM' ? 'ALTA' : 'MEDIA', record, prazo, 'Analisar justificativa enviada pelo membro.', now));
    if (prazo.envioForaDoPrazo === 'SIM') {
      rows.push(atividadesV2_buildPendenciaJustificativaRow_('JUSTIFICATIVA_FORA_DO_PRAZO', 'ALTA', record, prazo, 'Avaliar envio fora do prazo antes da decisao.', now));
    }
    if (atividades_normalizeTextUpper_(record.POSSUI_DOCUMENTO_COMPROBATORIO) === 'SIM' &&
        !String(record.LINK_DOCUMENTO_COMPROBATORIO || '').trim()) {
      rows.push(atividadesV2_buildPendenciaJustificativaRow_('JUSTIFICATIVA_COMPROVANTE_AUSENTE', 'MEDIA', record, prazo, 'Solicitar comprovante informado como obrigatorio.', now));
    }
  });
}

function atividadesV2_buildPendenciaJustificativaRow_(tipo, gravidade, record, prazo, acao, now) {
  var row = atividadesV2_buildPendenciaRow_(tipo, gravidade, {
    ID_ATIVIDADE: record.ID_ATIVIDADE,
    ID_JUSTIFICATIVA: record.ID_JUSTIFICATIVA,
    ID_REGISTRO_PRESENCA: record.ID_REGISTRO_PRESENCA,
    TITULO_ATIVIDADE: record.TITULO_ATIVIDADE,
    NOME_MEMBRO: record.NOME_MEMBRO,
    DATA_ATIVIDADE: record.DATA_ATIVIDADE,
    STATUS_ANALISE_JUSTIFICATIVA: record.STATUS_ANALISE
  }, record.DATA_LIMITE_JUSTIFICATIVA, acao, now);
  row.ID_PENDENCIA = atividadesV2_buildDeterministicId_('PEND', [tipo, record.ID_JUSTIFICATIVA || record.ID_REGISTRO_PRESENCA]);
  row.ID_JUSTIFICATIVA = String(record.ID_JUSTIFICATIVA || '').trim();
  row.ID_REGISTRO_PRESENCA = String(record.ID_REGISTRO_PRESENCA || '').trim();
  row.NOME_MEMBRO = atividades_sanitizePortalText_(record.NOME_MEMBRO, 180);
  row.STATUS_ANALISE_JUSTIFICATIVA = String(record.STATUS_ANALISE || '').trim();
  row.STATUS_PRAZO_JUSTIFICATIVA = prazo.statusPrazo || '';
  row.RESPONSAVEL_SUGERIDO = 'DIRETORIA/SECRETARIA';
  row.DESCRICAO_PENDENCIA = atividades_sanitizePortalText_(acao + (prazo.envioForaDoPrazo === 'SIM' ? ' Enviada fora do prazo.' : ''), 500);
  row.ACAO_RECOMENDADA = acao;
  return row;
}

function atividadesV2_addPresentationWorkflowPendencias_(rows, atividade, apresentacao, now, fotoReuniao, config) {
  if (!atividade || !String(atividade.ID_ATIVIDADE || '').trim()) return;
  if (atividades_normalizeTextUpper_(apresentacao.ATIVO || 'SIM') === 'NAO') return;
  if (['CANCELADA', 'CANCELADO', 'ARQUIVADA', 'ARQUIVADO'].indexOf(atividades_normalizeTextUpper_(atividade.STATUS_OPERACIONAL)) >= 0) return;

  var titleStatus = atividades_normalizeTextUpper_(apresentacao.STATUS_TITULO_EIXO || atividade.STATUS_EIXO_TEMATICO || 'PENDENTE');
  var materialStatus = atividades_normalizeTextUpper_(apresentacao.STATUS_ENVIO_MATERIAL || 'PENDENTE');
  var presentationStatus = atividades_normalizeTextUpper_(apresentacao.STATUS_APRESENTACAO);
  var syncHistorico = atividadesV2_isTruthyFlag_(apresentacao.SYNC_HISTORICO_PUBLICO);
  var hasTitleAxis = !!String(atividade.TITULO_PUBLICO || atividade.TITULO || '').trim() &&
    !!String(atividade.EIXO_TEMATICO_PRINCIPAL || '').trim();
  var hasMaterial = !!String(apresentacao.ID_ARQUIVO_MATERIAL || apresentacao.LINK_MATERIAL_APRESENTACAO || '').trim();
  var materialResolvido = ['HISTORICO', 'APROVADO', 'DISPENSADO'].indexOf(materialStatus) >= 0 ||
    (materialStatus === 'RECEBIDO' && (hasMaterial || syncHistorico || presentationStatus === 'REALIZADA'));
  var requiresExplicitMaterialApproval = atividadesV2_requiresExplicitMaterialApproval_(atividade, apresentacao);

  if (!hasTitleAxis || titleStatus === 'PENDENTE') {
    rows.push(atividadesV2_buildPendenciaApresentacaoRow_('TITULO_EIXO_PENDENTE', 'MEDIA', atividade, apresentacao, '', 'Aguardar ou solicitar titulo/eixo da apresentacao.', now));
  } else if (['ENVIADO', 'EM_ANALISE'].indexOf(titleStatus) >= 0) {
    rows.push(atividadesV2_buildPendenciaApresentacaoRow_('TITULO_EIXO_AGUARDANDO_ANALISE', 'MEDIA', atividade, apresentacao, '', 'Revisar titulo/eixo informado pelo apresentador.', now));
  } else if (['AJUSTE_SOLICITADO', 'REPROVADO'].indexOf(titleStatus) >= 0) {
    rows.push(atividadesV2_buildPendenciaApresentacaoRow_('TITULO_EIXO_AJUSTE_SOLICITADO', 'BAIXA', atividade, apresentacao, '', 'Acompanhar ajuste de titulo/eixo solicitado ao apresentador.', now));
  }

  if (!materialResolvido) {
    if (!hasMaterial || materialStatus === 'PENDENTE') {
      rows.push(atividadesV2_buildPendenciaApresentacaoRow_('MATERIAL_PENDENTE', 'MEDIA', atividade, apresentacao, '', 'Aguardar ou solicitar envio do slide/material da apresentacao.', now, fotoReuniao));
    } else if (['REENVIADO', 'EM_ANALISE'].indexOf(materialStatus) >= 0 || (materialStatus === 'RECEBIDO' && requiresExplicitMaterialApproval)) {
      rows.push(atividadesV2_buildPendenciaApresentacaoRow_('MATERIAL_AGUARDANDO_ANALISE', 'MEDIA', atividade, apresentacao, '', 'Revisar slide/material enviado pelo apresentador.', now, fotoReuniao));
    } else if (materialStatus === 'AJUSTE_SOLICITADO') {
      rows.push(atividadesV2_buildPendenciaApresentacaoRow_('MATERIAL_AJUSTE_SOLICITADO', 'BAIXA', atividade, apresentacao, '', 'Acompanhar reenvio do slide/material ajustado.', now, fotoReuniao));
    }
  }

  var photoRules = typeof atividadesV2_resolveFotoReuniaoRules_ === 'function'
    ? atividadesV2_resolveFotoReuniaoRules_(atividade, config || {})
    : { exigeFoto: false, geraPendencia: false };
  if (!photoRules.exigeFoto || !photoRules.geraPendencia) return;
  var photoStatus = atividades_normalizeTextUpper_(fotoReuniao && fotoReuniao.STATUS_ARQUIVO || 'PENDENTE');
  if (['RECEBIDO', 'APROVADO', 'HISTORICO', 'DISPENSADO'].indexOf(photoStatus) >= 0) return;
  if (photoStatus === 'AJUSTE_SOLICITADO') {
    rows.push(atividadesV2_buildPendenciaApresentacaoRow_('FOTO_REUNIAO_AJUSTE_SOLICITADO', 'BAIXA', atividade, apresentacao, '', 'Acompanhar reenvio da foto da reuniao.', now, fotoReuniao));
  } else if (['REENVIADO', 'EM_ANALISE'].indexOf(photoStatus) >= 0) {
    rows.push(atividadesV2_buildPendenciaApresentacaoRow_('FOTO_REUNIAO_AGUARDANDO_ANALISE', 'MEDIA', atividade, apresentacao, '', 'Revisar foto da reuniao enviada.', now, fotoReuniao));
  } else {
    rows.push(atividadesV2_buildPendenciaApresentacaoRow_('FOTO_REUNIAO_PENDENTE', 'MEDIA', atividade, apresentacao, '', 'Aguardar ou registrar foto da reuniao.', now, fotoReuniao));
  }
}

function atividadesV2_requiresExplicitMaterialApproval_(atividade, apresentacao) {
  return atividadesV2_isTruthyFlag_(
    apresentacao.EXIGE_APROVACAO_MATERIAL ||
    apresentacao.APROVACAO_MATERIAL_OBRIGATORIA ||
    atividade.EXIGE_APROVACAO_MATERIAL ||
    atividade.APROVACAO_MATERIAL_OBRIGATORIA
  );
}

function atividadesV2_buildPendenciaApresentacaoRow_(tipo, gravidade, atividade, apresentacao, prazo, acao, now, fotoReuniao) {
  var semestreFields = atividadesV2_getSemestrePortalFields_(atividade);
  var row = atividadesV2_buildPendenciaRow_(tipo, gravidade, Object.assign({}, atividade, {
    ID_APRESENTACAO: apresentacao.ID_APRESENTACAO,
    ROTULO_SEMESTRE: semestreFields.ROTULO_SEMESTRE,
    TITULO_APRESENTACAO: atividade.TITULO_PUBLICO || atividade.TITULO || 'Titulo ainda nao informado',
    NOME_APRESENTADOR: atividade.NOME_PESSOA_PRINCIPAL_PUBLICO || apresentacao.NOME_MEMBRO || 'Apresentador ainda nao definido',
    STATUS_TITULO_EIXO: apresentacao.STATUS_TITULO_EIXO,
    STATUS_ENVIO_MATERIAL: apresentacao.STATUS_ENVIO_MATERIAL,
    STATUS_APRESENTACAO: apresentacao.STATUS_APRESENTACAO,
    NOME_ARQUIVO_MATERIAL: apresentacao.NOME_ARQUIVO_MATERIAL,
    LINK_MATERIAL_APRESENTACAO: apresentacao.LINK_MATERIAL_APRESENTACAO,
    STATUS_FOTO_REUNIAO: fotoReuniao && fotoReuniao.STATUS_ARQUIVO || '',
    ID_ARQUIVO_FOTO_REUNIAO: fotoReuniao && fotoReuniao.ID_ARQUIVO_ATIVIDADE || '',
    NOME_ARQUIVO_FOTO_REUNIAO: fotoReuniao && fotoReuniao.NOME_ARQUIVO || '',
    LINK_FOTO_REUNIAO: fotoReuniao && fotoReuniao.LINK_ARQUIVO || ''
  }), prazo, acao, now);
  row.ID_PENDENCIA = atividadesV2_buildDeterministicId_('PEND', [tipo, atividade.ID_ATIVIDADE, apresentacao.ID_APRESENTACAO]);
  row.ID_APRESENTACAO = String(apresentacao.ID_APRESENTACAO || '').trim();
  row.STATUS_FOTO_REUNIAO = String(fotoReuniao && fotoReuniao.STATUS_ARQUIVO || '').trim();
  row.ID_ARQUIVO_FOTO_REUNIAO = String(fotoReuniao && fotoReuniao.ID_ARQUIVO_ATIVIDADE || '').trim();
  row.NOME_ARQUIVO_FOTO_REUNIAO = String(fotoReuniao && fotoReuniao.NOME_ARQUIVO || '').trim();
  row.LINK_FOTO_REUNIAO = String(fotoReuniao && fotoReuniao.LINK_ARQUIVO || '').trim();
  row.RESPONSAVEL_SUGERIDO = atividades_sanitizePortalText_(atividade.NOME_PESSOA_PRINCIPAL_PUBLICO || apresentacao.NOME_MEMBRO || atividade.RESPONSAVEL_INTERNO, 180);
  row.DESCRICAO_PENDENCIA = atividades_sanitizePortalText_(
    acao + ' Status titulo/eixo: ' + String(apresentacao.STATUS_TITULO_EIXO || atividade.STATUS_EIXO_TEMATICO || 'PENDENTE') +
    '. Status slide/material: ' + String(apresentacao.STATUS_ENVIO_MATERIAL || 'PENDENTE') +
    '. Status foto: ' + String(fotoReuniao && fotoReuniao.STATUS_ARQUIVO || 'PENDENTE') + '.',
    500
  );
  row.ACAO_RECOMENDADA = acao;
  return row;
}

function atividadesV2_addDeadlinePendencia_(rows, record, tipo, prazo, doneValue, now) {
  var date = atividades_parseDateOrNull_(prazo);
  if (!date || doneValue) return;
  if (date.getTime() >= now.getTime()) return;
  rows.push(atividadesV2_buildPendenciaRow_('PENDENCIA_' + tipo, 'MEDIA', record, prazo, 'Regularizar pendencia de ' + tipo.toLowerCase() + '.', now));
}

function atividadesV2_buildPendenciaRow_(tipo, gravidade, record, prazo, acao, now) {
  var idAtividade = String(record.ID_ATIVIDADE || '').trim();
  var prazoDate = atividades_parseDateOrNull_(prazo);
  var dias = prazoDate ? Math.max(Math.floor((now.getTime() - prazoDate.getTime()) / 86400000), 0) : '';
  var semestreFields = atividadesV2_getSemestrePortalFields_(record);
  return {
    ID_PENDENCIA: atividadesV2_buildDeterministicId_('PEND', [tipo, idAtividade || record.ID_APRESENTACAO || record._rowNumber]),
    TIPO_PENDENCIA: tipo,
    GRAVIDADE: gravidade,
    ID_ATIVIDADE: idAtividade,
    ID_APRESENTACAO: String(record.ID_APRESENTACAO || '').trim(),
    ROTULO_SEMESTRE: semestreFields.ROTULO_SEMESTRE,
    TITULO_ATIVIDADE: atividades_sanitizePortalText_(record.TITULO || record.TITULO_ATIVIDADE || record.TITULO_APRESENTACAO || 'Titulo ainda nao informado', 240),
    TITULO_APRESENTACAO: atividades_sanitizePortalText_(record.TITULO_APRESENTACAO || record.TITULO || record.TITULO_PUBLICO || 'Titulo ainda nao informado', 240),
    NOME_APRESENTADOR: atividades_sanitizePortalText_(record.NOME_APRESENTADOR || record.NOME_PESSOA_PRINCIPAL_PUBLICO || record.NOME_MEMBRO || 'Apresentador ainda nao definido', 180),
    DATA_ATIVIDADE: record.DATA_ATIVIDADE || '',
    EIXO_TEMATICO_PRINCIPAL: String(record.EIXO_TEMATICO_PRINCIPAL || '').trim(),
    EIXO_TEMATICO_SECUNDARIO: String(record.EIXO_TEMATICO_SECUNDARIO || '').trim(),
    STATUS_APRESENTACAO: String(record.STATUS_APRESENTACAO || '').trim(),
    STATUS_TITULO_EIXO: String(record.STATUS_TITULO_EIXO || record.STATUS_EIXO_TEMATICO || '').trim(),
    STATUS_ENVIO_MATERIAL: String(record.STATUS_ENVIO_MATERIAL || '').trim(),
    NOME_ARQUIVO_MATERIAL: String(record.NOME_ARQUIVO_MATERIAL || '').trim(),
    LINK_MATERIAL_APRESENTACAO: String(record.LINK_MATERIAL_APRESENTACAO || '').trim(),
    PRAZO: prazo || '',
    DIAS_EM_ABERTO: dias,
    RESPONSAVEL_SUGERIDO: record.RESPONSAVEL_INTERNO || '',
    DESCRICAO_PENDENCIA: acao,
    ACAO_RECOMENDADA: acao,
    LINK_ORIGEM: '',
    STATUS_PENDENCIA: 'ABERTA',
    ULTIMA_ATUALIZACAO: now
  };
}

var ATIVIDADES_V2_CHAMADA_MEMBROS_CACHE_ = {};

function atividadesV2_checkPresenceMemberApplicability_(record, dataAtividade) {
  var dateKey = atividadesV2_formatDateKey_(dataAtividade);
  if (!dateKey) return null;
  var members = atividadesV2_getMembrosAplicaveisParaData_(dateKey);
  if (!members) return null;

  var idPessoa = String(record.ID_PESSOA || '').trim();
  var rga = atividadesV2_sanitizeIdToken_(record.RGA || record.ID_REFERENCIA || '');
  for (var i = 0; i < members.length; i++) {
    var item = members[i] || {};
    if (idPessoa && String(item.idPessoa || item.ID_PESSOA || '').trim() === idPessoa) return true;
    if (rga && atividadesV2_sanitizeIdToken_(item.rga || item.RGA || '') === rga) return true;
  }
  return false;
}

function atividadesV2_getMembrosAplicaveisParaData_(dateKey) {
  if (Object.prototype.hasOwnProperty.call(ATIVIDADES_V2_CHAMADA_MEMBROS_CACHE_, dateKey)) {
    return ATIVIDADES_V2_CHAMADA_MEMBROS_CACHE_[dateKey];
  }

  try {
    var result = null;
    if (typeof geapaCoreListarMembrosParaChamada === 'function') {
      result = geapaCoreListarMembrosParaChamada(dateKey, { perfil: 'ADMIN_TECNICO' });
    } else if (typeof GEAPA_CORE !== 'undefined' && GEAPA_CORE && GEAPA_CORE.portal && typeof GEAPA_CORE.portal.listarMembrosParaChamada === 'function') {
      result = GEAPA_CORE.portal.listarMembrosParaChamada(dateKey, { perfil: 'ADMIN_TECNICO' });
    }
    var list = Array.isArray(result) ? result : (result && result.data) || [];
    ATIVIDADES_V2_CHAMADA_MEMBROS_CACHE_[dateKey] = list;
    return list;
  } catch (err) {
    ATIVIDADES_V2_CHAMADA_MEMBROS_CACHE_[dateKey] = null;
    return null;
  }
}

function atividadesV2_formatDateKey_(value) {
  var date = atividades_parseDateOrNull_(value);
  if (!date) return '';
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}
