# Contrato de Chamada do Portal - Atividades v2 DEV

## Objetivo

Preparar o primeiro fluxo operacional de diretoria no Portal GEAPA: buscar e salvar chamada/frequencia de uma atividade usando somente a base `ATIVIDADES_V2_DB`.

Esta etapa nao altera producao, nao escreve na base antiga, nao cria triggers, nao envia e-mails, nao gera certificados e nao implementa justificativas.

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
- lista membros aplicaveis pela data da atividade via GEAPA Core;
- mescla registros ja salvos em `Atividades_Presencas_Registros`;
- inclui convidados/externos previstos em `Atividades_Convites`, com campos seguros.

### `atividadesV2_portalSalvarChamada(payload, contexto)`

Salva a chamada na aba `Atividades_Presencas_Registros`.

Regras:

- valida permissao no backend;
- usa `LockService`;
- revalida membros aplicaveis pela data da atividade;
- impede presenca/falta para membro nao aplicavel;
- valida status de presenca;
- faz upsert por `ID_REGISTRO_PRESENCA`;
- escreve em lote;
- registra log seguro em `Atividades_Log`.

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

## Aba de Escrita

Destino:

```text
Atividades_Presencas_Registros
```

Chave de upsert:

```text
ID_REGISTRO_PRESENCA
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

4. Para salvar chamada em DEV:

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

## Fora de Escopo Nesta Etapa

- edicao de atividade;
- justificativa de falta;
- certificados;
- e-mails;
- triggers automaticos;
- troca para producao;
- alteracao da base antiga.
