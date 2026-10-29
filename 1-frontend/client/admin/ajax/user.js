$(function () {
    "use strict";
    const API_URL= window.APP_CONFIG.API_BASE_URL; //"http://localhost:8080",
    //const FRONTEND_BASE_URL= window.APP_CONFIG.BASIC_URL; //"http://localhost:8088",
    
    //const API_BASE = "http://localhost:8080/api/private/users";
    
    const API_BASE = `${API_URL}/api/private/users`;
    const $table = $("#userTableBody");
    const $alert = $("#userAlert");
    const $createForm = $("#userCreateForm");
    const $passwordForm = $("#userPasswordForm");

    const createModalEl = document.getElementById("userCreateModal");
    const passwordModalEl = document.getElementById("userPasswordModal");

    if (!window.bootstrap?.Modal || !createModalEl || !passwordModalEl) {
        console.error("Bootstrap Modal atau elemen modal pengguna tidak ditemukan.");
        return;
    }

    const createModal = bootstrap.Modal.getOrCreateInstance(createModalEl);
    const passwordModal = bootstrap.Modal.getOrCreateInstance(passwordModalEl);

    let users = [];

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, ch => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
        })[ch]);
    }

    function showAlert($target, message, type = "danger") {
        $target.removeClass("d-none alert-success alert-danger alert-warning alert-info")
            .addClass(`alert-${type}`).text(message);
    }

    function hideAlert($target) {
        $target.addClass("d-none").text("");
    }

    function apiAjax(options = {}) {
        return $.ajax({
            dataType: "json",
            xhrFields: { withCredentials: true },
            headers: { Accept: "application/json" },
            ...options
        });
    }

    function getError(xhr, fallback) {
        return xhr.responseJSON?.message ||
            xhr.responseJSON?.error ||
            fallback ||
            `Permintaan gagal (HTTP ${xhr.status}).`;
    }

    function unwrapUsers(response) {
        if (Array.isArray(response)) return response;
        if (Array.isArray(response?.data)) return response.data;
        if (Array.isArray(response?.users)) return response.users;
        if (Array.isArray(response?.items)) return response.items;
        return [];
    }

    function renderUsers() {
        const query = String($("#userSearch").val() || "").trim().toLowerCase();
        const filtered = users.filter(user => {
            const haystack = [
                user.id, user.ID, user.name, user.Name,
                user.email, user.Email, user.role, user.Role
            ].join(" ").toLowerCase();
            return haystack.includes(query);
        });

        if (!filtered.length) {
            $table.html(`<tr><td colspan="6" class="text-center text-muted py-4">${
                users.length ? "Tidak ada pengguna yang cocok." : "Belum ada data pengguna."
            }</td></tr>`);
            $("#userCount").text(`Total data: ${users.length}`);
            return;
        }

        $table.html(filtered.map((user, index) => {
            const id = user.id ?? user.ID ?? "";
            const name = user.name ?? user.Name ?? "";
            const email = user.email ?? user.Email ?? "";
            const role = user.role ?? user.Role ?? "user";
            return `<tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(id)}</td>
                <td class="fw-semibold">${escapeHtml(name)}</td>
                <td>${escapeHtml(email)}</td>
                <td><span class="role-pill">${escapeHtml(role)}</span></td>
                <td class="text-center">
                    <button type="button" class="btn btn-sm btn-outline-warning btn-change-password"
                        data-id="${escapeHtml(id)}" data-name="${escapeHtml(name)}" title="Ubah password">
                        <i class="bi bi-key"></i> Ubah Password
                    </button>
                </td>
            </tr>`;
        }).join(""));

        $("#userCount").text(`Menampilkan ${filtered.length} dari ${users.length} pengguna`);
    }
    
    function loadUsers() {
    // Hancurkan DataTables lama sebelum memuat ulang data
    if ($.fn.DataTable.isDataTable("#userTable")) {
        $("#userTable").DataTable().destroy();
    }

    $table.html(`
        <tr>
            <td colspan="6" class="text-center py-4">
                <span class="spinner-border spinner-border-sm me-2"></span>
                Memuat data pengguna...
            </td>
        </tr>
    `);

    return apiAjax({
        url: API_BASE,
        method: "GET"
    })
    .done(function (response) {
        console.log("Respons GET users:", response);

        users = unwrapUsers(response);

        // Render tabel dan inisialisasi DataTables di renderUsers()
        renderUsers();

        hideAlert($alert);
    })
    .fail(function (xhr) {
        console.error(
            "Gagal memuat users:",
            xhr.status,
            xhr.responseText
        );

        users = [];

        $table.empty();

        $("#userCount").text("Total data: 0");

        showAlert(
            $alert,
            getError(xhr, "Gagal memuat data pengguna.")
        );

        // Inisialisasi DataTables agar pesan tabel kosong tetap tampil
        if ($.fn.DataTable.isDataTable("#userTable")) {
            $("#userTable").DataTable().destroy();
        }

        $("#userTable").DataTable({
            pageLength: 10,
            searching: true,
            ordering: true,
            paging: true,
            info: true,
            autoWidth: false,
            language: {
                emptyTable: "Gagal memuat data pengguna.",
                zeroRecords: "Data pengguna tidak ditemukan.",
                search: "Cari:",
                searchPlaceholder: "Cari pengguna...",
                lengthMenu: "Tampilkan _MENU_ data",
                info: "Menampilkan _START_ sampai _END_ dari _TOTAL_ pengguna",
                infoEmpty: "Tidak ada data pengguna",
                paginate: {
                    first: "Pertama",
                    last: "Terakhir",
                    next: "Berikutnya",
                    previous: "Sebelumnya"
                }
            }
        });
    });
}
    function resetCreateForm() {
        $createForm[0].reset();
        $("#newUserRole").val("user");
        hideAlert($("#userCreateAlert"));
    }

    $("#btnAddUser").on("click", function () {
        resetCreateForm();
        createModal.show();
    });

    $("#btnRefreshUsers").on("click", loadUsers);
    $("#userSearch").on("input", renderUsers);

    $createForm.on("submit", function (event) {
        event.preventDefault();
        const payload = {
            name: $("#newUserName").val().trim(),
            email: $("#newUserEmail").val().trim(),
            password: $("#newUserPassword").val(),
            role: $("#newUserRole").val()
        };

        if (payload.password.length < 8 || payload.password.length > 72) {
            showAlert($("#userCreateAlert"), "Password harus 8 sampai 72 karakter.");
            return;
        }

        const $button = $("#btnSaveUser");
        $button.prop("disabled", true).text("Menyimpan...");

        apiAjax({
            url: API_BASE,
            method: "POST",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify(payload)
        }).done(response => {
            createModal.hide();
            Swal.fire({
                icon: "success",
                title: "Berhasil",
                text: response.message || "Pengguna berhasil ditambahkan.",
                timer: 1800,
                showConfirmButton: false
            });
            loadUsers();
        }).fail(xhr => {
            console.error("Gagal tambah user:", xhr.status, xhr.responseText);
            showAlert($("#userCreateAlert"), getError(xhr, "Gagal menambahkan pengguna."));
        }).always(() => {
            $button.prop("disabled", false).html('<i class="bi bi-save me-1"></i>Simpan');
        });
    });

    $(document).on("click", ".btn-change-password", function () {
        const id = $(this).attr("data-id");
        const name = $(this).attr("data-name") || `Pengguna #${id}`;

        $passwordForm[0].reset();
        hideAlert($("#userPasswordAlert"));
        $("#passwordUserID").val(id);
        $("#passwordUserName").val(name);
        passwordModal.show();
    });

    $passwordForm.on("submit", function (event) {
        event.preventDefault();
        const id = $("#passwordUserID").val();
        const password = $("#newPassword").val();
        const confirmPassword = $("#confirmNewPassword").val();

        if (password.length < 8 || password.length > 72) {
            showAlert($("#userPasswordAlert"), "Password harus 8 sampai 72 karakter.");
            return;
        }

        if (password !== confirmPassword) {
            showAlert($("#userPasswordAlert"), "Konfirmasi password tidak sama.");
            return;
        }

        const $button = $("#btnSavePassword");
        $button.prop("disabled", true).text("Memproses...");

        apiAjax({
            url: `${API_BASE}/${encodeURIComponent(id)}/password`,
            method: "PUT",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify({ new_password: password })
        }).done(response => {
            passwordModal.hide();
            Swal.fire({
                icon: "success",
                title: "Berhasil",
                text: response.message || "Password berhasil diubah.",
                timer: 1800,
                showConfirmButton: false
            });
        }).fail(xhr => {
            console.error("Gagal ubah password:", xhr.status, xhr.responseText);
            showAlert($("#userPasswordAlert"), getError(xhr, "Gagal mengubah password."));
        }).always(() => {
            $button.prop("disabled", false).html('<i class="bi bi-key me-1"></i>Ubah Password');
        });
    });

    loadUsers();
});
