let originalData = [];
let filteredData = [];

const ITEMS_PER_PAGE = 20;
let currentPage = 1;

const topSellerSelect = document.getElementById("topSellerSelect");
const topSellersChartCanvas = document.getElementById("topSellersChart");

let topSellersChart = null;

const salesTable = document.getElementById("salesTable");
const pagination = document.getElementById("pagination");

const searchInput = document.getElementById("searchInput");
const paymentFilter = document.getElementById("paymentFilter");
const fileSelect = document.getElementById("fileSelect");

const totalSales = document.getElementById("totalSales");
const totalValue = document.getElementById("totalValue");
const totalDiscount = document.getElementById("totalDiscount");
const totalNet = document.getElementById("totalNet");

// Cache de CEP para evitar muitas requisições
const cepCache = {};

// Seus arquivos CSV fixos
const csvFiles = [
  { name: "2025", file: "data/vendas_2025.csv" },
  { name: "2026", file: "data/vendas_2026.csv" },
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

function formatDate(dateStr) {
  if (!dateStr) return "";

  const dateOnly = dateStr.split(" ")[0];
  const [year, month, day] = dateOnly.split("-");

  if (!year || !month || !day) return dateStr;

  return `${day}/${month}/${year}`;
}

function normalizeCEP(cep) {
  if (!cep) return "";
  return cep.toString().replace(/\D/g, "");
}

async function getCepLocation(cep) {
  const cleanCep = normalizeCEP(cep);

  if (!cleanCep || cleanCep.length !== 8) {
    return "CEP inválido";
  }

  if (cepCache[cleanCep]) {
    return cepCache[cleanCep];
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await response.json();

    if (data.erro) {
      cepCache[cleanCep] = "CEP inválido";
      return "CEP inválido";
    }

    const location = `${data.localidade} - ${data.uf}`;
    cepCache[cleanCep] = location;

    return location;
  } catch (err) {
    cepCache[cleanCep] = "CEP inválido";
    return "CEP inválido";
  }
}

async function loadCepLocations(data) {
  const uniqueCeps = [...new Set(data.map((item) => normalizeCEP(item["CEP"])))];

  for (const cep of uniqueCeps) {
    if (!cep || cep.length !== 8) {
      cepCache[cep] = "CEP inválido";
      continue;
    }

    if (!cepCache[cep]) {
      await getCepLocation(cep);
    }
  }

  renderTable(filteredData, currentPage);
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
        <td colspan="14" class="empty">Nenhum resultado encontrado.</td>
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

    const cep = item["CEP"] || "";
    const cleanCep = normalizeCEP(cep);
    const cepLocation = cepCache[cleanCep] || "Carregando...";

    tr.innerHTML = `
      <td>${item["SaleId"] || ""}</td>
      <td>${formatDate(item["Data da Venda"])}</td>
      <td>${item["Comprador"] || ""}</td>
      <td>${item["Email"] || ""}</td>
      <td>${item["Telefone"] || ""}</td>
      <td>${cep}</td>
      <td>${cepLocation}</td>
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
  renderTopSellersChart(filteredData);
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
  renderTopSellersChart(filteredData);

  await loadCepLocations(filteredData);
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

function renderTopSellersChart(data) {
  if (!topSellersChartCanvas) return;

  const topN = parseInt(topSellerSelect.value);

  const sellersMap = {};

  data.forEach((item) => {
    const seller = item["Emissor"]?.trim() || "Sem emissor";

    if (!sellersMap[seller]) {
      sellersMap[seller] = 0;
    }

    sellersMap[seller] += 1;
  });

  const sellersArray = Object.entries(sellersMap)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, topN);

  const labels = sellersArray.map((s) => s.name);
  const values = sellersArray.map((s) => s.total);

  if (topSellersChart) {
    topSellersChart.destroy();
  }

  topSellersChart = new Chart(topSellersChartCanvas, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Quantidade de Vendas",
          data: values,
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
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

topSellerSelect.addEventListener("change", () => {
  renderTopSellersChart(filteredData);
});

window.addEventListener("DOMContentLoaded", () => {
  loadAllFilesInSelect();
});