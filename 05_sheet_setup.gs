function atividades_buildDropdownRules_() {
  return {
    Atividades: {
      CLASSIFICACAO_REUNIAO: {
        values: ATIVIDADES_CFG.ENUMS.CLASSIFICACAO_REUNIAO,
        helpText: 'Use para reunioes ordinarias, extraordinarias ou de diretoria. Pode ficar em branco quando nao se aplicar.'
      },
      TIPO_ATIVIDADE: {
        values: ATIVIDADES_CFG.ENUMS.TIPO_ATIVIDADE,
        helpText: 'Tipo institucional principal da atividade.'
      },
      SUBTIPO_ATIVIDADE: {
        values: ATIVIDADES_CFG.ENUMS.SUBTIPO_ATIVIDADE,
        helpText: 'Subtipo operacional especifico da atividade.'
      },
      CLASSIFICACAO_ACESSO: {
        values: ATIVIDADES_CFG.ENUMS.CLASSIFICACAO_ACESSO,
        helpText: 'Nivel de abertura ou restricao da atividade.'
      },
      FORMATO: {
        values: ATIVIDADES_CFG.ENUMS.FORMATO,
        helpText: 'Formato principal da atividade.'
      },
      OBRIGATORIA: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Marque SIM quando houver obrigatoriedade formal.' },
      EXIGE_CONVOCACAO: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Campo herdado do config na V1.' },
      EXIGE_LEMBRETE: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Campo herdado do config na V1.' },
      EXIGE_ATA: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Campo herdado do config na V1.' },
      EXIGE_MATERIAL: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Campo herdado do config na V1.' },
      EXIGE_LISTA_PRESENCA: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Campo herdado do config na V1.' },
      CONTA_PRESENCA: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Se SIM, gera coluna oficial na presenca do periodo.' },
      CONTA_FALTA: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Se SIM, pode contabilizar falta oficial.' },
      GERA_CERTIFICADO: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Reservado para fluxos posteriores.' },
      STATUS: { values: ATIVIDADES_CFG.ENUMS.STATUS_ATIVIDADE, helpText: 'Status operacional atual.' }
    },

    Atividades_Apresentacoes: {
      STATUS_APRESENTACAO: { values: ATIVIDADES_CFG.ENUMS.STATUS_APRESENTACAO, helpText: 'Estado operacional da apresentacao.' },
      NOTIFICACAO_SECRETARIOS_ENVIADA: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Controle de aviso aos secretarios.' },
      CONVITE_PROFESSORES_ENVIADO: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Controle de convite a professores.' },
      LEMBRETE_MEMBROS_ENVIADO: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Controle de lembrete aos membros.' },
      STATUS_ENVIO_ARQUIVO: { values: ATIVIDADES_CFG.ENUMS.STATUS_ARQUIVO, helpText: 'Estado de envio do arquivo.' },
      SYNC_HISTORICO_PUBLICO: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Indica se ja foi refletido no historico publico.' }
    },

    Atividade_Convidados: {
      TIPO_VINCULO_PESSOA: { values: ATIVIDADES_CFG.ENUMS.TIPO_VINCULO_PESSOA, helpText: 'Origem da pessoa vinculada.' },
      PAPEL_NA_ATIVIDADE: { values: ATIVIDADES_CFG.ENUMS.PAPEL_NA_ATIVIDADE, helpText: 'Papel funcional da pessoa na atividade.' },
      CONVITE_ENVIADO: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Controle de envio do convite.' },
      CONFIRMADO: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Controle de confirmacao.' },
      PRESENCA_REGISTRADA: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Controle de comparecimento nao oficial.' }
    },

    Atividades_Config: {
      ATIVO: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Se NAO, a regra e ignorada.' },
      CLASSIFICACAO_REUNIAO: {
        values: ATIVIDADES_CFG.ENUMS.CLASSIFICACAO_REUNIAO,
        helpText: 'Preencha apenas quando a regra distinguir reuniao ordinaria, extraordinaria ou de diretoria.'
      },
      TIPO_ATIVIDADE: { values: ATIVIDADES_CFG.ENUMS.TIPO_ATIVIDADE, helpText: 'Tipo institucional principal da regra.' },
      SUBTIPO_ATIVIDADE: { values: ATIVIDADES_CFG.ENUMS.SUBTIPO_ATIVIDADE, helpText: 'Subtipo operacional da regra.' },
      CLASSIFICACAO_ACESSO: { values: ATIVIDADES_CFG.ENUMS.CLASSIFICACAO_ACESSO, helpText: 'Acesso padrao herdado.' },
      PERMITE_MEMBROS: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Participacao de membros.' },
      PERMITE_PROFESSORES_CURSO: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Participacao de professores.' },
      PERMITE_PARTICIPANTES_EXTERNOS: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Participacao de externos cadastrados.' },
      PERMITE_CONVIDADOS_ESPECIFICOS: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Participacao de convidados nominais.' },
      EXIGE_LISTA_NOMINAL_CONVIDADOS: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Exigir lista nominal de convidados.' },
      EXIGE_CONVOCACAO: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Regra padrao de convocacao.' },
      EXIGE_LEMBRETE: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Regra padrao de lembrete.' },
      EXIGE_ATA: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Regra padrao de ata.' },
      EXIGE_MATERIAL: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Regra padrao de material.' },
      EXIGE_LISTA_PRESENCA: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Regra padrao de lista de presenca.' },
      CONTA_PRESENCA: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Se SIM, a atividade entra na presenca oficial.' },
      CONTA_FALTA: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Se SIM, a atividade conta falta oficial.' },
      GERA_CERTIFICADO: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Indicador para fluxos futuros.' },
      EXIGE_REGRAS_APRESENTACAO: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Use SIM quando houver regra especial de apresentacao.' }
    },

    Justificativas_Faltas: {
      MOTIVO_DECLARADO: {
        values: ATIVIDADES_CFG.ENUMS.MOTIVO_AUSENCIA,
        helpText: 'Motivo declarado pelo membro no formulario oficial.'
      },
      STATUS_ANALISE: {
        values: ATIVIDADES_CFG.ENUMS.STATUS_ANALISE_JUSTIFICATIVA,
        helpText: 'Resultado manual da analise administrativa da justificativa.'
      },
      DECISAO_APLICADA_NA_PRESENCA: {
        values: ATIVIDADES_CFG.ENUMS.DECISAO_APLICADA_PRESENCA,
        helpText: 'Reflexo atual da decisao na planilha de presencas.'
      },
      POSSUI_DOCUMENTO_COMPROBATORIO: {
        values: ATIVIDADES_CFG.ENUMS.SIM_NAO,
        helpText: 'Indica se o membro informou documento comprobatorio.'
      }
    }
  };
}

