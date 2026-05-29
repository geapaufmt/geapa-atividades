# Roadmap - Atividades v2

## Fase 1 - Setup da base DEV

Criar schema, setup manual, abas, cabecalhos, validacoes leves, filtros, congelamento da primeira linha e documentacao. Nao ativar fluxos reais.

## Fase 2 - Migracao de teste da base atual para v2

Criar rotina de leitura da V1 e escrita em copia DEV da v2, com relatorio de divergencias e sem alterar a producao.

Documento inicial de mapeamento: `docs/atividades-v2-mapeamento-fase2.md`.

## Fase 3 - Portal em modo leitura

Gerar ou expor dados da v2 para o portal sem permitir escrita. Validar calendario, apresentacoes, frequencia e justificativas.

## Fase 4 - Portal cria/edita atividade em DEV

Permitir que o portal envie acoes para `Portal_Acoes` e que uma rotina DEV aplique mudancas em `Atividades`.

## Fase 5 - Portal registra chamada em DEV

Implementar registro de presencas em `Atividades_Presencas_Registros`, com auditoria e sem interferir na V1.

## Fase 6 - Justificativas via portal

Permitir envio e acompanhamento de justificativas pelo portal, mantendo decisao administrativa separada do efeito no registro de presenca.

## Fase 7 - Geracao de resumos PORTAL_*

Criar rotinas que preencham as views/resumos `PORTAL_*` a partir das bases permanentes.

## Fase 8 - Certificados_Base

Modelar e gerar uma base certificavel a partir de atividades, presencas, carga horaria e elegibilidade.

## Fase 9 - Homologacao e troca para producao

Comparar V1 e v2, validar dados historicos, aprovar fluxos, congelar plano de rollback e somente entao trocar chamadas de producao.
