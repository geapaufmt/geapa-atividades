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
      EXIGE_CONFIRMACAO_PRESENCA: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Se SIM, solicita confirmacao de presenca aos convidados vinculados.' },
      EXIGE_ATA: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Campo herdado do config na V1.' },
      EXIGE_MATERIAL: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Campo herdado do config na V1.' },
      EXIGE_LISTA_PRESENCA: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Campo herdado do config na V1.' },
      CONTA_PRESENCA: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Se SIM, gera coluna oficial na presenca do periodo.' },
      CONTA_FALTA: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Se SIM, pode contabilizar falta oficial.' },
      BASE_PLANEJAMENTO_INICIAL: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Indica se a atividade integrou a base oficial usada para congelar o limite de faltas do periodo.' },
      GERA_CERTIFICADO: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Reservado para fluxos posteriores.' },
      STATUS: { values: ATIVIDADES_CFG.ENUMS.STATUS_ATIVIDADE, helpText: 'Status operacional atual.' }
    },

    Atividades_Apresentacoes: {
      STATUS_APRESENTACAO: { values: ATIVIDADES_CFG.ENUMS.STATUS_APRESENTACAO, helpText: 'Estado operacional da apresentacao.' },
      NOTIFICACAO_AGENDAMENTO_ENVIADA: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Controle de notificacao de agendamento ao membro.' },
      NOTIFICACAO_SECRETARIOS_ENVIADA: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Controle de aviso aos secretarios.' },
      CONVITE_PROFESSORES_ENVIADO: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Controle de convite a professores.' },
      CONVITE_EXTERNOS_ENVIADO: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Controle de convite a participantes externos.' },
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
      EXIGE_CONFIRMACAO_PRESENCA: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Regra padrao de solicitacao de confirmacao aos convidados.' },
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
    },

    Eixos: {
      ATIVO: {
        values: ATIVIDADES_CFG.ENUMS.SIM_NAO,
        helpText: 'Se NAO, o eixo deixa de ser considerado pelas automacoes e validacoes.'
      }
    },

    'Participantes Externos': {
      CATEGORIA_PUBLICO: {
        values: ATIVIDADES_CFG.ENUMS.CATEGORIA_PUBLICO_EXTERNO,
        helpText: 'Classifica o tipo de publico externo ao qual a pessoa pertence.'
      },
      RELACAO_COM_GEAPA: {
        values: ATIVIDADES_CFG.ENUMS.RELACAO_COM_GEAPA,
        helpText: 'Descreve como essa pessoa se relaciona hoje com o GEAPA.'
      },
      RECEBE_COMUNICADOS_GERAIS: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Indica se recebe comunicados gerais do GEAPA.' },
      RECEBE_REUNIOES_ABERTAS: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Indica se deseja receber avisos de reunioes abertas.' },
      RECEBE_APRESENTACOES_ALUNOS: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Indica se deseja receber convites de apresentacoes de membros.' },
      ATIVO: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Se NAO, o cadastro nao deve ser usado nas automacoes.' }
    },

    Participantes_Externos: {
      CATEGORIA_PUBLICO: {
        values: ATIVIDADES_CFG.ENUMS.CATEGORIA_PUBLICO_EXTERNO,
        helpText: 'Classifica o tipo de publico externo ao qual a pessoa pertence.'
      },
      RELACAO_COM_GEAPA: {
        values: ATIVIDADES_CFG.ENUMS.RELACAO_COM_GEAPA,
        helpText: 'Descreve como essa pessoa se relaciona hoje com o GEAPA.'
      },
      RECEBE_COMUNICADOS_GERAIS: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Indica se recebe comunicados gerais do GEAPA.' },
      RECEBE_REUNIOES_ABERTAS: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Indica se deseja receber avisos de reunioes abertas.' },
      RECEBE_APRESENTACOES_ALUNOS: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Indica se deseja receber convites de apresentacoes de membros.' },
      ATIVO: { values: ATIVIDADES_CFG.ENUMS.SIM_NAO, helpText: 'Se NAO, o cadastro nao deve ser usado nas automacoes.' }
    }
  };
}

