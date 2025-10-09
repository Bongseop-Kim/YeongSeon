import { BrowserRouter } from "react-router-dom";
import { Providers } from "./providers";
import AppLayout from "./components/layout/app-layout";

function App() {
  return (
    <BrowserRouter>
      <Providers>
        <AppLayout />
      </Providers>
    </BrowserRouter>
  );
}

export default App;
