/**
 * Migracao DEV do Atividades_Config para catalogo de modelos homologados.
 *
 * As rotinas deste arquivo nunca removem, renomeiam ou reordenam colunas.
 * A migracao altera apenas o schema; a normalizacao de dados e explicita e
 * preenche somente celulas vazias, salvo confirmacao expressa de sobrescrita.
 */

var ATIVIDADES_CONFIG_MODELOS_LEGACY_HEADERS_ = Object.freeze([
  'ID_CONFIG',
  'TIPO_ATIVIDADE',
  'SUBTIPO_ATIVIDADE',
  'CLASSIFICACAO_REUNIAO',
  'CLASSIFICACAO_ACESSO_PADRAO',
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
  'CARGA_HORARIA_PADRAO',
  'VISIBILIDADE_PORTAL_PADRAO',
  'STATUS_PUBLICACAO_PORTAL_PADRAO',
  'PERMITE_APRESENTACAO',
  'PERMITE_CONVIDADOS',
  'PERMITE_EXTERNOS',
  'PERMITE_JUSTIFICATIVA',
  'PRAZO_JUSTIFICATIVA_HORAS',
  'EXIGE_EIXO_TEMATICO',
  'PERMITE_EIXO_SECUNDARIO',
  'EXIGE_PESSOA_PRINCIPAL',
  'PAPEL_PADRAO_PESSOA_PRINCIPAL',
  'EXIGE_TITULO_PUBLICO',
  'USA_FLUXO_APRESENTACAO',
  'EXIBE_NO_PORTAL',
  'GERA_CARD_AGENDA',
  'ATIVO',
  'CRIADO_EM',
  'ATUALIZADO_EM',
  'OBSERVACOES'
]);

var ATIVIDADES_CONFIG_MODELOS_NEW_HEADERS_ = Object.freeze([
  'NOME_MODELO_PORTAL',
  'DESCRICAO_MODELO_PORTAL',
  'ORDEM_EXIBICAO',
  'GRUPO_MODELO',
  'PERMITE_CRIACAO_PORTAL',
  'PERFIS_QUE_PODEM_CRIAR',
  'PRAZO_ATA_HORAS',
  'PRAZO_MATERIAL_HORAS',
  'PRAZO_CONFIRMACAO_PRESENCA_HORAS',
  'PRAZO_PUBLICACAO_PORTAL_HORAS',
  'PRAZO_ENVIO_FOTOS_HORAS',
  'GERA_PENDENCIA_TITULO_EIXO',
  'GERA_PENDENCIA_MATERIAL',
  'GERA_PENDENCIA_ATA',
  'GERA_PENDENCIA_FOTOS',
  'GERA_PENDENCIA_LISTA_PRESENCA',
  'GERA_PENDENCIA_CONFIRMACAO_CONVIDADO',
  'CRIAR_PASTA_DRIVE_PADRAO',
  'MODELO_NOME_PASTA_DRIVE',
  'PERMITE_LINK_MATERIAL',
  'PERMITE_UPLOAD_MATERIAL',
  'TIPOS_ARQUIVO_MATERIAL_PERMITIDOS',
  'TAMANHO_MAX_MATERIAL_MB',
  'INSTRUCAO_UPLOAD_MATERIAL',
  'PERMITE_LINK_ATA',
  'PERMITE_LINK_FOTOS',
  'PERMITE_UPLOAD_FOTOS',
  'TIPOS_ARQUIVO_FOTOS_PERMITIDOS',
  'TAMANHO_MAX_FOTOS_MB',
  'PERMITE_PUBLICACAO_PUBLICA',
  'PUBLICA_AUTOMATICAMENTE',
  'DIAS_ANTES_PUBLICAR',
  'EXIBE_NO_CALENDARIO',
  'EXIBE_EM_PROXIMAS_ATIVIDADES',
  'EXIBE_NO_HISTORICO_PUBLICO',
  'EXIBE_MATERIAL_PUBLICO',
  'EXIBE_FOTOS_PUBLICO',
  'EXIGE_REVISAO_ANTES_PUBLICAR',
  'TIPO_PESSOA_PRINCIPAL_PADRAO',
  'PERMITE_PESSOA_EXTERNA_PRINCIPAL',
  'PERMITE_MEMBRO_COMO_PRINCIPAL',
  'PERMITE_PROFESSOR_COMO_PRINCIPAL',
  'EXIGE_EMAIL_PESSOA_PRINCIPAL',
  'EXIGE_INSTITUICAO_PESSOA_PRINCIPAL',
  'MAX_ENVOLVIDOS',
  'PAPEIS_ENVOLVIDOS_PERMITIDOS',
  'EIXO_TEMATICO_PADRAO',
  'PERMITE_EIXO_LIVRE',
  'EXIGE_VALIDACAO_EIXO',
  'FONTE_EIXO_TEMATICO',
  'PERMITE_EXCECAO',
  'CAMPOS_EXCECAO_PERMITIDOS',
  'CAMPOS_EXCECAO_BLOQUEADOS',
  'EXIGE_JUSTIFICATIVA_EXCECAO',
  'APROVACAO_EXCECAO_NIVEL',
  'PERFIS_APROVADORES_EXCECAO',
  'QTD_APROVADORES_EXCECAO',
  'BLOQUEAR_EDICAO_APOS_REALIZACAO',
  'BLOQUEAR_EDICAO_APOS_PUBLICACAO',
  'PERMITE_EDICAO_APOS_PRESENCA',
  'PERMITE_CANCELAMENTO_APOS_PUBLICACAO',
  'PERMITE_CANCELAMENTO_APOS_REALIZACAO',
  'PERFIS_QUE_PODEM_EDITAR',
  'PERFIS_QUE_PODEM_CANCELAR',
  'ENVIAR_CONVOCACAO_PADRAO',
  'ENVIAR_LEMBRETE_PADRAO',
  'HORAS_ANTES_LEMBRETE',
  'ENVIAR_COBRANCA_MATERIAL',
  'HORAS_ANTES_COBRANCA_MATERIAL',
  'ENVIAR_AVISO_PUBLICACAO',
  'CANAIS_COMUNICACAO_PADRAO',
  'ORIGEM_FLUXO_PADRAO',
  'GERA_LOG_DETALHADO',
  'GERA_EVENTO_PORTAL',
  'SINCRONIZA_FIRESTORE',
  'PRIORIDADE_SYNC_FIRESTORE'
]);

