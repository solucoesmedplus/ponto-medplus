"use strict";

const SUPABASE_URL = "COLE_AQUI_A_URL_DO_SUPABASE";
const SUPABASE_ANON_KEY = "COLE_AQUI_A_CHAVE_ANON_PUBLICA";
const DEFAULT_PASSWORD = "mudar@123";
const LOGO_URL = "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgywsdWKH6rlDURrDoENalBtkXnhxike5bP4lesilVl-vBhsPrYmIIDLESb8VpR1e6AcRyxgXcyW8snNH4tSyIaJmTizACfOeqQYUjoaXhPE0MmMlHigietjYjKFLpEx5lccR3l10Q5RBwQMNBG8ENz6rAsMubobIyLRZa5DOLpWFtkMEH0Bx8_2LPVZFmb/s16000/logotipo-med-plus2025-1.png";

const PUNCH_LABELS = ["Entrada 1", "Saída 1", "Entrada 2", "Saída 2"];
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const els = {};
let supabaseClient = null;
let state = {
  user: null,
  records: [],
  signatures: [],
  currentPassword: DEFAULT_PASSWORD,
  photoDataUrl: "",
  location: null,
  cameraStream: null,
  activeView: "home"
};

document.addEventListener("DOMContentLoaded", init);

function init() {
  cacheElements();
  supabaseClient = createSupabaseClient();
  seedLocalDemo();
  bindEvents();
  tick();
  setInterval(tick, 1000);
  setDefaultDates();
  renderTimesheet();
}

function cacheElements() {
  [
    "loginScreen", "appShell", "loginForm", "loginEmail", "loginPassword", "loginMessage",
    "passwordModal", "passwordForm", "newPassword", "confirmPassword", "passwordMessage",
    "signedUser", "logoutBtn", "themeToggle", "menuBtn", "sidebar", "pageTitle", "clockNow",
    "todayLabel", "nextPunchLabel", "lastPunchText", "signatureStatus", "signatureReminder",
    "monthReminder", "summaryList", "generalMonth", "dailyClock", "protocolPreview",
    "cameraVideo", "photoCanvas", "photoPreview", "startCameraBtn", "capturePhotoBtn",
    "geoBtn", "geoStatus", "punchBtn", "punchMessage", "todayPunches", "historyFilters",
    "historyStart", "historyEnd", "historyList", "receiptList", "signMonth", "signPassword",
    "signBtn", "signMessage", "signPeriod", "timesheetPaper"
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });

  els.views = {
    home: document.getElementById("homeView"),
    general: document.getElementById("generalView"),
    daily: document.getElementById("dailyView"),
    history: document.getElementById("historyView"),
    receipts: document.getElementById("receiptsView"),
    sign: document.getElementById("signView")
  };
}

function createSupabaseClient() {
  const configured = SUPABASE_URL.startsWith("https://") && SUPABASE_ANON_KEY.length > 30;
  if (!configured || !window.supabase) return null;
  return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

function seedLocalDemo() {
  const users = JSON.parse(localStorage.getItem("mp_users") || "[]");
  if (users.length) return;
  localStorage.setItem("mp_users", JSON.stringify([{
    id: "demo-paulo",
    email: "paulo@medplus.local",
    password: DEFAULT_PASSWORD,
    full_name: "Paulo Anselmo Correa",
    cpf: "247.373.878-51",
    ctps: "2473738/7851/SP",
    pis: "12502382221",
    admission_date: "2025-09-04",
    company_name: "MED PLUS MANUTENCAO E REPARACAO DE EQUIPAMENTOS MEDICOS E HOSPITALARES LTDA",
    company_cnpj: "30540606000180",
    job_title: "Analista de Help Desk Pleno",
    department: "TI - Tecnologia da Informação",
    cost_center: "Auxiliar de Informática",
    force_password_change: true
  }]));
}

function bindEvents() {
  els.loginForm.addEventListener("submit", onLogin);
  els.passwordForm.addEventListener("submit", onPasswordChange);
  els.logoutBtn.addEventListener("click", logout);
  els.themeToggle.addEventListener("click", toggleTheme);
  els.menuBtn.addEventListener("click", () => els.sidebar.classList.toggle("is-open"));
  els.startCameraBtn.addEventListener("click", startCamera);
  els.capturePhotoBtn.addEventListener("click", capturePhoto);
  els.geoBtn.addEventListener("click", captureLocation);
  els.punchBtn.addEventListener("click", registerPunch);
  els.historyFilters.addEventListener("input", renderHistory);
  els.signMonth.addEventListener("input", renderTimesheet);
  els.signBtn.addEventListener("click", signTimesheet);

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  document.querySelectorAll("[data-view-jump]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.viewJump));
  });
}

