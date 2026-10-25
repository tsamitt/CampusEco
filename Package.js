class Package {
  constructor({
    barcode,
    length,
    width,
    height,
    weight,
    building,
    locker,
    priority = "standard",
    status = "Checked In",
    instructions = ""
  }) {
    this.barcode = barcode;
    this.length = Number(length);
    this.width = Number(width);
    this.height = Number(height);
    this.weight = Number(weight);
    this.building = building;
    this.locker = locker;
    this.priority = priority;
    this.status = status;
    this.instructions = instructions;
  }

  getDimensions() {
    return `${this.length} x ${this.width} x ${this.height} ″`;
  }

  getLockerName() {
    const lockerNames = {
      "locker-a": "Locker Array 1",
      "locker-b": "Locker Array 2",
      "locker-c": "Locker Array 3"
    };

    return lockerNames[this.locker] || this.locker;
  }

  isUrgent() {
    return this.priority.toLowerCase() === "urgent";
  }
}

const STORAGE_KEY = "campusEcoPackages";

function getPackages() {
  const storedPackages = localStorage.getItem(STORAGE_KEY);

  if (!storedPackages) {
    return [];
  }

  return JSON.parse(storedPackages).map(
    packageData => new Package(packageData)
  );
}

function savePackages(packages) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(packages)
  );
}
