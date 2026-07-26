import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* ==========================================================
   SISTEMA DE PONTO MED PLUS+
   ETAPA 9.1 - CAMPOS TRABALHISTAS DO COLABORADOR

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

  generalInfo: null,
  generalInfoMonth: "",
  generalInfoLoading: false,
  generalInfoCache: new Map(),

  historyData: null,
  historyLoading: false,
  historyPage: 1,
  historyTotalPages: 1,
  historyCache: new Map(),
  historySelectedReceipt: null,
  historyReceiptCache: new Map(),
  historyPhotoSignedUrl: null,
  historyPrintPrepared: false,

  signaturePreview: null,
  signatureMonth: "",
  signatureLoading: false,
  signatureSigning: false,
  signatureCache: new Map(),

  adminData: null,
  adminLoading: false,
  adminSaving: false,
  adminActiveTab: "overview",
  adminEmployeeFilter: {
    search: "",
    status: "todos",
    profile: "todos",
  },
  adminSelectedEmployee: null,
  adminSelectedSignature: null,
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

  generalMonthInput: document.getElementById("generalMonthInput"),
  generalCurrentMonthButton: document.getElementById("generalCurrentMonthButton"),
  generalRefreshButton: document.getElementById("generalRefreshButton"),
  generalRetryButton: document.getElementById("generalRetryButton"),
  generalLoading: document.getElementById("generalLoading"),
  generalError: document.getElementById("generalError"),
  generalErrorText: document.getElementById("generalErrorText"),
  generalContent: document.getElementById("generalContent"),
  generalProfileAvatar: document.getElementById("generalProfileAvatar"),
  generalProfileName: document.getElementById("generalProfileName"),
  generalProfileRole: document.getElementById("generalProfileRole"),
  generalProfileCompany: document.getElementById("generalProfileCompany"),
  generalPeriodLabel: document.getElementById("generalPeriodLabel"),
  generalLastUpdated: document.getElementById("generalLastUpdated"),
  metricTotalHours: document.getElementById("metricTotalHours"),
  metricDaysWithRecords: document.getElementById("metricDaysWithRecords"),
  metricCompleteDays: document.getElementById("metricCompleteDays"),
  metricIncompleteDays: document.getElementById("metricIncompleteDays"),
  metricBalanceCard: document.getElementById("metricBalanceCard"),
  metricBalance: document.getElementById("metricBalance"),
  metricSignatureCard: document.getElementById("metricSignatureCard"),
  metricSignature: document.getElementById("metricSignature"),
  metricSignatureHelp: document.getElementById("metricSignatureHelp"),
  generalDayHighlightKicker: document.getElementById("generalDayHighlightKicker"),
  generalDayHighlightTitle: document.getElementById("generalDayHighlightTitle"),
  generalDayStatusBadge: document.getElementById("generalDayStatusBadge"),
  generalDayDate: document.getElementById("generalDayDate"),
  generalDayTotal: document.getElementById("generalDayTotal"),
  generalDayRecordCount: document.getElementById("generalDayRecordCount"),
  generalDaySteps: Array.from(document.querySelectorAll(".general-day-step")),
  generalDailyLoad: document.getElementById("generalDailyLoad"),
  generalTolerance: document.getElementById("generalTolerance"),
  generalAverage: document.getElementById("generalAverage"),
  generalOutsideArea: document.getElementById("generalOutsideArea"),
  generalLastMarking: document.getElementById("generalLastMarking"),
  generalAlertsList: document.getElementById("generalAlertsList"),
  generalRecentDaysBody: document.getElementById("generalRecentDaysBody"),
  generalEmptyRecent: document.getElementById("generalEmptyRecent"),

  historyPrintPeriodButton: document.getElementById("historyPrintPeriodButton"),
  historyFilterForm: document.getElementById("historyFilterForm"),
  historyStartDate: document.getElementById("historyStartDate"),
  historyEndDate: document.getElementById("historyEndDate"),
  historyStatusFilter: document.getElementById("historyStatusFilter"),
  historySignatureFilter: document.getElementById("historySignatureFilter"),
  historyPageSize: document.getElementById("historyPageSize"),
  historyApplyButton: document.getElementById("historyApplyButton"),
  historyCurrentMonthButton: document.getElementById("historyCurrentMonthButton"),
  historyLast30DaysButton: document.getElementById("historyLast30DaysButton"),
  historyLoading: document.getElementById("historyLoading"),
  historyError: document.getElementById("historyError"),
  historyErrorText: document.getElementById("historyErrorText"),
  historyRetryButton: document.getElementById("historyRetryButton"),
  historyContent: document.getElementById("historyContent"),
  historySummaryDays: document.getElementById("historySummaryDays"),
  historySummaryComplete: document.getElementById("historySummaryComplete"),
  historySummaryIncomplete: document.getElementById("historySummaryIncomplete"),
  historySummaryHours: document.getElementById("historySummaryHours"),
  historyResultsTitle: document.getElementById("historyResultsTitle"),
  historyResultsInfo: document.getElementById("historyResultsInfo"),
  historyRefreshButton: document.getElementById("historyRefreshButton"),
  historyTableWrapper: document.getElementById("historyTableWrapper"),
  historyTableBody: document.getElementById("historyTableBody"),
  historyMobileList: document.getElementById("historyMobileList"),
  historyEmptyState: document.getElementById("historyEmptyState"),
  historyPagination: document.getElementById("historyPagination"),
  historyPreviousPageButton: document.getElementById("historyPreviousPageButton"),
  historyPageLabel: document.getElementById("historyPageLabel"),
  historyNextPageButton: document.getElementById("historyNextPageButton"),

  historyDetailModal: document.getElementById("historyDetailModal"),
  historyCloseDetailButton: document.getElementById("historyCloseDetailButton"),
  historyCloseDetailFooterButton: document.getElementById("historyCloseDetailFooterButton"),
  historyDetailTitle: document.getElementById("historyDetailTitle"),
  historyDetailSubtitle: document.getElementById("historyDetailSubtitle"),
  historyDetailLoading: document.getElementById("historyDetailLoading"),
  historyDetailError: document.getElementById("historyDetailError"),
  historyDetailErrorText: document.getElementById("historyDetailErrorText"),
  historyDetailContent: document.getElementById("historyDetailContent"),
  historyDetailDate: document.getElementById("historyDetailDate"),
  historyDetailTotal: document.getElementById("historyDetailTotal"),
  historyDetailStatus: document.getElementById("historyDetailStatus"),
  historyDetailSignature: document.getElementById("historyDetailSignature"),
  historyDetailCompany: document.getElementById("historyDetailCompany"),
  historyDetailCompanyCnpj: document.getElementById("historyDetailCompanyCnpj"),
  historyDetailEmployee: document.getElementById("historyDetailEmployee"),
  historyDetailEmployeeInfo: document.getElementById("historyDetailEmployeeInfo"),
  historyDetailRecords: document.getElementById("historyDetailRecords"),
  historyPrintDayButton: document.getElementById("historyPrintDayButton"),

  historyPhotoModal: document.getElementById("historyPhotoModal"),
  historyClosePhotoButton: document.getElementById("historyClosePhotoButton"),
  historyPhotoLoading: document.getElementById("historyPhotoLoading"),
  historyPhotoError: document.getElementById("historyPhotoError"),
  historyPhotoErrorText: document.getElementById("historyPhotoErrorText"),
  historyPhotoContent: document.getElementById("historyPhotoContent"),
  historyPhotoImage: document.getElementById("historyPhotoImage"),
  historyPhotoCaption: document.getElementById("historyPhotoCaption"),

  signatureMonthInput: document.getElementById("signatureMonthInput"),
  signatureCurrentMonthButton: document.getElementById("signatureCurrentMonthButton"),
  signatureRefreshButton: document.getElementById("signatureRefreshButton"),
  signatureRetryButton: document.getElementById("signatureRetryButton"),
  signatureLoading: document.getElementById("signatureLoading"),
  signatureError: document.getElementById("signatureError"),
  signatureErrorText: document.getElementById("signatureErrorText"),
  signatureContent: document.getElementById("signatureContent"),
  signatureStatusCard: document.getElementById("signatureStatusCard"),
  signatureStatusIcon: document.getElementById("signatureStatusIcon"),
  signatureStatusTitle: document.getElementById("signatureStatusTitle"),
  signatureStatusDescription: document.getElementById("signatureStatusDescription"),
  signatureStatusBadge: document.getElementById("signatureStatusBadge"),
  signatureSummaryDays: document.getElementById("signatureSummaryDays"),
  signatureSummaryComplete: document.getElementById("signatureSummaryComplete"),
  signatureSummaryIncomplete: document.getElementById("signatureSummaryIncomplete"),
  signatureSummaryHours: document.getElementById("signatureSummaryHours"),
  signatureSummaryRecords: document.getElementById("signatureSummaryRecords"),
  signatureMirrorTitle: document.getElementById("signatureMirrorTitle"),
  signatureOpenHistoryButton: document.getElementById("signatureOpenHistoryButton"),
  signatureDaysBody: document.getElementById("signatureDaysBody"),
  signatureEmptyDays: document.getElementById("signatureEmptyDays"),
  signaturePeriodLabel: document.getElementById("signaturePeriodLabel"),
  signatureFirstRecord: document.getElementById("signatureFirstRecord"),
  signatureLastRecord: document.getElementById("signatureLastRecord"),
  signatureExistingPanel: document.getElementById("signatureExistingPanel"),
  signatureExistingDate: document.getElementById("signatureExistingDate"),
  signatureExistingVersion: document.getElementById("signatureExistingVersion"),
  signatureExistingRecords: document.getElementById("signatureExistingRecords"),
  signatureExistingMethod: document.getElementById("signatureExistingMethod"),
  signatureExistingHash: document.getElementById("signatureExistingHash"),
  signatureExistingSummaryHash: document.getElementById("signatureExistingSummaryHash"),
  signatureCopyHashButton: document.getElementById("signatureCopyHashButton"),
  signatureCopySummaryHashButton: document.getElementById("signatureCopySummaryHashButton"),
  signaturePrintCertificateButton: document.getElementById("signaturePrintCertificateButton"),
  signatureFormPanel: document.getElementById("signatureFormPanel"),
  signatureWarnings: document.getElementById("signatureWarnings"),
  signatureForm: document.getElementById("signatureForm"),
  signatureReviewCheck: document.getElementById("signatureReviewCheck"),
  signatureIncompleteCheckRow: document.getElementById("signatureIncompleteCheckRow"),
  signatureIncompleteCheck: document.getElementById("signatureIncompleteCheck"),
  signatureOpenMonthCheckRow: document.getElementById("signatureOpenMonthCheckRow"),
  signatureOpenMonthCheck: document.getElementById("signatureOpenMonthCheck"),
  signaturePassword: document.getElementById("signaturePassword"),
  signatureTogglePasswordButton: document.getElementById("signatureTogglePasswordButton"),
  signatureFormMessage: document.getElementById("signatureFormMessage"),
  signatureSubmitButton: document.getElementById("signatureSubmitButton"),


  adminRefreshButton: document.getElementById("adminRefreshButton"),
  adminRetryButton: document.getElementById("adminRetryButton"),
  adminLoading: document.getElementById("adminLoading"),
  adminError: document.getElementById("adminError"),
  adminErrorText: document.getElementById("adminErrorText"),
  adminContent: document.getElementById("adminContent"),
  adminTabButtons: Array.from(document.querySelectorAll(".admin-tab-button")),
  adminTabPanels: Array.from(document.querySelectorAll(".admin-tab-panel")),
  adminMetricActiveEmployees: document.getElementById("adminMetricActiveEmployees"),
  adminMetricEmployeeHelp: document.getElementById("adminMetricEmployeeHelp"),
  adminMetricMonthRecords: document.getElementById("adminMetricMonthRecords"),
  adminMetricIncompleteDays: document.getElementById("adminMetricIncompleteDays"),
  adminMetricPendingSignatures: document.getElementById("adminMetricPendingSignatures"),
  adminMetricSignatureHelp: document.getElementById("adminMetricSignatureHelp"),
  adminMetricPhotoStorage: document.getElementById("adminMetricPhotoStorage"),
  adminMetricPhotoCount: document.getElementById("adminMetricPhotoCount"),
  adminMetricDatabaseSize: document.getElementById("adminMetricDatabaseSize"),
  adminGeneratedAt: document.getElementById("adminGeneratedAt"),
  adminUsagePhotosLabel: document.getElementById("adminUsagePhotosLabel"),
  adminUsagePhotosBar: document.getElementById("adminUsagePhotosBar"),
  adminUsageDatabaseLabel: document.getElementById("adminUsageDatabaseLabel"),
  adminUsageDatabaseBar: document.getElementById("adminUsageDatabaseBar"),
  adminOverviewCompanyName: document.getElementById("adminOverviewCompanyName"),
  adminOverviewLegalName: document.getElementById("adminOverviewLegalName"),
  adminOverviewCnpj: document.getElementById("adminOverviewCnpj"),
  adminOverviewResponsible: document.getElementById("adminOverviewResponsible"),
  adminOverviewCity: document.getElementById("adminOverviewCity"),
  adminOverviewRadius: document.getElementById("adminOverviewRadius"),
  adminOverviewDailyLoad: document.getElementById("adminOverviewDailyLoad"),
  adminRecentSignatures: document.getElementById("adminRecentSignatures"),
  adminRecentSignaturesEmpty: document.getElementById("adminRecentSignaturesEmpty"),

  adminCompanyForm: document.getElementById("adminCompanyForm"),
  adminCompanyLegalName: document.getElementById("adminCompanyLegalName"),
  adminCompanyTradeName: document.getElementById("adminCompanyTradeName"),
  adminCompanyCnpj: document.getElementById("adminCompanyCnpj"),
  adminCompanyResponsible: document.getElementById("adminCompanyResponsible"),
  adminCompanyPhone: document.getElementById("adminCompanyPhone"),
  adminCompanyEmail: document.getElementById("adminCompanyEmail"),
  adminCompanyStreet: document.getElementById("adminCompanyStreet"),
  adminCompanyNumber: document.getElementById("adminCompanyNumber"),
  adminCompanyComplement: document.getElementById("adminCompanyComplement"),
  adminCompanyDistrict: document.getElementById("adminCompanyDistrict"),
  adminCompanyCity: document.getElementById("adminCompanyCity"),
  adminCompanyState: document.getElementById("adminCompanyState"),
  adminCompanyZip: document.getElementById("adminCompanyZip"),
  adminConfigTimezone: document.getElementById("adminConfigTimezone"),
  adminConfigDailyMinutes: document.getElementById("adminConfigDailyMinutes"),
  adminConfigTolerance: document.getElementById("adminConfigTolerance"),
  adminConfigRadius: document.getElementById("adminConfigRadius"),
  adminConfigLatitude: document.getElementById("adminConfigLatitude"),
  adminConfigLongitude: document.getElementById("adminConfigLongitude"),
  adminConfigRequireLocation: document.getElementById("adminConfigRequireLocation"),
  adminConfigRequirePhoto: document.getElementById("adminConfigRequirePhoto"),
  adminConfigBlockOutside: document.getElementById("adminConfigBlockOutside"),
  adminConfigSignatureReminder: document.getElementById("adminConfigSignatureReminder"),
  adminCompanyMessage: document.getElementById("adminCompanyMessage"),
  adminCompanySaveButton: document.getElementById("adminCompanySaveButton"),

  adminNewEmployeeButton: document.getElementById("adminNewEmployeeButton"),
  adminEmployeeSearch: document.getElementById("adminEmployeeSearch"),
  adminEmployeeStatusFilter: document.getElementById("adminEmployeeStatusFilter"),
  adminEmployeeProfileFilter: document.getElementById("adminEmployeeProfileFilter"),
  adminEmployeeTableWrapper: document.getElementById("adminEmployeeTableWrapper"),
  adminEmployeeTableBody: document.getElementById("adminEmployeeTableBody"),
  adminEmployeeMobileList: document.getElementById("adminEmployeeMobileList"),
  adminEmployeeEmpty: document.getElementById("adminEmployeeEmpty"),
  adminSignatureMonthFilter: document.getElementById("adminSignatureMonthFilter"),
  adminSignatureTableWrapper: document.getElementById("adminSignatureTableWrapper"),
  adminSignatureTableBody: document.getElementById("adminSignatureTableBody"),
  adminSignatureMobileList: document.getElementById("adminSignatureMobileList"),
  adminSignatureEmpty: document.getElementById("adminSignatureEmpty"),

  adminEmployeeModal: document.getElementById("adminEmployeeModal"),
  adminEmployeeModalTitle: document.getElementById("adminEmployeeModalTitle"),
  adminEmployeeModalSubtitle: document.getElementById("adminEmployeeModalSubtitle"),
  adminEmployeeModalCloseButton: document.getElementById("adminEmployeeModalCloseButton"),
  adminEmployeeCancelButton: document.getElementById("adminEmployeeCancelButton"),
  adminEmployeeForm: document.getElementById("adminEmployeeForm"),
  adminEmployeeId: document.getElementById("adminEmployeeId"),
  adminEmployeeAuthId: document.getElementById("adminEmployeeAuthId"),
  adminEmployeeName: document.getElementById("adminEmployeeName"),
  adminEmployeeCpf: document.getElementById("adminEmployeeCpf"),
  adminEmployeeCtps: document.getElementById("adminEmployeeCtps"),
  adminEmployeePis: document.getElementById("adminEmployeePis"),
  adminEmployeeAdmission: document.getElementById("adminEmployeeAdmission"),
  adminEmployeeEmail: document.getElementById("adminEmployeeEmail"),
  adminEmployeePhone: document.getElementById("adminEmployeePhone"),
  adminEmployeeJob: document.getElementById("adminEmployeeJob"),
  adminEmployeeCostCenter: document.getElementById("adminEmployeeCostCenter"),
  adminEmployeeDepartment: document.getElementById("adminEmployeeDepartment"),
  adminEmployeeProfile: document.getElementById("adminEmployeeProfile"),
  adminEmployeeStatus: document.getElementById("adminEmployeeStatus"),
  adminEmployeePasswordLabel: document.getElementById("adminEmployeePasswordLabel"),
  adminEmployeePassword: document.getElementById("adminEmployeePassword"),
  adminEmployeePasswordHelp: document.getElementById("adminEmployeePasswordHelp"),
  adminEmployeeOutsideRadius: document.getElementById("adminEmployeeOutsideRadius"),
  adminEmployeeFormMessage: document.getElementById("adminEmployeeFormMessage"),
  adminEmployeeSaveButton: document.getElementById("adminEmployeeSaveButton"),

  adminReleaseSignatureModal: document.getElementById("adminReleaseSignatureModal"),
  adminReleaseSignatureCloseButton: document.getElementById("adminReleaseSignatureCloseButton"),
  adminReleaseSignatureCancelButton: document.getElementById("adminReleaseSignatureCancelButton"),
  adminReleaseSignatureForm: document.getElementById("adminReleaseSignatureForm"),
  adminReleaseSignatureId: document.getElementById("adminReleaseSignatureId"),
  adminReleaseSignatureSubtitle: document.getElementById("adminReleaseSignatureSubtitle"),
  adminReleaseSignatureReason: document.getElementById("adminReleaseSignatureReason"),
  adminReleaseSignatureMessage: document.getElementById("adminReleaseSignatureMessage"),
  adminReleaseSignatureConfirmButton: document.getElementById("adminReleaseSignatureConfirmButton"),

  printDocument: document.getElementById("printDocument"),
  printDocumentTitle: document.getElementById("printDocumentTitle"),
  printDocumentSubtitle: document.getElementById("printDocumentSubtitle"),
  printDocumentBody: document.getElementById("printDocumentBody"),
  printDocumentGeneratedAt: document.getElementById("printDocumentGeneratedAt"),

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

  elements.generalRefreshButton.addEventListener("click", () => {
    carregarInformacoesGerais({ force: true, showToast: true });
  });

  elements.generalRetryButton.addEventListener("click", () => {
    carregarInformacoesGerais({ force: true });
  });

  elements.generalCurrentMonthButton.addEventListener("click", () => {
    elements.generalMonthInput.value = obterMesAtualInput();
    carregarInformacoesGerais();
  });

  elements.generalMonthInput.addEventListener("change", () => {
    carregarInformacoesGerais();
  });

  elements.historyFilterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.historyPage = 1;
    carregarHistoricoPonto({ force: true });
  });

  elements.historyCurrentMonthButton.addEventListener("click", () => {
    definirPeriodoHistoricoMesAtual();
    state.historyPage = 1;
    carregarHistoricoPonto({ force: true });
  });

  elements.historyLast30DaysButton.addEventListener("click", () => {
    definirPeriodoHistoricoUltimosDias(30);
    state.historyPage = 1;
    carregarHistoricoPonto({ force: true });
  });

  elements.historyPageSize.addEventListener("change", () => {
    state.historyPage = 1;
    carregarHistoricoPonto({ force: true });
  });

  elements.historyRetryButton.addEventListener("click", () => {
    carregarHistoricoPonto({ force: true });
  });

  elements.historyRefreshButton.addEventListener("click", () => {
    carregarHistoricoPonto({ force: true, showToast: true });
  });

  elements.historyPreviousPageButton.addEventListener("click", () => {
    if (state.historyPage > 1) {
      state.historyPage -= 1;
      carregarHistoricoPonto();
    }
  });

  elements.historyNextPageButton.addEventListener("click", () => {
    if (state.historyPage < state.historyTotalPages) {
      state.historyPage += 1;
      carregarHistoricoPonto();
    }
  });

  elements.historyTableBody.addEventListener("click", tratarAcaoHistorico);
  elements.historyMobileList.addEventListener("click", tratarAcaoHistorico);
  elements.historyDetailRecords.addEventListener("click", tratarAcaoDetalheHistorico);

  elements.historyCloseDetailButton.addEventListener("click", fecharDetalheHistorico);
  elements.historyCloseDetailFooterButton.addEventListener("click", fecharDetalheHistorico);
  elements.historyDetailModal.addEventListener("click", (event) => {
    if (event.target.dataset.closeHistoryModal === "true") {
      fecharDetalheHistorico();
    }
  });

  elements.historyClosePhotoButton.addEventListener("click", fecharFotoHistorico);
  elements.historyPhotoModal.addEventListener("click", (event) => {
    if (event.target.dataset.closePhotoModal === "true") {
      fecharFotoHistorico();
    }
  });

  elements.historyPrintDayButton.addEventListener("click", imprimirComprovanteDiario);
  elements.historyPrintPeriodButton.addEventListener("click", imprimirEspelhoPeriodo);

  elements.signatureRefreshButton.addEventListener("click", () => {
    carregarPreviaAssinatura({ force: true, showToast: true });
  });

  elements.signatureRetryButton.addEventListener("click", () => {
    carregarPreviaAssinatura({ force: true });
  });

  elements.signatureCurrentMonthButton.addEventListener("click", () => {
    elements.signatureMonthInput.value = obterMesAtualInput();
    carregarPreviaAssinatura();
  });

  elements.signatureMonthInput.addEventListener("change", () => {
    carregarPreviaAssinatura();
  });

  elements.signatureReviewCheck.addEventListener("change", atualizarDisponibilidadeAssinatura);
  elements.signatureIncompleteCheck.addEventListener("change", atualizarDisponibilidadeAssinatura);
  elements.signatureOpenMonthCheck.addEventListener("change", atualizarDisponibilidadeAssinatura);
  elements.signaturePassword.addEventListener("input", atualizarDisponibilidadeAssinatura);
  elements.signatureTogglePasswordButton.addEventListener("click", alternarSenhaAssinatura);
  elements.signatureForm.addEventListener("submit", assinarCompetencia);
  elements.signatureOpenHistoryButton.addEventListener("click", abrirCompetenciaNoHistorico);
  elements.signatureCopyHashButton.addEventListener("click", () => {
    copiarTextoAssinatura(elements.signatureExistingHash.textContent, "Hash copiado.");
  });
  elements.signatureCopySummaryHashButton.addEventListener("click", () => {
    copiarTextoAssinatura(
      elements.signatureExistingSummaryHash.textContent,
      "Resumo dos registros copiado."
    );
  });
  elements.signaturePrintCertificateButton.addEventListener(
    "click",
    imprimirCertificadoAssinatura
  );


  elements.adminRefreshButton.addEventListener("click", () => {
    carregarPainelAdministrativo({ force: true, showToast: true });
  });
  elements.adminRetryButton.addEventListener("click", () => {
    carregarPainelAdministrativo({ force: true });
  });

  elements.adminTabButtons.forEach((button) => {
    button.addEventListener("click", () => abrirAbaAdministrativa(button.dataset.adminTab));
  });
  document.querySelectorAll("[data-admin-go-tab]").forEach((button) => {
    button.addEventListener("click", () => abrirAbaAdministrativa(button.dataset.adminGoTab));
  });

  elements.adminCompanyCnpj.addEventListener("input", () => {
    elements.adminCompanyCnpj.value = formatarCnpjInput(elements.adminCompanyCnpj.value);
  });
  elements.adminCompanyZip.addEventListener("input", () => {
    elements.adminCompanyZip.value = formatarCepInput(elements.adminCompanyZip.value);
  });
  elements.adminCompanyState.addEventListener("input", () => {
    elements.adminCompanyState.value = elements.adminCompanyState.value
      .replace(/[^A-Za-z]/g, "")
      .toUpperCase()
      .slice(0, 2);
  });
  elements.adminEmployeeCpf.addEventListener("input", () => {
    elements.adminEmployeeCpf.value = formatarCpfInput(elements.adminEmployeeCpf.value);
  });

  elements.adminEmployeePis.addEventListener("input", () => {
    elements.adminEmployeePis.value = formatarPisInput(
      elements.adminEmployeePis.value
    );
  });

  elements.adminCompanyForm.addEventListener("submit", salvarEmpresaConfiguracoes);
  elements.adminNewEmployeeButton.addEventListener("click", () => abrirModalColaborador());
  elements.adminEmployeeSearch.addEventListener("input", atualizarFiltrosColaboradoresAdmin);
  elements.adminEmployeeStatusFilter.addEventListener("change", atualizarFiltrosColaboradoresAdmin);
  elements.adminEmployeeProfileFilter.addEventListener("change", atualizarFiltrosColaboradoresAdmin);
  elements.adminEmployeeTableBody.addEventListener("click", tratarAcaoColaboradorAdmin);
  elements.adminEmployeeMobileList.addEventListener("click", tratarAcaoColaboradorAdmin);
  elements.adminSignatureMonthFilter.addEventListener("change", renderizarAssinaturasAdmin);
  elements.adminSignatureTableBody.addEventListener("click", tratarAcaoAssinaturaAdmin);
  elements.adminSignatureMobileList.addEventListener("click", tratarAcaoAssinaturaAdmin);

  elements.adminEmployeeModalCloseButton.addEventListener("click", fecharModalColaborador);
  elements.adminEmployeeCancelButton.addEventListener("click", fecharModalColaborador);
  elements.adminEmployeeModal.addEventListener("click", (event) => {
    if (event.target.dataset.closeAdminEmployeeModal === "true") fecharModalColaborador();
  });
  elements.adminEmployeeForm.addEventListener("submit", salvarColaboradorAdmin);

  elements.adminReleaseSignatureCloseButton.addEventListener("click", fecharModalLiberarAssinatura);
  elements.adminReleaseSignatureCancelButton.addEventListener("click", fecharModalLiberarAssinatura);
  elements.adminReleaseSignatureModal.addEventListener("click", (event) => {
    if (event.target.dataset.closeAdminSignatureModal === "true") fecharModalLiberarAssinatura();
  });
  elements.adminReleaseSignatureForm.addEventListener("submit", liberarNovaAssinaturaAdmin);

  window.addEventListener("afterprint", limparDocumentoImpressao);

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
      if (!elements.adminReleaseSignatureModal.hidden) {
        fecharModalLiberarAssinatura();
        return;
      }
      if (!elements.adminEmployeeModal.hidden) {
        fecharModalColaborador();
        return;
      }
      if (!elements.historyPhotoModal.hidden) {
        fecharFotoHistorico();
        return;
      }

      if (!elements.historyDetailModal.hidden) {
        fecharDetalheHistorico();
        return;
      }

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

  elements.generalProfileName.textContent = nome;
  elements.generalProfileRole.textContent =
    colaborador.cargo_funcao || papel;
  elements.generalProfileCompany.textContent =
    empresa.nome_fantasia || empresa.razao_social;
  elements.generalProfileAvatar.textContent = gerarIniciais(nome);

  if (!elements.generalMonthInput.value) {
    elements.generalMonthInput.value = obterMesAtualInput();
  }

  if (!elements.historyStartDate.value || !elements.historyEndDate.value) {
    definirPeriodoHistoricoMesAtual();
  }

  if (!elements.signatureMonthInput.value) {
    elements.signatureMonthInput.value = obterMesAtualInput();
  }

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

  if (screenName === "informacoes-gerais" && state.colaborador) {
    carregarInformacoesGerais().catch((error) => {
      console.error("Erro ao preparar Informações Gerais:", error);
    });
  }

  if (screenName === "meu-historico" && state.colaborador) {
    carregarHistoricoPonto().catch((error) => {
      console.error("Erro ao preparar Meu Histórico:", error);
    });
  }

  if (screenName === "assinar-ponto" && state.colaborador) {
    carregarPreviaAssinatura().catch((error) => {
      console.error("Erro ao preparar Assinar Ponto:", error);
    });
  }

  if (screenName === "administracao" && state.colaborador) {
    carregarPainelAdministrativo().catch((error) => {
      console.error("Erro ao preparar Administração:", error);
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
   ETAPA 6 - INFORMAÇÕES GERAIS
   ========================================================== */

async function carregarInformacoesGerais({
  force = false,
  showToast = false,
} = {}) {
  if (
    !state.supabase ||
    !state.colaborador ||
    state.generalInfoLoading
  ) {
    return;
  }

  const month = normalizarMesInput(
    elements.generalMonthInput.value || obterMesAtualInput()
  );

  elements.generalMonthInput.value = month;
  state.generalInfoMonth = month;

  if (!force && state.generalInfoCache.has(month)) {
    const cached = state.generalInfoCache.get(month);
    state.generalInfo = cached;
    renderizarInformacoesGerais(cached);
    return;
  }

  definirEstadoInformacoesGerais("loading");
  state.generalInfoLoading = true;
  elements.generalRefreshButton.disabled = true;
  elements.generalCurrentMonthButton.disabled = true;
  elements.generalMonthInput.disabled = true;

  try {
    const competencia = `${month}-01`;

    let { data, error } = await state.supabase.rpc(
      "obter_informacoes_gerais",
      {
        p_competencia: competencia,
      }
    );

    if (
      error &&
      funcaoRpcNaoEncontrada(error, "obter_informacoes_gerais")
    ) {
      data = await carregarInformacoesGeraisFallback(month);
      error = null;
    }

    if (error) {
      throw error;
    }

    const normalized = normalizarInformacoesGerais(data, month);

    state.generalInfo = normalized;
    state.generalInfoCache.set(month, normalized);
    renderizarInformacoesGerais(normalized);

    if (showToast) {
      mostrarToast("Informações gerais atualizadas.", "success");
    }
  } catch (error) {
    console.error("Erro ao carregar Informações Gerais:", error);
    definirEstadoInformacoesGerais(
      "error",
      traduzirErroInformacoesGerais(error)
    );
  } finally {
    state.generalInfoLoading = false;
    elements.generalRefreshButton.disabled = false;
    elements.generalCurrentMonthButton.disabled = false;
    elements.generalMonthInput.disabled = false;
  }
}

async function carregarInformacoesGeraisFallback(month) {
  const firstDay = `${month}-01`;
  const nextMonth = obterPrimeiroDiaMesSeguinte(firstDay);

  const { data: days, error } = await state.supabase
    .from("vw_ponto_diario")
    .select(
      "data_referencia, entrada, saida_almoco, retorno_almoco, saida_final, quantidade_marcacoes, total_minutos, status_dia, mes_assinado"
    )
    .eq("colaborador_id", state.colaborador.id)
    .gte("data_referencia", firstDay)
    .lt("data_referencia", nextMonth)
    .order("data_referencia", { ascending: false })
    .limit(31);

  if (error) {
    throw error;
  }

  const validDays = Array.isArray(days) ? days : [];
  const completeDays = validDays.filter(
    (day) => day.status_dia === "completo"
  );
  const totalMinutes = completeDays.reduce(
    (sum, day) => sum + Number(day.total_minutos || 0),
    0
  );
  const dailyLoad = Number(
    state.configuracao?.carga_diaria_minutos || 480
  );
  const currentMonth = month === obterMesAtualInput();
  const today = obterDataReferenciaAtual();

  const highlightedDay = currentMonth
    ? validDays.find((day) => day.data_referencia === today) || null
    : validDays[0] || null;

  return {
    competencia: firstDay,
    gerado_em: new Date().toISOString(),
    resumo: {
      dias_com_registro: validDays.length,
      dias_completos: completeDays.length,
      dias_incompletos:
        validDays.length - completeDays.length,
      total_minutos_mes: totalMinutes,
      carga_prevista_dias_completos:
        completeDays.length * dailyLoad,
      saldo_minutos:
        totalMinutes - completeDays.length * dailyLoad,
      media_minutos_dia:
        completeDays.length
          ? Math.round(totalMinutes / completeDays.length)
          : 0,
      mes_assinado: validDays.some((day) => day.mes_assinado),
      fora_area_quantidade: null,
      ultima_marcacao: null,
    },
    regras: {
      carga_diaria_minutos: dailyLoad,
      tolerancia_minutos: Number(
        state.configuracao?.tolerancia_minutos || 0
      ),
    },
    dia_destaque: highlightedDay
      ? {
          titulo: currentMonth
            ? "Jornada de hoje"
            : "Último dia com registro",
          ...normalizarDiaFallback(highlightedDay),
        }
      : null,
    ultimos_dias: validDays
      .slice(0, 7)
      .map(normalizarDiaFallback),
    modo_fallback: true,
  };
}

function normalizarDiaFallback(day) {
  return {
    data_referencia: day.data_referencia,
    entrada: extrairHoraDeData(day.entrada),
    saida_almoco: extrairHoraDeData(day.saida_almoco),
    retorno_almoco: extrairHoraDeData(day.retorno_almoco),
    saida_final: extrairHoraDeData(day.saida_final),
    quantidade_marcacoes: Number(day.quantidade_marcacoes || 0),
    total_minutos:
      day.total_minutos === null
        ? null
        : Number(day.total_minutos),
    status_dia: day.status_dia || "incompleto",
  };
}

function normalizarInformacoesGerais(data, month) {
  const payload = data && typeof data === "object" ? data : {};
  const summary = payload.resumo || {};
  const rules = payload.regras || {};

  return {
    competencia: payload.competencia || `${month}-01`,
    gerado_em: payload.gerado_em || new Date().toISOString(),
    resumo: {
      dias_com_registro: Number(summary.dias_com_registro || 0),
      dias_completos: Number(summary.dias_completos || 0),
      dias_incompletos: Number(summary.dias_incompletos || 0),
      total_minutos_mes: Number(summary.total_minutos_mes || 0),
      carga_prevista_dias_completos: Number(
        summary.carga_prevista_dias_completos || 0
      ),
      saldo_minutos: Number(summary.saldo_minutos || 0),
      media_minutos_dia: Number(summary.media_minutos_dia || 0),
      mes_assinado: Boolean(summary.mes_assinado),
      fora_area_quantidade:
        summary.fora_area_quantidade === null ||
        summary.fora_area_quantidade === undefined
          ? null
          : Number(summary.fora_area_quantidade),
      ultima_marcacao: summary.ultima_marcacao || null,
    },
    regras: {
      carga_diaria_minutos: Number(
        rules.carga_diaria_minutos ||
        state.configuracao?.carga_diaria_minutos ||
        480
      ),
      tolerancia_minutos: Number(
        rules.tolerancia_minutos ||
        state.configuracao?.tolerancia_minutos ||
        0
      ),
    },
    dia_destaque: payload.dia_destaque || null,
    ultimos_dias: Array.isArray(payload.ultimos_dias)
      ? payload.ultimos_dias
      : [],
    modo_fallback: Boolean(payload.modo_fallback),
  };
}

function renderizarInformacoesGerais(data) {
  const summary = data.resumo;
  const rules = data.regras;

  elements.generalPeriodLabel.textContent =
    formatarCompetencia(data.competencia);
  elements.generalLastUpdated.textContent =
    `Atualizado ${formatarDataHoraCurta(data.gerado_em)}`;

  elements.metricTotalHours.textContent =
    formatarDuracao(summary.total_minutos_mes);
  elements.metricDaysWithRecords.textContent =
    String(summary.dias_com_registro);
  elements.metricCompleteDays.textContent =
    String(summary.dias_completos);
  elements.metricIncompleteDays.textContent =
    String(summary.dias_incompletos);

  elements.metricBalance.textContent =
    formatarDuracaoComSinal(summary.saldo_minutos);
  elements.metricBalanceCard.classList.toggle(
    "metric-positive",
    summary.saldo_minutos > 0
  );
  elements.metricBalanceCard.classList.toggle(
    "metric-negative",
    summary.saldo_minutos < 0
  );

  elements.metricSignature.textContent =
    summary.mes_assinado ? "Assinado" : "Pendente";
  elements.metricSignatureHelp.textContent =
    summary.mes_assinado
      ? "Competência confirmada"
      : "Disponível após conferência";
  elements.metricSignatureCard.classList.toggle(
    "metric-positive",
    summary.mes_assinado
  );

  elements.generalDailyLoad.textContent =
    formatarDuracao(rules.carga_diaria_minutos);
  elements.generalTolerance.textContent =
    `${rules.tolerancia_minutos} min`;
  elements.generalAverage.textContent =
    summary.dias_completos
      ? formatarDuracao(summary.media_minutos_dia)
      : "—";
  elements.generalOutsideArea.textContent =
    summary.fora_area_quantidade === null
      ? "—"
      : String(summary.fora_area_quantidade);
  elements.generalLastMarking.textContent =
    summary.ultima_marcacao
      ? formatarDataHoraCurta(summary.ultima_marcacao)
      : "—";

  renderizarDiaDestaque(data.dia_destaque);
  renderizarAlertasGerais(data);
  renderizarDiasRecentes(data.ultimos_dias);

  definirEstadoInformacoesGerais("content");
}

function renderizarDiaDestaque(day) {
  const pointMap = {
    entrada: "entrada",
    saida_almoco: "saida_almoco",
    retorno_almoco: "retorno_almoco",
    saida_final: "saida_final",
  };

  elements.generalDaySteps.forEach((step) => {
    step.classList.remove("is-complete");
    step.querySelector("small").textContent = "—";
  });

  if (!day) {
    elements.generalDayHighlightKicker.textContent =
      "Jornada do período";
    elements.generalDayHighlightTitle.textContent =
      "Sem registro";
    elements.generalDayDate.textContent = "—";
    elements.generalDayTotal.textContent = "—";
    elements.generalDayRecordCount.textContent = "0 de 4";
    definirBadge(
      elements.generalDayStatusBadge,
      "pending",
      "Sem registro"
    );
    return;
  }

  elements.generalDayHighlightKicker.textContent =
    day.titulo || "Jornada destacada";
  elements.generalDayHighlightTitle.textContent =
    day.status_dia === "completo"
      ? "Jornada concluída"
      : "Jornada incompleta";
  elements.generalDayDate.textContent =
    formatarDataBrasileira(day.data_referencia);
  elements.generalDayTotal.textContent =
    day.total_minutos === null ||
    day.total_minutos === undefined
      ? "—"
      : formatarDuracao(Number(day.total_minutos));
  elements.generalDayRecordCount.textContent =
    `${Number(day.quantidade_marcacoes || 0)} de 4`;

  definirBadge(
    elements.generalDayStatusBadge,
    day.status_dia === "completo" ? "ready" : "error",
    day.status_dia === "completo" ? "Completa" : "Incompleta"
  );

  elements.generalDaySteps.forEach((step) => {
    const key = pointMap[step.dataset.generalPoint];
    const value = day[key];

    if (value) {
      step.classList.add("is-complete");
      step.querySelector("small").textContent = value;
    }
  });
}

function renderizarAlertasGerais(data) {
  const summary = data.resumo;
  const alerts = [];

  if (summary.dias_com_registro === 0) {
    alerts.push({
      type: "info",
      text: "Não há marcações no mês selecionado.",
    });
  }

  if (summary.dias_incompletos > 0) {
    alerts.push({
      type: "warning",
      text:
        `${summary.dias_incompletos} ` +
        `${summary.dias_incompletos === 1 ? "dia possui" : "dias possuem"} ` +
        "marcações incompletas e devem ser conferidas.",
    });
  }

  if (
    summary.fora_area_quantidade !== null &&
    summary.fora_area_quantidade > 0
  ) {
    alerts.push({
      type: "warning",
      text:
        `${summary.fora_area_quantidade} ` +
        `${summary.fora_area_quantidade === 1 ? "marcação foi feita" : "marcações foram feitas"} ` +
        "fora da área configurada.",
    });
  }

  if (summary.saldo_minutos < 0 && summary.dias_completos > 0) {
    alerts.push({
      type: "warning",
      text:
        `O saldo dos dias completos está em ` +
        `${formatarDuracaoComSinal(summary.saldo_minutos)}.`,
    });
  }

  if (summary.saldo_minutos > 0 && summary.dias_completos > 0) {
    alerts.push({
      type: "success",
      text:
        `O saldo dos dias completos está positivo em ` +
        `${formatarDuracaoComSinal(summary.saldo_minutos)}.`,
    });
  }

  if (summary.mes_assinado) {
    alerts.push({
      type: "success",
      text: "A competência selecionada já foi assinada.",
    });
  } else if (summary.dias_com_registro > 0) {
    alerts.push({
      type: "info",
      text: "A competência ainda não possui assinatura ativa.",
    });
  }

  if (data.modo_fallback) {
    alerts.push({
      type: "info",
      text:
        "O painel está em modo de compatibilidade. Execute o SQL da Etapa 6 para usar a consulta otimizada.",
    });
  }

  if (!alerts.length) {
    alerts.push({
      type: "success",
      text: "Nenhuma pendência foi identificada neste período.",
    });
  }

  elements.generalAlertsList.replaceChildren();

  alerts.forEach((alert) => {
    const item = document.createElement("li");
    item.className = `general-alert general-alert-${alert.type}`;

    const indicator = document.createElement("i");
    indicator.setAttribute("aria-hidden", "true");

    const text = document.createElement("span");
    text.textContent = alert.text;

    item.append(indicator, text);
    elements.generalAlertsList.appendChild(item);
  });
}

function renderizarDiasRecentes(days) {
  elements.generalRecentDaysBody.replaceChildren();

  if (!days.length) {
    elements.generalEmptyRecent.hidden = false;
    elements.generalRecentDaysBody.closest("table").hidden = true;
    return;
  }

  elements.generalEmptyRecent.hidden = true;
  elements.generalRecentDaysBody.closest("table").hidden = false;

  days.slice(0, 7).forEach((day) => {
    const row = document.createElement("tr");

    const values = [
      formatarDataBrasileira(day.data_referencia),
      day.entrada || "—",
      day.saida_almoco || "—",
      day.retorno_almoco || "—",
      day.saida_final || "—",
      day.total_minutos === null ||
      day.total_minutos === undefined
        ? "—"
        : formatarDuracao(Number(day.total_minutos)),
    ];

    values.forEach((value, index) => {
      const cell = document.createElement("td");
      cell.textContent = value;

      if (index > 0) {
        cell.classList.add("mono-text");
      }

      row.appendChild(cell);
    });

    const statusCell = document.createElement("td");
    const status = document.createElement("span");
    const complete = day.status_dia === "completo";

    status.className =
      `general-day-status ${complete ? "is-complete" : "is-incomplete"}`;
    status.textContent = complete ? "Completa" : "Incompleta";
    statusCell.appendChild(status);
    row.appendChild(statusCell);

    elements.generalRecentDaysBody.appendChild(row);
  });
}

function definirEstadoInformacoesGerais(type, message = "") {
  elements.generalLoading.hidden = type !== "loading";
  elements.generalError.hidden = type !== "error";
  elements.generalContent.hidden = type !== "content";

  if (type === "error") {
    elements.generalErrorText.textContent =
      message || "Tente novamente em alguns instantes.";
  }
}

function invalidarCacheInformacoesGerais() {
  state.generalInfo = null;
  state.generalInfoCache.clear();
}

function traduzirErroInformacoesGerais(error) {
  const message = String(error?.message || "");
  const normalized = message.toLowerCase();

  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("network") ||
    normalized.includes("load failed")
  ) {
    return "A conexão com o Supabase foi interrompida. Verifique a internet.";
  }

  if (
    normalized.includes("permission") ||
    normalized.includes("row-level security") ||
    normalized.includes("403")
  ) {
    return "O acesso ao resumo foi bloqueado pelas permissões do Supabase.";
  }

  return message || "Não foi possível consultar as informações do período.";
}

function obterMesAtualInput() {
  const parts = obterPartesDataNoFuso();
  return `${parts.year}-${parts.month}`;
}

function normalizarMesInput(value) {
  return /^\d{4}-\d{2}$/.test(String(value || ""))
    ? value
    : obterMesAtualInput();
}

function obterPrimeiroDiaMesSeguinte(firstDay) {
  const [year, month] = firstDay
    .slice(0, 7)
    .split("-")
    .map(Number);
  const next = new Date(Date.UTC(year, month, 1));

  return [
    next.getUTCFullYear(),
    String(next.getUTCMonth() + 1).padStart(2, "0"),
    "01",
  ].join("-");
}

function formatarCompetencia(dateValue) {
  const [year, month] = String(dateValue)
    .slice(0, 7)
    .split("-")
    .map(Number);

  if (!year || !month) {
    return "—";
  }

  const text = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatarDataBrasileira(dateValue) {
  const parts = String(dateValue || "").split("-");

  if (parts.length !== 3) {
    return "—";
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatarDataHoraCurta(dateValue) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone:
      state.configuracao?.fuso_horario ||
      "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function extrairHoraDeData(dateValue) {
  if (!dateValue) {
    return null;
  }

  const text = String(dateValue);
  const match = text.match(/(\d{2}:\d{2})(?::\d{2})?/);

  return match ? match[0] : null;
}

function formatarDuracao(minutes) {
  const safeMinutes = Math.max(0, Math.round(Number(minutes || 0)));
  const hours = Math.floor(safeMinutes / 60);
  const remaining = safeMinutes % 60;

  return `${hours}h${String(remaining).padStart(2, "0")}`;
}

function formatarDuracaoComSinal(minutes) {
  const value = Math.round(Number(minutes || 0));
  const signal = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${signal}${formatarDuracao(Math.abs(value))}`;
}



/* ==========================================================
   ETAPA 7 - MEU HISTÓRICO E COMPROVANTES
   ========================================================== */

async function carregarHistoricoPonto({
  force = false,
  showToast = false,
} = {}) {
  if (!state.supabase || !state.colaborador || state.historyLoading) {
    return;
  }

  const filters = obterFiltrosHistorico();
  const validation = validarFiltrosHistorico(filters);

  if (validation) {
    definirEstadoHistorico("error", validation);
    return;
  }

  const cacheKey = criarChaveCacheHistorico(filters);

  if (!force && state.historyCache.has(cacheKey)) {
    const cached = state.historyCache.get(cacheKey);
    state.historyData = cached;
    state.historyTotalPages = cached.paginacao.total_paginas;
    renderizarHistoricoPonto(cached, filters);
    return;
  }

  definirEstadoHistorico("loading");
  state.historyLoading = true;
  definirControlesHistoricoCarregando(true);

  try {
    let { data, error } = await state.supabase.rpc(
      "obter_historico_ponto",
      {
        p_data_inicio: filters.startDate,
        p_data_fim: filters.endDate,
        p_status: filters.status,
        p_assinatura: filters.signature,
        p_pagina: filters.page,
        p_limite: filters.pageSize,
      }
    );

    if (error && funcaoRpcNaoEncontrada(error, "obter_historico_ponto")) {
      data = await carregarHistoricoPontoFallback(filters);
      error = null;
    }

    if (error) {
      throw error;
    }

    const normalized = normalizarHistoricoPonto(data, filters);
    state.historyData = normalized;
    state.historyTotalPages = normalized.paginacao.total_paginas;
    state.historyCache.set(cacheKey, normalized);
    renderizarHistoricoPonto(normalized, filters);

    if (showToast) {
      mostrarToast("Histórico atualizado.", "success");
    }
  } catch (error) {
    console.error("Erro ao carregar histórico:", error);
    definirEstadoHistorico("error", traduzirErroHistorico(error));
  } finally {
    state.historyLoading = false;
    definirControlesHistoricoCarregando(false);
  }
}

async function carregarHistoricoPontoFallback(filters) {
  let query = state.supabase
    .from("vw_ponto_diario")
    .select(
      "data_referencia, entrada, saida_almoco, retorno_almoco, saida_final, quantidade_marcacoes, total_minutos, status_dia, mes_assinado"
    )
    .eq("colaborador_id", state.colaborador.id)
    .gte("data_referencia", filters.startDate)
    .lte("data_referencia", filters.endDate)
    .order("data_referencia", { ascending: false })
    .limit(366);

  if (filters.status !== "todos") {
    query = query.eq("status_dia", filters.status);
  }

  if (filters.signature === "assinado") {
    query = query.eq("mes_assinado", true);
  } else if (filters.signature === "pendente") {
    query = query.eq("mes_assinado", false);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const allDays = Array.isArray(data)
    ? data.map(normalizarDiaHistoricoFallback)
    : [];
  const totalItems = allDays.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / filters.pageSize));
  const safePage = Math.min(filters.page, totalPages);
  const from = (safePage - 1) * filters.pageSize;
  const pageDays = allDays.slice(from, from + filters.pageSize);
  const complete = allDays.filter((day) => day.status_dia === "completo");

  return {
    periodo: {
      data_inicio: filters.startDate,
      data_fim: filters.endDate,
      status: filters.status,
      assinatura: filters.signature,
    },
    resumo: {
      dias_encontrados: totalItems,
      dias_completos: complete.length,
      dias_incompletos: totalItems - complete.length,
      total_minutos: complete.reduce(
        (sum, day) => sum + Number(day.total_minutos || 0),
        0
      ),
    },
    paginacao: {
      pagina: safePage,
      limite: filters.pageSize,
      total_itens: totalItems,
      total_paginas: totalPages,
    },
    dias: pageDays,
    modo_fallback: true,
  };
}

function normalizarDiaHistoricoFallback(day) {
  return {
    data_referencia: day.data_referencia,
    entrada: extrairHoraDeData(day.entrada),
    saida_almoco: extrairHoraDeData(day.saida_almoco),
    retorno_almoco: extrairHoraDeData(day.retorno_almoco),
    saida_final: extrairHoraDeData(day.saida_final),
    quantidade_marcacoes: Number(day.quantidade_marcacoes || 0),
    total_minutos:
      day.total_minutos === null || day.total_minutos === undefined
        ? null
        : Number(day.total_minutos),
    status_dia: day.status_dia || "incompleto",
    mes_assinado: Boolean(day.mes_assinado),
  };
}

function normalizarHistoricoPonto(data, filters) {
  const payload = data && typeof data === "object" ? data : {};
  const pagination = payload.paginacao || {};
  const summary = payload.resumo || {};

  return {
    periodo: payload.periodo || {
      data_inicio: filters.startDate,
      data_fim: filters.endDate,
      status: filters.status,
      assinatura: filters.signature,
    },
    resumo: {
      dias_encontrados: Number(summary.dias_encontrados || 0),
      dias_completos: Number(summary.dias_completos || 0),
      dias_incompletos: Number(summary.dias_incompletos || 0),
      total_minutos: Number(summary.total_minutos || 0),
    },
    paginacao: {
      pagina: Number(pagination.pagina || filters.page),
      limite: Number(pagination.limite || filters.pageSize),
      total_itens: Number(pagination.total_itens || 0),
      total_paginas: Math.max(1, Number(pagination.total_paginas || 1)),
    },
    dias: Array.isArray(payload.dias)
      ? payload.dias.map((day) => ({
          data_referencia: day.data_referencia,
          entrada: day.entrada || null,
          saida_almoco: day.saida_almoco || null,
          retorno_almoco: day.retorno_almoco || null,
          saida_final: day.saida_final || null,
          quantidade_marcacoes: Number(day.quantidade_marcacoes || 0),
          total_minutos:
            day.total_minutos === null || day.total_minutos === undefined
              ? null
              : Number(day.total_minutos),
          status_dia: day.status_dia || "incompleto",
          mes_assinado: Boolean(day.mes_assinado),
        }))
      : [],
    modo_fallback: Boolean(payload.modo_fallback),
  };
}

function renderizarHistoricoPonto(data, filters) {
  const summary = data.resumo;
  const pagination = data.paginacao;

  state.historyPage = pagination.pagina;
  state.historyTotalPages = pagination.total_paginas;

  elements.historySummaryDays.textContent = String(summary.dias_encontrados);
  elements.historySummaryComplete.textContent = String(summary.dias_completos);
  elements.historySummaryIncomplete.textContent = String(summary.dias_incompletos);
  elements.historySummaryHours.textContent = formatarDuracao(summary.total_minutos);

  elements.historyResultsTitle.textContent =
    `${formatarDataBrasileira(filters.startDate)} a ` +
    `${formatarDataBrasileira(filters.endDate)}`;

  const firstItem = pagination.total_itens
    ? (pagination.pagina - 1) * pagination.limite + 1
    : 0;
  const lastItem = Math.min(
    pagination.pagina * pagination.limite,
    pagination.total_itens
  );

  elements.historyResultsInfo.textContent = pagination.total_itens
    ? `Exibindo ${firstItem} a ${lastItem} de ${pagination.total_itens} jornadas.`
    : "Nenhuma jornada encontrada para os filtros selecionados.";

  renderizarLinhasHistorico(data.dias);
  renderizarPaginacaoHistorico(pagination);

  elements.historyPrintPeriodButton.disabled = pagination.total_itens === 0;
  definirEstadoHistorico("content");
}

function renderizarLinhasHistorico(days) {
  elements.historyTableBody.replaceChildren();
  elements.historyMobileList.replaceChildren();

  const hasDays = days.length > 0;
  elements.historyEmptyState.hidden = hasDays;
  elements.historyTableWrapper.hidden = !hasDays;
  elements.historyMobileList.hidden = !hasDays;

  days.forEach((day) => {
    elements.historyTableBody.appendChild(criarLinhaHistorico(day));
    elements.historyMobileList.appendChild(criarCardHistorico(day));
  });
}

function criarLinhaHistorico(day) {
  const row = document.createElement("tr");
  row.dataset.historyDate = day.data_referencia;

  const values = [
    formatarDataBrasileira(day.data_referencia),
    day.entrada || "—",
    day.saida_almoco || "—",
    day.retorno_almoco || "—",
    day.saida_final || "—",
    day.total_minutos === null
      ? "—"
      : formatarDuracao(day.total_minutos),
  ];

  values.forEach((value, index) => {
    const cell = document.createElement("td");
    cell.textContent = value;

    if (index > 0) {
      cell.classList.add("mono-text");
    }

    row.appendChild(cell);
  });

  const statusCell = document.createElement("td");
  statusCell.appendChild(criarBadgeHistoricoStatus(day.status_dia));
  row.appendChild(statusCell);

  const signatureCell = document.createElement("td");
  signatureCell.appendChild(criarBadgeHistoricoAssinatura(day.mes_assinado));
  row.appendChild(signatureCell);

  const actionCell = document.createElement("td");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "history-detail-button";
  button.dataset.historyAction = "details";
  button.dataset.historyDate = day.data_referencia;
  button.textContent = "Ver detalhes";
  actionCell.appendChild(button);
  row.appendChild(actionCell);

  return row;
}

function criarCardHistorico(day) {
  const card = document.createElement("article");
  card.className = "history-mobile-card";
  card.dataset.historyDate = day.data_referencia;

  const header = document.createElement("header");
  const heading = document.createElement("div");
  const kicker = document.createElement("span");
  const title = document.createElement("h3");

  kicker.textContent = "Jornada";
  title.textContent = formatarDataBrasileira(day.data_referencia);
  heading.append(kicker, title);
  header.append(heading, criarBadgeHistoricoStatus(day.status_dia));

  const grid = document.createElement("dl");
  grid.className = "history-mobile-times";

  [
    ["Entrada", day.entrada],
    ["Saída almoço", day.saida_almoco],
    ["Retorno", day.retorno_almoco],
    ["Saída final", day.saida_final],
    ["Total", day.total_minutos === null ? null : formatarDuracao(day.total_minutos)],
  ].forEach(([label, value]) => {
    const wrapper = document.createElement("div");
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = label;
    dd.textContent = value || "—";
    dd.className = "mono-text";
    wrapper.append(dt, dd);
    grid.appendChild(wrapper);
  });

  const footer = document.createElement("footer");
  footer.appendChild(criarBadgeHistoricoAssinatura(day.mes_assinado));

  const button = document.createElement("button");
  button.type = "button";
  button.className = "history-detail-button";
  button.dataset.historyAction = "details";
  button.dataset.historyDate = day.data_referencia;
  button.textContent = "Ver detalhes";
  footer.appendChild(button);

  card.append(header, grid, footer);
  return card;
}

function criarBadgeHistoricoStatus(status) {
  const badge = document.createElement("span");
  const complete = status === "completo";
  badge.className =
    `history-status-badge ${complete ? "is-complete" : "is-incomplete"}`;
  badge.textContent = complete ? "Completa" : "Incompleta";
  return badge;
}

function criarBadgeHistoricoAssinatura(signed) {
  const badge = document.createElement("span");
  badge.className =
    `history-signature-badge ${signed ? "is-signed" : "is-pending"}`;
  badge.textContent = signed ? "Assinada" : "Pendente";
  return badge;
}

function renderizarPaginacaoHistorico(pagination) {
  const hasPagination = pagination.total_itens > 0;
  elements.historyPagination.hidden = !hasPagination;
  elements.historyPageLabel.textContent =
    `Página ${pagination.pagina} de ${pagination.total_paginas}`;
  elements.historyPreviousPageButton.disabled = pagination.pagina <= 1;
  elements.historyNextPageButton.disabled =
    pagination.pagina >= pagination.total_paginas;
}

function tratarAcaoHistorico(event) {
  const button = event.target.closest("[data-history-action]");

  if (!button) {
    return;
  }

  if (button.dataset.historyAction === "details") {
    abrirDetalheHistorico(button.dataset.historyDate);
  }
}

async function abrirDetalheHistorico(dateReference) {
  if (!dateReference || !state.supabase) {
    return;
  }

  elements.historyDetailModal.hidden = false;
  document.body.classList.add("modal-open");
  elements.historyDetailLoading.hidden = false;
  elements.historyDetailError.hidden = true;
  elements.historyDetailContent.hidden = true;
  elements.historyPrintDayButton.disabled = true;
  elements.historyDetailSubtitle.textContent =
    formatarDataBrasileira(dateReference);

  try {
    let receipt = state.historyReceiptCache.get(dateReference);

    if (!receipt) {
      let { data, error } = await state.supabase.rpc(
        "obter_comprovante_ponto_dia",
        {
          p_data_referencia: dateReference,
        }
      );

      if (
        error &&
        funcaoRpcNaoEncontrada(error, "obter_comprovante_ponto_dia")
      ) {
        data = await carregarComprovanteDiaFallback(dateReference);
        error = null;
      }

      if (error) {
        throw error;
      }

      receipt = normalizarComprovanteDia(data, dateReference);
      state.historyReceiptCache.set(dateReference, receipt);
    }

    state.historySelectedReceipt = receipt;
    renderizarDetalheHistorico(receipt);
    elements.historyDetailLoading.hidden = true;
    elements.historyDetailContent.hidden = false;
    elements.historyPrintDayButton.disabled = false;
  } catch (error) {
    console.error("Erro ao carregar comprovante diário:", error);
    elements.historyDetailLoading.hidden = true;
    elements.historyDetailError.hidden = false;
    elements.historyDetailErrorText.textContent = traduzirErroHistorico(error);
  }
}

async function carregarComprovanteDiaFallback(dateReference) {
  const competence = `${dateReference.slice(0, 7)}-01`;

  const [dayResult, recordsResult, employeeResult, companyResult, signatureResult] =
    await Promise.all([
      state.supabase
        .from("vw_ponto_diario")
        .select(
          "data_referencia, entrada, saida_almoco, retorno_almoco, saida_final, quantidade_marcacoes, total_minutos, status_dia, mes_assinado"
        )
        .eq("colaborador_id", state.colaborador.id)
        .eq("data_referencia", dateReference)
        .single(),

      state.supabase
        .from("registros_ponto")
        .select(
          "id, tipo, registrado_em, latitude, longitude, precisao_metros, distancia_empresa_metros, dentro_area_permitida, foto_url, foto_provedor, codigo_registro, hash_integridade, origem"
        )
        .eq("colaborador_id", state.colaborador.id)
        .eq("data_referencia", dateReference)
        .eq("status", "valido")
        .order("registrado_em", { ascending: true })
        .limit(4),

      state.supabase
        .from("colaboradores")
        .select("nome_completo, cpf, cargo_funcao")
        .eq("id", state.colaborador.id)
        .single(),

      state.supabase
        .from("empresas")
        .select("razao_social, nome_fantasia, cnpj")
        .eq("id", state.empresa.id)
        .single(),

      state.supabase
        .from("assinaturas_ponto")
        .select("versao, assinada_em, hash_confirmacao, ativa")
        .eq("colaborador_id", state.colaborador.id)
        .eq("competencia", competence)
        .eq("ativa", true)
        .maybeSingle(),
    ]);

  for (const result of [dayResult, recordsResult, employeeResult, companyResult, signatureResult]) {
    if (result.error) {
      throw result.error;
    }
  }

  const day = dayResult.data;
  const timeZone =
    state.configuracao?.fuso_horario || "America/Sao_Paulo";

  return {
    empresa: companyResult.data,
    colaborador: employeeResult.data,
    jornada: {
      ...normalizarDiaHistoricoFallback(day),
    },
    registros: (recordsResult.data || []).map((record) => ({
      ...record,
      horario_local: new Intl.DateTimeFormat("pt-BR", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date(record.registrado_em)),
    })),
    assinatura: signatureResult.data || null,
    gerado_em: new Date().toISOString(),
    modo_fallback: true,
  };
}

function normalizarComprovanteDia(data, dateReference) {
  const payload = data && typeof data === "object" ? data : {};
  const day = payload.jornada || {};

  return {
    empresa: payload.empresa || {
      razao_social: state.empresa?.razao_social,
      nome_fantasia: state.empresa?.nome_fantasia,
      cnpj: null,
    },
    colaborador: payload.colaborador || {
      nome_completo: state.colaborador?.nome_completo,
      cpf: null,
      cargo_funcao: state.colaborador?.cargo_funcao,
    },
    jornada: {
      data_referencia: day.data_referencia || dateReference,
      entrada: day.entrada || null,
      saida_almoco: day.saida_almoco || null,
      retorno_almoco: day.retorno_almoco || null,
      saida_final: day.saida_final || null,
      quantidade_marcacoes: Number(day.quantidade_marcacoes || 0),
      total_minutos:
        day.total_minutos === null || day.total_minutos === undefined
          ? null
          : Number(day.total_minutos),
      status_dia: day.status_dia || "incompleto",
      mes_assinado: Boolean(day.mes_assinado || payload.assinatura?.ativa),
    },
    registros: Array.isArray(payload.registros) ? payload.registros : [],
    assinatura: payload.assinatura || null,
    gerado_em: payload.gerado_em || new Date().toISOString(),
    modo_fallback: Boolean(payload.modo_fallback),
  };
}

function renderizarDetalheHistorico(receipt) {
  const day = receipt.jornada;
  const complete = day.status_dia === "completo";

  elements.historyDetailTitle.textContent =
    complete ? "Jornada concluída" : "Jornada incompleta";
  elements.historyDetailSubtitle.textContent =
    `Comprovante de ${formatarDataBrasileira(day.data_referencia)}`;
  elements.historyDetailDate.textContent =
    formatarDataBrasileira(day.data_referencia);
  elements.historyDetailTotal.textContent =
    day.total_minutos === null ? "—" : formatarDuracao(day.total_minutos);
  elements.historyDetailStatus.textContent = complete ? "Completa" : "Incompleta";
  elements.historyDetailSignature.textContent =
    receipt.assinatura?.ativa ? "Assinada" : "Pendente";

  elements.historyDetailCompany.textContent =
    receipt.empresa.nome_fantasia || receipt.empresa.razao_social || "—";
  elements.historyDetailCompanyCnpj.textContent = receipt.empresa.cnpj
    ? `CNPJ ${formatarCnpj(receipt.empresa.cnpj)}`
    : "CNPJ não informado";
  elements.historyDetailEmployee.textContent =
    receipt.colaborador.nome_completo || "—";
  elements.historyDetailEmployeeInfo.textContent = [
    receipt.colaborador.cargo_funcao || null,
    receipt.colaborador.cpf
      ? `CPF ${mascararCpf(receipt.colaborador.cpf)}`
      : null,
  ].filter(Boolean).join(" • ") || "—";

  elements.historyDetailRecords.replaceChildren();

  receipt.registros.forEach((record, index) => {
    elements.historyDetailRecords.appendChild(
      criarCardDetalheRegistro(record, index)
    );
  });
}

function criarCardDetalheRegistro(record, index) {
  const article = document.createElement("article");
  article.className = "history-record-detail";

  const header = document.createElement("header");
  const number = document.createElement("span");
  const title = document.createElement("div");
  const heading = document.createElement("h3");
  const time = document.createElement("strong");

  number.textContent = String(index + 1);
  heading.textContent = obterRotuloTipoPonto(record.tipo);
  time.textContent = record.horario_local || formatarHora(record.registrado_em);
  time.className = "mono-text";
  title.append(heading, time);
  header.append(number, title);

  const grid = document.createElement("dl");
  grid.className = "history-record-metadata";

  const locationText = formatarLocalizacaoRegistro(record);
  const areaText = formatarAreaRegistro(record);

  [
    ["Código", record.codigo_registro || "—", true],
    ["Localização", locationText, true],
    ["Área permitida", areaText, false],
    ["Origem", formatarOrigemRegistro(record.origem), false],
    ["Hash de integridade", record.hash_integridade || "—", true],
  ].forEach(([label, value, mono]) => {
    const wrapper = document.createElement("div");
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = label;
    dd.textContent = value;
    if (mono) dd.classList.add("mono-text");
    wrapper.append(dt, dd);
    grid.appendChild(wrapper);
  });

  const actions = document.createElement("div");
  actions.className = "history-record-actions";

  if (
    Number.isFinite(Number(record.latitude)) &&
    Number.isFinite(Number(record.longitude))
  ) {
    const mapLink = document.createElement("a");
    mapLink.className = "compact-button ghost-button";
    mapLink.target = "_blank";
    mapLink.rel = "noopener noreferrer";
    mapLink.href =
      `https://www.openstreetmap.org/?mlat=${Number(record.latitude).toFixed(7)}` +
      `&mlon=${Number(record.longitude).toFixed(7)}` +
      `#map=18/${Number(record.latitude).toFixed(7)}/${Number(record.longitude).toFixed(7)}`;
    mapLink.textContent = "Abrir mapa";
    actions.appendChild(mapLink);
  }

  if (record.foto_url) {
    const photoButton = document.createElement("button");
    photoButton.type = "button";
    photoButton.className = "compact-button ghost-button";
    photoButton.dataset.historyDetailAction = "photo";
    photoButton.dataset.recordIndex = String(index);
    photoButton.textContent = "Ver foto";
    actions.appendChild(photoButton);
  }

  article.append(header, grid);
  if (actions.childElementCount) article.appendChild(actions);
  return article;
}

function tratarAcaoDetalheHistorico(event) {
  const button = event.target.closest("[data-history-detail-action]");

  if (!button || !state.historySelectedReceipt) {
    return;
  }

  if (button.dataset.historyDetailAction === "photo") {
    const index = Number(button.dataset.recordIndex);
    const record = state.historySelectedReceipt.registros[index];
    if (record) abrirFotoHistorico(record);
  }
}

async function abrirFotoHistorico(record) {
  elements.historyPhotoModal.hidden = false;
  document.body.classList.add("modal-open");
  elements.historyPhotoLoading.hidden = false;
  elements.historyPhotoError.hidden = true;
  elements.historyPhotoContent.hidden = true;
  elements.historyPhotoImage.removeAttribute("src");
  elements.historyPhotoCaption.textContent =
    `${obterRotuloTipoPonto(record.tipo)} • ${record.horario_local || "—"}`;

  try {
    const photoUrl = String(record.foto_url || "").trim();

    if (!photoUrl) {
      throw new Error("Esta marcação não possui foto vinculada.");
    }

    let signedUrl = photoUrl;

    if (!/^https?:\/\//i.test(photoUrl)) {
      const parsed = separarBucketECaminho(photoUrl);
      const { data, error } = await state.supabase.storage
        .from(parsed.bucket)
        .createSignedUrl(parsed.path, 120);

      if (error) {
        throw error;
      }

      signedUrl = data?.signedUrl;
    }

    if (!signedUrl) {
      throw new Error("O Supabase não retornou o acesso temporário à foto.");
    }

    state.historyPhotoSignedUrl = signedUrl;
    elements.historyPhotoImage.src = signedUrl;

    await aguardarImagemCarregada(elements.historyPhotoImage);

    elements.historyPhotoLoading.hidden = true;
    elements.historyPhotoContent.hidden = false;
  } catch (error) {
    console.error("Erro ao abrir foto protegida:", error);
    elements.historyPhotoLoading.hidden = true;
    elements.historyPhotoError.hidden = false;
    elements.historyPhotoErrorText.textContent =
      error?.message || "Não foi possível carregar a foto.";
  }
}

function fecharFotoHistorico() {
  if (!elements.historyPhotoModal) return;
  elements.historyPhotoModal.hidden = true;
  elements.historyPhotoImage?.removeAttribute("src");
  state.historyPhotoSignedUrl = null;
  atualizarBloqueioScrollModais();
}

function fecharDetalheHistorico() {
  if (!elements.historyDetailModal) return;
  elements.historyDetailModal.hidden = true;
  state.historySelectedReceipt = null;
  fecharFotoHistorico();
  atualizarBloqueioScrollModais();
}

function atualizarBloqueioScrollModais() {
  const modalOpen =
    !elements.historyDetailModal.hidden ||
    !elements.historyPhotoModal.hidden;
  document.body.classList.toggle("modal-open", modalOpen);
}

function separarBucketECaminho(reference) {
  const normalized = String(reference || "").replace(/^\/+/, "");
  const [first, ...rest] = normalized.split("/");

  if (first === PHOTO_BUCKET && rest.length) {
    return { bucket: first, path: rest.join("/") };
  }

  return { bucket: PHOTO_BUCKET, path: normalized };
}

function aguardarImagemCarregada(image) {
  if (image.complete && image.naturalWidth > 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("A foto demorou demais para carregar."));
    }, 15000);

    const onLoad = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error("A foto não pôde ser carregada."));
    };

    const cleanup = () => {
      window.clearTimeout(timeout);
      image.removeEventListener("load", onLoad);
      image.removeEventListener("error", onError);
    };

    image.addEventListener("load", onLoad, { once: true });
    image.addEventListener("error", onError, { once: true });
  });
}