function atividades_buildHeaderNotes_() {
  return {
    Atividades: {
      ID_ATIVIDADE: 'Identificador unico da atividade no formato ATV-0001. E gerado automaticamente quando a linha fica elegivel.',
      CLASSIFICACAO_REUNIAO: 'Use apenas para atividades de reuniao: ORDINARIA, EXTRAORDINARIA ou DIRETORIA.',
      TIPO_ATIVIDADE: 'Tipo institucional principal da atividade: ACADEMICA, ORGANIZACIONAL, ESTRATEGICA, INTERNA, DELIBERATIVA ou OUTRA.',
      SUBTIPO_ATIVIDADE: 'Subtipo operacional especifico da atividade, como APRESENTACAO_MEMBRO, PALESTRA, CURSO, ABERTURA_PERIODO, FECHAMENTO_PERIODO ou MARCO_INSTITUCIONAL.',
      CLASSIFICACAO_ACESSO: 'Define se a atividade e aberta ou restrita.',
      TITULO: 'Titulo humano da atividade.',
      DATA_ATIVIDADE: 'Data principal da atividade.',
      FORMATO: 'PRESENCIAL, ONLINE ou HIBRIDO.',
      OBRIGATORIA: 'Marque SIM apenas quando houver obrigatoriedade formal.',
      CONTA_PRESENCA: 'Se SIM, gera coluna oficial em Presencas.',
      CONTA_FALTA: 'Se SIM, pode contabilizar falta oficial.',
      STATUS: 'Status operacional atual da atividade.',
      OBSERVACOES: 'Observacoes gerais da atividade.'
    },
    Atividades_Apresentacoes: {
      ID_APRESENTACAO: 'Identificador unico do registro de apresentacao.',
      ID_ATIVIDADE: 'Referencia para a atividade principal em Atividades.',
      RGA: 'Identificador oficial do membro apresentador.',
      STATUS_APRESENTACAO: 'Estado operacional da apresentacao.',
      STATUS_ENVIO_ARQUIVO: 'Estado do recebimento do arquivo.'
    },
    Atividade_Convidados: {
      ID_CONVITE_ATIVIDADE: 'Identificador unico do vinculo da pessoa com a atividade.',
      ID_ATIVIDADE: 'Referencia para a atividade principal.',
      TIPO_VINCULO_PESSOA: 'Membro, professor, participante externo ou convidado especifico.'
    },
    Atividades_Config: {
      ATIVO: 'Ativa ou desativa a regra.',
      CLASSIFICACAO_REUNIAO: 'Use apenas quando a regra depender do tipo de reuniao. Pode ficar em branco para atividades nao enquadradas como reuniao.',
      TIPO_ATIVIDADE: 'Tipo institucional principal da regra.',
      SUBTIPO_ATIVIDADE: 'Subtipo operacional da regra. Use SEM_SUBTIPO quando nao houver detalhamento adicional.',
      CONTA_PRESENCA: 'Se SIM, a atividade entra na presenca oficial do periodo.',
      CONTA_FALTA: 'Se SIM, a atividade pode contar falta oficial.'
    },
    Atividades_Log: {
      ID_LOG: 'Identificador unico do log funcional.',
      TIPO_EVENTO_LOG: 'Tipo funcional do evento registrado.',
      ACAO_EXECUTADA: 'Acao executada pelo modulo.',
      RESULTADO: 'Resultado resumido da acao.'
    },
    Justificativas_Faltas: {
      ID_JUSTIFICATIVA: 'Identificador unico da justificativa no formato JUS-00001.',
      PERIODO: 'Periodo ao qual a ausencia pertence.',
      CODIGO_ATIVIDADE: 'Codigo operacional da atividade no periodo, usado no formulario e no e-mail.',
      ID_ATIVIDADE: 'Referencia para a atividade principal em Atividades.',
      DATA_LIMITE_JUSTIFICATIVA: 'Prazo final de 48 horas para envio da justificativa.',
      STATUS_ANALISE: 'Status da analise manual da diretoria ou secretaria.',
      DECISAO_APLICADA_NA_PRESENCA: 'Reflexo atual da decisao na planilha oficial de presencas.',
      VALOR_ANTES: 'Valor encontrado na presenca antes da aplicacao da decisao.',
      VALOR_DEPOIS: 'Valor final refletido na presenca apos decisao e abono.',
      OBSERVACOES: 'Campo livre para observacoes administrativas.'
    },
    META: {
      PERIODO_ID: 'Identificador do periodo arquivado.',
      ARQUIVADO_EM: 'Data e hora em que o arquivamento foi realizado.',
      ORIGEM_PLANILHA_ID: 'ID da planilha operacional de origem.',
      ORIGEM_PLANILHA_NOME: 'Nome da planilha operacional de origem.',
      ABA_ATIVIDADES_PERIODO: 'Nome da aba de atividades copiada para o historico.',
      ABA_PRESENCAS_PERIODO: 'Nome da aba de presencas copiada para o historico.',
      VERSAO_MODULO: 'Versao do modulo que gerou o arquivamento.',
      OBSERVACOES: 'Observacoes livres sobre o snapshot historico.'
    },
    PERIODO_Atividades: {
      COD_ATIVIDADE_PERIODO: 'Codigo sequencial da atividade no periodo.',
      COLUNA_PRESENCA: 'Nome da coluna dinamica correspondente em Presencas, no formato ID_ATIVIDADE_YYYYMMDD.',
      CLASSIFICACAO_REUNIAO: 'Replica a classificacao de reuniao da atividade quando se aplicar.'
    },
    PERIODO_Presencas: {
      RGA: 'Identificador oficial do membro.',
      NOME_MEMBRO: 'Nome do membro.',
      EMAIL: 'Email institucional ou principal do membro.',
      CARGO_FUNCAO_ATUAL: 'Cargo ou funcao atual do membro no momento da sincronizacao.',
      STATUS_CADASTRAL: 'Status atual do vinculo institucional do membro.',
      STATUS_NO_PERIODO: 'Situacao historica do membro dentro do periodo especifico.',
      DATA_ENTRADA_NO_PERIODO: 'Data a partir da qual o membro passa a contar presenca/falta no periodo.',
      DATA_SAIDA_NO_PERIODO: 'Data a partir da qual o membro deixa de contar presenca/falta no periodo.',
      MOTIVO_ALTERACAO_NO_PERIODO: 'Motivo historico da entrada, desligamento, suspensao ou retorno no periodo.',
      OBS_EVENTO_PERIODO: 'Observacoes livres sobre o evento historico do periodo.',
      TOTAL_PRESENCAS: 'Total de marcacoes P e R no periodo.',
      TOTAL_JUSTIFICADAS: 'Total de marcacoes J e A no periodo.',
      PERCENTUAL_FREQUENCIA: 'Percentual calculado de frequencia.'
    }
  };
}

