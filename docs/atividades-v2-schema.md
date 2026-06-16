# Atividades v2 - Schema inicial

## Por que a v2 existe

A v2 prepara uma base permanente para a operacao futura pelo Portal GEAPA. A V1 continua em producao e nao e substituida nesta fase.

A ideia central e manter as planilhas como banco interno, com historico e operacao no mesmo lugar, sem apagar bases a cada ciclo. O portal podera ler, criar e atualizar dados em fases posteriores, depois de migracao e homologacao.

## Papel das abas

### Bases principais permanentes

`Atividades` e a base central de atividades. Guarda o cadastro operacional e publico de cada atividade, seus status, datas, horarios, local, formato, titulo, eixos tematicos, pessoa principal, links e regras de presenca/certificado.

`Atividades_Apresentacoes` guarda apenas a extensao operacional especifica de apresentacoes de membros. Uma apresentacao referencia uma atividade, mas nao deve ser a fonte principal de data, horario, local, formato, titulo, eixo, apresentador ou visibilidade. Campos legados podem permanecer fisicamente durante a migracao, mas as rotinas novas devem preferir `Atividades`.

`Atividades_Envolvidos` registra pessoas vinculadas a uma atividade, como apresentador, palestrante, instrutor, mediador, debatedor, professor convidado, convidado externo, responsavel interno ou organizador. A pessoa principal fica em `Atividades` para cards/listas rapidas; a composicao completa fica em `Atividades_Envolvidos`.

`Atividades_Presencas_Registros` e a base permanente de presencas. Em vez de depender apenas de colunas dinamicas por periodo, cada participante em cada atividade passa a ter um registro proprio.

### Bases auxiliares

`Atividades_Convites` registra pessoas convidadas ou vinculadas a uma atividade. Convite nao e presenca: ele indica expectativa, envio e confirmacao; a presenca real fica em `Atividades_Presencas_Registros`.

`Justificativas_Faltas` registra o pedido administrativo do membro. A justificativa nao muda a presenca sozinha; o efeito dela deve aparecer nos campos de status/decisao da justificativa e nos campos equivalentes do registro de presenca.

`Atividades_Config` guarda regras padrao por tipo/subtipo de atividade, como obrigatoriedade, contagem de presenca/falta, certificado, prazos e visibilidade.

### Bases tecnicas

`Atividades_Log` e uma trilha tecnica para eventos futuros da v2.

`Portal_Acoes` foi reservada para fila/auditoria de acoes enviadas pelo portal, sem ativar processamento nesta fase.

### Views e resumos para o portal

`PORTAL_ATIVIDADES_CALENDARIO` resume atividades publicaveis em formato de calendario/agenda unica. Apresentacoes futuras aparecem aqui como subtipo de atividade, nao em uma agenda separada.

Ela e materializada a partir da aba `Atividades` da base v2 DEV pela funcao manual `atividadesV2_sincronizarPortalAtividadesCalendarioDev()`. A view contem apenas campos seguros para o Portal e nao inclui e-mails, observacoes internas, logs, presenca nominal, dados privados ou lista de participantes.

`PORTAL_ATIVIDADES_DETALHES` consolida os detalhes de uma atividade a partir de `Atividades`, `Atividades_Envolvidos` e, quando houver vinculo, da extensao operacional em `Atividades_Apresentacoes`. Ela evita cruzamentos em tempo real quando o usuario abre o detalhe no portal.

`PORTAL_APRESENTACOES` resume apresentacoes e seus arquivos publicos como historico/acervo. Ela nao deve ser usada como agenda futura.

`PORTAL_FREQUENCIA_MEMBROS` consolida frequencia por membro e periodo.

`PORTAL_JUSTIFICATIVAS` expoe a situacao das justificativas para consulta.

`PORTAL_PENDENCIAS_DIRETORIA` lista pendencias administrativas derivadas das bases permanentes.

`PORTAL_STATUS_ATIVIDADES` guarda indicadores gerais do ultimo processamento.

## Relacao entre as tres bases principais

`Atividades` e o eixo principal. Cada linha tem um unico `ID_ATIVIDADE`, global e permanente, no padrao `ATV-AAAA-S-NNNN`.

