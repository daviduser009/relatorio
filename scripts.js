let originalData = [];
let filteredData = [];

const ITEMS_PER_PAGE = 20;
let currentPage = 1;

const salesTable = document.getElementById("salesTable");
const pagination = document.getElementById("pagination");

const searchInput = document.getElementById("searchInput");
const paymentFilter = document.getElementById("paymentFilter");
const fileSelect = document.getElementById("fileSelect");

const totalSales = document.getElementById("totalSales");
const totalValue = document.getElementById("totalValue");
const totalDiscount = document.getElementById("totalDiscount");
const totalNet = document.getElementById("totalNet");

// Seus arquivos CSV fixos
const csvFiles = [
  { name: "17/11/2023 - 30/06/2024", file: "data/vendas_01.csv" },
  { name: "01/07/2024 - 31/12/2024", file: "data/vendas_02.csv" },
  { name: "01/01/2025 - 30/06/2025", file: "data/vendas_03.csv" },
  { name: "01/07/2025 - 31/12/2025", file: "data/vendas_04.csv" },
  { name: "01/01/2026 - 30/06/2026", file: "data/vendas_05.csv" },
];

function formatMoney(value) {
  const number = parseFloat(value) || 0;
  return number.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getNumber(value) {
  return parseFloat(value) || 0;
}

function updateSummary(data) {
  totalSales.textContent = data.length;

  let totalSessionsValue = 0;
  let totalDiscountValue = 0;

  data.forEach((item) => {
    totalSessionsValue += getNumber(item["Valor Sessões"]);
    totalDiscountValue += getNumber(item["Valor desconto"]);
  });

  const net = totalSessionsValue - totalDiscountValue;

  totalValue.textContent = formatMoney(totalSessionsValue);
  totalDiscount.textContent = formatMoney(totalDiscountValue);
  totalNet.textContent = formatMoney(net);
}

function populatePaymentFilter(data) {
  const payments = [...new Set(data.map((item) => item["Forma de pagamento"]))];

  paymentFilter.innerHTML = `<option value="">Todas</option>`;

  payments.forEach((payment) => {
    if (payment && payment.trim() !== "") {
      const option = document.createElement("option");
      option.value = payment;
      option.textContent = payment;
      paymentFilter.appendChild(option);
    }
  });
}

function renderTable(data, page = 1) {
  salesTable.innerHTML = "";

  if (data.length === 0) {
    salesTable.innerHTML = `
      <tr>
        <td colspan="13" class="empty">Nenhum resultado encontrado.</td>
      </tr>
    `;
    pagination.innerHTML = "";
    return;
  }

  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;

  const pageData = data.slice(startIndex, endIndex);

  pageData.forEach((item) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${item["SaleId"] || ""}</td>
      <td>${item["Data da Venda"] || ""}</td>
      <td>${item["Comprador"] || ""}</td>
      <td>${item["Email"] || ""}</td>
      <td>${item["Telefone"] || ""}</td>
      <td>${item["CEP"] || ""}</td>
      <td>${item["Documento Comprador"] || ""}</td>
      <td>${item["Tipo de acesso"] || ""}</td>
      <td>${item["Qtd Sessões"] || ""}</td>
      <td>${formatMoney(item["Valor Sessões"] || 0)}</td>
      <td>${formatMoney(item["Valor desconto"] || 0)}</td>
      <td>${item["Forma de pagamento"] || ""}</td>
      <td>${item["Emissor"] || ""}</td>
    `;

    salesTable.appendChild(tr);
  });

  renderPagination(data, page);
}

function renderPagination(data, page) {
  pagination.innerHTML = "";

  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);

  if (totalPages <= 1) return;

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "◀";
  prevBtn.disabled = page === 1;
  prevBtn.addEventListener("click", () => {
    currentPage--;
    renderTable(filteredData, currentPage);
  });

  pagination.appendChild(prevBtn);

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;

    if (i === page) btn.classList.add("active");

    btn.addEventListener("click", () => {
      currentPage = i;
      renderTable(filteredData, currentPage);
    });

    pagination.appendChild(btn);
  }

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "▶";
  nextBtn.disabled = page === totalPages;
  nextBtn.addEventListener("click", () => {
    currentPage++;
    renderTable(filteredData, currentPage);
  });

  pagination.appendChild(nextBtn);
}

function applyFilters() {
  const search = searchInput.value.toLowerCase();
  const payment = paymentFilter.value;

  filteredData = originalData.filter((item) => {
    const matchSearch =
      (item["SaleId"] || "").toLowerCase().includes(search) ||
      (item["Comprador"] || "").toLowerCase().includes(search) ||
      (item["Email"] || "").toLowerCase().includes(search) ||
      (item["Telefone"] || "").toLowerCase().includes(search);

    const matchPayment = payment === "" || item["Forma de pagamento"] === payment;

    return matchSearch && matchPayment;
  });

  currentPage = 1;

  updateSummary(filteredData);
  renderTable(filteredData, currentPage);
}

async function loadCSV(filePath) {
  const response = await fetch(filePath);

  if (!response.ok) {
    alert("Erro ao carregar o arquivo: " + filePath);
    return;
  }

  const csvText = await response.text();

  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  originalData = parsed.data;
  filteredData = [...originalData];

  currentPage = 1;

  updateSummary(filteredData);
  populatePaymentFilter(filteredData);
  renderTable(filteredData, currentPage);
}

function loadAllFilesInSelect() {
  fileSelect.innerHTML = `<option value="">Selecione um arquivo...</option>`;

  csvFiles.forEach((file) => {
    const option = document.createElement("option");
    option.value = file.file;
    option.textContent = file.name;
    fileSelect.appendChild(option);
  });
}

fileSelect.addEventListener("change", async () => {
  const selectedFile = fileSelect.value;
  if (!selectedFile) return;

  searchInput.value = "";
  paymentFilter.value = "";

  await loadCSV(selectedFile);
});

searchInput.addEventListener("input", applyFilters);
paymentFilter.addEventListener("change", applyFilters);

window.addEventListener("DOMContentLoaded", () => {
  loadAllFilesInSelect();
});