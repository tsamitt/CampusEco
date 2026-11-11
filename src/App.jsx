import OperatorPackageInput from "./pages/OperatorPackageInput";
import OperatorMain from "./pages/OperatorMain";
import TrackingMain from "./pages/TrackingMain";
import TrackingDetail from "./pages/TrackingDetail";
import TrackingPreferences from "./pages/TrackingPreferences";
import CourierMain from "./pages/CourierMain";
import CourierRegister from "./pages/CourierRegister";
import CourierUpdate from "./pages/CourierUpdate";

// Temporary routing: pick the page component from the last part of the URL path.
// Anything not listed shows the operator dashboard (same default as before).
const ROUTES = {
  "operatorPackageInput.html": OperatorPackageInput,
  "tracking.html": TrackingMain,
  "trackingdetail.html": TrackingDetail,
  "trackingpreferences.html": TrackingPreferences,
  "courier.html": CourierMain,
  "courierRegister.html": CourierRegister,
  "courierUpdate.html": CourierUpdate,
};

function App() {
  const file = window.location.pathname.split("/").pop();
  const Page = ROUTES[file] || OperatorMain;

  return (
    <>
      <header>
        <nav>
          <h1>Campus Eco</h1>
          <ul>
            <li><a href="operatorMain.html">Operators</a></li>
            <li><a href="courier.html">Couriers</a></li>
            <li><a href="tracking.html">Package Tracking</a></li>
          </ul>
        </nav>
      </header>

      <Page />

      <footer>
        <p>&copy; 2026 Minnesota State University, Mankato</p>
        <p>Campus Eco</p>
      </footer>
    </>
  );
}

export default App;
