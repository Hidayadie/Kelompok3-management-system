/**
 * AJAX & Modal CRUD Lokasi - Sistem Inventaris Cerdas
 */

//const API_BASE = "http://localhost:8080/api/private";

const API_BASE = window.APP_CONFIG.API_BASE_URL; //"http://localhost:8080",
const FRONTEND_BASE_URL= window.APP_CONFIG.BASIC_URL; //"http://localhost:8088",
const LOCATION_URL = `${API_BASE}/api/private/location`;

$(document).ready(function () {
    // DOM References
    const $tableBody = $("#locationTableBody");
    const $alert = $("#locationAlert");
    const $filter = $("#locationFilter");
    const $statusFilter = $("#statusFilter");
    const $refresh = $("#refreshLocations");
    const $count = $("#locationCount");

    // Modals
    const addModalEl = document.getElementById("addLocationModal");
    const editModalEl = document.getElementById("editLocationModal");
    const detailModalEl = document.getElementById("detailLocationModal");

    // Forms & Controls
    const $addLocationForm = $("#addLocationForm");
    const $editLocationForm = $("#editLocationForm");
    const $addLocationAlert = $("#addLocationAlert");
    const $editLocationAlert = $("#editLocationAlert");
    const $saveLocationButton = $("#saveLocationButton");
    const $updateLocationButton = $("#updateLocationButton");

    // Local Cache
    let locations = [];

    // Inisialisasi Select2 Filter
    if ($filter.length && $.fn.select2) {
        $filter.select2({
            theme: "bootstrap-5",
            width: "100%",
            placeholder: "Cari atau pilih lokasi...",
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

    function renderStatusBadge(isActive) {
        if (isActive === true || isActive === "true") {
            return '<span class="badge bg-success"><i class="bi bi-check2 me-1"></i>Aktif</span>';
        }
        return '<span class="badge bg-secondary"><i class="bi bi-dash-circle me-1"></i>Tidak Aktif</span>';
    }

    function getParentLocationName(parentId) {
        if (!parentId) {
            return '<span class="badge bg-light text-secondary border">(Lokasi Utama)</span>';
        }
        const parent = locations.find(loc => (loc.location_id ?? loc.id) === parentId);
        if (parent) {
            return `<span class="fw-semibold text-primary"><i class="bi bi-diagram-2 me-1"></i>${escapeHtml(parent.location_name ?? parent.name)}</span>`;
        }
        return '<span class="text-muted small font-monospace">' + escapeHtml(parentId.substring(0, 8)) + '...</span>';
    }

    function populateParentSelect($target, excludeId = null, selectedParentId = null) {
        $target.empty().append(new Option("(Tidak Ada / Lokasi Utama)", ""));
        locations.forEach(function (loc) {
            const locId = loc.location_id ?? loc.id;
            const locName = loc.location_name ?? loc.name ?? "Tanpa nama";

            // Jangan biarkan lokasi memilih dirinya sendiri sebagai parent
            if (excludeId && String(locId) === String(excludeId)) {
                return;
            }

            const opt = new Option(locName, locId);
            if (selectedParentId && String(locId) === String(selectedParentId)) {
                opt.selected = true;
            }
            $target.append(opt);
        });

        if (selectedParentId) {
            $target.val(String(selectedParentId));
        } else {
            $target.val("");
        }
    }

    // ==========================================
    // READ / LOAD TABLE LOKASI
    // ==========================================

   function renderTable() {
    const selectedId = $filter.length ? $filter.val() : "";
    const statusVal = $statusFilter.length ? $statusFilter.val() : "";

    let filtered = locations;

    // Filter berdasarkan ID lokasi / Select2
    if (selectedId) {
        filtered = filtered.filter(item =>
            String(item.location_id ?? item.id) === String(selectedId)
        );
    }

    // Filter berdasarkan status aktif / tidak aktif
    if (statusVal === "active") {
        filtered = filtered.filter(item => item.is_active === true);
    } else if (statusVal === "inactive") {
        filtered = filtered.filter(item => item.is_active === false);
    }

    // Hancurkan instance DataTables sebelumnya jika ada
    if ($.fn.DataTable.isDataTable("#locationTable")) {
        $("#locationTable").DataTable().destroy();
    }

    // Kosongkan tabel sebelum dirender ulang
    $tableBody.empty();

    // Render data lokasi
    filtered.forEach(function (item, index) {
        const id = item.location_id ?? item.id;
        const name = item.location_name ?? item.name ?? "-";
        const $row = $("<tr>");

        // 1. Nomor
        $("<td>")
            .addClass("text-center")
            .text(index + 1)
            .appendTo($row);

        // 2. Nama lokasi
        $("<td>").html(`
            <span class="fw-bold text-dark">
                ${escapeHtml(name)}
            </span>
        `).appendTo($row);

        // 3. Lokasi induk
        $("<td>")
            .html(getParentLocationName(item.parent_id))
            .appendTo($row);

        // 4. Deskripsi
        $("<td>")
            .addClass("text-secondary small")
            .html(escapeHtml(item.description || "-"))
            .appendTo($row);

        // 5. Status
        $("<td>")
            .html(renderStatusBadge(item.is_active))
            .appendTo($row);

        // 6. Terakhir diperbarui
        $("<td>")
            .addClass("small text-muted")
            .text(formatDate(item.updated_at || item.created_at))
            .appendTo($row);

        // 7. Tombol aksi
        const $actionTd = $("<td>").addClass("text-center");
        const $actionGroup = $("<div>")
            .addClass("btn-group btn-group-sm")
            .attr("role", "group");

        // Tombol detail
        $("<button>", {
            type: "button",
            class: "btn btn-outline-info btn-detail-location",
            title: "Detail Lokasi"
        })
            .attr("data-id", id)
            .html('<i class="bi bi-eye"></i>')
            .appendTo($actionGroup);

        // Tombol ubah
        $("<button>", {
            type: "button",
            class: "btn btn-outline-warning btn-edit-location",
            title: "Ubah Lokasi"
        })
            .attr("data-id", id)
            .html('<i class="bi bi-pencil-square"></i>')
            .appendTo($actionGroup);

        // Tombol hapus
        $("<button>", {
            type: "button",
            class: "btn btn-outline-danger btn-delete-location",
            title: "Hapus Lokasi"
        })
            .attr("data-id", id)
            .attr("data-name", name)
            .html('<i class="bi bi-trash"></i>')
            .appendTo($actionGroup);

        $actionTd.append($actionGroup);
        $row.append($actionTd);

        $tableBody.append($row);
    });

    // Perbarui jumlah data
    $count.text(
        `Menampilkan ${filtered.length} dari ${locations.length} lokasi`
    );

    // Inisialisasi DataTables
    $("#locationTable").DataTable({
        pageLength: 10,
        lengthMenu: [
            [10, 25, 50, 100],
            [10, 25, 50, 100]
        ],
        searching: true,
        ordering: true,
        info: true,
        paging: true,
        autoWidth: false,
        order: [],
        columnDefs: [
            {
                targets: [0, 6],
                orderable: false
            }
        ],
        language: {
            emptyTable: "Tidak ada data lokasi ditemukan.",
            zeroRecords: "Tidak ada data yang cocok.",
            search: "Cari:",
            searchPlaceholder: "Cari lokasi...",
            lengthMenu: "Tampilkan _MENU_ data",
            info: "Menampilkan _START_ sampai _END_ dari _TOTAL_ lokasi",
            infoEmpty: "Tidak ada data lokasi",
            infoFiltered: "(difilter dari _MAX_ total lokasi)",
            paginate: {
                first: "Pertama",
                last: "Terakhir",
                next: "Berikutnya",
                previous: "Sebelumnya"
            }
        }
    });
}

    function loadLocations() {
        $refresh.prop("disabled", true);
        $tableBody.html(`
            <tr>
                <td colspan="7" class="text-center py-4">
                    <span class="spinner-border spinner-border-sm text-primary me-2"></span>
                    Memuat data lokasi...
                </td>
            </tr>
        `);

        hideAlert();

        $.ajax({
            url: LOCATION_URL,
            method: "GET",
            dataType: "json",
            xhrFields: { withCredentials: true },
            headers: { Accept: "application/json" },
            cache: false,
            success: function (response) {
                if (!response || !Array.isArray(response.data)) {
                    showAlert("Format data respons lokasi tidak valid.");
                    $tableBody.html(`
                        <tr>
                            <td colspan="7" class="text-center text-danger py-4">
                                Format data tidak valid.
                            </td>
                        </tr>
                    `);
                    return;
                }

                locations = response.data;

                // Perbarui Dropdown Filter Select2
                if ($filter.length) {
                    const currentVal = $filter.val();
                    $filter.empty().append(new Option("Semua Lokasi", "", true, true));
                    locations.forEach(function (loc) {
                        const locId = loc.location_id ?? loc.id;
                        const locName = loc.location_name ?? loc.name ?? "Tanpa nama";
                        $filter.append(new Option(locName, String(locId)));
                    });

                    if (currentVal && locations.some(l => String(l.location_id ?? l.id) === String(currentVal))) {
                        $filter.val(currentVal).trigger("change.select2");
                    } else {
                        $filter.val("").trigger("change.select2");
                    }
                }

                renderTable();

                if (locations.length === 0) {
                    showAlert("Belum ada data lokasi yang terdaftar.", "info");
                }
            },
            error: function (xhr, status, error) {
                console.error("AJAX loadLocations gagal:", xhr.status, status, error, xhr.responseText);
                let message = "Gagal memuat data lokasi.";
                if (xhr.status === 401 || xhr.status === 403) {
                    message = "Sesi login berakhir atau akses ditolak. Silakan login kembali.";
                } else if (xhr.status === 404) {
                    message = "Endpoint data lokasi tidak ditemukan.";
                } else if (xhr.status === 0) {
                    message = "Tidak dapat terhubung ke server API. Periksa server dan CORS.";
                }

                showAlert(message, "danger");
                $tableBody.html(`
                    <tr>
                        <td colspan="7" class="text-center text-danger py-4">
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

    // Filter events
    $filter.on("change", renderTable);
    $statusFilter.on("change", renderTable);
    $refresh.on("click", function () {
        loadLocations();
    });

    // ==========================================
    // CREATE LOCATION (TAMBAH LOKASI)
    // ==========================================

    $("#addLocationButton").on("click", function () {
        hideModalAlert($addLocationAlert);
        $addLocationForm[0].reset();
        $("#locationStatus").val("true");

        // Muat opsi lokasi induk
        populateParentSelect($("#locationParent"));

        if (addModalEl) {
            bootstrap.Modal.getOrCreateInstance(addModalEl).show();
        }
    });

    $addLocationForm.on("submit", function (event) {
        event.preventDefault();
        hideModalAlert($addLocationAlert);

        const name = $("#locationName").val().trim();
        const parentId = $("#locationParent").val() || null;
        const isActive = $("#locationStatus").val() === "true";
        const description = $("#locationDescription").val().trim();

        if (!name) {
            showModalAlert($addLocationAlert, "Nama lokasi wajib diisi.");
            return;
        }

        const payload = {
            location_name: name,
            description: description,
            parent_id: parentId,
            is_active: isActive
        };

        $saveLocationButton.prop("disabled", true).html(`
            <span class="spinner-border spinner-border-sm me-2"></span>
            Menyimpan...
        `);

        $.ajax({
            url: LOCATION_URL,
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
                $addLocationForm[0].reset();
                loadLocations();

                Swal.fire({
                    icon: "success",
                    title: "Berhasil!",
                    text: response.message || "Lokasi baru berhasil ditambahkan.",
                    timer: 2000,
                    showConfirmButton: false
                });
            },
            error: function (xhr) {
                console.error("Gagal menambahkan lokasi:", xhr.status, xhr.responseText);
                const resp = xhr.responseJSON || {};
                const message = resp.error || resp.message || "Gagal menyimpan lokasi baru.";
                showModalAlert($addLocationAlert, message, "danger");
            },
            complete: function () {
                $saveLocationButton.prop("disabled", false).html(`
                    <i class="bi bi-save me-1"></i> Simpan Lokasi
                `);
            }
        });
    });

    // ==========================================
    // DETAIL LOCATION (LIHAT DETAIL LOKASI)
    // ==========================================

    $(document).on("click", ".btn-detail-location", function () {
        const id = $(this).attr("data-id");
        if (!id) return;

        const item = locations.find(l => (l.location_id ?? l.id) === id);
        if (item) {
            displayDetail(item);
        } else {
            $.ajax({
                url: `${LOCATION_URL}/${id}`,
                method: "GET",
                dataType: "json",
                xhrFields: { withCredentials: true },
                headers: { Accept: "application/json" },
                success: function (response) {
                    displayDetail(response.data || response);
                },
                error: function () {
                    Swal.fire("Error", "Gagal mengambil data detail lokasi.", "error");
                }
            });
        }
    });

    function displayDetail(item) {
        const id = item.location_id ?? item.id;
        const name = item.location_name ?? item.name ?? "-";

        $("#detailLocationId").text(id);
        $("#detailLocationName").text(name);
        $("#detailLocationParent").html(getParentLocationName(item.parent_id));
        $("#detailLocationStatus").html(renderStatusBadge(item.is_active));
        $("#detailLocationUpdatedAt").text(formatDate(item.updated_at || item.created_at));
        $("#detailLocationDescription").text(item.description || "(Tidak ada deskripsi)");

        $("#btnDetailToEditLocation").attr("data-id", id);

        if (detailModalEl) {
            bootstrap.Modal.getOrCreateInstance(detailModalEl).show();
        }
    }

    $("#btnDetailToEditLocation").on("click", function () {
        const id = $(this).attr("data-id");
        if (detailModalEl) {
            bootstrap.Modal.getOrCreateInstance(detailModalEl).hide();
        }
        if (id) {
            openEditModal(id);
        }
    });

    // ==========================================
    // UPDATE LOCATION (UBAH / EDIT LOKASI)
    // ==========================================

    $(document).on("click", ".btn-edit-location", function () {
        const id = $(this).attr("data-id");
        if (!id) {
            Swal.fire("Error", "ID lokasi tidak ditemukan.", "error");
            return;
        }
        openEditModal(id);
    });

    function openEditModal(id) {
        hideModalAlert($editLocationAlert);
        $editLocationForm[0].reset();

        Swal.fire({
            title: "Memuat Data...",
            text: "Mengambil rincian lokasi",
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        $.ajax({
            url: `${LOCATION_URL}/${encodeURIComponent(id)}`,
            method: "GET",
            dataType: "json",
            xhrFields: { withCredentials: true },
            headers: { Accept: "application/json" },
            success: function (response) {
                Swal.close();
                const item = response.data || response;
                const locId = item.location_id ?? item.id;

                if (!locId) {
                    Swal.fire("Error", "Data lokasi tidak ditemukan.", "error");
                    return;
                }

                $("#editLocationId").val(locId);
                $("#editLocationName").val(item.location_name ?? item.name ?? "");
                $("#editLocationStatus").val(item.is_active ? "true" : "false");
                $("#editLocationDescription").val(item.description || "");

                // Muat opsi lokasi induk dengan mengecualikan ID sendiri
                populateParentSelect($("#editLocationParent"), locId, item.parent_id);

                if (editModalEl) {
                    bootstrap.Modal.getOrCreateInstance(editModalEl).show();
                }
            },
            error: function (xhr) {
                console.error("GET detail lokasi gagal:", xhr.status, xhr.responseText);
                Swal.fire({
                    icon: "error",
                    title: "Gagal Mengambil Data",
                    text: xhr.responseJSON?.error || `Request gagal dengan status ${xhr.status}`
                });
            }
        });
    }

    $editLocationForm.on("submit", function (event) {
        event.preventDefault();
        hideModalAlert($editLocationAlert);

        const id = $("#editLocationId").val();
        if (!id) {
            showModalAlert($editLocationAlert, "ID lokasi hilang. Silakan muat ulang halaman.");
            return;
        }

        const name = $("#editLocationName").val().trim();
        const parentId = $("#editLocationParent").val() || null;
        const isActive = $("#editLocationStatus").val() === "true";
        const description = $("#editLocationDescription").val().trim();

        if (!name) {
            showModalAlert($editLocationAlert, "Nama lokasi wajib diisi.");
            return;
        }

        const payload = {
            location_name: name,
            description: description,
            parent_id: parentId,
            is_active: isActive
        };

        $updateLocationButton.prop("disabled", true).html(`
            <span class="spinner-border spinner-border-sm me-2"></span>
            Menyimpan Perubahan...
        `);

        $.ajax({
            url: `${LOCATION_URL}/${encodeURIComponent(id)}`,
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
                loadLocations();

                Swal.fire({
                    icon: "success",
                    title: "Berhasil!",
                    text: response.message || "Data lokasi berhasil diperbarui.",
                    timer: 2000,
                    showConfirmButton: false
                });
            },
            error: function (xhr) {
                console.error("Gagal memperbarui lokasi:", xhr.status, xhr.responseText);
                const resp = xhr.responseJSON || {};
                const message = resp.error || resp.message || "Gagal memperbarui data lokasi.";
                showModalAlert($editLocationAlert, message, "danger");
            },
            complete: function () {
                $updateLocationButton.prop("disabled", false).html(`
                    <i class="bi bi-save me-1"></i> Simpan Perubahan
                `);
            }
        });
    });

    // ==========================================
    // DELETE LOCATION (HAPUS LOKASI)
    // ==========================================

    $(document).on("click", ".btn-delete-location", async function () {
        const id = $(this).attr("data-id");
        const name = $(this).attr("data-name") || "lokasi ini";

        if (!id) {
            Swal.fire("Error", "ID lokasi tidak ditemukan.", "error");
            return;
        }

        const confirm = await Swal.fire({
            title: "Hapus Lokasi?",
            html: `Apakah Anda yakin ingin menghapus lokasi <strong>${escapeHtml(name)}</strong>?`,
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
            url: `${LOCATION_URL}/${encodeURIComponent(id)}`,
            method: "DELETE",
            dataType: "json",
            xhrFields: { withCredentials: true },
            headers: { Accept: "application/json" },
            success: function (response) {
                loadLocations();
                Swal.fire({
                    icon: "success",
                    title: "Terhapus!",
                    text: response.message || "Lokasi berhasil dihapus.",
                    timer: 1800,
                    showConfirmButton: false
                });
            },
            error: function (xhr) {
                console.error("Gagal menghapus lokasi:", xhr.status, xhr.responseText);
                const resp = xhr.responseJSON || {};
                let message = resp.error || resp.message || `Gagal menghapus lokasi (HTTP ${xhr.status}).`;

                if (xhr.status === 409) {
                    message = "Lokasi tidak dapat dihapus karena masih memiliki sub-lokasi / ruangan turunan.";
                }

                Swal.fire({
                    icon: "error",
                    title: "Gagal Menghapus",
                    text: message
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
    loadLocations();
});
