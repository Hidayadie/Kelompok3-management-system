/**
 * AJAX & Modal CRUD Kategori - Sistem Inventaris Cerdas
 */

const API_BASE = "http://localhost:8080/api/private";
const CATEGORY_URL = `${API_BASE}/categories`;

$(document).ready(function () {
    // DOM References
    const $tableBody = $("#categoryTableBody");
    const $alert = $("#categoryAlert");
    const $filter = $("#categoryFilter");
    const $refresh = $("#refreshCategories");
    const $count = $("#categoryCount");

    // Modals
    const addModalEl = document.getElementById("addCategoryModal");
    const editModalEl = document.getElementById("editCategoryModal");
    const detailModalEl = document.getElementById("detailCategoryModal");

    // Forms & Controls
    const $addCategoryForm = $("#addCategoryForm");
    const $editCategoryForm = $("#editCategoryForm");
    const $addCategoryAlert = $("#addCategoryAlert");
    const $editCategoryAlert = $("#editCategoryAlert");
    const $saveCategoryButton = $("#saveCategoryBtn");
    const $updateCategoryButton = $("#updateCategoryButton");

    // Local Cache
    let categories = [];

    // Inisialisasi Select2 Filter dengan tema Bootstrap 5
    if ($filter.length && $.fn.select2) {
        $filter.select2({
            theme: "bootstrap-5",
            width: "100%",
            placeholder: "Cari nama kategori...",
            allowClear: true
        });
    }

    // ==========================================
    // HELPER FUNCTIONS
    // ==========================================

    function showAlert(message, type = "danger") {
        $alert
            .removeClass("d-none alert-success alert-danger alert-warning alert-info")
            .addClass("alert-" + type)
            .text(message);
    }

    function hideAlert() {
        $alert
            .addClass("d-none")
            .removeClass("alert-success alert-danger alert-warning alert-info")
            .text("");
    }

    function showModalAlert($target, message, type = "danger") {
        $target
            .removeClass("d-none alert-success alert-danger alert-warning alert-info")
            .addClass("alert-" + type)
            .text(message);
    }

    function hideModalAlert($target) {
        $target
            .addClass("d-none")
            .removeClass("alert-success alert-danger alert-warning alert-info")
            .text("");
    }

    function formatDate(value) {
        if (!value) return "-";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;

        return date.toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Jakarta"
        });
    }

    // ==========================================
    // READ / LOAD TABLE KATEGORI
    // ==========================================

    function renderTable() {
        const selectedId = $filter.length ? $filter.val() : "";

        const filtered = selectedId
            ? categories.filter(item => String(item.id) === String(selectedId))
            : categories;

        $tableBody.empty();

        if (filtered.length === 0) {
            $tableBody.html(`
                <tr>
                    <td colspan="4" class="text-center text-muted py-4">
                        <i class="bi bi-tags fs-2 d-block mb-2 text-secondary"></i>
                        Tidak ada data kategori ditemukan.
                    </td>
                </tr>
            `);
            $count.text("Total kategori: 0");
            return;
        }

        filtered.forEach(function (item, index) {
            const $row = $("<tr>");

            // 1. No.
            $("<td>").addClass("text-center").text(index + 1).appendTo($row);

            // 2. Nama Kategori
            $("<td>").html(`
                <span class="fw-semibold text-dark">${escapeHtml(item.name ?? "-")}</span>
            `).appendTo($row);

            // 3. Tanggal Dibuat
            $("<td>").addClass("small text-muted").text(formatDate(item.created_at)).appendTo($row);

            // 4. Kolom Aksi
            const $actionTd = $("<td>").addClass("text-center");
            const $actionGroup = $("<div>").addClass("btn-group btn-group-sm").attr("role", "group");

            // Tombol Detail
            $("<button>", {
                type: "button",
                class: "btn btn-outline-info btn-detail-category",
                title: "Detail Kategori"
            })
            .attr("data-id", item.id)
            .html('<i class="bi bi-eye"></i>')
            .appendTo($actionGroup);

            // Tombol Ubah
            $("<button>", {
                type: "button",
                class: "btn btn-outline-warning btn-edit-category",
                title: "Ubah Kategori"
            })
            .attr("data-id", item.id)
            .html('<i class="bi bi-pencil-square"></i>')
            .appendTo($actionGroup);

            // Tombol Hapus
            $("<button>", {
                type: "button",
                class: "btn btn-outline-danger btn-delete-category",
                title: "Hapus Kategori"
            })
            .attr("data-id", item.id)
            .attr("data-name", item.name ?? "")
            .html('<i class="bi bi-trash"></i>')
            .appendTo($actionGroup);

            $actionTd.append($actionGroup);
            $row.append($actionTd);

            $tableBody.append($row);
        });

        $count.text(`Menampilkan ${filtered.length} dari ${categories.length} kategori`);
    }

    function loadCategories() {
        $refresh.prop("disabled", true);
        $tableBody.html(`
            <tr>
                <td colspan="4" class="text-center py-4">
                    <span class="spinner-border spinner-border-sm text-primary me-2"></span>
                    Memuat data kategori...
                </td>
            </tr>
        `);

        hideAlert();

        $.ajax({
            url: CATEGORY_URL,
            method: "GET",
            dataType: "json",
            xhrFields: { withCredentials: true },
            headers: { Accept: "application/json" },
            cache: false,
            success: function (response) {
                if (!response || !Array.isArray(response.data)) {
                    showAlert("Format data respons kategori tidak valid.");
                    $tableBody.html(`
                        <tr>
                            <td colspan="4" class="text-center text-danger py-4">
                                Format data tidak valid.
                            </td>
                        </tr>
                    `);
                    return;
                }

                categories = response.data;

                // Perbarui Dropdown Filter Select2
                if ($filter.length) {
                    const currentVal = $filter.val();
                    $filter.empty().append(new Option("Semua Kategori", "", true, true));
                    categories.forEach(function (item) {
                        $filter.append(
                            new Option(item.name ?? "Tanpa nama", String(item.id))
                        );
                    });

                    if (currentVal && categories.some(c => String(c.id) === String(currentVal))) {
                        $filter.val(currentVal).trigger("change.select2");
                    } else {
                        $filter.val("").trigger("change.select2");
                    }
                }

                renderTable();

                if (categories.length === 0) {
                    showAlert("Belum ada kategori yang terdaftar.", "info");
                }
            },
            error: function (xhr, status, error) {
                console.error("AJAX loadCategories gagal:", xhr.status, status, error, xhr.responseText);
                let message = "Gagal memuat data kategori.";
                if (xhr.status === 401 || xhr.status === 403) {
                    message = "Sesi login berakhir atau akses ditolak. Silakan login kembali.";
                } else if (xhr.status === 404) {
                    message = "Endpoint kategori tidak ditemukan.";
                } else if (xhr.status === 0) {
                    message = "Tidak dapat terhubung ke server API. Periksa server dan CORS.";
                }

                showAlert(message, "danger");
                $tableBody.html(`
                    <tr>
                        <td colspan="4" class="text-center text-danger py-4">
                            ${message}
                        </td>
                    </tr>
                `);
            },
            complete: function () {
                $refresh.prop("disabled", false);
            }
        });
    }

    // Filter change & Refresh click
    $filter.on("change", renderTable);
    $refresh.on("click", function () {
        loadCategories();
    });

    // ==========================================
    // CREATE CATEGORY (TAMBAH KATEGORI)
    // ==========================================

    $("#addCategoryButton").on("click", function () {
        hideModalAlert($addCategoryAlert);
        $addCategoryForm[0].reset();

        if (addModalEl) {
            bootstrap.Modal.getOrCreateInstance(addModalEl).show();
        }
    });

    $addCategoryForm.on("submit", function (event) {
        event.preventDefault();
        hideModalAlert($addCategoryAlert);

        const name = $("#categoryName").val().trim();

        if (!name) {
            showModalAlert($addCategoryAlert, "Nama kategori wajib diisi.");
            return;
        }

        $saveCategoryButton.prop("disabled", true).html(`
            <span class="spinner-border spinner-border-sm me-2"></span>
            Menyimpan...
        `);

        $.ajax({
            url: CATEGORY_URL,
            method: "POST",
            contentType: "application/json",
            dataType: "json",
            data: JSON.stringify({ name: name }),
            xhrFields: { withCredentials: true },
            headers: { Accept: "application/json" },
            success: function (response) {
                if (addModalEl) {
                    bootstrap.Modal.getOrCreateInstance(addModalEl).hide();
                }
                $addCategoryForm[0].reset();
                loadCategories();

                Swal.fire({
                    icon: "success",
                    title: "Berhasil!",
                    text: response.message || "Kategori berhasil ditambahkan.",
                    timer: 2000,
                    showConfirmButton: false
                });
            },
            error: function (xhr) {
                console.error("Gagal menambahkan kategori:", xhr.status, xhr.responseText);
                const resp = xhr.responseJSON || {};
                let message = resp.message || resp.error || "Kategori gagal ditambahkan.";

                if (xhr.status === 409) {
                    message = "Nama kategori sudah digunakan. Harap gunakan nama lain.";
                } else if (xhr.status === 400) {
                    message = resp.error || "Data kategori tidak valid.";
                }

                showModalAlert($addCategoryAlert, message, "danger");
            },
            complete: function () {
                $saveCategoryButton.prop("disabled", false).html(`
                    <i class="bi bi-save me-1"></i> Simpan Kategori
                `);
            }
        });
    });

    // ==========================================
    // DETAIL CATEGORY (LIHAT DETAIL)
    // ==========================================

    $(document).on("click", ".btn-detail-category", function () {
        const id = $(this).attr("data-id");
        if (!id) return;

        const item = categories.find(c => String(c.id) === String(id));
        if (item) {
            displayDetail(item);
        } else {
            $.ajax({
                url: `${CATEGORY_URL}/${encodeURIComponent(id)}`,
                method: "GET",
                dataType: "json",
                xhrFields: { withCredentials: true },
                headers: { Accept: "application/json" },
                success: function (response) {
                    const data = response.data ?? response.category ?? response;
                    displayDetail(data);
                },
                error: function () {
                    Swal.fire("Error", "Gagal memuat detail kategori.", "error");
                }
            });
        }
    });

    function displayDetail(item) {
        $("#detailCategoryId").text(item.id ?? "-");
        $("#detailCategoryName").text(item.name ?? "-");
        $("#detailCategoryCreatedAt").text(formatDate(item.created_at));

        $("#btnDetailToEditCategory").attr("data-id", item.id);

        if (detailModalEl) {
            bootstrap.Modal.getOrCreateInstance(detailModalEl).show();
        }
    }

    $("#btnDetailToEditCategory").on("click", function () {
        const id = $(this).attr("data-id");
        if (detailModalEl) {
            bootstrap.Modal.getOrCreateInstance(detailModalEl).hide();
        }
        if (id) {
            openEditModal(id);
        }
    });

    // ==========================================
    // UPDATE CATEGORY (UBAH / EDIT KATEGORI)
    // ==========================================

    $(document).on("click", ".btn-edit-category", function () {
        const id = $(this).attr("data-id");
        if (!id) {
            Swal.fire("Error", "ID kategori tidak ditemukan.", "error");
            return;
        }
        openEditModal(id);
    });

    function openEditModal(id) {
        hideModalAlert($editCategoryAlert);
        $editCategoryForm[0].reset();

        Swal.fire({
            title: "Memuat Data...",
            text: "Mengambil data kategori dari server",
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        $.ajax({
            url: `${CATEGORY_URL}/${encodeURIComponent(id)}`,
            method: "GET",
            dataType: "json",
            xhrFields: { withCredentials: true },
            headers: { Accept: "application/json" },
            success: function (response) {
                Swal.close();
                const item = response.data ?? response.category ?? response;

                if (!item || item.id == null) {
                    Swal.fire("Error", "Data kategori tidak ditemukan.", "error");
                    return;
                }

                $("#editCategoryId").val(item.id);
                $("#editCategoryName").val(item.name ?? "");

                if (editModalEl) {
                    bootstrap.Modal.getOrCreateInstance(editModalEl).show();
                }
            },
            error: function (xhr) {
                console.error("GET detail kategori gagal:", xhr.status, xhr.responseText);
                Swal.fire({
                    icon: "error",
                    title: "Gagal Mengambil Data",
                    text: xhr.responseJSON?.error || `Request gagal dengan status ${xhr.status}`
                });
            }
        });
    }

    $editCategoryForm.on("submit", function (event) {
        event.preventDefault();
        hideModalAlert($editCategoryAlert);

        const id = $("#editCategoryId").val();
        const name = $("#editCategoryName").val().trim();

        if (!id) {
            showModalAlert($editCategoryAlert, "ID kategori hilang. Silakan muat ulang halaman.");
            return;
        }
        if (!name) {
            showModalAlert($editCategoryAlert, "Nama kategori wajib diisi.");
            return;
        }

        $updateCategoryButton.prop("disabled", true).html(`
            <span class="spinner-border spinner-border-sm me-2"></span>
            Menyimpan Perubahan...
        `);

        $.ajax({
            url: `${CATEGORY_URL}/${encodeURIComponent(id)}`,
            method: "PUT",
            contentType: "application/json",
            dataType: "json",
            data: JSON.stringify({ name: name }),
            xhrFields: { withCredentials: true },
            headers: { Accept: "application/json" },
            success: function (response) {
                if (editModalEl) {
                    bootstrap.Modal.getOrCreateInstance(editModalEl).hide();
                }
                loadCategories();

                Swal.fire({
                    icon: "success",
                    title: "Berhasil!",
                    text: response.message || "Kategori berhasil diperbarui.",
                    timer: 2000,
                    showConfirmButton: false
                });
            },
            error: function (xhr) {
                console.error("Gagal memperbarui kategori:", xhr.status, xhr.responseText);
                const resp = xhr.responseJSON || {};
                let message = resp.message || resp.error || "Gagal memperbarui kategori.";

                if (xhr.status === 409) {
                    message = "Nama kategori sudah digunakan.";
                }

                showModalAlert($editCategoryAlert, message, "danger");
            },
            complete: function () {
                $updateCategoryButton.prop("disabled", false).html(`
                    <i class="bi bi-save me-1"></i> Simpan Perubahan
                `);
            }
        });
    });

    // ==========================================
    // DELETE CATEGORY (HAPUS KATEGORI)
    // ==========================================

    $(document).on("click", ".btn-delete-category", async function () {
        const id = $(this).attr("data-id");
        const name = $(this).attr("data-name") || "kategori ini";

        if (!id) {
            Swal.fire("Error", "ID kategori tidak ditemukan.", "error");
            return;
        }

        const confirm = await Swal.fire({
            title: "Hapus Kategori?",
            html: `Apakah Anda yakin ingin menghapus kategori <strong>${escapeHtml(name)}</strong>?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#dc3545",
            cancelButtonColor: "#6c757d",
            confirmButtonText: "<i class='bi bi-trash me-1'></i> Ya, Hapus!",
            cancelButtonText: "Batal"
        });

        if (!confirm.isConfirmed) return;

        Swal.fire({
            title: "Menghapus...",
            text: "Mohon tunggu sebentar",
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        $.ajax({
            url: `${CATEGORY_URL}/${encodeURIComponent(id)}`,
            method: "DELETE",
            dataType: "json",
            xhrFields: { withCredentials: true },
            headers: { Accept: "application/json" },
            success: function (response) {
                loadCategories();
                Swal.fire({
                    icon: "success",
                    title: "Terhapus!",
                    text: response.message || "Kategori berhasil dihapus.",
                    timer: 1800,
                    showConfirmButton: false
                });
            },
            error: function (xhr) {
                console.error("Gagal menghapus kategori:", xhr.status, xhr.responseText);
                const resp = xhr.responseJSON || {};
                Swal.fire({
                    icon: "error",
                    title: "Gagal Menghapus",
                    text: resp.message || resp.error || `Gagal menghapus kategori (HTTP ${xhr.status}).`
                });
            }
        });
    });

    // Utility: sanitize text
    function escapeHtml(text) {
        if (!text) return "";
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Panggilan pertama saat halaman dibuka
    loadCategories();
});
