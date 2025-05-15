import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app";
import "./styles/app.css";

const container = document.getElementById('root');
const root = createRoot(container);

// Development mode without Wix context
root.render(<App />); 