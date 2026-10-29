
"use strict";

$(document).ready(function () {
    // =========================================================
    // 1. KONFIGURASI ENDPOINT
    // =========================================================
    const API_BASE = window.APP_CONFIG.API_BASE_URL; //"http://localhost:8080",
    const FRONTEND_BASE_URL= window.APP_CONFIG.BASIC_URL; //"http://localhost:8088",
    
    
    const API = `${API_BASE}/api/private/asset-broken`;
    const ASSETS_API = `${API_BASE}/api/private/assets`;
    const LOCATION_API = `${API_BASE}/api/private/location`;

    const $tableBody = $("#assetBrokenTableBody");
    const $form = $("#assetBrokenForm");
    const $search = $("#assetBrokenSearch");
    const $statusFilter = $("#assetBrokenStatusFilter");
    const $locationID = $("#locationID");
    const $assetID = $("#assetID");
    const $btnSave = $("#btnSave");

    const modalElement = document.getElementById("assetBrokenModal");
    const detailModalElement = document.getElementById("assetBrokenDetailModal");

    const formModal = bootstrap.Modal.getOrCreateInstance(modalElement);
    const detailModal = bootstrap.Modal.getOrCreateInstance(detailModalElement);

    let assetBrokenData = [];
    let assetsData = [];
    let locationsData = [];
    let assetOptionsLoaded = false;
    let currentEditID = null;

    // =========================================================
    // 2. HELPER
    // =========================================================
    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (char) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[char];
        });
    }

    function unwrapList(response) {
        if (Array.isArray(response)) return response;
        if (Array.isArray(response?.data)) return response.data;
        if (Array.isArray(response?.Data)) return response.Data;
        if (Array.isArray(response?.assets)) return response.assets;
        if (Array.isArray(response?.locations)) return response.locations;
        return [];
    }

    function apiRequest(url, method = "GET", data = null) {
        const options = {
            url: url,
            method: method,
            dataType: "json",
            xhrFields: {
                withCredentials: true
            },
            headers: {
                "Accept": "application/json"
            }
        };

        if (data !== null) {
            options.contentType = "application/json; charset=utf-8";
            options.data = JSON.stringify(data);
        }

        return $.ajax(options);
    }

    function getLocationID(item) {
        return item?.location_id ??
            item?.LocationID ??
            item?.locationID ??
            item?.locationId ??
            item?.id ??
            item?.ID ??
            "";
    }

    function getLocationName(item) {
        return item?.location_name ??
            item?.nama_lokasi ??
            item?.name ??
            item?.Name ??
            item?.locationName ??
            item?.LocationName ??
            "";
    }

    function getAssetID(item) {
        return item?.asset_id ??
            item?.AssetID ??
            item?.assetID ??
            item?.id ??
            item?.ID ??
            "";
    }

    function getAssetCode(item) {
        return item?.code_asset ??
            item?.CodeAsset ??
            item?.codeAsset ??
            item?.asset_code ??
            item?.assetCode ??
            "";
    }

    function getAssetName(item) {
        return item?.nama_asset ??
            item?.NamaAsset ??
            item?.namaAsset ??
            item?.asset_name ??
            item?.assetName ??
            item?.name ??
            "";
    }

    function getAssetLocationID(item) {
        const nested = item?.location_detail ??
            item?.LocationDetail ??
            item?.location ??
            item?.Location ??
            {};

        return item?.location_id ??
            item?.LocationID ??
            item?.locationID ??
            item?.locationId ??
            nested?.location_id ??
            nested?.LocationID ??
            nested?.locationID ??
            nested?.locationId ??
            nested?.id ??
            nested?.ID ??
            "";
    }

    function getAssetDetail(item) {
        return item?.asset_detail ??
            item?.AssetDetail ??
            item?.asset ??
            item?.Asset ??
            {};
    }

    function getBrokenID(item) {
        return item?.rusak_id ??
            item?.RusakID ??
            item?.id ??
            item?.ID;
    }

    function getBrokenLocationName(item) {
        const asset = getAssetDetail(item);
        const location = asset?.location_detail ??
            asset?.LocationDetail ??
            asset?.location ??
            asset?.Location ??
            {};

        return location?.location_name ??
            location?.nama_lokasi ??
            location?.name ??
            location?.Name ??
            asset?.location_name ??
            asset?.locationName ??
            item?.location_name ??
            "-";
    }

    function getStatusLabel(status) {
        const labels = {
            rusak_ringan: "Rusak Ringan",
            rusak_sedang: "Rusak Sedang",
            rusak_berat: "Rusak Berat"
        };

        return labels[status] || status || "-";
    }

    function statusBadge(status) {
        const colors = {
            rusak_ringan: "bg-warning text-dark",
            rusak_sedang: "bg-info text-dark",
            rusak_berat: "bg-danger"
        };

        return `<span class="badge ${colors[status] || "bg-secondary"}">
            ${escapeHTML(getStatusLabel(status))}
        </span>`;
    }

    function showPageAlert(message, type = "danger") {
        $("#pageAlert").html(`
            <div class="alert alert-${type} alert-dismissible fade show">
                ${escapeHTML(message)}
                <button type="button" class="btn-close"
                    data-bs-dismiss="alert"></button>
            </div>
        `);
    }

    function showFormAlert(message, type = "danger") {
        $("#formAlert").html(`
            <div class="alert alert-${type} alert-dismissible fade show">
                ${escapeHTML(message)}
                <button type="button" class="btn-close"
                    data-bs-dismiss="alert"></button>
            </div>
        `);
    }

    function errorMessage(xhr, fallback) {
        return xhr?.responseJSON?.error ||
            xhr?.responseJSON?.message ||
            fallback;
    }

    // =========================================================
    // 3. LOAD LOKASI
    // =========================================================
    async function loadLocations(selectedLocationID = "") {
        $locationID.html('<option value="">Memuat lokasi...</option>');

        try {
            const response = await apiRequest(LOCATION_API);
            locationsData = unwrapList(response);

            $locationID.empty().append(
                new Option("-- Pilih Lokasi --", "")
            );

            locationsData.forEach(function (location) {
                const id = getLocationID(location);
                const name = getLocationName(location);

                if (id === "" || name === "") return;

                const option = new Option(name, String(id));

                if (String(id) === String(selectedLocationID)) {
                    option.selected = true;
                }

                $locationID.append(option);
            });

            if (selectedLocationID !== "") {
                $locationID.val(String(selectedLocationID));
            }
        } catch (xhr) {
            console.error("Gagal memuat lokasi:", xhr);

            $locationID.html(
                '<option value="">Gagal memuat lokasi</option>'
            );

            throw xhr;
        }
    }

    // =========================================================
    // 4. LOAD ASET BERDASARKAN LOKASI
    // =========================================================
    async function loadAssetsByLocation(
        locationID,
        selectedAssetID = ""
    ) {
        $assetID.empty().append(
            new Option("-- Pilih Aset --", "")
        );

        $assetID.prop("disabled", true);
        $("#selectedAssetInfo").prop("hidden", true);
        assetOptionsLoaded = false;

        if (!locationID) {
            $assetID.empty().append(
                new Option("-- Pilih lokasi terlebih dahulu --", "")
            );
            return;
        }

        try {
            const response = await apiRequest(ASSETS_API);
            assetsData = unwrapList(response);

            const filteredAssets = assetsData.filter(function (asset) {
                return String(getAssetLocationID(asset)) ===
                    String(locationID);
            });

            $assetID.empty().append(
                new Option("-- Pilih Aset --", "")
            );

            filteredAssets.forEach(function (asset) {
                const id = getAssetID(asset);
                const code = getAssetCode(asset);
                const name = getAssetName(asset);

                if (id === "") return;

                const label = `${code || "Tanpa kode"} - ${name || "Tanpa nama"}`;
                const option = new Option(label, String(id));

                if (String(id) === String(selectedAssetID)) {
                    option.selected = true;
                }

                $assetID.append(option);
            });

            assetOptionsLoaded = true;

            if (filteredAssets.length === 0) {
                $assetID.empty().append(
                    new Option("-- Tidak ada aset di lokasi ini --", "")
                );
                return;
            }

            $assetID.prop("disabled", false);

            if (selectedAssetID !== "") {
                $assetID.val(String(selectedAssetID));
                updateSelectedAssetInfo();
            }
        } catch (xhr) {
            console.error("Gagal memuat aset:", xhr);

            $assetID.empty().append(
                new Option("-- Gagal memuat aset --", "")
            );

            showFormAlert(
                errorMessage(xhr, "Gagal memuat data aset.")
            );

            throw xhr;
        }
    }

    function updateSelectedAssetInfo() {
        const id = String($assetID.val() || "");

        const asset = assetsData.find(function (item) {
            return String(getAssetID(item)) === id;
        });

        if (!asset) {
            $("#selectedAssetInfo").prop("hidden", true);
            return;
        }

        $("#selectedAssetText").text(
            `${getAssetCode(asset)} - ${getAssetName(asset)}`
        );

        $("#selectedAssetInfo").prop("hidden", false);
    }

    // =========================================================
    // 5. LOAD DATA ASSET BROKEN
    // =========================================================
    async function loadAssetBroken() {
        $tableBody.html(`
            <tr>
                <td colspan="9" class="text-center">
                    <span class="spinner-border spinner-border-sm"></span>
                    Memuat data...
                </td>
            </tr>
        `);

        try {
            const response = await apiRequest(API);
            assetBrokenData = unwrapList(response);
            renderAssetBroken();
        } catch (xhr) {
            console.error("Gagal memuat aset rusak:", xhr);

            $tableBody.html(`
                <tr>
                    <td colspan="9" class="text-center text-danger">
                        ${escapeHTML(errorMessage(
                            xhr,
                            "Gagal memuat data aset rusak."
                        ))}
                    </td>
                </tr>
            `);
        }
    }

    // =========================================================
    // 6. RENDER TABEL DAN FILTER
    // =========================================================
  function renderAssetBroken() {
    const keyword = String($search.val() || "")
        .toLowerCase()
        .trim();

    const statusSelected = $statusFilter.val();

    // Filter data berdasarkan keyword dan status
    const filtered = assetBrokenData.filter(function (item) {
        const asset = getAssetDetail(item);

        const text = [
            item.code_rusak,
            item.CodeRusak,
            getBrokenLocationName(item),
            getAssetCode(asset),
            getAssetName(asset),
            item.description,
            item.status
        ].join(" ").toLowerCase();

        const matchKeyword = text.includes(keyword);
        const matchStatus = !statusSelected ||
            item.status === statusSelected;

        return matchKeyword && matchStatus;
    });

    // Hancurkan DataTables lama jika sudah ada
    if ($.fn.DataTable.isDataTable("#assetBrokenTable")) {
        $("#assetBrokenTable").DataTable().destroy();
    }

    // Kosongkan tabel sebelum render ulang
    $tableBody.empty();

    // Render baris data
    filtered.forEach(function (item, index) {
        const asset = getAssetDetail(item);
        const id = getBrokenID(item);
        const code = item.code_rusak ?? item.CodeRusak ?? "-";

        const row = `
            <tr>
                <td class="text-center">${index + 1}</td>
                <td>${escapeHTML(code)}</td>
                <td>${escapeHTML(getBrokenLocationName(item))}</td>
                <td>${escapeHTML(getAssetCode(asset) || "-")}</td>
                <td>${escapeHTML(getAssetName(asset) || "-")}</td>
                <td class="text-center">${escapeHTML(item.qty_rusak ?? "-")}</td>
                <td>${statusBadge(item.status)}</td>
                <td>${escapeHTML(item.description || "-")}</td>
                <td class="text-center">
                    <div class="btn-group btn-group-sm">
                        <button
                            type="button"
                            class="btn btn-outline-info btn-detail"
                            data-id="${escapeHTML(id)}"
                            title="Detail">
                            <i class="bi bi-eye"></i>
                        </button>

                        <button
                            type="button"
                            class="btn btn-outline-primary btn-edit"
                            data-id="${escapeHTML(id)}"
                            title="Ubah">
                            <i class="bi bi-pencil-square"></i>
                        </button>

                        <button
                            type="button"
                            class="btn btn-outline-danger btn-delete"
                            data-id="${escapeHTML(id)}"
                            data-code="${escapeHTML(code)}"
                            title="Hapus">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;

        $tableBody.append(row);
    });

    // Perbarui jumlah data
    $("#assetBrokenCount").text(
        `Menampilkan ${filtered.length} dari ${assetBrokenData.length} data`
    );

    // Inisialisasi DataTables
    $("#assetBrokenTable").DataTable({
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
                targets: [0, 8],
                orderable: false
            }
        ],
        language: {
            emptyTable: "Tidak ada data yang ditemukan.",
            zeroRecords: "Tidak ada data yang cocok.",
            search: "Cari:",
            searchPlaceholder: "Cari data aset rusak...",
            lengthMenu: "Tampilkan _MENU_ data",
            info: "Menampilkan _START_ sampai _END_ dari _TOTAL_ data",
            infoEmpty: "Tidak ada data",
            infoFiltered: "(difilter dari _MAX_ total data)",
            paginate: {
                first: "Pertama",
                last: "Terakhir",
                next: "Berikutnya",
                previous: "Sebelumnya"
            }
        }
    });
}
    // =========================================================
    // 7. RESET FORM DAN KODE KERUSAKAN
    // =========================================================
    function generateCodeRusak() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        const suffix = Math.random().toString(36)
            .substring(2, 7).toUpperCase();

        return `RUSAK-${year}${month}${day}-${suffix}`;
    }

    function resetForm() {
        $form[0].reset();

        $("#rusakID").val("");
        $("#formAlert").empty();
        $("#selectedAssetInfo").prop("hidden", true);

        $locationID.empty().append(
            new Option("-- Pilih Lokasi --", "")
        );

        $assetID.empty().append(
            new Option("-- Pilih lokasi terlebih dahulu --", "")
        ).prop("disabled", true);

        $("#codeRusak").val(generateCodeRusak());
        $("#qtyRusak").val(1);
        $("#statusRusak").prop("checked", false);

        currentEditID = null;
        assetOptionsLoaded = false;
    }

    // =========================================================
    // 8. TAMBAH DATA
    // =========================================================
    async function openAddModal() {
        resetForm();

        $("#assetBrokenModalTitle").text("Tambah Aset Rusak");
        $btnSave.html('<i class="bi bi-save"></i> Simpan');

        formModal.show();

        try {
            await loadLocations();
        } catch (error) {
            showFormAlert("Lokasi gagal dimuat. Periksa endpoint lokasi.");
        }
    }

    // =========================================================
    // 9. EDIT DATA
    // =========================================================
    async function openEditModal(id) {
        resetForm();

        currentEditID = id;

        $("#assetBrokenModalTitle").text("Ubah Data Aset Rusak");
        $btnSave.html('<i class="bi bi-save"></i> Simpan Perubahan');

        formModal.show();

        try {
            const response = await apiRequest(`${API}/${encodeURIComponent(id)}`);
            const item = response?.data ?? response?.Data ?? response;

            if (!item || getBrokenID(item) == null) {
                throw new Error("Data aset rusak tidak ditemukan.");
            }

            $("#rusakID").val(getBrokenID(item));
            $("#codeRusak").val(item.code_rusak ?? item.CodeRusak ?? "");
            $("#qtyRusak").val(item.qty_rusak ?? item.QtyRusak ?? 1);
            $("#status").val(item.status ?? item.Status ?? "");
            $("#statusRusak").prop(
                "checked",
                Boolean(item.status_rusak ?? item.StatusRusak)
            );
            $("#description").val(
                item.description ?? item.Description ?? ""
            );

            const asset = getAssetDetail(item);
            const selectedAssetID =
                item.asset_id ?? item.AssetID ?? getAssetID(asset);

            // Tentukan lokasi dari aset yang terhubung.
            const locationID = getAssetLocationID(asset);

            // Muat lokasi dan pilih lokasi aset lama.
            await loadLocations(locationID);

            // Muat aset sesuai lokasi, lalu pilih aset lama.
            if (locationID !== "") {
                await loadAssetsByLocation(
                    locationID,
                    selectedAssetID
                );
            } else {
                showFormAlert(
                    "Lokasi aset lama tidak ditemukan. Periksa data relasi aset pada API."
                );
            }
        } catch (xhr) {
            console.error("Gagal membuka data edit:", xhr);

            showFormAlert(
                errorMessage(xhr, "Gagal mengambil detail aset rusak.")
            );
        }
    }

    // =========================================================
    // 10. SIMPAN CREATE / UPDATE
    // =========================================================
    async function saveAssetBroken(event) {
        event.preventDefault();

        $("#formAlert").empty();

        const id = $("#rusakID").val();
        const locationID = $locationID.val();
        const assetID = $assetID.val();
        const qtyRusak = Number($("#qtyRusak").val());
        const codeRusak = $("#codeRusak").val().trim();
        const status = $("#status").val();
        const statusRusak = $("#statusRusak").is(":checked");
        const description = $("#description").val().trim();

        if (!codeRusak) {
            showFormAlert("Kode kerusakan wajib diisi.");
            return;
        }

        if (!locationID) {
            showFormAlert("Silakan pilih lokasi.");
            return;
        }

        if (!assetOptionsLoaded) {
            showFormAlert("Daftar aset belum berhasil dimuat. Silakan coba lagi.");
            return;
        }

        if (!assetID) {
            showFormAlert("Silakan pilih aset.");
            return;
        }

        if (!Number.isInteger(qtyRusak) || qtyRusak < 1) {
            showFormAlert("Jumlah aset rusak minimal 1.");
            return;
        }

        if (!status) {
            showFormAlert("Silakan pilih tingkat kerusakan.");
            return;
        }

        const payload = {
            code_rusak: codeRusak,
            asset_id: Number(assetID),
            qty_rusak: qtyRusak,
            status: status,
            status_rusak: statusRusak,
            description: description
        };

        const isEdit = Boolean(id);
        const url = isEdit
            ? `${API}/${encodeURIComponent(id)}`
            : API;
        const method = isEdit ? "PUT" : "POST";

        $btnSave.prop("disabled", true)
            .html('<span class="spinner-border spinner-border-sm"></span> Menyimpan...');

        try {
            await apiRequest(url, method, payload);

            formModal.hide();

            await Swal.fire({
                icon: "success",
                title: "Berhasil",
                text: isEdit
                    ? "Data aset rusak berhasil diperbarui."
                    : "Data aset rusak berhasil ditambahkan.",
                timer: 1800,
                showConfirmButton: false
            });

            await loadAssetBroken();
        } catch (xhr) {
            console.error("Gagal menyimpan data:", xhr);
            
            showFormAlert(
                errorMessage(xhr, "Gagal menyimpan data aset rusak.")
            );
        } finally {
            $btnSave.prop("disabled", false)
                .html(isEdit
                    ? '<i class="bi bi-save"></i> Simpan Perubahan'
                    : '<i class="bi bi-save"></i> Simpan'
                );
        }
    }

    // =========================================================
    // 11. DETAIL DATA
    // =========================================================
    async function openDetailModal(id) {
        $("#assetBrokenDetailBody").html(`
            <div class="text-center py-3">
                <span class="spinner-border"></span>
                <div class="mt-2">Memuat detail...</div>
            </div>
        `);

        detailModal.show();
        
        try {
            const response = await apiRequest(`${API}/${encodeURIComponent(id)}`);
            const item = response?.data ?? response?.Data ?? response;
            const asset = getAssetDetail(item);

            const detailRows = [
                ["Kode Kerusakan", item.code_rusak ?? item.CodeRusak],
                ["Lokasi", getBrokenLocationName(item)],
                ["Kode Aset", getAssetCode(asset)],
                ["Nama Aset", getAssetName(asset)],
                ["Jumlah Rusak", item.qty_rusak ?? item.QtyRusak],
                ["Tingkat Kerusakan", getStatusLabel(item.status ?? item.Status)],
                [
                    "Tidak Dapat Diperbaiki",
                    (item.status_rusak ?? item.StatusRusak) ? "Ya" : "Tidak"
                ],
                ["Deskripsi", item.description ?? item.Description ?? "-"],
                ["Dibuat", item.create_at ?? item.CreatedAt ?? "-"],
                ["Diperbarui", item.update_at ?? item.UpdatedAt ?? "-"]
            ];

            $("#assetBrokenDetailBody").html(`
                <table class="table table-bordered">
                    <tbody>
                        ${detailRows.map(function (row) {
                            return `
                                <tr>
                                    <th style="width: 35%">
                                        ${escapeHTML(row[0])}
                                    </th>
                                    <td>${escapeHTML(row[1] ?? "-")}</td>
                                </tr>
                            `;
                        }).join("")}
                    </tbody>
                </table>
            `);
        } catch (xhr) {
            console.error("Gagal memuat detail:", xhr);

            $("#assetBrokenDetailBody").html(`
                <div class="alert alert-danger">
                    ${escapeHTML(errorMessage(
                        xhr,
                        "Gagal mengambil detail data."
                    ))}
                </div>
            `);
        }
    }

    // =========================================================
    // 12. HAPUS DATA
    // =========================================================
    async function deleteAssetBroken(id, code) {
        const result = await Swal.fire({
            icon: "warning",
            title: "Hapus data aset rusak?",
            text: `Data ${code} akan dihapus. Stok aset akan dikembalikan oleh backend.`,
            showCancelButton: true,
            confirmButtonText: "Ya, hapus",
            cancelButtonText: "Batal",
            confirmButtonColor: "#dc3545"
        });

        if (!result.isConfirmed) return;

        try {
            await apiRequest(`${API}/${encodeURIComponent(id)}`, "DELETE");

            await Swal.fire({
                icon: "success",
                title: "Berhasil",
                text: "Data aset rusak berhasil dihapus.",
                timer: 1800,
                showConfirmButton: false
            });

            await loadAssetBroken();
        } catch (xhr) {
            console.error("Gagal menghapus data:", xhr);

            Swal.fire({
                icon: "error",
                title: "Gagal",
                text: errorMessage(xhr, "Gagal menghapus data aset rusak.")
            });
        }
    }

    // =========================================================
    // 13. EVENT LISTENER
    // =========================================================
    $("#btnAddAssetBroken").on("click", openAddModal);

    $("#btnRefresh").on("click", loadAssetBroken);

    $search.on("input", renderAssetBroken);
    $statusFilter.on("change", renderAssetBroken);

    $locationID.on("change", async function () {
        const locationID = $(this).val();

        try {
            await loadAssetsByLocation(locationID);
        } catch (error) {
            console.error(error);
        }
    });

    $assetID.on("change", updateSelectedAssetInfo);

    $form.on("submit", saveAssetBroken);

    $tableBody.on("click", ".btn-detail", function () {
        openDetailModal($(this).data("id"));
    });

    $tableBody.on("click", ".btn-edit", function () {
        openEditModal($(this).data("id"));
    });

    $tableBody.on("click", ".btn-delete", function () {
        deleteAssetBroken(
            $(this).data("id"),
            $(this).data("code")
        );
    });

    // Bersihkan form ketika modal ditutup.
    $("#assetBrokenModal").on("hidden.bs.modal", function () {
        resetForm();
        $btnSave.prop("disabled", false)
            .html('<i class="bi bi-save"></i> Simpan');
    });

    // =========================================================
    // 14. INISIALISASI
    // =========================================================
    loadAssetBroken();
});
