let profileRefreshTimer;

document.addEventListener("DOMContentLoaded", () => {
    loadProfileData();
    loadProfileExtras();
    wireProfileActions();
    document.addEventListener("visibilitychange", scheduleProfileRefresh);
});

function scheduleProfileRefresh() {
    window.clearTimeout(profileRefreshTimer);
    if (!document.hidden) profileRefreshTimer = window.setTimeout(async () => {
        await loadProfileData();
        scheduleProfileRefresh();
    }, 30000);
}

function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
}

function renderRecentActivity(reviews) {
    const activity = document.querySelector(".activity-list");
    if (!activity) return;
    activity.replaceChildren();
    if (!reviews.length) {
        const message = document.createElement("p");
        message.className = "empty-state";
        message.textContent = "No code reviews yet. Submit a review to see activity here.";
        activity.append(message);
        return;
    }
    reviews.slice(0, 3).forEach((review) => {
        const item = document.createElement("div");
        item.className = "activity-item";
        item.innerHTML = '<div class="activity-icon"><i class="fa-solid fa-code"></i></div><div class="activity-content"><h4></h4><p></p></div>';
        item.querySelector("h4").textContent = review.title;
        item.querySelector("p").textContent = `Score: ${review.overall_score ?? 0}% • ${new Date(review.created_at).toLocaleString()}`;
        activity.append(item);
    });
}

async function loadProfileData() {
    try {
        const [{ user }, { stats }, { reviews }] = await Promise.all([apiRequest("/auth/me"), apiRequest("/dashboard/stats"), apiRequest("/reviews")]);
        setText("#profile-name", user.fullName);
        setText("#profile-username", `@${user.username}`);
        setText("#profile-email", user.email);
        setText("#profile-created-at", user.createdAt ? `Joined ${new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(user.createdAt))}` : "Join date unavailable");
        setText("#profile-workspace", `@${user.username}`);
        setText("#profile-reviews-count", `${stats.total_reviews || 0} reviews`);
        setText("#profile-last-review", reviews[0] ? new Date(reviews[0].created_at).toLocaleDateString() : "No reviews yet");
        const values = document.querySelectorAll(".profile-stats .stat-content h3");
        [stats.total_reviews || 0, `${stats.average_score || 0}%`, stats.total_reviews || 0, `${stats.security_score || 0}%`].forEach((value, index) => { if (values[index]) values[index].textContent = value; });
        renderRecentActivity(reviews);
    } catch (error) { console.error("Unable to load profile data:", error.message); }
}

function loadProfileExtras() {
    const savedAbout = localStorage.getItem("profile:about");
    const about = document.querySelector(".about-card .card-body > p");
    if (savedAbout && about) about.textContent = savedAbout;

    const savedAvatar = localStorage.getItem("profile:avatar");
    if (savedAvatar) document.querySelectorAll(".profile-avatar img, .profile-box img").forEach((image) => { image.src = savedAvatar; });
}

function wireProfileActions() {
    const avatarInput = document.createElement("input");
    avatarInput.type = "file";
    avatarInput.accept = "image/*";
    avatarInput.hidden = true;
    document.body.append(avatarInput);

    document.addEventListener("click", async (event) => {
        if (event.target.closest(".edit-avatar-btn")) {
            avatarInput.click();
            return;
        }

        if (event.target.closest(".primary-btn")) {
            const currentName = document.querySelector("#profile-name")?.textContent || "";
            const fullName = window.prompt("Update your display name:", currentName);
            if (!fullName?.trim()) return;
            try {
                const { user } = await apiRequest("/auth/me", {
                    method: "PATCH",
                    body: JSON.stringify({ fullName: fullName.trim() })
                });
                localStorage.setItem("loggedInUser", JSON.stringify(user));
                setText("#profile-name", user.fullName);
                document.querySelectorAll(".profile-box h4").forEach((node) => { node.textContent = user.fullName; });
            } catch (error) {
                window.alert(error.message);
            }
            return;
        }

        if (event.target.closest(".secondary-btn")) {
            const text = `${document.querySelector("#profile-name")?.textContent || "Developer"} | ${document.querySelector("#profile-username")?.textContent || ""}`;
            try {
                if (navigator.share) await navigator.share({ title: "Developer profile", text, url: window.location.href });
                else if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
                    window.alert("Profile link copied to clipboard.");
                } else window.prompt("Copy your profile link:", window.location.href);
            } catch (error) {
                if (error.name !== "AbortError") window.alert(error.message || "Unable to share profile.");
            }
            return;
        }

        const editButton = event.target.closest(".about-card .edit-btn");
        if (editButton) {
            const biography = document.querySelector(".about-card .card-body > p");
            const value = window.prompt("About Me:", biography.textContent);
            if (value === null) return;
            biography.textContent = value.trim() || "No additional biography details have been saved for this account.";
            localStorage.setItem("profile:about", biography.textContent);
            return;
        }

        const skillsButton = event.target.closest(".skills-card .edit-btn");
        if (skillsButton) {
            const skills = [...document.querySelectorAll(".skills-card .skill-name")].map((node) => node.textContent).join(", ");
            const value = window.prompt("Edit skills (comma-separated):", skills);
            if (value === null) return;
            const list = document.querySelector(".skills-card .skills-list");
            list.replaceChildren(...value.split(",").map((name) => name.trim()).filter(Boolean).map((name) => {
                const item = document.createElement("div");
                item.className = "skill-item";
                item.innerHTML = '<div class="skill-info"><span class="skill-name"></span><span class="skill-percentage">Added</span></div>';
                item.querySelector(".skill-name").textContent = name;
                return item;
            }));
            localStorage.setItem("profile:skills", value);
        }
    });

    avatarInput.addEventListener("change", () => {
        const file = avatarInput.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
            window.alert("Choose an image smaller than 2 MB.");
            avatarInput.value = "";
            return;
        }
        const reader = new FileReader();
        reader.addEventListener("load", () => {
            const imageData = String(reader.result);
            localStorage.setItem("profile:avatar", imageData);
            document.querySelectorAll(".profile-avatar img, .profile-box img").forEach((image) => { image.src = imageData; });
        });
        reader.readAsDataURL(file);
    });

    const savedSkills = localStorage.getItem("profile:skills");
    if (savedSkills) {
        const list = document.querySelector(".skills-card .skills-list");
        if (list) list.replaceChildren(...savedSkills.split(",").map((name) => name.trim()).filter(Boolean).map((name) => {
            const item = document.createElement("div");
            item.className = "skill-item";
            item.innerHTML = '<div class="skill-info"><span class="skill-name"></span><span class="skill-percentage">Added</span></div>';
            item.querySelector(".skill-name").textContent = name;
            return item;
        }));
    }
}
