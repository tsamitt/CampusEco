
"use strict";

const hasSpecialInstructionsCheckbox = $("#has-special-instructions");
const barcodeError = $("#barcode-error");
const buildingError = $("#building-code-error");

const instructionsContainer = $("#instructions-container");

function updateInstructionsVisibility() {
  instructionsContainer.prop(
    "hidden",
    !hasSpecialInstructionsCheckbox.is(":checked"),
  );
}

hasSpecialInstructionsCheckbox.on(
  "change",
  updateInstructionsVisibility,
);

updateInstructionsVisibility();

const packageForm = $("main form");

const barcodeInput = $("#barcode");
const lengthInput = $("#length");
const widthInput = $("#width");
const heightInput = $("#height");
const weightInput = $("#weight");
const buildingInput = $("#building-code");
const lockerInput = $("#locker");
const instructionsCheckbox = $("#has-special-instructions");
const instructionsInput = $("#instructions");

packageForm.on("submit", function (event) {
  event.preventDefault();

  if (!this.reportValidity()) {
    return;
  }

  const barcode = barcodeInput.val().trim();
  const building = buildingInput.val().trim().toUpperCase();

  const selectedPriority = packageForm.find(
    'input[name="priority"]:checked',
  );

  const specialInstructions = instructionsCheckbox.is(":checked")
    ? instructionsInput.val().trim()
    : "";

  if (!CampusEco.BUILDINGS[building]) {
    buildingError.text("Please enter a valid campus building code.");
    buildingError.prop("hidden", false);

    buildingInput.trigger("focus");
    return;
  }

  buildingError.prop("hidden", true);

  const newPackage = new CampusEco.Package({
    barcode: barcode,
    building: building,
    locker: lockerInput.find("option:selected").text(),
    lengthIn: Number(lengthInput.val()),
    widthIn: Number(widthInput.val()),
    heightIn: Number(heightInput.val()),
    weightLb: Number(weightInput.val()),
    priority:
      selectedPriority.val().charAt(0).toUpperCase() +
      selectedPriority.val().slice(1).toLowerCase(),
    status: "Checked In",
    mine: true,
    history: [
      {
        status: "Checked In",
        at: new Date().toISOString(),
      },
    ],
  });

  newPackage.specialInstructions = specialInstructions;

  const saved = CampusEco.PackageStore.add(newPackage);

  if (!saved) {
    barcodeError.text(
      "A package with this tracking barcode already exists.",
    );
    barcodeError.prop("hidden", false);

    barcodeInput.trigger("focus");
    return;
  }

  barcodeError.prop("hidden", true);
  window.location.href = "operatorMain.html";
});