function atividades_buildHeaderColors_() {
  return {
    Atividades: [
      { color: '#d9ead3', headers: ['ID_ATIVIDADE', 'CLASSIFICACAO_REUNIAO', 'TIPO_ATIVIDADE', 'SUBTIPO_ATIVIDADE', 'CLASSIFICACAO_ACESSO', 'STATUS'] },
      { color: '#d0e0e3', headers: ['DATA_ATIVIDADE', 'HORARIO_INICIO', 'HORARIO_FIM', 'DATA_CONVOCACAO', 'DATA_LEMBRETE', 'DATA_REALIZACAO', 'CRIADO_EM', 'ATUALIZADO_EM'] },
      { color: '#fff2cc', headers: ['OBRIGATORIA', 'EXIGE_CONVOCACAO', 'EXIGE_LEMBRETE', 'EXIGE_ATA', 'EXIGE_MATERIAL', 'EXIGE_LISTA_PRESENCA', 'CONTA_PRESENCA', 'CONTA_FALTA', 'GERA_CERTIFICADO'] },
      { color: '#fce5cd', headers: ['TITULO', 'DESCRICAO', 'LOCAL', 'FORMATO', 'RESPONSAVEL_INTERNO', 'RESPONSAVEL_EMAIL', 'PUBLICO_ALVO', 'OBSERVACOES'] }
    ],
    Atividades_Apresentacoes: [
      { color: '#d9ead3', headers: ['ID_APRESENTACAO', 'ID_ATIVIDADE', 'RGA', 'NOME_MEMBRO', 'EMAIL_MEMBRO', 'STATUS_APRESENTACAO'] },
      { color: '#fff2cc', headers: ['NOTIFICACAO_SECRETARIOS_ENVIADA', 'CONVITE_PROFESSORES_ENVIADO', 'LEMBRETE_MEMBROS_ENVIADO', 'STATUS_ENVIO_ARQUIVO', 'SYNC_HISTORICO_PUBLICO'] }
    ],
    Atividade_Convidados: [
      { color: '#d9ead3', headers: ['ID_CONVITE_ATIVIDADE', 'ID_ATIVIDADE', 'TIPO_VINCULO_PESSOA', 'ID_REFERENCIA'] },
      { color: '#fce5cd', headers: ['NOME', 'EMAIL', 'PAPEL_NA_ATIVIDADE', 'OBSERVACOES'] }
    ],
    Atividades_Config: [
      { color: '#d9ead3', headers: ['ATIVO', 'CLASSIFICACAO_REUNIAO', 'TIPO_ATIVIDADE', 'SUBTIPO_ATIVIDADE', 'CLASSIFICACAO_ACESSO'] },
      { color: '#fff2cc', headers: ['PERMITE_MEMBROS', 'PERMITE_PROFESSORES_CURSO', 'PERMITE_PARTICIPANTES_EXTERNOS', 'PERMITE_CONVIDADOS_ESPECIFICOS', 'EXIGE_LISTA_NOMINAL_CONVIDADOS', 'EXIGE_CONVOCACAO', 'EXIGE_LEMBRETE', 'EXIGE_ATA', 'EXIGE_MATERIAL', 'EXIGE_LISTA_PRESENCA', 'CONTA_PRESENCA', 'CONTA_FALTA', 'GERA_CERTIFICADO', 'EXIGE_REGRAS_APRESENTACAO'] }
    ],
    Atividades_Log: [
      { color: '#d9ead3', headers: ['ID_LOG', 'ID_ATIVIDADE', 'TIPO_EVENTO_LOG', 'STATUS'] }
    ],
    Justificativas_Faltas: [
      { color: '#d9ead3', headers: ['ID_JUSTIFICATIVA', 'PERIODO', 'CODIGO_ATIVIDADE', 'ID_ATIVIDADE', 'RGA', 'NOME_MEMBRO', 'STATUS_ANALISE', 'DECISAO_APLICADA_NA_PRESENCA'] },
      { color: '#d0e0e3', headers: ['DATA_ATIVIDADE', 'DATA_LIMITE_JUSTIFICATIVA', 'DATA_ENVIO', 'DATA_ANALISE'] },
      { color: '#fff2cc', headers: ['MOTIVO_DECLARADO', 'POSSUI_DOCUMENTO_COMPROBATORIO', 'LINK_DOCUMENTO_COMPROBATORIO'] },
      { color: '#fce5cd', headers: ['DESCRICAO_JUSTIFICATIVA', 'ANALISADO_POR', 'VALOR_ANTES', 'VALOR_DEPOIS', 'OBSERVACOES'] }
    ],
    META: [
      { color: '#d9ead3', headers: ['PERIODO_ID', 'ARQUIVADO_EM', 'VERSAO_MODULO'] },
      { color: '#d0e0e3', headers: ['ORIGEM_PLANILHA_ID', 'ORIGEM_PLANILHA_NOME'] },
      { color: '#fce5cd', headers: ['ABA_ATIVIDADES_PERIODO', 'ABA_PRESENCAS_PERIODO', 'OBSERVACOES'] }
    ],
    PERIODO_Atividades: [
      { color: '#d9ead3', headers: ['COD_ATIVIDADE_PERIODO', 'COLUNA_PRESENCA', 'ID_ATIVIDADE', 'CLASSIFICACAO_REUNIAO'] }
    ],
    PERIODO_Presencas: [
      { color: '#d9ead3', headers: ['RGA', 'NOME_MEMBRO', 'EMAIL', 'CARGO_FUNCAO_ATUAL', 'STATUS_CADASTRAL', 'STATUS_NO_PERIODO'] },
      { color: '#d0e0e3', headers: ['DATA_ENTRADA_NO_PERIODO', 'DATA_SAIDA_NO_PERIODO', 'MOTIVO_ALTERACAO_NO_PERIODO', 'OBS_EVENTO_PERIODO'] }
    ]
  };
}

