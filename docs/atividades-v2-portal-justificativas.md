# Atividades V2 - Justificativas pelo Portal

Este pacote prepara o fluxo de justificativas na base `ATIVIDADES INTERNAS GEAPA v2 - DEV`. O Portal continua como interface, Apps Script como backend/API e Google Sheets como banco interno.

## Escopo

Funcoes publicas:

```js
atividadesV2_portalGetMinhasJustificativas(contexto)
atividadesV2_portalGetMinhaFrequencia(contexto)
atividadesV2_portalGetJustificativasConfig(contexto)
atividadesV2_portalEnviarJustificativa(payload, contexto)
atividadesV2_portalListarJustificativasPendentesDiretoria(contexto)
atividadesV2_portalAnalisarJustificativa(payload, contexto)
atividadesV2_promoverJustificativasPreviasDev(options)
atividadesV2_diagnosticarFluxoJustificativasPortalDev()
atividadesV2_runTestePortalJustificativasDev()
```

O pacote nao cria abas, nao escreve em producao, nao envia e-mails, nao cria triggers, nao implementa auto-chamada e nao altera a chamada operacional.

## Abas

Leitura/escrita operacional:

- `Atividades_Presencas_Registros`
- `Justificativas_Faltas`
- `Portal_Acoes`
- `Atividades_Log`

Views atualizadas por rotina:

- `PORTAL_JUSTIFICATIVAS`
- `PORTAL_FREQUENCIA_MEMBROS`
- `PORTAL_PENDENCIAS_DIRETORIA`
- `PORTAL_STATUS_ATIVIDADES`

O Portal nunca escreve diretamente em `PORTAL_*`.

## Fluxos de Tela

O fluxo fica dividido em duas entradas:

- `Atividades -> Proximas atividades`: justificativa de ausencia futura, antes de existir falta.
- `Meu Vinculo -> Minhas justificativas`: justificativa de falta ja registrada em `Atividades_Presencas_Registros`.

## Proximas Atividades

Os cards retornados por `atividadesV2_portalGetCalendario(contexto)` podem trazer:

- `podeJustificarAusenciaFutura`;
- `justificativaPreviaEnviada`;
- `idJustificativaPrevia`;
- `statusJustificativaPrevia`;
- `motivoJustificativaPreviaIndisponivel`;
- `mensagemJustificativaPrevia`.

Quando `podeJustificarAusenciaFutura = true`, o Portal deve mostrar `Justificar ausencia futura`. O envio usa o mesmo endpoint `atividadesV2_portalEnviarJustificativa`, mas sem `idRegistroPresenca`.

Payload de ausencia futura:

```js
{
  idAtividade,
  idRegistroPresenca: "",
  motivoDeclarado,
  descricaoJustificativa,
  possuiDocumentoComprobatorio,
  linkDocumentoComprobatorio,
  observacoes
}
```

O backend valida a janela previa com a logica V1 (`atividades_classificarTemporalidadeJustificativa_` e relacionadas). Se estiver dentro da janela, grava `STATUS_ANALISE = PREVIA`, `ID_REGISTRO_PRESENCA` vazio e `DECISAO_APLICADA_NA_PRESENCA = NAO_APLICADA`.

Se ja existir justificativa ativa do membro para a mesma atividade, o card deve mostrar que a justificativa previa foi enviada e orientar acompanhamento em `Meu Vinculo -> Minhas justificativas`.

## Minhas Justificativas

`atividadesV2_portalGetMinhasJustificativas(contexto)` retorna:

- `faltasJustificaveis`: registros de falta do membro ainda sem justificativa ativa;
- `justificativas`: justificativas ja enviadas e seu status;
- `resumo`;
- `ultimaAtualizacao`.

Cada falta justificavel informa prazo, situacao de prazo, se exige ciencia por fora do prazo e mensagem segura para o Portal.

## Minha Frequencia

`atividadesV2_portalGetMinhaFrequencia(contexto)` le a aba operacional `Atividades_Presencas_Registros`, filtra no backend pelo usuario logado e retorna registros por ciclo.

Formato resumido:

```js
{
  resumoGeral: {},
  cicloAtual: "2026/1",
  ciclos: [
    {
      ciclo: "2026/1",
      cicloOperacional: "GEAPA_2026",
      ano: "2026",
      semestre: "1",
      resumo: {},
      registros: [
        {
          idRegistroPresenca,
          idAtividade,
          dataAtividade,
          tituloAtividade,
          tipoAtividade,
          subtipoAtividade,
          statusPresenca,
          statusPresencaRotulo,
          cargaHorariaConsiderada,
          contaFalta,
          contaPresenca,
          idJustificativa,
          statusJustificativa,
          podeEnviarJustificativa,
          podeVerJustificativa,
          podeComplementarJustificativa,
          acaoJustificativa
        }
      ]
    }
  ]
}
```

