// Small fetch wrapper. Keeping the API paths relative means the same
// frontend works locally (through Vite's proxy) and in production when
// Flask serves the built frontend from the same origin.

const API_BASE_URL = "/api";

const request = async (path, options = {}) => {
  const config = {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
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

export default { request };
