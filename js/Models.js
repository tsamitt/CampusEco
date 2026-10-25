(function (window) {
  "use strict";

  // ---------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------
  const STORAGE = {
    packages: "campuseco.packages",
    prefs: "campuseco.preferences",
    lastRead: "campuseco.notificationsLastRead",
    version: "campuseco.dataVersion",
  };
  const DATA_VERSION = "2"; // bump this if the shape of the seed data changes

  // Delivery milestones shown on the timeline, in order.
  const STAGES = ["Checked In", "Loaded", "En Route", "Delivered"];

  // Every status maps to one of the four stages above.
  const STATUS_STAGE = {
    "Checked In": 0,
    "Awaiting Pickup": 0,
    Loaded: 1,
    "En Route": 2,
    Delivered: 3,
  };

  // Building codes from the campus map key.
  const BUILDINGS = {
    AF: "Alumni Foundation Center",
    AH: "Armstrong Hall",
    CC: "Carkoski Commons",
    CR: "Crawford Residence Community",
    CS: "Clinical Sciences Building",
    FH: "Ford Hall",
    GP: "Generator Plant",
    HC: "Highland Center",
    HN: "Highland Center North",
    JS: "Julia A. Sears Residence Community",
    MC: "McElroy Residence Community",
    MF: "Myers Field House",
    MH: "Morris Hall",
    ML: "Memorial Library",
    NH: "Nelson Hall",
    PA: "Earley Center for Performing Arts",
    PH: "Pennington Hall",
    PS: "Margaret R. Preska Residence Community",
    SU: "Centennial Student Union",
    TC: "Taylor Center",
    TE: "Trafton Science Center E",
    TN: "Trafton Science Center N",
    TR: "Trafton Science Center",
    TS: "Trafton Science Center S",
    UP: "Utility Plant",
    WA: "Wigley Administration Center",
    WC: "Wiecking Center",
    WH: "Wissink Hall",
  };

  // ---------------------------------------------------------------------
  // Map and route data
  // x and y are pixel positions on map.png (1532 x 717).
  // ---------------------------------------------------------------------
  const MAP = { width: 1532, height: 717, milesPerPixel: 0.00075 };

  // Points the cart passes through on its way from the Central Hub.
  const POINTS = {
    H: { x: 105, y: 335, where: "Central Hub, West Road", near: "UP" },
    A: {
      x: 190,
      y: 332,
      where: "Maywood Avenue near the Utility Plant",
      near: "UP",
    },
    B: {
      x: 385,
      y: 333,
      where: "Maywood Avenue near Memorial Library",
      near: "ML",
    },
    C: {
      x: 495,
      y: 333,
      where: "Ellis Avenue (North) near Memorial Library",
      near: "ML",
    },
    D: {
      x: 488,
      y: 400,
      where: "Ellis Avenue (North) near Armstrong Hall",
      near: "AH",
    },
    E: {
      x: 488,
      y: 462,
      where: "Ellis Avenue (North) near Morris Hall",
      near: "MH",
    },
    F: {
      x: 700,
      y: 456,
      where: "Walkway near Trafton Science Center S",
      near: "TS",
    },
    G: { x: 830, y: 470, where: "Walkway near Ford Hall", near: "FH" },
  };

  // Where each destination building sits on the map.
  const BUILDING_POINTS = {
    AH: { x: 535, y: 428 },
    FH: { x: 768, y: 480 },
    CS: { x: 918, y: 495 },
    ML: { x: 385, y: 370 },
    SU: { x: 385, y: 468 },
    MH: { x: 512, y: 500 },
    HN: { x: 610, y: 510 },
    TS: { x: 695, y: 483 },
    WA: { x: 437, y: 492 },
    NH: { x: 555, y: 368 },
    WH: { x: 655, y: 358 },
    TN: { x: 715, y: 370 },
    TE: { x: 765, y: 368 },
    TR: { x: 762, y: 428 },
    PH: { x: 585, y: 562 },
    HC: { x: 500, y: 607 },
    MF: { x: 688, y: 597 },
    TC: { x: 822, y: 600 },
    AF: { x: 1012, y: 515 },
    UP: { x: 155, y: 347 },
    PA: { x: 675, y: 280 },
    CC: { x: 338, y: 228 },
    PS: { x: 408, y: 297 },
    MC: { x: 388, y: 222 },
    CR: { x: 282, y: 227 },
    JS: { x: 75, y: 445 },
    GP: { x: 158, y: 313 },
  };

  // Every route starts with the same trunk, then follows a tail to the building.
  const TRUNK = ["H", "A", "B", "C"];
  const TAILS = {
    AH: ["D", "AH"],
    FH: ["D", "E", "F", "FH"],
    CS: ["D", "E", "F", "G", "CS"],
  };

  // Builds the list of waypoints for a destination, with cumulative miles.
  function routeTo(buildingCode) {
    const keys = TRUNK.concat(TAILS[buildingCode] || [buildingCode]);
    const route = [];
    let miles = 0;
    keys.forEach(function (key, i) {
      const isBuilding = !POINTS[key];
      const base = isBuilding
        ? BUILDING_POINTS[key] || { x: 405, y: 438 }
        : POINTS[key];
      const point = {
        key: key,
        x: base.x,
        y: base.y,
        where: isBuilding
          ? "Arrived at " + (BUILDINGS[key] || key)
          : base.where,
        near: isBuilding ? key : base.near,
      };
      if (i > 0) {
        const prev = route[i - 1];
        const px = Math.hypot(point.x - prev.x, point.y - prev.y);
        miles += px * MAP.milesPerPixel;
      }
      point.miles = miles;
      route.push(point);
    });
    return route;
  }

  // ---------------------------------------------------------------------
  // Carbon footprint
  // These numbers are assumptions for the class project, not official data.
  //  - About 0.404 kg of CO2 per mile for an average passenger car (EPA estimate).
  //  - A car would also have to drive back, so avoided miles = cart miles x 2.
  //  - One tree absorbs roughly 21 kg of CO2 per year (commonly cited estimate).
  // ---------------------------------------------------------------------
  const CarbonCalculator = {
    KG_CO2_PER_MILE: 0.404,
    KG_CO2_PER_TREE_YEAR: 21,
    TRIP_FACTOR: 2,
    carMilesAvoided: function (cartMiles) {
      return cartMiles * this.TRIP_FACTOR;
    },
    co2SavedKg: function (cartMiles) {
      return this.carMilesAvoided(cartMiles) * this.KG_CO2_PER_MILE;
    },
    treeYears: function (co2Kg) {
      return co2Kg / this.KG_CO2_PER_TREE_YEAR;
    },
    // Lifetime totals = earlier deliveries (baseline) + delivered packages in the store.
    totals: function (packages, baseline) {
      let deliveries = baseline.deliveries;
      let cartMiles = baseline.cartMiles;
      packages.forEach(function (p) {
        if (p.mine && p.status === "Delivered") {
          deliveries += 1;
          cartMiles += p.totalMiles;
        }
      });
      const co2Kg = this.co2SavedKg(cartMiles);
      return {
        deliveries: deliveries,
        co2Kg: co2Kg,
        trees: this.treeYears(co2Kg),
      };
    },
  };

  // Deliveries from before this semester's demo data.
  const IMPACT_BASELINE = { deliveries: 13, cartMiles: 6.5 };

  // ---------------------------------------------------------------------
  // Models
  // ---------------------------------------------------------------------
  class Vehicle {
    constructor(data) {
      const d = data || {};
      this.id = d.id || "Cart 4";
      this.batteryPct = typeof d.batteryPct === "number" ? d.batteryPct : 82;
    }
    drain(pct) {
      this.batteryPct = Math.max(0, this.batteryPct - (pct || 1));
    }
    toJSON() {
      return { id: this.id, batteryPct: this.batteryPct };
    }
  }

  class Package {
    constructor(data) {
      this.barcode = data.barcode;
      this.building = data.building;
      this.locker = data.locker;
      this.lengthIn = Number(data.lengthIn) || 0;
      this.widthIn = Number(data.widthIn) || 0;
      this.heightIn = Number(data.heightIn) || 0;
      this.weightLb = data.weightLb;
      this.priority = data.priority;
      this.status = data.status;
      this.mine = data.mine !== false;
      this.history = Array.isArray(data.history) ? data.history.slice() : [];
      this.routeIndex = data.routeIndex || 0;
      this.lastLocationAt = data.lastLocationAt || null;
      this.cart = new Vehicle(data.cart);
      this.receipt = data.receipt || null;
    }

    get buildingName() {
      return BUILDINGS[this.building] || this.building;
    }
    get stage() {
      const s = STATUS_STAGE[this.status];
      return typeof s === "number" ? s : 0;
    }
    get group() {
      return this.status === "Delivered" ? "delivered" : "active";
    }
    get route() {
      return routeTo(this.building);
    }
    get currentPoint() {
      const r = this.route;
      return r[Math.min(this.routeIndex, r.length - 1)];
    }
    get totalMiles() {
      const r = this.route;
      return r[r.length - 1].miles;
    }
    // Miles the cart has covered so far.
    get milesTravelled() {
      return this.status === "Delivered"
        ? this.totalMiles
        : this.currentPoint.miles;
    }
    // Overall progress from 0 to 100, used by the progress bar.
    get progressPct() {
      const r = this.route;
      const fraction = r.length > 1 ? this.routeIndex / (r.length - 1) : 0;
      if (this.status === "Delivered") return 100;
      if (this.status === "En Route") return Math.round(30 + 65 * fraction);
      if (this.status === "Loaded") return 30;
      return 10;
    }
    get lastUpdated() {
      if (this.lastLocationAt) return this.lastLocationAt;
      return this.history.length
        ? this.history[this.history.length - 1].at
        : null;
    }

    // Time a stage was reached (ISO string) or null if it has not happened yet.
    timeOf(stageName) {
      const target = STAGES.indexOf(stageName);
      const hit = this.history.find(function (h) {
        return STATUS_STAGE[h.status] === target;
      });
      return hit ? hit.at : null;
    }

    // Moves the package to a new status and records it in the history.
    setStatus(newStatus, when) {
      const at = (when || new Date()).toISOString();
      this.status = newStatus;
      this.history.push({ status: newStatus, at: at });
      this.lastLocationAt = at;
      if (newStatus === "Loaded" || newStatus === "Checked In") {
        this.routeIndex = 0;
      }
      if (newStatus === "Delivered") {
        this.routeIndex = this.route.length - 1;
      }
    }

    // The cart moves one waypoint. Returns true when it arrives.
    advanceOnRoute() {
      if (this.status !== "En Route") return false;
      const last = this.route.length - 1;
      this.routeIndex = Math.min(this.routeIndex + 1, last);
      this.cart.drain(1);
      this.lastLocationAt = new Date().toISOString();
      if (this.routeIndex >= last) {
        this.setStatus("Delivered");
        return true;
      }
      return false;
    }

    // Electronic sign-off.
    signFor(name, condition, notes) {
      const at = new Date().toISOString();
      this.receipt = {
        name: name,
        condition: condition,
        notes: notes || "",
        signedAt: at,
      };
      this.history.push({ status: "Receipt Signed", at: at });
    }

    // Puts the package back at the start (used by the demo controls).
    restart() {
      const first = this.history[0] || {
        status: "Checked In",
        at: new Date().toISOString(),
      };
      this.status = "Checked In";
      this.history = [first];
      this.routeIndex = 0;
      this.lastLocationAt = null;
      this.receipt = null;
      this.cart = new Vehicle({ id: this.cart.id, batteryPct: 82 });
    }

    toJSON() {
      return {
        barcode: this.barcode,
        building: this.building,
        locker: this.locker,
        lengthIn: this.lengthIn,
        widthIn: this.widthIn,
        heightIn: this.heightIn,
        weightLb: this.weightLb,
        priority: this.priority,
        status: this.status,
        mine: this.mine,
        history: this.history,
        routeIndex: this.routeIndex,
        lastLocationAt: this.lastLocationAt,
        cart: this.cart.toJSON(),
        receipt: this.receipt,
      };
    }
  }

  class Preferences {
    constructor(data) {
      const d = data || {};
      this.notifyEmail = d.notifyEmail !== false;
      this.notifyText = !!d.notifyText;
      this.phone = d.phone || "";
      this.window = d.window || "";
      this.building = d.building || "";
      this.fallback = d.fallback === "nearest" ? "nearest" : "hold";
      this.signatureOnFile = !!d.signatureOnFile;
    }
    // A short, readable summary for the dashboard.
    summary() {
      const ways = [];
      if (this.notifyEmail) ways.push("Email");
      if (this.notifyText) ways.push("Text message");
      const windows = {
        morning: "Morning (8 AM to 11 AM)",
        midday: "Midday (11 AM to 2 PM)",
        afternoon: "Afternoon (2 PM to 5 PM)",
      };
      return [
        ["Notify me by", ways.length ? ways.join(" and ") : "No notifications"],
        ["Delivery window", windows[this.window] || "No preference"],
        [
          "Preferred building",
          this.building
            ? this.building + ", " + (BUILDINGS[this.building] || "")
            : "None set",
        ],
        [
          "If locker is full",
          this.fallback === "nearest"
            ? "Deliver to nearest available locker"
            : "Hold at central hub",
        ],
        ["Signature on file", this.signatureOnFile ? "Yes" : "No"],
      ];
    }
    toJSON() {
      return {
        notifyEmail: this.notifyEmail,
        notifyText: this.notifyText,
        phone: this.phone,
        window: this.window,
        building: this.building,
        fallback: this.fallback,
        signatureOnFile: this.signatureOnFile,
      };
    }
  }

  // ---------------------------------------------------------------------
  // Stores (localStorage)
  // ---------------------------------------------------------------------
  const memory = {}; // fallback if localStorage is blocked
  const storage = {
    get: function (key) {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        return Object.prototype.hasOwnProperty.call(memory, key)
          ? memory[key]
          : null;
      }
    },
    set: function (key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch (e) {
        memory[key] = value;
      }
    },
    remove: function (key) {
      try {
        window.localStorage.removeItem(key);
      } catch (e) {
        delete memory[key];
      }
    },
  };

  function minutesAgo(min) {
    return new Date(Date.now() - min * 60000).toISOString();
  }

  // Starting data so the portal has something to show on first load.
  function seedPackages() {
    return [
      {
        barcode: "1234-5678-9012",
        building: "AH",
        locker: "Locker Array 1",
        lengthIn: 12,
        widthIn: 10,
        heightIn: 8,
        weightLb: 8.5,
        priority: "Standard",
        status: "Checked In",
        history: [{ status: "Checked In", at: minutesAgo(26 * 60) }],
      },
      {
        barcode: "3141-5926-5358",
        building: "FH",
        locker: "Locker Array 1",
        lengthIn: 4,
        widthIn: 4,
        heightIn: 4,
        weightLb: 32.4,
        priority: "Urgent",
        status: "En Route",
        routeIndex: 3,
        history: [
          { status: "Checked In", at: minutesAgo(150) },
          { status: "Loaded", at: minutesAgo(40) },
          { status: "En Route", at: minutesAgo(12) },
        ],
        lastLocationAt: minutesAgo(1),
        cart: { id: "Cart 4", batteryPct: 82 },
      },
      {
        barcode: "7777-8888-9999",
        building: "CS",
        locker: "Locker Array 2",
        lengthIn: 33,
        widthIn: 33,
        heightIn: 33,
        weightLb: 6.1,
        priority: "Standard",
        status: "Delivered",
        routeIndex: 8,
        history: [
          { status: "Checked In", at: minutesAgo(30 * 60) },
          { status: "Loaded", at: minutesAgo(26 * 60) },
          { status: "En Route", at: minutesAgo(25 * 60) },
          { status: "Delivered", at: minutesAgo(24 * 60) },
        ],
        cart: { id: "Cart 2", batteryPct: 64 },
      },
      {
        barcode: "1111-2222-3333",
        building: "CS",
        locker: "Locker Array 2",
        lengthIn: 3,
        widthIn: 2,
        heightIn: 1,
        weightLb: 15.2,
        priority: "Urgent",
        status: "Awaiting Pickup",
        mine: false,
        history: [
          { status: "Checked In", at: minutesAgo(70) },
          { status: "Awaiting Pickup", at: minutesAgo(65) },
        ],
      },
      {
        barcode: "3333-4444-5555",
        building: "AH",
        locker: "Locker Array 3",
        lengthIn: 10,
        widthIn: 10,
        heightIn: 4,
        weightLb: 4.7,
        priority: "Low",
        status: "Loaded",
        mine: false,
        history: [
          { status: "Checked In", at: minutesAgo(200) },
          { status: "Loaded", at: minutesAgo(20) },
        ],
      },
    ];
  }

  const PackageStore = {
    // Reads every package from localStorage (seeding on first use).
    all: function () {
      const raw = storage.get(STORAGE.packages);
      if (!raw || storage.get(STORAGE.version) !== DATA_VERSION) {
        this.reset();
        return this.all();
      }
      try {
        return JSON.parse(raw).map(function (d) {
          return new Package(d);
        });
      } catch (e) {
        this.reset();
        return this.all();
      }
    },
    mine: function () {
      return this.all().filter(function (p) {
        return p.mine;
      });
    },
    find: function (barcode) {
      return (
        this.all().find(function (p) {
          return p.barcode === barcode;
        }) || null
      );
    },
    // Saves one package back into the list.
    save: function (pkg) {
      const list = this.all().map(function (p) {
        return p.barcode === pkg.barcode ? pkg : p;
      });
      storage.set(STORAGE.packages, JSON.stringify(list));
    },
    reset: function () {
      storage.set(
        STORAGE.packages,
        JSON.stringify(
          seedPackages().map(function (d) {
            return new Package(d);
          }),
        ),
      );
      storage.set(STORAGE.version, DATA_VERSION);
      storage.remove(STORAGE.lastRead);
    },
  };

  const PrefsStore = {
    load: function () {
      try {
        return new Preferences(JSON.parse(storage.get(STORAGE.prefs)));
      } catch (e) {
        return new Preferences();
      }
    },
    save: function (prefs) {
      storage.set(STORAGE.prefs, JSON.stringify(prefs));
    },
    reset: function () {
      storage.remove(STORAGE.prefs);
    },
  };

  // ---------------------------------------------------------------------
  // Notifications are built from each package's history, newest first.
  // ---------------------------------------------------------------------
  const Notifications = {
    message: function (pkg, event) {
      const where = pkg.building + ", " + pkg.buildingName;
      switch (event.status) {
        case "Checked In":
          return (
            "Package " + pkg.barcode + " was checked in at the Central Hub."
          );
        case "Awaiting Pickup":
          return "Package " + pkg.barcode + " is waiting for a courier.";
        case "Loaded":
          return (
            "Package " +
            pkg.barcode +
            " was loaded onto " +
            pkg.cart.id +
            " for delivery to " +
            where +
            "."
          );
        case "En Route":
          return "Package " + pkg.barcode + " is on the way to " + where + ".";
        case "Delivered":
          return (
            "Package " +
            pkg.barcode +
            " was delivered to " +
            pkg.locker +
            " at " +
            where +
            ". Please sign for it."
          );
        case "Receipt Signed":
          return "You signed for package " + pkg.barcode + ".";
        default:
          return "Package " + pkg.barcode + " was updated.";
      }
    },
    recent: function (limit) {
      const items = [];
      PackageStore.mine().forEach(function (pkg) {
        pkg.history.forEach(function (event) {
          items.push({
            at: event.at,
            text: Notifications.message(pkg, event),
            barcode: pkg.barcode,
          });
        });
      });
      items.sort(function (a, b) {
        return new Date(b.at) - new Date(a.at);
      });
      return items.slice(0, limit || 5);
    },
    lastRead: function () {
      return storage.get(STORAGE.lastRead) || "1970-01-01T00:00:00.000Z";
    },
    markAllRead: function () {
      storage.set(STORAGE.lastRead, new Date().toISOString());
    },
    unreadCount: function () {
      const seen = new Date(this.lastRead());
      return this.recent(50).filter(function (n) {
        return new Date(n.at) > seen;
      }).length;
    },
  };

  // ---------------------------------------------------------------------
  // Small helper functions
  // ---------------------------------------------------------------------
  // Keeps only digits and groups them as XXXX-XXXX-XXXX while the user types.
  function formatBarcode(raw) {
    const digits = String(raw).replace(/\D/g, "").slice(0, 12);
    return digits.replace(/(\d{4})(?=\d)/g, "$1-");
  }

  function formatDateTime(iso, withSeconds) {
    if (!iso) return "Not yet";
    const options = {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    };
    if (withSeconds) options.second = "2-digit";
    return new Date(iso).toLocaleString("en-US", options);
  }

  // "En Route" becomes "en-route" for CSS class names.
  function statusSlug(status) {
    return String(status).toLowerCase().replace(/\s+/g, "-");
  }

  function prefersReducedMotion() {
    return !!(
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }
  // Animation length that respects the user's reduced-motion setting.
  function animationMs(ms) {
    return prefersReducedMotion() ? 0 : ms;
  }

  function resetDemo() {
    PackageStore.reset();
    PrefsStore.reset();
  }

  window.CampusEco = {
    STAGES: STAGES,
    STATUS_STAGE: STATUS_STAGE,
    BUILDINGS: BUILDINGS,
    MAP: MAP,
    BUILDING_POINTS: BUILDING_POINTS,
    IMPACT_BASELINE: IMPACT_BASELINE,
    CarbonCalculator: CarbonCalculator,
    Package: Package,
    Vehicle: Vehicle,
    Preferences: Preferences,
    PackageStore: PackageStore,
    PrefsStore: PrefsStore,
    Notifications: Notifications,
    routeTo: routeTo,
    formatBarcode: formatBarcode,
    formatDateTime: formatDateTime,
    statusSlug: statusSlug,
    animationMs: animationMs,
    resetDemo: resetDemo,
  };
})(window);
