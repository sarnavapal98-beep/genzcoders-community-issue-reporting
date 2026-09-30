// API URL Resolver
const getApiBaseUrl = () => {
  if (typeof window === "undefined") return "/api";

  const { hostname, port, protocol } = window.location;

  // 1. If Flask itself is serving the frontend (port 5000 or production host with no port)
  if (port === "5000" || (!port && hostname !== "localhost" && hostname !== "127.0.0.1")) {
    return "/api";
  }

  // 2. If running on Vite dev server (port 5173), Vite proxies /api to port 5000
  if (port === "5173") {
    return "/api";
  }

  // 3. For any local server (Live Server ports 5500, 5501, 8080, etc.):
  // Match exact hostname (localhost or 127.0.0.1) so SameSite cookies are preserved
  const host = hostname === "localhost" ? "localhost" : "127.0.0.1";
  return `${protocol === "https:" ? "https:" : "http:"}//${host}:5000/api`;
};

const API_BASE_URL = getApiBaseUrl();

const request = async (path, options = {}) => {
  let storedCitizenId = null;
  try {
    const raw = localStorage.getItem("community_user");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.CitizenID) storedCitizenId = String(parsed.CitizenID);
    }
  } catch (e) {}

  const config = {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(storedCitizenId ? { "X-Citizen-ID": storedCitizenId } : {}),
      ...(options.headers || {}),
    },
  };

  const response = await fetch(`${API_BASE_URL}${path}`, config);

  let data = null;
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const error = new Error(
      data?.message || `Request failed with status ${response.status}`
    );
    error.response = { status: response.status, data };
    throw error;
  }

  return { data, status: response.status, headers: response.headers };
};

export const registerUser = (data) =>
  request("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const loginUser = (data) =>
  request("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const logoutUser = () =>
  request("/auth/logout", { method: "POST" });

export const getCurrentUser = () => request("/auth/me");

export const getCategories = () => request("/categories");

export const getDepartments = () => request("/departments");

export const getMyReports = () => request("/me/reports");

export const getReports = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request(`/reports${suffix}`);
};

export const getDepartmentReports = (departmentId) =>
  request(`/departments/${departmentId}/reports`);

export const updateReport = (reportId, data) =>
  request(`/reports/${reportId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const predictIssue = (imageFile) => {
  const formData = new FormData();
  formData.append("image", imageFile);

  return request("/ml/predict", {
    method: "POST",
    body: formData,
  });
};

export const createReport = (formData) =>
  request("/reports", {
    method: "POST",
    body: formData,
  });

export const toggleUpvoteReport = (reportId) =>
  request(`/reports/${reportId}/upvote`, {
    method: "POST",
  });

export default { request };

