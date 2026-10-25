"use strict";

const packageTableBody = document.getElementById("package-table-body");
const urgentTableBody = document.getElementById("urgent-table-body");

const searchForm = document.getElementById("package-search-form");
const searchInput = document.getElementById("package-search");
const searchMessage = document.getElementById("search-message");
const actionBanner = document.getElementById("action-banner");
const actionBannerMessage = document.getElementById("action-banner-message");
const confirmActionButton = document.getElementById("confirm-action-button");
const dismissActionButton = document.getElementById("dismiss-action-button");

let pendingAction = null;
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
      return (
        pkg.priority.toLowerCase() === "urgent" && pkg.status !== "Cancelled"
      );
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
packageTableBody.addEventListener("click", function (event) {
  const button = event.target.closest("button[data-action]");

  if (!button || !packageTableBody.contains(button)) {
    return;
  }

  if (button.dataset.action !== "cancel") {
    return;
  }

  const barcode = button.dataset.barcode;

  showActionBanner({
    message: `Are you sure you want to cancel package ${barcode}?`,
    confirmText: "Confirm Cancellation",

    onConfirm: function () {
      const pkg = CampusEco.PackageStore.find(barcode);

      if (!pkg || pkg.status === "Delivered" || pkg.status === "Cancelled") {
        renderDashboard();
        return;
      }

      pkg.setStatus("Cancelled");
      CampusEco.PackageStore.save(pkg);

      renderDashboard();
    },
  });
});
function showActionBanner({ message, confirmText, onConfirm }) {
  pendingAction = onConfirm;

  actionBannerMessage.textContent = message;
  confirmActionButton.textContent = confirmText || "Confirm";

  actionBanner.hidden = false;
  confirmActionButton.focus();
}

function hideActionBanner() {
  pendingAction = null;
  actionBanner.hidden = true;
}

confirmActionButton.addEventListener("click", function () {
  if (!pendingAction) {
    return;
  }

  const action = pendingAction;

  hideActionBanner();
  action();
});

dismissActionButton.addEventListener("click", function () {
  hideActionBanner();
});
