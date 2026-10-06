let reportsRefreshTimer;
let reportReviews = [];
let activeReportFilter = "all";

document.addEventListener("DOMContentLoaded", () => {
    loadReports();
    document.addEventListener("visibilitychange", scheduleReportsRefresh);
});

function scheduleReportsRefresh() {
    window.clearTimeout(reportsRefreshTimer);
    if (!document.hidden) reportsRefreshTimer = window.setTimeout(async () => {
        await loadReports();
        scheduleReportsRefresh();
    }, 30000);
}

async function loadReports() {
    try {
        const [{ reviews }, { stats }] = await Promise.all([fetchPastReports(), apiRequest("/dashboard/stats")]);
        reportReviews = reviews;
        const values = [stats.total_reviews || 0, stats.this_month || 0, `${stats.average_score || 0}%`, localStorage.getItem("reportDownloads") || 0];
        document.querySelectorAll(".overview-info h2").forEach((node, index) => { node.textContent = values[index]; });

        const list = document.querySelector(".reports-list");
        if (!list) return;
        list.classList.remove("is-loading");
        list.replaceChildren();
        if (!reviews.length) {
            const message = document.createElement("p");
            message.className = "empty-state";
            message.textContent = "No reports are available yet. Complete a code review to create your first report.";
            list.append(message);
            return;
        }
        renderReports();
    } catch (error) {
        console.error("Unable to load reports:", error.message);
    }
}

function renderReports() {
    const list = document.querySelector(".reports-list");
    if (!list) return;
    const query = document.querySelector(".search-box input")?.value.trim().toLowerCase() || "";
    const filtered = reportReviews.filter((review) => {
        const score = Number(review.overall_score) || 0;
        const matchesFilter = activeReportFilter === "all"
            || (activeReportFilter === "high" && score >= 90)
            || (activeReportFilter === "improvement" && score < 80);
        return matchesFilter && `${review.title} ${review.language}`.toLowerCase().includes(query);
    });
    list.replaceChildren();
    if (!filtered.length) {
        const message = document.createElement("p");
        message.className = "empty-state";
        message.textContent = "No reports match your search or filter.";
        list.append(message);
        return;
    }
    filtered.forEach((review) => list.append(reportItem(review)));
}

function reportItem(review) {
    const item = document.createElement("div");
    const score = review.overall_score ?? 0;
    item.className = "report-item";
    item.dataset.reviewId = review.id;
    item.innerHTML = `<div class="report-icon"><i class="fa-solid fa-file-code"></i></div><div class="report-details"><h4></h4><p></p><span class="report-date"><i class="fa-solid fa-clock"></i></span></div><div class="report-score"><span class="score-badge ${score >= 90 ? "excellent" : score >= 80 ? "good" : "warning"}"></span></div><div class="report-actions"><button type="button" class="action-btn view-btn" title="View Report" aria-label="View report"><i class="fa-solid fa-eye"></i></button><button type="button" class="action-btn download-btn" title="Download PDF" aria-label="Download PDF"><i class="fa-solid fa-download"></i></button><button type="button" class="action-btn share-btn" title="Share" aria-label="Share report"><i class="fa-solid fa-share-nodes"></i></button></div>`;
    item.querySelector("h4").textContent = review.title;
    item.querySelector("p").textContent = review.language;
    item.querySelector(".report-date").append(` ${new Date(review.created_at).toLocaleString()}`);
    item.querySelector(".score-badge").textContent = `${score}%`;
    return item;
}

document.addEventListener("input", (event) => {
    if (event.target.matches(".search-box input")) renderReports();
});

document.addEventListener("report-downloads-updated", (event) => {
    const downloadsValue = document.querySelectorAll(".overview-info h2")[3];
    if (downloadsValue) downloadsValue.textContent = event.detail.count;
});

document.addEventListener("click", async (event) => {
    const filterButton = event.target.closest(".filter-btn");
    if (filterButton) {
        const filters = ["all", "high", "improvement"];
        activeReportFilter = filters[(filters.indexOf(activeReportFilter) + 1) % filters.length];
        filterButton.innerHTML = `<i class="fa-solid fa-filter"></i> ${({ all: "Filter: All", high: "Filter: High Scores", improvement: "Filter: Needs Improvement" })[activeReportFilter]}`;
        renderReports();
        return;
    }

    const action = event.target.closest(".report-actions button");
    if (!action) return;
    const item = action.closest(".report-item");
    const review = reportReviews.find((entry) => String(entry.id) === item?.dataset.reviewId);
    if (!review) return;
    try {
        if (action.classList.contains("view-btn")) showReviewDetails(review);
        else if (action.classList.contains("download-btn")) await downloadReviewPdf(review);
        else if (action.classList.contains("share-btn")) await shareReview(review);
    } catch (error) {
        if (error.name !== "AbortError") window.alert(error.message || "Unable to share this report.");
    }
});
