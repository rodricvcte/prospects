# Prospects — extensão de Chrome

Roda no Instagram e no WhatsApp Web, consulta e grava dados na API do projeto
Prospects (pasta raiz deste repo).

## Carregar no Chrome (modo desenvolvedor)

1. Copie `config.local.example.js` para `config.local.js` e preencha
   `EXTENSION_API_KEY` com o mesmo valor da variável `EXTENSION_API_KEY` do
   servidor (`.env.local` / Vercel) — a API agora exige autenticação e a
   extensão usa essa chave fixa em vez de login interativo
2. Abra `chrome://extensions`
3. Ative "Modo do desenvolvedor" (canto superior direito)
4. Clique em "Carregar sem compactação" e selecione esta pasta (`extension/`)
5. Fixe o ícone da extensão na barra do Chrome e clique nele para escolher a
   conta de origem atual

## Trocar entre dev e produção

Edite a primeira linha de `config.js`:

```js
const API_BASE_URL = "http://localhost:3000";
// const API_BASE_URL = "https://prospects-indol.vercel.app";
```

Depois de editar, recarregue a extensão em `chrome://extensions` (botão de
recarregar no card da extensão) e dê F5 nas abas do Instagram/WhatsApp Web
abertas.

## Limitações conhecidas

- A extração de @username, nome de exibição, número de WhatsApp e nome de
  contato é heurística baseada no DOM atual do Instagram/WhatsApp Web — pode
  falhar se esses sites mudarem o markup. Por isso os campos do formulário de
  approach sempre vêm editáveis, mesmo pré-preenchidos.
- No WhatsApp Web, o número de telefone só aparece no cabeçalho da conversa
  quando o contato **não** está salvo na agenda. Contato salvo mostra o nome,
  não o número — nesse caso o campo "Conta destino" fica vazio para
  preenchimento manual.
