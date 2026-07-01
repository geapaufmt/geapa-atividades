# Jobs V2 de comunicacao do modulo Atividades

## Objetivo

Os jobs V2 planejam e enfileiram cobrancas, lembretes e convites no Mail Hub do
`GEAPA_CORE`. Eles nao enviam e-mail diretamente, nao possuem outbox propria e
nao criam triggers automaticamente.

Acoes transacionais do Portal continuam em
`43_atividades_v2_mail_hub_integracao.gs`. Comunicacoes programadas ficam em
`44_atividades_v2_mail_hub_jobs.gs`.

## Eventos

- `APRESENTACAO_COBRAR_TITULO_EIXO`;
- `APRESENTACAO_COBRAR_MATERIAL`;
- `APRESENTACAO_COBRAR_FOTO_REUNIAO`;
- `APRESENTACAO_LEMBRETE_APRESENTADOR`;
- `APRESENTACAO_PENDENCIAS_SECRETARIA`;
- `ATIVIDADE_LEMBRETE_MEMBROS`;
- `ATIVIDADE_CONVITE_PROFESSOR`;
- `ATIVIDADE_LEMBRETE_PROFESSOR`;
- `ATIVIDADE_CONVITE_CONVIDADO`;
- `ATIVIDADE_LEMBRETE_CONVIDADO`.

Pendencias administrativas sao enviadas somente a Secretaria, usando Pessoas
V2 e Vigencias V2. `MAIL_CONFIG` guarda apenas controles tecnicos. Membros aplicaveis sao
resolvidos pelo Core na data da atividade. Professores e convidados vem de
`Atividades_Envolvidos` ou da pessoa principal da atividade.

## Fontes e elegibilidade

- `Atividades`: data, status, publicacao, acesso e regras gerais;
- `Atividades_Apresentacoes`: status e marcadores de cobranca/envio;
- `Atividades_Arquivos`: fonte oficial de slide/material e foto;
- `Atividades_Envolvidos`: professores e convidados vinculados;
- `Atividades_Config`: regras herdadas do modelo homologado;
- Pessoas/Vigencias V2: identidades, vinculos e Secretaria vigente.

Slides e fotos com status `RECEBIDO`, `REENVIADO`, `APROVADO`, `HISTORICO` ou
`DISPENSADO` sao considerados atendidos. Fotos historicas tratadas pela
repopulacao nao voltam a ser cobradas.

## Configuracao

Os prazos normativos vem primeiro da aba `PARAMETROS_OPERACIONAIS`, localizada
pelo Registry com a key `NORMAS_PARAMETROS_OPERACIONAIS`. Somente registros com
`VIGENTE=SIM` e modulo `APRESENTACOES`, `ATIVIDADES`, `GERAL` ou vazio sao
considerados. Havendo duplicidade, registros com `PERMITE_AUTOMACAO=SIM` tem
preferencia.

A precedencia e:

1. `options.config` da execucao manual;
2. `PARAMETROS_OPERACIONAIS` para prazos e limites normativos;
3. `Atividades_Config` para fallback especifico do modelo;
4. `MAIL_CONFIG` para controles tecnicos;
5. Script Properties;
6. defaults seguros do codigo.

`MAIL_CONFIG` continua controlando ativacao, modo de teste, e-mail de teste e
limite de lote. Ele nao e a fonte normativa principal dos prazos.
`PORTAL_CONFIG` nao participa desses jobs, pois suas chaves controlam o
comportamento do Portal e nao a execucao da central de e-mail.

A configuracao-base usa `CacheService` por 5 minutos. Para uma homologacao logo
apos alterar chaves, informe `forceRefreshConfig=true` na chamada manual.
Nesse modo, o cache local e removido e `MAIL_CONFIG` e relido diretamente pela
key do Registry, sem reutilizar eventual snapshot em cache do Core. A funcao
`atividadesV2_mailReprocessarLembretesAprovadosD1Dev()` ja aplica essa opcao.
Assim, prazos podem ser alterados atualizando `VALOR`, `UNIDADE` e `VIGENTE` na
linha normativa, sem editar o codigo nem fazer novo deploy. O fallback por
modelo usa `PRAZO_FOTO_REUNIAO_HORAS_APOS` de `Atividades_Config` quando nenhum
parametro operacional de foto estiver disponivel.

### Parametros normativos