var ATIVIDADES_CONFIG_MODELOS_SIM_NAO_HEADERS_ = Object.freeze([
  'PERMITE_CRIACAO_PORTAL',
  'GERA_PENDENCIA_TITULO_EIXO',
  'GERA_PENDENCIA_MATERIAL',
  'GERA_PENDENCIA_ATA',
  'GERA_PENDENCIA_FOTOS',
  'GERA_PENDENCIA_LISTA_PRESENCA',
  'GERA_PENDENCIA_CONFIRMACAO_CONVIDADO',
  'CRIAR_PASTA_DRIVE_PADRAO',
  'PERMITE_LINK_MATERIAL',
  'PERMITE_UPLOAD_MATERIAL',
  'PERMITE_LINK_ATA',
  'PERMITE_LINK_FOTOS',
  'PERMITE_UPLOAD_FOTOS',
  'PERMITE_PUBLICACAO_PUBLICA',
  'PUBLICA_AUTOMATICAMENTE',
  'EXIBE_NO_CALENDARIO',
  'EXIBE_EM_PROXIMAS_ATIVIDADES',
  'EXIBE_NO_HISTORICO_PUBLICO',
  'EXIBE_MATERIAL_PUBLICO',
  'EXIBE_FOTOS_PUBLICO',
  'EXIGE_REVISAO_ANTES_PUBLICAR',
  'PERMITE_PESSOA_EXTERNA_PRINCIPAL',
  'PERMITE_MEMBRO_COMO_PRINCIPAL',
  'PERMITE_PROFESSOR_COMO_PRINCIPAL',
  'EXIGE_EMAIL_PESSOA_PRINCIPAL',
  'EXIGE_INSTITUICAO_PESSOA_PRINCIPAL',
  'PERMITE_EIXO_LIVRE',
  'EXIGE_VALIDACAO_EIXO',
  'PERMITE_EXCECAO',
  'EXIGE_JUSTIFICATIVA_EXCECAO',
  'BLOQUEAR_EDICAO_APOS_REALIZACAO',
  'BLOQUEAR_EDICAO_APOS_PUBLICACAO',
  'PERMITE_EDICAO_APOS_PRESENCA',
  'PERMITE_CANCELAMENTO_APOS_PUBLICACAO',
  'PERMITE_CANCELAMENTO_APOS_REALIZACAO',
  'ENVIAR_CONVOCACAO_PADRAO',
  'ENVIAR_LEMBRETE_PADRAO',
  'ENVIAR_COBRANCA_MATERIAL',
  'ENVIAR_AVISO_PUBLICACAO',
  'GERA_LOG_DETALHADO',
  'GERA_EVENTO_PORTAL',
  'SINCRONIZA_FIRESTORE'
]);

var ATIVIDADES_CONFIG_MODELOS_NUMERIC_HEADERS_ = Object.freeze([
  'ORDEM_EXIBICAO',
  'PRAZO_ATA_HORAS',
  'PRAZO_MATERIAL_HORAS',
  'PRAZO_CONFIRMACAO_PRESENCA_HORAS',
  'PRAZO_PUBLICACAO_PORTAL_HORAS',
  'PRAZO_ENVIO_FOTOS_HORAS',
  'TAMANHO_MAX_MATERIAL_MB',
  'TAMANHO_MAX_FOTOS_MB',
  'DIAS_ANTES_PUBLICAR',
  'MAX_ENVOLVIDOS',
  'QTD_APROVADORES_EXCECAO',
  'HORAS_ANTES_LEMBRETE',
  'HORAS_ANTES_COBRANCA_MATERIAL'
]);

var ATIVIDADES_CONFIG_MODELOS_ENUMS_ = Object.freeze({
  APROVACAO_EXCECAO_NIVEL: Object.freeze([
    'SEM_APROVACAO',
    'PRESIDENTE',
    'DIRETORIA',
    'PRESIDENTE_OU_DIRETORIA',
    'PRESIDENTE_OU_2_DIRETORES'
  ]),
  PRIORIDADE_SYNC_FIRESTORE: Object.freeze(['BAIXA', 'NORMAL', 'ALTA'])
});