`Atividades_Apresentacoes` referencia a atividade por `ID_ATIVIDADE` e adiciona `ID_APRESENTACAO` para controles de fluxo, cobrancas, notificacoes, arquivos e historico publico.

`Atividades_Envolvidos` referencia a atividade por `ID_ATIVIDADE` e guarda os vinculos individuais. Para pessoas, `ID_PESSOA` e a chave tecnica preferencial quando disponivel; `RGA`, e-mail e nome ficam como auxiliares/legado.

`Atividades_Presencas_Registros` referencia a atividade e, quando a presenca estiver ligada a uma apresentacao, tambem referencia `ID_APRESENTACAO`. Para vinculos individuais, `ID_PESSOA` e a chave tecnica preferencial; `RGA` permanece como campo auxiliar/legado.

## Chave de pessoa

`ID_PESSOA` e a chave tecnica principal para pessoas em apresentacoes, chamadas, justificativas, certificados e participacoes. O Portal pode receber e reenviar `idPessoa`, mas a resolucao e validacao continuam no backend, usando GEAPA_CORE/Pessoas v2 quando disponivel.

`RGA` permanece nas bases internas para conferencia humana e compatibilidade historica. Views publicas e endpoints para perfis comuns nao devem expor RGA, e-mail, observacoes internas, logs, cobrancas ou links privados sem permissao especifica.

## Diferencas importantes

`Atividades` descreve o evento ou compromisso institucional.

`Atividades_Apresentacoes` descreve o fluxo operacional de apresentacao de membro dentro de uma atividade, nao o evento principal.

`Atividades_Presencas_Registros` descreve o comparecimento ou ausencia de uma pessoa em uma atividade.

`Atividades_Envolvidos` descreve quem participa em papel publico/operacional na atividade. Convite e presenca continuam separados: envolvido e uma relacao com a atividade; convite e expectativa/confirmacao; presenca e registro de comparecimento.

`Atividades_Convites` descreve a intencao de convidar, confirmar ou esperar uma pessoa. So vira presenca quando existir registro em `Atividades_Presencas_Registros`.

`Justificativas_Faltas` descreve a solicitacao e analise administrativa. O efeito disciplinar precisa ser refletido no registro de presenca, mantendo os valores antes/depois.

## Proximos passos

1. Rodar `atividadesV2_setupDatabaseDev()` apos cadastrar `ATIVIDADES_V2_DB` no Registry.
2. Conferir abas, cabecalhos, filtros e validacoes na planilha DEV.
3. Rodar `atividadesV2_diagnosticarIdsDev()` antes de normalizar IDs ja migrados.
4. Rodar `atividadesV2_normalizarIdsDev()` para converter IDs antigos da DEV para o padrao unico `ID_ATIVIDADE`.
5. Rodar `atividadesV2_migrarApresentacoesParaAtividadesDevDryRun()` para revisar a migracao da modelagem de apresentacoes.
6. Rodar `atividadesV2_migrarApresentacoesParaAtividadesDev()` para preencher `Atividades` e `Atividades_Envolvidos` em DEV.
7. Atualizar views com `atividadesV2_atualizarViewsPortal({ dryRun: false })`.
8. Homologar fluxos de escrita do portal em DEV antes de qualquer troca de producao.

## Padrao de IDs

A v2 usa apenas `ID_ATIVIDADE` para atividades e referencias cruzadas.

- Atividade: `ATV-AAAA-S-NNNN`, por exemplo `ATV-2026-1-0005`.
- Apresentacao: `APR-AAAA-S-NNNN` ou `APR-AAAA-S-NNNN-01` quando houver mais de uma apresentacao na mesma atividade.
- Presenca: `PRS-AAAA-S-NNNN-IDREFERENCIA`.
- Convite: `CONV-AAAA-S-NNNN-IDREFERENCIA`.
- Justificativa: `JUS-AAAA-S-NNNN-IDREFERENCIA-XX`.

IDs legados da V1 nao sao colunas estruturais na v2. Quando necessario, a rastreabilidade fica em `ORIGEM_REGISTRO` e `OBSERVACOES`.
