import React, { useEffect, useState } from "react";
import {
  getReports,
  getDepartments,
  updateReport,
} from "../api";
import { useAuth } from "../AuthContext.jsx";

const AdminDashboard = () => {
  const { user } = useAuth();

  const [reports, setReports] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadDepartments();
    loadReports();
  }, []);

  const loadDepartments = async () => {
    try {
      const response = await getDepartments();
      const data = response.data;

      if (Array.isArray(data)) {
        setDepartments(data);
      } else if (Array.isArray(data.departments)) {
        setDepartments(data.departments);
      } else {
        setDepartments([]);
      }
    } catch (err) {
      console.error("Unable to load departments:", err);
    }
  };

  const loadReports = async () => {
    setLoading(true);
    setError("");

    try {
      const params = {};

      if (selectedDepartment) {
        params.department_id = selectedDepartment;
      }

      if (selectedCategory) {
        params.category = selectedCategory;
      }

      if (selectedStatus) {
        params.status = selectedStatus;
      }

      const response = await getReports(params);
      const data = response.data;

      if (Array.isArray(data)) {
        setReports(data);
      } else if (Array.isArray(data.reports)) {
        setReports(data.reports);
      } else {
        setReports([]);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load reports."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    loadReports();
  };

  const clearFilters = () => {
    setSelectedDepartment("");
    setSelectedCategory("");
    setSelectedStatus("");

    setTimeout(() => {
      loadReports();
    }, 0);
  };

  const getReportId = (report) => {
    return (
      report.report_id ||
      report.ReportID ||
      report.id ||
      report.ID
    );
  };

  const getCategory = (report) => {
    return (
      report.category_name ||
      report.category ||
      report.CategoryName ||
      report.Category ||
      "Unknown"
    );
  };

  const getDescription = (report) => {
    return (
      report.description ||
      report.Description ||
      "No description provided."
    );
  };

  const getStatus = (report) => {
    return (
      report.status ||
      report.Status ||
      "Reported"
    );
  };

  const getLocation = (report) => {
    const location =
      report.location ||
      report.Location ||
      report.location_name;

    if (typeof location === "string" && location.trim()) {
      return location;
    }

    const latitude =
      report.latitude ??
      report.Latitude ??
      report.lat;

    const longitude =
      report.longitude ??
      report.Longitude ??
      report.lng;

    if (
      latitude !== undefined &&
      longitude !== undefined
    ) {
      return `${Number(latitude).toFixed(5)}, ${Number(
        longitude
      ).toFixed(5)}`;
    }

    return "Location unavailable";
  };

  const getPhotoUrl = (report) => {
  const photo =
    report.photo_url ||
    report.photo ||
    report.image_url ||
    report.PhotoURL;

  if (!photo) {
    return null;
  }

  if (
    photo.startsWith("http://") ||
    photo.startsWith("https://")
  ) {
    return photo;
  }

  if (photo.startsWith("/")) {
    return photo;
  }

  return `/${photo}`;
};
  const getDate = (report) => {
    return (
      report.date_submitted ||
      report.DateSubmitted ||
      report.created_at ||
      report.createdAt
    );
  };

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "Date unavailable";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return dateValue;
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatStatus = (status) => {
    return status
      .toString()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const getStatusClass = (status) => {
    const normalized = status.toLowerCase();

    if (normalized.includes("resolved")) {
      return "status-resolved";
    }

    if (normalized.includes("progress")) {
      return "status-progress";
    }

    if (normalized.includes("acknowledged")) {
      return "status-acknowledged";
    }

    return "status-reported";
  };

  const handleStatusChange = async (reportId, newStatus) => {
    if (!reportId || !newStatus) {
      return;
    }

    setUpdatingId(reportId);
    setError("");
    setSuccess("");

    try {
      const response = await updateReport(reportId, {
        status: newStatus,
      });

      const data = response.data;

      if (data?.success === false) {
        throw new Error(
          data.message || "Unable to update report."
        );
      }

      setReports((previousReports) =>
        previousReports.map((report) => {
          const currentId = getReportId(report);

          if (String(currentId) === String(reportId)) {
            return {
              ...report,
              status: newStatus,
              Status: newStatus,
            };
          }

          return report;
        })
      );

      setSuccess(
        `Report #${reportId} status updated to ${formatStatus(
          newStatus
        )}.`
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to update report status."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const getSummaryCount = (status) => {
    return reports.filter(
      (report) =>
        getStatus(report).toLowerCase() ===
        status.toLowerCase()
    ).length;
  };

  return (
    <div className="page-container">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Admin Dashboard</h1>

          <p>
            Manage incoming community issue reports and
            update their status.
          </p>

          {user && (
            <small>
              Logged in as:{" "}
              <strong>
                {user.name || user.email}
              </strong>
            </small>
          )}
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={loadReports}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh Reports"}
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      {/* Summary */}
      <div className="dashboard-summary">

        <div className="summary-card">
          <span className="summary-label">
            Total Reports
          </span>

          <strong className="summary-number">
            {reports.length}
          </strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">
            Reported
          </span>

          <strong className="summary-number">
            {getSummaryCount("Reported")}
          </strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">
            Acknowledged
          </span>

          <strong className="summary-number">
            {getSummaryCount("Acknowledged")}
          </strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">
            In Progress
          </span>

          <strong className="summary-number">
            {getSummaryCount("In Progress")}
          </strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">
            Resolved
          </span>

          <strong className="summary-number">
            {getSummaryCount("Resolved")}
          </strong>
        </div>

      </div>

      {/* Filters */}
      <div className="filter-section">

        <div className="filter-header">
          <h2>Filter Reports</h2>
        </div>

        <div className="filter-grid">

          {/* Department */}
          <div className="form-group">
            <label
              htmlFor="department"
              className="form-label"
            >
              Department
            </label>

            <select
              id="department"
              className="form-input"
              value={selectedDepartment}
              onChange={(event) =>
                setSelectedDepartment(
                  event.target.value
                )
              }
            >
              <option value="">
                All Departments
              </option>

              {departments.map((department, index) => {
                const id =
                  department.department_id ||
                  department.DepartmentID ||
                  department.id ||
                  department.ID ||
                  index;

                const name =
                  department.name ||
                  department.Name ||
                  department.department_name ||
                  "Department";

                return (
                  <option
                    key={id}
                    value={id}
                  >
                    {name}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Category */}
          <div className="form-group">
            <label
              htmlFor="category"
              className="form-label"
            >
              Category
            </label>

            <select
              id="category"
              className="form-input"
              value={selectedCategory}
              onChange={(event) =>
                setSelectedCategory(
                  event.target.value
                )
              }
            >
              <option value="">
                All Categories
              </option>

              <option value="cardboard">
                Cardboard
              </option>

              <option value="glass">
                Glass
              </option>

              <option value="metal">
                Metal
              </option>

              <option value="paper">
                Paper
              </option>

              <option value="plastic">
                Plastic
              </option>

              <option value="pothole">
                Pothole
              </option>

              <option value="street light">
                Street Light
              </option>

              <option value="trash">
                Trash
              </option>

              <option value="water leakage">
                Water Leakage
              </option>
            </select>
          </div>

          {/* Status */}
          <div className="form-group">
            <label
              htmlFor="status"
              className="form-label"
            >
              Status
            </label>

            <select
              id="status"
              className="form-input"
              value={selectedStatus}
              onChange={(event) =>
                setSelectedStatus(
                  event.target.value
                )
              }
            >
              <option value="">
                All Statuses
              </option>

              <option value="Reported">
                Reported
              </option>

              <option value="Acknowledged">
                Acknowledged
              </option>

              <option value="In Progress">
                In Progress
              </option>

              <option value="Resolved">
                Resolved
              </option>
            </select>
          </div>

        </div>

        <div className="filter-actions">

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleFilter}
          >
            Apply Filters
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={clearFilters}
          >
            Clear Filters
          </button>

        </div>

      </div>

      {/* Reports */}
      <div className="admin-reports-section">

        <div className="section-header">
          <h2>Incoming Reports</h2>

          <span>
            {reports.length} report
            {reports.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="empty-state">

            <div className="empty-state-icon">
              📋
            </div>

            <h2>No Reports Found</h2>

            <p>
              There are no reports matching the
              selected filters.
            </p>

          </div>
        ) : (
          <div className="admin-report-list">

            {reports.map((report, index) => {
              const reportId = getReportId(report);
              const category = getCategory(report);
              const description = getDescription(report);
              const status = getStatus(report);
              const photoUrl = getPhotoUrl(report);
              const location = getLocation(report);

              return (
                <div
                  className="admin-report-card"
                  key={reportId || index}
                >

                  {/* Image */}
                  <div className="admin-report-image">

                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={category}
                        onError={(event) => {
                          event.currentTarget.style.display =
                            "none";
                        }}
                      />
                    ) : (
                      <div className="report-card-no-image">
                        No Image
                      </div>
                    )}

                  </div>

                  {/* Details */}
                  <div className="admin-report-details">

                    <div className="admin-report-header">

                      <div>
                        <span className="report-category">
                          {category}
                        </span>

                        {reportId && (
                          <span className="report-id">
                            Report #{reportId}
                          </span>
                        )}
                      </div>

                      <span
                        className={`status-badge ${getStatusClass(
                          status
                        )}`}
                      >
                        {formatStatus(status)}
                      </span>

                    </div>

                    <h3>
                      {description}
                    </h3>

                    <div className="admin-report-meta">

                      <div>
                        <strong>
                          Location:
                        </strong>{" "}
                        {location}
                      </div>

                      <div>
                        <strong>
                          Submitted:
                        </strong>{" "}
                        {formatDate(
                          getDate(report)
                        )}
                      </div>

                      {(report.department ||
                        report.department_name ||
                        report.DepartmentName) && (
                        <div>
                          <strong>
                            Department:
                          </strong>{" "}
                          {report.department ||
                            report.department_name ||
                            report.DepartmentName}
                        </div>
                      )}

                      {(report.citizen_name ||
                        report.CitizenName ||
                        report.name) && (
                        <div>
                          <strong>
                            Citizen:
                          </strong>{" "}
                          {report.citizen_name ||
                            report.CitizenName ||
                            report.name}
                        </div>
                      )}

                    </div>

                    {/* Status Update */}
                    <div className="status-update">

                      <label
                        htmlFor={`status-${reportId}`}
                        className="form-label"
                      >
                        Update Status
                      </label>

                      <div className="status-update-row">

                        <select
                          id={`status-${reportId}`}
                          className="form-input"
                          value={status}
                          disabled={
                            updatingId === reportId
                          }
                          onChange={(event) =>
                            handleStatusChange(
                              reportId,
                              event.target.value
                            )
                          }
                        >
                          <option value="Reported">
                            Reported
                          </option>

                          <option value="Acknowledged">
                            Acknowledged
                          </option>

                          <option value="In Progress">
                            In Progress
                          </option>

                          <option value="Resolved">
                            Resolved
                          </option>
                        </select>

                        {updatingId === reportId && (
                          <span className="update-loading">
                            Updating...
                          </span>
                        )}

                      </div>

                    </div>

                  </div>

                </div>
              );
            })}

          </div>
        )}

      </div>

    </div>
  );
};

export default AdminDashboard;
