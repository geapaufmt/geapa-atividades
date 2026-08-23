# Plano de migracao de Apresentacoes para Firestore

## Objetivo e limite

Este documento planeja a migracao do dominio de apresentacoes em DEV. Ele nao implementa collections, importacao, CRUD, exportacao, Rules ou writes remotos.

O primeiro piloto inclui cadastro e fluxo operacional da apresentacao. Arquivos, slides, materiais, fotos, anexos e movimentacoes no Drive ficam fora. Presencas, convites e notificacoes tambem continuam em seus fluxos atuais ate fases proprias.

O modulo ativo dono do dominio e `geapa-atividades`. `geapa-apresentacoes` e legado e deve servir somente como fonte de levantamento e compatibilidade temporaria, sem receber novas responsabilidades.

## Estado atual e fontes

Existem dois modelos em uso:

1. O legado `geapa-apresentacoes` le e escreve `APRESENTACOES_PROCESSAMENTO` e projeta registros em `APRESENTACOES_HISTORICO_PUBLICO`.
2. O fluxo integrado de `geapa-atividades` usa `Atividades_Apresentacoes`, relaciona cada apresentacao a `Atividades` por `ID_ATIVIDADE` e materializa views `PORTAL_*`.

Recursos e abas envolvidos hoje:

| Recurso | Papel atual | Tratamento na migracao |
| --- | --- | --- |
| `APRESENTACOES_PROCESSAMENTO` | Cadastro e controle operacional legado | Somente leitura de legado e conciliacao; nunca segundo destino canonico |
| `APRESENTACOES_HISTORICO_PUBLICO` | Projecao publica por RGA + data | Dado derivado; futura exportacao a partir do Firestore |
| `Atividades_Apresentacoes` | Extensao operacional ativa das apresentacoes | Fonte principal da importacao inicial, depois espelho/compatibilidade |
| `Atividades` | Agenda e atividade pai | Ja canonica em `activities`; somente referencia e validacao |
| `Atividades_Envolvidos` | Papeis e pessoas vinculadas | Fora do primeiro piloto; usar somente para conciliacao do apresentador |
| `Atividades_Convites` | Professores, externos e expectativas de presenca | Fora do primeiro piloto |
| `Atividades_Arquivos` | Slides, fotos e versoes de arquivos | Fora do primeiro piloto |
| `Atividades_Presencas_Registros` | Evidencia de realizacao e presenca | Fora do primeiro piloto; somente sinal de conciliacao, sem migrar |
| `Atividades_Log` e `Portal_Acoes` | Auditoria tecnica e de acoes | Nao importar como estado da apresentacao; planejar trilha propria |
| `PORTAL_ATIVIDADES_DETALHES` | Read model com `APRESENTACOES_PUBLICAS_JSON` | Derivado; substituir por composicao Firestore/novo exportador |
| `PORTAL_PENDENCIAS_DIRETORIA` | Read model de pendencias | Derivado do estado canonico |
| `PORTAL_STATUS_ATIVIDADES` | Indicadores de processamento | Derivado |
| `MEMBERS_ATUAIS` / `PESSOAS_RESUMO_OPERACIONAL` | Identidade e resumo de apresentacoes realizadas | Consumidor derivado; nao fonte de apresentacao |
| `PROFS_BASE` | Professores elegiveis por eixo | Fonte auxiliar de convites, fora do piloto |
| `EIXOS_TEMATICOS_OFICIAIS` | Catalogo oficial de eixos | Referencia de validacao, nao copia canonica |
| vigencias/ciclos/semestres do Core | Calendario institucional | Referencia para validar snapshots de ciclo e semestre |
| `APRESENTACOES_PASTA_RAIZ` e `APRESENTACOES_UPLOAD_FOTOS` | Pastas do Drive | Fora do piloto |

## Readers atuais

- `geapa-apresentacoes`: `apresentacoes_listarApresentacoesInternas_`, pendencias de titulo/eixo, aptas ao historico, validacoes, convites, lembretes, cobrancas e inbox de arquivo.
- `geapa-atividades`: `atividades_listApresentacaoRowsWithNumbers_`, indices por apresentacao/atividade, jobs pre e pos-evento, historico publico, resumo em membros, views e endpoints do Portal.
- Portal: `/v2/minhas-apresentacoes`, `/v2/apresentacoes/pendencias`, calendario/detalhes e listagem de eixos.
- Core: resumos de quantidade/ultima apresentacao e pontes temporarias de autorizacao para apresentacoes proprias e de egressos.
- Membros: validacao de conflito de apresentacao antes de desligamento e campos derivados de ultima apresentacao/quantidade.
- Comunicacoes: nao possui armazenamento proprio de apresentacoes; mensageria e roteamento sao servicos auxiliares.

