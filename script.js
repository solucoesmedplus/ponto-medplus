import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* ==========================================================
   SISTEMA DE PONTO MED PLUS+
   VERSÃO OTIMIZADA - ECONOMIA DE EGRESS, STORAGE E DATABASE

   COLE SOMENTE:
   1. A URL pública do projeto Supabase.
   2. A chave Publishable (ou anon legada).

   NUNCA COLE service_role ou secret key neste arquivo.
   ========================================================== */
const SUPABASE_URL = "https://wdrewoxunggqhpmbmjyb.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_69fJjrL0BLpGN-Uwk3fkYw_v2NPTfRX";

const CONFIG_PLACEHOLDERS = [
  "COLE_AQUI_A_URL_DO_SUPABASE",
  "COLE_AQUI_A_CHAVE_PUBLICA_DO_SUPABASE",
];

const POINT_TYPES = [
  { value: "entrada", label: "Entrada" },
  { value: "saida_almoco", label: "Saída para almoço" },
  { value: "retorno_almoco", label: "Retorno do almoço" },
  { value: "saida_final", label: "Saída final" },
];

// Fotos são o principal consumo de Storage e futuro Egress.
// 85 KB × 4 marcações mantém qualidade suficiente para conferência facial
// e aumenta bastante a capacidade do plano gratuito.
const PHOTO_TARGET_BYTES = 85 * 1024;
const PHOTO_MAX_DIMENSION = 720;
const PHOTO_MAX_UPLOAD_BYTES = 256 * 1024;
const PHOTO_PREFERRED_TYPE = "image/webp";
const PHOTO_FALLBACK_TYPE = "image/jpeg";

const LOCATION_MAX_AGE_MS = 2 * 60 * 1000;
const LOCATION_SAVE_MAX_AGE_MS = 5 * 60 * 1000;
const PHOTO_BUCKET = "fotos-ponto";
const APP_VERSION = "egress-optimized-1";

const state = {
  supabase: null,
  session: null,
  authUser: null,
  colaborador: null,
  empresa: null,
  configuracao: null,
  currentScreen: "ponto-diario",
  clockTimer: null,
  authSubscription: null,
  loadingProfile: false,
  contextLoaded: false,
  contextIncludesTodayRecords: false,

  location: null,
  locationRequested: false,
  locationLoading: false,
  locationPermissionStatus: null,

  cameraStream: null,
  cameraFacingMode: "user",
  cameraLoading: false,
  photoBlob: null,
  photoPreviewUrl: null,
  photoMeta: null,
  uploadedPhotoPath: null,

  todayRecords: [],
  nextMarking: null,
  todayRecordsLoading: false,
  pointScreenPrepared: false,
  pointSaving: false,
  pointCompletedPendingReset: false,
  lastRegisteredRecord: null,
};

const elements = {
  html: document.documentElement,
  appLoading: document.getElementById("appLoading"),
  loginView: document.getElementById("loginView"),
  systemView: document.getElementById("systemView"),

  loginForm: document.getElementById("loginForm"),
  loginEmail: document.getElementById("loginEmail"),
  loginPassword: document.getElementById("loginPassword"),
  loginButton: document.getElementById("loginButton"),
  loginMessage: document.getElementById("loginMessage"),
  togglePasswordButton: document.getElementById("togglePasswordButton"),

  loginThemeButton: document.getElementById("loginThemeButton"),
  systemThemeButton: document.getElementById("systemThemeButton"),

  sidebar: document.getElementById("sidebar"),
  mobileMenuOverlay: document.getElementById("mobileMenuOverlay"),
  openMobileMenuButton: document.getElementById("openMobileMenuButton"),
  closeMobileMenuButton: document.getElementById("closeMobileMenuButton"),

  sidebarUserAvatar: document.getElementById("sidebarUserAvatar"),
  sidebarUserName: document.getElementById("sidebarUserName"),
  sidebarUserRole: document.getElementById("sidebarUserRole"),
  adminMenuButton: document.getElementById("adminMenuButton"),
  sidebarLogoutButton: document.getElementById("sidebarLogoutButton"),

  currentScreenTitle: document.getElementById("currentScreenTitle"),
  currentDate: document.getElementById("currentDate"),
  currentTime: document.getElementById("currentTime"),
  dailyWeekday: document.getElementById("dailyWeekday"),
  dailyClock: document.getElementById("dailyClock"),
  dailyFullDate: document.getElementById("dailyFullDate"),

  welcomeUserName: document.getElementById("welcomeUserName"),
  homeCompanyName: document.getElementById("homeCompanyName"),
  homeUserJob: document.getElementById("homeUserJob"),

  refreshTodayRecordsButton: document.getElementById("refreshTodayRecordsButton"),
  nextMarkingLabel: document.getElementById("nextMarkingLabel"),
  todayRecordSummary: document.getElementById("todayRecordSummary"),
  markingSteps: Array.from(document.querySelectorAll(".marking-step")),

  locationStatusBadge: document.getElementById("locationStatusBadge"),
  locationStatusText: document.getElementById("locationStatusText"),
  requestLocationButton: document.getElementById("requestLocationButton"),
  locationDetails: document.getElementById("locationDetails"),
  locationCoordinates: document.getElementById("locationCoordinates"),
  locationAccuracy: document.getElementById("locationAccuracy"),
  locationUpdatedAt: document.getElementById("locationUpdatedAt"),
  locationMapPlaceholder: document.getElementById("locationMapPlaceholder"),
  locationMapFrame: document.getElementById("locationMapFrame"),
  openMapLink: document.getElementById("openMapLink"),

  cameraStatusBadge: document.getElementById("cameraStatusBadge"),
  cameraStatusText: document.getElementById("cameraStatusText"),
  cameraPlaceholder: document.getElementById("cameraPlaceholder"),
  cameraVideo: document.getElementById("cameraVideo"),
  capturedPhoto: document.getElementById("capturedPhoto"),
  openCameraButton: document.getElementById("openCameraButton"),
  capturePhotoButton: document.getElementById("capturePhotoButton"),
  switchCameraButton: document.getElementById("switchCameraButton"),
  retakePhotoButton: document.getElementById("retakePhotoButton"),
  closeCameraButton: document.getElementById("closeCameraButton"),
  useDeviceCameraButton: document.getElementById("useDeviceCameraButton"),
  cameraFileInput: document.getElementById("cameraFileInput"),
  photoDetails: document.getElementById("photoDetails"),
  photoResolution: document.getElementById("photoResolution"),
  photoSize: document.getElementById("photoSize"),
  photoFormat: document.getElementById("photoFormat"),

  pointReadyBadge: document.getElementById("pointReadyBadge"),
  pointRequirementSession: document.getElementById("pointRequirementSession"),
  pointRequirementLocation: document.getElementById("pointRequirementLocation"),
  pointRequirementPhoto: document.getElementById("pointRequirementPhoto"),
  pointReadyMessage: document.getElementById("pointReadyMessage"),
  reviewPointButton: document.getElementById("reviewPointButton"),
  pointPreviewPanel: document.getElementById("pointPreviewPanel"),
  pointPreviewPhoto: document.getElementById("pointPreviewPhoto"),
  pointPreviewType: document.getElementById("pointPreviewType"),
  pointPreviewDateTime: document.getElementById("pointPreviewDateTime"),
  pointPreviewCoordinates: document.getElementById("pointPreviewCoordinates"),
  pointPreviewPhotoInfo: document.getElementById("pointPreviewPhotoInfo"),
  pointSaveMessage: document.getElementById("pointSaveMessage"),
  confirmPointButton: document.getElementById("confirmPointButton"),
  cancelPointPreviewButton: document.getElementById("cancelPointPreviewButton"),

  pointSuccessPanel: document.getElementById("pointSuccessPanel"),
  successRecordTitle: document.getElementById("successRecordTitle"),
  successRecordMessage: document.getElementById("successRecordMessage"),
  successRecordCode: document.getElementById("successRecordCode"),
  successRecordType: document.getElementById("successRecordType"),
  successRecordDateTime: document.getElementById("successRecordDateTime"),
  successRecordLocation: document.getElementById("successRecordLocation"),
  successRecordArea: document.getElementById("successRecordArea"),
  successRecordPhoto: document.getElementById("successRecordPhoto"),
  prepareNextPointButton: document.getElementById("prepareNextPointButton"),

  toastContainer: document.getElementById("toastContainer"),
};

const navButtons = Array.from(document.querySelectorAll(".nav-item[data-screen]"));
const internalScreens = Array.from(document.querySelectorAll(".internal-screen"));

inicializarAplicacao();

