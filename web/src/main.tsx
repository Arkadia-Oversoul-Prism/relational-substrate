import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { Layout } from "./components/Layout";
import { Overview } from "./pages/Overview";
import { Celestial } from "./pages/Celestial";
import { ApiExplorer } from "./pages/ApiExplorer";
import { KnowledgeNotes } from "./pages/KnowledgeNotes";
import { KnowledgeGraph } from "./pages/KnowledgeGraph";
import { KnowledgeSearch } from "./pages/KnowledgeSearch";
import { Lab } from "./pages/Lab";
import { SolSpire } from "./pages/SolSpire";
import { Kernel } from "./pages/Kernel";
import { Governance } from "./pages/Governance";
import { Identity } from "./pages/Identity";
import { Sources } from "./pages/Sources";
import { Commune } from "./pages/Commune";
import { SignIn } from "./pages/SignIn";
import "./styles.css";

function App() {
  return (
    <Routes>
      <Route path="/signin" element={<SignIn />} />
      <Route
        path="*"
        element={
          <Layout>
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/celestial" element={<Celestial />} />
              <Route path="/routes" element={<ApiExplorer />} />
              <Route path="/knowledge" element={<KnowledgeNotes />} />
              <Route path="/knowledge/graph" element={<KnowledgeGraph />} />
              <Route path="/knowledge/search" element={<KnowledgeSearch />} />
              <Route path="/lab" element={<Lab />} />
              <Route path="/spire" element={<SolSpire />} />
              <Route path="/kernel" element={<Kernel />} />
              <Route path="/governance" element={<Governance />} />
              <Route path="/identity" element={<Identity />} />
              <Route path="/sources" element={<Sources />} />
              <Route path="/commune" element={<Commune />} />
              <Route path="*" element={<Overview />} />
            </Routes>
          </Layout>
        }
      />
    </Routes>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
