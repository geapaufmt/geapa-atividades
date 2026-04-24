# GEAPA - Modulo de Atividades

Modulo responsavel pelo dominio `ATIVIDADES`, com foco inicial em:

- cadastro das atividades internas;
- heranca de regras a partir de `Atividades_Config`;
- resolucao dinamica do periodo vigente;
- criacao das abas operacionais do periodo diretamente pelo codigo do modulo;
- sincronizacao historica da presenca oficial de membros por `RGA`;
- arquivamento dos periodos encerrados em planilhas separadas dentro de uma pasta de historico.

## Taxonomia da V1

A V1 trabalha com quatro campos de classificacao operacional:

- `CLASSIFICACAO_REUNIAO`
- `TIPO_ATIVIDADE`
- `SUBTIPO_ATIVIDADE`
- `CLASSIFICACAO_ACESSO`

### `CLASSIFICACAO_REUNIAO`

Usada apenas quando a atividade for enquadrada como reuniao. Valores atuais:

- `ORDINARIA`
- `EXTRAORDINARIA`
- `DIRETORIA`

### `TIPO_ATIVIDADE`

Define a natureza institucional principal da atividade. Valores atuais:

- `ACADEMICA`
- `ORGANIZACIONAL`
- `ESTRATEGICA`
- `INTERNA`
- `DELIBERATIVA`
- `OUTRA`

### `SUBTIPO_ATIVIDADE`

Detalha a forma operacional da atividade. Valores atuais:

- `SEM_SUBTIPO`
- `APRESENTACAO_MEMBRO`
- `APRESENTACAO_REPOSICAO`
- `PALESTRA`
- `VISITA_TECNICA`
- `DINAMICA`
- `CURSO`
- `DEBATE`
- `ABERTURA_PERIODO`
- `FECHAMENTO_PERIODO`
- `MARCO_INSTITUCIONAL`

Exemplos de combinacao:

- `CLASSIFICACAO_REUNIAO = ORDINARIA`, `TIPO_ATIVIDADE = ORGANIZACIONAL`, `SUBTIPO_ATIVIDADE = SEM_SUBTIPO`
- `CLASSIFICACAO_REUNIAO = DIRETORIA`, `TIPO_ATIVIDADE = ESTRATEGICA`, `SUBTIPO_ATIVIDADE = SEM_SUBTIPO`
- `CLASSIFICACAO_REUNIAO = <vazio>`, `TIPO_ATIVIDADE = ACADEMICA`, `SUBTIPO_ATIVIDADE = APRESENTACAO_MEMBRO`
- `CLASSIFICACAO_REUNIAO = <vazio>`, `TIPO_ATIVIDADE = INTERNA`, `SUBTIPO_ATIVIDADE = DINAMICA`

`CLASSIFICACAO_ACESSO` permanece separada porque responde a outra pergunta institucional:

- `ABERTA`
- `RESTRITA_MEMBROS`
- `RESTRITA_DIRETORIA`
- `RESTRITA_CONVIDADOS`

## Escopo da V1

A V1 implementada aqui cobre:

- conexao com as planilhas ja existentes via `Registry`;
- descoberta do periodo vigente com base em `VIGENCIA_PERIODOS` e fallback em `VIGENCIA_SEMESTRES`;
- derivacao dinamica dos nomes:
  - `Atividades_Periodo_<PERIODO>`
  - `Presencas_<PERIODO>`
- uso de planilha operacional e pasta de historico;
- uso de pasta de historico com uma planilha por periodo encerrado;
- aplicacao de notas, filtros, congelamento, cores e listas suspensas;
- heranca automatica de `Atividades_Config` para `Atividades`;
- suporte a `BASE_PLANEJAMENTO_INICIAL` na aba `Atividades`;
- seed padrao e nao destrutivo de `Atividades_Config` quando a aba estiver vazia;
- sincronizacao da aba de periodo vigente;
- inicializacao e sincronizacao historica da aba oficial de presencas dos membros;
- fluxo V1 de justificativas de faltas com base bruta de formulario, aba oficial de analise, reflexo automatico em presencas e abono visual `J -> A`;
- motor disciplinar por faltas com snapshot normativo do periodo, faixa disciplinar automatica e logs de transicao.

## Arquitetura

### Planilha operacional

Mantem apenas:

- `Atividades`
- `Atividades_Apresentacoes`
- `Atividade_Convidados`
- `Atividades_Config`
- `Justificativas_Faltas`
- `Atividades_Log`
- `Atividades_Periodo_<PERIODO_VIGENTE>`
- `Presencas_<PERIODO_VIGENTE>`

