
/**
 * CRUD Keluhan - Sistem Inventaris Cerdas
 * jQuery AJAX + Bootstrap 5 + SweetAlert2
 *
 * Fitur:
 * - Mengambil user login melalui GET /api/me
 * - Menampilkan keluhan milik pengguna login
 * - Menampilkan nama aset dan lokasi
 * - Pencarian dan filter status
 * - Filter keluhan yang belum diperbaiki
 * - Tambah keluhan dengan gambar
 * - Detail, edit, hapus, dan status perbaikan
 * - Menghentikan loading ketika request selesai
 */

"use strict";

// ======================================================
// KONFIGURASI API
// ======================================================

const API_BASE = window.APP_CONFIG?.API_BASE_URL;

if (!API_BASE) {
    console.error(
        "API_BASE_URL belum dikonfigurasi. Periksa config.js."
    );
}

const COMPLAINT_URL =
    `${API_BASE}/api/private/complaints`;

const COMPLAINT_BY_USER_URL =
    `${API_BASE}/api/private/complaintsByUserID`;

const ASSET_URL =
    `${API_BASE}/api/private/assets`;

const ME_URL =
    `${API_BASE}/api/me`;

const IMAGE_BASE_URL = API_BASE;

// ======================================================
// APLIKASI
// ======================================================

