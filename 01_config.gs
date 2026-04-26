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
  APRESENTACAO_ID_PREFIX: 'APR-',
  APRESENTACAO_ID_PAD_LENGTH: 4,
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
      preferredKeys: Object.freeze(['PESSOAS_EXTERNAS_BASE', 'PARTICIPANTES_EXTERNOS_BASE']),
      sheetNames: Object.freeze(['Participantes Externos', 'Participantes_Externos'])
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
    MEMBER_LIFECYCLE_EVENTS: 'MEMBER_EVENTOS_VINCULO',
    THEMATIC_AXES: 'EIXOS_TEMATICOS_OFICIAIS'
  }),

  HISTORY_DISCOVERY: Object.freeze({
    preferredKeys: Object.freeze([
      'ATIVIDADES_HISTORICO',
      'ATIVIDADES_HISTORICO_GERAL'
    ]),
    keyTokens: Object.freeze(['ATIVIDADES', 'HISTORICO'])
  }),

  HISTORY_PUBLIC_DISCOVERY: Object.freeze({
    preferredKeys: Object.freeze([
      'APRESENTACOES_HISTORICO_PUBLICO'
    ]),
    sheetNames: Object.freeze([
      'Histórico Público',
      'Historico Publico'
    ]),
    keyTokens: Object.freeze(['APRESENTACOES', 'HISTORICO', 'PUBLICO'])
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
    displayName: Object.freeze(['Nome', 'Nome_Periodo', 'Descricao', 'Descricao_Periodo']),
    plannedTotal: Object.freeze([
      'TOTAL_ATIVIDADES_QUE_CONTAM_FALTA_PLANEJADAS',
      'TOTAL_ATIVIDADES_QUE_CONTAM_FALTA_PLANEJADAS_NO_INICIO_DO_PERIODO',
      'TOTAL_ATIVIDADES_PLANEJADAS_COM_FALTA'
    ]),
    frozenLimit: Object.freeze([
      'LIMITE_FALTAS_PERIODO_CONGELADO',
      'LIMITE_FALTAS_PERIODO',
      'LIMITE_FALTAS_CONGELADO'
    ]),
    planningClosedAt: Object.freeze([
      'DATA_FECHAMENTO_PLANEJAMENTO',
      'DATA_FECHAMENTO_SNAPSHOT',
      'DATA_CONGELAMENTO_PLANEJAMENTO'
    ])
  }),

  SEMESTER_HEADER_ALIASES: Object.freeze({
    id: Object.freeze(['ID_Semestre', 'ID_Semestre', 'ID Semestre', 'Semestre']),
    start: Object.freeze(['Inicio', 'Início', 'Data_Inicio', 'Inicio_Semestre', 'Data Inicio']),
    end: Object.freeze(['Fim', 'Data_Fim', 'Fim_Semestre', 'Data Fim']),
    periodId: Object.freeze(['ID_Periodo', 'ID_Período', 'Periodo', 'Periodo_ID'])
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
      'APROVADA',
      'REALIZADA',
      'CANCELADA'
    ]),
    STATUS_ARQUIVO: Object.freeze([
      'PENDENTE',
      'SOLICITADO',
      'RECEBIDO'
    ]),
    CATEGORIA_PUBLICO_EXTERNO: Object.freeze([
      'MEMBRO_COMUNIDADE_EXTERNA',
      'ESTUDANTE_EXTERNO',
      'PROFISSIONAL_EXTERNO',
      'DOCENTE_EXTERNO',
      'EGRESSO',
      'PARCEIRO_INSTITUCIONAL',
      'OUTRO'
    ]),
    RELACAO_COM_GEAPA: Object.freeze([
      'PARTICIPANTE_EXTERNO_INTERESSADO',
      'PALESTRANTE_POTENCIAL',
      'CONVIDADO_RECURRENTE',
      'PARCEIRO_INSTITUCIONAL',
      'APOIO_EVENTUAL',
      'SEM_RELACAO_DEFINIDA'
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
    ]),
    SITUACAO_DISCIPLINAR: Object.freeze([
      'NORMAL',
      'ALERTA_60',
      'ALERTA_80',
      'LIMITE_ATINGIDO'
    ])
  }),

  PRESENCAS: Object.freeze({
    OCCUPATION_LEGACY_HEADER: 'CARGO_FUNCAO_ATUAL',
    OCCUPATION_COMPAT_HEADERS: Object.freeze([
      'Ocupação atual',
      'Ocupacao atual',
      'Ocupação',
      'Ocupacao',
      'OCUPACAO_ATUAL',
      'OCUPACAO',
      'Cargo/Função atual',
      'Cargo/Funcao atual',
      'Cargo/funcao atual',
      'Cargo/Funçao atual',
      'Cargo/Função',
      'Cargo/Funcao',
      'Cargo/funcao',
      'CARGO_FUNCAO_ATUAL'
    ]),
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
      'OBS_EVENTO_PERIODO',
      'PREVISAO_APRESENTACAO_NO_PERIODO'
    ]),
    DISCIPLINARY_HEADERS: Object.freeze([
      'TOTAL_ATIVIDADES_QUE_CONTAM_FALTA',
      'LIMITE_FALTAS_PERIODO',
      'FALTAS_LIQUIDAS',
      'PERCENTUAL_USO_LIMITE',
      'SITUACAO_DISCIPLINAR'
    ]),
    SUMMARY_HEADERS: Object.freeze([
      'TOTAL_PRESENCAS',
      'TOTAL_FALTAS',
      'TOTAL_JUSTIFICADAS',
      'PERCENTUAL_FREQUENCIA',
      'TOTAL_ATIVIDADES_QUE_CONTAM_FALTA',
      'LIMITE_FALTAS_PERIODO',
      'FALTAS_LIQUIDAS',
      'PERCENTUAL_USO_LIMITE',
      'SITUACAO_DISCIPLINAR',
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

  APRESENTACOES_STATUS_TO_ATIVIDADE: Object.freeze({
    PLANEJADA: 'PLANEJADA',
    AGENDADA: 'PLANEJADA',
    CONFIRMADA: 'PLANEJADA',
    APROVADA: 'CONFIRMADA',
    REALIZADA: 'REALIZADA',
    CANCELADA: 'CANCELADA'
  }),

  APRESENTACOES_JOB: Object.freeze({
    STATUS_NOTIFICAR_AGENDAMENTO: 'AGENDADA',
    STATUS_COBRAR_TITULO_EIXO: 'AGENDADA',
    STATUS_CONVIDAR_PROFESSORES: Object.freeze(['APROVADA']),
    STATUS_CONVIDAR_EXTERNOS: Object.freeze(['APROVADA']),
    TITULO_EIXO_DIAS_ANTES_MIN: 1,
    TITULO_EIXO_DIAS_ANTES_MAX: 4,
    TITULO_EIXO_INBOX_SUBJECT: 'GEAPA | Envio de título e eixo da apresentação'
  }),

  APRESENTACOES_POS_EVENTO: Object.freeze({
    STATUS_COBRAR_ARQUIVO: 'REALIZADA',
    ARQUIVO_INBOX_SUBJECT: 'GEAPA | Envio do arquivo da apresentação em PDF',
    INBOX_INGEST_DAYS: 15,
    INBOX_INGEST_MAX_THREADS: 12,
    INBOX_INGEST_MAX_MESSAGES_PER_THREAD: 6,
    JANELA_COBRANCA_HORAS: 72,
    PRIMEIRA_COBRANCA_HORA: 22,
    PRIMEIRA_COBRANCA_MINUTO: 0,
    THREAD_LABEL_PROCESSADA: 'GEAPA/ArquivoApresentacaoProcessado',
    ROOT_FOLDER_KEYS: Object.freeze([
      'APRESENTACOES_PASTA_RAIZ',
      'PASTA_RAIZ_APRESENTACOES'
    ]),
    UPLOAD_FOTOS_FOLDER_KEYS: Object.freeze([
      'APRESENTACOES_UPLOAD_FOTOS',
      'PASTA_UPLOAD_FOTOS_APRESENTACOES'
    ])
  }),

  APRESENTACOES_MEMBERS_SUMMARY: Object.freeze({
    CUTOFF_PERIOD_ID: 'GEAPA_2026',
    CUTOFF_SEMESTER_ID: '2026/1'
  }),

  APRESENTACOES_LOG_TYPES: Object.freeze({
    UPSERT_APRESENTACAO: 'UPSERT_APRESENTACAO',
    REFLEXO_STATUS_APRESENTACAO: 'REFLEXO_STATUS_APRESENTACAO',
    NOTIFICACAO_AGENDAMENTO_MEMBRO: 'NOTIFICACAO_AGENDAMENTO_MEMBRO',
    COBRANCA_TITULO_EIXO_APRESENTACAO: 'COBRANCA_TITULO_EIXO_APRESENTACAO',
    INBOX_TITULO_EIXO_APRESENTACAO: 'INBOX_TITULO_EIXO_APRESENTACAO',
    NOTIFICACAO_SECRETARIOS_APRESENTACAO: 'NOTIFICACAO_SECRETARIOS_APRESENTACAO',
    UPSERT_PROFESSORES_APRESENTACAO: 'UPSERT_PROFESSORES_APRESENTACAO',
    CONVITE_PROFESSORES_APRESENTACAO: 'CONVITE_PROFESSORES_APRESENTACAO',
    UPSERT_EXTERNOS_APRESENTACAO: 'UPSERT_EXTERNOS_APRESENTACAO',
    CONVITE_EXTERNOS_APRESENTACAO: 'CONVITE_EXTERNOS_APRESENTACAO',
    LEMBRETE_MEMBROS_APRESENTACAO: 'LEMBRETE_MEMBROS_APRESENTACAO',
    AUTO_REALIZADA_APRESENTACAO: 'AUTO_REALIZADA_APRESENTACAO',
    COBRANCA_ARQUIVO_APRESENTACAO: 'COBRANCA_ARQUIVO_APRESENTACAO',
    INBOX_ARQUIVO_APRESENTACAO: 'INBOX_ARQUIVO_APRESENTACAO',
    FOTOS_PENDENTES_APRESENTACAO: 'FOTOS_PENDENTES_APRESENTACAO',
    SYNC_HISTORICO_PUBLICO_APRESENTACAO: 'SYNC_HISTORICO_PUBLICO_APRESENTACAO',
    RESUMO_MEMBERS_APRESENTACAO: 'RESUMO_MEMBERS_APRESENTACAO'
  }),

  DISCIPLINA: Object.freeze({
    LIMIT_PERCENTAGE: 0.20,
    ALERT_60: 0.60,
    ALERT_80: 0.80,
    LIMIT_ATINGIDO: 1.0
  }),

  DISCIPLINA_LOG_TYPES: Object.freeze({
    ALERTA_60: 'DISCIPLINA_ALERTA_60',
    ALERTA_80: 'DISCIPLINA_ALERTA_80',
    LIMITE_ATINGIDO: 'DISCIPLINA_LIMITE_ATINGIDO'
  }),

  DISCIPLINA_NOTIFICACOES: Object.freeze({
    FLOW_CODE: 'DISC',
    STAGE_ALERTA_60: 'AL60',
    STAGE_ALERTA_80: 'AL80',
    SUBJECT_ALERTA_60: 'Alerta disciplinar: 60% do limite de faltas no GEAPA',
    SUBJECT_ALERTA_80: 'Alerta disciplinar: 80% do limite de faltas no GEAPA'
  }),

  DISCIPLINA_NOTIFICACAO_LOG_TYPES: Object.freeze({
    RESUMO: 'DISCIPLINA_EMAIL_ALERTA',
    ALERTA_60: 'DISCIPLINA_EMAIL_ALERTA_60',
    ALERTA_80: 'DISCIPLINA_EMAIL_ALERTA_80'
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
  ]),

  PLANNING: Object.freeze({
    BASE_DEFAULT: 'SIM',
    PERIOD_SYNC_STATUSES: Object.freeze(['CONFIRMADA', 'REALIZADA'])
  })
});
