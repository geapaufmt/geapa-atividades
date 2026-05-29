# Atividades v2 - Schema inicial

## Por que a v2 existe

A v2 prepara uma base permanente para a operacao futura pelo Portal GEAPA. A V1 continua em producao e nao e substituida nesta fase.

A ideia central e manter as planilhas como banco interno, com historico e operacao no mesmo lugar, sem apagar bases a cada ciclo. O portal podera ler, criar e atualizar dados em fases posteriores, depois de migracao e homologacao.

## Papel das abas

### Bases principais permanentes

`Atividades` e a base central de atividades. Guarda o cadastro operacional e publico de cada atividade, seus status, datas, responsaveis, links e regras de presenca/certificado.

`Atividades_Apresentacoes` guarda a camada especifica de apresentacoes de membros. Uma apresentacao referencia uma atividade, mas tem campos proprios de membro, titulo, eixo, notificacoes e arquivo.

`Atividades_Presencas_Registros` e a base permanente de presencas. Em vez de depender apenas de colunas dinamicas por periodo, cada participante em cada atividade passa a ter um registro proprio.

### Bases auxiliares

`Atividades_Convites` registra pessoas convidadas ou vinculadas a uma atividade. Convite nao e presenca: ele indica expectativa, envio e confirmacao; a presenca real fica em `Atividades_Presencas_Registros`.

`Justificativas_Faltas` registra o pedido administrativo do membro. A justificativa nao muda a presenca sozinha; o efeito dela deve aparecer nos campos de status/decisao da justificativa e nos campos equivalentes do registro de presenca.

`Atividades_Config` guarda regras padrao por tipo/subtipo de atividade, como obrigatoriedade, contagem de presenca/falta, certificado, prazos e visibilidade.

### Bases tecnicas

`Atividades_Log` e uma trilha tecnica para eventos futuros da v2.

`Portal_Acoes` foi reservada para fila/auditoria de acoes enviadas pelo portal, sem ativar processamento nesta fase.

### Views e resumos para o portal

`PORTAL_ATIVIDADES_CALENDARIO` resume atividades publicaveis em formato de calendario.

Ela e materializada a partir da aba `Atividades` da base v2 DEV pela funcao manual `atividadesV2_sincronizarPortalAtividadesCalendarioDev()`. A view contem apenas campos seguros para o Portal e nao inclui e-mails, observacoes internas, logs, presenca nominal, dados privados ou lista de participantes.

`PORTAL_ATIVIDADES_DETALHES` consolida os detalhes de uma atividade a partir de `Atividades` e, quando houver vinculo, de `Atividades_Apresentacoes`. Ela evita cruzamentos em tempo real quando o usuario abre o detalhe no portal.

`PORTAL_APRESENTACOES` resume apresentacoes e seus arquivos publicos.

`PORTAL_FREQUENCIA_MEMBROS` consolida frequencia por membro e periodo.

`PORTAL_JUSTIFICATIVAS` expoe a situacao das justificativas para consulta.

`PORTAL_PENDENCIAS_DIRETORIA` lista pendencias administrativas derivadas das bases permanentes.

`PORTAL_STATUS_ATIVIDADES` guarda indicadores gerais do ultimo processamento.

## Relacao entre as tres bases principais

`Atividades` e o eixo principal. Cada linha tem um unico `ID_ATIVIDADE`, global e permanente, no padrao `ATV-AAAA-S-NNNN`.

`Atividades_Apresentacoes` referencia a atividade por `ID_ATIVIDADE` e adiciona `ID_APRESENTACAO`.

`Atividades_Presencas_Registros` referencia a atividade e, quando a presenca estiver ligada a uma apresentacao, tambem referencia `ID_APRESENTACAO`.

## Diferencas importantes

`Atividades` descreve o evento ou compromisso institucional.

`Atividades_Apresentacoes` descreve a apresentacao de um membro dentro de uma atividade.

`Atividades_Presencas_Registros` descreve o comparecimento ou ausencia de uma pessoa em uma atividade.

`Atividades_Convites` descreve a intencao de convidar, confirmar ou esperar uma pessoa. So vira presenca quando existir registro em `Atividades_Presencas_Registros`.

`Justificativas_Faltas` descreve a solicitacao e analise administrativa. O efeito disciplinar precisa ser refletido no registro de presenca, mantendo os valores antes/depois.

## Proximos passos

1. Rodar `atividadesV2_setupDatabaseDev()` apos cadastrar `ATIVIDADES_V2_DB` no Registry.
2. Conferir abas, cabecalhos, filtros e validacoes na planilha DEV.
3. Rodar `atividadesV2_diagnosticarIdsDev()` antes de normalizar IDs ja migrados.
4. Rodar `atividadesV2_normalizarIdsDev()` para converter IDs antigos da DEV para o padrao unico `ID_ATIVIDADE`.
5. Planejar migracao de teste da V1 para v2, sem escrever em producao.
6. Criar geradores de views `PORTAL_*` em modo leitura.
7. Homologar fluxos de escrita do portal em DEV antes de qualquer troca de producao.

## Padrao de IDs

A v2 usa apenas `ID_ATIVIDADE` para atividades e referencias cruzadas.

- Atividade: `ATV-AAAA-S-NNNN`, por exemplo `ATV-2026-1-0005`.
- Apresentacao: `APR-AAAA-S-NNNN` ou `APR-AAAA-S-NNNN-01` quando houver mais de uma apresentacao na mesma atividade.
- Presenca: `PRS-AAAA-S-NNNN-IDREFERENCIA`.
- Convite: `CONV-AAAA-S-NNNN-IDREFERENCIA`.
- Justificativa: `JUS-AAAA-S-NNNN-IDREFERENCIA-XX`.

IDs legados da V1 nao sao colunas estruturais na v2. Quando necessario, a rastreabilidade fica em `ORIGEM_REGISTRO` e `OBSERVACOES`.
