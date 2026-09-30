import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getReports, getCategories, getDepartments, toggleUpvoteReport } from "../api";
import { useAuth } from "../AuthContext.jsx";
import { exportReportPDF, formatTrackingId } from "../utils/pdfGenerator.js";

const CommunityReports = () => {
  const { user } = useAuth();
  const [copiedId, setCopiedId] = useState(null);
  const [reports, setReports] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [onlyMyReports, setOnlyMyReports] = useState(false);
  const [sortBy, setSortBy] = useState("upvotes"); // 'upvotes', 'newest', 'oldest'

  // Upvoting action state & alert
  const [upvotingIds, setUpvotingIds] = useState({});
  const [upvoteNotice, setUpvoteNotice] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleUpvote = async (reportId) => {
    if (!user) {
      setUpvoteNotice("Please sign in or register to upvote issues so municipal teams can tally community priority.");
      setTimeout(() => setUpvoteNotice(null), 4000);
      return;
    }

    if (upvotingIds[reportId]) return;

    // Optimistic update
    const targetReport = reports.find((r) => (r.ReportID || r.report_id || r.id) === reportId);
    if (!targetReport) return;

    const prevHasUpvoted = Boolean(targetReport.has_upvoted);
    const prevUpvotes = Number(targetReport.upvotes || 0);
    const nextHasUpvoted = !prevHasUpvoted;
    const nextUpvotes = Math.max(0, prevUpvotes + (nextHasUpvoted ? 1 : -1));

    // Update state immediately
    setReports((prev) =>
      prev.map((r) => {
        const id = r.ReportID || r.report_id || r.id;
        if (id === reportId) {
          return { ...r, has_upvoted: nextHasUpvoted ? 1 : 0, upvotes: nextUpvotes };
        }
        return r;
      })
    );

    setUpvotingIds((prev) => ({ ...prev, [reportId]: true }));

    try {
      const res = await toggleUpvoteReport(reportId);
      const serverData = res.data;
      if (serverData && typeof serverData.upvotes === "number") {
        setReports((prev) =>
          prev.map((r) => {
            const id = r.ReportID || r.report_id || r.id;
            if (id === reportId) {
              return {
                ...r,
                has_upvoted: serverData.upvoted ? 1 : 0,
                upvotes: serverData.upvotes,
              };
            }
            return r;
          })
        );
      }
    } catch (err) {
      // Revert on error
      setReports((prev) =>
        prev.map((r) => {
          const id = r.ReportID || r.report_id || r.id;
          if (id === reportId) {
            return { ...r, has_upvoted: prevHasUpvoted ? 1 : 0, upvotes: prevUpvotes };
          }
          return r;
        })
      );
      setUpvoteNotice(
        err.response?.data?.message || err.message || "Failed to update upvote. Please try again."
      );
      setTimeout(() => setUpvoteNotice(null), 3500);
    } finally {
      setUpvotingIds((prev) => {
        const copy = { ...prev };
        delete copy[reportId];
        return copy;
      });
    }
  };


  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [reportsRes, catRes, deptRes] = await Promise.allSettled([
        getReports(),
        getCategories(),
        getDepartments(),
      ]);

      if (reportsRes.status === "fulfilled") {
        const data = reportsRes.value.data;
        if (Array.isArray(data)) {
          setReports(data);
        } else if (Array.isArray(data.reports)) {
          setReports(data.reports);
        } else {
          setReports([]);
        }
      } else {
        throw new Error(reportsRes.reason?.response?.data?.message || "Failed to load reports");
      }

      if (catRes.status === "fulfilled" && catRes.value.data?.categories) {
        setCategories(catRes.value.data.categories);
      }
      if (deptRes.status === "fulfilled" && deptRes.value.data?.departments) {
        setDepartments(deptRes.value.data.departments);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load community reports. Please ensure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  // Helper getters
  const formatStatus = (status) => {
    if (!status) return "Reported";
    return status
      .toString()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const getStatusClass = (status) => {
    const normalized = (status || "").toLowerCase();
    if (normalized.includes("resolved")) return "status-resolved";
    if (normalized.includes("progress")) return "status-progress";
    if (normalized.includes("acknowledged")) return "status-acknowledged";
    return "status-reported";
  };

  const getPhotoUrl = (report) => {
    const photo = report.photo_url || report.photo || report.image_url || report.PhotoURL;
    if (!photo) return null;
    if (photo.startsWith("http://") || photo.startsWith("https://")) return photo;
    const cleanPath = photo.startsWith("/") ? photo : `/${photo}`;
    if (typeof window !== "undefined" && window.location.port === "5500") {
      return `http://127.0.0.1:5000${cleanPath}`;
    }
    return cleanPath;
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "Recently";
    try {
      const date = new Date(dateValue.replace(" ", "T"));
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateValue;
    }
  };

  // Metrics
  const stats = useMemo(() => {
    const total = reports.length;
    const reported = reports.filter((r) => (r.status || "").toLowerCase() === "reported").length;
    const acknowledged = reports.filter((r) => (r.status || "").toLowerCase() === "acknowledged").length;
    const inProgress = reports.filter((r) => (r.status || "").toLowerCase().includes("progress")).length;
    const resolved = reports.filter((r) => (r.status || "").toLowerCase().includes("resolved")).length;
    return { total, reported, acknowledged, inProgress, resolved };
  }, [reports]);

  // Filtered & sorted reports
  const filteredReports = useMemo(() => {
    const list = reports.filter((report) => {
      // 1. Status Filter
      if (statusFilter !== "all") {
        const s = (report.status || "").toLowerCase();
        if (statusFilter === "in_progress" && !s.includes("progress")) return false;
        if (statusFilter !== "in_progress" && s !== statusFilter.toLowerCase()) return false;
      }

      // 2. Category Filter
      if (categoryFilter !== "all") {
        const cat = (report.category || report.category_name || "").toLowerCase();
        if (cat !== categoryFilter.toLowerCase()) return false;
      }

      // 3. Department Filter
      if (departmentFilter !== "all") {
        const dept = (report.department || report.department_name || "").toLowerCase();
        if (dept !== departmentFilter.toLowerCase()) return false;
      }

      // 4. Only My Reports
      if (onlyMyReports && user?.CitizenID) {
        if (report.CitizenID !== user.CitizenID) return false;
      }

      // 5. Search keyword
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const desc = (report.description || "").toLowerCase();
        const cat = (report.category || report.category_name || "").toLowerCase();
        const dept = (report.department || report.department_name || "").toLowerCase();
        const addr = (report.address || "").toLowerCase();
        const citizen = (report.citizen_name || "").toLowerCase();
        const rawId = String(report.ReportID || report.report_id || report.id || "");
        const trackingId = formatTrackingId(report).toLowerCase();
        const refId = `rep-${rawId}`;

        const matches =
          desc.includes(term) ||
          cat.includes(term) ||
          dept.includes(term) ||
          addr.includes(term) ||
          citizen.includes(term) ||
          rawId === term ||
          refId.includes(term) ||
          trackingId.includes(term);

        if (!matches) return false;
      }

      return true;
    });

    const sorted = [...list];
    if (sortBy === "upvotes") {
      sorted.sort((a, b) => {
        const votesA = Number(a.upvotes || 0);
        const votesB = Number(b.upvotes || 0);
        if (votesB !== votesA) return votesB - votesA;
        const dateA = new Date(a.date_submitted || a.created_at || 0).getTime();
        const dateB = new Date(b.date_submitted || b.created_at || 0).getTime();
        return dateB - dateA;
      });
    } else if (sortBy === "oldest") {
      sorted.sort((a, b) => {
        const dateA = new Date(a.date_submitted || a.created_at || 0).getTime();
        const dateB = new Date(b.date_submitted || b.created_at || 0).getTime();
        return dateA - dateB;
      });
    } else {
      // newest
      sorted.sort((a, b) => {
        const dateA = new Date(a.date_submitted || a.created_at || 0).getTime();
        const dateB = new Date(b.date_submitted || b.created_at || 0).getTime();
        return dateB - dateA;
      });
    }

    return sorted;
  }, [reports, statusFilter, categoryFilter, departmentFilter, onlyMyReports, searchTerm, sortBy, user]);

  return (
    <div className="page-container community-feed-page">
      {/* Header */}
      <div className="page-header community-header">
        <div>
          <div className="civic-badge-sm">
            <span className="live-pulse" />
            <span>Open Public Civic Transparency</span>
          </div>
          <h1>Community Issue Feed</h1>
          <p>
            Browse all public infrastructure issues reported by community members across the city.
            Track real-time progress as city departments acknowledge, investigate, and resolve each report.
          </p>
        </div>

        <div className="header-action-group">
          <Link to="/report" className="btn btn-primary">
            <span>＋ Report New Issue</span>
          </Link>
          <Link to="/my-reports" className="btn btn-secondary">
            <span>▣ My Submissions</span>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="community-stats-grid">
        <div className="summary-card stat-all" onClick={() => setStatusFilter("all")}>
          <span className="summary-label">Total Community Issues</span>
          <div className="summary-number">{stats.total}</div>
          <span className="stat-sub">Across All Districts</span>
        </div>

        <div
          className={`summary-card stat-progress ${statusFilter === "in_progress" ? "active-stat" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "in_progress" ? "all" : "in_progress")}
        >
          <span className="summary-label">Currently In Progress</span>
          <div className="summary-number">{stats.inProgress}</div>
          <span className="stat-sub">Crews Dispatched</span>
        </div>

        <div
          className={`summary-card stat-resolved ${statusFilter === "resolved" ? "active-stat" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "resolved" ? "all" : "resolved")}
        >
          <span className="summary-label">Fixed &amp; Resolved</span>
          <div className="summary-number">{stats.resolved}</div>
          <span className="stat-sub">Successful Repairs</span>
        </div>

        <div
          className={`summary-card stat-reported ${statusFilter === "reported" ? "active-stat" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "reported" ? "all" : "reported")}
        >
          <span className="summary-label">Pending Triage</span>
          <div className="summary-number">{stats.reported + stats.acknowledged}</div>
          <span className="stat-sub">Under Inspection</span>
        </div>
      </div>

      {/* Interactive Filters & Search Bar */}
      <div className="feed-controls-panel">
        <div className="search-row">
          <div className="search-input-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by Unique Tracking ID (e.g. REP-2026-00005, #5), category, address, or reporter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchTerm("")}
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Toggle: Only My Reports */}
          {user && (
            <label className="filter-pill-toggle">
              <input
                type="checkbox"
                checked={onlyMyReports}
                onChange={(e) => setOnlyMyReports(e.target.checked)}
              />
              <span className="toggle-chip">
                <span>★</span> Only My Reports
              </span>
            </label>
          )}
        </div>

        {/* Dropdown Filters Row */}
        <div className="filters-row">
          {/* Status Tabs */}
          <div className="status-pills-bar">
            {["all", "Reported", "Acknowledged", "in_progress", "Resolved"].map((s) => (
              <button
                key={s}
                type="button"
                className={`status-tab-btn ${statusFilter === s ? "active" : ""}`}
                onClick={() => setStatusFilter(s)}
              >
                {s === "all" ? "All Statuses" : formatStatus(s)}
              </button>
            ))}
          </div>

          <div className="selects-group">
            {/* Department Filter */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.DepartmentID} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.CategoryID} value={cat.name}>
                  {cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sort & Community Priority Controls */}
        <div className="sort-controls-row">
          <span className="sort-controls-label">Priority Order:</span>
          <div className="sort-pills-group">
            <button
              type="button"
              className={`sort-pill-btn ${sortBy === "upvotes" ? "active" : ""}`}
              onClick={() => setSortBy("upvotes")}
              title="Prioritize issues that multiple community citizens have upvoted"
            >
              🔥 Most Upvoted (High Priority)
            </button>
            <button
              type="button"
              className={`sort-pill-btn ${sortBy === "newest" ? "active" : ""}`}
              onClick={() => setSortBy("newest")}
            >
              🕒 Newest First
            </button>
            <button
              type="button"
              className={`sort-pill-btn ${sortBy === "oldest" ? "active" : ""}`}
              onClick={() => setSortBy("oldest")}
            >
              ⏳ Oldest First
            </button>
          </div>
        </div>
      </div>

      {/* Upvote Notice Toast */}
      {upvoteNotice && (
        <div className="upvote-toast-alert" role="status">
          <div className="upvote-toast-content">
            <span className="toast-icon">⚡</span>
            <span>{upvoteNotice}</span>
          </div>
          <button
            type="button"
            className="toast-close"
            onClick={() => setUpvoteNotice(null)}
            title="Dismiss notice"
          >
            ✕
          </button>
        </div>
      )}

      {/* Loading & Error States */}
      {loading && (
        <div className="loading-state">
          <div className="loading-card">
            <div className="loading-spinner" />
            <p>Loading community reports...</p>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="alert alert-error">
          <p>{error}</p>
          <button type="button" onClick={loadData} className="btn btn-secondary btn-sm" style={{ marginTop: 8 }}>
            Retry Loading
          </button>
        </div>
      )}

      {/* Reports Feed Grid */}
      {!loading && !error && (
        <>
          <div className="results-count-bar">
            <span>
              Showing <strong>{filteredReports.length}</strong> {filteredReports.length === 1 ? "report" : "reports"}
              {(statusFilter !== "all" || categoryFilter !== "all" || departmentFilter !== "all" || searchTerm || onlyMyReports || sortBy !== "upvotes") && " (filtered)"}
            </span>
            {(statusFilter !== "all" || categoryFilter !== "all" || departmentFilter !== "all" || searchTerm || onlyMyReports || sortBy !== "upvotes") && (
              <button
                type="button"
                className="reset-filters-link"
                onClick={() => {
                  setStatusFilter("all");
                  setCategoryFilter("all");
                  setDepartmentFilter("all");
                  setSearchTerm("");
                  setOnlyMyReports(false);
                  setSortBy("upvotes");
                }}
              >
                Reset all filters
              </button>
            )}
          </div>

          {filteredReports.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h3>No Community Reports Found</h3>
              <p>
                {searchTerm || statusFilter !== "all" || categoryFilter !== "all"
                  ? "No community reports match your current filters. Try changing or clearing your search criteria."
                  : "No reports have been submitted yet. Be the first to report an issue in your neighborhood!"}
              </p>
              <Link to="/report" className="btn btn-primary" style={{ marginTop: 16, display: "inline-block" }}>
                Submit a Community Report
              </Link>
            </div>
          ) : (
            <div className="reports-grid">
              {filteredReports.map((report) => {
                const isMyReport = user?.CitizenID && report.CitizenID === user.CitizenID;
                const photoUrl = getPhotoUrl(report);
                const reportId = report.ReportID || report.report_id || report.id;
                const trackingId = formatTrackingId(report);

                return (
                  <div key={reportId} className={`report-card ${isMyReport ? "my-report-card" : ""}`}>
                    {/* Card Photo Header */}
                    {photoUrl ? (
                      <div className="report-card-media">
                        <img
                          src={photoUrl}
                          alt={report.category || "Report photo"}
                          className="report-card-image"
                          loading="lazy"
                        />
                        <div className="media-overlay">
                          <span className={`status ${getStatusClass(report.status)}`}>
                            {formatStatus(report.status)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="report-card-no-image">
                        <span className="no-image-tag">No Photo Attached</span>
                        <span className={`status ${getStatusClass(report.status)}`}>
                          {formatStatus(report.status)}
                        </span>
                      </div>
                    )}

                    <div className="report-card-content">
                      {/* Prominent Unique Tracking ID Header */}
                      <div className="card-tracking-header">
                        <div className="tracking-id-pill" title="Unique Issue Tracking ID Number">
                          <span className="tracking-icon">🏷️</span>
                          <span className="tracking-num">{trackingId}</span>
                          <button
                            type="button"
                            className="btn-copy-mini"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(trackingId);
                              setCopiedId(reportId);
                              setTimeout(() => setCopiedId(null), 2000);
                            }}
                            title="Copy Unique Tracking ID to clipboard"
                          >
                            {copiedId === reportId ? "✓ Copied" : "Copy ID"}
                          </button>
                        </div>
                        <div className="tracking-right-meta">
                          {Number(report.upvotes || 0) > 0 && (
                            <span
                              className={`priority-flag-pill ${Number(report.upvotes) >= 2 ? "high-priority" : ""}`}
                              title={`${report.upvotes} citizen(s) confirmed this same issue`}
                            >
                              {Number(report.upvotes) >= 2 ? "🔥 High Priority" : "👥 Endorsed"} ({report.upvotes})
                            </span>
                          )}
                          <span className="report-ref-badge">#REP-{reportId}</span>
                          {isMyReport && <span className="your-report-chip">★ Your Report</span>}
                        </div>
                      </div>

                      {/* Top Bar: Category & Department */}
                      <div className="report-card-top">
                        <div className="category-meta">
                          <span className="report-category">
                            {report.category || report.category_name || "Community Issue"}
                          </span>
                          {report.department && (
                            <span className="report-dept-pill">
                              🏛️ {report.department}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <div className="report-card-detail">
                        <span className="detail-label">Issue Details</span>
                        <p className="report-desc-text">
                          {report.description || "No additional description provided."}
                        </p>
                      </div>

                      {/* Location Address & Map Link */}
                      {(report.address || (report.latitude && report.longitude)) && (
                        <div className="report-card-location">
                          <span className="detail-label">Location</span>
                          <div className="location-info">
                            <span className="loc-icon">📍</span>
                            <span className="loc-address">
                              {report.address || `${Number(report.latitude).toFixed(4)}, ${Number(report.longitude).toFixed(4)}`}
                            </span>
                          </div>
                          {report.map_link && (
                            <a
                              href={report.map_link}
                              target="_blank"
                              rel="noreferrer"
                              className="map-view-link"
                            >
                              Open in Maps ↗
                            </a>
                          )}
                        </div>
                      )}

                      {/* Community Upvote Endorsement Section */}
                      <div className="card-upvote-section">
                        <button
                          type="button"
                          className={`btn-upvote ${report.has_upvoted ? "upvoted" : ""}`}
                          onClick={() => handleToggleUpvote(reportId)}
                          disabled={Boolean(upvotingIds[reportId])}
                          title={
                            user
                              ? (report.has_upvoted
                                  ? "You confirmed this issue. Click to remove upvote."
                                  : "Facing this issue too? Click to upvote and bring this to municipal admin priority!")
                              : "Log in to upvote and bring this issue to municipal admin priority"
                          }
                        >
                          <span className="upvote-icon">{report.has_upvoted ? "▲" : "△"}</span>
                          <span className="upvote-text">
                            {report.has_upvoted ? "Upvoted" : "I Have This Too"}
                          </span>
                          <span className="upvote-badge-count">{report.upvotes || 0}</span>
                        </button>

                        <div className="upvote-community-status">
                          {Number(report.upvotes || 0) === 0 ? (
                            <span className="upvote-meta-text">0 upvotes • Face this too? Upvote to escalate</span>
                          ) : Number(report.upvotes) === 1 ? (
                            <span className="upvote-meta-text">
                              <strong>1</strong> citizen affected • Brought to admin notice
                            </span>
                          ) : (
                            <span className="upvote-meta-text high-impact">
                              🔥 <strong>{report.upvotes}</strong> citizens affected • Municipal Priority
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Footer: Date & Reporter */}
                      <div className="report-card-footer">
                        <div className="footer-meta">
                          <span className="reporter-name">
                            👤 {report.citizen_name || "Community Citizen"}
                          </span>
                          <span className="report-date">
                            🕒 {formatDate(report.date_submitted || report.created_at)}
                          </span>
                        </div>

                        <div className="footer-right-group">
                          <button
                            type="button"
                            className="btn-card-pdf-sm"
                            onClick={() => exportReportPDF(report, user)}
                            title="Download official PDF summary with unique tracking ID"
                          >
                            📄 PDF
                          </button>

                          {/* Interactive Status Indicator */}
                          <div className="status-progress-track" title={`Current Status: ${formatStatus(report.status)}`}>
                            <span className={`step-dot ${["reported", "acknowledged", "in progress", "resolved"].includes((report.status || "").toLowerCase()) ? "active" : ""}`} title="Reported" />
                            <span className={`step-line ${["acknowledged", "in progress", "resolved"].includes((report.status || "").toLowerCase()) ? "active" : ""}`} />
                            <span className={`step-dot ${["acknowledged", "in progress", "resolved"].includes((report.status || "").toLowerCase()) ? "active" : ""}`} title="Acknowledged" />
                            <span className={`step-line ${["in progress", "resolved"].includes((report.status || "").toLowerCase()) ? "active" : ""}`} />
                            <span className={`step-dot ${["in progress", "resolved"].includes((report.status || "").toLowerCase()) ? "active" : ""}`} title="In Progress" />
                            <span className={`step-line ${(report.status || "").toLowerCase().includes("resolved") ? "active" : ""}`} />
                            <span className={`step-dot ${(report.status || "").toLowerCase().includes("resolved") ? "active" : ""}`} title="Resolved" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CommunityReports;