async function imprimirComprovanteDiario() {
  const receipt = state.historySelectedReceipt;

  if (!receipt) {
    mostrarToast("Abra uma jornada antes de gerar o comprovante.", "error");
    return;
  }

  prepararDocumentoComprovanteDiario(receipt);
  executarImpressaoDocumento();
}

async function imprimirEspelhoPeriodo() {
  if (state.historyLoading || !state.historyData) {
    return;
  }

  const filters = obterFiltrosHistorico();
  const validation = validarFiltrosHistorico(filters);

  if (validation) {
    mostrarToast(validation, "error");
    return;
  }

  elements.historyPrintPeriodButton.disabled = true;
  elements.historyPrintPeriodButton.textContent = "Preparando relatório...";

  try {
    let { data, error } = await state.supabase.rpc(
      "obter_historico_ponto",
      {
        p_data_inicio: filters.startDate,
        p_data_fim: filters.endDate,
        p_status: filters.status,
        p_assinatura: filters.signature,
        p_pagina: 1,
        p_limite: 366,
      }
    );

    if (error && funcaoRpcNaoEncontrada(error, "obter_historico_ponto")) {
      data = await carregarHistoricoPontoFallback({
        ...filters,
        page: 1,
        pageSize: 366,
      });
      error = null;
    }

    if (error) throw error;

    const fullHistory = normalizarHistoricoPonto(data, {
      ...filters,
      page: 1,
      pageSize: 366,
    });

    prepararDocumentoEspelhoPeriodo(fullHistory, filters);
    executarImpressaoDocumento();
  } catch (error) {
    console.error("Erro ao preparar espelho do período:", error);
    mostrarToast(traduzirErroHistorico(error), "error");
  } finally {
    elements.historyPrintPeriodButton.disabled =
      !state.historyData?.paginacao?.total_itens;
    elements.historyPrintPeriodButton.textContent = "Imprimir / salvar PDF";
  }
}

