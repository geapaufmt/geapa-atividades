# Contrato de Chamada do Portal - Atividades v2 DEV

## Objetivo

Preparar o primeiro fluxo operacional de diretoria no Portal GEAPA: buscar, salvar rascunho, finalizar e reabrir chamada/frequencia de uma atividade usando somente a base `ATIVIDADES_V2_DB`.

Esta etapa nao altera producao, nao escreve na base antiga, nao cria triggers, nao envia e-mails, nao gera certificados, nao implementa autochamada e nao coloca justificativa/abono dentro da tela de chamada.

O Portal deve expor a chamada como uma interface simples de duas marcacoes mutuamente exclusivas:

```text
Membro              Presencial   Remoto
Luis Putton         [x]          [ ]
Renata Andrade      [ ]          [x]
Fulano              [ ]          [ ]
```

Mapeamento operacional:

- Presencial marcado -> `PRESENTE_PRESENCIAL` / `P`;
- Remoto marcado -> `PRESENTE_REMOTO` / `R`;
- Sem marcacao no rascunho -> status vazio ou ausencia de registro;
- Sem marcacao ao finalizar -> `FALTA` / `F`;
- Membro nao aplicavel/bloqueado -> `NAO_SE_APLICA` / `N/A`.

## Funcoes Publicas

### `atividadesV2_portalGetChamada(idAtividade, contexto)`

Busca a tela de chamada operacional para uma atividade.

Regras:

- valida `ID_ATIVIDADE` no padrao `ATV-AAAA-S-NNNN`;
- aceita somente `SECRETARIO`, `DIRETORIA` e `ADMIN_TECNICO`;
- bloqueia `MEMBRO`;
- valida se a atividade existe na v2 DEV;
- recusa atividade `CANCELADA` ou `ARQUIVADA`;
- exige que a atividade conte presenca/falta ou exija lista de presenca;
- valida a janela operacional configurada em `portal_config` antes de carregar participantes;
- permite visualizar chamada ja salva/finalizada conforme permissao, mesmo fora da janela de registro;
- lista membros aplicaveis pela data da atividade via GEAPA Core;
- se a chamada estiver finalizada, mescla registros oficiais de `Atividades_Presencas_Registros`;
- se a chamada nao estiver finalizada, restaura o ultimo rascunho salvo em `Portal_Acoes` quando existir;
- inclui convidados/externos previstos em `Atividades_Convites`, com campos seguros.

### `atividadesV2_portalSalvarChamada(payload, contexto)`

Processa rascunho, finalizacao ou reabertura da chamada.

Regras:

- valida permissao no backend;
- usa `LockService`;
- revalida a janela operacional antes de salvar ou finalizar;
- revalida membros aplicaveis pela data da atividade;
- impede presenca/falta para membro nao aplicavel;
- valida status de presenca;
- em `SALVAR`, grava apenas snapshot persistente em `Portal_Acoes`;
- em `SALVAR`, nao escreve em `Atividades_Presencas_Registros`;
- em `SALVAR`, nao transforma sem marcacao em falta, nao atualiza frequencia e nao gera falta justificavel;
- em `FINALIZAR`, transforma membros aplicaveis sem marcacao em `FALTA`;
- em `FINALIZAR`, grava a chamada oficial em `Atividades_Presencas_Registros`;
- em `REABRIR`, altera apenas o status operacional da chamada para permitir ajustes;
- faz upsert canonico por `ID_REGISTRO_PRESENCA` e tambem por `ID_ATIVIDADE + TIPO_PARTICIPANTE + ID_PESSOA/RGA/ID_REFERENCIA`;
- preserva `ID_REGISTRO_PRESENCA` legado quando encontra um registro antigo por RGA e o novo payload chega com `ID_PESSOA`;
- inativa duplicatas ativas detectadas pela mesma chave canonica;
- escreve presencas oficiais em lote somente na operacao `FINALIZAR`;
- registra log seguro em `Atividades_Log`;
- registra status/auditoria em `Portal_Acoes`;
- invalida caches de frequencia e justificativas somente apos `FINALIZAR`;
- promove justificativas previas somente na operacao `FINALIZAR`, quando uma falta correspondente passa a existir.
- apos `FINALIZAR`, avalia o ciclo operacional da atividade; se a data/hora ja passou e a chamada finalizada for criterio seguro, atualiza `Atividades.STATUS_OPERACIONAL` para `REALIZADA`.

