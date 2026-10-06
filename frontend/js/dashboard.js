let dashboardReviews = [];

document.addEventListener("DOMContentLoaded", () => {
    resetDashboardData();
    loadDashboard();
    document.querySelector(".search-bar input")?.addEventListener("input", renderDashboardSearch);
    window.setInterval(loadDashboard, 30000);
});

function resetDashboardData() {
    dashboardReviews = [];
    const statValues = document.querySelectorAll(".stats .stat-info h3");
    ["0", "0", "0%", "0%"].forEach((value, index) => {
        if (statValues[index]) statValues[index].textContent = value;
    });
    renderDashboardSearch();
    renderScoreCard({});
    renderLanguages([]);
    renderPerformance({});
}

async function loadDashboard() {
    try {
        const [{ stats }, { reviews }] = await Promise.all([apiRequest("/dashboard/stats"), apiRequest("/reviews")]);
        dashboardReviews = reviews;
        const statValues = document.querySelectorAll(".stats .stat-info h3");
        [stats.total_reviews, stats.bugs_detected, `${stats.security_score}%`, `${stats.ai_accuracy}%`].forEach((value, index) => { if (statValues[index]) statValues[index].textContent = value; });
        renderDashboardSearch();
        renderScoreCard(stats); renderLanguages(reviews); renderPerformance(stats);
    } catch (error) { console.error("Unable to load dashboard data:", error.message); }
}

function renderDashboardSearch() {
    const query = document.querySelector(".search-bar input")?.value.trim().toLowerCase() || "";
    const matchingReviews = dashboardReviews.filter((review) => `${review.title} ${review.language}`.toLowerCase().includes(query));
    const visibleReviews = query ? matchingReviews : matchingReviews.slice(0, 5);
    const table = document.querySelector(".review-table tbody");
    if (table) {
        table.replaceChildren(...visibleReviews.map(reviewRow));
        if (!visibleReviews.length) {
            const row = document.createElement("tr");
            const message = document.createElement("td");
            message.colSpan = 4;
            message.className = "empty-state";
            message.textContent = query ? "No reviews match your search." : "No reviews yet.";
            row.append(message);
            table.append(row);
        }
    }
    renderActivity(query ? matchingReviews.slice(0, 3) : dashboardReviews.slice(0, 3));
}
function reviewRow(review) {
    const row = document.createElement("tr"), score = review.overall_score ?? 0;
    const label = score >= 90 ? "Excellent" : score >= 80 ? "Good" : score >= 70 ? "Needs Improvement" : "Poor";
    row.innerHTML = `<td></td><td></td><td>${score}%</td><td><span class="badge ${score >= 80 ? "success" : score >= 70 ? "warning" : "danger"}">${label}</span></td>`;
    row.children[0].textContent = review.title; row.children[1].textContent = review.language; return row;
}
function renderScoreCard(stats) {
    const card = document.querySelector(".score-card"); if (!card) return;
    card.querySelector(".score-circle span").textContent = `${stats.average_score || 0}%`;
    card.querySelector("p").textContent = stats.total_reviews ? "Scores are calculated from your completed reviews." : "Submit a review to see your real code-quality results.";
    [stats.ai_accuracy, stats.security_score, stats.performance_score, stats.best_score].forEach((value, i) => { const node = card.querySelectorAll(".analytics-item span")[i]; if (node) node.textContent = `${value || 0}%`; });
}
function renderActivity(reviews) {
    const list = document.querySelector(".activity-list"); if (!list) return;
    list.replaceChildren(...reviews.map((review) => { const item = document.createElement("div"); item.className = "activity-item"; item.innerHTML = `<div class="activity-icon success"><i class="fa-solid fa-check"></i></div><div class="activity-content"><h4></h4><p></p><span></span></div>`; item.querySelector("h4").textContent = `${review.title} reviewed`; item.querySelector("p").textContent = `${review.bugs_found || 0} issues found by the AI analysis.`; item.querySelector("span").textContent = new Date(review.created_at).toLocaleString(); return item; }));
    if (!reviews.length) {
        const message = document.createElement("p");
        message.className = "empty-state";
        message.textContent = "No matching review activity.";
        list.append(message);
    }
}
function renderLanguages(reviews) {
    const list = document.querySelector(".language-list"); if (!list) return;
    const grouped = reviews.reduce((items, review) => { const entry = items[review.language] ||= { total: 0, count: 0 }; entry.total += Number(review.overall_score) || 0; entry.count++; return items; }, {});
    list.replaceChildren(...Object.entries(grouped).map(([language, value]) => { const item = document.createElement("li"), score = Math.round(value.total / value.count); item.innerHTML = `<div class="language-name"><i class="fa-solid fa-code"></i><span></span></div><span class="language-score">${score}%</span>`; item.querySelector(".language-name span").textContent = language; return item; }));
}
function renderPerformance(stats) {
    const values = [stats.ai_accuracy, stats.security_score, stats.performance_score, stats.best_score];
    document.querySelectorAll(".performance-card .progress-group").forEach((group, index) => {
        const value = values[index] || 0;
        const label = group.querySelector(".progress-header span");
        const fill = group.querySelector(".progress-fill");
        if (label) label.textContent = `${value}%`;
        if (fill) fill.style.width = `${value}%`;
    });
}
