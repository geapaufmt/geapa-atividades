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
V2 e Vigencias V2. `MAIL_CONFIG` permanece fallback. Membros aplicaveis sao
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

As chaves podem ser cadastradas manualmente em `Config_GEAPA`, expostas pelo
Core, ou nas Script Properties do projeto Atividades. Opcoes passadas a uma
execucao prevalecem apenas naquela chamada.

A configuracao-base usa `CacheService` por 5 minutos. Para uma homologacao logo
apos alterar chaves, informe `forceRefreshConfig=true` na chamada manual.

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
- `MAIL_DIAS_MAX_APOS_COBRANCA_FOTO`;
- `MAIL_JOB_BATCH_LIMIT` (padrao `25`, maximo `100`);
- `MAIL_JOB_MODO_TESTE` (padrao `SIM`);
- `MAIL_JOB_EMAIL_TESTE`.

No modo de teste, o processamento real exige `emailTeste`. Fora do modo de
teste, uma execucao sem substituicao exige `confirmarEnvioReal=true`.

## Funcoes dry-run

- `atividadesV2_mailDiagnosticarCobrancasApresentacoesDev(options)`;
- `atividadesV2_mailDiagnosticarLembretesDev(options)`;
- `atividadesV2_mailDiagnosticarPendenciasSecretariaDev(options)`;
- `atividadesV2_mailDiagnosticarConvitesDev(options)`;
- `atividadesV2_mailDiagnosticarJobsDev(options)`.

Diagnosticos nao escrevem, nao enfileiram e nao processam a outbox. O retorno
inclui contadores, motivos de bloqueio, destinatarios mascarados e correlation
keys previstas.

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
