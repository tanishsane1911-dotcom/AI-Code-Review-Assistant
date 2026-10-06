/* Shared authenticated app-shell actions and account identity. */

const brandLogoPath = "assets/brand-logo.svg";
const appNotificationsStorageKey = "appNotifications";
const appNotificationsStoragePrefix = "appNotifications:";

function getCurrentUserNotificationKey() {
    try {
        const savedUser = JSON.parse(localStorage.getItem("loggedInUser") || "null");
        const userId = savedUser?.id || savedUser?.username || "guest";
        return `${appNotificationsStoragePrefix}${userId}`;
    } catch {
        return `${appNotificationsStoragePrefix}guest`;
    }
}

function readAppNotifications() {
    try {
        const key = getCurrentUserNotificationKey();
        const notifications = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(notifications) ? notifications : [];
    } catch {
        return [];
    }
}

function updateNotificationBadges() {
    const unreadCount = readAppNotifications().filter((notification) => !notification.read).length;
    document.querySelectorAll(".notification").forEach((button) => {
        let badge = button.querySelector(".notification-count") || button.querySelector("span");
        if (unreadCount && !badge) {
            badge = document.createElement("span");
            button.append(badge);
        }
        if (badge) {
            badge.className = "notification-count";
            if (unreadCount) {
                badge.hidden = false;
                badge.style.removeProperty("display");
                badge.textContent = String(unreadCount);
            } else {
                badge.remove();
            }
        }
        button.setAttribute("aria-label", unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications");
    });
}

function renderNotificationPanel(container) {
    const panel = container.querySelector(".notification-panel");
    if (!panel) return;
    const notifications = readAppNotifications();
    const unreadCount = notifications.filter((notification) => !notification.read).length;
    panel.replaceChildren();
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-label", "Notifications");

    const heading = document.createElement("strong");
    heading.textContent = "Notifications";
    panel.append(heading);

    if (!notifications.length) {
        const message = document.createElement("p");
        message.textContent = "No new notifications.";
        panel.append(message);
        return;
    }

    const list = document.createElement("ul");
    notifications.forEach((notification) => {
        const item = document.createElement("li");
        const message = document.createElement("span");
        message.textContent = notification.message;
        item.append(message);
        list.append(item);
    });
    panel.append(list);

    if (unreadCount) {
        const markReadButton = document.createElement("button");
        markReadButton.type = "button";
        markReadButton.className = "mark-notifications-read";
        markReadButton.textContent = "Mark as read";
        panel.append(markReadButton);
    }
}

function addAppNotification(message) {
    const notifications = readAppNotifications();
    notifications.unshift({ id: crypto.randomUUID(), message, createdAt: new Date().toISOString(), read: false });
    localStorage.setItem(getCurrentUserNotificationKey(), JSON.stringify(notifications.slice(0, 20)));
    updateNotificationBadges();
}

function showAppToast(message) {
    const toast = document.createElement("div");
    const icon = document.createElement("i");
    const text = document.createElement("span");
    toast.className = "app-toast";
    toast.setAttribute("role", "status");
    icon.className = "fa-solid fa-circle-check";
    icon.setAttribute("aria-hidden", "true");
    text.textContent = message;
    toast.append(icon, text);
    document.body.append(toast);
    window.setTimeout(() => toast.remove(), 5000);
}

function normalizeBrandLogos() {
    document.querySelectorAll(".sidebar .logo, aside .logo").forEach((logo) => {
        if (logo.querySelector(".brand-logo-img")) {
            return;
        }

        const existingIcon = logo.querySelector(":scope > i");
        if (existingIcon) {
            existingIcon.remove();
        }

        const image = document.createElement("img");
        image.className = "brand-logo-img";
        image.src = brandLogoPath;
        image.alt = "AI Code Review Assistant";
        image.width = 44;
        image.height = 44;

        logo.prepend(image);
    });
}

function redirectToLogin() {
    window.location.replace("login.html");
}

function renderAccountIdentity(user) {
    const shortName = (user.fullName || user.username || "Account").trim();
    document.querySelectorAll(".profile-box h4").forEach((node) => { node.textContent = shortName; });
    document.querySelectorAll(".profile-box p, .profile-box span").forEach((node) => { node.textContent = user.email || `@${user.username}`; });
}

function hasCleanReviewOutcome(review) {
    if (!review) return false;

    const findings = Array.isArray(review.analysis?.findings) ? review.analysis.findings : [];
    const optionalSuggestions = Array.isArray(review.analysis?.optionalSuggestions) ? review.analysis.optionalSuggestions : [];
    if (findings.length || optionalSuggestions.length) {
        return false;
    }

    const score = Number(review.overall_score ?? review.score ?? 0);
    if (Number.isFinite(score) && score > 0) {
        return score >= 80;
    }

    return true;
}

function getReviewOutcomeMessage(review) {
    const score = Number(review?.overall_score ?? review?.score ?? 0);
    if (score >= 90) return "Great job — this code is strong and ready to ship.";
    if (score >= 80) return "This review is mostly solid, with minor improvements recommended.";
    if (review?.analysis && (Array.isArray(review.analysis.findings) || Array.isArray(review.analysis.optionalSuggestions))) {
        return "This code needs more attention before it is production-ready.";
    }
    return "The submitted code looks healthy and does not show any significant issues.";
}

function formatReviewFinding(finding) {
    const entry = finding && typeof finding === "object" ? finding : {};
    return {
        title: entry.title || entry.issue || entry.summary || "Review finding",
        severity: entry.severity || entry.level || "Info",
        category: entry.category || entry.type || "General",
        description: entry.description || entry.explanation || entry.message || "",
        whyItMatters: entry.whyItMatters || entry.why_it_matters || entry.impact || "",
        recommendedFix: entry.recommendedFix || entry.fix || entry.recommendation || "",
        codeSnippet: entry.codeSnippet || entry.code || entry.snippet || "",
        line: entry.line || entry.lineNumber || entry.line_number || ""
    };
}

function formatReviewValue(value) {
    if (value == null) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) return value.map((item) => formatReviewValue(item)).filter(Boolean).join(", ");
    if (typeof value === "object") {
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }
    return String(value);
}