### Pasta de historico

Recebe uma planilha por periodo encerrado.

Cada planilha historica do periodo recebe:

- `Atividades_Periodo_<PERIODO>`
- `Presencas_<PERIODO>`
- `META`

Na V1, a estrategia padrao de seguranca e:

- criar uma nova planilha historica com nome `ATIVIDADES INTERNAS GEAPA - <PERIODO>`;
- copiar para ela as duas abas dinamicas do periodo encerrado;
- registrar metadados na aba `META`;
- remover as abas antigas da planilha operacional apos copia bem-sucedida.

## Regras de identificacao

- membros continuam usando `RGA` como identificador oficial;
- o modulo nao cria `ID_MEMBRO`;
- `ID_ATIVIDADE` usa o padrao estavel `ATV-0001`, `ATV-0002`, ...;
- `ID_ATIVIDADE` e criado automaticamente por rotina periodica, apenas quando a celula estiver vazia e a linha tiver ao menos `TIPO_ATIVIDADE` e `DATA_ATIVIDADE` ou `PERIODO_REFERENCIA`;
- `COLUNA_PRESENCA` e derivada como `ID_ATIVIDADE_YYYYMMDD`, por exemplo `ATV-0001_20260407`;
- externos nao entram na presenca oficial dos membros;
- `Atividades_Apresentacoes` continua separada para preservar o fluxo especifico.

## Descoberta de planilhas e keys

O modulo prioriza as KEYS institucionais mais provaveis, mas tambem tenta se adaptar ao `Registry` por nome de aba e por padroes de chave, para reduzir acoplamento desnecessario.

### Abas fixas do modulo

Preferencias atuais:

- `ATIVIDADES_GERAL`
- `ATIVIDADES_APRESENTACOES`
- `ATIVIDADES_CONVIDADOS`
- `ATIVIDADES_CONFIG`
- `Justificativas_Faltas` e `JUSTIFICATIVA DE FALTA - GEAPA (respostas)` podem ser descobertas por nome de aba quando nao houver KEY dedicada
- `ATIVIDADES_LOG`

### Estruturas estaveis obrigatorias

- `MEMBERS_ATUAIS`
- `VIGENCIA_SEMESTRES`
- `MEMBER_EVENTOS_VINCULO` para historico institucional de ingresso, desligamento e suspensao
- `PESSOAS_EXTERNAS_BASE` (com fallback legado para `PARTICIPANTES_EXTERNOS_BASE`), apontando para a aba `Participantes Externos` da planilha de pessoas

### Estrutura preferencial de periodo

- `VIGENCIA_PERIODOS`

### Descoberta da pasta de historico

O modulo tenta localizar a pasta de historico por:

- `ATIVIDADES_HISTORICO`
- `ATIVIDADES_HISTORICO_GERAL`

ou por tokens `ATIVIDADES` + `HISTORICO` no nome da KEY.

Se nenhuma ancora de historico existir no `Registry`, essa e a unica adicao realmente indispensavel para a V1 de arquivamento automatico.

## Funcoes publicas principais

- `atividades_diagnostico()`
- `atividades_validarModulo()`
- `atividades_setupV1()`
- `atividades_garantirPeriodoVigente()`
- `atividades_sincronizarPeriodoVigente()`
- `atividades_sincronizarPresencasPeriodoVigente()`
- `atividades_congelarSnapshotNormativoPeriodoVigente()`
- `atividades_forcarRecalculoSnapshotNormativoPeriodoVigente()`
- `atividades_recalcularMotorDisciplinarPeriodoVigente()`
- `atividades_gerarEventosDesligamentoPorFaltasPeriodoVigente()`
- `atividades_instalarTriggers()`
- `atividades_removerTriggers()`
- `atividades_jobApresentacoes()`
- `atividades_jobApresentacoesBase()`
- `atividades_jobApresentacoesConvites()`
- `atividades_jobApresentacoesPosEvento()`
- `atividades_enviarCobrancasTituloEixoApresentacoes()`
- `atividades_processarInboxTituloEixoApresentacoes()`
- `atividades_notificarSecretariosApresentacoes()`
- `atividades_preencherIdentificacaoApresentacaoLinha(rowNumber)`
- `atividades_vincularProfessoresApresentacoes()`
- `atividades_enviarConvitesProfessoresApresentacoes()`
- `atividades_vincularExternosApresentacoes()`
- `atividades_enviarConvitesExternosApresentacoes()`
- `atividades_sincronizarHistoricoPublicoApresentacoes()`
- `atividades_sincronizarResumoApresentacoesEmMembersAtuais()`
- `atividades_aplicarUxPlanilhas()`
- `atividades_aplicarConfigLinhaAtividade(rowNumber)`
- `atividades_fillMissingActivityIds()`
- `atividades_ensureActivityIdForRow(rowNumber)`
- `atividades_seedConfigPadrao()`
- `atividades_arquivarPeriodosAntigos()`
- `atividades_importarJustificativasFaltas()`
- `atividades_aplicarDecisoesJustificativas()`
- `atividades_recalcularAbonosPeriodoVigente()`
- `atividades_notificarFaltasPendentes()`

