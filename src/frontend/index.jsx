import React from "react";
import { createRoot } from "react-dom/client";
import { Wix } from '@wix/sdk-react'
import App from "./app";

const container = document.getElementById('root');
const root = createRoot(container)

root.render(
    <Wix>
        <App />
    </Wix>
)