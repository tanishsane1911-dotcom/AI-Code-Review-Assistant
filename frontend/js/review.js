document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector(".review-form");
    const languageField = form?.querySelector("select");
    const sourceField = form?.querySelector("textarea");
    const fileField = form?.querySelector("input[type='file']");
    const resultCards = document.querySelectorAll(".results-grid .result-card");
    const suggestions = document.querySelector(".suggestion-list");
    const correctedCodeSection = document.querySelector(".corrected-code-section");
    const correctedCodePanel = document.querySelector(".corrected-code-panel");
    const correctedCodeStatus = document.querySelector(".corrected-code-status");
    const correctedCodeElement = correctedCodePanel?.querySelector("code");
    const copyCorrectedCodeButton = document.querySelector(".copy-corrected-code-btn");
    let lastReview = null;
    let activeRequest = null;
    let submissionNumber = 0;

    if (!form || !languageField || !sourceField) {
        return;
    }

    copyCorrectedCodeButton?.addEventListener("click", async () => {
        const correctedCode = correctedCodeElement?.textContent || "";
        if (!correctedCode) return;
        try {
            await navigator.clipboard.writeText(correctedCode);
            copyCorrectedCodeButton.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> Copied';
            window.setTimeout(() => {
                copyCorrectedCodeButton.innerHTML = '<i class="fa-solid fa-copy" aria-hidden="true"></i> Copy Corrected Code';
            }, 1600);
        } catch {
            window.alert("Unable to copy the corrected code. Please copy it manually.");
        }
    });

    const defaultLanguage = localStorage.getItem("setting:language");
    if (defaultLanguage && defaultLanguage !== "Auto detect" && [...languageField.options].some((option) => option.value === defaultLanguage || option.textContent === defaultLanguage)) {
        languageField.value = defaultLanguage;
    }

    resultCards.forEach((card, index) => {
        const heading = card.querySelector("h1");
        if (heading) heading.textContent = "--";
        const status = card.querySelector("span");
        if (status) {
            status.textContent = "Waiting for review";
            status.classList.remove("excellent", "good", "warning", "safe");
        }
    });
    suggestions.replaceChildren();
    const emptySuggestion = document.createElement("p");
    emptySuggestion.textContent = "Submit code to receive an AI review.";
    suggestions.appendChild(emptySuggestion);

    fileField?.addEventListener("change", async () => {
        const file = fileField.files[0];
        if (file) {
            sourceField.value = await file.text();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const language = languageField.value;
        const sourceCode = sourceField.value.trim();
        const submitButton = form.querySelector("button[type='submit']");

        if (!language || language === "Select Language" || !sourceCode) {
            alert("Select a language and provide source code.");
            return;
        }

        // A new submission supersedes any response that is still in flight.
        activeRequest?.abort();
        const request = new AbortController();
        activeRequest = request;
        const currentSubmission = ++submissionNumber;
        lastReview = null;
        correctedCodeSection.hidden = true;
        correctedCodePanel.hidden = true;
        if (copyCorrectedCodeButton) copyCorrectedCodeButton.hidden = true;
        correctedCodeElement.textContent = "";
        correctedCodeStatus.textContent = "";
        suggestions.replaceChildren();
        const reviewingMessage = document.createElement("p");
        reviewingMessage.textContent = "Reviewing the current submission…";
        suggestions.append(reviewingMessage);
        resultCards.forEach((card) => {
            const heading = card.querySelector("h1");
            if (heading) heading.textContent = "--";
            const status = card.querySelector("span");
            if (status) status.textContent = "Reviewing current submission";
        });
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Reviewing...';

        try {
            const { review } = await apiRequest("/review", {
                method: "POST",
                signal: request.signal,
                body: JSON.stringify({
                    title: `${language} Code Review`,
                    language,
                    sourceCode,
                    preferences: {
                        securityChecks: localStorage.getItem("setting:security") !== "false",
                        performanceChecks: localStorage.getItem("setting:performance") !== "false"
                    }
                })
            });
            if (currentSubmission !== submissionNumber) return;
            lastReview = review;
            renderResults(review);
            const successMessage = "Code review successfully completed.";
            addAppNotification(successMessage);
            showAppToast(successMessage);
        } catch (error) {
            if (error.name !== "AbortError" && currentSubmission === submissionNumber) alert(error.message);
        } finally {
            if (currentSubmission === submissionNumber) {
                activeRequest = null;
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="fa-solid fa-robot"></i> Review Code';
            }
        }
    });

    form.addEventListener("reset", () => {
        activeRequest?.abort();
        activeRequest = null;
        submissionNumber += 1;
        window.setTimeout(() => {
            lastReview = null;
            correctedCodeSection.hidden = true;
            correctedCodePanel.hidden = true;
            if (copyCorrectedCodeButton) copyCorrectedCodeButton.hidden = true;
            correctedCodeElement.textContent = "";
            correctedCodeStatus.textContent = "";
            resultCards.forEach((card) => {
                const heading = card.querySelector("h1");
                if (heading) heading.textContent = "--";
                const status = card.querySelector("span");
                if (status) {
                    status.textContent = "Waiting for review";
                    status.classList.remove("excellent", "good", "warning", "safe");
                }
            });
            suggestions.replaceChildren();
            const message = document.createElement("p");
            message.textContent = "Submit code to receive an AI review.";
            suggestions.append(message);
        });
    });

    document.querySelector(".download-report .download-btn")?.addEventListener("click", async () => {
        if (!lastReview) {
            window.alert("Submit code for review before downloading a report.");
            return;
        }
        try {
            await downloadReviewPdf(lastReview);
        } catch (error) {
            window.alert(error.message || "Unable to download this review report.");
        }
    });

    function renderResults(review) {
        const confirmedFindings = Array.isArray(review.analysis?.findings) ? review.analysis.findings : [];
        const optionalSuggestions = Array.isArray(review.analysis?.optionalSuggestions) ? review.analysis.optionalSuggestions : [];
        const findings = [...confirmedFindings, ...optionalSuggestions];
        const cleanOutcome = hasCleanReviewOutcome(review);
        const correctedCode = typeof review.analysis?.correctedCode === "string"
            ? review.analysis.correctedCode
            : typeof review.analysis?.corrected_code === "string" ? review.analysis.corrected_code : "";
        const overallScore = review.overall_score == null ? null : Number(review.overall_score);
        const bugCount = Number(review.bugs_found) || 0;
        const securityScore = review.security_score == null ? null : Number(review.security_score);
        const performanceScore = review.performance_score == null ? null : Number(review.performance_score);
        const resultStatuses = [
            [overallScore == null ? "Not assessed" : overallScore >= 90 ? "Excellent code quality" : overallScore >= 80 ? "Good code quality" : "Code quality needs attention", overallScore == null ? "" : overallScore >= 90 ? "excellent" : overallScore >= 80 ? "good" : "warning"],
            [bugCount === 0 ? "No bugs detected" : `${bugCount} bug${bugCount === 1 ? "" : "s"} found`, bugCount === 0 ? "safe" : "warning"],
            [securityScore == null ? "Not assessed" : securityScore >= 90 ? "Strong security" : securityScore >= 80 ? "Good security" : "Security review needed", securityScore == null ? "" : securityScore >= 80 ? "safe" : "warning"],
            [performanceScore == null ? "Not assessed" : performanceScore >= 90 ? "Excellent performance" : performanceScore >= 80 ? "Good performance" : "Performance needs attention", performanceScore == null ? "" : performanceScore >= 80 ? "good" : "warning"]
        ];
        const values = [
            [review.overall_score, "Overall Score"],
            [review.bugs_found, "Bugs Found"],
            [review.security_score, "Security Score"],
            [review.performance_score, "Performance"]
        ];

        resultCards.forEach((card, index) => {
            const heading = card.querySelector("h1");
            const status = card.querySelector("span");
            if (heading) {
                const value = values[index][0];
                heading.textContent = value == null ? "--" : index === 1 ? value : `${value}%`;
            }
            if (status) {
                status.textContent = resultStatuses[index][0];
                status.classList.remove("excellent", "good", "warning", "safe");
                if (resultStatuses[index][1]) status.classList.add(resultStatuses[index][1]);
            }
        });

        suggestions.replaceChildren();
        correctedCodeSection.hidden = false;
        correctedCodePanel.hidden = !correctedCode.trim();
        if (copyCorrectedCodeButton) copyCorrectedCodeButton.hidden = !correctedCode.trim();
        correctedCodeElement.textContent = correctedCode;
        document.querySelector(".corrected-code-language").textContent = review.language || "Source code";
        correctedCodeStatus.textContent = correctedCode.trim()
            ? "Complete corrected version generated from the submitted code and findings."
            : confirmedFindings.length
                ? "Confirmed issues were reported, but no corrected version was returned. The submitted code has not been changed."
                : optionalSuggestions.length
                    ? "No significant issues found. Optional suggestions are listed below; no corrected version was needed."
                    : "No significant issues found. The submitted code is already suitable; no rewrite was needed.";

        if (!findings.length) {
            const status = document.createElement("div");
            const icon = document.createElement("i");
            const content = document.createElement("div");
            const heading = document.createElement("h3");
            const message = document.createElement("p");
            status.className = `review-empty-state${cleanOutcome ? " is-passed" : ""}`;
            icon.className = cleanOutcome ? "fa-solid fa-circle-check" : "fa-solid fa-circle-info";
            icon.setAttribute("aria-hidden", "true");
            heading.textContent = cleanOutcome ? "No changes needed" : "No detailed findings";
            message.textContent = `${getReviewOutcomeMessage(review)} No source code was changed by this review.`;
            content.append(heading, message);
            status.append(icon, content);
            suggestions.append(status);
            const suggestionDescription = document.querySelector(".suggestion-section .section-title p");
            if (suggestionDescription) suggestionDescription.textContent = getReviewOutcomeMessage(review);
            return;
        }

        findings.forEach((finding) => {
            const formattedFinding = formatReviewFinding(finding);
            const isOptionalSuggestion = finding.category === "optional-suggestion";
            const item = document.createElement("div");
            const content = document.createElement("div");
            const title = document.createElement("h4");
            item.className = "suggestion-item";
            item.innerHTML = `<i class="fa-solid ${isOptionalSuggestion ? "fa-lightbulb" : "fa-circle-exclamation"}" aria-hidden="true"></i>`;
            title.textContent = `${isOptionalSuggestion ? "Optional suggestion" : "Issue"}: ${formattedFinding.title}`;
            content.append(title);
            [
                ["Severity", formattedFinding.severity],
                ["Category", formattedFinding.category],
                ["Submitted code", formattedFinding.codeSnippet],
                ["Explanation", formattedFinding.description],
                ["Why it matters", formattedFinding.whyItMatters],
                ["Affected line", formattedFinding.line],
                ["Recommended fix", formattedFinding.recommendedFix]
            ].filter(([, value]) => value != null && String(value).trim()).forEach(([label, value]) => {
                const detail = document.createElement("p");
                const prefix = document.createElement("strong");
                prefix.textContent = `${label}: `;
                detail.append(prefix, document.createTextNode(formatReviewValue(value)));
                content.append(detail);
            });
            item.append(content);
            suggestions.appendChild(item);
        });
        const suggestionDescription = document.querySelector(".suggestion-section .section-title p");
        if (suggestionDescription) suggestionDescription.textContent = "Recommended improvements for your code.";
    }
});
