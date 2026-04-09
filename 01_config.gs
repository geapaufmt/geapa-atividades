/**
 * Configuracoes centrais do modulo GEAPA Atividades.
 */

var ATIVIDADES_CFG = Object.freeze({
  MODULE_CODE: 'ATIVIDADES',
  MODULE_NAME: 'GEAPA Atividades',
  MODULE_VERSION: 'V1',
  HEADER_ROW: 1,
  DATE_FORMAT: 'dd/MM/yyyy',
  PERIOD_COLUMN_DATE_FORMAT: 'dd-MM',
  ACTIVITY_ID_DATE_TOKEN_FORMAT: 'yyyyMMdd',
  ACTIVITY_ID_PREFIX: 'ATV-',
  ACTIVITY_ID_PAD_LENGTH: 4,
  JUSTIFICATIVA_ID_PREFIX: 'JUS-',
  JUSTIFICATIVA_ID_PAD_LENGTH: 5,
  JUSTIFICATIVA_FORM_URL: 'https://docs.google.com/forms/d/e/1FAIpQLSc3s2PXBLSwcjahOVLHJGkMS853A7IKwxxDpiGQJXe1nRT3TQ/viewform?usp=publish-editor',

  FIXED_SHEETS: Object.freeze({
    ATIVIDADES: Object.freeze({
      preferredKeys: Object.freeze(['ATIVIDADES_GERAL']),
      sheetNames: Object.freeze(['Atividades'])
    }),
    APRESENTACOES: Object.freeze({
      preferredKeys: Object.freeze(['ATIVIDADES_APRESENTACOES']),
      sheetNames: Object.freeze(['Atividades_Apresentacoes'])
    }),
    CONVIDADOS: Object.freeze({
      preferredKeys: Object.freeze(['ATIVIDADES_CONVIDADOS']),
      sheetNames: Object.freeze(['Atividade_Convidados'])
    }),
    CONFIG: Object.freeze({
      preferredKeys: Object.freeze(['ATIVIDADES_CONFIG']),
      sheetNames: Object.freeze(['Atividades_Config'])
    }),
    JUSTIFICATIVAS: Object.freeze({
      preferredKeys: Object.freeze([]),
      sheetNames: Object.freeze(['Justificativas_Faltas']),
      sameSpreadsheetAsOperational: true
    }),
    LOG: Object.freeze({
      preferredKeys: Object.freeze(['ATIVIDADES_LOG']),
      sheetNames: Object.freeze(['Atividades_Log'])
    }),
    EXTERNOS_BASE: Object.freeze({
      preferredKeys: Object.freeze(['PARTICIPANTES_EXTERNOS_BASE']),
      sheetNames: Object.freeze(['Participantes_Externos'])
    }),
    EXTERNOS_FORM: Object.freeze({
      preferredKeys: Object.freeze(['PARTICIPANTES_EXTERNOS_FORM']),
      sheetNames: Object.freeze(['Cadastro de Participantes Externos (respostas)'])
    }),
    JUSTIFICATIVAS_FORM: Object.freeze({
      preferredKeys: Object.freeze([
        'JUSTIFICATIVAS_FALTAS_FORM',
        'JUSTIFICATIVAS_FORM',
        'JUSTIFICATIVA_FALTA_FORM'
      ]),
      sheetNames: Object.freeze([
        'JUSTIFICATIVA DE FALTA - GEAPA (respostas)',
        'Respostas ao formulário 1',
        'Respostas do formulário 1'
      ]),
      keyTokens: Object.freeze(['JUSTIFICAT', 'FALTA'])
    })
  }),

  STABLE_KEYS: Object.freeze({
    MEMBERS: 'MEMBERS_ATUAIS',
    PROFS: 'PROFS_BASE',
    PERIODS: 'VIGENCIA_PERIODOS',
    SEMESTERS: 'VIGENCIA_SEMESTRES',
    MEMBER_LIFECYCLE_EVENTS: 'MEMBER_EVENTOS_VINCULO'
  }),

  HISTORY_DISCOVERY: Object.freeze({
    preferredKeys: Object.freeze([
      'ATIVIDADES_HISTORICO',
      'ATIVIDADES_HISTORICO_GERAL'
    ]),
    keyTokens: Object.freeze(['ATIVIDADES', 'HISTORICO'])
  }),

  HISTORY_ARCHIVE: Object.freeze({
    FOLDER_NAME: 'HISTORICO DE ATIVIDADES',
    SPREADSHEET_NAME_PREFIX: 'ATIVIDADES INTERNAS GEAPA - ',
    META_SHEET_NAME: 'META'
  }),

  DYNAMIC_SHEET_PREFIXES: Object.freeze({
    PERIODO_ATIVIDADES: 'Atividades_Periodo_',
    PERIODO_PRESENCAS: 'Presencas_'
  }),

  DYNAMIC_SHEET_PROFILES: Object.freeze({
    PERIODO_ATIVIDADES: 'PERIODO_Atividades',
    PERIODO_PRESENCAS: 'PERIODO_Presencas'
  }),

  ARCHIVE: Object.freeze({
    STRATEGY: 'DELETE',
    HIDDEN_PREFIX: 'ARQUIVADO__'
  }),

  PERIOD_HEADER_ALIASES: Object.freeze({
    id: Object.freeze(['ID_Periodo', 'ID Periodo', 'ID_PERIODO', 'Periodo', 'Periodo_ID']),
    start: Object.freeze(['Inicio', 'Data_Inicio', 'Inicio_Periodo', 'Data Inicio']),
    end: Object.freeze(['Fim', 'Data_Fim', 'Fim_Periodo', 'Data Fim']),
    status: Object.freeze(['Status', 'STATUS']),
    displayName: Object.freeze(['Nome', 'Nome_Periodo', 'Descricao', 'Descricao_Periodo'])
  }),

  ENUMS: Object.freeze({
    SIM_NAO: Object.freeze(['SIM', 'NAO']),
    CLASSIFICACAO_REUNIAO: Object.freeze([
      'ORDINARIA',
      'EXTRAORDINARIA',
      'DIRETORIA'
    ]),
    TIPO_ATIVIDADE: Object.freeze([
      'ACADEMICA',
      'ORGANIZACIONAL',
      'ESTRATEGICA',
      'INTERNA',
      'DELIBERATIVA',
      'OUTRA'
    ]),
    SUBTIPO_ATIVIDADE: Object.freeze([
      'SEM_SUBTIPO',
      'APRESENTACAO_MEMBRO',
      'APRESENTACAO_REPOSICAO',
      'PALESTRA',
      'VISITA_TECNICA',
      'DINAMICA',
      'CURSO',
      'DEBATE',
      'ABERTURA_PERIODO',
      'FECHAMENTO_PERIODO',
      'MARCO_INSTITUCIONAL'
    ]),
    CLASSIFICACAO_ACESSO: Object.freeze([
      'ABERTA',
      'RESTRITA_MEMBROS',
      'RESTRITA_DIRETORIA',
      'RESTRITA_CONVIDADOS'
    ]),
    FORMATO: Object.freeze([
      'PRESENCIAL',
      'ONLINE',
      'HIBRIDO'
    ]),
    STATUS_ATIVIDADE: Object.freeze([
      'PLANEJADA',
      'CONFIRMADA',
      'REALIZADA',
      'CANCELADA',
      'ARQUIVADA'
    ]),
    TIPO_VINCULO_PESSOA: Object.freeze([
      'MEMBRO',
      'PROFESSOR',
      'PARTICIPANTE_EXTERNO',
      'CONVIDADO_ESPECIFICO'
    ]),
    PAPEL_NA_ATIVIDADE: Object.freeze([
      'CONVIDADO',
      'PALESTRANTE',
      'OUVINTE',
      'MEDIADOR',
      'APOIO'
    ]),
    STATUS_APRESENTACAO: Object.freeze([
      'PLANEJADA',
      'AGENDADA',
      'CONFIRMADA',
      'REALIZADA',
      'CANCELADA'
    ]),
    STATUS_ARQUIVO: Object.freeze([
      'PENDENTE',
      'SOLICITADO',
      'RECEBIDO'
    ]),
    STATUS_NO_PERIODO: Object.freeze([
      'ATIVO_DESDE_INICIO',
      'ENTRADA_POSTERIOR',
      'DESLIGADO_NO_PERIODO',
      'SUSPENSO_NO_PERIODO'
    ]),
    MOTIVO_ALTERACAO_NO_PERIODO: Object.freeze([
      'SEM_ALTERACAO',
      'INGRESSO_NO_PERIODO',
      'DESLIGAMENTO_VOLUNTARIO',
      'DESLIGAMENTO_POR_FALTAS',
      'DESLIGAMENTO_ADMINISTRATIVO',
      'SUSPENSAO',
      'RETORNO'
    ]),
    MEMBER_EVENT_TIPO: Object.freeze([
      'INGRESSO',
      'DESLIGAMENTO_VOLUNTARIO',
      'DESLIGAMENTO_POR_FALTAS',
      'DESLIGAMENTO_ADMINISTRATIVO',
      'SUSPENSAO',
      'RETORNO'
    ]),
    MEMBER_EVENT_STATUS: Object.freeze([
      'REGISTRADO',
      'HOMOLOGADO',
      'CANCELADO',
      'PROCESSADO_ATIVIDADES',
      'PROCESSADO_MEMBROS'
    ]),
    PRESENCA_VALORES: Object.freeze(['P', 'R', 'F', 'J', 'A', 'N/A']),
    STATUS_ANALISE_JUSTIFICATIVA: Object.freeze([
      'PENDENTE',
      'DEFERIDA',
      'INDEFERIDA'
    ]),
    DECISAO_APLICADA_PRESENCA: Object.freeze([
      'NAO_APLICADA',
      'F_MANTIDA',
      'F_PARA_J',
      'J_PARA_A'
    ]),
    MOTIVO_AUSENCIA: Object.freeze([
      'SAUDE',
      'COMPROMISSO_ACADEMICO',
      'COMPROMISSO_PROFISSIONAL',
      'MOTIVO_PESSOAL_RELEVANTE',
      'FORCA_MAIOR',
      'OUTRO'
    ])
  }),

  PRESENCAS: Object.freeze({
    BASE_HEADERS: Object.freeze([
      'RGA',
      'NOME_MEMBRO',
      'EMAIL',
      'CARGO_FUNCAO_ATUAL',
      'STATUS_CADASTRAL',
      'STATUS_NO_PERIODO',
      'DATA_ENTRADA_NO_PERIODO',
      'DATA_SAIDA_NO_PERIODO',
      'MOTIVO_ALTERACAO_NO_PERIODO',
      'OBS_EVENTO_PERIODO'
    ]),
    SUMMARY_HEADERS: Object.freeze([
      'TOTAL_PRESENCAS',
      'TOTAL_FALTAS',
      'TOTAL_JUSTIFICADAS',
      'PERCENTUAL_FREQUENCIA',
      'OBSERVACOES'
    ])
  }),

  JUSTIFICATIVAS: Object.freeze({
    DEFAULT_ANALYSIS_STATUS: 'PENDENTE',
    DEFAULT_DECISION_STATUS: 'NAO_APLICADA',
    NOTIFICATION_WINDOW_HOURS: 48
  }),

  JUSTIFICATIVAS_FORM_FIELDS: Object.freeze({
    dataEnvio: Object.freeze(['Carimbo de data/hora', 'Timestamp', 'DATA_ENVIO', 'Data de envio']),
    nomeCompleto: Object.freeze(['NOME_COMPLETO', 'Nome completo', 'Nome Completo']),
    rga: Object.freeze(['RGA']),
    codigoAtividade: Object.freeze(['CODIGO_ATIVIDADE', 'Codigo atividade', 'Código da atividade']),
    motivoAusencia: Object.freeze(['MOTIVO_AUSENCIA', 'Motivo da ausencia', 'Motivo da ausência']),
    descricaoJustificativa: Object.freeze(['DESCRICAO_JUSTIFICATIVA', 'Descricao justificativa', 'Descrição da justificativa']),
    possuiDocumento: Object.freeze(['POSSUI_DOCUMENTO_COMPROBATORIO', 'Possui documento comprobatorio', 'Possui documento comprobatório']),
    linkDocumento: Object.freeze(['LINK_DOCUMENTO_COMPROBATORIO', 'Link documento comprobatorio', 'Link do documento comprobatório']),
    observacoes: Object.freeze(['OBSERVACOES_ADICIONAIS', 'Observacoes adicionais', 'Observações adicionais'])
  }),

  JUSTIFICATIVAS_STATUS_FINAIS: Object.freeze({
    DEFERIDA: 'DEFERIDA',
    INDEFERIDA: 'INDEFERIDA'
  }),

  JUSTIFICATIVAS_LOG_TYPES: Object.freeze({
    AVISO_FALTA: 'AVISO_FALTA',
    IMPORT_JUSTIFICATIVA: 'IMPORT_JUSTIFICATIVA',
    APLICACAO_JUSTIFICATIVA: 'APLICACAO_JUSTIFICATIVA',
    ABONO_JUSTIFICATIVA: 'ABONO_JUSTIFICATIVA',
    RESULTADO_JUSTIFICATIVA: 'RESULTADO_JUSTIFICATIVA'
  }),

  CONFIG_INHERITED_HEADERS: Object.freeze([
    'CLASSIFICACAO_REUNIAO',
    'TIPO_ATIVIDADE',
    'SUBTIPO_ATIVIDADE',
    'CLASSIFICACAO_ACESSO',
    'EXIGE_CONVOCACAO',
    'EXIGE_LEMBRETE',
    'EXIGE_ATA',
    'EXIGE_MATERIAL',
    'EXIGE_LISTA_PRESENCA',
    'CONTA_PRESENCA',
    'CONTA_FALTA',
    'GERA_CERTIFICADO'
  ])
});