function atividades_buildHeaderNotes_() {
  return {
    Atividades: {
      ID_ATIVIDADE: 'Identificador unico da atividade no formato ATV-0001. E gerado automaticamente quando a linha fica elegivel.',
      CLASSIFICACAO_REUNIAO: 'Use apenas para atividades de reuniao do grupo: ORDINARIA ou EXTRAORDINARIA.',
      TIPO_ATIVIDADE: 'Tipo institucional principal da atividade: ACADEMICA, ORGANIZACIONAL, INTERNA ou OUTRA.',
      SUBTIPO_ATIVIDADE: 'Subtipo operacional especifico da atividade, como APRESENTACAO_MEMBRO, PALESTRA, CURSO, ABERTURA_PERIODO, FECHAMENTO_PERIODO ou MARCO_INSTITUCIONAL.',
      CLASSIFICACAO_ACESSO: 'Define se a atividade e aberta ou restrita.',
      TITULO: 'Titulo humano da atividade.',
      DATA_ATIVIDADE: 'Data principal da atividade.',
      PERIODO_REFERENCIA: 'Codigo do periodo de referencia para planejamento, inclusive quando a data da atividade ainda nao estiver fechada.',
      FORMATO: 'PRESENCIAL, ONLINE ou HIBRIDO.',
      OBRIGATORIA: 'Marque SIM apenas quando houver obrigatoriedade formal.',
      CONTA_PRESENCA: 'Se SIM, gera coluna oficial em Presencas.',
      CONTA_FALTA: 'Se SIM, pode contabilizar falta oficial.',
      BASE_PLANEJAMENTO_INICIAL: 'Indica se a atividade integrou a base oficial usada para congelar o limite de faltas do periodo. Nao substitui o STATUS.',
      STATUS: 'Status operacional atual da atividade.',
      OBSERVACOES: 'Observacoes gerais da atividade.'
    },
    Atividades_Apresentacoes: {
      ID_APRESENTACAO: 'Identificador unico do registro de apresentacao.',
      ID_ATIVIDADE: 'Referencia para a atividade principal em Atividades.',
      RGA: 'Identificador oficial do membro apresentador.',
      PERIODO_REFERENCIA: 'Espelho do periodo de referencia da atividade geral.',
      DATA_ATIVIDADE: 'Espelho da data prevista/definida da atividade geral.',
      HORARIO_INICIO: 'Espelho do horario inicial da atividade geral.',
      HORARIO_FIM: 'Espelho do horario final da atividade geral.',
      LOCAL: 'Espelho do local da atividade geral.',
      FORMATO: 'Espelho do formato da atividade geral.',
      STATUS_APRESENTACAO: 'Estado operacional da apresentacao.',
      NOTIFICACAO_AGENDAMENTO_ENVIADA: 'Indica se o membro ja recebeu a notificacao de agendamento.',
      DATA_NOTIFICACAO_AGENDAMENTO: 'Data/hora em que a notificacao de agendamento foi registrada.',
      STATUS_ENVIO_ARQUIVO: 'Estado do recebimento do arquivo.'
    },
    Atividade_Convidados: {
      ID_CONVITE_ATIVIDADE: 'Identificador unico do vinculo da pessoa com a atividade.',
      ID_ATIVIDADE: 'Referencia para a atividade principal.',
      TIPO_VINCULO_PESSOA: 'Membro, professor, participante externo, ex-membro ou convidado especifico.',
      CONFIRMADO: 'Resposta do convidado sobre presenca: SIM, NAO ou vazio enquanto pendente.',
      DATA_ENVIO_CONFIRMACAO: 'Data/hora em que a solicitacao de confirmacao foi enviada.',
      DATA_CONFIRMACAO: 'Data/hora em que a resposta de confirmacao foi processada.'
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
      CARGO_FUNCAO_ATUAL: 'Ocupacao atual do membro no momento da sincronizacao.',
      OCUPACAO_ATUAL: 'Ocupacao atual do membro no momento da sincronizacao.',
      OCUPACAO: 'Ocupacao atual do membro no momento da sincronizacao.',
      STATUS_CADASTRAL: 'Status atual do vinculo institucional do membro.',
      STATUS_NO_PERIODO: 'Situacao historica do membro dentro do periodo especifico.',
      DATA_ENTRADA_NO_PERIODO: 'Data a partir da qual o membro passa a contar presenca/falta no periodo.',
      DATA_SAIDA_NO_PERIODO: 'Data a partir da qual o membro deixa de contar presenca/falta no periodo.',
      MOTIVO_ALTERACAO_NO_PERIODO: 'Motivo historico da entrada, desligamento, suspensao ou retorno no periodo.',
      OBS_EVENTO_PERIODO: 'Observacoes livres sobre o evento historico do periodo.',
      PREVISAO_APRESENTACAO_NO_PERIODO: 'Campo manual para indicar se o membro esta previsto para apresentar no periodo. O modulo preserva esse valor nas sincronizacoes.',
      APRESENTOU_NO_PERIODO: 'Campo calculado automaticamente a partir de Atividades_Apresentacoes com STATUS_APRESENTACAO = REALIZADA no periodo.',
      DATA_APRESENTACAO_NO_PERIODO: 'Data da apresentacao realizada pelo membro no periodo, calculada automaticamente a partir de Atividades_Apresentacoes.',
      TOTAL_PRESENCAS: 'Total de marcacoes P e R no periodo.',
      TOTAL_FALTAS: 'Total de faltas plenas mantidas como F no periodo.',
      TOTAL_JUSTIFICADAS: 'Total de marcacoes J e A no periodo.',
      PERCENTUAL_FREQUENCIA: 'Percentual calculado de frequencia.',
      TOTAL_ATIVIDADES_QUE_CONTAM_FALTA: 'Base normativa oficial do periodo para faltas, preferencialmente congelada em VIGENCIA_PERIODOS.',
      LIMITE_FALTAS_PERIODO: 'Limite oficial congelado do periodo, calculado com floor(20% do total planejado que conta falta).',
      FALTAS_LIQUIDAS: 'Total disciplinar de faltas liquidas, contando F e J e ignorando A.',
      PERCENTUAL_USO_LIMITE: 'Percentual de uso do limite oficial de faltas no periodo.',
      SITUACAO_DISCIPLINAR: 'Faixa disciplinar automatica do membro no periodo.'
    },
    Eixos: {
      ATIVO: 'Define se o eixo continua valido para uso nas automacoes e formulários.',
      ORDEM: 'Ordem oficial de exibicao e prioridade do eixo na interface e nas automacoes.',
      CODIGO_EIXO: 'Codigo tecnico estavel do eixo, recomendado para integracoes e mapeamentos internos.',
      NUMERAL_ROMANO: 'Numeral romano oficial do eixo, usado em exibicoes e interpretacao de respostas.',
      NOME_OFICIAL: 'Nome completo oficial do eixo, conforme a base institucional vigente.',
      NOME_CURTO: 'Versao resumida do nome, util para listas, chips e exibicoes compactas.',
      ROTULO_FORMULARIO: 'Rotulo canonico que deve aparecer em formularios, listas e mensagens ao usuario.',
      DESCRICAO_RESUMIDA: 'Resumo curto do escopo do eixo para automacoes, validacoes e ajuda contextual.',
      PALAVRAS_CHAVE: 'Palavras-chave separadas por ponto e virgula para busca, interpretacao e classificacao automatica.',
      DISCIPLINAS_RELACIONADAS: 'Disciplinas associadas ao eixo, em texto unico separado por ponto e virgula.',
      EXEMPLOS_TEMAS: 'Exemplos de temas compativeis com o eixo, em texto unico separado por ponto e virgula.',
      OBSERVACOES: 'Campo livre para observacoes operacionais ou institucionais sobre o eixo.',
      ATUALIZADO_EM: 'Data e hora da ultima atualizacao manual do registro.'
    },
    'Participantes Externos': {
      ID_PARTICIPANTE_EXTERNO: 'Identificador unico do participante externo.',
      NOME: 'Nome completo da pessoa cadastrada.',
      EMAIL: 'Email principal usado para comunicacao e convites.',
      TELEFONE: 'Telefone principal para contato, se houver.',
      INSTITUICAO: 'Instituicao, empresa ou organizacao vinculada.',
      CURSO_OU_AREA: 'Curso, area de atuacao ou campo principal de interesse.',
      CATEGORIA_PUBLICO: 'Classifica o publico externo em termos de perfil institucional ou profissional.',
      RELACAO_COM_GEAPA: 'Indica o tipo de relacao atual ou desejada com o GEAPA.',
      CIDADE: 'Cidade principal da pessoa.',
      UF: 'Unidade federativa principal.',
      ORIGEM_CONTATO: 'Canal pelo qual esse contato chegou ao GEAPA.',
      RECEBE_COMUNICADOS_GERAIS: 'Se SIM, pode receber comunicacoes gerais do GEAPA.',
      RECEBE_REUNIOES_ABERTAS: 'Se SIM, pode receber avisos de reunioes abertas.',
      RECEBE_APRESENTACOES_ALUNOS: 'Se SIM, entra no universo de interesse para convites de apresentacoes.',
      INTERESSE_EIXO_I: 'Interesse declarado no eixo I.',
      INTERESSE_EIXO_II: 'Interesse declarado no eixo II.',
      INTERESSE_EIXO_III: 'Interesse declarado no eixo III.',
      INTERESSE_EIXO_IV: 'Interesse declarado no eixo IV.',
      INTERESSE_EIXO_V: 'Interesse declarado no eixo V.',
      INTERESSE_EIXO_VI: 'Interesse declarado no eixo VI.',
      INTERESSE_EIXO_VII: 'Interesse declarado no eixo VII.',
      INTERESSE_EIXO_VIII: 'Interesse declarado no eixo VIII.',
      ATIVO: 'Se NAO, o cadastro nao deve ser usado pelas automacoes.',
      OBSERVACOES: 'Campo livre para observacoes operacionais.',
      CRIADO_EM: 'Data e hora de criacao do cadastro.',
      ATUALIZADO_EM: 'Data e hora da ultima atualizacao do cadastro.'
    },
    Participantes_Externos: {
      ID_PARTICIPANTE_EXTERNO: 'Identificador unico do participante externo.',
      NOME: 'Nome completo da pessoa cadastrada.',
      EMAIL: 'Email principal usado para comunicacao e convites.',
      TELEFONE: 'Telefone principal para contato, se houver.',
      INSTITUICAO: 'Instituicao, empresa ou organizacao vinculada.',
      CURSO_OU_AREA: 'Curso, area de atuacao ou campo principal de interesse.',
      CATEGORIA_PUBLICO: 'Classifica o publico externo em termos de perfil institucional ou profissional.',
      RELACAO_COM_GEAPA: 'Indica o tipo de relacao atual ou desejada com o GEAPA.',
      CIDADE: 'Cidade principal da pessoa.',
      UF: 'Unidade federativa principal.',
      ORIGEM_CONTATO: 'Canal pelo qual esse contato chegou ao GEAPA.',
      RECEBE_COMUNICADOS_GERAIS: 'Se SIM, pode receber comunicacoes gerais do GEAPA.',
      RECEBE_REUNIOES_ABERTAS: 'Se SIM, pode receber avisos de reunioes abertas.',
      RECEBE_APRESENTACOES_ALUNOS: 'Se SIM, entra no universo de interesse para convites de apresentacoes.',
      INTERESSE_EIXO_I: 'Interesse declarado no eixo I.',
      INTERESSE_EIXO_II: 'Interesse declarado no eixo II.',
      INTERESSE_EIXO_III: 'Interesse declarado no eixo III.',
      INTERESSE_EIXO_IV: 'Interesse declarado no eixo IV.',
      INTERESSE_EIXO_V: 'Interesse declarado no eixo V.',
      INTERESSE_EIXO_VI: 'Interesse declarado no eixo VI.',
      INTERESSE_EIXO_VII: 'Interesse declarado no eixo VII.',
      INTERESSE_EIXO_VIII: 'Interesse declarado no eixo VIII.',
      ATIVO: 'Se NAO, o cadastro nao deve ser usado pelas automacoes.',
      OBSERVACOES: 'Campo livre para observacoes operacionais.',
      CRIADO_EM: 'Data e hora de criacao do cadastro.',
      ATUALIZADO_EM: 'Data e hora da ultima atualizacao do cadastro.'
    }
  };
}