function prepararDocumentoComprovanteDiario(receipt) {
  const day = receipt.jornada;
  elements.printDocumentTitle.textContent = "Comprovante Diário de Ponto";
  elements.printDocumentSubtitle.textContent =
    formatarDataBrasileira(day.data_referencia);
  elements.printDocumentGeneratedAt.textContent =
    `Documento gerado em ${formatarDataHoraCurta(new Date().toISOString())}.`;
  elements.printDocumentBody.replaceChildren();

  elements.printDocumentBody.appendChild(
    criarBlocoIdentificacaoImpressao(receipt.empresa, receipt.colaborador)
  );

  const summary = document.createElement("section");
  summary.className = "print-summary-grid";
  [
    ["Data", formatarDataBrasileira(day.data_referencia)],
    ["Situação", day.status_dia === "completo" ? "Completa" : "Incompleta"],
    ["Total trabalhado", day.total_minutos === null ? "—" : formatarDuracao(day.total_minutos)],
    ["Assinatura do mês", receipt.assinatura?.ativa ? "Assinada" : "Pendente"],
  ].forEach(([label, value]) => {
    summary.appendChild(criarCampoImpressao(label, value));
  });
  elements.printDocumentBody.appendChild(summary);

  const tableSection = document.createElement("section");
  tableSection.className = "print-section";
  const heading = document.createElement("h2");
  heading.textContent = "Marcações oficiais";
  tableSection.appendChild(heading);

  const table = criarTabelaImpressao(
    ["Tipo", "Horário", "Código", "Área", "Hash de integridade"],
    receipt.registros.map((record) => [
      obterRotuloTipoPonto(record.tipo),
      record.horario_local || formatarHora(record.registrado_em),
      record.codigo_registro || "—",
      formatarAreaRegistro(record),
      record.hash_integridade || "—",
    ])
  );
  tableSection.appendChild(table);
  elements.printDocumentBody.appendChild(tableSection);

  const note = document.createElement("section");
  note.className = "print-integrity-note";
  note.textContent =
    "Este comprovante apresenta os horários oficiais do servidor e os códigos " +
    "de integridade vinculados aos registros originais imutáveis.";
  elements.printDocumentBody.appendChild(note);
}

