
document.addEventListener("DOMContentLoaded", function () {
    const dashboardButton = document.querySelector(".dashboard-button");

    if (dashboardButton) {
        dashboardButton.addEventListener("click", function (event) {
            // Prevent navigation if the dashboard file is unavailable.
            // This is only a basic confirmation, not a file check.
            const confirmed = confirm(
                "Ready to organize your school life? Open your dashboard?"
            );

            if (!confirmed) {
                event.preventDefault();
            }
        });
    }
});