function atividades_applyPresenceMetadataValidation_(sheet) {
  var headerMap = GEAPA_CORE.coreHeaderMap(sheet, 1);
  var maxRows = Math.max(sheet.getMaxRows() - 1, 1);

  ATIVIDADES_CFG.PRESENCAS.BASE_HEADERS.forEach(function(header) {
    var col = GEAPA_CORE.coreGetCol(headerMap, header);
    if (!col) return;
    sheet.getRange(2, col, maxRows, 1).clearDataValidations();
  });

  var rules = {
    STATUS_NO_PERIODO: {
      values: ATIVIDADES_CFG.ENUMS.STATUS_NO_PERIODO,
      helpText: 'Situacao historica do membro no periodo.'
    },
    MOTIVO_ALTERACAO_NO_PERIODO: {
      values: ATIVIDADES_CFG.ENUMS.MOTIVO_ALTERACAO_NO_PERIODO,
      helpText: 'Motivo historico da alteracao do vinculo no periodo.'
    }
  };

  GEAPA_CORE.coreApplyDropdownValidationByHeader(sheet, rules, 1, {});
}

function atividades_applyPresenceDynamicValidation_(sheet) {
  var headerMap = GEAPA_CORE.coreHeaderMap(sheet, 1);
  var firstDynamicCol = ATIVIDADES_CFG.PRESENCAS.BASE_HEADERS.length + 1;
  var firstSummaryCol = 0;

  ATIVIDADES_CFG.PRESENCAS.SUMMARY_HEADERS.forEach(function(header) {
    var col = GEAPA_CORE.coreGetCol(headerMap, header);
    if (col && (!firstSummaryCol || col < firstSummaryCol)) {
      firstSummaryCol = col;
    }
  });

  if (!firstSummaryCol || firstSummaryCol <= firstDynamicCol) return 0;

  var totalDynamicCols = firstSummaryCol - firstDynamicCol;
  if (totalDynamicCols <= 0) return 0;

  var validation = SpreadsheetApp.newDataValidation()
    .requireValueInList(ATIVIDADES_CFG.ENUMS.PRESENCA_VALORES, true)
    .setAllowInvalid(true)
    .setHelpText('Valores aceitos: P, R, F, J, A ou N/A.')
    .build();

  sheet.getRange(2, firstDynamicCol, Math.max(sheet.getMaxRows() - 1, 1), totalDynamicCols)
    .setDataValidation(validation);

  for (var col = firstDynamicCol; col < firstSummaryCol; col++) {
    sheet.getRange(1, col).setNote(
      'Coluna dinamica de presenca oficial do periodo. Valores aceitos: P, R, F, J, A ou N/A.'
    );
  }

  return totalDynamicCols;
}

