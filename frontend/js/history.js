let historyReviews = [];
let activeHistoryFilter = "all";
let visibleHistoryCount = 6;

document.addEventListener("DOMContentLoaded", () => {
    const exportButton = document.querySelector(".export-history-btn");
    if (exportButton) {
        exportButton.addEventListener("click", async () => {
            try {
                exportButton.disabled = true;
                exportButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Exporting...';
                const { href } = await createHistoryExport();
                const link = document.createElement("a");
                link.href = href;
                link.download = "review-history-report.xlsx";
                document.body.append(link);
                link.click();
                link.remove();
                window.setTimeout(() => {
                    exportButton.disabled = false;
                    exportButton.innerHTML = '<i class="fa-solid fa-file-export"></i> Export History';
                }, 1500);
            } catch (error) {
                window.alert(error.message || "Unable to export your review history.");
                exportButton.disabled = false;
                exportButton.innerHTML = '<i class="fa-solid fa-file-export"></i> Export History';
            }
        });
    }
    loadHistory();
    window.setInterval(loadHistory, 30000);
});

async function createHistoryExport() {
    const response = await fetch(`${window.location.origin}/api/reviews/export`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`
        }
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Unable to export review history");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    return { href: url };
}

async function loadHistory() {
    const timeline = document.querySelector(".timeline-list");
    const statValues = document.querySelectorAll(".history-stats .stat-info h2");

    if (!timeline) {
        return;
    }

    try {
        const [{ reviews }, { stats }] = await Promise.all([
            fetchPastReports(),
            apiRequest("/dashboard/stats")
        ]);

        historyReviews = reviews;
        statValues[0].textContent = stats.total_reviews;
        statValues[1].textContent = stats.this_week;
        statValues[2].textContent = stats.this_month;
        statValues[3].textContent = `${stats.best_score}%`;
        renderHistory();
    } catch (error) {
        timeline.innerHTML = `<p class="empty-state"></p>`;
        timeline.querySelector(".empty-state").textContent = error.message;
    }
}

function renderHistory() {
    const timeline = document.querySelector(".timeline-list");
    if (!timeline) return;
    const query = document.querySelector(".search-box input")?.value.trim().toLowerCase() || "";
    const filteredReviews = historyReviews.filter((review) => {
        const score = Number(review.overall_score) || 0;
        const securityScore = Number(review.security_score) || 0;
        const matchesFilter = activeHistoryFilter === "all"
            || (activeHistoryFilter === "high" && score >= 90)
            || (activeHistoryFilter === "improvement" && score < 80)
            || (activeHistoryFilter === "security" && review.security_score != null && securityScore < 80);
        return matchesFilter && `${review.title} ${review.language}`.toLowerCase().includes(query);
    });
    const visibleReviews = filteredReviews.slice(0, visibleHistoryCount);
    timeline.replaceChildren(...visibleReviews.map(createTimelineItem));
    if (!visibleReviews.length) {
        const message = document.createElement("p");
        message.className = "empty-state";
        message.textContent = "No reviews match your search or filter.";
        timeline.append(message);
    }
    const loadMore = document.querySelector(".load-more");
    if (loadMore) loadMore.hidden = visibleReviews.length >= filteredReviews.length;
}

function createTimelineItem(review) {
    const item = document.createElement("div");
    const scoreClass = review.overall_score >= 90 ? "excellent" : review.overall_score >= 80 ? "good" : "warning";
    item.className = "timeline-item";
    item.dataset.reviewId = review.id;
    item.innerHTML = `
            <div class="timeline-marker"><div class="marker-dot ${scoreClass === "warning" ? "warning" : ""}"></div></div>
            <div class="timeline-content"><div class="timeline-card">
                <div class="timeline-header-info">
                    <div class="timeline-icon ${scoreClass === "warning" ? "warning" : ""}"><i class="fa-solid fa-file-code"></i></div>
                    <div class="timeline-details"><h4></h4><p></p></div>
                    <div class="timeline-score"><span class="score-badge ${scoreClass}">${review.overall_score ?? "-"}%</span></div>
                </div>
                <div class="timeline-meta">
                    <span class="meta-item"><i class="fa-solid fa-clock"></i> ${new Date(review.created_at).toLocaleString()}</span>
                    <span class="meta-item"><i class="fa-solid fa-shield-halved"></i> Security: ${review.security_score ?? "-"}%</span>
                    <span class="meta-item"><i class="fa-solid fa-circle-info"></i> ${review.status}</span>
                </div>
                <div class="timeline-actions">
                    <button type="button" class="timeline-btn view-btn" title="View Details"><i class="fa-solid fa-eye"></i> View</button>
                    <button type="button" class="timeline-btn download-btn" title="Download Report"><i class="fa-solid fa-download"></i> Download</button>
                </div>
            </div></div>`;
    item.querySelector("h4").textContent = review.title;
    item.querySelector(".timeline-details p").textContent = review.language;
    return item;
}

document.addEventListener("input", (event) => {
    if (event.target.matches(".search-box input")) renderHistory();
});

document.addEventListener("click", async (event) => {
    const filterChip = event.target.closest(".filter-chip");
    if (filterChip) {
        const chips = [...document.querySelectorAll(".filter-chip")];
        activeHistoryFilter = ["all", "high", "improvement", "security"][chips.indexOf(filterChip)] || "all";
        chips.forEach((chip) => chip.classList.toggle("active", chip === filterChip));
        renderHistory();
        return;
    }

    const viewButton = event.target.closest(".view-toggle .view-btn");
    if (viewButton) {
        document.querySelectorAll(".view-toggle .view-btn").forEach((button) => {
            button.classList.toggle("active", button === viewButton);
            button.setAttribute("aria-pressed", String(button === viewButton));
        });
        document.querySelector(".timeline-list")?.classList.toggle("compact-list", viewButton.title === "List View");
        return;
    }

    if (event.target.closest(".load-more-btn")) {
        visibleHistoryCount += 6;
        renderHistory();
        return;
    }

    const action = event.target.closest(".timeline-actions button");
    if (!action) return;
    const review = historyReviews.find((entry) => String(entry.id) === action.closest(".timeline-item")?.dataset.reviewId);
    if (!review) return;
    if (action.classList.contains("view-btn")) {
        showReviewDetails(review);
        return;
    }
    if (action.classList.contains("download-btn")) {
        try {
            await downloadReviewPdf(review);
        } catch (error) {
            window.alert(error.message || "Unable to download this review report.");
        }
    }
});
