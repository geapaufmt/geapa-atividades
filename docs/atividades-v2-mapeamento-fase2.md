# Atividades v2 - Mapeamento inicial da Fase 2

Este documento inicia o desenho da migracao de teste da V1 para a base `ATIVIDADES INTERNAS GEAPA v2 - DEV`.

Nesta fase, o objetivo e mapear dados e riscos. A migracao real deve ser implementada depois, em rotina separada, idempotente, com relatorio de divergencias e sem escrever na producao.

## Premissas

- A V1 continua sendo a fonte operacional de producao ate homologacao.
- A v2 recebe dados apenas na planilha DEV cadastrada como `ATIVIDADES_V2_DB`.
- A migracao deve preservar IDs legados e criar IDs globais novos sem apagar valores antigos.
- A rotina de migracao deve poder rodar mais de uma vez em DEV sem duplicar registros.
- Nenhuma chamada do Portal deve apontar para v2 enquanto a migracao nao for validada.

## Fontes V1

| Fonte V1 | Papel atual | Destino v2 |
| --- | --- | --- |
| `Atividades` | Cadastro operacional das atividades | `Atividades` |
| `Atividades_Apresentacoes` | Controle especifico de apresentacoes de membros | `Atividades_Apresentacoes` |
| `Atividade_Convidados` | Pessoas vinculadas/convidadas para atividades | `Atividades_Convites` |
| `Atividades_Config` | Regras padrao por tipo/subtipo | `Atividades_Config` |
| `Atividades_Log` | Auditoria funcional da V1 | Nao migrar automaticamente nesta fase |
| `Justificativas_Faltas` | Analise de justificativas e efeito em presencas | `Justificativas_Faltas` |
| `Atividades_Periodo_*` | Mapa de atividades por periodo | Apoio para `Atividades_Presencas_Registros` |
| `Presencas_*` | Matriz de presencas por periodo | `Atividades_Presencas_Registros` |

## `Atividades` V1 -> `Atividades` v2

