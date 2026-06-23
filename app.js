const LPR_5Y = [
  ["2019-08-20", 4.85],
  ["2019-11-20", 4.8],
  ["2020-02-20", 4.75],
  ["2020-04-20", 4.65],
  ["2022-01-20", 4.6],
  ["2022-05-20", 4.45],
  ["2022-08-22", 4.3],
  ["2023-06-20", 4.2],
  ["2024-02-20", 3.95],
  ["2024-07-22", 3.85],
  ["2024-10-21", 3.6],
  ["2025-05-20", 3.5],
  ["2026-05-20", 3.5],
].map(([date, rate]) => ({ date, rate }));

const SHANGHAI_RULES = [
  {
    from: "2019-08-20",
    first: 35,
    secondCore: 105,
    secondSuburban: 105,
    note: "2019-08-20 后上海常见首套下限按 LPR+35BP 估算",
  },
  {
    from: "2023-12-15",
    first: -10,
    secondCore: 30,
    secondSuburban: 20,
    note: "2023-12-15 上海首套 LPR-10BP，二套 LPR+30BP/差异化区域 +20BP",
  },
  {
    from: "2024-05-28",
    first: -45,
    secondCore: -5,
    secondSuburban: -25,
    note: "2024-05-28 上海首套 LPR-45BP，二套 LPR-5BP/差异化区域 -25BP",
  },
];

const SHANGHAI_FUND_LOAN_RATES = [
  ["2022-09-01", 3.25],
  ["2023-01-01", 3.1],
  ["2025-01-01", 2.85],
  ["2026-01-01", 2.6],
].map(([date, rate]) => ({ date, rate }));

const STORAGE_KEY = "shanghaiMortgageScenarios.v1";
let memoryScenarios = [];
let storageAvailable = true;

const els = {
  form: document.querySelector("#loanForm"),
  principal: document.querySelector("#principal"),
  years: document.querySelector("#years"),
  startDate: document.querySelector("#startDate"),
  repaymentType: document.querySelector("#repaymentType"),
  loanCity: document.querySelector("#loanCity"),
  homeType: document.querySelector("#homeType"),
  initialLpr: document.querySelector("#initialLpr"),
  initialSpreadBps: document.querySelector("#initialSpreadBps"),
  initialMatchedRate: document.querySelector("#initialMatchedRate"),
  repricing: document.querySelector("#repricing"),
  extraBps: document.querySelector("#extraBps"),
  manualRate: document.querySelector("#manualRate"),
  manualRepricing: document.querySelector("#manualRepricing"),
  commercialPriorRepriceMonths: document.querySelector("#commercialPriorRepriceMonths"),
  commercialPriorRepriceDate: document.querySelector("#commercialPriorRepriceDate"),
  commercialCycleChangeDate: document.querySelector("#commercialCycleChangeDate"),
  commercialRepriceMonths: document.querySelector("#commercialRepriceMonths"),
  commercialFirstRepriceDate: document.querySelector("#commercialFirstRepriceDate"),
  commercialAdjustmentDate: document.querySelector("#commercialAdjustmentDate"),
  commercialAdjustmentLpr: document.querySelector("#commercialAdjustmentLpr"),
  commercialAdjustedBps: document.querySelector("#commercialAdjustedBps"),
  commercialRateHistory: document.querySelector("#commercialRateHistory"),
  autoRateFields: document.querySelector("#autoRateFields"),
  manualRateFields: document.querySelector("#manualRateFields"),
  shanghaiRuleInfo: document.querySelector("#shanghaiRuleInfo"),
  addPrepay: document.querySelector("#addPrepay"),
  prepayList: document.querySelector("#prepayList"),
  savedInterest: document.querySelector("#savedInterest"),
  totalInterest: document.querySelector("#totalInterest"),
  payoffDate: document.querySelector("#payoffDate"),
  termChange: document.querySelector("#termChange"),
  resultSummary: document.querySelector("#resultSummary"),
  rateInfo: document.querySelector("#rateInfo"),
  scheduleBody: document.querySelector("#scheduleBody"),
  chart: document.querySelector("#balanceChart"),
  exportCsv: document.querySelector("#exportCsv"),
  resetBtn: document.querySelector("#resetBtn"),
  fundEnabled: document.querySelector("#fundEnabled"),
  fundBalance: document.querySelector("#fundBalance"),
  fundMonthly: document.querySelector("#fundMonthly"),
  fundLoanStartDate: document.querySelector("#fundLoanStartDate"),
  fundLoanPrincipal: document.querySelector("#fundLoanPrincipal"),
  fundLoanTerm: document.querySelector("#fundLoanTerm"),
  fundLoanRepaymentType: document.querySelector("#fundLoanRepaymentType"),
  fundLoanRateMode: document.querySelector("#fundLoanRateMode"),
  fundManualRateWrap: document.querySelector("#fundManualRateWrap"),
  fundManualRate: document.querySelector("#fundManualRate"),
  fundRepriceMonths: document.querySelector("#fundRepriceMonths"),
  fundFirstRepriceDate: document.querySelector("#fundFirstRepriceDate"),
  fundRateHistory: document.querySelector("#fundRateHistory"),
  fundStartMonth: document.querySelector("#fundStartMonth"),
  fundCap: document.querySelector("#fundCap"),
  firstCashOut: document.querySelector("#firstCashOut"),
  avgCashOut: document.querySelector("#avgCashOut"),
  currentYearCashBreakdown: document.querySelector("#currentYearCashBreakdown"),
  totalFundOffset: document.querySelector("#totalFundOffset"),
  fundOffsetBreakdown: document.querySelector("#fundOffsetBreakdown"),
  accruedCashOut: document.querySelector("#accruedCashOut"),
  cashOutBreakdown: document.querySelector("#cashOutBreakdown"),
  fundDepletedMonth: document.querySelector("#fundDepletedMonth"),
  scenarioName: document.querySelector("#scenarioName"),
  saveScenario: document.querySelector("#saveScenario"),
  savedScenarios: document.querySelector("#savedScenarios"),
  loadScenario: document.querySelector("#loadScenario"),
  deleteScenario: document.querySelector("#deleteScenario"),
  exportScenarios: document.querySelector("#exportScenarios"),
  importScenarios: document.querySelector("#importScenarios"),
  detailMode: document.querySelector("#detailMode"),
  storageStatus: document.querySelector("#storageStatus"),
};

let rateMode = "auto";
let activeTab = "prepay";
let latestResult = null;