O retorno inclui `tempoTotalMs` e, em DEV, `performance.totalMs` e `performance.etapas[]` para diagnosticar onde a chamada gastou tempo.

### `atividadesV2_runTestePortalChamadaDev()`

Executa diagnostico seguro sem salvar dados reais.

## Origem da Lista de Membros

A lista de membros vem do GEAPA Core:

```js
geapaCoreListarMembrosParaChamada(dataAtividade, contexto)
```

Quando o Core estiver exposto como biblioteca, o modulo tambem tenta:

```js
GEAPA_CORE.portal.listarMembrosParaChamada(dataAtividade, contexto)
```

O Core aplica a regra de aplicabilidade por data usando `MEMBERS_ATUAIS` e, quando disponivel, `MEMBER_EVENTOS_VINCULO`.

## Abas de Escrita

Rascunho persistente:

```text
Portal_Acoes
```

O rascunho usa `TIPO_ACAO = CHAMADA_RASCUNHO_SALVO` e grava o snapshot em `PAYLOAD_JSON`. A aba `Portal_Acoes` nao possui coluna `DETALHES_JSON`; esse nome fica reservado para `Atividades_Log`.

Chamada oficial:

```text
Atividades_Presencas_Registros
```

`Atividades_Presencas_Registros` so e alterada na operacao `FINALIZAR`.

Chaves de upsert:

```text
ID_REGISTRO_PRESENCA
ID_ATIVIDADE + TIPO_PARTICIPANTE + ID_PESSOA
ID_ATIVIDADE + TIPO_PARTICIPANTE + RGA
ID_ATIVIDADE + TIPO_PARTICIPANTE + ID_REFERENCIA
```

Formato gerado:

```text
PRS-AAAA-S-NNNN-IDREFERENCIA
```

Exemplo:

```text
PRS-2026-1-0005-202321801022
```

## Status Permitidos

| STATUS_PRESENCA | CODIGO_PRESENCA |
| --- | --- |
| PRESENTE_PRESENCIAL | P |
| PRESENTE_REMOTO | R |
| FALTA | F |
| NAO_SE_APLICA | N/A |

Se o payload vier com codigo divergente, o backend corrige para o codigo esperado pelo status.

`FALTA` so deve ser enviada pelo Portal na operacao `FINALIZAR`. Se o Portal tentar enviar `FALTA` em `SALVAR`, o backend rejeita com `STATUS_PRESENCA_INVALIDO`.

Estados como `JUSTIFICADA`, `ABONADA`, `DEFERIDA`, `INDEFERIDA` ou ajuste solicitado pertencem ao fluxo de justificativas, nao a chamada operacional.

## Operacoes

### Rascunho

Payload:

```js
{
  idAtividade: 'ATV-2026-1-0005',
  operacao: 'SALVAR',
  registros: [
    {
      idPessoa: 'PES-001',
      rga: '202311801000',
      nome: 'Nome do membro',
      statusPresenca: 'PRESENTE_PRESENCIAL',
      codigoPresenca: 'P'
    }
  ],
  externos: []
}
```

No rascunho, membros sem marcacao podem ser omitidos. Se forem enviados com status vazio, permanecem apenas no snapshot de `Portal_Acoes`; nao viram `PRESENCA_REGISTRADA`, nao aparecem em `Minha frequencia` e nao geram falta justificavel.

Snapshot salvo em `Portal_Acoes.PAYLOAD_JSON`:

