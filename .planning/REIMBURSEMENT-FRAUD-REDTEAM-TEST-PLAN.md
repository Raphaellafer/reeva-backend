# Plano de Teste Antifraude de Reembolsos

## Objetivo

Testar a Reeva contra notas fiscais reais, fotos ruins, documentos incompletos e imagens sintéticas criadas por IA, cobrindo todas as categorias de despesa:

- Alimentacao (`FOOD`)
- Transporte (`TRANSPORT`)
- Hospedagem (`LODGING`)
- Compras (`PURCHASE`)
- Hardware (`HARDWARE`)

O objetivo nao e ensinar a criar documentos falsos. O objetivo e encontrar brechas no OCR, na validacao fiscal, na politica e no fluxo de aprovacao antes que isso vire risco financeiro.

## Resultado Esperado por Tipo de Problema

| Situacao | Resultado correto |
|---|---|
| Nota duplicada ja enviada por qualquer usuario | Recusa automatica |
| CNPJ matematicamente invalido | Recusa automatica |
| Chave fiscal de 44 digitos com digito verificador invalido | Recusa automatica |
| CNPJ da chave fiscal nao confere com CNPJ do fornecedor | Recusa automatica |
| Valor total ausente ou ilegivel | Funcionario deve reenviar foto |
| Soma de itens muito distante do total, sem taxa visivel | Funcionario deve reenviar foto |
| Soma de itens diferente do total por taxa/comissao/gorjeta plausivel | Aceitar total da nota |
| Nota fora da politica de valor/categoria | Revisao obrigatoria do gestor |
| Codigo fiscal ausente, QR ilegivel ou SEFAZ indisponivel | Revisao obrigatoria do gestor |
| Documento nao relacionado a despesa | Reenviar/recusar conforme leitura |

## Principio de Seguranca

Para imagens sintéticas de teste, usar preferencialmente fixtures internas com marca d'agua discreta ou metadado de teste quando forem armazenadas no repositorio.

Para testar imagens geradas externamente por IA, registrar apenas o resultado do teste e nao versionar a imagem caso ela pareca uma nota real utilizavel. Essas imagens devem servir para red-team local, nao como material de produto.

## Matriz Obrigatoria por Categoria

Cada categoria deve ter pelo menos estes casos:

| Caso | Descricao | Esperado |
|---|---|---|
| A. Real/legitima clara | Foto nitida, valor claro, fornecedor claro | Aprova automaticamente ou vai para revisao se politica exigir |
| B. Real/legitima ruim | Foto cortada, borrada, escura ou inclinada | Extrai parcialmente; se valor faltar, pede nova foto |
| C. Sintetica perfeita com CNPJ invalido | Documento parece real, mas CNPJ nao passa no digito verificador | Recusa automatica |
| D. Sintetica com chave fiscal invalida | Chave tem 44 digitos, mas digito verificador nao confere | Recusa automatica |
| E. CNPJ da chave diferente do fornecedor | CNPJ visual e CNPJ embutido na chave nao batem | Recusa automatica |
| F. Valor adulterado | Total nao bate com itens e nao ha taxa plausivel | Pede nova foto |
| G. Duplicada | Mesma imagem ou mesma chave fiscal enviada de novo | Recusa automatica |
| H. Fora da politica | Documento valido, mas valor acima do limite | Revisao obrigatoria do gestor |
| I. Categoria errada | Usuario escolhe categoria diferente do documento | Revisao ou recategorizacao pela IA |

## Casos Especificos por Categoria

### Alimentacao

Validar:
- Restaurante, cafeteria, delivery, padaria.
- Taxa de servico, comissao, gorjeta e couvert.
- Quantidade `1,0000` nao pode virar `1000`.
- Valores como `46,50` nao podem virar `465,00`.

Brechas prioritarias:
- Nota sintetica com CNPJ de exemplo.
- Nota com taxa de servico escondida em outra linha.
- Valor total editado para ficar dentro da politica.

