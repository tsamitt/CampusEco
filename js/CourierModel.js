/*
 * FOR TESTING!!!!!!!!!!!!!
 */
(function (window) {
  "use strict";

  const C = window.CampusEco;

  // Constants
  const STORAGE = {
    courier: "campuseco.courier",
    claims: "campuseco.courierClaims",
    carts: "campuseco.courierCarts",
  };

  // Statuses a package can have while it is still waiting at the hub.
  const QUEUE_STATUSES = ["Checked In", "Awaiting Pickup"];

  // The order a courier moves a delivery through once it is claimed.
  const COURIER_FLOW = ["Claimed", "Loaded", "En Route", "Delivered"];

  // Lower number = more important. Used to sort the route queue.
  const PRIORITY_RANK = { Urgent: 1, Standard: 2, Low: 3 };

  // Same rule as the HTML pattern attribute: 1234-5678-9012
  const BARCODE_PATTERN = /^[0-9]{4}-[0-9]{4}-[0-9]{4}$/;

  function isValidBarcode(barcode) {
    return BARCODE_PATTERN.test(String(barcode));
  }

  // Storage helper (same approach as Models.js: falls back to memory)
  const memory = {};
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

  // Models //


  // An electric cart in the courier fleet. Builds on the shared Vehicle.
  class EcoCart extends C.Vehicle {
    constructor(data) {
      super(data);
      const d = data || {};
      this.issues = Array.isArray(d.issues) ? d.issues.slice() : [];
      this.lastReportType = d.lastReportType || "start";
      this.lastReportAt = d.lastReportAt || null;
    }

    // "good", "low" or "critical", used for colour coding.
    get batteryState() {
      if (this.batteryPct < 20) return "critical";
      if (this.batteryPct < 50) return "low";
      return "good";
    }

    get needsCharge() {
      return this.batteryPct < 20 || this.issues.indexOf("charge") !== -1;
    }

    reportBattery(pct, reportType, issues) {
      const level = Number(pct);
      if (isNaN(level) || level < 0 || level > 100) {
        throw new Error("Battery level must be between 0 and 100.");
      }
      this.batteryPct = level;
      this.lastReportType = reportType;
      this.issues = issues || [];
      this.lastReportAt = new Date().toISOString();
    }

    toJSON() {
      const json = super.toJSON();
      json.issues = this.issues;
      json.lastReportType = this.lastReportType;
      json.lastReportAt = this.lastReportAt;
      return json;
    }
  }

  // The student worker signed in on this device.
  class EcoCourier {
    constructor(data) {
      const d = data || {};
      this.name = d.name || "";
      this.email = d.email || "";
      this.shift = d.shift || "";
      this.role = d.role || "driver"; // "driver" or "walker"
      this.registeredAt = d.registeredAt || new Date().toISOString();
      // The password is never stored in the browser. Phase 3 (PHP) will hash it.
    }

    static isMnsuEmail(email) {
      return /^[^\s@]+@mnsu\.edu$/i.test(String(email));
    }

    get firstName() {
      return this.name.trim().split(" ")[0];
    }

    get roleLabel() {
      return this.role === "walker" ? "Walking Courier" : "Delivery Driver";
    }

    // Walking couriers can't carry as much as a cart driver.
    get maxLoadLb() {
      return this.role === "walker" ? 25 : 150;
    }

    toJSON() {
      return {
        name: this.name,
        email: this.email,
        shift: this.shift,
        role: this.role,
        registeredAt: this.registeredAt,
      };
    }
  }

  // Stores (localStorage) //
  function seedCarts() {
    return [
      { id: "Cart 1", batteryPct: 82 },
      { id: "Cart 2", batteryPct: 64 },
      { id: "Cart 3", batteryPct: 15, issues: ["charge"] },
      { id: "Cart 4", batteryPct: 82 },
    ];
  }

  const CourierStore = {
    // ----- courier profile -----
    loadCourier: function () {
      try {
        const raw = JSON.parse(storage.get(STORAGE.courier));
        return raw ? new EcoCourier(raw) : null;
      } catch (e) {
        return null;
      }
    },
    saveCourier: function (courier) {
      storage.set(STORAGE.courier, JSON.stringify(courier));
    },
    clearCourier: function () {
      storage.remove(STORAGE.courier);
    },
    courierName: function () {
      const courier = this.loadCourier();
      return courier ? courier.name : "Guest Courier";
    },

    // ----- claims: { barcode: { by, cartId, at } } -----
    claims: function () {
      try {
        return JSON.parse(storage.get(STORAGE.claims)) || {};
      } catch (e) {
        return {};
      }
    },
    saveClaims: function (claims) {
      storage.set(STORAGE.claims, JSON.stringify(claims));
    },

    // ----- cart fleet -----
    carts: function () {
      const raw = storage.get(STORAGE.carts);
      if (!raw) {
        this.saveCarts(
          seedCarts().map(function (d) {
            return new EcoCart(d);
          }),
        );
        return this.carts();
      }
      try {
        return JSON.parse(raw).map(function (d) {
          return new EcoCart(d);
        });
      } catch (e) {
        storage.remove(STORAGE.carts);
        return this.carts();
      }
    },
    findCart: function (id) {
      return (
        this.carts().find(function (cart) {
          return cart.id === id;
        }) || null
      );
    },
    saveCart: function (cart) {
      const list = this.carts().map(function (c) {
        return c.id === cart.id ? cart : c;
      });
      this.saveCarts(list);
    },
    saveCarts: function (list) {
      storage.set(STORAGE.carts, JSON.stringify(list));
    },

    // Clears courier claims and carts. The profile is kept.
    reset: function () {
      storage.remove(STORAGE.claims);
      storage.remove(STORAGE.carts);
    },
  };

  // Dispatch: courier rules applied to the shared packages
  const Dispatch = {
    isClaimed: function (pkg) {
      return Object.prototype.hasOwnProperty.call(
        CourierStore.claims(),
        pkg.barcode,
      );
    },

    // Still at the hub and nobody has claimed it yet.
    isQueued: function (pkg) {
      return QUEUE_STATUSES.indexOf(pkg.status) !== -1 && !this.isClaimed(pkg);
    },

    // Claimed by the courier, or already out on a cart.
    isMine: function (pkg) {
      return (
        this.isClaimed(pkg) ||
        ["Loaded", "En Route", "Delivered"].indexOf(pkg.status) !== -1
      );
    },

    // What the courier sees: a claimed package still at the hub shows "Claimed".
    displayStatus: function (pkg) {
      if (QUEUE_STATUSES.indexOf(pkg.status) !== -1 && this.isClaimed(pkg)) {
        return "Claimed";
      }
      return pkg.status;
    },

    // Statuses the package may move to next. Couriers can only move forward.
    nextStatuses: function (pkg) {
      const index = COURIER_FLOW.indexOf(this.displayStatus(pkg));
      return index === -1 ? [] : COURIER_FLOW.slice(index + 1);
    },

    byPriority: function (a, b) {
      return (
        (PRIORITY_RANK[a.priority] || 99) - (PRIORITY_RANK[b.priority] || 99)
      );
    },

    queue: function () {
      const self = this;
      return C.PackageStore.all()
        .filter(function (pkg) {
          return self.isQueued(pkg);
        })
        .sort(this.byPriority);
    },

    myDeliveries: function () {
      const self = this;
      return C.PackageStore.all().filter(function (pkg) {
        return self.isMine(pkg);
      });
    },

    // Active stops for the route map, most urgent first.
    activeStops: function () {
      return this.myDeliveries()
        .filter(function (pkg) {
          return pkg.status !== "Delivered" && pkg.status !== "Cancelled";
        })
        .sort(this.byPriority);
    },

    claim: function (barcode, cartId, verifiedWeightLb) {
      const pkg = C.PackageStore.find(barcode);
      const cart = CourierStore.findCart(cartId);
      const courier = CourierStore.loadCourier();

      if (!pkg) throw new Error("Package " + barcode + " was not found.");
      if (!this.isQueued(pkg)) {
        throw new Error(
          "Package " + barcode + " is not waiting in the route queue.",
        );
      }
      if (!cart) throw new Error("Please choose a cart.");
      if (cart.needsCharge) {
        throw new Error(
          cart.id + " needs to be charged before it can take a delivery.",
        );
      }
      if (courier && verifiedWeightLb > courier.maxLoadLb) {
        throw new Error(
          courier.roleLabel + "s can carry up to " + courier.maxLoadLb + " lb.",
        );
      }

      const claims = CourierStore.claims();
      claims[barcode] = {
        by: CourierStore.courierName(),
        cartId: cart.id,
        at: new Date().toISOString(),
      };
      CourierStore.saveClaims(claims);

      // The shared package now rides on this cart.
      pkg.cart = new C.Vehicle({ id: cart.id, batteryPct: cart.batteryPct });
      if (typeof verifiedWeightLb === "number" && !isNaN(verifiedWeightLb)) {
        pkg.weightLb = verifiedWeightLb;
      }
      C.PackageStore.save(pkg);
      return pkg;
    },

    updateStatus: function (barcode, newStatus, notes) {
      const pkg = C.PackageStore.find(barcode);
      if (!pkg) throw new Error("Package " + barcode + " was not found.");
      if (!this.isMine(pkg))
        throw new Error("You haven't claimed " + barcode + ".");
      if (this.nextStatuses(pkg).indexOf(newStatus) === -1) {
        throw new Error(
          "Cannot change " +
            barcode +
            ' from "' +
            this.displayStatus(pkg) +
            '" to "' +
            newStatus +
            '".',
        );
      }

      pkg.setStatus(newStatus);
      if (notes) pkg.history[pkg.history.length - 1].notes = notes;
      C.PackageStore.save(pkg);
      return pkg;
    },

    reportBattery: function (cartId, pct, reportType, issues) {
      const cart = CourierStore.findCart(cartId);
      if (!cart) throw new Error("Please choose a cart.");
      cart.reportBattery(pct, reportType, issues);
      CourierStore.saveCart(cart);

      // Keep the battery shown on the tracking pages in sync.
      C.PackageStore.all().forEach(function (pkg) {
        if (pkg.cart.id === cart.id && pkg.status !== "Delivered") {
          pkg.cart.batteryPct = cart.batteryPct;
          C.PackageStore.save(pkg);
        }
      });
      return cart;
    },

    // History for the "View" timeline, with the claim added in time order.
    timeline: function (pkg) {
      const items = pkg.history.map(function (h) {
        return { status: h.status, at: h.at, notes: h.notes || "" };
      });
      const claim = CourierStore.claims()[pkg.barcode];
      if (claim) {
        items.push({
          status: "Claimed",
          at: claim.at,
          notes: "by " + claim.by + " on " + claim.cartId,
        });
      }
      return items.sort(function (a, b) {
        return new Date(a.at) - new Date(b.at);
      });
    },
  };

  // Resets the shared packages and the courier data together.
  function resetCourierDemo() {
    C.resetDemo();
    CourierStore.reset();
  }

  window.CampusEcoCourier = {
    PRIORITY_RANK: PRIORITY_RANK,
    EcoCart: EcoCart,
    EcoCourier: EcoCourier,
    CourierStore: CourierStore,
    Dispatch: Dispatch,
    isValidBarcode: isValidBarcode,
    resetCourierDemo: resetCourierDemo,
  };
})(window);