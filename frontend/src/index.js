import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";
import { registerAppWorker } from "@/lib/install";
import { loadTurmas } from "@/constants/turmas";

registerAppWorker();

const root = ReactDOM.createRoot(document.getElementById("root"));
const start = () =>
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );

// Carrega as turmas cadastradas antes de abrir o app (no máximo 3 s de espera).
Promise.race([loadTurmas(), new Promise(resolve => setTimeout(resolve, 3000))]).finally(start);
