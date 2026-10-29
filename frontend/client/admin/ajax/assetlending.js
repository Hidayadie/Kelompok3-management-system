
$(function () {
    "use strict";

    // ==========================================
    // KONFIGURASI ENDPOINT API
    // ==========================================
    const API_BASE = window.APP_CONFIG.API_BASE_URL; //"http://localhost:8080",
    const FRONTEND_BASE_URL= window.APP_CONFIG.BASIC_URL; //"http://localhost:8088",
    
    const LENDING_URL = `${API_BASE}/api/private/asset-lending`;
    const USERS_URL = `${API_BASE}/api/private/users`;
    const ASSETS_URL = `${API_BASE}/api/private/assets`;

    const $table = $("#lendingTableBody");
    const $alert = $("#lendingAlert");
    const $formAlert = $("#lendingFormAlert");
    const $form = $("#lendingForm");

    const modalEl = document.getElementById("lendingModal");
const detailModalEl = document.getElementById("lendingDetailModal");

if (!modalEl) {
    console.error("Elemen #lendingModal tidak ditemukan.");
}

if (!detailModalEl) {
    console.error("Elemen #lendingDetailModal tidak ditemukan.");
}

if (!window.bootstrap || !window.bootstrap.Modal) {
    console.error("Bootstrap Modal belum dimuat.");
}

const lendingModal =
    modalEl && window.bootstrap?.Modal
        ? bootstrap.Modal.getOrCreateInstance(modalEl)
        : null;

const detailModal =
    detailModalEl && window.bootstrap?.Modal
        ? bootstrap.Modal.getOrCreateInstance(detailModalEl)
        : null;

    let lendingData = [];
    let users = [];
    let assets = [];

    // ==========================================
    // HELPER
    // ==========================================
    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (ch) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            }[ch];
        });
    }

    function showAlert($target, message, type = "danger") {
        $target
            .removeClass("d-none alert-success alert-danger alert-warning alert-info")
            .addClass(`alert-${type}`)
            .text(message);
    }

    function hideAlert($target) {
        $target.addClass("d-none").text("");
    }

    function getError(xhr, fallback) {
        const response = xhr.responseJSON || {};
        return response.message ||
            response.error ||
            fallback ||
            `Permintaan gagal (HTTP ${xhr.status}).`;
    }

    function ajaxOptions(extra = {}) {
        return {
            dataType: "json",
            xhrFields: {
                withCredentials: true
            },
            headers: {
                Accept: "application/json"
            },
            ...extra
        };
    }

    function unwrapList(response) {
        if (Array.isArray(response)) return response;
        if (Array.isArray(response?.data)) return response.data;
        if (Array.isArray(response?.items)) return response.items;
        if (Array.isArray(response?.users)) return response.users;
        if (Array.isArray(response?.assets)) return response.assets;
        return [];
    }

    // ==========================================
    // HELPER DATA USER
    // ==========================================
    function userID(user) {
        return user?.id ??
            user?.user_id ??
            user?.userID ??
            "";
    }

    function userName(user) {
        return user?.name ??
            user?.full_name ??
            user?.fullName ??
            user?.username ??
            user?.email ??
            `Pengguna #${userID(user)}`;
    }

    // ==========================================
    // HELPER DATA ASET
    // ==========================================
    function assetID(asset) {
        return asset?.asset_id ??
            asset?.AssetID ??
            asset?.id ??
            "";
    }

    function assetName(asset) {
        return asset?.asset_name ??
            asset?.nama_asset ??
            asset?.name ??
            asset?.Name ??
            asset?.name_asset ??
            `Aset #${assetID(asset)}`;
    }

    function assetLocation(asset) {
        const loc = asset?.location_detail ??
            asset?.Location ??
            asset?.location ??
            {};

        return loc?.name ??
            loc?.location_name ??
            loc?.locationName ??
            asset?.location_name ??
            asset?.locationName ??
            "";
    }

    // ==========================================
    // HELPER DATA PEMINJAMAN
    // ==========================================
    function itemUserName(item) {
        const user = item?.user_detail ?? item?.User ?? {};

        return user?.id || user?.user_id
            ? userName(user)
            : userName({
                id: item?.user_id,
                name: item?.user_name
            });
    }

    function itemAssetName(item) {
        const asset = item?.asset_detail ?? item?.Asset ?? {};

        return asset?.asset_id || asset?.AssetID || asset?.id
            ? assetName(asset)
            : assetName({
                asset_id: item?.asset_id,
                asset_name: item?.asset_name
            });
    }

    function itemLocation(item) {
        const asset = item?.asset_detail ?? item?.Asset ?? {};

        return assetLocation(asset) ||
            item?.location_name ||
            "-";
    }

    function itemID(item) {
        return item?.lending_id ??
            item?.LendingID ??
            item?.id;
    }

    function itemStatus(item) {
        return String(
            item?.lending_status ??
            item?.Status ??
            "dipinjam"
        ).trim().toLowerCase();
    }

    function normalizeStatus(status) {
        return String(status ?? "dipinjam")
            .trim()
            .toLowerCase();
    }

    function statusBadge(status) {
        const value = normalizeStatus(status);

        if (value === "dikembalikan") {
            return `<span class="status-pill status-returned">
                Dikembalikan
            </span>`;
        }

        if (value === "terlambat") {
            return `<span class="status-pill status-late">
                Terlambat
            </span>`;
        }

        return `<span class="status-pill status-active">
            Dipinjam
        </span>`;
    }

    function formatDate(value) {
        if (!value) return "-";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return escapeHtml(value);
        }

        return date.toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function toLocalDateTimeInput(value) {
        const date = value ? new Date(value) : new Date();

        if (Number.isNaN(date.getTime())) return "";

        const local = new Date(
            date.getTime() - date.getTimezoneOffset() * 60000
        );

        return local.toISOString().slice(0, 16);
    }

    function toISODateTime(value) {
        if (!value) return null;

        const date = new Date(value);

        return Number.isNaN(date.getTime())
            ? null
            : date.toISOString();
    }

    // ==========================================
    // READ: TAMPILKAN DATA PEMINJAMAN
    // ==========================================
    function renderTable() {
    const query = String($("#lendingSearch").val() || "")
        .trim()
        .toLowerCase();

    const statusFilter = $("#lendingStatusFilter").val();

    // Filter data berdasarkan pencarian dan status
    const filtered = lendingData.filter(function (item) {
        const status = itemStatus(item);

        const haystack = [
            itemID(item),
            itemUserName(item),
            itemAssetName(item),
            itemLocation(item),
            item?.qty_lending,
            status
        ].join(" ").toLowerCase();

        return (!query || haystack.includes(query)) &&
            (!statusFilter || status === statusFilter);
    });

    // Hancurkan instance DataTables sebelumnya
    if ($.fn.DataTable.isDataTable("#lendingTable")) {
        $("#lendingTable").DataTable().destroy();
    }

    // Kosongkan tabel
    $table.empty();

    // Render baris transaksi
    filtered.forEach(function (item, index) {
        const id = itemID(item);
        const status = itemStatus(item);

        const returnButton = status !== "dikembalikan"
            ? `
                <button type="button"
                    class="btn btn-sm btn-outline-success btn-return-lending"
                    data-id="${escapeHtml(id)}"
                    title="Proses pengembalian">
                    <i class="bi bi-check2-circle"></i>
                </button>
            `
            : "";

        const editButton = status !== "dikembalikan"
            ? `
                <button type="button"
                    class="btn btn-sm btn-outline-primary btn-edit-lending"
                    data-id="${escapeHtml(id)}"
                    title="Ubah">
                    <i class="bi bi-pencil-square"></i>
                </button>
            `
            : "";

        const row = `
            <tr>
                <td class="text-center">${index + 1}</td>

                <td>
                    <span class="text-primary fw-semibold">
                        #${escapeHtml(id)}
                    </span>
                </td>

                <td>${escapeHtml(itemUserName(item))}</td>

                <td>${escapeHtml(itemAssetName(item))}</td>

                <td>${escapeHtml(itemLocation(item))}</td>

                <td class="text-center">
                    ${escapeHtml(
                        item?.qty_lending ?? item?.QtyLending ?? 0
                    )}
                </td>

                <td>
                    ${formatDate(
                        item?.lending_date ?? item?.LendingDate
                    )}
                </td>

                <td>
                    ${formatDate(
                        item?.lending_return ?? item?.ReturnDate
                    )}
                </td>

                <td>${statusBadge(status)}</td>

                <td class="text-center">
                    <div class="btn-group btn-group-sm" role="group">

                        <button type="button"
                            class="btn btn-outline-secondary btn-detail-lending"
                            data-id="${escapeHtml(id)}"
                            title="Detail">
                            <i class="bi bi-eye"></i>
                        </button>

                        ${editButton}
                        ${returnButton}

                        <button type="button"
                            class="btn btn-outline-danger btn-delete-lending"
                            data-id="${escapeHtml(id)}"
                            title="Hapus">
                            <i class="bi bi-trash"></i>
                        </button>

                    </div>
                </td>
            </tr>
        `;

        $table.append(row);
    });

    // Perbarui jumlah transaksi
    $("#lendingCount").text(
        `Menampilkan ${filtered.length} dari ${lendingData.length} transaksi`
    );

    // Inisialisasi DataTables
    $("#lendingTable").DataTable({
        pageLength: 10,
        lengthMenu: [
            [10, 25, 50, 100],
            [10, 25, 50, 100]
        ],
        searching: true,
        ordering: true,
        paging: true,
        info: true,
        autoWidth: false,
        order: [],
        columnDefs: [
            {
                targets: [0, 9],
                orderable: false
            }
        ],
        language: {
            emptyTable: "Tidak ada data peminjaman.",
            zeroRecords: "Tidak ada transaksi yang cocok.",
            search: "Cari:",
            searchPlaceholder: "Cari transaksi peminjaman...",
            lengthMenu: "Tampilkan _MENU_ data",
            info: "Menampilkan _START_ sampai _END_ dari _TOTAL_ transaksi",
            infoEmpty: "Tidak ada transaksi",
            infoFiltered: "(difilter dari _MAX_ total transaksi)",
            paginate: {
                first: "Pertama",
                last: "Terakhir",
                next: "Berikutnya",
                previous: "Sebelumnya"
            }
        }
    });
}

    function loadLendings() {
        $table.html(`
            <tr>
                <td colspan="10" class="text-center py-4">
                    <span class="spinner-border spinner-border-sm text-primary me-2"></span>
                    Memuat data...
                </td>
            </tr>
        `);

        $.ajax(ajaxOptions({
            url: LENDING_URL,
            method: "GET",

            success: function (response) {
                lendingData = unwrapList(response);
                renderTable();
                hideAlert($alert);
            },

            error: function (xhr) {
                lendingData = [];

                const message = getError(
                    xhr,
                    "Gagal memuat data peminjaman."
                );

                $table.html(`
                    <tr>
                        <td colspan="10"
                            class="text-center text-danger py-4">
                            ${escapeHtml(message)}
                        </td>
                    </tr>
                `);

                $("#lendingCount").text("Total data: 0");
                showAlert($alert, message);
                console.error(xhr.status, xhr.responseText);
            }
        }));
    }

    // ==========================================
    // LOAD DROPDOWN USER
    // ==========================================
    function loadUsers(selectedID = "") {
        const $select = $("#lendingUserID");

        $select.html(`
            <option value="">Memuat pengguna...</option>
        `);

        return $.ajax(ajaxOptions({
            url: USERS_URL,
            method: "GET",

            success: function (response) {
                users = unwrapList(response);

                $select.html(
                    '<option value="">Pilih peminjam</option>' +
                    users.map(function (user) {
                        return `
                            <option value="${escapeHtml(userID(user))}">
                                ${escapeHtml(userName(user))}
                            </option>
                        `;
                    }).join("")
                );

                if (selectedID !== "" && selectedID != null) {
                    $select.val(String(selectedID));
                }

                if (!users.length) {
                    $select.html(`
                        <option value="">Data pengguna kosong</option>
                    `);
                }
            },

            error: function (xhr) {
                $select.html(`
                    <option value="">Gagal memuat pengguna</option>
                `);

                console.error(
                    "Gagal memuat pengguna:",
                    xhr.status,
                    xhr.responseText
                );

                showAlert(
                    $formAlert,
                    "Gagal memuat daftar pengguna. Periksa endpoint USERS_URL."
                );
            }
        }));
    }

    // ==========================================
    // LOAD DROPDOWN ASET
    // ==========================================
    function loadAssets(selectedID = "") {
        const $select = $("#lendingAssetID");

        $select.html(`
            <option value="">Memuat aset...</option>
        `);

        return $.ajax(ajaxOptions({
            url: ASSETS_URL,
            method: "GET",

            success: function (response) {
                assets = unwrapList(response);

                $select.html(
                    '<option value="">Pilih aset</option>' +
                    assets.map(function (asset) {
                        const id = assetID(asset);
                        const name = assetName(asset);
                        const location = assetLocation(asset);
                        const qty = asset?.qty_in ??
                            asset?.QtyIn ??
                            asset?.qty ??
                            "";

                        return `
                            <option value="${escapeHtml(id)}">
                                ${escapeHtml(name)}
                                ${location ? " — " + escapeHtml(location) : ""}
                                ${qty !== "" ? " (stok: " + escapeHtml(qty) + ")" : ""}
                            </option>
                        `;
                    }).join("")
                );

                if (selectedID !== "" && selectedID != null) {
                    $select.val(String(selectedID));
                }

                if (!assets.length) {
                    $select.html(`
                        <option value="">Data aset kosong</option>
                    `);
                }
            },

            error: function (xhr) {
                $select.html(`
                    <option value="">Gagal memuat aset</option>
                `);

                console.error(
                    "Gagal memuat aset:",
                    xhr.status,
                    xhr.responseText
                );

                showAlert(
                    $formAlert,
                    "Gagal memuat daftar aset. Periksa endpoint ASSETS_URL."
                );
            }
        }));
    }
    
    // ==========================================
    // RESET FORM
    // ==========================================
    function resetForm() {
        $form[0].reset();

        $("#lendingID").val("");
        $("#lendingQty").val(1);
        $("#lendingDate").val(toLocalDateTimeInput(new Date()));
        $("#lendingReturnDate").val("");
        $("#lendingStatus").val("dipinjam");

        $("#lendingModalTitle").text("Tambah Peminjaman");

        $("#btnSaveLending").html(`
            <i class="bi bi-save me-1"></i>Simpan
        `);

        hideAlert($formAlert);
    }

    // ==========================================
    // CREATE: TAMBAH PEMINJAMAN
    // ==========================================
   async function openAddModal() {
    console.log("Tombol Tambah Peminjaman diklik");

    if (!modalEl) {
        console.error("Modal #lendingModal tidak ditemukan.");
        return;
    }

    if (!window.bootstrap?.Modal) {
        console.error("Bootstrap Modal belum tersedia.");
        return;
    }

    resetForm();

    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();

    loadUsers();
    loadAssets();
}

    // ==========================================
    // FIND DATA PEMINJAMAN
    // ==========================================
    function findLending(id) {
        return lendingData.find(function (item) {
            return String(itemID(item)) === String(id);
        });
    }

    // ==========================================
    // UPDATE: BUKA MODAL EDIT
    // ==========================================
    async function openEditModal(id) {
        const item = findLending(id);

        if (!item) {
            showAlert(
                $alert,
                "Data peminjaman tidak ditemukan. Muat ulang daftar."
            );
            return;
        }

        if (itemStatus(item) === "dikembalikan") {
            Swal.fire(
                "Tidak dapat diubah",
                "Transaksi yang sudah dikembalikan tidak dapat diedit agar stok aset tetap konsisten.",
                "info"
            );
            return;
        }

        resetForm();

        $("#lendingID").val(id);
        $("#lendingModalTitle").text("Ubah Peminjaman");

        $("#btnSaveLending").html(`
            <i class="bi bi-save me-1"></i>Simpan Perubahan
        `);

        $("#lendingQty").val(
            item?.qty_lending ?? item?.QtyLending ?? 1
        );

        $("#lendingDate").val(
            toLocalDateTimeInput(
                item?.lending_date ?? item?.LendingDate
            )
        );

        $("#lendingReturnDate").val(
            item?.lending_return || item?.ReturnDate
                ? toLocalDateTimeInput(
                    item?.lending_return ?? item?.ReturnDate
                )
                : ""
        );

        const currentStatus = itemStatus(item);

        $("#lendingStatus").val(
            currentStatus === "terlambat"
                ? "terlambat"
                : "dipinjam"
        );

        lendingModal.show();

        await Promise.all([
            loadUsers(item?.user_id ?? item?.UserID),
            loadAssets(item?.asset_id ?? item?.AssetID)
        ]);
    }

    // ==========================================
    // DETAIL PEMINJAMAN
    // ==========================================
    function detailField(label, value) {
        return `
            <div class="col-md-6">
                <div class="border rounded p-3 h-100">
                    <div class="small text-muted mb-1">
                        ${escapeHtml(label)}
                    </div>
                    <div class="fw-semibold">${value || "-"}</div>
                </div>
            </div>
        `;
    }

    function openDetailModal(id) {
        const item = findLending(id);

        if (!item) return;

        $("#lendingDetailBody").html([
            detailField(
                "ID Peminjaman",
                escapeHtml(itemID(item))
            ),
            detailField(
                "Nama Peminjam",
                escapeHtml(itemUserName(item))
            ),
            detailField(
                "Nama Aset",
                escapeHtml(itemAssetName(item))
            ),
            detailField(
                "Lokasi",
                escapeHtml(itemLocation(item))
            ),
            detailField(
                "Jumlah Dipinjam",
                escapeHtml(item?.qty_lending ?? item?.QtyLending ?? 0)
            ),
            detailField(
                "Tanggal Pinjam",
                escapeHtml(formatDate(item?.lending_date ?? item?.LendingDate))
            ),
            detailField(
                "Tanggal Kembali",
                escapeHtml(formatDate(item?.lending_return ?? item?.ReturnDate))
            ),
            detailField(
                "Status",
                statusBadge(itemStatus(item))
            )
        ].join(""));

        detailModal.show();
    }

    // ==========================================
    // EVENT BUTTON DAN FILTER
    // ==========================================
    $(document).off("click.lendingAdd", "#btnAddLending").on("click.lendingAdd", "#btnAddLending", function (event) {
        event.preventDefault();
        openAddModal();
    });
    
    $("#refreshLendings").on("click", loadLendings);

    $("#lendingSearch").on("input", renderTable);

    $("#lendingStatusFilter").on("change", renderTable);

    // ==========================================
    // CREATE & UPDATE: SUBMIT FORM
    // ==========================================
    $form.on("submit", function (event) {
        event.preventDefault();

        hideAlert($formAlert);

        const id = $("#lendingID").val();

        const payload = {
            user_id: Number($("#lendingUserID").val()),
            asset_id: Number($("#lendingAssetID").val()),
            qty_lending: Number($("#lendingQty").val()),
            lending_date: toISODateTime($("#lendingDate").val()),
            lending_status: $("#lendingStatus").val()
        };

        if (
            !payload.user_id ||
            !payload.asset_id ||
            !Number.isInteger(payload.qty_lending) ||
            payload.qty_lending < 1 ||
            !payload.lending_date
        ) {
            showAlert(
                $formAlert,
                "Pilih peminjam dan aset, isi jumlah minimal 1, serta tanggal pinjam yang valid."
            );
            return;
        }

        const isEdit = Boolean(id);

        const url = isEdit
            ? `${LENDING_URL}/${encodeURIComponent(id)}`
            : LENDING_URL;

        const method = isEdit ? "PUT" : "POST";

        const $button = $("#btnSaveLending");

        $button
            .prop("disabled", true)
            .html(`
                <span class="spinner-border spinner-border-sm me-2"></span>
                Menyimpan...
            `);

        $.ajax(ajaxOptions({
            url: url,
            method: method,
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify(payload),

            success: function (response) {
                lendingModal.hide();

                Swal.fire({
                    icon: "success",
                    title: "Berhasil",
                    text: response.message ||
                        (isEdit
                            ? "Data peminjaman berhasil diperbarui."
                            : "Peminjaman berhasil ditambahkan."),
                    timer: 1800,
                    showConfirmButton: false
                });

                loadLendings();
            },

            error: function (xhr) {
                showAlert(
                    $formAlert,
                    getError(xhr, "Gagal menyimpan data peminjaman.")
                );

                console.error(
                    "Gagal menyimpan peminjaman:",
                    xhr.status,
                    xhr.responseText
                );
            },

            complete: function () {
                $button.prop("disabled", false).html(
                    isEdit
                        ? '<i class="bi bi-save me-1"></i>Simpan Perubahan'
                        : '<i class="bi bi-save me-1"></i>Simpan'
                );
            }
        }));
    });

    // ==========================================
    // DETAIL
    // ==========================================
    $(document).on("click", ".btn-detail-lending", function () {
        openDetailModal($(this).data("id"));
    });

    // ==========================================
    // EDIT
    // ==========================================
    $(document).on("click", ".btn-edit-lending", function () {
        openEditModal($(this).data("id"));
    });

    // ==========================================
    // RETURN: PENGEMBALIAN ASET
    // ==========================================
    $(document).on("click", ".btn-return-lending", async function () {
        const id = $(this).data("id");
        const item = findLending(id);

        if (!item) return;

        const result = await Swal.fire({
            title: "Proses pengembalian?",
            text: `Konfirmasi bahwa aset "${itemAssetName(item)}" telah dikembalikan.`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Ya, kembalikan",
            cancelButtonText: "Batal",
            confirmButtonColor: "#198754"
        });

        if (!result.isConfirmed) return;

        $.ajax(ajaxOptions({
            url: `${LENDING_URL}/${encodeURIComponent(id)}/return`,
            method: "PUT",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify({
                return_date: new Date().toISOString()
            }),

            success: function (response) {
                Swal.fire({
                    icon: "success",
                    title: "Berhasil",
                    text: response.message ||
                        "Aset berhasil dikembalikan.",
                    timer: 1800,
                    showConfirmButton: false
                });

                loadLendings();
            },

            error: function (xhr) {
                Swal.fire(
                    "Gagal",
                    getError(xhr, "Pengembalian aset gagal diproses."),
                    "error"
                );

                console.error(
                    "Gagal memproses pengembalian:",
                    xhr.status,
                    xhr.responseText
                );
            }
        }));
    });

    // ==========================================
    // DELETE: HAPUS PEMINJAMAN
    // ==========================================
    $(document).on("click", ".btn-delete-lending", async function () {
        const id = $(this).data("id");
        const item = findLending(id);

        const result = await Swal.fire({
            title: "Hapus transaksi?",
            html: `
                Transaksi peminjaman
                <strong>#${escapeHtml(id)}</strong>
                ${item
                    ? `untuk aset <strong>${escapeHtml(itemAssetName(item))}</strong>`
                    : ""}
                akan dihapus.
            `,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#dc3545",
            cancelButtonColor: "#6c757d",
            confirmButtonText: "Ya, hapus",
            cancelButtonText: "Batal"
        });

        if (!result.isConfirmed) return;

        $.ajax(ajaxOptions({
            url: `${LENDING_URL}/${encodeURIComponent(id)}`,
            method: "DELETE",

            success: function (response) {
                Swal.fire({
                    icon: "success",
                    title: "Terhapus",
                    text: response.message ||
                        "Transaksi berhasil dihapus.",
                    timer: 1800,
                    showConfirmButton: false
                });

                loadLendings();
            },

            error: function (xhr) {
                Swal.fire(
                    "Gagal menghapus",
                    getError(xhr, "Transaksi tidak dapat dihapus."),
                    "error"
                );

                console.error(
                    "Gagal menghapus peminjaman:",
                    xhr.status,
                    xhr.responseText
                );
            }
        }));
    });

    // ==========================================
    // LOAD DATA AWAL
    // ==========================================
    Promise.all([
        loadUsers(),
        loadAssets()
    ]);

    loadLendings();
});
