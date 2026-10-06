/*=========================================
        SIGNUP PAGE JAVASCRIPT
=========================================*/

document.addEventListener("DOMContentLoaded", () => {

    const clearRestoredFormValues = () => {
        document.querySelectorAll(".signup-form input:not([type='checkbox'])").forEach((input) => {
            if (input !== document.activeElement) input.value = "";
        });
    };

    clearRestoredFormValues();
    window.addEventListener("pageshow", () => window.setTimeout(clearRestoredFormValues, 0), { once: true });

    /*=====================================
            PASSWORD TOGGLE
    =====================================*/

    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");

    const togglePassword =
        document.querySelector(".toggle-password");

    const toggleConfirm =
        document.querySelector(".toggle-confirm-password");

    if (togglePassword && password) {

        togglePassword.addEventListener("click", () => {

            if (password.type === "password") {

                password.type = "text";

                togglePassword.classList.remove("fa-eye");
                togglePassword.classList.add("fa-eye-slash");

            }

            else {

                password.type = "password";

                togglePassword.classList.remove("fa-eye-slash");
                togglePassword.classList.add("fa-eye");

            }

        });

    }

    if (toggleConfirm && confirmPassword) {

        toggleConfirm.addEventListener("click", () => {

            if (confirmPassword.type === "password") {

                confirmPassword.type = "text";

                toggleConfirm.classList.remove("fa-eye");
                toggleConfirm.classList.add("fa-eye-slash");

            }

            else {

                confirmPassword.type = "password";

                toggleConfirm.classList.remove("fa-eye-slash");
                toggleConfirm.classList.add("fa-eye");

            }

        });

    }

    /*=====================================
            FORM VALIDATION
    =====================================*/

    const form =
        document.querySelector(".signup-form");

    const status = document.querySelector(".form-status");
    const submitButton = form.querySelector("button[type='submit']");

    const showStatus = (message, type = "error") => {
        status.textContent = message;
        status.className = `form-status ${type}`;
        status.hidden = false;
    };

    const hideStatus = () => {
        status.textContent = "";
        status.hidden = true;
    };

    form.addEventListener("submit", async function (e) {

        e.preventDefault();

        hideStatus();

        const fullname =
            document.querySelector("input[name='fullname']").value.trim();

        const username =
            document.querySelector("input[name='username']").value.trim();

        const email =
            document.querySelector("input[name='email']").value.trim();

        const pass =
            password.value.trim();

        const confirm =
            confirmPassword.value.trim();

        const checkbox =
            document.querySelector(".remember input");

        if (
            fullname === "" ||
            username === "" ||
            email === "" ||
            pass === "" ||
            confirm === ""
        ) {

            showStatus("Please fill in all fields.");

            return;

        }

        if (!validateEmail(email)) {

            showStatus("Enter a valid email address.");

            return;

        }

        if (pass.length < 6) {

            showStatus("Password should be at least 6 characters.");

            return;

        }

        if (pass !== confirm) {

            showStatus("Passwords do not match.");

            return;

        }

        if (!checkbox.checked) {

            showStatus("Please accept the Terms & Conditions.");

            return;

        }

        try {
            submitButton.disabled = true;
            submitButton.setAttribute("aria-busy", "true");
            await apiRequest("/auth/signup", {
                method: "POST",
                body: JSON.stringify({
                    fullName: fullname,
                    username,
                    email,
                    password: pass
                })
            });

            localStorage.removeItem("authToken");
            localStorage.removeItem("loggedInUser");
            window.location.href = "login.html";
        } catch (error) {
            console.error("Signup failed:", error);
            showStatus(error.message || "Unable to create your account. Please try again.");
        } finally {
            submitButton.disabled = false;
            submitButton.removeAttribute("aria-busy");
        }

    });

});


/*=========================================
        EMAIL VALIDATION
=========================================*/

function validateEmail(email) {

    const pattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return pattern.test(email);

}
