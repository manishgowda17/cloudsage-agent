import axios from "axios";
import { insforgeService } from "./insforge";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 45000,
});

// Automatically attach InsForge Bearer access token to authorized FastAPI requests
apiClient.interceptors.request.use((config) => {
  const token = insforgeService.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
