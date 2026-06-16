# ID_PESSOA na Base Atividades v2

## Diretriz

`ID_PESSOA` e a chave tecnica principal para novos vinculos individuais em atividades, envolvidos, chamadas, justificativas, certificados e participacoes.

`RGA` continua existindo como campo auxiliar/legado para conferencia humana e compatibilidade historica, mas novas rotinas devem preferir `ID_PESSOA`.

## Resolucao

O Portal nao resolve `ID_PESSOA` lendo planilhas. A resolucao de RGA/e-mail/nome para `ID_PESSOA` ocorre no backend, pelo helper:

```js
atividadesV2_resolverPessoa_(input)
```

O helper tenta usar GEAPA_CORE/Pessoas v2 quando disponivel e retorna:

```json
{
  "statusResolucao": "RESOLVIDO",
  "idPessoa": "",
  "rga": "",
  "email": "",
  "nome": "",
  "origem": "core"
}
```

Status planejados para conciliacao historica:

- `RESOLVIDO`: ha um `ID_PESSOA` confiavel.
- `AMBIGUO`: mais de uma pessoa possivel; requer revisao humana.
- `NAO_ENCONTRADO`: nao foi possivel resolver automaticamente.

## Diagnostico e complementacao

Use as rotinas manuais abaixo apenas na base v2 DEV:

```js
atividadesV2_diagnosticarResolverPessoaDev()
atividadesV2_diagnosticarIdPessoaDev()
atividadesV2_complementarIdPessoaDev()
atividadesV2_complementarIdPessoaTodasAbasDev()
```

`atividadesV2_diagnosticarResolverPessoaDev()` verifica quais APIs de Pessoas v2 estao disponiveis no GEAPA_CORE usado por este modulo e testa uma amostra real das abas de atividades.

`atividadesV2_diagnosticarIdPessoaDev()` nao altera dados. Ela analisa abas operacionais e views `PORTAL_*`, conta lacunas de `ID_PESSOA` e retorna exemplos de linhas resolvidas, ambiguas, nao encontradas ou sem dados minimos.

`atividadesV2_complementarIdPessoaDev()` preenche apenas campos tecnicos de pessoa vazios, usando dados ja existentes na linha, como RGA, e-mail e nome. Por padrao, nao sobrescreve `ID_PESSOA` ja preenchido.

`atividadesV2_complementarIdPessoaTodasAbasDev()` e a funcao manual recomendada para uso normal. Ela percorre `Atividades`, `Atividades_Envolvidos`, `Atividades_Presencas_Registros`, `Justificativas_Faltas`, `PORTAL_APRESENTACOES`, `PORTAL_FREQUENCIA_MEMBROS` e `PORTAL_JUSTIFICATIVAS`, preservando IDs ja preenchidos. `Atividades_Apresentacoes` e tratada como legado opcional: se a aba ainda tiver `ID_PESSOA`, a rotina pode complementar; se nao tiver, nao e erro.

Na modelagem nova, `Atividades.ID_PESSOA_PRINCIPAL` identifica a pessoa principal usada em cards/listas, e `Atividades_Envolvidos.ID_PESSOA` identifica os vinculos individuais completos. `Atividades_Apresentacoes` nao deve voltar a ser fonte principal de pessoa, RGA, e-mail, titulo ou eixo.

Para bases maiores, rode por aba para evitar limite de tempo do Apps Script:

```js
atividadesV2_complementarIdPessoaDev({
  sheetName: 'PORTAL_APRESENTACOES',
  maxMs: 240000
})
```

A complementacao em lote usa indice em memoria de Pessoas v2 e evita buscas pontuais lentas por linha. Se for necessario permitir busca pontual pelo CORE para casos residuais, use `allowSlowLookup: true` em uma execucao pequena e direcionada.

## Campos

Publicos para o Portal:

- `idPessoa`, quando necessario para reenviar payload operacional.
- nome publico ou nome de exibicao.
- status de presenca do proprio fluxo autorizado.

Internos/operacionais:

- `ID_PESSOA`
- `ID_REFERENCIA`
- `RGA`
- e-mail
- vinculo/cargo operacional

Sensiveis ou restritos:

- e-mails completos em views publicas.
- observacoes internas.
- logs.
- cobrancas.
- links privados.
- presenca nominal de terceiros sem permissao.

## Regras de Escrita

- Novas escritas gravam `ID_PESSOA` sempre que possivel.
- `ID_REFERENCIA` pode receber `ID_PESSOA` quando disponivel; RGA/e-mail/nome ficam como fallback legado.
- O backend sempre revalida permissao e aplicabilidade; nao confia apenas no `idPessoa` enviado pelo front-end.
- Registros antigos baseados em RGA continuam aceitos durante a transicao.