async function inicializarAplicacao() {
  configurarTemaInicial();
  registrarEventos();
  iniciarRelogio();
  observarPermissaoDeLocalizacao();

  if (!configuracaoSupabaseValida()) {
    mostrarLogin();
    mostrarMensagemLogin(
      "Antes de entrar, configure a URL e a chave pública do Supabase no início do arquivo script.js.",
      "info"
    );
    ocultarCarregamento();
    return;
  }

  state.supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  observarAutenticacao();

  try {
    const {
      data: { session },
      error,
    } = await state.supabase.auth.getSession();

    if (error) {
      throw error;
    }

    if (session) {
      await prepararSessao(session, { showWelcomeToast: false });
    } else {
      mostrarLogin();
    }
  } catch (error) {
    console.error("Erro ao recuperar a sessão:", error);
    mostrarLogin();
    mostrarMensagemLogin(
      "Não foi possível validar a sessão anterior. Tente entrar novamente.",
      "error"
    );
  } finally {
    ocultarCarregamento();
  }
}

function registrarEventos() {
  elements.loginForm.addEventListener("submit", realizarLogin);
  elements.togglePasswordButton.addEventListener("click", alternarVisibilidadeSenha);

  elements.loginThemeButton.addEventListener("click", alternarTema);
  elements.systemThemeButton.addEventListener("click", alternarTema);

  elements.openMobileMenuButton.addEventListener("click", abrirMenuMobile);
  elements.closeMobileMenuButton.addEventListener("click", fecharMenuMobile);
  elements.mobileMenuOverlay.addEventListener("click", fecharMenuMobile);

  elements.sidebarLogoutButton.addEventListener("click", realizarLogout);

  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      abrirTela(button.dataset.screen);
      fecharMenuMobile();
    });
  });

  elements.refreshTodayRecordsButton.addEventListener("click", () => {
    carregarRegistrosDeHoje({ showToast: true });
  });

  elements.requestLocationButton.addEventListener("click", () => {
    solicitarLocalizacao({ automatic: false });
  });

  elements.openCameraButton.addEventListener("click", () => {
    iniciarCamera();
  });

  elements.capturePhotoButton.addEventListener("click", capturarFotoDoVideo);
  elements.switchCameraButton.addEventListener("click", alternarCamera);
  elements.retakePhotoButton.addEventListener("click", repetirFoto);
  elements.closeCameraButton.addEventListener("click", () => pararCamera({ keepStatus: false }));

  elements.useDeviceCameraButton.addEventListener("click", () => {
    elements.cameraFileInput.click();
  });

  elements.cameraFileInput.addEventListener("change", capturarFotoDoArquivo);
  elements.reviewPointButton.addEventListener("click", abrirPreviaDaMarcacao);
  elements.confirmPointButton.addEventListener("click", registrarPontoNoSupabase);
  elements.cancelPointPreviewButton.addEventListener("click", ocultarPreviaDaMarcacao);
  elements.prepareNextPointButton.addEventListener("click", prepararProximaMarcacao);

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      fecharMenuMobile();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 860) {
      fecharMenuMobile();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.cameraStream) {
      pararCamera({ keepStatus: true });
    }
  });

  window.addEventListener("beforeunload", liberarRecursosDeMidia);
}

function configuracaoSupabaseValida() {
  const valores = [SUPABASE_URL, SUPABASE_PUBLIC_KEY];

  const contemPlaceholder = valores.some((value) =>
    CONFIG_PLACEHOLDERS.includes(String(value).trim())
  );

  if (contemPlaceholder) {
    return false;
  }

  const urlValida = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(
    String(SUPABASE_URL).trim()
  );

  const chaveMinimamenteValida = String(SUPABASE_PUBLIC_KEY).trim().length >= 30;

  return urlValida && chaveMinimamenteValida;
}

async function realizarLogin(event) {
  event.preventDefault();
  limparMensagemLogin();

  if (!configuracaoSupabaseValida() || !state.supabase) {
    mostrarMensagemLogin(
      "Configure primeiro a URL e a chave pública no arquivo script.js.",
      "info"
    );
    return;
  }

  const email = elements.loginEmail.value.trim().toLowerCase();
  const password = elements.loginPassword.value;

  if (!email || !validarEmail(email)) {
    mostrarMensagemLogin("Informe um e-mail válido.", "error");
    elements.loginEmail.focus();
    return;
  }

  if (!password || password.length < 6) {
    mostrarMensagemLogin("Informe sua senha com pelo menos 6 caracteres.", "error");
    elements.loginPassword.focus();
    return;
  }

  definirLoginCarregando(true);

  try {
    const { data, error } = await state.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    if (!data.session || !data.user) {
      throw new Error("O Supabase não retornou uma sessão válida.");
    }

    await prepararSessao(data.session, { showWelcomeToast: true });
    elements.loginPassword.value = "";
  } catch (error) {
    console.error("Erro no login:", error);
    mostrarMensagemLogin(traduzirErroLogin(error), "error");
  } finally {
    definirLoginCarregando(false);
  }
}

async function prepararSessao(session, options = {}) {
  if (!session?.user || state.loadingProfile) {
    return;
  }

  const mesmaSessaoJaCarregada =
    state.authUser?.id === session.user.id && state.colaborador?.id;

  if (mesmaSessaoJaCarregada) {
    state.session = session;
    return;
  }

  state.loadingProfile = true;

  try {
    // session.user já veio da sessão autenticada. A segurança real continua
    // no servidor por RLS e pelas funções RPC, evitando uma chamada Auth extra.
    const authUser = session.user;
    const contexto = await carregarContextoOtimizado(authUser);

    const colaborador = contexto.colaborador;
    const empresa = contexto.empresa;
    const configuracao = contexto.configuracao;
    const registrosHoje = Array.isArray(contexto.registros_hoje)
      ? contexto.registros_hoje
      : [];

    if (!colaborador) {
      await state.supabase.auth.signOut({ scope: "local" });
      throw new Error(
        "Seu usuário existe no Auth, mas ainda não foi vinculado à tabela colaboradores."
      );
    }

    if (colaborador.status !== "ativo") {
      await state.supabase.auth.signOut({ scope: "local" });
      throw new Error("Seu acesso está inativo. Procure o administrador da empresa.");
    }

    if (!empresa || empresa.status !== "ativa") {
      await state.supabase.auth.signOut({ scope: "local" });
      throw new Error("A empresa vinculada ao seu perfil está inativa.");
    }

    if (!configuracao) {
      throw new Error("A configuração da empresa não foi encontrada.");
    }

    state.session = session;
    state.authUser = authUser;
    state.colaborador = colaborador;
    state.empresa = empresa;
    state.configuracao = configuracao;
    state.todayRecords = registrosHoje;
    state.contextLoaded = true;
    state.contextIncludesTodayRecords = true;

    preencherDadosDoUsuario();
    atualizarSequenciaDeMarcacoes();
    mostrarSistema();
    abrirTela("ponto-diario");
    limparMensagemLogin();

    await prepararTelaPontoDiario({ requestLocation: true });

    if (options.showWelcomeToast) {
      mostrarToast(`Bem-vindo, ${primeiroNome(colaborador.nome_completo)}!`, "success");
    }
  } catch (error) {
    console.error("Erro ao carregar o perfil:", error);
    limparEstadoDaSessao();
    mostrarLogin();
    mostrarMensagemLogin(
      error?.message || "Não foi possível carregar seu perfil de colaborador.",
      "error"
    );
  } finally {
    state.loadingProfile = false;
  }
}

async function carregarContextoOtimizado(authUser) {
  const { data, error } = await state.supabase.rpc(
    "obter_contexto_ponto_otimizado"
  );

  if (!error && data) {
    return data;
  }

  // Compatibilidade temporária: permite abrir o sistema antes de o SQL
  // otimizado ser executado. Após executar o SQL, este fallback deixa de ser usado.
  const normalized = String(error?.message || "").toLowerCase();
  const functionMissing =
    normalized.includes("obter_contexto_ponto_otimizado") ||
    normalized.includes("could not find the function") ||
    normalized.includes("function") && normalized.includes("does not exist");

  if (!functionMissing) {
    throw error;
  }

  console.warn(
    "RPC otimizada ainda não instalada. Usando consultas legadas temporariamente."
  );

  const { data: colaborador, error: perfilError } = await state.supabase
    .from("colaboradores")
    .select(
      "id, auth_user_id, empresa_id, nome_completo, cargo_funcao, perfil, administrador_global, status, foto_perfil_url"
    )
    .eq("auth_user_id", authUser.id)
    .maybeSingle();

  if (perfilError) throw perfilError;
  if (!colaborador) return { colaborador: null };

  const [empresaResult, configuracaoResult, registrosResult] = await Promise.all([
    state.supabase
      .from("empresas")
      .select("id, razao_social, nome_fantasia, status")
      .eq("id", colaborador.empresa_id)
      .single(),

    state.supabase
      .from("configuracoes")
      .select(
        "empresa_id, fuso_horario, exigir_geolocalizacao, exigir_foto, provedor_fotos"
      )
      .eq("empresa_id", colaborador.empresa_id)
      .single(),

    state.supabase
      .from("registros_ponto")
      .select("id, tipo, registrado_em, codigo_registro")
      .eq("colaborador_id", colaborador.id)
      .eq("data_referencia", obterDataReferenciaAtual())
      .eq("status", "valido")
      .order("registrado_em", { ascending: true })
      .limit(4),
  ]);

  if (empresaResult.error) throw empresaResult.error;
  if (configuracaoResult.error) throw configuracaoResult.error;
  if (registrosResult.error) throw registrosResult.error;

  return {
    colaborador,
    empresa: empresaResult.data,
    configuracao: configuracaoResult.data,
    registros_hoje: registrosResult.data || [],
  };
}

