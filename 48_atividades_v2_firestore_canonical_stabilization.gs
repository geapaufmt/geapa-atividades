/**
 * Controles de estabilizacao do CRUD canonico. Nenhuma funcao deste arquivo
 * aceita PROD e o runner destrutivo permanece desabilitado por padrao.
 */

var ATIVIDADES_V2_CANONICAL_CRUD_TEST_PROPERTY = 'ATIVIDADES_V2_FIRESTORE_DEV_CRUD_TEST_AUTHORIZED';
var ATIVIDADES_V2_CANONICAL_CRUD_TEST_CLEANUP_PROPERTY = 'ATIVIDADES_V2_FIRESTORE_DEV_TEST_CLEANUP_AUTHORIZED';
var ATIVIDADES_V2_CANONICAL_CRUD_TEST_CLEANUP_CONFIRMATION = 'AUTORIZO_CLEANUP_FIRESTORE_DEV_ATIVIDADES_CRUD_TEST';
var ATIVIDADES_V2_CANONICAL_CRUD_TEST_RUNNER_ID = 'ATIVIDADES_V2_CRUD_TEST_RUNNER_V2';

function atividadesV2_canonicalAgendaAssertCrudTestAuthorized_() {
  atividadesV2_canonicalAgendaContext_({ ambiente: 'DEV' });
  if (atividadesV2_canonicalAgendaMode_() !== 'FIRESTORE_CANONICAL') {
    throw new Error('FIRESTORE_CANONICAL_NAO_ATIVADO.');
  }
  var authorized = atividades_normalizeTextUpper_(
    PropertiesService.getScriptProperties().getProperty(ATIVIDADES_V2_CANONICAL_CRUD_TEST_PROPERTY)
  ) === 'SIM';
  if (!authorized) throw new Error('TESTE_CRUD_FIRESTORE_DEV_NAO_AUTORIZADO.');
}

function atividadesV2_canonicalAgendaAssertCrudTestCleanupAuthorized_(options) {
  var opts = atividadesV2_canonicalAgendaDevOptions_(options);
  atividadesV2_canonicalAgendaContext_(opts);
  if (atividadesV2_canonicalAgendaMode_() !== 'FIRESTORE_CANONICAL') {
    throw new Error('FIRESTORE_CANONICAL_NAO_ATIVADO.');
  }
  var authorized = atividades_normalizeTextUpper_(
    PropertiesService.getScriptProperties().getProperty(ATIVIDADES_V2_CANONICAL_CRUD_TEST_CLEANUP_PROPERTY)
  ) === 'SIM';
  if (!authorized || String(opts.confirmacao || '') !== ATIVIDADES_V2_CANONICAL_CRUD_TEST_CLEANUP_CONFIRMATION) {
    throw new Error('CLEANUP_TESTE_CRUD_FIRESTORE_DEV_NAO_AUTORIZADO.');
  }
  return opts;
}

function atividadesV2_canonicalAgendaBuildCrudTestRunId_() {
  var uuid = String(Utilities.getUuid() || '').trim();
  if (!uuid) throw new Error('TESTE_CRUD_RUN_ID_NAO_GERADO.');
  return 'CRUD-FIRESTORE-DEV-' + uuid;
}

function atividadesV2_canonicalAgendaBuildCrudTestRow_(identity, testRunId) {
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
    CANONICAL_REQUEST_ID: testRunId,
    IS_TECHNICAL_TEST: true,
    TEST_RUN_ID: testRunId,
    CREATED_BY_TEST_RUNNER: ATIVIDADES_V2_CANONICAL_CRUD_TEST_RUNNER_ID,
    CRIADO_POR: ATIVIDADES_V2_CANONICAL_CRUD_TEST_RUNNER_ID,
    CRIADO_EM: now,
    ATUALIZADO_POR: ATIVIDADES_V2_CANONICAL_CRUD_TEST_RUNNER_ID,
    ATUALIZADO_EM: now,
    BLOQUEADO_PARA_EDICAO: 'NAO',
    ATIVO: 'SIM'
  };
}

