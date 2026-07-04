# Estabilizacao das escritas do Portal

## Objetivo

As escritas iniciadas pelo Portal terminam a resposta interativa assim que a
alteracao oficial no Google Sheets e concluida. Firestore continua sendo apenas
cache/read model. Mail Hub, views e invalidacoes de cache nao fazem parte do
ponto de confirmacao da gravacao oficial.

## Contrato de resposta

Os endpoints alterados retornam, sem remover os campos legados:

```javascript
{
  ok: true,
  code: 'REGISTRADO',
  message: 'Solicitacao registrada.',
  userMessage: 'Solicitacao registrada.',
  entityId: '...',
  warnings: [],
  retrySafe: false,
  data: {}
}
```

`retrySafe: false` e intencional: em timeout, o cliente deve consultar a tela
ou o historico antes de reenviar.

## Idempotencia

O Portal envia `requestId` no formato `GEAPA-REQ-*` e `clientSubmittedAt`. O
backend usa o `requestId` como `Portal_Acoes.ID_ACAO_PORTAL`.

- o mesmo `requestId`, acao e usuario retorna o resultado registrado;
- nenhuma segunda escrita oficial e executada;
- reutilizacao do ID por outra acao ou usuario e bloqueada;
- a busca usa o cabecalho `ID_ACAO_PORTAL` e `TextFinder`, sem indice fixo.

A protecao cobre justificativas, titulo/eixo, material, foto, criacao por
modelo, criacao direta e alteracoes administrativas de atividade.

## Pos-processamento

Uma gravacao concluida cria uma linha com
`STATUS_PROCESSAMENTO = CONCLUIDO_PENDENCIAS`. O job
`atividadesV2_jobPortal` processa primeiro essa fila e depois atualiza as views.

O worker tenta:

1. invalidar caches;
2. sincronizar o read model Firestore;
3. enfileirar o Mail Hub;
4. enfileirar lembretes aplicaveis.

Falhas secundarias geram `CONCLUIDO_COM_AVISOS`, sem transformar uma escrita
oficial bem-sucedida em erro para o usuario.

## Diagnostico seguro

`Atividades_Log` recebe somente acao, IDs operacionais, duracao total, etapa
mais lenta, status e `errorCode`. Texto livre, e-mail, token, arquivo e payload
integral nao sao registrados pelo runtime de desempenho.

Etapas usadas quando aplicaveis:

- `VALIDACAO_USUARIO_PERMISSAO`;
- `VALIDACAO_PAYLOAD`;
- `UPLOAD_ANEXO`;
- `ESCRITA_PLANILHA_OFICIAL`;
- `ENFILEIRAMENTO_POS_PROCESSAMENTO`;
- `RETORNO_PORTAL`.

## Operacao manual

Comece sempre em dry-run:

```javascript
atividadesV2_runTestePortalWriteRuntime()
atividadesV2_runTestePosEscritasPortalDryRun()
```

O primeiro teste simula falhas de Firestore e Mail Hub apenas em memoria. O
segundo lista ate dez pendencias e nao escreve. Para processar um lote
controlado em DEV pelo editor do Apps Script, selecione e execute:

```javascript
atividadesV2_runProcessarPosEscritasPortalDev()
```

Depois execute o job completo para materializar views e conferir consistencia:

```javascript
atividadesV2_runJobPortalDev()
```

Nenhum trigger novo e instalado por essas funcoes.

## Homologacao

1. Enviar justificativa sem anexo e conferir uma unica linha oficial.
2. Enviar justificativa com anexo e conferir arquivo e linha oficial.
3. Repetir o mesmo `requestId` e confirmar que nenhuma linha e duplicada.
4. Enviar material e foto com rede lenta.
5. Aprovar titulo/eixo e conferir retorno imediato.
6. Simular indisponibilidade de Firestore ou Mail Hub e confirmar `ok: true`
   com `warnings`.
7. Conferir `Atividades_Log` sem e-mail, payload ou conteudo de arquivo.
8. Processar a fila e conferir `Portal_Acoes` e as views `PORTAL_*`.