function atividades_validarSchemaAtividadesConfig_() {
  var ss = atividadesV2_getDatabaseSpreadsheetDev_();
  var sheet = ss.getSheetByName(ATIVIDADES_V2_SHEETS.CONFIG);
  if (!sheet) {
    return {
      ok: false,
      readOnly: true,
      ambiente: 'DEV',
      errorCode: 'ABA_ATIVIDADES_CONFIG_NAO_ENCONTRADA',
      message: 'A aba Atividades_Config nao foi encontrada na base v2 DEV.',
      colunasEncontradas: [],
      colunasObrigatoriasAtuais: ATIVIDADES_CONFIG_MODELOS_LEGACY_HEADERS_.slice(),
      colunasObrigatoriasEncontradas: [],
      colunasObrigatoriasAusentes: ATIVIDADES_CONFIG_MODELOS_LEGACY_HEADERS_.slice(),
      novasColunasEsperadas: ATIVIDADES_CONFIG_MODELOS_NEW_HEADERS_.slice(),
      novasColunasAusentes: ATIVIDADES_CONFIG_MODELOS_NEW_HEADERS_.slice(),
      colunasDuplicadas: [],
      mensagens: ['Aba Atividades_Config ausente na base v2 DEV.'],
      recomendacoes: ['Execute atividadesV2_setupDatabaseDev() antes da migracao do catalogo de modelos.']
    };
  }

  var schema = atividades_configModelosInspectSchema_(sheet);
  var result = atividades_configModelosBuildValidationResult_(ss, schema);
  atividadesV2_logSetup_(result.ok ? 'INFO' : 'WARN', 'Validacao do schema Atividades_Config finalizada.', {
    ok: result.ok,
    obrigatoriasAusentes: result.colunasObrigatoriasAusentes.length,
    novasAusentes: result.novasColunasAusentes.length,
    duplicadas: result.colunasDuplicadas.length
  });
  return result;
}

function atividades_migrarSchemaAtividadesConfigDryRun_() {
  var ss = atividadesV2_getDatabaseSpreadsheetDev_();
  var sheet = atividades_configModelosRequireSheet_(ss);
  var plan = atividades_configModelosBuildMigrationPlan_(ss, sheet);
  var result = {
    ok: plan.schema.missingLegacy.length === 0 && plan.schema.duplicates.length === 0,
    dryRun: true,
    readOnly: true,
    ambiente: 'DEV',
    spreadsheetId: ss.getId(),
    aba: sheet.getName(),
    colunasSeriamAdicionadas: plan.schema.missingNew.slice(),
    colunasJaExistentes: atividades_configModelosExistingNewHeaders_(plan.schema),
    notasSeriamAplicadas: plan.notes,
    validacoesSeriamAplicadas: plan.validations,
    normalizacaoSugerida: plan.normalization,
    avisos: [],
    erros: []
  };

  if (plan.schema.missingLegacy.length) {
    result.erros.push('Colunas obrigatorias atuais ausentes: ' + plan.schema.missingLegacy.join(', ') + '.');
  }
  if (plan.schema.duplicates.length) {
    result.erros.push('Existem cabecalhos duplicados; corrija-os manualmente antes da migracao.');
  }
  if (!plan.schema.missingNew.length) {
    result.avisos.push('O schema de modelos ja possui todas as novas colunas.');
  }

  atividadesV2_logSetup_(result.ok ? 'INFO' : 'WARN', 'Dry-run da migracao Atividades_Config finalizado.', {
    ok: result.ok,
    colunasAAdicionar: result.colunasSeriamAdicionadas.length,
    notasAAplicar: result.notasSeriamAplicadas.filter(function(item) { return item.seriaAplicada; }).length,
    celulasSugeridas: result.normalizacaoSugerida.totalCelulas
  });
  return result;
}

function atividades_migrarSchemaAtividadesConfig_() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    throw new Error('Nao foi possivel obter LockService para migrar Atividades_Config. Tente novamente.');
  }

  try {
    var ss = atividadesV2_getDatabaseSpreadsheetDev_();
    var sheet = atividades_configModelosRequireSheet_(ss);
    var before = atividades_configModelosInspectSchema_(sheet);
    if (before.missingLegacy.length) {
      throw new Error('Atividades_Config sem colunas obrigatorias atuais: ' + before.missingLegacy.join(', ') + '.');
    }
    if (before.duplicates.length) {
      throw new Error('Atividades_Config possui cabecalhos duplicados. Corrija-os manualmente antes da migracao.');
    }

    atividades_configModelosAppendHeaders_(sheet, before.missingNew);
    var after = atividades_configModelosInspectSchema_(sheet);
    var notesApplied = atividades_configModelosApplyHeaderNotes_(sheet, after);
    var validationsApplied = atividades_configModelosApplyValidations_(sheet, after);
    var logResult = atividadesV2_appendV2Log_(ss, {
      FLUXO: 'SETUP_V1',
      ACAO: 'MIGRAR_SCHEMA_ATIVIDADES_CONFIG_MODELOS',
      NIVEL: 'INFO',
      STATUS: 'CONCLUIDO',
      MENSAGEM: 'Schema do catalogo de modelos Atividades_Config validado/migrado em DEV.',
      DETALHES_JSON: JSON.stringify({
        colunasAdicionadas: before.missingNew.length,
        notasAplicadas: notesApplied.length,
        validacoesAplicadas: validationsApplied.length
      })
    });

    var result = {
      ok: after.missingLegacy.length === 0 && after.missingNew.length === 0 && after.duplicates.length === 0,
      dryRun: false,
      ambiente: 'DEV',
      spreadsheetId: ss.getId(),
      aba: sheet.getName(),
      colunasAdicionadas: before.missingNew.slice(),
      colunasJaExistentes: atividades_configModelosExistingNewHeaders_(before),
      notasAplicadas: notesApplied,
      validacoesAplicadas: validationsApplied,
      normalizacaoExecutada: false,
      logRegistrado: !!logResult,
      avisos: [],
      erros: []
    };
    if (!before.missingNew.length) result.avisos.push('Nenhuma coluna foi adicionada; o schema ja estava atualizado.');

    atividadesV2_logSetup_('INFO', 'Migracao do schema Atividades_Config finalizada.', {
      colunasAdicionadas: result.colunasAdicionadas.length,
      notasAplicadas: result.notasAplicadas.length,
      validacoesAplicadas: result.validacoesAplicadas.length
    });
    return result;
  } finally {
    lock.releaseLock();
  }
}