async function onLogin(event) {
  event.preventDefault();
  const email = els.loginEmail.value.trim().toLowerCase();
  const password = els.loginPassword.value;
  els.loginMessage.textContent = "";

  if (!email.endsWith("@medplus.local")) {
    els.loginMessage.textContent = "Use o e-mail corporativo nome@medplus.local.";
    return;
  }

  try {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const profile = await loadProfile(data.user.id);
      state.user = profile;
      state.currentPassword = password;
    } else {
      const users = JSON.parse(localStorage.getItem("mp_users") || "[]");
      const user = users.find((item) => item.email === email && item.password === password);
      if (!user) throw new Error("E-mail ou senha inválidos.");
      state.user = user;
      state.currentPassword = password;
    }

    await loadUserData();
    els.loginScreen.classList.add("is-hidden");
    els.appShell.classList.remove("is-hidden");
    els.signedUser.textContent = state.user.full_name || email;
    setView("daily");

    if (state.user.force_password_change || password === DEFAULT_PASSWORD) {
      els.passwordModal.classList.remove("is-hidden");
    }
  } catch (error) {
    els.loginMessage.textContent = error.message || "Não foi possível entrar.";
  }
}

async function loadProfile(userId) {
  const { data, error } = await supabaseClient
    .from("colaboradores")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

async function onPasswordChange(event) {
  event.preventDefault();
  const password = els.newPassword.value;
  const confirmation = els.confirmPassword.value;
  els.passwordMessage.textContent = "";

  if (password !== confirmation) {
    els.passwordMessage.textContent = "As senhas não conferem.";
    return;
  }

  if (password === DEFAULT_PASSWORD) {
    els.passwordMessage.textContent = "Escolha uma senha diferente da padrão.";
    return;
  }

  try {
    if (supabaseClient) {
      const { error } = await supabaseClient.auth.updateUser({ password });
      if (error) throw error;
      await supabaseClient
        .from("colaboradores")
        .update({ force_password_change: false })
        .eq("id", state.user.id);
    } else {
      const users = JSON.parse(localStorage.getItem("mp_users") || "[]");
      const updated = users.map((user) => {
        if (user.id !== state.user.id) return user;
        return { ...user, password, force_password_change: false };
      });
      localStorage.setItem("mp_users", JSON.stringify(updated));
      state.user = updated.find((user) => user.id === state.user.id);
    }
    state.currentPassword = password;
    els.passwordModal.classList.add("is-hidden");
    els.passwordForm.reset();
  } catch (error) {
    els.passwordMessage.textContent = error.message || "Não foi possível trocar a senha.";
  }
}

async function loadUserData() {
  if (supabaseClient) {
    const [recordsResult, signaturesResult] = await Promise.all([
      supabaseClient.from("ponto_registros").select("*").eq("user_id", state.user.id).order("captured_at", { ascending: false }),
      supabaseClient.from("ponto_assinaturas").select("*").eq("user_id", state.user.id)
    ]);
    state.records = recordsResult.data || [];
    state.signatures = signaturesResult.data || [];
  } else {
    state.records = JSON.parse(localStorage.getItem(storageKey("records")) || "[]");
    state.signatures = JSON.parse(localStorage.getItem(storageKey("signatures")) || "[]");
  }
}

function storageKey(type) {
  return `mp_${type}_${state.user.id}`;
}

function tick() {
  const now = new Date();
  const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const full = now.toLocaleTimeString("pt-BR");
  if (els.clockNow) els.clockNow.textContent = time;
  if (els.dailyClock) els.dailyClock.textContent = full;
  if (els.todayLabel) {
    els.todayLabel.textContent = now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  }
}

function setDefaultDates() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 7);
  els.historyStart.value = toDateInput(start);
  els.historyEnd.value = toDateInput(now);
  els.signMonth.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function setView(viewName) {
  state.activeView = viewName;
  Object.entries(els.views).forEach(([name, element]) => {
    element.classList.toggle("is-hidden", name !== viewName);
  });
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === viewName);
  });
  els.pageTitle.textContent = {
    home: "Início",
    general: "Informações Gerais",
    daily: "Ponto Diário",
    history: "Meu Histórico",
    receipts: "Comprovantes",
    sign: "Assinar Ponto"
  }[viewName];
  els.sidebar.classList.remove("is-open");
  renderAll();
}

