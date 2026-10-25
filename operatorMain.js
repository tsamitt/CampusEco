"use strict";

const packageTableBody = document.getElementById("package-table-body");
const urgentTableBody = document.getElementById("urgent-table-body");

const searchForm = document.getElementById("package-search-form");
const searchInput = document.getElementById("package-search");
const searchMessage = document.getElementById("search-message");

function formatPriority(priority) {
  const value = String(priority || "");
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function createCell(value) {
  const cell = document.createElement("td");
  cell.textContent = value ?? "";
  return cell;
}

function renderPackageTable() {
  const packages = CampusEco.PackageStore.all();
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
    row.appendChild(
      createCell(
        CampusEco.BUILDINGS[pkg.building] ? pkg.building : pkg.building,
      ),
    );
    row.appendChild(createCell(pkg.locker));
    row.appendChild(
      createCell(`${pkg.lengthIn} x ${pkg.widthIn} x ${pkg.heightIn} ″`),
    );
    row.appendChild(createCell(`${pkg.weightLb} lb`));
    row.appendChild(createCell(formatPriority(pkg.priority)));
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

  searchMessage.textContent = "No matching packages found.";
  searchMessage.hidden = matchingPackages !== 0;
}

function renderUrgentTable() {
  const packages = CampusEco.PackageStore.all();

  urgentTableBody.replaceChildren();

  packages
    .filter(function (pkg) {
      return pkg.priority.toLowerCase() === "urgent";
    })
    .forEach(function (pkg) {
      const row = document.createElement("tr");

      row.appendChild(createCell(pkg.barcode));
      row.appendChild(createCell(pkg.building));
      row.appendChild(createCell(pkg.locker));
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

renderDashboard();