## Fluxo V1 de justificativas de faltas

Estruturas usadas:

- planilha bruta: `JUSTIFICATIVA DE FALTA - GEAPA (respostas)`
- aba oficial permanente: `Justificativas_Faltas`
- reflexo final: `Presencas_<PERIODO>`

Valores aceitos nas colunas dinamicas de presenca:

- `P` = Presente
- `R` = Remoto validado
- `F` = Falta
- `J` = Falta justificada
- `A` = Falta abonada
- `N/A` = Nao se aplica

Resumo do fluxo:

1. a equipe registra a ausencia em `Presencas_<PERIODO>` com `F`;
2. `atividades_notificarFaltasPendentes()` importa primeiro a base bruta, depois envia aviso automatico para os `F` elegiveis ainda sem justificativa registrada;
3. `atividades_importarJustificativasFaltas()` consolida as respostas brutas em `Justificativas_Faltas`;
4. a diretoria analisa manualmente em `Justificativas_Faltas`;
5. ao marcar `STATUS_ANALISE = DEFERIDA` ou `INDEFERIDA`, o modulo reflete automaticamente a decisao na presenca e envia um e-mail com o resultado da analise;
6. a cada duas justificativas deferidas no periodo, uma passa de `J` para `A`.

Regras aplicadas na V1:

- o prazo padrao e de 48 horas apos a atividade;
- o formulario usa `CODIGO_ATIVIDADE` como chave principal;
- a base bruta continua separada da base oficial de analise;
- membros com `N/A`, `P`, `R`, `J` ou `A` nao recebem cobranca;
- o aviso usa a fila central `MAIL_SAIDA` e o processamento central do core;
- o resultado da analise tambem usa a fila central `MAIL_SAIDA`, com deduplicacao por `CODIGO_ATIVIDADE + RGA + STATUS_ANALISE`;
- o link operacional de formulario usado pelo modulo e `https://docs.google.com/forms/d/e/1FAIpQLSc3s2PXBLSwcjahOVLHJGkMS853A7IKwxxDpiGQJXe1nRT3TQ/viewform?usp=publish-editor`.

## Integracao de eventos de vinculo

O modulo agora pode complementar a aba `Presencas_<PERIODO>` com base em eventos institucionais de vinculo por `RGA`.

Key esperada:

- `MEMBER_EVENTOS_VINCULO`

Cabecalhos esperados na base compartilhada:

- `ID_EVENTO_MEMBRO`
- `RGA`
- `TIPO_EVENTO`
- `DATA_EVENTO`
- `STATUS_EVENTO`
- `MOTIVO_EVENTO`
- `ORIGEM_MODULO`
- `ORIGEM_CHAVE`
- `ORIGEM_ROW`
- `NOME_MEMBRO`
- `EMAIL`
- `OBSERVACOES`
- `CRIADO_EM`
- `ATUALIZADO_EM`

Tipos de evento previstos:

- `INGRESSO`
- `DESLIGAMENTO_VOLUNTARIO`
- `DESLIGAMENTO_POR_FALTAS`
- `DESLIGAMENTO_ADMINISTRATIVO`
- `SUSPENSAO`
- `RETORNO`

Regras atuais de consumo em presencas:

- `INGRESSO` e `RETORNO` passam a definir a data de entrada aplicavel ao periodo;
- desligamentos e suspensoes homologados passam a definir `DATA_SAIDA_NO_PERIODO`;
- eventos cancelados ou apenas registrados ainda nao entram no periodo;
- se a base de eventos nao existir, o modulo continua com fallback para `MEMBERS_ATUAIS` e para os dados ja preservados na propria aba de presencas.

## Motor disciplinar por faltas

### Base normativa do periodo

O modulo usa um desenho hibrido:

- `Atividades` = planejamento detalhado;
- `VIGENCIA_PERIODOS` = snapshot normativo congelado do periodo.

Evolucao minima em `Atividades`:

- `PERIODO_REFERENCIA`
- `BASE_PLANEJAMENTO_INICIAL`

`PERIODO_REFERENCIA` permite registrar atividades planejadas para o periodo mesmo quando a `DATA_ATIVIDADE` ainda nao estiver fechada.

`BASE_PLANEJAMENTO_INICIAL` indica se a atividade integrou a base oficial usada para congelar o limite de faltas do periodo. Ela nao substitui o `STATUS`.

Fluxo leve atual para `STATUS = PLANEJADA`:

- gera `ID_ATIVIDADE` automaticamente, quando elegivel;
- aplica heranca de `Atividades_Config` sem sobrescrever valores manuais ja preenchidos;
- preenche `BASE_PLANEJAMENTO_INICIAL = SIM` por default quando `CONTA_FALTA = SIM` e a coluna estiver vazia.

Para compor o total planejado que conta falta, o modulo considera apenas atividades que:

- pertencam ao periodo por `PERIODO_REFERENCIA` ou, na falta dele, por `DATA_ATIVIDADE` dentro da vigencia;
- tenham `BASE_PLANEJAMENTO_INICIAL = SIM`;
- tenham `CONTA_FALTA = SIM`;

### Snapshot congelado em `VIGENCIA_PERIODOS`

O modulo passa a usar ou criar estes campos na aba de periodos:

- `TOTAL_ATIVIDADES_QUE_CONTAM_FALTA_PLANEJADAS`
- `LIMITE_FALTAS_PERIODO_CONGELADO`
- `DATA_FECHAMENTO_PLANEJAMENTO`

Regra normativa implementada:

- `LIMITE_FALTAS_PERIODO = floor(0.20 * TOTAL_ATIVIDADES_QUE_CONTAM_FALTA_PLANEJADAS_NO_INICIO_DO_PERIODO)`

`DATA_FECHAMENTO_PLANEJAMENTO` e derivada automaticamente como `23:59` do dia anterior a primeira atividade da base inicial que tenha `DATA_ATIVIDADE` definida.

Quando o snapshot ja estiver congelado, o motor disciplinar usa esses valores oficiais.
Enquanto ainda nao estiver congelado, o modulo usa uma projecao derivada de `Atividades` e atualiza a data-limite de fechamento.

Depois do congelamento:

- o limite nao diminui automaticamente se o numero de atividades cair;
- o limite nao aumenta automaticamente se novas atividades surgirem;
- o snapshot so muda novamente por recalcule manual.

Funcao publica para recalcule manual:

- `atividades_forcarRecalculoSnapshotNormativoPeriodoVigente()`

### Campos novos em `Presencas_<PERIODO>`

- `TOTAL_ATIVIDADES_QUE_CONTAM_FALTA`
- `LIMITE_FALTAS_PERIODO`
- `FALTAS_LIQUIDAS`
- `PERCENTUAL_USO_LIMITE`
- `SITUACAO_DISCIPLINAR`

Regras de calculo:

- `TOTAL_ATIVIDADES_QUE_CONTAM_FALTA` = base oficial congelada do periodo, ou projecao enquanto o snapshot nao for fechado;
- `LIMITE_FALTAS_PERIODO` = limite oficial congelado do periodo;
- `FALTAS_LIQUIDAS` = contagem de `F + J`;
- `A` nao conta como falta liquida;
- `PERCENTUAL_USO_LIMITE` = `FALTAS_LIQUIDAS / LIMITE_FALTAS_PERIODO`;
- `SITUACAO_DISCIPLINAR`:
  - `NORMAL`
  - `ALERTA_60`
  - `ALERTA_80`
  - `LIMITE_ATINGIDO`

### Logs e eventos

O modulo registra em `Atividades_Log` quando houver transicao para:

- `DISCIPLINA_ALERTA_60`
- `DISCIPLINA_ALERTA_80`
- `DISCIPLINA_LIMITE_ATINGIDO`

Tambem existe a funcao:

- `atividades_gerarEventosDesligamentoPorFaltasPeriodoVigente()`

Ela nao move automaticamente membros para ex-membros nesta sprint.
Ela apenas registra eventos institucionais `DESLIGAMENTO_POR_FALTAS` com `STATUS_EVENTO = REGISTRADO` para casos ja em `LIMITE_ATINGIDO`, com deduplicacao por `RGA + periodo`.

### Teste manual da sprint disciplinar