| V1 | v2 | Regra inicial |
| --- | --- | --- |
| `ID_ATIVIDADE` legado | `ID_ATIVIDADE` | Gerar ID novo no padrao `ATV-AAAA-S-NNNN`; guardar rastreabilidade apenas em `OBSERVACOES`. |
| `CLASSIFICACAO_REUNIAO` | `CLASSIFICACAO_REUNIAO` | Copiar. |
| `TIPO_ATIVIDADE` | `TIPO_ATIVIDADE` | Copiar. |
| `SUBTIPO_ATIVIDADE` | `SUBTIPO_ATIVIDADE` | Copiar. |
| `CLASSIFICACAO_ACESSO` | `CLASSIFICACAO_ACESSO` | Copiar e revisar valores para portal. |
| `TITULO` | `TITULO` | Copiar. |
| `TITULO` | `TITULO_PUBLICO` | Inicialmente copiar; depois permitir versao publica. |
| `DESCRICAO` | `DESCRICAO` | Copiar. |
| `DESCRICAO` | `DESCRICAO_PUBLICA` | Inicialmente copiar quando apropriado; revisar privacidade. |
| `DATA_ATIVIDADE` | `DATA_ATIVIDADE` | Copiar. |
| `PERIODO_REFERENCIA` | `PERIODO_REFERENCIA` | Copiar. |
| `HORARIO_INICIO` | `HORARIO_INICIO` | Copiar. |
| `HORARIO_FIM` | `HORARIO_FIM` | Copiar. |
| `LOCAL` | `LOCAL` | Copiar. |
| `FORMATO` | `FORMATO` | Copiar. |
| `RESPONSAVEL_INTERNO` | `RESPONSAVEL_INTERNO` | Copiar. |
| `RESPONSAVEL_EMAIL` | `RESPONSAVEL_EMAIL` | Copiar. |
| `PUBLICO_ALVO` | `PUBLICO_ALVO` | Copiar. |
| `OBRIGATORIA` | `OBRIGATORIA` | Copiar. |
| `EXIGE_CONVOCACAO` | `EXIGE_CONVOCACAO` | Copiar. |
| `EXIGE_LEMBRETE` | `EXIGE_LEMBRETE` | Copiar. |
| `EXIGE_ATA` | `EXIGE_ATA` | Copiar. |
| `EXIGE_MATERIAL` | `EXIGE_MATERIAL` | Copiar. |
| `EXIGE_LISTA_PRESENCA` | `EXIGE_LISTA_PRESENCA` | Copiar. |
| `EXIGE_CONFIRMACAO_PRESENCA` | `EXIGE_CONFIRMACAO_PRESENCA` | Copiar. |
| `CONTA_PRESENCA` | `CONTA_PRESENCA` | Copiar. |
| `CONTA_FALTA` | `CONTA_FALTA` | Copiar. |
| `GERA_CERTIFICADO` | `GERA_CERTIFICADO` | Copiar. |
| `CARGA_HORARIA` | `CARGA_HORARIA` | Copiar ou recalcular quando vazio. |
| `STATUS` | `STATUS_OPERACIONAL` | Converter valores V1 para enum v2. |
| `DATA_REALIZACAO` | `DATA_REALIZACAO` | Copiar. |
| `DATA_LIMITE_ATA` | `DATA_LIMITE_ATA` | Copiar. |
| `DATA_LIMITE_MATERIAL` | `DATA_LIMITE_MATERIAL` | Copiar. |
| `LINK_ATA` | `LINK_ATA` | Copiar. |
| `LINK_MATERIAL` | `LINK_MATERIAL` | Copiar. |
| `ORIGEM_FLUXO` | `ORIGEM_FLUXO` | Copiar, indicando origem V1 quando vazio. |
| `CRIADO_EM` | `CRIADO_EM` | Copiar quando houver. |
| `ATUALIZADO_EM` | `ATUALIZADO_EM` | Copiar quando houver. |
| `OBSERVACOES` | `OBSERVACOES` | Copiar. |
| sem equivalente | `STATUS_PUBLICACAO_PORTAL` | Definir `RASCUNHO` na migracao de teste. |
| sem equivalente | `VISIBILIDADE_PORTAL` | Definir `OCULTA` na migracao de teste. |
| sem equivalente | `ATIVO` | Definir `SIM`, exceto registros arquivados/cancelados conforme regra. |

## `Atividades_Apresentacoes` V1 -> `Atividades_Apresentacoes` v2