function atividadesV2_canonicalAgendaCrudTestPaths_(idAtividade) {
  var id = atividadesV2_canonicalAgendaActivityId_(idAtividade);
  return Object.freeze({
    publicPath: ATIVIDADES_V2_CANONICAL_COLLECTION + '/' + id,
    privatePath: ATIVIDADES_V2_CANONICAL_PRIVATE_COLLECTION + '/' + id
  });
}

function atividadesV2_canonicalAgendaCapturePhysicalStateDev_() {
  atividadesV2_canonicalAgendaContext_({ ambiente: 'DEV' });
  var publicDocuments = atividadesV2_canonicalAgendaListAll_(ATIVIDADES_V2_CANONICAL_COLLECTION, 'DEV');
  var privateDocuments = atividadesV2_canonicalAgendaListAll_(ATIVIDADES_V2_CANONICAL_PRIVATE_COLLECTION, 'DEV');
  var hashesByPath = {};
  publicDocuments.forEach(function(item) {
    hashesByPath[ATIVIDADES_V2_CANONICAL_COLLECTION + '/' + String(item.id || '')] = String(item.data && item.data.sourceHash || '');
  });
  privateDocuments.forEach(function(item) {
    hashesByPath[ATIVIDADES_V2_CANONICAL_PRIVATE_COLLECTION + '/' + String(item.id || '')] = String(item.data && item.data.sourceHash || '');
  });
  var pairReport = atividadesV2_canonicalAgendaBuildExportRows_(publicDocuments, privateDocuments);
  return Object.freeze({
    environment: 'DEV',
    activitiesCount: publicDocuments.length,
    activityPrivateCount: privateDocuments.length,
    pairIntegrityOk: pairReport.ok === true,
    missingPrivatePaths: pairReport.missingPrivatePaths,
    unexpectedPrivatePaths: pairReport.unexpectedPrivatePaths,
    hashesByPath: Object.freeze(hashesByPath)
  });
}

function atividadesV2_canonicalAgendaComparePhysicalStates_(before, after) {
  var expected = before && before.hashesByPath || {};
  var actual = after && after.hashesByPath || {};
  var missingPaths = Object.keys(expected).filter(function(path) {
    return !Object.prototype.hasOwnProperty.call(actual, path);
  }).sort();
  var unexpectedPaths = Object.keys(actual).filter(function(path) {
    return !Object.prototype.hasOwnProperty.call(expected, path);
  }).sort();
  var divergentPaths = Object.keys(expected).filter(function(path) {
    return Object.prototype.hasOwnProperty.call(actual, path) && String(expected[path] || '') !== String(actual[path] || '');
  }).sort();
  return Object.freeze({
    ok: !missingPaths.length && !unexpectedPaths.length && !divergentPaths.length &&
      before.activitiesCount === after.activitiesCount &&
      before.activityPrivateCount === after.activityPrivateCount &&
      after.pairIntegrityOk === true,
    activitiesCount: Number(after && after.activitiesCount || 0),
    activityPrivateCount: Number(after && after.activityPrivateCount || 0),
    missingPaths: Object.freeze(missingPaths),
    unexpectedPaths: Object.freeze(unexpectedPaths),
    divergentPaths: Object.freeze(divergentPaths)
  });
}

function atividadesV2_canonicalAgendaReadCrudTestArtifactDev_(idAtividade) {
  var paths = atividadesV2_canonicalAgendaCrudTestPaths_(idAtividade);
  var getDocument = atividadesV2_canonicalAgendaRequireCoreMethod_('coreFirestoreEnvironmentGetDocument');
  var publicResult = getDocument(paths.publicPath, { ambiente: 'DEV' });
  var privateResult = getDocument(paths.privatePath, { ambiente: 'DEV' });
  if (!publicResult || publicResult.ok !== true || !privateResult || privateResult.ok !== true) {
    throw new Error('CLEANUP_TESTE_CRUD_FIRESTORE_READ_FALHOU.');
  }
  return Object.freeze({
    paths: paths,
    publicFound: publicResult.found === true,
    privateFound: privateResult.found === true,
    publicDocument: publicResult.found === true ? publicResult.data || Object.freeze({}) : null,
    privateDocument: privateResult.found === true ? privateResult.data || Object.freeze({}) : null
  });
}

