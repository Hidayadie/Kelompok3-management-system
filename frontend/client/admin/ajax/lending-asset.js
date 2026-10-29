/**
 * AJAX & Modal CRUD Peminjaman Aset - Sistem Inventaris Cerdas
 */

const API_BASE = "http://localhost:8080/api/private";
const LENDING_URL = `${API_BASE}/asset-lending`;
const ASSET_URL = `${API_BASE}/assets`;

$(document).ready(function () {
    const $tableBody = $("#lendingTableBody");
    const $alert = $("#lendingAlert");
    const $filter = $("#lendingFilter");
    const $statusFilter = $("#statusLendingFilter");
    const $refresh = $("#refreshLendings");
    const $count = $("#lendingCount");

    // Modals
    const addModalEl = document.getElementById("addLendingModal");
    const editModalEl = document.getElementById("editLendingModal");
    const detailModalEl = document.getElementById("detailLendingModal");

    // Forms
    const $addForm = $("#addLendingForm");
    const $editForm = $("#editLendingForm");
    const $addAlert = $("#addLendingAlert");
    const $editAlert = $("#editLendingAlert");
    const $saveButton = $("#saveLendingButton");
    const $updateButton = $("#updateLendingButton");

    let lendings = [];
    let availableAssets = [];

    // Init Select2
    if ($filter.length && $.fn.select2) {
        $filter.select2({
            theme: "bootstrap-5",
            width: "100%",
            placeholder: "Cari peminjaman...",
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

    function toInputDateTime(value) {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        const pad = (n) => String(n).padStart(2, "0");
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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

    function renderStatusBadge(status) {
        const s = (status || "").toLowerCase();
        if (s === "dipinjam") {
            return '<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle"><i class="bi bi-clock-history me-1"></i>Sedang Dipinjam</span>';
        } else if (s === "dikembalikan") {
            return '<span class="badge bg-success-subtle text-success border border-success-subtle"><i class="bi bi-check-circle me-1"></i>Dikembalikan</span>';
        } else if (s === "terlambat") {
            return '<span class="badge bg-danger-subtle text-danger border border-danger-subtle"><i class="bi bi-exclamation-octagon me-1"></i>Terlambat</span>';
        }
        return `<span class="badge bg-secondary">${escapeHtml(status || "-")}</span>`;
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
            $target.empty().append(new Option("Pilih aset yang ingin dipinjam...", ""));

            availableAssets.forEach(function (ast) {
                const text = `[${ast.code_asset || '-'}] ${ast.nama_asset || 'Tanpa nama'} (Tersedia: ${ast.qty_in ?? 0})`;
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
        const selectedStatus = $statusFilter.length ? $statusFilter.val() : "";

        let filtered = lendings;

        if (selectedId) {
            filtered = filtered.filter(item => String(item.lending_id) === String(selectedId));
        }

        if (selectedStatus) {
            filtered = filtered.filter(item => (item.lending_status || "").toLowerCase() === selectedStatus.toLowerCase());
        }

        $tableBody.empty();

        if (filtered.length === 0) {
            $tableBody.html(`
                <tr>
                    <td colspan="8" class="text-center text-muted py-4">
                        <i class="bi bi-inbox fs-2 d-block mb-2 text-secondary"></i>
                        Tidak ada data peminjaman ditemukan.
                    </td>
                </tr>
            `);
            $count.text("Total peminjaman: 0");
            return;
        }

        filtered.forEach(function (item, index) {
            const $row = $("<tr>");

            $("<td>").addClass("text-center").text(index + 1).appendTo($row);

            // User peminjam
            const userName = item.user_detail?.name ?? `User #${item.user_id}`;
            const userEmail = item.user_detail?.email ?? "";
            $("<td>").html(`
                <span class="fw-semibold text-dark">${escapeHtml(userName)}</span>
                ${userEmail ? `<br><small class="text-muted">${escapeHtml(userEmail)}</small>` : ''}
            `).appendTo($row);

            // Aset
            const assetName = item.asset_detail?.nama_asset ?? `Aset #${item.asset_id}`;
            const assetCode = item.asset_detail?.code_asset ? `[${item.asset_detail.code_asset}] ` : "";
            $("<td>").html(`<span class="fw-semibold text-primary">${assetCode}${escapeHtml(assetName)}</span>`).appendTo($row);

            // Qty
            $("<td>").addClass("text-center").html(`<span class="badge bg-light text-dark border px-2 py-1 fw-bold fs-6">${item.qty_lending ?? 1}</span>`).appendTo($row);

            // Tanggal Pinjam
            $("<td>").addClass("small text-muted").text(formatDate(item.lending_date)).appendTo($row);

            // Tanggal Kembali
            if (item.lending_return) {
                $("<td>").addClass("small text-muted").html(`<span class="text-success"><i class="bi bi-check2 me-1"></i>${formatDate(item.lending_return)}</span>`).appendTo($row);
            } else {
                $("<td>").addClass("small").html('<span class="badge bg-light text-secondary border">Belum Dikembalikan</span>').appendTo($row);
            }

            // Status
            $("<td>").html(renderStatusBadge(item.lending_status)).appendTo($row);

            // Kolom Aksi
            const $actionTd = $("<td>").addClass("text-center");
            const $actionGroup = $("<div>").addClass("btn-group btn-group-sm").attr("role", "group");

            // Tombol Cepat Pengembalian (jika masih dipinjam)
            if ((item.lending_status || "").toLowerCase() !== "dikembalikan") {
                $("<button>", {
                    type: "button",
                    class: "btn btn-outline-success btn-return-lending",
                    title: "Kembalikan Aset"
                })
                .attr("data-id", item.lending_id)
                .attr("data-name", assetName)
                .html('<i class="bi bi-arrow-return-left"></i>')
                .appendTo($actionGroup);
            }

            // Tombol Detail
            $("<button>", {
                type: "button",
                class: "btn btn-outline-info btn-detail-lending",
                title: "Detail Peminjaman"
            }).attr("data-id", item.lending_id).html('<i class="bi bi-eye"></i>').appendTo($actionGroup);

            // Tombol Ubah
            $("<button>", {
                type: "button",
                class: "btn btn-outline-warning btn-edit-lending",
                title: "Ubah Peminjaman"
            }).attr("data-id", item.lending_id).html('<i class="bi bi-pencil-square"></i>').appendTo($actionGroup);

            // Tombol Hapus
            $("<button>", {
                type: "button",
                class: "btn btn-outline-danger btn-delete-lending",
                title: "Hapus Peminjaman"
            })
            .attr("data-id", item.lending_id)
            .attr("data-name", assetName)
            .html('<i class="bi bi-trash"></i>').appendTo($actionGroup);

            $actionTd.append($actionGroup);
            $row.append($actionTd);
            $tableBody.append($row);
        });

        $count.text(`Menampilkan ${filtered.length} dari ${lendings.length} data peminjaman`);
    }

    // Load Lendings
    function loadLendings() {
        $refresh.prop("disabled", true);
        $tableBody.html(`
            <tr>
                <td colspan="8" class="text-center py-4">
                    <span class="spinner-border spinner-border-sm text-primary me-2"></span>
                    Memuat data peminjaman...
                </td>
            </tr>
        `);
        hideAlert();

        $.ajax({
            url: LENDING_URL,
            method: "GET",
            dataType: "json",
            xhrFields: { withCredentials: true },
            headers: { Accept: "application/json" },
            cache: false,
            success: function (response) {
                lendings = Array.isArray(response.data) ? response.data : [];

                if ($filter.length) {
                    const currentVal = $filter.val();
                    $filter.empty().append(new Option("Semua Peminjaman", "", true, true));
                    lendings.forEach(function (item) {
                        const uName = item.user_detail?.name || `User #${item.user_id}`;
                        const aName = item.asset_detail?.nama_asset || `Aset #${item.asset_id}`;
                        const label = `#${item.lending_id} - ${uName} (${aName})`;
                        $filter.append(new Option(label, String(item.lending_id)));
                    });
                    if (currentVal && lendings.some(l => String(l.lending_id) === String(currentVal))) {
                        $filter.val(currentVal).trigger("change.select2");
                    } else {
                        $filter.val("").trigger("change.select2");
                    }
                }

                renderTable();

                if (lendings.length === 0) {
                    showAlert("Belum ada transaksi peminjaman yang tercatat.", "info");
                }
            },
            error: function (xhr) {
                console.error("Gagal memuat peminjaman:", xhr);
                let message = "Gagal memuat data peminjaman aset.";
                if (xhr.status === 401 || xhr.status === 403) {
                    message = "Sesi login telah berakhir. Silakan login kembali.";
                }
                showAlert(message, "danger");
                $tableBody.html(`<tr><td colspan="8" class="text-center text-danger py-4">${message}</td></tr>`);
            },
            complete: function () {
                $refresh.prop("disabled", false);
            }
        });
    }

    $filter.on("change", renderTable);
    $statusFilter.on("change", renderTable);
    $refresh.on("click", loadLendings);

    // Modal Tambah
    $("#addLendingButton").on("click", function () {
        hideModalAlert($addAlert);
        $addForm[0].reset();
        $("#lendingQty").val("1");

        loadAssetOptions("#lendingAssetId");

        if (addModalEl) {
            bootstrap.Modal.getOrCreateInstance(addModalEl).show();
        }
    });

    $("#lendingAssetId").on("change", function () {
        const selectedId = $(this).val();
        const ast = availableAssets.find(a => String(a.asset_id) === String(selectedId));
        if (ast) {
            $("#lendingStockHelp").html(`<span class="text-success fw-semibold"><i class="bi bi-check-circle me-1"></i>Stok tersedia saat ini: <strong>${ast.qty_in ?? 0} unit</strong></span>`);
            $("#lendingQty").attr("max", ast.qty_in ?? 1);
        } else {
            $("#lendingStockHelp").text("Pilih aset untuk melihat sisa stok.");
        }
    });

    // Submit Tambah
    $addForm.on("submit", function (e) {
        e.preventDefault();
        hideModalAlert($addAlert);

        const payload = {
            user_id: Number($("#lendingUserId").val()),
            asset_id: Number($("#lendingAssetId").val()),
            qty_lending: Number($("#lendingQty").val())
        };

        const rawDate = $("#lendingDate").val();
        if (rawDate) {
            payload.lending_date = new Date(rawDate).toISOString();
        }

        if (!payload.user_id || payload.user_id <= 0) {
            showModalAlert($addAlert, "ID User peminjam harus berupa angka positif.");
            return;
        }
        if (!payload.asset_id) {
            showModalAlert($addAlert, "Pilih aset yang ingin dipinjam.");
            return;
        }
        if (!payload.qty_lending || payload.qty_lending <= 0) {
            showModalAlert($addAlert, "Jumlah pinjam minimal 1 unit.");
            return;
        }

        $saveButton.prop("disabled", true).html('<span class="spinner-border spinner-border-sm me-2"></span>Menyimpan...');

        $.ajax({
            url: LENDING_URL,
            method: "POST",
            contentType: "application/json",
            dataType: "json",
            data: JSON.stringify(payload),
            xhrFields: { withCredentials: true },
            headers: { Accept: "application/json" },
            success: function () {
                if (addModalEl) bootstrap.Modal.getOrCreateInstance(addModalEl).hide();
                $addForm[0].reset();
                loadLendings();

                Swal.fire({
                    icon: "success",
                    title: "Peminjaman Berhasil!",
                    text: "Transaksi peminjaman disimpan dan stok aset otomatis dikurangi.",
                    timer: 2000,
                    showConfirmButton: false
                });
            },
            error: function (xhr) {
                console.error("Simpan gagal:", xhr);
                let msg = xhr.responseJSON?.error || "Gagal mencatat peminjaman aset.";
                showModalAlert($addAlert, msg);
            },
            complete: function () {
                $saveButton.prop("disabled", false).html('<i class="bi bi-save me-1"></i> Simpan Peminjaman');
            }
        });
    });

    // Quick Return Action
    $(document).on("click", ".btn-return-lending", function () {
        const id = $(this).attr("data-id");
        const name = $(this).attr("data-name");

        Swal.fire({
            title: "Pengembalian Aset?",
            html: `Konfirmasi pengembalian aset <strong>${escapeHtml(name)}</strong>?<br><small class="text-success"><i class="bi bi-arrow-clockwise me-1"></i>Kuantitas aset akan <strong>otomatis ditambahkan kembali</strong> ke stok inventaris.</small>`,
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#198754",
            cancelButtonColor: "#6c757d",
            confirmButtonText: "Ya, Kembalikan Aset",
            cancelButtonText: "Batal"
        }).then((result) => {
            if (result.isConfirmed) {
                $.ajax({
                    url: `${LENDING_URL}/${id}/return`,
                    method: "PUT",
                    contentType: "application/json",
                    dataType: "json",
                    data: JSON.stringify({}),
                    xhrFields: { withCredentials: true },
                    headers: { Accept: "application/json" },
                    success: function () {
                        loadLendings();
                        Swal.fire({
                            icon: "success",
                            title: "Aset Berhasil Dikembalikan!",
                            text: "Status peminjaman diperbarui dan stok aset telah dipulihkan.",
                            timer: 2000,
                            showConfirmButton: false
                        });
                    },
                    error: function (xhr) {
                        console.error("Pengembalian gagal:", xhr);
                        let msg = xhr.responseJSON?.error || "Gagal memproses pengembalian aset.";
                        Swal.fire("Gagal", msg, "error");
                    }
                });
            }
        });
    });

    // Detail Modal
    $(document).on("click", ".btn-detail-lending", function () {
        const id = $(this).attr("data-id");
        const item = lendings.find(l => String(l.lending_id) === String(id));
        if (!item) return;

        $("#detailUserName").text(item.user_detail?.name ?? `User ID #${item.user_id}`);
        $("#detailUserEmail").text(item.user_detail?.email ? `Email: ${item.user_detail.email}` : "");
        $("#detailAssetName").text(item.asset_detail?.nama_asset ?? `Aset ID #${item.asset_id}`);
        $("#detailAssetCode").text(`Kode Aset: ${item.asset_detail?.code_asset ?? '-'}`);
        $("#detailQtyLending").text(`${item.qty_lending ?? 1} unit`);
        $("#detailStatusLending").html(renderStatusBadge(item.lending_status));
        $("#detailLendingDate").text(formatDate(item.lending_date));
        $("#detailReturnDate").text(item.lending_return ? formatDate(item.lending_return) : "Belum Dikembalikan");

        $("#btnDetailToEditLending").attr("data-id", item.lending_id);

        if (detailModalEl) bootstrap.Modal.getOrCreateInstance(detailModalEl).show();
    });

    $("#btnDetailToEditLending").on("click", function () {
        const id = $(this).attr("data-id");
        if (detailModalEl) bootstrap.Modal.getOrCreateInstance(detailModalEl).hide();
        openEditModal(id);
    });

    $(document).on("click", ".btn-edit-lending", function () {
        const id = $(this).attr("data-id");
        openEditModal(id);
    });

    function openEditModal(id) {
        const item = lendings.find(l => String(l.lending_id) === String(id));
        if (!item) return;

        hideModalAlert($editAlert);
        $("#editLendingId").val(item.lending_id);
        $("#editLendingUserId").val(item.user_id);
        $("#editLendingQty").val(item.qty_lending ?? 1);
        $("#editLendingStatus").val((item.lending_status || "dipinjam").toLowerCase());
        $("#editLendingDate").val(toInputDateTime(item.lending_date));
        $("#editLendingReturnDate").val(toInputDateTime(item.lending_return));

        loadAssetOptions("#editLendingAssetId", item.asset_id);

        if (editModalEl) bootstrap.Modal.getOrCreateInstance(editModalEl).show();
    }

    // Submit Edit
    $editForm.on("submit", function (e) {
        e.preventDefault();
        hideModalAlert($editAlert);

        const id = $("#editLendingId").val();
        const payload = {
            user_id: Number($("#editLendingUserId").val()),
            asset_id: Number($("#editLendingAssetId").val()),
            qty_lending: Number($("#editLendingQty").val()),
            lending_status: $("#editLendingStatus").val(),
            lending_date: new Date($("#editLendingDate").val()).toISOString()
        };

        const rawReturn = $("#editLendingReturnDate").val();
        if (rawReturn) {
            payload.lending_return = new Date(rawReturn).toISOString();
        }

        $updateButton.prop("disabled", true).html('<span class="spinner-border spinner-border-sm me-2"></span>Memperbarui...');

        $.ajax({
            url: `${LENDING_URL}/${id}`,
            method: "PUT",
            contentType: "application/json",
            dataType: "json",
            data: JSON.stringify(payload),
            xhrFields: { withCredentials: true },
            headers: { Accept: "application/json" },
            success: function () {
                if (editModalEl) bootstrap.Modal.getOrCreateInstance(editModalEl).hide();
                loadLendings();

                Swal.fire({
                    icon: "success",
                    title: "Berhasil Diperbarui!",
                    text: "Data transaksi peminjaman berhasil diperbarui.",
                    timer: 2000,
                    showConfirmButton: false
                });
            },
            error: function (xhr) {
                console.error("Update gagal:", xhr);
                let msg = xhr.responseJSON?.error || "Gagal memperbarui data peminjaman.";
                showModalAlert($editAlert, msg);
            },
            complete: function () {
                $updateButton.prop("disabled", false).html('<i class="bi bi-check-lg me-1"></i> Perbarui Peminjaman');
            }
        });
    });

    // Delete
    $(document).on("click", ".btn-delete-lending", function () {
        const id = $(this).attr("data-id");
        const name = $(this).attr("data-name");

        Swal.fire({
            title: "Hapus Peminjaman?",
            html: `Apakah Anda yakin ingin menghapus data peminjaman <strong>${escapeHtml(name)}</strong>?<br><small class="text-muted">Jika aset belum dikembalikan, kuantitas stok akan otomatis dipulihkan.</small>`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#dc3545",
            cancelButtonColor: "#6c757d",
            confirmButtonText: "Ya, Hapus Data",
            cancelButtonText: "Batal"
        }).then((result) => {
            if (result.isConfirmed) {
                $.ajax({
                    url: `${LENDING_URL}/${id}`,
                    method: "DELETE",
                    dataType: "json",
                    xhrFields: { withCredentials: true },
                    headers: { Accept: "application/json" },
                    success: function () {
                        loadLendings();
                        Swal.fire({
                            icon: "success",
                            title: "Berhasil Dihapus!",
                            text: "Data peminjaman telah dihapus.",
                            timer: 2000,
                            showConfirmButton: false
                        });
                    },
                    error: function (xhr) {
                        console.error("Hapus gagal:", xhr);
                        let msg = xhr.responseJSON?.error || "Gagal menghapus data peminjaman.";
                        Swal.fire("Gagal", msg, "error");
                    }
                });
            }
        });
    });

    // Load initial
    loadLendings();
});
