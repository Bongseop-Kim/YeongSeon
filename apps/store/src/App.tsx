import { BrowserRouter } from "react-router-dom";
import { Providers } from "@/app/providers";
import AppLayout from "@/app/layout/app-layout";
import { AuthErrorBoundary } from "@/shared/composite/auth-error-boundary";

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
