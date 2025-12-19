import { BrowserRouter } from "react-router-dom";
import { Providers } from "./providers";
import AppLayout from "./components/layout/app-layout";
import { AuthErrorBoundary } from "./components/error-boundary/auth-error-boundary";

function App() {
  return (
    <AuthErrorBoundary>
      <BrowserRouter>
        <Providers>
          <AppLayout />
        </Providers>
      </BrowserRouter>
    </AuthErrorBoundary>
  );
}

export default App;