function renderAll() {
  renderHome();
  renderSummary();
  renderDaily();
  renderHistory();
  renderReceipts();
  renderTimesheet();
}

function renderHome() {
  const today = getTodayRecords();
  els.nextPunchLabel.textContent = getNextPunchLabel();
  els.lastPunchText.textContent = today.length
    ? `Última marcação: ${today[0].entry_type} às ${formatTime(today[0].captured_at)}.`
    : "Nenhum ponto registrado hoje.";

  const period = currentPeriod();
  const signed = state.signatures.some((item) => item.period_start === period.start);
  els.signatureStatus.textContent = signed ? "Assinado" : "Pendente";

  if (isLastBusinessDay(new Date())) {
    els.monthReminder.classList.remove("is-hidden");
    els.signatureReminder.textContent = "Hoje é o último dia útil. Assine a folha após conferir os registros.";
  } else {
    els.monthReminder.classList.add("is-hidden");
    els.signatureReminder.textContent = `Prazo: ${lastBusinessDay(new Date()).toLocaleDateString("pt-BR")}.`;
  }
}

function renderSummary() {
  const now = new Date();
  els.generalMonth.textContent = MONTHS[now.getMonth()];
  const records = recordsInMonth(now.getFullYear(), now.getMonth());
  const extras = records.length ? minutesToTime(Math.max(0, records.length * 12)) : "22:45";
  const rows = [
    ["Faltas", records.length ? "0" : "1"],
    ["Atrasos", "00:00"],
    ["Horas Extras", extras],
    ["Saldo do mês", records.length ? minutesToTime(records.length * 8) : "13:45", true],
    ["Saldo Banco de Horas", records.length ? minutesToTime(45 * 60 + records.length * 8) : "45:28", true]
  ];
  els.summaryList.innerHTML = rows.map(([label, value, strong]) => `
    <div class="summary-row">
      <dt class="${strong ? "strong" : ""}">${label}</dt>
      <dd>${value}</dd>
    </div>
  `).join("");
}

function renderDaily() {
  els.protocolPreview.textContent = createProtocol(new Date(), false);
  els.punchBtn.textContent = `Registrar ${getNextPunchLabel()}`;
  const today = getTodayRecords();
  els.todayPunches.innerHTML = today.length ? today.map((record) => `
    <div class="punch-line">
      <span>${record.entry_type}</span>
      <span class="mono">${formatTime(record.captured_at)}</span>
    </div>
  `).join("") : `<p class="meta">Sem marcações hoje.</p>`;
}

function renderHistory() {
  const start = new Date(`${els.historyStart.value}T00:00:00`);
  const end = new Date(`${els.historyEnd.value}T23:59:59`);
  const rows = [];
  const cursor = new Date(start);
  const sampleBalances = ["00:00", "00:00", "02:39", "01:32", "03:21", "02:34", "01:44", "00:00"];
  let index = 0;

  while (cursor <= end) {
    const dayRecords = recordsForDate(cursor);
    const balance = dayRecords.length ? minutesToTime(dayRecords.length * 11) : sampleBalances[index % sampleBalances.length];
    const hasExtra = balance !== "00:00" && ![0, 6].includes(cursor.getDay());
    rows.push(`
      <div class="history-row">
        <span class="history-date">${cursor.toLocaleDateString("pt-BR")}</span>
        <span class="history-balance">Saldo<br>${balance}${hasExtra ? `<span class="history-star">*</span>` : ""}</span>
      </div>
    `);
    cursor.setDate(cursor.getDate() + 1);
    index += 1;
  }
  els.historyList.innerHTML = rows.join("");
}

function renderReceipts() {
  const records = [...state.records].sort((a, b) => new Date(b.captured_at) - new Date(a.captured_at));
  els.receiptList.innerHTML = records.length ? records.map((record) => `
    <article class="receipt-item">
      ${record.photo_data_url ? `<img src="${record.photo_data_url}" alt="Foto do comprovante">` : `<img alt="">`}
      <div>
        <strong>${record.entry_type} - ${formatDateTime(record.captured_at)}</strong>
        <div class="receipt-code">${record.protocol}</div>
        <div class="meta">${record.latitude ? `${Number(record.latitude).toFixed(5)}, ${Number(record.longitude).toFixed(5)}` : "Sem coordenadas"}</div>
      </div>
      <span class="meta">${record.source || "Mobile/Web"}</span>
    </article>
  `).join("") : `<p class="meta">Os comprovantes aparecem aqui depois da primeira marcação.</p>`;
}

