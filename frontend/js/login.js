/*=========================================
        LOGIN PAGE JAVASCRIPT
=========================================*/

document.addEventListener("DOMContentLoaded", () => {

    const clearRestoredFormValues = () => {
        document.querySelectorAll(".login-form input:not([type='checkbox'])").forEach((input) => {
            if (input !== document.activeElement) input.value = "";
        });
    };

    clearRestoredFormValues();
    window.addEventListener("pageshow", () => window.setTimeout(clearRestoredFormValues, 0), { once: true });

    /*=====================================
            PASSWORD TOGGLE
    =====================================*/

    const passwordField = document.getElementById("password");
    const togglePassword = document.querySelector(".toggle-password");

    if (togglePassword && passwordField) {

        togglePassword.addEventListener("click", () => {

            const type =
                passwordField.getAttribute("type") === "password"
                    ? "text"
                    : "password";

            passwordField.setAttribute("type", type);

            togglePassword.classList.toggle("fa-eye");
            togglePassword.classList.toggle("fa-eye-slash");

        });

    }

    /*=====================================
            LOGIN FORM
    =====================================*/

    const loginForm = document.querySelector(".login-form");

    if (loginForm) {

        loginForm.addEventListener("submit", async function (e) {

            e.preventDefault();

            const email = document.querySelector("input[name='email']").value.trim();
            const password = passwordField.value.trim();

            if (email === "" || password === "") {

                alert("Please fill in all fields.");

                return;

            }

            if (!validateEmail(email)) {

                alert("Please enter a valid email address.");

                return;

            }

            if (password.length < 6) {

                alert("Password must be at least 6 characters.");

                return;

            }
            try {
                const session = await apiRequest("/auth/login", {
                    method: "POST",
                    body: JSON.stringify({ email, password })
                });
                saveSession(session);
                window.location.href = "dashboard.html";
            } catch (error) {
                alert(error.message);
            }

        });

    }

    /*=====================================
            INPUT ANIMATION
    =====================================*/

    const inputs = document.querySelectorAll(".input-box input");

    inputs.forEach(input => {

        input.addEventListener("focus", () => {

            input.parentElement.style.transform = "scale(1.02)";

        });

        input.addEventListener("blur", () => {

            input.parentElement.style.transform = "scale(1)";

        });

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
