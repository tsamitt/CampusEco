const packageTableBody = document.getElementById("package-table-body");
const urgentTableBody = document.getElementById("urgent-table-body");

const searchForm = document.getElementById("package-search-form");
const searchInput = document.getElementById("package-search");
const searchMessage = document.getElementById("search-message");

function initializePackages() {
  if (localStorage.getItem(STORAGE_KEY) === null) {
    const samplePackages = [
      new Package({
        barcode: "1234-5678-9012",
        length: 12,
        width: 10,
        height: 8,
        weight: 8.5,
        building: "AH",
        locker: "locker-a",
        priority: "standard",
        status: "Checked In",
      }),
      new Package({
        barcode: "1111-2222-3333",
        length: 18,
        width: 14,
        height: 10,
        weight: 15.2,
        building: "CS",
        locker: "locker-b",
        priority: "urgent",
        status: "Awaiting Pickup",
      }),
      new Package({
        barcode: "3333-4444-5555",
        length: 8,
        width: 8,
        height: 6,
        weight: 4.7,
        building: "AH",
        locker: "locker-c",
        priority: "low",
        status: "Loaded",
      }),
      new Package({
        barcode: "3141-5926-5358",
        length: 24,
        width: 18,
        height: 12,
        weight: 32.4,
        building: "FH",
        locker: "locker-a",
        priority: "urgent",
        status: "On the Way",
      }),
    ];

    savePackages(samplePackages);
  }
}

function createCell(value) {
  const cell = document.createElement("td");
  cell.textContent = value;
  return cell;
}

function renderPackageTable() {
  const packages = getPackages();
  const searchValue = searchInput.value.trim().toLowerCase();

  packageTableBody.replaceChildren();

  let matchingPackages = 0;

  packages.forEach(function (pkg) {
    if (!pkg.barcode.toLowerCase().includes(searchValue)) {
      return;
    }

    matchingPackages++;

    const row = document.createElement("tr");

    row.appendChild(createCell(pkg.barcode));
    row.appendChild(createCell(pkg.building));
    row.appendChild(createCell(pkg.getLockerName()));
    row.appendChild(createCell(pkg.getDimensions()));
    row.appendChild(createCell(`${pkg.weight} lb`));
    const properlyCasedPriority =
      pkg.priority.charAt(0).toUpperCase() + pkg.priority.slice(1);
    row.appendChild(createCell(properlyCasedPriority));

    row.appendChild(createCell(pkg.status));

    const actionsCell = document.createElement("td");

    ["View", "Edit", "Cancel"].forEach(function (action) {
      const button = document.createElement("button");

      button.type = "button";
      button.textContent = action;
      button.dataset.action = action.toLowerCase();
      button.dataset.barcode = pkg.barcode;

      actionsCell.appendChild(button);
      actionsCell.appendChild(document.createTextNode(" "));
    });

    row.appendChild(actionsCell);
    packageTableBody.appendChild(row);
  });

  searchMessage.textContent = "No matching packages found. Please try again with another barcode.";
  searchMessage.hidden = matchingPackages !== 0;
}

function renderUrgentTable() {
  const packages = getPackages();

  urgentTableBody.replaceChildren();

  packages
    .filter(function (pkg) {
      return pkg.isUrgent();
    })
    .forEach(function (pkg) {
      const row = document.createElement("tr");

      row.appendChild(createCell(pkg.barcode));
      row.appendChild(createCell(pkg.building));
      row.appendChild(createCell(pkg.getLockerName()));
      row.appendChild(createCell(pkg.status));

      urgentTableBody.appendChild(row);
    });
}

function renderDashboard() {
  renderPackageTable();
  renderUrgentTable();
}

searchForm.addEventListener("submit", function (event) {
  event.preventDefault();
  renderPackageTable();
});

initializePackages();
renderDashboard();