function atividades_buildHeaderColors_() {
  return {
    Atividades: [
      { color: '#d9ead3', headers: ['ID_ATIVIDADE', 'CLASSIFICACAO_REUNIAO', 'TIPO_ATIVIDADE', 'SUBTIPO_ATIVIDADE', 'CLASSIFICACAO_ACESSO', 'STATUS'] },
      { color: '#d0e0e3', headers: ['DATA_ATIVIDADE', 'PERIODO_REFERENCIA', 'HORARIO_INICIO', 'HORARIO_FIM', 'DATA_CONVOCACAO', 'DATA_LEMBRETE', 'DATA_REALIZACAO', 'CRIADO_EM', 'ATUALIZADO_EM'] },
      { color: '#fff2cc', headers: ['OBRIGATORIA', 'EXIGE_CONVOCACAO', 'EXIGE_LEMBRETE', 'EXIGE_CONFIRMACAO_PRESENCA', 'EXIGE_ATA', 'EXIGE_MATERIAL', 'EXIGE_LISTA_PRESENCA', 'CONTA_PRESENCA', 'CONTA_FALTA', 'BASE_PLANEJAMENTO_INICIAL', 'GERA_CERTIFICADO'] },
      { color: '#fce5cd', headers: ['TITULO', 'DESCRICAO', 'LOCAL', 'FORMATO', 'RESPONSAVEL_INTERNO', 'RESPONSAVEL_EMAIL', 'PUBLICO_ALVO', 'OBSERVACOES'] }
    ],
    Atividades_Apresentacoes: [
      { color: '#d9ead3', headers: ['ID_APRESENTACAO', 'ID_ATIVIDADE', 'RGA', 'NOME_MEMBRO', 'EMAIL_MEMBRO', 'STATUS_APRESENTACAO'] },
      { color: '#d0e0e3', headers: ['PERIODO_REFERENCIA', 'DATA_ATIVIDADE', 'HORARIO_INICIO', 'HORARIO_FIM', 'LOCAL', 'FORMATO', 'SEMESTRE_APRESENTACAO', 'DATA_NOTIFICACAO_AGENDAMENTO'] },
      { color: '#fff2cc', headers: ['NOTIFICACAO_AGENDAMENTO_ENVIADA', 'NOTIFICACAO_SECRETARIOS_ENVIADA', 'CONVITE_PROFESSORES_ENVIADO', 'CONVITE_EXTERNOS_ENVIADO', 'LEMBRETE_MEMBROS_ENVIADO', 'STATUS_ENVIO_ARQUIVO', 'SYNC_HISTORICO_PUBLICO'] }
    ],
    Atividade_Convidados: [
      { color: '#d9ead3', headers: ['ID_CONVITE_ATIVIDADE', 'ID_ATIVIDADE', 'TIPO_VINCULO_PESSOA', 'ID_REFERENCIA'] },
      { color: '#fce5cd', headers: ['NOME', 'EMAIL', 'PAPEL_NA_ATIVIDADE', 'OBSERVACOES'] }
    ],
    Atividades_Config: [
      { color: '#d9ead3', headers: ['ATIVO', 'CLASSIFICACAO_REUNIAO', 'TIPO_ATIVIDADE', 'SUBTIPO_ATIVIDADE', 'CLASSIFICACAO_ACESSO'] },
      { color: '#fff2cc', headers: ['PERMITE_MEMBROS', 'PERMITE_PROFESSORES_CURSO', 'PERMITE_PARTICIPANTES_EXTERNOS', 'PERMITE_CONVIDADOS_ESPECIFICOS', 'EXIGE_LISTA_NOMINAL_CONVIDADOS', 'EXIGE_CONVOCACAO', 'EXIGE_LEMBRETE', 'EXIGE_CONFIRMACAO_PRESENCA', 'EXIGE_ATA', 'EXIGE_MATERIAL', 'EXIGE_LISTA_PRESENCA', 'CONTA_PRESENCA', 'CONTA_FALTA', 'GERA_CERTIFICADO', 'EXIGE_REGRAS_APRESENTACAO'] }
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
      { color: '#d9ead3', headers: ['RGA', 'NOME_MEMBRO', 'EMAIL', 'CARGO_FUNCAO_ATUAL', 'OCUPACAO_ATUAL', 'OCUPACAO', 'STATUS_CADASTRAL', 'STATUS_NO_PERIODO'] },
      { color: '#d0e0e3', headers: ['DATA_ENTRADA_NO_PERIODO', 'DATA_SAIDA_NO_PERIODO', 'MOTIVO_ALTERACAO_NO_PERIODO', 'OBS_EVENTO_PERIODO'] },
      { color: '#eadcf8', headers: ['PREVISAO_APRESENTACAO_NO_PERIODO', 'APRESENTOU_NO_PERIODO', 'DATA_APRESENTACAO_NO_PERIODO'] },
      { color: '#fff2cc', headers: ['TOTAL_ATIVIDADES_QUE_CONTAM_FALTA', 'LIMITE_FALTAS_PERIODO', 'FALTAS_LIQUIDAS', 'PERCENTUAL_USO_LIMITE', 'SITUACAO_DISCIPLINAR'] }
    ],
    Eixos: [
      { color: '#d9ead3', headers: ['ATIVO', 'ORDEM', 'CODIGO_EIXO', 'NUMERAL_ROMANO'] },
      { color: '#d0e0e3', headers: ['NOME_OFICIAL', 'NOME_CURTO', 'ROTULO_FORMULARIO'] },
      { color: '#fff2cc', headers: ['DESCRICAO_RESUMIDA', 'PALAVRAS_CHAVE', 'DISCIPLINAS_RELACIONADAS', 'EXEMPLOS_TEMAS'] },
      { color: '#fce5cd', headers: ['OBSERVACOES', 'ATUALIZADO_EM'] }
    ],
    'Participantes Externos': [
      { color: '#d9ead3', headers: ['ID_PARTICIPANTE_EXTERNO', 'NOME', 'EMAIL', 'TELEFONE'] },
      { color: '#d0e0e3', headers: ['INSTITUICAO', 'CURSO_OU_AREA', 'CATEGORIA_PUBLICO', 'RELACAO_COM_GEAPA', 'CIDADE', 'UF', 'ORIGEM_CONTATO'] },
      { color: '#fff2cc', headers: ['RECEBE_COMUNICADOS_GERAIS', 'RECEBE_REUNIOES_ABERTAS', 'RECEBE_APRESENTACOES_ALUNOS', 'INTERESSE_EIXO_I', 'INTERESSE_EIXO_II', 'INTERESSE_EIXO_III', 'INTERESSE_EIXO_IV', 'INTERESSE_EIXO_V', 'INTERESSE_EIXO_VI', 'INTERESSE_EIXO_VII', 'INTERESSE_EIXO_VIII', 'ATIVO'] },
      { color: '#fce5cd', headers: ['OBSERVACOES', 'CRIADO_EM', 'ATUALIZADO_EM'] }
    ],
    Participantes_Externos: [
      { color: '#d9ead3', headers: ['ID_PARTICIPANTE_EXTERNO', 'NOME', 'EMAIL', 'TELEFONE'] },
      { color: '#d0e0e3', headers: ['INSTITUICAO', 'CURSO_OU_AREA', 'CATEGORIA_PUBLICO', 'RELACAO_COM_GEAPA', 'CIDADE', 'UF', 'ORIGEM_CONTATO'] },
      { color: '#fff2cc', headers: ['RECEBE_COMUNICADOS_GERAIS', 'RECEBE_REUNIOES_ABERTAS', 'RECEBE_APRESENTACOES_ALUNOS', 'INTERESSE_EIXO_I', 'INTERESSE_EIXO_II', 'INTERESSE_EIXO_III', 'INTERESSE_EIXO_IV', 'INTERESSE_EIXO_V', 'INTERESSE_EIXO_VI', 'INTERESSE_EIXO_VII', 'INTERESSE_EIXO_VIII', 'ATIVO'] },
      { color: '#fce5cd', headers: ['OBSERVACOES', 'CRIADO_EM', 'ATUALIZADO_EM'] }
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
    },
    PREVISAO_APRESENTACAO_NO_PERIODO: {
      values: ATIVIDADES_CFG.ENUMS.SIM_NAO,
      helpText: 'Preencha manualmente com SIM ou NAO para indicar se o membro esta previsto para apresentar no periodo.'
    },
    APRESENTOU_NO_PERIODO: {
      values: ['SIM', 'NAO', 'N/A'],
      helpText: 'Campo calculado pelo modulo a partir de apresentacoes realizadas no periodo.'
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

function atividades_applySheetAlignment_(sheet) {
  if (!sheet) return;
  var maxRows = Math.max(sheet.getMaxRows(), 1);
  var maxCols = Math.max(sheet.getMaxColumns(), 1);
  sheet.getRange(1, 1, maxRows, maxCols)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
}

function atividades_getThematicAxesHeaders_() {
  return [
    'ATIVO',
    'ORDEM',
    'CODIGO_EIXO',
    'NUMERAL_ROMANO',
    'NOME_OFICIAL',
    'NOME_CURTO',
    'ROTULO_FORMULARIO',
    'DESCRICAO_RESUMIDA',
    'PALAVRAS_CHAVE',
    'DISCIPLINAS_RELACIONADAS',
    'EXEMPLOS_TEMAS',
    'OBSERVACOES',
    'ATUALIZADO_EM'
  ];
}

function atividades_ensureThematicAxesHeaders_(sheet) {
  if (!sheet) return [];

  var headers = atividades_getThematicAxesHeaders_();
  var requiredCols = headers.length;

  if (sheet.getMaxColumns() < requiredCols) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), requiredCols - sheet.getMaxColumns());
  }

  sheet.getRange(1, 1, 1, requiredCols).setValues([headers]);
  return headers.slice();
}

