# Criacao de atividades por modelo homologado

## Contrato

O fluxo novo usa `Atividades_Config` como fonte de verdade. O Portal envia `ID_CONFIG` e apenas os dados concretos da ocorrencia; tipo, subtipo, presenca, falta, certificado, justificativa, acesso, publicacao e demais regras sao relidos e aplicados pelo backend.

Funcoes publicas:

- `atividades_listarModelosCriacaoPortal(contexto)`;
- `atividades_obterModeloCriacaoPortal(idConfig, contexto)`;
- `atividades_validarCriacaoAtividadePorModelo(payload, contexto)`;
- `atividades_criarAtividadePorModelo(payload, contexto)`;
- `atividades_migrarSchemaAtividadesParaModeloConfigDryRun()`;
- `atividades_migrarSchemaAtividadesParaModeloConfig()`;
- `atividades_runTesteCriacaoPorModeloDev()`.

O contrato anterior `atividadesV2_portalCriarAtividade` permanece disponivel para compatibilidade temporaria, mas nao e o caminho normal do Portal.

## Seguranca

- somente modelos `ATIVO=SIM` e `PERMITE_CRIACAO_PORTAL=SIM` sao listados;
- `PERFIS_QUE_PODEM_CRIAR` e validado novamente no modulo;
- o dry-run emite um token temporario armazenado no cache por ate dez minutos;
- a criacao real reabre `Atividades_Config`, repete todas as validacoes e exige o token do dry-run;
- divergencias em regras sensiveis retornam `EXCECAO_NECESSARIA` e nao sao aplicadas;
- a escrita usa `LockService` e lote por cabecalho;
- o preview publico nao devolve a linha bruta da planilha;
- nenhuma atividade e publicada automaticamente neste pacote.

O status inicial e sempre `PLANEJADA`. A publicacao inicial e `RASCUNHO`, ou `OCULTA` quando o modelo for mais restritivo. A visibilidade inicial e `DIRETORIA`, ou `OCULTA`.

## Schema de Atividades

A migracao adiciona somente ao final, sem reordenar ou remover colunas:

- `ID_CONFIG_MODELO`;
- `NOME_MODELO_PORTAL_SNAPSHOT`;
- `VERSAO_CONFIG_MODELO`;
- `TEM_EXCECAO_CONFIG`;
- `STATUS_EXCECAO_CONFIG`;
- `JUSTIFICATIVA_EXCECAO_CONFIG`;
- `PERMITE_JUSTIFICATIVA`;
- `EXIGE_EIXO_TEMATICO`;
- `PERMITE_EIXO_SECUNDARIO`.

## Ordem de homologacao DEV

1. Execute `atividades_migrarSchemaAtividadesParaModeloConfigDryRun()`.
2. Execute `atividades_migrarSchemaAtividadesParaModeloConfig()`.
3. Execute `atividades_runTesteCriacaoPorModeloDev()`.
4. Liste os modelos pelo Portal com perfil autorizado.
5. Valide uma ocorrencia e confira `atividadePreview`, `camposHerdados` e `confirmacaoToken`.
6. Confirme a criacao real e confira `Atividades`, `Atividades_Log`, `Portal_Acoes` e as views materializadas.
7. Tente enviar um `CONTA_FALTA`, tipo ou visibilidade diferente do modelo e confirme o retorno `EXCECAO_NECESSARIA` sem escrita.

## Fora de escopo

- aprovacao de excecao;
- upload real de materiais ou fotos;
- Firestore;
- publicacao automatica;
- producao.
