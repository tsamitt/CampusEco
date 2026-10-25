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
const modalInstructionsCheckbox = document.getElementById(
  "modal-has-special-instructions",
);
const modalInstructionsContainer = document.getElementById(
  "modal-instructions-container",
);

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

const packageModal = document.getElementById("package-modal");
const packageModalForm = document.getElementById("package-modal-form");

const modalFields = {
  barcode: document.getElementById("modal-barcode"),
  building: document.getElementById("modal-building"),
  locker: document.getElementById("modal-locker"),
  length: document.getElementById("modal-length"),
  width: document.getElementById("modal-width"),
  height: document.getElementById("modal-height"),
  weight: document.getElementById("modal-weight"),
  priority: document.getElementById("modal-priority"),
  status: document.getElementById("modal-status"),
  instructions: document.getElementById("modal-instructions"),
};

const modalBuildingError = document.getElementById("modal-building-error");
const packageModalError = document.getElementById("package-modal-error");
const modalSaveButton = document.getElementById("modal-save-button");
const modalCloseButton = document.getElementById("modal-close-button");

let editingBarcode = null;
let modalMode = "view";

function openPackageModal(barcode, mode) {
  const pkg = CampusEco.PackageStore.find(barcode);

  if (!pkg) {
    return;
  }

  editingBarcode = barcode;
  modalMode = mode;

  modalFields.barcode.value = pkg.barcode;
  modalFields.building.value = pkg.building;
  modalFields.locker.value = pkg.locker;
  modalFields.length.value = pkg.lengthIn;
  modalFields.width.value = pkg.widthIn;
  modalFields.height.value = pkg.heightIn;
  modalFields.weight.value = pkg.weightLb;
  modalFields.priority.value = pkg.priority;
  modalFields.status.value = pkg.status;
  modalFields.instructions.value = pkg.specialInstructions || "";
  modalInstructionsCheckbox.checked = Boolean(
    pkg.specialInstructions && pkg.specialInstructions.trim(),
  );

  modalInstructionsContainer.hidden = !modalInstructionsCheckbox.checked;

  const isReadOnly = mode === "view";

  Object.keys(modalFields).forEach(function (key) {
    if (key !== "barcode" && key !== "status") {
      modalFields[key].disabled = isReadOnly;
    }
  });
  modalInstructionsCheckbox.disabled = isReadOnly;

  modalSaveButton.hidden = isReadOnly;
  packageModalError.hidden = true;
  modalBuildingError.hidden = true;

  document.getElementById("package-modal-title").textContent = isReadOnly
    ? "View Package"
    : "Edit Package";

  packageModal.showModal();
}

modalInstructionsCheckbox.addEventListener("change", function () {
  modalInstructionsContainer.hidden = !modalInstructionsCheckbox.checked;

  if (!modalInstructionsCheckbox.checked) {
    modalFields.instructions.value = "";
  }
});
function closePackageModal() {
  packageModal.close();
  editingBarcode = null;
  modalMode = "view";
  packageModalForm.reset();
  packageModalError.hidden = true;
  modalBuildingError.hidden = true;
  modalInstructionsCheckbox.checked = false;
  modalInstructionsContainer.hidden = true;
  modalFields.instructions.value = "";
}

packageTableBody.addEventListener("click", function (event) {
  const button = event.target.closest("button[data-action]");

  if (!button || !packageTableBody.contains(button)) {
    return;
  }

  const action = button.dataset.action;
  const barcode = button.dataset.barcode;

  if (action === "view") {
    openPackageModal(barcode, "view");
  } else if (action === "edit") {
    openPackageModal(barcode, "edit");
  }
});

modalCloseButton.addEventListener("click", closePackageModal);

packageModal.addEventListener("click", function (event) {
  if (event.target === packageModal) {
    closePackageModal();
  }
});

packageModalForm.addEventListener("submit", function (event) {
  event.preventDefault();

  if (modalMode !== "edit" || !editingBarcode) {
    return;
  }

  if (!packageModalForm.reportValidity()) {
    return;
  }

  const building = modalFields.building.value.trim().toUpperCase();

  if (!CampusEco.BUILDINGS[building]) {
    modalBuildingError.hidden = false;
    modalFields.building.focus();
    return;
  }

  const pkg = CampusEco.PackageStore.find(editingBarcode);

  if (!pkg) {
    packageModalError.textContent =
      "This package could not be found. Refresh the dashboard and try again.";
    packageModalError.hidden = false;
    return;
  }

  pkg.building = building;
  pkg.locker = modalFields.locker.value;
  pkg.lengthIn = Number(modalFields.length.value);
  pkg.widthIn = Number(modalFields.width.value);
  pkg.heightIn = Number(modalFields.height.value);
  pkg.weightLb = Number(modalFields.weight.value);
  pkg.priority = modalFields.priority.value;
  pkg.specialInstructions = modalInstructionsCheckbox.checked
    ? modalFields.instructions.value.trim()
    : "";

  CampusEco.PackageStore.save(pkg);

  closePackageModal();
  renderDashboard();
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
