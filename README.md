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
- seed padrao e nao destrutivo de `Atividades_Config` quando a aba estiver vazia;
- sincronizacao da aba de periodo vigente;
- inicializacao e sincronizacao historica da aba oficial de presencas dos membros;
- fluxo V1 de justificativas de faltas com base bruta de formulario, aba oficial de analise, reflexo automatico em presencas e abono visual `J -> A`.

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
- `ID_ATIVIDADE` e criado apenas quando a celula estiver vazia e a linha tiver ao menos `TIPO_ATIVIDADE` e `DATA_ATIVIDADE`;
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