function observarAutenticacao() {
  const { data } = state.supabase.auth.onAuthStateChange((event, session) => {
    window.setTimeout(() => {
      if (event === "SIGNED_OUT") {
        limparEstadoDaSessao();
        mostrarLogin();
        return;
      }

      if (event === "TOKEN_REFRESHED" && session) {
        state.session = session;
        atualizarProntidaoPonto();
        return;
      }

      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
        prepararSessao(session, { showWelcomeToast: false }).catch((error) => {
          console.error("Erro ao processar mudança de autenticação:", error);
        });
      }
    }, 0);
  });

  state.authSubscription = data.subscription;
}

async function realizarLogout() {
  if (!state.supabase) {
    limparEstadoDaSessao();
    mostrarLogin();
    return;
  }

  elements.sidebarLogoutButton.disabled = true;

  try {
    liberarRecursosDeMidia();

    const { error } = await state.supabase.auth.signOut({ scope: "local" });

    if (error) {
      throw error;
    }

    limparEstadoDaSessao();
    mostrarLogin();
    mostrarToast("Sessão encerrada com segurança.", "success");
  } catch (error) {
    console.error("Erro ao sair:", error);
    mostrarToast("Não foi possível encerrar a sessão. Tente novamente.", "error");
  } finally {
    elements.sidebarLogoutButton.disabled = false;
  }
}

function preencherDadosDoUsuario() {
  const colaborador = state.colaborador;
  const empresa = state.empresa;

  const nome = colaborador.nome_completo || "Colaborador";
  const papel = colaborador.perfil === "administrador" ? "Administrador" : "Colaborador";

  elements.sidebarUserName.textContent = nome;
  elements.sidebarUserRole.textContent = `${papel} • ${empresa.nome_fantasia}`;
  elements.sidebarUserAvatar.textContent = gerarIniciais(nome);

  elements.welcomeUserName.textContent = primeiroNome(nome);
  elements.homeCompanyName.textContent = empresa.nome_fantasia || empresa.razao_social;
  elements.homeUserJob.textContent = colaborador.cargo_funcao || "Não informado";

  elements.adminMenuButton.hidden = colaborador.perfil !== "administrador";
}