function atividades_normalizarModelosAtividadesConfig_(options) {
  options = options || {};
  var force = options.force === true;
  if (force && String(options.confirmacao || '') !== 'SOBRESCREVER_MODELOS_ATIVIDADES_CONFIG') {
    throw new Error('Normalizacao forcada exige confirmacao SOBRESCREVER_MODELOS_ATIVIDADES_CONFIG.');
  }

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    throw new Error('Nao foi possivel obter LockService para normalizar Atividades_Config. Tente novamente.');
  }

  try {
    var ss = atividadesV2_getDatabaseSpreadsheetDev_();
    var sheet = atividades_configModelosRequireSheet_(ss);
    var schema = atividades_configModelosInspectSchema_(sheet);
    if (schema.missingNew.length) {
      throw new Error('Schema Atividades_Config ainda nao migrado. Execute atividades_migrarSchemaAtividadesConfig() primeiro.');
    }
    if (schema.missingLegacy.length || schema.duplicates.length) {
      throw new Error('Atividades_Config possui inconsistencias estruturais. Execute atividades_validarSchemaAtividadesConfig().');
    }

    var simulation = atividades_configModelosSimulateNormalization_(sheet, schema, { force: force, collectUpdates: true });
    atividades_configModelosApplyNormalizationUpdates_(sheet, simulation.updates);
    var logResult = atividadesV2_appendV2Log_(ss, {
      FLUXO: 'SETUP_V1',
      ACAO: 'NORMALIZAR_MODELOS_ATIVIDADES_CONFIG',
      NIVEL: force ? 'WARN' : 'INFO',
      STATUS: 'CONCLUIDO',
      MENSAGEM: 'Modelos existentes em Atividades_Config normalizados em DEV.',
      DETALHES_JSON: JSON.stringify({
        force: force,
        modelosAtivos: simulation.modelosAtivos,
        celulasPreenchidas: simulation.totalCelulas,
        celulasSobrescritas: simulation.celulasSobrescritas
      })
    });

    var result = {
      ok: true,
      dryRun: false,
      ambiente: 'DEV',
      force: force,
      spreadsheetId: ss.getId(),
      aba: sheet.getName(),
      modelosLidos: simulation.modelosLidos,
      modelosAtivos: simulation.modelosAtivos,
      modelosInativosIgnorados: simulation.modelosInativosIgnorados,
      celulasPreenchidas: simulation.totalCelulas,
      celulasSobrescritas: simulation.celulasSobrescritas,
      preenchimentosPorColuna: simulation.byColumn,
      preenchimentosPorModelo: simulation.byModel,
      logRegistrado: !!logResult,
      avisos: [],
      erros: []
    };
    if (!simulation.totalCelulas) result.avisos.push('Nenhuma celula precisava de normalizacao.');

    atividadesV2_logSetup_(force ? 'WARN' : 'INFO', 'Normalizacao dos modelos Atividades_Config finalizada.', {
      force: force,
      modelosAtivos: result.modelosAtivos,
      celulasPreenchidas: result.celulasPreenchidas,
      celulasSobrescritas: result.celulasSobrescritas
    });
    return result;
  } finally {
    lock.releaseLock();
  }
}

function atividades_configModelosRequireSheet_(ss) {
  var sheet = ss.getSheetByName(ATIVIDADES_V2_SHEETS.CONFIG);
  if (!sheet) throw new Error('Aba Atividades_Config nao encontrada na base v2 DEV.');
  return sheet;
}

