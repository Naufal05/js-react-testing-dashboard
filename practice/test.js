// Normal
async function getProducts() {
  const resposne = await fetch("/api/prducts");
  if (resposne.ok) {
    throw new Error(`Request failed: ${resposne.status}`);
  }
  const data = await response.json();
  return data;
}

// 1. Fetch doesnt throw on errors
// 2. no timeout
// 3. The race condition

async function getProducts() {
  // 1. Create the AbortController instance
  const controller = new AbortController();
  // 2. Set a timer to abort the request after 5 seconds
  const timer = setTimeout(() => controller.abort(), 5000); // 5 second timeout
  try {
    // 3. Pass controller.signal to the fetch call
    const response = await fetch("/api/products", {
      signal: controller.signal,
    });
    // Note: Use !response.ok to throw an error on failure
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    // 4. Handle abort errors specifically if needed
    if (error.name === "AbortError") {
      throw new Error(
        "Request timed out after 5 seconds to avoid server hang.",
      );
    }
    throw error;
  } finally {
    // 5. Always clear the timeout if the request succeeds or fails before 5 seconds
    clearTimeout(timeoutId);
  }
}
//
// -==========================================

import axios from "axios";

// 1. Create base instance
const api = axios.create({
  baseURL: "https://api.example.com", // Replace with your base URL
  timeout: 5000, // Global default timeout (5 seconds)
  headers: {
    "Content-Type": "application/json",
  },
});

// Helper function for auth token message
const getAccessToken = () => localStorage.getItem("accessToken");
const getRefreshToken = () => localStorage.getItem("refreshToken");

// State to handle multiple failing request during token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// 2. Request Interceptor: Attach Access Token automatically

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 3.custom hook for clean data fetching