function atividadesV2_canonicalAgendaAssertCrudTestArtifact_(artifact, idAtividade, testRunId, expectedHashes) {
  var runId = String(testRunId || '').trim();
  if (!runId) throw new Error('CLEANUP_TESTE_CRUD_TEST_RUN_ID_AUSENTE.');
  if (!artifact.publicFound || !artifact.privateFound) throw new Error('CLEANUP_TESTE_CRUD_PAR_AUSENTE.');
  var publicData = artifact.publicDocument || {};
  var privateData = artifact.privateDocument || {};
  if (String(publicData.idAtividade || '') !== String(idAtividade || '') ||
      String(privateData.idAtividade || '') !== String(idAtividade || '')) {
    throw new Error('CLEANUP_TESTE_CRUD_ID_DIVERGENTE.');
  }
  if (privateData.isTechnicalTest !== true ||
      String(privateData.createdByTestRunner || '') !== ATIVIDADES_V2_CANONICAL_CRUD_TEST_RUNNER_ID ||
      String(publicData.origemFluxo || '') !== 'TESTE_CRUD_FIRESTORE_DEV') {
    throw new Error('CLEANUP_TESTE_CRUD_ARTEFATO_NAO_RECONHECIDO.');
  }
  if (String(publicData.creationRequestId || '') !== runId || String(privateData.testRunId || '') !== runId) {
    throw new Error('CLEANUP_TESTE_CRUD_TEST_RUN_ID_DIVERGENTE.');
  }
  var expectedPublicHash = String(expectedHashes && expectedHashes.publicSourceHash || '');
  var expectedPrivateHash = String(expectedHashes && expectedHashes.privateSourceHash || '');
  if (!expectedPublicHash || !expectedPrivateHash) throw new Error('CLEANUP_TESTE_CRUD_HASH_ESPERADO_AUSENTE.');
  if (String(publicData.sourceHash || '') !== expectedPublicHash ||
      String(privateData.sourceHash || '') !== expectedPrivateHash) {
    throw new Error('CLEANUP_TESTE_CRUD_HASH_DIVERGENTE.');
  }
  return true;
}

function atividadesV2_canonicalAgendaRestoreCrudTestPartialDelete_(artifact) {
  var current = atividadesV2_canonicalAgendaReadCrudTestArtifactDev_(artifact.publicDocument.idAtividade);
  var restoreItems = [];
  if (!current.publicFound) restoreItems.push({ path: artifact.paths.publicPath, data: artifact.publicDocument });
  if (!current.privateFound) restoreItems.push({ path: artifact.paths.privatePath, data: artifact.privateDocument });
  if (!restoreItems.length) return false;
  var batchSet = atividadesV2_canonicalAgendaRequireCoreMethod_('coreFirestoreEnvironmentBatchSetDocuments');
  var restored = batchSet(restoreItems, { ambiente: 'DEV', dryRun: false, merge: false });
  if (!restored || restored.ok !== true || Number(restored.written || 0) !== restoreItems.length) {
    throw new Error('CLEANUP_TESTE_CRUD_RESTAURACAO_PARCIAL_FALHOU.');
  }
  return true;
}

