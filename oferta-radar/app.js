(() => {
"use strict";

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const API_BASE = String(window.OFERTA_RADAR_API_URL || "").replace(/\/+$/, "");
const STORAGE = {
  offers: "ofertaRadar.offers.v2",
  links: "ofertaRadar.links.v2",
  clicks: "ofertaRadar.clicks.v2"
};
const state = {
  offers: [],
  links: [],
  apiOnline: false,
  demo: false,
  page: "ofertas",
  stats: { clicks: 0, offers: 0, links: 0, offerClicks: 0, linkClicks: 0 }
};

const demoOffers = [
  { id:"demo-1", name:"Fone Bluetooth sem fio", store:"Loja exemplo", category:"Eletrônicos", old_price:199.90, price:129.90, coupon:"RADAR10", icon:"🎧", sample:true, created_at:"2026-11-21" },
  { id:"demo-2", name:"Luminária de mesa LED", store:"Casa exemplo", category:"Casa", old_price:89.90, price:59.90, icon:"💡", sample:true, created_at:"2026-11-20" },
  { id:"demo-3", name:"Mochila para notebook", store:"Moda exemplo", category:"Moda", old_price:159.90, price:99.90, icon:"🎒", sample:true, created_at:"2026-11-19" },
  { id:"demo-4", name:"Kit cuidados pessoais", store:"Beleza exemplo", category:"Beleza", old_price:119.90, price:74.90, icon:"🧴", sample:true, created_at:"2026-11-18" },
  { id:"demo-5", name:"Controle para jogos", store:"Games exemplo", category:"Games", old_price:249.90, price:179.90, icon:"🎮", sample:true, created_at:"2026-11-17" },
  { id:"demo-6", name:"Garrafa térmica 1L", store:"Esporte exemplo", category:"Esporte", old_price:79.90, price:49.90, icon:"🥤", sample:true, created_at:"2026-11-16" }
];

const money = value => Number(value || 0).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
}[char]));

function toast(message, error = false) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.toggle("error", error);
  element.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove("show"), 3600);
}

function localRead(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch (_) {
    return [];
  }
}

function localWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (_) {
    toast("O navegador não conseguiu salvar os dados. Verifique o espaço disponível.", true);
    return false;
  }
}

function apiUrl(path) {
  return API_BASE + path;
}

async function api(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: { "Content-Type":"application/json", ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "Não foi possível concluir a solicitação.");
    error.status = response.status;
    throw error;
  }
  return data;
}

function canUseLocalFallback(error) {
  return !error.status || error.status === 404 || error.status === 405 || error.status >= 500;
}

function setDataStatus() {
  const status = $("#publicAccessStatus");
  if (!status) return;
  status.textContent = state.apiOnline
    ? "● Catálogo compartilhado"
    : "● Acesso livre · dados neste navegador";
  status.title = state.apiOnline
    ? "Os cadastros estão sendo salvos no servidor e podem ser vistos por todos."
    : "Sem o servidor publicado, os cadastros ficam somente neste navegador.";
}

function page(name, addHistory = true) {
  if (!$("#page-" + name)) return;
  state.page = name;
  $$(".page").forEach(element => element.classList.add("hidden"));
  $("#page-" + name).classList.remove("hidden");

  $$(".nav").forEach(button => {
    const active = button.dataset.page === name;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });

  if (addHistory && location.hash !== "#" + name) {
    history.pushState({ page:name }, "", "#" + name);
  }

  if (name === "links") loadLinks();
  if (name === "vendas") loadStats();
  if (name === "ofertas") loadOffers();

  window.scrollTo({ top:0, behavior:"smooth" });
}

function isValidWebLink(value) {
  try {
    const url = new URL(String(value).trim());
    return (url.protocol === "http:" || url.protocol === "https:")
      && Boolean(url.hostname)
      && url.hostname.includes(".")
      && !url.username
      && !url.password;
  } catch (_) {
    return false;
  }
}

function discount(offer) {
  const oldPrice = Number(offer.old_price);
  const currentPrice = Number(offer.price);
  return oldPrice > currentPrice && oldPrice > 0
    ? Math.round((1 - currentPrice / oldPrice) * 100)
    : 0;
}