- `PRAZO_INICIO_COBRANCA_TITULO_EIXO_APRESENTACAO`: inicio da janela D-4;
- `FREQUENCIA_COBRANCA_TITULO_EIXO_APRESENTACAO`: intervalo convertido para horas;
- `MAX_COBRANCAS_TITULO_EIXO_APRESENTACAO`: limite de cobrancas;
- `PRAZO_INICIO_COBRANCA_MATERIAL_APRESENTACAO`: inicio da janela D-4;
- `FREQUENCIA_COBRANCA_MATERIAL_APRESENTACAO`: intervalo convertido para horas;
- `MAX_COBRANCAS_MATERIAL_APRESENTACAO`: limite de cobrancas;
- `PRAZO_INICIO_COBRANCA_FOTO_REUNIAO`: horas apos o fim da atividade;
- `PRAZO_ENVIO_ARQUIVO_APRESENTACAO`: fallback do prazo da foto;
- `FREQUENCIA_COBRANCA_FOTO_REUNIAO`: intervalo em horas;
- `MAX_COBRANCAS_FOTO_REUNIAO`: limite de cobrancas.

Valores em `DIAS` sao convertidos para horas quando a chave interna exige
`HORAS`. Se um parametro estiver ausente ou invalido, o diagnostico registra um
warning e informa o fallback em `configSources`.

Para a regra homologada D-4 a D-1, os parametros de inicio devem valer `4
DIAS`, as frequencias devem equivaler a `24 HORAS` e os limites de titulo/eixo
e material devem valer `4`. D0 somente entra quando
`MAIL_COBRAR_DIA_ATIVIDADE=SIM` for configurado explicitamente.

Principais chaves:

- `MAIL_JOBS_ATIVOS` (padrao `NAO`);
- `MAIL_COBRANCA_TITULO_EIXO_ATIVA`;
- `MAIL_COBRANCA_MATERIAL_ATIVA`;
- `MAIL_COBRANCA_FOTO_ATIVA`;
- `MAIL_LEMBRETE_APRESENTADOR_ATIVO`;
- `MAIL_LEMBRETE_MEMBROS_ATIVO`;
- `MAIL_CONVITE_PROFESSOR_ATIVO`;
- `MAIL_LEMBRETE_PROFESSOR_ATIVO`;
- `MAIL_DIAS_ANTES_COBRANCA_TITULO_EIXO`;
- `MAIL_DIAS_ANTES_COBRANCA_MATERIAL`;
- `MAIL_DIAS_ANTES_LEMBRETE_APRESENTADOR`;
- `MAIL_DIAS_ANTES_LEMBRETE_MEMBROS`;
- `MAIL_DIAS_ANTES_CONVITE_PROFESSOR`;
- `MAIL_DIAS_ANTES_LEMBRETE_PROFESSOR`;
- `MAIL_INTERVALO_HORAS_COBRANCA_TITULO_EIXO`;
- `MAIL_INTERVALO_HORAS_COBRANCA_MATERIAL`;
- `MAIL_INTERVALO_HORAS_COBRANCA_FOTO`;
- `MAIL_MAX_COBRANCAS_TITULO_EIXO`;
- `MAIL_MAX_COBRANCAS_MATERIAL`;
- `MAIL_MAX_COBRANCAS_FOTO`;
- `MAIL_HORAS_APOS_APRESENTACAO_COBRANCA_FOTO`;
- `MAIL_COBRAR_DIA_ATIVIDADE` (padrao `NAO`);
- `MAIL_DIAS_MAX_APOS_COBRANCA_FOTO`;
- `MAIL_JOB_BATCH_LIMIT` (padrao `25`, maximo `100`);
- `MAIL_BCC_BATCH_SIZE` (padrao `50`, maximo efetivo `500`);
- `MAIL_LEMBRETE_MEMBROS_TO_VISIVEL` (e-mail operacional visivel no lembrete coletivo);
- `MAIL_JOB_MODO_TESTE` (padrao `SIM`);
- `MAIL_JOB_EMAIL_TESTE`.

No modo de teste, o processamento exige `MAIL_JOB_EMAIL_TESTE` ou `emailTeste`
na chamada. Com `MAIL_JOB_MODO_TESTE=NAO`, o job usa os destinatarios reais e
ignora eventual e-mail de teste antigo, salvo quando `emailTeste` for passado
explicitamente naquela execucao.

O modo real exige `MAIL_JOBS_ATIVOS=SIM`. Nao ha mais confirmacao adicional por
chamada: o desligamento pode ser feito nessa chave ou na central de mensageria
do Core. Limite de lote, elegibilidade e deduplicacao continuam obrigatorios.