Acoes possiveis em `acaoJustificativa`:

- `ENVIAR_JUSTIFICATIVA`;
- `ENVIAR_JUSTIFICATIVA_FORA_PRAZO`;
- `VER_JUSTIFICATIVA`;
- `COMPLEMENTAR_JUSTIFICATIVA`.

Atividades futuras continuam em `Atividades -> Proximas atividades`; `Minha frequencia` deve focar em registros de presenca/falta ja existentes.

## Envio

Payload para falta passada:

```js
{
  idRegistroPresenca,
  idAtividade,
  motivoDeclarado,
  descricaoJustificativa,
  possuiDocumentoComprobatorio,
  linkDocumentoComprobatorio,
  confirmouCienciaForaPrazo,
  observacoes
}
```

Validacoes principais para falta passada:

- registro existe e pertence ao usuario;
- registro conta falta e esta em `FALTA`;
- atividade permite justificativa;
- nao ha justificativa ativa duplicada, exceto reenvio quando `STATUS_ANALISE = AJUSTE_SOLICITADO`;
- motivo e descricao sao obrigatorios;
- motivo deve usar enum padronizado;
- comprovante ou link de documento e obrigatorio quando `POSSUI_DOCUMENTO_COMPROBATORIO = SIM`.

Motivos aceitos:

- `SAUDE`
- `COMPROMISSO_ACADEMICO`
- `COMPROMISSO_PROFISSIONAL`
- `MOTIVO_PESSOAL_RELEVANTE`
- `FORCA_MAIOR`
- `OUTRO`

O Portal pode consultar `atividadesV2_portalGetJustificativasConfig(contexto)` para obter opcoes e limites de upload. Quando o motivo for `OUTRO`, a descricao deve trazer detalhamento suficiente.

## Upload de Comprovante

O envio de justificativa aceita comprovante em base64:

```js
{
  idRegistroPresenca,
  motivoDeclarado: "SAUDE",
  descricaoJustificativa,
  possuiDocumentoComprobatorio: "SIM",
  documentoComprobatorio: {
    nomeArquivo: "atestado.pdf",
    mimeType: "application/pdf",
    conteudoBase64: "..."
  }
}
```

Formatos aceitos inicialmente: PDF, JPG/JPEG, PNG, DOC e DOCX. Limite inicial: 10 MB.

O backend salva o arquivo no Drive e grava o link gerado em `LINK_DOCUMENTO_COMPROBATORIO`. Para isso, configure a pasta raiz por Script Properties:

- `ATIVIDADES_V2_JUSTIFICATIVAS_ROOT_FOLDER_ID`; ou
- `JUSTIFICATIVAS_PASTA_RAIZ_ID`.

Como fallback, o backend tenta localizar no Registry:

- `JUSTIFICATIVAS_PASTA_RAIZ`; ou
- `ATIVIDADES_V2_JUSTIFICATIVAS_PASTA_RAIZ`.

A organizacao dentro da pasta raiz segue:

```text
2026-1/
  ATV-2026-1-0001/
    Nome membro - RGA - ID_JUSTIFICATIVA.pdf
```

Nao foram criadas colunas novas para metadados do arquivo neste pacote; o contrato minimo continua sendo `POSSUI_DOCUMENTO_COMPROBATORIO` e `LINK_DOCUMENTO_COMPROBATORIO`.

Envio fora do prazo e permitido. O backend calcula o prazo com `atividades_calculateJustificativaDeadline_` quando disponivel. Se estiver fora do prazo, o payload deve trazer ciencia obrigatoria; a condicao fica registrada em `OBSERVACOES_INTERNAS`, sem criar coluna nova.

Se existir uma justificativa `PREVIA` ativa para a mesma atividade/membro e a falta ja tiver sido registrada, o envio de falta passada reaproveita a justificativa previa, vincula `ID_REGISTRO_PRESENCA` e promove para `ENVIADA`.

## Analise

Payload:

```js
{
  idJustificativa,
  decisao,
  observacaoPublica,
  observacoesInternas
}
```

Decisoes:

- `DEFERIR` -> `STATUS_ANALISE = DEFERIDA`, presenca fica `JUSTIFICADA`, decisao `FALTA_JUSTIFICADA`;
- `ABONAR` -> `STATUS_ANALISE = ABONADA`, presenca fica `ABONADA`, decisao `FALTA_ABONADA`;
- `INDEFERIR` -> `STATUS_ANALISE = INDEFERIDA`, presenca permanece `FALTA`, decisao `MANTER_FALTA`;
- `SOLICITAR_AJUSTE` -> `STATUS_ANALISE = AJUSTE_SOLICITADO`, membro pode reenviar.

`INDEFERIR` e `SOLICITAR_AJUSTE` exigem observacao publica ou interna. Justificativa fora do prazo nao e indeferida automaticamente; a decisao segue sendo da Diretoria/Secretaria.

## Pendencias

`PORTAL_PENDENCIAS_DIRETORIA` passa a receber:

- `JUSTIFICATIVA_AGUARDANDO_ANALISE`;
- `JUSTIFICATIVA_AJUSTE_SOLICITADO`;
- `JUSTIFICATIVA_COMPROVANTE_AUSENTE`;
- `JUSTIFICATIVA_FORA_DO_PRAZO`.

Essas pendencias sao geradas pelas views, a partir da aba-base `Justificativas_Faltas`.

Justificativas com `STATUS_ANALISE = PREVIA` nao aparecem como pendencia da gestao. Elas passam a aparecer apenas depois da promocao para `ENVIADA`.

## Promocao Depois da Chamada

`atividadesV2_promoverJustificativasPreviasDev(options)` localiza justificativas `PREVIA` ativas e registros de presenca `FALTA` da mesma atividade/pessoa. Quando encontra correspondencia:

- preenche `ID_REGISTRO_PRESENCA` em `Justificativas_Faltas`;
- altera `STATUS_ANALISE` de `PREVIA` para `ENVIADA`;
- preenche `ID_JUSTIFICATIVA` e `STATUS_JUSTIFICATIVA = ENVIADA` em `Atividades_Presencas_Registros`;
- registra `Atividades_Log`.

O salvamento de chamada V2 tambem tenta essa promocao apos gravar presencas, sem alterar a logica de chamada alem do vinculo posterior da justificativa.

## Lembrete de Atividade

O lembrete de atividades gerais que contam falta passa a orientar o membro a usar o Portal GEAPA:

`Proximas atividades -> Justificar ausencia futura`.

Durante a homologacao, o botao do e-mail ainda pode abrir o formulario antigo como fallback, mas o texto deixa o Portal como caminho preferencial.

## Testes Manuais

1. Rode `atividadesV2_diagnosticarFluxoJustificativasPortalDev()`.
2. Rode `atividadesV2_runTestePortalJustificativasDev()`.
3. Consultar `atividadesV2_portalGetCalendario(contexto)` com atividade futura justificavel e conferir `podeJustificarAusenciaFutura`.
4. Enviar justificativa previa sem `idRegistroPresenca` e conferir `STATUS_ANALISE = PREVIA`.
5. Tentar duplicar justificativa previa e confirmar bloqueio.
6. Rodar `atividadesV2_promoverJustificativasPreviasDev({ dryRun: true })`.
7. No Portal, consultar `atividadesV2_portalGetMinhasJustificativas(contexto)` com membro que tenha falta.
8. Enviar justificativa dentro do prazo.
9. Enviar justificativa fora do prazo sem ciencia e confirmar bloqueio.
10. Enviar justificativa fora do prazo com ciencia e conferir `OBSERVACOES_INTERNAS`.
11. Enviar justificativa com `documentoComprobatorio.conteudoBase64` e conferir link no Drive.
12. Consultar `atividadesV2_portalGetMinhaFrequencia(contexto)` e conferir ciclos/registros.
13. Listar pendencias com `atividadesV2_portalListarJustificativasPendentesDiretoria(contexto)`.
14. Testar `DEFERIR`, `ABONAR`, `INDEFERIR` e `SOLICITAR_AJUSTE`.

Depois das escritas, conferir:

- `Justificativas_Faltas`;
- `Atividades_Presencas_Registros`;
- `Portal_Acoes`;
- `Atividades_Log`;
- views `PORTAL_*` atualizadas.

## Futuro

A regra automatica de "duas faltas justificadas geram uma abonada" nao foi automatizada neste pacote. Ela deve ser tratada como rotina de fechamento ou melhoria especifica, mantendo a decisao manual `ABONAR` disponivel para gestao.