| V1 | v2 | Regra inicial |
| --- | --- | --- |
| `ID_APRESENTACAO` | `ID_APRESENTACAO` | Preservar. |
| `ID_ATIVIDADE` legado | `ID_ATIVIDADE` | Resolver pelo mapa gerado em `Atividades`. |
| `PERIODO_REFERENCIA` | `PERIODO_REFERENCIA` | Copiar. |
| `RGA` | `RGA` | Copiar. |
| `NOME_MEMBRO` | `NOME_MEMBRO` | Copiar. |
| `EMAIL_MEMBRO` | `EMAIL_MEMBRO` | Copiar. |
| `DATA_ATIVIDADE` | `DATA_ATIVIDADE` | Copiar. |
| `HORARIO_INICIO` | `HORARIO_INICIO` | Copiar. |
| `HORARIO_FIM` | `HORARIO_FIM` | Copiar. |
| `LOCAL` | `LOCAL` | Copiar. |
| `FORMATO` | `FORMATO` | Copiar. |
| `TITULO_APRESENTACAO` | `TITULO_APRESENTACAO` | Copiar. |
| `EIXO_TEMATICO_PRINCIPAL` | `EIXO_TEMATICO_PRINCIPAL` | Copiar. |
| `EIXO_TEMATICO_SECUNDARIO` | `EIXO_TEMATICO_SECUNDARIO` | Copiar. |
| `STATUS_APRESENTACAO` | `STATUS_APRESENTACAO` | Copiar e normalizar enum se necessario. |
| `DATA_COBRANCA_TITULO_EIXO` | `DATA_COBRANCA_TITULO_EIXO` | Copiar. |
| `QTD_COBRANCAS_TITULO_EIXO` | `QTD_COBRANCAS_TITULO_EIXO` | Copiar. |
| `DATA_CONFIRMACAO_TITULO_EIXO` | `DATA_CONFIRMACAO_TITULO_EIXO` | Copiar. |
| campos de notificacao/convite/lembrete | equivalentes v2 | Copiar flags e datas. |
| `STATUS_ENVIO_ARQUIVO` | `STATUS_ENVIO_ARQUIVO` | Copiar. |
| `DATA_RECEBIMENTO_ARQUIVO` | `DATA_RECEBIMENTO_ARQUIVO` | Copiar. |
| `LINK_ARQUIVO_DRIVE` | `LINK_ARQUIVO_DRIVE` | Copiar. |
| `SYNC_HISTORICO_PUBLICO` | `SYNC_HISTORICO_PUBLICO` | Copiar. |
| `CRIADO_EM` | `CRIADO_EM` | Copiar. |
| `ATUALIZADO_EM` | `ATUALIZADO_EM` | Copiar. |
| `OBSERVACOES` | `OBSERVACOES` | Copiar. |
| sem equivalente | `PUBLICAR_NO_PORTAL` | Definir `NAO` na migracao de teste. |
| sem equivalente | `VISIBILIDADE_PORTAL` | Definir `OCULTA`. |
| sem equivalente | `ELEGIVEL_CERTIFICADO` | Derivar depois; iniciar vazio ou `NAO`. |
| sem equivalente | `ATIVO` | Definir `SIM`, exceto canceladas. |

## `Atividade_Convidados` V1 -> `Atividades_Convites` v2

| V1 | v2 | Regra inicial |
| --- | --- | --- |
| `ID_CONVITE_ATIVIDADE` | `ID_CONVITE_ATIVIDADE` | Preservar. |
| `ID_ATIVIDADE` legado | `ID_ATIVIDADE` | Resolver pelo mapa gerado em `Atividades`. |
| `TIPO_VINCULO_PESSOA` | `TIPO_VINCULO_PESSOA` | Copiar e normalizar nomenclatura. |
| `ID_REFERENCIA` | `ID_REFERENCIA` | Copiar. |
| `NOME` | `NOME` | Copiar. |
| `EMAIL` | `EMAIL` | Copiar. |
| `PAPEL_NA_ATIVIDADE` | `PAPEL_NA_ATIVIDADE` | Copiar. |
| `CONVITE_ENVIADO` | `CONVITE_ENVIADO` | Copiar. |
| `DATA_ENVIO_CONFIRMACAO` | `DATA_ENVIO_CONVITE` | Usar como melhor aproximacao quando nao houver outro campo. |
| `CONFIRMADO` | `CONFIRMADO` | Copiar. |
| `DATA_CONFIRMACAO` | `DATA_CONFIRMACAO` | Copiar. |
| `PRESENCA_REGISTRADA` | `PRESENCA_REGISTRADA` | Copiar como indicador historico, sem criar presenca real automaticamente. |
| `OBSERVACOES` | `OBSERVACOES` | Copiar. |
| `CRIADO_EM` | `CRIADO_EM` | Copiar. |
| `ATUALIZADO_EM` | `ATUALIZADO_EM` | Copiar. |
| sem equivalente | `TIPO_CONVITE` | Definir a partir de papel/tipo de vinculo quando possivel. |
| sem equivalente | `PRESENCA_ESPERADA` | Derivar de confirmacao, se houver regra aprovada. |
| sem equivalente | `ATIVO` | Definir `SIM`. |

## `Justificativas_Faltas` V1 -> `Justificativas_Faltas` v2