## Funcoes dry-run

- `atividadesV2_mailDiagnosticarCobrancasApresentacoesDev(options)`;
- `atividadesV2_mailDiagnosticarLembretesDev(options)`;
- `atividadesV2_mailDiagnosticarPendenciasSecretariaDev(options)`;
- `atividadesV2_mailDiagnosticarConvitesDev(options)`;
- `atividadesV2_mailDiagnosticarJobsDev(options)`.

Diagnosticos nao escrevem, nao enfileiram e nao processam a outbox. O retorno
inclui contadores, motivos de bloqueio, destinatarios mascarados e correlation
keys previstas. `configSources` mostra valor efetivo, origem, unidade,
`parametroId` e se houve fallback. `configSourcesPorAtividade` mostra eventual
fallback especifico de `Atividades_Config`.

Para `ATIVIDADE_LEMBRETE_MEMBROS`, cada exemplo tambem informa total de membros
aplicaveis, e-mails validos, duplicidades removidas, `toVisivel` mascarado,
quantidade de CCO, tamanho do lote e total de linhas previstas. A amostra de CCO
e limitada e mascarada; listas completas nao sao gravadas em logs.

## Funcoes reais

- `atividadesV2_mailProcessarCobrancasApresentacoesDev(options)`;
- `atividadesV2_mailProcessarLembretesDev(options)`;
- `atividadesV2_mailProcessarPendenciasSecretariaDev(options)`;
- `atividadesV2_mailProcessarConvitesDev(options)`;
- `atividadesV2_mailProcessarJobsDev(options)`.

Todas aceitam `idAtividade`, `idApresentacao`, `emailTeste`, `limit`, `dryRun`
e `processOutbox`. Convites aceitam ainda `forceReenvio=true`, somente quando
`idAtividade` tambem e informado. `processOutbox` e `false` por padrao. O enfileiramento usa
`GEAPA_CORE.coreMailQueueOutgoing` e correlation keys com evento, entidade e
janela/numero da cobranca. Em envios individuais, a correlation key usa token
deterministico do destinatario e nao inclui RGA, ID_PESSOA ou e-mail em claro.

## Homologacao DEV

1. Rode `atividadesV2_setupDatabaseDev()` para garantir os cabecalhos novos de
   controle de cobranca de foto.
2. Mantenha `MAIL_JOBS_ATIVOS=NAO`.
3. Execute um diagnostico filtrado por `idAtividade` ou `idApresentacao`.
4. Confira elegibilidade, bloqueios, e-mails mascarados e correlation keys.
5. Configure `MAIL_JOB_MODO_TESTE=SIM` e `MAIL_JOB_EMAIL_TESTE`.
6. Ative `MAIL_JOBS_ATIVOS=SIM` somente para o teste controlado.
7. Execute a funcao real com `limit` pequeno e `processOutbox=false`.
8. Confira `MAIL_SAIDA` e os marcadores em `Atividades_Apresentacoes`.
9. Processe a outbox manualmente apenas quando autorizado.
10. Desative novamente `MAIL_JOBS_ATIVOS` ao terminar a homologacao.

## Liberacao de destinatarios reais

Depois da homologacao, configure `MAIL_JOBS_ATIVOS=SIM` e
`MAIL_JOB_MODO_TESTE=NAO`. A chamada abaixo passa a enfileirar destinatarios
reais elegiveis, sem exigir `confirmarEnvioReal`:

```javascript
atividadesV2_mailProcessarJobsDev({
  limit: 25,
  processOutbox: false,
  forceRefreshConfig: true
});
```

`processOutbox=false` continua sendo o padrao recomendado: o modulo Atividades
apenas grava contratos no Mail Hub, e a central processa a outbox pelo mecanismo
proprio. Para interromper novos enfileiramentos, use `MAIL_JOBS_ATIVOS=NAO`;
para interromper o envio central, desative a mensageria no Core.

## Lembrete disparado pela aprovacao de titulo/eixos

Ao aprovar ou editar e aprovar titulo/eixos pelo Portal, o backend avalia e
enfileira imediatamente `ATIVIDADE_LEMBRETE_MEMBROS`. Isso ocorre somente quando:

- a atividade ja esta `PUBLICADA`;
- o acesso nao e `RESTRITA_DIRETORIA` nem `OCULTA`;
- a visibilidade e `MEMBROS`, `PUBLICA` ou, exclusivamente nesse disparo
  transacional, `DIRETORIA`;