1. Em `Atividades`, crie ou edite uma linha com `STATUS = PLANEJADA`, `CONTA_FALTA = SIM` e confira a geracao do `ID_ATIVIDADE`, a heranca nao destrutiva do config e o default de `BASE_PLANEJAMENTO_INICIAL = SIM`.
2. Ajuste o planejamento em `Atividades` com `PERIODO_REFERENCIA` quando a `DATA_ATIVIDADE` ainda nao estiver fechada.
3. Rode `atividades_forcarRecalculoSnapshotNormativoPeriodoVigente()` para recalcular e gravar o snapshot oficial atual em `VIGENCIA_PERIODOS`.
4. Confira em `VIGENCIA_PERIODOS`:
   - `TOTAL_ATIVIDADES_QUE_CONTAM_FALTA_PLANEJADAS`
   - `LIMITE_FALTAS_PERIODO_CONGELADO`
   - `DATA_FECHAMENTO_PLANEJAMENTO`
5. Rode `atividades_sincronizarPresencasPeriodoVigente()` ou `atividades_recalcularMotorDisciplinarPeriodoVigente()` e confira:
   - `NORMAL`
   - `ALERTA_60`
   - `ALERTA_80`
   - `LIMITE_ATINGIDO`
6. Altere manualmente valores `F`, `J` e `A` nas colunas dinamicas da aba de presencas e confirme o recalculo do bloco disciplinar.
7. Quando houver membro em `LIMITE_ATINGIDO`, rode `atividades_gerarEventosDesligamentoPorFaltasPeriodoVigente()` e confira a criacao do evento institucional na base `MEMBER_EVENTOS_VINCULO`.

### Triggers recomendados

Instalador automatico:

- `atividades_instalarTriggers()`

Esse instalador cria:

- trigger instalavel de edicao para `onEditAtividades`;
- trigger horario para `atividades_jobPlanejamentoNormativo_`, que atualiza a data-limite, tenta congelar o snapshot quando a hora chegar e recalcula o bloco disciplinar;
- trigger horario para `atividades_jobApresentacoes_`, que agora roda em fases ciclicas para reduzir carga e limite de execucoes do Apps Script:
  - `BASE`: garante `ID_ATIVIDADE`, faz upsert de `APRESENTACAO_MEMBRO`, reflete `STATUS_APRESENTACAO` e, quando esse reflexo altera `Atividades.STATUS`, ressincroniza automaticamente `Atividades_Periodo_<PERIODO>` e `Presencas_<PERIODO>` antes de seguir para agendamento, cobranca e inbox de titulo/eixo e aviso a secretaria;
  - `CONVITES`: upsert de professores e externos, convites e lembretes aos membros;
  - `POS_EVENTO`: cobranca/inbox de arquivo, sincronizacao do historico publico e resumo em `MEMBERS_ATUAIS`.

## Integracao com Atividades_Apresentacoes

O modulo passou a reconciliar periodicamente:

- `Atividades`
- `Atividades_Apresentacoes`

Regras atuais:

- `ID_ATIVIDADE` continua geral e pode ser gerado para qualquer atividade elegivel;
- apenas linhas com `SUBTIPO_ATIVIDADE = APRESENTACAO_MEMBRO` entram no upsert especializado;
- o elo principal entre as abas e `ID_ATIVIDADE`;
- o job especializado preserva a operacao humana da aba `Atividades_Apresentacoes`, preenchendo apenas os campos espelho minimos:
  - `ID_ATIVIDADE`
  - `PERIODO_REFERENCIA`
  - `DATA_ATIVIDADE`
  - `HORARIO_INICIO`
  - `HORARIO_FIM`
  - `LOCAL`
  - `FORMATO`
  - `SEMESTRE_APRESENTACAO`

Mapeamento atual de status:

- `STATUS_APRESENTACAO = PLANEJADA` -> `Atividades.STATUS = PLANEJADA`
- `STATUS_APRESENTACAO = AGENDADA` -> `Atividades.STATUS = PLANEJADA`
- `STATUS_APRESENTACAO = CONFIRMADA` -> `Atividades.STATUS = PLANEJADA`
- `STATUS_APRESENTACAO = APROVADA` -> `Atividades.STATUS = CONFIRMADA`
- `STATUS_APRESENTACAO = REALIZADA` -> `Atividades.STATUS = REALIZADA`
- `STATUS_APRESENTACAO = CANCELADA` -> `Atividades.STATUS = CANCELADA`

Notificacao ao membro:

- a notificacao de agendamento e disparada pela aba especializada, nao pela aba geral;
- o marco explicito usado na V1 e `STATUS_APRESENTACAO = AGENDADA`;
- os controles de idempotencia ficam em:
  - `NOTIFICACAO_AGENDAMENTO_ENVIADA`
  - `DATA_NOTIFICACAO_AGENDAMENTO`