function atividades_configModelosInspectSchema_(sheet) {
  var lastColumn = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function(value) {
    return String(value || '').trim();
  });
  var positions = {};
  headers.forEach(function(header, index) {
    var key = atividades_configModelosNormalizeHeader_(header);
    if (!key) return;
    if (!positions[key]) positions[key] = [];
    positions[key].push(index + 1);
  });

  var duplicates = Object.keys(positions).filter(function(key) {
    return positions[key].length > 1;
  }).map(function(key) {
    return { coluna: key, posicoes: positions[key].slice() };
  });
  var missingLegacy = ATIVIDADES_CONFIG_MODELOS_LEGACY_HEADERS_.filter(function(header) {
    return !positions[atividades_configModelosNormalizeHeader_(header)];
  });
  var missingNew = ATIVIDADES_CONFIG_MODELOS_NEW_HEADERS_.filter(function(header) {
    return !positions[atividades_configModelosNormalizeHeader_(header)];
  });

  return {
    headers: headers,
    positions: positions,
    duplicates: duplicates,
    missingLegacy: missingLegacy,
    missingNew: missingNew
  };
}

function atividades_configModelosBuildValidationResult_(ss, schema) {
  var recommendations = [];
  var messages = [];
  if (schema.missingLegacy.length) recommendations.push('Revisar manualmente as colunas atuais ausentes antes de migrar.');
  if (schema.duplicates.length) recommendations.push('Corrigir cabecalhos duplicados manualmente; a migracao nao escolhe uma coluna automaticamente.');
  if (schema.missingNew.length) recommendations.push('Executar atividades_migrarSchemaAtividadesConfigDryRun() e depois atividades_migrarSchemaAtividadesConfig().');
  if (!schema.missingLegacy.length && !schema.missingNew.length && !schema.duplicates.length) {
    recommendations.push('Schema pronto. A normalizacao inicial pode ser executada separadamente.');
    messages.push('Schema Atividades_Config compativel com o catalogo de modelos.');
  } else {
    messages.push('Schema Atividades_Config requer ajustes antes da normalizacao.');
  }

  return {
    ok: schema.missingLegacy.length === 0 && schema.missingNew.length === 0 && schema.duplicates.length === 0,
    readOnly: true,
    ambiente: 'DEV',
    spreadsheetId: ss.getId(),
    aba: ATIVIDADES_V2_SHEETS.CONFIG,
    colunasEncontradas: schema.headers.filter(function(header) { return !!header; }),
    colunasObrigatoriasAtuais: ATIVIDADES_CONFIG_MODELOS_LEGACY_HEADERS_.slice(),
    colunasObrigatoriasEncontradas: ATIVIDADES_CONFIG_MODELOS_LEGACY_HEADERS_.filter(function(header) {
      return !!schema.positions[atividades_configModelosNormalizeHeader_(header)];
    }),
    colunasObrigatoriasAusentes: schema.missingLegacy.slice(),
    novasColunasEsperadas: ATIVIDADES_CONFIG_MODELOS_NEW_HEADERS_.slice(),
    novasColunasAusentes: schema.missingNew.slice(),
    colunasDuplicadas: schema.duplicates,
    mensagens: messages,
    recomendacoes: recommendations
  };
}

function atividades_configModelosBuildMigrationPlan_(ss, sheet) {
  var schema = atividades_configModelosInspectSchema_(sheet);
  var notes = atividades_configModelosPreviewNotes_(sheet, schema);
  return {
    spreadsheetId: ss.getId(),
    schema: schema,
    notes: notes,
    validations: atividades_configModelosValidationPreview_(schema),
    normalization: atividades_configModelosSimulateNormalization_(sheet, schema, { force: false, collectUpdates: false })
  };
}

function atividades_configModelosAppendHeaders_(sheet, headers) {
  if (!headers.length) return;
  var lastColumn = Math.max(sheet.getLastColumn(), 1);
  var values = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  var lastUsed = 0;
  values.forEach(function(value, index) {
    if (String(value || '').trim()) lastUsed = index + 1;
  });
  var startColumn = lastUsed + 1;
  var targetLastColumn = startColumn + headers.length - 1;
  if (sheet.getMaxColumns() < targetLastColumn) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), targetLastColumn - sheet.getMaxColumns());
  }
  sheet.getRange(1, startColumn, 1, headers.length).setValues([headers]);
}

function atividades_configModelosPreviewNotes_(sheet, schema) {
  var notes = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getNotes()[0];
  return ATIVIDADES_CONFIG_MODELOS_NEW_HEADERS_.map(function(header) {
    var key = atividades_configModelosNormalizeHeader_(header);
    var position = schema.positions[key] ? schema.positions[key][0] : 0;
    var current = position ? String(notes[position - 1] || '').trim() : '';
    return {
      coluna: header,
      nota: atividades_configModelosHeaderNote_(header),
      seriaAplicada: !current
    };
  });
}

function atividades_configModelosApplyHeaderNotes_(sheet, schema) {
  var lastColumn = Math.max(sheet.getLastColumn(), 1);
  var range = sheet.getRange(1, 1, 1, lastColumn);
  var notes = range.getNotes()[0];
  var applied = [];
  ATIVIDADES_CONFIG_MODELOS_NEW_HEADERS_.forEach(function(header) {
    var positions = schema.positions[atividades_configModelosNormalizeHeader_(header)] || [];
    if (!positions.length) return;
    var index = positions[0] - 1;
    if (String(notes[index] || '').trim()) return;
    notes[index] = atividades_configModelosHeaderNote_(header);
    applied.push(header);
  });
  if (applied.length) range.setNotes([notes]);
  return applied;
}

