function renderizar(selecionada) {
  const lista = document.getElementById("lista-contas");
  lista.innerHTML = "";

  CONTAS_ORIGEM.forEach((conta) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = conta;
    btn.className = "conta-btn" + (conta === selecionada ? " selecionada" : "");
    btn.addEventListener("click", () => {
      chrome.storage.local.set({ [STORAGE_KEY_CONTA_ORIGEM]: conta }, () => renderizar(conta));
    });
    lista.appendChild(btn);
  });

  document.getElementById("conta-atual").textContent = selecionada || "—";
}

chrome.storage.local.get([STORAGE_KEY_CONTA_ORIGEM], (resultado) => {
  const selecionada = resultado[STORAGE_KEY_CONTA_ORIGEM] || CONTAS_ORIGEM[0];
  renderizar(selecionada);
  if (!resultado[STORAGE_KEY_CONTA_ORIGEM]) {
    chrome.storage.local.set({ [STORAGE_KEY_CONTA_ORIGEM]: selecionada });
  }
});
