const searchForm = document.getElementById("package-search-form");
const searchInput = document.getElementById("package-search");
const packageTable = document.getElementById("package-activity-table");
const searchMessage = document.getElementById("search-message");

function searchPackages() {
  const searchValue = searchInput.value.trim().toLowerCase();
  const packageRows = packageTable.querySelectorAll("tbody tr");

  let matchingPackages = 0;

  packageRows.forEach(function (currentRow) {
    const trackingBarcode = currentRow.cells[0].textContent.trim().toLowerCase();

    let matches = trackingBarcode.includes(searchValue);

    currentRow.hidden = !matches;

    if (matches) {
      matchingPackages++;
    }
  });

  if (matchingPackages === 0) {
    searchMessage.textContent = "No matching packages found. Please try again with another barcode.";
    searchMessage.hidden = false;
  } else {
    searchMessage.hidden = true;
  }
}

searchForm.addEventListener("submit", function (event) {
  event.preventDefault();
  searchPackages();
});
