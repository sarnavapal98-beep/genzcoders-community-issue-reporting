/**
 * Official Civic Report PDF Summary Generator
 * Creates an official, formatted municipal document and triggers browser PDF save/print.
 */

export const formatTrackingId = (report) => {
  if (!report) return "REP-PENDING";
  const reportId = report.ReportID || report.report_id || report.id || report.ID;
  if (!reportId) return "REP-PENDING";

  let year = new Date().getFullYear();
  const dateVal = report.date_submitted || report.DateSubmitted || report.created_at || report.createdAt;
  if (dateVal) {
    try {
      const d = new Date(typeof dateVal === "string" ? dateVal.replace(" ", "T") : dateVal);
      if (!isNaN(d.getFullYear())) year = d.getFullYear();
    } catch (e) {}
  }

  return `REP-${year}-${String(reportId).padStart(5, "0")}`;
};

export const exportReportPDF = (report, user) => {
  if (!report) return;

  const reportId = report.ReportID || report.report_id || report.id || "PENDING";
  const uniqueTrackingNumber = formatTrackingId(report);
  const verificationCode = `CIVIC-${Math.random().toString(36).substring(2, 9).toUpperCase()}-${Date.now().toString().slice(-4)}`;
  
  const category = report.category || report.category_name || "Community Issue";
  const department = report.department || report.department_name || "Municipal Public Works";
  const description = report.description || "No description provided.";
  const status = report.status || "Reported";
  
  const citizenName = user?.name || report.citizen_name || "Registered Citizen";
  const citizenEmail = user?.email || report.citizen_email || "Not Provided";
  const citizenId = user?.CitizenID ? `#CIT-${user.CitizenID}` : (report.CitizenID ? `#CIT-${report.CitizenID}` : "Verified Citizen");
  
  const dateFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const locationText = report.address 
    ? report.address 
    : (report.latitude && report.longitude 
        ? `${Number(report.latitude).toFixed(5)}, ${Number(report.longitude).toFixed(5)}` 
        : "Location coordinates recorded via GPS");

  const mapLink = report.map_link || (report.latitude && report.longitude ? `https://www.google.com/maps?q=${report.latitude},${report.longitude}` : null);

  // Photo URL resolution
  let photoUrl = report.photo_url || report.photo || report.image_url || null;
  if (photoUrl && !photoUrl.startsWith("http://") && !photoUrl.startsWith("https://")) {
    const cleanPath = photoUrl.startsWith("/") ? photoUrl : `/${photoUrl}`;
    const host = typeof window !== "undefined" ? (window.location.hostname || "127.0.0.1") : "127.0.0.1";
    photoUrl = `http://${host}:5000${cleanPath}`;
  }

  const printWindow = window.open("", "_blank", "width=900,height=960");
  if (!printWindow) {
    alert("Please allow popups to view and download your PDF summary receipt.");
    return;
  }

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Official Report Summary - ${uniqueTrackingNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background: #f8fafc;
      padding: 30px 20px;
      line-height: 1.5;
    }
    .page-container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
      overflow: hidden;
    }
    /* Action Bar (Screen Only) */
    .screen-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      background: #0f766e;
      color: #ffffff;
    }
    .screen-actions-title {
      font-weight: 700;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .action-btn-group {
      display: flex;
      gap: 10px;
    }
    .btn-print {
      background: #ffffff;
      color: #0f766e;
      border: none;
      padding: 8px 18px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .btn-print:hover {
      background: #f0fdf4;
      transform: translateY(-1px);
    }
    .btn-close {
      background: rgba(255,255,255,0.2);
      color: #ffffff;
      border: 1px solid rgba(255,255,255,0.4);
      padding: 8px 14px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
    }
    .btn-close:hover {
      background: rgba(255,255,255,0.3);
    }

    /* Document Body */
    .receipt-body {
      padding: 40px;
    }

    /* Official Header */
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f766e;
      padding-bottom: 20px;
      margin-bottom: 25px;
    }
    .gov-brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .gov-seal {
      width: 54px;
      height: 54px;
      background: linear-gradient(135deg, #0f766e, #14b8a6);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-weight: 800;
      font-size: 20px;
      letter-spacing: -1px;
    }
    .gov-title h1 {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
    }
    .gov-title p {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .receipt-badge {
      text-align: right;
    }
    .receipt-badge .doc-type {
      font-size: 10px;
      font-weight: 800;
      color: #0f766e;
      background: #f0fdfa;
      border: 1px solid #99f6e4;
      padding: 4px 10px;
      border-radius: 999px;
      display: inline-block;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .receipt-badge .doc-date {
      font-size: 11px;
      color: #64748b;
      margin-top: 5px;
    }

    /* Primary ID Banner */
    .id-banner {
      background: #f8fafc;
      border: 2px dashed #cbd5e1;
      border-radius: 12px;
      padding: 18px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 25px;
    }
    .id-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }
    .id-number {
      font-size: 26px;
      font-weight: 800;
      color: #0f766e;
      letter-spacing: 0.05em;
      font-family: monospace;
    }
    .status-pill {
      display: inline-block;
      padding: 6px 14px;
      background: #e0f2fe;
      color: #0369a1;
      border: 1px solid #bae6fd;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Info Grid */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 25px;
    }
    .info-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 18px;
    }
    .info-card-label {
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 5px;
    }
    .info-card-value {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
    }
    .info-card-sub {
      font-size: 11px;
      color: #64748b;
      margin-top: 3px;
    }

    /* Description Box */
    .section-block {
      margin-bottom: 25px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-left: 3px solid #0f766e;
      padding-left: 10px;
      margin-bottom: 10px;
    }
    .desc-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px;
      font-size: 14px;
      color: #334155;
      line-height: 1.6;
    }

    /* Photo attachment if available */
    .photo-box {
      margin-top: 15px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
      max-width: 320px;
      background: #f1f5f9;
    }
    .photo-box img {
      width: 100%;
      height: 200px;
      object-fit: cover;
      display: block;
    }
    .photo-caption {
      padding: 8px 12px;
      font-size: 11px;
      color: #64748b;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
    }

    /* Tracking Guidance */
    .guidance-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 25px;
    }
    .guidance-title {
      font-size: 12px;
      font-weight: 700;
      color: #15803d;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .guidance-text {
      font-size: 12px;
      color: #166534;
      line-height: 1.5;
    }

    /* Footer & Verification */
    .doc-footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #94a3b8;
    }
    .digital-seal {
      font-family: monospace;
      color: #64748b;
    }

    /* Print Specific Styles */
    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .screen-actions {
        display: none !important;
      }
      .page-container {
        border: none;
        box-shadow: none;
        max-width: 100%;
      }
      .receipt-body {
        padding: 20px 0;
      }
      @page {
        margin: 1.5cm;
      }
    }
  </style>