$(document).ready(function () {
    const $tableBody = $("#complaintTableBody");
    const $alert = $("#complaintAlert");
    const $search = $("#complaintSearch");
    const $statusFilter = $("#statusFilter");
    const $unfixedFilter = $("#unfixedFilter");
    const $refresh = $("#refreshComplaints");
    const $count = $("#complaintCount");

    const $addForm = $("#addComplaintForm");
    const $editForm = $("#editComplaintForm");

    const $addAlert = $("#addComplaintAlert");
    const $editAlert = $("#editComplaintAlert");

    const $saveButton = $("#saveComplaintButton");
    const $updateButton = $("#updateComplaintButton");

    const addModalEl =
        document.getElementById("addComplaintModal");

    const editModalEl =
        document.getElementById("editComplaintModal");

    const detailModalEl =
        document.getElementById("detailComplaintModal");

    let complaints = [];
    let currentUserID = null;
    let assetsCache = [];
    let assetOptionsLoaded = false;
    let isLoadingComplaints = false;

    // ==================================================
    // AJAX HELPER
    // ==================================================

    function ajaxOptions(options) {
        options.xhrFields = {
            withCredentials: true
        };

        options.headers = {
            Accept: "application/json",
            ...(options.headers || {})
        };

        // Mencegah spinner menunggu tanpa batas.
        if (options.timeout === undefined) {
            options.timeout = 15000;
        }

        return options;
    }

    function apiErrorMessage(xhr, fallback) {
        const response = xhr.responseJSON || {};

        if (response.message) {
            return response.message;
        }

        if (response.error) {
            return response.error;
        }

        if (xhr.status === 401 || xhr.status === 403) {
            return "Sesi login berakhir atau akses ditolak. Silakan login kembali.";
        }

        if (xhr.status === 404) {
            return "Endpoint atau data tidak ditemukan.";
        }

        if (xhr.status === 0) {
            return "Tidak dapat terhubung ke server API. Periksa server dan konfigurasi CORS.";
        }

        if (xhr.statusText === "timeout") {
            return "Permintaan ke server terlalu lama. Silakan coba lagi.";
        }

        return `${fallback} (HTTP ${xhr.status || "tidak diketahui"}).`;
    }

    function extractPayload(response) {
        if (response && response.data !== undefined) {
            return response.data;
        }

        if (response && response.user !== undefined) {
            return response.user;
        }

        return response;
    }

    // ==================================================
    // HELPER TAMPILAN
    // ==================================================

    function escapeHtml(value) {
        if (value === null || value === undefined) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function showAlert(message, type = "danger") {
        $alert
            .removeClass(
                "d-none alert-success alert-danger alert-warning alert-info"
            )
            .addClass(`alert-${type}`)
            .text(message);
    }

    function hideAlert() {
        $alert
            .addClass("d-none")
            .removeClass(
                "alert-success alert-danger alert-warning alert-info"
            )
            .text("");
    }

    function showModalAlert(
        $target,
        message,
        type = "danger"
    ) {
        $target
            .removeClass(
                "d-none alert-success alert-danger alert-warning alert-info"
            )
            .addClass(`alert-${type}`)
            .text(message);
    }

    function hideModalAlert($target) {
        $target
            .addClass("d-none")
            .removeClass(
                "alert-success alert-danger alert-warning alert-info"
            )
            .text("");
    }

    function formatDate(value) {
        if (!value) return "-";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Jakarta"
        });
    }

    function resolveImageURL(path) {
        if (!path) return "";

        if (/^https?:\/\//i.test(path)) {
            return path;
        }

        const normalized = String(path).startsWith("/")
            ? path
            : `/${path}`;

        return `${IMAGE_BASE_URL}${normalized}`;
    }

    function isFixed(item) {
        return (
            item.is_fixed === true ||
            item.is_fixed === "true" ||
            item.isFixed === true ||
            item.isFixed === "true"
        );
    }

    function normalizedStatus(item) {
        return String(item.status || "low").toLowerCase();
    }

    function renderStatusBadge(status) {
        const value = String(status || "low").toLowerCase();

        const labels = {
            low: "Low",
            medium: "Medium",
            high: "High",
            critical: "Critical",
            pending: "Menunggu",
            in_progress: "Diproses",
            resolved: "Selesai",
            completed: "Selesai",
            open: "Terbuka",
            closed: "Ditutup"
        };

        const classes = {
            low: "bg-success",
            medium: "bg-info text-dark",
            high: "bg-warning text-dark",
            critical: "bg-danger",
            pending: "bg-secondary",
            in_progress: "bg-primary",
            resolved: "bg-success",
            completed: "bg-success",
            open: "bg-primary",
            closed: "bg-secondary"
        };

        return `
            <span class="badge ${classes[value] || "bg-secondary"}">
                ${escapeHtml(labels[value] || value)}
            </span>
        `;
    }

    function renderFixedBadge(value) {
        if (value === true || value === "true") {
            return `
                <span class="badge bg-success">
                    Sudah Diperbaiki
                </span>
            `;
        }

        return `
            <span class="badge bg-warning text-dark">
                Belum Diperbaiki
            </span>
        `;
    }

    // ==================================================
    // IDENTITAS PENGGUNA
    // ==================================================

    function findUserID(value) {
        if (!value || typeof value !== "object") {
            return null;
        }

        const id =
            value.userID ??
            value.user_id ??
            value.userId ??
            value.id ??
            value.sub;

        if (
            id !== undefined &&
            id !== null &&
            String(id).trim() !== ""
        ) {
            return String(id);
        }

        if (value.data) {
            const result = findUserID(value.data);
            if (result) return result;
        }

        if (value.user) {
            const result = findUserID(value.user);
            if (result) return result;
        }

        if (value.claims) {
            const result = findUserID(value.claims);
            if (result) return result;
        }

        return null;
    }

    function loadCurrentUser(onSuccess) {
        currentUserID = null;

        $("#addUserID").val("");
        $("#editUserID").val("");

        $.ajax(ajaxOptions({
            url: ME_URL,
            method: "GET",
            dataType: "json",

            success: function (response) {
                currentUserID =
                    findUserID(extractPayload(response)) ||
                    findUserID(response);

                if (!currentUserID) {
                    console.error(
                        "ID pengguna tidak ditemukan:",
                        response
                    );

                    $tableBody.html(`
                        <tr>
                            <td colspan="8"
                                class="text-center text-danger py-4">
                                Identitas pengguna tidak ditemukan.
                            </td>
                        </tr>
                    `);

                    $count.text("Menampilkan 0 keluhan");

                    showAlert(
                        "ID pengguna tidak ditemukan pada respons /api/me."
                    );

                    return;
                }

                $("#addUserID").val(currentUserID);
                $("#editUserID").val(currentUserID);

                console.log(
                    "ID pengguna yang login:",
                    currentUserID
                );

                // Penting: panggil callback setelah user ID tersedia.
                if (typeof onSuccess === "function") {
                    onSuccess();
                }
            },

            error: function (xhr, status, error) {
                currentUserID = null;

                console.error("Gagal mengambil identitas:", {
                    httpStatus: xhr.status,
                    status: status,
                    error: error,
                    response: xhr.responseText
                });

                $tableBody.html(`
                    <tr>
                        <td colspan="8"
                            class="text-center text-danger py-4">
                            Gagal mengambil identitas pengguna.
                            Silakan login kembali.
                        </td>
                    </tr>
                `);

                $count.text("Menampilkan 0 keluhan");

                showAlert(
                    apiErrorMessage(
                        xhr,
                        "Gagal mengambil identitas pengguna"
                    )
                );
            }
        }));
    }

    // ==================================================
    // DATA ASET
    // ==================================================

    function getAssetID(asset) {
        return (
            asset.asset_id ??
            asset.assetID ??
            asset.assetId ??
            asset.id ??
            ""
        );
    }

    function getAssetName(asset) {
        return (
            asset.nama_asset ??
            asset.namaAsset ??
            asset.asset_name ??
            asset.assetName ??
            asset.name ??
            asset.title ??
            "-"
        );
    }

    function getLocationName(asset) {
        const location =
            asset.location_detail ??
            asset.locationDetail ??
            asset.location;

        if (location && typeof location === "object") {
            return (
                location.name ??
                location.location_name ??
                location.locationName ??
                "-"
            );
        }

        return (
            asset.location_name ??
            asset.locationName ??
            asset.location_detail_name ??
            "-"
        );
    }

    function findAsset(assetID) {
        if (assetID === null || assetID === undefined) {
            return null;
        }

        return assetsCache.find(function (asset) {
            return String(getAssetID(asset)) === String(assetID);
        }) || null;
    }

    function loadAssetOptions(selectedAssetID = null) {
        const $addSelect = $("#addAssetID");
        const $editSelect = $("#editAssetID");

        assetOptionsLoaded = false;

        $addSelect.empty().append(
            new Option("Memuat daftar aset...", "")
        );

        $editSelect.empty().append(
            new Option("Memuat daftar aset...", "")
        );

        $.ajax(ajaxOptions({
            url: ASSET_URL,
            method: "GET",
            dataType: "json",

            success: function (response) {
                console.log("Respons API aset:", response);

                let assets = extractPayload(response);

                if (!Array.isArray(assets)) {
                    if (Array.isArray(response?.assets)) {
                        assets = response.assets;
                    } else if (
                        Array.isArray(response?.data?.data)
                    ) {
                        assets = response.data.data;
                    } else {
                        assets = [];
                    }
                }

                // Simpan data untuk nama aset dan lokasi.
                assetsCache = assets;

                $addSelect.empty().append(
                    new Option("Pilih Aset", "")
                );

                $editSelect.empty().append(
                    new Option("Pilih Aset", "")
                );

                let validCount = 0;

                assets.forEach(function (asset) {
                    const id = getAssetID(asset);

                    if (
                        id === null ||
                        id === undefined ||
                        String(id).trim() === ""
                    ) {
                        console.warn(
                            "Aset tanpa ID dilewati:",
                            asset
                        );
                        return;
                    }

                    const code =
                        asset.code_asset ??
                        asset.code ??
                        asset.asset_code ??
                        "";

                    const name = getAssetName(asset);

                    const label = [code, name]
                        .filter(Boolean)
                        .join(" - ") || `Aset ${id}`;

                    $addSelect.append(
                        new Option(label, String(id))
                    );

                    $editSelect.append(
                        new Option(label, String(id))
                    );

                    validCount++;
                });

                assetOptionsLoaded = validCount > 0;

                if (!assetOptionsLoaded) {
                    $addSelect.append(
                        new Option("Tidak ada aset tersedia", "")
                    );

                    $editSelect.append(
                        new Option("Tidak ada aset tersedia", "")
                    );
                }

                if (selectedAssetID != null) {
                    $editSelect.val(String(selectedAssetID));
                }

                console.log("Jumlah aset valid:", validCount);
                console.log(
                    "Status assetOptionsLoaded:",
                    assetOptionsLoaded
                );

                // Jika tabel sudah dimuat, perbarui nama aset/lokasi.
                if (complaints.length > 0) {
                    renderTable();
                }
            },

            error: function (xhr, status, error) {
                assetsCache = [];
                assetOptionsLoaded = false;

                $addSelect.empty().append(
                    new Option("Gagal memuat aset", "")
                );

                $editSelect.empty().append(
                    new Option("Gagal memuat aset", "")
                );

                console.error("Gagal memuat aset:", {
                    httpStatus: xhr.status,
                    status: status,
                    error: error,
                    response: xhr.responseText
                });
            }
        }));
    }

    // ==================================================
    // RENDER TABEL KELUHAN
    // ==================================================

    function renderTable() {
        const keyword = String($search.val() || "")
            .trim()
            .toLowerCase();

        const selectedStatus = String(
            $statusFilter.val() || ""
        ).toLowerCase();

        const onlyUnfixed = $unfixedFilter.is(":checked");

        const filtered = complaints.filter(function (item) {
            const assetID =
                item.assetID ??
                item.asset_id ??
                item.assetId;

            const asset = findAsset(assetID);

            const assetName = asset
                ? getAssetName(asset)
                : "-";

            const locationName = asset
                ? getLocationName(asset)
                : "-";

            const haystack = [
                item.code,
                item.title,
                item.description,
                item.note,
                assetName,
                locationName
            ]
                .map(value => String(value ?? ""))
                .join(" ")
                .toLowerCase();

            const matchesKeyword =
                !keyword || haystack.includes(keyword);

            const matchesStatus =
                !selectedStatus ||
                normalizedStatus(item) === selectedStatus;

            const matchesFixed =
                !onlyUnfixed || !isFixed(item);

            return (
                matchesKeyword &&
                matchesStatus &&
                matchesFixed
            );
        });

        $tableBody.empty();

        if (filtered.length === 0) {
            $tableBody.html(`
                <tr>
                    <td colspan="8"
                        class="text-center text-muted py-4">
                        <i class="bi bi-inbox fs-2 d-block mb-2"></i>
                        Tidak ada keluhan ditemukan.
                    </td>
                </tr>
            `);

            $count.text(
                `Menampilkan 0 dari ${complaints.length} keluhan`
            );

            return;
        }

        filtered.forEach(function (item) {
            const assetID =
                item.assetID ??
                item.asset_id ??
                item.assetId;

            const asset = findAsset(assetID);

            const assetName = asset
                ? getAssetName(asset)
                : "-";

            const locationName = asset
                ? getLocationName(asset)
                : "-";

            const $row = $("<tr>");

            $("<td>")
                .text(item.code || "-")
                .appendTo($row);

            $("<td>")
                .text(item.title || "-")
                .appendTo($row);

            $("<td>")
                .text(assetName)
                .appendTo($row);

            $("<td>")
                .text(locationName)
                .appendTo($row);

            $("<td>")
                .text(item.description || "-")
                .appendTo($row);

            $("<td>")
                .html(renderStatusBadge(normalizedStatus(item)))
                .appendTo($row);

            $("<td>")
                .text(item.note || "-")
                .appendTo($row);

            $("<td>")
                .html(renderFixedBadge(isFixed(item)))
                .appendTo($row);

            $tableBody.append($row);
        });

        $count.text(
            `Menampilkan ${filtered.length} dari ${complaints.length} keluhan`
        );
    }

    // ==================================================
    // MEMUAT KELUHAN
    // ==================================================

    function loadComplaints() {
        if (isLoadingComplaints) {
            return;
        }

        if (!currentUserID) {
            $tableBody.html(`
                <tr>
                    <td colspan="8"
                        class="text-center text-danger py-4">
                        Identitas pengguna belum tersedia.
                    </td>
                </tr>
            `);

            $count.text("Menampilkan 0 keluhan");

            showAlert(
                "Identitas pengguna belum tersedia. Silakan login kembali."
            );

            return;
        }

        isLoadingComplaints = true;

        $refresh.prop("disabled", true);
        hideAlert();

        $tableBody.html(`
            <tr>
                <td colspan="8" class="text-center py-4">
                    <span class="spinner-border spinner-border-sm text-primary me-2"></span>
                    Memuat data keluhan...
                </td>
            </tr>
        `);

        $.ajax(ajaxOptions({
            url: COMPLAINT_BY_USER_URL,
            method: "GET",
            dataType: "json",
            cache: false,
            data: {
                userID: currentUserID
            },

            success: function (response) {
                console.log("Respons API keluhan:", response);

                const data = extractPayload(response);

                if (!Array.isArray(data)) {
                    complaints = [];

                    console.error(
                        "Format respons API keluhan tidak valid:",
                        response
                    );

                    $tableBody.html(`
                        <tr>
                            <td colspan="8"
                                class="text-center text-danger py-4">
                                Format respons API keluhan tidak valid.
                            </td>
                        </tr>
                    `);

                    $count.text("Menampilkan 0 keluhan");

                    showAlert(
                        "Respons API keluhan bukan berupa daftar data."
                    );

                    return;
                }

                // Filter keamanan tambahan di sisi frontend.
                complaints = data.filter(function (item) {
                    const ownerID =
                        item.userID ??
                        item.user_id ??
                        item.userId;

                    return (
                        ownerID != null &&
                        String(ownerID) === String(currentUserID)
                    );
                });

                renderTable();

                if (complaints.length === 0) {
                    showAlert(
                        "Belum ada keluhan milik Anda.",
                        "info"
                    );
                } else {
                    hideAlert();
                }

                console.log(
                    "Jumlah keluhan pengguna:",
                    complaints.length
                );
            },

            error: function (xhr, status, error) {
                complaints = [];

                const message = apiErrorMessage(
                    xhr,
                    "Gagal memuat data keluhan"
                );

                console.error("Gagal memuat keluhan:", {
                    httpStatus: xhr.status,
                    status: status,
                    error: error,
                    response: xhr.responseText
                });

                $tableBody.html(`
                    <tr>
                        <td colspan="8"
                            class="text-center text-danger py-4">
                            ${escapeHtml(message)}
                        </td>
                    </tr>
                `);

                $count.text("Menampilkan 0 keluhan");
                showAlert(message);
            },

            complete: function () {
                // Bagian penting: loading selalu dihentikan.
                isLoadingComplaints = false;
                $refresh.prop("disabled", false);
            }
        }));
    }

    // ==================================================
    // EVENT PENCARIAN, FILTER, DAN REFRESH
    // ==================================================

    $search.on("input", renderTable);
    $statusFilter.on("change", renderTable);
    $unfixedFilter.on("change", renderTable);

    $refresh.on("click", function () {
        loadComplaints();
    });

    // ==================================================
    // TAMBAH KELUHAN
    // ==================================================

    $("#addComplaintButton").on("click", function () {
        if ($addForm.length && $addForm[0]) {
            $addForm[0].reset();
        }

        $("#addPriority").val("0.3");
        $("#addStatus").val("low");

        hideModalAlert($addAlert);

        $("#addImagePreview")
            .attr("src", "");

        $("#addImagePreviewWrapper")
            .addClass("d-none");

        loadCurrentUser();
        loadAssetOptions();

        if (addModalEl) {
            bootstrap.Modal
                .getOrCreateInstance(addModalEl)
                .show();
        }
    });

    $("#addImage").on("change", function () {
        const file = this.files?.[0];

        $("#addImagePreview")
            .attr("src", "");

        $("#addImagePreviewWrapper")
            .addClass("d-none");

        if (!file) return;

        if (!validateImage(file, $addAlert, this)) {
            return;
        }

        const reader = new FileReader();

        reader.onload = function (event) {
            $("#addImagePreview")
                .attr("src", event.target.result);

            $("#addImagePreviewWrapper")
                .removeClass("d-none");
        };

        reader.onerror = function () {
            showModalAlert(
                $addAlert,
                "Gambar gagal dibaca."
            );
        };

        reader.readAsDataURL(file);
    });

    function validateImage(file, $target, inputElement) {
        if (!file) return true;

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/gif"
        ];

        if (!allowedTypes.includes(file.type)) {
            if (inputElement) {
                inputElement.value = "";
            }

            showModalAlert(
                $target,
                "Format gambar harus JPG, PNG, atau GIF."
            );

            return false;
        }

        if (file.size > 5 * 1024 * 1024) {
            if (inputElement) {
                inputElement.value = "";
            }

            showModalAlert(
                $target,
                "Ukuran gambar maksimal 5 MB."
            );

            return false;
        }

        return true;
    }

    $addForm.on("submit", function (event) {
        event.preventDefault();

        hideModalAlert($addAlert);

        const userID = String(
            currentUserID || $("#addUserID").val() || ""
        ).trim();

        const assetID = String(
            $("#addAssetID").val() || ""
        ).trim();

        const title = String(
            $("#addTitle").val() || ""
        ).trim();

        const description = String(
            $("#addDescription").val() || ""
        ).trim();

        const priority = Number(
            $("#addPriority").val() || 0
        );

        const status = $("#addStatus").val() || "low";

        const note = String(
            $("#addNote").val() || ""
        ).trim();

        const imageFile =
            $("#addImage")[0]?.files?.[0];

        if (!userID) {
            showModalAlert(
                $addAlert,
                "Identitas pengguna belum tersedia. Silakan login kembali."
            );
            return;
        }

        if (!assetOptionsLoaded || !assetID) {
            showModalAlert(
                $addAlert,
                "Pilih aset setelah daftar aset berhasil dimuat."
            );
            return;
        }

        if (!title || !description) {
            showModalAlert(
                $addAlert,
                "Judul dan deskripsi keluhan wajib diisi."
            );
            return;
        }

        if (
            !Number.isFinite(priority) ||
            priority < 0 ||
            priority > 1
        ) {
            showModalAlert(
                $addAlert,
                "Prioritas harus berada di antara 0 dan 1."
            );
            return;
        }

        if (
            imageFile &&
            !validateImage(imageFile, $addAlert, $("#addImage")[0])
        ) {
            return;
        }

        const formData = new FormData();

        formData.append("userID", userID);
        formData.append("assetID", assetID);
        formData.append("title", title);
        formData.append("description", description);
        formData.append("priority", String(priority));
        formData.append("status", status);
        formData.append("note", note);

        if (imageFile) {
            formData.append("image", imageFile);
        }

        $saveButton
            .prop("disabled", true)
            .html(`
                <span class="spinner-border spinner-border-sm me-2"></span>
                Menyimpan...
            `);

        $.ajax(ajaxOptions({
            url: COMPLAINT_URL,
            method: "POST",
            data: formData,
            contentType: false,
            processData: false,
            dataType: "json",

            success: function (response) {
                if (addModalEl) {
                    bootstrap.Modal
                        .getOrCreateInstance(addModalEl)
                        .hide();
                }

                $addForm[0].reset();

                $("#addImagePreview")
                    .attr("src", "");

                $("#addImagePreviewWrapper")
                    .addClass("d-none");

                Swal.fire({
                    icon: "success",
                    title: "Berhasil",
                    text: response.message ||
                        "Keluhan berhasil ditambahkan.",
                    timer: 2000,
                    showConfirmButton: false
                });

                loadComplaints();
            },

            error: function (xhr) {
                showModalAlert(
                    $addAlert,
                    apiErrorMessage(
                        xhr,
                        "Keluhan gagal ditambahkan"
                    )
                );
            },

            complete: function () {
                $saveButton
                    .prop("disabled", false)
                    .html(
                        '<i class="bi bi-save me-1"></i> Simpan Keluhan'
                    );
            }
        }));
    });

    // ==================================================
    // DETAIL KELUHAN
    // ==================================================

    $(document).on(
        "click",
        ".btn-detail-complaint",
        function () {
            const id = $(this).attr("data-id");

            if (!id) {
                Swal.fire(
                    "Gagal",
                    "ID keluhan tidak ditemukan.",
                    "error"
                );
                return;
            }

            const item = complaints.find(function (complaint) {
                return String(complaint.id) === String(id);
            });

            if (item) {
                displayDetail(item);
                return;
            }

            $.ajax(ajaxOptions({
                url: `${COMPLAINT_URL}/${encodeURIComponent(id)}`,
                method: "GET",
                dataType: "json",

                success: function (response) {
                    displayDetail(response.data || response);
                },

                error: function (xhr) {
                    Swal.fire(
                        "Gagal",
                        apiErrorMessage(
                            xhr,
                            "Gagal memuat detail keluhan"
                        ),
                        "error"
                    );
                }
            }));
        }
    );

    function displayDetail(item) {
        $("#detailComplaintCode").text(item.code || "-");
        $("#detailComplaintTitle").text(item.title || "-");

        $("#detailComplaintUser").text(
            item.userID ?? item.user_id ?? "-"
        );

        const assetID =
            item.assetID ?? item.asset_id ?? item.assetId;

        const asset = findAsset(assetID);

        $("#detailComplaintAsset").text(
            asset ? getAssetName(asset) : assetID || "-"
        );

        $("#detailComplaintPriority").text(
            Number(item.priority ?? 0).toFixed(2)
        );

        $("#detailComplaintStatus").html(
            renderStatusBadge(normalizedStatus(item))
        );

        $("#detailComplaintFixed").html(
            renderFixedBadge(isFixed(item))
        );

        $("#detailComplaintDescription").text(
            item.description || "-"
        );

        $("#detailComplaintNote").text(
            item.note || "-"
        );

        $("#detailComplaintCreated").text(
            formatDate(item.created_at)
        );

        $("#detailComplaintUpdated").text(
            formatDate(item.updated_at)
        );

        $("#btnDetailToEditComplaint").attr(
            "data-id",
            item.id
        );

        if (item.image_path) {
            $("#detailComplaintImage")
                .attr("src", resolveImageURL(item.image_path));

            $("#detailComplaintImageWrapper")
                .removeClass("d-none");
        } else {
            $("#detailComplaintImage").attr("src", "");

            $("#detailComplaintImageWrapper")
                .addClass("d-none");
        }

        if (detailModalEl) {
            bootstrap.Modal
                .getOrCreateInstance(detailModalEl)
                .show();
        }
    }

    // ==================================================
    // EDIT KELUHAN
    // ==================================================

    $(document).on(
        "click",
        ".btn-edit-complaint",
        function () {
            const id = $(this).attr("data-id");

            if (!id) {
                Swal.fire(
                    "Gagal",
                    "ID keluhan tidak ditemukan.",
                    "error"
                );
                return;
            }

            openEditModal(id);
        }
    );

    $("#btnDetailToEditComplaint").on("click", function () {
        const id = $(this).attr("data-id");

        if (detailModalEl) {
            bootstrap.Modal
                .getOrCreateInstance(detailModalEl)
                .hide();
        }

        if (id) {
            openEditModal(id);
        }
    });

    function openEditModal(id) {
        hideModalAlert($editAlert);

        if ($editForm.length && $editForm[0]) {
            $editForm[0].reset();
        }

        $.ajax(ajaxOptions({
            url: `${COMPLAINT_URL}/${encodeURIComponent(id)}`,
            method: "GET",
            dataType: "json",

            success: function (response) {
                const item = response.data || response;

                if (!item || !item.id) {
                    Swal.fire(
                        "Gagal",
                        "Data keluhan tidak ditemukan.",
                        "error"
                    );
                    return;
                }

                $("#editComplaintId").val(item.id);

                $("#editUserID").val(
                    item.userID ?? item.user_id ?? currentUserID ?? ""
                );

                $("#editTitle").val(item.title || "");

                $("#editDescription").val(
                    item.description || ""
                );

                $("#editPriority").val(
                    item.priority ?? 0
                );

                $("#editStatus").val(
                    String(item.status || "low").toLowerCase()
                );

                $("#editNote").val(item.note || "");

                $("#editIsFixed").prop(
                    "checked",
                    isFixed(item)
                );

                loadAssetOptions(
                    item.assetID ??
                    item.asset_id ??
                    item.assetId
                );

                const $currentImage =
                    $("#editCurrentImage");

                if (item.image_path) {
                    $currentImage
                        .attr("src", resolveImageURL(item.image_path));

                    $("#editCurrentImageWrapper")
                        .removeClass("d-none");
                } else {
                    $currentImage.attr("src", "");

                    $("#editCurrentImageWrapper")
                        .addClass("d-none");
                }

                if (editModalEl) {
                    bootstrap.Modal
                        .getOrCreateInstance(editModalEl)
                        .show();
                }
            },

            error: function (xhr) {
                Swal.fire(
                    "Gagal",
                    apiErrorMessage(
                        xhr,
                        "Gagal memuat detail keluhan"
                    ),
                    "error"
                );
            }
        }));
    }

    $("#editImage").on("change", function () {
        const file = this.files?.[0];

        $("#editImagePreview").attr("src", "");

        $("#editImagePreviewWrapper")
            .addClass("d-none");

        if (!file) return;

        if (!validateImage(file, $editAlert, this)) {
            return;
        }

        const reader = new FileReader();

        reader.onload = function (event) {
            $("#editImagePreview")
                .attr("src", event.target.result);

            $("#editImagePreviewWrapper")
                .removeClass("d-none");
        };

        reader.onerror = function () {
            showModalAlert(
                $editAlert,
                "Gambar baru gagal dibaca."
            );
        };

        reader.readAsDataURL(file);
    });

    $editForm.on("submit", function (event) {
        event.preventDefault();

        hideModalAlert($editAlert);

        const id = $("#editComplaintId").val();

        if (!id) {
            showModalAlert(
                $editAlert,
                "ID keluhan tidak ditemukan."
            );
            return;
        }

        const userID = String(
            $("#editUserID").val() || currentUserID || ""
        ).trim();

        const assetID = String(
            $("#editAssetID").val() || ""
        ).trim();

        const title = String(
            $("#editTitle").val() || ""
        ).trim();

        const description = String(
            $("#editDescription").val() || ""
        ).trim();

        const priority = Number(
            $("#editPriority").val()
        );

        const status = $("#editStatus").val() || "low";

        const note = String(
            $("#editNote").val() || ""
        ).trim();

        const fixed = $("#editIsFixed").is(":checked");

        const imageFile =
            $("#editImage")[0]?.files?.[0];

        if (!userID || !assetID || !title || !description) {
            showModalAlert(
                $editAlert,
                "User, aset, judul, dan deskripsi wajib diisi."
            );
            return;
        }

        if (
            !Number.isFinite(priority) ||
            priority < 0 ||
            priority > 1
        ) {
            showModalAlert(
                $editAlert,
                "Prioritas harus berada di antara 0 dan 1."
            );
            return;
        }

        if (
            imageFile &&
            !validateImage(imageFile, $editAlert, $("#editImage")[0])
        ) {
            return;
        }

        const formData = new FormData();

        formData.append("userID", userID);
        formData.append("assetID", assetID);
        formData.append("title", title);
        formData.append("description", description);
        formData.append("priority", String(priority));
        formData.append("status", status);
        formData.append("note", note);
        formData.append("is_fixed", String(fixed));

        if (imageFile) {
            formData.append("image", imageFile);
        }

        $updateButton
            .prop("disabled", true)
            .text("Menyimpan perubahan...");

        $.ajax(ajaxOptions({
            url: `${COMPLAINT_URL}/${encodeURIComponent(id)}`,
            method: "PUT",
            data: formData,
            contentType: false,
            processData: false,
            dataType: "json",

            success: function (response) {
                if (editModalEl) {
                    bootstrap.Modal
                        .getOrCreateInstance(editModalEl)
                        .hide();
                }

                Swal.fire({
                    icon: "success",
                    title: "Berhasil",
                    text: response.message ||
                        "Data keluhan berhasil diperbarui.",
                    timer: 2000,
                    showConfirmButton: false
                });

                loadComplaints();
            },

            error: function (xhr) {
                showModalAlert(
                    $editAlert,
                    apiErrorMessage(
                        xhr,
                        "Gagal memperbarui keluhan"
                    )
                );
            },

            complete: function () {
                $updateButton
                    .prop("disabled", false)
                    .html(
                        '<i class="bi bi-save me-1"></i> Simpan Perubahan'
                    );
            }
        }));
    });

    // ==================================================
    // HAPUS KELUHAN
    // ==================================================

    $(document).on(
        "click",
        ".btn-delete-complaint",
        async function () {
            const id = $(this).attr("data-id");

            if (!id) {
                Swal.fire(
                    "Gagal",
                    "ID keluhan tidak ditemukan.",
                    "error"
                );
                return;
            }

            const confirmation = await Swal.fire({
                title: "Hapus Keluhan?",
                text: "Data keluhan yang dihapus tidak dapat dipulihkan.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#dc3545",
                cancelButtonColor: "#6c757d",
                confirmButtonText: "Ya, Hapus",
                cancelButtonText: "Batal"
            });

            if (!confirmation.isConfirmed) {
                return;
            }

            Swal.fire({
                title: "Menghapus...",
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            $.ajax(ajaxOptions({
                url: `${COMPLAINT_URL}/${encodeURIComponent(id)}`,
                method: "DELETE",
                dataType: "json",

                success: function (response) {
                    awaitReload();

                    Swal.fire({
                        icon: "success",
                        title: "Terhapus",
                        text: response.message ||
                            "Keluhan berhasil dihapus.",
                        timer: 1800,
                        showConfirmButton: false
                    });
                },

                error: function (xhr) {
                    Swal.fire(
                        "Gagal Menghapus",
                        apiErrorMessage(
                            xhr,
                            "Gagal menghapus keluhan"
                        ),
                        "error"
                    );
                }
            }));
        }
    );

    function awaitReload() {
        loadComplaints();
    }

    // ==================================================
    // INISIALISASI
    // ==================================================

    // Tampilkan keadaan awal, jangan biarkan spinner HTML
    // menetap jika permintaan API gagal.
    $tableBody.html(`
        <tr>
            <td colspan="8" class="text-center py-4">
                Menyiapkan halaman keluhan...
            </td>
        </tr>
    `);

    // Ambil aset dan identitas pengguna secara terpisah.
    loadAssetOptions();

    // Tunggu identitas pengguna tersedia sebelum memuat keluhan.
    loadCurrentUser(function () {
        loadComplaints();
    });
});