function prepararDocumentoEspelhoPeriodo(history, filters) {
  elements.printDocumentTitle.textContent = "Espelho de Ponto";
  elements.printDocumentSubtitle.textContent =
    `${formatarDataBrasileira(filters.startDate)} a ` +
    `${formatarDataBrasileira(filters.endDate)}`;
  elements.printDocumentGeneratedAt.textContent =
    `Documento gerado em ${formatarDataHoraCurta(new Date().toISOString())}.`;
  elements.printDocumentBody.replaceChildren();

  elements.printDocumentBody.appendChild(
    criarBlocoIdentificacaoImpressao(
      {
        nome_fantasia: state.empresa?.nome_fantasia,
        razao_social: state.empresa?.razao_social,
        cnpj: null,
      },
      {
        nome_completo: state.colaborador?.nome_completo,
        cargo_funcao: state.colaborador?.cargo_funcao,
        cpf: null,
      }
    )
  );

  const summary = document.createElement("section");
  summary.className = "print-summary-grid";
  [
    ["Jornadas", String(history.resumo.dias_encontrados)],
    ["Completas", String(history.resumo.dias_completos)],
    ["Incompletas", String(history.resumo.dias_incompletos)],
    ["Total trabalhado", formatarDuracao(history.resumo.total_minutos)],
  ].forEach(([label, value]) => {
    summary.appendChild(criarCampoImpressao(label, value));
  });
  elements.printDocumentBody.appendChild(summary);

  const tableSection = document.createElement("section");
  tableSection.className = "print-section";
  const heading = document.createElement("h2");
  heading.textContent = "Jornadas do período";
  tableSection.appendChild(heading);

  tableSection.appendChild(
    criarTabelaImpressao(
      ["Data", "Entrada", "Saída almoço", "Retorno", "Saída final", "Total", "Situação", "Assinatura"],
      history.dias.map((day) => [
        formatarDataBrasileira(day.data_referencia),
        day.entrada || "—",
        day.saida_almoco || "—",
        day.retorno_almoco || "—",
        day.saida_final || "—",
        day.total_minutos === null ? "—" : formatarDuracao(day.total_minutos),
        day.status_dia === "completo" ? "Completa" : "Incompleta",
        day.mes_assinado ? "Assinada" : "Pendente",
      ])
    )
  );
  elements.printDocumentBody.appendChild(tableSection);
}