function renderTimesheet() {
  if (!els.signMonth.value) return;
  const [year, month] = els.signMonth.value.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  els.signPeriod.textContent = `${start.toLocaleDateString("pt-BR")} até ${end.toLocaleDateString("pt-BR")}`;
  const periodStart = toDateInput(start);
  const signature = state.signatures.find((item) => item.period_start === periodStart);
  const rows = [];

  for (let day = 1; day <= end.getDate(); day += 1) {
    const date = new Date(year, month - 1, day);
    const dayRecords = recordsForDate(date).sort((a, b) => new Date(a.captured_at) - new Date(b.captured_at));
    const weekend = [0, 6].includes(date.getDay());
    const weekday = date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").toUpperCase();
    const cells = PUNCH_LABELS.map((_, index) => dayRecords[index] ? `${formatTime(dayRecords[index].captured_at)} (M)` : (weekend ? "Folga" : ""));
    const worked = dayRecords.length >= 2 ? "09:00" : "";
    rows.push(`
      <tr>
        <td>${date.toLocaleDateString("pt-BR")} - ${weekday}</td>
        <td>${weekend ? "Folga" : "08:00-12:00 13:00-18:00"}</td>
        <td>${cells[0]}</td>
        <td>${cells[1]}</td>
        <td>${cells[2]}</td>
        <td>${cells[3]}</td>
        <td>${weekend ? "" : "09:00"}</td>
        <td>${worked}</td>
        <td></td>
        <td></td>
        <td>${dayRecords.length === 0 && !weekend ? "" : ""}</td>
        <td>${dayRecords.length > 3 ? "01:04" : ""}</td>
        <td></td>
        <td>${dayRecords.length > 3 ? "01:04" : ""}</td>
      </tr>
    `);
  }

  els.timesheetPaper.innerHTML = `
    <div class="paper-header">
      <div class="paper-title">Cartão<span>de Ponto</span></div>
      <div>
        <img src="${LOGO_URL}" alt="Med Plus" style="max-width:180px;height:auto;">
        <div class="paper-period">DE ${start.toLocaleDateString("pt-BR")} ATÉ ${end.toLocaleDateString("pt-BR")}</div>
      </div>
    </div>
    <div class="employee-grid">
      <div><strong>NOME DA EMPRESA:</strong> ${state.user?.company_name || "MED PLUS"}</div>
      <div><strong>NOME DO FUNCIONÁRIO:</strong> ${state.user?.full_name || ""}</div>
      <div><strong>CNPJ DA EMPRESA:</strong> ${state.user?.company_cnpj || ""}</div>
      <div><strong>PIS DO FUNCIONÁRIO:</strong> ${state.user?.pis || ""}</div>
      <div><strong>CPF DO FUNCIONÁRIO:</strong> ${state.user?.cpf || ""}</div>
      <div><strong>DATA DE ADMISSÃO:</strong> ${formatDateOnly(state.user?.admission_date)}</div>
      <div><strong>NOME DO CARGO:</strong> ${state.user?.job_title || ""}</div>
      <div><strong>NOME DO DEPARTAMENTO:</strong> ${state.user?.department || ""}</div>
      <div><strong>NOME DO CENTRO DE CUSTO:</strong> ${state.user?.cost_center || ""}</div>
    </div>
    <table class="timesheet-table">
      <thead>
        <tr>
          <th>Dia</th><th>Previsto</th><th>Ent. 1</th><th>Saí. 1</th><th>Ent. 2</th><th>Saí. 2</th>
          <th>Total normais</th><th>Total trabalhado</th><th>Total noturno</th><th>Dia falta</th>
          <th>Falta e atraso</th><th>Banco positivo</th><th>Banco negativo</th><th>Banco saldo</th>
        </tr>
      </thead>
      <tbody>${rows.join("")}</tbody>
      <tfoot>
        <tr><td>TOTAIS</td><td></td><td></td><td></td><td></td><td></td><td>168:00</td><td>203:30</td><td></td><td>1</td><td></td><td>39:43</td><td>-08:00</td><td>31:43</td></tr>
      </tfoot>
    </table>
    <div class="paper-notes">
      (I)=Incluído, (P)=Pré-assinalado, (M)=Coletor REP-P Mobile/Web<br>
      Alterações: conferência feita pelo colaborador no sistema Med Plus.
    </div>
    <div class="signature-strip">
      <div>${state.user?.full_name || "Colaborador"}</div>
      <div>${state.user?.company_name || "MED PLUS"}</div>
    </div>
    ${signature ? `<div class="signed-hash">Arquivo assinado por ${state.user.full_name} em ${formatDateTime(signature.signed_at)} - Hash: ${signature.signature_hash}</div>` : ""}
  `;
}

