# Import Instagram — fluxo em 2 passos

1. Exporte suas conversas do Instagram em formato JSON (Central de Contas do
   Meta → Suas informações → Baixar suas informações) e extraia o zip.

2. Gere o CSV de revisão a partir da pasta `inbox` do export:

   ```
   node gerar-csv.js "<caminho>/your_instagram_activity/messages/inbox"
   ```

   Isso cria `revisao-import-instagram.csv` nesta pasta. As linhas vêm
   ordenadas por `total_mensagens_na_conversa` crescente — conversas curtas
   (prospects frios de fato) aparecem primeiro, conversas longas (pessoais)
   ficam no final, facilitando a revisão.

   A pasta `message_requests/` é ignorada de propósito — sempre apontar pra
   `messages/inbox`.

3. Abra `revisao-import-instagram.csv` no Excel ou Google Sheets e preencha a
   coluna `incluir` com `sim` em cada linha que deve virar prospect. Linhas em
   branco (ou qualquer outro valor) são ignoradas na importação. Salve/exporte
   de volta como CSV.

   Colunas que merecem atenção na revisão:

   - `conta_destino`: **o export de DM da Meta não grava o @ real em lugar
     nenhum** — só o nome de exibição da conversa. O nome da pasta é uma
     versão achatada desse nome de exibição (sem espaço/acento/pontuação),
     não o username. Às vezes coincide (quando a pessoa usa o próprio @ como
     nome de exibição), às vezes não tem nada a ver. **Todo `conta_destino`
     precisa ser conferido manualmente** antes de marcar `sim` — não tem
     como o script adivinhar o @ verdadeiro, essa informação não existe no
     arquivo exportado.
   - `confira_usuario`: vem marcado "SIM" quando `conta_destino` tem mais de
     30 caracteres — o limite de tamanho de username do Instagram, então
     nesses casos é *garantido* que não é o @ real (o nome de exibição era
     longo/descritivo, tipo "Dr. Fulano | Dentista | Cidade"). Útil pra
     priorizar a revisão, mas linhas sem essa marca não estão necessariamente
     certas — só não foram *provadas* erradas.
   - `regiao`: tentativa automática de achar "Cidade/UF" no nome de exibição
     do perfil (ex: "📍São Paulo - SP"). Só funciona quando o prospect coloca
     a cidade no próprio nome — a maioria das linhas fica em branco, e às
     vezes pega algo errado (ex: siglas como "CRO-PR" viram falso positivo de
     região). Confira antes de importar.

4. Rode a importação a partir do CSV já revisado. Primeiro em modo teste, pra
   conferir o que seria enviado sem gravar nada:

   ```
   node importar-csv.js revisao-import-instagram.csv --conta=rodrigosc19 --dry-run
   ```

   Depois de conferir, rode de verdade (precisa do painel local rodando em
   `localhost:3000`):

   ```
   node importar-csv.js revisao-import-instagram.csv --conta=rodrigosc19
   ```

   Linhas cujo `conta_destino` já existir na base são puladas automaticamente
   (não param o script). Ao final é impresso um resumo: quantas linhas
   marcadas `sim`, quantas importadas, quantas já existiam e quantas falharam
   (com o motivo).