function currentFilters() {
  const query = $("#search").value.trim().toLowerCase();
  const store = $("#store").value;
  const category = $("#category").value;
  const minimum = Number($("#minimum").value);
  const sort = $("#sort").value;

  const results = state.offers.filter(offer => {
    const searchable = (offer.name + " " + offer.store + " " + offer.category).toLowerCase();
    return (!query || searchable.includes(query))
      && (!store || store === offer.store)
      && (!category || category === offer.category)
      && discount(offer) >= minimum;
  });

  results.sort((a, b) => {
    if (sort === "price") return Number(a.price) - Number(b.price);
    if (sort === "recent") return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    return discount(b) - discount(a);
  });
  return results;
}

function renderOffers() {
  const offers = currentFilters();
  const grid = $("#offerGrid");
  grid.innerHTML = "";
  $("#resultCount").textContent = offers.length + (offers.length === 1 ? " oferta encontrada" : " ofertas encontradas");
  $("#emptyOffers").classList.toggle("hidden", offers.length !== 0);

  offers.forEach(offer => {
    const card = document.createElement("article");
    card.className = "offer-card";

    let action;
    if (offer.sample) {
      action = '<button class="btn primary" type="button" disabled>Exemplo · sem link</button>';
    } else if (offer.local) {
      const target = offer.affiliate_url || offer.destination_url;
      action = '<a class="btn primary" href="' + escapeHTML(target) + '" target="_blank" rel="noopener noreferrer" data-local-offer="' + escapeHTML(offer.id) + '">Ver oferta ↗</a>';
    } else {
      action = '<a class="btn primary" href="' + escapeHTML(apiUrl("/go/" + encodeURIComponent(offer.id))) + '" target="_blank" rel="noopener noreferrer">Ver oferta ↗</a>';
    }

    card.innerHTML =
      '<div class="visual">' + escapeHTML(offer.icon || "🛍️")
      + '<span class="discount">-' + discount(offer) + '%</span>'
      + (offer.sample ? '<span class="sample">EXEMPLO</span>' : "")
      + '</div><div class="offer-body">'
      + '<div class="store-name">' + escapeHTML(offer.store) + ' · ' + escapeHTML(offer.category) + '</div>'
      + '<div class="offer-title">' + escapeHTML(offer.name) + '</div>'
      + '<div class="old-price">' + money(offer.old_price) + '</div>'
      + '<div class="new-price">' + money(offer.price) + '</div>'
      + '<div class="coupon">' + (offer.coupon ? "Cupom: " + escapeHTML(offer.coupon) : "&nbsp;") + '</div>'
      + '<div class="offer-meta"><span>Conferir na loja</span><span>' + (offer.sample ? "dados fictícios" : "preço informado") + '</span></div>'
      + action + '</div>';
    grid.append(card);
  });

  const stores = [...new Set(state.offers.map(offer => offer.store))].sort();
  const storeFilter = $("#store");
  const previousStore = storeFilter.value;
  storeFilter.innerHTML = '<option value="">Todas as lojas</option>'
    + stores.map(store => '<option value="' + escapeHTML(store) + '">' + escapeHTML(store) + '</option>').join("");
  storeFilter.value = stores.includes(previousStore) ? previousStore : "";

  $("#offerCount").textContent = state.offers.length;
  $("#storeCount").textContent = stores.length;
  $("#dataBadge").textContent = state.apiOnline
    ? "CATÁLOGO COMPARTILHADO"
    : state.demo ? "AMOSTRA + DADOS LOCAIS" : "DADOS NESTE NAVEGADOR";
  setDataStatus();
}

async function loadOffers() {
  try {
    const data = await api("/api/offers");
    state.apiOnline = true;
    const localOffers = localRead(STORAGE.offers).map(offer => ({ ...offer, local:true }));
    state.offers = [...(data.offers || []).map(offer => ({ ...offer, local:false })), ...localOffers];
    state.demo = state.offers.length === 0;
    if (state.demo) state.offers = demoOffers;
  } catch (_) {
    state.apiOnline = false;
    const localOffers = localRead(STORAGE.offers).map(offer => ({ ...offer, local:true }));
    state.offers = [...localOffers, ...demoOffers];
    state.demo = true;
  }
  renderOffers();
}