- o texto do e-mail foi revisado para uso institucional em portugues, preservando o comportamento do fluxo antigo de apresentacoes.

Fluxo atual entre `AGENDADA`, `CONFIRMADA` e `APROVADA`:

- `AGENDADA` significa apenas que a data foi marcada e o membro deve ser avisado;
- entre 1 e 4 dias antes da apresentacao, se ainda nao houver titulo/eixo confirmados, o sistema envia cobranca de titulo/eixo;
- quando a resposta valida e recebida, o sistema grava `TITULO_APRESENTACAO`, `EIXO_TEMATICO_PRINCIPAL`, `EIXO_TEMATICO_SECUNDARIO` e `DATA_CONFIRMACAO_TITULO_EIXO`, alem de mudar `STATUS_APRESENTACAO` para `CONFIRMADA`;
- em seguida, o sistema envia aviso automatico para a secretaria revisar o material;
- somente depois da analise humana e da mudanca manual para `STATUS_APRESENTACAO = APROVADA` e que a atividade geral passa para `CONFIRMADA` e os convites amplos ficam liberados.

Base oficial de eixos tematicos:

- a key institucional esperada e `EIXOS_TEMATICOS_OFICIAIS`;
- os campos `EIXO_TEMATICO_PRINCIPAL` e `EIXO_TEMATICO_SECUNDARIO` em `Atividades_Apresentacoes` passam a usar dropdown dinamico derivado dessa base;
- a mesma base oficial tambem e usada para:
  - interpretar a resposta do membro na cobranca de titulo/eixo;
  - casar professores por eixo;
  - casar participantes externos por eixo.

Professores por eixo tematico:

- os convites a professores sao liberados apenas quando `STATUS_APRESENTACAO = APROVADA`;
- a base institucional usada e `PROFS_BASE`;
- o modulo tenta ler:
  - `Nome` ou `NOME`
  - `E-mail`, `EMAIL` ou `Email`
  - `Eixo tematico 1` / `EIXO_TEMATICO_1`
  - `Eixo tematico 2` / `EIXO_TEMATICO_2`
- os professores elegiveis sao vinculados primeiro em `Atividade_Convidados`, mantendo trilha auditavel por pessoa;
- o envio e idempotente e usa o controle `CONVITE_ENVIADO` da aba `Atividade_Convidados`.

Lembretes aos membros:

- os lembretes aos membros ativos sao liberados apenas quando `STATUS_APRESENTACAO = APROVADA`;
- a base institucional usada e `MEMBERS_ATUAIS`;
- o modulo considera elegiveis os membros com `STATUS`/`STATUS_CADASTRAL = ATIVO` e e-mail valido;
- o envio e registrado diretamente na aba `Atividades_Apresentacoes` por:
  - `LEMBRETE_MEMBROS_ENVIADO`
  - `DATA_ENVIO_LEMBRETE_MEMBROS`
- o job de apresentacoes tenta reenfileirar automaticamente no proximo ciclo caso a fila central de e-mails esteja ocupada.

Pós-apresentação:

- quando a apresentação está `APROVADA`, o modulo pode marcá-la automaticamente como `REALIZADA` se houver evidência concreta de execução na aba `Presencas_<PERIODO>`;
- a evidência usada nesta V1 é:
  - a data/horário da apresentação já terem passado;
  - a atividade já existir no mapa do período;
  - a coluna correspondente em presenças já ter ao menos um lançamento real (`P`, `R`, `F`, `J` ou `A`);
- quando `STATUS_APRESENTACAO = REALIZADA`, o modulo passa a cobrar o envio do arquivo da apresentacao em PDF;
- a primeira cobranca ocorre a partir das 22h do dia da apresentacao;
- a janela de cobranca fica aberta por 72 horas a partir da apresentacao;
- o envio e registrado diretamente na aba `Atividades_Apresentacoes` por:
  - `DATA_SOLICITACAO_ARQUIVO`
  - `DATA_COBRANCA_ARQUIVO`
  - `QTD_COBRANCAS_ARQUIVO`
  - `STATUS_ENVIO_ARQUIVO`
- o inbox procura respostas com o assunto `GEAPA | Envio do arquivo da apresentação em PDF`;
- apenas anexos em PDF sao aceitos;
- quando o PDF e recebido corretamente, o modulo grava:
  - `STATUS_ENVIO_ARQUIVO = RECEBIDO`
  - `DATA_RECEBIMENTO_ARQUIVO`
  - `LINK_ARQUIVO_DRIVE`