function parseDate(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function iso(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addMonths(date, months) {
  const next = new Date(date);
  const day = next.getDate();
  next.setMonth(next.getMonth() + months, 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return next;
}

function compareIso(a, b) {
  return a.localeCompare(b);
}

function getLpr(dateIso) {
  let current = LPR_5Y[0];
  for (const item of LPR_5Y) {
    if (compareIso(item.date, dateIso) <= 0) current = item;
  }
  return current.rate;
}

function getShanghaiRule(dateIso) {
  let rule = SHANGHAI_RULES[0];
  for (const item of SHANGHAI_RULES) {
    if (compareIso(item.from, dateIso) <= 0) rule = item;
  }
  return rule;
}

function getShanghaiFundLoanRate(dateIso) {
  let current = SHANGHAI_FUND_LOAN_RATES[0];
  for (const item of SHANGHAI_FUND_LOAN_RATES) {
    if (compareIso(item.date, dateIso) <= 0) current = item;
  }
  return current.rate;
}

function monthlyPayment(balance, monthlyRate, months) {
  if (months <= 0) return balance;
  if (monthlyRate === 0) return balance / months;
  const factor = Math.pow(1 + monthlyRate, months);
  return (balance * monthlyRate * factor) / (factor - 1);
}

function monthsToPayoff(balance, monthlyRate, payment) {
  if (balance <= 0) return 0;
  if (monthlyRate === 0) return Math.ceil(balance / payment);
  if (payment <= balance * monthlyRate) return 9999;
  return Math.ceil(-Math.log(1 - (balance * monthlyRate) / payment) / Math.log(1 + monthlyRate));
}

function currency(value, digits = 0) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: digits,
  }).format(value);
}

function parseRateHistory(text) {
  return String(text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d{4}-\d{2}-\d{2})\s*(?:=|,|\s)\s*([+-]?[0-9]+(?:\.[0-9]+)?)%?$/);
      return match ? { date: match[1], rate: Number(match[2]) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => compareIso(a.date, b.date));
}

function valueFromHistory(history, dateIso, fallbackValue) {
  let value = fallbackValue;
  for (const item of history) {
    if (compareIso(item.date, dateIso) <= 0) value = item.rate;
  }
  return value;
}

function isCycleRepriceDate(dateIso, firstDateIso, cycleMonths) {
  if (!firstDateIso || !cycleMonths || cycleMonths <= 0) return false;
  const current = parseDate(dateIso);
  const first = parseDate(firstDateIso);
  const diff = (current.getFullYear() - first.getFullYear()) * 12 + (current.getMonth() - first.getMonth());
  return diff >= 0 && diff % cycleMonths === 0;
}

function latestCycleRepriceDate(dateIso, anchorDateIso, cycleMonths) {
  if (!anchorDateIso || !cycleMonths || cycleMonths <= 0) return dateIso;
  const target = parseDate(dateIso);
  let cursor = parseDate(anchorDateIso);

  while (cursor > target) cursor = addMonths(cursor, -cycleMonths);
  while (addMonths(cursor, cycleMonths) <= target) cursor = addMonths(cursor, cycleMonths);
  return iso(cursor);
}

function formatBps(value) {
  return `${value >= 0 ? "+" : ""}${Math.round(value)}BP`;
}

function nextCycleRepriceDate(anchorIso, changeIso, cycleMonths) {
  if (!anchorIso || !changeIso || !cycleMonths || cycleMonths <= 0) return "";
  const anchor = parseDate(anchorIso);
  const change = parseDate(changeIso);
  const today = new Date();
  let step = 1;
  let candidate = addMonths(anchor, step * cycleMonths);

  while (candidate < change || candidate < today) {
    step += 1;
    candidate = addMonths(anchor, step * cycleMonths);
  }
  return iso(candidate);
}

function syncInitialRateMatch({ resetSpread = false, resetLpr = false } = {}) {
  const startIso = els.startDate.value;
  if (!startIso) return;
  const rule = getShanghaiRule(startIso);
  const matchedSpread = rule[els.homeType.value];
  const matchedLpr = getLpr(startIso);
  if (resetSpread || els.initialSpreadBps.value === "") els.initialSpreadBps.value = matchedSpread;
  if (resetLpr || els.initialLpr.value === "") els.initialLpr.value = matchedLpr.toFixed(2);
  const spread = Number(els.initialSpreadBps.value || 0);
  const lpr = Number(els.initialLpr.value || matchedLpr);
  els.initialMatchedRate.value = (lpr + spread / 100).toFixed(2);
  els.extraBps.value = spread - matchedSpread;
}

function syncStockRateAdjustment({ resetAdjustmentLpr = false } = {}) {
  const adjustmentDate = els.commercialAdjustmentDate.value;
  if (adjustmentDate && (resetAdjustmentLpr || els.commercialAdjustmentLpr.value === "")) {
    const lprReferenceDate = latestCycleRepriceDate(adjustmentDate, els.commercialPriorRepriceDate.value, Number(els.commercialPriorRepriceMonths.value || 12));
    els.commercialAdjustmentLpr.value = getLpr(lprReferenceDate).toFixed(2);
  }
  els.commercialRateHistory.value = adjustmentDate ? `${adjustmentDate}=${Number(els.commercialAdjustedBps.value || 0)}` : "";
  const nextDate = nextCycleRepriceDate(els.commercialPriorRepriceDate.value, els.commercialCycleChangeDate.value, Number(els.commercialRepriceMonths.value || 0));
  if (nextDate) els.commercialFirstRepriceDate.value = nextDate;
}

function syncCommercialRateUi(options) {
  syncInitialRateMatch(options);
  syncStockRateAdjustment(options);
}

function getPrepayRowsForStorage() {
  return Array.from(els.prepayList.querySelectorAll(".prepay-row")).map((row) => ({
    month: row.querySelector(".prepay-month").value,
    amount: row.querySelector(".prepay-amount").value,
    mode: row.querySelector(".prepay-mode").value,
  }));
}

function collectFormState() {
  return {
    rateMode,
    principal: els.principal.value,
    years: els.years.value,
    startDate: els.startDate.value,
    repaymentType: els.repaymentType.value,
    loanCity: els.loanCity.value,
    homeType: els.homeType.value,
    initialSpreadBps: els.initialSpreadBps.value,
    initialLpr: els.initialLpr.value,
    repricing: els.repricing.value,
    extraBps: els.extraBps.value,
    manualRate: els.manualRate.value,
    manualRepricing: els.manualRepricing.value,
    commercialPriorRepriceMonths: els.commercialPriorRepriceMonths.value,
    commercialPriorRepriceDate: els.commercialPriorRepriceDate.value,
    commercialCycleChangeDate: els.commercialCycleChangeDate.value,
    commercialRepriceMonths: els.commercialRepriceMonths.value,
    commercialFirstRepriceDate: els.commercialFirstRepriceDate.value,
    commercialAdjustmentDate: els.commercialAdjustmentDate.value,
    commercialAdjustmentLpr: els.commercialAdjustmentLpr.value,
    commercialAdjustedBps: els.commercialAdjustedBps.value,
    commercialRateHistory: els.commercialRateHistory.value,
    fundEnabled: els.fundEnabled.checked,
    fundBalance: els.fundBalance.value,
    fundMonthly: els.fundMonthly.value,
    fundLoanStartDate: els.fundLoanStartDate.value,
    fundLoanPrincipal: els.fundLoanPrincipal.value,
    fundLoanTerm: els.fundLoanTerm.value,
    fundLoanRepaymentType: els.fundLoanRepaymentType.value,
    fundLoanRateMode: els.fundLoanRateMode.value,
    fundManualRate: els.fundManualRate.value,
    fundRepriceMonths: els.fundRepriceMonths.value,
    fundFirstRepriceDate: els.fundFirstRepriceDate.value,
    fundRateHistory: els.fundRateHistory.value,
    fundStartMonth: els.fundStartMonth.value,
    fundCap: els.fundCap.value,
    prepays: getPrepayRowsForStorage(),
  };
}