function abrirTela(screenName) {
  const targetScreen = document.getElementById(`screen-${screenName}`);

  if (!targetScreen) {
    mostrarToast("A tela solicitada ainda não está disponível.", "error");
    return;
  }

  if (screenName === "administracao" && state.colaborador?.perfil !== "administrador") {
    mostrarToast("Você não possui permissão para acessar a Administração.", "error");
    return;
  }

  if (state.currentScreen === "ponto-diario" && screenName !== "ponto-diario") {
    pararCamera({ keepStatus: true });
  }

  internalScreens.forEach((screen) => {
    const isTarget = screen === targetScreen;
    screen.hidden = !isTarget;
    screen.classList.toggle("active-screen", isTarget);
  });

  navButtons.forEach((button) => {
    const isActive = button.dataset.screen === screenName;
    button.classList.toggle("active", isActive);

    if (isActive) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  state.currentScreen = screenName;
  elements.currentScreenTitle.textContent = targetScreen.dataset.title || "Sistema de Ponto";
  document.title = `${targetScreen.dataset.title || "Sistema de Ponto"} | Med Plus+`;

  if (screenName === "ponto-diario" && state.colaborador) {
    prepararTelaPontoDiario({ requestLocation: !state.locationRequested }).catch((error) => {
      console.error("Erro ao preparar Ponto Diário:", error);
    });
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function prepararTelaPontoDiario({ requestLocation = false } = {}) {
  if (!state.supabase || !state.colaborador || state.pointScreenPrepared) {
    if (requestLocation && !state.location && !state.locationLoading) {
      solicitarLocalizacao({ automatic: true });
    }
    return;
  }

  state.pointScreenPrepared = true;
  atualizarProntidaoPonto();

  if (!state.contextIncludesTodayRecords) {
    await carregarRegistrosDeHoje();
  } else {
    atualizarSequenciaDeMarcacoes();
  }

  if (requestLocation && !state.location) {
    solicitarLocalizacao({ automatic: true });
  }
}

/* ==========================================================
   REGISTROS DO DIA E PRÓXIMA MARCAÇÃO
   ========================================================== */

async function carregarRegistrosDeHoje({ showToast = false } = {}) {
  if (!state.supabase || !state.colaborador || state.todayRecordsLoading) {
    return;
  }

  state.todayRecordsLoading = true;
  elements.refreshTodayRecordsButton.disabled = true;
  elements.nextMarkingLabel.textContent = "Consultando registros...";
  elements.todayRecordSummary.textContent = "Aguarde um instante.";

  try {
    const today = obterDataReferenciaAtual();

    const { data, error } = await state.supabase
      .from("registros_ponto")
      .select("id, tipo, registrado_em, codigo_registro")
      .eq("colaborador_id", state.colaborador.id)
      .eq("data_referencia", today)
      .eq("status", "valido")
      .order("registrado_em", { ascending: true })
      .limit(4);

    if (error) {
      throw error;
    }

    state.todayRecords = Array.isArray(data) ? data : [];
    atualizarSequenciaDeMarcacoes();

    if (showToast) {
      mostrarToast("Marcações de hoje atualizadas.", "success");
    }
  } catch (error) {
    console.error("Erro ao consultar registros de hoje:", error);
    state.todayRecords = [];
    state.nextMarking = POINT_TYPES[0];
    atualizarSequenciaDeMarcacoes();
    elements.todayRecordSummary.textContent =
      "Não foi possível consultar o histórico agora. A preparação continua disponível.";

    if (showToast) {
      mostrarToast("Não foi possível atualizar as marcações.", "error");
    }
  } finally {
    state.todayRecordsLoading = false;
    elements.refreshTodayRecordsButton.disabled = false;
    atualizarProntidaoPonto();
  }
}

function atualizarSequenciaDeMarcacoes() {
  const registrosPorTipo = new Map(
    state.todayRecords.map((record) => [record.tipo, record])
  );

  const firstMissing = POINT_TYPES.find((pointType) => !registrosPorTipo.has(pointType.value));
  state.nextMarking = firstMissing || null;

  elements.markingSteps.forEach((step) => {
    const type = step.dataset.pointType;
    const record = registrosPorTipo.get(type);
    const timeElement = step.querySelector(`[data-point-time="${type}"]`);

    step.classList.remove("is-complete", "is-current");

    if (record) {
      step.classList.add("is-complete");
      timeElement.textContent = formatarHora(record.registrado_em);
      return;
    }

    if (state.nextMarking?.value === type) {
      step.classList.add("is-current");
      timeElement.textContent = "Próxima";
      return;
    }

    timeElement.textContent = "—";
  });

  if (state.nextMarking) {
    elements.nextMarkingLabel.textContent = state.nextMarking.label;
    elements.todayRecordSummary.textContent =
      `${state.todayRecords.length} de ${POINT_TYPES.length} marcações realizadas hoje.`;
  } else {
    elements.nextMarkingLabel.textContent = "Jornada concluída";
    elements.todayRecordSummary.textContent =
      "As quatro marcações previstas para hoje já foram realizadas.";
  }

  ocultarPreviaDaMarcacao();
}

/* ==========================================================
   GEOLOCALIZAÇÃO
   ========================================================== */

async function observarPermissaoDeLocalizacao() {
  if (!navigator.permissions?.query) {
    return;
  }

  try {
    const permission = await navigator.permissions.query({ name: "geolocation" });
    state.locationPermissionStatus = permission.state;

    permission.addEventListener("change", () => {
      state.locationPermissionStatus = permission.state;

      if (permission.state === "denied" && !state.location) {
        definirStatusLocalizacao(
          "error",
          "Bloqueada",
          "A localização foi bloqueada nas configurações do navegador."
        );
      }
    });
  } catch {
    // Safari e alguns navegadores não oferecem consulta prévia dessa permissão.
  }
}

function solicitarLocalizacao({ automatic = false } = {}) {
  if (state.locationLoading) {
    return;
  }

  state.locationRequested = true;

  if (!window.isSecureContext) {
    definirStatusLocalizacao(
      "error",
      "Indisponível",
      "A localização exige HTTPS ou um servidor local como o Live Server."
    );
    return;
  }

  if (!("geolocation" in navigator)) {
    definirStatusLocalizacao(
      "error",
      "Indisponível",
      "Este navegador ou dispositivo não oferece geolocalização."
    );
    return;
  }

  state.locationLoading = true;
  elements.requestLocationButton.disabled = true;
  elements.requestLocationButton.textContent = "Localizando...";
  definirStatusLocalizacao(
    "loading",
    "Localizando",
    automatic
      ? "Solicitando sua localização para preparar o ponto."
      : "Buscando sua posição atual com alta precisão."
  );

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude, accuracy } = position.coords;

      state.location = {
        latitude,
        longitude,
        accuracy,
        timestamp: position.timestamp || Date.now(),
      };

      atualizarInterfaceDaLocalizacao();
      mostrarToast("Localização confirmada.", "success");
    },
    (error) => {
      console.error("Erro de geolocalização:", error);
      state.location = null;
      limparMapaDaLocalizacao();

      const message = traduzirErroGeolocalizacao(error);
      definirStatusLocalizacao("error", "Não confirmada", message);

      if (!automatic || error.code !== 1) {
        mostrarToast(message, "error");
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 18000,
      maximumAge: LOCATION_MAX_AGE_MS,
    }
  );
}

function atualizarInterfaceDaLocalizacao() {
  const location = state.location;

  if (!location) {
    return;
  }

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  const accuracy = Number(location.accuracy);

  elements.locationCoordinates.textContent =
    `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  elements.locationAccuracy.textContent =
    Number.isFinite(accuracy) ? `± ${Math.round(accuracy)} m` : "Não informada";
  elements.locationUpdatedAt.textContent = formatarHora(location.timestamp);
  elements.locationDetails.hidden = false;

  const delta = 0.0035;
  const left = longitude - delta;
  const bottom = latitude - delta;
  const right = longitude + delta;
  const top = latitude + delta;
  const bbox = [left, bottom, right, top].map((value) => value.toFixed(7)).join("%2C");

  elements.locationMapFrame.src =
    `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}` +
    `&layer=mapnik&marker=${latitude.toFixed(7)}%2C${longitude.toFixed(7)}`;
  elements.locationMapFrame.hidden = false;
  elements.locationMapPlaceholder.hidden = true;

  elements.openMapLink.href =
    `https://www.openstreetmap.org/?mlat=${latitude.toFixed(7)}` +
    `&mlon=${longitude.toFixed(7)}#map=18/${latitude.toFixed(7)}/${longitude.toFixed(7)}`;
  elements.openMapLink.hidden = false;

  definirStatusLocalizacao(
    "ready",
    "Confirmada",
    `Localização obtida com precisão aproximada de ${Math.round(accuracy)} metros.`
  );

  elements.requestLocationButton.textContent = "Atualizar localização";
  elements.requestLocationButton.disabled = false;
  state.locationLoading = false;

  ocultarPreviaDaMarcacao();
  elements.pointSuccessPanel.hidden = true;
  limparMensagemSalvamento();
  atualizarProntidaoPonto();
}

function limparMapaDaLocalizacao() {
  elements.locationMapFrame.hidden = true;
  elements.locationMapFrame.removeAttribute("src");
  elements.locationMapPlaceholder.hidden = false;
  elements.openMapLink.hidden = true;
  elements.locationDetails.hidden = true;
  elements.requestLocationButton.textContent = "Tentar novamente";
  elements.requestLocationButton.disabled = false;
  state.locationLoading = false;
  atualizarProntidaoPonto();
}

function definirStatusLocalizacao(type, badge, message) {
  definirBadge(elements.locationStatusBadge, type, badge);
  elements.locationStatusText.textContent = message;

  if (type !== "loading") {
    elements.requestLocationButton.disabled = false;

    if (state.location) {
      elements.requestLocationButton.textContent = "Atualizar localização";
    } else if (type === "pending") {
      elements.requestLocationButton.textContent = "Obter localização";
    } else {
      elements.requestLocationButton.textContent = "Tentar novamente";
    }

    state.locationLoading = false;
  }

  atualizarProntidaoPonto();
}

function traduzirErroGeolocalizacao(error) {
  switch (error?.code) {
    case 1:
      return "Permissão negada. Libere a localização para este site nas configurações do navegador.";
    case 2:
      return "O dispositivo não conseguiu determinar sua localização. Ative o GPS e tente novamente.";
    case 3:
      return "A localização demorou demais para responder. Tente novamente em uma área aberta.";
    default:
      return "Não foi possível obter sua localização. Verifique o GPS e tente novamente.";
  }
}

/* ==========================================================
   CÂMERA, CAPTURA E COMPRESSÃO
   ========================================================== */

async function iniciarCamera() {
  if (state.cameraLoading) {
    return;
  }

  if (!window.isSecureContext) {
    definirStatusCamera(
      "error",
      "Indisponível",
      "A câmera exige HTTPS ou um servidor local como o Live Server."
    );
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    definirStatusCamera(
      "error",
      "Sem acesso",
      "A câmera ao vivo não está disponível. Use o botão “Usar câmera do aparelho”."
    );
    return;
  }

  state.cameraLoading = true;
  elements.openCameraButton.disabled = true;
  definirStatusCamera("loading", "Abrindo", "Aguardando autorização da câmera.");

  try {
    pararCamera({ keepStatus: true });

    const constraints = {
      audio: false,
      video: {
        facingMode: { ideal: state.cameraFacingMode },
        width: { ideal: 1280 },
        height: { ideal: 960 },
      },
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    state.cameraStream = stream;

    elements.cameraVideo.srcObject = stream;
    elements.cameraVideo.classList.toggle(
      "is-mirrored",
      state.cameraFacingMode === "user"
    );

    await aguardarVideoPronto(elements.cameraVideo);
    await elements.cameraVideo.play();

    elements.cameraPlaceholder.hidden = true;
    elements.capturedPhoto.hidden = true;
    elements.cameraVideo.hidden = false;

    elements.openCameraButton.hidden = true;
    elements.capturePhotoButton.hidden = false;
    elements.switchCameraButton.hidden = false;
    elements.closeCameraButton.hidden = false;
    elements.retakePhotoButton.hidden = true;

    definirStatusCamera(
      "ready",
      "Câmera ativa",
      "Enquadre o rosto e toque em “Tirar foto”."
    );
  } catch (error) {
    console.error("Erro ao abrir a câmera:", error);
    pararCamera({ keepStatus: true });

    const message = traduzirErroCamera(error);
    definirStatusCamera("error", "Não iniciada", message);
    mostrarToast(message, "error");
  } finally {
    state.cameraLoading = false;
    elements.openCameraButton.disabled = false;
  }
}

async function alternarCamera() {
  state.cameraFacingMode =
    state.cameraFacingMode === "user" ? "environment" : "user";
  await iniciarCamera();
}

async function capturarFotoDoVideo() {
  const video = elements.cameraVideo;

  if (!state.cameraStream || !video.videoWidth || !video.videoHeight) {
    mostrarToast("A câmera ainda não está pronta para capturar a foto.", "error");
    return;
  }

  elements.capturePhotoButton.disabled = true;
  definirStatusCamera("loading", "Processando", "Comprimindo a foto no dispositivo.");

  try {
    const result = await compactarFonteVisual(
      video,
      video.videoWidth,
      video.videoHeight,
      {
        mirror: state.cameraFacingMode === "user",
      }
    );

    definirFotoCapturada(result);
    pararCamera({ keepStatus: true });
  } catch (error) {
    console.error("Erro ao capturar foto:", error);
    definirStatusCamera(
      "error",
      "Falha",
      "Não foi possível processar a foto. Tente novamente."
    );
    mostrarToast("Não foi possível processar a foto.", "error");
  } finally {
    elements.capturePhotoButton.disabled = false;
  }
}

async function capturarFotoDoArquivo(event) {
  const [file] = Array.from(event.target.files || []);
  event.target.value = "";

  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    mostrarToast("Selecione ou capture um arquivo de imagem.", "error");
    return;
  }

  definirStatusCamera("loading", "Processando", "Comprimindo a imagem selecionada.");

  try {
    const imageSource = await carregarImagemDoArquivo(file);
    const width = imageSource.width || imageSource.naturalWidth;
    const height = imageSource.height || imageSource.naturalHeight;

    const result = await compactarFonteVisual(imageSource, width, height);
    definirFotoCapturada(result);

    if (typeof imageSource.close === "function") {
      imageSource.close();
    }
  } catch (error) {
    console.error("Erro ao carregar imagem:", error);
    definirStatusCamera(
      "error",
      "Falha",
      "Não foi possível ler essa imagem. Tire outra foto."
    );
    mostrarToast("Não foi possível processar a imagem.", "error");
  }
}

async function carregarImagemDoArquivo(file) {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Continua para o método compatível com navegadores antigos.
    }
  }

  const dataUrl = await lerArquivoComoDataURL(file);
  const image = new Image();
  image.decoding = "async";

  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error("Imagem inválida."));
    image.src = dataUrl;
  });

  return image;
}