async function loadLinks() {
  try {
    const data = await api("/api/affiliate-links");
    state.apiOnline = true;
    const localLinks = localRead(STORAGE.links).map(link => ({ ...link, local:true }));
    state.links = [
      ...(data.links || []).map(link => ({ ...link, local:false })),
      ...localLinks
    ];
  } catch (_) {
    state.apiOnline = false;
    state.links = localRead(STORAGE.links).map(link => ({ ...link, local:true }));
  }
  renderLinks();
  await loadStats();
  setDataStatus();
}

function renderLinks() {
  const list = $("#myLinks");
  list.innerHTML = "";
  $("#linkTotal").textContent = state.links.length;
  $("#storageMode").textContent = state.apiOnline ? "Compartilhado" : "Neste navegador";

  if (!state.links.length) {
    list.innerHTML = '<div class="empty"><h3>Nenhum link cadastrado</h3><p>Adicione seu primeiro link de afiliado no formulário acima.</p></div>';
    return;
  }

  state.links.forEach(link => {
    const row = document.createElement("div");
    row.className = "data-row";
    const trackedUrl = link.local ? link.url : apiUrl("/r/" + encodeURIComponent(link.id));
    row.innerHTML =
      '<div class="row-icon">↗</div><div class="row-main"><b>' + escapeHTML(link.name)
      + '</b><small>' + escapeHTML(link.store) + ' · ' + escapeHTML(link.url) + '</small></div>'
      + '<div class="row-metric">' + Number(link.clicks || 0) + '<small>cliques</small></div>'
      + '<a class="row-btn" href="' + escapeHTML(trackedUrl) + '" target="_blank" rel="noopener noreferrer"'
      + (link.local ? ' data-local-link="' + escapeHTML(link.id) + '"' : "") + '>Abrir</a>'
      + '<button class="row-btn" type="button" data-copy="' + escapeHTML(link.url) + '">Copiar URL</button>';
    list.append(row);
  });
}

function localClicks() {
  return localRead(STORAGE.clicks).reduce((sum, item) => sum + Number(item.count || 0), 0);
}

async function loadStats() {
  try {
    const data = await api("/api/stats");
    state.apiOnline = true;
    state.stats = data;
  } catch (_) {
    state.apiOnline = false;
    state.stats = {
      clicks:localClicks(),
      offers:localRead(STORAGE.offers).length,
      links:localRead(STORAGE.links).length,
      offerClicks:localClicks(),
      linkClicks:0
    };
  }

  $("#linkClicks").textContent = state.stats.clicks || 0;
  $("#salesClicks").textContent = state.stats.clicks || 0;
  $("#salesOffers").textContent = state.stats.offers || localRead(STORAGE.offers).length;
  $("#salesLinks").textContent = state.stats.links || localRead(STORAGE.links).length;
  setDataStatus();
}

function trackLocalClick(id) {
  const clicks = localRead(STORAGE.clicks);
  const entry = clicks.find(item => item.id === id);
  if (entry) entry.count = Number(entry.count || 0) + 1;
  else clicks.push({ id, count:1 });
  localWrite(STORAGE.clicks, clicks);
}

async function addLink(event) {
  event.preventDefault();
  const url = $("#linkUrl").value.trim();
  if (!isValidWebLink(url)) {
    toast("Cole um link válido começando com http:// ou https://.", true);
    $("#linkUrl").focus();
    return;
  }

  const payload = {
    store:$("#linkStore").value.trim(),
    name:$("#linkName").value.trim(),
    url
  };

  try {
    await api("/api/affiliate-links", { method:"POST", body:JSON.stringify(payload) });
    $("#linkForm").reset();
    toast("Link adicionado ao mural público.");
    await loadLinks();
  } catch (error) {
    if (!canUseLocalFallback(error)) {
      toast(error.message, true);
      return;
    }
    const links = localRead(STORAGE.links);
    links.unshift({ id:"local-" + Date.now(), ...payload, clicks:0, created_at:new Date().toISOString(), local:true });
    if (localWrite(STORAGE.links, links)) {
      $("#linkForm").reset();
      state.links = links;
      renderLinks();
      toast("Link salvo neste navegador. Para compartilhar entre visitantes, ative o servidor.");
    }
  }
}

