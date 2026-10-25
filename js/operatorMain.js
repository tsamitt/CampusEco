"use strict";

const packageTableBody = $("#package-table-body");
const urgentTableBody = $("#urgent-table-body");

const searchForm = $("#package-search-form");
const searchInput = $("#package-search");
const searchMessage = $("#search-message");
const actionBanner = $("#action-banner");
const actionBannerMessage = $("#action-banner-message");
const confirmActionButton = $("#confirm-action-button");
const dismissActionButton = $("#dismiss-action-button");
const modalInstructionsCheckbox = $("#modal-has-special-instructions");
const modalInstructionsContainer = $("#modal-instructions-container");
const buildingFilter = $("#package-building-filter");
const statusFilter = $("#package-status-filter");
const clearFiltersButton = $("#clear-package-filters");

let pendingAction = null;

function priorityBadge(priority) {
  const value = String(priority || "");
  const form = value.toLowerCase();

  return $("<span>")
    .addClass("badge priority-" + form)
    .text(formatPriority(value));
}

function statusBadge(status) {
  const value = String(status || "");
  const form = value.toLowerCase().replace(/\s+/g, "-");

  return $("<span>")
    .addClass("badge badge-" + form)
    .text(value);
}

function formatPriority(priority) {
  const value = String(priority || "");
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function createCell(value) {
  return $("<td>").text(value ?? "");
}

function renderPackageTable() {
  const packages = CampusEco.PackageStore.all();

  const searchValue = searchInput.val().trim().toLowerCase();
  const buildingValue = buildingFilter.val().trim().toUpperCase();

  const statusValue = statusFilter.val().trim().toLowerCase();

  packageTableBody.empty();

  let matchingPackages = 0;

  packages.forEach(function (pkg) {
    if (!pkg.barcode.toLowerCase().includes(searchValue)) {
      return;
    }

    if (buildingValue && String(pkg.building).toUpperCase() !== buildingValue) {
      return;
    }

    if (statusValue && String(pkg.status).toLowerCase() !== statusValue) {
      return;
    }

    matchingPackages++;

    const row = $("<tr>");

    row.append(createCell(pkg.barcode));
    row.append(createCell(pkg.building));
    row.append(createCell(pkg.locker));
    row.append(
      createCell(`${pkg.lengthIn} x ${pkg.widthIn} x ${pkg.heightIn} ″`),
    );
    row.append(createCell(`${pkg.weightLb} lb`));
    row.append($("<td>").append(priorityBadge(pkg.priority)));
    row.append($("<td>").append(statusBadge(pkg.status)));

    const actionsCell = $("<td>");

    ["View", "Edit", "Cancel"].forEach(function (action) {
      const button = $("<button>", {
        type: "button",
        text: action,
      });

      button.attr("data-action", action.toLowerCase());
      button.attr("data-barcode", pkg.barcode);

      actionsCell.append(button);
      actionsCell.append(" ");
    });

    row.append(actionsCell);
    packageTableBody.append(row);
  });

  searchMessage
    .text("No matching packages found.")
    .prop("hidden", matchingPackages !== 0);
}

function renderUrgentTable() {
  const packages = CampusEco.PackageStore.all();

  urgentTableBody.empty();

  packages
    .filter(function (pkg) {
      return (
        pkg.priority.toLowerCase() === "urgent" && pkg.status !== "Cancelled"
      );
    })
    .forEach(function (pkg) {
      const row = $("<tr>");

      row.append(createCell(pkg.barcode));
      row.append(createCell(pkg.building));
      row.append(createCell(pkg.locker));
      row.append($("<td>").append(statusBadge(pkg.status)));

      urgentTableBody.append(row);
    });
}

function renderDashboard() {
  renderPackageTable();
  renderUrgentTable();
}

const toggleFiltersButton = $("#toggle-package-filters");

toggleFiltersButton.on("click", function () {
  const isExpanded = $(this).attr("aria-expanded") === "true";

  $("#package-search-form").stop(true, true).slideToggle(250);

  $(this)
    .attr("aria-expanded", String(!isExpanded))
    //looked it up and these &#9662 &#9652 are the way to get the up and down symbols in html.
    .html(isExpanded ? "Filter Packages &#9662;" : "Hide Filters &#9652;");
});

searchForm.on("submit", function (event) {
  event.preventDefault();
  renderPackageTable();
});

clearFiltersButton.on("click", function () {
  searchInput.val("");
  buildingFilter.val("");
  statusFilter.val("");

  renderPackageTable();
});

const packageModal = $("#package-modal");
const packageModalForm = $("#package-modal-form");

const modalFields = {
  barcode: $("#modal-barcode"),
  building: $("#modal-building"),
  locker: $("#modal-locker"),
  length: $("#modal-length"),
  width: $("#modal-width"),
  height: $("#modal-height"),
  weight: $("#modal-weight"),
  priority: $("#modal-priority"),
  status: $("#modal-status"),
  instructions: $("#modal-instructions"),
};

const modalBuildingError = $("#modal-building-error");
const packageModalError = $("#package-modal-error");
const modalSaveButton = $("#modal-save-button");
const modalCloseButton = $("#modal-close-button");

let editingBarcode = null;
let modalMode = "view";

function openPackageModal(barcode, mode) {
  const pkg = CampusEco.PackageStore.find(barcode);

  if (!pkg) {
    return;
  }

  editingBarcode = barcode;
  modalMode = mode;

  modalFields.barcode.val(pkg.barcode);
  modalFields.building.val(pkg.building);
  modalFields.locker.val(pkg.locker);
  modalFields.length.val(pkg.lengthIn);
  modalFields.width.val(pkg.widthIn);
  modalFields.height.val(pkg.heightIn);
  modalFields.weight.val(pkg.weightLb);
  modalFields.priority.val(pkg.priority);
  modalFields.status.val(pkg.status);
  modalFields.instructions.val(pkg.specialInstructions || "");

  modalInstructionsCheckbox.prop(
    "checked",
    Boolean(pkg.specialInstructions && pkg.specialInstructions.trim()),
  );

  modalInstructionsContainer.prop(
    "hidden",
    !modalInstructionsCheckbox.is(":checked"),
  );

  const isReadOnly = mode === "view";

  Object.keys(modalFields).forEach(function (key) {
    if (key !== "barcode" && key !== "status") {
      modalFields[key].prop("disabled", isReadOnly);
    }
  });

  modalInstructionsCheckbox.prop("disabled", isReadOnly);

  modalSaveButton.prop("hidden", isReadOnly);
  packageModalError.prop("hidden", true);
  modalBuildingError.prop("hidden", true);

  $("#package-modal-title").text(isReadOnly ? "View Package" : "Edit Package");

  packageModal[0].showModal();
}

modalInstructionsCheckbox.on("change", function () {
  modalInstructionsContainer.prop(
    "hidden",
    !modalInstructionsCheckbox.is(":checked"),
  );

  if (!modalInstructionsCheckbox.is(":checked")) {
    modalFields.instructions.val("");
  }
});

function closePackageModal() {
  packageModal[0].close();
  editingBarcode = null;
  modalMode = "view";
  packageModalForm[0].reset();
  packageModalError.prop("hidden", true);
  modalBuildingError.prop("hidden", true);
  modalInstructionsCheckbox.prop("checked", false);
  modalInstructionsContainer.prop("hidden", true);
  modalFields.instructions.val("");
}

packageTableBody.on("click", "button[data-action]", function () {
  const button = $(this);
  const action = button.attr("data-action");
  const barcode = button.attr("data-barcode");

  if (action === "view") {
    openPackageModal(barcode, "view");
  } else if (action === "edit") {
    openPackageModal(barcode, "edit");
  }
});
// don't mess this up
modalCloseButton.on("click", closePackageModal);

packageModal.on("click", function (event) {
  if (event.target === this) {
    closePackageModal();
  }
});

packageModalForm.on("submit", function (event) {
  event.preventDefault();

  if (modalMode !== "edit" || !editingBarcode) {
    return;
  }

  if (!this.reportValidity()) {
    return;
  }

  const building = modalFields.building.val().trim().toUpperCase();

  if (!CampusEco.BUILDINGS[building]) {
    modalBuildingError.prop("hidden", false);
    modalFields.building.trigger("focus");
    return;
  }

  const pkg = CampusEco.PackageStore.find(editingBarcode);

  if (!pkg) {
    packageModalError
      .text(
        "This package could not be found. Refresh the dashboard and try again.",
      )
      .prop("hidden", false);
    return;
  }

  pkg.building = building;
  pkg.locker = modalFields.locker.val();
  pkg.lengthIn = Number(modalFields.length.val());
  pkg.widthIn = Number(modalFields.width.val());
  pkg.heightIn = Number(modalFields.height.val());
  pkg.weightLb = Number(modalFields.weight.val());
  pkg.priority = modalFields.priority.val();
  pkg.specialInstructions = modalInstructionsCheckbox.is(":checked")
    ? modalFields.instructions.val().trim()
    : "";

  CampusEco.PackageStore.save(pkg);

  closePackageModal();
  renderDashboard();
});

renderDashboard();

packageTableBody.on("click", "button[data-action='cancel']", function () {
  const barcode = $(this).attr("data-barcode");

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

  actionBannerMessage.text(message);
  confirmActionButton.text(confirmText || "Confirm");

  actionBanner.prop("hidden", false);
  confirmActionButton.trigger("focus");
}

function hideActionBanner() {
  pendingAction = null;
  actionBanner.prop("hidden", true);
}

confirmActionButton.on("click", function () {
  if (!pendingAction) {
    return;
  }

  const action = pendingAction;

  hideActionBanner();
  action();
});

dismissActionButton.on("click", function () {
  hideActionBanner();
});