</head>
<body>
  <div class="page-container">
    <!-- Top Action Bar for screen viewing -->
    <div class="screen-actions">
      <div class="screen-actions-title">
        <span>📄</span> Official Civic Report Summary
      </div>
      <div class="action-btn-group">
        <button class="btn-print" onclick="window.print()">
          <span>🖨️</span> Save as PDF / Print
        </button>
        <button class="btn-close" onclick="window.close()">
          ✕ Close
        </button>
      </div>
    </div>

    <!-- Printable Receipt Content -->
    <div class="receipt-body">
      <!-- Header -->
      <div class="doc-header">
        <div class="gov-brand">
          <div class="gov-seal">CR</div>
          <div class="gov-title">
            <h1>Community Reports System</h1>
            <p>Municipal Civic Transparency &amp; Infrastructure Portal</p>
          </div>
        </div>
        <div class="receipt-badge">
          <span class="doc-type">Official Citizen Receipt</span>
          <div class="doc-date">${dateFormatted}</div>
        </div>
      </div>

      <!-- Unique Tracking ID Banner -->
      <div class="id-banner">
        <div>
          <div class="id-label">Unique Issue Tracking ID Number</div>
          <div class="id-number">${uniqueTrackingNumber}</div>
          <div style="font-size: 12px; color: #475569; margin-top: 4px; font-weight: 600;">Issue Reference: #REP-${reportId}</div>
        </div>
        <div>
          <span class="status-pill">${status}</span>
        </div>
      </div>

      <!-- 4-Card Summary Grid -->
      <div class="info-grid">
        <div class="info-card">
          <div class="info-card-label">Issue Category</div>
          <div class="info-card-value">${category}</div>
          <div class="info-card-sub">Classified by Municipal AI vision</div>
        </div>

        <div class="info-card">
          <div class="info-card-label">Assigned Department</div>
          <div class="info-card-value">${department}</div>
          <div class="info-card-sub">Dispatched for municipal triage</div>
        </div>

        <div class="info-card">
          <div class="info-card-label">Citizen Reporter</div>
          <div class="info-card-value">${citizenName}</div>
          <div class="info-card-sub">${citizenEmail} • ${citizenId}</div>
        </div>

        <div class="info-card">
          <div class="info-card-label">Reported Location</div>
          <div class="info-card-value">${locationText}</div>
          ${mapLink ? `<div class="info-card-sub"><a href="${mapLink}" target="_blank" style="color:#0f766e;text-decoration:none;">View on Google Maps ↗</a></div>` : ''}
        </div>
      </div>

      <!-- Issue Description -->
      <div class="section-block">
        <div class="section-title">Citizen Issue Statement</div>
        <div class="desc-box">
          ${description}
        </div>
        
        ${photoUrl ? `
          <div class="photo-box">
            <img src="${photoUrl}" alt="${category} photo" onerror="this.parentElement.style.display='none';" />
            <div class="photo-caption">Attached Photographic Evidence</div>
          </div>
        ` : ''}
      </div>

      <!-- How to Track Progress -->
      <div class="guidance-box">
        <div class="guidance-title">
          <span>ℹ️</span> How to Track Your Report
        </div>
        <div class="guidance-text">
          Keep your Unique Tracking ID <strong>${uniqueTrackingNumber}</strong> handy. You can check the live status of this repair, view crew dispatch updates, and monitor neighborhood feedback anytime in the <strong>Community Feed</strong> or under <strong>My Reports</strong>.
        </div>
      </div>

      <!-- Official Footer -->
      <div class="doc-footer">
        <div>
          Official Document ID: <span class="digital-seal">${verificationCode}</span>
        </div>
        <div>
          Authenticated &amp; Logged in Municipal Civic Database
        </div>
      </div>
    </div>
  </div>

  <script>
    // Automatically trigger print dialog when window opens
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.print();
      }, 500);
    });
  </script>
</body>
</html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};