## Writers atuais

- Criacao/espelhamento de uma linha de `Atividades_Apresentacoes` a partir de atividade `APRESENTACAO_MEMBRO`.
- Autofill de identidade e semestre.
- Envio, edicao, aprovacao, ajuste e reprovacao de titulo/eixos pelo Portal ou inbox de e-mail.
- Mudancas de `STATUS_APRESENTACAO`, inclusive `PLANEJADA`, `AGENDADA`, `CONFIRMADA`, `APROVADA`, `REALIZADA` e `CANCELADA`.
- Reflexo de `STATUS_APRESENTACAO` no status da atividade pai.
- Escrita de titulo/eixos e status de eixo na atividade pai em acoes do Portal.
- Flags, datas e contadores de notificacao, cobranca, convite e lembrete.
- Material/arquivo, fotos e links do Drive.
- Historico publico, resumo de membros, views, pendencias, logs e auditoria.

Os quatro ultimos grupos devem ser tratados como integracoes, derivados ou subdominios separados. Eles nao podem ampliar silenciosamente o primeiro piloto.

## Separacao dos dados

### Dados canonicos da apresentacao

- identificador da apresentacao;
- referencia da atividade pai;
- apresentador (`idPessoa`) e nome publico como snapshot controlado;
- titulo e eixos tematicos;
- estado da apresentacao;
- estado de submissao/revisao de titulo e eixos;
- visibilidade/publicacao;
- bloqueio operacional, ativo, schema e versao;
- referencias verificadas de ciclo, ano e semestre para consultas e preservacao historica.

### Dados privados/operacionais

- RGA e e-mail do apresentador;
- observacoes internas;
- datas, contadores e destinatarios de cobrancas/notificacoes;
- atores de criacao, atualizacao e revisao;
- justificativas internas de ajuste/reprovacao;
- metadados de importacao e conciliacao que nao devam ser expostos.

### Arquivos e materiais - fora do primeiro piloto

- IDs, nomes, MIME types, links e versoes de slides;
- links/pastas do Drive;
- fotos da reuniao;
- anexos de e-mail e eventos de movimentacao/copia.

### Dados derivados

- historico publico;
- cards, calendario, detalhes e pendencias do Portal;
- quantidade de apresentacoes e ultima apresentacao em Pessoas/Membros;
- elegibilidade de convite por eixo;
- indicadores de status do processamento.

### Logs e auditoria

- eventos de CRUD e mudancas de estado;
- tentativas negadas, idempotencia e correlation IDs;
- entregas de notificacao, inbox/outbox e falhas;
- runs de importacao, validacao, exportacao e rollback.

Logs nao devem ser embutidos como arrays crescentes no documento canonico. Devem usar trilha append-only separada quando essa fase for implementada.

## Schema Firestore proposto

### `presentations/{idApresentacao}`

```js
{
  idApresentacao: "APR-2026-1-0005",
  idAtividade: "ATV-2026-1-0005",
  idPessoaApresentador: "PES-000009",
  nomeApresentadorPublico: "...",

  titulo: "...",
  eixoTematicoPrincipal: "...",
  eixoTematicoSecundario: "...",
  statusApresentacao: "PLANEJADA|AGENDADA|CONFIRMADA|APROVADA|REALIZADA|CANCELADA",
  statusTituloEixo: "PENDENTE|ENVIADO|EM_ANALISE|AJUSTE_SOLICITADO|APROVADO|REPROVADO",

  ciclo: "GEAPA_2026",
  ano: 2026,
  semestre: "2026/1",
  scheduledAt: Timestamp,

  publicarNoPortal: true,
  visibilidadePortal: "...",
  bloqueadoParaEdicao: false,
  ativo: true,

  schemaVersion: "presentation-v1",
  version: 1,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  sourceHash: "sha256:...",
  sourceSystem: "ATIVIDADES_V2_SHEETS",
  sourceKey: "Atividades_Apresentacoes:<ID_APRESENTACAO>",
  importBatchId: "..."
}
```