function showReviewDetails(review) {
    if (!review) return;

    document.querySelector(".review-details-overlay")?.remove();

    const analysis = review.analysis && typeof review.analysis === "object" ? review.analysis : {};
    const findings = Array.isArray(analysis.findings) ? analysis.findings : [];
    const suggestions = Array.isArray(analysis.optionalSuggestions) ? analysis.optionalSuggestions : [];
    const createdAt = review.created_at ? new Date(review.created_at) : null;
    const formattedDate = createdAt && !Number.isNaN(createdAt.getTime())
        ? createdAt.toLocaleString()
        : "Not available";
    const correctedCode = typeof analysis.correctedCode === "string"
        ? analysis.correctedCode
        : typeof analysis.corrected_code === "string" ? analysis.corrected_code : "";
    const overlay = document.createElement("div");
    const modal = document.createElement("section");
    const header = document.createElement("header");
    const headingGroup = document.createElement("div");
    const eyebrow = document.createElement("p");
    const title = document.createElement("h2");
    const headerActions = document.createElement("div");
    const downloadButton = document.createElement("button");
    const closeButton = document.createElement("button");
    const body = document.createElement("div");

    overlay.className = "review-details-overlay";
    modal.className = "review-details-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "review-details-title");
    header.className = "review-details-header";
    headingGroup.className = "review-details-heading";
    eyebrow.className = "review-details-eyebrow";
    eyebrow.textContent = "CODE REVIEW REPORT";
    title.id = "review-details-title";
    title.textContent = review.title || "Review details";
    headerActions.className = "review-details-actions";
    downloadButton.type = "button";
    downloadButton.className = "review-details-download";
    downloadButton.innerHTML = '<i class="fa-solid fa-file-pdf" aria-hidden="true"></i><span>Download PDF</span>';
    closeButton.type = "button";
    closeButton.className = "review-details-close";
    closeButton.setAttribute("aria-label", "Close review details");
    closeButton.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
    body.className = "review-details-body";

    const closeModal = () => {
        overlay.remove();
        document.removeEventListener("keydown", onKeyDown);
    };
    const onKeyDown = (event) => {
        if (event.key === "Escape") closeModal();
    };

    headingGroup.append(eyebrow, title);
    headerActions.append(downloadButton, closeButton);
    header.append(headingGroup, headerActions);
    modal.append(header, body);
    overlay.append(modal);

    const metadata = document.createElement("section");
    metadata.className = "review-details-summary";
    [
        ["Language", review.language || "Not available"],
        ["Status", review.status || "Not available"],
        ["Reviewed", formattedDate],
        ["Quality score", review.overall_score == null ? "Not assessed" : `${review.overall_score}%`],
        ["Issues found", review.bugs_found == null ? "Not available" : String(review.bugs_found)],
        ["Security score", review.security_score == null ? "Not assessed" : `${review.security_score}%`],
        ["Performance score", review.performance_score == null ? "Not assessed" : `${review.performance_score}%`]
    ].forEach(([label, value]) => {
        const item = document.createElement("div");
        const itemLabel = document.createElement("span");
        const itemValue = document.createElement("strong");
        item.className = "review-details-stat";
        itemLabel.textContent = label;
        itemValue.textContent = value;
        item.append(itemLabel, itemValue);
        metadata.append(item);
    });
    body.append(metadata);

    if (analysis.summary) {
        const summary = document.createElement("p");
        summary.className = "review-details-summary-text";
        summary.textContent = formatReviewValue(analysis.summary);
        body.append(summary);
    }

    const addFindingSection = (label, entries, optional) => {
        const section = document.createElement("section");
        const sectionHeading = document.createElement("h3");
        section.className = "review-details-section";
        sectionHeading.textContent = `${label} (${entries.length})`;
        section.append(sectionHeading);

        if (!entries.length) {
            const empty = document.createElement("p");
            empty.className = "review-details-empty";
            empty.textContent = optional ? "No additional suggestions were provided." : "No issues were found.";
            section.append(empty);
        } else {
            const list = document.createElement("div");
            list.className = "review-details-findings";
            entries.forEach((entry) => {
                const finding = formatReviewFinding(entry);
                const card = document.createElement("article");
                const cardHeading = document.createElement("div");
                const cardTitle = document.createElement("h4");
                card.className = "review-details-finding";
                cardHeading.className = "review-details-finding-heading";
                cardTitle.textContent = finding.title;
                cardHeading.append(cardTitle);
                if (!optional) {
                    const severity = document.createElement("span");
                    severity.className = `review-details-severity severity-${String(finding.severity).toLowerCase()}`;
                    severity.textContent = finding.severity;
                    cardHeading.append(severity);
                }
                card.append(cardHeading);

                const details = optional
                    ? [["Suggestion", finding.description || finding.recommendedFix || finding.title]]
                    : [
                        ["Category", finding.category],
                        ["Line", finding.line || "Not specified"],
                        ["Description", finding.description],
                        ["Suggested fix", finding.recommendedFix]
                    ];
                details.forEach(([detailLabel, detailValue]) => {
                    if (!detailValue) return;
                    const paragraph = document.createElement("p");
                    const strong = document.createElement("strong");
                    strong.textContent = `${detailLabel}: `;
                    paragraph.append(strong, document.createTextNode(formatReviewValue(detailValue)));
                    card.append(paragraph);
                });
                list.append(card);
            });
            section.append(list);
        }
        body.append(section);
    };

    addFindingSection("Issues found", findings, false);
    addFindingSection("Suggestions", suggestions, true);

    const addCodeDisclosure = (label, code, fallback) => {
        const details = document.createElement("details");
        const summary = document.createElement("summary");
        const pre = document.createElement("pre");
        const codeElement = document.createElement("code");
        details.className = "review-details-code";
        summary.textContent = label;
        codeElement.textContent = code || fallback;
        pre.append(codeElement);
        details.append(summary, pre);
        body.append(details);
    };
    addCodeDisclosure("Submitted code", typeof review.source_code === "string" ? review.source_code : "", "Submitted code is not available.");
    addCodeDisclosure("Corrected code", correctedCode, "No corrected code was generated for this review.");

    closeButton.addEventListener("click", closeModal);
    downloadButton.addEventListener("click", async () => {
        try {
            downloadButton.disabled = true;
            downloadButton.querySelector("span").textContent = "Preparing PDF...";
            await downloadReviewPdf(review);
        } catch (error) {
            window.alert(error.message || "Unable to download this review report.");
        } finally {
            downloadButton.disabled = false;
            downloadButton.querySelector("span").textContent = "Download PDF";
        }
    });
    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) closeModal();
    });
    document.addEventListener("keydown", onKeyDown);
    document.body.append(overlay);
    closeButton.focus();
}