function atividades_applySheetUx_(sheet, logicalName) {
  var notesBySheet = atividades_buildHeaderNotes_();
  var colorsBySheet = atividades_buildHeaderColors_();
  var rulesBySheet = atividades_buildDropdownRules_();
  var currentLogicalName = logicalName || sheet.getName();

  GEAPA_CORE.coreFreezeHeaderRow(sheet, 1);
  GEAPA_CORE.coreEnsureFilter(sheet, 1, { recreate: true });
  GEAPA_CORE.coreApplyHeaderNotes(sheet, notesBySheet[currentLogicalName] || {}, 1);
  GEAPA_CORE.coreApplyHeaderColors(sheet, colorsBySheet[currentLogicalName] || [], 1, {
    defaultColor: '#f3f3f3'
  });
  GEAPA_CORE.coreApplyDropdownValidationByHeader(sheet, rulesBySheet[currentLogicalName] || {}, 1, {});

  if (currentLogicalName === ATIVIDADES_CFG.DYNAMIC_SHEET_PROFILES.PERIODO_PRESENCAS ||
      sheet.getName().indexOf(ATIVIDADES_CFG.DYNAMIC_SHEET_PREFIXES.PERIODO_PRESENCAS) === 0) {
    atividades_applyPresenceMetadataValidation_(sheet);
    atividades_applyPresenceDynamicValidation_(sheet);
  }
}