```json
{
  "idAtividade": "ATV-2026-1-0005",
  "statusChamada": "SALVA",
  "registros": [
    {
      "tipoParticipante": "MEMBRO",
      "idPessoa": "PES-001",
      "rga": "202311801000",
      "nome": "Nome do membro",
      "marcacao": "PRESENCIAL",
      "statusPresenca": "PRESENTE_PRESENCIAL",
      "codigoPresenca": "P"
    }
  ],
  "salvoEm": "2026-06-22T00:00:00.000Z",
  "salvoPor": "usuario@dominio.com"
}
```

### Finalizacao

Payload:

```js
{
  idAtividade: 'ATV-2026-1-0005',
  operacao: 'FINALIZAR',
  registros: [
    {
      idPessoa: 'PES-001',
      rga: '202311801000',
      nome: 'Nome do membro',
      statusPresenca: 'PRESENTE_REMOTO',
      codigoPresenca: 'R'
    }
  ],
  externos: []
}
```

Na finalizacao, o backend reconsulta os membros aplicaveis no Core. Se o Portal nao enviar registros no payload de finalizacao, o backend usa o ultimo rascunho salvo. Para cada membro aplicavel que nao veio no payload nem no rascunho, gera `FALTA/F`. Para membros nao aplicaveis, gera `NAO_SE_APLICA/N/A`.

Depois de gravar as presencas oficiais e registrar `CHAMADA_FINALIZADA`, o backend avalia apenas a atividade finalizada. Se `STATUS_OPERACIONAL` estiver elegivel e a data/hora ja tiver passado, a atividade passa de `PLANEJADA`/`AGENDADA`/`PUBLICADA`/`EM_ANDAMENTO` para `REALIZADA`. Status protegidos como `CANCELADA`, `ARQUIVADA`, `INATIVA`, `EXCLUIDA` e `SUSPENSA` nunca sao sobrescritos automaticamente.

### Reabertura

Payload:

```js
{
  idAtividade: 'ATV-2026-1-0005',
  operacao: 'REABRIR'
}
```

A reabertura registra `CHAMADA_REABERTA` em `Portal_Acoes`, grava log tecnico e permite novo salvamento/finalizacao conforme permissao e janela operacional. Ao abrir a chamada reaberta, os registros oficiais atuais sao usados como base; um novo `SALVAR` apos a reabertura passa a gravar novo snapshot em `Portal_Acoes`.

## Reconciliacao de chamadas

Quando uma atividade ja possui registros oficiais completos em `Atividades_Presencas_Registros`, mas `Portal_Acoes` nao possui `CHAMADA_FINALIZADA` vigente, use:

```js
atividadesV2_diagnosticarReconciliacaoChamadasDev()
atividadesV2_reconciliarChamadasDev({ dryRun: true })
atividadesV2_reconciliarChamadasDev({ dryRun: false })
atividadesV2_aplicarReconciliacaoChamadasDev()
```

A reconciliacao nao finaliza chamada incompleta. Ela exige atividade passada, status nao protegido, ausencia de `CHAMADA_REABERTA` vigente, codigos validos, ausencia de duplicidade ativa e cobertura de todos os membros aplicaveis retornados pelo Core. Para operacao manual sem editar parametros, use `atividadesV2_aplicarReconciliacaoChamadasDev()`. Casos inseguros ficam apenas como alertas.

## Janela Operacional

A janela de registro de chamada vem da aba `portal_config` da planilha de parametros operacionais. O modulo le essas chaves com cache curto no Apps Script:

```text
ATIVIDADES_CHAMADA_ANTECEDENCIA_MINUTOS
ATIVIDADES_CHAMADA_TOLERANCIA_POS_MINUTOS
ATIVIDADES_DESTACAR_PROXIMA
ATIVIDADES_PRELOAD_DETALHES
ATIVIDADES_PRELOAD_LIMITE
```

Padrao atual, caso a configuracao nao esteja disponivel: 60 minutos antes e 60 minutos depois.

