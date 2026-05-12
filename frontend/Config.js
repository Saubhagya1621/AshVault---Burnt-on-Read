// AshVault — API base URL

const API_BASE =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:8000"
    : "https://ashvault-burnt-on-read.onrender.com";