function atividades_aplicarUxPlanilhas_() {
  atividades_garantirEstruturasFixasV1_();

  var fixed = [
    { sheet: atividades_getAtividadesSheet_(), logicalName: 'Atividades' },
    { sheet: atividades_getApresentacoesSheet_(), logicalName: 'Atividades_Apresentacoes' },
    { sheet: atividades_getConvidadosSheet_(), logicalName: 'Atividade_Convidados' },
    { sheet: atividades_getConfigSheet_(), logicalName: 'Atividades_Config' },
    { sheet: atividades_getJustificativasFaltasSheet_(), logicalName: 'Justificativas_Faltas' },
    { sheet: atividades_getLogSheet_(), logicalName: 'Atividades_Log' }
  ];

  fixed.forEach(function(entry) {
    atividades_applySheetUx_(entry.sheet, entry.logicalName);
  });

  var ctx = atividades_getCurrentPeriodContext_();
  var operational = atividades_getOperationalHolder_().spreadsheet;
  var dynamicAtividades = atividades_findSheetByName_(operational, ctx.activitySheetName);
  var dynamicPresencas = atividades_findSheetByName_(operational, ctx.presenceSheetName);

  if (dynamicAtividades) {
    atividades_applySheetUx_(dynamicAtividades, ATIVIDADES_CFG.DYNAMIC_SHEET_PROFILES.PERIODO_ATIVIDADES);
  }

  if (dynamicPresencas) {
    atividades_applySheetUx_(dynamicPresencas, ATIVIDADES_CFG.DYNAMIC_SHEET_PROFILES.PERIODO_PRESENCAS);
  }

  return {
    ok: true,
    periodCode: ctx.code,
    dynamicSheets: {
      atividades: !!dynamicAtividades,
      presencas: !!dynamicPresencas
    }
  };
}