- para salvar os arquivos, o Registry precisa conter a key de pasta raiz em uma destas formas:
  - `APRESENTACOES_PASTA_RAIZ`
  - `PASTA_RAIZ_APRESENTACOES`

Autofill de identificacao:

- o preenchimento automatico de `RGA`, `NOME_MEMBRO` e `EMAIL_MEMBRO` acontece por `onEdit`, mas apenas na aba `Atividades_Apresentacoes`;
- a origem do autofill e `MEMBERS_ATUAIS`, via `GEAPA-CORE`;
- esse `onEdit` nao envia e-mails, nao cria apresentacoes e nao altera status: ele apenas resolve a identidade do membro.

Participantes externos por eixo tematico:

- a fonte oficial e a aba `Participantes Externos` da planilha de pessoas, via `PESSOAS_EXTERNAS_BASE` com fallback legado para `PARTICIPANTES_EXTERNOS_BASE`;
- o matching dos interesses usa a base oficial `EIXOS_TEMATICOS_OFICIAIS` para transformar os eixos selecionados na apresentacao em chaves institucionais estaveis;
- o modulo usa essa base para localizar externos com:
  - `ATIVO = SIM`
  - `RECEBE_APRESENTACOES_ALUNOS = SIM`
  - interesse em `EIXO_TEMATICO_PRINCIPAL` e/ou `EIXO_TEMATICO_SECUNDARIO`
- os externos elegiveis sao vinculados primeiro em `Atividade_Convidados`, mantendo trilha auditavel por pessoa;
- o envio e idempotente e usa o controle `CONVITE_ENVIADO` da aba `Atividade_Convidados`;
- a apresentacao precisa estar em status `APROVADA`;
- a atividade geral precisa ser aberta a externos, isto e, `CLASSIFICACAO_ACESSO = ABERTA`.

Usabilidade visual:

- a rotina de UX do modulo agora aplica centralizacao horizontal e vertical como padrao nas abas operacionais.

Para limpar e reinstalar:

- `atividades_removerTriggers()`

## Operacao do job de apresentacoes

O job horario de apresentacoes permanece unico no instalador, mas internamente ele nao tenta mais executar todo o fluxo de uma vez.

Agora o modulo alterna automaticamente entre tres fases:

1. `BASE`
2. `CONVITES`
3. `POS_EVENTO`

Cada execucao avanca para a fase seguinte. Isso reduz risco de timeout, limite de chamadas e o erro de "funcao executada muitas vezes em curto espaco de tempo".

Para teste manual, voce pode rodar cada fase isoladamente:

- `atividades_jobApresentacoesBase()`
- `atividades_jobApresentacoesConvites()`
- `atividades_jobApresentacoesPosEvento()`

Para depuracao mais objetiva de historico e membros, estas funcoes continuam disponiveis de forma independente:

- `atividades_sincronizarHistoricoPublicoApresentacoes()`
- `atividades_sincronizarResumoApresentacoesEmMembersAtuais()`

## Fluxo de virada de periodo

1. o modulo resolve o periodo vigente;
2. localiza abas dinamicas antigas na planilha operacional;
3. cria a planilha historica do periodo encerrado dentro da pasta de historico;
4. copia para ela as abas `Atividades_Periodo_<PERIODO>` e `Presencas_<PERIODO>`;
5. grava a aba `META`;
6. remove as abas antigas da operacional;
7. garante as abas do novo periodo vigente diretamente pelo schema do modulo;
8. sincroniza o mapa de atividades do periodo;
9. inicializa ou sincroniza a aba de presencas usando `MEMBERS_ATUAIS`.

## Testes manuais da V1

### Inicializacao do primeiro periodo

1. valide o `Registry` com `atividades_diagnostico()`;
2. rode `atividades_setupV1()`;
3. confira se as abas dinamicas do periodo vigente foram criadas automaticamente pelo codigo;
4. confira se `Atividades_Periodo_<PERIODO>` recebeu apenas atividades do periodo vigente;
5. confira se `Presencas_<PERIODO>` foi inicializada apenas com membros por `RGA`.
6. se `MEMBER_EVENTOS_VINCULO` ja existir, confira se ingressos posteriores e desligamentos homologados foram refletidos em `STATUS_NO_PERIODO`.

### Virada para novo periodo

1. ajuste a vigencia em `VIGENCIA_PERIODOS` ou valide o proximo periodo;
2. rode `atividades_garantirPeriodoVigente()`;
3. confira se foi criada uma nova planilha historica do periodo encerrado na pasta de historico;
4. confira se nela existem as abas de atividades, presencas e `META`;
5. confira se as abas antigas foram removidas da planilha operacional;
6. confira se as novas abas do periodo vigente foram criadas automaticamente com o layout esperado.

