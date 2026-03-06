import axios from "axios";

const baseURL = window.location.hostname === "localhost"
  ? "http://localhost:5000/api"
  : "https://mzdhklfk-5000.inc1.devtunnels.ms/api";

const API = axios.create({
  baseURL,
  withCredentials: true, // 🍪 Send cookies automatically with every request
});

export default API;