function atividades_configModelosHeaderNote_(header) {
  var notes = {
    PERMITE_CRIACAO_PORTAL: 'SIM habilita este modelo para futura criacao de atividades pelo Portal GEAPA.',
    PERFIS_QUE_PODEM_CRIAR: 'Perfis autorizados separados por virgula; a permissao deve ser revalidada no backend.',
    TAMANHO_MAX_MATERIAL_MB: 'Limite numerico em MB para o material deste modelo.',
    TIPOS_ARQUIVO_MATERIAL_PERMITIDOS: 'Extensoes permitidas separadas por virgula, sem ponto.',
    PERMITE_EXCECAO: 'SIM permite solicitar excecao aos valores homologados deste modelo.',
    APROVACAO_EXCECAO_NIVEL: 'Nivel institucional necessario para aprovar uma excecao do modelo.',
    PERFIS_APROVADORES_EXCECAO: 'Perfis aptos a aprovar excecoes, separados por virgula.',
    BLOQUEAR_EDICAO_APOS_REALIZACAO: 'SIM impede edicao operacional normal depois da realizacao.',
    SINCRONIZA_FIRESTORE: 'Reserva de configuracao. Nao ativa integracao Firestore nesta etapa.'
  };
  return notes[header] || 'Configuracao homologada do modelo de atividade: ' + header + '.';
}

function atividades_configModelosValidationPreview_(schema) {
  var result = [];
  ATIVIDADES_CONFIG_MODELOS_SIM_NAO_HEADERS_.forEach(function(header) {
    result.push({ coluna: header, tipo: 'LISTA', valores: ['SIM', 'NAO'] });
  });
  ATIVIDADES_CONFIG_MODELOS_NUMERIC_HEADERS_.forEach(function(header) {
    result.push({ coluna: header, tipo: 'NUMERO_NAO_NEGATIVO' });
  });
  Object.keys(ATIVIDADES_CONFIG_MODELOS_ENUMS_).forEach(function(header) {
    result.push({ coluna: header, tipo: 'LISTA', valores: ATIVIDADES_CONFIG_MODELOS_ENUMS_[header].slice() });
  });
  return result.filter(function(item) {
    return !!schema.positions[atividades_configModelosNormalizeHeader_(item.coluna)] ||
      ATIVIDADES_CONFIG_MODELOS_NEW_HEADERS_.indexOf(item.coluna) !== -1;
  });
}

function atividades_configModelosApplyValidations_(sheet, schema) {
  var maxRows = Math.max(sheet.getMaxRows() - 1, 1);
  var applied = [];
  var simNaoRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['SIM', 'NAO'], true)
    .setAllowInvalid(true)
    .setHelpText('Use SIM ou NAO.')
    .build();
  atividades_configModelosApplyRuleToHeaders_(sheet, schema, ATIVIDADES_CONFIG_MODELOS_SIM_NAO_HEADERS_, maxRows, simNaoRule, applied);

  var numericRule = SpreadsheetApp.newDataValidation()
    .requireNumberGreaterThanOrEqualTo(0)
    .setAllowInvalid(true)
    .setHelpText('Informe um numero maior ou igual a zero.')
    .build();
  atividades_configModelosApplyRuleToHeaders_(sheet, schema, ATIVIDADES_CONFIG_MODELOS_NUMERIC_HEADERS_, maxRows, numericRule, applied);

  Object.keys(ATIVIDADES_CONFIG_MODELOS_ENUMS_).forEach(function(header) {
    var rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(ATIVIDADES_CONFIG_MODELOS_ENUMS_[header].slice(), true)
      .setAllowInvalid(true)
      .setHelpText('Selecione um valor homologado para ' + header + '.')
      .build();
    atividades_configModelosApplyRuleToHeaders_(sheet, schema, [header], maxRows, rule, applied);
  });
  return applied;
}

function atividades_configModelosApplyRuleToHeaders_(sheet, schema, headers, maxRows, rule, applied) {
  var ranges = [];
  headers.forEach(function(header) {
    var positions = schema.positions[atividades_configModelosNormalizeHeader_(header)] || [];
    if (!positions.length) return;
    ranges.push(atividades_configModelosColumnA1_(positions[0]) + '2:' + atividades_configModelosColumnA1_(positions[0]) + (maxRows + 1));
    applied.push(header);
  });
  if (ranges.length) {
    sheet.getRangeList(ranges).getRanges().forEach(function(range) {
      range.setDataValidation(rule);
    });
  }
}

