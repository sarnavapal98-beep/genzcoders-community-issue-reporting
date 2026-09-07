import axios from "axios";

// Use relative API path so it works both locally and on Render
const API_BASE_URL = "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// -------------------------
// Authentication
// -------------------------

export const registerUser = (data) => {
  return api.post("/auth/register", data);
};

export const loginUser = (data) => {
  return api.post("/auth/login", data);
};

export const logoutUser = () => {
  return api.post("/auth/logout");
};

export const getCurrentUser = () => {
  return api.get("/auth/me");
};

// -------------------------
// Categories
// -------------------------

export const getCategories = () => {
  return api.get("/categories");
};

// -------------------------
// Departments
// -------------------------

export const getDepartments = () => {
  return api.get("/departments");
};

// -------------------------
// Reports
// -------------------------

export const getMyReports = () => {
  return api.get("/me/reports");
};

export const getReports = (params = {}) => {
  return api.get("/reports", {
    params,
  });
};

export const getDepartmentReports = (departmentId) => {
  return api.get(`/departments/${departmentId}/reports`);
};

export const updateReport = (reportId, data) => {
  return api.patch(`/reports/${reportId}`, data);
};

// -------------------------
// AI / ML Prediction
// -------------------------

export const predictIssue = (imageFile) => {
  const formData = new FormData();

  formData.append("image", imageFile);

  return api.post("/ml/predict", formData);
};

// -------------------------
// Create Report
// -------------------------

export const createReport = (formData) => {
  return api.post("/reports", formData);
};

// -------------------------
// Export Axios instance
// -------------------------

export default api;