async function addOffer(event) {
  event.preventDefault();
  const destination = $("#destinationUrl").value.trim();
  const affiliate = $("#offerAffiliate").value.trim();
  const oldPrice = Number($("#oldPrice").value);
  const price = Number($("#newPrice").value);

  if (!isValidWebLink(destination)) {
    toast("Informe o link válido do produto, começando com http:// ou https://.", true);
    $("#destinationUrl").focus();
    return;
  }
  if (affiliate && !isValidWebLink(affiliate)) {
    toast("O link de afiliado precisa ser um endereço http:// ou https:// válido.", true);
    $("#offerAffiliate").focus();
    return;
  }
  if (!Number.isFinite(oldPrice) || !Number.isFinite(price) || oldPrice <= 0 || price <= 0 || price >= oldPrice) {
    toast("O preço promocional deve ser menor que o preço anterior.", true);
    $("#newPrice").focus();
    return;
  }

  const offer = {
    name:$("#productName").value.trim(),
    store:$("#productStore").value.trim(),
    category:$("#productCategory").value,
    old_price:oldPrice,
    price,
    coupon:$("#coupon").value.trim(),
    destination_url:destination,
    affiliate_url:affiliate,
    expires_at:$("#expiry").value || null
  };

  try {
    await api("/api/offers", { method:"POST", body:JSON.stringify(offer) });
    $("#offerForm").reset();
    toast("Produto publicado no catálogo compartilhado.");
    await loadOffers();
    page("ofertas");
  } catch (error) {
    if (!canUseLocalFallback(error)) {
      toast(error.message, true);
      return;
    }
    const offers = localRead(STORAGE.offers);
    offers.unshift({
      id:"local-" + Date.now(),
      ...offer,
      local:true,
      clicks:0,
      created_at:new Date().toISOString(),
      icon:"🛍️"
    });
    if (localWrite(STORAGE.offers, offers)) {
      $("#offerForm").reset();
      toast("Produto salvo neste navegador. Para compartilhar com todos, ative o servidor.");
      await loadOffers();
      page("ofertas");
    }
  }
}

function bind() {
  $$(".nav,[data-page]").forEach(button => {
    button.addEventListener("click", () => page(button.dataset.page));
  });

  $$("[data-scroll]").forEach(button => {
    button.addEventListener("click", () => {
      const target = $("#" + button.dataset.scroll);
      if (target) target.scrollIntoView({ behavior:"smooth", block:"start" });
    });
  });

  $("#linkForm").addEventListener("submit", addLink);
  $("#offerForm").addEventListener("submit", addOffer);

  ["search","store","category","minimum","sort"].forEach(id => {
    $("#" + id).addEventListener(id === "search" ? "input" : "change", renderOffers);
  });

  $("#clearFilters").addEventListener("click", () => {
    $("#search").value = "";
    $("#store").value = "";
    $("#category").value = "";
    $("#minimum").value = "0";
    $("#sort").value = "discount";
    renderOffers();
  });

  $("#myLinks").addEventListener("click", async event => {
    const copyButton = event.target.closest("[data-copy]");
    if (copyButton) {
      try {
        await navigator.clipboard.writeText(copyButton.dataset.copy);
        toast("Link copiado.");
      } catch (_) {
        toast("Não foi possível copiar o link.", true);
      }
    }
    const localLink = event.target.closest("[data-local-link]");
    if (localLink) {
      trackLocalClick(localLink.dataset.localLink);
      await loadStats();
    }
  });

  $("#offerGrid").addEventListener("click", async event => {
    const localOffer = event.target.closest("[data-local-offer]");
    if (localOffer) {
      trackLocalClick(localOffer.dataset.localOffer);
      await loadStats();
    }
  });

  window.addEventListener("popstate", () => {
    const name = location.hash.replace("#", "");
    page($("#page-" + name) ? name : "ofertas", false);
  });
}

async function init() {
  bind();
  await loadOffers();
  await loadStats();
  const initialPage = location.hash.replace("#", "");
  page($("#page-" + initialPage) ? initialPage : "ofertas", false);
}

document.addEventListener("DOMContentLoaded", init);
})();