function criarBlocoIdentificacaoImpressao(company, employee) {
  const section = document.createElement("section");
  section.className = "print-identification-grid";

  const companyBlock = document.createElement("div");
  const companyLabel = document.createElement("span");
  const companyName = document.createElement("strong");
  const companyInfo = document.createElement("small");
  companyLabel.textContent = "Empresa";
  companyName.textContent =
    company?.nome_fantasia || company?.razao_social || "—";
  companyInfo.textContent = company?.cnpj
    ? `CNPJ ${formatarCnpj(company.cnpj)}`
    : company?.razao_social || "";
  companyBlock.append(companyLabel, companyName, companyInfo);

  const employeeBlock = document.createElement("div");
  const employeeLabel = document.createElement("span");
  const employeeName = document.createElement("strong");
  const employeeInfo = document.createElement("small");
  employeeLabel.textContent = "Colaborador";
  employeeName.textContent = employee?.nome_completo || "—";
  employeeInfo.textContent = [
    employee?.cargo_funcao,
    employee?.cpf ? `CPF ${mascararCpf(employee.cpf)}` : null,
  ].filter(Boolean).join(" • ");
  employeeBlock.append(employeeLabel, employeeName, employeeInfo);

  section.append(companyBlock, employeeBlock);
  return section;
}

function criarCampoImpressao(label, value) {
  const wrapper = document.createElement("div");
  const span = document.createElement("span");
  const strong = document.createElement("strong");
  span.textContent = label;
  strong.textContent = value;
  wrapper.append(span, strong);
  return wrapper;
}

function criarTabelaImpressao(headers, rows) {
  const wrapper = document.createElement("div");
  wrapper.className = "print-table-wrapper";
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    row.forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.append(thead, tbody);
  wrapper.appendChild(table);
  return wrapper;
}

function executarImpressaoDocumento() {
  elements.printDocument.hidden = false;
  elements.printDocument.setAttribute("aria-hidden", "false");
  state.historyPrintPrepared = true;

  window.setTimeout(() => {
    window.print();
  }, 120);
}

function limparDocumentoImpressao() {
  if (!elements.printDocument) return;
  elements.printDocument.hidden = true;
  elements.printDocument.setAttribute("aria-hidden", "true");
  elements.printDocumentBody?.replaceChildren();
  state.historyPrintPrepared = false;
}

function obterFiltrosHistorico() {
  return {
    startDate: elements.historyStartDate.value,
    endDate: elements.historyEndDate.value,
    status: elements.historyStatusFilter.value || "todos",
    signature: elements.historySignatureFilter.value || "todos",
    page: state.historyPage,
    pageSize: Number(elements.historyPageSize.value || 10),
  };
}

function validarFiltrosHistorico(filters) {
  if (!filters.startDate || !filters.endDate) {
    return "Informe as datas inicial e final.";
  }

  const start = criarDataLocalDeIso(filters.startDate);
  const end = criarDataLocalDeIso(filters.endDate);
  const today = criarDataLocalDeIso(obterDataReferenciaAtual());

  if (!start || !end) {
    return "O período informado é inválido.";
  }

  if (start > end) {
    return "A data inicial não pode ser maior que a data final.";
  }

  const difference = Math.round((end - start) / 86400000);
  if (difference > 365) {
    return "Consulte no máximo 366 dias por vez.";
  }

  if (end > today) {
    return "A data final não pode estar no futuro.";
  }

  return "";
}

function definirPeriodoHistoricoMesAtual() {
  const parts = obterPartesDataNoFuso();
  elements.historyStartDate.value = `${parts.year}-${parts.month}-01`;
  elements.historyEndDate.value = obterDataReferenciaAtual();
  elements.historyStatusFilter.value = "todos";
  elements.historySignatureFilter.value = "todos";
}

function definirPeriodoHistoricoUltimosDias(days) {
  const today = criarDataLocalDeIso(obterDataReferenciaAtual());
  const start = new Date(today);
  start.setDate(start.getDate() - Math.max(0, days - 1));
  elements.historyStartDate.value = formatarDataISO(start);
  elements.historyEndDate.value = formatarDataISO(today);
  elements.historyStatusFilter.value = "todos";
  elements.historySignatureFilter.value = "todos";
}

function criarDataLocalDeIso(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function criarChaveCacheHistorico(filters) {
  return [
    filters.startDate,
    filters.endDate,
    filters.status,
    filters.signature,
    filters.page,
    filters.pageSize,
  ].join("|");
}

function invalidarCacheHistorico() {
  state.historyData = null;
  state.historyCache.clear();
  state.historyReceiptCache.clear();
}

function definirEstadoHistorico(type, message = "") {
  elements.historyLoading.hidden = type !== "loading";
  elements.historyError.hidden = type !== "error";
  elements.historyContent.hidden = type !== "content";

  if (type === "error") {
    elements.historyErrorText.textContent =
      message || "Tente novamente em alguns instantes.";
  }
}

function definirControlesHistoricoCarregando(loading) {
  [
    elements.historyApplyButton,
    elements.historyCurrentMonthButton,
    elements.historyLast30DaysButton,
    elements.historyRefreshButton,
    elements.historyPreviousPageButton,
    elements.historyNextPageButton,
    elements.historyPageSize,
    elements.historyStartDate,
    elements.historyEndDate,
    elements.historyStatusFilter,
    elements.historySignatureFilter,
  ].forEach((element) => {
    if (element) element.disabled = loading;
  });

  elements.historyApplyButton.textContent = loading
    ? "Consultando..."
    : "Aplicar filtros";
}

function traduzirErroHistorico(error) {
  const message = String(error?.message || "");
  const normalized = message.toLowerCase();

  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("network") ||
    normalized.includes("load failed")
  ) {
    return "A conexão com o Supabase foi interrompida. Verifique a internet.";
  }

  if (
    normalized.includes("permission") ||
    normalized.includes("row-level security") ||
    normalized.includes("403")
  ) {
    return "O acesso ao histórico foi bloqueado pelas permissões do Supabase.";
  }

  return message || "Não foi possível consultar o histórico.";
}

function formatarLocalizacaoRegistro(record) {
  const latitude = Number(record.latitude);
  const longitude = Number(record.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return "Não informada";
  }

  const accuracy = Number(record.precisao_metros);
  return (
    `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` +
    (Number.isFinite(accuracy) ? ` • ± ${Math.round(accuracy)} m` : "")
  );
}

function formatarAreaRegistro(record) {
  const distance = Number(record.distancia_empresa_metros);

  if (record.dentro_area_permitida === true) {
    return Number.isFinite(distance)
      ? `Dentro da área • ${Math.round(distance)} m`
      : "Dentro da área permitida";
  }

  if (record.dentro_area_permitida === false) {
    return Number.isFinite(distance)
      ? `Fora da área • ${Math.round(distance)} m`
      : "Fora da área permitida";
  }

  return "Sem regra de distância";
}

function formatarOrigemRegistro(origin) {
  const map = {
    web: "Registro pelo sistema",
    ajuste_administrativo: "Ajuste administrativo",
    importacao: "Importação",
  };
  return map[origin] || origin || "—";
}

function formatarCnpj(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length !== 14) return value || "—";
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}

function mascararCpf(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length !== 11) return "***.***.***-**";
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
}



/* ==========================================================
   ETAPA 8 - ASSINATURA MENSAL
   ========================================================== */

async function carregarPreviaAssinatura({
  force = false,
  showToast = false,
} = {}) {
  if (
    !state.supabase ||
    !state.colaborador ||
    state.signatureLoading ||
    state.signatureSigning
  ) {
    return;
  }

  const month = normalizarMesInput(
    elements.signatureMonthInput.value || obterMesAtualInput()
  );

  elements.signatureMonthInput.value = month;
  state.signatureMonth = month;

  if (!force && state.signatureCache.has(month)) {
    const cached = state.signatureCache.get(month);
    state.signaturePreview = cached;
    renderizarPreviaAssinatura(cached);
    return;
  }

  state.signatureLoading = true;
  definirEstadoAssinatura("loading");
  definirControlesAssinaturaCarregando(true);
  limparMensagemFormularioAssinatura();

  try {
    const competencia = `${month}-01`;

    let { data, error } = await state.supabase.rpc(
      "obter_previa_assinatura",
      {
        p_competencia: competencia,
      }
    );

    if (
      error &&
      funcaoRpcNaoEncontrada(error, "obter_previa_assinatura")
    ) {
      data = await carregarPreviaAssinaturaFallback(month);
      error = null;
    }

    if (error) {
      throw error;
    }

    const normalized = normalizarPreviaAssinatura(data, month);

    state.signaturePreview = normalized;
    state.signatureCache.set(month, normalized);
    renderizarPreviaAssinatura(normalized);

    if (showToast) {
      mostrarToast("Competência atualizada.", "success");
    }
  } catch (error) {
    console.error("Erro ao carregar prévia da assinatura:", error);
    definirEstadoAssinatura(
      "error",
      traduzirErroAssinatura(error)
    );
  } finally {
    state.signatureLoading = false;
    definirControlesAssinaturaCarregando(false);
  }
}

async function carregarPreviaAssinaturaFallback(month) {
  const competencia = `${month}-01`;
  const proximoMes = obterPrimeiroDiaMesSeguinte(competencia);

  const [daysResult, signatureResult] = await Promise.all([
    state.supabase
      .from("vw_ponto_diario")
      .select(
        "data_referencia, entrada, saida_almoco, retorno_almoco, saida_final, quantidade_marcacoes, total_minutos, status_dia"
      )
      .eq("colaborador_id", state.colaborador.id)
      .gte("data_referencia", competencia)
      .lt("data_referencia", proximoMes)
      .order("data_referencia", { ascending: true })
      .limit(31),

    state.supabase
      .from("assinaturas_ponto")
      .select(
        "id, competencia, versao, assinada_em, quantidade_registros, resumo_registros_hash, hash_confirmacao, metodo_confirmacao, ativa"
      )
      .eq("colaborador_id", state.colaborador.id)
      .eq("competencia", competencia)
      .eq("ativa", true)
      .maybeSingle(),
  ]);

  if (daysResult.error) throw daysResult.error;
  if (signatureResult.error) throw signatureResult.error;

  const days = (daysResult.data || []).map((day) => ({
    data_referencia: day.data_referencia,
    entrada: extrairHoraDeData(day.entrada),
    saida_almoco: extrairHoraDeData(day.saida_almoco),
    retorno_almoco: extrairHoraDeData(day.retorno_almoco),
    saida_final: extrairHoraDeData(day.saida_final),
    quantidade_marcacoes: Number(day.quantidade_marcacoes || 0),
    total_minutos:
      day.total_minutos === null
        ? null
        : Number(day.total_minutos),
    status_dia: day.status_dia || "incompleto",
  }));

  const complete = days.filter(
    (day) => day.status_dia === "completo"
  );

  const totalMinutes = complete.reduce(
    (sum, day) => sum + Number(day.total_minutos || 0),
    0
  );

  const recordCount = days.reduce(
    (sum, day) => sum + Number(day.quantidade_marcacoes || 0),
    0
  );

  const currentMonth = month === obterMesAtualInput();

  return {
    competencia,
    gerado_em: new Date().toISOString(),
    mes_atual: currentMonth,
    mes_futuro: month > obterMesAtualInput(),
    resumo: {
      dias_com_registro: days.length,
      dias_completos: complete.length,
      dias_incompletos: days.length - complete.length,
      total_minutos: totalMinutes,
      quantidade_registros: recordCount,
      primeira_marcacao: null,
      ultima_marcacao: null,
      resumo_registros_hash_atual: null,
    },
    assinatura: signatureResult.data || null,
    dias: days,
    modo_fallback: true,
  };
}

function normalizarPreviaAssinatura(data, month) {
  const payload = data && typeof data === "object" ? data : {};
  const summary = payload.resumo || {};
  const signature = payload.assinatura || null;

  return {
    competencia: payload.competencia || `${month}-01`,
    gerado_em: payload.gerado_em || new Date().toISOString(),
    mes_atual: Boolean(payload.mes_atual),
    mes_futuro: Boolean(payload.mes_futuro),
    resumo: {
      dias_com_registro: Number(summary.dias_com_registro || 0),
      dias_completos: Number(summary.dias_completos || 0),
      dias_incompletos: Number(summary.dias_incompletos || 0),
      total_minutos: Number(summary.total_minutos || 0),
      quantidade_registros: Number(summary.quantidade_registros || 0),
      primeira_marcacao: summary.primeira_marcacao || null,
      ultima_marcacao: summary.ultima_marcacao || null,
      resumo_registros_hash_atual:
        summary.resumo_registros_hash_atual || null,
    },
    assinatura: signature
      ? {
          id: signature.id,
          competencia:
            signature.competencia || payload.competencia || `${month}-01`,
          versao: Number(signature.versao || 1),
          assinada_em: signature.assinada_em,
          quantidade_registros: Number(
            signature.quantidade_registros || 0
          ),
          resumo_registros_hash:
            signature.resumo_registros_hash || null,
          hash_confirmacao:
            signature.hash_confirmacao || null,
          metodo_confirmacao:
            signature.metodo_confirmacao || "senha",
          ativa: signature.ativa !== false,
        }
      : null,
    dias: Array.isArray(payload.dias)
      ? payload.dias.map((day) => ({
          data_referencia: day.data_referencia,
          entrada: day.entrada || null,
          saida_almoco: day.saida_almoco || null,
          retorno_almoco: day.retorno_almoco || null,
          saida_final: day.saida_final || null,
          quantidade_marcacoes: Number(
            day.quantidade_marcacoes || 0
          ),
          total_minutos:
            day.total_minutos === null ||
            day.total_minutos === undefined
              ? null
              : Number(day.total_minutos),
          status_dia: day.status_dia || "incompleto",
        }))
      : [],
    modo_fallback: Boolean(payload.modo_fallback),
  };
}

function renderizarPreviaAssinatura(preview) {
  const summary = preview.resumo;
  const signature = preview.assinatura;
  const hasRecords = summary.quantidade_registros > 0;

  elements.signaturePeriodLabel.textContent =
    formatarCompetencia(preview.competencia);
  elements.signatureMirrorTitle.textContent =
    `Jornadas de ${formatarCompetencia(preview.competencia)}`;

  elements.signatureSummaryDays.textContent =
    String(summary.dias_com_registro);
  elements.signatureSummaryComplete.textContent =
    String(summary.dias_completos);
  elements.signatureSummaryIncomplete.textContent =
    String(summary.dias_incompletos);
  elements.signatureSummaryHours.textContent =
    formatarDuracao(summary.total_minutos);
  elements.signatureSummaryRecords.textContent =
    String(summary.quantidade_registros);

  elements.signatureFirstRecord.textContent =
    summary.primeira_marcacao
      ? formatarDataHoraCurta(summary.primeira_marcacao)
      : "—";
  elements.signatureLastRecord.textContent =
    summary.ultima_marcacao
      ? formatarDataHoraCurta(summary.ultima_marcacao)
      : "—";

  renderizarDiasAssinatura(preview.dias);
  renderizarAvisosAssinatura(preview);

  elements.signatureExistingPanel.hidden = !signature;
  elements.signatureFormPanel.hidden =
    Boolean(signature) || !hasRecords || preview.mes_futuro;

  if (signature) {
    definirSituacaoCompetencia(
      "signed",
      "Competência assinada",
      "Esta competência possui uma assinatura ativa vinculada aos registros apresentados.",
      "Assinada"
    );
    renderizarAssinaturaExistente(signature, preview);
  } else if (preview.mes_futuro) {
    definirSituacaoCompetencia(
      "blocked",
      "Competência futura",
      "Não é permitido assinar uma competência que ainda não começou.",
      "Indisponível"
    );
  } else if (!hasRecords) {
    definirSituacaoCompetencia(
      "empty",
      "Sem registros de ponto",
      "Registre ao menos uma marcação antes de assinar esta competência.",
      "Sem registros"
    );
  } else {
    definirSituacaoCompetencia(
      "available",
      "Disponível para assinatura",
      "Confira todas as jornadas e confirme sua senha para concluir.",
      "Disponível"
    );
  }

  resetarFormularioAssinatura();
  definirEstadoAssinatura("content");
}

function renderizarDiasAssinatura(days) {
  elements.signatureDaysBody.replaceChildren();

  if (!days.length) {
    elements.signatureEmptyDays.hidden = false;
    elements.signatureDaysBody.closest("table").hidden = true;
    return;
  }

  elements.signatureEmptyDays.hidden = true;
  elements.signatureDaysBody.closest("table").hidden = false;

  days.forEach((day) => {
    const row = document.createElement("tr");

    const cells = [
      formatarDataBrasileira(day.data_referencia),
      day.entrada || "—",
      day.saida_almoco || "—",
      day.retorno_almoco || "—",
      day.saida_final || "—",
      day.total_minutos === null
        ? "—"
        : formatarDuracao(day.total_minutos),
    ];

    cells.forEach((value, index) => {
      const cell = document.createElement("td");
      cell.textContent = value;

      if (index > 0) {
        cell.classList.add("mono-text");
      }

      row.appendChild(cell);
    });

    const statusCell = document.createElement("td");
    const status = document.createElement("span");
    const complete = day.status_dia === "completo";

    status.className =
      `signature-day-status ${complete ? "is-complete" : "is-incomplete"}`;
    status.textContent = complete ? "Completa" : "Incompleta";
    statusCell.appendChild(status);
    row.appendChild(statusCell);

    elements.signatureDaysBody.appendChild(row);
  });
}

