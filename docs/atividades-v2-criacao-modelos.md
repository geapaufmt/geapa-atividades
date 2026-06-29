# Criacao de atividades por modelo homologado

## Contrato

O fluxo novo usa `Atividades_Config` como fonte de verdade. O Portal envia `ID_CONFIG` e apenas os dados concretos da ocorrencia; tipo, subtipo, presenca, falta, certificado, justificativa, acesso, publicacao e demais regras sao relidos e aplicados pelo backend.

Funcoes publicas:

- `atividades_listarModelosCriacaoPortal(contexto)`;
- `atividades_obterModeloCriacaoPortal(idConfig, contexto)`;
- `atividades_listarMembrosApresentadoresElegiveis(idConfig, referencia, contexto)`;
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

## APRESENTACAO_MEMBRO

O agendamento exige somente modelo, data, horarios, formato, local e membro apresentador. Titulo publico, descricao, eixos tematicos e material nao sao aceitos como requisitos nesta etapa. O backend gera `Apresentacao de membro - {nome}` como titulo tecnico/publico inicial, define `Secretaria GEAPA` como responsavel interno, cria a extensao em `Atividades_Apresentacoes` com titulo/eixo e material pendentes e registra o apresentador em `Atividades_Envolvidos`.

A listagem de apresentadores vem de Pessoas v2/GEAPA_CORE, considera apenas membros efetivos ativos e, quando o campo estiver disponivel, com Portal ativo. O backend resolve a data pela key `VIGENCIAS_V2_CICLOS`, usando a aba oficial `CICLOS`, e cruza o `ID_CICLO` com `Atividades` e `Atividades_Apresentacoes`. Quem ja possui apresentacao ativa em qualquer semestre do mesmo ciclo e retornado apenas para conferencia, com `elegivelApresentacao=false`; tentar seleciona-lo retorna `EXCECAO_NECESSARIA`, sem aplicar a excecao.

`Atividades.CICLO` e a referencia primaria. Para registros antigos sem esse campo, a data da atividade e comparada de forma inclusiva com `CICLOS.DATA_INICIO` e `CICLOS.DATA_FIM`. `ANO + SEMESTRE` e usado somente como ultimo fallback legado. Sobreposicao de intervalos gera `CONFIGURACAO_CICLOS_AMBIGUA`.

Enquanto o Registry ainda apontar a key oficial para uma aba legada, a leitura procura primeiro `CICLOS` na mesma planilha e registra aviso tecnico. Os aliases de key, aba e cabecalhos antigos existem apenas para leitura compativel. A lista e ordenada por elegibilidade e depois por RGA, deixando membros sem RGA ao final de cada grupo. O cache usa `ID_CICLO`, por exemplo `membros_apresentadores:GEAPA_2026`. O helper `atividades_modelosCriacaoInvalidatePresenterCachesForChange_` aceita snapshots anterior/atual e deve ser chamado por toda escrita que altere ciclo, subtipo, apresentador, ativacao ou status de uma apresentacao.

O Portal envia `ID_PESSOA` como chave. Nome, RGA e e-mail sao reobtidos no backend e gravados como dados auxiliares. O navegador nao decide elegibilidade nem pode substituir os dados canonicos da pessoa.

Quando o modelo permite ou exige eixo tematico no agendamento, o Portal usa exclusivamente o catalogo oficial retornado por `atividadesV2_portalListarEixosTematicos`. O backend resolve novamente os valores contra a base oficial ativa, rejeita texto livre, eixo inativo e combinacao principal/secundario duplicada. Em `APRESENTACAO_MEMBRO`, os eixos continuam fora do agendamento e pertencem ao fluxo posterior do apresentador.

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
3. Execute `atividades_ajustarModeloApresentacaoMembroConfigDryRun()` e confira as alteracoes propostas.
4. Execute `atividades_ajustarModeloApresentacaoMembroConfig()`.
5. Execute `atividades_runTesteCriacaoPorModeloDev()`.
6. Liste os modelos e membros apresentadores pelo Portal com perfil autorizado.
7. Valide uma ocorrencia e confira `atividadePreview`, `camposHerdados` e `confirmacaoToken`.
8. Confirme a criacao real e confira `Atividades`, `Atividades_Apresentacoes`, `Atividades_Log`, `Portal_Acoes` e as views materializadas.
9. Tente enviar um `CONTA_FALTA`, tipo ou visibilidade diferente do modelo e confirme o retorno `EXCECAO_NECESSARIA` sem escrita.

No retorno do teste, `testeCiclo.semestresMesmoCicloReconhecidos` e `testeCiclo.cachePorIdCiclo` devem ser `true`.

## Fora de escopo

- aprovacao de excecao;
- upload real de materiais ou fotos;
- Firestore;
- publicacao automatica;
- producao.
