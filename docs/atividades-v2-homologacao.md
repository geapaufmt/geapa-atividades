# Atividades v2 - Homologacao

Este roteiro prepara a base `ATIVIDADES INTERNAS GEAPA v2 - DEV` para homologacao antes de ligar as views ao Portal GEAPA.

As rotinas abaixo atuam apenas na base DEV localizada pelo Registry em `ATIVIDADES_V2_DB`. Elas nao alteram producao, nao escrevem na base antiga, nao enviam e-mails, nao geram certificados e nao criam triggers automaticamente.

## Funcoes publicas esperadas

As funcoes abaixo devem existir em `00_module_public_api.gs`:

- `atividadesV2_diagnostico`
- `atividadesV2_conferirConsistencia`
- `atividadesV2_atualizarPortalCalendario`
- `atividadesV2_atualizarPortalDetalhes`
- `atividadesV2_atualizarPortalApresentacoes`
- `atividadesV2_recalcularFrequenciaMembros`
- `atividadesV2_atualizarPortalJustificativas`
- `atividadesV2_atualizarPendenciasDiretoria`
- `atividadesV2_atualizarPortalStatus`
- `atividadesV2_atualizarViewsPortal`
- `atividadesV2_jobPortal`
- `atividadesV2_runTesteDiagnostico`
- `atividadesV2_runTesteAtualizacaoPortalDryRun`
- `atividadesV2_runTesteFrequenciaDryRun`
- `atividadesV2_runTesteJobPortalDryRun`

## Checklist de homologacao manual

### Ordem recomendada

1. Rodar `atividadesV2_runTesteDiagnostico()`.
2. Rodar `atividadesV2_runTesteAtualizacaoPortalDryRun()`.
3. Rodar `atividadesV2_runTesteFrequenciaDryRun()`.
4. Rodar `atividadesV2_runTesteJobPortalDryRun()`.
5. Se os testes estiverem sem erros bloqueantes, rodar `atividadesV2_atualizarViewsPortal({ dryRun: false })`.
6. Conferir as abas `PORTAL_*` no Google Drive.
7. Rodar `atividadesV2_jobPortal({ dryRun: true })` para validar o contrato que o Core pode chamar.
8. So depois de homologado, decidir se o Core chamara `atividadesV2_jobPortal({ dryRun: false })` ou se permanecera em dry-run operacional.

### Abas para conferir no Google Drive

- `Atividades`
- `Atividades_Apresentacoes`
- `Atividades_Presencas_Registros`
- `Justificativas_Faltas`
- `PORTAL_ATIVIDADES_CALENDARIO`
- `PORTAL_ATIVIDADES_DETALHES`
- `PORTAL_APRESENTACOES`
- `PORTAL_FREQUENCIA_MEMBROS`
- `PORTAL_JUSTIFICATIVAS`
- `PORTAL_PENDENCIAS_DIRETORIA`
- `PORTAL_STATUS_ATIVIDADES`
- `Atividades_Log`

### Conferencias minimas

- Cabecalhos esperados existem.
- As views `PORTAL_*` nao expoem observacoes internas, logs privados, e-mails indevidos ou dados pessoais desnecessarios.
- `ID_ATIVIDADE` segue o padrao `ATV-AAAA-S-NNNN`.
- Views usam `ID_ATIVIDADE`, nao IDs antigos.
- Frequencia usa `ID_PESSOA` quando disponivel e preserva `RGA` apenas como auxiliar.
- O `dryRun` gera contadores e nao escreve linhas.
- Escritas reais usam `LockService`.
- Logs de job nao carregam previews com nomes, e-mails ou payloads sensiveis.

### Inconsistencias bloqueantes

- Aba obrigatoria ausente.
- Cabecalho obrigatorio ausente em aba operacional ou view.
- Atividade sem `ID_ATIVIDADE`.
- `ID_ATIVIDADE` fora do padrao canonico.
- Atividade sem `DATA_ATIVIDADE`.
- Presenca vinculada a atividade inexistente.
- Apresentacao sem atividade vinculada.
- Apresentacao sem apresentador.
- Justificativa sem atividade correspondente.
- Qualquer retorno `ok: false` nos testes de dry-run.
- Qualquer escrita apontando para base antiga ou ambiente diferente de DEV.

### Inconsistencias que podem ficar para ajuste posterior

- Atividade publicada sem titulo publico, se houver titulo interno utilizavel.
- Atividade publicada sem visibilidade, desde que ainda nao esteja sendo consumida pelo Portal.
- Atividade que gera certificado sem carga horaria, enquanto certificados ainda estiverem fora de escopo.
- Presenca de membro sem `ID_PESSOA`, desde que `RGA` esteja preservado para conciliacao.
- Justificativa sem presenca correspondente quando vier de legado incompleto.
- Pendencia de diretoria ainda nao refletida, desde que apareca no dry-run de pendencias.
- Limites disciplinares e elegibilidade de certificado ainda simplificados.

## Observacoes de seguranca

- O instalador `atividadesV2_instalarTriggerJobPortal(options)` e manual e nao deve ser chamado durante homologacao inicial.
- O Portal deve consumir views `PORTAL_*`; ele nao deve ler abas operacionais diretamente.
- A base antiga continua sendo a origem operacional enquanto a migracao nao for homologada.
- Qualquer troca para producao deve ter autorizacao explicita e plano de reversao.
