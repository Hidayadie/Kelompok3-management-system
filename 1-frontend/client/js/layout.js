
document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const sidebar = document.getElementById("sidebar-container");

    // Pastikan container sidebar tersedia
    if (!sidebar) {
        console.error(
            'Elemen dengan ID "sidebar-container" tidak ditemukan.'
        );
        return;
    }

    // Load sidebar.html
    try {
        const response = await fetch("../components/sidebar.html", {
            cache: "no-cache"
        });

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}: ${response.statusText}`
            );
        }

        const html = await response.text();

        if (!html.trim()) {
            throw new Error("File sidebar.html kosong.");
        }

        sidebar.innerHTML = html;

        console.log("Sidebar berhasil dimuat!");

        // Pasang event logout setelah sidebar selesai dimuat
        const logoutButton = sidebar.querySelector("#logoutButton");

        if (logoutButton) {
            logoutButton.addEventListener("click", async (event) => {
                event.preventDefault();

                // Hindari klik logout berulang kali
                if (logoutButton.dataset.loading === "true") {
                    return;
                }

                logoutButton.dataset.loading = "true";
                logoutButton.style.pointerEvents = "none";

                try {
                    const response = await fetch(
                        "http://localhost:8080/api/auth/logout",
                        {
                            method: "POST",
                            credentials: "include",
                            headers: {
                                "Accept": "application/json"
                            }
                        }
                    );

                    if (!response.ok) {
                        console.error(
                            "Logout API mengembalikan status:",
                            response.status
                        );
                    }
                } catch (error) {
                    console.error("Request logout gagal:", error);
                } finally {
                    // Tetap arahkan ke login meskipun request gagal.
                    window.location.href =
                        "http://localhost:8081/login.html";
                }
            });

            console.log("Event logout berhasil dipasang.");
        } else {
            console.warn(
                'Tombol dengan ID "logoutButton" tidak ditemukan di sidebar.'
            );
        }

        // Tandai menu aktif berdasarkan URL halaman
        const currentPath = window.location.pathname
            .replace(/\/+$/, "")
            .toLowerCase();

        sidebar.querySelectorAll("a[href]").forEach((link) => {
            const href = link.getAttribute("href");

            if (
                !href ||
                href.startsWith("#") ||
                href.startsWith("javascript:")
            ) {
                return;
            }

            try {
                const linkPath = new URL(
                    href,
                    window.location.href
                ).pathname.replace(/\/+$/, "").toLowerCase();

                if (linkPath === currentPath) {
                    link.classList.add("active");
                    link.setAttribute("aria-current", "page");
                } else {
                    link.classList.remove("active");
                    link.removeAttribute("aria-current");
                }
            } catch (error) {
                console.warn("Link sidebar tidak valid:", href);
            }
        });

    } catch (error) {
        console.error("Sidebar gagal dimuat:", error);

        sidebar.innerHTML = `
            <div class="alert alert-danger m-3" role="alert">
                Sidebar gagal dimuat.
                <br>
                <small>Periksa path file dan koneksi server.</small>
            </div>
        `;
    }
});
