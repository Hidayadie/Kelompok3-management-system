
$(document).ready(function () {
    const API_URL = "http://localhost:8080/api/private/assets";

    const $tableBody = $("#assetTableBody");
    const $alert = $("#assetAlert");
    const $filter = $("#assetFilter");
    const $refresh = $("#refreshAssets");
    const $count = $("#assetCount");

    let assets = [];

    // Inisialisasi Select2.
    if ($filter.length && $.fn.select2) {
        $filter.select2({
            theme: "bootstrap-5",
            width: "100%",
            placeholder: "Cari nama aset...",
            allowClear: true
        });
    }

    function showAlert(message, type = "danger") {
        $alert
            .removeClass("d-none alert-success alert-danger alert-warning")
            .addClass("alert-" + type)
            .text(message);
    }

    function hideAlert() {
        $alert
            .addClass("d-none")
            .removeClass("alert-success alert-danger alert-warning")
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

    function renderTable() {
        const selectedId = $filter.length ? $filter.val() : "";

        const filtered = selectedId
            ? assets.filter(
                item => String(item.asset_id) === String(selectedId)
            )
            : assets;

        $tableBody.empty();

        if (filtered.length === 0) {
            $tableBody.html(`
                <tr>
                    <td colspan="9" class="text-center text-muted py-4">
                        Tidak ada data aset.
                    </td>
                </tr>
            `);

            $count.text("Total aset: 0");
            return;
        }

        filtered.forEach(function (item, index) {
            const $row = $("<tr>");

            $("<td>").text(index + 1).appendTo($row);
            $("<td>").text(item.code_asset ?? "-").appendTo($row);
            $("<td>").text(item.nama_asset ?? "-").appendTo($row);
            $("<td>").text(item.category_detail?.name ?? "-").appendTo($row);
            $("<td>").text(item.location_detail?.location_name ?? "-").appendTo($row);
            $("<td>").text(item.condition ?? "-").appendTo($row);

            const $status = $("<span>", {
                class: "badge " + (
                    item.status ? "bg-success" : "bg-secondary"
                ),
                text: item.status ? "Aktif" : "Tidak Aktif"
            });

            $("<td>").append($status).appendTo($row);
            $("<td>").text(Number(item.qty_in ?? 0)).appendTo($row);
            $("<td>").text(formatDate(item.update_at)).appendTo($row);

            $tableBody.append($row);
        });

        $count.text(
            `Menampilkan ${filtered.length} dari ${assets.length} aset`
        );
    }

    function loadAssets() {
        $refresh.prop("disabled", true);

        $tableBody.html(`
            <tr>
                <td colspan="9" class="text-center py-4">
                    <span class="spinner-border spinner-border-sm me-2"></span>
                    Memuat data aset...
                </td>
            </tr>
        `);

        hideAlert();

        $.ajax({
            url: API_URL,
            method: "GET",
            dataType: "json",
            xhrFields: {
                withCredentials: true
            },
            headers: {
                Accept: "application/json"
            },
            cache: false,

            success: function (response) {
                if (!response || !Array.isArray(response.data)) {
                    showAlert("Format respons API tidak sesuai.");

                    $tableBody.html(`
                        <tr>
                            <td colspan="9" class="text-center py-4">
                                Format data tidak valid.
                            </td>
                        </tr>
                    `);
                    return;
                }

                assets = response.data;

                $filter.empty().append(
                    new Option("Semua Aset", "", true, true)
                );

                assets.forEach(function (item) {
                    $filter.append(
                        new Option(
                            item.nama_asset ?? "Tanpa nama",
                            String(item.asset_id)
                        )
                    );
                });

                $filter.val("").trigger("change.select2");

                renderTable();

                if (assets.length === 0) {
                    showAlert("Belum ada aset yang terdaftar.", "warning");
                }
            },

            error: function (xhr, status, error) {
                console.error(
                    "AJAX aset gagal:",
                    xhr.status,
                    status,
                    error,
                    xhr.responseText
                );

                let message = "Gagal memuat data aset.";

                if (xhr.status === 401 || xhr.status === 403) {
                    message = "Akses ditolak. Silakan login kembali.";
                } else if (xhr.status === 404) {
                    message = "Endpoint aset tidak ditemukan.";
                } else if (xhr.status === 0) {
                    message = "Request gagal. Periksa server, autentikasi, dan CORS.";
                }

                showAlert(message);

                $tableBody.html(`
                    <tr>
                        <td colspan="9" class="text-center text-danger py-4">
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

    $filter.on("change", renderTable);
    $refresh.on("click", loadAssets);

    loadAssets();
});
// ============================ Proses tambah asset==================


    // Endpoint API
    const CATEGORY_URL = "http://localhost:8081/api/private/categories";
    const LOCATION_URL = "http://localhost:8080/api/private/location";

    const $addAssetModal = $("#addAssetModal");
    const $addAssetForm = $("#addAssetForm");
    const $addAssetAlert = $("#addAssetAlert");
    const $saveAssetButton = $("#saveAssetButton");

    // Membuka modal dan memuat pilihan kategori serta lokasi.
    $("#addAssetButton").on("click", function () {
        hideAddAssetAlert();

        const modalElement = document.getElementById("addAssetModal");
        bootstrap.Modal.getOrCreateInstance(modalElement).show();

        loadCategoryOptions();
        loadLocationOptions();
    });

    function showAddAssetAlert(message, type = "danger") {
        $addAssetAlert
            .removeClass("d-none alert-success alert-danger alert-warning")
            .addClass("alert-" + type)
            .text(message);
    }

    function hideAddAssetAlert() {
        $addAssetAlert
            .addClass("d-none")
            .removeClass("alert-success alert-danger alert-warning")
            .text("");
    }

    // Memuat pilihan kategori dari API.

function loadCategoryOptions() {
    console.log("[KATEGORI] Fungsi dipanggil");

    const $select = $("#assetCategory");

    $select.empty().append(
        new Option("Memuat kategori...", "")
    );

    $.ajax({
        url: "http://localhost:8080/api/private/categories",
        method: "GET",
        dataType: "json",
        xhrFields: {
            withCredentials: true
        },
        headers: {
            Accept: "application/json"
        },

        success: function (response) {
            console.log("[KATEGORI] Respons:", response);

            if (!response || !Array.isArray(response.data)) {
                console.error("[KATEGORI] Format respons tidak valid");
                $select.empty().append(
                    new Option("Format kategori tidak valid", "")
                );
                return;
            }

            $select.empty().append(
                new Option("Pilih kategori", "")
            );

            response.data.forEach(function (item) {
                $select.append(
                    new Option(item.name ?? "Tanpa nama", item.id)
                );
            });

            console.log(
                "[KATEGORI] Jumlah data:",
                response.data.length
            );
        },

        error: function (xhr, status, error) {
            console.error("[KATEGORI] AJAX gagal:", {
                httpStatus: xhr.status,
                status: status,
                error: error,
                response: xhr.responseText
            });

            $select.empty().append(
                new Option("Gagal memuat kategori", "")
            );
        }
    });
}


function loadLocationOptions() {
    console.log("[LOKASI] Fungsi dipanggil");

    const $select = $("#assetLocation");

    $select.empty().append(
        new Option("Memuat lokasi...", "")
    );

    $.ajax({
        url: "http://localhost:8080/api/private/location",
        method: "GET",
        dataType: "json",
        xhrFields: {
            withCredentials: true
        },
        headers: {
            Accept: "application/json"
        },

        success: function (response) {
            console.log("[LOKASI] Respons:", response);

            if (!response || !Array.isArray(response.data)) {
                console.error("[LOKASI] Format respons tidak valid");
                $select.empty().append(
                    new Option("Format lokasi tidak valid", "")
                );
                return;
            }

            $select.empty().append(
                new Option("Pilih lokasi", "")
            );

            response.data.forEach(function (item) {
                $select.append(
                    new Option(
                        item.location_name ?? "Tanpa nama",
                        item.location_id
                    )
                );
            });

            console.log(
                "[LOKASI] Jumlah data:",
                response.data.length
            );
        },

        error: function (xhr, status, error) {
            console.error("[LOKASI] AJAX gagal:", {
                httpStatus: xhr.status,
                status: status,
                error: error,
                response: xhr.responseText
            });

            $select.empty().append(
                new Option("Gagal memuat lokasi", "")
            );
        }
    });
}
    

    // Simpan aset menggunakan AJAX POST.
    $addAssetForm.on("submit", function (event) {
        event.preventDefault();
        hideAddAssetAlert();

        const payload = {
            code_asset: $("#assetCode").val().trim(),
            nama_asset: $("#assetName").val().trim(),
            category: Number($("#assetCategory").val()),
            location: $("#assetLocation").val(),
            condition: $("#assetCondition").val(),
            status: $("#assetStatus").val() === "true",
            description: $("#assetDescription").val().trim(),
            qty_in: Number($("#assetQty").val())
        };

        if (
            !payload.code_asset ||
            !payload.nama_asset ||
            !payload.category ||
            !payload.location ||
            !payload.condition ||
            !Number.isInteger(payload.qty_in) ||
            payload.qty_in < 1
        ) {
            showAddAssetAlert(
                "Periksa kembali semua kolom wajib dan jumlah aset.",
                "warning"
            );
            return;
        }

        $saveAssetButton.prop("disabled", true).html(`
            <span class="spinner-border spinner-border-sm me-2"></span>
            Menyimpan...
        `);

        $.ajax({
            url: API_URL,
            method: "POST",
            contentType: "application/json",
            dataType: "json",
            data: JSON.stringify(payload),
            xhrFields: {
                withCredentials: true
            },
            headers: {
                "Accept": "application/json"
            },

            success: function (response) {
                const modalElement = document.getElementById("addAssetModal");
                bootstrap.Modal.getOrCreateInstance(modalElement).hide();

                $addAssetForm[0].reset();

                // Muat ulang tabel setelah data berhasil disimpan.
                loadAssets();

                // Tampilkan notifikasi jika SweetAlert2 tersedia.
                if (typeof Swal !== "undefined") {
                    Swal.fire({
                        icon: "success",
                        title: "Berhasil",
                        text: response.message || "Aset berhasil ditambahkan.",
                        timer: 1800,
                        showConfirmButton: false
                    });
                } else {
                    alert("Aset berhasil ditambahkan.");
                }
            },

            error: function (xhr, status, error) {
                console.error(
                    "Gagal menambahkan aset:",
                    xhr.status,
                    status,
                    error,
                    xhr.responseText
                );

                let message = "Aset gagal ditambahkan.";

                if (xhr.status === 400) {
                    message = xhr.responseJSON?.error ||
                        "Data aset tidak valid.";
                } else if (xhr.status === 401 || xhr.status === 403) {
                    message = "Akses ditolak. Silakan login kembali.";
                } else if (xhr.status === 409) {
                    message = "Kode aset sudah digunakan.";
                } else if (xhr.status === 404) {
                    message = "Endpoint tambah aset tidak ditemukan.";
                } else if (xhr.status === 0) {
                    message = "Tidak dapat menghubungi API. Periksa server dan CORS.";
                }

                showAddAssetAlert(message, "danger");
            },

            complete: function () {
                $saveAssetButton
                    .prop("disabled", false)
                    .html('<i class="bi bi-save me-1"></i> Simpan Aset');
            }
        });
    });
//============================================================================