function detectStorage() {
  try {
    const testKey = `${STORAGE_KEY}.test`;
    localStorage.setItem(testKey, "1");
    localStorage.removeItem(testKey);
    storageAvailable = true;
  } catch {
    storageAvailable = false;
    setStorageStatus("当前页面无法长期写入浏览器存储；可临时保存，并用“导出备份”长期保留。");
  }
}

function readSavedScenarios() {
  if (!storageAvailable) return memoryScenarios;
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    storageAvailable = false;
    return [];
  }
}

function writeSavedScenarios(items) {
  if (!storageAvailable) {
    memoryScenarios = items;
    return "memory";
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    return "local";
  } catch {
    storageAvailable = false;
    memoryScenarios = items;
    return "memory";
  }
}

function setStorageStatus(message) {
  els.storageStatus.textContent = message;
}

function setRateMode(nextMode) {
  rateMode = nextMode;
  document.querySelectorAll("[data-rate-mode]").forEach((item) => item.classList.toggle("active", item.dataset.rateMode === rateMode));
  els.autoRateFields.classList.toggle("hidden", rateMode !== "auto");
  els.manualRateFields.classList.toggle("hidden", rateMode !== "manual");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderSavedOptions(selectedId = "") {
  const items = readSavedScenarios();
  if (items.length === 0) {
    els.savedScenarios.innerHTML = '<option value="">暂无已保存方案</option>';
    els.loadScenario.disabled = true;
    els.deleteScenario.disabled = true;
    return;
  }

  els.savedScenarios.innerHTML = items
    .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}（${item.updatedAt.slice(0, 10)}）</option>`)
    .join("");
  els.savedScenarios.value = selectedId || items[0].id;
  els.loadScenario.disabled = false;
  els.deleteScenario.disabled = false;
}

function saveScenario() {
  const now = new Date().toISOString();
  const fallbackName = `${els.startDate.value || "房贷"} ${els.principal.value || "0"}万`;
  const name = (els.scenarioName.value || fallbackName).trim().slice(0, 28);
  const items = readSavedScenarios();
  const currentId = els.savedScenarios.value;
  const existing = items.find((item) => item.id === currentId && item.name === name);
  const item = {
    id: existing?.id || `scenario-${Date.now()}`,
    name,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    state: collectFormState(),
  };
  const next = [item, ...items.filter((saved) => saved.id !== item.id)].slice(0, 30);
  const savedTo = writeSavedScenarios(next);
  renderSavedOptions(item.id);
  setStorageStatus(savedTo === "local" ? `已保存到当前浏览器：${name}` : `已临时保存：${name}。刷新前请导出备份文件。`);
}

function applyFormState(state) {
  setRateMode(state.rateMode || "auto");
  els.principal.value = state.principal ?? els.principal.value;
  els.years.value = state.years ?? els.years.value;
  els.startDate.value = state.startDate ?? els.startDate.value;
  els.repaymentType.value = state.repaymentType ?? els.repaymentType.value;
  els.loanCity.value = state.loanCity ?? els.loanCity.value;
  els.homeType.value = state.homeType ?? els.homeType.value;
  els.initialSpreadBps.value = state.initialSpreadBps ?? els.initialSpreadBps.value;
  els.initialLpr.value = state.initialLpr ?? els.initialLpr.value;
  els.repricing.value = state.repricing ?? els.repricing.value;
  els.extraBps.value = state.extraBps ?? els.extraBps.value;
  els.manualRate.value = state.manualRate ?? els.manualRate.value;
  els.manualRepricing.value = state.manualRepricing ?? els.manualRepricing.value;
  els.commercialPriorRepriceMonths.value = state.commercialPriorRepriceMonths ?? els.commercialPriorRepriceMonths.value;
  els.commercialPriorRepriceDate.value = state.commercialPriorRepriceDate ?? els.commercialPriorRepriceDate.value;
  els.commercialCycleChangeDate.value = state.commercialCycleChangeDate ?? els.commercialCycleChangeDate.value;
  els.commercialRepriceMonths.value = state.commercialRepriceMonths ?? els.commercialRepriceMonths.value;
  els.commercialFirstRepriceDate.value = state.commercialFirstRepriceDate ?? els.commercialFirstRepriceDate.value;
  els.commercialAdjustmentDate.value = state.commercialAdjustmentDate ?? els.commercialAdjustmentDate.value;
  els.commercialAdjustmentLpr.value = state.commercialAdjustmentLpr ?? els.commercialAdjustmentLpr.value;
  els.commercialAdjustedBps.value = state.commercialAdjustedBps ?? els.commercialAdjustedBps.value;
  els.commercialRateHistory.value = state.commercialRateHistory ?? els.commercialRateHistory.value;
  els.fundEnabled.checked = Boolean(state.fundEnabled);
  els.fundBalance.value = state.fundBalance ?? els.fundBalance.value;
  els.fundMonthly.value = state.fundMonthly ?? els.fundMonthly.value;
  els.fundLoanStartDate.value = state.fundLoanStartDate ?? els.fundLoanStartDate.value;
  els.fundLoanPrincipal.value = state.fundLoanPrincipal ?? els.fundLoanPrincipal.value;
  els.fundLoanTerm.value = state.fundLoanTerm ?? els.fundLoanTerm.value;
  els.fundLoanRepaymentType.value = state.fundLoanRepaymentType ?? els.fundLoanRepaymentType.value;
  els.fundLoanRateMode.value = state.fundLoanRateMode ?? els.fundLoanRateMode.value;
  els.fundManualRate.value = state.fundManualRate ?? els.fundManualRate.value;
  els.fundRepriceMonths.value = state.fundRepriceMonths ?? els.fundRepriceMonths.value;
  els.fundFirstRepriceDate.value = state.fundFirstRepriceDate ?? els.fundFirstRepriceDate.value;
  els.fundRateHistory.value = state.fundRateHistory ?? els.fundRateHistory.value;
  els.fundManualRateWrap.classList.toggle("hidden", els.fundLoanRateMode.value !== "manual");
  els.fundStartMonth.value = state.fundStartMonth ?? els.fundStartMonth.value;
  els.fundCap.value = state.fundCap ?? els.fundCap.value;
  els.prepayList.innerHTML = "";
  const prepays = Array.isArray(state.prepays) && state.prepays.length ? state.prepays : [{ month: 36, amount: 30, mode: "shortenTerm" }];
  prepays.forEach((item) => addPrepayRow(item.month, item.amount, item.mode));
  syncCommercialRateUi();
  renderResult();
}

function loadScenario() {
  const items = readSavedScenarios();
  const item = items.find((saved) => saved.id === els.savedScenarios.value);
  if (!item) return;
  els.scenarioName.value = item.name;
  applyFormState(item.state);
  setStorageStatus(`已加载：${item.name}`);
}

function deleteScenario() {
  const items = readSavedScenarios();
  const item = items.find((saved) => saved.id === els.savedScenarios.value);
  const next = items.filter((saved) => saved.id !== els.savedScenarios.value);
  writeSavedScenarios(next);
  renderSavedOptions();
  setStorageStatus(item ? `已删除：${item.name}` : "已删除。");
}

function exportScenariosBackup() {
  const items = readSavedScenarios();
  if (items.length === 0) {
    setStorageStatus("没有可导出的方案。");
    return;
  }

  const payload = {
    type: "shanghaiMortgageScenarios",
    version: 1,
    exportedAt: new Date().toISOString(),
    scenarios: items,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `房贷测算方案备份-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  setStorageStatus(`已导出 ${items.length} 个方案备份。`);
}

function importScenariosBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(String(reader.result || "{}"));
      const imported = Array.isArray(payload.scenarios) ? payload.scenarios : Array.isArray(payload) ? payload : [];
      const normalized = imported
        .filter((item) => item && item.id && item.name && item.state)
        .map((item) => ({
          id: String(item.id),
          name: String(item.name).slice(0, 28),
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString(),
          state: item.state,
        }));

      if (normalized.length === 0) {
        setStorageStatus("导入失败：没有找到有效方案。");
        return;
      }

      const existing = readSavedScenarios();
      const merged = [...normalized, ...existing.filter((item) => !normalized.some((next) => next.id === item.id))].slice(0, 30);
      const savedTo = writeSavedScenarios(merged);
      renderSavedOptions(normalized[0].id);
      setStorageStatus(savedTo === "local" ? `已导入 ${normalized.length} 个方案。` : `已临时导入 ${normalized.length} 个方案，刷新前请再导出备份。`);
    } catch {
      setStorageStatus("导入失败：备份文件格式不正确。");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file, "utf-8");
}

function getFundConfig() {
  return {
    enabled: els.fundEnabled.checked,
    balance: Number(els.fundBalance.value || 0) * 10000,
    monthlyDeposit: Number(els.fundMonthly.value || 0),
    loanStartDate: els.fundLoanStartDate.value,
    loanPrincipal: Number(els.fundLoanPrincipal.value || 0) * 10000,
    loanTerm: Number(els.fundLoanTerm.value || 0),
    loanRepaymentType: els.fundLoanRepaymentType.value,
    loanRateMode: els.fundLoanRateMode.value,
    manualRate: Number(els.fundManualRate.value || 0),
    repriceMonths: Number(els.fundRepriceMonths.value || 12),
    firstRepriceDate: els.fundFirstRepriceDate.value,
    rateHistory: parseRateHistory(els.fundRateHistory.value),
    startMonth: Math.max(1, Number(els.fundStartMonth.value || 1)),
    monthlyCap: Number(els.fundCap.value || 0),
  };
}

function getInputs() {
  const startIso = els.startDate.value;
  const principal = Number(els.principal.value) * 10000;
  const totalMonths = Number(els.years.value) * 12;
  const repaymentType = els.repaymentType.value;
  let spreadBps = 0;
  let initialRate = Number(els.manualRate.value);
  let repricing = rateMode === "auto" ? els.repricing.value : els.manualRepricing.value;
  let ruleNote = "手动利率";
  const spreadHistory = parseRateHistory(els.commercialRateHistory.value);
  const priorRepriceMonths = Math.max(1, Number(els.commercialPriorRepriceMonths.value || 12));
  const priorRepriceDate = els.commercialPriorRepriceDate.value;
  const cycleChangeDate = els.commercialCycleChangeDate.value;
  const repriceMonths = Math.max(1, Number(els.commercialRepriceMonths.value || 12));
  const firstRepriceDate = els.commercialFirstRepriceDate.value;
  const adjustmentDate = els.commercialAdjustmentDate.value;
  const adjustmentLpr = Number(els.commercialAdjustmentLpr.value || 0);

  if (rateMode === "auto") {
    const rule = getShanghaiRule(startIso);
    spreadBps = rule[els.homeType.value] + Number(els.extraBps.value || 0);
    initialRate = getLpr(startIso) + spreadBps / 100;
    ruleNote = rule.note;
  } else if (repricing !== "none") {
    spreadBps = (initialRate - getLpr(startIso)) * 100;
  }
  if (repricing !== "none") {
    const initialSpreadBps = valueFromHistory(spreadHistory, startIso, spreadBps);
    initialRate = Number(els.initialLpr.value || getLpr(startIso)) + initialSpreadBps / 100;
  }

  const prepays = Array.from(els.prepayList.querySelectorAll(".prepay-row"))
    .map((row) => ({
      month: Number(row.querySelector(".prepay-month").value),
      amount: Number(row.querySelector(".prepay-amount").value) * 10000,
      mode: row.querySelector(".prepay-mode").value,
    }))
    .filter((item) => item.month > 0 && item.amount > 0)
    .sort((a, b) => a.month - b.month);

  return { startIso, principal, totalMonths, repaymentType, spreadBps, initialRate, repricing, priorRepriceMonths, priorRepriceDate, cycleChangeDate, repriceMonths, firstRepriceDate, adjustmentDate, adjustmentLpr, spreadHistory, prepays, ruleNote, fund: getFundConfig() };
}

function shouldReprice(monthIndex, currentDate, startDate, config) {
  if (monthIndex === 1 || config.repricing === "none") return false;
  const dateIso = iso(currentDate);
  if (isCycleRepriceDate(dateIso, config.firstRepriceDate, config.repriceMonths)) return true;
  const mode = config.repricing;
  if (mode === "jan1") return currentDate.getMonth() === 0;
  if (mode === "anniversary") return currentDate.getMonth() === startDate.getMonth();
  return false;
}

function getCommercialAnnualRate(config, dateIso) {
  if (config.repricing === "none") return config.initialRate;
  const spreadBps = valueFromHistory(config.spreadHistory, dateIso, config.spreadBps);
  const beforeCycleChange = config.cycleChangeDate && compareIso(dateIso, config.cycleChangeDate) < 0;
  const calculatedLprDate = latestCycleRepriceDate(dateIso, beforeCycleChange ? config.priorRepriceDate : config.firstRepriceDate, beforeCycleChange ? config.priorRepriceMonths : config.repriceMonths);
  const lprReferenceDate = compareIso(calculatedLprDate, config.startIso) < 0 ? config.startIso : calculatedLprDate;
  const adjustmentOverrideApplies = config.adjustmentDate && config.adjustmentLpr && compareIso(dateIso, config.adjustmentDate) >= 0 && compareIso(lprReferenceDate, config.adjustmentDate) <= 0;
  const lpr = adjustmentOverrideApplies ? config.adjustmentLpr : getLpr(lprReferenceDate);
  return lpr + spreadBps / 100;
}