async function downloadReviewPdf(review) {
    if (!review) {
        throw new Error("No review data is available to download.");
    }

    if (!review.id) {
        throw new Error("This review does not have a saved report ID. Refresh the history and try again.");
    }

    let response;
    try {
        response = await fetch(`${window.location.origin}/api/reviews/${encodeURIComponent(review.id)}/report.pdf`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("authToken") || ""}` }
        });
    } catch {
        throw new Error("Unable to reach the server. Make sure the backend is running and try again.");
    }
    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Unable to generate this review report.");
    }

    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    const disposition = response.headers.get("Content-Disposition") || "";
    const fileName = disposition.match(/filename="([^"]+)"/i)?.[1];
    link.download = fileName || `${(review.title || "code-review").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-report.pdf`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);

    const downloadCount = Number(localStorage.getItem("reportDownloads") || 0) + 1;
    localStorage.setItem("reportDownloads", String(downloadCount));
    document.dispatchEvent(new CustomEvent("report-downloads-updated", { detail: { count: downloadCount } }));
    showAppToast("Report downloaded");
}

async function shareReview(review) {
    if (!review) {
        throw new Error("No review data is available to share.");
    }

    const shareText = `AI Code Review: ${review.title || "Review"}\nLanguage: ${review.language || "N/A"}\nOverall score: ${review.overall_score ?? "-"}%`;
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareText);
        showAppToast("Review summary copied to clipboard");
        return;
    }

    const tempArea = document.createElement("textarea");
    tempArea.value = shareText;
    document.body.append(tempArea);
    tempArea.select();
    document.execCommand("copy");
    tempArea.remove();
    showAppToast("Review summary copied to clipboard");
}

async function loadAccountIdentity() {
    const token = localStorage.getItem("authToken");
    if (!token) {
        redirectToLogin();
        return;
    }

    try {
        const request = typeof apiRequest === "function"
            ? apiRequest("/auth/me")
            : fetch(`${window.location.origin}/api/auth/me`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` }
            }).then(async (response) => {
                const payload = await response.json();
                if (!response.ok) throw new Error(payload.error || "Authentication failed");
                return payload;
            });
        const { user } = await request;
        localStorage.setItem("loggedInUser", JSON.stringify(user));
        renderAccountIdentity(user);
    } catch (error) {
        console.error("Unable to load the signed-in account:", error.message);
        if (/auth|token|expired|invalid/i.test(error.message)) {
            localStorage.removeItem("authToken");
            localStorage.removeItem("loggedInUser");
            redirectToLogin();
        }
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        normalizeBrandLogos();
        loadAccountIdentity();
    });
} else {
    normalizeBrandLogos();
    loadAccountIdentity();
}