function atividades_applyThematicAxesLayout_(sheet) {
  if (!sheet) return;

  var headerMap = GEAPA_CORE.coreHeaderMap(sheet, 1);
  var maxRows = Math.max(sheet.getMaxRows(), 2);
  var maxCols = Math.max(sheet.getMaxColumns(), 1);
  var lastRow = Math.max(sheet.getLastRow(), 2);

  var leftAlignedHeaders = [
    'NOME_OFICIAL',
    'NOME_CURTO',
    'ROTULO_FORMULARIO',
    'DESCRICAO_RESUMIDA',
    'PALAVRAS_CHAVE',
    'DISCIPLINAS_RELACIONADAS',
    'EXEMPLOS_TEMAS',
    'OBSERVACOES'
  ];
  var wrappedHeaders = [
    'NOME_OFICIAL',
    'NOME_CURTO',
    'ROTULO_FORMULARIO',
    'DESCRICAO_RESUMIDA',
    'PALAVRAS_CHAVE',
    'DISCIPLINAS_RELACIONADAS',
    'EXEMPLOS_TEMAS',
    'OBSERVACOES'
  ];
  var widthsByHeader = {
    ATIVO: 80,
    ORDEM: 70,
    CODIGO_EIXO: 120,
    NUMERAL_ROMANO: 120,
    NOME_OFICIAL: 280,
    NOME_CURTO: 180,
    ROTULO_FORMULARIO: 300,
    DESCRICAO_RESUMIDA: 260,
    PALAVRAS_CHAVE: 280,
    DISCIPLINAS_RELACIONADAS: 300,
    EXEMPLOS_TEMAS: 320,
    OBSERVACOES: 260,
    ATUALIZADO_EM: 170
  };

  sheet.getRange(1, 1, maxRows, maxCols)
    .setVerticalAlignment('top');
  sheet.getRange(1, 1, 1, maxCols)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  ['ATIVO', 'ORDEM', 'CODIGO_EIXO', 'NUMERAL_ROMANO', 'ATUALIZADO_EM'].forEach(function(header) {
    var col = GEAPA_CORE.coreGetCol(headerMap, header);
    if (!col) return;
    sheet.getRange(2, col, maxRows - 1, 1).setHorizontalAlignment('center');
  });

  leftAlignedHeaders.forEach(function(header) {
    var col = GEAPA_CORE.coreGetCol(headerMap, header);
    if (!col) return;
    sheet.getRange(2, col, maxRows - 1, 1).setHorizontalAlignment('left');
  });

  wrappedHeaders.forEach(function(header) {
    var col = GEAPA_CORE.coreGetCol(headerMap, header);
    if (!col) return;
    sheet.getRange(1, col, maxRows, 1).setWrap(true);
  });

  Object.keys(widthsByHeader).forEach(function(header) {
    var col = GEAPA_CORE.coreGetCol(headerMap, header);
    if (!col) return;
    sheet.setColumnWidth(col, widthsByHeader[header]);
  });

  if (GEAPA_CORE.coreGetCol(headerMap, 'ATUALIZADO_EM')) {
    sheet.getRange(2, GEAPA_CORE.coreGetCol(headerMap, 'ATUALIZADO_EM'), maxRows - 1, 1)
      .setNumberFormat('dd/MM/yyyy HH:mm');
  }

  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, maxCols).setBorder(true, true, true, true, true, true, '#d9d9d9', SpreadsheetApp.BorderStyle.SOLID);
  }
}