function renderizarAvisosAssinatura(preview) {
  elements.signatureWarnings.replaceChildren();

  const alerts = [];

  if (preview.resumo.dias_incompletos > 0) {
    alerts.push({
      type: "warning",
      text:
        `${preview.resumo.dias_incompletos} ` +
        `${preview.resumo.dias_incompletos === 1 ? "jornada está incompleta" : "jornadas estão incompletas"}.`,
    });
  }

  if (preview.mes_atual) {
    alerts.push({
      type: "warning",
      text:
        "A competência selecionada ainda está em andamento. Novas marcações não farão parte desta versão da assinatura.",
    });
  }

  if (preview.modo_fallback) {
    alerts.push({
      type: "info",
      text:
        "A tela está em modo de compatibilidade. Execute o SQL da Etapa 8 para usar a prévia otimizada e o hash atual.",
    });
  }

  if (!alerts.length) {
    alerts.push({
      type: "success",
      text:
        "Todas as jornadas registradas estão completas e prontas para confirmação.",
    });
  }

  alerts.forEach((alert) => {
    const item = document.createElement("div");
    item.className = `signature-warning signature-warning-${alert.type}`;

    const icon = document.createElement("i");
    icon.setAttribute("aria-hidden", "true");

    const text = document.createElement("span");
    text.textContent = alert.text;

    item.append(icon, text);
    elements.signatureWarnings.appendChild(item);
  });

  elements.signatureIncompleteCheckRow.hidden =
    preview.resumo.dias_incompletos === 0;
  elements.signatureOpenMonthCheckRow.hidden =
    !preview.mes_atual;
}

function renderizarAssinaturaExistente(signature, preview) {
  elements.signatureExistingDate.textContent =
    formatarDataHoraCurta(signature.assinada_em);
  elements.signatureExistingVersion.textContent =
    `Versão ${signature.versao}`;
  elements.signatureExistingRecords.textContent =
    String(signature.quantidade_registros);
  elements.signatureExistingMethod.textContent =
    signature.metodo_confirmacao === "senha"
      ? "Senha confirmada"
      : signature.metodo_confirmacao;

  elements.signatureExistingHash.textContent =
    signature.hash_confirmacao || "—";
  elements.signatureExistingSummaryHash.textContent =
    signature.resumo_registros_hash || "—";

  elements.signatureCopyHashButton.disabled =
    !signature.hash_confirmacao;
  elements.signatureCopySummaryHashButton.disabled =
    !signature.resumo_registros_hash;
  elements.signaturePrintCertificateButton.disabled = false;

  if (
    preview.resumo.resumo_registros_hash_atual &&
    signature.resumo_registros_hash &&
    preview.resumo.resumo_registros_hash_atual !==
      signature.resumo_registros_hash
  ) {
    elements.signatureStatusDescription.textContent =
      "A competência possui assinatura ativa, mas o conjunto atual de registros difere do resumo assinado. Procure a Administração.";
    elements.signatureStatusCard.classList.add("has-warning");
  }
}

function definirSituacaoCompetencia(type, title, description, badge) {
  elements.signatureStatusCard.className = "signature-status-card";
  elements.signatureStatusCard.classList.add(`signature-status-${type}`);
  elements.signatureStatusTitle.textContent = title;
  elements.signatureStatusDescription.textContent = description;

  const config = {
    signed: { icon: "✓", badgeType: "ready" },
    available: { icon: "✎", badgeType: "ready" },
    blocked: { icon: "×", badgeType: "error" },
    empty: { icon: "▤", badgeType: "pending" },
  }[type] || { icon: "✓", badgeType: "pending" };

  elements.signatureStatusIcon.textContent = config.icon;
  definirBadge(
    elements.signatureStatusBadge,
    config.badgeType,
    badge
  );
}

function resetarFormularioAssinatura() {
  elements.signatureReviewCheck.checked = false;
  elements.signatureIncompleteCheck.checked = false;
  elements.signatureOpenMonthCheck.checked = false;
  elements.signaturePassword.value = "";
  elements.signaturePassword.type = "password";
  elements.signatureTogglePasswordButton.textContent = "Mostrar";
  elements.signatureTogglePasswordButton.setAttribute(
    "aria-pressed",
    "false"
  );
  elements.signatureTogglePasswordButton.setAttribute(
    "aria-label",
    "Mostrar senha"
  );
  limparMensagemFormularioAssinatura();
  atualizarDisponibilidadeAssinatura();
}

function atualizarDisponibilidadeAssinatura() {
  const preview = state.signaturePreview;

  if (
    !preview ||
    preview.assinatura ||
    preview.mes_futuro ||
    preview.resumo.quantidade_registros === 0 ||
    state.signatureSigning
  ) {
    elements.signatureSubmitButton.disabled = true;
    return;
  }

  const reviewConfirmed =
    elements.signatureReviewCheck.checked;
  const incompleteConfirmed =
    preview.resumo.dias_incompletos === 0 ||
    elements.signatureIncompleteCheck.checked;
  const openMonthConfirmed =
    !preview.mes_atual ||
    elements.signatureOpenMonthCheck.checked;
  const passwordReady =
    elements.signaturePassword.value.length >= 6;

  elements.signatureSubmitButton.disabled =
    !(
      reviewConfirmed &&
      incompleteConfirmed &&
      openMonthConfirmed &&
      passwordReady
    );
}

function alternarSenhaAssinatura() {
  const showing = elements.signaturePassword.type === "text";
  elements.signaturePassword.type =
    showing ? "password" : "text";
  elements.signatureTogglePasswordButton.textContent =
    showing ? "Mostrar" : "Ocultar";
  elements.signatureTogglePasswordButton.setAttribute(
    "aria-pressed",
    String(!showing)
  );
  elements.signatureTogglePasswordButton.setAttribute(
    "aria-label",
    showing ? "Mostrar senha" : "Ocultar senha"
  );
  elements.signaturePassword.focus();
}

async function assinarCompetencia(event) {
  event.preventDefault();

  if (state.signatureSigning) {
    return;
  }

  const preview = state.signaturePreview;
  const validation = validarFormularioAssinatura(preview);

  if (validation) {
    mostrarMensagemFormularioAssinatura(validation, "error");
    return;
  }

  const email = state.authUser?.email;
  const password = elements.signaturePassword.value;

  if (!email) {
    mostrarMensagemFormularioAssinatura(
      "O e-mail do usuário autenticado não foi encontrado.",
      "error"
    );
    return;
  }

  state.signatureSigning = true;
  definirInterfaceAssinaturaSalvando(true);
  mostrarMensagemFormularioAssinatura(
    "Confirmando sua senha com o Supabase Auth...",
    "info"
  );

  try {
    const { data: authData, error: authError } =
      await state.supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      const authenticationError = new Error(authError.message);
      authenticationError.stage = "auth";
      throw authenticationError;
    }

    if (!authData?.session) {
      throw new Error(
        "O Supabase não retornou uma sessão recente."
      );
    }

    state.session = authData.session;
    state.authUser = authData.user || state.authUser;

    mostrarMensagemFormularioAssinatura(
      "Senha confirmada. Gerando a assinatura e o hash no servidor...",
      "info"
    );

    const { data, error } = await state.supabase.rpc(
      "assinar_ponto",
      {
        p_competencia: preview.competencia,
        p_ip_assinatura: null,
        p_user_agent: `MedPlusPonto/${APP_VERSION}`,
      }
    );

    if (error) {
      throw error;
    }

    const signature = Array.isArray(data)
      ? data[0]
      : data;

    if (!signature?.id || !signature?.hash_confirmacao) {
      throw new Error(
        "O servidor não retornou o comprovante completo da assinatura."
      );
    }

    elements.signaturePassword.value = "";
    invalidarCacheAssinatura();
    invalidarCacheInformacoesGerais();
    invalidarCacheHistorico();

    // Permite que a própria rotina de carregamento atualize imediatamente
    // o certificado após a gravação bem-sucedida.
    state.signatureSigning = false;

    await carregarPreviaAssinatura({
      force: true,
    });

    mostrarToast(
      `${formatarCompetencia(preview.competencia)} assinada com sucesso.`,
      "success"
    );

    elements.signatureExistingPanel.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  } catch (error) {
    console.error("Erro ao assinar competência:", error);
    elements.signaturePassword.value = "";
    mostrarMensagemFormularioAssinatura(
      traduzirErroAssinatura(error),
      "error"
    );
    atualizarDisponibilidadeAssinatura();
  } finally {
    state.signatureSigning = false;
    definirInterfaceAssinaturaSalvando(false);
    atualizarDisponibilidadeAssinatura();
  }
}

function validarFormularioAssinatura(preview) {
  if (!preview) {
    return "Carregue uma competência antes de assinar.";
  }

  if (preview.assinatura) {
    return "Esta competência já possui uma assinatura ativa.";
  }

  if (preview.mes_futuro) {
    return "Não é permitido assinar uma competência futura.";
  }

  if (preview.resumo.quantidade_registros === 0) {
    return "Não existem registros nesta competência.";
  }

  if (!elements.signatureReviewCheck.checked) {
    return "Confirme que você conferiu o espelho de ponto.";
  }

  if (
    preview.resumo.dias_incompletos > 0 &&
    !elements.signatureIncompleteCheck.checked
  ) {
    return "Confirme que está ciente das jornadas incompletas.";
  }

  if (
    preview.mes_atual &&
    !elements.signatureOpenMonthCheck.checked
  ) {
    return "Confirme que está ciente de que o mês ainda está em andamento.";
  }

  if (elements.signaturePassword.value.length < 6) {
    return "Informe sua senha atual com pelo menos 6 caracteres.";
  }

  return "";
}

function definirInterfaceAssinaturaSalvando(saving) {
  [
    elements.signatureMonthInput,
    elements.signatureCurrentMonthButton,
    elements.signatureRefreshButton,
    elements.signatureReviewCheck,
    elements.signatureIncompleteCheck,
    elements.signatureOpenMonthCheck,
    elements.signaturePassword,
    elements.signatureTogglePasswordButton,
    elements.signatureOpenHistoryButton,
  ].forEach((element) => {
    if (element) element.disabled = saving;
  });

  elements.signatureSubmitButton.disabled = saving;
  elements.signatureSubmitButton.classList.toggle(
    "is-loading",
    saving
  );
  elements.signatureSubmitButton.setAttribute(
    "aria-busy",
    String(saving)
  );

  const label =
    elements.signatureSubmitButton.querySelector(".button-label");
  label.textContent = saving
    ? "Assinando..."
    : "Assinar competência";
}

function mostrarMensagemFormularioAssinatura(
  message,
  type = "info"
) {
  elements.signatureFormMessage.textContent = message;
  elements.signatureFormMessage.className =
    `point-save-message ${type}`;
  elements.signatureFormMessage.hidden = false;
}

function limparMensagemFormularioAssinatura() {
  elements.signatureFormMessage.textContent = "";
  elements.signatureFormMessage.className =
    "point-save-message";
  elements.signatureFormMessage.hidden = true;
}

function invalidarCacheAssinatura() {
  state.signaturePreview = null;
  state.signatureCache.clear();
}

function definirEstadoAssinatura(type, message = "") {
  elements.signatureLoading.hidden = type !== "loading";
  elements.signatureError.hidden = type !== "error";
  elements.signatureContent.hidden = type !== "content";

  if (type === "error") {
    elements.signatureErrorText.textContent =
      message || "Tente novamente em alguns instantes.";
  }
}

function definirControlesAssinaturaCarregando(loading) {
  [
    elements.signatureMonthInput,
    elements.signatureCurrentMonthButton,
    elements.signatureRefreshButton,
  ].forEach((element) => {
    if (element) element.disabled = loading;
  });

  elements.signatureRefreshButton.textContent =
    loading ? "Consultando..." : "Atualizar";
}

function traduzirErroAssinatura(error) {
  const message = String(error?.message || "");
  const normalized = message.toLowerCase();

  if (
    error?.stage === "auth" ||
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid credentials")
  ) {
    return "Senha incorreta. Confira e tente novamente.";
  }

  if (
    normalized.includes("já possui uma assinatura ativa")
  ) {
    return "Esta competência já possui uma assinatura ativa.";
  }

  if (
    normalized.includes("não existem registros")
  ) {
    return "Não existem registros de ponto para esta competência.";
  }

  if (
    normalized.includes("confirme sua senha novamente") ||
    normalized.includes("autenticação recente")
  ) {
    return "A autenticação recente não foi reconhecida. Confirme sua senha novamente.";
  }

  if (
    normalized.includes("mês futuro") ||
    normalized.includes("competência futura")
  ) {
    return "Não é permitido assinar uma competência futura.";
  }

  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("network") ||
    normalized.includes("load failed")
  ) {
    return "A conexão com o Supabase foi interrompida. Verifique a internet e tente novamente.";
  }

  if (
    normalized.includes("permission") ||
    normalized.includes("row-level security") ||
    normalized.includes("403")
  ) {
    return "O acesso à assinatura foi bloqueado pelas permissões do Supabase.";
  }

  return message || "Não foi possível concluir a assinatura.";
}

async function copiarTextoAssinatura(text, successMessage) {
  const value = String(text || "").trim();

  if (!value || value === "—") {
    mostrarToast("Não há conteúdo disponível para copiar.", "error");
    return;
  }

  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
    } else {
      const input = document.createElement("textarea");
      input.value = value;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }

    mostrarToast(successMessage, "success");
  } catch {
    mostrarToast("Não foi possível copiar o conteúdo.", "error");
  }
}

function abrirCompetenciaNoHistorico() {
  const preview = state.signaturePreview;

  if (!preview) {
    return;
  }

  const start = preview.competencia;
  const nextMonth = obterPrimeiroDiaMesSeguinte(start);
  const nextDate = criarDataLocalDeIso(nextMonth);
  nextDate.setDate(nextDate.getDate() - 1);

  elements.historyStartDate.value = start;
  elements.historyEndDate.value = formatarDataISO(nextDate);
  elements.historyStatusFilter.value = "todos";
  elements.historySignatureFilter.value = "todos";
  state.historyPage = 1;

  abrirTela("meu-historico");
  carregarHistoricoPonto({ force: true }).catch((error) => {
    console.error("Erro ao abrir competência no histórico:", error);
  });
}

function imprimirCertificadoAssinatura() {
  const preview = state.signaturePreview;
  const signature = preview?.assinatura;

  if (!preview || !signature) {
    mostrarToast(
      "Nenhuma assinatura ativa está disponível para impressão.",
      "error"
    );
    return;
  }

  prepararDocumentoCertificadoAssinatura(preview);
  executarImpressaoDocumento();
}

function prepararDocumentoCertificadoAssinatura(preview) {
  const signature = preview.assinatura;

  elements.printDocumentTitle.textContent =
    "Certificado de Assinatura do Ponto";
  elements.printDocumentSubtitle.textContent =
    formatarCompetencia(preview.competencia);
  elements.printDocumentGeneratedAt.textContent =
    `Documento gerado em ${formatarDataHoraCurta(new Date().toISOString())}.`;
  elements.printDocumentBody.replaceChildren();

  elements.printDocumentBody.appendChild(
    criarBlocoIdentificacaoImpressao(
      {
        nome_fantasia: state.empresa?.nome_fantasia,
        razao_social: state.empresa?.razao_social,
        cnpj: null,
      },
      {
        nome_completo: state.colaborador?.nome_completo,
        cargo_funcao: state.colaborador?.cargo_funcao,
        cpf: null,
      }
    )
  );

  const summary = document.createElement("section");
  summary.className = "print-summary-grid";

  [
    ["Competência", formatarCompetencia(preview.competencia)],
    ["Assinada em", formatarDataHoraCurta(signature.assinada_em)],
    ["Versão", String(signature.versao)],
    ["Marcações confirmadas", String(signature.quantidade_registros)],
    ["Dias completos", String(preview.resumo.dias_completos)],
    ["Dias incompletos", String(preview.resumo.dias_incompletos)],
    ["Total trabalhado", formatarDuracao(preview.resumo.total_minutos)],
    ["Método", "Confirmação da senha"],
  ].forEach(([label, value]) => {
    summary.appendChild(criarCampoImpressao(label, value));
  });

  elements.printDocumentBody.appendChild(summary);

  const tableSection = document.createElement("section");
  tableSection.className = "print-section";
  const heading = document.createElement("h2");
  heading.textContent = "Espelho confirmado";
  tableSection.appendChild(heading);

  tableSection.appendChild(
    criarTabelaImpressao(
      [
        "Data",
        "Entrada",
        "Saída almoço",
        "Retorno",
        "Saída final",
        "Total",
        "Situação",
      ],
      preview.dias.map((day) => [
        formatarDataBrasileira(day.data_referencia),
        day.entrada || "—",
        day.saida_almoco || "—",
        day.retorno_almoco || "—",
        day.saida_final || "—",
        day.total_minutos === null
          ? "—"
          : formatarDuracao(day.total_minutos),
        day.status_dia === "completo"
          ? "Completa"
          : "Incompleta",
      ])
    )
  );

  elements.printDocumentBody.appendChild(tableSection);

  const hashes = document.createElement("section");
  hashes.className = "print-section print-signature-hashes";

  const hashesHeading = document.createElement("h2");
  hashesHeading.textContent = "Integridade da assinatura";
  hashes.appendChild(hashesHeading);

  [
    ["Hash da confirmação", signature.hash_confirmacao],
    ["Resumo dos registros", signature.resumo_registros_hash],
  ].forEach(([label, value]) => {
    const block = document.createElement("div");
    const title = document.createElement("strong");
    const code = document.createElement("code");

    title.textContent = label;
    code.textContent = value || "—";
    block.append(title, code);
    hashes.appendChild(block);
  });

  elements.printDocumentBody.appendChild(hashes);

  const note = document.createElement("section");
  note.className = "print-integrity-note";
  note.textContent =
    "Esta assinatura foi criada após confirmação da senha do usuário. " +
    "O hash vincula a confirmação ao conjunto de registros válidos existentes " +
    "na competência no momento da assinatura.";
  elements.printDocumentBody.appendChild(note);
}



/* ==========================================================
   ETAPA 9 - ADMINISTRAÇÃO
   ========================================================== */

async function carregarPainelAdministrativo({ force = false, showToast = false } = {}) {
  if (!state.supabase || state.colaborador?.perfil !== "administrador" || state.adminLoading) return;

  if (!force && state.adminData) {
    renderizarPainelAdministrativo(state.adminData);
    return;
  }

  state.adminLoading = true;
  definirEstadoAdministracao("loading");
  elements.adminRefreshButton.disabled = true;

  try {
    const { data, error } = await state.supabase.rpc("obter_painel_administrativo");
    if (error) throw error;

    state.adminData = normalizarPainelAdministrativo(data);
    renderizarPainelAdministrativo(state.adminData);

    if (showToast) mostrarToast("Painel administrativo atualizado.", "success");
  } catch (error) {
    console.error("Erro ao carregar Administração:", error);
    definirEstadoAdministracao("error", traduzirErroAdministracao(error));
  } finally {
    state.adminLoading = false;
    elements.adminRefreshButton.disabled = false;
  }
}

