"use strict";

function escaparCsv(valor) {
  const str = String(valor ?? "");
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function linhaCsv(campos) {
  return campos.map(escaparCsv).join(",");
}

// Parser simples de CSV respeitando aspas (campos com vírgula, quebra de
// linha ou aspas escapadas como "").
function parseCsv(texto) {
  const linhas = [];
  let campo = "";
  let linha = [];
  let dentroAspas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (dentroAspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          dentroAspas = false;
        }
      } else {
        campo += c;
      }
    } else if (c === '"') {
      dentroAspas = true;
    } else if (c === ",") {
      linha.push(campo);
      campo = "";
    } else if (c === "\n") {
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else if (c === "\r") {
      // ignorado — tratado junto com o \n que normalmente o segue
    } else {
      campo += c;
    }
  }
  if (campo.length > 0 || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas;
}

function parseCsvComCabecalho(texto) {
  const semBom = texto.replace(/^﻿/, "");
  const linhas = parseCsv(semBom).filter((l) => !(l.length === 1 && l[0] === ""));
  if (linhas.length === 0) return [];
  const [cabecalho, ...resto] = linhas;
  return resto.map((linha) => {
    const obj = {};
    cabecalho.forEach((coluna, i) => {
      obj[coluna] = linha[i] ?? "";
    });
    return obj;
  });
}

module.exports = { escaparCsv, linhaCsv, parseCsv, parseCsvComCabecalho };