function atividades_applyApresentacoesThematicAxesValidation_(sheet) {
  if (!sheet || !atividades_getRegistryEntryByKey_(ATIVIDADES_CFG.STABLE_KEYS.THEMATIC_AXES)) return {
    ok: true,
    skipped: true,
    reason: 'thematic_axes_registry_missing'
  };

  var axisLabels = atividades_listRotulosEixosApresentacoes_();
  if (!axisLabels.length) return {
    ok: true,
    skipped: true,
    reason: 'no_thematic_axes_labels'
  };

  var headerMap = GEAPA_CORE.coreHeaderMap(sheet, 1);
  var targetHeaders = ['EIXO_TEMATICO_PRINCIPAL', 'EIXO_TEMATICO_SECUNDARIO'];
  var totalRows = Math.max(sheet.getMaxRows() - 1, 1);
  var validation = SpreadsheetApp.newDataValidation()
    .requireValueInList(axisLabels, true)
    .setAllowInvalid(true)
    .setHelpText('Selecione um eixo tematico oficial da base institucional de eixos.')
    .build();

  targetHeaders.forEach(function(header) {
    var col = GEAPA_CORE.coreGetCol(headerMap, header);
    if (!col) return;
    sheet.getRange(2, col, totalRows, 1).setDataValidation(validation);
    sheet.getRange(1, col).setNote(
      'Use apenas eixos tematicos oficiais da base institucional. ' +
      'Os convites e validacoes passam a depender desta selecao.'
    );
  });

  return {
    ok: true,
    appliedHeaders: targetHeaders
  };
}

