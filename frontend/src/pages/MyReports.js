import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyReports } from "../api";

const MyReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getMyReports();
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
          "Unable to load your reports."
      );
    } finally {
      setLoading(false);
    }
  };

  const formatStatus = (status) => {
    if (!status) return "Reported";

    return status
      .toString()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const getStatusClass = (status) => {
    const normalized = (status || "").toLowerCase();

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

  const getCategoryName = (report) => {
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

  const getReportId = (report) => {
    return (
      report.report_id ||
      report.ReportID ||
      report.id ||
      report.ID
    );
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

  const getLocationText = (report) => {
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

    if (latitude !== undefined && longitude !== undefined) {
      return `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`;
    }

    return "Location unavailable";
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1>My Reports</h1>
            <p>Track the community issues you have reported.</p>
          </div>
        </div>

        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading your reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>My Reports</h1>
          <p>
            Track the status of issues you have reported.
          </p>
        </div>

        <Link to="/report" className="btn btn-primary">
          + Report New Issue
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-error">
          <strong>Unable to load reports.</strong>
          <br />
          {error}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadReports}
            style={{ marginTop: "12px" }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!error && reports.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">
            📋
          </div>

          <h2>No Reports Yet</h2>

          <p>
            You have not reported any community issues yet.
          </p>

          <Link to="/report" className="btn btn-primary">
            Report an Issue
          </Link>
        </div>
      )}

      {/* Reports */}
      {!error && reports.length > 0 && (
        <div className="reports-grid">

          {reports.map((report, index) => {
            const reportId = getReportId(report);
            const photoUrl = getPhotoUrl(report);
            const status = report.status || report.Status || "Reported";
            const category = getCategoryName(report);
            const description = getDescription(report);
            const location = getLocationText(report);

            return (
              <div
                className="report-card"
                key={reportId || index}
              >

                {/* Image */}
                {photoUrl ? (
                  <div className="report-card-image">
                    <img
                      src={photoUrl}
                      alt={category}
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                ) : (
                  <div className="report-card-image report-card-no-image">
                    <span>No Image</span>
                  </div>
                )}

                {/* Content */}
                <div className="report-card-content">

                  <div className="report-card-top">
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

                  <h3>{description}</h3>

                  {/* Location */}
                  <div className="report-card-detail">
                    <span className="detail-label">
                      Location
                    </span>

                    <span>
                      {location}
                    </span>
                  </div>

                  {/* Date */}
                  <div className="report-card-detail">
                    <span className="detail-label">
                      Submitted
                    </span>

                    <span>
                      {formatDate(
                        report.date_submitted ||
                          report.DateSubmitted ||
                          report.created_at ||
                          report.createdAt
                      )}
                    </span>
                  </div>

                  {/* Department */}
                  {(report.department ||
                    report.department_name ||
                    report.DepartmentName) && (
                    <div className="report-card-detail">
                      <span className="detail-label">
                        Department
                      </span>

                      <span>
                        {report.department ||
                          report.department_name ||
                          report.DepartmentName}
                      </span>
                    </div>
                  )}

                  {/* Status Timeline */}
                  <div className="status-timeline">

                    <div
                      className={`timeline-step ${
                        [
                          "reported",
                          "acknowledged",
                          "in progress",
                          "resolved",
                        ].includes(
                          status.toLowerCase()
                        )
                          ? "active"
                          : ""
                      }`}
                    >
                      <span className="timeline-dot"></span>
                      <span>Reported</span>
                    </div>

                    <div
                      className={`timeline-step ${
                        [
                          "acknowledged",
                          "in progress",
                          "resolved",
                        ].includes(
                          status.toLowerCase()
                        )
                          ? "active"
                          : ""
                      }`}
                    >
                      <span className="timeline-dot"></span>
                      <span>Acknowledged</span>
                    </div>

                    <div
                      className={`timeline-step ${
                        [
                          "in progress",
                          "resolved",
                        ].includes(
                          status.toLowerCase()
                        )
                          ? "active"
                          : ""
                      }`}
                    >
                      <span className="timeline-dot"></span>
                      <span>In Progress</span>
                    </div>

                    <div
                      className={`timeline-step ${
                        status.toLowerCase() === "resolved"
                          ? "active"
                          : ""
                      }`}
                    >
                      <span className="timeline-dot"></span>
                      <span>Resolved</span>
                    </div>

                  </div>

                </div>
              </div>
            );
          })}

        </div>
      )}

    </div>
  );
};

export default MyReports;