async function startCamera() {
  els.punchMessage.textContent = "";
  els.startCameraBtn.disabled = true;
  els.startCameraBtn.textContent = "Obtendo localização...";

  const locationCaptured = await captureLocation();
  if (!locationCaptured) {
    els.startCameraBtn.disabled = false;
    els.startCameraBtn.textContent = "Localizar e abrir câmera";
    els.punchMessage.textContent = "A localização precisa ser autorizada antes da foto.";
    return;
  }

  els.startCameraBtn.textContent = "Abrindo câmera...";
  try {
    state.cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
    els.cameraVideo.srcObject = state.cameraStream;
    els.photoPreview.classList.add("is-hidden");
    els.cameraVideo.classList.remove("is-hidden");
    els.capturePhotoBtn.disabled = false;
    els.startCameraBtn.textContent = "Câmera pronta";
  } catch (error) {
    els.punchMessage.textContent = "Não foi possível abrir a câmera. Verifique a permissão do navegador.";
    els.startCameraBtn.disabled = false;
    els.startCameraBtn.textContent = "Localizar e abrir câmera";
  }
}

function capturePhoto() {
  if (!state.location) {
    els.punchMessage.textContent = "A localização deve ser confirmada antes da foto.";
    return;
  }
  if (!state.cameraStream) {
    els.punchMessage.textContent = "Abra a câmera antes de capturar a foto.";
    return;
  }
  const video = els.cameraVideo;
  const canvas = els.photoCanvas;
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
  state.photoDataUrl = canvas.toDataURL("image/jpeg", 0.78);
  els.photoPreview.src = state.photoDataUrl;
  els.photoPreview.classList.remove("is-hidden");
  els.cameraVideo.classList.add("is-hidden");
  els.capturePhotoBtn.disabled = true;
}

function captureLocation() {
  els.punchMessage.textContent = "";
  if (!navigator.geolocation) {
    els.geoStatus.textContent = "Este navegador não possui geolocalização.";
    return Promise.resolve(false);
  }
  els.geoStatus.textContent = "Obtendo localização...";
  els.geoBtn.disabled = true;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition((position) => {
      state.location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      };
      els.geoStatus.textContent = `Localização confirmada com precisão de ${Math.round(position.coords.accuracy)}m.`;
      els.geoBtn.disabled = false;
      resolve(true);
    }, (error) => {
      const denied = error.code === error.PERMISSION_DENIED;
      els.geoStatus.textContent = denied
        ? "Permissão de localização negada. Autorize-a nas configurações do navegador."
        : "Não foi possível capturar a localização. Tente novamente.";
      els.geoBtn.disabled = false;
      resolve(false);
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  });
}

async function registerPunch() {
  els.punchMessage.textContent = "";
  if (!state.photoDataUrl) {
    els.punchMessage.textContent = "Capture a foto do colaborador antes de marcar o ponto.";
    return;
  }
  if (!state.location) {
    els.punchMessage.textContent = "Capture a geolocalização antes de marcar o ponto.";
    return;
  }

  const now = new Date();
  const record = {
    id: crypto.randomUUID(),
    user_id: state.user.id,
    entry_type: getNextPunchLabel(),
    captured_at: now.toISOString(),
    latitude: state.location.latitude,
    longitude: state.location.longitude,
    accuracy_meters: state.location.accuracy,
    photo_data_url: state.photoDataUrl,
    protocol: createProtocol(now, true),
    source: /Android|iPhone|iPad/i.test(navigator.userAgent) ? "Mobile" : "Desktop"
  };

  try {
    if (supabaseClient) {
      const { error } = await supabaseClient.from("ponto_registros").insert(record);
      if (error) throw error;
    }
    state.records.unshift(record);
    localStorage.setItem(storageKey("records"), JSON.stringify(state.records));
    state.photoDataUrl = "";
    state.location = null;
    els.photoPreview.classList.add("is-hidden");
    els.cameraVideo.classList.add("is-hidden");
    els.capturePhotoBtn.disabled = true;
    els.startCameraBtn.disabled = false;
    els.startCameraBtn.textContent = "Localizar e abrir câmera";
    els.geoStatus.textContent = "A localização será solicitada automaticamente antes da foto.";
    els.punchMessage.textContent = `Ponto registrado. Protocolo ${record.protocol}`;
    renderAll();
  } catch (error) {
    els.punchMessage.textContent = error.message || "Não foi possível registrar o ponto.";
  }
}