function atividades_applyHistoricoPublicoThematicAxesValidation_(sheet) {
  if (!sheet || !atividades_getRegistryEntryByKey_(ATIVIDADES_CFG.STABLE_KEYS.THEMATIC_AXES)) return {
    ok: true,
    skipped: true,
    reason: 'thematic_axes_registry_missing'
  };

  var axisLabels = atividades_listRotulosEixosApresentacoes_();
  if (!axisLabels.length) return {
    ok: true,
    skipped: true,
    reason: 'no_thematic_axes_labels'
  };

  var headerMap = GEAPA_CORE.coreHeaderMap(sheet, 1);
  var targetHeaders = [];
  var targetAliases = [
    'Eixo Temático Principal',
    'Eixo Tematico Principal',
    'Eixo Temático',
    'Eixo Tematico',
    'Eixo Temático Secundário',
    'Eixo Tematico Secundario',
    'Eixo Temático 2',
    'Eixo Tematico 2',
    'Eixo 2'
  ].map(function(alias) {
    return GEAPA_CORE.coreNormalizeHeader(alias);
  });

  Object.keys(headerMap || {}).forEach(function(header) {
    var normalized = GEAPA_CORE.coreNormalizeHeader(header);
    if (targetAliases.indexOf(normalized) >= 0) {
      targetHeaders.push(header);
    }
  });

  if (!targetHeaders.length) return {
    ok: true,
    skipped: true,
    reason: 'historico_axis_header_missing'
  };

  var totalRows = Math.max(sheet.getMaxRows() - 1, 1);
  var validation = SpreadsheetApp.newDataValidation()
    .requireValueInList(axisLabels, true)
    .setAllowInvalid(true)
    .setHelpText('Selecione um eixo tematico oficial da base institucional de eixos.')
    .build();

  var appliedHeaders = [];
  targetHeaders.forEach(function(targetHeader) {
    var col = GEAPA_CORE.coreGetCol(headerMap, targetHeader);
    if (!col) return;
    sheet.getRange(2, col, totalRows, 1).setDataValidation(validation);
    sheet.getRange(1, col).setNote(
      'Use apenas eixos tematicos oficiais da base institucional. ' +
      'O historico publico e os resumos de apresentacoes dependem desta padronizacao.'
    );
    appliedHeaders.push(targetHeader);
  });

  if (!appliedHeaders.length) return {
    ok: true,
    skipped: true,
    reason: 'historico_axis_column_missing'
  };

  return {
    ok: true,
    appliedHeaders: appliedHeaders
  };
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
  atividades_applySheetAlignment_(sheet);

  if (currentLogicalName === ATIVIDADES_CFG.DYNAMIC_SHEET_PROFILES.PERIODO_PRESENCAS ||
      sheet.getName().indexOf(ATIVIDADES_CFG.DYNAMIC_SHEET_PREFIXES.PERIODO_PRESENCAS) === 0) {
    atividades_applyPresenceMetadataValidation_(sheet);
    atividades_applyPresenceDynamicValidation_(sheet);
  }

  if (currentLogicalName === 'Eixos') {
    atividades_applyThematicAxesLayout_(sheet);
  }

  if (currentLogicalName === 'Atividades_Apresentacoes') {
    atividades_applyApresentacoesThematicAxesValidation_(sheet);
  }
}