| V1 | v2 | Regra inicial |
| --- | --- | --- |
| `ID_JUSTIFICATIVA` | `ID_JUSTIFICATIVA` | Preservar. |
| `ID_ATIVIDADE` legado | `ID_ATIVIDADE` | Resolver pelo mapa gerado em `Atividades`. |
| `PERIODO` | `PERIODO_REFERENCIA` | Copiar/normalizar. |
| `RGA` | `RGA` | Copiar. |
| `NOME_MEMBRO` | `NOME_MEMBRO` | Copiar. |
| `DATA_ATIVIDADE` | `DATA_ATIVIDADE` | Copiar. |
| `TITULO_ATIVIDADE` | `TITULO_ATIVIDADE` | Copiar. |
| `DATA_LIMITE_JUSTIFICATIVA` | `DATA_LIMITE_JUSTIFICATIVA` | Copiar. |
| `DATA_ENVIO` | `DATA_ENVIO` | Copiar. |
| `MOTIVO_DECLARADO` | `MOTIVO_DECLARADO` | Copiar. |
| `DESCRICAO_JUSTIFICATIVA` | `DESCRICAO_JUSTIFICATIVA` | Copiar. |
| `POSSUI_DOCUMENTO_COMPROBATORIO` | `POSSUI_DOCUMENTO_COMPROBATORIO` | Copiar. |
| `LINK_DOCUMENTO_COMPROBATORIO` | `LINK_DOCUMENTO_COMPROBATORIO` | Copiar. |
| `STATUS_ANALISE` | `STATUS_ANALISE` | Copiar e normalizar enum. |
| `DATA_ANALISE` | `DATA_ANALISE` | Copiar. |
| `ANALISADO_POR` | `ANALISADO_POR` | Copiar. |
| `DECISAO_APLICADA_NA_PRESENCA` | `DECISAO_APLICADA_NA_PRESENCA` | Copiar. |
| `VALOR_ANTES` | `VALOR_ANTES` | Copiar. |
| `VALOR_DEPOIS` | `VALOR_DEPOIS` | Copiar. |
| `OBSERVACOES` | `OBSERVACOES_INTERNAS` | Copiar. |
| sem equivalente | `ID_REGISTRO_PRESENCA` | Resolver depois que presencas forem migradas. |
| sem equivalente | `OBSERVACAO_PUBLICA` | Deixar vazio na migracao de teste. |
| sem equivalente | `ORIGEM_ENVIO` | Definir `V1`. |
| sem equivalente | `ATIVO` | Definir `SIM`. |

## `Presencas_*` e `Atividades_Periodo_*` -> `Atividades_Presencas_Registros`

A V1 usa matriz de presenca por periodo. A v2 deve transformar cada celula de presenca em um registro permanente.

| Fonte | v2 | Regra inicial |
| --- | --- | --- |
| Nome da aba `Presencas_<PERIODO>` | `PERIODO_REFERENCIA` | Extrair do nome da aba. |
| Linha do membro em `Presencas_*` | `RGA`, `NOME_PARTICIPANTE`, `EMAIL_PARTICIPANTE` | Copiar metadados do membro. |
| Coluna dinamica de atividade | `ID_ATIVIDADE` | Resolver pelo mapa de atividades e gerar ID novo `ATV-AAAA-S-NNNN`. |
| `Atividades_Periodo_*`.`COLUNA_PRESENCA` | vinculo com coluna dinamica | Usar como ponte preferencial. |
| `Atividades_Periodo_*`.`ID_ATIVIDADE` | `ID_ATIVIDADE` | Usar como chave legada apenas para resolver o novo ID. |
| mapa de atividades v2 | `ID_ATIVIDADE` | Resolver pelo ID novo global e permanente. |
| valor da celula (`P`, `R`, `F`, `J`, `A`, `N/A`) | `CODIGO_PRESENCA` | Copiar codigo bruto. |
| valor da celula | `STATUS_PRESENCA` | Converter para status semantico v2. |
| valor da celula | `MODALIDADE_PRESENCA` | `P` = presencial, `R` = remota, demais conforme regra. |
| atividade correspondente | `DATA_ATIVIDADE`, `TITULO_ATIVIDADE`, `TIPO_ATIVIDADE`, `SUBTIPO_ATIVIDADE` | Copiar do mapa de atividade. |
| atividade correspondente | `CONTA_PRESENCA`, `CONTA_FALTA`, `GERA_CERTIFICADO`, `CARGA_HORARIA_TOTAL_ATIVIDADE` | Copiar regras da atividade. |
| sem equivalente | `ID_REGISTRO_PRESENCA` | Gerar ID novo deterministico por periodo + atividade + RGA. |
| sem equivalente | `TIPO_PARTICIPANTE` | Definir `MEMBRO` para matriz oficial V1. |
| sem equivalente | `PRESENCA_REGISTRADA` | `SIM` quando houver codigo de presenca/falta conhecido. |
| sem equivalente | `ORIGEM_REGISTRO` | Definir `MIGRACAO_V1_TESTE`. |
| sem equivalente | `ATIVO` | Definir `SIM`. |

