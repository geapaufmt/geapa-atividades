# Gestao de atividades V2 pelo Portal

## Escopo

A tela `Gestao -> Atividades` administra somente a base V2 DEV. O navegador nao acessa planilhas: a sessao e resolvida no Apps Script do Portal e a permissao e revalidada pelo modulo `geapa-atividades`.

Funcoes publicas:

- `atividadesV2_portalListarAtividadesAdmin(filtros, contexto)`;
- `atividadesV2_portalGetDetalheAtividadeAdmin(idAtividade, contexto)`;
- `atividadesV2_portalValidarEdicaoAtividadeAdmin(payload, contexto)`;
- `atividadesV2_portalSalvarEdicaoAtividadeAdmin(payload, contexto)`;
- `atividadesV2_portalPublicarAtividadeAdmin(payload, contexto)`;
- `atividadesV2_portalOcultarAtividadeAdmin(payload, contexto)`;
- `atividadesV2_portalCancelarAtividadeAdmin(payload, contexto)`;
- `atividadesV2_portalReabrirAtividadeAdmin(payload, contexto)`;
- `atividadesV2_runTesteGestaoAtividadesAdminDev()`.

## Regras de seguranca

- somente Secretaria, Diretoria, Admin tecnico ou sessao com `atividades:gerir` pode operar;
- listagem e detalhe retornam recortes sanitizados, sem e-mails, RGA ou payloads de log;
- edicao aceita somente titulo/descricoes, data, horarios, local, formato, responsavel permitido pelo modelo, publico-alvo e observacoes;
- regras herdadas de `Atividades_Config` nao podem ser alteradas pelo payload de edicao;
- apresentacao de membro mantem titulo/eixo no fluxo proprio e responsavel automatico na Secretaria;
- escritas reabrem a atividade por `ID_ATIVIDADE` dentro de `LockService` e gravam a linha em lote;
- publicar, ocultar, cancelar e reabrir sao acoes explicitas e registradas em `Portal_Acoes` e `Atividades_Log`;
- cancelar nunca apaga a atividade e invalida o cache de elegibilidade do apresentador quando aplicavel.

## Fontes e efeitos

A listagem le `Atividades` e `Atividades_Apresentacoes` em lote. O detalhe agrega `Atividades`, `Atividades_Apresentacoes`, `Atividades_Envolvidos`, o modelo seguro de `Atividades_Config` e as ultimas acoes sem seus payloads internos.

As telas publicas de proximas atividades e historico nao sao telas de gestao: registros `RASCUNHO`, `OCULTA`, `CANCELADA` ou `ARQUIVADA` ficam bloqueados para todos os perfis nesses contratos. A gestao administrativa e o unico contrato que lista atividades independentemente do estado de publicacao.

Depois de uma escrita, o modulo invalida os caches de atividades, chamada e apresentadores, e tenta atualizar `PORTAL_ATIVIDADES_CALENDARIO`, `PORTAL_ATIVIDADES_DETALHES` e o status das views. Falha nesse pos-processamento gera aviso, sem desfazer a alteracao ja confirmada.

## Homologacao manual

1. Execute `atividadesV2_runTesteGestaoAtividadesAdminDev()` e confirme `escritaRealizada=false`.
2. Acesse `Gestao -> Atividades` com perfil autorizado e confirme que rascunhos aparecem.
3. Abra uma atividade comum, edite um campo permitido e confira `Atividades`, `Portal_Acoes` e `Atividades_Log`.
4. Abra uma apresentacao de membro e confirme que titulo e responsavel automatico nao ficam editaveis.
5. Publique, oculte e republique uma atividade de teste.
6. Cancele uma apresentacao de membro de teste e confirme que o membro volta a lista de elegiveis do ciclo.
7. Reabra a atividade e confirme status `PLANEJADA`, publicacao `RASCUNHO` e visibilidade `DIRETORIA`.
8. Confirme que um membro comum recebe `PERMISSAO_NEGADA` no backend.

## Fora de escopo

Producao, Firestore, alteracao livre das regras do modelo, aprovacao de excecao, e-mails, triggers e exclusao de atividades continuam fora deste pacote.
