import OperatorPackageInput from "./pages/OperatorPackageInput";
import OperatorMain from "./pages/OperatorMain";

function App() {
  const currentPage = window.location.pathname;
  let page = null;
  if (currentPage.endsWith("/operatorPackageInput.html")) {
    page = <OperatorPackageInput />;
  } else {
    page = <OperatorMain />;
  }
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

      {page}

      <footer>
        <p>&copy; 2026 Minnesota State University, Mankato</p>
        <p>Campus Eco</p>
      </footer>
    </>
  );
}

export default App;