Conversao inicial sugerida:

| Codigo V1 | `STATUS_PRESENCA` v2 | `MODALIDADE_PRESENCA` v2 |
| --- | --- | --- |
| `P` | `PRESENTE_PRESENCIAL` | `PRESENCIAL` |
| `R` | `PRESENTE_REMOTO` | `REMOTA` |
| `F` | `FALTA` | `NAO_APLICAVEL` |
| `J` | `JUSTIFICADA` | `NAO_APLICAVEL` |
| `A` | `ABONADA` | `NAO_APLICAVEL` |
| `N/A` | `NAO_SE_APLICA` | `NAO_APLICAVEL` |
| vazio | `PENDENTE` | `NAO_APLICAVEL` |

## `Atividades_Config` V1 -> `Atividades_Config` v2

| V1 | v2 | Regra inicial |
| --- | --- | --- |
| `TIPO_ATIVIDADE` | `TIPO_ATIVIDADE` | Copiar. |
| `SUBTIPO_ATIVIDADE` | `SUBTIPO_ATIVIDADE` | Copiar. |
| `CLASSIFICACAO_REUNIAO` | `CLASSIFICACAO_REUNIAO` | Copiar. |
| `CLASSIFICACAO_ACESSO` | `CLASSIFICACAO_ACESSO_PADRAO` | Copiar. |
| `EXIGE_CONVOCACAO` | `EXIGE_CONVOCACAO_PADRAO` | Copiar. |
| `EXIGE_LEMBRETE` | `EXIGE_LEMBRETE_PADRAO` | Copiar. |
| `EXIGE_ATA` | `EXIGE_ATA_PADRAO` | Copiar. |
| `EXIGE_MATERIAL` | `EXIGE_MATERIAL_PADRAO` | Copiar. |
| `EXIGE_LISTA_PRESENCA` | `EXIGE_LISTA_PRESENCA_PADRAO` | Copiar. |
| `EXIGE_CONFIRMACAO_PRESENCA` | `EXIGE_CONFIRMACAO_PRESENCA_PADRAO` | Copiar. |
| `CONTA_PRESENCA` | `CONTA_PRESENCA_PADRAO` | Copiar. |
| `CONTA_FALTA` | `CONTA_FALTA_PADRAO` | Copiar. |
| `GERA_CERTIFICADO` | `GERA_CERTIFICADO_PADRAO` | Copiar. |
| `ATIVO` | `ATIVO` | Copiar. |
| `OBSERVACOES` | `OBSERVACOES` | Copiar. |
| sem equivalente | `ID_CONFIG` | Gerar ID deterministico por tipo/subtipo/classificacao. |
| sem equivalente | `VISIBILIDADE_PORTAL_PADRAO` | Definir `OCULTA` inicialmente. |
| sem equivalente | `STATUS_PUBLICACAO_PORTAL_PADRAO` | Definir `RASCUNHO`. |
| sem equivalente | `PRAZO_JUSTIFICATIVA_HORAS` | Definir depois de regra aprovada. |

## Pontos em aberto