`scheduledAt`, ciclo, ano e semestre sao snapshots verificados da atividade pai para consulta e historico. Eles nao autorizam Apresentacoes a alterar `activities/{idAtividade}`.

### `presentationPrivate/{idApresentacao}`

Esta collection e necessaria se o piloto incluir controle operacional, porque RGA, e-mail, observacoes, contadores, timestamps de cobranca e identidade dos atores nao pertencem ao documento legivel pelo Portal.

```js
{
  idApresentacao: "APR-2026-1-0005",
  idAtividade: "ATV-2026-1-0005",
  rgaApresentador: "...",
  emailApresentador: "...",
  observacoesInternas: "...",
  tituloEixo: {
    qtdCobrancas: 0,
    cobradoEm: Timestamp,
    confirmadoEm: Timestamp,
    revisadoPor: "PES-...",
    justificativaUltimaDecisao: "..."
  },
  notificacoes: {
    agendamentoEnviado: false,
    agendamentoEnviadoEm: Timestamp,
    secretariaEnviada: false,
    secretariaEnviadaEm: Timestamp
  },
  schemaVersion: "presentation-private-v1",
  version: 1,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  sourceHash: "sha256:...",
  sourceKey: "Atividades_Apresentacoes:<ID_APRESENTACAO>",
  importBatchId: "..."
}
```

Campos de convite, lembrete, material, arquivo e foto nao entram no primeiro piloto. A collection privada deve ser backend-only, como `activityPrivate`.

## Propriedade e relacoes

- `activities/{idAtividade}` e dona de data, horarios, local, formato, cancelamento/ocultacao e estado da atividade.
- `presentations/{idApresentacao}` e dona de titulo, eixos, apresentador e estados da apresentacao/titulo-eixo.
- `idAtividade` e referencia obrigatoria; a importacao deve rejeitar apresentacao sem atividade pai valida no mesmo projeto DEV.
- `idPessoaApresentador` referencia Pessoas/Core. RGA, e-mail e nome nao substituem o ID; sao apenas dados privados/snapshot.
- ciclo e semestre sao validados contra a atividade e as vigencias, mas nao formam uma segunda fonte de agenda.
- materiais futuros referenciam `idApresentacao`, mas nao devem ser campos canonicos deste primeiro documento.

## Eliminacao da escrita Apresentacoes -> Atividades

As rotinas `atividades_refletirStatusApresentacoesEmAtividades_` e as acoes que hoje gravam titulo/eixos/status de eixo na atividade precisam ser retiradas do caminho canonico antes do cutover.

Regra proposta:

1. Apresentacoes nunca altera `activities/{idAtividade}`.
2. Cancelar/ocultar a atividade pode limitar a apresentacao, mas por comando explicito do dominio Atividades; nao por reflexo automatico reverso.
3. O Portal compoe atividade + apresentacao por IDs, ou le um read model derivado claramente marcado. O read model pode mostrar o titulo da apresentacao no card sem gravar esse titulo na atividade canonica.
4. Para atividades do subtipo apresentacao, o titulo generico da atividade continua pertencendo a Atividades; o titulo academico pertence somente a Apresentacoes.
5. Qualquer projecao denormalizada guarda `sourcePresentationVersion` e nunca aceita escrita do cliente nem reverse sync.

## IDs e idempotencia

- Preservar `ID_APRESENTACAO` existente quando unico e valido (`APR-AAAA-S-NNNN` ou sufixo documentado).
- Nao usar numero de linha como ID canonico.
- Para registro sem ID, gerar ID deterministico a partir de `idAtividade + chave legado estavel`; registrar a tabela de correspondencia no plano de importacao.
- Reexecucao com o mesmo payload e `sourceHash` deve resultar em no-op.
- Divergencia de duas fontes para o mesmo ID deve bloquear a importacao daquele par, nunca escolher silenciosamente.
- Hashes publico e privado devem ser calculados separadamente sobre JSON canonico, com campos ordenados, datas ISO UTC, strings normalizadas e sem metadados volateis.

## Indices iniciais

Propor somente apos medir as consultas do Emulator:

- `presentations`: `idAtividade ASC, ativo ASC`;
- `presentations`: `idPessoaApresentador ASC, scheduledAt DESC`;
- `presentations`: `ciclo ASC, semestre ASC, scheduledAt DESC`;
- `presentations`: `statusApresentacao ASC, scheduledAt ASC`;
- `presentations`: `statusTituloEixo ASC, ativo ASC, scheduledAt ASC`;
- `presentations`: `publicarNoPortal ASC, visibilidadePortal ASC, scheduledAt DESC`.