function calculatePlan(config, includePrepays) {
  const startDate = parseDate(config.startIso);
  const prepaysByMonth = new Map();
  if (includePrepays) {
    for (const item of config.prepays) {
      if (!prepaysByMonth.has(item.month)) prepaysByMonth.set(item.month, []);
      prepaysByMonth.get(item.month).push(item);
    }
  }

  let balance = config.principal;
  let remainingMonths = config.totalMonths;
  let annualRate = config.initialRate;
  let scheduledPayment = monthlyPayment(balance, annualRate / 100 / 12, remainingMonths);
  let fixedPrincipal = balance / remainingMonths;
  const schedule = [];
  let totalInterest = 0;

  for (let month = 1; month <= config.totalMonths + 600 && balance > 0.01 && remainingMonths > 0; month++) {
    const currentDate = addMonths(startDate, month);
    const currentDateIso = iso(currentDate);
    const nextAnnualRate = getCommercialAnnualRate(config, currentDateIso);
    if (Math.abs(nextAnnualRate - annualRate) > 0.000001) {
      annualRate = nextAnnualRate;
      if (config.repaymentType === "equalInstallment") {
        scheduledPayment = monthlyPayment(balance, annualRate / 100 / 12, remainingMonths);
      } else {
        fixedPrincipal = balance / remainingMonths;
      }
    }

    const monthlyRate = annualRate / 100 / 12;
    const interest = balance * monthlyRate;
    let principalPaid;
    let payment;

    if (config.repaymentType === "equalInstallment") {
      payment = Math.min(scheduledPayment, balance + interest);
      principalPaid = Math.max(0, payment - interest);
    } else {
      principalPaid = Math.min(fixedPrincipal, balance);
      payment = principalPaid + interest;
    }

    balance = Math.max(0, balance - principalPaid);
    totalInterest += interest;

    let prepayAmount = 0;
    let prepayMode = "";
    const events = prepaysByMonth.get(month) || [];
    for (const event of events) {
      const actual = Math.min(event.amount, balance);
      balance = Math.max(0, balance - actual);
      prepayAmount += actual;
      prepayMode = event.mode;

      if (balance <= 0.01) break;
      if (event.mode === "reducePayment") {
        if (config.repaymentType === "equalInstallment") {
          scheduledPayment = monthlyPayment(balance, annualRate / 100 / 12, Math.max(remainingMonths - 1, 1));
        } else {
          fixedPrincipal = balance / Math.max(remainingMonths - 1, 1);
        }
      } else {
        if (config.repaymentType === "equalInstallment") {
          const shortened = monthsToPayoff(balance, annualRate / 100 / 12, scheduledPayment);
          remainingMonths = Math.min(remainingMonths, shortened + 1);
        } else {
          const shortened = Math.ceil(balance / Math.max(fixedPrincipal, 0.01));
          remainingMonths = Math.min(remainingMonths, shortened + 1);
        }
      }
    }

    schedule.push({
      month,
      date: currentDateIso,
      annualRate,
      payment,
      principal: principalPaid,
      interest,
      prepay: prepayAmount,
      prepayMode,
      balance,
    });

    remainingMonths -= 1;
    if (balance <= 0.01) break;

    if (prepayMode === "shortenTerm" && config.repaymentType === "equalInstallment") {
      scheduledPayment = Math.max(scheduledPayment, monthlyPayment(balance, annualRate / 100 / 12, remainingMonths));
    }
  }

  return {
    schedule,
    totalInterest,
    payoffMonth: schedule.length,
    payoffDate: schedule.at(-1)?.date || config.startIso,
  };
}

function getElapsedFundLoanMonths(fund, dateIso) {
  if (!fund.loanStartDate || !dateIso) return 0;
  const start = parseDate(fund.loanStartDate);
  const current = parseDate(dateIso);
  const months = (current.getFullYear() - start.getFullYear()) * 12 + (current.getMonth() - start.getMonth());
  return Math.max(0, Math.min(months, fund.loanTerm));
}

function calculateFundLoanState(fund, dateIso) {
  if (!fund.enabled || fund.loanPrincipal <= 0 || fund.loanTerm <= 0) {
    return { balance: 0, remainingMonths: 0, annualRate: 0 };
  }

  const elapsed = getElapsedFundLoanMonths(fund, dateIso);
  let balance = fund.loanPrincipal;
  let remainingMonths = fund.loanTerm;
  const startFallbackRate = fund.loanRateMode === "manual" ? fund.manualRate : getShanghaiFundLoanRate(fund.loanStartDate);
  let annualRate = valueFromHistory(fund.rateHistory, fund.loanStartDate, startFallbackRate);

  for (let i = 1; i <= elapsed && balance > 0.01 && remainingMonths > 0; i++) {
    const payDate = iso(addMonths(parseDate(fund.loanStartDate), i));
    const fallbackRate = fund.loanRateMode === "manual" ? fund.manualRate : getShanghaiFundLoanRate(payDate);
    if (isCycleRepriceDate(payDate, fund.firstRepriceDate, fund.repriceMonths)) {
      annualRate = valueFromHistory(fund.rateHistory, payDate, fallbackRate);
    }
    const monthlyRate = annualRate / 100 / 12;
    const interest = balance * monthlyRate;
    let principalPaid;

    if (fund.loanRepaymentType === "equalInstallment") {
      const payment = Math.min(monthlyPayment(balance, monthlyRate, remainingMonths), balance + interest);
      principalPaid = Math.max(0, payment - interest);
    } else {
      principalPaid = Math.min(fund.loanPrincipal / fund.loanTerm, balance);
    }

    balance = Math.max(0, balance - principalPaid);
    remainingMonths = Math.max(0, remainingMonths - 1);
  }

  return { balance, remainingMonths, annualRate };
}