- Regras finas de numeracao quando houver atividades antigas sem ano, semestre ou sequencial recuperavel.
- Como tratar atividades canceladas, arquivadas e registros historicos incompletos.
- Regras de privacidade para `TITULO_PUBLICO` e `DESCRICAO_PUBLICA`.
- Se registros de convidados com `PRESENCA_REGISTRADA=SIM` devem virar presenca v2 ou apenas permanecer como convite historico.
- Como vincular justificativas antigas aos novos `ID_REGISTRO_PRESENCA`.
- Se logs V1 devem ser migrados, resumidos ou deixados apenas como historico legado.

## Proxima rotina sugerida

Antes da migracao com escrita, foi criada a funcao read-only:

`atividadesV2_planejarMigracaoTeste()`

Ela deve contar registros da V1, estimar quantas linhas seriam geradas na v2, listar campos sem destino, listar campos v2 sem origem e detectar chaves duplicadas potenciais.

## Planejamento read-only implementado

`atividadesV2_planejarMigracaoTeste()` le:

- planilha operacional V1 descoberta pelo Registry atual;
- planilha v2 DEV descoberta por `ATIVIDADES_V2_DB`;
- fontes fixas V1 (`Atividades`, `Atividades_Apresentacoes`, `Atividade_Convidados`, `Justificativas_Faltas`, `Atividades_Config`);
- abas dinamicas `Atividades_Periodo_*` e `Presencas_*`.

Ela retorna:

- contagem de linhas por fonte fixa;
- chaves duplicadas por fonte;
- periodos dinamicos encontrados;
- quantidade de membros por aba `Presencas_*`;
- quantidade de colunas dinamicas de presenca;
- estimativa total de registros em `Atividades_Presencas_Registros`;
- campos V1 sem destino automatico;
- campos v2 sem origem direta na V1.

A funcao nao escreve dados, nao limpa abas, nao cria registros e nao altera o Registry.

## Migracao de teste DEV implementada

Foram criadas duas entradas manuais:

- `atividadesV2_migrarTesteDevDryRun()`: simula a migracao sem escrever dados.
- `atividadesV2_migrarTesteDev()`: copia dados para a v2 DEV, sem alterar a V1.

A migracao usa upsert por chave natural:

| Aba v2 | Chave de upsert |
| --- | --- |
| `Atividades` | `ID_ATIVIDADE` |
| `Atividades_Apresentacoes` | `ID_APRESENTACAO` |
| `Atividades_Convites` | `ID_CONVITE_ATIVIDADE` |
| `Justificativas_Faltas` | `ID_JUSTIFICATIVA` |
| `Atividades_Config` | `ID_CONFIG` |
| `Atividades_Presencas_Registros` | `ID_REGISTRO_PRESENCA` |

Ela nao limpa abas e nao apaga dados. Quando a chave ja existe no destino, atualiza apenas colunas presentes no payload de migracao, preservando campos v2 nao mapeados/manualizados.

Na primeira versao, `Atividades_Presencas_Registros` migra apenas celulas de presenca com valor (`P`, `R`, `F`, `J`, `A`, `N/A`). Celulas vazias continuam fora da copia para evitar inflar a base com pendencias historicas sem significado confirmado.

## Normalizacao de IDs DEV

A arquitetura foi simplificada para usar apenas `ID_ATIVIDADE`, no padrao `ATV-AAAA-S-NNNN`.

Foram adicionadas:

- `atividadesV2_diagnosticarIdsDev()`: lista IDs atuais, linhas sem ano/semestre/sequencial, inconsistencias entre abas e registros nao normalizaveis.
- `atividadesV2_normalizarIdsDev()`: escreve o novo `ID_ATIVIDADE` na v2 DEV e propaga para apresentacoes, presencas, convites, justificativas, `Portal_Acoes` e views `PORTAL_*` quando aplicavel.

Campos antigos `ID_ATIVIDADE_GLOBAL` e `ID_ATIVIDADE_LOCAL` foram removidos dos schemas futuros. Se existirem fisicamente na planilha DEV por migracoes anteriores, ficam preservados ate uma limpeza futura com backup logico; nao devem ser usados por novas rotinas.
