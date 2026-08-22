/**
 * Controles de estabilizacao do CRUD canonico. Nenhuma funcao deste arquivo
 * aceita PROD e o runner destrutivo permanece desabilitado por padrao.
 */

var ATIVIDADES_V2_CANONICAL_CRUD_TEST_PROPERTY = 'ATIVIDADES_V2_FIRESTORE_DEV_CRUD_TEST_AUTHORIZED';

function atividadesV2_canonicalAgendaAssertCrudTestAuthorized_() {
  atividadesV2_canonicalAgendaContext_({ ambiente: 'DEV' });
  if (atividadesV2_canonicalAgendaMode_() !== 'FIRESTORE_CANONICAL') {
    throw new Error('FIRESTORE_CANONICAL_NAO_ATIVADO.');
  }
  var authorized = atividades_normalizeTextUpper_(
    PropertiesService.getScriptProperties().getProperty(ATIVIDADES_V2_CANONICAL_CRUD_TEST_PROPERTY)
  ) === 'SIM';
  if (!authorized) {
    throw new Error('TESTE_CRUD_FIRESTORE_DEV_NAO_AUTORIZADO.');
  }
}
function atividadesV2_canonicalAgendaBuildCrudTestRow_(identity) {
  var now = new Date();
  return {
    ID_ATIVIDADE: identity.idAtividade,
    CICLO: 'GEAPA_' + identity.ano,
    ANO: identity.ano,
    SEMESTRE: identity.semestre,
    NUMERO_SEQUENCIAL_NO_CICLO: identity.sequencial,
    TIPO_ATIVIDADE: 'TESTE_TECNICO',
    SUBTIPO_ATIVIDADE: 'CRUD_FIRESTORE_DEV',
    CLASSIFICACAO_ACESSO: 'DIRETORIA',
    TITULO: '[TESTE DEV] CRUD canonico de Atividades',
    TITULO_PUBLICO: '[TESTE DEV] CRUD canonico de Atividades',
    DESCRICAO: 'Registro temporario criado pelo runner controlado de estabilizacao.',
    DESCRICAO_PUBLICA: 'Teste tecnico temporario.',
    DATA_ATIVIDADE: Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    HORARIO_INICIO: '08:00',
    HORARIO_FIM: '09:00',
    LOCAL: 'AMBIENTE DEV',
    FORMATO: 'ONLINE',
    STATUS_OPERACIONAL: 'PLANEJADA',
    STATUS_PUBLICACAO_PORTAL: 'RASCUNHO',
    VISIBILIDADE_PORTAL: 'DIRETORIA',
    ORIGEM_FLUXO: 'TESTE_CRUD_FIRESTORE_DEV',
    CRIADO_POR: 'RUNNER_TESTE_CRUD_DEV',
    CRIADO_EM: now,
    ATUALIZADO_POR: 'RUNNER_TESTE_CRUD_DEV',
    ATUALIZADO_EM: now,
    BLOQUEADO_PARA_EDICAO: 'NAO',
    ATIVO: 'SIM'
  };
}

/**
 * Runner remoto destrutivo preparado, mas nao autorizado por padrao.
 * Cria, le, edita, exporta, diagnostica e cancela; nunca exclui fisicamente.
 */
function atividadesV2_runTesteCrudAgendaFirestoreDev() {
  atividadesV2_canonicalAgendaAssertCrudTestAuthorized_();
  var identity = atividadesV2_buildNextActivityIdentityForCreate_(new Date(), null);
  var row = atividadesV2_canonicalAgendaBuildCrudTestRow_(identity);
  var writeOptions = {
    ambiente: 'DEV',
    dryRun: false,
    confirmacao: ATIVIDADES_V2_CANONICAL_CRUD_CONFIRMATION
  };
  var steps = [];
  var created = false;
  try {
    var createResult = atividadesV2_canonicalAgendaCreateDev_(row, writeOptions);
    created = createResult.ok === true;
    steps.push({ step: 'CREATE', ok: createResult.ok === true, written: createResult.written });

    var firstRead = atividadesV2_canonicalAgendaGetPairDev_(identity.idAtividade, { ambiente: 'DEV' });
    if (!firstRead.found || !firstRead.privateDocument) throw new Error('TESTE_CRUD_READ_PAIR_FALHOU.');
    steps.push({ step: 'READ_PAIR', ok: true, readsEstimated: firstRead.readsEstimated });

    var updateResult = atividadesV2_canonicalAgendaUpdateDev_(identity.idAtividade, {
      TITULO_PUBLICO: '[TESTE DEV] CRUD canonico atualizado',
      TITULO: '[TESTE DEV] CRUD canonico atualizado',
      OBSERVACOES: 'Atualizado pelo runner de estabilizacao.',
      ATUALIZADO_POR: 'RUNNER_TESTE_CRUD_DEV',
      ATUALIZADO_EM: new Date()
    }, writeOptions);
    steps.push({ step: 'UPDATE', ok: updateResult.ok === true, written: updateResult.written });

    var updatedRead = atividadesV2_canonicalAgendaGetPairDev_(identity.idAtividade, { ambiente: 'DEV' });
    if (String(updatedRead.publicDocument.tituloPublico || '') !== '[TESTE DEV] CRUD canonico atualizado') {
      throw new Error('TESTE_CRUD_UPDATE_NAO_CONFIRMADO.');
    }
    steps.push({ step: 'CONFIRM_UPDATE', ok: true, readsEstimated: updatedRead.readsEstimated });

    var exportResult = atividadesV2_canonicalAgendaExportToSheetsDev_({
      ambiente: 'DEV',
      dryRun: false,
      confirmacao: ATIVIDADES_V2_CANONICAL_EXPORT_CONFIRMATION
    });
    steps.push({ step: 'EXPORT_FULL', ok: exportResult.ok === true, totalActivities: exportResult.totalActivities });

    var divergence = atividadesV2_canonicalAgendaDiagnoseExportDev_({ ambiente: 'DEV' });
    if (!divergence.ok) throw new Error('TESTE_CRUD_EXPORT_DIVERGENTE.');
    steps.push({ step: 'VALIDATE_EXPORT', ok: true, exportCount: divergence.exportCount });

    var cancelResult = atividadesV2_canonicalAgendaCancelDev_({ idAtividade: identity.idAtividade }, writeOptions);
    steps.push({ step: 'CANCEL', ok: cancelResult.ok === true, written: cancelResult.written });
    return Object.freeze({
      ok: true,
      environment: 'DEV',
      idAtividade: identity.idAtividade,
      deletionPolicy: 'CANCEL_ONLY',
      steps: Object.freeze(steps),
      prodTouched: false
    });
  } catch (err) {
    if (created) {
      try {
        atividadesV2_canonicalAgendaCancelDev_({ idAtividade: identity.idAtividade }, writeOptions);
        steps.push({ step: 'CANCEL_AFTER_FAILURE', ok: true });
      } catch (cancelError) {
        steps.push({ step: 'CANCEL_AFTER_FAILURE', ok: false, code: 'CANCELAMENTO_MANUAL_NECESSARIO' });
      }
    }
    throw err;
  }
}