function applyFundOffset(schedule, fund) {
  let fundBalance = fund.enabled ? fund.balance : 0;
  const initialFundLoanState = calculateFundLoanState(fund, schedule[0]?.date || fund.loanStartDate);
  let fundLoanBalance = initialFundLoanState.balance;
  let fundLoanRemainingMonths = initialFundLoanState.remainingMonths;
  let currentFundLoanRate = initialFundLoanState.annualRate;
  let depletedMonth = null;

  return schedule.map((row) => {
    if (!fund.enabled) {
      return {
        ...row,
        fundLoanPayment: 0,
        fundLoanPaid: 0,
        fundOffset: 0,
        commercialFundOffset: 0,
        commercialCashOut: row.payment + row.prepay,
        cashOut: row.payment + row.prepay,
        fundBalance,
      };
    }

    fundBalance += fund.monthlyDeposit;

    const fundFallbackRate = fund.loanRateMode === "manual" ? fund.manualRate : getShanghaiFundLoanRate(row.date);
    if (isCycleRepriceDate(row.date, fund.firstRepriceDate, fund.repriceMonths)) {
      currentFundLoanRate = valueFromHistory(fund.rateHistory, row.date, fundFallbackRate);
    }
    const fundLoanRate = currentFundLoanRate || valueFromHistory(fund.rateHistory, row.date, fundFallbackRate);
    const fundLoanMonthlyRate = fundLoanRate / 100 / 12;
    let fundLoanPayment = 0;
    let fundLoanPrincipalPaid = 0;
    let fundLoanInterest = 0;

    if (fundLoanBalance > 0.01 && fund.loanTerm > 0) {
      fundLoanInterest = fundLoanBalance * fundLoanMonthlyRate;
      if (fund.loanRepaymentType === "equalInstallment") {
        fundLoanPayment = Math.min(monthlyPayment(fundLoanBalance, fundLoanMonthlyRate, Math.max(fundLoanRemainingMonths, 1)), fundLoanBalance + fundLoanInterest);
        fundLoanPrincipalPaid = Math.max(0, fundLoanPayment - fundLoanInterest);
      } else {
        fundLoanPrincipalPaid = Math.min(fund.loanPrincipal / fund.loanTerm, fundLoanBalance);
        fundLoanPayment = fundLoanPrincipalPaid + fundLoanInterest;
      }
      fundLoanBalance = Math.max(0, fundLoanBalance - fundLoanPrincipalPaid);
      fundLoanRemainingMonths = Math.max(0, fundLoanRemainingMonths - 1);
    }

    const fundLoanPaid = Math.min(fundLoanPayment, fundBalance);
    const fundLoanCashOut = fundLoanPayment - fundLoanPaid;
    fundBalance = Math.max(0, fundBalance - fundLoanPaid);
    const cap = fund.monthlyCap > 0 ? fund.monthlyCap : row.payment;
    const offsetActive = row.month >= fund.startMonth;
    const fundOffset = offsetActive ? Math.min(row.payment, cap, fundBalance) : 0;
    fundBalance = Math.max(0, fundBalance - fundOffset);
    if (fundBalance <= 0.01 && fund.monthlyDeposit < row.payment + fundLoanPayment && depletedMonth === null) {
      depletedMonth = row.month;
    }

    return {
      ...row,
      fundLoanRate,
      fundLoanPayment,
      fundLoanPaid,
      fundLoanBalance,
      fundOffset,
      commercialFundOffset: fundOffset,
      commercialCashOut: row.payment + row.prepay - fundOffset,
      cashOut: row.payment + row.prepay + fundLoanCashOut - fundOffset,
      fundBalance,
      fundDepletedMonth: depletedMonth,
    };
  });
}

function enrichPlanWithCashflow(plan, fund) {
  const schedule = applyFundOffset(plan.schedule, fund);
  const totalFundOffset = schedule.reduce((sum, row) => sum + row.commercialFundOffset, 0);
  const totalCashOut = schedule.reduce((sum, row) => sum + row.cashOut, 0);
  const firstCashOut = schedule[0]?.cashOut || 0;
  const firstYearRows = schedule.slice(0, 12);
  const avgFirstYearCashOut = firstYearRows.length ? firstYearRows.reduce((sum, row) => sum + row.cashOut, 0) / firstYearRows.length : 0;
  const currentDateIso = iso(new Date());
  const currentMonthIndex = schedule.findIndex((row) => compareIso(row.date, currentDateIso) >= 0);
  const recentYearRows = currentMonthIndex >= 0 ? schedule.slice(currentMonthIndex, currentMonthIndex + 12) : schedule.slice(-12);
  const avgRecentYearCashOut = recentYearRows.length ? recentYearRows.reduce((sum, row) => sum + row.cashOut, 0) / recentYearRows.length : 0;
  const currentYearStartIso = `${currentDateIso.slice(0, 4)}-01-01`;
  const currentYearCashOut = schedule
    .filter((row) => compareIso(row.date, currentYearStartIso) >= 0 && compareIso(row.date, currentDateIso) <= 0)
    .reduce((sum, row) => sum + row.cashOut, 0);
  const currentYearRows = schedule.filter((row) => compareIso(row.date, currentYearStartIso) >= 0 && compareIso(row.date, currentDateIso) <= 0);
  const accruedRows = schedule.filter((row) => compareIso(row.date, currentDateIso) <= 0);
  const accruedFundOffset = accruedRows.reduce((sum, row) => sum + row.commercialFundOffset, 0);
  const accruedCashOut = accruedRows.reduce((sum, row) => sum + row.cashOut, 0);
  const accruedCommercialCashOut = accruedRows.reduce((sum, row) => sum + row.commercialCashOut, 0);
  const commercialBreakdown = accruedRows.reduce(
    (totals, row) => {
      const scheduledPayment = row.principal + row.interest;
      const fundShare = scheduledPayment > 0 ? Math.min(1, row.commercialFundOffset / scheduledPayment) : 0;
      const fundPrincipal = row.principal * fundShare;
      const fundInterest = row.interest * fundShare;
      totals.fundPrincipal += fundPrincipal;
      totals.fundInterest += fundInterest;
      totals.cashPrincipal += row.principal - fundPrincipal + row.prepay;
      totals.cashInterest += row.interest - fundInterest;
      return totals;
    },
    { fundPrincipal: 0, fundInterest: 0, cashPrincipal: 0, cashInterest: 0 },
  );
  const currentYearCashBreakdown = currentYearRows.reduce(
    (totals, row) => {
      const scheduledPayment = row.principal + row.interest;
      const fundShare = scheduledPayment > 0 ? Math.min(1, row.commercialFundOffset / scheduledPayment) : 0;
      totals.principal += row.principal * (1 - fundShare) + row.prepay;
      totals.interest += row.interest * (1 - fundShare);
      return totals;
    },
    { principal: 0, interest: 0 },
  );
  const depletedMonth = schedule.find((row) => row.fundDepletedMonth)?.fundDepletedMonth || null;

  return {
    ...plan,
    schedule,
    totalFundOffset,
    totalCashOut,
    firstCashOut,
    avgFirstYearCashOut,
    avgRecentYearCashOut,
    currentYearCashOut,
    currentYearCashBreakdown,
    accruedFundOffset,
    accruedCashOut,
    accruedCommercialCashOut,
    commercialBreakdown,
    depletedMonth,
  };
}