/** Exclusao fisica estritamente privada: somente o par marcado pelo runner. */
function atividadesV2_canonicalAgendaCleanupCrudTestArtifactDev_(idAtividade, testRunId, expectedHashes, options) {
  var opts = atividadesV2_canonicalAgendaAssertCrudTestCleanupAuthorized_(options);
  var id = atividadesV2_canonicalAgendaActivityId_(idAtividade);
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('LOCK_INDISPONIVEL_CLEANUP_TESTE_CRUD_FIRESTORE.');
  try {
    var artifact = atividadesV2_canonicalAgendaReadCrudTestArtifactDev_(id);
    atividadesV2_canonicalAgendaAssertCrudTestArtifact_(artifact, id, testRunId, expectedHashes);
    if (opts.dryRun !== false) {
      return Object.freeze({
        ok: true, dryRun: true, environment: 'DEV', idAtividade: id,
        testRunId: String(testRunId || ''),
        wouldDeletePaths: Object.freeze([artifact.paths.privatePath, artifact.paths.publicPath]),
        deleted: 0
      });
    }
    var deleteDocument = atividadesV2_canonicalAgendaRequireCoreMethod_('coreFirestoreEnvironmentDeleteDocument');
    var deletedPaths = [];
    var privateDelete = deleteDocument(artifact.paths.privatePath, { ambiente: 'DEV', dryRun: false });
    if (privateDelete && privateDelete.ok === true && privateDelete.deleted === true) deletedPaths.push(artifact.paths.privatePath);
    else {
      atividadesV2_canonicalAgendaRestoreCrudTestPartialDelete_(artifact);
      throw new Error('CLEANUP_TESTE_CRUD_DELETE_PRIVADO_FALHOU.');
    }
    var publicDelete = deleteDocument(artifact.paths.publicPath, { ambiente: 'DEV', dryRun: false });
    if (publicDelete && publicDelete.ok === true && publicDelete.deleted === true) deletedPaths.push(artifact.paths.publicPath);
    else {
      atividadesV2_canonicalAgendaRestoreCrudTestPartialDelete_(artifact);
      throw new Error('CLEANUP_TESTE_CRUD_DELETE_PUBLICO_FALHOU_REVERTIDO.');
    }
    var finalArtifact = atividadesV2_canonicalAgendaReadCrudTestArtifactDev_(id);
    if (finalArtifact.publicFound || finalArtifact.privateFound) {
      atividadesV2_canonicalAgendaRestoreCrudTestPartialDelete_(artifact);
      throw new Error('CLEANUP_TESTE_CRUD_DELETE_INCOMPLETO_REVERTIDO.');
    }
    return Object.freeze({
      ok: true, dryRun: false, environment: 'DEV', idAtividade: id,
      testRunId: String(testRunId || ''), deleted: 2,
      deletedPaths: Object.freeze(deletedPaths), otherDocumentsTouched: 0, sheetsWritten: false
    });
  } finally {
    lock.releaseLock();
  }
}

function atividadesV2_canonicalAgendaCrudTestExportOptions_() {
  return { ambiente: 'DEV', dryRun: false, confirmacao: ATIVIDADES_V2_CANONICAL_EXPORT_CONFIRMATION };
}

function atividadesV2_canonicalAgendaAssertZeroExportDivergence_(report, code) {
  if (!report || report.ok !== true ||
      (report.missingIds || []).length || (report.extraIds || []).length ||
      (report.duplicatePaths || []).length || (report.divergentRecords || []).length ||
      (report.missingPrivatePaths || []).length || (report.unexpectedPrivatePaths || []).length) {
    throw new Error(code || 'TESTE_CRUD_EXPORT_DIVERGENTE.');
  }
  return true;
}

function atividadesV2_canonicalAgendaEmergencyCleanupCrudTest_(idAtividade, testRunId, expectedHashes, steps) {
  var current = atividadesV2_canonicalAgendaReadCrudTestArtifactDev_(idAtividade);
  if (!current.publicFound && !current.privateFound) {
    steps.CLEANUP_AFTER_FAILURE = true;
  } else if (current.publicFound && current.privateFound) {
    atividadesV2_canonicalAgendaCleanupCrudTestArtifactDev_(idAtividade, testRunId, expectedHashes, {
      ambiente: 'DEV', dryRun: false,
      confirmacao: ATIVIDADES_V2_CANONICAL_CRUD_TEST_CLEANUP_CONFIRMATION
    });
    steps.CLEANUP_AFTER_FAILURE = true;
  } else {
    throw new Error('TESTE_CRUD_CLEANUP_EMERGENCIA_PAR_INCOMPLETO.');
  }
  atividadesV2_canonicalAgendaExportToSheetsDev_(atividadesV2_canonicalAgendaCrudTestExportOptions_());
  var finalDivergence = atividadesV2_canonicalAgendaDiagnoseExportDev_({ ambiente: 'DEV' });
  atividadesV2_canonicalAgendaAssertZeroExportDivergence_(finalDivergence, 'TESTE_CRUD_EXPORT_FINAL_APOS_FALHA_DIVERGENTE.');
  steps.EXPORT_FINAL_AFTER_FAILURE = true;
  steps.VALIDATE_FINAL_AFTER_FAILURE = true;
}