async function compactarFonteVisual(source, sourceWidth, sourceHeight, options = {}) {
  if (!sourceWidth || !sourceHeight) {
    throw new Error("Dimensões da imagem não disponíveis.");
  }

  let scale = Math.min(1, PHOTO_MAX_DIMENSION / Math.max(sourceWidth, sourceHeight));
  let width = Math.max(1, Math.round(sourceWidth * scale));
  let height = Math.max(1, Math.round(sourceHeight * scale));

  let canvas = desenharFonteNoCanvas(source, width, height, options.mirror);
  let blob = await compactarCanvas(canvas);

  while (blob.size > PHOTO_TARGET_BYTES && Math.max(width, height) > 480) {
    width = Math.max(1, Math.round(width * 0.86));
    height = Math.max(1, Math.round(height * 0.86));
    canvas = desenharFonteNoCanvas(canvas, width, height, false);
    blob = await compactarCanvas(canvas);
  }

  return {
    blob,
    width,
    height,
    originalWidth: sourceWidth,
    originalHeight: sourceHeight,
  };
}

function desenharFonteNoCanvas(source, width, height, mirror = false) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: false });

  if (!context) {
    throw new Error("Canvas indisponível.");
  }

  canvas.width = width;
  canvas.height = height;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);

  if (mirror) {
    context.translate(width, 0);
    context.scale(-1, 1);
  }

  context.drawImage(source, 0, 0, width, height);
  return canvas;
}

async function compactarCanvas(canvas) {
  const qualities = [0.72, 0.62, 0.54, 0.46, 0.38, 0.32];
  const preferredType = navegadorSuportaWebP()
    ? PHOTO_PREFERRED_TYPE
    : PHOTO_FALLBACK_TYPE;

  let lastBlob = null;

  for (const quality of qualities) {
    lastBlob = await canvasParaBlobSeguro(canvas, preferredType, quality);

    if (lastBlob && lastBlob.size <= PHOTO_TARGET_BYTES) {
      break;
    }
  }

  if (!lastBlob && preferredType !== PHOTO_FALLBACK_TYPE) {
    for (const quality of qualities) {
      lastBlob = await canvasParaBlobSeguro(
        canvas,
        PHOTO_FALLBACK_TYPE,
        quality
      );

      if (lastBlob && lastBlob.size <= PHOTO_TARGET_BYTES) {
        break;
      }
    }
  }

  if (!lastBlob) {
    throw new Error("Falha ao gerar o arquivo de foto otimizado.");
  }

  return lastBlob;
}

function navegadorSuportaWebP() {
  try {
    const canvas = document.createElement("canvas");
    return canvas.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

async function canvasParaBlobSeguro(canvas, type, quality) {
  try {
    const blob = await canvasParaBlob(canvas, type, quality);

    // Alguns navegadores antigos ignoram o tipo solicitado.
    if (blob?.type === type || type === PHOTO_FALLBACK_TYPE) {
      return blob;
    }

    return null;
  } catch {
    return null;
  }
}

function canvasParaBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("O navegador não conseguiu compactar a foto."));
        }
      },
      type,
      quality
    );
  });
}

function definirFotoCapturada(result) {
  revogarUrlDaFoto();

  state.uploadedPhotoPath = null;
  state.photoBlob = result.blob;
  state.photoPreviewUrl = URL.createObjectURL(result.blob);
  state.photoMeta = {
    width: result.width,
    height: result.height,
    size: result.blob.size,
    type: result.blob.type,
    capturedAt: Date.now(),
  };

  elements.capturedPhoto.src = state.photoPreviewUrl;
  elements.capturedPhoto.hidden = false;
  elements.cameraVideo.hidden = true;
  elements.cameraPlaceholder.hidden = true;

  elements.photoResolution.textContent = `${result.width} × ${result.height}`;
  elements.photoSize.textContent = formatarBytes(result.blob.size);
  elements.photoFormat.textContent = obterNomeFormatoFoto(result.blob.type);
  elements.photoDetails.hidden = false;

  elements.openCameraButton.hidden = true;
  elements.capturePhotoButton.hidden = true;
  elements.switchCameraButton.hidden = true;
  elements.closeCameraButton.hidden = true;
  elements.retakePhotoButton.hidden = false;

  definirStatusCamera(
    "ready",
    "Foto pronta",
    "A foto foi capturada e comprimida no próprio dispositivo."
  );

  ocultarPreviaDaMarcacao();
  atualizarProntidaoPonto();
  mostrarToast("Foto capturada e comprimida.", "success");
}

async function repetirFoto() {
  limparFotoCapturada();
  await iniciarCamera();
}

function limparFotoCapturada() {
  revogarUrlDaFoto();

  state.photoBlob = null;
  state.photoMeta = null;
  state.uploadedPhotoPath = null;

  elements.capturedPhoto.hidden = true;
  elements.capturedPhoto.removeAttribute("src");
  elements.photoDetails.hidden = true;
  elements.photoFormat.textContent = "—";
  elements.retakePhotoButton.hidden = true;
  elements.openCameraButton.hidden = false;
  elements.cameraPlaceholder.hidden = false;

  definirStatusCamera(
    "pending",
    "Pendente",
    "Abra a câmera frontal e enquadre o rosto com boa iluminação."
  );

  ocultarPreviaDaMarcacao();
  atualizarProntidaoPonto();
}

function pararCamera({ keepStatus = false } = {}) {
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach((track) => track.stop());
  }

  state.cameraStream = null;
  elements.cameraVideo.pause();
  elements.cameraVideo.srcObject = null;
  elements.cameraVideo.hidden = true;
  elements.capturePhotoButton.hidden = true;
  elements.switchCameraButton.hidden = true;
  elements.closeCameraButton.hidden = true;

  if (!state.photoBlob) {
    elements.cameraPlaceholder.hidden = false;
    elements.openCameraButton.hidden = false;

    if (!keepStatus) {
      definirStatusCamera(
        "pending",
        "Pendente",
        "A câmera foi fechada. Abra novamente para tirar a foto."
      );
    }
  }
}

function definirStatusCamera(type, badge, message) {
  definirBadge(elements.cameraStatusBadge, type, badge);
  elements.cameraStatusText.textContent = message;
  atualizarProntidaoPonto();
}

function traduzirErroCamera(error) {
  const name = String(error?.name || "");

  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Permissão da câmera negada. Libere o acesso nas configurações do navegador.";
  }

  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "Nenhuma câmera foi encontrada. Use a câmera do aparelho ou conecte uma webcam.";
  }

  if (name === "NotReadableError" || name === "TrackStartError") {
    return "A câmera está sendo usada por outro aplicativo. Feche-o e tente novamente.";
  }

  if (name === "OverconstrainedError") {
    return "A câmera não atende à configuração solicitada. Use a câmera do aparelho.";
  }

  return "Não foi possível abrir a câmera. Use a alternativa “Usar câmera do aparelho”.";
}

/* ==========================================================
   CONFERÊNCIA DA PREPARAÇÃO
   ========================================================== */

function atualizarProntidaoPonto() {
  const sessionReady = Boolean(state.session && state.colaborador);
  const locationReady = Boolean(state.location);
  const photoReady = Boolean(state.photoBlob && state.photoMeta);
  const hasNextMarking = Boolean(state.nextMarking);

  atualizarRequisito(elements.pointRequirementSession, sessionReady);
  atualizarRequisito(elements.pointRequirementLocation, locationReady);
  atualizarRequisito(elements.pointRequirementPhoto, photoReady);

  const ready =
    sessionReady &&
    locationReady &&
    photoReady &&
    hasNextMarking &&
    !state.pointSaving &&
    !state.pointCompletedPendingReset;

  elements.reviewPointButton.disabled = !ready;

  if (state.pointCompletedPendingReset) {
    definirBadge(elements.pointReadyBadge, "ready", "Registrado");
    elements.pointReadyMessage.textContent =
      "A marcação foi registrada. Prepare uma nova captura para o próximo horário.";
    elements.reviewPointButton.querySelector(".button-label").textContent =
      "Registro concluído";
    return;
  }

  if (!hasNextMarking && state.todayRecords.length >= POINT_TYPES.length) {
    definirBadge(elements.pointReadyBadge, "ready", "Concluído");
    elements.pointReadyMessage.textContent =
      "A jornada de hoje já possui todas as marcações previstas.";
    elements.reviewPointButton.querySelector(".button-label").textContent =
      "Jornada concluída";
    return;
  }

  if (ready) {
    definirBadge(elements.pointReadyBadge, "ready", "Pronto");
    elements.pointReadyMessage.textContent =
      `Localização e foto prontas para registrar: ${state.nextMarking.label}.`;
    elements.reviewPointButton.querySelector(".button-label").textContent =
      `Revisar ${state.nextMarking.label}`;
    return;
  }

  if (state.pointSaving) {
    definirBadge(elements.pointReadyBadge, "loading", "Salvando");
    elements.pointReadyMessage.textContent =
      "Enviando a foto protegida e registrando o ponto no servidor.";
    elements.reviewPointButton.querySelector(".button-label").textContent =
      "Registro em andamento";
    return;
  }

  definirBadge(elements.pointReadyBadge, "pending", "Aguardando");
  elements.reviewPointButton.querySelector(".button-label").textContent =
    "Revisar marcação";

  const missing = [];
  if (!locationReady) missing.push("localização");
  if (!photoReady) missing.push("foto");

  elements.pointReadyMessage.textContent = missing.length
    ? `Falta confirmar: ${missing.join(" e ")}.`
    : "Aguarde a consulta da próxima marcação.";
}