function renderTable(rows) {
  els.scheduleBody.innerHTML = rows
    .slice(0, 420)
    .map(
      (row) => `<tr>
        <td>${row.month}</td>
        <td>${row.date}</td>
        <td>${row.annualRate.toFixed(2)}%</td>
        <td>${currency(row.payment)}</td>
        <td>${currency(row.principal)}</td>
        <td>${currency(row.interest)}</td>
        <td>${row.prepay ? `${currency(row.prepay)} ${row.prepayMode === "shortenTerm" ? "缩期" : "降月供"}` : "-"}</td>
        <td>${currency(row.fundLoanPayment || 0)}</td>
        <td>${currency(row.fundLoanPaid || 0)}</td>
        <td>${currency(row.commercialFundOffset || 0)}</td>
        <td>${currency(row.cashOut ?? row.payment + row.prepay)}</td>
        <td>${currency(row.fundBalance || 0)}</td>
        <td>${currency(row.balance)}</td>
      </tr>`,
    )
    .join("");
}

function drawChart(rows) {
  const canvas = els.chart;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfaf7";
  ctx.fillRect(0, 0, width, height);

  const pad = { left: 64, right: 72, top: 28, bottom: 48 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const maxMonth = Math.max(rows.length, 1);
  const maxBalance = Math.max(...rows.map((r) => r.balance), 1);
  const maxPayment = Math.max(...rows.map((r) => r.payment), 1);

  ctx.strokeStyle = "#dce2e0";
  ctx.lineWidth = 1;
  ctx.font = "13px Arial";
  ctx.fillStyle = "#6b747c";
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (plotH * i) / 4;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
    ctx.fillText(`${Math.round((maxBalance * (4 - i)) / 4 / 10000)}万`, 10, y + 4);
    ctx.fillText(`${Math.round((maxPayment * (4 - i)) / 4)}元`, width - pad.right + 10, y + 4);
  }

  if (rows.length) {
    const firstYear = parseDate(rows[0].date).getFullYear();
    const lastYear = parseDate(rows.at(-1).date).getFullYear();
    const yearStep = Math.max(1, Math.ceil((lastYear - firstYear + 1) / 8));
    ctx.fillStyle = "#6b747c";
    for (let year = firstYear; year <= lastYear; year += yearStep) {
      const rowIndex = rows.findIndex((row) => parseDate(row.date).getFullYear() >= year);
      if (rowIndex < 0) continue;
      const x = pad.left + (plotW * rowIndex) / Math.max(maxMonth - 1, 1);
      ctx.beginPath();
      ctx.moveTo(x, pad.top + plotH);
      ctx.lineTo(x, pad.top + plotH + 5);
      ctx.stroke();
      ctx.fillText(String(year), x - 16, pad.top + plotH + 20);
    }
  }

  function point(row, index, field, maxValue) {
    const x = pad.left + (plotW * index) / Math.max(maxMonth - 1, 1);
    const y = pad.top + plotH - (plotH * row[field]) / maxValue;
    return [x, y];
  }

  function line(color, field, maxValue) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    rows.forEach((row, index) => {
      const [x, y] = point(row, index, field, maxValue);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  line("#2f7d57", "balance", maxBalance);
  line("#2e6f9e", "payment", maxPayment);

  ctx.fillStyle = "#2f7d57";
  ctx.fillText("绿色：待还本金", pad.left, height - 18);
  ctx.fillStyle = "#2e6f9e";
  ctx.fillText("蓝色：商贷月供", pad.left + 140, height - 18);
}

function renderResult() {
  syncCommercialRateUi();
  const config = getInputs();
  const baseline = enrichPlanWithCashflow(calculatePlan(config, false), config.fund);
  const prepay = enrichPlanWithCashflow(calculatePlan(config, true), config.fund);
  latestResult = { config, baseline, prepay };
  const visiblePlan = prepay;
  const hasPrepays = config.prepays.length > 0;

  const saved = baseline.totalInterest - prepay.totalInterest;
  els.savedInterest.textContent = (saved / 10000).toFixed(2);
  els.totalInterest.textContent = currency(prepay.totalInterest);
  els.payoffDate.textContent = prepay.payoffDate;
  const changed = baseline.payoffMonth - prepay.payoffMonth;
  els.termChange.textContent = changed > 0 ? `缩短 ${changed} 期` : changed < 0 ? `增加 ${Math.abs(changed)} 期` : "不变";

  const lpr = getLpr(config.startIso);
  const currentDateIso = iso(new Date());
  const currentSpreadBps = valueFromHistory(config.spreadHistory, currentDateIso, config.spreadBps);
  const currentLprDate = latestCycleRepriceDate(currentDateIso, config.firstRepriceDate, config.repriceMonths);
  const currentCommercialRate = getCommercialAnnualRate(config, currentDateIso);
  els.shanghaiRuleInfo.textContent = `上海规则仅用于估算新发放商贷的初始利率下限：按放款日的 5 年期以上 LPR 加减政策点差。当前内置节点：2023-12-15 起首套 -10BP、二套其他区域 +30BP、差异化区域 +20BP；2024-05-28 起首套 -45BP、二套其他区域 -5BP、临港及嘉青松奉宝金 -25BP。本次按放款日匹配为 ${config.ruleNote}，修正后初始加点 ${formatBps(config.spreadBps)}。实际合同以银行记录为准。`;
  els.rateInfo.textContent = `商贷当前测算利率 ${currentCommercialRate.toFixed(2)}% = ${getLpr(currentLprDate).toFixed(2)}% LPR ${formatBps(currentSpreadBps)}；重定价周期于 ${config.cycleChangeDate || "未填写"} 从 ${config.priorRepriceMonths} 个月改为 ${config.repriceMonths} 个月，下一重定价日 ${config.firstRepriceDate || "未填写"}。放款日 LPR ${lpr.toFixed(2)}%。`;
  els.firstCashOut.textContent = currency(visiblePlan.firstCashOut);
  els.avgCashOut.textContent = (visiblePlan.currentYearCashOut / 10000).toFixed(2);
  els.currentYearCashBreakdown.textContent = `本金 ${(visiblePlan.currentYearCashBreakdown.principal / 10000).toFixed(2)} 万 · 利息 ${(visiblePlan.currentYearCashBreakdown.interest / 10000).toFixed(2)} 万`;
  els.totalFundOffset.textContent = (visiblePlan.accruedFundOffset / 10000).toFixed(2);
  els.fundOffsetBreakdown.textContent = `本金 ${(visiblePlan.commercialBreakdown.fundPrincipal / 10000).toFixed(2)} 万 · 利息 ${(visiblePlan.commercialBreakdown.fundInterest / 10000).toFixed(2)} 万`;
  els.accruedCashOut.textContent = (visiblePlan.accruedCommercialCashOut / 10000).toFixed(2);
  els.cashOutBreakdown.textContent = `本金 ${(visiblePlan.commercialBreakdown.cashPrincipal / 10000).toFixed(2)} 万 · 利息 ${(visiblePlan.commercialBreakdown.cashInterest / 10000).toFixed(2)} 万`;
  els.fundDepletedMonth.textContent = config.fund.enabled ? (visiblePlan.depletedMonth ? `第 ${visiblePlan.depletedMonth} 期` : "未用尽") : "未启用";
  const fundSummary = config.fund.enabled
    ? `使用公积金抵扣商贷后，今年以来自费支出为 ${(visiblePlan.currentYearCashOut / 10000).toFixed(2)} 万元。`
    : `未启用公积金抵扣商贷，今年以来自费支出为 ${(visiblePlan.currentYearCashOut / 10000).toFixed(2)} 万元。`;
  els.resultSummary.textContent = `按当前方案，预计可节省利息 ${(saved / 10000).toFixed(2)} 万元，还贷期限${els.termChange.textContent}；${fundSummary}`;
  els.detailMode.textContent = `${hasPrepays ? "含提前还款" : "无提前还款"}，${config.fund.enabled ? "含公积金月冲" : "未启用公积金月冲"}`;
  drawChart(visiblePlan.schedule);
  renderTable(visiblePlan.schedule);
}

function addPrepayRow(month = 36, amount = 30, mode = "shortenTerm") {
  const row = document.createElement("div");
  row.className = "prepay-row";
  row.innerHTML = `
    <label>第几期后还
      <input class="prepay-month" type="number" min="1" step="1" value="${month}" />
    </label>
    <label>金额（万元）
      <input class="prepay-amount" type="number" min="0" step="1" value="${amount}" />
    </label>
    <label>方式
      <select class="prepay-mode">
        <option value="shortenTerm"${mode === "shortenTerm" ? " selected" : ""}>缩短期限</option>
        <option value="reducePayment"${mode === "reducePayment" ? " selected" : ""}>减少月供</option>
      </select>
    </label>
    <button type="button" class="remove-prepay" title="删除" aria-label="删除">×</button>
  `;
  row.querySelector(".remove-prepay").addEventListener("click", () => {
    row.remove();
    renderResult();
  });
  row.addEventListener("input", renderResult);
  els.prepayList.appendChild(row);
}

function exportCsv() {
  if (!latestResult) return;
  const rows = latestResult.prepay.schedule;
  const header = ["期数", "日期", "年利率", "月供", "本金", "利息", "提前还款", "公积金贷款应还", "账户扣公积金贷", "账户抵充商贷", "自有现金支出", "公积金账户余额", "商贷剩余本金"];
  const body = rows.map((r) => [
    r.month,
    r.date,
    r.annualRate.toFixed(4),
    r.payment.toFixed(2),
    r.principal.toFixed(2),
    r.interest.toFixed(2),
    r.prepay.toFixed(2),
    (r.fundLoanPayment || 0).toFixed(2),
    (r.fundLoanPaid || 0).toFixed(2),
    (r.commercialFundOffset || 0).toFixed(2),
    (r.cashOut ?? r.payment + r.prepay).toFixed(2),
    (r.fundBalance || 0).toFixed(2),
    r.balance.toFixed(2),
  ]);
  const csv = [header, ...body].map((line) => line.join(",")).join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "现金流明细.csv";
  link.click();
  URL.revokeObjectURL(url);
}

document.querySelectorAll("[data-rate-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    setRateMode(button.dataset.rateMode);
    renderResult();
  });
});

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  renderResult();
});
els.form.addEventListener("input", renderResult);
[els.loanCity, els.homeType, els.startDate].forEach((input) => {
  input.addEventListener("change", () => {
    syncCommercialRateUi({ resetSpread: true, resetLpr: true });
    renderResult();
  });
});
[els.commercialAdjustmentDate, els.commercialPriorRepriceDate, els.commercialPriorRepriceMonths].forEach((input) => {
  input.addEventListener("change", () => {
    syncStockRateAdjustment({ resetAdjustmentLpr: true });
    renderResult();
  });
});
els.addPrepay.addEventListener("click", () => {
  addPrepayRow(60, 20, "reducePayment");
  renderResult();
});
els.exportCsv.addEventListener("click", exportCsv);
els.saveScenario.addEventListener("click", saveScenario);
els.loadScenario.addEventListener("click", loadScenario);
els.deleteScenario.addEventListener("click", deleteScenario);
els.exportScenarios.addEventListener("click", exportScenariosBackup);
els.importScenarios.addEventListener("change", importScenariosBackup);
els.fundLoanRateMode.addEventListener("change", () => {
  els.fundManualRateWrap.classList.toggle("hidden", els.fundLoanRateMode.value !== "manual");
  renderResult();
});
els.resetBtn.addEventListener("click", () => {
  setRateMode("auto");
  els.principal.value = 300;
  els.years.value = 30;
  els.startDate.value = "2024-06-15";
  els.repaymentType.value = "equalInstallment";
  els.loanCity.value = "shanghai";
  els.homeType.value = "first";
  els.repricing.value = "cycle";
  els.extraBps.value = 0;
  els.initialSpreadBps.value = "";
  els.initialLpr.value = "";
  els.manualRate.value = 3.5;
  els.manualRepricing.value = "none";
  els.commercialPriorRepriceMonths.value = 12;
  els.commercialPriorRepriceDate.value = "2024-08-30";
  els.commercialCycleChangeDate.value = "2024-11-12";
  els.commercialRepriceMonths.value = 3;
  els.commercialFirstRepriceDate.value = "";
  els.commercialAdjustmentDate.value = "2024-10-25";
  els.commercialAdjustmentLpr.value = "";
  els.commercialAdjustedBps.value = -30;
  els.commercialRateHistory.value = "2024-10-25=-30";
  els.fundEnabled.checked = true;
  els.fundBalance.value = 0;
  els.fundMonthly.value = 0;
  els.fundLoanStartDate.value = "2022-09-01";
  els.fundLoanPrincipal.value = 60;
  els.fundLoanTerm.value = 360;
  els.fundLoanRepaymentType.value = "equalPrincipal";
  els.fundLoanRateMode.value = "shanghaiFirst";
  els.fundManualRate.value = 2.6;
  els.fundRepriceMonths.value = 12;
  els.fundFirstRepriceDate.value = "2023-01-01";
  els.fundRateHistory.value = "2022-09-01=3.25\n2023-01-01=3.10\n2025-01-01=2.85\n2026-01-01=2.60";
  els.fundManualRateWrap.classList.add("hidden");
  els.fundStartMonth.value = 1;
  els.fundCap.value = 0;
  els.scenarioName.value = "";
  els.prepayList.innerHTML = "";
  addPrepayRow(36, 30, "shortenTerm");
  syncCommercialRateUi({ resetSpread: true, resetLpr: true, resetAdjustmentLpr: true });
  renderResult();
});

detectStorage();
renderSavedOptions();
addPrepayRow(36, 30, "shortenTerm");
syncCommercialRateUi({ resetSpread: true, resetLpr: true, resetAdjustmentLpr: true });
renderResult();