### Transporte

Validar:
- Uber/99/taxi.
- Estacionamento.
- Pedagio.
- Combustivel.
- Bilhete/transporte publico.

Brechas prioritarias:
- Comprovante de app sem CNPJ ou sem chave fiscal deve ir para revisao, nao autoaprovar se faltar evidencia.
- Ticket de estacionamento/pegadio pode nao ter SEFAZ; nesse caso nao deve ser recusado automaticamente apenas por falta de chave.
- Valor muito alto para transporte deve cair em politica.

### Hospedagem

Validar:
- Hotel, pousada, Airbnb/acomodacao.
- Diarias, taxas e impostos.
- Total com multiplas diarias.

Brechas prioritarias:
- Total da estadia versus soma das diarias.
- Nota/fatura sem comprovante de pagamento.
- Hospedagem acima do limite deve ir para revisao do gestor.

### Compras

Validar:
- Mercado, farmacia, papelaria, materiais, compras gerais.
- Itens inelegiveis misturados com itens permitidos.

Brechas prioritarias:
- Compra pessoal classificada como corporativa.
- Cupom sem fornecedor claro.
- Valor total alterado.

### Hardware

Validar:
- Notebook, monitor, mouse, teclado, celular, perifericos.
- Compra de equipamento acima do limite.

Brechas prioritarias:
- Hardware comprado como `PURCHASE` para escapar de politica especifica.
- Nota sem numero fiscal/chave.
- Produto caro com fornecedor/CNPJ invalido.

## Checklist de Execucao Manual

Para cada imagem testada, registrar:

- Categoria enviada pelo funcionario.
- Categoria detectada pela IA.
- Valor detectado.
- Soma dos itens.
- CNPJ detectado.
- Chave fiscal detectada.
- Status fiscal.
- Status final da despesa.
- Mensagem exibida ao funcionario.
- Mensagem exibida ao gestor.
- Se deveria ter sido aprovado, revisado, reenviado ou recusado.

## Tabela de Resultado Sugerida

| Data | Categoria | Caso | Arquivo | Resultado atual | Resultado esperado | Passou? | Observacao |
|---|---|---|---|---|---|---|---|
|  | FOOD | CNPJ invalido | local/redteam/... |  | Recusa automatica |  |  |
|  | TRANSPORT | Sem SEFAZ | local/redteam/... |  | Revisao gestor |  |  |
|  | LODGING | Total com taxas | local/redteam/... |  | Valor aceito |  |  |
|  | PURCHASE | Duplicada | local/redteam/... |  | Recusa automatica |  |  |
|  | HARDWARE | Categoria errada | local/redteam/... |  | Revisao/recategorizacao |  |  |

## Criterios de Aceite Antes de Demo

- Nenhuma nota com CNPJ invalido deve ser autoaprovada.
- Nenhuma nota duplicada deve ir para revisao; deve ser recusada automaticamente.
- Nenhuma nota sem valor total confiavel deve permitir valor manual.
- Nota fora da politica deve ir para gestor com alerta claro.
- Falha fiscal critica deve aparecer uma unica vez, com explicacao completa.
- Casos inconclusivos devem ir para revisao, nao para recusa automatica.
- CFO deve conseguir enxergar recusas por duplicidade, politica e fiscal como riscos separados.

## Melhorias Tecnicas Recomendadas

1. Criar um endpoint interno de reprocessamento/admin para red-team em lote.
2. Salvar `fiscalFailureType` separado de `policyViolationReason`.
3. Adicionar status/decisao especifica `REJECTED_BY_FISCAL_VALIDATION`.
4. Decodificar QR code localmente antes de chamar IA.
5. Integrar provedor fiscal/SEFAZ para confirmar autorizacao real.
6. Criar base versionada de fixtures seguras, com imagens de teste marcadas como sem valor fiscal.
7. Gerar relatorio automatico de cada rodada red-team.