Alterar a antecedencia de 60 para 30 minutos em `portal_config` nao exige deploy; a mudanca passa a valer apos expirar o cache curto.

## Performance e Cache

O backend usa caches curtos para reduzir o tempo de carregamento da chamada:

- atividade por `ID_ATIVIDADE`;
- membros aplicaveis por data da atividade;
- status da chamada por `ID_ATIVIDADE`;
- presencas oficiais existentes por `ID_ATIVIDADE`;
- rascunho de chamada por `ID_ATIVIDADE`.

Ao salvar rascunho, o backend invalida apenas caches da propria chamada/rascunho. Ao finalizar, invalida caches da chamada e caches dos membros afetados. Nenhuma operacao recalcula views `PORTAL_*` no clique. No rascunho, tambem nao tenta promover justificativas previas. As views devem continuar sendo atualizadas por rotinas oficiais de materializacao ou job posterior.

O Portal deve usar o bloco `performance` para medir:

- abertura da planilha;
- leitura de atividades/status/presencas/convites;
- consulta ao Core para membros;
- escrita de rascunho ou presencas oficiais;
- invalidacao de cache;
- tempo total.

## Segurança

- O Portal nunca escreve direto em planilhas.
- O front-end esconder botoes nao substitui validacao.
- `MEMBRO` comum nao pode buscar nem salvar chamada operacional.
- O retorno nao expoe e-mail completo, logs, observacoes internas ou dados sensiveis de terceiros.
- Convidados/externos retornam apenas dados seguros para renderizacao.
- Escritas usam `LockService`.
- Logs usam contadores e IDs, sem payload sensivel.

## Teste Manual

1. Publique ao menos uma atividade DEV que permita chamada.
2. Execute:

```js
atividadesV2_runTestePortalChamadaDev()
```

3. Para buscar a chamada:

```js
atividadesV2_portalGetChamada('ATV-2026-1-0005', { perfil: 'DIRETORIA' })
```

4. Para salvar rascunho de chamada em DEV:

```js
atividadesV2_portalSalvarChamada({
  idAtividade: 'ATV-2026-1-0005',
  registros: [
    {
      tipoParticipante: 'MEMBRO',
      rga: '202311801000',
      nome: 'Nome do membro',
      statusPresenca: 'PRESENTE_PRESENCIAL',
      codigoPresenca: 'P',
      observacoes: ''
    }
  ],
  externos: []
}, { perfil: 'DIRETORIA' })
```

Confirme que `Portal_Acoes` recebeu `CHAMADA_RASCUNHO_SALVO` e que `Atividades_Presencas_Registros` nao mudou.

5. Para finalizar chamada em DEV, informe `operacao: 'FINALIZAR'`. Confirme na aba `Atividades_Presencas_Registros` que membros sem marcacao viraram `FALTA` somente apos esta operacao.

6. Para reabrir:

```js
atividadesV2_portalSalvarChamada({
  idAtividade: 'ATV-2026-1-0005',
  operacao: 'REABRIR'
}, { perfil: 'DIRETORIA' })
```

7. Conferir:

- uma atividade + um membro gera no maximo um registro ativo;
- registro antigo por RGA e payload novo com `ID_PESSOA` atualizam a mesma linha;
- `Portal_Acoes` registra `CHAMADA_RASCUNHO_SALVO`, `CHAMADA_FINALIZADA` ou `CHAMADA_REABERTA`;
- `Atividades_Log` registra a acao sem payload sensivel;
- rascunho nao aparece em `Minha frequencia`;
- rascunho nao gera falta justificavel;
- caches de frequencia/justificativas sao invalidados somente apos finalizacao;
- views `PORTAL_*` continuam sendo atualizadas apenas por rotinas de materializacao.

## Fora de Escopo Nesta Etapa

- edicao de atividade;
- justificativa de falta;
- certificados;
- e-mails;
- triggers automaticos;
- troca para producao;
- alteracao da base antiga.
