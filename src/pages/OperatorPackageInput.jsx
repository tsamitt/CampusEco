
import { useState, useRef } from "react";
import "./../css/operator.css";

function OperatorPackageInput() {

    // Form State

    const [barcode, setBarcode] = useState("");
    const [length, setLength] = useState("");
    const [width, setWidth] = useState("");
    const [height, setHeight] = useState("");
    const [weight, setWeight] = useState("");

    const [priority, setPriority] = useState("standard");

    const [building, setBuilding] = useState("");
    const [locker, setLocker] = useState("");

    const [hasSpecialInstructions, setHasSpecialInstructions] =
        useState(false);

    const [instructions, setInstructions] = useState("");

    // Error State

    const [barcodeError, setBarcodeError] = useState("");
    const [buildingError, setBuildingError] = useState("");

    // Input References

    const barcodeRef = useRef(null);
    const buildingRef = useRef(null);

    // Form submission

    function handleSubmit(event) {

        event.preventDefault();

        setBarcodeError("");
        setBuildingError("");

        const formattedBarcode = barcode.trim();
        const formattedBuilding = building.trim().toUpperCase();

        if (!window.CampusEco.BUILDINGS[formattedBuilding]) {

            setBuildingError(
                "Please enter a valid campus building code."
            );

            buildingRef.current?.focus();
            return;
        }

        const selectedLocker = {
            "locker-a": "Locker Array 1",
            "locker-b": "Locker Array 2",
            "locker-c": "Locker Array 3",
        }[locker];

        const newPackage = new window.CampusEco.Package({

            barcode: formattedBarcode,
            building: formattedBuilding,
            locker: selectedLocker,

            lengthIn: Number(length),
            widthIn: Number(width),
            heightIn: Number(height),
            weightLb: Number(weight),

            priority:
                priority.charAt(0).toUpperCase() +
                priority.slice(1).toLowerCase(),

            status: "Checked In",
            mine: true,

            history: [
                {
                    status: "Checked In",
                    at: new Date().toISOString(),
                },
            ],

        });

        newPackage.specialInstructions =
            hasSpecialInstructions
                ? instructions.trim()
                : "";

        const saved = window.CampusEco.PackageStore.add(newPackage);

        // Check for duplicate barcode
        if (!saved) {

            setBarcodeError(
                "A package with this tracking barcode already exists."
            );

            barcodeRef.current?.focus();
            return;
        }

        window.location.href = "/operatorMain.html";
    }


    return (

        <main>
            <section>

                <h2>Operators</h2>

                <a href="/operatorMain.html">Back</a>

                <form onSubmit={handleSubmit}>

                    {/* Tracking Barcode */}

                    <label htmlFor="barcode">
                        Tracking Barcode
                    </label>

                    <input
                        ref={barcodeRef}
                        type="text"
                        id="barcode"
                        name="barcode"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        required
                        pattern="^\d{4}(?:-\d{4}){2}$"
                        title="Barcode should be 12 digits with every 4 digits separated by a hyphen: XXXX-XXXX-XXXX"
                    />

                    {barcodeError && (
                        <p className="feedback error" role="alert">
                            {barcodeError}
                        </p>
                    )}

                    {/* Package Length */}

                    <label htmlFor="length">
                        Package Length
                    </label>

                    <input
                        type="number"
                        id="length"
                        name="length"
                        value={length}
                        onChange={(e) => setLength(e.target.value)}
                        required
                        min="1"
                        max="48"
                        step="0.1"
                    />

                    <span> ″</span>

                    {/* Package Width */}

                    <label htmlFor="width">
                        Package Width
                    </label>

                    <input
                        type="number"
                        id="width"
                        name="width"
                        value={width}
                        onChange={(e) => setWidth(e.target.value)}
                        required
                        min="1"
                        max="48"
                        step="0.1"
                    />

                    <span> ″</span>

                    {/* Package Height */}

                    <label htmlFor="height">
                        Package Height
                    </label>

                    <input
                        type="number"
                        id="height"
                        name="height"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        required
                        min="1"
                        max="48"
                        step="0.1"
                    />

                    <span> ″</span>

                    {/* Package Weight */}

                    <label htmlFor="weight">
                        Package Weight
                    </label>

                    <input
                        type="number"
                        id="weight"
                        name="weight"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        required
                        min="0"
                        max="120"
                        step="0.1"
                    />

                    <span> lb</span>

                    {/* Delivery Priority */}

                    <label>Delivery Priority</label>

                    <label>
                        <input
                            type="radio"
                            name="priority"
                            value="low"
                            checked={priority === "low"}
                            onChange={(e) => setPriority(e.target.value)}
                            required
                        />
                        Low
                    </label>

                    <label>
                        <input
                            type="radio"
                            name="priority"
                            value="standard"
                            checked={priority === "standard"}
                            onChange={(e) => setPriority(e.target.value)}
                        />
                        Standard
                    </label>

                    <label>
                        <input
                            type="radio"
                            name="priority"
                            value="urgent"
                            checked={priority === "urgent"}
                            onChange={(e) => setPriority(e.target.value)}
                        />
                        Urgent
                    </label>

                    {/* Destination Building Code */}

                    <label htmlFor="building-code">
                        Destination Building Code
                    </label>

                    <input
                        ref={buildingRef}
                        type="text"
                        id="building-code"
                        name="building-code"
                        value={building}
                        onChange={(e) => setBuilding(e.target.value)}
                        pattern="^[A-Za-z]{2}$"
                        title="Please enter a two character building code."
                        required
                    />

                    {buildingError && (
                        <p className="feedback error" role="alert">
                            {buildingError}
                        </p>
                    )}

                    {/* Campus Map */}

                    <img
                        src="/map.png"
                        alt="Image map of the university."
                        height="300"
                        width="630"
                    />

                    {/* Delivery Locker Array */}

                    <label htmlFor="locker">
                        Delivery Locker Array
                    </label>

                    <select
                        id="locker"
                        name="locker"
                        value={locker}
                        onChange={(e) => setLocker(e.target.value)}
                        required
                    >
                        <option value="" disabled>
                            Select Locker Array
                        </option>

                        <option value="locker-a">
                            Locker Array 1
                        </option>

                        <option value="locker-b">
                            Locker Array 2
                        </option>

                        <option value="locker-c">
                            Locker Array 3
                        </option>
                    </select>

                    {/* Special Instructions */}

                    <label htmlFor="has-special-instructions">
                        Has Special Instructions
                    </label>

                    <input
                        type="checkbox"
                        id="has-special-instructions"
                        name="has-special-instructions"
                        checked={hasSpecialInstructions}
                        onChange={(e) =>
                            setHasSpecialInstructions(e.target.checked)
                        }
                    />

                    {hasSpecialInstructions && (

                        <div id="instructions-container">

                            <label htmlFor="instructions">
                                Instructions
                            </label>

                            <textarea
                                name="instructions"
                                id="instructions"
                                rows="5"
                                value={instructions}
                                onChange={(e) => setInstructions(e.target.value)}
                            />

                        </div>

                    )}

                    <br />

                    {/* Submit Button */}

                    <button type="submit">
                        Check Package In
                    </button>

                </form>

            </section>
        </main>

    );
}

export default OperatorPackageInput;
