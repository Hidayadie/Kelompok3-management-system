/**
 * AJAX & Modal CRUD Aset - Sistem Inventaris Cerdas
 */

const API_BASE = "http://localhost:8080/api/private";
const ASSET_URL = `${API_BASE}/assets`;
const CATEGORY_URL = `${API_BASE}/categories`;
const LOCATION_URL = `${API_BASE}/location`;

$(document).ready(function () {
    // DOM References
    const $tableBody = $("#assetTableBody");
    const $alert = $("#assetAlert");
    const $filter = $("#assetFilter");
    const $refresh = $("#refreshAssets");
    const $count = $("#assetCount");

    // Modals & Forms
    const addModalEl = document.getElementById("addAssetModal");
    const editModalEl = document.getElementById("editAssetModal");
    const detailModalEl = document.getElementById("detailAssetModal");

    const $addAssetForm = $("#addAssetForm");
    const $editAssetForm = $("#editAssetForm");
    const $addAssetAlert = $("#addAssetAlert");
    const $editAssetAlert = $("#editAssetAlert");
    const $saveAssetButton = $("#saveAssetButton");
    const $updateAssetButton = $("#updateAssetButton");

    // Local Caches
    let assets = [];
    let categories = [];
    let locations = [];

    // Inisialisasi Select2 Filter
    if ($filter.length && $.fn.select2) {
        $filter.select2({
            theme: "bootstrap-5",
            width: "100%",
            placeholder: "Cari atau filter nama aset...",
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

    function renderConditionBadge(condition) {
        const cond = (condition || "").trim().toLowerCase();
        if (cond === "baik") {
            return '<span class="badge bg-success-subtle text-success border border-success-subtle"><i class="bi bi-check-circle me-1"></i>Baik</span>';
        } else if (cond === "rusak ringan") {
            return '<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle"><i class="bi bi-exclamation-triangle me-1"></i>Rusak Ringan</span>';
        } else if (cond === "rusak berat") {
            return '<span class="badge bg-danger-subtle text-danger border border-danger-subtle"><i class="bi bi-x-circle me-1"></i>Rusak Berat</span>';
        }
        return `<span class="badge bg-secondary">${escapeHtml(condition || "-")}</span>`;
    }

    function renderStatusBadge(status) {
        if (status === true || status === "true") {
            return '<span class="badge bg-success"><i class="bi bi-check2 me-1"></i>Aktif</span>';
        }
        return '<span class="badge bg-secondary"><i class="bi bi-x me-1"></i>Tidak Aktif</span>';
    }

    // ==========================================
    // OPTIONS LOADER (CATEGORY & LOCATION)
    // ==========================================

    function loadCategoryOptions(targetSelector, selectedValue = null) {
        const $target = $(targetSelector);
        if (!$target.length) return Promise.resolve();

        if (categories.length > 0) {
            populateCategorySelect($target, selectedValue);
            return Promise.resolve(categories);
        }

        $target.html('<option value="">Memuat kategori...</option>');

        return $.ajax({
            url: CATEGORY_URL,
            method: "GET",
            dataType: "json",
            xhrFields: { withCredentials: true },
            headers: { Accept: "application/json" }
        }).then(function (response) {
            categories = Array.isArray(response.data) ? response.data : [];
            populateCategorySelect($target, selectedValue);
            return categories;
        }).catch(function (xhr) {
            console.error("Gagal memuat kategori:", xhr.status, xhr.responseText);
            $target.html('<option value="">Gagal memuat kategori</option>');
        });
    }

    function populateCategorySelect($target, selectedValue) {
        $target.empty().append(new Option("Pilih kategori", ""));
        categories.forEach(function (cat) {
            const opt = new Option(cat.name ?? "Tanpa nama", cat.id);
            if (selectedValue !== null && String(cat.id) === String(selectedValue)) {
                opt.selected = true;
            }
            $target.append(opt);
        });
        if (selectedValue !== null) {
            $target.val(String(selectedValue));
        }
    }

    function loadLocationOptions(targetSelector, selectedValue = null) {
        const $target = $(targetSelector);
        if (!$target.length) return Promise.resolve();

        if (locations.length > 0) {
            populateLocationSelect($target, selectedValue);
            return Promise.resolve(locations);
        }

        $target.html('<option value="">Memuat lokasi...</option>');

        return $.ajax({
            url: LOCATION_URL,
            method: "GET",
            dataType: "json",
            xhrFields: { withCredentials: true },
            headers: { Accept: "application/json" }
        }).then(function (response) {
            locations = Array.isArray(response.data) ? response.data : [];
            populateLocationSelect($target, selectedValue);
            return locations;
        }).catch(function (xhr) {
            console.error("Gagal memuat lokasi:", xhr.status, xhr.responseText);
            $target.html('<option value="">Gagal memuat lokasi</option>');
        });
    }

    function populateLocationSelect($target, selectedValue) {
        $target.empty().append(new Option("Pilih lokasi", ""));
        locations.forEach(function (loc) {
            const locId = loc.location_id ?? loc.id;
            const locName = loc.location_name ?? loc.name ?? "Tanpa nama";
            const opt = new Option(locName, locId);
            if (selectedValue !== null && String(locId).toLowerCase() === String(selectedValue).toLowerCase()) {
                opt.selected = true;
            }
            $target.append(opt);
        });
        if (selectedValue !== null) {
            $target.val(String(selectedValue));
        }
    }

    // ==========================================
    // READ / LOAD ASSETS TABLE
    // ==========================================

    function renderTable() {
        const selectedId = $filter.length ? $filter.val() : "";

        const filtered = selectedId
            ? assets.filter(item => String(item.asset_id) === String(selectedId))
            : assets;

        $tableBody.empty();

        if (filtered.length === 0) {
            $tableBody.html(`
                <tr>
                    <td colspan="10" class="text-center text-muted py-4">
                        <i class="bi bi-inbox fs-2 d-block mb-2 text-secondary"></i>
                        Tidak ada data aset ditemukan.
                    </td>
                </tr>
            `);
            $count.text("Total aset: 0");
            return;
        }

        filtered.forEach(function (item, index) {
            const $row = $("<tr>");

            // 1. No.
            $("<td>").addClass("text-center").text(index + 1).appendTo($row);

            // 2. Kode Aset
            $("<td>").html(`
                <span class="fw-bold text-primary font-monospace">${escapeHtml(item.code_asset ?? "-")}</span>
            `).appendTo($row);

            // 3. Nama Aset
            $("<td>").html(`
                <span class="fw-semibold text-dark">${escapeHtml(item.nama_asset ?? "-")}</span>
            `).appendTo($row);

            // 4. Kategori
            $("<td>").text(item.category_detail?.name ?? "-").appendTo($row);

            // 5. Lokasi
            $("<td>").text(item.location_detail?.location_name ?? "-").appendTo($row);

            // 6. Kondisi
            $("<td>").html(renderConditionBadge(item.condition)).appendTo($row);

            // 7. Status
            $("<td>").html(renderStatusBadge(item.status)).appendTo($row);

            // 8. Jumlah
            $("<td>").addClass("text-center").html(`
                <span class="badge bg-light text-dark border px-2 py-1">${Number(item.qty_in ?? 0)}</span>
            `).appendTo($row);

            // 9. Terakhir Diperbarui
            $("<td>").addClass("small text-muted").text(formatDate(item.update_at)).appendTo($row);

            // 10. Kolom Aksi
            const $actionTd = $("<td>").addClass("text-center");
            const $actionGroup = $("<div>").addClass("btn-group btn-group-sm").attr("role", "group");

            // Tombol Detail
            $("<button>", {
                type: "button",
                class: "btn btn-outline-info btn-detail-asset",
                title: "Detail Aset"
            })
            .attr("data-id", item.asset_id)
            .html('<i class="bi bi-eye"></i>')
            .appendTo($actionGroup);

            // Tombol Ubah
            $("<button>", {
                type: "button",
                class: "btn btn-outline-warning btn-edit-asset",
                title: "Ubah Aset"
            })
            .attr("data-id", item.asset_id)
            .html('<i class="bi bi-pencil-square"></i>')
            .appendTo($actionGroup);

            // Tombol Hapus
            $("<button>", {
                type: "button",
                class: "btn btn-outline-danger btn-delete-asset",
                title: "Hapus Aset"
            })
            .attr("data-id", item.asset_id)
            .attr("data-name", item.nama_asset ?? "")
            .attr("data-code", item.code_asset ?? "")
            .html('<i class="bi bi-trash"></i>')
            .appendTo($actionGroup);

            $actionTd.append($actionGroup);
            $row.append($actionTd);

            $tableBody.append($row);
        });

        $count.text(`Menampilkan ${filtered.length} dari ${assets.length} aset`);
    }

    function loadAssets() {
        $refresh.prop("disabled", true);
        $tableBody.html(`
            <tr>
                <td colspan="10" class="text-center py-4">
                    <span class="spinner-border spinner-border-sm text-primary me-2"></span>
                    Memuat data aset...
                </td>
            </tr>
        `);

        hideAlert();

        $.ajax({
            url: ASSET_URL,
            method: "GET",
            dataType: "json",
            xhrFields: { withCredentials: true },
            headers: { Accept: "application/json" },
            cache: false,
            success: function (response) {
                if (!response || !Array.isArray(response.data)) {
                    showAlert("Format data respons aset dari server tidak valid.");
                    $tableBody.html(`
                        <tr>
                            <td colspan="10" class="text-center text-danger py-4">
                                Format data tidak valid.
                            </td>
                        </tr>
                    `);
                    return;
                }

                assets = response.data;

                // Perbarui Dropdown Filter Select2
                if ($filter.length) {
                    const currentVal = $filter.val();
                    $filter.empty().append(new Option("Semua Aset", "", true, true));
                    assets.forEach(function (item) {
                        $filter.append(
                            new Option(
                                `${item.code_asset ? '[' + item.code_asset + '] ' : ''}${item.nama_asset ?? 'Tanpa nama'}`,
                                String(item.asset_id)
                            )
                        );
                    });
                    if (currentVal && assets.some(a => String(a.asset_id) === String(currentVal))) {
                        $filter.val(currentVal).trigger("change.select2");
                    } else {
                        $filter.val("").trigger("change.select2");
                    }
                }

                renderTable();

                if (assets.length === 0) {
                    showAlert("Belum ada data aset yang terdaftar.", "info");
                }
            },
            error: function (xhr, status, error) {
                console.error("AJAX loadAssets gagal:", xhr.status, status, error, xhr.responseText);
                let message = "Gagal memuat data aset.";
                if (xhr.status === 401 || xhr.status === 403) {
                    message = "Sesi login telah berakhir atau akses ditolak. Silakan login kembali.";
                } else if (xhr.status === 404) {
                    message = "Endpoint data aset tidak ditemukan.";
                } else if (xhr.status === 0) {
                    message = "Tidak dapat terhubung ke server. Periksa server API dan CORS.";
                }

                showAlert(message, "danger");
                $tableBody.html(`
                    <tr>
                        <td colspan="10" class="text-center text-danger py-4">
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

    // Filter change and refresh click
    $filter.on("change", renderTable);
    $refresh.on("click", function () {
        loadAssets();
    });

    // ==========================================
    // CREATE ASSET (TAMBAH ASET)
    // ==========================================

    $("#addAssetButton").on("click", function () {
        hideModalAlert($addAssetAlert);
        $addAssetForm[0].reset();
        $("#assetQty").val("1");
        $("#assetStatus").val("true");

        // Load dropdown kategori & lokasi
        loadCategoryOptions("#assetCategory");
        loadLocationOptions("#assetLocation");

        if (addModalEl) {
            bootstrap.Modal.getOrCreateInstance(addModalEl).show();
        }
    });

    $addAssetForm.on("submit", function (event) {
        event.preventDefault();
        hideModalAlert($addAssetAlert);

        const payload = {
            code_asset: $("#assetCode").val().trim(),
            nama_asset: $("#assetName").val().trim(),
            category: Number($("#assetCategory").val()),
            location: $("#assetLocation").val(),
            condition: $("#assetCondition").val(),
            status: $("#assetStatus").val() === "true",
            qty_in: Number($("#assetQty").val()),
            description: $("#assetDescription").val().trim()
        };

        // Validasi Frontend
        if (!payload.code_asset) {
            showModalAlert($addAssetAlert, "Kode aset wajib diisi.");
            return;
        }
        if (!payload.nama_asset) {
            showModalAlert($addAssetAlert, "Nama aset wajib diisi.");
            return;
        }
        if (!payload.category || isNaN(payload.category)) {
            showModalAlert($addAssetAlert, "Silakan pilih kategori aset.");
            return;
        }
        if (!payload.location) {
            showModalAlert($addAssetAlert, "Silakan pilih lokasi aset.");
            return;
        }
        if (!payload.condition) {
            showModalAlert($addAssetAlert, "Silakan pilih kondisi aset.");
            return;
        }
        if (isNaN(payload.qty_in) || payload.qty_in < 0) {
            showModalAlert($addAssetAlert, "Jumlah (Qty) harus berupa angka minimal 0.");
            return;
        }

        // Disable submit button
        $saveAssetButton.prop("disabled", true).html(`
            <span class="spinner-border spinner-border-sm me-2"></span>
            Menyimpan...
        `);

        $.ajax({
            url: ASSET_URL,
            method: "POST",
            contentType: "application/json",
            dataType: "json",
            data: JSON.stringify(payload),
            xhrFields: { withCredentials: true },
            headers: { Accept: "application/json" },
            success: function (response) {
                if (addModalEl) {
                    bootstrap.Modal.getOrCreateInstance(addModalEl).hide();
                }
                $addAssetForm[0].reset();
                loadAssets();

                Swal.fire({
                    icon: "success",
                    title: "Berhasil!",
                    text: response.message || "Aset baru berhasil ditambahkan.",
                    timer: 2000,
                    showConfirmButton: false
                });
            },
            error: function (xhr, status, error) {
                console.error("Gagal menambahkan aset:", xhr.status, xhr.responseText);
                const resp = xhr.responseJSON || {};
                let message = resp.message || resp.error || "Aset gagal ditambahkan.";

                if (xhr.status === 409) {
                    message = "Kode aset sudah digunakan. Harap gunakan kode lain.";
                } else if (xhr.status === 400) {
                    message = resp.error || "Data input aset tidak valid.";
                }

                showModalAlert($addAssetAlert, message, "danger");
            },
            complete: function () {
                $saveAssetButton.prop("disabled", false).html(`
                    <i class="bi bi-save me-1"></i> Simpan Aset
                `);
            }
        });
    });

    // ==========================================
    // DETAIL ASSET (LIHAT DETAIL)
    // ==========================================

    $(document).on("click", ".btn-detail-asset", function () {
        const id = $(this).attr("data-id");
        if (!id) return;

        // Cari di cache lokal dulu atau ambil dari API
        const item = assets.find(a => String(a.asset_id) === String(id));
        if (item) {
            displayDetail(item);
        } else {
            // Ambil dari server
            $.ajax({
                url: `${ASSET_URL}/${id}`,
                method: "GET",
                dataType: "json",
                xhrFields: { withCredentials: true },
                headers: { Accept: "application/json" },
                success: function (response) {
                    const data = response.data || response;
                    displayDetail(data);
                },
                error: function (xhr) {
                    Swal.fire("Error", "Gagal memuat detail aset.", "error");
                }
            });
        }
    });

    function displayDetail(item) {
        $("#detailAssetCode").text(item.code_asset || "-");
        $("#detailAssetName").text(item.nama_asset || "-");
        $("#detailAssetCategory").text(item.category_detail?.name || "-");
        $("#detailAssetLocation").text(item.location_detail?.location_name || "-");
        $("#detailAssetCondition").html(renderConditionBadge(item.condition));
        $("#detailAssetStatus").html(renderStatusBadge(item.status));
        $("#detailAssetQty").text(item.qty_in ?? 0);
        $("#detailAssetDescription").text(item.description || "(Tidak ada deskripsi)");
        $("#detailAssetUpdatedAt").text(formatDate(item.update_at));

        $("#btnDetailToEdit").attr("data-id", item.asset_id);

        if (detailModalEl) {
            bootstrap.Modal.getOrCreateInstance(detailModalEl).show();
        }
    }

    $("#btnDetailToEdit").on("click", function () {
        const id = $(this).attr("data-id");
        if (detailModalEl) {
            bootstrap.Modal.getOrCreateInstance(detailModalEl).hide();
        }
        if (id) {
            openEditModal(id);
        }
    });

    // ==========================================
    // UPDATE ASSET (UBAH / EDIT ASET)
    // ==========================================

    $(document).on("click", ".btn-edit-asset", function () {
        const id = $(this).attr("data-id");
        if (!id) {
            Swal.fire("Error", "ID aset tidak ditemukan.", "error");
            return;
        }
        openEditModal(id);
    });

    function openEditModal(id) {
        hideModalAlert($editAssetAlert);
        $editAssetForm[0].reset();

        // Tampilkan indikator loading dengan SweetAlert
        Swal.fire({
            title: "Memuat Data...",
            text: "Mengambil data aset dari server",
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        // Ambil data aset dari endpoint GET /assets/:id
        $.ajax({
            url: `${ASSET_URL}/${encodeURIComponent(id)}`,
            method: "GET",
            dataType: "json",
            xhrFields: { withCredentials: true },
            headers: { Accept: "application/json" },
            success: function (response) {
                Swal.close();
                const item = response.data || response;
                if (!item || !item.asset_id) {
                    Swal.fire("Error", "Data aset tidak ditemukan.", "error");
                    return;
                }

                // Isi form input
                $("#editAssetId").val(item.asset_id);
                $("#editAssetCode").val(item.code_asset || "");
                $("#editAssetName").val(item.nama_asset || "");
                $("#editAssetCondition").val(item.condition || "Baik");
                $("#editAssetStatus").val(item.status ? "true" : "false");
                $("#editAssetQty").val(item.qty_in ?? 0);
                $("#editAssetDescription").val(item.description || "");

                // Pastikan opsi kategori & lokasi dimuat dan diset terpilih
                const catVal = item.category || item.category_detail?.id;
                const locVal = item.location || item.location_detail?.location_id;

                Promise.all([
                    loadCategoryOptions("#editAssetCategory", catVal),
                    loadLocationOptions("#editAssetLocation", locVal)
                ]).then(() => {
                    if (editModalEl) {
                        bootstrap.Modal.getOrCreateInstance(editModalEl).show();
                    }
                });
            },
            error: function (xhr) {
                console.error("GET detail aset gagal:", xhr.status, xhr.responseText);
                Swal.fire({
                    icon: "error",
                    title: "Gagal Mengambil Data",
                    text: xhr.responseJSON?.error || `Request gagal dengan status ${xhr.status}`
                });
            }
        });
    }

    $editAssetForm.on("submit", function (event) {
        event.preventDefault();
        hideModalAlert($editAssetAlert);

        const id = $("#editAssetId").val();
        if (!id) {
            showModalAlert($editAssetAlert, "ID aset hilang. Harap muat ulang halaman.");
            return;
        }

        const payload = {
            code_asset: $("#editAssetCode").val().trim(),
            nama_asset: $("#editAssetName").val().trim(),
            category: Number($("#editAssetCategory").val()),
            location: $("#editAssetLocation").val(),
            condition: $("#editAssetCondition").val(),
            status: $("#editAssetStatus").val() === "true",
            qty_in: Number($("#editAssetQty").val()),
            description: $("#editAssetDescription").val().trim()
        };

        // Validasi
        if (!payload.code_asset) {
            showModalAlert($editAssetAlert, "Kode aset wajib diisi.");
            return;
        }
        if (!payload.nama_asset) {
            showModalAlert($editAssetAlert, "Nama aset wajib diisi.");
            return;
        }
        if (!payload.category || isNaN(payload.category)) {
            showModalAlert($editAssetAlert, "Silakan pilih kategori aset.");
            return;
        }
        if (!payload.location) {
            showModalAlert($editAssetAlert, "Silakan pilih lokasi aset.");
            return;
        }
        if (!payload.condition) {
            showModalAlert($editAssetAlert, "Silakan pilih kondisi aset.");
            return;
        }
        if (isNaN(payload.qty_in) || payload.qty_in < 0) {
            showModalAlert($editAssetAlert, "Jumlah (Qty) harus berupa angka minimal 0.");
            return;
        }

        $updateAssetButton.prop("disabled", true).html(`
            <span class="spinner-border spinner-border-sm me-2"></span>
            Menyimpan Perubahan...
        `);

        $.ajax({
            url: `${ASSET_URL}/${encodeURIComponent(id)}`,
            method: "PUT",
            contentType: "application/json",
            dataType: "json",
            data: JSON.stringify(payload),
            xhrFields: { withCredentials: true },
            headers: { Accept: "application/json" },
            success: function (response) {
                if (editModalEl) {
                    bootstrap.Modal.getOrCreateInstance(editModalEl).hide();
                }
                loadAssets();

                Swal.fire({
                    icon: "success",
                    title: "Berhasil!",
                    text: response.message || "Data aset berhasil diperbarui.",
                    timer: 2000,
                    showConfirmButton: false
                });
            },
            error: function (xhr) {
                console.error("Gagal memperbarui aset:", xhr.status, xhr.responseText);
                const resp = xhr.responseJSON || {};
                let message = resp.message || resp.error || "Gagal memperbarui data aset.";

                if (xhr.status === 409) {
                    message = "Kode aset sudah digunakan oleh data lain.";
                } else if (xhr.status === 400) {
                    message = resp.error || "Data yang dikirimkan tidak valid.";
                }

                showModalAlert($editAssetAlert, message, "danger");
            },
            complete: function () {
                $updateAssetButton.prop("disabled", false).html(`
                    <i class="bi bi-save me-1"></i> Simpan Perubahan
                `);
            }
        });
    });

    // ==========================================
    // DELETE ASSET (HAPUS ASET)
    // ==========================================

    $(document).on("click", ".btn-delete-asset", async function () {
        const id = $(this).attr("data-id");
        const name = $(this).attr("data-name") || "aset ini";
        const code = $(this).attr("data-code") || "";

        if (!id) {
            Swal.fire("Error", "ID aset tidak ditemukan.", "error");
            return;
        }

        const confirm = await Swal.fire({
            title: "Hapus Aset?",
            html: `Apakah Anda yakin ingin menghapus aset <strong>${escapeHtml(name)}</strong> ${code ? '(' + escapeHtml(code) + ')' : ''}?`,
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
            url: `${ASSET_URL}/${encodeURIComponent(id)}`,
            method: "DELETE",
            dataType: "json",
            xhrFields: { withCredentials: true },
            headers: { Accept: "application/json" },
            success: function (response) {
                loadAssets();
                Swal.fire({
                    icon: "success",
                    title: "Terhapus!",
                    text: response.message || "Aset berhasil dihapus.",
                    timer: 1800,
                    showConfirmButton: false
                });
            },
            error: function (xhr) {
                console.error("Gagal menghapus aset:", xhr.status, xhr.responseText);
                const resp = xhr.responseJSON || {};
                Swal.fire({
                    icon: "error",
                    title: "Gagal Menghapus",
                    text: resp.message || resp.error || `Gagal menghapus aset (HTTP ${xhr.status}).`
                });
            }
        });
    });

    // Utility: sanitize text for safety
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
    loadAssets();
});