`presentationPrivate` deve privilegiar leitura pontual pelo mesmo ID. Nao criar indices privados sem uma consulta backend comprovada.

## Security Rules e IAM

- Projeto Firebase DEV separado de PROD; mesmo resolvedor explicito para leitura e escrita; ambiente ausente/invalido falha fechado.
- Nenhum namespace `dev/prod` dentro do mesmo projeto.
- `presentationPrivate/{id}`: negar toda leitura e escrita do cliente web.
- `presentations/{id}`: negar escrita direta do cliente no primeiro piloto. CRUD passa pelo backend Apps Script DEV, que valida identidade, ambiente, ownership, status e versao.
- Leitura autenticada somente para `portalUsers/{uid}` ativo. Dono pode ler a propria apresentacao; gestao pode ler pendencias; outros perfis somente registros publicados/visiveis conforme contrato.
- Egressos mantem o corte temporal autorizado pelo Core.
- O principal do Apps Script DEV recebe apenas os papeis minimos no projeto `geapa-dev`; nenhum papel ou credencial PROD e reutilizado.

## Importacao inicial

1. Resolver explicitamente DEV e confirmar `geapa-dev`; bloquear PROD e projetos desconhecidos.
2. Ler `Atividades_Apresentacoes` como fonte principal e `activities` como pai canonico.
3. Ler `APRESENTACOES_PROCESSAMENTO` somente para conciliacao do legado. Produzir conflitos, ausencias e aliases; nao completar silenciosamente o plano.
4. Excluir arquivos/materiais/fotos, convites, presencas, notificacoes fora do recorte e logs do payload canonico.
5. Gerar plano deterministico com dois documentos por apresentacao quando houver dados privados.
6. Validar IDs, pais, pessoas, ciclo/semestre, enums, duplicidades e hashes.
7. Rodar dry-run no Emulator; depois dry-run remoto somente leitura no DEV.
8. Exigir gate temporario e confirmacao textual exclusivos para o write DEV.
9. Criar documentos com precondicao de inexistencia, ou aceitar no-op somente quando hash e batch forem identicos.

## Validacao read-only

O validador deve reconstruir o plano e comparar:

- contagens esperadas de `presentations` e `presentationPrivate`;
- paths esperados, ausentes e inesperados;
- `sourceHash`, `schemaVersion`, IDs de atividade/pessoa e snapshots de ciclo/semestre;
- existencia e ambiente de cada `activities/{idAtividade}` pai;
- paridade entre documento publico e privado;
- zero alteracoes em Firestore e Sheets.

Qualquer diferenca e somente reportada. O validador nunca corrige, cria ou exclui.

## Rollback

- DEV apenas, gate e confirmacao diferentes da importacao.
- Recalcular os paths do plano e restringir collections a `presentations` e `presentationPrivate`.
- Antes de excluir, exigir `importBatchId` e `sourceHash` iguais aos da importacao.
- Abortar o rollback inteiro se houver documento divergente ou sem pai esperado; nao apagar alteracoes operacionais posteriores.
- Nunca tocar `activities`, `activityPrivate`, `portalUsers`, arquivos, logs ou Sheets.
- Se a importacao falhar entre lotes, registrar os lotes aplicados e executar rollback somente depois da validacao global dos hashes.

## Firestore para Sheets

- Criar um espelho dedicado, por exemplo `EXPORT_APRESENTACOES_FIRESTORE`.
- O exportador le Firestore e substitui somente essa aba sob lock e gate DEV.
- Nao escreve no Firestore, nao altera `Atividades`, `APRESENTACOES_PROCESSAMENTO` ou `Atividades_Apresentacoes` durante o piloto.
- `APRESENTACOES_HISTORICO_PUBLICO`, resumos de membros e views passam a ser derivados por rotinas proprias e unidirecionais depois da homologacao.
- Nao existe reverse sync nem dual-write bidirecional.

## CRUD proposto