function atividades_configModelosSimulateNormalization_(sheet, schema, options) {
  options = options || {};
  var lastRow = sheet.getLastRow();
  var lastColumn = Math.max(sheet.getLastColumn(), 1);
  var dataRange = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, lastColumn) : null;
  var rows = dataRange ? dataRange.getValues() : [];
  var formulas = dataRange ? dataRange.getFormulas() : [];
  var result = {
    modelosLidos: rows.length,
    modelosAtivos: 0,
    modelosInativosIgnorados: 0,
    totalCelulas: 0,
    celulasSobrescritas: 0,
    byColumn: {},
    valoresSugeridosPorColuna: {},
    byModel: {},
    updates: []
  };

  rows.forEach(function(row, rowIndex) {
    var record = atividades_configModelosRecordFromRow_(row, schema);
    if (atividades_configModelosNormalizeToken_(record.ATIVO) !== 'SIM') {
      result.modelosInativosIgnorados++;
      return;
    }
    result.modelosAtivos++;
    var defaults = atividades_configModelosDefaultsForRecord_(record);
    var modelKey = String(record.ID_CONFIG || record.SUBTIPO_ATIVIDADE || record.TIPO_ATIVIDADE || ('LINHA_' + (rowIndex + 2))).trim();

    Object.keys(defaults).forEach(function(header) {
      var positions = schema.positions[atividades_configModelosNormalizeHeader_(header)] || [];
      var position = positions.length ? positions[0] : 0;
      var current = position ? row[position - 1] : '';
      var hasFormula = !!(position && formulas[rowIndex] && formulas[rowIndex][position - 1]);
      var isEmpty = !hasFormula && atividades_configModelosIsEmpty_(current);
      if (!isEmpty && !options.force) return;
      if (!isEmpty && String(current) === String(defaults[header])) return;

      result.totalCelulas++;
      if (!isEmpty) result.celulasSobrescritas++;
      result.byColumn[header] = (result.byColumn[header] || 0) + 1;
      if (!result.valoresSugeridosPorColuna[header]) result.valoresSugeridosPorColuna[header] = {};
      var valueLabel = String(defaults[header]);
      result.valoresSugeridosPorColuna[header][valueLabel] =
        (result.valoresSugeridosPorColuna[header][valueLabel] || 0) + 1;
      result.byModel[modelKey] = (result.byModel[modelKey] || 0) + 1;
      if (options.collectUpdates && position) {
        result.updates.push({
          row: rowIndex + 2,
          column: position,
          header: header,
          value: defaults[header],
          overwrites: !isEmpty
        });
      }
    });
  });

  if (!options.collectUpdates) delete result.updates;
  return result;
}

function atividades_configModelosDefaultsForRecord_(record) {
  var agenda = atividades_configModelosSimNaoOrDefault_(record.GERA_CARD_AGENDA, 'SIM');
  var portal = atividades_configModelosSimNaoOrDefault_(record.EXIBE_NO_PORTAL, 'SIM');
  var defaults = {
    PERMITE_CRIACAO_PORTAL: 'SIM',
    PERFIS_QUE_PODEM_CRIAR: 'DIRETORIA,SECRETARIO,ADMIN_TECNICO',
    PERMITE_EXCECAO: 'SIM',
    EXIGE_JUSTIFICATIVA_EXCECAO: 'SIM',
    APROVACAO_EXCECAO_NIVEL: 'DIRETORIA',
    PERFIS_APROVADORES_EXCECAO: 'PRESIDENTE,DIRETORIA,ADMIN_TECNICO',
    QTD_APROVADORES_EXCECAO: 1,
    BLOQUEAR_EDICAO_APOS_REALIZACAO: 'SIM',
    BLOQUEAR_EDICAO_APOS_PUBLICACAO: 'NAO',
    PERMITE_EDICAO_APOS_PRESENCA: 'NAO',
    PERMITE_CANCELAMENTO_APOS_PUBLICACAO: 'SIM',
    PERMITE_CANCELAMENTO_APOS_REALIZACAO: 'NAO',
    PERFIS_QUE_PODEM_EDITAR: 'DIRETORIA,SECRETARIO,ADMIN_TECNICO',
    PERFIS_QUE_PODEM_CANCELAR: 'DIRETORIA,SECRETARIO,ADMIN_TECNICO',
    CRIAR_PASTA_DRIVE_PADRAO: 'SIM',
    MODELO_NOME_PASTA_DRIVE: '{DATA_ATIVIDADE} - {TIPO_PUBLICO} - {TITULO_PUBLICO}',
    EXIBE_NO_CALENDARIO: agenda,
    EXIBE_EM_PROXIMAS_ATIVIDADES: agenda,
    EXIBE_NO_HISTORICO_PUBLICO: portal,
    ORIGEM_FLUXO_PADRAO: 'PORTAL_CRUD',
    GERA_LOG_DETALHADO: 'SIM',
    GERA_EVENTO_PORTAL: 'SIM',
    SINCRONIZA_FIRESTORE: 'SIM',
    PRIORIDADE_SYNC_FIRESTORE: 'NORMAL'
  };
  var subtype = atividades_configModelosNormalizeToken_(record.SUBTIPO_ATIVIDADE);
  var specific = atividades_configModelosDefaultsForSubtype_(subtype);
  Object.keys(specific).forEach(function(header) {
    defaults[header] = specific[header];
  });
  return defaults;
}