function atualizarRequisito(element, ready) {
  element.classList.toggle("requirement-ready", ready);
}

function abrirPreviaDaMarcacao() {
  if (
    !state.nextMarking ||
    !state.location ||
    !state.photoBlob ||
    !state.photoMeta ||
    !state.session ||
    state.pointCompletedPendingReset
  ) {
    atualizarProntidaoPonto();
    mostrarToast("Confirme todos os requisitos antes de revisar.", "error");
    return;
  }

  const now = new Date();

  elements.pointPreviewPhoto.src = state.photoPreviewUrl;
  elements.pointPreviewType.textContent = state.nextMarking.label;
  elements.pointPreviewDateTime.textContent = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(now);
  elements.pointPreviewCoordinates.textContent =
    `${state.location.latitude.toFixed(6)}, ${state.location.longitude.toFixed(6)}`;
  elements.pointPreviewPhotoInfo.textContent =
    `${state.photoMeta.width} × ${state.photoMeta.height} • ` +
    `${formatarBytes(state.photoMeta.size)}`;

  elements.confirmPointButton.querySelector(".button-label").textContent =
    `Confirmar ${state.nextMarking.label}`;
  elements.confirmPointButton.disabled = false;
  limparMensagemSalvamento();

  elements.pointSuccessPanel.hidden = true;
  elements.pointPreviewPanel.hidden = false;
  elements.pointPreviewPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });

  mostrarToast("Confira os dados antes de confirmar o registro.", "success");
}

function ocultarPreviaDaMarcacao() {
  if (state.pointSaving) {
    return;
  }

  elements.pointPreviewPanel.hidden = true;
  limparMensagemSalvamento();
}


/* ==========================================================
   ETAPA 5 - UPLOAD PROTEGIDO E REGISTRO DEFINITIVO
   ========================================================== */

async function registrarPontoNoSupabase() {
  if (state.pointSaving) {
    return;
  }

  const validationMessage = validarDadosParaRegistro();

  if (validationMessage) {
    mostrarMensagemSalvamento(validationMessage, "error");
    mostrarToast(validationMessage, "error");
    return;
  }

  const tipoEmConfirmacao = { ...state.nextMarking };
  let rpcAttempted = false;

  state.pointSaving = true;
  definirInterfaceSalvamento(true);
  atualizarProntidaoPonto();

  try {
    mostrarMensagemSalvamento(
      "Preparando o arquivo protegido...",
      "info"
    );

    if (!state.session?.access_token || state.session.user?.id !== state.authUser?.id) {
      throw new Error("Sessão inválida. Entre novamente.");
    }

    let objectPath = state.uploadedPhotoPath;

    if (!objectPath) {
      mostrarMensagemSalvamento(
        "Enviando a foto otimizada para o armazenamento privado...",
        "info"
      );
      objectPath = await enviarFotoParaStorage(tipoEmConfirmacao.value);
      state.uploadedPhotoPath = objectPath;
    }

    mostrarMensagemSalvamento(
      "Foto protegida. Registrando o horário oficial...",
      "info"
    );

    const fotoReferencia = `${PHOTO_BUCKET}/${objectPath}`;
    rpcAttempted = true;

    let { data, error } = await state.supabase.rpc(
      "registrar_ponto_otimizado",
      {
        p_tipo: tipoEmConfirmacao.value,
        p_latitude: Number(state.location.latitude.toFixed(7)),
        p_longitude: Number(state.location.longitude.toFixed(7)),
        p_precisao_metros: Number(state.location.accuracy.toFixed(2)),
        p_foto_url: fotoReferencia,
        p_foto_provedor: "supabase_storage",
        p_dispositivo: obterInformacoesDoDispositivo(),
      }
    );

    // Fallback compatível caso o SQL otimizado ainda não tenha sido aplicado.
    if (error && funcaoRpcNaoEncontrada(error, "registrar_ponto_otimizado")) {
      ({ data, error } = await state.supabase.rpc("registrar_ponto", {
        p_tipo: tipoEmConfirmacao.value,
        p_latitude: Number(state.location.latitude.toFixed(7)),
        p_longitude: Number(state.location.longitude.toFixed(7)),
        p_precisao_metros: Number(state.location.accuracy.toFixed(2)),
        p_endereco_estimado: null,
        p_foto_url: fotoReferencia,
        p_foto_provedor: "supabase_storage",
        p_dispositivo: obterInformacoesDoDispositivo(),
        p_user_agent: null,
        p_ip_registro: null,
      }));
    }

    if (error) {
      throw error;
    }

    const registro = normalizarRetornoDoRegistro(data);

    if (!registro?.id || !registro?.codigo_registro) {
      throw new Error(
        "O servidor não retornou a confirmação completa do registro."
      );
    }

    await concluirRegistroComSucesso(registro, tipoEmConfirmacao);
  } catch (error) {
    console.error("Erro ao registrar o ponto:", error);

    // Só consulta o banco para recuperação quando o RPC de gravação chegou
    // a ser chamado. Erros de câmera, Storage ou RLS não geram consulta extra.
    if (rpcAttempted) {
      const registroRecuperado = await localizarRegistroAposFalha(
        tipoEmConfirmacao.value
      );

      if (registroRecuperado) {
        await concluirRegistroComSucesso(
          registroRecuperado,
          tipoEmConfirmacao,
          true
        );
        return;
      }
    }

    const message = traduzirErroRegistro(error);
    mostrarMensagemSalvamento(message, "error");
    mostrarToast(message, "error");
  } finally {
    state.pointSaving = false;
    definirInterfaceSalvamento(false);
    atualizarProntidaoPonto();
  }
}

function funcaoRpcNaoEncontrada(error, functionName) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes(String(functionName).toLowerCase()) &&
    (
      message.includes("could not find") ||
      message.includes("does not exist") ||
      message.includes("schema cache")
    )
  );
}

function validarDadosParaRegistro() {
  if (!state.supabase || !state.session || !state.authUser || !state.colaborador) {
    return "Sua sessão não está pronta. Entre novamente no sistema.";
  }

  if (!state.nextMarking) {
    return "Não existe uma próxima marcação disponível para hoje.";
  }

  if (!state.location) {
    return "Confirme sua localização antes de registrar o ponto.";
  }

  if (Date.now() - state.location.timestamp > LOCATION_SAVE_MAX_AGE_MS) {
    return "A localização está desatualizada. Atualize-a antes de confirmar.";
  }

  if (!state.photoBlob || !state.photoMeta) {
    return "Tire uma foto antes de registrar o ponto.";
  }

  if (state.configuracao?.provedor_fotos === "google_drive") {
    return (
      "Esta empresa está configurada para Google Drive. " +
      "Altere temporariamente o provedor para Supabase Storage ou conclua a Etapa 6."
    );
  }

  if (!["image/webp", "image/jpeg"].includes(state.photoBlob.type)) {
    return "A foto precisa estar em WebP ou JPEG.";
  }

  if (state.photoBlob.size > PHOTO_MAX_UPLOAD_BYTES) {
    return "A foto ficou maior que 256 KB. Tire outra foto para recomprimir.";
  }

  return "";
}

async function enviarFotoParaStorage(pointType) {
  const objectPath = construirCaminhoDaFoto(pointType);

  const { data, error } = await state.supabase.storage
    .from(PHOTO_BUCKET)
    .upload(objectPath, state.photoBlob, {
      // O caminho é único e imutável. Cache longo reduz futuros downloads.
      cacheControl: "31536000",
      contentType: state.photoBlob.type,
      upsert: false,
    });

  if (error) {
    const storageError = new Error(error.message || "Falha no envio da foto.");
    storageError.originalError = error;
    storageError.stage = "storage";
    throw storageError;
  }

  return data?.path || objectPath;
}