/** Runner remoto autocontido: valida o CRUD e remove somente seu artefato marcado. */
function atividadesV2_runTesteCrudAgendaFirestoreDev() {
  atividadesV2_canonicalAgendaAssertCrudTestAuthorized_();
  var baseline = atividadesV2_canonicalAgendaCapturePhysicalStateDev_();
  if (!baseline.pairIntegrityOk) throw new Error('TESTE_CRUD_ESTADO_INICIAL_PAR_CANONICO_INVALIDO.');
  var identity = atividadesV2_buildNextActivityIdentityForCreate_(new Date(), null);
  var testRunId = atividadesV2_canonicalAgendaBuildCrudTestRunId_();
  var row = atividadesV2_canonicalAgendaBuildCrudTestRow_(identity, testRunId);
  var paths = atividadesV2_canonicalAgendaCrudTestPaths_(identity.idAtividade);
  var writeOptions = {
    ambiente: 'DEV', dryRun: false,
    confirmacao: ATIVIDADES_V2_CANONICAL_CRUD_CONFIRMATION
  };
  var steps = {};
  var created = false;
  var initialHashes = null;
  var lastKnownHashes = null;
  try {
    var createResult = atividadesV2_canonicalAgendaCreateDev_(row, writeOptions);
    if (!createResult || createResult.ok !== true || Number(createResult.written || 0) !== 2) {
      throw new Error('TESTE_CRUD_CREATE_FALHOU.');
    }
    created = true;
    initialHashes = Object.freeze({
      publicSourceHash: String(createResult.publicSourceHash || ''),
      privateSourceHash: String(createResult.privateSourceHash || '')
    });
    lastKnownHashes = initialHashes;
    steps.CREATE = true;

    var firstRead = atividadesV2_canonicalAgendaGetPairDev_(identity.idAtividade, { ambiente: 'DEV' });
    if (!firstRead.found || !firstRead.privateDocument) throw new Error('TESTE_CRUD_READ_PAIR_FALHOU.');
    atividadesV2_canonicalAgendaAssertCrudTestArtifact_({
      publicFound: true, privateFound: true,
      publicDocument: firstRead.publicDocument, privateDocument: firstRead.privateDocument
    }, identity.idAtividade, testRunId, initialHashes);
    steps.READ_PAIR = true;

    var updateResult = atividadesV2_canonicalAgendaUpdateDev_(identity.idAtividade, {
      TITULO_PUBLICO: '[TESTE DEV] CRUD canonico atualizado',
      TITULO: '[TESTE DEV] CRUD canonico atualizado',
      OBSERVACOES: 'Atualizado pelo runner de estabilizacao.',
      ATUALIZADO_POR: ATIVIDADES_V2_CANONICAL_CRUD_TEST_RUNNER_ID,
      ATUALIZADO_EM: new Date()
    }, writeOptions);
    if (!updateResult || updateResult.ok !== true) throw new Error('TESTE_CRUD_UPDATE_FALHOU.');
    steps.UPDATE = true;

    var updatedRead = atividadesV2_canonicalAgendaGetPairDev_(identity.idAtividade, { ambiente: 'DEV' });
    if (String(updatedRead.publicDocument.tituloPublico || '') !== '[TESTE DEV] CRUD canonico atualizado') {
      throw new Error('TESTE_CRUD_UPDATE_NAO_CONFIRMADO.');
    }
    if (String(updatedRead.privateDocument.testRunId || '') !== testRunId) {
      throw new Error('TESTE_CRUD_MARCA_TECNICA_NAO_PRESERVADA.');
    }
    lastKnownHashes = Object.freeze({
      publicSourceHash: String(updatedRead.publicDocument.sourceHash || ''),
      privateSourceHash: String(updatedRead.privateDocument.sourceHash || '')
    });
    steps.CONFIRM_UPDATE = true;

    atividadesV2_canonicalAgendaExportToSheetsDev_(atividadesV2_canonicalAgendaCrudTestExportOptions_());
    steps.EXPORT_FULL = true;
    var preCancelDivergence = atividadesV2_canonicalAgendaDiagnoseExportDev_({ ambiente: 'DEV' });
    atividadesV2_canonicalAgendaAssertZeroExportDivergence_(preCancelDivergence, 'TESTE_CRUD_EXPORT_PRE_CANCEL_DIVERGENTE.');
    steps.VALIDATE_EXPORT = true;

    var cancelResult = atividadesV2_canonicalAgendaCancelDev_({ idAtividade: identity.idAtividade }, writeOptions);
    if (!cancelResult || cancelResult.ok !== true) throw new Error('TESTE_CRUD_CANCEL_FALHOU.');
    var cancelledRead = atividadesV2_canonicalAgendaGetPairDev_(identity.idAtividade, { ambiente: 'DEV' });
    if (String(cancelledRead.publicDocument.statusOperacional || '') !== 'CANCELADA' ||
        String(cancelledRead.publicDocument.statusPublicacaoPortal || '') !== 'OCULTA' ||
        String(cancelledRead.publicDocument.visibilidadePortal || '') !== 'OCULTA') {
      throw new Error('TESTE_CRUD_CANCEL_NAO_CONFIRMADO.');
    }
    lastKnownHashes = Object.freeze({
      publicSourceHash: String(cancelledRead.publicDocument.sourceHash || ''),
      privateSourceHash: String(cancelledRead.privateDocument.sourceHash || '')
    });
    steps.CANCEL = true;

    atividadesV2_canonicalAgendaExportToSheetsDev_(atividadesV2_canonicalAgendaCrudTestExportOptions_());
    steps.EXPORT_AFTER_CANCEL = true;
    var afterCancelDivergence = atividadesV2_canonicalAgendaDiagnoseExportDev_({ ambiente: 'DEV' });
    atividadesV2_canonicalAgendaAssertZeroExportDivergence_(afterCancelDivergence, 'TESTE_CRUD_EXPORT_APOS_CANCEL_DIVERGENTE.');
    steps.VALIDATE_AFTER_CANCEL = true;

    var cleanupResult = atividadesV2_canonicalAgendaCleanupCrudTestArtifactDev_(identity.idAtividade, testRunId, lastKnownHashes, {
      ambiente: 'DEV', dryRun: false,
      confirmacao: ATIVIDADES_V2_CANONICAL_CRUD_TEST_CLEANUP_CONFIRMATION
    });
    if (!cleanupResult || cleanupResult.ok !== true || Number(cleanupResult.deleted || 0) !== 2) {
      throw new Error('TESTE_CRUD_CLEANUP_FALHOU.');
    }
    steps.CLEANUP_TEST_ARTIFACT = true;

    atividadesV2_canonicalAgendaExportToSheetsDev_(atividadesV2_canonicalAgendaCrudTestExportOptions_());
    steps.EXPORT_FINAL = true;
    var finalDivergence = atividadesV2_canonicalAgendaDiagnoseExportDev_({ ambiente: 'DEV' });
    atividadesV2_canonicalAgendaAssertZeroExportDivergence_(finalDivergence, 'TESTE_CRUD_EXPORT_FINAL_DIVERGENTE.');
    steps.VALIDATE_FINAL = true;

    var finalSnapshot = atividadesV2_canonicalAgendaCapturePhysicalStateDev_();
    var finalState = atividadesV2_canonicalAgendaComparePhysicalStates_(baseline, finalSnapshot);
    if (!finalState.ok) throw new Error('TESTE_CRUD_ESTADO_FISICO_FINAL_DIVERGENTE.');
    return Object.freeze({
      ok: true,
      environment: 'DEV',
      testActivityId: identity.idAtividade,
      testRunId: testRunId,
      artifact: Object.freeze({
        idAtividade: identity.idAtividade,
        testRunId: testRunId,
        createdPublicSourceHash: initialHashes.publicSourceHash,
        createdPrivateSourceHash: initialHashes.privateSourceHash,
        publicPath: paths.publicPath,
        privatePath: paths.privatePath
      }),
      steps: Object.freeze(steps),
      finalState: finalState,
      prodTouched: false
    });
  } catch (err) {
    if (created) {
      try {
        atividadesV2_canonicalAgendaEmergencyCleanupCrudTest_(identity.idAtividade, testRunId, lastKnownHashes, steps);
      } catch (cleanupError) {
        steps.CLEANUP_AFTER_FAILURE = false;
        Logger.log('[ATIVIDADES][CRUD_TEST_DEV] cleanup emergencial falhou: ' + String(cleanupError && cleanupError.message || cleanupError));
      }
    }
    Logger.log('[ATIVIDADES][CRUD_TEST_DEV] steps=' + JSON.stringify(steps));
    throw err;
  }
}
