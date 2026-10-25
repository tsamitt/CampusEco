const hasSpecialInstructionsCheckbox = document.getElementById(
  "has-special-instructions",
);
const barcodeError = document.getElementById("barcode-error");
const buildingError = document.getElementById("building-code-error");

const instructionsContainer = document.getElementById("instructions-container");

function updateInstructionsVisibility() {
  instructionsContainer.hidden = !hasSpecialInstructionsCheckbox.checked;
}

hasSpecialInstructionsCheckbox.addEventListener(
  "change",
  updateInstructionsVisibility,
);

updateInstructionsVisibility();

("use strict");

const packageForm = document.querySelector("main form");

const barcodeInput = document.getElementById("barcode");
const lengthInput = document.getElementById("length");
const widthInput = document.getElementById("width");
const heightInput = document.getElementById("height");
const weightInput = document.getElementById("weight");
const buildingInput = document.getElementById("building-code");
const lockerInput = document.getElementById("locker");
const instructionsCheckbox = document.getElementById(
  "has-special-instructions",
);
const instructionsInput = document.getElementById("instructions");

packageForm.addEventListener("submit", function (event) {
  event.preventDefault();

  if (!packageForm.reportValidity()) {
    return;
  }

  const barcode = barcodeInput.value.trim();
  const building = buildingInput.value.trim().toUpperCase();

  const selectedPriority = packageForm.querySelector(
    'input[name="priority"]:checked',
  );

  const specialInstructions = instructionsCheckbox.checked
    ? instructionsInput.value.trim()
    : "";

  if (!CampusEco.BUILDINGS[building]) {
    buildingError.textContent = "Please enter a valid campus building code.";
    buildingError.hidden = false;

    buildingInput.focus();
    return;
  }

  buildingError.hidden = true;

  const newPackage = new CampusEco.Package({
    barcode: barcode,
    building: building,
    locker: lockerInput.options[lockerInput.selectedIndex].text,
    lengthIn: Number(lengthInput.value),
    widthIn: Number(widthInput.value),
    heightIn: Number(heightInput.value),
    weightLb: Number(weightInput.value),
    priority:
      selectedPriority.value.charAt(0).toUpperCase() +
      selectedPriority.value.slice(1).toLowerCase(),
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
    barcodeError.textContent =
      "A package with this tracking barcode already exists.";
    barcodeError.hidden = false;

    barcodeInput.focus();
    return;
  }
    barcodeError.hidden = true;
  // Return to the operator dashboard after successful check-in.
  window.location.href = "operatorMain.html";
});
