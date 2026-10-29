
/**
 * CRUD Keluhan - Sistem Inventaris Cerdas
 * jQuery AJAX + Bootstrap 5 + SweetAlert2
 *
 * Fitur:
 * - Mengambil identitas user dari GET /api/me
 * - Dropdown lokasi dan aset untuk tambah complaint
 * - Location dan Asset hanya ditampilkan saat edit
 * - Tambah, edit, detail, hapus complaint
 * - Upload gambar dan mempertahankan gambar lama
 * - Filter pencarian, status, dan status perbaikan
 * - Mendukung HTML dinamis melalui layout.js
 */

"use strict";
const URL_BASE = window.APP_CONFIG.API_BASE_URL; //"http://localhost:8080",
const FRONTEND_BASE_URL= window.APP_CONFIG.BASIC_URL; //"http://localhost:8088",

const API_BASE=`${URL_BASE}/api/private`;
//const API_BASE = "http://localhost:8080/api/private";

const COMPLAINT_URL = `${API_BASE}/complaints`;
const ASSET_URL = `${API_BASE}/assets`;
const LOCATION_URL = `${API_BASE}/location`;
//const ME_URL = "http://localhost:8080/api/me";
const ME_URL = `${FRONTEND_BASE_URL}/api/me`;;
const IMAGE_BASE_URL = URL_BASE;

let complaintPageInitialized = false;