- `create`: cria apresentacao vinculada a atividade existente e pessoa valida; transacao publica/privada; ID estavel.
- `get/list`: compoe dados publicos com privados somente no backend autorizado; aplica ownership, perfil e corte de egresso.
- `update`: usa precondicao de `version`; permite somente campos do dominio Apresentacoes.
- `submit title/axes`: membro dono; valida catalogo oficial e transicao de estado.
- `review`: `SECRETARIO`, `DIRETORIA` ou `ADMIN_TECNICO`; aprovar, pedir ajuste ou reprovar com justificativa.
- `change status`: maquina de estados explicita; nunca reflete automaticamente em `activities`.
- `cancel/hide`: transicao auditada; exclusao fisica normal nao suportada.
- Materiais, fotos, convites, presencas e notificacoes ficam fora do primeiro CRUD.

## Testes

- Unitarios: normalizacao, IDs, hashes, enums, transicoes, ownership, perfis e separacao publico/privado.
- Contrato: payloads Portal, campos proibidos e compatibilidade de aliases.
- Emulator: CRUD publico/privado, Rules, indices, concorrencia/versionamento, idempotencia, importacao, validador, rollback e exportador simulado.
- Seguranca: ambiente ausente/invalido, PROD negado, projeto divergente, cliente sem auth, usuario inativo, dono diferente e claim/perfil insuficiente.
- Integracao: atividade pai ausente/cancelada, pessoa ausente, egresso fora do corte e read model do Portal.
- Regressao: zero writes em `activities` ao alterar titulo, eixo ou status de apresentacao; zero writes em Sheets no CRUD canonico.

## Fases e ordem recomendada

1. **Inventario e contrato congelado**: contar fontes, classificar conflitos, fixar enums, ownership e campos fora do piloto.
2. **Fundacao de ambiente**: reutilizar o resolvedor DEV/PROD sem fallback, bloqueio PROD e Emulator. Nenhum write remoto.
3. **Schema, conversores e hashes**: implementar apenas localmente o plano deterministico publico/privado.
4. **Rules, indices e repositorio Firestore**: backend-only para privados e writes; testar integralmente no Emulator.
5. **Dry-run e validador**: reconciliar Sheets, Firestore `activities` e Pessoas; corrigir conflitos na origem antes do primeiro write.
6. **Importacao DEV**: autorizacao pontual, batch identificado, validacao read-only imediata e rollback pronto.
7. **Leituras Portal em shadow mode**: comparar resposta Firestore com contratos atuais sem mudar o usuario final.
8. **CRUD DEV**: habilitar um comando por vez; provar que nenhuma operacao altera `activities` nem Sheets.
9. **Exportacao unidirecional**: Firestore para `EXPORT_APRESENTACOES_FIRESTORE`; depois adaptar os consumidores legados estritamente necessarios.
10. **Cutover DEV**: `PRESENTATIONS_FIRESTORE_CANONICAL`, desabilitar writers de `Atividades_Apresentacoes`/processamento para o recorte e manter leitores de legado apenas com telemetria e prazo.
11. **Homologacao e decisao de PROD**: checklist, autorizacao separada, projeto PROD separado e plano proprio; nenhuma promocao automatica.

## Compatibilidade temporaria

- Leitores antigos podem consumir a exportacao ou um adapter Firestore durante janela definida.
- Writers antigos de titulo/eixo/status devem falhar quando o modo canonico estiver ativo; nao fazer dual-write.
- `geapa-apresentacoes` permanece congelado e somente leitura/fallback de emergencia por prazo curto.
- Cada fallback deve registrar uso para permitir sua remocao.
- A cadeia do Portal deve apontar para uma unica versao ativa do contrato em DEV.

## Riscos principais

1. Duplicidade e divergencia entre `APRESENTACOES_PROCESSAMENTO` e `Atividades_Apresentacoes`.
2. IDs ausentes ou baseados em linha, impedindo idempotencia segura.
3. Acoplamento atual que altera titulo/eixos/status da atividade e pode recriar duas fontes de verdade.
4. Mistura de apresentacao com material, foto, convite, presenca, notificacao e historico no mesmo job.
5. Resumos de Membros/Core e bloqueios de desligamento dependerem de Sheets durante o cutover.
6. Dados privados vazarem em documento publico ou view do Portal.
7. Jobs e triggers legados continuarem escrevendo apos o cutover.
8. Exportacao ser confundida com fonte editavel e gerar reverse sync informal.

Os gates de saida de cada fase devem exigir divergencia zero, testes Emulator verdes, nenhum writer legado ativo no recorte e prova de que PROD permaneceu intocado.
