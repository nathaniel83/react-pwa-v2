import CoreClient from "./core/client";

// Initialize the core client with default values
CoreClient.start();

const hot = !!module.hot;
if (hot) module.hot.accept();