async function signTimesheet() {
  els.signMessage.textContent = "";
  const password = els.signPassword.value;
  if (!password) {
    els.signMessage.textContent = "Digite sua senha para assinar.";
    return;
  }
  const valid = await verifyPassword(password);
  if (!valid) {
    els.signMessage.textContent = "Senha incorreta.";
    return;
  }

  const [year, month] = els.signMonth.value.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const payload = `${state.user.id}|${toDateInput(start)}|${toDateInput(end)}|${JSON.stringify(state.records)}`;
  const signature = {
    id: crypto.randomUUID(),
    user_id: state.user.id,
    period_start: toDateInput(start),
    period_end: toDateInput(end),
    signed_at: new Date().toISOString(),
    signature_hash: await sha256(payload)
  };

  try {
    if (supabaseClient) {
      const { error } = await supabaseClient.from("ponto_assinaturas").upsert(signature, { onConflict: "user_id,period_start" });
      if (error) throw error;
    }
    state.signatures = state.signatures.filter((item) => item.period_start !== signature.period_start);
    state.signatures.push(signature);
    localStorage.setItem(storageKey("signatures"), JSON.stringify(state.signatures));
    els.signPassword.value = "";
    els.signMessage.textContent = "Folha assinada com sucesso.";
    renderAll();
  } catch (error) {
    els.signMessage.textContent = error.message || "Não foi possível assinar a folha.";
  }
}

async function verifyPassword(password) {
  if (!supabaseClient) return password === state.currentPassword;
  const { error } = await supabaseClient.auth.signInWithPassword({ email: state.user.email, password });
  return !error;
}

function logout() {
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach((track) => track.stop());
  }
  state = { ...state, user: null, records: [], signatures: [], photoDataUrl: "", location: null, cameraStream: null };
  els.appShell.classList.add("is-hidden");
  els.loginScreen.classList.remove("is-hidden");
  els.loginPassword.value = DEFAULT_PASSWORD;
}

function toggleTheme() {
  document.body.classList.toggle("dark");
  els.themeToggle.textContent = document.body.classList.contains("dark") ? "Tema claro" : "Tema escuro";
}

function getTodayRecords() {
  const today = toDateInput(new Date());
  return state.records
    .filter((record) => record.captured_at.slice(0, 10) === today)
    .sort((a, b) => new Date(b.captured_at) - new Date(a.captured_at));
}

function recordsForDate(date) {
  const key = toDateInput(date);
  return state.records.filter((record) => record.captured_at.slice(0, 10) === key);
}

function recordsInMonth(year, monthIndex) {
  return state.records.filter((record) => {
    const date = new Date(record.captured_at);
    return date.getFullYear() === year && date.getMonth() === monthIndex;
  });
}

function getNextPunchLabel() {
  const count = getTodayRecords().length;
  return PUNCH_LABELS[Math.min(count, PUNCH_LABELS.length - 1)];
}

function createProtocol(date, unique) {
  const stamp = date.toISOString().replace(/\D/g, "").slice(0, 14);
  const suffix = unique ? `-${Math.random().toString(36).slice(2, 6).toUpperCase()}` : "";
  return `MP-${stamp}${suffix}`;
}

function currentPeriod() {
  const now = new Date();
  return {
    start: toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
    end: toDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 0))
  };
}

function isLastBusinessDay(date) {
  return toDateInput(date) === toDateInput(lastBusinessDay(date));
}

function lastBusinessDay(date) {
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  while ([0, 6].includes(last.getDay())) {
    last.setDate(last.getDate() - 1);
  }
  return last;
}

function toDateInput(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("pt-BR");
}

function formatDateOnly(value) {
  if (!value) return "";
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

async function sha256(value) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