### Verificacao de arquivamento

1. rode `atividades_arquivarPeriodosAntigos()`;
2. confirme a criacao da planilha historica do periodo dentro da pasta;
3. confirme as copias das abas e a aba `META`;
4. confirme que a planilha operacional manteve apenas o periodo vigente;
5. confira o registro funcional em `Atividades_Log`.

### Membro que entra no meio do periodo

1. registre um evento `INGRESSO` em `MEMBER_EVENTOS_VINCULO` com `DATA_EVENTO` posterior ao inicio do periodo;
2. rode `atividades_sincronizarPresencasPeriodoVigente()`;
3. confirme `STATUS_NO_PERIODO = ENTRADA_POSTERIOR`;
4. confirme `DATA_ENTRADA_NO_PERIODO`;
5. confirme `N/A` nas atividades anteriores ao ingresso.

### Membro que sai no meio do periodo

1. registre um evento `DESLIGAMENTO_VOLUNTARIO`, `DESLIGAMENTO_ADMINISTRATIVO` ou `DESLIGAMENTO_POR_FALTAS` com `STATUS_EVENTO = HOMOLOGADO`;
2. rode `atividades_sincronizarPresencasPeriodoVigente()`;
3. confirme que a linha do membro permanece;
4. confirme `STATUS_NO_PERIODO = DESLIGADO_NO_PERIODO`;
5. confirme `DATA_SAIDA_NO_PERIODO`;
6. confirme `N/A` nas atividades posteriores a data de saida.

### Membro suspenso no meio do periodo

1. registre um evento `SUSPENSAO` com `STATUS_EVENTO = HOMOLOGADO`;
2. rode `atividades_sincronizarPresencasPeriodoVigente()`;
3. confirme `STATUS_NO_PERIODO = SUSPENSO_NO_PERIODO`;
4. confirme `MOTIVO_ALTERACAO_NO_PERIODO = SUSPENSAO`;
5. confirme `N/A` nas atividades posteriores a data do evento.

### Falta simples com aviso

1. marque `F` em uma coluna dinamica de `Presencas_<PERIODO>` para um membro elegivel;
2. rode `atividades_notificarFaltasPendentes()`;
3. confirme a nova saida em `MAIL_SAIDA` e o log correspondente em `Atividades_Log`;
4. confirme que o e-mail traz `CODIGO_ATIVIDADE`, prazo de 48 horas e link do formulario oficial.

### Justificativa deferida

1. rode `atividades_importarJustificativasFaltas()` apos receber uma resposta na planilha bruta;
2. confira a linha em `Justificativas_Faltas` com `STATUS_ANALISE = PENDENTE`;
3. altere `STATUS_ANALISE` para `DEFERIDA`;
4. confirme que a celula correspondente em `Presencas_<PERIODO>` muda de `F` para `J`;
5. confirme a nova saida em `MAIL_SAIDA` com o resultado deferido.

### Justificativa indeferida

1. importe a resposta normalmente;
2. altere `STATUS_ANALISE` para `INDEFERIDA`;
3. confirme que a celula correspondente permanece `F`;
4. confira `DECISAO_APLICADA_NA_PRESENCA = F_MANTIDA`;
5. confirme a nova saida em `MAIL_SAIDA` com o resultado indeferido.

### Conversao de `J` para `A`

1. defira duas justificativas do mesmo membro no mesmo periodo;
2. confirme que, apos a segunda, uma das justificativas deferidas permanece `J` e a outra passa a `A`;
3. confira `DECISAO_APLICADA_NA_PRESENCA = J_PARA_A` na linha que recebeu o abono;
4. rode `atividades_recalcularAbonosPeriodoVigente()` se quiser forcar a reconciliacao manual.

## Backlog V2

- automacoes de comunicacao usando a central `MAIL_SAIDA`, `MAIL_EVENTOS` e `MAIL_INDICE`;
- reconciliacao automatica de convidados e participantes externos por base tratada;
- sincronizacao mais rica das regras especiais de apresentacoes;
- refinamentos adicionais de auditoria do processo de arquivamento;
- consolidacao de metricas e relatorios historicos multi-periodo;
- suporte completo a multiplas janelas no mesmo periodo, como suspensao seguida de retorno;
- integracao mais rica com a norma complementar para tratar suspensoes, reversoes de decisao e reprocessamento historico de abonos.