document.addEventListener("click", (event) => {
    const notificationButton = event.target.closest(".notification");
    if (notificationButton) {
        const notificationContainer = notificationButton.closest(".top-right, .nav-right");
        let panel = notificationContainer?.querySelector(".notification-panel");
        if (!panel && notificationContainer) {
            panel = document.createElement("div");
            panel.className = "notification-panel";
            panel.hidden = true;
            notificationContainer.append(panel);
        }
        if (panel) {
            renderNotificationPanel(notificationContainer);
            panel.hidden = !panel.hidden;
            notificationButton.setAttribute("aria-expanded", String(!panel.hidden));
        }
        return;
    }

    const markReadButton = event.target.closest(".mark-notifications-read");
    if (markReadButton) {
        const panel = markReadButton.closest(".notification-panel");
        const notifications = readAppNotifications().map((notification) => ({ ...notification, read: true }));
        localStorage.setItem(getCurrentUserNotificationKey(), JSON.stringify(notifications));
        updateNotificationBadges();
        if (panel) renderNotificationPanel(panel.parentElement);
        return;
    }

    if (!event.target.closest(".notification-panel")) {
        document.querySelectorAll(".notification-panel:not([hidden])").forEach((panel) => { panel.hidden = true; });
        document.querySelectorAll(".notification[aria-expanded='true']").forEach((button) => button.setAttribute("aria-expanded", "false"));
    }
});