function atividades_aplicarUxBaseEixosTematicos_() {
  var sheet = atividades_getEixosTematicosConfigSheet_();
  var headers = atividades_ensureThematicAxesHeaders_(sheet);
  atividades_applySheetUx_(sheet, 'Eixos');

  return {
    ok: true,
    key: ATIVIDADES_CFG.STABLE_KEYS.THEMATIC_AXES,
    sheetName: sheet.getName(),
    spreadsheetId: sheet.getParent().getId(),
    headers: headers
  };
}

function atividades_migrarCabecalhosBaseExternos_(sheet) {
  if (!sheet) return { renamed: false, addedRelation: false };

  var lastColumn = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function(header) {
    return String(header || '').trim();
  });
  var categoriaLegacyIndex = headers.indexOf('CATEGORIA_PARTICIPANTE');
  var categoriaPublicoIndex = headers.indexOf('CATEGORIA_PUBLICO');
  var relacaoIndex = headers.indexOf('RELACAO_COM_GEAPA');
  var renamed = false;
  var addedRelation = false;

  if (categoriaLegacyIndex >= 0 && categoriaPublicoIndex === -1) {
    sheet.getRange(1, categoriaLegacyIndex + 1).setValue('CATEGORIA_PUBLICO');
    renamed = true;
  }

  if (relacaoIndex === -1) {
    atividades_ensureHeadersOnSheet_(sheet, ['RELACAO_COM_GEAPA']);
    addedRelation = true;
  }

  atividades_ensureHeadersOnSheet_(sheet, ATIVIDADES_SCHEMA.EXTERNOS_BASE);

  return {
    renamed: renamed,
    addedRelation: addedRelation
  };
}

function atividades_aplicarUxBaseExternos_() {
  var sheet = atividades_getExternosBaseSheet_();
  if (!sheet) {
    return {
      ok: true,
      skipped: true,
      reason: 'Base de pessoas externas nao encontrada.'
    };
  }

  return {
    ok: true,
    skipped: true,
    sheetName: sheet.getName(),
    spreadsheetId: sheet.getParent().getId(),
    reason: 'UX da base de pessoas externas delegada ao modulo geapa-membros.'
  };
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

  var thematicAxes = atividades_aplicarUxBaseEixosTematicos_();
  var externosBase = atividades_aplicarUxBaseExternos_();

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
    thematicAxes: thematicAxes,
    externosBase: externosBase,
    dynamicSheets: {
      atividades: !!dynamicAtividades,
      presencas: !!dynamicPresencas
    }
  };
}
