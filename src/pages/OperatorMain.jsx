import React, { useState, useEffect, useRef } from "react";

import "./../css/operator.css";

export default function OperatorMain() {
    const [packages, setPackages] = useState([]);
    const [search, setSearch] = useState("");
    const [buildingFilter, setBuildingFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [showFilters, setShowFilters] = useState(false);

    const [selectedPackage, setSelectedPackage] = useState(null);
    const [modalMode, setModalMode] = useState("view");
    const [pendingBarcode, setPendingBarcode] = useState(null);

    const [formData, setFormData] = useState({});
    const [modalError, setModalError] = useState("");

    const CampusEco = window.CampusEco;
    const dialogRef = useRef(null);

    useEffect(() => {
        const dialog = dialogRef.current;

        if (selectedPackage && dialog && !dialog.open) {
            dialog.showModal();
        }

        return () => {
            if (dialog?.open) {
                dialog.close();
            }
        };
    }, [selectedPackage]);

    function refreshPackages() {
        setPackages(CampusEco.PackageStore.all());
    }

    useEffect(() => {
        refreshPackages();
    }, []);

    function formatPriority(priority) {
        return String(priority || "");
    }

    function openModal(pkg, mode) {
        setSelectedPackage(pkg);
        setModalMode(mode);

        setFormData({
            barcode: pkg.barcode,
            building: pkg.building,
            locker: pkg.locker,
            length: pkg.lengthIn,
            width: pkg.widthIn,
            height: pkg.heightIn,
            weight: pkg.weightLb,
            priority: pkg.priority,
            status: pkg.status,
            specialInstructions: pkg.specialInstructions || "",
            hasInstructions: Boolean(pkg.specialInstructions),
        });

        setModalError("");
    }

    function closeModal() {
        setSelectedPackage(null);
        setModalError("");
    }

    function handleFieldChange(event) {
        const { name, value, type, checked } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: type === "checkbox" ? checked : value,
        }));
    }

    function savePackage(event) {
        event.preventDefault();

        if (!selectedPackage || modalMode !== "edit") return;

        const building = formData.building.trim().toUpperCase();

        if (!CampusEco.BUILDINGS[building]) {
            setModalError("Please enter a valid campus building code.");
            return;
        }

        const pkg = CampusEco.PackageStore.find(selectedPackage.barcode);

        if (!pkg) {
            setModalError("Package could not be found. Please refresh.");
            return;
        }

        pkg.building = building;
        pkg.locker = formData.locker;
        pkg.lengthIn = Number(formData.length);
        pkg.widthIn = Number(formData.width);
        pkg.heightIn = Number(formData.height);
        pkg.weightLb = Number(formData.weight);
        pkg.priority = formData.priority;
        pkg.specialInstructions = formData.hasInstructions
            ? formData.specialInstructions.trim()
            : "";

        CampusEco.PackageStore.save(pkg);

        closeModal();
        refreshPackages();
    }

    function cancelPackage(barcode) {
        setPendingBarcode(barcode);
    }

    function confirmCancellation() {
        if (!pendingBarcode) return;

        const pkg = CampusEco.PackageStore.find(pendingBarcode);

        if (
            pkg &&
            pkg.status !== "Delivered" &&
            pkg.status !== "Cancelled"
        ) {
            pkg.setStatus("Cancelled");
            CampusEco.PackageStore.save(pkg);
        }

        setPendingBarcode(null);
        refreshPackages();
    }

    function clearFilters() {
        setSearch("");
        setBuildingFilter("");
        setStatusFilter("");
    }

    const filteredPackages = packages.filter((pkg) => {
        const matchesSearch = pkg.barcode
            .toLowerCase()
            .includes(search.trim().toLowerCase());

        const matchesBuilding =
            !buildingFilter ||
            pkg.building.toUpperCase() === buildingFilter.trim().toUpperCase();

        const matchesStatus =
            !statusFilter ||
            pkg.status.toLowerCase() === statusFilter.toLowerCase();

        return matchesSearch && matchesBuilding && matchesStatus;
    });

    const urgentPackages = packages.filter(
        (pkg) =>
            pkg.priority.toLowerCase() === "urgent" &&
            pkg.status !== "Cancelled"
    );

    return (
        <>
            <main>
                <section>
                    <h2>Operators</h2>

                    {pendingBarcode && (
                        <section
                            id="action-banner"
                            className="action-banner"
                            role="region"
                            aria-live="polite"
                        >
                            <p id="action-banner-message">
                                Are you sure you want to cancel package {pendingBarcode}?
                            </p>

                            <div id="action-banner-buttons">
                                <button
                                    type="button"
                                    id="confirm-action-button"
                                    onClick={confirmCancellation}
                                >
                                    Confirm Cancellation
                                </button>

                                <button
                                    type="button"
                                    id="dismiss-action-button"
                                    onClick={() => setPendingBarcode(null)}
                                >
                                    Dismiss
                                </button>
                            </div>
                        </section>
                    )}

                    <section>
                        <h3>Package Activity</h3>

                        <a href="/operatorPackageInput">
                            Check In New Package
                        </a>

                        <div className="package-filter-section">
                            <button
                                type="button"
                                id="toggle-package-filters"
                                aria-expanded={showFilters}
                                onClick={() => setShowFilters(!showFilters)}
                            >
                                {showFilters ? "Hide Filters ▲" : "Filter Packages ▼"}
                            </button>

                            <form
                                id="package-search-form"
                                className={showFilters ? "filters-open" : "filters-closed"}
                                onSubmit={(e) => e.preventDefault()}
                            >
                                <div className="filter-content">
                                    <label htmlFor="package-search">
                                        Tracking Barcode
                                    </label>
                                    <input
                                        id="package-search"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="XXXX-XXXX-XXXX"
                                    />

                                    <label htmlFor="package-building-filter">
                                        Building
                                    </label>
                                    <input
                                        id="package-building-filter"
                                        value={buildingFilter}
                                        onChange={(e) => setBuildingFilter(e.target.value)}
                                        maxLength="2"
                                        placeholder="XX"
                                    />

                                    <label htmlFor="package-status-filter">
                                        Status
                                    </label>
                                    <select
                                        id="package-status-filter"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                    >
                                        <option value="">All Statuses</option>
                                        <option value="Checked In">Checked In</option>
                                        <option value="Awaiting Pickup">Awaiting Pickup</option>
                                        <option value="Claimed">Claimed</option>
                                        <option value="Loaded">Loaded</option>
                                        <option value="En Route">En Route</option>
                                        <option value="Delivered">Delivered</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>

                                    <div className="filter-actions">
                                        <button type="submit">Search</button>
                                        <button type="button" onClick={clearFilters}>
                                            Clear Filters
                                        </button>
                                    </div>
                                </div>
                            </form>

                        </div>

                        {filteredPackages.length === 0 && (
                            <p>No matching packages found.</p>
                        )}

                        <table id="package-activity-table">
                            <caption>Recently checked-in packages</caption>
                            <thead>
                                <tr>
                                    <th>Tracking Barcode</th>
                                    <th>Building</th>
                                    <th>Locker Array</th>
                                    <th>Dimensions</th>
                                    <th>Weight</th>
                                    <th>Priority</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredPackages.map((pkg) => (
                                    <tr key={pkg.barcode}>
                                        <td>{pkg.barcode}</td>
                                        <td>{pkg.building}</td>
                                        <td>{pkg.locker}</td>
                                        <td>
                                            {pkg.lengthIn} x {pkg.widthIn} x {pkg.heightIn} ″
                                        </td>
                                        <td>{pkg.weightLb} lb</td>
                                        <td>
                                            <span className={`badge priority-${pkg.priority.toLowerCase()}`}>
                                                {formatPriority(pkg.priority)}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge badge-${pkg.status.toLowerCase().replace(/\s+/g, "-")}`}>
                                                {pkg.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="table-actions">
                                                <button onClick={() => openModal(pkg, "view")}>
                                                    View
                                                </button>
                                                <button onClick={() => openModal(pkg, "edit")}>
                                                    Edit
                                                </button>
                                                <button onClick={() => cancelPackage(pkg.barcode)}>
                                                    Cancel
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                    <section>
                        <h3>Urgent Deliveries</h3>

                        <table>
                            <caption>Packages that must be delivered urgently</caption>
                            <thead>
                                <tr>
                                    <th>Tracking Barcode</th>
                                    <th>Building</th>
                                    <th>Locker Array</th>
                                    <th>Status</th>
                                </tr>
                            </thead>

                            <tbody>
                                {urgentPackages.map((pkg) => (
                                    <tr key={pkg.barcode}>
                                        <td>{pkg.barcode}</td>
                                        <td>{pkg.building}</td>
                                        <td>{pkg.locker}</td>
                                        <td>
                                            <span className={`badge badge-${pkg.status.toLowerCase().replace(/\s+/g, "-")}`}>
                                                {pkg.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                </section>
            </main >

            {selectedPackage && (
                <dialog
                    ref={dialogRef}
                    id="package-modal"
                    aria-labelledby="package-modal-title"
                    className="package-modal"
                >
                    <h3 id="package-modal-title">
                        {modalMode === "view" ? "View Package" : "Edit Package"}
                    </h3>

                    <form onSubmit={savePackage} id="package-modal-form">
                        <label htmlFor="modal-barcode">Tracking Barcode</label>
                        <input
                            id="modal-barcode"
                            value={formData.barcode}
                            readOnly
                        />

                        <label htmlFor="modal-building">Destination Building Code</label>
                        <input
                            id="modal-building"
                            name="building"
                            value={formData.building}
                            onChange={handleFieldChange}
                            disabled={modalMode === "view"}
                            pattern="[A-Za-z]{2}"
                            maxLength="2"
                            required
                        />

                        {modalError && (
                            <p id="package-modal-error" role="alert">
                                {modalError}
                            </p>
                        )}

                        <label htmlFor="modal-locker">Delivery Locker Array</label>
                        <select
                            id="modal-locker"
                            name="locker"
                            value={formData.locker}
                            onChange={handleFieldChange}
                            disabled={modalMode === "view"}
                        >
                            <option>Locker Array 1</option>
                            <option>Locker Array 2</option>
                            <option>Locker Array 3</option>
                        </select>

                        {["length", "width", "height", "weight"].map((field) => (
                            <React.Fragment key={field}>
                                <label htmlFor={`modal-${field}`}>
                                    Package {field.charAt(0).toUpperCase() + field.slice(1)}
                                </label>

                                <div className="measurement-input">
                                    <input
                                        id={`modal-${field}`}
                                        type="number"
                                        name={field}
                                        value={formData[field]}
                                        onChange={handleFieldChange}
                                        disabled={modalMode === "view"}
                                        min={field === "weight" ? 0 : 1}
                                        max={field === "weight" ? 120 : 48}
                                        step="0.1"
                                        required
                                    />
                                    <span>{field === "weight" ? " lb" : " ″"}</span>
                                </div>
                            </React.Fragment>
                        ))}

                        <label htmlFor="modal-priority">Delivery Priority</label>
                        <select
                            id="modal-priority"
                            name="priority"
                            value={formData.priority}
                            onChange={handleFieldChange}
                            disabled={modalMode === "view"}
                        >
                            <option>Low</option>
                            <option>Standard</option>
                            <option>Urgent</option>
                        </select>

                        <label htmlFor="modal-status">Package Status</label>
                        <input
                            id="modal-status"
                            value={formData.status}
                            readOnly
                        />

                        <label htmlFor="modal-has-special-instructions">
                            Has Special Instructions
                        </label>

                        <input
                            type="checkbox"
                            id="modal-has-special-instructions"
                            name="hasInstructions"
                            checked={formData.hasInstructions}
                            onChange={handleFieldChange}
                            disabled={modalMode === "view"}
                        />

                        {formData.hasInstructions && (
                            <div id="modal-instructions-container">
                                <label htmlFor="modal-instructions">Instructions</label>
                                <textarea
                                    id="modal-instructions"
                                    name="specialInstructions"
                                    value={formData.specialInstructions}
                                    onChange={handleFieldChange}
                                    disabled={modalMode === "view"}
                                    rows="5"
                                />
                            </div>
                        )}

                        <div className="modal-actions">
                            {modalMode === "edit" && (
                                <button type="submit" id="modal-save-button">
                                    Save Changes
                                </button>
                            )}

                            <button
                                type="button"
                                id="modal-close-button"
                                onClick={closeModal}
                            >
                                Close
                            </button>
                        </div>
                    </form>
                </dialog>
            )
            }

        </>
    );
}