function atividades_configModelosDefaultsForSubtype_(subtype) {
  if (subtype === 'APRESENTACAO_MEMBRO') {
    return {
      NOME_MODELO_PORTAL: 'Apresenta\u00e7\u00e3o de membro',
      GRUPO_MODELO: 'Acad\u00eamicas',
      GERA_PENDENCIA_TITULO_EIXO: 'SIM',
      GERA_PENDENCIA_MATERIAL: 'SIM',
      GERA_PENDENCIA_ATA: 'NAO',
      PERMITE_LINK_MATERIAL: 'SIM',
      PERMITE_UPLOAD_MATERIAL: 'SIM',
      TIPOS_ARQUIVO_MATERIAL_PERMITIDOS: 'PDF,PPTX',
      TAMANHO_MAX_MATERIAL_MB: 20,
      INSTRUCAO_UPLOAD_MATERIAL: 'Envie preferencialmente em PDF. Arquivos PPTX devem estar comprimidos e respeitar o limite de tamanho.',
      TIPO_PESSOA_PRINCIPAL_PADRAO: 'MEMBRO',
      PERMITE_MEMBRO_COMO_PRINCIPAL: 'SIM',
      PERMITE_PROFESSOR_COMO_PRINCIPAL: 'NAO',
      PERMITE_PESSOA_EXTERNA_PRINCIPAL: 'NAO',
      EXIGE_EMAIL_PESSOA_PRINCIPAL: 'NAO',
      EXIGE_INSTITUICAO_PESSOA_PRINCIPAL: 'NAO',
      EXIGE_VALIDACAO_EIXO: 'SIM',
      FONTE_EIXO_TEMATICO: 'EIXOS_TEMATICOS_OFICIAIS'
    };
  }
  if (subtype === 'PALESTRA') {
    return {
      NOME_MODELO_PORTAL: 'Palestra',
      GRUPO_MODELO: 'Acad\u00eamicas',
      GERA_PENDENCIA_TITULO_EIXO: 'SIM',
      GERA_PENDENCIA_MATERIAL: 'SIM',
      GERA_PENDENCIA_ATA: 'SIM',
      PERMITE_LINK_MATERIAL: 'SIM',
      PERMITE_UPLOAD_MATERIAL: 'SIM',
      TIPOS_ARQUIVO_MATERIAL_PERMITIDOS: 'PDF,PPTX,DOCX',
      TAMANHO_MAX_MATERIAL_MB: 25,
      TIPO_PESSOA_PRINCIPAL_PADRAO: 'PROFESSOR,EXTERNO',
      PERMITE_MEMBRO_COMO_PRINCIPAL: 'NAO',
      PERMITE_PROFESSOR_COMO_PRINCIPAL: 'SIM',
      PERMITE_PESSOA_EXTERNA_PRINCIPAL: 'SIM',
      EXIGE_EMAIL_PESSOA_PRINCIPAL: 'SIM',
      EXIGE_INSTITUICAO_PESSOA_PRINCIPAL: 'SIM',
      EXIGE_VALIDACAO_EIXO: 'SIM',
      FONTE_EIXO_TEMATICO: 'EIXOS_TEMATICOS_OFICIAIS'
    };
  }
  if (subtype === 'ABERTURA_PERIODO' || subtype === 'FECHAMENTO_PERIODO') {
    return {
      NOME_MODELO_PORTAL: subtype === 'ABERTURA_PERIODO' ? 'Abertura de per\u00edodo' : 'Fechamento de per\u00edodo',
      GRUPO_MODELO: 'Organizacionais',
      GERA_PENDENCIA_TITULO_EIXO: 'NAO',
      GERA_PENDENCIA_MATERIAL: 'SIM',
      GERA_PENDENCIA_ATA: 'SIM',
      PERMITE_LINK_MATERIAL: 'SIM',
      PERMITE_UPLOAD_MATERIAL: 'SIM',
      TIPOS_ARQUIVO_MATERIAL_PERMITIDOS: 'PDF,DOCX,PPTX',
      TAMANHO_MAX_MATERIAL_MB: 20,
      TIPO_PESSOA_PRINCIPAL_PADRAO: 'RESPONSAVEL_INTERNO',
      EXIGE_VALIDACAO_EIXO: 'NAO'
    };
  }
  return {};
}

function atividades_configModelosApplyNormalizationUpdates_(sheet, updates) {
  var groups = {};
  (updates || []).forEach(function(update) {
    var valueKey = typeof update.value + ':' + String(update.value);
    var groupKey = update.column + '|' + valueKey;
    if (!groups[groupKey]) groups[groupKey] = { value: update.value, ranges: [] };
    groups[groupKey].ranges.push(atividades_configModelosColumnA1_(update.column) + update.row);
  });
  Object.keys(groups).forEach(function(key) {
    sheet.getRangeList(groups[key].ranges).setValue(groups[key].value);
  });
}

function atividades_configModelosRecordFromRow_(row, schema) {
  var record = {};
  Object.keys(schema.positions).forEach(function(header) {
    var position = schema.positions[header][0];
    record[header] = row[position - 1];
  });
  return record;
}

function atividades_configModelosExistingNewHeaders_(schema) {
  return ATIVIDADES_CONFIG_MODELOS_NEW_HEADERS_.filter(function(header) {
    return !!schema.positions[atividades_configModelosNormalizeHeader_(header)];
  });
}

function atividades_configModelosNormalizeHeader_(value) {
  return String(value || '').trim().toUpperCase();
}

function atividades_configModelosNormalizeToken_(value) {
  return String(value || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
}

function atividades_configModelosSimNaoOrDefault_(value, fallback) {
  var normalized = atividades_configModelosNormalizeToken_(value);
  return normalized === 'SIM' || normalized === 'NAO' ? normalized : fallback;
}

function atividades_configModelosIsEmpty_(value) {
  return value === null || typeof value === 'undefined' || String(value).trim() === '';
}

function atividades_configModelosColumnA1_(column) {
  var result = '';
  var current = Number(column || 0);
  while (current > 0) {
    var remainder = (current - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / 26);
  }
  return result;
}
