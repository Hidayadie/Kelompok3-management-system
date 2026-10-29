/**
 * AJAX & Modal CRUD Aset Rusak - Sistem Inventaris Cerdas
 */

const isLocalDev = window.location.hostname === "localhost" && window.location.port === "8081";
const ROOT_API = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || (isLocalDev ? "http://localhost:8080" : window.location.origin);
const API_BASE = `${ROOT_API}/api/private`;
const BROKEN_URL = `${API_BASE}/asset-broken`;
const ASSET_URL = `${API_BASE}/assets`;

$(document).ready(function () {
    const $tableBody = $("#brokenAssetTableBody");
    const $alert = $("#brokenAssetAlert");
    const $filter = $("#brokenAssetFilter");
    const $tingkatFilter = $("#statusTingkatFilter");
    const $refresh = $("#refreshBrokenAssets");
    const $count = $("#brokenAssetCount");

    // Modals
    const addModalEl = document.getElementById("addBrokenAssetModal");
    const editModalEl = document.getElementById("editBrokenAssetModal");
    const detailModalEl = document.getElementById("detailBrokenAssetModal");

    // Forms
    const $addForm = $("#addBrokenAssetForm");
    const $editForm = $("#editBrokenAssetForm");
    const $addAlert = $("#addBrokenAssetAlert");
    const $editAlert = $("#editBrokenAssetAlert");
    const $saveButton = $("#saveBrokenAssetButton");
    const $updateButton = $("#updateBrokenAssetButton");

    let brokenAssets = [];
    let availableAssets = [];

    // Init Select2
    if ($filter.length && $.fn.select2) {
        $filter.select2({
            theme: "bootstrap-5",
            width: "100%",
            placeholder: "Cari kerusakan aset...",
            allowClear: true
        });
    }

    function showAlert(message, type = "danger") {
        $alert
            .removeClass("d-none alert-success alert-danger alert-warning alert-info")
            .addClass("alert-" + type)
            .text(message);
    }

    function hideAlert() {
        $alert.addClass("d-none").removeClass("alert-success alert-danger alert-warning alert-info").text("");
    }

    function showModalAlert($target, message, type = "danger") {
        $target
            .removeClass("d-none alert-success alert-danger alert-warning alert-info")
            .addClass("alert-" + type)
            .text(message);
    }

    function hideModalAlert($target) {
        $target.addClass("d-none").removeClass("alert-success alert-danger alert-warning alert-info").text("");
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

    function escapeHtml(text) {
        if (!text) return "";
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function renderTingkatBadge(status) {
        const s = (status || "").toLowerCase();
        if (s === "rusak_ringan") {
            return '<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle"><i class="bi bi-info-circle me-1"></i>Rusak Ringan</span>';
        } else if (s === "rusak_sedang") {
            return '<span class="badge bg-orange-subtle text-warning border border-warning"><i class="bi bi-exclamation-triangle me-1"></i>Rusak Sedang</span>';
        } else if (s === "rusak_berat") {
            return '<span class="badge bg-danger-subtle text-danger border border-danger-subtle"><i class="bi bi-x-circle me-1"></i>Rusak Berat</span>';
        }
        return `<span class="badge bg-secondary">${escapeHtml(status || "-")}</span>`;
    }

    function renderStatusRusakBadge(statusRusak) {
        if (statusRusak === true || statusRusak === "true") {
            return '<span class="badge bg-danger"><i class="bi bi-slash-circle me-1"></i>Afkir / Tak Dapat Diperbaiki</span>';
        }
        return '<span class="badge bg-primary-subtle text-primary border border-primary-subtle"><i class="bi bi-tools me-1"></i>Dapat Diperbaiki</span>';
    }

    // Load assets for dropdown
    function loadAssetOptions(targetSelector, selectedValue = null) {
        const $target = $(targetSelector);
        if (!$target.length) return Promise.resolve();

        $target.html('<option value="">Memuat aset...</option>');

        return $.ajax({
            url: ASSET_URL,
            method: "GET",
            dataType: "json",
            xhrFields: { withCredentials: true },
            headers: { Accept: "application/json" }
        }).then(function (response) {
            availableAssets = Array.isArray(response.data) ? response.data : [];
            $target.empty().append(new Option("Pilih aset...", ""));

            availableAssets.forEach(function (ast) {
                const text = `[${ast.code_asset || '-'}] ${ast.nama_asset || 'Tanpa nama'} (Sisa Stok: ${ast.qty_in ?? 0})`;
                const opt = new Option(text, ast.asset_id);
                if (selectedValue !== null && String(ast.asset_id) === String(selectedValue)) {
                    opt.selected = true;
                }
                $target.append(opt);
            });

            if (selectedValue !== null) {
                $target.val(String(selectedValue));
            }
            return availableAssets;
        }).catch(function (xhr) {
            console.error("Gagal memuat aset:", xhr.status, xhr.responseText);
            $target.html('<option value="">Gagal memuat daftar aset</option>');
        });
    }

    // Render Table
    function renderTable() {
        const selectedId = $filter.length ? $filter.val() : "";
        const selectedTingkat = $tingkatFilter.length ? $tingkatFilter.val() : "";

        let filtered = brokenAssets;

        if (selectedId) {
            filtered = filtered.filter(item => String(item.rusak_id) === String(selectedId));
        }

        if (selectedTingkat) {
            filtered = filtered.filter(item => (item.status || "").toLowerCase() === selectedTingkat.toLowerCase());
        }

        $tableBody.empty();

        if (filtered.length === 0) {
            $tableBody.html(`
                <tr>
                    <td colspan="9" class="text-center text-muted py-4">
                        <i class="bi bi-inbox fs-2 d-block mb-2 text-secondary"></i>
                        Tidak ada data kerusakan aset ditemukan.
                    </td>
                </tr>
            `);
            $count.text("Total data: 0");
            return;
        }

        filtered.forEach(function (item, index) {
            const $row = $("<tr>");

            $("<td>").addClass("text-center").text(index + 1).appendTo($row);
            $("<td>").html(`<span class="fw-bold font-monospace text-danger">${escapeHtml(item.code_rusak ?? "-")}</span>`).appendTo($row);
            
            const assetName = item.asset_detail?.nama_asset ?? "-";
            const assetCode = item.asset_detail?.code_asset ? `[${item.asset_detail.code_asset}] ` : "";
            $("<td>").html(`<span class="fw-semibold text-dark">${assetCode}${escapeHtml(assetName)}</span>`).appendTo($row);

            const catName = item.asset_detail?.category_detail?.name ?? "-";
            const locName = item.asset_detail?.location_detail?.location_name ?? "-";
            $("<td>").html(`<small class="text-muted">${escapeHtml(catName)} &bull; ${escapeHtml(locName)}</small>`).appendTo($row);

            $("<td>").addClass("text-center").html(`<span class="badge bg-light text-danger border px-2 py-1 fw-bold fs-6">${item.qty_rusak ?? 1}</span>`).appendTo($row);
            $("<td>").html(renderTingkatBadge(item.status)).appendTo($row);
            $("<td>").html(renderStatusRusakBadge(item.status_rusak)).appendTo($row);
            $("<td>").addClass("small text-muted").text(formatDate(item.create_at)).appendTo($row);

            // Kolom Aksi
            const $actionTd = $("<td>").addClass("text-center");
            const $actionGroup = $("<div>").addClass("btn-group btn-group-sm").attr("role", "group");

            $("<button>", {
                type: "button",
                class: "btn btn-outline-info btn-detail-broken",
                title: "Detail Kerusakan"
            }).attr("data-id", item.rusak_id).html('<i class="bi bi-eye"></i>').appendTo($actionGroup);

            $("<button>", {
                type: "button",
                class: "btn btn-outline-warning btn-edit-broken",
                title: "Ubah Data"
            }).attr("data-id", item.rusak_id).html('<i class="bi bi-pencil-square"></i>').appendTo($actionGroup);

            $("<button>", {
                type: "button",
                class: "btn btn-outline-danger btn-delete-broken",
                title: "Hapus & Kembalikan Stok"
            })
            .attr("data-id", item.rusak_id)
            .attr("data-code", item.code_rusak ?? "")
            .html('<i class="bi bi-trash"></i>').appendTo($actionGroup);

            $actionTd.append($actionGroup);
            $row.append($actionTd);
            $tableBody.append($row);
        });

        $count.text(`Menampilkan ${filtered.length} dari ${brokenAssets.length} data kerusakan`);
    }

    // Load Broken Assets
    function loadBrokenAssets() {
        $refresh.prop("disabled", true);
        $tableBody.html(`
            <tr>
                <td colspan="9" class="text-center py-4">
                    <span class="spinner-border spinner-border-sm text-primary me-2"></span>
                    Memuat data aset rusak...
                </td>
            </tr>
        `);
        hideAlert();

        $.ajax({
            url: BROKEN_URL,
            method: "GET",
            dataType: "json",
            xhrFields: { withCredentials: true },
            headers: { Accept: "application/json" },
            cache: false,
            success: function (response) {
                brokenAssets = Array.isArray(response.data) ? response.data : [];

                if ($filter.length) {
                    const currentVal = $filter.val();
                    $filter.empty().append(new Option("Semua Kerusakan Aset", "", true, true));
                    brokenAssets.forEach(function (item) {
                        const label = `${item.code_rusak} - ${item.asset_detail?.nama_asset || 'Aset'}`;
                        $filter.append(new Option(label, String(item.rusak_id)));
                    });
                    if (currentVal && brokenAssets.some(b => String(b.rusak_id) === String(currentVal))) {
                        $filter.val(currentVal).trigger("change.select2");
                    } else {
                        $filter.val("").trigger("change.select2");
                    }
                }

                renderTable();

                if (brokenAssets.length === 0) {
                    showAlert("Belum ada pencatatan aset rusak yang terdaftar.", "info");
                }
            },
            error: function (xhr) {
                console.error("Gagal memuat aset rusak:", xhr);
                let message = "Gagal memuat data aset rusak.";
                if (xhr.status === 401 || xhr.status === 403) {
                    message = "Sesi login telah berakhir. Silakan login kembali.";
                }
                showAlert(message, "danger");
                $tableBody.html(`<tr><td colspan="9" class="text-center text-danger py-4">${message}</td></tr>`);
            },
            complete: function () {
                $refresh.prop("disabled", false);
            }
        });
    }

    $filter.on("change", renderTable);
    $tingkatFilter.on("change", renderTable);
    $refresh.on("click", loadBrokenAssets);

    // Modal Tambah
    $("#addBrokenAssetButton").on("click", function () {
        hideModalAlert($addAlert);
        $addForm[0].reset();
        $("#qtyRusak").val("1");
        $("#statusTingkat").val("rusak_ringan");
        $("#statusRusak").val("false");

        loadAssetOptions("#brokenAssetId");

        if (addModalEl) {
            bootstrap.Modal.getOrCreateInstance(addModalEl).show();
        }
    });

    $("#brokenAssetId").on("change", function () {
        const selectedId = $(this).val();
        const ast = availableAssets.find(a => String(a.asset_id) === String(selectedId));
        if (ast) {
            $("#assetStockHelp").html(`<span class="text-success fw-semibold"><i class="bi bi-check-circle me-1"></i>Stok tersedia saat ini: <strong>${ast.qty_in ?? 0} unit</strong></span>`);
            $("#qtyRusak").attr("max", ast.qty_in ?? 1);
        } else {
            $("#assetStockHelp").text("Pilih aset untuk melihat stok tersedia.");
        }
    });

    // Submit Tambah
    $addForm.on("submit", function (e) {
        e.preventDefault();
        hideModalAlert($addAlert);

        const payload = {
            code_rusak: $("#codeRusak").val().trim(),
            asset_id: Number($("#brokenAssetId").val()),
            qty_rusak: Number($("#qtyRusak").val()),
            status: $("#statusTingkat").val(),
            status_rusak: $("#statusRusak").val() === "true"
        };

        if (!payload.code_rusak) {
            showModalAlert($addAlert, "Kode rusak wajib diisi.");
            return;
        }
        if (!payload.asset_id) {
            showModalAlert($addAlert, "Pilih aset yang mengalami kerusakan.");
            return;
        }
        if (!payload.qty_rusak || payload.qty_rusak <= 0) {
            showModalAlert($addAlert, "Jumlah rusak minimal 1 unit.");
            return;
        }

        $saveButton.prop("disabled", true).html('<span class="spinner-border spinner-border-sm me-2"></span>Menyimpan...');

        $.ajax({
            url: BROKEN_URL,
            method: "POST",
            contentType: "application/json",
            dataType: "json",
            data: JSON.stringify(payload),
            xhrFields: { withCredentials: true },
            headers: { Accept: "application/json" },
            success: function () {
                if (addModalEl) bootstrap.Modal.getOrCreateInstance(addModalEl).hide();
                $addForm[0].reset();
                loadBrokenAssets();

                Swal.fire({
                    icon: "success",
                    title: "Berhasil Dicatat!",
                    text: "Kerusakan aset berhasil disimpan dan stok aset otomatis dikurangi.",
                    timer: 2000,
                    showConfirmButton: false
                });
            },
            error: function (xhr) {
                console.error("Simpan gagal:", xhr);
                let msg = xhr.responseJSON?.error || "Gagal mencatat kerusakan aset.";
                showModalAlert($addAlert, msg);
            },
            complete: function () {
                $saveButton.prop("disabled", false).html('<i class="bi bi-save me-1"></i> Simpan Kerusakan');
            }
        });
    });

    // Detail Broken Asset
    $(document).on("click", ".btn-detail-broken", function () {
        const id = $(this).attr("data-id");
        const item = brokenAssets.find(b => String(b.rusak_id) === String(id));
        if (!item) return;

        $("#detailCodeRusak").text(item.code_rusak ?? "-");
        $("#detailQtyRusak").text(`${item.qty_rusak ?? 1} unit`);
        $("#detailAssetName").text(item.asset_detail?.nama_asset ?? "-");
        $("#detailAssetCode").text(`Kode Aset: ${item.asset_detail?.code_asset ?? '-'}`);
        $("#detailAssetCategory").text(item.asset_detail?.category_detail?.name ?? "-");
        $("#detailAssetLocation").text(item.asset_detail?.location_detail?.location_name ?? "-");
        $("#detailStatusTingkat").html(renderTingkatBadge(item.status));
        $("#detailStatusRusak").html(renderStatusRusakBadge(item.status_rusak));
        $("#detailCreatedAt").text(formatDate(item.create_at));

        $("#btnDetailToEditBroken").attr("data-id", item.rusak_id);

        if (detailModalEl) bootstrap.Modal.getOrCreateInstance(detailModalEl).show();
    });

    // Ubah dari detail
    $("#btnDetailToEditBroken").on("click", function () {
        const id = $(this).attr("data-id");
        if (detailModalEl) bootstrap.Modal.getOrCreateInstance(detailModalEl).hide();
        openEditModal(id);
    });

    $(document).on("click", ".btn-edit-broken", function () {
        const id = $(this).attr("data-id");
        openEditModal(id);
    });

    function openEditModal(id) {
        const item = brokenAssets.find(b => String(b.rusak_id) === String(id));
        if (!item) return;

        hideModalAlert($editAlert);
        $("#editRusakId").val(item.rusak_id);
        $("#editCodeRusak").val(item.code_rusak ?? "");
        $("#editQtyRusak").val(item.qty_rusak ?? 1);
        $("#editStatusTingkat").val(item.status ?? "rusak_ringan");
        $("#editStatusRusak").val(item.status_rusak ? "true" : "false");

        loadAssetOptions("#editBrokenAssetId", item.asset_id);

        if (editModalEl) bootstrap.Modal.getOrCreateInstance(editModalEl).show();
    }

    // Submit Ubah
    $editForm.on("submit", function (e) {
        e.preventDefault();
        hideModalAlert($editAlert);

        const id = $("#editRusakId").val();
        const payload = {
            code_rusak: $("#editCodeRusak").val().trim(),
            asset_id: Number($("#editBrokenAssetId").val()),
            qty_rusak: Number($("#editQtyRusak").val()),
            status: $("#editStatusTingkat").val(),
            status_rusak: $("#editStatusRusak").val() === "true"
        };

        $updateButton.prop("disabled", true).html('<span class="spinner-border spinner-border-sm me-2"></span>Memperbarui...');

        $.ajax({
            url: `${BROKEN_URL}/${id}`,
            method: "PUT",
            contentType: "application/json",
            dataType: "json",
            data: JSON.stringify(payload),
            xhrFields: { withCredentials: true },
            headers: { Accept: "application/json" },
            success: function () {
                if (editModalEl) bootstrap.Modal.getOrCreateInstance(editModalEl).hide();
                loadBrokenAssets();

                Swal.fire({
                    icon: "success",
                    title: "Berhasil Diperbarui!",
                    text: "Data kerusakan aset dan penyesuaian stok berhasil disimpan.",
                    timer: 2000,
                    showConfirmButton: false
                });
            },
            error: function (xhr) {
                console.error("Update gagal:", xhr);
                let msg = xhr.responseJSON?.error || "Gagal memperbarui data kerusakan aset.";
                showModalAlert($editAlert, msg);
            },
            complete: function () {
                $updateButton.prop("disabled", false).html('<i class="bi bi-check-lg me-1"></i> Perbarui Kerusakan');
            }
        });
    });

    // Delete Broken Asset
    $(document).on("click", ".btn-delete-broken", function () {
        const id = $(this).attr("data-id");
        const code = $(this).attr("data-code");

        Swal.fire({
            title: "Hapus Pencatatan Kerusakan?",
            html: `Apakah Anda yakin ingin menghapus pencatatan <strong>${escapeHtml(code)}</strong>?<br><small class="text-success"><i class="bi bi-info-circle me-1"></i>Kuantitas aset yang dicatat rusak akan <strong>otomatis dikembalikan</strong> ke stok utama.</small>`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#dc3545",
            cancelButtonColor: "#6c757d",
            confirmButtonText: "Ya, Hapus & Kembalikan Stok",
            cancelButtonText: "Batal"
        }).then((result) => {
            if (result.isConfirmed) {
                $.ajax({
                    url: `${BROKEN_URL}/${id}`,
                    method: "DELETE",
                    dataType: "json",
                    xhrFields: { withCredentials: true },
                    headers: { Accept: "application/json" },
                    success: function () {
                        loadBrokenAssets();
                        Swal.fire({
                            icon: "success",
                            title: "Berhasil Dihapus!",
                            text: "Data kerusakan berhasil dihapus dan stok aset telah dipulihkan.",
                            timer: 2000,
                            showConfirmButton: false
                        });
                    },
                    error: function (xhr) {
                        console.error("Hapus gagal:", xhr);
                        let msg = xhr.responseJSON?.error || "Gagal menghapus data kerusakan aset.";
                        Swal.fire("Gagal", msg, "error");
                    }
                });
            }
        });
    });

    // Load initial data
    loadBrokenAssets();
});