function normalizarPainelAdministrativo(data) {
  const payload = data && typeof data === "object" ? data : {};
  const metrics = payload.metricas || {};

  return {
    gerado_em: payload.gerado_em || new Date().toISOString(),
    administrador_global: Boolean(payload.administrador_global),
    empresa: payload.empresa || {},
    configuracao: payload.configuracao || {},
    metricas: {
      colaboradores_ativos: Number(metrics.colaboradores_ativos || 0),
      colaboradores_inativos: Number(metrics.colaboradores_inativos || 0),
      registros_mes: Number(metrics.registros_mes || 0),
      jornadas_incompletas_mes: Number(metrics.jornadas_incompletas_mes || 0),
      assinaturas_pendentes_mes: Number(metrics.assinaturas_pendentes_mes || 0),
      assinaturas_ativas_mes: Number(metrics.assinaturas_ativas_mes || 0),
      fotos_quantidade: Number(metrics.fotos_quantidade || 0),
      fotos_bytes: Number(metrics.fotos_bytes || 0),
      database_bytes: Number(metrics.database_bytes || 0),
    },
    colaboradores: Array.isArray(payload.colaboradores) ? payload.colaboradores : [],
    assinaturas: Array.isArray(payload.assinaturas) ? payload.assinaturas : [],
  };
}

function renderizarPainelAdministrativo(data) {
  renderizarMetricasAdministrativas(data);
  renderizarResumoEmpresaAdmin(data);
  preencherFormularioEmpresaAdmin(data);
  renderizarColaboradoresAdmin();
  renderizarAssinaturasAdmin();
  renderizarAssinaturasRecentesAdmin();
  abrirAbaAdministrativa(state.adminActiveTab);
  definirEstadoAdministracao("content");
}

function renderizarMetricasAdministrativas(data) {
  const m = data.metricas;

  elements.adminMetricActiveEmployees.textContent = String(m.colaboradores_ativos);
  elements.adminMetricEmployeeHelp.textContent = `${m.colaboradores_inativos} ${m.colaboradores_inativos === 1 ? "inativo" : "inativos"}`;
  elements.adminMetricMonthRecords.textContent = String(m.registros_mes);
  elements.adminMetricIncompleteDays.textContent = String(m.jornadas_incompletas_mes);
  elements.adminMetricPendingSignatures.textContent = String(m.assinaturas_pendentes_mes);
  elements.adminMetricSignatureHelp.textContent = `${m.assinaturas_ativas_mes} assinadas no mês`;
  elements.adminMetricPhotoStorage.textContent = formatarBytes(m.fotos_bytes);
  elements.adminMetricPhotoCount.textContent = `${m.fotos_quantidade} arquivos`;
  elements.adminMetricDatabaseSize.textContent = formatarBytes(m.database_bytes);

  elements.adminGeneratedAt.textContent = `Atualizado ${formatarDataHoraCurta(data.gerado_em)}`;
  elements.adminUsagePhotosLabel.textContent = formatarBytes(m.fotos_bytes);
  elements.adminUsageDatabaseLabel.textContent = formatarBytes(m.database_bytes);

  definirBarraUso(elements.adminUsagePhotosBar, m.fotos_bytes, 1024 * 1024 * 1024);
  definirBarraUso(elements.adminUsageDatabaseBar, m.database_bytes, 500 * 1024 * 1024);
}

function definirBarraUso(element, value, reference) {
  const percent = Math.min(100, Math.max(0, (Number(value || 0) / reference) * 100));
  element.style.width = `${percent.toFixed(2)}%`;
  element.classList.toggle("is-warning", percent >= 70);
  element.classList.toggle("is-danger", percent >= 90);
}

function renderizarResumoEmpresaAdmin(data) {
  const company = data.empresa;
  const config = data.configuracao;

  elements.adminOverviewCompanyName.textContent = company.nome_fantasia || "—";
  elements.adminOverviewLegalName.textContent = company.razao_social || "—";
  elements.adminOverviewCnpj.textContent = formatarCnpj(company.cnpj);
  elements.adminOverviewResponsible.textContent = company.responsavel || "—";
  elements.adminOverviewCity.textContent = [company.endereco_cidade, company.endereco_uf].filter(Boolean).join(" / ") || "—";
  elements.adminOverviewRadius.textContent = `${Number(config.raio_permitido_metros || 0)} m`;
  elements.adminOverviewDailyLoad.textContent = formatarDuracao(Number(config.carga_diaria_minutos || 0));
}

function preencherFormularioEmpresaAdmin(data) {
  const c = data.empresa;
  const cfg = data.configuracao;

  elements.adminCompanyLegalName.value = c.razao_social || "";
  elements.adminCompanyTradeName.value = c.nome_fantasia || "";
  elements.adminCompanyCnpj.value = formatarCnpjInput(c.cnpj);
  elements.adminCompanyResponsible.value = c.responsavel || "";
  elements.adminCompanyPhone.value = c.telefone || "";
  elements.adminCompanyEmail.value = c.email || "";
  elements.adminCompanyStreet.value = c.endereco_logradouro || "";
  elements.adminCompanyNumber.value = c.endereco_numero || "";
  elements.adminCompanyComplement.value = c.endereco_complemento || "";
  elements.adminCompanyDistrict.value = c.endereco_bairro || "";
  elements.adminCompanyCity.value = c.endereco_cidade || "";
  elements.adminCompanyState.value = c.endereco_uf || "";
  elements.adminCompanyZip.value = formatarCepInput(c.endereco_cep);

  elements.adminConfigTimezone.value = cfg.fuso_horario || "America/Sao_Paulo";
  elements.adminConfigDailyMinutes.value = Number(cfg.carga_diaria_minutos || 480);
  elements.adminConfigTolerance.value = Number(cfg.tolerancia_minutos || 10);
  elements.adminConfigRadius.value = Number(cfg.raio_permitido_metros || 500);
  elements.adminConfigLatitude.value = cfg.latitude_empresa ?? "";
  elements.adminConfigLongitude.value = cfg.longitude_empresa ?? "";
  elements.adminConfigRequireLocation.checked = cfg.exigir_geolocalizacao !== false;
  elements.adminConfigRequirePhoto.checked = cfg.exigir_foto !== false;
  elements.adminConfigBlockOutside.checked = Boolean(cfg.bloquear_fora_raio);
  elements.adminConfigSignatureReminder.checked = cfg.lembrar_assinatura_ultimo_dia_util !== false;
}

async function salvarEmpresaConfiguracoes(event) {
  event.preventDefault();
  if (state.adminSaving) return;

  const validation = validarFormularioEmpresaAdmin();
  if (validation) {
    mostrarMensagemAdmin(elements.adminCompanyMessage, validation, "error");
    return;
  }

  state.adminSaving = true;
  definirBotaoCarregando(elements.adminCompanySaveButton, true, "Salvando...");
  mostrarMensagemAdmin(elements.adminCompanyMessage, "Salvando empresa e regras...", "info");

  try {
    const company = {
      razao_social: elements.adminCompanyLegalName.value.trim(),
      nome_fantasia: elements.adminCompanyTradeName.value.trim(),
      cnpj: somenteDigitosAdmin(elements.adminCompanyCnpj.value),
      responsavel: valorOuNulo(elements.adminCompanyResponsible.value),
      telefone: valorOuNulo(elements.adminCompanyPhone.value),
      email: valorOuNulo(elements.adminCompanyEmail.value.toLowerCase()),
      endereco_logradouro: valorOuNulo(elements.adminCompanyStreet.value),
      endereco_numero: valorOuNulo(elements.adminCompanyNumber.value),
      endereco_complemento: valorOuNulo(elements.adminCompanyComplement.value),
      endereco_bairro: valorOuNulo(elements.adminCompanyDistrict.value),
      endereco_cidade: valorOuNulo(elements.adminCompanyCity.value),
      endereco_uf: valorOuNulo(elements.adminCompanyState.value.toUpperCase()),
      endereco_cep: valorOuNulo(somenteDigitosAdmin(elements.adminCompanyZip.value)),
    };

    const config = {
      fuso_horario: elements.adminConfigTimezone.value,
      carga_diaria_minutos: Number(elements.adminConfigDailyMinutes.value),
      tolerancia_minutos: Number(elements.adminConfigTolerance.value),
      raio_permitido_metros: Number(elements.adminConfigRadius.value),
      latitude_empresa: numeroOuNulo(elements.adminConfigLatitude.value),
      longitude_empresa: numeroOuNulo(elements.adminConfigLongitude.value),
      exigir_geolocalizacao: elements.adminConfigRequireLocation.checked,
      exigir_foto: elements.adminConfigRequirePhoto.checked,
      bloquear_fora_raio: elements.adminConfigBlockOutside.checked,
      lembrar_assinatura_ultimo_dia_util: elements.adminConfigSignatureReminder.checked,
    };

    const { data, error } = await state.supabase.rpc(
      "admin_atualizar_empresa_configuracoes",
      { p_empresa: company, p_configuracao: config }
    );
    if (error) throw error;

    state.adminData.empresa = data.empresa;
    state.adminData.configuracao = data.configuracao;
    state.empresa = { ...state.empresa, ...data.empresa };
    state.configuracao = { ...state.configuracao, ...data.configuracao };

    preencherDadosDoUsuario();
    renderizarResumoEmpresaAdmin(state.adminData);
    preencherFormularioEmpresaAdmin(state.adminData);
    invalidarCacheInformacoesGerais();
    invalidarCacheHistorico();
    invalidarCacheAssinatura();

    mostrarMensagemAdmin(elements.adminCompanyMessage, "Empresa e regras atualizadas.", "success");
    mostrarToast("Configurações salvas.", "success");
  } catch (error) {
    console.error("Erro ao salvar empresa:", error);
    mostrarMensagemAdmin(elements.adminCompanyMessage, traduzirErroAdministracao(error), "error");
  } finally {
    state.adminSaving = false;
    definirBotaoCarregando(elements.adminCompanySaveButton, false, "Salvar empresa e regras");
  }
}

function validarFormularioEmpresaAdmin() {
  if (!elements.adminCompanyLegalName.value.trim()) return "Informe a razão social.";
  if (!elements.adminCompanyTradeName.value.trim()) return "Informe o nome fantasia.";
  if (somenteDigitosAdmin(elements.adminCompanyCnpj.value).length !== 14) return "Informe um CNPJ com 14 dígitos.";

  const uf = elements.adminCompanyState.value.trim();
  if (uf && !/^[A-Za-z]{2}$/.test(uf)) return "Informe a UF com duas letras.";

  const cep = somenteDigitosAdmin(elements.adminCompanyZip.value);
  if (cep && cep.length !== 8) return "Informe o CEP com 8 dígitos.";

  const daily = Number(elements.adminConfigDailyMinutes.value);
  if (daily < 1 || daily > 1440) return "A carga diária deve ficar entre 1 e 1440 minutos.";
  return "";
}