- a atividade nao esta cancelada, suspensa ou arquivada;
- a data esta em D-1, conforme `MAIL_DIAS_ANTES_LEMBRETE_MEMBROS`;
- `MAIL_JOBS_ATIVOS=SIM`;
- o lembrete ainda nao foi registrado como enviado.

Nesse gatilho, a aprovacao explicita substitui a exigencia do campo
`EXIGE_LEMBRETE` e permite a comunicacao quando a visibilidade operacional ainda
e `DIRETORIA`. Isso nao altera a visibilidade da atividade nem a expoe no Portal.
Publicacao, classificacao de acesso, janela e deduplicacao nunca sao ignoradas.
A acao do Portal nao processa a outbox e nao falha caso o Mail Hub
esteja desativado: ela retorna `lembreteMembrosQueue` ou um warning seguro.

Para recuperar aprovacoes D-1 realizadas antes desse enfileiramento, execute sem
argumentos `atividadesV2_mailReprocessarLembretesAprovadosD1Dev()`. A rotina
considera somente apresentacoes com titulo/eixos aprovados, nao processa a outbox
e respeita a deduplicacao.

As correlation keys dos lembretes de membros incluem o modo `TESTE` ou `REAL`.
Assim, uma homologacao redirecionada para `MAIL_JOB_EMAIL_TESTE` nao bloqueia o
envio real posterior aos membros. `MAIL_JOB_EMAIL_TESTE` pode permanecer
preenchido: ele somente substitui destinatarios quando `MAIL_JOB_MODO_TESTE=SIM`.

O lembrete geral e coletivo. Em modo real, cada atividade/janela gera uma linha
por lote em `MAIL_SAIDA`: `MAIL_LEMBRETE_MEMBROS_TO_VISIVEL` fica em `to`, os
membros aplicaveis ficam somente em `bcc` e `cc` permanece vazio. O tamanho do
lote e controlado por `MAIL_BCC_BATCH_SIZE`; a correlation key usa atividade,
janela, modo e numero do lote, sem token individual de membro.

Em modo de teste, existe uma unica linha destinada exclusivamente a
`MAIL_JOB_EMAIL_TESTE`, sem membros reais em `to`, `cc` ou `bcc`. Esse teste nao
marca `LEMBRETE_MEMBROS_ENVIADO`. No modo real, o marcador e sua data somente
sao atualizados quando todos os lotes forem aceitos pelo Mail Hub ou reconhecidos
como duplicados validos. Se o destinatario operacional estiver ausente no modo
real, o job bloqueia com `MAIL_LEMBRETE_MEMBROS_TO_VISIVEL_AUSENTE`.

Para conferir D-4, D-3, D-2 e D-1 sem alterar o relogio do sistema, use `agora`
no diagnostico e mantenha a atividade filtrada. O item deve ficar elegivel uma
vez a cada 24 horas, parar em D0 por padrao e respeitar os marcadores de ultima
cobranca.

```javascript
atividadesV2_mailDiagnosticarCobrancasApresentacoesDev({
  idApresentacao: 'APR-2026-1-0011',
  agora: '2026-08-10T09:00:00-04:00',
  forceRefreshConfig: true
});
```

Para a foto, teste um instante anterior e outro posterior ao horario final da
atividade acrescido de `MAIL_HORAS_APOS_APRESENTACAO_COBRANCA_FOTO`. Antes do
prazo o motivo deve ser `FORA_DA_JANELA_FOTO`; depois do prazo, a foto pendente
pode ser elegivel.

Exemplo seguro:

```javascript
atividadesV2_mailProcessarCobrancasApresentacoesDev({
  idApresentacao: 'APR-2026-1-0011',
  emailTeste: 'email-de-teste@exemplo.com',
  limit: 3,
  processOutbox: false
});
```

## Agendamento futuro

Depois da homologacao, um administrador pode criar manualmente um trigger
time-driven para uma funcao wrapper aprovada. Este pacote nao instala nem
altera triggers. O job deve continuar com lote limitado e o Mail Hub deve ser
processado por seu proprio mecanismo controlado.

## Fora do escopo

- notificacoes internas do Portal;
- Firestore;
- mudancas em presenca, frequencia, justificativas ou regras de apresentacao;
- envio direto por Gmail;
- criacao automatica de triggers;
- alteracoes na outbox central.
