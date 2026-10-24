const hasSpecialInstructionsCheckbox = document.getElementById(
  "has-special-instructions",
);

const instructionsContainer = document.getElementById("instructions-container");

function UpdateInstructionsVisiblity() {
  instructionsContainer.hidden = !hasSpecialInstructionsCheckbox.checked;
}

hasSpecialInstructionsCheckbox.addEventListener(
  "change",
  UpdateInstructionsVisiblity,
);
UpdateInstructionsVisiblity();