function construirCaminhoDaFoto(pointType) {
  const parts = obterPartesDataNoFuso();
  const safeType = String(pointType || "ponto").replace(/[^a-z0-9_-]/gi, "");
  const randomId = gerarIdentificadorAleatorio();
  const timestamp = Date.now();
  const extension = state.photoBlob?.type === "image/webp" ? "webp" : "jpg";

  return [
    state.empresa.id,
    state.colaborador.id,
    parts.year,
    parts.month,
    parts.day,
    `${timestamp}-${safeType}-${randomId}.${extension}`,
  ].join("/");
}

function obterInformacoesDoDispositivo() {
  // Mantém somente dados realmente úteis para suporte e auditoria.
  // User-Agent completo, dimensões de tela e listas de idiomas aumentavam
  // cada registro e também sua cópia no log de auditoria.
  return {
    versao_app: APP_VERSION,
    plataforma:
      navigator.userAgentData?.platform ||
      navigator.platform ||
      null,
    mobile: navigator.userAgentData?.mobile ?? null,
    camera: state.cameraFacingMode,
    foto_bytes: state.photoMeta?.size || null,
  };
}

function normalizarRetornoDoRegistro(data) {
  if (Array.isArray(data)) {
    return data[0] || null;
  }

  return data || null;
}

async function localizarRegistroAposFalha(pointType) {
  try {
    const today = obterDataReferenciaAtual();

    const { data, error } = await state.supabase
      .from("registros_ponto")
      .select(
        "id, tipo, registrado_em, latitude, longitude, distancia_empresa_metros, dentro_area_permitida, foto_url, codigo_registro"
      )
      .eq("colaborador_id", state.colaborador.id)
      .eq("data_referencia", today)
      .eq("tipo", pointType)
      .eq("status", "valido")
      .order("registrado_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return null;
    }

    return data || null;
  } catch {
    return null;
  }
}

async function concluirRegistroComSucesso(
  registro,
  tipoConfirmado,
  recovered = false
) {
  state.lastRegisteredRecord = registro;
  state.pointCompletedPendingReset = true;

  elements.pointPreviewPanel.hidden = true;
  preencherComprovanteDeRegistro(registro, tipoConfirmado, recovered);
  elements.pointSuccessPanel.hidden = false;

  const alreadyPresent = state.todayRecords.some(
    (item) => item.id === registro.id
  );

  if (!alreadyPresent) {
    state.todayRecords = [...state.todayRecords, {
      id: registro.id,
      tipo: registro.tipo,
      registrado_em: registro.registrado_em,
      codigo_registro: registro.codigo_registro,
    }].sort(
      (a, b) => new Date(a.registrado_em) - new Date(b.registrado_em)
    );
  }

  atualizarSequenciaDeMarcacoes();

  elements.prepareNextPointButton.textContent = state.nextMarking
    ? "Preparar próxima marcação"
    : "Concluir jornada";

  elements.pointSuccessPanel.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
  });

  mostrarToast(
    recovered
      ? "O registro foi localizado e confirmado no servidor."
      : `${tipoConfirmado.label} registrada com sucesso.`,
    "success"
  );
}

function preencherComprovanteDeRegistro(
  registro,
  tipoConfirmado,
  recovered = false
) {
  const latitude =
    Number.isFinite(Number(registro.latitude))
      ? Number(registro.latitude)
      : state.location?.latitude;
  const longitude =
    Number.isFinite(Number(registro.longitude))
      ? Number(registro.longitude)
      : state.location?.longitude;

  elements.successRecordTitle.textContent =
    `${tipoConfirmado.label} registrada com sucesso`;

  elements.successRecordMessage.textContent = recovered
    ? "A resposta da conexão foi interrompida, mas o registro foi localizado no servidor."
    : "A marcação foi armazenada com o horário oficial e a trilha de integridade do servidor.";

  elements.successRecordCode.textContent =
    registro.codigo_registro || "Código indisponível";
  elements.successRecordType.textContent =
    obterRotuloTipoPonto(registro.tipo || tipoConfirmado.value);
  elements.successRecordDateTime.textContent =
    formatarDataHoraOficial(registro.registrado_em);

  elements.successRecordLocation.textContent =
    Number.isFinite(latitude) && Number.isFinite(longitude)
      ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
      : "Não informada";

  elements.successRecordArea.textContent =
    formatarSituacaoDaArea(registro);

  elements.successRecordPhoto.textContent =
    registro.foto_url || state.uploadedPhotoPath
      ? "Armazenada no bucket privado"
      : "Não informada";
}

function formatarSituacaoDaArea(registro) {
  const dentro = registro.dentro_area_permitida;
  const distancia = Number(registro.distancia_empresa_metros);

  if (dentro === true) {
    return Number.isFinite(distancia)
      ? `Dentro da área • ${Math.round(distancia)} m`
      : "Dentro da área permitida";
  }

  if (dentro === false) {
    return Number.isFinite(distancia)
      ? `Fora da área • ${Math.round(distancia)} m`
      : "Fora da área permitida";
  }

  return "Sem regra de distância configurada";
}

function formatarDataHoraOficial(dateValue) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Horário não retornado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone:
      state.configuracao?.fuso_horario ||
      "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}

async function prepararProximaMarcacao() {
  if (state.pointSaving) {
    return;
  }

  state.pointCompletedPendingReset = false;
  state.lastRegisteredRecord = null;
  state.uploadedPhotoPath = null;

  elements.pointSuccessPanel.hidden = true;
  ocultarPreviaDaMarcacao();
  limparFotoCapturada();
  limparLocalizacaoParaNovaMarcacao();

  await carregarRegistrosDeHoje();

  if (state.nextMarking) {
    state.locationRequested = false;
    solicitarLocalizacao({ automatic: true });
    elements.requestLocationButton.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  } else {
    mostrarToast("Jornada de hoje concluída.", "success");
  }

  atualizarProntidaoPonto();
}

function limparLocalizacaoParaNovaMarcacao() {
  state.location = null;

  elements.locationMapFrame.hidden = true;
  elements.locationMapFrame.removeAttribute("src");
  elements.locationMapPlaceholder.hidden = false;
  elements.openMapLink.hidden = true;
  elements.locationDetails.hidden = true;
  elements.locationCoordinates.textContent = "—";
  elements.locationAccuracy.textContent = "—";
  elements.locationUpdatedAt.textContent = "—";
  elements.requestLocationButton.textContent = "Obter localização";

  definirStatusLocalizacao(
    "pending",
    "Pendente",
    "Obtenha uma localização atual para a próxima marcação."
  );
}

function definirInterfaceSalvamento(isSaving) {
  elements.confirmPointButton.disabled = isSaving;
  elements.cancelPointPreviewButton.disabled = isSaving;
  elements.reviewPointButton.disabled = isSaving;
  elements.confirmPointButton.classList.toggle("is-loading", isSaving);
  elements.confirmPointButton.setAttribute("aria-busy", String(isSaving));

  const label = elements.confirmPointButton.querySelector(".button-label");

  if (isSaving) {
    label.textContent = "Registrando...";
  } else if (state.nextMarking) {
    label.textContent = `Confirmar ${state.nextMarking.label}`;
  } else {
    label.textContent = "Confirmar registro";
  }
}

function mostrarMensagemSalvamento(message, type = "info") {
  elements.pointSaveMessage.textContent = message;
  elements.pointSaveMessage.className = `point-save-message ${type}`;
  elements.pointSaveMessage.hidden = false;
}

function limparMensagemSalvamento() {
  elements.pointSaveMessage.textContent = "";
  elements.pointSaveMessage.className = "point-save-message";
  elements.pointSaveMessage.hidden = true;
}

function traduzirErroRegistro(error) {
  const message = String(error?.message || "");
  const normalized = message.toLowerCase();

  if (
    normalized.includes("bucket not found") ||
    normalized.includes("bucket does not exist")
  ) {
    return (
      "O bucket privado “fotos-ponto” ainda não existe. " +
      "Crie-o no Supabase e execute o SQL da Etapa 5."
    );
  }

  if (
    normalized.includes("row-level security") ||
    normalized.includes("violates row-level security") ||
    normalized.includes("403")
  ) {
    return (
      "O Supabase bloqueou o envio da foto. " +
      "Execute o arquivo supabase_etapa5.sql no SQL Editor."
    );
  }

  if (
    normalized.includes("jwt") ||
    normalized.includes("not authenticated") ||
    normalized.includes("sessão inválida")
  ) {
    return "Sua sessão expirou. Saia do sistema e entre novamente.";
  }

  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("network") ||
    normalized.includes("load failed")
  ) {
    return (
      "A conexão foi interrompida. O sistema verificará o servidor antes de permitir uma nova tentativa."
    );
  }

  if (
    normalized.includes("próxima marcação") ||
    normalized.includes("marcações deste dia") ||
    normalized.includes("localização é obrigatória") ||
    normalized.includes("foto é obrigatória") ||
    normalized.includes("fora da área permitida") ||
    normalized.includes("colaborador não encontrado") ||
    normalized.includes("configuração da empresa")
  ) {
    return message;
  }

  return message || "Não foi possível registrar o ponto. Tente novamente.";
}