function abrirAbaAdministrativa(tabName) {
  const valid = ["overview", "company", "employees", "signatures"];
  const tab = valid.includes(tabName) ? tabName : "overview";
  state.adminActiveTab = tab;

  elements.adminTabButtons.forEach((button) => {
    const active = button.dataset.adminTab === tab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  elements.adminTabPanels.forEach((panel) => {
    panel.hidden = panel.dataset.adminPanel !== tab;
  });
}


function atualizarFiltrosColaboradoresAdmin() {
  state.adminEmployeeFilter = {
    search: elements.adminEmployeeSearch.value.trim().toLowerCase(),
    status: elements.adminEmployeeStatusFilter.value,
    profile: elements.adminEmployeeProfileFilter.value,
  };
  renderizarColaboradoresAdmin();
}

function obterColaboradoresFiltradosAdmin() {
  const employees = state.adminData?.colaboradores || [];
  const filter = state.adminEmployeeFilter;

  return employees.filter((employee) => {
    const haystack = [
      employee.nome_completo,
      employee.email,
      employee.cpf,
      employee.ctps,
      employee.pis,
      employee.cargo_funcao,
      employee.centro_custo,
      employee.departamento,
    ].join(" ").toLowerCase();

    return (
      (!filter.search || haystack.includes(filter.search)) &&
      (filter.status === "todos" || employee.status === filter.status) &&
      (filter.profile === "todos" || employee.perfil === filter.profile)
    );
  });
}

function renderizarColaboradoresAdmin() {
  const employees = obterColaboradoresFiltradosAdmin();
  elements.adminEmployeeTableBody.replaceChildren();
  elements.adminEmployeeMobileList.replaceChildren();

  const empty = employees.length === 0;
  elements.adminEmployeeEmpty.hidden = !empty;
  elements.adminEmployeeTableWrapper.hidden = empty;
  elements.adminEmployeeMobileList.hidden = empty;

  employees.forEach((employee) => {
    elements.adminEmployeeTableBody.appendChild(criarLinhaColaboradorAdmin(employee));
    elements.adminEmployeeMobileList.appendChild(criarCardColaboradorAdmin(employee));
  });
}

function criarLinhaColaboradorAdmin(employee) {
  const row = document.createElement("tr");

  const identity = document.createElement("td");
  identity.innerHTML = `<strong>${escapeHtmlAdmin(employee.nome_completo || "—")}</strong><small>${escapeHtmlAdmin(employee.email || "—")}</small>`;

  const organization = document.createElement("td");
  organization.innerHTML = `
    <strong>${escapeHtmlAdmin(employee.departamento || "—")}</strong>
    <small>${escapeHtmlAdmin(employee.centro_custo || "—")}</small>
  `;

  const job = document.createElement("td");
  job.textContent = employee.cargo_funcao || "—";

  const profile = document.createElement("td");
  profile.appendChild(criarBadgeAdmin(
    employee.perfil === "administrador" ? "Administrador" : "Colaborador",
    employee.perfil === "administrador" ? "primary" : "neutral"
  ));

  const status = document.createElement("td");
  status.appendChild(criarBadgeAdmin(
    employee.status === "ativo" ? "Ativo" : "Inativo",
    employee.status === "ativo" ? "success" : "danger"
  ));

  const last = document.createElement("td");
  last.className = "mono-text";
  last.textContent = employee.ultima_marcacao
    ? formatarDataHoraCurta(employee.ultima_marcacao)
    : "—";

  const actions = document.createElement("td");
  actions.appendChild(criarAcoesColaboradorAdmin(employee));

  row.append(
    identity,
    organization,
    job,
    profile,
    status,
    last,
    actions
  );
  return row;
}

function criarCardColaboradorAdmin(employee) {
  const card = document.createElement("article");
  card.className = "admin-mobile-card";

  const header = document.createElement("div");
  header.className = "admin-mobile-card-header";
  header.innerHTML = `<div><strong>${escapeHtmlAdmin(employee.nome_completo || "—")}</strong><small>${escapeHtmlAdmin(employee.email || "—")}</small></div>`;
  header.appendChild(criarBadgeAdmin(
    employee.status === "ativo" ? "Ativo" : "Inativo",
    employee.status === "ativo" ? "success" : "danger"
  ));

  const details = document.createElement("dl");
  details.innerHTML = `
    <div><dt>Departamento</dt><dd>${escapeHtmlAdmin(employee.departamento || "—")}</dd></div>
    <div><dt>Centro de custo</dt><dd>${escapeHtmlAdmin(employee.centro_custo || "—")}</dd></div>
    <div><dt>Cargo</dt><dd>${escapeHtmlAdmin(employee.cargo_funcao || "—")}</dd></div>
    <div><dt>Perfil</dt><dd>${employee.perfil === "administrador" ? "Administrador" : "Colaborador"}</dd></div>
    <div><dt>Último ponto</dt><dd class="mono-text">${employee.ultima_marcacao ? escapeHtmlAdmin(formatarDataHoraCurta(employee.ultima_marcacao)) : "—"}</dd></div>
  `;

  card.append(header, details, criarAcoesColaboradorAdmin(employee));
  return card;
}

function criarAcoesColaboradorAdmin(employee) {
  const wrapper = document.createElement("div");
  wrapper.className = "admin-actions";

  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "compact-button ghost-button";
  edit.dataset.adminEmployeeAction = "edit";
  edit.dataset.employeeId = employee.id;
  edit.textContent = "Editar";
  wrapper.appendChild(edit);

  if (employee.id !== state.colaborador?.id) {
    const status = document.createElement("button");
    status.type = "button";
    status.className = employee.status === "ativo"
      ? "compact-button admin-danger-button"
      : "compact-button admin-success-button";
    status.dataset.adminEmployeeAction = "status";
    status.dataset.employeeId = employee.id;
    status.textContent = employee.status === "ativo" ? "Inativar" : "Ativar";
    wrapper.appendChild(status);
  }

  return wrapper;
}

function tratarAcaoColaboradorAdmin(event) {
  const button = event.target.closest("[data-admin-employee-action]");
  if (!button) return;

  const employee = state.adminData?.colaboradores.find(
    (item) => item.id === button.dataset.employeeId
  );
  if (!employee) return;

  if (button.dataset.adminEmployeeAction === "edit") {
    abrirModalColaborador(employee);
  } else if (button.dataset.adminEmployeeAction === "status") {
    alternarStatusColaboradorAdmin(employee);
  }
}

function abrirModalColaborador(employee = null) {
  state.adminSelectedEmployee = employee;
  elements.adminEmployeeForm.reset();
  limparMensagemAdmin(elements.adminEmployeeFormMessage);

  if (employee) {
    elements.adminEmployeeModalTitle.textContent = "Editar colaborador";
    elements.adminEmployeeModalSubtitle.textContent = "Atualize o perfil, o acesso ou defina uma nova senha.";
    elements.adminEmployeeId.value = employee.id;
    elements.adminEmployeeAuthId.value = employee.auth_user_id || "";
    elements.adminEmployeeName.value = employee.nome_completo || "";
    elements.adminEmployeeCpf.value = formatarCpfInput(employee.cpf);
    elements.adminEmployeeCtps.value = employee.ctps || "";
    elements.adminEmployeePis.value = formatarPisInput(employee.pis);
    elements.adminEmployeeAdmission.value = employee.data_admissao || "";
    elements.adminEmployeeEmail.value = employee.email || "";
    elements.adminEmployeePhone.value = employee.telefone || "";
    elements.adminEmployeeJob.value = employee.cargo_funcao || "";
    elements.adminEmployeeCostCenter.value = employee.centro_custo || "";
    elements.adminEmployeeDepartment.value = employee.departamento || "";
    elements.adminEmployeeProfile.value = employee.perfil || "colaborador";
    elements.adminEmployeeStatus.value = employee.status || "ativo";
    elements.adminEmployeeOutsideRadius.checked = Boolean(employee.permite_ponto_fora_raio);
    elements.adminEmployeePassword.required = false;
    elements.adminEmployeePasswordLabel.textContent = "Nova senha (opcional)";
    elements.adminEmployeePasswordHelp.textContent = "Deixe em branco para manter a senha atual.";
  } else {
    elements.adminEmployeeModalTitle.textContent = "Novo colaborador";
    elements.adminEmployeeModalSubtitle.textContent = "Crie simultaneamente o acesso no Auth e o perfil.";
    elements.adminEmployeeId.value = "";
    elements.adminEmployeeAuthId.value = "";
    elements.adminEmployeeAdmission.value = obterDataReferenciaAtual();
    elements.adminEmployeeProfile.value = "colaborador";
    elements.adminEmployeeStatus.value = "ativo";
    elements.adminEmployeePassword.required = true;
    elements.adminEmployeePasswordLabel.textContent = "Senha temporária";
    elements.adminEmployeePasswordHelp.textContent = "Obrigatória no novo cadastro. Use pelo menos 8 caracteres.";
  }

  elements.adminEmployeeModal.hidden = false;
  document.body.style.overflow = "hidden";
  window.setTimeout(() => elements.adminEmployeeName.focus(), 100);
}

function fecharModalColaborador({ force = false } = {}) {
  if (state.adminSaving && !force) return;
  elements.adminEmployeeModal.hidden = true;
  elements.adminEmployeeForm.reset();
  limparMensagemAdmin(elements.adminEmployeeFormMessage);
  state.adminSelectedEmployee = null;

  if (
    elements.historyDetailModal.hidden &&
    elements.historyPhotoModal.hidden &&
    elements.adminReleaseSignatureModal.hidden
  ) {
    document.body.style.overflow = "";
  }
}

async function salvarColaboradorAdmin(event) {
  event.preventDefault();
  if (state.adminSaving) return;

  const editing = Boolean(elements.adminEmployeeId.value);
  const validation = validarColaboradorAdmin(editing);

  if (validation) {
    mostrarMensagemAdmin(elements.adminEmployeeFormMessage, validation, "error");
    return;
  }

  state.adminSaving = true;
  definirBotaoCarregando(
    elements.adminEmployeeSaveButton,
    true,
    editing ? "Atualizando..." : "Criando..."
  );
  mostrarMensagemAdmin(
    elements.adminEmployeeFormMessage,
    editing ? "Atualizando Auth e perfil..." : "Criando usuário e perfil...",
    "info"
  );

  try {
    const payload = {
      action: editing ? "update" : "create",
      colaborador_id: elements.adminEmployeeId.value || null,
      nome_completo: elements.adminEmployeeName.value.trim(),
      cpf: somenteDigitosAdmin(elements.adminEmployeeCpf.value),
      ctps: elements.adminEmployeeCtps.value.trim(),
      pis: somenteDigitosAdmin(elements.adminEmployeePis.value),
      email: elements.adminEmployeeEmail.value.trim().toLowerCase(),
      telefone: valorOuNulo(elements.adminEmployeePhone.value),
      cargo_funcao: elements.adminEmployeeJob.value.trim(),
      centro_custo: elements.adminEmployeeCostCenter.value.trim(),
      departamento: elements.adminEmployeeDepartment.value.trim(),
      perfil: elements.adminEmployeeProfile.value,
      status: elements.adminEmployeeStatus.value,
      data_admissao: elements.adminEmployeeAdmission.value,
      permite_ponto_fora_raio: elements.adminEmployeeOutsideRadius.checked,
      password: elements.adminEmployeePassword.value || null,
    };

    const { data, error } = await state.supabase.functions.invoke(
      "admin-colaborador",
      { body: payload }
    );

    if (error) throw new Error(await extrairErroEdgeFunction(error));
    if (!data?.ok) throw new Error(data?.error || "Operação não confirmada.");

    fecharModalColaborador({ force: true });
    state.adminData = null;
    await carregarPainelAdministrativo({ force: true });
    mostrarToast(editing ? "Colaborador atualizado." : "Colaborador criado.", "success");
  } catch (error) {
    console.error("Erro ao salvar colaborador:", error);
    mostrarMensagemAdmin(elements.adminEmployeeFormMessage, traduzirErroAdministracao(error), "error");
  } finally {
    state.adminSaving = false;
    definirBotaoCarregando(elements.adminEmployeeSaveButton, false, "Salvar colaborador");
  }
}

async function alternarStatusColaboradorAdmin(employee) {
  if (state.adminSaving) return;

  const nextStatus = employee.status === "ativo" ? "inativo" : "ativo";
  const confirmed = window.confirm(
    nextStatus === "inativo"
      ? `Inativar o acesso de ${employee.nome_completo}?`
      : `Reativar o acesso de ${employee.nome_completo}?`
  );
  if (!confirmed) return;

  state.adminSaving = true;

  try {
    const { data, error } = await state.supabase.functions.invoke(
      "admin-colaborador",
      { body: { action: "set_status", colaborador_id: employee.id, status: nextStatus } }
    );

    if (error) throw new Error(await extrairErroEdgeFunction(error));
    if (!data?.ok) throw new Error(data?.error || "Operação não confirmada.");

    state.adminData = null;
    await carregarPainelAdministrativo({ force: true });
    mostrarToast(nextStatus === "ativo" ? "Colaborador reativado." : "Colaborador inativado.", "success");
  } catch (error) {
    console.error("Erro ao alterar status:", error);
    mostrarToast(traduzirErroAdministracao(error), "error");
  } finally {
    state.adminSaving = false;
  }
}

function validarColaboradorAdmin(editing) {
  if (!elements.adminEmployeeName.value.trim()) return "Informe o nome completo.";
  if (somenteDigitosAdmin(elements.adminEmployeeCpf.value).length !== 11) {
    return "Informe um CPF com 11 dígitos.";
  }

  if (!elements.adminEmployeeCtps.value.trim()) {
    return "Informe a CTPS do funcionário.";
  }

  if (
    somenteDigitosAdmin(elements.adminEmployeePis.value).length !== 11
  ) {
    return "Informe um PIS com 11 dígitos.";
  }

  if (!validarEmail(elements.adminEmployeeEmail.value.trim())) {
    return "Informe um e-mail válido.";
  }
  if (!elements.adminEmployeeJob.value.trim()) {
    return "Informe o cargo ou função.";
  }

  if (!elements.adminEmployeeCostCenter.value.trim()) {
    return "Informe o nome do centro de custo.";
  }

  if (!elements.adminEmployeeDepartment.value.trim()) {
    return "Informe o nome do departamento.";
  }

  if (!elements.adminEmployeeAdmission.value) {
    return "Informe a data de admissão.";
  }

  const password = elements.adminEmployeePassword.value;
  if (!editing && password.length < 8) return "A senha temporária deve possuir pelo menos 8 caracteres.";
  if (editing && password && password.length < 8) return "A nova senha deve possuir pelo menos 8 caracteres.";
  return "";
}


function renderizarAssinaturasRecentesAdmin() {
  const signatures = (state.adminData?.assinaturas || [])
    .filter((signature) => signature.ativa)
    .slice(0, 5);

  elements.adminRecentSignatures.replaceChildren();
  elements.adminRecentSignaturesEmpty.hidden = signatures.length > 0;

  signatures.forEach((signature) => {
    const item = document.createElement("article");
    item.className = "admin-recent-item";
    item.innerHTML = `
      <div>
        <strong>${escapeHtmlAdmin(signature.colaborador_nome || "Colaborador")}</strong>
        <span>${escapeHtmlAdmin(formatarCompetencia(signature.competencia))}</span>
      </div>
      <small class="mono-text">${escapeHtmlAdmin(formatarDataHoraCurta(signature.assinada_em))}</small>
    `;
    elements.adminRecentSignatures.appendChild(item);
  });
}

function renderizarAssinaturasAdmin() {
  const signatures = state.adminData?.assinaturas || [];
  const month = elements.adminSignatureMonthFilter.value || obterMesAtualInput();

  if (!elements.adminSignatureMonthFilter.value) {
    elements.adminSignatureMonthFilter.value = month;
  }

  const filtered = signatures.filter(
    (signature) => String(signature.competencia || "").slice(0, 7) === month
  );

  elements.adminSignatureTableBody.replaceChildren();
  elements.adminSignatureMobileList.replaceChildren();

  const empty = filtered.length === 0;
  elements.adminSignatureEmpty.hidden = !empty;
  elements.adminSignatureTableWrapper.hidden = empty;
  elements.adminSignatureMobileList.hidden = empty;

  filtered.forEach((signature) => {
    elements.adminSignatureTableBody.appendChild(criarLinhaAssinaturaAdmin(signature));
    elements.adminSignatureMobileList.appendChild(criarCardAssinaturaAdmin(signature));
  });
}

function criarLinhaAssinaturaAdmin(signature) {
  const row = document.createElement("tr");
  const values = [
    signature.colaborador_nome || "Colaborador",
    formatarCompetencia(signature.competencia),
    signature.assinada_em ? formatarDataHoraCurta(signature.assinada_em) : "—",
    `v${Number(signature.versao || 1)}`,
    String(signature.quantidade_registros || 0),
  ];

  values.forEach((value, index) => {
    const cell = document.createElement("td");
    cell.textContent = value;
    if (index >= 1 && index <= 4) cell.classList.add("mono-text");
    row.appendChild(cell);
  });

  const status = document.createElement("td");
  status.appendChild(criarBadgeAdmin(
    signature.ativa ? "Ativa" : "Invalidada",
    signature.ativa ? "success" : "neutral"
  ));
  row.appendChild(status);

  const actions = document.createElement("td");
  if (signature.ativa) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "compact-button admin-danger-button";
    button.dataset.adminSignatureAction = "release";
    button.dataset.signatureId = signature.id;
    button.textContent = "Liberar nova versão";
    actions.appendChild(button);
  } else {
    actions.textContent = "—";
  }
  row.appendChild(actions);
  return row;
}

function criarCardAssinaturaAdmin(signature) {
  const card = document.createElement("article");
  card.className = "admin-mobile-card";

  const header = document.createElement("div");
  header.className = "admin-mobile-card-header";
  header.innerHTML = `<div><strong>${escapeHtmlAdmin(signature.colaborador_nome || "Colaborador")}</strong><small>${escapeHtmlAdmin(formatarCompetencia(signature.competencia))}</small></div>`;
  header.appendChild(criarBadgeAdmin(
    signature.ativa ? "Ativa" : "Invalidada",
    signature.ativa ? "success" : "neutral"
  ));

  const details = document.createElement("dl");
  details.innerHTML = `
    <div><dt>Assinada em</dt><dd class="mono-text">${signature.assinada_em ? escapeHtmlAdmin(formatarDataHoraCurta(signature.assinada_em)) : "—"}</dd></div>
    <div><dt>Versão</dt><dd class="mono-text">v${Number(signature.versao || 1)}</dd></div>
    <div><dt>Marcações</dt><dd class="mono-text">${Number(signature.quantidade_registros || 0)}</dd></div>
  `;
  card.append(header, details);

  if (signature.ativa) {
    const actions = document.createElement("div");
    actions.className = "admin-actions";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "compact-button admin-danger-button";
    button.dataset.adminSignatureAction = "release";
    button.dataset.signatureId = signature.id;
    button.textContent = "Liberar nova versão";
    actions.appendChild(button);
    card.appendChild(actions);
  }

  return card;
}

function tratarAcaoAssinaturaAdmin(event) {
  const button = event.target.closest("[data-admin-signature-action]");
  if (!button) return;

  const signature = state.adminData?.assinaturas.find(
    (item) => item.id === button.dataset.signatureId
  );
  if (signature && button.dataset.adminSignatureAction === "release") {
    abrirModalLiberarAssinatura(signature);
  }
}

function abrirModalLiberarAssinatura(signature) {
  state.adminSelectedSignature = signature;
  elements.adminReleaseSignatureId.value = signature.id;
  elements.adminReleaseSignatureSubtitle.textContent =
    `${signature.colaborador_nome || "Colaborador"} • ${formatarCompetencia(signature.competencia)} • versão ${Number(signature.versao || 1)}`;
  elements.adminReleaseSignatureReason.value = "";
  limparMensagemAdmin(elements.adminReleaseSignatureMessage);
  elements.adminReleaseSignatureModal.hidden = false;
  document.body.style.overflow = "hidden";
  window.setTimeout(() => elements.adminReleaseSignatureReason.focus(), 100);
}

function fecharModalLiberarAssinatura({ force = false } = {}) {
  if (state.adminSaving && !force) return;

  elements.adminReleaseSignatureModal.hidden = true;
  elements.adminReleaseSignatureForm.reset();
  limparMensagemAdmin(elements.adminReleaseSignatureMessage);
  state.adminSelectedSignature = null;

  if (
    elements.historyDetailModal.hidden &&
    elements.historyPhotoModal.hidden &&
    elements.adminEmployeeModal.hidden
  ) {
    document.body.style.overflow = "";
  }
}

async function liberarNovaAssinaturaAdmin(event) {
  event.preventDefault();
  if (state.adminSaving) return;

  const reason = elements.adminReleaseSignatureReason.value.trim();
  if (reason.length < 10) {
    mostrarMensagemAdmin(
      elements.adminReleaseSignatureMessage,
      "Informe um motivo com pelo menos 10 caracteres.",
      "error"
    );
    return;
  }

  state.adminSaving = true;
  definirBotaoCarregando(
    elements.adminReleaseSignatureConfirmButton,
    true,
    "Liberando..."
  );

  try {
    const { error } = await state.supabase.rpc(
      "liberar_nova_assinatura",
      {
        p_assinatura_id: elements.adminReleaseSignatureId.value,
        p_motivo: reason,
      }
    );
    if (error) throw error;

    fecharModalLiberarAssinatura({ force: true });
    state.adminData = null;
    invalidarCacheAssinatura();
    invalidarCacheHistorico();
    invalidarCacheInformacoesGerais();
    await carregarPainelAdministrativo({ force: true });
    mostrarToast("Nova versão de assinatura liberada.", "success");
  } catch (error) {
    console.error("Erro ao liberar assinatura:", error);
    mostrarMensagemAdmin(
      elements.adminReleaseSignatureMessage,
      traduzirErroAdministracao(error),
      "error"
    );
  } finally {
    state.adminSaving = false;
    definirBotaoCarregando(
      elements.adminReleaseSignatureConfirmButton,
      false,
      "Liberar nova assinatura"
    );
  }
}

function criarBadgeAdmin(text, type = "neutral") {
  const badge = document.createElement("span");
  badge.className = `admin-badge admin-badge-${type}`;
  badge.textContent = text;
  return badge;
}

function mostrarMensagemAdmin(element, message, type = "info") {
  element.textContent = message;
  element.className = `point-save-message ${type}`;
  element.hidden = false;
}

function limparMensagemAdmin(element) {
  element.textContent = "";
  element.className = "point-save-message";
  element.hidden = true;
}

function definirBotaoCarregando(button, loading, label) {
  button.disabled = loading;
  button.classList.toggle("is-loading", loading);
  button.setAttribute("aria-busy", String(loading));
  const labelElement = button.querySelector(".button-label");
  if (labelElement) labelElement.textContent = label;
}

function definirEstadoAdministracao(type, message = "") {
  elements.adminLoading.hidden = type !== "loading";
  elements.adminError.hidden = type !== "error";
  elements.adminContent.hidden = type !== "content";
  if (type === "error") {
    elements.adminErrorText.textContent = message || "Tente novamente.";
  }
}

function traduzirErroAdministracao(error) {
  const message = String(error?.message || "");
  const normalized = message.toLowerCase();

  if (
    normalized.includes("admin-colaborador") &&
    (normalized.includes("not found") || normalized.includes("404"))
  ) {
    return "A Edge Function admin-colaborador ainda não foi publicada.";
  }
  if (
    normalized.includes("obter_painel_administrativo") ||
    normalized.includes("admin_atualizar_empresa_configuracoes")
  ) {
    return "Execute o arquivo supabase_etapa9.sql no SQL Editor.";
  }
  if (
    normalized.includes("already been registered") ||
    normalized.includes("user already registered") ||
    normalized.includes("email_exists")
  ) {
    return "Este e-mail já possui um usuário no Supabase Auth.";
  }
  if (normalized.includes("duplicate key") && normalized.includes("cpf")) {
    return "Este CPF já está cadastrado.";
  }

  if (
    normalized.includes("duplicate key") &&
    (
      normalized.includes("pis") ||
      normalized.includes("colaboradores_empresa_pis_unique")
    )
  ) {
    return "Este PIS já está cadastrado para outro colaborador.";
  }
  if (
    normalized.includes("permission") ||
    normalized.includes("acesso permitido") ||
    normalized.includes("403")
  ) {
    return "A operação é permitida somente para administradores.";
  }
  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("network") ||
    normalized.includes("load failed")
  ) {
    return "A conexão com o Supabase foi interrompida.";
  }

  return message || "Não foi possível concluir a operação administrativa.";
}

async function extrairErroEdgeFunction(error) {
  try {
    if (error?.context?.json) {
      const payload = await error.context.json();
      return payload?.error || payload?.message || error.message;
    }
  } catch {
    // Mantém a mensagem original.
  }
  return error?.message || "Falha ao chamar a Edge Function.";
}

function somenteDigitosAdmin(value) {
  return String(value || "").replace(/\D/g, "");
}

function valorOuNulo(value) {
  const normalized = String(value || "").trim();
  return normalized || null;
}

function numeroOuNulo(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function formatarCpfInput(value) {
  const digits = somenteDigitosAdmin(value).slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function formatarPisInput(value) {
  const digits = somenteDigitosAdmin(value).slice(0, 11);

  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{5})(\d)/, "$1.$2.$3")
    .replace(
      /^(\d{3})\.(\d{5})\.(\d{2})(\d)$/,
      "$1.$2.$3-$4"
    );
}

function formatarCnpjInput(value) {
  const digits = somenteDigitosAdmin(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function formatarCepInput(value) {
  const digits = somenteDigitosAdmin(value).slice(0, 8);
  return digits.replace(/(\d{5})(\d{1,3})$/, "$1-$2");
}

function escapeHtmlAdmin(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
  invalidarCacheInformacoesGerais();
  invalidarCacheHistorico();
  invalidarCacheAssinatura();

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
  state.generalInfo = null;
  state.generalInfoMonth = "";
  state.generalInfoLoading = false;
  state.generalInfoCache.clear();
  state.historyData = null;
  state.historyLoading = false;
  state.historyPage = 1;
  state.historyTotalPages = 1;
  state.historyCache.clear();
  state.historySelectedReceipt = null;
  state.historyReceiptCache.clear();
  state.historyPhotoSignedUrl = null;
  state.historyPrintPrepared = false;
  state.signaturePreview = null;
  state.signatureMonth = "";
  state.signatureLoading = false;
  state.signatureSigning = false;
  state.signatureCache.clear();
  state.adminData = null;
  state.adminLoading = false;
  state.adminSaving = false;
  state.adminActiveTab = "overview";
  state.adminEmployeeFilter = { search: "", status: "todos", profile: "todos" };
  state.adminSelectedEmployee = null;
  state.adminSelectedSignature = null;

  fecharModalColaborador({ force: true });
  fecharModalLiberarAssinatura({ force: true });
  fecharFotoHistorico();
  fecharDetalheHistorico();
  limparDocumentoImpressao();

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