function initComplaintsPage() {
    if (complaintPageInitialized) return;

    if (!document.querySelector("#complaintTableBody")) return;

    complaintPageInitialized = true;

    // ==========================================
    // REFERENSI ELEMENT
    // ==========================================

    const $tableBody = $("#complaintTableBody");
    const $alert = $("#complaintAlert");
    const $search = $("#complaintSearch");
    const $statusFilter = $("#statusFilter");
    const $unfixedFilter = $("#unfixedFilter");
    const $refresh = $("#refreshComplaints");
    const $count = $("#complaintCount");

    const $addForm = $("#formAddComplaint");
    const $editForm = $("#editComplaintForm");

    const $addAlert = $("#addComplaintAlert");
    const $editAlert = $("#editComplaintAlert");

    const $saveButton = $("#btnSaveComplaint");
    const $updateButton = $("#updateComplaintButton");

    const addModalEl = document.getElementById("addComplaintModal");
    const editModalEl = document.getElementById("editComplaintModal");
    const detailModalEl = document.getElementById("detailComplaintModal");

    let complaints = [];
    let currentUserID = null;
    let currentEditAssetID = "";

    let allAssets = [];
    let allLocations = [];

    let assetOptionsLoaded = false;
    let locationOptionsLoaded = false;

    // ==========================================
    // AJAX HELPER
    // ==========================================

    function ajaxOptions(options) {
        options.xhrFields = { withCredentials: true };

        options.headers = Object.assign(
            { Accept: "application/json" },
            options.headers || {}
        );

        return options;
    }

    function apiErrorMessage(xhr, fallback) {
        const response = xhr.responseJSON || {};

        if (response.detail) return response.detail;
        if (response.error) return response.error;
        if (response.message) return response.message;

        if (xhr.status === 401 || xhr.status === 403) {
            return "Sesi login berakhir atau akses ditolak. Silakan login kembali.";
        }

        if (xhr.status === 404) {
            return "Endpoint atau data tidak ditemukan.";
        }

        if (xhr.status === 413) {
            return "Ukuran file terlalu besar.";
        }

        if (xhr.status === 0) {
            return "Tidak dapat terhubung ke server API. Periksa server dan konfigurasi CORS.";
        }

        return `${fallback} (HTTP ${xhr.status}).`;
    }

    function extractPayload(response) {
        if (response?.data !== undefined) return response.data;
        if (response?.user !== undefined) return response.user;
        return response;
    }

    function extractList(response) {
        if (Array.isArray(response)) return response;
        if (Array.isArray(response?.data)) return response.data;
        if (Array.isArray(response?.data?.data)) return response.data.data;
        if (Array.isArray(response?.locations)) return response.locations;
        if (Array.isArray(response?.assets)) return response.assets;
        return [];
    }

    // ==========================================
    // HELPER TAMPILAN
    // ==========================================

    function escapeHtml(value) {
        if (value === null || value === undefined) return "";

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function showAlert(message, type = "danger") {
        $alert
            .removeClass("d-none alert-success alert-danger alert-warning alert-info")
            .addClass(`alert-${type}`)
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
            .addClass(`alert-${type}`)
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

        if (Number.isNaN(date.getTime())) return String(value);

        return date.toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Jakarta"
        });
    }

    function resolveImageURL(imagePath) {
        if (!imagePath) return "";

        if (/^https?:\/\//i.test(imagePath)) return imagePath;

        const path = String(imagePath).startsWith("/")
            ? String(imagePath)
            : `/${imagePath}`;

        return `${IMAGE_BASE_URL}${path}`;
    }

    function normalizedStatus(item) {
        if (item.is_fixed === true || item.is_fixed === "true") {
            return "resolved";
        }

        return String(item.status || "low").toLowerCase();
    }

    function renderStatusBadge(status) {
        const value = String(status || "low").toLowerCase();

        const classes = {
            low: "status-low",
            medium: "status-medium",
            high: "status-high",
            critical: "status-critical",
            resolved: "status-resolved"
        };

        const labels = {
            low: "Low",
            medium: "Medium",
            high: "High",
            critical: "Critical",
            resolved: "Resolved"
        };

        return `
            <span class="badge-status ${classes[value] || "status-other"}">
                ${labels[value] || escapeHtml(value)}
            </span>
        `;
    }

    function renderFixedBadge(isFixed) {
        if (isFixed === true || isFixed === "true") {
            return `
                <span class="badge bg-success-subtle text-success border border-success-subtle">
                    <i class="bi bi-check-circle me-1"></i>Selesai
                </span>
            `;
        }

        return `
            <span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                <i class="bi bi-clock me-1"></i>Belum
            </span>
        `;
    }

    function renderPriority(value) {
        const priority = Number(value ?? 0);
        const safeValue = Number.isFinite(priority)
            ? Math.max(0, Math.min(1, priority))
            : 0;

        return `
            <div class="d-flex align-items-center gap-2">
                <div class="priority-track">
                    <div class="priority-fill" style="width:${safeValue * 100}%"></div>
                </div>
                <span>${safeValue.toFixed(1)}</span>
            </div>
        `;
    }

    // ==========================================
    // IDENTITAS USER
    // ==========================================

    function findUserID(value) {
        if (!value || typeof value !== "object") return null;

        const id =
            value.id ??
            value.userID ??
            value.user_id ??
            value.userId ??
            value.sub;

        if (id !== undefined && id !== null && String(id).trim() !== "") {
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

    function loadCurrentUser() {
        currentUserID = null;
        $("#addUserID").val("");

        $.ajax(ajaxOptions({
            url: ME_URL,
            method: "GET",
            dataType: "json",

            success: function (response) {
                const payload = extractPayload(response);

                currentUserID =
                    findUserID(payload) ||
                    findUserID(response);

                if (currentUserID) {
                    $("#addUserID").val(currentUserID);
                } else {
                    showModalAlert(
                        $addAlert,
                        "ID pengguna tidak ditemukan dari respons API."
                    );
                }
            },

            error: function (xhr) {
                currentUserID = null;

                showModalAlert(
                    $addAlert,
                    apiErrorMessage(xhr, "Gagal mengambil identitas pengguna")
                );
            }
        }));
    }

    // ==========================================
    // HELPER LOKASI DAN ASET
    // ==========================================

    function getLocationID(location) {
        return String(
            location.location_id ??
            location.locationID ??
            location.id ??
            location.ID ??
            ""
        );
    }

    function getLocationName(location) {
        if (!location || typeof location !== "object") return "";

        return (
            location.location_name ??
            location.locationName ??
            location.nama_lokasi ??
            location.name ??
            location.nama ??
            ""
        );
    }

    function getAssetID(asset) {
        return String(
            asset.asset_id ??
            asset.assetID ??
            asset.assetId ??
            asset.id ??
            ""
        );
    }

    function getAssetLocationID(asset) {
        const location = asset.location;

        return String(
            (
                location && typeof location === "object"
                    ? location.location_id ??
                      location.locationID ??
                      location.locationId ??
                      location.id
                    : location
            ) ??
            asset.location_id ??
            asset.locationID ??
            asset.locationId ??
            asset.location_detail?.location_id ??
            asset.location_detail?.locationID ??
            asset.location_detail?.id ??
            asset.locationDetail?.id ??
            ""
        );
    }

    function getAssetLabel(asset) {
        const code =
            asset.code_asset ??
            asset.code ??
            asset.asset_code ??
            "";

        const name =
            asset.nama_asset ??
            asset.asset_name ??
            asset.assetName ??
            asset.name ??
            asset.title ??
            "Aset tanpa nama";

        return `${code ? code + " - " : ""}${name}`;
    }

    // Mengambil nama aset dan lokasi dari relasi complaint.
    function getComplaintAssetName(item) {
        const asset = item?.asset || {};

        return (
            asset.nama_asset ??
            asset.asset_name ??
            asset.assetName ??
            asset.name ??
            asset.title ??
            item?.asset_name ??
            item?.assetName ??
            "-"
        );
    }

    function getComplaintLocationName(item) {
        const asset = item?.asset || {};

        const locationDetail =
            asset.location_detail ??
            asset.locationDetail ??
            item?.location_detail ??
            item?.locationDetail ??
            null;

        const location = asset.location;

        if (locationDetail && typeof locationDetail === "object") {
            const name = getLocationName(locationDetail);
            if (name) return name;
        }

        if (location && typeof location === "object") {
            const name = getLocationName(location);
            if (name) return name;
        }

        return (
            asset.location_name ??
            asset.locationName ??
            item?.location_name ??
            item?.locationName ??
            "-"
        );
    }

    // ==========================================
    // DROPDOWN LOKASI UNTUK TAMBAH COMPLAINT
    // ==========================================

    function loadLocationOptions() {
        const $addLocation = $("#addLocationID");

        $addLocation
            .empty()
            .append(new Option("Memuat lokasi...", ""))
            .prop("disabled", true);

        return $.ajax(ajaxOptions({
            url: LOCATION_URL,
            method: "GET",
            dataType: "json",
            cache: false,

            success: function (response) {
                allLocations = extractList(response);
                locationOptionsLoaded = true;

                $addLocation.empty().append(new Option("Pilih Lokasi", ""));

                allLocations.forEach(function (location) {
                    const id = getLocationID(location);
                    const name = getLocationName(location);

                    if (!id) return;

                    $addLocation.append(new Option(name || "Lokasi tanpa nama", id));
                });

                $addLocation.prop("disabled", false);

                if (allLocations.length === 0) {
                    $addLocation
                        .empty()
                        .append(new Option("Tidak ada data lokasi", ""))
                        .prop("disabled", true);
                }

                filterAssetsByLocation($addLocation.val());
            },

            error: function (xhr) {
                locationOptionsLoaded = false;

                $addLocation
                    .empty()
                    .append(new Option("Gagal memuat lokasi", ""))
                    .prop("disabled", true);

                showModalAlert(
                    $addAlert,
                    apiErrorMessage(xhr, "Gagal memuat daftar lokasi")
                );
            }
        }));
    }

    // ==========================================
    // DROPDOWN ASET UNTUK TAMBAH COMPLAINT
    // ==========================================

    function resetAddAssetDropdown(message) {
        $("#addAssetID")
            .empty()
            .append(new Option(message, ""))
            .prop("disabled", true);

        $("#addAssetInfo").text("Aset akan ditampilkan sesuai lokasi.");
    }

    function loadAssetOptions() {
        resetAddAssetDropdown("Memuat aset...");

        return $.ajax(ajaxOptions({
            url: ASSET_URL,
            method: "GET",
            dataType: "json",
            cache: false,

            success: function (response) {
                allAssets = extractList(response);
                assetOptionsLoaded = true;

                filterAssetsByLocation($("#addLocationID").val());
            },

            error: function (xhr) {
                assetOptionsLoaded = false;
                resetAddAssetDropdown("Gagal memuat aset");

                showModalAlert(
                    $addAlert,
                    apiErrorMessage(xhr, "Gagal memuat daftar aset")
                );
            }
        }));
    }

    function filterAssetsByLocation(locationID) {
        const $select = $("#addAssetID");
        const $info = $("#addAssetInfo");

        if (!locationID) {
            resetAddAssetDropdown("Pilih lokasi terlebih dahulu");
            return;
        }

        if (!assetOptionsLoaded) {
            resetAddAssetDropdown("Memuat data aset...");
            return;
        }

        const filteredAssets = allAssets.filter(function (asset) {
            return getAssetLocationID(asset) === String(locationID);
        });

        $select.empty().append(new Option("Pilih Aset", ""));

        filteredAssets.forEach(function (asset) {
            const id = getAssetID(asset);
            if (!id) return;

            $select.append(new Option(getAssetLabel(asset), id));
        });

        if (filteredAssets.length === 0) {
            $select
                .empty()
                .append(new Option("Tidak ada aset di lokasi ini", ""))
                .prop("disabled", true);

            $info.text("Tidak ada aset yang tersedia pada lokasi ini.");
            return;
        }

        $select.prop("disabled", false);
        $info.text(`${filteredAssets.length} aset ditemukan di lokasi ini.`);
    }

    $(document)
        .off("change.complaintsAddLocation", "#addLocationID")
        .on("change.complaintsAddLocation", "#addLocationID", function () {
            hideModalAlert($addAlert);
            filterAssetsByLocation($(this).val());
        });

    // ==========================================
    // PREVIEW DAN VALIDASI GAMBAR
    // ==========================================

    function resetAddImagePreview() {
        $("#addComplaintImage").val("");
        $("#addComplaintImagePreview").attr("src", "");
        $("#addImagePreviewWrapper").addClass("d-none");
    }

    function resetEditImagePreview() {
        $("#editImage").val("");

        $("#editImagePreview")
            .attr("src", "")
            .closest("#editImagePreviewWrapper")
            .addClass("d-none");

        $("#editCurrentImage").attr("src", "");
        $("#editCurrentImageWrapper").addClass("d-none");
        $("#editCurrentImageError").remove();
    }

    function validateImage(file, $target, inputElement) {
        if (!file) return true;

        const allowedTypes = ["image/jpeg", "image/png", "image/gif"];

        if (!allowedTypes.includes(file.type)) {
            if (inputElement) inputElement.value = "";

            showModalAlert(
                $target,
                "Format gambar harus JPG, PNG, atau GIF."
            );

            return false;
        }

        if (file.size > 5 * 1024 * 1024) {
            if (inputElement) inputElement.value = "";

            showModalAlert(
                $target,
                "Ukuran gambar maksimal 5 MB."
            );

            return false;
        }

        return true;
    }

    $(document)
        .off("change.complaintsAddImage", "#addComplaintImage")
        .on("change.complaintsAddImage", "#addComplaintImage", function () {
            const file = this.files?.[0];

            $("#addComplaintImagePreview").attr("src", "");
            $("#addImagePreviewWrapper").addClass("d-none");

            if (!file) return;

            if (!validateImage(file, $addAlert, this)) {
                resetAddImagePreview();
                return;
            }

            const reader = new FileReader();

            reader.onload = function (event) {
                $("#addComplaintImagePreview").attr("src", event.target.result);
                $("#addImagePreviewWrapper").removeClass("d-none");
            };

            reader.onerror = function () {
                showModalAlert($addAlert, "Gambar gagal dibaca.");
            };

            reader.readAsDataURL(file);
        });

    function showCurrentEditImage(imagePath) {
        const $wrapper = $("#editCurrentImageWrapper");
        const $image = $("#editCurrentImage");

        if (!imagePath) {
            $image.attr("src", "");
            $wrapper.addClass("d-none");
            return;
        }

        $image
            .attr("src", resolveImageURL(imagePath))
            .off("error.complaintImage")
            .on("error.complaintImage", function () {
                $wrapper.removeClass("d-none");

                if (!$("#editCurrentImageError").length) {
                    $wrapper.append(`
                        <div id="editCurrentImageError"
                             class="small text-danger mt-2">
                            Gambar tidak dapat ditampilkan. Periksa path gambar dan route static backend.
                        </div>
                    `);
                }
            });

        $("#editCurrentImageError").remove();
        $wrapper.removeClass("d-none");
    }

    $(document)
        .off("change.complaintsEditImage", "#editImage")
        .on("change.complaintsEditImage", "#editImage", function () {
            const file = this.files?.[0];

            $("#editImagePreview").attr("src", "");
            $("#editImagePreviewWrapper").addClass("d-none");

            if (!file) return;

            if (!validateImage(file, $editAlert, this)) return;

            const reader = new FileReader();

            reader.onload = function (event) {
                $("#editImagePreview").attr("src", event.target.result);
                $("#editImagePreviewWrapper").removeClass("d-none");
            };

            reader.onerror = function () {
                showModalAlert($editAlert, "Gambar baru gagal dibaca.");
            };

            reader.readAsDataURL(file);
        });

    // ==========================================
    // RENDER TABEL COMPLAINT
    // ==========================================

   function renderTable() {
    const keyword = String($search.val() || "").trim().toLowerCase();
    const selectedStatus = String($statusFilter.val() || "").toLowerCase();
    const onlyUnfixed = $unfixedFilter.is(":checked");

    // Hancurkan instance DataTables lama sebelum merender ulang.
    if ($.fn.DataTable.isDataTable("#complaintTable")) {
        $("#complaintTable").DataTable().destroy();
    }

    $tableBody.empty();

    const filtered = complaints.filter(function (item) {
        const haystack = [
            item.code,
            item.title,
            item.description,
            item.note,
            item.userID,
            item.user_id,
            item.user?.name,
            item.user?.nama,
            getComplaintAssetName(item),
            getComplaintLocationName(item)
        ]
            .map(value => String(value ?? ""))
            .join(" ")
            .toLowerCase();

        const matchesKeyword =
            !keyword || haystack.includes(keyword);

        const matchesStatus =
            !selectedStatus ||
            normalizedStatus(item) === selectedStatus;

        const isFixed =
            item.is_fixed === true ||
            item.is_fixed === "true";

        const matchesFixed = !onlyUnfixed || !isFixed;

        return matchesKeyword && matchesStatus && matchesFixed;
    });

    // Render baris tabel.
    filtered.forEach(function (item, index) {
        const id = item.id;
        const code = item.code || "-";
        const title = item.title || "-";

        const namaUser =
            item.user?.name ??
            item.user?.nama ??
            item.userID ??
            item.user_id ??
            "-";

        const namaAset = getComplaintAssetName(item);
        const lokasiAset = getComplaintLocationName(item);
        const status = normalizedStatus(item);

        const $row = $("<tr>");

        $("<td>")
            .addClass("text-center")
            .text(index + 1)
            .appendTo($row);

        $("<td>")
            .html(
                `<span class="complaint-code font-monospace">${escapeHtml(code)}</span>`
            )
            .appendTo($row);

        $("<td>")
            .html(`
                <div class="fw-semibold text-dark">${escapeHtml(title)}</div>
                <div class="small text-muted text-truncate" style="max-width:220px">
                    ${escapeHtml(item.description || "")}
                </div>
            `)
            .appendTo($row);

        $("<td>").text(namaUser).appendTo($row);
        $("<td>").text(namaAset).appendTo($row);
        $("<td>").text(lokasiAset).appendTo($row);
        $("<td>").html(renderPriority(item.priority)).appendTo($row);
        $("<td>").html(renderStatusBadge(status)).appendTo($row);
        $("<td>").html(renderFixedBadge(item.is_fixed)).appendTo($row);

        $("<td>")
            .addClass("small text-muted")
            .text(formatDate(item.created_at))
            .appendTo($row);

        // Tombol aksi.
        const $actionTd = $("<td>").addClass("text-center");

        const $actionGroup = $("<div>")
            .addClass("btn-group btn-group-sm")
            .attr("role", "group");

        $("<button>", {
            type: "button",
            class: "btn btn-outline-info btn-detail-complaint",
            title: "Detail Keluhan"
        })
            .attr("data-id", id)
            .html('<i class="bi bi-eye"></i>')
            .appendTo($actionGroup);

        $("<button>", {
            type: "button",
            class: "btn btn-outline-warning btn-edit-complaint",
            title: "Ubah Keluhan"
        })
            .attr("data-id", id)
            .html('<i class="bi bi-pencil-square"></i>')
            .appendTo($actionGroup);

        $("<button>", {
            type: "button",
            class: "btn btn-outline-danger btn-delete-complaint",
            title: "Hapus Keluhan"
        })
            .attr("data-id", id)
            .attr("data-name", title)
            .attr("data-code", code)
            .html('<i class="bi bi-trash"></i>')
            .appendTo($actionGroup);

        $actionTd.append($actionGroup);
        $row.append($actionTd);
        $tableBody.append($row);
    });

    $count.text(
        `Menampilkan ${filtered.length} dari ${complaints.length} keluhan`
    );

    // Inisialisasi instance DataTables setelah semua baris dibuat.
    $("#complaintTable").DataTable({
        paging: true,
        pageLength: 10,
        lengthMenu: [
            [10, 25, 50, 100],
            [10, 25, 50, 100]
        ],
        searching: false,
        ordering: true,
        info: true,
        autoWidth: false,
        order: [],
        columnDefs: [
            {
                targets: [0, 9, 10],
                orderable: false
            }
        ],
        language: {
            emptyTable: "Tidak ada data keluhan",
            zeroRecords: "Data keluhan tidak ditemukan",
            info: "Menampilkan _START_ sampai _END_ dari _TOTAL_ keluhan",
            infoEmpty: "Tidak ada data keluhan",
            infoFiltered: "(difilter dari _MAX_ total data)",
            lengthMenu: "Tampilkan _MENU_ data",
            loadingRecords: "Memuat data...",
            processing: "Memproses...",
            paginate: {
                first: "Pertama",
                last: "Terakhir",
                next: "Berikutnya",
                previous: "Sebelumnya"
            }
        }
    });
}

    // ==========================================
    // MEMUAT DATA COMPLAINT
    // ==========================================

    function loadComplaints() {
        $refresh.prop("disabled", true);
        hideAlert();

        $tableBody.html(`
            <tr>
                <td colspan="11" class="text-center py-4">
                    <span class="spinner-border spinner-border-sm text-primary me-2"></span>
                    Memuat data keluhan...
                </td>
            </tr>
        `);

        $.ajax(ajaxOptions({
            url: COMPLAINT_URL,
            method: "GET",
            dataType: "json",
            cache: false,

            success: function (response) {
                complaints = extractList(response);
                renderTable();

                if (complaints.length === 0) {
                    showAlert("Belum ada data keluhan yang terdaftar.", "info");
                }
            },

            error: function (xhr) {
                const message = apiErrorMessage(xhr, "Gagal memuat data keluhan");

                showAlert(message);

                $tableBody.html(`
                    <tr>
                        <td colspan="11" class="text-center text-danger py-4">
                            ${escapeHtml(message)}
                        </td>
                    </tr>
                `);
            },

            complete: function () {
                $refresh.prop("disabled", false);
            }
        }));
    }

    $search.on("input", renderTable);
    $statusFilter.on("change", renderTable);
    $unfixedFilter.on("change", renderTable);
    $refresh.on("click", loadComplaints);

    // ==========================================
    // MODAL TAMBAH COMPLAINT
    // ==========================================

    $(document)
        .off("click.complaintsAddButton", "#addComplaintButton")
        .on("click.complaintsAddButton", "#addComplaintButton", function () {
            if ($addForm.length) $addForm[0].reset();

            currentUserID = null;

            $("#addUserID").val("");
            $("#addComplaintPriority").val("0.3");
            $("#addComplaintStatus").val("low");

            hideModalAlert($addAlert);
            resetAddImagePreview();
            resetAddAssetDropdown("Pilih lokasi terlebih dahulu");

            if (addModalEl) {
                bootstrap.Modal.getOrCreateInstance(addModalEl).show();
            }

            loadCurrentUser();
            loadLocationOptions();
            loadAssetOptions();
        });

    // ==========================================
    // SIMPAN COMPLAINT BARU
    // ==========================================

    $(document)
        .off("submit.complaintsAdd", "#formAddComplaint")
        .on("submit.complaintsAdd", "#formAddComplaint", function (event) {
            event.preventDefault();
            hideModalAlert($addAlert);

            const userID = String(
                currentUserID || $("#addUserID").val() || ""
            ).trim();

            const locationID = String($("#addLocationID").val() || "").trim();
            const assetID = String($("#addAssetID").val() || "").trim();

            const title = String($("#addComplaintTitle").val() || "").trim();
            const description = String($("#addComplaintDescription").val() || "").trim();
            const priority = Number($("#addComplaintPriority").val() || 0);
            const status = $("#addComplaintStatus").val() || "low";
            const note = String($("#addComplaintNote").val() || "").trim();

            if (!userID) {
                showModalAlert($addAlert, "User ID belum tersedia. Pastikan Anda sudah login.");
                return;
            }

            if (!locationID) {
                showModalAlert($addAlert, "Pilih lokasi terlebih dahulu.");
                return;
            }

            if (!assetID || !assetOptionsLoaded) {
                showModalAlert($addAlert, "Pilih aset dari lokasi yang sudah dipilih.");
                return;
            }

            const selectedAsset = allAssets.find(
                asset => getAssetID(asset) === assetID
            );

            if (!selectedAsset || getAssetLocationID(selectedAsset) !== locationID) {
                showModalAlert($addAlert, "Aset tidak sesuai dengan lokasi yang dipilih.");
                return;
            }

            if (!title || !description) {
                showModalAlert($addAlert, "Judul dan deskripsi keluhan wajib diisi.");
                return;
            }

            if (!Number.isFinite(priority) || priority < 0 || priority > 1) {
                showModalAlert($addAlert, "Prioritas harus berada di antara 0 dan 1.");
                return;
            }

            const imageInput = $("#addComplaintImage")[0];
            const imageFile = imageInput?.files?.[0];

            if (imageFile && !validateImage(imageFile, $addAlert, imageInput)) {
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

            if (imageFile) formData.append("image", imageFile);

            $saveButton
                .prop("disabled", true)
                .html(`
                    <span class="spinner-border spinner-border-sm me-2"></span>
                    Menyimpan...
                `);

            $.ajax(ajaxOptions({
                url: COMPLAINT_URL,
                method: "POST",
                contentType: false,
                processData: false,
                dataType: "json",
                data: formData,

                success: function (response) {
                    if (addModalEl) {
                        bootstrap.Modal.getOrCreateInstance(addModalEl).hide();
                    }

                    $addForm[0].reset();
                    resetAddImagePreview();
                    resetAddAssetDropdown("Pilih lokasi terlebih dahulu");
                    loadComplaints();

                    Swal.fire({
                        icon: "success",
                        title: "Berhasil!",
                        text: response.message || "Keluhan berhasil ditambahkan.",
                        timer: 2000,
                        showConfirmButton: false
                    });
                },

                error: function (xhr) {
                    showModalAlert(
                        $addAlert,
                        apiErrorMessage(xhr, "Keluhan gagal ditambahkan")
                    );
                },

                complete: function () {
                    $saveButton
                        .prop("disabled", false)
                        .html('<i class="bi bi-save me-1"></i> Simpan Keluhan');
                }
            }));
        });

    // ==========================================
    // EDIT COMPLAINT
    // ==========================================

    $(document)
        .off("click.complaintsEdit", ".btn-edit-complaint")
        .on("click.complaintsEdit", ".btn-edit-complaint", function () {
            const id = $(this).attr("data-id");

            if (!id) {
                Swal.fire("Error", "ID keluhan tidak ditemukan.", "error");
                return;
            }

            openEditModal(id);
        });

    function openEditModal(id) {
        hideModalAlert($editAlert);

        if ($editForm.length) $editForm[0].reset();

        currentEditAssetID = "";
        resetEditImagePreview();

        $("#editLocationName").val("");
        $("#editAssetName").val("");

        Swal.fire({
            title: "Memuat Data...",
            text: "Mengambil data keluhan dari server",
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        $.ajax(ajaxOptions({
            url: `${COMPLAINT_URL}/${encodeURIComponent(id)}`,
            method: "GET",
            dataType: "json",

            success: function (response) {
                Swal.close();

                const item = response.data || response;

                if (!item || !item.id) {
                    Swal.fire("Error", "Data keluhan tidak ditemukan.", "error");
                    return;
                }

                $("#editComplaintId").val(item.id);

                $("#editUserID").val(
                    item.userID ?? item.user_id ?? ""
                );

                $("#editTitle").val(item.title || "");
                $("#editDescription").val(item.description || "");
                $("#editPriority").val(item.priority ?? 0);

                const currentStatus = String(item.status || "low").toLowerCase();

                $("#editStatus").val(
                    ["low", "medium", "high", "critical"].includes(currentStatus)
                        ? currentStatus
                        : "low"
                );

                $("#editNote").val(item.note || "");

                $("#editIsFixed").prop(
                    "checked",
                    item.is_fixed === true || item.is_fixed === "true"
                );

                showCurrentEditImage(item.image_path);

                // Simpan ID aset lama untuk dikirim kembali saat update.
                // Pengguna tidak dapat mengubah aset melalui modal.
                currentEditAssetID = String(
                    item.assetID ??
                    item.asset_id ??
                    item.assetId ??
                    item.asset?.asset_id ??
                    item.asset?.assetID ??
                    item.asset?.id ??
                    ""
                );

                
const assetID = String(
    item.assetID ??
    item.asset_id ??
    item.assetId ??
    item.asset?.asset_id ??
    item.asset?.assetID ??
    item.asset?.id ??
    ""
);

$.when(
    $.ajax(ajaxOptions({
        url: ASSET_URL,
        method: "GET",
        dataType: "json",
        cache: false
    })),
    $.ajax(ajaxOptions({
        url: LOCATION_URL,
        method: "GET",
        dataType: "json",
        cache: false
    }))
)
.done(function (assetResult, locationResult) {
    // Respons $.when berisi [response, status, xhr].
    allAssets = extractList(assetResult[0]);
    allLocations = extractList(locationResult[0]);

    const selectedAsset = allAssets.find(function (asset) {
        return getAssetID(asset) === assetID;
    });

    // Simpan ID aset lama untuk proses update.
    currentEditAssetID = assetID;

    // Nama aset dari data master aset.
    const assetName = selectedAsset
        ? getAssetLabel(selectedAsset)
        : getComplaintAssetName(item);

    // Cari ID lokasi dari data master aset.
    let locationID = selectedAsset
        ? getAssetLocationID(selectedAsset)
        : "";

    // Jika lokasi belum ditemukan, gunakan relasi dari complaint.
    if (!locationID) {
        const location = item.asset?.location;

        locationID = String(
            item.asset?.location_detail?.location_id ??
            item.asset?.location_detail?.locationID ??
            item.asset?.location_detail?.id ??
            item.asset?.locationDetail?.id ??
            (
                location && typeof location === "object"
                    ? location.location_id ??
                      location.locationID ??
                      location.id
                    : location
            ) ??
            item.locationID ??
            item.location_id ??
            ""
        );
    }

    // Cari nama lokasi berdasarkan ID lokasi.
    const selectedLocation = allLocations.find(function (location) {
        return getLocationID(location) === String(locationID);
    });

    const locationName = selectedLocation
        ? getLocationName(selectedLocation)
        : getComplaintLocationName(item);

    $("#editAssetName").val(
        assetName && assetName !== "-" ? assetName : "Aset tidak ditemukan"
    );

    $("#editLocationName").val(
        locationName && locationName !== "-"
            ? locationName
            : "Lokasi tidak ditemukan"
    );

    console.log("[COMPLAINT] Hasil pengisian modal edit:", {
        complaintID: item.id,
        assetID: assetID,
        assetName: assetName,
        locationID: locationID,
        locationName: locationName,
        assetMasterFound: Boolean(selectedAsset),
        locationMasterFound: Boolean(selectedLocation)
    });

    if (editModalEl) {
        bootstrap.Modal.getOrCreateInstance(editModalEl).show();
    }
})
.fail(function (xhr) {
    console.error(
        "[COMPLAINT] Gagal memuat data master aset/lokasi:",
        xhr.status,
        xhr.responseText
    );

    $("#editAssetName").val("Gagal memuat aset");
    $("#editLocationName").val("Gagal memuat lokasi");

    if (editModalEl) {
        bootstrap.Modal.getOrCreateInstance(editModalEl).show();
    }
});
            
            },

            error: function (xhr) {
                Swal.close();

                console.error(
                    "[COMPLAINT] Gagal mengambil data edit:",
                    xhr.status,
                    xhr.responseText
                );

                Swal.fire(
                    "Gagal Mengambil Data",
                    apiErrorMessage(xhr, "Gagal memuat detail keluhan"),
                    "error"
                );
            }
        }));
    }

    // ==========================================
    // SIMPAN PERUBAHAN COMPLAINT
    // ==========================================

    $(document)
        .off("submit.complaintsEdit", "#editComplaintForm")
        .on("submit.complaintsEdit", "#editComplaintForm", function (event) {
            event.preventDefault();
            hideModalAlert($editAlert);

            const id = $("#editComplaintId").val();

            if (!id) {
                showModalAlert($editAlert, "ID keluhan tidak ditemukan. Muat ulang halaman.");
                return;
            }

            const userID = String($("#editUserID").val() || "").trim();
            const title = String($("#editTitle").val() || "").trim();
            const description = String($("#editDescription").val() || "").trim();
            const priority = Number($("#editPriority").val());
            const status = $("#editStatus").val() || "low";
            const note = String($("#editNote").val() || "").trim();
            const isFixed = $("#editIsFixed").is(":checked");

            // Asset ID lama tetap digunakan; lokasi dan aset tidak diedit.
            if (!currentEditAssetID) {
                showModalAlert(
                    $editAlert,
                    "ID aset lama tidak ditemukan. Muat ulang detail complaint."
                );
                return;
            }

            if (!title || !description) {
                showModalAlert($editAlert, "Judul dan deskripsi keluhan wajib diisi.");
                return;
            }

            if (!Number.isFinite(priority) || priority < 0 || priority > 1) {
                showModalAlert($editAlert, "Prioritas harus berada di antara 0 dan 1.");
                return;
            }

            const imageInput = $("#editImage")[0];
            const newImage = imageInput?.files?.[0];

            if (newImage && !validateImage(newImage, $editAlert, imageInput)) {
                return;
            }

            const formData = new FormData();

            if (userID) formData.append("userID", userID);

            // Kirim kembali aset lama agar relasi tetap sama.
            formData.append("assetID", currentEditAssetID);
            formData.append("title", title);
            formData.append("description", description);
            formData.append("priority", String(priority));
            formData.append("status", status);
            formData.append("note", note);
            formData.append("is_fixed", String(isFixed));

            if (newImage) formData.append("image", newImage);

            const updateURL = `${COMPLAINT_URL}/${encodeURIComponent(id)}`;

            $updateButton
                .prop("disabled", true)
                .html(`
                    <span class="spinner-border spinner-border-sm me-2"></span>
                    Menyimpan Perubahan...
                `);

            $.ajax(ajaxOptions({
                url: updateURL,
                method: "PUT",
                contentType: false,
                processData: false,
                dataType: "json",
                data: formData,

                success: function (response) {
                    if (editModalEl) {
                        bootstrap.Modal.getOrCreateInstance(editModalEl).hide();
                    }

                    $editForm[0].reset();
                    currentEditAssetID = "";
                    resetEditImagePreview();
                    loadComplaints();

                    Swal.fire({
                        icon: "success",
                        title: "Berhasil!",
                        text: response.message || "Data keluhan berhasil diperbarui.",
                        timer: 2000,
                        showConfirmButton: false
                    });
                },

                error: function (xhr, status, error) {
                    console.error(
                        "[COMPLAINT] Update gagal:",
                        xhr.status,
                        status,
                        error,
                        xhr.responseText
                    );

                    showModalAlert(
                        $editAlert,
                        apiErrorMessage(xhr, "Gagal memperbarui keluhan")
                    );
                },

                complete: function () {
                    $updateButton
                        .prop("disabled", false)
                        .html('<i class="bi bi-save me-1"></i> Simpan Perubahan');
                }
            }));
        });

    // ==========================================
    // DETAIL COMPLAINT
    // ==========================================

    $(document)
        .off("click.complaintsDetail", ".btn-detail-complaint")
        .on("click.complaintsDetail", ".btn-detail-complaint", function () {
            const id = $(this).attr("data-id");

            if (!id) {
                Swal.fire("Error", "ID keluhan tidak ditemukan.", "error");
                return;
            }

            const item = complaints.find(
                complaint => String(complaint.id) === String(id)
            );

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
                        "Error",
                        apiErrorMessage(xhr, "Gagal memuat detail keluhan"),
                        "error"
                    );
                }
            }));
        });

    function displayDetail(item) {
        $("#detailComplaintCode").text(item.code || "-");
        $("#detailComplaintTitle").text(item.title || "-");

        $("#detailComplaintUser").text(
            item.user?.name ??
            item.user?.nama ??
            item.userID ??
            item.user_id ??
            "-"
        );

        $("#detailComplaintAsset").text(getComplaintAssetName(item));
        $("#detailComplaintPriority").text(Number(item.priority ?? 0).toFixed(2));

        $("#detailComplaintStatus").html(
            renderStatusBadge(normalizedStatus(item))
        );

        $("#detailComplaintFixed").html(renderFixedBadge(item.is_fixed));
        $("#detailComplaintDescription").text(item.description || "-");
        $("#detailComplaintNote").text(item.note || "-");
        $("#detailComplaintCreated").text(formatDate(item.created_at));
        $("#detailComplaintUpdated").text(formatDate(item.updated_at));

        $("#btnDetailToEditComplaint").attr("data-id", item.id);

        let $imageWrapper = $("#detailComplaintImageWrapper");

        if (!$imageWrapper.length) {
            $("#detailComplaintDescription")
                .closest(".col-12")
                .after(`
                    <div class="col-12 d-none" id="detailComplaintImageWrapper">
                        <div class="p-3 bg-light rounded border">
                            <div class="text-muted small mb-2">Lampiran Gambar</div>
                            <img id="detailComplaintImage"
                                 class="img-fluid rounded"
                                 alt="Lampiran keluhan"
                                 style="max-height:320px;object-fit:contain;">
                        </div>
                    </div>
                `);

            $imageWrapper = $("#detailComplaintImageWrapper");
        }

        if (item.image_path) {
            $("#detailComplaintImage").attr(
                "src",
                resolveImageURL(item.image_path)
            );

            $imageWrapper.removeClass("d-none");
        } else {
            $("#detailComplaintImage").attr("src", "");
            $imageWrapper.addClass("d-none");
        }

        if (detailModalEl) {
            bootstrap.Modal.getOrCreateInstance(detailModalEl).show();
        }
    }

    $(document)
        .off("click.complaintsDetailToEdit", "#btnDetailToEditComplaint")
        .on("click.complaintsDetailToEdit", "#btnDetailToEditComplaint", function () {
            const id = $(this).attr("data-id");

            if (detailModalEl) {
                bootstrap.Modal.getOrCreateInstance(detailModalEl).hide();
            }

            if (id) openEditModal(id);
        });

    // ==========================================
    // TANDAI COMPLAINT SUDAH DIPERBAIKI
    // ==========================================

    $(document)
        .off("change.complaintsFixed", ".complaint-fixed-switch")
        .on("change.complaintsFixed", ".complaint-fixed-switch", function () {
            const $switch = $(this);
            const id = $switch.attr("data-id");

            if (!id) return;

            const isFixed = $switch.is(":checked");
            $switch.prop("disabled", true);

            $.ajax(ajaxOptions({
                url: `${COMPLAINT_URL}/${encodeURIComponent(id)}`,
                method: "PUT",
                contentType: "application/json",
                dataType: "json",
                data: JSON.stringify({ is_fixed: isFixed }),

                success: function (response) {
                    Swal.fire({
                        icon: "success",
                        title: "Berhasil",
                        text: response.message || "Status perbaikan berhasil diperbarui.",
                        timer: 1800,
                        showConfirmButton: false
                    });

                    loadComplaints();
                },

                error: function (xhr) {
                    $switch
                        .prop("checked", !isFixed)
                        .prop("disabled", false);

                    Swal.fire(
                        "Gagal",
                        apiErrorMessage(xhr, "Gagal memperbarui status perbaikan"),
                        "error"
                    );
                }
            }));
        });

    // ==========================================
    // HAPUS COMPLAINT
    // ==========================================

    $(document)
        .off("click.complaintsDelete", ".btn-delete-complaint")
        .on("click.complaintsDelete", ".btn-delete-complaint", async function () {
            const id = $(this).attr("data-id");
            const name = $(this).attr("data-name") || "keluhan ini";
            const code = $(this).attr("data-code") || "";

            if (!id) {
                Swal.fire("Error", "ID keluhan tidak ditemukan.", "error");
                return;
            }

            const confirmation = await Swal.fire({
                title: "Hapus Keluhan?",
                html: `
                    Apakah Anda yakin ingin menghapus keluhan
                    <strong>${escapeHtml(name)}</strong>
                    ${code ? " (" + escapeHtml(code) + ")" : ""}?
                `,
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#dc3545",
                cancelButtonColor: "#6c757d",
                confirmButtonText: "<i class='bi bi-trash me-1'></i> Ya, Hapus!",
                cancelButtonText: "Batal"
            });

            if (!confirmation.isConfirmed) return;

            Swal.fire({
                title: "Menghapus...",
                text: "Mohon tunggu sebentar",
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            $.ajax(ajaxOptions({
                url: `${COMPLAINT_URL}/${encodeURIComponent(id)}`,
                method: "DELETE",
                dataType: "json",

                success: function (response) {
                    loadComplaints();

                    Swal.fire({
                        icon: "success",
                        title: "Terhapus!",
                        text: response.message || "Keluhan berhasil dihapus.",
                        timer: 1800,
                        showConfirmButton: false
                    });
                },

                error: function (xhr) {
                    Swal.fire(
                        "Gagal Menghapus",
                        apiErrorMessage(xhr, "Gagal menghapus keluhan"),
                        "error"
                    );
                }
            }));
        });

    // ==========================================
    // INISIALISASI HALAMAN
    // ==========================================

    console.log("[COMPLAINT] Halaman berhasil diinisialisasi.");
    loadComplaints();
}

// ==========================================
// DETEKSI HALAMAN DINAMIS
// ==========================================

(function () {
    "use strict";

    function tryInitComplaintsPage() {
        if (typeof window.initComplaintsPage === "function") {
            window.initComplaintsPage();
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", tryInitComplaintsPage);
    } else {
        tryInitComplaintsPage();
    }

    const observer = new MutationObserver(function () {
        tryInitComplaintsPage();
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
})();

window.initComplaintsPage = initComplaintsPage;