function obterRotuloTipoPonto(type) {
  return POINT_TYPES.find((item) => item.value === type)?.label || type || "—";
}

function obterDataReferenciaAtual() {
  const parts = obterPartesDataNoFuso();
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function obterPartesDataNoFuso() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone:
      state.configuracao?.fuso_horario ||
      "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(new Date())
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
  };
}

function gerarIdentificadorAleatorio() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  }

  const random = Math.random().toString(36).slice(2);
  return `${Date.now().toString(36)}${random}`.slice(0, 16);
}


function definirBadge(element, type, text) {
  element.className = "status-badge";

  const classByType = {
    pending: "status-pending",
    loading: "status-loading",
    ready: "status-ready",
    error: "status-error",
  };

  element.classList.add(classByType[type] || classByType.pending);
  element.textContent = text;
}

/* ==========================================================
   INTERFACE GERAL
   ========================================================== */

function mostrarLogin() {
  elements.systemView.hidden = true;
  elements.loginView.hidden = false;
  fecharMenuMobile();
  document.title = "Entrar | Sistema de Ponto Med Plus+";

  window.setTimeout(() => {
    elements.loginEmail.focus();
  }, 120);
}

function mostrarSistema() {
  elements.loginView.hidden = true;
  elements.systemView.hidden = false;
}

function ocultarCarregamento() {
  elements.appLoading.hidden = true;
}

function definirLoginCarregando(isLoading) {
  elements.loginButton.disabled = isLoading;
  elements.loginEmail.disabled = isLoading;
  elements.loginPassword.disabled = isLoading;
  elements.loginButton.classList.toggle("is-loading", isLoading);
  elements.loginButton.setAttribute("aria-busy", String(isLoading));

  const label = elements.loginButton.querySelector(".button-label");
  label.textContent = isLoading ? "Entrando..." : "Entrar";
}

function mostrarMensagemLogin(message, type = "error") {
  elements.loginMessage.textContent = message;
  elements.loginMessage.className = `form-message ${type}`;
  elements.loginMessage.hidden = false;
}

function limparMensagemLogin() {
  elements.loginMessage.textContent = "";
  elements.loginMessage.className = "form-message";
  elements.loginMessage.hidden = true;
}

function alternarVisibilidadeSenha() {
  const showing = elements.loginPassword.type === "text";
  elements.loginPassword.type = showing ? "password" : "text";

  elements.togglePasswordButton.setAttribute("aria-pressed", String(!showing));
  elements.togglePasswordButton.setAttribute(
    "aria-label",
    showing ? "Mostrar senha" : "Ocultar senha"
  );

  elements.togglePasswordButton.querySelector("span").textContent = showing
    ? "Mostrar"
    : "Ocultar";

  elements.loginPassword.focus();
}

function configurarTemaInicial() {
  const temaSalvo = localStorage.getItem("medplus-ponto-theme");
  const prefereEscuro = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const temaInicial = temaSalvo || (prefereEscuro ? "dark" : "light");

  aplicarTema(temaInicial);
}

function alternarTema() {
  const atual = elements.html.dataset.theme || "light";
  aplicarTema(atual === "dark" ? "light" : "dark");
}

function aplicarTema(theme) {
  const tema = theme === "dark" ? "dark" : "light";
  elements.html.dataset.theme = tema;
  localStorage.setItem("medplus-ponto-theme", tema);

  const isDark = tema === "dark";
  const label = isDark ? "Ativar tema claro" : "Ativar tema escuro";
  const icon = isDark ? "☀" : "☾";

  [elements.loginThemeButton, elements.systemThemeButton].forEach((button) => {
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
    button.querySelector(".theme-icon").textContent = icon;
  });

  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  metaThemeColor?.setAttribute("content", isDark ? "#071b24" : "#0f3343");
}

function iniciarRelogio() {
  atualizarRelogio();

  if (state.clockTimer) {
    window.clearInterval(state.clockTimer);
  }

  state.clockTimer = window.setInterval(atualizarRelogio, 1000);
}

function atualizarRelogio() {
  const now = new Date();

  const dateShort = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(now);

  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);

  const weekday = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
  }).format(now);

  const fullDate = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(now);

  elements.currentDate.textContent = dateShort;
  elements.currentTime.textContent = time;
  elements.dailyWeekday.textContent = weekday;
  elements.dailyClock.textContent = time;
  elements.dailyFullDate.textContent = fullDate;
}

function abrirMenuMobile() {
  elements.sidebar.classList.add("mobile-open");
  elements.mobileMenuOverlay.hidden = false;
  elements.openMobileMenuButton.setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden";
}

function fecharMenuMobile() {
  elements.sidebar.classList.remove("mobile-open");
  elements.mobileMenuOverlay.hidden = true;
  elements.openMobileMenuButton.setAttribute("aria-expanded", "false");
  document.body.style.overflow = "";
}

function mostrarToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.setAttribute("role", type === "error" ? "alert" : "status");

  const text = document.createElement("p");
  text.textContent = message;
  toast.appendChild(text);

  elements.toastContainer.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 4200);
}

function limparEstadoDaSessao() {
  liberarRecursosDeMidia();

  state.session = null;
  state.authUser = null;
  state.colaborador = null;
  state.empresa = null;
  state.configuracao = null;
  state.currentScreen = "ponto-diario";
  state.todayRecords = [];
  state.nextMarking = null;
  state.pointScreenPrepared = false;
  state.contextLoaded = false;
  state.contextIncludesTodayRecords = false;
  state.location = null;
  state.locationRequested = false;
  state.uploadedPhotoPath = null;
  state.pointSaving = false;
  state.pointCompletedPendingReset = false;
  state.lastRegisteredRecord = null;

  elements.adminMenuButton.hidden = true;
  elements.sidebarUserName.textContent = "Colaborador";
  elements.sidebarUserRole.textContent = "Perfil";
  elements.sidebarUserAvatar.textContent = "MP";

  resetarInterfacePonto();
}

function resetarInterfacePonto() {
  limparMapaDaLocalizacao();
  limparFotoCapturada();

  elements.nextMarkingLabel.textContent = "Consultando registros...";
  elements.todayRecordSummary.textContent = "Aguarde um instante.";

  elements.markingSteps.forEach((step) => {
    step.classList.remove("is-complete", "is-current");
    const timeElement = step.querySelector("[data-point-time]");
    if (timeElement) timeElement.textContent = "—";
  });

  ocultarPreviaDaMarcacao();
  atualizarProntidaoPonto();
}

function liberarRecursosDeMidia() {
  pararCamera({ keepStatus: true });
  revogarUrlDaFoto();
}

function revogarUrlDaFoto() {
  if (state.photoPreviewUrl) {
    URL.revokeObjectURL(state.photoPreviewUrl);
  }
  state.photoPreviewUrl = null;
}

function aguardarVideoPronto(video) {
  if (video.readyState >= 1 && video.videoWidth) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("A câmera demorou para iniciar."));
    }, 10000);

    const onReady = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error("Falha ao carregar o vídeo da câmera."));
    };

    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("error", onError);
    };

    video.addEventListener("loadedmetadata", onReady, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

function lerArquivoComoDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Falha ao ler arquivo."));
    reader.readAsDataURL(file);
  });
}

/* ==========================================================
   UTILITÁRIOS
   ========================================================== */

function traduzirErroLogin(error) {
  const message = String(error?.message || "").toLowerCase();

  if (
    message.includes("invalid login credentials") ||
    message.includes("invalid credentials")
  ) {
    return "E-mail ou senha inválidos. Confira os dados e tente novamente.";
  }

  if (message.includes("email not confirmed")) {
    return "Seu e-mail ainda não foi confirmado pelo administrador.";
  }

  if (message.includes("too many requests") || message.includes("rate limit")) {
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
  }

  if (message.includes("failed to fetch") || message.includes("network")) {
    return "Não foi possível conectar ao Supabase. Verifique a internet e a configuração do projeto.";
  }

  if (error?.message) {
    return error.message;
  }

  return "Não foi possível entrar no sistema. Tente novamente.";
}

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function primeiroNome(fullName) {
  return String(fullName || "Colaborador").trim().split(/\s+/)[0];
}

function gerarIniciais(fullName) {
  const partes = String(fullName || "Med Plus")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (partes.length === 0) {
    return "MP";
  }

  if (partes.length === 1) {
    return partes[0].slice(0, 2).toUpperCase();
  }

  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

function formatarDataISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatarHora(dateValue) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function obterNomeFormatoFoto(mimeType) {
  if (mimeType === "image/webp") return "WebP";
  if (mimeType === "image/jpeg") return "JPEG";
  return "Imagem";
}

function formatarBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 KB";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
